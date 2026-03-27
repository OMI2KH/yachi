// app/(profile)/_layout.js
import React, { useEffect, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Platform, BackHandler, Alert } from 'react-native';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useLoading } from '../../../contexts/loading-context';
import { analyticsService } from '../../../services/analytics-service';
import { errorService } from '../../../services/error-service';

export default function ProfileLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated } = useAuth();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }
  }, [segments]);

  // Track screen views
  useEffect(() => {
    const screenName = getCurrentScreenName();
    analyticsService.trackScreenView(screenName, {
      userId: user?.id,
      userRole: user?.role,
    });
  }, [segments, user]);

  // Get current screen name for analytics
  const getCurrentScreenName = () => {
    const path = segments.join('/');
    const screenMap = {
      '(profile)': 'profile_main',
      '(profile)/edit': 'profile_edit',
      '(profile)/verification': 'profile_verification',
      '(profile)/portfolio': 'profile_portfolio',
      '(profile)/settings': 'profile_settings',
      '(profile)/security': 'profile_security',
      '(profile)/preferences': 'profile_preferences',
      '(profile)/documents': 'profile_documents',
      '(profile)/reviews': 'profile_reviews',
    };
    
    return screenMap[path] || 'profile_unknown';
  };

  // Handle back button press
  const handleBackPress = () => {
    const currentRoute = segments[segments.length - 1];
    
    // If we're on the main profile screen, let default back behavior work
    if (currentRoute === '(profile)' && segments.length === 1) {
      return false;
    }
    
    // For nested screens, handle navigation properly
    if (canGoBackSafely()) {
      router.back();
      return true;
    }
    
    return false;
  };

  // Check if we can safely go back without losing data
  const canGoBackSafely = () => {
    const currentRoute = segments[segments.length - 1];
    const unsafeRoutes = ['edit', 'verification', 'portfolio']; // Routes with unsaved changes
    
    if (unsafeRoutes.includes(currentRoute)) {
      showUnsavedChangesAlert();
      return false;
    }
    
    return true;
  };

  // Show unsaved changes alert
  const showUnsavedChangesAlert = () => {
    Alert.alert(
      'Unsaved Changes',
      'You have unsaved changes. Are you sure you want to leave?',
      [
        {
          text: 'Stay',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            // Force navigation back
            setTimeout(() => router.back(), 100);
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Handle deep linking
  const handleDeepLink = useCallback((url) => {
    try {
      const route = url.replace(/.*?:\/\//g, '');
      const routeSegments = route.split('/');
      
      if (routeSegments[0] === 'profile') {
        const screen = routeSegments[1];
        const params = routeSegments[2] ? { id: routeSegments[2] } : {};
        
        switch (screen) {
          case 'edit':
            router.push('/(profile)/edit');
            break;
          case 'verification':
            router.push('/(profile)/verification');
            break;
          case 'portfolio':
            router.push('/(profile)/portfolio');
            break;
          case 'settings':
            router.push('/(profile)/settings');
            break;
          default:
            router.push('/(profile)');
        }
        
        analyticsService.trackEvent('profile_deep_link_opened', { url, screen });
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      errorService.captureError(error, { context: 'ProfileDeepLink', url });
    }
  }, [router]);

  // Get header options for different screens
  const getScreenOptions = (route) => {
    const commonOptions = {
      headerStyle: {
        backgroundColor: theme.colors.background,
        shadowColor: 'transparent',
        elevation: 0,
      },
      headerTintColor: theme.colors.text,
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
        color: theme.colors.text,
      },
      headerBackTitle: 'Back',
      headerBackTitleVisible: false,
    };

    const screenSpecificOptions = {
      // Main profile screen
      '(profile)': {
        headerShown: true,
        title: 'My Profile',
        headerRight: () => (
          <HeaderButton
            icon="settings"
            onPress={() => router.push('/(profile)/settings')}
            theme={theme}
          />
        ),
      },
      
      // Edit profile screen
      'edit': {
        headerShown: true,
        title: 'Edit Profile',
        headerRight: () => (
          <HeaderButton
            icon="save"
            onPress={() => {
              // This would be connected to the form submit
              console.log('Save profile');
            }}
            theme={theme}
          />
        ),
      },
      
      // Verification screen
      'verification': {
        headerShown: true,
        title: 'Identity Verification',
        headerRight: () => (
          <HeaderButton
            icon="help"
            onPress={() => router.push('/modal?type=verification_help')}
            theme={theme}
          />
        ),
      },
      
      // Portfolio screen
      'portfolio': {
        headerShown: true,
        title: 'My Portfolio',
        headerRight: () => (
          <HeaderButton
            icon="add"
            onPress={() => router.push('/(profile)/portfolio/create')}
            theme={theme}
          />
        ),
      },
      
      // Settings screen
      'settings': {
        headerShown: true,
        title: 'Settings',
        presentation: 'modal',
      },
      
      // Security screen
      'security': {
        headerShown: true,
        title: 'Security',
      },
      
      // Preferences screen
      'preferences': {
        headerShown: true,
        title: 'Preferences',
      },
      
      // Documents screen
      'documents': {
        headerShown: true,
        title: 'My Documents',
      },
      
      // Reviews screen
      'reviews': {
        headerShown: true,
        title: 'My Reviews',
      },
    };

    return {
      ...commonOptions,
      ...(screenSpecificOptions[route] || {}),
    };
  };

  // Authentication guard
  if (!isAuthenticated) {
    // We could redirect to auth here, but let the root layout handle it
    return null;
  }

  return (
    <Stack
      screenOptions={{
        // Default options for all screens
        animation: 'fade_from_bottom',
        animationDuration: 300,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        ...getScreenOptions('default'),
      }}
    >
      {/* Main Profile Screen */}
      <Stack.Screen
        name="index"
        options={getScreenOptions('(profile)')}
      />

      {/* Edit Profile */}
      <Stack.Screen
        name="edit"
        options={getScreenOptions('edit')}
      />

      {/* Verification */}
      <Stack.Screen
        name="verification"
        options={getScreenOptions('verification')}
      />

      {/* Portfolio */}
      <Stack.Screen
        name="portfolio"
        options={getScreenOptions('portfolio')}
      />

      {/* Settings Stack */}
      <Stack.Screen
        name="settings"
        options={getScreenOptions('settings')}
      />

      {/* Security Settings */}
      <Stack.Screen
        name="security"
        options={getScreenOptions('security')}
      />

      {/* Preferences */}
      <Stack.Screen
        name="preferences"
        options={getScreenOptions('preferences')}
      />

      {/* Documents */}
      <Stack.Screen
        name="documents"
        options={getScreenOptions('documents')}
      />

      {/* Reviews */}
      <Stack.Screen
        name="reviews"
        options={getScreenOptions('reviews')}
      />

      {/* Portfolio Creation Modal */}
      <Stack.Screen
        name="portfolio/create"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Add to Portfolio',
          ...getScreenOptions('default'),
        }}
      />

      {/* Verification Help Modal */}
      <Stack.Screen
        name="verification/help"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Verification Help',
          ...getScreenOptions('default'),
        }}
      />
    </Stack>
  );
}

// Header Button Component
const HeaderButton = ({ icon, onPress, theme, disabled = false }) => {
  const getIconComponent = () => {
    const iconMap = {
      settings: '⚙️',
      save: '💾',
      help: '❓',
      add: '➕',
    };
    
    return iconMap[icon] || '🔘';
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        headerButtonStyles.container,
        {
          opacity: pressed ? 0.6 : 1,
          backgroundColor: pressed ? theme.colors.card : 'transparent',
        },
        disabled && { opacity: 0.3 },
      ]}
      hitSlop={8}
    >
      <Text style={[headerButtonStyles.icon, { color: theme.colors.text }]}>
        {getIconComponent()}
      </Text>
    </Pressable>
  );
};

const headerButtonStyles = {
  container: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  icon: {
    fontSize: 18,
  },
};

// Pressable component (replace with your actual Pressable component)
const Pressable = ({ children, onPress, style, disabled, hitSlop }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={style}
      disabled={disabled}
      hitSlop={hitSlop}
    >
      {children}
    </TouchableOpacity>
  );
};

// TouchableOpacity component (replace with your actual component)
const TouchableOpacity = ({ children, onPress, style, disabled, hitSlop }) => {
  return (
    <View style={style}>
      {children}
    </View>
  );
};