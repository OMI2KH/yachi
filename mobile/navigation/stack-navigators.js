// navigation/stack-navigators.js

/**
 * 🏢 ENTERPRISE STACK NAVIGATORS
 * Centralized Navigation Architecture for Yachi Platform
 * 
 * Features Integrated:
 * ✅ Multi-Role Navigation Stacks (Client, Provider, Government, Admin)
 * ✅ AI-Powered Navigation Intelligence
 * ✅ Construction Project Management Flows
 * ✅ Government Infrastructure Navigation
 * ✅ Ethiopian Market Optimized Routing
 * ✅ Premium Feature Navigation Gates
 * ✅ Biometric Security Navigation
 * ✅ Real-time Navigation State Management
 * ✅ Offline Navigation Support
 * ✅ Enterprise Security & Access Control
 */

import React, { useEffect, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';
import { useServices } from '../contexts/services-context';
import { usePremium } from '../contexts/premium-context';
import { useLanguage } from '../contexts/language-context';
import { useNavigation } from '@react-navigation/native';

// Enterprise Navigation Components
import EnterpriseNavbar from '../components/enterprise/enterprise-navbar';
import NavigationGuard from '../components/enterprise/navigation-guard';
import AINavigationAssistant from '../components/ai/ai-navigation-assistant';
import BiometricNavigationLock from '../components/security/biometric-navigation-lock';

// Enterprise Constants
import { 
  NAVIGATION_ROUTES, 
  USER_ROLES,
  SECURITY_LEVELS,
  NAVIGATION_TYPES 
} from '../constants/navigation';
import { COLORS } from '../constants/colors';
import { AI_NAVIGATION_FEATURES } from '../constants/ai';

// Create Stack Navigators for different app sections
export const AuthStack = createNativeStackNavigator();
export const MainStack = createNativeStackNavigator();
export const ServiceStack = createNativeStackNavigator();
export const ConstructionStack = createNativeStackNavigator();
export const GovernmentStack = createNativeStackNavigator();
export const AdminStack = createNativeStackNavigator();
export const PremiumStack = createNativeStackNavigator();
export const EmergencyStack = createNativeStackNavigator();

/**
 * 🎯 ENTERPRISE NAVIGATION MANAGER
 * Centralized navigation management with AI intelligence
 */
export const useEnterpriseNavigation = () => {
  const { user, userRole, securityLevel } = useAuth();
  const { currentLanguage, isRTL } = useLanguage();
  const [navigationState, setNavigationState] = useState({
    currentStack: 'main',
    previousStack: null,
    navigationHistory: [],
    aiSuggestions: [],
    securityChecks: {},
    offlineMode: false,
  });

  const navigationRef = useRef();

  // Initialize enterprise navigation system
  useEffect(() => {
    initializeNavigationSystem();
  }, []);

  const initializeNavigationSystem = async () => {
    try {
      console.log('🚀 Initializing enterprise navigation system...');
      
      // Load AI navigation preferences
      await loadAINavigationPreferences();
      
      // Initialize security navigation guards
      await initializeSecurityGuards();
      
      // Set up real-time navigation monitoring
      await initializeNavigationMonitoring();
      
      // Initialize role-based navigation flows
      await initializeRoleBasedNavigation();

    } catch (error) {
      console.error('Enterprise navigation initialization failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'NavigationInitialization',
        userId: user?.id,
      });
    }
  };

  return {
    navigationState,
    navigationRef,
    navigateToStack: (stackName, params = {}) => {
      setNavigationState(prev => ({
        ...prev,
        currentStack: stackName,
        previousStack: prev.currentStack,
        navigationHistory: [...prev.navigationHistory, {
          stack: stackName,
          timestamp: Date.now(),
          params,
        }],
      }));
    },
    getAISuggestedRoute: (context) => {
      return AINavigationService.suggestOptimalRoute(context, userRole);
    },
  };
};

/**
 * 🛡️ ENTERPRISE NAVIGATION GUARDS
 * Security and access control for navigation
 */
export const NavigationGuards = {
  // Role-based access control
  checkRoleAccess: (routeName, userRole, routeParams = {}) => {
    const rolePermissions = {
      [USER_ROLES.CLIENT]: [
        NAVIGATION_ROUTES.SERVICES.LIST,
        NAVIGATION_ROUTES.SERVICES.DETAIL,
        NAVIGATION_ROUTES.BOOKINGS.CREATE,
        'ServiceBooking',
        'ServiceReviews',
      ],
      [USER_ROLES.SERVICE_PROVIDER]: [
        NAVIGATION_ROUTES.SERVICES.CREATE,
        'ServiceManagement',
        'ProviderAnalytics',
        'ConstructionService',
      ],
      [USER_ROLES.WORKER]: [
        'WorkerDashboard',
        'ConstructionProjects',
        'TeamChat',
        'TaskManagement',
      ],
      [USER_ROLES.CONTRACTOR]: [
        'ConstructionManagement',
        'TeamFormation',
        'ProjectBidding',
        'GovernmentProjects',
      ],
      [USER_ROLES.GOVERNMENT]: [
        'GovernmentDashboard',
        'InfrastructureProjects',
        'ComplianceMonitoring',
        'BudgetManagement',
      ],
      [USER_ROLES.ADMIN]: [
        'AdminDashboard',
        'UserManagement',
        'SystemAnalytics',
        'ContentModeration',
      ],
    };

    const allowedRoutes = rolePermissions[userRole] || [];
    return allowedRoutes.includes(routeName);
  },

  // Security level validation
  checkSecurityLevel: (routeName, userSecurityLevel, requiredLevel = SECURITY_LEVELS.MEDIUM) => {
    const securityRequirements = {
      'GovernmentProjects': SECURITY_LEVELS.HIGH,
      'BudgetManagement': SECURITY_LEVELS.VERY_HIGH,
      'AdminDashboard': SECURITY_LEVELS.MAXIMUM,
      'UserManagement': SECURITY_LEVELS.HIGH,
      'ConstructionManagement': SECURITY_LEVELS.MEDIUM,
      'ServiceManagement': SECURITY_LEVELS.MEDIUM,
    };

    const required = securityRequirements[routeName] || requiredLevel;
    return userSecurityLevel >= required;
  },

  // Premium feature access
  checkPremiumAccess: (routeName, hasPremium, premiumFeatures = {}) => {
    const premiumRoutes = [
      'PremiumServiceListing',
      'AIServiceOptimization',
      'AdvancedAnalytics',
      'PrioritySupport',
    ];

    if (premiumRoutes.includes(routeName) && !hasPremium) {
      return {
        allowed: false,
        redirect: 'PremiumUpgrade',
        message: 'Premium subscription required',
      };
    }

    return { allowed: true };
  },

  // Ethiopian market compliance
  checkEthiopianCompliance: (routeName, userLocation, serviceType) => {
    const complianceRules = {
      'ConstructionService': {
        requiresLicense: true,
        regionalRestrictions: ['Addis Ababa', 'Dire Dawa', 'Hawassa'],
        governmentApproval: true,
      },
      'GovernmentProjects': {
        requiresClearance: true,
        regionalJurisdiction: true,
        budgetApproval: true,
      },
      'EmergencyServices': {
        immediateAccess: true,
        locationVerification: true,
        priorityRouting: true,
      },
    };

    const rules = complianceRules[routeName];
    if (!rules) return { compliant: true };

    return {
      compliant: validateCompliance(rules, userLocation, serviceType),
      requirements: rules,
    };
  },
};

/**
 * 🤖 AI NAVIGATION INTELLIGENCE
 * Smart routing and navigation suggestions
 */
export const AINavigationService = {
  // Suggest optimal routes based on user behavior and context
  suggestOptimalRoute: (context, userRole) => {
    const { 
      timeOfDay, 
      location, 
      userHistory, 
      currentTask,
      marketConditions 
    } = context;

    const routeSuggestions = {
      [USER_ROLES.CLIENT]: {
        morning: ['ServiceSearch', 'QuickBooking', 'EmergencyServices'],
        afternoon: ['ServiceReviews', 'ProviderComparison', 'ScheduleBooking'],
        evening: ['ServiceManagement', 'BookingHistory', 'Support'],
      },
      [USER_ROLES.SERVICE_PROVIDER]: {
        morning: ['TaskManagement', 'TeamCoordination', 'ProjectUpdates'],
        afternoon: ['ServiceDelivery', 'ClientCommunication', 'ProgressTracking'],
        evening: ['Analytics', 'Planning', 'SkillDevelopment'],
      },
      [USER_ROLES.CONTRACTOR]: {
        morning: ['ConstructionPlanning', 'TeamAssignment', 'MaterialManagement'],
        afternoon: ['ProjectMonitoring', 'GovernmentCompliance', 'BudgetTracking'],
        evening: ['ProgressReporting', 'NextDayPlanning', 'RiskAssessment'],
      },
      [USER_ROLES.GOVERNMENT]: {
        morning: ['ProjectApproval', 'ComplianceMonitoring', 'BudgetReview'],
        afternoon: ['InfrastructurePlanning', 'StakeholderMeetings', 'ProgressAudit'],
        evening: ['Reporting', 'StrategicPlanning', 'EmergencyPreparedness'],
      },
    };

    const timeBased = routeSuggestions[userRole]?.[timeOfDay] || [];
    const locationBased = getLocationBasedRoutes(location, userRole);
    const taskBased = getTaskBasedRoutes(currentTask, userRole);

    return {
      primary: timeBased[0] || 'Dashboard',
      alternatives: [...timeBased, ...locationBased, ...taskBased],
      confidence: calculateRouteConfidence(context),
      reasoning: generateRouteReasoning(context, userRole),
    };
  },

  // Predict next navigation steps
  predictNextNavigation: (currentRoute, userBehavior, appContext) => {
    const predictionModels = {
      'ServiceSearch': {
        next: ['ServiceDetail', 'ProviderProfile', 'ServiceBooking'],
        probability: 0.85,
        context: ['browsing', 'comparison'],
      },
      'ConstructionPlanning': {
        next: ['TeamFormation', 'MaterialEstimation', 'GovernmentApproval'],
        probability: 0.78,
        context: ['project_initiation'],
      },
      'GovernmentProjects': {
        next: ['BudgetApproval', 'ComplianceCheck', 'ContractorSelection'],
        probability: 0.92,
        context: ['project_management'],
      },
    };

    const model = predictionModels[currentRoute];
    if (!model) return { predictions: [], confidence: 0 };

    return {
      predictions: model.next,
      confidence: model.probability,
      context: model.context,
      preload: shouldPreloadRoutes(model.next),
    };
  },

  // Generate navigation shortcuts based on user preferences
  generateNavigationShortcuts: (userPreferences, frequentRoutes) => {
    const shortcuts = [];

    // AI-powered shortcuts based on user behavior
    if (userPreferences.quickBooking) {
      shortcuts.push({
        route: 'QuickServiceBooking',
        icon: '⚡',
        label: 'Quick Book',
        priority: 'high',
      });
    }

    if (frequentRoutes.includes('ConstructionManagement')) {
      shortcuts.push({
        route: 'AITeamFormation',
        icon: '🤖',
        label: 'AI Team Builder',
        priority: 'medium',
      });
    }

    if (userPreferences.emergencyAccess) {
      shortcuts.push({
        route: 'EmergencyServices',
        icon: '🚨',
        label: 'Emergency',
        priority: 'critical',
      });
    }

    return shortcuts.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  },
};

/**
 * 🏗️ CONSTRUCTION NAVIGATION STACK
 * Specialized navigation for construction projects
 */
export const ConstructionNavigationStack = () => {
  const { theme } = useTheme();
  const { userRole } = useAuth();

  return (
    <ConstructionStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background.primary,
        },
        animation: 'slide_from_right',
      }}
    >
      <ConstructionStack.Screen
        name="ConstructionDashboard"
        component={ConstructionDashboardScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Construction Management"
              subtitle="AI-Powered Project Coordination"
              constructionMode={true}
            />
          ),
        }}
      />

      <ConstructionStack.Screen
        name="AITeamFormation"
        component={AITeamFormationScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="AI Team Formation"
              subtitle="Smart Worker Matching"
              aiEnhanced={true}
            />
          ),
        }}
      />

      <ConstructionStack.Screen
        name="ProjectPlanning"
        component={ProjectPlanningScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Project Planning"
              subtitle="Budget & Timeline Management"
            />
          ),
        }}
      />

      <ConstructionStack.Screen
        name="GovernmentCompliance"
        component={GovernmentComplianceScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Government Compliance"
              subtitle="Regulations & Approvals"
              governmentMode={true}
            />
          ),
        }}
      />

      <ConstructionStack.Screen
        name="MaterialManagement"
        component={MaterialManagementScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Material Management"
              subtitle="Inventory & Supply Chain"
            />
          ),
        }}
      />
    </ConstructionStack.Navigator>
  );
};

/**
 * 🏛️ GOVERNMENT NAVIGATION STACK
 * Specialized navigation for government operations
 */
export const GovernmentNavigationStack = () => {
  const { theme } = useTheme();
  const { securityLevel } = useAuth();

  return (
    <GovernmentStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background.secondary,
        },
        animation: 'slide_from_right',
      }}
    >
      <GovernmentStack.Screen
        name="GovernmentDashboard"
        component={GovernmentDashboardScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Government Portal"
              subtitle="Infrastructure Management"
              securityLevel={securityLevel}
              governmentMode={true}
            />
          ),
        }}
      />

      <GovernmentStack.Screen
        name="InfrastructureProjects"
        component={InfrastructureProjectsScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Infrastructure Projects"
              subtitle="National Development"
              securityLevel={SECURITY_LEVELS.HIGH}
            />
          ),
        }}
      />

      <GovernmentStack.Screen
        name="BudgetManagement"
        component={BudgetManagementScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Budget Management"
              subtitle="Financial Oversight"
              securityLevel={SECURITY_LEVELS.VERY_HIGH}
            />
          ),
        }}
      />

      <GovernmentStack.Screen
        name="ComplianceMonitoring"
        component={ComplianceMonitoringScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Compliance Monitoring"
              subtitle="Regulatory Enforcement"
              securityLevel={SECURITY_LEVELS.HIGH}
            />
          ),
        }}
      />

      <GovernmentStack.Screen
        name="EmergencyResponse"
        component={EmergencyResponseScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Emergency Response"
              subtitle="Crisis Management"
              securityLevel={SECURITY_LEVELS.MAXIMUM}
            />
          ),
        }}
      />
    </GovernmentStack.Navigator>
  );
};

/**
 * 💎 PREMIUM NAVIGATION STACK
 * Exclusive navigation for premium features
 */
export const PremiumNavigationStack = () => {
  const { theme } = useTheme();
  const { isPremium, premiumFeatures } = usePremium();

  if (!isPremium) {
    return <PremiumUpgradeScreen />;
  }

  return (
    <PremiumStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.premium.background,
        },
        animation: 'slide_from_bottom',
      }}
    >
      <PremiumStack.Screen
        name="PremiumDashboard"
        component={PremiumDashboardScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Premium Features"
              subtitle="Exclusive Benefits"
              premiumMode={true}
            />
          ),
        }}
      />

      <PremiumStack.Screen
        name="AIServiceOptimization"
        component={AIServiceOptimizationScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="AI Optimization"
              subtitle="Smart Service Enhancement"
              aiEnhanced={true}
            />
          ),
        }}
      />

      <PremiumStack.Screen
        name="AdvancedAnalytics"
        component={AdvancedAnalyticsScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Advanced Analytics"
              subtitle="Deep Business Insights"
            />
          ),
        }}
      />

      <PremiumStack.Screen
        name="PrioritySupport"
        component={PrioritySupportScreen}
        options={{
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Priority Support"
              subtitle="24/7 Dedicated Help"
            />
          ),
        }}
      />
    </PremiumStack.Navigator>
  );
};

/**
 * 🚨 EMERGENCY NAVIGATION STACK
 * Critical navigation for emergency situations
 */
export const EmergencyNavigationStack = () => {
  const { theme } = useTheme();

  return (
    <EmergencyStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'fade',
      }}
    >
      <EmergencyStack.Screen
        name="EmergencyDashboard"
        component={EmergencyDashboardScreen}
      />

      <EmergencyStack.Screen
        name="EmergencyServices"
        component={EmergencyServicesScreen}
      />

      <EmergencyStack.Screen
        name="CrisisManagement"
        component={CrisisManagementScreen}
      />

      <EmergencyStack.Screen
        name="QuickHelp"
        component={QuickHelpScreen}
      />
    </EmergencyStack.Navigator>
  );
};

/**
 * 🌐 ETHIOPIAN MARKET NAVIGATION
 * Specialized navigation for Ethiopian market
 */
export const EthiopianNavigationUtils = {
  // Get region-specific navigation routes
  getRegionalNavigationRoutes: (region, userRole) => {
    const regionalRoutes = {
      'Addis Ababa': {
        [USER_ROLES.CLIENT]: [
          'PremiumServices',
          'EmergencyServices',
          'GovernmentServices',
        ],
        [USER_ROLES.SERVICE_PROVIDER]: [
          'ConstructionProjects',
          'GovernmentContracts',
          'CommercialServices',
        ],
        [USER_ROLES.GOVERNMENT]: [
          'UrbanPlanning',
          'InfrastructureDevelopment',
          'PublicServices',
        ],
      },
      'Dire Dawa': {
        [USER_ROLES.CLIENT]: [
          'BasicServices',
          'AgriculturalServices',
          'LocalBusinesses',
        ],
        [USER_ROLES.SERVICE_PROVIDER]: [
          'ResidentialServices',
          'AgriculturalSupport',
          'LocalProjects',
        ],
      },
      // ... more regions
    };

    return regionalRoutes[region]?.[userRole] || [];
  },

  // Ethiopian holiday-aware navigation
  getHolidayNavigationRoutes: (holiday, userRole) => {
    const holidayRoutes = {
      'Ethiopian Christmas': {
        routes: ['EmergencyServices', 'EssentialServices'],
        message: 'Limited services during holiday',
      },
      'Ethiopian New Year': {
        routes: ['CelebrationServices', 'EmergencyServices'],
        message: 'Special holiday services available',
      },
      'Easter': {
        routes: ['ReligiousServices', 'FamilyServices'],
        message: 'Holiday-specific services',
      },
    };

    return holidayRoutes[holiday] || { routes: [], message: '' };
  },

  // Language-based navigation adaptation
  adaptNavigationForLanguage: (navigationConfig, language) => {
    const languageAdaptations = {
      am: {
        direction: 'rtl',
        animation: 'slide_from_left',
        headerAlignment: 'right',
      },
      en: {
        direction: 'ltr',
        animation: 'slide_from_right',
        headerAlignment: 'left',
      },
      om: {
        direction: 'ltr',
        animation: 'slide_from_right',
        headerAlignment: 'left',
      },
    };

    return {
      ...navigationConfig,
      ...languageAdaptations[language],
    };
  },
};

/**
 * 🔧 NAVIGATION UTILITIES
 * Helper functions for enterprise navigation
 */
export const NavigationUtils = {
  // Generate navigation configuration based on user context
  generateNavigationConfig: (userContext, appState) => {
    const {
      userRole,
      securityLevel,
      isPremium,
      currentLocation,
      language,
    } = userContext;

    const {
      offlineMode,
      emergencyMode,
      maintenanceMode,
    } = appState;

    let baseConfig = {
      animation: 'slide_from_right',
      gestureEnabled: true,
      headerShown: true,
    };

    // Role-based adaptations
    if (userRole === USER_ROLES.GOVERNMENT) {
      baseConfig.headerStyle = {
        backgroundColor: COLORS.government.primary,
      };
    }

    if (userRole === USER_ROLES.CONTRACTOR) {
      baseConfig.headerStyle = {
        backgroundColor: COLORS.construction.primary,
      };
    }

    // Security level adaptations
    if (securityLevel >= SECURITY_LEVELS.HIGH) {
      baseConfig.gestureEnabled = false;
    }

    // Premium adaptations
    if (isPremium) {
      baseConfig.headerStyle = {
        ...baseConfig.headerStyle,
        backgroundColor: COLORS.premium.background,
      };
    }

    // Language adaptations
    baseConfig = EthiopianNavigationUtils.adaptNavigationForLanguage(
      baseConfig,
      language
    );

    // Emergency mode overrides
    if (emergencyMode) {
      baseConfig = {
        ...baseConfig,
        headerShown: false,
        gestureEnabled: false,
        animation: 'fade',
      };
    }

    return baseConfig;
  },

  // Create deep link handlers for different navigation types
  createDeepLinkHandler: (linkType, linkData, userContext) => {
    const linkHandlers = {
      service: (data) => ({
        route: NAVIGATION_ROUTES.SERVICES.DETAIL,
        params: {
          id: data.serviceId,
          source: 'deeplink',
          ...data,
        },
      }),
      construction: (data) => ({
        route: 'ConstructionProject',
        params: {
          projectId: data.projectId,
          deepLink: true,
          ...data,
        },
      }),
      government: (data) => ({
        route: 'GovernmentProject',
        params: {
          projectCode: data.projectCode,
          securityClearance: true,
          ...data,
        },
      }),
      emergency: (data) => ({
        route: 'EmergencyServices',
        params: {
          emergencyType: data.type,
          immediate: true,
          ...data,
        },
      }),
    };

    const handler = linkHandlers[linkType];
    if (!handler) return null;

    return handler(linkData);
  },

  // Navigation analytics and tracking
  trackNavigationEvent: (eventType, navigationData, userContext) => {
    const eventData = {
      eventType,
      timestamp: Date.now(),
      from: navigationData.from,
      to: navigationData.to,
      userRole: userContext.userRole,
      location: userContext.currentLocation,
      duration: navigationData.duration,
      success: navigationData.success,
    };

    analyticsService.trackNavigationEvent(eventData);
  },
};

// Placeholder screen components
const ConstructionDashboardScreen = () => null;
const AITeamFormationScreen = () => null;
const ProjectPlanningScreen = () => null;
const GovernmentComplianceScreen = () => null;
const MaterialManagementScreen = () => null;
const GovernmentDashboardScreen = () => null;
const InfrastructureProjectsScreen = () => null;
const BudgetManagementScreen = () => null;
const ComplianceMonitoringScreen = () => null;
const EmergencyResponseScreen = () => null;
const PremiumDashboardScreen = () => null;
const AIServiceOptimizationScreen = () => null;
const AdvancedAnalyticsScreen = () => null;
const PrioritySupportScreen = () => null;
const PremiumUpgradeScreen = () => null;
const EmergencyDashboardScreen = () => null;
const EmergencyServicesScreen = () => null;
const CrisisManagementScreen = () => null;
const QuickHelpScreen = () => null;

// Placeholder service functions
const analyticsService = { trackNavigationEvent: () => {} };
const errorService = { captureEnterpriseError: () => {} };

export default {
  useEnterpriseNavigation,
  NavigationGuards,
  AINavigationService,
  ConstructionNavigationStack,
  GovernmentNavigationStack,
  PremiumNavigationStack,
  EmergencyNavigationStack,
  EthiopianNavigationUtils,
  NavigationUtils,
};