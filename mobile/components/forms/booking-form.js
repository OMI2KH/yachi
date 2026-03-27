// components/forms/booking-form.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

// Contexts
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Button from '../ui/button';
import Input from '../ui/input';
import Card from '../ui/card';
import Badge from '../ui/badge';
import Loading from '../ui/loading';
import Modal from '../ui/modal';

// Services
import { bookingService } from '../../services/booking-service';
import { paymentService } from '../../services/payment-service';
import { notificationService } from '../../services/notification-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Utils
import { formatCurrency, formatDate } from '../../utils/formatters';
import { validators } from '../../utils/validators';

// Constants
import { COLORS } from '../../constants/colors';
import { PAYMENT_METHODS, BOOKING_STATUS } from '../../constants/payment';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Booking Form Component
 * Ethiopian market focused with local payment integration
 * Multi-service type support with AI scheduling
 */

const BookingForm = ({
  service,
  provider,
  onSuccess,
  onCancel,
  enableAIRecommendations = true,
  testID = 'booking-form',
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CHAPA);
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef(null);

  // Ethiopian time slots (considering local working hours)
  const timeSlots = useRef([
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', 
    '04:00 PM', '05:00 PM'
  ]).current;

  // Initialize component
  useEffect(() => {
    animateEntrance();
    loadUserAddress();
  }, []);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadUserAddress = () => {
    // Load user's default address if available
    if (user?.address) {
      setAddress(user.address);
    }
  };

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    // Date validation
    if (!date) {
      errors.date = 'Start date is required';
    } else if (date < new Date()) {
      errors.date = 'Start date cannot be in the past';
    }

    if (!endDate) {
      errors.endDate = 'End date is required';
    } else if (endDate < date) {
      errors.endDate = 'End date cannot be before start date';
    }

    // Address validation
    if (!address.trim()) {
      errors.address = 'Service address is required';
    } else if (address.trim().length < 10) {
      errors.address = 'Please provide a complete address';
    }

    // Time slot validation
    if (!selectedTimeSlot) {
      errors.timeSlot = 'Please select a preferred time';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [date, endDate, address, selectedTimeSlot]);

  // Calculate booking duration
  const calculateDuration = useCallback(() => {
    if (!date || !endDate) return 1;
    const diffTime = Math.abs(endDate - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 1);
  }, [date, endDate]);

  // Calculate total amount
  const calculateTotal = useCallback(() => {
    if (!service?.price) return 0;
    const duration = calculateDuration();
    const baseAmount = service.price * duration;
    
    // Add platform fee (0% for Ethiopian market as per your business model)
    const platformFee = 0;
    
    return baseAmount + platformFee;
  }, [service, calculateDuration]);

  // Handle date selection
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      setTouched(prev => ({ ...prev, date: true }));
      
      // Auto-adjust end date if it becomes invalid
      if (endDate < selectedDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setDate(newEndDate.getDate() + 1);
        setEndDate(newEndDate);
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      setTouched(prev => ({ ...prev, endDate: true }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      notificationService.show({
        type: 'error',
        title: 'Form Validation Error',
        message: 'Please check all required fields',
      });
      return;
    }

    try {
      setLoading(true);

      const bookingData = {
        serviceId: service.id,
        providerId: provider.id,
        startDate: date.toISOString(),
        endDate: endDate.toISOString(),
        timeSlot: selectedTimeSlot,
        paymentMethod,
        address: address.trim(),
        notes: notes.trim(),
        specialRequirements: specialRequirements.trim(),
        totalAmount: calculateTotal(),
        customerId: user.id,
        status: BOOKING_STATUS.PENDING,
      };

      // Create booking
      const result = await bookingService.createBooking(bookingData);

      if (result.success) {
        // Track analytics
        analyticsService.track('booking_created', {
          serviceId: service.id,
          serviceType: service.type,
          providerId: provider.id,
          amount: calculateTotal(),
          paymentMethod,
          duration: calculateDuration(),
        });

        // Process payment based on selected method
        await processPayment(result.booking);

      } else {
        throw new Error(result.message || 'Failed to create booking');
      }

    } catch (error) {
      console.error('Booking creation error:', error);
      
      errorService.handleError(error, {
        context: 'BookingForm',
        serviceId: service?.id,
        userId: user?.id,
      });

      notificationService.show({
        type: 'error',
        title: 'Booking Failed',
        message: error.message || 'Unable to create booking. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Process payment based on selected method
  const processPayment = async (booking) => {
    try {
      let paymentResult;

      switch (paymentMethod) {
        case PAYMENT_METHODS.CHAPA:
          paymentResult = await paymentService.processChapaPayment({
            bookingId: booking.id,
            amount: calculateTotal(),
            customerEmail: user.email,
            customerPhone: user.phone,
          });
          break;

        case PAYMENT_METHODS.TELEBIRR:
          paymentResult = await paymentService.processTeleBirrPayment({
            bookingId: booking.id,
            amount: calculateTotal(),
            customerPhone: user.phone,
          });
          break;

        case PAYMENT_METHODS.CBE_BIRR:
          paymentResult = await paymentService.processCbeBirrPayment({
            bookingId: booking.id,
            amount: calculateTotal(),
            customerPhone: user.phone,
          });
          break;

        case PAYMENT_METHODS.CASH:
          // For cash payments, just confirm the booking
          paymentResult = { success: true, data: { confirmed: true } };
          break;

        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      if (paymentResult.success) {
        await handleBookingSuccess(booking);
      } else {
        throw new Error(paymentResult.message || 'Payment processing failed');
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  };

  // Handle successful booking
  const handleBookingSuccess = async (booking) => {
    // Show success notification
    notificationService.show({
      type: 'success',
      title: 'Booking Confirmed! 🎉',
      message: `Your ${service.name} booking has been confirmed.`,
    });

    // Track successful booking
    analyticsService.track('booking_confirmed', {
      bookingId: booking.id,
      serviceType: service.type,
      amount: calculateTotal(),
    });

    // Call success callback
    onSuccess?.(booking);

    // Navigate to booking confirmation
    router.push(`/(bookings)/${booking.id}`);
  };

  // Render time slot selector
  const renderTimeSlots = () => (
    <View style={styles.timeSlotsContainer}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Preferred Time Slot
      </ThemedText>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.timeSlotsScroll}
      >
        <View style={styles.timeSlotsGrid}>
          {timeSlots.map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeSlot,
                selectedTimeSlot === time && [
                  styles.selectedTimeSlot,
                  { backgroundColor: theme.colors.primary }
                ],
              ]}
              onPress={() => {
                setSelectedTimeSlot(time);
                setTouched(prev => ({ ...prev, timeSlot: true }));
              }}
            >
              <ThemedText 
                type="caption" 
                weight="medium"
                color={selectedTimeSlot === time ? 'white' : 'secondary'}
              >
                {time}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {formErrors.timeSlot && touched.timeSlot && (
        <ThemedText type="caption" color="error" style={styles.errorText}>
          {formErrors.timeSlot}
        </ThemedText>
      )}
    </View>
  );

  // Render payment method selector
  const renderPaymentMethods = () => (
    <View style={styles.paymentMethodsContainer}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Payment Method
      </ThemedText>
      <View style={styles.paymentMethodsGrid}>
        {Object.values(PAYMENT_METHODS).map((method) => (
          <TouchableOpacity
            key={method}
            style={[
              styles.paymentMethod,
              paymentMethod === method && [
                styles.selectedPaymentMethod,
                { borderColor: theme.colors.primary }
              ],
            ]}
            onPress={() => setPaymentMethod(method)}
          >
            <View style={styles.paymentMethodContent}>
              <View style={styles.paymentMethodIcon}>
                <ThemedText type="title">
                  {getPaymentMethodIcon(method)}
                </ThemedText>
              </View>
              <View style={styles.paymentMethodInfo}>
                <ThemedText type="body" weight="semiBold">
                  {getPaymentMethodName(method)}
                </ThemedText>
                <ThemedText type="caption" color="secondary">
                  {getPaymentMethodDescription(method)}
                </ThemedText>
              </View>
              <View style={[
                styles.radioButton,
                paymentMethod === method && [
                  styles.radioButtonSelected,
                  { backgroundColor: theme.colors.primary }
                ],
              ]}>
                {paymentMethod === method && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    const icons = {
      [PAYMENT_METHODS.CHAPA]: '💰',
      [PAYMENT_METHODS.TELEBIRR]: '📱',
      [PAYMENT_METHODS.CBE_BIRR]: '🏦',
      [PAYMENT_METHODS.CASH]: '💵',
    };
    return icons[method] || '💳';
  };

  // Get payment method name
  const getPaymentMethodName = (method) => {
    const names = {
      [PAYMENT_METHODS.CHAPA]: 'Chapa',
      [PAYMENT_METHODS.TELEBIRR]: 'Telebirr',
      [PAYMENT_METHODS.CBE_BIRR]: 'CBE Birr',
      [PAYMENT_METHODS.CASH]: 'Cash',
    };
    return names[method] || 'Payment';
  };

  // Get payment method description
  const getPaymentMethodDescription = (method) => {
    const descriptions = {
      [PAYMENT_METHODS.CHAPA]: 'Secure online payment',
      [PAYMENT_METHODS.TELEBIRR]: 'Mobile money payment',
      [PAYMENT_METHODS.CBE_BIRR]: 'Bank transfer',
      [PAYMENT_METHODS.CASH]: 'Pay when service is completed',
    };
    return descriptions[method] || 'Payment method';
  };

  // Render booking summary
  const renderBookingSummary = () => (
    <Card style={styles.summaryCard}>
      <ThemedText type="title" weight="semiBold" style={styles.summaryTitle}>
        Booking Summary
      </ThemedText>
      
      <View style={styles.summaryRow}>
        <ThemedText type="body" color="secondary">
          Service
        </ThemedText>
        <ThemedText type="body" weight="semiBold">
          {service?.name}
        </ThemedText>
      </View>

      <View style={styles.summaryRow}>
        <ThemedText type="body" color="secondary">
          Duration
        </ThemedText>
        <ThemedText type="body" weight="semiBold">
          {calculateDuration()} day{calculateDuration() > 1 ? 's' : ''}
        </ThemedText>
      </View>

      <View style={styles.summaryRow}>
        <ThemedText type="body" color="secondary">
          Rate
        </ThemedText>
        <ThemedText type="body" weight="semiBold">
          {formatCurrency(service?.price || 0)}/day
        </ThemedText>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryRow}>
        <ThemedText type="body" weight="semiBold">
          Total Amount
        </ThemedText>
        <ThemedText type="title" weight="bold" color="primary">
          {formatCurrency(calculateTotal())}
        </ThemedText>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading message="Creating your booking..." />
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      testID={testID}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service Information */}
        <Card style={styles.serviceCard}>
          <ThemedText type="title" weight="bold">
            {service?.name}
          </ThemedText>
          <ThemedText type="body" color="secondary" style={styles.serviceDescription}>
            {service?.description}
          </ThemedText>
          <View style={styles.serviceMeta}>
            <Badge variant="filled" color="primary">
              {service?.category}
            </Badge>
            <ThemedText type="body" weight="semiBold" color="primary">
              {formatCurrency(service?.price)}/day
            </ThemedText>
          </View>
        </Card>

        {/* Date Selection */}
        <Card style={styles.sectionCard}>
          <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
            Service Dates
          </ThemedText>
          
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <ThemedText type="caption" weight="medium" style={styles.inputLabel}>
                Start Date
              </ThemedText>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText type="body">
                  {formatDate(date)}
                </ThemedText>
              </TouchableOpacity>
              {formErrors.date && touched.date && (
                <ThemedText type="caption" color="error" style={styles.errorText}>
                  {formErrors.date}
                </ThemedText>
              )}
            </View>

            <View style={styles.dateInput}>
              <ThemedText type="caption" weight="medium" style={styles.inputLabel}>
                End Date
              </ThemedText>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <ThemedText type="body">
                  {formatDate(endDate)}
                </ThemedText>
              </TouchableOpacity>
              {formErrors.endDate && touched.endDate && (
                <ThemedText type="caption" color="error" style={styles.errorText}>
                  {formErrors.endDate}
                </ThemedText>
              )}
            </View>
          </View>
        </Card>

        {/* Time Slots */}
        <Card style={styles.sectionCard}>
          {renderTimeSlots()}
        </Card>

        {/* Address */}
        <Card style={styles.sectionCard}>
          <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
            Service Location
          </ThemedText>
          <Input
            placeholder="Enter your complete address..."
            value={address}
            onChangeText={(value) => {
              setAddress(value);
              setTouched(prev => ({ ...prev, address: true }));
            }}
            error={formErrors.address}
            touched={touched.address}
            multiline
            numberOfLines={3}
            style={styles.addressInput}
          />
        </Card>

        {/* Additional Information */}
        <Card style={styles.sectionCard}>
          <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
            Additional Information (Optional)
          </ThemedText>
          <Input
            placeholder="Any special requirements or instructions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        </Card>

        {/* Payment Methods */}
        <Card style={styles.sectionCard}>
          {renderPaymentMethods()}
        </Card>

        {/* Booking Summary */}
        {renderBookingSummary()}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            variant="outline"
            onPress={onCancel}
            style={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          >
            Confirm Booking - {formatCurrency(calculateTotal())}
          </Button>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={date}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  serviceCard: {
    marginBottom: 16,
  },
  serviceDescription: {
    marginTop: 8,
    marginBottom: 12,
  },
  serviceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  inputLabel: {
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  timeSlotsContainer: {
    gap: 12,
  },
  timeSlotsScroll: {
    marginHorizontal: -4,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedTimeSlot: {
    borderColor: 'transparent',
  },
  addressInput: {
    minHeight: 80,
  },
  notesInput: {
    minHeight: 80,
  },
  paymentMethodsContainer: {
    gap: 12,
  },
  paymentMethodsGrid: {
    gap: 8,
  },
  paymentMethod: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    backgroundColor: '#F0FDF4',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    gap: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: 'transparent',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  errorText: {
    marginTop: 4,
  },
});

export default BookingForm;