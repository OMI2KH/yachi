import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLoading } from '../../contexts/loading-context';
import { 
  Button, 
  ButtonVariant, 
  PrimaryButton,
  OutlineButton,
  SocialButton 
} from '../../components/ui/button';
import Input from '../../components/ui/input';
import Loading from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { ExternalLink } from '../../components/external-link';
import { validateEmail, validatePassword, validateEthiopianPhone } from '../../utils/validators';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { storage } from '../../utils/storage';

const { width } = Dimensions.get('window');

// Multi-role user types for Ethiopian market
const UserType = {
  CLIENT: 'client',
  SERVICE_PROVIDER: 'service_provider',
  GOVERNMENT: 'government',
  ADMIN: 'admin',
};

// Registration steps with Ethiopian market flow
const RegistrationStep = {
  WELCOME: 0,
  ROLE_SELECTION: 1,
  PERSONAL_INFO: 2,
  ACCOUNT_DETAILS: 3,
  VERIFICATION: 4,
  PROFILE_SETUP: 5,
};

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { register, socialRegister, loading: authLoading } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // State management with Ethiopian market support
  const [currentStep, setCurrentStep] = useState(RegistrationStep.WELCOME);
  const [formData, setFormData] = useState({
    userType: params.role || UserType.CLIENT,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
    marketingEmails: false,
    location: '',
    city: 'Addis Ababa', // Default Ethiopian city
    language: 'en', // Default language
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Addis Ababa');

  // Ethiopian cities for selection
  const ethiopianCities = [
    'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Adama', 'Awassa', 
    'Bahir Dar', 'Gondar', 'Jimma', 'Jijiga', 'Harar'
  ];

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  // Prefill from invite or deep link
  useEffect(() => {
    if (params.email) {
      setFormData(prev => ({ ...prev, email: params.email }));
    }
    if (params.role && Object.values(UserType).includes(params.role)) {
      setFormData(prev => ({ ...prev, userType: params.role }));
      // Skip to personal info if role is predefined
      setCurrentStep(RegistrationStep.PERSONAL_INFO);
    }
    if (params.phone) {
      setFormData(prev => ({ ...prev, phone: params.phone }));
    }
  }, [params]);

  // Progress animation
  const animateProgress = (step) => {
    const progress = (step + 1) / Object.keys(RegistrationStep).length;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  // Slide animation for step transitions
  const animateStepTransition = (newStep, direction = 'forward') => {
    const toValue = direction === 'forward' ? -width : width;
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: toValue,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
        delay: 300,
      }),
    ]).start();

    setTimeout(() => {
      setCurrentStep(newStep);
      animateProgress(newStep);
    }, 150);
  };

  // Validation functions for Ethiopian market
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case RegistrationStep.ROLE_SELECTION:
        if (!formData.userType) {
          newErrors.userType = 'Please select how you want to use Yachi';
        }
        break;

      case RegistrationStep.PERSONAL_INFO:
        if (!formData.firstName?.trim()) {
          newErrors.firstName = 'First name is required';
        } else if (formData.firstName.trim().length < 2) {
          newErrors.firstName = 'First name must be at least 2 characters';
        }

        if (!formData.lastName?.trim()) {
          newErrors.lastName = 'Last name is required';
        } else if (formData.lastName.trim().length < 2) {
          newErrors.lastName = 'Last name must be at least 2 characters';
        }

        if (!formData.phone?.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!validateEthiopianPhone(formData.phone)) {
          newErrors.phone = 'Please enter a valid Ethiopian phone number';
        }

        if (!formData.city) {
          newErrors.city = 'Please select your city';
        }
        break;

      case RegistrationStep.ACCOUNT_DETAILS:
        if (!formData.email?.trim()) {
          newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else {
          const passwordValidation = validatePassword(formData.password);
          if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.errors[0];
          }
        }

        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.agreeToTerms) {
          newErrors.agreeToTerms = 'You must agree to the Terms of Service';
        }

        if (!formData.agreeToPrivacy) {
          newErrors.agreeToPrivacy = 'You must agree to the Privacy Policy';
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

  // Field blur handler
  const handleFieldBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate individual field
    if (field === 'email' && formData.email) {
      if (!validateEmail(formData.email)) {
        setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      }
    }
    
    if (field === 'password' && formData.password) {
      const validation = validatePassword(formData.password);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, password: validation.errors[0] }));
      }
    }

    if (field === 'phone' && formData.phone) {
      if (!validateEthiopianPhone(formData.phone)) {
        setErrors(prev => ({ ...prev, phone: 'Please enter a valid Ethiopian phone number' }));
      }
    }
  };

  // Navigation handlers
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < RegistrationStep.PROFILE_SETUP) {
        animateStepTransition(currentStep + 1, 'forward');
      } else {
        handleRegistration();
      }
    } else {
      // Mark all fields in current step as touched
      const stepFields = getStepFields(currentStep);
      const newTouched = { ...touched };
      stepFields.forEach(field => {
        newTouched[field] = true;
      });
      setTouched(newTouched);

      // Analytics for validation errors
      analyticsService.trackEvent('registration_validation_error', {
        step: currentStep,
        fields: stepFields.filter(field => errors[field]),
        user_type: formData.userType,
      });
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > RegistrationStep.WELCOME) {
      animateStepTransition(currentStep - 1, 'backward');
    } else {
      router.back();
    }
  };

  const getStepFields = (step) => {
    switch (step) {
      case RegistrationStep.ROLE_SELECTION:
        return ['userType'];
      case RegistrationStep.PERSONAL_INFO:
        return ['firstName', 'lastName', 'phone', 'city'];
      case RegistrationStep.ACCOUNT_DETAILS:
        return ['email', 'password', 'confirmPassword', 'agreeToTerms', 'agreeToPrivacy'];
      default:
        return [];
    }
  };

  // Registration handler with Ethiopian market support
  const handleRegistration = async () => {
    try {
      showLoading('Creating your account...');

      // Prepare registration data for Ethiopian market
      const registrationData = {
        userType: formData.userType,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        location: {
          city: formData.city,
          country: 'Ethiopia',
          timezone: 'Africa/Addis_Ababa',
        },
        preferences: {
          marketingEmails: formData.marketingEmails,
          language: formData.language,
          currency: 'ETB',
        },
        deviceInfo: {
          platform: Platform.OS,
          locale: 'et-ET',
        },
        metadata: {
          registration_source: params.source || 'direct',
          invited_by: params.invitedBy,
          campaign: params.campaign,
        },
      };

      // Track registration attempt
      analyticsService.trackEvent('registration_attempt', {
        user_type: formData.userType,
        city: formData.city,
        source: params.source || 'direct',
      });

      // Call registration API
      const result = await register(registrationData);

      if (result.success) {
        // Track successful registration
        analyticsService.trackEvent('registration_completed', {
          user_type: formData.userType,
          city: formData.city,
          source: params.source || 'direct',
        });

        // Store registration context for onboarding
        await storage.setItem('registration_context', {
          userType: formData.userType,
          city: formData.city,
          timestamp: Date.now(),
        });

        // Navigate to role-specific onboarding flow
        switch (formData.userType) {
          case UserType.SERVICE_PROVIDER:
            router.replace('/(onboarding)/service-provider-setup');
            break;
          case UserType.GOVERNMENT:
            router.replace('/(onboarding)/government-setup');
            break;
          case UserType.ADMIN:
            router.replace('/admin-dashboard');
            break;
          default:
            router.replace('/(onboarding)/welcome');
        }

      } else {
        // Handle registration errors
        handleRegistrationError(result.error);
      }

    } catch (error) {
      console.error('Registration error:', error);
      errorService.captureError(error, { 
        context: 'RegistrationScreen',
        user_type: formData.userType,
      });
      
      Alert.alert(
        'Registration Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      hideLoading();
    }
  };

  const handleRegistrationError = (error) => {
    let errorMessage = 'Registration failed. Please try again.';
    let fieldError = null;

    // Map server errors to field errors for Ethiopian market
    if (error.includes('email already exists') || error.includes('email taken')) {
      errorMessage = 'This email address is already registered.';
      fieldError = { email: errorMessage };
    } else if (error.includes('phone already exists')) {
      errorMessage = 'This phone number is already registered.';
      fieldError = { phone: errorMessage };
    } else if (error.includes('weak password')) {
      errorMessage = 'Please choose a stronger password with at least 8 characters including uppercase, lowercase and numbers.';
      fieldError = { password: errorMessage };
    } else if (error.includes('invalid email')) {
      errorMessage = 'Please enter a valid email address.';
      fieldError = { email: errorMessage };
    } else if (error.includes('invalid phone')) {
      errorMessage = 'Please enter a valid Ethiopian phone number.';
      fieldError = { phone: errorMessage };
    } else if (error.includes('city not supported')) {
      errorMessage = 'Service is not yet available in your city. We are expanding soon!';
      fieldError = { city: errorMessage };
    }

    setErrors(prev => ({ ...prev, ...fieldError }));
    
    // Track registration failure
    analyticsService.trackEvent('registration_failed', {
      user_type: formData.userType,
      error_type: error,
    });

    Alert.alert('Registration Failed', errorMessage, [{ text: 'OK' }]);
  };

  // Social registration for Ethiopian market
  const handleSocialRegister = async (provider) => {
    try {
      showLoading(`Connecting with ${provider}...`);
      
      analyticsService.trackEvent('social_registration_attempt', { 
        provider,
        user_type: formData.userType,
      });

      const result = await socialRegister(provider, formData.userType);

      if (result.success) {
        analyticsService.trackEvent('social_registration_success', {
          provider,
          user_type: formData.userType,
        });
      } else {
        Alert.alert('Registration Failed', result.error || 'Social registration failed. Please try another method.');
      }

    } catch (error) {
      console.error('Social registration error:', error);
      errorService.captureError(error, { 
        context: 'SocialRegistration', 
        provider,
        user_type: formData.userType,
      });
      
      Alert.alert(
        'Connection Failed',
        `Unable to connect with ${provider}. Please try another method.`,
        [{ text: 'OK' }]
      );
    } finally {
      hideLoading();
    }
  };

  // Render step content
  const renderStepContent = () => {
    const slideStyle = {
      transform: [{ translateX: slideAnim }],
    };

    return (
      <Animated.View style={[{ width }, slideStyle]}>
        {currentStep === RegistrationStep.WELCOME && renderWelcomeStep()}
        {currentStep === RegistrationStep.ROLE_SELECTION && renderRoleSelectionStep()}
        {currentStep === RegistrationStep.PERSONAL_INFO && renderPersonalInfoStep()}
        {currentStep === RegistrationStep.ACCOUNT_DETAILS && renderAccountDetailsStep()}
        {currentStep === RegistrationStep.VERIFICATION && renderVerificationStep()}
      </Animated.View>
    );
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.stepTitle}>
        Welcome to Yachi 🇪🇹
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        Ethiopia's Premier Home Services Platform
      </ThemedText>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <ThemedText type="subtitle">🏗️ AI Construction Projects</ThemedText>
          <ThemedText type="caption">Smart worker matching for construction projects</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <ThemedText type="subtitle">💳 Ethiopian Payments</ThemedText>
          <ThemedText type="caption">Chapa, Telebirr & CBE Birr integration</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <ThemedText type="subtitle">🏛️ Government Portal</ThemedText>
          <ThemedText type="caption">Large-scale infrastructure project management</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <ThemedText type="subtitle">⭐ Premium Features</ThemedText>
          <ThemedText type="caption">Enhanced visibility and business growth</ThemedText>
        </View>
      </View>

      <PrimaryButton
        title="Get Started"
        onPress={() => animateStepTransition(RegistrationStep.ROLE_SELECTION, 'forward')}
        fullWidth
        style={styles.continueButton}
      />
    </View>
  );

  const renderRoleSelectionStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.stepTitle}>
        How will you use Yachi?
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        Choose your role to get started
      </ThemedText>

      <View style={styles.roleContainer}>
        <OutlineButton
          variant={formData.userType === UserType.CLIENT ? 'filled' : 'outline'}
          title="Client"
          subtitle="Find and book services"
          icon="👤"
          size="large"
          fullWidth
          style={styles.roleButton}
          onPress={() => handleFieldChange('userType', UserType.CLIENT)}
        />
        
        <OutlineButton
          variant={formData.userType === UserType.SERVICE_PROVIDER ? 'filled' : 'outline'}
          title="Service Provider"
          subtitle="Offer construction and home services"
          icon="🔧"
          size="large"
          fullWidth
          style={styles.roleButton}
          onPress={() => handleFieldChange('userType', UserType.SERVICE_PROVIDER)}
        />
        
        <OutlineButton
          variant={formData.userType === UserType.GOVERNMENT ? 'filled' : 'outline'}
          title="Government"
          subtitle="Manage infrastructure projects"
          icon="🏛️"
          size="large"
          fullWidth
          style={styles.roleButton}
          onPress={() => handleFieldChange('userType', UserType.GOVERNMENT)}
        />
      </View>

      {errors.userType && touched.userType && (
        <ThemedText type="danger" style={styles.errorText}>
          {errors.userType}
        </ThemedText>
      )}
    </View>
  );

  const renderPersonalInfoStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.stepTitle}>
        Personal Information
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        Tell us about yourself
      </ThemedText>

      <View style={styles.nameRow}>
        <Input
          label="First Name"
          value={formData.firstName}
          onChangeText={(value) => handleFieldChange('firstName', value)}
          onBlur={() => handleFieldBlur('firstName')}
          error={errors.firstName}
          touched={touched.firstName}
          placeholder="Your first name"
          autoCapitalize="words"
          returnKeyType="next"
          style={styles.halfInput}
        />
        <Input
          label="Last Name"
          value={formData.lastName}
          onChangeText={(value) => handleFieldChange('lastName', value)}
          onBlur={() => handleFieldBlur('lastName')}
          error={errors.lastName}
          touched={touched.lastName}
          placeholder="Your last name"
          autoCapitalize="words"
          returnKeyType="next"
          style={styles.halfInput}
        />
      </View>

      <Input
        label="Phone Number"
        value={formData.phone}
        onChangeText={(value) => handleFieldChange('phone', value)}
        onBlur={() => handleFieldBlur('phone')}
        error={errors.phone}
        touched={touched.phone}
        placeholder="+251 91 234 5678"
        keyboardType="phone-pad"
        returnKeyType="next"
        autoComplete="tel"
        leftIcon="phone"
      />

      <Input
        label="City"
        type="select"
        value={formData.city}
        onChange={(value) => handleFieldChange('city', value)}
        onBlur={() => handleFieldBlur('city')}
        error={errors.city}
        touched={touched.city}
        placeholder="Select your city"
        options={ethiopianCities.map(city => ({ label: city, value: city }))}
        leftIcon="map-pin"
      />

      <View style={styles.roleBadge}>
        <ThemedText type="caption" style={styles.roleBadgeText}>
          Registering as: {formData.userType.replace('_', ' ')}
        </ThemedText>
      </View>
    </View>
  );

  const renderAccountDetailsStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.stepTitle}>
        Account Details
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        Create your login credentials
      </ThemedText>

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
        returnKeyType="next"
        leftIcon="mail"
      />

      <Input
        label="Password"
        value={formData.password}
        onChangeText={(value) => handleFieldChange('password', value)}
        onBlur={() => handleFieldBlur('password')}
        error={errors.password}
        touched={touched.password}
        placeholder="Create a strong password"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="password-new"
        returnKeyType="next"
        leftIcon="lock"
        rightIcon={showPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowPassword(!showPassword)}
      />

      <Input
        label="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(value) => handleFieldChange('confirmPassword', value)}
        onBlur={() => handleFieldBlur('confirmPassword')}
        error={errors.confirmPassword}
        touched={touched.confirmPassword}
        placeholder="Confirm your password"
        secureTextEntry={!showConfirmPassword}
        autoCapitalize="none"
        autoComplete="password-new"
        returnKeyType="done"
        leftIcon="lock"
        rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
      />

      <View style={styles.agreementsContainer}>
        <Input
          type="checkbox"
          label="I agree to the Terms of Service and Privacy Policy"
          value={formData.agreeToTerms && formData.agreeToPrivacy}
          onChange={(value) => {
            handleFieldChange('agreeToTerms', value);
            handleFieldChange('agreeToPrivacy', value);
          }}
          error={errors.agreeToTerms || errors.agreeToPrivacy}
          touched={touched.agreeToTerms}
        />

        <Input
          type="checkbox"
          label="Send me marketing emails and service updates"
          value={formData.marketingEmails}
          onChange={(value) => handleFieldChange('marketingEmails', value)}
          style={styles.marketingCheckbox}
        />
      </View>

      <View style={styles.termsLinks}>
        <ExternalLink href="https://yachi.app/terms" style={styles.link}>
          Terms of Service
        </ExternalLink>
        <ThemedText type="default"> and </ThemedText>
        <ExternalLink href="https://yachi.app/privacy" style={styles.link}>
          Privacy Policy
        </ExternalLink>
      </View>
    </View>
  );

  const renderVerificationStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.stepTitle}>
        Verify Your Account
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        We've sent a verification code to your email and phone
      </ThemedText>

      <View style={styles.verificationContainer}>
        <ThemedText type="default" style={styles.verificationText}>
          Please check your email ({formData.email}) and SMS ({formData.phone}) for verification codes.
        </ThemedText>

        <Input
          label="Email Verification Code"
          placeholder="Enter 6-digit code from email"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.verificationInput}
        />

        <Input
          label="SMS Verification Code"
          placeholder="Enter 6-digit code from SMS"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.verificationInput}
        />

        <View style={styles.resendContainer}>
          <ThemedText type="default">Didn't receive the codes? </ThemedText>
          <Button
            variant={ButtonVariant.GHOST}
            title="Resend Codes"
            onPress={() => {/* Implement resend logic */}}
            style={styles.resendButton}
          />
        </View>
      </View>
    </View>
  );

  // Progress bar
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (authLoading) {
    return <Loading type="full_screen" message="Creating your account..." ethiopianTheme />;
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Join Yachi 🇪🇹',
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
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Progress Bar */}
            {currentStep > RegistrationStep.WELCOME && (
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
                  Step {currentStep} of {Object.keys(RegistrationStep).length - 1}
                </ThemedText>
              </View>
            )}

            {/* Step Content */}
            <View style={styles.stepsContainer}>
              {renderStepContent()}
            </View>

            {/* Social Registration (only show on welcome step) */}
            {currentStep === RegistrationStep.WELCOME && (
              <View style={styles.socialContainer}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <ThemedText type="subtitle" style={styles.dividerText}>
                    Or continue with
                  </ThemedText>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                  <SocialButton
                    provider="google"
                    onPress={() => handleSocialRegister('google')}
                    style={styles.socialButton}
                  />
                  <SocialButton
                    provider="facebook"
                    onPress={() => handleSocialRegister('facebook')}
                    style={styles.socialButton}
                  />
                  <SocialButton
                    provider="apple"
                    onPress={() => handleSocialRegister('apple')}
                    style={styles.socialButton}
                  />
                </View>
              </View>
            )}

            {/* Navigation Buttons */}
            {currentStep > RegistrationStep.WELCOME && (
              <View style={styles.navigationContainer}>
                <OutlineButton
                  title="Back"
                  onPress={handlePreviousStep}
                  style={styles.backButton}
                  leftIcon="arrow-left"
                />
                
                <PrimaryButton
                  title={
                    currentStep === RegistrationStep.ACCOUNT_DETAILS 
                      ? 'Create Account' 
                      : 'Continue'
                  }
                  onPress={handleNextStep}
                  loading={authLoading}
                  fullWidth={currentStep === RegistrationStep.ROLE_SELECTION}
                  style={styles.continueButton}
                />
              </View>
            )}

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <ThemedText type="default">Already have an account? </ThemedText>
              <Button
                variant={ButtonVariant.GHOST}
                title="Sign In"
                onPress={() => router.push({
                  pathname: '/(auth)/login',
                  params: { role: formData.userType }
                })}
                style={styles.loginLink}
              />
            </View>

            {/* Ethiopian Support */}
            <View style={styles.supportContainer}>
              <ThemedText type="caption" style={styles.supportText}>
                Ethiopian Support: +251 911 234 567 • support@yachi.com
              </ThemedText>
            </View>
          </Animated.View>
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
  stepsContainer: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 400,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
    lineHeight: 20,
  },
  featuresList: {
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  roleContainer: {
    gap: 16,
    marginBottom: 16,
  },
  roleButton: {
    height: 80,
  },
  roleBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 16,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  agreementsContainer: {
    marginTop: 16,
  },
  marketingCheckbox: {
    marginTop: 12,
  },
  termsLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  link: {
    marginHorizontal: 4,
  },
  verificationContainer: {
    alignItems: 'center',
  },
  verificationText: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  verificationInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 8,
    marginBottom: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  resendButton: {
    paddingHorizontal: 0,
  },
  socialContainer: {
    marginTop: 32,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    opacity: 0.7,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  loginLink: {
    paddingHorizontal: 0,
  },
  supportContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginTop: 16,
  },
  supportText: {
    textAlign: 'center',
    color: '#6B7280',
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#EF4444',
  },
};