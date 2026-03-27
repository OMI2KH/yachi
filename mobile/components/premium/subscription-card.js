// components/premium/subscription-card.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Zap,
  Shield,
  Check,
  Star,
  Clock,
  Calendar,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Users,
  BarChart3,
} from 'lucide-react-native';
import { usePremium } from '../../contexts/premium-context';
import { useTheme } from '../../contexts/theme-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';
import { premiumConfig } from '../../config/premium-config';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Enterprise Subscription Card Component
 * Features: Active subscription management, renewal tracking, upgrade/downgrade options
 */

const SubscriptionCard = ({
  variant = 'expanded', // 'compact' | 'expanded' | 'management'
  showActions = true,
  onUpgrade,
  onManage,
  style,
}) => {
  const {
    currentSubscription,
    subscriptionStatus,
    daysUntilRenewal,
    premiumTier,
    benefits,
    cancelSubscription,
    renewSubscription,
    updateSubscription,
    isLoading,
  } = usePremium();
  const { theme, colors } = useTheme();
  
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Subscription tier configurations
  const TIER_CONFIG = {
    basic: {
      name: 'Premium Basic',
      icon: Crown,
      color: '#FFD700',
      gradient: ['#FFD700', '#FFA500'],
      price: 200,
      period: 'month',
      features: [
        'Premium profile badge',
        'Search priority',
        'Verified status',
        '5 featured listings',
        'Basic analytics',
      ],
    },
    pro: {
      name: 'Premium Pro',
      icon: Zap,
      color: '#667eea',
      gradient: ['#667eea', '#764ba2'],
      price: 499,
      period: 'month',
      features: [
        'All Basic features',
        'Pro animated badge',
        'Top search placement',
        'Unlimited featured listings',
        'Advanced AI matching',
        'Priority support',
      ],
    },
    enterprise: {
      name: 'Enterprise',
      icon: Shield,
      color: '#f093fb',
      gradient: ['#f093fb', '#f5576c'],
      price: 999,
      period: 'month',
      features: [
        'All Pro features',
        'Enterprise elite badge',
        'Government project access',
        'Dedicated account manager',
        'Custom AI algorithms',
        '24/7 premium support',
      ],
    },
  };

  // Status configurations
  const STATUS_CONFIG = {
    active: {
      label: 'Active',
      color: '#10B981',
      icon: Check,
      message: 'Your subscription is active',
    },
    canceled: {
      label: 'Canceled',
      color: '#6B7280',
      icon: Clock,
      message: 'Subscription ends on renewal date',
    },
    expired: {
      label: 'Expired',
      color: '#EF4444',
      icon: AlertTriangle,
      message: 'Your subscription has expired',
    },
    pending: {
      label: 'Pending',
      color: '#F59E0B',
      icon: RefreshCw,
      message: 'Subscription activation pending',
    },
  };

  const currentTier = TIER_CONFIG[premiumTier] || TIER_CONFIG.basic;
  const currentStatus = STATUS_CONFIG[subscriptionStatus] || STATUS_CONFIG.expired;
  const StatusIcon = currentStatus.icon;
  const TierIcon = currentTier.icon;

  // Animation effects
  React.useEffect(() => {
    if (subscriptionStatus === 'active') {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);
      Animated.loop(pulse).start();
    }
  }, [subscriptionStatus]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleRenew = async () => {
    if (isRenewing) return;
    
    try {
      setIsRenewing(true);
      const result = await renewSubscription();
      
      if (result.success) {
        Alert.alert('✅ Renewal Successful', 'Your subscription has been renewed successfully.');
      } else {
        throw new Error(result.error || 'Renewal failed');
      }
    } catch (error) {
      Alert.alert('Renewal Failed', error.message);
      triggerShake();
    } finally {
      setIsRenewing(false);
    }
  };

  const handleCancel = async () => {
    if (isCanceling) return;
    
    try {
      setIsCanceling(true);
      const result = await cancelSubscription();
      
      if (result.success) {
        Alert.alert(
          'Subscription Canceled',
          'Your subscription will remain active until the end of the current billing period.',
          [{ text: 'OK' }]
        );
        setShowCancelConfirm(false);
      } else {
        throw new Error(result.error || 'Cancellation failed');
      }
    } catch (error) {
      Alert.alert('Cancellation Failed', error.message);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleUpgrade = () => {
    onUpgrade?.() || Alert.alert('Upgrade', 'Redirect to upgrade screen...');
  };

  const handleManage = () => {
    onManage?.() || Alert.alert('Manage', 'Redirect to management screen...');
  };

  const shakeTransform = shakeAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: [-10, 10],
  });

  // Compact variant for dashboard display
  if (variant === 'compact') {
    return (
      <Animated.View
        style={[
          {
            transform: [{ scale: pulseAnim }],
          },
          style,
        ]}
      >
        <Pressable onPress={handleManage}>
          <LinearGradient
            colors={currentTier.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              padding: 16,
              shadowColor: currentTier.color,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <TierIcon size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#FFFFFF',
                      marginBottom: 2,
                    }}
                  >
                    {currentTier.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <StatusIcon size={12} color="#FFFFFF" />
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#FFFFFF',
                        marginLeft: 4,
                        opacity: 0.9,
                      }}
                    >
                      {currentStatus.label} • Renews in {daysUntilRenewal} days
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#FFFFFF',
                  }}
                >
                  {currentTier.price} ETB
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#FFFFFF',
                    opacity: 0.9,
                  }}
                >
                  per {currentTier.period}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // Expanded variant for subscription details
  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 24,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
          transform: [{ translateX: shakeTransform }],
        },
        style,
      ]}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LinearGradient
            colors={currentTier.gradient}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <TierIcon size={24} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.text,
                marginBottom: 4,
              }}
            >
              {currentTier.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: `${currentStatus.color}20`,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <StatusIcon size={12} color={currentStatus.color} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: currentStatus.color,
                    marginLeft: 4,
                  }}
                >
                  {currentStatus.label}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginLeft: 8,
                }}
              >
                • {currentStatus.message}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '800',
              color: colors.text,
            }}
          >
            {currentTier.price} ETB
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
            }}
          >
            per {currentTier.period}
          </Text>
        </View>
      </View>

      {/* Renewal Info */}
      {subscriptionStatus === 'active' && (
        <View
          style={{
            backgroundColor: `${currentStatus.color}10`,
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: currentStatus.color,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Calendar size={16} color={currentStatus.color} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: currentStatus.color,
                marginLeft: 8,
              }}
            >
              Auto-renewal in {daysUntilRenewal} days
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              lineHeight: 16,
            }}
          >
            Your subscription will automatically renew on the billing date. You can cancel anytime before renewal.
          </Text>
        </View>
      )}

      {/* Features List */}
      {variant === 'expanded' && (
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Included Features
          </Text>
          <View style={{ gap: 8 }}>
            {currentTier.features.map((feature, index) => (
              <View
                key={index}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Check
                  size={16}
                  color={currentTier.color}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.text,
                    flex: 1,
                  }}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {showActions && (
        <View style={{ gap: 12 }}>
          {subscriptionStatus === 'active' ? (
            <>
              <Button
                title="Renew Now"
                onPress={handleRenew}
                loading={isRenewing}
                variant="premium"
                style={{ backgroundColor: currentTier.color }}
              />
              <Button
                title="Manage Subscription"
                onPress={handleManage}
                variant="outline"
              />
              <Button
                title="Cancel Subscription"
                onPress={() => setShowCancelConfirm(true)}
                variant="ghost"
                style={{ borderColor: colors.error, borderWidth: 1 }}
                textStyle={{ color: colors.error }}
              />
            </>
          ) : (
            <>
              <Button
                title="Upgrade Now"
                onPress={handleUpgrade}
                variant="premium"
                style={{ backgroundColor: currentTier.color }}
              />
              <Button
                title="Learn More"
                onPress={handleManage}
                variant="outline"
              />
            </>
          )}
        </View>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 24,
              width: '100%',
            }}
          >
            <AlertTriangle size={32} color={colors.error} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.text,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Cancel Subscription?
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              Your premium features will remain active until {currentSubscription?.renewalDate}. 
              You can resubscribe anytime.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Keep Subscription"
                onPress={() => setShowCancelConfirm(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Cancel Anyway"
                onPress={handleCancel}
                loading={isCanceling}
                variant="ghost"
                style={{ flex: 1, borderColor: colors.error, borderWidth: 1 }}
                textStyle={{ color: colors.error }}
              />
            </View>
          </View>
        </View>
      )}

      {/* Loading Overlay */}
      {(isLoading || isRenewing || isCanceling) && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Loading message={isCanceling ? "Cancelling subscription..." : "Processing..."} />
        </View>
      )}
    </Animated.View>
  );
};

export default React.memo(SubscriptionCard);

// Specialized subscription card variants
export const CompactSubscriptionCard = (props) => (
  <SubscriptionCard {...props} variant="compact" />
);

export const ManagementSubscriptionCard = (props) => (
  <SubscriptionCard {...props} variant="expanded" showActions={true} />
);

export const DisplaySubscriptionCard = (props) => (
  <SubscriptionCard {...props} variant="expanded" showActions={false} />
);