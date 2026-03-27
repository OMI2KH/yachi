require('dotenv').config();
const { Sequelize, DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');

// 🚀 Advanced Sequelize Configuration
let sequelize;
if (process.env.NODE_ENV === 'test') {
  // Use in-memory SQLite for tests to avoid Postgres dependency
  sequelize = new Sequelize('sqlite::memory:', {
    dialect: 'sqlite',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: false,
    }
  });
} else {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
  pool: {
    max: 20,
    min: 2,
    acquire: 60000,
    idle: 10000,
    evict: 10000,
  },
  retry: {
    max: 3,
    timeout: 30000,
  },
  benchmark: true,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: false, // Enable soft deletes if needed
    },
  });
}

// 🎪 Yachi User Model with Advanced Features
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: {
          args: [2, 100],
          msg: 'Name must be between 2 and 100 characters'
        },
        notEmpty: {
          msg: 'Name cannot be empty'
        }
      }
    },
    email: {
      type: DataTypes.STRING(150),
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
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^[+]?[1-9][\d]{0,15}$/,
          msg: 'Invalid phone number format'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6, 100],
          msg: 'Password must be at least 6 characters'
        }
      }
    },

    // 🎯 Yachi Role System
    role: {
      type: DataTypes.ENUM('provider', 'client', 'admin', 'moderator'),
      defaultValue: 'client',
      validate: {
        isIn: {
          args: [['provider', 'client', 'admin', 'moderator']],
          msg: 'Invalid role'
        }
      }
    },
    accountType: {
      type: DataTypes.ENUM('basic', 'premium', 'enterprise'),
      defaultValue: 'basic'
    },

    // 🔐 Verification System
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
    faydaVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    selfieVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    documentVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedBadge: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verificationLevel: {
      type: DataTypes.ENUM('unverified', 'basic', 'advanced', 'premium'),
      defaultValue: 'unverified'
    },

    // 🎪 Yachi Gamification System
    yachiPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
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

    // 📍 Location & Profile
    location: {
      type: DataTypes.JSONB,
      defaultValue: {
        address: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        coordinates: {
          latitude: null,
          longitude: null
        }
      }
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Bio cannot exceed 500 characters'
        }
      }
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'Invalid date of birth'
        },
        isBefore: {
          args: new Date().toISOString(),
          msg: 'Date of birth must be in the past'
        }
      }
    },

    // ⚙️ Preferences & Settings
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        notifications: {
          push: true,
          email: true,
          sms: false
        },
        language: 'en',
        currency: 'ETB',
        theme: 'light'
      }
    },
    serviceCategories: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    // 📊 Analytics & Metrics
    stats: {
      type: DataTypes.JSONB,
      defaultValue: {
        completedJobs: 0,
        cancelledJobs: 0,
        totalEarnings: 0,
        averageRating: 0,
        responseRate: 0,
        completionRate: 100
      }
    },
    lastActive: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    // 🛡️ Security & Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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

    // 🔍 Search & Discovery
    searchVisibility: {
      type: DataTypes.ENUM('public', 'private', 'connections_only'),
      defaultValue: 'public'
    },
    profileCompletion: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    }
  },
  {
    hooks: {
      beforeCreate: async (user) => {
        await user.hashPassword();
        await user.calculateProfileCompletion();
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          await user.hashPassword();
        }
        if (user.changed('name') || user.changed('bio') || user.changed('profileImage')) {
          await user.calculateProfileCompletion();
        }
      },
      afterCreate: async (user) => {
        // Award welcome points
        await YachiGamification.awardWelcomePoints(user.id);
        await YachiAnalytics.trackUserRegistration(user);
      }
    },
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['role', 'is_active']
      },
      {
        fields: ['location']
      },
      {
        fields: ['yachi_points']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['fayda_verified', 'selfie_verified', 'document_verified']
      }
    ]
  }
);

// 🎯 User Instance Methods
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
    'name', 'email', 'phone', 'profileImage', 'bio', 
    'location', 'serviceCategories', 'faydaVerified'
  ];

  fields.forEach(field => {
    if (this[field] && (typeof this[field] !== 'object' || Object.keys(this[field]).length > 0)) {
      completion += 100 / fields.length;
    }
  });

  this.profileCompletion = Math.round(completion);
};

User.prototype.awardPoints = async function(points, reason) {
  this.yachiPoints += points;
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
  }
};

User.prototype.getPublicProfile = function() {
  const publicFields = [
    'id', 'name', 'email', 'role', 'verifiedBadge', 'faydaVerified',
    'yachiPoints', 'level', 'profileImage', 'bio', 'location',
    'stats', 'serviceCategories', 'profileCompletion', 'createdAt'
  ];
  
  const profile = {};
  publicFields.forEach(field => {
    profile[field] = this[field];
  });
  
  return profile;
};

// 🎯 User Static Methods
User.findByEmail = function(email) {
  return this.findOne({ where: { email: email.toLowerCase() } });
};

User.findProvidersNearby = function(latitude, longitude, radius = 10, category = null) {
  const whereClause = {
    role: 'provider',
    isActive: true,
    [Op.and]: [
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
      [Op.contains]: [category]
    };
  }

  return this.findAll({
    where: whereClause,
    order: [['yachiPoints', 'DESC']]
  });
};

User.getLeaderboard = function(limit = 100) {
  return this.findAll({
    where: {
      isActive: true,
      yachiPoints: {
        [Op.gt]: 0
      }
    },
    order: [['yachiPoints', 'DESC']],
    limit: limit,
    attributes: ['id', 'name', 'profileImage', 'yachiPoints', 'level', 'role']
  });
};

// 🛠️ Yachi Service Model (Enhanced Product Model)
const Service = sequelize.define(
  'Service',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: {
          args: [3, 200],
          msg: 'Title must be between 3 and 200 characters'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: {
          args: [10, 2000],
          msg: 'Description must be between 10 and 2000 characters'
        }
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0.01],
          msg: 'Price must be greater than 0'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ETB'
    },
    duration: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: false,
      validate: {
        min: {
          args: [15],
          msg: 'Minimum duration is 15 minutes'
        }
      }
    },

    // 🎯 Service Categorization
    category: {
      type: DataTypes.ENUM(
        'plumbing', 'electrical', 'cleaning', 'carpentry',
        'painting', 'gardening', 'mechanic', 'tech_support',
        'other'
      ),
      allowNull: false
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    // 📍 Service Location
    serviceLocation: {
      type: DataTypes.ENUM('at_provider', 'at_client', 'remote', 'both'),
      defaultValue: 'at_client'
    },
    serviceRadius: {
      type: DataTypes.INTEGER, // in kilometers
      defaultValue: 10
    },
    availableLocations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    // ⭐ Quality & Ratings
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
      defaultValue: 100
    },

    // 🎪 Yachi Features
    isPremium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    yachiVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    gamification: {
      type: DataTypes.JSONB,
      defaultValue: {
        pointsMultiplier: 1.0,
        achievementEligible: true,
        featuredBoost: 0
      }
    },

    // 📊 Availability & Booking
    availability: {
      type: DataTypes.JSONB,
      defaultValue: {
        monday: { available: true, slots: [] },
        tuesday: { available: true, slots: [] },
        wednesday: { available: true, slots: [] },
        thursday: { available: true, slots: [] },
        friday: { available: true, slots: [] },
        saturday: { available: true, slots: [] },
        sunday: { available: true, slots: [] }
      }
    },
    maxBookingsPerDay: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    bookingAdvanceNotice: {
      type: DataTypes.INTEGER, // in hours
      defaultValue: 2
    },

    // 🖼️ Media & Presentation
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    portfolioItems: {
      type: DataTypes.JSONB,
      defaultValue: []
    },

    // 📈 Performance Metrics
    viewCount: {
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

    // 🏆 Status & Moderation
    status: {
      type: DataTypes.ENUM('draft', 'active', 'paused', 'rejected', 'archived'),
      defaultValue: 'draft'
    },
    moderationNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    hooks: {
      beforeSave: async (service) => {
        if (service.changed('price') && service.price < 50) {
          service.isPremium = false; // Premium services must be above 50
        }
      },
      afterCreate: async (service) => {
        await YachiGamification.awardServiceCreation(service.userId);
      }
    },
    indexes: [
      {
        fields: ['userId', 'status']
      },
      {
        fields: ['category', 'isActive']
      },
      {
        fields: ['averageRating']
      },
      {
        fields: ['price']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['tags'],
        using: 'GIN'
      }
    ]
  }
);

// 🎯 Service Instance Methods
Service.prototype.incrementViews = async function() {
  this.viewCount += 1;
  await this.save();
};

Service.prototype.calculateConversionRate = async function() {
  if (this.viewCount > 0) {
    this.conversionRate = (this.bookingCount / this.viewCount) * 100;
    await this.save();
  }
};

Service.prototype.getSimilarServices = function(limit = 5) {
  return Service.findAll({
    where: {
      category: this.category,
      id: { [Op.ne]: this.id },
      isActive: true,
      status: 'active'
    },
    limit: limit,
    order: [['averageRating', 'DESC']]
  });
};

// 🔗 Advanced Relationships
User.hasMany(Service, { 
  foreignKey: 'userId', 
  as: 'services',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Service.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'provider'
});

// Additional relationships for the complete Yachi ecosystem
User.hasMany(Service, { foreignKey: 'userId', as: 'providedServices' });

// 🚀 Export with connection test
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Yachi Database connected successfully');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('🔄 Database synced for development');
    }
  } catch (error) {
    console.error('❌ Unable to connect to Yachi database:', error);
    process.exit(1);
  }
};

testConnection();

module.exports = { 
  sequelize, 
  User, 
  Service,
  Op // Export operators for complex queries
};

// Also export DataTypes for model constructors
module.exports.DataTypes = require('sequelize').DataTypes;

// Initialize monetization models if present
try {
  const PremiumPlanModel = require('./PremiumPlan');
  const BadgePurchaseModel = require('./BadgePurchase');
  const SubscriptionModel = require('./Subscription');

  const PremiumPlan = PremiumPlanModel(sequelize);
  const BadgePurchase = BadgePurchaseModel(sequelize);
  const Subscription = SubscriptionModel(sequelize);

  // Associations
  User.hasMany(BadgePurchase, { foreignKey: 'userId', as: 'badgePurchases' });
  User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
  PremiumPlan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });

  module.exports.PremiumPlan = PremiumPlan;
  module.exports.BadgePurchase = BadgePurchase;
  module.exports.Subscription = Subscription;
} catch (err) {
  // If monetization models can't be initialized, warn but don't crash the app.
  console.warn('Monetization models not initialized:', err.message);
}

// Initialize webhook event model
try {
  const WebhookEventModel = require('./WebhookEvent');
  const WebhookEvent = WebhookEventModel(sequelize, DataTypes);
  module.exports.WebhookEvent = WebhookEvent;
} catch (err) {
  console.warn('WebhookEvent model not initialized:', err.message);
}