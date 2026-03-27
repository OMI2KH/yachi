module.exports = (sequelize, DataTypes) => {
  const PaymentGateway = sequelize.define('PaymentGateway', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.ENUM('chapa', 'telebirr', 'cbe_birr'),
      allowNull: false,
      unique: true
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('mobile_money', 'bank', 'card'),
      allowNull: false
    },
    // Configuration for different environments
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        sandbox: {
          apiKey: '',
          baseUrl: '',
          webhookSecret: '',
          merchantId: ''
        },
        production: {
          apiKey: '',
          baseUrl: '',
          webhookSecret: '',
          merchantId: ''
        }
      }
    },
    // Supported transaction types
    supportedTransactions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: ['payment', 'verification', 'refund'],
      allowNull: false
    },
    // Supported currencies (primarily ETB for Ethiopian gateways)
    supportedCurrencies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: ['ETB'],
      allowNull: false
    },
    // Minimum and maximum transaction amounts (in ETB cents)
    minAmount: {
      type: DataTypes.INTEGER, // in cents
      defaultValue: 100, // 1 ETB
      allowNull: false
    },
    maxAmount: {
      type: DataTypes.INTEGER, // in cents
      defaultValue: 5000000, // 50,000 ETB
      allowNull: false
    },
    // Fee structure
    feeStructure: {
      type: DataTypes.JSONB,
      defaultValue: {
        percentage: 1.5, // 1.5% fee
        fixed: 100, // 1 ETB fixed fee
        minFee: 200, // 2 ETB minimum fee
        maxFee: 5000 // 50 ETB maximum fee
      },
      allowNull: false
    },
    // Gateway status and availability
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    isLive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    maintenanceMode: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    // Response time metrics (in milliseconds)
    avgResponseTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    successRate: {
      type: DataTypes.FLOAT, // percentage
      defaultValue: 0
    },
    // Gateway-specific features
    features: {
      type: DataTypes.JSONB,
      defaultValue: {
        supportsRecurring: false,
        supportsPartialRefund: false,
        supportsInstantSettlement: false,
        requiresCustomerPhone: true,
        requiresCustomerEmail: false,
        webhookSupport: true,
        apiVersion: 'v1'
      }
    },
    // Business hours (Ethiopian time - EAT)
    businessHours: {
      type: DataTypes.JSONB,
      defaultValue: {
        timezone: 'Africa/Addis_Ababa',
        openingTime: '08:00',
        closingTime: '18:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      }
    },
    // Last sync/update information
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'payment_gateways',
    timestamps: true,
    paranoid: true, // Soft deletion
    indexes: [
      {
        fields: ['name'],
        unique: true
      },
      {
        fields: ['type']
      },
      {
        fields: ['isActive', 'isLive']
      },
      {
        fields: ['maintenanceMode']
      }
    ]
  });

  PaymentGateway.associate = function(models) {
    // A gateway can process many transactions
    PaymentGateway.hasMany(models.Transaction, {
      foreignKey: 'gatewayId',
      as: 'transactions'
    });
    
    // A gateway can have many webhook logs
    PaymentGateway.hasMany(models.WebhookLog, {
      foreignKey: 'gatewayId',
      as: 'webhookLogs'
    });
    
    // Many-to-many with Users through MerchantAccounts
    PaymentGateway.belongsToMany(models.User, {
      through: models.MerchantAccount,
      foreignKey: 'gatewayId',
      otherKey: 'userId',
      as: 'merchants'
    });
  };

  // Instance method to get appropriate config based on environment
  PaymentGateway.prototype.getConfig = function(environment = process.env.NODE_ENV || 'development') {
    const env = environment === 'production' ? 'production' : 'sandbox';
    return this.config[env];
  };

  // Instance method to check if gateway is operational
  PaymentGateway.prototype.isOperational = function() {
    if (!this.isActive || this.maintenanceMode) {
      return false;
    }
    
    // Check business hours (Ethiopian time)
    if (this.features?.checkBusinessHours !== false) {
      const now = new Date();
      const ethiopianTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }));
      const day = ethiopianTime.toLocaleDateString('en-US', { weekday: 'long' });
      const time = ethiopianTime.getHours() * 100 + ethiopianTime.getMinutes();
      
      const opening = parseInt(this.businessHours.openingTime.replace(':', ''));
      const closing = parseInt(this.businessHours.closingTime.replace(':', ''));
      
      if (!this.businessHours.workingDays.includes(day) || time < opening || time > closing) {
        return false;
      }
    }
    
    return true;
  };

  // Instance method to calculate fee for an amount (in cents)
  PaymentGateway.prototype.calculateFee = function(amountInCents) {
    const { percentage, fixed, minFee, maxFee } = this.feeStructure;
    const percentageFee = Math.round(amountInCents * (percentage / 100));
    const totalFee = percentageFee + fixed;
    
    // Apply min/max limits
    return Math.max(minFee, Math.min(maxFee, totalFee));
  };

  // Class method to get active gateways
  PaymentGateway.getActiveGateways = async function(type = null) {
    const where = {
      isActive: true,
      maintenanceMode: false
    };
    
    if (type) {
      where.type = type;
    }
    
    return await PaymentGateway.findAll({
      where,
      order: [['displayName', 'ASC']]
    });
  };

  // Class method to update gateway metrics
  PaymentGateway.updateMetrics = async function(gatewayId, responseTime, success) {
    const gateway = await PaymentGateway.findByPk(gatewayId);
    if (!gateway) return;
    
    // Update average response time (simple moving average)
    const newAvgResponseTime = Math.round(
      (gateway.avgResponseTime * 0.9) + (responseTime * 0.1)
    );
    
    // Update success rate
    const newSuccessRate = parseFloat(
      (gateway.successRate * 0.9 + (success ? 100 : 0) * 0.1).toFixed(2)
    );
    
    await gateway.update({
      avgResponseTime: newAvgResponseTime,
      successRate: newSuccessRate,
      lastSyncAt: new Date()
    });
  };

  // Hooks
  PaymentGateway.beforeCreate((gateway) => {
    // Ensure displayName is set if not provided
    if (!gateway.displayName) {
      const nameMap = {
        chapa: 'Chapa',
        telebirr: 'Telebirr',
        cbe_birr: 'CBE Birr'
      };
      gateway.displayName = nameMap[gateway.name] || gateway.name;
    }
  });

  return PaymentGateway;
};