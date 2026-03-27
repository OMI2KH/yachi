import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  Loading,
  Avatar,
  ConfirmationModal,
  Input,
} from '../../../components/ui';
import { BookingStatus } from '../../../components/booking';
import { formatCurrency, formatDate, formatTime } from '../../../utils/formatters';
import { validateReschedule } from '../../../utils/validators';

/**
 * Enterprise-level Booking Reschedule Screen
 * Handles rescheduling for both service bookings and construction projects
 */
const BookingRescheduleScreen = () => {
  const { id: bookingId, originalDate } = useLocalSearchParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const { theme, colors } = useTheme();
  
  const {
    getBookingById,
    rescheduleBooking,
    checkAvailability,
    loading: bookingsLoading,
  } = useBookings();

  const { scheduleNotification } = useNotifications();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Reschedule form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Modal states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});

  /**
   * Fetch booking details and initialize form
   */
  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      const bookingData = await getBookingById(bookingId);
      
      if (!bookingData) {
        throw new Error('Booking not found');
      }

      // Check if booking can be rescheduled
      if (!canRescheduleBooking(bookingData)) {
        Alert.alert(
          'Cannot Reschedule',
          'This booking cannot be rescheduled. Please contact support if you need assistance.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      setBooking(bookingData);
      
      // Initialize dates with original booking time
      const originalDateTime = originalDate ? new Date(originalDate) : new Date(bookingData.scheduledDate);
      setSelectedDate(originalDateTime);
      setSelectedTime(originalDateTime);

      // Load initial availability
      await checkAvailabilityForDate(originalDateTime);

    } catch (error) {
      console.error('Error fetching booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [bookingId, originalDate, getBookingById, router]);

  /**
   * Check availability for selected date
   */
  const checkAvailabilityForDate = async (date) => {
    try {
      setAvailabilityLoading(true);
      
      const serviceProviderId = booking?.serviceProvider?.id || 
                               booking?.assignedWorkers?.[0]?.id;

      const availability = await checkAvailability({
        serviceProviderId,
        date: date.toISOString().split('T')[0],
        duration: booking?.duration,
        excludeBookingId: bookingId,
        projectType: booking?.type === 'construction' ? 'construction' : 'service'
      });

      setAvailableSlots(availability.slots || []);
      
      // Auto-select first available slot if none selected
      if (availability.slots.length > 0 && !selectedSlot) {
        setSelectedSlot(availability.slots[0]);
      }

    } catch (error) {
      console.error('Error checking availability:', error);
      Alert.alert('Error', 'Failed to check availability');
      setAvailableSlots([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  /**
   * Handle date selection
   */
  const handleDateSelect = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      // Combine with current selected time
      const newDateTime = new Date(date);
      newDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setSelectedTime(newDateTime);
      
      // Check availability for new date
      checkAvailabilityForDate(date);
    }
  };

  /**
   * Handle time selection
   */
  const handleTimeSelect = (event, time) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
    }
  };

  /**
   * Handle slot selection from available slots
   */
  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    const slotTime = new Date(slot.startTime);
    setSelectedTime(slotTime);
  };

  /**
   * Validate reschedule form
   */
  const validateForm = () => {
    const errors = validateReschedule({
      selectedDate,
      selectedTime,
      rescheduleReason,
      booking,
      availableSlots
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle reschedule submission
   */
  const handleReschedule = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    setShowConfirmModal(true);
  };

  /**
   * Confirm and process reschedule
   */
  const confirmReschedule = async () => {
    try {
      setRescheduling(true);
      
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes());

      const rescheduleData = {
        newScheduledDate: newDateTime.toISOString(),
        reason: rescheduleReason,
        requestedBy: user.id,
        previousDate: booking.scheduledDate,
        timeSlot: selectedSlot
      };

      const result = await rescheduleBooking(bookingId, rescheduleData);

      // Notify other party
      await scheduleNotification({
        userId: getOtherPartyUserId(booking, user),
        title: 'Booking Rescheduled',
        message: `Your booking has been rescheduled to ${formatDate(newDateTime, 'full')}`,
        type: 'booking_rescheduled',
        data: { 
          bookingId, 
          newDate: newDateTime,
          previousDate: booking.scheduledDate,
          reason: rescheduleReason
        }
      });

      // Show success and navigate back
      Alert.alert(
        'Success', 
        'Booking rescheduled successfully',
        [
          { 
            text: 'OK', 
            onPress: () => router.replace({
              pathname: '/bookings/[id]',
              params: { id: bookingId }
            })
          }
        ]
      );

    } catch (error) {
      console.error('Error rescheduling booking:', error);
      Alert.alert('Error', error.message || 'Failed to reschedule booking');
    } finally {
      setRescheduling(false);
      setShowConfirmModal(false);
    }
  };

  /**
   * Get minimum date for rescheduling (usually current date + buffer)
   */
  const getMinDate = () => {
    const minDate = new Date();
    // Allow rescheduling from tomorrow onwards
    minDate.setDate(minDate.getDate() + 1);
    return minDate;
  };

  /**
   * Get maximum date for rescheduling
   */
  const getMaxDate = () => {
    const maxDate = new Date();
    // Allow rescheduling up to 3 months in advance
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate;
  };

  // Load booking details on mount
  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

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
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={{ marginBottom: 24 }}>
          <ThemedText type="title" style={{ marginBottom: 8 }}>
            Reschedule Booking
          </ThemedText>
          <ThemedText type="body" style={{ color: colors.textSecondary }}>
            Choose a new date and time for your booking
          </ThemedText>
        </View>

        {/* Booking Summary Card */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Avatar 
              source={getServiceProviderAvatar(booking)} 
              size={50}
              badge={booking.serviceProvider?.premium ? 'premium' : null}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText type="subtitle">
                {booking.service?.name || booking.constructionProject?.name}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                with {getServiceProviderName(booking)}
              </ThemedText>
            </View>
            <BookingStatus status={booking.status} />
          </View>

          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border
          }}>
            <View>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Original Date
              </ThemedText>
              <ThemedText>
                {formatDate(booking.scheduledDate, 'full')}
              </ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Amount
              </ThemedText>
              <ThemedText type="subtitle">
                {formatCurrency(booking.totalAmount, booking.currency)}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* New Date & Time Selection */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
            New Date & Time
          </ThemedText>

          {/* Date Selection */}
          <View style={{ marginBottom: 16 }}>
            <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
              Select Date
            </ThemedText>
            <Button
              variant="outline"
              onPress={() => setShowDatePicker(true)}
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <ThemedText>{formatDate(selectedDate, 'full')}</ThemedText>
              <ThemedText>📅</ThemedText>
            </Button>
            {validationErrors.selectedDate && (
              <ThemedText type="caption" style={{ color: colors.error, marginTop: 4 }}>
                {validationErrors.selectedDate}
              </ThemedText>
            )}
          </View>

          {/* Time Selection */}
          <View style={{ marginBottom: 16 }}>
            <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
              Select Time
            </ThemedText>
            <Button
              variant="outline"
              onPress={() => setShowTimePicker(true)}
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <ThemedText>{formatTime(selectedTime)}</ThemedText>
              <ThemedText>⏰</ThemedText>
            </Button>
            {validationErrors.selectedTime && (
              <ThemedText type="caption" style={{ color: colors.error, marginTop: 4 }}>
                {validationErrors.selectedTime}
              </ThemedText>
            )}
          </View>

          {/* Available Slots */}
          {availableSlots.length > 0 && (
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Available Time Slots
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {availableSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedSlot?.id === slot.id ? 'primary' : 'outline'}
                      onPress={() => handleSlotSelect(slot)}
                      size="small"
                    >
                      <ThemedText 
                        style={{ 
                          color: selectedSlot?.id === slot.id ? colors.white : colors.text 
                        }}
                      >
                        {formatTime(new Date(slot.startTime))}
                      </ThemedText>
                    </Button>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {availabilityLoading && (
            <View style={{ alignItems: 'center', padding: 8 }}>
              <Loading size="small" message="Checking availability..." />
            </View>
          )}

          {availableSlots.length === 0 && !availabilityLoading && (
            <View style={{ alignItems: 'center', padding: 16 }}>
              <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                No available slots for selected date. Please choose another date.
              </ThemedText>
            </View>
          )}
        </Card>

        {/* Reschedule Reason */}
        <Card style={{ marginBottom: 24 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            Reason for Rescheduling
          </ThemedText>
          <Input
            multiline
            numberOfLines={4}
            placeholder="Please provide a reason for rescheduling (optional but recommended)"
            value={rescheduleReason}
            onChangeText={setRescheduleReason}
            style={{ textAlignVertical: 'top' }}
            error={validationErrors.rescheduleReason}
          />
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: 8 }}>
            This helps the service provider understand your situation.
          </ThemedText>
        </Card>

        {/* Rescheduling Policy */}
        <Card variant="outline">
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            📋 Rescheduling Policy
          </ThemedText>
          <ThemedText type="caption" style={{ color: colors.textSecondary, lineHeight: 20 }}>
            • Free rescheduling up to 24 hours before the appointment{'\n'}
            • Late rescheduling may incur fees{'\n'}
            • Multiple reschedules may affect your booking privileges{'\n'}
            • Construction projects may have different rescheduling policies
          </ThemedText>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={{ 
        padding: 16, 
        borderTopWidth: 1, 
        borderTopColor: colors.border,
        gap: 12
      }}>
        <Button
          variant="primary"
          onPress={handleReschedule}
          loading={rescheduling}
          disabled={availableSlots.length === 0 || rescheduling}
        >
          Confirm Reschedule
        </Button>
        
        <Button
          variant="ghost"
          onPress={() => router.back()}
          disabled={rescheduling}
        >
          Cancel
        </Button>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={getMinDate()}
          maximumDate={getMaxDate()}
          onChange={handleDateSelect}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeSelect}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Reschedule"
        message={
          `Are you sure you want to reschedule this booking to ${formatDate(selectedDate, 'full')} at ${formatTime(selectedTime)}?`
        }
        onConfirm={confirmReschedule}
        onCancel={() => setShowConfirmModal(false)}
        confirmText="Yes, Reschedule"
        cancelText="Review Changes"
        loading={rescheduling}
      />
    </ThemedView>
  );
};

/**
 * Utility Functions
 */

const canRescheduleBooking = (booking) => {
  const reschedulableStatuses = ['pending', 'confirmed', 'scheduled'];
  const isNotTooClose = new Date(booking.scheduledDate) > new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours buffer
  
  return reschedulableStatuses.includes(booking.status) && isNotTooClose;
};

const getOtherPartyUserId = (booking, currentUser) => {
  if (currentUser.role === 'client') {
    return booking.serviceProvider?.id || booking.assignedWorkers?.[0]?.id;
  }
  return booking.clientId;
};

const getServiceProviderAvatar = (booking) => {
  return booking.serviceProvider?.avatar || 
         booking.assignedWorkers?.[0]?.avatar || 
         null;
};

const getServiceProviderName = (booking) => {
  return booking.serviceProvider?.name || 
         booking.assignedWorkers?.[0]?.name || 
         'Service Provider';
};

export default BookingRescheduleScreen;