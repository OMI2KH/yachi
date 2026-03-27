// app/(bookings)/create.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useLoading } from '../../../contexts/loading-context';
import { useLocation } from '../../../contexts/location-context';
import { bookingService } from '../../../services/booking-service';
import { serviceService } from '../../../services/service-service';
import { paymentService } from '../../../services/payment-service';
import { analyticsService } from '../../../services/analytics-service';
import { errorService } from '../../../services/error-service';

// Components
import ServiceSelection from '../../../components/booking/create/service-selection';
import DateTimeSelection from '../../../components/booking/create/date-time-selection';
import LocationSelection from '../../../components/booking/create/location-selection';
import DurationSelection from '../../../components/booking/create/duration-selection';
import SpecialRequests from '../../../components/booking/create/special-requests';
import PaymentMethodSelection from '../../../components/booking/create/payment-method-selection';
import PriceSummary from '../../../components/booking/create/price-summary';
import BookingConfirmation from '../../../components/booking/create/booking-confirmation';
import FormProgress from '../../../components/ui/form-progress';
import LoadingScreen from '../../../components/ui/loading';
import ErrorScreen from '../../../components/ui/error-screen';
import RetryButton from '../../../components/ui/retry-button';
import Toast from '../../../components/ui/toast';

// Constants
import { BOOKING_STEPS, DEFAULT_DURATION_OPTIONS } from '../../../constants/booking';

const { width } = Dimensions.get('window');

export default function CreateBookingScreen() {
  const { serviceId, workerId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();
  const { currentLocation, getCurrentLocation } = useLocation();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [worker, setWorker] = useState(null);
  const [formData, setFormData] = useState({
    serviceId: serviceId || null,
    workerId: workerId || null,
    scheduledDate: null,
    duration: DEFAULT_DURATION_OPTIONS[0].value,
    address: null,
    specialRequests: '',
    paymentMethod: null,
    emergencyContact: null,
  });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  const scrollViewRef = useRef();
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize form
  useEffect(() => {
    initializeForm();
  }, [serviceId, workerId]);

  // Animate step transitions
  useEffect(() => {
    animateStepTransition();
  }, [currentStep]);

  const initializeForm = async () => {
    try {
      setLoading(true);

      // If serviceId is provided, load service details
      if (serviceId) {
        const service = await serviceService.getServiceById(serviceId);
        if (service) {
          setSelectedService(service);
          setFormData(prev => ({
            ...prev,
            serviceId: service.id,
            workerId: service.providerId,
          }));

          // Load worker details
          const workerData = await serviceService.getServiceProvider(service.providerId);
          setWorker(workerData);
        }
      }

      // If only workerId is provided, load worker services
      if (workerId && !serviceId) {
        const workerServices = await serviceService.getWorkerServices(workerId);
        setServices(workerServices);
        setWorker(await serviceService.getServiceProvider(workerId));
      }

      // Load user's default location
      if (currentLocation) {
        setFormData(prev => ({
          ...prev,
          address: {
            ...currentLocation,
            formattedAddress: currentLocation.address,
          },
        }));
      }

      // Track booking start
      analyticsService.trackEvent('booking_creation_started', {
        serviceId: serviceId,
        workerId: workerId,
        source: 'direct', // or 'search', 'profile', etc.
      });

    } catch (error) {
      console.error('Error initializing booking form:', error);
      showToast('Failed to initialize booking form', 'error');
      errorService.captureError(error, {
        context: 'BookingInitialization',
        serviceId,
        workerId,
      });
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const animateStepTransition = () => {
    // Reset animation
    slideAnim.setValue(width);
    fadeAnim.setValue(0);

    // Animate in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Scroll to top
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Form validation
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Service Selection
        if (!formData.serviceId) {
          newErrors.serviceId = 'Please select a service';
        }
        break;

      case 1: // Date & Time
        if (!formData.scheduledDate) {
          newErrors.scheduledDate = 'Please select a date and time';
        } else if (new Date(formData.scheduledDate) < new Date()) {
          newErrors.scheduledDate = 'Please select a future date and time';
        }
        break;

      case 2: // Location
        if (!formData.address) {
          newErrors.address = 'Please select a location';
        }
        break;

      case 3: // Duration
        if (!formData.duration || formData.duration < 1) {
          newErrors.duration = 'Please select a valid duration';
        }
        break;

      case 4: // Payment
        if (!formData.paymentMethod) {
          newErrors.paymentMethod = 'Please select a payment method';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation between steps
  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < BOOKING_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
        
        // Track step completion
        analyticsService.trackEvent('booking_step_completed', {
          step: BOOKING_STEPS[currentStep].key,
          stepNumber: currentStep + 1,
        });
      } else {
        handleSubmit();
      }
    } else {
      showToast('Please fix the errors before continuing', 'error');
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  // Jump to specific step
  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < BOOKING_STEPS.length) {
      // Validate all previous steps
      for (let i = 0; i < stepIndex; i++) {
        if (!validateStep(i)) {
          showToast(`Please complete step ${i + 1} first`, 'error');
          return;
        }
      }
      setCurrentStep(stepIndex);
    }
  };

  // Form data updates
  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    if (errors) {
      const fieldNames = Object.keys(updates);
      const newErrors = { ...errors };
      fieldNames.forEach(field => {
        delete newErrors[field];
      });
      setErrors(newErrors);
    }
  };

  // Service selection
  const handleServiceSelect = (service) => {
    setSelectedService(service);
    updateFormData({
      serviceId: service.id,
      workerId: service.providerId,
    });

    // Load worker details if not already loaded
    if (!worker || worker.id !== service.providerId) {
      loadWorkerDetails(service.providerId);
    }

    analyticsService.trackEvent('booking_service_selected', {
      serviceId: service.id,
      category: service.category,
      price: service.price,
    });
  };

  const loadWorkerDetails = async (workerId) => {
    try {
      const workerData = await serviceService.getServiceProvider(workerId);
      setWorker(workerData);
    } catch (error) {
      console.error('Error loading worker details:', error);
    }
  };

  // Location handling
  const handleLocationSelect = (location) => {
    updateFormData({ address: location });
  };

  const handleUseCurrentLocation = async () => {
    try {
      showLoading('Getting your location...');
      const location = await getCurrentLocation();
      
      if (location) {
        updateFormData({
          address: {
            ...location,
            formattedAddress: location.address,
          },
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      showToast('Unable to get your current location', 'error');
    } finally {
      hideLoading();
    }
  };

  // Form submission
  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      showLoading('Creating your booking...');

      // Final validation
      if (!validateStep(currentStep)) {
        throw new Error('Please fix all errors before submitting');
      }

      // Prepare booking data
      const bookingData = {
        ...formData,
        clientId: user.id,
        totalAmount: calculateTotalAmount(),
        status: 'pending',
        metadata: {
          device: Platform.OS,
          appVersion: '1.0.0', // This should come from app config
          createdVia: 'mobile',
        },
      };

      // Create booking
      const result = await bookingService.createBooking(bookingData);

      if (result.success) {
        // Track successful booking
        analyticsService.trackEvent('booking_created', {
          bookingId: result.booking.id,
          serviceId: formData.serviceId,
          workerId: formData.workerId,
          totalAmount: bookingData.totalAmount,
          duration: formData.duration,
        });

        // Show confirmation
        setCreatedBooking(result.booking);
        setShowConfirmation(true);

      } else {
        throw new Error(result.message || 'Failed to create booking');
      }

    } catch (error) {
      console.error('Error creating booking:', error);
      showToast(error.message || 'Failed to create booking', 'error');
      
      errorService.captureError(error, {
        context: 'BookingCreation',
        formData: {
          serviceId: formData.serviceId,
          workerId: formData.workerId,
          hasDate: !!formData.scheduledDate,
          hasLocation: !!formData.address,
        },
        userId: user?.id,
      });
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    if (!selectedService) return 0;

    const basePrice = selectedService.price || 0;
    const durationMultiplier = formData.duration / 60; // Convert minutes to hours
    const total = basePrice * durationMultiplier;

    // Apply minimum charge
    const minimumCharge = selectedService.minimumCharge || basePrice;
    return Math.max(total, minimumCharge);
  };

  // Confirmation handlers
  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    router.replace(`/(bookings)/${createdBooking.id}`);
  };

  const handleViewBooking = () => {
    setShowConfirmation(false);
    router.replace(`/(bookings)/${createdBooking.id}`);
  };

  const handleBookAnother = () => {
    setShowConfirmation(false);
    // Reset form for new booking
    setFormData({
      serviceId: null,
      workerId: workerId || null,
      scheduledDate: null,
      duration: DEFAULT_DURATION_OPTIONS[0].value,
      address: formData.address, // Keep location
      specialRequests: '',
      paymentMethod: null,
      emergencyContact: null,
    });
    setCurrentStep(0);
    setSelectedService(null);
    setCreatedBooking(null);
  };

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Render current step
  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      errors,
      selectedService,
      worker,
      services,
      onServiceSelect: handleServiceSelect,
      onLocationSelect: handleLocationSelect,
      onUseCurrentLocation: handleUseCurrentLocation,
      theme,
      calculateTotalAmount,
    };

    switch (currentStep) {
      case 0:
        return <ServiceSelection {...stepProps} />;
      case 1:
        return <DateTimeSelection {...stepProps} />;
      case 2:
        return <LocationSelection {...stepProps} />;
      case 3:
        return <DurationSelection {...stepProps} />;
      case 4:
        return <SpecialRequests {...stepProps} />;
      case 5:
        return <PaymentMethodSelection {...stepProps} />;
      case 6:
        return (
          <PriceSummary
            {...stepProps}
            totalAmount={calculateTotalAmount()}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading booking form..." />;
  }

  if (showConfirmation && createdBooking) {
    return (
      <BookingConfirmation
        booking={createdBooking}
        service={selectedService}
        worker={worker}
        onClose={handleConfirmationClose}
        onViewBooking={handleViewBooking}
        onBookAnother={handleBookAnother}
        theme={theme}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Booking',
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

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.progressContainer}>
          <FormProgress
            steps={BOOKING_STEPS}
            currentStep={currentStep}
            onStepPress={goToStep}
            theme={theme}
          />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {renderStep()}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { 
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        }]}>
          <View style={styles.footerContent}>
            {currentStep > 0 && (
              <Button
                title="Back"
                onPress={goToPreviousStep}
                type="outline"
                style={styles.backButton}
                theme={theme}
                disabled={submitting}
              />
            )}
            
            <Button
              title={
                currentStep === BOOKING_STEPS.length - 1 
                  ? `Confirm Booking - $${calculateTotalAmount().toFixed(2)}`
                  : 'Continue'
              }
              onPress={goToNextStep}
              loading={submitting}
              style={styles.continueButton}
              theme={theme}
            />
          </View>
        </View>

        {/* Toast Notification */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(prev => ({ ...prev, visible: false }))}
          theme={theme}
        />

        <StatusBar style={isDark ? 'light' : 'dark'} />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  stepContainer: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  footerContent: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});

// Mock Button component (you should replace with your actual Button component)
const Button = ({ 
  title, 
  onPress, 
  loading, 
  type = 'primary', 
  style, 
  theme, 
  disabled 
}) => {
  return (
    <View style={[buttonStyles.container, style]}>
      <Text style={[
        buttonStyles.text,
        type === 'primary' && { color: theme.colors.background },
        type === 'outline' && { color: theme.colors.primary },
      ]}>
        {loading ? 'Processing...' : title}
      </Text>
    </View>
  );
};

const buttonStyles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});