// contexts/user-context.js

/**
 * ENTERPRISE-GRADE USER MANAGEMENT SYSTEM
 * Yachi Mobile App - Complete User State & Authentication
 * 
 * Enterprise Features:
 * - Multi-role authentication (Client, Worker, Government, Admin)
 * - AI Construction worker profile management
 * - Ethiopian market user verification
 * - Advanced session management with biometrics
 * - Real-time profile synchronization
 * - Role-based feature access control
 * - Offline capability with conflict resolution
 * - Comprehensive analytics integration
 * - Enterprise security compliance
 * - Multi-device session control
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { notificationService } from '../services/notification-service';

// =============================================================================
// ENTERPRISE CONSTANTS & CONFIGURATION
// =============================================================================

export const USER_ROLES = {
  CLIENT: 'client',
  WORKER: 'worker',
  CONTRACTOR: 'contractor',
  GOVERNMENT: 'government',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
  VERIFIED: 'verified',
  PREMIUM: 'premium',
};

export const AUTH_METHODS = {
  EMAIL: 'email',
  PHONE: 'phone',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple',
  BIOMETRIC: 'biometric',
};

export const PERMISSIONS = {
  // Core Platform Permissions
  VIEW_DASHBOARD: 'view_dashboard',
  CREATE_BOOKING: 'create_booking',
  MANAGE_SERVICES: 'manage_services',
  ACCESS_CHAT: 'access_chat',
  VIEW_PROFILES: 'view_profiles',

  // Worker Permissions
  MANAGE_AVAILABILITY: 'manage_availability',
  UPDATE_PORTFOLIO: 'update_portfolio',
  ACCEPT_BOOKINGS: 'accept_bookings',
  MANAGE_SCHEDULE: 'manage_schedule',

  // Construction Features
  CREATE_CONSTRUCTION_PROJECT: 'create_construction_project',
  MANAGE_CONSTRUCTION_TEAM: 'manage_construction_team',
  ACCESS_AI_MATCHING: 'access_ai_matching',
  VIEW_GOVERNMENT_PROJECTS: 'view_government_projects',

  // Government Features
  MANAGE_INFRASTRUCTURE: 'manage_infrastructure',
  APPROVE_PROJECTS: 'approve_projects',
  ACCESS_ANALYTICS: 'access_analytics',
  BULK_WORKER_MANAGEMENT: 'bulk_worker_management',

  // Admin Permissions
  MANAGE_USERS: 'manage_users',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_CONTENT: 'manage_content',
  SYSTEM_CONFIGURATION: 'system_configuration',

  // Premium Features
  PREMIUM_BADGE: 'premium_badge',
  FEATURED_LISTING: 'featured_listing',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  PRIORITY_SUPPORT: 'priority_support',
};

const STORAGE_KEYS = {
  USER_DATA: '@yachi_user_data',
  AUTH_TOKENS: '@yachi_auth_tokens',
  USER_PREFERENCES: '@yachi_user_preferences',
  SESSION_INFO: '@yachi_session_info',
  LOGIN_METHOD: '@yachi_login_method',
  BIOMETRIC_DATA: '@yachi_biometric_data',
};

// =============================================================================
// ENTERPRISE STATE MANAGEMENT
// =============================================================================

const initialState = {
  // Authentication State
  isAuthenticated: false,
  isInitialized: false,
  isVerifying: false,
  isBiometricEnabled: false,

  // User Core Data
  user: null,
  profile: null,
  preferences: null,
  verification: null,

  // Session Management
  session: null,
  tokens: null,
  refreshTimeout: null,
  lastTokenRefresh: null,

  // Roles & Permissions
  roles: [],
  permissions: new Set(),
  featureFlags: new Set(),

  // Status Management
  isLoading: false,
  isUpdating: false,
  isRefreshing: false,
  isSyncing: false,

  // Error Handling
  error: null,
  authError: null,
  profileError: null,

  // Network State
  isOnline: true,
  pendingUpdates: [],
  lastSync: null,

  // Security
  loginAttempts: 0,
  lastActivity: null,
  securityLevel: 'standard',

  // Ethiopian Market Specific
  localSettings: {
    currency: 'ETB',
    language: 'en',
    timezone: 'Africa/Addis_Ababa',
    measurement: 'metric',
  },

  // Construction Industry Specific
  constructionProfile: null,
  workerSkills: [],
  certifications: [],
  governmentClearance: null,
};

const USER_ACTION_TYPES = {
  // System Initialization
  INITIALIZE_START: 'INITIALIZE_START',
  INITIALIZE_SUCCESS: 'INITIALIZE_SUCCESS',
  INITIALIZE_FAILURE: 'INITIALIZE_FAILURE',

  // Authentication
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // User Data Management
  SET_USER_DATA: 'SET_USER_DATA',
  UPDATE_USER_PROFILE: 'UPDATE_USER_PROFILE',
  UPDATE_CONSTRUCTION_PROFILE: 'UPDATE_CONSTRUCTION_PROFILE',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  UPDATE_VERIFICATION: 'UPDATE_VERIFICATION',

  // Session Management
  SET_AUTH_TOKENS: 'SET_AUTH_TOKENS',
  REFRESH_TOKEN_START: 'REFRESH_TOKEN_START',
  REFRESH_TOKEN_SUCCESS: 'REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILURE: 'REFRESH_TOKEN_FAILURE',

  // Role & Permission Management
  UPDATE_ROLES: 'UPDATE_ROLES',
  UPDATE_PERMISSIONS: 'UPDATE_PERMISSIONS',
  UPDATE_FEATURE_FLAGS: 'UPDATE_FEATURE_FLAGS',

  // Status Management
  SET_LOADING: 'SET_LOADING',
  SET_UPDATING: 'SET_UPDATING',
  SET_SYNCING: 'SET_SYNCING',

  // Error Management
  SET_ERROR: 'SET_ERROR',
  SET_AUTH_ERROR: 'SET_AUTH_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',

  // Network Management
  SET_ONLINE_STATUS: 'SET_ONLINE_STATUS',
  ADD_PENDING_UPDATE: 'ADD_PENDING_UPDATE',
  CLEAR_PENDING_UPDATES: 'CLEAR_PENDING_UPDATES',

  // Security Management
  UPDATE_SECURITY: 'UPDATE_SECURITY',
  UPDATE_ACTIVITY: 'UPDATE_ACTIVITY',
  ENABLE_BIOMETRIC: 'ENABLE_BIOMETRIC',
};

// =============================================================================
// ENTERPRISE REDUCER
// =============================================================================

const userReducer = (state, action) => {
  switch (action.type) {
    case USER_ACTION_TYPES.INITIALIZE_START:
      return {
        ...state,
        isInitialized: false,
        isVerifying: true,
        error: null,
      };

    case USER_ACTION_TYPES.INITIALIZE_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isInitialized: true,
        isVerifying: false,
        error: null,
        authError: null,
      };

    case USER_ACTION_TYPES.INITIALIZE_FAILURE:
      return {
        ...initialState,
        isInitialized: true,
        isVerifying: false,
        error: action.payload,
      };

    case USER_ACTION_TYPES.LOGIN_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        loginAttempts: 0,
        lastActivity: Date.now(),
      };

    case USER_ACTION_TYPES.LOGIN_FAILURE:
      return {
        ...state,
        isLoading: false,
        authError: action.payload,
        loginAttempts: state.loginAttempts + 1,
      };

    case USER_ACTION_TYPES.LOGOUT:
      return {
        ...initialState,
        isInitialized: true,
        localSettings: state.localSettings, // Preserve local settings
      };

    case USER_ACTION_TYPES.SET_USER_DATA:
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile,
        constructionProfile: action.payload.constructionProfile,
        verification: action.payload.verification,
        roles: action.payload.roles || [],
        permissions: new Set(action.payload.permissions || []),
        featureFlags: new Set(action.payload.featureFlags || []),
      };

    case USER_ACTION_TYPES.UPDATE_CONSTRUCTION_PROFILE:
      return {
        ...state,
        constructionProfile: {
          ...state.constructionProfile,
          ...action.payload,
        },
        workerSkills: action.payload.skills || state.workerSkills,
        certifications: action.payload.certifications || state.certifications,
        isUpdating: false,
      };

    case USER_ACTION_TYPES.UPDATE_ROLES:
      return {
        ...state,
        roles: action.payload.roles,
        permissions: new Set(action.payload.permissions),
      };

    case USER_ACTION_TYPES.UPDATE_SECURITY:
      return {
        ...state,
        securityLevel: action.payload.securityLevel,
        isBiometricEnabled: action.payload.biometricEnabled ?? state.isBiometricEnabled,
        lastActivity: action.payload.updateActivity ? Date.now() : state.lastActivity,
      };

    case USER_ACTION_TYPES.ENABLE_BIOMETRIC:
      return {
        ...state,
        isBiometricEnabled: action.payload.enabled,
        securityLevel: action.payload.enabled ? 'enhanced' : 'standard',
      };

    default:
      return {
        ...state,
        ...action.payload,
      };
  }
};

// =============================================================================
// ENTERPRISE USER PROVIDER
// =============================================================================

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  
  const appStateRef = useRef(AppState.currentState);
  const refreshTimerRef = useRef(null);
  const activityTimerRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // ===========================================================================
  // ENTERPRISE INITIALIZATION
  // ===========================================================================

  const initializeEnterpriseUser = useCallback(async () => {
    try {
      dispatch({ type: USER_ACTION_TYPES.INITIALIZE_START });

      // Load all enterprise user data
      const [userData, authTokens, preferences, sessionInfo, biometricData] = await Promise.all([
        storage.get(STORAGE_KEYS.USER_DATA),
        storage.get(STORAGE_KEYS.AUTH_TOKENS),
        storage.get(STORAGE_KEYS.USER_PREFERENCES),
        storage.get(STORAGE_KEYS.SESSION_INFO),
        storage.get(STORAGE_KEYS.BIOMETRIC_DATA),
      ]);

      // Verify authentication state
      if (authTokens?.accessToken && await verifyEnterpriseToken(authTokens.accessToken)) {
        await setupAuthenticatedState(userData, authTokens, sessionInfo, preferences, biometricData);
      } else {
        await setupUnauthenticatedState(preferences);
      }

      // Start enterprise monitoring
      startEnterpriseMonitoring();

      await analyticsService.trackEvent('enterprise_user_system_initialized', {
        isAuthenticated: !!authTokens?.accessToken,
        hasBiometric: !!biometricData,
        userRole: userData?.user?.role,
      });

    } catch (error) {
      await errorService.captureError(error, { context: 'EnterpriseUserInitialization' });
      
      dispatch({
        type: USER_ACTION_TYPES.INITIALIZE_FAILURE,
        payload: error.message,
      });
    }
  }, []);

  const setupAuthenticatedState = async (userData, authTokens, sessionInfo, preferences, biometricData) => {
    // Fetch fresh user data from server
    const freshUserData = await fetchEnterpriseUserData();
    
    const enterpriseData = {
      isAuthenticated: true,
      user: freshUserData.user || userData?.user,
      profile: freshUserData.profile || userData?.profile,
      constructionProfile: freshUserData.constructionProfile,
      verification: freshUserData.verification,
      preferences: preferences || getEnterpriseDefaultPreferences(),
      tokens: authTokens,
      session: sessionInfo,
      roles: freshUserData.roles || userData?.roles || [],
      permissions: new Set(freshUserData.permissions || userData?.permissions || []),
      featureFlags: new Set(freshUserData.featureFlags || []),
      isBiometricEnabled: !!biometricData,
      localSettings: preferences?.localSettings || initialState.localSettings,
    };

    dispatch({
      type: USER_ACTION_TYPES.INITIALIZE_SUCCESS,
      payload: enterpriseData,
    });

    // Schedule token refresh
    scheduleEnterpriseTokenRefresh(authTokens.expiresIn);

    // Initialize enterprise services
    await initializeEnterpriseServices(freshUserData.user);

    // Start background sync
    startBackgroundSync();
  };

  const setupUnauthenticatedState = async (preferences) => {
    dispatch({
      type: USER_ACTION_TYPES.INITIALIZE_SUCCESS,
      payload: {
        isAuthenticated: false,
        preferences: preferences || getEnterpriseDefaultPreferences(),
        localSettings: preferences?.localSettings || initialState.localSettings,
      },
    });
  };

  // ===========================================================================
  // ENTERPRISE AUTHENTICATION
  // ===========================================================================

  const loginEnterprise = useCallback(async (credentials, method = AUTH_METHODS.EMAIL) => {
    try {
      dispatch({ type: USER_ACTION_TYPES.LOGIN_START });

      // Ethiopian market specific validation
      if (method === AUTH_METHODS.PHONE) {
        await validateEthiopianPhone(credentials.phone);
      }

      const response = await api.post('/auth/enterprise-login', {
        ...credentials,
        method,
        deviceInfo: getDeviceInfo(),
      });

      const { user, profile, tokens, session, roles, permissions, featureFlags, constructionProfile } = response.data;

      // Store enterprise data securely
      await storeEnterpriseAuthData({
        user,
        profile,
        tokens,
        session,
        roles,
        permissions,
        featureFlags,
        constructionProfile,
      });

      // Update context with enterprise data
      dispatch({
        type: USER_ACTION_TYPES.LOGIN_SUCCESS,
        payload: {
          user,
          profile,
          tokens,
          session,
          roles,
          permissions: new Set(permissions),
          featureFlags: new Set(featureFlags),
          constructionProfile,
        },
      });

      // Initialize enterprise services
      await initializeEnterpriseServices(user);

      // Schedule token refresh
      scheduleEnterpriseTokenRefresh(tokens.expiresIn);

      await analyticsService.trackEvent('enterprise_user_login', {
        method,
        role: user.role,
        userId: user.id,
      });

      return { success: true, user };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseUserLogin',
        method,
        credentials: { ...credentials, password: undefined },
      });

      dispatch({
        type: USER_ACTION_TYPES.LOGIN_FAILURE,
        payload: error.message,
      });

      return { success: false, error: error.message };
    }
  }, []);

  const logoutEnterprise = useCallback(async (reason = 'user_initiated') => {
    try {
      // Clear all timers and intervals
      clearEnterpriseTimers();

      // Call enterprise logout API
      if (state.isAuthenticated && state.tokens) {
        await api.post('/auth/enterprise-logout', {
          refreshToken: state.tokens.refreshToken,
          reason,
          deviceId: getDeviceId(),
        }).catch(() => {
          // Silent fail for logout
        });
      }

      // Clear all stored data
      await clearEnterpriseStorage();

      // Reset analytics
      analyticsService.trackEvent('enterprise_user_logout', { reason });
      analyticsService.reset();

      // Update context
      dispatch({ type: USER_ACTION_TYPES.LOGOUT });

    } catch (error) {
      await errorService.captureError(error, { context: 'EnterpriseUserLogout', reason });
      
      // Force logout even if cleanup fails
      dispatch({ type: USER_ACTION_TYPES.LOGOUT });
    }
  }, [state.isAuthenticated, state.tokens]);

  // ===========================================================================
  // ENTERPRISE USER MANAGEMENT
  // ===========================================================================

  const updateEnterpriseUser = useCallback(async (updates) => {
    try {
      dispatch({ type: USER_ACTION_TYPES.SET_UPDATING, payload: true });

      const response = await api.patch('/users/enterprise-profile', updates);
      const updatedUser = response.data;

      // Update stored data
      await updateStoredUserData({ user: updatedUser });

      dispatch({
        type: USER_ACTION_TYPES.UPDATE_USER_PROFILE,
        payload: updatedUser,
      });

      // Update analytics
      analyticsService.identifyUser(updatedUser);

      return { success: true, user: updatedUser };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseUserUpdate',
        updates,
      });

      // If offline, queue update for later sync
      if (!state.isOnline) {
        dispatch({
          type: USER_ACTION_TYPES.ADD_PENDING_UPDATE,
          payload: { type: 'user_update', data: updates },
        });
        
        return { success: true, user: { ...state.user, ...updates }, queued: true };
      }

      dispatch({
        type: USER_ACTION_TYPES.SET_ERROR,
        payload: error.message,
      });

      return { success: false, error: error.message };
    }
  }, [state.isOnline, state.user]);

  const updateConstructionProfile = useCallback(async (profileData) => {
    try {
      dispatch({ type: USER_ACTION_TYPES.SET_UPDATING, payload: true });

      const response = await api.patch('/users/construction-profile', profileData);
      const updatedProfile = response.data;

      // Update stored data
      await updateStoredUserData({ constructionProfile: updatedProfile });

      dispatch({
        type: USER_ACTION_TYPES.UPDATE_CONSTRUCTION_PROFILE,
        payload: updatedProfile,
      });

      await analyticsService.trackEvent('construction_profile_updated', {
        userId: state.user?.id,
        skillsCount: updatedProfile.skills?.length || 0,
        certificationsCount: updatedProfile.certifications?.length || 0,
      });

      return { success: true, profile: updatedProfile };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ConstructionProfileUpdate',
        profileData,
      });

      dispatch({
        type: USER_ACTION_TYPES.SET_ERROR,
        payload: error.message,
      });

      return { success: false, error: error.message };
    }
  }, [state.user]);

  // ===========================================================================
  // ENTERPRISE ROLE & PERMISSION MANAGEMENT
  // ===========================================================================

  const hasEnterprisePermission = useCallback((permission) => {
    return state.permissions.has(permission);
  }, [state.permissions]);

  const hasEnterpriseRole = useCallback((role) => {
    return state.roles.includes(role);
  }, [state.roles]);

  const hasAnyEnterpriseRole = useCallback((roles) => {
    return roles.some(role => state.roles.includes(role));
  }, [state.roles]);

  const canAccessConstructionFeature = useCallback((feature) => {
    const constructionPermissions = [
      PERMISSIONS.CREATE_CONSTRUCTION_PROJECT,
      PERMISSIONS.MANAGE_CONSTRUCTION_TEAM,
      PERMISSIONS.ACCESS_AI_MATCHING,
    ];
    
    return hasAnyEnterpriseRole([USER_ROLES.CONTRACTOR, USER_ROLES.GOVERNMENT]) &&
           constructionPermissions.some(perm => hasEnterprisePermission(perm));
  }, [hasAnyEnterpriseRole, hasEnterprisePermission]);

  // ===========================================================================
  // ENTERPRISE SESSION MANAGEMENT
  // ===========================================================================

  const refreshEnterpriseTokens = useCallback(async () => {
    try {
      if (!state.tokens?.refreshToken) {
        throw new Error('ENTERPRISE_REFRESH_TOKEN_UNAVAILABLE');
      }

      dispatch({ type: USER_ACTION_TYPES.REFRESH_TOKEN_START });

      const response = await api.post('/auth/enterprise-refresh', {
        refreshToken: state.tokens.refreshToken,
        deviceId: getDeviceId(),
      });

      const newTokens = response.data;

      // Update stored tokens
      await storage.set(STORAGE_KEYS.AUTH_TOKENS, newTokens);

      dispatch({
        type: USER_ACTION_TYPES.REFRESH_TOKEN_SUCCESS,
        payload: newTokens,
      });

      // Reschedule refresh
      scheduleEnterpriseTokenRefresh(newTokens.expiresIn);

      return { success: true, tokens: newTokens };

    } catch (error) {
      await errorService.captureError(error, { context: 'EnterpriseTokenRefresh' });

      dispatch({
        type: USER_ACTION_TYPES.REFRESH_TOKEN_FAILURE,
        payload: error.message,
      });

      // If refresh fails due to invalid token, logout
      if (error.response?.status === 401) {
        logoutEnterprise('token_refresh_failed');
      }

      return { success: false, error: error.message };
    }
  }, [state.tokens, logoutEnterprise]);

  // ===========================================================================
  // ENTERPRISE SECURITY FEATURES
  // ===========================================================================

  const enableBiometricAuth = useCallback(async (enable = true) => {
    try {
      if (enable) {
        // Store biometric data securely
        const biometricData = await generateBiometricData();
        await storage.set(STORAGE_KEYS.BIOMETRIC_DATA, biometricData);
      } else {
        await storage.remove(STORAGE_KEYS.BIOMETRIC_DATA);
      }

      dispatch({
        type: USER_ACTION_TYPES.ENABLE_BIOMETRIC,
        payload: { enabled: enable },
      });

      await analyticsService.trackEvent('biometric_auth_updated', {
        enabled: enable,
        userId: state.user?.id,
      });

      return { success: true };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'BiometricAuthToggle',
        enable,
      });
      
      return { success: false, error: error.message };
    }
  }, [state.user]);

  const updateSecurityLevel = useCallback(async (level) => {
    try {
      dispatch({
        type: USER_ACTION_TYPES.UPDATE_SECURITY,
        payload: {
          securityLevel: level,
          updateActivity: true,
        },
      });

      await api.patch('/users/security-settings', { securityLevel: level });

      return { success: true };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'SecurityLevelUpdate',
        level,
      });
      
      return { success: false, error: error.message };
    }
  }, []);

  // ===========================================================================
  // ENTERPRISE UTILITY FUNCTIONS
  // ===========================================================================

  const scheduleEnterpriseTokenRefresh = (expiresIn) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Refresh 10 minutes before expiry for enterprise security
    const refreshTime = (expiresIn - 600) * 1000;
    
    refreshTimerRef.current = setTimeout(() => {
      refreshEnterpriseTokens();
    }, refreshTime);
  };

  const verifyEnterpriseToken = async (token) => {
    try {
      if (!token) return false;
      
      // Enhanced token validation for enterprise
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 <= Date.now();
      const hasRequiredClaims = payload.iss === 'yachi-enterprise';
      
      return !isExpired && hasRequiredClaims;
    } catch {
      return false;
    }
  };

  const getEnterpriseDefaultPreferences = () => ({
    theme: 'system',
    language: 'en',
    notifications: {
      booking: true,
      chat: true,
      promotion: true,
      security: true,
    },
    privacy: {
      profileVisible: true,
      searchable: true,
      locationSharing: 'while_using',
    },
    localSettings: {
      currency: 'ETB',
      language: 'en',
      timezone: 'Africa/Addis_Ababa',
      measurement: 'metric',
    },
    construction: {
      autoAcceptProjects: false,
      maxDistance: 50, // km
      preferredProjectTypes: [],
    },
  });

  const startEnterpriseMonitoring = () => {
    // Activity monitoring
    activityTimerRef.current = setInterval(() => {
      dispatch({
        type: USER_ACTION_TYPES.UPDATE_SECURITY,
        payload: { updateActivity: true },
      });
    }, 60000); // Update every minute

    // App state monitoring
    AppState.addEventListener('change', handleEnterpriseAppStateChange);
  };

  const startBackgroundSync = () => {
    // Sync user data every 5 minutes
    syncIntervalRef.current = setInterval(async () => {
      if (state.isAuthenticated && state.isOnline) {
        await syncEnterpriseUserData();
      }
    }, 5 * 60 * 1000);
  };

  const clearEnterpriseTimers = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (activityTimerRef.current) clearInterval(activityTimerRef.current);
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
  };

  const clearEnterpriseStorage = async () => {
    await Promise.all([
      storage.remove(STORAGE_KEYS.USER_DATA),
      storage.remove(STORAGE_KEYS.AUTH_TOKENS),
      storage.remove(STORAGE_KEYS.USER_PREFERENCES),
      storage.remove(STORAGE_KEYS.SESSION_INFO),
      storage.remove(STORAGE_KEYS.BIOMETRIC_DATA),
    ]);
  };

  // ===========================================================================
  // ENTERPRISE CONTEXT VALUE
  // ===========================================================================

  const enterpriseContextValue = {
    // State
    ...state,
    
    // Authentication
    login: loginEnterprise,
    logout: logoutEnterprise,
    refreshTokens: refreshEnterpriseTokens,
    
    // User Management
    updateUser: updateEnterpriseUser,
    updateConstructionProfile,
    updatePreferences: useCallback((prefs) => updatePreferences(prefs), []),
    
    // Role & Permission Management
    hasPermission: hasEnterprisePermission,
    hasRole: hasEnterpriseRole,
    hasAnyRole: hasAnyEnterpriseRole,
    canAccessConstructionFeature,
    
    // Security
    enableBiometricAuth,
    updateSecurityLevel,
    
    // Ethiopian Market
    localSettings: state.localSettings,
    
    // Error Handling
    clearErrors: useCallback(() => dispatch({ type: USER_ACTION_TYPES.CLEAR_ERRORS }), []),
  };

  // ===========================================================================
  // ENTERPRISE EFFECTS & CLEANUP
  // ===========================================================================

  useEffect(() => {
    initializeEnterpriseUser();
    
    return () => {
      clearEnterpriseTimers();
    };
  }, [initializeEnterpriseUser]);

  return (
    <UserContext.Provider value={enterpriseContextValue}>
      {children}
    </UserContext.Provider>
  );
};

// =============================================================================
// ENTERPRISE HOOKS
// =============================================================================

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within EnterpriseUserProvider');
  }
  return context;
};

export const useConstructionUser = () => {
  const { 
    constructionProfile, 
    updateConstructionProfile, 
    canAccessConstructionFeature,
    hasPermission 
  } = useUser();

  const updateWorkerSkills = useCallback(async (skills) => {
    return await updateConstructionProfile({ skills });
  }, [updateConstructionProfile]);

  const addCertification = useCallback(async (certification) => {
    const currentCerts = constructionProfile?.certifications || [];
    return await updateConstructionProfile({
      certifications: [...currentCerts, certification]
    });
  }, [constructionProfile, updateConstructionProfile]);

  return {
    constructionProfile,
    updateConstructionProfile,
    updateWorkerSkills,
    addCertification,
    canAccessConstructionFeature,
    hasConstructionPermission: hasPermission,
    workerSkills: constructionProfile?.skills || [],
    certifications: constructionProfile?.certifications || [],
  };
};

export const useUserPermissions = () => {
  const { hasPermission, hasRole, hasAnyRole } = useUser();

  const canManageProjects = useCallback(() => {
    return hasPermission(PERMISSIONS.CREATE_CONSTRUCTION_PROJECT) ||
           hasPermission(PERMISSIONS.MANAGE_CONSTRUCTION_TEAM);
  }, [hasPermission]);

  const canAccessGovernmentFeatures = useCallback(() => {
    return hasRole(USER_ROLES.GOVERNMENT) && 
           hasPermission(PERMISSIONS.VIEW_GOVERNMENT_PROJECTS);
  }, [hasRole, hasPermission]);

  const canUseAIFeatures = useCallback(() => {
    return hasPermission(PERMISSIONS.ACCESS_AI_MATCHING) &&
           (hasRole(USER_ROLES.CONTRACTOR) || hasRole(USER_ROLES.GOVERNMENT));
  }, [hasPermission, hasRole]);

  return {
    canManageProjects,
    canAccessGovernmentFeatures,
    canUseAIFeatures,
    hasPermission,
    hasRole,
    hasAnyRole,
  };
};

// =============================================================================
// ENTERPRISE UTILITY FUNCTIONS (Mock implementations)
// =============================================================================

const fetchEnterpriseUserData = async () => {
  // Implementation would fetch from /users/enterprise-profile
  return {};
};

const storeEnterpriseAuthData = async (data) => {
  await Promise.all([
    storage.set(STORAGE_KEYS.USER_DATA, data),
    storage.set(STORAGE_KEYS.AUTH_TOKENS, data.tokens),
    storage.set(STORAGE_KEYS.SESSION_INFO, data.session),
  ]);
};

const updateStoredUserData = async (updates) => {
  const currentData = await storage.get(STORAGE_KEYS.USER_DATA) || {};
  await storage.set(STORAGE_KEYS.USER_DATA, { ...currentData, ...updates });
};

const initializeEnterpriseServices = async (user) => {
  await Promise.all([
    notificationService.updateUserToken(user.id),
    analyticsService.identifyUser(user),
  ]);
};

const validateEthiopianPhone = async (phone) => {
  // Ethiopian phone validation logic
  const ethiopianPhoneRegex = /^(?:\+251|251|0)?9\d{8}$/;
  if (!ethiopianPhoneRegex.test(phone)) {
    throw new Error('INVALID_ETHIOPIAN_PHONE');
  }
};

const generateBiometricData = async () => {
  // Generate secure biometric data
  return {
    enabled: true,
    enabledAt: new Date().toISOString(),
    deviceId: getDeviceId(),
  };
};

const getDeviceInfo = () => {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    model: 'unknown', // Would use actual device detection
    id: getDeviceId(),
  };
};

const getDeviceId = () => {
  // Implementation would generate/retrieve device ID
  return `device_${Date.now()}`;
};

const handleEnterpriseAppStateChange = (nextAppState) => {
  // Handle app state changes for enterprise security
};

const syncEnterpriseUserData = async () => {
  // Background sync implementation
};

export default UserContext;