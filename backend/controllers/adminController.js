/**
 * Yachi - Enterprise Admin Controller
 * Comprehensive Administration System for Ethiopian Service Marketplace & Construction Platform
 * @version 1.0.0
 */

const { Sequelize, Op } = require('sequelize');
const { performance } = require('perf_hooks');
const { validationResult } = require('express-validator');

// Import Enterprise Models
const { 
  User, Service, Booking, Transaction, Review, Report, 
  AdminLog, PlatformStats, VerificationRequest, Dispute,
  ConstructionProject, GovernmentProject, WorkerAssignment,
  PaymentGateway, Notification, SecurityLog, AnalyticsEvent
} = require('../models');

// Import Enterprise Services
const { YachiLogger } = require('../utils/logger');
const { redisManager, redisUtils } = require('../config/redis');
const { securityManager } = require('../utils/security');
const { YachiAI } = require('../services/yachiAI');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiNotifications } = require('../services/yachiNotifications');
const { emailService, smsService } = require('../services');

/**
 * Enterprise Admin Controller
 * Comprehensive administration system with AI-powered insights and Ethiopian market focus
 */
class AdminController {
  constructor() {
    this.adminRoles = ['super_admin', 'admin', 'moderator', 'support', 'government_admin'];
    this.sensitiveFields = ['password', 'twoFactorSecret', 'resetToken', 'faydaId', 'bankDetails'];
    this.performanceMetrics = new Map();
    
    // Initialize admin systems
    this.initializeAdminSystems();
  }

  /**
   * Initialize admin systems and scheduled tasks
   */
  async initializeAdminSystems() {
    try {
      YachiLogger.info('🚀 Initializing Yachi Admin Systems...');

      // Setup daily statistics collection
      this.setupDailyStatsCollection();

      // Setup real-time monitoring
      this.setupRealTimeMonitoring();

      // Setup automated reports
      this.setupAutomatedReports();

      // Setup security monitoring
      this.setupSecurityMonitoring();

      YachiLogger.info('✅ Yachi Admin Systems initialized successfully');

    } catch (error) {
      YachiLogger.error('❌ Admin systems initialization failed:', error);
      throw error;
    }
  }

  /**
   * 📊 Get Comprehensive Platform Dashboard
   */
  getDashboard = async (req, res) => {
    const startTime = performance.now();

    try {
      YachiLogger.info('📊 Admin dashboard requested', {
        adminId: req.user.id,
        userAgent: req.headers['user-agent']
      });

      // Validate admin permissions
      await this.validateAdminAccess(req.user, 'dashboard_view');

      const cacheKey = `admin:dashboard:${new Date().toISOString().split('T')[0]}`;
      const cachedDashboard = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey,
        null,
        { ttl: 900 } // 15 minutes cache
      );

      if (cachedDashboard) {
        return this.sendSuccessResponse(res, 200, {
          message: 'Dashboard data retrieved successfully',
          data: cachedDashboard,
          source: 'cache',
          processing_time: performance.now() - startTime
        });
      }

      // Calculate comprehensive dashboard statistics
      const dashboardData = await this.calculateComprehensiveDashboard();

      // Cache the dashboard data
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        dashboardData,
        { ttl: 900 }
      );

      // Log dashboard access
      await this.logAdminAction(req.user.id, 'dashboard_view', 'system', null, {
        processing_time: performance.now() - startTime,
        data_points: Object.keys(dashboardData).length
      });

      return this.sendSuccessResponse(res, 200, {
        message: 'Dashboard data calculated successfully',
        data: dashboardData,
        source: 'database',
        processing_time: performance.now() - startTime
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ Admin dashboard error:', {
        error: error.message,
        adminId: req.user.id,
        processingTime
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'DASHBOARD_ERROR',
        error.message || 'Failed to retrieve dashboard data'
      );
    }
  };

  /**
   * 👥 Advanced User Management with AI Insights
   */
  getUsers = async (req, res) => {
    const startTime = performance.now();

    try {
      YachiLogger.info('👥 Admin users list requested', {
        adminId: req.user.id,
        filters: req.query
      });

      // Validate admin permissions
      await this.validateAdminAccess(req.user, 'user_management');

      const {
        role,
        status,
        verification,
        dateFrom,
        dateTo,
        search,
        region,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      // Generate cache key based on query parameters
      const queryHash = await securityManager.hashData(JSON.stringify(req.query));
      const cacheKey = `admin:users:${queryHash}`;

      const cachedUsers = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey,
        null,
        { ttl: 300 } // 5 minutes cache
      );

      if (cachedUsers) {
        return this.sendSuccessResponse(res, 200, {
          message: 'Users list retrieved successfully',
          ...cachedUsers,
          source: 'cache',
          processing_time: performance.now() - startTime
        });
      }

      // Build advanced where clause
      const whereClause = this.buildUserWhereClause({
        role, status, verification, dateFrom, dateTo, search, region
      });

      // Execute query with performance monitoring
      const users = await User.findAndCountAll({
        where: whereClause,
        attributes: {
          exclude: this.sensitiveFields,
          include: [
            [Sequelize.literal('(SELECT COUNT(*) FROM services WHERE services.providerId = User.id)'), 'serviceCount'],
            [Sequelize.literal('(SELECT COUNT(*) FROM bookings WHERE bookings.clientId = User.id)'), 'bookingCount'],
            [Sequelize.literal('(SELECT AVG(rating) FROM reviews WHERE reviews.targetId = User.id)'), 'averageRating']
          ]
        },
        include: [
          {
            model: Service,
            as: 'services',
            attributes: ['id', 'title', 'status', 'category'],
            required: false,
            limit: 5
          },
          {
            model: Booking,
            as: 'bookings',
            attributes: ['id', 'status', 'totalAmount'],
            required: false,
            limit: 5
          },
          {
            model: VerificationRequest,
            as: 'verificationRequests',
            attributes: ['id', 'documentType', 'status', 'createdAt'],
            required: false,
            order: [['createdAt', 'DESC']],
            limit: 3
          }
        ],
        order: this.buildSortOrder(sortBy, sortOrder),
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        subQuery: false
      });

      // Generate AI insights for user behavior
      const aiInsights = await this.generateUserAIInsights(users.rows);

      const result = {
        users: users.rows.map(user => this.sanitizeUserForAdmin(user)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: users.count,
          pages: Math.ceil(users.count / parseInt(limit))
        },
        filters: {
          role,
          status,
          verification,
          dateFrom,
          dateTo,
          search,
          region
        },
        insights: aiInsights,
        summary: await this.generateUserSummary(whereClause)
      };

      // Cache the result
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        result,
        { ttl: 300 }
      );

      // Log user list access
      await this.logAdminAction(req.user.id, 'user_list_view', 'user', null, {
        filters: req.query,
        result_count: users.count,
        processing_time: performance.now() - startTime
      });

      return this.sendSuccessResponse(res, 200, {
        message: 'Users list retrieved successfully',
        ...result,
        source: 'database',
        processing_time: performance.now() - startTime
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ Admin users list error:', {
        error: error.message,
        adminId: req.user.id,
        processingTime
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'USER_LIST_ERROR',
        error.message || 'Failed to retrieve users list'
      );
    }
  };

  /**
   * 🔧 Advanced User Management Actions
   */
  manageUser = async (req, res) => {
    const startTime = performance.now();
    const transaction = await sequelize.transaction();

    try {
      const { userId } = req.params;
      const { action, reason, duration, metadata, notifyUser = true } = req.body;
      const adminId = req.user.id;

      YachiLogger.info('🔧 Admin user management action', {
        adminId,
        userId,
        action,
        reason: reason ? 'provided' : 'not_provided'
      });

      // Validate admin permissions for specific action
      await this.validateAdminAccess(req.user, `user_${action}`);

      // Get user with comprehensive data
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Service,
            as: 'services',
            attributes: ['id', 'title', 'status']
          },
          {
            model: Booking,
            as: 'bookings',
            attributes: ['id', 'status', 'totalAmount']
          }
        ],
        transaction
      });

      if (!user) {
        await transaction.rollback();
        return this.sendErrorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
      }

      // Validate action against user current state
      const validation = await this.validateUserAction(user, action, reason);
      if (!validation.valid) {
        await transaction.rollback();
        return this.sendErrorResponse(res, 400, 'ACTION_VALIDATION_FAILED', validation.message, validation.errors);
      }

      // Perform the admin action
      const actionResult = await this.executeUserAction(user, action, {
        reason,
        duration,
        metadata,
        adminId,
        transaction
      });

      // Log the admin action
      await AdminLog.create({
        adminId,
        action: `user_${action}`,
        targetType: 'user',
        targetId: userId,
        reason: securityManager.sanitizeInput(reason, 'string'),
        metadata: {
          ...actionResult.metadata,
          userDetails: {
            name: user.name,
            email: user.email,
            role: user.role,
            previousStatus: user.status
          },
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          processing_time: performance.now() - startTime
        }
      }, { transaction });

      // Notify user if requested
      if (notifyUser) {
        await this.notifyUserAboutAdminAction(user, action, reason, actionResult);
      }

      await transaction.commit();

      // Clear relevant caches
      await this.clearUserRelatedCaches(userId);

      YachiLogger.info('✅ User management action completed', {
        adminId,
        userId,
        action,
        success: true
      });

      return this.sendSuccessResponse(res, 200, {
        message: `User ${action} action completed successfully`,
        data: {
          action,
          userId,
          previousStatus: user.status,
          newStatus: actionResult.newStatus || user.status,
          userNotified: notifyUser,
          metadata: actionResult.metadata
        },
        processing_time: performance.now() - startTime
      });

    } catch (error) {
      await transaction.rollback();
      
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ User management action failed:', {
        error: error.message,
        adminId: req.user.id,
        userId: req.params.userId,
        action: req.body.action,
        processingTime
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'USER_MANAGEMENT_ERROR',
        error.message || 'Failed to perform user management action'
      );
    }
  };

  /**
   * 🏗️ Construction Project Management
   */
  getConstructionProjects = async (req, res) => {
    const startTime = performance.now();

    try {
      YachiLogger.info('🏗️ Admin construction projects requested', {
        adminId: req.user.id,
        filters: req.query
      });

      // Validate admin permissions
      await this.validateAdminAccess(req.user, 'construction_management');

      const {
        type,
        status,
        priority,
        dateFrom,
        dateTo,
        region,
        page = 1,
        limit = 50
      } = req.query;

      const cacheKey = `admin:construction:${await securityManager.hashData(JSON.stringify(req.query))}`;

      const cachedProjects = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey,
        null,
        { ttl: 600 } // 10 minutes cache
      );

      if (cachedProjects) {
        return this.sendSuccessResponse(res, 200, {
          message: 'Construction projects retrieved successfully',
          ...cachedProjects,
          source: 'cache',
          processing_time: performance.now() - startTime
        });
      }

      const whereClause = this.buildConstructionWhereClause({
        type, status, priority, dateFrom, dateTo, region
      });

      const projects = await ConstructionProject.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: WorkerAssignment,
            as: 'assignments',
            attributes: ['id', 'status', 'workerId'],
            include: [{
              model: User,
              as: 'worker',
              attributes: ['id', 'name', 'skills']
            }]
          },
          {
            model: GovernmentProject,
            as: 'governmentProject',
            attributes: ['id', 'name', 'budget', 'timeline'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      const result = {
        projects: projects.rows.map(project => this.sanitizeConstructionProject(project)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: projects.count,
          pages: Math.ceil(projects.count / parseInt(limit))
        },
        analytics: await this.generateConstructionAnalytics(whereClause),
        filters: { type, status, priority, dateFrom, dateTo, region }
      };

      // Cache the result
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        result,
        { ttl: 600 }
      );

      await this.logAdminAction(req.user.id, 'construction_projects_view', 'construction', null, {
        filters: req.query,
        result_count: projects.count
      });

      return this.sendSuccessResponse(res, 200, {
        message: 'Construction projects retrieved successfully',
        ...result,
        source: 'database',
        processing_time: performance.now() - startTime
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ Construction projects error:', {
        error: error.message,
        adminId: req.user.id,
        processingTime
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'CONSTRUCTION_PROJECTS_ERROR',
        error.message || 'Failed to retrieve construction projects'
      );
    }
  };

  /**
   * 💰 Advanced Financial Management
   */
  getFinancialReports = async (req, res) => {
    const startTime = performance.now();

    try {
      YachiLogger.info('💰 Admin financial reports requested', {
        adminId: req.user.id,
        reportType: req.query.type
      });

      // Validate admin permissions
      await this.validateAdminAccess(req.user, 'financial_management');

      const {
        period = 'month',
        dateFrom,
        dateTo,
        type = 'overview',
        currency = 'ETB'
      } = req.query;

      const cacheKey = `admin:financial:${type}:${period}:${currency}:${dateFrom}:${dateTo}`;

      const cachedReport = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey,
        null,
        { ttl: 900 } // 15 minutes cache
      );

      if (cachedReport) {
        return this.sendSuccessResponse(res, 200, {
          message: 'Financial report retrieved successfully',
          data: cachedReport,
          source: 'cache',
          processing_time: performance.now() - startTime
        });
      }

      let financialReport;
      switch (type) {
        case 'overview':
          financialReport = await this.generateFinancialOverview(period, dateFrom, dateTo, currency);
          break;
        case 'transactions':
          financialReport = await this.generateTransactionReport(period, dateFrom, dateTo, currency);
          break;
        case 'revenue':
          financialReport = await this.generateRevenueReport(period, dateFrom, dateTo, currency);
          break;
        case 'payouts':
          financialReport = await this.generatePayoutReport(period, dateFrom, dateTo, currency);
          break;
        case 'tax':
          financialReport = await this.generateTaxReport(period, dateFrom, dateTo, currency);
          break;
        default:
          return this.sendErrorResponse(res, 400, 'INVALID_REPORT_TYPE', 'Invalid financial report type');
      }

      // Add AI-powered insights
      financialReport.ai_insights = await this.generateFinancialInsights(financialReport);

      // Cache the report
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        financialReport,
        { ttl: 900 }
      );

      await this.logAdminAction(req.user.id, 'financial_report_view', 'financial', null, {
        report_type: type,
        period,
        currency
      });

      return this.sendSuccessResponse(res, 200, {
        message: 'Financial report generated successfully',
        data: financialReport,
        source: 'database',
        processing_time: performance.now() - startTime
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ Financial reports error:', {
        error: error.message,
        adminId: req.user.id,
        processingTime
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'FINANCIAL_REPORTS_ERROR',
        error.message || 'Failed to generate financial report'
      );
    }
  };

  /**
   * 🤖 AI-Powered Analytics Dashboard
   */
  getAIAnalytics = async (req, res) => {
    const startTime = performance.now();

    try {
      YachiLogger.info('🤖 Admin AI analytics requested', {
        adminId: req.user.id,
        analyticsType: req.query.type
      });

      // Validate admin permissions
      await this.validateAdminAccess(req.user, 'ai_analytics');

      const { type = 'platform', timeframe = '30d', compare = false } = req.query;

      const cacheKey = `admin:ai_analytics:${type}:${timeframe}:${compare}`;

      const cachedAnalytics = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey,
        null,
        { ttl: 1800 } // 30 minutes cache
      );

      if (cachedAnalytics) {
        return this.sendSuccessResponse(res, 200, {
          message: 'AI analytics retrieved successfully',
          data: cachedAnalytics,
          source: 'cache',
          processing_time: performance.now() - startTime
        });
      }

      // Generate AI-powered analytics
      const aiAnalytics = await this.generateAIAnalytics(type, timeframe, compare);

      // Cache the analytics
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        aiAnalytics,
        { ttl: 1800 }
      );

      await this.logAdminAction(req.user.id, 'ai_analytics_view', 'analytics', null, {
        analytics_type: type,
        timeframe,
        compare
      });

      return this.sendSuccessResponse(res, 200, {
        message: 'AI analytics generated successfully',
        data: aiAnalytics,
        source: 'database',
        processing_time: performance.now() - startTime
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ AI analytics error:', {
        error: error.message,
        adminId: req.user.id,
        processingTime
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'AI_ANALYTICS_ERROR',
        error.message || 'Failed to generate AI analytics'
      );
    }
  };

  /**
   * 🛡️ Security and Compliance Management
   */
  getSecurityDashboard = async (req, res) => {
    const startTime = performance.now();

    try {
      YachiLogger.info('🛡️ Admin security dashboard requested', {
        adminId: req.user.id
      });

      // Validate super admin permissions
      await this.validateAdminAccess(req.user, 'security_management');

      const cacheKey = 'admin:security:dashboard';
      
      const cachedSecurity = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey,
        null,
        { ttl: 300 } // 5 minutes cache
      );

      if (cachedSecurity) {
        return this.sendSuccessResponse(res, 200, {
          message: 'Security dashboard retrieved successfully',
          data: cachedSecurity,
          source: 'cache',
          processing_time: performance.now() - startTime
        });
      }

      const securityData = await this.generateSecurityDashboard();

      // Cache security data
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        securityData,
        { ttl: 300 }
      );

      await this.logAdminAction(req.user.id, 'security_dashboard_view', 'security', null, {
        processing_time: performance.now() - startTime
      });

      return this.sendSuccessResponse(res, 200, {
        message: 'Security dashboard generated successfully',
        data: securityData,
        source: 'database',
        processing_time: performance.now() - startTime
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ Security dashboard error:', {
        error: error.message,
        adminId: req.user.id,
        processingTime
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'SECURITY_DASHBOARD_ERROR',
        error.message || 'Failed to generate security dashboard'
      );
    }
  };

  /**
   * ⚙️ System Configuration Management
   */
  updateSystemSettings = async (req, res) => {
    const startTime = performance.now();
    const transaction = await sequelize.transaction();

    try {
      const { settings } = req.body;
      const adminId = req.user.id;

      YachiLogger.info('⚙️ System settings update requested', {
        adminId,
        settingsCount: Object.keys(settings).length
      });

      // Validate super admin permissions
      await this.validateAdminAccess(req.user, 'system_configuration');

      // Validate settings structure
      const validation = await this.validateSystemSettings(settings);
      if (!validation.valid) {
        await transaction.rollback();
        return this.sendErrorResponse(res, 400, 'SETTINGS_VALIDATION_FAILED', validation.message, validation.errors);
      }

      // Update settings in database
      await this.saveSystemSettings(settings, transaction);

      // Log the settings update
      await AdminLog.create({
        adminId,
        action: 'system_settings_update',
        targetType: 'system',
        targetId: null,
        metadata: {
          settings: Object.keys(settings),
          previousValues: validation.previousValues,
          newValues: settings,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      }, { transaction });

      await transaction.commit();

      // Clear all caches to ensure new settings take effect
      await this.clearAllCaches();

      // Notify other admins about system settings change
      await this.notifyAdminsAboutSystemChange(adminId, settings);

      YachiLogger.info('✅ System settings updated successfully', {
        adminId,
        settingsUpdated: Object.keys(settings).length
      });

      return this.sendSuccessResponse(res, 200, {
        message: 'System settings updated successfully',
        data: {
          updated_settings: Object.keys(settings),
          cache_cleared: true,
          admins_notified: true
        },
        processing_time: performance.now() - startTime
      });

    } catch (error) {
      await transaction.rollback();
      
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ System settings update error:', {
        error: error.message,
        adminId: req.user.id,
        processingTime
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'SYSTEM_SETTINGS_ERROR',
        error.message || 'Failed to update system settings'
      );
    }
  };

  /**
   * 🔄 Utility Methods
   */

  /**
   * Build advanced where clause for user queries
   */
  buildUserWhereClause(filters) {
    const whereClause = {};

    // Role filter
    if (filters.role && filters.role !== 'all') {
      whereClause.role = filters.role;
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      whereClause.status = filters.status;
    }

    // Verification filter
    if (filters.verification) {
      switch (filters.verification) {
        case 'verified':
          whereClause.faydaVerified = true;
          whereClause.selfieVerified = true;
          whereClause.documentVerified = true;
          break;
        case 'partial':
          whereClause[Op.or] = [
            { faydaVerified: true },
            { selfieVerified: true },
            { documentVerified: true }
          ];
          break;
        case 'unverified':
          whereClause.faydaVerified = false;
          whereClause.selfieVerified = false;
          whereClause.documentVerified = false;
          break;
      }
    }

    // Region filter (Ethiopian specific)
    if (filters.region) {
      whereClause.region = filters.region;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      whereClause.createdAt = {};
      if (filters.dateFrom) whereClause.createdAt[Op.gte] = new Date(filters.dateFrom);
      if (filters.dateTo) whereClause.createdAt[Op.lte] = new Date(filters.dateTo);
    }

    // Search filter
    if (filters.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { email: { [Op.iLike]: `%${filters.search}%` } },
        { phone: { [Op.iLike]: `%${filters.search}%` } },
        { faydaId: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    return whereClause;
  }

  /**
   * Validate admin access for specific permission
   */
  async validateAdminAccess(user, permission) {
    if (!user || !this.adminRoles.includes(user.role)) {
      throw {
        statusCode: 403,
        code: 'ADMIN_ACCESS_DENIED',
        message: 'Insufficient admin privileges'
      };
    }

    // Check specific permissions based on role
    const permissions = this.getAdminPermissions(user.role);
    if (!permissions.includes(permission)) {
      throw {
        statusCode: 403,
        code: 'PERMISSION_DENIED',
        message: `Permission '${permission}' required for this action`
      };
    }

    return true;
  }

  /**
   * Get admin permissions based on role
   */
  getAdminPermissions(role) {
    const permissions = {
      super_admin: [
        'dashboard_view', 'user_management', 'user_suspend', 'user_delete',
        'financial_management', 'construction_management', 'ai_analytics',
        'security_management', 'system_configuration'
      ],
      admin: [
        'dashboard_view', 'user_management', 'user_suspend',
        'financial_management', 'construction_management', 'ai_analytics'
      ],
      moderator: [
        'dashboard_view', 'user_management'
      ],
      support: [
        'dashboard_view'
      ],
      government_admin: [
        'dashboard_view', 'construction_management', 'financial_management'
      ]
    };

    return permissions[role] || [];
  }

  /**
   * Log admin action for audit trail
   */
  async logAdminAction(adminId, action, targetType, targetId, metadata = {}) {
    try {
      await AdminLog.create({
        adminId,
        action,
        targetType,
        targetId,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      YachiLogger.error('Failed to log admin action:', error);
    }
  }

  /**
   * Clear user-related caches
   */
  async clearUserRelatedCaches(userId) {
    const patterns = [
      `admin:users:*`,
      `user:${userId}:*`,
      `admin:dashboard:*`
    ];

    for (const pattern of patterns) {
      await redisUtils.deletePattern(
        await redisManager.getClient('cache'),
        pattern
      );
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches() {
    await redisUtils.deletePattern(
      await redisManager.getClient('cache'),
      '*'
    );
  }

  /**
   * Send standardized success response
   */
  sendSuccessResponse(res, statusCode, data) {
    return res.status(statusCode).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Send standardized error response
   */
  sendErrorResponse(res, statusCode, code, message, details = null) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Setup daily statistics collection
   */
  setupDailyStatsCollection() {
    // Run at 2 AM Ethiopia time (UTC+3)
    const now = new Date();
    const ethiopiaTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const nextCollection = new Date(ethiopiaTime);
    nextCollection.setDate(nextCollection.getDate() + 1);
    nextCollection.setHours(2, 0, 0, 0);
    
    const timeUntilCollection = nextCollection.getTime() - ethiopiaTime.getTime();
    
    setTimeout(() => {
      this.collectDailyStats();
      setInterval(() => this.collectDailyStats(), 24 * 60 * 60 * 1000);
    }, timeUntilCollection);
  }

  /**
   * Collect daily platform statistics
   */
  async collectDailyStats() {
    try {
      const stats = await this.calculateComprehensiveDashboard();
      
      await PlatformStats.create({
        date: new Date().toISOString().split('T')[0],
        stats: stats,
        metadata: {
          collectedAt: new Date().toISOString(),
          environment: process.env.NODE_ENV
        }
      });

      YachiLogger.info('📈 Daily platform statistics collected');
    } catch (error) {
      YachiLogger.error('❌ Daily stats collection failed:', error);
    }
  }

  // Additional placeholder methods for the complete implementation
  async calculateComprehensiveDashboard() { return {}; }
  async generateUserAIInsights(users) { return {}; }
  async generateUserSummary(whereClause) { return {}; }
  async validateUserAction(user, action, reason) { return { valid: true }; }
  async executeUserAction(user, action, options) { return {}; }
  async notifyUserAboutAdminAction(user, action, reason, result) { }
  buildConstructionWhereClause(filters) { return {}; }
  async generateConstructionAnalytics(whereClause) { return {}; }
  async generateFinancialOverview(period, dateFrom, dateTo, currency) { return {}; }
  async generateTransactionReport(period, dateFrom, dateTo, currency) { return {}; }
  async generateRevenueReport(period, dateFrom, dateTo, currency) { return {}; }
  async generatePayoutReport(period, dateFrom, dateTo, currency) { return {}; }
  async generateTaxReport(period, dateFrom, dateTo, currency) { return {}; }
  async generateFinancialInsights(report) { return {}; }
  async generateAIAnalytics(type, timeframe, compare) { return {}; }
  async generateSecurityDashboard() { return {}; }
  async validateSystemSettings(settings) { return { valid: true }; }
  async saveSystemSettings(settings, transaction) { }
  async notifyAdminsAboutSystemChange(adminId, settings) { }
  setupRealTimeMonitoring() { }
  setupAutomatedReports() { }
  setupSecurityMonitoring() { }
  buildSortOrder(sortBy, sortOrder) { return []; }
  sanitizeUserForAdmin(user) { return user; }
  sanitizeConstructionProject(project) { return project; }
}

// Create singleton instance
const adminController = new AdminController();

module.exports = adminController;