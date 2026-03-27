module.exports = (sequelize, DataTypes) => {
  const AdminLog = sequelize.define('AdminLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    targetType: {
      type: DataTypes.ENUM('user', 'service', 'booking', 'transaction', 'verification', 'system'),
      allowNull: false
    },
    targetId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'admin_logs',
    indexes: [
      {
        fields: ['adminId']
      },
      {
        fields: ['action']
      },
      {
        fields: ['targetType', 'targetId']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  AdminLog.associate = function(models) {
    AdminLog.belongsTo(models.User, {
      foreignKey: 'adminId',
      as: 'admin'
    });
  };

  return AdminLog;
};