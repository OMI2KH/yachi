const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');
const { User, Service, Transaction, Review } = require('./index');

class ConstructionProject extends Model {
  // 🔧 Instance methods
  async calculateProgress() {
    const totalMilestones = await this.countMilestones();
    const completedMilestones = await this.countMilestones({
      where: { status: 'completed' }
    });
    
    return totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  }

  async updateFinancialMetrics() {
    const transactions = await Transaction.findAll({
      where: { projectId: this.id }
    });

    const totalBudget = this.budget || 0;
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalPayments = transactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
    const paymentCompletion = totalBudget > 0 ? (totalPayments / totalBudget) * 100 : 0;

    await this.update({
      financialMetrics: {
        totalBudget,
        totalExpenses,
        totalPayments,
        budgetUtilization,
        paymentCompletion,
        variance: totalBudget - totalExpenses,
        lastUpdated: new Date()
      }
    });
  }

  async addTeamMember(userId, role, permissions = []) {
    return await sequelize.models.ProjectTeam.create({
      projectId: this.id,
      userId,
      role,
      permissions,
      joinedAt: new Date()
    });
  }

  async calculateRiskScore() {
    const risks = this.riskAssessment || {};
    let score = 0;
    let factors = [];

    // 🔍 Budget risk
    const budgetUtilization = this.financialMetrics?.budgetUtilization || 0;
    if (budgetUtilization > 90) {
      score += 30;
      factors.push('budget_overrun');
    }

    // 📅 Schedule risk
    const progress = await this.calculateProgress();
    const elapsedDays = Math.floor((new Date() - this.startDate) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
    const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
    
    if (progress < expectedProgress - 20) {
      score += 40;
      factors.push('schedule_delay');
    }

    // 🏗️ Complexity risk
    if (this.projectType === 'large_construction') score += 20;
    if (this.complexity === 'high') score += 30;

    // 👥 Team risk
    const teamCount = await this.countTeam();
    if (teamCount < 3) {
      score += 15;
      factors.push('small_team');
    }

    // 📍 Location risk
    if (this.location?.remote || this.location?.difficultAccess) {
      score += 25;
      factors.push('challenging_location');
    }

    return {
      score: Math.min(score, 100),
      level: score < 30 ? 'low' : score < 60 ? 'medium' : 'high',
      factors,
      lastCalculated: new Date()
    };
  }
}

ConstructionProject.init({
  // 🔑 Basic Information
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  projectManagerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },

  // 🏗️ Project Specifications
  projectType: {
    type: DataTypes.ENUM(
      'home_repair',
      'renovation',
      'small_construction',
      'large_construction',
      'commercial',
      'industrial',
      'infrastructure',
      'other'
    ),
    defaultValue: 'home_repair'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // 📍 Location Details
  location: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    validate: {
      isValidLocation(value) {
        if (!value.address) {
          throw new Error('Address is required');
        }
        if (!value.coordinates || !value.coordinates.latitude || !value.coordinates.longitude) {
          throw new Error('Valid coordinates are required');
        }
      }
    }
  },

  // 💰 Financial Details
  budget: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'KES'
  },
  paymentSchedule: {
    type: DataTypes.ENUM(
      'upfront',
      'milestone',
      'monthly',
      'completion',
      'custom'
    ),
    defaultValue: 'milestone'
  },
  financialMetrics: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  // 📅 Timeline
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  actualStartDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // 🎯 Status & Progress
  status: {
    type: DataTypes.ENUM(
      'draft',
      'pending_approval',
      'planning',
      'in_progress',
      'on_hold',
      'delayed',
      'completed',
      'cancelled',
      'disputed'
    ),
    defaultValue: 'draft'
  },
  progress: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },

  // 📋 Technical Details
  complexity: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  size: {
    type: DataTypes.JSONB,
    defaultValue: {} // { area: 100, unit: 'sqft', floors: 1, rooms: 3 }
  },
  specifications: {
    type: DataTypes.JSONB,
    defaultValue: {} // Detailed technical specifications
  },
  requirements: {
    type: DataTypes.JSONB,
    defaultValue: {} // Client requirements and preferences
  },

  // 📁 Documentation
  blueprints: {
    type: DataTypes.JSONB,
    defaultValue: [] // Array of blueprint file URLs
  },
  permits: {
    type: DataTypes.JSONB,
    defaultValue: [] // Array of permit documents
  },
  contracts: {
    type: DataTypes.JSONB,
    defaultValue: [] // Contract documents
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: [] // Other attachments
  },

  // 🛡️ Safety & Compliance
  safetyRequirements: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  complianceCertificates: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  insuranceDetails: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  // 🔍 Risk Assessment
  riskAssessment: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  qualityAssurance: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  // 👥 Team & Communication
  communicationSettings: {
    type: DataTypes.JSONB,
    defaultValue: {
      notifications: true,
      weeklyReports: true,
      milestoneUpdates: true,
      clientAccess: true
    }
  },

  // 📊 Analytics & Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {
      createdBy: null,
      lastModifiedBy: null,
      version: 1,
      tags: []
    }
  },
  analytics: {
    type: DataTypes.JSONB,
    defaultValue: {
      views: 0,
      inquiries: 0,
      shares: 0,
      rating: 0
    }
  },

  // ⏰ Timestamps
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'ConstructionProject',
  tableName: 'construction_projects',
  paranoid: true, // Soft deletes
  timestamps: true,
  indexes: [
    {
      fields: ['clientId', 'status']
    },
    {
      fields: ['projectManagerId']
    },
    {
      fields: ['projectType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['location.coordinates'],
      using: 'GIST'
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: async (project) => {
      project.metadata = {
        ...project.metadata,
        createdBy: project.clientId,
        version: 1
      };
    },
    beforeUpdate: async (project) => {
      project.metadata = {
        ...project.metadata,
        lastModifiedBy: project.clientId || project.projectManagerId,
        version: (project.metadata?.version || 0) + 1
      };
    },
    afterCreate: async (project) => {
      // Create initial project milestones
      await sequelize.models.ProjectMilestone.createInitialMilestones(project.id);
      
      // Send notification to assigned team
      if (project.projectManagerId) {
        await sequelize.models.Notification.create({
          userId: project.projectManagerId,
          type: 'project_assigned',
          title: 'New Project Assignment',
          message: `You have been assigned as project manager for "${project.title}"`,
          data: { projectId: project.id }
        });
      }
    }
  }
});

// 🔗 Associations
ConstructionProject.associate = (models) => {
  // Client who owns the project
  ConstructionProject.belongsTo(models.User, {
    foreignKey: 'clientId',
    as: 'client',
    onDelete: 'CASCADE'
  });

  // Project manager
  ConstructionProject.belongsTo(models.User, {
    foreignKey: 'projectManagerId',
    as: 'projectManager',
    onDelete: 'SET NULL'
  });

  // Project team members
  ConstructionProject.belongsToMany(models.User, {
    through: 'ProjectTeams',
    foreignKey: 'projectId',
    otherKey: 'userId',
    as: 'team',
    onDelete: 'CASCADE'
  });

  // Services/contracts within the project
  ConstructionProject.hasMany(models.Service, {
    foreignKey: 'projectId',
    as: 'services',
    onDelete: 'CASCADE'
  });

  // Milestones
  ConstructionProject.hasMany(models.ProjectMilestone, {
    foreignKey: 'projectId',
    as: 'milestones',
    onDelete: 'CASCADE'
  });

  // Tasks
  ConstructionProject.hasMany(models.ProjectTask, {
    foreignKey: 'projectId',
    as: 'tasks',
    onDelete: 'CASCADE'
  });

  // Budget items
  ConstructionProject.hasMany(models.ProjectBudgetItem, {
    foreignKey: 'projectId',
    as: 'budgetItems',
    onDelete: 'CASCADE'
  });

  // Materials/Inventory
  ConstructionProject.hasMany(models.ProjectMaterial, {
    foreignKey: 'projectId',
    as: 'materials',
    onDelete: 'CASCADE'
  });

  // Transactions
  ConstructionProject.hasMany(models.Transaction, {
    foreignKey: 'projectId',
    as: 'transactions',
    onDelete: 'CASCADE'
  });

  // Reviews
  ConstructionProject.hasMany(models.Review, {
    foreignKey: 'projectId',
    as: 'reviews',
    onDelete: 'CASCADE'
  });

  // Inspections
  ConstructionProject.hasMany(models.ProjectInspection, {
    foreignKey: 'projectId',
    as: 'inspections',
    onDelete: 'CASCADE'
  });

  // Issues/Defects
  ConstructionProject.hasMany(models.ProjectIssue, {
    foreignKey: 'projectId',
    as: 'issues',
    onDelete: 'CASCADE'
  });

  // Documents
  ConstructionProject.hasMany(models.ProjectDocument, {
    foreignKey: 'projectId',
    as: 'documents',
    onDelete: 'CASCADE'
  });

  // Chat/Communication
  ConstructionProject.hasMany(models.Conversation, {
    foreignKey: 'projectId',
    as: 'conversations',
    onDelete: 'CASCADE'
  });
};

// 🎯 Class Methods
ConstructionProject.findByLocation = async function(latitude, longitude, radius = 50) {
  return this.findAll({
    where: sequelize.where(
      sequelize.fn(
        'ST_DWithin',
        sequelize.col('location.coordinates'),
        sequelize.fn('ST_MakePoint', longitude, latitude),
        radius * 1000 // Convert km to meters
      ),
      true
    )
  });
};

ConstructionProject.getProjectStatistics = async function() {
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalProjects'],
      [sequelize.fn('SUM', sequelize.col('budget')), 'totalBudget'],
      [sequelize.fn('AVG', sequelize.col('budget')), 'averageBudget'],
      [
        sequelize.fn('COUNT',
          sequelize.literal('CASE WHEN status = \'completed\' THEN 1 END')
        ),
        'completedProjects'
      ],
      [
        sequelize.fn('COUNT',
          sequelize.literal('CASE WHEN status = \'in_progress\' THEN 1 END')
        ),
        'activeProjects'
      ],
      [
        sequelize.fn('AVG', sequelize.col('progress')),
        'averageProgress'
      ]
    ],
    where: {
      deletedAt: null
    },
    raw: true
  });

  return stats[0];
};

ConstructionProject.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Remove sensitive data
  delete values.metadata?.internalNotes;
  delete values.financialMetrics?.internal;
  delete values.insuranceDetails?.policyNumber;
  
  // Add computed fields
  values.isActive = ['planning', 'in_progress'].includes(values.status);
  values.isOverdue = values.endDate && new Date() > values.endDate && values.status !== 'completed';
  values.daysRemaining = values.endDate 
    ? Math.ceil((values.endDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  
  // Format budget
  values.formattedBudget = new Intl.NumberFormat('et-ETB', {
    style: 'currency',
    currency: values.currency || 'ETB'
  }).format(values.budget || 0);
  
  return values;
};

module.exports = ConstructionProject;