import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  Share,
  Dimensions,
  Linking,
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
import Input from '../../components/ui/input';
import Loading from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import Rating from '../../components/ui/rating';
import ServiceCard from '../../components/service/service-card';
import ReviewCard from '../../components/service/review-card';
import { Collapsible } from '../../components/collapsible';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { serviceService } from '../../services/service-service';
import { bookingService } from '../../services/booking-service';
import { favoriteService } from '../../services/favorite-service';

const { width } = Dimensions.get('window');

// Mock service data - replace with API
const MOCK_SERVICE = {
  id: '1',
  title: 'Deep Home Cleaning',
  description: 'Professional deep cleaning service for your entire home. Our trained professionals use eco-friendly products and advanced equipment to leave your space sparkling clean. Perfect for spring cleaning, move-in/move-out, or regular maintenance.',
  longDescription: `Our comprehensive deep cleaning service includes:

• Complete dusting and wiping of all surfaces
• Kitchen deep clean (appliances, cabinets, countertops)
• Bathroom sanitization (tiles, fixtures, mirrors)
• Floor cleaning and mopping
• Window and mirror cleaning
• Furniture dusting and polishing
• Baseboard and trim cleaning
• Light fixture cleaning
• Interior window cleaning
• Cabinet exterior cleaning

We use environmentally friendly cleaning products that are safe for children and pets. Our team brings all necessary equipment and supplies.`,
  price: 89,
  originalPrice: 120,
  duration: 3, // hours
  category: 'cleaning',
  subcategory: 'deep_cleaning',
  tags: ['Eco-friendly', 'Same Day', '5 Star', 'Pet Friendly', 'Green Products'],
  images: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
    'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
  ],
  rating: 4.8,
  reviewCount: 247,
  isAvailable: true,
  isFavorite: false,
  isFeatured: true,
  provider: {
    id: '1',
    name: 'SparkleClean Pro',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
    rating: 4.9,
    reviewCount: 512,
    verified: true,
    isOnline: true,
    responseTime: 'Within 15 minutes',
    joinedDate: '2022-03-15T00:00:00Z',
    description: 'Professional cleaning service with 5 years of experience. We specialize in eco-friendly cleaning solutions for homes and offices.',
    servicesCount: 3,
    completedJobs: 1247,
  },
  location: {
    address: 'Serves New York, NY and surrounding areas',
    distance: 2.3,
    city: 'New York',
    zipCode: '10001',
  },
  availability: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    hours: '8:00 AM - 8:00 PM',
    sameDay: true,
    emergency: true,
  },
  requirements: [
    'Provide access to water source',
    'Clear walking paths in rooms',
    'Secure pets if possible',
  ],
  includes: [
    'All cleaning supplies and equipment',
    'Eco-friendly cleaning products',
    'Professional cleaning team',
    'Quality guarantee',
    'Insurance coverage',
  ],
  reviews: [
    {
      id: '1',
      user: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786',
      },
      rating: 5,
      comment: 'Amazing service! The team was professional, thorough, and left my apartment sparkling clean. Will definitely book again!',
      date: '2024-01-10T14:30:00Z',
      helpful: 12,
    },
    {
      id: '2',
      user: {
        name: 'Mike Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      },
      rating: 4,
      comment: 'Great deep cleaning service. They paid attention to details I usually miss. Only minor issue was they were 15 minutes late.',
      date: '2024-01-08T09:15:00Z',
      helpful: 8,
    },
    {
      id: '3',
      user: {
        name: 'Emily Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
      },
      rating: 5,
      comment: 'Absolutely worth every penny! My home has never been cleaner. The eco-friendly products are a huge plus for my family.',
      date: '2024-01-05T16:45:00Z',
      helpful: 15,
    },
  ],
  similarServices: [
    {
      id: '2',
      title: 'Regular Home Cleaning',
      description: 'Standard cleaning service for maintained homes',
      price: 65,
      rating: 4.7,
      reviewCount: 189,
      category: 'cleaning',
      image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6',
      isFavorite: false,
      provider: {
        name: 'SparkleClean Pro',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
        verified: true,
      },
    },
    {
      id: '3',
      title: 'Office Cleaning',
      description: 'Commercial cleaning for offices and workspaces',
      price: 150,
      rating: 4.9,
      reviewCount: 94,
      category: 'cleaning',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
      isFavorite: true,
      provider: {
        name: 'CleanWorks',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        verified: true,
      },
    },
  ],
  createdAt: '2023-08-15T00:00:00Z',
  updatedAt: '2024-01-12T00:00:00Z',
};

export default function ServiceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [service, setService] = useState(MOCK_SERVICE);
  const [isFavorite, setIsFavorite] = useState(MOCK_SERVICE.isFavorite);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAllDescription, setShowAllDescription] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'reviews', 'provider'

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const imageAnim = useRef(new Animated.Value(0)).current;
  const favoriteAnim = useRef(new Animated.Value(isFavorite ? 1 : 0)).current;

  // Load service data
  useEffect(() => {
    loadServiceData();
    startAnimations();
    
    // Track service view
    analyticsService.trackEvent('service_view', {
      service_id: id,
      service_title: service.title,
      category: service.category,
    });
  }, [id]);

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
      Animated.timing(imageAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Favorite animation
  useEffect(() => {
    Animated.spring(favoriteAnim, {
      toValue: isFavorite ? 1 : 0,
      duration: 400,
      easing: Easing.elastic(1.2),
      useNativeDriver: true,
    }).start();
  }, [isFavorite]);

  // Load service data
  const loadServiceData = async () => {
    try {
      const serviceData = await serviceService.getServiceById(id);
      setService(serviceData);
      setIsFavorite(serviceData.isFavorite);
    } catch (error) {
      console.error('Error loading service:', error);
      errorService.captureError(error, { 
        context: 'ServiceDetails',
        service_id: id,
      });
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadServiceData();
      analyticsService.trackEvent('service_refresh', { service_id: id });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  // Action handlers
  const handleBookService = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to book this service.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => router.push('/(auth)/login') 
          },
        ]
      );
      return;
    }

    analyticsService.trackEvent('service_book_start', {
      service_id: service.id,
      service_title: service.title,
      price: service.price,
    });

    router.push({
      pathname: '/(services)/booking',
      params: { serviceId: service.id },
    });
  };

  const handleToggleFavorite = async () => {
    try {
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);

      if (newFavoriteState) {
        await favoriteService.addToFavorites(service.id);
        analyticsService.trackEvent('service_favorite_add', {
          service_id: service.id,
          category: service.category,
        });
      } else {
        await favoriteService.removeFromFavorites(service.id);
        analyticsService.trackEvent('service_favorite_remove', {
          service_id: service.id,
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setIsFavorite(!isFavorite);
    }
  };

  const handleShareService = async () => {
    try {
      const shareUrl = `https://yachi.app/services/${service.id}`;
      await Share.share({
        message: `Check out "${service.title}" on Yachi - ${service.description}`,
        url: shareUrl,
        title: service.title,
      });

      analyticsService.trackEvent('service_share', {
        service_id: service.id,
        method: 'native_share',
      });
    } catch (error) {
      console.error('Error sharing service:', error);
    }
  };

  const handleContactProvider = () => {
    analyticsService.trackEvent('provider_contact', {
      service_id: service.id,
      provider_id: service.provider.id,
    });

    router.push({
      pathname: '/(messages)/conversation',
      params: { providerId: service.provider.id },
    });
  };

  const handleViewProviderProfile = () => {
    analyticsService.trackEvent('provider_profile_view', {
      provider_id: service.provider.id,
      from_service: service.id,
    });

    router.push({
      pathname: '/(services)/provider',
      params: { id: service.provider.id },
    });
  };

  const handleCallProvider = () => {
    analyticsService.trackEvent('provider_call', {
      provider_id: service.provider.id,
    });

    // In a real app, you'd have the provider's phone number
    Alert.alert(
      'Contact Provider',
      'This would call the service provider in a real application.',
      [{ text: 'OK' }]
    );
  };

  const handleReportService = () => {
    Alert.alert(
      'Report Service',
      'Please select a reason for reporting this service:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
        { text: 'False Information', onPress: () => submitReport('false_info') },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Other', onPress: () => submitReport('other') },
      ]
    );
  };

  const submitReport = (reason) => {
    analyticsService.trackEvent('service_report', {
      service_id: service.id,
      reason: reason,
    });
    Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
  };

  const handleImagePress = (index) => {
    setSelectedImageIndex(index);
    // In a real app, you might open a full-screen image viewer
  };

  // Render image gallery
  const renderImageGallery = () => (
    <Animated.View 
      style={[
        styles.imageSection,
        { opacity: imageAnim, transform: [{ scale: imageAnim }] },
      ]}
    >
      <View style={styles.mainImageContainer}>
        <Image
          source={{ uri: service.images[selectedImageIndex] }}
          style={styles.mainImage}
          resizeMode="cover"
        />
        
        {/* Image indicators */}
        <View style={styles.imageIndicators}>
          {service.images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.imageIndicator,
                selectedImageIndex === index && [
                  styles.imageIndicatorActive,
                  { backgroundColor: theme.colors.primary },
                ],
              ]}
            />
          ))}
        </View>

        {/* Favorite button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleToggleFavorite}
        >
          <Animated.View
            style={{
              transform: [
                {
                  scale: favoriteAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            }}
          >
            <ThemedText style={styles.favoriteIcon}>
              {isFavorite ? '❤️' : '🤍'}
            </ThemedText>
          </Animated.View>
        </TouchableOpacity>

        {/* Share button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareService}
        >
          <ThemedText style={styles.shareIcon}>📤</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Thumbnail gallery */}
      {service.images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailContainer}
        >
          {service.images.map((image, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.thumbnail,
                selectedImageIndex === index && [
                  styles.thumbnailActive,
                  { borderColor: theme.colors.primary },
                ],
              ]}
              onPress={() => handleImagePress(index)}
            >
              <Image
                source={{ uri: image }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );

  // Render service header
  const renderServiceHeader = () => (
    <Animated.View 
      style={[
        styles.headerSection,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <ThemedText type="title" style={styles.serviceTitle}>
        {service.title}
      </ThemedText>
      
      <View style={styles.ratingContainer}>
        <Rating rating={service.rating} size={20} />
        <ThemedText type="default" style={styles.ratingText}>
          {service.rating} ({service.reviewCount} reviews)
        </ThemedText>
      </View>

      <View style={styles.priceContainer}>
        <ThemedText type="title" style={styles.currentPrice}>
          ${service.price}
        </ThemedText>
        {service.originalPrice && (
          <ThemedText type="caption" style={styles.originalPrice}>
            ${service.originalPrice}
          </ThemedText>
        )}
        <ThemedText type="caption" style={styles.duration}>
          • {service.duration} hours
        </ThemedText>
      </View>

      {/* Tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagsContainer}
      >
        {service.tags.map((tag, index) => (
          <View
            key={index}
            style={[
              styles.tag,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <ThemedText type="caption" style={styles.tagText}>
              {tag}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );

  // Render action buttons
  const renderActionButtons = () => (
    <Animated.View 
      style={[
        styles.actionSection,
        { opacity: fadeAnim },
      ]}
    >
      <PrimaryButton
        title="Book Now"
        onPress={handleBookService}
        icon="📅"
        fullWidth
        style={styles.bookButton}
        disabled={!service.isAvailable}
      />
      
      {!service.isAvailable && (
        <ThemedText type="caption" style={styles.unavailableText}>
          Currently unavailable
        </ThemedText>
      )}

      <View style={styles.secondaryActions}>
        <OutlineButton
          title="Message Provider"
          onPress={handleContactProvider}
          icon="💬"
          style={styles.secondaryButton}
        />
        <OutlineButton
          title="Save"
          onPress={handleToggleFavorite}
          icon={isFavorite ? '❤️' : '🤍'}
          style={styles.secondaryButton}
        />
      </View>
    </Animated.View>
  );

  // Render provider info
  const renderProviderInfo = () => (
    <TouchableOpacity 
      style={styles.providerSection}
      onPress={handleViewProviderProfile}
    >
      <View style={styles.providerHeader}>
        <Image
          source={{ uri: service.provider.avatar }}
          style={styles.providerAvatar}
        />
        <View style={styles.providerInfo}>
          <ThemedText type="subtitle" style={styles.providerName}>
            {service.provider.name}
          </ThemedText>
          <View style={styles.providerStats}>
            <Rating rating={service.provider.rating} size={16} />
            <ThemedText type="caption" style={styles.providerRating}>
              {service.provider.rating} ({service.provider.reviewCount} reviews)
            </ThemedText>
          </View>
          <ThemedText type="caption" style={styles.providerResponse}>
            {service.provider.responseTime}
          </ThemedText>
        </View>
        {service.provider.verified && (
          <View style={styles.verifiedBadge}>
            <ThemedText type="caption" style={styles.verifiedText}>
              ✅ Verified
            </ThemedText>
          </View>
        )}
      </View>
      
      <ThemedText type="caption" style={styles.providerDescription}>
        {service.provider.description}
      </ThemedText>

      <View style={styles.providerMeta}>
        <ThemedText type="caption" style={styles.providerMetaItem}>
          📍 {service.location.address}
        </ThemedText>
        <ThemedText type="caption" style={styles.providerMetaItem}>
          ⚡ {service.provider.completedJobs}+ jobs completed
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  // Render service details
  const renderServiceDetails = () => (
    <View style={styles.detailsSection}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Service Details
      </ThemedText>
      
      <ThemedText type="default" style={styles.serviceDescription}>
        {showAllDescription ? service.longDescription : service.description}
      </ThemedText>
      
      {service.longDescription.length > service.description.length && (
        <TouchableOpacity onPress={() => setShowAllDescription(!showAllDescription)}>
          <ThemedText type="default" style={styles.readMore}>
            {showAllDescription ? 'Read Less' : 'Read More'}
          </ThemedText>
        </TouchableOpacity>
      )}

      {/* What's Included */}
      <View style={styles.includedSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          What's Included
        </ThemedText>
        {service.includes.map((item, index) => (
          <View key={index} style={styles.includedItem}>
            <ThemedText style={styles.checkmark}>✅</ThemedText>
            <ThemedText type="default" style={styles.includedText}>
              {item}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Requirements */}
      <View style={styles.requirementsSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Requirements
        </ThemedText>
        {service.requirements.map((item, index) => (
          <View key={index} style={styles.requirementItem}>
            <ThemedText style={styles.requirementIcon}>📋</ThemedText>
            <ThemedText type="default" style={styles.requirementText}>
              {item}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );

  // Render reviews
  const renderReviews = () => (
    <View style={styles.reviewsSection}>
      <View style={styles.reviewsHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Reviews & Ratings
        </ThemedText>
        <ThemedText type="caption" style={styles.reviewsSummary}>
          {service.rating} out of 5 • {service.reviewCount} reviews
        </ThemedText>
      </View>

      {service.reviews.slice(0, showAllReviews ? undefined : 3).map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          style={styles.reviewCard}
        />
      ))}

      {service.reviews.length > 3 && (
        <TouchableOpacity onPress={() => setShowAllReviews(!showAllReviews)}>
          <ThemedText type="default" style={styles.readMore}>
            {showAllReviews ? 'Show Less Reviews' : `Show All ${service.reviews.length} Reviews`}
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render similar services
  const renderSimilarServices = () => (
    <View style={styles.similarSection}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Similar Services
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.similarContainer}
      >
        {service.similarServices.map((similarService) => (
          <ServiceCard
            key={similarService.id}
            service={similarService}
            onPress={() => router.push(`/(services)/${similarService.id}`)}
            style={styles.similarCard}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: service.title,
          headerShown: true,
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="📤"
                onPress={handleShareService}
                accessibilityLabel="Share Service"
              />
              <IconButton
                icon="⚠️"
                onPress={handleReportService}
                accessibilityLabel="Report Service"
              />
            </View>
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
      >
        {/* Image Gallery */}
        {renderImageGallery()}

        {/* Service Header */}
        {renderServiceHeader()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Provider Info */}
        {renderProviderInfo()}

        {/* Service Details */}
        {renderServiceDetails()}

        {/* Reviews */}
        {renderReviews()}

        {/* Similar Services */}
        {renderSimilarServices()}

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <Animated.View 
        style={[
          styles.bottomBar,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomBarPrice}>
            <ThemedText type="title" style={styles.bottomPrice}>
              ${service.price}
            </ThemedText>
            <ThemedText type="caption" style={styles.bottomDuration}>
              {service.duration} hours
            </ThemedText>
          </View>
          <PrimaryButton
            title="Book Now"
            onPress={handleBookService}
            disabled={!service.isAvailable}
            style={styles.bottomBookButton}
          />
        </View>
      </Animated.View>
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
    paddingBottom: 100, // Space for bottom bar
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  imageSection: {
    marginBottom: 16,
  },
  mainImageContainer: {
    position: 'relative',
    height: 300,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imageIndicatorActive: {
    backgroundColor: '#3B82F6',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
  },
  shareButton: {
    position: 'absolute',
    top: 70,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 20,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 28,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ratingText: {
    opacity: 0.8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3B82F6',
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  duration: {
    opacity: 0.7,
  },
  tagsContainer: {
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  bookButton: {
    marginBottom: 8,
  },
  unavailableText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
  },
  providerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  providerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  providerRating: {
    opacity: 0.7,
  },
  providerResponse: {
    opacity: 0.7,
  },
  verifiedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 10,
  },
  providerDescription: {
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 12,
  },
  providerMeta: {
    gap: 4,
  },
  providerMetaItem: {
    opacity: 0.7,
  },
  detailsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  serviceDescription: {
    lineHeight: 20,
    marginBottom: 8,
  },
  readMore: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  includedSection: {
    marginTop: 16,
  },
  includedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  checkmark: {
    fontSize: 16,
  },
  includedText: {
    flex: 1,
    lineHeight: 18,
  },
  requirementsSection: {
    marginTop: 16,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  requirementIcon: {
    fontSize: 16,
  },
  requirementText: {
    flex: 1,
    lineHeight: 18,
  },
  reviewsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  reviewsHeader: {
    marginBottom: 16,
  },
  reviewsSummary: {
    opacity: 0.7,
  },
  reviewCard: {
    marginBottom: 16,
  },
  similarSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  similarContainer: {
    gap: 16,
  },
  similarCard: {
    width: 280,
  },
  footer: {
    height: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBarPrice: {
    flex: 1,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  bottomDuration: {
    opacity: 0.7,
  },
  bottomBookButton: {
    flex: 1,
    marginLeft: 16,
    maxWidth: 200,
  },
};