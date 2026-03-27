// services/paymentService.js
const axios = require('axios');
const crypto = require('crypto');
const redis = require('../config/redis');
const { YachiAnalytics } = require('./yachiAnalytics');
const { YachiSecurity } = require('./yachiSecurity');
const { YachiAI } = require('./yachiAI');
const logger = require('../utils/logger');

class PaymentService {
  constructor(options = {}) {
    this.providers = {
      chapa: this.initializeChapa(),
      telebirr: this.initializeTelebirr(),
      cbebirr: this.initializeCbeBirr()
    };
    
    this.activeProvider = process.env.DEFAULT_PAYMENT_PROVIDER || 'chapa';
    this.webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    this.retryAttempts = 3;
    this.cacheTimeout = 300; 
    
    if (!options.skipInit) {
      this.initializePaymentService();
    }
  }

  /**
   * Initialize Chapa payment provider
   */
  initializeChapa() {
    if (process.env.CHAPA_SECRET_KEY) {
      return {
        name: 'chapa',
        baseURL: 'https://api.chapa.co/v1',
        headers: {
          'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        webhookSecret: process.env.CHAPA_WEBHOOK_SECRET,
        supportedCurrencies: ['ETB', 'USD'],
        supportedMethods: ['CARD', 'BANK', 'TELEBIRR', 'CBE_BIRR']
      };
    }
    return null;
  }

  /**
   * Initialize Telebirr payment provider
   */
  initializeTelebirr() {
    if (process.env.TELEBIRR_APP_KEY && process.env.TELEBIRR_APP_SECRET) {
      return {
        name: 'telebirr',
        baseURL: 'https://api.telebirr.et',
        appKey: process.env.TELEBIRR_APP_KEY,
        appSecret: process.env.TELEBIRR_APP_SECRET,
        supportedCurrencies: ['ETB'],
        supportedMethods: ['TELEBIRR_WALLET']
      };
    }
    return null;
  }

  /**
   * Initialize CBE Birr payment provider
   */
  initializeCbeBirr() {
    if (process.env.CBE_BIRR_MERCHANT_ID && process.env.CBE_BIRR_API_KEY) {
      return {
        name: 'cbebirr',
        baseURL: process.env.CBE_BIRR_BASE_URL || 'https://api.cbebirr.et',
        merchantId: process.env.CBE_BIRR_MERCHANT_ID,
        apiKey: process.env.CBE_BIRR_API_KEY,
        supportedCurrencies: ['ETB'],
        supportedMethods: ['CBE_BIRR_WALLET', 'BANK']
      };
    }
    return null;
  }

  /**
   * Initialize PayPal payment provider
   */
  // PayPal and Stripe integrations removed: platform now supports Ethiopian gateways only

  /**
   * Initialize payment service
   */
  initializePaymentService() {
    this.verifyProviders();
    logger.info('Payment Service initialized successfully');
  }

  /**
   * Verify all payment providers
   */
  async verifyProviders() {
    for (const [name, provider] of Object.entries(this.providers)) {
      if (provider) {
        try {
          await this.verifyProvider(provider);
          logger.info(`Payment provider ${name} verified successfully`);
        } catch (error) {
          logger.warn(`Payment provider ${name} verification failed:`, error.message);
        }
      }
    }
  }

  /**
   * Verify webhook signature for a provider.
   * Falls back to permissive validation when no secret is configured
   */
  async verifyWebhookSignature(providerName, body, signature) {
    try {
      const provider = this.providers[providerName];
      if (!provider) {
        logger.warn(`verifyWebhookSignature: provider ${providerName} not found`);
        return false;
      }

      // If provider defines a webhook secret use HMAC SHA256 comparison
      const secret = provider.webhookSecret || provider.webhook_secret || process.env.PAYMENT_WEBHOOK_SECRET;
      if (secret) {
        const payload = typeof body === 'string' ? body : JSON.stringify(body);
        const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        const ok = signature === expected || signature === `sha256=${expected}`;
        if (!ok) logger.warn(`Webhook signature mismatch for ${providerName}`);
        return ok;
      }

      // If no secret available, accept but log for visibility
      logger.warn(`No webhook secret configured for provider ${providerName}; accepting webhook by default`);
      return true;
    } catch (err) {
      logger.error('verifyWebhookSignature error', err);
      return false;
    }
  }

  /**
   * Verify provider connectivity
   */
  async verifyProvider(provider) {
    switch (provider.name) {
      case 'chapa':
        return await this.verifyChapa(provider);
      case 'telebirr':
        return await this.verifyTelebirr(provider);
      case 'cbebirr':
        return await this.verifyCbeBirr(provider);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }

  /**
   * Initiate payment
   */
  async initiatePayment(paymentData, options = {}) {
    const paymentId = this.generatePaymentId();
    const startTime = Date.now();

    try {
      // Validate payment data
      this.validatePaymentData(paymentData);

      // Check for duplicate payments
      await this.checkDuplicatePayment(paymentData);

      // Select appropriate provider
      const provider = this.selectProvider(paymentData, options);
      
      // Prepare payment payload
      const payload = this.preparePaymentPayload(paymentData, provider, paymentId);

      // Process payment with selected provider
      const result = await this.processPaymentWithProvider(provider, payload, options);

      // Create payment record
      const paymentRecord = await this.createPaymentRecord({
        ...paymentData,
        paymentId,
        provider: provider.name,
        reference: result.reference,
        status: 'initiated',
        metadata: {
          providerResponse: result,
          initiatedAt: new Date().toISOString()
        }
      });

      // Track payment initiation
      await this.trackPaymentEvent({
        paymentId,
        action: 'initiated',
        amount: paymentData.amount,
        currency: paymentData.currency,
        provider: provider.name,
        userId: paymentData.userId,
        processingTime: Date.now() - startTime
      });

      logger.info(`Payment initiated successfully`, {
        paymentId,
        provider: provider.name,
        amount: paymentData.amount,
        currency: paymentData.currency,
        userId: paymentData.userId
      });

      return {
        success: true,
        paymentId,
        reference: result.reference,
        provider: provider.name,
        checkoutUrl: result.checkoutUrl,
        paymentMethods: result.paymentMethods,
        expiresAt: result.expiresAt,
        qrCode: result.qrCode,
        instructions: result.instructions
      };

    } catch (error) {
      // Track failed initiation
      await this.trackPaymentEvent({
        paymentId,
        action: 'initiation_failed',
        amount: paymentData.amount,
        currency: paymentData.currency,
        provider: options.provider,
        userId: paymentData.userId,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      logger.error('Payment initiation failed:', {
        paymentId,
        error: error.message,
        userId: paymentData.userId
      });

      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Process payment with specific provider
   */
  async processPaymentWithProvider(provider, payload, options) {
    switch (provider.name) {
      case 'chapa':
        return await this.processWithChapa(provider, payload);
      case 'telebirr':
        return await this.processWithTelebirr(provider, payload);
      case 'cbebirr':
        return await this.processWithCbeBirr(provider, payload);
      default:
        throw new Error(`Unsupported payment provider: ${provider.name}`);
    }
  }

  /**
   * Process payment with Chapa
   */
  async processWithChapa(provider, payload) {
    try {
      const response = await axios.post(
        `${provider.baseURL}/transaction/initialize`,
        payload,
        { headers: provider.headers }
      );

      const data = response.data;

      if (data.status !== 'success') {
        throw new Error(data.message || 'Chapa payment initiation failed');
      }

      return {
        reference: data.data.tx_ref,
        checkoutUrl: data.data.checkout_url,
        paymentMethods: provider.supportedMethods,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        qrCode: data.data.qr_code,
        instructions: 'Complete payment on the Chapa checkout page'
      };
    } catch (error) {
      logger.error('Chapa payment processing failed:', error.response?.data || error.message);
      throw new Error(`Chapa payment failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Process payment with Telebirr
   */
  async processWithTelebirr(provider, payload) {
    try {
      // Generate Telebirr signature
      const timestamp = Date.now();
      const nonce = this.generateNonce();
      const signature = this.generateTelebirrSignature(provider, timestamp, nonce);

      const headers = {
        'appKey': provider.appKey,
        'timestamp': timestamp.toString(),
        'nonce': nonce,
        'signature': signature,
        'Content-Type': 'application/json'
      };

      const response = await axios.post(
        `${provider.baseURL}/api/v1/payment/initiate`,
        payload,
        { headers }
      );

      const data = response.data;

      if (data.code !== '200') {
        throw new Error(data.msg || 'Telebirr payment initiation failed');
      }

      return {
        reference: data.data.outTradeNo,
        checkoutUrl: data.data.payInfo,
        paymentMethods: ['TELEBIRR_WALLET'],
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        qrCode: data.data.qrCode,
        instructions: 'Open Telebirr app to complete payment'
      };
    } catch (error) {
      logger.error('Telebirr payment processing failed:', error.response?.data || error.message);
      throw new Error(`Telebirr payment failed: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Process payment with CBE Birr (adapter stub)
   */
  async processWithCbeBirr(provider, payload) {
    try {
      // Minimal adapter stub for CBE Birr. Replace with real API integration.
      const reference = `CBE-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
      return {
        reference,
        checkoutUrl: null,
        paymentMethods: provider.supportedMethods,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        qrCode: null,
        instructions: 'Follow bank instructions to complete the CBE Birr transfer/merchant payment'
      };
    } catch (error) {
      logger.error('CBE Birr payment processing failed:', error.message || error);
      throw new Error(`CBE Birr payment failed: ${error.message || error}`);
    }
  }

  // PayPal integration removed — platform supports Ethiopian gateways only

  /**
   * Process payment with Stripe
   */
  // Stripe integration removed — platform supports Ethiopian gateways only

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId, options = {}) {
    const startTime = Date.now();

    try {
      // Get payment record
      const paymentRecord = await this.getPaymentRecord(paymentId);
      if (!paymentRecord) {
        throw new Error('Payment record not found');
      }

      const provider = this.providers[paymentRecord.provider];
      if (!provider) {
        throw new Error('Payment provider not available');
      }

      // Verify with provider
      const verificationResult = await this.verifyWithProvider(provider, paymentRecord.reference);

      // Update payment status
      const updatedRecord = await this.updatePaymentStatus(
        paymentId,
        verificationResult.status,
        verificationResult
      );

      // Track verification
      await this.trackPaymentEvent({
        paymentId,
        action: 'verified',
        status: verificationResult.status,
        provider: provider.name,
        processingTime: Date.now() - startTime
      });

      // Process successful payments
      if (verificationResult.status === 'success') {
        await this.processSuccessfulPayment(paymentRecord, verificationResult);
      }

      return {
        success: true,
        paymentId,
        status: verificationResult.status,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        provider: provider.name,
        verifiedAt: new Date().toISOString(),
        metadata: verificationResult
      };

    } catch (error) {
      await this.trackPaymentEvent({
        paymentId,
        action: 'verification_failed',
        error: error.message,
        processingTime: Date.now() - startTime
      });

      logger.error('Payment verification failed:', {
        paymentId,
        error: error.message
      });

      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Verify payment with provider
   */
  async verifyWithProvider(provider, reference) {
    switch (provider.name) {
      case 'chapa':
        return await this.verifyWithChapa(provider, reference);
      case 'telebirr':
        return await this.verifyWithTelebirr(provider, reference);
      case 'cbebirr':
        return await this.verifyWithCbeBirr(provider, reference);
      default:
        throw new Error(`Unsupported provider for verification: ${provider.name}`);
    }
  }

  /**
   * Verify with Chapa
   */
  async verifyWithChapa(provider, reference) {
    try {
      const response = await axios.get(
        `${provider.baseURL}/transaction/verify/${reference}`,
        { headers: provider.headers }
      );

      const data = response.data;

      return {
        status: data.status === 'success' ? 'success' : 'failed',
        providerData: data.data,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Chapa verification failed:', error.response?.data || error.message);
      throw new Error(`Chapa verification failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Process successful payment
   */
  async processSuccessfulPayment(paymentRecord, verificationResult) {
    try {
      // Update transaction status
      const { Transaction } = require('../models');
      await Transaction.update(
        { status: 'completed', paidAt: new Date() },
        { where: { paymentId: paymentRecord.paymentId } }
      );

      // Release funds to worker (if applicable)
      if (paymentRecord.payeeId) {
        await this.releaseFundsToWorker(paymentRecord);
      }

      // Send notifications
      await this.sendPaymentNotifications(paymentRecord);

      // Track revenue
      await YachiAnalytics.trackRevenue({
        paymentId: paymentRecord.paymentId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        userId: paymentRecord.userId,
        serviceType: paymentRecord.metadata?.serviceType,
        provider: paymentRecord.provider
      });

      logger.info(`Payment processed successfully: ${paymentRecord.paymentId}`);
    } catch (error) {
      logger.error('Failed to process successful payment:', error);
      throw error;
    }
  }

  /**
   * Release funds to worker
   */
  async releaseFundsToWorker(paymentRecord) {
    try {
      const { User, Wallet } = require('../models');

      // Calculate platform fee
      const platformFee = this.calculatePlatformFee(paymentRecord.amount);
      const workerAmount = paymentRecord.amount - platformFee;

      // Update worker wallet
      await Wallet.increment('balance', {
        by: workerAmount,
        where: { userId: paymentRecord.payeeId }
      });

      // Create wallet transaction
      await Wallet.createTransaction({
        userId: paymentRecord.payeeId,
        type: 'credit',
        amount: workerAmount,
        description: `Payment for service #${paymentRecord.metadata?.serviceId}`,
        metadata: {
          paymentId: paymentRecord.paymentId,
          platformFee,
          netAmount: workerAmount
        }
      });

      logger.info(`Funds released to worker: ${paymentRecord.payeeId}`, {
        amount: workerAmount,
        platformFee,
        paymentId: paymentRecord.paymentId
      });
    } catch (error) {
      logger.error('Failed to release funds to worker:', error);
      throw error;
    }
  }

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount) {
    const feePercentage = process.env.PLATFORM_FEE_PERCENTAGE || 15; // 15% default
    return (amount * feePercentage) / 100;
  }

  /**
   * Send payment notifications
   */
  async sendPaymentNotifications(paymentRecord) {
    try {
      const { emailService, smsService } = require('./index');

      // Send to client
      await emailService.sendPaymentReceipt({
        id: paymentRecord.paymentId,
        amount: paymentRecord.amount,
        serviceName: paymentRecord.metadata?.serviceName,
        paidAt: new Date()
      }, {
        email: paymentRecord.metadata?.clientEmail,
        name: paymentRecord.metadata?.clientName
      });

      // Send to worker
      if (paymentRecord.payeeId) {
        await smsService.sendWorkerNotification(paymentRecord.payeeId, {
          type: 'payment_received',
          amount: paymentRecord.amount,
          service: paymentRecord.metadata?.serviceName,
          clientName: paymentRecord.metadata?.clientName
        });
      }

    } catch (error) {
      logger.error('Failed to send payment notifications:', error);
      // Don't throw error as this shouldn't block payment processing
    }
  }

  /**
   * Handle payment webhook
   */
  async handleWebhook(providerName, webhookData, signature) {
    // Idempotency: use redis lock to prevent double-processing
    const lockClient = redis.getClient ? await redis.getClient('cache') : null;
    let lockKey;
    try {
      // Verify signature first
      const isValid = await this.verifyWebhookSignature(providerName, webhookData, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Normalize event
      const event = this.parseWebhookEvent(providerName, webhookData);
      if (!event || !event.id) {
        logger.warn('Webhook event missing id; processing may be non-idempotent');
      }

      // Try DB-backed idempotency first (durable). If DB says already exists, skip processing.
      try {
        const { WebhookEvent } = require('../models');
        if (WebhookEvent) {
          const eventId = event.id || event.reference || `${Date.now()}`;
          try {
            await WebhookEvent.create({ provider: providerName, eventId: eventId, reference: event.reference, rawPayload: webhookData, headers: signature ? { signature } : {} });
          } catch (dbErr) {
            // Unique constraint means this event was already recorded -> skip
            if (dbErr.name === 'SequelizeUniqueConstraintError' || dbErr.original?.code === '23505') {
              logger.info(`Webhook ${providerName}:${eventId} already recorded; skipping`);
              return { success: true, skipped: true };
            }
            // Other DB errors bubble up
            logger.warn('Webhook DB insert error (continuing to Redis fallback):', dbErr.message || dbErr);
          }
        }
      } catch (err) {
        logger.debug('Webhook DB idempotency unavailable:', err.message || err);
      }

      lockKey = `webhook:${providerName}:${event.id || event.reference || Date.now()}`;

      if (lockClient && typeof lockClient.set === 'function') {
        // Try to acquire lock (NX) for 5 minutes
        const acquired = await lockClient.set(lockKey, '1', { NX: true, EX: 300 });
        if (!acquired) {
          logger.info(`Webhook ${lockKey} already processed or locked; skipping`);
          return { success: true, skipped: true };
        }
      }

      // Process webhook event
      switch (event.type) {
        case 'payment_success':
          await this.handleSuccessfulPayment(event);
          break;
        case 'payment_failed':
          if (this.handleFailedPayment) await this.handleFailedPayment(event);
          break;
        case 'payment_refunded':
          if (this.handleRefund) await this.handleRefund(event);
          break;
        default:
          logger.warn(`Unhandled webhook event type: ${event.type}`);
      }

      // Mark the webhook as processed in DB if available
      try {
        const { WebhookEvent } = require('../models');
        if (WebhookEvent) {
          const eventId = event.id || event.reference || `${Date.now()}`;
          await WebhookEvent.update({ processed: true, processedAt: new Date() }, { where: { eventId, provider: providerName } });
        }
      } catch (e) {
        logger.debug('Failed to mark webhook processed in DB:', e.message || e);
      }

      return { success: true, processed: true };

    } catch (error) {
      logger.error('Webhook processing failed:', error.message || error);
      // If lock was acquired, remove it to allow retry later
      try {
        if (lockClient && lockKey) await lockClient.del(lockKey);
      } catch (e) {
        logger.warn('Failed to release webhook lock:', e.message || e);
      }
      throw error;
    }
  }

  /**
   * Parse various provider webhook payloads into a normalized event
   */
  parseWebhookEvent(providerName, payload) {
    try {
      switch (providerName) {
        case 'chapa': {
          const body = payload;
          const status = body?.data?.status || body?.status;
          const reference = body?.data?.tx_ref || body?.data?.reference || body?.tx_ref;
          return {
            id: body?.id || reference,
            type: status === 'success' ? 'payment_success' : 'payment_failed',
            reference,
            providerData: body?.data || body
          };
        }
        case 'telebirr': {
          const body = payload;
          const status = body?.data?.status || body?.code === '200' ? 'success' : 'failed';
          const reference = body?.data?.outTradeNo || body?.outTradeNo;
          return {
            id: body?.id || reference,
            type: status === 'success' ? 'payment_success' : 'payment_failed',
            reference,
            providerData: body?.data || body
          };
        }
        case 'cbebirr': {
          const body = payload;
          const status = body?.status || body?.data?.status || 'pending';
          const reference = body?.merchantReference || body?.data?.merchantReference || body?.reference;
          return {
            id: body?.id || reference,
            type: status === 'success' ? 'payment_success' : status === 'refunded' ? 'payment_refunded' : 'payment_failed',
            reference,
            providerData: body
          };
        }
        default:
          return {
            id: payload?.id || payload?.reference || Date.now(),
            type: 'unknown',
            reference: payload?.reference,
            providerData: payload
          };
      }
    } catch (err) {
      logger.error('parseWebhookEvent error', err);
      return { id: Date.now(), type: 'unknown', providerData: payload };
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handleSuccessfulPayment(event) {
    const paymentRecord = await this.getPaymentByReference(event.reference);
    if (!paymentRecord) {
      throw new Error(`Payment record not found for reference: ${event.reference}`);
    }

    // Update payment status
    await this.updatePaymentStatus(
      paymentRecord.paymentId,
      'success',
      event.providerData
    );

    // Process successful payment
    await this.processSuccessfulPayment(paymentRecord, event);

    logger.info(`Webhook: Payment successful for ${event.reference}`);
  }

  /**
   * Initiate refund
   */
  async initiateRefund(paymentId, reason, options = {}) {
    try {
      const paymentRecord = await this.getPaymentRecord(paymentId);
      if (!paymentRecord) {
        throw new Error('Payment record not found');
      }

      if (paymentRecord.status !== 'success') {
        throw new Error('Can only refund successful payments');
      }

      const provider = this.providers[paymentRecord.provider];
      const refundResult = await this.refundWithProvider(provider, paymentRecord, reason, options);

      // Update payment record
      await this.updatePaymentStatus(paymentId, 'refunded', {
        refundReason: reason,
        refundAmount: refundResult.amount,
        refundedAt: new Date().toISOString(),
        providerRefundId: refundResult.refundId
      });

      // Reverse wallet transaction if applicable
      if (paymentRecord.payeeId) {
        await this.reverseFundsFromWorker(paymentRecord, refundResult.amount);
      }

      await this.trackPaymentEvent({
        paymentId,
        action: 'refunded',
        amount: refundResult.amount,
        reason
      });

      return {
        success: true,
        refundId: refundResult.refundId,
        amount: refundResult.amount,
        status: refundResult.status
      };

    } catch (error) {
      logger.error('Refund initiation failed:', error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(timeRange = '30d') {
    try {
      const { Payment, Sequelize } = require('../models');

      const where = this.buildTimeRangeQuery(timeRange);
      
      const stats = await Payment.findAll({
        where: { ...where, status: 'success' },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalTransactions'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalRevenue'],
          [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageTransaction'],
          [Sequelize.fn('COUNT', Sequelize.literal('DISTINCT userId')), 'uniqueCustomers']
        ],
        raw: true
      });

      const providerStats = await Payment.findAll({
        where: { ...where, status: 'success' },
        attributes: [
          'provider',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'volume']
        ],
        group: ['provider'],
        raw: true
      });

      const hourlyStats = await Payment.findAll({
        where: { ...where, status: 'success' },
        attributes: [
          [Sequelize.fn('HOUR', Sequelize.col('createdAt')), 'hour'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'volume']
        ],
        group: [Sequelize.fn('HOUR', Sequelize.col('createdAt'))],
        order: [[Sequelize.fn('HOUR', Sequelize.col('createdAt')), 'ASC']],
        raw: true
      });

      return {
        overview: stats[0] || {},
        byProvider: providerStats,
        byHour: hourlyStats,
        timeRange
      };

    } catch (error) {
      logger.error('Failed to get payment statistics:', error);
      throw new Error('Failed to retrieve payment statistics');
    }
  }

  /**
   * Utility Methods
   */

  validatePaymentData(paymentData) {
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    if (!paymentData.currency) {
      throw new Error('Currency is required');
    }

    if (!paymentData.userId) {
      throw new Error('User ID is required');
    }

    if (!paymentData.metadata?.serviceId) {
      throw new Error('Service ID is required in metadata');
    }
  }

  selectProvider(paymentData, options) {
    // Use specified provider or select based on currency and amount
    const providerName = options.provider || this.activeProvider;
    const provider = this.providers[providerName];

    if (!provider) {
      throw new Error(`Payment provider not available: ${providerName}`);
    }

    // Check if provider supports the currency
    if (!provider.supportedCurrencies.includes(paymentData.currency)) {
      throw new Error(`Provider ${providerName} does not support ${paymentData.currency}`);
    }

    return provider;
  }

  preparePaymentPayload(paymentData, provider, paymentId) {
    const basePayload = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      email: paymentData.email,
      first_name: paymentData.firstName,
      last_name: paymentData.lastName,
      phone_number: paymentData.phone,
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      customizations: {
        title: 'Yachi Services',
        description: `Payment for ${paymentData.metadata.serviceName}`,
        logo: `${process.env.CDN_URL}/logo.png`
      },
      meta: {
        payment_id: paymentId,
        user_id: paymentData.userId,
        service_id: paymentData.metadata.serviceId
      }
    };

    // Provider-specific payload adjustments (Ethiopian providers only)
    switch (provider.name) {
      case 'chapa':
        return {
          ...basePayload,
          tx_ref: paymentId
        };
      case 'telebirr':
        return {
          ...basePayload,
          outTradeNo: paymentId,
          subject: `Yachi - ${paymentData.metadata.serviceName}`,
          totalAmount: paymentData.amount.toString()
        };
      case 'cbebirr':
        return {
          ...basePayload,
          merchantReference: paymentId,
          amount: paymentData.amount.toString()
        };
      default:
        return basePayload;
    }
  }

  generatePaymentId() {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateNonce() {
    return Math.random().toString(36).substring(2, 15);
  }

  generateTelebirrSignature(provider, timestamp, nonce) {
    const data = `${provider.appKey}${timestamp}${nonce}${provider.appSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async checkDuplicatePayment(paymentData) {
    const { Payment, Op } = require('../models');

    const recentPayment = await Payment.findOne({
      where: {
        userId: paymentData.userId,
        amount: paymentData.amount,
        serviceId: paymentData.metadata.serviceId,
        status: { [Op.in]: ['initiated', 'success'] },
        createdAt: {
          [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }
    });

    if (recentPayment) {
      throw new Error('Duplicate payment detected');
    }
  }

  async createPaymentRecord(paymentData) {
    const { Payment } = require('../models');
    return await Payment.create(paymentData);
  }

  async getPaymentRecord(paymentId) {
    const { Payment } = require('../models');
    return await Payment.findByPk(paymentId);
  }

  async getPaymentByReference(reference) {
    const { Payment } = require('../models');
    return await Payment.findOne({ where: { reference } });
  }

  async updatePaymentStatus(paymentId, status, metadata = {}) {
    const { Payment } = require('../models');

    const updateData = { status };
    if (status === 'success') {
      updateData.paidAt = new Date();
    }
    if (metadata) {
      updateData.metadata = { ...metadata };
    }

    await Payment.update(updateData, { where: { paymentId } });
    return await Payment.findOne({ where: { paymentId } });
  }

  async trackPaymentEvent(eventData) {
    try {
      await YachiAnalytics.trackPaymentEvent(eventData);
    } catch (error) {
      logger.error('Failed to track payment event:', error);
    }
  }

  buildTimeRangeQuery(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const { Op } = require('../models');
    return {
      createdAt: {
        [Op.gte]: startDate
      }
    };
  }
}

// Create singleton instance
const paymentService = new PaymentService();

module.exports = { PaymentService, paymentService };
