// models/Notification.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { YachiAI } = require('../services/yachiAI');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { emailService } = require('../services/emailService');
const { smsService } = require('../services/smsService');
const { pushNotificationService } = require('../services/pushNotificationService');
const logger = require('../utils/logger');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Notification Information
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Notification title is required' },
      len: { args: [3, 255], msg: 'Title must be between 3 and 255 characters' }
    }
  },
  
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Notification message is required' },
      len: { args: [5, 1000], msg: 'Message must be between 5 and 1000 characters' }
    }
  },
  
  // Notification Type and Category
  type: {
    type: DataTypes.ENUM(
      'system',           // System notifications
      'booking',          // Booking-related
      'payment',          // Payment updates
      'verification',     // Verification status
      'security',         // Security alerts
      'marketing',        // Promotional messages
      'reminder',         // Reminders
      'alert',            // Important alerts
      'message',          // New messages
      'review',           // Review requests
      'service',          // Service updates
      'worker',           // Worker-specific
      'client',           // Client-specific
      'admin',            // Admin notifications
      'emergency'         // Emergency alerts
    ),
    defaultValue: 'system',
    allowNull: false
  },
  
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: { args: [0, 100], msg: 'Category cannot exceed 100 characters' }
    }
  },
  
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: { args: [0, 100], msg: 'Subcategory cannot exceed 100 characters' }
    }
  },
  
  // Priority and Urgency
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  
  urgency: {
    type: DataTypes.ENUM('normal', 'important', 'critical'),
    defaultValue: 'normal'
  },
  
  // Delivery Channels
  channels: {
    type: DataTypes.JSON,
    defaultValue: ['in_app'],
    validate: {
      isValidChannels(value) {
        if (!Array.isArray(value)) {
          throw new Error('Channels must be an array');
        }
        const validChannels = ['in_app', 'email', 'sms', 'push', 'webhook'];
        if (!value.every(channel => validChannels.includes(channel))) {
          throw new Error('Invalid channel specified');
        }
      }
    },
    comment: 'Delivery channels: in_app, email, sms, push, webhook'
  },
  
  // Target Audience
  targetType: {
    type: DataTypes.ENUM('user', 'group', 'role', 'all', 'segment'),
    defaultValue: 'user'
  },
  
  targetId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User ID, group ID, or role ID'
  },
  
  targetSegment: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Segment criteria for targeted notifications'
  },
  
  // Content and Media
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: { msg: 'Image URL must be a valid URL' }
    }
  },
  
  actionUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: { msg: 'Action URL must be a valid URL' }
    },
    comment: 'URL for notification action/click'
  },
  
  actionLabel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: { args: [0, 100], msg: 'Action label cannot exceed 100 characters' }
    }
  },
  
  // Personalization
  templateId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Template identifier for consistent messaging'
  },
  
  variables: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Variables for template personalization'
  },
  
  personalization: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Personalization data for the recipient'
  },
  
  // Delivery Status and Timing
  status: {
    type: DataTypes.ENUM(
      'draft',            // Notification created but not scheduled
      'scheduled',        // Scheduled for future delivery
      'processing',       // Currently being processed
      'sent',             // Successfully sent to all channels
      'partially_sent',   // Sent to some channels
      'failed',           // Failed to send
      'cancelled',        // Cancelled before delivery
      'expired'           // Expired before delivery
    ),
    defaultValue: 'draft'
  },
  
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: { msg: 'Scheduled date must be a valid date' }
    }
  },
  
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: { msg: 'Expiry date must be a valid date' }
    }
  },
  
  // Delivery Statistics
  totalRecipients: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  successfulDeliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  failedDeliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  openRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.0,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  clickRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.0,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // Channel-specific Status
  channelStatus: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Delivery status per channel'
  },
  
  // Retry Configuration
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    validate: {
      min: 0
    }
  },
  
  retryAfter: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Localization
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en',
    validate: {
      isIn: {
        args: [['en', 'am', 'or', 'ti']],
        msg: 'Invalid language code'
      }
    }
  },
  
  localizedContent: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Localized versions of title and message'
  },
  
  // AI and Optimization
  aiOptimization: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'AI-powered optimization data'
  },
  
  a_bTestGroup: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'A/B test group identifier'
  },
  
  // Analytics and Tracking
  trackingId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Tracking ID for analytics'
  },
  
  campaignId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Campaign identifier'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional notification metadata'
  }

}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_notification_user',
      fields: ['user_id']
    },
    {
      name: 'idx_notification_type',
      fields: ['type']
    },
    {
      name: 'idx_notification_status',
      fields: ['status']
    },
    {
      name: 'idx_notification_priority',
      fields: ['priority']
    },
    {
      name: 'idx_notification_scheduled',
      fields: ['scheduled_at']
    },
    {
      name: 'idx_notification_sent',
      fields: ['sent_at']
    },
    {
      name: 'idx_notification_expires',
      fields: ['expires_at']
    },
    {
      name: 'idx_notification_target',
      fields: ['target_type', 'target_id']
    },
    {
      name: 'idx_notification_language',
      fields: ['language']
    },
    {
      name: 'idx_notification_created',
      fields: ['created_at']
    },
    {
      name: 'idx_notification_template',
      fields: ['template_id']
    }
  ],
  hooks: {
    beforeValidate: async (notification) => {
      await Notification.hooks.beforeValidateHook(notification);
    },
    beforeCreate: async (notification) => {
      await Notification.hooks.beforeCreateHook(notification);
    },
    afterCreate: async (notification) => {
      await Notification.hooks.afterCreateHook(notification);
    },
    afterUpdate: async (notification) => {
      await Notification.hooks.afterUpdateHook(notification);
    },
    afterDestroy: async (notification) => {
      await Notification.hooks.afterDestroyHook(notification);
    }
  }
});

// Static Methods
Notification.hooks = {
  /**
   * Before validate hook
   */
  beforeValidateHook: async (notification) => {
    if (notification.isNewRecord || notification.changed('title') || notification.changed('message')) {
      await Notification.hooks.optimizeContent(notification);
    }
    
    if (notification.isNewRecord || notification.changed('scheduledAt')) {
      await Notification.hooks.validateSchedule(notification);
    }
    
    if (notification.isNewRecord || notification.changed('status')) {
      await Notification.hooks.handleStatusChange(notification);
    }
    
    // Set default channels based on type and priority
    if (!notification.channels || notification.channels.length === 0) {
      await Notification.hooks.setDefaultChannels(notification);
    }
  },

  /**
   * Optimize notification content with AI
   */
  optimizeContent: async (notification) => {
    try {
      const optimization = await YachiAI.optimizeNotificationContent({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        language: notification.language,
        targetType: notification.targetType
      });

      notification.aiOptimization = optimization;
      
      // Apply AI suggestions if available
      if (optimization.optimizedTitle && !notification.title.includes('{')) {
        notification.title = optimization.optimizedTitle;
      }
      
      if (optimization.optimizedMessage && !notification.message.includes('{')) {
        notification.message = optimization.optimizedMessage;
      }
      
      // Set urgency based on content analysis
      if (optimization.suggestedUrgency && !notification.urgency) {
        notification.urgency = optimization.suggestedUrgency;
      }

    } catch (error) {
      logger.error('Notification content optimization failed:', error);
      // Don't throw error to prevent notification creation from failing
    }
  },

  /**
   * Validate schedule and set status
   */
  validateSchedule: async (notification) => {
    if (notification.scheduledAt) {
      const scheduledTime = new Date(notification.scheduledAt);
      const now = new Date();
      
      if (scheduledTime > now) {
        notification.status = 'scheduled';
      } else {
        notification.status = 'processing';
      }
    } else {
      notification.status = 'processing';
    }
  },

  /**
   * Handle status changes
   */
  handleStatusChange: async (notification) => {
    const previousStatus = notification.previous('status');
    const newStatus = notification.status;

    // Set sent timestamp when status changes to sent
    if (newStatus === 'sent' && previousStatus !== 'sent') {
      notification.sentAt = new Date();
      
      // Track notification delivery
      await YachiAnalytics.trackNotificationDelivery(notification);
    }
    
    // Trigger delivery when status changes to processing
    else if (newStatus === 'processing' && previousStatus !== 'processing') {
      await Notification.hooks.deliverNotification(notification);
    }
    
    // Handle expiration
    else if (newStatus === 'expired' && previousStatus !== 'expired') {
      await Notification.hooks.handleExpiration(notification);
    }
  },

  /**
   * Set default delivery channels
   */
  setDefaultChannels: async (notification) => {
    const channelMap = {
      urgent: ['in_app', 'sms', 'push'],
      high: ['in_app', 'push'],
      medium: ['in_app', 'email'],
      low: ['in_app']
    };
    
    notification.channels = channelMap[notification.priority] || ['in_app'];
  },

  /**
   * Deliver notification through configured channels
   */
  deliverNotification: async (notification) => {
    try {
      const channelStatus = {};
      let successfulChannels = 0;
      let totalChannels = notification.channels.length;

      // Process each delivery channel
      for (const channel of notification.channels) {
        try {
          const result = await Notification.hooks.deliverToChannel(notification, channel);
          channelStatus[channel] = {
            status: 'sent',
            sentAt: new Date().toISOString(),
            messageId: result.messageId
          };
          successfulChannels++;
        } catch (error) {
          channelStatus[channel] = {
            status: 'failed',
            error: error.message,
            attemptedAt: new Date().toISOString()
          };
          logger.error(`Notification delivery failed for channel ${channel}:`, error);
        }
      }

      // Update notification status based on delivery results
      notification.channelStatus = channelStatus;
      
      if (successfulChannels === totalChannels) {
        notification.status = 'sent';
        notification.successfulDeliveries = notification.totalRecipients;
      } else if (successfulChannels > 0) {
        notification.status = 'partially_sent';
        notification.successfulDeliveries = Math.round(
          (successfulChannels / totalChannels) * notification.totalRecipients
        );
        notification.failedDeliveries = notification.totalRecipients - notification.successfulDeliveries;
      } else {
        notification.status = 'failed';
        notification.failedDeliveries = notification.totalRecipients;
        
        // Schedule retry if applicable
        if (notification.retryCount < notification.maxRetries) {
          await Notification.hooks.scheduleRetry(notification);
        }
      }

      await notification.save();

    } catch (error) {
      logger.error('Notification delivery failed:', error);
      notification.status = 'failed';
      await notification.save();
    }
  },

  /**
   * Deliver notification to specific channel
   */
  deliverToChannel: async (notification, channel) => {
    switch (channel) {
      case 'email':
        return await Notification.hooks.deliverEmail(notification);
      
      case 'sms':
        return await Notification.hooks.deliverSMS(notification);
      
      case 'push':
        return await Notification.hooks.deliverPush(notification);
      
      case 'in_app':
        return await Notification.hooks.deliverInApp(notification);
      
      case 'webhook':
        return await Notification.hooks.deliverWebhook(notification);
      
      default:
        throw new Error(`Unsupported delivery channel: ${channel}`);
    }
  },

  /**
   * Deliver via email
   */
  deliverEmail: async (notification) => {
    const { User } = require('./index');
    const user = await User.findByPk(notification.userId);
    
    if (!user || !user.email) {
      throw new Error('User email not available');
    }

    const emailData = {
      user: user.toJSON(),
      notification: notification.toJSON(),
      variables: notification.variables
    };

    const result = await emailService.sendEmail(
      user.email,
      notification.templateId || 'general-notification',
      emailData,
      {
        priority: notification.priority,
        metadata: {
          notificationId: notification.id,
          trackingId: notification.trackingId
        }
      }
    );

    return { messageId: result.messageId };
  },

  /**
   * Deliver via SMS
   */
  deliverSMS: async (notification) => {
    const { User } = require('./index');
    const user = await User.findByPk(notification.userId);
    
    if (!user || !user.phone) {
      throw new Error('User phone number not available');
    }

    // Personalize message
    const personalizedMessage = Notification.hooks.personalizeMessage(
      notification.message,
      user,
      notification.variables
    );

    const result = await smsService.sendSMS(
      user.phone,
      personalizedMessage,
      {
        purpose: notification.type,
        userId: user.id,
        priority: notification.priority === 'urgent' ? 'high' : 'medium'
      }
    );

    return { messageId: result.messageId };
  },

  /**
   * Deliver via push notification
   */
  deliverPush: async (notification) => {
    const { User, UserDevice } = require('./index');
    const user = await User.findByPk(notification.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Get user's devices
    const devices = await UserDevice.findAll({
      where: { userId: notification.userId, pushEnabled: true }
    });

    if (devices.length === 0) {
      throw new Error('No push-enabled devices found');
    }

    const pushData = {
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id,
        type: notification.type,
        actionUrl: notification.actionUrl,
        imageUrl: notification.imageUrl
      },
      priority: notification.priority
    };

    const results = await pushNotificationService.sendToDevices(devices, pushData);
    
    return { messageId: `push_${notification.id}`, results };
  },

  /**
   * Deliver in-app notification
   */
  deliverInApp: async (notification) => {
    // In-app notifications are stored in the database and delivered via WebSocket
    // This method just validates the notification can be stored
    
    if (!notification.userId) {
      throw new Error('User ID required for in-app notification');
    }

    return { messageId: `in_app_${notification.id}` };
  },

  /**
   * Deliver via webhook
   */
  deliverWebhook: async (notification) => {
    // Webhook delivery would be implemented based on specific integration requirements
    throw new Error('Webhook delivery not implemented');
  },

  /**
   * Personalize message with user data and variables
   */
  personalizeMessage: (message, user, variables = {}) => {
    let personalized = message;
    
    // Replace user variables
    personalized = personalized.replace(/{user\.name}/g, user.name || 'User');
    personalized = personalized.replace(/{user\.firstName}/g, user.firstName || 'User');
    
    // Replace custom variables
    Object.entries(variables).forEach(([key, value]) => {
      personalized = personalized.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    
    return personalized;
  },

  /**
   * Schedule retry for failed notification
   */
  scheduleRetry: async (notification) => {
    const retryDelay = Math.pow(2, notification.retryCount) * 5 * 60 * 1000; // Exponential backoff in minutes
    
    notification.retryCount += 1;
    notification.retryAfter = new Date(Date.now() + retryDelay);
    notification.status = 'scheduled';
    
    await notification.save();
    
    logger.info('Notification retry scheduled', {
      notificationId: notification.id,
      retryCount: notification.retryCount,
      retryAfter: notification.retryAfter
    });
  },

  /**
   * Handle notification expiration
   */
  handleExpiration: async (notification) => {
    logger.info('Notification expired', {
      notificationId: notification.id,
      expiresAt: notification.expiresAt
    });
    
    // Track expiration analytics
    await YachiAnalytics.trackNotificationExpiration(notification);
  },

  /**
   * Before create hook
   */
  beforeCreateHook: async (notification) => {
    // Set total recipients based on target type
    await Notification.hooks.calculateRecipients(notification);
    
    // Set tracking ID if not provided
    if (!notification.trackingId) {
      notification.trackingId = `ntf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },

  /**
   * Calculate total recipients
   */
  calculateRecipients: async (notification) => {
    const { User } = require('./index');
    
    let recipientCount = 0;
    
    switch (notification.targetType) {
      case 'user':
        recipientCount = 1;
        break;
      
      case 'role':
        recipientCount = await User.count({
          where: { role: notification.targetId }
        });
        break;
      
      case 'all':
        recipientCount = await User.count({
          where: { status: 'active' }
        });
        break;
      
      case 'segment':
        // Implement segment-based counting
        recipientCount = await Notification.hooks.countSegmentRecipients(notification.targetSegment);
        break;
      
      default:
        recipientCount = 1;
    }
    
    notification.totalRecipients = recipientCount;
  },

  /**
   * Count segment recipients
   */
  countSegmentRecipients: async (segmentCriteria) => {
    const { User } = require('./index');
    
    const where = { status: 'active' };
    
    // Implement segment-based filtering
    if (segmentCriteria.location) {
      where.location = segmentCriteria.location;
    }
    
    if (segmentCriteria.role) {
      where.role = segmentCriteria.role;
    }
    
    if (segmentCriteria.minRating) {
      where.rating = { [sequelize.Op.gte]: segmentCriteria.minRating };
    }
    
    return await User.count({ where });
  },

  /**
   * After create hook
   */
  afterCreateHook: async (notification) => {
    try {
      // Track notification creation
      await YachiAnalytics.trackNotificationCreation(notification);
      
      // Start delivery if status is processing
      if (notification.status === 'processing') {
        await Notification.hooks.deliverNotification(notification);
      }

    } catch (error) {
      logger.error('After create hook error:', error);
    }
  },

  /**
   * After update hook
   */
  afterUpdateHook: async (notification) => {
    try {
      // Track notification updates
      if (notification.changed()) {
        await YachiAnalytics.trackNotificationUpdate(notification);
      }

    } catch (error) {
      logger.error('After update hook error:', error);
    }
  },

  /**
   * After destroy hook
   */
  afterDestroyHook: async (notification) => {
    try {
      // Track notification deletion
      await YachiAnalytics.trackNotificationDeletion(notification);

    } catch (error) {
      logger.error('After destroy hook error:', error);
    }
  }
};

// Instance Methods
Notification.prototype.getInstanceMethods = function() {
  return {
    /**
     * Schedule notification for future delivery
     */
    schedule: async function(deliveryTime) {
      if (this.status !== 'draft') {
        throw new Error('Only draft notifications can be scheduled');
      }
      
      if (!deliveryTime || new Date(deliveryTime) <= new Date()) {
        throw new Error('Delivery time must be in the future');
      }
      
      await this.update({
        scheduledAt: deliveryTime,
        status: 'scheduled'
      });
      
      logger.info('Notification scheduled', {
        notificationId: this.id,
        scheduledAt: this.scheduledAt
      });
      
      return this;
    },

    /**
     * Send notification immediately
     */
    sendNow: async function() {
      if (this.status === 'sent') {
        throw new Error('Notification has already been sent');
      }
      
      await this.update({
        scheduledAt: null,
        status: 'processing'
      });
      
      return this;
    },

    /**
     * Cancel scheduled notification
     */
    cancel: async function() {
      if (this.status !== 'scheduled') {
        throw new Error('Only scheduled notifications can be cancelled');
      }
      
      await this.update({
        status: 'cancelled',
        scheduledAt: null
      });
      
      logger.info('Notification cancelled', {
        notificationId: this.id
      });
      
      return this;
    },

    /**
     * Retry failed notification
     */
    retry: async function() {
      if (this.status !== 'failed') {
        throw new Error('Only failed notifications can be retried');
      }
      
      if (this.retryCount >= this.maxRetries) {
        throw new Error('Maximum retry attempts reached');
      }
      
      await this.update({
        status: 'processing',
        retryCount: this.retryCount + 1
      });
      
      logger.info('Notification retry initiated', {
        notificationId: this.id,
        retryCount: this.retryCount
      });
      
      return this;
    },

    /**
     * Add delivery channel
     */
    addChannel: async function(channel) {
      const channels = this.channels || [];
      
      if (!channels.includes(channel)) {
        channels.push(channel);
        await this.update({ channels });
      }
      
      return channels;
    },

    /**
     * Remove delivery channel
     */
    removeChannel: async function(channel) {
      const channels = this.channels.filter(c => c !== channel);
      await this.update({ channels });
      return channels;
    },

    /**
     * Update delivery statistics
     */
    updateDeliveryStats: async function(stats) {
      const updates = {};
      
      if (stats.openRate !== undefined) {
        updates.openRate = stats.openRate;
      }
      
      if (stats.clickRate !== undefined) {
        updates.clickRate = stats.clickRate;
      }
      
      if (stats.successfulDeliveries !== undefined) {
        updates.successfulDeliveries = stats.successfulDeliveries;
      }
      
      if (stats.failedDeliveries !== undefined) {
        updates.failedDeliveries = stats.failedDeliveries;
      }
      
      await this.update(updates);
      return this;
    },

    /**
     * Personalize notification for specific user
     */
    personalizeForUser: async function(userId) {
      const { User } = require('./index');
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const personalizedNotification = {
        ...this.toJSON(),
        title: Notification.hooks.personalizeMessage(this.title, user, this.variables),
        message: Notification.hooks.personalizeMessage(this.message, user, this.variables),
        personalization: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email
        }
      };
      
      return personalizedNotification;
    },

    /**
     * Check if notification is deliverable
     */
    isDeliverable: function() {
      if (this.status === 'sent' || this.status === 'cancelled' || this.status === 'expired') {
        return false;
      }
      
      if (this.expiresAt && new Date(this.expiresAt) <= new Date()) {
        return false;
      }
      
      return true;
    },

    /**
     * Get notification analytics
     */
    getAnalytics: async function() {
      try {
        const analytics = await YachiAnalytics.getNotificationAnalytics(this.id);
        return analytics;
      } catch (error) {
        logger.error('Get notification analytics failed:', error);
        return null;
      }
    },

    /**
     * Clone notification for different audience
     */
    clone: async function(newTarget) {
      const cloneData = {
        ...this.toJSON(),
        id: undefined,
        status: 'draft',
        totalRecipients: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        openRate: 0,
        clickRate: 0,
        channelStatus: {},
        retryCount: 0,
        sentAt: null
      };
      
      if (newTarget.targetType) {
        cloneData.targetType = newTarget.targetType;
      }
      
      if (newTarget.targetId) {
        cloneData.targetId = newTarget.targetId;
      }
      
      if (newTarget.targetSegment) {
        cloneData.targetSegment = newTarget.targetSegment;
      }
      
      const clonedNotification = await Notification.create(cloneData);
      return clonedNotification;
    }
  };
};

// Static Methods
Notification.findUserNotifications = async function(userId, filters = {}) {
  const where = { userId };
  
  // Apply filters
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.type) {
    where.type = filters.type;
  }
  
  if (filters.priority) {
    where.priority = filters.priority;
  }
  
  if (filters.unreadOnly) {
    where.readAt = null;
  }
  
  return await Notification.findAll({
    where,
    order: [
      ['createdAt', 'DESC']
    ],
    limit: filters.limit || 50,
    offset: filters.offset || 0
  });
};

Notification.findScheduledNotifications = async function() {
  return await Notification.findAll({
    where: {
      status: 'scheduled',
      scheduledAt: {
        [sequelize.Op.lte]: new Date()
      }
    },
    order: [['scheduledAt', 'ASC']],
    limit: 100
  });
};

Notification.findFailedNotifications = async function() {
  return await Notification.findAll({
    where: {
      status: 'failed',
      retryCount: { [sequelize.Op.lt]: sequelize.col('maxRetries') },
      [sequelize.Op.or]: [
        { retryAfter: null },
        { retryAfter: { [sequelize.Op.lte]: new Date() } }
      ]
    },
    order: [['retryCount', 'ASC']],
    limit: 50
  });
};

Notification.getNotificationStats = async function(timeRange = '7d') {
  const startDate = new Date();
  switch (timeRange) {
    case '24h':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }
  
  const stats = await Notification.findAll({
    where: {
      createdAt: { [sequelize.Op.gte]: startDate }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalNotifications'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "sent" THEN 1 ELSE 0 END')), 'sentNotifications'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "failed" THEN 1 ELSE 0 END')), 'failedNotifications'],
      [sequelize.fn('AVG', sequelize.col('open_rate')), 'avgOpenRate'],
      [sequelize.fn('AVG', sequelize.col('click_rate')), 'avgClickRate'],
      [sequelize.fn('SUM', sequelize.col('total_recipients')), 'totalRecipients'],
      [sequelize.fn('SUM', sequelize.col('successful_deliveries')), 'totalSuccessfulDeliveries']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

Notification.createBulkNotifications = async function(notificationsData) {
  const notifications = [];
  
  for (const data of notificationsData) {
    try {
      const notification = await Notification.create(data);
      notifications.push(notification);
    } catch (error) {
      logger.error('Bulk notification creation failed:', error);
      // Continue with other notifications
    }
  }
  
  return notifications;
};

Notification.markAllAsRead = async function(userId) {
  return await Notification.update(
    { readAt: new Date() },
    {
      where: {
        userId,
        readAt: null
      }
    }
  );
};

// Associations will be defined in the model index file
Notification.associate = function(models) {
  Notification.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE'
  });
  
  Notification.hasMany(models.NotificationClick, {
    foreignKey: 'notificationId',
    as: 'clicks'
  });
  
  Notification.hasMany(models.NotificationOpen, {
    foreignKey: 'notificationId',
    as: 'opens'
  });
};

module.exports = Notification;