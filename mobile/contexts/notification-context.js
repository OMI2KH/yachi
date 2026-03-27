// contexts/notification-context.js
/**
 * ENTERPRISE-LEVEL NOTIFICATION CONTEXT
 * Comprehensive notification management system with Ethiopian market optimization
 * Multi-platform support with advanced features for all Yachi services
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Platform, AppState, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useAuth } from './auth-context';
import { useUser } from './user-context';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITY, 
  NOTIFICATION_CHANNELS,
  USER_ROLES,
  ETHIOPIAN_REGIONS 
} from '../constants/notification';

// ==================== ACTION TYPES ====================
export const NOTIFICATION_ACTIONS = {
  // Initialization & Setup
  INITIALIZE_START: 'INITIALIZE_START',
  INITIALIZE_SUCCESS: 'INITIALIZE_SUCCESS',
  INITIALIZE_FAILURE: 'INITIALIZE_FAILURE',
  
  // Permission Management
  SET_PERMISSION_STATUS: 'SET_PERMISSION_STATUS',
  REQUEST_PERMISSION_START: 'REQUEST_PERMISSION_START',
  REQUEST_PERMISSION_SUCCESS: 'REQUEST_PERMISSION_SUCCESS',
  REQUEST_PERMISSION_FAILURE: 'REQUEST_PERMISSION_FAILURE',
  
  // Token Management
  SET_EXPO_PUSH_TOKEN: 'SET_EXPO_PUSH_TOKEN',
  SET_DEVICE_TOKEN: 'SET_DEVICE_TOKEN',
  REGISTER_TOKEN_START: 'REGISTER_TOKEN_START',
  REGISTER_TOKEN_SUCCESS: 'REGISTER_TOKEN_SUCCESS',
  REGISTER_TOKEN_FAILURE: 'REGISTER_TOKEN_FAILURE',
  
  // Notification Operations
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  CLEAR_ALL_NOTIFICATIONS: 'CLEAR_ALL_NOTIFICATIONS',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  ARCHIVE_NOTIFICATION: 'ARCHIVE_NOTIFICATION',
  
  // Settings & Preferences
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_CATEGORY_PREFERENCE: 'UPDATE_CATEGORY_PREFERENCE',
  UPDATE_ROLE_PREFERENCES: 'UPDATE_ROLE_PREFERENCES',
  UPDATE_REGIONAL_PREFERENCES: 'UPDATE_REGIONAL_PREFERENCES',
  
  // Status & Connectivity
  SET_LOADING: 'SET_LOADING',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_SYNC_STATUS: 'SET_SYNC_STATUS',
  
  // Error Management
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_PERMISSION_ERROR: 'SET_PERMISSION_ERROR',
};

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: 'yachi_notification_settings',
  CATEGORY_PREFERENCES: 'yachi_category_preferences',
  ROLE_PREFERENCES: 'yachi_role_preferences',
  REGIONAL_PREFERENCES: 'yachi_regional_preferences',
  NOTIFICATIONS_DATA: 'yachi_notifications_data',
  PERMISSION_STATUS: 'yachi_permission_status',
  DEVICE_TOKENS: 'yachi_device_tokens',
};

// ==================== INITIAL STATE ====================
const initialState = {
  // Permission & Initialization
  permissionStatus: null,
  isPermissionGranted: false,
  hasRequestedPermission: false,
  isInitialized: false,
  isLoading: false,
  
  // Notification Settings
  settings: {
    enabled: true,
    sound: true,
    vibration: true,
    badge: true,
    preview: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
    doNotDisturb: false,
  },
  
  // Category Preferences
  categoryPreferences: {
    // System & Security
    [NOTIFICATION_TYPES.SYSTEM]: true,
    [NOTIFICATION_TYPES.UPDATE]: true,
    [NOTIFICATION_TYPES.MAINTENANCE]: true,
    [NOTIFICATION_TYPES.SECURITY]: true,
    [NOTIFICATION_TYPES.VERIFICATION]: true,
    
    // Core Features
    [NOTIFICATION_TYPES.MESSAGE]: true,
    [NOTIFICATION_TYPES.BOOKING]: true,
    [NOTIFICATION_TYPES.PAYMENT]: true,
    [NOTIFICATION_TYPES.REVIEW]: true,
    
    // Construction & AI
    [NOTIFICATION_TYPES.CONSTRUCTION_UPDATE]: true,
    [NOTIFICATION_TYPES.AI_MATCHING]: true,
    [NOTIFICATION_TYPES.PROJECT_INVITATION]: true,
    [NOTIFICATION_TYPES.WORKER_ASSIGNMENT]: true,
    
    // Marketing & Engagement
    [NOTIFICATION_TYPES.PROMOTIONAL]: false,
    [NOTIFICATION_TYPES.NEWSLETTER]: false,
    [NOTIFICATION_TYPES.PREMIUM_OFFER]: true,
    [NOTIFICATION_TYPES.GAMIFICATION]: true,
  },
  
  // Role-Based Preferences
  rolePreferences: {
    [USER_ROLES.CLIENT]: {
      priority: [NOTIFICATION_TYPES.BOOKING, NOTIFICATION_TYPES.MESSAGE, NOTIFICATION_TYPES.PAYMENT],
      enabled: true,
    },
    [USER_ROLES.PROVIDER]: {
      priority: [NOTIFICATION_TYPES.PROJECT_INVITATION, NOTIFICATION_TYPES.MESSAGE, NOTIFICATION_TYPES.BOOKING],
      enabled: true,
    },
    [USER_ROLES.GOVERNMENT]: {
      priority: [NOTIFICATION_TYPES.CONSTRUCTION_UPDATE, NOTIFICATION_TYPES.SYSTEM, NOTIFICATION_TYPES.AI_MATCHING],
      enabled: true,
    },
    [USER_ROLES.ADMIN]: {
      priority: [NOTIFICATION_TYPES.SYSTEM, NOTIFICATION_TYPES.SECURITY, NOTIFICATION_TYPES.MAINTENANCE],
      enabled: true,
    },
  },
  
  // Regional Preferences
  regionalPreferences: {
    language: 'en',
    timezone: 'Africa/Addis_Ababa',
    workingHours: '09:00-18:00',
    holidayNotifications: true,
  },
  
  // Notification Data
  notifications: [],
  archivedNotifications: [],
  unreadCount: 0,
  badgeCount: 0,
  
  // Device & Token Management
  expoPushToken: null,
  deviceToken: null,
  deviceInfo: null,
  
  // Real-time & Sync
  isConnected: true,
  isSyncing: false,
  lastSync: null,
  pendingSync: [],
  
  // Error States
  error: null,
  errorCode: null,
  permissionError: null,
};

// ==================== NOTIFICATION REDUCER ====================
const notificationReducer = (state, action) => {
  switch (action.type) {
    // Initialization
    case NOTIFICATION_ACTIONS.INITIALIZE_START:
      return {
        ...state,
        isInitialized: false,
        isLoading: true,
      };

    case NOTIFICATION_ACTIONS.INITIALIZE_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isInitialized: true,
        isLoading: false,
        error: null,
      };

    case NOTIFICATION_ACTIONS.INITIALIZE_FAILURE:
      return {
        ...state,
        isInitialized: true,
        isLoading: false,
        error: action.payload.message,
        errorCode: action.payload.code,
      };

    // Permission Management
    case NOTIFICATION_ACTIONS.SET_PERMISSION_STATUS:
      return {
        ...state,
        permissionStatus: action.payload.status,
        isPermissionGranted: action.payload.granted,
        hasRequestedPermission: true,
      };

    case NOTIFICATION_ACTIONS.REQUEST_PERMISSION_START:
      return {
        ...state,
        isLoading: true,
        permissionError: null,
      };

    case NOTIFICATION_ACTIONS.REQUEST_PERMISSION_SUCCESS:
      return {
        ...state,
        isLoading: false,
        permissionStatus: action.payload.status,
        isPermissionGranted: action.payload.granted,
        hasRequestedPermission: true,
        permissionError: null,
      };

    case NOTIFICATION_ACTIONS.REQUEST_PERMISSION_FAILURE:
      return {
        ...state,
        isLoading: false,
        permissionError: action.payload.message,
      };

    // Token Management
    case NOTIFICATION_ACTIONS.SET_EXPO_PUSH_TOKEN:
      return {
        ...state,
        expoPushToken: action.payload,
      };

    case NOTIFICATION_ACTIONS.SET_DEVICE_TOKEN:
      return {
        ...state,
        deviceToken: action.payload,
      };

    case NOTIFICATION_ACTIONS.REGISTER_TOKEN_START:
      return {
        ...state,
        isSyncing: true,
      };

    case NOTIFICATION_ACTIONS.REGISTER_TOKEN_SUCCESS:
      return {
        ...state,
        isSyncing: false,
        deviceToken: action.payload,
      };

    case NOTIFICATION_ACTIONS.REGISTER_TOKEN_FAILURE:
      return {
        ...state,
        isSyncing: false,
        error: action.payload.message,
        errorCode: action.payload.code,
      };

    // Notification Operations
    case NOTIFICATION_ACTIONS.ADD_NOTIFICATION:
      const newNotification = {
        ...action.payload,
        id: action.payload.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: action.payload.timestamp || new Date().toISOString(),
        read: false,
        archived: false,
      };
      
      const updatedNotifications = [newNotification, ...state.notifications];
      const newUnreadCount = state.unreadCount + (newNotification.read ? 0 : 1);
      
      return {
        ...state,
        notifications: updatedNotifications.slice(0, 500), // Keep latest 500
        unreadCount: newUnreadCount,
        badgeCount: state.settings.badge ? newUnreadCount : 0,
      };

    case NOTIFICATION_ACTIONS.UPDATE_NOTIFICATION:
      const updatedNotificationsList = state.notifications.map(notification =>
        notification.id === action.payload.id
          ? { ...notification, ...action.payload.updates }
          : notification
      );
      
      const updatedUnreadCount = updatedNotificationsList.filter(n => !n.read).length;
      
      return {
        ...state,
        notifications: updatedNotificationsList,
        unreadCount: updatedUnreadCount,
        badgeCount: state.settings.badge ? updatedUnreadCount : 0,
      };

    case NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION:
      const filteredNotifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
      const removedUnreadCount = filteredNotifications.filter(n => !n.read).length;
      
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: removedUnreadCount,
        badgeCount: state.settings.badge ? removedUnreadCount : 0,
      };

    case NOTIFICATION_ACTIONS.MARK_AS_READ:
      const markedNotifications = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, read: true, readAt: new Date().toISOString() }
          : notification
      );
      
      const markedUnreadCount = markedNotifications.filter(n => !n.read).length;
      
      return {
        ...state,
        notifications: markedNotifications,
        unreadCount: markedUnreadCount,
        badgeCount: state.settings.badge ? markedUnreadCount : 0,
      };

    case NOTIFICATION_ACTIONS.MARK_ALL_AS_READ:
      const allReadNotifications = state.notifications.map(notification => ({
        ...notification,
        read: true,
        readAt: new Date().toISOString(),
      }));
      
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0,
        badgeCount: 0,
      };

    case NOTIFICATION_ACTIONS.CLEAR_ALL_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
        badgeCount: 0,
      };

    case NOTIFICATION_ACTIONS.ARCHIVE_NOTIFICATION:
      const notificationToArchive = state.notifications.find(n => n.id === action.payload);
      const filteredAfterArchive = state.notifications.filter(n => n.id !== action.payload);
      
      return {
        ...state,
        notifications: filteredAfterArchive,
        archivedNotifications: notificationToArchive 
          ? [notificationToArchive, ...state.archivedNotifications.slice(0, 199)]
          : state.archivedNotifications,
        unreadCount: filteredAfterArchive.filter(n => !n.read).length,
        badgeCount: state.settings.badge ? filteredAfterArchive.filter(n => !n.read).length : 0,
      };

    case NOTIFICATION_ACTIONS.SET_NOTIFICATIONS:
      const notifications = action.payload;
      const unreadCount = notifications.filter(n => !n.read).length;
      
      return {
        ...state,
        notifications,
        unreadCount,
        badgeCount: state.settings.badge ? unreadCount : 0,
        lastSync: new Date().toISOString(),
      };

    // Settings & Preferences
    case NOTIFICATION_ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
        badgeCount: action.payload.badge !== undefined 
          ? (action.payload.badge ? state.unreadCount : 0)
          : state.badgeCount,
      };

    case NOTIFICATION_ACTIONS.UPDATE_CATEGORY_PREFERENCE:
      return {
        ...state,
        categoryPreferences: {
          ...state.categoryPreferences,
          [action.payload.category]: action.payload.enabled,
        },
      };

    case NOTIFICATION_ACTIONS.UPDATE_ROLE_PREFERENCES:
      return {
        ...state,
        rolePreferences: {
          ...state.rolePreferences,
          ...action.payload,
        },
      };

    case NOTIFICATION_ACTIONS.UPDATE_REGIONAL_PREFERENCES:
      return {
        ...state,
        regionalPreferences: {
          ...state.regionalPreferences,
          ...action.payload,
        },
      };

    // Status & Connectivity
    case NOTIFICATION_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case NOTIFICATION_ACTIONS.SET_CONNECTED:
      return {
        ...state,
        isConnected: action.payload,
      };

    case NOTIFICATION_ACTIONS.SET_SYNC_STATUS:
      return {
        ...state,
        isSyncing: action.payload,
      };

    // Error Management
    case NOTIFICATION_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload.message,
        errorCode: action.payload.code,
      };

    case NOTIFICATION_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        errorCode: null,
        permissionError: null,
      };

    case NOTIFICATION_ACTIONS.SET_PERMISSION_ERROR:
      return {
        ...state,
        permissionError: action.payload,
      };

    default:
      return state;
  }
};

// ==================== NOTIFICATION CONTEXT ====================
const NotificationContext = createContext(null);

/**
 * Enterprise Notification Provider
 * Comprehensive notification management with Ethiopian market optimization
 */
export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { userProfile } = useUser();
  
  // Refs
  const notificationListener = useRef();
  const responseListener = useRef();
  const appStateListener = useRef();
  const syncInterval = useRef();
  const quietHoursCheck = useRef();

  // ==================== LIFECYCLE MANAGEMENT ====================
  useEffect(() => {
    initializeNotifications();
    setupNotificationChannels();

    return () => {
      cleanupListeners();
    };
  }, []);

  useEffect(() => {
    if (state.isPermissionGranted) {
      setupNotificationListeners();
      if (isAuthenticated) {
        registerForPushNotifications();
        startSyncInterval();
      }
    }
  }, [state.isPermissionGranted, isAuthenticated]);

  useEffect(() => {
    if (state.settings.quietHours.enabled) {
      startQuietHoursMonitoring();
    } else {
      stopQuietHoursMonitoring();
    }
  }, [state.settings.quietHours.enabled]);

  // ==================== INITIALIZATION ====================
  const initializeNotifications = useCallback(async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.INITIALIZE_START });

      // Load persisted data
      const [
        settings, 
        categoryPreferences, 
        rolePreferences,
        regionalPreferences,
        notificationsData,
        permissionStatus
      ] = await Promise.all([
        storage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS),
        storage.getItem(STORAGE_KEYS.CATEGORY_PREFERENCES),
        storage.getItem(STORAGE_KEYS.ROLE_PREFERENCES),
        storage.getItem(STORAGE_KEYS.REGIONAL_PREFERENCES),
        storage.getItem(STORAGE_KEYS.NOTIFICATIONS_DATA),
        storage.getItem(STORAGE_KEYS.PERMISSION_STATUS),
      ]);

      // Check current permission status
      const { status: currentStatus } = await Notifications.getPermissionsAsync();
      const isGranted = currentStatus === 'granted';

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => ({
          shouldShowAlert: shouldShowAlert(notification),
          shouldPlaySound: shouldPlaySound(notification),
          shouldSetBadge: state.settings?.badge ?? true,
        }),
      });

      dispatch({
        type: NOTIFICATION_ACTIONS.INITIALIZE_SUCCESS,
        payload: {
          settings: settings || initialState.settings,
          categoryPreferences: categoryPreferences || initialState.categoryPreferences,
          rolePreferences: rolePreferences || initialState.rolePreferences,
          regionalPreferences: regionalPreferences || initialState.regionalPreferences,
          notifications: notificationsData?.notifications || [],
          unreadCount: notificationsData?.unreadCount || 0,
          permissionStatus: permissionStatus || currentStatus,
          isPermissionGranted: isGranted,
          hasRequestedPermission: !!permissionStatus,
        },
      });

      analyticsService.trackEvent('notification_system_initialized', {
        permissionGranted: isGranted,
        platform: Platform.OS,
      });

    } catch (error) {
      handleNotificationError(error, 'NotificationInitialization');
    }
  }, []);

  // ==================== PERMISSION MANAGEMENT ====================
  const requestPermission = useCallback(async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.REQUEST_PERMISSION_START });

      // Check device capability
      if (!Device.isDevice) {
        throw new Error('Push notifications require a physical device');
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const isGranted = finalStatus === 'granted';

      dispatch({
        type: NOTIFICATION_ACTIONS.REQUEST_PERMISSION_SUCCESS,
        payload: {
          status: finalStatus,
          granted: isGranted,
        },
      });

      // Save permission status
      await storage.setItem(STORAGE_KEYS.PERMISSION_STATUS, finalStatus);

      if (isGranted) {
        setupNotificationListeners();
        registerForPushNotifications();
        analyticsService.trackEvent('notification_permission_granted');
      } else {
        analyticsService.trackEvent('notification_permission_denied');
      }

      return { granted: isGranted, status: finalStatus };

    } catch (error) {
      handleNotificationError(error, 'PermissionRequest');
      return { granted: false, status: 'undetermined', error: error.message };
    }
  }, []);

  // ==================== NOTIFICATION DELIVERY ====================
  const sendNotification = useCallback(async (notification) => {
    try {
      // Check if notification should be delivered based on preferences
      if (!shouldDeliverNotification(notification)) {
        return false;
      }

      // Check quiet hours
      if (isInQuietHours() && !notification.urgent) {
        scheduleQuietHoursNotification(notification);
        return false;
      }

      // Prepare notification content
      const notificationContent = {
        title: notification.title,
        body: notification.body,
        data: {
          ...notification.data,
          type: notification.type || NOTIFICATION_TYPES.SYSTEM,
          priority: notification.priority || NOTIFICATION_PRIORITY.DEFAULT,
          category: notification.category,
          action: notification.action,
          screen: notification.screen,
          params: notification.params,
        },
        sound: state.settings.sound,
        badge: state.settings.badge ? state.unreadCount + 1 : undefined,
      };

      // Send notification
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: notification.trigger || null, // Immediate if no trigger
      });

      // Add to local state
      dispatch({
        type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION,
        payload: notification,
      });

      analyticsService.trackEvent('notification_sent', {
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
      });

      return true;

    } catch (error) {
      handleNotificationError(error, 'SendNotification', { notification });
      return false;
    }
  }, [state.settings, state.unreadCount]);

  const sendLocalNotification = useCallback(async (notification) => {
    return sendNotification({
      ...notification,
      local: true,
    });
  }, [sendNotification]);

  const scheduleNotification = useCallback(async (notification, trigger) => {
    return sendNotification({
      ...notification,
      trigger,
    });
  }, [sendNotification]);

  // ==================== FEATURE-SPECIFIC NOTIFICATIONS ====================
  const sendConstructionNotification = useCallback(async (projectId, notificationData) => {
    const notification = {
      title: notificationData.title,
      body: notificationData.body,
      type: NOTIFICATION_TYPES.CONSTRUCTION_UPDATE,
      category: 'construction',
      priority: NOTIFICATION_PRIORITY.HIGH,
      data: {
        projectId,
        action: 'view_project',
        screen: 'projects/[id]',
        params: { id: projectId },
        ...notificationData.data,
      },
    };

    return sendNotification(notification);
  }, [sendNotification]);

  const sendAIMatchingNotification = useCallback(async (matchData) => {
    const notification = {
      title: 'AI Worker Match Found',
      body: `Optimal team composition ready for your ${matchData.projectType} project`,
      type: NOTIFICATION_TYPES.AI_MATCHING,
      category: 'ai_matching',
      priority: NOTIFICATION_PRIORITY.HIGH,
      data: {
        projectId: matchData.projectId,
        matchId: matchData.matchId,
        action: 'view_match',
        screen: 'construction/[id]',
        params: { id: matchData.projectId },
      },
    };

    return sendNotification(notification);
  }, [sendNotification]);

  const sendPaymentNotification = useCallback(async (paymentData) => {
    const notification = {
      title: paymentData.success ? 'Payment Successful' : 'Payment Failed',
      body: paymentData.message,
      type: NOTIFICATION_TYPES.PAYMENT,
      category: 'payment',
      priority: NOTIFICATION_PRIORITY.HIGH,
      data: {
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        provider: paymentData.provider,
        action: 'view_payment',
        screen: 'payment/history',
      },
    };

    return sendNotification(notification);
  }, [sendNotification]);

  const sendBookingNotification = useCallback(async (bookingData) => {
    const notification = {
      title: bookingData.title,
      body: bookingData.message,
      type: NOTIFICATION_TYPES.BOOKING,
      category: 'booking',
      priority: NOTIFICATION_PRIORITY.DEFAULT,
      data: {
        bookingId: bookingData.bookingId,
        status: bookingData.status,
        action: 'view_booking',
        screen: 'bookings/[id]',
        params: { id: bookingData.bookingId },
      },
    };

    return sendNotification(notification);
  }, [sendNotification]);

  // ==================== NOTIFICATION MANAGEMENT ====================
  const markAsRead = useCallback(async (notificationId) => {
    try {
      dispatch({
        type: NOTIFICATION_ACTIONS.MARK_AS_READ,
        payload: notificationId,
      });

      // Sync with server if authenticated
      if (isAuthenticated) {
        await api.patch(`/notifications/${notificationId}/read`);
      }

      // Update badge count
      updateBadgeCount();

      analyticsService.trackEvent('notification_marked_read', { notificationId });

    } catch (error) {
      handleNotificationError(error, 'MarkAsRead', { notificationId });
    }
  }, [isAuthenticated]);

  const markAllAsRead = useCallback(async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.MARK_ALL_AS_READ });

      // Sync with server if authenticated
      if (isAuthenticated) {
        await api.post('/notifications/mark-all-read');
      }

      // Clear badge count
      clearBadgeCount();

      analyticsService.trackEvent('all_notifications_marked_read');

    } catch (error) {
      handleNotificationError(error, 'MarkAllAsRead');
    }
  }, [isAuthenticated]);

  const clearAllNotifications = useCallback(async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_ALL_NOTIFICATIONS });

      // Clear from server if authenticated
      if (isAuthenticated) {
        await api.delete('/notifications/clear');
      }

      // Clear badge count
      clearBadgeCount();

      analyticsService.trackEvent('all_notifications_cleared');

    } catch (error) {
      handleNotificationError(error, 'ClearAllNotifications');
    }
  }, [isAuthenticated]);

  const archiveNotification = useCallback(async (notificationId) => {
    try {
      dispatch({
        type: NOTIFICATION_ACTIONS.ARCHIVE_NOTIFICATION,
        payload: notificationId,
      });

      analyticsService.trackEvent('notification_archived', { notificationId });

    } catch (error) {
      handleNotificationError(error, 'ArchiveNotification', { notificationId });
    }
  }, []);

  // ==================== SETTINGS MANAGEMENT ====================
  const updateSettings = useCallback(async (newSettings) => {
    try {
      dispatch({
        type: NOTIFICATION_ACTIONS.UPDATE_SETTINGS,
        payload: newSettings,
      });

      // Save to storage
      await storage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
        ...state.settings,
        ...newSettings,
      });

      // Update badge settings
      if (newSettings.badge !== undefined) {
        if (newSettings.badge) {
          updateBadgeCount();
        } else {
          clearBadgeCount();
        }
      }

      analyticsService.trackEvent('notification_settings_updated', newSettings);

    } catch (error) {
      handleNotificationError(error, 'UpdateSettings', { newSettings });
    }
  }, [state.settings]);

  const updateCategoryPreference = useCallback(async (category, enabled) => {
    try {
      dispatch({
        type: NOTIFICATION_ACTIONS.UPDATE_CATEGORY_PREFERENCE,
        payload: { category, enabled },
      });

      // Save to storage
      await storage.setItem(STORAGE_KEYS.CATEGORY_PREFERENCES, {
        ...state.categoryPreferences,
        [category]: enabled,
      });

      analyticsService.trackEvent('category_preference_updated', { category, enabled });

    } catch (error) {
      handleNotificationError(error, 'UpdateCategoryPreference', { category, enabled });
    }
  }, [state.categoryPreferences]);

  // ==================== UTILITY FUNCTIONS ====================
  const shouldDeliverNotification = useCallback((notification) => {
    // Check if notifications are enabled
    if (!state.settings.enabled) return false;

    // Check category preference
    if (notification.type && !state.categoryPreferences[notification.type]) {
      return false;
    }

    // Check do not disturb
    if (state.settings.doNotDisturb && !notification.urgent) {
      return false;
    }

    // Check user role preferences
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

  const scheduleQuietHoursNotification = useCallback(async (notification) => {
    // Schedule notification for after quiet hours
    const [endHour, endMinute] = state.settings.quietHours.end.split(':').map(Number);
    const trigger = new Date();
    trigger.setHours(endHour, endMinute, 0, 0);
    
    if (trigger < new Date()) {
      trigger.setDate(trigger.getDate() + 1);
    }

    await scheduleNotification(notification, trigger);
  }, [state.settings.quietHours, scheduleNotification]);

  const updateBadgeCount = useCallback(async () => {
    if (!state.settings.badge) return;

    try {
      await Notifications.setBadgeCountAsync(state.unreadCount);
    } catch (error) {
      console.warn('Failed to update badge count:', error);
    }
  }, [state.settings.badge, state.unreadCount]);

  const clearBadgeCount = useCallback(async () => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.warn('Failed to clear badge count:', error);
    }
  }, []);

  // ==================== NOTIFICATION HANDLERS ====================
  const handleIncomingNotification = useCallback((notification) => {
    try {
      const { data, ...notificationData } = notification.request.content;
      
      // Add to local state
      dispatch({
        type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION,
        payload: {
          ...notificationData,
          data,
          type: data?.type || NOTIFICATION_TYPES.SYSTEM,
          priority: data?.priority || NOTIFICATION_PRIORITY.DEFAULT,
        },
      });

      // Update badge count
      updateBadgeCount();

      analyticsService.trackEvent('notification_received', {
        type: data?.type,
        category: data?.category,
        priority: data?.priority,
      });

    } catch (error) {
      handleNotificationError(error, 'HandleIncomingNotification', {
        notification: notification.request.content
      });
    }
  }, [updateBadgeCount]);

  const handleNotificationResponse = useCallback((response) => {
    try {
      const { data } = response.notification.request.content;
      
      // Mark as read
      if (response.notification.request.identifier) {
        markAsRead(response.notification.request.identifier);
      }

      // Track analytics
      analyticsService.trackEvent('notification_opened', {
        type: data?.type,
        category: data?.category,
      });

      // Handle navigation
      if (data?.screen) {
        handleNotificationNavigation(data.screen, data.params);
      } else if (data?.url) {
        Linking.openURL(data.url);
      }

    } catch (error) {
      handleNotificationError(error, 'HandleNotificationResponse', {
        response: response.notification.request.content
      });
    }
  }, [markAsRead]);

  const handleNotificationNavigation = useCallback((screen, params = {}) => {
    // Implement navigation based on your app structure
    try {
      router.push({
        pathname: screen,
        params,
      });
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  }, []);

  // ==================== SETUP FUNCTIONS ====================
  const setupNotificationChannels = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DEFAULT, {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MESSAGES, {
        name: 'Messages',
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
      handleNotificationError(error, 'SetupNotificationChannels');
    }
  }, []);

  const setupNotificationListeners = useCallback(() => {
    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(handleIncomingNotification);

    // Listen for notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Listen for app state changes
    appStateListener.current = AppState.addEventListener('change', handleAppStateChange);
  }, [handleIncomingNotification, handleNotificationResponse]);

  const handleAppStateChange = useCallback((nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground - clear badge count and sync
      clearBadgeCount();
      if (isAuthenticated) {
        syncWithServer();
      }
    }
  }, [isAuthenticated, clearBadgeCount]);

  const registerForPushNotifications = useCallback(async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.REGISTER_TOKEN_START });

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with actual project ID
      });

      dispatch({
        type: NOTIFICATION_ACTIONS.SET_EXPO_PUSH_TOKEN,
        payload: token.data,
      });

      // Register with backend
      if (isAuthenticated && user) {
        await registerTokenWithBackend(token.data);
      }

      dispatch({
        type: NOTIFICATION_ACTIONS.REGISTER_TOKEN_SUCCESS,
        payload: token.data,
      });

      return token.data;

    } catch (error) {
      handleNotificationError(error, 'RegisterForPushNotifications');
      return null;
    }
  }, [isAuthenticated, user]);

  const registerTokenWithBackend = useCallback(async (token) => {
    try {
      await api.post('/notifications/register-token', {
        token,
        platform: Platform.OS,
        deviceId: Device.modelId,
        appVersion: '1.0.0',
      });

      analyticsService.trackEvent('push_token_registered', {
        platform: Platform.OS,
      });

    } catch (error) {
      handleNotificationError(error, 'RegisterTokenWithBackend', { token });
    }
  }, []);

  const startSyncInterval = useCallback(() => {
    syncInterval.current = setInterval(() => {
      if (isAuthenticated) {
        syncWithServer();
      }
    }, 5 * 60 * 1000); // Sync every 5 minutes
  }, [isAuthenticated]);

  const syncWithServer = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      dispatch({ type: NOTIFICATION_ACTIONS.SET_SYNC_STATUS, payload: true });

      const response = await api.get('/notifications');
      const serverNotifications = response.data.notifications;

      dispatch({
        type: NOTIFICATION_ACTIONS.SET_NOTIFICATIONS,
        payload: serverNotifications,
      });

      // Save to local storage
      await storage.setItem(STORAGE_KEYS.NOTIFICATIONS_DATA, {
        notifications: serverNotifications,
        unreadCount: serverNotifications.filter(n => !n.read).length,
        lastSynced: new Date().toISOString(),
      });

      dispatch({ type: NOTIFICATION_ACTIONS.SET_SYNC_STATUS, payload: false });

    } catch (error) {
      handleNotificationError(error, 'SyncWithServer');
      dispatch({ type: NOTIFICATION_ACTIONS.SET_SYNC_STATUS, payload: false });
    }
  }, [isAuthenticated]);

  const startQuietHoursMonitoring = useCallback(() => {
    quietHoursCheck.current = setInterval(() => {
      // Check if we've entered or exited quiet hours
      // This could trigger settings updates if needed
    }, 60 * 1000); // Check every minute
  }, []);

  const stopQuietHoursMonitoring = useCallback(() => {
    if (quietHoursCheck.current) {
      clearInterval(quietHoursCheck.current);
    }
  }, []);

  const handleNotificationError = useCallback((error, context, metadata = {}) => {
    console.error(`${context} error:`, error);
    
    const errorMessage = error.response?.data?.message || getNotificationErrorMessage(error);
    const errorCode = error.response?.data?.code || 'NOTIFICATION_ERROR';

    dispatch({
      type: NOTIFICATION_ACTIONS.SET_ERROR,
      payload: { message: errorMessage, code: errorCode },
    });

    analyticsService.trackEvent(`${context.toLowerCase()}_failed`, {
      errorCode,
      ...metadata,
    });

    errorService.captureError(error, {
      context,
      ...metadata,
    });
  }, []);

  const getNotificationErrorMessage = (error) => {
    if (error.message?.includes('network') || error.message?.includes('Network')) {
      return 'Unable to connect to notification service. Please check your internet connection.';
    }
    if (error.response?.status === 403) {
      return 'Notification permission denied. Please enable notifications in settings.';
    }
    if (error.response?.status >= 500) {
      return 'Notification service is temporarily unavailable. Please try again later.';
    }
    return 'An error occurred with the notification service. Please try again.';
  };

  const cleanupListeners = useCallback(() => {
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
    }
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
    }
    if (appStateListener.current) {
      appStateListener.current.remove();
    }
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
    }
    if (quietHoursCheck.current) {
      clearInterval(quietHoursCheck.current);
    }
  }, []);

  // Helper functions for notification handler
  const shouldShowAlert = (notification) => {
    return state.settings.enabled && !state.settings.doNotDisturb;
  };

  const shouldPlaySound = (notification) => {
    return state.settings.sound && !isInQuietHours();
  };

  // ==================== CONTEXT VALUE ====================
  const value = {
    // State
    ...state,
    
    // Permission Management
    requestPermission,
    
    // Notification Delivery
    sendNotification,
    sendLocalNotification,
    scheduleNotification,
    
    // Feature-Specific Notifications
    sendConstructionNotification,
    sendAIMatchingNotification,
    sendPaymentNotification,
    sendBookingNotification,
    
    // Notification Management
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    archiveNotification,
    
    // Settings Management
    updateSettings,
    updateCategoryPreference,
    
    // Utility Functions
    updateBadgeCount,
    clearBadgeCount,
    clearError: () => dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_ERROR }),
    
    // Derived State
    unreadNotifications: state.notifications.filter(n => !n.read),
    urgentNotifications: state.notifications.filter(n => 
      n.priority === NOTIFICATION_PRIORITY.HIGH || n.priority === NOTIFICATION_PRIORITY.MAX
    ),
    notificationStats: {
      total: state.notifications.length,
      unread: state.unreadCount,
      urgent: state.notifications.filter(n => 
        n.priority === NOTIFICATION_PRIORITY.HIGH || n.priority === NOTIFICATION_PRIORITY.MAX
      ).length,
      byCategory: state.notifications.reduce((acc, notif) => {
        const category = notif.data?.category || 'other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),
    },
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Custom hook to use notification context
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Hook for notification category management
 */
export function useNotificationCategory(category) {
  const { categoryPreferences, updateCategoryPreference } = useNotification();
  
  return {
    enabled: categoryPreferences[category] ?? true,
    toggle: () => updateCategoryPreference(category, !categoryPreferences[category]),
    enable: () => updateCategoryPreference(category, true),
    disable: () => updateCategoryPreference(category, false),
  };
}

export default NotificationContext;