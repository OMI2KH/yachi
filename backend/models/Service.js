// models/Service.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { YachiAI } = require('../services/yachiAI');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const logger = require('../utils/logger');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Service Information
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Service title is required' },
      len: { args: [5, 255], msg: 'Title must be between 5 and 255 characters' }
    }
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Service description is required' },
      len: { args: [50, 2000], msg: 'Description must be between 50 and 2000 characters' }
    }
  },
  
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Service category is required' },
      isIn: {
        args: [[
          'plumbing', 'electrical', 'cleaning', 'tutoring', 'beauty', 
          'fitness', 'repair', 'installation', 'transport', 'catering',
          'event_planning', 'healthcare', 'consulting', 'construction',
          'landscaping', 'pet_care', 'personal_care', 'tech_support',
          'moving_services', 'other'
        ]],
        msg: 'Invalid service category'
      }
    }
  },
  
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Pricing Information
  pricingType: {
    type: DataTypes.ENUM('fixed', 'hourly', 'daily', 'weekly', 'monthly', 'custom'),
    defaultValue: 'fixed',
    allowNull: false
  },
  
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Price must be positive' },
      isDecimal: { msg: 'Price must be a valid decimal number' }
    }
  },
  
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'ETB',
    validate: {
      isAlpha: { msg: 'Currency must be alphabetic' },
      len: { args: [3, 3], msg: 'Currency must be 3 characters' }
    }
  },
  
  // Service Details
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated duration in minutes'
  },
  
  availability: {
    type: DataTypes.ENUM('immediate', 'scheduled', 'custom'),
    defaultValue: 'scheduled'
  },
  
  serviceArea: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Geographical area where service is provided'
  },
  
  // Media and Attachments
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidImages(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Images must be an array');
        }
        if (value && value.length > 10) {
          throw new Error('Cannot have more than 10 images');
        }
      }
    }
  },
  
  videos: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidVideos(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Videos must be an array');
        }
        if (value && value.length > 3) {
          throw new Error('Cannot have more than 3 videos');
        }
      }
    }
  },
  
  documents: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidDocuments(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Documents must be an array');
        }
      }
    }
  },
  
  // Service Requirements
  requirements: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Client requirements for this service'
  },
  
  includedItems: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Items included in the service'
  },
  
  excludedItems: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Items not included in the service'
  },
  
  // Service Metrics
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 0.0,
    validate: {
      min: { args: [0], msg: 'Rating cannot be less than 0' },
      max: { args: [5], msg: 'Rating cannot be greater than 5' }
    }
  },
  
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  bookingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  completionRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.0,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  responseTime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Average response time in minutes'
  },
  
  // SEO and Discovery
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidTags(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Tags must be an array');
        }
        if (value && value.length > 20) {
          throw new Error('Cannot have more than 20 tags');
        }
      }
    }
  },
  
  searchKeywords: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'AI-generated search keywords'
  },
  
  // Status and Visibility
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'inactive', 'rejected', 'under_review'),
    defaultValue: 'draft',
    allowNull: false
  },
  
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'unlisted'),
    defaultValue: 'public'
  },
  
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  premiumListing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Timestamps
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  lastBookedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // AI and Analytics
  aiAnalysis: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'AI-powered service analysis and recommendations'
  },
  
  performanceMetrics: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Service performance analytics'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional service metadata'
  }

}, {
  tableName: 'services',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_service_provider',
      fields: ['provider_id']
    },
    {
      name: 'idx_service_category',
      fields: ['category']
    },
    {
      name: 'idx_service_status',
      fields: ['status']
    },
    {
      name: 'idx_service_rating',
      fields: ['rating']
    },
    {
      name: 'idx_service_price',
      fields: ['price']
    },
    {
      name: 'idx_service_location',
      fields: ['service_area'],
      using: 'GIN'
    },
    {
      name: 'idx_service_tags',
      fields: ['tags'],
      using: 'GIN'
    },
    {
      name: 'idx_service_search',
      fields: ['title', 'description'],
      type: 'FULLTEXT'
    }
  ],
  hooks: {
    beforeValidate: async (service) => {
      await Service.hooks.beforeValidateHook(service);
    },
    afterCreate: async (service) => {
      await Service.hooks.afterCreateHook(service);
    },
    afterUpdate: async (service) => {
      await Service.hooks.afterUpdateHook(service);
    },
    afterDestroy: async (service) => {
      await Service.hooks.afterDestroyHook(service);
    }
  }
});

// Static Methods
Service.hooks = {
  /**
   * Before validate hook
   */
  beforeValidateHook: async (service) => {
    if (service.isNewRecord || service.changed('title') || service.changed('description')) {
      await Service.hooks.generateAIAnalysis(service);
    }
    
    if (service.isNewRecord || service.changed('status')) {
      await Service.hooks.handleStatusChange(service);
    }
  },

  /**
   * Generate AI analysis for service
   */
  generateAIAnalysis: async (service) => {
    try {
      const analysis = await YachiAI.analyzeService({
        title: service.title,
        description: service.description,
        category: service.category,
        price: service.price,
        pricingType: service.pricingType
      });

      service.aiAnalysis = analysis;
      
      // Generate search keywords if not provided
      if (!service.searchKeywords || service.searchKeywords.length === 0) {
        service.searchKeywords = analysis.keywords || [];
      }
      
      // Generate tags if not provided
      if (!service.tags || service.tags.length === 0) {
        service.tags = analysis.tags || [];
      }

    } catch (error) {
      logger.error('AI analysis generation failed:', error);
      // Don't throw error to prevent service creation from failing
    }
  },

  /**
   * Handle service status changes
   */
  handleStatusChange: async (service) => {
    if (service.status === 'active' && !service.publishedAt) {
      service.publishedAt = new Date();
    }
    
    if (service.status === 'inactive' && service.previous('status') === 'active') {
      // Track service deactivation
      await YachiAnalytics.trackServiceDeactivation(service);
    }
  },

  /**
   * After create hook
   */
  afterCreateHook: async (service) => {
    try {
      // Track service creation
      await YachiAnalytics.trackServiceCreation(service);
      
      // Update provider's service count
      await Service.hooks.updateProviderStats(service.providerId);
      
    } catch (error) {
      logger.error('After create hook error:', error);
    }
  },

  /**
   * After update hook
   */
  afterUpdateHook: async (service) => {
    try {
      // Track service updates
      if (service.changed()) {
        await YachiAnalytics.trackServiceUpdate(service);
      }
      
      // Update provider stats if service count changed
      if (service.changed('status')) {
        await Service.hooks.updateProviderStats(service.providerId);
      }
      
    } catch (error) {
      logger.error('After update hook error:', error);
    }
  },

  /**
   * After destroy hook
   */
  afterDestroyHook: async (service) => {
    try {
      // Track service deletion
      await YachiAnalytics.trackServiceDeletion(service);
      
      // Update provider's service count
      await Service.hooks.updateProviderStats(service.providerId);
      
    } catch (error) {
      logger.error('After destroy hook error:', error);
    }
  },

  /**
   * Update provider statistics
   */
  updateProviderStats: async (providerId) => {
    try {
      const { User } = require('./index');
      
      const activeServicesCount = await Service.count({
        where: { 
          providerId, 
          status: 'active' 
        }
      });
      
      await User.update(
        { activeServicesCount },
        { where: { id: providerId } }
      );
      
    } catch (error) {
      logger.error('Provider stats update error:', error);
    }
  }
};

// Instance Methods
Service.prototype.getInstanceMethods = function() {
  return {
    /**
     * Check if service is available for booking
     */
    isAvailable: function() {
      return this.status === 'active' && this.visibility === 'public';
    },

    /**
     * Update service rating
     */
    updateRating: async function(newRating, reviewId) {
      const transaction = await sequelize.transaction();
      
      try {
        // Calculate new average rating
        const totalRating = (this.rating * this.reviewCount) + newRating;
        const newReviewCount = this.reviewCount + 1;
        const newAverageRating = totalRating / newReviewCount;
        
        // Update service
        await this.update({
          rating: newAverageRating,
          reviewCount: newReviewCount
        }, { transaction });
        
        // Update performance metrics
        await this.updatePerformanceMetrics(transaction);
        
        await transaction.commit();
        
        logger.info('Service rating updated', {
          serviceId: this.id,
          oldRating: this.rating,
          newRating: newAverageRating,
          reviewCount: newReviewCount
        });
        
        return newAverageRating;
        
      } catch (error) {
        await transaction.rollback();
        logger.error('Service rating update failed:', error);
        throw error;
      }
    },

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics: async function(transaction = null) {
      const options = transaction ? { transaction } : {};
      
      try {
        const { Booking, Review } = require('./index');
        
        // Get booking statistics
        const bookingStats = await Booking.findOne({
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalBookings'],
            [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "completed" THEN 1 ELSE 0 END')), 'completedBookings'],
            [sequelize.fn('AVG', sequelize.literal('TIMESTAMPDIFF(MINUTE, created_at, updated_at)')), 'avgCompletionTime']
          ],
          where: { serviceId: this.id },
          raw: true,
          ...options
        });

        // Get review statistics
        const reviewStats = await Review.findOne({
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews'],
            [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
            [sequelize.fn('SUM', sequelize.literal('CASE WHEN rating = 5 THEN 1 ELSE 0 END')), 'fiveStarReviews']
          ],
          where: { serviceId: this.id },
          raw: true,
          ...options
        });

        const performanceMetrics = {
          totalBookings: parseInt(bookingStats.totalBookings) || 0,
          completedBookings: parseInt(bookingStats.completedBookings) || 0,
          completionRate: bookingStats.totalBookings > 0 ? 
            (parseInt(bookingStats.completedBookings) / parseInt(bookingStats.totalBookings)) * 100 : 0,
          avgCompletionTime: parseFloat(bookingStats.avgCompletionTime) || 0,
          totalReviews: parseInt(reviewStats.totalReviews) || 0,
          averageRating: parseFloat(reviewStats.averageRating) || 0,
          fiveStarPercentage: reviewStats.totalReviews > 0 ? 
            (parseInt(reviewStats.fiveStarReviews) / parseInt(reviewStats.totalReviews)) * 100 : 0,
          lastUpdated: new Date().toISOString()
        };

        await this.update({ performanceMetrics }, options);
        
        return performanceMetrics;
        
      } catch (error) {
        logger.error('Performance metrics update failed:', error);
        throw error;
      }
    },

    /**
     * Add service image
     */
    addImage: async function(imageData) {
      const images = this.images || [];
      
      if (images.length >= 10) {
        throw new Error('Maximum 10 images allowed per service');
      }
      
      images.push({
        id: require('crypto').randomBytes(8).toString('hex'),
        url: imageData.url,
        thumbnailUrl: imageData.thumbnailUrl,
        caption: imageData.caption || '',
        isPrimary: imageData.isPrimary || false,
        uploadedAt: new Date().toISOString()
      });
      
      // If this is set as primary, update other images
      if (imageData.isPrimary) {
        images.forEach(img => {
          if (img.id !== imageData.id) {
            img.isPrimary = false;
          }
        });
      }
      
      await this.update({ images });
      return images;
    },

    /**
     * Remove service image
     */
    removeImage: async function(imageId) {
      const images = this.images.filter(img => img.id !== imageId);
      await this.update({ images });
      return images;
    },

    /**
     * Set primary image
     */
    setPrimaryImage: async function(imageId) {
      const images = this.images.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      }));
      
      await this.update({ images });
      return images;
    },

    /**
     * Update service availability
     */
    updateAvailability: async function(availabilityData) {
      const updates = {};
      
      if (availabilityData.availability) {
        updates.availability = availabilityData.availability;
      }
      
      if (availabilityData.serviceArea) {
        updates.serviceArea = {
          ...this.serviceArea,
          ...availabilityData.serviceArea
        };
      }
      
      await this.update(updates);
      return this;
    },

    /**
     * Get similar services
     */
    getSimilarServices: async function(limit = 5) {
      try {
        return await Service.findAll({
          where: {
            category: this.category,
            status: 'active',
            visibility: 'public',
            id: { [sequelize.Op.ne]: this.id }
          },
          include: [
            {
              model: sequelize.models.User,
              as: 'provider',
              attributes: ['id', 'name', 'avatar', 'rating', 'level']
            }
          ],
          order: [
            ['rating', 'DESC'],
            ['bookingCount', 'DESC'],
            ['createdAt', 'DESC']
          ],
          limit
        });
      } catch (error) {
        logger.error('Get similar services failed:', error);
        return [];
      }
    },

    /**
     * Check if service can be booked by user
     */
    canBeBookedBy: function(user) {
      // Service must be active and public
      if (!this.isAvailable()) {
        return { canBook: false, reason: 'Service is not available' };
      }
      
      // User cannot book their own service
      if (user.id === this.providerId) {
        return { canBook: false, reason: 'Cannot book your own service' };
      }
      
      // Check service area restrictions if any
      if (this.serviceArea && this.serviceArea.restricted) {
        // Implement location-based restrictions
        // This would require user's location data
      }
      
      return { canBook: true };
    },

    /**
     * Increment booking count
     */
    incrementBookingCount: async function() {
      const newCount = this.bookingCount + 1;
      await this.update({ 
        bookingCount: newCount,
        lastBookedAt: new Date()
      });
      return newCount;
    },

    /**
     * Get service analytics
     */
    getAnalytics: async function(timeRange = '30d') {
      try {
        const analytics = await YachiAnalytics.getServiceAnalytics(this.id, timeRange);
        return analytics;
      } catch (error) {
        logger.error('Get service analytics failed:', error);
        return null;
      }
    }
  };
};

// Static Methods
Service.findActiveServices = async function(filters = {}) {
  const where = { status: 'active', visibility: 'public' };
  
  // Apply filters
  if (filters.category) {
    where.category = filters.category;
  }
  
  if (filters.providerId) {
    where.providerId = filters.providerId;
  }
  
  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) where.price[sequelize.Op.gte] = filters.minPrice;
    if (filters.maxPrice) where.price[sequelize.Op.lte] = filters.maxPrice;
  }
  
  if (filters.minRating) {
    where.rating = { [sequelize.Op.gte]: filters.minRating };
  }
  
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { [sequelize.Op.overlap]: filters.tags };
  }
  
  return await Service.findAll({
    where,
    include: [
      {
        model: sequelize.models.User,
        as: 'provider',
        attributes: ['id', 'name', 'avatar', 'rating', 'level', 'faydaVerified']
      }
    ],
    order: this.buildOrder(filters.sortBy),
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

Service.buildOrder = function(sortBy = 'rating') {
  const orderMap = {
    rating: [['rating', 'DESC'], ['reviewCount', 'DESC']],
    price_low: [['price', 'ASC']],
    price_high: [['price', 'DESC']],
    newest: [['createdAt', 'DESC']],
    popular: [['bookingCount', 'DESC'], ['rating', 'DESC']],
    featured: [['featured', 'DESC'], ['premiumListing', 'DESC'], ['rating', 'DESC']]
  };
  
  return orderMap[sortBy] || orderMap.rating;
};

Service.searchServices = async function(query, filters = {}) {
  const where = {
    status: 'active',
    visibility: 'public',
    [sequelize.Op.or]: [
      { title: { [sequelize.Op.iLike]: `%${query}%` } },
      { description: { [sequelize.Op.iLike]: `%${query}%` } },
      { tags: { [sequelize.Op.contains]: [query] } },
      { searchKeywords: { [sequelize.Op.contains]: [query] } }
    ]
  };
  
  // Apply additional filters
  Object.assign(where, filters);
  
  return await Service.findAll({
    where,
    include: [
      {
        model: sequelize.models.User,
        as: 'provider',
        attributes: ['id', 'name', 'avatar', 'rating', 'level', 'responseTime']
      }
    ],
    order: [['rating', 'DESC']],
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

Service.getPopularCategories = async function(limit = 10) {
  const results = await Service.findAll({
    attributes: [
      'category',
      [sequelize.fn('COUNT', sequelize.col('id')), 'serviceCount'],
      [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
      [sequelize.fn('SUM', sequelize.col('booking_count')), 'totalBookings']
    ],
    where: {
      status: 'active',
      visibility: 'public'
    },
    group: ['category'],
    order: [[sequelize.literal('"totalBookings"'), 'DESC']],
    limit
  });
  
  return results;
};

Service.getProviderServices = async function(providerId, options = {}) {
  const where = { providerId };
  
  if (options.status) {
    where.status = options.status;
  }
  
  return await Service.findAll({
    where,
    include: options.include || [],
    order: [['createdAt', 'DESC']],
    limit: options.limit,
    offset: options.offset
  });
};

// Associations will be defined in the model index file
Service.associate = function(models) {
  Service.belongsTo(models.User, {
    foreignKey: 'providerId',
    as: 'provider',
    onDelete: 'CASCADE'
  });
  
  Service.hasMany(models.Booking, {
    foreignKey: 'serviceId',
    as: 'bookings'
  });
  
  Service.hasMany(models.Review, {
    foreignKey: 'serviceId',
    as: 'reviews'
  });
  
  Service.hasMany(models.ServiceView, {
    foreignKey: 'serviceId',
    as: 'views'
  });
  
  Service.belongsToMany(models.User, {
    through: 'ServiceFavorites',
    foreignKey: 'serviceId',
    otherKey: 'userId',
    as: 'favoritedBy'
  });
};

module.exports = Service;