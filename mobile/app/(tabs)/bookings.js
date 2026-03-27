import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Alert,
  SectionList,
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
import Input, { SearchInput } from '../../components/ui/input';
import Loading from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import BookingCard from '../../components/booking/booking-card';
import BookingTimeline from '../../components/booking/booking-timeline';
import { Collapsible } from '../../components/collapsible';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { bookingService } from '../../services/booking-service';

// Booking status types
export const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// Booking tabs
const BOOKING_TABS = [
  { id: 'upcoming', label: 'Upcoming', statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
  { id: 'completed', label: 'Completed', statuses: [BookingStatus.COMPLETED] },
  { id: 'cancelled', label: 'Cancelled', statuses: [BookingStatus.CANCELLED, BookingStatus.EXPIRED] },
  { id: 'all', label: 'All', statuses: Object.values(BookingStatus) },
];

// Mock bookings data - replace with API
const MOCK_BOOKINGS = [
  {
    id: '1',
    service: {
      id: '1',
      title: 'Deep Home Cleaning',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
      category: 'cleaning',
    },
    provider: {
      id: '1',
      name: 'SparkleClean Pro',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
      rating: 4.9,
      verified: true,
    },
    date: '2024-01-15T10:00:00Z',
    duration: 3, // hours
    totalAmount: 89,
    status: BookingStatus.CONFIRMED,
    address: '123 Main St, New York, NY 10001',
    specialInstructions: 'Please focus on kitchen and bathrooms',
    createdAt: '2024-01-10T14:30:00Z',
    updatedAt: '2024-01-12T09:15:00Z',
    timeline: [
      { status: 'requested', timestamp: '2024-01-10T14:30:00Z', description: 'Booking requested' },
      { status: 'confirmed', timestamp: '2024-01-11T10:15:00Z', description: 'Booking confirmed by provider' },
    ],
  },
  {
    id: '2',
    service: {
      id: '2',
      title: 'Emergency Plumbing',
      image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4',
      category: 'repair',
    },
    provider: {
      id: '2',
      name: 'FixIt Masters',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      rating: 4.8,
      verified: true,
    },
    date: '2024-01-16T14:00:00Z',
    duration: 2,
    totalAmount: 120,
    status: BookingStatus.PENDING,
    address: '123 Main St, New York, NY 10001',
    specialInstructions: 'Kitchen sink is leaking under counter',
    createdAt: '2024-01-14T16:45:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
    timeline: [
      { status: 'requested', timestamp: '2024-01-14T16:45:00Z', description: 'Booking requested' },
    ],
  },
  {
    id: '3',
    service: {
      id: '3',
      title: 'AC Installation',
      image: 'https://images.unsplash.com/photo-1581993192008-63fd1ea7de1a',
      category: 'installation',
    },
    provider: {
      id: '3',
      name: 'CoolAir Experts',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786',
      rating: 4.7,
      verified: true,
    },
    date: '2024-01-12T09:00:00Z',
    duration: 6,
    totalAmount: 450,
    status: BookingStatus.COMPLETED,
    address: '123 Main St, New York, NY 10001',
    specialInstructions: 'Install in living room, old unit removal included',
    createdAt: '2024-01-08T11:20:00Z',
    updatedAt: '2024-01-12T17:30:00Z',
    rating: 5,
    review: 'Excellent service! The team was professional and efficient.',
    timeline: [
      { status: 'requested', timestamp: '2024-01-08T11:20:00Z', description: 'Booking requested' },
      { status: 'confirmed', timestamp: '2024-01-09T08:45:00Z', description: 'Booking confirmed' },
      { status: 'in_progress', timestamp: '2024-01-12T09:15:00Z', description: 'Service started' },
      { status: 'completed', timestamp: '2024-01-12T15:30:00Z', description: 'Service completed' },
    ],
  },
  {
    id: '4',
    service: {
      id: '5',
      title: 'Professional Manicure',
      image: 'https://images.unsplash.com/photo-1607778833979-4a87d896a76b',
      category: 'beauty',
    },
    provider: {
      id: '5',
      name: 'Nail Studio Elite',
      avatar: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1bf',
      rating: 4.9,
      verified: true,
    },
    date: '2024-01-18T15:00:00Z',
    duration: 1.5,
    totalAmount: 45,
    status: BookingStatus.IN_PROGRESS,
    address: '456 Beauty Ave, New York, NY 10002',
    specialInstructions: 'French manicure with gel polish',
    createdAt: '2024-01-15T12:30:00Z',
    updatedAt: '2024-01-18T15:10:00Z',
    timeline: [
      { status: 'requested', timestamp: '2024-01-15T12:30:00Z', description: 'Booking requested' },
      { status: 'confirmed', timestamp: '2024-01-15T14:20:00Z', description: 'Booking confirmed' },
      { status: 'in_progress', timestamp: '2024-01-18T15:10:00Z', description: 'Service in progress' },
    ],
  },
  {
    id: '5',
    service: {
      id: '6',
      title: 'Personal Training',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
      category: 'fitness',
    },
    provider: {
      id: '6',
      name: 'FitLife Coaches',
      avatar: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
      rating: 4.8,
      verified: true,
    },
    date: '2024-01-20T18:00:00Z',
    duration: 1,
    totalAmount: 75,
    status: BookingStatus.CANCELLED,
    address: '789 Fitness St, New York, NY 10003',
    cancellationReason: 'Client schedule conflict',
    createdAt: '2024-01-16T10:15:00Z',
    updatedAt: '2024-01-17T11:30:00Z',
    timeline: [
      { status: 'requested', timestamp: '2024-01-16T10:15:00Z', description: 'Booking requested' },
      { status: 'confirmed', timestamp: '2024-01-16T14:45:00Z', description: 'Booking confirmed' },
      { status: 'cancelled', timestamp: '2024-01-17T11:30:00Z', description: 'Booking cancelled' },
    ],
  },
];

export default function BookingsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState(MOCK_BOOKINGS);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadBookings();
      startAnimations();
      
      // Track screen view
      analyticsService.trackScreenView('bookings', {
        user_id: user?.id,
        active_tab: activeTab,
      });

      return () => {
        // Cleanup if needed
      };
    }, [user, activeTab])
  );

  // Filter bookings when criteria change
  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [bookings, activeTab, searchQuery]);

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
    ]).start();
  };

  // Tab change animation
  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: BOOKING_TABS.findIndex(tab => tab.id === activeTab),
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  // Load bookings data
  const loadBookings = async () => {
    try {
      const bookingsData = await bookingService.getUserBookings(user.id);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading bookings:', error);
      errorService.captureError(error, { context: 'BookingsScreen' });
    }
  };

  // Apply filters to bookings
  const applyFilters = () => {
    let filtered = [...bookings];

    // Filter by active tab statuses
    const activeTabConfig = BOOKING_TABS.find(tab => tab.id === activeTab);
    if (activeTabConfig) {
      filtered = filtered.filter(booking => 
        activeTabConfig.statuses.includes(booking.status)
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredBookings(filtered);
  };

  // Calculate booking statistics
  const calculateStats = () => {
    const stats = {
      upcoming: bookings.filter(b => 
        [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS].includes(b.status)
      ).length,
      completed: bookings.filter(b => b.status === BookingStatus.COMPLETED).length,
      cancelled: bookings.filter(b => 
        [BookingStatus.CANCELLED, BookingStatus.EXPIRED].includes(b.status)
      ).length,
      total: bookings.length,
    };
    setStats(stats);
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBookings();
      analyticsService.trackEvent('bookings_refresh', {
        active_tab: activeTab,
      });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab]);

  // Navigation handlers
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    analyticsService.trackEvent('bookings_tab_change', {
      from_tab: activeTab,
      to_tab: tabId,
    });
  };

  const handleBookingPress = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
    analyticsService.trackEvent('booking_select', {
      booking_id: booking.id,
      status: booking.status,
    });
  };

  const handleBookingAction = async (booking, action) => {
    try {
      showLoading(`Processing ${action}...`);

      let result;
      switch (action) {
        case 'cancel':
          result = await handleCancelBooking(booking);
          break;
        case 'reschedule':
          result = await handleRescheduleBooking(booking);
          break;
        case 'message':
          result = await handleMessageProvider(booking);
          break;
        case 'rate':
          result = await handleRateBooking(booking);
          break;
        default:
          console.warn('Unknown booking action:', action);
      }

      if (result) {
        await loadBookings(); // Refresh data
      }

    } catch (error) {
      console.error('Booking action error:', error);
      errorService.captureError(error, { 
        context: 'BookingAction',
        action,
        booking_id: booking.id,
      });
    } finally {
      hideLoading();
    }
  };

  const handleCancelBooking = async (booking) => {
    if (booking.status === BookingStatus.IN_PROGRESS) {
      Alert.alert(
        'Cannot Cancel',
        'This service is already in progress. Please contact the provider directly.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking?',
        [
          { text: 'Keep Booking', style: 'cancel' },
          {
            text: 'Cancel Booking',
            style: 'destructive',
            onPress: async () => {
              try {
                await bookingService.cancelBooking(booking.id);
                analyticsService.trackEvent('booking_cancelled', {
                  booking_id: booking.id,
                  service: booking.service.title,
                });
                Alert.alert('Booking Cancelled', 'Your booking has been successfully cancelled.');
                resolve(true);
              } catch (error) {
                Alert.alert('Cancellation Failed', 'Unable to cancel booking. Please try again.');
                resolve(false);
              }
            },
          },
        ]
      );
    });
  };

  const handleRescheduleBooking = async (booking) => {
    router.push({
      pathname: '/(bookings)/reschedule',
      params: { bookingId: booking.id },
    });
    return true;
  };

  const handleMessageProvider = async (booking) => {
    router.push({
      pathname: '/(messages)/conversation',
      params: { providerId: booking.provider.id, bookingId: booking.id },
    });
    return true;
  };

  const handleRateBooking = async (booking) => {
    router.push({
      pathname: '/(bookings)/rate',
      params: { bookingId: booking.id },
    });
    return true;
  };

  const handleCreateBooking = () => {
    analyticsService.trackEvent('create_booking_click');
    router.push('/(services)/search');
  };

  // Group bookings by date for section list
  const getGroupedBookings = () => {
    const groups = {};
    
    filteredBookings.forEach(booking => {
      const date = new Date(booking.date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(booking);
    });

    return Object.entries(groups).map(([date, data]) => ({
      title: date,
      data,
    }));
  };

  // Render header with stats and search
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statNumber}>
            {stats.upcoming}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            Upcoming
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statNumber}>
            {stats.completed}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            Completed
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statNumber}>
            {stats.total}
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            Total
          </ThemedText>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search bookings..."
          returnKeyType="search"
          style={styles.searchInput}
        />
        <IconButton
          icon="📅"
          onPress={handleCreateBooking}
          accessibilityLabel="Create New Booking"
        />
      </View>
    </Animated.View>
  );

  // Render tab navigation
  const renderTabs = () => {
    const tabWidth = 100;
    const indicatorLeft = tabAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3],
    });

    return (
      <Animated.View style={[styles.tabsContainer, { opacity: fadeAnim }]}>
        <View style={styles.tabs}>
          {BOOKING_TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive,
              ]}
              onPress={() => handleTabChange(tab.id)}
            >
              <ThemedText
                type="default"
                style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Active indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              left: indicatorLeft,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </Animated.View>
    );
  };

  // Render booking list
  const renderBookings = () => {
    if (filteredBookings.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyIcon, { fontSize: 64 }]}>
            {activeTab === 'upcoming' ? '📅' : activeTab === 'completed' ? '✅' : '❌'}
          </ThemedText>
          <ThemedText type="title" style={styles.emptyTitle}>
            {getEmptyStateTitle()}
          </ThemedText>
          <ThemedText type="default" style={styles.emptyDescription}>
            {getEmptyStateDescription()}
          </ThemedText>
          {activeTab === 'upcoming' && (
            <PrimaryButton
              title="Book a Service"
              onPress={handleCreateBooking}
              style={styles.emptyButton}
            />
          )}
        </View>
      );
    }

    const groupedBookings = getGroupedBookings();

    return (
      <SectionList
        sections={groupedBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <BookingCard
              booking={item}
              onPress={() => handleBookingPress(item)}
              onAction={(action) => handleBookingAction(item, action)}
            />
          </Animated.View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <ThemedText type="subtitle" style={styles.sectionHeader}>
            {new Date(title).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </ThemedText>
        )}
        contentContainerStyle={styles.bookingsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    );
  };

  // Helper functions for empty states
  const getEmptyStateTitle = () => {
    switch (activeTab) {
      case 'upcoming': return 'No Upcoming Bookings';
      case 'completed': return 'No Completed Bookings';
      case 'cancelled': return 'No Cancelled Bookings';
      default: return 'No Bookings Found';
    }
  };

  const getEmptyStateDescription = () => {
    switch (activeTab) {
      case 'upcoming': return 'Book your first service to see upcoming appointments here.';
      case 'completed': return 'Completed bookings will appear here for your records.';
      case 'cancelled': return 'Cancelled and expired bookings will appear here.';
      default: return 'Try changing your search or filters.';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'My Bookings',
          headerShown: true,
        }} 
      />

      {/* Header Section */}
      {renderHeader()}

      {/* Tab Navigation */}
      {renderTabs()}

      {/* Bookings List */}
      {renderBookings()}

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Booking Details</ThemedText>
              <IconButton
                icon="✕"
                onPress={() => setShowBookingDetails(false)}
                accessibilityLabel="Close Details"
              />
            </View>
            
            <ScrollView style={styles.modalBody}>
              <BookingTimeline
                booking={selectedBooking}
                onAction={(action) => {
                  handleBookingAction(selectedBooking, action);
                  setShowBookingDetails(false);
                }}
              />
            </ScrollView>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    opacity: 0.7,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 100,
    height: 3,
    borderRadius: 2,
  },
  bookingsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 160,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalBody: {
    maxHeight: 400,
  },
};

// Make styles compatible with StyleSheet
const StyleSheet = {
  absoluteFillObject: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ...styles,
};