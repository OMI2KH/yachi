// models/Portfolio.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { YachiAI } = require('../services/yachiAI');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { fileUploadService } = require('../services/fileUploadService');
const logger = require('../utils/logger');

const Portfolio = sequelize.define('Portfolio', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Information
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Portfolio title is required' },
      len: { args: [3, 255], msg: 'Title must be between 3 and 255 characters' }
    }
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 2000], msg: 'Description cannot exceed 2000 characters' }
    }
  },
  
  // Categorization
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Portfolio category is required' },
      isIn: {
        args: [[
          'plumbing', 'electrical', 'cleaning', 'tutoring', 'beauty', 
          'fitness', 'repair', 'installation', 'transport', 'catering',
          'event_planning', 'healthcare', 'consulting', 'construction',
          'landscaping', 'pet_care', 'personal_care', 'tech_support',
          'moving_services', 'art_design', 'writing', 'programming',
          'photography', 'videography', 'other'
        ]],
        msg: 'Invalid portfolio category'
      }
    }
  },
  
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Media Content
  mediaType: {
    type: DataTypes.ENUM('image', 'video', 'document', 'audio', 'link'),
    defaultValue: 'image',
    allowNull: false
  },
  
  mediaUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Media URL is required' },
      isUrl: { msg: 'Media URL must be a valid URL' }
    }
  },
  
  thumbnailUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: { msg: 'Thumbnail URL must be a valid URL' }
    }
  },
  
  mediaMetadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional media metadata (dimensions, duration, size, etc.)'
  },
  
  // Multiple media support for galleries
  additionalMedia: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidMedia(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Additional media must be an array');
        }
        if (value && value.length > 10) {
          throw new Error('Cannot have more than 10 additional media items');
        }
      }
    }
  },
  
  // Project Information
  projectDate: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: { msg: 'Project date must be a valid date' },
      isPast(value) {
        if (value && new Date(value) > new Date()) {
          throw new Error('Project date cannot be in the future');
        }
      }
    }
  },
  
  projectLocation: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Location where the project was completed'
  },
  
  clientName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      len: { args: [0, 255], msg: 'Client name cannot exceed 255 characters' }
    }
  },
  
  clientTestimonial: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 1000], msg: 'Testimonial cannot exceed 1000 characters' }
    }
  },
  
  // Skills and Technologies
  skillsUsed: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidSkills(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Skills must be an array');
        }
        if (value && value.length > 20) {
          throw new Error('Cannot have more than 20 skills');
        }
      }
    }
  },
  
  toolsTechnologies: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidTools(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Tools must be an array');
        }
      }
    }
  },
  
  // Metrics and Engagement
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  shareCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  commentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Quality and SEO
  qualityScore: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
    validate: {
      min: { args: [0], msg: 'Quality score cannot be less than 0' },
      max: { args: [1], msg: 'Quality score cannot be greater than 1' }
    }
  },
  
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidTags(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Tags must be an array');
        }
        if (value && value.length > 15) {
          throw new Error('Cannot have more than 15 tags');
        }
      }
    }
  },
  
  searchKeywords: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'AI-generated search keywords for better discovery'
  },
  
  // Status and Visibility
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived', 'hidden', 'under_review'),
    defaultValue: 'draft'
  },
  
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'unlisted'),
    defaultValue: 'public'
  },
  
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Timestamps
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // AI and Analytics
  aiAnalysis: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'AI-powered analysis of portfolio content'
  },
  
  performanceMetrics: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Performance analytics for this portfolio item'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional portfolio metadata'
  }

}, {
  tableName: 'portfolios',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_portfolio_user',
      fields: ['user_id']
    },
    {
      name: 'idx_portfolio_category',
      fields: ['category']
    },
    {
      name: 'idx_portfolio_status',
      fields: ['status']
    },
    {
      name: 'idx_portfolio_visibility',
      fields: ['visibility']
    },
    {
      name: 'idx_portfolio_featured',
      fields: ['featured']
    },
    {
      name: 'idx_portfolio_quality',
      fields: ['quality_score']
    },
    {
      name: 'idx_portfolio_media_type',
      fields: ['media_type']
    },
    {
      name: 'idx_portfolio_tags',
      fields: ['tags'],
      using: 'GIN'
    },
    {
      name: 'idx_portfolio_search',
      fields: ['title', 'description'],
      type: 'FULLTEXT'
    },
    {
      name: 'idx_portfolio_created',
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeValidate: async (portfolio) => {
      await Portfolio.hooks.beforeValidateHook(portfolio);
    },
    beforeCreate: async (portfolio) => {
      await Portfolio.hooks.beforeCreateHook(portfolio);
    },
    afterCreate: async (portfolio) => {
      await Portfolio.hooks.afterCreateHook(portfolio);
    },
    afterUpdate: async (portfolio) => {
      await Portfolio.hooks.afterUpdateHook(portfolio);
    },
    afterDestroy: async (portfolio) => {
      await Portfolio.hooks.afterDestroyHook(portfolio);
    }
  }
});

// Static Methods
Portfolio.hooks = {
  /**
   * Before validate hook
   */
  beforeValidateHook: async (portfolio) => {
    if (portfolio.isNewRecord || portfolio.changed('title') || portfolio.changed('description')) {
      await Portfolio.hooks.generateAIAnalysis(portfolio);
    }
    
    if (portfolio.isNewRecord || portfolio.changed('status')) {
      await Portfolio.hooks.handleStatusChange(portfolio);
    }
    
    // Validate media URL
    await Portfolio.hooks.validateMediaUrl(portfolio);
  },

  /**
   * Generate AI analysis for portfolio
   */
  generateAIAnalysis: async (portfolio) => {
    try {
      const analysis = await YachiAI.analyzePortfolioItem({
        title: portfolio.title,
        description: portfolio.description,
        category: portfolio.category,
        mediaType: portfolio.mediaType,
        mediaUrl: portfolio.mediaUrl,
        skillsUsed: portfolio.skillsUsed
      });

      portfolio.aiAnalysis = analysis;
      
      // Update quality score
      if (analysis.qualityScore) {
        portfolio.qualityScore = analysis.qualityScore;
      }
      
      // Generate search keywords if not provided
      if (!portfolio.searchKeywords || portfolio.searchKeywords.length === 0) {
        portfolio.searchKeywords = analysis.keywords || [];
      }
      
      // Generate tags if not provided
      if (!portfolio.tags || portfolio.tags.length === 0) {
        portfolio.tags = analysis.tags || [];
      }

    } catch (error) {
      logger.error('Portfolio AI analysis failed:', error);
      // Don't throw error to prevent portfolio creation from failing
    }
  },

  /**
   * Handle portfolio status changes
   */
  handleStatusChange: async (portfolio) => {
    if (portfolio.status === 'published' && !portfolio.publishedAt) {
      portfolio.publishedAt = new Date();
    }
    
    if (portfolio.status === 'archived' && portfolio.previous('status') === 'published') {
      // Track portfolio archival
      await YachiAnalytics.trackPortfolioArchival(portfolio);
    }
  },

  /**
   * Validate media URL and extract metadata
   */
  validateMediaUrl: async (portfolio) => {
    if (!portfolio.mediaUrl) return;

    try {
      // Basic URL validation
      const url = new URL(portfolio.mediaUrl);
      
      // Extract basic metadata based on media type
      const metadata = await Portfolio.hooks.extractMediaMetadata(portfolio);
      portfolio.mediaMetadata = { ...portfolio.mediaMetadata, ...metadata };
      
    } catch (error) {
      logger.error('Media URL validation failed:', error);
      throw new Error('Invalid media URL format');
    }
  },

  /**
   * Extract media metadata
   */
  extractMediaMetadata: async (portfolio) => {
    const metadata = {
      validatedAt: new Date().toISOString(),
      fileType: portfolio.mediaType
    };

    // For images, we might want to extract dimensions
    if (portfolio.mediaType === 'image') {
      metadata.type = 'image';
      // In production, you might use a library to get image dimensions
    }
    
    // For videos, extract duration and format
    else if (portfolio.mediaType === 'video') {
      metadata.type = 'video';
      // Video metadata extraction would happen here
    }
    
    // For documents, extract page count and size
    else if (portfolio.mediaType === 'document') {
      metadata.type = 'document';
    }

    return metadata;
  },

  /**
   * Before create hook
   */
  beforeCreateHook: async (portfolio) => {
    // Validate user's portfolio limit
    await Portfolio.hooks.validatePortfolioLimit(portfolio.userId);
    
    // Process media if needed
    await Portfolio.hooks.processPortfolioMedia(portfolio);
  },

  /**
   * Validate user's portfolio limit
   */
  validatePortfolioLimit: async (userId) => {
    const portfolioCount = await Portfolio.count({
      where: { 
        userId,
        status: { [sequelize.Op.ne]: 'archived' }
      }
    });

    const maxPortfolios = process.env.MAX_PORTFOLIOS_PER_USER || 50;
    
    if (portfolioCount >= maxPortfolios) {
      throw new Error(`Portfolio limit reached. Maximum ${maxPortfolios} portfolios allowed.`);
    }
  },

  /**
   * Process portfolio media
   */
  processPortfolioMedia: async (portfolio) => {
    if (portfolio.mediaType === 'image' && portfolio.mediaUrl) {
      try {
        // Optimize image and generate thumbnail
        const processedMedia = await fileUploadService.processPortfolioItem(
          { path: portfolio.mediaUrl },
          portfolio.userId,
          {
            title: portfolio.title,
            description: portfolio.description,
            category: portfolio.category
          }
        );

        // Update URLs with processed versions
        portfolio.mediaUrl = processedMedia.original.url;
        portfolio.thumbnailUrl = processedMedia.thumbnail.url;
        portfolio.mediaMetadata = {
          ...portfolio.mediaMetadata,
          ...processedMedia.metadata
        };

      } catch (error) {
        logger.error('Portfolio media processing failed:', error);
        // Continue with original media URL if processing fails
      }
    }
  },

  /**
   * After create hook
   */
  afterCreateHook: async (portfolio) => {
    try {
      // Track portfolio creation
      await YachiAnalytics.trackPortfolioCreation(portfolio);
      
      // Update user's portfolio count
      await Portfolio.hooks.updateUserPortfolioCount(portfolio.userId);

    } catch (error) {
      logger.error('After create hook error:', error);
    }
  },

  /**
   * After update hook
   */
  afterUpdateHook: async (portfolio) => {
    try {
      // Track portfolio updates
      if (portfolio.changed()) {
        await YachiAnalytics.trackPortfolioUpdate(portfolio);
      }
      
      // Update user stats if status changed
      if (portfolio.changed('status')) {
        await Portfolio.hooks.updateUserPortfolioCount(portfolio.userId);
      }

    } catch (error) {
      logger.error('After update hook error:', error);
    }
  },

  /**
   * After destroy hook
   */
  afterDestroyHook: async (portfolio) => {
    try {
      // Track portfolio deletion
      await YachiAnalytics.trackPortfolioDeletion(portfolio);
      
      // Update user's portfolio count
      await Portfolio.hooks.updateUserPortfolioCount(portfolio.userId);
      
      // Clean up media files
      await Portfolio.hooks.cleanupPortfolioMedia(portfolio);

    } catch (error) {
      logger.error('After destroy hook error:', error);
    }
  },

  /**
   * Update user portfolio count
   */
  updateUserPortfolioCount: async (userId) => {
    try {
      const { User } = require('./index');
      
      const publishedPortfoliosCount = await Portfolio.count({
        where: { 
          userId, 
          status: 'published',
          visibility: 'public'
        }
      });
      
      const totalPortfoliosCount = await Portfolio.count({
        where: { 
          userId,
          status: { [sequelize.Op.ne]: 'archived' }
        }
      });
      
      await User.update(
        { 
          publishedPortfoliosCount,
          totalPortfoliosCount 
        },
        { where: { id: userId } }
      );
      
    } catch (error) {
      logger.error('User portfolio count update error:', error);
    }
  },

  /**
   * Clean up portfolio media files
   */
  cleanupPortfolioMedia: async (portfolio) => {
    try {
      // Delete main media file
      if (portfolio.mediaUrl) {
        await fileUploadService.deleteFile(portfolio.mediaUrl);
      }
      
      // Delete thumbnail
      if (portfolio.thumbnailUrl) {
        await fileUploadService.deleteFile(portfolio.thumbnailUrl);
      }
      
      // Delete additional media files
      if (portfolio.additionalMedia && Array.isArray(portfolio.additionalMedia)) {
        for (const media of portfolio.additionalMedia) {
          if (media.url) {
            await fileUploadService.deleteFile(media.url);
          }
          if (media.thumbnailUrl) {
            await fileUploadService.deleteFile(media.thumbnailUrl);
          }
        }
      }
      
    } catch (error) {
      logger.error('Portfolio media cleanup failed:', error);
    }
  }
};

// Instance Methods
Portfolio.prototype.getInstanceMethods = function() {
  return {
    /**
     * Publish portfolio item
     */
    publish: async function() {
      if (this.status === 'published') {
        throw new Error('Portfolio item is already published');
      }
      
      await this.update({ 
        status: 'published',
        publishedAt: new Date()
      });
      
      logger.info('Portfolio published', {
        portfolioId: this.id,
        userId: this.userId
      });
      
      return this;
    },

    /**
     * Archive portfolio item
     */
    archive: async function() {
      if (this.status === 'archived') {
        throw new Error('Portfolio item is already archived');
      }
      
      await this.update({ status: 'archived' });
      
      logger.info('Portfolio archived', {
        portfolioId: this.id,
        userId: this.userId
      });
      
      return this;
    },

    /**
     * Add additional media
     */
    addMedia: async function(mediaData) {
      const additionalMedia = this.additionalMedia || [];
      
      if (additionalMedia.length >= 10) {
        throw new Error('Maximum 10 additional media items allowed');
      }
      
      const newMedia = {
        id: require('crypto').randomBytes(8).toString('hex'),
        url: mediaData.url,
        thumbnailUrl: mediaData.thumbnailUrl,
        type: mediaData.type || 'image',
        caption: mediaData.caption || '',
        uploadedAt: new Date().toISOString()
      };
      
      additionalMedia.push(newMedia);
      
      await this.update({ additionalMedia });
      return additionalMedia;
    },

    /**
     * Remove additional media
     */
    removeMedia: async function(mediaId) {
      const additionalMedia = this.additionalMedia.filter(media => media.id !== mediaId);
      await this.update({ additionalMedia });
      return additionalMedia;
    },

    /**
     * Increment view count
     */
    incrementViewCount: async function() {
      const newCount = this.viewCount + 1;
      await this.update({ viewCount: newCount });
      
      // Track view analytics
      await YachiAnalytics.trackPortfolioView(this);
      
      return newCount;
    },

    /**
     * Increment like count
     */
    incrementLikeCount: async function() {
      const newCount = this.likeCount + 1;
      await this.update({ likeCount: newCount });
      return newCount;
    },

    /**
     * Decrement like count
     */
    decrementLikeCount: async function() {
      const newCount = Math.max(0, this.likeCount - 1);
      await this.update({ likeCount: newCount });
      return newCount;
    },

    /**
     * Add tag
     */
    addTag: async function(tag) {
      const tags = this.tags || [];
      
      if (tags.length >= 15) {
        throw new Error('Maximum 15 tags allowed');
      }
      
      if (!tags.includes(tag)) {
        tags.push(tag);
        await this.update({ tags });
      }
      
      return tags;
    },

    /**
     * Remove tag
     */
    removeTag: async function(tag) {
      const tags = this.tags.filter(t => t !== tag);
      await this.update({ tags });
      return tags;
    },

    /**
     * Update quality score
     */
    updateQualityScore: async function() {
      try {
        const analysis = await YachiAI.analyzePortfolioItem({
          title: this.title,
          description: this.description,
          mediaUrl: this.mediaUrl,
          mediaType: this.mediaType,
          category: this.category
        });

        if (analysis.qualityScore) {
          await this.update({ qualityScore: analysis.qualityScore });
        }
        
        return analysis.qualityScore;
        
      } catch (error) {
        logger.error('Quality score update failed:', error);
        return this.qualityScore;
      }
    },

    /**
     * Get similar portfolio items
     */
    getSimilarPortfolios: async function(limit = 5) {
      try {
        return await Portfolio.findAll({
          where: {
            category: this.category,
            status: 'published',
            visibility: 'public',
            id: { [sequelize.Op.ne]: this.id }
          },
          include: [
            {
              model: sequelize.models.User,
              as: 'user',
              attributes: ['id', 'name', 'avatar', 'rating']
            }
          ],
          order: [
            ['qualityScore', 'DESC'],
            ['viewCount', 'DESC'],
            ['createdAt', 'DESC']
          ],
          limit
        });
      } catch (error) {
        logger.error('Get similar portfolios failed:', error);
        return [];
      }
    },

    /**
     * Check if portfolio is publicly visible
     */
    isPublic: function() {
      return this.status === 'published' && this.visibility === 'public';
    },

    /**
     * Get portfolio analytics
     */
    getAnalytics: async function(timeRange = '30d') {
      try {
        const analytics = await YachiAnalytics.getPortfolioAnalytics(this.id, timeRange);
        return analytics;
      } catch (error) {
        logger.error('Get portfolio analytics failed:', error);
        return null;
      }
    },

    /**
     * Generate shareable link
     */
    getShareableLink: function() {
      if (!this.isPublic()) {
        return null;
      }
      
      return `${process.env.FRONTEND_URL}/portfolio/${this.id}`;
    },

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics: async function() {
      const metrics = {
        viewCount: this.viewCount,
        likeCount: this.likeCount,
        shareCount: this.shareCount,
        engagementRate: this.viewCount > 0 ? (this.likeCount / this.viewCount) * 100 : 0,
        lastUpdated: new Date().toISOString()
      };

      await this.update({ performanceMetrics: metrics });
      return metrics;
    }
  };
};

// Static Methods
Portfolio.findUserPortfolios = async function(userId, filters = {}) {
  const where = { userId };
  
  // Apply filters
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.visibility) {
    where.visibility = filters.visibility;
  }
  
  if (filters.category) {
    where.category = filters.category;
  }
  
  if (filters.mediaType) {
    where.mediaType = filters.mediaType;
  }
  
  if (filters.featured) {
    where.featured = true;
  }
  
  return await Portfolio.findAll({
    where,
    order: [
      ['featured', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

Portfolio.findPublishedPortfolios = async function(filters = {}) {
  const where = {
    status: 'published',
    visibility: 'public'
  };
  
  // Apply filters
  if (filters.category) {
    where.category = filters.category;
  }
  
  if (filters.userId) {
    where.userId = filters.userId;
  }
  
  if (filters.mediaType) {
    where.mediaType = filters.mediaType;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { [sequelize.Op.overlap]: filters.tags };
  }
  
  if (filters.minQuality) {
    where.qualityScore = { [sequelize.Op.gte]: filters.minQuality };
  }
  
  return await Portfolio.findAll({
    where,
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'avatar', 'rating', 'level', 'faydaVerified']
      }
    ],
    order: Portfolio.buildOrder(filters.sortBy),
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

Portfolio.buildOrder = function(sortBy = 'recent') {
  const orderMap = {
    recent: [['createdAt', 'DESC']],
    popular: [['viewCount', 'DESC'], ['likeCount', 'DESC']],
    quality: [['qualityScore', 'DESC'], ['viewCount', 'DESC']],
    featured: [['featured', 'DESC'], ['qualityScore', 'DESC']]
  };
  
  return orderMap[sortBy] || orderMap.recent;
};

Portfolio.searchPortfolios = async function(query, filters = {}) {
  const where = {
    status: 'published',
    visibility: 'public',
    [sequelize.Op.or]: [
      { title: { [sequelize.Op.iLike]: `%${query}%` } },
      { description: { [sequelize.Op.iLike]: `%${query}%` } },
      { tags: { [sequelize.Op.contains]: [query] } },
      { searchKeywords: { [sequelize.Op.contains]: [query] } },
      { skillsUsed: { [sequelize.Op.contains]: [query] } }
    ]
  };
  
  // Apply additional filters
  Object.assign(where, filters);
  
  return await Portfolio.findAll({
    where,
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'avatar', 'rating', 'level']
      }
    ],
    order: [['qualityScore', 'DESC']],
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

Portfolio.getPopularCategories = async function(limit = 10) {
  const results = await Portfolio.findAll({
    attributes: [
      'category',
      [sequelize.fn('COUNT', sequelize.col('id')), 'portfolioCount'],
      [sequelize.fn('AVG', sequelize.col('quality_score')), 'avgQuality'],
      [sequelize.fn('SUM', sequelize.col('view_count')), 'totalViews']
    ],
    where: {
      status: 'published',
      visibility: 'public'
    },
    group: ['category'],
    order: [[sequelize.literal('"totalViews"'), 'DESC']],
    limit
  });
  
  return results;
};

Portfolio.getFeaturedPortfolios = async function(limit = 6) {
  return await Portfolio.findAll({
    where: {
      status: 'published',
      visibility: 'public',
      featured: true
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'avatar', 'rating', 'level']
      }
    ],
    order: [['qualityScore', 'DESC']],
    limit
  });
};

Portfolio.getPortfolioStats = async function(userId) {
  const stats = await Portfolio.findAll({
    where: { userId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalPortfolios'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "published" THEN 1 ELSE 0 END')), 'publishedPortfolios'],
      [sequelize.fn('SUM', sequelize.col('view_count')), 'totalViews'],
      [sequelize.fn('SUM', sequelize.col('like_count')), 'totalLikes'],
      [sequelize.fn('AVG', sequelize.col('quality_score')), 'avgQualityScore']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

// Associations will be defined in the model index file
Portfolio.associate = function(models) {
  Portfolio.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE'
  });
  
  Portfolio.hasMany(models.PortfolioLike, {
    foreignKey: 'portfolioId',
    as: 'likes'
  });
  
  Portfolio.hasMany(models.PortfolioComment, {
    foreignKey: 'portfolioId',
    as: 'comments'
  });
  
  Portfolio.hasMany(models.PortfolioView, {
    foreignKey: 'portfolioId',
    as: 'views'
  });
  
  Portfolio.belongsToMany(models.User, {
    through: 'PortfolioFavorites',
    foreignKey: 'portfolioId',
    otherKey: 'userId',
    as: 'favoritedBy'
  });
};

module.exports = Portfolio;