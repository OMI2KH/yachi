module.exports = (sequelize, DataTypes) => {
  const PaymentMethod = sequelize.define('PaymentMethod', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    methodType: {
      type: DataTypes.ENUM('card', 'mobile_money', 'bank_account', 'wallet'),
      allowNull: false
    },
    provider: {
      type: DataTypes.ENUM('chapa', 'telebirr', 'cbe_birr', 'ethio_mobile', 'awash_bank', 'dashen_bank', 'hello_cash'),
      allowNull: false
    },
    // Gateway-specific identifier (token, reference, etc.)
    gatewayToken: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Encrypted payment token from gateway'
    },
    // Local reference for our system
    referenceId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // For card payments
    lastFour: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cardBrand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    expiryMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 12
      }
    },
    expiryYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: new Date().getFullYear()
      }
    },
    // For mobile money/bank
    accountName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEthiopianPhone(value) {
          if (value && !/^(?:\+251|0)(9\d{8})$/.test(value)) {
            throw new Error('Invalid Ethiopian phone number format');
          }
        }
      }
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    currency: {
      type: DataTypes.ENUM('ETB', 'USD'),
      defaultValue: 'ETB',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired', 'suspended'),
      defaultValue: 'active'
    },
    // Gateway-specific metadata
    gatewayMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Gateway-specific response data'
    },
    verificationData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Verification/authorization data from gateway'
    },
    // Security fields
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Audit fields
    addedFrom: {
      type: DataTypes.ENUM('mobile_app', 'web_app', 'admin_panel'),
      defaultValue: 'mobile_app'
    },
    deviceInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Device info when payment method was added'
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'payment_methods',
    timestamps: true,
    paranoid: true, // Soft deletion
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['referenceId'],
        unique: true
      },
      {
        fields: ['gatewayToken']
      },
      {
        fields: ['provider']
      },
      {
        fields: ['methodType']
      },
      {
        fields: ['userId', 'isDefault'],
        where: {
          isDefault: true,
          status: 'active'
        }
      },
      {
        fields: ['phoneNumber'],
        where: {
          phoneNumber: {
            [sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['status']
      }
    ],
    hooks: {
      beforeValidate: (paymentMethod) => {
        // Generate reference ID if not provided
        if (!paymentMethod.referenceId) {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);
          paymentMethod.referenceId = `PM_${timestamp}_${random}`;
        }
        
        // Validate methodType and provider compatibility
        if (paymentMethod.methodType && paymentMethod.provider) {
          validateMethodProviderCompatibility(paymentMethod);
        }
      },
      beforeSave: async (paymentMethod) => {
        // Ensure only one default payment method per user
        if (paymentMethod.isDefault && paymentMethod.userId) {
          await PaymentMethod.update(
            { isDefault: false },
            {
              where: {
                userId: paymentMethod.userId,
                id: { [sequelize.Op.ne]: paymentMethod.id },
                isDefault: true
              }
            }
          );
        }
        
        // Encrypt sensitive data before saving
        if (paymentMethod.gatewayToken && !paymentMethod.gatewayToken.startsWith('enc_')) {
          paymentMethod.gatewayToken = encryptData(paymentMethod.gatewayToken);
        }
      }
    }
  });

  // Validation function for methodType and provider compatibility
  function validateMethodProviderCompatibility(paymentMethod) {
    const providerConfig = {
      chapa: ['card', 'mobile_money', 'bank_account'],
      telebirr: ['mobile_money', 'wallet'],
      cbe_birr: ['mobile_money', 'bank_account'],
      ethio_mobile: ['mobile_money'],
      awash_bank: ['bank_account', 'card'],
      dashen_bank: ['bank_account', 'card'],
      hello_cash: ['mobile_money', 'wallet']
    };

    const validMethods = providerConfig[paymentMethod.provider];
    if (!validMethods || !validMethods.includes(paymentMethod.methodType)) {
      throw new Error(
        `Provider ${paymentMethod.provider} does not support method type ${paymentMethod.methodType}`
      );
    }
  }

  // Encryption helper (implement based on your security setup)
  function encryptData(data) {
    // Implement your encryption logic here
    // Example: return `enc_${Buffer.from(data).toString('base64')}`;
    return data; // Replace with actual encryption
  }

  // Decryption helper
  function decryptData(encryptedData) {
    if (!encryptedData.startsWith('enc_')) return encryptedData;
    // Implement your decryption logic here
    return encryptedData; // Replace with actual decryption
  }

  // Associations
  PaymentMethod.associate = function(models) {
    PaymentMethod.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
    
    PaymentMethod.hasMany(models.Transaction, {
      foreignKey: 'paymentMethodId',
      as: 'transactions'
    });
    
    PaymentMethod.hasMany(models.Payment, {
      foreignKey: 'paymentMethodId',
      as: 'payments'
    });
  };

  // ======================
  // INSTANCE METHODS
  // ======================

  /**
   * Get masked display information for UI
   */
  PaymentMethod.prototype.getMaskedInfo = function() {
    switch (this.methodType) {
      case 'card':
        return this.lastFour 
          ? `**** **** **** ${this.lastFour} ${this.cardBrand || ''}`.trim()
          : 'Card Payment';
      
      case 'mobile_money':
        if (this.phoneNumber) {
          return `${this.provider}: ${this.phoneNumber.substring(0, 4)}****${this.phoneNumber.substring(8)}`;
        }
        return `${this.provider} Mobile Money`;
      
      case 'bank_account':
        if (this.accountNumber) {
          return `${this.bankName || this.provider}: ****${this.accountNumber.slice(-4)}`;
        }
        return `${this.bankName || this.provider} Account`;
      
      case 'wallet':
        return `${this.provider} Wallet`;
      
      default:
        return this.provider;
    }
  };

  /**
   * Get provider-specific configuration for mobile gateways
   */
  PaymentMethod.prototype.getGatewayConfig = function() {
    const gatewayConfigs = {
      chapa: {
        apiKey: process.env.CHAPA_API_KEY,
        baseUrl: process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1',
        webhookSecret: process.env.CHAPA_WEBHOOK_SECRET
      },
      telebirr: {
        appId: process.env.TELEBIRR_APP_ID,
        appKey: process.env.TELEBIRR_APP_KEY,
        baseUrl: process.env.TELEBIRR_BASE_URL || 'https://api.telebirr.com',
        publicKey: process.env.TELEBIRR_PUBLIC_KEY
      },
      cbe_birr: {
        merchantId: process.env.CBE_BIRR_MERCHANT_ID,
        apiKey: process.env.CBE_BIRR_API_KEY,
        baseUrl: process.env.CBE_BIRR_BASE_URL || 'https://api.cbebirr.com'
      }
    };

    return {
      ...gatewayConfigs[this.provider],
      currency: this.currency,
      referenceId: this.referenceId
    };
  };

  /**
   * Check if payment method is expired
   */
  PaymentMethod.prototype.isExpired = function() {
    if (this.methodType !== 'card') return false;
    
    if (!this.expiryMonth || !this.expiryYear) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    return (
      this.expiryYear < currentYear ||
      (this.expiryYear === currentYear && this.expiryMonth < currentMonth)
    );
  };

  /**
   * Verify payment method with gateway
   */
  PaymentMethod.prototype.verifyWithGateway = async function() {
    try {
      // This would integrate with your mobile payment-gateways service
      // For example, make a small authorization charge
      
      const verificationResult = {
        verified: true,
        verifiedAt: new Date(),
        gatewayResponse: {} // Gateway-specific verification response
      };

      this.isVerified = true;
      this.verifiedAt = verificationResult.verifiedAt;
      this.verificationData = verificationResult;
      
      await this.save();
      return verificationResult;
    } catch (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }
  };

  // ======================
  // CLASS METHODS
  // ======================

  /**
   * Set default payment method for user
   */
  PaymentMethod.setDefaultMethod = async function(userId, paymentMethodId) {
    const transaction = await sequelize.transaction();
    
    try {
      // Reset all default methods for this user
      await PaymentMethod.update(
        { isDefault: false },
        {
          where: { 
            userId, 
            isDefault: true,
            status: 'active'
          },
          transaction
        }
      );
      
      // Set the new default method
      const [updatedCount] = await PaymentMethod.update(
        { isDefault: true },
        {
          where: { 
            id: paymentMethodId, 
            userId,
            status: 'active'
          },
          transaction
        }
      );
      
      await transaction.commit();
      
      if (updatedCount === 0) {
        throw new Error('Payment method not found or not active');
      }
      
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  /**
   * Get active payment methods for user with optional filtering
   */
  PaymentMethod.getUserMethods = async function(userId, options = {}) {
    const whereClause = {
      userId,
      status: 'active'
    };

    // Filter by method type if specified
    if (options.methodType) {
      whereClause.methodType = options.methodType;
    }

    // Filter by provider if specified
    if (options.provider) {
      whereClause.provider = options.provider;
    }

    const methods = await PaymentMethod.findAll({
      where: whereClause,
      order: [
        ['isDefault', 'DESC'],
        ['createdAt', 'DESC']
      ],
      include: options.include || []
    });

    return methods;
  };

  /**
   * Create payment method from gateway response
   */
  PaymentMethod.createFromGateway = async function(userId, gatewayResponse, options = {}) {
    const {
      provider,
      methodType,
      gatewayToken,
      accountDetails,
      metadata = {}
    } = gatewayResponse;

    const paymentMethodData = {
      userId,
      provider,
      methodType,
      gatewayToken,
      gatewayMetadata: metadata,
      addedFrom: options.addedFrom || 'mobile_app',
      deviceInfo: options.deviceInfo,
      ipAddress: options.ipAddress,
      currency: options.currency || 'ETB'
    };

    // Set method-specific fields
    switch (methodType) {
      case 'card':
        paymentMethodData.lastFour = accountDetails.lastFour;
        paymentMethodData.cardBrand = accountDetails.brand;
        paymentMethodData.expiryMonth = accountDetails.expiryMonth;
        paymentMethodData.expiryYear = accountDetails.expiryYear;
        break;
      
      case 'mobile_money':
        paymentMethodData.phoneNumber = accountDetails.phoneNumber;
        paymentMethodData.accountName = accountDetails.accountName;
        break;
      
      case 'bank_account':
        paymentMethodData.accountNumber = accountDetails.accountNumber;
        paymentMethodData.bankName = accountDetails.bankName;
        paymentMethodData.accountName = accountDetails.accountName;
        break;
      
      case 'wallet':
        paymentMethodData.accountName = accountDetails.accountName;
        break;
    }

    // Check if this should be default (first payment method)
    const existingCount = await PaymentMethod.count({
      where: { userId, status: 'active' }
    });

    if (existingCount === 0) {
      paymentMethodData.isDefault = true;
    }

    return await PaymentMethod.create(paymentMethodData);
  };

  /**
   * Deactivate expired payment methods
   */
  PaymentMethod.deactivateExpiredMethods = async function() {
    const expiredMethods = await PaymentMethod.findAll({
      where: {
        methodType: 'card',
        status: 'active'
      }
    });

    const expiredIds = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const method of expiredMethods) {
      if (method.isExpired()) {
        expiredIds.push(method.id);
        
        // If it was default, find a new default
        if (method.isDefault && method.userId) {
          const newDefault = await PaymentMethod.findOne({
            where: {
              userId: method.userId,
              id: { [sequelize.Op.ne]: method.id },
              status: 'active'
            },
            order: [['createdAt', 'DESC']]
          });

          if (newDefault) {
            await newDefault.update({ isDefault: true });
          }
        }
      }
    }

    if (expiredIds.length > 0) {
      await PaymentMethod.update(
        { status: 'expired' },
        {
          where: { id: expiredIds }
        }
      );
    }

    return expiredIds.length;
  };

  return PaymentMethod;
};