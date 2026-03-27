// app/(bookings)/history.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
  InteractionManager,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useLoading } from '../../../contexts/loading-context';
import { bookingService } from '../../../services/booking-service';
import { analyticsService } from '../../../services/analytics-service';
import { errorService } from '../../../services/error-service';
import { storage } from '../../../utils/storage';

// Components
import BookingHistoryList from '../../../components/booking/history/booking-history-list';
import BookingStats from '../../../components/booking/history/booking-stats';
import FilterBar from '../../../components/booking/history/filter-bar';
import SearchHeader from '../../../components/booking/history/search-header';
import EmptyState from '../../../components/ui/empty-state';
import LoadingScreen from '../../../components/ui/loading';
import ErrorScreen from '../../../components/ui/error-screen';
import RetryButton from '../../../components/ui/retry-button';
import SegmentedControl from '../../../components/ui/segmented-control';
import PullToRefresh from '../../../components/ui/pull-to-refresh';

// Constants
import { 
  BOOKING_STATUS, 
  BOOKING_FILTERS, 
  SORT_OPTIONS,
  HISTORY_PAGE_SIZE 
} from '../../../constants/booking';

const { width, height } = Dimensions.get('window');

export default function BookingHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    totalSpent: 0,
  });

  // Filters and search
  const [activeFilter, setActiveFilter] = useState(BOOKING_FILTERS.ALL);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.RECENT);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef();
  const mountedRef = useRef(true);

  // Animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Load booking history
  const loadBookings = useCallback(async (page = 1, isRefresh = false) => {
    if (!mountedRef.current) return;

    try {
      if (page === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const filters = buildFilters();
      const result = await bookingService.getUserBookings({
        page,
        limit: HISTORY_PAGE_SIZE,
        filters,
        sort: sortBy,
        search: searchQuery,
        userId: user.id,
        userRole: user.role,
      });

      if (!mountedRef.current) return;

      if (result.success) {
        if (page === 1) {
          setBookings(result.data.bookings);
          setTotalCount(result.data.totalCount);
        } else {
          setBookings(prev => [...prev, ...result.data.bookings]);
        }

        setHasMore(result.data.hasMore);
        setCurrentPage(page);

        // Update stats
        if (page === 1) {
          setStats(result.data.stats || stats);
        }

        // Cache the data
        if (page === 1 && isRefresh) {
          await storage.setItem(`bookings_${user.id}`, {
            bookings: result.data.bookings,
            stats: result.data.stats,
            timestamp: Date.now(),
          });
        }

        // Track analytics
        analyticsService.trackEvent('booking_history_loaded', {
          page,
          filter: activeFilter,
          sort: sortBy,
          itemCount: result.data.bookings.length,
          totalCount: result.data.totalCount,
        });

      } else {
        throw new Error(result.message || 'Failed to load bookings');
      }

    } catch (err) {
      console.error('Error loading booking history:', err);
      
      if (mountedRef.current) {
        setError(err.message);
        
        errorService.captureError(err, {
          context: 'BookingHistory',
          page,
          filters: buildFilters(),
          userId: user?.id,
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [activeFilter, sortBy, searchQuery, dateRange, user]);

  // Build filter object for API
  const buildFilters = () => {
    const filters = {};

    // Status filter
    if (activeFilter !== BOOKING_FILTERS.ALL) {
      filters.status = activeFilter;
    }

    // Date range filter
    if (dateRange.startDate && dateRange.endDate) {
      filters.dateRange = {
        start: dateRange.startDate.toISOString(),
        end: dateRange.endDate.toISOString(),
      };
    }

    // Role-specific filters
    if (user.role === 'client') {
      filters.clientId = user.id;
    } else if (user.role === 'worker') {
      filters.workerId = user.id;
    }

    return filters;
  };

  // Initial load
  useEffect(() => {
    mountedRef.current = true;

    // Load cached data first for better UX
    loadCachedData().then(() => {
      // Then load fresh data
      InteractionManager.runAfterInteractions(() => {
        loadBookings(1);
      });
    });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load cached data
  const loadCachedData = async () => {
    try {
      const cached = await storage.getItem(`bookings_${user.id}`);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
        setBookings(cached.bookings);
        setStats(cached.stats);
      }
    } catch (error) {
      console.error('Error loading cached bookings:', error);
    }
  };

  // Refresh data when filters change
  useEffect(() => {
    if (!loading) {
      handleRefresh();
    }
  }, [activeFilter, sortBy, dateRange]);

  // Apply search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading) {
        handleRefresh();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter and sort bookings locally for immediate feedback
  useEffect(() => {
    if (bookings.length > 0) {
      const filtered = applyLocalFilters(bookings);
      setFilteredBookings(filtered);
    }
  }, [bookings, activeFilter, sortBy, searchQuery]);

  const applyLocalFilters = (bookingsList) => {
    let filtered = [...bookingsList];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(booking => 
        booking.service?.title?.toLowerCase().includes(query) ||
        booking.service?.category?.toLowerCase().includes(query) ||
        booking.id?.toLowerCase().includes(query) ||
        (user.role === 'client' 
          ? booking.worker?.name?.toLowerCase().includes(query)
          : booking.client?.name?.toLowerCase().includes(query)
        )
      );
    }

    // Apply status filter
    if (activeFilter !== BOOKING_FILTERS.ALL) {
      filtered = filtered.filter(booking => booking.status === activeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.RECENT:
          return new Date(b.createdAt) - new Date(a.createdAt);
        case SORT_OPTIONS.OLDEST:
          return new Date(a.createdAt) - new Date(b.createdAt);
        case SORT_OPTIONS.PRICE_HIGH:
          return (b.payment?.amount || 0) - (a.payment?.amount || 0);
        case SORT_OPTIONS.PRICE_LOW:
          return (a.payment?.amount || 0) - (b.payment?.amount || 0);
        case SORT_OPTIONS.DATE_ASC:
          return new Date(a.scheduledDate) - new Date(b.scheduledDate);
        case SORT_OPTIONS.DATE_DESC:
          return new Date(b.scheduledDate) - new Date(a.scheduledDate);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Handlers
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    loadBookings(1, true);
  }, [loadBookings]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !error) {
      loadBookings(currentPage + 1);
    }
  }, [loadingMore, hasMore, currentPage, loadBookings]);

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
    analyticsService.trackEvent('booking_filter_changed', { filter });
  }, []);

  const handleSortChange = useCallback((sort) => {
    setSortBy(sort);
    analyticsService.trackEvent('booking_sort_changed', { sort });
  }, []);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleDateRangeChange = useCallback((range) => {
    setDateRange(range);
  }, []);

  const handleBookingPress = useCallback((booking) => {
    router.push(`/(bookings)/${booking.id}`);
    analyticsService.trackEvent('booking_history_item_clicked', {
      bookingId: booking.id,
      status: booking.status,
    });
  }, [router]);

  const handleRetry = useCallback(() => {
    setError(null);
    loadBookings(1);
  }, [loadBookings]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const handleScrollEnd = useCallback(() => {
    // Load more when near bottom
    if (scrollViewRef.current) {
      scrollViewRef.current.measure((x, y, width, height, pageX, pageY) => {
        const contentHeight = height;
        const offset = scrollY.__getValue();
        
        if (contentHeight - offset - height < 200) { // 200px from bottom
          handleLoadMore();
        }
      });
    }
  }, [handleLoadMore]);

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;

    const emptyConfig = {
      [BOOKING_FILTERS.ALL]: {
        icon: '📋',
        title: 'No Bookings Yet',
        message: 'Your booking history will appear here once you start using Yachi.',
        action: {
          label: 'Find Services',
          onPress: () => router.push('/(tabs)/explore'),
        },
      },
      [BOOKING_FILTERS.PENDING]: {
        icon: '⏳',
        title: 'No Pending Bookings',
        message: "You don't have any pending bookings at the moment.",
      },
      [BOOKING_FILTERS.COMPLETED]: {
        icon: '✅',
        title: 'No Completed Bookings',
        message: 'Completed bookings will appear here once services are finished.',
      },
      [BOOKING_FILTERS.CANCELLED]: {
        icon: '❌',
        title: 'No Cancelled Bookings',
        message: "That's great! You haven't cancelled any bookings.",
      },
    };

    const config = emptyConfig[activeFilter] || emptyConfig[BOOKING_FILTERS.ALL];

    return (
      <EmptyState
        icon={config.icon}
        title={config.title}
        message={config.message}
        action={config.action}
        theme={theme}
      />
    );
  };

  if (loading && bookings.length === 0) {
    return <LoadingScreen message="Loading your booking history..." />;
  }

  if (error && bookings.length === 0) {
    return (
      <ErrorScreen
        message={error}
        onRetry={handleRetry}
        retryButton={<RetryButton onPress={handleRetry} />}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Booking History',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 16,
          },
        }}
      />

      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Sticky Header */}
        <Animated.View 
          style={[
            styles.stickyHeader,
            {
              backgroundColor: theme.colors.background,
              opacity: headerOpacity,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <SearchHeader
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            theme={theme}
          />
        </Animated.View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
              progressViewOffset={Platform.OS === 'android' ? 60 : 0}
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Section */}
          {bookings.length > 0 && (
            <BookingStats
              stats={stats}
              activeFilter={activeFilter}
              theme={theme}
            />
          )}

          {/* Filter Bar */}
          <FilterBar
            activeFilter={activeFilter}
            sortBy={sortBy}
            dateRange={dateRange}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onDateRangeChange={handleDateRangeChange}
            theme={theme}
          />

          {/* Segmented Control for Mobile */}
          {Platform.OS !== 'web' && (
            <View style={styles.segmentedContainer}>
              <SegmentedControl
                segments={[
                  { label: 'All', value: BOOKING_FILTERS.ALL },
                  { label: 'Pending', value: BOOKING_FILTERS.PENDING },
                  { label: 'Completed', value: BOOKING_FILTERS.COMPLETED },
                  { label: 'Cancelled', value: BOOKING_FILTERS.CANCELLED },
                ]}
                selectedValue={activeFilter}
                onValueChange={handleFilterChange}
                theme={theme}
              />
            </View>
          )}

          {/* Booking List */}
          {filteredBookings.length > 0 ? (
            <BookingHistoryList
              bookings={filteredBookings}
              onBookingPress={handleBookingPress}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
              hasMore={hasMore}
              userRole={user.role}
              theme={theme}
            />
          ) : (
            renderEmptyState()
          )}

          {/* Loading More Indicator */}
          {loadingMore && (
            <View style={styles.loadingMoreContainer}>
              <LoadingScreen 
                message="Loading more bookings..." 
                size="small"
              />
            </View>
          )}
        </ScrollView>

        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Platform.OS === 'ios' ? 120 : 80,
    paddingBottom: 20,
    minHeight: height - 100,
  },
  segmentedContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  loadingMoreContainer: {
    padding: 20,
  },
});