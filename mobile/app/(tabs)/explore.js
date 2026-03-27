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

const { width } = Dimensions.get('window');

// Categories with icons and colors
const CATEGORIES = [
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
    description: 'Home, office, and deep cleaning'
  },
  { 
    id: 'repair', 
    name: 'Repairs', 
    icon: '🔧', 
    color: '#F59E0B',
    description: 'Fix it and maintenance services'
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
    description: 'Moving and relocation help'
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
  { 
    id: 'other', 
    name: 'Other', 
    icon: '🔍', 
    color: '#6B7280',
    description: 'Other specialized services'
  },
];

// Mock services data - replace with API
const MOCK_SERVICES = [
  {
    id: '1',
    title: 'Deep Home Cleaning',
    description: 'Comprehensive home cleaning with eco-friendly products and attention to detail',
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
  },
  {
    id: '6',
    title: 'Personal Training',
    description: 'Customized fitness training programs for all levels',
    price: 75,
    rating: 4.8,
    reviewCount: 167,
    category: 'fitness',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
    isFavorite: true,
    tags: ['Certified', 'Custom', 'Results'],
    provider: {
      name: 'FitLife Coaches',
      avatar: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
      verified: true,
      rating: 4.8,
    },
    location: {
      distance: 2.7,
      city: 'New York',
    },
    availability: 'Flexible',
  },
];

// Filter options
const FILTER_OPTIONS = {
  sortBy: [
    { id: 'relevance', label: 'Most Relevant' },
    { id: 'rating', label: 'Highest Rated' },
    { id: 'price_low', label: 'Price: Low to High' },
    { id: 'price_high', label: 'Price: High to Low' },
    { id: 'distance', label: 'Nearest First' },
  ],
  priceRange: [
    { id: 'any', label: 'Any Price' },
    { id: 'under_50', label: 'Under $50' },
    { id: '50_100', label: '$50 - $100' },
    { id: '100_200', label: '$100 - $200' },
    { id: 'over_200', label: 'Over $200' },
  ],
  rating: [
    { id: 'any', label: 'Any Rating' },
    { id: '4.5', label: '4.5+ Stars' },
    { id: '4.0', label: '4.0+ Stars' },
    { id: '3.5', label: '3.5+ Stars' },
  ],
  availability: [
    { id: 'any', label: 'Any Time' },
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'this_week', label: 'This Week' },
  ],
};

export default function ExploreScreen() {
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
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    sortBy: 'relevance',
    priceRange: 'any',
    rating: 'any',
    availability: 'any',
    features: [],
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;

  // Load initial data
  useEffect(() => {
    loadServices();
    startAnimations();
    
    // Track screen view
    analyticsService.trackScreenView('explore', {
      user_id: user?.id,
      initial_category: selectedCategory,
      search_query: searchQuery,
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
  }, [services, searchQuery, selectedCategory, activeFilters]);

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

  // Filter animation
  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: showFilters ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [showFilters]);

  // Load services data
  const loadServices = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    }

    try {
      // Simulate API call
      const newServices = await serviceService.getServices({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery,
        filters: activeFilters,
        offset: loadMore ? services.length : 0,
      });

      if (loadMore) {
        setServices(prev => [...prev, ...newServices]);
        setHasMore(newServices.length > 0);
      } else {
        setServices(newServices);
      }

    } catch (error) {
      console.error('Error loading services:', error);
      errorService.captureError(error, { context: 'ExploreScreen' });
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      }
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
        service.provider.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    // Price range filter
    if (activeFilters.priceRange !== 'any') {
      filtered = filtered.filter(service => {
        switch (activeFilters.priceRange) {
          case 'under_50': return service.price < 50;
          case '50_100': return service.price >= 50 && service.price <= 100;
          case '100_200': return service.price >= 100 && service.price <= 200;
          case 'over_200': return service.price > 200;
          default: return true;
        }
      });
    }

    // Rating filter
    if (activeFilters.rating !== 'any') {
      const minRating = parseFloat(activeFilters.rating);
      filtered = filtered.filter(service => service.rating >= minRating);
    }

    // Availability filter
    if (activeFilters.availability !== 'any') {
      filtered = filtered.filter(service => {
        return service.availability.toLowerCase().includes(activeFilters.availability);
      });
    }

    // Sort services
    switch (activeFilters.sortBy) {
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
      await loadServices();
      analyticsService.trackEvent('explore_refresh', {
        category: selectedCategory,
        search_query: searchQuery,
      });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      await loadServices(true);
    }
  }, [loadingMore, hasMore]);

  // Navigation handlers
  const handleSearch = () => {
    if (searchQuery.trim()) {
      analyticsService.trackEvent('explore_search', { 
        query: searchQuery,
        category: selectedCategory,
      });
      applyFilters();
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    analyticsService.trackEvent('explore_category_select', { 
      category: categoryId,
      previous_category: selectedCategory,
    });
  };

  const handleServicePress = (service) => {
    analyticsService.trackEvent('explore_service_click', { 
      service_id: service.id,
      service_name: service.title,
      category: service.category,
    });
    router.push(`/(services)/${service.id}`);
  };

  const handleFilterApply = (filters) => {
    setActiveFilters(filters);
    setShowFilters(false);
    analyticsService.trackEvent('explore_filter_apply', { filters });
  };

  const handleFilterReset = () => {
    setActiveFilters({
      sortBy: 'relevance',
      priceRange: 'any',
      rating: 'any',
      availability: 'any',
      features: [],
    });
    analyticsService.trackEvent('explore_filter_reset');
  };

  const handleCreateService = () => {
    analyticsService.trackEvent('explore_create_service_click');
    router.push('/(services)/create');
  };

  // Get current category info
  const getCurrentCategory = () => {
    return CATEGORIES.find(cat => cat.id === selectedCategory) || CATEGORIES[0];
  };

  // Render header with search and filters
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholder="Search for services..."
          returnKeyType="search"
          style={styles.searchInput}
        />
        <View style={styles.headerActions}>
          <IconButton
            icon={viewMode === 'grid' ? '📱' : '📋'}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            accessibilityLabel={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          />
          <IconButton
            icon="⚙️"
            onPress={() => setShowFilters(!showFilters)}
            accessibilityLabel="Filter services"
            badge={Object.values(activeFilters).filter(val => 
              val !== 'relevance' && val !== 'any' && !Array.isArray(val) || 
              (Array.isArray(val) && val.length > 0)
            ).length}
          />
        </View>
      </View>

      {/* Categories Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map((category) => (
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
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  // Render filter panel
  const renderFilters = () => (
    <Animated.View 
      style={[
        styles.filterPanel,
        {
          height: filterAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 300],
          }),
          opacity: filterAnim,
        }
      ]}
    >
      <ServiceFilter
        filters={activeFilters}
        options={FILTER_OPTIONS}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        onClose={() => setShowFilters(false)}
      />
    </Animated.View>
  );

  // Render services grid/list
  const renderServices = () => {
    if (filteredServices.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyIcon, { fontSize: 64 }]}>🔍</ThemedText>
          <ThemedText type="title" style={styles.emptyTitle}>
            No services found
          </ThemedText>
          <ThemedText type="default" style={styles.emptyDescription}>
            {searchQuery 
              ? `No results for "${searchQuery}"`
              : `No services available in ${getCurrentCategory().name.toLowerCase()}`
            }
          </ThemedText>
          <OutlineButton
            title="Reset Filters"
            onPress={handleFilterReset}
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
                  { scale: fadeAnim },
                ],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // Render load more button
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

  const currentCategory = getCurrentCategory();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Explore Services',
          headerShown: true,
          headerRight: () => (
            <IconButton
              icon="➕"
              onPress={handleCreateService}
              accessibilityLabel="Create Service"
              size="small"
            />
          ),
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
              nativeEvent.contentSize.height - 50) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Header Section */}
        {renderHeader()}

        {/* Filters Panel */}
        {renderFilters()}

        {/* Results Header */}
        <Animated.View style={[styles.resultsHeader, { opacity: fadeAnim }]}>
          <View style={styles.resultsInfo}>
            <ThemedText type="subtitle" style={styles.resultsTitle}>
              {currentCategory.name}
            </ThemedText>
            <ThemedText type="caption" style={styles.resultsCount}>
              {filteredServices.length} services found
              {searchQuery && ` for "${searchQuery}"`}
            </ThemedText>
          </View>
          <ThemedText type="caption" style={styles.resultsDescription}>
            {currentCategory.description}
          </ThemedText>
        </Animated.View>

        {/* Services Grid/List */}
        {renderServices()}

        {/* Load More */}
        {renderLoadMore()}

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoriesContainer: {
    paddingRight: 20,
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
  filterPanel: {
    overflow: 'hidden',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  resultsCount: {
    opacity: 0.7,
  },
  resultsDescription: {
    opacity: 0.6,
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