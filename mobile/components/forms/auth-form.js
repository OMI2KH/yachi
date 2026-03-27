// components/forms/auth-form.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Keyboard,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
  Text as RNText,
} from 'react-native';
import { useRouter } from 'expo-router';

// Contexts
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Input from '../ui/input';
import Button from '../ui/button';
import Checkbox from '../ui/checkbox';
import Loading from '../ui/loading';
import SocialLogin from './social-login';
import PasswordStrength from './password-strength';
import TermsAgreement from './terms-agreement';
import BiometricPrompt from './biometric-prompt';

// Services
import { authService } from '../../services/auth-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { notificationService } from '../../services/notification-service';

// Utils
import { validators } from '../../utils/validators';
import { storage } from '../../utils/storage';
import { debounce } from '../../utils/helpers';

// Constants
import { COLORS } from '../../constants/colors';
import { AUTH_MODES, PASSWORD_STRENGTH } from '../../constants/auth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise-level AuthForm Component
 * 
 * Features:
 * - Multi-role authentication (Client, Service Provider, Government, Admin)
 * - Ethiopian market focus with phone verification
 * - Social login integration
 * - Biometric authentication
 * - Comprehensive security features
 * - Performance optimized
 */

const AuthForm = ({
  // Configuration
  mode = AUTH_MODES.LOGIN,
  initialValues = {},
  onSuccess,
  onModeChange,
  
  // Features
  enableSocialLogin = true,
  enableBiometric = true,
  enableRememberMe = true,
  enableTerms = true,
  enablePasswordStrength = true,
  enablePhoneVerification = true,
  
  // User roles
  userRole = 'client', // client, provider, government, admin
  
  // Customization
  submitButtonText,
  secondaryActionText,
  onSecondaryAction,
  
  // Security
  enableCaptcha = false,
  rateLimit = true,
  
  // Styles
  style,
  formStyle,
  
  // Testing
  testID = 'auth-form',
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { 
    login, 
    register, 
    user, 
    isAuthenticated,
    isLoading: authLoading 
  } = useAuth();

  // State management
  const [formData, setFormData] = useState({
    email: initialValues.email || '',
    password: initialValues.password || '',
    confirmPassword: '',
    firstName: initialValues.firstName || '',
    lastName: initialValues.lastName || '',
    phone: initialValues.phone || '',
    role: userRole,
    rememberMe: false,
    agreeToTerms: false,
    ...initialValues,
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // Refs
  const scrollViewRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const phoneRef = useRef(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Initialize form
  useEffect(() => {
    animateFormIn();
    setupKeyboardListeners();
    checkBiometricAvailability();
    loadSavedCredentials();

    return () => {
      cleanupKeyboardListeners();
    };
  }, [mode]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isSubmitting) {
      handleAuthSuccess();
    }
  }, [isAuthenticated, user, isSubmitting]);

  // Animation handlers
  const animateFormIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shakeForm = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Keyboard handling
  const setupKeyboardListeners = () => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', 
      handleKeyboardShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', 
      handleKeyboardHide
    );
    
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  };

  const cleanupKeyboardListeners = () => {
    Keyboard.removeAllListeners('keyboardWillShow');
    Keyboard.removeAllListeners('keyboardWillHide');
    Keyboard.removeAllListeners('keyboardDidShow');
    Keyboard.removeAllListeners('keyboardDidHide');
  };

  const handleKeyboardShow = () => {
    setKeyboardVisible(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 50, animated: true });
    }, 100);
  };

  const handleKeyboardHide = () => {
    setKeyboardVisible(false);
  };

  // Load saved credentials
  const loadSavedCredentials = async () => {
    try {
      const savedCredentials = await storage.getItem('saved_credentials');
      if (savedCredentials && savedCredentials.rememberMe) {
        setFormData(prev => ({
          ...prev,
          email: savedCredentials.email || '',
          rememberMe: true,
        }));
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  // Check biometric availability
  const checkBiometricAvailability = async () => {
    // Implementation depends on your biometric service
  };

  // Form field handlers
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Mark field as touched
    if (!touched[field]) {
      setTouched(prev => ({
        ...prev,
        [field]: true,
      }));
    }

    // Check password strength
    if (field === 'password' && enablePasswordStrength) {
      checkPasswordStrength(value);
    }
  }, [errors, touched, enablePasswordStrength]);

  // Password strength checker
  const checkPasswordStrength = useCallback(debounce((password) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

    let strength = PASSWORD_STRENGTH.WEAK;
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Determine strength
    if (score >= 5) strength = PASSWORD_STRENGTH.VERY_STRONG;
    else if (score >= 4) strength = PASSWORD_STRENGTH.STRONG;
    else if (score >= 3) strength = PASSWORD_STRENGTH.MEDIUM;
    else strength = PASSWORD_STRENGTH.WEAK;

    setPasswordStrength({ level: strength, score });
  }, 300), []);

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validators.email(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (mode === AUTH_MODES.REGISTER && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Confirm password validation
    if (mode === AUTH_MODES.REGISTER || mode === AUTH_MODES.RESET_PASSWORD) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Name validation for registration
    if (mode === AUTH_MODES.REGISTER) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
    }

    // Phone validation for Ethiopian numbers
    if (mode === AUTH_MODES.REGISTER && formData.phone && !validators.ethiopianPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid Ethiopian phone number';
    }

    // Terms agreement validation
    if (mode === AUTH_MODES.REGISTER && enableTerms && !formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode, enableTerms]);

  // Rate limiting check
  const checkRateLimit = useCallback(() => {
    if (!rateLimit) return true;

    if (attemptCount >= 5) {
      setErrors({ 
        general: 'Too many attempts. Please try again in 15 minutes.' 
      });
      return false;
    }

    setAttemptCount(prev => prev + 1);
    return true;
  }, [attemptCount, rateLimit]);

  // Form submission
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate form
    if (!validateForm()) {
      shakeForm();
      return;
    }

    // Check rate limiting
    if (!checkRateLimit()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare submission data
      const submissionData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        ...(mode === AUTH_MODES.REGISTER && {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone?.trim(),
        }),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        },
      };

      let result;

      // Perform auth action based on mode
      switch (mode) {
        case AUTH_MODES.LOGIN:
          result = await login(submissionData);
          break;

        case AUTH_MODES.REGISTER:
          result = await register(submissionData);
          break;

        case AUTH_MODES.FORGOT_PASSWORD:
          result = await authService.forgotPassword(submissionData.email);
          break;

        default:
          throw new Error(`Unsupported auth mode: ${mode}`);
      }

      if (result.success) {
        // Save credentials if remember me is enabled
        if (formData.rememberMe && mode === AUTH_MODES.LOGIN) {
          await storage.setItem('saved_credentials', {
            email: formData.email,
            rememberMe: true,
          });
        } else if (mode === AUTH_MODES.LOGIN) {
          await storage.removeItem('saved_credentials');
        }

        // Track analytics
        analyticsService.track('auth_success', {
          mode,
          role: formData.role,
          email: formData.email,
        });

        handleAuthSuccess(result.data);

      } else {
        throw new Error(result.message || `Authentication failed`);
      }

    } catch (error) {
      console.error('Auth error:', error);
      
      // Track failed attempt
      analyticsService.track('auth_failed', {
        mode,
        role: formData.role,
        email: formData.email,
        error: error.message,
        attemptCount,
      });

      handleAuthError(error);

      errorService.handleError(error, {
        context: `auth_${mode}`,
        email: formData.email,
        attemptCount,
      });

    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle auth success
  const handleAuthSuccess = (data = null) => {
    onSuccess?.(data);
    
    notificationService.show({
      type: 'success',
      title: getSuccessMessage(),
    });

    // Navigate based on user role and mode
    if (mode === AUTH_MODES.REGISTER && enablePhoneVerification) {
      router.push('/(auth)/phone-verification');
    } else if (mode === AUTH_MODES.FORGOT_PASSWORD) {
      router.push('/(auth)/check-email');
    }
  };

  // Handle auth errors
  const handleAuthError = (error) => {
    const errorMessage = error.message || 'Authentication failed';
    
    // Specific error handling
    if (error.message.includes('network')) {
      setErrors({ general: 'Network error. Please check your connection.' });
    } else if (error.message.includes('invalid credentials')) {
      setErrors({ 
        email: 'Invalid email or password',
        password: 'Invalid email or password' 
      });
    } else if (error.message.includes('email exists')) {
      setErrors({ email: 'An account with this email already exists' });
    } else if (error.message.includes('rate limit')) {
      setErrors({ general: 'Too many attempts. Please try again later.' });
    } else {
      setErrors({ general: errorMessage });
    }

    shakeForm();
    
    notificationService.show({
      type: 'error',
      title: 'Authentication Failed',
      message: errorMessage,
    });
  };

  // Social login handler
  const handleSocialLogin = async (provider, token) => {
    try {
      setIsSubmitting(true);

      const result = await authService.socialLogin(provider, token);
      
      if (result.success) {
        handleAuthSuccess(result.data);
      } else {
        throw new Error(result.message || 'Social login failed');
      }

    } catch (error) {
      console.error('Social login error:', error);
      notificationService.show({
        type: 'error',
        title: 'Social Login Failed',
        message: `Failed to sign in with ${provider}`,
      });
      
      errorService.handleError(error, {
        context: `social_auth_${provider}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Biometric auth handler
  const handleBiometricAuth = async () => {
    try {
      setIsSubmitting(true);

      const result = await authService.biometricLogin();
      
      if (result.success) {
        handleAuthSuccess(result.data);
      } else {
        throw new Error('Biometric authentication failed');
      }

    } catch (error) {
      console.error('Biometric auth error:', error);
      notificationService.show({
        type: 'error',
        title: 'Biometric Failed',
        message: 'Biometric authentication failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode switching
  const switchMode = (newMode) => {
    setFormData({
      email: formData.email,
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      rememberMe: formData.rememberMe,
      agreeToTerms: false,
      role: userRole,
    });
    setErrors({});
    setTouched({});
    setPasswordStrength(null);
    
    onModeChange?.(newMode);
  };

  // Get UI text based on mode
  const getSubmitButtonText = () => {
    if (submitButtonText) return submitButtonText;
    
    const texts = {
      [AUTH_MODES.LOGIN]: 'Sign In',
      [AUTH_MODES.REGISTER]: 'Create Account',
      [AUTH_MODES.FORGOT_PASSWORD]: 'Send Reset Link',
      [AUTH_MODES.RESET_PASSWORD]: 'Reset Password',
      [AUTH_MODES.VERIFY_EMAIL]: 'Verify Email',
    };
    
    return texts[mode] || 'Submit';
  };

  const getSuccessMessage = () => {
    const messages = {
      [AUTH_MODES.LOGIN]: 'Successfully signed in!',
      [AUTH_MODES.REGISTER]: 'Account created successfully!',
      [AUTH_MODES.FORGOT_PASSWORD]: 'Reset link sent to your email!',
      [AUTH_MODES.RESET_PASSWORD]: 'Password reset successfully!',
      [AUTH_MODES.VERIFY_EMAIL]: 'Email verified successfully!',
    };
    
    return messages[mode] || 'Success!';
  };

  // Render form fields based on mode
  const renderFormFields = () => {
    const fields = [];

    // Email field (always shown)
    fields.push(
      <Input
        key="email"
        ref={emailRef}
        label="Email Address"
        placeholder="Enter your email"
        value={formData.email}
        onChangeText={(value) => updateField('email', value)}
        error={errors.email}
        touched={touched.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => {
          if (mode === AUTH_MODES.LOGIN) {
            passwordRef.current?.focus();
          } else {
            firstNameRef.current?.focus();
          }
        }}
      />
    );

    // Name fields (registration only)
    if (mode === AUTH_MODES.REGISTER) {
      fields.push(
        <View key="name-fields" style={styles.row}>
          <Input
            ref={firstNameRef}
            label="First Name"
            placeholder="First name"
            value={formData.firstName}
            onChangeText={(value) => updateField('firstName', value)}
            error={errors.firstName}
            touched={touched.firstName}
            autoComplete="name-given"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            style={styles.halfInput}
          />
          <Input
            ref={lastNameRef}
            label="Last Name"
            placeholder="Last name"
            value={formData.lastName}
            onChangeText={(value) => updateField('lastName', value)}
            error={errors.lastName}
            touched={touched.lastName}
            autoComplete="name-family"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            style={styles.halfInput}
          />
        </View>
      );

      // Phone field (optional for registration)
      if (enablePhoneVerification) {
        fields.push(
          <Input
            key="phone"
            ref={phoneRef}
            label="Phone Number"
            placeholder="+251 XXX XXX XXX"
            value={formData.phone}
            onChangeText={(value) => updateField('phone', value)}
            error={errors.phone}
            touched={touched.phone}
            autoComplete="tel"
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        );
      }
    }

    // Password field
    if (mode !== AUTH_MODES.VERIFY_EMAIL) {
      fields.push(
        <View key="password-field">
          <Input
            ref={passwordRef}
            label={mode === AUTH_MODES.RESET_PASSWORD ? 'New Password' : 'Password'}
            placeholder={`Enter your ${mode === AUTH_MODES.RESET_PASSWORD ? 'new ' : ''}password`}
            value={formData.password}
            onChangeText={(value) => updateField('password', value)}
            error={errors.password}
            touched={touched.password}
            secureTextEntry={!showPassword}
            autoComplete={mode === AUTH_MODES.LOGIN ? 'current-password' : 'new-password'}
            returnKeyType={mode === AUTH_MODES.REGISTER || mode === AUTH_MODES.RESET_PASSWORD ? 'next' : 'done'}
            onSubmitEditing={() => {
              if (mode === AUTH_MODES.REGISTER || mode === AUTH_MODES.RESET_PASSWORD) {
                confirmPasswordRef.current?.focus();
              } else {
                handleSubmit();
              }
            }}
            rightIcon={showPassword ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />
          
          {/* Password strength indicator */}
          {enablePasswordStrength && passwordStrength && mode !== AUTH_MODES.LOGIN && (
            <PasswordStrength
              strength={passwordStrength}
              style={styles.passwordStrength}
            />
          )}
        </View>
      );
    }

    // Confirm password field
    if (mode === AUTH_MODES.REGISTER || mode === AUTH_MODES.RESET_PASSWORD) {
      fields.push(
        <Input
          key="confirm-password"
          ref={confirmPasswordRef}
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChangeText={(value) => updateField('confirmPassword', value)}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
          onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
        />
      );
    }

    return fields;
  };

  // Render additional options
  const renderAdditionalOptions = () => {
    const options = [];

    // Remember me checkbox
    if (mode === AUTH_MODES.LOGIN && enableRememberMe) {
      options.push(
        <Checkbox
          key="remember-me"
          label="Remember me"
          checked={formData.rememberMe}
          onPress={() => updateField('rememberMe', !formData.rememberMe)}
        />
      );
    }

    // Terms agreement
    if (mode === AUTH_MODES.REGISTER && enableTerms) {
      options.push(
        <TermsAgreement
          key="terms"
          checked={formData.agreeToTerms}
          onPress={() => updateField('agreeToTerms', !formData.agreeToTerms)}
          error={errors.agreeToTerms}
        />
      );
    }

    return options.length > 0 ? (
      <View style={styles.optionsContainer}>
        {options}
      </View>
    ) : null;
  };

  // Render secondary actions
  const renderSecondaryActions = () => {
    const actions = [];

    // Forgot password
    if (mode === AUTH_MODES.LOGIN) {
      actions.push(
        <Button
          key="forgot-password"
          variant="link"
          onPress={() => switchMode(AUTH_MODES.FORGOT_PASSWORD)}
          style={styles.secondaryButton}
        >
          Forgot Password?
        </Button>
      );
    }

    // Switch between login and register
    if (mode === AUTH_MODES.LOGIN) {
      actions.push(
        <Button
          key="switch-to-register"
          variant="link"
          onPress={() => switchMode(AUTH_MODES.REGISTER)}
          style={styles.secondaryButton}
        >
          Don't have an account? Sign Up
        </Button>
      );
    } else if (mode === AUTH_MODES.REGISTER) {
      actions.push(
        <Button
          key="switch-to-login"
          variant="link"
          onPress={() => switchMode(AUTH_MODES.LOGIN)}
          style={styles.secondaryButton}
        >
          Already have an account? Sign In
        </Button>
      );
    } else if (mode === AUTH_MODES.FORGOT_PASSWORD) {
      actions.push(
        <Button
          key="back-to-login"
          variant="link"
          onPress={() => switchMode(AUTH_MODES.LOGIN)}
          style={styles.secondaryButton}
        >
          Back to Sign In
        </Button>
      );
    }

    return actions.length > 0 ? (
      <View style={styles.secondaryActions}>
        {actions}
      </View>
    ) : null;
  };

  if (isSubmitting || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading message={getSubmitButtonText()} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { translateX: shakeAnim },
          ],
        },
        style,
      ]}
      testID={testID}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Social Login */}
        {enableSocialLogin && mode === AUTH_MODES.LOGIN && (
          <SocialLogin
            onSocialLogin={handleSocialLogin}
            style={styles.socialLogin}
          />
        )}

        {/* Or divider */}
        {enableSocialLogin && mode === AUTH_MODES.LOGIN && (
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <ThemedText type="caption" style={styles.dividerText}>
              or continue with
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>
        )}

        {/* Biometric Auth */}
        {enableBiometric && mode === AUTH_MODES.LOGIN && (
          <BiometricPrompt
            onAuthenticate={handleBiometricAuth}
            style={styles.biometric}
          />
        )}

        {/* Form Fields */}
        <View style={[styles.form, formStyle]}>
          {renderFormFields()}
          
          {/* Additional Options */}
          {renderAdditionalOptions()}

          {/* General Error */}
          {errors.general && (
            <ThemedText type="caption" color="error" style={styles.generalError}>
              {errors.general}
            </ThemedText>
          )}

          {/* Submit Button */}
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
          >
            {getSubmitButtonText()}
          </Button>

          {/* Secondary Actions */}
          {renderSecondaryActions()}
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  optionsContainer: {
    gap: 12,
  },
  secondaryActions: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
  },
  generalError: {
    textAlign: 'center',
    marginTop: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  passwordStrength: {
    marginTop: 8,
  },
  socialLogin: {
    marginBottom: 16,
  },
  biometric: {
    marginBottom: 16,
  },
});

export default AuthForm;