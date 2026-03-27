module.exports = (sequelize, DataTypes) => {
  const FavoriteService = sequelize.define('FavoriteService', {
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
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Services',
        key: 'id'
      }
    }
  }, {
    tableName: 'favorite_services',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'serviceId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['serviceId']
      }
    ]
  });

  FavoriteService.associate = function(models) {
    FavoriteService.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    FavoriteService.belongsTo(models.Service, {
      foreignKey: 'serviceId',
      as: 'service'
    });
  };

  return FavoriteService;
};