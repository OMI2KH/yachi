import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLoading } from '../../contexts/loading-context';
import Loading from '../../components/ui/loading';
import { Platform, BackHandler, Alert } from 'react-native';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

/**
 * Bookings Stack Layout
 * Handles all booking-related screens (details, creation, management, history)
 * Includes booking-specific navigation patterns and flow protection
 */
export default function BookingsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { theme, isDark } = useTheme();
  const { loading: appLoading } = useLoading();

  // Get current booking screen for analytics
  const getCurrentBookingScreen = () => {
    const segment = segments[segments.length - 1];
    return segment || 'index';
  };

  // Track screen views for analytics
  useEffect(() => {
    if (rootNavigationState?.key) {
      const screen = getCurrentBookingScreen();
      analyticsService.trackScreenView(`bookings_${screen}`, {
        user_id: user?.id,
        user_role: user?.role,
        is_authenticated: isAuthenticated,
      });
    }
  }, [segments, rootNavigationState?.key]);

  // Handle Android back button for booking flows
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const currentScreen = getCurrentBookingScreen();
      
      // Special handling for active booking flows
      if (currentScreen === 'create' || currentScreen === 'reschedule') {
        Alert.alert(
          'Cancel Booking?',
          'Are you sure you want to cancel this booking? Your progress will be lost.',
          [
            { text: 'Continue Booking', style: 'cancel' },
            { 
              text: 'Cancel Booking', 
              style: 'destructive', 
              onPress: () => router.back() 
            },
          ]
        );
        return true;
      }

      // Prevent back navigation from booking confirmation
      if (currentScreen === 'confirmation') {
        Alert.alert(
          'Booking Confirmed',
          'Your booking has been confirmed. You can view it in your bookings list.',
          [
            { 
              text: 'View Bookings', 
              onPress: () => router.replace('/(tabs)/bookings') 
            },
          ]
        );
        return true;
      }
      
      return false;
    });

    return () => backHandler.remove();
  }, [segments]);

  // Authentication guard for booking management
  useEffect(() => {
    if (!rootNavigationState?.key || authLoading) return;

    const inBookingsGroup = segments[0] === '(bookings)';
    const currentScreen = getCurrentBookingScreen();
    const protectedScreens = ['create', 'manage', 'reschedule', 'history'];
    
    if (!isAuthenticated && inBookingsGroup && protectedScreens.includes(currentScreen)) {
      console.log('🔄 BookingsLayout: User not authenticated, redirecting to login');
      
      analyticsService.trackEvent('bookings_auth_required', {
        attempted_screen: currentScreen,
        user_id: user?.id,
      });

      // Redirect to login with return URL
      router.replace({
        pathname: '/(auth)/login',
        params: { returnTo: `/(bookings)/${currentScreen}` },
      });
    }
  }, [isAuthenticated, segments, authLoading, rootNavigationState?.key]);

  // Show loading while checking auth state
  if (authLoading || !rootNavigationState?.key) {
    return (
      <Loading 
        type="full_screen" 
        message="Loading bookings..." 
        showLogo 
      />
    );
  }

  // Common screen options for bookings stack
  const commonScreenOptions = {
    // Global screen options for bookings stack
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
    contentStyle: {
      backgroundColor: theme.colors.background,
    },
    // Smooth animations optimized for booking flows
    animation: 'slide_from_right',
    animationDuration: 350,
    // Gesture configuration
    gestureEnabled: true,
    fullScreenGestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'horizontal',
  };

  return (
    <Stack
      screenOptions={commonScreenOptions}
    >
      {/* Booking Details */}
      <Stack.Screen
        name="[id]"
        options={({ route }) => ({
          title: 'Booking Details',
          headerShown: true,
          headerShadowVisible: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          // Custom back button with analytics
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              onPress={() => {
                analyticsService.trackEvent('booking_details_back', {
                  booking_id: route.params?.id,
                });
                router.back();
              }}
            />
          ),
          // Booking actions in header
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="📞"
                onPress={() => {
                  analyticsService.trackEvent('booking_contact_provider', {
                    booking_id: route.params?.id,
                  });
                  // Implement contact provider
                }}
                accessibilityLabel="Contact Provider"
              />
              <IconButton
                icon="🔄"
                onPress={() => {
                  analyticsService.trackEvent('booking_reschedule', {
                    booking_id: route.params?.id,
                  });
                  router.push({
                    pathname: '/(bookings)/reschedule',
                    params: { bookingId: route.params?.id },
                  });
                }}
                accessibilityLabel="Reschedule Booking"
              />
            </View>
          ),
        })}
      />

      {/* Create Booking Flow */}
      <Stack.Screen
        name="create"
        options={{
          title: 'Book Service',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          // Prevent accidental dismissal during booking
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('booking_create_cancel');
                router.back();
              }}
              accessibilityLabel="Close"
            />
          ),
        }}
      />

      {/* Reschedule Booking */}
      <Stack.Screen
        name="reschedule"
        options={({ route }) => ({
          title: 'Reschedule Booking',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('booking_reschedule_cancel', {
                  booking_id: route.params?.bookingId,
                });
                router.back();
              }}
              accessibilityLabel="Close"
            />
          ),
        })}
      />

      {/* Booking Confirmation */}
      <Stack.Screen
        name="confirmation"
        options={{
          title: 'Booking Confirmed',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'transparentModal',
          animation: 'fade',
          // Prevent back navigation from confirmation
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('booking_confirmation_close');
                router.replace('/(tabs)/bookings');
              }}
              accessibilityLabel="Close"
            />
          ),
        }}
      />

      {/* Booking History */}
      <Stack.Screen
        name="history"
        options={{
          title: 'Booking History',
          headerShown: true,
          headerShadowVisible: false,
          // Filter and search actions
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="🔍"
                onPress={() => {
                  analyticsService.trackEvent('booking_history_search');
                  // Implement search functionality
                }}
                accessibilityLabel="Search Bookings"
              />
              <IconButton
                icon="⚙️"
                onPress={() => {
                  analyticsService.trackEvent('booking_history_filter');
                  // Implement filter functionality
                }}
                accessibilityLabel="Filter Bookings"
              />
            </View>
          ),
        }}
      />

      {/* Booking Management (Provider) */}
      <Stack.Screen
        name="manage"
        options={{
          title: 'Manage Bookings',
          headerShown: true,
          headerShadowVisible: false,
          // Provider-only screen
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="📊"
                onPress={() => {
                  analyticsService.trackEvent('booking_manage_analytics');
                  router.push('/(bookings)/analytics');
                }}
                accessibilityLabel="View Analytics"
              />
              <IconButton
                icon="⚙️"
                onPress={() => {
                  analyticsService.trackEvent('booking_manage_settings');
                  router.push('/(bookings)/settings');
                }}
                accessibilityLabel="Booking Settings"
              />
            </View>
          ),
        }}
      />

      {/* Booking Analytics (Provider) */}
      <Stack.Screen
        name="analytics"
        options={{
          title: 'Booking Analytics',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Booking Settings (Provider) */}
      <Stack.Screen
        name="settings"
        options={{
          title: 'Booking Settings',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Rate & Review */}
      <Stack.Screen
        name="rate"
        options={({ route }) => ({
          title: 'Rate Service',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('booking_rate_cancel', {
                  booking_id: route.params?.bookingId,
                });
                router.back();
              }}
              accessibilityLabel="Close"
            />
          ),
        }}
      />

      {/* Booking Issues */}
      <Stack.Screen
        name="issues"
        options={({ route }) => ({
          title: 'Report Issue',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('booking_issue_report_cancel', {
                  booking_id: route.params?.bookingId,
                });
                router.back();
              }}
              accessibilityLabel="Close"
            />
          ),
        }}
      />

      {/* Booking Payments */}
      <Stack.Screen
        name="payment"
        options={({ route }) => ({
          title: 'Payment Details',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          // Secure screen - no back navigation
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('booking_payment_close', {
                  booking_id: route.params?.bookingId,
                });
                router.back();
              }}
              accessibilityLabel="Close"
            />
          ),
        }}
      />

      {/* Booking Cancellation */}
      <Stack.Screen
        name="cancel"
        options={({ route }) => ({
          title: 'Cancel Booking',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('booking_cancel_flow_cancel', {
                  booking_id: route.params?.bookingId,
                });
                router.back();
              }}
              accessibilityLabel="Close"
            />
          ),
        }}
      />

      {/* Emergency Booking Support */}
      <Stack.Screen
        name="emergency"
        options={{
          title: 'Emergency Support',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          // Critical screen - no back navigation
          gestureEnabled: false,
          headerLeft: () => null,
          headerStyle: {
            backgroundColor: theme.colors.error,
          },
          headerTintColor: '#FFFFFF',
        }}
      />

      {/* Booking Documents */}
      <Stack.Screen
        name="documents"
        options={({ route }) => ({
          title: 'Booking Documents',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="📤"
                onPress={() => {
                  analyticsService.trackEvent('booking_documents_share', {
                    booking_id: route.params?.bookingId,
                  });
                  // Implement share functionality
                }}
                accessibilityLabel="Share Documents"
              />
              <IconButton
                icon="⬇️"
                onPress={() => {
                  analyticsService.trackEvent('booking_documents_download', {
                    booking_id: route.params?.bookingId,
                  });
                  // Implement download functionality
                }}
                accessibilityLabel="Download All"
              />
            </View>
          ),
        }}
      />

      {/* Booking Chat */}
      <Stack.Screen
        name="chat"
        options={({ route }) => ({
          title: 'Booking Chat',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="📞"
                onPress={() => {
                  analyticsService.trackEvent('booking_chat_call', {
                    booking_id: route.params?.bookingId,
                  });
                  // Implement call functionality
                }}
                accessibilityLabel="Call"
              />
              <IconButton
                icon="⚙️"
                onPress={() => {
                  analyticsService.trackEvent('booking_chat_settings', {
                    booking_id: route.params?.bookingId,
                  });
                  // Implement chat settings
                }}
                accessibilityLabel="Chat Settings"
              />
            </View>
          ),
        }}
      />
    </Stack>
  );
}

// Custom header back button with analytics
function HeaderBackButton({ onPress, ...props }) {
  const { canGoBack, goBack } = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();

  const handlePress = () => {
    // Track back button press in bookings context
    analyticsService.trackEvent('bookings_back_button', {
      screen: segments[segments.length - 1],
      from_booking: segments.includes('[id]') ? 'booking_details' : 'bookings_list',
    });

    if (onPress) {
      onPress();
    } else if (canGoBack()) {
      goBack();
    }
  };

  return (
    <HeaderBackButton
      {...props}
      onPress={handlePress}
      tintColor={theme.colors.text}
    />
  );
}

// Custom header actions component
function HeaderActions({ children }) {
  return (
    <View style={styles.headerActions}>
      {children}
    </View>
  );
}

// Icon button component for header actions
function IconButton({ icon, onPress, accessibilityLabel, size = 'small' }) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        size === 'small' && styles.iconButtonSmall,
        size === 'large' && styles.iconButtonLarge,
        { backgroundColor: theme.colors.surface },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <ThemedText style={styles.iconButtonText}>
        {icon}
      </ThemedText>
    </TouchableOpacity>
  );
}

// Error boundary for bookings layout
export function ErrorBoundary(props) {
  const router = useRouter();
  const { theme } = useTheme();

  const handleReset = () => {
    // Try to recover by navigating to bookings list
    router.replace('/(tabs)/bookings');
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.errorContainer}>
      <ThemedText type="title" style={styles.errorTitle}>
        Bookings Error
      </ThemedText>
      <ThemedText type="default" style={styles.errorMessage}>
        We encountered an issue with the bookings section. You can try to continue or return home.
      </ThemedText>
      <View style={styles.errorButtons}>
        <PrimaryButton
          title="Try Again"
          onPress={handleReset}
          style={styles.errorButton}
        />
        <OutlineButton
          title="Go Home"
          onPress={handleGoHome}
          style={styles.errorButton}
        />
      </View>
    </View>
  );
}

const styles = {
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  iconButtonSmall: {
    padding: 6,
  },
  iconButtonLarge: {
    padding: 10,
  },
  iconButtonText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    opacity: 0.8,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  errorButton: {
    minWidth: 120,
  },
};

// Note: You'll need to import the actual HeaderBackButton from Expo Router
// and implement the ThemedText, PrimaryButton, and OutlineButton components