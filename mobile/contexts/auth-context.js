// contexts/auth-context.js
/**
 * ENTERPRISE-LEVEL AUTHENTICATION CONTEXT
 * Complete auth management with multi-role support, session management, and security features
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Platform, Alert, AppState, Linking } from 'react-native';
import { router, usePathname } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '../utils/storage';
import { api } from '../utils/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { notificationService } from '../services/notification-service';
import { SECURITY_CONFIG, USER_ROLES, AUTH_PROVIDERS } from '../constants/auth';

// ==================== ACTION TYPES ====================
export const AUTH_ACTIONS = {
  // Core Auth Actions
  INITIALIZE_START: 'INITIALIZE_START',
  INITIALIZE_COMPLETE: 'INITIALIZE_COMPLETE',
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_TOKENS: 'SET_TOKENS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  LOGOUT: 'LOGOUT',
  
  // User Management
  UPDATE_USER: 'UPDATE_USER',
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',
  SET_VERIFICATION_STATUS: 'SET_VERIFICATION_STATUS',
  
  // Session Management
  SET_SESSION_EXPIRED: 'SET_SESSION_EXPIRED',
  SET_LAST_ACTIVITY: 'SET_LAST_ACTIVITY',
  SET_BIOMETRIC_ENABLED: 'SET_BIOMETRIC_ENABLED',
  
  // Multi-factor Auth
  SET_MFA_REQUIRED: 'SET_MFA_REQUIRED',
  SET_MFA_VERIFIED: 'SET_MFA_VERIFIED',
};

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'yachi_access_token',
  REFRESH_TOKEN: 'yachi_refresh_token',
  USER_DATA: 'yachi_user_data',
  SESSION_EXPIRY: 'yachi_session_expiry',
  BIOMETRIC_ENABLED: 'yachi_biometric_enabled',
  MFA_ENABLED: 'yachi_mfa_enabled',
  LAST_ACTIVITY: 'yachi_last_activity',
};

// ==================== INITIAL STATE ====================
const initialState = {
  // Auth State
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  
  // Error Handling
  error: null,
  errorCode: null,
  
  // Session Management
  sessionExpired: false,
  lastActivity: null,
  sessionTimeout: SECURITY_CONFIG.SESSION_TIMEOUT,
  
  // Security Features
  isBiometricEnabled: false,
  isMFAEnabled: false,
  isMFARequired: false,
  isMFAVerified: false,
  
  // Feature Flags
  permissions: [],
  features: {},
};

// ==================== AUTH REDUCER ====================
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.INITIALIZE_START:
      return {
        ...state,
        isInitialized: false,
        isLoading: true,
      };

    case AUTH_ACTIONS.INITIALIZE_COMPLETE:
      return {
        ...state,
        isInitialized: true,
        isLoading: false,
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: !!action.payload.user,
        error: null,
        errorCode: null,
        sessionExpired: false,
        lastActivity: Date.now(),
      };

    case AUTH_ACTIONS.SET_TOKENS:
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        lastActivity: Date.now(),
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload.message,
        errorCode: action.payload.code,
        isLoading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        errorCode: null,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload,
        },
      };

    case AUTH_ACTIONS.UPDATE_USER_ROLE:
      return {
        ...state,
        user: {
          ...state.user,
          role: action.payload.role,
          permissions: action.payload.permissions,
        },
      };

    case AUTH_ACTIONS.SET_VERIFICATION_STATUS:
      return {
        ...state,
        user: {
          ...state.user,
          verificationStatus: action.payload.status,
          verificationLevel: action.payload.level,
        },
      };

    case AUTH_ACTIONS.SET_SESSION_EXPIRED:
      return {
        ...state,
        sessionExpired: true,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
      };

    case AUTH_ACTIONS.SET_LAST_ACTIVITY:
      return {
        ...state,
        lastActivity: action.payload,
      };

    case AUTH_ACTIONS.SET_BIOMETRIC_ENABLED:
      return {
        ...state,
        isBiometricEnabled: action.payload,
      };

    case AUTH_ACTIONS.SET_MFA_REQUIRED:
      return {
        ...state,
        isMFARequired: action.payload,
        isMFAVerified: false,
      };

    case AUTH_ACTIONS.SET_MFA_VERIFIED:
      return {
        ...state,
        isMFAVerified: action.payload,
        isMFARequired: false,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isInitialized: true,
        isLoading: false,
      };

    default:
      return state;
  }
}

// ==================== AUTH CONTEXT ====================
const AuthContext = createContext(null);

/**
 * Enterprise Auth Provider
 * Comprehensive authentication management with security features
 */
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const appState = useRef(AppState.currentState);
  const refreshTimeout = useRef(null);
  const sessionTimeout = useRef(null);
  const activityTimer = useRef(null);
  const pathname = usePathname();

  // ==================== LIFECYCLE MANAGEMENT ====================
  useEffect(() => {
    initializeAuth();
    setupAppStateListener();
    setupActivityTracking();

    return () => {
      cleanupTimers();
    };
  }, []);

  useEffect(() => {
    if (state.accessToken) {
      scheduleTokenRefresh();
      setupSessionTimeout();
    }
  }, [state.accessToken]);

  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      setupUserSpecificFeatures();
    }
  }, [state.isAuthenticated, state.user]);

  // ==================== CORE AUTH METHODS ====================
  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.INITIALIZE_START });

      const [
        accessToken, 
        refreshToken, 
        userData, 
        biometricEnabled
      ] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        storage.getItem(STORAGE_KEYS.USER_DATA),
        SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED),
      ]);

      if (accessToken && userData) {
        const user = JSON.parse(userData);
        
        // Validate token and session
        const isValid = await validateToken(accessToken);
        
        if (isValid) {
          await completeAuthentication(user, accessToken, refreshToken);
          
          if (biometricEnabled === 'true') {
            dispatch({ type: AUTH_ACTIONS.SET_BIOMETRIC_ENABLED, payload: true });
          }
        } else {
          await handleTokenRefresh(refreshToken);
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.INITIALIZE_COMPLETE });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      errorService.captureError(error, { context: 'AuthInitialization' });
      await clearStoredAuthData();
      dispatch({ type: AUTH_ACTIONS.INITIALIZE_COMPLETE });
    }
  }, []);

  /**
   * Complete authentication process
   */
  const completeAuthentication = async (user, accessToken, refreshToken) => {
    // Set API token
    api.setToken(accessToken);
    
    // Update state
    dispatch({ type: AUTH_ACTIONS.SET_USER, payload: { user } });
    dispatch({ type: AUTH_ACTIONS.SET_TOKENS, payload: { accessToken, refreshToken } });
    
    // Analytics
    analyticsService.identify(user.id, user);
    analyticsService.trackEvent('authentication_success', {
      method: 'token',
      userType: user.role,
    });

    // Notifications
    notificationService.registerUser(user.id);
    
    dispatch({ type: AUTH_ACTIONS.INITIALIZE_COMPLETE });
  };

  // ==================== AUTHENTICATION METHODS ====================
  /**
   * Email/Password Login
   */
  const loginWithEmail = useCallback(async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await api.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password,
        deviceInfo: getDeviceInfo(),
        authProvider: AUTH_PROVIDERS.EMAIL,
      });

      await handleAuthResponse(response.data);

      return { success: true, requiresMFA: false };
    } catch (error) {
      return handleAuthError(error, 'EmailLogin', { email: hashEmail(email) });
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  /**
   * Phone Number Login
   */
  const loginWithPhone = useCallback(async (phoneNumber, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await api.post('/auth/login', {
        phoneNumber: formatPhoneNumber(phoneNumber),
        password,
        deviceInfo: getDeviceInfo(),
        authProvider: AUTH_PROVIDERS.PHONE,
      });

      await handleAuthResponse(response.data);

      return { success: true, requiresMFA: false };
    } catch (error) {
      return handleAuthError(error, 'PhoneLogin', { phoneNumber });
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  /**
   * Social Media Login
   */
  const loginWithSocial = useCallback(async (provider, token) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await api.post('/auth/social', {
        provider,
        token,
        deviceInfo: getDeviceInfo(),
      });

      await handleAuthResponse(response.data);

      return { success: true };
    } catch (error) {
      return handleAuthError(error, 'SocialLogin', { provider });
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  /**
   * Biometric Authentication
   */
  const loginWithBiometric = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return { 
          success: false, 
          error: 'Biometric authentication is not available' 
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Yachi',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        // Retrieve stored biometric token
        const biometricToken = await SecureStore.getItemAsync('biometric_token');
        if (biometricToken) {
          const response = await api.post('/auth/biometric', {
            token: biometricToken,
            deviceInfo: getDeviceInfo(),
          });

          await handleAuthResponse(response.data);
          return { success: true };
        }
      }

      return { success: false, error: 'Biometric authentication failed' };
    } catch (error) {
      return handleAuthError(error, 'BiometricLogin');
    }
  }, []);

  /**
   * Multi-Factor Authentication
   */
  const verifyMFA = useCallback(async (code, method = 'sms') => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const response = await api.post('/auth/mfa/verify', {
        code,
        method,
        deviceInfo: getDeviceInfo(),
      });

      if (response.data.verified) {
        dispatch({ type: AUTH_ACTIONS.SET_MFA_VERIFIED, payload: true });
        
        analyticsService.trackEvent('mfa_verification_success', { method });
        
        return { success: true };
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      return handleAuthError(error, 'MFAVerification', { method });
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // ==================== REGISTRATION METHODS ====================
  /**
   * User Registration
   */
  const register = useCallback(async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await api.post('/auth/register', {
        ...userData,
        deviceInfo: getDeviceInfo(),
        metadata: {
          appVersion: '1.0.0',
          signupSource: 'mobile_app',
          ethiopianRegion: userData.region,
        },
      });

      await handleAuthResponse(response.data);

      analyticsService.trackEvent('registration_success', {
        userType: userData.role,
        region: userData.region,
      });

      return { success: true, requiresVerification: true };
    } catch (error) {
      return handleAuthError(error, 'UserRegistration');
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  /**
   * Verify Email/Phone
   */
  const verifyAccount = useCallback(async (code, type = 'email') => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const response = await api.post('/auth/verify', {
        code,
        type,
        deviceInfo: getDeviceInfo(),
      });

      if (response.data.verified) {
        await refreshUserData();
        
        analyticsService.trackEvent('account_verification_success', { type });
        
        return { success: true };
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      return handleAuthError(error, 'AccountVerification', { type });
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // ==================== SESSION MANAGEMENT ====================
  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      checkSessionValidity();
      resetActivityTimer();
    }
    appState.current = nextAppState;
  };

  const setupActivityTracking = () => {
    resetActivityTimer();
    return () => {
      if (activityTimer.current) {
        clearTimeout(activityTimer.current);
      }
    };
  };

  const resetActivityTimer = () => {
    const now = Date.now();
    dispatch({ type: AUTH_ACTIONS.SET_LAST_ACTIVITY, payload: now });
    
    if (activityTimer.current) {
      clearTimeout(activityTimer.current);
    }
    
    activityTimer.current = setTimeout(() => {
      handleSessionTimeout();
    }, SECURITY_CONFIG.SESSION_TIMEOUT);
  };

  const checkSessionValidity = async () => {
    try {
      const sessionExpiry = await SecureStore.getItemAsync(STORAGE_KEYS.SESSION_EXPIRY);
      if (sessionExpiry && Date.now() > parseInt(sessionExpiry)) {
        handleSessionTimeout();
      }
    } catch (error) {
      console.error('Session validity check error:', error);
    }
  };

  const handleSessionTimeout = () => {
    dispatch({ type: AUTH_ACTIONS.SET_SESSION_EXPIRED });
    
    Alert.alert(
      'Session Expired',
      'Your session has expired for security reasons. Please log in again.',
      [
        { 
          text: 'OK', 
          onPress: () => logout(false) 
        }
      ]
    );

    analyticsService.trackEvent('session_timeout');
  };

  const setupSessionTimeout = () => {
    if (sessionTimeout.current) {
      clearTimeout(sessionTimeout.current);
    }

    sessionTimeout.current = setTimeout(() => {
      handleSessionTimeout();
    }, SECURITY_CONFIG.SESSION_TIMEOUT);
  };

  // ==================== TOKEN MANAGEMENT ====================
  const validateToken = async (token) => {
    try {
      const response = await api.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.valid;
    } catch (error) {
      return false;
    }
  };

  const handleTokenRefresh = useCallback(async (refreshToken = state.refreshToken) => {
    try {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {
        refreshToken,
        deviceInfo: getDeviceInfo(),
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;

      await storeTokens(accessToken, newRefreshToken || refreshToken);
      dispatch({ 
        type: AUTH_ACTIONS.SET_TOKENS, 
        payload: { accessToken, refreshToken: newRefreshToken || refreshToken } 
      });

      api.setToken(accessToken);

      analyticsService.trackEvent('token_refresh_success');

      return { success: true, accessToken };
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout(false);
      return { success: false, error: 'Session expired' };
    }
  }, [state.refreshToken]);

  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }

    // Refresh 5 minutes before expiry (55 minutes for 1-hour tokens)
    const refreshTime = 55 * 60 * 1000;

    refreshTimeout.current = setTimeout(() => {
      handleTokenRefresh();
    }, refreshTime);
  }, [handleTokenRefresh]);

  // ==================== USER MANAGEMENT ====================
  const updateUserProfile = useCallback(async (updates) => {
    try {
      const response = await api.patch('/user/profile', updates);
      const updatedUser = response.data;

      await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });

      analyticsService.trackEvent('profile_update_success');

      return { success: true, user: updatedUser };
    } catch (error) {
      return handleAuthError(error, 'ProfileUpdate');
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const response = await api.get('/user/profile');
      const userData = response.data;

      await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: { user: userData } });

      return userData;
    } catch (error) {
      throw error;
    }
  }, []);

  const updateUserRole = useCallback(async (newRole) => {
    try {
      const response = await api.post('/user/role', { role: newRole });
      const { user, permissions } = response.data;

      await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      dispatch({ type: AUTH_ACTIONS.UPDATE_USER_ROLE, payload: { role: newRole, permissions } });

      analyticsService.trackEvent('role_change', { newRole });

      return { success: true, user };
    } catch (error) {
      return handleAuthError(error, 'RoleUpdate');
    }
  }, []);

  // ==================== SECURITY FEATURES ====================
  const enableBiometricAuth = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return { 
          success: false, 
          error: 'Biometric authentication is not available on this device' 
        };
      }

      // Generate biometric token
      const biometricToken = generateBiometricToken();
      await SecureStore.setItemAsync('biometric_token', biometricToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');

      dispatch({ type: AUTH_ACTIONS.SET_BIOMETRIC_ENABLED, payload: true });

      analyticsService.trackEvent('biometric_enabled');

      return { success: true };
    } catch (error) {
      return handleAuthError(error, 'EnableBiometric');
    }
  }, []);

  const disableBiometricAuth = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('biometric_token');
      await SecureStore.deleteItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);

      dispatch({ type: AUTH_ACTIONS.SET_BIOMETRIC_ENABLED, payload: false });

      analyticsService.trackEvent('biometric_disabled');

      return { success: true };
    } catch (error) {
      return handleAuthError(error, 'DisableBiometric');
    }
  }, []);

  const enableMFA = useCallback(async (method = 'sms') => {
    try {
      const response = await api.post('/auth/mfa/enable', { method });
      
      dispatch({ type: AUTH_ACTIONS.SET_MFA_ENABLED, payload: true });

      analyticsService.trackEvent('mfa_enabled', { method });

      return { success: true, setupRequired: response.data.setupRequired };
    } catch (error) {
      return handleAuthError(error, 'EnableMFA');
    }
  }, []);

  // ==================== LOGOUT MANAGEMENT ====================
  const logout = useCallback(async (manual = true) => {
    try {
      if (manual && state.refreshToken) {
        await api.post('/auth/logout', {
          refreshToken: state.refreshToken,
          deviceInfo: getDeviceInfo(),
        });
      }

      // Analytics
      if (state.user) {
        analyticsService.trackEvent('user_logout', { manual });
        analyticsService.reset();
      }

      // Notifications
      notificationService.unregisterUser();

      // Clear all stored data
      await clearStoredAuthData();

      // Clear API token
      api.clearToken();

      // Update state
      dispatch({ type: AUTH_ACTIONS.LOGOUT });

      // Navigate to auth screen
      router.replace('/(auth)/login');

      // Cleanup
      cleanupTimers();

    } catch (error) {
      console.error('Logout error:', error);
      errorService.captureError(error, { context: 'UserLogout' });
      
      // Force cleanup on error
      await clearStoredAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      router.replace('/(auth)/login');
    }
  }, [state.user, state.refreshToken]);

  // ==================== UTILITY METHODS ====================
  const handleAuthResponse = async (data) => {
    const { user, tokens, requiresMFA } = data;
    const { accessToken, refreshToken } = tokens;

    await storeAuthData(user, accessToken, refreshToken);
    await completeAuthentication(user, accessToken, refreshToken);

    if (requiresMFA) {
      dispatch({ type: AUTH_ACTIONS.SET_MFA_REQUIRED, payload: true });
    }
  };

  const handleAuthError = (error, context, metadata = {}) => {
    console.error(`${context} error:`, error);
    
    const errorMessage = error.response?.data?.message || getErrorMessage(error);
    const errorCode = error.response?.data?.code || 'UNKNOWN_ERROR';

    dispatch({ 
      type: AUTH_ACTIONS.SET_ERROR, 
      payload: { message: errorMessage, code: errorCode } 
    });

    analyticsService.trackEvent(`${context.toLowerCase()}_failed`, {
      reason: errorCode,
      ...metadata,
    });

    errorService.captureError(error, { 
      context,
      ...metadata,
    });

    return { success: false, error: errorMessage, code: errorCode };
  };

  const getErrorMessage = (error) => {
    if (error.message?.includes('Network Error')) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.';
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const getDeviceInfo = () => ({
    platform: Platform.OS,
    platformVersion: Platform.Version,
    appVersion: '1.0.0',
    deviceId: getDeviceId(),
    timestamp: new Date().toISOString(),
  });

  const getDeviceId = () => {
    // Implement device ID generation (simplified)
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateBiometricToken = () => {
    return `bio_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  };

  const hashEmail = (email) => {
    // Implement email hashing for privacy
    return btoa(email).substring(0, 16);
  };

  const formatPhoneNumber = (phone) => {
    // Format Ethiopian phone numbers
    return phone.replace(/\s/g, '').replace(/^0/, '+251');
  };

  const setupUserSpecificFeatures = () => {
    // Setup features based on user role
    const { user } = state;
    
    if (user.role === USER_ROLES.GOVERNMENT) {
      // Enable government features
    } else if (user.role === USER_ROLES.PROVIDER) {
      // Enable provider features
    } else if (user.role === USER_ROLES.CLIENT) {
      // Enable client features
    }
  };

  // ==================== STORAGE MANAGEMENT ====================
  const storeAuthData = async (user, accessToken, refreshToken) => {
    const sessionExpiry = Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT;
    
    await Promise.all([
      storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      SecureStore.setItemAsync(STORAGE_KEYS.SESSION_EXPIRY, sessionExpiry.toString()),
    ]);
  };

  const storeTokens = async (accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  };

  const clearStoredAuthData = async () => {
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.USER_DATA),
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_EXPIRY),
      SecureStore.deleteItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED),
    ]);
  };

  const cleanupTimers = () => {
    [refreshTimeout, sessionTimeout, activityTimer].forEach(timer => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    });
  };

  // ==================== PERMISSION & ACCESS CONTROL ====================
  const hasPermission = useCallback((permission) => {
    if (!state.user?.permissions) return false;
    return state.user.permissions.includes(permission);
  }, [state.user]);

  const hasFeature = useCallback((feature) => {
    if (!state.user?.features) return false;
    return state.user.features[feature] === true;
  }, [state.user]);

  const canAccess = useCallback((route, resource = null) => {
    // Implement role-based access control
    const { user } = state;
    if (!user) return false;

    // Add your access control logic here
    return true;
  }, [state.user]);

  // ==================== CONTEXT VALUE ====================
  const value = {
    // State
    ...state,
    
    // Authentication Methods
    loginWithEmail,
    loginWithPhone,
    loginWithSocial,
    loginWithBiometric,
    register,
    verifyAccount,
    verifyMFA,
    logout,
    
    // User Management
    updateUserProfile,
    refreshUserData,
    updateUserRole,
    
    // Security Features
    enableBiometricAuth,
    disableBiometricAuth,
    enableMFA,
    
    // Session Management
    clearError: () => dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR }),
    
    // Access Control
    hasPermission,
    hasFeature,
    canAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;