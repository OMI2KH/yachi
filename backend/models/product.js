const { DataTypes } = require('sequelize');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { RealTimeService } = require('../services/realTimeService');

module.exports = (sequelize) => {
  const Service = sequelize.define('Service', {
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },

    // 🎯 Service Identification
    serviceNumber: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
      defaultValue: function() {
        return `SRV${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'users', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },

    // 📝 Service Information
    title: { 
      type: DataTypes.STRING(255), 
      allowNull: false,
      validate: {
        len: {
          args: [5, 255],
          msg: 'Title must be between 5 and 255 characters'
        },
        notEmpty: {
          msg: 'Title cannot be empty'
        }
      }
    },
    description: { 
      type: DataTypes.TEXT, 
      allowNull: false,
      validate: {
        len: {
          args: [10, 5000],
          msg: 'Description must be between 10 and 5000 characters'
        }
      }
    },
    shortDescription: {
      type: DataTypes.STRING(200),
      allowNull: true
    },

    // 💰 Pricing & Financials
    price: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      validate: {
        min: {
          args: [0.01],
          msg: 'Price must be greater than 0'
        },
        max: {
          args: [1000000],
          msg: 'Price cannot exceed 1,000,000'
        }
      }
    },
    currency: { 
      type: DataTypes.STRING(3), 
      allowNull: false,
      defaultValue: 'INR',
      validate: {
        isIn: {
          args: [['INR', 'USD', 'EUR']],
          msg: 'Invalid currency'
        }
      }
    },
    pricingModel: {
      type: DataTypes.ENUM('fixed', 'hourly', 'daily', 'project_based', 'custom'),
      defaultValue: 'fixed'
    },
    hourlyRate: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      validate: {
        min: {
          args: [0.01],
          msg: 'Hourly rate must be greater than 0'
        }
      }
    },
    minBudget: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    maxBudget: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    depositRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    depositAmount: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },

    // 🎯 Service Categorization
    category: { 
      type: DataTypes.ENUM(
        'plumbing',
        'electrical',
        'cleaning',
        'carpentry',
        'painting',
        'gardening',
        'mechanic',
        'tech_support',
        'beauty',
        'fitness',
        'tutoring',
        'event_planning',
        'other'
      ), 
      allowNull: false,
      index: true
    },
    subcategory: { 
      type: DataTypes.STRING(100), 
      allowNull: true,
      index: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      index: true
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    // 📍 Location & Service Area
    location: { 
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true,
      index: true
    },
    locationAddress: {
      type: DataTypes.JSONB,
      defaultValue: {
        street: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        landmark: '',
        fullAddress: ''
      }
    },
    serviceArea: {
      type: DataTypes.ENUM('local', 'regional', 'national', 'international', 'remote'),
      defaultValue: 'local'
    },
    serviceRadius: {
      type: DataTypes.INTEGER, // in kilometers
      defaultValue: 10,
      validate: {
        min: 0,
        max: 1000
      }
    },
    availableLocations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    remoteWork: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // 🎪 Yachi Gamification Features
    gamification: {
      type: DataTypes.JSONB,
      defaultValue: {
        pointsMultiplier: 1.0,
        featuredBoost: 0,
        achievementEligible: true,
        qualityScore: 0,
        popularityScore: 0,
        trustScore: 0
      }
    },
    yachiPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    featuredPriority: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // ⭐ Quality & Performance Metrics
    averageRating: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      }
    },
    totalReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    completionRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100
      }
    },
    responseRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100
      }
    },
    onTimeDelivery: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100
      }
    },

    // 📊 Service Statistics
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    impressionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    clickCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    inquiryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    bookingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    conversionRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    totalEarnings: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },

    // 🖼️ Media & Portfolio
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    videos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    portfolioItems: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    beforeAfterPhotos: {
      type: DataTypes.JSONB,
      defaultValue: {
        before: [],
        after: []
      }
    },
    certifications: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    // ⏰ Availability & Scheduling
    availability: {
      type: DataTypes.JSONB,
      defaultValue: {
        monday: { available: true, slots: ['09:00-18:00'] },
        tuesday: { available: true, slots: ['09:00-18:00'] },
        wednesday: { available: true, slots: ['09:00-18:00'] },
        thursday: { available: true, slots: ['09:00-18:00'] },
        friday: { available: true, slots: ['09:00-18:00'] },
        saturday: { available: true, slots: ['10:00-16:00'] },
        sunday: { available: false, slots: [] }
      }
    },
    workingHours: {
      type: DataTypes.JSONB,
      defaultValue: {
        start: '09:00',
        end: '18:00',
        timezone: 'Asia/Kolkata'
      }
    },
    maxBookingsPerDay: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      validate: {
        min: 1,
        max: 50
      }
    },
    bookingAdvanceNotice: {
      type: DataTypes.INTEGER, // in hours
      defaultValue: 2,
      validate: {
        min: 1,
        max: 720 // 30 days
      }
    },
    estimatedCompletionTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },

    // 💼 Service Specifications
    experienceLevel: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'expert', 'master'),
      defaultValue: 'intermediate'
    },
    yearsOfExperience: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 50
      }
    },
    toolsRequired: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    materialsProvided: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    warranty: {
      type: DataTypes.JSONB,
      defaultValue: {
        provided: false,
        duration: 0, // in days
        terms: ''
      }
    },
    insurance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // 🏆 Monetization & Premium Features
    isPremium: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    premiumExpiresAt: { 
      type: DataTypes.DATE 
    },
    premiumFeatures: {
      type: DataTypes.JSONB,
      defaultValue: {
        featuredListing: false,
        prioritySupport: false,
        advancedAnalytics: false,
        customDomain: false
      }
    },
    subscriptionTier: {
      type: DataTypes.ENUM('basic', 'professional', 'enterprise'),
      defaultValue: 'basic'
    },

    // 🛡️ Safety & Verification
    isVerifiedWorker: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    verificationLevel: {
      type: DataTypes.ENUM('unverified', 'basic', 'verified', 'premium_verified'),
      defaultValue: 'unverified'
    },
    faydaVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    backgroundChecked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    trustScore: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      }
    },

    // 📈 Status & Visibility
    visibilityStatus: { 
      type: DataTypes.ENUM('draft', 'active', 'paused', 'removed', 'under_review'), 
      defaultValue: 'draft',
      index: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    featuredUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    moderationStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'flagged'),
      defaultValue: 'pending'
    },
    moderationNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // 🔍 Search & Discovery
    searchKeywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    seoTitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    seoDescription: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    searchRank: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // 📊 Analytics Metadata
    performanceMetrics: {
      type: DataTypes.JSONB,
      defaultValue: {
        dailyViews: [],
        dailyBookings: [],
        peakHours: [],
        popularLocations: []
      }
    },
    lastPerformanceUpdate: {
      type: DataTypes.DATE,
      allowNull: true
    }

  }, {
    tableName: 'services',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (service) => {
        // Generate service number if not provided
        if (!service.serviceNumber) {
          service.serviceNumber = `SRV${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        }
        
        // Set short description if not provided
        if (!service.shortDescription && service.description) {
          service.shortDescription = service.description.substring(0, 197) + '...';
        }
        
        // Calculate initial quality score
        await service.calculateQualityScore();
      },
      afterCreate: async (service) => {
        // Award points for service creation
        await YachiGamification.awardServiceCreation(service.userId);
        
        // Track service creation in analytics
        await YachiAnalytics.trackServiceCreation(service);
        
        // Send real-time notification for new premium services
        if (service.isPremium) {
          await RealTimeService.emitToAll('new_premium_service', {
            serviceId: service.id,
            title: service.title,
            category: service.category
          });
        }
      },
      afterUpdate: async (service) => {
        // Handle premium expiration
        if (service.changed('premiumExpiresAt') && service.premiumExpiresAt < new Date()) {
          service.isPremium = false;
          await service.save();
        }
        
        // Update quality score when relevant fields change
        if (service.changed('averageRating') || service.changed('completionRate') || service.changed('totalReviews')) {
          await service.calculateQualityScore();
        }
        
        // Update conversion rate when views or bookings change
        if (service.changed('viewCount') || service.changed('bookingCount')) {
          await service.calculateConversionRate();
        }
      }
    },
    indexes: [
      { fields: ['user_id'] },
      { fields: ['category'] },
      { fields: ['subcategory'] },
      { fields: ['visibility_status'] },
      { fields: ['is_active'] },
      { fields: ['is_premium'] },
      { fields: ['average_rating'] },
      { fields: ['price'] },
      { fields: ['created_at'] },
      { fields: ['service_number'], unique: true },
      { 
        fields: ['location'],
        using: 'GIST'
      },
      {
        fields: ['tags'],
        using: 'GIN'
      },
      {
        fields: ['search_keywords'],
        using: 'GIN'
      },
      {
        fields: ['category', 'is_active', 'average_rating'],
        name: 'services_category_active_rating_idx'
      },
      {
        fields: ['user_id', 'visibility_status'],
        name: 'services_user_visibility_idx'
      }
    ]
  });

  // 🎯 Instance Methods
  Service.prototype.calculateQualityScore = async function() {
    const ratingWeight = 0.4;
    const completionWeight = 0.3;
    const responseWeight = 0.2;
    const experienceWeight = 0.1;
    
    const ratingScore = (this.averageRating / 5) * 100;
    const completionScore = this.completionRate;
    const responseScore = this.responseRate;
    const experienceScore = Math.min(this.yearsOfExperience * 2, 100); // Max 50 years = 100 points
    
    const qualityScore = (
      ratingScore * ratingWeight +
      completionScore * completionWeight +
      responseScore * responseWeight +
      experienceScore * experienceWeight
    );
    
    this.gamification.qualityScore = Math.round(qualityScore);
    await this.save();
  };

  Service.prototype.calculateConversionRate = async function() {
    if (this.viewCount > 0) {
      this.conversionRate = (this.bookingCount / this.viewCount) * 100;
      await this.save();
    }
  };

  Service.prototype.incrementViews = async function() {
    this.viewCount += 1;
    this.impressionCount += 1;
    await this.save();
    
    // Update performance metrics
    await this.updatePerformanceMetrics('view');
  };

  Service.prototype.incrementClicks = async function() {
    this.clickCount += 1;
    await this.save();
    
    // Update performance metrics
    await this.updatePerformanceMetrics('click');
  };

  Service.prototype.recordBooking = async function() {
    this.bookingCount += 1;
    await this.save();
    
    // Update performance metrics
    await this.updatePerformanceMetrics('booking');
    
    // Award points for successful booking
    await YachiGamification.awardServiceBooking(this.userId);
  };

  Service.prototype.updatePerformanceMetrics = async function(action) {
    const today = new Date().toISOString().split('T')[0];
    const metrics = this.performanceMetrics || {
      dailyViews: [],
      dailyBookings: [],
      peakHours: [],
      popularLocations: []
    };
    
    // Update daily metrics
    let dailyMetric = metrics.dailyViews.find(d => d.date === today);
    if (!dailyMetric) {
      dailyMetric = { date: today, count: 0 };
      metrics.dailyViews.push(dailyMetric);
    }
    
    if (action === 'view') dailyMetric.count += 1;
    if (action === 'booking') {
      const bookingMetric = metrics.dailyBookings.find(d => d.date === today) || { date: today, count: 0 };
      bookingMetric.count += 1;
      if (!metrics.dailyBookings.find(d => d.date === today)) {
        metrics.dailyBookings.push(bookingMetric);
      }
    }
    
    // Update peak hours
    const hour = new Date().getHours();
    let hourMetric = metrics.peakHours.find(h => h.hour === hour);
    if (!hourMetric) {
      hourMetric = { hour: hour, count: 0 };
      metrics.peakHours.push(hourMetric);
    }
    hourMetric.count += 1;
    
    this.performanceMetrics = metrics;
    this.lastPerformanceUpdate = new Date();
    await this.save();
  };

  Service.prototype.getSimilarServices = function(limit = 5) {
    return Service.findAll({
      where: {
        category: this.category,
        id: { [sequelize.Op.ne]: this.id },
        isActive: true,
        visibilityStatus: 'active'
      },
      limit: limit,
      order: [
        ['isPremium', 'DESC'],
        ['averageRating', 'DESC'],
        ['bookingCount', 'DESC']
      ]
    });
  };

  Service.prototype.activate = async function() {
    this.visibilityStatus = 'active';
    this.isActive = true;
    await this.save();
  };

  Service.prototype.pause = async function() {
    this.visibilityStatus = 'paused';
    this.isActive = false;
    await this.save();
  };

  Service.prototype.upgradeToPremium = async function(durationDays = 30) {
    this.isPremium = true;
    this.premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    this.subscriptionTier = 'professional';
    await this.save();
    
    // Award premium achievement
    await YachiGamification.awardPremiumUpgrade(this.userId);
  };

  // 🎯 Static Methods
  Service.findByCategory = function(category, options = {}) {
    const whereClause = {
      category,
      isActive: true,
      visibilityStatus: 'active'
    };
    
    if (options.location) {
      whereClause[sequelize.Op.and] = [
        sequelize.where(
          sequelize.fn(
            'ST_DWithin',
            sequelize.col('location'),
            sequelize.fn('ST_MakePoint', options.location.longitude, options.location.latitude),
            (options.radius || 10) * 1000 // Convert km to meters
          ),
          true
        )
      ];
    }
    
    return this.findAll({
      where: whereClause,
      order: [
        ['isPremium', 'DESC'],
        ['featuredPriority', 'DESC'],
        ['averageRating', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: options.limit || 20
    });
  };

  Service.findPremiumServices = function(limit = 10) {
    return this.findAll({
      where: {
        isPremium: true,
        isActive: true,
        visibilityStatus: 'active',
        premiumExpiresAt: {
          [sequelize.Op.gt]: new Date()
        }
      },
      order: [
        ['featuredPriority', 'DESC'],
        ['averageRating', 'DESC']
      ],
      limit: limit
    });
  };

  Service.getTrendingServices = function(limit = 10) {
    return this.findAll({
      where: {
        isActive: true,
        visibilityStatus: 'active',
        viewCount: {
          [sequelize.Op.gt]: 10
        }
      },
      order: [
        ['viewCount', 'DESC'],
        ['conversionRate', 'DESC']
      ],
      limit: limit
    });
  };

  Service.getProviderStats = function(userId) {
    return this.findAll({
      where: { userId },
      attributes: [
        'visibilityStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('view_count')), 'totalViews'],
        [sequelize.fn('SUM', sequelize.col('booking_count')), 'totalBookings'],
        [sequelize.fn('AVG', sequelize.col('average_rating')), 'avgRating']
      ],
      group: ['visibilityStatus']
    });
  };

  // 🎯 Association Method
  Service.associate = (models) => {
    Service.belongsTo(models.User, { 
      foreignKey: 'userId', 
      as: 'Provider' 
    });
    Service.hasMany(models.Job, { 
      foreignKey: 'serviceId', 
      as: 'Jobs' 
    });
    Service.hasMany(models.Rating, { 
      foreignKey: 'serviceId', 
      as: 'Ratings' 
    });
  };

  return Service;
};