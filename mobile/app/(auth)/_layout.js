import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from '../../contexts/auth-context';
import { useTheme } from '../../contexts/theme-context';
import { useLoading } from '../../contexts/loading-context';
import Loading from '../../components/ui/loading';
import { Platform, BackHandler, Alert, View } from 'react-native';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { ThemedText } from '../../components/themed-text';
import { PrimaryButton } from '../../components/ui/button';

/**
 * Auth Stack Layout - Multi-Role Authentication
 * Handles all authentication flows for Clients, Service Providers, Government, and Admin
 * Includes Ethiopian market features and role-based routing
 */
export default function AuthLayout() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const { isAuthenticated, loading: authLoading, user, role } = useAuth();
  const { theme, isDark } = useTheme();
  const { loading: appLoading } = useLoading();

  // Get current auth screen for analytics
  const getCurrentAuthScreen = () => {
    const segment = segments[segments.length - 1];
    return segment || 'welcome';
  };

  // Track screen views for analytics
  useEffect(() => {
    if (rootNavigationState?.key) {
      const screen = getCurrentAuthScreen();
      analyticsService.trackScreenView(`auth_${screen}`, {
        user_id: user?.id,
        user_role: user?.role,
        is_authenticated: isAuthenticated,
        auth_method: user?.auth_method,
      });
    }
  }, [segments, rootNavigationState?.key, user]);

  // Handle Android back button with Ethiopian market considerations
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const currentScreen = getCurrentAuthScreen();
      
      // Don't allow back navigation from welcome/role selection if not authenticated
      if ((currentScreen === 'welcome' || currentScreen === 'role-selection') && !isAuthenticated) {
        Alert.alert(
          'Exit Yachi',
          'ማጥፋት ይፈልጋሉ?', // Amharic translation
          [
            { text: 'Stay', style: 'cancel' },
            { 
              text: 'Exit', 
              style: 'destructive', 
              onPress: () => {
                analyticsService.trackEvent('app_exit_from_auth', {
                  screen: currentScreen,
                  user_role: user?.role,
                });
                BackHandler.exitApp();
              }
            }
          ]
        );
        return true;
      }
      
      // Allow normal back navigation for other screens
      return false;
    });

    return () => backHandler.remove();
  }, [isAuthenticated, segments, user]);

  // Redirect authenticated users based on their role
  useEffect(() => {
    if (!rootNavigationState?.key || authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (isAuthenticated && inAuthGroup && user?.role) {
      console.log(`🔄 AuthLayout: ${user.role} authenticated, redirecting to appropriate dashboard`);
      
      // Track successful authentication redirect
      analyticsService.trackEvent('auth_redirect_success', {
        from_screen: getCurrentAuthScreen(),
        user_role: user.role,
        user_id: user.id,
        is_verified: user.isVerified,
      });

      // Role-based routing with Ethiopian market focus
      let redirectPath = '/(tabs)'; // Default fallback
      
      switch (user.role) {
        case 'client':
          redirectPath = '/(tabs)';
          break;
        case 'service_provider':
          // Service providers go to projects tab for construction work
          redirectPath = user.isVerified ? '/(tabs)/projects' : '/(profile)/verification';
          break;
        case 'government':
          // Government users go to government portal
          redirectPath = '/(government)/dashboard';
          break;
        case 'admin':
          redirectPath = '/admin-dashboard';
          break;
        default:
          redirectPath = '/(tabs)';
      }

      // Use replace to prevent going back to auth screens
      router.replace(redirectPath);
    }
  }, [isAuthenticated, segments, authLoading, rootNavigationState?.key, user]);

  // Show loading while checking auth state
  if (authLoading || !rootNavigationState?.key || appLoading) {
    return (
      <Loading 
        type="full_screen" 
        message="Checking authentication..." 
        showLogo 
        ethiopianTheme
      />
    );
  }

  // If user is authenticated, don't render auth screens
  if (isAuthenticated) {
    return (
      <Loading 
        type="full_screen" 
        message="Redirecting to your dashboard..." 
        showLogo 
        ethiopianTheme
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        // Global screen options for auth stack with Ethiopian theme
        headerStyle: {
          backgroundColor: theme.colors.primary, // Ethiopian green
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          fontFamily: 'Inter-SemiBold',
        },
        headerBackTitle: 'Back',
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        // Smooth animations
        animation: 'slide_from_right',
        animationDuration: 300,
        // Gesture configuration
        gestureEnabled: true,
        fullScreenGestureEnabled: Platform.OS === 'ios',
        gestureDirection: 'horizontal',
      }}
    >
      {/* Welcome/Onboarding Screen - First screen users see */}
      <Stack.Screen
        name="welcome"
        options={{
          title: 'Welcome to Yachi',
          headerShown: false, // No header on welcome screen
          gestureEnabled: false,
        }}
      />

      {/* Role Selection Screen - Ethiopian market specific roles */}
      <Stack.Screen
        name="role-selection"
        options={{
          title: 'Join as', // Simple title for multiple languages
          headerShown: true,
          headerShadowVisible: false,
          // Custom back button for role selection
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              onPress={() => {
                analyticsService.trackEvent('auth_back_from_role_selection');
                router.back();
              }}
            />
          ),
        }}
      />

      {/* Registration Flow - Role-based forms */}
      <Stack.Screen
        name="register"
        options={{
          title: 'Create Account',
          headerShown: true,
          headerShadowVisible: false,
          // Dynamic title based on role in route params
          headerTitle: ({ children }) => {
            const role = segments.find(seg => 
              ['client', 'service_provider', 'government'].includes(seg)
            );
            const roleTitles = {
              client: 'Client Registration',
              service_provider: 'Service Provider Sign Up',
              government: 'Government Registration',
            };
            return (
              <ThemedText type="subtitle" style={{ color: '#FFFFFF' }}>
                {roleTitles[role] || 'Create Account'}
              </ThemedText>
            );
          },
        }}
      />

      {/* Login Screen - Multi-role compatible */}
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In to Yachi',
          headerShown: true,
          headerShadowVisible: false,
          // Prevent going back from login to welcome
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />

      {/* Phone Verification - Critical for Ethiopian market */}
      <Stack.Screen
        name="phone-verification"
        options={{
          title: 'Verify Phone',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          // Don't allow skipping phone verification
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />

      {/* Profile Setup - Role-specific onboarding */}
      <Stack.Screen
        name="profile-setup"
        options={{
          title: 'Complete Profile',
          headerShown: true,
          headerShadowVisible: false,
          // Dynamic back button behavior
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              onPress={() => {
                analyticsService.trackEvent('auth_back_from_profile_setup', {
                  user_role: user?.role,
                });
                router.back();
              }}
            />
          ),
        }}
      />

      {/* Terms & Conditions - Ethiopian legal requirements */}
      <Stack.Screen
        name="terms"
        options={{
          title: 'Terms & Conditions',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Biometric Setup - Security feature */}
      <Stack.Screen
        name="biometric-setup"
        options={{
          title: 'Enable Biometric Login',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Forgot Password Flow */}
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Reset Password',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Social Auth Callback - Ethiopian social platforms */}
      <Stack.Screen
        name="social-callback"
        options={{
          title: 'Connecting...',
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />

      {/* Emergency Access - Ethiopian market consideration */}
      <Stack.Screen
        name="emergency-access"
        options={{
          title: 'Emergency Access',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />

      {/* Service Provider Verification - Ethiopian documents */}
      <Stack.Screen
        name="verification"
        options={{
          title: 'Account Verification',
          headerShown: true,
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

// Enhanced header back button with Ethiopian market analytics
function HeaderBackButton({ onPress, ...props }) {
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();

  const handlePress = () => {
    // Track back button press with Ethiopian context
    analyticsService.trackEvent('auth_back_button_pressed', {
      screen: segments[segments.length - 1],
      user_flow: getAuthFlowType(segments),
      timestamp: new Date().toISOString(),
    });

    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  // Determine auth flow type for analytics
  const getAuthFlowType = (segments) => {
    if (segments.includes('service_provider')) return 'service_provider_onboarding';
    if (segments.includes('government')) return 'government_onboarding';
    if (segments.includes('client')) return 'client_onboarding';
    return 'general_auth';
  };

  return (
    <HeaderBackButton
      {...props}
      onPress={handlePress}
      tintColor="#FFFFFF" // White for contrast on green header
      canGoBack={router.canGoBack()}
    />
  );
}

// Enhanced error boundary for Ethiopian market
export function ErrorBoundary(props) {
  const router = useRouter();
  const { clearAuthError } = useAuth();

  const handleReset = () => {
    // Clear any auth errors and navigate to welcome
    clearAuthError();
    analyticsService.trackEvent('auth_error_recovery', {
      error_type: 'layout_error',
      recovery_action: 'navigate_to_welcome',
    });
    router.replace('/(auth)/welcome');
  };

  const handleSupport = () => {
    // Ethiopian support contact
    analyticsService.trackEvent('auth_support_contact', {
      reason: 'layout_error',
    });
    // In a real app, this would open email or phone
    Alert.alert(
      'Contact Support',
      'Call: +251 911 234 567\nEmail: support@yachi.com',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 20,
      backgroundColor: theme.colors.background 
    }}>
      <ThemedText type="title" style={{ marginBottom: 16, textAlign: 'center', color: theme.colors.error }}>
        Authentication Error
      </ThemedText>
      <ThemedText type="default" style={{ marginBottom: 16, textAlign: 'center' }}>
        We encountered an issue with the authentication flow.
      </ThemedText>
      <ThemedText type="default" style={{ marginBottom: 24, textAlign: 'center' }}>
        ከማረግ ያለፉት አገልግሎት ጋር ችግር ተፈጥሯል።
      </ThemedText>
      
      <View style={{ gap: 12, width: '100%' }}>
        <PrimaryButton
          title="Return to Welcome"
          onPress={handleReset}
          fullWidth
          variant="filled"
        />
        <PrimaryButton
          title="Contact Support"
          onPress={handleSupport}
          fullWidth
          variant="outline"
        />
      </View>
    </View>
  );
}

// Helper function to get appropriate redirect path based on user role and verification status
export function getRoleBasedRedirectPath(user) {
  if (!user?.role) return '/(tabs)';

  const basePaths = {
    client: '/(tabs)',
    service_provider: user.isVerified ? '/(tabs)/projects' : '/(profile)/verification',
    government: '/(government)/dashboard',
    admin: '/admin-dashboard',
  };

  return basePaths[user.role] || '/(tabs)';
}