// backend/services/projectManagementService.js

/**
 * 🏗️ Yachi Project Management Service
 * Handles project lifecycle, task management, collaboration, and delivery tracking
 */

const { Sequelize, Op } = require('sequelize');
const { User, Project, Task, ProjectMember, ProjectDocument, ProjectMilestone, Transaction, Notification } = require('../models');
const { YachiNotifications } = require('./yachiNotifications');
const { YachiAnalytics } = require('./yachiAnalytics');
const { YachiGamification } = require('./yachiGamification');
const { MediaService } = require('./mediaService');
const redis = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');

// 🎯 PROJECT SCHEMAS
const ProjectSchema = {
  createProject: z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
    serviceId: z.number().int().positive(),
    budget: z.number().positive(),
    currency: z.enum(['KES', 'USD', 'EUR']).default('KES'),
    timeline: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      milestones: z.array(z.object({
        title: z.string(),
        dueDate: z.string().datetime(),
        amount: z.number().positive()
      })).optional()
    }),
    requirements: z.array(z.string()).optional(),
    skillsRequired: z.array(z.string()).min(1),
    location: z.object({
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      remote: z.boolean().default(false)
    }).optional(),
    attachments: z.array(z.string()).optional()
  }),

  updateProject: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    budget: z.number().positive().optional(),
    timeline: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      extendedReason: z.string().optional()
    }).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
  }),

  createTask: z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(1000).optional(),
    projectId: z.number().int().positive(),
    assigneeId: z.number().int().positive().optional(),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    estimatedHours: z.number().positive().optional(),
    dependencies: z.array(z.number().int().positive()).optional()
  }),

  inviteMember: z.object({
    userId: z.number().int().positive(),
    role: z.enum(['owner', 'manager', 'collaborator', 'viewer']),
    permissions: z.array(z.enum([
      'view_project',
      'edit_project',
      'manage_tasks',
      'manage_budget',
      'upload_files',
      'invite_members',
      'approve_milestones'
    ])).optional()
  }),

  submitMilestone: z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(1000).optional(),
    deliverables: z.array(z.object({
      title: z.string(),
      type: z.enum(['file', 'link', 'text']),
      url: z.string().url().optional(),
      content: z.string().optional()
    })).min(1),
    notes: z.string().optional()
  }),

  reviewMilestone: z.object({
    status: z.enum(['approved', 'rejected', 'needs_revision']),
    feedback: z.string().max(1000).optional(),
    rating: z.number().min(1).max(5).optional(),
    revisionNotes: z.array(z.string()).optional()
  }),

  projectSearch: z.object({
    query: z.string().max(100).optional(),
    status: z.array(z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])).optional(),
    skills: z.array(z.string()).optional(),
    minBudget: z.number().positive().optional(),
    maxBudget: z.number().positive().optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number().positive().default(50)
    }).optional(),
    remoteOnly: z.boolean().default(false),
    featured: z.boolean().optional(),
    clientRating: z.number().min(1).max(5).optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20)
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  PROJECT: (projectId) => `project:${projectId}`,
  PROJECT_TASKS: (projectId) => `project:${projectId}:tasks`,
  PROJECT_MEMBERS: (projectId) => `project:${projectId}:members`,
  PROJECT_TIMELINE: (projectId) => `project:${projectId}:timeline`,
  USER_PROJECTS: (userId) => `user:${userId}:projects`,
  PROJECT_ANALYTICS: (projectId) => `project:${projectId}:analytics`
};

class ProjectManagementService {
  constructor() {
    this.projectCacheTTL = 300; // 5 minutes
    this.taskCacheTTL = 180; // 3 minutes
  }

  // 🚀 CREATE PROJECT
  async createProject(clientId, projectData) {
    const transaction = await sequelize.transaction();
    
    try {
      const validatedData = ProjectSchema.createProject.parse(projectData);
      
      // Generate project code
      const projectCode = `PRJ-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Create project
      const project = await Project.create({
        projectCode,
        clientId,
        serviceId: validatedData.serviceId,
        title: validatedData.title,
        description: validatedData.description,
        budget: validatedData.budget,
        currency: validatedData.currency,
        timeline: validatedData.timeline,
        requirements: validatedData.requirements,
        skillsRequired: validatedData.skillsRequired,
        location: validatedData.location,
        status: 'planning',
        metadata: {
          attachments: validatedData.attachments,
          createdVia: 'direct',
          ipAddress: null, // Would be available in request context
          userAgent: null
        }
      }, { transaction });

      // Add client as project owner
      await ProjectMember.create({
        projectId: project.id,
        userId: clientId,
        role: 'owner',
        permissions: ['view_project', 'edit_project', 'manage_tasks', 'manage_budget', 'upload_files', 'invite_members', 'approve_milestones'],
        joinedAt: new Date(),
        status: 'active'
      }, { transaction });

      // Create milestones if provided
      if (validatedData.timeline.milestones && validatedData.timeline.milestones.length > 0) {
        const milestones = await ProjectMilestone.bulkCreate(
          validatedData.timeline.milestones.map((milestone, index) => ({
            projectId: project.id,
            title: milestone.title,
            description: `${milestone.title} milestone`,
            dueDate: milestone.dueDate,
            amount: milestone.amount,
            sequence: index + 1,
            status: 'pending'
          })),
          { transaction }
        );

        // Create escrow transaction for first milestone
        if (milestones.length > 0) {
          await this.createEscrowTransaction(clientId, project.id, milestones[0].id, milestones[0].amount);
        }
      }

      await transaction.commit();

      // Clear cache
      await this.clearProjectCaches(project.id, clientId);

      // Send notifications
      await YachiNotifications.sendProjectCreated(project.id, clientId);

      // Track analytics
      await YachiAnalytics.trackProjectCreation(clientId, project.id);

      return {
        success: true,
        message: 'Project created successfully',
        data: {
          project,
          nextSteps: ['invite_members', 'define_tasks', 'setup_milestones']
        }
      };

    } catch (error) {
      await transaction.rollback();
      
      if (error instanceof z.ZodError) {
        throw {
          success: false,
          message: 'Validation failed',
          errors: error.errors,
          code: 'VALIDATION_ERROR'
        };
      }
      
      console.error('Create Project Error:', error);
      throw {
        success: false,
        message: 'Failed to create project',
        code: 'PROJECT_CREATION_FAILED'
      };
    }
  }

  // 🚀 INVITE PROJECT MEMBERS
  async inviteProjectMember(projectId, inviterId, memberData) {
    const transaction = await sequelize.transaction();
    
    try {
      const validatedData = ProjectSchema.inviteMember.parse(memberData);
      
      // Check project exists and inviter has permission
      const project = await Project.findByPk(projectId);
      if (!project) {
        throw {
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        };
      }

      const inviter = await ProjectMember.findOne({
        where: { projectId, userId: inviterId, status: 'active' }
      });

      if (!inviter || !inviter.permissions.includes('invite_members')) {
        throw {
          success: false,
          message: 'You do not have permission to invite members',
          code: 'PERMISSION_DENIED'
        };
      }

      // Check if user is already a member
      const existingMember = await ProjectMember.findOne({
        where: { projectId, userId: validatedData.userId }
      });

      if (existingMember) {
        throw {
          success: false,
          message: 'User is already a project member',
          code: 'MEMBER_EXISTS'
        };
      }

      // Create invitation
      const invitation = await ProjectMember.create({
        projectId,
        userId: validatedData.userId,
        role: validatedData.role,
        permissions: validatedData.permissions || this.getDefaultPermissions(validatedData.role),
        invitedBy: inviterId,
        invitationToken: uuidv4(),
        status: 'invited',
        invitedAt: new Date()
      }, { transaction });

      await transaction.commit();

      // Clear cache
      await this.clearProjectCaches(projectId, validatedData.userId);

      // Send invitation notification
      await YachiNotifications.sendProjectInvitation(
        validatedData.userId,
        projectId,
        inviterId,
        invitation.invitationToken
      );

      return {
        success: true,
        message: 'Invitation sent successfully',
        data: {
          invitation,
          project: {
            id: project.id,
            title: project.title
          }
        }
      };

    } catch (error) {
      await transaction.rollback();
      
      if (error.code) {
        throw error;
      }
      
      console.error('Invite Member Error:', error);
      throw {
        success: false,
        message: 'Failed to invite member',
        code: 'INVITATION_FAILED'
      };
    }
  }

  // 🚀 CREATE TASK
  async createTask(creatorId, taskData) {
    const transaction = await sequelize.transaction();
    
    try {
      const validatedData = ProjectSchema.createTask.parse(taskData);
      
      // Verify creator has permission
      const projectMember = await ProjectMember.findOne({
        where: { 
          projectId: validatedData.projectId, 
          userId: creatorId,
          status: 'active'
        }
      });

      if (!projectMember || !projectMember.permissions.includes('manage_tasks')) {
        throw {
          success: false,
          message: 'You do not have permission to create tasks',
          code: 'PERMISSION_DENIED'
        };
      }

      // Generate task code
      const taskCode = `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Create task
      const task = await Task.create({
        taskCode,
        projectId: validatedData.projectId,
        title: validatedData.title,
        description: validatedData.description,
        creatorId,
        assigneeId: validatedData.assigneeId,
        dueDate: validatedData.dueDate,
        priority: validatedData.priority,
        estimatedHours: validatedData.estimatedHours,
        status: 'todo',
        metadata: {
          dependencies: validatedData.dependencies,
          createdAt: new Date().toISOString()
        }
      }, { transaction });

      // If assignee is specified, notify them
      if (validatedData.assigneeId) {
        await YachiNotifications.sendTaskAssignment(
          validatedData.assigneeId,
          task.id,
          projectMember.projectId,
          creatorId
        );
      }

      await transaction.commit();

      // Clear cache
      await this.clearProjectCaches(validatedData.projectId);

      return {
        success: true,
        message: 'Task created successfully',
        data: {
          task,
          nextSteps: validatedData.assigneeId ? ['task_assigned'] : ['assign_task', 'set_dependencies']
        }
      };

    } catch (error) {
      await transaction.rollback();
      
      if (error.code) {
        throw error;
      }
      
      console.error('Create Task Error:', error);
      throw {
        success: false,
        message: 'Failed to create task',
        code: 'TASK_CREATION_FAILED'
      };
    }
  }

  // 🚀 SUBMIT MILESTONE
  async submitMilestone(projectId, milestoneId, submitterId, milestoneData) {
    const transaction = await sequelize.transaction();
    
    try {
      const validatedData = ProjectSchema.submitMilestone.parse(milestoneData);
      
      // Verify submitter has permission
      const milestone = await ProjectMilestone.findOne({
        where: { id: milestoneId, projectId, status: 'pending' }
      });

      if (!milestone) {
        throw {
          success: false,
          message: 'Milestone not found or already submitted',
          code: 'MILESTONE_NOT_FOUND'
        };
      }

      const submitter = await ProjectMember.findOne({
        where: { 
          projectId, 
          userId: submitterId,
          status: 'active'
        }
      });

      if (!submitter) {
        throw {
          success: false,
          message: 'You are not a project member',
          code: 'NOT_A_MEMBER'
        };
      }

      // Update milestone
      await milestone.update({
        status: 'submitted',
        submittedAt: new Date(),
        submittedBy: submitterId,
        deliverables: validatedData.deliverables,
        notes: validatedData.notes,
        metadata: {
          submissionData: validatedData,
          submittedVia: 'direct'
        }
      }, { transaction });

      // Create project documents for deliverables
      const documents = await Promise.all(
        validatedData.deliverables.map(async (deliverable, index) => {
          return ProjectDocument.create({
            projectId,
            milestoneId,
            title: deliverable.title,
            description: `${milestone.title} - Deliverable ${index + 1}`,
            type: deliverable.type,
            url: deliverable.url,
            content: deliverable.content,
            uploadedBy: submitterId,
            status: 'pending_review'
          }, { transaction });
        })
      );

      await transaction.commit();

      // Clear cache
      await this.clearProjectCaches(projectId);

      // Notify project owners for review
      await YachiNotifications.sendMilestoneSubmitted(projectId, milestoneId, submitterId);

      // Award points for milestone submission
      await YachiGamification.awardMilestoneSubmission(submitterId, projectId, milestone.sequence);

      return {
        success: true,
        message: 'Milestone submitted successfully',
        data: {
          milestone,
          documents,
          nextSteps: ['awaiting_review']
        }
      };

    } catch (error) {
      await transaction.rollback();
      
      if (error.code) {
        throw error;
      }
      
      console.error('Submit Milestone Error:', error);
      throw {
        success: false,
        message: 'Failed to submit milestone',
        code: 'MILESTONE_SUBMISSION_FAILED'
      };
    }
  }

  // 🚀 REVIEW MILESTONE
  async reviewMilestone(projectId, milestoneId, reviewerId, reviewData) {
    const transaction = await sequelize.transaction();
    
    try {
      const validatedData = ProjectSchema.reviewMilestone.parse(reviewData);
      
      // Verify reviewer has permission
      const milestone = await ProjectMilestone.findOne({
        where: { id: milestoneId, projectId, status: 'submitted' }
      });

      if (!milestone) {
        throw {
          success: false,
          message: 'Milestone not found or not submitted',
          code: 'MILESTONE_NOT_FOUND'
        };
      }

      const reviewer = await ProjectMember.findOne({
        where: { 
          projectId, 
          userId: reviewerId,
          status: 'active'
        }
      });

      if (!reviewer || !reviewer.permissions.includes('approve_milestones')) {
        throw {
          success: false,
          message: 'You do not have permission to review milestones',
          code: 'PERMISSION_DENIED'
        };
      }

      // Update milestone
      const updateData = {
        status: validatedData.status,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        feedback: validatedData.feedback,
        rating: validatedData.rating
      };

      if (validatedData.status === 'approved') {
        updateData.approvedAt = new Date();
        updateData.paymentStatus = 'pending_release';
      } else if (validatedData.status === 'needs_revision') {
        updateData.revisionNotes = validatedData.revisionNotes;
        updateData.status = 'needs_revision';
      }

      await milestone.update(updateData, { transaction });

      // Update project documents status
      await ProjectDocument.update(
        { 
          status: validatedData.status === 'approved' ? 'approved' : 'needs_revision',
          reviewedBy: reviewerId,
          reviewedAt: new Date()
        },
        { 
          where: { milestoneId },
          transaction 
        }
      );

      // Process payment if approved
      if (validatedData.status === 'approved') {
        await this.processMilestonePayment(milestone, reviewerId, transaction);
      }

      await transaction.commit();

      // Clear cache
      await this.clearProjectCaches(projectId);

      // Send notifications
      if (milestone.submittedBy) {
        await YachiNotifications.sendMilestoneReviewed(
          milestone.submittedBy,
          projectId,
          milestoneId,
          validatedData.status,
          validatedData.feedback
        );
      }

      // Award points based on review
      if (milestone.submittedBy && validatedData.status === 'approved') {
        await YachiGamification.awardMilestoneCompletion(
          milestone.submittedBy,
          projectId,
          milestone.sequence
        );
      }

      return {
        success: true,
        message: `Milestone ${validatedData.status}`,
        data: {
          milestone,
          review: validatedData,
          nextSteps: validatedData.status === 'approved' ? 
            ['release_payment', 'start_next_milestone'] : 
            ['request_revisions', 'resubmit_milestone']
        }
      };

    } catch (error) {
      await transaction.rollback();
      
      if (error.code) {
        throw error;
      }
      
      console.error('Review Milestone Error:', error);
      throw {
        success: false,
        message: 'Failed to review milestone',
        code: 'MILESTONE_REVIEW_FAILED'
      };
    }
  }

  // 🚀 GET PROJECT DETAILS
  async getProjectDetails(projectId, userId) {
    try {
      const cacheKey = CACHE_KEYS.PROJECT(projectId);
      const cached = await redis.get(cacheKey);

      if (cached) {
        return {
          success: true,
          data: JSON.parse(cached),
          source: 'cache'
        };
      }

      // Verify user has access to project
      const member = await ProjectMember.findOne({
        where: { projectId, userId, status: 'active' }
      });

      if (!member) {
        throw {
          success: false,
          message: 'You do not have access to this project',
          code: 'ACCESS_DENIED'
        };
      }

      const project = await Project.findByPk(projectId, {
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'name', 'avatar', 'rating']
          },
          {
            model: ProjectMember,
            as: 'members',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'avatar', 'role', 'skills']
            }]
          },
          {
            model: Task,
            as: 'tasks',
            order: [['priority', 'DESC'], ['createdAt', 'DESC']],
            limit: 50
          },
          {
            model: ProjectMilestone,
            as: 'milestones',
            order: [['sequence', 'ASC']]
          },
          {
            model: ProjectDocument,
            as: 'documents',
            order: [['createdAt', 'DESC']],
            limit: 20
          }
        ]
      });

      if (!project) {
        throw {
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        };
      }

      // Calculate project statistics
      const stats = await this.calculateProjectStats(projectId);

      const enhancedProject = {
        ...project.toJSON(),
        stats,
        permissions: member.permissions,
        role: member.role,
        timelineProgress: this.calculateTimelineProgress(project),
        budgetUtilization: this.calculateBudgetUtilization(project)
      };

      // Cache for 5 minutes
      await redis.setex(cacheKey, this.projectCacheTTL, JSON.stringify(enhancedProject));

      return {
        success: true,
        data: enhancedProject,
        source: 'database'
      };

    } catch (error) {
      if (error.code) {
        throw error;
      }
      
      console.error('Get Project Details Error:', error);
      throw {
        success: false,
        message: 'Failed to fetch project details',
        code: 'FETCH_PROJECT_FAILED'
      };
    }
  }

  // 🚀 SEARCH PROJECTS
  async searchProjects(searchParams) {
    try {
      const validatedParams = ProjectSchema.projectSearch.parse(searchParams);
      
      const cacheKey = CACHE_KEYS.PROJECT_SEARCH(validatedParams);
      const cached = await redis.get(cacheKey);

      if (cached) {
        return {
          success: true,
          data: JSON.parse(cached),
          source: 'cache'
        };
      }

      const where = {
        status: { [Op.not]: 'cancelled' }
      };

      // Apply filters
      if (validatedParams.status) {
        where.status = { [Op.in]: validatedParams.status };
      }

      if (validatedParams.query) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${validatedParams.query}%` } },
          { description: { [Op.iLike]: `%${validatedParams.query}%` } }
        ];
      }

      if (validatedParams.skills && validatedParams.skills.length > 0) {
        where.skillsRequired = { [Op.overlap]: validatedParams.skills };
      }

      if (validatedParams.minBudget || validatedParams.maxBudget) {
        where.budget = {};
        if (validatedParams.minBudget) where.budget[Op.gte] = validatedParams.minBudget;
        if (validatedParams.maxBudget) where.budget[Op.lte] = validatedParams.maxBudget;
      }

      if (validatedParams.remoteOnly) {
        where['$location.remote$'] = true;
      }

      if (validatedParams.featured) {
        where.featured = true;
      }

      const [projects, total] = await Promise.all([
        Project.findAll({
          where,
          include: [
            {
              model: User,
              as: 'client',
              attributes: ['id', 'name', 'avatar', 'rating']
            },
            {
              model: ProjectMilestone,
              as: 'milestones',
              attributes: ['status'],
              where: { status: 'pending' },
              required: false
            }
          ],
          attributes: [
            'id', 'projectCode', 'title', 'description', 'budget', 'currency',
            'status', 'skillsRequired', 'location', 'createdAt', 'timeline'
          ],
          order: this.buildProjectSearchOrder(validatedParams),
          limit: validatedParams.limit,
          offset: (validatedParams.page - 1) * validatedParams.limit
        }),
        Project.count({ where })
      ]);

      const enhancedProjects = await Promise.all(
        projects.map(async (project) => {
          const stats = await this.calculateProjectStats(project.id);
          return {
            ...project.toJSON(),
            stats,
            applicationCount: await this.getProjectApplicationCount(project.id)
          };
        })
      );

      const result = {
        projects: enhancedProjects,
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total,
          pages: Math.ceil(total / validatedParams.limit)
        },
        filters: validatedParams
      };

      // Cache for 3 minutes
      await redis.setex(cacheKey, 180, JSON.stringify(result));

      return {
        success: true,
        data: result,
        source: 'database'
      };

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw {
          success: false,
          message: 'Validation failed',
          errors: error.errors,
          code: 'VALIDATION_ERROR'
        };
      }
      
      console.error('Search Projects Error:', error);
      throw {
        success: false,
        message: 'Failed to search projects',
        code: 'PROJECT_SEARCH_FAILED'
      };
    }
  }

  // 🚀 CALCULATE PROJECT STATISTICS
  async calculateProjectStats(projectId) {
    const [
      taskStats,
      milestoneStats,
      memberStats,
      timeStats
    ] = await Promise.all([
      // Task Statistics
      Task.findAll({
        where: { projectId },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalTasks'],
          [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN status = "completed" THEN 1 ELSE 0 END')), 'completedTasks'],
          [Sequelize.fn('AVG', Sequelize.literal('CASE WHEN estimatedHours IS NOT NULL THEN estimatedHours ELSE 0 END')), 'averageEstimatedHours']
        ],
        raw: true
      }),

      // Milestone Statistics
      ProjectMilestone.findAll({
        where: { projectId },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalMilestones'],
          [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN status = "approved" THEN amount ELSE 0 END')), 'approvedAmount'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount']
        ],
        raw: true
      }),

      // Member Statistics
      ProjectMember.findAll({
        where: { projectId, status: 'active' },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalMembers'],
          [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN role = "collaborator" THEN 1 ELSE 0 END')), 'collaborators'],
          [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN role = "viewer" THEN 1 ELSE 0 END')), 'viewers']
        ],
        raw: true
      }),

      // Time Statistics
      this.calculateProjectTimeStats(projectId)
    ]);

    return {
      tasks: {
        total: parseInt(taskStats[0]?.totalTasks) || 0,
        completed: parseInt(taskStats[0]?.completedTasks) || 0,
        completionRate: parseInt(taskStats[0]?.totalTasks) > 0 ? 
          (parseInt(taskStats[0]?.completedTasks) / parseInt(taskStats[0]?.totalTasks)) * 100 : 0,
        averageEstimatedHours: parseFloat(taskStats[0]?.averageEstimatedHours) || 0
      },
      milestones: {
        total: parseInt(milestoneStats[0]?.totalMilestones) || 0,
        approvedAmount: parseFloat(milestoneStats[0]?.approvedAmount) || 0,
        totalAmount: parseFloat(milestoneStats[0]?.totalAmount) || 0,
        utilizationRate: parseFloat(milestoneStats[0]?.totalAmount) > 0 ? 
          (parseFloat(milestoneStats[0]?.approvedAmount) / parseFloat(milestoneStats[0]?.totalAmount)) * 100 : 0
      },
      members: {
        total: parseInt(memberStats[0]?.totalMembers) || 0,
        collaborators: parseInt(memberStats[0]?.collaborators) || 0,
        viewers: parseInt(memberStats[0]?.viewers) || 0,
        activePercentage: 100 // Would calculate based on activity
      },
      timeline: timeStats
    };
  }

  // 🚀 UTILITY METHODS

  async createEscrowTransaction(clientId, projectId, milestoneId, amount) {
    // Implementation for escrow transaction creation
    // This would integrate with your payment service
    return Transaction.create({
      clientId,
      projectId,
      milestoneId,
      amount,
      type: 'escrow',
      status: 'pending',
      metadata: {
        purpose: 'milestone_escrow',
        autoRelease: true
      }
    });
  }

  async processMilestonePayment(milestone, reviewerId, transaction) {
    // Implementation for milestone payment processing
    // This would release funds from escrow to worker
    const escrowTransaction = await Transaction.findOne({
      where: {
        milestoneId: milestone.id,
        type: 'escrow',
        status: 'pending'
      },
      transaction
    });

    if (escrowTransaction) {
      await escrowTransaction.update({
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          ...escrowTransaction.metadata,
          releasedBy: reviewerId,
          releasedAt: new Date().toISOString()
        }
      }, { transaction });
    }

    // Create payment transaction for worker
    if (milestone.submittedBy) {
      await Transaction.create({
        providerId: milestone.submittedBy,
        projectId: milestone.projectId,
        milestoneId: milestone.id,
        amount: milestone.amount,
        type: 'payout',
        status: 'pending',
        metadata: {
          purpose: 'milestone_payment',
          milestoneSequence: milestone.sequence
        }
      }, { transaction });
    }
  }

  calculateTimelineProgress(project) {
    if (!project.timeline || !project.timeline.startDate || !project.timeline.endDate) {
      return 0;
    }

    const start = new Date(project.timeline.startDate);
    const end = new Date(project.timeline.endDate);
    const now = new Date();

    if (now < start) return 0;
    if (now > end) return 100;

    const totalDuration = end - start;
    const elapsed = now - start;
    
    return Math.round((elapsed / totalDuration) * 100);
  }

  calculateBudgetUtilization(project) {
    // Calculate based on approved milestones
    return 0; // Implement based on your business logic
  }

  async calculateProjectTimeStats(projectId) {
    // Calculate time-based statistics
    return {
      estimatedCompletion: null,
      daysBehindSchedule: 0,
      velocity: 0
    };
  }

  async getProjectApplicationCount(projectId) {
    // Get count of applications for this project
    return 0; // Implement based on your application system
  }

  getDefaultPermissions(role) {
    const permissionMap = {
      owner: ['view_project', 'edit_project', 'manage_tasks', 'manage_budget', 'upload_files', 'invite_members', 'approve_milestones'],
      manager: ['view_project', 'edit_project', 'manage_tasks', 'upload_files', 'invite_members'],
      collaborator: ['view_project', 'manage_tasks', 'upload_files'],
      viewer: ['view_project']
    };

    return permissionMap[role] || permissionMap.viewer;
  }

  buildProjectSearchOrder(params) {
    const order = [];

    if (params.query) {
      order.push([{ _relevance: { fields: ['title', 'description'], search: params.query, sort: 'desc' } }]);
    }

    order.push(['createdAt', 'DESC']);
    order.push(['budget', 'DESC']);

    return order;
  }

  async clearProjectCaches(projectId, ...userIds) {
    const cacheKeys = [
      CACHE_KEYS.PROJECT(projectId),
      CACHE_KEYS.PROJECT_TASKS(projectId),
      CACHE_KEYS.PROJECT_MEMBERS(projectId),
      CACHE_KEYS.PROJECT_TIMELINE(projectId),
      CACHE_KEYS.PROJECT_ANALYTICS(projectId)
    ];

    // Clear user-specific caches
    userIds.forEach(userId => {
      cacheKeys.push(CACHE_KEYS.USER_PROJECTS(userId));
    });

    await Promise.all(
      cacheKeys.map(key => redis.del(key).catch(() => {}))
    );
  }

  // 🚀 PROJECT ANALYTICS
  async getProjectAnalytics(projectId) {
    try {
      const cacheKey = CACHE_KEYS.PROJECT_ANALYTICS(projectId);
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const [
        activityLogs,
        memberActivity,
        taskCompletionRate,
        milestoneProgress,
        communicationStats,
        budgetAnalysis
      ] = await Promise.all([
        this.getProjectActivityLogs(projectId),
        this.getMemberActivity(projectId),
        this.calculateTaskCompletionRate(projectId),
        this.calculateMilestoneProgress(projectId),
        this.getCommunicationStats(projectId),
        this.analyzeBudget(projectId)
      ]);

      const analytics = {
        overview: {
          totalActivity: activityLogs.length,
          activeMembers: memberActivity.filter(m => m.activityScore > 0).length,
          taskCompletionRate,
          milestoneProgress,
          communicationVolume: communicationStats.totalMessages,
          budgetHealth: budgetAnalysis.healthScore
        },
        activity: activityLogs,
        members: memberActivity,
        tasks: taskCompletionRate,
        milestones: milestoneProgress,
        communication: communicationStats,
        budget: budgetAnalysis,
        recommendations: this.generateProjectRecommendations({
          taskCompletionRate,
          milestoneProgress,
          budgetAnalysis,
          communicationStats
        })
      };

      // Cache for 10 minutes
      await redis.setex(cacheKey, 600, JSON.stringify(analytics));

      return analytics;

    } catch (error) {
      console.error('Get Project Analytics Error:', error);
      return {};
    }
  }

  async getProjectActivityLogs(projectId, limit = 50) {
    // Implementation would query your activity log table
    return [];
  }

  async getMemberActivity(projectId) {
    // Implementation would calculate member activity scores
    return [];
  }

  calculateTaskCompletionRate(projectId) {
    // Implementation would calculate task completion metrics
    return {
      rate: 0,
      trend: 'stable',
      predictedCompletion: null
    };
  }

  calculateMilestoneProgress(projectId) {
    // Implementation would calculate milestone progress
    return {
      completed: 0,
      total: 0,
      onTrack: true,
      delays: []
    };
  }

  getCommunicationStats(projectId) {
    // Implementation would get chat/message statistics
    return {
      totalMessages: 0,
      averageResponseTime: 0,
      activeThreads: 0
    };
  }

  analyzeBudget(projectId) {
    // Implementation would analyze budget utilization
    return {
      totalBudget: 0,
      utilized: 0,
      remaining: 0,
      healthScore: 100,
      recommendations: []
    };
  }

  generateProjectRecommendations(analytics) {
    const recommendations = [];

    if (analytics.taskCompletionRate.rate < 50) {
      recommendations.push({
        type: 'task_completion',
        priority: 'high',
        message: 'Task completion rate is low. Consider reassigning tasks or providing additional resources.',
        action: 'review_task_assignments'
      });
    }

    if (analytics.milestoneProgress.onTrack === false) {
      recommendations.push({
        type: 'timeline',
        priority: 'high',
        message: 'Project is behind schedule. Consider adjusting timelines or increasing resources.',
        action: 'update_timeline'
      });
    }

    if (analytics.budgetAnalysis.healthScore < 70) {
      recommendations.push({
        type: 'budget',
        priority: 'medium',
        message: 'Budget utilization is high. Monitor expenses closely.',
        action: 'review_budget'
      });
    }

    return recommendations;
  }
}

// 🎯 CACHE KEY FOR SEARCH
CACHE_KEYS.PROJECT_SEARCH = (params) => 
  `project:search:${Buffer.from(JSON.stringify(params)).toString('base64')}`;

module.exports = new ProjectManagementService();