import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
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
import { ParallaxScrollView } from '../../components/parallax-scroll-view';
import { HelloWave } from '../../components/hello-wave';
import { HapticTab } from '../../components/haptic-tab';
import SearchBar from '../../components/search-bar';
import ServiceCard from '../../components/service/service-card';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { serviceService } from '../../services/service-service';
import { bookingService } from '../../services/booking-service';

// Mock data - replace with actual API calls
const MOCK_SERVICES = [
  {
    id: '1',
    title: 'Home Cleaning',
    description: 'Professional home cleaning service with eco-friendly products',
    price: 75,
    rating: 4.8,
    reviewCount: 124,
    category: 'cleaning',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
    isFavorite: true,
    provider: {
      name: 'CleanPro Services',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
      verified: true,
    },
  },
  {
    id: '2',
    title: 'Plumbing Repair',
    description: 'Emergency plumbing services and fixture installations',
    price: 120,
    rating: 4.9,
    reviewCount: 89,
    category: 'repair',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4',
    isFavorite: false,
    provider: {
      name: 'FixIt Plumbers',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      verified: true,
    },
  },
  {
    id: '3',
    title: 'AC Installation',
    description: 'Professional AC installation and maintenance services',
    price: 300,
    rating: 4.7,
    reviewCount: 67,
    category: 'installation',
    image: 'https://images.unsplash.com/photo-1581993192008-63fd1ea7de1a',
    isFavorite: true,
    provider: {
      name: 'CoolAir Experts',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786',
      verified: true,
    },
  },
];

const MOCK_UPCOMING_BOOKINGS = [
  {
    id: '1',
    service: 'Home Cleaning',
    date: '2024-01-15T10:00:00Z',
    status: 'confirmed',
    provider: 'CleanPro Services',
    price: 75,
  },
  {
    id: '2',
    service: 'Plumbing Repair',
    date: '2024-01-16T14:00:00Z',
    status: 'pending',
    provider: 'FixIt Plumbers',
    price: 120,
  },
];

const QUICK_ACTIONS = [
  {
    id: '1',
    title: 'Book Service',
    description: 'Find and book a service',
    icon: '📅',
    route: '/(services)/search',
    color: '#3B82F6',
  },
  {
    id: '2',
    title: 'My Bookings',
    description: 'View your appointments',
    icon: '📋',
    route: '/(bookings)',
    color: '#10B981',
  },
  {
    id: '3',
    title: 'Messages',
    description: 'Chat with providers',
    icon: '💬',
    route: '/(messages)',
    color: '#8B5CF6',
  },
  {
    id: '4',
    title: 'Emergency',
    description: '24/7 urgent help',
    icon: '🚨',
    route: '/emergency',
    color: '#EF4444',
  },
];

const CATEGORIES = [
  { id: 'cleaning', name: 'Cleaning', icon: '🧹' },
  { id: 'repair', name: 'Repairs', icon: '🔧' },
  { id: 'installation', name: 'Installation', icon: '⚡' },
  { id: 'moving', name: 'Moving', icon: '📦' },
  { id: 'beauty', name: 'Beauty', icon: '💅' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState(MOCK_SERVICES);
  const [upcomingBookings, setUpcomingBookings] = useState(MOCK_UPCOMING_BOOKINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [notificationsCount, setNotificationsCount] = useState(3);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadHomeData();
      startAnimations();
      
      // Track screen view
      analyticsService.trackScreenView('home', {
        user_id: user?.id,
        user_type: user?.role,
      });

      return () => {
        // Cleanup if needed
      };
    }, [user])
  );

  // Initial animations
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Load home screen data
  const loadHomeData = async () => {
    try {
      // In production, these would be actual API calls
      const [servicesData, bookingsData, notificationsData] = await Promise.allSettled([
        serviceService.getFeaturedServices(),
        bookingService.getUpcomingBookings(),
        // notificationService.getUnreadCount(),
      ]);

      // Update state with actual data
      if (servicesData.status === 'fulfilled') {
        setServices(servicesData.value);
      }
      
      if (bookingsData.status === 'fulfilled') {
        setUpcomingBookings(bookingsData.value);
      }
      
      if (notificationsData.status === 'fulfilled') {
        setNotificationsCount(notificationsData.value);
      }

    } catch (error) {
      console.error('Error loading home data:', error);
      errorService.captureError(error, { context: 'HomeScreenData' });
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHomeData();
      analyticsService.trackEvent('home_refresh');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Navigation handlers
  const handleSearch = () => {
    if (searchQuery.trim()) {
      analyticsService.trackEvent('home_search', { query: searchQuery });
      router.push({
        pathname: '/(services)/search',
        params: { q: searchQuery },
      });
    }
  };

  const handleQuickAction = (action) => {
    analyticsService.trackEvent('quick_action_click', { action: action.title });
    router.push(action.route);
  };

  const handleServicePress = (service) => {
    analyticsService.trackEvent('service_click', { 
      service_id: service.id,
      service_name: service.title,
    });
    router.push(`/(services)/${service.id}`);
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category.id);
    analyticsService.trackEvent('category_select', { category: category.id });
    
    // Navigate to explore with category filter
    router.push({
      pathname: '/(services)/search',
      params: { category: category.id },
    });
  };

  const handleBookingPress = (booking) => {
    router.push(`/(bookings)/${booking.id}`);
  };

  const handleNotificationsPress = () => {
    analyticsService.trackEvent('notifications_click');
    router.push('/(profile)/notifications');
  };

  const handleProfilePress = () => {
    router.push('/(profile)');
  };

  const handleEmergencyPress = () => {
    analyticsService.trackEvent('emergency_click');
    Alert.alert(
      'Emergency Assistance',
      'This will connect you with our 24/7 emergency support team. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          style: 'destructive',
          onPress: () => {
            // Implement emergency call functionality
            router.push('/emergency-call');
          }
        },
      ]
    );
  };

  // Filter services based on search and category
  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Animation styles
  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      { translateY: slideAnim },
      { scale: scaleAnim },
    ],
  };

  // Render header with user greeting
  const renderHeader = () => (
    <Animated.View style={[styles.header, animatedStyle]}>
      <View style={styles.headerTop}>
        <View style={styles.greeting}>
          <ThemedText type="title" style={styles.greetingText}>
            Good {getTimeOfDay()},
          </ThemedText>
          <ThemedText type="title" style={styles.userName}>
            {user?.firstName || 'User'}!
          </ThemedText>
          <HelloWave />
        </View>
        
        <View style={styles.headerActions}>
          <IconButton
            icon="🔔"
            onPress={handleNotificationsPress}
            badge={notificationsCount}
            accessibilityLabel="Notifications"
          />
          <IconButton
            icon="👤"
            onPress={handleProfilePress}
            accessibilityLabel="Profile"
          />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholder="What service do you need today?"
          returnKeyType="search"
        />
      </View>
    </Animated.View>
  );

  // Render quick actions grid
  const renderQuickActions = () => (
    <Animated.View style={[styles.section, animatedStyle]}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quick Actions
        </ThemedText>
        <OutlineButton
          title="See All"
          onPress={() => router.push('/(tabs)/explore')}
          size="small"
        />
      </View>
      
      <View style={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action, index) => (
          <Animated.View
            key={action.id}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: action.color + '20', // 20% opacity
                borderColor: action.color + '40', // 40% opacity
              },
            ]}
          >
            <Button
              variant={ButtonVariant.GHOST}
              onPress={() => handleQuickAction(action)}
              style={styles.quickActionButton}
            >
              <View style={styles.quickActionContent}>
                <ThemedText style={[styles.quickActionIcon, { fontSize: 24 }]}>
                  {action.icon}
                </ThemedText>
                <ThemedText type="default" style={styles.quickActionTitle}>
                  {action.title}
                </ThemedText>
                <ThemedText type="caption" style={styles.quickActionDescription}>
                  {action.description}
                </ThemedText>
              </View>
            </Button>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );

  // Render categories
  const renderCategories = () => (
    <Animated.View style={[styles.section, animatedStyle]}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Categories
        </ThemedText>
        <OutlineButton
          title="View All"
          onPress={() => router.push('/(tabs)/explore')}
          size="small"
        />
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant={
              selectedCategory === category.id 
                ? ButtonVariant.PRIMARY 
                : ButtonVariant.OUTLINE
            }
            onPress={() => handleCategoryPress(category)}
            style={styles.categoryButton}
          >
            <View style={styles.categoryContent}>
              <ThemedText style={[styles.categoryIcon, { fontSize: 20 }]}>
                {category.icon}
              </ThemedText>
              <ThemedText type="caption" style={styles.categoryName}>
                {category.name}
              </ThemedText>
            </View>
          </Button>
        ))}
      </ScrollView>
    </Animated.View>
  );

  // Render upcoming bookings
  const renderUpcomingBookings = () => {
    if (!upcomingBookings.length) return null;

    return (
      <Animated.View style={[styles.section, animatedStyle]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Upcoming Bookings
          </ThemedText>
          <OutlineButton
            title="View All"
            onPress={() => router.push('/(bookings)')}
            size="small"
          />
        </View>
        
        <View style={styles.bookingsContainer}>
          {upcomingBookings.slice(0, 2).map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingInfo}>
                <ThemedText type="default" style={styles.bookingService}>
                  {booking.service}
                </ThemedText>
                <ThemedText type="caption" style={styles.bookingProvider}>
                  with {booking.provider}
                </ThemedText>
                <ThemedText type="caption" style={styles.bookingDate}>
                  {new Date(booking.date).toLocaleDateString()} • {new Date(booking.date).toLocaleTimeString()}
                </ThemedText>
              </View>
              
              <View style={styles.bookingActions}>
                <ThemedText type="subtitle" style={styles.bookingPrice}>
                  ${booking.price}
                </ThemedText>
                <View style={[
                  styles.bookingStatus,
                  { backgroundColor: getStatusColor(booking.status) }
                ]}>
                  <ThemedText type="caption" style={styles.bookingStatusText}>
                    {booking.status}
                  </ThemedText>
                </View>
                <OutlineButton
                  title="View"
                  onPress={() => handleBookingPress(booking)}
                  size="xsmall"
                />
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  // Render featured services
  const renderFeaturedServices = () => (
    <Animated.View style={[styles.section, animatedStyle]}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Featured Services
        </ThemedText>
        <OutlineButton
          title="See All"
          onPress={() => router.push('/(services)/search')}
          size="small"
        />
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.servicesContainer}
      >
        {filteredServices.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onPress={() => handleServicePress(service)}
            style={styles.serviceCard}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );

  // Helper functions
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: theme.colors.success + '40',
      pending: theme.colors.warning + '40',
      cancelled: theme.colors.error + '40',
      completed: theme.colors.primary + '40',
    };
    return colors[status] || theme.colors.neutral[200];
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />

      <ParallaxScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        headerBackgroundColor={theme.colors.background}
        headerImage={null}
      >
        {/* Header Section */}
        {renderHeader()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Categories */}
        {renderCategories()}

        {/* Upcoming Bookings */}
        {renderUpcomingBookings()}

        {/* Featured Services */}
        {renderFeaturedServices()}

        {/* Emergency Button */}
        <Animated.View style={[styles.emergencySection, animatedStyle]}>
          <PrimaryButton
            title="🚨 Emergency Assistance"
            onPress={handleEmergencyPress}
            variant={ButtonVariant.DANGER}
            fullWidth
            icon="🚨"
            style={styles.emergencyButton}
          />
        </Animated.View>

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ParallaxScrollView>

      <HapticTab />
    </ThemedView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '300',
    marginBottom: -4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  searchContainer: {
    marginTop: 8,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  quickActionButton: {
    padding: 0,
  },
  quickActionContent: {
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    marginBottom: 8,
  },
  quickActionTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionDescription: {
    textAlign: 'center',
    opacity: 0.7,
  },
  categoriesContainer: {
    paddingRight: 20,
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  categoryContent: {
    alignItems: 'center',
    minWidth: 60,
  },
  categoryIcon: {
    marginBottom: 4,
  },
  categoryName: {
    fontWeight: '500',
  },
  bookingsContainer: {
    gap: 12,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    fontWeight: '600',
    marginBottom: 4,
  },
  bookingProvider: {
    opacity: 0.7,
    marginBottom: 2,
  },
  bookingDate: {
    opacity: 0.5,
  },
  bookingActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  bookingPrice: {
    fontWeight: '700',
  },
  bookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookingStatusText: {
    fontWeight: '500',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  servicesContainer: {
    paddingRight: 20,
    gap: 16,
  },
  serviceCard: {
    width: 280,
  },
  emergencySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  emergencyButton: {
    borderRadius: 12,
  },
  footer: {
    height: 40,
  },
};