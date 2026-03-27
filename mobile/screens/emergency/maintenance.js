import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Linking,
  AppState,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import {
  ThemedView,
  ThemedText,
} from '../../../components/themed-view';
import {
  Card,
  Button,
  Loading,
  LottieAnimation,
} from '../../../components/ui';
import { formatDate, formatTime } from '../../../utils/formatters';
import { getAppConfig } from '../../../config/app';

/**
 * Enterprise-level Maintenance Mode Screen
 * Handles scheduled maintenance, emergency outages, and system updates
 */
const MaintenanceScreen = () => {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const { scheduleLocalNotification } = useNotifications();

  const [maintenanceInfo, setMaintenanceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  /**
   * Fetch maintenance information from server
   */
  const fetchMaintenanceInfo = useCallback(async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would fetch from your API
      const config = await getAppConfig();
      const maintenanceData = await simulateMaintenanceApiCall();
      
      setMaintenanceInfo(maintenanceData);
      setLastChecked(new Date());

      // Schedule local notification for maintenance end
      if (maintenanceData.scheduledEndTime) {
        await scheduleMaintenanceEndNotification(maintenanceData);
      }

    } catch (error) {
      console.error('Error fetching maintenance info:', error);
      // Fallback to default maintenance info
      setMaintenanceInfo(getDefaultMaintenanceInfo());
    } finally {
      setLoading(false);
    }
  }, [scheduleLocalNotification]);

  /**
   * Check for app updates
   */
  const checkForUpdates = async () => {
    try {
      setCheckingUpdate(true);
      
      if (Platform.OS === 'web') {
        // For web, trigger a hard reload
        window.location.reload();
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        Alert.alert('No Updates', 'You are running the latest version of the app.');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      Alert.alert('Update Error', 'Failed to check for updates. Please try again later.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  /**
   * Handle retry connection
   */
  const handleRetry = async () => {
    await fetchMaintenanceInfo();
    
    // Also check if we're still in maintenance
    const isMaintenanceActive = await checkMaintenanceStatus();
    if (!isMaintenanceActive) {
      router.replace('/');
    }
  };

  /**
   * Handle contact support
   */
  const handleContactSupport = async () => {
    const supportEmail = 'support@yachi.com';
    const supportPhone = '+251911234567';
    
    Alert.alert(
      'Contact Support',
      'Choose how you would like to contact our support team:',
      [
        {
          text: 'Email',
          onPress: () => Linking.openURL(`mailto:${supportEmail}`),
        },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${supportPhone}`),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  /**
   * Handle app state changes (foreground/background)
   */
  const handleAppStateChange = useCallback((nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, check maintenance status
      fetchMaintenanceInfo();
    }
    setAppState(nextAppState);
  }, [appState, fetchMaintenanceInfo]);

  /**
   * Schedule notification for maintenance end
   */
  const scheduleMaintenanceEndNotification = async (maintenanceData) => {
    const endTime = new Date(maintenanceData.scheduledEndTime);
    const now = new Date();
    
    if (endTime > now) {
      const timeUntilEnd = endTime.getTime() - now.getTime();
      
      // Schedule notification 1 minute after maintenance ends
      await scheduleLocalNotification({
        title: 'Maintenance Complete',
        message: 'Yachi is back online! You can now use the app normally.',
        trigger: new Date(now.getTime() + timeUntilEnd + 60000), // 1 minute after end
        data: { type: 'maintenance_complete' },
      });
    }
  };

  // Set up app state listener and fetch maintenance info
  useEffect(() => {
    fetchMaintenanceInfo();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [fetchMaintenanceInfo, handleAppStateChange]);

  if (loading || !maintenanceInfo) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Loading size="large" message="Checking system status..." />
      </ThemedView>
    );
  }

  const {
    type,
    severity,
    title,
    message,
    scheduledStartTime,
    scheduledEndTime,
    currentProgress,
    isEmergency,
    supportContact,
    updates,
  } = maintenanceInfo;

  const isScheduled = type === 'scheduled';
  const isInProgress = type === 'in_progress';
  const isExtended = type === 'extended';
  const isResolved = type === 'resolved';

  const estimatedDuration = scheduledEndTime 
    ? Math.max(0, new Date(scheduledEndTime).getTime() - Date.now())
    : 0;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Animation */}
        <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 20 }}>
          <LottieAnimation
            source={getAnimationSource(severity, type)}
            autoPlay
            loop
            style={{ width: 200, height: 200 }}
          />
          
          <ThemedText type="title" style={{ textAlign: 'center', marginBottom: 8 }}>
            {title}
          </ThemedText>
          
          <ThemedText type="body" style={{ textAlign: 'center', color: colors.textSecondary }}>
            {message}
          </ThemedText>
        </View>

        {/* Maintenance Details Card */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
            📊 Maintenance Details
          </ThemedText>

          <View style={{ gap: 12 }}>
            {/* Maintenance Type Badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Type:
              </ThemedText>
              <View style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: getStatusColor(severity, colors),
              }}>
                <ThemedText style={{ 
                  color: colors.white, 
                  fontSize: 12,
                  textTransform: 'capitalize'
                }}>
                  {severity} {type.replace('_', ' ')}
                </ThemedText>
              </View>
            </View>

            {/* Schedule Information */}
            {scheduledStartTime && (
              <DetailRow 
                label="Started" 
                value={formatDate(scheduledStartTime, 'full')}
              />
            )}

            {scheduledEndTime && (
              <DetailRow 
                label="Estimated Completion" 
                value={formatDate(scheduledEndTime, 'full')}
              />
            )}

            {/* Progress Bar for In-Progress Maintenance */}
            {isInProgress && currentProgress !== null && (
              <View style={{ marginTop: 8 }}>
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between',
                  marginBottom: 4 
                }}>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    Progress
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {currentProgress}%
                  </ThemedText>
                </View>
                <View style={{
                  height: 6,
                  backgroundColor: colors.border,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    width: `${currentProgress}%`,
                    backgroundColor: colors.primary,
                    borderRadius: 3,
                  }} />
                </View>
              </View>
            )}

            {/* Countdown Timer for Scheduled Maintenance */}
            {estimatedDuration > 0 && (
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <ThemedText type="caption" style={{ color: colors.textSecondary, marginBottom: 4 }}>
                  Time Remaining
                </ThemedText>
                <ThemedText type="subtitle">
                  {formatDuration(estimatedDuration)}
                </ThemedText>
              </View>
            )}
          </View>
        </Card>

        {/* Updates & Progress Card */}
        {updates && updates.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
              🔄 Latest Updates
            </ThemedText>
            
            <View style={{ gap: 12 }}>
              {updates.slice(0, 3).map((update, index) => (
                <View key={index} style={{
                  padding: 12,
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: getUpdateColor(update.type, colors),
                }}>
                  <ThemedText style={{ marginBottom: 4 }}>
                    {update.message}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {formatTime(update.timestamp)} • {update.type}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Support Information Card */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            🛟 Need Help?
          </ThemedText>
          
          <ThemedText type="body" style={{ marginBottom: 16, color: colors.textSecondary }}>
            Our support team is available to assist you during this maintenance period.
          </ThemedText>

          <View style={{ gap: 8 }}>
            {supportContact?.email && (
              <DetailRow 
                label="Email" 
                value={supportContact.email}
                onPress={() => Linking.openURL(`mailto:${supportContact.email}`)}
              />
            )}
            
            {supportContact?.phone && (
              <DetailRow 
                label="Phone" 
                value={supportContact.phone}
                onPress={() => Linking.openURL(`tel:${supportContact.phone}`)}
              />
            )}
            
            {supportContact?.website && (
              <DetailRow 
                label="Status Page" 
                value="View detailed status"
                onPress={() => Linking.openURL(supportContact.website)}
              />
            )}
          </View>
        </Card>

        {/* System Information Card */}
        <Card variant="outline">
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            ℹ️ System Information
          </ThemedText>
          
          <View style={{ gap: 8 }}>
            <DetailRow 
              label="Last Checked" 
              value={lastChecked ? formatTime(lastChecked) : 'Never'}
            />
            <DetailRow 
              label="App Version" 
              value={getAppVersion()}
            />
            <DetailRow 
              label="Platform" 
              value={Platform.OS}
            />
            <DetailRow 
              label="Maintenance ID" 
              value={maintenanceInfo.id || 'N/A'}
            />
          </View>
        </Card>

        {/* Emergency Instructions for Critical Issues */}
        {isEmergency && (
          <Card style={{ 
            marginBottom: 16,
            borderColor: colors.error,
            borderWidth: 2,
            backgroundColor: `${colors.error}15`,
          }}>
            <ThemedText type="subtitle" style={{ marginBottom: 8, color: colors.error }}>
              🚨 Emergency Notice
            </ThemedText>
            <ThemedText style={{ marginBottom: 8 }}>
              This is a critical system emergency. Our team is working to resolve the issue as quickly as possible.
            </ThemedText>
            <ThemedText type="caption" style={{ color: colors.error }}>
              For urgent matters, please call our emergency support line.
            </ThemedText>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={{ 
        padding: 16, 
        borderTopWidth: 1, 
        borderTopColor: colors.border,
        gap: 12
      }}>
        {/* Primary Action Based on Maintenance Status */}
        {isResolved ? (
          <Button
            variant="primary"
            onPress={() => router.replace('/')}
          >
            Continue to App
          </Button>
        ) : (
          <Button
            variant="primary"
            onPress={handleRetry}
            loading={loading}
          >
            Check Status Again
          </Button>
        )}

        {/* Secondary Actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            variant="outline"
            onPress={checkForUpdates}
            loading={checkingUpdate}
            style={{ flex: 1 }}
          >
            Check for Updates
          </Button>
          
          <Button
            variant="outline"
            onPress={handleContactSupport}
            style={{ flex: 1 }}
          >
            Contact Support
          </Button>
        </View>

        {/* Emergency Action for Critical Issues */}
        {isEmergency && (
          <Button
            variant="error"
            onPress={() => Linking.openURL(`tel:${supportContact?.emergencyPhone || '+251911234567'}`)}
          >
            🚨 Emergency Call
          </Button>
        )}
      </View>
    </ThemedView>
  );
};

/**
 * Reusable Detail Row Component
 */
const DetailRow = ({ label, value, onPress }) => {
  const { colors } = useTheme();
  
  return (
    <View style={{ 
      flexDirection: 'row', 
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
        {label}:
      </ThemedText>
      
      {onPress ? (
        <TouchableOpacity onPress={onPress}>
          <ThemedText style={{ 
            color: colors.primary,
            textDecorationLine: 'underline',
          }}>
            {value}
          </ThemedText>
        </TouchableOpacity>
      ) : (
        <ThemedText style={{ flex: 1, textAlign: 'right' }}>
          {value}
        </ThemedText>
      )}
    </View>
  );
};

/**
 * Utility Functions
 */

const simulateMaintenanceApiCall = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In real implementation, this would be an actual API call
  return {
    id: 'mtn_2024_001',
    type: 'in_progress',
    severity: 'critical',
    title: 'System Maintenance in Progress',
    message: 'We are currently performing scheduled maintenance to improve your experience. Some features may be temporarily unavailable.',
    scheduledStartTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    scheduledEndTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    currentProgress: 45,
    isEmergency: false,
    supportContact: {
      email: 'support@yachi.com',
      phone: '+251911234567',
      website: 'https://status.yachi.com',
      emergencyPhone: '+251911999999'
    },
    updates: [
      {
        id: 'upd_001',
        type: 'info',
        message: 'Database optimization in progress',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      {
        id: 'upd_002',
        type: 'warning',
        message: 'Payment system temporarily offline',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'upd_003',
        type: 'success',
        message: 'User authentication services restored',
        timestamp: new Date().toISOString(),
      }
    ]
  };
};

const getDefaultMaintenanceInfo = () => ({
  id: 'mtn_default',
  type: 'in_progress',
  severity: 'medium',
  title: 'System Maintenance',
  message: 'We are currently performing maintenance. Please check back shortly.',
  scheduledStartTime: new Date().toISOString(),
  scheduledEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  currentProgress: 50,
  isEmergency: false,
  supportContact: {
    email: 'support@yachi.com',
    phone: '+251911234567',
  },
  updates: []
});

const getAnimationSource = (severity, type) => {
  const animations = {
    critical: require('../../../assets/lottie/maintenance-critical.json'),
    high: require('../../../assets/lottie/maintenance-high.json'),
    medium: require('../../../assets/lottie/maintenance-medium.json'),
    low: require('../../../assets/lottie/maintenance-low.json'),
  };
  
  return animations[severity] || require('../../../assets/lottie/maintenance-medium.json');
};

const getStatusColor = (severity, colors) => {
  const colorMap = {
    critical: colors.error,
    high: colors.warning,
    medium: colors.primary,
    low: colors.success,
  };
  
  return colorMap[severity] || colors.primary;
};

const getUpdateColor = (type, colors) => {
  const colorMap = {
    info: colors.primary,
    warning: colors.warning,
    success: colors.success,
    error: colors.error,
  };
  
  return colorMap[type] || colors.primary;
};

const formatDuration = (milliseconds) => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const getAppVersion = () => {
  return '2.1.0'; // This would come from app.json or Constants
};

const checkMaintenanceStatus = async () => {
  // Simulate API call to check if maintenance is still active
  try {
    const response = await fetch('https://api.yachi.com/health');
    const data = await response.json();
    return data.maintenanceMode;
  } catch (error) {
    return true; // Assume maintenance is still active if we can't check
  }
};

// Add TouchableOpacity import
import { TouchableOpacity } from 'react-native';

export default MaintenanceScreen;