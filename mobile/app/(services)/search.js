import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Dimensions,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLoading } from '../../contexts/loading-context';
import { 
  Button, 
  ButtonVariant,
  PrimaryButton,
  OutlineButton,
  IconButton 
} from '../../components/ui/button';
import Input, { SearchInput } from '../../components/ui/input';
import Loading from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import ServiceCard from '../../components/service/service-card';
import ServiceFilter from '../../components/service/service-filter';
import { Collapsible } from '../../components/collapsible';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { serviceService } from '../../services/service-service';
import { locationService } from '../../services/location-service';

const { width } = Dimensions.get('window');

// Search categories with icons
const SEARCH_CATEGORIES = [
  { 
    id: 'all', 
    name: 'All Services', 
    icon: '🌟', 
    color: '#8B5CF6',
    description: 'Browse all available services'
  },
  { 
    id: 'cleaning', 
    name: 'Cleaning', 
    icon: '🧹', 
    color: '#3B82F6',
    description: 'Home, office, and deep cleaning services',
    popular: true
  },
  { 
    id: 'repair', 
    name: 'Repairs', 
    icon: '🔧', 
    color: '#F59E0B',
    description: 'Fix it and maintenance services',
    popular: true
  },
  { 
    id: 'installation', 
    name: 'Installation', 
    icon: '⚡', 
    color: '#10B981',
    description: 'Setup and installation services'
  },
  { 
    id: 'moving', 
    name: 'Moving', 
    icon: '📦', 
    color: '#EF4444',
    description: 'Moving and relocation help',
    popular: true
  },
  { 
    id: 'beauty', 
    name: 'Beauty', 
    icon: '💅', 
    color: '#EC4899',
    description: 'Salon and beauty services'
  },
  { 
    id: 'fitness', 
    name: 'Fitness', 
    icon: '💪', 
    color: '#84CC16',
    description: 'Personal training and fitness'
  },
  { 
    id: 'tutoring', 
    name: 'Tutoring', 
    icon: '📚', 
    color: '#06B6D4',
    description: 'Education and tutoring services'
  },
  { 
    id: 'events', 
    name: 'Events', 
    icon: '🎉', 
    color: '#F97316',
    description: 'Event planning and services'
  },
];

// Quick filters
const QUICK_FILTERS = [
  { id: 'available_today', label: 'Available Today', icon: '⚡' },
  { id: 'emergency', label: 'Emergency', icon: '🚨' },
  { id: 'verified', label: 'Verified Only', icon: '✅' },
  { id: 'top_rated', label: 'Top Rated', icon: '⭐' },
  { id: 'budget', label: 'Budget Friendly', icon: '💰' },
];

// Mock services data - replace with API
const MOCK_SERVICES = [
  {
    id: '1',
    title: 'Deep Home Cleaning',
    description: 'Professional deep cleaning service with eco-friendly products and attention to detail',
    price: 89,
    originalPrice: 120,
    rating: 4.8,
    reviewCount: 247,
    category: 'cleaning',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
    isFavorite: true,
    isFeatured: true,
    tags: ['Eco-friendly', 'Same Day', '5 Star'],
    provider: {
      name: 'SparkleClean Pro',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
      verified: true,
      rating: 4.9,
    },
    location: {
      distance: 2.3,
      city: 'New York',
    },
    availability: 'Today',
    isAvailable: true,
  },
  {
    id: '2',
    title: 'Emergency Plumbing',
    description: '24/7 emergency plumbing services for leaks, clogs, and installations',
    price: 120,
    rating: 4.9,
    reviewCount: 189,
    category: 'repair',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4',
    isFavorite: false,
    isFeatured: true,
    tags: ['24/7', 'Emergency', 'Licensed'],
    provider: {
      name: 'FixIt Masters',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      verified: true,
      rating: 4.8,
    },
    location: {
      distance: 1.8,
      city: 'New York',
    },
    availability: 'Within 2 hours',
    isAvailable: true,
  },
  {
    id: '3',
    title: 'AC Installation',
    description: 'Professional AC unit installation with warranty and maintenance included',
    price: 450,
    originalPrice: 600,
    rating: 4.7,
    reviewCount: 134,
    category: 'installation',
    image: 'https://images.unsplash.com/photo-1581993192008-63fd1ea7de1a',
    isFavorite: true,
    tags: ['Warranty', 'Professional', 'Fast'],
    provider: {
      name: 'CoolAir Experts',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786',
      verified: true,
      rating: 4.7,
    },
    location: {
      distance: 3.2,
      city: 'New York',
    },
    availability: 'Tomorrow',
    isAvailable: true,
  },
  {
    id: '4',
    title: 'Full Home Move',
    description: 'Complete moving service with packing, loading, and transportation',
    price: 350,
    rating: 4.6,
    reviewCount: 98,
    category: 'moving',
    image: 'https://images.unsplash.com/photo-1541976590-713941681591',
    isFavorite: false,
    tags: ['Packing', 'Insurance', 'Reliable'],
    provider: {
      name: 'MoveEasy',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      verified: true,
      rating: 4.6,
    },
    location: {
      distance: 4.1,
      city: 'New York',
    },
    availability: 'This Week',
    isAvailable: true,
  },
  {
    id: '5',
    title: 'Professional Manicure',
    description: 'Luxury manicure and nail care with premium products',
    price: 45,
    originalPrice: 60,
    rating: 4.9,
    reviewCount: 312,
    category: 'beauty',
    image: 'https://images.unsplash.com/photo-1607778833979-4a87d896a76b',
    isFavorite: false,
    isFeatured: true,
    tags: ['Luxury', 'Hygienic', 'Premium'],
    provider: {
      name: 'Nail Studio Elite',
      avatar: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1bf',
      verified: true,
      rating: 4.9,
    },
    location: {
      distance: 0.8,
      city: 'New York',
    },
    availability: 'Today',
    isAvailable: true,
  },
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState(MOCK_SERVICES);
  const [filteredServices, setFilteredServices] = useState(MOCK_SERVICES);
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [selectedCategory, setSelectedCategory] = useState(params.category || 'all');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('relevance');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Load initial data
  useEffect(() => {
    loadInitialData();
    startAnimations();
    
    // Track search screen view
    analyticsService.trackScreenView('service_search', {
      user_id: user?.id,
      initial_query: searchQuery,
      initial_category: selectedCategory,
    });
  }, []);

  // Handle URL parameters
  useEffect(() => {
    if (params.q) {
      setSearchQuery(params.q);
    }
    if (params.category) {
      setSelectedCategory(params.category);
    }
  }, [params]);

  // Filter services when criteria change
  useEffect(() => {
    applyFilters();
  }, [services, searchQuery, selectedCategory, activeFilters, sortBy]);

  // Search animation
  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: searchQuery ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [searchQuery]);

  // Initial animations
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Load initial data
  const loadInitialData = async () => {
    try {
      // Get user location
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);

      // Load services
      const servicesData = await serviceService.searchServices({
        query: searchQuery,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        location: location,
        filters: activeFilters,
      });

      setServices(servicesData);
      setHasMore(servicesData.length > 0);

    } catch (error) {
      console.error('Error loading search data:', error);
      errorService.captureError(error, { context: 'SearchScreen' });
    }
  };

  // Apply filters to services
  const applyFilters = () => {
    let filtered = [...services];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    // Quick filters
    activeFilters.forEach(filter => {
      switch (filter) {
        case 'available_today':
          filtered = filtered.filter(service => 
            service.availability.toLowerCase().includes('today')
          );
          break;
        case 'emergency':
          filtered = filtered.filter(service => 
            service.tags.some(tag => tag.toLowerCase().includes('emergency')) ||
            service.tags.some(tag => tag.toLowerCase().includes('24/7'))
          );
          break;
        case 'verified':
          filtered = filtered.filter(service => service.provider.verified);
          break;
        case 'top_rated':
          filtered = filtered.filter(service => service.rating >= 4.5);
          break;
        case 'budget':
          filtered = filtered.filter(service => service.price < 50);
          break;
      }
    });

    // Sort services
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'distance':
        filtered.sort((a, b) => a.location.distance - b.location.distance);
        break;
      case 'newest':
        // Assuming there's a createdAt field
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        // Relevance - featured first, then by rating
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return b.rating - a.rating;
        });
    }

    setFilteredServices(filtered);
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
      analyticsService.trackEvent('search_refresh', {
        query: searchQuery,
        category: selectedCategory,
        filter_count: activeFilters.length,
      });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategory, activeFilters]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      try {
        const moreServices = await serviceService.searchServices({
          query: searchQuery,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          location: currentLocation,
          filters: activeFilters,
          offset: services.length,
        });

        if (moreServices.length > 0) {
          setServices(prev => [...prev, ...moreServices]);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error loading more services:', error);
      } finally {
        setLoadingMore(false);
      }
    }
  }, [loadingMore, hasMore, searchQuery, selectedCategory, activeFilters, services.length]);

  // Search handlers
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim()) {
      analyticsService.trackEvent('search_query', {
        query: query,
        category: selectedCategory,
        character_count: query.length,
      });
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    analyticsService.trackEvent('search_category_select', {
      category: categoryId,
      previous_category: selectedCategory,
    });
  };

  const handleQuickFilterToggle = (filterId) => {
    setActiveFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );

    analyticsService.trackEvent('quick_filter_toggle', {
      filter: filterId,
      active: !activeFilters.includes(filterId),
    });
  };

  const handleSortChange = (sortOption) => {
    setSortBy(sortOption);
    analyticsService.trackEvent('search_sort_change', {
      sort_by: sortOption,
    });
  };

  const handleServicePress = (service) => {
    analyticsService.trackEvent('search_result_click', {
      service_id: service.id,
      service_title: service.title,
      category: service.category,
      position: filteredServices.findIndex(s => s.id === service.id) + 1,
    });

    router.push(`/(services)/${service.id}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setActiveFilters([]);
    setSortBy('relevance');
    
    analyticsService.trackEvent('search_clear_filters');
  };

  const handleUseCurrentLocation = async () => {
    try {
      showLoading('Getting your location...');
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      
      // Reload services with new location
      await loadInitialData();
      
      analyticsService.trackEvent('search_use_current_location');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location.');
    } finally {
      hideLoading();
    }
  };

  // Get current category info
  const getCurrentCategory = () => {
    return SEARCH_CATEGORIES.find(cat => cat.id === selectedCategory) || SEARCH_CATEGORIES[0];
  };

  // Render search header
  const renderSearchHeader = () => (
    <Animated.View style={[styles.searchHeader, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Main Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <ThemedText style={[styles.searchIcon, { fontSize: 20 }]}>🔍</ThemedText>
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
            ]}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="What service do you need?"
            placeholderTextColor={theme.colors.placeholder}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <ThemedText style={[styles.clearIcon, { fontSize: 20 }]}>✕</ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.searchActions}>
          <IconButton
            icon={viewMode === 'grid' ? '📱' : '📋'}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            accessibilityLabel={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          />
          <IconButton
            icon="⚙️"
            onPress={() => setShowFilters(!showFilters)}
            accessibilityLabel="Filter services"
            badge={activeFilters.length}
          />
        </View>
      </View>

      {/* Location Bar */}
      <View style={styles.locationBar}>
        <ThemedText type="caption" style={styles.locationText}>
          📍 {currentLocation ? `Services near ${currentLocation.city}` : 'Getting location...'}
        </ThemedText>
        <TouchableOpacity onPress={handleUseCurrentLocation}>
          <ThemedText type="caption" style={styles.locationUpdate}>
            Update
          </ThemedText>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Render categories
  const renderCategories = () => (
    <Animated.View style={[styles.categoriesSection, { opacity: fadeAnim }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {SEARCH_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && [
                styles.categoryButtonActive,
                { backgroundColor: category.color + '20', borderColor: category.color }
              ],
            ]}
            onPress={() => handleCategorySelect(category.id)}
          >
            <ThemedText style={[styles.categoryIcon, { fontSize: 20 }]}>
              {category.icon}
            </ThemedText>
            <ThemedText 
              type="caption" 
              style={[
                styles.categoryName,
                selectedCategory === category.id && { color: category.color, fontWeight: '600' }
              ]}
            >
              {category.name}
            </ThemedText>
            {category.popular && (
              <View style={[styles.popularBadge, { backgroundColor: category.color }]}>
                <ThemedText type="caption" style={styles.popularText}>
                  Popular
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  // Render quick filters
  const renderQuickFilters = () => (
    <Animated.View style={[styles.filtersSection, { opacity: fadeAnim }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {QUICK_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              activeFilters.includes(filter.id) && [
                styles.filterButtonActive,
                { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
              ],
            ]}
            onPress={() => handleQuickFilterToggle(filter.id)}
          >
            <ThemedText style={[styles.filterIcon, { fontSize: 16 }]}>
              {filter.icon}
            </ThemedText>
            <ThemedText 
              type="caption" 
              style={[
                styles.filterLabel,
                activeFilters.includes(filter.id) && { color: theme.colors.primary, fontWeight: '600' }
              ]}
            >
              {filter.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  // Render sort options
  const renderSortOptions = () => (
    <View style={styles.sortSection}>
      <ThemedText type="caption" style={styles.sortLabel}>
        Sort by:
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortOptions}
      >
        {[
          { id: 'relevance', label: 'Relevance' },
          { id: 'rating', label: 'Highest Rated' },
          { id: 'price_low', label: 'Price: Low to High' },
          { id: 'price_high', label: 'Price: High to Low' },
          { id: 'distance', label: 'Nearest First' },
          { id: 'newest', label: 'Newest' },
        ].map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.sortButton,
              sortBy === option.id && [
                styles.sortButtonActive,
                { backgroundColor: theme.colors.primary }
              ],
            ]}
            onPress={() => handleSortChange(option.id)}
          >
            <ThemedText
              style={[
                styles.sortButtonText,
                sortBy === option.id && styles.sortButtonTextActive,
              ]}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render search results
  const renderSearchResults = () => {
    if (filteredServices.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyIcon, { fontSize: 64 }]}>
            {searchQuery ? '🔍' : '📝'}
          </ThemedText>
          <ThemedText type="title" style={styles.emptyTitle}>
            {searchQuery ? 'No services found' : 'No services available'}
          </ThemedText>
          <ThemedText type="default" style={styles.emptyDescription}>
            {searchQuery 
              ? `We couldn't find any services matching "${searchQuery}"`
              : `There are no services available in ${getCurrentCategory().name.toLowerCase()} right now.`
            }
          </ThemedText>
          <OutlineButton
            title="Clear Filters"
            onPress={handleClearFilters}
            style={styles.emptyButton}
          />
        </View>
      );
    }

    return (
      <View style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
        {filteredServices.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            onPress={() => handleServicePress(service)}
            variant={viewMode}
            style={[
              viewMode === 'grid' ? styles.gridCard : styles.listCard,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                ],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // Render load more
  const renderLoadMore = () => {
    if (!hasMore || filteredServices.length === 0) return null;

    return (
      <View style={styles.loadMoreContainer}>
        {loadingMore ? (
          <Loading type="spinner" size="small" />
        ) : (
          <OutlineButton
            title="Load More Services"
            onPress={loadMore}
            fullWidth
          />
        )}
      </View>
    );
  };

  // Render search stats
  const renderSearchStats = () => {
    if (filteredServices.length === 0) return null;

    const currentCategory = getCurrentCategory();

    return (
      <Animated.View style={[styles.statsSection, { opacity: searchAnim }]}>
        <ThemedText type="caption" style={styles.statsText}>
          {searchQuery ? (
            `Found ${filteredServices.length} services for "${searchQuery}"`
          ) : (
            `Showing ${filteredServices.length} services in ${currentCategory.name}`
          )}
        </ThemedText>
      </Animated.View>
    );
  };

  const currentCategory = getCurrentCategory();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Find Services',
          headerShown: true,
          headerLargeTitle: Platform.OS === 'ios',
          headerLargeTitleShadowVisible: false,
          headerTransparent: Platform.OS === 'ios',
          headerBlurEffect: isDark ? 'dark' : 'light',
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          // Basic infinite scroll detection
          if (nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= 
              nativeEvent.contentSize.height - 100) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Search Header */}
        {renderSearchHeader()}

        {/* Categories */}
        {renderCategories()}

        {/* Quick Filters */}
        {renderQuickFilters()}

        {/* Sort Options */}
        {renderSortOptions()}

        {/* Search Stats */}
        {renderSearchStats()}

        {/* Search Results */}
        {renderSearchResults()}

        {/* Load More */}
        {renderLoadMore()}

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>

      {/* Advanced Filters Modal */}
      {showFilters && (
        <ServiceFilter
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          onApply={(filters) => {
            // Handle advanced filters
            setShowFilters(false);
          }}
          currentFilters={activeFilters}
        />
      )}
    </ThemedView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  searchHeader: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearIcon: {
    opacity: 0.5,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  locationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    opacity: 0.7,
  },
  locationUpdate: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  categoriesSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.02)',
    minWidth: 80,
    position: 'relative',
  },
  categoryButtonActive: {
    borderWidth: 1,
  },
  categoryIcon: {
    marginBottom: 6,
  },
  categoryName: {
    fontWeight: '500',
    textAlign: 'center',
  },
  popularBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  filtersSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filtersContainer: {
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  filterButtonActive: {
    borderWidth: 1,
  },
  filterIcon: {
    opacity: 0.7,
  },
  filterLabel: {
    fontWeight: '500',
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  sortLabel: {
    opacity: 0.7,
  },
  sortOptions: {
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  sortButtonActive: {
    backgroundColor: '#3B82F6',
  },
  sortButtonText: {
    fontWeight: '500',
    fontSize: 12,
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  statsText: {
    opacity: 0.7,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  gridCard: {
    width: (width - 44) / 2, // 2 columns with gap
    marginBottom: 12,
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  listCard: {
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 140,
  },
  loadMoreContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  footer: {
    height: 20,
  },
};