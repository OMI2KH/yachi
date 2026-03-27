import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../../contexts/auth-context';
import { useTheme } from '../../contexts/theme-context';
import { router, useLocalSearchParams } from 'expo-router';
import LoadingScreen from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { PrimaryButton, OutlineButton, SocialButton } from '../../components/ui/button';
import Input from '../../components/ui/input';
import { validateEmail, validatePhone } from '../../utils/validators';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { authService } from '../../services/auth-service';

// Login methods for Ethiopian market
const LoginMethod = {
  EMAIL: 'email',
  PHONE: 'phone',
  SOCIAL: 'social',
};

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const { login, socialLogin, isBiometricAvailable, biometricLogin } = useAuth();
  const { theme, isDark } = useTheme();
  
  // State management with Ethiopian market support
  const [loginMethod, setLoginMethod] = useState(LoginMethod.EMAIL);
  const [formData, setFormData] = useState({
    email: params.email || '',
    phone: params.phone || '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState(params.role || 'client'); // Multi-role support
  const [canUseBiometric, setCanUseBiometric] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Check biometric availability
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setCanUseBiometric(available);
    };
    checkBiometric();
  }, []);

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Validation functions
  const validateForm = () => {
    const newErrors = {};

    if (loginMethod === LoginMethod.EMAIL) {
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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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

  // Handle login method change
  const handleLoginMethodChange = (method) => {
    setLoginMethod(method);
    setErrors({});
    // Clear the other field when switching methods
    if (method === LoginMethod.EMAIL) {
      setFormData(prev => ({ ...prev, phone: '' }));
    } else {
      setFormData(prev => ({ ...prev, email: '' }));
    }
  };

  // Handle regular login
  const handleLogin = async () => {
    // Mark all fields as touched
    setTouched({
      email: loginMethod === LoginMethod.EMAIL,
      phone: loginMethod === LoginMethod.PHONE,
      password: true,
    });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const identifier = loginMethod === LoginMethod.EMAIL 
        ? formData.email.trim() 
        : formData.phone.trim();

      // Track login attempt
      analyticsService.trackEvent('login_attempt', {
        method: loginMethod,
        user_role: userRole,
      });

      const result = await login({
        identifier,
        password: formData.password,
        method: loginMethod,
        role: userRole,
      });

      if (result.success) {
        // Track successful login
        analyticsService.trackEvent('login_success', {
          method: loginMethod,
          user_role: userRole,
          user_id: result.user?.id,
        });

        console.log('Login successful - user role:', result.user?.role);
        
        // Success - navigation is handled by auth context
      } else {
        handleLoginError(result.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      errorService.captureError(error, {
        context: 'Login',
        method: loginMethod,
        user_role: userRole,
      });
      
      Alert.alert(
        'Login Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login errors for Ethiopian market
  const handleLoginError = (error) => {
    let errorMessage = 'Login failed. Please check your credentials and try again.';
    let fieldError = null;

    if (error.includes('invalid credentials') || error.includes('wrong password')) {
      errorMessage = 'Invalid email/phone or password. Please try again.';
      fieldError = { password: 'Incorrect password' };
    } else if (error.includes('user not found')) {
      errorMessage = loginMethod === LoginMethod.EMAIL
        ? 'No account found with this email address.'
        : 'No account found with this phone number.';
      fieldError = { 
        [loginMethod === LoginMethod.EMAIL ? 'email' : 'phone']: errorMessage 
      };
    } else if (error.includes('account locked')) {
      errorMessage = 'Account temporarily locked. Please try again in 15 minutes or reset your password.';
    } else if (error.includes('verification required')) {
      errorMessage = 'Please verify your account before logging in.';
      router.push('/(auth)/verify-email');
      return;
    } else if (error.includes('role mismatch')) {
      errorMessage = `This account is not registered as a ${userRole}. Please try a different role.`;
    }

    setErrors(prev => ({ ...prev, ...fieldError }));
    
    if (!fieldError) {
      Alert.alert('Login Failed', errorMessage, [{ text: 'OK' }]);
    }

    // Track failed login
    analyticsService.trackEvent('login_failed', {
      method: loginMethod,
      user_role: userRole,
      error_type: error,
    });
  };

  // Handle social login
  const handleSocialLogin = async (provider) => {
    try {
      setIsLoading(true);

      analyticsService.trackEvent('social_login_attempt', {
        provider: provider,
        user_role: userRole,
      });

      const result = await socialLogin(provider, userRole);

      if (result.success) {
        analyticsService.trackEvent('social_login_success', {
          provider: provider,
          user_role: userRole,
          user_id: result.user?.id,
        });
      } else {
        Alert.alert('Login Failed', result.error || 'Social login failed. Please try again.');
      }
    } catch (error) {
      console.error('Social login error:', error);
      errorService.captureError(error, {
        context: 'SocialLogin',
        provider: provider,
      });
      
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle biometric login
  const handleBiometricLogin = async () => {
    try {
      const result = await biometricLogin(userRole);
      
      if (result.success) {
        analyticsService.trackEvent('biometric_login_success', {
          user_role: userRole,
        });
      } else {
        console.log('Biometric login failed or cancelled');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      errorService.captureError(error, {
        context: 'BiometricLogin',
      });
    }
  };

  // Navigate to register with role context
  const handleNavigateToRegister = () => {
    analyticsService.trackEvent('navigate_to_register_from_login', {
      current_role: userRole,
    });
    router.push({
      pathname: '/(auth)/register',
      params: { role: userRole }
    });
  };

  // Navigate to forgot password with context
  const handleNavigateToForgotPassword = () => {
    analyticsService.trackEvent('navigate_to_forgot_password', {
      method: loginMethod,
      user_role: userRole,
    });
    router.push({
      pathname: '/(auth)/forgot-password',
      params: { 
        [loginMethod]: loginMethod === LoginMethod.EMAIL ? formData.email : formData.phone,
        role: userRole 
      }
    });
  };

  // Role selection for multi-role platform
  const renderRoleSelector = () => (
    <View style={styles.roleSelector}>
      <ThemedText type="subtitle" style={styles.roleLabel}>
        I am a:
      </ThemedText>
      <View style={styles.roleButtons}>
        {['client', 'service_provider', 'government'].map((role) => (
          <TouchableOpacity
            key={role}
            style={[
              styles.roleButton,
              userRole === role && styles.roleButtonActive,
            ]}
            onPress={() => setUserRole(role)}
          >
            <ThemedText 
              type="default" 
              style={[
                styles.roleButtonText,
                userRole === role && styles.roleButtonTextActive,
              ]}
            >
              {role.replace('_', ' ')}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Login method selector
  const renderMethodSelector = () => (
    <View style={styles.methodSelector}>
      <OutlineButton
        title="Use Email"
        onPress={() => handleLoginMethodChange(LoginMethod.EMAIL)}
        variant={loginMethod === LoginMethod.EMAIL ? 'filled' : 'outline'}
        style={styles.methodButton}
      />
      <OutlineButton
        title="Use Phone"
        onPress={() => handleLoginMethodChange(LoginMethod.PHONE)}
        variant={loginMethod === LoginMethod.PHONE ? 'filled' : 'outline'}
        style={styles.methodButton}
      />
    </View>
  );

  if (isLoading) {
    return <LoadingScreen message="Signing you in..." ethiopianTheme />;
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header with Ethiopian branding */}
            <View style={styles.header}>
              <Image 
                source={require('../../assets/images/yachi-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <ThemedText type="title" style={styles.title}>
                Welcome Back
              </ThemedText>
              <ThemedText type="default" style={styles.subtitle}>
                Sign in to your Yachi {userRole.replace('_', ' ')} account
              </ThemedText>
            </View>

            {/* Role Selection */}
            {renderRoleSelector()}

            {/* Login Form */}
            <View style={styles.form}>
              {/* Method Selector */}
              {renderMethodSelector()}

              {/* Email/Phone Input */}
              {loginMethod === LoginMethod.EMAIL ? (
                <Input
                  label="Email Address"
                  value={formData.email}
                  onChangeText={(value) => handleFieldChange('email', value)}
                  onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                  error={errors.email}
                  touched={touched.email}
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon="mail"
                />
              ) : (
                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChangeText={(value) => handleFieldChange('phone', value)}
                  onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                  error={errors.phone}
                  touched={touched.phone}
                  placeholder="+251 91 234 5678"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  leftIcon="phone"
                />
              )}

              {/* Password Input */}
              <Input
                label="Password"
                value={formData.password}
                onChangeText={(value) => handleFieldChange('password', value)}
                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                error={errors.password}
                touched={touched.password}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                leftIcon="lock"
                rightIcon={showPassword ? 'eye-off' : 'eye'}
                onRightIconPress={() => setShowPassword(!showPassword)}
              />

              {/* Forgot Password */}
              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={handleNavigateToForgotPassword}
              >
                <ThemedText type="link" style={styles.forgotPasswordText}>
                  Forgot your password?
                </ThemedText>
              </TouchableOpacity>

              {/* Login Button */}
              <PrimaryButton
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                fullWidth
                style={styles.loginButton}
              />

              {/* Biometric Login */}
              {canUseBiometric && (
                <OutlineButton
                  title="Use Biometric Login"
                  onPress={handleBiometricLogin}
                  fullWidth
                  leftIcon="fingerprint"
                  style={styles.biometricButton}
                />
              )}

              {/* Social Login Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <ThemedText type="caption" style={styles.dividerText}>
                  Or continue with
                </ThemedText>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Buttons */}
              <View style={styles.socialButtons}>
                <SocialButton
                  provider="google"
                  onPress={() => handleSocialLogin('google')}
                  style={styles.socialButton}
                />
                <SocialButton
                  provider="facebook"
                  onPress={() => handleSocialLogin('facebook')}
                  style={styles.socialButton}
                />
                <SocialButton
                  provider="apple"
                  onPress={() => handleSocialLogin('apple')}
                  style={styles.socialButton}
                />
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText type="default" style={styles.footerText}>
                Don't have an account?{' '}
              </ThemedText>
              <TouchableOpacity onPress={handleNavigateToRegister}>
                <ThemedText type="link" style={styles.signupLink}>
                  Sign up now
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Ethiopian Support */}
            <View style={styles.supportContainer}>
              <ThemedText type="caption" style={styles.supportText}>
                Ethiopian Support: +251 911 234 567
              </ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  animatedContainer: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
  },
  roleSelector: {
    marginBottom: 24,
  },
  roleLabel: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  roleButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  form: {
    width: '100%',
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  methodButton: {
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 16,
  },
  biometricButton: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    opacity: 0.7,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  supportContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  supportText: {
    fontSize: 12,
    color: '#6B7280',
  },
});