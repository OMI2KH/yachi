import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useBookings } from '../../../hooks/use-bookings';
import { useNotifications } from '../../../hooks/use-notifications';
import { useTheme } from '../../../contexts/theme-context';
import {
  ThemedView,
  ThemedText,
} from '../../../components/themed-view';
import {
  Card,
  Button,
  Badge,
  Loading,
  Avatar,
  ConfirmationModal,
  RatingModal,
} from '../../../components/ui';
import {
  BookingStatus,
  BookingTimeline,
  BookingActions,
} from '../../../components/booking';
import { ChatWindow } from '../../../components/chat';
import { Receipt } from '../../../components/payment';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { validateBookingAccess } from '../../../utils/validators';

/**
 * Enterprise-level Booking Detail Screen
 * Handles both service bookings and construction projects
 */
const BookingDetailScreen = () => {
  const { id: bookingId } = useLocalSearchParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const { theme, colors } = useTheme();
  
  const {
    getBookingById,
    updateBookingStatus,
    cancelBooking,
    rateBooking,
    loading: bookingsLoading,
    error: bookingsError,
  } = useBookings();

  const { scheduleNotification } = useNotifications();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  /**
   * Fetch booking details with error handling
   */
  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      const bookingData = await getBookingById(bookingId);
      
      if (!bookingData) {
        throw new Error('Booking not found');
      }

      // Validate user has access to this booking
      const hasAccess = validateBookingAccess(bookingData, user);
      if (!hasAccess) {
        router.back();
        Alert.alert('Access Denied', 'You do not have permission to view this booking');
        return;
      }

      setBooking(bookingData);
    } catch (error) {
      console.error('Error fetching booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId, user, getBookingById, router]);

  /**
   * Handle booking status updates
   */
  const handleStatusUpdate = async (newStatus, additionalData = {}) => {
    try {
      await updateBookingStatus(bookingId, newStatus, additionalData);
      
      // Refresh booking data
      await fetchBookingDetails();
      
      // Notify other party
      const notificationMessage = getStatusUpdateMessage(newStatus, booking);
      await scheduleNotification({
        userId: getOtherPartyUserId(booking, user),
        title: 'Booking Status Updated',
        message: notificationMessage,
        type: 'booking_update',
        data: { bookingId, newStatus }
      });

      Alert.alert('Success', `Booking ${newStatus.toLowerCase()} successfully`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  /**
   * Handle booking cancellation
   */
  const handleCancelBooking = async (cancellationReason) => {
    try {
      await cancelBooking(bookingId, cancellationReason);
      
      await scheduleNotification({
        userId: getOtherPartyUserId(booking, user),
        title: 'Booking Cancelled',
        message: `Your booking has been cancelled: ${cancellationReason}`,
        type: 'booking_cancelled',
        data: { bookingId, reason: cancellationReason }
      });

      Alert.alert('Success', 'Booking cancelled successfully');
      setShowCancelModal(false);
      router.back();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', 'Failed to cancel booking');
    }
  };

  /**
   * Handle booking rating
   */
  const handleRateBooking = async (rating, review, photos = []) => {
    try {
      await rateBooking(bookingId, {
        rating,
        review,
        photos,
        reviewerId: user.id,
        revieweeId: getOtherPartyUserId(booking, user),
      });

      await scheduleNotification({
        userId: getOtherPartyUserId(booking, user),
        title: 'New Rating Received',
        message: `You received a ${rating}-star rating for your service`,
        type: 'new_rating',
        data: { bookingId, rating }
      });

      Alert.alert('Success', 'Thank you for your review!');
      setShowRatingModal(false);
      await fetchBookingDetails();
    } catch (error) {
      console.error('Error rating booking:', error);
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  // Load booking details on mount
  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  // Handle errors
  useEffect(() => {
    if (bookingsError) {
      Alert.alert('Error', bookingsError.message);
    }
  }, [bookingsError]);

  if (loading || !booking) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Loading size="large" message="Loading booking details..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title" style={{ marginBottom: 8 }}>
                {booking.service?.name || booking.constructionProject?.name}
              </ThemedText>
              <BookingStatus status={booking.status} size="large" />
            </View>
            <Avatar
              source={getServiceProviderAvatar(booking)}
              size={60}
              badge={booking.serviceProvider?.premium ? 'premium' : null}
            />
          </View>

          {/* Quick Info Cards */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Card style={{ flex: 1, minWidth: 120 }}>
              <ThemedText type="caption">Total Amount</ThemedText>
              <ThemedText type="subtitle" style={{ color: colors.primary }}>
                {formatCurrency(booking.totalAmount, booking.currency)}
              </ThemedText>
            </Card>
            <Card style={{ flex: 1, minWidth: 120 }}>
              <ThemedText type="caption">Scheduled Date</ThemedText>
              <ThemedText type="subtitle">
                {formatDate(booking.scheduledDate, 'full')}
              </ThemedText>
            </Card>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {['details', 'timeline', 'chat', 'receipt'].map((tab) => (
            <Button
              key={tab}
              variant="ghost"
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                borderBottomWidth: activeTab === tab ? 2 : 0,
                borderBottomColor: activeTab === tab ? colors.primary : 'transparent',
              }}
            >
              <ThemedText
                style={{
                  color: activeTab === tab ? colors.primary : colors.text,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </ThemedText>
            </Button>
          ))}
        </View>

        {/* Tab Content */}
        <View style={{ padding: 16 }}>
          {activeTab === 'details' && (
            <BookingDetailsTab 
              booking={booking} 
              user={user}
              role={role}
            />
          )}

          {activeTab === 'timeline' && (
            <BookingTimeline 
              events={booking.timeline} 
              currentStatus={booking.status}
            />
          )}

          {activeTab === 'chat' && (
            <ChatWindow
              bookingId={bookingId}
              otherParty={getOtherParty(booking, user)}
              currentUser={user}
            />
          )}

          {activeTab === 'receipt' && (
            <Receipt booking={booking} />
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <BookingActions
        booking={booking}
        user={user}
        onStatusUpdate={handleStatusUpdate}
        onCancel={() => setShowCancelModal(true)}
        onRate={() => setShowRatingModal(true)}
        style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}
      />

      {/* Modals */}
      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Booking"
        message="Please provide a reason for cancellation:"
        inputPlaceholder="Cancellation reason..."
        onConfirm={handleCancelBooking}
        onCancel={() => setShowCancelModal(false)}
        confirmText="Cancel Booking"
        confirmColor="error"
      />

      <RatingModal
        visible={showRatingModal}
        onRate={handleRateBooking}
        onCancel={() => setShowRatingModal(false)}
        title={`Rate ${getOtherPartyName(booking, user)}`}
        allowPhotos={true}
      />
    </ThemedView>
  );
};

/**
 * Booking Details Tab Component
 */
const BookingDetailsTab = ({ booking, user, role }) => {
  const { colors } = useTheme();
  
  const isConstructionProject = booking.type === 'construction';
  const serviceProvider = booking.serviceProvider || booking.assignedWorkers?.[0];

  return (
    <View style={{ gap: 16 }}>
      {/* Service/Project Information */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
          {isConstructionProject ? 'Project Details' : 'Service Details'}
        </ThemedText>
        
        <View style={{ gap: 8 }}>
          <DetailRow label="Type" value={isConstructionProject ? 'Construction Project' : 'Service Booking'} />
          <DetailRow label="Category" value={booking.service?.category || booking.constructionProject?.type} />
          <DetailRow label="Duration" value={booking.duration} />
          <DetailRow label="Location" value={booking.location?.address} />
          
          {isConstructionProject && (
            <>
              <DetailRow label="Square Area" value={`${booking.constructionProject?.squareArea} m²`} />
              <DetailRow label="Floors" value={booking.constructionProject?.floorCount} />
              <DetailRow label="Team Size" value={booking.assignedWorkers?.length} />
            </>
          )}
        </View>
      </Card>

      {/* Service Provider Information */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
          {isConstructionProject ? 'Project Team' : 'Service Provider'}
        </ThemedText>
        
        {isConstructionProject ? (
          <View style={{ gap: 12 }}>
            {booking.assignedWorkers?.map((worker, index) => (
              <View key={worker.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar source={worker.avatar} size={40} />
                <View style={{ flex: 1 }}>
                  <ThemedText>{worker.name}</ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {worker.role} • {worker.specialization}
                  </ThemedText>
                </View>
                <Badge variant={index === 0 ? 'primary' : 'default'}>
                  {index === 0 ? 'Team Lead' : 'Member'}
                </Badge>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar 
              source={serviceProvider?.avatar} 
              size={50}
              badge={serviceProvider?.premium ? 'premium' : null}
            />
            <View style={{ flex: 1 }}>
              <ThemedText>{serviceProvider?.name}</ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                {serviceProvider?.rating && `⭐ ${serviceProvider.rating} • `}
                {serviceProvider?.completedJobs} completed jobs
              </ThemedText>
            </View>
          </View>
        )}
      </Card>

      {/* Payment Information */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
          Payment Details
        </ThemedText>
        
        <View style={{ gap: 8 }}>
          <DetailRow label="Base Amount" value={formatCurrency(booking.baseAmount, booking.currency)} />
          {booking.taxAmount > 0 && (
            <DetailRow label="Tax" value={formatCurrency(booking.taxAmount, booking.currency)} />
          )}
          {booking.additionalFees > 0 && (
            <DetailRow label="Additional Fees" value={formatCurrency(booking.additionalFees, booking.currency)} />
          )}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: colors.border
          }}>
            <ThemedText type="subtitle">Total Amount</ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.primary }}>
              {formatCurrency(booking.totalAmount, booking.currency)}
            </ThemedText>
          </View>
          <DetailRow label="Payment Method" value={booking.paymentMethod} />
          <DetailRow label="Payment Status" value={booking.paymentStatus} />
        </View>
      </Card>
    </View>
  );
};

/**
 * Reusable Detail Row Component
 */
const DetailRow = ({ label, value }) => {
  const { colors } = useTheme();
  
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
        {label}:
      </ThemedText>
      <ThemedText style={{ flex: 1, textAlign: 'right' }}>
        {value || 'Not specified'}
      </ThemedText>
    </View>
  );
};

/**
 * Utility Functions
 */

const getStatusUpdateMessage = (newStatus, booking) => {
  const messages = {
    confirmed: 'Your booking has been confirmed',
    in_progress: 'Service provider has started the work',
    completed: 'Your booking has been completed',
    cancelled: 'Your booking has been cancelled',
  };
  return messages[newStatus] || `Booking status updated to ${newStatus}`;
};

const getOtherPartyUserId = (booking, currentUser) => {
  if (currentUser.role === 'client') {
    return booking.serviceProvider?.id || booking.assignedWorkers?.[0]?.id;
  }
  return booking.clientId;
};

const getOtherParty = (booking, currentUser) => {
  if (currentUser.role === 'client') {
    return booking.serviceProvider || booking.assignedWorkers?.[0];
  }
  return { id: booking.clientId, name: booking.clientName };
};

const getOtherPartyName = (booking, currentUser) => {
  const otherParty = getOtherParty(booking, currentUser);
  return otherParty?.name || 'Service Provider';
};

const getServiceProviderAvatar = (booking) => {
  return booking.serviceProvider?.avatar || 
         booking.assignedWorkers?.[0]?.avatar || 
         null;
};

export default BookingDetailScreen;