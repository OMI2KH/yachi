const express = require('express');
const { User, Job, Rating, Booking, Transaction, UserProfile, SecurityLog } = require('../models');
const { Sequelize, Op } = require('sequelize');
const auth = require('../middleware/auth');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiSecurity } = require('../services/yachiSecurity');
const { RecommendationEngine } = require('../services/recommendationEngine');
const redis = require('../config/redis');
const { z } = require('zod');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const ClientProfileSchema = {
  get: z.object({
    include: z.array(z.enum([
      'jobs', 
      'ratings', 
      'bookings', 
      'transactions', 
      'analytics', 
      'gamification',
      'recommendations',
      'security',
      'preferences'
    ])).default(['jobs', 'ratings']),
    timeframe: z.enum(['7d', '30d', '90d', '1y', 'all']).default('all')
  }),

  update: z.object({
    profile: z.object({
      displayName: z.string().min(2).max(50).optional(),
      bio: z.string().max(500).optional(),
      location: z.object({
        address: z.string().optional(),
        coordinates: z.object({
          latitude: z.number(),
          longitude: z.number()
        }).optional(),
        timezone: z.string().optional()
      }).optional(),
      preferences: z.object({
        notifications: z.object({
          email: z.boolean().default(true),
          push: z.boolean().default(true),
          sms: z.boolean().default(false)
        }).optional(),
        communication: z.object({
          preferredMethod: z.enum(['chat', 'phone', 'video']).default('chat'),
          language: z.string().default('en'),
          workingHours: z.object({
            start: z.string(),
            end: z.string(),
            timezone: z.string()
          }).optional()
        }).optional(),
        privacy: z.object({
          profileVisibility: z.enum(['public', 'providers', 'connections', 'private']).default('public'),
          showOnlineStatus: z.boolean().default(true),
          allowMessages: z.enum(['everyone', 'providers', 'connections', 'none']).default('everyone')
        }).optional()
      }).optional()
    }).optional(),

    verification: z.object({
      documentType: z.enum(['id_card', 'passport', 'driving_license']).optional(),
      documentNumber: z.string().optional(),
      documentImages: z.array(z.string().url()).optional()
    }).optional()
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  CLIENT_PROFILE: (clientId, include) => `client:profile:${clientId}:${include.sort().join('_')}`,
  CLIENT_ANALYTICS: (clientId, timeframe) => `client:analytics:${clientId}:${timeframe}`,
  CLIENT_TRUST_SCORE: (clientId) => `client:trust:${clientId}`,
  CLIENT_RECOMMENDATIONS: (clientId) => `client:recommendations:${clientId}`
};

// 🚀 GET COMPREHENSIVE CLIENT PROFILE
router.get('/:id', auth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const validatedParams = ClientProfileSchema.get.parse(req.query);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID',
        code: 'INVALID_CLIENT_ID'
      });
    }

    // 🛡️ Check if user can view this profile
    const canView = await canUserViewClientProfile(req.user.id, clientId);
    if (!canView.allowed) {
      return res.status(403).json({
        success: false,
        message: canView.reason,
        code: 'PROFILE_ACCESS_DENIED'
      });
    }

    // 🎯 Generate cache key
    const cacheKey = CACHE_KEYS.CLIENT_PROFILE(clientId, validatedParams.include);
    const cachedProfile = await redis.get(cacheKey);

    if (cachedProfile) {
      return res.json({
        success: true,
        ...JSON.parse(cachedProfile),
        source: 'cache'
      });
    }

    // 🎯 Build comprehensive profile
    const profile = await buildClientProfile(clientId, validatedParams);

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(profile));

    res.json({
      success: true,
      ...profile,
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

    console.error('Fetch Client Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client profile',
      code: 'FETCH_PROFILE_FAILED'
    });
  }
});

// 🚀 UPDATE CLIENT PROFILE
router.put('/:id/profile', auth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const validatedData = ClientProfileSchema.update.parse(req.body);

    if (clientId !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Can only update your own profile',
        code: 'UPDATE_UNAUTHORIZED'
      });
    }

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 📝 Update user profile
      if (validatedData.profile) {
        await UserProfile.update(validatedData.profile, {
          where: { userId: clientId },
          transaction
        });
      }

      // 🏷️ Handle verification submission
      if (validatedData.verification) {
        await handleVerificationSubmission(clientId, validatedData.verification, transaction);
      }

      await transaction.commit();

      // 🗑️ Clear profile cache
      await redis.del(CACHE_KEYS.CLIENT_PROFILE(clientId, '*'));

      // 🎪 Award profile completion points
      await YachiGamification.awardProfileCompletion(clientId);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: await buildClientProfile(clientId, { include: ['preferences'] })
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

    console.error('Update Client Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      code: 'UPDATE_PROFILE_FAILED'
    });
  }
});

// 🎯 GET CLIENT ANALYTICS DASHBOARD
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const { timeframe = '30d' } = req.query;

    if (clientId !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Can only view your own analytics',
        code: 'ANALYTICS_ACCESS_DENIED'
      });
    }

    const cacheKey = CACHE_KEYS.CLIENT_ANALYTICS(clientId, timeframe);
    const cachedAnalytics = await redis.get(cacheKey);

    if (cachedAnalytics) {
      return res.json({
        success: true,
        ...JSON.parse(cachedAnalytics),
        source: 'cache'
      });
    }

    const analytics = await buildClientAnalytics(clientId, timeframe);

    // 💾 Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(analytics));

    res.json({
      success: true,
      ...analytics,
      source: 'database'
    });

  } catch (error) {
    console.error('Fetch Client Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      code: 'FETCH_ANALYTICS_FAILED'
    });
  }
});

// 🎯 GET CLIENT TRUST SCORE
router.get('/:id/trust-score', auth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    const cacheKey = CACHE_KEYS.CLIENT_TRUST_SCORE(clientId);
    const cachedScore = await redis.get(cacheKey);

    if (cachedScore) {
      return res.json({
        success: true,
        data: JSON.parse(cachedScore),
        source: 'cache'
      });
    }

    const trustScore = await calculateClientTrustScore(clientId);

    // 💾 Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(trustScore));

    res.json({
      success: true,
      data: trustScore,
      source: 'database'
    });

  } catch (error) {
    console.error('Calculate Trust Score Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate trust score',
      code: 'TRUST_SCORE_CALCULATION_FAILED'
    });
  }
});

// 🎯 GET CLIENT RECOMMENDATIONS
router.get('/:id/recommendations', auth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const { type = 'providers', limit = 10 } = req.query;

    if (clientId !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Can only view your own recommendations',
        code: 'RECOMMENDATIONS_ACCESS_DENIED'
      });
    }

    const cacheKey = CACHE_KEYS.CLIENT_RECOMMENDATIONS(clientId) + `:${type}:${limit}`;
    const cachedRecommendations = await redis.get(cacheKey);

    if (cachedRecommendations) {
      return res.json({
        success: true,
        ...JSON.parse(cachedRecommendations),
        source: 'cache'
      });
    }

    const recommendations = await RecommendationEngine.getClientRecommendations(
      clientId, 
      type, 
      parseInt(limit)
    );

    // 💾 Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(recommendations));

    res.json({
      success: true,
      ...recommendations,
      source: 'database'
    });

  } catch (error) {
    console.error('Fetch Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      code: 'FETCH_RECOMMENDATIONS_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 🎯 Build Comprehensive Client Profile
async function buildClientProfile(clientId, params) {
  const baseInclude = {
    model: User,
    as: 'user',
    attributes: ['id', 'name', 'email', 'verifiedBadge', 'premiumListing', 'createdAt'],
    include: []
  };

  // 🎯 Dynamic includes based on request
  const includes = [];

  if (params.include.includes('jobs')) {
    includes.push({
      model: Job,
      as: 'jobs',
      attributes: [
        'id', 'title', 'description', 'status', 'budget', 'urgency',
        'createdAt', 'updatedAt', 'completedAt'
      ],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
  }

  if (params.include.includes('ratings')) {
    includes.push({
      model: Rating,
      as: 'ratings',
      attributes: ['id', 'rating', 'comment', 'createdAt', 'reviewerId'],
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['id', 'name', 'avatar']
      }],
      limit: 20,
      order: [['createdAt', 'DESC']]
    });
  }

  if (params.include.includes('bookings')) {
    includes.push({
      model: Booking,
      as: 'bookings',
      attributes: [
        'id', 'serviceId', 'status', 'scheduledStart', 'scheduledEnd',
        'totalAmount', 'createdAt', 'completedAt'
      ],
      include: [{
        model: User,
        as: 'provider',
        attributes: ['id', 'name', 'avatar', 'verifiedBadge']
      }],
      limit: 15,
      order: [['createdAt', 'DESC']]
    });
  }

  if (params.include.includes('transactions')) {
    includes.push({
      model: Transaction,
      as: 'transactions',
      attributes: [
        'id', 'amount', 'currency', 'type', 'status',
        'createdAt', 'completedAt'
      ],
      limit: 20,
      order: [['createdAt', 'DESC']]
    });
  }

  // 🎯 Get client with selected includes
  const client = await User.findByPk(clientId, {
    attributes: [
      'id', 'name', 'email', 'verifiedBadge', 'premiumListing',
      'createdAt', 'lastLogin', 'onlineStatus'
    ],
    include: [
      {
        model: UserProfile,
        as: 'profile',
        attributes: [
          'displayName', 'avatar', 'bio', 'location',
          'preferences', 'socialLinks', 'languages'
        ]
      },
      ...includes
    ]
  });

  if (!client) {
    throw new Error('CLIENT_NOT_FOUND');
  }

  const profile = client.toJSON();

  // 🎯 Add computed fields
  profile.stats = await calculateClientStats(clientId, params.timeframe);

  // 🎪 Add gamification data
  if (params.include.includes('gamification')) {
    profile.gamification = await YachiGamification.getUserGamificationProfile(clientId);
  }

  // 📊 Add analytics
  if (params.include.includes('analytics')) {
    profile.analytics = await buildClientAnalytics(clientId, params.timeframe);
  }

  // 🛡️ Add security info
  if (params.include.includes('security') && (req.user.id === clientId || req.user.roles.includes('admin'))) {
    profile.security = await buildClientSecurityInfo(clientId);
  }

  // 🎯 Add recommendations
  if (params.include.includes('recommendations')) {
    profile.recommendations = await RecommendationEngine.getClientRecommendations(clientId, 'providers', 5);
  }

  return {
    data: profile,
    metadata: {
      includes: params.include,
      timeframe: params.timeframe,
      lastUpdated: new Date().toISOString()
    }
  };
}

// 📊 Build Client Analytics
async function buildClientAnalytics(clientId, timeframe) {
  const dateFilter = getTimeframeFilter(timeframe);

  const [
    bookingStats,
    spendingStats,
    ratingStats,
    activityStats
  ] = await Promise.all([
    // 📅 Booking Statistics
    Booking.findAll({
      where: {
        customerId: clientId,
        createdAt: dateFilter
      },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalBookings'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'totalSpent'],
        [Sequelize.fn('AVG', Sequelize.col('totalAmount')), 'averageSpend'],
        [Sequelize.literal(`COUNT(CASE WHEN status = 'completed' THEN 1 END)`), 'completedBookings'],
        [Sequelize.literal(`COUNT(CASE WHEN status = 'cancelled' THEN 1 END)`), 'cancelledBookings']
      ],
      raw: true
    }),

    // 💰 Spending Trends
    Transaction.findAll({
      where: {
        userId: clientId,
        type: 'payment',
        createdAt: dateFilter
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'dailySpent']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
      order: [[Sequelize.col('date'), 'ASC']],
      raw: true
    }),

    // ⭐ Rating Statistics
    Rating.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        where: { customerId: clientId },
        attributes: []
      }],
      where: {
        createdAt: dateFilter
      },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRatings']
      ],
      raw: true
    }),

    // 📈 Activity Metrics
    Booking.findAll({
      where: {
        customerId: clientId,
        createdAt: dateFilter
      },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'bookingCount'],
        [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastBooking']
      ],
      raw: true
    })
  ]);

  return {
    overview: {
      totalBookings: parseInt(bookingStats[0]?.totalBookings) || 0,
      totalSpent: parseFloat(bookingStats[0]?.totalSpent) || 0,
      averageSpend: parseFloat(bookingStats[0]?.averageSpend) || 0,
      completionRate: bookingStats[0]?.totalBookings ? 
        (parseInt(bookingStats[0]?.completedBookings) / parseInt(bookingStats[0]?.totalBookings) * 100) : 0
    },
    spending: {
      trends: spendingStats,
      categories: await getSpendingByCategory(clientId, timeframe)
    },
    ratings: {
      average: parseFloat(ratingStats[0]?.averageRating) || 0,
      total: parseInt(ratingStats[0]?.totalRatings) || 0,
      distribution: await getRatingDistribution(clientId, timeframe)
    },
    activity: {
      bookingFrequency: await calculateBookingFrequency(clientId, timeframe),
      preferredCategories: await getPreferredCategories(clientId, timeframe),
      providerEngagement: await getProviderEngagementMetrics(clientId, timeframe)
    }
  };
}

// 🛡️ Build Client Security Info
async function buildClientSecurityInfo(clientId) {
  const securityLogs = await SecurityLog.findAll({
    where: { userId: clientId },
    attributes: ['action', 'ipAddress', 'userAgent', 'createdAt'],
    limit: 10,
    order: [['createdAt', 'DESC']]
  });

  const devices = await SecurityLog.findAll({
    where: { userId: clientId, action: 'login' },
    attributes: ['userAgent', 'ipAddress', 'createdAt'],
    group: ['userAgent', 'ipAddress'],
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  return {
    recentActivity: securityLogs,
    devices: devices,
    trustScore: await calculateClientTrustScore(clientId),
    alerts: await YachiSecurity.getClientSecurityAlerts(clientId)
  };
}

// 🎯 Calculate Client Trust Score
async function calculateClientTrustScore(clientId) {
  const [
    verificationScore,
    bookingScore,
    ratingScore,
    tenureScore,
    paymentScore
  ] = await Promise.all([
    calculateVerificationScore(clientId),
    calculateBookingBehaviorScore(clientId),
    calculateRatingScore(clientId),
    calculateTenureScore(clientId),
    calculatePaymentReliabilityScore(clientId)
  ]);

  const weights = {
    verification: 0.25,
    booking: 0.30,
    rating: 0.20,
    tenure: 0.15,
    payment: 0.10
  };

  const totalScore = 
    (verificationScore * weights.verification) +
    (bookingScore * weights.booking) +
    (ratingScore * weights.rating) +
    (tenureScore * weights.tenure) +
    (paymentScore * weights.payment);

  return {
    score: Math.round(totalScore * 100),
    breakdown: {
      verification: Math.round(verificationScore * 100),
      booking: Math.round(bookingScore * 100),
      rating: Math.round(ratingScore * 100),
      tenure: Math.round(tenureScore * 100),
      payment: Math.round(paymentScore * 100)
    },
    level: getTrustLevel(totalScore),
    recommendations: await getTrustScoreRecommendations(clientId, totalScore)
  };
}

// 🎯 Calculate Client Stats
async function calculateClientStats(clientId, timeframe) {
  const dateFilter = getTimeframeFilter(timeframe);

  const stats = await Booking.findAll({
    where: {
      customerId: clientId,
      createdAt: dateFilter
    },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalJobs'],
      [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'totalSpent'],
      [Sequelize.literal(`COUNT(CASE WHEN status = 'completed' THEN 1 END)`), 'completedJobs'],
      [Sequelize.literal(`COUNT(CASE WHEN status = 'cancelled' THEN 1 END)`), 'cancelledJobs']
    ],
    raw: true
  });

  const ratingStats = await Rating.findAll({
    include: [{
      model: Booking,
      as: 'booking',
      where: { customerId: clientId },
      attributes: []
    }],
    where: { createdAt: dateFilter },
    attributes: [
      [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRatings']
    ],
    raw: true
  });

  return {
    totalJobs: parseInt(stats[0]?.totalJobs) || 0,
    totalSpent: parseFloat(stats[0]?.totalSpent) || 0,
    completedJobs: parseInt(stats[0]?.completedJobs) || 0,
    cancelledJobs: parseInt(stats[0]?.cancelledJobs) || 0,
    completionRate: stats[0]?.totalJobs ? 
      (parseInt(stats[0]?.completedJobs) / parseInt(stats[0]?.totalJobs) * 100) : 0,
    averageRating: parseFloat(ratingStats[0]?.averageRating) || 0,
    totalRatings: parseInt(ratingStats[0]?.totalRatings) || 0
  };
}

// 🛡️ Check Profile View Permissions
async function canUserViewClientProfile(viewerId, clientId) {
  if (viewerId === clientId) {
    return { allowed: true, reason: 'Own profile' };
  }

  if (await User.isAdmin(viewerId)) {
    return { allowed: true, reason: 'Admin access' };
  }

  const clientProfile = await UserProfile.findOne({
    where: { userId: clientId },
    attributes: ['preferences']
  });

  const privacySettings = clientProfile?.preferences?.privacy;

  if (!privacySettings) {
    return { allowed: true, reason: 'Default public access' };
  }

  switch (privacySettings.profileVisibility) {
    case 'public':
      return { allowed: true, reason: 'Public profile' };
    case 'providers':
      const isProvider = await User.isProvider(viewerId);
      return { 
        allowed: isProvider, 
        reason: isProvider ? 'Provider access' : 'Profile restricted to providers only' 
      };
    case 'connections':
      const isConnected = await checkUserConnection(viewerId, clientId);
      return { 
        allowed: isConnected, 
        reason: isConnected ? 'Connected user' : 'Profile restricted to connections only' 
      };
    case 'private':
      return { allowed: false, reason: 'Profile is private' };
    default:
      return { allowed: true, reason: 'Default public access' };
  }
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
      startDate = new Date(0); // All time
  }

  return { [Op.gte]: startDate };
}

// 🏷️ Handle Verification Submission
async function handleVerificationSubmission(clientId, verificationData, transaction) {
  await VerificationRequest.create({
    userId: clientId,
    documentType: verificationData.documentType,
    documentNumber: verificationData.documentNumber,
    documentImages: verificationData.documentImages,
    status: 'pending',
    submittedAt: new Date()
  }, { transaction });

  // 📧 Send verification submission notification
  await YachiNotifications.sendVerificationSubmittedNotification(clientId);
}

// 🔢 Trust Score Calculation Helpers
async function calculateVerificationScore(clientId) {
  const user = await User.findByPk(clientId, {
    attributes: ['verifiedBadge', 'emailVerified']
  });

  let score = 0;
  if (user.emailVerified) score += 0.3;
  if (user.verifiedBadge) score += 0.7;

  return score;
}

async function calculateBookingBehaviorScore(clientId) {
  const bookingStats = await Booking.findAll({
    where: { customerId: clientId },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalBookings'],
      [Sequelize.literal(`COUNT(CASE WHEN status = 'completed' THEN 1 END)`), 'completedBookings'],
      [Sequelize.literal(`COUNT(CASE WHEN status = 'cancelled' THEN 1 END)`), 'cancelledBookings']
    ],
    raw: true
  });

  const total = parseInt(bookingStats[0]?.totalBookings) || 0;
  const completed = parseInt(bookingStats[0]?.completedBookings) || 0;
  const cancelled = parseInt(bookingStats[0]?.cancelledBookings) || 0;

  if (total === 0) return 0.5; // Neutral for new users

  const completionRate = completed / total;
  const cancellationRate = cancelled / total;

  return Math.max(0, completionRate - (cancellationRate * 0.5));
}

async function calculateRatingScore(clientId) {
  const ratingStats = await Rating.findAll({
    include: [{
      model: Booking,
      as: 'booking',
      where: { customerId: clientId },
      attributes: []
    }],
    attributes: [
      [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating']
    ],
    raw: true
  });

  const avgRating = parseFloat(ratingStats[0]?.averageRating) || 0;
  return avgRating / 5; // Normalize to 0-1
}

async function calculateTenureScore(clientId) {
  const user = await User.findByPk(clientId, {
    attributes: ['createdAt']
  });

  const tenureDays = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24);
  return Math.min(tenureDays / 365, 1); // Cap at 1 year
}

async function calculatePaymentReliabilityScore(clientId) {
  const paymentStats = await Transaction.findAll({
    where: { 
      userId: clientId,
      type: 'payment'
    },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalPayments'],
      [Sequelize.literal(`COUNT(CASE WHEN status = 'completed' THEN 1 END)`), 'successfulPayments']
    ],
    raw: true
  });

  const total = parseInt(paymentStats[0]?.totalPayments) || 0;
  const successful = parseInt(paymentStats[0]?.successfulPayments) || 0;

  return total > 0 ? successful / total : 1;
}

// 🎯 Get Trust Level
function getTrustLevel(score) {
  if (score >= 0.9) return 'excellent';
  if (score >= 0.8) return 'very_good';
  if (score >= 0.7) return 'good';
  if (score >= 0.6) return 'fair';
  return 'needs_improvement';
}

// 🎯 Get Trust Score Recommendations
async function getTrustScoreRecommendations(clientId, score) {
  const recommendations = [];

  if (score < 0.7) {
    recommendations.push('Complete profile verification');
  }

  if (score < 0.8) {
    const bookingStats = await Booking.findAll({
      where: { customerId: clientId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalBookings']
      ],
      raw: true
    });

    if (parseInt(bookingStats[0]?.totalBookings) < 3) {
      recommendations.push('Complete more bookings to establish reliability');
    }
  }

  return recommendations;
}

module.exports = router;
