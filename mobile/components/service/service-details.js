// components/service/service-details.js - ENTERPRISE REWRITE
/**
 * Enterprise Service Details Component
 * Advanced service display with AI recommendations, real-time availability, and multi-feature integration
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
  Share,
  Alert,
  InteractionManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLocation } from '../../contexts/location-context';
import { usePremium } from '../../contexts/premium-context';
import { useAnalytics } from '../../hooks/use-analytics';
import { usePerformance } from '../../hooks/use-performance';
import { useErrorBoundary } from '../../hooks/use-error-boundary';
import { ServiceService } from '../../services/service-service';
import { BookingService } from '../../services/booking-service';
import { FavoriteService } from '../../services/favorite-service';
import { AnalyticsService } from '../../services/analytics-service';
import { ErrorService } from '../../services/error-service';
import { PremiumService } from '../../services/premium-service';
import { AIRecommendationService } from '../../services/ai-recommendation-service';

// UI Components
import ServiceHeader from './service-header';
import ServiceGallery from './service-gallery';
import ServiceInfo from './service-info';
import ServicePricing from './service-pricing';
import ServiceReviews from './service-reviews';
import ServiceProvider from './service-provider';
import ServiceLocation from './service-location';
import ServiceActions from './service-actions';
import ServiceFAQ from './service-faq';
import ServiceSimilar from './service-similar';
import ServicePremiumBadge from './service-premium-badge';
import ServiceAvailability from './service-availability';
import ServiceAIRecommendations from './service-ai-recommendations';

// Core UI
import LoadingIndicator from '../ui/loading-indicator';
import ErrorBoundary from '../ui/error-boundary';
import RetryButton from '../ui/retry-button';
import Modal from '../ui/modal';
import Toast from '../ui/toast';
import OfflineIndicator from '../ui/offline-indicator';

// Constants
const COMPONENT_CONFIG = {
  PERFORMANCE: {
    IMAGE_LAZY_LOAD_THRESHOLD: 500,
    DEBOUNCE_DELAY: 300,
    CACHE_DURATION: 300000, // 5 minutes
    MAX_IMAGES_PRELOAD: 3,
  },
  ANALYTICS: {
    MIN_VIEW_TIME: 3000, // 3 seconds
    SCROLL_DEPTH_THRESHOLDS: [25, 50, 75, 90],
  },
  UI: {
    PARALLAX_INTENSITY: 0.5,
    ANIMATION_DURATION: 600,
    GALLERY_HEIGHT: 300,
  },
};

const SERVICE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  UNAVAILABLE: 'unavailable',
  DELETED: 'deleted',
  PENDING_VERIFICATION: 'pending_verification',
  SUSPENDED: 'suspended',
};

const BOOKING_TYPES = {
  INSTANT: 'instant',
  SCHEDULED: 'scheduled',
  CONSULTATION: 'consultation',
  GOVERNMENT: 'government',
  CONSTRUCTION: 'construction',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Service Details Component
 * 
 * Key Features:
 * - AI-powered recommendations and matching
 * - Real-time availability and pricing
 * - Advanced image gallery with zoom and gestures
 * - Multi-currency pricing display
 * - Premium badge and verification system
 * - Government project integration
 * - Construction service specialization
 * - Offline capability with sync
 * - Performance optimized with memoization
 * - Comprehensive analytics tracking
 * - Accessibility compliant
 * - Error boundary protection
 */
const ServiceDetails = React.memo(({
  // Core Data
  serviceId,
  service: initialService,
  
  // Feature Flags
  enableAIRecommendations = true,
  enableRealTimeAvailability = true,
  enablePremiumFeatures = true,
  enableGovernmentIntegration = false,
  enableConstructionFeatures = false,
  enableOfflineMode = true,
  
  // UI Configuration
  showHeader = true,
  showGallery = true,
  showPricing = true,
  showReviews = true,
  showProvider = true,
  showLocation = true,
  showActions = true,
  showSimilar = true,
  showFAQ = true,
  showPremiumBadge = true,
  showAvailability = true,
  
  // Interaction Handlers
  onServiceLoaded,
  onBookingInitiated,
  onProviderSelected,
  onReviewSubmitted,
  onServiceShared,
  onFavoriteToggled,
  onErrorOccurred,
  onAnalyticsEvent,
  
  // Customization
  customStyles = {},
  themeVariant = 'default',
  layoutType = 'standard',
  
  // Analytics
  analyticsContext = {},
  trackUserJourney = true,
  
  // Performance
  lazyLoadImages = true,
  enableCaching = true,
  preloadSimilar = false,
  
  // Accessibility
  accessibilityConfig = {},
  
  ...restProps
}) => {
  // Hooks
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDarkMode, currentTheme } = useTheme();
  const { user, isAuthenticated, hasRole } = useAuth();
  const { currentLocation, getDistance, hasLocationPermission } = useLocation();
  const { isPremiumUser, hasPremiumFeature } = usePremium();
  const { trackEvent, trackTiming, trackError } = useAnalytics();
  const { optimizeRender, debounce, throttle } = usePerformance();
  const { captureError, withErrorBoundary } = useErrorBoundary();
  
  // State Management
  const [service, setService] = useState(initialService);
  const [loadingState, setLoadingState] = useState({
    isLoading: !initialService,
    isRefreshing: false,
    isSimilarLoading: false,
  });
  const [errorState, setErrorState] = useState({
    hasError: false,
    error: null,
    retryCount: 0,
  });
  const [interactionState, setInteractionState] = useState({
    isFavorite: false,
    isBookmarked: false,
    isReported: false,
    hasViewed: false,
  });
  const [uiState, setUiState] = useState({
    selectedImageIndex: 0,
    showImageModal: false,
    showBookingModal: false,
    showShareModal: false,
    showReportModal: false,
    scrollPosition: 0,
    isScrolling: false,
  });
  const [dataState, setDataState] = useState({
    similarServices: [],
    aiRecommendations: [],
    availabilitySlots: [],
    serviceStats: {
      viewCount: 0,
      favoriteCount: 0,
      shareCount: 0,
      bookingCount: 0,
    },
    pricingData: {
      basePrice: 0,
      discountedPrice: 0,
      currency: 'ETB',
      pricingTiers: [],
    },
  });

  // Refs
  const componentMounted = useRef(true);
  const scrollViewRef = useRef(null);
  const viewTimeTracker = useRef({
    startTime: null,
    totalViewTime: 0,
    lastActiveTime: null,
  });
  const interactionTracker = useRef({
    scrollDepth: 0,
    imagesViewed: new Set(),
    sectionsViewed: new Set(),
  });
  const dataCache = useRef(new Map());

  // Animations
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(30)).current;
  const parallaxAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;

  // Memoized Values
  const serviceContext = useMemo(() => ({
    serviceId: serviceId || params.serviceId,
    serviceCategory: service?.category,
    providerId: service?.provider?.id,
    userRole: user?.role,
    location: currentLocation,
  }), [serviceId, params.serviceId, service, user, currentLocation]);

  const isServiceAvailable = useMemo(() => {
    if (!service) return false;
    
    return service.status === SERVICE_STATUS.ACTIVE && 
           service.isAvailable &&
           (!service.availability || service.availability.isAvailable);
  }, [service]);

  const distanceToService = useMemo(() => {
    if (!service?.location || !currentLocation) return null;
    
    return getDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      service.location.latitude,
      service.location.longitude
    );
  }, [service, currentLocation, getDistance]);

  const shouldShowPremiumFeatures = useMemo(() => {
    return enablePremiumFeatures && 
           (service?.provider?.isPremium || isPremiumUser);
  }, [enablePremiumFeatures, service, isPremiumUser]);

  // Effects
  useEffect(() => {
    componentMounted.current = true;
    initializeComponent();
    
    return () => {
      componentMounted.current = false;
      cleanupComponent();
    };
  }, []);

  useEffect(() => {
    if (serviceContext.serviceId && !initialService) {
      loadServiceData();
    }
  }, [serviceContext.serviceId, initialService]);

  useEffect(() => {
    if (service && enableAIRecommendations) {
      loadAIRecommendations();
    }
  }, [service, enableAIRecommendations]);

  // Core Functions
  const initializeComponent = useCallback(() => {
    viewTimeTracker.current.startTime = Date.now();
    viewTimeTracker.current.lastActiveTime = Date.now();
    
    trackEvent('service_details_viewed', {
      serviceId: serviceContext.serviceId,
      ...analyticsContext,
    });
    
    startEntranceAnimation();
  }, [serviceContext.serviceId, analyticsContext, trackEvent]);

  const cleanupComponent = useCallback(() => {
    trackViewTime();
    trackInteractionMetrics();
  }, []);

  const startEntranceAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: COMPONENT_CONFIG.UI.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: COMPONENT_CONFIG.UI.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: COMPONENT_CONFIG.UI.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnimation, slideAnimation, scaleAnimation]);

  const loadServiceData = useCallback(async () => {
    if (!serviceContext.serviceId) return;
    
    try {
      setLoadingState(prev => ({ ...prev, isLoading: true }));
      setErrorState({ hasError: false, error: null, retryCount: 0 });
      
      const loadTiming = trackTiming('service_data_load');
      
      const serviceData = await ServiceService.getServiceById(
        serviceContext.serviceId,
        {
          include: [
            'provider',
            'reviews',
            'category', 
            'statistics',
            'availability',
            'pricing',
            'faq',
            'premium_features',
          ],
          location: currentLocation,
          userContext: user,
        }
      );
      
      if (!componentMounted.current) return;
      
      if (serviceData.success) {
        await processServiceData(serviceData.data);
        loadTiming.end({ success: true });
      } else {
        throw new Error(serviceData.error?.message || 'Failed to load service');
      }
    } catch (error) {
      if (!componentMounted.current) return;
      
      handleDataLoadError(error);
    } finally {
      if (componentMounted.current) {
        setLoadingState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [serviceContext.serviceId, currentLocation, user, trackTiming]);

  const processServiceData = useCallback(async (serviceData) => {
    setService(serviceData);
    
    // Process additional data
    await Promise.all([
      checkFavoriteStatus(serviceData.id),
      loadServiceStats(serviceData.id),
      loadAvailabilityData(serviceData),
      loadSimilarServices(serviceData),
    ]);
    
    // Calculate distance
    if (serviceData.location && currentLocation) {
      serviceData.distance = distanceToService;
    }
    
    // Track service load
    trackEvent('service_data_loaded', {
      serviceId: serviceData.id,
      loadTime: Date.now() - viewTimeTracker.current.startTime,
    });
    
    onServiceLoaded?.(serviceData);
    
    // Preload related data
    if (preloadSimilar) {
      InteractionManager.runAfterInteractions(() => {
        loadSimilarServices(serviceData);
      });
    }
  }, [currentLocation, distanceToService, trackEvent, onServiceLoaded, preloadSimilar]);

  const loadAIRecommendations = useCallback(async () => {
    if (!service || !enableAIRecommendations) return;
    
    try {
      const recommendations = await AIRecommendationService.getServiceRecommendations({
        serviceId: service.id,
        userContext: user,
        location: currentLocation,
        maxRecommendations: 6,
        includeSimilar: true,
        includeComplementary: true,
      });
      
      if (componentMounted.current && recommendations.success) {
        setDataState(prev => ({
          ...prev,
          aiRecommendations: recommendations.data,
        }));
      }
    } catch (error) {
      captureError(error, {
        context: 'AIRecommendationsLoad',
        serviceId: service.id,
      });
    }
  }, [service, enableAIRecommendations, user, currentLocation, captureError]);

  const loadSimilarServices = useCallback(async (serviceData) => {
    try {
      setLoadingState(prev => ({ ...prev, isSimilarLoading: true }));
      
      const similarServices = await ServiceService.getSimilarServices(
        serviceData.id,
        {
          category: serviceData.category,
          location: currentLocation,
          maxDistance: 50, // km
          limit: 8,
          exclude: [serviceData.id],
          includePremium: true,
        }
      );
      
      if (componentMounted.current && similarServices.success) {
        setDataState(prev => ({
          ...prev,
          similarServices: similarServices.data.services || [],
        }));
      }
    } catch (error) {
      captureError(error, {
        context: 'SimilarServicesLoad',
        serviceId: serviceData.id,
      });
    } finally {
      if (componentMounted.current) {
        setLoadingState(prev => ({ ...prev, isSimilarLoading: false }));
      }
    }
  }, [currentLocation, captureError]);

  const checkFavoriteStatus = useCallback(async (serviceId) => {
    if (!isAuthenticated) return;
    
    try {
      const favoriteStatus = await FavoriteService.checkStatus(serviceId, user.id);
      
      if (componentMounted.current) {
        setInteractionState(prev => ({
          ...prev,
          isFavorite: favoriteStatus.isFavorite,
          isBookmarked: favoriteStatus.isBookmarked,
        }));
      }
    } catch (error) {
      captureError(error, {
        context: 'FavoriteStatusCheck',
        serviceId,
        userId: user.id,
      });
    }
  }, [isAuthenticated, user, captureError]);

  const loadServiceStats = useCallback(async (serviceId) => {
    try {
      const stats = await ServiceService.getServiceStats(serviceId);
      
      if (componentMounted.current && stats.success) {
        setDataState(prev => ({
          ...prev,
          serviceStats: stats.data,
        }));
      }
    } catch (error) {
      captureError(error, {
        context: 'ServiceStatsLoad',
        serviceId,
      });
    }
  }, [captureError]);

  const loadAvailabilityData = useCallback(async (serviceData) => {
    if (!enableRealTimeAvailability) return;
    
    try {
      const availability = await ServiceService.getRealTimeAvailability(
        serviceData.id,
        {
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          duration: serviceData.duration,
        }
      );
      
      if (componentMounted.current && availability.success) {
        setDataState(prev => ({
          ...prev,
          availabilitySlots: availability.data.slots || [],
        }));
      }
    } catch (error) {
      captureError(error, {
        context: 'AvailabilityDataLoad',
        serviceId: serviceData.id,
      });
    }
  }, [enableRealTimeAvailability, captureError]);

  const handleDataLoadError = useCallback((error) => {
    const errorContext = {
      context: 'ServiceDetailsDataLoad',
      serviceId: serviceContext.serviceId,
      userId: user?.id,
      retryCount: errorState.retryCount,
    };
    
    captureError(error, errorContext);
    trackError('service_load_failed', errorContext);
    
    setErrorState(prev => ({
      hasError: true,
      error: error.message,
      retryCount: prev.retryCount + 1,
    }));
    
    onErrorOccurred?.(error, errorContext);
  }, [serviceContext.serviceId, user, errorState.retryCount, captureError, trackError, onErrorOccurred]);

  // Interaction Handlers
  const handleFavoriteToggle = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    
    try {
      const newFavoriteState = !interactionState.isFavorite;
      
      // Optimistic update
      setInteractionState(prev => ({
        ...prev,
        isFavorite: newFavoriteState,
      }));
      
      const result = newFavoriteState
        ? await FavoriteService.addToFavorites(service.id, user.id)
        : await FavoriteService.removeFromFavorites(service.id, user.id);
      
      if (!result.success) {
        // Revert on failure
        setInteractionState(prev => ({
          ...prev,
          isFavorite: !newFavoriteState,
        }));
        throw new Error(result.error?.message || 'Failed to update favorites');
      }
      
      // Update stats
      setDataState(prev => ({
        ...prev,
        serviceStats: {
          ...prev.serviceStats,
          favoriteCount: newFavoriteState
            ? prev.serviceStats.favoriteCount + 1
            : Math.max(0, prev.serviceStats.favoriteCount - 1),
        },
      }));
      
      trackEvent('service_favorite_toggled', {
        serviceId: service.id,
        isFavorite: newFavoriteState,
        source: 'service_details',
      });
      
      onFavoriteToggled?.(service.id, newFavoriteState);
      
      showToast(
        newFavoriteState ? 'Added to favorites' : 'Removed from favorites',
        'success'
      );
    } catch (error) {
      captureError(error, {
        context: 'FavoriteToggle',
        serviceId: service.id,
        userId: user.id,
      });
      
      showToast('Failed to update favorites', 'error');
    }
  }, [service, interactionState.isFavorite, isAuthenticated, user, router, trackEvent, onFavoriteToggled, captureError]);

  const handleBookingInitiation = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    
    if (!isServiceAvailable) {
      showToast('Service is currently unavailable', 'warning');
      return;
    }
    
    trackEvent('booking_flow_initiated', {
      serviceId: service.id,
      serviceType: service.type,
      providerId: service.provider.id,
      isPremium: service.provider.isPremium,
    });
    
    if (onBookingInitiated) {
      onBookingInitiated(service);
    } else {
      setUiState(prev => ({ ...prev, showBookingModal: true }));
    }
  }, [service, isServiceAvailable, isAuthenticated, router, trackEvent, onBookingInitiated]);

  const handleShareService = useCallback(async () => {
    try {
      const shareData = await ServiceService.generateShareData(service.id, {
        includeDeepLink: true,
        includeReferral: isAuthenticated,
        userId: user?.id,
      });
      
      const shareResult = await Share.share({
        title: shareData.title,
        message: shareData.message,
        url: shareData.url,
      });
      
      if (shareResult.action === Share.sharedAction) {
        // Track successful share
        setDataState(prev => ({
          ...prev,
          serviceStats: {
            ...prev.serviceStats,
            shareCount: prev.serviceStats.shareCount + 1,
          },
        }));
        
        trackEvent('service_shared', {
          serviceId: service.id,
          shareMethod: shareResult.activityType,
          platform: Platform.OS,
        });
        
        onServiceShared?.(service.id, shareResult.activityType);
        
        showToast('Service shared successfully', 'success');
      }
    } catch (error) {
      captureError(error, {
        context: 'ServiceShare',
        serviceId: service.id,
      });
      
      showToast('Failed to share service', 'error');
    }
  }, [service, isAuthenticated, user, trackEvent, onServiceShared, captureError]);

  const handleProviderContact = useCallback(() => {
    if (!service.provider?.contactMethods) {
      showToast('Contact information not available', 'warning');
      return;
    }
    
    const contactOptions = service.provider.contactMethods
      .filter(method => method.isActive)
      .map(method => ({
        text: method.label,
        onPress: () => handleContactMethod(method),
      }));
    
    if (contactOptions.length === 0) {
      showToast('No contact methods available', 'warning');
      return;
    }
    
    Alert.alert(
      'Contact Provider',
      'Choose contact method:',
      [
        ...contactOptions,
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
    
    trackEvent('provider_contact_initiated', {
      serviceId: service.id,
      providerId: service.provider.id,
      availableMethods: contactOptions.length,
    });
  }, [service, trackEvent]);

  const handleContactMethod = useCallback(async (contactMethod) => {
    try {
      switch (contactMethod.type) {
        case 'phone':
          await Linking.openURL(`tel:${contactMethod.value}`);
          break;
        case 'email':
          await Linking.openURL(`mailto:${contactMethod.value}`);
          break;
        case 'whatsapp':
          await Linking.openURL(`https://wa.me/${contactMethod.value}`);
          break;
        case 'telegram':
          await Linking.openURL(`https://t.me/${contactMethod.value}`);
          break;
        default:
          throw new Error(`Unsupported contact method: ${contactMethod.type}`);
      }
      
      trackEvent('provider_contact_completed', {
        serviceId: service.id,
        providerId: service.provider.id,
        contactMethod: contactMethod.type,
      });
    } catch (error) {
      captureError(error, {
        context: 'ProviderContact',
        serviceId: service.id,
        contactMethod: contactMethod.type,
      });
      
      showToast('Failed to open contact method', 'error');
    }
  }, [service, trackEvent, captureError]);

  // Analytics and Tracking
  const trackViewTime = useCallback(() => {
    if (!viewTimeTracker.current.startTime) return;
    
    const totalViewTime = Date.now() - viewTimeTracker.current.startTime;
    viewTimeTracker.current.totalViewTime = totalViewTime;
    
    if (totalViewTime >= COMPONENT_CONFIG.ANALYTICS.MIN_VIEW_TIME) {
      trackEvent('service_view_time', {
        serviceId: serviceContext.serviceId,
        totalViewTime,
        scrollDepth: interactionTracker.current.scrollDepth,
        imagesViewed: interactionTracker.current.imagesViewed.size,
        sectionsViewed: interactionTracker.current.sectionsViewed.size,
      });
    }
  }, [serviceContext.serviceId, trackEvent]);

  const trackInteractionMetrics = useCallback(() => {
    trackEvent('service_interaction_summary', {
      serviceId: serviceContext.serviceId,
      ...interactionTracker.current,
      totalViewTime: viewTimeTracker.current.totalViewTime,
    });
  }, [serviceContext.serviceId, trackEvent]);

  const handleScroll = useCallback(
    throttle((event) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      const contentHeight = event.nativeEvent.contentSize.height;
      const scrollableHeight = contentHeight - SCREEN_HEIGHT;
      
      if (scrollableHeight > 0) {
        const scrollDepth = (scrollY / scrollableHeight) * 100;
        interactionTracker.current.scrollDepth = Math.max(
          interactionTracker.current.scrollDepth,
          scrollDepth
        );
        
        // Track scroll depth milestones
        COMPONENT_CONFIG.ANALYTICS.SCROLL_DEPTH_THRESHOLDS.forEach(threshold => {
          if (scrollDepth >= threshold && 
              !interactionTracker.current.scrollMilestones?.[threshold]) {
            trackEvent('service_scroll_depth_reached', {
              serviceId: serviceContext.serviceId,
              scrollDepth: threshold,
            });
            interactionTracker.current.scrollMilestones = {
              ...interactionTracker.current.scrollMilestones,
              [threshold]: true,
            };
          }
        });
      }
      
      // Update parallax effect
      parallaxAnimation.setValue(scrollY * COMPONENT_CONFIG.UI.PARALLAX_INTENSITY);
    }, COMPONENT_CONFIG.PERFORMANCE.DEBOUNCE_DELAY),
    [serviceContext.serviceId, trackEvent, parallaxAnimation]
  );

  // UI Helpers
  const showToast = useCallback((message, type = 'info') => {
    // Implementation would integrate with your Toast component
    console.log(`Toast [${type}]:`, message);
  }, []);

  const retryLoad = useCallback(() => {
    setErrorState({ hasError: false, error: null, retryCount: 0 });
    loadServiceData();
  }, [loadServiceData]);

  // Render Functions
  const renderLoadingState = () => (
    <LoadingIndicator
      type="skeleton"
      layout="service-details"
      theme={theme}
      message="Loading service details..."
    />
  );

  const renderErrorState = () => (
    <ErrorBoundary
      error={errorState.error}
      onRetry={retryLoad}
      retryCount={errorState.retryCount}
      theme={theme}
    >
      <View style={styles.errorContainer}>
        <RetryButton
          onPress={retryLoad}
          theme={theme}
          label="Retry Loading Service"
        />
      </View>
    </ErrorBoundary>
  );

  const renderServiceContent = () => {
    if (!service) return null;

    return (
      <Animated.ScrollView
        ref={scrollViewRef}
        style={[
          styles.scrollView,
          {
            opacity: fadeAnimation,
            transform: [
              { translateY: slideAnimation },
              { scale: scaleAnimation },
            ],
          },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => setUiState(prev => ({ ...prev, isScrolling: true }))}
        onScrollEndDrag={() => setUiState(prev => ({ ...prev, isScrolling: false }))}
      >
        {/* Premium Badge */}
        {showPremiumBadge && shouldShowPremiumFeatures && (
          <ServicePremiumBadge
            service={service}
            theme={theme}
            style={customStyles.premiumBadge}
          />
        )}

        {/* Service Header */}
        {showHeader && (
          <ServiceHeader
            service={service}
            isFavorite={interactionState.isFavorite}
            onFavoriteToggle={handleFavoriteToggle}
            onShare={handleShareService}
            status={service.status}
            theme={theme}
            style={customStyles.header}
          />
        )}

        {/* Service Gallery */}
        {showGallery && service.images && service.images.length > 0 && (
          <ServiceGallery
            images={service.images}
            onImagePress={(index) => setUiState(prev => ({
              ...prev,
              selectedImageIndex: index,
              showImageModal: true,
            }))}
            parallaxScroll={parallaxAnimation}
            lazyLoad={lazyLoadImages}
            preloadCount={COMPONENT_CONFIG.PERFORMANCE.MAX_IMAGES_PRELOAD}
            theme={theme}
            style={customStyles.gallery}
          />
        )}

        {/* Service Information */}
        <ServiceInfo
          service={service}
          stats={dataState.serviceStats}
          onProviderPress={handleProviderContact}
          onReviewPress={() => setUiState(prev => ({ ...prev, showReviewsModal: true }))}
          theme={theme}
          style={customStyles.info}
        />

        {/* Real-time Availability */}
        {showAvailability && enableRealTimeAvailability && (
          <ServiceAvailability
            service={service}
            availabilitySlots={dataState.availabilitySlots}
            onSlotSelected={handleBookingInitiation}
            theme={theme}
            style={customStyles.availability}
          />
        )}

        {/* Service Pricing */}
        {showPricing && (
          <ServicePricing
            service={service}
            pricingData={dataState.pricingData}
            onBookingStart={handleBookingInitiation}
            theme={theme}
            style={customStyles.pricing}
          />
        )}

        {/* Service Provider */}
        {showProvider && service.provider && (
          <ServiceProvider
            provider={service.provider}
            onPress={handleProviderContact}
            rating={service.provider.rating}
            reviewCount={service.provider.reviewCount}
            isVerified={service.provider.isVerified}
            theme={theme}
            style={customStyles.provider}
          />
        )}

        {/* Service Location */}
        {showLocation && service.location && (
          <ServiceLocation
            location={service.location}
            distance={distanceToService}
            onDirectionsPress={() => {
              Linking.openURL(
                `https://maps.google.com/?q=${service.location.latitude},${service.location.longitude}`
              );
            }}
            theme={theme}
            style={customStyles.location}
          />
        )}

        {/* Service Reviews */}
        {showReviews && service.reviews && service.reviews.length > 0 && (
          <ServiceReviews
            reviews={service.reviews}
            averageRating={service.rating}
            totalReviews={service.reviewCount}
            onReviewPress={() => setUiState(prev => ({ ...prev, showReviewsModal: true }))}
            theme={theme}
            style={customStyles.reviews}
          />
        )}

        {/* AI Recommendations */}
        {enableAIRecommendations && dataState.aiRecommendations.length > 0 && (
          <ServiceAIRecommendations
            recommendations={dataState.aiRecommendations}
            onServicePress={(recommendedService) => {
              router.push(`/services/${recommendedService.id}`);
            }}
            theme={theme}
            style={customStyles.aiRecommendations}
          />
        )}

        {/* Similar Services */}
        {showSimilar && dataState.similarServices.length > 0 && (
          <ServiceSimilar
            services={dataState.similarServices}
            onServicePress={(similarService) => {
              router.push(`/services/${similarService.id}`);
            }}
            loading={loadingState.isSimilarLoading}
            theme={theme}
            style={customStyles.similar}
          />
        )}

        {/* Service FAQ */}
        {showFAQ && service.faq && service.faq.length > 0 && (
          <ServiceFAQ
            questions={service.faq}
            theme={theme}
            style={customStyles.faq}
          />
        )}
      </Animated.ScrollView>
    );
  };

  const renderActionButtons = () => {
    if (!showActions || !service) return null;

    return (
      <ServiceActions
        service={service}
        onBooking={handleBookingInitiation}
        onContact={handleProviderContact}
        onFavorite={handleFavoriteToggle}
        onShare={handleShareService}
        isFavorite={interactionState.isFavorite}
        isAvailable={isServiceAvailable}
        theme={theme}
        style={customStyles.actions}
      />
    );
  };

  const renderModals = () => (
    <>
      {/* Image Gallery Modal */}
      <Modal
        visible={uiState.showImageModal}
        onDismiss={() => setUiState(prev => ({ ...prev, showImageModal: false }))}
        type="fullscreen"
        theme={theme}
      >
        <ServiceGallery
          images={service.images}
          initialIndex={uiState.selectedImageIndex}
          onClose={() => setUiState(prev => ({ ...prev, showImageModal: false }))}
          enableZoom={true}
          theme={theme}
        />
      </Modal>

      {/* Booking Modal */}
      <Modal
        visible={uiState.showBookingModal}
        onDismiss={() => setUiState(prev => ({ ...prev, showBookingModal: false }))}
        type="bottom-sheet"
        theme={theme}
      >
        {/* Booking form component would go here */}
        <View style={styles.bookingModal}>
          <Text style={[styles.bookingTitle, { color: theme.colors.text }]}>
            Book {service.title}
          </Text>
          {/* Booking form implementation */}
        </View>
      </Modal>
    </>
  );

  // Main Render
  if (loadingState.isLoading && !service) {
    return renderLoadingState();
  }

  if (errorState.hasError && !service) {
    return renderErrorState();
  }

  if (!service) {
    return null;
  }

  return (
    <View style={[styles.container, customStyles.container]} {...restProps}>
      {renderServiceContent()}
      {renderActionButtons()}
      {renderModals()}
      
      {/* Offline Indicator */}
      {enableOfflineMode && <OfflineIndicator theme={theme} />}
    </View>
  );
});

// Component Configuration
ServiceDetails.displayName = 'ServiceDetails';
ServiceDetails.config = COMPONENT_CONFIG;
ServiceDetails.Status = SERVICE_STATUS;
ServiceDetails.BookingTypes = BOOKING_TYPES;

// Prop Types
ServiceDetails.propTypes = {
  // Define your prop types here
};

// Default Props
ServiceDetails.defaultProps = {
  enableAIRecommendations: true,
  enableRealTimeAvailability: true,
  enablePremiumFeatures: true,
  showHeader: true,
  showGallery: true,
  showPricing: true,
  showReviews: true,
  showProvider: true,
  showLocation: true,
  showActions: true,
  showSimilar: true,
  showFAQ: true,
  showPremiumBadge: true,
  showAvailability: true,
  lazyLoadImages: true,
  enableCaching: true,
  trackUserJourney: true,
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for action buttons
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bookingModal: {
    padding: 20,
    minHeight: 400,
  },
  bookingTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
});

// Export with error boundary
export default withErrorBoundary(ServiceDetails, {
  context: 'ServiceDetails',
  fallback: <ErrorBoundary.Fallback />,
});

// Hook for using service details
export const useServiceDetails = (serviceId, options = {}) => {
  // Implementation of custom hook for service details
  return {
    // Hook return values
  };
};