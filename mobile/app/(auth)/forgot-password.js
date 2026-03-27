import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useLoading } from '../../contexts/loading-context';
import { 
  Button, 
  ButtonVariant, 
  PrimaryButton,
  OutlineButton 
} from '../../components/ui/button';
import Input from '../../components/ui/input';
import Loading from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { validateEmail, validatePhone } from '../../utils/validators';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { authService } from '../../services/auth-service';

// Reset steps with Ethiopian market considerations
const ResetStep = {
  ENTER_EMAIL_OR_PHONE: 0,
  VERIFY_CODE: 1,
  SET_PASSWORD: 2,
  SUCCESS: 3,
};

// Reset methods for Ethiopian users
const ResetMethod = {
  EMAIL: 'email',
  PHONE: 'phone',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();

  // State management with Ethiopian market support
  const [currentStep, setCurrentStep] = useState(ResetStep.ENTER_EMAIL_OR_PHONE);
  const [resetMethod, setResetMethod] = useState(ResetMethod.EMAIL);
  const [formData, setFormData] = useState({
    email: params.email || '',
    phone: params.phone || '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeExpiry, setCodeExpiry] = useState(null);
  const [userRole, setUserRole] = useState(params.role || 'client'); // Multi-role support

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Code expiry timer
  useEffect(() => {
    let timer;
    if (codeExpiry && currentStep === ResetStep.VERIFY_CODE) {
      timer = setInterval(() => {
        const now = new Date();
        if (now >= codeExpiry) {
          setCodeExpiry(null);
          Alert.alert(
            'Code Expired',
            'የማረጋገጫ ኮድ ጊዜው አልፎበታል። እባክዎ አዲስ ኮድ ይጠይቁ።', // Amharic
            [{ text: 'OK' }]
          );
          setCurrentStep(ResetStep.ENTER_EMAIL_OR_PHONE);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [codeExpiry, currentStep]);

  // Progress animation
  const animateProgress = (step) => {
    const progress = (step + 1) / Object.keys(ResetStep).length;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  // Step transition animation
  const animateStepTransition = (newStep, direction = 'forward') => {
    const toValue = direction === 'forward' ? -300 : 300;
    
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: toValue,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setCurrentStep(newStep);
      animateProgress(newStep);
    }, 125);
  };

  // Success animation
  const animateSuccess = () => {
    Animated.spring(successAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.elastic(1.2),
      useNativeDriver: true,
    }).start();
  };

  // Validation functions for Ethiopian market
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case ResetStep.ENTER_EMAIL_OR_PHONE:
        if (resetMethod === ResetMethod.EMAIL) {
          if (!formData.email?.trim()) {
            newErrors.email = 'Email is required';
          } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
          }
        } else {
          if (!formData.phone?.trim()) {
            newErrors.phone = 'Phone number is required';
          } else if (!validatePhone(formData.phone)) {
            newErrors.phone = 'Please enter a valid Ethiopian phone number';
          }
        }
        break;

      case ResetStep.VERIFY_CODE:
        if (!formData.verificationCode?.trim()) {
          newErrors.verificationCode = 'Verification code is required';
        } else if (formData.verificationCode.trim().length !== 6) {
          newErrors.verificationCode = 'Code must be 6 digits';
        }
        break;

      case ResetStep.SET_PASSWORD:
        if (!formData.newPassword) {
          newErrors.newPassword = 'New password is required';
        } else if (formData.newPassword.length < 8) {
          newErrors.newPassword = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
          newErrors.newPassword = 'Include uppercase, lowercase, and numbers';
        }

        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.newPassword !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Field change handler
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle reset method change (Email vs Phone)
  const handleResetMethodChange = (method) => {
    setResetMethod(method);
    setErrors({});
    // Clear the other field when switching methods
    if (method === ResetMethod.EMAIL) {
      setFormData(prev => ({ ...prev, phone: '' }));
    } else {
      setFormData(prev => ({ ...prev, email: '' }));
    }
  };

  // Handle code input (auto-verify)
  const handleCodeChange = (code) => {
    handleFieldChange('verificationCode', code);
    
    // Auto-submit when 6 digits are entered
    if (code.length === 6) {
      setTimeout(() => {
        handleVerifyCode();
      }, 500);
    }
  };

  // Request password reset code with Ethiopian market support
  const handleRequestResetCode = async () => {
    if (!validateStep(ResetStep.ENTER_EMAIL_OR_PHONE)) {
      setTouched(prev => ({ 
        ...prev, 
        [resetMethod === ResetMethod.EMAIL ? 'email' : 'phone']: true 
      }));
      return;
    }

    try {
      showLoading('Sending verification code...');

      const identifier = resetMethod === ResetMethod.EMAIL 
        ? formData.email.trim() 
        : formData.phone.trim();

      const result = await authService.requestPasswordReset({
        identifier,
        method: resetMethod,
        userRole: userRole,
        locale: 'et-ET', // Ethiopian locale for SMS/email templates
      });

      if (result.success) {
        // Track successful code request
        analyticsService.trackEvent('password_reset_code_requested', {
          method: resetMethod,
          user_role: userRole,
          identifier: identifier,
        });

        // Set cooldown (60 seconds)
        setResendCooldown(60);

        // Set code expiry (10 minutes)
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + 10);
        setCodeExpiry(expiryTime);

        // Move to verification step
        animateStepTransition(ResetStep.VERIFY_CODE, 'forward');

        const successMessage = resetMethod === ResetMethod.EMAIL
          ? `We've sent a 6-digit verification code to ${formData.email}. The code will expire in 10 minutes.`
          : `We've sent an SMS with a 6-digit verification code to ${formData.phone}. The code will expire in 10 minutes.`;

        Alert.alert('Code Sent', successMessage, [{ text: 'OK' }]);

      } else {
        handleRequestError(result.error);
      }

    } catch (error) {
      console.error('Password reset request error:', error);
      errorService.captureError(error, { 
        context: 'PasswordResetRequest',
        method: resetMethod,
        user_role: userRole,
      });
      
      Alert.alert(
        'Request Failed',
        'Unable to send verification code. Please check your information and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      hideLoading();
    }
  };

  // Handle request errors for Ethiopian market
  const handleRequestError = (error) => {
    let errorMessage = 'Unable to send verification code. Please try again.';
    let fieldError = null;

    const identifierField = resetMethod === ResetMethod.EMAIL ? 'email' : 'phone';

    if (error.includes('user not found') || error.includes('not registered')) {
      errorMessage = resetMethod === ResetMethod.EMAIL
        ? 'No account found with this email address.'
        : 'No account found with this phone number.';
      fieldError = { [identifierField]: errorMessage };
    } else if (error.includes('too many attempts')) {
      errorMessage = 'Too many attempts. Please try again in 15 minutes.';
    } else if (error.includes('account locked')) {
      errorMessage = 'Account temporarily locked. Please try again later or contact support.';
    } else if (error.includes('sms failed') && resetMethod === ResetMethod.PHONE) {
      errorMessage = 'SMS delivery failed. Please check your phone number or try email instead.';
      fieldError = { phone: errorMessage };
    }

    setErrors(prev => ({ ...prev, ...fieldError }));
    
    Alert.alert('Request Failed', errorMessage, [{ text: 'OK' }]);
  };

  // Verify the reset code
  const handleVerifyCode = async () => {
    if (!validateStep(ResetStep.VERIFY_CODE)) {
      setTouched(prev => ({ ...prev, verificationCode: true }));
      return;
    }

    try {
      showLoading('Verifying code...');

      const identifier = resetMethod === ResetMethod.EMAIL 
        ? formData.email.trim() 
        : formData.phone.trim();

      const result = await authService.verifyResetCode({
        identifier,
        code: formData.verificationCode.trim(),
        method: resetMethod,
      });

      if (result.success) {
        // Track successful code verification
        analyticsService.trackEvent('password_reset_code_verified', {
          method: resetMethod,
          user_role: userRole,
        });

        // Move to set password step
        animateStepTransition(ResetStep.SET_PASSWORD, 'forward');

      } else {
        handleVerificationError(result.error);
      }

    } catch (error) {
      console.error('Code verification error:', error);
      errorService.captureError(error, { context: 'CodeVerification' });
      
      Alert.alert(
        'Verification Failed',
        'Invalid or expired verification code. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      hideLoading();
    }
  };

  // Handle verification errors
  const handleVerificationError = (error) => {
    let errorMessage = 'Invalid verification code. Please try again.';
    
    if (error.includes('expired')) {
      errorMessage = 'Verification code has expired. Please request a new one.';
      setCurrentStep(ResetStep.ENTER_EMAIL_OR_PHONE);
    } else if (error.includes('invalid')) {
      errorMessage = 'Invalid verification code. Please check the code and try again.';
    } else if (error.includes('too many attempts')) {
      errorMessage = 'Too many failed attempts. Please request a new code.';
      setCurrentStep(ResetStep.ENTER_EMAIL_OR_PHONE);
    }

    setErrors(prev => ({ ...prev, verificationCode: errorMessage }));
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    try {
      showLoading('Sending new code...');

      const identifier = resetMethod === ResetMethod.EMAIL 
        ? formData.email.trim() 
        : formData.phone.trim();

      const result = await authService.requestPasswordReset({
        identifier,
        method: resetMethod,
        userRole: userRole,
        isResend: true,
      });

      if (result.success) {
        // Reset cooldown
        setResendCooldown(60);

        // Reset code expiry
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + 10);
        setCodeExpiry(expiryTime);

        // Clear previous code
        handleFieldChange('verificationCode', '');

        Alert.alert(
          'New Code Sent',
          'A new verification code has been sent.',
          [{ text: 'OK' }]
        );

        analyticsService.trackEvent('password_reset_code_resent', {
          method: resetMethod,
          user_role: userRole,
        });

      } else {
        Alert.alert('Request Failed', 'Unable to send new code. Please try again.', [{ text: 'OK' }]);
      }

    } catch (error) {
      console.error('Resend code error:', error);
      errorService.captureError(error, { context: 'ResendCode' });
      
      Alert.alert('Request Failed', 'Unable to send new code. Please try again.', [{ text: 'OK' }]);
    } finally {
      hideLoading();
    }
  };

  // Set new password
  const handleSetNewPassword = async () => {
    if (!validateStep(ResetStep.SET_PASSWORD)) {
      setTouched(prev => ({ 
        ...prev, 
        newPassword: true, 
        confirmPassword: true 
      }));
      return;
    }

    try {
      showLoading('Setting new password...');

      const identifier = resetMethod === ResetMethod.EMAIL 
        ? formData.email.trim() 
        : formData.phone.trim();

      const result = await authService.resetPassword({
        identifier,
        code: formData.verificationCode.trim(),
        newPassword: formData.newPassword,
        method: resetMethod,
        userRole: userRole,
      });

      if (result.success) {
        // Track successful password reset
        analyticsService.trackEvent('password_reset_completed', {
          method: resetMethod,
          user_role: userRole,
        });

        // Show success animation and move to success step
        animateSuccess();
        setCurrentStep(ResetStep.SUCCESS);
        animateProgress(ResetStep.SUCCESS);

      } else {
        handlePasswordError(result.error);
      }

    } catch (error) {
      console.error('Password reset error:', error);
      errorService.captureError(error, { context: 'PasswordReset' });
      
      Alert.alert(
        'Reset Failed',
        'Unable to set new password. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      hideLoading();
    }
  };

  // Handle password errors
  const handlePasswordError = (error) => {
    let errorMessage = 'Unable to set new password. Please try again.';
    let fieldError = null;

    if (error.includes('weak password')) {
      errorMessage = 'Please choose a stronger password with uppercase, lowercase letters and numbers.';
      fieldError = { newPassword: errorMessage };
    } else if (error.includes('code expired')) {
      errorMessage = 'Verification code has expired. Please start over.';
      setCurrentStep(ResetStep.ENTER_EMAIL_OR_PHONE);
    } else if (error.includes('invalid code')) {
      errorMessage = 'Invalid verification code. Please start over.';
      setCurrentStep(ResetStep.ENTER_EMAIL_OR_PHONE);
    }

    setErrors(prev => ({ ...prev, ...fieldError }));
    
    if (!fieldError) {
      Alert.alert('Reset Failed', errorMessage, [{ text: 'OK' }]);
    }
  };

  // Navigate to login with role context
  const handleGoToLogin = () => {
    analyticsService.trackEvent('password_reset_login_redirect', {
      user_role: userRole,
    });
    router.replace({
      pathname: '/(auth)/login',
      params: { role: userRole }
    });
  };

  // Start over
  const handleStartOver = () => {
    setFormData({
      email: resetMethod === ResetMethod.EMAIL ? formData.email : '',
      phone: resetMethod === ResetMethod.PHONE ? formData.phone : '',
      verificationCode: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
    setTouched({});
    setCurrentStep(ResetStep.ENTER_EMAIL_OR_PHONE);
    animateProgress(ResetStep.ENTER_EMAIL_OR_PHONE);
  };

  // Render step content
  const renderStepContent = () => {
    const slideStyle = {
      transform: [{ translateX: slideAnim }],
    };

    return (
      <Animated.View style={[styles.stepContent, slideStyle]}>
        {currentStep === ResetStep.ENTER_EMAIL_OR_PHONE && renderIdentifierStep()}
        {currentStep === ResetStep.VERIFY_CODE && renderVerifyStep()}
        {currentStep === ResetStep.SET_PASSWORD && renderPasswordStep()}
        {currentStep === ResetStep.SUCCESS && renderSuccessStep()}
      </Animated.View>
    );
  };

  const renderIdentifierStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        Reset Your Password
      </ThemedText>
      <ThemedText type="default" style={styles.subtitle}>
        Enter your email or phone number and we'll send you a verification code.
      </ThemedText>

      {/* Reset Method Toggle */}
      <View style={styles.methodToggle}>
        <OutlineButton
          title="Use Email"
          onPress={() => handleResetMethodChange(ResetMethod.EMAIL)}
          variant={resetMethod === ResetMethod.EMAIL ? 'filled' : 'outline'}
          style={styles.toggleButton}
        />
        <OutlineButton
          title="Use Phone"
          onPress={() => handleResetMethodChange(ResetMethod.PHONE)}
          variant={resetMethod === ResetMethod.PHONE ? 'filled' : 'outline'}
          style={styles.toggleButton}
        />
      </View>

      {resetMethod === ResetMethod.EMAIL ? (
        <Input
          label="Email Address"
          value={formData.email}
          onChangeText={(value) => handleFieldChange('email', value)}
          onBlur={() => handleFieldBlur('email')}
          error={errors.email}
          touched={touched.email}
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={handleRequestResetCode}
        />
      ) : (
        <Input
          label="Phone Number"
          value={formData.phone}
          onChangeText={(value) => handleFieldChange('phone', value)}
          onBlur={() => handleFieldBlur('phone')}
          error={errors.phone}
          touched={touched.phone}
          placeholder="+251 91 234 5678"
          keyboardType="phone-pad"
          autoComplete="tel"
          returnKeyType="send"
          onSubmitEditing={handleRequestResetCode}
        />
      )}

      <PrimaryButton
        title="Send Verification Code"
        onPress={handleRequestResetCode}
        fullWidth
        style={styles.continueButton}
      />

      {/* Role context display */}
      <View style={styles.roleBadge}>
        <ThemedText type="caption" style={styles.roleText}>
          Resetting password for: {userRole.replace('_', ' ')}
        </ThemedText>
      </View>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        Enter Verification Code
      </ThemedText>
      <ThemedText type="default" style={styles.subtitle}>
        We sent a 6-digit code to {resetMethod === ResetMethod.EMAIL ? formData.email : formData.phone}
      </ThemedText>

      <Input
        label="Verification Code"
        value={formData.verificationCode}
        onChangeText={handleCodeChange}
        onBlur={() => handleFieldBlur('verificationCode')}
        error={errors.verificationCode}
        touched={touched.verificationCode}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="done"
        style={styles.codeInput}
        textStyle={styles.codeText}
      />

      <View style={styles.resendContainer}>
        <ThemedText type="default">
          Didn't receive the code?{' '}
        </ThemedText>
        <Button
          variant={resendCooldown > 0 ? ButtonVariant.GHOST : ButtonVariant.TERTIARY}
          title={
            resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : 'Resend Code'
          }
          onPress={handleResendCode}
          disabled={resendCooldown > 0}
          style={styles.resendButton}
        />
      </View>

      <PrimaryButton
        title="Verify Code"
        onPress={handleVerifyCode}
        fullWidth
        style={styles.continueButton}
      />

      <OutlineButton
        title={`Change ${resetMethod === ResetMethod.EMAIL ? 'Email' : 'Phone'}`}
        onPress={handleStartOver}
        fullWidth
        style={styles.secondaryButton}
      />
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        Set New Password
      </ThemedText>
      <ThemedText type="default" style={styles.subtitle}>
        Create a strong password for your {userRole.replace('_', ' ')} account
      </ThemedText>

      <Input
        label="New Password"
        value={formData.newPassword}
        onChangeText={(value) => handleFieldChange('newPassword', value)}
        onBlur={() => handleFieldBlur('newPassword')}
        error={errors.newPassword}
        touched={touched.newPassword}
        placeholder="Enter new password"
        secureTextEntry={!showNewPassword}
        autoCapitalize="none"
        autoComplete="password-new"
        rightIcon={showNewPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowNewPassword(!showNewPassword)}
      />

      <ThemedText type="caption" style={styles.passwordHint}>
        Must be at least 8 characters with uppercase, lowercase, and numbers
      </ThemedText>

      <Input
        label="Confirm New Password"
        value={formData.confirmPassword}
        onChangeText={(value) => handleFieldChange('confirmPassword', value)}
        onBlur={() => handleFieldBlur('confirmPassword')}
        error={errors.confirmPassword}
        touched={touched.confirmPassword}
        placeholder="Confirm new password"
        secureTextEntry={!showConfirmPassword}
        autoCapitalize="none"
        autoComplete="password-new"
        rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
      />

      <PrimaryButton
        title="Reset Password"
        onPress={handleSetNewPassword}
        fullWidth
        style={styles.continueButton}
      />
    </View>
  );

  const renderSuccessStep = () => {
    const scale = successAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    const opacity = successAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View style={[styles.successContainer, { opacity }]}>
        <Animated.View style={[styles.successIcon, { transform: [{ scale }] }]}>
          <ThemedText type="title" style={styles.successIconText}>
            ✓
          </ThemedText>
        </Animated.View>
        
        <ThemedText type="title" style={styles.successTitle}>
          Password Reset!
        </ThemedText>
        
        <ThemedText type="default" style={styles.successSubtitle}>
          Your password has been successfully reset. You can now sign in with your new password.
        </ThemedText>

        <PrimaryButton
          title="Sign In Now"
          onPress={handleGoToLogin}
          fullWidth
          style={styles.continueButton}
        />

        {/* Ethiopian support contact */}
        <View style={styles.supportContainer}>
          <ThemedText type="caption" style={styles.supportText}>
            Need help? Contact Ethiopian support: +251 911 234 567
          </ThemedText>
        </View>
      </Animated.View>
    );
  };

  // Progress bar
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Reset Password',
          headerBackTitle: 'Back',
          headerShadowVisible: false,
        }} 
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Bar - Hide on success */}
          {currentStep !== ResetStep.SUCCESS && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    { width: progressWidth }
                  ]} 
                />
              </View>
              <ThemedText type="subtitle" style={styles.progressText}>
                Step {currentStep + 1} of {Object.keys(ResetStep).length - 1}
              </ThemedText>
            </View>
          )}

          {/* Step Content */}
          {renderStepContent()}

          {/* Back to Login */}
          {currentStep === ResetStep.ENTER_EMAIL_OR_PHONE && (
            <View style={styles.loginContainer}>
              <ThemedText type="default">Remember your password? </ThemedText>
              <Button
                variant={ButtonVariant.GHOST}
                title="Sign In"
                onPress={handleGoToLogin}
                style={styles.loginLink}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981', // Ethiopian green
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.7,
  },
  stepContent: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
    lineHeight: 20,
  },
  methodToggle: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  toggleButton: {
    flex: 1,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    height: 60,
  },
  codeText: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  resendButton: {
    paddingHorizontal: 0,
  },
  continueButton: {
    marginTop: 16,
  },
  secondaryButton: {
    marginTop: 12,
  },
  passwordHint: {
    marginTop: -8,
    marginBottom: 16,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  roleBadge: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  roleText: {
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981', // Ethiopian green
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    color: '#FFFFFF',
    fontSize: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  supportContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  supportText: {
    textAlign: 'center',
    color: '#92400E',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 16,
  },
  loginLink: {
    paddingHorizontal: 0,
  },
};