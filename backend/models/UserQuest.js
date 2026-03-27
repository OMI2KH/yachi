module.exports = (sequelize, DataTypes) => {
  const UserQuest = sequelize.define('UserQuest', {
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
    questId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Quests',
        key: 'id'
      }
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'user_quests',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'questId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['questId']
      }
    ]
  });

  UserQuest.associate = function(models) {
    UserQuest.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserQuest.belongsTo(models.Quest, {
      foreignKey: 'questId',
      as: 'quest'
    });
  };

  return UserQuest;
};