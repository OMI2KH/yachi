const express = require('express');
const { User, Job, Transaction, Service, Rating, Message, Conversation, Advertisement } = require('../models');
const auth = require('../middleware/auth.js');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiGamification } = require('../services/yachiGamification');
const { RealTimeService } = require('../services/realTimeService');
const { YachiNotifications } = require('../services/yachiNotifications');
const Joi = require('joi');
const { Op } = require('sequelize');
const router = express.Router();

// --- Validation Schemas ---
const reportScamSchema = Joi.object({
  jobId: Joi.string().uuid().required(),
  reason: Joi.string().min(5).max(500).required(),
  evidence: Joi.array().items(Joi.string().uri()).max(10),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
});

const verifyUserSchema = Joi.object({
  faydaVerified: Joi.boolean(),
  selfieVerified: Joi.boolean(),
  documentVerified: Joi.boolean(),
  verificationLevel: Joi.string().valid('unverified', 'basic', 'verified', 'premium_verified'),
  verificationNotes: Joi.string().max(1000)
});

const userManagementSchema = Joi.object({
  status: Joi.string().valid('active', 'suspended', 'deactivated', 'pending'),
  role: Joi.string().valid('client', 'provider', 'admin', 'moderator', 'support'),
  suspensionReason: Joi.string().max(1000),
  suspensionDuration: Joi.number().integer().min(1).max(365) // days
});

const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year'),
  metrics: Joi.array().items(Joi.string().valid(
    'users', 'transactions', 'revenue', 'jobs', 'services', 
    'ratings', 'messages', 'disputes', 'growth'
  ))
});

const contentModerationSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject', 'flag', 'remove').required(),
  reason: Joi.string().max(1000).required(),
  notes: Joi.string().max(2000)
});

// --- Middleware: Enhanced Admin Check ---
const adminCheck = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'role', 'permissions', 'status']
    });
    
    if (!user || user.status !== 'active') {
      return res.status(403).json({ 
        error: 'ACCESS_DENIED',
        message: 'Account inactive or not found' 
      });
    }

    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ 
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin or moderator access required' 
      });
    }

    // Check specific permissions for sensitive operations
    req.adminUser = user;
    req.isSuperAdmin = user.role === 'admin';
    next();
  } catch (err) {
    console.error('Admin Check Error:', err);
    res.status(500).json({ 
      error: 'SERVER_ERROR',
      message: 'Internal server error during authorization' 
    });
  }
};

// --- Enhanced Permission Middleware ---
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.isSuperAdmin) return next();
    
    const userPermissions = req.adminUser.permissions || {};
    if (!userPermissions[permission]) {
      return res.status(403).json({
        error: 'MISSING_PERMISSION',
        message: `Required permission: ${permission}`
      });
    }
    next();
  };
};

// 🎯 ADMIN DASHBOARD & ANALYTICS
// ===============================

// --- Comprehensive Analytics ---
router.get('/analytics/dashboard', auth, adminCheck, async (req, res) => {
  try {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) return res.status(400).json({ 
      error: 'VALIDATION_ERROR', 
      message: error.details[0].message 
    });

    const { startDate, endDate, period = 'month', metrics = ['users', 'transactions', 'revenue', 'jobs'] } = value;
    
    const dateRange = await YachiAnalytics.getDateRange(startDate, endDate, period);
    
    const analytics = await YachiAnalytics.getComprehensiveAnalytics({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      metrics
    });

    res.json({
      success: true,
      period: {
        start: dateRange.startDate,
        end: dateRange.endDate,
        type: period
      },
      analytics
    });
  } catch (err) {
    console.error('Admin Analytics Error:', err);
    res.status(500).json({ 
      error: 'ANALYTICS_ERROR',
      message: 'Failed to retrieve analytics data' 
    });
  }
});

// --- Real-time Platform Metrics ---
router.get('/analytics/realtime', auth, adminCheck, async (req, res) => {
  try {
    const realtimeMetrics = await YachiAnalytics.getRealtimeMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: realtimeMetrics
    });
  } catch (err) {
    console.error('Realtime Analytics Error:', err);
    res.status(500).json({ 
      error: 'REALTIME_METRICS_ERROR',
      message: 'Failed to retrieve real-time metrics' 
    });
  }
});

// --- Growth Analytics ---
router.get('/analytics/growth', auth, adminCheck, async (req, res) => {
  try {
    const growthData = await YachiAnalytics.getGrowthAnalytics(req.query);
    
    res.json({
      success: true,
      growth: growthData
    });
  } catch (err) {
    console.error('Growth Analytics Error:', err);
    res.status(500).json({ 
      error: 'GROWTH_ANALYTICS_ERROR',
      message: 'Failed to retrieve growth analytics' 
    });
  }
});

// 🎯 USER MANAGEMENT
// ===================

// --- Enhanced User Listing with Advanced Filtering ---
router.get('/users', auth, adminCheck, requirePermission('canViewUsers'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      role,
      status,
      verificationLevel,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const whereClause = {};
    
    // Advanced filtering
    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    if (verificationLevel) whereClause.verificationLevel = verificationLevel;
    
    // Search across multiple fields
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phoneNumber: { [Op.iLike]: `%${search}%` } },
        { faydaId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { 
        exclude: ['password', 'twoFactorSecret', 'loginAttempts'] 
      },
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: offset,
      include: [
        {
          model: Job,
          as: 'clientJobs',
          attributes: ['id', 'status', 'createdAt'],
          required: false
        },
        {
          model: Job,
          as: 'providerJobs',
          attributes: ['id', 'status', 'createdAt'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      },
      users: users.map(user => user.getPublicProfile())
    });
  } catch (err) {
    console.error('Get Users Error:', err);
    res.status(500).json({ 
      error: 'USER_FETCH_ERROR',
      message: 'Failed to retrieve users' 
    });
  }
});

// --- Enhanced User Verification ---
router.put('/users/:id/verify', auth, adminCheck, requirePermission('canVerifyUsers'), async (req, res) => {
  const { error, value } = verifyUserSchema.validate(req.body);
  if (error) return res.status(400).json({ 
    error: 'VALIDATION_ERROR', 
    message: error.details[0].message 
  });

  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ 
      error: 'USER_NOT_FOUND',
      message: 'User not found' 
    });

    // Prevent self-verification
    if (user.id === req.adminUser.id) return res.status(400).json({ 
      error: 'SELF_VERIFICATION',
      message: 'Cannot verify your own account' 
    });

    // Update verification fields
    const updateFields = {};
    if (value.faydaVerified !== undefined) {
      updateFields.faydaVerified = value.faydaVerified;
      if (value.faydaVerified) updateFields.faydaVerifiedAt = new Date();
    }
    if (value.selfieVerified !== undefined) {
      updateFields.selfieVerified = value.selfieVerified;
      if (value.selfieVerified) updateFields.selfieVerifiedAt = new Date();
    }
    if (value.documentVerified !== undefined) {
      updateFields.documentVerified = value.documentVerified;
      if (value.documentVerified) updateFields.documentVerifiedAt = new Date();
    }
    if (value.verificationLevel) {
      updateFields.verificationLevel = value.verificationLevel;
    }

    await user.update(updateFields);

    // Recalculate verification score
    await user.calculateVerificationScore();

    // Award verification achievement if fully verified
    if (user.verificationLevel === 'premium_verified') {
      await YachiGamification.awardVerificationAchievement(user.id);
    }

    // Log verification action
    await YachiAnalytics.logAdminAction({
      adminId: req.adminUser.id,
      action: 'USER_VERIFICATION',
      targetUserId: user.id,
      changes: updateFields,
      notes: value.verificationNotes
    });

    // Notify user
    await YachiNotifications.sendVerificationUpdate(user, updateFields);

    res.json({
      success: true,
      message: 'User verification updated successfully',
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Verify User Error:', err);
    res.status(500).json({ 
      error: 'VERIFICATION_UPDATE_ERROR',
      message: 'Failed to update user verification' 
    });
  }
});

// --- Advanced User Management ---
router.put('/users/:id/manage', auth, adminCheck, requirePermission('canManageUsers'), async (req, res) => {
  const { error, value } = userManagementSchema.validate(req.body);
  if (error) return res.status(400).json({ 
    error: 'VALIDATION_ERROR', 
    message: error.details[0].message 
  });

  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ 
      error: 'USER_NOT_FOUND',
      message: 'User not found' 
    });

    // Prevent self-management
    if (user.id === req.adminUser.id) return res.status(400).json({ 
      error: 'SELF_MANAGEMENT',
      message: 'Cannot manage your own account' 
    });

    const updateFields = {};
    const actionLog = [];

    // Status management
    if (value.status && value.status !== user.status) {
      updateFields.status = value.status;
      actionLog.push(`Status changed to: ${value.status}`);

      if (value.status === 'suspended') {
        updateFields.suspendedUntil = new Date(Date.now() + (value.suspensionDuration || 7) * 24 * 60 * 60 * 1000);
        updateFields.suspensionReason = value.suspensionReason;
        actionLog.push(`Suspended until: ${updateFields.suspendedUntil}`);
      } else if (value.status === 'active') {
        updateFields.suspendedUntil = null;
        updateFields.suspensionReason = null;
      }
    }

    // Role management (super admin only)
    if (value.role && value.role !== user.role && req.isSuperAdmin) {
      updateFields.role = value.role;
      actionLog.push(`Role changed to: ${value.role}`);
    }

    await user.update(updateFields);

    // Log management action
    await YachiAnalytics.logAdminAction({
      adminId: req.adminUser.id,
      action: 'USER_MANAGEMENT',
      targetUserId: user.id,
      changes: updateFields,
      notes: actionLog.join('; ')
    });

    // Notify user about status change
    if (value.status && value.status !== 'active') {
      await YachiNotifications.sendAccountStatusUpdate(user, value.status, value.suspensionReason);
    }

    res.json({
      success: true,
      message: 'User management action completed successfully',
      actions: actionLog,
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('User Management Error:', err);
    res.status(500).json({ 
      error: 'USER_MANAGEMENT_ERROR',
      message: 'Failed to manage user account' 
    });
  }
});

// 🎯 CONTENT MODERATION
// ======================

// --- Enhanced Scam Reporting ---
router.post('/moderation/report-scam', auth, adminCheck, requirePermission('canHandleReports'), async (req, res) => {
  const { error, value } = reportScamSchema.validate(req.body);
  if (error) return res.status(400).json({ 
    error: 'VALIDATION_ERROR', 
    message: error.details[0].message 
  });

  try {
    const { jobId, reason, evidence, severity } = value;

    // Verify job exists
    const job = await Job.findByPk(jobId, {
      include: [
        { model: User, as: 'client' },
        { model: User, as: 'provider' }
      ]
    });

    if (!job) return res.status(404).json({ 
      error: 'JOB_NOT_FOUND',
      message: 'Job not found' 
    });

    // Create scam report with enhanced tracking
    const scamReport = await Transaction.create({
      userId: req.userId,
      jobId,
      paymentMethod: 'escrow',
      amount: 0,
      status: 'reported',
      metadata: {
        reportType: 'scam',
        severity,
        evidence,
        reportedBy: req.adminUser.id,
        reporterRole: req.adminUser.role
      }
    });

    // Log moderation action
    await YachiAnalytics.logAdminAction({
      adminId: req.adminUser.id,
      action: 'SCAM_REPORT',
      targetJobId: jobId,
      details: { reason, severity, evidence }
    });

    // Notify relevant parties
    await YachiNotifications.sendScamReportNotification(job, scamReport, req.adminUser);

    // Auto-flag involved users for review
    if (severity === 'high' || severity === 'critical') {
      await User.update(
        { status: 'pending' },
        { 
          where: { 
            [Op.or]: [
              { id: job.clientId },
              { id: job.providerId }
            ]
          } 
        }
      );
    }

    res.json({
      success: true,
      message: 'Scam reported successfully. The case has been escalated for review.',
      reportId: scamReport.id,
      severity,
      autoActions: severity === 'high' || severity === 'critical' ? 
        'Involved users flagged for review' : 'Case logged for investigation'
    });
  } catch (err) {
    console.error('Report Scam Error:', err);
    res.status(500).json({ 
      error: 'SCAM_REPORT_ERROR',
      message: 'Failed to process scam report' 
    });
  }
});

// --- Content Moderation Queue ---
router.get('/moderation/queue', auth, adminCheck, requirePermission('canModerateContent'), async (req, res) => {
  try {
    const {
      type = 'all', // 'services', 'reviews', 'profiles', 'ads'
      status = 'pending',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;
    let moderationQueue = [];

    // Build moderation queue based on type
    switch (type) {
      case 'services':
        moderationQueue = await Service.findAndCountAll({
          where: { moderationStatus: status },
          include: [{ model: User, as: 'Provider', attributes: ['id', 'name', 'email'] }],
          limit: parseInt(limit),
          offset: offset,
          order: [['createdAt', 'ASC']]
        });
        break;

      case 'reviews':
        moderationQueue = await Rating.findAndCountAll({
          where: { moderationStatus: status },
          include: [
            { model: User, as: 'Provider', attributes: ['id', 'name', 'email'] },
            { model: User, as: 'Reviewer', attributes: ['id', 'name', 'email'] }
          ],
          limit: parseInt(limit),
          offset: offset,
          order: [['createdAt', 'ASC']]
        });
        break;

      case 'ads':
        moderationQueue = await Advertisement.findAndCountAll({
          where: { status: 'pending_approval' },
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email'] }],
          limit: parseInt(limit),
          offset: offset,
          order: [['createdAt', 'ASC']]
        });
        break;

      default:
        // Combined queue (requires more complex query)
        // Implementation would combine results from multiple models
        break;
    }

    res.json({
      success: true,
      type,
      status,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: moderationQueue.count,
        pages: Math.ceil(moderationQueue.count / limit)
      },
      queue: moderationQueue.rows
    });
  } catch (err) {
    console.error('Moderation Queue Error:', err);
    res.status(500).json({ 
      error: 'MODERATION_QUEUE_ERROR',
      message: 'Failed to retrieve moderation queue' 
    });
  }
});

// --- Moderate Content Item ---
router.post('/moderation/:type/:id', auth, adminCheck, requirePermission('canModerateContent'), async (req, res) => {
  const { error, value } = contentModerationSchema.validate(req.body);
  if (error) return res.status(400).json({ 
    error: 'VALIDATION_ERROR', 
    message: error.details[0].message 
  });

  try {
    const { type, id } = req.params;
    const { action, reason, notes } = value;

    let contentItem;
    let updateData = {};

    switch (type) {
      case 'service':
        contentItem = await Service.findByPk(id, {
          include: [{ model: User, as: 'Provider' }]
        });
        if (action === 'approve') updateData = { moderationStatus: 'approved', isActive: true };
        if (action === 'reject') updateData = { moderationStatus: 'rejected', isActive: false };
        break;

      case 'review':
        contentItem = await Rating.findByPk(id, {
          include: [
            { model: User, as: 'Provider' },
            { model: User, as: 'Reviewer' }
          ]
        });
        if (action === 'approve') updateData = { moderationStatus: 'approved' };
        if (action === 'reject') updateData = { moderationStatus: 'rejected' };
        break;

      case 'ad':
        contentItem = await Advertisement.findByPk(id, {
          include: [{ model: User, as: 'User' }]
        });
        if (action === 'approve') updateData = { status: 'active' };
        if (action === 'reject') updateData = { status: 'rejected' };
        break;

      default:
        return res.status(400).json({ 
          error: 'INVALID_CONTENT_TYPE',
          message: 'Invalid content type for moderation' 
        });
    }

    if (!contentItem) return res.status(404).json({ 
      error: 'CONTENT_NOT_FOUND',
      message: 'Content item not found' 
    });

    // Add moderation metadata
    updateData.moderatedBy = req.adminUser.id;
    updateData.moderatedAt = new Date();
    updateData.moderationNotes = notes;
    if (action === 'reject') updateData.rejectionReason = reason;

    await contentItem.update(updateData);

    // Log moderation action
    await YachiAnalytics.logAdminAction({
      adminId: req.adminUser.id,
      action: `MODERATE_${type.toUpperCase()}`,
      targetId: id,
      actionType: action,
      reason,
      notes
    });

    // Notify content owner
    await YachiNotifications.sendModerationResult(contentItem, action, reason);

    res.json({
      success: true,
      message: `Content ${action}d successfully`,
      action,
      contentId: id,
      contentType: type
    });
  } catch (err) {
    console.error('Content Moderation Error:', err);
    res.status(500).json({ 
      error: 'CONTENT_MODERATION_ERROR',
      message: 'Failed to moderate content' 
    });
  }
});

// 🎯 GAMIFICATION MANAGEMENT
// ===========================

// --- Manage User Points ---
router.post('/gamification/points', auth, adminCheck, requirePermission('canManageGamification'), async (req, res) => {
  const schema = Joi.object({
    userId: Joi.string().uuid().required(),
    points: Joi.number().integer().required(),
    reason: Joi.string().max(500).required(),
    type: Joi.string().valid('award', 'deduct').required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ 
    error: 'VALIDATION_ERROR', 
    message: error.details[0].message 
  });

  try {
    const { userId, points, reason, type } = value;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ 
      error: 'USER_NOT_FOUND',
      message: 'User not found' 
    });

    const finalPoints = type === 'deduct' ? -Math.abs(points) : Math.abs(points);
    
    await user.awardPoints(finalPoints, `Admin action: ${reason}`);

    // Log points adjustment
    await YachiAnalytics.logAdminAction({
      adminId: req.adminUser.id,
      action: 'POINTS_ADJUSTMENT',
      targetUserId: userId,
      points: finalPoints,
      reason,
      type
    });

    res.json({
      success: true,
      message: `Successfully ${type}ed ${Math.abs(points)} points`,
      user: {
        id: user.id,
        name: user.name,
        newPoints: user.yachiPoints,
        newLevel: user.level
      }
    });
  } catch (err) {
    console.error('Points Management Error:', err);
    res.status(500).json({ 
      error: 'POINTS_MANAGEMENT_ERROR',
      message: 'Failed to manage user points' 
    });
  }
});

// --- Platform-wide Gamification Settings ---
router.get('/gamification/settings', auth, adminCheck, requirePermission('canManageGamification'), async (req, res) => {
  try {
    const settings = await YachiGamification.getPlatformSettings();
    
    res.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error('Gamification Settings Error:', err);
    res.status(500).json({ 
      error: 'SETTINGS_FETCH_ERROR',
      message: 'Failed to retrieve gamification settings' 
    });
  }
});

// 🎯 SYSTEM MANAGEMENT
// =====================

// --- Platform Health Check ---
router.get('/system/health', auth, adminCheck, async (req, res) => {
  try {
    const health = await YachiAnalytics.getSystemHealth();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      health
    });
  } catch (err) {
    console.error('System Health Check Error:', err);
    res.status(500).json({ 
      error: 'HEALTH_CHECK_ERROR',
      message: 'Failed to retrieve system health status' 
    });
  }
});

// --- Admin Activity Log ---
router.get('/system/activity', auth, adminCheck, async (req, res) => {
  try {
    const { page = 1, limit = 50, adminId, action } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (adminId) whereClause.adminId = adminId;
    if (action) whereClause.action = action;

    const activities = await YachiAnalytics.getAdminActivities({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: activities.count,
        pages: Math.ceil(activities.count / limit)
      },
      activities: activities.rows
    });
  } catch (err) {
    console.error('Activity Log Error:', err);
    res.status(500).json({ 
      error: 'ACTIVITY_LOG_ERROR',
      message: 'Failed to retrieve admin activity log' 
    });
  }
});

module.exports = router;
