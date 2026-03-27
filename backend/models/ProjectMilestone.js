module.exports = (sequelize, DataTypes) => {
  const ProjectMilestone = sequelize.define('ProjectMilestone', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'ETB',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'approved', 'paid', 'disputed'),
      defaultValue: 'pending',
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completionDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    approvalDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    deliverables: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    paymentMethodId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'PaymentMethods',
        key: 'id'
      }
    },
    paymentTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference ID from payment gateway (Chapa/Telebirr/CBE)'
    },
    paymentStatus: {
      type: DataTypes.ENUM('unpaid', 'processing', 'paid', 'failed', 'refunded'),
      defaultValue: 'unpaid'
    },
    disputeReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    disputedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    disputeResolvedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'project_milestones',
    timestamps: true,
    paranoid: true, // Soft deletion
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['paymentStatus']
      },
      {
        fields: ['dueDate']
      },
      {
        fields: ['projectId', 'sequence'],
        unique: true
      },
      {
        fields: ['approvedBy']
      },
      {
        fields: ['paymentMethodId']
      }
    ],
    hooks: {
      beforeUpdate: async (milestone, options) => {
        // Auto-update completion date when status changes to completed
        if (milestone.changed('status') && milestone.status === 'completed' && !milestone.completionDate) {
          milestone.completionDate = new Date();
        }
        
        // Auto-update payment date when payment status changes to paid
        if (milestone.changed('paymentStatus') && milestone.paymentStatus === 'paid' && !milestone.paymentDate) {
          milestone.paymentDate = new Date();
        }
        
        // Auto-update approval date when approved
        if (milestone.changed('status') && milestone.status === 'approved' && !milestone.approvalDate) {
          milestone.approvalDate = new Date();
        }
      }
    }
  });

  ProjectMilestone.associate = function(models) {
    ProjectMilestone.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });
    
    ProjectMilestone.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
    
    ProjectMilestone.belongsTo(models.User, {
      foreignKey: 'disputedBy',
      as: 'disputer'
    });
    
    ProjectMilestone.belongsTo(models.PaymentMethod, {
      foreignKey: 'paymentMethodId',
      as: 'paymentMethod'
    });
    
    // Association with Transactions if you have a separate Transaction model
    ProjectMilestone.hasMany(models.Transaction, {
      foreignKey: 'milestoneId',
      as: 'transactions'
    });
    
    // Association for milestone discussions/comments
    ProjectMilestone.hasMany(models.MilestoneComment, {
      foreignKey: 'milestoneId',
      as: 'comments'
    });
    
    // Association for milestone attachments
    ProjectMilestone.hasMany(models.MilestoneAttachment, {
      foreignKey: 'milestoneId',
      as: 'milestoneAttachments'
    });
  };

  // Instance method to check if milestone is payable
  ProjectMilestone.prototype.isPayable = function() {
    return this.status === 'approved' && 
           this.paymentStatus === 'unpaid' && 
           this.paymentMethodId !== null;
  };

  // Instance method to get milestone progress percentage
  ProjectMilestone.prototype.getProgress = function() {
    const statusWeights = {
      pending: 0,
      in_progress: 50,
      completed: 80,
      approved: 90,
      paid: 100
    };
    
    const baseProgress = statusWeights[this.status] || 0;
    
    // Adjust for payment status if milestone is approved
    if (this.status === 'approved') {
      if (this.paymentStatus === 'paid') return 100;
      if (this.paymentStatus === 'processing') return 95;
    }
    
    return baseProgress;
  };

  // Instance method to initiate payment (Ethiopian gateways)
  ProjectMilestone.prototype.initiatePayment = async function(gateway = 'chapa') {
    if (!this.isPayable()) {
      throw new Error('Milestone is not payable');
    }
    
    // This would integrate with your Ethiopian payment service
    const paymentData = {
      amount: this.amount,
      currency: this.currency,
      milestoneId: this.id,
      projectId: this.projectId,
      gateway,
      customerInfo: this.metadata?.customerInfo || {}
    };
    
    // Update payment status
    this.paymentStatus = 'processing';
    await this.save();
    
    return paymentData;
  };

  // Class method to get total milestones amount for a project
  ProjectMilestone.getProjectTotal = async function(projectId) {
    const result = await ProjectMilestone.findOne({
      where: { projectId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalMilestones']
      ],
      group: ['projectId']
    });
    
    return {
      totalAmount: parseFloat(result?.dataValues?.totalAmount || 0),
      totalMilestones: parseInt(result?.dataValues?.totalMilestones || 0)
    };
  };

  // Class method to get milestones summary by status
  ProjectMilestone.getSummaryByStatus = async function(projectId) {
    const results = await ProjectMilestone.findAll({
      where: { projectId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ],
      group: ['status']
    });
    
    return results.reduce((summary, item) => {
      summary[item.status] = {
        count: parseInt(item.dataValues.count),
        totalAmount: parseFloat(item.dataValues.totalAmount || 0)
      };
      return summary;
    }, {});
  };

  // Virtual getter for Ethiopian formatted amount
  Object.defineProperty(ProjectMilestone.prototype, 'formattedAmount', {
    get: function() {
      return new Intl.NumberFormat('et-ET', {
        style: 'currency',
        currency: this.currency
      }).format(this.amount);
    }
  });

  return ProjectMilestone;
};