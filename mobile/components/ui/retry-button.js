// components/ui/retry-button.js
// ============================================================
// YACHI ENTERPRISE RETRY BUTTON COMPONENT
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Context
import { useTheme } from '../../contexts/theme-context';
import { useLanguage } from './language-selector';
import { useNotification } from '../../contexts/notification-context';

// Components
import Loading from './loading';

// Services
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Constants
import { YachiColors } from '../../constants/colors';
import { AppConfig } from '../../config/app';

class YachiRetryService {
  constructor() {
    this.retryStrategies = this.getRetryStrategies();
    this.buttonVariants = this.getButtonVariants();
    this.buttonSizes = this.getButtonSizes();
    this.retryStates = this.getRetryStates();
  }

  getRetryStrategies() {
    return {
      IMMEDIATE: 'immediate',
      DELAYED: 'delayed',
      EXPONENTIAL_BACKOFF: 'exponential_backoff',
      INCREMENTAL: 'incremental',
      SMART: 'smart',
    };
  }

  getButtonVariants() {
    return {
      PRIMARY: 'primary',
      SECONDARY: 'secondary',
      TERTIARY: 'tertiary',
      OUTLINE: 'outline',
      GHOST: 'ghost',
      DANGER: 'danger',
      SUCCESS: 'success',
      WARNING: 'warning',
    };
  }

  getButtonSizes() {
    return {
      SMALL: 'small',
      MEDIUM: 'medium',
      LARGE: 'large',
      XLARGE: 'xlarge',
    };
  }

  getRetryStates() {
    return {
      IDLE: 'idle',
      LOADING: 'loading',
      SUCCESS: 'success',
      ERROR: 'error',
      DISABLED: 'disabled',
      RETRYING: 'retrying',
    };
  }

  getRetryDelay(retryCount, strategy) {
    const strategies = {
      [this.retryStrategies.IMMEDIATE]: 0,
      [this.retryStrategies.DELAYED]: 1000,
      [this.retryStrategies.EXPONENTIAL_BACKOFF]: Math.min(1000 * Math.pow(2, retryCount), 30000),
      [this.retryStrategies.INCREMENTAL]: 1000 * (retryCount + 1),
      [this.retryStrategies.SMART]: Math.min(500 * Math.pow(1.5, retryCount), 10000),
    };

    return strategies[strategy] || strategies[this.retryStrategies.IMMEDIATE];
  }

  shouldRetry(retryCount, maxRetries, error) {
    if (retryCount >= maxRetries) return false;
    
    // Don't retry on certain error types
    const nonRetryableErrors = [
      'VALIDATION_ERROR',
      'PERMISSION_DENIED',
      'UNAUTHORIZED',
      'NOT_FOUND',
    ];

    if (error && nonRetryableErrors.includes(error.code)) {
      return false;
    }

    return true;
  }

  getDefaultMessages() {
    return {
      en: {
        retry: 'Retry',
        retrying: 'Retrying...',
        loading: 'Loading...',
        success: 'Success!',
        failed: 'Failed',
        attempt: 'Attempt',
        of: 'of',
        lastAttempt: 'Last attempt',
        connectionError: 'Connection error. Tap to retry.',
        serverError: 'Server error. Tap to retry.',
        unknownError: 'Something went wrong. Tap to retry.',
      },
      am: {
        retry: 'እንደገና ሞክር',
        retrying: 'በመሞከር ላይ...',
        loading: 'በመጫን ላይ...',
        success: 'ተሳክቷል!',
        failed: 'አልተሳካም',
        attempt: 'ሙከራ',
        of: 'ከ',
        lastAttempt: 'የመጨረሻ ሙከራ',
        connectionError: 'የግንኙነት ስህተት። ለማድገም ይንኩ።',
        serverError: 'የሰርቨር ስህተት። ለማድገም ይንኩ።',
        unknownError: 'ስህተት ተፈጥሯል። ለማድገም ይንኩ።',
      },
      om: {
        retry: 'Irra deebi\'ii yaali',
        retrying: 'Irra deebi\'ii yaaluu...',
        loading: 'Ku loadsaa...',
        success: 'Milkaa\'e!',
        failed: 'Hin milkaa\'in',
        attempt: 'Yaalli',
        of: 'irraa',
        lastAttempt: 'Yaalli dhumaa',
        connectionError: 'Dogoggora walqunnamtii. Irra deebi\'ii yaaluuf cuqaasi.',
        serverError: 'Dogoggora serveeraa. Irra deebi\'ii yaaluuf cuqaasi.',
        unknownError: 'Wanti tokko dogoggora uume. Irra deebi\'ii yaaluuf cuqaasi.',
      },
    };
  }

  getErrorMessage(error, language = 'en') {
    const messages = this.getDefaultMessages()[language] || this.getDefaultMessages().en;
    
    if (!error) return messages.unknownError;
    
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      return messages.connectionError;
    }
    
    if (error.code === 'SERVER_ERROR' || error.status >= 500) {
      return messages.serverError;
    }
    
    return messages.unknownError;
  }

  getVariantConfig(variant, colors) {
    const configs = {
      [this.buttonVariants.PRIMARY]: {
        backgroundColor: colors.primary,
        textColor: '#FFFFFF',
        borderColor: colors.primary,
        loadingColor: '#FFFFFF',
      },
      [this.buttonVariants.SECONDARY]: {
        backgroundColor: colors.secondary,
        textColor: colors.secondaryForeground,
        borderColor: colors.secondary,
        loadingColor: colors.secondaryForeground,
      },
      [this.buttonVariants.TERTIARY]: {
        backgroundColor: 'transparent',
        textColor: colors.primary,
        borderColor: 'transparent',
        loadingColor: colors.primary,
      },
      [this.buttonVariants.OUTLINE]: {
        backgroundColor: 'transparent',
        textColor: colors.primary,
        borderColor: colors.primary,
        loadingColor: colors.primary,
      },
      [this.buttonVariants.GHOST]: {
        backgroundColor: 'transparent',
        textColor: colors.foreground,
        borderColor: 'transparent',
        loadingColor: colors.foreground,
      },
      [this.buttonVariants.DANGER]: {
        backgroundColor: colors.error,
        textColor: '#FFFFFF',
        borderColor: colors.error,
        loadingColor: '#FFFFFF',
      },
      [this.buttonVariants.SUCCESS]: {
        backgroundColor: colors.success,
        textColor: '#FFFFFF',
        borderColor: colors.success,
        loadingColor: '#FFFFFF',
      },
      [this.buttonVariants.WARNING]: {
        backgroundColor: colors.warning,
        textColor: '#FFFFFF',
        borderColor: colors.warning,
        loadingColor: '#FFFFFF',
      },
    };

    return configs[variant] || configs[this.buttonVariants.PRIMARY];
  }

  getSizeConfig(size) {
    const configs = {
      [this.buttonSizes.SMALL]: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        fontSize: 12,
        iconSize: 14,
        borderRadius: 6,
      },
      [this.buttonSizes.MEDIUM]: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        fontSize: 14,
        iconSize: 16,
        borderRadius: 8,
      },
      [this.buttonSizes.LARGE]: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        fontSize: 16,
        iconSize: 18,
        borderRadius: 10,
      },
      [this.buttonSizes.XLARGE]: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        fontSize: 18,
        iconSize: 20,
        borderRadius: 12,
      },
    };

    return configs[size] || configs[this.buttonSizes.MEDIUM];
  }
}

// Singleton instance
export const retryService = new YachiRetryService();

/**
 * Enterprise Retry Button with Advanced Retry Logic
 * Supports multiple retry strategies, states, and intelligent error handling
 */
export default function RetryButton({
  // Core Props
  onRetry = () => {},
  onSuccess = () => {},
  onFailure = () => {},
  
  // Retry Configuration
  retryStrategy = retryService.retryStrategies.SMART,
  maxRetries = 3,
  initialRetryCount = 0,
  autoRetry = false,
  retryDelay,
  
  // Button Configuration
  variant = retryService.buttonVariants.PRIMARY,
  size = retryService.buttonSizes.MEDIUM,
  state = retryService.retryStates.IDLE,
  error = null,
  
  // Content
  label,
  successLabel,
  loadingLabel,
  retryingLabel,
  showIcon = true,
  iconPosition = 'left',
  customIcon,
  
  // Display Options
  showRetryCount = true,
  showErrorText = false,
  compact = false,
  fullWidth = false,
  
  // Styling
  customStyle,
  textStyle,
  iconStyle,
  loadingStyle,
  
  // Technical
  testID = 'yachi-retry-button',
  accessibilityLabel,
  disabled = false,
  analyticsEvent = 'retry_action',
  
  // Advanced
  hapticFeedback = true,
  animateTransitions = true,
  debounceMs = 300,
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  const { showNotification } = useNotification();
  
  // Refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const retryTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  
  // State
  const [retryCount, setRetryCount] = useState(initialRetryCount);
  const [currentState, setCurrentState] = useState(state);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Memoized values
  const messages = useMemo(() => 
    retryService.getDefaultMessages()[currentLanguage.code] || 
    retryService.getDefaultMessages().en,
    [currentLanguage]
  );

  const variantConfig = useMemo(() => 
    retryService.getVariantConfig(variant, colors),
    [variant, colors]
  );

  const sizeConfig = useMemo(() => 
    retryService.getSizeConfig(size),
    [size]
  );

  const canRetry = useMemo(() => 
    retryService.shouldRetry(retryCount, maxRetries, error) && !disabled,
    [retryCount, maxRetries, error, disabled]
  );

  const isRetrying = useMemo(() => 
    currentState === retryService.retryStates.RETRYING ||
    currentState === retryService.retryStates.LOADING,
    [currentState]
  );

  const isSuccessful = useMemo(() => 
    currentState === retryService.retryStates.SUCCESS,
    [currentState]
  );

  const isError = useMemo(() => 
    currentState === retryService.retryStates.ERROR,
    [currentState]
  );

  const buttonLabel = useMemo(() => {
    if (isRetrying) return retryingLabel || messages.retrying;
    if (isSuccessful) return successLabel || messages.success;
    if (label) return label;
    
    return isError ? messages.retry : messages.retry;
  }, [isRetrying, isSuccessful, isError, label, retryingLabel, successLabel, messages]);

  const errorMessage = useMemo(() => 
    retryService.getErrorMessage(error, currentLanguage.code),
    [error, currentLanguage]
  );

  const retryCountText = useMemo(() => {
    if (!showRetryCount || retryCount === 0) return null;
    
    if (retryCount >= maxRetries) {
      return `${messages.lastAttempt}`;
    }
    
    return `${messages.attempt} ${retryCount + 1} ${messages.of} ${maxRetries}`;
  }, [showRetryCount, retryCount, maxRetries, messages]);

  const resolvedAccessibilityLabel = useMemo(() => 
    accessibilityLabel || 
    (isError ? errorMessage : buttonLabel),
    [accessibilityLabel, isError, errorMessage, buttonLabel]
  );

  // Effects
  useEffect(() => {
    setCurrentState(state);
  }, [state]);

  useEffect(() => {
    if (autoRetry && isError && canRetry) {
      scheduleRetry();
    }
  }, [autoRetry, isError, canRetry]);

  useEffect(() => {
    return () => {
      // Cleanup timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Animation methods
  const animatePress = useCallback(() => {
    if (!animateTransitions) return;

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animateTransitions, scaleAnim]);

  const animateStateChange = useCallback((newState) => {
    if (!animateTransitions) return;

    Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animateTransitions, opacityAnim]);

  const triggerHapticFeedback = useCallback((type = 'light') => {
    if (!hapticFeedback || Platform.OS === 'web') return;

    const hapticTypes = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
      success: Haptics.NotificationFeedbackType.Success,
      error: Haptics.NotificationFeedbackType.Error,
      warning: Haptics.NotificationFeedbackType.Warning,
    };

    if (type in Haptics.ImpactFeedbackStyle) {
      Haptics.impactAsync(hapticTypes[type]);
    } else {
      Haptics.notificationAsync(hapticTypes[type]);
    }
  }, [hapticFeedback]);

  // Retry logic
  const scheduleRetry = useCallback(() => {
    const delay = retryDelay || retryService.getRetryDelay(retryCount, retryStrategy);
    
    if (delay > 0) {
      setCurrentState(retryService.retryStates.RETRYING);
      
      retryTimeoutRef.current = setTimeout(() => {
        executeRetry();
      }, delay);
    } else {
      executeRetry();
    }
  }, [retryDelay, retryCount, retryStrategy, executeRetry]);

  const executeRetry = useCallback(async () => {
    if (!canRetry || isDebouncing) return;

    setIsDebouncing(true);
    setCurrentState(retryService.retryStates.LOADING);
    animateStateChange(retryService.retryStates.LOADING);
    triggerHapticFeedback('medium');

    try {
      // Track analytics
      analyticsService.trackEvent(analyticsEvent, {
        retry_count: retryCount + 1,
        max_retries: maxRetries,
        strategy: retryStrategy,
        error_code: error?.code,
      });

      // Execute retry callback
      const result = await onRetry(retryCount + 1);

      // Success handling
      setCurrentState(retryService.retryStates.SUCCESS);
      setRetryCount(prev => prev + 1);
      triggerHapticFeedback('success');
      animateStateChange(retryService.retryStates.SUCCESS);

      // Call success callback
      onSuccess(result, retryCount + 1);

      // Show success notification if not auto-retry
      if (!autoRetry) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Operation completed successfully',
          duration: 3000,
        });
      }

    } catch (error) {
      // Failure handling
      const newRetryCount = retryCount + 1;
      setCurrentState(retryService.retryStates.ERROR);
      setRetryCount(newRetryCount);
      triggerHapticFeedback('error');
      animateStateChange(retryService.retryStates.ERROR);

      // Call failure callback
      onFailure(error, newRetryCount);

      // Track error
      errorService.handleError(error, 'Retry Operation Failed');

      // Show error notification if not auto-retry and no more retries
      if (!autoRetry && !retryService.shouldRetry(newRetryCount, maxRetries, error)) {
        showNotification({
          type: 'error',
          title: 'Operation Failed',
          message: 'All retry attempts have been exhausted',
          duration: 5000,
        });
      }
    } finally {
      // Clear debounce
      debounceTimeoutRef.current = setTimeout(() => {
        setIsDebouncing(false);
      }, debounceMs);
    }
  }, [
    canRetry,
    isDebouncing,
    retryCount,
    maxRetries,
    retryStrategy,
    error,
    onRetry,
    onSuccess,
    onFailure,
    autoRetry,
    debounceMs,
    triggerHapticFeedback,
    animateStateChange,
    showNotification,
  ]);

  const handlePress = useCallback(() => {
    if (!canRetry || isRetrying || isDebouncing) return;

    animatePress();
    
    if (autoRetry) {
      scheduleRetry();
    } else {
      executeRetry();
    }
  }, [canRetry, isRetrying, isDebouncing, autoRetry, animatePress, scheduleRetry, executeRetry]);

  // Render methods
  const renderIcon = useCallback(() => {
    if (!showIcon) return null;

    const iconProps = {
      size: sizeConfig.iconSize,
      color: variantConfig.loadingColor,
      style: [styles.icon, iconStyle],
    };

    if (customIcon) {
      return React.cloneElement(customIcon, iconProps);
    }

    if (isRetrying) {
      return <ActivityIndicator {...iconProps} color={variantConfig.loadingColor} />;
    }

    if (isSuccessful) {
      return <Ionicons name="checkmark" {...iconProps} />;
    }

    if (isError) {
      return <Ionicons name="refresh" {...iconProps} />;
    }

    return <Ionicons name="refresh" {...iconProps} />;
  }, [showIcon, sizeConfig, variantConfig, customIcon, isRetrying, isSuccessful, isError, iconStyle]);

  const renderContent = useCallback(() => {
    const textElement = (
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.label,
            {
              fontSize: sizeConfig.fontSize,
              color: variantConfig.textColor,
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {buttonLabel}
        </Text>
        
        {retryCountText && (
          <Text
            style={[
              styles.retryCount,
              {
                fontSize: sizeConfig.fontSize - 2,
                color: variantConfig.textColor,
                opacity: 0.8,
              },
            ]}
          >
            {retryCountText}
          </Text>
        )}
        
        {showErrorText && isError && errorMessage && (
          <Text
            style={[
              styles.errorText,
              {
                fontSize: sizeConfig.fontSize - 2,
                color: variantConfig.textColor,
                opacity: 0.8,
              },
            ]}
            numberOfLines={2}
          >
            {errorMessage}
          </Text>
        )}
      </View>
    );

    const iconElement = renderIcon();

    if (!iconElement) {
      return textElement;
    }

    const isIconLeft = (iconPosition === 'left' && !isRTL) || (iconPosition === 'right' && isRTL);

    return (
      <View style={styles.content}>
        {isIconLeft && iconElement}
        {textElement}
        {!isIconLeft && iconElement}
      </View>
    );
  }, [
    buttonLabel,
    retryCountText,
    showErrorText,
    isError,
    errorMessage,
    renderIcon,
    iconPosition,
    isRTL,
    sizeConfig,
    variantConfig,
    textStyle,
  ]);

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: variantConfig.backgroundColor,
      borderColor: variantConfig.borderColor,
      borderWidth: variant.borderColor === 'transparent' ? 0 : 1,
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: compact ? sizeConfig.paddingVertical : sizeConfig.paddingHorizontal,
      borderRadius: sizeConfig.borderRadius,
      opacity: opacityAnim,
      transform: [{ scale: scaleAnim }],
    },
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    customStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      disabled={!canRetry || isRetrying || isDebouncing || disabled}
      activeOpacity={0.8}
      testID={testID}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        busy: isRetrying,
        disabled: !canRetry || disabled,
      }}
    >
      <Animated.View style={styles.innerContainer}>
        {renderContent()}
        
        {/* Progress indicator for delayed retry */}
        {currentState === retryService.retryStates.RETRYING && (
          <View style={styles.progressContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  backgroundColor: variantConfig.loadingColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]} 
            />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Pre-configured retry button variants
export function PrimaryRetryButton(props) {
  return <RetryButton variant={retryService.buttonVariants.PRIMARY} {...props} />;
}

export function OutlineRetryButton(props) {
  return <RetryButton variant={retryService.buttonVariants.OUTLINE} {...props} />;
}

export function DangerRetryButton(props) {
  return <RetryButton variant={retryService.buttonVariants.DANGER} {...props} />;
}

export function GhostRetryButton(props) {
  return <RetryButton variant={retryService.buttonVariants.GHOST} {...props} />;
}

export function AutoRetryButton({ maxRetries = 5, ...props }) {
  return (
    <RetryButton
      autoRetry={true}
      maxRetries={maxRetries}
      retryStrategy={retryService.retryStrategies.EXPONENTIAL_BACKOFF}
      showRetryCount={true}
      {...props}
    />
  );
}

export function SmartRetryButton({ maxRetries = 3, ...props }) {
  return (
    <RetryButton
      retryStrategy={retryService.retryStrategies.SMART}
      maxRetries={maxRetries}
      showRetryCount={true}
      showErrorText={true}
      {...props}
    />
  );
}

// Hook for retry state management
export const useRetry = (options = {}) => {
  const {
    maxRetries = 3,
    retryStrategy = retryService.retryStrategies.SMART,
    autoRetry = false,
    onSuccess: externalOnSuccess,
    onFailure: externalOnFailure,
  } = options;

  const [state, setState] = useState(retryService.retryStates.IDLE);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState(null);

  const execute = useCallback(async (retryAction, attemptCount = retryCount + 1) => {
    if (attemptCount > maxRetries) {
      setState(retryService.retryStates.ERROR);
      return;
    }

    setState(retryService.retryStates.LOADING);
    setRetryCount(attemptCount);

    try {
      const result = await retryAction(attemptCount);
      setState(retryService.retryStates.SUCCESS);
      setError(null);
      
      if (externalOnSuccess) {
        externalOnSuccess(result, attemptCount);
      }
      
      return result;
    } catch (err) {
      setState(retryService.retryStates.ERROR);
      setError(err);
      
      if (externalOnFailure) {
        externalOnFailure(err, attemptCount);
      }
      
      // Auto-retry logic
      if (autoRetry && retryService.shouldRetry(attemptCount, maxRetries, err)) {
        const delay = retryService.getRetryDelay(attemptCount, retryStrategy);
        
        setTimeout(() => {
          execute(retryAction, attemptCount + 1);
        }, delay);
      }
      
      throw err;
    }
  }, [maxRetries, retryStrategy, autoRetry, externalOnSuccess, externalOnFailure, retryCount]);

  const reset = useCallback(() => {
    setState(retryService.retryStates.IDLE);
    setRetryCount(0);
    setError(null);
  }, []);

  return {
    state,
    retryCount,
    error,
    execute,
    reset,
    canRetry: retryService.shouldRetry(retryCount, maxRetries, error),
    isIdle: state === retryService.retryStates.IDLE,
    isLoading: state === retryService.retryStates.LOADING,
    isSuccess: state === retryService.retryStates.SUCCESS,
    isError: state === retryService.retryStates.ERROR,
  };
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  innerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  retryCount: {
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 2,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 2,
  },
  icon: {
    marginHorizontal: 4,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});

export { retryService };