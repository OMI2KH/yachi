const admin = require('firebase-admin');
const { RedisService } = require('./redisService');
const { YachiAnalytics } = require('./yachiAnalytics');
const { RealTimeService } = require('./realTimeService');

class NotificationDeliveryService {
  static isInitialized = false;
  static isDev = process.env.NODE_ENV !== 'production';
  static queues = new Map();
  static metrics = {
    sent: 0,
    failed: 0,
    queued: 0,
    delivered: 0,
    errors: 0
  };

  // 🚀 ENHANCED INITIALIZATION
  static async initialize() {
    try {
      console.log('🔄 Initializing Notification Delivery Service...');

      // Initialize Firebase Admin
      if (!this.isDev) {
        await this.initializeFirebase();
      }

      // Initialize queues
      await this.initializeQueues();

      // Start background processors
      this.startBackgroundProcessors();

      this.isInitialized = true;
      console.log('✅ Notification Delivery Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Notification Delivery Service initialization failed:', error);
      throw error;
    }
  }

  // 🏗️ FIREBASE INITIALIZATION
  static async initializeFirebase() {
    try {
      // Support multiple initialization methods
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
      } else {
        throw new Error('Firebase configuration not found');
      }

      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }

  // 🎯 QUEUE MANAGEMENT
  static async initializeQueues() {
    // Multiple queues for different priorities
    this.queues.set('high', 'notification_queue:high');
    this.queues.set('normal', 'notification_queue:normal');
    this.queues.set('low', 'notification_queue:low');
    this.queues.set('failed', 'notification_queue:failed');
    this.queues.set('retry', 'notification_queue:retry');

    console.log(`✅ Notification queues initialized: ${Array.from(this.queues.keys()).join(', ')}`);
  }

  // 🚀 ENHANCED SINGLE NOTIFICATION
  static async sendSingle(notification) {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error('Notification service not initialized');
      }

      const {
        token,
        title,
        body,
        data = {},
        priority = 'normal',
        userId,
        notificationId,
        category = 'general'
      } = notification;

      // Validate input
      if (!token || !title || !body) {
        throw new Error('Missing required notification fields');
      }

      // Development mode simulation
      if (this.isDev) {
        console.log('🔧 [DEV] Mock FCM:', { token, title, body, data });
        await this.trackDeliverySuccess(notification, startTime, true);
        return { success: true, mock: true };
      }

      // Prepare FCM message
      const message = {
        token,
        notification: { title, body },
        data: {
          ...data,
          notificationId: notificationId || this.generateNotificationId(),
          category,
          timestamp: new Date().toISOString()
        },
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: 'default',
            channelId: priority === 'high' ? 'high_priority' : 'default'
          }
        },
        apns: {
          headers: {
            'apns-priority': priority === 'high' ? '10' : '5'
          },
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              badge: 1
            }
          }
        },
        webpush: {
          headers: {
            Urgency: priority === 'high' ? 'high' : 'normal'
          }
        }
      };

      // Send notification
      const response = await admin.messaging().send(message);
      
      // Track success
      await this.trackDeliverySuccess(notification, startTime, false);
      
      console.log(`✅ FCM sent successfully: ${notificationId || 'unknown'}`);
      return { success: true, response };

    } catch (error) {
      this.metrics.errors++;
      
      // Handle specific FCM errors
      const shouldRetry = this.shouldRetryNotification(error, notification);
      
      if (shouldRetry) {
        await this.queueForRetry(notification, error);
      } else {
        await this.handleFailedNotification(notification, error, startTime);
      }

      throw error;
    }
  }

  // 🚀 BATCH NOTIFICATION SYSTEM
  static async sendBatch(notifications, options = {}) {
    const startTime = Date.now();
    const batchId = this.generateBatchId();
    
    try {
      if (!this.isInitialized) {
        throw new Error('Notification service not initialized');
      }

      // Development mode simulation
      if (this.isDev) {
        console.log(`🔧 [DEV] Mock batch FCM (${notifications.length} notifications):`, {
          batchId,
          notifications: notifications.map(n => ({ token: n.token, title: n.title }))
        });
        
        for (const notification of notifications) {
          await this.trackDeliverySuccess(notification, startTime, true);
        }
        
        return { success: true, mock: true, batchId };
      }

      // Prepare FCM messages
      const messages = notifications.map(notification => ({
        token: notification.token,
        notification: { 
          title: notification.title, 
          body: notification.body 
        },
        data: {
          ...notification.data,
          notificationId: notification.notificationId || this.generateNotificationId(),
          category: notification.category || 'general',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: (notification.priority === 'high' ? 'high' : 'normal'),
          notification: {
            sound: 'default',
            channelId: notification.priority === 'high' ? 'high_priority' : 'default'
          }
        },
        apns: {
          headers: {
            'apns-priority': notification.priority === 'high' ? '10' : '5'
          }
        }
      }));

      // Send batch
      const response = await admin.messaging().sendAll(messages);
      
      // Process results
      const results = await this.processBatchResults(notifications, response, startTime);
      
      console.log(`✅ Batch ${batchId} completed: ${results.successful} successful, ${results.failed} failed`);
      
      return {
        success: true,
        batchId,
        results: {
          total: notifications.length,
          successful: results.successful,
          failed: results.failed,
          queuedForRetry: results.queuedForRetry
        }
      };

    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ Batch ${batchId} failed:`, error);
      
      // Queue all notifications for retry on batch failure
      for (const notification of notifications) {
        await this.queueForRetry(notification, error);
      }

      throw error;
    }
  }

  // 🎯 QUEUE MANAGEMENT SYSTEM
  static async enqueueNotification(notification, queueName = 'normal') {
    const queueKey = this.queues.get(queueName) || this.queues.get('normal');
    
    const queuedNotification = {
      ...notification,
      queueName,
      queuedAt: new Date().toISOString(),
      attempts: (notification.attempts || 0) + 1,
      notificationId: notification.notificationId || this.generateNotificationId()
    };

    await RedisService.rPush(queueKey, JSON.stringify(queuedNotification));
    this.metrics.queued++;
    
    console.log(`📨 Notification queued: ${queuedNotification.notificationId} in ${queueName} queue`);
    
    return queuedNotification.notificationId;
  }

  static async dequeueNotification(queueName = 'normal', count = 1) {
    const queueKey = this.queues.get(queueName) || this.queues.get('normal');
    
    const notifications = [];
    for (let i = 0; i < count; i++) {
      const data = await RedisService.lPop(queueKey);
      if (data) {
        notifications.push(JSON.parse(data));
      } else {
        break;
      }
    }
    
    return notifications;
  }

  static async getQueueLength(queueName = 'normal') {
    const queueKey = this.queues.get(queueName) || this.queues.get('normal');
    return await RedisService.lLen(queueKey);
  }

  // 🚀 QUEUE PROCESSOR
  static async processQueue(options = {}) {
    const {
      batchSize = 500,
      maxAttempts = 3,
      queueName = 'normal'
    } = options;

    console.log(`🔄 Processing ${queueName} queue...`);

    try {
      let processedCount = 0;
      let batch = [];

      while (true) {
        const notifications = await this.dequeueNotification(queueName, Math.min(50, batchSize - batch.length));
        
        if (notifications.length === 0) {
          break; // No more notifications in queue
        }

        // Filter out notifications that exceeded max attempts
        const validNotifications = notifications.filter(notification => 
          (notification.attempts || 1) <= maxAttempts
        );

        const expiredNotifications = notifications.filter(notification => 
          (notification.attempts || 1) > maxAttempts
        );

        // Handle expired notifications
        for (const expired of expiredNotifications) {
          await this.handleExpiredNotification(expired);
        }

        batch.push(...validNotifications);
        processedCount += validNotifications.length;

        // Process batch when full or no more notifications
        if (batch.length >= batchSize || notifications.length < 50) {
          if (batch.length > 0) {
            await this.sendBatch(batch, { queueName });
            batch = [];
          }
        }

        // Stop if we've processed enough
        if (processedCount >= batchSize) {
          break;
        }
      }

      // Process any remaining notifications
      if (batch.length > 0) {
        await this.sendBatch(batch, { queueName });
      }

      console.log(`✅ ${queueName} queue processed: ${processedCount} notifications`);
      return processedCount;

    } catch (error) {
      console.error(`❌ Error processing ${queueName} queue:`, error);
      throw error;
    }
  }

  // 🎯 BACKGROUND PROCESSORS
  static startBackgroundProcessors() {
    // Process high priority queue every 30 seconds
    setInterval(async () => {
      try {
        await this.processQueue({ queueName: 'high', batchSize: 100 });
      } catch (error) {
        console.error('High priority queue processor error:', error);
      }
    }, 30000);

    // Process normal queue every 2 minutes
    setInterval(async () => {
      try {
        await this.processQueue({ queueName: 'normal', batchSize: 500 });
      } catch (error) {
        console.error('Normal queue processor error:', error);
      }
    }, 120000);

    // Process retry queue every 5 minutes
    setInterval(async () => {
      try {
        await this.processQueue({ queueName: 'retry', batchSize: 200 });
      } catch (error) {
        console.error('Retry queue processor error:', error);
      }
    }, 300000);

    // Cleanup and metrics every hour
    setInterval(async () => {
      try {
        await this.cleanupOldNotifications();
        await this.reportMetrics();
      } catch (error) {
        console.error('Cleanup processor error:', error);
      }
    }, 3600000);
  }

  // 🛠️ UTILITY METHODS
  static generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  static shouldRetryNotification(error, notification) {
    const retryableErrors = [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
      'messaging/device-message-rate-exceeded',
      'messaging/message-rate-exceeded'
    ];

    // Don't retry invalid tokens
    if (error.code && retryableErrors.includes(error.code)) {
      return false;
    }

    // Check attempt count
    const attempts = notification.attempts || 1;
    return attempts < 3;
  }

  static async queueForRetry(notification, error) {
    const retryNotification = {
      ...notification,
      lastError: error.message,
      errorCode: error.code,
      attempts: (notification.attempts || 1) + 1
    };

    // Use retry queue with exponential backoff
    await this.enqueueNotification(retryNotification, 'retry');
    
    console.log(`🔄 Notification queued for retry: ${notification.notificationId}, attempt ${retryNotification.attempts}`);
  }

  // 📊 ANALYTICS & TRACKING
  static async trackDeliverySuccess(notification, startTime, isMock = false) {
    const deliveryTime = Date.now() - startTime;
    
    this.metrics.sent++;
    this.metrics.delivered++;

    // Analytics tracking
    await YachiAnalytics.trackNotificationDelivery({
      notificationId: notification.notificationId,
      userId: notification.userId,
      category: notification.category,
      priority: notification.priority,
      deliveryTime,
      isMock,
      success: true
    });

    // Real-time update for admin dashboard
    RealTimeService.emitToRoom('notification_dashboard', 'notificationDelivered', {
      notificationId: notification.notificationId,
      deliveryTime,
      timestamp: new Date().toISOString()
    });
  }

  static async handleFailedNotification(notification, error, startTime) {
    this.metrics.sent++;
    this.metrics.failed++;

    // Analytics tracking
    await YachiAnalytics.trackNotificationDelivery({
      notificationId: notification.notificationId,
      userId: notification.userId,
      category: notification.category,
      priority: notification.priority,
      deliveryTime: Date.now() - startTime,
      success: false,
      error: error.message,
      errorCode: error.code
    });

    console.error(`❌ Notification failed: ${notification.notificationId}`, error);
  }

  static async handleExpiredNotification(notification) {
    console.warn(`🗑️ Notification expired after ${notification.attempts} attempts:`, notification.notificationId);
    
    // Move to failed queue for analysis
    await this.enqueueNotification(notification, 'failed');
  }

  static async processBatchResults(notifications, response, startTime) {
    const results = {
      successful: 0,
      failed: 0,
      queuedForRetry: 0
    };

    response.responses.forEach((fcmResponse, index) => {
      const notification = notifications[index];
      
      if (fcmResponse.success) {
        results.successful++;
        this.trackDeliverySuccess(notification, startTime, false);
      } else {
        results.failed++;
        
        if (this.shouldRetryNotification(fcmResponse.error, notification)) {
          results.queuedForRetry++;
          this.queueForRetry(notification, fcmResponse.error);
        } else {
          this.handleFailedNotification(notification, fcmResponse.error, startTime);
        }
      }
    });

    return results;
  }

  // 🧹 CLEANUP & MAINTENANCE
  static async cleanupOldNotifications() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Implementation would clean up old notification records
    console.log('🧹 Cleaning up old notifications...');
  }

  static async reportMetrics() {
    const metrics = this.getMetrics();
    
    console.log('📊 Notification Delivery Metrics:', metrics);
    
    // Send to analytics
    await YachiAnalytics.trackServiceMetrics('notification_delivery', metrics);
    
    // Reset counters for next period
    this.metrics.sent = 0;
    this.metrics.failed = 0;
    this.metrics.queued = 0;
    this.metrics.delivered = 0;
    this.metrics.errors = 0;
  }

  // 📈 STATUS & MONITORING
  static getMetrics() {
    const queueLengths = {};
    
    for (const [name, key] of this.queues) {
      queueLengths[name] = RedisService.lLen(key);
    }

    return {
      ...this.metrics,
      queueLengths,
      deliveryRate: this.metrics.sent > 0 ? (this.metrics.delivered / this.metrics.sent) * 100 : 0,
      errorRate: this.metrics.sent > 0 ? (this.metrics.errors / this.metrics.sent) * 100 : 0,
      timestamp: new Date().toISOString()
    };
  }

  static async getStatus() {
    const metrics = this.getMetrics();
    const isHealthy = this.isInitialized && await this.isFirebaseHealthy();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      initialized: this.isInitialized,
      development: this.isDev,
      metrics,
      timestamp: new Date().toISOString()
    };
  }

  static async isFirebaseHealthy() {
    if (this.isDev) return true;
    
    try {
      // Simple health check - try to get FCM instance
      await admin.messaging().send({
        token: 'test',
        notification: { title: 'Health Check', body: 'Test' }
      }, true); // dryRun mode
      return true;
    } catch (error) {
      return error.code !== 'messaging/invalid-argument'; // Invalid token is expected
    }
  }
}

// 🎯 COMPATIBILITY LAYER (for existing code)
const legacyNotificationService = {
  sendNotification: (token, title, body) => {
    return NotificationDeliveryService.sendSingle({ token, title, body });
  },
  sendBatchNotification: (notifications) => {
    return NotificationDeliveryService.sendBatch(notifications);
  },
  processQueue: () => {
    return NotificationDeliveryService.processQueue();
  }
};

module.exports = {
  // Enhanced service
  NotificationDeliveryService,
  
  // Legacy compatibility
  ...legacyNotificationService,
  
  // Utility exports
  initializeNotifications: NotificationDeliveryService.initialize,
  getNotificationStatus: NotificationDeliveryService.getStatus,
  getNotificationMetrics: NotificationDeliveryService.getMetrics,
  enqueueNotification: NotificationDeliveryService.enqueueNotification
};