// app/(profile)/modal.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  BackHandler,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useLoading } from '../../../contexts/loading-context';
import { analyticsService } from '../../../services/analytics-service';
import { errorService } from '../../../services/error-service';

// Components
import QuickSettings from '../../../components/profile/modal/quick-settings';
import AccountActions from '../../../components/profile/modal/account-actions';
import SupportSection from '../../../components/profile/modal/support-section';
import AppInfo from '../../../components/profile/modal/app-info';
import ModalHeader from '../../../components/ui/modal-header';
import LoadingScreen from '../../../components/ui/loading';
import Toast from '../../../components/ui/toast';

// Constants
import { MODAL_TYPES, ACCOUNT_ACTIONS } from '../../../constants/profile';

const { width, height } = Dimensions.get('window');

export default function ProfileModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, logout, deleteAccount } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [activeSection, setActiveSection] = useState('settings');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Refs
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Get modal type from params
  const modalType = params.type || MODAL_TYPES.SETTINGS;
  const subType = params.subType || null;
  const initialData = params.data ? JSON.parse(params.data) : null;

  // Handle modal animation
  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        delay: 100,
      }),
    ]).start();

    // Handle Android back button
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }

    // Track modal view
    analyticsService.trackScreenView(`profile_modal_${modalType}`, {
      userId: user?.id,
      modalType,
      subType,
    });
  }, []);

  // Handle back press
  const handleBackPress = () => {
    if (unsavedChanges) {
      showUnsavedChangesAlert();
      return true;
    }
    handleClose();
    return true;
  };

  // Close modal
  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  // Show unsaved changes alert
  const showUnsavedChangesAlert = () => {
    Alert.alert(
      'Unsaved Changes',
      'You have unsaved changes. Are you sure you want to close?',
      [
        {
          text: 'Stay',
          style: 'cancel',
        },
        {
          text: 'Close',
          style: 'destructive',
          onPress: handleClose,
        },
      ]
    );
  };

  // Handle quick settings changes
  const handleSettingChange = async (setting, value) => {
    try {
      setLoading(true);

      switch (setting) {
        case 'theme':
          toggleTheme();
          showToast(`Theme changed to ${value === 'dark' ? 'dark' : 'light'} mode`, 'success');
          break;

        case 'notifications':
          // Update notification preferences
          await updateUserPreferences({ notifications: value });
          showToast('Notification settings updated', 'success');
          break;

        case 'language':
          // Update language preference
          await updateUserPreferences({ language: value });
          showToast('Language preference updated', 'success');
          break;

        case 'privacy':
          // Update privacy settings
          await updateUserPreferences({ privacy: value });
          showToast('Privacy settings updated', 'success');
          break;

        default:
          console.warn('Unknown setting:', setting);
      }

      analyticsService.trackEvent('profile_setting_changed', {
        setting,
        value,
        userId: user.id,
      });

    } catch (error) {
      console.error('Error updating setting:', error);
      showToast('Failed to update setting', 'error');
      
      errorService.captureError(error, {
        context: 'ProfileSettingUpdate',
        setting,
        value,
        userId: user.id,
      });
    } finally {
      setLoading(false);
    }
  };

  // Update user preferences
  const updateUserPreferences = async (updates) => {
    // This would typically call your user service
    // For now, we'll simulate an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    });
  };

  // Handle account actions
  const handleAccountAction = async (action, data = {}) => {
    try {
      setLoading(true);

      switch (action) {
        case ACCOUNT_ACTIONS.LOGOUT:
          await handleLogout();
          break;

        case ACCOUNT_ACTIONS.DELETE_ACCOUNT:
          await handleDeleteAccount(data);
          break;

        case ACCOUNT_ACTIONS.DEACTIVATE:
          await handleDeactivateAccount(data);
          break;

        case ACCOUNT_ACTIONS.EXPORT_DATA:
          await handleExportData();
          break;

        case ACCOUNT_ACTIONS.CLEAR_CACHE:
          await handleClearCache();
          break;

        default:
          console.warn('Unknown account action:', action);
      }

    } catch (error) {
      console.error('Error performing account action:', error);
      showToast(`Failed to ${action}`, 'error');
      
      errorService.captureError(error, {
        context: 'AccountAction',
        action,
        userId: user.id,
        data,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            showLoading('Logging out...');
            await logout();
            hideLoading();
            handleClose();
          },
        },
      ]
    );
  };

  // Handle account deletion
  const handleDeleteAccount = async (data) => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            showLoading('Deleting account...');
            
            const result = await deleteAccount(data.reason);
            
            if (result.success) {
              showToast('Account deleted successfully', 'success');
              handleClose();
            } else {
              throw new Error(result.message || 'Failed to delete account');
            }
            
            hideLoading();
          },
        },
      ]
    );
  };

  // Handle account deactivation
  const handleDeactivateAccount = async (data) => {
    Alert.alert(
      'Deactivate Account',
      'Your account will be temporarily disabled. You can reactivate it anytime by logging back in.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            showLoading('Deactivating account...');
            // Implement deactivation logic
            showToast('Account deactivated', 'success');
            handleClose();
            hideLoading();
          },
        },
      ]
    );
  };

  // Handle data export
  const handleExportData = async () => {
    showLoading('Preparing your data export...');
    
    try {
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 2000));
      showToast('Data export prepared. Check your email.', 'success');
    } catch (error) {
      showToast('Failed to export data', 'error');
    } finally {
      hideLoading();
    }
  };

  // Handle cache clearance
  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and temporary files. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            showLoading('Clearing cache...');
            
            try {
              // Implement cache clearance logic
              await new Promise(resolve => setTimeout(resolve, 1000));
              showToast('Cache cleared successfully', 'success');
            } catch (error) {
              showToast('Failed to clear cache', 'error');
            } finally {
              hideLoading();
            }
          },
        },
      ]
    );
  };

  // Handle support actions
  const handleSupportAction = (action, data = {}) => {
    switch (action) {
      case 'contact':
        router.push('/support/contact');
        break;

      case 'help':
        router.push('/support/help');
        break;

      case 'feedback':
        router.push('/support/feedback');
        break;

      case 'report':
        router.push('/support/report');
        break;

      default:
        console.warn('Unknown support action:', action);
    }

    analyticsService.trackEvent('support_action_triggered', {
      action,
      userId: user.id,
    });
  };

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Render modal content based on type
  const renderModalContent = () => {
    switch (modalType) {
      case MODAL_TYPES.SETTINGS:
        return (
          <QuickSettings
            currentSettings={{
              theme: isDark ? 'dark' : 'light',
              notifications: true, // This would come from user preferences
              language: 'en', // This would come from user preferences
              privacy: 'public', // This would come from user preferences
            }}
            onSettingChange={handleSettingChange}
            loading={loading}
            theme={theme}
          />
        );

      case MODAL_TYPES.ACCOUNT:
        return (
          <AccountActions
            onAction={handleAccountAction}
            loading={loading}
            theme={theme}
          />
        );

      case MODAL_TYPES.SUPPORT:
        return (
          <SupportSection
            onAction={handleSupportAction}
            theme={theme}
          />
        );

      case MODAL_TYPES.INFO:
        return (
          <AppInfo
            theme={theme}
          />
        );

      default:
        return (
          <View style={styles.unknownContainer}>
            <Text style={[styles.unknownText, { color: theme.colors.text }]}>
              Unknown modal type
            </Text>
          </View>
        );
    }
  };

  // Get modal title
  const getModalTitle = () => {
    const titles = {
      [MODAL_TYPES.SETTINGS]: 'Quick Settings',
      [MODAL_TYPES.ACCOUNT]: 'Account Actions',
      [MODAL_TYPES.SUPPORT]: 'Help & Support',
      [MODAL_TYPES.INFO]: 'App Information',
    };
    return titles[modalType] || 'Settings';
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
            backgroundColor: `rgba(0, 0, 0, ${isDark ? 0.7 : 0.5})`,
          },
        ]}
      >
        <View style={styles.backdropTouchable} onTouchStart={handleBackPress} />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        {/* Header */}
        <ModalHeader
          title={getModalTitle()}
          onClose={handleBackPress}
          theme={theme}
        />

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {renderModalContent()}
        </ScrollView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <LoadingScreen size="small" />
          </View>
        )}
      </Animated.View>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
        theme={theme}
        position="bottom"
      />

      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  unknownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unknownText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

// Mock Text component
const Text = ({ children, style }) => {
  return <View><Text style={style}>{children}</Text></View>;
};