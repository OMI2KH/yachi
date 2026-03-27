backend/services/monetizationService.js

const logger = require('../utils/logger');
const { paymentService } = require('./paymentService');
const Joi = require('joi');
const EventEmitter = require('events');

// Custom Error Classes
class MonetizationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MonetizationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class PurchaseValidationError extends MonetizationError {
  constructor(message, details) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'PurchaseValidationError';
  }
}

class PaymentProcessingError extends MonetizationError {
  constructor(message, details) {
    super(message, 'PAYMENT_PROCESSING_ERROR', details);
    this.name = 'PaymentProcessingError';
  }
}

class RateLimitError extends MonetizationError {
  constructor(message, details) {
    super(message, 'RATE_LIMIT_EXCEEDED', details);
    this.name = 'RateLimitError';
  }
}

// Validation Schemas
const paymentInfoSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  address: Joi.object({
    line1: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    postalCode: Joi.string().optional(),
    country: Joi.string().optional()
  }).optional()
});

const purchasePlanSchema = Joi.object({
  userId: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(1).max(100).required(),
  planId: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(1).max(50).required(),
  amount: Joi.number().positive().precision(2).max(1000000).required(),
  currency: Joi.string().length(3).uppercase().required(),
  provider: Joi.string().valid('stripe', 'paypal', 'razorpay', 'manual').optional(),
  paymentInfo: paymentInfoSchema.required(),
  metadata: Joi.object().optional()
});

const purchaseBadgeSchema = Joi.object({
  userId: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(1).max(100).required(),
  badgeType: Joi.string().valid('gold', 'silver', 'bronze', 'premium', 'custom').required(),
  amount: Joi.number().positive().precision(2).max(1000).required(),
  currency: Joi.string().length(3).uppercase().required(),
  provider: Joi.string().valid('stripe', 'paypal', 'razorpay', 'manual').optional(),
  paymentInfo: paymentInfoSchema.required(),
  customBadgeName: Joi.string().max(50).optional()
});

class MonetizationService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      defaultCurrency: 'USD',
      defaultProvider: 'stripe',
      enableLogging: true,
      rateLimiting: {
        maxPurchasesPerHour: 10,
        maxAmountPerHour: 1000,
        maxPurchasesPerDay: 50,
        maxAmountPerDay: 5000
      },
      retryConfig: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000
      },
      ...config
    };
    
    // In-memory storage (replace with Redis in production)
    this.rateLimiter = new Map();
    this.transactionStore = new Map();
    this.userPurchaseHistory = new Map();
    
    // Metrics
    this.metrics = {
      totalPurchases: 0,
      totalRevenue: 0,
      successfulPurchases: 0,
      failedPurchases: 0,
      totalRefunds: 0,
      providerMetrics: {
        stripe: { count: 0, revenue: 0 },
        paypal: { count: 0, revenue: 0 },
        razorpay: { count: 0, revenue: 0 },
        manual: { count: 0, revenue: 0 }
      }
    };
    
    // Supported currencies and their minimum amounts
    this.supportedCurrencies = {
      USD: { minAmount: 1.00, symbol: '$' },
      EUR: { minAmount: 1.00, symbol: '€' },
      GBP: { minAmount: 1.00, symbol: '£' },
      INR: { minAmount: 10.00, symbol: '₹' },
      CAD: { minAmount: 1.00, symbol: 'CA$' },
      AUD: { minAmount: 1.00, symbol: 'A$' }
    };
    
    // Plans configuration
    this.plans = new Map([
      ['basic', { name: 'Basic Plan', features: ['feature1', 'feature2'] }],
      ['pro', { name: 'Pro Plan', features: ['all_features'] }],
      ['enterprise', { name: 'Enterprise Plan', features: ['all_features', 'support'] }]
    ]);
    
    // Badges configuration
    this.badges = new Map([
      ['gold', { name: 'Gold Badge', duration: 'lifetime' }],
      ['silver', { name: 'Silver Badge', duration: '30_days' }],
      ['bronze', { name: 'Bronze Badge', duration: '7_days' }],
      ['premium', { name: 'Premium Badge', duration: 'lifetime' }]
    ]);
    
    if (this.config.enableLogging) {
      logger.info('MonetizationService initialized', { 
        config: { 
          defaultCurrency: this.config.defaultCurrency,
          rateLimiting: this.config.rateLimiting 
        } 
      });
    }
  }

  // Utility Methods
  generateTransactionId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async validateRateLimit(userId, amount) {
    const now = Date.now();
    const userKey = `user_${userId}`;
    
    if (!this.rateLimiter.has(userKey)) {
      this.rateLimiter.set(userKey, {
        hourly: { count: 0, amount: 0, resetTime: now + 3600000 },
        daily: { count: 0, amount: 0, resetTime: now + 86400000 }
      });
    }
    
    const userStats = this.rateLimiter.get(userKey);
    
    // Reset if time has passed
    if (now > userStats.hourly.resetTime) {
      userStats.hourly = { count: 0, amount: 0, resetTime: now + 3600000 };
    }
    if (now > userStats.daily.resetTime) {
      userStats.daily = { count: 0, amount: 0, resetTime: now + 86400000 };
    }
    
    // Check hourly limits
    if (userStats.hourly.count >= this.config.rateLimiting.maxPurchasesPerHour) {
      throw new RateLimitError('Hourly purchase limit reached', {
        userId,
        limit: this.config.rateLimiting.maxPurchasesPerHour,
        resetIn: Math.ceil((userStats.hourly.resetTime - now) / 60000) + ' minutes'
      });
    }
    
    if (userStats.hourly.amount + amount > this.config.rateLimiting.maxAmountPerHour) {
      throw new RateLimitError('Hourly amount limit exceeded', {
        userId,
        currentAmount: userStats.hourly.amount,
        attemptedAmount: amount,
        limit: this.config.rateLimiting.maxAmountPerHour
      });
    }
    
    // Check daily limits
    if (userStats.daily.count >= this.config.rateLimiting.maxPurchasesPerDay) {
      throw new RateLimitError('Daily purchase limit reached', {
        userId,
        limit: this.config.rateLimiting.maxPurchasesPerDay,
        resetIn: Math.ceil((userStats.daily.resetTime - now) / 3600000) + ' hours'
      });
    }
    
    if (userStats.daily.amount + amount > this.config.rateLimiting.maxAmountPerDay) {
      throw new RateLimitError('Daily amount limit exceeded', {
        userId,
        currentAmount: userStats.daily.amount,
        attemptedAmount: amount,
        limit: this.config.rateLimiting.maxAmountPerDay
      });
    }
    
    // Update counters
    userStats.hourly.count++;
    userStats.hourly.amount += amount;
    userStats.daily.count++;
    userStats.daily.amount += amount;
    
    return true;
  }

  async logTransaction(transaction) {
    const logEntry = {
      ...transaction,
      loggedAt: new Date().toISOString()
    };
    
    this.transactionStore.set(transaction.transactionId, logEntry);
    
    // Emit event for external systems
    this.emit('transaction.logged', logEntry);
    
    if (this.config.enableLogging) {
      logger.info('Transaction logged', { 
        transactionId: transaction.transactionId,
        type: transaction.type 
      });
    }
  }

  async updateUserPurchaseHistory(userId, purchaseData) {
    if (!this.userPurchaseHistory.has(userId)) {
      this.userPurchaseHistory.set(userId, []);
    }
    
    const history = this.userPurchaseHistory.get(userId);
    history.push({
      ...purchaseData,
      purchasedAt: new Date().toISOString()
    });
    
    // Keep only last 100 purchases
    if (history.length > 100) {
      history.shift();
    }
    
    this.emit('user.purchase.updated', { userId, purchase: purchaseData });
  }

  async updateMetrics(transaction, success = true) {
    this.metrics.totalPurchases++;
    
    if (success) {
      this.metrics.successfulPurchases++;
      this.metrics.totalRevenue += transaction.amount;
      
      if (this.metrics.providerMetrics[transaction.provider]) {
        this.metrics.providerMetrics[transaction.provider].count++;
        this.metrics.providerMetrics[transaction.provider].revenue += transaction.amount;
      }
    } else {
      this.metrics.failedPurchases++;
    }
    
    this.emit('metrics.updated', this.metrics);
  }

  async validateCurrencyAndAmount(currency, amount) {
    if (!this.supportedCurrencies[currency]) {
      throw new PurchaseValidationError(`Currency ${currency} is not supported`, {
        currency,
        supportedCurrencies: Object.keys(this.supportedCurrencies)
      });
    }
    
    const minAmount = this.supportedCurrencies[currency].minAmount;
    if (amount < minAmount) {
      throw new PurchaseValidationError(`Amount is below minimum for ${currency}`, {
        currency,
        amount,
        minimumAmount: minAmount
      });
    }
    
    return true;
  }

  // Main Purchase Methods with Retry Logic
  async purchaseWithRetry(purchaseFn, params, transactionId) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryConfig.maxRetries; attempt++) {
      try {
        const result = await purchaseFn(params);
        
        if (this.config.enableLogging) {
          logger.info(`Purchase attempt ${attempt} successful`, { 
            transactionId,
            userId: params.userId 
          });
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        logger.warn(`Purchase attempt ${attempt} failed`, { 
          transactionId,
          userId: params.userId,
          error: error.message,
          attempt
        });
        
        if (attempt < this.config.retryConfig.maxRetries) {
          const delay = Math.min(
            this.config.retryConfig.initialDelay * Math.pow(2, attempt - 1),
            this.config.retryConfig.maxDelay
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new PaymentProcessingError('All purchase attempts failed', {
      originalError: lastError?.message,
      transactionId,
      userId: params.userId,
      attempts: this.config.retryConfig.maxRetries
    });
  }

  async purchasePlan({ 
    userId, 
    planId, 
    amount, 
    currency, 
    provider = null, 
    paymentInfo = {}, 
    metadata = {} 
  }) {
    const transactionId = this.generateTransactionId();
    const startTime = Date.now();
    
    try {
      // Input validation
      const { error } = purchasePlanSchema.validate({ 
        userId, planId, amount, currency, provider, paymentInfo, metadata 
      });
      
      if (error) {
        throw new PurchaseValidationError(`Validation failed: ${error.message}`, {
          details: error.details
        });
      }
      
      // Currency validation
      await this.validateCurrencyAndAmount(currency, amount);
      
      // Rate limiting
      await this.validateRateLimit(userId, amount);
      
      // Check if plan exists
      if (!this.plans.has(planId)) {
        throw new PurchaseValidationError(`Plan ${planId} not found`, {
          planId,
          availablePlans: Array.from(this.plans.keys())
        });
      }
      
      const plan = this.plans.get(planId);
      
      // Log initiation
      logger.info('Purchase plan initiated', { 
        transactionId, 
        userId, 
        planId, 
        amount, 
        currency,
        planName: plan.name 
      });
      
      // Prepare payment data
      const paymentData = {
        amount,
        currency,
        userId,
        email: paymentInfo.email,
        firstName: paymentInfo.firstName,
        lastName: paymentInfo.lastName,
        phone: paymentInfo.phone,
        metadata: {
          serviceName: `Premium Plan: ${plan.name}`,
          serviceId: planId,
          type: 'premium_plan',
          planName: plan.name,
          features: plan.features,
          ...metadata
        }
      };
      
      const finalProvider = provider || this.config.defaultProvider;
      
      // Execute purchase with retry logic
      const result = await this.purchaseWithRetry(
        async () => {
          return await paymentService.initiatePayment(paymentData, { 
            provider: finalProvider 
          });
        },
        { userId, planId, amount, currency, provider: finalProvider },
        transactionId
      );
      
      // Create transaction record
      const transaction = {
        transactionId,
        userId,
        type: 'plan_purchase',
        planId,
        planName: plan.name,
        amount,
        currency,
        provider: finalProvider,
        paymentId: result.paymentId,
        status: result.status,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      // Store transaction
      await this.logTransaction(transaction);
      
      // Update metrics
      await this.updateMetrics(transaction, true);
      
      // Update user history
      await this.updateUserPurchaseHistory(userId, {
        transactionId,
        type: 'plan',
        planId,
        amount,
        currency,
        status: 'completed'
      });
      
      // Emit success event
      this.emit('purchase.completed', transaction);
      
      logger.info('Purchase plan completed', { 
        transactionId, 
        userId, 
        planId,
        paymentId: result.paymentId,
        status: result.status 
      });
      
      return {
        success: true,
        transactionId,
        paymentId: result.paymentId,
        status: result.status,
        plan: {
          id: planId,
          name: plan.name,
          features: plan.features
        },
        amount: {
          value: amount,
          currency,
          formatted: `${this.supportedCurrencies[currency]?.symbol || ''}${amount.toFixed(2)}`
        }
      };
      
    } catch (error) {
      // Log failed transaction
      const failedTransaction = {
        transactionId,
        userId,
        type: 'plan_purchase',
        planId,
        amount,
        currency,
        provider: provider || this.config.defaultProvider,
        status: 'failed',
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.logTransaction(failedTransaction);
      await this.updateMetrics(failedTransaction, false);
      
      // Emit failure event
      this.emit('purchase.failed', failedTransaction);
      
      logger.error('Purchase plan failed', { 
        transactionId, 
        userId, 
        planId,
        error: error.message,
        stack: error.stack 
      });
      
      throw error;
    }
  }

  async purchaseBadge({ 
    userId, 
    badgeType, 
    amount, 
    currency, 
    provider = null, 
    paymentInfo = {}, 
    customBadgeName = null 
  }) {
    const transactionId = this.generateTransactionId();
    const startTime = Date.now();
    
    try {
      // Input validation
      const { error } = purchaseBadgeSchema.validate({ 
        userId, badgeType, amount, currency, provider, paymentInfo, customBadgeName 
      });
      
      if (error) {
        throw new PurchaseValidationError(`Validation failed: ${error.message}`, {
          details: error.details
        });
      }
      
      // Currency validation
      await this.validateCurrencyAndAmount(currency, amount);
      
      // Rate limiting
      await this.validateRateLimit(userId, amount);
      
      // Check if badge type exists
      if (!this.badges.has(badgeType) && badgeType !== 'custom') {
        throw new PurchaseValidationError(`Badge type ${badgeType} not found`, {
          badgeType,
          availableBadges: Array.from(this.badges.keys())
        });
      }
      
      const badge = badgeType === 'custom' 
        ? { name: customBadgeName || 'Custom Badge', duration: 'lifetime' }
        : this.badges.get(badgeType);
      
      // Log initiation
      logger.info('Purchase badge initiated', { 
        transactionId, 
        userId, 
        badgeType, 
        amount, 
        currency,
        badgeName: badge.name 
      });
      
      // Prepare payment data
      const paymentData = {
        amount,
        currency,
        userId,
        email: paymentInfo.email,
        firstName: paymentInfo.firstName,
        lastName: paymentInfo.lastName,
        phone: paymentInfo.phone,
        metadata: {
          serviceName: `Badge: ${badge.name}`,
          badgeType,
          badgeName: badge.name,
          badgeDuration: badge.duration,
          customBadgeName: badgeType === 'custom' ? customBadgeName : null,
          type: 'badge_purchase'
        }
      };
      
      const finalProvider = provider || this.config.defaultProvider;
      
      // Execute purchase with retry logic
      const result = await this.purchaseWithRetry(
        async () => {
          return await paymentService.initiatePayment(paymentData, { 
            provider: finalProvider 
          });
        },
        { userId, badgeType, amount, currency, provider: finalProvider },
        transactionId
      );
      
      // Create transaction record
      const transaction = {
        transactionId,
        userId,
        type: 'badge_purchase',
        badgeType,
        badgeName: badge.name,
        badgeDuration: badge.duration,
        amount,
        currency,
        provider: finalProvider,
        paymentId: result.paymentId,
        status: result.status,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      // Store transaction
      await this.logTransaction(transaction);
      
      // Update metrics
      await this.updateMetrics(transaction, true);
      
      // Update user history
      await this.updateUserPurchaseHistory(userId, {
        transactionId,
        type: 'badge',
        badgeType,
        badgeName: badge.name,
        amount,
        currency,
        status: 'completed'
      });
      
      // Emit success event
      this.emit('badge.purchased', transaction);
      
      logger.info('Purchase badge completed', { 
        transactionId, 
        userId, 
        badgeType,
        paymentId: result.paymentId,
        status: result.status 
      });
      
      return {
        success: true,
        transactionId,
        paymentId: result.paymentId,
        status: result.status,
        badge: {
          type: badgeType,
          name: badge.name,
          duration: badge.duration
        },
        amount: {
          value: amount,
          currency,
          formatted: `${this.supportedCurrencies[currency]?.symbol || ''}${amount.toFixed(2)}`
        }
      };
      
    } catch (error) {
      // Log failed transaction
      const failedTransaction = {
        transactionId,
        userId,
        type: 'badge_purchase',
        badgeType,
        amount,
        currency,
        provider: provider || this.config.defaultProvider,
        status: 'failed',
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.logTransaction(failedTransaction);
      await this.updateMetrics(failedTransaction, false);
      
      // Emit failure event
      this.emit('badge.purchase.failed', failedTransaction);
      
      logger.error('Purchase badge failed', { 
        transactionId, 
        userId, 
        badgeType,
        error: error.message,
        stack: error.stack 
      });
      
      throw error;
    }
  }

  // Webhook Handling
  async handleProviderWebhook(providerName, body, signature, headers = {}) {
    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Webhook received', { 
      webhookId, 
      provider: providerName,
      eventType: body.type || body.event 
    });
    
    try {
      // Validate webhook signature
      const result = await paymentService.handleWebhook(providerName, body, signature, headers);
      
      // Log successful webhook processing
      logger.info('Webhook processed successfully', { 
        webhookId, 
        provider: providerName,
        eventId: result.eventId 
      });
      
      // Emit webhook event for external consumers
      this.emit('webhook.processed', {
        webhookId,
        provider: providerName,
        event: result,
        timestamp: new Date().toISOString()
      });
      
      return result;
      
    } catch (err) {
      logger.error('Webhook handling failed', { 
        webhookId, 
        provider: providerName,
        error: err.message,
        body: JSON.stringify(body).substring(0, 500) // Log first 500 chars
      });
      
      this.emit('webhook.failed', {
        webhookId,
        provider: providerName,
        error: err.message,
        timestamp: new Date().toISOString()
      });
      
      throw err;
    }
  }

  // Query Methods
  async getTransaction(transactionId) {
    return this.transactionStore.get(transactionId) || null;
  }

  async getUserTransactions(userId, limit = 50, offset = 0) {
    const allTransactions = Array.from(this.transactionStore.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return {
      transactions: allTransactions.slice(offset, offset + limit),
      total: allTransactions.length,
      limit,
      offset
    };
  }

  async getUserPurchaseHistory(userId) {
    return this.userPurchaseHistory.get(userId) || [];
  }

  async getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      currency: this.config.defaultCurrency
    };
  }

  async getRateLimitStatus(userId) {
    const userKey = `user_${userId}`;
    if (!this.rateLimiter.has(userKey)) {
      return {
        userId,
        hourly: { count: 0, amount: 0, remaining: this.config.rateLimiting.maxPurchasesPerHour },
        daily: { count: 0, amount: 0, remaining: this.config.rateLimiting.maxPurchasesPerDay }
      };
    }
    
    const userStats = this.rateLimiter.get(userKey);
    const now = Date.now();
    
    return {
      userId,
      hourly: {
        count: userStats.hourly.count,
        amount: userStats.hourly.amount,
        remaining: Math.max(0, this.config.rateLimiting.maxPurchasesPerHour - userStats.hourly.count),
        amountRemaining: Math.max(0, this.config.rateLimiting.maxAmountPerHour - userStats.hourly.amount),
        resetsIn: Math.ceil((userStats.hourly.resetTime - now) / 60000) + ' minutes'
      },
      daily: {
        count: userStats.daily.count,
        amount: userStats.daily.amount,
        remaining: Math.max(0, this.config.rateLimiting.maxPurchasesPerDay - userStats.daily.count),
        amountRemaining: Math.max(0, this.config.rateLimiting.maxAmountPerDay - userStats.daily.amount),
        resetsIn: Math.ceil((userStats.daily.resetTime - now) / 3600000) + ' hours'
      }
    };
  }

  // Admin Methods
  async clearRateLimits(userId = null) {
    if (userId) {
      this.rateLimiter.delete(`user_${userId}`);
      logger.info('Rate limits cleared for user', { userId });
    } else {
      this.rateLimiter.clear();
      logger.info('All rate limits cleared');
    }
  }

  async refundTransaction(transactionId, reason = '') {
    // This is a placeholder - implement actual refund logic
    logger.info('Refund requested', { transactionId, reason });
    
    // Update metrics
    this.metrics.totalRefunds++;
    
    return {
      success: true,
      transactionId,
      refundedAt: new Date().toISOString(),
      reason
    };
  }

  // Configuration Methods
  addPlan(planId, planDetails) {
    this.plans.set(planId, planDetails);
    logger.info('Plan added', { planId, planName: planDetails.name });
  }

  addBadge(badgeType, badgeDetails) {
    this.badges.set(badgeType, badgeDetails);
    logger.info('Badge added', { badgeType, badgeName: badgeDetails.name });
  }

  addSupportedCurrency(currencyCode, details) {
    this.supportedCurrencies[currencyCode] = details;
    logger.info('Currency added', { currencyCode, details });
  }

  // Health Check
  async healthCheck() {
    const checks = {
      paymentService: paymentService.healthCheck ? await paymentService.healthCheck().catch(() => false) : true,
      transactionStore: this.transactionStore.size >= 0,
      rateLimiter: this.rateLimiter instanceof Map,
      metrics: typeof this.metrics === 'object'
    };
    
    const healthy = Object.values(checks).every(check => check === true);
    
    return {
      healthy,
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance with configuration
const monetizationService = new MonetizationService({
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  defaultProvider: process.env.DEFAULT_PAYMENT_PROVIDER || 'stripe',
  enableLogging: process.env.NODE_ENV !== 'test',
  rateLimiting: {
    maxPurchasesPerHour: parseInt(process.env.MAX_PURCHASES_PER_HOUR) || 10,
    maxAmountPerHour: parseFloat(process.env.MAX_AMOUNT_PER_HOUR) || 1000,
    maxPurchasesPerDay: parseInt(process.env.MAX_PURCHASES_PER_DAY) || 50,
    maxAmountPerDay: parseFloat(process.env.MAX_AMOUNT_PER_DAY) || 5000
  },
  retryConfig: {
    maxRetries: parseInt(process.env.PURCHASE_RETRY_COUNT) || 3,
    initialDelay: parseInt(process.env.PURCHASE_RETRY_DELAY) || 1000,
    maxDelay: parseInt(process.env.PURCHASE_MAX_RETRY_DELAY) || 10000
  }
});

module.exports = { 
  monetizationService,
  MonetizationService,
  MonetizationError,
  PurchaseValidationError,
  PaymentProcessingError,
  RateLimitError
};