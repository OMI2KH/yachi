module.exports = (sequelize, DataTypes) => {
  const Challenge = sequelize.define('Challenge', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM(
        'onboarding',
        'engagement',
        'productivity',
        'social',
        'mastery',
        'special'
      ),
      allowNull: false
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard', 'expert'),
      defaultValue: 'medium'
    },
    pointsReward: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    requirements: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER, // in days
      defaultValue: null
    },
    startDate: {
      type: DataTypes.DATE
    },
    endDate: {
      type: DataTypes.DATE
    },
    maxCompletions: {
      type: DataTypes.INTEGER,
      defaultValue: null
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['difficulty']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['startDate', 'endDate']
      }
    ]
  });

  Challenge.associate = function(models) {
    Challenge.hasMany(models.ChallengeCompletion, {
      foreignKey: 'challengeId',
      as: 'completions'
    });
  };

  return Challenge;
};