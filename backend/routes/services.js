const express = require('express');
const { Service, User, Advertisement, Category, ServiceView, Favorite, Booking, Review } = require('../models');
const { Sequelize, Op } = require('sequelize');
const auth = require('../middleware/auth');
const { z } = require('zod');
const { YachiAI } = require('../services/yachiAI');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiSecurity } = require('../services/yachiSecurity');
const { YachiNotifications } = require('../services/yachiNotifications');
const { PricingEngine } = require('../services/pricingEngine');
const { LocationService } = require('../services/locationService');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const ServiceSchema = {
  create: z.object({
    title: z.string().min(5).max(100),
    description: z.string().min(20).max(2000),
    categoryId: z.number().int().positive(),
    price: z.object({
      amount: z.number().positive(),
      currency: z.string().default('ETB'),
      type: z.enum(['fixed', 'hourly', 'negotiable']).default('fixed'),
      minAmount: z.number().positive().optional(),
      maxAmount: z.number().positive().optional(),
      hourlyRate: z.number().positive().optional()
    }),
    location: z.object({
      type: z.enum(['onsite', 'remote', 'hybrid']),
      address: z.string().optional(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number()
      }).optional(),
      serviceRadius: z.number().positive().default(25) // km
    }),
    requirements: z.object({
      experience: z.enum(['entry', 'intermediate', 'expert']).default('intermediate'),
      duration: z.number().positive().optional(), // in hours
      materialsIncluded: z.boolean().default(false),
      clientProvides: z.array(z.string()).optional()
    }).optional(),
    features: z.array(z.string()).max(15).optional(),
    images: z.array(z.string().url()).min(1).max(10),
    tags: z.array(z.string()).max(20).optional(),
    availability: z.object({
      schedule: z.enum(['flexible', 'fixed', 'appointment']).default('flexible'),
      workingHours: z.object({
        start: z.string(),
        end: z.string(),
        timezone: z.string()
      }).optional(),
      emergencyService: z.boolean().default(false)
    }).optional(),
    metadata: z.object({}).passthrough().optional()
  }),

  update: z.object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(20).max(2000).optional(),
    price: z.object({}).passthrough().optional(),
    location: z.object({}).passthrough().optional(),
    requirements: z.object({}).passthrough().optional(),
    features: z.array(z.string()).max(15).optional(),
    images: z.array(z.string().url()).min(1).max(10).optional(),
    status: z.enum(['active', 'inactive', 'paused', 'suspended']).optional(),
    metadata: z.object({}).passthrough().optional()
  }),

  query: z.object({
    search: z.string().max(100).optional(),
    category: z.number().int().positive().optional(),
    categories: z.array(z.number().int().positive()).optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number().positive().default(50) // km
    }).optional(),
    experience: z.enum(['entry', 'intermediate', 'expert']).optional(),
    features: z.array(z.string()).optional(),
    availability: z.enum(['immediate', 'within_week', 'flexible']).optional(),
    sortBy: z.enum(['relevance', 'price_low', 'price_high', 'rating', 'distance', 'popular']).default('relevance'),
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
    premiumOnly: z.boolean().default(false),
    verifiedOnly: z.boolean().default(false),
    featuredOnly: z.boolean().default(false)
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  SERVICES_SEARCH: (params) => `services:search:${Buffer.from(JSON.stringify(params)).toString('base64')}`,
  SERVICE_DETAILS: (serviceId) => `service:details:${serviceId}`,
  USER_SERVICES: (userId) => `services:user:${userId}`,
  CATEGORY_SERVICES: (categoryId) => `services:category:${categoryId}`,
  TRENDING_SERVICES: (location) => `services:trending:${location}`,
  SIMILAR_SERVICES: (serviceId) => `services:similar:${serviceId}`
};

// 🚀 GET INTELLIGENT SERVICE DISCOVERY
router.get('/', async (req, res) => {
  try {
    const validatedParams = ServiceSchema.query.parse(req.query);

    const cacheKey = CACHE_KEYS.SERVICES_SEARCH(validatedParams);
    const cachedResults = await redis.get(cacheKey);

    if (cachedResults) {
      return res.json({
        success: true,
        ...JSON.parse(cachedResults),
        source: 'cache'
      });
    }

    // 🎯 Build advanced where clause
    const where = await buildServiceWhereClause(validatedParams);

    // 🎯 Build include with optimized attributes
    const include = [
      {
        model: User,
        as: 'provider',
        attributes: [
          'id', 'name', 'avatar', 'verifiedBadge', 'premiumListing',
          'rating', 'responseRate', 'joinedAt', 'onlineStatus'
        ],
        include: [{
          model: Review,
          as: 'reviews',
          attributes: ['rating'],
          required: false
        }]
      },
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'description']
      },
      {
        model: Review,
        as: 'reviews',
        attributes: ['rating', 'comment', 'createdAt'],
        limit: 3,
        order: [['createdAt', 'DESC']]
      }
    ];

    // 🎯 Build order based on sort strategy
    const order = buildServiceSortOrder(validatedParams.sortBy, validatedParams.location);

    // 🎯 Execute query with pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit;

    const [services, totalCount] = await Promise.all([
      Service.findAll({
        where,
        include,
        order,
        limit: validatedParams.limit,
        offset,
        subQuery: false
      }),
      Service.count({ where })
    ]);

    // 🎪 Enhance services with analytics and engagement
    const enhancedServices = await enhanceServicesWithAnalytics(services);

    // 🎯 Generate intelligent recommendations
    const recommendations = await YachiAI.getServiceRecommendations(enhancedServices, validatedParams);

    const result = {
      services: enhancedServices,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / validatedParams.limit)
      },
      filters: {
        applied: validatedParams,
        available: await getAvailableFilters(where)
      },
      recommendations,
      searchMetadata: await YachiAnalytics.analyzeServiceSearch(validatedParams, totalCount)
    };

    // 💾 Cache for 3 minutes
    await redis.setex(cacheKey, 180, JSON.stringify(result));

    // 📊 Track search analytics
    await YachiAnalytics.trackServiceSearch({
      query: validatedParams.search,
      filters: validatedParams,
      resultCount: totalCount,
      location: validatedParams.location
    });

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

    console.error('Service Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      code: 'SERVICE_SEARCH_FAILED'
    });
  }
});

// 🚀 GET SERVICE DETAILS WITH INTELLIGENT DATA
router.get('/:id', async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const { includeSimilar = true, includeAnalytics = false } = req.query;

    const cacheKey = CACHE_KEYS.SERVICE_DETAILS(serviceId) + `:${includeSimilar}:${includeAnalytics}`;
    const cachedService = await redis.get(cacheKey);

    if (cachedService) {
      return res.json({
        success: true,
        data: JSON.parse(cachedService),
        source: 'cache'
      });
    }

    const service = await Service.findByPk(serviceId, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: [
            'id', 'name', 'avatar', 'verifiedBadge', 'premiumListing',
            'rating', 'responseRate', 'joinedAt', 'onlineStatus'
          ],
          include: [{
            model: Service,
            as: 'services',
            where: { id: { [Op.ne]: serviceId } },
            attributes: ['id', 'title', 'price', 'images'],
            limit: 3,
            required: false
          }]
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'description']
        },
        {
          model: Review,
          as: 'reviews',
          include: [{
            model: User,
            as: 'reviewer',
            attributes: ['id', 'name', 'avatar']
          }],
          limit: 10,
          order: [['createdAt', 'DESC']]
        },
        {
          model: Favorite,
          as: 'favorites',
          attributes: ['userId'],
          required: false
        }
      ]
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND'
      });
    }

    // 📊 Track service view
    await ServiceView.create({
      serviceId,
      userId: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 🎯 Enhance service data
    const enhancedService = await enhanceServiceData(service, {
      includeSimilar,
      includeAnalytics
    });

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(enhancedService));

    res.json({
      success: true,
      data: enhancedService,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Service Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service details',
      code: 'FETCH_SERVICE_FAILED'
    });
  }
});

// 🚀 CREATE INTELLIGENT SERVICE LISTING
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can create service listings',
        code: 'PROVIDERS_ONLY'
      });
    }

    const validatedData = ServiceSchema.create.parse(req.body);

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 🎯 AI-Powered service optimization
      const aiOptimized = await YachiAI.optimizeServiceListing({
        title: validatedData.title,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        price: validatedData.price,
        features: validatedData.features
      });

      // 💰 Smart pricing suggestions
      const pricingAnalysis = await PricingEngine.analyzeServicePricing({
        categoryId: validatedData.categoryId,
        location: validatedData.location,
        experience: validatedData.requirements?.experience,
        features: validatedData.features
      });

      // 📝 Create service with enhanced data
      const service = await Service.create({
        providerId: req.user.userId,
        title: aiOptimized.optimizedTitle || validatedData.title,
        description: aiOptimized.optimizedDescription || validatedData.description,
        categoryId: validatedData.categoryId,
        price: {
          ...validatedData.price,
          marketAverage: pricingAnalysis.marketAverage,
          suggestedRange: pricingAnalysis.suggestedRange
        },
        location: Sequelize.literal(
          `ST_SetSRID(ST_MakePoint(${validatedData.location.coordinates.longitude}, ${validatedData.location.coordinates.latitude}), 4326)`
        ),
        locationMetadata: {
          type: validatedData.location.type,
          address: validatedData.location.address,
          serviceRadius: validatedData.location.serviceRadius
        },
        requirements: validatedData.requirements,
        features: validatedData.features,
        images: validatedData.images,
        tags: validatedData.tags,
        availability: validatedData.availability,
        status: 'active',
        metadata: {
          ...validatedData.metadata,
          aiOptimized: !!aiOptimized.optimizedTitle,
          qualityScore: aiOptimized.qualityScore,
          pricingAnalysis: pricingAnalysis,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      }, { transaction });

      // 🎪 Award service creation points
      await YachiGamification.awardServiceCreation(req.user.userId, service);

      // 📊 Track listing analytics
      await YachiAnalytics.trackServiceEvent('created', service);

      await transaction.commit();

      // 🗑️ Clear relevant caches
      await clearServiceCaches(req.user.userId, validatedData.categoryId);

      res.status(201).json({
        success: true,
        message: 'Service listed successfully',
        data: {
          service,
          optimization: aiOptimized,
          pricing: pricingAnalysis,
          nextSteps: ['add_availability', 'set_up_automated_responses', 'share_service']
        },
        gamification: {
          pointsAwarded: 50,
          achievement: 'First Service'
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

    console.error('Create Service Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service listing',
      code: 'SERVICE_CREATION_FAILED'
    });
  }
});

// 🚀 UPDATE SERVICE LISTING
router.put('/:id', auth, async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const validatedData = ServiceSchema.update.parse(req.body);

    const service = await Service.findByPk(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND'
      });
    }

    if (service.providerId !== req.user.userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this service',
        code: 'UPDATE_UNAUTHORIZED'
      });
    }

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 📝 Update service
      await service.update(validatedData, { transaction });

      // 🎯 Re-optimize with AI if title/description changed
      if (validatedData.title || validatedData.description) {
        const aiOptimized = await YachiAI.optimizeServiceListing({
          title: validatedData.title || service.title,
          description: validatedData.description || service.description,
          categoryId: service.categoryId,
          price: service.price,
          features: service.features
        });

        if (aiOptimized.qualityScore > service.metadata?.qualityScore) {
          await service.update({
            title: aiOptimized.optimizedTitle,
            description: aiOptimized.optimizedDescription,
            metadata: {
              ...service.metadata,
              aiOptimized: true,
              qualityScore: aiOptimized.qualityScore,
              lastOptimized: new Date().toISOString()
            }
          }, { transaction });
        }
      }

      // 💰 Update pricing analysis if price changed
      if (validatedData.price) {
        const pricingAnalysis = await PricingEngine.analyzeServicePricing({
          categoryId: service.categoryId,
          location: service.locationMetadata,
          experience: service.requirements?.experience,
          features: service.features
        });

        await service.update({
          price: {
            ...validatedData.price,
            marketAverage: pricingAnalysis.marketAverage,
            suggestedRange: pricingAnalysis.suggestedRange
          },
          metadata: {
            ...service.metadata,
            pricingAnalysis: pricingAnalysis,
            lastPricingUpdate: new Date().toISOString()
          }
        }, { transaction });
      }

      await transaction.commit();

      // 🗑️ Clear caches
      await clearServiceCaches(service.providerId, service.categoryId, serviceId);

      res.json({
        success: true,
        message: 'Service updated successfully',
        data: service
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

    console.error('Update Service Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      code: 'SERVICE_UPDATE_FAILED'
    });
  }
});

// 🚀 TOGGLE SERVICE FAVORITE
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);

    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND'
      });
    }

    const existingFavorite = await Favorite.findOne({
      where: { serviceId, userId: req.user.userId }
    });

    if (existingFavorite) {
      // ❌ Remove favorite
      await existingFavorite.destroy();
      
      res.json({
        success: true,
        message: 'Service removed from favorites',
        data: { favorited: false }
      });
    } else {
      // ✅ Add favorite
      await Favorite.create({
        serviceId,
        userId: req.user.userId
      });

      // 🎪 Award favorite points
      await YachiGamification.awardServiceFavorite(req.user.userId, service);

      res.json({
        success: true,
        message: 'Service added to favorites',
        data: { favorited: true },
        gamification: {
          pointsAwarded: 5,
          streak: await YachiGamification.getFavoriteStreak(req.user.userId)
        }
      });
    }

    // 🗑️ Clear relevant caches
    await redis.del(CACHE_KEYS.SERVICE_DETAILS(serviceId));

  } catch (error) {
    console.error('Toggle Favorite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite status',
      code: 'FAVORITE_UPDATE_FAILED'
    });
  }
});

// 🚀 GET USER'S SERVICES
router.get('/user/my-services', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can view their services',
        code: 'PROVIDERS_ONLY'
      });
    }

    const { page = 1, limit = 20, status } = req.query;

    const cacheKey = CACHE_KEYS.USER_SERVICES(req.user.userId) + `:${page}:${limit}:${status}`;
    const cachedServices = await redis.get(cacheKey);

    if (cachedServices) {
      return res.json({
        success: true,
        ...JSON.parse(cachedServices),
        source: 'cache'
      });
    }

    const where = { providerId: req.user.userId };
    if (status) where.status = status;

    const [services, total] = await Promise.all([
      Service.findAll({
        where,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'icon']
          },
          {
            model: Review,
            as: 'reviews',
            attributes: ['rating', 'comment'],
            limit: 3
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      }),
      Service.count({ where })
    ]);

    // 📊 Add performance metrics
    const servicesWithMetrics = await Promise.all(
      services.map(async (service) => {
        const metrics = await getServicePerformanceMetrics(service.id);
        return {
          ...service.toJSON(),
          metrics
        };
      })
    );

    const result = {
      services: servicesWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: await getProviderServicesSummary(req.user.userId)
    };

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    console.error('Get User Services Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user services',
      code: 'FETCH_USER_SERVICES_FAILED'
    });
  }
});

// 🚀 GET TRENDING SERVICES
router.get('/trending/global', async (req, res) => {
  try {
    const { limit = 20, category } = req.query;

    const cacheKey = CACHE_KEYS.TRENDING_SERVICES('global') + `:${limit}:${category}`;
    const cachedTrending = await redis.get(cacheKey);

    if (cachedTrending) {
      return res.json({
        success: true,
        data: JSON.parse(cachedTrending),
        source: 'cache'
      });
    }

    const trendingServices = await YachiAnalytics.getTrendingServices({
      limit: parseInt(limit),
      category,
      timeframe: '7d'
    });

    // 💾 Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(trendingServices));

    res.json({
      success: true,
      data: trendingServices,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Trending Services Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending services',
      code: 'FETCH_TRENDING_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 🎯 Build Advanced Where Clause
async function buildServiceWhereClause(params) {
  const where = { status: 'active' };

  // 🔍 Text search
  if (params.search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${params.search}%` } },
      { description: { [Op.iLike]: `%${params.search}%` } },
      { tags: { [Op.contains]: [params.search] } }
    ];
  }

  // 🗂️ Category filter
  if (params.category) {
    where.categoryId = params.category;
  }
  if (params.categories && params.categories.length > 0) {
    where.categoryId = { [Op.in]: params.categories };
  }

  // 💰 Price filter
  if (params.minPrice || params.maxPrice) {
    where['price.amount'] = {
      ...(params.minPrice && { [Op.gte]: params.minPrice }),
      ...(params.maxPrice && { [Op.lte]: params.maxPrice })
    };
  }

  // 🎯 Experience filter
  if (params.experience) {
    where['requirements.experience'] = params.experience;
  }

  // 🔧 Features filter
  if (params.features && params.features.length > 0) {
    where.features = { [Op.overlap]: params.features };
  }

  // 📅 Availability filter
  if (params.availability) {
    where['availability.schedule'] = params.availability;
  }

  // 🌍 Location-based filtering
  if (params.location && params.location.latitude && params.location.longitude) {
    where.location = Sequelize.literal(
      `ST_DWithin(location, ST_SetSRID(ST_MakePoint(${params.location.longitude}, ${params.location.latitude}), 4326), ${params.location.radius * 1000})`
    );
  }

  // 💎 Premium only filter
  if (params.premiumOnly) {
    where['$provider.premiumListing$'] = true;
  }

  // ✅ Verified only filter
  if (params.verifiedOnly) {
    where['$provider.verifiedBadge$'] = true;
  }

  // ⭐ Featured only filter
  if (params.featuredOnly) {
    where.isFeatured = true;
  }

  return where;
}

// 🎯 Build Service Sort Order
function buildServiceSortOrder(sortBy, location) {
  const sortStrategies = {
    relevance: [
      ['$provider.premiumListing$', 'DESC'],
      ['isFeatured', 'DESC'],
      ['rating', 'DESC'],
      ['viewCount', 'DESC']
    ],
    price_low: [['price.amount', 'ASC']],
    price_high: [['price.amount', 'DESC']],
    rating: [['rating', 'DESC']],
    distance: location ? [
      [Sequelize.literal(`ST_Distance(location, ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326))`), 'ASC']
    ] : [['rating', 'DESC']],
    popular: [
      ['viewCount', 'DESC'],
      ['bookingCount', 'DESC']
    ]
  };

  return sortStrategies[sortBy] || sortStrategies.relevance;
}

// 📊 Enhance Services with Analytics
async function enhanceServicesWithAnalytics(services) {
  return await Promise.all(
    services.map(async (service) => {
      const enhanced = service.toJSON();
      
      // 📊 Add engagement metrics
      enhanced.engagement = {
        viewCount: await ServiceView.count({ where: { serviceId: service.id } }),
        favoriteCount: await Favorite.count({ where: { serviceId: service.id } }),
        bookingCount: await Booking.count({ where: { serviceId: service.id, status: 'completed' } })
      };

      // 💰 Add pricing insights
      enhanced.pricing = await PricingEngine.analyzeServicePrice(service);

      // 🎪 Add gamification data
      enhanced.gamification = await YachiGamification.getServiceGamificationData(service.id);

      return enhanced;
    })
  );
}

// 🎯 Enhance Service Data
async function enhanceServiceData(service, options) {
  const enhanced = service.toJSON();

  // 📊 Add detailed analytics
  enhanced.analytics = {
    totalViews: await ServiceView.count({ where: { serviceId: service.id } }),
    dailyViews: await ServiceView.count({
      where: {
        serviceId: service.id,
        createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }),
    favoriteCount: await Favorite.count({ where: { serviceId: service.id } }),
    bookingCount: await Booking.count({ where: { serviceId: service.id } }),
    conversionRate: await calculateConversionRate(service.id)
  };

  // 🎯 Add AI-powered insights
  if (options.includeAnalytics) {
    enhanced.insights = await YachiAI.getServiceInsights(service.id);
  }

  // 🔍 Add similar services
  if (options.includeSimilar) {
    enhanced.similarServices = await YachiAI.getSimilarServices(service.id, 6);
  }

  // ❤️ Add user-specific data
  if (req.user) {
    enhanced.userContext = {
      isFavorited: await Favorite.findOne({ 
        where: { serviceId: service.id, userId: req.user.userId } 
      }).then(fav => !!fav),
      canBook: await canUserBookService(req.user.userId, service.id),
      distance: await calculateUserDistance(req.user.userId, service)
    };
  }

  return enhanced;
}

// 📈 Get Service Performance Metrics
async function getServicePerformanceMetrics(serviceId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [views, favorites, bookings, revenue] = await Promise.all([
    ServiceView.count({
      where: {
        serviceId,
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    }),
    Favorite.count({
      where: {
        serviceId,
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    }),
    Booking.count({
      where: {
        serviceId,
        status: 'completed',
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    }),
    Booking.sum('totalAmount', {
      where: {
        serviceId,
        status: 'completed',
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    })
  ]);

  return {
    views,
    favorites,
    bookings,
    revenue: revenue || 0,
    conversionRate: views > 0 ? (bookings / views) * 100 : 0
  };
}

// 📊 Get Provider Services Summary
async function getProviderServicesSummary(providerId) {
  const [totalServices, activeServices, totalRevenue, averageRating] = await Promise.all([
    Service.count({ where: { providerId } }),
    Service.count({ where: { providerId, status: 'active' } }),
    Booking.sum('totalAmount', {
      include: [{
        model: Service,
        where: { providerId }
      }],
      where: { status: 'completed' }
    }),
    Service.aggregate('rating', 'AVG', { where: { providerId } })
  ]);

  return {
    totalServices,
    activeServices,
    totalRevenue: totalRevenue || 0,
    averageRating: parseFloat(averageRating) || 0,
    completionRate: await calculateProviderCompletionRate(providerId)
  };
}

// 🎯 Get Available Filters
async function getAvailableFilters(whereClause) {
  const filters = await Promise.all([
    // Price range
    Service.findAll({
      where: whereClause,
      attributes: [
        [Sequelize.fn('MIN', Sequelize.col('price.amount')), 'minPrice'],
        [Sequelize.fn('MAX', Sequelize.col('price.amount')), 'maxPrice']
      ],
      raw: true
    }),
    // Categories with counts
    Category.findAll({
      include: [{
        model: Service,
        attributes: [],
        where: whereClause,
        required: false
      }],
      attributes: [
        'id', 'name', 'icon',
        [Sequelize.fn('COUNT', Sequelize.col('services.id')), 'count']
      ],
      group: ['Category.id'],
      order: [[Sequelize.literal('count'), 'DESC']]
    })
  ]);

  return {
    priceRange: filters[0][0],
    categories: filters[1]
  };
}

// 🗑️ Clear Service Caches
async function clearServiceCaches(providerId, categoryId, serviceId = null) {
  const patterns = [
    CACHE_KEYS.USER_SERVICES(providerId) + '*',
    CACHE_KEYS.CATEGORY_SERVICES(categoryId) + '*',
    CACHE_KEYS.SERVICES_SEARCH('*'),
    CACHE_KEYS.TRENDING_SERVICES('*'),
    ...(serviceId ? [
      CACHE_KEYS.SERVICE_DETAILS(serviceId) + '*',
      CACHE_KEYS.SIMILAR_SERVICES(serviceId)
    ] : [])
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// 📈 Calculate Conversion Rate
async function calculateConversionRate(serviceId) {
  const views = await ServiceView.count({ where: { serviceId } });
  const bookings = await Booking.count({ 
    where: { serviceId, status: 'completed' } 
  });

  return views > 0 ? (bookings / views) * 100 : 0;
}

// 📍 Calculate User Distance
async function calculateUserDistance(userId, service) {
  const userLocation = await LocationService.getUserLocation(userId);
  if (!userLocation || !service.location) return null;

  return await LocationService.calculateDistance(
    userLocation.coordinates,
    {
      latitude: service.location.coordinates?.y || service.location.y,
      longitude: service.location.coordinates?.x || service.location.x
    }
  );
}

// 💼 Check if User Can Book Service
async function canUserBookService(userId, serviceId) {
  if (!userId) return false;
  
  const user = await User.findByPk(userId);
  const service = await Service.findByPk(serviceId);
  
  return user && service && user.id !== service.providerId;
}

// 📊 Calculate Provider Completion Rate
async function calculateProviderCompletionRate(providerId) {
  const totalBookings = await Booking.count({
    include: [{
      model: Service,
      where: { providerId }
    }]
  });

  const completedBookings = await Booking.count({
    include: [{
      model: Service,
      where: { providerId }
    }],
    where: { status: 'completed' }
  });

  return totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
}

module.exports = router;

