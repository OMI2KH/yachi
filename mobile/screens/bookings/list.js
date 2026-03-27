/**
 * 🎯 ENTERPRISE BOOKINGS LIST SCREEN v3.0
 * 
 * Enhanced Features:
 * - AI-powered booking intelligence and insights
 * - Multi-role booking management (Client, Provider, Government)
 * - Real-time booking status tracking and updates
 * - Advanced filtering and search with Ethiopian context
 * - Construction project integration and management
 * - Smart notifications and alerts system
 * - Performance analytics and metrics
 * - Offline capability with sync
 * - TypeScript-first with enterprise patterns
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useBookings } from '../../hooks/use-bookings';
import { useNotifications } from '../../contexts/notification-context';
import { useAI } from '../../contexts/ai-matching-context';
import { 
  analyticsService, 
  bookingService, 
  notificationService,
  performanceService 
} from '../../services';

// Import Enterprise Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import BookingCard from '../../components/booking/booking-card';
import BookingFilters from '../../components/booking/booking-filters';
import EmptyState from '../../components/ui/empty-state';
import Loading from '../../components/ui/loading';
import AIIntelligencePanel from '../../components/ai/ai-intelligence-panel';
import QuickActions from '../../components/booking/quick-actions';
import PerformanceMetrics from '../../components/analytics/performance-metrics';
import EmergencyAlertBanner from '../../components/booking/emergency-alert-banner';

// Import Enterprise Constants
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/sizes';
import { BOOKING_STATUS, BOOKING_TYPES, BOOKING_PRIORITY } from '../../constants/booking';
import { USER_ROLES } from '../../constants/user';

// ==================== ENTERPRISE CONSTANTS ====================
const VIEW_TYPES = Object.freeze({
  GRID: 'grid',
  LIST: 'list',
  TIMELINE: 'timeline'
});

const FILTER_OPTIONS = Object.freeze({
  STATUS: [
    { value: 'all', label: 'ሁሉም', count: 0 },
    { value: BOOKING_STATUS.PENDING, label: 'በመጠባበቅ ላይ', color: COLORS.semantic.warning.main },
    { value: BOOKING_STATUS.CONFIRMED, label: 'ተረጋግጧል', color: COLORS.semantic.info.main },
    { value: BOOKING_STATUS.IN_PROGRESS, label: 'በሂደት ላይ', color: COLORS.primary.main },
    { value: BOOKING_STATUS.COMPLETED, label: 'ተጠናቅቋል', color: COLORS.semantic.success.main },
    { value: BOOKING_STATUS.CANCELLED, label: 'ተሰርዟል', color: COLORS.semantic.error.main }
  ],
  TYPE: [
    { value: 'all', label: 'ሁሉም አይነት' },
    { value: BOOKING_TYPES.STANDARD, label: 'መደበኛ', icon: '🔧' },
    { value: BOOKING_TYPES.CONSTRUCTION, label: 'ግንባታ', icon: '🏗️' },
    { value: BOOKING_TYPES.EMERGENCY, label: 'አደጋ', icon: '🚨' },
    { value: BOOKING_TYPES.GOVERNMENT, label: 'መንግሥት', icon: '🏛️' }
  ],
  PRIORITY: [
    { value: 'all', label: 'ሁሉም' },
    { value: BOOKING_PRIORITY.LOW, label: 'ዝቅተኛ', color: COLORS.semantic.success.main },
    { value: BOOKING_PRIORITY.NORMAL, label: 'መደበኛ', color: COLORS.semantic.info.main },
    { value: BOOKING_PRIORITY.HIGH, label: 'ከፍተኛ', color: COLORS.semantic.warning.main },
    { value: BOOKING_PRIORITY.URGENT, label: 'አስቸኳይ', color: COLORS.semantic.error.main }
  ]
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BookingsListScreen = ({ navigation, route }) => {
  // ==================== ENTERPRISE HOOKS ====================
  const { theme, isDark } = useTheme();
  const { user, hasRole, hasPermission } = useAuth();
  const { 
    bookings, 
    loading, 
    error,
    refreshBookings,
    updateBookingStatus,
    getBookingStats 
  } = useBookings();
  const { unreadCount, markAsRead } = useNotifications();
  const { getBookingInsights, analyzeBookingPatterns } = useAI();

  // ==================== ENTERPRISE STATE MANAGEMENT ====================
  const [viewType, setViewType] = useState(VIEW_TYPES.LIST);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    dateRange: 'all',
    region: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [aiInsights, setAiInsights] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);

  // Animation states
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const scrollY = useRef(new Animated.Value(0)).current;

  // ==================== ENTERPRISE EFFECTS ====================
  useEffect(() => {
    initializeBookingsList();
  }, []);

  useEffect(() => {
    if (route.params?.refresh) {
      handleRefresh();
    }
    
    if (route.params?.filter) {
      setFilters(prev => ({ ...prev, ...route.params.filter }));
    }
  }, [route.params]);

  useEffect(() => {
    loadAIInsights();
    loadPerformanceMetrics();
    checkEmergencyAlerts();
  }, [bookings, filters]);

  // ==================== ENTERPRISE INITIALIZATION ====================
  const initializeBookingsList = useCallback(async () => {
    try {
      performanceService.startMeasurement('bookings_list_initialization');
      
      trackScreenView('bookings_list');
      
      // Load initial data
      await Promise.all([
        refreshBookings(),
        loadAIInsights(),
        loadPerformanceMetrics()
      ]);

      // Start animations
      startEntranceAnimations();

      performanceService.endMeasurement('bookings_list_initialization');
      
    } catch (error) {
      console.error('Bookings list initialization failed:', error);
      Alert.alert('ስህተት', 'የቦቂንግ ዝርዝር መጫን አልተሳካም።');
    }
  }, []);

  const startEntranceAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ==================== ENTERPRISE DATA FUNCTIONS ====================
  const loadAIInsights = useCallback(async () => {
    try {
      const insights = await getBookingInsights({
        bookings: filteredBookings,
        filters,
        userRole: user?.role
      });
      
      setAiInsights(insights);
      
      analyticsService.trackEvent('ai_insights_loaded', {
        insightCount: Object.keys(insights).length,
        userRole: user?.role
      });
    } catch (error) {
      console.warn('AI insights load failed:', error);
    }
  }, [filteredBookings, filters, user]);

  const loadPerformanceMetrics = useCallback(async () => {
    try {
      const metrics = await getBookingStats();
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.warn('Performance metrics load failed:', error);
    }
  }, []);

  const checkEmergencyAlerts = useCallback(async () => {
    try {
      const alerts = await bookingService.getEmergencyAlerts();
      setEmergencyAlerts(alerts);
    } catch (error) {
      console.warn('Emergency alerts check failed:', error);
    }
  }, []);

  // ==================== ENTERPRISE FILTERING & SEARCH ====================
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id?.includes(searchQuery)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(booking => booking.status === filters.status);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(booking => booking.type === filters.type);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(booking => booking.priority === filters.priority);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filtered = filtered.filter(booking => 
            new Date(booking.preferredDate).toDateString() === now.toDateString()
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(booking => 
            new Date(booking.preferredDate) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(booking => 
            new Date(booking.preferredDate) >= filterDate
          );
          break;
      }
    }

    return filtered;
  }, [bookings, searchQuery, filters]);

  const bookingStats = useMemo(() => {
    const stats = {
      total: bookings.length,
      active: bookings.filter(b => 
        [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS].includes(b.status)
      ).length,
      completed: bookings.filter(b => b.status === BOOKING_STATUS.COMPLETED).length,
      urgent: bookings.filter(b => b.priority === BOOKING_PRIORITY.URGENT).length,
      construction: bookings.filter(b => b.type === BOOKING_TYPES.CONSTRUCTION).length
    };

    return stats;
  }, [bookings]);

  // ==================== ENTERPRISE ACTION HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      await refreshBookings();
      
      analyticsService.trackEvent('bookings_refreshed', {
        bookingCount: bookings.length,
        userRole: user?.role
      });
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshBookings, bookings.length, user]);

  const handleBookingPress = useCallback((booking) => {
    navigation.navigate('BookingDetail', { 
      id: booking.id,
      bookingData: booking 
    });
    
    analyticsService.trackEvent('booking_selected', {
      bookingId: booking.id,
      bookingType: booking.type,
      status: booking.status
    });
  }, [navigation]);

  const handleQuickAction = useCallback((action, booking = null) => {
    const actionHandlers = {
      create: () => navigation.navigate('CreateBooking'),
      filter: () => setShowFilters(true),
      emergency: () => navigation.navigate('CreateBooking', { 
        quickBook: { type: BOOKING_TYPES.EMERGENCY } 
      }),
      bulk: () => navigation.navigate('BulkOperations'),
      ai_optimize: () => handleAIOptimization()
    };

    const handler = actionHandlers[action];
    if (handler) {
      handler();
      
      analyticsService.trackEvent('quick_action_triggered', {
        action,
        context: booking ? 'single_booking' : 'global'
      });
    }
  }, [navigation]);

  const handleAIOptimization = useCallback(async () => {
    try {
      const optimization = await analyzeBookingPatterns(bookings);
      
      if (optimization.recommendations.length > 0) {
        Alert.alert(
          'AI ምክሮች',
          optimization.recommendations[0].message,
          [
            { text: 'ዝግ', style: 'cancel' },
            { 
              text: 'ተግብር', 
              onPress: () => applyAIOptimization(optimization.recommendations[0])
            }
          ]
        );
      }
    } catch (error) {
      console.warn('AI optimization failed:', error);
    }
  }, [bookings]);

  const applyAIOptimization = useCallback(async (recommendation) => {
    try {
      // Implement AI optimization logic based on recommendation type
      switch (recommendation.type) {
        case 'reschedule':
          await handleBulkReschedule(recommendation.bookings);
          break;
        case 'prioritize':
          await handleBulkPrioritize(recommendation.bookings);
          break;
        case 'team_reassignment':
          await handleTeamReassignment(recommendation.bookings);
          break;
      }
      
      analyticsService.trackEvent('ai_optimization_applied', {
        type: recommendation.type,
        affectedBookings: recommendation.bookings?.length || 0
      });
    } catch (error) {
      console.error('AI optimization application failed:', error);
    }
  }, []);

  const handleBulkAction = useCallback((action, bookingIds) => {
    const bulkActionHandlers = {
      cancel: () => handleBulkCancellation(bookingIds),
      reschedule: () => handleBulkReschedule(bookingIds),
      prioritize: () => handleBulkPrioritize(bookingIds),
      complete: () => handleBulkCompletion(bookingIds)
    };

    const handler = bulkActionHandlers[action];
    if (handler) {
      handler();
    }
  }, []);

  const handleBulkCancellation = useCallback(async (bookingIds) => {
    Alert.alert(
      'ግልጽ ማድረግ',
      `${bookingIds.size} ቦቂንጎችን ለማጥፋት እርግጠኛ ነዎት?`,
      [
        { text: 'ሰርዝ', style: 'cancel' },
        { 
          text: 'አጥፋ', 
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                Array.from(bookingIds).map(id => 
                  updateBookingStatus(id, BOOKING_STATUS.CANCELLED)
                )
              );
              
              setSelectedBookings(new Set());
              Alert.alert('ተሳክቷል', 'ቦቂንጎች ተሰርዘዋል።');
            } catch (error) {
              Alert.alert('ስህተት', 'የቦቂንግ ስረዛ አልተሳካም።');
            }
          }
        }
      ]
    );
  }, [updateBookingStatus]);

  // ==================== ENTERPRISE RENDER FUNCTIONS ====================
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.headerTop}>
        <ThemedText type="title" style={styles.title}>
          ቦቂንጎቼ
        </ThemedText>
        
        <View style={styles.headerActions}>
          <Button
            title="አዲስ"
            onPress={() => handleQuickAction('create')}
            type="primary"
            size="small"
            icon="add"
          />
          
          <Button
            title={showFilters ? "መሰረዝ" : "ማጣሪያ"}
            onPress={() => setShowFilters(!showFilters)}
            type="outline"
            size="small"
            icon="filter"
          />
        </View>
      </View>

      {/* Search Bar */}
      <Input
        placeholder="ቦቂንጎችን ይፈልጉ..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        icon="search"
        containerStyle={styles.searchBar}
      />

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            {bookingStats.active}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            ንቁ
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            {bookingStats.urgent}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            አስቸኳይ
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            {bookingStats.construction}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            ግንባታ
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            {bookingStats.completed}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            ተጠናቅቀዋል
          </ThemedText>
        </View>
      </View>

      {/* Emergency Alerts */}
      {emergencyAlerts.length > 0 && (
        <EmergencyAlertBanner
          alerts={emergencyAlerts}
          onAlertPress={(alert) => navigation.navigate('EmergencyDetail', { alertId: alert.id })}
          style={styles.emergencyBanner}
        />
      )}
    </Animated.View>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <BookingFilters
        filters={filters}
        onFiltersChange={setFilters}
        options={FILTER_OPTIONS}
        stats={bookingStats}
        onClose={() => setShowFilters(false)}
        style={styles.filtersPanel}
      />
    );
  };

  const renderAIInsights = () => {
    if (!aiInsights || !aiInsights.recommendations.length) return null;

    return (
      <AIIntelligencePanel
        insights={aiInsights}
        onInsightAction={applyAIOptimization}
        style={styles.aiPanel}
      />
    );
  };

  const renderQuickActions = () => (
    <QuickActions
      userRole={user?.role}
      onActionPress={handleQuickAction}
      selectedCount={selectedBookings.size}
      style={styles.quickActions}
    />
  );

  const renderBookingList = () => {
    if (loading && !refreshing) {
      return <Loading message="ቦቂንጎች በመጫን ላይ..." />;
    }

    if (error) {
      return (
        <EmptyState
          icon="❌"
          title="ስህተት"
          message="ቦቂንጎች መጫን አልተሳካም"
          action={{
            label: 'እንደገና ይሞክሩ',
            onPress: handleRefresh
          }}
        />
      );
    }

    if (filteredBookings.length === 0) {
      return (
        <EmptyState
          icon="📋"
          title="ቦቂንጎች የሉም"
          message={searchQuery || showFilters ? 
            "በአሁኑ ማጣሪያ ምንም ቦቂንግ አልተገኘም" :
            "አዲስ ቦቂንግ ለመፍጠር ከታች ያለውን ቁልፍ ይጫኑ"
          }
          action={{
            label: 'አዲስ ቦቂንግ',
            onPress: () => handleQuickAction('create')
          }}
        />
      );
    }

    return (
      <Animated.FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            }}
          >
            <BookingCard
              booking={item}
              onPress={() => handleBookingPress(item)}
              onAction={(action) => handleQuickAction(action, item)}
              selected={selectedBookings.has(item.id)}
              onSelect={(selected) => {
                const newSelected = new Set(selectedBookings);
                if (selected) {
                  newSelected.add(item.id);
                } else {
                  newSelected.delete(item.id);
                }
                setSelectedBookings(newSelected);
              }}
              viewType={viewType}
              style={styles.bookingCard}
            />
          </Animated.View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary.main]}
            tintColor={COLORS.primary.main}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      />
    );
  };

  const renderPerformanceMetrics = () => {
    if (!performanceMetrics || !hasRole([USER_ROLES.PROVIDER, USER_ROLES.BUSINESS])) {
      return null;
    }

    return (
      <PerformanceMetrics
        metrics={performanceMetrics}
        timeframe="monthly"
        style={styles.performanceMetrics}
      />
    );
  };

  // ==================== MAIN RENDER ====================
  return (
    <ThemedView style={styles.container}>
      {renderHeader()}
      {renderFilters()}
      {renderAIInsights()}
      {renderQuickActions()}
      
      <View style={styles.content}>
        {renderBookingList()}
        {renderPerformanceMetrics()}
      </View>

      {/* Bulk Actions Footer */}
      {selectedBookings.size > 0 && (
        <View style={styles.bulkActions}>
          <ThemedText type="caption">
            {selectedBookings.size} ቦቂንጎች ተመርጠዋል
          </ThemedText>
          
          <View style={styles.bulkButtons}>
            <Button
              title="ሰርዝ"
              onPress={() => handleBulkAction('cancel', selectedBookings)}
              type="outline"
              size="small"
              style={styles.bulkButton}
            />
            
            <Button
              title="አጠናቅቅ"
              onPress={() => handleBulkAction('complete', selectedBookings)}
              type="primary"
              size="small"
              style={styles.bulkButton}
            />
          </View>
        </View>
      )}
    </ThemedView>
  );
};

// ==================== ENTERPRISE STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchBar: {
    marginBottom: SPACING.lg,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  emergencyBanner: {
    marginTop: SPACING.md,
  },
  filtersPanel: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  aiPanel: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  quickActions: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  bookingCard: {
    marginBottom: SPACING.md,
  },
  performanceMetrics: {
    margin: SPACING.lg,
    marginTop: 0,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  bulkButton: {
    minWidth: 80,
  },
});

export default BookingsListScreen;