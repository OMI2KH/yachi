// components/premium/premium-upgrade.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Crown,
  Zap,
  Shield,
  Check,
  Star,
  TrendingUp,
  Users,
  BarChart3,
  Clock,
  X,
} from 'lucide-react-native';
import { usePremium } from '../../contexts/premium-context';
import { usePayment } from '../../contexts/payment-context';
import { useTheme } from '../../contexts/theme-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';
import { premiumConfig } from '../../config/premium-config';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Enterprise Premium Upgrade Component
 * Features: Multi-tier selection, animated comparisons, seamless payment integration
 */

const PremiumUpgrade = ({ 
  visible = false, 
  onClose, 
  defaultTier = 'basic',
  context = 'general' // 'general' | 'listing' | 'verification' | 'construction'
}) => {
  const { 
    upgradeToPremium, 
    subscriptionStatus, 
    currentSubscription,
    isLoading 
  } = usePremium();
  const { processPayment } = usePayment();
  const { theme, colors } = useTheme();
  
  const [selectedTier, setSelectedTier] = useState(defaultTier);
  const [paymentMethod, setPaymentMethod] = useState('chapa');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(visible ? 0 : 1)).current;
  const backdropAnim = useRef(new Animated.Value(visible ? 0 : 1)).current;

  // Premium tiers configuration
  const TIERS = {
    basic: {
      id: 'basic',
      name: 'Premium Basic',
      price: 200,
      period: 'month',
      originalPrice: 300,
      savings: 33,
      icon: Crown,
      color: '#FFD700',
      gradient: ['#FFD700', '#FFA500'],
      popular: false,
      features: [
        'Premium profile badge',
        'Priority in search results',
        'Verified status indicator',
        'Basic analytics dashboard',
        'Up to 5 featured listings',
        'Standard customer support',
      ],
      limitations: {
        featuredListings: 5,
        aiMatches: 10,
        analyticsDepth: 'basic',
        supportPriority: 'standard',
      },
    },
    pro: {
      id: 'pro',
      name: 'Premium Pro',
      price: 499,
      period: 'month',
      originalPrice: 699,
      savings: 29,
      icon: Zap,
      color: '#667eea',
      gradient: ['#667eea', '#764ba2'],
      popular: true,
      features: [
        'All Basic features',
        'Pro badge with animations',
        'Top placement in search',
        'Advanced AI worker matching',
        'Unlimited featured listings',
        'Detailed analytics dashboard',
        'Priority customer support',
        'Early access to new features',
      ],
      limitations: {
        featuredListings: 'unlimited',
        aiMatches: 'unlimited',
        analyticsDepth: 'advanced',
        supportPriority: 'priority',
      },
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      price: 999,
      period: 'month',
      originalPrice: 1299,
      savings: 23,
      icon: Shield,
      color: '#f093fb',
      gradient: ['#f093fb', '#f5576c'],
      popular: false,
      features: [
        'All Pro features',
        'Enterprise elite badge',
        'Government project access',
        'Dedicated account manager',
        'Custom AI matching algorithms',
        'White-label solutions',
        'API access',
        '24/7 premium support',
        'Custom contract terms',
      ],
      limitations: {
        featuredListings: 'unlimited',
        aiMatches: 'unlimited',
        analyticsDepth: 'enterprise',
        supportPriority: 'dedicated',
      },
    },
  };

  // Context-specific messaging
  const contextMessages = {
    general: {
      title: 'Upgrade to Premium',
      subtitle: 'Get more visibility, better matches, and premium features',
    },
    listing: {
      title: 'Feature Your Listing',
      subtitle: 'Get 5x more views and priority placement in search results',
    },
    verification: {
      title: 'Premium Verification',
      subtitle: 'Build trust with verified badges and enhanced credibility',
    },
    construction: {
      title: 'AI Construction Access',
      subtitle: 'Access advanced AI matching for construction projects',
    },
  };

  const currentContext = contextMessages[context];

  // Animation handlers
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 200,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 25,
          stiffness: 200,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleUpgrade = async () => {
    if (isProcessing) return;

    const tier = TIERS[selectedTier];
    
    try {
      setIsProcessing(true);
      
      // Process payment first
      const paymentResult = await processPayment({
        amount: tier.price,
        currency: 'ETB',
        method: paymentMethod,
        description: `Yachi Premium ${tier.name} Subscription`,
        metadata: {
          tier: tier.id,
          type: 'premium_subscription',
          context: context,
        },
      });

      if (paymentResult.success) {
        // Upgrade premium status
        const upgradeResult = await upgradeToPremium({
          tier: tier.id,
          paymentId: paymentResult.paymentId,
          amount: tier.price,
          period: tier.period,
        });

        if (upgradeResult.success) {
          Alert.alert(
            '🎉 Upgrade Successful!',
            `You are now a ${tier.name} member! Premium features are now active.`,
            [{ text: 'Awesome', onPress: onClose }]
          );
        } else {
          throw new Error(upgradeResult.error || 'Upgrade failed');
        }
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (error) {
      Alert.alert(
        'Upgrade Failed',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const slideTransform = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth],
  });

  const backdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Backdrop */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          opacity: backdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Content */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateX: slideTransform }],
        }}
      >
        <BlurView
          intensity={20}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 60,
                paddingBottom: 20,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  {currentContext.title}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                  }}
                >
                  {currentContext.subtitle}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.card,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              {/* Tier Selection */}
              <View style={{ padding: 20, gap: 16 }}>
                {Object.values(TIERS).map((tier) => {
                  const Icon = tier.icon;
                  const isSelected = selectedTier === tier.id;
                  
                  return (
                    <Pressable
                      key={tier.id}
                      onPress={() => setSelectedTier(tier.id)}
                    >
                      <View
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 16,
                          padding: 20,
                          borderWidth: 3,
                          borderColor: isSelected ? tier.color : 'transparent',
                          shadowColor: colors.text,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.15 : 0.05,
                          shadowRadius: 12,
                          elevation: isSelected ? 8 : 2,
                        }}
                      >
                        {/* Popular Badge */}
                        {tier.popular && (
                          <View
                            style={{
                              position: 'absolute',
                              top: -10,
                              right: 20,
                              backgroundColor: tier.color,
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: '#FFFFFF',
                              }}
                            >
                              MOST POPULAR
                            </Text>
                          </View>
                        )}

                        {/* Tier Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              backgroundColor: `${tier.color}20`,
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 12,
                            }}
                          >
                            <Icon size={24} color={tier.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 20,
                                fontWeight: '700',
                                color: colors.text,
                                marginBottom: 2,
                              }}
                            >
                              {tier.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text
                                style={{
                                  fontSize: 24,
                                  fontWeight: '800',
                                  color: tier.color,
                                }}
                              >
                                {tier.price} ETB
                              </Text>
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: colors.textSecondary,
                                  marginLeft: 8,
                                }}
                              >
                                /{tier.period}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Savings Badge */}
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            backgroundColor: `${tier.color}20`,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                            marginBottom: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: tier.color,
                            }}
                          >
                            Save {tier.savings}% • Was {tier.originalPrice} ETB
                          </Text>
                        </View>

                        {/* Features */}
                        <View style={{ gap: 8 }}>
                          {tier.features.map((feature, index) => (
                            <View
                              key={index}
                              style={{ flexDirection: 'row', alignItems: 'flex-start' }}
                            >
                              <Check
                                size={16}
                                color={tier.color}
                                style={{ marginTop: 2, marginRight: 8 }}
                              />
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: colors.text,
                                  flex: 1,
                                  lineHeight: 20,
                                }}
                              >
                                {feature}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Payment Methods */}
              <View style={{ padding: 20, paddingTop: 0 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 12,
                  }}
                >
                  Payment Method
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {['chapa', 'telebirr', 'cbe-birr'].map((method) => (
                    <Pressable
                      key={method}
                      onPress={() => setPaymentMethod(method)}
                      style={{
                        flex: 1,
                        backgroundColor: colors.card,
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: paymentMethod === method ? colors.primary : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: colors.text,
                          textTransform: 'uppercase',
                        }}
                      >
                        {method.replace('-', ' ')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Fixed Footer */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: colors.background,
                padding: 20,
                paddingBottom: 40,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Button
                title={`Upgrade to ${TIERS[selectedTier].name} - ${TIERS[selectedTier].price} ETB`}
                onPress={handleUpgrade}
                disabled={isProcessing}
                loading={isProcessing}
                size="large"
                variant="premium"
                style={{
                  backgroundColor: TIERS[selectedTier].color,
                  marginBottom: 12,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 16,
                }}
              >
                Cancel anytime. 7-day money-back guarantee.{'\n'}
                By upgrading, you agree to our Terms of Service and Privacy Policy.
              </Text>
            </View>
          </View>
        </BlurView>
      </Animated.View>

      {/* Loading Overlay */}
      {(isLoading || isProcessing) && <Loading message="Processing upgrade..." />}
    </View>
  );
};

export default React.memo(PremiumUpgrade);

// Quick upgrade components for specific contexts
export const QuickListingUpgrade = ({ onUpgrade }) => (
  <PremiumUpgrade context="listing" onClose={onUpgrade} />
);

export const QuickVerificationUpgrade = ({ onUpgrade }) => (
  <PremiumUpgrade context="verification" onClose={onUpgrade} />
);

export const QuickConstructionUpgrade = ({ onUpgrade }) => (
  <PremiumUpgrade context="construction" onClose={onUpgrade} />
);