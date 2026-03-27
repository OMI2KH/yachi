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
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
import { 
  BiometricPrompt 
} from '../../../components/forms/biometric-prompt';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  userService 
} from '../../../services/user-service';
import { 
  authService 
} from '../../../services/auth-service';
import { 
  securityService 
} from '../../../services/security-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Security Settings Screen
 * Features: Biometric auth, session management, privacy controls, security monitoring
 */
const SecurityScreen = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { refreshUser } = useUser();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    biometricAuth: false,
    twoFactorAuth: false,
    sessionTimeout: 30, // minutes
    loginAlerts: true,
    paymentConfirmation: true,
    dataSharing: false,
    locationTracking: true,
  });
  const [activeSessions, setActiveSessions] = useState([]);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);
  const [lastPasswordChange, setLastPasswordChange] = useState(null);

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('SecuritySettings');
    }, [])
  );

  // Load security data
  const loadSecurityData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Load user security settings
      const settings = await userService.getSecuritySettings(user?.id);
      setSecuritySettings(settings);
      
      // Load active sessions
      const sessions = await authService.getActiveSessions(user?.id);
      setActiveSessions(sessions);
      
      // Calculate security score
      const score = await securityService.calculateSecurityScore(user?.id);
      setSecurityScore(score);
      
      // Get last password change date
      const lastChange = await authService.getLastPasswordChange(user?.id);
      setLastPasswordChange(lastChange);
      
      analyticsService.trackEvent('security_settings_loaded', {
        userId: user?.id,
        securityScore: score,
        hasBiometric: settings.biometricAuth,
        has2FA: settings.twoFactorAuth,
      });
    } catch (error) {
      console.error('Error loading security data:', error);
      showError('Failed to load security settings');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadSecurityData();
    }, [loadSecurityData])
  );

  // Update security setting
  const updateSecuritySetting = async (key, value) => {
    try {
      setIsLoading(true);
      
      const previousValue = securitySettings[key];
      setSecuritySettings(prev => ({ ...prev, [key]: value }));
      
      // Special handling for biometric auth
      if (key === 'biometricAuth' && value) {
        setShowBiometricModal(true);
        return;
      }
      
      await userService.updateSecuritySettings(user?.id, {
        [key]: value
      });
      
      // Recalculate security score
      const newScore = await securityService.calculateSecurityScore(user?.id);
      setSecurityScore(newScore);
      
      analyticsService.trackEvent('security_setting_updated', {
        userId: user?.id,
        setting: key,
        value: value,
        previousValue: previousValue,
        securityScore: newScore,
      });
      
      showSuccess('Security setting updated');
    } catch (error) {
      console.error('Error updating security setting:', error);
      setSecuritySettings(prev => ({ ...prev, [key]: previousValue }));
      showError('Failed to update security setting');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle biometric setup
  const handleBiometricSetup = async (success) => {
    try {
      if (success) {
        await userService.updateSecuritySettings(user?.id, {
          biometricAuth: true
        });
        
        const newScore = await securityService.calculateSecurityScore(user?.id);
        setSecurityScore(newScore);
        
        analyticsService.trackEvent('biometric_auth_enabled', {
          userId: user?.id,
          securityScore: newScore,
        });
        
        showSuccess('Biometric authentication enabled');
      } else {
        setSecuritySettings(prev => ({ ...prev, biometricAuth: false }));
        showError('Biometric setup failed');
      }
    } catch (error) {
      console.error('Error setting up biometric auth:', error);
      setSecuritySettings(prev => ({ ...prev, biometricAuth: false }));
      showError('Failed to enable biometric authentication');
    } finally {
      setShowBiometricModal(false);
    }
  };

  // Terminate session
  const terminateSession = async (sessionId) => {
    try {
      await authService.terminateSession(user?.id, sessionId);
      
      const updatedSessions = activeSessions.filter(session => session.id !== sessionId);
      setActiveSessions(updatedSessions);
      
      analyticsService.trackEvent('session_terminated', {
        userId: user?.id,
        sessionId: sessionId,
        remainingSessions: updatedSessions.length,
      });
      
      showSuccess('Session terminated');
    } catch (error) {
      console.error('Error terminating session:', error);
      showError('Failed to terminate session');
    }
  };

  // Terminate all other sessions
  const terminateAllOtherSessions = async () => {
    try {
      await authService.terminateAllOtherSessions(user?.id);
      
      const currentSession = activeSessions.find(session => session.isCurrent);
      setActiveSessions(currentSession ? [currentSession] : []);
      
      analyticsService.trackEvent('all_sessions_terminated', {
        userId: user?.id,
        currentSessionOnly: true,
      });
      
      showSuccess('All other sessions terminated');
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      showError('Failed to terminate sessions');
    }
  };

  // Change password
  const handleChangePassword = () => {
    analyticsService.trackEvent('change_password_initiated', { userId: user?.id });
    router.push('/profile/change-password');
  };

  // Setup two-factor authentication
  const handleSetup2FA = () => {
    analyticsService.trackEvent('2fa_setup_initiated', { userId: user?.id });
    router.push('/profile/two-factor-setup');
  };

  // View privacy policy
  const handleViewPrivacyPolicy = async () => {
    try {
      await Linking.openURL('https://yachi.app/privacy-policy');
      analyticsService.trackEvent('privacy_policy_viewed', { userId: user?.id });
    } catch (error) {
      console.error('Error opening privacy policy:', error);
      showError('Cannot open privacy policy');
    }
  };

  // View terms of service
  const handleViewTerms = async () => {
    try {
      await Linking.openURL('https://yachi.app/terms-of-service');
      analyticsService.trackEvent('terms_viewed', { userId: user?.id });
    } catch (error) {
      console.error('Error opening terms:', error);
      showError('Cannot open terms of service');
    }
  };

  // Export user data
  const handleExportData = async () => {
    try {
      setIsLoading(true);
      
      const data = await userService.exportUserData(user?.id);
      // In a real app, this would trigger download or share sheet
      
      analyticsService.trackEvent('data_exported', { userId: user?.id });
      showSuccess('Data export initiated. You will receive it via email.');
    } catch (error) {
      console.error('Error exporting data:', error);
      showError('Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete account
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be erased. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteAccount(user?.id);
              analyticsService.trackEvent('account_deleted', { userId: user?.id });
              await logout();
            } catch (error) {
              console.error('Error deleting account:', error);
              showError('Failed to delete account');
            }
          }
        },
      ]
    );
  };

  // Render security score card
  const renderSecurityScore = () => (
    <Card style={styles.securityScoreCard}>
      <View style={styles.securityScoreHeader}>
        <ThemedText style={styles.securityScoreTitle}>
          Security Score
        </ThemedText>
        <View style={[
          styles.scoreBadge,
          { backgroundColor: 
            securityScore >= 80 ? '#22c55e' : 
            securityScore >= 60 ? '#eab308' : '#ef4444'
          }
        ]}>
          <ThemedText style={styles.scoreText}>
            {securityScore}/100
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.scoreBar}>
        <View 
          style={[
            styles.scoreProgress,
            { 
              width: `${securityScore}%`,
              backgroundColor: 
                securityScore >= 80 ? '#22c55e' : 
                securityScore >= 60 ? '#eab308' : '#ef4444'
            }
          ]} 
        />
      </View>
      
      <ThemedText style={styles.securityScoreDescription}>
        {securityScore >= 80 ? 'Excellent! Your account is well protected.' :
         securityScore >= 60 ? 'Good. Consider enabling additional security features.' :
         'Your account security needs improvement. Enable more security features.'}
      </ThemedText>
    </Card>
  );

  // Render authentication section
  const renderAuthenticationSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Authentication
      </ThemedText>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Biometric Authentication
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Use fingerprint or face ID to log in
          </ThemedText>
        </View>
        <Switch
          value={securitySettings.biometricAuth}
          onValueChange={(value) => updateSecuritySetting('biometricAuth', value)}
          disabled={isLoading}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Two-Factor Authentication
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Extra security layer for your account
          </ThemedText>
        </View>
        <Switch
          value={securitySettings.twoFactorAuth}
          onValueChange={(value) => updateSecuritySetting('twoFactorAuth', value)}
          disabled={isLoading}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <Button
        variant="outlined"
        onPress={handleChangePassword}
        leftIcon="lock"
        style={styles.actionButton}
      >
        Change Password
      </Button>
      
      {lastPasswordChange && (
        <ThemedText style={styles.lastChangeText}>
          Last changed: {new Date(lastPasswordChange).toLocaleDateString()}
        </ThemedText>
      )}
    </Card>
  );

  // Render privacy section
  const renderPrivacySection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Privacy & Data
      </ThemedText>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Login Alerts
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Get notified of new sign-ins
          </ThemedText>
        </View>
        <Switch
          value={securitySettings.loginAlerts}
          onValueChange={(value) => updateSecuritySetting('loginAlerts', value)}
          disabled={isLoading}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Payment Confirmation
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Require confirmation for payments
          </ThemedText>
        </View>
        <Switch
          value={securitySettings.paymentConfirmation}
          onValueChange={(value) => updateSecuritySetting('paymentConfirmation', value)}
          disabled={isLoading}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>
            Data Sharing for Analytics
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            Help improve Yachi with anonymous data
          </ThemedText>
        </View>
        <Switch
          value={securitySettings.dataSharing}
          onValueChange={(value) => updateSecuritySetting('dataSharing', value)}
          disabled={isLoading}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      
      <View style={styles.settingActions}>
        <Button
          variant="ghost"
          onPress={handleExportData}
          leftIcon="download"
          style={styles.privacyButton}
        >
          Export My Data
        </Button>
        
        <Button
          variant="ghost"
          onPress={handleViewPrivacyPolicy}
          leftIcon="shield"
          style={styles.privacyButton}
        >
          Privacy Policy
        </Button>
        
        <Button
          variant="ghost"
          onPress={handleViewTerms}
          leftIcon="document"
          style={styles.privacyButton}
        >
          Terms of Service
        </Button>
      </View>
    </Card>
  );

  // Render active sessions
  const renderActiveSessions = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sessionsHeader}>
        <ThemedText style={styles.sectionTitle}>
          Active Sessions ({activeSessions.length})
        </ThemedText>
        {activeSessions.length > 1 && (
          <Button
            variant="outlined"
            size="small"
            onPress={terminateAllOtherSessions}
          >
            Log Out Others
          </Button>
        )}
      </View>
      
      {activeSessions.map((session, index) => (
        <View key={session.id} style={styles.sessionItem}>
          <View style={styles.sessionInfo}>
            <ThemedText style={styles.sessionDevice}>
              {session.device} {session.isCurrent && '(This Device)'}
            </ThemedText>
            <ThemedText style={styles.sessionDetails}>
              {session.location} • {new Date(session.lastActive).toLocaleDateString()}
            </ThemedText>
          </View>
          {!session.isCurrent && (
            <Button
              variant="destructive"
              size="small"
              onPress={() => terminateSession(session.id)}
            >
              Revoke
            </Button>
          )}
        </View>
      ))}
    </Card>
  );

  // Render danger zone
  const renderDangerZone = () => (
    <Card style={styles.dangerZoneCard}>
      <ThemedText style={styles.dangerZoneTitle}>
        Danger Zone
      </ThemedText>
      
      <ThemedText style={styles.dangerZoneDescription}>
        These actions are irreversible. Proceed with caution.
      </ThemedText>
      
      <Button
        variant="destructive"
        onPress={handleDeleteAccount}
        leftIcon="trash"
        style={styles.dangerButton}
      >
        Delete Account Permanently
      </Button>
    </Card>
  );

  if (isLoading && !securitySettings) {
    return <Loading message="Loading security settings..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadSecurityData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Security Score */}
        {renderSecurityScore()}

        {/* Authentication Section */}
        {renderAuthenticationSection()}

        {/* Active Sessions */}
        {renderActiveSessions()}

        {/* Privacy Section */}
        {renderPrivacySection()}

        {/* Danger Zone */}
        {renderDangerZone()}
      </ScrollView>

      {/* Biometric Setup Modal */}
      <BiometricPrompt
        visible={showBiometricModal}
        onSuccess={() => handleBiometricSetup(true)}
        onFailure={() => handleBiometricSetup(false)}
        onCancel={() => handleBiometricSetup(false)}
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
  securityScoreCard: {
    marginBottom: 16,
    padding: 16,
  },
  securityScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityScoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  securityScoreDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
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
  actionButton: {
    marginTop: 8,
  },
  lastChangeText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 8,
    textAlign: 'center',
  },
  sessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionDetails: {
    fontSize: 14,
    opacity: 0.7,
  },
  settingActions: {
    marginTop: 8,
  },
  privacyButton: {
    marginBottom: 8,
  },
  dangerZoneCard: {
    marginBottom: 32,
    padding: 16,
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  dangerZoneDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    marginTop: 8,
  },
};

export default SecurityScreen;