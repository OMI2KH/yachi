module.exports = (sequelize, DataTypes) => {
  const UserBadge = sequelize.define('UserBadge', {
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
    badgeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Badges',
        key: 'id'
      }
    },
    awardedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'user_badges',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'badgeId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['badgeId']
      }
    ]
  });

  UserBadge.associate = function(models) {
    UserBadge.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserBadge.belongsTo(models.Badge, {
      foreignKey: 'badgeId',
      as: 'badge'
    });
  };

  return UserBadge;
};