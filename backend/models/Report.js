module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reporterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    targetType: {
      type: DataTypes.ENUM('user', 'service', 'review', 'message'),
      allowNull: false
    },
    targetId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'investigating', 'resolved', 'dismissed'),
      defaultValue: 'pending'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'reports',
    indexes: [
      {
        fields: ['reporterId']
      },
      {
        fields: ['targetType', 'targetId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      }
    ]
  });

  Report.associate = function(models) {
    Report.belongsTo(models.User, {
      foreignKey: 'reporterId',
      as: 'reporter'
    });
    Report.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee'
    });
  };

  return Report;
};