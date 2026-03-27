// components/forms/biometric-prompt.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  Dimensions,
  AppState,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

// Contexts
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Button from '../ui/button';
import Modal from '../ui/modal';
import Loading from '../ui/loading';

// Services
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { notificationService } from '../../services/notification-service';

// Utils
import { storage } from '../../utils/storage';

// Constants
import { COLORS } from '../../constants/colors';

const BIOMETRIC_TYPES = {
  FINGERPRINT: 'fingerprint',
  FACIAL: 'facial',
  IRIS: 'iris',
  NONE: 'none',
};

const SECURITY_LEVELS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  HIGH: 'high',
  ENTERPRISE: 'enterprise',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise-level BiometricPrompt Component
 * Multi-platform biometric authentication (Face ID, Touch ID, Android Biometric)
 * Ethiopian market security compliance
 */

const BiometricPrompt = ({
  // Configuration
  securityLevel = SECURITY_LEVELS.STANDARD,
  allowedBiometricTypes = [BIOMETRIC_TYPES.FINGERPRINT, BIOMETRIC_TYPES.FACIAL],
  fallbackEnabled = true,
  maxAttempts = 3,
  autoPrompt = false,
  
  // Callbacks
  onAuthenticate,
  onSuccess,
  onError,
  onFallback,
  onCancel,
  
  // UI Customization
  promptTitle = 'Authentication Required',
  promptSubtitle = 'Use your biometric to authenticate',
  cancelButtonText = 'Cancel',
  fallbackButtonText = 'Use Password',
  
  // Styling
  style,
  buttonStyle,
  
  // Testing
  testID = 'biometric-prompt',
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  // State
  const [isVisible, setIsVisible] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(BIOMETRIC_TYPES.NONE);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState(null);
  const [showFallback, setShowFallback] = useState(false);
  
  // Refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const appStateRef = useRef(AppState.currentState);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
    setupAppStateListener();
    
    return () => {
      cleanupAppStateListener();
    };
  }, []);

  // Auto-prompt when component mounts if enabled
  useEffect(() => {
    if (autoPrompt && biometricAvailable && biometricEnabled) {
      setTimeout(() => {
        handlePrompt();
      }, 1000);
    }
  }, [autoPrompt, biometricAvailable, biometricEnabled]);

  // Check biometric capabilities
  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setBiometricAvailable(false);
        setError('Biometric authentication not available on this device');
        return;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!isEnrolled) {
        setBiometricAvailable(false);
        setError('No biometric credentials enrolled');
        return;
      }

      // Map supported types to our constants
      const mappedTypes = supportedTypes.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return BIOMETRIC_TYPES.FINGERPRINT;
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return BIOMETRIC_TYPES.FACIAL;
          default:
            return BIOMETRIC_TYPES.NONE;
        }
      });

      // Check if any allowed types are available
      const availableType = mappedTypes.find(type => 
        allowedBiometricTypes.includes(type)
      );

      if (availableType) {
        setBiometricAvailable(true);
        setBiometricType(availableType);
        
        // Check if user has previously enabled biometric
        const savedPreference = await storage.getItem(`biometric_enabled_${user?.id}`);
        setBiometricEnabled(!!savedPreference);
        
        analyticsService.track('biometric_availability_checked', {
          available: true,
          type: availableType,
          userId: user?.id,
        });
      } else {
        setBiometricAvailable(false);
        setError('Biometric type not supported');
      }

    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
      setError('Failed to check biometric availability');
      
      errorService.handleError(error, {
        context: 'BiometricAvailabilityCheck',
        component: 'BiometricPrompt',
        userId: user?.id,
      });
    }
  };

  // App state listener for security
  const setupAppStateListener = () => {
    AppState.addEventListener('change', handleAppStateChange);
  };

  const cleanupAppStateListener = () => {
    AppState.removeEventListener('change', handleAppStateChange);
  };

  const handleAppStateChange = (nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      if (isAuthenticating) {
        cancelAuthentication();
      }
    }
    appStateRef.current = nextAppState;
  };

  // Handle authentication prompt
  const handlePrompt = async () => {
    if (!biometricAvailable || isAuthenticating) return;

    // Check rate limiting
    if (!checkRateLimit()) {
      return;
    }

    setIsVisible(true);
    setIsAuthenticating(true);
    setError(null);

    analyticsService.track('biometric_prompt_shown', {
      biometricType,
      securityLevel,
      attemptCount,
      userId: user?.id,
    });

    await performBiometricAuthentication();
  };

  // Perform biometric authentication
  const performBiometricAuthentication = async () => {
    try {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: promptTitle,
        cancelLabel: cancelButtonText,
        disableDeviceFallback: !fallbackEnabled,
        fallbackLabel: fallbackEnabled ? fallbackButtonText : undefined,
      });

      setIsAuthenticating(false);

      if (authResult.success) {
        await handleAuthenticationSuccess();
      } else {
        await handleAuthenticationFailure(authResult.error);
      }

    } catch (error) {
      console.error('Biometric authentication error:', error);
      setIsAuthenticating(false);
      await handleAuthenticationError(error);
    }
  };

  // Handle successful authentication
  const handleAuthenticationSuccess = async () => {
    setAttemptCount(0);
    
    analyticsService.track('biometric_authentication_success', {
      biometricType,
      securityLevel,
      userId: user?.id,
    });

    // Enable biometric for future use if not already enabled
    if (!biometricEnabled) {
      await enableBiometric();
    }

    // Call success callbacks
    onAuthenticate?.(true);
    onSuccess?.({
      biometricType,
      securityLevel,
      timestamp: new Date().toISOString(),
    });

    setIsVisible(false);
    
    notificationService.show({
      type: 'success',
      title: 'Authentication Successful',
      message: `Authenticated with ${getBiometricName()}`,
    });
  };

  // Handle authentication failure
  const handleAuthenticationFailure = async (errorCode) => {
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);

    let errorMessage = 'Authentication failed';
    
    switch (errorCode) {
      case 'user_cancel':
        errorMessage = 'Authentication cancelled';
        onCancel?.();
        break;
      case 'system_cancel':
        errorMessage = 'Authentication cancelled by system';
        break;
      case 'locked_out':
        errorMessage = 'Biometric authentication locked out';
        break;
      case 'not_enrolled':
        errorMessage = 'Biometric not enrolled';
        break;
      case 'not_available':
        errorMessage = 'Biometric not available';
        break;
      default:
        errorMessage = 'Authentication failed';
    }

    setError(errorMessage);

    analyticsService.track('biometric_authentication_failed', {
      errorCode,
      attemptCount: newAttemptCount,
      biometricType,
      userId: user?.id,
    });

    onAuthenticate?.(false);
    onError?.(errorCode, errorMessage);

    // Show fallback option if enabled and not locked out
    if (fallbackEnabled && newAttemptCount < maxAttempts && errorCode !== 'locked_out') {
      setShowFallback(true);
    }

    // Lock out after max attempts
    if (newAttemptCount >= maxAttempts) {
      await handleLockout();
    }
  };

  // Handle authentication errors
  const handleAuthenticationError = async (error) => {
    const errorMessage = 'Biometric authentication error';
    setError(errorMessage);

    errorService.handleError(error, {
      context: 'BiometricAuthentication',
      component: 'BiometricPrompt',
      biometricType,
      userId: user?.id,
    });

    onError?.('system_error', errorMessage);
    
    notificationService.show({
      type: 'error',
      title: 'Authentication Failed',
      message: errorMessage,
    });
  };

  // Handle lockout
  const handleLockout = async () => {
    const lockoutTime = 5 * 60 * 1000; // 5 minutes
    await storage.setItem('biometric_lockout', {
      until: Date.now() + lockoutTime,
      reason: 'max_attempts_exceeded',
    });

    setError('Too many failed attempts. Please try again in 5 minutes.');
    
    analyticsService.track('biometric_lockout_activated', {
      lockoutDuration: lockoutTime,
      attemptCount,
      userId: user?.id,
    });
  };

  // Check rate limiting
  const checkRateLimit = () => {
    // Check if locked out
    const lockout = storage.getItem('biometric_lockout');
    if (lockout && lockout.until > Date.now()) {
      setError('Too many attempts. Please try again later.');
      return false;
    }

    return true;
  };

  // Enable biometric for future use
  const enableBiometric = async () => {
    try {
      await storage.setItem(`biometric_enabled_${user?.id}`, {
        enabled: true,
        enabledAt: new Date().toISOString(),
        biometricType,
        securityLevel,
      });

      setBiometricEnabled(true);

      analyticsService.track('biometric_enabled', {
        biometricType,
        securityLevel,
        userId: user?.id,
      });

      notificationService.show({
        type: 'success',
        title: 'Biometric Enabled',
        message: `${getBiometricName()} has been enabled for quick access`,
      });
    } catch (error) {
      console.error('Error enabling biometric:', error);
      errorService.handleError(error, {
        context: 'BiometricEnable',
        component: 'BiometricPrompt',
        userId: user?.id,
      });
    }
  };

  // Disable biometric
  const disableBiometric = async () => {
    try {
      await storage.removeItem(`biometric_enabled_${user?.id}`);
      setBiometricEnabled(false);

      analyticsService.track('biometric_disabled', {
        biometricType,
        userId: user?.id,
      });

      notificationService.show({
        type: 'success',
        title: 'Biometric Disabled',
        message: `${getBiometricName()} has been disabled`,
      });
    } catch (error) {
      console.error('Error disabling biometric:', error);
      errorService.handleError(error, {
        context: 'BiometricDisable',
        component: 'BiometricPrompt',
        userId: user?.id,
      });
    }
  };

  // Cancel authentication
  const cancelAuthentication = () => {
    LocalAuthentication.cancelAuthenticate();
    setIsAuthenticating(false);
    setIsVisible(false);
    setShowFallback(false);
    onCancel?.();
  };

  // Handle fallback authentication
  const handleFallback = () => {
    setIsVisible(false);
    setShowFallback(false);
    onFallback?.();
  };

  // Get biometric icon based on type
  const getBiometricIcon = () => {
    switch (biometricType) {
      case BIOMETRIC_TYPES.FACIAL:
        return '👁️';
      case BIOMETRIC_TYPES.FINGERPRINT:
        return '👆';
      default:
        return '🔒';
    }
  };

  // Get biometric name for display
  const getBiometricName = () => {
    switch (biometricType) {
      case BIOMETRIC_TYPES.FACIAL:
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case BIOMETRIC_TYPES.FINGERPRINT:
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      default:
        return 'Biometric';
    }
  };

  // Start pulse animation
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Stop pulse animation
  const stopPulseAnimation = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  useEffect(() => {
    if (isAuthenticating) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isAuthenticating, startPulseAnimation, stopPulseAnimation]);

  // Render biometric button
  const renderBiometricButton = () => {
    if (!biometricAvailable) return null;

    return (
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        <Pressable
          onPressIn={() => {
            Animated.spring(scaleAnim, {
              toValue: 0.95,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(scaleAnim, {
              toValue: 1,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }).start();
          }}
          onPress={handlePrompt}
          disabled={isAuthenticating}
          style={[
            styles.button,
            buttonStyle,
            {
              backgroundColor: theme.colors.primary,
              opacity: isAuthenticating ? 0.7 : 1,
            },
          ]}
          testID={testID}
        >
          <Animated.Text
            style={[
              styles.icon,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {getBiometricIcon()}
          </Animated.Text>
          <View style={styles.buttonTextContainer}>
            <ThemedText type="body" weight="semiBold" style={styles.buttonTitle}>
              {isAuthenticating ? 'Authenticating...' : getBiometricName()}
            </ThemedText>
            <ThemedText type="caption" style={styles.buttonSubtitle}>
              {biometricEnabled ? 'Tap to authenticate' : 'Tap to enable'}
            </ThemedText>
          </View>
        </Pressable>

        {/* Enable/disable toggle for development */}
        {__DEV__ && (
          <View style={styles.devControls}>
            <Button
              variant="outline"
              size="small"
              onPress={biometricEnabled ? disableBiometric : enableBiometric}
            >
              {biometricEnabled ? 'Disable' : 'Enable'}
            </Button>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render authentication modal
  const renderAuthModal = () => (
    <Modal
      visible={isVisible}
      onDismiss={cancelAuthentication}
      title={promptTitle}
      size="small"
    >
      <View style={styles.modalContent}>
        {isAuthenticating ? (
          <>
            <Animated.Text
              style={[
                styles.modalIcon,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              {getBiometricIcon()}
            </Animated.Text>
            <ThemedText type="body" style={styles.modalSubtitle}>
              {promptSubtitle}
            </ThemedText>
            <Loading message="Waiting for authentication..." size="small" />
          </>
        ) : (
          <>
            <ThemedText type="title" style={styles.modalIcon}>
              {getBiometricIcon()}
            </ThemedText>
            <ThemedText type="body" weight="semiBold">
              Authentication Required
            </ThemedText>
            {error && (
              <ThemedText type="caption" color="error" style={styles.errorText}>
                {error}
              </ThemedText>
            )}
            <View style={styles.modalActions}>
              {showFallback && (
                <Button
                  variant="outline"
                  onPress={handleFallback}
                  style={styles.fallbackButton}
                >
                  {fallbackButtonText}
                </Button>
              )}
              <Button
                variant="primary"
                onPress={handlePrompt}
                style={styles.retryButton}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onPress={cancelAuthentication}
                style={styles.cancelButton}
              >
                {cancelButtonText}
              </Button>
            </View>
          </>
        )}
      </View>
    </Modal>
  );

  // Render unavailable state
  const renderUnavailableState = () => {
    if (biometricAvailable) return null;

    return (
      <View style={styles.unavailableContainer}>
        <ThemedText type="caption" color="secondary">
          Biometric authentication not available
        </ThemedText>
        {error && (
          <ThemedText type="caption" color="error" style={styles.unavailableError}>
            {error}
          </ThemedText>
        )}
      </View>
    );
  };

  if (!biometricAvailable && !__DEV__) {
    return null;
  }

  return (
    <View style={styles.container}>
      {renderBiometricButton()}
      {renderUnavailableState()}
      {renderAuthModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: 'white',
    marginBottom: 2,
  },
  buttonSubtitle: {
    color: 'white',
    opacity: 0.9,
  },
  devControls: {
    marginTop: 8,
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    padding: 20,
  },
  modalIcon: {
    fontSize: 32,
    marginBottom: 16,
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  fallbackButton: {
    width: '100%',
  },
  retryButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  unavailableContainer: {
    padding: 16,
    alignItems: 'center',
  },
  unavailableError: {
    textAlign: 'center',
    marginTop: 4,
  },
});

export default BiometricPrompt;

// Hook for using biometric in components
export const useBiometric = (options = {}) => {
  const [state, setState] = useState({
    available: false,
    enabled: false,
    authenticating: false,
    error: null,
  });

  const checkAvailability = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      setState(prev => ({
        ...prev,
        available: hasHardware && isEnrolled,
        error: null,
      }));
      
      return hasHardware && isEnrolled;
    } catch (error) {
      setState(prev => ({
        ...prev,
        available: false,
        error: error.message,
      }));
      return false;
    }
  }, []);

  const authenticate = useCallback(async (authOptions = {}) => {
    setState(prev => ({ ...prev, authenticating: true, error: null }));
    
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: authOptions.promptMessage || 'Authenticate',
        cancelLabel: authOptions.cancelLabel || 'Cancel',
        disableDeviceFallback: authOptions.disableDeviceFallback || false,
        ...authOptions,
      });
      
      setState(prev => ({ ...prev, authenticating: false }));
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, authenticating: false, error: error.message }));
      throw error;
    }
  }, []);

  return {
    ...state,
    checkAvailability,
    authenticate,
  };
};