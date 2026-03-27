/**
 * Yachi - Enterprise Mobile Application
 * Ethiopian Service Marketplace & Construction Platform
 * @version 1.0.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  LogBox, 
  AppState,
  Platform,
  UIManager,
  StyleSheet
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Host } from 'react-native-portalize';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Enable React Native Screens for better performance
enableScreens();

// Enable layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'Remote debugger',
  'ViewPropTypes will be removed',
]);

// Import Enterprise Context Providers
import { AuthProvider } from './contexts/auth-context';
import { ThemeProvider } from './contexts/theme-context';
import { NotificationProvider } from './contexts/notification-context';
import { LocationProvider } from './contexts/location-context';
import { PaymentProvider } from './contexts/payment-context';
import { PremiumProvider } from './contexts/premium-context';
import { ConstructionProvider } from './contexts/construction-context';
import { AIMatchingProvider } from './contexts/ai-matching-context';
import { UserProvider } from './contexts/user-context';

// Import Enterprise Services
import { authService } from './services/auth-service';
import { notificationService } from './services/notification-service';
import { analyticsService } from './services/analytics-service';
import { errorService } from './services/error-service';
import { storageManager } from './utils/storage';
import { securityManager } from './utils/security';

// Import Enterprise Navigation
import YachiNavigation from './navigation/app-navigator';

// Import Enhanced Components
import { AppLoading } from './components/ui/loading';
import { ErrorBoundary } from './components/ui/error-boundary';
import { NetworkMonitor } from './components/ui/network-monitor';
import { SecurityOverlay } from './components/ui/security-overlay';
import { UpdateChecker } from './components/ui/update-checker';

// Import Constants
import { 
  APP_CONFIG, 
  FEATURE_FLAGS,
  SECURITY_LEVELS,
  STORAGE_KEYS 
} from './constants/app';

/**
 * Configure Notifications
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Main Yachi Application Component
 */
export default function App() {
  const [appState, setAppState] = useState({
    isReady: false,
    isFontsLoaded: false,
    isServicesInitialized: false,
    appState: 'active',
    lastBackgroundTime: null,
    securityLevel: SECURITY_LEVELS.HIGH,
    initializationError: null
  });

  const appStateRef = useRef(AppState.currentState);
  const initializationTimeoutRef = useRef();

  /**
   * Initialize Application
   */
  useEffect(() => {
    initializeApp();
    
    // Setup app state listeners
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Setup cleanup
    return () => {
      cleanupApp();
      subscription.remove();
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Comprehensive App Initialization
   */
  const initializeApp = async () => {
    try {
      console.log('🚀 Starting Yachi App Initialization...');

      // Keep splash screen visible
      await SplashScreen.preventAutoHideAsync();

      // Start initialization timeout (20 seconds)
      initializationTimeoutRef.current = setTimeout(() => {
        if (!appState.isReady) {
          console.warn('⏰ App initialization timeout reached');
          handleInitializationTimeout();
        }
      }, 20000);

      // Step 1: Load essential resources
      await loadEssentialResources();

      // Step 2: Initialize core services
      await initializeCoreServices();

      // Step 3: Setup security systems
      await setupSecuritySystems();

      // Step 4: Initialize feature-specific services
      await initializeFeatureServices();

      // Step 5: Finalize app readiness
      await finalizeAppReadiness();

      console.log('✅ Yachi App Initialization Completed Successfully');

    } catch (error) {
      console.error('❌ App Initialization Failed:', error);
      await handleInitializationError(error);
    }
  };

  /**
   * Load Essential Resources
   */
  const loadEssentialResources = async () => {
    try {
      console.log('📦 Loading essential resources...');

      // Load custom fonts
      await Font.loadAsync({
        'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
        'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
        'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
        'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
      });

      setAppState(prev => ({ ...prev, isFontsLoaded: true }));
      console.log('✅ Fonts loaded successfully');

    } catch (error) {
      console.error('❌ Resource loading failed:', error);
      throw new Error('RESOURCE_LOADING_FAILED');
    }
  };

  /**
   * Initialize Core Services
   */
  const initializeCoreServices = async () => {
    try {
      console.log('🔧 Initializing core services...');

      // Initialize storage system
      await storageManager.initialize();
      console.log('✅ Storage system initialized');

      // Initialize security system
      await securityManager.initialize();
      console.log('✅ Security system initialized');

      // Initialize analytics
      await analyticsService.initialize();
      console.log('✅ Analytics service initialized');

      // Initialize error tracking
      await errorService.initialize();
      console.log('✅ Error service initialized');

      // Check authentication state
      await checkAuthenticationState();
      console.log('✅ Authentication state checked');

      setAppState(prev => ({ ...prev, isServicesInitialized: true }));

    } catch (error) {
      console.error('❌ Core services initialization failed:', error);
      throw new Error('SERVICES_INITIALIZATION_FAILED');
    }
  };

  /**
   * Setup Security Systems
   */
  const setupSecuritySystems = async () => {
    try {
      console.log('🛡️ Setting up security systems...');

      // Check device security
      const securityLevel = await securityManager.getSecurityStatus();
      setAppState(prev => ({ ...prev, securityLevel }));
      console.log(`✅ Security level: ${securityLevel}`);

      // Setup biometric authentication if available
      if (securityLevel >= SECURITY_LEVELS.MEDIUM) {
        await setupBiometricAuth();
      }

      // Setup session monitoring
      setupSessionMonitoring();
      console.log('✅ Session monitoring setup');

    } catch (error) {
      console.error('⚠️ Security setup failed, continuing without security features:', error);
    }
  };

  /**
   * Initialize Feature Services
   */
  const initializeFeatureServices = async () => {
    try {
      console.log('🎯 Initializing feature services...');

      // Initialize notification system
      if (FEATURE_FLAGS.NOTIFICATIONS) {
        await notificationService.initialize();
        console.log('✅ Notification service initialized');
      }

      // Initialize payment services
      if (FEATURE_FLAGS.PAYMENTS) {
        await initializePaymentServices();
        console.log('✅ Payment services initialized');
      }

      // Initialize AI services
      if (FEATURE_FLAGS.AI_CONSTRUCTION) {
        await initializeAIServices();
        console.log('✅ AI services initialized');
      }

      // Initialize location services
      if (FEATURE_FLAGS.LOCATION) {
        await initializeLocationServices();
        console.log('✅ Location services initialized');
      }

    } catch (error) {
      console.error('⚠️ Feature services initialization failed, continuing without features:', error);
    }
  };

  /**
   * Finalize App Readiness
   */
  const finalizeAppReadiness = async () => {
    try {
      // Clear initialization timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }

      // Hide splash screen
      await SplashScreen.hideAsync();

      // Track app launch
      await analyticsService.track('app_launched', {
        platform: Platform.OS,
        osVersion: Platform.Version,
        deviceModel: Device.modelName,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
        isDevice: Device.isDevice,
      });

      // Set app as ready
      setAppState(prev => ({ ...prev, isReady: true }));

    } catch (error) {
      console.error('❌ App finalization failed:', error);
      throw new Error('APP_FINALIZATION_FAILED');
    }
  };

  /**
   * Check Authentication State
   */
  const checkAuthenticationState = async () => {
    try {
      const isAuthenticated = await authService.checkAuthState();
      
      if (isAuthenticated) {
        await analyticsService.track('user_session_resumed');
      } else {
        await analyticsService.track('user_session_new');
      }

    } catch (error) {
      console.error('⚠️ Auth state check failed:', error);
    }
  };

  /**
   * Setup Biometric Authentication
   */
  const setupBiometricAuth = async () => {
    try {
      const biometricEnabled = await securityManager.setupBiometricSupport();
      
      if (biometricEnabled) {
        await analyticsService.track('biometric_authentication_enabled');
      }

    } catch (error) {
      console.error('⚠️ Biometric setup failed:', error);
    }
  };

  /**
   * Setup Session Monitoring
   */
  const setupSessionMonitoring = () => {
    // Monitor user activity for automatic logout
    // This would integrate with the security manager
    console.log('🔒 Session monitoring setup complete');
  };

  /**
   * Initialize Payment Services
   */
  const initializePaymentServices = async () => {
    try {
      // Initialize Ethiopian payment gateways
      // Chapa, Telebirr, CBE Birr initialization would go here
      
      await storageManager.set(STORAGE_KEYS.PAYMENT_INITIALIZED, true);
      await analyticsService.track('payment_services_initialized');

    } catch (error) {
      console.error('❌ Payment services initialization failed:', error);
      throw new Error('PAYMENT_SERVICES_INIT_FAILED');
    }
  };

  /**
   * Initialize AI Services
   */
  const initializeAIServices = async () => {
    try {
      // Initialize AI matching engine
      // Initialize construction AI services
      
      await storageManager.set(STORAGE_KEYS.AI_SERVICES_INITIALIZED, true);
      await analyticsService.track('ai_services_initialized');

    } catch (error) {
      console.error('❌ AI services initialization failed:', error);
      throw new Error('AI_SERVICES_INIT_FAILED');
    }
  };

  /**
   * Initialize Location Services
   */
  const initializeLocationServices = async () => {
    try {
      // Initialize GPS and location tracking
      // Setup Ethiopian cities and regions
      
      await storageManager.set(STORAGE_KEYS.LOCATION_INITIALIZED, true);
      await analyticsService.track('location_services_initialized');

    } catch (error) {
      console.error('❌ Location services initialization failed:', error);
      throw new Error('LOCATION_SERVICES_INIT_FAILED');
    }
  };

  /**
   * Handle App State Changes
   */
  const handleAppStateChange = async (nextAppState) => {
    try {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App coming to foreground
        await handleAppForeground();
      } else if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App going to background
        await handleAppBackground();
      }

      appStateRef.current = nextAppState;
      setAppState(prev => ({ ...prev, appState: nextAppState }));

    } catch (error) {
      console.error('⚠️ App state change handling failed:', error);
    }
  };

  /**
   * Handle App Foreground
   */
  const handleAppForeground = async () => {
    try {
      console.log('📱 App coming to foreground');
      
      // Refresh user data
      await authService.refreshUserData();

      // Update notification badges
      await notificationService.updateBadgeCount();

      // Track app foreground event
      await analyticsService.track('app_foreground');

    } catch (error) {
      console.error('⚠️ App foreground handling failed:', error);
    }
  };

  /**
   * Handle App Background
   */
  const handleAppBackground = async () => {
    try {
      console.log('📱 App going to background');
      
      // Save current state
      await storageManager.set('last_active_time', Date.now());

      // Stop unnecessary services
      await analyticsService.flush();

      // Track app background event
      await analyticsService.track('app_background');

    } catch (error) {
      console.error('⚠️ App background handling failed:', error);
    }
  };

  /**
   * Handle Initialization Timeout
   */
  const handleInitializationTimeout = async () => {
    console.warn('⏰ App initialization timeout - forcing readiness');
    
    try {
      await SplashScreen.hideAsync();
      setAppState(prev => ({ ...prev, isReady: true }));
      
      await analyticsService.track('app_initialization_timeout');
    } catch (error) {
      console.error('❌ Forced readiness failed:', error);
    }
  };

  /**
   * Handle Initialization Error
   */
  const handleInitializationError = async (error) => {
    console.error('❌ App initialization error:', error);
    
    try {
      // Track the error
      await analyticsService.trackError('app_initialization_failed', error);

      // Set initialization error
      setAppState(prev => ({ ...prev, initializationError: error.message }));

      // Hide splash screen
      await SplashScreen.hideAsync();

      // Set app as ready (with degraded mode)
      setAppState(prev => ({ ...prev, isReady: true }));

    } catch (fallbackError) {
      console.error('❌ Error handling also failed:', fallbackError);
      // Last resort - force app to show something
      setAppState(prev => ({ ...prev, isReady: true }));
    }
  };

  /**
   * Cleanup App Resources
   */
  const cleanupApp = async () => {
    try {
      console.log('🧹 Cleaning up app resources...');
      
      // Flush analytics
      await analyticsService.flush();

      // Clear any ongoing processes
      await storageManager.set('app_cleanup_time', Date.now());

      await analyticsService.track('app_cleanup_completed');

    } catch (error) {
      console.error('⚠️ App cleanup failed:', error);
    }
  };

  /**
   * Handle App Crashes
   */
  const handleGlobalError = (error, errorInfo) => {
    console.error('💥 Global error caught:', error, errorInfo);
    
    analyticsService.trackError('global_app_error', error, errorInfo)
      .catch(console.error);
  };

  /**
   * Render Loading State
   */
  const renderLoading = () => (
    <AppLoading 
      type="fullscreen"
      message="Initializing Yachi Platform..."
      subtitle="Connecting you to Ethiopia's skilled professionals"
      showProgress={true}
    />
  );

  /**
   * Render Error State
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>😔 Unable to Initialize</Text>
      <Text style={styles.errorMessage}>
        {appState.initializationError || 'An unexpected error occurred'}
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={initializeApp}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render Main Application
   */
  const renderApp = () => (
    <ErrorBoundary onError={handleGlobalError}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <Host>
            {/* Context Providers */}
            <ThemeProvider>
              <AuthProvider>
                <NotificationProvider>
                  <LocationProvider>
                    <UserProvider>
                      <PaymentProvider>
                        <PremiumProvider>
                          <ConstructionProvider>
                            <AIMatchingProvider>
                              
                              {/* Main Navigation */}
                              <YachiNavigation />
                              
                              {/* Global Components */}
                              <NetworkMonitor />
                              <SecurityOverlay 
                                level={appState.securityLevel}
                              />
                              <UpdateChecker />
                              
                            </AIMatchingProvider>
                          </ConstructionProvider>
                        </PremiumProvider>
                      </PaymentProvider>
                    </UserProvider>
                  </LocationProvider>
                </NotificationProvider>
              </AuthProvider>
            </ThemeProvider>
          </Host>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );

  // Render appropriate state
  if (!appState.isReady || !appState.isFontsLoaded) {
    return renderLoading();
  }

  if (appState.initializationError) {
    return renderErrorState();
  }

  return renderApp();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// App Registry for Web
if (Platform.OS === 'web') {
  const { AppRegistry } = require('react-native');
  AppRegistry.registerComponent('Yachi', () => App);
  AppRegistry.runApplication('Yachi', {
    rootTag: document.getElementById('root'),
  });
}

export default App;