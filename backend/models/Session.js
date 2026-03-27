module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
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
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'sessions',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['refreshToken']
      },
      {
        fields: ['expiresAt']
      }
    ]
  });

  Session.associate = function(models) {
    Session.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Session;
};