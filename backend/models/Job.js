const { DataTypes } = require('sequelize');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiNotifications } = require('../services/yachiNotifications');
const { RealTimeService } = require('../services/realTimeService');

module.exports = (sequelize) => {
  const Job = sequelize.define('Job', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    // 🎯 Job Identification & Categorization
    jobNumber: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
      defaultValue: function() {
        return `YCH${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      }
    },
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

    // 👥 User Relationships
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'users', 
        key: 'id' 
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    },
    providerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { 
        model: 'users', 
        key: 'id' 
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { 
        model: 'services', 
        key: 'id' 
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },

    // 💰 Pricing & Payment
    budget: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0.01],
          msg: 'Budget must be greater than 0'
        },
        max: {
          args: [1000000],
          msg: 'Budget cannot exceed 1,000,000'
        }
      }
    },
    finalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: {
          args: [0.01],
          msg: 'Final price must be greater than 0'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'INR',
      validate: {
        isIn: {
          args: [['INR', 'USD', 'EUR']],
          msg: 'Invalid currency'
        }
      }
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded', 'failed'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.ENUM('card', 'upi', 'wallet', 'cash', 'bank_transfer'),
      allowNull: true
    },

    // 🎯 Service Details
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
    urgency: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'emergency'),
      defaultValue: 'medium'
    },
    complexity: {
      type: DataTypes.ENUM('simple', 'moderate', 'complex', 'expert'),
      defaultValue: 'moderate'
    },

    // 📍 Location & Service Area
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true
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
    serviceLocation: {
      type: DataTypes.ENUM('at_client', 'at_provider', 'remote', 'hybrid'),
      defaultValue: 'at_client'
    },
    serviceRadius: {
      type: DataTypes.INTEGER, // in kilometers
      defaultValue: 10
    },

    // ⏰ Scheduling & Timeline
    timeline: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    preferredDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    preferredTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    scheduledStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scheduledEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    estimatedDuration: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },
    actualDuration: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },

    // 🏆 Status & Workflow
    status: {
      type: DataTypes.ENUM(
        'draft',           // Job created but not published
        'open',            // Published and accepting bids
        'bidding',         // Providers are bidding
        'assigned',        // Provider assigned
        'confirmed',       // Both parties confirmed
        'scheduled',       // Date and time set
        'in_progress',     // Work started
        'completed',       // Work finished
        'cancelled',       // Job cancelled
        'disputed',        // Dispute raised
        'refunded',        // Payment refunded
        'archived'         // Job archived
      ),
      defaultValue: 'draft'
    },
    statusHistory: {
      type: DataTypes.JSONB,
      defaultValue: []
    },

    // 🎪 Yachi Gamification
    gamification: {
      type: DataTypes.JSONB,
      defaultValue: {
        clientPoints: 0,
        providerPoints: 0,
        achievementUnlocked: false,
        bonusMultiplier: 1.0,
        streakBonus: 0
      }
    },

    // 📊 Ratings & Reviews
    clientRating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    providerRating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    clientReview: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    providerReview: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewPhotos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    // 🔧 Job Specifications
    requirements: {
      type: DataTypes.JSONB,
      defaultValue: {
        materialsProvided: false,
        toolsRequired: [],
        specialInstructions: '',
        safetyRequirements: [],
        permitsRequired: false
      }
    },
    attachments: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    customFields: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },

    // 💬 Communication
    chatThreadId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // 📈 Analytics & Metrics
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    bidCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    providerResponseTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },
    completionTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },

    // 🛡️ Security & Moderation
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isFlagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    moderationNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    disputeReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }

  }, {
    tableName: 'jobs',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (job) => {
        // Generate job number if not provided
        if (!job.jobNumber) {
          job.jobNumber = `YCH${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        }
      },
      afterCreate: async (job) => {
        // Award points for job creation
        await YachiGamification.awardJobCreation(job.clientId);
        
        // Send real-time notification
        await RealTimeService.emitToUser(job.clientId, 'job_created', {
          jobId: job.id,
          title: job.title,
          status: job.status
        });
      },
      afterUpdate: async (job) => {
        // Track status changes
        if (job.changed('status')) {
          await job.recordStatusChange();
          
          // Notify both parties of status change
          await YachiNotifications.sendStatusUpdate(job);
        }
        
        // Award points for job completion
        if (job.status === 'completed' && job.previous('status') !== 'completed') {
          await YachiGamification.awardJobCompletion(job.clientId, job.providerId, job.finalPrice);
        }
      }
    },
    indexes: [
      {
        fields: ['client_id']
      },
      {
        fields: ['provider_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['category']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['scheduled_start']
      },
      {
        fields: ['location'],
        using: 'GIST'
      },
      {
        fields: ['job_number'],
        unique: true
      }
    ]
  });

  // 🎯 Instance Methods
  Job.prototype.recordStatusChange = async function() {
    const statusHistory = this.statusHistory || [];
    statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      changedBy: 'system' // Could be user ID in real implementation
    });
    
    this.statusHistory = statusHistory;
    await this.save();
  };

  Job.prototype.assignProvider = async function(providerId, bidAmount = null) {
    this.providerId = providerId;
    this.status = 'assigned';
    
    if (bidAmount) {
      this.finalPrice = bidAmount;
    }
    
    await this.save();
    
    // Notify provider
    await RealTimeService.emitToUser(providerId, 'job_assigned', {
      jobId: this.id,
      title: this.title,
      clientId: this.clientId
    });
  };

  Job.prototype.completeJob = async function(finalPrice = null) {
    this.status = 'completed';
    this.actualEnd = new Date();
    
    if (finalPrice) {
      this.finalPrice = finalPrice;
    }
    
    // Calculate actual duration
    if (this.actualStart) {
      this.actualDuration = Math.round((this.actualEnd - this.actualStart) / (1000 * 60));
    }
    
    await this.save();
  };

  Job.prototype.cancelJob = async function(reason, cancelledBy) {
    this.status = 'cancelled';
    this.cancellationReason = reason;
    await this.recordStatusChange();
    await this.save();
    
    // Refund logic would go here
    await YachiNotifications.sendCancellationNotification(this, cancelledBy);
  };

  Job.prototype.getTimeline = function() {
    const timeline = [];
    
    if (this.createdAt) {
      timeline.push({ event: 'created', timestamp: this.createdAt });
    }
    if (this.scheduledStart) {
      timeline.push({ event: 'scheduled', timestamp: this.scheduledStart });
    }
    if (this.actualStart) {
      timeline.push({ event: 'started', timestamp: this.actualStart });
    }
    if (this.actualEnd) {
      timeline.push({ event: 'completed', timestamp: this.actualEnd });
    }
    
    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  // 🎯 Static Methods
  Job.findByStatus = function(status, options = {}) {
    const whereClause = { status };
    
    if (options.userId) {
      whereClause[options.userType === 'client' ? 'clientId' : 'providerId'] = options.userId;
    }
    
    return this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 50
    });
  };

  Job.findNearby = function(latitude, longitude, radius = 10, category = null) {
    const whereClause = {
      status: ['open', 'bidding'],
      [sequelize.Op.and]: [
        sequelize.where(
          sequelize.fn(
            'ST_DWithin',
            sequelize.col('location'),
            sequelize.fn('ST_MakePoint', longitude, latitude),
            radius * 1000 // Convert km to meters
          ),
          true
        )
      ]
    };

    if (category) {
      whereClause.category = category;
    }

    return this.findAll({
      where: whereClause,
      order: [
        ['urgency', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
  };

  Job.getStats = function(userId, userType) {
    const whereClause = {};
    whereClause[userType === 'client' ? 'clientId' : 'providerId'] = userId;
    
    return this.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('final_price')), 'totalRevenue']
      ],
      group: ['status']
    });
  };

  return Job;
};