const { CacheService } = require('./cacheService');
const { RealTimeService } = require('./realTimeService');
const { YachiAnalytics } = require('./yachiAnalytics');
const { YachiGamification } = require('./yachiGamification');

class YachiNotifications {
  static notificationQueue = [];
  static isProcessingQueue = false;
  static notificationTemplates = new Map();
  static userPreferences = new Map();

  // 🚀 INITIALIZATION
  static async initialize() {
    await this.loadNotificationTemplates();
    await this.loadDefaultPreferences();
    
    // Start background processors
    this.startBackgroundProcessors();
    
    console.log('✅ Yachi Notification Engine initialized');
    console.log(`📢 Loaded: ${this.notificationTemplates.size} notification templates`);
  }

  // 🎯 NOTIFICATION TEMPLATES
  static async loadNotificationTemplates() {
    const templates = [
      // 🔔 SERVICE & BOOKING NOTIFICATIONS
      {
        id: 'booking_created',
        category: 'booking',
        title: 'New Booking Request! 🎉',
        message: 'You have a new booking request for {serviceName}',
        priority: 'high',
        channels: ['push', 'in_app', 'email'],
        actions: ['accept', 'decline', 'view_details'],
        expiry: 3600000 // 1 hour
      },
      {
        id: 'booking_accepted',
        category: 'booking',
        title: 'Booking Confirmed! ✅',
        message: 'Your booking for {serviceName} has been accepted by {providerName}',
        priority: 'medium',
        channels: ['push', 'in_app'],
        actions: ['view_booking', 'contact_provider']
      },
      {
        id: 'booking_completed',
        category: 'booking',
        title: 'Service Completed! 🏆',
        message: 'Your {serviceName} service has been completed successfully',
        priority: 'medium',
        channels: ['push', 'in_app', 'email'],
        actions: ['rate_service', 'view_invoice', 'book_again']
      },
      {
        id: 'booking_cancelled',
        category: 'booking',
        title: 'Booking Cancelled ❌',
        message: 'Booking {bookingId} has been cancelled by {cancelledBy}',
        priority: 'high',
        channels: ['push', 'in_app', 'email'],
        actions: ['view_refund', 'contact_support']
      },

      // 💬 CHAT & MESSAGING NOTIFICATIONS
      {
        id: 'new_message',
        category: 'chat',
        title: 'New Message 💬',
        message: 'New message from {senderName}',
        priority: 'medium',
        channels: ['push', 'in_app'],
        actions: ['reply', 'view_chat']
      },
      {
        id: 'message_read',
        category: 'chat',
        title: 'Message Read 👀',
        message: '{receiverName} read your message',
        priority: 'low',
        channels: ['in_app'],
        actions: []
      },

      // 🎪 GAMIFICATION NOTIFICATIONS
      {
        id: 'achievement_unlocked',
        category: 'gamification',
        title: 'Achievement Unlocked! 🏆',
        message: 'You unlocked the {achievementName} achievement!',
        priority: 'medium',
        channels: ['push', 'in_app'],
        actions: ['share', 'view_achievements']
      },
      {
        id: 'level_up',
        category: 'gamification',
        title: 'Level Up! 📈',
        message: 'Congratulations! You reached Level {newLevel}',
        priority: 'medium',
        channels: ['push', 'in_app'],
        actions: ['view_profile', 'share_progress']
      },
      {
        id: 'points_earned',
        category: 'gamification',
        title: 'Points Earned! 💰',
        message: 'You earned {points} Yachi Points',
        priority: 'low',
        channels: ['in_app'],
        actions: ['view_points']
      },

      // 📢 ADVERTISEMENT NOTIFICATIONS
      {
        id: 'ad_approved',
        category: 'advertising',
        title: 'Ad Approved! ✅',
        message: 'Your advertisement "{adTitle}" has been approved and is now live',
        priority: 'medium',
        channels: ['push', 'in_app'],
        actions: ['view_ad', 'analytics']
      },
      {
        id: 'ad_performance',
        category: 'advertising',
        title: 'Ad Performance Update 📊',
        message: 'Your ad "{adTitle}" has {impressions} impressions and {clicks} clicks',
        priority: 'low',
        channels: ['in_app', 'email'],
        actions: ['view_analytics', 'optimize_ad']
      },

      // 🔐 VERIFICATION NOTIFICATIONS
      {
        id: 'verification_success',
        category: 'verification',
        title: 'Verification Successful! ✅',
        message: 'Your {verificationType} verification has been approved',
        priority: 'high',
        channels: ['push', 'in_app', 'email'],
        actions: ['view_profile', 'complete_profile']
      },
      {
        id: 'verification_failed',
        category: 'verification',
        title: 'Verification Required ⚠️',
        message: 'Your {verificationType} verification needs attention',
        priority: 'high',
        channels: ['push', 'in_app', 'email'],
        actions: ['retry_verification', 'contact_support']
      },

      // 💰 PAYMENT & EARNING NOTIFICATIONS
      {
        id: 'payment_received',
        category: 'payment',
        title: 'Payment Received! 💸',
        message: 'You received {amount} for {serviceName}',
        priority: 'high',
        channels: ['push', 'in_app', 'email'],
        actions: ['view_earnings', 'withdraw_funds']
      },
      {
        id: 'withdrawal_processed',
        category: 'payment',
        title: 'Withdrawal Processed ✅',
        message: 'Your withdrawal of {amount} has been processed',
        priority: 'medium',
        channels: ['push', 'in_app', 'email'],
        actions: ['view_transaction']
      },

      // 🏆 REVIEW & RATING NOTIFICATIONS
      {
        id: 'new_review',
        category: 'reviews',
        title: 'New Review! ⭐',
        message: 'You received a {rating} star review for {serviceName}',
        priority: 'medium',
        channels: ['push', 'in_app'],
        actions: ['view_review', 'thank_reviewer']
      },
      {
        id: 'review_reminder',
        category: 'reviews',
        title: 'Leave a Review 📝',
        message: 'How was your experience with {providerName}?',
        priority: 'low',
        channels: ['push', 'in_app'],
        actions: ['write_review', 'remind_later']
      }
    ];

    templates.forEach(template => {
      this.notificationTemplates.set(template.id, template);
    });
  }

  // 🎯 USER PREFERENCES
  static async loadDefaultPreferences() {
    const defaultPrefs = {
      push_enabled: true,
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
      quiet_hours: { start: '22:00', end: '08:00' },
      categories: {
        booking: { push: true, email: true, in_app: true },
        chat: { push: true, email: false, in_app: true },
        gamification: { push: true, email: false, in_app: true },
        advertising: { push: false, email: true, in_app: true },
        verification: { push: true, email: true, in_app: true },
        payment: { push: true, email: true, in_app: true },
        reviews: { push: true, email: false, in_app: true }
      }
    };

    this.userPreferences.set('default', defaultPrefs);
  }

  // 🚀 CORE NOTIFICATION METHODS
  static async sendStatusUpdate(job) {
    const notification = {
      templateId: 'booking_status_update',
      userId: job.clientId,
      data: {
        jobNumber: job.jobNumber,
        status: job.status,
        serviceName: job.serviceName,
        providerName: job.providerName,
        timestamp: new Date().toISOString()
      },
      priority: 'medium',
      channels: ['push', 'in_app']
    };

    await this.queueNotification(notification);
    console.log(`📢 Job status update: ${job.jobNumber} - ${job.status}`);
  }

  static async sendCancellationNotification(job, cancelledBy) {
    const notification = {
      templateId: 'booking_cancelled',
      userId: job.clientId,
      data: {
        jobNumber: job.jobNumber,
        cancelledBy: cancelledBy,
        serviceName: job.serviceName,
        refundAmount: job.refundAmount,
        timestamp: new Date().toISOString()
      },
      priority: 'high',
      channels: ['push', 'in_app', 'email']
    };

    await this.queueNotification(notification);
    console.log(`❌ Job cancelled: ${job.jobNumber} by ${cancelledBy}`);
  }

  // 🎯 VERIFICATION NOTIFICATIONS
  static async sendVerificationUpdate(userId, verificationType, status) {
    const templateId = status === 'verified' ? 'verification_success' : 'verification_failed';
    
    const notification = {
      templateId,
      userId,
      data: {
        verificationType,
        status,
        timestamp: new Date().toISOString()
      },
      priority: 'high',
      channels: ['push', 'in_app', 'email']
    };

    await this.queueNotification(notification);
    console.log(`✅ Verification ${status}: ${verificationType} for user ${userId}`);
  }

  static async sendSelfieVerificationSuccess(userId) {
    const notification = {
      templateId: 'verification_success',
      userId,
      data: {
        verificationType: 'selfie',
        status: 'verified',
        timestamp: new Date().toISOString()
      },
      priority: 'medium',
      channels: ['push', 'in_app']
    };

    await this.queueNotification(notification);
  }

  // 🎯 BOOKING & SERVICE NOTIFICATIONS
  static async sendNewBookingNotification(providerId, booking) {
    const notification = {
      templateId: 'booking_created',
      userId: providerId,
      data: {
        serviceName: booking.serviceName,
        clientName: booking.clientName,
        bookingId: booking.id,
        proposedTime: booking.proposedTime,
        budget: booking.budget,
        timestamp: new Date().toISOString()
      },
      priority: 'high',
      channels: ['push', 'in_app'],
      expiry: 900000 // 15 minutes to respond
    };

    await this.queueNotification(notification);
  }

  static async sendBookingConfirmation(clientId, booking) {
    const notification = {
      templateId: 'booking_accepted',
      userId: clientId,
      data: {
        serviceName: booking.serviceName,
        providerName: booking.providerName,
        bookingId: booking.id,
        confirmedTime: booking.confirmedTime,
        providerRating: booking.providerRating,
        timestamp: new Date().toISOString()
      },
      priority: 'medium',
      channels: ['push', 'in_app']
    };

    await this.queueNotification(notification);
  }

  static async sendServiceReminder(booking) {
    const notification = {
      templateId: 'booking_reminder',
      userId: booking.clientId,
      data: {
        serviceName: booking.serviceName,
        providerName: booking.providerName,
        scheduledTime: booking.scheduledTime,
        bookingId: booking.id,
        timestamp: new Date().toISOString()
      },
      priority: 'medium',
      channels: ['push', 'in_app']
    };

    await this.queueNotification(notification);
  }

  // 🎯 AVAILABILITY NOTIFICATIONS
  static async sendAvailabilityUpdate(workerId) {
    // Notify clients who previously showed interest
    const interestedClients = await this.getInterestedClients(workerId);
    
    for (const clientId of interestedClients) {
      const notification = {
        templateId: 'provider_available',
        userId: clientId,
        data: {
          workerName: await this.getUserName(workerId),
          workerRating: await this.getWorkerRating(workerId),
          timestamp: new Date().toISOString()
        },
        priority: 'medium',
        channels: ['push', 'in_app']
      };

      await this.queueNotification(notification);
    }
  }

  // 🎯 GAMIFICATION NOTIFICATIONS
  static async sendAchievementNotification(userId, achievement) {
    const notification = {
      templateId: 'achievement_unlocked',
      userId,
      data: {
        achievementName: achievement.name,
        achievementPoints: achievement.points,
        achievementIcon: achievement.icon,
        rarity: achievement.rarity,
        timestamp: new Date().toISOString()
      },
      priority: 'medium',
      channels: ['push', 'in_app']
    };

    await this.queueNotification(notification);
  }

  static async sendLevelUpNotification(userId, levelData) {
    const notification = {
      templateId: 'level_up',
      userId,
      data: {
        newLevel: levelData.level,
        levelName: levelData.name,
        rewards: levelData.rewards,
        timestamp: new Date().toISOString()
      },
      priority: 'medium',
      channels: ['push', 'in_app']
    };

    await this.queueNotification(notification);
  }

  // 🎯 ADVERTISEMENT NOTIFICATIONS
  static async sendAdPerformanceUpdate(userId, adData) {
    const notification = {
      templateId: 'ad_performance',
      userId,
      data: {
        adTitle: adData.title,
        impressions: adData.impressions,
        clicks: adData.clicks,
        conversions: adData.conversions,
        ctr: adData.ctr,
        timestamp: new Date().toISOString()
      },
      priority: 'low',
      channels: ['in_app', 'email']
    };

    await this.queueNotification(notification);
  }

  static async sendAdApprovalNotification(userId, adData) {
    const notification = {
      templateId: 'ad_approved',
      userId,
      data: {
        adTitle: adData.title,
        adType: adData.type,
        startDate: adData.startDate,
        budget: adData.budget,
        timestamp: new Date().toISOString()
      },
      priority: 'medium',
      channels: ['push', 'in_app']
    };

    await this.queueNotification(notification);
  }

  // 🚀 NOTIFICATION QUEUE MANAGEMENT
  static async queueNotification(notification) {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedNotification = {
      ...notification,
      id: notificationId,
      queuedAt: new Date().toISOString(),
      status: 'queued'
    };

    this.notificationQueue.push(queuedNotification);

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processNotificationQueue();
    }

    return notificationId;
  }

  static async processNotificationQueue() {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      const batch = this.notificationQueue.splice(0, 50); // Process 50 notifications at a time

      for (const notification of batch) {
        try {
          await this.deliverNotification(notification);
        } catch (error) {
          console.error('Failed to deliver notification:', error);
          await this.handleFailedNotification(notification, error);
        }
      }
    } finally {
      this.isProcessingQueue = false;

      // Process remaining notifications
      if (this.notificationQueue.length > 0) {
        setImmediate(() => this.processNotificationQueue());
      }
    }
  }

  static async deliverNotification(notification) {
    const userPrefs = await this.getUserPreferences(notification.userId);
    const template = this.notificationTemplates.get(notification.templateId);

    if (!template) {
      throw new Error(`Notification template not found: ${notification.templateId}`);
    }

    // Check if notification should be sent based on user preferences and quiet hours
    if (!await this.shouldSendNotification(notification.userId, template, userPrefs)) {
      console.log(`Skipping notification ${notification.id} due to user preferences`);
      return;
    }

    // Process each channel
    for (const channel of notification.channels) {
      if (userPrefs.categories[template.category]?.[channel]) {
        await this.sendViaChannel(notification, template, channel, userPrefs);
      }
    }

    // Update notification status
    notification.status = 'delivered';
    notification.deliveredAt = new Date().toISOString();

    // Track analytics
    YachiAnalytics.trackNotificationDelivery(notification);

    console.log(`📢 Notification delivered: ${notification.id} to user ${notification.userId}`);
  }

  static async sendViaChannel(notification, template, channel, userPrefs) {
    const processedMessage = this.processTemplate(template.message, notification.data);
    const processedTitle = this.processTemplate(template.title, notification.data);

    switch (channel) {
      case 'push':
        await this.sendPushNotification(notification.userId, processedTitle, processedMessage, template, notification.data);
        break;
      case 'in_app':
        await this.sendInAppNotification(notification.userId, processedTitle, processedMessage, template, notification.data);
        break;
      case 'email':
        await this.sendEmailNotification(notification.userId, processedTitle, processedMessage, template, notification.data);
        break;
      case 'sms':
        await this.sendSmsNotification(notification.userId, processedMessage, template, notification.data);
        break;
    }
  }

  // 🎯 CHANNEL-SPECIFIC DELIVERY
  static async sendPushNotification(userId, title, message, template, data) {
    const pushData = {
      to: await this.getUserPushToken(userId),
      title,
      body: message,
      data: {
        notificationId: data.notificationId,
        type: template.category,
        action: template.actions[0],
        ...data
      },
      priority: template.priority === 'high' ? 'high' : 'normal'
    };

    // Implementation would integrate with FCM/APNS
    console.log(`📱 Push notification sent to user ${userId}: ${title}`);
    
    // Real-time delivery confirmation
    RealTimeService.emitToUser(userId, 'pushNotification', {
      title,
      message,
      data: pushData.data,
      timestamp: new Date().toISOString()
    });
  }

  static async sendInAppNotification(userId, title, message, template, data) {
    const inAppNotification = {
      id: `inapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type: template.category,
      priority: template.priority,
      actions: template.actions,
      data,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Store in user's notification inbox
    await this.storeInAppNotification(userId, inAppNotification);

    // Real-time delivery
    RealTimeService.emitToUser(userId, 'inAppNotification', inAppNotification);

    console.log(`💬 In-app notification sent to user ${userId}: ${title}`);
  }

  static async sendEmailNotification(userId, subject, body, template, data) {
    const emailData = {
      to: await this.getUserEmail(userId),
      subject,
      body: this.generateEmailTemplate(subject, body, template, data),
      template: template.id,
      data
    };

    // Implementation would integrate with email service (SendGrid, SES, etc.)
    console.log(`📧 Email notification sent to user ${userId}: ${subject}`);
  }

  static async sendSmsNotification(userId, message, template, data) {
    const smsData = {
      to: await this.getUserPhone(userId),
      message: this.processTemplate(message, data),
      template: template.id
    };

    // Implementation would integrate with SMS service (Twilio, etc.)
    console.log(`📞 SMS notification sent to user ${userId}`);
  }

  // 🛠️ UTILITY METHODS
  static processTemplate(template, data) {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  static async shouldSendNotification(userId, template, userPrefs) {
    // Check quiet hours
    if (this.isQuietHours(userPrefs.quiet_hours)) {
      return false;
    }

    // Check rate limiting
    const rateLimitKey = `notif_rate:${userId}:${template.category}`;
    const limit = await CacheService.checkRateLimit(rateLimitKey, 10, 3600000); // 10 per hour per category

    if (!limit.allowed) {
      console.log(`Rate limit exceeded for user ${userId}, category ${template.category}`);
      return false;
    }

    return true;
  }

  static isQuietHours(quietHours) {
    if (!quietHours) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const startTime = parseInt(quietHours.start.replace(':', ''));
    const endTime = parseInt(quietHours.end.replace(':', ''));

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  static generateEmailTemplate(subject, body, template, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: white; }
          .actions { margin-top: 20px; text-align: center; }
          .button { display: inline-block; padding: 10px 20px; margin: 5px; background: #10B981; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Yachi</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <p>${body}</p>
            <div class="actions">
              ${template.actions.map(action => 
                `<a href="${this.getActionUrl(action, data)}" class="button">${this.getActionLabel(action)}</a>`
              ).join('')}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static getActionUrl(action, data) {
    const baseUrl = process.env.APP_URL || 'https://yachi.app';
    const urls = {
      'view_details': `${baseUrl}/bookings/${data.bookingId}`,
      'contact_provider': `${baseUrl}/chat/${data.providerId}`,
      'rate_service': `${baseUrl}/bookings/${data.bookingId}/review`,
      'view_earnings': `${baseUrl}/earnings`,
      'view_analytics': `${baseUrl}/ads/${data.adId}/analytics`
    };
    return urls[action] || baseUrl;
  }

  static getActionLabel(action) {
    const labels = {
      'accept': 'Accept',
      'decline': 'Decline',
      'view_details': 'View Details',
      'contact_provider': 'Contact Provider',
      'rate_service': 'Rate Service',
      'view_earnings': 'View Earnings',
      'view_analytics': 'View Analytics'
    };
    return labels[action] || 'View';
  }

  // 🎯 BACKGROUND PROCESSORS
  static startBackgroundProcessors() {
    // Process notification queue every second
    setInterval(() => {
      this.processNotificationQueue();
    }, 1000);

    // Cleanup old notifications daily
    setInterval(() => {
      this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000);

    // Send scheduled notifications every minute
    setInterval(() => {
      this.sendScheduledNotifications();
    }, 60 * 1000);
  }

  static async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // Implementation would delete notifications older than 30 days
    console.log('🧹 Cleaned up old notifications');
  }

  static async sendScheduledNotifications() {
    // Implementation would send scheduled/reminder notifications
  }

  // 🎯 USER PREFERENCE MANAGEMENT
  static async getUserPreferences(userId) {
    const key = `user_prefs:${userId}`;
    const prefs = await CacheService.get(key);
    return prefs || this.userPreferences.get('default');
  }

  static async updateUserPreferences(userId, updates) {
    const currentPrefs = await this.getUserPreferences(userId);
    const newPrefs = { ...currentPrefs, ...updates };
    
    const key = `user_prefs:${userId}`;
    await CacheService.set(key, newPrefs, 0); // No expiration
    
    return newPrefs;
  }

  // 🎯 NOTIFICATION MANAGEMENT
  static async getUserNotifications(userId, limit = 20, offset = 0) {
    const key = `user_notifications:${userId}`;
    // Implementation would fetch from database with pagination
    return [];
  }

  static async markNotificationRead(userId, notificationId) {
    // Implementation would mark notification as read
    RealTimeService.emitToUser(userId, 'notificationRead', { notificationId });
  }

  static async markAllNotificationsRead(userId) {
    // Implementation would mark all notifications as read
    RealTimeService.emitToUser(userId, 'allNotificationsRead', {});
  }

  // 🎯 PLACEHOLDER METHODS
  static async handleFailedNotification(notification, error) {
    notification.status = 'failed';
    notification.error = error.message;
    console.error(`Notification failed: ${notification.id}`, error);
  }

  static async getInterestedClients(workerId) {
    // Implementation would fetch from database
    return [];
  }

  static async getUserName(userId) {
    // Implementation would fetch from database
    return `User ${userId}`;
  }

  static async getWorkerRating(workerId) {
    // Implementation would fetch from database
    return 4.8;
  }

  static async getUserPushToken(userId) {
    // Implementation would fetch from database
    return `push_token_${userId}`;
  }

  static async getUserEmail(userId) {
    // Implementation would fetch from database
    return `user${userId}@example.com`;
  }

  static async getUserPhone(userId) {
    // Implementation would fetch from database
    return `+1234567890`;
  }

  static async storeInAppNotification(userId, notification) {
    const key = `inapp_notifications:${userId}`;
    const notifications = await CacheService.get(key) || [];
    notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications.splice(100);
    }
    
    await CacheService.set(key, notifications, 86400); // 24 hours
  }

  // 📊 STATUS & MONITORING
  static getStatus() {
    return {
      queueLength: this.notificationQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      templatesCount: this.notificationTemplates.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { YachiNotifications };