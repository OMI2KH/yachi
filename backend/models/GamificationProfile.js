module.exports = (sequelize, DataTypes) => {
  const GamificationProfile = sequelize.define('GamificationProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    totalPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    availablePoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    experience: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastActivityDate: {
      type: DataTypes.DATE
    },
    achievements: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    badges: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    stats: {
      type: DataTypes.JSONB,
      defaultValue: {
        challengesCompleted: 0,
        rewardsRedeemed: 0,
        pointsByCategory: {},
        dailyAverage: 0
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['level']
      },
      {
        fields: ['totalPoints']
      },
      {
        fields: ['currentStreak']
      }
    ]
  });

  GamificationProfile.associate = function(models) {
    GamificationProfile.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    GamificationProfile.hasMany(models.PointsTransaction, {
      foreignKey: 'profileId',
      as: 'transactions'
    });
    
    GamificationProfile.hasMany(models.ChallengeCompletion, {
      foreignKey: 'profileId',
      as: 'challengeCompletions'
    });
    
    GamificationProfile.hasMany(models.RewardRedemption, {
      foreignKey: 'profileId',
      as: 'rewardRedemptions'
    });
  };

  return GamificationProfile;
};