// hooks/use-notifications.js
/**
 * ENTERPRISE-LEVEL NOTIFICATIONS MANAGEMENT HOOK
 * Advanced notification system with Ethiopian market optimization and AI integration
 * Complete integration with all Yachi platform features
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Platform, AppState, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useAuth } from '../contexts/auth-context';
import { useChat } from './use-chat';
import { useAIMatching } from '../contexts/ai-matching-context';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITY, 
  NOTIFICATION_CHANNELS,
  DELIVERY_STATUS,
  USER_ROLES,
  ETHIOPIAN_REGIONS 
} from '../constants/notification';

// ==================== NOTIFICATION CONSTANTS ====================
const NOTIFICATION_ACTIONS = {
  // Permission & Initialization
  SET_PERMISSION_STATUS: 'SET_PERMISSION_STATUS',
  SET_LOADING: 'SET_LOADING',
  SET_INITIALIZED: 'SET_INITIALIZED',
  
  // Token Management
  SET_EXPO_PUSH_TOKEN: 'SET_EXPO_PUSH_TOKEN',
  SET_DEVICE_TOKEN: 'SET_DEVICE_TOKEN',
  SET_TOKEN_REGISTERED: 'SET_TOKEN_REGISTERED',
  
  // Notification Data
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  
  // Settings & Preferences
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_CATEGORY_PREFERENCE: 'UPDATE_CATEGORY_PREFERENCE',
  UPDATE_ROLE_PREFERENCES: 'UPDATE_ROLE_PREFERENCES',
  
  // Status & Analytics
  UPDATE_BADGE_COUNT: 'UPDATE_BADGE_COUNT',
  SET_CONNECTED: 'SET_CONNECTED',
  INCREMENT_DELIVERY_STATS: 'INCREMENT_DELIVERY_STATS',
  
  // Error Handling
  SET_ERROR: 'SET_ERROR',
  SET_PERMISSION_ERROR: 'SET_PERMISSION_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
};

const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: 'yachi_notification_settings',
  CATEGORY_PREFERENCES: 'yachi_category_preferences',
  ROLE_PREFERENCES: 'yachi_role_preferences',
  NOTIFICATIONS_DATA: 'yachi_notifications_data',
  PERMISSION_STATUS: 'yachi_permission_status',
  DEVICE_TOKEN: 'yachi_device_token',
  DELIVERY_STATS: 'yachi_delivery_stats',
};

// ==================== INITIAL STATE ====================
const initialState = {
  // Permission & Initialization
  permissionStatus: null,
  hasPermission: false,
  hasRequestedPermission: false,
  isInitialized: false,
  isLoading: false,
  isRegistering: false,
  isScheduling: false,
  
  // Notification Settings
  settings: {
    enabled: true,
    sound: true,
    vibration: true,
    badge: true,
    preview: true,
    led: Platform.OS === 'android',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
    doNotDisturb: false,
  },
  
  // Category Preferences with Ethiopian Context
  categoryPreferences: {
    // Core Platform Features
    [NOTIFICATION_TYPES.MESSAGE]: true,
    [NOTIFICATION_TYPES.BOOKING]: true,
    [NOTIFICATION_TYPES.PAYMENT]: true,
    [NOTIFICATION_TYPES.REVIEW]: true,
    [NOTIFICATION_TYPES.REMINDER]: true,
    
    // Construction & AI Features
    [NOTIFICATION_TYPES.CONSTRUCTION_UPDATE]: true,
    [NOTIFICATION_TYPES.AI_MATCHING]: true,
    [NOTIFICATION_TYPES.PROJECT_INVITATION]: true,
    [NOTIFICATION_TYPES.WORKER_ASSIGNMENT]: true,
    [NOTIFICATION_TYPES.MATERIAL_DELIVERY]: true,
    [NOTIFICATION_TYPES.PROGRESS_UPDATE]: true,
    
    // Government & Enterprise
    [NOTIFICATION_TYPES.GOVERNMENT_ALERT]: true,
    [NOTIFICATION_TYPES.SYSTEM_MAINTENANCE]: true,
    [NOTIFICATION_TYPES.COMPLIANCE_UPDATE]: true,
    
    // Security & Account
    [NOTIFICATION_TYPES.SECURITY]: true,
    [NOTIFICATION_TYPES.VERIFICATION]: true,
    [NOTIFICATION_TYPES.ACCOUNT]: true,
    
    // Marketing & Engagement
    [NOTIFICATION_TYPES.PROMOTIONAL]: false,
    [NOTIFICATION_TYPES.NEWSLETTER]: false,
    [NOTIFICATION_TYPES.OFFER]: true,
    [NOTIFICATION_TYPES.PREMIUM_FEATURE]: true,
  },
  
  // Role-Based Preferences
  rolePreferences: {
    [USER_ROLES.CLIENT]: {
      enabled: true,
      priority: [
        NOTIFICATION_TYPES.BOOKING,
        NOTIFICATION_TYPES.MESSAGE,
        NOTIFICATION_TYPES.PAYMENT,
        NOTIFICATION_TYPES.PROGRESS_UPDATE
      ],
    },
    [USER_ROLES.PROVIDER]: {
      enabled: true,
      priority: [
        NOTIFICATION_TYPES.PROJECT_INVITATION,
        NOTIFICATION_TYPES.MESSAGE,
        NOTIFICATION_TYPES.BOOKING,
        NOTIFICATION_TYPES.AI_MATCHING
      ],
    },
    [USER_ROLES.GOVERNMENT]: {
      enabled: true,
      priority: [
        NOTIFICATION_TYPES.GOVERNMENT_ALERT,
        NOTIFICATION_TYPES.CONSTRUCTION_UPDATE,
        NOTIFICATION_TYPES.COMPLIANCE_UPDATE,
        NOTIFICATION_TYPES.SYSTEM_MAINTENANCE
      ],
    },
    [USER_ROLES.ADMIN]: {
      enabled: true,
      priority: [
        NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
        NOTIFICATION_TYPES.SECURITY,
        NOTIFICATION_TYPES.ACCOUNT
      ],
    },
  },
  
  // Notification Data
  notifications: [],
  unreadCount: 0,
  badgeCount: 0,
  
  // Device & Token Management
  expoPushToken: null,
  deviceToken: null,
  isTokenRegistered: false,
  
  // Real-time & Delivery
  isConnected: true,
  pendingNotifications: [],
  deliveryStats: {
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    lastDelivery: null,
  },
  
  // Ethiopian Context
  ethiopianContext: {
    regionalLanguage: 'en',
    timezone: 'Africa/Addis_Ababa',
    workingHours: '09:00-18:00',
    holidayMode: false,
  },
  
  // Error States
  error: null,
  errorCode: null,
  permissionError: null,
  tokenError: null,
};

// ==================== ENTERPRISE NOTIFICATIONS HOOK ====================
/**
 * Enterprise Notifications Management Hook
 * Advanced notification system with Ethiopian optimization and AI integration
 */
export const useNotifications = (options = {}) => {
  const {
    enableRealTime = true,
    enableOfflineQueue = true,
    enableAnalytics = true,
    autoRegister = true,
  } = options;

  const { user, isAuthenticated } = useAuth();
  const { sendMessage } = useChat();
  const { aiInsights } = useAIMatching();
  
  // State Management
  const [state, setState] = useState(initialState);
  
  // Refs
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const appStateListener = useRef(null);
  const badgeSyncTimer = useRef(null);
  const offlineQueue = useRef([]);
  const deliveryTracker = useRef(new Map());

  // ==================== LIFECYCLE MANAGEMENT ====================
  useEffect(() => {
    initializeNotifications();

    return () => {
      cleanupNotifications();
    };
  }, []);

  useEffect(() => {
    if (state.hasPermission && enableRealTime) {
      setupRealTimeFeatures();
    }
  }, [state.hasPermission, enableRealTime]);

  useEffect(() => {
    if (isAuthenticated && state.isTokenRegistered) {
      syncWithServer();
    }
  }, [isAuthenticated, state.isTokenRegistered]);

  // ==================== INITIALIZATION ====================
  const initializeNotifications = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load all persisted notification data
      const [
        settings, 
        categoryPreferences, 
        rolePreferences,
        notificationsData, 
        permissionStatus, 
        deviceToken,
        deliveryStats
      ] = await Promise.all([
        storage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS),
        storage.getItem(STORAGE_KEYS.CATEGORY_PREFERENCES),
        storage.getItem(STORAGE_KEYS.ROLE_PREFERENCES),
        storage.getItem(STORAGE_KEYS.NOTIFICATIONS_DATA),
        storage.getItem(STORAGE_KEYS.PERMISSION_STATUS),
        storage.getItem(STORAGE_KEYS.DEVICE_TOKEN),
        storage.getItem(STORAGE_KEYS.DELIVERY_STATS),
      ]);

      // Check current permission status
      const { status: currentStatus } = await Notifications.getPermissionsAsync();
      const hasPermission = currentStatus === 'granted';

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => ({
          shouldShowAlert: await shouldShowAlert(notification),
          shouldPlaySound: await shouldPlaySound(notification),
          shouldSetBadge: await shouldSetBadge(notification),
        }),
      });

      // Setup Android channels
      if (Platform.OS === 'android') {
        await setupNotificationChannels();
      }

      setState(prev => ({
        ...prev,
        settings: settings || prev.settings,
        categoryPreferences: categoryPreferences || prev.categoryPreferences,
        rolePreferences: rolePreferences || prev.rolePreferences,
        notifications: notificationsData?.notifications || [],
        unreadCount: notificationsData?.unreadCount || 0,
        badgeCount: notificationsData?.badgeCount || 0,
        permissionStatus: permissionStatus || currentStatus,
        hasPermission,
        hasRequestedPermission: !!permissionStatus,
        deviceToken: deviceToken || null,
        isTokenRegistered: !!deviceToken,
        deliveryStats: deliveryStats || prev.deliveryStats,
        isInitialized: true,
        isLoading: false,
      }));

      // Register for push notifications if permission granted
      if (hasPermission && autoRegister) {
        await registerForPushNotifications();
      }

      // Setup listeners
      setupNotificationListeners();

      analyticsService.trackEvent('notifications_enterprise_initialized', {
        hasPermission,
        platform: Platform.OS,
        userRole: user?.role,
        notificationCount: notificationsData?.notifications?.length || 0,
      });

    } catch (error) {
      handleNotificationError(error, 'NotificationsInitialization');
    }
  }, [user, autoRegister]);

  // ==================== PERMISSION MANAGEMENT ====================
  const requestPermission = useCallback(async (options = {}) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, permissionError: null }));

      // Validate device capability
      if (!Device.isDevice) {
        throw new Error('Push notifications require a physical device');
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      const hasPermission = finalStatus === 'granted';

      setState(prev => ({
        ...prev,
        permissionStatus: finalStatus,
        hasPermission,
        hasRequestedPermission: true,
        isLoading: false,
      }));

      // Save permission status
      await storage.setItem(STORAGE_KEYS.PERMISSION_STATUS, finalStatus);

      if (hasPermission) {
        setupNotificationListeners();
        await registerForPushNotifications();
        
        analyticsService.trackEvent('notification_permission_granted_enterprise', {
          userRole: user?.role,
        });
      } else {
        analyticsService.trackEvent('notification_permission_denied', {
          userRole: user?.role,
        });
      }

      return { granted: hasPermission, status: finalStatus };

    } catch (error) {
      handleNotificationError(error, 'RequestPermission');
      return { granted: false, status: 'undetermined', error: error.message };
    }
  }, [user]);

  // ==================== NOTIFICATION DELIVERY ====================
  /**
   * Send notification with Ethiopian context optimization
   */
  const sendNotification = useCallback(async (notification, options = {}) => {
    try {
      // Validate notification settings
      if (!shouldDeliverNotification(notification)) {
        return { success: false, reason: 'settings_disabled' };
      }

      // Check quiet hours
      if (isInQuietHours() && notification.priority !== NOTIFICATION_PRIORITY.MAX) {
        if (options.scheduleForLater) {
          return await scheduleQuietHoursNotification(notification);
        }
        return { success: false, reason: 'quiet_hours' };
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: prepareNotificationContent(notification),
        trigger: null, // Immediate delivery
      });

      // Track delivery
      trackNotificationDelivery(notification, DELIVERY_STATUS.SENT);

      // Add to local state if persistent
      if (options.persistent !== false) {
        addNotificationToState({
          ...notification,
          id: notificationId,
          status: DELIVERY_STATUS.SENT,
          timestamp: Date.now(),
        });
      }

      analyticsService.trackEvent('notification_sent_enterprise', {
        type: notification.type,
        priority: notification.priority,
        userRole: user?.role,
        hasEthiopianContext: !!notification.ethiopianContext,
      });

      return { success: true, notificationId };

    } catch (error) {
      handleNotificationError(error, 'SendNotification', { 
        type: notification.type,
        priority: notification.priority,
      });
      
      trackNotificationDelivery(notification, DELIVERY_STATUS.FAILED);
      return { success: false, error: error.message };
    }
  }, [user]);

  /**
   * Send construction project notification
   */
  const sendConstructionNotification = useCallback(async (projectData, notificationType, options = {}) => {
    const notification = {
      title: getConstructionNotificationTitle(projectData, notificationType),
      body: getConstructionNotificationBody(projectData, notificationType),
      data: {
        type: NOTIFICATION_TYPES.CONSTRUCTION_UPDATE,
        projectId: projectData.id,
        projectType: projectData.type,
        action: 'view_project',
        screen: 'construction/[id]',
        params: { id: projectData.id },
        ...options.data,
      },
      priority: options.priority || NOTIFICATION_PRIORITY.HIGH,
      ethiopianContext: {
        region: projectData.region,
        language: user?.language || 'en',
        culturalContext: getCulturalContext(projectData.region),
      },
    };

    return sendNotification(notification, options);
  }, [sendNotification, user]);

  /**
   * Send AI matching notification
   */
  const sendAIMatchingNotification = useCallback(async (matchData, options = {}) => {
    const notification = {
      title: '🤖 AI Worker Match Found',
      body: `Optimal team composition ready for your ${matchData.projectType} project in ${matchData.location}`,
      data: {
        type: NOTIFICATION_TYPES.AI_MATCHING,
        projectId: matchData.projectId,
        matchId: matchData.matchId,
        confidence: matchData.confidence,
        teamSize: matchData.teamSize,
        action: 'view_ai_match',
        screen: 'ai-matching/results',
        params: { projectId: matchData.projectId },
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
      ethiopianContext: {
        region: matchData.region,
        aiConfidence: matchData.confidence,
        optimizationScore: matchData.optimizationScore,
      },
    };

    return sendNotification(notification, options);
  }, [sendNotification]);

  /**
   * Send payment notification with Ethiopian payment providers
   */
  const sendPaymentNotification = useCallback(async (paymentData, options = {}) => {
    const notification = {
      title: paymentData.success ? '✅ Payment Successful' : '❌ Payment Failed',
      body: formatPaymentMessage(paymentData),
      data: {
        type: NOTIFICATION_TYPES.PAYMENT,
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'ETB',
        provider: paymentData.provider,
        status: paymentData.status,
        action: 'view_payment',
        screen: 'payment/history',
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
      ethiopianContext: {
        paymentProvider: paymentData.provider,
        amountInBirr: paymentData.amount,
        isLocalPayment: ['telebirr', 'cbebirr', 'chapa'].includes(paymentData.provider),
      },
    };

    return sendNotification(notification, options);
  }, [sendNotification]);

  // ==================== SCHEDULING & REMINDERS ====================
  const scheduleNotification = useCallback(async (notification, trigger, options = {}) => {
    try {
      setState(prev => ({ ...prev, isScheduling: true }));

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: prepareNotificationContent(notification),
        trigger,
      });

      setState(prev => ({ ...prev, isScheduling: false }));

      analyticsService.trackEvent('notification_scheduled_enterprise', {
        type: notification.type,
        triggerType: trigger?.type,
        userRole: user?.role,
      });

      return { success: true, notificationId };

    } catch (error) {
      setState(prev => ({ ...prev, isScheduling: false }));
      handleNotificationError(error, 'ScheduleNotification', { 
        type: notification.type,
        triggerType: trigger?.type,
      });
      return { success: false, error: error.message };
    }
  }, [user]);

  const scheduleConstructionReminder = useCallback(async (projectData, reminderType, trigger, options = {}) => {
    const notification = {
      title: `⏰ Construction Reminder: ${reminderType}`,
      body: getConstructionReminderBody(projectData, reminderType),
      data: {
        type: NOTIFICATION_TYPES.REMINDER,
        projectId: projectData.id,
        reminderType,
        action: 'view_project',
        screen: 'construction/[id]',
        params: { id: projectData.id },
      },
      priority: NOTIFICATION_PRIORITY.DEFAULT,
    };

    return scheduleNotification(notification, trigger, options);
  }, [scheduleNotification]);

  // ==================== NOTIFICATION MANAGEMENT ====================
  const markAsRead = useCallback(async (notificationId, options = {}) => {
    try {
      setState(prev => {
        const updatedNotifications = prev.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true, readAt: Date.now() }
            : notification
        );
        
        const unreadCount = updatedNotifications.filter(n => !n.read).length;
        
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadCount,
          badgeCount: prev.settings.badge ? unreadCount : 0,
        };
      });

      // Update badge count
      await updateBadgeCount();

      // Sync with server if authenticated
      if (isAuthenticated && options.syncWithServer !== false) {
        await api.patch(`/notifications/${notificationId}/read`);
      }

      // Track analytics
      analyticsService.trackEvent('notification_marked_read_enterprise', {
        notificationId,
        userRole: user?.role,
      });

    } catch (error) {
      handleNotificationError(error, 'MarkAsRead', { notificationId });
    }
  }, [isAuthenticated, user]);

  const markAllAsRead = useCallback(async (options = {}) => {
    try {
      setState(prev => {
        const updatedNotifications = prev.notifications.map(notification => ({
          ...notification,
          read: true,
          readAt: Date.now(),
        }));
        
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadCount: 0,
          badgeCount: 0,
        };
      });

      // Clear badge count
      await clearBadgeCount();

      // Sync with server if authenticated
      if (isAuthenticated && options.syncWithServer !== false) {
        await api.post('/notifications/mark-all-read');
      }

      analyticsService.trackEvent('all_notifications_marked_read_enterprise', {
        userRole: user?.role,
      });

    } catch (error) {
      handleNotificationError(error, 'MarkAllAsRead');
    }
  }, [isAuthenticated, user]);

  const clearAllNotifications = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
        badgeCount: 0,
      }));

      // Clear badge count
      await clearBadgeCount();

      // Clear from server if authenticated
      if (isAuthenticated) {
        await api.delete('/notifications/clear');
      }

      // Clear local storage
      await storage.setItem(STORAGE_KEYS.NOTIFICATIONS_DATA, {
        notifications: [],
        unreadCount: 0,
        badgeCount: 0,
        lastCleared: Date.now(),
      });

      analyticsService.trackEvent('all_notifications_cleared_enterprise', {
        userRole: user?.role,
      });

    } catch (error) {
      handleNotificationError(error, 'ClearAllNotifications');
    }
  }, [isAuthenticated, user]);

  // ==================== SETTINGS MANAGEMENT ====================
  const updateSettings = useCallback(async (newSettings) => {
    try {
      setState(prev => ({
        ...prev,
        settings: { ...prev.settings, ...newSettings },
      }));

      // Save to storage
      await storage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
        ...state.settings,
        ...newSettings,
      });

      // Update badge settings
      if (newSettings.badge !== undefined) {
        if (newSettings.badge) {
          await updateBadgeCount();
        } else {
          await clearBadgeCount();
        }
      }

      analyticsService.trackEvent('notification_settings_updated_enterprise', {
        ...newSettings,
        userRole: user?.role,
      });

    } catch (error) {
      handleNotificationError(error, 'UpdateSettings', { newSettings });
    }
  }, [state.settings, user]);

  const updateCategoryPreference = useCallback(async (category, enabled) => {
    try {
      setState(prev => ({
        ...prev,
        categoryPreferences: {
          ...prev.categoryPreferences,
          [category]: enabled,
        },
      }));

      // Save to storage
      await storage.setItem(STORAGE_KEYS.CATEGORY_PREFERENCES, {
        ...state.categoryPreferences,
        [category]: enabled,
      });

      analyticsService.trackEvent('category_preference_updated_enterprise', {
        category,
        enabled,
        userRole: user?.role,
      });

    } catch (error) {
      handleNotificationError(error, 'UpdateCategoryPreference', { category, enabled });
    }
  }, [state.categoryPreferences, user]);

  // ==================== REAL-TIME FEATURES ====================
  const setupRealTimeFeatures = useCallback(() => {
    // Setup periodic badge sync
    badgeSyncTimer.current = setInterval(() => {
      if (isAuthenticated) {
        syncBadgeCount();
      }
    }, 5 * 60 * 1000); // Sync every 5 minutes

    // Setup app state listener
    appStateListener.current = AppState.addEventListener('change', handleAppStateChange);
  }, [isAuthenticated]);

  const handleAppStateChange = useCallback((nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground - clear badge count and sync
      clearBadgeCount();
      if (isAuthenticated) {
        syncWithServer();
      }
    }
  }, [isAuthenticated]);

  const setupNotificationListeners = useCallback(() => {
    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(handleIncomingNotification);

    // Listen for notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
  }, []);

  const handleIncomingNotification = useCallback((notification) => {
    try {
      const { data, ...notificationData } = notification.request.content;
      
      // Check category preferences
      if (data?.type && !state.categoryPreferences[data.type]) {
        return;
      }

      const newNotification = {
        id: notification.request.identifier,
        ...notificationData,
        data,
        type: data?.type || NOTIFICATION_TYPES.SYSTEM,
        priority: data?.priority || NOTIFICATION_PRIORITY.DEFAULT,
        timestamp: Date.now(),
        read: false,
        delivered: true,
      };

      addNotificationToState(newNotification);

      // Track delivery
      trackNotificationDelivery(newNotification, DELIVERY_STATUS.DELIVERED);

      analyticsService.trackEvent('notification_received_enterprise', {
        type: data?.type,
        priority: data?.priority,
        userRole: user?.role,
      });

    } catch (error) {
      handleNotificationError(error, 'HandleIncomingNotification', {
        notification: notification.request.content
      });
    }
  }, [state.categoryPreferences, user]);

  const handleNotificationResponse = useCallback((response) => {
    try {
      const { data, notificationId } = response.notification.request.content;
      
      // Mark as read
      if (notificationId) {
        markAsRead(notificationId);
      }

      // Track as read
      trackNotificationDelivery({ id: notificationId }, DELIVERY_STATUS.READ);

      // Handle navigation
      if (data?.screen) {
        handleNotificationNavigation(data.screen, data.params);
      } else if (data?.action) {
        handleNotificationAction(data.action, data.params);
      }

      analyticsService.trackEvent('notification_opened_enterprise', {
        type: data?.type,
        action: data?.action,
        userRole: user?.role,
      });

    } catch (error) {
      handleNotificationError(error, 'HandleNotificationResponse', {
        response: response.notification.request.content
      });
    }
  }, [markAsRead, user]);

  // ==================== UTILITY FUNCTIONS ====================
  const shouldDeliverNotification = useCallback((notification) => {
    // Check if notifications are enabled
    if (!state.settings.enabled) return false;

    // Check category preference
    if (notification.type && !state.categoryPreferences[notification.type]) {
      return false;
    }

    // Check do not disturb
    if (state.settings.doNotDisturb && notification.priority !== NOTIFICATION_PRIORITY.MAX) {
      return false;
    }

    // Check role-based preferences
    if (user?.role && state.rolePreferences[user.role]) {
      const rolePrefs = state.rolePreferences[user.role];
      if (!rolePrefs.enabled) return false;
    }

    return true;
  }, [state.settings, state.categoryPreferences, state.rolePreferences, user]);

  const isInQuietHours = useCallback(() => {
    if (!state.settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = state.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = state.settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime || currentTime < endTime;
  }, [state.settings.quietHours]);

  const prepareNotificationContent = useCallback((notification) => {
    return {
      title: notification.title,
      body: notification.body,
      data: {
        ...notification.data,
        type: notification.type || NOTIFICATION_TYPES.SYSTEM,
        priority: notification.priority || NOTIFICATION_PRIORITY.DEFAULT,
        ethiopianContext: notification.ethiopianContext,
      },
      sound: state.settings.sound,
      badge: state.settings.badge ? state.badgeCount + 1 : undefined,
    };
  }, [state.settings, state.badgeCount]);

  const addNotificationToState = useCallback((notification) => {
    setState(prev => {
      const updatedNotifications = [notification, ...prev.notifications].slice(0, 500);
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount,
        badgeCount: prev.settings.badge ? unreadCount : 0,
      };
    });

    // Save to storage
    saveNotificationsToStorage();
  }, []);

  const trackNotificationDelivery = useCallback((notification, status) => {
    setState(prev => ({
      ...prev,
      deliveryStats: {
        ...prev.deliveryStats,
        [status]: (prev.deliveryStats[status] || 0) + 1,
        lastDelivery: Date.now(),
      },
    }));

    // Save delivery stats
    storage.setItem(STORAGE_KEYS.DELIVERY_STATS, state.deliveryStats);
  }, [state.deliveryStats]);

  // ==================== ETHIOPIAN CONTEXT FUNCTIONS ====================
  const getConstructionNotificationTitle = (projectData, notificationType) => {
    const titles = {
      STARTED: `🏗️ Construction Started: ${projectData.name}`,
      MILESTONE: `🎯 Milestone Reached: ${projectData.name}`,
      DELAY: `⚠️ Project Delay: ${projectData.name}`,
      COMPLETED: `✅ Project Completed: ${projectData.name}`,
      PAYMENT: `💰 Payment Update: ${projectData.name}`,
    };

    return titles[notificationType] || `Construction Update: ${projectData.name}`;
  };

  const getConstructionNotificationBody = (projectData, notificationType) => {
    const bodies = {
      STARTED: `Construction has begun on your project in ${projectData.location}. Expected completion: ${projectData.timeline} days.`,
      MILESTONE: `Great progress! Your project has reached a key milestone. Current completion: ${projectData.progress}%.`,
      DELAY: `Your project timeline has been adjusted. New completion date: ${projectData.newTimeline}.`,
      COMPLETED: `Congratulations! Your construction project has been completed successfully.`,
      PAYMENT: `Payment of ${projectData.amount} ETB has been processed for your project.`,
    };

    return bodies[notificationType] || `Update for your construction project in ${projectData.location}.`;
  };

  const formatPaymentMessage = (paymentData) => {
    if (paymentData.success) {
      return `Payment of ${paymentData.amount} ETB via ${paymentData.provider} was successful. Thank you for your business!`;
    } else {
      return `Payment of ${paymentData.amount} ETB via ${paymentData.provider} failed. Please try again or contact support.`;
    }
  };

  const getCulturalContext = (region) => {
    const culturalContexts = {
      'ADDIS_ABABA': { formal: true, language: 'am', timeSensitive: true },
      'OROMIA': { formal: false, language: 'om', communityFocused: true },
      'AMHARA': { formal: true, language: 'am', traditional: true },
      'TIGRAY': { formal: true, language: 'ti', detailed: true },
    };

    return culturalContexts[region] || culturalContexts.ADDIS_ABABA;
  };

  // ==================== ERROR HANDLING ====================
  const handleNotificationError = useCallback((error, context, metadata = {}) => {
    console.error(`${context} error:`, error);
    
    const errorCode = getNotificationErrorCode(error);
    const errorMessage = getNotificationErrorMessage(error, errorCode);

    setState(prev => ({
      ...prev,
      error: errorMessage,
      errorCode,
      isLoading: false,
      isRegistering: false,
      isScheduling: false,
    }));

    analyticsService.trackEvent('notification_error', {
      context,
      errorCode,
      userRole: user?.role,
      ...metadata,
    });

    errorService.captureError(error, {
      context: `Notification-${context}`,
      errorCode,
      ...metadata,
    });
  }, [user]);

  const getNotificationErrorCode = (error) => {
    if (error.message?.includes('permission') || error.message?.includes('Permission')) {
      return 'PERMISSION_ERROR';
    }
    if (error.message?.includes('token') || error.message?.includes('Token')) {
      return 'TOKEN_ERROR';
    }
    if (error.message?.includes('network') || error.message?.includes('Network')) {
      return 'NETWORK_ERROR';
    }
    if (error.response?.status === 429) {
      return 'RATE_LIMITED';
    }
    return 'UNKNOWN_ERROR';
  };

  const getNotificationErrorMessage = (error, errorCode) => {
    const errorMessages = {
      PERMISSION_ERROR: 'Notification permission is required. Please enable notifications in settings.',
      TOKEN_ERROR: 'Failed to register for push notifications. Please try again.',
      NETWORK_ERROR: 'Network connection issue. Please check your internet connection.',
      RATE_LIMITED: 'Too many notifications sent. Please wait a moment.',
      UNKNOWN_ERROR: 'An unexpected error occurred with notifications. Please try again.',
    };

    return errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
  };

  // ==================== CLEANUP ====================
  const cleanupNotifications = useCallback(() => {
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
    }
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
    }
    if (appStateListener.current) {
      appStateListener.current.remove();
    }
    if (badgeSyncTimer.current) {
      clearInterval(badgeSyncTimer.current);
    }
  }, []);

  // ==================== HOOK RETURN VALUE ====================
  return {
    // State
    ...state,
    
    // Permission Management
    requestPermission,
    
    // Notification Delivery
    sendNotification,
    sendConstructionNotification,
    sendAIMatchingNotification,
    sendPaymentNotification,
    
    // Scheduling
    scheduleNotification,
    scheduleConstructionReminder,
    
    // Notification Management
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    
    // Settings Management
    updateSettings,
    updateCategoryPreference,
    
    // Utility Functions
    clearErrors: () => setState(prev => ({ 
      ...prev, 
      error: null, 
      errorCode: null,
      permissionError: null,
      tokenError: null,
    })),
    
    // Derived State
    hasUnreadNotifications: state.unreadCount > 0,
    isCategoryEnabled: (category) => state.categoryPreferences[category] !== false,
    getNotificationsByType: (type) => state.notifications.filter(n => n.type === type),
    
    // Analytics
    notificationStats: {
      total: state.notifications.length,
      unread: state.unreadCount,
      byType: state.notifications.reduce((acc, notif) => {
        const type = notif.type || NOTIFICATION_TYPES.SYSTEM;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      deliveryStats: state.deliveryStats,
    },
  };
};

// ==================== HELPER FUNCTIONS ====================
const setupNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DEFAULT, {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.CONSTRUCTION, {
      name: 'Construction Updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.URGENT, {
      name: 'Urgent Notifications',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 1000],
      lightColor: '#FFFF0000',
    });

  } catch (error) {
    console.error('Failed to setup notification channels:', error);
  }
};

const registerForPushNotifications = async () => {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Replace with actual project ID
    });

    // Save token and update state would happen here
    return token.data;
  } catch (error) {
    throw error;
  }
};

const shouldShowAlert = async (notification) => {
  const settings = await storage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS) || {};
  return settings.enabled !== false;
};

const shouldPlaySound = async (notification) => {
  const settings = await storage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS) || {};
  return settings.sound !== false;
};

const shouldSetBadge = async (notification) => {
  const settings = await storage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS) || {};
  return settings.badge !== false;
};

const updateBadgeCount = async () => {
  // Implementation for updating badge count
};

const clearBadgeCount = async () => {
  // Implementation for clearing badge count
};

const syncBadgeCount = async () => {
  // Implementation for syncing badge count with server
};

const syncWithServer = async () => {
  // Implementation for syncing with server
};

const saveNotificationsToStorage = async () => {
  // Implementation for saving notifications to storage
};

const scheduleQuietHoursNotification = async (notification) => {
  // Implementation for scheduling notifications during quiet hours
};

const handleNotificationNavigation = (screen, params) => {
  // Implementation for handling notification navigation
};

const handleNotificationAction = (action, params) => {
  // Implementation for handling notification actions
};

const getConstructionReminderBody = (projectData, reminderType) => {
  // Implementation for construction reminder bodies
  return `Reminder for your construction project: ${projectData.name}`;
};

export default useNotifications;