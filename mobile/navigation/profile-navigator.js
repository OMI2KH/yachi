/**
 * Enterprise-level Profile Navigator for Yachi Mobile App
 * Comprehensive user profile management with Ethiopian market optimization
 * Multi-role profile system with AI-powered features
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';
import { usePremium } from '../contexts/premium-context';
import { Ionicons } from '@expo/vector-icons';

// Import Enterprise Profile Screens
import ProfileScreen from '../screens/profile/main';
import EditProfileScreen from '../screens/profile/edit';
import VerificationScreen from '../screens/profile/verification';
import PortfolioScreen from '../screens/profile/portfolio';
import DocumentsScreen from '../screens/profile/documents';
import SubscriptionScreen from '../screens/profile/subscription';
import PaymentMethodsScreen from '../screens/profile/payment-methods';
import SettingsScreen from '../screens/profile/settings';
import NotificationsScreen from '../screens/profile/notifications';
import SecurityScreen from '../screens/profile/security';
import HelpSupportScreen from '../screens/profile/help-support';
import AboutScreen from '../screens/profile/about';

// Import Role-Specific Enterprise Screens
import ClientProfileScreen from '../screens/profile/client-profile';
import WorkerProfileScreen from '../screens/profile/worker-profile';
import BusinessProfileScreen from '../screens/profile/business-profile';
import GovernmentProfileScreen from '../screens/profile/government-profile';

// Import Advanced Profile Features
import AIProfileOptimizationScreen from '../screens/profile/ai-optimization';
import GamificationDashboardScreen from '../screens/profile/gamification';
import AnalyticsDashboardScreen from '../screens/profile/analytics';
import AchievementScreen from '../screens/profile/achievements';

// Import Shared Components
import Navbar from '../components/Navbar';
import PremiumBadge from '../components/premium/premium-badge';
import VerificationBadge from '../components/profile/verification-badge';

// Import Enterprise Constants
import { ROUTES } from '../constants/navigation';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/sizes';
import { USER_ROLES, VERIFICATION_LEVELS } from '../constants/user';

const Stack = createNativeStackNavigator();

const ProfileNavigator = () => {
  const { theme, isDark } = useTheme();
  const { user, hasPermission, isVerified } = useAuth();
  const { isPremium, premiumFeatures } = usePremium();

  // Enterprise profile header configuration
  const enterpriseHeaderOptions = {
    headerStyle: {
      backgroundColor: theme.colors.background.primary,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    headerTintColor: theme.colors.text.primary,
    headerTitleStyle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    headerBackTitle: 'Back',
    headerBackTitleVisible: false,
  };

  // Dynamic role-based profile configuration
  const getRoleConfig = () => {
    const roleConfigs = {
      [USER_ROLES.CLIENT]: {
        screen: ClientProfileScreen,
        title: 'Client Profile',
        icon: 'person',
        features: ['bookings', 'favorites', 'reviews'],
        premiumFeatures: ['priority_booking', 'exclusive_deals']
      },
      [USER_ROLES.PROVIDER]: {
        screen: WorkerProfileScreen,
        title: 'Service Provider',
        icon: 'construct',
        features: ['portfolio', 'services', 'availability', 'earnings'],
        premiumFeatures: ['featured_listing', 'premium_badge']
      },
      [USER_ROLES.BUSINESS]: {
        screen: BusinessProfileScreen,
        title: 'Business Profile',
        icon: 'business',
        features: ['team_management', 'business_docs', 'analytics'],
        premiumFeatures: ['bulk_operations', 'advanced_analytics']
      },
      [USER_ROLES.GOVERNMENT]: {
        screen: GovernmentProfileScreen,
        title: 'Government Portal',
        icon: 'shield',
        features: ['project_management', 'workforce', 'reports'],
        premiumFeatures: ['ai_analytics', 'priority_support']
      },
      [USER_ROLES.ADMIN]: {
        screen: ProfileScreen,
        title: 'Admin Dashboard',
        icon: 'cog',
        features: ['user_management', 'system_analytics', 'moderation'],
        premiumFeatures: []
      }
    };
    return roleConfigs[user?.role] || roleConfigs[USER_ROLES.CLIENT];
  };

  // Get verification badge configuration
  const getVerificationConfig = () => {
    const verificationConfigs = {
      [VERIFICATION_LEVELS.BASIC]: {
        color: theme.colors.semantic.info.main,
        label: 'Basic Verification',
        icon: 'checkmark-circle'
      },
      [VERIFICATION_LEVELS.VERIFIED]: {
        color: theme.colors.semantic.success.main,
        label: 'Verified Account',
        icon: 'shield-checkmark'
      },
      [VERIFICATION_LEVELS.PREMIUM]: {
        color: theme.colors.primary.main,
        label: 'Premium Verified',
        icon: 'star'
      },
      [VERIFICATION_LEVELS.GOVERNMENT]: {
        color: theme.colors.secondary.main,
        label: 'Government Verified',
        icon: 'ribbon'
      }
    };
    return verificationConfigs[user?.verificationLevel] || verificationConfigs[VERIFICATION_LEVELS.BASIC];
  };

  // Check feature access based on role and premium status
  const canAccessFeature = (feature) => {
    const roleFeatures = {
      ai_optimization: [USER_ROLES.PROVIDER, USER_ROLES.BUSINESS],
      gamification: [USER_ROLES.CLIENT, USER_ROLES.PROVIDER],
      advanced_analytics: [USER_ROLES.BUSINESS, USER_ROLES.GOVERNMENT, USER_ROLES.ADMIN],
      team_management: [USER_ROLES.BUSINESS, USER_ROLES.GOVERNMENT],
      government_portal: [USER_ROLES.GOVERNMENT]
    };

    const hasRoleAccess = roleFeatures[feature]?.includes(user?.role);
    const requiresPremium = [
      'ai_optimization', 
      'advanced_analytics', 
      'premium_insights'
    ].includes(feature);

    return hasRoleAccess && (!requiresPremium || isPremium);
  };

  return (
    <Stack.Navigator
      initialRouteName={ROUTES.PROFILE.MAIN}
      screenOptions={{
        ...enterpriseHeaderOptions,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: theme.colors.background.primary,
        },
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {/* Main Profile Screen with Role Intelligence */}
      <Stack.Screen
        name={ROUTES.PROFILE.MAIN}
        component={getRoleConfig().screen}
        options={({ navigation }) => {
          const roleConfig = getRoleConfig();
          const verificationConfig = getVerificationConfig();
          
          return {
            title: roleConfig.title,
            header: (props) => (
              <Navbar
                {...props}
                title={roleConfig.title}
                subtitle={verificationConfig.label}
                subtitleColor={verificationConfig.color}
                showBackButton={false}
                showProfile={false}
                showNotifications={true}
                customActions={[
                  {
                    icon: 'settings',
                    onPress: () => navigation.navigate(ROUTES.PROFILE.SETTINGS),
                    badge: null
                  },
                  {
                    icon: 'star',
                    onPress: () => navigation.navigate(ROUTES.PROFILE.SUBSCRIPTION),
                    badge: isPremium ? 'PREMIUM' : 'UPGRADE'
                  }
                ]}
                headerRight={() => (
                  <VerificationBadge 
                    level={user?.verificationLevel}
                    size="small"
                  />
                )}
              />
            ),
          };
        }}
      />

      {/* AI Profile Optimization */}
      {canAccessFeature('ai_optimization') && (
        <Stack.Screen
          name={ROUTES.PROFILE.AI_OPTIMIZATION}
          component={AIProfileOptimizationScreen}
          options={({ navigation }) => ({
            title: 'AI Profile Optimization',
            header: (props) => (
              <Navbar
                {...props}
                title="AI Profile Optimization"
                subtitle="Boost your visibility"
                showBackButton={true}
                showProfile={false}
                customActions={[
                  {
                    icon: 'analytics',
                    onPress: () => navigation.navigate('OptimizationAnalytics')
                  },
                  {
                    icon: 'refresh',
                    onPress: () => navigation.setParams({ refresh: Date.now() })
                  }
                ]}
              />
            ),
          })}
        />
      )}

      {/* Gamification Dashboard */}
      {canAccessFeature('gamification') && (
        <Stack.Screen
          name={ROUTES.PROFILE.GAMIFICATION}
          component={GamificationDashboardScreen}
          options={({ navigation }) => ({
            title: 'Achievements & Rewards',
            header: (props) => (
              <Navbar
                {...props}
                title="Achievements & Rewards"
                subtitle={`Level ${user?.gamification?.level || 1}`}
                showBackButton={true}
                showProfile={false}
                customActions={[
                  {
                    icon: 'trophy',
                    onPress: () => navigation.navigate(ROUTES.PROFILE.ACHIEVEMENTS)
                  },
                  {
                    icon: 'stats-chart',
                    onPress: () => navigation.navigate('Leaderboard')
                  }
                ]}
              />
            ),
          })}
        />
      )}

      {/* Analytics Dashboard */}
      {canAccessFeature('advanced_analytics') && (
        <Stack.Screen
          name={ROUTES.PROFILE.ANALYTICS}
          component={AnalyticsDashboardScreen}
          options={({ navigation }) => ({
            title: 'Performance Analytics',
            header: (props) => (
              <Navbar
                {...props}
                title="Performance Analytics"
                subtitle="Real-time insights"
                showBackButton={true}
                showProfile={false}
                customActions={[
                  {
                    icon: 'download',
                    onPress: () => navigation.navigate('ExportAnalytics')
                  },
                  {
                    icon: 'filter',
                    onPress: () => navigation.navigate('AnalyticsFilters')
                  }
                ]}
              />
            ),
          })}
        />
      )}

      {/* Enterprise Edit Profile with AI Assistance */}
      <Stack.Screen
        name={ROUTES.PROFILE.EDIT}
        component={EditProfileScreen}
        options={({ navigation, route }) => ({
          title: 'Edit Profile',
          header: (props) => (
            <Navbar
              {...props}
              title="Edit Profile"
              subtitle="AI-powered optimization"
              showBackButton={true}
              showProfile={false}
              customActions={[
                {
                  icon: 'sparkles',
                  onPress: () => navigation.navigate('AIAssist', route.params),
                  badge: 'AI'
                },
                {
                  icon: 'save',
                  onPress: () => navigation.getParent()?.setParams({ saveProfile: true })
                }
              ]}
            />
          ),
        })}
      />

      {/* Advanced Verification System */}
      <Stack.Screen
        name={ROUTES.PROFILE.VERIFICATION}
        component={VerificationScreen}
        options={({ navigation, route }) => ({
          title: 'Account Verification',
          header: (props) => (
            <Navbar
              {...props}
              title="Account Verification"
              subtitle={`${user?.verificationProgress || 0}% Complete`}
              showBackButton={true}
              showProfile={false}
              customActions={[
                {
                  icon: 'shield-checkmark',
                  onPress: () => navigation.navigate('VerificationStatus')
                },
                {
                  icon: 'help-buoy',
                  onPress: () => navigation.navigate('VerificationHelp')
                }
              ]}
            />
          ),
        })}
      />

      {/* Enhanced Portfolio Management */}
      <Stack.Screen
        name={ROUTES.PROFILE.PORTFOLIO}
        component={PortfolioScreen}
        options={({ navigation }) => ({
          title: 'Professional Portfolio',
          header: (props) => (
            <Navbar
              {...props}
              title="Professional Portfolio"
              subtitle={`${user?.portfolioItems || 0} projects`}
              showBackButton={true}
              showProfile={false}
              customActions={[
                {
                  icon: 'add',
                  onPress: () => navigation.navigate('AddPortfolioItem')
                },
                {
                  icon: 'grid',
                  onPress: () => navigation.navigate('PortfolioTemplates')
                }
              ]}
            />
          ),
        })}
      />

      {/* Enterprise Document Management */}
      <Stack.Screen
        name={ROUTES.PROFILE.DOCUMENTS}
        component={DocumentsScreen}
        options={({ navigation }) => ({
          title: 'Document Management',
          header: (props) => (
            <Navbar
              {...props}
              title="Document Management"
              subtitle="Secure file storage"
              showBackButton={true}
              showProfile={false}
              customActions={[
                {
                  icon: 'cloud-upload',
                  onPress: () => navigation.navigate('UploadDocuments')
                },
                {
                  icon: 'scan',
                  onPress: () => navigation.navigate('DocumentScanner')
                }
              ]}
            />
          ),
        })}
      />

      {/* Premium Subscription Hub */}
      <Stack.Screen
        name={ROUTES.PROFILE.SUBSCRIPTION}
        component={SubscriptionScreen}
        options={({ navigation }) => ({
          title: 'Premium Features',
          header: (props) => (
            <Navbar
              {...props}
              title="Premium Features"
              subtitle={isPremium ? 'Active' : 'Upgrade Today'}
              subtitleColor={isPremium ? theme.colors.semantic.success.main : theme.colors.primary.main}
              showBackButton={true}
              showProfile={false}
              customActions={[
                {
                  icon: 'gift',
                  onPress: () => navigation.navigate('ReferralProgram')
                },
                {
                  icon: 'business',
                  onPress: () => navigation.navigate('BusinessPlans')
                }
              ]}
            />
          ),
        })}
      />

      {/* Ethiopian Payment Methods */}
      <Stack.Screen
        name={ROUTES.PROFILE.PAYMENT_METHODS}
        component={PaymentMethodsScreen}
        options={({ navigation }) => ({
          title: 'Payment Methods',
          header: (props) => (
            <Navbar
              {...props}
              title="Payment Methods"
              subtitle="Ethiopian Payment Gateways"
              showBackButton={true}
              showProfile={false}
              customActions={[
                {
                  icon: 'add',
                  onPress: () => navigation.navigate('AddPaymentMethod')
                },
                {
                  icon: 'swap-horizontal',
                  onPress: () => navigation.navigate('PaymentPreferences')
                }
              ]}
            />
          ),
        })}
      />

      {/* Advanced Settings with Role-based Options */}
      <Stack.Screen
        name={ROUTES.PROFILE.SETTINGS}
        component={SettingsScreen}
        options={({ navigation }) => ({
          title: 'Settings & Preferences',
          header: (props) => (
            <Navbar
              {...props}
              title="Settings & Preferences"
              subtitle="Customize your experience"
              showBackButton={true}
              showProfile={false}
              customActions={[
                {
                  icon: 'language',
                  onPress: () => navigation.navigate('LanguageSettings')
                }
              ]}
            />
          ),
        })}
      />

      {/* Enterprise Feature Groups */}
      <Stack.Group
        screenOptions={{
          presentation: 'containedModal',
          headerShown: true,
          animation: 'slide_from_bottom',
        }}
      >
        {/* Ethiopian Market Specific Features */}
        <Stack.Screen
          name="EthiopianIDVerification"
          component={EthiopianIDVerificationScreen}
          options={{
            title: 'Ethiopian ID Verification',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        <Stack.Screen
          name="BusinessRegistrationET"
          component={BusinessRegistrationETScreen}
          options={{
            title: 'Ethiopian Business Registration',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* AI-Powered Features */}
        <Stack.Screen
          name="AIAssist"
          component={AIAssistScreen}
          options={{
            title: 'AI Profile Assistant',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        <Stack.Screen
          name="OptimizationAnalytics"
          component={OptimizationAnalyticsScreen}
          options={{
            title: 'Optimization Analytics',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* Gamification Features */}
        <Stack.Screen
          name={ROUTES.PROFILE.ACHIEVEMENTS}
          component={AchievementScreen}
          options={{
            title: 'My Achievements',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            title: 'Community Leaderboard',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />
      </Stack.Group>

      {/* Role-Specific Enterprise Features */}
      <Stack.Group
        screenOptions={{
          presentation: 'card',
          headerShown: true,
        }}
      >
        {/* Service Provider Enterprise Features */}
        <Stack.Screen
          name="ServiceCatalog"
          component={ServiceCatalogScreen}
          options={{
            title: 'Service Catalog Management',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        <Stack.Screen
          name="AdvancedAvailability"
          component={AdvancedAvailabilityScreen}
          options={{
            title: 'Advanced Availability',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        <Stack.Screen
          name="EarningsAnalytics"
          component={EarningsAnalyticsScreen}
          options={{
            title: 'Earnings Analytics',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* Business Account Features */}
        <Stack.Screen
          name="TeamManagement"
          component={TeamManagementScreen}
          options={{
            title: 'Team Management',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        <Stack.Screen
          name="BusinessAnalytics"
          component={BusinessAnalyticsScreen}
          options={{
            title: 'Business Analytics',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* Government Portal Features */}
        <Stack.Screen
          name="GovernmentDashboard"
          component={GovernmentDashboardScreen}
          options={{
            title: 'Government Dashboard',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        <Stack.Screen
          name="InfrastructureProjects"
          component={InfrastructureProjectsScreen}
          options={{
            title: 'Infrastructure Projects',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />
      </Stack.Group>

      {/* Emergency & Security Screens */}
      <Stack.Group
        screenOptions={{
          presentation: 'fullScreenModal',
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen
          name="ProfileSecurityAlert"
          component={ProfileSecurityAlertScreen}
        />

        <Stack.Screen
          name="VerificationEmergency"
          component={VerificationEmergencyScreen}
        />

        <Stack.Screen
          name="PremiumExpired"
          component={PremiumExpiredScreen}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};

// Enterprise Profile Navigation Service
export const ProfileNavigationService = {
  // Smart profile navigation with AI recommendations
  navigateToProfileSection: (section, options = {}) => {
    const navigationRef = require('./app-navigator').NavigationService;
    const { user } = require('../contexts/auth-context').useAuth();
    
    const smartSections = {
      verification: {
        screen: ROUTES.PROFILE.VERIFICATION,
        params: { 
          autoStart: true,
          recommendedLevel: getRecommendedVerificationLevel(user)
        }
      },
      portfolio: {
        screen: ROUTES.PROFILE.PORTFOLIO,
        params: { 
          aiRecommendations: true,
          optimizedLayout: true 
        }
      },
      subscription: {
        screen: ROUTES.PROFILE.SUBSCRIPTION,
        params: { 
          recommendedPlan: getRecommendedPlan(user),
          showBenefits: true 
        }
      }
    };

    const sectionConfig = smartSections[section];
    if (sectionConfig) {
      navigationRef.navigate(sectionConfig.screen, {
        ...sectionConfig.params,
        ...options
      });
    }
  },

  // AI-powered profile optimization flow
  navigateToAIOptimization: (optimizationType = 'auto') => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.PROFILE.AI_OPTIMIZATION, {
      optimizationType,
      autoAnalyze: true,
      showRecommendations: true
    });
  },

  // Ethiopian market specialized flows
  navigateToEthiopianVerification: (idType, options = {}) => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate('EthiopianIDVerification', {
      idType,
      country: 'Ethiopia',
      autoDetect: true,
      governmentAPI: true,
      ...options
    });
  },

  navigateToBusinessRegistrationET: (businessType, region) => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate('BusinessRegistrationET', {
      businessType,
      region,
      ethiopianCompliance: true,
      autoFillGovernmentData: true
    });
  },

  // Gamification and engagement flows
  navigateToGamification: (feature = 'dashboard') => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.PROFILE.GAMIFICATION, {
      feature,
      showRewards: true,
      communityRanking: true
    });
  },

  navigateToAchievements: (category = 'all') => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.PROFILE.ACHIEVEMENTS, {
      category,
      showProgress: true,
      upcomingChallenges: true
    });
  },

  // Advanced analytics navigation
  navigateToAnalytics: (timeframe = 'monthly', metrics = []) => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.PROFILE.ANALYTICS, {
      timeframe,
      metrics,
      comparativeAnalysis: true,
      predictiveInsights: true
    });
  },

  // Role-specific enterprise navigation
  navigateToRoleDashboard: (role, section = 'main') => {
    const navigationRef = require('./app-navigator').NavigationService;
    
    const roleDashboards = {
      [USER_ROLES.PROVIDER]: {
        main: 'ServiceCatalog',
        earnings: 'EarningsAnalytics',
        availability: 'AdvancedAvailability'
      },
      [USER_ROLES.BUSINESS]: {
        main: 'TeamManagement',
        analytics: 'BusinessAnalytics',
        operations: 'BusinessOperations'
      },
      [USER_ROLES.GOVERNMENT]: {
        main: 'GovernmentDashboard',
        projects: 'InfrastructureProjects',
        workforce: 'WorkforceManagement'
      }
    };

    const screen = roleDashboards[role]?.[section];
    if (screen) {
      navigationRef.navigate(screen, {
        role,
        enterpriseView: true
      });
    }
  },

  // Security and compliance navigation
  navigateToSecurityCenter: (alertLevel = 'normal') => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate('Security', {
      alertLevel,
      securityScan: true,
      complianceCheck: true
    });
  }
};

// AI Recommendation Engine for Profiles
const getRecommendedVerificationLevel = (user) => {
  const { role, completedBookings, rating, portfolioItems } = user || {};
  
  if (role === USER_ROLES.PROVIDER && completedBookings > 10 && rating >= 4.5) {
    return VERIFICATION_LEVELS.PREMIUM;
  }
  if (portfolioItems >= 5 || completedBookings >= 5) {
    return VERIFICATION_LEVELS.VERIFIED;
  }
  return VERIFICATION_LEVELS.BASIC;
};

const getRecommendedPlan = (user) => {
  const { role, monthlyEarnings, teamSize } = user || {};
  
  if (role === USER_ROLES.BUSINESS && teamSize > 5) {
    return 'business_pro';
  }
  if (monthlyEarnings > 50000) { // 50,000 ETB
    return 'premium_plus';
  }
  if (monthlyEarnings > 20000) { // 20,000 ETB
    return 'premium';
  }
  return 'basic';
};

// Ethiopian Market Utilities
export const EthiopianProfileService = {
  // Comprehensive Ethiopian region data
  getEthiopianRegions: () => [
    {
      value: 'addis_ababa',
      label: 'Addis Ababa',
      cities: ['Addis Ababa', 'Bishoftu', 'Sebeta', 'Holeta', 'Sendafa']
    },
    {
      value: 'oromia',
      label: 'Oromia',
      cities: ['Adama', 'Jimma', 'Ambo', 'Nekemte', 'Shashamane', 'Bishoftu']
    },
    {
      value: 'amhara',
      label: 'Amhara', 
      cities: ['Bahir Dar', 'Gondar', 'Dessie', 'Debre Markos', 'Debre Birhan']
    },
    {
      value: 'tigray',
      label: 'Tigray',
      cities: ['Mekelle', 'Adigrat', 'Axum', 'Shire', 'Adwa']
    },
    {
      value: 'snnpr',
      label: 'Southern Nations',
      cities: ['Hawassa', 'Arba Minch', 'Dilla', 'Wolaita Sodo', 'Hosaena']
    }
  ],

  // Ethiopian business types
  getEthiopianBusinessTypes: () => [
    'Sole Proprietorship',
    'Private Limited Company',
    'Share Company', 
    'Partnership',
    'Cooperative Society',
    'Government Enterprise'
  ],

  // Ethiopian compliance validation
  validateBusinessRegistration: (businessData) => {
    const requiredFields = [
      'businessName',
      'businessType', 
      'tinNumber',
      'businessLicense',
      'region',
      'city'
    ];

    const errors = [];
    
    if (!businessData.tinNumber?.match(/^\d{10}$/)) {
      errors.push('TIN must be 10 digits');
    }
    
    if (!businessData.businessLicense?.match(/^[A-Z0-9]{8,12}$/)) {
      errors.push('Invalid business license format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingFields: requiredFields.filter(field => !businessData[field])
    };
  }
};

// Placeholder components for enterprise features
const AIProfileOptimizationScreen = () => null;
const GamificationDashboardScreen = () => null;
const AnalyticsDashboardScreen = () => null;
const AchievementScreen = () => null;
const AIAssistScreen = () => null;
const OptimizationAnalyticsScreen = () => null;
const LeaderboardScreen = () => null;
const EthiopianIDVerificationScreen = () => null;
const BusinessRegistrationETScreen = () => null;
const ServiceCatalogScreen = () => null;
const AdvancedAvailabilityScreen = () => null;
const EarningsAnalyticsScreen = () => null;
const TeamManagementScreen = () => null;
const BusinessAnalyticsScreen = () => null;
const GovernmentDashboardScreen = () => null;
const InfrastructureProjectsScreen = () => null;
const ProfileSecurityAlertScreen = () => null;
const VerificationEmergencyScreen = () => null;
const PremiumExpiredScreen = () => null;

export default ProfileNavigator;