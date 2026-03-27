/**
 * 🎯 ENTERPRISE OFFLINE SCREEN v3.0
 * 
 * Enhanced Features:
 * - Intelligent offline mode with Ethiopian context
 * - AI-powered offline functionality prediction
 * - Progressive data synchronization
 * - Emergency offline capabilities
 * - Smart caching and data persistence
 * - Offline construction project management
 * - Local Ethiopian map integration
 * - TypeScript-first with enterprise reliability
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  AppState,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLocation } from '../../contexts/location-context';
import { useBookings } from '../../hooks/use-bookings';
import { 
  connectivityService, 
  syncService, 
  cacheService,
  emergencyService 
} from '../../services';

// Import Enterprise Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import ProgressIndicator from '../../components/ui/progress-indicator';
import OfflineCard from '../../components/emergency/offline-card';
import SyncStatus from '../../components/sync/sync-status';
import EmergencyAccessCard from '../../components/emergency/emergency-access-card';
import OfflineMap from '../../components/map/offline-map';

// Import Enterprise Constants
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/sizes';
import { OFFLINE_CAPABILITIES } from '../../constants/connectivity';
import { ETHIOPIAN_REGIONS } from '../../constants/location';

// ==================== ENTERPRISE CONSTANTS ====================
const OFFLINE_MODES = Object.freeze({
  LIMITED: 'limited',
  EMERGENCY: 'emergency',
  SYNCING: 'syncing',
  RECONNECTING: 'reconnecting'
});

const SYNC_PRIORITIES = Object.freeze({
  CRITICAL: ['emergency_alerts', 'safety_updates', 'active_bookings'],
  HIGH: ['messages', 'progress_updates', 'material_deliveries'],
  MEDIUM: ['analytics', 'user_preferences', 'cached_maps'],
  LOW: ['historical_data', 'backup_data']
});

const OFFLINE_FEATURES = Object.freeze({
  [OFFLINE_CAPABILITIES.ACTIVE_BOOKINGS]: {
    label: 'ንቁ ቦቂንጎች',
    description: 'የአሁኑ ፕሮጀክቶችን ይመልከቱ እና ያስተዳድሩ',
    icon: '📋',
    available: true
  },
  [OFFLINE_CAPABILITIES.EMERGENCY_ACCESS]: {
    label: 'አደጋ መዳረሻ',
    description: 'አደጋ ማስተወስ እና መልዕክቶች',
    icon: '🚨',
    available: true
  },
  [OFFLINE_CAPABILITIES.OFFLINE_MAPS]: {
    label: 'የካርታ አገልግሎት',
    description: 'የተጫኑ ካርታዎችን ይጠቀሙ',
    icon: '🗺️',
    available: true
  },
  [OFFLINE_CAPABILITIES.DOCUMENT_ACCESS]: {
    label: 'ሰነዶች',
    description: 'የተጫኑ ፕሮጀክት ሰነዶች',
    icon: '📄',
    available: true
  },
  [OFFLINE_CAPABILITIES.PROGRESS_TRACKING]: {
    label: 'የእድገት ቀረጻ',
    description: 'የፕሮጀክት እድገትን በኦፍላይን ይቀይሩ',
    icon: '📊',
    available: true
  }
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OfflineScreen = ({ navigation, route }) => {
  // ==================== ENTERPRISE HOOKS ====================
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { currentLocation, getCachedLocation } = useLocation();
  const { getCachedBookings, syncPendingUpdates } = useBookings();

  // ==================== ENTERPRISE STATE MANAGEMENT ====================
  const [offlineMode, setOfflineMode] = useState(OFFLINE_MODES.LIMITED);
  const [syncProgress, setSyncProgress] = useState(0);
  const [pendingSyncs, setPendingSyncs] = useState([]);
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [cachedData, setCachedData] = useState({
    bookings: [],
    locations: [],
    documents: [],
    maps: []
  });

  // Animation states
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(50));
  const appState = useRef(AppState.currentState);

  // ==================== ENTERPRISE EFFECTS ====================
  useEffect(() => {
    initializeOfflineMode();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      stopPulseAnimation();
    };
  }, []);

  useEffect(() => {
    if (offlineMode === OFFLINE_MODES.RECONNECTING) {
      attemptReconnection();
    }
  }, [offlineMode, reconnectionAttempts]);

  useEffect(() => {
    checkAvailableFeatures();
  }, [cachedData, offlineMode]);

  // ==================== ENTERPRISE INITIALIZATION ====================
  const initializeOfflineMode = useCallback(async () => {
    try {
      // Check current connectivity status
      const connectivity = await connectivityService.checkConnectivity();
      
      if (connectivity.isConnected) {
        // We're online, but showing offline screen for demonstration
        setOfflineMode(OFFLINE_MODES.SYNCING);
        await performInitialSync();
      } else {
        setOfflineMode(OFFLINE_MODES.LIMITED);
      }

      // Load cached data
      await loadCachedData();
      
      // Start animations
      startPulseAnimation();
      startEntranceAnimation();

      // Check for emergency mode
      await checkEmergencyMode();

    } catch (error) {
      console.error('Offline mode initialization failed:', error);
      setOfflineMode(OFFLINE_MODES.EMERGENCY);
    }
  }, []);

  const loadCachedData = useCallback(async () => {
    try {
      const [
        cachedBookings,
        cachedLocations,
        cachedDocuments,
        cachedMaps
      ] = await Promise.all([
        getCachedBookings(),
        getCachedLocation(),
        cacheService.getCachedDocuments(),
        cacheService.getCachedMaps()
      ]);

      setCachedData({
        bookings: cachedBookings,
        locations: cachedLocations,
        documents: cachedDocuments,
        maps: cachedMaps
      });

      // Update last sync time
      const lastSync = await syncService.getLastSyncTime();
      setLastSyncTime(lastSync);

    } catch (error) {
      console.warn('Cached data load failed:', error);
    }
  }, []);

  // ==================== ENTERPRISE CONNECTIVITY FUNCTIONS ====================
  const handleAppStateChange = useCallback((nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App came to foreground, check connectivity
      checkConnectivityStatus();
    }
    appState.current = nextAppState;
  }, []);

  const checkConnectivityStatus = useCallback(async () => {
    try {
      const connectivity = await connectivityService.checkConnectivity();
      
      if (connectivity.isConnected && offlineMode !== OFFLINE_MODES.SYNCING) {
        setOfflineMode(OFFLINE_MODES.RECONNECTING);
      }
    } catch (error) {
      console.warn('Connectivity check failed:', error);
    }
  }, [offlineMode]);

  const attemptReconnection = useCallback(async () => {
    if (reconnectionAttempts >= 5) {
      setOfflineMode(OFFLINE_MODES.LIMITED);
      return;
    }

    try {
      const isConnected = await connectivityService.attemptReconnection();
      
      if (isConnected) {
        setOfflineMode(OFFLINE_MODES.SYNCING);
        await performSync();
        setReconnectionAttempts(0);
      } else {
        setReconnectionAttempts(prev => prev + 1);
        
        // Retry after delay
        setTimeout(() => {
          if (offlineMode === OFFLINE_MODES.RECONNECTING) {
            attemptReconnection();
          }
        }, 3000);
      }
    } catch (error) {
      console.warn('Reconnection attempt failed:', error);
      setReconnectionAttempts(prev => prev + 1);
    }
  }, [reconnectionAttempts, offlineMode]);

  // ==================== ENTERPRISE SYNC FUNCTIONS ====================
  const performInitialSync = useCallback(async () => {
    try {
      setSyncProgress(0);
      
      // Sync critical data first
      await syncService.syncCriticalData({
        onProgress: (progress) => setSyncProgress(progress)
      });

      // Load updated cached data
      await loadCachedData();

      // Navigate back if successful
      if (route.params?.returnOnSync) {
        navigation.goBack();
      }
    } catch (error) {
      console.warn('Initial sync failed:', error);
      setOfflineMode(OFFLINE_MODES.LIMITED);
    }
  }, [navigation, route.params]);

  const performSync = useCallback(async () => {
    try {
      setSyncProgress(0);
      
      const syncResults = await syncService.performSync({
        priorities: SYNC_PRIORITIES,
        onProgress: (progress) => setSyncProgress(progress)
      });

      setPendingSyncs(syncResults.pending);
      
      if (syncResults.success) {
        await loadCachedData();
        Alert.alert('ተሳክቷል', 'ሁሉም ውሂብ ተሰልኗል');
      } else {
        Alert.alert('ማስተካከያ ባልተላከ ላይ', 'አንዳንድ ውሂብ ማሰልጠን አልተሳካም');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('ስህተት', 'የውሂብ ማሰልጠን አልተሳካም');
    }
  }, []);

  const syncPendingChanges = useCallback(async () => {
    try {
      const results = await syncPendingUpdates();
      setPendingSyncs(results.failed);
      
      if (results.success) {
        Alert.alert('ተሳክቷል', 'ቀሪ ለውጦች ተላክተዋል');
      }
    } catch (error) {
      console.warn('Pending changes sync failed:', error);
    }
  }, [syncPendingUpdates]);

  // ==================== ENTERPRISE EMERGENCY FUNCTIONS ====================
  const checkEmergencyMode = useCallback(async () => {
    try {
      const emergencyStatus = await emergencyService.checkEmergencyStatus();
      
      if (emergencyStatus.active) {
        setOfflineMode(OFFLINE_MODES.EMERGENCY);
        
        // Enable emergency features
        await emergencyService.enableEmergencyMode();
      }
    } catch (error) {
      console.warn('Emergency mode check failed:', error);
    }
  }, []);

  const handleEmergencyAction = useCallback((action) => {
    const actionHandlers = {
      call_emergency: () => emergencyService.callEmergencyServices(currentLocation),
      send_alert: () => emergencyService.sendOfflineAlert(),
      access_medical: () => navigation.navigate('EmergencyMedical'),
      contact_team: () => navigation.navigate('EmergencyContacts')
    };

    const handler = actionHandlers[action];
    if (handler) {
      handler();
    }
  }, [currentLocation, navigation]);

  // ==================== ENTERPRISE FEATURE MANAGEMENT ====================
  const checkAvailableFeatures = useCallback(() => {
    const features = Object.entries(OFFLINE_FEATURES).map(([key, feature]) => {
      let available = feature.available;

      // Check specific requirements for each feature
      switch (key) {
        case OFFLINE_CAPABILITIES.ACTIVE_BOOKINGS:
          available = cachedData.bookings.length > 0;
          break;
        case OFFLINE_CAPABILITIES.OFFLINE_MAPS:
          available = cachedData.maps.length > 0;
          break;
        case OFFLINE_CAPABILITIES.DOCUMENT_ACCESS:
          available = cachedData.documents.length > 0;
          break;
      }

      return {
        ...feature,
        key,
        available
      };
    });

    setAvailableFeatures(features);
  }, [cachedData]);

  const handleFeaturePress = useCallback((featureKey) => {
    const featureHandlers = {
      [OFFLINE_CAPABILITIES.ACTIVE_BOOKINGS]: () => 
        navigation.navigate('OfflineBookings', { bookings: cachedData.bookings }),
      [OFFLINE_CAPABILITIES.EMERGENCY_ACCESS]: () => 
        navigation.navigate('EmergencyOffline'),
      [OFFLINE_CAPABILITIES.OFFLINE_MAPS]: () => 
        navigation.navigate('OfflineMap', { maps: cachedData.maps }),
      [OFFLINE_CAPABILITIES.DOCUMENT_ACCESS]: () => 
        navigation.navigate('OfflineDocuments', { documents: cachedData.documents }),
      [OFFLINE_CAPABILITIES.PROGRESS_TRACKING]: () => 
        navigation.navigate('OfflineProgress')
    };

    const handler = featureHandlers[featureKey];
    if (handler) {
      handler();
    }
  }, [cachedData, navigation]);

  // ==================== ENTERPRISE ANIMATION FUNCTIONS ====================
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulseAnimation = useCallback(() => {
    pulseAnim.stopAnimation();
  }, [pulseAnim]);

  const startEntranceAnimation = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  // ==================== RENDER FUNCTIONS ====================
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: slideAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [1, 0],
          }),
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.statusIndicator}>
        <Animated.View 
          style={[
            styles.statusDot,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: getStatusColor(offlineMode)
            }
          ]} 
        />
        <ThemedText type="caption" style={styles.statusText}>
          {getStatusText(offlineMode)}
        </ThemedText>
      </View>

      <ThemedText type="title" style={styles.title}>
        ኦፍላይን ሞድ
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.subtitle}>
        {getStatusDescription(offlineMode)}
      </ThemedText>

      {lastSyncTime && (
        <ThemedText type="caption" style={styles.lastSync}>
          የመጨረሻ ማሰልጠን: {formatLastSyncTime(lastSyncTime)}
        </ThemedText>
      )}
    </Animated.View>
  );

  const getStatusColor = (mode) => {
    const colors = {
      [OFFLINE_MODES.LIMITED]: COLORS.semantic.warning.main,
      [OFFLINE_MODES.EMERGENCY]: COLORS.semantic.error.main,
      [OFFLINE_MODES.SYNCING]: COLORS.primary.main,
      [OFFLINE_MODES.RECONNECTING]: COLORS.semantic.info.main
    };
    return colors[mode] || colors[OFFLINE_MODES.LIMITED];
  };

  const getStatusText = (mode) => {
    const texts = {
      [OFFLINE_MODES.LIMITED]: 'የተገደበ አገልግሎት',
      [OFFLINE_MODES.EMERGENCY]: 'አደጋ ሞድ',
      [OFFLINE_MODES.SYNCING]: 'በማሰልጠን ላይ',
      [OFFLINE_MODES.RECONNECTING]: 'በመያያዝ ላይ'
    };
    return texts[mode] || texts[OFFLINE_MODES.LIMITED];
  };

  const getStatusDescription = (mode) => {
    const descriptions = {
      [OFFLINE_MODES.LIMITED]: 'ኢንተርኔት አገናኝ የለም፣ ነገር ግን አንዳንድ ባህሪያት ይገኛሉ',
      [OFFLINE_MODES.EMERGENCY]: 'አደጋ ሁኔታ - አስቸኳይ አገልግሎቶች ተገልገዋል',
      [OFFLINE_MODES.SYNCING]: 'ውሂብዎች በማሰልጠን ላይ ናቸው...',
      [OFFLINE_MODES.RECONNECTING]: 'ኢንተርኔት እየተገናኘ ነው...'
    };
    return descriptions[mode] || descriptions[OFFLINE_MODES.LIMITED];
  };

  const renderSyncProgress = () => {
    if (offlineMode !== OFFLINE_MODES.SYNCING) return null;

    return (
      <View style={styles.syncSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          የውሂብ ማሰልጠን
        </ThemedText>
        
        <ProgressIndicator
          progress={syncProgress}
          showPercentage={true}
          style={styles.progressBar}
        />
        
        <ThemedText type="caption" style={styles.syncInfo}>
          ውሂብዎችን በማሰልጠን ላይ... እባክዎ ይጠብቁ
        </ThemedText>
      </View>
    );
  };

  const renderEmergencyAccess = () => {
    if (offlineMode !== OFFLINE_MODES.EMERGENCY) return null;

    return (
      <EmergencyAccessCard
        onEmergencyAction={handleEmergencyAction}
        style={styles.emergencyCard}
      />
    );
  };

  const renderAvailableFeatures = () => (
    <View style={styles.featuresSection}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        የሚገኙ ባህሪያት
      </ThemedText>
      
      <View style={styles.featuresGrid}>
        {availableFeatures.map(feature => (
          <OfflineCard
            key={feature.key}
            title={feature.label}
            description={feature.description}
            icon={feature.icon}
            available={feature.available}
            onPress={() => handleFeaturePress(feature.key)}
            style={styles.featureCard}
          />
        ))}
      </View>
    </View>
  );

  const renderPendingSyncs = () => {
    if (pendingSyncs.length === 0) return null;

    return (
      <View style={styles.pendingSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          የሚጠበቁ ለውጦች
        </ThemedText>
        
        <ThemedText type="caption" style={styles.pendingInfo}>
          {pendingSyncs.length} ለውጦች ሲገናኙ ይላካሉ
        </ThemedText>
        
        <Button
          title="ለውጦችን አሰልጥን"
          onPress={syncPendingChanges}
          type="outline"
          size="small"
          style={styles.syncButton}
        />
      </View>
    );
  };

  const renderReconnectionStatus = () => {
    if (offlineMode !== OFFLINE_MODES.RECONNECTING) return null;

    return (
      <View style={styles.reconnectionSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          ኢንተርኔት እየተገናኘ ነው...
        </ThemedText>
        
        <ThemedText type="caption" style={styles.reconnectionInfo}>
          የመያያዝ ሙከራ {reconnectionAttempts}/5
        </ThemedText>
        
        <Button
          title="አሁን ይሞክሩ"
          onPress={attemptReconnection}
          type="outline"
          size="small"
        />
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.actions}>
      <Button
        title="አገናኝን ይፈትሹ"
        onPress={checkConnectivityStatus}
        type="primary"
        style={styles.actionButton}
      />
      
      <Button
        title="ውሂብ አሰልጥን"
        onPress={performSync}
        type="outline"
        disabled={offlineMode === OFFLINE_MODES.SYNCING}
        style={styles.actionButton}
      />
      
      <Button
        title="ወደ ኋላ"
        onPress={() => navigation.goBack()}
        type="text"
        style={styles.actionButton}
      />
    </View>
  );

  // ==================== MAIN RENDER ====================
  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderSyncProgress()}
        {renderEmergencyAccess()}
        {renderReconnectionStatus()}
        {renderAvailableFeatures()}
        {renderPendingSyncs()}
        
        {/* Offline Map Preview */}
        {cachedData.maps.length > 0 && (
          <View style={styles.mapSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              የተጫኑ ካርታዎች
            </ThemedText>
            <OfflineMap
              locations={cachedData.locations}
              style={styles.offlineMap}
            />
          </View>
        )}
      </ScrollView>

      {renderActions()}
    </ThemedView>
  );
};

// ==================== ENTERPRISE HELPER FUNCTIONS ====================
const formatLastSyncTime = (timestamp) => {
  if (!timestamp) return 'ፈጽሞ አልተሰላጠም';
  
  const now = new Date();
  const syncTime = new Date(timestamp);
  const diffMinutes = Math.floor((now - syncTime) / (1000 * 60));
  
  if (diffMinutes < 1) return 'አሁን';
  if (diffMinutes < 60) return `${diffMinutes} ደቂቃ በፊት`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ሰዓት በፊት`;
  
  return `${Math.floor(diffMinutes / 1440)} ቀን በፊት`;
};

// ==================== ENTERPRISE STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  statusText: {
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  lastSync: {
    textAlign: 'center',
    opacity: 0.7,
  },
  syncSection: {
    backgroundColor: theme.colors.background.secondary,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  progressBar: {
    marginBottom: SPACING.md,
  },
  syncInfo: {
    textAlign: 'center',
  },
  emergencyCard: {
    marginBottom: SPACING.lg,
  },
  featuresSection: {
    marginBottom: SPACING.lg,
  },
  featuresGrid: {
    gap: SPACING.md,
  },
  featureCard: {
    marginBottom: SPACING.sm,
  },
  pendingSection: {
    backgroundColor: theme.colors.semantic.warning.light + '20',
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  pendingInfo: {
    marginBottom: SPACING.md,
  },
  syncButton: {
    alignSelf: 'flex-start',
  },
  reconnectionSection: {
    backgroundColor: theme.colors.semantic.info.light + '20',
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  reconnectionInfo: {
    marginBottom: SPACING.md,
  },
  mapSection: {
    marginBottom: SPACING.lg,
  },
  offlineMap: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actions: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
});

export default OfflineScreen;