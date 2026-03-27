const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active','cancelled','past_due','trialing'),
      defaultValue: 'active'
    },
    startDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    recurringAmount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ETB'
    },
    paymentMethod: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'subscriptions',
    underscored: true
  });

  return Subscription;
};
