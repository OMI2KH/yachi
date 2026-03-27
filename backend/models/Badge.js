module.exports = (sequelize, DataTypes) => {
  const Badge = sequelize.define('Badge', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('service', 'quality', 'social', 'verification', 'milestone', 'special'),
      allowNull: false
    },
    rarity: {
      type: DataTypes.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
      defaultValue: 'common'
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: false
    },
    triggerAction: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pointsRequired: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'badges',
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['rarity']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  Badge.associate = function(models) {
    Badge.hasMany(models.UserBadge, {
      foreignKey: 'badgeId',
      as: 'userBadges'
    });
  };

  return Badge;
};