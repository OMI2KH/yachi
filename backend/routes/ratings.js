const express = require('express');
const { Rating, User, Job, Service, ReviewPhoto, ReviewReaction, Report } = require('../models');
const { Sequelize, Op } = require('sequelize');
const auth = require('../middleware/auth');
const { z } = require('zod');
const { YachiAI } = require('../services/yachiAI');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiSecurity } = require('../services/yachiSecurity');
const { YachiNotifications } = require('../services/yachiNotifications');
const { MediaService } = require('../services/mediaService');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const RatingSchema = {
  create: z.object({
    userId: z.number().int().positive(),
    jobId: z.number().int().positive().optional(),
    serviceId: z.number().int().positive().optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(10).max(2000).optional(),
    categories: z.array(z.enum([
      'quality', 'timeliness', 'communication', 'professionalism', 
      'value', 'cleanliness', 'skill', 'friendliness'
    ])).optional(),
    anonymous: z.boolean().default(false),
    wouldRecommend: z.boolean().default(true),
    metadata: z.object({
      workQuality: z.number().min(1).max(5).optional(),
      communication: z.number().min(1).max(5).optional(),
      punctuality: z.number().min(1).max(5).optional(),
      valueForMoney: z.number().min(1).max(5).optional()
    }).optional()
  }),

  update: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().min(10).max(2000).optional(),
    categories: z.array(z.string()).optional(),
    anonymous: z.boolean().optional()
  }),

  reaction: z.object({
    reaction: z.enum(['like', 'helpful', 'love', 'insightful', 'disagree']),
    reviewId: z.number().int().positive()
  }),

  report: z.object({
    reviewId: z.number().int().positive(),
    reason: z.enum(['spam', 'inappropriate', 'false_information', 'harassment', 'other']),
    description: z.string().max(500).optional()
  }),

  query: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
    minRating: z.number().min(1).max(5).optional(),
    maxRating: z.number().min(1).max(5).optional(),
    categories: z.array(z.string()).optional(),
    sortBy: z.enum(['newest', 'highest', 'lowest', 'most_helpful']).default('newest'),
    withPhotos: z.boolean().default(false),
    verifiedOnly: z.boolean().default(false)
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  USER_RATINGS: (userId) => `ratings:user:${userId}`,
  RATING_DETAILS: (ratingId) => `rating:details:${ratingId}`,
  USER_RATING_SUMMARY: (userId) => `ratings:summary:${userId}`,
  RECENT_RATINGS: (limit) => `ratings:recent:${limit}`,
  RATING_STATS: (userId) => `ratings:stats:${userId}`
};

// 🚀 CREATE INTELLIGENT RATING WITH AI ANALYSIS
router.post('/', auth, async (req, res) => {
  try {
    const validatedData = RatingSchema.create.parse(req.body);

    // 🛡️ Security and validation checks
    const securityCheck = await YachiSecurity.canCreateRating(
      req.user.userId, 
      validatedData.userId,
      validatedData.jobId
    );
    
    if (!securityCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: securityCheck.reason,
        code: securityCheck.code
      });
    }

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 🎯 AI-Powered sentiment and quality analysis
      const aiAnalysis = await YachiAI.analyzeReview({
        comment: validatedData.comment,
        rating: validatedData.rating,
        categories: validatedData.categories
      });

      // 📝 Create rating with AI insights
      const rating = await Rating.create({
        userId: validatedData.userId,
        reviewerId: req.user.userId,
        jobId: validatedData.jobId,
        serviceId: validatedData.serviceId,
        rating: validatedData.rating,
        comment: validatedData.comment,
        categories: validatedData.categories,
        anonymous: validatedData.anonymous,
        wouldRecommend: validatedData.wouldRecommend,
        metadata: {
          ...validatedData.metadata,
          aiAnalysis: {
            sentiment: aiAnalysis.sentiment,
            qualityScore: aiAnalysis.qualityScore,
            keywords: aiAnalysis.keywords,
            flagged: aiAnalysis.flagged
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        status: aiAnalysis.flagged ? 'pending_review' : 'published'
      }, { transaction });

      // 📸 Handle photo uploads
      if (req.files && req.files.length > 0) {
        const photos = await Promise.all(
          req.files.map(async (file) => {
            const processedPhoto = await MediaService.processReviewPhoto(file, req.user.userId);
            
            return ReviewPhoto.create({
              ratingId: rating.id,
              url: processedPhoto.url,
              thumbnailUrl: processedPhoto.thumbnailUrl,
              caption: file.originalname,
              metadata: {
                size: file.size,
                mimeType: file.mimetype,
                dimensions: processedPhoto.dimensions
              }
            }, { transaction });
          })
        );

        rating.photos = photos;
      }

      // 📊 Update user rating statistics
      await updateUserRatingStats(validatedData.userId, transaction);

      // 🎪 Award rating creation points
      await YachiGamification.awardReviewCreation(req.user.userId, rating);

      await transaction.commit();

      // 📧 Send rating notification
      if (!validatedData.anonymous) {
        await YachiNotifications.sendRatingNotification(
          validatedData.userId, 
          req.user.userId, 
          rating
        );
      }

      // 🗑️ Clear relevant caches
      await clearRatingCaches(validatedData.userId);

      res.status(201).json({
        success: true,
        message: aiAnalysis.flagged ? 
          'Rating submitted for review' : 'Rating published successfully',
        data: {
          rating,
          aiInsights: aiAnalysis.insights,
          nextSteps: aiAnalysis.flagged ? 
            ['awaiting_moderation'] : ['share_review', 'view_impact']
        },
        gamification: {
          pointsAwarded: 25,
          achievement: 'First Review'
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

    console.error('Create Rating Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create rating',
      code: 'RATING_CREATION_FAILED'
    });
  }
});

// 🚀 GET USER RATINGS WITH ADVANCED FILTERING
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const validatedParams = RatingSchema.query.parse(req.query);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    const cacheKey = CACHE_KEYS.USER_RATINGS(userId) + `:${Buffer.from(JSON.stringify(validatedParams)).toString('base64')}`;
    const cachedRatings = await redis.get(cacheKey);

    if (cachedRatings) {
      return res.json({
        success: true,
        ...JSON.parse(cachedRatings),
        source: 'cache'
      });
    }

    // 🎯 Build where clause
    const where = { 
      userId,
      status: 'published'
    };

    // ⭐ Rating range filter
    if (validatedParams.minRating || validatedParams.maxRating) {
      where.rating = {
        ...(validatedParams.minRating && { [Op.gte]: validatedParams.minRating }),
        ...(validatedParams.maxRating && { [Op.lte]: validatedParams.maxRating })
      };
    }

    // 🏷️ Categories filter
    if (validatedParams.categories && validatedParams.categories.length > 0) {
      where.categories = { [Op.overlap]: validatedParams.categories };
    }

    // 📸 Photos filter
    if (validatedParams.withPhotos) {
      where.id = {
        [Op.in]: Sequelize.literal(`(
          SELECT DISTINCT "ratingId" FROM "ReviewPhotos" 
          WHERE "ReviewPhotos"."ratingId" = "Rating"."id"
        )`)
      };
    }

    // ✅ Verified reviews filter
    if (validatedParams.verifiedOnly) {
      where['$reviewer.verifiedBadge$'] = true;
    }

    const [ratings, total] = await Promise.all([
      Rating.findAll({
        where,
        include: [
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'name', 'avatar', 'verifiedBadge', 'premiumListing']
          },
          {
            model: ReviewPhoto,
            as: 'photos',
            attributes: ['id', 'url', 'thumbnailUrl', 'caption']
          },
          {
            model: ReviewReaction,
            as: 'reactions',
            attributes: ['reaction', 'userId'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'avatar']
            }]
          },
          {
            model: Job,
            as: 'job',
            attributes: ['id', 'title'],
            required: false
          },
          {
            model: Service,
            as: 'service',
            attributes: ['id', 'title'],
            required: false
          }
        ],
        order: buildRatingSortOrder(validatedParams.sortBy),
        limit: validatedParams.limit,
        offset: (validatedParams.page - 1) * validatedParams.limit
      }),
      Rating.count({ where })
    ]);

    // 📊 Get rating summary
    const summary = await getRatingSummary(userId);

    const result = {
      ratings,
      summary,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        pages: Math.ceil(total / validatedParams.limit)
      },
      filters: {
        applied: validatedParams
      }
    };

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result));

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

    console.error('Get User Ratings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings',
      code: 'FETCH_RATINGS_FAILED'
    });
  }
});

// 🚀 GET RATING DETAILS WITH ENGAGEMENT DATA
router.get('/:id', async (req, res) => {
  try {
    const ratingId = parseInt(req.params.id);

    const cacheKey = CACHE_KEYS.RATING_DETAILS(ratingId);
    const cachedRating = await redis.get(cacheKey);

    if (cachedRating) {
      return res.json({
        success: true,
        data: JSON.parse(cachedRating),
        source: 'cache'
      });
    }

    const rating = await Rating.findByPk(ratingId, {
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'avatar', 'verifiedBadge', 'premiumListing']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: ReviewPhoto,
          as: 'photos',
          attributes: ['id', 'url', 'thumbnailUrl', 'caption']
        },
        {
          model: ReviewReaction,
          as: 'reactions',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'avatar']
          }]
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title'],
          required: false
        },
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'title'],
          required: false
        }
      ]
    });

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
        code: 'RATING_NOT_FOUND'
      });
    }

    // 📊 Enhance with engagement data
    const enhancedRating = await enhanceRatingWithEngagement(rating);

    // 💾 Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(enhancedRating));

    res.json({
      success: true,
      data: enhancedRating,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Rating Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating details',
      code: 'FETCH_RATING_FAILED'
    });
  }
});

// 🚀 ADD REACTION TO RATING
router.post('/:id/react', auth, async (req, res) => {
  try {
    const ratingId = parseInt(req.params.id);
    const validatedData = RatingSchema.reaction.parse(req.body);

    const rating = await Rating.findByPk(ratingId);
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
        code: 'RATING_NOT_FOUND'
      });
    }

    // 🛡️ Check if user can react to this rating
    if (rating.userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot react to your own rating',
        code: 'SELF_REACTION_NOT_ALLOWED'
      });
    }

    // 🔄 Add or update reaction
    const [reaction, created] = await ReviewReaction.findOrCreate({
      where: {
        ratingId,
        userId: req.user.userId
      },
      defaults: {
        reaction: validatedData.reaction
      }
    });

    if (!created) {
      reaction.reaction = validatedData.reaction;
      await reaction.save();
    }

    // 🎪 Award engagement points
    await YachiGamification.awardReviewEngagement(req.user.userId, rating);

    // 🗑️ Clear relevant caches
    await clearRatingCaches(rating.userId, ratingId);

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: {
        reaction,
        created
      },
      gamification: {
        pointsAwarded: 2,
        streak: await YachiGamification.getEngagementStreak(req.user.userId)
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Add Reaction Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      code: 'ADD_REACTION_FAILED'
    });
  }
});

// 🚀 REPORT RATING
router.post('/:id/report', auth, async (req, res) => {
  try {
    const ratingId = parseInt(req.params.id);
    const validatedData = RatingSchema.report.parse(req.body);

    const rating = await Rating.findByPk(ratingId);
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
        code: 'RATING_NOT_FOUND'
      });
    }

    // 🛡️ Check if user has already reported this rating
    const existingReport = await Report.findOne({
      where: {
        ratingId,
        reporterId: req.user.userId
      }
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this rating',
        code: 'ALREADY_REPORTED'
      });
    }

    // 📝 Create report
    const report = await Report.create({
      ratingId,
      reporterId: req.user.userId,
      reason: validatedData.reason,
      description: validatedData.description,
      status: 'pending',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // ⚡ Trigger AI analysis for content moderation
    YachiAI.analyzeReportedContent(ratingId).catch(console.error);

    res.json({
      success: true,
      message: 'Rating reported successfully',
      data: {
        report,
        nextSteps: ['under_review', 'potential_action']
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Report Rating Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report rating',
      code: 'REPORT_FAILED'
    });
  }
});

// 🚀 GET RATING SUMMARY AND STATISTICS
router.get('/user/:userId/summary', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const cacheKey = CACHE_KEYS.USER_RATING_SUMMARY(userId);
    const cachedSummary = await redis.get(cacheKey);

    if (cachedSummary) {
      return res.json({
        success: true,
        data: JSON.parse(cachedSummary),
        source: 'cache'
      });
    }

    const summary = await getRatingSummary(userId);

    // 💾 Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(summary));

    res.json({
      success: true,
        data: summary,
        source: 'database'
      });
  } catch (error) {
    console.error('Get Rating Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating summary',
      code: 'FETCH_SUMMARY_FAILED'
    });
  }
});

// 🚀 GET RECENT RATINGS ACROSS PLATFORM
router.get('/recent/global', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const cacheKey = CACHE_KEYS.RECENT_RATINGS(limit);
    const cachedRatings = await redis.get(cacheKey);

    if (cachedRatings) {
      return res.json({
        success: true,
        data: JSON.parse(cachedRatings),
        source: 'cache'
      });
    }

    const recentRatings = await Rating.findAll({
      where: { status: 'published' },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'avatar', 'verifiedBadge']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: ReviewPhoto,
          as: 'photos',
          attributes: ['id', 'url', 'thumbnailUrl'],
          limit: 1
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(recentRatings));

    res.json({
      success: true,
      data: recentRatings,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Recent Ratings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent ratings',
      code: 'FETCH_RECENT_RATINGS_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 📊 Update User Rating Statistics
async function updateUserRatingStats(userId, transaction) {
  const stats = await Rating.findAll({
    where: { userId, status: 'published' },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRatings'],
      [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
      [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN "wouldRecommend" = true THEN 1 ELSE 0 END')), 'recommendationCount']
    ],
    transaction,
    raw: true
  });

  const user = await User.findByPk(userId, { transaction });
  user.rating = parseFloat(stats[0].averageRating) || 0;
  user.totalRatings = parseInt(stats[0].totalRatings) || 0;
  user.recommendationRate = stats[0].totalRatings > 0 ? 
    (parseInt(stats[0].recommendationCount) / parseInt(stats[0].totalRatings)) * 100 : 0;
  
  await user.save({ transaction });
}

// 📈 Get Rating Summary
async function getRatingSummary(userId) {
  const [
    ratingStats,
    categoryStats,
    recommendationStats,
    recentActivity
  ] = await Promise.all([
    // ⭐ Overall rating statistics
    Rating.findAll({
      where: { userId, status: 'published' },
      attributes: [
        'rating',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['rating'],
      order: [['rating', 'DESC']],
      raw: true
    }),

    // 🏷️ Category statistics
    Rating.findAll({
      where: { userId, status: 'published' },
      attributes: [
        [Sequelize.literal('UNNEST(categories)'), 'category'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating']
      ],
      group: ['category'],
      having: Sequelize.literal('COUNT(id) > 0'),
      raw: true
    }),

    // 👍 Recommendation statistics
    Rating.aggregate('wouldRecommend', 'COUNT', {
      where: { userId, status: 'published' },
      plain: false
    }),

    // 📅 Recent activity
    Rating.count({
      where: { 
        userId, 
        status: 'published',
        createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  const totalRatings = ratingStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
  const averageRating = ratingStats.reduce((sum, stat) => sum + (stat.rating * parseInt(stat.count)), 0) / totalRatings;

  return {
    overall: {
      averageRating: parseFloat(averageRating.toFixed(2)),
      totalRatings,
      ratingDistribution: ratingStats.reduce((acc, stat) => {
        acc[stat.rating] = parseInt(stat.count);
        return acc;
      }, {})
    },
    categories: categoryStats.reduce((acc, stat) => {
      acc[stat.category] = {
        count: parseInt(stat.count),
        averageRating: parseFloat(stat.averageRating)
      };
      return acc;
    }, {}),
    recommendations: {
      wouldRecommend: parseInt(recommendationStats[0]?.count || 0),
      recommendationRate: totalRatings > 0 ? (parseInt(recommendationStats[0]?.count || 0) / totalRatings) * 100 : 0
    },
    activity: {
      last30Days: recentActivity,
      trend: await calculateRatingTrend(userId)
    }
  };
}

// 📊 Build Rating Sort Order
function buildRatingSortOrder(sortBy) {
  const sortStrategies = {
    newest: [['createdAt', 'DESC']],
    highest: [['rating', 'DESC'], ['createdAt', 'DESC']],
    lowest: [['rating', 'ASC'], ['createdAt', 'DESC']],
    most_helpful: [
      [Sequelize.literal('(SELECT COUNT(*) FROM "ReviewReactions" WHERE "ReviewReactions"."ratingId" = "Rating"."id")'), 'DESC'],
      ['createdAt', 'DESC']
    ]
  };

  return sortStrategies[sortBy] || sortStrategies.newest;
}

// 🎯 Enhance Rating with Engagement Data
async function enhanceRatingWithEngagement(rating) {
  const enhanced = rating.toJSON();

  // 📊 Add engagement metrics
  enhanced.engagement = {
    reactionCount: await ReviewReaction.count({ where: { ratingId: rating.id } }),
    reactionBreakdown: await ReviewReaction.findAll({
      where: { ratingId: rating.id },
      attributes: [
        'reaction',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['reaction'],
      raw: true
    }),
    reportCount: await Report.count({ where: { ratingId: rating.id, status: 'pending' } })
  };

  // 🎪 Add gamification data
  enhanced.gamification = await YachiGamification.getReviewGamificationData(rating.id);

  return enhanced;
}

// 📈 Calculate Rating Trend
async function calculateRatingTrend(userId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [currentPeriod, previousPeriod] = await Promise.all([
    Rating.findAll({
      where: { 
        userId, 
        status: 'published',
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      raw: true
    }),
    Rating.findAll({
      where: { 
        userId, 
        status: 'published',
        createdAt: { [Op.gte]: sixtyDaysAgo, [Op.lt]: thirtyDaysAgo }
      },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      raw: true
    })
  ]);

  const currentAvg = parseFloat(currentPeriod[0]?.averageRating) || 0;
  const previousAvg = parseFloat(previousPeriod[0]?.averageRating) || 0;

  if (previousAvg === 0) return 'new';

  const change = ((currentAvg - previousAvg) / previousAvg) * 100;

  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}

// 🗑️ Clear Rating Caches
async function clearRatingCaches(userId, ratingId = null) {
  const patterns = [
    CACHE_KEYS.USER_RATINGS(userId) + '*',
    CACHE_KEYS.USER_RATING_SUMMARY(userId),
    CACHE_KEYS.RATING_STATS(userId),
    CACHE_KEYS.RECENT_RATINGS('*'),
    ...(ratingId ? [CACHE_KEYS.RATING_DETAILS(ratingId)] : [])
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

module.exports = router;
