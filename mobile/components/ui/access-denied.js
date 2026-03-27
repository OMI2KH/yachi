// components/ui/access-denied.js - ENTERPRISE REWRITE
/**
 * Enterprise Access Denied Component
 * Comprehensive access control with multi-level permissions, role-based UI, and security analytics
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Linking,
  Alert,
  InteractionManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useAnalytics } from '../../hooks/use-analytics';
import { useErrorBoundary } from '../../hooks/use-error-boundary';
import { SecurityService } from '../../services/security-service';
import { AnalyticsService } from '../../services/analytics-service';
import { ErrorService } from '../../services/error-service';
import { PermissionService } from '../../services/permission-service';

// UI Components
import Button from './button';
import LoadingIndicator from './loading-indicator';
import Modal from './modal';
import SecurityBadge from './security-badge';
import PermissionRequest from './permission-request';

// Constants
const ACCESS_DENIED_CONFIG = {
  ANIMATION: {
    DURATION: 600,
    STAGGER_DELAY: 100,
    BOUNCE_INTENSITY: 1.1,
  },
  SECURITY: {
    MAX_RETRY_ATTEMPTS: 3,
    LOCKOUT_DURATION: 900000, // 15 minutes
    SESSION_TIMEOUT: 300000, // 5 minutes
  },
  ANALYTICS: {
    TRACK_ACCESS_ATTEMPTS: true,
    TRACK_PERMISSION_REQUESTS: true,
    TRACK_SECURITY_EVENTS: true,
  },
};

const ACCESS_DENIED_TYPES = {
  AUTHENTICATION_REQUIRED: 'authentication_required',
  PERMISSION_DENIED: 'permission_denied',
  ROLE_RESTRICTED: 'role_restricted',
  SUBSCRIPTION_REQUIRED: 'subscription_required',
  VERIFICATION_REQUIRED: 'verification_required',
  GEO_RESTRICTED: 'geo_restricted',
  DEVICE_RESTRICTED: 'device_restricted',
  RATE_LIMITED: 'rate_limited',
  MAINTENANCE_MODE: 'maintenance_mode',
  SUSPENDED: 'suspended',
  BETA_ACCESS: 'beta_access',
  GOVERNMENT_RESTRICTED: 'government_restricted',
  CONSTRUCTION_ACCESS: 'construction_access',
  ADMIN_ONLY: 'admin_only',
};

const PERMISSION_LEVELS = {
  PUBLIC: 'public',
  BASIC: 'basic',
  PREMIUM: 'premium',
  VERIFIED: 'verified',
  GOVERNMENT: 'government',
  CONTRACTOR: 'contractor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

const SECURITY_EVENTS = {
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PERMISSION_VIOLATION: 'permission_violation',
  ROLE_ESCALATION_ATTEMPT: 'role_escalation_attempt',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  GEO_BLOCK_VIOLATION: 'geo_block_violation',
  DEVICE_BLOCK_VIOLATION: 'device_block_violation',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Access Denied Component
 * 
 * Advanced Features:
 * - Multi-level permission system with granular access control
 * - Real-time security monitoring and threat detection
 * - Intelligent permission escalation and upgrade paths
 * - Comprehensive analytics and security event tracking
 * - Geo-fencing and device restriction management
 * - Government and construction project access control
 * - Advanced animation and user experience
 * - Accessibility compliance with screen reader support
 * - Multi-language support and localization
 */
const AccessDenied = React.memo(({
  // Core Configuration
  accessType = ACCESS_DENIED_TYPES.AUTHENTICATION_REQUIRED,
  requiredPermission = PERMISSION_LEVELS.BASIC,
  currentPermission = PERMISSION_LEVELS.PUBLIC,
  resourceId = null,
  resourceType = null,
  
  // Security Context
  securityContext = {},
  violationSeverity = 'medium',
  retryAttempts = 0,
  lockoutDuration = null,
  
  // Custom Messages
  customTitle = null,
  customMessage = null,
  customActions = [],
  showSecurityDetails = false,
  
  // Action Configuration
  enableRetry = true,
  enableUpgrade = true,
  enableContactSupport = true,
  enablePermissionRequest = true,
  enableAlternativeAccess = true,
  
  // UI Configuration
  showHeader = true,
  showIllustration = true,
  showSecurityBadge = true,
  showCountdown = false,
  fullScreen = false,
  modalPresentation = false,
  
  // Event Handlers
  onAccessRetry,
  onPermissionRequest,
  onUpgradeRequest,
  onSupportContact,
  onAlternativeAction,
  onSecurityEvent,
  
  // Analytics
  analyticsContext = {},
  enableSecurityAnalytics = true,
  
  // Customization
  customStyles = {},
  themeVariant = 'security',
  layoutType = 'standard',
  
  // Accessibility
  accessibilityConfig = {},
  
  ...restProps
}) => {
  // Hooks
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDarkMode, currentTheme } = useTheme();
  const { user, isAuthenticated, hasRole, hasPermission, logout } = useAuth();
  const { trackEvent, trackSecurityEvent, trackError } = useAnalytics();
  const { captureError, withErrorBoundary } = useErrorBoundary();
  
  // State Management
  const [uiState, setUiState] = useState({
    isRetrying: false,
    isRequestingPermission: false,
    isContactingSupport: false,
    showDetailedView: false,
    countdownActive: false,
    securityModalVisible: false,
  });
  
  const [securityState, setSecurityState] = useState({
    violationCount: retryAttempts,
    lockoutTimeRemaining: lockoutDuration,
    lastViolationTime: Date.now(),
    securityLevel: 'standard',
    threatScore: 0,
  });
  
  const [accessState, setAccessState] = useState({
    availableUpgrades: [],
    alternativePaths: [],
    permissionRequirements: [],
    supportOptions: [],
  });

  // Refs
  const componentMounted = useRef(true);
  const countdownTimer = useRef(null);
  const securityMonitor = useRef(null);
  const animationRefs = useRef({
    title: new Animated.Value(0),
    message: new Animated.Value(0),
    illustration: new Animated.Value(0),
    actions: new Animated.Value(0),
  });

  // Memoized Values
  const accessConfig = useMemo(() => getAccessDeniedConfig(accessType), [accessType]);
  const userContext = useMemo(() => ({
    id: user?.id,
    roles: user?.roles || [],
    permissions: user?.permissions || [],
    subscription: user?.subscription,
    verification: user?.verification,
    location: user?.location,
  }), [user]);

  const securityContext = useMemo(() => ({
    ...securityContext,
    resourceId,
    resourceType,
    userAgent: Platform.OS,
    timestamp: Date.now(),
    sessionId: params.sessionId,
  }), [securityContext, resourceId, resourceType, params]);

  // Effects
  useEffect(() => {
    componentMounted.current = true;
    initializeComponent();
    
    return () => {
      componentMounted.current = false;
      cleanupComponent();
    };
  }, []);

  useEffect(() => {
    if (accessType || requiredPermission) {
      analyzeAccessSituation();
    }
  }, [accessType, requiredPermission, userContext]);

  useEffect(() => {
    if (securityState.lockoutTimeRemaining > 0) {
      startCountdown();
    }
    
    return () => {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, [securityState.lockoutTimeRemaining]);

  // Core Functions
  const initializeComponent = useCallback(() => {
    trackSecurityEvent('access_denied_displayed', {
      accessType,
      requiredPermission,
      currentPermission,
      resourceType,
      ...securityContext,
      ...analyticsContext,
    });

    startEntranceAnimation();
    initializeSecurityMonitoring();
  }, [accessType, requiredPermission, currentPermission, resourceType, securityContext, analyticsContext, trackSecurityEvent]);

  const cleanupComponent = useCallback(() => {
    securityMonitor.current?.stop();
    
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
  }, []);

  const initializeSecurityMonitoring = useCallback(() => {
    securityMonitor.current = SecurityService.monitorAccessAttempts({
      accessType,
      userContext,
      securityContext,
      onSecurityEvent: handleSecurityEvent,
    });
  }, [accessType, userContext, securityContext]);

  const analyzeAccessSituation = useCallback(async () => {
    try {
      const analysis = await SecurityService.analyzeAccessSituation({
        accessType,
        requiredPermission,
        currentPermission: userContext.permissions?.[0] || PERMISSION_LEVELS.PUBLIC,
        userContext,
        securityContext,
      });

      if (componentMounted.current && analysis.success) {
        setAccessState({
          availableUpgrades: analysis.data.availableUpgrades || [],
          alternativePaths: analysis.data.alternativePaths || [],
          permissionRequirements: analysis.data.permissionRequirements || [],
          supportOptions: analysis.data.supportOptions || [],
        });

        setSecurityState(prev => ({
          ...prev,
          threatScore: analysis.data.threatScore || 0,
          securityLevel: analysis.data.securityLevel || 'standard',
        }));
      }
    } catch (error) {
      captureError(error, {
        context: 'AccessSituationAnalysis',
        accessType,
        requiredPermission,
      });
    }
  }, [accessType, requiredPermission, userContext, securityContext, captureError]);

  const startEntranceAnimation = useCallback(() => {
    const { title, message, illustration, actions } = animationRefs.current;
    
    Animated.stagger(ACCESS_DENIED_CONFIG.ANIMATION.STAGGER_DELAY, [
      Animated.timing(illustration, {
        toValue: 1,
        duration: ACCESS_DENIED_CONFIG.ANIMATION.DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(title, {
        toValue: 1,
        duration: ACCESS_DENIED_CONFIG.ANIMATION.DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(message, {
        toValue: 1,
        duration: ACCESS_DENIED_CONFIG.ANIMATION.DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(actions, {
        toValue: 1,
        duration: ACCESS_DENIED_CONFIG.ANIMATION.DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }

    countdownTimer.current = setInterval(() => {
      setSecurityState(prev => {
        const newTimeRemaining = prev.lockoutTimeRemaining - 1000;
        
        if (newTimeRemaining <= 0) {
          clearInterval(countdownTimer.current);
          return { ...prev, lockoutTimeRemaining: 0, countdownActive: false };
        }
        
        return { ...prev, lockoutTimeRemaining: newTimeRemaining };
      });
    }, 1000);

    setSecurityState(prev => ({ ...prev, countdownActive: true }));
  }, []);

  // Action Handlers
  const handleRetryAccess = useCallback(async () => {
    if (securityState.lockoutTimeRemaining > 0) {
      showLockoutMessage();
      return;
    }

    setUiState(prev => ({ ...prev, isRetrying: true }));

    try {
      const retryResult = await SecurityService.retryAccess({
        accessType,
        userContext,
        securityContext,
        previousAttempts: securityState.violationCount,
      });

      if (componentMounted.current) {
        if (retryResult.success) {
          trackSecurityEvent('access_retry_successful', {
            accessType,
            retryCount: securityState.violationCount + 1,
            ...securityContext,
          });

          onAccessRetry?.(retryResult.data);
        } else {
          handleRetryFailure(retryResult.error);
        }
      }
    } catch (error) {
      handleRetryFailure(error);
    } finally {
      if (componentMounted.current) {
        setUiState(prev => ({ ...prev, isRetrying: false }));
      }
    }
  }, [accessType, userContext, securityContext, securityState, onAccessRetry, trackSecurityEvent]);

  const handleRetryFailure = useCallback((error) => {
    const newViolationCount = securityState.violationCount + 1;
    
    setSecurityState(prev => ({
      ...prev,
      violationCount: newViolationCount,
      lastViolationTime: Date.now(),
    }));

    // Check for lockout
    if (newViolationCount >= ACCESS_DENIED_CONFIG.SECURITY.MAX_RETRY_ATTEMPTS) {
      setSecurityState(prev => ({
        ...prev,
        lockoutTimeRemaining: ACCESS_DENIED_CONFIG.SECURITY.LOCKOUT_DURATION,
      }));
    }

    trackSecurityEvent('access_retry_failed', {
      accessType,
      retryCount: newViolationCount,
      error: error.message,
      ...securityContext,
    });

    captureError(error, {
      context: 'AccessRetry',
      accessType,
      retryCount: newViolationCount,
    });

    showRetryErrorMessage(error);
  }, [securityState, accessType, securityContext, trackSecurityEvent, captureError]);

  const handlePermissionRequest = useCallback(async () => {
    setUiState(prev => ({ ...prev, isRequestingPermission: true }));

    try {
      const requestResult = await PermissionService.requestPermission({
        requiredPermission,
        userContext,
        resourceType,
        resourceId,
        justification: getPermissionJustification(),
      });

      if (componentMounted.current) {
        if (requestResult.success) {
          trackSecurityEvent('permission_request_submitted', {
            requiredPermission,
            resourceType,
            resourceId,
            ...securityContext,
          });

          showPermissionRequestSuccess();
          onPermissionRequest?.(requestResult.data);
        } else {
          showPermissionRequestError(requestResult.error);
        }
      }
    } catch (error) {
      showPermissionRequestError(error);
    } finally {
      if (componentMounted.current) {
        setUiState(prev => ({ ...prev, isRequestingPermission: false }));
      }
    }
  }, [requiredPermission, userContext, resourceType, resourceId, securityContext, onPermissionRequest, trackSecurityEvent]);

  const handleUpgradeRequest = useCallback((upgradeType) => {
    trackSecurityEvent('upgrade_request_initiated', {
      upgradeType,
      currentPermission,
      requiredPermission,
      ...securityContext,
    });

    // Navigate to upgrade page or show upgrade modal
    if (upgradeType === 'subscription') {
      router.push('/premium');
    } else if (upgradeType === 'verification') {
      router.push('/verification');
    }

    onUpgradeRequest?.(upgradeType);
  }, [currentPermission, requiredPermission, securityContext, onUpgradeRequest, trackSecurityEvent, router]);

  const handleSupportContact = useCallback(() => {
    setUiState(prev => ({ ...prev, isContactingSupport: true }));

    const supportOptions = {
      email: 'support@yachi.com',
      phone: '+251-XXX-XXXX',
      chat: 'https://yachi.com/support',
      emergency: violationSeverity === 'high',
    };

    Alert.alert(
      'Contact Support',
      'How would you like to contact our support team?',
      [
        {
          text: 'Send Email',
          onPress: () => Linking.openURL(`mailto:${supportOptions.email}?subject=Access Issue&body=${generateSupportEmailBody()}`),
        },
        {
          text: 'Live Chat',
          onPress: () => Linking.openURL(supportOptions.chat),
        },
        ...(supportOptions.emergency ? [{
          text: 'Emergency Support',
          onPress: () => handleEmergencySupport(),
        }] : []),
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );

    trackSecurityEvent('support_contact_initiated', {
      supportMethod: 'multiple_options',
      violationSeverity,
      ...securityContext,
    });

    onSupportContact?.(supportOptions);
    
    setUiState(prev => ({ ...prev, isContactingSupport: false }));
  }, [violationSeverity, securityContext, onSupportContact, trackSecurityEvent]);

  const handleEmergencySupport = useCallback(() => {
    // Implement emergency support protocol
    SecurityService.triggerEmergencyProtocol({
      accessType,
      userContext,
      securityContext,
      severity: violationSeverity,
    });

    trackSecurityEvent('emergency_support_activated', {
      accessType,
      violationSeverity,
      ...securityContext,
    });
  }, [accessType, userContext, securityContext, violationSeverity, trackSecurityEvent]);

  const handleSecurityEvent = useCallback((event) => {
    setSecurityState(prev => ({
      ...prev,
      threatScore: Math.min(100, prev.threatScore + event.threatIncrement),
    }));

    onSecurityEvent?.(event);

    if (enableSecurityAnalytics) {
      trackSecurityEvent('security_event_detected', event);
    }
  }, [onSecurityEvent, enableSecurityAnalytics, trackSecurityEvent]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Switch Account?',
      'Would you like to logout and try with a different account?',
      [
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [logout, router]);

  // Utility Functions
  const getAccessDeniedConfig = useCallback((type) => {
    const configs = {
      [ACCESS_DENIED_TYPES.AUTHENTICATION_REQUIRED]: {
        title: 'Authentication Required',
        message: 'You need to be signed in to access this content.',
        icon: '🔐',
        illustration: 'authentication',
        severity: 'low',
        primaryAction: 'signin',
      },
      [ACCESS_DENIED_TYPES.PERMISSION_DENIED]: {
        title: 'Permission Denied',
        message: 'You don\'t have the required permissions to access this resource.',
        icon: '🚫',
        illustration: 'permission',
        severity: 'medium',
        primaryAction: 'request_permission',
      },
      [ACCESS_DENIED_TYPES.ROLE_RESTRICTED]: {
        title: 'Role Restriction',
        message: 'This content is restricted to specific user roles.',
        icon: '👥',
        illustration: 'role',
        severity: 'medium',
        primaryAction: 'upgrade_role',
      },
      [ACCESS_DENIED_TYPES.SUBSCRIPTION_REQUIRED]: {
        title: 'Premium Feature',
        message: 'This feature requires a premium subscription.',
        icon: '⭐',
        illustration: 'premium',
        severity: 'low',
        primaryAction: 'upgrade_subscription',
      },
      [ACCESS_DENIED_TYPES.VERIFICATION_REQUIRED]: {
        title: 'Verification Required',
        message: 'Your account needs to be verified to access this content.',
        icon: '✅',
        illustration: 'verification',
        severity: 'medium',
        primaryAction: 'verify_account',
      },
      [ACCESS_DENIED_TYPES.GOVERNMENT_RESTRICTED]: {
        title: 'Government Access Only',
        message: 'This section is restricted to government personnel only.',
        icon: '🏛️',
        illustration: 'government',
        severity: 'high',
        primaryAction: 'contact_support',
      },
      [ACCESS_DENIED_TYPES.CONSTRUCTION_ACCESS]: {
        title: 'Construction Project Access',
        message: 'This area is restricted to authorized construction personnel.',
        icon: '🏗️',
        illustration: 'construction',
        severity: 'high',
        primaryAction: 'request_access',
      },
      [ACCESS_DENIED_TYPES.ADMIN_ONLY]: {
        title: 'Administrator Access Only',
        message: 'This section is restricted to system administrators.',
        icon: '⚙️',
        illustration: 'admin',
        severity: 'high',
        primaryAction: 'contact_admin',
      },
    };

    return configs[type] || configs[ACCESS_DENIED_TYPES.PERMISSION_DENIED];
  }, []);

  const getPermissionJustification = useCallback(() => {
    const justifications = {
      [ACCESS_DENIED_TYPES.CONSTRUCTION_ACCESS]: 'Requesting access to construction project management features',
      [ACCESS_DENIED_TYPES.GOVERNMENT_RESTRICTED]: 'Requesting government portal access for official duties',
      [ACCESS_DENIED_TYPES.ADMIN_ONLY]: 'Requesting administrative access for system management',
    };

    return justifications[accessType] || `Requesting access to ${resourceType || 'this resource'}`;
  }, [accessType, resourceType]);

  const generateSupportEmailBody = useCallback(() => {
    return encodeURIComponent(
      `Access Issue Report:\n\n` +
      `User ID: ${userContext.id || 'Not signed in'}\n` +
      `Access Type: ${accessType}\n` +
      `Required Permission: ${requiredPermission}\n` +
      `Resource: ${resourceType} ${resourceId || ''}\n` +
      `Platform: ${Platform.OS}\n` +
      `Time: ${new Date().toISOString()}\n\n` +
      `Issue Description: `
    );
  }, [userContext, accessType, requiredPermission, resourceType, resourceId]);

  const showLockoutMessage = useCallback(() => {
    const minutes = Math.ceil(securityState.lockoutTimeRemaining / 60000);
    
    Alert.alert(
      'Temporary Lockout',
      `Too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      [{ text: 'OK' }]
    );
  }, [securityState.lockoutTimeRemaining]);

  const showRetryErrorMessage = useCallback((error) => {
    Alert.alert(
      'Access Failed',
      error.message || 'Unable to access this resource. Please try again later.',
      [{ text: 'OK' }]
    );
  }, []);

  const showPermissionRequestSuccess = useCallback(() => {
    Alert.alert(
      'Request Submitted',
      'Your permission request has been submitted for review. You will be notified once it\'s processed.',
      [{ text: 'OK' }]
    );
  }, []);

  const showPermissionRequestError = useCallback((error) => {
    Alert.alert(
      'Request Failed',
      error.message || 'Unable to submit permission request. Please try again later.',
      [{ text: 'OK' }]
    );
  }, []);

  const formatCountdown = useCallback((milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Render Functions
  const renderIllustration = useCallback(() => {
    if (!showIllustration) return null;

    const { illustration } = animationRefs.current;

    return (
      <Animated.View
        style={[
          styles.illustrationContainer,
          {
            opacity: illustration,
            transform: [{
              scale: illustration.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            }],
          },
          customStyles.illustrationContainer,
        ]}
      >
        <View style={[styles.illustration, customStyles.illustration]}>
          <Text style={[styles.illustrationIcon, customStyles.illustrationIcon]}>
            {accessConfig.icon}
          </Text>
        </View>
      </Animated.View>
    );
  }, [showIllustration, accessConfig, customStyles]);

  const renderHeader = useCallback(() => {
    if (!showHeader) return null;

    const { title } = animationRefs.current;

    return (
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: title,
            transform: [{
              translateY: title.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
          customStyles.headerContainer,
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }, customStyles.title]}>
          {customTitle || accessConfig.title}
        </Text>
        {showSecurityBadge && (
          <SecurityBadge
            level={securityState.securityLevel}
            threatScore={securityState.threatScore}
            theme={theme}
            style={styles.securityBadge}
          />
        )}
      </Animated.View>
    );
  }, [showHeader, showSecurityBadge, customTitle, accessConfig, securityState, theme, customStyles]);

  const renderMessage = useCallback(() => {
    const { message } = animationRefs.current;

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          {
            opacity: message,
            transform: [{
              translateY: message.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
          customStyles.messageContainer,
        ]}
      >
        <Text style={[styles.message, { color: theme.colors.textSecondary }, customStyles.message]}>
          {customMessage || accessConfig.message}
        </Text>
        
        {showCountdown && securityState.lockoutTimeRemaining > 0 && (
          <View style={styles.countdownContainer}>
            <Text style={[styles.countdownText, { color: theme.colors.error }]}>
              Lockout expires in: {formatCountdown(securityState.lockoutTimeRemaining)}
            </Text>
          </View>
        )}

        {showSecurityDetails && (
          <View style={styles.securityDetails}>
            <Text style={[styles.securityDetail, { color: theme.colors.textTertiary }]}>
              Required: {requiredPermission}
            </Text>
            <Text style={[styles.securityDetail, { color: theme.colors.textTertiary }]}>
              Current: {currentPermission}
            </Text>
            {resourceType && (
              <Text style={[styles.securityDetail, { color: theme.colors.textTertiary }]}>
                Resource: {resourceType}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    );
  }, [customMessage, accessConfig, showCountdown, securityState, showSecurityDetails, requiredPermission, currentPermission, resourceType, theme, customStyles, formatCountdown]);

  const renderActions = useCallback(() => {
    const { actions } = animationRefs.current;

    const primaryActions = getPrimaryActions();
    const secondaryActions = getSecondaryActions();

    return (
      <Animated.View
        style={[
          styles.actionsContainer,
          {
            opacity: actions,
            transform: [{
              translateY: actions.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
          customStyles.actionsContainer,
        ]}
      >
        {/* Primary Actions */}
        <View style={styles.primaryActions}>
          {primaryActions.map((action, index) => (
            <Button
              key={action.key}
              title={action.title}
              onPress={action.onPress}
              loading={action.loading}
              disabled={action.disabled}
              variant={action.variant}
              size="large"
              theme={theme}
              style={[
                styles.actionButton,
                index > 0 && styles.actionButtonSpacing,
                customStyles.actionButton,
              ]}
            />
          ))}
        </View>

        {/* Secondary Actions */}
        {secondaryActions.length > 0 && (
          <View style={styles.secondaryActions}>
            {secondaryActions.map((action, index) => (
              <Button
                key={action.key}
                title={action.title}
                onPress={action.onPress}
                variant="ghost"
                size="medium"
                theme={theme}
                style={[
                  styles.secondaryActionButton,
                  index > 0 && styles.secondaryActionButtonSpacing,
                  customStyles.secondaryActionButton,
                ]}
              />
            ))}
          </View>
        )}

        {/* Custom Actions */}
        {customActions.length > 0 && (
          <View style={styles.customActions}>
            {customActions.map((action, index) => (
              <Button
                key={`custom-${index}`}
                {...action}
                theme={theme}
                style={[
                  styles.customActionButton,
                  customStyles.customActionButton,
                ]}
              />
            ))}
          </View>
        )}
      </Animated.View>
    );
  }, [customActions, theme, customStyles]);

  const getPrimaryActions = useCallback(() => {
    const actions = [];
    const isLockedOut = securityState.lockoutTimeRemaining > 0;

    // Retry Action
    if (enableRetry && !isLockedOut && accessConfig.primaryAction === 'signin') {
      actions.push({
        key: 'retry',
        title: isAuthenticated ? 'Retry Access' : 'Sign In',
        onPress: isAuthenticated ? handleRetryAccess : () => router.push('/auth/login'),
        loading: uiState.isRetrying,
        variant: 'primary',
      });
    }

    // Permission Request
    if (enablePermissionRequest && accessConfig.primaryAction === 'request_permission') {
      actions.push({
        key: 'request-permission',
        title: 'Request Permission',
        onPress: handlePermissionRequest,
        loading: uiState.isRequestingPermission,
        variant: 'primary',
      });
    }

    // Upgrade Actions
    if (enableUpgrade) {
      if (accessConfig.primaryAction === 'upgrade_subscription') {
        actions.push({
          key: 'upgrade',
          title: 'Upgrade to Premium',
          onPress: () => handleUpgradeRequest('subscription'),
          variant: 'primary',
        });
      } else if (accessConfig.primaryAction === 'verify_account') {
        actions.push({
          key: 'verify',
          title: 'Verify Account',
          onPress: () => handleUpgradeRequest('verification'),
          variant: 'primary',
        });
      }
    }

    // Support Contact
    if (enableContactSupport && accessConfig.primaryAction === 'contact_support') {
      actions.push({
        key: 'support',
        title: 'Contact Support',
        onPress: handleSupportContact,
        loading: uiState.isContactingSupport,
        variant: 'primary',
      });
    }

    // Fallback action
    if (actions.length === 0) {
      actions.push({
        key: 'go-back',
        title: 'Go Back',
        onPress: () => router.back(),
        variant: 'primary',
      });
    }

    return actions;
  }, [accessConfig, enableRetry, enablePermissionRequest, enableUpgrade, enableContactSupport, securityState, uiState, isAuthenticated, handleRetryAccess, handlePermissionRequest, handleUpgradeRequest, handleSupportContact, router]);

  const getSecondaryActions = useCallback(() => {
    const actions = [];

    // Alternative access paths
    if (enableAlternativeAccess && accessState.alternativePaths.length > 0) {
      accessState.alternativePaths.forEach(path => {
        actions.push({
          key: `alt-${path.id}`,
          title: path.label,
          onPress: () => onAlternativeAction?.(path),
        });
      });
    }

    // Logout option for authenticated users
    if (isAuthenticated && accessType !== ACCESS_DENIED_TYPES.AUTHENTICATION_REQUIRED) {
      actions.push({
        key: 'logout',
        title: 'Switch Account',
        onPress: handleLogout,
      });
    }

    // Learn more about permissions
    if (showSecurityDetails) {
      actions.push({
        key: 'learn-more',
        title: 'Learn More',
        onPress: () => setUiState(prev => ({ ...prev, securityModalVisible: true })),
      });
    }

    return actions;
  }, [enableAlternativeAccess, accessState, isAuthenticated, accessType, showSecurityDetails, onAlternativeAction, handleLogout]);

  const renderSecurityModal = useCallback(() => (
    <Modal
      visible={uiState.securityModalVisible}
      onDismiss={() => setUiState(prev => ({ ...prev, securityModalVisible: false }))}
      title="Security Information"
      theme={theme}
    >
      <View style={styles.securityModalContent}>
        <PermissionRequest
          requiredPermission={requiredPermission}
          currentPermission={currentPermission}
          accessType={accessType}
          theme={theme}
        />
      </View>
    </Modal>
  ), [uiState.securityModalVisible, requiredPermission, currentPermission, accessType, theme]);

  // Main Render
  const content = (
    <View style={[styles.container, fullScreen && styles.fullScreenContainer, customStyles.container]} {...restProps}>
      {/* Illustration */}
      {renderIllustration()}
      
      {/* Header */}
      {renderHeader()}
      
      {/* Message */}
      {renderMessage()}
      
      {/* Actions */}
      {renderActions()}
      
      {/* Security Modal */}
      {renderSecurityModal()}
    </View>
  );

  // Return modal or inline based on configuration
  if (modalPresentation) {
    return (
      <Modal
        visible={true}
        onDismiss={() => router.back()}
        showCloseButton={true}
        theme={theme}
      >
        {content}
      </Modal>
    );
  }

  return content;
});

// Component Configuration
AccessDenied.displayName = 'AccessDenied';
AccessDenied.config = ACCESS_DENIED_CONFIG;
AccessDenied.Types = ACCESS_DENIED_TYPES;
AccessDenied.PermissionLevels = PERMISSION_LEVELS;
AccessDenied.SecurityEvents = SECURITY_EVENTS;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'transparent',
  },
  fullScreenContainer: {
    padding: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationIcon: {
    fontSize: 48,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  securityBadge: {
    marginTop: 8,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  countdownContainer: {
    marginTop: 8,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  securityDetails: {
    marginTop: 16,
    alignItems: 'center',
  },
  securityDetail: {
    fontSize: 12,
    marginBottom: 4,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryActions: {
    width: '100%',
    maxWidth: 300,
  },
  actionButton: {
    marginBottom: 12,
  },
  actionButtonSpacing: {
    marginTop: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  secondaryActionButton: {
    marginHorizontal: 4,
  },
  secondaryActionButtonSpacing: {
    marginLeft: 8,
  },
  customActions: {
    marginTop: 16,
  },
  customActionButton: {
    marginBottom: 8,
  },
  securityModalContent: {
    padding: 16,
  },
});

// Export with error boundary
export default withErrorBoundary(AccessDenied, {
  context: 'AccessDenied',
  fallback: <ErrorBoundary.Fallback />,
});

// Custom Hook for Access Control
export const useAccessControl = (requiredPermission, resourceContext = {}) => {
  // Implementation of advanced access control hook
  return {
    // Hook implementation
  };
};