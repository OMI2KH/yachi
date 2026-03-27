/**
 * Yachi Notification Service
 * Enterprise-level notification management with multi-channel delivery, smart routing, and analytics
 * Comprehensive notification system supporting push, email, SMS, and in-app notifications
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Internal services
import { authService } from './auth-service';
import { analyticsService } from './analytics-service';
import { storageService } from './storage-service';
import { errorService } from './error-service';

// Constants
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITY,
  DELIVERY_STATUS,
  USER_PREFERENCES
} from '../constants/notifications';
import { APP_ENV } from '../constants/app';

/**
 * Enterprise Notification Service Class
 */
class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.isPermissionGranted = false;
    this.expoPushToken = null;
    this.notificationListeners = new Map();
    this.deliveryQueue = [];
    this.failedDeliveries = new Map();
    this.userPreferences = new Map();

    // Configuration
    this.config = {
      maxRetryAttempts: 3,
      retryDelay: 5000,
      batchSize: 50,
      syncInterval: 30000,
      quietHours: {
        enabled: true,
        start: '22:00', // 10 PM
        end: '08:00'    // 8 AM
      },
      channels: {
        [NOTIFICATION_CHANNELS.PUSH]: true,
        [NOTIFICATION_CHANNELS.EMAIL]: false,
        [NOTIFICATION_CHANNELS.SMS]: false,
        [NOTIFICATION_CHANNELS.IN_APP]: true
      }
    };

    this.initialize();
  }

  /**
   * Initialize notification service with all providers
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request notification permissions
      await this.requestPermissions();

      // Get Expo push token
      await this.registerForPushNotifications();

      // Load user preferences
      await this.loadUserPreferences();

      // Set up notification handlers
      await this.setupNotificationHandlers();

      // Start background sync
      this.startBackgroundSync();

      this.isInitialized = true;

      console.log('🔔 Notification Service initialized successfully');

    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      errorService.captureError(error, {
        context: 'notification_service_initialization'
      });
    }
  }

  /**
   * Request notification permissions with platform-specific handling
   */
  async requestPermissions() {
    try {
      let status;

      if (Platform.OS === 'ios') {
        status = await request(PERMISSIONS.IOS.USER_NOTIFICATIONS);
      } else if (Platform.OS === 'android') {
        status = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      } else {
        // Web platform
        if ('Notification' in window) {
          status = await Notification.requestPermission();
        } else {
          status = RESULTS.UNAVAILABLE;
        }
      }

      this.isPermissionGranted = status === RESULTS.GRANTED || status === 'granted';

      // Track permission status
      await analyticsService.track('notification_permission_status', {
        status: this.isPermissionGranted ? 'granted' : 'denied',
        platform: Platform.OS
      });

      return this.isPermissionGranted;

    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get Expo push token
   */
  async registerForPushNotifications() {
    try {
      if (!Device.isDevice) {
        throw new Error('Push notifications are only available on physical devices');
      }

      if (!this.isPermissionGranted) {
        throw new Error('Notification permissions not granted');
      }

      // Configure notification handler
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.expoPushToken = token.data;

      // Register token with backend
      await this.registerPushTokenWithBackend(this.expoPushToken);

      console.log('Push notification token registered:', this.expoPushToken);

      return this.expoPushToken;

    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification with multi-channel delivery
   */
  async sendNotification(notificationData, options = {}) {
    try {
      // Validate notification data
      const validation = this.validateNotificationData(notificationData);
      if (!validation.isValid) {
        throw new Error(`Notification validation failed: ${validation.errors.join(', ')}`);
      }

      // Check user preferences
      const allowedChannels = await this.getAllowedChannels(notificationData.type);
      if (allowedChannels.length === 0) {
        throw new Error('No allowed delivery channels for this notification type');
      }

      // Check quiet hours
      if (await this.isInQuietHours() && options.priority !== NOTIFICATION_PRIORITY.URGENT) {
        // Schedule for later delivery
        return await this.scheduleNotification(notificationData, {
          ...options,
          scheduleAt: this.getNextAllowedDeliveryTime()
        });
      }

      // Create notification record
      const notification = this.createNotificationRecord(notificationData, options);

      // Deliver through allowed channels
      const deliveryResults = await this.deliverToChannels(notification, allowedChannels);

      // Track delivery analytics
      await this.trackDeliveryAnalytics(notification, deliveryResults);

      return {
        notification,
        deliveryResults,
        success: deliveryResults.some(result => result.success)
      };

    } catch (error) {
      console.error('Failed to send notification:', error);
      
      await errorService.captureError(error, {
        context: 'notification_delivery',
        notificationData,
        options
      });

      throw error;
    }
  }

  /**
   * Send push notification via Expo
   */
  async sendPushNotification(notification) {
    try {
      if (!this.expoPushToken) {
        throw new Error('No push token available');
      }

      const message = {
        to: this.expoPushToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data,
        priority: this.getExpoPriority(notification.priority),
        badge: notification.badge || 1
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(`Push notification failed: ${JSON.stringify(result.errors)}`);
      }

      return {
        success: true,
        messageId: result.data?.id,
        channel: NOTIFICATION_CHANNELS.PUSH
      };

    } catch (error) {
      console.error('Push notification delivery failed:', error);
      return {
        success: false,
        error: error.message,
        channel: NOTIFICATION_CHANNELS.PUSH
      };
    }
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(notification) {
    try {
      // Schedule local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: true,
          badge: notification.badge || 1
        },
        trigger: null, // Show immediately
      });

      // Store in local database for in-app notification center
      await this.storeInAppNotification(notification);

      return {
        success: true,
        channel: NOTIFICATION_CHANNELS.IN_APP
      };

    } catch (error) {
      console.error('In-app notification delivery failed:', error);
      return {
        success: false,
        error: error.message,
        channel: NOTIFICATION_CHANNELS.IN_APP
      };
    }
  }

  /**
   * Schedule notification for future delivery
   */
  async scheduleNotification(notificationData, scheduleOptions) {
    try {
      const {
        scheduleAt,
        repeat = null,
        timezone = 'Africa/Addis_Ababa'
      } = scheduleOptions;

      if (!scheduleAt) {
        throw new Error('Schedule time is required');
      }

      const scheduleTime = new Date(scheduleAt);
      if (scheduleTime <= new Date()) {
        throw new Error('Schedule time must be in the future');
      }

      const scheduledNotification = {
        ...notificationData,
        id: this.generateNotificationId(),
        scheduledAt: scheduleTime.toISOString(),
        repeat,
        timezone,
        status: DELIVERY_STATUS.SCHEDULED,
        createdAt: new Date().toISOString()
      };

      // Store in scheduled notifications
      await this.storeScheduledNotification(scheduledNotification);

      // Set up trigger for local notification
      if (this.isPermissionGranted) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notificationData.title,
            body: notificationData.body,
            data: notificationData.data
          },
          trigger: {
            date: scheduleTime
          },
        });
      }

      await analyticsService.track('notification_scheduled', {
        notificationId: scheduledNotification.id,
        scheduleAt: scheduleTime.toISOString(),
        type: notificationData.type
      });

      return scheduledNotification;

    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with filtering and pagination
   */
  async getNotifications(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type = null,
        channel = null,
        startDate = null,
        endDate = null
      } = options;

      const query = {
        page,
        limit,
        userId: await this.getCurrentUserId()
      };

      if (unreadOnly) query.unreadOnly = true;
      if (type) query.type = type;
      if (channel) query.channel = channel;
      if (startDate) query.startDate = startDate;
      if (endDate) query.endDate = endDate;

      // This would typically call your backend API
      const response = await this.fetchFromBackend('/notifications', query);

      return {
        notifications: response.notifications,
        pagination: response.pagination,
        unreadCount: response.unreadCount
      };

    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, options = {}) {
    try {
      if (!notificationId) {
        throw new Error('Notification ID is required');
      }

      // Update on backend
      await this.updateNotificationStatus(notificationId, DELIVERY_STATUS.READ);

      // Update local badge count
      await this.updateBadgeCount();

      await analyticsService.track('notification_read', {
        notificationId,
        ...options
      });

      return { success: true };

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(options = {}) {
    try {
      // Update on backend
      await this.batchUpdateNotifications({ status: DELIVERY_STATUS.READ });

      // Reset local badge count
      await Notifications.setBadgeCountAsync(0);

      await analyticsService.track('all_notifications_read', options);

      return { success: true };

    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(preferences) {
    try {
      const currentPreferences = await this.getUserPreferences();
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences
      };

      // Update local storage
      await storageService.set('notification_preferences', updatedPreferences);
      this.userPreferences.set(await this.getCurrentUserId(), updatedPreferences);

      // Update backend
      await this.updateBackendPreferences(updatedPreferences);

      await analyticsService.track('notification_preferences_updated', {
        updatedFields: Object.keys(preferences)
      });

      return updatedPreferences;

    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification delivery statistics
   */
  async getDeliveryStats(timeRange = '7d') {
    try {
      const stats = await this.fetchFromBackend('/notifications/stats', {
        timeRange,
        userId: await this.getCurrentUserId()
      });

      return stats;

    } catch (error) {
      console.error('Failed to fetch delivery stats:', error);
      throw error;
    }
  }

  /**
   * Set up notification event handlers
   */
  async setupNotificationHandlers() {
    try {
      // Handle received notifications
      const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
        this.handleNotificationReceived(notification);
      });

      // Handle user interaction with notifications
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        this.handleNotificationResponse(response);
      });

      // Store listeners for cleanup
      this.notificationListeners.set('received', receivedSubscription);
      this.notificationListeners.set('response', responseSubscription);

    } catch (error) {
      console.error('Failed to setup notification handlers:', error);
    }
  }

  /**
   * Handle received notification
   */
  async handleNotificationReceived(notification) {
    try {
      const notificationData = notification.request.content;

      // Track notification receipt
      await analyticsService.track('notification_received', {
        notificationId: notificationData.data?.id,
        type: notificationData.data?.type,
        channel: NOTIFICATION_CHANNELS.PUSH
      });

      // Update local unread count
      await this.updateBadgeCount();

    } catch (error) {
      console.error('Failed to handle notification receipt:', error);
    }
  }

  /**
   * Handle user interaction with notification
   */
  async handleNotificationResponse(response) {
    try {
      const notificationData = response.notification.request.content;
      const action = response.actionIdentifier;

      // Track notification interaction
      await analyticsService.track('notification_interacted', {
        notificationId: notificationData.data?.id,
        type: notificationData.data?.type,
        action: action === 'default' ? 'tap' : action,
        channel: NOTIFICATION_CHANNELS.PUSH
      });

      // Mark as read if not already
      if (notificationData.data?.id) {
        await this.markAsRead(notificationData.data.id, {
          interaction: action
        });
      }

      // Handle deep linking
      if (notificationData.data?.deepLink) {
        await this.handleDeepLink(notificationData.data.deepLink);
      }

    } catch (error) {
      console.error('Failed to handle notification response:', error);
    }
  }

  /**
   * Process delivery queue for failed notifications
   */
  async processDeliveryQueue() {
    try {
      const queue = [...this.deliveryQueue];
      this.deliveryQueue = [];

      for (const item of queue) {
        try {
          const result = await this.retryDelivery(item.notification, item.channel);
          
          if (!result.success) {
            this.failedDeliveries.set(item.notification.id, {
              ...item,
              retryCount: (this.failedDeliveries.get(item.notification.id)?.retryCount || 0) + 1,
              lastAttempt: Date.now()
            });
          }
        } catch (error) {
          console.error('Failed to process delivery queue item:', error);
        }
      }

      // Clean up old failed deliveries
      this.cleanupFailedDeliveries();

    } catch (error) {
      console.error('Failed to process delivery queue:', error);
    }
  }

  /**
   * Utility Methods
   */

  validateNotificationData(notificationData) {
    const errors = [];

    if (!notificationData.title || notificationData.title.trim().length === 0) {
      errors.push('Notification title is required');
    }

    if (!notificationData.body || notificationData.body.trim().length === 0) {
      errors.push('Notification body is required');
    }

    if (!notificationData.type) {
      errors.push('Notification type is required');
    }

    if (!Object.values(NOTIFICATION_TYPES).includes(notificationData.type)) {
      errors.push('Invalid notification type');
    }

    if (notificationData.title.length > 100) {
      errors.push('Notification title must be less than 100 characters');
    }

    if (notificationData.body.length > 500) {
      errors.push('Notification body must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async getAllowedChannels(notificationType) {
    const preferences = await this.getUserPreferences();
    const allowedChannels = [];

    for (const [channel, enabled] of Object.entries(this.config.channels)) {
      if (enabled && preferences.channels[channel] !== false) {
        // Check type-specific preferences
        if (preferences.types?.[notificationType]?.[channel] !== false) {
          allowedChannels.push(channel);
        }
      }
    }

    return allowedChannels;
  }

  async isInQuietHours() {
    if (!this.config.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-ET', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    const [startHour, startMinute] = this.config.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = this.config.quietHours.end.split(':').map(Number);

    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);

    // Handle overnight quiet hours
    if (endTime < startTime) {
      return now >= startTime || now <= endTime;
    }

    return now >= startTime && now <= endTime;
  }

  getNextAllowedDeliveryTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // 8:00 AM
    
    return tomorrow;
  }

  createNotificationRecord(notificationData, options) {
    return {
      id: this.generateNotificationId(),
      ...notificationData,
      priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
      status: DELIVERY_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      metadata: {
        ...options.metadata,
        deviceId: Device.modelName,
        platform: Platform.OS,
        appVersion: this.getAppVersion()
      }
    };
  }

  async deliverToChannels(notification, channels) {
    const results = [];

    for (const channel of channels) {
      let result;

      switch (channel) {
        case NOTIFICATION_CHANNELS.PUSH:
          result = await this.sendPushNotification(notification);
          break;
        case NOTIFICATION_CHANNELS.IN_APP:
          result = await this.sendInAppNotification(notification);
          break;
        case NOTIFICATION_CHANNELS.EMAIL:
          result = await this.sendEmailNotification(notification);
          break;
        case NOTIFICATION_CHANNELS.SMS:
          result = await this.sendSmsNotification(notification);
          break;
        default:
          result = { success: false, error: `Unknown channel: ${channel}` };
      }

      results.push(result);

      // If delivery fails, add to retry queue
      if (!result.success) {
        this.deliveryQueue.push({
          notification,
          channel,
          attempt: 1
        });
      }
    }

    return results;
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getExpoPriority(priority) {
    const priorityMap = {
      [NOTIFICATION_PRIORITY.LOW]: 'normal',
      [NOTIFICATION_PRIORITY.NORMAL]: 'normal',
      [NOTIFICATION_PRIORITY.HIGH]: 'high',
      [NOTIFICATION_PRIORITY.URGENT]: 'high'
    };

    return priorityMap[priority] || 'normal';
  }

  async getCurrentUserId() {
    const user = await authService.getCurrentUser();
    return user?.id || 'anonymous';
  }

  getAppVersion() {
    // This would typically come from app.json or similar
    return '1.0.0';
  }

  async updateBadgeCount() {
    try {
      const unreadCount = await this.getUnreadCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  async getUnreadCount() {
    try {
      const response = await this.fetchFromBackend('/notifications/unread-count', {
        userId: await this.getCurrentUserId()
      });
      return response.count || 0;
    } catch (error) {
      return 0;
    }
  }

  async loadUserPreferences() {
    try {
      const preferences = await storageService.get('notification_preferences');
      if (preferences) {
        this.userPreferences.set(await this.getCurrentUserId(), preferences);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }

  async getUserPreferences() {
    const userId = await this.getCurrentUserId();
    
    if (this.userPreferences.has(userId)) {
      return this.userPreferences.get(userId);
    }

    // Return default preferences
    return USER_PREFERENCES.DEFAULT;
  }

  startBackgroundSync() {
    this.syncInterval = setInterval(() => {
      this.processDeliveryQueue();
    }, this.config.syncInterval);
  }

  /**
   * Backend API methods (would be implemented with actual API calls)
   */

  async registerPushTokenWithBackend(token) {
    // Implementation would call your backend API
    console.log('Registering push token with backend:', token);
  }

  async fetchFromBackend(endpoint, params = {}) {
    // Implementation would call your backend API
    return { notifications: [], pagination: {}, unreadCount: 0 };
  }

  async updateNotificationStatus(notificationId, status) {
    // Implementation would call your backend API
    console.log(`Updating notification ${notificationId} status to ${status}`);
  }

  async batchUpdateNotifications(updates) {
    // Implementation would call your backend API
    console.log('Batch updating notifications:', updates);
  }

  async updateBackendPreferences(preferences) {
    // Implementation would call your backend API
    console.log('Updating backend preferences:', preferences);
  }

  async storeInAppNotification(notification) {
    // Implementation would store in local database
    console.log('Storing in-app notification:', notification);
  }

  async storeScheduledNotification(notification) {
    // Implementation would store in local database
    console.log('Storing scheduled notification:', notification);
  }

  async handleDeepLink(deepLink) {
    // Implementation would handle deep linking
    console.log('Handling deep link:', deepLink);
  }

  async retryDelivery(notification, channel) {
    // Implementation would retry delivery
    return { success: false };
  }

  cleanupFailedDeliveries() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [id, delivery] of this.failedDeliveries.entries()) {
      if (now - delivery.lastAttempt > maxAge) {
        this.failedDeliveries.delete(id);
      }
    }
  }

  async trackDeliveryAnalytics(notification, deliveryResults) {
    await analyticsService.track('notification_delivered', {
      notificationId: notification.id,
      type: notification.type,
      priority: notification.priority,
      deliveryResults: deliveryResults.map(result => ({
        channel: result.channel,
        success: result.success
      }))
    });
  }

  /**
   * Cleanup and destruction
   */
  async destroy() {
    // Clear intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Remove notification listeners
    this.notificationListeners.forEach(subscription => {
      subscription.remove();
    });
    this.notificationListeners.clear();

    // Clear queues
    this.deliveryQueue = [];
    this.failedDeliveries.clear();

    this.isInitialized = false;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Export service instance and class
export { NotificationService, notificationService };
export default notificationService;