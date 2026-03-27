// app/(bookings)/[id].js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useLoading } from '../../../contexts/loading-context';
import { bookingService } from '../../../services/booking-service';
import { notificationService } from '../../../services/notification-service';
import { analyticsService } from '../../../services/analytics-service';
import { errorService } from '../../../services/error-service';

// Components
import BookingHeader from '../../../components/booking/booking-header';
import BookingTimeline from '../../../components/booking/booking-timeline';
import BookingDetails from '../../../components/booking/booking-details';
import ServiceSummary from '../../../components/booking/service-summary';
import PaymentSummary from '../../../components/booking/payment-summary';
import BookingActions from '../../../components/booking/booking-actions';
import ClientInfo from '../../../components/booking/client-info';
import WorkerInfo from '../../../components/booking/worker-info';
import LoadingScreen from '../../../components/ui/loading';
import ErrorScreen from '../../../components/ui/error-screen';
import RetryButton from '../../../components/ui/retry-button';
import ConfirmationModal from '../../../components/ui/confirmation-modal';
import Toast from '../../../components/ui/toast';

// Constants
import { BOOKING_STATUS, PAYMENT_STATUS, USER_ROLES } from '../../../constants/booking';

const { width } = Dimensions.get('window');

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const bookingId = Array.isArray(id) ? id[0] : id;

  // Load booking details
  const loadBooking = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      const bookingData = await bookingService.getBookingById(bookingId);
      
      if (!bookingData) {
        throw new Error('Booking not found');
      }

      setBooking(bookingData);

      // Track view
      analyticsService.trackEvent('booking_viewed', {
        bookingId: bookingData.id,
        status: bookingData.status,
        serviceType: bookingData.service?.category,
      });

      // Animate content in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (err) {
      console.error('Error loading booking:', err);
      setError(err.message);
      errorService.captureError(err, {
        context: 'BookingDetail',
        bookingId: bookingId,
        userId: user?.id,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId, user, fadeAnim, slideAnim]);

  // Initial load
  useEffect(() => {
    if (bookingId) {
      loadBooking(true);
    }
  }, [bookingId, loadBooking]);

  // Refresh control
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBooking();
  }, [loadBooking]);

  // Handle booking actions
  const handleBookingAction = async (action, params = {}) => {
    if (actionLoading) return;

    try {
      setActionLoading(true);
      showLoading(`Processing ${action}...`);

      let result;
      const actionParams = { bookingId: bookingId, ...params };

      switch (action) {
        case 'accept':
          result = await bookingService.acceptBooking(actionParams);
          break;
        case 'reject':
          result = await bookingService.rejectBooking(actionParams);
          break;
        case 'cancel':
          result = await bookingService.cancelBooking(actionParams);
          break;
        case 'complete':
          result = await bookingService.completeBooking(actionParams);
          break;
        case 'start':
          result = await bookingService.startBooking(actionParams);
          break;
        case 'reschedule':
          result = await bookingService.rescheduleBooking(actionParams);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (result.success) {
        // Update local state
        setBooking(prev => ({
          ...prev,
          ...result.booking,
          timeline: [...(prev.timeline || []), ...(result.timelineEvents || [])],
        }));

        // Show success message
        showToast('Booking updated successfully', 'success');

        // Track action
        analyticsService.trackEvent(`booking_${action}`, {
          bookingId: bookingId,
          status: result.booking.status,
        });

        // Send notification
        await notificationService.sendBookingNotification(
          action,
          bookingId,
          user.id,
          actionParams.reason
        );

      } else {
        throw new Error(result.message || `Failed to ${action} booking`);
      }

    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      showToast(err.message || `Failed to ${action} booking`, 'error');
      
      errorService.captureError(err, {
        context: `BookingAction_${action}`,
        bookingId: bookingId,
        userId: user?.id,
        params,
      });
    } finally {
      setActionLoading(false);
      hideLoading();
      setShowCancelModal(false);
      setShowConfirmModal(false);
    }
  };

  // Share booking details
  const handleShare = async () => {
    try {
      if (!booking) return;

      const shareMessage = `Booking Details:
Service: ${booking.service?.title}
Status: ${booking.status}
Date: ${new Date(booking.scheduledDate).toLocaleDateString()}
Total: $${booking.payment?.amount || '0'}

View in Yachi App`;

      await Share.share({
        message: shareMessage,
        title: 'Booking Details',
        url: `yachi://bookings/${bookingId}`, // Deep link
      });

      analyticsService.trackEvent('booking_shared', {
        bookingId: bookingId,
        platform: Platform.OS,
      });

    } catch (err) {
      console.error('Error sharing booking:', err);
      showToast('Failed to share booking details', 'error');
    }
  };

  // Contact support
  const handleContactSupport = () => {
    const supportEmail = 'support@yachi.com';
    const subject = `Support for Booking #${bookingId}`;
    const body = `Hello Yachi Support,\n\nI need assistance with my booking:\nBooking ID: ${bookingId}\nService: ${booking?.service?.title}\nIssue: `;

    Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
      .catch(() => {
        showToast('Could not open email app', 'error');
      });
  };

  // Navigate to chat
  const handleNavigateToChat = () => {
    if (booking?.client?.id && booking?.worker?.id) {
      const otherUserId = user.role === USER_ROLES.CLIENT ? booking.worker.id : booking.client.id;
      router.push(`/(messages)/${otherUserId}?bookingId=${bookingId}`);
    }
  };

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Check if user can perform actions
  const canPerformAction = () => {
    if (!booking || !user) return false;
    
    const isClient = user.role === USER_ROLES.CLIENT;
    const isWorker = user.role === USER_ROLES.WORKER;
    const isAdmin = user.role === USER_ROLES.ADMIN;

    return {
      canAccept: isWorker && booking.status === BOOKING_STATUS.PENDING,
      canReject: isWorker && booking.status === BOOKING_STATUS.PENDING,
      canCancel: (isClient || isWorker || isAdmin) && 
                 [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS].includes(booking.status),
      canStart: isWorker && booking.status === BOOKING_STATUS.CONFIRMED,
      canComplete: isWorker && booking.status === BOOKING_STATUS.IN_PROGRESS,
      canReschedule: (isClient || isWorker) && 
                     [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status),
      canMessage: booking.status !== BOOKING_STATUS.CANCELLED,
      canReview: isClient && booking.status === BOOKING_STATUS.COMPLETED && !booking.hasReview,
    };
  };

  // Render loading state
  if (loading) {
    return <LoadingScreen message="Loading booking details..." />;
  }

  // Render error state
  if (error && !booking) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => loadBooking(true)}
        retryButton={<RetryButton onPress={() => loadBooking(true)} />}
      />
    );
  }

  // Render not found state
  if (!booking) {
    return (
      <ErrorScreen
        message="Booking not found"
        onRetry={() => router.back()}
        retryButton={<RetryButton onPress={() => router.back()} />}
      />
    );
  }

  const permissions = canPerformAction();
  const isClientView = user.role === USER_ROLES.CLIENT;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Booking #${bookingId.slice(-8)}`,
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Booking Header */}
            <BookingHeader
              booking={booking}
              onShare={handleShare}
              theme={theme}
            />

            {/* Booking Timeline */}
            <BookingTimeline
              timeline={booking.timeline}
              currentStatus={booking.status}
              theme={theme}
            />

            {/* Service Summary */}
            <ServiceSummary
              service={booking.service}
              scheduledDate={booking.scheduledDate}
              duration={booking.duration}
              address={booking.address}
              theme={theme}
            />

            {/* User Information */}
            {isClientView ? (
              <WorkerInfo
                worker={booking.worker}
                rating={booking.worker?.rating}
                theme={theme}
              />
            ) : (
              <ClientInfo
                client={booking.client}
                theme={theme}
              />
            )}

            {/* Booking Details */}
            <BookingDetails
              booking={booking}
              specialRequests={booking.specialRequests}
              theme={theme}
            />

            {/* Payment Summary */}
            <PaymentSummary
              payment={booking.payment}
              theme={theme}
            />

            {/* Action Buttons */}
            <BookingActions
              booking={booking}
              permissions={permissions}
              onAction={handleBookingAction}
              onMessage={handleNavigateToChat}
              onContactSupport={handleContactSupport}
              loading={actionLoading}
              theme={theme}
            />

            {/* Safety Notice */}
            <View style={[styles.safetyNotice, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.safetyTitle, { color: theme.colors.text }]}>
                Safety First
              </Text>
              <Text style={[styles.safetyText, { color: theme.colors.textSecondary }]}>
                • Meet in public places when possible{'\n'}
                • Verify identity before starting work{'\n'}
                • Report any concerns to support immediately
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Confirmation Modals */}
        <ConfirmationModal
          visible={showCancelModal}
          title="Cancel Booking"
          message="Are you sure you want to cancel this booking? This action cannot be undone."
          confirmText="Cancel Booking"
          cancelText="Keep Booking"
          onConfirm={() => handleBookingAction('cancel')}
          onCancel={() => setShowCancelModal(false)}
          type="danger"
          theme={theme}
        />

        <ConfirmationModal
          visible={showConfirmModal}
          title="Complete Booking"
          message="Confirm that you have successfully completed the service?"
          confirmText="Complete Booking"
          cancelText="Not Yet"
          onConfirm={() => handleBookingAction('complete')}
          onCancel={() => setShowConfirmModal(false)}
          type="success"
          theme={theme}
        />

        {/* Toast Notification */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(prev => ({ ...prev, visible: false }))}
          theme={theme}
        />

        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  animatedContainer: {
    flex: 1,
  },
  safetyNotice: {
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  safetyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});