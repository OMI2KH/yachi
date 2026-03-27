import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { useLocation } from '../../../hooks/use-location';
import { 
  ThemedView, 
  ThemedText 
} from '../../../components/themed-view';
import { 
  Button 
} from '../../../components/ui/button';
import { 
  Card 
} from '../../../components/ui/card';
import { 
  Loading 
} from '../../../components/ui/loading';
import { 
  Input 
} from '../../../components/ui/input';
import { 
  ServiceCard 
} from '../../../components/service/service-card';
import { 
  ServiceFilter 
} from '../../../components/service/service-filter';
import { 
  ServiceList 
} from '../../../components/service/service-list';
import { 
  LocationPicker 
} from '../../../components/ui/location-picker';
import { 
  VoiceSearch 
} from '../../../components/ui/voice-search';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  serviceService 
} from '../../../services/service-service';
import { 
  aiAssignmentService 
} from '../../../services/ai-assignment-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Service Search Screen
 * Features: AI-powered search, voice search, advanced filtering, location intelligence, real-time results
 */
const ServiceSearchScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  const { currentLocation, getCurrentLocation } = useLocation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [searchMode, setSearchMode] = useState('text'); // text, voice, image
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid, list, map
  const [sortBy, setSortBy] = useState('relevance');
  const [searchLocation, setSearchLocation] = useState({
    address: '',
    city: '',
    region: '',
    coordinates: null,
    radius: 20, // km
  });
  const [filters, setFilters] = useState({
    categories: [],
    priceRange: { min: 0, max: 100000 },
    rating: 0,
    availability: 'any', // any, today, tomorrow, this_week
    serviceType: [], // one_time, recurring, subscription
    providerType: [], // individual, company, verified
    experience: 0, // years
    instantBooking: false,
    emergencyService: false,
    afterHours: false,
  });
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [searchStats, setSearchStats] = useState({
    totalResults: 0,
    searchTime: 0,
    aiMatches: 0,
    locationMatches: 0,
  });

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ServiceSearch');
    }, [])
  );

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Get current location for default search
      const location = await getCurrentLocation();
      if (location) {
        setSearchLocation(prev => ({
          ...prev,
          coordinates: location.coordinates,
          address: location.address,
          city: location.city,
          region: location.region,
        }));
      }
      
      // Load popular searches and history
      const [popular, history] = await Promise.all([
        serviceService.getPopularSearches(),
        serviceService.getSearchHistory(user?.id),
      ]);
      
      setPopularSearches(popular);
      setSearchHistory(history);
      
      // Perform initial search if query exists
      if (params.query) {
        await performSearch(params.query, filters, searchLocation);
      }
      
      analyticsService.trackEvent('search_screen_loaded', {
        userId: user?.id,
        hasInitialQuery: !!params.query,
        locationAvailable: !!location,
      });
    } catch (error) {
      console.error('Error loading initial data:', error);
      showError('Failed to load search data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, params.query, getCurrentLocation]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

  // Perform search with AI optimization
  const performSearch = useCallback(async (query, searchFilters, location) => {
    try {
      setIsLoading(true);
      const startTime = Date.now();
      
      // AI-powered search with semantic understanding
      const searchResults = await serviceService.advancedSearch({
        query,
        filters: searchFilters,
        location: location.coordinates ? {
          coordinates: location.coordinates,
          radius: location.radius,
        } : null,
        userId: user?.id,
        sortBy,
        aiOptimization: true,
      });
      
      setServices(searchResults.services);
      setFilteredServices(searchResults.services);
      setSearchStats({
        totalResults: searchResults.total,
        searchTime: Date.now() - startTime,
        aiMatches: searchResults.aiMatches,
        locationMatches: searchResults.locationMatches,
      });
      
      // Get AI suggestions for related searches
      if (query.trim()) {
        const suggestions = await aiAssignmentService.getSearchSuggestions(query, searchFilters);
        setAiSuggestions(suggestions);
      }
      
      // Update search history
      if (query.trim() && user?.id) {
        await serviceService.addToSearchHistory(user.id, query, searchFilters);
      }
      
      analyticsService.trackEvent('service_search_performed', {
        userId: user?.id,
        query: query,
        resultCount: searchResults.total,
        searchTime: Date.now() - startTime,
        filtersUsed: Object.keys(searchFilters).filter(key => 
          Array.isArray(searchFilters[key]) ? searchFilters[key].length > 0 : searchFilters[key]
        ).length,
        hasLocation: !!location.coordinates,
      });
    } catch (error) {
      console.error('Error performing search:', error);
      showError('Failed to perform search');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, sortBy]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      showError('Please enter a search query');
      return;
    }
    
    performSearch(searchQuery, filters, searchLocation);
  }, [searchQuery, filters, searchLocation, performSearch]);

  // Handle voice search
  const handleVoiceSearch = useCallback(async () => {
    try {
      setSearchMode('voice');
      // Voice recognition would be implemented here
      // For now, we'll simulate voice input
      Alert.prompt(
        'Voice Search',
        'Speak your search query',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Search',
            onPress: (voiceQuery) => {
              if (voiceQuery) {
                setSearchQuery(voiceQuery);
                performSearch(voiceQuery, filters, searchLocation);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error with voice search:', error);
      showError('Voice search not available');
    }
  }, [filters, searchLocation, performSearch]);

  // Handle image search
  const handleImageSearch = useCallback(async () => {
    try {
      setSearchMode('image');
      // Image recognition and search would be implemented here
      showError('Image search coming soon');
    } catch (error) {
      console.error('Error with image search:', error);
      showError('Image search not available');
    }
  }, []);

  // Handle filter application
  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
    
    if (searchQuery.trim() || services.length > 0) {
      performSearch(searchQuery, newFilters, searchLocation);
    }
  }, [searchQuery, services.length, searchLocation, performSearch]);

  // Handle location change
  const handleLocationChange = useCallback((location) => {
    setSearchLocation(location);
    
    if (searchQuery.trim() || services.length > 0) {
      performSearch(searchQuery, filters, location);
    }
  }, [searchQuery, services.length, filters, performSearch]);

  // Handle service selection
  const handleServiceSelect = useCallback((service) => {
    analyticsService.trackEvent('service_selected_from_search', {
      userId: user?.id,
      serviceId: service.id,
      serviceCategory: service.category,
      searchQuery: searchQuery,
      positionInResults: services.findIndex(s => s.id === service.id) + 1,
    });
    
    router.push(`/(services)/${service.id}`);
  }, [user?.id, searchQuery, services]);

  // Handle AI suggestion click
  const handleAISuggestionClick = useCallback((suggestion) => {
    setSearchQuery(suggestion.query);
    performSearch(suggestion.query, filters, searchLocation);
    
    analyticsService.trackEvent('ai_suggestion_clicked', {
      userId: user?.id,
      suggestionType: suggestion.type,
      originalQuery: searchQuery,
      suggestedQuery: suggestion.query,
    });
  }, [filters, searchLocation, performSearch, searchQuery, user?.id]);

  // Handle popular search click
  const handlePopularSearchClick = useCallback((popularSearch) => {
    setSearchQuery(popularSearch.query);
    performSearch(popularSearch.query, filters, searchLocation);
    
    analyticsService.trackEvent('popular_search_clicked', {
      userId: user?.id,
      popularSearch: popularSearch.query,
      searchCount: popularSearch.count,
    });
  }, [filters, searchLocation, performSearch, user?.id]);

  // Handle search history click
  const handleSearchHistoryClick = useCallback((historyItem) => {
    setSearchQuery(historyItem.query);
    setFilters(historyItem.filters || {});
    performSearch(historyItem.query, historyItem.filters || {}, searchLocation);
    
    analyticsService.trackEvent('search_history_used', {
      userId: user?.id,
      historyQuery: historyItem.query,
    });
  }, [searchLocation, performSearch, user?.id]);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setServices([]);
    setFilteredServices([]);
    setAiSuggestions([]);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy) => {
    setSortBy(newSortBy);
    
    if (searchQuery.trim() || services.length > 0) {
      performSearch(searchQuery, filters, searchLocation);
    }
  }, [searchQuery, services.length, filters, searchLocation, performSearch]);

  // Render search header
  const renderSearchHeader = () => (
    <Card style={styles.searchHeaderCard}>
      <View style={styles.searchInputContainer}>
        <Input
          placeholder="What service are you looking for?"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          leftIcon="search"
          style={styles.searchInput}
        />
        
        <View style={styles.searchModeButtons}>
          <Button
            variant={searchMode === 'voice' ? 'primary' : 'outlined'}
            onPress={handleVoiceSearch}
            size="small"
            leftIcon="mic"
          />
          <Button
            variant={searchMode === 'image' ? 'primary' : 'outlined'}
            onPress={handleImageSearch}
            size="small"
            leftIcon="image"
          />
        </View>
      </View>

      <View style={styles.searchActions}>
        <Button
          variant="outlined"
          onPress={() => setShowFilters(!showFilters)}
          leftIcon="filter"
          style={styles.filterButton}
        >
          Filters
        </Button>
        
        <Button
          variant="primary"
          onPress={handleSearch}
          loading={isLoading}
          style={styles.searchButton}
        >
          Search
        </Button>
      </View>
    </Card>
  );

  // Render location selector
  const renderLocationSelector = () => (
    <Card style={styles.locationCard}>
      <ThemedText style={styles.sectionTitle}>Search Location</ThemedText>
      <LocationPicker
        location={searchLocation}
        onLocationSelect={handleLocationChange}
        showRadiusSelector={true}
        style={styles.locationPicker}
      />
    </Card>
  );

  // Render search suggestions
  const renderSearchSuggestions = () => {
    if (services.length > 0 || !searchQuery) return null;

    return (
      <Card style={styles.suggestionsCard}>
        <ThemedText style={styles.sectionTitle}>Search Suggestions</ThemedText>
        
        {searchHistory.length > 0 && (
          <View style={styles.suggestionSection}>
            <ThemedText style={styles.suggestionLabel}>Recent Searches</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {searchHistory.slice(0, 10).map((item, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  onPress={() => handleSearchHistoryClick(item)}
                  size="small"
                  style={styles.suggestionButton}
                >
                  {item.query}
                </Button>
              ))}
            </ScrollView>
          </View>
        )}
        
        {popularSearches.length > 0 && (
          <View style={styles.suggestionSection}>
            <ThemedText style={styles.suggestionLabel}>Popular in {searchLocation.city || 'Your Area'}</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {popularSearches.slice(0, 10).map((item, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  onPress={() => handlePopularSearchClick(item)}
                  size="small"
                  style={styles.suggestionButton}
                >
                  {item.query} ({item.count})
                </Button>
              ))}
            </ScrollView>
          </View>
        )}
        
        {aiSuggestions.length > 0 && (
          <View style={styles.suggestionSection}>
            <ThemedText style={styles.suggestionLabel}>AI Suggestions</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {aiSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  onPress={() => handleAISuggestionClick(suggestion)}
                  size="small"
                  style={styles.suggestionButton}
                >
                  🤖 {suggestion.query}
                </Button>
              ))}
            </ScrollView>
          </View>
        )}
      </Card>
    );
  };

  // Render filters panel
  const renderFiltersPanel = () => {
    if (!showFilters) return null;

    return (
      <Card style={styles.filtersPanelCard}>
        <ServiceFilter
          filters={filters}
          onApplyFilters={handleApplyFilters}
          onReset={() => setFilters({
            categories: [],
            priceRange: { min: 0, max: 100000 },
            rating: 0,
            availability: 'any',
            serviceType: [],
            providerType: [],
            experience: 0,
            instantBooking: false,
            emergencyService: false,
            afterHours: false,
          })}
          style={styles.serviceFilter}
        />
      </Card>
    );
  };

  // Render search results header
  const renderResultsHeader = () => {
    if (services.length === 0) return null;

    return (
      <Card style={styles.resultsHeaderCard}>
        <View style={styles.resultsHeader}>
          <View style={styles.resultsInfo}>
            <ThemedText style={styles.resultsCount}>
              {searchStats.totalResults.toLocaleString()} results
            </ThemedText>
            <ThemedText style={styles.searchTime}>
              in {searchStats.searchTime}ms
            </ThemedText>
            {searchStats.aiMatches > 0 && (
              <ThemedText style={styles.aiMatches}>
                🤖 {searchStats.aiMatches} AI matches
              </ThemedText>
            )}
          </View>
          
          <View style={styles.resultsControls}>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outlined'}
              onPress={() => setViewMode('grid')}
              size="small"
              leftIcon="grid"
            />
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outlined'}
              onPress={() => setViewMode('list')}
              size="small"
              leftIcon="list"
            />
            
            <View style={styles.sortDropdown}>
              <ThemedText style={styles.sortLabel}>Sort:</ThemedText>
              <Button
                variant="ghost"
                onPress={() => {
                  const sortOptions = [
                    'relevance',
                    'rating',
                    'price_low',
                    'price_high',
                    'distance',
                    'newest',
                  ];
                  const currentIndex = sortOptions.indexOf(sortBy);
                  const nextIndex = (currentIndex + 1) % sortOptions.length;
                  handleSortChange(sortOptions[nextIndex]);
                }}
                size="small"
              >
                {sortBy.replace('_', ' ')}
              </Button>
            </View>
          </View>
        </View>
        
        {searchQuery && (
          <View style={styles.searchQueryInfo}>
            <ThemedText style={styles.currentQuery}>
              Search: "{searchQuery}"
            </ThemedText>
            <Button
              variant="ghost"
              onPress={handleClearSearch}
              size="small"
            >
              Clear
            </Button>
          </View>
        )}
      </Card>
    );
  };

  // Render search results
  const renderSearchResults = () => {
    if (services.length === 0) {
      if (searchQuery && !isLoading) {
        return (
          <Card style={styles.noResultsCard}>
            <ThemedText style={styles.noResultsTitle}>
              No services found
            </ThemedText>
            <ThemedText style={styles.noResultsText}>
              Try adjusting your search criteria or filters
            </ThemedText>
            <Button
              variant="outlined"
              onPress={() => setShowFilters(true)}
              style={styles.adjustFiltersButton}
            >
              Adjust Filters
            </Button>
          </Card>
        );
      }
      return null;
    }

    return (
      <View style={styles.resultsContainer}>
        <ServiceList
          services={filteredServices}
          viewMode={viewMode}
          onServiceSelect={handleServiceSelect}
          style={styles.serviceList}
        />
      </View>
    );
  };

  // Render AI optimization banner
  const renderAIOptimizationBanner = () => {
    if (services.length === 0 || searchStats.aiMatches === 0) return null;

    return (
      <Card style={styles.aiBannerCard}>
        <View style={styles.aiBannerContent}>
          <ThemedText style={styles.aiBannerTitle}>
            🚀 AI-Optimized Results
          </ThemedText>
          <ThemedText style={styles.aiBannerText}>
            Our AI found {searchStats.aiMatches} services matching your intent beyond just keywords
          </ThemedText>
        </View>
      </Card>
    );
  };

  if (isLoading && services.length === 0) {
    return <Loading message="Searching for services..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadInitialData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search Header */}
        {renderSearchHeader()}

        {/* Location Selector */}
        {renderLocationSelector()}

        {/* Search Suggestions */}
        {renderSearchSuggestions()}

        {/* Filters Panel */}
        {renderFiltersPanel()}

        {/* AI Optimization Banner */}
        {renderAIOptimizationBanner()}

        {/* Results Header */}
        {renderResultsHeader()}

        {/* Search Results */}
        {renderSearchResults()}

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  searchHeaderCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
  },
  searchModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flex: 1,
  },
  searchButton: {
    flex: 1,
  },
  locationCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  locationPicker: {
    marginBottom: 8,
  },
  suggestionsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  suggestionSection: {
    marginBottom: 16,
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionButton: {
    marginRight: 8,
  },
  filtersPanelCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  serviceFilter: {
    marginBottom: 16,
  },
  aiBannerCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  aiBannerContent: {
    alignItems: 'center',
  },
  aiBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  aiBannerText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsHeaderCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultsInfo: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  searchTime: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  aiMatches: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  resultsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  searchQueryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  currentQuery: {
    fontSize: 14,
    opacity: 0.7,
  },
  noResultsCard: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  adjustFiltersButton: {
    minWidth: 150,
  },
  resultsContainer: {
    padding: 16,
  },
  serviceList: {
    gap: 12,
  },
  spacer: {
    height: 20,
  },
};

export default ServiceSearchScreen;