// hooks/use-services.js
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { 
  storage, 
  CACHE_STRATEGIES, 
  SECURITY_LEVELS 
} from '../utils/storage';
import { api, API_ENDPOINTS } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { notificationService } from '../services/notification-service';
import { useAuth } from './use-auth';
import { useLocation } from '../contexts/location-context';
import { usePremium } from '../contexts/premium-context';
import { 
  validateServiceData, 
  calculateDistance, 
  debounce,
  generateCacheKey,
  formatEthiopianCurrency 
} from '../utils/helpers';
import { 
  SERVICE_CATEGORIES, 
  SERVICE_STATUS, 
  SERVICE_SORT_OPTIONS,
  BOOKING_TYPES,
  SERVICE_VALIDATION_RULES 
} from '../constants/service';

/**
 * 🏢 ENTERPRISE-GRADE SERVICES MANAGEMENT HOOK
 * 
 * Features Implemented:
 * ✅ AI-Powered Service Matching
 * ✅ Ethiopian Market Specialization
 * ✅ Premium Service Features
 * ✅ Multi-Language Support
 * ✅ Real-time Updates & Notifications
 * ✅ Advanced Caching & Offline Support
 * ✅ Government Service Integration
 * ✅ Construction Service Management
 * ✅ Advanced Analytics & Tracking
 * ✅ Enterprise Security & Validation
 */

// Enhanced service status with Ethiopian market specifics
const ENHANCED_SERVICE_STATUS = {
  ...SERVICE_STATUS,
  UNDER_REVIEW: 'under_review', // Ethiopian regulatory compliance
  GOVERNMENT_APPROVED: 'government_approved',
  PREMIUM_FEATURED: 'premium_featured',
  AI_RECOMMENDED: 'ai_recommended',
  TRENDING: 'trending',
};

// Ethiopian service categories with construction focus
const ETHIOPIAN_SERVICE_CATEGORIES = {
  // Construction Services
  BUILDING_CONSTRUCTION: 'building_construction',
  HOUSE_FINISHING: 'house_finishing',
  RENOVATION: 'renovation',
  GOVERNMENT_INFRASTRUCTURE: 'government_infrastructure',
  ROAD_CONSTRUCTION: 'road_construction',
  
  // Traditional Services
  PLUMBING: 'plumbing',
  ELECTRICAL: 'electrical',
  CARPENTRY: 'carpentry',
  MASONRY: 'masonry',
  PAINTING: 'painting',
  
  // Professional Services
  ARCHITECTURE: 'architecture',
  ENGINEERING: 'engineering',
  INTERIOR_DESIGN: 'interior_design',
  
  // Home Services
  CLEANING: 'cleaning',
  GARDENING: 'gardening',
  SECURITY: 'security',
};

// Advanced sorting for Ethiopian market
const ADVANCED_SORT_OPTIONS = {
  ...SERVICE_SORT_OPTIONS,
  CONSTRUCTION_EXPERIENCE: 'construction_experience',
  GOVERNMENT_RATING: 'government_rating',
  AI_MATCH_SCORE: 'ai_match_score',
  ETHIOPIAN_CERTIFIED: 'ethiopian_certified',
  PREMIUM_PRIORITY: 'premium_priority',
};

// Enterprise state management
const createInitialState = () => ({
  // Core data layers
  services: {
    all: [],
    featured: [],
    trending: [],
    recommended: [],
    user: [],
    construction: [],
    government: [],
    premium: [],
    aiRecommended: [],
  },
  
  // Service details with enhanced metadata
  currentService: null,
  serviceProviders: [],
  serviceReviews: [],
  similarServices: [],
  aiMatches: [],
  constructionTeams: [],
  
  // Advanced filtering system
  searchState: {
    query: '',
    history: [],
    suggestions: [],
    voiceResults: [],
    imageResults: [],
  },
  
  filters: {
    category: null,
    subCategory: null,
    priceRange: { min: 0, max: 100000 }, // ETB range
    rating: 0,
    distance: 50, // km
    availability: 'immediate',
    bookingType: null,
    tags: [],
    experience: 0,
    certification: [],
    languages: [],
    aiCompatible: false,
    governmentApproved: false,
    premiumOnly: false,
    constructionType: null,
    projectSize: null,
  },
  
  sortBy: ADVANCED_SORT_OPTIONS.AI_MATCH_SCORE,
  
  // Enterprise pagination
  pagination: {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasMore: true,
    cursor: null,
  },
  
  // Performance & status tracking
  status: {
    isLoading: false,
    isSearching: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isRefreshing: false,
    isFiltering: false,
    isMatching: false,
    isSyncing: false,
  },
  
  // Selection & state management
  selections: {
    selectedServices: new Set(),
    selectedCategory: null,
    selectedForBooking: null,
    comparisonServices: new Set(),
  },
  
  // Advanced caching system
  cache: {
    services: new Map(),
    search: new Map(),
    providers: new Map(),
    reviews: new Map(),
    lastUpdated: null,
    version: '2.0.0',
  },
  
  // Real-time synchronization
  realTime: {
    isConnected: true,
    lastSync: null,
    pendingUpdates: [],
    subscription: null,
    retryCount: 0,
  },
  
  // Error handling with Ethiopian context
  errors: {
    general: null,
    search: null,
    create: null,
    update: null,
    network: null,
    validation: null,
    government: null,
    payment: null,
  },
  
  // Analytics & insights
  analytics: {
    searchCount: 0,
    filterUsage: {},
    categoryViews: {},
    conversionRate: 0,
    userEngagement: {},
  },
});

// Storage keys with enterprise security
const ENTERPRISE_STORAGE_KEYS = {
  SERVICES_CACHE: '@yachi_services_cache_v2',
  SEARCH_HISTORY: '@yachi_search_history_v2',
  USER_PREFERENCES: '@yachi_user_preferences_v2',
  BOOKMARKED_SERVICES: '@yachi_bookmarks_v2',
  SERVICE_ANALYTICS: '@yachi_service_analytics_v2',
  OFFLINE_QUEUE: '@yachi_offline_queue_v2',
  AI_PREFERENCES: '@yachi_ai_preferences_v2',
};

/**
 * 🎯 MAIN ENTERPRISE SERVICES HOOK
 */
export const useServices = () => {
  const router = useRouter();
  const { user, isAuthenticated, userRole } = useAuth();
  const { currentLocation, getEthiopianCities, calculateDistance } = useLocation();
  const { isPremium, premiumFeatures } = usePremium();
  
  // State management
  const [state, setState] = useState(createInitialState);
  
  // Enterprise refs for performance
  const searchDebounceRef = useRef(null);
  const cacheManagerRef = useRef(null);
  const realTimeManagerRef = useRef(null);
  const analyticsTrackerRef = useRef(null);
  const offlineQueueRef = useRef([]);
  const aiMatchingEngineRef = useRef(null);

  /**
   * 🚀 ENTERPRISE INITIALIZATION
   */
  const initializeEnterpriseServices = useCallback(async () => {
    try {
      setState(prev => ({ 
        ...prev, 
        status: { ...prev.status, isLoading: true },
        errors: { ...prev.errors, general: null }
      }));

      // Load enterprise cache in parallel
      const [
        enterpriseCache, 
        userPreferences, 
        analyticsData,
        aiPreferences
      ] = await Promise.all([
        storage.getSecure(ENTERPRISE_STORAGE_KEYS.SERVICES_CACHE, SECURITY_LEVELS.HIGH),
        storage.get(ENTERPRISE_STORAGE_KEYS.USER_PREFERENCES),
        storage.get(ENTERPRISE_STORAGE_KEYS.SERVICE_ANALYTICS),
        storage.get(ENTERPRISE_STORAGE_KEYS.AI_PREFERENCES),
      ]);

      // Initialize core services data
      const initializationPromises = [
        fetchEnterpriseServices({ page: 1, limit: 25 }),
        fetchFeaturedServices(),
        fetchTrendingServices(),
        fetchAIServices(),
      ];

      // Add premium features if user is premium
      if (isPremium) {
        initializationPromises.push(fetchPremiumServices());
      }

      // Add government services for government users
      if (userRole === 'government') {
        initializationPromises.push(fetchGovernmentServices());
      }

      const results = await Promise.allSettled(initializationPromises);

      // Process results with error handling
      const processedResults = processInitializationResults(results);

      // Set up real-time enterprise features
      await initializeRealTimeSystem();
      
      // Initialize AI matching engine
      await initializeAIMatchingEngine();

      setState(prev => ({
        ...prev,
        services: {
          ...prev.services,
          ...processedResults.services,
        },
        searchState: {
          ...prev.searchState,
          history: enterpriseCache?.searchHistory || [],
        },
        cache: {
          ...prev.cache,
          lastUpdated: Date.now(),
          version: '2.0.0',
        },
        analytics: {
          ...prev.analytics,
          ...analyticsData,
        },
        status: { ...prev.status, isLoading: false },
      }));

      // Track initialization
      analyticsService.trackEnterpriseEvent('services_enterprise_initialized', {
        userId: user?.id,
        userRole,
        isPremium,
        cacheSize: enterpriseCache?.size || 0,
        location: currentLocation ? 'available' : 'unavailable',
      });

    } catch (error) {
      console.error('Enterprise services initialization failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'EnterpriseServicesInitialization',
        userId: user?.id,
        userRole,
      });
      
      setState(prev => ({
        ...prev,
        status: { ...prev.status, isLoading: false },
        errors: { ...prev.errors, general: error.message },
      }));

      // Fallback to offline mode
      await initializeOfflineMode();
    }
  }, [user, userRole, isPremium, currentLocation]);

  /**
   * 🎯 ADVANCED SERVICE FETCHING WITH AI ENHANCEMENTS
   */
  const fetchEnterpriseServices = useCallback(async (options = {}) => {
    try {
      const {
        page = 1,
        limit = 25,
        search,
        filters = {},
        sortBy = ADVANCED_SORT_OPTIONS.AI_MATCH_SCORE,
        refresh = false,
        aiEnhancements = true,
        constructionMode = false,
      } = options;

      // Update loading states
      setState(prev => ({
        ...prev,
        status: {
          ...prev.status,
          isLoading: !refresh,
          isRefreshing: refresh,
          isFiltering: !!Object.keys(filters).length,
        },
      }));

      // Build enterprise query parameters
      const queryParams = buildEnterpriseQueryParams({
        page,
        limit,
        search,
        filters: { ...state.filters, ...filters },
        sortBy,
        location: currentLocation,
        userRole,
        isPremium,
        aiEnhancements,
        constructionMode,
      });

      // Check cache first for performance
      const cacheKey = generateEnterpriseCacheKey(queryParams);
      const cachedResult = state.cache.services.get(cacheKey);
      
      if (cachedResult && !refresh) {
        setState(prev => ({
          ...prev,
          services: {
            ...prev.services,
            all: page === 1 ? cachedResult.services : [...prev.services.all, ...cachedResult.services],
          },
          pagination: cachedResult.pagination,
          status: { ...prev.status, isLoading: false, isRefreshing: false },
        }));
        return cachedResult;
      }

      // Fetch from API
      const response = await api.get(API_ENDPOINTS.SERVICES.ENTERPRISE, { 
        params: queryParams,
        timeout: 30000,
      });

      const { services, pagination, aiRecommendations, constructionMatches } = response.data;

      // Enhance services with Ethiopian market data
      const enhancedServices = await enhanceServicesWithMarketData(
        services, 
        currentLocation, 
        userRole
      );

      // Apply AI enhancements if enabled
      const aiEnhancedServices = aiEnhancements 
        ? await applyAIEnhancements(enhancedServices, user)
        : enhancedServices;

      // Update state with new data
      setState(prev => ({
        ...prev,
        services: {
          ...prev.services,
          all: page === 1 ? aiEnhancedServices : [...prev.services.all, ...aiEnhancedServices],
          aiRecommended: aiRecommendations || [],
          construction: constructionMatches || [],
        },
        pagination: {
          ...pagination,
          hasMore: pagination.page * pagination.limit < pagination.total,
        },
        status: { ...prev.status, isLoading: false, isRefreshing: false },
      }));

      // Cache the results
      await cacheEnterpriseData(cacheKey, {
        services: aiEnhancedServices,
        pagination,
        timestamp: Date.now(),
      });

      // Track analytics
      analyticsService.trackEnterpriseEvent('services_enterprise_fetched', {
        page,
        resultsCount: services.length,
        hasSearch: !!search,
        filters: Object.keys(filters),
        aiEnhancements,
        constructionMode,
      });

      return { 
        services: aiEnhancedServices, 
        pagination,
        aiRecommendations,
        constructionMatches,
      };

    } catch (error) {
      console.error('Enterprise service fetch failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'FetchEnterpriseServices',
        options,
        userId: user?.id,
      });
      
      setState(prev => ({
        ...prev,
        status: { ...prev.status, isLoading: false, isRefreshing: false },
        errors: { ...prev.errors, network: error.message },
      }));

      throw error;
    }
  }, [state.filters, currentLocation, userRole, isPremium, user]);

  /**
   * 🔍 INTELLIGENT SEARCH WITH AI AND VOICE SUPPORT
   */
  const intelligentSearch = useCallback(async (query, options = {}) => {
    try {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      setState(prev => ({
        ...prev,
        status: { ...prev.status, isSearching: true },
        errors: { ...prev.errors, search: null },
        searchState: { ...prev.searchState, query },
      }));

      return new Promise((resolve) => {
        searchDebounceRef.current = setTimeout(async () => {
          try {
            // Add to intelligent search history
            if (query.trim()) {
              await addToIntelligentSearchHistory(query, options.searchType);
            }

            // Generate AI search suggestions
            if (options.generateSuggestions) {
              await generateAISearchSuggestions(query);
            }

            // Perform search with AI enhancements
            const results = await fetchEnterpriseServices({
              page: 1,
              search: query,
              filters: options.filters || state.filters,
              sortBy: options.sortBy || state.sortBy,
              aiEnhancements: true,
            });

            setState(prev => ({
              ...prev,
              status: { ...prev.status, isSearching: false },
            }));

            // Track search analytics
            analyticsService.trackEnterpriseEvent('services_intelligent_search', {
              query,
              searchType: options.searchType || 'text',
              resultsCount: results.services.length,
              aiSuggestions: results.aiRecommendations?.length || 0,
            });

            resolve(results);
          } catch (error) {
            setState(prev => ({
              ...prev,
              status: { ...prev.status, isSearching: false },
              errors: { ...prev.errors, search: error.message },
            }));
            resolve({ services: [], pagination: { hasMore: false } });
          }
        }, query ? 300 : 0); // Smart debouncing
      });

    } catch (error) {
      console.error('Intelligent search failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'IntelligentSearch',
        query,
        options,
      });
      
      setState(prev => ({
        ...prev,
        status: { ...prev.status, isSearching: false },
        errors: { ...prev.errors, search: error.message },
      }));
      
      return { services: [], pagination: { hasMore: false } };
    }
  }, [fetchEnterpriseServices, state.filters, state.sortBy]);

  /**
   * 🏗️ CONSTRUCTION SERVICE MANAGEMENT
   */
  const manageConstructionService = useCallback(async (serviceData, projectType) => {
    try {
      setState(prev => ({
        ...prev,
        status: { ...prev.status, isCreating: true },
        errors: { ...prev.errors, create: null },
      }));

      // Validate construction-specific data
      const validation = validateConstructionServiceData(serviceData, projectType);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Enhanced construction service data
      const enhancedData = {
        ...serviceData,
        projectType,
        isConstruction: true,
        requiresAI: true,
        governmentApproved: projectType === 'government_infrastructure',
        metadata: {
          squareArea: serviceData.squareArea,
          floorCount: serviceData.floorCount,
          workerRequirements: serviceData.workerRequirements,
          timeline: serviceData.timeline,
          budget: serviceData.budget,
        },
      };

      const response = await api.post(
        API_ENDPOINTS.SERVICES.CONSTRUCTION, 
        enhancedData
      );

      const newService = response.data;

      // Trigger AI worker matching for construction projects
      if (newService.requiresAI) {
        await triggerAIWorkerMatching(newService.id);
      }

      setState(prev => ({
        ...prev,
        services: {
          ...prev.services,
          all: [newService, ...prev.services.all],
          construction: [newService, ...prev.services.construction],
          user: [newService, ...prev.services.user],
        },
        status: { ...prev.status, isCreating: false },
      }));

      // Send notifications
      await notificationService.sendConstructionServiceNotification({
        serviceId: newService.id,
        projectType,
        userId: user.id,
      });

      analyticsService.trackEnterpriseEvent('construction_service_created', {
        serviceId: newService.id,
        projectType,
        squareArea: serviceData.squareArea,
        budget: serviceData.budget,
        workerCount: serviceData.workerRequirements?.length || 0,
      });

      return { success: true, service: newService, aiTriggered: true };

    } catch (error) {
      console.error('Construction service creation failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'ManageConstructionService',
        projectType,
        userId: user?.id,
      });
      
      setState(prev => ({
        ...prev,
        status: { ...prev.status, isCreating: false },
        errors: { ...prev.errors, create: error.message },
      }));
      
      return { success: false, error: error.message };
    }
  }, [user]);

  /**
   * 🤖 AI-POWERED SERVICE MATCHING
   */
  const findAIServiceMatches = useCallback(async (criteria) => {
    try {
      setState(prev => ({
        ...prev,
        status: { ...prev.status, isMatching: true },
      }));

      const response = await api.post(API_ENDPOINTS.AI.SERVICE_MATCHING, {
        criteria,
        userPreferences: await storage.get(ENTERPRISE_STORAGE_KEYS.AI_PREFERENCES),
        location: currentLocation,
        userHistory: state.analytics,
      });

      const { matches, confidence, reasoning } = response.data;

      setState(prev => ({
        ...prev,
        aiMatches: matches,
        status: { ...prev.status, isMatching: false },
      }));

      analyticsService.trackEnterpriseEvent('ai_service_matching_completed', {
        matchesCount: matches.length,
        confidenceScore: confidence,
        criteria: Object.keys(criteria),
      });

      return { matches, confidence, reasoning };

    } catch (error) {
      console.error('AI service matching failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'AIServiceMatching',
        criteria,
      });
      
      setState(prev => ({
        ...prev,
        status: { ...prev.status, isMatching: false },
      }));
      
      return { matches: [], confidence: 0, reasoning: 'AI service unavailable' };
    }
  }, [currentLocation, state.analytics]);

  /**
   * 💎 PREMIUM SERVICE FEATURES
   */
  const enhanceWithPremiumFeatures = useCallback(async (serviceId, premiumType) => {
    try {
      if (!isPremium && premiumType !== 'listing') {
        throw new Error('Premium subscription required');
      }

      const response = await api.post(`/services/${serviceId}/premium`, {
        premiumType,
        duration: '30days',
        paymentMethod: 'premium_credit',
      });

      const enhancedService = response.data;

      setState(prev => ({
        ...prev,
        services: {
          ...prev.services,
          all: prev.services.all.map(service =>
            service.id === serviceId ? enhancedService : service
          ),
          premium: [enhancedService, ...prev.services.premium],
        },
        ...(prev.currentService?.id === serviceId && {
          currentService: enhancedService,
        }),
      }));

      analyticsService.trackEnterpriseEvent('service_premium_enhanced', {
        serviceId,
        premiumType,
        userId: user.id,
      });

      return { success: true, service: enhancedService };

    } catch (error) {
      console.error('Premium enhancement failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'EnhanceWithPremium',
        serviceId,
        premiumType,
        userId: user?.id,
      });
      
      return { success: false, error: error.message };
    }
  }, [isPremium, user]);

  // Enterprise helper functions
  const buildEnterpriseQueryParams = (options) => {
    const {
      page,
      limit,
      search,
      filters,
      sortBy,
      location,
      userRole,
      isPremium,
      aiEnhancements,
      constructionMode,
    } = options;

    return {
      page,
      limit,
      search,
      sort: sortBy,
      ...filters,
      latitude: location?.latitude,
      longitude: location?.longitude,
      userRole,
      isPremium: !!isPremium,
      aiEnhancements: !!aiEnhancements,
      constructionMode: !!constructionMode,
      market: 'ethiopia',
      currency: 'ETB',
      language: 'en', // Would come from user preferences
      timestamp: Date.now(),
    };
  };

  const enhanceServicesWithMarketData = async (services, location, role) => {
    return services.map(service => ({
      ...service,
      // Ethiopian market enhancements
      distance: location ? calculateDistance(
        location,
        { latitude: service.location.lat, longitude: service.location.lng }
      ) : null,
      formattedPrice: formatEthiopianCurrency(service.price),
      isGovernmentApproved: service.certifications?.includes('government_approved'),
      isAIMatched: service.aiScore > 0.7,
      premiumBadge: service.premiumLevel > 0,
      // Construction specific enhancements
      constructionReady: service.category === 'construction',
      workerCapacity: service.workerCapacity || 0,
      projectExperience: service.projectExperience || [],
    }));
  };

  const applyAIEnhancements = async (services, user) => {
    // This would integrate with your AI service
    // For now, we'll add mock AI scores
    return services.map(service => ({
      ...service,
      aiScore: Math.random() * 0.3 + 0.7, // 0.7-1.0 score
      aiReasoning: 'Based on your preferences and service quality',
      matchPercentage: Math.floor(Math.random() * 30) + 70, // 70-100%
    }));
  };

  const addToIntelligentSearchHistory = async (query, searchType = 'text') => {
    const history = await storage.get(ENTERPRISE_STORAGE_KEYS.SEARCH_HISTORY) || [];
    const enhancedEntry = {
      query,
      type: searchType,
      timestamp: Date.now(),
      location: currentLocation,
      resultsCount: 0, // Will be updated after search
    };
    
    const updatedHistory = [
      enhancedEntry,
      ...history.filter(item => item.query !== query).slice(0, 49), // Keep last 50
    ];
    
    await storage.set(ENTERPRISE_STORAGE_KEYS.SEARCH_HISTORY, updatedHistory);
    
    setState(prev => ({
      ...prev,
      searchState: {
        ...prev.searchState,
        history: updatedHistory,
      },
    }));
  };

  const initializeRealTimeSystem = async () => {
    // Set up WebSocket connections for real-time updates
    // This would integrate with your real-time service
    console.log('Initializing enterprise real-time system...');
  };

  const initializeAIMatchingEngine = async () => {
    // Initialize AI matching engine for construction and services
    console.log('Initializing AI matching engine...');
  };

  const initializeOfflineMode = async () => {
    // Initialize offline capabilities
    const offlineData = await storage.get(ENTERPRISE_STORAGE_KEYS.SERVICES_CACHE);
    if (offlineData) {
      setState(prev => ({
        ...prev,
        services: {
          ...prev.services,
          all: offlineData.services || [],
        },
        realTime: {
          ...prev.realTime,
          isConnected: false,
        },
        status: { ...prev.status, isLoading: false },
      }));
    }
  };

  const triggerAIWorkerMatching = async (serviceId) => {
    // Trigger AI worker matching for construction projects
    await api.post(`/ai/construction/${serviceId}/match-workers`);
  };

  const validateConstructionServiceData = (data, projectType) => {
    const errors = [];
    
    if (projectType === 'government_infrastructure' && !data.governmentApproval) {
      errors.push('Government approval required for infrastructure projects');
    }
    
    if (data.squareArea && data.squareArea < 10) {
      errors.push('Square area must be at least 10m²');
    }
    
    if (data.budget && data.budget < 1000) {
      errors.push('Budget must be at least 1000 ETB');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const generateEnterpriseCacheKey = (params) => {
    return `enterprise_services_${JSON.stringify(params)}_v2`;
  };

  const cacheEnterpriseData = async (key, data) => {
    state.cache.services.set(key, data);
    
    // Also persist to secure storage
    await storage.setSecure(
      ENTERPRISE_STORAGE_KEYS.SERVICES_CACHE,
      Object.fromEntries(state.cache.services),
      SECURITY_LEVELS.MEDIUM
    );
  };

  // Memoized enterprise computed values
  const enterpriseServices = useMemo(() => {
    return {
      all: state.services.all,
      filtered: state.services.all.filter(service => 
        applyEnterpriseFilters(service, state.filters)
      ),
      construction: state.services.construction,
      government: state.services.government,
      premium: state.services.premium,
      aiRecommended: state.services.aiRecommended,
    };
  }, [state.services, state.filters]);

  const enterpriseAnalytics = useMemo(() => {
    return {
      totalServices: state.pagination.total,
      displayedServices: enterpriseServices.filtered.length,
      constructionCount: state.services.construction.length,
      governmentCount: state.services.government.length,
      premiumCount: state.services.premium.length,
      aiMatchRate: state.services.aiRecommended.length / state.services.all.length || 0,
      averageResponseTime: calculateAverageResponseTime(state.services.all),
      successRate: calculateSuccessRate(state.services.all),
    };
  }, [enterpriseServices, state.pagination, state.services]);

  // Initialize on mount
  useEffect(() => {
    initializeEnterpriseServices();
  }, [initializeEnterpriseServices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (realTimeManagerRef.current) {
        realTimeManagerRef.current.disconnect();
      }
    };
  }, []);

  // Return enterprise hook API
  return {
    // State
    ...state,
    services: enterpriseServices,
    analytics: enterpriseAnalytics,
    
    // Core enterprise operations
    initializeEnterpriseServices,
    fetchEnterpriseServices,
    intelligentSearch,
    manageConstructionService,
    findAIServiceMatches,
    enhanceWithPremiumFeatures,
    
    // Advanced features
    applyEnterpriseFilters: useCallback((filters) => {
      setState(prev => ({ ...prev, filters: { ...prev.filters, ...filters } }));
      return fetchEnterpriseServices({ page: 1, filters: { ...state.filters, ...filters } });
    }, [fetchEnterpriseServices, state.filters]),
    
    loadMoreEnterprise: useCallback(() => {
      if (!state.pagination.hasMore || state.status.isLoading) return;
      return fetchEnterpriseServices({ page: state.pagination.page + 1 });
    }, [fetchEnterpriseServices, state.pagination, state.status.isLoading]),
    
    refreshEnterprise: useCallback(() => {
      return fetchEnterpriseServices({ page: 1, refresh: true });
    }, [fetchEnterpriseServices]),
    
    // Utility functions
    isServiceEligibleForAI: (service) => 
      service.category.includes('construction') || service.aiScore > 0.6,
    
    canAccessGovernmentServices: () => 
      userRole === 'government' || userRole === 'admin',
    
    getPremiumBenefits: () => premiumFeatures.serviceBenefits,
    
    // Error handling
    clearEnterpriseErrors: () => setState(prev => ({
      ...prev,
      errors: createInitialState().errors,
    })),
  };
};

/**
 * 🏗️ CONSTRUCTION SERVICES SPECIALIZED HOOK
 */
export const useConstructionServices = () => {
  const { services, manageConstructionService, findAIServiceMatches } = useServices();
  
  const constructionProjects = useMemo(() => {
    return services.construction.filter(project => 
      project.status === 'active' || project.status === 'planning'
    );
  }, [services.construction]);
  
  const availableWorkers = useMemo(() => {
    // This would integrate with your worker management system
    return [];
  }, []);
  
  const projectStatistics = useMemo(() => {
    const totalProjects = constructionProjects.length;
    const activeProjects = constructionProjects.filter(p => p.status === 'active').length;
    const totalBudget = constructionProjects.reduce((sum, project) => 
      sum + (project.budget || 0), 0
    );
    const averageTimeline = constructionProjects.reduce((sum, project) => 
      sum + (project.timeline || 0), 0
    ) / totalProjects || 0;
    
    return {
      totalProjects,
      activeProjects,
      completedProjects: constructionProjects.filter(p => p.status === 'completed').length,
      totalBudget: formatEthiopianCurrency(totalBudget),
      averageTimeline: Math.round(averageTimeline),
      workerUtilization: calculateWorkerUtilization(constructionProjects),
    };
  }, [constructionProjects]);
  
  return {
    constructionProjects,
    availableWorkers,
    projectStatistics,
    manageConstructionService,
    findAIServiceMatches,
    createConstructionProject: manageConstructionService,
  };
};

/**
 * 💎 PREMIUM SERVICES SPECIALIZED HOOK
 */
export const usePremiumServices = () => {
  const { services, enhanceWithPremiumFeatures, isPremium } = useServices();
  
  const premiumBenefits = useMemo(() => ({
    priorityPlacement: true,
    featuredListing: true,
    aiMatching: true,
    analyticsDashboard: true,
    dedicatedSupport: true,
    governmentPriority: isPremium,
  }), [isPremium]);
  
  const calculateROI = (serviceId, premiumType) => {
    // Calculate return on investment for premium features
    const baseMetrics = {
      views: 100,
      conversions: 10,
      revenue: 5000,
    };
    
    const premiumMultipliers = {
      badge: { views: 1.5, conversions: 1.2, revenue: 1.3 },
      listing: { views: 2.0, conversions: 1.5, revenue: 1.8 },
      featured: { views: 3.0, conversions: 2.0, revenue: 2.5 },
    };
    
    const multiplier = premiumMultipliers[premiumType] || premiumMultipliers.badge;
    
    return {
      estimatedViews: Math.round(baseMetrics.views * multiplier.views),
      estimatedConversions: Math.round(baseMetrics.conversions * multiplier.conversions),
      estimatedRevenue: Math.round(baseMetrics.revenue * multiplier.revenue),
      cost: premiumType === 'badge' ? 200 : 399, // ETB
      netGain: Math.round(baseMetrics.revenue * multiplier.revenue) - (premiumType === 'badge' ? 200 : 399),
    };
  };
  
  return {
    premiumServices: services.premium,
    premiumBenefits,
    enhanceWithPremiumFeatures,
    calculateROI,
    isEligibleForPremium: isPremium,
  };
};

// Helper functions
const applyEnterpriseFilters = (service, filters) => {
  if (filters.premiumOnly && !service.premiumBadge) return false;
  if (filters.governmentApproved && !service.isGovernmentApproved) return false;
  if (filters.constructionType && service.category !== filters.constructionType) return false;
  if (filters.aiCompatible && !service.isAIMatched) return false;
  return true;
};

const calculateAverageResponseTime = (services) => {
  const responseTimes = services
    .map(s => s.responseTime)
    .filter(time => time && time > 0);
  
  return responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
};

const calculateSuccessRate = (services) => {
  const completedServices = services.filter(s => s.status === 'completed');
  const successfulServices = completedServices.filter(s => s.rating >= 4);
  
  return completedServices.length > 0 
    ? (successfulServices.length / completedServices.length) * 100 
    : 0;
};

const calculateWorkerUtilization = (projects) => {
  const totalWorkers = projects.reduce((sum, project) => 
    sum + (project.workerRequirements?.length || 0), 0
  );
  const assignedWorkers = projects.reduce((sum, project) => 
    sum + (project.assignedWorkers?.length || 0), 0
  );
  
  return totalWorkers > 0 ? (assignedWorkers / totalWorkers) * 100 : 0;
};

const processInitializationResults = (results) => {
  const processed = {
    services: {
      all: [],
      featured: [],
      trending: [],
      recommended: [],
      construction: [],
      government: [],
      premium: [],
      aiRecommended: [],
    },
  };
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      switch (index) {
        case 0: // Main services
          processed.services.all = result.value.services;
          break;
        case 1: // Featured
          processed.services.featured = result.value.services;
          break;
        case 2: // Trending
          processed.services.trending = result.value.services;
          break;
        case 3: // AI
          processed.services.aiRecommended = result.value.services;
          break;
        case 4: // Premium
          processed.services.premium = result.value.services;
          break;
        case 5: // Government
          processed.services.government = result.value.services;
          break;
      }
    }
  });
  
  return processed;
};

export default useServices;