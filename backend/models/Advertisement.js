const mongoose = require('mongoose');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');

const advertisementSchema = new mongoose.Schema(
  {
    // 🎯 Basic Advertisement Information
    title: {
      type: String,
      required: [true, 'Advertisement title is required'],
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
      trim: true,
      index: 'text',
    },
    description: {
      type: String,
      required: [true, 'Advertisement description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
    },

    // 💰 Pricing & Budget - UPDATED for 9999 ETB per Week
    pricingModel: {
      type: String,
      enum: ['standard', 'premium'],
      default: 'standard',
      required: true
    },
    
    // For standard ads: 9999 ETB per week (approx 1428 ETB per day)
    // For premium ads: Contact-based pricing
    pricePerWeek: {
      type: Number,
      default: 9999, // Standard price in ETB
      min: [9999, 'Standard price must be 9999 ETB per week'],
      validate: {
        validator: function(value) {
          if (this.pricingModel === 'standard') {
            return value === 9999; // Fixed price for standard ads
          }
          return true; // Premium ads have custom pricing
        },
        message: 'Standard advertisements must be priced at 9999 ETB per week'
      }
    },
    
    // Weekly budget cap
    weeklyBudget: {
      type: Number,
      required: [true, 'Weekly budget is required'],
      min: [9999, 'Minimum weekly budget is 9999 ETB'],
      validate: {
        validator: function(value) {
          return value >= this.pricePerWeek;
        },
        message: 'Weekly budget must be at least equal to price per week'
      }
    },
    
    // Total budget for the campaign duration
    totalBudget: {
      type: Number,
      required: [true, 'Total budget is required'],
      min: [9999, 'Minimum total budget is 9999 ETB'],
      validate: {
        validator: function(value) {
          const weeks = Math.ceil(this.duration / 7);
          return value >= this.pricePerWeek * weeks;
        },
        message: 'Total budget must cover all weeks of the campaign'
      }
    },
    
    currency: {
      type: String,
      enum: ['ETB', 'USD', 'EUR', 'YACHI_POINTS'],
      default: 'ETB'
    },

    // 🎪 Advertisement Type & Category - UPDATED with premium option
    type: {
      type: String,
      enum: ['featured', 'banner', 'sponsored', 'push_notification', 'video', 'premium'],
      required: true,
      index: true,
      validate: {
        validator: function(value) {
          if (value === 'premium' && this.pricingModel !== 'premium') {
            return false;
          }
          return true;
        },
        message: 'Premium ad type requires premium pricing model'
      }
    },
    
    category: {
      type: String,
      enum: [
        'plumbing', 'electrical', 'cleaning', 'carpentry', 
        'painting', 'gardening', 'mechanic', 'tech_support',
        'all_services', 'premium_feature'
      ],
      required: true,
      index: true,
    },
    
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'premium'],
      default: 'medium',
      index: true,
    },

    // 👤 User & Provider Information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: function() {
        return this.advertiserType === 'provider';
      }
    },
    
    advertiserType: {
      type: String,
      enum: ['client', 'provider', 'yachi_platform', 'premium_partner'],
      required: true,
      default: 'provider'
    },

    // 🎨 Advertisement Content
    media: {
      images: [{
        url: String,
        caption: String,
        order: Number,
        dimensions: {
          width: Number,
          height: Number
        }
      }],
      video: {
        url: String,
        thumbnail: String,
        duration: {
          type: Number,
          max: [30, 'Video duration cannot exceed 30 seconds'], // 30 seconds max
          validate: {
            validator: function(value) {
              return value > 0;
            },
            message: 'Video duration must be positive'
          }
        }
      },
      logo: String
    },
    
    // 📊 Daily Impression Requirements - NEW FIELD
    impressionRequirements: {
      dailyMinimum: {
        type: Number,
        default: 10,
        min: [10, 'Minimum 10 impressions per day required'],
        validate: {
          validator: function(value) {
            return value >= 10;
          },
          message: 'Daily impressions must be at least 10'
        }
      },
      dailyMaximum: {
        type: Number,
        default: 100,
        min: [10, 'Maximum must be at least equal to minimum']
      },
      impressionDuration: {
        type: Number,
        default: 30, // 30 seconds max per impression
        max: [30, 'Maximum impression duration is 30 seconds']
      },
      currentDayImpressions: {
        type: Number,
        default: 0
      },
      lastResetDate: {
        type: Date,
        default: Date.now
      }
    },

    // 🏆 Premium Advertisement Settings - NEW SECTION
    premiumSettings: {
      requiresContact: {
        type: Boolean,
        default: function() {
          return this.pricingModel === 'premium';
        }
      },
      contactPerson: {
        name: String,
        email: String,
        phone: String
      },
      teamContact: {
        email: String,
        phone: String,
        department: String
      },
      // Islamic Compliance Check
      islamicCompliance: {
        reviewed: {
          type: Boolean,
          default: false
        },
        reviewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Admin'
        },
        reviewDate: Date,
        complianceScore: {
          type: Number,
          min: 0,
          max: 100,
          default: 0
        },
        complianceNotes: String,
        // Islamic guidelines checklist
        guidelines: {
          noInterestBased: { type: Boolean, default: false },
          noHaramProducts: { type: Boolean, default: false },
          truthfulContent: { type: Boolean, default: false },
          modestPresentation: { type: Boolean, default: false },
          ethicalMessaging: { type: Boolean, default: false }
        }
      },
      // Premium audience targeting
      showToPremiumUsers: {
        type: Boolean,
        default: function() {
          return this.pricingModel === 'premium';
        }
      },
      premiumUserPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
      }
    },

    callToAction: {
      text: {
        type: String,
        default: 'Book Now'
      },
      url: String,
      deepLink: String
    },

    // 📊 Performance & Analytics
    impressions: {
      type: Number,
      default: 0
    },
    dailyImpressions: [{
      date: {
        type: Date,
        default: Date.now
      },
      count: {
        type: Number,
        default: 0
      }
    }],
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    clickThroughRate: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },

    // ⏰ Scheduling & Duration
    startDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          return value > new Date();
        },
        message: 'Start date must be in the future'
      }
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          return value > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    duration: {
      type: Number, // in days
      min: [7, 'Minimum duration is 7 days (1 week)'],
      max: [90, 'Maximum duration is 90 days']
    },

    // 🎯 Targeting & Audience - UPDATED for premium users
    targeting: {
      location: {
        type: {
          type: String,
          enum: ['city', 'state', 'country', 'radius'],
          default: 'city'
        },
        coordinates: {
          latitude: Number,
          longitude: Number
        },
        radius: Number,
        areas: [String]
      },
      serviceCategories: [{
        type: String,
        enum: [
          'plumbing', 'electrical', 'cleaning', 'carpentry', 
          'painting', 'gardening', 'mechanic', 'tech_support'
        ]
      }],
      userTypes: [{
        type: String,
        enum: ['new_user', 'returning_user', 'premium_user', 'all_users']
      }],
      // Premium user targeting enhancement
      premiumTargeting: {
        minSubscriptionLevel: {
          type: String,
          enum: ['basic', 'silver', 'gold', 'platinum'],
          default: 'basic'
        },
        specificPremiumUsers: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }],
        excludeUsers: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }]
      },
      deviceTypes: [{
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'all']
      }],
      minUserRating: {
        type: Number,
        min: 1,
        max: 5
      }
    },

    // 🎪 Yachi Gamification Features
    gamification: {
      pointsCost: {
        type: Number,
        default: 0
      },
      achievementUnlocked: {
        type: Boolean,
        default: false
      },
      badgeEligible: {
        type: Boolean,
        default: false
      },
      leaderboardPoints: {
        type: Number,
        default: 0
      }
    },

    // 📈 Bidding & Auction System
    bidding: {
      strategy: {
        type: String,
        enum: ['cpc', 'cpm', 'fixed', 'auction', 'weekly_fixed'],
        default: 'weekly_fixed' // Changed default for 9999 ETB/week model
      },
      maxBid: Number,
      currentBid: Number,
      weeklyBid: {
        type: Number,
        default: 9999
      }
    },

    // 🏆 Status & Moderation - ENHANCED for premium compliance
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'pending_premium_review', 'active', 'paused', 'completed', 'rejected', 'cancelled'],
      default: 'draft',
      index: true,
      validate: {
        validator: function(value) {
          if (this.pricingModel === 'premium' && value === 'pending_approval') {
            return false; // Premium ads need special review
          }
          return true;
        },
        message: 'Premium ads must go through pending_premium_review status'
      }
    },
    
    moderation: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
      },
      reviewedAt: Date,
      rejectionReason: String,
      notes: String,
      // Islamic compliance review
      islamicReview: {
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'IslamicComplianceOfficer'
        },
        reviewedAt: Date,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'needs_revision'],
          default: 'pending'
        },
        revisionNotes: String,
        certificateId: String
      }
    },
    
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 🔍 SEO & Discovery
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    keywords: [String],
    searchVisibility: {
      type: String,
      enum: ['public', 'private', 'targeted', 'premium_only'],
      default: 'public'
    },

    // 📊 Analytics Metadata
    analytics: {
      dailyImpressions: [{
        date: Date,
        count: Number,
        target: {
          type: Number,
          default: 10
        },
        achieved: Boolean
      }],
      dailyClicks: [{
        date: Date,
        count: Number
      }],
      userDemographics: {
        ageGroups: Map,
        locations: Map,
        devices: Map,
        userTypes: Map
      },
      premiumPerformance: {
        premiumImpressions: {
          type: Number,
          default: 0
        },
        premiumClicks: {
          type: Number,
          default: 0
        },
        premiumConversionRate: {
          type: Number,
          default: 0
        }
      }
    }

  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        
        // Calculate derived fields
        ret.clickThroughRate = ret.impressions > 0 ? 
          (ret.clicks / ret.impressions * 100).toFixed(2) : 0;
        ret.conversionRate = ret.clicks > 0 ? 
          (ret.conversions / ret.clicks * 100).toFixed(2) : 0;
        
        // Calculate daily impressions achievement
        const today = new Date().toDateString();
        const todayImpressions = ret.dailyImpressions?.find(d => 
          new Date(d.date).toDateString() === today
        )?.count || 0;
        
        ret.dailyImpressionsAchieved = todayImpressions >= (ret.impressionRequirements?.dailyMinimum || 10);
        ret.dailyImpressionsRemaining = Math.max(0, (ret.impressionRequirements?.dailyMinimum || 10) - todayImpressions);
        
        // Calculate cost metrics
        ret.costPerImpression = ret.impressions > 0 ? 
          (ret.totalSpent / ret.impressions).toFixed(2) : 0;
        ret.costPerDay = (ret.pricePerWeek / 7).toFixed(2);
        
        // Add status indicators
        ret.isLive = ret.status === 'active' && 
          new Date() >= ret.startDate && 
          new Date() <= ret.endDate;
        ret.daysRemaining = ret.isLive ? 
          Math.ceil((ret.endDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;
        ret.weeksRemaining = Math.ceil(ret.daysRemaining / 7);
        
        // Premium compliance status
        if (ret.pricingModel === 'premium') {
          ret.islamicCompliant = ret.premiumSettings?.islamicCompliance?.reviewed && 
                                 ret.premiumSettings?.islamicCompliance?.complianceScore >= 100;
          ret.requiresContact = ret.premiumSettings?.requiresContact || false;
        }
        
        delete ret._id;
        return ret;
      },
    },
    toObject: { virtuals: true }
  }
);

// 🎯 Virtual Fields
advertisementSchema.virtual('totalSpent').get(function() {
  const weeksActive = Math.ceil((Math.min(new Date(), this.endDate) - this.startDate) / (7 * 24 * 60 * 60 * 1000));
  return weeksActive * this.pricePerWeek;
});

advertisementSchema.virtual('remainingBudget').get(function() {
  return this.totalBudget - this.totalSpent;
});

advertisementSchema.virtual('weeksActive').get(function() {
  const now = new Date();
  if (now < this.startDate) return 0;
  const activeDate = now > this.endDate ? this.endDate : now;
  return Math.ceil((activeDate - this.startDate) / (7 * 24 * 60 * 60 * 1000));
});

advertisementSchema.virtual('performanceScore').get(function() {
  const ctrWeight = 0.3;
  const conversionWeight = 0.3;
  const budgetWeight = 0.2;
  const impressionTargetWeight = 0.2;
  
  const ctrScore = Math.min(this.clickThroughRate / 10, 1);
  const conversionScore = Math.min(this.conversionRate / 5, 1);
  const budgetScore = this.remainingBudget > 0 ? 1 : 0;
  
  // Impression target achievement score
  let impressionScore = 0;
  if (this.dailyImpressions && this.dailyImpressions.length > 0) {
    const last7Days = this.dailyImpressions.slice(-7);
    const achievedDays = last7Days.filter(d => d.count >= this.impressionRequirements.dailyMinimum).length;
    impressionScore = achievedDays / 7;
  }
  
  return (ctrScore * ctrWeight + 
          conversionScore * conversionWeight + 
          budgetScore * budgetWeight + 
          impressionScore * impressionTargetWeight) * 100;
});

// 🎪 Indexes for Performance
advertisementSchema.index({ userId: 1, status: 1 });
advertisementSchema.index({ type: 1, category: 1, isActive: 1 });
advertisementSchema.index({ startDate: 1, endDate: 1 });
advertisementSchema.index({ 'targeting.location.coordinates': '2dsphere' });
advertisementSchema.index({ status: 1, isActive: 1, priority: -1 });
advertisementSchema.index({ pricingModel: 1, status: 1 });
advertisementSchema.index({ 'premiumSettings.islamicCompliance.reviewed': 1 });
advertisementSchema.index({ 'impressionRequirements.currentDayImpressions': 1 });

// 🚀 Middleware Hooks
advertisementSchema.pre('save', function(next) {
  // Auto-calculate duration in days
  if (this.startDate && this.endDate) {
    this.duration = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  
  // Reset daily impressions counter if it's a new day
  const now = new Date();
  const lastReset = new Date(this.impressionRequirements.lastResetDate);
  if (now.toDateString() !== lastReset.toDateString()) {
    this.impressionRequirements.currentDayImpressions = 0;
    this.impressionRequirements.lastResetDate = now;
  }
  
  // Set isActive based on status and dates
  if (this.status === 'active' && this.startDate && this.endDate) {
    this.isActive = now >= this.startDate && now <= this.endDate;
  }
  
  // For premium ads, set special status
  if (this.pricingModel === 'premium' && this.status === 'pending_approval') {
    this.status = 'pending_premium_review';
  }
  
  // Validate video duration
  if (this.media && this.media.video && this.media.video.duration) {
    if (this.media.video.duration > 30) {
      throw new Error('Video duration cannot exceed 30 seconds');
    }
  }
  
  next();
});

advertisementSchema.post('save', async function(doc) {
  // Update gamification points when ad goes live
  if (doc.status === 'active' && doc.isActive) {
    try {
      await YachiGamification.awardAdvertisementPoints(doc.userId, doc.totalBudget);
      await YachiAnalytics.trackAdvertisementCreation(doc);
      
      // Track premium ad specific analytics
      if (doc.pricingModel === 'premium') {
        await YachiAnalytics.trackPremiumAdCreation(doc);
      }
    } catch (error) {
      console.error('Gamification update failed:', error);
    }
  }
});

// 📊 Static Methods
advertisementSchema.statics.findActiveAds = function() {
  return this.find({
    status: 'active',
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  });
};

advertisementSchema.statics.findByCategory = function(category, options = {}) {
  const query = {
    category,
    status: 'active',
    isActive: true
  };
  
  // Handle premium user filtering
  if (options.isPremiumUser) {
    query.$or = [
      { 'targeting.userTypes': 'all_users' },
      { 'targeting.userTypes': 'premium_user' },
      { 'premiumSettings.showToPremiumUsers': true }
    ];
  }
  
  if (options.location) {
    query['targeting.location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [options.location.longitude, options.location.latitude]
        },
        $maxDistance: options.radius || 50000
      }
    };
  }
  
  return this.find(query)
    .sort({ priority: -1, 'bidding.weeklyBid': -1 })
    .limit(options.limit || 10);
};

// Find ads that haven't met daily impression targets
advertisementSchema.statics.findAdsBelowImpressionTarget = function() {
  const today = new Date().toDateString();
  return this.find({
    status: 'active',
    isActive: true,
    $expr: {
      $lt: [
        '$impressionRequirements.currentDayImpressions',
        '$impressionRequirements.dailyMinimum'
      ]
    }
  });
};

// Get premium ads with Islamic compliance
advertisementSchema.statics.findIslamicCompliantAds = function() {
  return this.find({
    pricingModel: 'premium',
    'premiumSettings.islamicCompliance.reviewed': true,
    'premiumSettings.islamicCompliance.complianceScore': 100,
    status: 'active',
    isActive: true
  });
};

advertisementSchema.statics.getPerformanceReport = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        totalAds: { $sum: 1 },
        totalSpent: { $sum: { $multiply: ['$weeksActive', '$pricePerWeek'] } },
        totalImpressions: { $sum: '$impressions' },
        totalClicks: { $sum: '$clicks' },
        totalConversions: { $sum: '$conversions' },
        averageCTR: { $avg: '$clickThroughRate' },
        averageDailyImpressions: { $avg: '$impressionRequirements.currentDayImpressions' }
      }
    }
  ]);
};

// 🎯 Instance Methods
advertisementSchema.methods.incrementImpressions = function(userIsPremium = false) {
  // Check if we can serve more impressions today
  if (this.impressionRequirements.currentDayImpressions >= this.impressionRequirements.dailyMaximum) {
    throw new Error('Daily impression limit reached');
  }
  
  this.impressions += 1;
  this.impressionRequirements.currentDayImpressions += 1;
  
  // Track premium impressions separately
  if (userIsPremium && this.pricingModel === 'premium') {
    this.analytics.premiumPerformance.premiumImpressions += 1;
  }
  
  // Record daily impression
  const today = new Date().toDateString();
  const todayRecord = this.dailyImpressions.find(d => 
    new Date(d.date).toDateString() === today
  );
  
  if (todayRecord) {
    todayRecord.count += 1;
    todayRecord.achieved = todayRecord.count >= this.impressionRequirements.dailyMinimum;
  } else {
    this.dailyImpressions.push({
      date: new Date(),
      count: 1,
      target: this.impressionRequirements.dailyMinimum,
      achieved: 1 >= this.impressionRequirements.dailyMinimum
    });
  }
  
  this.markModified('impressions');
  this.markModified('impressionRequirements');
  this.markModified('dailyImpressions');
  this.markModified('analytics.premiumPerformance');
  
  return this.save();
};

advertisementSchema.methods.incrementClicks = function(userIsPremium = false) {
  this.clicks += 1;
  this.clickThroughRate = this.impressions > 0 ? 
    (this.clicks / this.impressions * 100) : 0;
  
  // Track premium clicks separately
  if (userIsPremium && this.pricingModel === 'premium') {
    this.analytics.premiumPerformance.premiumClicks += 1;
    this.analytics.premiumPerformance.premiumConversionRate = 
      this.analytics.premiumPerformance.premiumClicks > 0 ? 
      (this.conversions / this.analytics.premiumPerformance.premiumClicks * 100) : 0;
  }
  
  this.markModified('clicks');
  this.markModified('clickThroughRate');
  this.markModified('analytics.premiumPerformance');
  return this.save();
};

advertisementSchema.methods.recordConversion = function() {
  this.conversions += 1;
  this.conversionRate = this.clicks > 0 ? 
    (this.conversions / this.clicks * 100) : 0;
  this.markModified('conversions');
  this.markModified('conversionRate');
  return this.save();
};

advertisementSchema.methods.pause = function() {
  this.status = 'paused';
  this.isActive = false;
  return this.save();
};

advertisementSchema.methods.resume = function() {
  const now = new Date();
  if (now >= this.startDate && now <= this.endDate) {
    this.status = 'active';
    this.isActive = true;
    return this.save();
  }
  throw new Error('Cannot resume ad outside of scheduled dates');
};

// New method for premium contact requirement
advertisementSchema.methods.requestPremiumContact = function(contactInfo) {
  if (this.pricingModel !== 'premium') {
    throw new Error('Only premium ads require contact');
  }
  
  this.premiumSettings.requiresContact = true;
  this.premiumSettings.contactPerson = contactInfo;
  this.status = 'pending_premium_review';
  
  return this.save();
};

// Islamic compliance review method
advertisementSchema.methods.submitForIslamicReview = function() {
  if (this.pricingModel !== 'premium') {
    throw new Error('Only premium ads require Islamic compliance review');
  }
  
  this.moderation.islamicReview.status = 'pending';
  return this.save();
};

// Method to check if ad can be shown to user
advertisementSchema.methods.canShowToUser = function(user) {
  // Check if ad is active
  if (!this.isActive || this.status !== 'active') {
    return false;
  }
  
  // Check daily impression limits
  if (this.impressionRequirements.currentDayImpressions >= this.impressionRequirements.dailyMaximum) {
    return false;
  }
  
  // Check user targeting
  const userTypes = this.targeting.userTypes || [];
  if (userTypes.length > 0) {
    if (user.isPremium && !userTypes.includes('premium_user') && !userTypes.includes('all_users')) {
      return false;
    }
    if (!user.isPremium && !userTypes.includes('all_users') && !userTypes.includes('new_user') && !userTypes.includes('returning_user')) {
      return false;
    }
  }
  
  // For premium ads, check Islamic compliance
  if (this.pricingModel === 'premium') {
    if (!this.premiumSettings.islamicCompliance.reviewed || 
        this.premiumSettings.islamicCompliance.complianceScore < 100) {
      return false;
    }
    
    // Check premium user targeting
    if (this.premiumSettings.showToPremiumUsers && !user.isPremium) {
      return false;
    }
  }
  
  return true;
};

module.exports = mongoose.model('Advertisement', advertisementSchema);