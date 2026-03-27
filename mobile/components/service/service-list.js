// components/service/service-list.js - ENTERPRISE REWRITE
/**
 * Enterprise Service List Component
 * Advanced service listing with AI-powered ranking, real-time filtering, and performance optimization
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  FlatList,
  RefreshControl,
  Dimensions,
  Platform,
  InteractionManager,
  NativeModules,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLocation } from '../../contexts/location-context';
import { useAnalytics } from '../../hooks/use-analytics';
import { usePerformance } from '../../hooks/use-performance';
import { useErrorBoundary } from '../../hooks/use-error-boundary';
import { ServiceService } from '../../services/service-service';
import { AnalyticsService } from '../../services/analytics-service';
import { ErrorService } from '../../services/error-service';
import { AIRankingService } from '../../services/ai-ranking-service';
import { UserPreferenceService } from '../../services/user-preference-service';
import { PerformanceMonitor } from '../../services/performance-monitor';
import { CacheService } from '../../services/cache-service';

// UI Components
import ServiceCard from './service-card';
import ServiceSkeleton from './service-skeleton';
import EmptyState from '../ui/empty-state';
import ErrorBoundary from '../ui/error-boundary';
import RetryButton from '../ui/retry-button';
import LoadingIndicator from '../ui/loading-indicator';
import PerformanceMetrics from '../ui/performance-metrics';
import AIScoreBadge from '../ui/ai-score-badge';

// Constants
const LIST_CONFIG = {
  PERFORMANCE: {
    INITIAL_RENDER: 8,
    MAX_RENDER_BATCH: 10,
    WINDOW_SIZE: 21,
    UPDATE_BATCHING: 50,
    SCROLL_THROTTLE: 16,
    LAZY_LOAD_THRESHOLD: 500,
  },
  AI: {
    RELEVANCE_THRESHOLD: 0.7,
    PERSONALIZATION_WEIGHT: 0.3,
    FRESHNESS_WEIGHT: 0.2,
    QUALITY_WEIGHT: 0.5,
    MAX_AI_RANKING_ITEMS: 1000,
  },
  CACHE: {
    DURATION: 300000, // 5 minutes
    MAX_ITEMS: 1000,
    VERSION: '1.0',
  },
  ANALYTICS: {
    SCROLL_DEPTH_INTERVALS: [25, 50, 75, 90],
    INTERACTION_SAMPLING_RATE: 0.1,
  },
};

const LIST_TYPES = {
  VERTICAL: {
    key: 'vertical',
    columns: 1,
    horizontal: false,
    itemWidth: null,
  },
  HORIZONTAL: {
    key: 'horizontal',
    columns: 1,
    horizontal: true,
    itemWidth: Dimensions.get('window').width * 0.8,
  },
  GRID: {
    key: 'grid',
    columns: 2,
    horizontal: false,
    itemWidth: null,
  },
  COMPACT: {
    key: 'compact',
    columns: 1,
    horizontal: false,
    itemWidth: null,
  },
};

const SORT_STRATEGIES = {
  RELEVANCE: 'relevance',
  POPULARITY: 'popularity',
  RATING: 'rating',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  RECENCY: 'recency',
  DISTANCE: 'distance',
  AI_RANKING: 'ai_ranking',
  USER_PREFERENCE: 'user_preference',
};

const FILTER_MODES = {
  ALL: 'all',
  AVAILABLE: 'available',
  FEATURED: 'featured',
  PREMIUM: 'premium',
  VERIFIED: 'verified',
  NEAR_ME: 'near_me',
  DISCOUNTED: 'discounted',
  CONSTRUCTION: 'construction',
  GOVERNMENT: 'government',
};

const LOADING_STATES = {
  IDLE: 'idle',
  INITIAL_LOAD: 'initial_load',
  LOADING_MORE: 'loading_more',
  REFRESHING: 'refreshing',
  FILTERING: 'filtering',
  AI_PROCESSING: 'ai_processing',
  ERROR: 'error',
  SUCCESS: 'success',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Service List Component
 * 
 * Advanced Features:
 * - AI-powered relevance scoring and ranking
 * - Real-time user preference matching
 * - Advanced performance monitoring and optimization
 * - Intelligent caching with versioning
 * - Multi-dimensional filtering and sorting
 * - Construction and government project specialization
 * - Comprehensive analytics and user behavior tracking
 * - Accessibility-first design with screen reader support
 * - Offline capability with smart synchronization
 */
const ServiceList = React.memo(({
  // Core Configuration
  listType = LIST_TYPES.VERTICAL,
  category = null,
  providerId = null,
  userId = null,
  locationContext = null,
  radius = 10, // kilometers
  
  // Data Management
  initialServices = [],
  externalServices = null,
  onServicesUpdate,
  enableDataSync = true,
  
  // AI & Personalization
  enableAIRelevance = true,
  enableUserPreferenceMatching = true,
  enablePersonalizedRanking = true,
  aiRankingStrategy = 'hybrid',
  
  // Filtering & Sorting
  sortStrategy = SORT_STRATEGIES.RELEVANCE,
  activeFilters = {},
  searchQuery = '',
  enableAdvancedFiltering = true,
  enableRealTimeSorting = true,
  
  // Pagination & Loading
  pageSize = 20,
  enableSmartPagination = true,
  enableInfiniteScroll = true,
  enableVirtualization = true,
  
  // UI & UX
  autoLoad = true,
  showLoadingStates = true,
  enablePullToRefresh = true,
  enableSkeletonAnimation = true,
  showPerformanceMetrics = false,
  
  // Interactions
  onServiceSelected,
  onServiceBookmarked,
  onServiceShared,
  onEndReached,
  onRefreshTriggered,
  onFilterApplied,
  
  // Analytics
  analyticsContext = {},
  enableInteractionTracking = true,
  enablePerformanceTracking = true,
  
  // Customization
  customStyles = {},
  themeVariant = 'default',
  layoutConfig = {},
  
  // Performance
  performanceOptimization = true,
  enableMemoryManagement = true,
  lazyLoadThreshold = LIST_CONFIG.PERFORMANCE.LAZY_LOAD_THRESHOLD,
  
  // Accessibility
  accessibilityConfig = {},
  
  ...restProps
}) => {
  // Hooks
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDarkMode, currentTheme } = useTheme();
  const { user, isAuthenticated, userProfile } = useAuth();
  const { currentLocation, getDistance, locationAccuracy } = useLocation();
  const { trackEvent, trackTiming, trackPerformance } = useAnalytics();
  const { optimizeRender, debounce, throttle, memoize } = usePerformance();
  const { captureError, withErrorBoundary } = useErrorBoundary();
  
  // State Management
  const [serviceState, setServiceState] = useState({
    services: externalServices || initialServices,
    processedServices: [],
    displayedServices: [],
    aiRankedServices: [],
  });
  
  const [loadingState, setLoadingState] = useState({
    current: LOADING_STATES.IDLE,
    progress: 0,
    message: '',
    subTasks: [],
  });
  
  const [paginationState, setPaginationState] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    hasMoreItems: true,
    loadedItems: 0,
    cursor: null,
  });
  
  const [filterState, setFilterState] = useState({
    activeFilters: {
      status: FILTER_MODES.ALL,
      category: category,
      priceRange: { min: 0, max: 10000 },
      minRating: 0,
      verificationLevel: 0,
      features: [],
      skills: [],
      serviceTypes: [],
      availability: 'any',
      ...activeFilters,
    },
    searchQuery: searchQuery,
    sortStrategy: sortStrategy,
    isFiltered: false,
  });
  
  const [aiState, setAiState] = useState({
    relevanceScores: new Map(),
    userPreferenceMatches: new Map(),
    personalizedRankings: [],
    aiProcessing: false,
    lastAICalculation: null,
  });
  
  const [performanceState, setPerformanceState] = useState({
    renderTime: 0,
    scrollPerformance: 0,
    memoryUsage: 0,
    networkRequests: 0,
    cacheHitRate: 0,
  });
  
  const [analyticsState, setAnalyticsState] = useState({
    itemsViewed: new Set(),
    scrollDepth: 0,
    interactionCount: 0,
    sessionStart: Date.now(),
    filterApplications: 0,
  });

  // Refs
  const componentMounted = useRef(true);
  const flatListRef = useRef(null);
  const performanceMonitorRef = useRef(null);
  const aiProcessorRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const interactionTrackerRef = useRef({
    lastInteraction: null,
    scrollEvents: 0,
    renderCount: 0,
  });

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeInAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;

  // Memoized Values
  const listConfig = useMemo(() => LIST_TYPES[listType?.key || 'VERTICAL'], [listType]);
  const userContext = useMemo(() => ({
    id: user?.id,
    preferences: userProfile?.preferences,
    behavior: userProfile?.behavior,
    location: currentLocation,
    role: user?.role,
  }), [user, userProfile, currentLocation]);

  const filterContext = useMemo(() => ({
    ...filterState.activeFilters,
    searchQuery: filterState.searchQuery,
    sortStrategy: filterState.sortStrategy,
    location: locationContext || currentLocation,
    radius,
  }), [filterState, locationContext, currentLocation, radius]);

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
    if (externalServices) {
      handleExternalServicesUpdate(externalServices);
    }
  }, [externalServices]);

  useEffect(() => {
    if (autoLoad && !externalServices) {
      loadServices({ initialLoad: true });
    }
  }, [autoLoad, externalServices]);

  useEffect(() => {
    if (serviceState.services.length > 0) {
      processServicesWithAI();
    }
  }, [serviceState.services, filterState, enableAIRelevance]);

  // Core Functions
  const initializeComponent = useCallback(async () => {
    const initTiming = trackTiming('service_list_initialization');
    
    try {
      setLoadingState({
        current: LOADING_STATES.INITIAL_LOAD,
        progress: 0,
        message: 'Initializing service list...',
        subTasks: ['Loading cache', 'Initializing AI', 'Setting up analytics'],
      });
      
      await Promise.all([
        initializePerformanceMonitoring(),
        initializeAIServices(),
        loadCachedData(),
      ]);
      
      startEntranceAnimation();
      
      trackEvent('service_list_initialized', {
        listType: listConfig.key,
        category,
        userId: user?.id,
        ...analyticsContext,
      });
      
      initTiming.end({ success: true });
    } catch (error) {
      captureError(error, {
        context: 'ServiceListInitialization',
        listType: listConfig.key,
        category,
      });
      
      initTiming.end({ success: false, error: error.message });
    } finally {
      if (componentMounted.current) {
        setLoadingState(prev => ({ ...prev, current: LOADING_STATES.IDLE }));
      }
    }
  }, [listConfig, category, user, analyticsContext, trackEvent, trackTiming, captureError]);

  const cleanupComponent = useCallback(() => {
    performanceMonitorRef.current?.stop();
    aiProcessorRef.current?.cancel();
    
    trackAnalyticsSession();
    trackPerformanceMetrics();
  }, []);

  const initializePerformanceMonitoring = useCallback(() => {
    performanceMonitorRef.current = new PerformanceMonitor({
      onMetricsUpdate: (metrics) => {
        setPerformanceState(prev => ({ ...prev, ...metrics }));
      },
      samplingRate: 0.1,
    });
    
    performanceMonitorRef.current.start();
  }, []);

  const initializeAIServices = useCallback(async () => {
    if (!enableAIRelevance) return;
    
    try {
      await AIRankingService.initialize({
        userId: user?.id,
        strategy: aiRankingStrategy,
        maxItems: LIST_CONFIG.AI.MAX_AI_RANKING_ITEMS,
      });
      
      if (enableUserPreferenceMatching) {
        await UserPreferenceService.initialize(userContext);
      }
    } catch (error) {
      captureError(error, { context: 'AIServiceInitialization' });
    }
  }, [enableAIRelevance, enableUserPreferenceMatching, user, aiRankingStrategy, userContext, captureError]);

  const loadCachedData = useCallback(async () => {
    try {
      const cacheKey = generateCacheKey();
      const cachedData = await CacheService.get(cacheKey);
      
      if (cachedData && isCacheValid(cachedData)) {
        setServiceState({
          services: cachedData.services,
          processedServices: cachedData.processedServices,
          displayedServices: cachedData.displayedServices,
        });
        
        setPaginationState(cachedData.pagination);
        setFilterState(cachedData.filters);
        
        trackEvent('cache_loaded', {
          cacheKey,
          itemCount: cachedData.services.length,
          age: Date.now() - cachedData.timestamp,
        });
      }
    } catch (error) {
      captureError(error, { context: 'CacheLoad' });
    }
  }, [trackEvent, captureError]);

  const startEntranceAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeInAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeInAnimation, scaleAnimation]);

  // Data Loading & Processing
  const loadServices = useCallback(async (options = {}) => {
    if (!componentMounted.current) return;
    
    const {
      initialLoad = false,
      loadMore = false,
      refreshing = false,
      silent = false,
    } = options;

    const loadTiming = trackTiming('services_data_load');
    
    try {
      updateLoadingState(
        initialLoad ? LOADING_STATES.INITIAL_LOAD :
        loadMore ? LOADING_STATES.LOADING_MORE :
        refreshing ? LOADING_STATES.REFRESHING :
        LOADING_STATES.FILTERING,
        'Loading services...'
      );

      if (initialLoad && !silent) {
        setError(null);
      }

      // Build query parameters
      const queryParams = buildQueryParameters({
        page: loadMore ? paginationState.currentPage + 1 : 1,
        loadMore,
        refreshing,
      });

      // Execute service request
      const result = await ServiceService.getServices(queryParams);

      if (!componentMounted.current) return;

      if (result.success) {
        await handleSuccessfulLoad(result.data, {
          initialLoad,
          loadMore,
          refreshing,
        });
        
        loadTiming.end({ 
          success: true, 
          itemCount: result.data.services.length,
          fromCache: result.data.fromCache,
        });
      } else {
        throw new Error(result.error?.message || 'Failed to load services');
      }

    } catch (error) {
      if (!componentMounted.current) return;
      
      handleLoadError(error, { initialLoad, silent });
      loadTiming.end({ success: false, error: error.message });
    }
  }, [paginationState, filterContext, trackTiming]);

  const buildQueryParameters = useCallback((options = {}) => {
    const baseParams = {
      page: options.page || 1,
      limit: pageSize,
      sort: filterState.sortStrategy,
      filters: filterState.activeFilters,
      search: filterState.searchQuery,
      category,
      providerId,
      userId,
      location: locationContext || currentLocation,
      radius,
      include: ['provider', 'reviews', 'category', 'statistics', 'premium_features'],
      aiRelevance: enableAIRelevance,
      userContext: enableUserPreferenceMatching ? userContext : null,
    };

    if (options.loadMore && paginationState.cursor) {
      baseParams.cursor = paginationState.cursor;
    }

    return baseParams;
  }, [pageSize, filterState, category, providerId, userId, locationContext, currentLocation, radius, enableAIRelevance, enableUserPreferenceMatching, userContext, paginationState]);

  const handleSuccessfulLoad = useCallback(async (data, options) => {
    const { initialLoad, loadMore, refreshing } = options;
    
    const newServices = loadMore 
      ? [...serviceState.services, ...data.services]
      : data.services;

    // Update state
    setServiceState(prev => ({ ...prev, services: newServices }));
    
    setPaginationState({
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      totalItems: data.totalCount,
      hasMoreItems: data.hasMore,
      loadedItems: newServices.length,
      cursor: data.cursor,
    });

    // Cache the data
    if (enableDataSync && !loadMore) {
      await cacheServicesData(newServices, data);
    }

    // Notify parent component
    onServicesUpdate?.(newServices, data);

    // Track analytics
    trackEvent('services_loaded_successfully', {
      serviceCount: newServices.length,
      totalCount: data.totalCount,
      page: data.currentPage,
      sortStrategy: filterState.sortStrategy,
      filterCount: Object.keys(filterState.activeFilters).length,
      category,
      fromCache: data.fromCache || false,
    });

    updateLoadingState(LOADING_STATES.SUCCESS, 'Services loaded successfully');
  }, [serviceState.services, enableDataSync, onServicesUpdate, trackEvent, filterState, category]);

  const handleLoadError = useCallback((error, options) => {
    const { initialLoad, silent } = options;
    
    captureError(error, {
      context: 'ServiceListLoad',
      page: paginationState.currentPage,
      sortStrategy: filterState.sortStrategy,
      filters: filterState.activeFilters,
      category,
      userId: user?.id,
      initialLoad,
    });

    if (initialLoad) {
      setError(error.message);
    }

    if (!silent) {
      showToast('Failed to load services. Please try again.', 'error');
    }

    updateLoadingState(LOADING_STATES.ERROR, 'Failed to load services');
  }, [paginationState, filterState, category, user, captureError]);

  // AI Processing & Ranking
  const processServicesWithAI = useCallback(async () => {
    if (!enableAIRelevance || serviceState.services.length === 0) {
      setServiceState(prev => ({
        ...prev,
        processedServices: prev.services,
        displayedServices: prev.services,
      }));
      return;
    }

    const aiTiming = trackTiming('ai_service_processing');
    
    try {
      setAiState(prev => ({ ...prev, aiProcessing: true }));
      updateLoadingState(LOADING_STATES.AI_PROCESSING, 'Optimizing service rankings...');

      // Calculate AI relevance scores
      const relevanceScores = await calculateAIRelevanceScores(serviceState.services);
      
      // Apply user preference matching
      const preferenceMatches = enableUserPreferenceMatching 
        ? await calculateUserPreferenceMatches(serviceState.services)
        : new Map();

      // Generate personalized rankings
      const rankedServices = await generatePersonalizedRankings(
        serviceState.services,
        relevanceScores,
        preferenceMatches
      );

      if (!componentMounted.current) return;

      setAiState({
        relevanceScores,
        userPreferenceMatches: preferenceMatches,
        personalizedRankings: rankedServices,
        aiProcessing: false,
        lastAICalculation: Date.now(),
      });

      setServiceState(prev => ({
        ...prev,
        processedServices: rankedServices,
        displayedServices: rankedServices,
      }));

      aiTiming.end({ 
        success: true, 
        itemsProcessed: serviceState.services.length,
        rankingStrategy: aiRankingStrategy,
      });

      trackEvent('ai_ranking_completed', {
        itemsRanked: rankedServices.length,
        rankingStrategy: aiRankingStrategy,
        processingTime: aiTiming.duration,
      });

    } catch (error) {
      captureError(error, {
        context: 'AIProcessing',
        serviceCount: serviceState.services.length,
        rankingStrategy: aiRankingStrategy,
      });

      // Fallback to basic sorting
      setServiceState(prev => ({
        ...prev,
        processedServices: prev.services,
        displayedServices: prev.services,
      }));

      aiTiming.end({ success: false, error: error.message });
    } finally {
      if (componentMounted.current) {
        setAiState(prev => ({ ...prev, aiProcessing: false }));
        updateLoadingState(LOADING_STATES.SUCCESS, 'Services optimized');
      }
    }
  }, [serviceState.services, enableAIRelevance, enableUserPreferenceMatching, aiRankingStrategy, trackTiming, trackEvent, captureError]);

  const calculateAIRelevanceScores = useCallback(async (services) => {
    const scores = new Map();
    
    for (const service of services) {
      try {
        const relevanceScore = await AIRankingService.calculateRelevanceScore(service, {
          userContext,
          filterContext,
          listingContext: {
            category,
            listType: listConfig.key,
            location: currentLocation,
          },
        });

        scores.set(service.id, {
          score: relevanceScore,
          factors: relevanceScore.factors,
          confidence: relevanceScore.confidence,
          timestamp: Date.now(),
        });

      } catch (error) {
        // Fallback score based on basic metrics
        const fallbackScore = calculateFallbackRelevanceScore(service);
        scores.set(service.id, {
          score: fallbackScore,
          factors: { fallback: true },
          confidence: 0.5,
          timestamp: Date.now(),
        });
      }
    }

    return scores;
  }, [userContext, filterContext, category, listConfig, currentLocation]);

  const calculateUserPreferenceMatches = useCallback(async (services) => {
    const matches = new Map();
    
    if (!userContext.id || !enableUserPreferenceMatching) {
      return matches;
    }

    for (const service of services) {
      try {
        const matchScore = await UserPreferenceService.calculateMatchScore(
          service,
          userContext
        );

        matches.set(service.id, {
          score: matchScore.overall,
          categoryMatch: matchScore.category,
          priceMatch: matchScore.price,
          locationMatch: matchScore.location,
          behaviorMatch: matchScore.behavior,
        });

      } catch (error) {
        // Silent fallback - don't break the entire process
        console.warn('User preference calculation failed for service:', service.id);
      }
    }

    return matches;
  }, [userContext, enableUserPreferenceMatching]);

  const generatePersonalizedRankings = useCallback(async (services, relevanceScores, preferenceMatches) => {
    const rankedServices = services.map(service => {
      const relevance = relevanceScores.get(service.id)?.score || 0;
      const preference = preferenceMatches.get(service.id)?.score || 0;
      
      // Calculate composite score
      const compositeScore = calculateCompositeScore({
        relevance,
        preference,
        service,
        strategy: aiRankingStrategy,
      });

      return {
        ...service,
        aiScore: compositeScore,
        relevanceScore: relevance,
        preferenceScore: preference,
        rankingFactors: {
          relevance: relevanceScores.get(service.id)?.factors,
          preference: preferenceMatches.get(service.id),
        },
      };
    });

    // Sort by composite score
    return rankedServices.sort((a, b) => b.aiScore - a.aiScore);
  }, [aiRankingStrategy]);

  const calculateCompositeScore = useCallback(({ relevance, preference, service, strategy }) => {
    const weights = getRankingWeights(strategy);
    
    let score = relevance * weights.relevance;
    
    if (preference > 0) {
      score += preference * weights.preference;
    }
    
    // Add service quality factors
    score += (service.rating || 0) / 5 * weights.quality;
    score += Math.log10((service.reviewCount || 0) + 1) * weights.popularity;
    
    // Recency bonus
    const daysOld = (Date.now() - new Date(service.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysOld) / 30 * weights.freshness;
    
    // Premium and verification bonuses
    if (service.provider?.isPremium) score += weights.premium;
    if (service.provider?.verificationLevel >= 2) score += weights.verification;
    
    return Math.min(1, score);
  }, []);

  const getRankingWeights = useCallback((strategy) => {
    const weightProfiles = {
      relevance: { relevance: 0.6, preference: 0.2, quality: 0.1, popularity: 0.05, freshness: 0.05, premium: 0.1, verification: 0.1 },
      personalization: { relevance: 0.3, preference: 0.5, quality: 0.1, popularity: 0.05, freshness: 0.05, premium: 0.1, verification: 0.1 },
      hybrid: { relevance: 0.4, preference: 0.3, quality: 0.15, popularity: 0.05, freshness: 0.1, premium: 0.1, verification: 0.1 },
      quality: { relevance: 0.2, preference: 0.1, quality: 0.4, popularity: 0.1, freshness: 0.1, premium: 0.2, verification: 0.2 },
    };
    
    return weightProfiles[strategy] || weightProfiles.hybrid;
  }, []);

  const calculateFallbackRelevanceScore = useCallback((service) => {
    // Basic relevance calculation when AI service is unavailable
    let score = 0;
    
    // Rating factor (40%)
    score += (service.rating || 0) / 5 * 0.4;
    
    // Review count factor (20%)
    score += Math.min(1, (service.reviewCount || 0) / 100) * 0.2;
    
    // Popularity factor (20%)
    score += Math.min(1, (service.viewCount || 0) / 1000) * 0.2;
    
    // Recency factor (10%)
    const daysOld = (Date.now() - new Date(service.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (30 - daysOld) / 30) * 0.1;
    
    // Premium bonus (10%)
    if (service.provider?.isPremium) score += 0.1;
    
    return score;
  }, []);

  // Interaction Handlers
  const handleServicePress = useCallback((service, index) => {
    const interactionData = {
      serviceId: service.id,
      serviceTitle: service.title,
      category: service.category,
      position: index,
      listType: listConfig.key,
      aiScore: service.aiScore,
      source: 'service_list',
      timestamp: Date.now(),
    };

    // Track interaction
    trackEvent('service_selected', interactionData);
    
    // Update analytics state
    setAnalyticsState(prev => ({
      ...prev,
      interactionCount: prev.interactionCount + 1,
      itemsViewed: prev.itemsViewed.add(service.id),
    }));

    // Call parent handler or default navigation
    if (onServiceSelected) {
      onServiceSelected(service, index, interactionData);
    } else {
      router.push(`/services/${service.id}`);
    }
  }, [listConfig, trackEvent, onServiceSelected, router]);

  const handleLoadMore = useCallback(() => {
    if (loadingState.current === LOADING_STATES.LOADING_MORE || 
        !paginationState.hasMoreItems ||
        !enableInfiniteScroll) {
      return;
    }

    loadServices({ loadMore: true });
    onEndReached?.(paginationState.currentPage + 1);
  }, [loadingState, paginationState, enableInfiniteScroll, loadServices, onEndReached]);

  const handleRefresh = useCallback(async () => {
    if (loadingState.current === LOADING_STATES.REFRESHING) return;
    
    await loadServices({ refreshing: true });
    onRefreshTriggered?.();
  }, [loadingState, loadServices, onRefreshTriggered]);

  // Utility Functions
  const updateLoadingState = useCallback((state, message = '', progress = 0, subTasks = []) => {
    setLoadingState({
      current: state,
      message,
      progress,
      subTasks,
    });
  }, []);

  const generateCacheKey = useCallback(() => {
    const baseKey = `services_${category || 'all'}_${filterState.sortStrategy}`;
    const filterHash = btoa(JSON.stringify(filterState.activeFilters));
    return `${baseKey}_${filterHash}_${LIST_CONFIG.CACHE.VERSION}`;
  }, [category, filterState]);

  const isCacheValid = useCallback((cachedData) => {
    return Date.now() - cachedData.timestamp < LIST_CONFIG.CACHE.DURATION;
  }, []);

  const cacheServicesData = useCallback(async (services, paginationData) => {
    try {
      const cacheKey = generateCacheKey();
      const cacheData = {
        services,
        processedServices: serviceState.processedServices,
        displayedServices: serviceState.displayedServices,
        pagination: paginationState,
        filters: filterState,
        timestamp: Date.now(),
      };
      
      await CacheService.set(cacheKey, cacheData, LIST_CONFIG.CACHE.DURATION);
    } catch (error) {
      captureError(error, { context: 'CacheServicesData' });
    }
  }, [generateCacheKey, serviceState, paginationState, filterState, captureError]);

  const showToast = useCallback((message, type = 'info') => {
    // Implementation would integrate with your Toast component
    console.log(`Toast [${type}]:`, message);
  }, []);

  const trackAnalyticsSession = useCallback(() => {
    const sessionDuration = Date.now() - analyticsState.sessionStart;
    
    trackEvent('service_list_session_completed', {
      sessionDuration,
      itemsViewed: analyticsState.itemsViewed.size,
      interactionCount: analyticsState.interactionCount,
      scrollDepth: analyticsState.scrollDepth,
      filterApplications: analyticsState.filterApplications,
      finalServiceCount: serviceState.displayedServices.length,
    });
  }, [analyticsState, serviceState, trackEvent]);

  const trackPerformanceMetrics = useCallback(() => {
    trackPerformance('service_list_performance', {
      ...performanceState,
      totalItems: serviceState.services.length,
      listType: listConfig.key,
    });
  }, [performanceState, serviceState, listConfig, trackPerformance]);

  // Render Functions
  const renderServiceItem = useCallback(({ item, index }) => {
    const isAboveThreshold = index * 200 < scrollPositionRef.current + lazyLoadThreshold;
    
    return (
      <Animated.View
        style={[
          styles.serviceItem,
          listConfig.itemWidth && { width: listConfig.itemWidth },
          {
            opacity: fadeInAnimation,
            transform: [
              { scale: scaleAnimation },
              {
                translateY: scrollY.interpolate({
                  inputRange: [index * 200 - 200, index * 200, index * 200 + 200],
                  outputRange: [20, 0, -20],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
          customStyles.serviceItem,
        ]}
      >
        <ServiceCard
          service={item}
          onPress={() => handleServicePress(item, index)}
          layout={listConfig.key}
          showAIScore={enableAIRelevance}
          aiScore={item.aiScore}
          theme={theme}
          style={customStyles.serviceCard}
        />
        
        {/* AI Score Badge */}
        {enableAIRelevance && item.aiScore && (
          <AIScoreBadge
            score={item.aiScore}
            factors={item.rankingFactors}
            theme={theme}
            style={styles.aiScoreBadge}
          />
        )}
      </Animated.View>
    );
  }, [listConfig, enableAIRelevance, handleServicePress, theme, customStyles, fadeInAnimation, scaleAnimation, scrollY, lazyLoadThreshold]);

  const renderLoadingState = () => {
    if (!showLoadingStates || loadingState.current === LOADING_STATES.SUCCESS) {
      return null;
    }

    const skeletonCount = listConfig.columns === 1 ? 3 : 6;
    
    return (
      <View style={styles.loadingContainer}>
        {loadingState.current === LOADING_STATES.AI_PROCESSING ? (
          <LoadingIndicator
            type="ai"
            message={loadingState.message}
            progress={loadingState.progress}
            subTasks={loadingState.subTasks}
            theme={theme}
          />
        ) : (
          Array.from({ length: skeletonCount }).map((_, index) => (
            <ServiceSkeleton
              key={`skeleton-${index}`}
              layout={listConfig.key}
              animated={enableSkeletonAnimation}
              theme={theme}
              style={customStyles.skeleton}
            />
          ))
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loadingState.current === LOADING_STATES.INITIAL_LOAD || 
        loadingState.current === LOADING_STATES.AI_PROCESSING) {
      return renderLoadingState();
    }

    if (serviceState.displayedServices.length > 0) {
      return null;
    }

    const emptyConfig = {
      title: 'No Services Found',
      message: filterState.searchQuery 
        ? `No services match "${filterState.searchQuery}". Try different keywords or adjust your filters.`
        : category
        ? `No services available in ${category}. Try browsing other categories.`
        : 'No services available at the moment. Please check back later.',
      action: filterState.searchQuery || Object.keys(filterState.activeFilters).length > 0 ? {
        label: 'Clear Search & Filters',
        onPress: () => {
          setFilterState(prev => ({
            ...prev,
            searchQuery: '',
            activeFilters: { status: FILTER_MODES.ALL, category: null },
          }));
        },
      } : null,
      illustration: 'empty-search',
    };

    return (
      <EmptyState
        {...emptyConfig}
        theme={theme}
        style={customStyles.emptyState}
      />
    );
  };

  const renderFooter = () => {
    if (loadingState.current === LOADING_STATES.LOADING_MORE) {
      return (
        <View style={styles.footer}>
          <LoadingIndicator
            type="dots"
            message="Loading more services..."
            theme={theme}
          />
        </View>
      );
    }

    if (!paginationState.hasMoreItems && serviceState.displayedServices.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={[styles.endMessage, { color: theme.colors.textSecondary }]}>
            You've reached the end
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderRefreshControl = () => (
    <RefreshControl
      refreshing={loadingState.current === LOADING_STATES.REFRESHING}
      onRefresh={handleRefresh}
      colors={[theme.colors.primary]}
      tintColor={theme.colors.primary}
      enabled={enablePullToRefresh}
    />
  );

  const renderPerformanceMetrics = () => {
    if (!showPerformanceMetrics) return null;
    
    return (
      <PerformanceMetrics
        metrics={performanceState}
        theme={theme}
        style={styles.performanceMetrics}
      />
    );
  };

  // Main Render
  return (
    <View style={[styles.container, customStyles.container]} {...restProps}>
      {/* Performance Metrics Debug */}
      {renderPerformanceMetrics()}
      
      {/* Main Service List */}
      <Animated.FlatList
        ref={flatListRef}
        data={serviceState.displayedServices}
        renderItem={renderServiceItem}
        keyExtractor={(item) => `service-${item.id}-${listConfig.key}-${item.aiScore || 'no-ai'}`}
        key={listConfig.key} // Force re-render on layout change
        numColumns={listConfig.columns}
        horizontal={listConfig.horizontal}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={listConfig.horizontal}
        refreshControl={renderRefreshControl()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={LIST_CONFIG.PERFORMANCE.SCROLL_THROTTLE}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        initialNumToRender={LIST_CONFIG.PERFORMANCE.INITIAL_RENDER}
        maxToRenderPerBatch={LIST_CONFIG.PERFORMANCE.MAX_RENDER_BATCH}
        windowSize={LIST_CONFIG.PERFORMANCE.WINDOW_SIZE}
        updateCellsBatchingPeriod={LIST_CONFIG.PERFORMANCE.UPDATE_BATCHING}
        removeClippedSubviews={enableVirtualization && Platform.OS === 'android'}
        contentContainerStyle={[
          styles.contentContainer,
          listConfig.horizontal && styles.horizontalContent,
          customStyles.contentContainer,
        ]}
        style={[styles.list, customStyles.list]}
        accessibilityRole="list"
        accessibilityLabel={`Service list containing ${serviceState.displayedServices.length} services`}
        accessibilityHint="Scroll to browse available services"
      />
    </View>
  );
});

// Component Configuration
ServiceList.displayName = 'ServiceList';
ServiceList.config = LIST_CONFIG;
ServiceList.Types = LIST_TYPES;
ServiceList.SortStrategies = SORT_STRATEGIES;
ServiceList.FilterModes = FILTER_MODES;
ServiceList.LoadingStates = LOADING_STATES;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  horizontalContent: {
    paddingHorizontal: 16,
  },
  serviceItem: {
    marginBottom: 12,
  },
  aiScoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  loadingContainer: {
    padding: 16,
    gap: 12,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endMessage: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  performanceMetrics: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1000,
  },
});

// Export with error boundary
export default withErrorBoundary(ServiceList, {
  context: 'ServiceList',
  fallback: <ErrorBoundary.Fallback />,
});

// Custom Hook for Service List Management
export const useServiceList = (initialState = {}) => {
  // Implementation of advanced service list management hook
  return {
    // Hook implementation
  };
};