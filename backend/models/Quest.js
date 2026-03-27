module.exports = (sequelize, DataTypes) => {
  const Quest = sequelize.define('Quest', {
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
    type: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'special'),
      allowNull: false
    },
    triggerAction: {
      type: DataTypes.STRING,
      allowNull: false
    },
    targetCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    pointsReward: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
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
    tableName: 'quests',
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['triggerAction']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['expiresAt']
      }
    ]
  });

  Quest.associate = function(models) {
    Quest.hasMany(models.UserQuest, {
      foreignKey: 'questId',
      as: 'userQuests'
    });
  };

  return Quest;
};