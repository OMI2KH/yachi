import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, AppState, Linking, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../contexts/auth-context';
import { ThemeProvider, useTheme } from '../contexts/theme-context';
import { NotificationProvider } from '../contexts/notification-context';
import { LocationProvider } from '../contexts/location-context';
import { LoadingProvider, useLoading } from '../contexts/loading-context';
import LoadingScreen from '../components/ui/loading';
import NetworkStatus from '../components/ui/network-status';
import ErrorBoundary from '../components/ui/error-boundary';
import { storage } from '../utils/storage';
import { notificationService } from '../services/notification-service';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Keep splash screen visible until app is ready
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Splash screen is already hidden */
});

/**
 * Root Layout Component - Enterprise Grade
 * Handles: App initialization, authentication, navigation, notifications, and global state
 */
function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const { 
    user, 
    isAuthenticated, 
    loading: authLoading, 
    checkAuthState,
    refreshUserData 
  } = useAuth();
  const { loading: appLoading, showLoading, hideLoading } = useLoading();
  const { theme, isDark } = useTheme();
  
  const [isReady, setIsReady] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  const [notification, setNotification] = useState(null);
  
  const notificationListener = useRef();
  const responseListener = useRef();
  const appStateListener = useRef();
  const netInfoListener = useRef();
  const initializationRef = useRef(false);

  // Memoized initialization function
  const initializeApp = useCallback(async () => {
    // Prevent multiple initializations
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      showLoading('Initializing app...');
      
      // Initialize critical services in sequence
      await Promise.allSettled([
        initializeServices(),
        checkAuthState(),
        analyticsService.initialize(),
      ]);

      // Hide splash screen with a small delay for smoother transition
      setTimeout(async () => {
        await SplashScreen.hideAsync();
      }, 500);
      
      setIsReady(true);
      hideLoading();
      
      // Track successful app initialization
      analyticsService.trackEvent('app_initialized');
      
    } catch (error) {
      console.error('App initialization failed:', error);
      errorService.captureError(error, { context: 'AppInitialization' });
      
      // Still set ready to true to show error state to user
      setIsReady(true);
      hideLoading();
      
      // Track initialization failure
      analyticsService.trackEvent('app_initialization_failed', {
        error: error.message
      });
    }
  }, [checkAuthState, showLoading, hideLoading]);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();

    return () => {
      // Cleanup listeners
      cleanupNotificationListeners();
      if (netInfoListener.current) {
        netInfoListener.current();
      }
    };
  }, [initializeApp]);

  // Handle authentication state changes
  useEffect(() => {
    if (!authLoading && isReady) {
      handleAuthStateChange();
    }
  }, [isAuthenticated, authLoading, segments, isReady]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated]);

  // Handle network status changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(handleNetworkStateChange);
    return () => unsubscribe();
  }, []);

  // Setup notification listeners
  useEffect(() => {
    if (user?.id) {
      setupNotificationListeners();
    }
    return () => {
      cleanupNotificationListeners();
    };
  }, [user?.id]);

  const initializeServices = async () => {
    try {
      // Initialize services in optimal order
      const servicePromises = [];

      // Critical services (run first)
      servicePromises.push(errorService.initialize());
      
      // Platform-specific services
      if (Platform.OS !== 'web') {
        servicePromises.push(notificationService.initialize());
      }

      await Promise.allSettled(servicePromises);
      
    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    }
  };

  const handleAuthStateChange = useCallback(() => {
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!isReady || authLoading) return;

    // Prevent navigation loops
    const currentRoute = segments.join('/');
    
    if (isAuthenticated && inAuthGroup) {
      // Redirect authenticated users to main app
      console.log('🔄 Redirecting to main app');
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated users to auth
      console.log('🔄 Redirecting to auth');
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, authLoading, segments, isReady, router]);

  const handleAppStateChange = useCallback((nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      handleAppForeground();
    } else if (nextAppState === 'background') {
      // App went to background
      handleAppBackground();
    }
    
    setAppState(nextAppState);
  }, [appState, isAuthenticated]);

  const handleAppForeground = async () => {
    try {
      console.log('🔄 App came to foreground');
      
      // Refresh user data when app comes to foreground
      if (isAuthenticated) {
        await refreshUserData();
      }
      
      // Check for pending notifications
      await notificationService.checkPendingNotifications();
      
      analyticsService.trackEvent('app_foreground');
      
    } catch (error) {
      console.error('Error handling app foreground:', error);
      errorService.captureError(error, { context: 'AppForeground' });
    }
  };

  const handleAppBackground = () => {
    console.log('🔄 App went to background');
    analyticsService.trackEvent('app_background');
  };

  const handleNetworkStateChange = useCallback((state) => {
    const isConnected = state.isConnected && state.isInternetReachable;
    
    // Only update if status changed
    if (networkStatus !== isConnected) {
      setNetworkStatus(isConnected);
      
      if (!isConnected) {
        analyticsService.trackEvent('network_disconnected');
        console.warn('🌐 Network disconnected');
      } else {
        analyticsService.trackEvent('network_connected');
        console.log('🌐 Network connected');
      }
    }
  }, [networkStatus]);

  const setupNotificationListeners = () => {
    try {
      // Listen for incoming notifications
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification);
        handleIncomingNotification(notification);
      });

      // Listen for notification responses
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        handleNotificationResponse(response);
      });

      console.log('📱 Notification listeners setup successfully');
    } catch (error) {
      console.error('Failed to setup notification listeners:', error);
      errorService.captureError(error, { context: 'NotificationSetup' });
    }
  };

  const cleanupNotificationListeners = () => {
    try {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      console.log('📱 Notification listeners cleaned up');
    } catch (error) {
      console.error('Error cleaning up notification listeners:', error);
    }
  };

  const handleIncomingNotification = (notification) => {
    try {
      const { data } = notification.request.content;
      
      analyticsService.trackEvent('notification_received', {
        type: data?.type,
        category: data?.category
      });

      console.log('📨 Notification received:', data?.type);

      // Handle different notification types
      switch (data?.type) {
        case 'booking_request':
          handleBookingNotification(data);
          break;
        case 'message_received':
          handleMessageNotification(data);
          break;
        case 'payment_confirmed':
          handlePaymentNotification(data);
          break;
        case 'system_alert':
          handleSystemNotification(data);
          break;
        default:
          console.log('Unknown notification type:', data?.type);
      }
    } catch (error) {
      console.error('Error handling incoming notification:', error);
      errorService.captureError(error, { 
        context: 'NotificationHandling',
        notification: notification.request.content
      });
    }
  };

  const handleNotificationResponse = (response) => {
    try {
      const { data } = response.notification.request.content;
      
      analyticsService.trackEvent('notification_opened', {
        type: data?.type,
        category: data?.category
      });

      console.log('👆 Notification opened:', data?.type);

      // Navigate based on notification type
      if (data?.screen) {
        handleDeepLinkNavigation(data.screen, data.params);
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
      errorService.captureError(error, {
        context: 'NotificationResponse',
        response: response.notification.request.content
      });
    }
  };

  const handleDeepLinkNavigation = (screen, params = {}) => {
    const navigationMap = {
      'booking': '/(bookings)/[id]',
      'chat': '/(messages)/[id]',
      'service': '/(services)/[id]',
      'profile': '/(profile)',
      'emergency': '/emergency'
    };

    const route = navigationMap[screen];
    if (route && isAuthenticated) {
      router.push({
        pathname: route,
        params
      });
    } else if (!isAuthenticated) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    }
  };

  const handleBookingNotification = (data) => {
    // Refresh bookings data or show specific booking
    if (data.bookingId) {
      console.log('📅 Booking notification:', data.bookingId);
      // Emit event or update context
    }
  };

  const handleMessageNotification = (data) => {
    // Refresh messages or navigate to chat
    if (data.conversationId) {
      console.log('💬 Message notification:', data.conversationId);
      // Emit event or update context
    }
  };

  const handlePaymentNotification = (data) => {
    // Update payment status or show confirmation
    if (data.transactionId) {
      console.log('💰 Payment notification:', data.transactionId);
      // Emit event or update context
    }
  };

  const handleSystemNotification = (data) => {
    // Handle system-wide alerts or maintenance notifications
    console.log('⚙️ System notification:', data.message);
  };

  const getHeaderStyle = () => ({
    headerStyle: {
      backgroundColor: theme.colors.background,
      shadowColor: 'transparent',
      elevation: 0,
    },
    headerTintColor: theme.colors.text,
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
    },
    headerBackTitle: 'Back',
  });

  // Show loading screen while app is initializing
  if (!isReady || authLoading) {
    return (
      <LoadingScreen 
        message="Preparing your experience..." 
        showLogo 
      />
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <LoadingProvider>
            <NotificationProvider>
              <LocationProvider>
                {/* Main Navigation Stack */}
                <Stack
                  screenOptions={{
                    ...getHeaderStyle(),
                    animation: 'slide_from_right',
                    animationDuration: 300,
                    contentStyle: {
                      backgroundColor: theme.colors.background,
                    },
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                  }}
                >
                  {/* Auth Stack */}
                  <Stack.Screen
                    name="(auth)"
                    options={{
                      headerShown: false,
                      animation: 'fade',
                      gestureEnabled: false,
                    }}
                  />

                  {/* Main Tabs */}
                  <Stack.Screen
                    name="(tabs)"
                    options={{
                      headerShown: false,
                      gestureEnabled: false,
                    }}
                  />

                  {/* Services Stack */}
                  <Stack.Screen
                    name="(services)"
                    options={{
                      headerShown: false,
                      presentation: 'card',
                    }}
                  />

                  {/* Bookings Stack */}
                  <Stack.Screen
                    name="(bookings)"
                    options={{
                      headerShown: false,
                      presentation: 'card',
                    }}
                  />

                  {/* Profile Stack */}
                  <Stack.Screen
                    name="(profile)"
                    options={{
                      headerShown: false,
                      presentation: 'card',
                    }}
                  />

                  {/* Messages Stack */}
                  <Stack.Screen
                    name="(messages)"
                    options={{
                      headerShown: false,
                      presentation: 'card',
                    }}
                  />

                  {/* Modal Screens */}
                  <Stack.Screen
                    name="modal"
                    options={{
                      presentation: 'modal',
                      headerShown: true,
                      title: 'Information',
                      ...getHeaderStyle(),
                    }}
                  />

                  {/* Emergency/Error Screens */}
                  <Stack.Screen
                    name="emergency"
                    options={{
                      presentation: 'fullScreenModal',
                      headerShown: false,
                      gestureEnabled: false,
                    }}
                  />

                </Stack>

                {/* Global UI Components */}
                {!networkStatus && (
                  <NetworkStatus 
                    isConnected={networkStatus}
                    onRetry={handleAppForeground}
                  />
                )}

                {appLoading && (
                  <LoadingScreen 
                    message={appLoading.message || "Processing..."}
                    overlay
                  />
                )}

                {/* Status Bar */}
                <StatusBar 
                  style={isDark ? 'light' : 'dark'} 
                  backgroundColor="transparent"
                  translucent
                />

              </LocationProvider>
            </NotificationProvider>
          </LoadingProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

/**
 * Root Layout Wrapper
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}

// Error boundary for the root layout
export function ErrorBoundary(props) {
  return (
    <ErrorBoundary 
      fallback={<LoadingScreen message="Something went wrong" showRetry />}
      {...props}
    />
  );
}