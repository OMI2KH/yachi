const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const redis = require('../config/redis');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { RealTimeBidding } = require('../services/realTimeBidding');
const { AdTargetingEngine } = require('../services/adTargetingEngine');

const router = express.Router();
const prisma = new PrismaClient();

// 🎯 Input Validation Schemas
const AdvertisementSchema = {
  create: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(500),
    type: z.enum(['featured', 'banner', 'sponsored', 'push_notification', 'video']),
    category: z.enum([
      'plumbing', 'electrical', 'cleaning', 'carpentry', 
      'painting', 'gardening', 'mechanic', 'tech_support',
      'all_services', 'premium_feature'
    ]),
    price: z.number().min(1).refine(val => val % 50 === 0, {
      message: 'Price must be a multiple of 50'
    }),
    budget: z.number().min(100),
    currency: z.enum(['INR', 'USD', 'EUR', 'YACHI_POINTS']).default('INR'),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    targeting: z.object({
      location: z.object({
        type: z.enum(['city', 'state', 'country', 'radius']).default('city'),
        coordinates: z.object({
          latitude: z.number(),
          longitude: z.number()
        }).optional(),
        radius: z.number().optional(),
        areas: z.array(z.string()).optional()
      }).optional(),
      serviceCategories: z.array(z.string()).optional(),
      userTypes: z.array(z.enum(['new_user', 'returning_user', 'premium_user', 'all_users'])).optional(),
      deviceTypes: z.array(z.enum(['mobile', 'tablet', 'desktop', 'all'])).optional(),
      minUserRating: z.number().min(1).max(5).optional()
    }).optional(),
    media: z.object({
      images: z.array(z.object({
        url: z.string().url(),
        caption: z.string().optional(),
        order: z.number().default(0)
      })).optional(),
      video: z.object({
        url: z.string().url().optional(),
        thumbnail: z.string().url().optional(),
        duration: z.number().optional()
      }).optional(),
      logo: z.string().url().optional()
    }).optional(),
    callToAction: z.object({
      text: z.string().default('Book Now'),
      url: z.string().url().optional(),
      deepLink: z.string().optional()
    }).optional()
  }).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate']
  }),

  update: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().min(10).max(500).optional(),
    price: z.number().min(1).optional(),
    budget: z.number().min(100).optional(),
    status: z.enum(['draft', 'pending_approval', 'active', 'paused', 'completed', 'cancelled']).optional(),
    targeting: z.object({}).passthrough().optional()
  }),

  bid: z.object({
    bidAmount: z.number().min(1),
    strategy: z.enum(['cpc', 'cpm', 'fixed', 'auction']).default('cpc')
  })
};

// 🎪 CACHE KEYS
const CACHE_KEYS = {
  BANNER_ADS: (location) => `ads:banner:${location}`,
  FEATURED_ADS: (category, location) => `ads:featured:${category}:${location}`,
  USER_ADS: (userId) => `ads:user:${userId}`,
  AD_PERFORMANCE: (adId) => `ads:performance:${adId}`
};

// 🚀 MIDDLEWARE
const validateAdvertisementOwnership = async (req, res, next) => {
  try {
    const ad = await prisma.advertisement.findUnique({
      where: { id: req.params.id },
      select: { userId: true }
    });

    if (!ad) {
      return res.status(404).json({ 
        success: false, 
        message: 'Advertisement not found' 
      });
    }

    if (ad.userId !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You do not own this advertisement.' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error during ownership validation' 
    });
  }
};

// 📱 ROUTES

// 🎯 GET Smart Banner Ads with Advanced Targeting
router.get('/banner', async (req, res) => {
  try {
    const { 
      latitude, 
      longitude, 
      category, 
      userType = 'all_users',
      deviceType = 'mobile'
    } = req.query;

    // 🎪 Generate cache key based on targeting parameters
    const locationKey = latitude && longitude ? 
      `${latitude.toFixed(2)}_${longitude.toFixed(2)}` : 'global';
    const cacheKey = CACHE_KEYS.BANNER_ADS(`${locationKey}_${category}_${userType}_${deviceType}`);

    // 🔍 Try cache first
    const cachedAds = await redis.get(cacheKey);
    if (cachedAds) {
      return res.json({
        success: true,
        data: JSON.parse(cachedAds),
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // 🎯 Build targeting query
    const targetingQuery = {
      type: 'banner',
      status: 'active',
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      OR: [
        { targeting: { equals: {} } }, // Global ads
        { 
          AND: [
            { 'targeting.userTypes': { has: userType } },
            { 'targeting.deviceTypes': { has: deviceType } }
          ]
        }
      ]
    };

    // 🗺️ Add location targeting if provided
    if (latitude && longitude) {
      targetingQuery.OR.push({
        'targeting.location.coordinates': {
          near: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            radius: 50000 // 50km radius
          }
        }
      });
    }

    // 🎯 Add category targeting
    if (category && category !== 'all_services') {
      targetingQuery.OR.push({
        'targeting.serviceCategories': { has: category }
      });
    }

    const bannerAds = await prisma.advertisement.findMany({
      where: targetingQuery,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verifiedBadge: true,
            rating: true
          }
        },
        _count: {
          select: {
            impressions: true,
            clicks: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { 'bidding.currentBid': 'desc' },
        { createdAt: 'desc' }
      ],
      take: 8
    });

    // 🎪 Apply real-time bidding and ranking
    const rankedAds = await RealTimeBidding.rankAds(bannerAds, {
      userLocation: latitude && longitude ? 
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null,
      userType,
      deviceType,
      category
    });

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(rankedAds));

    // 📊 Track ad impression opportunity
    YachiAnalytics.trackAdImpressionOpportunity(rankedAds.map(ad => ad.id));

    res.json({
      success: true,
      data: rankedAds,
      source: 'database',
      targeting: {
        location: latitude && longitude ? 'geotargeted' : 'global',
        category: category || 'all',
        userType,
        deviceType
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Banner Ads Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner ads',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🎯 GET Smart Featured Ads with Gamified Ranking
router.get('/featured', async (req, res) => {
  try {
    const { 
      category = 'all_services',
      latitude,
      longitude,
      sortBy = 'performance',
      limit = 12
    } = req.query;

    const cacheKey = CACHE_KEYS.FEATURED_ADS(category, 
      latitude && longitude ? `${latitude.toFixed(2)}_${longitude.toFixed(2)}` : 'global'
    );

    // 🔍 Try cache first
    const cachedAds = await redis.get(cacheKey);
    if (cachedAds) {
      return res.json({
        success: true,
        data: JSON.parse(cachedAds),
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // 🎯 Build advanced query
    const featuredQuery = {
      type: { in: ['featured', 'sponsored'] },
      status: 'active',
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      OR: [
        { category: 'all_services' },
        { category }
      ]
    };

    // 🗺️ Location-based targeting
    if (latitude && longitude) {
      featuredQuery.OR.push({
        'targeting.location.coordinates': {
          near: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            radius: 25000 // 25km radius for featured ads
          }
        }
      });
    }

    const featuredAds = await prisma.advertisement.findMany({
      where: featuredQuery,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verifiedBadge: true,
            rating: true,
            level: true,
            achievements: {
              take: 3,
              orderBy: { unlockedAt: 'desc' }
            }
          }
        },
        _count: {
          select: {
            impressions: true,
            clicks: true,
            conversions: true
          }
        }
      },
      orderBy: this.getSortOrder(sortBy),
      take: parseInt(limit)
    });

    // 🎪 Apply gamified ranking algorithm
    const gamifiedAds = await YachiGamification.rankFeaturedAds(featuredAds, {
      userLocation: latitude && longitude ? 
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null,
      category,
      sortBy
    });

    // 💾 Cache for 3 minutes (featured ads change more frequently)
    await redis.setex(cacheKey, 180, JSON.stringify(gamifiedAds));

    res.json({
      success: true,
      data: gamifiedAds,
      source: 'database',
      metadata: {
        total: gamifiedAds.length,
        category,
        sortBy,
        location: latitude && longitude ? 'geotargeted' : 'global'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Featured Ads Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured ads',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🎯 POST Create New Advertisement with Gamification
router.post('/', authenticateToken, authorizeRoles(['provider', 'admin']), async (req, res) => {
  try {
    // 🛡️ Validate input
    const validatedData = AdvertisementSchema.create.parse(req.body);

    // 💰 Check user budget and points
    const userBalance = await YachiGamification.getUserBalance(req.user.id);
    if (userBalance.availablePoints < validatedData.budget * 0.1) { // 10% reserve
      return res.status(400).json({
        success: false,
        message: 'Insufficient Yachi Points for advertisement creation',
        required: validatedData.budget * 0.1,
        available: userBalance.availablePoints
      });
    }

    // 🎯 Create advertisement with gamification
    const advertisement = await prisma.advertisement.create({
      data: {
        ...validatedData,
        userId: req.user.id,
        advertiserType: 'provider',
        status: 'pending_approval',
        gamification: {
          pointsCost: Math.floor(validatedData.budget * 0.1), // 10% points cost
          achievementUnlocked: false,
          badgeEligible: validatedData.budget >= 1000,
          leaderboardPoints: 0
        },
        bidding: {
          strategy: validatedData.bidding?.strategy || 'cpc',
          maxBid: validatedData.price,
          currentBid: validatedData.price,
          competitors: []
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verifiedBadge: true
          }
        }
      }
    });

    // 🎪 Award creation points and track event
    await YachiGamification.awardAdvertisementCreation(req.user.id, advertisement);
    await YachiAnalytics.trackAdvertisementEvent('created', advertisement);

    // 🗑️ Clear relevant caches
    await this.clearAdvertisementCaches();

    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully and pending approval',
      data: advertisement,
      gamification: {
        pointsSpent: advertisement.gamification.pointsCost,
        newBalance: userBalance.availablePoints - advertisement.gamification.pointsCost
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

    console.error('Create Advertisement Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advertisement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🎯 PUT Update Advertisement
router.put('/:id', authenticateToken, validateAdvertisementOwnership, async (req, res) => {
  try {
    const validatedData = AdvertisementSchema.update.parse(req.body);

    const advertisement = await prisma.advertisement.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    // 🗑️ Clear caches
    await this.clearAdvertisementCaches();

    res.json({
      success: true,
      message: 'Advertisement updated successfully',
      data: advertisement
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Update Advertisement Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advertisement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🎯 POST Record Ad Impression
router.post('/:id/impression', async (req, res) => {
  try {
    const { userAgent, ipAddress, location } = req.body;

    const advertisement = await prisma.advertisement.update({
      where: { id: req.params.id },
      data: {
        impressions: { increment: 1 },
        analytics: {
          push: {
            dailyImpressions: {
              date: new Date().toISOString().split('T')[0],
              count: 1
            }
          }
        }
      }
    });

    // 📊 Track impression analytics
    await YachiAnalytics.trackImpression(req.params.id, {
      userAgent,
      ipAddress,
      location,
      timestamp: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Impression recorded',
      adId: req.params.id 
    });

  } catch (error) {
    console.error('Record Impression Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record impression'
    });
  }
});

// 🎯 POST Record Ad Click
router.post('/:id/click', async (req, res) => {
  try {
    const { userAgent, ipAddress, location, userId } = req.body;

    const advertisement = await prisma.advertisement.update({
      where: { id: req.params.id },
      data: {
        clicks: { increment: 1 },
        clickThroughRate: {
          // Calculate new CTR
          set: advertisement.impressions > 0 ? 
            ((advertisement.clicks + 1) / advertisement.impressions) * 100 : 0
        }
      }
    });

    // 🎪 Award click points to advertiser
    await YachiGamification.awardAdvertisementClick(advertisement.userId, advertisement);

    // 📊 Track click analytics
    await YachiAnalytics.trackClick(req.params.id, {
      userId,
      userAgent,
      ipAddress,
      location,
      timestamp: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Click recorded',
      adId: req.params.id 
    });

  } catch (error) {
    console.error('Record Click Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record click'
    });
  }
});

// 🎯 GET Advertisement Performance Analytics
router.get('/:id/analytics', authenticateToken, validateAdvertisementOwnership, async (req, res) => {
  try {
    const { period = '7d' } = req.query; // 7d, 30d, 90d

    const cacheKey = CACHE_KEYS.AD_PERFORMANCE(`${req.params.id}_${period}`);
    const cachedAnalytics = await redis.get(cacheKey);

    if (cachedAnalytics) {
      return res.json({
        success: true,
        data: JSON.parse(cachedAnalytics),
        source: 'cache'
      });
    }

    const analytics = await YachiAnalytics.getAdvertisementPerformance(req.params.id, period);

    // 💾 Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(analytics));

    res.json({
      success: true,
      data: analytics,
      source: 'database'
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisement analytics'
    });
  }
});

// 🎯 GET User's Advertisements
router.get('/my-ads', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const cacheKey = CACHE_KEYS.USER_ADS(`${req.user.id}_${status}_${page}_${limit}`);
    const cachedAds = await redis.get(cacheKey);

    if (cachedAds) {
      return res.json({
        success: true,
        data: JSON.parse(cachedAds),
        source: 'cache'
      });
    }

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const [ads, total] = await Promise.all([
      prisma.advertisement.findMany({
        where,
        include: {
          _count: {
            select: {
              impressions: true,
              clicks: true,
              conversions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.advertisement.count({ where })
    ]);

    const result = {
      ads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(result));

    res.json({
      success: true,
      data: result,
      source: 'database'
    });

  } catch (error) {
    console.error('My Ads Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user advertisements'
    });
  }
});

// 🎯 UTILITY METHODS

// 🎯 Get Sort Order Based on Strategy
router.getSortOrder = (sortBy) => {
  const sortStrategies = {
    performance: [
      { performanceScore: 'desc' },
      { 'bidding.currentBid': 'desc' }
    ],
    bid: [
      { 'bidding.currentBid': 'desc' },
      { performanceScore: 'desc' }
    ],
    recent: [
      { createdAt: 'desc' }
    ],
    popular: [
      { clicks: 'desc' },
      { impressions: 'desc' }
    ]
  };

  return sortStrategies[sortBy] || sortStrategies.performance;
};

// 🗑️ Clear Advertisement Caches
router.clearAdvertisementCaches = async () => {
  const patterns = ['ads:banner:*', 'ads:featured:*', 'ads:user:*'];
  
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};

module.exports = router;
