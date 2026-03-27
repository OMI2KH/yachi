import { Platform } from 'react-native';
import { 
  PAYMENT_CONFIG, 
  PAYMENT_METHODS, 
  PAYMENT_STATUS,
  CURRENCIES,
  PAYMENT_GATEWAYS 
} from '../config/payment';
import { 
  SECURITY_LEVELS,
  ENCRYPTION_LEVELS 
} from '../config/security';
import { 
  validatePaymentAmount,
  validatePaymentMethod,
  encryptPaymentData,
  decryptPaymentData,
  generateTransactionId 
} from '../utils/security';
import { 
  formatCurrency,
  formatEthiopianDate,
  generateReceiptNumber 
} from '../utils/formatters';
import { 
  calculateTax,
  calculateServiceFee,
  calculateTotalAmount 
} from '../utils/payment-calculations';
import api from './api';
import analyticsService from './analytics-service';
import notificationService from './notification-service';
import errorService from './error-service';

class PaymentService {
  constructor() {
    this.isInitialized = false;
    this.pendingTransactions = new Map();
    this.transactionCache = new Map();
    this.paymentHandlers = new Map();
    this.receiptQueue = [];
    this.isProcessingReceipts = false;
  }

  // ==================== INITIALIZATION & CONFIGURATION ====================

  /**
   * Initialize payment service with gateways
   */
  async initialize(config = {}) {
    try {
      if (this.isInitialized) {
        console.warn('Payment service already initialized');
        return true;
      }

      // Initialize payment gateways
      await this.initializePaymentGateways(config.gateways);

      // Set up payment handlers
      this.setupPaymentHandlers();

      // Load cached transactions
      await this.loadCachedTransactions();

      this.isInitialized = true;

      await this.trackEvent('service_initialized', {
        service: 'payment_service',
        gateways: Object.keys(this.paymentHandlers)
      });

      console.log('Payment service initialized successfully');
      return true;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'payment_service_initialization',
        config
      });
      throw new Error('PAYMENT_SERVICE_INIT_FAILED');
    }
  }

  /**
   * Initialize payment gateways
   */
  async initializePaymentGateways(gateways = PAYMENT_GATEWAYS) {
    try {
      for (const [gateway, config] of Object.entries(gateways)) {
        if (config.enabled) {
          const handler = await this.createGatewayHandler(gateway, config);
          this.paymentHandlers.set(gateway, handler);
          
          console.log(`Payment gateway ${gateway} initialized`);
        }
      }
    } catch (error) {
      await errorService.captureError(error, {
        context: 'gateway_initialization',
        gateways: Object.keys(gateways)
      });
      throw error;
    }
  }

  /**
   * Create gateway-specific handler
   */
  async createGatewayHandler(gateway, config) {
    switch (gateway) {
      case 'chapa':
        return await this.initializeChapaGateway(config);
      case 'telebirr':
        return await this.initializeTeleBirrGateway(config);
      case 'cbe-birr':
        return await this.initializeCbeBirrGateway(config);
      default:
        throw new Error(`UNSUPPORTED_GATEWAY: ${gateway}`);
    }
  }

  // ==================== PAYMENT PROCESSING ====================

  /**
   * Process payment with comprehensive validation and security
   */
  async processPayment(paymentData, options = {}) {
    try {
      const {
        gateway = PAYMENT_GATEWAYS.DEFAULT,
        savePaymentMethod = false,
        enable3DS = true,
        metadata = {}
      } = options;

      // Validate payment data
      const validation = await this.validatePayment(paymentData, gateway);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Generate transaction ID
      const transactionId = generateTransactionId();
      
      // Create transaction record
      const transaction = await this.createTransaction({
        id: transactionId,
        ...paymentData,
        gateway,
        status: PAYMENT_STATUS.PENDING,
        metadata: {
          ...metadata,
          deviceInfo: this.getDeviceInfo(),
          ipAddress: await this.getClientIP(),
          userAgent: navigator?.userAgent
        }
      });

      // Encrypt sensitive payment data
      const encryptedData = await this.encryptPaymentData(paymentData);

      // Process payment through gateway
      const paymentResult = await this.processWithGateway(gateway, {
        ...encryptedData,
        transactionId,
        callbackUrl: this.getCallbackUrl(transactionId),
        metadata: transaction.metadata
      }, {
        enable3DS,
        savePaymentMethod
      });

      // Update transaction with gateway response
      await this.updateTransaction(transactionId, {
        gatewayReference: paymentResult.gatewayReference,
        gatewayResponse: paymentResult.rawResponse,
        status: paymentResult.status,
        processedAt: new Date().toISOString()
      });

      // Handle 3DS authentication if required
      if (paymentResult.requires3DS && enable3DS) {
        return await this.handle3DSAuthentication(transactionId, paymentResult);
      }

      // Complete payment if no 3DS required
      if (paymentResult.status === PAYMENT_STATUS.SUCCESS) {
        await this.completePayment(transactionId, paymentResult);
      }

      await this.trackEvent('payment_processed', {
        transactionId,
        gateway,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: paymentResult.status
      });

      return {
        success: true,
        transactionId,
        status: paymentResult.status,
        gatewayReference: paymentResult.gatewayReference,
        requiresAction: paymentResult.requires3DS,
        actionUrl: paymentResult.actionUrl
      };

    } catch (error) {
      await this.handlePaymentError(error, paymentData, options);
      throw this.formatPaymentError(error);
    }
  }

  /**
   * Process payment through specific gateway
   */
  async processWithGateway(gateway, paymentData, options = {}) {
    const handler = this.paymentHandlers.get(gateway);
    
    if (!handler) {
      throw new Error(`GATEWAY_NOT_AVAILABLE: ${gateway}`);
    }

    try {
      // Add gateway-specific headers and data
      const gatewayData = this.prepareGatewayData(gateway, paymentData, options);

      // Process payment
      const result = await handler.processPayment(gatewayData, options);

      // Validate gateway response
      const validation = this.validateGatewayResponse(gateway, result);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      return result;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'gateway_payment_processing',
        gateway,
        transactionId: paymentData.transactionId
      });
      throw error;
    }
  }

  /**
   * Handle 3DS authentication flow
   */
  async handle3DSAuthentication(transactionId, paymentResult) {
    try {
      // Store transaction for callback handling
      this.pendingTransactions.set(transactionId, {
        ...paymentResult,
        authenticationStartedAt: new Date().toISOString()
      });

      // Redirect to 3DS authentication page
      if (Platform.OS === 'web') {
        window.location.href = paymentResult.actionUrl;
      } else {
        // For mobile, open in-app browser
        await this.open3DSAuthentication(paymentResult.actionUrl);
      }

      return {
        success: true,
        transactionId,
        status: PAYMENT_STATUS.PENDING_3DS,
        actionRequired: true,
        actionUrl: paymentResult.actionUrl,
        message: '3DS authentication required'
      };

    } catch (error) {
      await this.updateTransaction(transactionId, {
        status: PAYMENT_STATUS.FAILED,
        error: error.message,
        failedAt: new Date().toISOString()
      });

      throw new Error('3DS_AUTHENTICATION_FAILED');
    }
  }

  /**
   * Complete payment after successful processing
   */
  async completePayment(transactionId, paymentResult) {
    try {
      // Update transaction status
      await this.updateTransaction(transactionId, {
        status: PAYMENT_STATUS.SUCCESS,
        completedAt: new Date().toISOString(),
        gatewayResponse: paymentResult.rawResponse
      });

      // Generate receipt
      const receipt = await this.generateReceipt(transactionId);

      // Send notifications
      await this.sendPaymentNotifications(transactionId, receipt);

      // Update analytics
      await this.trackSuccessfulPayment(transactionId, paymentResult);

      // Clear from pending transactions
      this.pendingTransactions.delete(transactionId);

      // Cache successful transaction
      this.cacheTransaction(transactionId, {
        ...paymentResult,
        receipt
      });

      return receipt;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'payment_completion',
        transactionId
      });
      throw error;
    }
  }

  // ==================== TRANSACTION MANAGEMENT ====================

  /**
   * Create new transaction record
   */
  async createTransaction(transactionData) {
    try {
      const transaction = {
        id: transactionData.id,
        amount: transactionData.amount,
        currency: transactionData.currency || CURRENCIES.ETB,
        paymentMethod: transactionData.paymentMethod,
        gateway: transactionData.gateway,
        status: transactionData.status,
        customer: {
          id: transactionData.customerId,
          email: transactionData.customerEmail,
          phone: transactionData.customerPhone
        },
        metadata: transactionData.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to backend
      const response = await api.post('/payments/transactions', transaction);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create transaction');
      }

      // Cache transaction
      this.cacheTransaction(transactionData.id, transaction);

      return transaction;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'transaction_creation',
        transactionId: transactionData.id
      });
      throw error;
    }
  }

  /**
   * Update transaction record
   */
  async updateTransaction(transactionId, updates) {
    try {
      const response = await api.put(
        `/payments/transactions/${transactionId}`,
        updates
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update transaction');
      }

      const updatedTransaction = response.data.transaction;

      // Update cache
      this.cacheTransaction(transactionId, updatedTransaction);

      return updatedTransaction;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'transaction_update',
        transactionId
      });
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId, options = {}) {
    try {
      const { forceRefresh = false } = options;

      // Check cache first
      if (!forceRefresh) {
        const cached = this.transactionCache.get(transactionId);
        if (cached) {
          return cached;
        }
      }

      const response = await api.get(`/payments/transactions/${transactionId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transaction');
      }

      const transaction = response.data.transaction;

      // Cache transaction
      this.cacheTransaction(transactionId, transaction);

      return transaction;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'transaction_retrieval',
        transactionId
      });
      throw error;
    }
  }

  /**
   * Get transactions for user with filtering and pagination
   */
  async getUserTransactions(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        gateway = null,
        dateFrom = null,
        dateTo = null
      } = options;

      const params = {
        page,
        limit,
        ...(status && { status }),
        ...(gateway && { gateway }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      };

      const response = await api.get(`/payments/users/${userId}/transactions`, params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user transactions');
      }

      return {
        transactions: response.data.transactions,
        pagination: response.data.pagination,
        summary: response.data.summary
      };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'user_transactions_retrieval',
        userId
      });
      throw error;
    }
  }

  // ==================== PAYMENT GATEWAY IMPLEMENTATIONS ====================

  /**
   * Initialize Chapa payment gateway
   */
  async initializeChapaGateway(config) {
    return {
      name: 'chapa',
      config,
      
      async processPayment(paymentData, options) {
        try {
          const chapaData = {
            amount: paymentData.amount,
            currency: paymentData.currency,
            email: paymentData.customerEmail,
            first_name: paymentData.customerFirstName,
            last_name: paymentData.customerLastName,
            phone_number: paymentData.customerPhone,
            tx_ref: paymentData.transactionId,
            callback_url: paymentData.callbackUrl,
            return_url: paymentData.returnUrl,
            customization: {
              title: 'Yachi Payment',
              description: 'Service Payment'
            }
          };

          const response = await api.post('/payments/chapa/initialize', chapaData, {
            headers: {
              'Authorization': `Bearer ${config.secretKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.success) {
            throw new Error(response.error || 'Chapa payment failed');
          }

          return {
            status: PAYMENT_STATUS.PENDING,
            gatewayReference: response.data.reference,
            actionUrl: response.data.checkout_url,
            requires3DS: true,
            rawResponse: response.data
          };

        } catch (error) {
          await errorService.captureError(error, {
            context: 'chapa_payment_processing',
            transactionId: paymentData.transactionId
          });
          throw error;
        }
      },

      async verifyPayment(transactionId) {
        try {
          const response = await api.get(`/payments/chapa/verify/${transactionId}`, {
            headers: {
              'Authorization': `Bearer ${config.secretKey}`
            }
          });

          if (!response.success) {
            throw new Error(response.error || 'Chapa verification failed');
          }

          return {
            status: response.data.status === 'success' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED,
            gatewayReference: response.data.reference,
            rawResponse: response.data
          };

        } catch (error) {
          await errorService.captureError(error, {
            context: 'chapa_payment_verification',
            transactionId
          });
          throw error;
        }
      }
    };
  }

  /**
   * Initialize TeleBirr payment gateway
   */
  async initializeTeleBirrGateway(config) {
    return {
      name: 'telebirr',
      config,
      
      async processPayment(paymentData, options) {
        try {
          const telebirrData = {
            amount: paymentData.amount,
            subject: paymentData.description || 'Yachi Service Payment',
            outTradeNo: paymentData.transactionId,
            timeoutExpress: '30m',
            notifyUrl: paymentData.callbackUrl,
            returnUrl: paymentData.returnUrl
          };

          const response = await api.post('/payments/telebirr/create', telebirrData, {
            headers: {
              'App-Key': config.appKey,
              'Content-Type': 'application/json'
            }
          });

          if (!response.success) {
            throw new Error(response.error || 'TeleBirr payment failed');
          }

          return {
            status: PAYMENT_STATUS.PENDING,
            gatewayReference: response.data.tradeNo,
            actionUrl: response.data.payUrl,
            requires3DS: false,
            rawResponse: response.data
          };

        } catch (error) {
          await errorService.captureError(error, {
            context: 'telebirr_payment_processing',
            transactionId: paymentData.transactionId
          });
          throw error;
        }
      },

      async verifyPayment(transactionId) {
        try {
          const response = await api.get(`/payments/telebirr/verify/${transactionId}`, {
            headers: {
              'App-Key': config.appKey
            }
          });

          if (!response.success) {
            throw new Error(response.error || 'TeleBirr verification failed');
          }

          return {
            status: response.data.tradeStatus === 'SUCCESS' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED,
            gatewayReference: response.data.tradeNo,
            rawResponse: response.data
          };

        } catch (error) {
          await errorService.captureError(error, {
            context: 'telebirr_payment_verification',
            transactionId
          });
          throw error;
        }
      }
    };
  }

  /**
   * Initialize CBE Birr payment gateway
   */
  async initializeCbeBirrGateway(config) {
    return {
      name: 'cbe-birr',
      config,
      
      async processPayment(paymentData, options) {
        try {
          const cbeBirrData = {
            amount: paymentData.amount,
            customerPhone: paymentData.customerPhone,
            transactionId: paymentData.transactionId,
            description: paymentData.description || 'Yachi Service Payment',
            callbackUrl: paymentData.callbackUrl
          };

          const response = await api.post('/payments/cbe-birr/initiate', cbeBirrData, {
            headers: {
              'API-Key': config.apiKey,
              'Content-Type': 'application/json'
            }
          });

          if (!response.success) {
            throw new Error(response.error || 'CBE Birr payment failed');
          }

          return {
            status: PAYMENT_STATUS.PENDING,
            gatewayReference: response.data.referenceNumber,
            requiresAction: true,
            actionMessage: response.data.message,
            rawResponse: response.data
          };

        } catch (error) {
          await errorService.captureError(error, {
            context: 'cbe_birr_payment_processing',
            transactionId: paymentData.transactionId
          });
          throw error;
        }
      },

      async verifyPayment(transactionId) {
        try {
          const response = await api.get(`/payments/cbe-birr/verify/${transactionId}`, {
            headers: {
              'API-Key': config.apiKey
            }
          });

          if (!response.success) {
            throw new Error(response.error || 'CBE Birr verification failed');
          }

          return {
            status: response.data.status === 'COMPLETED' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED,
            gatewayReference: response.data.referenceNumber,
            rawResponse: response.data
          };

        } catch (error) {
          await errorService.captureError(error, {
            context: 'cbe_birr_payment_verification',
            transactionId
          });
          throw error;
        }
      }
    };
  }

  // ==================== PAYMENT VERIFICATION & WEBHOOKS ====================

  /**
   * Verify payment status with gateway
   */
  async verifyPayment(transactionId, gateway = null) {
    try {
      const transaction = await this.getTransaction(transactionId);
      
      if (!gateway) {
        gateway = transaction.gateway;
      }

      const handler = this.paymentHandlers.get(gateway);
      if (!handler) {
        throw new Error(`GATEWAY_NOT_AVAILABLE: ${gateway}`);
      }

      const verificationResult = await handler.verifyPayment(transactionId);

      // Update transaction based on verification
      await this.updateTransaction(transactionId, {
        status: verificationResult.status,
        verifiedAt: new Date().toISOString(),
        gatewayResponse: verificationResult.rawResponse
      });

      // Complete payment if successful
      if (verificationResult.status === PAYMENT_STATUS.SUCCESS) {
        await this.completePayment(transactionId, verificationResult);
      }

      return verificationResult;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'payment_verification',
        transactionId,
        gateway
      });
      throw error;
    }
  }

  /**
   * Handle payment webhook from gateways
   */
  async handleWebhook(gateway, webhookData, signature) {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(gateway, webhookData, signature);
      if (!isValid) {
        throw new Error('INVALID_WEBHOOK_SIGNATURE');
      }

      const transactionId = this.extractTransactionId(gateway, webhookData);
      
      if (!transactionId) {
        throw new Error('TRANSACTION_ID_NOT_FOUND_IN_WEBHOOK');
      }

      // Update transaction based on webhook data
      const status = this.mapWebhookStatus(gateway, webhookData);
      
      await this.updateTransaction(transactionId, {
        status,
        webhookReceivedAt: new Date().toISOString(),
        webhookData: this.sanitizeWebhookData(webhookData)
      });

      // Verify payment to ensure consistency
      await this.verifyPayment(transactionId, gateway);

      await this.trackEvent('webhook_processed', {
        gateway,
        transactionId,
        status
      });

      return { success: true };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'webhook_processing',
        gateway,
        webhookData
      });
      
      return { success: false, error: error.message };
    }
  }

  // ==================== REFUNDS & DISPUTES ====================

  /**
   * Process refund for transaction
   */
  async processRefund(transactionId, refundData, options = {}) {
    try {
      const transaction = await this.getTransaction(transactionId);

      // Validate refund eligibility
      const validation = await this.validateRefund(transaction, refundData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const refundId = generateTransactionId('refund');

      // Process refund through gateway
      const handler = this.paymentHandlers.get(transaction.gateway);
      const refundResult = await handler.processRefund({
        originalTransactionId: transactionId,
        amount: refundData.amount,
        reason: refundData.reason,
        refundId
      });

      // Create refund record
      const refund = await this.createRefundRecord({
        id: refundId,
        originalTransactionId: transactionId,
        amount: refundData.amount,
        reason: refundData.reason,
        gateway: transaction.gateway,
        status: refundResult.status,
        gatewayReference: refundResult.gatewayReference
      });

      // Update original transaction
      await this.updateTransaction(transactionId, {
        refundStatus: refundResult.status,
        refundedAmount: (transaction.refundedAmount || 0) + refundData.amount,
        lastRefundAt: new Date().toISOString()
      });

      await this.trackEvent('refund_processed', {
        refundId,
        transactionId,
        amount: refundData.amount,
        status: refundResult.status
      });

      return refund;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'refund_processing',
        transactionId,
        refundData
      });
      throw error;
    }
  }

  // ==================== SECURITY & VALIDATION ====================

  /**
   * Validate payment data before processing
   */
  async validatePayment(paymentData, gateway) {
    const errors = [];

    // Validate amount
    const amountValidation = validatePaymentAmount(paymentData.amount, paymentData.currency);
    if (!amountValidation.isValid) {
      errors.push(...amountValidation.errors);
    }

    // Validate payment method
    const methodValidation = validatePaymentMethod(paymentData.paymentMethod, gateway);
    if (!methodValidation.isValid) {
      errors.push(...methodValidation.errors);
    }

    // Validate customer data
    if (!paymentData.customerId) {
      errors.push('Customer ID is required');
    }

    if (!paymentData.customerEmail && !paymentData.customerPhone) {
      errors.push('Customer email or phone is required');
    }

    // Check gateway availability
    if (!this.paymentHandlers.has(gateway)) {
      errors.push(`Payment gateway ${gateway} is not available`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Encrypt sensitive payment data
   */
  async encryptPaymentData(paymentData) {
    const sensitiveFields = ['cardNumber', 'cvv', 'expiryMonth', 'expiryYear'];
    const encrypted = { ...paymentData };

    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = await encryptPaymentData(encrypted[field], ENCRYPTION_LEVELS.HIGH);
      }
    }

    return encrypted;
  }

  // ==================== RECEIPT & NOTIFICATION MANAGEMENT ====================

  /**
   * Generate payment receipt
   */
  async generateReceipt(transactionId) {
    try {
      const transaction = await this.getTransaction(transactionId);

      const receipt = {
        receiptNumber: generateReceiptNumber(),
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        gateway: transaction.gateway,
        customer: transaction.customer,
        issuedAt: new Date().toISOString(),
        items: transaction.metadata.items || [],
        taxes: transaction.metadata.taxes || [],
        fees: transaction.metadata.fees || []
      };

      // Queue receipt for delivery
      this.receiptQueue.push(receipt);
      this.processReceiptQueue();

      return receipt;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'receipt_generation',
        transactionId
      });
      throw error;
    }
  }

  /**
   * Send payment notifications
   */
  async sendPaymentNotifications(transactionId, receipt) {
    try {
      const transaction = await this.getTransaction(transactionId);

      // Send email receipt
      await notificationService.sendEmail({
        to: transaction.customer.email,
        subject: 'Payment Receipt - Yachi',
        template: 'payment_receipt',
        data: {
          receipt,
          transaction,
          formattedDate: formatEthiopianDate(transaction.completedAt)
        }
      });

      // Send SMS notification
      if (transaction.customer.phone) {
        await notificationService.sendSMS({
          to: transaction.customer.phone,
          message: `Payment of ${formatCurrency(transaction.amount)} received. Receipt: ${receipt.receiptNumber}`
        });
      }

      // Send push notification
      await notificationService.sendPush({
        userId: transaction.customer.id,
        title: 'Payment Successful',
        body: `Your payment of ${formatCurrency(transaction.amount)} was processed successfully`,
        data: {
          type: 'payment_success',
          transactionId,
          receiptNumber: receipt.receiptNumber
        }
      });

    } catch (error) {
      console.warn('Failed to send payment notifications:', error);
    }
  }

  // ==================== ANALYTICS & REPORTING ====================

  /**
   * Track payment events
   */
  async trackEvent(eventName, properties = {}) {
    try {
      await analyticsService.trackEvent(`payment_${eventName}`, {
        ...properties,
        service: 'payment_service',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to track payment event:', error);
    }
  }

  /**
   * Track successful payment
   */
  async trackSuccessfulPayment(transactionId, paymentResult) {
    try {
      const transaction = await this.getTransaction(transactionId);

      await analyticsService.trackEvent('payment_success', {
        transactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        gateway: transaction.gateway,
        paymentMethod: transaction.paymentMethod,
        processingTime: this.calculateProcessingTime(transaction),
        customerId: transaction.customer.id
      });

    } catch (error) {
      console.warn('Failed to track successful payment:', error);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Format payment error for user display
   */
  formatPaymentError(error) {
    const errorMap = {
      'INSUFFICIENT_FUNDS': 'Insufficient funds in your account',
      'CARD_DECLINED': 'Your card was declined',
      'INVALID_CARD': 'Invalid card details',
      'EXPIRED_CARD': 'Your card has expired',
      'NETWORK_ERROR': 'Network error. Please try again',
      'GATEWAY_TIMEOUT': 'Payment gateway timeout',
      'TRANSACTION_LIMIT_EXCEEDED': 'Transaction amount exceeds limit'
    };

    const message = errorMap[error.message] || 
                   error.response?.data?.message || 
                   'Payment processing failed. Please try again.';

    return new Error(message);
  }

  /**
   * Handle payment errors
   */
  async handlePaymentError(error, paymentData, options) {
    await errorService.captureError(error, {
      context: 'payment_processing',
      paymentData: this.sanitizePaymentData(paymentData),
      options
    });

    // Update transaction if it exists
    if (paymentData.transactionId) {
      await this.updateTransaction(paymentData.transactionId, {
        status: PAYMENT_STATUS.FAILED,
        error: error.message,
        failedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Get device information for fraud detection
   */
  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants?.Model,
      brand: Platform.constants?.Brand,
      userAgent: navigator?.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator?.language
    };
  }

  // ==================== CLEANUP & MAINTENANCE ====================

  /**
   * Cleanup payment service
   */
  async cleanup() {
    try {
      // Process any remaining receipts
      await this.processReceiptQueue();

      // Clear caches
      this.pendingTransactions.clear();
      this.transactionCache.clear();
      this.receiptQueue = [];

      this.isInitialized = false;

      await this.trackEvent('service_cleaned_up');

    } catch (error) {
      await errorService.captureError(error, {
        context: 'payment_service_cleanup'
      });
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      availableGateways: Array.from(this.paymentHandlers.keys()),
      pendingTransactions: this.pendingTransactions.size,
      cachedTransactions: this.transactionCache.size,
      receiptQueueLength: this.receiptQueue.length
    };
  }
}

// Create singleton instance
const paymentService = new PaymentService();

export default paymentService;