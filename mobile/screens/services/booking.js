import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { useBookings } from '../../../hooks/use-bookings';
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
  Input 
} from '../../../components/ui/input';
import { 
  Badge 
} from '../../../components/ui/badge';
import { 
  BookingCard 
} from '../../../components/booking/booking-card';
import { 
  BookingActions 
} from '../../../components/booking/booking-actions';
import { 
  BookingStatus 
} from '../../../components/booking/booking-status';
import { 
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  bookingService 
} from '../../../services/booking-service';
import { 
  notificationService 
} from '../../../services/notification-service';
import { 
  paymentService 
} from '../../../services/payment-service';

/**
 * Enterprise-level Bookings Management Screen
 * Features: Multi-role booking management, real-time updates, AI scheduling, payment integration
 */
const ServiceBookingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  const { 
    bookings, 
    refreshBookings, 
    updateBookingStatus,
    cancelBooking 
  } = useBookings();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [bookingStats, setBookingStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
  });

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ServiceBookings');
    }, [])
  );

  // Load bookings data
  const loadBookingsData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      await refreshBookings();
      
      // Load booking statistics based on user role
      const stats = await bookingService.getBookingStats(user?.id, user?.role);
      setBookingStats(stats);
      
      analyticsService.trackEvent('bookings_loaded', {
        userId: user?.id,
        userRole: user?.role,
        bookingCount: bookings.length,
        pendingBookings: stats.pending,
        totalRevenue: stats.revenue,
      });
    } catch (error) {
      console.error('Error loading bookings:', error);
      showError('Failed to load bookings');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.role, bookings.length, refreshBookings]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadBookingsData();
    }, [loadBookingsData])
  );

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.service?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.provider?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.scheduledDate);
            return bookingDate.toDateString() === today.toDateString();
          });
          break;
        case 'upcoming':
          filtered = filtered.filter(booking => new Date(booking.scheduledDate) > today);
          break;
        case 'past':
          filtered = filtered.filter(booking => new Date(booking.scheduledDate) < today);
          break;
        case 'week':
          const weekLater = new Date(today);
          weekLater.setDate(today.getDate() + 7);
          filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.scheduledDate);
            return bookingDate >= today && bookingDate <= weekLater;
          });
          break;
        default:
          break;
      }
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return filtered;
  }, [bookings, searchQuery, statusFilter, dateFilter]);

  // Handle booking status update
  const handleStatusUpdate = async (bookingId, newStatus, notes = '') => {
    try {
      await updateBookingStatus(bookingId, newStatus, notes);
      
      analyticsService.trackEvent('booking_status_updated', {
        userId: user?.id,
        bookingId: bookingId,
        newStatus: newStatus,
        userRole: user?.role,
      });
      
      showSuccess(`Booking ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      showError('Failed to update booking status');
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId, reason = '') => {
    try {
      await cancelBooking(bookingId, reason);
      
      analyticsService.trackEvent('booking_cancelled', {
        userId: user?.id,
        bookingId: bookingId,
        cancellationReason: reason,
        userRole: user?.role,
      });
      
      showSuccess('Booking cancelled successfully');
      setShowCancelModal(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showError('Failed to cancel booking');
    }
  };

  // Handle booking reschedule
  const handleRescheduleBooking = async (bookingId, newDate, newTime) => {
    try {
      await bookingService.rescheduleBooking(bookingId, newDate, newTime);
      
      // Refresh data
      await loadBookingsData();
      
      analyticsService.trackEvent('booking_rescheduled', {
        userId: user?.id,
        bookingId: bookingId,
        newDate: newDate,
        newTime: newTime,
        userRole: user?.role,
      });
      
      showSuccess('Booking rescheduled successfully');
      setShowRescheduleModal(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      showError('Failed to reschedule booking');
    }
  };

  // Handle payment processing
  const handleProcessPayment = async (bookingId) => {
    try {
      const paymentUrl = await paymentService.processBookingPayment(bookingId);
      
      analyticsService.trackEvent('booking_payment_initiated', {
        userId: user?.id,
        bookingId: bookingId,
        userRole: user?.role,
      });
      
      // Navigate to payment screen
      router.push(`/(payment)/confirmation?bookingId=${bookingId}`);
    } catch (error) {
      console.error('Error processing payment:', error);
      showError('Failed to process payment');
    }
  };

  // Handle booking completion
  const handleCompleteBooking = async (bookingId, rating, review) => {
    try {
      await bookingService.completeBooking(bookingId, rating, review);
      
      // Refresh data
      await loadBookingsData();
      
      analyticsService.trackEvent('booking_completed', {
        userId: user?.id,
        bookingId: bookingId,
        rating: rating,
        userRole: user?.role,
      });
      
      showSuccess('Booking completed successfully');
    } catch (error) {
      console.error('Error completing booking:', error);
      showError('Failed to complete booking');
    }
  };

  // Handle quick actions based on user role
  const handleQuickAction = (action, booking) => {
    setSelectedBooking(booking);
    
    switch (action) {
      case 'view':
        router.push(`/(bookings)/${booking.id}`);
        break;
      case 'cancel':
        setShowCancelModal(true);
        break;
      case 'reschedule':
        setShowRescheduleModal(true);
        break;
      case 'pay':
        handleProcessPayment(booking.id);
        break;
      case 'start':
        handleStatusUpdate(booking.id, 'in_progress');
        break;
      case 'complete':
        handleStatusUpdate(booking.id, 'completed');
        break;
      case 'message':
        router.push(`/messages/${booking.chatId}`);
        break;
      default:
        break;
    }
  };

  // Handle create new booking
  const handleCreateBooking = () => {
    analyticsService.trackEvent('create_booking_initiated', { userId: user?.id });
    router.push('/(bookings)/create');
  };

  // Handle AI scheduling suggestions
  const handleAIScheduling = async () => {
    try {
      const suggestions = await bookingService.getAISchedulingSuggestions(user?.id);
      
      analyticsService.trackEvent('ai_scheduling_accessed', {
        userId: user?.id,
        suggestionCount: suggestions.length,
      });
      
      if (suggestions.length > 0) {
        router.push('/(services)/ai-matching-service');
      } else {
        showError('No AI scheduling suggestions available');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      showError('Failed to get scheduling suggestions');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#eab308';
      case 'confirmed': return '#0ea5e9';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return '#22c55e';
      case 'cancelled': return '#ef4444';
      case 'payment_pending': return '#f97316';
      default: return '#6b7280';
    }
  };

  // Render booking statistics
  const renderBookingStats = () => (
    <Card style={styles.statsCard}>
      <ThemedText style={styles.statsTitle}>
        Booking Overview
      </ThemedText>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{bookingStats.total}</ThemedText>
          <ThemedText style={styles.statLabel}>Total</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{bookingStats.pending}</ThemedText>
          <ThemedText style={styles.statLabel}>Pending</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{bookingStats.confirmed}</ThemedText>
          <ThemedText style={styles.statLabel}>Confirmed</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{bookingStats.inProgress}</ThemedText>
          <ThemedText style={styles.statLabel}>In Progress</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{bookingStats.completed}</ThemedText>
          <ThemedText style={styles.statLabel}>Completed</ThemedText>
        </View>
        
        {user?.role === 'service_provider' && (
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {bookingStats.revenue ? (bookingStats.revenue / 1000).toFixed(1) + 'K' : 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Revenue (ETB)</ThemedText>
          </View>
        )}
      </View>
    </Card>
  );

  // Render filters
  const renderFilters = () => (
    <Card style={styles.filtersCard}>
      <View style={styles.searchSection}>
        <Input
          placeholder="Search bookings..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterGroup}>
          <ThemedText style={styles.filterLabel}>Status:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All Status' },
              { key: 'pending', label: 'Pending' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
            ].map((filter) => (
              <Button
                key={filter.key}
                variant={statusFilter === filter.key ? 'primary' : 'outlined'}
                onPress={() => setStatusFilter(filter.key)}
                size="small"
                style={styles.filterButton}
              >
                {filter.label}
              </Button>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <ThemedText style={styles.filterLabel}>Date:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All Dates' },
              { key: 'today', label: 'Today' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'past', label: 'Past' },
              { key: 'week', label: 'This Week' },
            ].map((filter) => (
              <Button
                key={filter.key}
                variant={dateFilter === filter.key ? 'primary' : 'outlined'}
                onPress={() => setDateFilter(filter.key)}
                size="small"
                style={styles.filterButton}
              >
                {filter.label}
              </Button>
            ))}
          </ScrollView>
        </View>
      </View>
    </Card>
  );

  // Render bookings list
  const renderBookingsList = () => {
    if (filteredBookings.length === 0) {
      return (
        <Card style={styles.emptyState}>
          <ThemedText style={styles.emptyStateTitle}>
            No Bookings Found
          </ThemedText>
          <ThemedText style={styles.emptyStateText}>
            {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : user?.role === 'client' 
                ? 'Book your first service to get started'
                : 'No bookings assigned to you yet'
            }
          </ThemedText>
          {user?.role === 'client' && !searchQuery && statusFilter === 'all' && dateFilter === 'all' && (
            <Button onPress={handleCreateBooking} style={styles.createButton}>
              Book a Service
            </Button>
          )}
        </Card>
      );
    }

    return (
      <View style={styles.bookingsList}>
        {filteredBookings.map((booking) => (
          <Card key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View style={styles.bookingInfo}>
                <ThemedText style={styles.serviceName}>
                  {booking.service?.name}
                </ThemedText>
                <ThemedText style={styles.bookingId}>
                  ID: {booking.id}
                </ThemedText>
              </View>
              
              <View style={styles.bookingMeta}>
                <BookingStatus status={booking.status} />
                <ThemedText style={styles.bookingDate}>
                  {new Date(booking.scheduledDate).toLocaleDateString()} • {booking.scheduledTime}
                </ThemedText>
              </View>
            </View>

            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>
                  {user?.role === 'client' ? 'Provider:' : 'Client:'}
                </ThemedText>
                <ThemedText style={styles.detailValue}>
                  {user?.role === 'client' ? booking.provider?.name : booking.client?.name}
                </ThemedText>
              </View>
              
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Location:</ThemedText>
                <ThemedText style={styles.detailValue}>{booking.location}</ThemedText>
              </View>
              
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Amount:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {booking.amount?.toLocaleString()} ETB
                </ThemedText>
              </View>
            </View>

            <BookingActions
              booking={booking}
              userRole={user?.role}
              onAction={(action) => handleQuickAction(action, booking)}
              style={styles.bookingActions}
            />
          </Card>
        ))}
      </View>
    );
  };

  // Render action buttons based on user role
  const renderActionButtons = () => {
    if (user?.role === 'client') {
      return (
        <View style={styles.actionButtons}>
          <Button
            variant="primary"
            onPress={handleCreateBooking}
            leftIcon="add"
            style={styles.actionButton}
          >
            New Booking
          </Button>
          
          <Button
            variant="outlined"
            onPress={handleAIScheduling}
            leftIcon="ai"
            style={styles.actionButton}
          >
            AI Scheduling
          </Button>
        </View>
      );
    }

    if (user?.role === 'service_provider') {
      return (
        <View style={styles.actionButtons}>
          <Button
            variant="outlined"
            onPress={() => router.push('/(services)/availability')}
            leftIcon="calendar"
            style={styles.actionButton}
          >
            Set Availability
          </Button>
          
          <Button
            variant="outlined"
            onPress={() => router.push('/(services)/create')}
            leftIcon="add"
            style={styles.actionButton}
          >
            Add Service
          </Button>
        </View>
      );
    }

    return null;
  };

  if (isLoading) {
    return <Loading message="Loading your bookings..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadBookingsData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Statistics */}
        {renderBookingStats()}

        {/* Search and Filters */}
        {renderFilters()}

        {/* Bookings List */}
        {renderBookingsList()}

        {/* Spacer for floating actions */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.floatingActions}>
        {renderActionButtons()}
      </View>

      {/* Cancel Booking Modal */}
      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmText="Cancel Booking"
        cancelText="Keep Booking"
        onConfirm={() => selectedBooking && handleCancelBooking(selectedBooking.id, 'User requested cancellation')}
        onCancel={() => {
          setShowCancelModal(false);
          setSelectedBooking(null);
        }}
        type="danger"
      />

      {/* Reschedule Booking Modal */}
      <ConfirmationModal
        visible={showRescheduleModal}
        title="Reschedule Booking"
        message="Select a new date and time for this booking"
        confirmText="Reschedule"
        cancelText="Cancel"
        onConfirm={() => {
          // In a real app, this would use a date picker
          const newDate = new Date();
          newDate.setDate(newDate.getDate() + 2);
          selectedBooking && handleRescheduleBooking(
            selectedBooking.id,
            newDate.toISOString().split('T')[0],
            '10:00'
          );
        }}
        onCancel={() => {
          setShowRescheduleModal(false);
          setSelectedBooking(null);
        }}
      >
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalText}>
            Reschedule {selectedBooking?.service?.name} with {selectedBooking?.provider?.name}
          </ThemedText>
          {/* Date and time picker would go here in a real implementation */}
        </View>
      </ConfirmationModal>
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: '30%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  filtersCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    width: '100%',
  },
  filterSection: {
    gap: 12,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  filterButton: {
    marginRight: 8,
  },
  bookingsList: {
    gap: 12,
    padding: 16,
  },
  bookingCard: {
    padding: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 12,
    opacity: 0.7,
  },
  bookingMeta: {
    alignItems: 'flex-end',
  },
  bookingDate: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  bookingDetails: {
    gap: 6,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  bookingActions: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  createButton: {
    minWidth: 200,
  },
  spacer: {
    height: 80,
  },
  floatingActions: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
};

export default ServiceBookingsScreen;