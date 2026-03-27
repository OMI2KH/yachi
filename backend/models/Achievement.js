module.exports = (sequelize, DataTypes) => {
  const Achievement = sequelize.define('Achievement', {
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
      type: DataTypes.ENUM('registration', 'verification', 'service', 'social', 'payment', 'quality', 'engagement'),
      allowNull: false
    },
    triggerAction: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pointsReward: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    resetPeriod: {
      type: DataTypes.ENUM('never', 'daily', 'weekly', 'monthly'),
      defaultValue: 'never'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'achievements',
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['triggerAction']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  Achievement.associate = function(models) {
    Achievement.hasMany(models.UserAchievement, {
      foreignKey: 'achievementId',
      as: 'userAchievements'
    });
  };

  return Achievement;
};