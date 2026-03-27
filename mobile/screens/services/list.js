import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Context & Hooks
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useServices } from '../../../hooks/use-services';
import { useLocation } from '../../../hooks/use-location';

// Services
import { serviceService } from '../../../services/service-service';
import { analyticsService } from '../../../services/analytics-service';
import { favoriteService } from '../../../services/favorite-service';

// Components
import { ServiceCard } from '../../../components/service/service-card';
import { ServiceListHeader } from '../../../components/service/service-list-header';
import { AdvancedFilter } from '../../../components/service/service-filter';
import { SearchBar } from '../../../components/ui/search-bar';
import { Loading } from '../../../components/ui/loading';
import { EmptyState } from '../../../components/ui/empty-state';
import { AccessDenied } from '../../../components/ui/access-denied';
import { MapView } from '../../../components/ui/map-view';
import { ToggleView } from '../../../components/ui/toggle-view';
import { FloatingActionButton } from '../../../components/ui/button';

// Constants
import { SERVICE_STATUS, SERVICE_SORT_OPTIONS, USER_ROLES } from '../../../constants/service';
import { NAVIGATION_ROUTES } from '../../../constants/navigation';

// Utils
import { formatPrice, calculateDistance } from '../../../utils/formatters';
import { applyServiceFilters, sortServices } from '../../../utils/service-utils';

/**
 * Services List Screen - Comprehensive service discovery with multiple view modes
 * Supports list, grid, and map views with advanced filtering and AI recommendations
 */
const ServicesListScreen = () => {
  const { 
    categoryId, 
    searchQuery: initialSearch,
    location: initialLocation 
  } = useLocalSearchParams();
  const router = useRouter();
  const { width: screenWidth } = Dimensions.get('window');

  // Context hooks
  const { user, isAuthenticated } = useAuth();
  const { theme, isDark } = useTheme();
  const { 
    services, 
    isLoading, 
    refreshServices, 
    loadMoreServices,
    hasMoreServices 
  } = useServices();
  
  const { 
    currentLocation, 
    hasLocationPermission,
    requestLocationPermission 
  } = useLocation();

  // State management
  const [filteredServices, setFilteredServices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // View and filter states
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'map'
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [activeFilters, setActiveFilters] = useState({
    categories: categoryId ? [categoryId] : [],
    priceRange: { min: 0, max: 50000 },
    rating: 0,
    location: initialLocation || null,
    distance: 50, // km
    availability: 'all',
    sortBy: 'relevance',
    features: [],
    verifiedOnly: false,
    premiumOnly: false,
    instantBooking: false,
    offersDeals: false
  });

  // UI states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Refs
  const flatListRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const analyticsRef = useRef(null);
  const pageRef = useRef(1);
  const filterStateRef = useRef(activeFilters);

  const styles = createStyles(theme, screenWidth, viewMode);

  /**
   * Load services with comprehensive error handling and filtering
   */
  const loadServices = useCallback(async (showRefresh = false, resetPagination = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else if (resetPagination) {
        setIsLoading(true);
        pageRef.current = 1;
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      // Build search parameters
      const searchParams = {
        page: resetPagination ? 1 : pageRef.current,
        limit: 20,
        search: searchQuery.trim() || undefined,
        filters: buildFilterParams(),
        sort: activeFilters.sortBy,
        location: activeFilters.location || currentLocation,
        userId: user?.id,
        category: categoryId || undefined
      };

      // Load services from API
      const serviceData = await serviceService.getServices(searchParams);

      // Apply client-side filtering for real-time updates
      const processedServices = processServices(serviceData.services);

      if (resetPagination || showRefresh) {
        setFilteredServices(processedServices);
      } else {
        setFilteredServices(prev => [...prev, ...processedServices]);
      }

      // Update pagination state
      if (serviceData.services.length < searchParams.limit) {
        hasMoreServices.current = false;
      } else {
        pageRef.current += 1;
      }

      // Track analytics
      analyticsRef.current = await analyticsService.trackServiceListView({
        searchQuery,
        filters: activeFilters,
        categoryId,
        userId: user?.id,
        resultCount: processedServices.length,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Failed to load services:', err);
      setError(err.message || 'Failed to load services');
      
      if (resetPagination) {
        setFilteredServices([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [
    searchQuery, 
    activeFilters, 
    categoryId, 
    user, 
    currentLocation,
    hasMoreServices
  ]);

  /**
   * Build comprehensive filter parameters for API
   */
  const buildFilterParams = useCallback(() => {
    const params = {};

    // Price range filtering
    if (activeFilters.priceRange.min > 0 || activeFilters.priceRange.max < 50000) {
      params.priceRange = activeFilters.priceRange;
    }

    // Rating filtering
    if (activeFilters.rating > 0) {
      params.minRating = activeFilters.rating;
    }

    // Location and distance filtering
    if (activeFilters.location && activeFilters.distance < 50) {
      params.location = {
        coordinates: activeFilters.location,
        maxDistance: activeFilters.distance
      };
    }

    // Availability filtering
    if (activeFilters.availability !== 'all') {
      params.availability = activeFilters.availability;
    }

    // Feature-based filtering
    if (activeFilters.features.length > 0) {
      params.features = activeFilters.features;
    }

    // Boolean filters
    if (activeFilters.verifiedOnly) params.verifiedOnly = true;
    if (activeFilters.premiumOnly) params.premiumOnly = true;
    if (activeFilters.instantBooking) params.instantBooking = true;
    if (activeFilters.offersDeals) params.offersDeals = true;

    // Category filtering
    if (activeFilters.categories.length > 0) {
      params.categories = activeFilters.categories;
    }

    return params;
  }, [activeFilters]);

  /**
   * Process services with client-side filtering and enrichment
   */
  const processServices = useCallback((services) => {
    return services.map(service => ({
      ...service,
      // Calculate distance if location data available
      distance: calculateDistance(
        currentLocation,
        service.providerLocation
      ),
      // Enrich with local data
      isFavorite: user ? service.favoritedBy?.includes(user.id) : false,
      // Format pricing for display
      formattedPrice: formatPrice(service.price, service.currency),
      // Add quick access flags
      canBookInstantly: service.instantBooking && service.availableNow,
      hasSpecialOffer: service.specialOffers && service.specialOffers.length > 0
    }));
  }, [currentLocation, user]);

  /**
   * Handle service selection with comprehensive analytics
   */
  const handleServiceSelect = async (service) => {
    try {
      setSelectedService(service);

      // Track service selection analytics
      await analyticsService.trackServiceSelection({
        serviceId: service.id,
        serviceName: service.name,
        categoryId: service.category,
        providerId: service.providerId,
        userId: user?.id,
        searchQuery,
        filters: activeFilters,
        positionInList: filteredServices.findIndex(s => s.id === service.id),
        timestamp: new Date().toISOString()
      });

      // Navigate to service details
      router.push({
        pathname: NAVIGATION_ROUTES.SERVICE_DETAIL,
        params: { 
          serviceId: service.id,
          searchContext: JSON.stringify({
            searchQuery,
            filters: activeFilters,
            categoryId
          })
        }
      });

    } catch (err) {
      console.error('Failed to track service selection:', err);
      // Continue with navigation even if analytics fails
      router.push({
        pathname: NAVIGATION_ROUTES.SERVICE_DETAIL,
        params: { serviceId: service.id }
      });
    }
  };

  /**
   * Handle favorite toggle with optimistic updates and rollback
   */
  const handleFavoriteToggle = async (service, isFavorited) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required', 
        'Please sign in to save favorite services',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => router.push(NAVIGATION_ROUTES.LOGIN)
          }
        ]
      );
      return;
    }

    const originalServices = [...filteredServices];

    try {
      // Optimistic update
      const updatedServices = filteredServices.map(s =>
        s.id === service.id ? { ...s, isFavorited: !isFavorited } : s
      );
      setFilteredServices(updatedServices);

      // API call
      if (isFavorited) {
        await favoriteService.removeFavorite(service.id, user.id);
      } else {
        await favoriteService.addFavorite({
          serviceId: service.id,
          userId: user.id,
          categoryId: service.category,
          timestamp: new Date().toISOString()
        });
      }

      // Track favorite action
      await analyticsService.trackFavoriteAction({
        serviceId: service.id,
        userId: user.id,
        action: isFavorited ? 'remove' : 'add',
        context: 'service_list',
        searchQuery,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      
      // Revert optimistic update on error
      setFilteredServices(originalServices);

      Alert.alert(
        'Error', 
        'Failed to update favorites. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Handle search with advanced debouncing and analytics
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Track search analytics
    analyticsService.trackSearchQuery({
      query,
      categoryId,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      loadServices(false, true);
    }, 300);
  }, [loadServices, categoryId, user]);

  /**
   * Handle filter changes with validation
   */
  const handleFilterChange = useCallback((newFilters) => {
    // Validate filter changes
    if (JSON.stringify(newFilters) !== JSON.stringify(filterStateRef.current)) {
      setActiveFilters(newFilters);
      filterStateRef.current = newFilters;
      loadServices(false, true);
    }
  }, [loadServices]);

  /**
   * Handle location selection
   */
  const handleLocationSelect = useCallback((location) => {
    setActiveFilters(prev => ({
      ...prev,
      location: location.coordinates,
      locationName: location.name
    }));
    setShowLocationPicker(false);
    loadServices(false, true);
  }, [loadServices]);

  /**
   * Handle view mode change
   */
  const handleViewModeChange = useCallback((newViewMode) => {
    setViewMode(newViewMode);
    
    // Track view mode change
    analyticsService.trackViewModeChange({
      viewMode: newViewMode,
      serviceCount: filteredServices.length,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
  }, [filteredServices.length, user]);

  /**
   * Handle load more for infinite scroll
   */
  const handleLoadMore = async () => {
    if (!hasMoreServices.current || isLoadingMore) return;

    try {
      await loadServices(false, false);
    } catch (err) {
      console.error('Failed to load more services:', err);
    }
  };

  /**
   * Handle service quick actions
   */
  const handleServiceAction = async (service, action) => {
    try {
      switch (action) {
        case 'share':
          await handleShareService(service);
          break;

        case 'report':
          await handleReportService(service);
          break;

        case 'contact':
          await handleContactProvider(service);
          break;

        case 'quick_book':
          await handleQuickBook(service);
          break;

        case 'view_on_map':
          setViewMode('map');
          setSelectedService(service);
          break;

        case 'similar_services':
          await handleSimilarServices(service);
          break;

        default:
          console.warn('Unknown service action:', action);
      }
    } catch (err) {
      console.error('Service action failed:', err);
      Alert.alert('Action Failed', 'Please try again');
    }
  };

  /**
   * Handle similar services recommendation
   */
  const handleSimilarServices = async (service) => {
    router.push({
      pathname: NAVIGATION_ROUTES.SERVICES_LIST,
      params: { 
        similarTo: service.id,
        categoryId: service.category
      }
    });
  };

  /**
   * Render service card based on view mode
   */
  const renderServiceItem = ({ item, index }) => (
    <ServiceCard
      service={item}
      viewMode={viewMode}
      onPress={() => handleServiceSelect(item)}
      onFavoriteToggle={(isFavorited) => handleFavoriteToggle(item, isFavorited)}
      onAction={(action) => handleServiceAction(item, action)}
      currentUserId={user?.id}
      theme={theme}
      style={viewMode === 'grid' ? styles.gridCard : styles.listCard}
      showPremiumBadge={true}
      showVerificationBadge={true}
      showDistance={true}
      showQuickActions={true}
      index={index}
    />
  );

  /**
   * Render map view with service markers
   */
  const renderMapView = () => (
    <MapView
      services={filteredServices}
      selectedService={selectedService}
      onServiceSelect={handleServiceSelect}
      currentLocation={currentLocation}
      onLocationChange={handleLocationSelect}
      theme={theme}
      style={styles.map}
    />
  );

  /**
   * Render list/grid view
   */
  const renderListView = () => (
    <FlatList
      ref={flatListRef}
      data={filteredServices}
      key={viewMode} // Force re-render on view mode change
      keyExtractor={(item) => item.id}
      renderItem={renderServiceItem}
      numColumns={viewMode === 'grid' ? 2 : 1}
      ListHeaderComponent={
        <ServiceListHeader
          serviceCount={filteredServices.length}
          searchQuery={searchQuery}
          activeFilters={activeFilters}
          viewMode={viewMode}
          onFilterPress={() => setShowFilterModal(true)}
          onSortPress={() => setShowSortModal(true)}
          onViewModeChange={handleViewModeChange}
          onLocationPress={() => setShowLocationPicker(true)}
          theme={theme}
        />
      }
      ListFooterComponent={renderListFooter}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadServices(true, true)}
          colors={[theme.colors.primary]}
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );

  /**
   * Render loading footer
   */
  const renderListFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footer}>
        <Loading size="small" message="Loading more services..." />
      </View>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <EmptyState
      icon="search"
      title={
        searchQuery 
          ? "No services found" 
          : "No services available"
      }
      message={
        searchQuery || activeFilters.categories.length > 0
          ? "Try adjusting your search criteria or filters"
          : "Check back later for new services in your area"
      }
      action={{
        label: 'Reset Search',
        onPress: () => {
          setSearchQuery('');
          setActiveFilters({
            categories: [],
            priceRange: { min: 0, max: 50000 },
            rating: 0,
            location: null,
            distance: 50,
            availability: 'all',
            sortBy: 'relevance',
            features: [],
            verifiedOnly: false,
            premiumOnly: false,
            instantBooking: false,
            offersDeals: false
          });
        }
      }}
      secondaryAction={
        isAuthenticated ? {
          label: 'Add Service',
          onPress: () => router.push(NAVIGATION_ROUTES.SERVICE_CREATE)
        } : null
      }
    />
  );

  // Effects
  useEffect(() => {
    loadServices(false, true);
  }, [loadServices]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (analyticsRef.current) {
        analyticsService.cleanup(analyticsRef.current);
      }
    };
  }, []);

  // Render loading state
  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Discovering services..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search for services..."
          style={styles.searchBar}
          showVoiceSearch={true}
          showImageSearch={Platform.OS === 'android'} // Platform-specific features
          onVoiceSearchResult={handleSearch}
        />
      </View>

      {/* Content based on view mode */}
      {viewMode === 'map' ? renderMapView() : renderListView()}

      {/* Filter Modal */}
      <AdvancedFilter
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={activeFilters}
        onFilterChange={handleFilterChange}
        currentLocation={currentLocation}
        theme={theme}
      />

      {/* Location Picker Modal */}
      {/* Implement location picker component */}

      {/* Add Service FAB */}
      {isAuthenticated && (
        <FloatingActionButton
          icon="add"
          onPress={() => router.push(NAVIGATION_ROUTES.SERVICE_CREATE)}
          style={styles.fab}
          label="Add Service"
          variant="primary"
        />
      )}
    </SafeAreaView>
  );
};

/**
 * Create dynamic styles based on theme, screen dimensions, and view mode
 */
const createStyles = (theme, screenWidth, viewMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    backgroundColor: theme.colors.surface,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: viewMode === 'grid' ? 8 : 16,
    paddingBottom: 20,
  },
  gridCard: {
    flex: 1,
    margin: 8,
    maxWidth: (screenWidth - 32) / 2,
  },
  listCard: {
    marginVertical: 6,
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    elevation: 8,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default ServicesListScreen;