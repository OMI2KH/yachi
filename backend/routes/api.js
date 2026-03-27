const express = require('express');
const { Product, User, Transaction, Review, Category, Advertisement } = require('../models');
const { Sequelize, Op } = require('sequelize');
const geoip = require('geoip-lite');
const axios = require('axios');
const redis = require('../config/redis');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { LocationService } = require('../services/locationService');
const { RecommendationEngine } = require('../services/recommendationEngine');
const { PricingEngine } = require('../services/pricingEngine');
const monetizationRoutes = require('./monetization');

const router = express.Router();

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  PRODUCTS: (params) => `marketplace:products:${Buffer.from(JSON.stringify(params)).toString('base64')}`,
  LEADERBOARD: (type) => `marketplace:leaderboard:${type}`,
  CATEGORIES: 'marketplace:categories',
  RECOMMENDATIONS: (userId) => `marketplace:recommendations:${userId}`,
  TRENDING: (location) => `marketplace:trending:${location}`
};

// 🎯 INPUT VALIDATION SCHEMAS
const ProductFilterSchema = {
  search: z.string().min(1).max(100).optional(),
  categories: z.array(z.string()).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minRating: z.number().min(1).max(5).optional(),
  features: z.array(z.string()).optional(),
  availability: z.enum(['immediate', 'within_week', 'flexible']).optional(),
  sortBy: z.enum(['relevance', 'price_low', 'price_high', 'rating', 'distance', 'trending']).default('relevance'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
};

// 🚀 MIDDLEWARE
const enhanceWithUserLocation = async (req, res, next) => {
  try {
    // 🌍 Get user location from multiple sources
    const locationData = await LocationService.getUserLocation(req);
    
    req.userLocation = {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      country: locationData.country,
      city: locationData.city,
      accuracy: locationData.accuracy,
      source: locationData.source
    };
    
    next();
  } catch (error) {
    console.warn('Location detection failed:', error.message);
    req.userLocation = null;
    next();
  }
};

// 🎯 GET Advanced Product Discovery with Intelligent Filtering
router.get('/products', enhanceWithUserLocation, async (req, res) => {
  try {
    const {
      search,
      categories,
      minPrice,
      maxPrice,
      minRating,
      features,
      availability,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    // 🛡️ Validate input
    const validatedParams = ProductFilterSchema.parse({
      search, categories, minPrice, maxPrice, minRating, features, availability, sortBy, page, limit
    });

    // 🎯 Generate cache key
    const cacheKey = CACHE_KEYS.PRODUCTS({
      ...validatedParams,
      location: req.userLocation ? 
        `${req.userLocation.latitude.toFixed(2)}_${req.userLocation.longitude.toFixed(2)}` : 'global'
    });

    // 🔍 Try cache first
    const cachedResults = await redis.get(cacheKey);
    if (cachedResults) {
      return res.json({
        success: true,
        ...JSON.parse(cachedResults),
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // 💰 Dynamic Currency Conversion
    const exchangeData = await PricingEngine.getExchangeRates(req.userLocation?.country);
    const exchangeRate = exchangeData.rate;
    const currency = exchangeData.currency;

    // 🎯 Build advanced where clause
    const where = await buildProductWhereClause(validatedParams, req.userLocation, exchangeRate);

    // 🔍 Build include with optimized attributes
    const include = [
      {
        model: User,
        as: 'provider',
        attributes: [
          'id', 'name', 'avatar', 'verifiedBadge', 'premiumListing', 
          'level', 'rating', 'completedJobs', 'responseTime', 'onlineStatus'
        ],
        include: [
          {
            model: Review,
            as: 'reviews',
            attributes: ['rating', 'comment', 'createdAt'],
            limit: 3,
            order: [['createdAt', 'DESC']]
          }
        ]
      },
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'description']
      }
    ];

    // 📊 Build order based on sort strategy
    const order = buildSortOrder(validatedParams.sortBy, req.userLocation);

    // 🎯 Execute query with pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit;

    const [products, totalCount] = await Promise.all([
      Product.findAll({
        where,
        include,
        order,
        limit: validatedParams.limit,
        offset,
        subQuery: false
      }),
      Product.count({ where })
    ]);

    // 💰 Convert prices to user's currency
    const productsWithConvertedPrices = products.map(product => ({
      ...product.toJSON(),
      price: {
        amount: +(product.price * exchangeRate).toFixed(2),
        currency,
        originalAmount: product.price,
        originalCurrency: 'USD'
      },
      distance: product.distance,
      relevanceScore: product.relevanceScore
    }));

    // 🎪 Apply gamification scoring
    const enhancedProducts = await YachiGamification.enhanceProductListings(
      productsWithConvertedPrices, 
      req.user?.id
    );

    // 🎯 Generate intelligent recommendations
    const recommendations = req.user ? 
      await RecommendationEngine.getPersonalizedRecommendations(req.user.id, enhancedProducts) : 
      await RecommendationEngine.getTrendingRecommendations(req.userLocation);

    const result = {
      products: enhancedProducts,
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
      location: req.userLocation,
      currency
    };

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result));

    // 📊 Track search analytics
    YachiAnalytics.trackProductSearch({
      query: validatedParams.search,
      filters: validatedParams,
      location: req.userLocation,
      resultCount: totalCount,
      userId: req.user?.id
    });

    res.json({
      success: true,
      ...result,
      source: 'database',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Product Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🏆 GET Advanced Leaderboards with Multiple Categories
router.get('/leaderboards', async (req, res) => {
  try {
    const { type = 'providers', timeframe = 'monthly', category } = req.query;

    const cacheKey = CACHE_KEYS.LEADERBOARD(`${type}_${timeframe}_${category || 'all'}`);
    const cachedLeaderboard = await redis.get(cacheKey);

    if (cachedLeaderboard) {
      return res.json({
        success: true,
        ...JSON.parse(cachedLeaderboard),
        source: 'cache'
      });
    }

    let leaderboard;
    switch (type) {
      case 'providers':
        leaderboard = await getProviderLeaderboard(timeframe, category);
        break;
      case 'clients':
        leaderboard = await getClientLeaderboard(timeframe);
        break;
      case 'categories':
        leaderboard = await getCategoryLeaderboard(timeframe);
        break;
      default:
        leaderboard = await getProviderLeaderboard(timeframe, category);
    }

    // 🎪 Enhance with gamification data
    const enhancedLeaderboard = await YachiGamification.enhanceLeaderboard(leaderboard, type);

    const result = {
      type,
      timeframe,
      category,
      leaderboard: enhancedLeaderboard,
      updatedAt: new Date().toISOString()
    };

    // 💾 Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    console.error('Leaderboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboards'
    });
  }
});

// 🎯 GET Intelligent Product Recommendations
router.get('/recommendations', authenticateToken, enhanceWithUserLocation, async (req, res) => {
  try {
    const { type = 'personalized', limit = 10 } = req.query;

    const cacheKey = CACHE_KEYS.RECOMMENDATIONS(`${req.user.id}_${type}_${limit}`);
    const cachedRecommendations = await redis.get(cacheKey);

    if (cachedRecommendations) {
      return res.json({
        success: true,
        ...JSON.parse(cachedRecommendations),
        source: 'cache'
      });
    }

    let recommendations;
    switch (type) {
      case 'personalized':
        recommendations = await RecommendationEngine.getPersonalizedRecommendations(
          req.user.id, 
          limit
        );
        break;
      case 'trending':
        recommendations = await RecommendationEngine.getTrendingRecommendations(
          req.userLocation,
          limit
        );
        break;
      case 'similar':
        recommendations = await RecommendationEngine.getSimilarToRecentlyViewed(
          req.user.id,
          limit
        );
        break;
      case 'featured':
        recommendations = await RecommendationEngine.getFeaturedRecommendations(limit);
        break;
    }

    const result = {
      type,
      recommendations,
      generatedAt: new Date().toISOString()
    };

    // 💾 Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations'
    });
  }
});

// 📊 GET Marketplace Analytics
router.get('/analytics', authenticateToken, authorizeRoles(['admin', 'analyst']), async (req, res) => {
  try {
    const { timeframe = '30d', metric = 'all' } = req.query;

    const analytics = await YachiAnalytics.getMarketplaceAnalytics(timeframe, metric);

    res.json({
      success: true,
      data: analytics,
      timeframe,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace analytics'
    });
  }
});

// 🎯 GET Categories with Statistics
router.get('/categories', async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.CATEGORIES;
    const cachedCategories = await redis.get(cacheKey);

    if (cachedCategories) {
      return res.json({
        success: true,
        data: JSON.parse(cachedCategories),
        source: 'cache'
      });
    }

    const categories = await Category.findAll({
      include: [{
        model: Product,
        attributes: [],
        required: false
      }],
      attributes: [
        'id', 'name', 'icon', 'description', 'color',
        [Sequelize.fn('COUNT', Sequelize.col('products.id')), 'productCount'],
        [Sequelize.fn('AVG', Sequelize.col('products.rating')), 'averageRating'],
        [Sequelize.fn('AVG', Sequelize.col('products.price')), 'averagePrice']
      ],
      group: ['Category.id'],
      order: [[Sequelize.literal('productCount'), 'DESC']]
    });

    // 💾 Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(categories));

    res.json({
      success: true,
      data: categories,
      source: 'database'
    });

  } catch (error) {
    console.error('Categories Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// 🎯 UTILITY FUNCTIONS

// 🎯 Build Advanced Where Clause
async function buildProductWhereClause(params, userLocation, exchangeRate) {
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
  if (params.categories && params.categories.length > 0) {
    where.categoryId = { [Op.in]: params.categories };
  }

  // 💰 Price filter with currency conversion
  if (params.minPrice || params.maxPrice) {
    const priceInUSD = {
      ...(params.minPrice && { [Op.gte]: params.minPrice / exchangeRate }),
      ...(params.maxPrice && { [Op.lte]: params.maxPrice / exchangeRate })
    };
    if (Object.keys(priceInUSD).length > 0) {
      where.price = priceInUSD;
    }
  }

  // ⭐ Rating filter
  if (params.minRating) {
    where.rating = { [Op.gte]: params.minRating };
  }

  // 🎯 Feature filters
  if (params.features && params.features.length > 0) {
    where.features = { [Op.overlap]: params.features };
  }

  // 📅 Availability filter
  if (params.availability) {
    where.availability = params.availability;
  }

  // 🌍 Location-based filtering
  if (userLocation && userLocation.latitude && userLocation.longitude) {
    where.location = Sequelize.literal(
      `ST_DWithin(location, ST_SetSRID(ST_MakePoint(${userLocation.longitude}, ${userLocation.latitude}), 4326), 50000)`
    );
  }

  return where;
}

// 🎯 Build Sort Order
function buildSortOrder(sortBy, userLocation) {
  const sortStrategies = {
    relevance: [
      ['featured', 'DESC'],
      ['rating', 'DESC'],
      ['completedJobs', 'DESC']
    ],
    price_low: [['price', 'ASC']],
    price_high: [['price', 'DESC']],
    rating: [['rating', 'DESC']],
    distance: userLocation ? [
      [Sequelize.literal(`ST_Distance(location, ST_SetSRID(ST_MakePoint(${userLocation.longitude}, ${userLocation.latitude}), 4326))`), 'ASC']
    ] : [['rating', 'DESC']],
    trending: [
      ['viewCount', 'DESC'],
      ['createdAt', 'DESC']
    ]
  };

  return sortStrategies[sortBy] || sortStrategies.relevance;
}

// 🏆 Provider Leaderboard
async function getProviderLeaderboard(timeframe, category) {
  const dateFilter = getTimeframeFilter(timeframe);

  return await User.findAll({
    where: {
      role: { [Op.in]: ['provider', 'graduate'] },
      ...dateFilter
    },
    include: [{
      model: Transaction,
      as: 'completedTransactions',
      attributes: [],
      where: { status: 'completed' },
      required: false
    }],
    attributes: [
      'id', 'name', 'avatar', 'verifiedBadge', 'premiumListing', 'level', 'rating',
      [Sequelize.fn('COUNT', Sequelize.col('completedTransactions.id')), 'completedJobs'],
      [Sequelize.fn('SUM', Sequelize.col('completedTransactions.amount')), 'totalEarnings'],
      [Sequelize.fn('AVG', Sequelize.col('completedTransactions.rating')), 'averageRating']
    ],
    group: ['User.id'],
    order: [[Sequelize.literal('completedJobs'), 'DESC']],
    limit: 20
  });
}

// 🏆 Client Leaderboard
async function getClientLeaderboard(timeframe) {
  const dateFilter = getTimeframeFilter(timeframe);

  return await User.findAll({
    where: {
      role: 'client',
      ...dateFilter
    },
    include: [{
      model: Transaction,
      as: 'clientTransactions',
      attributes: [],
      where: { status: 'completed' },
      required: false
    }],
    attributes: [
      'id', 'name', 'avatar', 'premiumListing', 'level',
      [Sequelize.fn('COUNT', Sequelize.col('clientTransactions.id')), 'jobsPosted'],
      [Sequelize.fn('SUM', Sequelize.col('clientTransactions.amount')), 'totalSpent']
    ],
    group: ['User.id'],
    order: [[Sequelize.literal('jobsPosted'), 'DESC']],
    limit: 20
  });
}

// 🎯 Get Available Filters
async function getAvailableFilters(whereClause) {
  const filters = await Promise.all([
    // Price range
    Product.findAll({
      where: whereClause,
      attributes: [
        [Sequelize.fn('MIN', Sequelize.col('price')), 'minPrice'],
        [Sequelize.fn('MAX', Sequelize.col('price')), 'maxPrice']
      ],
      raw: true
    }),
    // Categories with counts
    Category.findAll({
      include: [{
        model: Product,
        attributes: [],
        where: whereClause,
        required: false
      }],
      attributes: [
        'id', 'name',
        [Sequelize.fn('COUNT', Sequelize.col('products.id')), 'count']
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

// ⏰ Timeframe Filter Helper
function getTimeframeFilter(timeframe) {
  const now = new Date();
  let startDate;

  switch (timeframe) {
    case 'weekly':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'monthly':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'quarterly':
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'yearly':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  return { createdAt: { [Op.gte]: startDate } };
}

// Mount monetization subroutes
router.use('/monetization', monetizationRoutes);

module.exports = router;
