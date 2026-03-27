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
      type: DataTypes.ENUM('card', 'mobile_money', 'bank_account'),
      allowNull: false
    },
    provider: {
      type: DataTypes.ENUM('chapa', 'telebirr', 'cbe_birr'), // Updated for Ethiopian gateways
      allowNull: false
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    lastFour: {
      type: DataTypes.STRING,
      allowNull: true
    },
    expiryMonth: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    expiryYear: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'ETB', // Added default currency for Ethiopian transactions
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'payment_methods',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['token']
      },
      {
        fields: ['provider']
      },
      {
        fields: ['userId', 'isDefault'],
        where: {
          isDefault: true
        }
      }
    ]
  });

  PaymentMethod.associate = function(models) {
    PaymentMethod.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // You might want to add associations to Transaction/Payment models
    PaymentMethod.hasMany(models.Transaction, {
      foreignKey: 'paymentMethodId',
      as: 'transactions'
    });
  };

  // Instance method to mask sensitive payment info
  PaymentMethod.prototype.getMaskedInfo = function() {
    if (this.methodType === 'card' && this.lastFour) {
      return `**** **** **** ${this.lastFour}`;
    } else if (this.methodType === 'mobile_money') {
      // For mobile money, you might store phone number in metadata
      const phone = this.metadata?.phoneNumber || '';
      return phone ? `${phone.substring(0, 3)}****${phone.substring(7)}` : 'Mobile Money';
    }
    return this.provider;
  };

  // Class method to handle default payment method logic
  PaymentMethod.setDefaultMethod = async function(userId, paymentMethodId) {
    const transaction = await sequelize.transaction();
    
    try {
      // Reset all default methods for this user
      await PaymentMethod.update(
        { isDefault: false },
        {
          where: { userId, isDefault: true },
          transaction
        }
      );
      
      // Set the new default method
      await PaymentMethod.update(
        { isDefault: true },
        {
          where: { id: paymentMethodId, userId },
          transaction
        }
      );
      
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  return PaymentMethod;
};