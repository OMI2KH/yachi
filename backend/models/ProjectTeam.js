module.exports = (sequelize, DataTypes) => {
  const ProjectTeam = sequelize.define('ProjectTeam', {
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
      },
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.ENUM(
        'owner',
        'admin',
        'manager',
        'editor',
        'viewer',
        'contributor',
        'contractor'
      ),
      allowNull: false,
      defaultValue: 'contributor'
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      validate: {
        isValidPermissions(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Permissions must be an object');
          }
        }
      }
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    invitationStatus: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'revoked'),
      allowNull: false,
      defaultValue: 'accepted'
    },
    invitationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    invitationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'project_teams',
    indexes: [
      {
        unique: true,
        fields: ['projectId', 'userId'],
        name: 'unique_project_user'
      },
      {
        fields: ['projectId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['role']
      },
      {
        fields: ['invitationStatus']
      },
      {
        fields: ['invitationToken']
      },
      {
        fields: ['isActive']
      },
      // Composite index for common queries
      {
        fields: ['projectId', 'isActive', 'invitationStatus']
      }
    ],
    hooks: {
      beforeCreate: (projectTeam, options) => {
        // Set default permissions based on role if not provided
        if (!projectTeam.permissions) {
          projectTeam.permissions = ProjectTeam.getDefaultPermissions(projectTeam.role);
        }
        
        // Ensure invitation token is unique
        if (projectTeam.invitationToken) {
          projectTeam.invitationToken = `${projectTeam.invitationToken}_${Date.now()}`;
        }
      },
      beforeUpdate: (projectTeam, options) => {
        // Update lastActiveAt when permissions or role changes
        if (projectTeam.changed('permissions') || projectTeam.changed('role')) {
          projectTeam.lastActiveAt = new Date();
        }
      }
    }
  });

  // Static method to get default permissions for each role
  ProjectTeam.getDefaultPermissions = function(role) {
    const permissionTemplates = {
      owner: {
        canEditProject: true,
        canDeleteProject: true,
        canManageTeam: true,
        canManageBudget: true,
        canManageTasks: true,
        canViewAllTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canUploadFiles: true,
        canDeleteFiles: true,
        canManageSettings: true,
        canViewReports: true,
        canExportData: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canChangeRoles: true
      },
      admin: {
        canEditProject: true,
        canDeleteProject: false,
        canManageTeam: true,
        canManageBudget: true,
        canManageTasks: true,
        canViewAllTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canUploadFiles: true,
        canDeleteFiles: true,
        canManageSettings: true,
        canViewReports: true,
        canExportData: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canChangeRoles: true
      },
      manager: {
        canEditProject: true,
        canDeleteProject: false,
        canManageTeam: false,
        canManageBudget: true,
        canManageTasks: true,
        canViewAllTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canUploadFiles: true,
        canDeleteFiles: false,
        canManageSettings: false,
        canViewReports: true,
        canExportData: true,
        canInviteMembers: false,
        canRemoveMembers: false,
        canChangeRoles: false
      },
      editor: {
        canEditProject: false,
        canDeleteProject: false,
        canManageTeam: false,
        canManageBudget: false,
        canManageTasks: false,
        canViewAllTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: false,
        canUploadFiles: true,
        canDeleteFiles: false,
        canManageSettings: false,
        canViewReports: true,
        canExportData: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canChangeRoles: false
      },
      contributor: {
        canEditProject: false,
        canDeleteProject: false,
        canManageTeam: false,
        canManageBudget: false,
        canManageTasks: false,
        canViewAllTasks: false,
        canCreateTasks: false,
        canEditTasks: true,
        canDeleteTasks: false,
        canUploadFiles: true,
        canDeleteFiles: false,
        canManageSettings: false,
        canViewReports: false,
        canExportData: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canChangeRoles: false
      },
      viewer: {
        canEditProject: false,
        canDeleteProject: false,
        canManageTeam: false,
        canManageBudget: false,
        canManageTasks: false,
        canViewAllTasks: true,
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canUploadFiles: false,
        canDeleteFiles: false,
        canManageSettings: false,
        canViewReports: true,
        canExportData: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canChangeRoles: false
      },
      contractor: {
        canEditProject: false,
        canDeleteProject: false,
        canManageTeam: false,
        canManageBudget: false,
        canManageTasks: false,
        canViewAllTasks: false,
        canCreateTasks: false,
        canEditTasks: true,
        canDeleteTasks: false,
        canUploadFiles: true,
        canDeleteFiles: false,
        canManageSettings: false,
        canViewReports: false,
        canExportData: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canChangeRoles: false
      }
    };
    
    return permissionTemplates[role] || permissionTemplates.contributor;
  };

  // Associations
  ProjectTeam.associate = function(models) {
    ProjectTeam.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project',
      onDelete: 'CASCADE'
    });
    
    ProjectTeam.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
    
    ProjectTeam.belongsTo(models.User, {
      foreignKey: 'invitedBy',
      as: 'inviter'
    });
    
    // Optional: Association with Task assignments
    ProjectTeam.hasMany(models.TaskAssignment, {
      foreignKey: 'teamMemberId',
      as: 'taskAssignments'
    });
  };

  // Instance methods
  ProjectTeam.prototype.hasPermission = function(permissionName) {
    // Check if the user has the specific permission
    return this.permissions && this.permissions[permissionName] === true;
  };

  ProjectTeam.prototype.canAccessProject = function() {
    // Check if team member can access the project
    return this.isActive && 
           this.invitationStatus === 'accepted' && 
           (!this.invitationExpiresAt || new Date() < new Date(this.invitationExpiresAt));
  };

  ProjectTeam.prototype.getRoleHierarchy = function() {
    const hierarchy = {
      'owner': 7,
      'admin': 6,
      'manager': 5,
      'editor': 4,
      'contributor': 3,
      'contractor': 2,
      'viewer': 1
    };
    return hierarchy[this.role] || 0;
  };

  ProjectTeam.prototype.canManageUser = function(targetUserRole) {
    // Check if this team member can manage another user based on role hierarchy
    const currentUserHierarchy = this.getRoleHierarchy();
    const targetHierarchy = ProjectTeam.getRoleHierarchyValue(targetUserRole);
    
    // Can only manage users with lower hierarchy
    return currentUserHierarchy > targetHierarchy;
  };

  // Static method to get hierarchy value
  ProjectTeam.getRoleHierarchyValue = function(role) {
    const hierarchy = {
      'owner': 7,
      'admin': 6,
      'manager': 5,
      'editor': 4,
      'contributor': 3,
      'contractor': 2,
      'viewer': 1
    };
    return hierarchy[role] || 0;
  };

  // Static method to invite team member
  ProjectTeam.inviteMember = async function(projectId, userId, role, invitedBy, options = {}) {
    const { sequelize } = this;
    const transaction = options.transaction || await sequelize.transaction();
    
    try {
      // Check if user is already a team member
      const existingMember = await ProjectTeam.findOne({
        where: { projectId, userId },
        transaction
      });
      
      if (existingMember) {
        // Update existing invitation
        if (existingMember.invitationStatus === 'rejected' || existingMember.invitationStatus === 'revoked') {
          existingMember.invitationStatus = 'pending';
          existingMember.role = role;
          existingMember.invitedBy = invitedBy;
          existingMember.invitationToken = options.invitationToken || null;
          existingMember.invitationExpiresAt = options.expiresAt || null;
          existingMember.isActive = true;
          await existingMember.save({ transaction });
        }
        return existingMember;
      }
      
      // Create new invitation
      const invitationToken = options.invitationToken || 
        `${projectId}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const projectTeam = await ProjectTeam.create({
        projectId,
        userId,
        role,
        invitedBy,
        invitationStatus: 'pending',
        invitationToken,
        invitationExpiresAt: options.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
        isActive: true,
        permissions: ProjectTeam.getDefaultPermissions(role)
      }, { transaction });
      
      if (!options.transaction) await transaction.commit();
      return projectTeam;
    } catch (error) {
      if (!options.transaction) await transaction.rollback();
      throw error;
    }
  };

  return ProjectTeam;
};