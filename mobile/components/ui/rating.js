// components/ui/rating.js
// ============================================================
// YACHI ENTERPRISE RATING COMPONENT
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  I18nManager,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Context
import { useTheme } from '../../contexts/theme-context';
import { useLanguage } from './language-selector';

// Components
import Loading from './loading';

// Services
import { analyticsService } from '../../services/analytics-service';

// Constants
import { YachiColors } from '../../constants/colors';
import { AppConfig } from '../../config/app';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

class YachiRatingSystem {
  constructor() {
    this.maxRating = 5;
    this.ratingSizes = this.getRatingSizes();
    this.ratingVariants = this.getRatingVariants();
    this.interactionModes = this.getInteractionModes();
  }

  getRatingSizes() {
    return {
      SMALL: 'small',
      MEDIUM: 'medium',
      LARGE: 'large',
      XLARGE: 'xlarge',
    };
  }

  getRatingVariants() {
    return {
      PRIMARY: 'primary',
      SECONDARY: 'secondary',
      SUCCESS: 'success',
      WARNING: 'warning',
      ERROR: 'error',
      CUSTOM: 'custom',
    };
  }

  getInteractionModes() {
    return {
      INTERACTIVE: 'interactive',
      DISPLAY: 'display',
      READONLY: 'readonly',
      ANIMATED: 'animated',
    };
  }

  getSizeConfig(size) {
    const configs = {
      [this.ratingSizes.SMALL]: {
        starSize: 16,
        spacing: 2,
        fontSize: 12,
      },
      [this.ratingSizes.MEDIUM]: {
        starSize: 20,
        spacing: 4,
        fontSize: 14,
      },
      [this.ratingSizes.LARGE]: {
        starSize: 24,
        spacing: 6,
        fontSize: 16,
      },
      [this.ratingSizes.XLARGE]: {
        starSize: 32,
        spacing: 8,
        fontSize: 18,
      },
    };
    return configs[size] || configs[this.ratingSizes.MEDIUM];
  }

  getVariantColor(variant, colors, customColor) {
    if (variant === this.ratingVariants.CUSTOM && customColor) {
      return customColor;
    }

    const colorMap = {
      [this.ratingVariants.PRIMARY]: colors.primary,
      [this.ratingVariants.SECONDARY]: colors.mutedForeground,
      [this.ratingVariants.SUCCESS]: colors.success,
      [this.ratingVariants.WARNING]: colors.warning,
      [this.ratingVariants.ERROR]: colors.error,
    };

    return colorMap[variant] || colors.primary;
  }

  calculateAverageRating(ratings) {
    if (!ratings || ratings.length === 0) return 0;
    
    const validRatings = ratings.filter(rating => rating > 0);
    if (validRatings.length === 0) return 0;
    
    const sum = validRatings.reduce((total, rating) => total + rating, 0);
    return Math.round((sum / validRatings.length) * 10) / 10;
  }

  getRatingDistribution(ratings) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    ratings.forEach(rating => {
      if (rating >= 1 && rating <= 5) {
        distribution[Math.round(rating)]++;
      }
    });

    return distribution;
  }

  formatRatingText(rating, showDecimal = false, totalRatings = 0) {
    if (!rating) return 'No ratings';
    
    const formattedRating = showDecimal ? rating.toFixed(1) : Math.round(rating);
    
    if (totalRatings > 0) {
      return `${formattedRating} (${totalRatings})`;
    }
    
    return formattedRating.toString();
  }

  getAccessibilityLabel(rating, totalRatings = 0, interactionMode) {
    if (interactionMode === this.interactionModes.DISPLAY) {
      if (totalRatings > 0) {
        return `Rating: ${rating} out of 5 based on ${totalRatings} reviews`;
      }
      return `Rating: ${rating} out of 5`;
    }
    
    return `Rate ${rating} out of 5`;
  }

  shouldAnimateChange(previousRating, newRating) {
    return Math.abs(previousRating - newRating) >= 2;
  }
}

// Singleton instance
export const ratingSystem = new YachiRatingSystem();

/**
 * Enterprise Rating Component with Advanced Features
 * Supports interactive ratings, display modes, animations, and analytics
 */
export default function Rating({
  // Core Props
  rating = 0,
  onRatingChange = () => {},
  
  // Configuration
  size = ratingSystem.ratingSizes.MEDIUM,
  variant = ratingSystem.ratingVariants.PRIMARY,
  interactionMode = ratingSystem.interactionModes.INTERACTIVE,
  maxRating = ratingSystem.maxRating,
  allowHalfRatings = false,
  allowClear = true,
  
  // Display Options
  showRatingText = false,
  showRatingCount = false,
  ratingCount = 0,
  showDecimal = false,
  align = 'left',
  
  // Styling
  customColor,
  inactiveColor,
  spacing,
  containerStyle,
  textStyle,
  
  // Technical
  testID = 'yachi-rating',
  accessibilityLabel,
  analyticsEvent = 'rating_interaction',
  
  // Advanced
  animateChanges = true,
  hapticFeedback = true,
  disabled = false,
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  
  // Refs
  const starAnimations = useRef(
    Array(maxRating).fill().map(() => new Animated.Value(1))
  ).current;
  const ratingAnim = useRef(new Animated.Value(rating)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // State
  const [currentRating, setCurrentRating] = useState(rating);
  const [hoverRating, setHoverRating] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Memoized values
  const sizeConfig = useMemo(() => 
    ratingSystem.getSizeConfig(size),
    [size]
  );

  const activeColor = useMemo(() => 
    ratingSystem.getVariantColor(variant, colors, customColor),
    [variant, colors, customColor]
  );

  const inactiveStarColor = useMemo(() => 
    inactiveColor || colors.mutedForeground,
    [inactiveColor, colors]
  );

  const isInteractive = useMemo(() => 
    interactionMode === ratingSystem.interactionModes.INTERACTIVE && !disabled,
    [interactionMode, disabled]
  );

  const isDisplayOnly = useMemo(() => 
    interactionMode === ratingSystem.interactionModes.DISPLAY ||
    interactionMode === ratingSystem.interactionModes.READONLY,
    [interactionMode]
  );

  const shouldAnimate = useMemo(() => 
    interactionMode === ratingSystem.interactionModes.ANIMATED || animateChanges,
    [interactionMode, animateChanges]
  );

  const displayRating = useMemo(() => 
    hoverRating || currentRating,
    [hoverRating, currentRating]
  );

  const formattedRatingText = useMemo(() => 
    ratingSystem.formatRatingText(currentRating, showDecimal, ratingCount),
    [currentRating, showDecimal, ratingCount]
  );

  const resolvedAccessibilityLabel = useMemo(() => 
    accessibilityLabel || ratingSystem.getAccessibilityLabel(
      currentRating, 
      ratingCount, 
      interactionMode
    ),
    [accessibilityLabel, currentRating, ratingCount, interactionMode]
  );

  // Effects
  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  useEffect(() => {
    if (shouldAnimate) {
      animateRatingChange();
    } else {
      ratingAnim.setValue(currentRating);
    }
  }, [currentRating, shouldAnimate]);

  // Animation methods
  const animateStar = useCallback((index, toValue = 1.2) => {
    if (!shouldAnimate) return;

    Animated.sequence([
      Animated.timing(starAnimations[index], {
        toValue: toValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(starAnimations[index], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shouldAnimate, starAnimations]);

  const animateRatingChange = useCallback(() => {
    if (!shouldAnimate) return;

    setIsAnimating(true);
    
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(ratingAnim, {
        toValue: currentRating,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => setIsAnimating(false));
  }, [shouldAnimate, currentRating, ratingAnim, pulseAnim]);

  const triggerHapticFeedback = useCallback(() => {
    if (hapticFeedback && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticFeedback]);

  // Rating interaction methods
  const handleStarPress = useCallback((starValue) => {
    if (!isInteractive || isAnimating) return;

    let newRating = starValue;
    
    // Handle clear rating
    if (allowClear && currentRating === starValue) {
      newRating = 0;
    }
    
    // Handle half ratings
    if (allowHalfRatings) {
      // This would require more complex touch handling for precise half-star selection
      // For now, we'll use whole stars with half-rating capability through props
    }

    const previousRating = currentRating;
    setCurrentRating(newRating);
    
    // Trigger haptic feedback
    triggerHapticFeedback();

    // Animate the pressed star
    if (newRating > 0) {
      const starIndex = Math.ceil(newRating) - 1;
      animateStar(starIndex);
    }

    // Track analytics
    analyticsService.trackEvent(analyticsEvent, {
      previous_rating: previousRating,
      new_rating: newRating,
      rating_delta: newRating - previousRating,
      is_clear: newRating === 0,
    });

    // Call onChange callback
    onRatingChange(newRating);
  }, [
    isInteractive, 
    isAnimating, 
    currentRating, 
    allowClear, 
    allowHalfRatings, 
    triggerHapticFeedback, 
    animateStar, 
    analyticsEvent, 
    onRatingChange
  ]);

  const handleStarHover = useCallback((starValue) => {
    if (!isInteractive) return;
    setHoverRating(starValue);
  }, [isInteractive]);

  const handleHoverEnd = useCallback(() => {
    if (!isInteractive) return;
    setHoverRating(0);
  }, [isInteractive]);

  // Render methods
  const renderStar = useCallback((index) => {
    const starValue = index + 1;
    const isActive = starValue <= displayRating;
    const isHalfActive = allowHalfRatings && 
                        starValue - 0.5 <= displayRating && 
                        displayRating < starValue;
    
    const starColor = isActive ? activeColor : inactiveStarColor;
    const starSize = sizeConfig.starSize;
    const starSpacing = spacing || sizeConfig.spacing;

    const starStyle = [
      styles.star,
      {
        marginHorizontal: starSpacing / 2,
        transform: [{ scale: starAnimations[index] }],
      },
    ];

    const getStarIconName = () => {
      if (isHalfActive) {
        return 'star-half';
      }
      return isActive ? 'star' : 'star-outline';
    };

    return (
      <TouchableOpacity
        key={starValue}
        style={starStyle}
        onPress={() => handleStarPress(starValue)}
        onPressIn={() => handleStarHover(starValue)}
        onPressOut={handleHoverEnd}
        disabled={!isInteractive}
        activeOpacity={isInteractive ? 0.7 : 1}
        accessibilityLabel={`Rate ${starValue} out of ${maxRating}`}
        accessibilityRole={isInteractive ? "button" : "none"}
      >
        <Ionicons
          name={getStarIconName()}
          size={starSize}
          color={starColor}
        />
      </TouchableOpacity>
    );
  }, [
    displayRating,
    allowHalfRatings,
    activeColor,
    inactiveStarColor,
    sizeConfig,
    spacing,
    starAnimations,
    handleStarPress,
    handleStarHover,
    handleHoverEnd,
    isInteractive,
    maxRating,
  ]);

  const renderStars = useCallback(() => {
    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
      </View>
    );
  }, [maxRating, renderStar]);

  const renderRatingText = useCallback(() => {
    if (!showRatingText && !showRatingCount) return null;

    return (
      <Animated.Text
        style={[
          styles.ratingText,
          {
            fontSize: sizeConfig.fontSize,
            color: colors.foreground,
            opacity: ratingAnim.interpolate({
              inputRange: [0, maxRating],
              outputRange: [0.5, 1],
            }),
            transform: [{ scale: pulseAnim }],
          },
          textStyle,
        ]}
        accessibilityLabel={resolvedAccessibilityLabel}
      >
        {formattedRatingText}
      </Animated.Text>
    );
  }, [
    showRatingText,
    showRatingCount,
    sizeConfig,
    colors,
    ratingAnim,
    maxRating,
    pulseAnim,
    textStyle,
    resolvedAccessibilityLabel,
    formattedRatingText,
  ]);

  const containerAlignment = useMemo(() => {
    const alignmentStyles = {
      left: styles.containerLeft,
      center: styles.containerCenter,
      right: styles.containerRight,
    };
    return alignmentStyles[align] || styles.containerLeft;
  }, [align]);

  return (
    <View 
      style={[styles.container, containerAlignment, containerStyle]}
      testID={testID}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole={isInteractive ? "adjustable" : "text"}
      accessibilityValue={{
        min: 0,
        max: maxRating,
        now: currentRating,
      }}
    >
      {renderStars()}
      {renderRatingText()}
      
      {/* Loading state for animated mode */}
      {isAnimating && (
        <View style={styles.loadingOverlay}>
          <Loading size="small" />
        </View>
      )}
    </View>
  );
}

// Pre-configured rating variants
export function DisplayRating({ rating, ratingCount, ...props }) {
  return (
    <Rating
      rating={rating}
      ratingCount={ratingCount}
      interactionMode={ratingSystem.interactionModes.DISPLAY}
      showRatingText={true}
      showRatingCount={true}
      {...props}
    />
  );
}

export function InteractiveRating({ onRatingChange, ...props }) {
  return (
    <Rating
      interactionMode={ratingSystem.interactionModes.INTERACTIVE}
      onRatingChange={onRatingChange}
      showRatingText={true}
      {...props}
    />
  );
}

export function ReadOnlyRating({ rating, ...props }) {
  return (
    <Rating
      rating={rating}
      interactionMode={ratingSystem.interactionModes.READONLY}
      showRatingText={true}
      {...props}
    />
  );
}

export function AnimatedRating({ rating, ...props }) {
  return (
    <Rating
      rating={rating}
      interactionMode={ratingSystem.interactionModes.ANIMATED}
      animateChanges={true}
      showRatingText={true}
      {...props}
    />
  );
}

// Rating summary component for showing distribution
export function RatingSummary({ 
  ratings = [], 
  averageRating, 
  totalRatings,
  size = 'medium',
  showDistribution = true,
  showAverage = true,
  ...props 
}) {
  const { colors } = useTheme();
  
  const distribution = useMemo(() => 
    ratingSystem.getRatingDistribution(ratings),
    [ratings]
  );

  const calculatedAverage = useMemo(() => 
    averageRating || ratingSystem.calculateAverageRating(ratings),
    [averageRating, ratings]
  );

  const calculatedTotal = useMemo(() => 
    totalRatings || ratings.length,
    [totalRatings, ratings]
  );

  const renderDistributionBar = useCallback((starCount, count) => {
    const percentage = calculatedTotal > 0 ? (count / calculatedTotal) * 100 : 0;
    
    return (
      <View key={starCount} style={styles.distributionRow}>
        <Text style={[styles.distributionLabel, { color: colors.foreground }]}>
          {starCount}
        </Text>
        <View style={[styles.distributionBar, { backgroundColor: colors.muted }]}>
          <View 
            style={[
              styles.distributionFill, 
              { 
                width: `${percentage}%`,
                backgroundColor: colors.primary,
              }
            ]} 
          />
        </View>
        <Text style={[styles.distributionCount, { color: colors.mutedForeground }]}>
          {count}
        </Text>
      </View>
    );
  }, [calculatedTotal, colors]);

  return (
    <View style={styles.summaryContainer}>
      {showAverage && (
        <View style={styles.averageSection}>
          <Text style={[styles.averageRating, { color: colors.foreground }]}>
            {calculatedAverage.toFixed(1)}
          </Text>
          <Rating
            rating={calculatedAverage}
            size={size}
            interactionMode={ratingSystem.interactionModes.DISPLAY}
            showRatingText={false}
            {...props}
          />
          <Text style={[styles.totalRatings, { color: colors.mutedForeground }]}>
            {calculatedTotal} {calculatedTotal === 1 ? 'review' : 'reviews'}
          </Text>
        </View>
      )}
      
      {showDistribution && (
        <View style={styles.distributionSection}>
          {[5, 4, 3, 2, 1].map(starCount =>
            renderDistributionBar(starCount, distribution[starCount])
          )}
        </View>
      )}
    </View>
  );
}

// Hook for rating state management
export const useRating = (initialRating = 0) => {
  const [rating, setRating] = useState(initialRating);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateRating = useCallback(async (newRating, onSubmit) => {
    setRating(newRating);
    
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(newRating);
      } catch (error) {
        console.error('Error submitting rating:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, []);

  const resetRating = useCallback(() => {
    setRating(0);
  }, []);

  return {
    rating,
    setRating,
    updateRating,
    resetRating,
    isSubmitting,
  };
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerLeft: {
    justifyContent: 'flex-start',
  },
  containerCenter: {
    justifyContent: 'center',
  },
  containerRight: {
    justifyContent: 'flex-end',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    padding: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 4,
  },
  summaryContainer: {
    width: '100%',
  },
  averageSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRating: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    marginBottom: 8,
  },
  totalRatings: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  distributionSection: {
    width: '100%',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  distributionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    width: 20,
    marginRight: 8,
  },
  distributionBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  distributionFill: {
    height: '100%',
    borderRadius: 3,
  },
  distributionCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    width: 30,
    textAlign: 'right',
  },
});

export { ratingSystem };