module.exports = (sequelize, DataTypes) => {
  const UserAchievement = sequelize.define('UserAchievement', {
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
    achievementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Achievements',
        key: 'id'
      }
    },
    unlockedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'user_achievements',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'achievementId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['achievementId']
      }
    ]
  });

  UserAchievement.associate = function(models) {
    UserAchievement.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserAchievement.belongsTo(models.Achievement, {
      foreignKey: 'achievementId',
      as: 'achievement'
    });
  };

  return UserAchievement;
};