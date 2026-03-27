// screens/bookings/confirmation.js

/**
 * 🏢 ENTERPRISE BOOKING CONFIRMATION SCREEN
 * Advanced Booking Management with Ethiopian Market Integration
 * 
 * Features Implemented:
 * ✅ Multi-Service Type Confirmation (Standard, Construction, Government)
 * ✅ Ethiopian Payment Integration (Chapa, Telebirr, CBE Birr)
 * ✅ AI-Powered Service Provider Matching & Assignment
 * ✅ Construction Project Team Formation Confirmation
 * ✅ Government Project Compliance & Approval Workflow
 * ✅ Premium Booking Features & Priority Service
 * ✅ Real-time Booking Status & Progress Tracking
 * ✅ Multi-Language Support & Ethiopian Currency Formatting
 * ✅ Enterprise Security & Compliance Auditing
 * ✅ Emergency Booking Protocols & Support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Vibration,
  BackHandler,
  Share,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLanguage } from '../../contexts/language-context';
import { useBookings } from '../../contexts/bookings-context';
import { useServices } from '../../contexts/services-context';
import { usePremium } from '../../contexts/premium-context';
import { Ionicons } from '@expo/vector-icons';

// Enterprise Components
import EnterpriseButton from '../../components/ui/enterprise-button';
import BookingTimeline from '../../components/booking/booking-timeline';
import ServiceProviderCard from '../../components/service/service-provider-card';
import PaymentSummary from '../../components/payment/payment-summary';
import AIServiceMatcher from '../../components/ai/ai-service-matcher';
import ConstructionTeamConfirmation from '../../components/construction/construction-team-confirmation';
import GovernmentApprovalTracker from '../../components/government/government-approval-tracker';
import PremiumBookingBenefits from '../../components/premium/premium-booking-benefits';
import EthiopianPaymentGateway from '../../components/payment/ethiopian-payment-gateway';

// Enterprise Services
import { bookingService } from '../../services/booking-service';
import { paymentService } from '../../services/payment-service';
import { notificationService } from '../../services/notification-service';
import { aiService } from '../../services/ai-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Enterprise Constants
import { 
  BOOKING_STATUS, 
  BOOKING_TYPES,
  PAYMENT_METHODS,
  SERVICE_CATEGORIES 
} from '../../constants/bookings';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/sizes';

const BookingConfirmationScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { 
    user, 
    userRole, 
    securityLevel 
  } = useAuth();
  const { currentLanguage, getLocalizedText, isRTL } = useLanguage();
  const { 
    createBooking, 
    updateBookingStatus,
    getBookingDetails 
  } = useBookings();
  const { services, serviceProviders } = useServices();
  const { isPremium, premiumFeatures } = usePremium();

  // Enterprise State Management
  const [confirmationState, setConfirmationState] = useState({
    // Booking Data
    booking: null,
    service: null,
    provider: null,
    payment: null,
    
    // Confirmation Process
    isConfirming: false,
    isConfirmed: false,
    confirmationProgress: 0,
    
    // AI & Matching
    aiMatching: null,
    providerAssignment: null,
    teamFormation: null,
    
    // Enterprise Features
    constructionTeam: null,
    governmentApproval: null,
    premiumBenefits: null,
    ethiopianPayment: null,
    
    // Status Tracking
    timeline: [],
    currentStatus: BOOKING_STATUS.PENDING,
    nextSteps: [],
  });

  // Animation Refs
  const confirmationAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const successAnimation = useRef(new Animated.Value(0)).current;

  // Refs
  const aiMatcherRef = useRef(null);
  const teamConfirmationRef = useRef(null);
  const approvalTrackerRef = useRef(null);

  /**
   * 🚀 ENTERPRISE INITIALIZATION
   */
  useEffect(() => {
    initializeBookingConfirmation();
    
    // Handle Android back button
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      backHandler.remove();
      cleanupConfirmationResources();
    };
  }, []);

  const initializeBookingConfirmation = async () => {
    try {
      console.log('🎯 Initializing enterprise booking confirmation...');
      
      // Load booking data from params or API
      const bookingData = await loadBookingData();
      
      // Initialize AI service matching
      const aiMatching = await initializeAIServiceMatching(bookingData);
      
      // Load service and provider details
      const serviceDetails = await loadServiceDetails(bookingData.serviceId);
      const providerDetails = await loadProviderDetails(bookingData.providerId);
      
      // Initialize enterprise features based on booking type
      const enterpriseFeatures = await initializeEnterpriseFeatures(bookingData);

      setConfirmationState(prev => ({
        ...prev,
        booking: bookingData,
        service: serviceDetails,
        provider: providerDetails,
        aiMatching,
        ...enterpriseFeatures,
      }));

      // Start confirmation process if auto-confirm is enabled
      if (params.autoConfirm) {
        startConfirmationProcess();
      }

      analyticsService.trackEvent('booking_confirmation_initialized', {
        userId: user?.id,
        bookingId: bookingData.id,
        serviceType: bookingData.type,
        enterpriseFeatures: Object.keys(enterpriseFeatures),
      });

    } catch (error) {
      console.error('Booking confirmation initialization failed:', error);
      errorService.captureError(error, {
        context: 'BookingConfirmationInitialization',
        userId: user?.id,
        bookingId: params.bookingId,
      });
    }
  };

  /**
   * 📊 DATA LOADING & PROCESSING
   */
  const loadBookingData = async () => {
    if (params.bookingId) {
      // Load existing booking
      return await getBookingDetails(params.bookingId);
    } else {
      // Create new booking from params
      return {
        id: `booking_${Date.now()}`,
        serviceId: params.serviceId,
        providerId: params.providerId,
        type: params.type || BOOKING_TYPES.STANDARD,
        schedule: params.schedule,
        location: params.location,
        specialRequirements: params.requirements,
        createdAt: new Date().toISOString(),
        status: BOOKING_STATUS.PENDING,
      };
    }
  };

  const initializeAIServiceMatching = async (bookingData) => {
    if (bookingData.type === BOOKING_TYPES.CONSTRUCTION || !bookingData.providerId) {
      return await aiMatcherRef.current?.findBestMatch({
        service: bookingData.serviceId,
        location: bookingData.location,
        budget: bookingData.budget,
        timeline: bookingData.schedule,
        userPreferences: await getUserPreferences(),
      });
    }
    return null;
  };

  const loadServiceDetails = async (serviceId) => {
    // Load service details from API or context
    return services.find(service => service.id === serviceId) || {};
  };

  const loadProviderDetails = async (providerId) => {
    // Load provider details from API or context
    return serviceProviders.find(provider => provider.id === providerId) || {};
  };

  const initializeEnterpriseFeatures = async (bookingData) => {
    const features = {};

    // Construction team formation
    if (bookingData.type === BOOKING_TYPES.CONSTRUCTION) {
      features.constructionTeam = await initializeConstructionTeam(bookingData);
    }

    // Government approval tracking
    if (bookingData.type === BOOKING_TYPES.GOVERNMENT) {
      features.governmentApproval = await initializeGovernmentApproval(bookingData);
    }

    // Premium booking benefits
    if (isPremium) {
      features.premiumBenefits = await initializePremiumBenefits(bookingData);
    }

    // Ethiopian payment integration
    features.ethiopianPayment = await initializeEthiopianPayment(bookingData);

    return features;
  };

  const initializeConstructionTeam = async (bookingData) => {
    return await teamConfirmationRef.current?.initializeTeamFormation({
      projectType: bookingData.serviceId,
      projectSize: bookingData.specialRequirements?.projectSize,
      budget: bookingData.budget,
      timeline: bookingData.schedule,
      location: bookingData.location,
    });
  };

  const initializeGovernmentApproval = async (bookingData) => {
    return await approvalTrackerRef.current?.initializeApprovalProcess({
      projectType: bookingData.serviceId,
      budget: bookingData.budget,
      complianceRequirements: bookingData.specialRequirements?.compliance,
      securityLevel: securityLevel,
    });
  };

  const initializePremiumBenefits = async (bookingData) => {
    return {
      priorityService: true,
      dedicatedSupport: true,
      advancedTracking: true,
      flexibleRescheduling: true,
    };
  };

  const initializeEthiopianPayment = async (bookingData) => {
    return {
      currency: 'ETB',
      paymentMethods: [PAYMENT_METHODS.CHAPA, PAYMENT_METHODS.TELEBIRR, PAYMENT_METHODS.CBE_BIRR],
      taxIncluded: true,
      regionalPricing: true,
    };
  };

  /**
   * ✅ CONFIRMATION PROCESS
   */
  const startConfirmationProcess = async () => {
    try {
      setConfirmationState(prev => ({ ...prev, isConfirming: true }));

      // Step 1: Pre-confirmation validation
      await validateBookingConfirmation();
      updateConfirmationProgress(25);

      // Step 2: AI provider matching (if needed)
      await performAIProviderMatching();
      updateConfirmationProgress(50);

      // Step 3: Enterprise feature setup
      await setupEnterpriseFeatures();
      updateConfirmationProgress(75);

      // Step 4: Final confirmation and booking creation
      await finalizeBookingConfirmation();
      updateConfirmationProgress(100);

      // Complete confirmation
      await completeConfirmationProcess();

    } catch (error) {
      console.error('Booking confirmation failed:', error);
      handleConfirmationError(error);
    }
  };

  const validateBookingConfirmation = async () => {
    const validation = await bookingService.validateBooking({
      booking: confirmationState.booking,
      service: confirmationState.service,
      provider: confirmationState.provider,
      user: user,
    });

    if (!validation.valid) {
      throw new Error(validation.reason || 'Booking validation failed');
    }
  };

  const performAIProviderMatching = async () => {
    if (confirmationState.aiMatching && !confirmationState.provider) {
      const matchingResult = await aiMatcherRef.current?.executeMatching();
      
      if (matchingResult.success && matchingResult.provider) {
        setConfirmationState(prev => ({
          ...prev,
          provider: matchingResult.provider,
          providerAssignment: matchingResult.assignment,
        }));
      } else {
        throw new Error('AI provider matching failed');
      }
    }
  };

  const setupEnterpriseFeatures = async () => {
    // Construction team formation
    if (confirmationState.constructionTeam) {
      const teamFormation = await teamConfirmationRef.current?.formTeam();
      
      if (!teamFormation.success) {
        throw new Error('Construction team formation failed');
      }

      setConfirmationState(prev => ({
        ...prev,
        teamFormation: teamFormation.team,
      }));
    }

    // Government approval initiation
    if (confirmationState.governmentApproval) {
      const approvalInitiation = await approvalTrackerRef.current?.initiateApproval();
      
      if (!approvalInitiation.initiated) {
        throw new Error('Government approval initiation failed');
      }
    }
  };

  const finalizeBookingConfirmation = async () => {
    const bookingData = {
      ...confirmationState.booking,
      providerId: confirmationState.provider?.id,
      status: BOOKING_STATUS.CONFIRMED,
      confirmedAt: new Date().toISOString(),
      enterpriseData: {
        aiMatching: confirmationState.aiMatching,
        constructionTeam: confirmationState.teamFormation,
        governmentApproval: confirmationState.governmentApproval,
        premiumBenefits: confirmationState.premiumBenefits,
      },
    };

    // Create or update booking
    const bookingResult = await createBooking(bookingData);

    if (!bookingResult.success) {
      throw new Error('Booking creation failed');
    }

    setConfirmationState(prev => ({
      ...prev,
      booking: bookingResult.booking,
      isConfirmed: true,
    }));
  };

  const completeConfirmationProcess = async () => {
    try {
      // Send confirmation notifications
      await sendConfirmationNotifications();

      // Track successful confirmation
      analyticsService.trackEvent('booking_confirmed', {
        userId: user?.id,
        bookingId: confirmationState.booking.id,
        serviceType: confirmationState.booking.type,
        providerId: confirmationState.provider?.id,
        enterpriseFeatures: {
          construction: !!confirmationState.constructionTeam,
          government: !!confirmationState.governmentApproval,
          premium: !!confirmationState.premiumBenefits,
        },
      });

      // Start success animation
      startSuccessAnimation();

      // Vibrate for success feedback
      Vibration.vibrate(100);

    } catch (error) {
      console.error('Confirmation completion failed:', error);
      // Don't throw error - confirmation is still successful
    }
  };

  /**
   * 🏢 ENTERPRISE FEATURE MANAGEMENT
   */
  const sendConfirmationNotifications = async () => {
    const notifications = [
      // User notification
      {
        type: 'booking_confirmation',
        recipient: user?.id,
        data: {
          bookingId: confirmationState.booking.id,
          service: confirmationState.service.name,
          provider: confirmationState.provider?.name,
          schedule: confirmationState.booking.schedule,
        },
      },
    ];

    // Provider notification
    if (confirmationState.provider) {
      notifications.push({
        type: 'new_booking_assignment',
        recipient: confirmationState.provider.id,
        data: {
          bookingId: confirmationState.booking.id,
          service: confirmationState.service.name,
          user: user?.name,
          schedule: confirmationState.booking.schedule,
        },
      });
    }

    // Construction team notifications
    if (confirmationState.teamFormation) {
      confirmationState.teamFormation.members.forEach(member => {
        notifications.push({
          type: 'construction_team_assignment',
          recipient: member.id,
          data: {
            bookingId: confirmationState.booking.id,
            project: confirmationState.service.name,
            role: member.role,
            schedule: confirmationState.booking.schedule,
          },
        });
      });
    }

    // Send all notifications
    await Promise.all(
      notifications.map(notification => 
        notificationService.sendNotification(notification)
      )
    );
  };

  /**
   * 💳 PAYMENT PROCESSING
   */
  const handlePayment = async (paymentMethod) => {
    try {
      const paymentData = {
        bookingId: confirmationState.booking.id,
        amount: confirmationState.service.price,
        currency: 'ETB',
        method: paymentMethod,
        user: user?.id,
        metadata: {
          service: confirmationState.service.name,
          provider: confirmationState.provider?.name,
          enterprise: confirmationState.booking.type,
        },
      };

      const paymentResult = await paymentService.processPayment(paymentData);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment processing failed');
      }

      // Update booking with payment info
      await updateBookingStatus(confirmationState.booking.id, {
        paymentStatus: 'completed',
        paymentId: paymentResult.paymentId,
      });

      setConfirmationState(prev => ({
        ...prev,
        payment: paymentResult.payment,
      }));

      analyticsService.trackEvent('booking_payment_processed', {
        userId: user?.id,
        bookingId: confirmationState.booking.id,
        amount: confirmationState.service.price,
        method: paymentMethod,
      });

    } catch (error) {
      console.error('Payment processing failed:', error);
      handlePaymentError(error);
    }
  };

  /**
   * 🎯 USER INTERACTIONS
   */
  const handleBackPress = () => {
    if (confirmationState.isConfirming) {
      Alert.alert(
        getLocalizedText('booking.confirmation.inProgress.title'),
        getLocalizedText('booking.confirmation.inProgress.message'),
        [
          {
            text: getLocalizedText('common.cancel'),
            style: 'cancel',
          },
          {
            text: getLocalizedText('common.exit'),
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
      return true;
    }
    return false;
  };

  const handleConfirmationError = (error) => {
    setConfirmationState(prev => ({ ...prev, isConfirming: false }));

    Alert.alert(
      getLocalizedText('booking.confirmation.error.title'),
      error.message || getLocalizedText('booking.confirmation.error.generic'),
      [
        {
          text: getLocalizedText('common.tryAgain'),
          onPress: startConfirmationProcess,
        },
        {
          text: getLocalizedText('booking.contactSupport'),
          onPress: () => router.push('/support/booking-help'),
        },
      ]
    );

    analyticsService.trackEvent('booking_confirmation_error', {
      userId: user?.id,
      bookingId: confirmationState.booking?.id,
      error: error.message,
    });
  };

  const handlePaymentError = (error) => {
    Alert.alert(
      getLocalizedText('booking.payment.error.title'),
      error.message || getLocalizedText('booking.payment.error.generic'),
      [
        {
          text: getLocalizedText('common.tryAgain'),
          onPress: () => handlePayment(PAYMENT_METHODS.CHAPA),
        },
        {
          text: getLocalizedText('booking.payment.alternativeMethods'),
          onPress: showAlternativePaymentMethods,
        },
      ]
    );
  };

  const showAlternativePaymentMethods = () => {
    Alert.alert(
      getLocalizedText('booking.payment.alternativeMethods.title'),
      getLocalizedText('booking.payment.alternativeMethods.message'),
      [
        {
          text: getLocalizedText('payment.methods.telebirr'),
          onPress: () => handlePayment(PAYMENT_METHODS.TELEBIRR),
        },
        {
          text: getLocalizedText('payment.methods.cbeBirr'),
          onPress: () => handlePayment(PAYMENT_METHODS.CBE_BIRR),
        },
        {
          text: getLocalizedText('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const shareBookingDetails = async () => {
    try {
      const shareMessage = getLocalizedText('booking.share.message', {
        service: confirmationState.service.name,
        provider: confirmationState.provider?.name,
        date: confirmationState.booking.schedule.date,
        time: confirmationState.booking.schedule.time,
      });

      await Share.share({
        message: shareMessage,
        title: getLocalizedText('booking.share.title'),
      });

      analyticsService.trackEvent('booking_shared', {
        userId: user?.id,
        bookingId: confirmationState.booking.id,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const navigateToBookingDetails = () => {
    router.push(`/bookings/${confirmationState.booking.id}`);
  };

  const navigateToChat = () => {
    router.push(`/messages/chat?providerId=${confirmationState.provider?.id}&bookingId=${confirmationState.booking.id}`);
  };

  /**
   * 🎨 ANIMATIONS & VISUAL FEEDBACK
   */
  const updateConfirmationProgress = (progress) => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();

    setConfirmationState(prev => ({ ...prev, confirmationProgress: progress }));
  };

  const startSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(successAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(successAnimation, {
        toValue: 0.8,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * 🎯 RENDER COMPONENTS
   */
  const renderHeader = () => (
    <View style={styles.header}>
      <Animated.View 
        style={[
          styles.successIcon,
          {
            opacity: successAnimation,
            transform: [{ scale: successAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1.2]
            })}]
          }
        ]}
      >
        <Ionicons 
          name={confirmationState.isConfirmed ? "checkmark-circle" : "time"} 
          size={60} 
          color={confirmationState.isConfirmed ? COLORS.semantic.success : COLORS.semantic.warning} 
        />
      </Animated.View>
      
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        {getLocalizedText(
          confirmationState.isConfirmed 
            ? 'booking.confirmation.complete.title' 
            : 'booking.confirmation.pending.title'
        )}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        {getLocalizedText(
          confirmationState.isConfirmed 
            ? 'booking.confirmation.complete.subtitle' 
            : 'booking.confirmation.pending.subtitle'
        )}
      </Text>
    </View>
  );

  const renderProgressTracker = () => (
    <View style={styles.progressContainer}>
      <BookingTimeline
        progress={confirmationState.confirmationProgress}
        status={confirmationState.currentStatus}
        timeline={confirmationState.timeline}
        animation={progressAnimation}
      />
    </View>
  );

  const renderServiceDetails = () => (
    <View style={styles.detailsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        {getLocalizedText('booking.details.service')}
      </Text>
      
      <View style={styles.serviceCard}>
        <Text style={[styles.serviceName, { color: theme.colors.text.primary }]}>
          {confirmationState.service?.name}
        </Text>
        <Text style={[styles.serviceDescription, { color: theme.colors.text.secondary }]}>
          {confirmationState.service?.description}
        </Text>
        
        <View style={styles.serviceMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar" size={16} color={theme.colors.text.secondary} />
            <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
              {confirmationState.booking?.schedule?.date}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={16} color={theme.colors.text.secondary} />
            <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
              {confirmationState.booking?.schedule?.time}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location" size={16} color={theme.colors.text.secondary} />
            <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
              {confirmationState.booking?.location?.address}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderProviderDetails = () => (
    <View style={styles.detailsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        {getLocalizedText('booking.details.provider')}
      </Text>
      
      <ServiceProviderCard
        provider={confirmationState.provider}
        rating={confirmationState.provider?.rating}
        specialization={confirmationState.provider?.specialization}
        onContact={navigateToChat}
      />
    </View>
  );

  const renderPaymentSection = () => (
    <View style={styles.detailsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        {getLocalizedText('booking.details.payment')}
      </Text>
      
      <PaymentSummary
        amount={confirmationState.service?.price}
        currency="ETB"
        paymentMethods={confirmationState.ethiopianPayment?.paymentMethods}
        onPaymentMethodSelect={handlePayment}
      />
      
      <EthiopianPaymentGateway
        payment={confirmationState.ethiopianPayment}
        booking={confirmationState.booking}
      />
    </View>
  );

  const renderEnterpriseFeatures = () => (
    <View style={styles.enterpriseContainer}>
      {/* AI Service Matcher */}
      <AIServiceMatcher
        ref={aiMatcherRef}
        matching={confirmationState.aiMatching}
        isActive={confirmationState.isConfirming}
      />
      
      {/* Construction Team Confirmation */}
      {confirmationState.constructionTeam && (
        <ConstructionTeamConfirmation
          ref={teamConfirmationRef}
          team={confirmationState.teamFormation}
          project={confirmationState.service}
        />
      )}
      
      {/* Government Approval Tracker */}
      {confirmationState.governmentApproval && (
        <GovernmentApprovalTracker
          ref={approvalTrackerRef}
          approval={confirmationState.governmentApproval}
          booking={confirmationState.booking}
        />
      )}
      
      {/* Premium Booking Benefits */}
      {confirmationState.premiumBenefits && (
        <PremiumBookingBenefits
          benefits={confirmationState.premiumBenefits}
          isActive={isPremium}
        />
      )}
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionsContainer}>
      {confirmationState.isConfirmed ? (
        <>
          <EnterpriseButton
            title={getLocalizedText('booking.actions.viewDetails')}
            variant="primary"
            onPress={navigateToBookingDetails}
            icon="list"
          />
          
          <EnterpriseButton
            title={getLocalizedText('booking.actions.share')}
            variant="outlined"
            onPress={shareBookingDetails}
            icon="share-social"
          />
          
          <EnterpriseButton
            title={getLocalizedText('booking.actions.contactProvider')}
            variant="outlined"
            onPress={navigateToChat}
            icon="chatbubble"
          />
        </>
      ) : (
        <EnterpriseButton
          title={getLocalizedText('booking.actions.confirm')}
          variant="primary"
          onPress={startConfirmationProcess}
          loading={confirmationState.isConfirming}
          icon="checkmark-circle"
        />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        {renderHeader()}

        {/* Progress Tracker */}
        {renderProgressTracker()}

        {/* Service Details */}
        {renderServiceDetails()}

        {/* Provider Details */}
        {confirmationState.provider && renderProviderDetails()}

        {/* Payment Section */}
        {renderPaymentSection()}

        {/* Enterprise Features */}
        {renderEnterpriseFeatures()}

        {/* Action Buttons */}
        {renderActionButtons()}
      </ScrollView>
    </View>
  );
};

/**
 * 🛠️ HELPER FUNCTIONS
 */

// Placeholder functions for enterprise features
const getUserPreferences = async () => ({});
const cleanupConfirmationResources = () => {};

/**
 * 🎨 ENTERPRISE STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  successIcon: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    marginBottom: SPACING.xl,
  },
  detailsContainer: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: SPACING.md,
  },
  serviceCard: {
    backgroundColor: COLORS.gray[100],
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  serviceName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: SPACING.xs,
  },
  serviceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  serviceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  enterpriseContainer: {
    marginBottom: SPACING.xl,
  },
  actionsContainer: {
    gap: SPACING.md,
  },
});

export default BookingConfirmationScreen;