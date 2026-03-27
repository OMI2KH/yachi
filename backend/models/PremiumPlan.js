const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PremiumPlan = sequelize.define('PremiumPlan', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ETB'
    },
    durationDays: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'premium_plans',
    underscored: true
  });

  return PremiumPlan;
};
