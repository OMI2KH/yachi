const { DataTypes } = require('sequelize');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { RealTimeService } = require('../services/realTimeService');
const { YachiNotifications } = require('../services/yachiNotifications');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },

    // 🎯 Transaction Identification
    transactionId: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      defaultValue: function() {
        return `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      }
    },
    externalId: {
      type: DataTypes.STRING(100), // Payment gateway transaction ID
      allowNull: true,
      unique: true
    },
    referenceNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },

    // 👥 Participant Information
    userId: { // Payer/Client
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'users', 
        key: 'id' 
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    },
    providerId: { // Payee/Service Provider
      type: DataTypes.UUID,
      allowNull: true,
      references: { 
        model: 'users', 
        key: 'id' 
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    },
    productId: { // For product purchases
      type: DataTypes.UUID,
      allowNull: true,
      references: { 
        model: 'products', 
        key: 'id' 
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    jobId: { // For service bookings
      type: DataTypes.UUID,
      allowNull: true,
      references: { 
        model: 'jobs', 
        key: 'id' 
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    serviceId: { // For service-related transactions
      type: DataTypes.UUID,
      allowNull: true,
      references: { 
        model: 'services', 
        key: 'id' 
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },

    // 💰 Financial Details
    amount: { 
      type: DataTypes.DECIMAL(12, 2), 
      allowNull: false,
      validate: {
        min: {
          args: [0.01],
          msg: 'Amount must be greater than 0'
        },
        max: {
          args: [10000000],
          msg: 'Amount cannot exceed 10,000,000'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ETB',
      allowNull: false,
      validate: {
        isIn: {
          args: [['ETB', 'USD', 'EUR', 'GBP']],
          msg: 'Invalid currency'
        }
      }
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(8, 4),
      defaultValue: 1.0
    },
    baseAmount: {
      type: DataTypes.DECIMAL(12, 2), // Amount in base currency
      allowNull: true
    },

    // 🏦 Payment Method Details
    paymentMethod: { 
      type: DataTypes.ENUM(
        'credit_card',
        'debit_card', 
        'upi',
        'net_banking',
        'wallet',
        'bank_transfer',
        'cash',
        'yachi_wallet',
        'installments',
        'crypto'
      ),
      allowNull: false,
      index: true
    },
    paymentGateway: {
      type: DataTypes.ENUM('chapa', 'telebirr', 'cbebirr', 'custom'),
      allowNull: true
    },
    paymentDetails: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    cardLast4: {
      type: DataTypes.STRING(4),
      allowNull: true
    },
    cardBrand: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    upiId: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    // 🏆 Transaction Status & Lifecycle
    status: { 
      type: DataTypes.ENUM(
        'initiated',      // Payment initiated
        'pending',        // Awaiting payment confirmation
        'processing',     // Payment being processed
        'completed',      // Successfully completed
        'failed',         // Payment failed
        'cancelled',      // Payment cancelled by user
        'refunded',       // Full refund processed
        'partially_refunded', // Partial refund
        'disputed',       // Payment disputed
        'chargeback',     // Chargeback initiated
        'on_hold',        // Payment on hold
        'expired'         // Payment expired
      ),
      allowNull: false,
      defaultValue: 'initiated',
      index: true
    },
    statusHistory: {
      type: DataTypes.JSONB,
      defaultValue: []
    },

    // 🔒 Escrow & Security Features
    isEscrow: { 
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    escrowStatus: {
      type: DataTypes.ENUM('held', 'released', 'refunded', 'disputed'),
      allowNull: true
    },
    escrowReleaseDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    escrowConditions: {
      type: DataTypes.JSONB,
      defaultValue: {
        jobCompletion: true,
        clientApproval: true,
        timeBased: false,
        automaticRelease: false
      }
    },
    securityLevel: {
      type: DataTypes.ENUM('standard', 'high', 'premium'),
      defaultValue: 'standard'
    },

    // 💸 Fees & Commission
    platformFee: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0
    },
    platformFeePercentage: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 5.0 // 5% platform fee
    },
    gatewayFee: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0
    },
    taxAmount: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0
    },
    taxPercentage: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0
    },
    netAmount: {
      type: DataTypes.DECIMAL(12, 2), // Amount after fees and taxes
      allowNull: true
    },
    providerPayout: {
      type: DataTypes.DECIMAL(12, 2), // Amount to be paid to provider
      allowNull: true
    },

    // 🎪 Yachi Gamification Features
    gamification: {
      type: DataTypes.JSONB,
      defaultValue: {
        pointsEarned: 0,
        cashbackAmount: 0,
        cashbackPercentage: 0,
        rewardTier: 'standard',
        bonusMultiplier: 1.0,
        achievementUnlocked: false
      }
    },
    yachiPointsEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    cashbackEarned: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0
    },

    // 📊 Transaction Metadata
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {
        ipAddress: null,
        userAgent: null,
        device: {
          type: null,
          os: null,
          browser: null
        },
        location: {
          country: null,
          city: null,
          timezone: null
        },
        riskScore: 0,
        fraudFlags: [],
        threeDSecure: false
      }
    },

    // ⏰ Timing & Scheduling
    initiatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // 🔄 Refund & Dispute Management
    refundAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    disputeReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    chargebackAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    resolution: {
      type: DataTypes.ENUM('resolved', 'escalated', 'closed'),
      allowNull: true
    },

    // 📈 Analytics & Reporting
    conversionValue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    lifetimeValue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    customerSegment: {
      type: DataTypes.ENUM('new', 'returning', 'vip', 'enterprise'),
      defaultValue: 'new'
    },
    transactionSize: {
      type: DataTypes.ENUM('small', 'medium', 'large', 'enterprise'),
      defaultValue: 'small'
    },

    // 🛡️ Compliance & Audit
    compliance: {
      type: DataTypes.JSONB,
      defaultValue: {
        kycVerified: false,
        amlChecked: false,
        taxDocumented: false,
        regulatoryCompliant: true
      }
    },
    auditTrail: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    isReconciled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reconciledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // 🔍 Additional Fields
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customFields: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }

  }, {
    tableName: 'transactions',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (transaction) => {
        // Generate transaction ID if not provided
        if (!transaction.transactionId) {
          transaction.transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        }
        
        // Calculate derived amounts
        await transaction.calculateDerivedAmounts();
        
        // Set initial status history
        transaction.statusHistory = [{
          status: transaction.status,
          timestamp: new Date(),
          note: 'Transaction initiated'
        }];
      },
      afterCreate: async (transaction) => {
        // Send real-time notification for new transaction
        await RealTimeService.emitToUser(transaction.userId, 'transaction_created', {
          transactionId: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status
        });
        
        // Track in analytics
        await YachiAnalytics.trackTransactionCreation(transaction);
      },
      afterUpdate: async (transaction) => {
        // Handle status changes
        if (transaction.changed('status')) {
          await transaction.recordStatusChange();
          
          // Award points for completed transactions
          if (transaction.status === 'completed' && transaction.previous('status') !== 'completed') {
            const points = await YachiGamification.awardTransactionCompletion(
              transaction.userId, 
              transaction.amount
            );
            transaction.yachiPointsEarned = points;
            await transaction.save();
            
            // Process escrow release if applicable
            if (transaction.isEscrow) {
              await transaction.processEscrowRelease();
            }
          }
          
          // Send status update notifications
          await YachiNotifications.sendTransactionStatusUpdate(transaction);
        }
        
        // Handle refunds
        if (transaction.changed('refundAmount') && transaction.refundAmount > 0) {
          await transaction.processRefund();
        }
      }
    },
    indexes: [
      { fields: ['user_id'] },
      { fields: ['provider_id'] },
      { fields: ['product_id'] },
      { fields: ['job_id'] },
      { fields: ['service_id'] },
      { fields: ['status'] },
      { fields: ['is_escrow'] },
      { fields: ['payment_method'] },
      { fields: ['created_at'] },
      { fields: ['completed_at'] },
      { 
        fields: ['transaction_id'],
        unique: true
      },
      {
        fields: ['external_id'],
        unique: true
      },
      {
        fields: ['user_id', 'status'],
        name: 'transactions_user_status_idx'
      },
      {
        fields: ['provider_id', 'created_at'],
        name: 'transactions_provider_created_idx'
      },
      {
        fields: ['amount', 'currency'],
        name: 'transactions_amount_currency_idx'
      },
      {
        fields: ['payment_gateway', 'status'],
        name: 'transactions_gateway_status_idx'
      }
    ]
  });

  // 🎯 Instance Methods
  Transaction.prototype.calculateDerivedAmounts = async function() {
    // Calculate platform fee
    this.platformFee = (this.amount * this.platformFeePercentage) / 100;
    
    // Calculate net amount (amount - platform fee - gateway fee)
    this.netAmount = this.amount - this.platformFee - this.gatewayFee;
    
    // Calculate provider payout (net amount - tax)
    this.providerPayout = this.netAmount - this.taxAmount;
    
    // Ensure provider payout is not negative
    if (this.providerPayout < 0) {
      this.providerPayout = 0;
    }
  };

  Transaction.prototype.recordStatusChange = async function() {
    const statusHistory = this.statusHistory || [];
    statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`
    });
    
    this.statusHistory = statusHistory;
    
    // Set timing fields based on status
    switch (this.status) {
      case 'completed':
        this.completedAt = new Date();
        break;
      case 'failed':
        this.failedAt = new Date();
        break;
      case 'refunded':
      case 'partially_refunded':
        this.refundedAt = new Date();
        break;
    }
  };

  Transaction.prototype.processEscrowRelease = async function() {
    if (this.isEscrow && this.status === 'completed') {
      this.escrowStatus = 'released';
      this.escrowReleaseDate = new Date();
      await this.save();
      
      // Notify provider about escrow release
      if (this.providerId) {
        await RealTimeService.emitToUser(this.providerId, 'escrow_released', {
          transactionId: this.id,
          amount: this.providerPayout,
          currency: this.currency
        });
      }
    }
  };

  Transaction.prototype.processRefund = async function() {
    // Update refund timestamp
    this.refundedAt = new Date();
    
    // Deduct points if points were awarded
    if (this.yachiPointsEarned > 0) {
      await YachiGamification.deductPointsForRefund(
        this.userId, 
        this.yachiPointsEarned
      );
      this.yachiPointsEarned = 0;
    }
    
    // Update cashback if applicable
    if (this.cashbackEarned > 0) {
      this.cashbackEarned = 0;
      this.gamification.cashbackAmount = 0;
    }
    
    await this.save();
    
    // Send refund notification
    await YachiNotifications.sendRefundNotification(this);
  };

  Transaction.prototype.initiateChargeback = async function(reason, amount = null) {
    this.status = 'chargeback';
    this.chargebackAmount = amount || this.amount;
    this.disputeReason = reason;
    await this.recordStatusChange();
    await this.save();
    
    // Log chargeback for analytics
    await YachiAnalytics.trackChargeback(this, reason);
  };

  Transaction.prototype.calculateRiskScore = async function() {
    let riskScore = 0;
    
    // High amount risk
    if (this.amount > 10000) riskScore += 20;
    if (this.amount > 50000) riskScore += 30;
    
    // New customer risk
    if (this.customerSegment === 'new') riskScore += 15;
    
    // International transaction risk
    if (this.metadata.location && this.metadata.location.country !== 'IN') {
      riskScore += 25;
    }
    
    // Unusual payment method risk
    if (this.paymentMethod === 'crypto') riskScore += 30;
    
    this.metadata.riskScore = Math.min(riskScore, 100);
    await this.save();
    
    return this.metadata.riskScore;
  };

  Transaction.prototype.getTransactionSummary = function() {
    return {
      transactionId: this.transactionId,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      paymentMethod: this.paymentMethod,
      createdAt: this.createdAt,
      netAmount: this.netAmount,
      platformFee: this.platformFee,
      providerPayout: this.providerPayout,
      isEscrow: this.isEscrow,
      escrowStatus: this.escrowStatus
    };
  };

  // 🎯 Static Methods
  Transaction.findByUser = function(userId, options = {}) {
    const whereClause = { userId };
    
    if (options.status) {
      whereClause.status = options.status;
    }
    
    if (options.dateRange) {
      whereClause.createdAt = {
        [sequelize.Op.between]: [options.dateRange.start, options.dateRange.end]
      };
    }
    
    return this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 50
    });
  };

  Transaction.findByProvider = function(providerId, options = {}) {
    const whereClause = { providerId };
    
    if (options.status) {
      whereClause.status = options.status;
    }
    
    return this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 50
    });
  };

  Transaction.getRevenueMetrics = function(userId, period = 'month') {
    const date = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(date.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(date.setDate(date.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(date.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    
    return this.findAll({
      where: {
        userId,
        status: 'completed',
        createdAt: {
          [sequelize.Op.gte]: startDate
        }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageTransaction'],
        [sequelize.fn('MAX', sequelize.col('amount')), 'largestTransaction']
      ]
    });
  };

  Transaction.getEscrowTransactions = function(status = 'held') {
    return this.findAll({
      where: {
        isEscrow: true,
        escrowStatus: status
      },
      order: [['createdAt', 'ASC']],
      include: ['User', 'Provider']
    });
  };

  Transaction.findPendingPayouts = function(providerId) {
    return this.findAll({
      where: {
        providerId,
        status: 'completed',
        isEscrow: false // Already released from escrow or non-escrow
      },
      attributes: ['id', 'amount', 'providerPayout', 'currency', 'completedAt']
    });
  };

  // 🎯 Association Method
  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, { 
      foreignKey: 'userId', 
      as: 'User' 
    });
    Transaction.belongsTo(models.User, { 
      foreignKey: 'providerId', 
      as: 'Provider' 
    });
    Transaction.belongsTo(models.Product, { 
      foreignKey: 'productId', 
      as: 'Product' 
    });
    Transaction.belongsTo(models.Job, { 
      foreignKey: 'jobId', 
      as: 'Job' 
    });
    Transaction.belongsTo(models.Service, { 
      foreignKey: 'serviceId', 
      as: 'Service' 
    });
    Transaction.hasMany(models.Refund, { 
      foreignKey: 'transactionId', 
      as: 'Refunds' 
    });
  };

  return Transaction;
};
