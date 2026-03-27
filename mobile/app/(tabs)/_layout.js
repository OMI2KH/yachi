import React, { useEffect, useState } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Platform, View, Animated, Easing } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLoading } from '../../contexts/loading-context';
import { BlurView } from 'expo-blur';
import { ThemedText } from '../../components/themed-text';
import Loading from '../../components/ui/loading';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Tab bar icons (you'll replace these with your actual icons)
const TabBarIcon = ({ name, focused, color, size }) => {
  const icons = {
    home: focused ? '🏠' : '🏠',
    explore: focused ? '🔍' : '🔍',
    bookings: focused ? '📅' : '📅',
    messages: focused ? '💬' : '💬',
    profile: focused ? '👤' : '👤',
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText style={{ fontSize: size, color }}>
        {icons[name] || '📱'}
      </ThemedText>
    </View>
  );
};

// Custom tab bar component with animations
function CustomTabBar({ state, descriptors, navigation, position }) {
  const { theme, isDark } = useTheme();
  const [animatedValues] = useState(
    state.routes.map(() => new Animated.Value(0))
  );

  // Animate tab focus changes
  useEffect(() => {
    state.routes.forEach((route, index) => {
      const isFocused = state.index === index;
      Animated.timing(animatedValues[index], {
        toValue: isFocused ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });
  }, [state.index]);

  const tabBarStyle = {
    // Common tab bar styles
    ...(Platform.OS === 'ios' 
      ? {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }
      : {
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        }
    ),
  };

  const blurViewStyle = {
    ...tabBarStyle,
    height: Platform.OS === 'ios' ? 90 : 70, // Account for home indicator on iOS
    overflow: 'hidden',
  };

  const TabBarContent = () => (
    <View style={[styles.tabBar, tabBarStyle]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // Track tab navigation
            analyticsService.trackEvent('tab_navigation', {
              from_tab: state.routes[state.index]?.name,
              to_tab: route.name,
            });

            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const scale = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.1],
        });

        const opacity = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        });

        const backgroundColor = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: ['transparent', theme.colors.primary + '20'], // 20% opacity
        });

        return (
          <Animated.View
            key={route.key}
            style={[
              styles.tabItem,
              {
                transform: [{ scale }],
                opacity,
                backgroundColor,
              },
            ]}
          >
            <View style={styles.tabButton}>
              <TabBarIcon
                name={route.name.toLowerCase()}
                focused={isFocused}
                color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
                size={24}
              />
              
              <Animated.Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? theme.colors.primary : theme.colors.textSecondary,
                    opacity,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Animated.Text>
            </View>

            {/* Active indicator */}
            {isFocused && (
              <View
                style={[
                  styles.activeIndicator,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            )}

            {/* Touchable overlay */}
            <View style={styles.touchableOverlay}>
              <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor }]}
              />
              <View
                style={styles.touchableArea}
                onTouchStart={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
              />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );

  // iOS with blur effect, Android with solid background
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={blurViewStyle}
      >
        <TabBarContent />
      </BlurView>
    );
  }

  return (
    <View
      style={[
        blurViewStyle,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <TabBarContent />
    </View>
  );
}

/**
 * Main Tab Navigator Layout
 * Handles the primary app navigation with bottom tabs
 */
export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { theme, isDark } = useTheme();
  const { loading: appLoading } = useLoading();

  // Authentication guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🔄 TabLayout: User not authenticated, redirecting to auth');
      
      // Track unauthorized tab access
      analyticsService.trackEvent('unauthorized_tab_access', {
        attempted_tab: segments[segments.length - 1],
        user_id: user?.id,
      });

      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, authLoading, segments]);

  // Track tab screen views
  useEffect(() => {
    if (isAuthenticated && segments[0] === '(tabs)') {
      const screen = segments[segments.length - 1] || 'home';
      analyticsService.trackScreenView(`tab_${screen}`, {
        user_id: user?.id,
        user_type: user?.role,
      });
    }
  }, [segments, isAuthenticated, user]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Loading 
        type="full_screen" 
        message="Checking authentication..." 
        showLogo 
      />
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return (
      <Loading 
        type="full_screen" 
        message="Redirecting to login..." 
        showLogo 
      />
    );
  }

  // Common screen options
  const commonScreenOptions = {
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
    headerShadowVisible: false,
    contentStyle: {
      backgroundColor: theme.colors.background,
    },
  };

  // Tab bar configuration
  const tabBarOptions = {
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textSecondary,
    tabBarStyle: {
      display: 'flex',
      borderTopWidth: 0,
      backgroundColor: 'transparent',
    },
    tabBarBackground: () =>
      Platform.OS === 'ios' ? (
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.surface },
          ]}
        />
      ),
  };

  return (
    <Tabs
      screenOptions={{
        ...commonScreenOptions,
        ...tabBarOptions,
        // Use our custom tab bar
        tabBar: (props) => <CustomTabBar {...props} />,
      }}
      sceneContainerStyle={{
        backgroundColor: theme.colors.background,
      }}
      backBehavior="history"
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Yachi',
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon name="home" focused={focused} color={color} size={size} />
          ),
          tabBarTestID: 'tab-home',
          tabBarAccessibilityLabel: 'Home Tab',
        }}
      />

      {/* Explore Tab */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerTitle: 'Explore Services',
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon name="explore" focused={focused} color={color} size={size} />
          ),
          tabBarTestID: 'tab-explore',
          tabBarAccessibilityLabel: 'Explore Tab',
        }}
      />

      {/* Bookings Tab */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          headerTitle: 'My Bookings',
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon name="bookings" focused={focused} color={color} size={size} />
          ),
          tabBarTestID: 'tab-bookings',
          tabBarAccessibilityLabel: 'Bookings Tab',
          // Show badge for pending bookings
          tabBarBadge: undefined, // You can set this dynamically
        }}
      />

      {/* Messages Tab */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          headerTitle: 'Messages',
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon name="messages" focused={focused} color={color} size={size} />
          ),
          tabBarTestID: 'tab-messages',
          tabBarAccessibilityLabel: 'Messages Tab',
          // Show badge for unread messages
          tabBarBadge: undefined, // You can set this dynamically
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon name="profile" focused={focused} color={color} size={size} />
          ),
          tabBarTestID: 'tab-profile',
          tabBarAccessibilityLabel: 'Profile Tab',
        }}
      />
    </Tabs>
  );
}

// Error boundary for tab layout
export function ErrorBoundary(props) {
  const router = useRouter();

  const handleReset = () => {
    // Try to recover by navigating to home
    router.replace('/(tabs)');
  };

  const handleLogout = () => {
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.errorContainer}>
      <ThemedText type="title" style={styles.errorTitle}>
        Navigation Error
      </ThemedText>
      <ThemedText type="default" style={styles.errorMessage}>
        We encountered an issue with the app navigation. You can try to continue or sign out and back in.
      </ThemedText>
      <View style={styles.errorButtons}>
        <Button
          title="Try Again"
          onPress={handleReset}
          variant="primary"
          style={styles.errorButton}
        />
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="outline"
          style={styles.errorButton}
        />
      </View>
    </View>
  );
}

const styles = {
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 8,
    paddingTop: 8,
    minHeight: Platform.OS === 'ios' ? 90 : 70,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  touchableOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  touchableArea: {
    flex: 1,
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

// Make styles compatible with StyleSheet
const StyleSheet = {
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ...styles,
};