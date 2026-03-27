// components/premium/benefits-list.js

import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const SCREEN = Dimensions.get('window');

const PREMIUM_BENEFITS_CONFIG = {
  PLANS: {
    PREMIUM_BADGE: {
      id: 'premium_badge',
      name: 'Premium Badge',
      price: 200,
      duration: '30 days',
      color: '#F59E0B',
      icon: 'verified',
      popular: false,
      features: [
        {
          icon: 'trending-up',
          title: 'Priority in Search Results',
          description: 'Get shown first when clients search for services',
          color: '#10B981'
        },
        {
          icon: 'star',
          title: 'Featured Profile Placement',
          description: 'Your profile appears in featured sections',
          color: '#F59E0B'
        },
        {
          icon: 'shield-checkmark',
          title: 'Verified Status Badge',
          description: 'Blue verification badge builds trust with clients',
          color: '#3B82F6'
        },
        {
          icon: 'eye',
          title: 'Enhanced Visibility',
          description: 'Up to 5x more profile views and client interactions',
          color: '#8B5CF6'
        },
        {
          icon: 'chatbubble-ellipses',
          title: 'Increased Client Trust',
          description: 'Verified badge increases booking conversion rates',
          color: '#EC4899'
        },
        {
          icon: 'analytics',
          title: 'Performance Analytics',
          description: 'Detailed insights into your profile performance',
          color: '#06B6D4'
        }
      ]
    },
    PREMIUM_LISTING: {
      id: 'premium_listing',
      name: 'Premium Listing',
      price: 399,
      duration: '30 days',
      color: '#10B981',
      icon: 'trending-up',
      popular: true,
      features: [
        {
          icon: 'trophy',
          title: 'Top Placement in Search',
          description: 'Always appear at the top of relevant search results',
          color: '#F59E0B'
        },
        {
          icon: 'grid',
          title: 'Category Page Featuring',
          description: 'Featured placement on category landing pages',
          color: '#10B981'
        },
        {
          icon: 'sparkles',
          title: 'Highlighted Listings',
          description: 'Your services stand out with special highlighting',
          color: '#8B5CF6'
        },
        {
          icon: 'megaphone',
          title: '30-Day Visibility Boost',
          description: 'Maximum exposure for your services for a full month',
          color: '#EC4899'
        },
        {
          icon: 'rocket',
          title: 'Increased Client Inquiries',
          description: 'Get up to 3x more booking requests and messages',
          color: '#3B82F6'
        },
        {
          icon: 'business',
          title: 'Professional Appearance',
          description: 'Premium styling makes your business look established',
          color: '#06B6D4'
        },
        {
          icon: 'calendar',
          title: 'Booking Priority',
          description: 'Clients see your availability first when booking',
          color: '#84CC16'
        },
        {
          icon: 'people',
          title: 'Competitive Advantage',
          description: 'Stand out from other service providers in your area',
          color: '#F97316'
        }
      ]
    },
    PREMIUM_BUNDLE: {
      id: 'premium_bundle',
      name: 'Professional Bundle',
      price: 499,
      duration: '30 days',
      color: '#8B5CF6',
      icon: 'diamond',
      popular: false,
      features: [
        {
          icon: 'star',
          title: 'All Premium Badge Features',
          description: 'Everything included in the Premium Badge plan',
          color: '#F59E0B'
        },
        {
          icon: 'trending-up',
          title: 'All Premium Listing Features',
          description: 'Everything included in the Premium Listing plan',
          color: '#10B981'
        },
        {
          icon: 'flash',
          title: 'Bundle Exclusive: Priority Support',
          description: 'Dedicated customer support with faster response times',
          color: '#8B5CF6'
        },
        {
          icon: 'color-wand',
          title: 'Advanced Analytics Dashboard',
          description: 'Comprehensive business insights and performance metrics',
          color: '#EC4899'
        },
        {
          icon: 'gift',
          title: 'Special Bundle Discount',
          description: 'Save 17% compared to buying both plans separately',
          color: '#3B82F6'
        },
        {
          icon: 'infinite',
          title: 'Maximum Visibility',
          description: 'Combine both premium features for ultimate exposure',
          color: '#06B6D4'
        }
      ]
    }
  },
  STATS: {
    PREMIUM_BADGE: {
      views: '5x',
      bookings: '3x',
      trust: '87%'
    },
    PREMIUM_LISTING: {
      views: '8x',
      bookings: '4x',
      trust: '92%'
    },
    PREMIUM_BUNDLE: {
      views: '12x',
      bookings: '6x',
      trust: '95%'
    }
  }
};

const BenefitsList = ({
  planType = 'premium_badge',
  showPricing = true,
  showStats = true,
  showActionButton = true,
  onUpgradePress,
  isCompact = false,
  highlightColor = null
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const planData = useMemo(() => {
    return PREMIUM_BENEFITS_CONFIG.PLANS[planType.toUpperCase()] || 
           PREMIUM_BENEFITS_CONFIG.PLANS.PREMIUM_BADGE;
  }, [planType]);

  const planStats = useMemo(() => {
    return PREMIUM_BENEFITS_CONFIG.STATS[planType.toUpperCase()] || 
           PREMIUM_BENEFITS_CONFIG.STATS.PREMIUM_BADGE;
  }, [planType]);

  const primaryColor = highlightColor || planData.color;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleUpgradePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpgradePress?.(planData);
  };

  const renderPlanHeader = () => (
    <Animated.View 
      style={[
        styles.planHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={[primaryColor + '20', primaryColor + '08']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.planInfo}>
            <View style={[styles.planIcon, { backgroundColor: primaryColor }]}>
              <MaterialIcons name={planData.icon} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.planText}>
              <Text style={styles.planName}>{planData.name}</Text>
              {showPricing && (
                <View style={styles.pricing}>
                  <Text style={styles.planPrice}>{planData.price} ETB</Text>
                  <Text style={styles.planDuration}>/{planData.duration}</Text>
                </View>
              )}
            </View>
          </View>
          
          {planData.popular && (
            <View style={styles.popularBadge}>
              <Ionicons name="flash" size={12} color="#FFFFFF" />
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
          )}
        </View>

        {showStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{planStats.views}</Text>
              <Text style={styles.statLabel}>More Views</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{planStats.bookings}</Text>
              <Text style={styles.statLabel}>More Bookings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{planStats.trust}</Text>
              <Text style={styles.statLabel}>Trust Score</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const renderBenefitItem = (benefit, index) => (
    <Animated.View
      key={index}
      style={[
        styles.benefitItem,
        {
          opacity: fadeAnim,
          transform: [
            { 
              translateX: slideAnim.interpolate({
                inputRange: [0, 20],
                outputRange: [0, 20 - (index * 3)]
              })
            }
          ]
        }
      ]}
    >
      <View style={styles.benefitContent}>
        <View style={[styles.benefitIcon, { backgroundColor: benefit.color + '20' }]}>
          <Ionicons name={benefit.icon} size={20} color={benefit.color} />
        </View>
        
        <View style={styles.benefitText}>
          <Text style={styles.benefitTitle}>{benefit.title}</Text>
          <Text style={styles.benefitDescription}>{benefit.description}</Text>
        </View>

        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={20} color={primaryColor} />
        </View>
      </View>
    </Animated.View>
  );

  const renderCompactView = () => (
    <View style={styles.compactContainer}>
      <Text style={styles.compactTitle}>Premium Benefits</Text>
      <View style={styles.compactBenefits}>
        {planData.features.slice(0, 3).map((benefit, index) => (
          <View key={index} style={styles.compactBenefit}>
            <Ionicons name={benefit.icon} size={16} color={benefit.color} />
            <Text style={styles.compactBenefitText}>{benefit.title}</Text>
          </View>
        ))}
        {planData.features.length > 3 && (
          <View style={styles.moreBenefits}>
            <Text style={styles.moreText}>
              +{planData.features.length - 3} more benefits
            </Text>
          </View>
        )}
      </View>
      
      {showActionButton && (
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: primaryColor }]}
          onPress={handleUpgradePress}
        >
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isCompact) {
    return renderCompactView();
  }

  return (
    <View style={styles.container}>
      {renderPlanHeader()}
      
      <ScrollView 
        style={styles.benefitsList}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.benefitsHeader}>
          <Text style={styles.benefitsTitle}>What's Included</Text>
          <Text style={styles.benefitsCount}>
            {planData.features.length} premium features
          </Text>
        </View>

        {planData.features.map((benefit, index) => 
          renderBenefitItem(benefit, index)
        )}

        {/* Value Proposition */}
        <View style={styles.valueProposition}>
          <LinearGradient
            colors={[primaryColor + '20', primaryColor + '08']}
            style={styles.valueGradient}
          >
            <Ionicons name="ribbon" size={24} color={primaryColor} />
            <Text style={styles.valueTitle}>Excellent Value</Text>
            <Text style={styles.valueDescription}>
              Invest in your business growth with features proven to increase visibility and bookings
            </Text>
            <View style={styles.valueStats}>
              <View style={styles.valueStat}>
                <Text style={styles.valueStatNumber}>30</Text>
                <Text style={styles.valueStatLabel}>Days</Text>
              </View>
              <View style={styles.valueStat}>
                <Text style={styles.valueStatNumber}>24/7</Text>
                <Text style={styles.valueStatLabel}>Support</Text>
              </View>
              <View style={styles.valueStat}>
                <Text style={styles.valueStatNumber}>100%</Text>
                <Text style={styles.valueStatLabel}>Satisfaction</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {showActionButton && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.upgradeButtonLarge}
            onPress={handleUpgradePress}
          >
            <LinearGradient
              colors={[primaryColor, darkenColor(primaryColor, 20)]}
              style={styles.upgradeGradient}
            >
              <MaterialIcons name={planData.icon} size={20} color="#FFFFFF" />
              <Text style={styles.upgradeButtonTextLarge}>
                Upgrade to {planData.name}
              </Text>
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>{planData.price} ETB</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.guaranteeText}>
            ✅ 30-day satisfaction guarantee • Cancel anytime
          </Text>
        </View>
      )}
    </View>
  );
};

// Helper function to darken colors
const darkenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  planHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  headerGradient: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  planText: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  pricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
  },
  planDuration: {
    fontSize: 14,
    color: '#6B7280',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  benefitsList: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  benefitsHeader: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  benefitsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  benefitItem: {
    marginBottom: 12,
  },
  benefitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  checkmark: {
    padding: 4,
  },
  valueProposition: {
    marginTop: 8,
    marginBottom: 20,
  },
  valueGradient: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  valueDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  valueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  valueStat: {
    alignItems: 'center',
  },
  valueStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 2,
  },
  valueStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionSection: {
    padding: 20,
    paddingTop: 0,
  },
  upgradeButtonLarge: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  upgradeButtonTextLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  priceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  guaranteeText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  compactBenefits: {
    gap: 8,
    marginBottom: 16,
  },
  compactBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactBenefitText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  moreBenefits: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  moreText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BenefitsList;
export { PREMIUM_BENEFITS_CONFIG };