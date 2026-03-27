/**
 * Yachi - Enterprise Notification Utilities
 * Centralized notification management system with Ethiopian market support
 * @version 1.0.0
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_CHANNELS,
  ETHIOPIAN_HOLIDAYS,
  USER_ROLES 
} from '../constants/notification';
import { formatEthiopianDate, formatCurrency } from './formatters';
import { getStoredUserData } from './storage';
import { logAnalyticsEvent } from '../services/analytics-service';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Enterprise-level Notification Manager
 */
class NotificationManager {
  constructor() {
    this.isConfigured = false;
    this.permissionStatus = null;
    this.notificationListeners = new Map();
  }

  /**
   * Initialize notification system
   */
  async initialize() {
    try {
      await this.configureNotifications();
      await this.createNotificationChannels();
      this.isConfigured = true;
      
      logAnalyticsEvent('notification_system_initialized');
    } catch (error) {
      console.error('Failed to initialize notification system:', error);
      throw new Error('NOTIFICATION_INIT_FAILED');
    }
  }

  /**
   * Configure push notifications with platform-specific settings
   */
  async configureNotifications() {
    if (!Device.isDevice) {
      throw new Error('NOTIFICATIONS_REQUIRE_DEVICE');
    }

    this.permissionStatus = await this.requestPermissions();
    
    if (this.permissionStatus !== 'granted') {
      throw new Error('NOTIFICATION_PERMISSION_DENIED');
    }

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId,
    });

    await this.registerToken(token.data);
    return token.data;
  }

  /**
   * Request notification permissions with detailed explanation
   */
  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowVibrate: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus;
  }

  /**
   * Create Android notification channels
   */
  async createNotificationChannels() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bookings', {
        name: 'Booking Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payment Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FF4CAF50',
        sound: 'payment_success.wav',
      });

      await Notifications.setNotificationChannelAsync('ai_assignments', {
        name: 'AI Assignment Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 300, 1000],
        lightColor: '#FFFF9800',
        sound: 'ai_notification.wav',
      });

      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FF2196F3',
        sound: 'message_received.wav',
      });

      await Notifications.setNotificationChannelAsync('government', {
        name: 'Government Projects',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#FF9C27B0',
        sound: 'government_alert.wav',
      });
    }
  }

  /**
   * Register push token with backend
   */
  async registerToken(token) {
    try {
      const userData = await getStoredUserData();
      
      const response = await fetch(`${Constants.expoConfig.extra.apiUrl}/notifications/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData?.token}`,
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          deviceId: Device.modelId,
          appVersion: Constants.expoConfig.version,
        }),
      });

      if (!response.ok) {
        throw new Error('TOKEN_REGISTRATION_FAILED');
      }

      logAnalyticsEvent('push_token_registered');
    } catch (error) {
      console.error('Failed to register push token:', error);
      // Don't throw error - app should continue working without push
    }
  }

  /**
   * Schedule a local notification with Ethiopian context
   */
  async scheduleLocalNotification(notificationConfig) {
    const {
      type,
      title,
      body,
      data = {},
      trigger = null,
      channelId = 'default',
      sound = true,
      vibrate = true,
    } = notificationConfig;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: this.localizeTitle(title, data),
          body: this.localizeBody(body, data),
          data: {
            ...data,
            type,
            timestamp: new Date().toISOString(),
            local: true,
          },
          sound: sound ? this.getSoundForType(type) : false,
          vibrate: vibrate ? this.getVibrationForType(type) : [0],
          priority: this.getPriorityForType(type),
          badge: type === NOTIFICATION_TYPES.CHAT_MESSAGE ? 1 : undefined,
        },
        trigger,
      });

      logAnalyticsEvent('local_notification_scheduled', { type, channelId });
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      throw new Error('NOTIFICATION_SCHEDULE_FAILED');
    }
  }

  /**
   * Send booking-related notification
   */
  async sendBookingNotification(bookingData) {
    const {
      id,
      serviceName,
      providerName,
      clientName,
      status,
      scheduledDate,
      price,
      type = NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    } = bookingData;

    const notificationConfig = {
      type,
      title: this.getBookingTitle(type, status),
      body: this.getBookingBody(type, {
        serviceName,
        providerName,
        clientName,
        scheduledDate,
        price,
      }),
      data: {
        bookingId: id,
        screen: 'BookingDetail',
        params: { id },
        action: 'VIEW_BOOKING',
      },
      channelId: NOTIFICATION_CHANNELS.BOOKINGS,
    };

    return this.scheduleLocalNotification(notificationConfig);
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(paymentData) {
    const {
      id,
      amount,
      currency = 'ETB',
      method,
      status,
      serviceName,
      type = NOTIFICATION_TYPES.PAYMENT_CONFIRMED,
    } = paymentData;

    const notificationConfig = {
      type,
      title: this.getPaymentTitle(type, status),
      body: this.getPaymentBody(type, {
        amount,
        currency,
        method,
        serviceName,
      }),
      data: {
        paymentId: id,
        screen: 'PaymentHistory',
        params: { id },
        action: 'VIEW_RECEIPT',
      },
      channelId: NOTIFICATION_CHANNELS.PAYMENTS,
    };

    return this.scheduleLocalNotification(notificationConfig);
  }

  /**
   * Send AI construction assignment notification
   */
  async sendAIAssignmentNotification(assignmentData) {
    const {
      projectId,
      projectName,
      workerCount,
      projectType,
      budget,
      timeline,
      type = NOTIFICATION_TYPES.AI_ASSIGNMENT,
    } = assignmentData;

    const notificationConfig = {
      type,
      title: '🏗️ AI Construction Assignment',
      body: `You've been assigned to ${projectName}. ${workerCount} workers needed for this ${projectType} project.`,
      data: {
        projectId,
        screen: 'ProjectDetail',
        params: { id: projectId },
        action: 'VIEW_PROJECT',
        isAIAssignment: true,
      },
      channelId: NOTIFICATION_CHANNELS.AI_ASSIGNMENTS,
    };

    return this.scheduleLocalNotification(notificationConfig);
  }

  /**
   * Send government project notification
   */
  async sendGovernmentProjectNotification(projectData) {
    const {
      id,
      name,
      type,
      budget,
      location,
      deadline,
      notificationType = NOTIFICATION_TYPES.GOVERNMENT_PROJECT,
    } = projectData;

    const notificationConfig = {
      type: notificationType,
      title: '🏛️ Government Project Alert',
      body: `New ${type} project in ${location}. Budget: ${formatCurrency(budget, 'ETB')}. Deadline: ${formatEthiopianDate(deadline)}`,
      data: {
        projectId: id,
        screen: 'GovernmentProjectDetail',
        params: { id },
        action: 'VIEW_GOVERNMENT_PROJECT',
      },
      channelId: NOTIFICATION_CHANNELS.GOVERNMENT,
    };

    return this.scheduleLocalNotification(notificationConfig);
  }

  /**
   * Send chat message notification
   */
  async sendChatNotification(chatData) {
    const {
      chatId,
      senderName,
      message,
      messageType = 'text',
      isGroup = false,
    } = chatData;

    const notificationConfig = {
      type: NOTIFICATION_TYPES.CHAT_MESSAGE,
      title: isGroup ? `💬 ${senderName} (Group)` : `💬 ${senderName}`,
      body: messageType === 'image' ? 'Sent a photo' : message,
      data: {
        chatId,
        screen: 'ChatWindow',
        params: { chatId },
        action: 'OPEN_CHAT',
      },
      channelId: NOTIFICATION_CHANNELS.CHAT,
    };

    return this.scheduleLocalNotification(notificationConfig);
  }

  /**
   * Send premium feature notification
   */
  async sendPremiumNotification(premiumData) {
    const {
      type,
      feature,
      expiryDate,
      amount,
      tier = 'basic',
    } = premiumData;

    const notificationConfig = {
      type: NOTIFICATION_TYPES.PREMIUM_FEATURE,
      title: this.getPremiumTitle(type, tier),
      body: this.getPremiumBody(type, { feature, expiryDate, amount }),
      data: {
        screen: 'PremiumFeatures',
        action: 'VIEW_PREMIUM',
        premiumTier: tier,
      },
      channelId: NOTIFICATION_CHANNELS.PREMIUM,
    };

    return this.scheduleLocalNotification(notificationConfig);
  }

  /**
   * Localize notification title based on user preferences
   */
  localizeTitle(title, data) {
    // TODO: Implement based on user's language preference
    // For now, return as-is - will integrate with i18n
    return title;
  }

  /**
   * Localize notification body with contextual data
   */
  localizeBody(body, data) {
    // TODO: Implement localization and contextual replacement
    return body;
  }

  /**
   * Get appropriate sound for notification type
   */
  getSoundForType(type) {
    const soundMap = {
      [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 'booking_confirmed.wav',
      [NOTIFICATION_TYPES.PAYMENT_CONFIRMED]: 'payment_success.wav',
      [NOTIFICATION_TYPES.AI_ASSIGNMENT]: 'ai_notification.wav',
      [NOTIFICATION_TYPES.GOVERNMENT_PROJECT]: 'government_alert.wav',
      [NOTIFICATION_TYPES.CHAT_MESSAGE]: 'message_received.wav',
      [NOTIFICATION_TYPES.EMERGENCY]: 'emergency_alert.wav',
    };

    return soundMap[type] || 'default';
  }

  /**
   * Get vibration pattern for notification type
   */
  getVibrationForType(type) {
    const vibrationMap = {
      [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: [0, 250, 250, 250],
      [NOTIFICATION_TYPES.PAYMENT_CONFIRMED]: [0, 500, 200, 500],
      [NOTIFICATION_TYPES.AI_ASSIGNMENT]: [0, 1000, 300, 1000],
      [NOTIFICATION_TYPES.GOVERNMENT_PROJECT]: [0, 1000, 500, 1000],
      [NOTIFICATION_TYPES.CHAT_MESSAGE]: [0, 250],
      [NOTIFICATION_TYPES.EMERGENCY]: [0, 1000, 1000, 1000, 1000],
    };

    return vibrationMap[type] || [0, 250];
  }

  /**
   * Get priority for notification type
   */
  getPriorityForType(type) {
    const priorityMap = {
      [NOTIFICATION_TYPES.AI_ASSIGNMENT]: Notifications.AndroidNotificationPriority.MAX,
      [NOTIFICATION_TYPES.EMERGENCY]: Notifications.AndroidNotificationPriority.MAX,
      [NOTIFICATION_TYPES.GOVERNMENT_PROJECT]: Notifications.AndroidNotificationPriority.HIGH,
      [NOTIFICATION_TYPES.PAYMENT_CONFIRMED]: Notifications.AndroidNotificationPriority.HIGH,
      [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: Notifications.AndroidNotificationPriority.DEFAULT,
      [NOTIFICATION_TYPES.CHAT_MESSAGE]: Notifications.AndroidNotificationPriority.DEFAULT,
    };

    return priorityMap[type] || Notifications.AndroidNotificationPriority.DEFAULT;
  }

  /**
   * Get booking notification title based on type and status
   */
  getBookingTitle(type, status) {
    const titleMap = {
      [NOTIFICATION_TYPES.BOOKING_REQUESTED]: '📅 Booking Request Sent',
      [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: '✅ Booking Confirmed',
      [NOTIFICATION_TYPES.BOOKING_CANCELLED]: '❌ Booking Cancelled',
      [NOTIFICATION_TYPES.BOOKING_REMINDER]: '⏰ Booking Reminder',
      [NOTIFICATION_TYPES.BOOKING_COMPLETED]: '🎉 Booking Completed',
    };

    return titleMap[type] || '📅 Booking Update';
  }

  /**
   * Get booking notification body with contextual information
   */
  getBookingBody(type, data) {
    const { serviceName, providerName, clientName, scheduledDate, price } = data;

    switch (type) {
      case NOTIFICATION_TYPES.BOOKING_REQUESTED:
        return `Your booking request for ${serviceName} has been sent to ${providerName}.`;
      
      case NOTIFICATION_TYPES.BOOKING_CONFIRMED:
        return `Your booking for ${serviceName} with ${providerName} has been confirmed for ${formatEthiopianDate(scheduledDate)}.`;
      
      case NOTIFICATION_TYPES.BOOKING_CANCELLED:
        return `Booking for ${serviceName} has been cancelled.`;
      
      case NOTIFICATION_TYPES.BOOKING_REMINDER:
        return `Reminder: You have a booking for ${serviceName} tomorrow.`;
      
      case NOTIFICATION_TYPES.BOOKING_COMPLETED:
        return `Your ${serviceName} booking has been completed. Please leave a review.`;
      
      default:
        return `Update for your ${serviceName} booking.`;
    }
  }

  /**
   * Get payment notification title
   */
  getPaymentTitle(type, status) {
    if (status === 'failed') {
      return '❌ Payment Failed';
    }

    const titleMap = {
      [NOTIFICATION_TYPES.PAYMENT_CONFIRMED]: '✅ Payment Successful',
      [NOTIFICATION_TYPES.PAYMENT_REFUNDED]: '🔄 Payment Refunded',
      [NOTIFICATION_TYPES.PREMIUM_PAYMENT]: '⭐ Premium Payment',
    };

    return titleMap[type] || '💰 Payment Update';
  }

  /**
   * Get payment notification body
   */
  getPaymentBody(type, data) {
    const { amount, currency, method, serviceName } = data;

    switch (type) {
      case NOTIFICATION_TYPES.PAYMENT_CONFIRMED:
        return `Payment of ${formatCurrency(amount, currency)} for ${serviceName} via ${method} was successful.`;
      
      case NOTIFICATION_TYPES.PAYMENT_REFUNDED:
        return `Refund of ${formatCurrency(amount, currency)} has been processed to your account.`;
      
      case NOTIFICATION_TYPES.PREMIUM_PAYMENT:
        return `Premium feature payment of ${formatCurrency(amount, currency)} completed successfully.`;
      
      default:
        return `Payment update: ${formatCurrency(amount, currency)}`;
    }
  }

  /**
   * Get premium notification title
   */
  getPremiumTitle(type, tier) {
    const titleMap = {
      activated: `⭐ ${tier.charAt(0).toUpperCase() + tier.slice(1)} Premium Activated`,
      expired: '⭐ Premium Expired',
      renewed: '⭐ Premium Renewed',
      feature_unlocked: '🎯 Premium Feature Unlocked',
    };

    return titleMap[type] || '⭐ Premium Update';
  }

  /**
   * Get premium notification body
   */
  getPremiumBody(type, data) {
    const { feature, expiryDate, amount } = data;

    switch (type) {
      case 'activated':
        return `Welcome to Yachi Premium! Your features are now active until ${formatEthiopianDate(expiryDate)}.`;
      
      case 'expired':
        return 'Your Premium subscription has expired. Renew now to continue enjoying exclusive features.';
      
      case 'renewed':
        return `Premium subscription renewed successfully. Valid until ${formatEthiopianDate(expiryDate)}.`;
      
      case 'feature_unlocked':
        return `You've unlocked the ${feature} premium feature!`;
      
      default:
        return 'Premium subscription update.';
    }
  }

  /**
   * Cancel specific notification
   */
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logAnalyticsEvent('notification_cancelled', { notificationId });
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logAnalyticsEvent('all_notifications_cancelled');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Get pending notifications
   */
  async getPendingNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }

  /**
   * Add notification response listener
   */
  addNotificationResponseListener(callback) {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    this.notificationListeners.set(callback, subscription);
    return subscription;
  }

  /**
   * Remove notification listener
   */
  removeNotificationResponseListener(callback) {
    const subscription = this.notificationListeners.get(callback);
    if (subscription) {
      subscription.remove();
      this.notificationListeners.delete(callback);
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup() {
    this.notificationListeners.forEach((subscription) => {
      subscription.remove();
    });
    this.notificationListeners.clear();
  }

  /**
   * Check if notification system is ready
   */
  isReady() {
    return this.isConfigured && this.permissionStatus === 'granted';
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager;

/**
 * Utility function for quick notification sending
 */
export const notify = {
  booking: (data) => notificationManager.sendBookingNotification(data),
  payment: (data) => notificationManager.sendPaymentNotification(data),
  aiAssignment: (data) => notificationManager.sendAIAssignmentNotification(data),
  government: (data) => notificationManager.sendGovernmentProjectNotification(data),
  chat: (data) => notificationManager.sendChatNotification(data),
  premium: (data) => notificationManager.sendPremiumNotification(data),
};

/**
 * Export manager for direct access
 */
export { notificationManager };