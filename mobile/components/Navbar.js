// components/Navbar.js
/**
 * ENTERPRISE-LEVEL NAVBAR COMPONENT
 * Yachi Construction & Services Platform
 * Ethiopian Market Specialization with AI Construction Features
 * Premium Tier Integration & Multi-Role Support
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
  Image,
  InteractionManager,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context';
import { useNotifications } from '../contexts/notification-context';
import { usePremium } from '../contexts/premium-context';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS, ICON_SIZES } from '../constants/sizes';
import { ROUTES } from '../constants/navigation';
import { USER_ROLES, PREMIUM_TIERS } from '../constants/user';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Navbar = ({
  title = 'Yachi',
  showBackButton = false,
  showProfile = true,
  showNotifications = true,
  showSearch = false,
  showConstructionCTA = false,
  onSearchPress,
  onProfilePress,
  customAction,
  customActionIcon,
  onCustomActionPress,
  transparent = false,
  elevated = true,
  backgroundColor,
  titleColor,
  borderColor,
  emergencyMode = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount, emergencyNotifications } = useNotifications();
  const { isPremium, premiumTier } = usePremium();
  const { theme, isDark, toggleTheme } = useTheme();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Memoized style calculations
  const navbarStyles = useMemo(() => ({
    container: {
      backgroundColor: backgroundColor || 
        (transparent ? 'transparent' : theme.colors.background.elevated),
      borderBottomColor: borderColor || theme.colors.border.primary,
      borderBottomWidth: transparent ? 0 : StyleSheet.hairlineWidth,
      elevation: elevated && !transparent ? 8 : 0,
      shadowColor: elevated && !transparent ? theme.colors.shadow : 'transparent',
      shadowOffset: { width: 0, height: elevated ? 4 : 0 },
      shadowOpacity: elevated && !transparent ? 0.15 : 0,
      shadowRadius: elevated && !transparent ? 12 : 0,
    },
    title: {
      color: titleColor || theme.colors.text.primary,
    },
  }), [theme, transparent, elevated, backgroundColor, borderColor, titleColor]);

  // Navigation handlers with performance optimization
  const handleBack = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(ROUTES.TABS.HOME);
      }
    });
  }, [router]);

  const handleProfilePress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      if (onProfilePress) {
        onProfilePress();
      } else if (isAuthenticated) {
        router.push(ROUTES.PROFILE.MAIN);
      } else {
        router.push(ROUTES.AUTH.LOGIN);
      }
    });
  }, [isAuthenticated, onProfilePress, router]);

  const handleNotificationsPress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      router.push(ROUTES.MESSAGES.INBOX);
    });
  }, [router]);

  const handleSearchPress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      if (onSearchPress) {
        onSearchPress();
      } else {
        router.push(ROUTES.SERVICES.SEARCH);
      }
    });
  }, [onSearchPress, router]);

  // AI Construction Project Creation
  const handleCreateAIConstruction = useCallback(() => {
    if (!isAuthenticated) {
      router.push(ROUTES.AUTH.LOGIN);
      return;
    }

    if ([USER_ROLES.CLIENT, USER_ROLES.GOVERNMENT].includes(user?.role)) {
      InteractionManager.runAfterInteractions(() => {
        router.push(ROUTES.CONSTRUCTION.CREATE);
      });
    } else {
      Alert.alert(
        'Construction Project Access',
        'AI-powered construction project creation is available for clients and government entities. Upgrade your account or contact support for access.',
        [
          { text: 'Learn More', style: 'default' },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  }, [isAuthenticated, user?.role, router]);

  // Premium Feature Access
  const handlePremiumUpgrade = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      router.push(ROUTES.PREMIUM.UPGRADE);
    });
  }, [router]);

  // Menu Animation Management
  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isMenuOpen]);

  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim, scaleAnim]);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -SCREEN_WIDTH,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => setIsMenuOpen(false));
  }, [slideAnim, fadeAnim, scaleAnim, SCREEN_WIDTH]);

  // Dynamic Menu Items Based on User Role and Features
  const menuItems = useMemo(() => {
    const baseItems = [
      {
        id: 'home',
        icon: 'home-outline',
        label: 'Home',
        route: ROUTES.TABS.HOME,
        requiresAuth: false,
      },
      {
        id: 'explore',
        icon: 'search-outline',
        label: 'Explore Services',
        route: ROUTES.SERVICES.EXPLORE,
        requiresAuth: false,
      },
      {
        id: 'bookings',
        icon: 'calendar-outline',
        label: 'My Bookings',
        route: ROUTES.BOOKINGS.HISTORY,
        requiresAuth: true,
      },
    ];

    // AI Construction Features
    if ([USER_ROLES.CLIENT, USER_ROLES.GOVERNMENT].includes(user?.role)) {
      baseItems.push({
        id: 'ai-construction',
        icon: 'construct-outline',
        label: 'AI Construction Project',
        route: ROUTES.CONSTRUCTION.CREATE,
        requiresAuth: true,
        isFeatured: true,
        badge: 'AI 🤖',
      });
    }

    // Service Provider Features
    if (user?.role === USER_ROLES.PROVIDER) {
      baseItems.push(
        {
          id: 'create-service',
          icon: 'add-circle-outline',
          label: 'Create Service',
          route: ROUTES.SERVICES.CREATE,
          requiresAuth: true,
        },
        {
          id: 'project-invitations',
          icon: 'briefcase-outline',
          label: 'AI Project Invitations',
          route: ROUTES.PROJECTS.INVITATIONS,
          requiresAuth: true,
          badge: 'AI 🤖',
        }
      );
    }

    // Government Portal Features
    if (user?.role === USER_ROLES.GOVERNMENT) {
      baseItems.push(
        {
          id: 'government-portal',
          icon: 'business-outline',
          label: 'Government Portal',
          route: ROUTES.GOVERNMENT.DASHBOARD,
          requiresAuth: true,
          isFeatured: true,
        },
        {
          id: 'infrastructure',
          icon: 'git-network-outline',
          label: 'Infrastructure Projects',
          route: ROUTES.GOVERNMENT.PROJECTS,
          requiresAuth: true,
        }
      );
    }

    // Premium Features
    if (!isPremium) {
      baseItems.push({
        id: 'premium',
        icon: 'star-outline',
        label: 'Go Premium',
        route: ROUTES.PREMIUM.UPGRADE,
        requiresAuth: false,
        isPremium: true,
      });
    }

    // System Features
    baseItems.push(
      {
        id: 'theme',
        icon: isDark ? 'sunny-outline' : 'moon-outline',
        label: isDark ? 'Light Mode' : 'Dark Mode',
        action: toggleTheme,
        requiresAuth: false,
      },
      {
        id: 'settings',
        icon: 'settings-outline',
        label: 'Settings',
        route: ROUTES.PROFILE.SETTINGS,
        requiresAuth: true,
      }
    );

    // Authentication Items
    if (isAuthenticated) {
      baseItems.push({
        id: 'logout',
        icon: 'log-out-outline',
        label: 'Logout',
        action: () => {
          closeMenu();
          logout();
        },
        requiresAuth: true,
        isDestructive: true,
      });
    } else {
      baseItems.push({
        id: 'login',
        icon: 'log-in-outline',
        label: 'Login / Register',
        route: ROUTES.AUTH.LOGIN,
        requiresAuth: false,
      });
    }

    return baseItems.filter(item => !item.requiresAuth || isAuthenticated);
  }, [user?.role, isPremium, isDark, isAuthenticated, toggleTheme, logout, closeMenu]);

  // Handle Menu Item Press
  const handleMenuItemPress = useCallback((item) => {
    closeMenu();
    
    InteractionManager.runAfterInteractions(() => {
      if (item.action) {
        item.action();
      } else if (item.route) {
        router.push(item.route);
      }
    });
  }, [closeMenu, router]);

  // Emergency Mode Render
  if (emergencyMode) {
    return (
      <View style={[styles.emergencyContainer, { backgroundColor: COLORS.semantic.error[500] }]}>
        <StatusBar backgroundColor={COLORS.semantic.error[600]} barStyle="light-content" />
        <View style={styles.emergencyContent}>
          <Ionicons name="warning" size={20} color="#FFFFFF" />
          <Text style={styles.emergencyText}>Emergency Mode Active</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Enterprise Navbar */}
      <View style={[styles.container, navbarStyles.container]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={navbarStyles.container.backgroundColor}
          translucent={transparent}
        />
        
        <View style={styles.content}>
          {/* Left Navigation Section */}
          <View style={styles.leftSection}>
            {showBackButton ? (
              <TouchableOpacity
                style={[styles.navButton, styles.backButton]}
                onPress={handleBack}
                hitSlop={styles.hitSlop}
              >
                <Ionicons
                  name="chevron-back"
                  size={ICON_SIZES.lg}
                  color={navbarStyles.title.color}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, styles.menuButton]}
                onPress={toggleMenu}
                hitSlop={styles.hitSlop}
              >
                <Ionicons
                  name="menu"
                  size={ICON_SIZES.lg}
                  color={navbarStyles.title.color}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Center Title Section */}
          <View style={styles.centerSection}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Text style={[styles.title, navbarStyles.title]} numberOfLines={1}>
                {title}
              </Text>
            </Animated.View>
            
            {/* Premium & Verification Badges */}
            <View style={styles.badgeContainer}>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={10} color={COLORS.accent[500]} />
                  <Text style={styles.premiumText}>
                    {premiumTier === PREMIUM_TIERS.PRO ? 'PRO' : 'PREMIUM'}
                  </Text>
                </View>
              )}
              
              {user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={10} color={COLORS.semantic.success[500]} />
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              )}
            </View>
          </View>

          {/* Right Action Section */}
          <View style={styles.rightSection}>
            {/* AI Construction CTA */}
            {showConstructionCTA && (
              <TouchableOpacity
                style={[styles.navButton, styles.constructionCTA]}
                onPress={handleCreateAIConstruction}
                hitSlop={styles.hitSlop}
              >
                <Ionicons
                  name="construct"
                  size={ICON_SIZES.md}
                  color={COLORS.primary[500]}
                />
                <Text style={styles.constructionCTAText}>Build</Text>
              </TouchableOpacity>
            )}

            {/* Search Action */}
            {showSearch && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={handleSearchPress}
                hitSlop={styles.hitSlop}
              >
                <Ionicons
                  name="search"
                  size={ICON_SIZES.md}
                  color={navbarStyles.title.color}
                />
              </TouchableOpacity>
            )}

            {/* Notifications with Emergency Indicator */}
            {showNotifications && isAuthenticated && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={handleNotificationsPress}
                hitSlop={styles.hitSlop}
              >
                <Ionicons
                  name={emergencyNotifications.length > 0 ? "notifications" : "notifications-outline"}
                  size={ICON_SIZES.md}
                  color={emergencyNotifications.length > 0 ? COLORS.semantic.error[500] : navbarStyles.title.color}
                />
                {(unreadCount > 0 || emergencyNotifications.length > 0) && (
                  <View style={[
                    styles.notificationBadge,
                    emergencyNotifications.length > 0 && styles.emergencyBadge
                  ]}>
                    <Text style={styles.notificationCount}>
                      {emergencyNotifications.length > 0 ? '!' : (unreadCount > 99 ? '99+' : unreadCount)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Custom Actions */}
            {customAction && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={onCustomActionPress}
                hitSlop={styles.hitSlop}
              >
                <Ionicons
                  name={customActionIcon || 'add'}
                  size={ICON_SIZES.md}
                  color={navbarStyles.title.color}
                />
              </TouchableOpacity>
            )}

            {/* Profile Avatar */}
            {showProfile && (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={handleProfilePress}
                hitSlop={styles.hitSlop}
              >
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: COLORS.primary[500] }
                  ]}>
                    <Text style={styles.avatarText}>
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                
                {/* Online Status Indicator */}
                {user?.isOnline && (
                  <View style={styles.onlineIndicator} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Advanced Side Menu */}
      {isMenuOpen && (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={closeMenu}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <BlurView
          intensity={95}
          tint={isDark ? 'extraDark' : 'light'}
          style={styles.menuBlur}
        >
          {/* Enhanced Menu Header */}
          <View style={styles.menuHeader}>
            <View style={styles.menuHeaderContent}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.menuAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[
                  styles.menuAvatarPlaceholder,
                  { backgroundColor: COLORS.primary[500] }
                ]}>
                  <Text style={styles.menuAvatarText}>
                    {user?.firstName?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              
              <View style={styles.menuUserInfo}>
                <Text style={styles.menuUserName} numberOfLines={1}>
                  {isAuthenticated 
                    ? `${user?.firstName} ${user?.lastName}`
                    : 'Guest User'
                  }
                </Text>
                <Text style={styles.menuUserRole}>
                  {isAuthenticated 
                    ? `${user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}`
                    : 'Not logged in'
                  }
                </Text>
                
                {/* User Stats */}
                {isAuthenticated && (
                  <View style={styles.userStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{user?.completedProjects || 0}</Text>
                      <Text style={styles.statLabel}>Projects</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{user?.rating || '5.0'}</Text>
                      <Text style={styles.statLabel}>Rating</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={closeMenu}
              hitSlop={styles.hitSlop}
            >
              <Ionicons
                name="close"
                size={ICON_SIZES.lg}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Dynamic Menu Items */}
          <View style={styles.menuItems}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  item.isFeatured && styles.featuredMenuItem,
                  item.isPremium && styles.premiumMenuItem,
                  item.isDestructive && styles.destructiveMenuItem,
                ]}
                onPress={() => handleMenuItemPress(item)}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons
                    name={item.icon}
                    size={ICON_SIZES.md}
                    color={
                      item.isDestructive 
                        ? COLORS.semantic.error[500] 
                        : item.isPremium
                        ? COLORS.accent[500]
                        : item.isFeatured
                        ? COLORS.primary[500]
                        : theme.colors.text.primary
                    }
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      item.isDestructive && styles.destructiveMenuItemText,
                      item.isPremium && styles.premiumMenuItemText,
                      item.isFeatured && styles.featuredMenuItemText,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  
                  {/* Item Badge */}
                  {item.badge && (
                    <View style={styles.menuItemBadge}>
                      <Text style={styles.menuItemBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                
                <Ionicons
                  name="chevron-forward"
                  size={ICON_SIZES.sm}
                  color={theme.colors.text.tertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Enterprise Footer */}
          <View style={styles.menuFooter}>
            <Text style={styles.menuFooterText}>
              Yachi Enterprise v2.0 • Built for Ethiopia 🇪🇹
            </Text>
            <Text style={styles.menuFooterSubtext}>
              AI-Powered Construction & Services
            </Text>
          </View>
        </BlurView>
      </Animated.View>
    </>
  );
};

// Enterprise-grade Styles
const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 55 : StatusBar.currentHeight + 12,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    minWidth: 44,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
    minWidth: 44,
  },
  navButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    marginLeft: -SPACING.xs,
  },
  menuButton: {
    marginLeft: -SPACING.xs,
  },
  profileButton: {
    position: 'relative',
    padding: 2,
  },
  hitSlop: {
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    gap: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.accent[200],
    gap: 2,
  },
  premiumText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.accent[700],
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.semantic.success[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.semantic.success[200],
    gap: 2,
  },
  verifiedText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.semantic.success[700],
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  constructionCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  constructionCTAText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary[700],
    fontFamily: 'Inter-Bold',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.primary[200],
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary[200],
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.semantic.success[500],
    borderWidth: 2,
    borderColor: theme?.colors?.background?.elevated || '#FFFFFF',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.primary[500],
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme?.colors?.background?.elevated || '#FFFFFF',
  },
  emergencyBadge: {
    backgroundColor: COLORS.semantic.error[500],
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'Inter-Black',
    textAlign: 'center',
  },
  // Emergency Mode Styles
  emergencyContainer: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 55 : StatusBar.currentHeight + 12,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    zIndex: 1001,
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  emergencyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  // Side Menu Styles
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 999,
  },
  overlayTouchable: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: Math.min(SCREEN_WIDTH * 0.82, 320),
    zIndex: 1000,
  },
  menuBlur: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 55 : StatusBar.currentHeight + 12,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  menuAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: COLORS.primary[200],
  },
  menuAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary[200],
  },
  menuAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  menuUserInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  menuUserName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
    color: theme?.colors?.text?.primary,
  },
  menuUserRole: {
    fontSize: 14,
    color: theme?.colors?.text?.tertiary,
    fontFamily: 'Inter-Medium',
    marginBottom: SPACING.sm,
  },
  userStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: theme?.colors?.text?.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme?.colors?.text?.tertiary,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  menuCloseButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.md,
  },
  menuItems: {
    flex: 1,
    paddingVertical: SPACING.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xs,
  },
  featuredMenuItem: {
    backgroundColor: COLORS.primary[50],
    marginHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary[500],
  },
  premiumMenuItem: {
    backgroundColor: COLORS.accent[50],
    marginHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent[500],
  },
  destructiveMenuItem: {
    marginTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: SPACING.lg,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    flex: 1,
    color: theme?.colors?.text?.primary,
  },
  featuredMenuItemText: {
    color: COLORS.primary[700],
    fontWeight: '600',
  },
  premiumMenuItemText: {
    color: COLORS.accent[700],
    fontWeight: '600',
  },
  destructiveMenuItemText: {
    color: COLORS.semantic.error[500],
    fontWeight: '600',
  },
  menuItemBadge: {
    backgroundColor: COLORS.primary[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  menuItemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary[700],
    fontFamily: 'Inter-Bold',
  },
  menuFooter: {
    padding: SPACING.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuFooterText: {
    fontSize: 12,
    color: theme?.colors?.text?.tertiary,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  menuFooterSubtext: {
    fontSize: 11,
    color: theme?.colors?.text?.tertiary,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    opacity: 0.7,
  },
});

export default React.memo(Navbar);