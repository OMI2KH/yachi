import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { useTheme } from '../../contexts/theme-context';
import { useNotification } from '../../hooks/use-notifications';
import { formatters } from '../../utils/formatters';
import { constants } from '../../constants/app';

/**
 * Emergency Update Required Screen
 * 
 * Displays when a critical app update is required for continued functionality
 * Prevents users from accessing the app until they update
 * 
 * @param {Object} props
 * @param {Object} props.route - React Navigation route object
 * @param {string} props.route.params.minVersion - Minimum required version
 * @param {string} props.route.params.currentVersion - Current app version
 * @param {string} props.route.params.releaseNotes - Update release notes
 * @param {boolean} props.route.params.blocking - Whether update blocks app usage
 */
export const UpdateRequiredScreen = ({ route }) => {
  const { theme, colors } = useTheme();
  const { scheduleNotification } = useNotification();
  
  const {
    minVersion = '1.0.0',
    currentVersion = '1.0.0',
    releaseNotes = [],
    blocking = true,
    urgency = 'critical',
  } = route.params || {};

  /**
   * Handle app store redirection based on platform
   */
  const handleUpdatePress = async () => {
    try {
      const appStoreUrl = Platform.select({
        ios: constants.APP_STORE_URL,
        android: constants.PLAY_STORE_URL,
        default: constants.WEB_APP_URL,
      });

      const canOpen = await Linking.canOpenURL(appStoreUrl);
      
      if (canOpen) {
        await Linking.openURL(appStoreUrl);
        
        // Log update attempt for analytics
        console.log('Update redirect attempted', {
          platform: Platform.OS,
          currentVersion,
          minVersion,
          urgency,
        });
      } else {
        throw new Error('Cannot open app store URL');
      }
    } catch (error) {
      console.error('Failed to redirect to app store:', error);
      
      // Fallback to web browser
      const webUrl = constants.WEB_APP_URL;
      await Linking.openURL(webUrl);
    }
  };

  /**
   * Get urgency level styling and content
   */
  const getUrgencyConfig = () => {
    const configs = {
      critical: {
        color: colors.error,
        icon: '🚨',
        title: 'Critical Update Required',
        description: 'This update contains essential security patches and bug fixes required for app functionality.',
      },
      important: {
        color: colors.warning,
        icon: '⚠️',
        title: 'Important Update Available',
        description: 'This update includes important improvements and new features for better experience.',
      },
      recommended: {
        color: colors.info,
        icon: '📱',
        title: 'Update Recommended',
        description: 'A new version is available with performance improvements and bug fixes.',
      },
    };

    return configs[urgency] || configs.critical;
  };

  const urgencyConfig = getUrgencyConfig();

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={[styles.urgencyTitle, { color: urgencyConfig.color }]}>
            {urgencyConfig.icon} {urgencyConfig.title}
          </ThemedText>
          
          <ThemedText type="default" style={styles.subtitle}>
            {urgencyConfig.description}
          </ThemedText>
        </View>

        <Card style={styles.versionCard}>
          <View style={styles.versionRow}>
            <ThemedText type="default">Current Version:</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.versionValue}>
              {currentVersion}
            </ThemedText>
          </View>
          
          <View style={styles.versionRow}>
            <ThemedText type="default">Required Version:</ThemedText>
            <ThemedText type="defaultSemiBold" style={[styles.versionValue, { color: colors.success }]}>
              {minVersion}
            </ThemedText>
          </View>

          <View style={styles.statusContainer}>
            <ThemedText 
              type="defaultSemiBold" 
              style={[
                styles.statusText,
                { color: currentVersion >= minVersion ? colors.success : colors.error }
              ]}
            >
              {currentVersion >= minVersion ? '✓ Up to Date' : '✗ Update Required'}
            </ThemedText>
          </View>
        </Card>

        {releaseNotes.length > 0 && (
          <Card style={styles.releaseNotesCard}>
            <ThemedText type="subtitle" style={styles.releaseNotesTitle}>
              What's New in This Update
            </ThemedText>
            
            <View style={styles.releaseNotesList}>
              {releaseNotes.map((note, index) => (
                <View key={index} style={styles.releaseNoteItem}>
                  <ThemedText type="default" style={styles.bullet}>
                    • 
                  </ThemedText>
                  <ThemedText type="default" style={styles.releaseNoteText}>
                    {note}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        )}

        <Card style={styles.actionsCard}>
          <ThemedText type="subtitle" style={styles.actionsTitle}>
            Next Steps
          </ThemedText>
          
          <View style={styles.actionsList}>
            <View style={styles.actionItem}>
              <ThemedText type="defaultSemiBold">1. Update App</ThemedText>
              <ThemedText type="default">
                Tap the update button below to go to the app store
              </ThemedText>
            </View>
            
            <View style={styles.actionItem}>
              <ThemedText type="defaultSemiBold">2. Install Update</ThemedText>
              <ThemedText type="default">
                Follow the app store prompts to install the latest version
              </ThemedText>
            </View>
            
            <View style={styles.actionItem}>
              <ThemedText type="defaultSemiBold">3. Restart App</ThemedText>
              <ThemedText type="default">
                The app will automatically restart with the new version
              </ThemedText>
            </View>
          </View>
        </Card>

        {blocking && (
          <Card style={[styles.blockingCard, { backgroundColor: colors.error + '20' }]}>
            <ThemedText type="defaultSemiBold" style={[styles.blockingText, { color: colors.error }]}>
              ⚠️ App access is temporarily restricted until this update is installed.
            </ThemedText>
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={`Update to Version ${minVersion}`}
          onPress={handleUpdatePress}
          variant="primary"
          size="large"
          style={styles.updateButton}
          icon="download"
        />
        
        {!blocking && (
          <Button
            title="Continue Anyway"
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="medium"
            style={styles.continueButton}
          />
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  urgencyTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  versionCard: {
    marginBottom: 20,
    padding: 20,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  versionValue: {
    fontSize: 16,
  },
  statusContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
  },
  releaseNotesCard: {
    marginBottom: 20,
    padding: 20,
  },
  releaseNotesTitle: {
    marginBottom: 15,
  },
  releaseNotesList: {
    gap: 8,
  },
  releaseNoteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    marginTop: 2,
  },
  releaseNoteText: {
    flex: 1,
    lineHeight: 20,
  },
  actionsCard: {
    marginBottom: 20,
    padding: 20,
  },
  actionsTitle: {
    marginBottom: 15,
  },
  actionsList: {
    gap: 15,
  },
  actionItem: {
    gap: 5,
  },
  blockingCard: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
  },
  blockingText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    gap: 12,
  },
  updateButton: {
    marginBottom: 5,
  },
  continueButton: {
    marginTop: 5,
  },
});

export default UpdateRequiredScreen;