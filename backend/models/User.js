const { DataTypes } = require('sequelize');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { RealTimeService } = require('../services/realTimeService');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },

    // 🎯 Basic Information
    name: { 
      type: DataTypes.STRING(255), 
      allowNull: false,
      validate: {
        len: {
          args: [2, 255],
          msg: 'Name must be between 2 and 255 characters'
        },
        notEmpty: {
          msg: 'Name cannot be empty'
        }
      }
    },
    email: { 
      type: DataTypes.STRING(255), 
      allowNull: false, 
      unique: {
        name: 'users_email_unique',
        msg: 'Email already exists'
      },
      validate: {
        isEmail: {
          msg: 'Invalid email format'
        },
        notEmpty: {
          msg: 'Email cannot be empty'
        }
      }
    },
    phoneNumber: { 
      type: DataTypes.STRING(20),
      validate: {
        is: {
          args: /^[+]?[1-9][\d]{0,15}$/,
          msg: 'Invalid phone number format'
        }
      }
    },
    password: { 
      type: DataTypes.STRING(255), 
      allowNull: false,
      validate: {
        len: {
          args: [6, 255],
          msg: 'Password must be at least 6 characters'
        }
      }
    },

    // 🎪 Yachi Role System
    role: { 
      type: DataTypes.ENUM('client','provider','admin','moderator','support'), 
      allowNull: false,
      defaultValue: 'client',
      index: true
    },
    accountType: {
      type: DataTypes.ENUM('basic', 'premium', 'enterprise'),
      defaultValue: 'basic',
      index: true
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {
        canCreateServices: true,
        canBookServices: true,
        canWithdrawFunds: true,
        canVerifyUsers: false,
        canModerate: false,
        canManagePlatform: false
      }
    },

    // 🔐 Advanced Verification System
    faydaId: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
      validate: {
        len: {
          args: [12, 20],
          msg: 'Fayda ID must be between 12-20 characters'
        }
      }
    },
    faydaIdDocument: { 
      type: DataTypes.STRING(500) 
    },
    faydaVerified: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false,
      index: true
    },
    faydaVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    selfieVerified: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    selfieVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    selfieImage: {
      type: DataTypes.STRING(500),
      allowNull: true
    },

    documents: { 
      type: DataTypes.JSONB,
      defaultValue: []
    },
    documentVerified: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    documentVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    verificationLevel: {
      type: DataTypes.ENUM('unverified', 'basic', 'verified', 'premium_verified'),
      defaultValue: 'unverified',
      index: true
    },
    verificationScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },

    // 🎯 Profile & Portfolio
    profileImage: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    coverImage: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      validate: {
        len: {
          args: [0, 1000],
          msg: 'Bio cannot exceed 1000 characters'
        }
      }
    },
    tagline: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    portfolio: { 
      type: DataTypes.JSONB,
      defaultValue: {
        projects: [],
        skills: [],
        certifications: [],
        awards: []
      }
    },
    socialLinks: {
      type: DataTypes.JSONB,
      defaultValue: {
        website: null,
        linkedin: null,
        twitter: null,
        instagram: null,
        facebook: null
      }
    },

    // 📍 Location & Service Area
    location: {
      type: DataTypes.JSONB,
      defaultValue: {
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        coordinates: {
          latitude: null,
          longitude: null
        },
        timezone: 'Asia/Kolkata'
      }
    },
    serviceAreas: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    serviceRadius: {
      type: DataTypes.INTEGER, // in kilometers
      defaultValue: 10
    },

    // 🎪 Yachi Gamification System
    yachiPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      },
      index: true
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 100
      }
    },
    experience: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    achievements: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    badges: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    leaderboardRank: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    streak: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // 💼 Professional Information (for providers)
    professionalInfo: {
      type: DataTypes.JSONB,
      defaultValue: {
        yearsOfExperience: 0,
        hourlyRate: 0,
        specialization: '',
        languages: ['English'],
        education: [],
        workHistory: []
      }
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    serviceCategories: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    hourlyRate: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0
    },

    // ⏰ Availability & Scheduling
    availability: { 
      type: DataTypes.ENUM('Available','Busy','Offline','OnLeave'), 
      defaultValue: 'Available',
      index: true
    },
    workingHours: {
      type: DataTypes.JSONB,
      defaultValue: {
        monday: { start: '09:00', end: '18:00', available: true },
        tuesday: { start: '09:00', end: '18:00', available: true },
        wednesday: { start: '09:00', end: '18:00', available: true },
        thursday: { start: '09:00', end: '18:00', available: true },
        friday: { start: '09:00', end: '18:00', available: true },
        saturday: { start: '10:00', end: '16:00', available: true },
        sunday: { start: '00:00', end: '00:00', available: false }
      }
    },
    autoAcceptBookings: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // 📊 Performance Metrics
    stats: {
      type: DataTypes.JSONB,
      defaultValue: {
        completedJobs: 0,
        cancelledJobs: 0,
        totalEarnings: 0,
        averageRating: 0,
        responseRate: 100,
        completionRate: 100,
        onTimeDelivery: 100,
        clientSatisfaction: 0
      }
    },
    rating: {
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

    // 💰 Financial Information
    walletBalance: { 
      type: DataTypes.DECIMAL(12, 2), 
      defaultValue: 0 
    },
    totalEarnings: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    pendingPayouts: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    escrowBalance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'INR'
    },
    taxInfo: {
      type: DataTypes.JSONB,
      defaultValue: {
        panNumber: null,
        gstNumber: null,
        taxPercentage: 0
      }
    },

    // 🏆 Premium Features
    verifiedBadge: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    premiumListing: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    premiumFeatures: {
      type: DataTypes.JSONB,
      defaultValue: {
        featuredProfile: false,
        advancedAnalytics: false,
        prioritySupport: false,
        customDomain: false,
        apiAccess: false
      }
    },
    subscriptionTier: {
      type: DataTypes.ENUM('free', 'basic', 'professional', 'enterprise'),
      defaultValue: 'free'
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // ⚙️ Preferences & Settings
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        notifications: {
          email: true,
          push: true,
          sms: false,
          marketing: false
        },
        privacy: {
          profileVisibility: 'public',
          showEarnings: false,
          showPhone: 'after_booking',
          showLocation: 'city_only'
        },
        language: 'en',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        theme: 'light'
      }
    },
    notificationSettings: {
      type: DataTypes.JSONB,
      defaultValue: {
        newBookings: true,
        messages: true,
        reviews: true,
        payments: true,
        promotions: true,
        systemUpdates: true
      }
    },

    // 🛡️ Security & Compliance
    policyAgreed: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    termsAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    twoFactorSecret: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // 📈 Activity Tracking
    lastLogin: { 
      type: DataTypes.DATE 
    },
    lastActive: {
      type: DataTypes.DATE,
      allowNull: true
    },
    loginCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    profileViews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    profileCompletion: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },

    // 🔍 Search & Discovery
    searchVisibility: {
      type: DataTypes.ENUM('public', 'private', 'connections_only'),
      defaultValue: 'public'
    },
    profileStrength: {
      type: DataTypes.ENUM('weak', 'fair', 'good', 'excellent'),
      defaultValue: 'weak'
    },
    keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    // 🎯 Status & Moderation
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'deactivated', 'pending'),
      defaultValue: 'active',
      index: true
    },
    suspendedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    suspensionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    moderationNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trustScore: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1
      }
    }

  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        await user.hashPassword();
        await user.calculateProfileCompletion();
        await user.calculateVerificationScore();
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          await user.hashPassword();
        }
        if (user.changed('name') || user.changed('bio') || user.changed('profileImage')) {
          await user.calculateProfileCompletion();
        }
        if (user.changed('faydaVerified') || user.changed('selfieVerified') || user.changed('documentVerified')) {
          await user.calculateVerificationScore();
        }
      },
      afterCreate: async (user) => {
        // Award welcome points
        await YachiGamification.awardWelcomePoints(user.id);
        
        // Track user registration
        await YachiAnalytics.trackUserRegistration(user);
        
        // Send welcome notification
        await RealTimeService.emitToUser(user.id, 'welcome', {
          userId: user.id,
          name: user.name,
          role: user.role
        });
      },
      afterUpdate: async (user) => {
        // Handle level ups
        if (user.changed('experience')) {
          await user.checkLevelUp();
        }
        
        // Handle verification badge
        if (user.changed('verificationScore') && user.verificationScore >= 80) {
          user.verifiedBadge = true;
          await user.save();
        }
      }
    },
    indexes: [
      { fields: ['email'] },
      { fields: ['role'] },
      { fields: ['fayda_verified'] },
      { fields: ['account_type'] },
      { fields: ['verification_level'] },
      { fields: ['yachi_points'] },
      { fields: ['availability'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['last_active'] },
      { 
        fields: ['role', 'availability'],
        name: 'users_role_availability_idx'
      },
      {
        fields: ['yachi_points', 'level'],
        name: 'users_points_level_idx'
      },
      {
        fields: ['location'],
        using: 'GIST'
      }
    ]
  });

  // 🎯 Instance Methods
  User.prototype.hashPassword = async function() {
    if (this.password) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
  };

  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.calculateProfileCompletion = async function() {
    let completion = 0;
    const fields = [
      'name', 'email', 'phoneNumber', 'profileImage', 'bio', 
      'location', 'skills', 'serviceCategories'
    ];

    fields.forEach(field => {
      if (this[field]) {
        if (Array.isArray(this[field]) && this[field].length > 0) {
          completion += 100 / fields.length;
        } else if (typeof this[field] === 'object' && Object.keys(this[field]).length > 0) {
          completion += 100 / fields.length;
        } else if (this[field].toString().trim().length > 0) {
          completion += 100 / fields.length;
        }
      }
    });

    this.profileCompletion = Math.round(completion);
    
    // Update profile strength
    if (this.profileCompletion >= 90) this.profileStrength = 'excellent';
    else if (this.profileCompletion >= 70) this.profileStrength = 'good';
    else if (this.profileCompletion >= 50) this.profileStrength = 'fair';
    else this.profileStrength = 'weak';
  };

  User.prototype.calculateVerificationScore = async function() {
    let score = 0;
    
    if (this.emailVerified) score += 20;
    if (this.phoneVerified) score += 20;
    if (this.faydaVerified) score += 30;
    if (this.selfieVerified) score += 15;
    if (this.documentVerified) score += 15;
    
    this.verificationScore = score;
    
    // Update verification level
    if (score >= 80) this.verificationLevel = 'premium_verified';
    else if (score >= 50) this.verificationLevel = 'verified';
    else if (score >= 20) this.verificationLevel = 'basic';
    else this.verificationLevel = 'unverified';
  };

  User.prototype.awardPoints = async function(points, reason) {
    this.yachiPoints += points;
    this.experience += points;
    await this.save();
    
    // Check for level up
    await this.checkLevelUp();
    
    // Log points transaction
    await YachiGamification.logPointsTransaction(this.id, points, reason);
  };

  User.prototype.checkLevelUp = async function() {
    const requiredXP = this.level * 1000;
    if (this.experience >= requiredXP) {
      this.level += 1;
      this.experience = 0;
      await this.save();
      
      // Award level up achievement
      await YachiGamification.awardLevelUpAchievement(this.id, this.level);
      
      // Send level up notification
      await RealTimeService.emitToUser(this.id, 'level_up', {
        userId: this.id,
        newLevel: this.level
      });
    }
  };

  User.prototype.updateStats = async function(field, value) {
    const stats = this.stats || {};
    stats[field] = value;
    this.stats = stats;
    await this.save();
  };

  User.prototype.getPublicProfile = function() {
    const publicFields = [
      'id', 'name', 'email', 'role', 'profileImage', 'coverImage', 'bio', 'tagline',
      'verificationLevel', 'verifiedBadge', 'yachiPoints', 'level', 'rating', 
      'totalReviews', 'stats', 'skills', 'serviceCategories', 'location',
      'socialLinks', 'profileCompletion', 'profileStrength', 'createdAt'
    ];
    
    const profile = {};
    publicFields.forEach(field => {
      profile[field] = this[field];
    });
    
    return profile;
  };

  User.prototype.upgradeToPremium = async function(tier = 'professional', durationMonths = 1) {
    this.accountType = 'premium';
    this.subscriptionTier = tier;
    this.subscriptionExpiresAt = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000);
    this.premiumListing = true;
    
    await this.save();
    
    // Award premium achievement
    await YachiGamification.awardPremiumUpgrade(this.id, tier);
  };

  // 🎯 Static Methods
  User.findByEmail = function(email) {
    return this.findOne({ 
      where: { 
        email: email.toLowerCase().trim() 
      } 
    });
  };

  User.findProvidersNearby = function(latitude, longitude, radius = 10, category = null) {
    const whereClause = {
      role: 'provider',
      status: 'active',
      availability: 'Available',
      [sequelize.Op.and]: [
        sequelize.where(
          sequelize.fn(
            'ST_DWithin',
            sequelize.col('location->coordinates'),
            sequelize.fn('ST_MakePoint', longitude, latitude),
            radius * 1000 // Convert km to meters
          ),
          true
        )
      ]
    };

    if (category) {
      whereClause.serviceCategories = {
        [sequelize.Op.contains]: [category]
      };
    }

    return this.findAll({
      where: whereClause,
      order: [
        ['premiumListing', 'DESC'],
        ['yachiPoints', 'DESC'],
        ['rating', 'DESC']
      ],
      limit: 20
    });
  };

  User.getLeaderboard = function(limit = 100, role = null) {
    const whereClause = {
      status: 'active',
      yachiPoints: {
        [sequelize.Op.gt]: 0
      }
    };

    if (role) {
      whereClause.role = role;
    }

    return this.findAll({
      where: whereClause,
      order: [['yachiPoints', 'DESC']],
      limit: limit,
      attributes: ['id', 'name', 'profileImage', 'yachiPoints', 'level', 'role', 'verifiedBadge']
    });
  };

  User.getStats = function() {
    return this.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('yachi_points')), 'avgPoints'],
        [sequelize.fn('AVG', sequelize.col('profile_completion')), 'avgProfileCompletion']
      ],
      group: ['role']
    });
  };

  // 🎯 Association Method
  User.associate = (models) => {
    User.hasMany(models.Service, { 
      foreignKey: 'userId', 
      as: 'services' 
    });
    User.hasMany(models.Job, { 
      foreignKey: 'clientId', 
      as: 'clientJobs' 
    });
    User.hasMany(models.Job, { 
      foreignKey: 'providerId', 
      as: 'providerJobs' 
    });
    User.hasMany(models.Rating, { 
      foreignKey: 'userId', 
      as: 'receivedRatings' 
    });
    User.hasMany(models.Rating, { 
      foreignKey: 'reviewerId', 
      as: 'givenRatings' 
    });
    User.hasMany(models.Transaction, { 
      foreignKey: 'userId', 
      as: 'transactions' 
    });
    User.hasMany(models.Transaction, { 
      foreignKey: 'providerId', 
      as: 'providerTransactions' 
    });
    User.hasMany(models.Message, { 
      foreignKey: 'senderId', 
      as: 'sentMessages' 
    });
    User.hasMany(models.Message, { 
      foreignKey: 'recipientId', 
      as: 'receivedMessages' 
    });
  };

  return User;
};
