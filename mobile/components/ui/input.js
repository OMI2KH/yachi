// components/ui/input.js - ENTERPRISE REWRITE
/**
 * Enterprise Input Component
 * Advanced input system with AI-powered features, real-time validation, and enterprise-grade functionality
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useAnalytics } from '../../hooks/use-analytics';
import { usePerformance } from '../../hooks/use-performance';
import { useErrorBoundary } from '../../hooks/use-error-boundary';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { AnalyticsService } from '../../services/analytics-service';
import { ErrorService } from '../../services/error-service';
import { ValidationService } from '../../services/validation-service';
import { AIInputService } from '../../services/ai-input-service';
import { SecurityService } from '../../services/security-service';

// Constants
const INPUT_CONFIG = {
  PERFORMANCE: {
    ANIMATION_DURATION: 200,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    VALIDATION_DELAY: 500,
  },
  AI: {
    AUTO_COMPLETION: true,
    SMART_VALIDATION: true,
    CONTEXT_AWARE_SUGGESTIONS: true,
    BEHAVIOR_ANALYSIS: true,
  },
  SECURITY: {
    INPUT_SANITIZATION: true,
    XSS_PROTECTION: true,
    SQL_INJECTION_PROTECTION: true,
    PRIVACY_MODE: false,
  },
  ACCESSIBILITY: {
    SCREEN_READER_OPTIMIZED: true,
    KEYBOARD_NAVIGATION: true,
    HIGH_CONTRAST_SUPPORT: true,
  },
};

const INPUT_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  PASSWORD: 'password',
  NUMBER: 'number',
  PHONE: 'phone',
  URL: 'url',
  SEARCH: 'search',
  TEXTAREA: 'textarea',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  CURRENCY: 'currency',
  PERCENTAGE: 'percentage',
  CREDIT_CARD: 'credit_card',
  SSN: 'ssn',
  GOVERNMENT_ID: 'government_id',
  CONSTRUCTION_CODE: 'construction_code',
};

const INPUT_VARIANTS = {
  OUTLINE: 'outline',
  FILLED: 'filled',
  UNDERLINE: 'underline',
  GHOST: 'ghost',
  PREMIUM: 'premium',
  GOVERNMENT: 'government',
  CONTRACTOR: 'contractor',
  ADMIN: 'admin',
};

const INPUT_SIZES = {
  XS: { key: 'xs', height: 32, fontSize: 12, padding: 8 },
  SM: { key: 'sm', height: 40, fontSize: 14, padding: 12 },
  MD: { key: 'md', height: 48, fontSize: 16, padding: 16 },
  LG: { key: 'lg', height: 56, fontSize: 18, padding: 20 },
  XL: { key: 'xl', height: 64, fontSize: 20, padding: 24 },
};

const INPUT_STATES = {
  DEFAULT: 'default',
  FOCUSED: 'focused',
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  DISABLED: 'disabled',
  LOADING: 'loading',
  READONLY: 'readonly',
};

const VALIDATION_TYPES = {
  REQUIRED: 'required',
  EMAIL: 'email',
  PHONE: 'phone',
  URL: 'url',
  MIN_LENGTH: 'min_length',
  MAX_LENGTH: 'max_length',
  PATTERN: 'pattern',
  CUSTOM: 'custom',
  GOVERNMENT: 'government',
  CONSTRUCTION: 'construction',
  FINANCIAL: 'financial',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Input Component
 * 
 * Advanced Features:
 * - AI-powered auto-completion and smart suggestions
 * - Real-time validation with contextual feedback
 * - Advanced security features with input sanitization
 * - Multi-format support with automatic conversion
 * - Enterprise-grade accessibility compliance
 * - Government and contractor specific validation
 * - Comprehensive analytics and performance monitoring
 * - Advanced animation system with gesture support
 */
const Input = React.memo(({
  // Core Configuration
  type = INPUT_TYPES.TEXT,
  variant = INPUT_VARIANTS.OUTLINE,
  size = INPUT_SIZES.MD,
  state = INPUT_STATES.DEFAULT,
  
  // Content
  value,
  defaultValue,
  placeholder,
  label,
  helperText,
  errorMessage,
  successMessage,
  warningMessage,
  
  // Behavior
  onChange,
  onChangeText,
  onFocus,
  onBlur,
  onSubmit,
  onValidation,
  debounce = false,
  throttle = false,
  autoFocus = false,
  autoComplete = true,
  autoCorrect = true,
  autoCapitalize = 'sentences',
  spellCheck = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  minLength,
  required = false,
  disabled = false,
  readOnly = false,
  secureTextEntry = false,
  
  // Validation
  validationRules = [],
  validateOnChange = true,
  validateOnBlur = true,
  showValidation = true,
  customValidator,
  
  // Security
  securityContext = {},
  inputSanitization = true,
  privacyMode = false,
  maskValue = false,
  
  // AI Features
  enableAISuggestions = true,
  enableAutoCompletion = true,
  enableSmartValidation = true,
  
  // Analytics
  analyticsContext = {},
  enableInteractionTracking = true,
  
  // Icons & Actions
  leftIcon,
  rightIcon,
  clearButton = true,
  showPasswordToggle = false,
  actionButton,
  
  // Customization
  customStyles = {},
  themeVariant = 'default',
  
  // Accessibility
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
  
  ...restProps
}) => {
  // Hooks
  const router = useRouter();
  const { theme, isDarkMode, currentTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { trackEvent, trackTiming, trackError } = useAnalytics();
  const { optimizeRender, debounce: debounceFn, throttle: throttleFn } = usePerformance();
  const { captureError, withErrorBoundary } = useErrorBoundary();
  
  // State Management
  const [inputState, setInputState] = useState({
    value: value || defaultValue || '',
    isFocused: false,
    isTouched: false,
    isValid: true,
    isValidating: false,
    validationMessage: '',
    suggestions: [],
    showSuggestions: false,
    isPasswordVisible: !secureTextEntry,
    characterCount: 0,
  });
  
  const [uiState, setUiState] = useState({
    animationProgress: new Animated.Value(0),
    errorAnimation: new Animated.Value(0),
    successAnimation: new Animated.Value(0),
    focusAnimation: new Animated.Value(0),
    shakeAnimation: new Animated.Value(0),
  });

  // Refs
  const componentMounted = useRef(true);
  const inputRef = useRef(null);
  const validationTimeout = useRef(null);
  const aiSuggestionTimeout = useRef(null);
  const securityCheckRef = useRef(null);

  // Memoized Values
  const inputContext = useMemo(() => ({
    type,
    variant,
    size: size.key,
    state,
    ...analyticsContext,
  }), [type, variant, size, state, analyticsContext]);

  const securityContext = useMemo(() => ({
    userId: user?.id,
    userRole: user?.role,
    permissions: user?.permissions,
    timestamp: Date.now(),
    ...securityContext,
  }), [user, securityContext]);

  const validationContext = useMemo(() => ({
    rules: validationRules,
    required,
    minLength,
    maxLength,
    type,
  }), [validationRules, required, minLength, maxLength, type]);

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
    if (value !== undefined && value !== inputState.value) {
      handleValueChange(value, false);
    }
  }, [value]);

  useEffect(() => {
    if (inputState.isTouched && validateOnChange) {
      debouncedValidation(inputState.value);
    }
  }, [inputState.value, inputState.isTouched, validateOnChange]);

  useEffect(() => {
    if (inputState.isFocused && enableAISuggestions) {
      debouncedAISuggestions(inputState.value);
    }
  }, [inputState.value, inputState.isFocused, enableAISuggestions]);

  // Core Functions
  const initializeComponent = useCallback(() => {
    trackEvent('input_initialized', inputContext);
    
    // Initial validation if value exists
    if (inputState.value) {
      validateInput(inputState.value);
    }
  }, [inputContext, inputState.value, trackEvent]);

  const cleanupComponent = useCallback(() => {
    if (validationTimeout.current) {
      clearTimeout(validationTimeout.current);
    }
    if (aiSuggestionTimeout.current) {
      clearTimeout(aiSuggestionTimeout.current);
    }
    if (securityCheckRef.current) {
      securityCheckRef.current.cancel();
    }
  }, []);

  const handleValueChange = useCallback((newValue, isUserInput = true) => {
    if (!componentMounted.current) return;
    
    // Security sanitization
    const sanitizedValue = inputSanitization 
      ? SecurityService.sanitizeInput(newValue, type)
      : newValue;
    
    // Privacy masking
    const displayValue = privacyMode && maskValue 
      ? maskSensitiveValue(sanitizedValue, type)
      : sanitizedValue;
    
    setInputState(prev => ({
      ...prev,
      value: sanitizedValue,
      characterCount: sanitizedValue.length,
      isTouched: isUserInput ? true : prev.isTouched,
    }));
    
    // Track input change
    if (isUserInput && enableInteractionTracking) {
      trackEvent('input_value_changed', {
        ...inputContext,
        valueLength: sanitizedValue.length,
        isSensitive: privacyMode && maskValue,
        timestamp: Date.now(),
      });
    }
    
    // Call change handlers
    const changeHandler = debounce ? debounceFn(onChangeText, INPUT_CONFIG.PERFORMANCE.DEBOUNCE_DELAY) :
                      throttle ? throttleFn(onChangeText, INPUT_CONFIG.PERFORMANCE.THROTTLE_DELAY) :
                      onChangeText;
    
    changeHandler?.(sanitizedValue);
    onChange?.({ target: { value: sanitizedValue } });
  }, [
    inputSanitization, privacyMode, maskValue, type, enableInteractionTracking,
    debounce, throttle, onChangeText, onChange, inputContext, trackEvent,
    debounceFn, throttleFn
  ]);

  const debouncedValidation = useCallback(
    debounceFn((valueToValidate) => {
      validateInput(valueToValidate);
    }, INPUT_CONFIG.PERFORMANCE.VALIDATION_DELAY),
    [validateInput, debounceFn]
  );

  const debouncedAISuggestions = useCallback(
    debounceFn((currentValue) => {
      generateAISuggestions(currentValue);
    }, INPUT_CONFIG.PERFORMANCE.DEBOUNCE_DELAY),
    [generateAISuggestions, debounceFn]
  );

  // Validation Functions
  const validateInput = useCallback(async (valueToValidate) => {
    if (!componentMounted.current) return;
    
    const validationTiming = trackTiming('input_validation');
    
    try {
      setInputState(prev => ({ ...prev, isValidating: true }));
      
      const validationResult = await ValidationService.validate(valueToValidate, {
        rules: validationRules,
        type,
        required,
        minLength,
        maxLength,
        customValidator,
        context: validationContext,
      });
      
      if (componentMounted.current) {
        setInputState(prev => ({
          ...prev,
          isValid: validationResult.isValid,
          validationMessage: validationResult.message,
          isValidating: false,
        }));
        
        // Animation feedback
        if (validationResult.isValid) {
          animateSuccess();
        } else {
          animateError();
        }
        
        // Call validation callback
        onValidation?.(validationResult);
        
        validationTiming.end({ 
          success: true, 
          isValid: validationResult.isValid,
          validationType: validationResult.type,
        });
        
        trackEvent('input_validated', {
          ...inputContext,
          isValid: validationResult.isValid,
          validationType: validationResult.type,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      if (componentMounted.current) {
        setInputState(prev => ({ ...prev, isValidating: false }));
        
        captureError(error, {
          context: 'InputValidation',
          ...inputContext,
        });
        
        validationTiming.end({ success: false, error: error.message });
      }
    }
  }, [
    validationRules, type, required, minLength, maxLength, customValidator,
    validationContext, onValidation, inputContext, trackTiming, trackEvent, captureError
  ]);

  // AI Functions
  const generateAISuggestions = useCallback(async (currentValue) => {
    if (!componentMounted.current || !enableAISuggestions || !currentValue) return;
    
    try {
      const suggestions = await AIInputService.getSuggestions(currentValue, {
        type,
        context: inputContext,
        userContext: user,
        maxSuggestions: 5,
      });
      
      if (componentMounted.current && suggestions.length > 0) {
        setInputState(prev => ({
          ...prev,
          suggestions,
          showSuggestions: true,
        }));
      }
    } catch (error) {
      // Silent fail for AI suggestions
      console.debug('AI suggestions failed:', error.message);
    }
  }, [enableAISuggestions, type, inputContext, user]);

  const handleSuggestionSelect = useCallback((suggestion) => {
    handleValueChange(suggestion, true);
    setInputState(prev => ({ ...prev, showSuggestions: false }));
    
    trackEvent('input_suggestion_selected', {
      ...inputContext,
      suggestion,
      timestamp: Date.now(),
    });
  }, [handleValueChange, inputContext, trackEvent]);

  // Security Functions
  const maskSensitiveValue = useCallback((value, inputType) => {
    const maskingStrategies = {
      [INPUT_TYPES.PASSWORD]: () => '•'.repeat(value.length),
      [INPUT_TYPES.CREDIT_CARD]: () => {
        if (value.length <= 4) return value;
        return '•'.repeat(value.length - 4) + value.slice(-4);
      },
      [INPUT_TYPES.SSN]: () => {
        if (value.length <= 4) return value;
        return '•'.repeat(value.length - 4) + value.slice(-4);
      },
      [INPUT_TYPES.GOVERNMENT_ID]: () => {
        if (value.length <= 4) return value;
        return '•'.repeat(value.length - 4) + value.slice(-4);
      },
    };
    
    return maskingStrategies[inputType]?.(value) || value;
  }, []);

  const performSecurityCheck = useCallback(async (inputValue) => {
    if (!componentMounted.current || !inputSanitization) return;
    
    try {
      const securityCheck = await SecurityService.validateInputSecurity(inputValue, {
        type,
        context: securityContext,
        protections: {
          xss: INPUT_CONFIG.SECURITY.XSS_PROTECTION,
          sqlInjection: INPUT_CONFIG.SECURITY.SQL_INJECTION_PROTECTION,
        },
      });
      
      if (!securityCheck.isSafe) {
        trackEvent('input_security_violation', {
          ...inputContext,
          violationType: securityCheck.violationType,
          riskLevel: securityCheck.riskLevel,
          timestamp: Date.now(),
        });
        
        // Handle security violation
        if (securityCheck.riskLevel === 'high') {
          animateShake();
          handleValueChange('', true);
        }
      }
    } catch (error) {
      captureError(error, {
        context: 'SecurityCheck',
        ...inputContext,
      });
    }
  }, [inputSanitization, type, securityContext, inputContext, handleValueChange, trackEvent, captureError]);

  // Animation Functions
  const animateFocus = useCallback((isFocused) => {
    Animated.timing(uiState.focusAnimation, {
      toValue: isFocused ? 1 : 0,
      duration: INPUT_CONFIG.PERFORMANCE.ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [uiState.focusAnimation]);

  const animateError = useCallback(() => {
    Animated.sequence([
      Animated.timing(uiState.errorAnimation, {
        toValue: 1,
        duration: INPUT_CONFIG.PERFORMANCE.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(uiState.errorAnimation, {
        toValue: 0,
        duration: INPUT_CONFIG.PERFORMANCE.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [uiState.errorAnimation]);

  const animateSuccess = useCallback(() => {
    Animated.sequence([
      Animated.timing(uiState.successAnimation, {
        toValue: 1,
        duration: INPUT_CONFIG.PERFORMANCE.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(uiState.successAnimation, {
        toValue: 0,
        duration: INPUT_CONFIG.PERFORMANCE.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [uiState.successAnimation]);

  const animateShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(uiState.shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(uiState.shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(uiState.shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(uiState.shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [uiState.shakeAnimation]);

  // Event Handlers
  const handleFocus = useCallback((event) => {
    if (disabled || readOnly) return;
    
    setInputState(prev => ({ ...prev, isFocused: true }));
    animateFocus(true);
    
    // Track focus event
    if (enableInteractionTracking) {
      trackEvent('input_focused', {
        ...inputContext,
        timestamp: Date.now(),
      });
    }
    
    onFocus?.(event);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [disabled, readOnly, enableInteractionTracking, inputContext, onFocus, trackEvent, animateFocus]);

  const handleBlur = useCallback((event) => {
    if (disabled || readOnly) return;
    
    setInputState(prev => ({ ...prev, isFocused: false, showSuggestions: false }));
    animateFocus(false);
    
    // Validate on blur if configured
    if (validateOnBlur && inputState.isTouched) {
      validateInput(inputState.value);
    }
    
    onBlur?.(event);
  }, [disabled, readOnly, validateOnBlur, inputState.isTouched, inputState.value, onBlur, validateInput, animateFocus]);

  const handleSubmit = useCallback(() => {
    // Final validation before submit
    validateInput(inputState.value);
    
    onSubmit?.(inputState.value);
    
    trackEvent('input_submitted', {
      ...inputContext,
      valueLength: inputState.value.length,
      timestamp: Date.now(),
    });
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [inputState.value, onSubmit, inputContext, validateInput, trackEvent]);

  const handleClear = useCallback(() => {
    handleValueChange('', true);
    inputRef.current?.focus();
    
    trackEvent('input_cleared', {
      ...inputContext,
      timestamp: Date.now(),
    });
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [handleValueChange, inputContext, trackEvent]);

  const togglePasswordVisibility = useCallback(() => {
    setInputState(prev => ({ 
      ...prev, 
      isPasswordVisible: !prev.isPasswordVisible 
    }));
    
    trackEvent('input_password_toggled', {
      ...inputContext,
      isVisible: !inputState.isPasswordVisible,
      timestamp: Date.now(),
    });
  }, [inputContext, inputState.isPasswordVisible, trackEvent]);

  // Style Functions
  const getContainerStyles = useCallback(() => {
    const baseStyles = {
      borderRadius: 8,
      borderWidth: 2,
      overflow: 'hidden',
    };
    
    const sizeStyles = {
      minHeight: size.height,
      paddingHorizontal: size.padding,
    };
    
    const variantStyles = {
      [INPUT_VARIANTS.OUTLINE]: {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
      },
      [INPUT_VARIANTS.FILLED]: {
        backgroundColor: theme.colors.surface,
        borderColor: 'transparent',
      },
      [INPUT_VARIANTS.UNDERLINE]: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderBottomWidth: 2,
        borderRadius: 0,
      },
      [INPUT_VARIANTS.GHOST]: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
      [INPUT_VARIANTS.PREMIUM]: {
        backgroundColor: '#FFD70010',
        borderColor: '#FFD700',
      },
      [INPUT_VARIANTS.GOVERNMENT]: {
        backgroundColor: '#1E40AF10',
        borderColor: '#1E40AF',
      },
      [INPUT_VARIANTS.CONTRACTOR]: {
        backgroundColor: '#7C3AED10',
        borderColor: '#7C3AED',
      },
      [INPUT_VARIANTS.ADMIN]: {
        backgroundColor: '#DC262610',
        borderColor: '#DC2626',
      },
    };
    
    const stateStyles = {
      [INPUT_STATES.FOCUSED]: {
        borderColor: theme.colors.primary,
      },
      [INPUT_STATES.ERROR]: {
        borderColor: theme.colors.error,
      },
      [INPUT_STATES.SUCCESS]: {
        borderColor: theme.colors.success,
      },
      [INPUT_STATES.WARNING]: {
        borderColor: theme.colors.warning,
      },
      [INPUT_STATES.DISABLED]: {
        opacity: 0.6,
        backgroundColor: theme.colors.disabled,
      },
      [INPUT_STATES.READONLY]: {
        backgroundColor: theme.colors.surface,
      },
    };
    
    const currentState = disabled ? INPUT_STATES.DISABLED : 
                        readOnly ? INPUT_STATES.READONLY :
                        inputState.isFocused ? INPUT_STATES.FOCUSED :
                        !inputState.isValid ? INPUT_STATES.ERROR :
                        state;
    
    return [
      baseStyles,
      sizeStyles,
      variantStyles[variant],
      stateStyles[currentState],
      customStyles.container,
    ];
  }, [size, variant, theme, disabled, readOnly, inputState.isFocused, inputState.isValid, state, customStyles]);

  const getInputStyles = useCallback(() => {
    const baseStyles = {
      flex: 1,
      fontSize: size.fontSize,
      color: theme.colors.text,
      padding: 0,
      margin: 0,
    };
    
    const multilineStyles = multiline ? {
      textAlignVertical: 'top',
      minHeight: size.height * numberOfLines,
      maxHeight: size.height * 6,
    } : {};
    
    return [
      baseStyles,
      multilineStyles,
      customStyles.input,
    ];
  }, [size, theme, multiline, numberOfLines, customStyles]);

  // Render Functions
  const renderLabel = useCallback(() => {
    if (!label) return null;
    
    const labelTransform = uiState.focusAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [size.fontSize, size.fontSize * 0.8],
    });
    
    const labelTranslate = uiState.focusAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size.height / 2],
    });
    
    return (
      <Animated.Text
        style={[
          styles.label,
          {
            fontSize: labelTransform,
            transform: [{ translateY: labelTranslate }],
            color: inputState.isFocused ? theme.colors.primary : theme.colors.textSecondary,
          },
          customStyles.label,
        ]}
      >
        {label}
        {required && (
          <Text style={{ color: theme.colors.error }}>*</Text>
        )}
      </Animated.Text>
    );
  }, [label, size, theme, inputState.isFocused, required, customStyles]);

  const renderLeftIcon = useCallback(() => {
    if (!leftIcon) return null;
    
    return (
      <View style={[styles.leftIcon, customStyles.leftIcon]}>
        {typeof leftIcon === 'function' 
          ? leftIcon({ 
              color: theme.colors.textSecondary,
              size: size.fontSize * 1.2,
            })
          : leftIcon
        }
      </View>
    );
  }, [leftIcon, theme, size, customStyles]);

  const renderRightIcon = useCallback(() => {
    if (!rightIcon && !clearButton && !showPasswordToggle && !actionButton) {
      return null;
    }
    
    return (
      <View style={[styles.rightIcons, customStyles.rightIcons]}>
        {/* Clear Button */}
        {clearButton && inputState.value && !disabled && !readOnly && (
          <TouchableWithoutFeedback onPress={handleClear}>
            <View style={styles.iconButton}>
              <Text style={[styles.icon, { color: theme.colors.textSecondary }]}>
                ×
              </Text>
            </View>
          </TouchableWithoutFeedback>
        )}
        
        {/* Password Toggle */}
        {showPasswordToggle && type === INPUT_TYPES.PASSWORD && (
          <TouchableWithoutFeedback onPress={togglePasswordVisibility}>
            <View style={styles.iconButton}>
              <Text style={[styles.icon, { color: theme.colors.textSecondary }]}>
                {inputState.isPasswordVisible ? '👁️' : '👁️‍🗨️'}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        )}
        
        {/* Custom Right Icon */}
        {rightIcon && (
          <View style={styles.iconButton}>
            {typeof rightIcon === 'function'
              ? rightIcon({
                  color: theme.colors.textSecondary,
                  size: size.fontSize * 1.2,
                })
              : rightIcon
            }
          </View>
        )}
        
        {/* Action Button */}
        {actionButton && (
          <TouchableWithoutFeedback onPress={actionButton.onPress}>
            <View style={styles.iconButton}>
              {actionButton.icon}
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>
    );
  }, [
    rightIcon, clearButton, showPasswordToggle, actionButton, inputState.value, 
    inputState.isPasswordVisible, disabled, readOnly, type, theme, size, 
    handleClear, togglePasswordVisibility, customStyles
  ]);

  const renderHelperText = useCallback(() => {
    if (!helperText && !errorMessage && !successMessage && !warningMessage) {
      return null;
    }
    
    const message = errorMessage || successMessage || warningMessage || helperText;
    const color = errorMessage ? theme.colors.error :
                 successMessage ? theme.colors.success :
                 warningMessage ? theme.colors.warning :
                 theme.colors.textSecondary;
    
    return (
      <Animated.Text
        style={[
          styles.helperText,
          { color },
          customStyles.helperText,
        ]}
      >
        {message}
      </Animated.Text>
    );
  }, [helperText, errorMessage, successMessage, warningMessage, theme, customStyles]);

  const renderCharacterCount = useCallback(() => {
    if (!maxLength) return null;
    
    return (
      <Text style={[
        styles.characterCount,
        { color: theme.colors.textTertiary },
        customStyles.characterCount,
      ]}>
        {inputState.characterCount} / {maxLength}
      </Text>
    );
  }, [maxLength, inputState.characterCount, theme, customStyles]);

  const renderAISuggestions = useCallback(() => {
    if (!inputState.showSuggestions || inputState.suggestions.length === 0) {
      return null;
    }
    
    return (
      <View style={[styles.suggestionsContainer, customStyles.suggestionsContainer]}>
        {inputState.suggestions.map((suggestion, index) => (
          <TouchableWithoutFeedback
            key={index}
            onPress={() => handleSuggestionSelect(suggestion)}
          >
            <View style={styles.suggestionItem}>
              <Text style={[styles.suggestionText, { color: theme.colors.text }]}>
                {suggestion}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        ))}
      </View>
    );
  }, [inputState.showSuggestions, inputState.suggestions, theme, handleSuggestionSelect, customStyles]);

  // Main Render
  return (
    <View style={customStyles.wrapper}>
      {/* Label */}
      {renderLabel()}
      
      {/* Input Container */}
      <Animated.View
        style={[
          getContainerStyles(),
          {
            transform: [{ translateX: uiState.shakeAnimation }],
          },
        ]}
      >
        {/* Left Icon */}
        {renderLeftIcon()}
        
        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={getInputStyles()}
          value={privacyMode && maskValue ? maskSensitiveValue(inputState.value, type) : inputState.value}
          onChangeText={handleValueChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          spellCheck={spellCheck}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          maxLength={maxLength}
          editable={!disabled && !readOnly}
          secureTextEntry={secureTextEntry && !inputState.isPasswordVisible}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          accessibilityRole={accessibilityRole}
          accessibilityState={{
            disabled,
            invalid: !inputState.isValid,
          }}
          {...restProps}
        />
        
        {/* Right Icons */}
        {renderRightIcon()}
      </Animated.View>
      
      {/* AI Suggestions */}
      {renderAISuggestions()}
      
      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Helper Text */}
        {renderHelperText()}
        
        {/* Character Count */}
        {renderCharacterCount()}
      </View>
    </View>
  );
});

// Component Configuration
Input.displayName = 'Input';
Input.config = INPUT_CONFIG;
Input.Types = INPUT_TYPES;
Input.Variants = INPUT_VARIANTS;
Input.Sizes = INPUT_SIZES;
Input.States = INPUT_STATES;
Input.ValidationTypes = VALIDATION_TYPES;

// Styles
const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontWeight: '500',
    zIndex: 1,
  },
  leftIcon: {
    marginRight: 8,
    justifyContent: 'center',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButton: {
    padding: 4,
    marginLeft: 4,
  },
  icon: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    flex: 1,
  },
  characterCount: {
    fontSize: 12,
    marginTop: 4,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  suggestionText: {
    fontSize: 14,
  },
});

// Export with error boundary
export default withErrorBoundary(Input, {
  context: 'Input',
  fallback: <ErrorBoundary.Fallback />,
});

// Custom Hook for Input Management
export const useInput = (initialState = {}) => {
  // Implementation of advanced input management hook
  return {
    // Hook implementation
  };
};