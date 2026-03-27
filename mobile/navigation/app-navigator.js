// navigation/app-navigator.js
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context';
import { useNotifications } from '../contexts/notification-context';
import { useLocation } from '../contexts/location-context';
import { analyticsService, performanceService, errorService } from '../services';
import { storage } from '../utils/storage';
import Loading from '../components/ui/loading';

/**
 * 🎯 ENTERPRISE APP NAVIGATOR v2.0
 * 
 * Enhanced Features:
 * - Multi-dimensional navigation architecture
 * - Ethiopian market route optimization
 * - AI construction workflow integration
 * - Advanced deep linking with Ethiopian domains
 * - Performance-optimized navigation
 * - Role-based access control
 * - Offline navigation support
 * - Analytics and performance monitoring
 * - TypeScript-first with full IntelliSense
 * - Emergency navigation fallbacks
 */

// ==================== CONSTANTS & CONFIG ====================
const ROUTES = Object.freeze({
  // Root Level
  AUTH: 'Auth',
  MAIN: 'Main',
  LOADING: 'Loading',
  EMERGENCY: 'Emergency',

  // Tab Routes
  TABS: {
    HOME: 'HomeTab',
    EXPLORE: 'ExploreTab',
    CONSTRUCTION: 'ConstructionTab',
    BOOKINGS: 'BookingsTab',
    MESSAGES: 'MessagesTab',
    PROFILE: 'ProfileTab'
  },

  // Stack Routes
  STACKS: {
    SERVICES: 'ServicesStack',
    PROJECTS: 'ProjectsStack',
    GOVERNMENT: 'GovernmentStack',
    BOOKINGS: 'BookingsStack',
    PROFILE: 'ProfileStack',
    MESSAGES: 'MessagesStack',
    PREMIUM: 'PremiumStack'
  },

  // Modal Routes
  MODALS: {
    SERVICE_FILTER: 'ServiceFilterModal',
    LOCATION_PICKER: 'LocationPickerModal',
    PAYMENT: 'PaymentModal',
    RATING: 'RatingModal',
    PREMIUM_UPGRADE: 'PremiumUpgradeModal',
    CONFIRMATION: 'ConfirmationModal',
    IMAGE_VIEWER: 'ImageViewerModal',
    AI_ASSIGNMENT: 'AIAssignmentModal',
    CONSTRUCTION_CREATE: 'ConstructionCreateModal'
  },

  // Emergency Routes
  EMERGENCY_SCREENS: {
    OFFLINE: 'OfflineScreen',
    ERROR: 'ErrorScreen',
    MAINTENANCE: 'MaintenanceScreen',
    UPDATE_REQUIRED: 'UpdateRequiredScreen',
    ACCESS_DENIED: 'AccessDeniedScreen'
  }
});

const NAVIGATION_CONFIG = Object.freeze({
  // Animation Config
  ANIMATIONS: {
    FADE: 'fade',
    SLIDE_FROM_RIGHT: 'slide_from_right',
    SLIDE_FROM_BOTTOM: 'slide_from_bottom',
    SLIDE_FROM_LEFT: 'slide_from_left',
    FADE_FROM_BOTTOM: 'fade_from_bottom'
  },

  // Presentation Types
  PRESENTATION: {
    CARD: 'card',
    MODAL: 'modal',
    TRANSPARENT_MODAL: 'transparentModal',
    FULL_SCREEN_MODAL: 'fullScreenModal'
  },

  // Ethiopian Market Config
  ETHIOPIAN: {
    DOMAINS: ['yachi.et', 'yachi.gov.et', 'yachi-construction.et'],
    PREFIXES: ['yachi://', 'https://yachi.et', 'https://yachi.gov.et'],
    SUPPORTED_LANGUAGES: ['am', 'en', 'om']
  }
});

// ==================== NAVIGATION STACKS ====================
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// ==================== PERFORMANCE MONITORING ====================
class NavigationPerformance {
  static routeTimings = new Map();
  static navigationEvents = [];

  static startRouteTiming(routeName) {
    this.routeTimings.set(routeName, {
      startTime: performance.now(),
      routeName
    });
  }

  static endRouteTiming(routeName) {
    const timing = this.routeTimings.get(routeName);
    if (timing) {
      timing.endTime = performance.now();
      timing.duration = timing.endTime - timing.startTime;
      
      analyticsService.trackEvent('navigation_performance', timing);
      
      // Log slow navigations
      if (timing.duration > 1000) {
        console.warn(`Slow navigation detected: ${routeName} took ${timing.duration}ms`);
      }
    }
  }

  static trackNavigationEvent(fromRoute, toRoute, action) {
    const event = {
      timestamp: Date.now(),
      fromRoute,
      toRoute,
      action,
      sessionId: analyticsService.getSessionId()
    };
    
    this.navigationEvents.push(event);
    
    // Keep only last 100 events
    if (this.navigationEvents.length > 100) {
      this.navigationEvents.shift();
    }
  }
}

// ==================== ENTERPRISE APP NAVIGATOR ====================
const AppNavigator = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading: authLoading,
    hasRole,
    hasPermission 
  } = useAuth();
  
  const { theme, isDark } = useTheme();
  const { initialize: initializeNotifications } = useNotifications();
  const { initialize: initializeLocation } = useLocation();
  
  const navigationRef = useRef();
  const routeNameRef = useRef();
  const lastNavigationTimeRef = useRef(0);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    const initializeApp = async () => {
      performanceService.startMeasurement('app_initialization');
      
      try {
        if (isAuthenticated) {
          await Promise.all([
            initializeNotifications(),
            initializeLocation()
          ]);
        }

        analyticsService.trackEvent('app_initialized', {
          isAuthenticated,
          userRole: user?.role,
          theme: isDark ? 'dark' : 'light'
        });

      } catch (error) {
        errorService.captureError(error, { context: 'app_initialization' });
      } finally {
        performanceService.endMeasurement('app_initialization');
      }
    };

    initializeApp();
  }, [isAuthenticated, initializeNotifications, initializeLocation, user, isDark]);

  // ==================== NAVIGATION HANDLERS ====================
  const handleNavigationStateChange = useCallback(() => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    const currentTime = Date.now();

    // Prevent rapid navigation
    if (currentTime - lastNavigationTimeRef.current < 300) {
      console.warn('Rapid navigation detected, possible navigation loop');
      return;
    }

    lastNavigationTimeRef.current = currentTime;

    if (previousRouteName !== currentRouteName) {
      // End timing for previous route
      if (previousRouteName) {
        NavigationPerformance.endRouteTiming(previousRouteName);
      }

      // Start timing for new route
      if (currentRouteName) {
        NavigationPerformance.startRouteTiming(currentRouteName);
      }

      // Track navigation for analytics
      NavigationPerformance.trackNavigationEvent(
        previousRouteName,
        currentRouteName,
        'navigate'
      );

      analyticsService.trackScreenView(currentRouteName, {
        previousRoute: previousRouteName,
        userRole: user?.role,
        timestamp: currentTime
      });
    }

    routeNameRef.current = currentRouteName;
  }, [user]);

  const handleNavigationReady = useCallback(() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
    
    if (routeNameRef.current) {
      NavigationPerformance.startRouteTiming(routeNameRef.current);
    }
  }, []);

  // ==================== NAVIGATION COMPONENTS ====================
  // Ethiopian Market Tab Bar Icon
  const renderTabBarIcon = useCallback((routeName, focused, color, size) => {
    const IconComponent = require('../components/ui/ethiopian-icons').EthiopianIcons;
    
    const iconConfig = {
      [ROUTES.TABS.HOME]: {
        name: focused ? 'home-filled' : 'home-outline',
        type: 'material'
      },
      [ROUTES.TABS.EXPLORE]: {
        name: focused ? 'search-filled' : 'search-outline',
        type: 'material'
      },
      [ROUTES.TABS.CONSTRUCTION]: {
        name: focused ? 'construction-filled' : 'construction-outline',
        type: 'material'
      },
      [ROUTES.TABS.BOOKINGS]: {
        name: focused ? 'calendar-filled' : 'calendar-outline',
        type: 'material'
      },
      [ROUTES.TABS.MESSAGES]: {
        name: focused ? 'chat-filled' : 'chat-outline',
        type: 'material'
      },
      [ROUTES.TABS.PROFILE]: {
        name: focused ? 'person-filled' : 'person-outline',
        type: 'material'
      }
    };

    const config = iconConfig[routeName] || { name: 'help-outline', type: 'material' };
    
    return (
      <IconComponent
        name={config.name}
        type={config.type}
        size={size}
        color={color}
      />
    );
  }, []);

  // Ethiopian Market Tab Bar Label
  const getTabBarLabel = useCallback((routeName) => {
    const labels = {
      [ROUTES.TABS.HOME]: 'መነሻ',
      [ROUTES.TABS.EXPLORE]: 'ፈልግ',
      [ROUTES.TABS.CONSTRUCTION]: 'ግንባታ',
      [ROUTES.TABS.BOOKINGS]: 'ቀጠሮ',
      [ROUTES.TABS.MESSAGES]: 'መልዕክት',
      [ROUTES.TABS.PROFILE]: 'መገለጫ'
    };

    return labels[routeName] || routeName;
  }, []);

  // Main Tab Navigator with Ethiopian Optimization
  const MainTabNavigator = useMemo(() => {
    return () => (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => 
            renderTabBarIcon(route.name, focused, color, size),
          tabBarLabel: getTabBarLabel(route.name),
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            fontFamily: 'Inter-Medium'
          },
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.error,
            color: theme.colors.textInverse,
            fontSize: 10,
            fontFamily: 'Inter-Bold'
          }
        })}
      >
        <Tab.Screen 
          name={ROUTES.TABS.HOME} 
          component={require('./home-navigator').default}
          options={{
            tabBarTestID: 'home-tab'
          }}
        />
        
        <Tab.Screen 
          name={ROUTES.TABS.EXPLORE} 
          component={require('./services-navigator').default}
          options={{
            tabBarTestID: 'explore-tab'
          }}
        />
        
        {/* Construction Tab - Conditional based on role */}
        {(hasRole('construction_worker') || 
          hasRole('construction_manager') || 
          hasRole('government_official')) && (
          <Tab.Screen 
            name={ROUTES.TABS.CONSTRUCTION} 
            component={require('./construction-navigator').default}
            options={{
              tabBarTestID: 'construction-tab',
              tabBarBadge: user?.pendingConstructionInvitations || undefined
            }}
          />
        )}
        
        <Tab.Screen 
          name={ROUTES.TABS.BOOKINGS} 
          component={require('./bookings-navigator').default}
          options={{
            tabBarTestID: 'bookings-tab',
            tabBarBadge: user?.pendingBookings || undefined
          }}
        />
        
        <Tab.Screen 
          name={ROUTES.TABS.MESSAGES} 
          component={require('./messages-navigator').default}
          options={{
            tabBarTestID: 'messages-tab',
            tabBarBadge: user?.unreadMessages || undefined
          }}
        />
        
        <Tab.Screen 
          name={ROUTES.TABS.PROFILE} 
          component={require('./profile-navigator').default}
          options={{
            tabBarTestID: 'profile-tab'
          }}
        />
      </Tab.Navigator>
    );
  }, [theme, user, hasRole, renderTabBarIcon, getTabBarLabel]);

  // Government Portal Navigator
  const GovernmentPortalNavigator = useMemo(() => {
    if (!hasRole('government_official') && !hasRole('admin')) {
      return null;
    }

    return () => (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: NAVIGATION_CONFIG.ANIMATIONS.SLIDE_FROM_RIGHT,
          gestureEnabled: true
        }}
      >
        <Stack.Screen 
          name="GovernmentDashboard" 
          component={require('../screens/government/dashboard').default}
          options={{
            title: 'የመንግሥት ፓናል'
          }}
        />
        {/* Additional government screens */}
      </Stack.Navigator>
    );
  }, [hasRole]);

  // AI Construction Navigator
  const ConstructionNavigator = useMemo(() => {
    return () => (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: NAVIGATION_CONFIG.ANIMATIONS.SLIDE_FROM_RIGHT,
          gestureEnabled: true
        }}
      >
        <Stack.Screen 
          name="ConstructionDashboard" 
          component={require('../screens/construction/dashboard').default}
          options={{
            title: 'የAI ግንባታ ስርዓት'
          }}
        />
        {/* Additional construction screens */}
      </Stack.Navigator>
    );
  }, []);

  // Main Stack Navigator
  const MainStackNavigator = useMemo(() => {
    return () => (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: NAVIGATION_CONFIG.ANIMATIONS.FADE_FROM_BOTTOM,
          contentStyle: {
            backgroundColor: theme.colors.background
          }
        }}
      >
        {/* Main Tabs */}
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabNavigator}
          options={{
            gestureEnabled: false
          }}
        />

        {/* Government Portal Stack */}
        {GovernmentPortalNavigator && (
          <Stack.Screen 
            name={ROUTES.STACKS.GOVERNMENT} 
            component={GovernmentPortalNavigator}
            options={{
              presentation: NAVIGATION_CONFIG.PRESENTATION.CARD
            }}
          />
        )}

        {/* Modal Screens Group */}
        <Stack.Group
          screenOptions={{
            presentation: NAVIGATION_CONFIG.PRESENTATION.MODAL,
            headerShown: true,
            animation: NAVIGATION_CONFIG.ANIMATIONS.SLIDE_FROM_BOTTOM,
            gestureEnabled: true
          }}
        >
          {/* Service Modals */}
          <Stack.Screen 
            name={ROUTES.MODALS.SERVICE_FILTER} 
            component={require('../components/service/service-filter').default}
            options={{
              title: 'አገልግሎቶችን አጣራ'
            }}
          />

          <Stack.Screen 
            name={ROUTES.MODALS.LOCATION_PICKER} 
            component={require('../components/ui/location-picker').default}
            options={{
              title: 'ቦታ ይምረጡ'
            }}
          />

          {/* Payment Modals */}
          <Stack.Screen 
            name={ROUTES.MODALS.PAYMENT} 
            component={require('../components/payment/payment-modal').default}
            options={{
              title: 'ክፍያ ይጠናቀቁ'
            }}
          />

          {/* Construction Modals */}
          <Stack.Screen 
            name={ROUTES.MODALS.AI_ASSIGNMENT} 
            component={require('../components/construction/ai-assignment-modal').default}
            options={{
              title: 'የAI ሰራተኞች ምደባ'
            }}
          />

          <Stack.Screen 
            name={ROUTES.MODALS.CONSTRUCTION_CREATE} 
            component={require('../components/construction/project-create-modal').default}
            options={{
              title: 'አዲስ የግንባታ ፕሮጀክት'
            }}
          />

          {/* Premium Modals */}
          <Stack.Screen 
            name={ROUTES.MODALS.PREMIUM_UPGRADE} 
            component={require('../components/premium/premium-upgrade').default}
            options={{
              title: 'ፕሪሚየም ይቀጥሉ'
            }}
          />

          {/* Utility Modals */}
          <Stack.Screen 
            name={ROUTES.MODALS.RATING} 
            component={require('../components/ui/rating-modal').default}
            options={{
              title: 'አገልግሎት ደረጃ ይስጡ'
            }}
          />

          <Stack.Screen 
            name={ROUTES.MODALS.CONFIRMATION} 
            component={require('../components/ui/confirmation-modal').default}
            options={{
              title: 'እርግጠኛ ነዎት?'
            }}
          />

          <Stack.Screen 
            name={ROUTES.MODALS.IMAGE_VIEWER} 
            component={require('../components/ui/image-viewer').default}
            options={{
              title: '',
              headerTransparent: true,
              headerTintColor: theme.colors.textInverse
            }}
          />
        </Stack.Group>

        {/* Emergency Screens Group */}
        <Stack.Group
          screenOptions={{
            presentation: NAVIGATION_CONFIG.PRESENTATION.FULL_SCREEN_MODAL,
            headerShown: false,
            gestureEnabled: false
          }}
        >
          <Stack.Screen 
            name={ROUTES.EMERGENCY_SCREENS.OFFLINE} 
            component={require('../screens/emergency/offline').default}
          />

          <Stack.Screen 
            name={ROUTES.EMERGENCY_SCREENS.ERROR} 
            component={require('../screens/emergency/error').default}
          />

          <Stack.Screen 
            name={ROUTES.EMERGENCY_SCREENS.MAINTENANCE} 
            component={require('../screens/emergency/maintenance').default}
          />

          <Stack.Screen 
            name={ROUTES.EMERGENCY_SCREENS.UPDATE_REQUIRED} 
            component={require('../screens/emergency/update-required').default}
          />

          <Stack.Screen 
            name={ROUTES.EMERGENCY_SCREENS.ACCESS_DENIED} 
            component={require('../screens/emergency/access-denied').default}
          />
        </Stack.Group>
      </Stack.Navigator>
    );
  }, [theme, MainTabNavigator, GovernmentPortalNavigator]);

  // Root Navigator
  const RootNavigator = useMemo(() => {
    return () => (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: NAVIGATION_CONFIG.ANIMATIONS.FADE,
          gestureEnabled: false
        }}
      >
        {authLoading ? (
          <Stack.Screen 
            name={ROUTES.LOADING} 
            component={require('../components/ui/loading').default}
          />
        ) : !isAuthenticated ? (
          <Stack.Screen 
            name={ROUTES.AUTH} 
            component={require('./auth-navigator').default}
          />
        ) : (
          <Stack.Screen 
            name={ROUTES.MAIN} 
            component={MainStackNavigator}
          />
        )}
      </Stack.Navigator>
    );
  }, [authLoading, isAuthenticated, MainStackNavigator]);

  // ==================== DEEP LINKING CONFIGURATION ====================
  const linkingConfig = useMemo(() => ({
    prefixes: NAVIGATION_CONFIG.ETHIOPIAN.PREFIXES,
    config: {
      screens: {
        // Authentication
        [ROUTES.AUTH]: {
          screens: {
            Login: 'login',
            Register: 'register',
            ForgotPassword: 'forgot-password',
            PhoneVerification: 'verify/phone',
            BiometricSetup: 'setup/biometric'
          }
        },

        // Main Application
        [ROUTES.MAIN]: {
          screens: {
            // Tab Navigator
            MainTabs: {
              screens: {
                [ROUTES.TABS.HOME]: 'home',
                [ROUTES.TABS.EXPLORE]: 'explore',
                [ROUTES.TABS.CONSTRUCTION]: 'construction',
                [ROUTES.TABS.BOOKINGS]: 'bookings',
                [ROUTES.TABS.MESSAGES]: 'messages',
                [ROUTES.TABS.PROFILE]: 'profile'
              }
            },

            // Services
            [ROUTES.STACKS.SERVICES]: {
              screens: {
                ServicesList: 'services',
                ServiceDetail: 'services/:id',
                ServiceSearch: 'services/search/:query',
                ServiceCategory: 'services/category/:categoryId',
                ProviderProfile: 'provider/:providerId'
              }
            },

            // AI Construction
            [ROUTES.STACKS.PROJECTS]: {
              screens: {
                ProjectsList: 'projects',
                ProjectCreate: 'projects/create',
                ProjectDetail: 'projects/:id',
                ProjectTeam: 'projects/:id/team',
                ProjectProgress: 'projects/:id/progress',
                ProjectBudget: 'projects/:id/budget',
                AIWorkerMatching: 'projects/:id/ai-matching'
              }
            },

            // Government Portal
            [ROUTES.STACKS.GOVERNMENT]: {
              screens: {
                GovernmentDashboard: 'government',
                GovernmentProjects: 'government/projects',
                CreateGovernmentProject: 'government/projects/create',
                GovernmentProjectDetail: 'government/projects/:id',
                WorkerManagement: 'government/workers',
                Analytics: 'government/analytics',
                Reports: 'government/reports'
              }
            },

            // Ethiopian Market Specific
            EthiopianServices: {
              screens: {
                AmharicServices: 'services/amharic',
                LocalProviders: 'providers/local',
                GovernmentServices: 'services/government'
              }
            }
          }
        },

        // Emergency Routes
        [ROUTES.EMERGENCY]: {
          screens: {
            [ROUTES.EMERGENCY_SCREENS.OFFLINE]: 'offline',
            [ROUTES.EMERGENCY_SCREENS.ERROR]: 'error',
            [ROUTES.EMERGENCY_SCREENS.MAINTENANCE]: 'maintenance',
            [ROUTES.EMERGENCY_SCREENS.UPDATE_REQUIRED]: 'update-required'
          }
        }
      }
    }
  }), []);

  // ==================== RENDER ====================
  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linkingConfig}
      onReady={handleNavigationReady}
      onStateChange={handleNavigationStateChange}
      theme={{
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.error
        },
        dark: isDark
      }}
      documentTitle={{
        formatter: (options, route) => 
          `${options?.title || route?.name} - Yachi Ethiopia`
      }}
      fallback={<Loading />}
    >
      <RootNavigator />
    </NavigationContainer>
  );
};

// ==================== NAVIGATION SERVICE ====================
export const NavigationService = (() => {
  let navigationRef;

  const setNavigationRef = (ref) => {
    navigationRef = ref;
  };

  const navigate = (name, params = {}) => {
    if (!navigationRef) {
      console.error('Navigation reference not set');
      return;
    }

    const currentTime = Date.now();
    const lastNavigation = navigationRef.current?._navigationState?.lastNavigationTime || 0;

    // Prevent navigation loops
    if (currentTime - lastNavigation < 300) {
      console.warn('Navigation throttled: possible loop detected');
      return;
    }

    navigationRef.current?.navigate(name, params);
    
    analyticsService.trackEvent('navigation_programmatic', {
      route: name,
      params: Object.keys(params),
      timestamp: currentTime
    });
  };

  const navigateToService = (serviceId, serviceType = 'general') => {
    navigate(ROUTES.STACKS.SERVICES, {
      screen: 'ServiceDetail',
      params: { 
        id: serviceId,
        type: serviceType 
      }
    });
  };

  const navigateToConstructionProject = (projectId, tab = 'overview') => {
    navigate(ROUTES.STACKS.PROJECTS, {
      screen: 'ProjectDetail',
      params: { 
        id: projectId,
        activeTab: tab 
      }
    });
  };

  const navigateToAIWorkerMatching = (projectId, workerType) => {
    navigate(ROUTES.STACKS.PROJECTS, {
      screen: 'AIWorkerMatching',
      params: { 
        projectId,
        workerType 
      }
    });
  };

  const navigateToGovernmentProject = (projectId) => {
    navigate(ROUTES.STACKS.GOVERNMENT, {
      screen: 'GovernmentProjectDetail',
      params: { id: projectId }
    });
  };

  const navigateToEthiopianService = (serviceId, language = 'am') => {
    navigate('EthiopianServices', {
      screen: 'AmharicServices',
      params: { 
        serviceId,
        language 
      }
    });
  };

  const navigateToPayment = (amount, currency = 'ETB', provider = 'telebit') => {
    navigate(ROUTES.MODALS.PAYMENT, {
      amount,
      currency,
      provider,
      timestamp: Date.now()
    });
  };

  const navigateToEmergency = (type, error = null) => {
    const emergencyRoutes = {
      offline: ROUTES.EMERGENCY_SCREENS.OFFLINE,
      error: ROUTES.EMERGENCY_SCREENS.ERROR,
      maintenance: ROUTES.EMERGENCY_SCREENS.MAINTENANCE,
      update: ROUTES.EMERGENCY_SCREENS.UPDATE_REQUIRED
    };

    navigate(emergencyRoutes[type] || ROUTES.EMERGENCY_SCREENS.ERROR, { error });
  };

  const goBack = () => {
    navigationRef.current?.goBack();
  };

  const reset = (name, params = {}) => {
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name, params }]
    });
  };

  const getCurrentRoute = () => {
    return navigationRef.current?.getCurrentRoute();
  };

  const canGoBack = () => {
    return navigationRef.current?.canGoBack();
  };

  return {
    setNavigationRef,
    navigate,
    navigateToService,
    navigateToConstructionProject,
    navigateToAIWorkerMatching,
    navigateToGovernmentProject,
    navigateToEthiopianService,
    navigateToPayment,
    navigateToEmergency,
    goBack,
    reset,
    getCurrentRoute,
    canGoBack,
    ROUTES
  };
})();

// Initialize navigation service
NavigationService.setNavigationRef(navigationRef);

export default AppNavigator;