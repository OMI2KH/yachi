// components/themed-view.js

/**
 * ENTERPRISE-GRADE THEMED VIEW COMPONENT
 * Yachi Construction & Services Platform
 * Advanced Layout System with AI Construction Integration
 * Ethiopian Market Optimized Performance
 */

import React, { useMemo, forwardRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
  I18nManager,
  LayoutAnimation,
  UIManager,
  Insets,
  DimensionValue,
} from 'react-native';
import { useTheme } from '../contexts/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import { usePremium } from '../contexts/premium-context';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS, ELEVATION } from '../constants/sizes';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ThemedView = forwardRef(({
  // Content & Layout
  children,
  style,
  testID,
  
  // Semantic Variants - Enterprise Enhanced
  variant = 'default', 
  // 'default', 'elevated', 'filled', 'outlined', 'ghost', 
  // 'premium', 'construction', 'government', 'ai-enhanced'
  
  background, // Custom background override
  primary = false,
  secondary = false,
  accent = false,
  success = false,
  warning = false,
  error = false,
  muted = false,
  inverted = false,
  transparent = false,
  construction = false,
  government = false,
  premium = false,
  
  // Advanced Elevation System
  elevation = 0, // 0-24 material design + enterprise levels
  shadow, // Custom shadow properties
  enableAdvancedShadows = true,
  
  // Border System
  border = false,
  borderColor,
  borderWidth,
  borderRadius,
  rounded = 'none', // 'none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'
  borderTop,
  borderBottom,
  borderLeft,
  borderRight,
  
  // Spacing System - Enterprise Scale
  padding,
  paddingVertical,
  paddingHorizontal,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  paddingStart,
  paddingEnd,
  margin,
  marginVertical,
  marginHorizontal,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  marginStart,
  marginEnd,
  
  // Advanced Flexbox System
  flex,
  flexDirection = 'column',
  justifyContent,
  alignItems,
  alignSelf,
  flexWrap,
  flexGrow,
  flexShrink,
  flexBasis,
  gap,
  rowGap,
  columnGap,
  
  // Sizing & Dimensions
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  aspectRatio,
  
  // Position & Layout
  position,
  top,
  right,
  bottom,
  left,
  zIndex,
  overflow = 'visible',
  
  // Interactive States - Enterprise Enhanced
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  pressedStyle,
  hoverStyle,
  focusStyle,
  disabled = false,
  activeOpacity = 0.8,
  hoverOpacity = 0.9,
  
  // Animation System
  animated = false,
  enterAnimation,
  exitAnimation,
  transition = 'none', // 'fade', 'scale', 'slide', 'bounce'
  animationDuration = 300,
  
  // Theme & Adaptation
  adaptive = true,
  forceTheme,
  useSystemColors = false,
  
  // Premium Features
  enablePremiumEffects = true,
  premiumGlow = false,
  
  // Accessibility - Enterprise Grade
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = onPress ? 'button' : 'none',
  accessibilityState,
  importantForAccessibility = 'auto',
  accessible = true,
  accessibilityActions,
  onAccessibilityAction,
  
  // Safe Area Handling
  safeArea = false,
  safeAreaTop = false,
  safeAreaBottom = false,
  safeAreaLeft = false,
  safeAreaRight = false,
  safeAreaInsets,
  
  // Performance & Optimization
  shouldRasterizeIOS = false,
  renderToHardwareTextureAndroid = false,
  
  // Other Properties
  pointerEvents,
  hitSlop,
  needsOffscreenAlphaCompositing = false,
  
  ...viewProps
}, ref) => {
  const { theme, isDark } = useTheme();
  const { isPremium, premiumTier } = usePremium();
  const systemColorScheme = useColorScheme();
  
  // State for interactive effects
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Determine active theme
  const currentTheme = forceTheme || (adaptive ? (isDark ? 'dark' : 'light') : systemColorScheme);
  const isDarkTheme = currentTheme === 'dark';

  // Enhanced memoized view styles with enterprise features
  const viewStyles = useMemo(() => {
    const styles = [];

    // Base enterprise view style
    styles.push(styles.base);

    // Advanced background color system
    let backgroundColor;

    if (background) {
      backgroundColor = background;
    } else if (primary) {
      backgroundColor = theme.colors.primary[500];
    } else if (secondary) {
      backgroundColor = theme.colors.secondary[500];
    } else if (accent) {
      backgroundColor = theme.colors.accent[500];
    } else if (success) {
      backgroundColor = theme.colors.semantic.success[500];
    } else if (warning) {
      backgroundColor = theme.colors.semantic.warning[500];
    } else if (error) {
      backgroundColor = theme.colors.semantic.error[500];
    } else if (muted) {
      backgroundColor = isDarkTheme ? theme.colors.background.muted : theme.colors.background.secondary;
    } else if (inverted) {
      backgroundColor = theme.colors.text.primary;
    } else if (transparent) {
      backgroundColor = 'transparent';
    } else if (construction) {
      backgroundColor = theme.colors.primary[50];
    } else if (government) {
      backgroundColor = theme.colors.secondary[50];
    } else if (premium) {
      backgroundColor = theme.colors.accent[50];
    } else {
      backgroundColor = theme.colors.background.primary;
    }

    // Apply variant-specific enhancements
    switch (variant) {
      case 'elevated':
        backgroundColor = isDarkTheme 
          ? theme.colors.background.elevated 
          : theme.colors.surface.elevated;
        break;
      case 'filled':
        const fillColor = primary ? theme.colors.primary[500] :
          secondary ? theme.colors.secondary[500] :
          accent ? theme.colors.accent[500] :
          theme.colors.primary[500];
        backgroundColor = isDarkTheme 
          ? `${fillColor}30` 
          : `${fillColor}15`;
        break;
      case 'outlined':
        backgroundColor = 'transparent';
        break;
      case 'ghost':
        backgroundColor = 'transparent';
        break;
      case 'premium':
        backgroundColor = isPremium ? theme.colors.accent[50] : theme.colors.background.primary;
        break;
      case 'construction':
        backgroundColor = theme.colors.primary[50];
        break;
      case 'government':
        backgroundColor = theme.colors.secondary[50];
        break;
      case 'ai-enhanced':
        backgroundColor = isDarkTheme 
          ? 'rgba(74, 144, 226, 0.1)' 
          : 'rgba(74, 144, 226, 0.05)';
        break;
    }

    styles.push({ backgroundColor });

    // Enterprise elevation and shadow system
    if (elevation > 0) {
      const elevationStyle = getElevationStyle(elevation, isDarkTheme, enableAdvancedShadows);
      styles.push(elevationStyle);
    }

    // Custom shadow override
    if (shadow) {
      styles.push(shadow);
    }

    // Premium glow effect
    if (premiumGlow && isPremium && enablePremiumEffects) {
      styles.push(styles.premiumGlow);
    }

    // Advanced border system
    const borderStyles = {};
    
    if (border || variant === 'outlined') {
      const borderWidthValue = borderWidth || (variant === 'outlined' ? 1 : StyleSheet.hairlineWidth);
      let borderColorValue = borderColor;
      
      if (!borderColorValue) {
        if (variant === 'outlined') {
          borderColorValue = isDarkTheme ? theme.colors.border.primary : theme.colors.border.secondary;
        } else if (construction) {
          borderColorValue = theme.colors.primary[300];
        } else if (government) {
          borderColorValue = theme.colors.secondary[300];
        } else if (premium) {
          borderColorValue = theme.colors.accent[300];
        } else {
          borderColorValue = isDarkTheme ? theme.colors.border.primary : theme.colors.border.secondary;
        }
      }
      
      borderStyles.borderWidth = borderWidthValue;
      borderStyles.borderColor = borderColorValue;
    }

    // Individual border sides
    if (borderTop) borderStyles.borderTopWidth = borderTop;
    if (borderBottom) borderStyles.borderBottomWidth = borderBottom;
    if (borderLeft) borderStyles.borderLeftWidth = borderLeft;
    if (borderRight) borderStyles.borderRightWidth = borderRight;

    if (Object.keys(borderStyles).length > 0) {
      styles.push(borderStyles);
    }

    // Border radius system
    if (borderRadius) {
      styles.push({ borderRadius });
    } else if (rounded !== 'none') {
      const radiusValue = getBorderRadius(rounded);
      styles.push({ borderRadius: radiusValue });
    }

    // Enhanced spacing system with RTL support
    const spacingStyles = {};
    const spacingProps = {
      padding,
      paddingVertical,
      paddingHorizontal,
      paddingTop,
      paddingBottom,
      paddingLeft: I18nManager.isRTL ? paddingEnd : paddingLeft,
      paddingRight: I18nManager.isRTL ? paddingStart : paddingRight,
      paddingStart,
      paddingEnd,
      margin,
      marginVertical,
      marginHorizontal,
      marginTop,
      marginBottom,
      marginLeft: I18nManager.isRTL ? marginEnd : marginLeft,
      marginRight: I18nManager.isRTL ? marginStart : marginRight,
      marginStart,
      marginEnd,
    };

    Object.keys(spacingProps).forEach(key => {
      if (spacingProps[key] !== undefined) {
        spacingStyles[key] = spacingProps[key];
      }
    });

    if (Object.keys(spacingStyles).length > 0) {
      styles.push(spacingStyles);
    }

    // Advanced flexbox system
    const flexStyles = {
      flex,
      flexDirection,
      justifyContent,
      alignItems,
      alignSelf,
      flexWrap,
      flexGrow,
      flexShrink,
      flexBasis,
      gap,
      rowGap,
      columnGap,
    };

    Object.keys(flexStyles).forEach(key => {
      if (flexStyles[key] !== undefined) {
        styles.push({ [key]: flexStyles[key] });
      }
    });

    // Sizing and dimensions
    const sizingStyles = {
      width,
      height,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      aspectRatio,
    };

    Object.keys(sizingStyles).forEach(key => {
      if (sizingStyles[key] !== undefined) {
        styles.push({ [key]: sizingStyles[key] });
      }
    });

    // Position and layout
    const positionStyles = {
      position,
      top,
      right,
      bottom,
      left,
      zIndex,
      overflow,
    };

    Object.keys(positionStyles).forEach(key => {
      if (positionStyles[key] !== undefined) {
        styles.push({ [key]: positionStyles[key] });
      }
    });

    // Interactive state styles
    if (isPressed && pressedStyle) {
      styles.push(pressedStyle);
    }
    if (isHovered && hoverStyle) {
      styles.push(hoverStyle);
    }
    if (isFocused && focusStyle) {
      styles.push(focusStyle);
    }

    // RTL layout support for Ethiopian languages
    if (I18nManager.isRTL) {
      styles.push(styles.rtl);
    }

    return styles;
  }, [
    theme,
    isDarkTheme,
    variant,
    background,
    primary,
    secondary,
    accent,
    success,
    warning,
    error,
    muted,
    inverted,
    transparent,
    construction,
    government,
    premium,
    elevation,
    shadow,
    enableAdvancedShadows,
    border,
    borderColor,
    borderWidth,
    borderRadius,
    rounded,
    borderTop,
    borderBottom,
    borderLeft,
    borderRight,
    padding,
    paddingVertical,
    paddingHorizontal,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingStart,
    paddingEnd,
    margin,
    marginVertical,
    marginHorizontal,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginStart,
    marginEnd,
    flex,
    flexDirection,
    justifyContent,
    alignItems,
    alignSelf,
    flexWrap,
    flexGrow,
    flexShrink,
    flexBasis,
    gap,
    rowGap,
    columnGap,
    width,
    height,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    aspectRatio,
    position,
    top,
    right,
    bottom,
    left,
    zIndex,
    overflow,
    isPressed,
    isHovered,
    isFocused,
    isPremium,
    enablePremiumEffects,
    premiumGlow,
  ]);

  // Enhanced accessibility props
  const accessibilityProps = useMemo(() => ({
    accessible,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole: disabled ? 'none' : accessibilityRole,
    accessibilityState: disabled ? { ...accessibilityState, disabled: true } : accessibilityState,
    importantForAccessibility,
    accessibilityActions,
    onAccessibilityAction,
  }), [
    accessible,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    accessibilityState,
    importantForAccessibility,
    accessibilityActions,
    onAccessibilityAction,
    disabled,
  ]);

  // Interactive event handlers with animations
  const handlePressIn = (event) => {
    setIsPressed(true);
    
    // Scale animation on press
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();

    onPressIn?.(event);
  };

  const handlePressOut = (event) => {
    setIsPressed(false);
    
    // Restore scale
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    onPressOut?.(event);
  };

  const handlePress = (event) => {
    if (onPress && !disabled) {
      // Enterprise press analytics
      console.log('ThemedView pressed:', { variant, testID, construction, government, premium });
      
      // Animation if specified
      if (enterAnimation) {
        LayoutAnimation.configureNext(enterAnimation);
      }
      
      onPress(event);
    }
  };

  const handleLongPress = (event) => {
    if (onLongPress && !disabled) {
      onLongPress(event);
    }
  };

  const handleHoverIn = (event) => {
    setIsHovered(true);
    onHoverIn?.(event);
  };

  const handleHoverOut = (event) => {
    setIsHovered(false);
    onHoverOut?.(event);
  };

  const handleFocus = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  // Safe area rendering
  const renderWithSafeArea = (content) => {
    if (!safeArea && !safeAreaTop && !safeAreaBottom && !safeAreaLeft && !safeAreaRight) {
      return content;
    }

    const safeAreaStyles = {
      paddingTop: safeArea || safeAreaTop ? (safeAreaInsets?.top || theme.insets?.top || 0) : 0,
      paddingBottom: safeArea || safeAreaBottom ? (safeAreaInsets?.bottom || theme.insets?.bottom || 0) : 0,
      paddingLeft: safeArea || safeAreaLeft ? (safeAreaInsets?.left || theme.insets?.left || 0) : 0,
      paddingRight: safeArea || safeAreaRight ? (safeAreaInsets?.right || theme.insets?.right || 0) : 0,
    };

    return (
      <View style={safeAreaStyles}>
        {content}
      </View>
    );
  };

  // Choose base component with animation support
  const BaseComponent = animated ? Animated.View : (onPress ? Pressable : View);

  const baseProps = {
    ref,
    style: [viewStyles, style],
    testID,
    pointerEvents: disabled ? 'none' : pointerEvents,
    hitSlop,
    needsOffscreenAlphaCompositing,
    shouldRasterizeIOS,
    renderToHardwareTextureAndroid,
    ...accessibilityProps,
    ...viewProps,
  };

  // Add interactive props if pressable
  if (onPress) {
    baseProps.onPress = handlePress;
    baseProps.onLongPress = handleLongPress;
    baseProps.onPressIn = handlePressIn;
    baseProps.onPressOut = handlePressOut;
    baseProps.onHoverIn = handleHoverIn;
    baseProps.onHoverOut = handleHoverOut;
    baseProps.onFocus = handleFocus;
    baseProps.onBlur = handleBlur;
    baseProps.disabled = disabled;

    // Enhanced pressable style with animations
    if (animated) {
      baseProps.style = [
        viewStyles,
        style,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ];
    }
  }

  const content = (
    <BaseComponent {...baseProps}>
      {children}
    </BaseComponent>
  );

  return renderWithSafeArea(content);
});

// Enterprise elevation system
const getElevationStyle = (elevation, isDark = false, enableAdvanced = true) => {
  const baseElevation = ELEVATION[elevation] || ELEVATION[0];
  
  if (!enableAdvanced) {
    return baseElevation;
  }

  // Enhanced shadows for premium experience
  const enhancedShadows = {
    shadowColor: isDark ? 'rgba(0,0,0,0.8)' : baseElevation.shadowColor,
    shadowOffset: baseElevation.shadowOffset,
    shadowOpacity: isDark ? baseElevation.shadowOpacity * 1.2 : baseElevation.shadowOpacity,
    shadowRadius: baseElevation.shadowRadius * (isDark ? 1.1 : 1),
    elevation: baseElevation.elevation,
  };

  return enhancedShadows;
};

// Enhanced border radius system
const getBorderRadius = (rounded) => {
  return BORDER_RADIUS[rounded] || 0;
};

// Enterprise-grade Styles
const styles = StyleSheet.create({
  base: {
    // Base enterprise view styles
  },
  rtl: {
    // RTL specific layout adjustments
  },
  premiumGlow: {
    shadowColor: COLORS.accent[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

// Pre-built Enterprise Component Variants
const createViewVariant = (variant, defaultProps = {}) => {
  return forwardRef((props, ref) => (
    <ThemedView
      ref={ref}
      variant={variant}
      {...defaultProps}
      {...props}
    />
  ));
};

// Export enterprise variants
export const Card = createViewVariant('elevated', { 
  rounded: 'lg', 
  padding: SPACING.lg 
});

export const Surface = createViewVariant('elevated', {
  rounded: 'md',
  padding: SPACING.md,
});

export const Container = createViewVariant('default', {
  padding: SPACING.lg,
});

export const Section = createViewVariant('default', {
  paddingVertical: SPACING.xl,
  paddingHorizontal: SPACING.lg,
});

export const Divider = createViewVariant('outlined', {
  height: StyleSheet.hairlineWidth,
  marginVertical: SPACING.md,
  borderWidth: 0,
  backgroundColor: COLORS.neutral[300],
});

export const Badge = createViewVariant('filled', {
  paddingHorizontal: SPACING.sm,
  paddingVertical: SPACING.xs,
  rounded: 'full',
  alignSelf: 'flex-start',
});

export const Chip = createViewVariant('outlined', {
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.sm,
  rounded: 'full',
  alignSelf: 'flex-start',
  borderWidth: 1,
});

// Enterprise-specific variants
export const ConstructionCard = createViewVariant('construction', {
  rounded: 'lg',
  padding: SPACING.lg,
  border: true,
  borderColor: COLORS.primary[300],
});

export const GovernmentPanel = createViewVariant('government', {
  rounded: 'md',
  padding: SPACING.lg,
  border: true,
  borderColor: COLORS.secondary[300],
});

export const PremiumContainer = createViewVariant('premium', {
  rounded: 'xl',
  padding: SPACING.xl,
  premiumGlow: true,
});

export const AIEnhancedView = createViewVariant('ai-enhanced', {
  rounded: 'lg',
  padding: SPACING.lg,
  border: true,
  borderColor: 'rgba(74, 144, 226, 0.3)',
});

// Export the main component with all enterprise variants
const ThemedViewWithVariants = Object.assign(ThemedView, {
  Card,
  Surface,
  Container,
  Section,
  Divider,
  Badge,
  Chip,
  ConstructionCard,
  GovernmentPanel,
  PremiumContainer,
  AIEnhancedView,
});

// Display name for debugging
ThemedView.displayName = 'ThemedView';

// Performance optimization
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.children === nextProps.children &&
    prevProps.variant === nextProps.variant &&
    prevProps.style === nextProps.style &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.onPress === nextProps.onPress
  );
};

export default React.memo(ThemedViewWithVariants, arePropsEqual);