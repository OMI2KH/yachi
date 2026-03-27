// components/premium/featured-listing.js

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { analyticsService } from '../../services/analytics-service';

const SCREEN = Dimensions.get('window');

const FEATURED_LISTING_CONFIG = {
  BADGE_TYPES: {
    FEATURED: {
      label: 'FEATURED',
      color: '#F59E0B',
      icon: 'star',
      gradient: ['#F59E0B', '#D97706']
    },
    PREMIUM: {
      label: 'PREMIUM',
      color: '#10B981',
      icon: 'diamond',
      gradient: ['#10B981', '#059669']
    },
    TRENDING: {
      label: 'TRENDING',
      color: '#EC4899',
      icon: 'trending-up',
      gradient: ['#EC4899', '#DB2777']
    },
    VERIFIED: {
      label: 'VERIFIED',
      color: '#3B82F6',
      icon: 'verified',
      gradient: ['#3B82F6', '#2563EB']
    }
  },
  ANIMATION: {
    ENTRANCE_DURATION: 800,
    STAGGER_DELAY: 100,
    PULSE_DURATION: 2000
  },
  FEATURES: {
    PRIORITY_PLACEMENT: 'priority_placement',
    HIGHLIGHTED_DESIGN: 'highlighted_design',
    VERIFIED_BADGE: 'verified_badge',
    ANALYTICS_ACCESS: 'analytics_access',
    PREMIUM_SUPPORT: 'premium_support'
  }
};

const FeaturedListing = ({
  listing = null,
  variant = 'default', // 'default', 'compact', 'minimal', 'highlight'
  showActions = true,
  showStats = true,
  showFeatures = true,
  onPress = null,
  onContact = null,
  onBook = null,
  onUpgrade = null,
  isInteractive = true,
  autoAnimate = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const { user } = useStore();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Default listing data
  const defaultListing = useMemo(() => ({
    id: `listing_${Date.now()}`,
    title: 'Professional Service',
    description: 'High-quality service with excellent customer satisfaction',
    category: 'General Services',
    price: 150,
    currency: 'ETB',
    rating: 4.8,
    reviewCount: 47,
    location: 'Addis Ababa',
    provider: {
      name: 'Professional Provider',
      avatar: null,
      isVerified: true,
      isPremium: true
    },
    images: [],
    features: [
      'Fast service delivery',
      'Quality guaranteed',
      'Professional team',
      'Affordable pricing'
    ],
    stats: {
      views: 1247,
      bookings: 89,
      completion: 98
    },
    badges: ['featured'],
    isFeatured: true,
    featuredUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    promotion: {
      type: 'featured_listing',
      expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  }), []);

  const listingData = useMemo(() => ({
    ...defaultListing,
    ...listing
  }), [listing, defaultListing]);

  // Animation sequences
  const animateEntrance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FEATURED_LISTING_CONFIG.ANIMATION.ENTRANCE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: FEATURED_LISTING_CONFIG.ANIMATION.ENTRANCE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: FEATURED_LISTING_CONFIG.ANIMATION.ENTRANCE_DURATION,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation for featured listings
    if (listingData.isFeatured) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: FEATURED_LISTING_CONFIG.ANIMATION.PULSE_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: FEATURED_LISTING_CONFIG.ANIMATION.PULSE_DURATION,
            useNativeDriver: true,
          })
        ])
      ).start();
    }

    // Rotate animation for premium badge
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, [listingData.isFeatured]);

  React.useEffect(() => {
    if (autoAnimate) {
      animateEntrance();
    }
  }, [autoAnimate]);

  const handlePress = () => {
    if (!isInteractive) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (variant === 'compact' || variant === 'minimal') {
      onPress?.(listingData);
    } else {
      setIsExpanded(!isExpanded);
      onPress?.(listingData);
    }
  };

  const handleContact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContact?.(listingData);
    
    analyticsService.trackEvent('featured_listing_contact', {
      listingId: listingData.id,
      providerId: listingData.provider?.id,
      userId: user?.id
    });
  };

  const handleBook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBook?.(listingData);
    
    analyticsService.trackEvent('featured_listing_book', {
      listingId: listingData.id,
      providerId: listingData.provider?.id,
      userId: user?.id
    });
  };

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onUpgrade?.(listingData);
    
    analyticsService.trackEvent('featured_listing_upgrade_click', {
      listingId: listingData.id,
      userId: user?.id
    });
  };

  const getBadgeConfig = (badgeType) => {
    return FEATURED_LISTING_CONFIG.BADGE_TYPES[badgeType.toUpperCase()] || 
           FEATURED_LISTING_CONFIG.BADGE_TYPES.FEATURED;
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const getDaysRemaining = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const renderBadges = () => {
    if (!listingData.badges || listingData.badges.length === 0) return null;

    return (
      <View style={styles.badgesContainer}>
        {listingData.badges.map((badge, index) => {
          const config = getBadgeConfig(badge);
          return (
            <Animated.View
              key={badge}
              style={[
                styles.badge,
                {
                  backgroundColor: config.color,
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.1]
                      })
                    }
                  ]
                }
              ]}
            >
              <Ionicons name={config.icon} size={10} color="#FFFFFF" />
              <Text style={styles.badgeText}>{config.label}</Text>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderProviderInfo = () => (
    <View style={styles.providerSection}>
      <View style={styles.providerInfo}>
        <View style={styles.avatarContainer}>
          {listingData.provider?.avatar ? (
            <Image
              source={{ uri: listingData.provider.avatar }}
              style={styles.avatar}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color="#6B7280" />
            </View>
          )}
          {listingData.provider?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={8} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        <View style={styles.providerDetails}>
          <Text style={styles.providerName} numberOfLines={1}>
            {listingData.provider?.name}
          </Text>
          <Text style={styles.providerCategory} numberOfLines={1}>
            {listingData.category}
          </Text>
        </View>
      </View>

      {listingData.provider?.isPremium && (
        <Animated.View
          style={[
            styles.premiumBadge,
            {
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }
              ]
            }
          ]}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.premiumBadgeGradient}
          >
            <Ionicons name="diamond" size={12} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsSection}>
      <View style={styles.statItem}>
        <Ionicons name="eye" size={16} color="#6B7280" />
        <Text style={styles.statValue}>{formatNumber(listingData.stats?.views || 0)}</Text>
        <Text style={styles.statLabel}>Views</Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Ionicons name="calendar" size={16} color="#6B7280" />
        <Text style={styles.statValue}>{formatNumber(listingData.stats?.bookings || 0)}</Text>
        <Text style={styles.statLabel}>Bookings</Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Ionicons name="checkmark-circle" size={16} color="#6B7280" />
        <Text style={styles.statValue}>{listingData.stats?.completion || 0}%</Text>
        <Text style={styles.statLabel}>Rate</Text>
      </View>
    </View>
  );

  const renderRating = () => (
    <View style={styles.ratingSection}>
      <View style={styles.ratingStars}>
        <Ionicons name="star" size={16} color="#F59E0B" />
        <Text style={styles.ratingValue}>{listingData.rating}</Text>
        <Text style={styles.ratingCount}>({listingData.reviewCount})</Text>
      </View>
      <Text style={styles.location}>
        <Ionicons name="location" size={12} color="#6B7280" />
        {listingData.location}
      </Text>
    </View>
  );

  const renderFeatures = () => (
    <View style={styles.featuresSection}>
      <Text style={styles.featuresTitle}>Service Features</Text>
      <View style={styles.featuresGrid}>
        {listingData.features?.slice(0, 4).map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderPromotionInfo = () => {
    if (!listingData.isFeatured) return null;

    const daysRemaining = getDaysRemaining(listingData.featuredUntil);
    
    return (
      <View style={styles.promotionSection}>
        <LinearGradient
          colors={['#FFFBEB', '#FEF3C7']}
          style={styles.promotionBanner}
        >
          <Ionicons name="flash" size={16} color="#D97706" />
          <Text style={styles.promotionText}>
            Featured Listing • {daysRemaining} days remaining
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.actionsSection}>
      <TouchableOpacity
        style={styles.contactButton}
        onPress={handleContact}
      >
        <Ionicons name="chatbubble-ellipses" size={18} color="#6B7280" />
        <Text style={styles.contactButtonText}>Message</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.bookButton}
        onPress={handleBook}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.bookButtonGradient}
        >
          <Ionicons name="calendar" size={18} color="#FFFFFF" />
          <Text style={styles.bookButtonText}>Book Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderUpgradeCta = () => (
    <TouchableOpacity
      style={styles.upgradeCta}
      onPress={handleUpgrade}
    >
      <LinearGradient
        colors={['#F0FDF4', '#ECFDF5']}
        style={styles.upgradeCtaGradient}
      >
        <View style={styles.upgradeContent}>
          <View style={styles.upgradeIcon}>
            <Ionicons name="rocket" size={20} color="#10B981" />
          </View>
          <View style={styles.upgradeText}>
            <Text style={styles.upgradeTitle}>Get Featured</Text>
            <Text style={styles.upgradeDescription}>
              Boost your visibility with Premium Listing
            </Text>
          </View>
          <View style={styles.upgradePrice}>
            <Text style={styles.upgradePriceText}>399 ETB</Text>
            <Text style={styles.upgradeDuration}>/month</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Compact variant
  if (variant === 'compact') {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.compactContent}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {renderProviderInfo()}
          
          <Text style={styles.compactTitle} numberOfLines={2}>
            {listingData.title}
          </Text>
          
          {renderRating()}
          
          <View style={styles.compactFooter}>
            <Text style={styles.compactPrice}>
              {listingData.price} {listingData.currency}
            </Text>
            {renderBadges()}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <Animated.View
        style={[
          styles.minimalContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.minimalContent}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View style={styles.minimalHeader}>
            <Text style={styles.minimalTitle} numberOfLines={1}>
              {listingData.title}
            </Text>
            <Text style={styles.minimalPrice}>
              {listingData.price} {listingData.currency}
            </Text>
          </View>
          <Text style={styles.minimalCategory} numberOfLines={1}>
            {listingData.category} • {listingData.location}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Default featured listing
  return (
    <Animated.View
      style={[
        styles.container,
        variant === 'highlight' && styles.highlightContainer,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={!isInteractive}
      >
        {/* Promotion Banner */}
        {renderPromotionInfo()}
        
        {/* Header with Provider Info */}
        {renderProviderInfo()}
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title} numberOfLines={2}>
            {listingData.title}
          </Text>
          
          <Text style={styles.description} numberOfLines={3}>
            {listingData.description}
          </Text>
          
          {showStats && renderStats()}
          {showFeatures && renderFeatures()}
          {renderRating()}
        </View>

        {/* Badges */}
        {renderBadges()}
        
        {/* Price and Actions */}
        <View style={styles.footer}>
          <View style={styles.priceSection}>
            <Text style={styles.price}>
              {listingData.price} {listingData.currency}
            </Text>
            <Text style={styles.priceLabel}>starting price</Text>
          </View>
          
          {showActions && renderActions()}
        </View>
      </TouchableOpacity>

      {/* Upgrade CTA for non-featured listings */}
      {!listingData.isFeatured && onUpgrade && renderUpgradeCta()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  highlightContainer: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
  },
  content: {
    padding: 16,
  },
  promotionSection: {
    marginBottom: 12,
  },
  promotionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  promotionText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  providerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  providerCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  premiumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumBadgeGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  featuresSection: {
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexBasis: '48%',
  },
  featureText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  ratingCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  location: {
    fontSize: 12,
    color: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceSection: {
    flex: 1,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 2,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  bookButton: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  upgradeCta: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeCtaGradient: {
    padding: 16,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 2,
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#059669',
  },
  upgradePrice: {
    alignItems: 'flex-end',
  },
  upgradePriceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
  },
  upgradeDuration: {
    fontSize: 12,
    color: '#059669',
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactContent: {
    padding: 12,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 20,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
  },
  minimalContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginVertical: 2,
  },
  minimalContent: {
    padding: 12,
  },
  minimalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  minimalTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  minimalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginLeft: 8,
  },
  minimalCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default FeaturedListing;
export { FEATURED_LISTING_CONFIG };