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

// Services
import { serviceService } from '../../../services/service-service';
import { analyticsService } from '../../../services/analytics-service';
import { favoriteService } from '../../../services/favorite-service';

// Components
import { ServiceCard } from '../../../components/service/service-card';
import { ServiceFilter } from '../../../components/service/service-filter';
import { SearchBar } from '../../../components/ui/search-bar';
import { Loading } from '../../../components/ui/loading';
import { EmptyState } from '../../../components/ui/empty-state';
import { AccessDenied } from '../../../components/ui/access-denied';
import { CategoryHeader } from '../../../components/service/category-header';
import { PremiumBadge } from '../../../components/premium/premium-badge';
import { FloatingActionButton } from '../../../components/ui/button';

// Constants
import { SERVICE_CATEGORIES, SERVICE_STATUS, USER_ROLES } from '../../../constants/service';
import { NAVIGATION_ROUTES } from '../../../constants/navigation';

// Utils
import { formatPrice, calculateDistance } from '../../../utils/formatters';
import { validateServiceAccess } from '../../../utils/validators';

/**
 * Service Category Screen - Advanced service discovery and filtering
 * Supports AI-powered recommendations, real-time filtering, and premium features
 */
const ServiceCategoryScreen = () => {
  const { categoryId, categoryName } = useLocalSearchParams();
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

  // State management
  const [filteredServices, setFilteredServices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    priceRange: { min: 0, max: 10000 },
    rating: 0,
    location: null,
    availability: 'all',
    sortBy: 'relevance',
    features: [],
    verifiedOnly: false,
    premiumOnly: false
  });

  // UI states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Refs
  const flatListRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const analyticsRef = useRef(null);
  const pageRef = useRef(1);

  const styles = createStyles(theme, screenWidth);
  const category = SERVICE_CATEGORIES[categoryId] || { 
    id: categoryId, 
    name: categoryName,
    icon: 'help',
    color: theme.colors.primary 
  };

  /**
   * Load category services with comprehensive error handling
   */
  const loadCategoryServices = useCallback(async (showRefresh = false, resetPagination = false) => {
    if (!categoryId) {
      setError('Category ID is required');
      return;
    }

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

      // Validate category access
      const hasAccess = await validateServiceAccess(categoryId, user);
      if (!hasAccess) {
        setError('access_denied');
        return;
      }

      // Build search parameters
      const searchParams = {
        category: categoryId,
        page: resetPagination ? 1 : pageRef.current,
        limit: 20,
        search: searchQuery.trim() || undefined,
        filters: buildFilterParams(),
        sort: activeFilters.sortBy,
        location: activeFilters.location,
        userId: user?.id
      };

      // Load services
      const serviceData = await serviceService.getServicesByCategory(searchParams);

      if (resetPagination || showRefresh) {
        setFilteredServices(serviceData.services);
      } else {
        setFilteredServices(prev => [...prev, ...serviceData.services]);
      }

      // Update pagination state
      if (serviceData.services.length < searchParams.limit) {
        hasMoreServices.current = false;
      } else {
        pageRef.current += 1;
      }

      // Track analytics
      analyticsRef.current = await analyticsService.trackCategoryView({
        categoryId,
        categoryName: category.name,
        userId: user?.id,
        filters: activeFilters,
        searchQuery,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Failed to load category services:', err);
      setError(err.message || 'Failed to load services');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [categoryId, category?.name, user, searchQuery, activeFilters]);

  /**
   * Build filter parameters for API
   */
  const buildFilterParams = useCallback(() => {
    const params = {};

    if (activeFilters.priceRange.min > 0 || activeFilters.priceRange.max < 10000) {
      params.priceRange = activeFilters.priceRange;
    }

    if (activeFilters.rating > 0) {
      params.minRating = activeFilters.rating;
    }

    if (activeFilters.availability !== 'all') {
      params.availability = activeFilters.availability;
    }

    if (activeFilters.features.length > 0) {
      params.features = activeFilters.features;
    }

    if (activeFilters.verifiedOnly) {
      params.verifiedOnly = true;
    }

    if (activeFilters.premiumOnly) {
      params.premiumOnly = true;
    }

    return params;
  }, [activeFilters]);

  /**
   * Handle service selection with analytics
   */
  const handleServiceSelect = async (service) => {
    try {
      setSelectedService(service);

      // Track service view analytics
      await analyticsService.trackServiceView({
        serviceId: service.id,
        serviceName: service.name,
        categoryId,
        categoryName: category.name,
        userId: user?.id,
        isPremium: service.isPremium,
        providerId: service.providerId,
        timestamp: new Date().toISOString()
      });

      // Navigate to service details
      router.push({
        pathname: NAVIGATION_ROUTES.SERVICE_DETAIL,
        params: { 
          serviceId: service.id,
          categoryId,
          categoryName: category.name
        }
      });

    } catch (err) {
      console.error('Failed to track service view:', err);
      // Continue with navigation even if analytics fails
      router.push({
        pathname: NAVIGATION_ROUTES.SERVICE_DETAIL,
        params: { serviceId: service.id }
      });
    }
  };

  /**
   * Handle favorite toggle with optimistic updates
   */
  const handleFavoriteToggle = async (service, isFavorited) => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to save favorite services');
      return;
    }

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
          categoryId,
          timestamp: new Date().toISOString()
        });
      }

      // Track favorite action
      await analyticsService.trackFavoriteAction({
        serviceId: service.id,
        userId: user.id,
        action: isFavorited ? 'remove' : 'add',
        categoryId,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      
      // Revert optimistic update
      const revertedServices = filteredServices.map(s =>
        s.id === service.id ? { ...s, isFavorited } : s
      );
      setFilteredServices(revertedServices);

      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    }
  };

  /**
   * Handle search with debouncing
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      loadCategoryServices(false, true);
    }, 500);
  }, [loadCategoryServices]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
    loadCategoryServices(false, true);
  }, [loadCategoryServices]);

  /**
   * Handle sort changes
   */
  const handleSortChange = useCallback((sortBy) => {
    setActiveFilters(prev => ({ ...prev, sortBy }));
    loadCategoryServices(false, true);
  }, [loadCategoryServices]);

  /**
   * Handle load more for infinite scroll
   */
  const handleLoadMore = async () => {
    if (!hasMoreServices.current || isLoadingMore) return;

    try {
      await loadCategoryServices(false, false);
    } catch (err) {
      console.error('Failed to load more services:', err);
    }
  };

  /**
   * Handle service actions (share, report, etc.)
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

        default:
          console.warn('Unknown service action:', action);
      }
    } catch (err) {
      console.error('Service action failed:', err);
      Alert.alert('Action Failed', 'Please try again');
    }
  };

  /**
   * Handle service sharing
   */
  const handleShareService = async (service) => {
    const shareData = {
      title: service.name,
      message: `Check out this ${category.name} service: ${service.name}`,
      url: `yachi://services/${service.id}`, // Deep link
      serviceId: service.id
    };

    // Implement native sharing
    Alert.alert('Share Service', 'Sharing functionality to be implemented');
  };

  /**
   * Handle service reporting
   */
  const handleReportService = async (service) => {
    Alert.alert(
      'Report Service',
      `Why are you reporting "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Inappropriate Content', 
          onPress: () => submitReport(service, 'inappropriate_content') 
        },
        { 
          text: 'False Information', 
          onPress: () => submitReport(service, 'false_information') 
        },
        { 
          text: 'Spam', 
          onPress: () => submitReport(service, 'spam') 
        },
      ]
    );
  };

  const submitReport = async (service, reason) => {
    try {
      await serviceService.reportService({
        serviceId: service.id,
        reporterId: user.id,
        reason,
        categoryId,
        timestamp: new Date().toISOString()
      });

      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (err) {
      Alert.alert('Report Failed', 'Failed to submit report. Please try again.');
    }
  };

  /**
   * Handle contact provider
   */
  const handleContactProvider = async (service) => {
    router.push({
      pathname: NAVIGATION_ROUTES.CHAT,
      params: { 
        recipientId: service.providerId,
        serviceId: service.id,
        context: 'service_inquiry'
      }
    });
  };

  /**
   * Handle quick booking
   */
  const handleQuickBook = async (service) => {
    router.push({
      pathname: NAVIGATION_ROUTES.BOOKING_CREATE,
      params: { 
        serviceId: service.id,
        providerId: service.providerId
      }
    });
  };

  /**
   * Render service card based on view mode
   */
  const renderServiceCard = ({ item, index }) => (
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
    />
  );

  /**
   * Render list header component
   */
  const renderListHeader = () => (
    <CategoryHeader
      category={category}
      serviceCount={filteredServices.length}
      activeFilters={activeFilters}
      onFilterPress={() => setShowFilterModal(true)}
      onSortPress={() => setShowSortModal(true)}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      theme={theme}
    />
  );

  /**
   * Render footer with loading indicator
   */
  const renderListFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footer}>
        <Loading size="small" message="Loading more services..." />
      </View>
    );
  };

  // Effects
  useEffect(() => {
    loadCategoryServices(false, true);
  }, [loadCategoryServices]);

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
        <Loading message={`Loading ${category.name} services...`} />
      </SafeAreaView>
    );
  }

  // Render access denied
  if (error === 'access_denied') {
    return (
      <SafeAreaView style={styles.container}>
        <AccessDenied 
          message={`You don't have access to ${category.name} services`}
          onBack={() => router.back()}
        />
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
          placeholder={`Search ${category.name} services...`}
          style={styles.searchBar}
          showVoiceSearch={true}
          showImageSearch={false} // Enable based on feature flag
        />
      </View>

      {/* Services List */}
      <FlatList
        ref={flatListRef}
        data={filteredServices}
        key={viewMode} // Re-render when view mode changes
        keyExtractor={(item) => item.id}
        renderItem={renderServiceCard}
        numColumns={viewMode === 'grid' ? 2 : 1}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title="No Services Found"
            message={
              searchQuery || activeFilters.verifiedOnly || activeFilters.premiumOnly
                ? "Try adjusting your search or filters"
                : `No ${category.name} services available yet`
            }
            action={{
              label: 'Reset Filters',
              onPress: () => {
                setSearchQuery('');
                setActiveFilters({
                  priceRange: { min: 0, max: 10000 },
                  rating: 0,
                  location: null,
                  availability: 'all',
                  sortBy: 'relevance',
                  features: [],
                  verifiedOnly: false,
                  premiumOnly: false
                });
              }
            }}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadCategoryServices(true, true)}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <ServiceFilter
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={activeFilters}
        onFilterChange={handleFilterChange}
        category={category}
        theme={theme}
      />

      {/* Sort Modal */}
      {/* Implement sort modal component */}

      {/* Quick Action FAB */}
      {isAuthenticated && (
        <FloatingActionButton
          icon="add"
          onPress={() => router.push(NAVIGATION_ROUTES.SERVICE_CREATE)}
          style={styles.fab}
          label="Add Service"
        />
      )}
    </SafeAreaView>
  );
};

/**
 * Create dynamic styles based on theme and screen dimensions
 */
const createStyles = (theme, screenWidth) => StyleSheet.create({
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

export default ServiceCategoryScreen;