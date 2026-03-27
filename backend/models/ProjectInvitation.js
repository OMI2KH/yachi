module.exports = (sequelize, DataTypes) => {
  const ProjectInvitation = sequelize.define('ProjectInvitation', {
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
    inviterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    inviteeId: {
      type: DataTypes.INTEGER,
      allowNull: true, // null for email-based invitations
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    inviteeEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    role: {
      type: DataTypes.ENUM('member', 'admin', 'viewer', 'contributor'),
      defaultValue: 'member',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'project_invitations',
    timestamps: true,
    paranoid: true, // Soft deletion
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['inviterId']
      },
      {
        fields: ['inviteeId']
      },
      {
        fields: ['inviteeEmail']
      },
      {
        fields: ['token'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['expiresAt']
      },
      {
        fields: ['projectId', 'inviteeEmail', 'status'],
        where: {
          status: 'pending'
        }
      }
    ],
    hooks: {
      beforeCreate: (invitation) => {
        // Generate a unique token for the invitation
        if (!invitation.token) {
          invitation.token = require('crypto').randomBytes(32).toString('hex');
        }
        
        // Ensure email is lowercase
        if (invitation.inviteeEmail) {
          invitation.inviteeEmail = invitation.inviteeEmail.toLowerCase().trim();
        }
      },
      beforeUpdate: (invitation) => {
        // Update respondedAt when status changes from pending
        if (invitation.changed('status') && 
            invitation.previous('status') === 'pending' && 
            ['accepted', 'rejected'].includes(invitation.status)) {
          invitation.respondedAt = new Date();
        }
      }
    }
  });

  ProjectInvitation.associate = function(models) {
    ProjectInvitation.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project',
      onDelete: 'CASCADE'
    });
    
    ProjectInvitation.belongsTo(models.User, {
      foreignKey: 'inviterId',
      as: 'inviter'
    });
    
    ProjectInvitation.belongsTo(models.User, {
      foreignKey: 'inviteeId',
      as: 'invitee'
    });
    
    // Association for project memberships created from accepted invitations
    ProjectInvitation.hasOne(models.ProjectMember, {
      foreignKey: 'invitationId',
      as: 'projectMember'
    });
  };

  // Instance methods
  ProjectInvitation.prototype.isExpired = function() {
    return new Date() > this.expiresAt;
  };

  ProjectInvitation.prototype.canRespond = function() {
    return this.status === 'pending' && !this.isExpired();
  };

  ProjectInvitation.prototype.accept = async function(userId = null) {
    if (!this.canRespond()) {
      throw new Error('Invitation is not in a valid state to be accepted');
    }
    
    // If inviteeId wasn't set initially (email invitation), set it now
    if (!this.inviteeId && userId) {
      this.inviteeId = userId;
    }
    
    this.status = 'accepted';
    this.respondedAt = new Date();
    return this.save();
  };

  ProjectInvitation.prototype.reject = async function(userId = null) {
    if (!this.canRespond()) {
      throw new Error('Invitation is not in a valid state to be rejected');
    }
    
    // If inviteeId wasn't set initially (email invitation), set it now
    if (!this.inviteeId && userId) {
      this.inviteeId = userId;
    }
    
    this.status = 'rejected';
    this.respondedAt = new Date();
    return this.save();
  };

  ProjectInvitation.prototype.cancel = async function() {
    if (this.status !== 'pending') {
      throw new Error('Only pending invitations can be cancelled');
    }
    
    this.status = 'cancelled';
    return this.save();
  };

  ProjectInvitation.prototype.resend = async function() {
    if (this.status !== 'pending') {
      throw new Error('Only pending invitations can be resent');
    }
    
    // Generate new token and extend expiry
    this.token = require('crypto').randomBytes(32).toString('hex');
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Another 7 days
    this.sentAt = new Date();
    
    return this.save();
  };

  // Class methods
  ProjectInvitation.findByToken = function(token) {
    return this.findOne({
      where: { token },
      include: [
        { association: 'project', attributes: ['id', 'name', 'status'] },
        { association: 'inviter', attributes: ['id', 'name', 'email'] }
      ]
    });
  };

  ProjectInvitation.getPendingInvitationsForEmail = function(email) {
    return this.findAll({
      where: {
        inviteeEmail: email.toLowerCase(),
        status: 'pending',
        expiresAt: { [sequelize.Op.gt]: new Date() }
      },
      include: [
        { 
          association: 'project', 
          attributes: ['id', 'name', 'description', 'status'] 
        },
        { 
          association: 'inviter', 
          attributes: ['id', 'name', 'email'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  };

  ProjectInvitation.getUserInvitations = function(userId) {
    return this.findAll({
      where: {
        inviteeId: userId,
        status: 'pending',
        expiresAt: { [sequelize.Op.gt]: new Date() }
      },
      include: [
        { 
          association: 'project', 
          attributes: ['id', 'name', 'description', 'status'] 
        },
        { 
          association: 'inviter', 
          attributes: ['id', 'name', 'email'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  };

  // Scopes
  ProjectInvitation.addScope('active', {
    where: {
      status: 'pending',
      expiresAt: { [sequelize.Op.gt]: new Date() }
    }
  });

  ProjectInvitation.addScope('forProject', function(projectId) {
    return {
      where: { projectId }
    };
  });

  ProjectInvitation.addScope('forInvitee', function(emailOrUserId) {
    const where = {};
    
    if (typeof emailOrUserId === 'string' && emailOrUserId.includes('@')) {
      where.inviteeEmail = emailOrUserId.toLowerCase();
    } else {
      where.inviteeId = emailOrUserId;
    }
    
    return { where };
  });

  return ProjectInvitation;
};