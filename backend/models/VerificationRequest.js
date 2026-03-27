module.exports = (sequelize, DataTypes) => {
  const VerificationRequest = sequelize.define('VerificationRequest', {
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
    documentType: {
      type: DataTypes.ENUM('fayda_id', 'passport', 'driving_license', 'degree', 'certificate'),
      allowNull: false
    },
    documentImage: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'verification_requests',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['documentType']
      }
    ]
  });

  VerificationRequest.associate = function(models) {
    VerificationRequest.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    VerificationRequest.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer'
    });
  };

  return VerificationRequest;
};