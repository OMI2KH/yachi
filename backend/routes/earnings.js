const express = require('express');
const { Transaction, Job, User, Escrow, Commission, Payout, CurrencyRate } = require('../models');
const { Sequelize, Op } = require('sequelize');
const auth = require('../middleware/auth');
const { YachiPayments } = require('../services/yachiPayments');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiSecurity } = require('../services/yachiSecurity');
const { EscrowService } = require('../services/escrowService');
const { PayoutService } = require('../services/payoutService');
const redis = require('../config/redis');
const { z } = require('zod');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const PaymentSchema = {
    jobPayment: z.object({
    jobId: z.number().int().positive(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['telebirr', 'cbebirr', 'wallet', 'bank_transfer', 'chapa']),
    currency: z.string().default('ETB'),
    useYachiPoints: z.boolean().default(false),
    pointsToUse: z.number().int().min(0).default(0),
    savePaymentMethod: z.boolean().default(false),
    tipAmount: z.number().min(0).default(0)
  }),

    payoutRequest: z.object({
    amount: z.number().positive(),
    method: z.enum(['telebirr', 'cbebirr', 'bank_transfer']),
    currency: z.string().default('ETB'),
    accountDetails: z.object({}).passthrough().optional()
  }),

  transactions: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
    type: z.enum(['all', 'payment', 'payout', 'refund', 'commission']).default('all'),
    status: z.enum(['all', 'pending', 'completed', 'failed', 'cancelled']).default('all'),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional()
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  USER_EARNINGS: (userId) => `earnings:user:${userId}`,
  USER_TRANSACTIONS: (userId, params) => `transactions:user:${userId}:${Buffer.from(JSON.stringify(params)).toString('base64')}`,
  ESCROW_BALANCE: (userId) => `escrow:balance:${userId}`,
  PAYOUT_METHODS: (userId) => `payout:methods:${userId}`
};

// 🚀 GET COMPREHENSIVE EARNINGS DASHBOARD
router.get('/earnings', auth, async (req, res) => {
  try {
    const { timeframe = '30d', currency = 'ETB' } = req.query;

    const cacheKey = CACHE_KEYS.USER_EARNINGS(req.user.userId) + `:${timeframe}:${currency}`;
    const cachedEarnings = await redis.get(cacheKey);

    if (cachedEarnings) {
      return res.json({
        success: true,
        ...JSON.parse(cachedEarnings),
        source: 'cache'
      });
    }

    const earnings = await buildEarningsDashboard(req.user.userId, timeframe, currency);

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(earnings));

    res.json({
      success: true,
      ...earnings,
      source: 'database'
    });

  } catch (error) {
    console.error('Fetch Earnings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings data',
      code: 'FETCH_EARNINGS_FAILED'
    });
  }
});

// 🚀 PROCESS JOB PAYMENT WITH ESCROW
router.post('/job-payment', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can make payments',
        code: 'CLIENTS_ONLY'
      });
    }

    const validatedData = PaymentSchema.jobPayment.parse(req.body);

    // 💼 Start transaction for atomic operations
    const transaction = await sequelize.transaction();

    try {
      // 🔍 Verify job and provider
      const job = await Job.findByPk(validatedData.jobId, {
        include: [{
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'premiumListing']
        }]
      });

      if (!job) {
        throw new Error('JOB_NOT_FOUND');
      }

      if (job.status !== 'awaiting_payment') {
        throw new Error('JOB_NOT_READY_FOR_PAYMENT');
      }

      // 💰 Calculate final amount with currency conversion
      const paymentDetails = await YachiPayments.calculatePaymentAmount({
        baseAmount: validatedData.amount,
        currency: validatedData.currency,
        jobId: validatedData.jobId,
        clientId: req.user.userId,
        providerId: job.providerId,
        useYachiPoints: validatedData.useYachiPoints,
        pointsToUse: validatedData.pointsToUse,
        tipAmount: validatedData.tipAmount
      });

      // 🛡️ Validate client balance and payment method
      const paymentValidation = await YachiPayments.validatePayment(
        req.user.userId,
        paymentDetails.totalAmount,
        validatedData.paymentMethod
      );

      if (!paymentValidation.valid) {
        throw new Error(paymentValidation.reason);
      }

      // 🔐 Create escrow transaction
      const escrow = await Escrow.create({
        jobId: validatedData.jobId,
        clientId: req.user.userId,
        providerId: job.providerId,
        amount: paymentDetails.baseAmount,
        tipAmount: validatedData.tipAmount,
        currency: validatedData.currency,
        status: 'held',
        releaseConditions: {
          job_completion: true,
          client_approval: true,
          auto_release_days: 3
        },
        metadata: {
          paymentMethod: validatedData.paymentMethod,
          yachiPointsUsed: paymentDetails.pointsUsed,
          pointsDiscount: paymentDetails.pointsDiscount,
          commissionRate: paymentDetails.commissionRate
        }
      }, { transaction });

      // 💳 Process payment
      const paymentResult = await YachiPayments.processPayment({
        userId: req.user.userId,
        amount: paymentDetails.totalAmount,
        currency: validatedData.currency,
        method: validatedData.paymentMethod,
        description: `Payment for job: ${job.title}`,
        metadata: {
          jobId: validatedData.jobId,
          escrowId: escrow.id,
          clientId: req.user.userId,
          providerId: job.providerId
        }
      });

      if (!paymentResult.success) {
        throw new Error('PAYMENT_PROCESSING_FAILED');
      }

      // 📝 Create transaction record
      const transactionRecord = await Transaction.create({
        userId: req.user.userId,
        jobId: validatedData.jobId,
        escrowId: escrow.id,
        type: 'payment',
        amount: paymentDetails.totalAmount,
        currency: validatedData.currency,
        paymentMethod: validatedData.paymentMethod,
        status: 'completed',
        gatewayTransactionId: paymentResult.transactionId,
        metadata: {
          baseAmount: paymentDetails.baseAmount,
          tipAmount: validatedData.tipAmount,
          serviceFee: paymentDetails.serviceFee,
          commission: paymentDetails.commission,
          pointsUsed: paymentDetails.pointsUsed,
          pointsDiscount: paymentDetails.pointsDiscount,
          netAmount: paymentDetails.netAmount,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      }, { transaction });

      // 🏷️ Update job status
      await job.update({
        status: 'in_progress',
        paymentStatus: 'paid',
        paidAt: new Date()
      }, { transaction });

      // 🎪 Award payment points
      await YachiGamification.awardPaymentPoints(req.user.userId, paymentDetails.totalAmount);

      // 💾 Save payment method if requested
      if (validatedData.savePaymentMethod) {
        await YachiPayments.savePaymentMethod(req.user.userId, {
          method: validatedData.paymentMethod,
          lastFour: paymentResult.lastFour,
          expiry: paymentResult.expiry,
          isDefault: false
        });
      }

      await transaction.commit();

      // 📧 Send notifications
      await YachiNotifications.sendPaymentConfirmation(req.user.userId, transactionRecord);
      await YachiNotifications.sendEscrowCreatedNotification(job.providerId, escrow);

      // 🗑️ Clear relevant caches
      await clearPaymentCaches(req.user.userId, job.providerId);

      res.json({
        success: true,
        message: 'Payment processed successfully and held in escrow',
        data: {
          transaction: transactionRecord,
          escrow: escrow,
          payment: {
            amount: paymentDetails.totalAmount,
            currency: validatedData.currency,
            method: validatedData.paymentMethod,
            gatewayTransactionId: paymentResult.transactionId
          },
          nextSteps: ['awaiting_job_completion', 'escrow_release']
        },
        gamification: {
          pointsEarned: Math.floor(paymentDetails.totalAmount / 100), // 1 point per 100 currency
          achievementProgress: await YachiGamification.getPaymentAchievementProgress(req.user.userId)
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

    console.error('Job Payment Error:', error);

    const errorMap = {
      'JOB_NOT_FOUND': { message: 'Job not found', status: 404 },
      'JOB_NOT_READY_FOR_PAYMENT': { message: 'Job is not ready for payment', status: 400 },
      'PAYMENT_PROCESSING_FAILED': { message: 'Payment processing failed', status: 402 },
      'INSUFFICIENT_FUNDS': { message: 'Insufficient funds', status: 402 },
      'PAYMENT_METHOD_DECLINED': { message: 'Payment method declined', status: 402 }
    };

    const errorConfig = errorMap[error.message] || {
      message: 'Payment processing failed',
      status: 500
    };

    res.status(errorConfig.status).json({
      success: false,
      message: errorConfig.message,
      code: error.message
    });
  }
});

// 🚀 GET TRANSACTIONS WITH ADVANCED FILTERING
router.get('/transactions', auth, async (req, res) => {
  try {
    const validatedParams = PaymentSchema.transactions.parse(req.query);

    const cacheKey = CACHE_KEYS.USER_TRANSACTIONS(req.user.userId, validatedParams);
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

    if (validatedParams.type !== 'all') {
      where.type = validatedParams.type;
    }

    if (validatedParams.status !== 'all') {
      where.status = validatedParams.status;
    }

    if (validatedParams.dateFrom || validatedParams.dateTo) {
      where.createdAt = {};
      if (validatedParams.dateFrom) where.createdAt[Op.gte] = new Date(validatedParams.dateFrom);
      if (validatedParams.dateTo) where.createdAt[Op.lte] = new Date(validatedParams.dateTo);
    }

    const [transactions, total] = await Promise.all([
      Transaction.findAll({
        where,
        include: [
          {
            model: Job,
            as: 'job',
            attributes: ['id', 'title', 'description', 'status']
          },
          {
            model: Escrow,
            as: 'escrow',
            attributes: ['id', 'status', 'releasedAt']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: validatedParams.limit,
        offset: (validatedParams.page - 1) * validatedParams.limit
      }),
      Transaction.count({ where })
    ]);

    const result = {
      transactions,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        pages: Math.ceil(total / validatedParams.limit)
      },
      summary: await getTransactionsSummary(req.user.userId, validatedParams)
    };

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Fetch Transactions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      code: 'FETCH_TRANSACTIONS_FAILED'
    });
  }
});

// 🚀 REQUEST PAYOUT
router.post('/payout', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can request payouts',
        code: 'PROVIDERS_ONLY'
      });
    }

    const validatedData = PaymentSchema.payoutRequest.parse(req.body);

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 💰 Check available balance
      const availableBalance = await calculateAvailableBalance(req.user.userId);
      
      if (availableBalance < validatedData.amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // 🛡️ Validate payout method
      const payoutValidation = await PayoutService.validatePayoutMethod(
        req.user.userId,
        validatedData.method,
        validatedData.accountDetails
      );

      if (!payoutValidation.valid) {
        throw new Error(payoutValidation.reason);
      }

      // 💸 Create payout request
      const payout = await Payout.create({
        userId: req.user.userId,
        amount: validatedData.amount,
        currency: validatedData.currency,
        method: validatedData.method,
        accountDetails: validatedData.accountDetails,
        status: 'pending',
        fees: await PayoutService.calculatePayoutFees(validatedData.amount, validatedData.method),
        metadata: {
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
      PayoutService.processPayout(payout.id).catch(console.error);

      // 🗑️ Clear caches
      await clearPaymentCaches(req.user.userId);

      res.json({
        success: true,
        message: 'Payout request submitted successfully',
        data: {
          payout,
          estimatedArrival: await PayoutService.getEstimatedArrival(validatedData.method),
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

    const errorMap = {
      'INSUFFICIENT_BALANCE': { message: 'Insufficient balance for payout', status: 400 },
      'INVALID_PAYOUT_METHOD': { message: 'Invalid payout method', status: 400 },
      'DAILY_LIMIT_EXCEEDED': { message: 'Daily payout limit exceeded', status: 429 }
    };

    const errorConfig = errorMap[error.message] || {
      message: 'Payout request failed',
      status: 500
    };

    res.status(errorConfig.status).json({
      success: false,
      message: errorConfig.message,
      code: error.message
    });
  }
});

// 🚀 GET ESCROW BALANCE
router.get('/escrow-balance', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can view escrow balance',
        code: 'PROVIDERS_ONLY'
      });
    }

    const cacheKey = CACHE_KEYS.ESCROW_BALANCE(req.user.userId);
    const cachedBalance = await redis.get(cacheKey);

    if (cachedBalance) {
      return res.json({
        success: true,
        data: JSON.parse(cachedBalance),
        source: 'cache'
      });
    }

    const escrowBalance = await EscrowService.getProviderEscrowBalance(req.user.userId);

    // 💾 Cache for 1 minute
    await redis.setex(cacheKey, 60, JSON.stringify(escrowBalance));

    res.json({
      success: true,
      data: escrowBalance,
      source: 'database'
    });

  } catch (error) {
    console.error('Fetch Escrow Balance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escrow balance',
      code: 'FETCH_ESCROW_BALANCE_FAILED'
    });
  }
});

// 🚀 RELEASE ESCROW PAYMENT
router.post('/escrow/:escrowId/release', auth, async (req, res) => {
  try {
    const escrowId = parseInt(req.params.escrowId);

    const escrow = await Escrow.findByPk(escrowId, {
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'title', 'status', 'clientId', 'providerId']
      }]
    });

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found',
        code: 'ESCROW_NOT_FOUND'
      });
    }

    // 🛡️ Authorization check
    if (escrow.job.clientId !== req.user.userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only job client can release escrow',
        code: 'RELEASE_UNAUTHORIZED'
      });
    }

    if (escrow.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: 'Escrow is not in held status',
        code: 'INVALID_ESCROW_STATUS'
      });
    }

    // 💰 Release escrow
    const releaseResult = await EscrowService.releaseEscrow(escrowId, req.user.userId);

    if (!releaseResult.success) {
      throw new Error('ESCROW_RELEASE_FAILED');
    }

    // 🗑️ Clear caches
    await clearPaymentCaches(escrow.job.clientId, escrow.job.providerId);

    res.json({
      success: true,
      message: 'Escrow released successfully',
      data: {
        escrow: releaseResult.escrow,
        transactions: releaseResult.transactions,
        releasedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Release Escrow Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release escrow',
      code: 'RELEASE_ESCROW_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 💰 Build Earnings Dashboard
async function buildEarningsDashboard(userId, timeframe, currency) {
  const dateFilter = getTimeframeFilter(timeframe);
  const exchangeRate = await getExchangeRate('ETB', currency);

  const [
    earningsStats,
    transactionStats,
    escrowStats,
    payoutStats
  ] = await Promise.all([
    // 💵 Earnings Statistics
    Transaction.findAll({
      where: {
        userId,
        type: 'payment',
        status: 'completed',
        createdAt: dateFilter
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalEarnings'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalTransactions'],
        [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageEarning']
      ],
      raw: true
    }),

    // 📊 Transaction Statistics
    Transaction.findAll({
      where: {
        userId,
        createdAt: dateFilter
      },
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
      ],
      group: ['type'],
      raw: true
    }),

    // 🔐 Escrow Statistics
    Escrow.findAll({
      where: {
        providerId: userId,
        createdAt: dateFilter
      },
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
      ],
      group: ['status'],
      raw: true
    }),

    // 💸 Payout Statistics
    Payout.findAll({
      where: {
        userId,
        createdAt: dateFilter
      },
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
      ],
      group: ['status'],
      raw: true
    })
  ]);

  const totalEarnings = parseFloat(earningsStats[0]?.totalEarnings) || 0;
  const commission = totalEarnings * 0.05; // 5% platform commission
  const netEarnings = totalEarnings - commission;

  return {
    overview: {
      totalEarnings: convertCurrency(totalEarnings, exchangeRate),
      netEarnings: convertCurrency(netEarnings, exchangeRate),
      totalTransactions: parseInt(earningsStats[0]?.totalTransactions) || 0,
      averageEarning: convertCurrency(parseFloat(earningsStats[0]?.averageEarning) || 0, exchangeRate),
      availableBalance: convertCurrency(await calculateAvailableBalance(userId), exchangeRate),
      currency
    },
    breakdown: {
      byType: transactionStats.reduce((acc, stat) => {
        acc[stat.type] = {
          count: parseInt(stat.count),
          amount: convertCurrency(parseFloat(stat.amount) || 0, exchangeRate)
        };
        return acc;
      }, {}),
      byStatus: {
        escrow: escrowStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: parseInt(stat.count),
            amount: convertCurrency(parseFloat(stat.amount) || 0, exchangeRate)
          };
          return acc;
        }, {}),
        payouts: payoutStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: parseInt(stat.count),
            amount: convertCurrency(parseFloat(stat.amount) || 0, exchangeRate)
          };
          return acc;
        }, {})
      }
    },
    trends: {
      dailyEarnings: await getDailyEarningsTrend(userId, timeframe, exchangeRate),
      topJobs: await getTopPayingJobs(userId, timeframe, exchangeRate)
    },
    commissions: {
      total: convertCurrency(commission, exchangeRate),
      rate: '5%',
      breakdown: await getCommissionBreakdown(userId, timeframe, exchangeRate)
    }
  };
}

// 💰 Calculate Available Balance
async function calculateAvailableBalance(userId) {
  const completedEarnings = await Transaction.sum('amount', {
    where: {
      userId,
      type: 'payment',
      status: 'completed'
    }
  });

  const pendingPayouts = await Payout.sum('amount', {
    where: {
      userId,
      status: 'pending'
    }
  });

  const completedPayouts = await Payout.sum('amount', {
    where: {
      userId,
      status: 'completed'
    }
  });

  return (completedEarnings || 0) - (pendingPayouts || 0) - (completedPayouts || 0);
}

// 📊 Get Transactions Summary
async function getTransactionsSummary(userId, params) {
  const where = { userId };

  if (params.type !== 'all') where.type = params.type;
  if (params.status !== 'all') where.status = params.status;

  const summary = await Transaction.findAll({
    where,
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCount'],
      [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
      [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageAmount']
    ],
    raw: true
  });

  return {
    totalCount: parseInt(summary[0]?.totalCount) || 0,
    totalAmount: parseFloat(summary[0]?.totalAmount) || 0,
    averageAmount: parseFloat(summary[0]?.averageAmount) || 0
  };
}

// ⏰ Get Timeframe Filter
function getTimeframeFilter(timeframe) {
  const now = new Date();
  let startDate;

  switch (timeframe) {
    case '7d':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case '30d':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case '90d':
      startDate = new Date(now.setDate(now.getDate() - 90));
      break;
    case '1y':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(0);
  }

  return { [Op.gte]: startDate };
}

// 💱 Get Exchange Rate
async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;

  const rate = await CurrencyRate.findOne({
    where: {
      fromCurrency,
      toCurrency
    },
    order: [['createdAt', 'DESC']]
  });

  return rate?.rate || 1;
}

// 💵 Convert Currency
function convertCurrency(amount, exchangeRate) {
  return parseFloat((amount * exchangeRate).toFixed(2));
}

// 🗑️ Clear Payment Caches
async function clearPaymentCaches(userId1, userId2 = null) {
  const patterns = [
    CACHE_KEYS.USER_EARNINGS(userId1) + '*',
    CACHE_KEYS.USER_TRANSACTIONS(userId1) + '*',
    CACHE_KEYS.ESCROW_BALANCE(userId1),
    ...(userId2 ? [
      CACHE_KEYS.USER_EARNINGS(userId2) + '*',
      CACHE_KEYS.ESCROW_BALANCE(userId2)
    ] : [])
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// 📈 Get Daily Earnings Trend
async function getDailyEarningsTrend(userId, timeframe, exchangeRate) {
  const dateFilter = getTimeframeFilter(timeframe);

  const dailyEarnings = await Transaction.findAll({
    where: {
      userId,
      type: 'payment',
      status: 'completed',
      createdAt: dateFilter
    },
    attributes: [
      [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
      [Sequelize.fn('SUM', Sequelize.col('amount')), 'dailyEarnings']
    ],
    group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
    order: [[Sequelize.col('date'), 'ASC']],
    raw: true
  });

  return dailyEarnings.map(day => ({
    date: day.date,
    earnings: convertCurrency(parseFloat(day.dailyEarnings) || 0, exchangeRate)
  }));
}

// 🏆 Get Top Paying Jobs
async function getTopPayingJobs(userId, timeframe, exchangeRate) {
  const dateFilter = getTimeframeFilter(timeframe);

  const topJobs = await Transaction.findAll({
    where: {
      userId,
      type: 'payment',
      status: 'completed',
      createdAt: dateFilter
    },
    include: [{
      model: Job,
      as: 'job',
      attributes: ['id', 'title']
    }],
    attributes: [
      'jobId',
      [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalEarned']
    ],
    group: ['jobId'],
    order: [[Sequelize.literal('totalEarned'), 'DESC']],
    limit: 5,
    raw: true
  });

  return topJobs.map(job => ({
    jobId: job.jobId,
    title: job['job.title'],
    totalEarned: convertCurrency(parseFloat(job.totalEarned) || 0, exchangeRate)
  }));
}

// 💼 Get Commission Breakdown
async function getCommissionBreakdown(userId, timeframe, exchangeRate) {
  const dateFilter = getTimeframeFilter(timeframe);

  const commissions = await Commission.findAll({
    where: {
      userId,
      createdAt: dateFilter
    },
    attributes: [
      [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalCommission'],
      [Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRate']
    ],
    raw: true
  });

  return {
    total: convertCurrency(parseFloat(commissions[0]?.totalCommission) || 0, exchangeRate),
    averageRate: parseFloat(commissions[0]?.averageRate) || 0,
    transactionsCount: await Commission.count({
      where: {
        userId,
        createdAt: dateFilter
      }
    })
  };
}

module.exports = router;