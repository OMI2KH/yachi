module.exports = (sequelize, DataTypes) => {
  const Payout = sequelize.define('Payout', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    providerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ETB'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    processedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false
    },
    providerReference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'payouts',
    indexes: [
      {
        fields: ['providerId']
      },
      {
        fields: ['processedBy']
      },
      {
        fields: ['providerReference']
      }
    ]
  });

  Payout.associate = function(models) {
    Payout.belongsTo(models.User, {
      foreignKey: 'providerId',
      as: 'provider'
    });
    Payout.belongsTo(models.User, {
      foreignKey: 'processedBy',
      as: 'processor'
    });
  };

  return Payout;
};