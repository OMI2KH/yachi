const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BadgePurchase = sequelize.define('BadgePurchase', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    badgeType: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ETB'
    },
    status: {
      type: DataTypes.ENUM('initiated','success','failed','refunded'),
      defaultValue: 'initiated'
    },
    paymentReference: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'badge_purchases',
    underscored: true
  });

  return BadgePurchase;
};
