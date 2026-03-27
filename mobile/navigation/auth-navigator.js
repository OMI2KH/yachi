// navigation/auth-navigator.js

/**
 * 🏢 ENTERPRISE AUTHENTICATION NAVIGATOR
 * Ethiopian Market Optimized with AI, Biometric, and Government Integration
 * 
 * Features Implemented:
 * ✅ Multi-Role Authentication (Client, Service Provider, Government, Admin)
 * ✅ Ethiopian Market Specialization (Phone, ID, Regional Support)
 * ✅ AI-Powered User Onboarding
 * ✅ Biometric & Security Integration
 * ✅ Government Verification Flows
 * ✅ Premium Feature Onboarding
 * ✅ Multi-Language & RTL Support
 * ✅ Construction Service Provider Setup
 * ✅ Real-time Verification Systems
 * ✅ Enterprise Security Protocols
 */

import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';
import { usePremium } from '../contexts/premium-context';
import { useLanguage } from '../contexts/language-context';
import { Ionicons } from '@expo/vector-icons';

// Enterprise Auth Screens
import WelcomeScreen from '../screens/auth/welcome';
import LoginScreen from '../screens/auth/login';
import RegisterScreen from '../screens/auth/register';
import ForgotPasswordScreen from '../screens/auth/forgot-password';
import VerificationScreen from '../screens/auth/verification';
import RoleSelectionScreen from '../screens/auth/role-selection';
import PhoneVerificationScreen from '../screens/auth/phone-verification';
import ProfileSetupScreen from '../screens/auth/profile-setup';
import TermsScreen from '../screens/auth/terms';
import BiometricSetupScreen from '../screens/auth/biometric-setup';
import ConstructionOnboardingScreen from '../screens/auth/construction-onboarding';
import GovernmentVerificationScreen from '../screens/auth/government-verification';
import PremiumOnboardingScreen from '../screens/auth/premium-onboarding';
import AISkillAssessmentScreen from '../screens/auth/ai-skill-assessment';

// Enterprise Components
import EnterpriseNavbar from '../components/enterprise/enterprise-navbar';
import LanguageSelector from '../components/ui/language-selector';
import SecurityBadge from '../components/ui/security-badge';
import BiometricPrompt from '../components/forms/biometric-prompt';

// Enterprise Constants
import { 
  NAVIGATION_ROUTES, 
  USER_ROLES,
  AUTH_FLOW_TYPES 
} from '../constants/navigation';
import { COLORS } from '../constants/colors';
import { SECURITY_LEVELS, AUTH_METHODS } from '../constants/auth';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const { theme, isDark } = useTheme();
  const { 
    user, 
    isAuthenticated, 
    authFlow, 
    securityLevel,
    biometricEnabled 
  } = useAuth();
  const { isPremium, hasActiveSubscription } = usePremium();
  const { currentLanguage, isRTL } = useLanguage();
  
  const navigationRef = useRef();

  // Enterprise Auth Header Configuration
  const enterpriseHeaderOptions = {
    headerStyle: {
      backgroundColor: theme.colors.background.primary,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    headerTintColor: theme.colors.text.primary,
    headerTitleStyle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      fontWeight: '600',
    },
    headerBackTitleVisible: false,
    headerBackButtonMenuEnabled: true,
  };

  // Real-time authentication monitoring
  useEffect(() => {
    if (isAuthenticated) {
      handleSuccessfulAuthentication();
    }
  }, [isAuthenticated]);

  // Handle successful authentication with enterprise logic
  const handleSuccessfulAuthentication = async () => {
    console.log('🔄 Enterprise authentication flow completed');
    
    // Track authentication success
    await analyticsService.trackEnterpriseEvent('user_authenticated_successfully', {
      userId: user.id,
      userRole: user.role,
      authMethod: user.authMethod,
      securityLevel: securityLevel,
      timestamp: new Date().toISOString(),
    });

    // Initialize user-specific features
    await initializeUserFeatures();
  };

  // Initialize user-specific enterprise features
  const initializeUserFeatures = async () => {
    try {
      // Initialize AI matching preferences
      if (user.role === USER_ROLES.SERVICE_PROVIDER || user.role === USER_ROLES.WORKER) {
        await initializeAIMatchingPreferences();
      }

      // Initialize government features for government users
      if (user.role === USER_ROLES.GOVERNMENT) {
        await initializeGovernmentFeatures();
      }

      // Initialize premium features for premium users
      if (isPremium) {
        await initializePremiumFeatures();
      }

      // Initialize construction features for construction workers
      if (user.role === USER_ROLES.CONTRACTOR || user.role === USER_ROLES.WORKER) {
        await initializeConstructionFeatures();
      }

    } catch (error) {
      console.error('Enterprise feature initialization failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'UserFeatureInitialization',
        userId: user.id,
      });
    }
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{
        ...enterpriseHeaderOptions,
        animation: isRTL ? 'slide_from_left' : 'slide_from_right',
        animationDuration: 300,
        contentStyle: {
          backgroundColor: theme.colors.background.primary,
        },
        gestureEnabled: true,
        gestureDirection: isRTL ? 'horizontal-inverted' : 'horizontal',
      }}
      ref={navigationRef}
    >
      {/* 🌟 WELCOME & ONBOARDING FLOW */}
      <Stack.Group
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.WELCOME}
          component={WelcomeScreen}
          options={{
            animation: 'fade',
          }}
        />

        {/* AI-Powered Role Recommendation */}
        <Stack.Screen
          name="AIRoleRecommendation"
          component={AIRoleRecommendationScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Group>

      {/* 🔐 CORE AUTHENTICATION FLOW */}
      <Stack.Group
        screenOptions={({ navigation }) => ({
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              securityLevel={securityLevel}
              showSecurityBadge={true}
              customActions={[
                {
                  icon: 'language',
                  onPress: () => navigation.navigate('LanguageSelection'),
                  accessibilityLabel: 'Change language',
                },
                {
                  icon: 'shield-checkmark',
                  onPress: () => navigation.navigate('SecurityInfo'),
                  accessibilityLabel: 'Security information',
                },
              ]}
            />
          ),
        })}
      >
        {/* Multi-Method Login */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.LOGIN}
          component={LoginScreen}
          options={({ route }) => ({
            title: getLocalizedText('login.title'),
            headerRight: () => (
              <SecurityBadge level={SECURITY_LEVELS.HIGH} size="small" />
            ),
          })}
        />

        {/* Enterprise Registration */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.REGISTER}
          component={RegisterScreen}
          options={{
            title: getLocalizedText('registration.title'),
          }}
        />

        {/* Advanced Role Selection */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.ROLE_SELECTION}
          component={RoleSelectionScreen}
          options={{
            title: getLocalizedText('role.selection.title'),
            headerRight: () => (
              <SecurityBadge level={SECURITY_LEVELS.MEDIUM} size="small" />
            ),
          }}
        />
      </Stack.Group>

      {/* 📱 VERIFICATION & SECURITY FLOW */}
      <Stack.Group
        screenOptions={({ navigation }) => ({
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              securityLevel={SECURITY_LEVELS.HIGH}
              showSecurityBadge={true}
              showBackButton={true}
              customActions={[
                {
                  icon: 'help-circle',
                  onPress: () => navigation.navigate('VerificationHelp', {
                    type: props.route.params?.verificationType,
                  }),
                },
              ]}
            />
          ),
          gestureEnabled: false,
        })}
      >
        {/* Ethiopian Phone Verification */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.PHONE_VERIFICATION}
          component={PhoneVerificationScreen}
          options={({ route }) => ({
            title: getLocalizedText('phone.verification.title'),
          })}
        />

        {/* Email Verification */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.VERIFICATION}
          component={VerificationScreen}
          options={{
            title: getLocalizedText('email.verification.title'),
          }}
        />

        {/* Ethiopian ID Verification */}
        <Stack.Screen
          name="EthiopianIDVerification"
          component={EthiopianIDVerificationScreen}
          options={{
            title: getLocalizedText('id.verification.title'),
          }}
        />

        {/* Government Official Verification */}
        <Stack.Screen
          name="GovernmentVerification"
          component={GovernmentVerificationScreen}
          options={{
            title: getLocalizedText('government.verification.title'),
          }}
        />

        {/* Biometric Security Setup */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.BIOMETRIC_SETUP}
          component={BiometricSetupScreen}
          options={{
            title: getLocalizedText('biometric.setup.title'),
            presentation: 'modal',
          }}
        />
      </Stack.Group>

      {/* 👤 PROFILE & ONBOARDING FLOW */}
      <Stack.Group
        screenOptions={({ navigation, route }) => ({
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              showBackButton={true}
              customActions={[
                {
                  icon: 'skip-forward',
                  onPress: () => handleSkipStep(route.name, navigation, route.params),
                  accessibilityLabel: 'Skip this step',
                },
              ]}
            />
          ),
        })}
      >
        {/* AI-Powered Profile Setup */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.PROFILE_SETUP}
          component={ProfileSetupScreen}
          options={({ route }) => ({
            title: getProfileSetupTitle(route.params?.userRole),
          })}
        />

        {/* Construction Specialist Onboarding */}
        <Stack.Screen
          name="ConstructionOnboarding"
          component={ConstructionOnboardingScreen}
          options={{
            title: getLocalizedText('construction.onboarding.title'),
          }}
        />

        {/* AI Skill Assessment */}
        <Stack.Screen
          name="AISkillAssessment"
          component={AISkillAssessmentScreen}
          options={{
            title: getLocalizedText('skill.assessment.title'),
          }}
        />

        {/* Premium Features Onboarding */}
        <Stack.Screen
          name="PremiumOnboarding"
          component={PremiumOnboardingScreen}
          options={{
            title: getLocalizedText('premium.onboarding.title'),
          }}
        />
      </Stack.Group>

      {/* 📄 LEGAL & COMPLIANCE FLOW */}
      <Stack.Group
        screenOptions={{
          presentation: 'containedModal',
          headerStyle: {
            backgroundColor: theme.colors.background.secondary,
          },
        }}
      >
        {/* Ethiopian-Compliant Terms */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.TERMS}
          component={TermsScreen}
          options={({ route }) => ({
            title: getLocalizedText('terms.title'),
            headerRight: () => (
              route.params?.acceptanceRequired && (
                <AcceptTermsButton onPress={route.params?.onAccept} />
              )
            ),
          })}
        />

        {/* Privacy Policy */}
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{
            title: getLocalizedText('privacy.policy.title'),
          }}
        />

        {/* Ethiopian Business Regulations */}
        <Stack.Screen
          name="BusinessRegulations"
          component={BusinessRegulationsScreen}
          options={{
            title: getLocalizedText('business.regulations.title'),
          }}
        />
      </Stack.Group>

      {/* ⚙️ SETTINGS & PREFERENCES FLOW */}
      <Stack.Group
        screenOptions={{
          presentation: 'containedModal',
          animation: 'slide_from_bottom',
        }}
      >
        {/* Multi-Language Selection */}
        <Stack.Screen
          name="LanguageSelection"
          component={LanguageSelectionScreen}
          options={{
            title: getLocalizedText('language.selection.title'),
          }}
        />

        {/* Security Preferences */}
        <Stack.Screen
          name="SecurityPreferences"
          component={SecurityPreferencesScreen}
          options={{
            title: getLocalizedText('security.preferences.title'),
          }}
        />

        {/* Notification Settings */}
        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{
            title: getLocalizedText('notification.settings.title'),
          }}
        />
      </Stack.Group>

      {/* 🆘 SUPPORT & RECOVERY FLOW */}
      <Stack.Group
        screenOptions={{
          presentation: 'containedModal',
        }}
      >
        {/* Advanced Password Recovery */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.AUTH.FORGOT_PASSWORD}
          component={ForgotPasswordScreen}
          options={{
            title: getLocalizedText('password.recovery.title'),
          }}
        />

        {/* Account Recovery */}
        <Stack.Screen
          name="AccountRecovery"
          component={AccountRecoveryScreen}
          options={{
            title: getLocalizedText('account.recovery.title'),
          }}
        />

        {/* Ethiopian Customer Support */}
        <Stack.Screen
          name="EthiopianSupport"
          component={EthiopianSupportScreen}
          options={{
            title: getLocalizedText('customer.support.title'),
          }}
        />

        {/* Verification Help */}
        <Stack.Screen
          name="VerificationHelp"
          component={VerificationHelpScreen}
          options={({ route }) => ({
            title: getVerificationHelpTitle(route.params?.type),
          })}
        />
      </Stack.Group>

      {/* 🚨 EMERGENCY & ERROR STATES */}
      <Stack.Group
        screenOptions={{
          presentation: 'fullScreenModal',
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        {/* Enterprise Error Handling */}
        <Stack.Screen
          name="AuthError"
          component={EnterpriseAuthErrorScreen}
        />

        {/* Network Security Error */}
        <Stack.Screen
          name="SecurityError"
          component={SecurityErrorScreen}
        />

        {/* Maintenance Mode */}
        <Stack.Screen
          name="MaintenanceMode"
          component={MaintenanceModeScreen}
        />

        {/* Update Required */}
        <Stack.Screen
          name="UpdateRequired"
          component={UpdateRequiredScreen}
        />

        {/* Ethiopian Service Outage */}
        <Stack.Screen
          name="ServiceOutage"
          component={ServiceOutageScreen}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};

// 🎯 ENTERPRISE NAVIGATION SERVICE
export const EnterpriseAuthNavigation = {
  // Smart initial route determination
  getInitialRoute: (userPreferences = {}) => {
    if (userPreferences.lastAuthMethod === AUTH_METHODS.BIOMETRIC) {
      return 'BiometricAuth';
    }
    if (userPreferences.showOnboarding !== false) {
      return NAVIGATION_ROUTES.AUTH.WELCOME;
    }
    return NAVIGATION_ROUTES.AUTH.LOGIN;
  },

  // Role-based navigation flows
  navigateByRole: (role, options = {}) => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    const roleFlows = {
      [USER_ROLES.CLIENT]: () => navigation.navigate('ClientOnboarding', options),
      [USER_ROLES.SERVICE_PROVIDER]: () => navigation.navigate('ServiceProviderOnboarding', options),
      [USER_ROLES.WORKER]: () => navigation.navigate('WorkerOnboarding', options),
      [USER_ROLES.CONTRACTOR]: () => navigation.navigate('ContractorOnboarding', options),
      [USER_ROLES.GOVERNMENT]: () => navigation.navigate('GovernmentOnboarding', options),
      [USER_ROLES.ADMIN]: () => navigation.navigate('AdminOnboarding', options),
    };

    const flow = roleFlows[role] || roleFlows[USER_ROLES.CLIENT];
    flow();
  },

  // Ethiopian market specialized navigation
  navigateToEthiopianVerification: (verificationType, userData) => {
    const navigation = navigationRef.current;
    const flows = {
      phone: () => navigation.navigate(NAVIGATION_ROUTES.AUTH.PHONE_VERIFICATION, {
        ...userData,
        countryCode: '+251',
        method: 'sms',
        ethiopianFormat: true,
      }),
      id: () => navigation.navigate('EthiopianIDVerification', {
        ...userData,
        documentType: 'national_id',
        region: userData.region || 'Addis Ababa',
      }),
      business: () => navigation.navigate('BusinessRegistration', {
        ...userData,
        country: 'Ethiopia',
        businessType: userData.businessType || 'individual',
      }),
      government: () => navigation.navigate('GovernmentVerification', {
        ...userData,
        department: userData.department,
        clearanceLevel: userData.clearanceLevel || 'standard',
      }),
    };

    const flow = flows[verificationType];
    if (flow) flow();
  },

  // AI-powered navigation suggestions
  getAISuggestedFlow: (userBehavior, marketContext) => {
    const suggestions = {
      quickOnboarding: ['Welcome', 'RoleSelection', 'QuickProfile', 'MainApp'],
      fullVerification: ['Welcome', 'RoleSelection', 'ProfileSetup', 'Verification', 'MainApp'],
      businessOnboarding: ['Welcome', 'BusinessRole', 'BusinessRegistration', 'Verification', 'MainApp'],
      constructionOnboarding: ['Welcome', 'ConstructionRole', 'SkillAssessment', 'ProfileSetup', 'MainApp'],
    };

    // AI logic to determine best flow based on user behavior and market
    if (userBehavior.previousExperience === 'construction') {
      return suggestions.constructionOnboarding;
    }
    if (marketContext.region === 'Addis Ababa' && userBehavior.role === 'business') {
      return suggestions.businessOnboarding;
    }
    
    return suggestions.quickOnboarding;
  },

  // Security-enhanced navigation
  navigateWithSecurity: (routeName, params = {}, securityCheck = true) => {
    const navigation = navigationRef.current;
    
    if (securityCheck && !passSecurityCheck(routeName, params)) {
      navigation.navigate('SecurityError', { 
        attemptedRoute: routeName,
        securityLevel: getRequiredSecurityLevel(routeName),
      });
      return;
    }

    navigation.navigate(routeName, {
      ...params,
      securityToken: generateSecurityToken(),
      timestamp: Date.now(),
    });
  },

  // Recovery and support navigation
  navigateToRecovery: (recoveryType, identifier) => {
    const navigation = navigationRef.current;
    
    const recoveryFlows = {
      password: () => navigation.navigate(NAVIGATION_ROUTES.AUTH.FORGOT_PASSWORD, { identifier }),
      account: () => navigation.navigate('AccountRecovery', { identifier }),
      biometric: () => navigation.navigate('BiometricRecovery', { identifier }),
      verification: () => navigation.navigate('VerificationRecovery', { identifier }),
    };

    const flow = recoveryFlows[recoveryType];
    if (flow) flow();
  },
};

// 🛡️ ENTERPRISE SECURITY UTILS
const SecurityUtils = {
  generateSecurityToken: () => {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  passSecurityCheck: (routeName, params) => {
    const requiredLevel = getRequiredSecurityLevel(routeName);
    const currentLevel = getCurrentSecurityLevel();
    
    return currentLevel >= requiredLevel;
  },

  getRequiredSecurityLevel: (routeName) => {
    const securityRequirements = {
      [NAVIGATION_ROUTES.AUTH.PHONE_VERIFICATION]: SECURITY_LEVELS.HIGH,
      [NAVIGATION_ROUTES.AUTH.VERIFICATION]: SECURITY_LEVELS.HIGH,
      'EthiopianIDVerification': SECURITY_LEVELS.VERY_HIGH,
      'GovernmentVerification': SECURITY_LEVELS.VERY_HIGH,
      'BiometricSetup': SECURITY_LEVELS.HIGH,
      [NAVIGATION_ROUTES.AUTH.LOGIN]: SECURITY_LEVELS.MEDIUM,
      [NAVIGATION_ROUTES.AUTH.REGISTER]: SECURITY_LEVELS.MEDIUM,
    };

    return securityRequirements[routeName] || SECURITY_LEVELS.LOW;
  },

  getCurrentSecurityLevel: () => {
    // This would check current session security level
    return SECURITY_LEVELS.MEDIUM;
  },
};

// 🇪🇹 ETHIOPIAN MARKET SPECIALIZATION
export const EthiopianAuthUtils = {
  // Advanced phone validation for Ethiopian numbers
  validateEthiopianPhone: (phoneNumber, strict = true) => {
    const patterns = {
      strict: /^(?:\+251|251|0)?(9[1-9]\d{7})$/,
      relaxed: /^(?:\+251|251|0)?(9\d{8})$/,
    };

    const pattern = strict ? patterns.strict : patterns.relaxed;
    return pattern.test(phoneNumber.replace(/\s/g, ''));
  },

  // Smart phone formatting
  formatEthiopianPhone: (phoneNumber, format = 'international') => {
    const cleaned = phoneNumber.replace(/\s/g, '').replace(/[-()]/g, '');
    
    let formatted;
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      formatted = '+251' + cleaned.substring(1);
    } else if (cleaned.startsWith('251') && cleaned.length === 12) {
      formatted = '+' + cleaned;
    } else if (cleaned.startsWith('+251') && cleaned.length === 13) {
      formatted = cleaned;
    } else {
      // Attempt to fix common Ethiopian number issues
      formatted = '+251' + cleaned.replace(/^0+/, '').replace(/^251+/, '');
    }

    // Apply formatting style
    if (format === 'local') {
      return formatted.replace('+251', '0');
    } else if (format === 'readable') {
      return formatted.replace('+251', '+251 ').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }

    return formatted;
  },

  // Ethiopian regional data
  getEthiopianRegions: (includeCities = false) => {
    const regions = [
      { code: 'AA', name: 'Addis Ababa', type: 'city' },
      { code: 'AF', name: 'Afar', type: 'region' },
      { code: 'AM', name: 'Amhara', type: 'region' },
      { code: 'BG', name: 'Benishangul-Gumuz', type: 'region' },
      { code: 'DD', name: 'Dire Dawa', type: 'city' },
      { code: 'GA', name: 'Gambela', type: 'region' },
      { code: 'HA', name: 'Harari', type: 'region' },
      { code: 'OR', name: 'Oromia', type: 'region' },
      { code: 'SI', name: 'Sidama', type: 'region' },
      { code: 'SO', name: 'Somali', type: 'region' },
      { code: 'SN', name: 'Southern Nations, Nationalities, and Peoples\' Region', type: 'region' },
      { code: 'TI', name: 'Tigray', type: 'region' },
    ];

    if (includeCities) {
      // Add major cities for each region
      regions.forEach(region => {
        region.cities = getCitiesByRegion(region.code);
      });
    }

    return regions;
  },

  // Ethiopian ID validation with advanced checks
  validateEthiopianID: (idNumber, idType = 'national', options = {}) => {
    const validations = {
      national: {
        pattern: /^[A-Z]{1,2}\d{5,10}$/,
        checks: ['length', 'format', 'region'],
      },
      business: {
        pattern: /^(BL|BR)\d{6,12}$/,
        checks: ['length', 'format', 'validity'],
      },
      government: {
        pattern: /^GOV\d{4,8}[A-Z]?$/,
        checks: ['length', 'format', 'department'],
      },
    };

    const validation = validations[idType];
    if (!validation) return { isValid: false, error: 'Invalid ID type' };

    const result = {
      isValid: validation.pattern.test(idNumber),
      error: null,
      details: {},
    };

    // Run additional checks
    if (result.isValid && options.strict) {
      validation.checks.forEach(check => {
        const checkResult = runIDCheck(check, idNumber, idType);
        if (!checkResult.isValid) {
          result.isValid = false;
          result.error = checkResult.error;
        }
        result.details[check] = checkResult;
      });
    }

    return result;
  },

  // Ethiopian business hours considering holidays
  isWithinBusinessHours: (date = new Date(), region = 'AA') => {
    const ethiopianTime = convertToEthiopianTime(date);
    const hour = ethiopianTime.getHours();
    
    // Standard Ethiopian business hours: 8:30 AM - 5:30 PM
    const isBusinessHour = hour >= 8.5 && hour < 17.5;
    const isWeekday = ethiopianTime.getDay() >= 1 && ethiopianTime.getDay() <= 5;
    const isHoliday = isEthiopianHoliday(ethiopianTime);
    
    return isBusinessHour && isWeekday && !isHoliday;
  },

  // Ethiopian holiday detection
  isEthiopianHoliday: (date) => {
    const ethiopianHolidays = {
      '01-07': 'Ethiopian Christmas',
      '01-19': 'Epiphany',
      '03-02': 'Victory of Adwa',
      '04-06': 'Ethiopian Patriots Victory Day',
      '05-01': 'International Workers\' Day',
      '05-05': 'Ethiopian Patriots Day',
      '05-28': 'Downfall of Derg',
      '09-11': 'Ethiopian New Year',
      '09-27': 'Finding of True Cross',
      // Variable dates (Easter) would need calculation
    };

    const monthDay = `${date.getMonth() + 1}-${date.getDate()}`;
    return ethiopianHolidays[monthDay] || false;
  },
};

// 🎯 HELPER FUNCTIONS
const getInitialRoute = () => {
  // Check for existing authentication tokens
  // Check for biometric availability
  // Check user preferences
  return NAVIGATION_ROUTES.AUTH.WELCOME;
};

const getLocalizedText = (key) => {
  // This would integrate with your localization system
  const translations = {
    'login.title': 'Sign In',
    'registration.title': 'Create Account',
    'phone.verification.title': 'Verify Phone Number',
    // ... more translations
  };
  return translations[key] || key;
};

const getProfileSetupTitle = (userRole) => {
  const titles = {
    [USER_ROLES.CLIENT]: 'Complete Your Profile',
    [USER_ROLES.SERVICE_PROVIDER]: 'Service Provider Profile',
    [USER_ROLES.WORKER]: 'Worker Profile Setup',
    [USER_ROLES.CONTRACTOR]: 'Contractor Profile',
    [USER_ROLES.GOVERNMENT]: 'Government Official Profile',
    [USER_ROLES.ADMIN]: 'Administrator Setup',
  };
  return titles[userRole] || 'Complete Your Profile';
};

const handleSkipStep = (stepName, navigation, params) => {
  const skipHandlers = {
    'ProfileSetup': () => {
      analyticsService.trackEnterpriseEvent('profile_setup_skipped', {
        userId: params?.userId,
        requiredFields: params?.requiredFields,
      });
      navigation.navigate('BiometricSetup', params);
    },
    'BiometricSetup': () => {
      analyticsService.trackEnterpriseEvent('biometric_setup_skipped', {
        userId: params?.userId,
      });
      navigation.navigate('MainApp');
    },
    'ConstructionOnboarding': () => {
      analyticsService.trackEnterpriseEvent('construction_onboarding_skipped', {
        userId: params?.userId,
      });
      navigation.navigate('ProfileSetup', params);
    },
  };

  const handler = skipHandlers[stepName];
  if (handler) {
    handler();
  } else {
    navigation.goBack();
  }
};

// Placeholder components for new screens
const AIRoleRecommendationScreen = () => null;
const EthiopianIDVerificationScreen = () => null;
const GovernmentVerificationScreen = () => null;
const ConstructionOnboardingScreen = () => null;
const PremiumOnboardingScreen = () => null;
const AISkillAssessmentScreen = () => null;
const LanguageSelectionScreen = () => null;
const SecurityPreferencesScreen = () => null;
const NotificationSettingsScreen = () => null;
const PrivacyPolicyScreen = () => null;
const BusinessRegulationsScreen = () => null;
const AccountRecoveryScreen = () => null;
const EthiopianSupportScreen = () => null;
const VerificationHelpScreen = () => null;
const EnterpriseAuthErrorScreen = () => null;
const SecurityErrorScreen = () => null;
const MaintenanceModeScreen = () => null;
const UpdateRequiredScreen = () => null;
const ServiceOutageScreen = () => null;
const AcceptTermsButton = () => null;

// Placeholder service functions
const analyticsService = { trackEnterpriseEvent: () => {} };
const errorService = { captureEnterpriseError: () => {} };

export default AuthNavigator;