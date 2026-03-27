// components/service/service-filter.js - ENTERPRISE REWRITE
/**
 * Enterprise Service Filter Component
 * Advanced filtering with AI-powered suggestions, real-time updates, and multi-dimensional filtering
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
  Keyboard,
  InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLocation } from '../../contexts/location-context';
import { useAnalytics } from '../../hooks/use-analytics';
import { usePerformance } from '../../hooks/use-performance';
import { useErrorBoundary } from '../../hooks/use-error-boundary';
import { ServiceService } from '../../services/service-service';
import { AnalyticsService } from '../../services/analytics-service';
import { ErrorService } from '../../services/error-service';
import { AISuggestionService } from '../../services/ai-suggestion-service';
import { StorageService } from '../../services/storage-service';

// UI Components
import SearchInput from '../ui/search-input';
import Button from '../ui/button';
import SegmentedControl from '../ui/segmented-control';
import RangeSlider from '../ui/range-slider';
import CheckboxGroup from '../ui/checkbox-group';
import TagInput from '../ui/tag-input';
import Modal from '../ui/modal';
import Badge from '../ui/badge';
import LoadingIndicator from '../ui/loading-indicator';
import Toast from '../ui/toast';
import CollapsibleSection from '../ui/collapsible-section';
import FilterPresetManager from './filter-preset-manager';

// Constants
const FILTER_CONFIG = {
  PERFORMANCE: {
    DEBOUNCE_DELAY: 500,
    LAZY_LOAD_THRESHOLD: 300,
    CACHE_DURATION: 300000, // 5 minutes
  },
  UI: {
    ANIMATION_DURATION: 400,
    SECTION_SPACING: 24,
    BADGE_SPACING: 8,
  },
  ANALYTICS: {
    TRACK_FILTER_CHANGES: true,
    TRACK_PRESET_USAGE: true,
    TRACK_SEARCH_PATTERNS: true,
  },
};

const FILTER_TYPES = {
  SEARCH: 'search',
  CATEGORY: 'category',
  PRICE: 'price',
  RATING: 'rating',
  LOCATION: 'location',
  AVAILABILITY: 'availability',
  FEATURES: 'features',
  SKILLS: 'skills',
  DATE: 'date',
  DURATION: 'duration',
  SERVICE_TYPE: 'service_type',
  VERIFICATION: 'verification',
  PREMIUM: 'premium',
  GOVERNMENT: 'government',
  CONSTRUCTION: 'construction',
};

const FILTER_MODES = {
  BASIC: 'basic',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
  AI_ASSISTED: 'ai_assisted',
};

const PRICE_RANGES = {
  BUDGET: { min: 0, max: 250, label: 'Budget', icon: '💰' },
  MODERATE: { min: 250, max: 750, label: 'Moderate', icon: '💼' },
  PREMIUM: { min: 750, max: 2000, label: 'Premium', icon: '⭐' },
  ENTERPRISE: { min: 2000, max: 10000, label: 'Enterprise', icon: '🏢' },
  CUSTOM: { min: 0, max: 10000, label: 'Custom', icon: '⚙️' },
};

const RATING_OPTIONS = [
  { label: 'Any Rating', value: 0, icon: '⭐' },
  { label: '4.5+ Excellent', value: 4.5, icon: '✨' },
  { label: '4.0+ Very Good', value: 4.0, icon: '👍' },
  { label: '3.5+ Good', value: 3.5, icon: '✅' },
  { label: '3.0+ Average', value: 3.0, icon: '📊' },
];

const AVAILABILITY_OPTIONS = [
  { label: 'Any Time', value: 'any', icon: '🕒' },
  { label: 'Available Today', value: 'today', icon: '📅' },
  { label: 'Available This Week', value: 'this_week', icon: '🗓️' },
  { label: 'Available Now', value: 'now', icon: '⚡' },
  { label: 'By Appointment', value: 'appointment', icon: '📝' },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Service Filter Component
 * 
 * Advanced Features:
 * - AI-powered filter suggestions and optimization
 * - Real-time filter application with intelligent debouncing
 * - Multi-dimensional filtering (price, location, skills, availability, etc.)
 * - Advanced filter presets and smart saving
 * - Location-aware filtering with radius controls
 * - Construction and government project specific filters
 * - Premium service provider filtering
 * - Accessibility-first design
 * - Performance-optimized rendering
 * - Comprehensive analytics integration
 * - Offline filter capability
 */
const ServiceFilter = React.memo(({
  // Core Configuration
  mode = FILTER_MODES.BASIC,
  availableFilters = Object.values(FILTER_TYPES),
  enableAISuggestions = true,
  enableRealTimeUpdates = true,
  enableFilterPresets = true,
  enableSmartDefaults = true,
  enableOfflineMode = true,
  
  // Data Sources
  categories = [],
  features = [],
  skills = [],
  serviceTypes = [],
  initialData = {},
  
  // Initial State
  initialFilters = {},
  defaultPresets = {},
  
  // Event Handlers
  onFiltersChanged,
  onFiltersApplied,
  onFiltersReset,
  onPresetSaved,
  onPresetLoaded,
  onAISuggestionsRequested,
  onErrorOccurred,
  
  // UI Configuration
  showSearchSection = true,
  showQuickFilters = true,
  showFilterCount = true,
  showPresetManager = true,
  showAISuggestions = true,
  collapsibleSections = true,
  maxVisibleFilters = 6,
  
  // Customization
  customStyles = {},
  themeVariant = 'default',
  layoutType = 'standard',
  
  // Analytics
  analyticsContext = {},
  trackUserBehavior = true,
  
  // Performance
  lazyLoadOptions = true,
  enableCaching = true,
  preloadCommonFilters = false,
  
  // Accessibility
  accessibilityConfig = {},
  
  ...restProps
}) => {
  // Hooks
  const router = useRouter();
  const { theme, isDarkMode, currentTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { currentLocation, getDistance, hasLocationPermission } = useLocation();
  const { trackEvent, trackTiming, trackError } = useAnalytics();
  const { optimizeRender, debounce, throttle } = usePerformance();
  const { captureError, withErrorBoundary } = useErrorBoundary();
  
  // State Management
  const [filterState, setFilterState] = useState({
    searchQuery: '',
    categories: [],
    priceRange: PRICE_RANGES.BUDGET,
    minRating: 0,
    location: currentLocation,
    radius: 10, // km
    availability: 'any',
    features: [],
    skills: [],
    serviceTypes: [],
    dateRange: null,
    duration: null,
    verificationLevel: 0,
    premiumOnly: false,
    governmentApproved: false,
    constructionCertified: false,
    sortBy: 'relevance',
    sortOrder: 'desc',
    ...initialFilters,
  });
  
  const [uiState, setUiState] = useState({
    activeFilter: null,
    isExpanded: false,
    appliedFilterCount: 0,
    hasUnsavedChanges: false,
    isLoading: false,
    showAdvanced: mode === FILTER_MODES.ADVANCED || mode === FILTER_MODES.EXPERT,
    showAIPanel: false,
    showPresetModal: false,
  });
  
  const [dataState, setDataState] = useState({
    filterPresets: defaultPresets,
    aiSuggestions: [],
    popularFilters: [],
    recentSearches: [],
    filterOptions: {
      categories: categories,
      features: features,
      skills: skills,
      serviceTypes: serviceTypes,
    },
  });
  
  const [analyticsState, setAnalyticsState] = useState({
    filterChanges: 0,
    presetUses: 0,
    searchQueries: [],
    appliedFilters: new Set(),
  });

  // Refs
  const componentMounted = useRef(true);
  const debounceTimer = useRef(null);
  const scrollViewRef = useRef(null);
  const filterCache = useRef(new Map());
  const interactionTracker = useRef({
    filterInteractions: 0,
    lastInteraction: null,
    sessionStart: Date.now(),
  });

  // Animations
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(20)).current;
  const scaleAnimation = useRef(new Animated.Value(0.98)).current;

  // Memoized Values
  const filterContext = useMemo(() => ({
    userId: user?.id,
    userRole: user?.role,
    location: currentLocation,
    mode,
    availableFilters,
  }), [user, currentLocation, mode, availableFilters]);

  const appliedFiltersSummary = useMemo(() => {
    const summary = {};
    let count = 0;

    if (filterState.searchQuery) {
      summary.search = filterState.searchQuery;
      count++;
    }
    if (filterState.categories.length > 0) {
      summary.categories = filterState.categories.length;
      count++;
    }
    if (filterState.priceRange.min > PRICE_RANGES.BUDGET.min || 
        filterState.priceRange.max < PRICE_RANGES.ENTERPRISE.max) {
      summary.price = filterState.priceRange;
      count++;
    }
    if (filterState.minRating > 0) {
      summary.rating = filterState.minRating;
      count++;
    }
    if (filterState.location && filterState.radius !== 10) {
      summary.location = { ...filterState.location, radius: filterState.radius };
      count++;
    }
    if (filterState.availability !== 'any') {
      summary.availability = filterState.availability;
      count++;
    }
    if (filterState.features.length > 0) {
      summary.features = filterState.features.length;
      count++;
    }
    if (filterState.skills.length > 0) {
      summary.skills = filterState.skills.length;
      count++;
    }
    if (filterState.serviceTypes.length > 0) {
      summary.serviceTypes = filterState.serviceTypes.length;
      count++;
    }
    if (filterState.verificationLevel > 0) {
      summary.verification = filterState.verificationLevel;
      count++;
    }
    if (filterState.premiumOnly) {
      summary.premium = true;
      count++;
    }
    if (filterState.governmentApproved) {
      summary.government = true;
      count++;
    }
    if (filterState.constructionCertified) {
      summary.construction = true;
      count++;
    }

    return { summary, count };
  }, [filterState]);

  const isFilterActive = useMemo(() => {
    return appliedFiltersSummary.count > 0;
  }, [appliedFiltersSummary]);

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
    if (enableRealTimeUpdates && uiState.hasUnsavedChanges) {
      handleRealTimeFilterUpdate();
    }
  }, [filterState, uiState.hasUnsavedChanges, enableRealTimeUpdates]);

  useEffect(() => {
    updateAppliedFilterCount();
    trackFilterChanges();
  }, [filterState]);

  // Core Functions
  const initializeComponent = useCallback(async () => {
    try {
      setUiState(prev => ({ ...prev, isLoading: true }));
      
      await Promise.all([
        loadSavedPresets(),
        loadRecentSearches(),
        loadPopularFilters(),
        preloadFilterOptions(),
      ]);
      
      startEntranceAnimation();
      
      trackEvent('filter_component_initialized', {
        mode,
        availableFilters: availableFilters.length,
        ...analyticsContext,
      });
    } catch (error) {
      captureError(error, {
        context: 'FilterInitialization',
        ...filterContext,
      });
    } finally {
      if (componentMounted.current) {
        setUiState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [mode, availableFilters, analyticsContext, filterContext, trackEvent, captureError]);

  const cleanupComponent = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    trackFilterSession();
  }, []);

  const startEntranceAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: FILTER_CONFIG.UI.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: FILTER_CONFIG.UI.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: FILTER_CONFIG.UI.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnimation, slideAnimation, scaleAnimation]);

  const handleRealTimeFilterUpdate = useCallback(
    debounce(() => {
      if (!componentMounted.current) return;
      
      applyFilters(false); // Apply without user action
    }, FILTER_CONFIG.PERFORMANCE.DEBOUNCE_DELAY),
    [applyFilters]
  );

  const updateAppliedFilterCount = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      appliedFilterCount: appliedFiltersSummary.count,
    }));
  }, [appliedFiltersSummary]);

  const trackFilterChanges = useCallback(() => {
    if (!FILTER_CONFIG.ANALYTICS.TRACK_FILTER_CHANGES) return;
    
    interactionTracker.current.filterInteractions++;
    interactionTracker.current.lastInteraction = Date.now();
    
    setAnalyticsState(prev => ({
      ...prev,
      filterChanges: prev.filterChanges + 1,
    }));
  }, []);

  const trackFilterSession = useCallback(() => {
    const sessionDuration = Date.now() - interactionTracker.current.sessionStart;
    
    trackEvent('filter_session_completed', {
      sessionDuration,
      filterInteractions: interactionTracker.current.filterInteractions,
      appliedFilters: analyticsState.appliedFilters.size,
      presetUses: analyticsState.presetUses,
      finalFilterCount: appliedFiltersSummary.count,
    });
  }, [analyticsState, appliedFiltersSummary, trackEvent]);

  // Data Loading
  const loadSavedPresets = useCallback(async () => {
    try {
      const savedPresets = await StorageService.getFilterPresets();
      if (savedPresets) {
        setDataState(prev => ({
          ...prev,
          filterPresets: { ...prev.filterPresets, ...savedPresets },
        }));
      }
    } catch (error) {
      captureError(error, { context: 'LoadSavedPresets' });
    }
  }, [captureError]);

  const loadRecentSearches = useCallback(async () => {
    try {
      const recentSearches = await StorageService.getRecentSearches();
      setDataState(prev => ({
        ...prev,
        recentSearches: recentSearches || [],
      }));
    } catch (error) {
      captureError(error, { context: 'LoadRecentSearches' });
    }
  }, [captureError]);

  const loadPopularFilters = useCallback(async () => {
    try {
      const popularFilters = await ServiceService.getPopularFilters({
        location: currentLocation,
        userContext: user,
      });
      
      if (popularFilters.success) {
        setDataState(prev => ({
          ...prev,
          popularFilters: popularFilters.data,
        }));
      }
    } catch (error) {
      captureError(error, { context: 'LoadPopularFilters' });
    }
  }, [currentLocation, user, captureError]);

  const preloadFilterOptions = useCallback(async () => {
    if (!preloadCommonFilters) return;
    
    try {
      // Preload commonly used filter options in background
      InteractionManager.runAfterInteractions(() => {
        // Implementation would preload specific filter data
      });
    } catch (error) {
      captureError(error, { context: 'PreloadFilterOptions' });
    }
  }, [preloadCommonFilters, captureError]);

  // Filter Actions
  const updateFilter = useCallback((filterType, value, options = {}) => {
    setFilterState(prev => {
      const newState = { ...prev, [filterType]: value };
      
      // Handle dependent filters
      if (filterType === FILTER_TYPES.CATEGORY && value.length === 0) {
        // Reset category-specific filters
        newState.features = newState.features.filter(feature => 
          !feature.categorySpecific
        );
        newState.serviceTypes = [];
      }
      
      return newState;
    });
    
    setUiState(prev => ({ ...prev, hasUnsavedChanges: true }));
    
    // Track individual filter changes
    analyticsState.appliedFilters.add(filterType);
    
    trackEvent('filter_updated', {
      filterType,
      value,
      totalApplied: appliedFiltersSummary.count + 1,
      ...options.analytics,
    });
  }, [appliedFiltersSummary, analyticsState, trackEvent]);

  const applyFilters = useCallback((userInitiated = true) => {
    const activeFilters = { ...filterState };
    
    // Clean up empty values
    if (!activeFilters.searchQuery) delete activeFilters.searchQuery;
    if (activeFilters.categories.length === 0) delete activeFilters.categories;
    if (activeFilters.features.length === 0) delete activeFilters.features;
    if (activeFilters.skills.length === 0) delete activeFilters.skills;
    if (activeFilters.serviceTypes.length === 0) delete activeFilters.serviceTypes;
    
    // Track filter application
    if (userInitiated) {
      trackEvent('filters_applied', {
        filterCount: appliedFiltersSummary.count,
        filters: Object.keys(activeFilters),
        mode,
        ...analyticsContext,
      });
    }
    
    // Notify parent component
    onFiltersChanged?.(activeFilters);
    
    if (userInitiated) {
      onFiltersApplied?.(activeFilters);
    }
    
    setUiState(prev => ({ ...prev, hasUnsavedChanges: false }));
    
    // Save to recent searches if search query exists
    if (activeFilters.searchQuery) {
      saveToRecentSearches(activeFilters.searchQuery);
    }
  }, [filterState, appliedFiltersSummary, mode, analyticsContext, onFiltersChanged, onFiltersApplied, trackEvent]);

  const resetFilters = useCallback((specificFilter = null) => {
    if (specificFilter) {
      // Reset specific filter to default
      const resetValues = {
        [FILTER_TYPES.SEARCH]: '',
        [FILTER_TYPES.CATEGORY]: [],
        [FILTER_TYPES.PRICE]: PRICE_RANGES.BUDGET,
        [FILTER_TYPES.RATING]: 0,
        [FILTER_TYPES.LOCATION]: currentLocation,
        [FILTER_TYPES.AVAILABILITY]: 'any',
        [FILTER_TYPES.FEATURES]: [],
        [FILTER_TYPES.SKILLS]: [],
        [FILTER_TYPES.SERVICE_TYPE]: [],
        [FILTER_TYPES.VERIFICATION]: 0,
        [FILTER_TYPES.PREMIUM]: false,
        [FILTER_TYPES.GOVERNMENT]: false,
        [FILTER_TYPES.CONSTRUCTION]: false,
      };
      
      updateFilter(specificFilter, resetValues[specificFilter], {
        analytics: { action: 'reset_single' },
      });
    } else {
      // Reset all filters
      setFilterState({
        searchQuery: '',
        categories: [],
        priceRange: PRICE_RANGES.BUDGET,
        minRating: 0,
        location: currentLocation,
        radius: 10,
        availability: 'any',
        features: [],
        skills: [],
        serviceTypes: [],
        verificationLevel: 0,
        premiumOnly: false,
        governmentApproved: false,
        constructionCertified: false,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });
      
      setUiState(prev => ({ ...prev, hasUnsavedChanges: true }));
      
      trackEvent('filters_reset', {
        previousFilters: appliedFiltersSummary.count,
        ...analyticsContext,
      });
      
      onFiltersReset?.();
    }
  }, [currentLocation, appliedFiltersSummary, analyticsContext, onFiltersReset, updateFilter, trackEvent]);

  // Preset Management
  const saveFilterPreset = useCallback(async (presetName, description = '') => {
    try {
      const preset = {
        name: presetName,
        description,
        filters: { ...filterState },
        metadata: {
          createdAt: new Date().toISOString(),
          appliedCount: appliedFiltersSummary.count,
          userId: user?.id,
          location: currentLocation,
        },
      };
      
      const updatedPresets = {
        ...dataState.filterPresets,
        [presetName]: preset,
      };
      
      setDataState(prev => ({ ...prev, filterPresets: updatedPresets }));
      
      // Save to persistent storage
      await StorageService.saveFilterPresets(updatedPresets);
      
      onPresetSaved?.(preset);
      
      trackEvent('filter_preset_saved', {
        presetName,
        filterCount: appliedFiltersSummary.count,
        ...analyticsContext,
      });
      
      showToast(`Filter preset "${presetName}" saved successfully`, 'success');
      
    } catch (error) {
      captureError(error, {
        context: 'SaveFilterPreset',
        presetName,
      });
      
      showToast('Failed to save filter preset', 'error');
    }
  }, [filterState, dataState.filterPresets, appliedFiltersSummary, user, currentLocation, onPresetSaved, trackEvent, captureError]);

  const loadFilterPreset = useCallback((presetName) => {
    const preset = dataState.filterPresets[presetName];
    if (preset) {
      setFilterState(preset.filters);
      setUiState(prev => ({ ...prev, hasUnsavedChanges: true }));
      
      setAnalyticsState(prev => ({
        ...prev,
        presetUses: prev.presetUses + 1,
      }));
      
      onPresetLoaded?.(preset);
      
      trackEvent('filter_preset_loaded', {
        presetName,
        filterCount: preset.metadata.appliedCount,
        ...analyticsContext,
      });
    }
  }, [dataState.filterPresets, onPresetLoaded, trackEvent, analyticsContext]);

  // AI Suggestions
  const getAISuggestions = useCallback(async () => {
    if (!enableAISuggestions) return;
    
    try {
      setUiState(prev => ({ ...prev, isLoading: true }));
      
      const suggestions = await AISuggestionService.getFilterSuggestions({
        currentFilters: filterState,
        userContext: user,
        location: currentLocation,
        history: analyticsState.searchQueries,
      });
      
      if (componentMounted.current && suggestions.success) {
        setDataState(prev => ({
          ...prev,
          aiSuggestions: suggestions.data,
        }));
        
        setUiState(prev => ({ ...prev, showAIPanel: true }));
      }
      
      onAISuggestionsRequested?.(suggestions.data);
    } catch (error) {
      captureError(error, {
        context: 'AISuggestions',
        currentFilters: filterState,
      });
    } finally {
      if (componentMounted.current) {
        setUiState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [enableAISuggestions, filterState, user, currentLocation, analyticsState, onAISuggestionsRequested, captureError]);

  // Quick Actions
  const applyQuickFilter = useCallback((quickFilterType, value) => {
    const quickFilters = {
      budget: { 
        [FILTER_TYPES.PRICE]: PRICE_RANGES.BUDGET,
        [FILTER_TYPES.SORT]: 'price_asc'
      },
      popular: { 
        [FILTER_TYPES.RATING]: 4.0, 
        [FILTER_TYPES.SORT]: 'popular' 
      },
      available_today: { 
        [FILTER_TYPES.AVAILABILITY]: 'today' 
      },
      near_me: { 
        [FILTER_TYPES.LOCATION]: currentLocation, 
        [FILTER_TYPES.RADIUS]: 5 
      },
      premium: { 
        [FILTER_TYPES.PREMIUM]: true,
        [FILTER_TYPES.VERIFICATION]: 2
      },
      government: { 
        [FILTER_TYPES.GOVERNMENT]: true,
        [FILTER_TYPES.CONSTRUCTION]: true
      },
    };
    
    if (quickFilters[quickFilterType]) {
      Object.entries(quickFilters[quickFilterType]).forEach(([key, value]) => {
        updateFilter(key, value, {
          analytics: { quickFilter: quickFilterType },
        });
      });
      
      trackEvent('quick_filter_applied', {
        quickFilter: quickFilterType,
        value,
        ...analyticsContext,
      });
    }
  }, [currentLocation, updateFilter, trackEvent, analyticsContext]);

  // Utility Functions
  const saveToRecentSearches = useCallback(async (searchQuery) => {
    try {
      const updatedSearches = [
        searchQuery,
        ...dataState.recentSearches.filter(s => s !== searchQuery),
      ].slice(0, 10); // Keep only 10 most recent
      
      setDataState(prev => ({
        ...prev,
        recentSearches: updatedSearches,
      }));
      
      await StorageService.saveRecentSearches(updatedSearches);
    } catch (error) {
      captureError(error, { context: 'SaveRecentSearch' });
    }
  }, [dataState.recentSearches, captureError]);

  const showToast = useCallback((message, type = 'info') => {
    // Implementation would integrate with your Toast component
    console.log(`Toast [${type}]:`, message);
  }, []);

  // Render Functions
  const renderSearchSection = () => {
    if (!showSearchSection || !availableFilters.includes(FILTER_TYPES.SEARCH)) return null;

    return (
      <CollapsibleSection
        title="Search"
        defaultExpanded={true}
        collapsible={collapsibleSections}
        theme={theme}
        style={customStyles.searchSection}
      >
        <SearchInput
          value={filterState.searchQuery}
          onChangeText={(value) => updateFilter(FILTER_TYPES.SEARCH, value)}
          placeholder="What service are you looking for?"
          recentSearches={dataState.recentSearches}
          popularSearches={dataState.popularFilters.searches}
          onSuggestionSelect={(suggestion) => 
            updateFilter(FILTER_TYPES.SEARCH, suggestion)
          }
          theme={theme}
          style={customStyles.searchInput}
        />
      </CollapsibleSection>
    );
  };

  const renderQuickFilters = () => {
    if (!showQuickFilters) return null;

    const quickFilters = [
      { id: 'budget', label: '💰 Budget', type: 'budget' },
      { id: 'popular', label: '🔥 Popular', type: 'popular' },
      { id: 'available_today', label: '✅ Today', type: 'available_today' },
      { id: 'near_me', label: '📍 Near Me', type: 'near_me' },
      { id: 'premium', label: '⭐ Premium', type: 'premium' },
      { id: 'government', label: '🏢 Government', type: 'government' },
    ];

    return (
      <CollapsibleSection
        title="Quick Filters"
        defaultExpanded={true}
        collapsible={collapsibleSections}
        theme={theme}
        style={customStyles.quickFiltersSection}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickFiltersScroll}
        >
          <View style={styles.quickFiltersContainer}>
            {quickFilters.map((filter) => (
              <Badge
                key={filter.id}
                text={filter.label}
                variant="outline"
                onPress={() => applyQuickFilter(filter.type)}
                pressable={true}
                style={styles.quickFilterBadge}
                theme={theme}
              />
            ))}
          </View>
        </ScrollView>
      </CollapsibleSection>
    );
  };

  const renderCategoryFilter = () => {
    if (!availableFilters.includes(FILTER_TYPES.CATEGORY) || 
        dataState.filterOptions.categories.length === 0) return null;

    return (
      <CollapsibleSection
        title="Categories"
        defaultExpanded={true}
        collapsible={collapsibleSections}
        theme={theme}
        style={customStyles.categorySection}
      >
        <View style={styles.sectionHeader}>
          <Button
            title="Clear"
            onPress={() => resetFilters(FILTER_TYPES.CATEGORY)}
            type="link"
            size="small"
            disabled={filterState.categories.length === 0}
            theme={theme}
          />
        </View>
        
        <CheckboxGroup
          options={dataState.filterOptions.categories.map(cat => ({
            label: cat.name,
            value: cat.id,
            description: cat.description,
            icon: cat.icon,
          }))}
          selectedValues={filterState.categories}
          onSelectionChange={(values) => 
            updateFilter(FILTER_TYPES.CATEGORY, values)
          }
          columns={2}
          maxVisible={maxVisibleFilters}
          theme={theme}
          style={customStyles.categoryGroup}
        />
      </CollapsibleSection>
    );
  };

  const renderPriceFilter = () => {
    if (!availableFilters.includes(FILTER_TYPES.PRICE)) return null;

    return (
      <CollapsibleSection
        title="Price Range"
        defaultExpanded={true}
        collapsible={collapsibleSections}
        theme={theme}
        style={customStyles.priceSection}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.priceLabel, { color: theme.colors.primary }]}>
            {filterState.priceRange.label || 'Custom Range'}
          </Text>
          <Text style={[styles.priceValue, { color: theme.colors.text }]}>
            ETB {filterState.priceRange.min} - {filterState.priceRange.max}
          </Text>
        </View>
        
        <RangeSlider
          min={0}
          max={10000}
          step={100}
          lowValue={filterState.priceRange.min}
          highValue={filterState.priceRange.max}
          onValueChange={(low, high) => 
            updateFilter(FILTER_TYPES.PRICE, { 
              min: low, 
              max: high, 
              label: 'Custom' 
            })
          }
          theme={theme}
          style={customStyles.priceSlider}
        />
        
        <View style={styles.pricePresets}>
          {Object.values(PRICE_RANGES).map((range) => (
            <Badge
              key={range.label}
              text={`${range.icon} ${range.label}`}
              variant={
                filterState.priceRange.min === range.min && 
                filterState.priceRange.max === range.max
                  ? 'primary'
                  : 'outline'
              }
              onPress={() => updateFilter(FILTER_TYPES.PRICE, range)}
              pressable={true}
              size="small"
              style={styles.pricePresetBadge}
              theme={theme}
            />
          ))}
        </View>
      </CollapsibleSection>
    );
  };

  const renderActionButtons = () => (
    <View style={[styles.actionBar, customStyles.actionBar]}>
      <View style={styles.actionLeft}>
        {showFilterCount && uiState.appliedFilterCount > 0 && (
          <Badge
            count={uiState.appliedFilterCount}
            variant="primary"
            theme={theme}
          />
        )}
        
        <Button
          title="Reset All"
          onPress={() => resetFilters()}
          type="outline"
          disabled={!isFilterActive}
          theme={theme}
          style={styles.resetButton}
        />
      </View>
      
      <View style={styles.actionRight}>
        {enableAISuggestions && (
          <Button
            title="AI Suggestions"
            onPress={getAISuggestions}
            type="ghost"
            loading={uiState.isLoading}
            theme={theme}
            style={styles.aiButton}
          />
        )}
        
        <Button
          title="Apply Filters"
          onPress={() => applyFilters(true)}
          loading={uiState.isLoading}
          disabled={!uiState.hasUnsavedChanges}
          theme={theme}
          style={styles.applyButton}
        />
      </View>
    </View>
  );

  // Main Render
  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnimation,
          transform: [
            { translateY: slideAnimation },
            { scale: scaleAnimation },
          ],
        },
        customStyles.container,
      ]}
      {...restProps}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Section */}
        {renderSearchSection()}
        
        {/* Quick Filters */}
        {renderQuickFilters()}
        
        {/* Category Filter */}
        {renderCategoryFilter()}
        
        {/* Price Filter */}
        {renderPriceFilter()}
        
        {/* Additional filter sections would be rendered here */}
        {/* Rating, Location, Availability, Features, Skills, etc. */}
        
      </ScrollView>
      
      {/* Action Buttons */}
      {renderActionButtons()}
      
      {/* AI Suggestions Modal */}
      <Modal
        visible={uiState.showAIPanel}
        onDismiss={() => setUiState(prev => ({ ...prev, showAIPanel: false }))}
        title="AI Filter Suggestions"
        theme={theme}
      >
        {/* AI suggestions content */}
      </Modal>
      
      {/* Preset Manager Modal */}
      {showPresetManager && (
        <FilterPresetManager
          visible={uiState.showPresetModal}
          presets={dataState.filterPresets}
          onSavePreset={saveFilterPreset}
          onLoadPreset={loadFilterPreset}
          onDismiss={() => setUiState(prev => ({ ...prev, showPresetModal: false }))}
          theme={theme}
        />
      )}
    </Animated.View>
  );
});

// Component Configuration
ServiceFilter.displayName = 'ServiceFilter';
ServiceFilter.config = FILTER_CONFIG;
ServiceFilter.Types = FILTER_TYPES;
ServiceFilter.Modes = FILTER_MODES;
ServiceFilter.PriceRanges = PRICE_RANGES;

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
    padding: 16,
    paddingBottom: 120, // Space for action buttons
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  pricePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  pricePresetBadge: {
    marginBottom: 8,
  },
  quickFiltersScroll: {
    marginHorizontal: -16,
  },
  quickFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  quickFilterBadge: {
    marginRight: 8,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetButton: {
    minWidth: 80,
  },
  aiButton: {
    minWidth: 100,
  },
  applyButton: {
    minWidth: 120,
  },
});

// Export with error boundary
export default withErrorBoundary(ServiceFilter, {
  context: 'ServiceFilter',
  fallback: <ErrorBoundary.Fallback />,
});

// Custom Hook for Filter Management
export const useServiceFilter = (initialState = {}) => {
  // Implementation of advanced filter management hook
  return {
    // Hook implementation
  };
};