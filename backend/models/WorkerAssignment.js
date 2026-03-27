module.exports = (sequelize, DataTypes) => {
  const WorkerAssignment = sequelize.define('WorkerAssignment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Jobs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    workerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Admin/manager who assigned the worker'
    },
    assignmentStatus: {
      type: DataTypes.ENUM(
        'pending',
        'accepted',
        'rejected',
        'in_progress',
        'completed',
        'cancelled',
        'reassigned'
      ),
      defaultValue: 'pending',
      allowNull: false
    },
    assignmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    acceptanceDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completionDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scheduledStart: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Planned start date/time for the assignment'
    },
    scheduledEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Planned end date/time for the assignment'
    },
    estimatedHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Estimated hours to complete the job'
    },
    actualHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Actual hours worked'
    },
    hourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Worker\'s hourly rate for this assignment'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Calculated total (actualHours * hourlyRate)'
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed'),
      defaultValue: 'pending'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason why worker rejected the assignment'
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for cancellation'
    },
    reassignmentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes when reassigning to another worker'
    },
    location: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
      comment: 'GPS coordinates of work location'
    },
    checkInLocation: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
      comment: 'GPS where worker checked in'
    },
    checkOutLocation: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
      comment: 'GPS where worker checked out'
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional assignment details, requirements, tools needed, etc.'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'worker_assignments',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['jobId']
      },
      {
        fields: ['workerId']
      },
      {
        fields: ['assignedBy']
      },
      {
        fields: ['assignmentStatus']
      },
      {
        fields: ['paymentStatus']
      },
      {
        fields: ['workerId', 'assignmentStatus']
      },
      {
        fields: ['scheduledStart', 'scheduledEnd']
      },
      {
        fields: ['createdAt']
      },
      // Composite index for common queries
      {
        fields: ['workerId', 'assignmentStatus', 'scheduledStart']
      },
      {
        fields: ['jobId', 'assignmentStatus']
      }
    ]
  });

  WorkerAssignment.associate = function(models) {
    WorkerAssignment.belongsTo(models.Job, {
      foreignKey: 'jobId',
      as: 'job',
      onDelete: 'CASCADE'
    });
    
    WorkerAssignment.belongsTo(models.User, {
      foreignKey: 'workerId',
      as: 'worker',
      onDelete: 'CASCADE'
    });
    
    WorkerAssignment.belongsTo(models.User, {
      foreignKey: 'assignedBy',
      as: 'assigner',
      onDelete: 'SET NULL'
    });
    
    // For reassignment history
    WorkerAssignment.hasOne(models.WorkerAssignment, {
      foreignKey: 'reassignedFromId',
      as: 'reassignedFrom',
      constraints: false
    });
    
    // For time tracking
    WorkerAssignment.hasMany(models.WorkSession, {
      foreignKey: 'assignmentId',
      as: 'workSessions'
    });
    
    // For documents/attachments related to assignment
    WorkerAssignment.hasMany(models.AssignmentDocument, {
      foreignKey: 'assignmentId',
      as: 'documents'
    });
    
    // For tracking assignment changes
    WorkerAssignment.hasMany(models.AssignmentAudit, {
      foreignKey: 'assignmentId',
      as: 'auditLogs'
    });
  };

  // Instance Methods
  WorkerAssignment.prototype.acceptAssignment = async function() {
    if (this.assignmentStatus !== 'pending') {
      throw new Error('Assignment can only be accepted when in pending status');
    }
    
    this.assignmentStatus = 'accepted';
    this.acceptanceDate = new Date();
    return this.save();
  };

  WorkerAssignment.prototype.rejectAssignment = async function(reason) {
    if (this.assignmentStatus !== 'pending') {
      throw new Error('Assignment can only be rejected when in pending status');
    }
    
    this.assignmentStatus = 'rejected';
    this.rejectionReason = reason;
    return this.save();
  };

  WorkerAssignment.prototype.startAssignment = async function(location = null) {
    if (this.assignmentStatus !== 'accepted') {
      throw new Error('Assignment must be accepted before starting');
    }
    
    this.assignmentStatus = 'in_progress';
    this.startDate = new Date();
    this.checkInTime = new Date();
    
    if (location) {
      this.checkInLocation = location;
    }
    
    return this.save();
  };

  WorkerAssignment.prototype.completeAssignment = async function(location = null) {
    if (this.assignmentStatus !== 'in_progress') {
      throw new Error('Assignment must be in progress before completing');
    }
    
    this.assignmentStatus = 'completed';
    this.completionDate = new Date();
    this.checkOutTime = new Date();
    
    if (location) {
      this.checkOutLocation = location;
    }
    
    return this.save();
  };

  WorkerAssignment.prototype.cancelAssignment = async function(reason, cancelledBy) {
    const allowedStatuses = ['pending', 'accepted', 'in_progress'];
    if (!allowedStatuses.includes(this.assignmentStatus)) {
      throw new Error(`Cannot cancel assignment in ${this.assignmentStatus} status`);
    }
    
    this.assignmentStatus = 'cancelled';
    this.cancellationReason = reason;
    
    // Store who cancelled in metadata
    this.metadata = {
      ...this.metadata,
      cancelledBy: cancelledBy,
      cancelledAt: new Date().toISOString()
    };
    
    return this.save();
  };

  WorkerAssignment.prototype.calculatePayment = function() {
    if (!this.actualHours || !this.hourlyRate) {
      return 0;
    }
    
    const total = parseFloat(this.actualHours) * parseFloat(this.hourlyRate);
    this.totalAmount = total;
    return total;
  };

  WorkerAssignment.prototype.getAssignmentDuration = function() {
    if (!this.startDate || !this.completionDate) {
      return null;
    }
    
    const diffMs = new Date(this.completionDate) - new Date(this.startDate);
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(2);
  };

  // Class Methods
  WorkerAssignment.findActiveAssignments = function(workerId) {
    return WorkerAssignment.findAll({
      where: {
        workerId,
        assignmentStatus: ['accepted', 'in_progress'],
        isActive: true
      },
      order: [['scheduledStart', 'ASC']]
    });
  };

  WorkerAssignment.findUpcomingAssignments = function(workerId, days = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    return WorkerAssignment.findAll({
      where: {
        workerId,
        assignmentStatus: 'accepted',
        scheduledStart: {
          [sequelize.Op.between]: [startDate, endDate]
        },
        isActive: true
      },
      order: [['scheduledStart', 'ASC']]
    });
  };

  WorkerAssignment.countCompletedAssignments = function(workerId) {
    return WorkerAssignment.count({
      where: {
        workerId,
        assignmentStatus: 'completed',
        isActive: true
      }
    });
  };

  // Hooks
  WorkerAssignment.beforeSave(async (assignment, options) => {
    // Auto-calculate total amount when actualHours or hourlyRate changes
    if (assignment.changed('actualHours') || assignment.changed('hourlyRate')) {
      if (assignment.actualHours && assignment.hourlyRate) {
        assignment.calculatePayment();
      }
    }
    
    // Validate that worker is not already assigned to overlapping jobs
    if (assignment.changed('assignmentStatus') && 
        ['accepted', 'in_progress'].includes(assignment.assignmentStatus) &&
        assignment.scheduledStart && assignment.scheduledEnd) {
      
      const overlapping = await WorkerAssignment.findOne({
        where: {
          workerId: assignment.workerId,
          assignmentStatus: ['accepted', 'in_progress'],
          id: { [sequelize.Op.ne]: assignment.id },
          [sequelize.Op.or]: [
            {
              scheduledStart: {
                [sequelize.Op.lte]: assignment.scheduledEnd
              },
              scheduledEnd: {
                [sequelize.Op.gte]: assignment.scheduledStart
              }
            },
            {
              scheduledStart: null,
              scheduledEnd: null
            }
          ]
        }
      });
      
      if (overlapping) {
        throw new Error('Worker has overlapping assignments');
      }
    }
  });

  return WorkerAssignment;
};