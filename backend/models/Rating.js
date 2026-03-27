const { DataTypes } = require('sequelize');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { RealTimeService } = require('../services/realTimeService');
const { YachiNotifications } = require('../services/yachiNotifications');

module.exports = (sequelize) => {
  const Rating = sequelize.define('Rating', {
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },

    // 👥 Review Participants
    userId: { // The service provider being reviewed
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'users', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    reviewerId: { // The client who gave the review
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'users', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    jobId: { // Link to the completed job
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'jobs', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    serviceId: { // Link to the specific service
      type: DataTypes.UUID,
      allowNull: true,
      references: { 
        model: 'services', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },

    // ⭐ Rating Components
    rating: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      validate: { 
        min: 1, 
        max: 5,
        isInt: {
          msg: 'Rating must be a whole number between 1 and 5'
        }
      },
      index: true
    },
    categoryRatings: {
      type: DataTypes.JSONB,
      defaultValue: {
        quality: 0,
        professionalism: 0,
        communication: 0,
        punctuality: 0,
        value: 0,
        cleanliness: 0
      },
      validate: {
        validCategoryRatings: function(value) {
          if (value) {
            const categories = Object.keys(value);
            const validCategories = ['quality', 'professionalism', 'communication', 'punctuality', 'value', 'cleanliness'];
            const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
            if (invalidCategories.length > 0) {
              throw new Error(`Invalid rating categories: ${invalidCategories.join(', ')}`);
            }
            
            // Validate each category rating
            for (const [category, score] of Object.entries(value)) {
              if (score < 1 || score > 5) {
                throw new Error(`${category} rating must be between 1 and 5`);
              }
            }
          }
        }
      }
    },
    overallScore: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },

    // 💬 Review Content
    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        len: {
          args: [0, 200],
          msg: 'Review title cannot exceed 200 characters'
        }
      }
    },
    comment: { 
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 2000],
          msg: 'Review comment cannot exceed 2000 characters'
        }
      }
    },
    pros: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    cons: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // 🖼️ Visual Evidence
    photos: { 
      type: DataTypes.JSONB,
      defaultValue: [],
      validate: {
        validPhotos: function(value) {
          if (value && Array.isArray(value)) {
            if (value.length > 10) {
              throw new Error('Cannot upload more than 10 photos');
            }
            
            value.forEach(photo => {
              if (!photo.url) {
                throw new Error('Each photo must have a URL');
              }
              if (photo.caption && photo.caption.length > 200) {
                throw new Error('Photo captions cannot exceed 200 characters');
              }
            });
          }
        }
      }
    },
    videos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      validate: {
        maxVideos: function(value) {
          if (value && value.length > 3) {
            throw new Error('Cannot upload more than 3 videos');
          }
        }
      }
    },
    beforeAfter: {
      type: DataTypes.JSONB,
      defaultValue: {
        before: [],
        after: []
      }
    },

    // 🎪 Yachi Gamification Features
    gamification: {
      type: DataTypes.JSONB,
      defaultValue: {
        reviewerPoints: 0,
        providerPoints: 0,
        achievementUnlocked: false,
        helpfulVotes: 0,
        featuredReview: false,
        qualityScore: 0
      }
    },
    yachiPointsAwarded: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // 🔍 Review Metadata
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {
        language: 'en',
        device: {
          platform: null,
          version: null,
          userAgent: null
        },
        editHistory: [],
        flags: {
          reported: false,
          inappropriate: false,
          spam: false
        },
        reactions: {
          helpful: 0,
          funny: 0,
          love: 0,
          angry: 0
        },
        shares: 0,
        impressions: 0
      }
    },

    // 🏆 Verification & Trust
    verifiedReview: { 
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    verificationLevel: {
      type: DataTypes.ENUM('unverified', 'job_verified', 'photo_verified', 'premium_verified'),
      defaultValue: 'unverified'
    },
    trustScore: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1
      }
    },
    authenticityScore: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1
      }
    },

    // ⚙️ Review Settings
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      index: true
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    allowComments: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    allowReactions: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    // 📊 Review Analytics
    helpfulCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    notHelpfulCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reportCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    shareCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    commentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // 🛡️ Moderation & Compliance
    moderationStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'flagged', 'under_review'),
      defaultValue: 'pending',
      index: true
    },
    moderatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { 
        model: 'users', 
        key: 'id' 
      }
    },
    moderatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    moderationNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // 🔄 Response System
    providerResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 2000],
          msg: 'Provider response cannot exceed 2000 characters'
        }
      }
    },
    responseCreatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    responseUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    responseHelpfulCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // 📈 Performance Metrics
    impactScore: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0
    },
    engagementRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    conversionImpact: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    }

  }, {
    tableName: 'ratings',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (rating) => {
        // Calculate overall score from category ratings
        await rating.calculateOverallScore();
        
        // Calculate initial trust score
        await rating.calculateTrustScore();
        
        // Set verification level based on available data
        await rating.setVerificationLevel();
      },
      afterCreate: async (rating) => {
        // Award points for leaving a review
        const points = await YachiGamification.awardReviewCreation(rating.reviewerId, rating.rating);
        rating.yachiPointsAwarded = points;
        await rating.save();
        
        // Update provider's average rating
        await rating.updateProviderRating();
        
        // Update service rating if applicable
        if (rating.serviceId) {
          await rating.updateServiceRating();
        }
        
        // Send real-time notification to provider
        await RealTimeService.emitToUser(rating.userId, 'new_review', {
          ratingId: rating.id,
          reviewerId: rating.reviewerId,
          rating: rating.rating,
          title: rating.title,
          hasComment: !!rating.comment,
          hasPhotos: rating.photos && rating.photos.length > 0
        });
        
        // Send push notification
        await YachiNotifications.sendReviewNotification(rating);
        
        // Track in analytics
        await YachiAnalytics.trackReviewCreation(rating);
      },
      afterUpdate: async (rating) => {
        // Handle moderation status changes
        if (rating.changed('moderationStatus') && rating.moderationStatus === 'approved') {
          rating.verifiedReview = true;
          await rating.save();
          
          // Award bonus points for verified review
          await YachiGamification.awardVerifiedReview(rating.reviewerId);
        }
        
        // Recalculate scores when relevant fields change
        if (rating.changed('categoryRatings') || rating.changed('rating')) {
          await rating.calculateOverallScore();
        }
        
        // Update provider rating when review changes
        if (rating.changed('rating') || rating.changed('moderationStatus')) {
          await rating.updateProviderRating();
        }
      }
    },
    indexes: [
      { fields: ['user_id'] },
      { fields: ['reviewer_id'] },
      { fields: ['job_id'] },
      { fields: ['service_id'] },
      { fields: ['rating'] },
      { fields: ['verified_review'] },
      { fields: ['moderation_status'] },
      { fields: ['is_public'] },
      { fields: ['created_at'] },
      { 
        fields: ['user_id', 'created_at'],
        name: 'ratings_user_created_idx'
      },
      {
        fields: ['service_id', 'rating'],
        name: 'ratings_service_rating_idx'
      },
      {
        fields: ['verified_review', 'moderation_status'],
        name: 'ratings_verified_moderation_idx'
      }
    ]
  });

  // 🎯 Instance Methods
  Rating.prototype.calculateOverallScore = async function() {
    if (this.categoryRatings && Object.keys(this.categoryRatings).length > 0) {
      const scores = Object.values(this.categoryRatings);
      const sum = scores.reduce((total, score) => total + score, 0);
      this.overallScore = parseFloat((sum / scores.length).toFixed(2));
    } else {
      this.overallScore = this.rating;
    }
  };

  Rating.prototype.calculateTrustScore = async function() {
    let score = 0;
    let factors = 0;
    
    // Job verification
    if (this.jobId) {
      score += 0.3;
      factors++;
    }
    
    // Photo evidence
    if (this.photos && this.photos.length > 0) {
      score += 0.2;
      factors++;
    }
    
    // Detailed comment
    if (this.comment && this.comment.length > 50) {
      score += 0.2;
      factors++;
    }
    
    // Category ratings
    if (this.categoryRatings && Object.keys(this.categoryRatings).length >= 3) {
      score += 0.3;
      factors++;
    }
    
    this.trustScore = factors > 0 ? parseFloat((score / factors).toFixed(2)) : 0;
  };

  Rating.prototype.setVerificationLevel = async function() {
    if (this.jobId) {
      this.verificationLevel = 'job_verified';
    }
    if (this.photos && this.photos.length > 0) {
      this.verificationLevel = 'photo_verified';
    }
    // Premium verification would require additional checks
  };

  Rating.prototype.updateProviderRating = async function() {
    const User = sequelize.models.User;
    const provider = await User.findByPk(this.userId);
    
    if (provider && this.moderationStatus === 'approved') {
      // Get all approved ratings for this provider
      const approvedRatings = await Rating.findAll({
        where: {
          userId: this.userId,
          moderationStatus: 'approved'
        },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('overall_score')), 'avgRating'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
        ]
      });
      
      if (approvedRatings[0]) {
        const { avgRating, totalReviews } = approvedRatings[0].dataValues;
        
        await User.update(
          {
            averageRating: parseFloat(avgRating) || 0,
            totalReviews: parseInt(totalReviews) || 0
          },
          {
            where: { id: this.userId }
          }
        );
      }
    }
  };

  Rating.prototype.updateServiceRating = async function() {
    const Service = sequelize.models.Service;
    
    if (this.serviceId && this.moderationStatus === 'approved') {
      const serviceRatings = await Rating.findAll({
        where: {
          serviceId: this.serviceId,
          moderationStatus: 'approved'
        },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('overall_score')), 'avgRating'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
        ]
      });
      
      if (serviceRatings[0]) {
        const { avgRating, totalReviews } = serviceRatings[0].dataValues;
        
        await Service.update(
          {
            averageRating: parseFloat(avgRating) || 0,
            totalReviews: parseInt(totalReviews) || 0
          },
          {
            where: { id: this.serviceId }
          }
        );
      }
    }
  };

  Rating.prototype.markHelpful = async function(userId) {
    this.helpfulCount += 1;
    this.metadata.reactions.helpful += 1;
    await this.save();
    
    // Award points for helpful review
    if (this.helpfulCount % 5 === 0) { // Every 5 helpful votes
      await YachiGamification.awardHelpfulReview(this.reviewerId);
    }
  };

  Rating.prototype.markNotHelpful = async function(userId) {
    this.notHelpfulCount += 1;
    await this.save();
  };

  Rating.prototype.addProviderResponse = async function(response, providerId) {
    if (this.userId !== providerId) {
      throw new Error('Only the reviewed provider can respond to this review');
    }
    
    this.providerResponse = response;
    this.responseCreatedAt = new Date();
    this.responseUpdatedAt = new Date();
    await this.save();
    
    // Notify reviewer about the response
    await RealTimeService.emitToUser(this.reviewerId, 'review_response', {
      ratingId: this.id,
      providerId: this.userId,
      response: response
    });
  };

  Rating.prototype.report = async function(userId, reason) {
    this.reportCount += 1;
    
    if (this.reportCount >= 3) {
      this.moderationStatus = 'flagged';
    }
    
    await this.save();
    
    // Log report for moderation
    await YachiAnalytics.trackReviewReport(this.id, userId, reason);
  };

  Rating.prototype.getReviewMetrics = function() {
    return {
      totalVotes: this.helpfulCount + this.notHelpfulCount,
      helpfulPercentage: this.helpfulCount > 0 ? 
        Math.round((this.helpfulCount / (this.helpfulCount + this.notHelpfulCount)) * 100) : 0,
      engagementScore: this.viewCount > 0 ? 
        Math.round(((this.helpfulCount + this.commentCount) / this.viewCount) * 100) : 0,
      impactScore: this.impactScore
    };
  };

  // 🎯 Static Methods
  Rating.findByProvider = function(providerId, options = {}) {
    const whereClause = {
      userId: providerId,
      isPublic: true,
      moderationStatus: 'approved'
    };
    
    if (options.verifiedOnly) {
      whereClause.verifiedReview = true;
    }
    
    return this.findAll({
      where: whereClause,
      order: [
        ['helpfulCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: options.limit || 20,
      include: options.include || []
    });
  };

  Rating.findHelpfulReviews = function(providerId, limit = 5) {
    return this.findAll({
      where: {
        userId: providerId,
        isPublic: true,
        moderationStatus: 'approved',
        helpfulCount: {
          [sequelize.Op.gt]: 0
        }
      },
      order: [['helpfulCount', 'DESC']],
      limit: limit
    });
  };

  Rating.getRatingDistribution = function(providerId) {
    return this.findAll({
      where: {
        userId: providerId,
        moderationStatus: 'approved'
      },
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['rating'],
      order: [['rating', 'DESC']]
    });
  };

  Rating.calculateAverageCategoryRatings = function(providerId) {
    return this.findAll({
      where: {
        userId: providerId,
        moderationStatus: 'approved',
        categoryRatings: {
          [sequelize.Op.ne]: null
        }
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.literal("category_ratings->>'quality'")), 'avgQuality'],
        [sequelize.fn('AVG', sequelize.literal("category_ratings->>'professionalism'")), 'avgProfessionalism'],
        [sequelize.fn('AVG', sequelize.literal("category_ratings->>'communication'")), 'avgCommunication'],
        [sequelize.fn('AVG', sequelize.literal("category_ratings->>'punctuality'")), 'avgPunctuality'],
        [sequelize.fn('AVG', sequelize.literal("category_ratings->>'value'")), 'avgValue'],
        [sequelize.fn('AVG', sequelize.literal("category_ratings->>'cleanliness'")), 'avgCleanliness']
      ]
    });
  };

  // 🎯 Association Method
  Rating.associate = (models) => {
    Rating.belongsTo(models.User, { 
      foreignKey: 'userId', 
      as: 'Provider' 
    });
    Rating.belongsTo(models.User, { 
      foreignKey: 'reviewerId', 
      as: 'Reviewer' 
    });
    Rating.belongsTo(models.Job, { 
      foreignKey: 'jobId', 
      as: 'Job' 
    });
    Rating.belongsTo(models.Service, { 
      foreignKey: 'serviceId', 
      as: 'Service' 
    });
    Rating.belongsTo(models.User, { 
      foreignKey: 'moderatedBy', 
      as: 'Moderator' 
    });
    Rating.hasMany(models.ReviewComment, { 
      foreignKey: 'ratingId', 
      as: 'Comments' 
    });
  };

  return Rating;
};