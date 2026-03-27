import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useUser } from '../../../contexts/user-context';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { 
  ThemedView, 
  ThemedText 
} from '../../../components/themed-view';
import { 
  Button 
} from '../../../components/ui/button';
import { 
  Card 
} from '../../../components/ui/card';
import { 
  Loading 
} from '../../../components/ui/loading';
import { 
  LanguageSelector 
} from '../../../components/ui/language-selector';
import { 
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  userService 
} from '../../../services/user-service';
import { 
  notificationService 
} from '../../../services/notification-service';
import { 
  appConfig 
} from '../../../config/app';

/**
 * Enterprise-level Settings Screen
 * Features: Multi-language, theme, notifications, cache management, app configuration
 */
const SettingsScreen = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { refreshUser } = useUser();
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  const { 
    notificationSettings, 
    updateNotificationSettings,
    requestNotificationPermission 
  } = useNotifications();
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userSettings, setUserSettings] = useState({
    language: 'en',
    currency: 'ETB',
    distanceUnit: 'km',
    timeFormat: '12h',
    dateFormat: 'MM/DD/YYYY',
    vibration: true,
    hapticFeedback: true,
    reducedMotion: false,
    fontSize: 'medium',
    highContrast: false,
  });
  const [appSettings, setAppSettings] = useState({
    autoUpdate: true,
    backgroundSync: true,
    dataSaver: false,
    offlineMode: false,
    cacheEnabled: true,
    analyticsEnabled: true,
    crashReporting: true,
  });
  const [storageInfo, setStorageInfo] = useState({
    total: 0,
    used: 0,
    cache: 0,
    data: 0,
  });
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('Settings');
    }, [])
  );

  // Load settings data
  const loadSettingsData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Load user preferences
      const preferences = await userService.getUserPreferences(user?.id);
      setUserSettings(preferences.settings);
      setAppSettings(preferences.appSettings);
      
      // Load storage information
      const storage = await userService.getStorageInfo(user?.id);
      setStorageInfo(storage);
      
      analyticsService.trackEvent('settings_loaded', {
        userId: user?.id,
        language: preferences.settings.language,
        theme: isDark ? 'dark' : 'light',
        notificationEnabled: notificationSettings.enabled,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      showError('Failed to load settings');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, isDark, notificationSettings.enabled]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, [loadSettingsData])
  );

  // Update user setting
  const updateUserSetting = async (key, value) => {
    try {
      const previousValue = userSettings[key];
      setUserSettings(prev => ({ ...prev, [key]: value }));
      
      await userService.updateUserPreferences(user?.id, {
        settings: { ...userSettings, [key]: value }
      });
      
      analyticsService.trackEvent('user_setting_updated', {
        userId: user?.id,
        setting: key,
        value: value,
        previousValue: previousValue,
      });
      
      // Special handling for specific settings
      if (key === 'language') {
        // In a real app, this would update the app language immediately
        showSuccess('Language updated. App restart may be required.');
      }
    } catch (error) {
      console.error('Error updating user setting:', error);
      setUserSettings(prev => ({ ...prev, [key]: previousValue }));
      showError('Failed to update setting');
    }
  };

  // Update app setting
  const updateAppSetting = async (key, value) => {
    try {
      const previousValue = appSettings[key];
      setAppSettings(prev => ({ ...prev, [key]: value }));
      
      await userService.updateUserPreferences(user?.id, {
        appSettings: { ...appSettings, [key]: value }
      });
      
      analyticsService.trackEvent('app_setting_updated', {
        userId: user?.id,
        setting: key,
        value: value,
        previousValue: previousValue,
      });
      
      // Special handling for specific settings
      if (key === 'analyticsEnabled') {
        analyticsService.setEnabled(value);
        showSuccess(`Analytics ${value ? 'enabled' : 'disabled'}`);
      }
      
      if (key === 'offlineMode') {
        showSuccess(`Offline mode ${value ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error('Error updating app setting:', error);
      setAppSettings(prev => ({ ...prev, [key]: previousValue }));
      showError('Failed to update setting');
    }
  };

  // Update notification setting
  const updateNotificationSetting = async (key, value) => {
    try {
      await updateNotificationSettings({ [key]: value });
      
      analyticsService.trackEvent('notification_setting_updated', {
        userId: user?.id,
        setting: key,
        value: value,
      });
    } catch (error) {
      console.error('Error updating notification setting:', error);
      showError('Failed to update notification setting');
    }
  };

  // Clear app cache
  const handleClearCache = async () => {
    try {
      setIsLoading(true);
      
      await userService.clearAppCache(user?.id);
      
      // Reload storage info
      const storage = await userService.getStorageInfo(user?.id);
      setStorageInfo(storage);
      
      analyticsService.trackEvent('cache_cleared', {
        userId: user?.id,
        previousCacheSize: storageInfo.cache,
      });
      
      showSuccess('Cache cleared successfully');
      setShowCacheModal(false);
    } catch (error) {
      console.error('Error clearing cache:', error);
      showError('Failed to clear cache');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all settings
  const handleResetSettings = async () => {
    try {
      setIsLoading(true);
      
      const defaultSettings = appConfig.defaultSettings;
      await userService.resetUserPreferences(user?.id);
      
      setUserSettings(defaultSettings.userSettings);
      setAppSettings(defaultSettings.appSettings);
      
      analyticsService.trackEvent('settings_reset', { userId: user?.id });
      
      showSuccess('Settings reset to defaults');
      setShowResetModal(false);
    } catch (error) {
      console.error('Error resetting settings:', error);
      showError('Failed to reset settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Request notification permissions
  const handleNotificationPermission = async () => {
    try {
      const granted = await requestNotificationPermission();
      
      analyticsService.trackEvent('notification_permission_requested', {
        userId: user?.id,
        granted: granted,
      });
      
      if (granted) {
        showSuccess('Notification permissions granted');
      } else {
        showError('Notification permissions denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      showError('Failed to request notification permissions');
    }
  };

  // Open app store for rating
  const handleRateApp = async () => {
    try {
      // In a real app, this would open the respective app store
      // For demo, we'll use a placeholder URL
      await Linking.openURL('https://yachi.app/rate');
      
      analyticsService.trackEvent('app_rating_initiated', { userId: user?.id });
    } catch (error) {
      console.error('Error opening app store:', error);
      showError('Cannot open app store');
    }
  };

  // Share app
  const handleShareApp = async () => {
    try {
      // In a real app, this would open the share sheet
      // For demo, we'll use a placeholder
      await Linking.openURL('https://yachi.app/share');
      
      analyticsService.trackEvent('app_shared', { userId: user?.id });
      showSuccess('Share sheet opened');
    } catch (error) {
      console.error('Error sharing app:', error);
      showError('Failed to share app');
    }
  };

  // Check for updates
  const handleCheckUpdates = async () => {
    try {
      setIsLoading(true);
      
      const updateInfo = await userService.checkForUpdates();
      
      if (updateInfo.available) {
        Alert.alert(
          'Update Available',
          `Version ${updateInfo.version} is available. Would you like to update now?`,
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Update', 
              onPress: () => {
                // In a real app, this would start the update process
                analyticsService.trackEvent('app_update_started', { 
                  userId: user?.id,
                  version: updateInfo.version,
                });
                showSuccess('Update started...');
              }
            },
          ]
        );
      } else {
        showSuccess('You have the latest version');
      }
      
      analyticsService.trackEvent('update_check', {
        userId: user?.id,
        updateAvailable: updateInfo.available,
      });
    } catch (error) {
      console.error('Error checking for updates:', error);
      showError('Failed to check for updates');
    } finally {
      setIsLoading(false);
    }
  };

  // Render appearance section
  const renderAppearanceSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Appearance
      </ThemedText>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Dark Mode
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Use dark theme throughout the app
          </ThemedText>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            High Contrast
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Increase contrast for better visibility
          </ThemedText>
        </View>
        <Switch
          value={userSettings.highContrast}
          onValueChange={(value) => updateUserSetting('highContrast', value)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Font Size
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Adjust text size throughout the app
          </ThemedText>
        </View>
        <View style={styles.fontSizeOptions}>
          {['small', 'medium', 'large', 'x-large'].map((size) => (
            <Button
              key={size}
              variant={userSettings.fontSize === size ? 'primary' : 'outlined'}
              size="small"
              onPress={() => updateUserSetting('fontSize', size)}
              style={styles.fontSizeButton}
            >
              {size}
            </Button>
          ))}
        </View>
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Reduced Motion
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Minimize animations and transitions
          </ThemedText>
        </View>
        <Switch
          value={userSettings.reducedMotion}
          onValueChange={(value) => updateUserSetting('reducedMotion', value)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
    </Card>
  );

  // Render language section
  const renderLanguageSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Language & Region
      </ThemedText>
      
      <LanguageSelector
        value={userSettings.language}
        onChange={(language) => updateUserSetting('language', language)}
        style={styles.languageSelector}
      />
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Currency
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Display prices in your preferred currency
          </ThemedText>
        </View>
        <View style={styles.currencyOptions}>
          {['ETB', 'USD'].map((currency) => (
            <Button
              key={currency}
              variant={userSettings.currency === currency ? 'primary' : 'outlined'}
              size="small"
              onPress={() => updateUserSetting('currency', currency)}
              style={styles.currencyButton}
            >
              {currency}
            </Button>
          ))}
        </View>
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Date Format
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            How dates are displayed
          </ThemedText>
        </View>
        <View style={styles.dateFormatOptions}>
          {['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].map((format) => (
            <Button
              key={format}
              variant={userSettings.dateFormat === format ? 'primary' : 'outlined'}
              size="small"
              onPress={() => updateUserSetting('dateFormat', format)}
              style={styles.dateFormatButton}
            >
              {format}
            </Button>
          ))}
        </View>
      </View>
    </Card>
  );

  // Render notifications section
  const renderNotificationsSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Notifications
      </ThemedText>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Push Notifications
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Receive app notifications
          </ThemedText>
        </View>
        <Switch
          value={notificationSettings.enabled}
          onValueChange={(value) => updateNotificationSetting('enabled', value)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      {notificationSettings.enabled && (
        <>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingTitle}>
                Booking Updates
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                Notifications about your bookings
              </ThemedText>
            </View>
            <Switch
              value={notificationSettings.bookingUpdates}
              onValueChange={(value) => updateNotificationSetting('bookingUpdates', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingTitle}>
                Messages
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                Notifications for new messages
              </ThemedText>
            </View>
            <Switch
              value={notificationSettings.messages}
              onValueChange={(value) => updateNotificationSetting('messages', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingTitle}>
                Promotions
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                Special offers and discounts
              </ThemedText>
            </View>
            <Switch
              value={notificationSettings.promotions}
              onValueChange={(value) => updateNotificationSetting('promotions', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
        </>
      )}
      
      <Button
        variant="outlined"
        onPress={handleNotificationPermission}
        leftIcon="bell"
        style={styles.notificationButton}
      >
        Manage Notification Permissions
      </Button>
    </Card>
  );

  // Render storage section
  const renderStorageSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Storage
      </ThemedText>
      
      <View style={styles.storageInfo}>
        <View style={styles.storageRow}>
          <ThemedText style={styles.storageLabel}>Total Used:</ThemedText>
          <ThemedText style={styles.storageValue}>
            {(storageInfo.used / 1024 / 1024).toFixed(2)} MB
          </ThemedText>
        </View>
        
        <View style={styles.storageRow}>
          <ThemedText style={styles.storageLabel}>Cache:</ThemedText>
          <ThemedText style={styles.storageValue}>
            {(storageInfo.cache / 1024 / 1024).toFixed(2)} MB
          </ThemedText>
        </View>
        
        <View style={styles.storageRow}>
          <ThemedText style={styles.storageLabel}>User Data:</ThemedText>
          <ThemedText style={styles.storageValue}>
            {(storageInfo.data / 1024 / 1024).toFixed(2)} MB
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.storageActions}>
        <Button
          variant="outlined"
          onPress={() => setShowCacheModal(true)}
          leftIcon="trash"
          style={styles.storageButton}
        >
          Clear Cache
        </Button>
        
        <Button
          variant="outlined"
          onPress={() => {/* Export data functionality */}}
          leftIcon="download"
          style={styles.storageButton}
        >
          Export Data
        </Button>
      </View>
    </Card>
  );

  // Render app info section
  const renderAppInfoSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        About Yachi
      </ThemedText>
      
      <View style={styles.appInfo}>
        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Version:</ThemedText>
          <ThemedText style={styles.infoValue}>{appConfig.version}</ThemedText>
        </View>
        
        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Build:</ThemedText>
          <ThemedText style={styles.infoValue}>{appConfig.buildNumber}</ThemedText>
        </View>
        
        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Last Updated:</ThemedText>
          <ThemedText style={styles.infoValue}>
            {new Date(appConfig.buildDate).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.appActions}>
        <Button
          variant="ghost"
          onPress={handleRateApp}
          leftIcon="star"
          style={styles.appButton}
        >
          Rate Yachi
        </Button>
        
        <Button
          variant="ghost"
          onPress={handleShareApp}
          leftIcon="share"
          style={styles.appButton}
        >
          Share App
        </Button>
        
        <Button
          variant="ghost"
          onPress={handleCheckUpdates}
          leftIcon="update"
          style={styles.appButton}
        >
          Check for Updates
        </Button>
        
        <Button
          variant="ghost"
          onPress={() => router.push('/profile/help-support')}
          leftIcon="help"
          style={styles.appButton}
        >
          Help & Support
        </Button>
      </View>
    </Card>
  );

  // Render advanced section
  const renderAdvancedSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Advanced
      </ThemedText>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Background Sync
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Sync data automatically in background
          </ThemedText>
        </View>
        <Switch
          value={appSettings.backgroundSync}
          onValueChange={(value) => updateAppSetting('backgroundSync', value)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Data Saver
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Reduce data usage
          </ThemedText>
        </View>
        <Switch
          value={appSettings.dataSaver}
          onValueChange={(value) => updateAppSetting('dataSaver', value)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Analytics
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Help improve Yachi with usage data
          </ThemedText>
        </View>
        <Switch
          value={appSettings.analyticsEnabled}
          onValueChange={(value) => updateAppSetting('analyticsEnabled', value)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Crash Reporting
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Send crash reports automatically
          </ThemedText>
        </View>
        <Switch
          value={appSettings.crashReporting}
          onValueChange={(value) => updateAppSetting('crashReporting', value)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <Button
        variant="outlined"
        onPress={() => setShowResetModal(true)}
        leftIcon="reset"
        style={styles.resetButton}
      >
        Reset All Settings
      </Button>
    </Card>
  );

  if (isLoading && !userSettings) {
    return <Loading message="Loading settings..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadSettingsData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        {renderAppearanceSection()}

        {/* Language & Region Section */}
        {renderLanguageSection()}

        {/* Notifications Section */}
        {renderNotificationsSection()}

        {/* Storage Section */}
        {renderStorageSection()}

        {/* Advanced Section */}
        {renderAdvancedSection()}

        {/* App Info Section */}
        {renderAppInfoSection()}
      </ScrollView>

      {/* Clear Cache Confirmation Modal */}
      <ConfirmationModal
        visible={showCacheModal}
        title="Clear Cache"
        message="This will remove temporary files and free up storage. Your personal data will not be affected."
        confirmText="Clear Cache"
        cancelText="Cancel"
        onConfirm={handleClearCache}
        onCancel={() => setShowCacheModal(false)}
        type="warning"
      />

      {/* Reset Settings Confirmation Modal */}
      <ConfirmationModal
        visible={showResetModal}
        title="Reset All Settings"
        message="This will reset all your settings to their default values. This action cannot be undone."
        confirmText="Reset Settings"
        cancelText="Cancel"
        onConfirm={handleResetSettings}
        onCancel={() => setShowResetModal(false)}
        type="danger"
      />
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  languageSelector: {
    marginBottom: 16,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeButton: {
    paddingHorizontal: 12,
  },
  currencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    paddingHorizontal: 12,
  },
  dateFormatOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  dateFormatButton: {
    paddingHorizontal: 8,
  },
  notificationButton: {
    marginTop: 8,
  },
  storageInfo: {
    marginBottom: 16,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storageLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  storageValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  storageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  storageButton: {
    flex: 1,
  },
  appInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  appActions: {
    gap: 8,
  },
  appButton: {
    justifyContent: 'flex-start',
  },
  resetButton: {
    marginTop: 8,
  },
};

export default SettingsScreen;