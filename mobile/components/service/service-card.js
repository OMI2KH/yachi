// components/service/service-card.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Dimensions,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  Star,
  Heart,
  Share2,
  MapPin,
  Clock,
  Calendar,
  Award,
  Shield,
  Crown,
  Zap,
  TrendingUp,
  Users,
  Eye,
  Bookmark,
  CheckCircle,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { usePremium } from '../../contexts/premium-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';
import { PremiumBadge } from '../premium/premium-badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Service Card Component
 * Features: Multi-service types, Ethiopian market focus, AI recommendations, premium features
 */

// Service categories with Ethiopian market focus
const SERVICE_CATEGORIES = {
  construction: {
    label: 'Construction',
    icon: Award,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
  plumbing: {
    label: 'Plumbing',
    icon: Zap,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
  },
  electrical: {
    label: 'Electrical',
    icon: TrendingUp,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
  cleaning: {
    label: 'Cleaning',
    icon: Sparkles,
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  carpentry: {
    label: 'Carpentry',
    icon: Award,
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  painting: {
    label: 'Painting',
    icon: Award,
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777'],
  },
  gardening: {
    label: 'Gardening',
    icon: Award,
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  government: {
    label: 'Government',
    icon: Shield,
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
  },
};

const ServiceCard = ({
  service,
  variant = 'default', // 'default', 'compact', 'featured', 'premium'
  onPress,
  onBookPress,
  onSharePress,
  onBookmarkPress,
  onProviderPress,
  enableAIRecommendations = true,
  enableSocialFeatures = true,
  enableAnalytics = true,
  showBookmark = true,
  showShare = true,
  style,
  testID = 'service-card',
}) => {
  const { theme, colors } = useTheme();
  const { user: currentUser } = useAuth();
  const { isUserPremium } = usePremium();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(service?.userBookmarked || false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Enhanced service data with Ethiopian market focus
  const serviceData = useMemo(() => ({
    id: service?.id || '',
    title: service?.title || 'ያልታወቀ አገልግሎት',
    description: service?.description || '',
    category: service?.category || 'general',
    price: service?.price || 0,
    originalPrice: service?.originalPrice,
    currency: service?.currency || 'ETB',
    images: service?.images || [],
    provider: service?.provider || {
      id: '',
      name: 'ያልታወቀ አቅራቢ',
      avatar: '',
      verified: false,
      premium: false,
    },
    rating: service?.rating || 0,
    reviewCount: service?.reviewCount || 0,
    completedJobs: service?.completedJobs || 0,
    deliveryTime: service?.deliveryTime || '1-2 days',
    location: service?.location || 'Addis Ababa, Ethiopia',
    distance: service?.distance,
    featured: service?.featured || false,
    premium: service?.premium || false,
    government: service?.government || false,
    aiRecommended: service?.aiRecommended || false,
    tags: service?.tags || [],
    availability: service?.availability || 'available',
    createdAt: service?.createdAt || new Date().toISOString(),
    stats: service?.stats || {
      views: 0,
      clicks: 0,
      conversions: 0,
    },
  }), [service]);

  // Enhanced category configuration
  const categoryConfig = useMemo(() => {
    return SERVICE_CATEGORIES[serviceData.category] || SERVICE_CATEGORIES.construction;
  }, [serviceData.category]);

  // Enhanced animations
  React.useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation for featured/premium services
    if (serviceData.featured || serviceData.premium) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Animated.Easing.inOut(Animated.Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            easing: Animated.Easing.inOut(Animated.Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [serviceData.featured, serviceData.premium]);

  // Calculate discount percentage
  const discountPercentage = useMemo(() => {
    if (!serviceData.originalPrice || serviceData.originalPrice <= serviceData.price) return null;
    return Math.round(((serviceData.originalPrice - serviceData.price) / serviceData.originalPrice) * 100);
  }, [serviceData.originalPrice, serviceData.price]);

  // Enhanced press handlers
  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onPress) {
      onPress(serviceData);
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackServiceView(serviceData.id, currentUser.id);
    }
  }, [serviceData, onPress, enableAnalytics, currentUser]);

  const handleBookPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (onBookPress) {
      onBookPress(serviceData);
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackServiceBooking(serviceData.id, currentUser.id);
    }
  }, [serviceData, onBookPress, enableAnalytics, currentUser]);

  const handleBookmarkPress = useCallback(async () => {
    if (!currentUser) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save services',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);
    
    if (onBookmarkPress) {
      await onBookmarkPress(serviceData.id, newBookmarkState);
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackServiceBookmark(serviceData.id, newBookmarkState, currentUser.id);
    }
  }, [isBookmarked, serviceData.id, onBookmarkPress, enableAnalytics, currentUser]);

  const handleSharePress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const shareUrl = `https://yachi.et/services/${serviceData.id}`;
      const message = `ይህን አገልግሎት በያቺ ይመልከቱ: ${serviceData.title} - ${serviceData.description} ${shareUrl}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: serviceData.title,
            text: message,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          Alert.alert('ተገልጧል', 'የአገልግሎት አገናኝ ተገልጧል');
        }
      } else {
        await Share.share({
          message,
          url: shareUrl,
          title: serviceData.title,
        });
      }
      
      if (onSharePress) {
        onSharePress(serviceData);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [serviceData, onSharePress]);

  const handleProviderPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onProviderPress) {
      onProviderPress(serviceData.provider.id);
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackProviderView(serviceData.provider.id, currentUser.id);
    }
  }, [serviceData.provider.id, onProviderPress, enableAnalytics, currentUser]);

  // Enhanced price formatting for Ethiopian market
  const formatPrice = useCallback((price) => {
    return new Intl.NumberFormat('et-ET', {
      style: 'currency',
      currency: serviceData.currency,
      minimumFractionDigits: 0,
    }).format(price);
  }, [serviceData.currency]);

  // Render service image with overlays
  const renderImage = useCallback(() => {
    const glowOpacity = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.imageContainer}>
        {/* Main Image */}
        <Pressable onPress={handlePress}>
          <Animated.View 
            style={[
              styles.imageWrapper,
              {
                shadowOpacity: glowOpacity,
                shadowColor: serviceData.featured ? '#F59E0B' : serviceData.premium ? '#8B5CF6' : 'transparent',
              }
            ]}
          >
            {serviceData.images?.[0] ? (
              <Image
                source={{ uri: serviceData.images[0] }}
                style={styles.serviceImage}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <LinearGradient
                colors={categoryConfig.gradient}
                style={styles.serviceImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <categoryConfig.icon size={32} color="#FFFFFF" />
              </LinearGradient>
            )}

            {/* Loading Skeleton */}
            {!imageLoaded && serviceData.images?.[0] && (
              <View style={styles.imageSkeleton} />
            )}

            {/* Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={styles.imageGradient}
            />
          </Animated.View>
        </Pressable>

        {/* Top Badges */}
        <View style={styles.topBadges}>
          {/* Featured Badge */}
          {serviceData.featured && (
            <View style={[styles.featuredBadge, { backgroundColor: '#F59E0B' }]}>
              <Award size={12} color="#FFFFFF" />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}

          {/* Premium Badge */}
          {serviceData.premium && (
            <View style={[styles.premiumBadge, { backgroundColor: '#8B5CF6' }]}>
              <Crown size={12} color="#FFFFFF" />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}

          {/* Government Badge */}
          {serviceData.government && (
            <View style={[styles.governmentBadge, { backgroundColor: '#EF4444' }]}>
              <Shield size={12} color="#FFFFFF" />
              <Text style={styles.governmentBadgeText}>Government</Text>
            </View>
          )}

          {/* AI Recommended Badge */}
          {serviceData.aiRecommended && enableAIRecommendations && (
            <View style={[styles.aiBadge, { backgroundColor: '#10B981' }]}>
              <Zap size={12} color="#FFFFFF" />
              <Text style={styles.aiBadgeText}>AI Recommended</Text>
            </View>
          )}

          {/* Discount Badge */}
          {discountPercentage && (
            <View style={[styles.discountBadge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.discountBadgeText}>{discountPercentage}% OFF</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.imageActions}>
          {showBookmark && (
            <Pressable
              style={styles.actionButton}
              onPress={handleBookmarkPress}
            >
              <BlurView intensity={80} style={styles.actionButtonBlur}>
                <Heart 
                  size={16} 
                  color={isBookmarked ? '#EF4444' : '#FFFFFF'} 
                  fill={isBookmarked ? '#EF4444' : 'transparent'}
                />
              </BlurView>
            </Pressable>
          )}

          {showShare && (
            <Pressable
              style={styles.actionButton}
              onPress={handleSharePress}
            >
              <BlurView intensity={80} style={styles.actionButtonBlur}>
                <Share2 size={16} color="#FFFFFF" />
              </BlurView>
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [
    serviceData,
    categoryConfig,
    imageLoaded,
    discountPercentage,
    isBookmarked,
    showBookmark,
    showShare,
    handlePress,
    handleBookmarkPress,
    handleSharePress,
    glowAnim,
  ]);

  // Render service info
  const renderServiceInfo = useCallback(() => {
    const CategoryIcon = categoryConfig.icon;

    return (
      <View style={styles.serviceInfo}>
        {/* Category and Provider */}
        <View style={styles.serviceHeader}>
          <View style={[styles.categoryTag, { backgroundColor: categoryConfig.color + '20' }]}>
            <CategoryIcon size={12} color={categoryConfig.color} />
            <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
              {categoryConfig.label}
            </Text>
          </View>

          <Pressable style={styles.providerInfo} onPress={handleProviderPress}>
            {serviceData.provider.avatar ? (
              <Image
                source={{ uri: serviceData.provider.avatar }}
                style={styles.providerAvatar}
              />
            ) : (
              <View style={[styles.providerAvatar, { backgroundColor: colors.primary }]}>
                <Users size={12} color="#FFFFFF" />
              </View>
            )}
            <Text style={[styles.providerName, { color: colors.textSecondary }]} numberOfLines={1}>
              {serviceData.provider.name}
            </Text>
            {serviceData.provider.verified && (
              <CheckCircle size={12} color={colors.success} />
            )}
            {serviceData.provider.premium && (
              <Crown size={12} color={colors.warning} />
            )}
          </Pressable>
        </View>

        {/* Title and Description */}
        <Pressable onPress={handlePress}>
          <Text style={[styles.serviceTitle, { color: colors.text }]} numberOfLines={2}>
            {serviceData.title}
          </Text>
          <Text style={[styles.serviceDescription, { color: colors.textSecondary }]} numberOfLines={variant === 'compact' ? 1 : 2}>
            {serviceData.description}
          </Text>
        </Pressable>

        {/* Rating and Location */}
        <View style={styles.serviceMeta}>
          <View style={styles.ratingContainer}>
            <Star size={14} color={colors.warning} fill={colors.warning} />
            <Text style={[styles.ratingText, { color: colors.text }]}>
              {serviceData.rating.toFixed(1)}
            </Text>
            <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
              ({serviceData.reviewCount})
            </Text>
          </View>

          <View style={styles.locationContainer}>
            <MapPin size={12} color={colors.textTertiary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {serviceData.distance ? `${serviceData.distance}km` : serviceData.location}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        {variant !== 'compact' && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <CheckCircle size={12} color={colors.success} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {serviceData.completedJobs} completed
              </Text>
            </View>
            <View style={styles.stat}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {serviceData.deliveryTime}
              </Text>
            </View>
            {serviceData.stats.views > 0 && (
              <View style={styles.stat}>
                <Eye size={12} color={colors.textTertiary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {serviceData.stats.views}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {serviceData.tags.length > 0 && variant !== 'compact' && (
          <View style={styles.tagsContainer}>
            {serviceData.tags.slice(0, 3).map((tag, index) => (
              <View
                key={index}
                style={[styles.tag, { backgroundColor: colors.primary + '15' }]}
              >
                <Text style={[styles.tagText, { color: colors.primary }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }, [serviceData, categoryConfig, colors, variant, handlePress, handleProviderPress]);

  // Render price and action section
  const renderPriceAction = useCallback(() => {
    return (
      <View style={styles.priceActionSection}>
        {/* Price */}
        <View style={styles.priceContainer}>
          {serviceData.originalPrice && (
            <Text style={[styles.originalPrice, { color: colors.textTertiary }]}>
              {formatPrice(serviceData.originalPrice)}
            </Text>
          )}
          <Text style={[styles.currentPrice, { color: colors.primary }]}>
            {formatPrice(serviceData.price)}
          </Text>
          <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>
            /service
          </Text>
        </View>

        {/* Book Button */}
        <Button
          title="Book Now"
          onPress={handleBookPress}
          variant="primary"
          size="small"
          icon={Calendar}
          loading={isLoading}
          style={styles.bookButton}
        />
      </View>
    );
  }, [serviceData, colors, formatPrice, handleBookPress, isLoading]);

  // Compact variant
  if (variant === 'compact') {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            backgroundColor: colors.card,
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          },
          style,
        ]}
        testID={testID}
      >
        <Pressable
          style={styles.compactContent}
          onPress={handlePress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
        >
          {/* Image */}
          <View style={styles.compactImageContainer}>
            {serviceData.images?.[0] ? (
              <Image
                source={{ uri: serviceData.images[0] }}
                style={styles.compactImage}
              />
            ) : (
              <LinearGradient
                colors={categoryConfig.gradient}
                style={styles.compactImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <categoryConfig.icon size={20} color="#FFFFFF" />
              </LinearGradient>
            )}
            
            {/* Premium Badge */}
            {serviceData.premium && (
              <View style={styles.compactPremiumBadge}>
                <Crown size={10} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.compactInfo}>
            <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>
              {serviceData.title}
            </Text>
            <Text style={[styles.compactPrice, { color: colors.primary }]}>
              {formatPrice(serviceData.price)}
            </Text>
            <View style={styles.compactMeta}>
              <View style={styles.compactRating}>
                <Star size={12} color={colors.warning} fill={colors.warning} />
                <Text style={[styles.compactRatingText, { color: colors.text }]}>
                  {serviceData.rating.toFixed(1)}
                </Text>
              </View>
              <Text style={[styles.compactProvider, { color: colors.textSecondary }]} numberOfLines={1}>
                {serviceData.provider.name}
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // Default/featured variant
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
        },
        serviceData.featured && styles.featuredContainer,
        serviceData.premium && styles.premiumContainer,
        style,
      ]}
      testID={testID}
    >
      {/* Service Image */}
      {renderImage()}

      {/* Service Info */}
      {renderServiceInfo()}

      {/* Price and Action */}
      {renderPriceAction()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  featuredContainer: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
  },
  premiumContainer: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
  },
  compactContainer: {
    borderRadius: 12,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: (SCREEN_WIDTH - 48) / 2,
  },
  compactContent: {
    padding: 12,
  },
  compactImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  compactImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactPremiumBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 6,
    padding: 2,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  compactPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  compactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compactRatingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactProvider: {
    fontSize: 10,
    flex: 1,
    textAlign: 'right',
    marginLeft: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  imageSkeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F3F4F6',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  governmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  governmentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  imageActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '50%',
  },
  providerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 12,
    fontWeight: '500',
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
  },
  serviceDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  priceActionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flex: 1,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginRight: 4,
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 12,
  },
  bookButton: {
    minWidth: 120,
  },
});

export default React.memo(ServiceCard);
export { SERVICE_CATEGORIES };