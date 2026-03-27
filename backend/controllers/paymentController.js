const { Sequelize, Op } = require('sequelize');
const { Transaction, Booking, User, Service, PaymentMethod, Refund, Payout } = require('../models');
const { YachiLogger } = require('../utils/logger');
const { redisManager, redisUtils } = require('../config/redis');
const { securityConfig } = require('../config/security');
const { PaymentService } = require('../services/paymentService');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiNotifications } = require('../services/yachiNotifications');
const { YachiSecurity } = require('../services/yachiSecurity');

/**
 * 💳 Payment Controller
 * Comprehensive payment management for the Yachi platform
 * Handles payments, refunds, payouts, and financial operations
 */

class PaymentController {
  constructor() {
    this.paymentProviders = ['telebirr', 'cbebirr', 'chapa'];
    this.setupPaymentWebhooks();
  }

  /**
   * 🔗 Setup payment webhooks
   */
  setupPaymentWebhooks() {
    // Webhook endpoints will be set up in routes
  }

  /**
   * 💰 Initialize Payment
   */
  initializePayment = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { bookingId, paymentMethod, paymentProvider = 'telebirr' } = req.body;
      const clientId = req.user.userId;

      // 🛡️ Validate payment initialization
      const validation = await this.validatePaymentInitialization({
        bookingId,
        clientId,
        paymentMethod,
        paymentProvider
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Payment validation failed',
          errors: validation.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      const { booking, transactionRecord } = validation;

      // 🚨 Check if payment already exists
      const existingPayment = await Transaction.findOne({
        where: {
          bookingId,
          status: { [Op.in]: ['pending', 'processing', 'completed'] }
        },
        transaction
      });

      if (existingPayment) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Payment already exists for this booking',
          existingPayment: this.sanitizeTransaction(existingPayment),
          code: 'DUPLICATE_PAYMENT'
        });
      }

      // 🎯 Initialize payment with provider
      const paymentResult = await PaymentService.initializePayment({
        amount: booking.amount,
        currency: booking.currency,
        customerId: clientId,
        bookingId,
        paymentMethod,
        provider: paymentProvider,
        metadata: {
          clientId,
          providerId: booking.providerId,
          serviceId: booking.serviceId,
          serviceTitle: booking.service?.title
        }
      });

      // 👤 Update transaction with payment details
      await Transaction.update({
        paymentMethod,
        paymentProvider,
        paymentReference: paymentResult.paymentReference,
        status: 'pending',
        metadata: {
          ...sequelize.literal('metadata'),
          paymentInitialization: {
            provider: paymentProvider,
            reference: paymentResult.paymentReference,
            initiatedAt: new Date().toISOString(),
            checkoutUrl: paymentResult.checkoutUrl,
            ip: req.ip
          }
        }
      }, {
        where: { id: transactionRecord.id },
        transaction
      });

      // 📊 Track payment initialization analytics
      await YachiAnalytics.trackEvent('payment_initialized', {
        transactionId: transactionRecord.id,
        bookingId,
        clientId,
        amount: booking.amount,
        paymentProvider,
        paymentMethod
      });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          transaction: this.sanitizeTransaction(transactionRecord),
          payment: {
            checkoutUrl: paymentResult.checkoutUrl,
            paymentReference: paymentResult.paymentReference,
            expiresIn: paymentResult.expiresIn || 1800, // 30 minutes
            provider: paymentProvider
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      
      YachiLogger.error('Initialize payment error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to initialize payment',
        code: 'PAYMENT_INITIALIZATION_FAILED'
      });
    }
  };

  /**
   * ✅ Confirm Payment
   */
  confirmPayment = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { transactionId, paymentReference, otp } = req.body;
      const clientId = req.user.userId;

      // 🔍 Get transaction with booking details
      const transactionRecord = await Transaction.findOne({
        where: {
          id: transactionId,
          clientId,
          status: 'pending'
        },
        include: [
          {
            model: Booking,
            as: 'booking',
            include: [
              {
                model: Service,
                as: 'service',
                attributes: ['id', 'title', 'providerId']
              }
            ]
          }
        ],
        transaction
      });

      if (!transactionRecord) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Transaction not found or already processed',
          code: 'TRANSACTION_NOT_FOUND'
        });
      }

      // 🎯 Confirm payment with provider
      const confirmationResult = await PaymentService.confirmPayment({
        paymentReference,
        otp,
        provider: transactionRecord.paymentProvider,
        metadata: {
          transactionId,
          clientId,
          bookingId: transactionRecord.bookingId
        }
      });

      if (!confirmationResult.success) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Payment confirmation failed',
          error: confirmationResult.error,
          code: 'PAYMENT_CONFIRMATION_FAILED'
        });
      }

      // 👤 Update transaction status
      await Transaction.update({
        status: 'completed',
        processedAt: new Date(),
        metadata: {
          ...sequelize.literal('metadata'),
          paymentConfirmation: {
            confirmedAt: new Date().toISOString(),
            providerReference: confirmationResult.providerReference,
            method: confirmationResult.paymentMethod,
            ip: req.ip
          }
        }
      }, {
        where: { id: transactionId },
        transaction
      });

      // 📝 Update booking status
      await Booking.update({
        status: 'confirmed',
        confirmedAt: new Date()
      }, {
        where: { id: transactionRecord.bookingId },
        transaction
      });

      // 🔔 Send notifications
      await YachiNotifications.sendPaymentConfirmed(clientId, {
        transactionId,
        amount: transactionRecord.amount,
        serviceTitle: transactionRecord.booking.service.title
      });

      await YachiNotifications.sendBookingConfirmed(
        transactionRecord.booking.service.providerId,
        {
          bookingId: transactionRecord.bookingId,
          clientName: req.user.name,
          amount: transactionRecord.amount
        }
      );

      // 🎪 Award payment points
      await YachiGamification.awardPaymentCompletion(clientId);

      // 📊 Track payment completion analytics
      await YachiAnalytics.trackEvent('payment_completed', {
        transactionId,
        bookingId: transactionRecord.bookingId,
        clientId,
        providerId: transactionRecord.booking.service.providerId,
        amount: transactionRecord.amount,
        paymentProvider: transactionRecord.paymentProvider
      });

      await transaction.commit();

      // 🗑️ Clear relevant caches
      await this.clearPaymentCaches(clientId);

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          transaction: this.sanitizeTransaction(transactionRecord),
          booking: {
            id: transactionRecord.bookingId,
            status: 'confirmed'
          }
        },
        gamification: {
          pointsAwarded: 10,
          achievement: 'Payment Processed'
        }
      });

    } catch (error) {
      await transaction.rollback();
      
      YachiLogger.error('Confirm payment error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        code: 'PAYMENT_CONFIRMATION_FAILED'
      });
    }
  };

  /**
   * 🔄 Process Refund
   */
  processRefund = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { transactionId, reason, refundAmount } = req.body;
      const userId = req.user.userId;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Refund reason is required',
          code: 'MISSING_REFUND_REASON'
        });
      }

      // 🔍 Get transaction with booking details
      const transactionRecord = await Transaction.findOne({
        where: { id: transactionId },
        include: [
          {
            model: Booking,
            as: 'booking',
            include: [
              {
                model: User,
                as: 'client',
                attributes: ['id', 'name', 'email']
              },
              {
                model: User,
                as: 'provider',
                attributes: ['id', 'name', 'email']
              }
            ]
          }
        ],
        transaction
      });

      if (!transactionRecord) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND'
        });
      }

      // 🛡️ Verify authorization
      const isAdmin = req.user.role === 'admin';
      const isClient = transactionRecord.clientId === userId;
      const isProvider = transactionRecord.providerId === userId;

      if (!isAdmin && !isClient && !isProvider) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Not authorized to process refund',
          code: 'UNAUTHORIZED_REFUND'
        });
      }

      // 🚨 Validate refund eligibility
      const refundValidation = await this.validateRefundEligibility(
        transactionRecord,
        refundAmount,
        userId
      );

      if (!refundValidation.eligible) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: refundValidation.message,
          code: refundValidation.code
        });
      }

      const finalRefundAmount = refundValidation.refundAmount;

      // 🎯 Process refund with payment provider
      const refundResult = await PaymentService.processRefund({
        transactionId,
        amount: finalRefundAmount,
        currency: transactionRecord.currency,
        reason,
        initiatedBy: userId,
        provider: transactionRecord.paymentProvider,
        originalReference: transactionRecord.paymentReference
      });

      // 📝 Create refund record
      const refund = await Refund.create({
        transactionId,
        amount: finalRefundAmount,
        currency: transactionRecord.currency,
        reason: securityConfig.sanitizeInput(reason, 'string'),
        status: refundResult.success ? 'completed' : 'failed',
        processedBy: userId,
        providerReference: refundResult.refundReference,
        metadata: {
          originalTransaction: {
            amount: transactionRecord.amount,
            paymentMethod: transactionRecord.paymentMethod,
            provider: transactionRecord.paymentProvider
          },
          refundProcessing: {
            initiatedAt: new Date().toISOString(),
            providerResponse: refundResult,
            ip: req.ip
          }
        }
      }, { transaction });

      // 👤 Update transaction status if full refund
      if (finalRefundAmount === transactionRecord.amount) {
        await Transaction.update({
          status: 'refunded',
          refundedAt: new Date()
        }, {
          where: { id: transactionId },
          transaction
        });
      }

      // 🔔 Send notifications
      await YachiNotifications.sendRefundProcessed(transactionRecord.clientId, {
        transactionId,
        refundAmount: finalRefundAmount,
        reason,
        serviceTitle: transactionRecord.booking.service?.title
      });

      // 📊 Track refund analytics
      await YachiAnalytics.trackEvent('refund_processed', {
        transactionId,
        refundId: refund.id,
        clientId: transactionRecord.clientId,
        amount: finalRefundAmount,
        reason,
        initiatedBy: userId
      });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refund: this.sanitizeRefund(refund),
          amount: finalRefundAmount,
          providerReference: refundResult.refundReference
        }
      });

    } catch (error) {
      await transaction.rollback();
      
      YachiLogger.error('Process refund error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        code: 'REFUND_PROCESSING_FAILED'
      });
    }
  };

  /**
   * 💸 Process Payout to Provider
   */
  processPayout = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { providerId, amount, description } = req.body;
      const processedBy = req.user.userId;

      // 🛡️ Validate payout request
      const validation = await this.validatePayoutRequest({
        providerId,
        amount,
        processedBy
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Payout validation failed',
          errors: validation.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      const provider = validation.provider;

      // 🎯 Process payout with payment provider
      const payoutResult = await PaymentService.processPayout({
        providerId,
        amount,
        currency: 'ETB',
        description: description || 'Service earnings payout',
        method: 'bank_transfer', // Default method
        metadata: {
          processedBy,
          description
        }
      });

      // 📝 Create payout record
      const payout = await Payout.create({
        providerId,
        amount,
        currency: 'ETB',
        status: payoutResult.success ? 'completed' : 'failed',
        processedBy,
        paymentMethod: 'bank_transfer',
        providerReference: payoutResult.payoutReference,
        description: securityConfig.sanitizeInput(description, 'string'),
        metadata: {
          payoutProcessing: {
            initiatedAt: new Date().toISOString(),
            providerResponse: payoutResult,
            ip: req.ip
          }
        }
      }, { transaction });

      // 🔔 Send notification to provider
      await YachiNotifications.sendPayoutProcessed(providerId, {
        payoutId: payout.id,
        amount,
        description
      });

      // 📊 Track payout analytics
      await YachiAnalytics.trackEvent('payout_processed', {
        payoutId: payout.id,
        providerId,
        amount,
        processedBy
      });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Payout processed successfully',
        data: {
          payout: this.sanitizePayout(payout),
          providerReference: payoutResult.payoutReference
        }
      });

    } catch (error) {
      await transaction.rollback();
      
      YachiLogger.error('Process payout error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to process payout',
        code: 'PAYOUT_PROCESSING_FAILED'
      });
    }
  };

  /**
   * 💳 Get Payment Methods
   */
  getPaymentMethods = async (req, res) => {
    try {
      const userId = req.user.userId;

      const cacheKey = `user:${userId}:payment_methods`;
      const cachedMethods = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedMethods) {
        return res.json({
          success: true,
          data: cachedMethods,
          source: 'cache'
        });
      }

      const paymentMethods = await PaymentMethod.findAll({
        where: { userId },
        order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
      });

      const availableProviders = await PaymentService.getAvailableProviders();

      const result = {
        savedMethods: paymentMethods.map(method => this.sanitizePaymentMethod(method)),
        availableProviders,
        defaultCurrency: 'ETB'
      };

      // 💾 Cache payment methods for 1 hour
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        result,
        { ttl: 3600 }
      );

      res.json({
        success: true,
        data: result,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get payment methods error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment methods',
        code: 'PAYMENT_METHODS_FETCH_FAILED'
      });
    }
  };

  /**
   * ➕ Add Payment Method
   */
  addPaymentMethod = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const userId = req.user.userId;
      const { methodType, provider, details, isDefault = false } = req.body;

      // 🛡️ Validate payment method
      const validation = this.validatePaymentMethod({
        methodType,
        provider,
        details
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Payment method validation failed',
          errors: validation.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      // 🎯 Tokenize payment method with provider
      const tokenizationResult = await PaymentService.tokenizePaymentMethod({
        userId,
        methodType,
        provider,
        details,
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      if (!tokenizationResult.success) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Failed to tokenize payment method',
          error: tokenizationResult.error,
          code: 'TOKENIZATION_FAILED'
        });
      }

      // 🔄 Set other methods as non-default if this is default
      if (isDefault) {
        await PaymentMethod.update(
          { isDefault: false },
          { where: { userId }, transaction }
        );
      }

      // 📝 Create payment method record
      const paymentMethod = await PaymentMethod.create({
        userId,
        methodType,
        provider,
        token: tokenizationResult.token,
        isDefault,
        lastFour: details.lastFour,
        expiryMonth: details.expiryMonth,
        expiryYear: details.expiryYear,
        metadata: {
          tokenization: {
            tokenizedAt: new Date().toISOString(),
            provider: tokenizationResult.provider,
            ip: req.ip
          },
          details: this.sanitizePaymentDetails(details)
        }
      }, { transaction });

      // 📊 Track payment method addition
      await YachiAnalytics.trackEvent('payment_method_added', {
        userId,
        methodType,
        provider,
        isDefault
      });

      await transaction.commit();

      // 🗑️ Clear payment methods cache
      await redisUtils.deletePattern(
        await redisManager.getClient('cache'),
        `user:${userId}:payment_methods`
      );

      res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: {
          paymentMethod: this.sanitizePaymentMethod(paymentMethod)
        }
      });

    } catch (error) {
      await transaction.rollback();
      
      YachiLogger.error('Add payment method error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to add payment method',
        code: 'PAYMENT_METHOD_ADDITION_FAILED'
      });
    }
  };

  /**
   * 📋 Get Transaction History
   */
  getTransactionHistory = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { 
        type = 'all', // 'all', 'payment', 'refund', 'payout'
        status,
        page = 1, 
        limit = 20,
        startDate,
        endDate
      } = req.query;

      const cacheKey = `user:${userId}:transactions:${type}:${status}:${page}:${limit}:${startDate}:${endDate}`;
      const cachedTransactions = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedTransactions) {
        return res.json({
          success: true,
          ...cachedTransactions,
          source: 'cache'
        });
      }

      const whereClause = {
        [Op.or]: [
          { clientId: userId },
          { providerId: userId }
        ]
      };

      // Filter by type
      if (type !== 'all') {
        whereClause.type = type;
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by date range
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      const transactions = await Transaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Booking,
            as: 'booking',
            attributes: ['id', 'scheduleDate', 'scheduleTime'],
            include: [
              {
                model: Service,
                as: 'service',
                attributes: ['id', 'title']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      const result = {
        transactions: transactions.rows.map(tx => this.sanitizeTransaction(tx)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: transactions.count,
          pages: Math.ceil(transactions.count / parseInt(limit))
        },
        filters: {
          type,
          status,
          startDate,
          endDate
        }
      };

      // 💾 Cache transactions for 5 minutes
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        result,
        { ttl: 300 }
      );

      res.json({
        success: true,
        ...result,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get transaction history error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction history',
        code: 'TRANSACTION_HISTORY_FETCH_FAILED'
      });
    }
  };

  /**
   * 📊 Get Financial Analytics
   */
  getFinancialAnalytics = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { period = 'month' } = req.query;

      const cacheKey = `user:${userId}:financial_analytics:${period}`;
      const cachedAnalytics = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedAnalytics) {
        return res.json({
          success: true,
          data: cachedAnalytics,
          source: 'cache'
        });
      }

      const analytics = await this.calculateFinancialAnalytics(userId, period);

      // 💾 Cache analytics for 15 minutes
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        analytics,
        { ttl: 900 }
      );

      res.json({
        success: true,
        data: analytics,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get financial analytics error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch financial analytics',
        code: 'FINANCIAL_ANALYTICS_FETCH_FAILED'
      });
    }
  };

  /**
   * 🔗 Handle Payment Webhook
   */
  handlePaymentWebhook = async (req, res) => {
    try {
      const { provider } = req.params;
      const webhookData = req.body;
      const signature = req.headers['x-signature'];

      // 🛡️ Verify webhook signature
      const isValid = await PaymentService.verifyWebhookSignature({
        provider,
        payload: webhookData,
        signature
      });

      if (!isValid) {
        YachiLogger.warn(`Invalid webhook signature from ${provider}`);
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }

      // 🎯 Process webhook based on event type
      const result = await this.processPaymentWebhook(provider, webhookData);

      if (result.success) {
        res.json({ success: true, message: 'Webhook processed' });
      } else {
        res.status(400).json({ 
          success: false, 
          message: 'Webhook processing failed',
          error: result.error
        });
      }

    } catch (error) {
      YachiLogger.error('Payment webhook error:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  };

  /**
   * 🛠️ Utility Methods
   */

  /**
   * Validate payment initialization
   */
  async validatePaymentInitialization(data) {
    const errors = [];

    // Booking validation
    const booking = await Booking.findOne({
      where: { 
        id: data.bookingId,
        clientId: data.clientId,
        status: 'pending'
      },
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'title', 'providerId']
        }
      ]
    });

    if (!booking) {
      errors.push('Booking not found or not eligible for payment');
      return { valid: false, errors, booking: null, transactionRecord: null };
    }

    // Transaction validation
    const transactionRecord = await Transaction.findOne({
      where: { bookingId: data.bookingId }
    });

    if (!transactionRecord) {
      errors.push('Transaction record not found for booking');
      return { valid: false, errors, booking: null, transactionRecord: null };
    }

    // Payment method validation
    if (!data.paymentMethod) {
      errors.push('Payment method is required');
    }

    // Payment provider validation
    if (!this.paymentProviders.includes(data.paymentProvider)) {
      errors.push('Invalid payment provider');
    }

    return {
      valid: errors.length === 0,
      errors,
      booking,
      transactionRecord
    };
  }

  /**
   * Validate refund eligibility
   */
  async validateRefundEligibility(transaction, refundAmount, initiatedBy) {
    // Check if transaction is eligible for refund
    if (transaction.status !== 'completed') {
      return {
        eligible: false,
        message: 'Only completed transactions can be refunded',
        code: 'INVALID_TRANSACTION_STATUS'
      };
    }

    // Check if refund was already processed
    const existingRefund = await Refund.findOne({
      where: { 
        transactionId: transaction.id,
        status: 'completed'
      }
    });

    if (existingRefund) {
      return {
        eligible: false,
        message: 'Refund already processed for this transaction',
        code: 'DUPLICATE_REFUND'
      };
    }

    // Calculate maximum refund amount
    const maxRefundAmount = await this.calculateMaxRefundAmount(transaction, initiatedBy);
    const finalRefundAmount = refundAmount || maxRefundAmount;

    if (finalRefundAmount > maxRefundAmount) {
      return {
        eligible: false,
        message: `Refund amount cannot exceed ${maxRefundAmount}`,
        code: 'EXCEEDS_MAX_REFUND'
      };
    }

    if (finalRefundAmount <= 0) {
      return {
        eligible: false,
        message: 'Refund amount must be greater than 0',
        code: 'INVALID_REFUND_AMOUNT'
      };
    }

    return {
      eligible: true,
      refundAmount: finalRefundAmount,
      maxRefundAmount
    };
  }

  /**
   * Validate payout request
   */
  async validatePayoutRequest(data) {
    const errors = [];

    // Provider validation
    const provider = await User.findOne({
      where: { 
        id: data.providerId,
        role: { [Op.in]: ['provider', 'graduate'] }
      }
    });

    if (!provider) {
      errors.push('Provider not found or invalid');
      return { valid: false, errors, provider: null };
    }

    // Amount validation
    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (data.amount > 1000000) { // 1,000,000 ETB limit
      errors.push('Amount exceeds maximum payout limit');
    }

    // Authorization validation (admin only for manual payouts)
    if (data.processedBy && data.processedBy !== data.providerId) {
      const admin = await User.findByPk(data.processedBy);
      if (!admin || admin.role !== 'admin') {
        errors.push('Only admins can process payouts for other users');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      provider
    };
  }

  /**
   * Validate payment method
   */
  validatePaymentMethod(data) {
    const errors = [];

    // Method type validation
    const validTypes = ['card', 'mobile_money', 'bank_account'];
    if (!validTypes.includes(data.methodType)) {
      errors.push('Invalid payment method type');
    }

    // Provider validation
    if (!this.paymentProviders.includes(data.provider)) {
      errors.push('Invalid payment provider');
    }

    // Details validation based on method type
    if (data.methodType === 'card') {
      if (!data.details.cardNumber || !data.details.expiryMonth || !data.details.expiryYear) {
        errors.push('Card details are incomplete');
      }
    } else if (data.methodType === 'mobile_money') {
      if (!data.details.phoneNumber) {
        errors.push('Phone number is required for mobile money');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate maximum refund amount
   */
  async calculateMaxRefundAmount(transaction, initiatedBy) {
    const booking = await Booking.findByPk(transaction.bookingId);
    if (!booking) return 0;

    const now = new Date();
    const scheduleDateTime = new Date(`${booking.scheduleDate}T${booking.scheduleTime}`);
    const timeDiff = scheduleDateTime - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // Provider-initiated refund - full amount
    if (initiatedBy === transaction.providerId) {
      return transaction.amount;
    }

    // Client-initiated refund - based on timing
    if (initiatedBy === transaction.clientId) {
      if (hoursDiff >= 24) {
        return transaction.amount; // Full refund
      } else if (hoursDiff >= 2) {
        return transaction.amount * 0.5; // 50% refund
      } else {
        return 0; // No refund
      }
    }

    // Admin-initiated refund - full amount
    const admin = await User.findByPk(initiatedBy);
    if (admin && admin.role === 'admin') {
      return transaction.amount;
    }

    return 0;
  }

  /**
   * Calculate financial analytics
   */
  async calculateFinancialAnalytics(userId, period) {
    const dateRange = this.getDateRange(period);
    
    const [
      revenueStats,
      spendingStats,
      payoutStats,
      refundStats
    ] = await Promise.all([
      // Revenue statistics (for providers)
      Transaction.findAll({
        where: {
          providerId: userId,
          status: 'completed',
          processedAt: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalRevenue'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'transactionCount'],
          [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageTransaction']
        ],
        raw: true
      }),

      // Spending statistics (for clients)
      Transaction.findAll({
        where: {
          clientId: userId,
          status: 'completed',
          processedAt: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalSpending'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'transactionCount'],
          [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageTransaction']
        ],
        raw: true
      }),

      // Payout statistics
      Payout.findAll({
        where: {
          providerId: userId,
          status: 'completed',
          createdAt: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalPayouts'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'payoutCount']
        ],
        raw: true
      }),

      // Refund statistics
      Refund.findAll({
        where: {
          createdAt: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        include: [
          {
            model: Transaction,
            as: 'transaction',
            where: {
              [Op.or]: [
                { clientId: userId },
                { providerId: userId }
              ]
            },
            attributes: []
          }
        ],
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalRefunds'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'refundCount']
        ],
        raw: true
      })
    ]);

    return {
      period,
      dateRange,
      revenue: {
        total: parseFloat(revenueStats[0]?.totalRevenue) || 0,
        transactionCount: parseInt(revenueStats[0]?.transactionCount) || 0,
        averageTransaction: parseFloat(revenueStats[0]?.averageTransaction) || 0
      },
      spending: {
        total: parseFloat(spendingStats[0]?.totalSpending) || 0,
        transactionCount: parseInt(spendingStats[0]?.transactionCount) || 0,
        averageTransaction: parseFloat(spendingStats[0]?.averageTransaction) || 0
      },
      payouts: {
        total: parseFloat(payoutStats[0]?.totalPayouts) || 0,
        payoutCount: parseInt(payoutStats[0]?.payoutCount) || 0
      },
      refunds: {
        total: parseFloat(refundStats[0]?.totalRefunds) || 0,
        refundCount: parseInt(refundStats[0]?.refundCount) || 0
      }
    };
  }

  /**
   * Get date range for analytics
   */
  getDateRange(period) {
    const now = new Date();
    let start = new Date();

    switch (period) {
      case 'day':
        start.setDate(now.getDate() - 1);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setMonth(now.getMonth() - 1);
    }

    return {
      start,
      end: now
    };
  }

  /**
   * Process payment webhook
   */
  async processPaymentWebhook(provider, webhookData) {
    try {
      const eventType = webhookData.event_type;
      const paymentReference = webhookData.payment_reference;

      YachiLogger.info(`Processing ${provider} webhook: ${eventType}`);

      switch (eventType) {
        case 'payment.completed':
          return await this.handlePaymentCompletedWebhook(provider, webhookData);
        
        case 'payment.failed':
          return await this.handlePaymentFailedWebhook(provider, webhookData);
        
        case 'refund.processed':
          return await this.handleRefundProcessedWebhook(provider, webhookData);
        
        default:
          YachiLogger.warn(`Unhandled webhook event: ${eventType}`);
          return { success: true, message: 'Event not handled' };
      }
    } catch (error) {
      YachiLogger.error('Webhook processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle payment completed webhook
   */
  async handlePaymentCompletedWebhook(provider, webhookData) {
    const transaction = await sequelize.transaction();
    
    try {
      const { payment_reference, amount, currency } = webhookData;

      // Find transaction
      const transactionRecord = await Transaction.findOne({
        where: { paymentReference: payment_reference },
        include: [{ model: Booking, as: 'booking' }],
        transaction
      });

      if (!transactionRecord) {
        await transaction.rollback();
        return { success: false, error: 'Transaction not found' };
      }

      // Update transaction status
      await Transaction.update({
        status: 'completed',
        processedAt: new Date(),
        metadata: {
          ...sequelize.literal('metadata'),
          webhookConfirmation: {
            confirmedAt: new Date().toISOString(),
            provider,
            webhookData
          }
        }
      }, {
        where: { id: transactionRecord.id },
        transaction
      });

      // Update booking status
      await Booking.update({
        status: 'confirmed',
        confirmedAt: new Date()
      }, {
        where: { id: transactionRecord.bookingId },
        transaction
      });

      await transaction.commit();

      YachiLogger.info(`Payment completed via webhook: ${payment_reference}`);
      return { success: true, message: 'Payment processed successfully' };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Clear payment caches
   */
  async clearPaymentCaches(userId) {
    const patterns = [
      `user:${userId}:payment_methods`,
      `user:${userId}:transactions:*`,
      `user:${userId}:financial_analytics:*`
    ];

    for (const pattern of patterns) {
      await redisUtils.deletePattern(
        await redisManager.getClient('cache'),
        pattern
      );
    }
  }

  /**
   * Sanitize transaction object
   */
  sanitizeTransaction(transaction) {
    const sanitized = { ...transaction.toJSON ? transaction.toJSON() : transaction };
    
    // Remove sensitive data
    delete sanitized.metadata?.paymentInitialization?.ip;
    delete sanitized.metadata?.paymentConfirmation?.ip;
    
    return sanitized;
  }

  /**
   * Sanitize refund object
   */
  sanitizeRefund(refund) {
    const sanitized = { ...refund.toJSON ? refund.toJSON() : refund };
    return sanitized;
  }

  /**
   * Sanitize payout object
   */
  sanitizePayout(payout) {
    const sanitized = { ...payout.toJSON ? payout.toJSON() : payout };
    return sanitized;
  }

  /**
   * Sanitize payment method object
   */
  sanitizePaymentMethod(method) {
    const sanitized = { ...method.toJSON ? method.toJSON() : method };
    
    // Remove sensitive token
    delete sanitized.token;
    delete sanitized.metadata?.tokenization;
    
    return sanitized;
  }

  /**
   * Sanitize payment details
   */
  sanitizePaymentDetails(details) {
    const sanitized = { ...details };
    
    // Remove sensitive card details
    if (sanitized.cardNumber) {
      sanitized.cardNumber = '•••• •••• •••• ' + sanitized.cardNumber.slice(-4);
    }
    if (sanitized.cvv) {
      delete sanitized.cvv;
    }
    
    return sanitized;
  }
}

// 🚀 Create and export controller instance
const paymentController = new PaymentController();

module.exports = paymentController;