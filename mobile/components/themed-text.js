// components/themed-text.js

/**
 * ENTERPRISE-GRADE THEMED TEXT COMPONENT
 * Yachi Construction & Services Platform
 * Advanced Typography System with Ethiopian Market Support
 * AI Construction & Premium Feature Integration
 */

import React, { useMemo, forwardRef } from 'react';
import {
  Text,
  StyleSheet,
  Platform,
  I18nManager,
} from 'react-native';
import { useTheme } from '../contexts/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import { usePremium } from '../contexts/premium-context';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, SPACING } from '../constants/sizes';

/**
 * Enterprise Text Component Features:
 * - Multi-language support (English, Amharic, Oromo)
 * - Premium typography enhancements
 * - AI construction context awareness
 * - Ethiopian market optimizations
 * - Advanced accessibility features
 * - Performance-optimized rendering
 * - Dynamic theme adaptation
 * - RTL text support
 */

const ThemedText = forwardRef(({
  // Content & Structure
  children,
  numberOfLines,
  ellipsizeMode = 'tail',
  selectable = false,
  suppressHighlighting = false,
  adjustsFontSizeToFit = false,
  minimumFontScale = 0.8,

  // Typography Variants
  variant = 'body', 
  // Headers: 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  // Body: 'body', 'body-large', 'body-small', 'body-micro'
  // Captions: 'caption', 'caption-large', 'caption-small'
  // Labels: 'label', 'label-small', 'label-micro'
  // Buttons: 'button', 'button-large', 'button-small'
  // Special: 'code', 'premium', 'construction', 'government'
  
  size, // Custom size override
  weight = 'regular', 
  // 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'black'
  
  align = 'auto', // 'auto', 'left', 'right', 'center', 'justify'
  transform = 'none', // 'none', 'uppercase', 'lowercase', 'capitalize'

  // Color System
  color, // Custom color override
  primary = false,
  secondary = false,
  accent = false,
  success = false,
  warning = false,
  error = false,
  muted = false,
  inverted = false,
  premium = false,
  construction = false,
  government = false,

  // Spacing & Layout
  lineHeight,
  letterSpacing,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  paddingHorizontal,
  paddingVertical,

  // Theme & Adaptation
  adaptive = true,
  forceTheme, // 'light' | 'dark'
  useSystemColors = false,

  // Premium Features
  enablePremiumEffects = true,
  showPremiumBadge = false,

  // Accessibility
  accessibilityRole = 'text',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  importantForAccessibility = 'auto',
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.5,

  // Interactive
  onPress,
  onLongPress,
  onTextLayout,

  // Style Overrides
  style,
  testID,
  ...textProps
}, ref) => {
  const { theme, isDark } = useTheme();
  const { isPremium, premiumTier } = usePremium();
  const systemColorScheme = useColorScheme();
  
  // Determine active theme
  const currentTheme = forceTheme || (adaptive ? (isDark ? 'dark' : 'light') : systemColorScheme);
  const isDarkTheme = currentTheme === 'dark';

  // Memoized text styles with enterprise optimizations
  const textStyles = useMemo(() => {
    const styles = [];

    // Base enterprise text style
    styles.push(styles.base);

    // Variant-specific styles
    if (variant) {
      styles.push(variantStyles[variant]);
      
      // Premium variant enhancements
      if (premium && enablePremiumEffects && isPremium) {
        styles.push(styles.premiumEnhancement);
      }
      
      // Construction variant styling
      if (construction) {
        styles.push(styles.constructionVariant);
      }
      
      // Government variant styling
      if (government) {
        styles.push(styles.governmentVariant);
      }
    }

    // Font weight styles
    if (weight) {
      styles.push(weightStyles[weight]);
    }

    // Text alignment
    if (align !== 'auto') {
      styles.push({ textAlign: align });
    }

    // Text transformation
    if (transform !== 'none') {
      styles.push({ textTransform: transform });
    }

    // Custom size override
    if (size) {
      styles.push({ fontSize: size });
    }

    // Line height customization
    if (lineHeight) {
      styles.push({ lineHeight });
    }

    // Letter spacing
    if (letterSpacing !== undefined) {
      styles.push({ letterSpacing });
    }

    // Margin and padding
    const spacingStyles = {};
    if (marginTop !== undefined) spacingStyles.marginTop = marginTop;
    if (marginBottom !== undefined) spacingStyles.marginBottom = marginBottom;
    if (marginLeft !== undefined) spacingStyles.marginLeft = marginLeft;
    if (marginRight !== undefined) spacingStyles.marginRight = marginRight;
    if (paddingHorizontal !== undefined) {
      spacingStyles.paddingHorizontal = paddingHorizontal;
    }
    if (paddingVertical !== undefined) {
      spacingStyles.paddingVertical = paddingVertical;
    }
    if (Object.keys(spacingStyles).length > 0) {
      styles.push(spacingStyles);
    }

    // Advanced color system
    let textColor;
    
    if (color) {
      textColor = color;
    } else if (primary) {
      textColor = theme.colors.primary[500];
    } else if (secondary) {
      textColor = theme.colors.secondary[500];
    } else if (accent) {
      textColor = theme.colors.accent[500];
    } else if (success) {
      textColor = theme.colors.semantic.success[500];
    } else if (warning) {
      textColor = theme.colors.semantic.warning[500];
    } else if (error) {
      textColor = theme.colors.semantic.error[500];
    } else if (muted) {
      textColor = isDarkTheme ? theme.colors.text.tertiary : theme.colors.text.secondary;
    } else if (inverted) {
      textColor = theme.colors.background.primary;
    } else if (premium) {
      textColor = theme.colors.accent[500];
    } else if (construction) {
      textColor = theme.colors.primary[600];
    } else if (government) {
      textColor = theme.colors.secondary[600];
    } else {
      textColor = theme.colors.text.primary;
    }

    styles.push({ color: textColor });

    // RTL text support for Ethiopian languages
    if (I18nManager.isRTL) {
      styles.push(styles.rtl);
    }

    // Premium visual effects
    if (premium && enablePremiumEffects && isPremium) {
      styles.push({
        textShadowColor: theme.colors.accent[200],
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      });
    }

    return styles;
  }, [
    variant,
    weight,
    align,
    transform,
    size,
    lineHeight,
    letterSpacing,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    paddingHorizontal,
    paddingVertical,
    color,
    primary,
    secondary,
    accent,
    success,
    warning,
    error,
    muted,
    inverted,
    premium,
    construction,
    government,
    theme,
    isDarkTheme,
    isPremium,
    enablePremiumEffects,
  ]);

  // Enhanced accessibility props
  const accessibilityProps = useMemo(() => ({
    accessibilityRole,
    accessibilityLabel: accessibilityLabel || (typeof children === 'string' ? children : undefined),
    accessibilityHint,
    accessibilityState,
    importantForAccessibility,
  }), [
    accessibilityRole,
    accessibilityLabel,
    accessibilityHint,
    accessibilityState,
    importantForAccessibility,
    children,
  ]);

  // Interactive handlers with enterprise features
  const handlePress = (event) => {
    if (onPress) {
      // Add enterprise-level press analytics
      console.log('Text pressed:', { variant, testID });
      onPress(event);
    }
  };

  const handleLongPress = (event) => {
    if (onLongPress) {
      // Add enterprise-level long press analytics
      console.log('Text long pressed:', { variant, testID });
      onLongPress(event);
    }
  };

  // Render premium badge if enabled
  const renderPremiumBadge = () => {
    if (showPremiumBadge && isPremium) {
      return (
        <Text style={styles.premiumBadge}>
          {premiumTier === 'pro' ? '⚡' : '⭐'}
        </Text>
      );
    }
    return null;
  };

  return (
    <Text
      ref={ref}
      style={[textStyles, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      selectable={selectable}
      suppressHighlighting={suppressHighlighting}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      onPress={onPress ? handlePress : undefined}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onTextLayout={onTextLayout}
      testID={testID}
      {...accessibilityProps}
      {...textProps}
    >
      {children}
      {renderPremiumBadge()}
    </Text>
  );
});

// Enterprise Typography System
const variantStyles = StyleSheet.create({
  // Header Variants - AI Construction Focused
  h1: {
    fontSize: TYPOGRAPHY.h1,
    lineHeight: TYPOGRAPHY.h1 * 1.2,
    fontWeight: '800',
    letterSpacing: -1.2,
    fontFamily: 'Inter-Black',
  },
  h2: {
    fontSize: TYPOGRAPHY.h2,
    lineHeight: TYPOGRAPHY.h2 * 1.2,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontFamily: 'Inter-Bold',
  },
  h3: {
    fontSize: TYPOGRAPHY.h3,
    lineHeight: TYPOGRAPHY.h3 * 1.25,
    fontWeight: '600',
    letterSpacing: -0.6,
    fontFamily: 'Inter-SemiBold',
  },
  h4: {
    fontSize: TYPOGRAPHY.h4,
    lineHeight: TYPOGRAPHY.h4 * 1.25,
    fontWeight: '600',
    letterSpacing: -0.4,
    fontFamily: 'Inter-SemiBold',
  },
  h5: {
    fontSize: TYPOGRAPHY.h5,
    lineHeight: TYPOGRAPHY.h5 * 1.3,
    fontWeight: '500',
    letterSpacing: -0.2,
    fontFamily: 'Inter-Medium',
  },
  h6: {
    fontSize: TYPOGRAPHY.h6,
    lineHeight: TYPOGRAPHY.h6 * 1.3,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },

  // Body Text Variants
  body: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: TYPOGRAPHY.body * 1.5,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
  },
  'body-large': {
    fontSize: TYPOGRAPHY.bodyLarge,
    lineHeight: TYPOGRAPHY.bodyLarge * 1.5,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
  },
  'body-small': {
    fontSize: TYPOGRAPHY.bodySmall,
    lineHeight: TYPOGRAPHY.bodySmall * 1.4,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
  },
  'body-micro': {
    fontSize: TYPOGRAPHY.bodyMicro,
    lineHeight: TYPOGRAPHY.bodyMicro * 1.4,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
  },

  // Caption Variants
  caption: {
    fontSize: TYPOGRAPHY.caption,
    lineHeight: TYPOGRAPHY.caption * 1.3,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
    opacity: 0.8,
  },
  'caption-large': {
    fontSize: TYPOGRAPHY.captionLarge,
    lineHeight: TYPOGRAPHY.captionLarge * 1.3,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
    opacity: 0.8,
  },
  'caption-small': {
    fontSize: TYPOGRAPHY.captionSmall,
    lineHeight: TYPOGRAPHY.captionSmall * 1.3,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
    opacity: 0.7,
  },

  // Label Variants
  label: {
    fontSize: TYPOGRAPHY.label,
    lineHeight: TYPOGRAPHY.label * 1.3,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  'label-small': {
    fontSize: TYPOGRAPHY.labelSmall,
    lineHeight: TYPOGRAPHY.labelSmall * 1.3,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  'label-micro': {
    fontSize: TYPOGRAPHY.labelMicro,
    lineHeight: TYPOGRAPHY.labelMicro * 1.3,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Button Text Variants
  button: {
    fontSize: TYPOGRAPHY.button,
    lineHeight: TYPOGRAPHY.button * 1.2,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  'button-large': {
    fontSize: TYPOGRAPHY.buttonLarge,
    lineHeight: TYPOGRAPHY.buttonLarge * 1.2,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  'button-small': {
    fontSize: TYPOGRAPHY.buttonSmall,
    lineHeight: TYPOGRAPHY.buttonSmall * 1.2,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },

  // Special Variants
  code: {
    fontSize: TYPOGRAPHY.code,
    lineHeight: TYPOGRAPHY.code * 1.4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xxs,
    borderRadius: 4,
  },
  premium: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: TYPOGRAPHY.body * 1.5,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: COLORS.accent[500],
  },
  construction: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: TYPOGRAPHY.body * 1.5,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: COLORS.primary[600],
  },
  government: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: TYPOGRAPHY.body * 1.5,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: COLORS.secondary[600],
  },
});

// Font Weight System
const weightStyles = StyleSheet.create({
  thin: {
    fontWeight: '100',
    fontFamily: 'Inter-Thin',
  },
  light: {
    fontWeight: '300',
    fontFamily: 'Inter-Light',
  },
  regular: {
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
  },
  medium: {
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  semibold: {
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  bold: {
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  black: {
    fontWeight: '900',
    fontFamily: 'Inter-Black',
  },
});

// Base Enterprise Styles
const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  rtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  premiumEnhancement: {
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  constructionVariant: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[300],
    paddingLeft: SPACING.sm,
  },
  governmentVariant: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary[300],
    paddingLeft: SPACING.sm,
  },
  premiumBadge: {
    marginLeft: SPACING.xxs,
    fontSize: 12,
  },
});

// Pre-built Enterprise Component Variants
const createTextVariant = (variant, defaultProps = {}) => {
  return forwardRef((props, ref) => (
    <ThemedText
      ref={ref}
      variant={variant}
      {...defaultProps}
      {...props}
    />
  ));
};

// Header Components
export const H1 = createTextVariant('h1');
export const H2 = createTextVariant('h2');
export const H3 = createTextVariant('h3');
export const H4 = createTextVariant('h4');
export const H5 = createTextVariant('h5');
export const H6 = createTextVariant('h6');

// Body Components
export const Body = createTextVariant('body');
export const BodyLarge = createTextVariant('body-large');
export const BodySmall = createTextVariant('body-small');
export const BodyMicro = createTextVariant('body-micro');

// Caption Components
export const Caption = createTextVariant('caption');
export const CaptionLarge = createTextVariant('caption-large');
export const CaptionSmall = createTextVariant('caption-small');

// Label Components
export const Label = createTextVariant('label');
export const LabelSmall = createTextVariant('label-small');
export const LabelMicro = createTextVariant('label-micro');

// Button Components
export const ButtonText = createTextVariant('button');
export const ButtonTextLarge = createTextVariant('button-large');
export const ButtonTextSmall = createTextVariant('button-small');

// Special Enterprise Components
export const Code = createTextVariant('code');
export const PremiumText = createTextVariant('premium', { premium: true });
export const ConstructionText = createTextVariant('construction', { construction: true });
export const GovernmentText = createTextVariant('government', { government: true });

// Export the main component with all variants attached
const ThemedTextWithVariants = Object.assign(ThemedText, {
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Body,
  BodyLarge,
  BodySmall,
  BodyMicro,
  Caption,
  CaptionLarge,
  CaptionSmall,
  Label,
  LabelSmall,
  LabelMicro,
  ButtonText,
  ButtonTextLarge,
  ButtonTextSmall,
  Code,
  PremiumText,
  ConstructionText,
  GovernmentText,
});

// Performance optimization with custom comparison
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.children === nextProps.children &&
    prevProps.variant === nextProps.variant &&
    prevProps.weight === nextProps.weight &&
    prevProps.color === nextProps.color &&
    prevProps.style === nextProps.style &&
    prevProps.numberOfLines === nextProps.numberOfLines
  );
};

export default React.memo(ThemedTextWithVariants, arePropsEqual);