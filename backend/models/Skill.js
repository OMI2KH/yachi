// models/Skill.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { YachiAI } = require('../services/yachiAI');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const logger = require('../utils/logger');

const Skill = sequelize.define('Skill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Skill Information
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Skill name is required' },
      len: { args: [2, 100], msg: 'Skill name must be between 2 and 100 characters' }
    }
  },
  
  normalizedName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Normalized skill name is required' }
    },
    comment: 'Normalized version for case-insensitive search'
  },
  
  // Categorization
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Skill category is required' },
      isIn: {
        args: [[
          'plumbing', 'electrical', 'cleaning', 'tutoring', 'beauty', 
          'fitness', 'repair', 'installation', 'transport', 'catering',
          'event_planning', 'healthcare', 'consulting', 'construction',
          'landscaping', 'pet_care', 'personal_care', 'tech_support',
          'moving_services', 'art_design', 'writing', 'programming',
          'photography', 'videography', 'marketing', 'finance',
          'legal', 'education', 'hospitality', 'manufacturing',
          'agriculture', 'other'
        ]],
        msg: 'Invalid skill category'
      }
    }
  },
  
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Skill Metadata
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Description cannot exceed 500 characters' }
    }
  },
  
  synonyms: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidSynonyms(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Synonyms must be an array');
        }
        if (value && value.length > 10) {
          throw new Error('Cannot have more than 10 synonyms');
        }
      }
    },
    comment: 'Alternative names for the same skill'
  },
  
  relatedSkills: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidRelatedSkills(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Related skills must be an array');
        }
      }
    },
    comment: 'Skills that are commonly used together'
  },
  
  // Skill Level and Certification
  skillLevels: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidSkillLevels(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Skill levels must be an array');
        }
      }
    },
    comment: 'Available proficiency levels for this skill'
  },
  
  certificationRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  certificationBodies: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidCertificationBodies(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Certification bodies must be an array');
        }
      }
    },
    comment: 'Recognized certification organizations'
  },
  
  // Market Data
  marketDemand: {
    type: DataTypes.ENUM('very_low', 'low', 'medium', 'high', 'very_high'),
    defaultValue: 'medium',
    allowNull: false
  },
  
  averageHourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Average hourly rate must be positive' }
    },
    comment: 'Average hourly rate in ETB'
  },
  
  rateRange: {
    type: DataTypes.JSON,
    defaultValue: {},
    validate: {
      isValidRateRange(value) {
        if (value && (typeof value.min !== 'number' || typeof value.max !== 'number')) {
          throw new Error('Rate range must have min and max values');
        }
        if (value && value.min > value.max) {
          throw new Error('Minimum rate cannot be greater than maximum rate');
        }
      }
    },
    comment: 'Typical rate range {min: number, max: number}'
  },
  
  // Popularity and Usage
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Number of workers who have this skill'
  },
  
  searchCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Number of times this skill was searched for'
  },
  
  popularityScore: {
    type: DataTypes.DECIMAL(4, 3),
    defaultValue: 0.0,
    validate: {
      min: { args: [0], msg: 'Popularity score cannot be less than 0' },
      max: { args: [1], msg: 'Popularity score cannot be greater than 1' }
    }
  },
  
  // Regional Data (Ethiopia-specific)
  regionalDemand: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Demand levels in different Ethiopian regions'
  },
  
  localNames: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Local language names (Amharic, Oromo, etc.)'
  },
  
  // Skill Complexity
  complexityLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    defaultValue: 'intermediate'
  },
  
  learningTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: { args: [1], msg: 'Learning time must be at least 1 week' }
    },
    comment: 'Estimated learning time in weeks'
  },
  
  prerequisites: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidPrerequisites(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Prerequisites must be an array');
        }
      }
    },
    comment: 'Skills required before learning this one'
  },
  
  // SEO and Discovery
  searchKeywords: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidKeywords(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Search keywords must be an array');
        }
      }
    },
    comment: 'Keywords for better search discovery'
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
  
  // Status and Verification
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending_review', 'archived'),
    defaultValue: 'active'
  },
  
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Admin who verified this skill'
  },
  
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // AI and Analytics
  aiAnalysis: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'AI-powered analysis of skill data'
  },
  
  marketTrends: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Market trend data and predictions'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional skill metadata'
  }

}, {
  tableName: 'skills',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_skill_name',
      fields: ['name'],
      unique: true
    },
    {
      name: 'idx_skill_normalized_name',
      fields: ['normalized_name'],
      unique: true
    },
    {
      name: 'idx_skill_category',
      fields: ['category']
    },
    {
      name: 'idx_skill_status',
      fields: ['status']
    },
    {
      name: 'idx_skill_market_demand',
      fields: ['market_demand']
    },
    {
      name: 'idx_skill_popularity',
      fields: ['popularity_score']
    },
    {
      name: 'idx_skill_verified',
      fields: ['verified']
    },
    {
      name: 'idx_skill_complexity',
      fields: ['complexity_level']
    },
    {
      name: 'idx_skill_usage',
      fields: ['usage_count']
    },
    {
      name: 'idx_skill_search',
      fields: ['name', 'description'],
      type: 'FULLTEXT'
    },
    {
      name: 'idx_skill_tags',
      fields: ['tags'],
      using: 'GIN'
    }
  ],
  hooks: {
    beforeValidate: async (skill) => {
      await Skill.hooks.beforeValidateHook(skill);
    },
    beforeCreate: async (skill) => {
      await Skill.hooks.beforeCreateHook(skill);
    },
    afterCreate: async (skill) => {
      await Skill.hooks.afterCreateHook(skill);
    },
    afterUpdate: async (skill) => {
      await Skill.hooks.afterUpdateHook(skill);
    },
    afterDestroy: async (skill) => {
      await Skill.hooks.afterDestroyHook(skill);
    }
  }
});

// Static Methods
Skill.hooks = {
  /**
   * Before validate hook
   */
  beforeValidateHook: async (skill) => {
    if (skill.isNewRecord || skill.changed('name')) {
      await Skill.hooks.normalizeSkillName(skill);
    }
    
    if (skill.isNewRecord || skill.changed('name') || skill.changed('category')) {
      await Skill.hooks.generateAIAnalysis(skill);
    }
    
    if (skill.isNewRecord || skill.changed('usageCount') || skill.changed('searchCount')) {
      await Skill.hooks.calculatePopularityScore(skill);
    }
  },

  /**
   * Normalize skill name for consistent searching
   */
  normalizeSkillName: async (skill) => {
    if (!skill.name) return;
    
    // Convert to lowercase, remove extra spaces, and special characters
    const normalized = skill.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
    
    skill.normalizedName = normalized;
  },

  /**
   * Generate AI analysis for skill
   */
  generateAIAnalysis: async (skill) => {
    try {
      const analysis = await YachiAI.analyzeSkill({
        name: skill.name,
        category: skill.category,
        description: skill.description,
        marketDemand: skill.marketDemand
      });

      skill.aiAnalysis = analysis;
      
      // Update related fields from AI analysis
      if (analysis.synonyms && skill.synonyms.length === 0) {
        skill.synonyms = analysis.synonyms;
      }
      
      if (analysis.relatedSkills && skill.relatedSkills.length === 0) {
        skill.relatedSkills = analysis.relatedSkills;
      }
      
      if (analysis.complexity && !skill.complexityLevel) {
        skill.complexityLevel = analysis.complexity;
      }
      
      if (analysis.learningTime && !skill.learningTime) {
        skill.learningTime = analysis.learningTime;
      }
      
      if (analysis.prerequisites && skill.prerequisites.length === 0) {
        skill.prerequisites = analysis.prerequisites;
      }
      
      if (analysis.searchKeywords && skill.searchKeywords.length === 0) {
        skill.searchKeywords = analysis.searchKeywords;
      }
      
      if (analysis.tags && skill.tags.length === 0) {
        skill.tags = analysis.tags;
      }

    } catch (error) {
      logger.error('Skill AI analysis failed:', error);
      // Don't throw error to prevent skill creation from failing
    }
  },

  /**
   * Calculate popularity score
   */
  calculatePopularityScore: async (skill) => {
    // Calculate based on usage count, search count, and market demand
    const usageWeight = 0.4;
    const searchWeight = 0.3;
    const demandWeight = 0.3;
    
    const demandScores = {
      very_low: 0.1,
      low: 0.3,
      medium: 0.5,
      high: 0.8,
      very_high: 1.0
    };
    
    // Normalize usage count (assuming max 10000 users)
    const normalizedUsage = Math.min(skill.usageCount / 10000, 1);
    
    // Normalize search count (assuming max 5000 searches)
    const normalizedSearch = Math.min(skill.searchCount / 5000, 1);
    
    const demandScore = demandScores[skill.marketDemand] || 0.5;
    
    const popularity = (normalizedUsage * usageWeight) + 
                      (normalizedSearch * searchWeight) + 
                      (demandScore * demandWeight);
    
    skill.popularityScore = Math.round(popularity * 1000) / 1000; // Round to 3 decimal places
  },

  /**
   * Before create hook
   */
  beforeCreateHook: async (skill) => {
    // Check for duplicate skills
    await Skill.hooks.checkForDuplicates(skill);
    
    // Set default skill levels if not provided
    if (!skill.skillLevels || skill.skillLevels.length === 0) {
      skill.skillLevels = ['beginner', 'intermediate', 'expert'];
    }
  },

  /**
   * Check for duplicate skills
   */
  checkForDuplicates: async (skill) => {
    const existingSkill = await Skill.findOne({
      where: {
        normalizedName: skill.normalizedName,
        category: skill.category
      }
    });
    
    if (existingSkill) {
      throw new Error(`Skill "${skill.name}" already exists in category "${skill.category}"`);
    }
  },

  /**
   * After create hook
   */
  afterCreateHook: async (skill) => {
    try {
      // Track skill creation
      await YachiAnalytics.trackSkillCreation(skill);
      
      // Update category statistics
      await Skill.hooks.updateCategoryStats(skill.category);

    } catch (error) {
      logger.error('After create hook error:', error);
    }
  },

  /**
   * After update hook
   */
  afterUpdateHook: async (skill) => {
    try {
      // Track skill updates
      if (skill.changed()) {
        await YachiAnalytics.trackSkillUpdate(skill);
      }
      
      // Update category stats if category changed
      if (skill.changed('category')) {
        const previousCategory = skill.previous('category');
        await Skill.hooks.updateCategoryStats(previousCategory);
        await Skill.hooks.updateCategoryStats(skill.category);
      }

    } catch (error) {
      logger.error('After update hook error:', error);
    }
  },

  /**
   * After destroy hook
   */
  afterDestroyHook: async (skill) => {
    try {
      // Track skill deletion
      await YachiAnalytics.trackSkillDeletion(skill);
      
      // Update category statistics
      await Skill.hooks.updateCategoryStats(skill.category);

    } catch (error) {
      logger.error('After destroy hook error:', error);
    }
  },

  /**
   * Update category statistics
   */
  updateCategoryStats: async (category) => {
    try {
      const skillCount = await Skill.count({
        where: { 
          category,
          status: 'active'
        }
      });
      
      // Update category stats in a separate table or cache
      // This could be stored in Redis or a categories table
      const redisKey = `category_stats:${category}`;
      const stats = {
        skillCount,
        lastUpdated: new Date().toISOString()
      };
      
      // Store in Redis for quick access
      const redis = require('../config/redis');
      await redis.setex(redisKey, 86400, JSON.stringify(stats)); // Cache for 24 hours
      
    } catch (error) {
      logger.error('Category stats update error:', error);
    }
  }
};

// Instance Methods
Skill.prototype.getInstanceMethods = function() {
  return {
    /**
     * Verify skill
     */
    verify: async function(adminId) {
      if (this.verified) {
        throw new Error('Skill is already verified');
      }
      
      await this.update({
        verified: true,
        verifiedBy: adminId,
        verifiedAt: new Date()
      });
      
      logger.info('Skill verified', {
        skillId: this.id,
        skillName: this.name,
        adminId
      });
      
      return this;
    },

    /**
     * Unverify skill
     */
    unverify: async function() {
      if (!this.verified) {
        throw new Error('Skill is not verified');
      }
      
      await this.update({
        verified: false,
        verifiedBy: null,
        verifiedAt: null
      });
      
      logger.info('Skill unverified', {
        skillId: this.id,
        skillName: this.name
      });
      
      return this;
    },

    /**
     * Increment usage count
     */
    incrementUsageCount: async function() {
      const newCount = this.usageCount + 1;
      await this.update({ usageCount: newCount });
      return newCount;
    },

    /**
     * Decrement usage count
     */
    decrementUsageCount: async function() {
      const newCount = Math.max(0, this.usageCount - 1);
      await this.update({ usageCount: newCount });
      return newCount;
    },

    /**
     * Increment search count
     */
    incrementSearchCount: async function() {
      const newCount = this.searchCount + 1;
      await this.update({ searchCount: newCount });
      
      // Track search analytics
      await YachiAnalytics.trackSkillSearch(this);
      
      return newCount;
    },

    /**
     * Add synonym
     */
    addSynonym: async function(synonym) {
      const synonyms = this.synonyms || [];
      
      if (synonyms.length >= 10) {
        throw new Error('Maximum 10 synonyms allowed');
      }
      
      if (!synonyms.includes(synonym)) {
        synonyms.push(synonym);
        await this.update({ synonyms });
      }
      
      return synonyms;
    },

    /**
     * Remove synonym
     */
    removeSynonym: async function(synonym) {
      const synonyms = this.synonyms.filter(s => s !== synonym);
      await this.update({ synonyms });
      return synonyms;
    },

    /**
     * Add related skill
     */
    addRelatedSkill: async function(relatedSkillId) {
      const relatedSkills = this.relatedSkills || [];
      
      if (!relatedSkills.includes(relatedSkillId)) {
        relatedSkills.push(relatedSkillId);
        await this.update({ relatedSkills });
      }
      
      return relatedSkills;
    },

    /**
     * Remove related skill
     */
    removeRelatedSkill: async function(relatedSkillId) {
      const relatedSkills = this.relatedSkills.filter(id => id !== relatedSkillId);
      await this.update({ relatedSkills });
      return relatedSkills;
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
     * Update market data
     */
    updateMarketData: async function(marketData) {
      const updates = {};
      
      if (marketData.demand) {
        updates.marketDemand = marketData.demand;
      }
      
      if (marketData.averageHourlyRate !== undefined) {
        updates.averageHourlyRate = marketData.averageHourlyRate;
      }
      
      if (marketData.rateRange) {
        updates.rateRange = marketData.rateRange;
      }
      
      if (marketData.regionalDemand) {
        updates.regionalDemand = {
          ...this.regionalDemand,
          ...marketData.regionalDemand
        };
      }
      
      await this.update(updates);
      return this;
    },

    /**
     * Get workers with this skill
     */
    getWorkers: async function(filters = {}) {
      try {
        const { User } = require('./index');
        
        const where = {
          skills: { [sequelize.Op.contains]: [this.id] },
          status: 'active',
          role: { [sequelize.Op.in]: ['provider', 'graduate'] }
        };
        
        // Apply additional filters
        if (filters.location) {
          // Location-based filtering would be implemented here
        }
        
        if (filters.minRating) {
          where.rating = { [sequelize.Op.gte]: filters.minRating };
        }
        
        return await User.findAll({
          where,
          attributes: ['id', 'name', 'avatar', 'rating', 'level', 'location'],
          order: [['rating', 'DESC']],
          limit: filters.limit || 20,
          offset: filters.offset || 0
        });
      } catch (error) {
        logger.error('Get workers with skill failed:', error);
        return [];
      }
    },

    /**
     * Get related skills with details
     */
    getRelatedSkillsDetails: async function() {
      try {
        return await Skill.findAll({
          where: {
            id: { [sequelize.Op.in]: this.relatedSkills },
            status: 'active'
          },
          attributes: ['id', 'name', 'category', 'marketDemand', 'popularityScore']
        });
      } catch (error) {
        logger.error('Get related skills details failed:', error);
        return [];
      }
    },

    /**
     * Get skill analytics
     */
    getAnalytics: async function(timeRange = '30d') {
      try {
        const analytics = await YachiAnalytics.getSkillAnalytics(this.id, timeRange);
        return analytics;
      } catch (error) {
        logger.error('Get skill analytics failed:', error);
        return null;
      }
    },

    /**
     * Check if skill is in high demand
     */
    isHighDemand: function() {
      return this.marketDemand === 'high' || this.marketDemand === 'very_high';
    },

    /**
     * Get learning path recommendations
     */
    getLearningPath: async function() {
      try {
        const recommendations = await YachiAI.generateSkillLearningPath({
          skillId: this.id,
          skillName: this.name,
          prerequisites: this.prerequisites,
          complexity: this.complexityLevel
        });

        return recommendations;
      } catch (error) {
        logger.error('Get learning path failed:', error);
        return {
          skill: this.name,
          prerequisites: this.prerequisites,
          estimatedTime: this.learningTime,
          resources: []
        };
      }
    }
  };
};

// Static Methods
Skill.findByCategory = async function(category, filters = {}) {
  const where = {
    category,
    status: 'active'
  };
  
  // Apply filters
  if (filters.verified !== undefined) {
    where.verified = filters.verified;
  }
  
  if (filters.complexity) {
    where.complexityLevel = filters.complexity;
  }
  
  if (filters.minDemand) {
    const demandLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
    const minIndex = demandLevels.indexOf(filters.minDemand);
    where.marketDemand = { [sequelize.Op.in]: demandLevels.slice(minIndex) };
  }
  
  return await Skill.findAll({
    where,
    order: Skill.buildOrder(filters.sortBy),
    limit: filters.limit || 50,
    offset: filters.offset || 0
  });
};

Skill.buildOrder = function(sortBy = 'popularity') {
  const orderMap = {
    popularity: [['popularityScore', 'DESC'], ['usageCount', 'DESC']],
    name: [['name', 'ASC']],
    demand: [['marketDemand', 'DESC'], ['popularityScore', 'DESC']],
    usage: [['usageCount', 'DESC'], ['searchCount', 'DESC']],
    recent: [['createdAt', 'DESC']]
  };
  
  return orderMap[sortBy] || orderMap.popularity;
};

Skill.searchSkills = async function(query, filters = {}) {
  const where = {
    status: 'active',
    [sequelize.Op.or]: [
      { name: { [sequelize.Op.iLike]: `%${query}%` } },
      { normalizedName: { [sequelize.Op.iLike]: `%${query}%` } },
      { description: { [sequelize.Op.iLike]: `%${query}%` } },
      { synonyms: { [sequelize.Op.contains]: [query] } },
      { searchKeywords: { [sequelize.Op.contains]: [query] } },
      { tags: { [sequelize.Op.contains]: [query] } }
    ]
  };
  
  // Apply additional filters
  Object.assign(where, filters);
  
  // Increment search count for matched skills
  const matchedSkills = await Skill.findAll({ where, attributes: ['id'] });
  await Promise.all(
    matchedSkills.map(skill => 
      Skill.incrementSearchCount(skill.id).catch(() => {})
    )
  );
  
  return await Skill.findAll({
    where,
    order: [
      ['verified', 'DESC'],
      ['popularityScore', 'DESC'],
      ['usageCount', 'DESC']
    ],
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

Skill.getPopularSkills = async function(limit = 10, category = null) {
  const where = {
    status: 'active',
    popularityScore: { [sequelize.Op.gt]: 0.1 }
  };
  
  if (category) {
    where.category = category;
  }
  
  return await Skill.findAll({
    where,
    order: [['popularityScore', 'DESC']],
    limit
  });
};

Skill.getHighDemandSkills = async function(limit = 10) {
  return await Skill.findAll({
    where: {
      status: 'active',
      marketDemand: { [sequelize.Op.in]: ['high', 'very_high'] }
    },
    order: [
      ['marketDemand', 'DESC'],
      ['popularityScore', 'DESC']
    ],
    limit
  });
};

Skill.getCategoryStats = async function() {
  const results = await Skill.findAll({
    attributes: [
      'category',
      [sequelize.fn('COUNT', sequelize.col('id')), 'skillCount'],
      [sequelize.fn('AVG', sequelize.col('popularity_score')), 'avgPopularity'],
      [sequelize.fn('SUM', sequelize.col('usage_count')), 'totalUsage'],
      [sequelize.fn('SUM', sequelize.col('search_count')), 'totalSearches']
    ],
    where: {
      status: 'active'
    },
    group: ['category'],
    order: [[sequelize.literal('"skillCount"'), 'DESC']],
    raw: true
  });
  
  return results;
};

Skill.getSkillStats = async function() {
  const stats = await Skill.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalSkills'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN verified = true THEN 1 ELSE 0 END')), 'verifiedSkills'],
      [sequelize.fn('AVG', sequelize.col('popularity_score')), 'avgPopularity'],
      [sequelize.fn('SUM', sequelize.col('usage_count')), 'totalUsage'],
      [sequelize.fn('SUM', sequelize.col('search_count')), 'totalSearches']
    ],
    where: {
      status: 'active'
    },
    raw: true
  });
  
  return stats[0] || {};
};

Skill.findOrCreateSkill = async function(skillData) {
  const normalizedName = skillData.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
  
  const [skill, created] = await Skill.findOrCreate({
    where: {
      normalizedName,
      category: skillData.category
    },
    defaults: skillData
  });
  
  if (!created) {
    // Increment usage count for existing skill
    await skill.incrementUsageCount();
  }
  
  return { skill, created };
};

// Associations will be defined in the model index file
Skill.associate = function(models) {
  Skill.belongsToMany(models.User, {
    through: 'UserSkills',
    foreignKey: 'skillId',
    otherKey: 'userId',
    as: 'users'
  });
  
  Skill.belongsToMany(models.Service, {
    through: 'ServiceSkills',
    foreignKey: 'skillId',
    otherKey: 'serviceId',
    as: 'services'
  });
  
  Skill.belongsToMany(models.Portfolio, {
    through: 'PortfolioSkills',
    foreignKey: 'skillId',
    otherKey: 'portfolioId',
    as: 'portfolios'
  });
  
  Skill.belongsTo(models.User, {
    foreignKey: 'verifiedBy',
    as: 'verifier'
  });
};

module.exports = Skill;