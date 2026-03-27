const express = require('express');
const { Transaction, User, Product, Job, Escrow, Payout, CurrencyRate, PaymentMethod } = require('../models');
const { Sequelize, Op } = require('sequelize');
const auth = require('../middleware/auth');
const { z } = require('zod');
const crypto = require('crypto');
const { YachiPayments } = require('../services/yachiPayments');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiNotifications } = require('../services/yachiNotifications');
const { YachiSecurity } = require('../services/yachiSecurity');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { PaymentGateway } = require('../services/paymentGateway');
const { CurrencyService } = require('../services/currencyService');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const PaymentSchema = {
  initiate: z.object({
    type: z.enum(['premium_listing', 'verified_badge', 'job_payment', 'wallet_topup', 'service_fee']),
    itemId: z.number().int().positive().optional(),
    amount: z.number().positive().optional(),
    currency: z.string().default('ETB'),
    paymentMethod: z.enum(['telebirr', 'cbebirr', 'chapa', 'bank_transfer', 'wallet']),
    methodDetails: z.object({
      phoneNumber: z.string().optional(),
      cardToken: z.string().optional(),
      bankAccount: z.object({}).passthrough().optional(),
      saveMethod: z.boolean().default(false)
    }).optional(),
    metadata: z.object({}).passthrough().optional()
  }),

  confirm: z.object({
    paymentIntentId: z.string(),
    paymentMethod: z.string().optional(),
    redirectUrl: z.string().url().optional()
  }),

    payout: z.object({
    amount: z.number().positive(),
    currency: z.string().default('ETB'),
    method: z.enum(['telebirr', 'cbebirr', 'bank_transfer']),
    accountDetails: z.object({}).passthrough(),
    notes: z.string().max(500).optional()
  }),

  webhook: z.object({}).passthrough()
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  USER_TRANSACTIONS: (userId) => `transactions:user:${userId}`,
  PAYMENT_METHODS: (userId) => `payment:methods:${userId}`,
  EXCHANGE_RATES: 'currency:rates',
  PAYMENT_INTENT: (intentId) => `payment:intent:${intentId}`
};

// 🚀 INITIATE INTELLIGENT PAYMENT
router.post('/initiate', auth, async (req, res) => {
  try {
    const validatedData = PaymentSchema.initiate.parse(req.body);

    // 🛡️ Security and fraud check
    const securityCheck = await YachiSecurity.validatePaymentRequest(
      req.user.userId, 
      validatedData
    );
    
    if (!securityCheck.valid) {
      return res.status(403).json({
        success: false,
        message: securityCheck.reason,
        code: securityCheck.code
      });
    }

    // 💰 Calculate final amount with currency conversion
    const paymentCalculation = await YachiPayments.calculatePaymentAmount({
      type: validatedData.type,
      itemId: validatedData.itemId,
      baseAmount: validatedData.amount,
      currency: validatedData.currency,
      userId: req.user.userId,
      paymentMethod: validatedData.paymentMethod
    });

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 🎯 Create payment intent
      const paymentIntent = await PaymentGateway.createPaymentIntent({
        amount: paymentCalculation.finalAmount,
        currency: paymentCalculation.finalCurrency,
        paymentMethod: validatedData.paymentMethod,
        customerId: req.user.userId,
        metadata: {
          type: validatedData.type,
          itemId: validatedData.itemId,
          userId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      // 📝 Create transaction record
      const transactionRecord = await Transaction.create({
        userId: req.user.userId,
        type: validatedData.type,
        itemId: validatedData.itemId,
        paymentIntentId: paymentIntent.id,
        paymentMethod: validatedData.paymentMethod,
        amount: paymentCalculation.finalAmount,
        currency: paymentCalculation.finalCurrency,
        status: 'pending',
        gateway: paymentIntent.gateway,
        metadata: {
          ...paymentCalculation,
          ...validatedData.metadata,
          securityCheck: securityCheck.score,
          calculatedAt: new Date().toISOString()
        }
      }, { transaction });

      // 💾 Save payment method if requested
      if (validatedData.methodDetails?.saveMethod) {
        await PaymentMethod.upsert({
          userId: req.user.userId,
          method: validatedData.paymentMethod,
          details: validatedData.methodDetails,
          isDefault: false,
          lastUsed: new Date()
        }, { transaction });
      }

      await transaction.commit();

      // 💾 Cache payment intent
      await redis.setex(
        CACHE_KEYS.PAYMENT_INTENT(paymentIntent.id),
        3600, // 1 hour
        JSON.stringify({
          transactionId: transactionRecord.id,
          userId: req.user.userId,
          amount: paymentCalculation.finalAmount,
          currency: paymentCalculation.finalCurrency
        })
      );

      res.json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          paymentIntent: {
            id: paymentIntent.id,
            clientSecret: paymentIntent.clientSecret,
            amount: paymentCalculation.finalAmount,
            currency: paymentCalculation.finalCurrency,
            nextAction: paymentIntent.nextAction
          },
          transaction: {
            id: transactionRecord.id,
            amount: paymentCalculation.finalAmount,
            currency: paymentCalculation.finalCurrency,
            status: 'pending'
          },
          paymentFlow: paymentIntent.flow
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Initiate Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      code: 'PAYMENT_INITIATION_FAILED'
    });
  }
});

// 🚀 CONFIRM PAYMENT
router.post('/confirm', auth, async (req, res) => {
  try {
    const validatedData = PaymentSchema.confirm.parse(req.body);

    // 🔍 Retrieve payment intent from cache
    const cachedIntent = await redis.get(CACHE_KEYS.PAYMENT_INTENT(validatedData.paymentIntentId));
    if (!cachedIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found or expired',
        code: 'PAYMENT_INTENT_EXPIRED'
      });
    }

    const intentData = JSON.parse(cachedIntent);

    // 🛡️ Verify user ownership
    if (intentData.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this payment',
        code: 'CONFIRMATION_UNAUTHORIZED'
      });
    }

    // 💳 Confirm payment with gateway
    const confirmation = await PaymentGateway.confirmPayment(
      validatedData.paymentIntentId,
      validatedData.paymentMethod
    );

    if (!confirmation.success) {
      return res.status(402).json({
        success: false,
        message: 'Payment confirmation failed',
        code: 'PAYMENT_CONFIRMATION_FAILED',
        details: confirmation.error
      });
    }

    // 💼 Start transaction for post-payment processing
    const transaction = await sequelize.transaction();

    try {
      // 📝 Update transaction status
      const transactionRecord = await Transaction.findByPk(intentData.transactionId, { transaction });
      transactionRecord.status = 'completed';
      transactionRecord.gatewayTransactionId = confirmation.gatewayTransactionId;
      transactionRecord.completedAt = new Date();
      transactionRecord.metadata = {
        ...transactionRecord.metadata,
        confirmation: {
          confirmedAt: new Date().toISOString(),
          gatewayResponse: confirmation.gatewayResponse
        }
      };
      await transactionRecord.save({ transaction });

      // 🎯 Process post-payment actions
      await processPostPaymentActions(transactionRecord, transaction);

      // 🎪 Award payment points
      await YachiGamification.awardPaymentSuccess(req.user.userId, transactionRecord);

      await transaction.commit();

      // 📧 Send confirmation notification
      await YachiNotifications.sendPaymentConfirmation(req.user.userId, transactionRecord);

      // 🗑️ Clear relevant caches
      await redis.del(CACHE_KEYS.PAYMENT_INTENT(validatedData.paymentIntentId));
      await redis.del(CACHE_KEYS.USER_TRANSACTIONS(req.user.userId));

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          transaction: transactionRecord,
          confirmation: {
            id: confirmation.gatewayTransactionId,
            timestamp: new Date().toISOString(),
            amount: intentData.amount,
            currency: intentData.currency
          }
        },
        gamification: {
          pointsAwarded: Math.floor(intentData.amount / 100), // 1 point per 100 currency
          achievement: 'Payment Completed'
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Confirm Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      code: 'CONFIRMATION_FAILED'
    });
  }
});

// 🚀 PROCESS PAYOUT REQUEST
router.post('/payout', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can request payouts',
        code: 'PROVIDERS_ONLY'
      });
    }

    const validatedData = PaymentSchema.payout.parse(req.body);

    // 💰 Check available balance
    const availableBalance = await YachiPayments.getAvailableBalance(req.user.userId);
    
    if (availableBalance < validatedData.amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance for payout',
        code: 'INSUFFICIENT_BALANCE',
        available: availableBalance,
        requested: validatedData.amount
      });
    }

    // 🛡️ Validate payout method and details
    const payoutValidation = await YachiPayments.validatePayoutMethod(
      req.user.userId,
      validatedData.method,
      validatedData.accountDetails
    );

    if (!payoutValidation.valid) {
      return res.status(400).json({
        success: false,
        message: payoutValidation.reason,
        code: 'INVALID_PAYOUT_METHOD'
      });
    }

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 💸 Create payout record
      const payout = await Payout.create({
        userId: req.user.userId,
        amount: validatedData.amount,
        currency: validatedData.currency,
        method: validatedData.method,
        accountDetails: validatedData.accountDetails,
        status: 'pending',
        fees: await YachiPayments.calculatePayoutFees(validatedData.amount, validatedData.method),
        metadata: {
          notes: validatedData.notes,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          availableBalanceBefore: availableBalance
        }
      }, { transaction });

      // 🔐 Create debit transaction
      await Transaction.create({
        userId: req.user.userId,
        type: 'payout',
        amount: -validatedData.amount,
        currency: validatedData.currency,
        status: 'pending',
        payoutId: payout.id,
        metadata: {
          payoutMethod: validatedData.method,
          netAmount: validatedData.amount - payout.fees,
          fees: payout.fees
        }
      }, { transaction });

      await transaction.commit();

      // ⚡ Process payout asynchronously
      YachiPayments.processPayout(payout.id).catch(console.error);

      // 🗑️ Clear caches
      await redis.del(CACHE_KEYS.USER_TRANSACTIONS(req.user.userId));

      res.json({
        success: true,
        message: 'Payout request submitted successfully',
        data: {
          payout,
          estimatedArrival: await YachiPayments.getEstimatedArrival(validatedData.method),
          fees: payout.fees,
          netAmount: validatedData.amount - payout.fees
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Payout Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payout request',
      code: 'PAYOUT_REQUEST_FAILED'
    });
  }
});

// 🚀 UNIVERSAL PAYMENT WEBHOOK
router.post('/webhook/:gateway', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const gateway = req.params.gateway;
    const payload = req.body;
    const signature = req.headers['x-signature'] || req.headers['signature'];

    // 🛡️ Verify webhook signature
    const isValid = await PaymentGateway.verifyWebhookSignature(gateway, payload, signature);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE'
      });
    }

    // 🎯 Process webhook based on gateway
    const webhookResult = await PaymentGateway.processWebhook(gateway, payload);

    if (webhookResult.processed) {
      // 📊 Track webhook analytics
      await YachiAnalytics.trackPaymentWebhook(gateway, webhookResult);

      res.status(200).json({ success: true, message: 'Webhook processed' });
    } else {
      res.status(400).json({
        success: false,
        message: 'Webhook not processed',
        code: 'WEBHOOK_NOT_PROCESSED'
      });
    }

  } catch (error) {
    console.error('Webhook Processing Error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      code: 'WEBHOOK_PROCESSING_FAILED'
    });
  }
});

// 🚀 GET USER TRANSACTIONS WITH ADVANCED FILTERING
router.get('/transactions', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      dateFrom, 
      dateTo,
      currency 
    } = req.query;

    const cacheKey = CACHE_KEYS.USER_TRANSACTIONS(req.user.userId) + 
      `:${page}:${limit}:${type}:${status}:${dateFrom}:${dateTo}:${currency}`;

    const cachedTransactions = await redis.get(cacheKey);

    if (cachedTransactions) {
      return res.json({
        success: true,
        ...JSON.parse(cachedTransactions),
        source: 'cache'
      });
    }

    // 🎯 Build where clause
    const where = { userId: req.user.userId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (currency) where.currency = currency;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    const [transactions, total] = await Promise.all([
      Transaction.findAll({
        where,
        include: [
          {
            model: Job,
            as: 'job',
            attributes: ['id', 'title', 'status']
          },
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'type']
          },
          {
            model: Payout,
            as: 'payout',
            attributes: ['id', 'method', 'status']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      }),
      Transaction.count({ where })
    ]);

    // 💰 Calculate summary statistics
    const summary = await Transaction.findAll({
      where: { userId: req.user.userId },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCount'],
        [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageAmount']
      ],
      raw: true
    });

    const result = {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalAmount: parseFloat(summary[0]?.totalAmount) || 0,
        totalCount: parseInt(summary[0]?.totalCount) || 0,
        averageAmount: parseFloat(summary[0]?.averageAmount) || 0
      }
    };

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    console.error('Fetch Transactions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      code: 'FETCH_TRANSACTIONS_FAILED'
    });
  }
});

// 🚀 GET PAYMENT METHODS
router.get('/payment-methods', auth, async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.PAYMENT_METHODS(req.user.userId);
    const cachedMethods = await redis.get(cacheKey);

    if (cachedMethods) {
      return res.json({
        success: true,
        data: JSON.parse(cachedMethods),
        source: 'cache'
      });
    }

    const methods = await PaymentMethod.findAll({
      where: { userId: req.user.userId },
      order: [['lastUsed', 'DESC']]
    });

    // 🎯 Get available payment methods for user's region
    const availableMethods = await PaymentGateway.getAvailableMethods(req.user.userId);

    const result = {
      savedMethods: methods,
      availableMethods,
      defaultCurrency: await CurrencyService.getUserPreferredCurrency(req.user.userId)
    };

    // 💾 Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(result));

    res.json({
      success: true,
      data: result,
      source: 'database'
    });

  } catch (error) {
    console.error('Fetch Payment Methods Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      code: 'FETCH_METHODS_FAILED'
    });
  }
});

// 🚀 GET EXCHANGE RATES
router.get('/exchange-rates', auth, async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.EXCHANGE_RATES;
    const cachedRates = await redis.get(cacheKey);

    if (cachedRates) {
      return res.json({
        success: true,
        data: JSON.parse(cachedRates),
        source: 'cache'
      });
    }

    const rates = await CurrencyService.getCurrentExchangeRates();

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(rates));

    res.json({
      success: true,
      data: rates,
      source: 'database'
    });

  } catch (error) {
    console.error('Fetch Exchange Rates Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates',
      code: 'FETCH_RATES_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 🎯 Process Post-Payment Actions
async function processPostPaymentActions(transaction, dbTransaction) {
  switch (transaction.type) {
    case 'premium_listing':
      await activatePremiumListing(transaction.itemId, dbTransaction);
      break;
      
    case 'verified_badge':
      await activateVerifiedBadge(transaction.userId, dbTransaction);
      break;
      
    case 'job_payment':
      await processJobPayment(transaction.itemId, transaction, dbTransaction);
      break;
      
    case 'wallet_topup':
      await processWalletTopup(transaction.userId, transaction.amount, dbTransaction);
      break;
      
    case 'service_fee':
      // Service fee already processed during payment calculation
      break;
  }
}

// 💎 Activate Premium Listing
async function activatePremiumListing(productId, transaction) {
  const product = await Product.findByPk(productId, { transaction });
  if (product) {
    product.isPremium = true;
    product.premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await product.save({ transaction });
    
    // 🎪 Award premium activation points
    await YachiGamification.awardPremiumActivation(product.userId);
  }
}

// 🏷️ Activate Verified Badge
async function activateVerifiedBadge(userId, transaction) {
  const user = await User.findByPk(userId, { transaction });
  user.verifiedBadge = true;
  user.verifiedAt = new Date();
  await user.save({ transaction });
  
  // 🎪 Award verification points
  await YachiGamification.awardVerification(userId);
}

// 💼 Process Job Payment
async function processJobPayment(jobId, transaction, dbTransaction) {
  const job = await Job.findByPk(jobId, { 
    include: [{ model: User, as: 'provider' }],
    transaction: dbTransaction 
  });
  
  if (job && job.provider) {
    // 🔐 Create escrow or direct payment based on job type
    const escrow = await Escrow.create({
      jobId: job.id,
      clientId: transaction.userId,
      providerId: job.provider.id,
      amount: transaction.amount,
      currency: transaction.currency,
      status: 'held',
      releaseConditions: {
        job_completion: true,
        client_approval: true,
        auto_release_days: 3
      }
    }, { transaction: dbTransaction });

    // 🏷️ Update job payment status
    job.paymentStatus = 'paid';
    job.paidAt = new Date();
    await job.save({ transaction: dbTransaction });

    // 📧 Send payment confirmation to provider
    await YachiNotifications.sendJobPaymentNotification(job.provider.id, job.id, transaction.amount);
  }
}

// 💰 Process Wallet Topup
async function processWalletTopup(userId, amount, transaction) {
  await User.update({
    walletBalance: Sequelize.literal(`walletBalance + ${amount}`)
  }, {
    where: { id: userId },
    transaction
  });

  // 📧 Send wallet topup confirmation
  await YachiNotifications.sendWalletTopupNotification(userId, amount);
}

module.exports = router;
