import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLoading } from '../../contexts/loading-context';
import { 
  Button, 
  ButtonVariant,
  PrimaryButton,
  OutlineButton,
  IconButton 
} from '../../components/ui/button';
import Input from '../../components/ui/input';
import Loading from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Collapsible } from '../../components/collapsible';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { userService } from '../../services/user-service';
import { storage } from '../../utils/storage';

// Profile sections
const PROFILE_SECTIONS = {
  PERSONAL: 'personal',
  PREFERENCES: 'preferences',
  SECURITY: 'security',
  NOTIFICATIONS: 'notifications',
  SUPPORT: 'support',
  ABOUT: 'about',
};

// Mock user data - replace with actual user context
const MOCK_USER = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
  role: 'client',
  joinDate: '2023-06-15T00:00:00Z',
  verified: true,
  stats: {
    totalBookings: 12,
    completedBookings: 8,
    cancelledBookings: 1,
    totalSpent: 1245,
    favoriteCategory: 'Cleaning',
  },
  preferences: {
    notifications: {
      bookingUpdates: true,
      messages: true,
      promotions: false,
      securityAlerts: true,
    },
    privacy: {
      showProfile: true,
      allowMessages: true,
      shareActivity: false,
    },
    language: 'en',
    currency: 'USD',
    timezone: 'America/New_York',
  },
};

// Menu items
const MENU_ITEMS = [
  {
    id: 'edit-profile',
    title: 'Edit Profile',
    icon: '👤',
    description: 'Update your personal information',
    section: PROFILE_SECTIONS.PERSONAL,
    badge: null,
  },
  {
    id: 'bookings',
    title: 'My Bookings',
    icon: '📅',
    description: 'View and manage your appointments',
    section: PROFILE_SECTIONS.PERSONAL,
    badge: null,
  },
  {
    id: 'payment-methods',
    title: 'Payment Methods',
    icon: '💳',
    description: 'Manage your payment options',
    section: PROFILE_SECTIONS.PERSONAL,
    badge: null,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: '🔔',
    description: 'Customize your notification preferences',
    section: PROFILE_SECTIONS.NOTIFICATIONS,
    badge: 3,
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    icon: '🔒',
    description: 'Manage your privacy settings',
    section: PROFILE_SECTIONS.SECURITY,
    badge: null,
  },
  {
    id: 'preferences',
    title: 'Preferences',
    icon: '⚙️',
    description: 'Appearance and language settings',
    section: PROFILE_SECTIONS.PREFERENCES,
    badge: null,
  },
  {
    id: 'help',
    title: 'Help & Support',
    icon: '❓',
    description: 'Get help and contact support',
    section: PROFILE_SECTIONS.SUPPORT,
    badge: null,
  },
  {
    id: 'about',
    title: 'About Yachi',
    icon: 'ℹ️',
    description: 'App version and information',
    section: PROFILE_SECTIONS.ABOUT,
    badge: null,
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout, updateUserProfile } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(MOCK_USER);
  const [activeSection, setActiveSection] = useState(null);
  const [notifications, setNotifications] = useState(MOCK_USER.preferences.notifications);
  const [privacy, setPrivacy] = useState(MOCK_USER.preferences.privacy);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: MOCK_USER.firstName,
    lastName: MOCK_USER.lastName,
    email: MOCK_USER.email,
    phone: MOCK_USER.phone,
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
      startAnimations();
      
      // Track screen view
      analyticsService.trackScreenView('profile', {
        user_id: user?.id,
        user_role: user?.role,
      });

      return () => {
        // Cleanup if needed
      };
    }, [user])
  );

  // Initial animations
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Load profile data
  const loadProfileData = async () => {
    try {
      const profileData = await userService.getProfile(user.id);
      setProfile(profileData);
      setNotifications(profileData.preferences.notifications);
      setPrivacy(profileData.preferences.privacy);
    } catch (error) {
      console.error('Error loading profile:', error);
      errorService.captureError(error, { context: 'ProfileScreen' });
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfileData();
      analyticsService.trackEvent('profile_refresh');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Navigation handlers
  const handleMenuPress = (menuItem) => {
    analyticsService.trackEvent('profile_menu_click', { menu_item: menuItem.id });
    
    switch (menuItem.id) {
      case 'edit-profile':
        setIsEditing(true);
        break;
      case 'bookings':
        router.push('/(tabs)/bookings');
        break;
      case 'payment-methods':
        router.push('/(profile)/payment-methods');
        break;
      case 'notifications':
        setActiveSection(PROFILE_SECTIONS.NOTIFICATIONS);
        break;
      case 'privacy':
        setActiveSection(PROFILE_SECTIONS.SECURITY);
        break;
      case 'preferences':
        setActiveSection(PROFILE_SECTIONS.PREFERENCES);
        break;
      case 'help':
        router.push('/(profile)/help');
        break;
      case 'about':
        router.push('/(profile)/about');
        break;
      default:
        console.warn('Unknown menu item:', menuItem.id);
    }
  };

  const handleSaveProfile = async () => {
    try {
      showLoading('Updating profile...');

      const result = await updateUserProfile(editForm);
      
      if (result.success) {
        setProfile(prev => ({ ...prev, ...editForm }));
        setIsEditing(false);
        
        Alert.alert('Success', 'Profile updated successfully!');
        
        analyticsService.trackEvent('profile_update_success', {
          fields_updated: Object.keys(editForm),
        });
      } else {
        Alert.alert('Update Failed', result.error || 'Unable to update profile.');
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      errorService.captureError(error, { context: 'ProfileUpdate' });
      Alert.alert('Update Failed', 'An unexpected error occurred.');
    } finally {
      hideLoading();
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
    });
    setIsEditing(false);
  };

  const handleNotificationToggle = async (key, value) => {
    const updatedNotifications = { ...notifications, [key]: value };
    setNotifications(updatedNotifications);

    try {
      await userService.updatePreferences({
        notifications: updatedNotifications,
      });

      analyticsService.trackEvent('notification_preference_change', {
        setting: key,
        value: value,
      });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      // Revert on error
      setNotifications(notifications);
    }
  };

  const handlePrivacyToggle = async (key, value) => {
    const updatedPrivacy = { ...privacy, [key]: value };
    setPrivacy(updatedPrivacy);

    try {
      await userService.updatePreferences({
        privacy: updatedPrivacy,
      });

      analyticsService.trackEvent('privacy_setting_change', {
        setting: key,
        value: value,
      });
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      // Revert on error
      setPrivacy(privacy);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
    analyticsService.trackEvent('theme_toggle', {
      new_theme: isDark ? 'light' : 'dark',
    });
  };

  const handleVerification = () => {
    analyticsService.trackEvent('verification_start');
    router.push('/(profile)/verification');
  };

  const handleBecomeProvider = () => {
    analyticsService.trackEvent('become_provider_click');
    router.push('/(onboarding)/provider-application');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            analyticsService.trackEvent('user_logout', { source: 'profile_screen' });
            await logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            analyticsService.trackEvent('delete_account_attempt');
            router.push('/(profile)/delete-account');
          },
        },
      ]
    );
  };

  // Render header with user info
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: profile.avatar }}
            style={styles.avatar}
          />
          <TouchableOpacity 
            style={[styles.avatarEdit, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/(profile)/edit-avatar')}
          >
            <ThemedText style={styles.avatarEditIcon}>📷</ThemedText>
          </TouchableOpacity>
        </View>
        
        <View style={styles.userInfo}>
          <ThemedText type="title" style={styles.userName}>
            {profile.firstName} {profile.lastName}
          </ThemedText>
          <ThemedText type="default" style={styles.userEmail}>
            {profile.email}
          </ThemedText>
          <View style={styles.verificationBadge}>
            {profile.verified ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.success }]}>
                <ThemedText type="caption" style={styles.badgeText}>
                  ✅ Verified
                </ThemedText>
              </View>
            ) : (
              <OutlineButton
                title="Verify Account"
                onPress={handleVerification}
                size="xsmall"
                style={styles.verifyButton}
              />
            )}
          </View>
        </View>
      </View>

      {/* User Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statNumber}>
            {profile.stats.totalBookings}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            Total Bookings
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statNumber}>
            {profile.stats.completedBookings}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            Completed
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statNumber}>
            ${profile.stats.totalSpent}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            Total Spent
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  // Render edit profile form
  const renderEditForm = () => (
    <Animated.View style={[styles.editForm, { opacity: fadeAnim }]}>
      <ThemedText type="title" style={styles.sectionTitle}>
        Edit Profile
      </ThemedText>
      
      <View style={styles.formRow}>
        <Input
          label="First Name"
          value={editForm.firstName}
          onChangeText={(value) => setEditForm(prev => ({ ...prev, firstName: value }))}
          style={styles.halfInput}
        />
        <Input
          label="Last Name"
          value={editForm.lastName}
          onChangeText={(value) => setEditForm(prev => ({ ...prev, lastName: value }))}
          style={styles.halfInput}
        />
      </View>
      
      <Input
        label="Email Address"
        value={editForm.email}
        onChangeText={(value) => setEditForm(prev => ({ ...prev, email: value }))}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <Input
        label="Phone Number"
        value={editForm.phone}
        onChangeText={(value) => setEditForm(prev => ({ ...prev, phone: value }))}
        keyboardType="phone-pad"
      />
      
      <View style={styles.formActions}>
        <OutlineButton
          title="Cancel"
          onPress={handleCancelEdit}
          style={styles.formButton}
        />
        <PrimaryButton
          title="Save Changes"
          onPress={handleSaveProfile}
          style={styles.formButton}
        />
      </View>
    </Animated.View>
  );

  // Render menu items
  const renderMenu = () => (
    <Animated.View 
      style={[
        styles.menuContainer,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {MENU_ITEMS.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={styles.menuItem}
          onPress={() => handleMenuPress(item)}
        >
          <View style={styles.menuIcon}>
            <ThemedText style={[styles.menuIconText, { fontSize: 20 }]}>
              {item.icon}
            </ThemedText>
          </View>
          
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <ThemedText type="default" style={styles.menuTitle}>
                {item.title}
              </ThemedText>
              {item.badge && (
                <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                  <ThemedText type="caption" style={styles.badgeText}>
                    {item.badge}
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText type="caption" style={styles.menuDescription}>
              {item.description}
            </ThemedText>
          </View>
          
          <ThemedText style={styles.menuArrow}>›</ThemedText>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );

  // Render settings sections
  const renderSettingsSection = () => {
    if (!activeSection) return null;

    return (
      <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
        <View style={styles.sectionHeader}>
          <IconButton
            icon="←"
            onPress={() => setActiveSection(null)}
            accessibilityLabel="Back to menu"
          />
          <ThemedText type="title" style={styles.sectionTitle}>
            {activeSection === PROFILE_SECTIONS.NOTIFICATIONS && 'Notifications'}
            {activeSection === PROFILE_SECTIONS.SECURITY && 'Privacy & Security'}
            {activeSection === PROFILE_SECTIONS.PREFERENCES && 'Preferences'}
          </ThemedText>
        </View>

        {activeSection === PROFILE_SECTIONS.NOTIFICATIONS && (
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText type="default" style={styles.settingTitle}>
                  Booking Updates
                </ThemedText>
                <ThemedText type="caption" style={styles.settingDescription}>
                  Notifications about your bookings and appointments
                </ThemedText>
              </View>
              <Switch
                value={notifications.bookingUpdates}
                onValueChange={(value) => handleNotificationToggle('bookingUpdates', value)}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText type="default" style={styles.settingTitle}>
                  Messages
                </ThemedText>
                <ThemedText type="caption" style={styles.settingDescription}>
                  Notifications for new messages from providers
                </ThemedText>
              </View>
              <Switch
                value={notifications.messages}
                onValueChange={(value) => handleNotificationToggle('messages', value)}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText type="default" style={styles.settingTitle}>
                  Promotions & Offers
                </ThemedText>
                <ThemedText type="caption" style={styles.settingDescription}>
                  Special offers and promotional notifications
                </ThemedText>
              </View>
              <Switch
                value={notifications.promotions}
                onValueChange={(value) => handleNotificationToggle('promotions', value)}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText type="default" style={styles.settingTitle}>
                  Security Alerts
                </ThemedText>
                <ThemedText type="caption" style={styles.settingDescription}>
                  Important security and account notifications
                </ThemedText>
              </View>
              <Switch
                value={notifications.securityAlerts}
                onValueChange={(value) => handleNotificationToggle('securityAlerts', value)}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
          </View>
        )}

        {activeSection === PROFILE_SECTIONS.SECURITY && (
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText type="default" style={styles.settingTitle}>
                  Show Profile
                </ThemedText>
                <ThemedText type="caption" style={styles.settingDescription}>
                  Allow providers to see your profile information
                </ThemedText>
              </View>
              <Switch
                value={privacy.showProfile}
                onValueChange={(value) => handlePrivacyToggle('showProfile', value)}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText type="default" style={styles.settingTitle}>
                  Allow Messages
                </ThemedText>
                <ThemedText type="caption" style={styles.settingDescription}>
                  Allow providers to send you messages
                </ThemedText>
              </View>
              <Switch
                value={privacy.allowMessages}
                onValueChange={(value) => handlePrivacyToggle('allowMessages', value)}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText type="default" style={styles.settingTitle}>
                  Share Activity
                </ThemedText>
                <ThemedText type="caption" style={styles.settingDescription}>
                  Share your booking activity for recommendations
                </ThemedText>
              </View>
              <Switch
                value={privacy.shareActivity}
                onValueChange={(value) => handlePrivacyToggle('shareActivity', value)}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
          </View>
        )}

        {activeSection === PROFILE_SECTIONS.PREFERENCES && (
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText type="default" style={styles.settingTitle}>
                  Dark Mode
                </ThemedText>
                <ThemedText type="caption" style={styles.settingDescription}>
                  Switch between light and dark theme
                </ThemedText>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleThemeToggle}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render footer actions
  const renderFooter = () => (
    <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
      {profile.role === 'client' && (
        <OutlineButton
          title="Become a Service Provider"
          onPress={handleBecomeProvider}
          fullWidth
          style={styles.footerButton}
        />
      )}
      
      <View style={styles.dangerZone}>
        <ThemedText type="subtitle" style={styles.dangerZoneTitle}>
          Account Actions
        </ThemedText>
        <OutlineButton
          title="Sign Out"
          onPress={handleLogout}
          variant={ButtonVariant.GHOST}
          fullWidth
          style={styles.dangerButton}
        />
        <Button
          title="Delete Account"
          onPress={handleDeleteAccount}
          variant={ButtonVariant.DANGER}
          fullWidth
          style={styles.dangerButton}
        />
      </View>
    </Animated.View>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Profile',
          headerShown: true,
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        {renderHeader()}

        {/* Edit Form or Menu */}
        {isEditing ? renderEditForm() : !activeSection && renderMenu()}

        {/* Settings Sections */}
        {renderSettingsSection()}

        {/* Footer Actions */}
        {!activeSection && !isEditing && renderFooter()}

        {/* Footer Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditIcon: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    opacity: 0.7,
    marginBottom: 8,
  },
  verificationBadge: {
    alignSelf: 'flex-start',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 10,
  },
  verifyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    opacity: 0.7,
    fontWeight: '500',
  },
  editForm: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  formButton: {
    flex: 1,
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconText: {
    opacity: 0.8,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuTitle: {
    fontWeight: '600',
    marginRight: 8,
  },
  menuDescription: {
    opacity: 0.7,
  },
  menuArrow: {
    fontSize: 18,
    opacity: 0.5,
    marginLeft: 8,
  },
  settingsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    opacity: 0.7,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  footerButton: {
    marginBottom: 24,
  },
  dangerZone: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.2)',
    paddingTop: 24,
  },
  dangerZoneTitle: {
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  dangerButton: {
    marginBottom: 12,
  },
  bottomSpacing: {
    height: 20,
  },
};