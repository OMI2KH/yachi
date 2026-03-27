const express = require('express');
const { Op, Sequelize } = require('sequelize');
const { Product, User, Category, Review, ProductView, Favorite, Transaction } = require('../models');
const auth = require('../middleware/auth');
const { z } = require('zod');
const { YachiAI } = require('../services/yachiAI');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiRecommendations } = require('../services/yachiRecommendations');
const { LocationService } = require('../services/locationService');
const { PricingEngine } = require('../services/pricingEngine');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const ProductSchema = {
  query: z.object({
    search: z.string().max(100).optional(),
    category: z.string().optional(),
    categories: z.array(z.string()).optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
    minRating: z.number().min(1).max(5).optional(),
    location: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      radius: z.number().positive().default(50) // km
    }).optional(),
    features: z.array(z.string()).optional(),
    availability: z.enum(['in_stock', 'out_of_stock', 'pre_order']).optional(),
    sortBy: z.enum(['relevance', 'price_low', 'price_high', 'rating', 'distance', 'trending', 'newest']).default('relevance'),
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
    local: z.boolean().default(false),
    premiumOnly: z.boolean().default(false),
    verifiedOnly: z.boolean().default(false)
  }),

  create: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(2000),
    categoryId: z.number().int().positive(),
    price: z.number().positive(),
    currency: z.string().default('ETB'),
    quantity: z.number().int().positive().default(1),
    condition: z.enum(['new', 'like_new', 'good', 'fair']).default('good'),
    features: z.array(z.string()).optional(),
    specifications: z.object({}).passthrough().optional(),
    location: z.object({
      address: z.string(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number()
      }),
      deliveryRadius: z.number().positive().default(25) // km
    }),
    images: z.array(z.string().url()).min(1).max(10),
    deliveryOptions: z.array(z.enum(['pickup', 'delivery', 'shipping'])).default(['pickup']),
    paymentMethods: z.array(z.enum(['telebirr', 'cbebirr', 'cash', 'card'])).default(['cash']),
    tags: z.array(z.string()).optional()
  }),

  update: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().min(10).max(2000).optional(),
    price: z.number().positive().optional(),
    quantity: z.number().int().min(0).optional(),
    status: z.enum(['active', 'inactive', 'sold', 'reserved']).optional(),
    features: z.array(z.string()).optional(),
    specifications: z.object({}).passthrough().optional()
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  PRODUCTS_SEARCH: (params) => `products:search:${Buffer.from(JSON.stringify(params)).toString('base64')}`,
  PRODUCT_DETAILS: (productId) => `product:details:${productId}`,
  USER_PRODUCTS: (userId) => `products:user:${userId}`,
  CATEGORY_PRODUCTS: (categoryId) => `products:category:${categoryId}`,
  TRENDING_PRODUCTS: (location) => `products:trending:${location}`,
  RECOMMENDATIONS: (userId) => `products:recommendations:${userId}`
};

// 🚀 GET INTELLIGENT PRODUCT DISCOVERY
router.get('/', auth, async (req, res) => {
  try {
    const validatedParams = ProductSchema.query.parse(req.query);

    // 🎯 Generate cache key
    const cacheKey = CACHE_KEYS.PRODUCTS_SEARCH(validatedParams);
    const cachedResults = await redis.get(cacheKey);

    if (cachedResults) {
      return res.json({
        success: true,
        ...JSON.parse(cachedResults),
        source: 'cache'
      });
    }

    // 🎯 Build advanced where clause
    const where = await buildProductWhereClause(validatedParams);

    // 🎯 Build include with optimized attributes
    const include = [
      {
        model: User,
        as: 'owner',
        attributes: [
          'id', 'name', 'avatar', 'verifiedBadge', 'premiumListing', 
          'rating', 'responseRate', 'joinedAt'
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
    const order = buildProductSortOrder(validatedParams.sortBy, validatedParams.location);

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

    // 🎪 Enhance products with gamification and analytics
    const enhancedProducts = await enhanceProductsWithAnalytics(products, req.user.userId);

    // 🎯 Generate intelligent recommendations
    const recommendations = await YachiRecommendations.getProductRecommendations(
      req.user.userId, 
      enhancedProducts,
      validatedParams
    );

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
      searchMetadata: await YachiAI.analyzeSearchPattern(validatedParams, totalCount)
    };

    // 💾 Cache for 3 minutes
    await redis.setex(cacheKey, 180, JSON.stringify(result));

    // 📊 Track search analytics
    await YachiAnalytics.trackProductSearch({
      query: validatedParams.search,
      filters: validatedParams,
      userId: req.user.userId,
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

    console.error('Product Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      code: 'PRODUCT_SEARCH_FAILED'
    });
  }
});

// 🚀 GET PRODUCT DETAILS WITH INTELLIGENT DATA
router.get('/:id', auth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { includeSimilar = true, includeAnalytics = false } = req.query;

    const cacheKey = CACHE_KEYS.PRODUCT_DETAILS(productId) + `:${includeSimilar}:${includeAnalytics}`;
    const cachedProduct = await redis.get(cacheKey);

    if (cachedProduct) {
      return res.json({
        success: true,
        data: JSON.parse(cachedProduct),
        source: 'cache'
      });
    }

    const product = await Product.findByPk(productId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: [
            'id', 'name', 'avatar', 'verifiedBadge', 'premiumListing',
            'rating', 'responseRate', 'joinedAt', 'onlineStatus'
          ],
          include: [{
            model: Product,
            as: 'products',
            where: { id: { [Op.ne]: productId } },
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

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // 📊 Track product view
    await ProductView.create({
      productId,
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 🎯 Enhance product data
    const enhancedProduct = await enhanceProductData(product, req.user.userId, {
      includeSimilar,
      includeAnalytics
    });

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(enhancedProduct));

    res.json({
      success: true,
      data: enhancedProduct,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Product Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product details',
      code: 'FETCH_PRODUCT_FAILED'
    });
  }
});

// 🚀 CREATE INTELLIGENT PRODUCT LISTING
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can create product listings',
        code: 'PROVIDERS_ONLY'
      });
    }

    const validatedData = ProductSchema.create.parse(req.body);

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 🎯 AI-Powered product optimization
      const aiOptimized = await YachiAI.optimizeProductListing({
        title: validatedData.title,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        price: validatedData.price,
        features: validatedData.features
      });

      // 📝 Create product with enhanced data
      const product = await Product.create({
        ownerId: req.user.userId,
        title: aiOptimized.optimizedTitle || validatedData.title,
        description: aiOptimized.optimizedDescription || validatedData.description,
        categoryId: validatedData.categoryId,
        price: validatedData.price,
        currency: validatedData.currency,
        quantity: validatedData.quantity,
        condition: validatedData.condition,
        features: validatedData.features,
        specifications: validatedData.specifications,
        location: Sequelize.literal(
          `ST_SetSRID(ST_MakePoint(${validatedData.location.coordinates.longitude}, ${validatedData.location.coordinates.latitude}), 4326)`
        ),
        locationMetadata: {
          address: validatedData.location.address,
          deliveryRadius: validatedData.location.deliveryRadius
        },
        images: validatedData.images,
        deliveryOptions: validatedData.deliveryOptions,
        paymentMethods: validatedData.paymentMethods,
        tags: validatedData.tags,
        status: 'active',
        metadata: {
          aiOptimized: !!aiOptimized.optimizedTitle,
          qualityScore: aiOptimized.qualityScore,
          suggestedPrice: aiOptimized.suggestedPrice,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      }, { transaction });

      // 🎪 Award product creation points
      await YachiGamification.awardProductCreation(req.user.userId, product);

      // 📊 Track listing analytics
      await YachiAnalytics.trackProductEvent('created', product);

      await transaction.commit();

      // 🗑️ Clear relevant caches
      await clearProductCaches(req.user.userId, validatedData.categoryId);

      res.status(201).json({
        success: true,
        message: 'Product listed successfully',
        data: {
          product,
          optimization: aiOptimized,
          nextSteps: ['add_more_details', 'share_listing', 'preview_listing']
        },
        gamification: {
          pointsAwarded: 25,
          achievement: 'First Listing'
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

    console.error('Create Product Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product listing',
      code: 'PRODUCT_CREATION_FAILED'
    });
  }
});

// 🚀 UPDATE PRODUCT LISTING
router.put('/:id', auth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const validatedData = ProductSchema.update.parse(req.body);

    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    if (product.ownerId !== req.user.userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product',
        code: 'UPDATE_UNAUTHORIZED'
      });
    }

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 📝 Update product
      await product.update(validatedData, { transaction });

      // 🎯 Re-optimize with AI if title/description changed
      if (validatedData.title || validatedData.description) {
        const aiOptimized = await YachiAI.optimizeProductListing({
          title: validatedData.title || product.title,
          description: validatedData.description || product.description,
          categoryId: product.categoryId,
          price: product.price,
          features: product.features
        });

        if (aiOptimized.qualityScore > product.metadata?.qualityScore) {
          await product.update({
            title: aiOptimized.optimizedTitle,
            description: aiOptimized.optimizedDescription,
            metadata: {
              ...product.metadata,
              aiOptimized: true,
              qualityScore: aiOptimized.qualityScore,
              lastOptimized: new Date().toISOString()
            }
          }, { transaction });
        }
      }

      await transaction.commit();

      // 🗑️ Clear caches
      await clearProductCaches(product.ownerId, product.categoryId, productId);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product
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

    console.error('Update Product Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      code: 'PRODUCT_UPDATE_FAILED'
    });
  }
});

// 🚀 TOGGLE PRODUCT FAVORITE
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    const existingFavorite = await Favorite.findOne({
      where: { productId, userId: req.user.userId }
    });

    if (existingFavorite) {
      // ❌ Remove favorite
      await existingFavorite.destroy();
      
      res.json({
        success: true,
        message: 'Product removed from favorites',
        data: { favorited: false }
      });
    } else {
      // ✅ Add favorite
      await Favorite.create({
        productId,
        userId: req.user.userId
      });

      // 🎪 Award favorite points
      await YachiGamification.awardProductFavorite(req.user.userId, product);

      res.json({
        success: true,
        message: 'Product added to favorites',
        data: { favorited: true },
        gamification: {
          pointsAwarded: 5,
          streak: await YachiGamification.getFavoriteStreak(req.user.userId)
        }
      });
    }

    // 🗑️ Clear relevant caches
    await redis.del(CACHE_KEYS.RECOMMENDATIONS(req.user.userId));

  } catch (error) {
    console.error('Toggle Favorite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite status',
      code: 'FAVORITE_UPDATE_FAILED'
    });
  }
});

// 🚀 GET TRENDING PRODUCTS
router.get('/trending/global', auth, async (req, res) => {
  try {
    const { limit = 20, category } = req.query;

    const cacheKey = CACHE_KEYS.TRENDING_PRODUCTS('global') + `:${limit}:${category}`;
    const cachedTrending = await redis.get(cacheKey);

    if (cachedTrending) {
      return res.json({
        success: true,
        data: JSON.parse(cachedTrending),
        source: 'cache'
      });
    }

    const trendingProducts = await YachiAnalytics.getTrendingProducts({
      limit: parseInt(limit),
      category,
      timeframe: '7d'
    });

    // 💾 Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(trendingProducts));

    res.json({
      success: true,
      data: trendingProducts,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Trending Products Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending products',
      code: 'FETCH_TRENDING_FAILED'
    });
  }
});

// 🚀 GET PERSONALIZED RECOMMENDATIONS
router.get('/recommendations/personalized', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const cacheKey = CACHE_KEYS.RECOMMENDATIONS(req.user.userId) + `:${limit}`;
    const cachedRecommendations = await redis.get(cacheKey);

    if (cachedRecommendations) {
      return res.json({
        success: true,
        data: JSON.parse(cachedRecommendations),
        source: 'cache'
      });
    }

    const recommendations = await YachiRecommendations.getPersonalizedRecommendations(
      req.user.userId,
      parseInt(limit)
    );

    // 💾 Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(recommendations));

    res.json({
      success: true,
      data: recommendations,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      code: 'FETCH_RECOMMENDATIONS_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 🎯 Build Advanced Where Clause
async function buildProductWhereClause(params) {
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
    where.price = {
      ...(params.minPrice && { [Op.gte]: params.minPrice }),
      ...(params.maxPrice && { [Op.lte]: params.maxPrice })
    };
  }

  // ⭐ Rating filter
  if (params.minRating) {
    where.rating = { [Op.gte]: params.minRating };
  }

  // 🎯 Feature filters
  if (params.features && params.features.length > 0) {
    where.features = { [Op.overlap]: params.features };
  }

  // 📦 Availability filter
  if (params.availability) {
    where.quantity = params.availability === 'in_stock' ? { [Op.gt]: 0 } : { [Op.lte]: 0 };
  }

  // 🌍 Location-based filtering
  if (params.location && params.location.latitude && params.location.longitude) {
    where.location = Sequelize.literal(
      `ST_DWithin(location, ST_SetSRID(ST_MakePoint(${params.location.longitude}, ${params.location.latitude}), 4326), ${params.location.radius * 1000})`
    );
  }

  // 🇪🇹 Local products filter
  if (params.local) {
    where.country = 'ET';
  }

  // 💎 Premium only filter
  if (params.premiumOnly) {
    where.isPremium = true;
  }

  // ✅ Verified only filter
  if (params.verifiedOnly) {
    where['$owner.verifiedBadge$'] = true;
  }

  return where;
}

// 🎯 Build Product Sort Order
function buildProductSortOrder(sortBy, location) {
  const sortStrategies = {
    relevance: [
      ['isPremium', 'DESC'],
      ['rating', 'DESC'],
      ['viewCount', 'DESC']
    ],
    price_low: [['price', 'ASC']],
    price_high: [['price', 'DESC']],
    rating: [['rating', 'DESC']],
    distance: location ? [
      [Sequelize.literal(`ST_Distance(location, ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326))`), 'ASC']
    ] : [['rating', 'DESC']],
    trending: [
      ['viewCount', 'DESC'],
      ['createdAt', 'DESC']
    ],
    newest: [['createdAt', 'DESC']]
  };

  return sortStrategies[sortBy] || sortStrategies.relevance;
}

// 🎯 Enhance Products with Analytics
async function enhanceProductsWithAnalytics(products, userId) {
  return await Promise.all(
    products.map(async (product) => {
      const enhanced = product.toJSON();
      
      // 📊 Add engagement metrics
      enhanced.engagement = {
        viewCount: await ProductView.count({ where: { productId: product.id } }),
        favoriteCount: await Favorite.count({ where: { productId: product.id } }),
        isFavorited: await Favorite.findOne({ 
          where: { productId: product.id, userId } 
        }).then(fav => !!fav)
      };

      // 💰 Add pricing insights
      enhanced.pricing = await PricingEngine.analyzeProductPrice(product);

      // 🎪 Add gamification data
      enhanced.gamification = await YachiGamification.getProductGamificationData(product.id);

      return enhanced;
    })
  );
}

// 🎯 Enhance Product Data
async function enhanceProductData(product, userId, options) {
  const enhanced = product.toJSON();

  // 📊 Add detailed analytics
  enhanced.analytics = {
    totalViews: await ProductView.count({ where: { productId: product.id } }),
    dailyViews: await ProductView.count({
      where: {
        productId: product.id,
        createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }),
    favoriteCount: await Favorite.count({ where: { productId: product.id } }),
    conversionRate: await calculateConversionRate(product.id)
  };

  // 🎯 Add AI-powered insights
  if (options.includeAnalytics) {
    enhanced.insights = await YachiAI.getProductInsights(product.id);
  }

  // 🔍 Add similar products
  if (options.includeSimilar) {
    enhanced.similarProducts = await YachiRecommendations.getSimilarProducts(product.id, 6);
  }

  // ❤️ Add user-specific data
  enhanced.userContext = {
    isFavorited: await Favorite.findOne({ 
      where: { productId: product.id, userId } 
    }).then(fav => !!fav),
    canContact: await canUserContactSeller(userId, product.ownerId),
    distance: await calculateUserDistance(userId, product)
  };

  return enhanced;
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
        'id', 'name', 'icon',
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

// 🗑️ Clear Product Caches
async function clearProductCaches(ownerId, categoryId, productId = null) {
  const patterns = [
    CACHE_KEYS.USER_PRODUCTS(ownerId) + '*',
    CACHE_KEYS.CATEGORY_PRODUCTS(categoryId) + '*',
    CACHE_KEYS.PRODUCTS_SEARCH('*'),
    CACHE_KEYS.TRENDING_PRODUCTS('*'),
    ...(productId ? [CACHE_KEYS.PRODUCT_DETAILS(productId) + '*'] : [])
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// 📈 Calculate Conversion Rate
async function calculateConversionRate(productId) {
  const views = await ProductView.count({ where: { productId } });
  const purchases = await Transaction.count({ 
    where: { productId, status: 'completed' } 
  });

  return views > 0 ? (purchases / views) * 100 : 0;
}

// 📍 Calculate User Distance
async function calculateUserDistance(userId, product) {
  const userLocation = await LocationService.getUserLocation(userId);
  if (!userLocation || !product.location) return null;

  return await LocationService.calculateDistance(
    userLocation.coordinates,
    {
      latitude: product.location.coordinates?.y || product.location.y,
      longitude: product.location.coordinates?.x || product.location.x
    }
  );
}

// 💬 Check if User Can Contact Seller
async function canUserContactSeller(userId, sellerId) {
  if (userId === sellerId) return false;
  
  const seller = await User.findByPk(sellerId, {
    attributes: ['privacySettings']
  });
  
  return seller?.privacySettings?.allowMessages !== false;
}

module.exports = router;
