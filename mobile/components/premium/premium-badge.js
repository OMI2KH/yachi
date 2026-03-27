// components/premium/premium-badge.js
import React from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Crown, Zap, Star, Shield, TrendingUp } from 'lucide-react-native';
import { usePremium } from '../../contexts/premium-context';
import { useTheme } from '../../contexts/theme-context';
import { premiumConfig } from '../../config/premium-config';

/**
 * Enterprise-level Premium Badge Component
 * Features: Animated, Interactive, Multi-tier Support
 */

const PremiumBadge = ({ 
  userId, 
  size = 'medium', 
  showTooltip = false, 
  interactive = false,
  onPress,
  type = 'provider' // 'provider' | 'listing' | 'featured'
}) => {
  const { 
    isUserPremium, 
    premiumTier, 
    subscriptionStatus,
    benefits 
  } = usePremium();
  const { theme, colors } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  // Size configurations
  const sizeConfig = {
    small: { width: 24, height: 24, iconSize: 12, fontSize: 10 },
    medium: { width: 32, height: 32, iconSize: 16, fontSize: 12 },
    large: { width: 48, height: 48, iconSize: 24, fontSize: 14 },
    xlarge: { width: 64, height: 64, iconSize: 32, fontSize: 16 }
  };

  // Tier configurations
  const tierConfig = {
    basic: {
      icon: Crown,
      gradient: ['#FFD700', '#FFA500'],
      label: 'Premium',
      benefits: ['Priority Listing', 'Verified Badge']
    },
    pro: {
      icon: Zap,
      gradient: ['#667eea', '#764ba2'],
      label: 'Pro',
      benefits: ['All Basic + AI Matching', 'Analytics Dashboard']
    },
    enterprise: {
      icon: Shield,
      gradient: ['#f093fb', '#f5576c'],
      label: 'Enterprise',
      benefits: ['All Pro + Government Access', 'Dedicated Support']
    }
  };

  const currentConfig = tierConfig[premiumTier] || tierConfig.basic;
  const IconComponent = currentConfig.icon;
  const { width, height, iconSize, fontSize } = sizeConfig[size];

  // Animation handlers
  const handlePressIn = () => {
    if (!interactive) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (!interactive) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-15deg'],
  });

  if (!isUserPremium || subscriptionStatus !== 'active') {
    return null;
  }

  const BadgeContent = (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: 8,
          overflow: 'hidden',
          transform: [{ scale: scaleAnim }, { rotate: rotateInterpolate }],
        },
      ]}
    >
      <BlurView
        intensity={20}
        tint={theme === 'dark' ? 'light' : 'dark'}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: `linear-gradient(135deg, ${currentConfig.gradient[0]}, ${currentConfig.gradient[1]})`,
          padding: 2,
        }}
      >
        <View
          style={{
            flex: 1,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 6,
            padding: 2,
          }}
        >
          <IconComponent 
            size={iconSize} 
            color={currentConfig.gradient[0]} 
            fill={currentConfig.gradient[0]}
          />
        </View>
      </BlurView>
    </Animated.View>
  );

  const Tooltip = () => (
    <View
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: [{ translateX: -100 }],
        width: 200,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 1000,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: colors.text,
          marginBottom: 4,
        }}
      >
        {currentConfig.label} Member
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: 8,
        }}
      >
        Enhanced visibility and features
      </Text>
      {currentConfig.benefits.map((benefit, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <Star size={12} color={currentConfig.gradient[0]} />
          <Text
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              marginLeft: 6,
            }}
          >
            {benefit}
          </Text>
        </View>
      ))}
      <View
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: [{ translateX: -6 }],
          width: 12,
          height: 12,
          backgroundColor: colors.card,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );

  if (interactive) {
    return (
      <View style={{ position: 'relative' }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {BadgeContent}
        </Pressable>
        {showTooltip && <Tooltip />}
      </View>
    );
  }

  return (
    <View style={{ position: 'relative' }}>
      {BadgeContent}
      {showTooltip && <Tooltip />}
    </View>
  );
};

export default React.memo(PremiumBadge);

// Additional specialized badge components
export const PremiumListingBadge = (props) => (
  <PremiumBadge {...props} type="listing" size="large" showTooltip />
);

export const PremiumFeaturedBadge = (props) => (
  <PremiumBadge {...props} type="featured" size="xlarge" interactive />
);

export const PremiumVerificationBadge = (props) => (
  <PremiumBadge {...props} type="provider" size="medium" showTooltip />
);