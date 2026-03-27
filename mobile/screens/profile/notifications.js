import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { TabView } from '../../components/ui/tabview';
import { Avatar } from '../../components/ui/avatar';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useNotifications } from '../../hooks/use-notifications';
import { notificationService } from '../../services/notification-service';
import { userService } from '../../services/user-service';
import { analyticsService } from '../../services/analytics-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { notificationConstants } from '../../constants/notification';

/**
 * Notifications Management Screen
 * 
 * Comprehensive notification management system with preferences,
 * history, smart delivery settings, and notification analytics
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const NotificationsScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user } = useAuth();
  const { 
    hasPermission, 
    requestPermission, 
    getNotificationSettings,
    updateNotificationSettings 
  } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('preferences');
  const [notifications, setNotifications] = useState([]);
  const [notificationStats, setNotificationStats] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [systemSettings, setSystemSettings] = useState({});
  const [quietHours, setQuietHours] = useState({});
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showQuietHoursModal, setShowQuietHoursModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Notification categories configuration
  const notificationCategories = {
    bookings: {
      title: 'Bookings & Appointments',
      description: 'Notifications about your service bookings',
      icon: 'calendar',
      enabled: true,
      channels: ['push', 'email', 'sms'],
    },
    messages: {
      title: 'Messages & Chat',
      description: 'Notifications for new messages and conversations',
      icon: 'message-circle',
      enabled: true,
      channels: ['push', 'email'],
    },
    payments: {
      title: 'Payments & Transactions',
      description: 'Payment confirmations and transaction updates',
      icon: 'credit-card',
      enabled: true,
      channels: ['push', 'email'],
    },
    promotions: {
      title: 'Promotions & Offers',
      description: 'Special offers, discounts, and promotions',
      icon: 'tag',
      enabled: true,
      channels: ['push', 'email'],
    },
    system: {
      title: 'System & Updates',
      description: 'Platform updates and important announcements',
      icon: 'bell',
      enabled: true,
      channels: ['push', 'email'],
    },
    security: {
      title: 'Security & Alerts',
      description: 'Security alerts and account activity',
      icon: 'shield',
      enabled: true,
      channels: ['push', 'email', 'sms'],
    },
    reviews: {
      title: 'Reviews & Ratings',
      description: 'New reviews and rating notifications',
      icon: 'star',
      enabled: true,
      channels: ['push', 'email'],
    },
    reminders: {
      title: 'Reminders & Follow-ups',
      description: 'Service reminders and follow-up notifications',
      icon: 'clock',
      enabled: true,
      channels: ['push', 'email', 'sms'],
    },
  };

  /**
   * Fetch notification data and preferences
   */
  const fetchNotificationData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [notificationHistory, userPreferences, stats, systemConfig] = await Promise.all([
        notificationService.getUserNotifications(user.id, { limit: 50 }),
        userService.getNotificationPreferences(user.id),
        notificationService.getNotificationStats(user.id),
        getNotificationSettings(),
      ]);

      setNotifications(notificationHistory || []);
      setPreferences(userPreferences || {});
      setNotificationStats(stats);
      setSystemSettings(systemConfig);

      // Initialize quiet hours if not set
      if (!userPreferences?.quietHours) {
        setQuietHours({
          enabled: false,
          startTime: '22:00',
          endTime: '07:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        });
      } else {
        setQuietHours(userPreferences.quietHours);
      }

      // Track notifications page view
      analyticsService.trackScreenView('notifications', user.id);
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
      Alert.alert('Error', 'Unable to load notification settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id, getNotificationSettings]);

  /**
   * Refresh data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotificationData();
  }, [fetchNotificationData]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchNotificationData();
  }, [fetchNotificationData]);

  /**
   * Check and request notification permissions
   */
  const handlePermissionCheck = async () => {
    try {
      const permissionGranted = await hasPermission();
      
      if (!permissionGranted) {
        const requested = await requestPermission();
        
        if (requested) {
          Alert.alert('Success', 'Notification permissions granted.');
          await fetchNotificationData();
        } else {
          Alert.alert(
            'Permission Required',
            'Notifications are disabled. Please enable them in your device settings to receive important updates.',
            [
              { text: 'Open Settings', onPress: () => updateNotificationSettings() },
              { text: 'Cancel' },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('Error', 'Unable to check notification permissions.');
    }
  };

  /**
   * Update notification preferences
   */
  const handlePreferenceUpdate = async (category, setting, value) => {
    try {
      const updatedPreferences = {
        ...preferences,
        [category]: {
          ...preferences[category],
          [setting]: value,
        },
      };

      setPreferences(updatedPreferences);

      const result = await userService.updateNotificationPreferences(user.id, updatedPreferences);

      if (result.success) {
        // Track preference change
        analyticsService.trackNotificationPreferenceUpdate(category, setting, value, user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Preference update failed:', error);
      Alert.alert('Update Failed', 'Unable to update notification preferences.');
      // Revert on error
      setPreferences(preferences);
    }
  };

  /**
   * Save all preferences
   */
  const handleSaveAllPreferences = async () => {
    try {
      setSaving(true);

      const result = await userService.updateNotificationPreferences(user.id, {
        ...preferences,
        quietHours,
      });

      if (result.success) {
        Alert.alert('Success', 'Notification preferences saved successfully.');
        
        // Track bulk preference save
        analyticsService.trackNotificationPreferencesSaved(user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Preferences save failed:', error);
      Alert.alert('Save Failed', 'Unable to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await notificationService.markAsRead(user.id, notificationId);

      if (result.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Mark as read failed:', error);
      Alert.alert('Error', 'Unable to mark notification as read.');
    }
  };

  /**
   * Mark all as read
   */
  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationService.markAllAsRead(user.id);

      if (result.success) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
        Alert.alert('Success', 'All notifications marked as read.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Mark all as read failed:', error);
      Alert.alert('Error', 'Unable to mark all notifications as read.');
    }
  };

  /**
   * Delete notification
   */
  const handleDeleteNotification = async (notificationId) => {
    try {
      const result = await notificationService.deleteNotification(user.id, notificationId);

      if (result.success) {
        setNotifications(prev => 
          prev.filter(notification => notification.id !== notificationId)
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Delete notification failed:', error);
      Alert.alert('Error', 'Unable to delete notification.');
    }
  };

  /**
   * Clear all notifications
   */
  const handleClearAll = async () => {
    try {
      const result = await notificationService.clearAllNotifications(user.id);

      if (result.success) {
        setNotifications([]);
        Alert.alert('Success', 'All notifications cleared.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Clear all failed:', error);
      Alert.alert('Error', 'Unable to clear all notifications.');
    }
  };

  /**
   * Test notification
   */
  const handleTestNotification = async (category) => {
    try {
      const result = await notificationService.sendTestNotification(user.id, category);

      if (result.success) {
        Alert.alert('Test Sent', 'A test notification has been sent to your device.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      Alert.alert('Error', 'Unable to send test notification.');
    }
  };

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = (type) => {
    const iconMap = {
      booking: 'calendar',
      message: 'message-circle',
      payment: 'credit-card',
      promotion: 'tag',
      system: 'bell',
      security: 'shield',
      review: 'star',
      reminder: 'clock',
    };
    
    return iconMap[type] || 'bell';
  };

  /**
   * Get notification color based on type
   */
  const getNotificationColor = (type) => {
    const colorMap = {
      booking: colors.primary,
      message: colors.info,
      payment: colors.success,
      promotion: colors.warning,
      system: colors.default,
      security: colors.error,
      review: colors.warning,
      reminder: colors.info,
    };
    
    return colorMap[type] || colors.default;
  };

  /**
   * Filter notifications by search query
   */
  const getFilteredNotifications = () => {
    if (!searchQuery) return notifications;

    return notifications.filter(notification =>
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  /**
   * Render preferences tab
   */
  const renderPreferencesTab = () => (
    <View style={styles.tabContent}>
      {/* System Permissions */}
      <Card style={styles.permissionsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          System Permissions
        </ThemedText>
        
        <View style={styles.permissionItem}>
          <View style={styles.permissionInfo}>
            <ThemedText type="defaultSemiBold">Push Notifications</ThemedText>
            <ThemedText type="default" style={styles.permissionDescription}>
              Receive push notifications on your device
            </ThemedText>
          </View>
          <Switch
            value={systemSettings.pushEnabled}
            onValueChange={handlePermissionCheck}
            trackColor={{ false: '#767577', true: colors.primary }}
          />
        </View>

        <View style={styles.permissionItem}>
          <View style={styles.permissionInfo}>
            <ThemedText type="defaultSemiBold">Email Notifications</ThemedText>
            <ThemedText type="default" style={styles.permissionDescription}>
              Receive notifications via email
            </ThemedText>
          </View>
          <Switch
            value={preferences.emailEnabled !== false}
            onValueChange={(value) => handlePreferenceUpdate('global', 'emailEnabled', value)}
          />
        </View>

        <View style={styles.permissionItem}>
          <View style={styles.permissionInfo}>
            <ThemedText type="defaultSemiBold">SMS Notifications</ThemedText>
            <ThemedText type="default" style={styles.permissionDescription}>
              Receive important alerts via SMS
            </ThemedText>
          </View>
          <Switch
            value={preferences.smsEnabled === true}
            onValueChange={(value) => handlePreferenceUpdate('global', 'smsEnabled', value)}
          />
        </View>
      </Card>

      {/* Notification Categories */}
      <Card style={styles.categoriesCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Notification Categories
        </ThemedText>
        <ThemedText type="default" style={styles.sectionDescription}>
          Choose which types of notifications you want to receive
        </ThemedText>

        <View style={styles.categoriesList}>
          {Object.entries(notificationCategories).map(([key, category]) => (
            <View key={key} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryIcon}>
                  {/* Icon would be rendered here */}
                </View>
                <View style={styles.categoryDetails}>
                  <ThemedText type="defaultSemiBold" style={styles.categoryTitle}>
                    {category.title}
                  </ThemedText>
                  <ThemedText type="default" style={styles.categoryDescription}>
                    {category.description}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.categoryControls}>
                <Switch
                  value={preferences[key]?.enabled !== false}
                  onValueChange={(value) => handlePreferenceUpdate(key, 'enabled', value)}
                />
                <Button
                  title="Test"
                  onPress={() => handleTestNotification(key)}
                  variant="outline"
                  size="small"
                  style={styles.testButton}
                />
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Quiet Hours */}
      <Card style={styles.quietHoursCard}>
        <View style={styles.quietHoursHeader}>
          <View style={styles.quietHoursInfo}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Quiet Hours
            </ThemedText>
            <ThemedText type="default" style={styles.sectionDescription}>
              Do not disturb during specified hours
            </ThemedText>
          </View>
          <Switch
            value={quietHours.enabled}
            onValueChange={(value) => setQuietHours(prev => ({ ...prev, enabled: value }))}
          />
        </View>

        {quietHours.enabled && (
          <View style={styles.quietHoursContent}>
            <ThemedText type="default" style={styles.quietHoursText}>
              From {quietHours.startTime} to {quietHours.endTime}
            </ThemedText>
            <Button
              title="Configure Quiet Hours"
              onPress={() => setShowQuietHoursModal(true)}
              variant="outline"
              size="small"
              style={styles.configureButton}
            />
          </View>
        )}
      </Card>

      {/* Save Button */}
      <Button
        title="Save All Preferences"
        onPress={handleSaveAllPreferences}
        variant="primary"
        size="large"
        loading={saving}
        disabled={saving}
        icon="save"
        style={styles.saveButton}
      />
    </View>
  );

  /**
   * Render history tab
   */
  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {/* Notifications Header */}
      <Card style={styles.historyHeaderCard}>
        <View style={styles.historyHeader}>
          <View style={styles.historyInfo}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Notification History
            </ThemedText>
            <ThemedText type="default" style={styles.notificationsCount}>
              {notifications.length} notifications
            </ThemedText>
          </View>
          <View style={styles.historyActions}>
            <Button
              title="Mark All Read"
              onPress={handleMarkAllAsRead}
              variant="outline"
              size="small"
              icon="check"
            />
            <Button
              title="Clear All"
              onPress={handleClearAll}
              variant="outline"
              size="small"
              icon="trash"
            />
          </View>
        </View>
      </Card>

      {/* Search */}
      <Card style={styles.searchCard}>
        <Input
          placeholder="Search notifications..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon="search"
          clearButtonMode="while-editing"
        />
      </Card>

      {/* Notifications List */}
      <View style={styles.notificationsList}>
        {getFilteredNotifications().length > 0 ? (
          getFilteredNotifications().map(notification => (
            <Card 
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.unreadNotification,
              ]}
              onPress={() => {
                setSelectedNotification(notification);
                setShowNotificationModal(true);
                if (!notification.read) {
                  handleMarkAsRead(notification.id);
                }
              }}
            >
              <View style={styles.notificationHeader}>
                <View style={styles.notificationIcon}>
                  <Badge
                    icon={getNotificationIcon(notification.type)}
                    color={getNotificationColor(notification.type)}
                    size="small"
                  />
                </View>
                
                <View style={styles.notificationContent}>
                  <ThemedText type="defaultSemiBold" style={styles.notificationTitle}>
                    {notification.title}
                  </ThemedText>
                  <ThemedText type="default" style={styles.notificationBody}>
                    {notification.body}
                  </ThemedText>
                </View>
                
                <View style={styles.notificationMeta}>
                  <ThemedText type="default" style={styles.notificationTime}>
                    {formatters.formatRelativeTime(notification.timestamp)}
                  </ThemedText>
                  {!notification.read && (
                    <View style={styles.unreadIndicator} />
                  )}
                </View>
              </View>

              <View style={styles.notificationActions}>
                <Button
                  title="Delete"
                  onPress={() => handleDeleteNotification(notification.id)}
                  variant="text"
                  size="small"
                  icon="trash"
                  style={styles.deleteButton}
                />
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyNotifications}>
            <ThemedText type="title" style={styles.emptyTitle}>
              No Notifications
            </ThemedText>
            <ThemedText type="default" style={styles.emptyText}>
              {searchQuery ? 
                'No notifications match your search' :
                'You have no notifications at this time'
              }
            </ThemedText>
          </Card>
        )}
      </View>
    </View>
  );

  /**
   * Render analytics tab
   */
  const renderAnalyticsTab = () => (
    <View style={styles.tabContent}>
      {/* Notification Statistics */}
      <Card style={styles.statsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Notification Analytics
        </ThemedText>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText type="title" style={styles.statValue}>
              {notificationStats?.totalReceived || 0}
            </ThemedText>
            <ThemedText type="default" style={styles.statLabel}>
              Total Received
            </ThemedText>
          </View>
          
          <View style={styles.statItem}>
            <ThemedText type="title" style={styles.statValue}>
              {notificationStats?.readRate || 0}%
            </ThemedText>
            <ThemedText type="default" style={styles.statLabel}>
              Read Rate
            </ThemedText>
          </View>
          
          <View style={styles.statItem}>
            <ThemedText type="title" style={styles.statValue}>
              {notificationStats?.clickRate || 0}%
            </ThemedText>
            <ThemedText type="default" style={styles.statLabel}>
              Click Rate
            </ThemedText>
          </View>
          
          <View style={styles.statItem}>
            <ThemedText type="title" style={styles.statValue}>
              {notificationStats?.avgResponseTime || 0}s
            </ThemedText>
            <ThemedText type="default" style={styles.statLabel}>
              Avg. Response
            </ThemedText>
          </View>
        </View>
      </Card>

      {/* Category Distribution */}
      <Card style={styles.distributionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Notification Distribution
        </ThemedText>
        
        <View style={styles.distributionList}>
          {notificationStats?.categoryDistribution?.map(category => (
            <View key={category.type} style={styles.distributionItem}>
              <View style={styles.distributionInfo}>
                <ThemedText type="defaultSemiBold" style={styles.distributionType}>
                  {notificationCategories[category.type]?.title || category.type}
                </ThemedText>
                <ThemedText type="default" style={styles.distributionCount}>
                  {category.count} notifications
                </ThemedText>
              </View>
              <View style={styles.distributionBar}>
                <View 
                  style={[
                    styles.distributionBarFill,
                    { 
                      width: `${(category.count / notificationStats.totalReceived) * 100}%`,
                      backgroundColor: getNotificationColor(category.type),
                    }
                  ]} 
                />
              </View>
            </View>
          )) || (
            <ThemedText type="default" style={styles.emptyText}>
              No analytics data available
            </ThemedText>
          )}
        </View>
      </Card>

      {/* Delivery Channels */}
      <Card style={styles.channelsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Delivery Channels
        </ThemedText>
        
        <View style={styles.channelsList}>
          {notificationStats?.channelStats?.map(channel => (
            <View key={channel.channel} style={styles.channelItem}>
              <ThemedText type="defaultSemiBold" style={styles.channelName}>
                {channel.channel.toUpperCase()}
              </ThemedText>
              <ThemedText type="default" style={styles.channelStats}>
                {channel.delivered} delivered • {channel.failed} failed
              </ThemedText>
              <View style={styles.channelProgress}>
                <View 
                  style={[
                    styles.channelProgressFill,
                    { 
                      width: `${(channel.delivered / (channel.delivered + channel.failed)) * 100}%`,
                      backgroundColor: channel.successRate >= 90 ? colors.success : 
                                     channel.successRate >= 80 ? colors.warning : colors.error,
                    }
                  ]} 
                />
              </View>
            </View>
          )) || (
            <ThemedText type="default" style={styles.emptyText}>
              No channel data available
            </ThemedText>
          )}
        </View>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading notification settings..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Notifications
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Manage your notification preferences and history
          </ThemedText>
        </View>

        {/* Main Content Tabs */}
        <TabView
          tabs={[
            { key: 'preferences', title: 'Preferences' },
            { key: 'history', title: `History (${notifications.length})` },
            { key: 'analytics', title: 'Analytics' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          style={styles.tabView}
        />

        {/* Tab Content */}
        <View style={styles.tabContainer}>
          {activeTab === 'preferences' && renderPreferencesTab()}
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </View>
      </ScrollView>

      {/* Notification Detail Modal */}
      <Modal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        title="Notification Details"
        size="medium"
      >
        {selectedNotification && (
          <View style={styles.notificationModal}>
            <View style={styles.modalHeader}>
              <Badge
                icon={getNotificationIcon(selectedNotification.type)}
                color={getNotificationColor(selectedNotification.type)}
                size="medium"
              />
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {selectedNotification.title}
              </ThemedText>
            </View>
            
            <ThemedText type="default" style={styles.modalBody}>
              {selectedNotification.body}
            </ThemedText>
            
            <View style={styles.modalMeta}>
              <ThemedText type="default" style={styles.modalTime}>
                {formatters.formatDate(selectedNotification.timestamp)}
              </ThemedText>
              <ThemedText type="default" style={styles.modalType}>
                Type: {selectedNotification.type}
              </ThemedText>
            </View>
            
            <View style={styles.modalActions}>
              <Button
                title="Close"
                onPress={() => setShowNotificationModal(false)}
                variant="secondary"
                size="medium"
              />
              <Button
                title="Delete"
                onPress={() => {
                  handleDeleteNotification(selectedNotification.id);
                  setShowNotificationModal(false);
                }}
                variant="danger"
                size="medium"
              />
            </View>
          </View>
        )}
      </Modal>

      {/* Quiet Hours Modal */}
      <Modal
        visible={showQuietHoursModal}
        onClose={() => setShowQuietHoursModal(false)}
        title="Configure Quiet Hours"
        size="medium"
      >
        <View style={styles.quietHoursModal}>
          <ThemedText>Quiet hours configuration form would be here</ThemedText>
        </View>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    lineHeight: 20,
  },
  tabView: {
    marginHorizontal: 16,
  },
  tabContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  permissionsCard: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  sectionDescription: {
    opacity: 0.7,
    lineHeight: 18,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  permissionInfo: {
    flex: 1,
    gap: 2,
  },
  permissionDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  categoriesCard: {
    gap: 16,
  },
  categoriesList: {
    gap: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  categoryDetails: {
    flex: 1,
    gap: 2,
  },
  categoryTitle: {
    fontSize: 16,
  },
  categoryDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 16,
  },
  categoryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testButton: {
    minWidth: 60,
  },
  quietHoursCard: {
    gap: 12,
  },
  quietHoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quietHoursInfo: {
    flex: 1,
    gap: 2,
  },
  quietHoursContent: {
    gap: 8,
  },
  quietHoursText: {
    opacity: 0.7,
  },
  configureButton: {
    alignSelf: 'flex-start',
  },
  saveButton: {
    marginTop: 8,
  },
  historyHeaderCard: {
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    gap: 2,
  },
  notificationsCount: {
    opacity: 0.7,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  searchCard: {
    marginBottom: 8,
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    gap: 12,
  },
  unreadNotification: {
    backgroundColor: '#f0f9ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationIcon: {
    alignSelf: 'flex-start',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 16,
  },
  notificationBody: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
  },
  notificationMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  notificationTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    minWidth: 80,
  },
  emptyNotifications: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  statsCard: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  distributionCard: {
    gap: 16,
  },
  distributionList: {
    gap: 12,
  },
  distributionItem: {
    gap: 8,
  },
  distributionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionType: {
    fontSize: 14,
  },
  distributionCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  distributionBar: {
    height: 4,
    backgroundColor: '#e1e1e1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  channelsCard: {
    gap: 16,
  },
  channelsList: {
    gap: 12,
  },
  channelItem: {
    gap: 8,
  },
  channelName: {
    fontSize: 14,
  },
  channelStats: {
    fontSize: 12,
    opacity: 0.7,
  },
  channelProgress: {
    height: 4,
    backgroundColor: '#e1e1e1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  channelProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  notificationModal: {
    gap: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
  },
  modalBody: {
    lineHeight: 20,
    opacity: 0.8,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTime: {
    fontSize: 14,
    opacity: 0.6,
  },
  modalType: {
    fontSize: 14,
    opacity: 0.6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quietHoursModal: {
    padding: 16,
  },
});

export default NotificationsScreen;