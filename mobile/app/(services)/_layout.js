import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLoading } from '../../contexts/loading-context';
import Loading from '../../components/ui/loading';
import { Platform, BackHandler } from 'react-native';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

/**
 * Services Stack Layout
 * Handles all service-related screens (search, details, creation, management)
 * Includes service-specific navigation patterns and modals
 */
export default function ServicesLayout() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { theme, isDark } = useTheme();
  const { loading: appLoading } = useLoading();

  // Get current service screen for analytics
  const getCurrentServiceScreen = () => {
    const segment = segments[segments.length - 1];
    return segment || 'search';
  };

  // Track screen views for analytics
  useEffect(() => {
    if (rootNavigationState?.key) {
      const screen = getCurrentServiceScreen();
      analyticsService.trackScreenView(`services_${screen}`, {
        user_id: user?.id,
        user_role: user?.role,
        is_authenticated: isAuthenticated,
      });
    }
  }, [segments, rootNavigationState?.key]);

  // Handle Android back button for service flows
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const currentScreen = getCurrentServiceScreen();
      
      // Special handling for service creation flow
      if (currentScreen === 'create' || currentScreen === 'edit') {
        Alert.alert(
          'Discard Changes?',
          'Are you sure you want to leave? Your changes will not be saved.',
          [
            { text: 'Stay', style: 'cancel' },
            { 
              text: 'Discard', 
              style: 'destructive', 
              onPress: () => router.back() 
            },
          ]
        );
        return true;
      }
      
      return false;
    });

    return () => backHandler.remove();
  }, [segments]);

  // Authentication guard for service creation/management
  useEffect(() => {
    if (!rootNavigationState?.key || authLoading) return;

    const inServicesGroup = segments[0] === '(services)';
    const currentScreen = getCurrentServiceScreen();
    const protectedScreens = ['create', 'edit', 'manage'];
    
    if (!isAuthenticated && inServicesGroup && protectedScreens.includes(currentScreen)) {
      console.log('🔄 ServicesLayout: User not authenticated, redirecting to login');
      
      analyticsService.trackEvent('services_auth_required', {
        attempted_screen: currentScreen,
        user_id: user?.id,
      });

      // Redirect to login with return URL
      router.replace({
        pathname: '/(auth)/login',
        params: { returnTo: `/(services)/${currentScreen}` },
      });
    }
  }, [isAuthenticated, segments, authLoading, rootNavigationState?.key]);

  // Show loading while checking auth state
  if (authLoading || !rootNavigationState?.key) {
    return (
      <Loading 
        type="full_screen" 
        message="Loading services..." 
        showLogo 
      />
    );
  }

  // Common screen options for services stack
  const commonScreenOptions = {
    // Global screen options for services stack
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
    // Smooth animations optimized for service flows
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
      {/* Service Search & Discovery */}
      <Stack.Screen
        name="search"
        options={{
          title: 'Find Services',
          headerShown: true,
          headerShadowVisible: false,
          // Large header for search emphasis
          headerLargeTitle: Platform.OS === 'ios',
          headerLargeTitleShadowVisible: false,
          headerTransparent: Platform.OS === 'ios',
          // Search-specific header styling
          headerStyle: {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.colors.background,
          },
        }}
      />

      {/* Service Details */}
      <Stack.Screen
        name="[id]"
        options={({ route }) => ({
          title: 'Service Details',
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
                analyticsService.trackEvent('service_details_back', {
                  service_id: route.params?.id,
                });
                router.back();
              }}
            />
          ),
          // Share and favorite actions
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="🔍"
                onPress={() => {
                  analyticsService.trackEvent('service_share', {
                    service_id: route.params?.id,
                  });
                  // Implement share functionality
                }}
                accessibilityLabel="Share Service"
              />
              <IconButton
                icon="❤️"
                onPress={() => {
                  analyticsService.trackEvent('service_favorite', {
                    service_id: route.params?.id,
                  });
                  // Implement favorite functionality
                }}
                accessibilityLabel="Add to Favorites"
              />
            </View>
          ),
        })}
      />

      {/* Service Creation */}
      <Stack.Screen
        name="create"
        options={{
          title: 'Create Service',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          // Prevent accidental dismissal
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('service_create_cancel');
                router.back();
              }}
              accessibilityLabel="Close"
            />
          ),
        }}
      />

      {/* Service Edit */}
      <Stack.Screen
        name="edit"
        options={({ route }) => ({
          title: 'Edit Service',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('service_edit_cancel', {
                  service_id: route.params?.id,
                });
                router.back();
              }}
              accessibilityLabel="Close"
            />
          ),
        })}
      />

      {/* Service Management */}
      <Stack.Screen
        name="manage"
        options={{
          title: 'Manage Services',
          headerShown: true,
          headerShadowVisible: false,
          // Provider-only access
          headerRight: () => (
            <IconButton
              icon="➕"
              onPress={() => {
                analyticsService.trackEvent('service_manage_create');
                router.push('/(services)/create');
              }}
              accessibilityLabel="Create New Service"
            />
          ),
        }}
      />

      {/* Service Booking Flow */}
      <Stack.Screen
        name="booking"
        options={{
          title: 'Book Service',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          // Prevent back navigation during booking flow
          gestureEnabled: false,
          headerLeft: () => null,
        }}
      />

      {/* Service Reviews */}
      <Stack.Screen
        name="reviews"
        options={({ route }) => ({
          title: 'Service Reviews',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <IconButton
              icon="✕"
              onPress={() => {
                analyticsService.trackEvent('service_reviews_close', {
                  service_id: route.params?.id,
                });
                router.back();
              }}
              accessibilityLabel="Close Reviews"
            />
          ),
        })}
      />

      {/* Service Provider Profile */}
      <Stack.Screen
        name="provider"
        options={({ route }) => ({
          title: 'Provider Profile',
          headerShown: true,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="💬"
                onPress={() => {
                  analyticsService.trackEvent('provider_message', {
                    provider_id: route.params?.id,
                  });
                  // Navigate to messages
                  router.push({
                    pathname: '/(messages)/conversation',
                    params: { providerId: route.params?.id },
                  });
                }}
                accessibilityLabel="Message Provider"
              />
              <IconButton
                icon="🔍"
                onPress={() => {
                  analyticsService.trackEvent('provider_report', {
                    provider_id: route.params?.id,
                  });
                  // Implement report functionality
                }}
                accessibilityLabel="Report Provider"
              />
            </View>
          ),
        })}
      />

      {/* Service Categories */}
      <Stack.Screen
        name="categories"
        options={{
          title: 'Categories',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Service Filters */}
      <Stack.Screen
        name="filters"
        options={{
          title: 'Filters',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <Button
              title="Reset"
              variant="ghost"
              onPress={() => {
                analyticsService.trackEvent('service_filters_reset');
                // Implement filter reset
              }}
            />
          ),
        }}
      />

      {/* Service Location Selection */}
      <Stack.Screen
        name="location"
        options={{
          title: 'Select Location',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerRight: () => (
            <IconButton
              icon="📍"
              onPress={() => {
                analyticsService.trackEvent('service_location_current');
                // Implement current location detection
              }}
              accessibilityLabel="Use Current Location"
            />
          ),
        }}
      />

      {/* Service Booking Confirmation */}
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
        }}
      />

      {/* Service Emergency Access */}
      <Stack.Screen
        name="emergency"
        options={{
          title: 'Emergency Services',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          // Critical screen - no back navigation
          gestureEnabled: false,
          headerLeft: () => null,
        }}
      />
    </Stack>
  );
}

// Custom header back button with analytics
function HeaderBackButton({ onPress, ...props }) {
  const { canGoBack, goBack } = useRouter();
  const segments = useSegments();

  const handlePress = () => {
    // Track back button press in services context
    analyticsService.trackEvent('services_back_button', {
      screen: segments[segments.length - 1],
      from_service: segments.includes('[id]') ? 'service_details' : 'services_list',
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
  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        size === 'small' && styles.iconButtonSmall,
        size === 'large' && styles.iconButtonLarge,
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

// Error boundary for services layout
export function ErrorBoundary(props) {
  const router = useRouter();

  const handleReset = () => {
    // Try to recover by navigating to services search
    router.replace('/(services)/search');
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.errorContainer}>
      <ThemedText type="title" style={styles.errorTitle}>
        Services Error
      </ThemedText>
      <ThemedText type="default" style={styles.errorMessage}>
        We encountered an issue with the services section. You can try to continue or return home.
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
// and implement the ThemedText component