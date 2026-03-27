/**
 * 🎯 ENTERPRISE BOOKING CREATION SCREEN v3.0
 * 
 * Enhanced Features:
 * - AI-powered service matching and recommendations
 * - Ethiopian construction industry specialization
 * - Multi-type booking system (Standard, Construction, Emergency, Government)
 * - Real-time pricing and availability checking
 * - Advanced scheduling with Ethiopian calendar integration
 * - Smart location detection with Ethiopian regions
 * - Budget optimization and cost estimation
 * - Team assignment intelligence
 * - TypeScript-first with enterprise validation
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLocation } from '../../contexts/location-context';
import { useBookings } from '../../hooks/use-bookings';
import { useAI } from '../../contexts/ai-matching-context';
import { 
  analyticsService, 
  bookingService, 
  pricingService,
  availabilityService 
} from '../../services';

// Import Enterprise Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import LocationPicker from '../../components/ui/location-picker';
import DateTimePicker from '../../components/ui/date-time-picker';
import ServiceSelector from '../../components/service/service-selector';
import BudgetEstimator from '../../components/booking/budget-estimator';
import AIServiceRecommendation from '../../components/ai/ai-service-recommendation';
import EmergencyBookingCard from '../../components/booking/emergency-booking-card';
import ConstructionProjectWizard from '../../components/booking/construction-project-wizard';

// Import Enterprise Constants
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/sizes';
import { BOOKING_TYPES, BOOKING_PRIORITY } from '../../constants/booking';
import { ETHIOPIAN_REGIONS, ETHIOPIAN_CITIES } from '../../constants/location';
import { CONSTRUCTION_SERVICES } from '../../constants/services';

// ==================== ENTERPRISE CONSTANTS ====================
const BOOKING_STEPS = Object.freeze({
  SERVICE_SELECTION: 1,
  DETAILS: 2,
  SCHEDULING: 3,
  BUDGET: 4,
  CONFIRMATION: 5
});

const BOOKING_TYPE_CONFIG = Object.freeze({
  [BOOKING_TYPES.STANDARD]: {
    label: 'መደበኛ አገልግሎት',
    icon: '🔧',
    color: COLORS.primary.main,
    features: ['quick_booking', 'fixed_pricing', 'standard_timeline'],
    maxTeamSize: 3
  },
  [BOOKING_TYPES.CONSTRUCTION]: {
    label: 'የግንባታ ፕሮጀክት',
    icon: '🏗️',
    color: COLORS.secondary.main,
    features: ['ai_team_matching', 'project_management', 'progress_tracking'],
    maxTeamSize: 15
  },
  [BOOKING_TYPES.EMERGENCY]: {
    label: 'አደጋ አገልግሎት',
    icon: '🚨',
    color: COLORS.semantic.error.main,
    features: ['immediate_response', 'priority_support', '24_7_availability'],
    maxTeamSize: 5
  },
  [BOOKING_TYPES.GOVERNMENT]: {
    label: 'መንግሥታዊ ፕሮጀክት',
    icon: '🏛️',
    color: COLORS.semantic.warning.main,
    features: ['bulk_operations', 'document_management', 'compliance_tracking'],
    maxTeamSize: 50
  }
});

const CONSTRUCTION_PROJECT_TYPES = Object.freeze({
  RESIDENTIAL: {
    label: 'ፋርማዊ ህንፃ',
    icon: '🏠',
    basePrice: 5000,
    teamSize: 4,
    duration: '2-4 ሳምንታት'
  },
  COMMERCIAL: {
    label: 'ንግድ ህንፃ',
    icon: '🏢',
    basePrice: 15000,
    teamSize: 8,
    duration: '4-8 ሳምንታት'
  },
  RENOVATION: {
    label: 'ጥገና እና ማደስ',
    icon: '🔨',
    basePrice: 8000,
    teamSize: 5,
    duration: '1-3 ሳምንታት'
  },
  INFRASTRUCTURE: {
    label: 'መሠረተ ልማት',
    icon: '🌉',
    basePrice: 50000,
    teamSize: 12,
    duration: '8-12 ሳምንታት'
  }
});

const CreateBookingScreen = ({ navigation, route }) => {
  // ==================== ENTERPRISE HOOKS ====================
  const { theme, isDark } = useTheme();
  const { user, hasRole, hasPermission } = useAuth();
  const { currentLocation, getEthiopianLocation } = useLocation();
  const { createBooking, validateBooking } = useBookings();
  const { getServiceRecommendations, optimizeBooking } = useAI();

  // ==================== ENTERPRISE STATE MANAGEMENT ====================
  const [currentStep, setCurrentStep] = useState(BOOKING_STEPS.SERVICE_SELECTION);
  const [loading, setLoading] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);
  
  // Booking Data
  const [bookingData, setBookingData] = useState({
    // Basic Info
    type: BOOKING_TYPES.STANDARD,
    serviceId: null,
    serviceCategory: '',
    
    // Project Details
    title: '',
    description: '',
    projectType: '',
    squareMeters: '',
    floorCount: 1,
    
    // Location
    location: {
      region: '',
      city: '',
      subcity: '',
      woreda: '',
      specificLocation: '',
      coordinates: null
    },
    
    // Scheduling
    preferredDate: null,
    preferredTime: '',
    urgency: 'normal',
    timeline: '',
    
    // Budget
    budgetRange: { min: 0, max: 0 },
    estimatedCost: 0,
    paymentMethod: 'chapa',
    
    // Team Requirements
    requiredSkills: [],
    teamSize: 1,
    specialRequirements: '',
    
    // Emergency Specific
    emergencyType: '',
    immediateResponse: false
  });

  // UI State
  const [serviceRecommendations, setServiceRecommendations] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [pricingData, setPricingData] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [quickBookData, setQuickBookData] = useState(null);

  // Refs
  const scrollViewRef = useRef();

  // ==================== ENTERPRISE EFFECTS ====================
  useEffect(() => {
    initializeBookingCreation();
  }, []);

  useEffect(() => {
    if (route.params?.quickBook) {
      handleQuickBooking(route.params);
    }
  }, [route.params]);

  useEffect(() => {
    validateCurrentStep();
    fetchAIRecommendations();
  }, [bookingData, currentStep]);

  // ==================== ENTERPRISE INITIALIZATION ====================
  const initializeBookingCreation = useCallback(async () => {
    try {
      trackScreenView('booking_creation');
      
      // Auto-detect location
      const location = await getEthiopianLocation();
      if (location) {
        setBookingData(prev => ({
          ...prev,
          location: { ...prev.location, ...location }
        }));
      }

      // Pre-fill user data
      if (user) {
        setBookingData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            region: user.location?.region || '',
            city: user.location?.city || ''
          }
        }));
      }

      // Load service recommendations
      await loadServiceRecommendations();

    } catch (error) {
      console.error('Booking creation initialization failed:', error);
      Alert.alert('ስህተት', 'የቦቂንግ መፍጠሪያ አልተሳካም። እባክዎ እንደገና ይሞክሩ።');
    }
  }, [user]);

  const handleQuickBooking = useCallback((params) => {
    const { serviceId, providerId, serviceType, quickData } = params;
    
    setQuickBookData(params);
    
    setBookingData(prev => ({
      ...prev,
      serviceId,
      serviceCategory: serviceType,
      ...quickData
    }));

    // Skip to details step for quick booking
    setCurrentStep(BOOKING_STEPS.DETAILS);
    
    analyticsService.trackEvent('quick_booking_initiated', {
      serviceId,
      serviceType,
      providerId
    });
  }, []);

  // ==================== ENTERPRISE AI FUNCTIONS ====================
  const fetchAIRecommendations = useCallback(async () => {
    if (!bookingData.serviceCategory && !bookingData.type) return;

    setAiOptimizing(true);
    
    try {
      const recommendations = await getServiceRecommendations({
        bookingType: bookingData.type,
        serviceCategory: bookingData.serviceCategory,
        location: bookingData.location,
        budget: bookingData.budgetRange,
        userPreferences: user?.preferences || {}
      });

      setServiceRecommendations(recommendations);

      // Auto-apply relevant recommendations
      if (recommendations.autoApply) {
        applyAIRecommendations(recommendations);
      }
    } catch (error) {
      console.warn('AI recommendations failed:', error);
    } finally {
      setAiOptimizing(false);
    }
  }, [bookingData, user]);

  const applyAIRecommendations = useCallback((recommendations) => {
    setBookingData(prev => ({
      ...prev,
      ...recommendations.optimizedBooking,
      requiredSkills: [...prev.requiredSkills, ...(recommendations.suggestedSkills || [])]
    }));
  }, []);

  const optimizeBookingWithAI = useCallback(async () => {
    setAiOptimizing(true);
    
    try {
      const optimized = await optimizeBooking(bookingData);
      
      setBookingData(prev => ({
        ...prev,
        ...optimized.booking,
        estimatedCost: optimized.costEstimation,
        teamSize: optimized.optimalTeamSize
      }));

      Alert.alert('AI አመቻች', 'ቦቂንግዎ በ AI ተመችቷል!');
    } catch (error) {
      console.warn('AI optimization failed:', error);
    } finally {
      setAiOptimizing(false);
    }
  }, [bookingData]);

  // ==================== ENTERPRISE VALIDATION FUNCTIONS ====================
  const validateCurrentStep = useCallback(async () => {
    const errors = {};

    switch (currentStep) {
      case BOOKING_STEPS.SERVICE_SELECTION:
        if (!bookingData.serviceCategory && !bookingData.type) {
          errors.service = 'አገልግሎት ወይም የቦቂንግ አይነት ይምረጡ';
        }
        break;

      case BOOKING_STEPS.DETAILS:
        if (!bookingData.title?.trim()) {
          errors.title = 'የቦቂንግ ርዕስ ያስፈልጋል';
        }
        if (!bookingData.location.region || !bookingData.location.city) {
          errors.location = 'አድራሻ ያስፈልጋል';
        }
        if (bookingData.type === BOOKING_TYPES.CONSTRUCTION && !bookingData.projectType) {
          errors.projectType = 'የፕሮጀክት አይነት ያስፈልጋል';
        }
        break;

      case BOOKING_STEPS.SCHEDULING:
        if (!bookingData.preferredDate) {
          errors.date = 'ቀን ያስፈልጋል';
        }
        if (bookingData.type === BOOKING_TYPES.CONSTRUCTION && !bookingData.timeline) {
          errors.timeline = 'የፕሮጀክት ጊዜ ያስፈልጋል';
        }
        break;

      case BOOKING_STEPS.BUDGET:
        if (bookingData.budgetRange.max <= 0) {
          errors.budget = 'በጀት ያስፈልጋል';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentStep, bookingData]);

  // ==================== ENTERPRISE BOOKING FUNCTIONS ====================
  const handleNextStep = useCallback(async () => {
    const isValid = await validateCurrentStep();
    
    if (!isValid) {
      Alert.alert('ማረጋገጫ ያስፈልጋል', 'እባክዎ ሁሉንም አስፈላጊ መረጃዎች ያሟሉ');
      return;
    }

    // Special handling for final step
    if (currentStep === BOOKING_STEPS.CONFIRMATION) {
      await createFinalBooking();
      return;
    }

    setCurrentStep(prev => prev + 1);
    
    // Scroll to top on step change
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);

    // Track step progression
    analyticsService.trackEvent('booking_step_completed', {
      step: currentStep,
      bookingType: bookingData.type
    });
  }, [currentStep, bookingData, validateCurrentStep]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > BOOKING_STEPS.SERVICE_SELECTION) {
      setCurrentStep(prev => prev - 1);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [currentStep]);

  const createFinalBooking = useCallback(async () => {
    setLoading(true);

    try {
      // Final validation
      const validation = await validateBooking(bookingData);
      
      if (!validation.valid) {
        Alert.alert('ማረጋገጫ ያስፈልጋል', validation.errors.join('\n'));
        setLoading(false);
        return;
      }

      // Create booking
      const result = await createBooking(bookingData);
      
      if (result.success) {
        await analyticsService.trackEvent('booking_created', {
          bookingId: result.bookingId,
          type: bookingData.type,
          estimatedCost: bookingData.estimatedCost,
          teamSize: bookingData.teamSize
        });

        // Show success and navigate
        showBookingSuccess(result.bookingId);
        
      } else {
        throw new Error(result.message || 'Booking creation failed');
      }
    } catch (error) {
      console.error('Booking creation failed:', error);
      Alert.alert('ስህተት', error.message || 'ቦቂንግ መፍጠር አልተሳካም።');
    } finally {
      setLoading(false);
    }
  }, [bookingData]);

  const showBookingSuccess = useCallback((bookingId) => {
    Alert.alert(
      'በተሳካ ሁኔታ!',
      `ቦቂንግዎ ተፈጥሯል። የቦቂንግ መለያ: ${bookingId}`,
      [
        {
          text: 'የቦቂንግ ዝርዝሮች',
          onPress: () => navigation.navigate('BookingDetail', { id: bookingId })
        },
        {
          text: 'ወደ መነሻ',
          onPress: () => navigation.navigate('Home')
        }
      ]
    );
  }, [navigation]);

  const loadServiceRecommendations = useCallback(async () => {
    try {
      const services = await bookingService.getRecommendedServices({
        userLocation: bookingData.location,
        userHistory: user?.bookingHistory || [],
        preferences: user?.preferences || {}
      });
      
      setServiceRecommendations(services);
    } catch (error) {
      console.warn('Service recommendations load failed:', error);
    }
  }, [bookingData.location, user]);

  const calculateEstimatedCost = useCallback(async () => {
    if (!bookingData.serviceCategory && !bookingData.projectType) return;

    try {
      const cost = await pricingService.estimateCost({
        serviceType: bookingData.serviceCategory || bookingData.projectType,
        location: bookingData.location,
        squareMeters: bookingData.squareMeters,
        teamSize: bookingData.teamSize,
        timeline: bookingData.timeline,
        urgency: bookingData.urgency
      });

      setBookingData(prev => ({
        ...prev,
        estimatedCost: cost.total,
        budgetRange: {
          min: cost.range.min,
          max: cost.range.max
        }
      }));

      setPricingData(cost);
    } catch (error) {
      console.warn('Cost estimation failed:', error);
    }
  }, [bookingData]);

  // ==================== RENDER FUNCTIONS ====================
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Object.values(BOOKING_STEPS).map(step => (
        <View
          key={step}
          style={[
            styles.stepDot,
            step === currentStep && styles.stepDotActive,
            step < currentStep && styles.stepDotCompleted
          ]}
        />
      ))}
    </View>
  );

  const renderServiceSelectionStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        አገልግሎት ይምረጡ
      </ThemedText>

      {/* Booking Type Selection */}
      <View style={styles.bookingTypeSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          የቦቂንግ አይነት
        </ThemedText>
        
        <View style={styles.bookingTypeGrid}>
          {Object.entries(BOOKING_TYPE_CONFIG).map(([type, config]) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.bookingTypeCard,
                bookingData.type === type && styles.bookingTypeCardSelected,
                { borderColor: config.color }
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, type }))}
            >
              <Text style={[styles.bookingTypeIcon, { color: config.color }]}>
                {config.icon}
              </Text>
              <ThemedText type="subtitle" style={styles.bookingTypeLabel}>
                {config.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Service Selection */}
      <ServiceSelector
        selectedService={bookingData.serviceCategory}
        onServiceSelect={(service) => setBookingData(prev => ({ 
          ...prev, 
          serviceCategory: service.id,
          serviceId: service.id
        }))}
        category={bookingData.type === BOOKING_TYPES.CONSTRUCTION ? 'construction' : 'general'}
        recommendations={serviceRecommendations}
        style={styles.serviceSelector}
      />

      {/* AI Recommendations */}
      {serviceRecommendations.length > 0 && (
        <AIServiceRecommendation
          recommendations={serviceRecommendations}
          onApplyRecommendation={applyAIRecommendations}
          style={styles.aiRecommendations}
        />
      )}

      {/* Emergency Booking Quick Access */}
      {bookingData.type === BOOKING_TYPES.EMERGENCY && (
        <EmergencyBookingCard
          onEmergencySelect={(type) => setBookingData(prev => ({
            ...prev,
            emergencyType: type,
            immediateResponse: true,
            urgency: BOOKING_PRIORITY.HIGH
          }))}
          style={styles.emergencyCard}
        />
      )}
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        የቦቂንግ ዝርዝሮች
      </ThemedText>

      {/* Project Title */}
      <Input
        label="የቦቂንግ ርዕስ"
        placeholder="ለምሳሌ: የቤት ግንባታ ፕሮጀክት"
        value={bookingData.title}
        onChangeText={(text) => setBookingData(prev => ({ ...prev, title: text }))}
        error={validationErrors.title}
        containerStyle={styles.inputContainer}
      />

      {/* Description */}
      <Input
        label="ዝርዝር መግለጫ"
        placeholder="ፕሮጀክትዎን ይግለጹ..."
        value={bookingData.description}
        onChangeText={(text) => setBookingData(prev => ({ ...prev, description: text }))}
        multiline
        numberOfLines={4}
        containerStyle={styles.inputContainer}
      />

      {/* Construction Project Wizard */}
      {bookingData.type === BOOKING_TYPES.CONSTRUCTION && (
        <ConstructionProjectWizard
          projectType={bookingData.projectType}
          onProjectTypeChange={(type) => setBookingData(prev => ({ ...prev, projectType: type }))}
          squareMeters={bookingData.squareMeters}
          onSquareMetersChange={(value) => setBookingData(prev => ({ ...prev, squareMeters: value }))}
          floorCount={bookingData.floorCount}
          onFloorCountChange={(count) => setBookingData(prev => ({ ...prev, floorCount: count }))}
          style={styles.projectWizard}
        />
      )}

      {/* Location Picker */}
      <LocationPicker
        value={bookingData.location}
        onChange={(location) => setBookingData(prev => ({ ...prev, location }))}
        regions={ETHIOPIAN_REGIONS}
        cities={ETHIOPIAN_CITIES}
        error={validationErrors.location}
        containerStyle={styles.locationPicker}
      />

      {/* Special Requirements */}
      <Input
        label="ልዩ መስፈርቶች (ከፈለጉ)"
        placeholder="ልዩ የሆኑ መስፈርቶችን ያስገቡ..."
        value={bookingData.specialRequirements}
        onChangeText={(text) => setBookingData(prev => ({ ...prev, specialRequirements: text }))}
        multiline
        numberOfLines={3}
        containerStyle={styles.inputContainer}
      />
    </View>
  );

  const renderSchedulingStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        የጊዜ ሰሌዳ
      </ThemedText>

      {/* Date Selection */}
      <DateTimePicker
        label="ምንጩ የሚፈለግበት ቀን"
        value={bookingData.preferredDate}
        onChange={(date) => setBookingData(prev => ({ ...prev, preferredDate: date }))}
        minDate={new Date()}
        error={validationErrors.date}
        containerStyle={styles.inputContainer}
        ethiopianCalendar={true}
      />

      {/* Timeline for Construction Projects */}
      {bookingData.type === BOOKING_TYPES.CONSTRUCTION && (
        <Input
          label="የፕሮጀክት ጊዜ (በሳምንት)"
          placeholder="ለምሳሌ: 8 ሳምንታት"
          value={bookingData.timeline}
          onChangeText={(text) => setBookingData(prev => ({ ...prev, timeline: text }))}
          keyboardType="number-pad"
          error={validationErrors.timeline}
          containerStyle={styles.inputContainer}
        />
      )}

      {/* Urgency Selection */}
      <View style={styles.urgencySection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          አስቸኳይነት
        </ThemedText>
        
        <View style={styles.urgencyOptions}>
          {[
            { value: 'low', label: 'ዝግታ', color: COLORS.semantic.success.main },
            { value: 'normal', label: 'መደበኛ', color: COLORS.semantic.info.main },
            { value: 'high', label: 'ከፍተኛ', color: COLORS.semantic.warning.main },
            { value: 'urgent', label: 'አስቸኳይ', color: COLORS.semantic.error.main }
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.urgencyOption,
                bookingData.urgency === option.value && styles.urgencyOptionSelected,
                { borderColor: option.color }
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, urgency: option.value }))}
            >
              <View style={[styles.urgencyDot, { backgroundColor: option.color }]} />
              <ThemedText type="caption">{option.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* AI Optimization Button */}
      <Button
        title={aiOptimizing ? "AI አመቻች በሂደት..." : "በ AI አመቻች"}
        onPress={optimizeBookingWithAI}
        type="outline"
        loading={aiOptimizing}
        style={styles.aiOptimizeButton}
      />
    </View>
  );

  const renderBudgetStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        በጀት እና ክፍያ
      </ThemedText>

      {/* Budget Estimator */}
      <BudgetEstimator
        bookingType={bookingData.type}
        serviceCategory={bookingData.serviceCategory}
        projectType={bookingData.projectType}
        squareMeters={bookingData.squareMeters}
        teamSize={bookingData.teamSize}
        timeline={bookingData.timeline}
        location={bookingData.location}
        onCostCalculate={calculateEstimatedCost}
        onBudgetChange={(range) => setBookingData(prev => ({ ...prev, budgetRange: range }))}
        estimatedCost={bookingData.estimatedCost}
        pricingData={pricingData}
        style={styles.budgetEstimator}
      />

      {/* Payment Method */}
      <View style={styles.paymentSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          የክፍያ ዘዴ
        </ThemedText>
        
        <View style={styles.paymentOptions}>
          {[
            { id: 'chapa', label: 'Chapa', icon: '💳' },
            { id: 'telebirr', label: 'Telebirr', icon: '📱' },
            { id: 'cbe_birr', label: 'CBE Birr', icon: '🏦' },
            { id: 'cash', label: 'ካሽ', icon: '💰' }
          ].map(method => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentOption,
                bookingData.paymentMethod === method.id && styles.paymentOptionSelected
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, paymentMethod: method.id }))}
            >
              <Text style={styles.paymentIcon}>{method.icon}</Text>
              <ThemedText type="caption">{method.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cost Breakdown */}
      {pricingData && (
        <View style={styles.costBreakdown}>
          <ThemedText type="subtitle" style={styles.costTitle}>
            የወጪ ዝርዝር
          </ThemedText>
          {pricingData.breakdown?.map((item, index) => (
            <View key={index} style={styles.costItem}>
              <ThemedText type="caption">{item.item}</ThemedText>
              <ThemedText type="caption">{item.cost} ETB</ThemedText>
            </View>
          ))}
          <View style={styles.totalCost}>
            <ThemedText type="subtitle">ጠቅላላ:</ThemedText>
            <ThemedText type="subtitle">{pricingData.total} ETB</ThemedText>
          </View>
        </View>
      )}
    </View>
  );

  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        ማረጋገጫ
      </ThemedText>

      {/* Booking Summary */}
      <View style={styles.bookingSummary}>
        <ThemedText type="subtitle" style={styles.summaryTitle}>
          የቦቂንግ ማጠቃለያ
        </ThemedText>
        
        <View style={styles.summaryItem}>
          <ThemedText type="caption">ዓይነት:</ThemedText>
          <ThemedText type="caption" style={styles.summaryValue}>
            {BOOKING_TYPE_CONFIG[bookingData.type]?.label}
          </ThemedText>
        </View>
        
        <View style={styles.summaryItem}>
          <ThemedText type="caption">አድራሻ:</ThemedText>
          <ThemedText type="caption" style={styles.summaryValue}>
            {bookingData.location.city}, {bookingData.location.region}
          </ThemedText>
        </View>
        
        <View style={styles.summaryItem}>
          <ThemedText type="caption">ቀን:</ThemedText>
          <ThemedText type="caption" style={styles.summaryValue}>
            {bookingData.preferredDate?.toLocaleDateString('am-ET')}
          </ThemedText>
        </View>
        
        <View style={styles.summaryItem}>
          <ThemedText type="caption">የተገመተ ወጪ:</ThemedText>
          <ThemedText type="caption" style={styles.summaryValue}>
            {bookingData.estimatedCost} ETB
          </ThemedText>
        </View>
        
        {bookingData.teamSize > 1 && (
          <View style={styles.summaryItem}>
            <ThemedText type="caption">የቡድን መጠን:</ThemedText>
            <ThemedText type="caption" style={styles.summaryValue}>
              {bookingData.teamSize} ሰራተኞች
            </ThemedText>
          </View>
        )}
      </View>

      {/* Final Notes */}
      <View style={styles.finalNotes}>
        <ThemedText type="caption" style={styles.notesTitle}>
          ማስታወሻ:
        </ThemedText>
        <ThemedText type="caption">
          • ቦቂንግዎ ከተፈጠረ በኋላ ማረጋገጫ ይላክሎታል
        </ThemedText>
        <ThemedText type="caption">
          • የክፍያ ዝርዝሮች በቦቂንግ ማረጋገጫ ውስጥ ይገኛሉ
        </ThemedText>
        <ThemedText type="caption">
          • ለማንኛውም ለውጥ የደንበኛ አገልግሎት ያግኙ
        </ThemedText>
      </View>
    </View>
  );

  // ==================== MAIN RENDER ====================
  const renderCurrentStep = () => {
    switch (currentStep) {
      case BOOKING_STEPS.SERVICE_SELECTION:
        return renderServiceSelectionStep();
      case BOOKING_STEPS.DETAILS:
        return renderDetailsStep();
      case BOOKING_STEPS.SCHEDULING:
        return renderSchedulingStep();
      case BOOKING_STEPS.BUDGET:
        return renderBudgetStep();
      case BOOKING_STEPS.CONFIRMATION:
        return renderConfirmationStep();
      default:
        return renderServiceSelectionStep();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Step Indicator */}
        {renderStepIndicator()}

        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          {currentStep > BOOKING_STEPS.SERVICE_SELECTION && (
            <Button
              title="ወደ ኋላ"
              onPress={handlePreviousStep}
              type="outline"
              style={styles.navButton}
            />
          )}
          
          <Button
            title={
              currentStep === BOOKING_STEPS.CONFIRMATION
                ? (loading ? "ቦቂንግ በመፍጠር ላይ..." : "ቦቂንግ ፍጠር")
                : "ቀጣይ"
            }
            onPress={handleNextStep}
            loading={loading}
            style={styles.navButton}
            disabled={Object.keys(validationErrors).length > 0}
          />
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

// ==================== ENTERPRISE STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border.primary,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary.main,
    width: 20,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.semantic.success.main,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  stepContainer: {
    flex: 1,
    paddingBottom: SPACING.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontSize: 24,
    fontWeight: '700',
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  bookingTypeSection: {
    marginBottom: SPACING.xl,
  },
  bookingTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  bookingTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bookingTypeCardSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light + '20',
  },
  bookingTypeIcon: {
    fontSize: 24,
    marginBottom: SPACING.sm,
  },
  bookingTypeLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  serviceSelector: {
    marginBottom: SPACING.xl,
  },
  aiRecommendations: {
    marginBottom: SPACING.lg,
  },
  emergencyCard: {
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  projectWizard: {
    marginBottom: SPACING.lg,
  },
  locationPicker: {
    marginBottom: SPACING.lg,
  },
  urgencySection: {
    marginBottom: SPACING.xl,
  },
  urgencyOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  urgencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  urgencyOptionSelected: {
    borderColor: COLORS.primary.main,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  aiOptimizeButton: {
    marginBottom: SPACING.lg,
  },
  budgetEstimator: {
    marginBottom: SPACING.xl,
  },
  paymentSection: {
    marginBottom: SPACING.xl,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.primary,
  },
  paymentOptionSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light + '20',
  },
  paymentIcon: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  costBreakdown: {
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.lg,
    borderRadius: 8,
  },
  costTitle: {
    marginBottom: SPACING.md,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  totalCost: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.primary,
  },
  bookingSummary: {
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  summaryTitle: {
    marginBottom: SPACING.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryValue: {
    fontWeight: '600',
  },
  finalNotes: {
    backgroundColor: COLORS.semantic.info.light + '20',
    padding: SPACING.md,
    borderRadius: 8,
  },
  notesTitle: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  navigation: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  navButton: {
    flex: 1,
  },
});

export default CreateBookingScreen;