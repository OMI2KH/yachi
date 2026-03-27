module.exports = (sequelize, DataTypes) => {
  const Reward = sequelize.define('Reward', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM(
        'discount',
        'badge',
        'feature',
        'physical',
        'digital',
        'recognition'
      ),
      allowNull: false
    },
    pointsCost: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantityAvailable: {
      type: DataTypes.INTEGER,
      defaultValue: null // null means unlimited
    },
    maxPerUser: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    startDate: {
      type: DataTypes.DATE
    },
    endDate: {
      type: DataTypes.DATE
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
        fields: ['type']
      },
      {
        fields: ['pointsCost']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['startDate', 'endDate']
      }
    ]
  });

  Reward.associate = function(models) {
    Reward.hasMany(models.RewardRedemption, {
      foreignKey: 'rewardId',
      as: 'redemptions'
    });
  };

  return Reward;
};