// components/haptic-tab.js
// ============================================================
// YACHI ENTERPRISE HAPTIC TAB COMPONENT
// ============================================================

import React, { useRef, useCallback, useMemo, forwardRef, useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  I18nManager,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Context
import { useTheme } from '../contexts/theme-context';
import { useLanguage } from './ui/language-selector';

// Services
import { analyticsService } from '../services/analytics-service';

// Constants
import { YachiColors } from '../constants/colors';
import { AppConfig } from '../config/app';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

class YachiHapticTabService {
  constructor() {
    this.tabVariants = this.getTabVariants();
    this.tabSizes = this.getTabSizes();
    this.hapticTypes = this.getHapticTypes();
    this.animationTypes = this.getAnimationTypes();
    this.badgeTypes = this.getBadgeTypes();
  }

  getTabVariants() {
    return {
      PRIMARY: 'primary',
      SECONDARY: 'secondary',
      TERTIARY: 'tertiary',
      OUTLINE: 'outline',
      GHOST: 'ghost',
      FLOATING: 'floating',
      ICON: 'icon',
    };
  }

  getTabSizes() {
    return {
      SMALL: 'small',
      MEDIUM: 'medium',
      LARGE: 'large',
      XLARGE: 'xlarge',
    };
  }

  getHapticTypes() {
    return {
      LIGHT: 'light',
      MEDIUM: 'medium',
      HEAVY: 'heavy',
      SUCCESS: 'success',
      WARNING: 'warning',
      ERROR: 'error',
      SELECTION: 'selection',
      NONE: 'none',
    };
  }

  getAnimationTypes() {
    return {
      SCALE: 'scale',
      FADE: 'fade',
      SLIDE: 'slide',
      BOUNCE: 'bounce',
      SPRING: 'spring',
      NONE: 'none',
    };
  }

  getBadgeTypes() {
    return {
      DOT: 'dot',
      NUMBER: 'number',
      TEXT: 'text',
      ICON: 'icon',
    };
  }

  getVariantConfig(variant, colors) {
    const configs = {
      [this.tabVariants.PRIMARY]: {
        backgroundColor: colors.primary,
        textColor: '#FFFFFF',
        borderColor: colors.primary,
        activeBackgroundColor: colors.primary,
        activeTextColor: '#FFFFFF',
        inactiveBackgroundColor: colors.muted,
        inactiveTextColor: colors.mutedForeground,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        showIcon: true,
        showLabel: true,
      },
      [this.tabVariants.SECONDARY]: {
        backgroundColor: colors.secondary,
        textColor: colors.secondaryForeground,
        borderColor: colors.secondary,
        activeBackgroundColor: colors.secondary,
        activeTextColor: colors.secondaryForeground,
        inactiveBackgroundColor: colors.muted,
        inactiveTextColor: colors.mutedForeground,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 6,
        showIcon: true,
        showLabel: true,
      },
      [this.tabVariants.TERTIARY]: {
        backgroundColor: 'transparent',
        textColor: colors.foreground,
        borderColor: 'transparent',
        activeBackgroundColor: colors.primary + '20',
        activeTextColor: colors.primary,
        inactiveBackgroundColor: 'transparent',
        inactiveTextColor: colors.mutedForeground,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        showIcon: true,
        showLabel: true,
      },
      [this.tabVariants.OUTLINE]: {
        backgroundColor: 'transparent',
        textColor: colors.primary,
        borderColor: colors.primary,
        activeBackgroundColor: colors.primary,
        activeTextColor: '#FFFFFF',
        inactiveBackgroundColor: 'transparent',
        inactiveTextColor: colors.mutedForeground,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1,
        showIcon: true,
        showLabel: true,
      },
      [this.tabVariants.GHOST]: {
        backgroundColor: 'transparent',
        textColor: colors.foreground,
        borderColor: 'transparent',
        activeBackgroundColor: 'transparent',
        activeTextColor: colors.primary,
        inactiveBackgroundColor: 'transparent',
        inactiveTextColor: colors.mutedForeground,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 0,
        showIcon: true,
        showLabel: true,
      },
      [this.tabVariants.FLOATING]: {
        backgroundColor: colors.card,
        textColor: colors.foreground,
        borderColor: colors.border,
        activeBackgroundColor: colors.primary,
        activeTextColor: '#FFFFFF',
        inactiveBackgroundColor: colors.card,
        inactiveTextColor: colors.mutedForeground,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadow: true,
        showIcon: true,
        showLabel: true,
      },
      [this.tabVariants.ICON]: {
        backgroundColor: colors.muted,
        textColor: colors.foreground,
        borderColor: colors.border,
        activeBackgroundColor: colors.primary,
        activeTextColor: '#FFFFFF',
        inactiveBackgroundColor: colors.muted,
        inactiveTextColor: colors.mutedForeground,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 20,
        showIcon: true,
        showLabel: false,
      },
    };

    return configs[variant] || configs[this.tabVariants.PRIMARY];
  }

  getSizeConfig(size) {
    const configs = {
      [this.tabSizes.SMALL]: {
        iconSize: 16,
        fontSize: 12,
        badgeSize: 14,
        minHeight: 32,
      },
      [this.tabSizes.MEDIUM]: {
        iconSize: 18,
        fontSize: 14,
        badgeSize: 16,
        minHeight: 40,
      },
      [this.tabSizes.LARGE]: {
        iconSize: 20,
        fontSize: 16,
        badgeSize: 18,
        minHeight: 48,
      },
      [this.tabSizes.XLARGE]: {
        iconSize: 24,
        fontSize: 18,
        badgeSize: 20,
        minHeight: 56,
      },
    };

    return configs[size] || configs[this.tabSizes.MEDIUM];
  }

  getAnimationConfig(animationType) {
    const configs = {
      [this.animationTypes.SCALE]: {
        pressIn: { toValue: 0.95, duration: 100 },
        pressOut: { toValue: 1, duration: 150 },
      },
      [this.animationTypes.FADE]: {
        pressIn: { toValue: 0.7, duration: 100 },
        pressOut: { toValue: 1, duration: 150 },
      },
      [this.animationTypes.SLIDE]: {
        pressIn: { toValue: -2, duration: 100 },
        pressOut: { toValue: 0, duration: 150 },
      },
      [this.animationTypes.BOUNCE]: {
        pressIn: { toValue: 0.9, duration: 100, bounciness: 0 },
        pressOut: { toValue: 1, duration: 200, bounciness: 1 },
      },
      [this.animationTypes.SPRING]: {
        pressIn: { toValue: 0.95, tension: 150, friction: 3 },
        pressOut: { toValue: 1, tension: 150, friction: 3 },
      },
      [this.animationTypes.NONE]: {
        pressIn: { toValue: 1, duration: 0 },
        pressOut: { toValue: 1, duration: 0 },
      },
    };

    return configs[animationType] || configs[this.animationTypes.SCALE];
  }

  triggerHaptic(type) {
    if (type === this.hapticTypes.NONE || Platform.OS === 'web') return;

    try {
      const hapticMap = {
        [this.hapticTypes.LIGHT]: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        [this.hapticTypes.MEDIUM]: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        [this.hapticTypes.HEAVY]: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
        [this.hapticTypes.SUCCESS]: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        [this.hapticTypes.WARNING]: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
        [this.hapticTypes.ERROR]: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
        [this.hapticTypes.SELECTION]: () => Haptics.selectionAsync(),
      };

      hapticMap[type]?.();
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  formatBadgeValue(badge, type) {
    if (!badge) return '';

    switch (type) {
      case this.badgeTypes.NUMBER:
        return badge > 99 ? '99+' : badge.toString();
      case this.badgeTypes.TEXT:
        return badge;
      case this.badgeTypes.ICON:
        return badge;
      default:
        return '';
    }
  }

  shouldShowBadge(badge, type) {
    if (!badge) return false;
    
    if (type === this.badgeTypes.NUMBER) {
      return badge > 0;
    }
    
    if (type === this.badgeTypes.DOT) {
      return badge.visible !== false;
    }
    
    if (type === this.badgeTypes.TEXT) {
      return !!badge;
    }
    
    if (type === this.badgeTypes.ICON) {
      return !!badge;
    }
    
    return false;
  }
}

// Singleton instance
export const hapticTabService = new YachiHapticTabService();

/**
 * Enterprise Haptic Tab Component with Advanced Features
 * Supports multiple variants, haptic feedback, animations, and badges
 */
const HapticTab = forwardRef(({
  // Core Props
  children,
  icon,
  label,
  badge,
  
  // State
  active = false,
  disabled = false,
  loading = false,
  
  // Configuration
  variant = hapticTabService.tabVariants.PRIMARY,
  size = hapticTabService.tabSizes.MEDIUM,
  hapticType = hapticTabService.hapticTypes.LIGHT,
  animationType = hapticTabService.animationTypes.SCALE,
  badgeType = hapticTabService.badgeTypes.NUMBER,
  
  // Behavior
  hapticEnabled = true,
  animated = true,
  showBadge = true,
  
  // Styling
  activeColor,
  inactiveColor,
  badgeColor,
  iconPosition = 'left',
  
  // Customization
  customIcon,
  LoadingComponent,
  
  // Technical
  testID = 'yachi-haptic-tab',
  accessibilityLabel,
  accessibilityRole = 'tab',
  analyticsEvent = 'tab_interaction',
  
  // Events
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  
  // Style overrides
  style,
  activeStyle,
  disabledStyle,
  loadingStyle,
  badgeStyle,
  iconStyle,
  textStyle,
  
  ...pressableProps
}, ref) => {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  
  // Refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Memoized values
  const variantConfig = useMemo(() => 
    hapticTabService.getVariantConfig(variant, colors),
    [variant, colors]
  );

  const sizeConfig = useMemo(() => 
    hapticTabService.getSizeConfig(size),
    [size]
  );

  const animationConfig = useMemo(() => 
    hapticTabService.getAnimationConfig(animationType),
    [animationType]
  );

  const resolvedAccessibilityLabel = useMemo(() => 
    accessibilityLabel || label || 'Tab button',
    [accessibilityLabel, label]
  );

  const shouldShowBadge = useMemo(() => 
    showBadge && hapticTabService.shouldShowBadge(badge, badgeType),
    [showBadge, badge, badgeType]
  );

  const badgeValue = useMemo(() => 
    hapticTabService.formatBadgeValue(badge, badgeType),
    [badge, badgeType]
  );

  // Animation methods
  const animatePressIn = useCallback(() => {
    if (!animated || disabled || loading) return;

    const config = animationConfig.pressIn;
    
    switch (animationType) {
      case hapticTabService.animationTypes.SCALE:
      case hapticTabService.animationTypes.BOUNCE:
      case hapticTabService.animationTypes.SPRING:
        Animated.spring(scaleAnim, {
          ...config,
          useNativeDriver: true,
        }).start();
        break;
      case hapticTabService.animationTypes.FADE:
        Animated.timing(opacityAnim, {
          ...config,
          useNativeDriver: true,
        }).start();
        break;
      case hapticTabService.animationTypes.SLIDE:
        Animated.timing(slideAnim, {
          ...config,
          useNativeDriver: true,
        }).start();
        break;
    }
  }, [animated, disabled, loading, animationConfig, animationType, scaleAnim, opacityAnim, slideAnim]);

  const animatePressOut = useCallback(() => {
    if (!animated || disabled || loading) return;

    const config = animationConfig.pressOut;
    
    switch (animationType) {
      case hapticTabService.animationTypes.SCALE:
      case hapticTabService.animationTypes.BOUNCE:
      case hapticTabService.animationTypes.SPRING:
        Animated.spring(scaleAnim, {
          ...config,
          useNativeDriver: true,
        }).start();
        break;
      case hapticTabService.animationTypes.FADE:
        Animated.timing(opacityAnim, {
          ...config,
          useNativeDriver: true,
        }).start();
        break;
      case hapticTabService.animationTypes.SLIDE:
        Animated.timing(slideAnim, {
          ...config,
          useNativeDriver: true,
        }).start();
        break;
    }
  }, [animated, disabled, loading, animationConfig, animationType, scaleAnim, opacityAnim, slideAnim]);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (!hapticEnabled || disabled || loading) return;
    hapticTabService.triggerHaptic(hapticType);
  }, [hapticEnabled, disabled, loading, hapticType]);

  // Event handlers
  const handlePress = useCallback((event) => {
    if (disabled || loading) return;

    triggerHaptic();
    
    // Track analytics
    analyticsService.trackEvent(analyticsEvent, {
      label,
      active,
      variant,
      timestamp: new Date().toISOString(),
    });

    onPress?.(event);
  }, [disabled, loading, triggerHaptic, label, active, variant, analyticsEvent, onPress]);

  const handlePressIn = useCallback((event) => {
    if (disabled || loading) return;

    animatePressIn();
    onPressIn?.(event);
  }, [disabled, loading, animatePressIn, onPressIn]);

  const handlePressOut = useCallback((event) => {
    if (disabled || loading) return;

    animatePressOut();
    onPressOut?.(event);
  }, [disabled, loading, animatePressOut, onPressOut]);

  const handleLongPress = useCallback((event) => {
    if (disabled || loading) return;

    // Use heavy haptic for long press
    hapticTabService.triggerHaptic(hapticTabService.hapticTypes.HEAVY);
    onLongPress?.(event);
  }, [disabled, loading, onLongPress]);

  // Active state animation
  useEffect(() => {
    if (animated && active) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          200,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      );
    }
  }, [active, animated]);

  // Render methods
  const renderIcon = useCallback(() => {
    if (!variantConfig.showIcon && !icon && !customIcon) return null;

    const iconName = customIcon || icon;
    const iconColor = active ? variantConfig.activeTextColor : variantConfig.textColor;

    if (React.isValidElement(iconName)) {
      return React.cloneElement(iconName, {
        style: [styles.icon, { color: iconColor }, iconStyle],
        size: sizeConfig.iconSize,
      });
    }

    return (
      <Ionicons
        name={iconName}
        size={sizeConfig.iconSize}
        color={iconColor}
        style={[styles.icon, iconStyle]}
      />
    );
  }, [variantConfig, icon, customIcon, active, sizeConfig, iconStyle]);

  const renderLabel = useCallback(() => {
    if (!variantConfig.showLabel && !label) return null;

    return (
      <Text
        style={[
          styles.label,
          {
            fontSize: sizeConfig.fontSize,
            color: active ? variantConfig.activeTextColor : variantConfig.textColor,
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    );
  }, [variantConfig, label, active, sizeConfig, textStyle]);

  const renderBadge = useCallback(() => {
    if (!shouldShowBadge) return null;

    const isDot = badgeType === hapticTabService.badgeTypes.DOT;
    const isNumber = badgeType === hapticTabService.badgeTypes.NUMBER;
    const isText = badgeType === hapticTabService.badgeTypes.TEXT;
    const isIcon = badgeType === hapticTabService.badgeTypes.ICON;

    const badgeStyles = [
      styles.badge,
      {
        backgroundColor: badgeColor || colors.error,
        minWidth: isDot ? sizeConfig.badgeSize : undefined,
        height: sizeConfig.badgeSize,
      },
      isDot && styles.badgeDot,
      isNumber && styles.badgeNumber,
      isText && styles.badgeText,
      isIcon && styles.badgeIcon,
      badgeStyle,
    ];

    return (
      <View style={badgeStyles}>
        {isIcon ? (
          <Ionicons 
            name={badgeValue} 
            size={sizeConfig.badgeSize - 6} 
            color="#FFFFFF" 
          />
        ) : (
          <Text style={styles.badgeTextContent}>
            {badgeValue}
          </Text>
        )}
      </View>
    );
  }, [shouldShowBadge, badgeType, badgeColor, colors, sizeConfig, badgeValue, badgeStyle]);

  const renderLoading = useCallback(() => {
    if (!loading) return null;

    if (LoadingComponent) {
      return <LoadingComponent />;
    }

    return (
      <View style={styles.loadingContainer}>
        <View style={[
          styles.loadingDot,
          { backgroundColor: variantConfig.activeTextColor }
        ]} />
        <View style={[
          styles.loadingDot,
          styles.loadingDotDelay,
          { backgroundColor: variantConfig.activeTextColor }
        ]} />
        <View style={[
          styles.loadingDot,
          styles.loadingDotDelay2,
          { backgroundColor: variantConfig.activeTextColor }
        ]} />
      </View>
    );
  }, [loading, LoadingComponent, variantConfig]);

  const renderContent = useCallback(() => {
    const isIconLeft = (iconPosition === 'left' && !isRTL) || (iconPosition === 'right' && isRTL);
    
    return (
      <View style={styles.content}>
        {isIconLeft && renderIcon()}
        {renderLabel()}
        {!isIconLeft && renderIcon()}
        {renderLoading()}
        {children}
      </View>
    );
  }, [iconPosition, isRTL, renderIcon, renderLabel, renderLoading, children]);

  // Container styles
  const containerBaseStyle = [
    styles.container,
    {
      backgroundColor: active ? variantConfig.activeBackgroundColor : variantConfig.inactiveBackgroundColor,
      borderColor: active ? variantConfig.activeBorderColor : variantConfig.borderColor,
      borderWidth: variantConfig.borderWidth || 0,
      borderRadius: variantConfig.borderRadius,
      paddingVertical: variantConfig.paddingVertical,
      paddingHorizontal: variantConfig.paddingHorizontal,
      minHeight: sizeConfig.minHeight,
      opacity: disabled ? 0.5 : 1,
    },
    variantConfig.shadow && styles.shadow,
  ];

  const animatedTransform = useMemo(() => {
    const transform = [];
    
    if (animationType === hapticTabService.animationTypes.SCALE || 
        animationType === hapticTabService.animationTypes.BOUNCE ||
        animationType === hapticTabService.animationTypes.SPRING) {
      transform.push({ scale: scaleAnim });
    }
    
    if (animationType === hapticTabService.animationTypes.SLIDE) {
      transform.push({ translateY: slideAnim });
    }
    
    return transform;
  }, [animationType, scaleAnim, slideAnim]);

  const containerStyle = [
    containerBaseStyle,
    {
      transform: animatedTransform,
      opacity: animationType === hapticTabService.animationTypes.FADE ? opacityAnim : 1,
    },
    style,
    active && activeStyle,
    disabled && disabledStyle,
    loading && loadingStyle,
  ];

  const accessibilityProps = {
    accessibilityRole,
    accessibilityLabel: resolvedAccessibilityLabel,
    accessibilityState: {
      selected: active,
      disabled: disabled || loading,
    },
  };

  return (
    <Pressable
      ref={ref}
      style={containerStyle}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      disabled={disabled || loading}
      testID={testID}
      {...accessibilityProps}
      {...pressableProps}
    >
      {renderContent()}
      {renderBadge()}
    </Pressable>
  );
});

// Pre-configured tab variants
export const PrimaryHapticTab = forwardRef((props, ref) => (
  <HapticTab ref={ref} variant={hapticTabService.tabVariants.PRIMARY} {...props} />
));

export const SecondaryHapticTab = forwardRef((props, ref) => (
  <HapticTab ref={ref} variant={hapticTabService.tabVariants.SECONDARY} {...props} />
));

export const OutlineHapticTab = forwardRef((props, ref) => (
  <HapticTab ref={ref} variant={hapticTabService.tabVariants.OUTLINE} {...props} />
));

export const GhostHapticTab = forwardRef((props, ref) => (
  <HapticTab ref={ref} variant={hapticTabService.tabVariants.GHOST} {...props} />
));

export const FloatingHapticTab = forwardRef((props, ref) => (
  <HapticTab ref={ref} variant={hapticTabService.tabVariants.FLOATING} {...props} />
));

export const IconHapticTab = forwardRef((props, ref) => (
  <HapticTab ref={ref} variant={hapticTabService.tabVariants.ICON} {...props} />
));

// Hook for tab state management
export const useHapticTab = (initialActive = false) => {
  const [active, setActive] = useState(initialActive);

  const activate = useCallback(() => {
    setActive(true);
    hapticTabService.triggerHaptic(hapticTabService.hapticTypes.SELECTION);
  }, []);

  const deactivate = useCallback(() => {
    setActive(false);
  }, []);

  const toggle = useCallback(() => {
    setActive(prev => !prev);
    hapticTabService.triggerHaptic(hapticTabService.hapticTypes.LIGHT);
  }, []);

  return {
    active,
    setActive,
    activate,
    deactivate,
    toggle,
  };
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginHorizontal: 4,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeDot: {
    minWidth: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeNumber: {
    minWidth: 18,
  },
  badgeText: {
    paddingHorizontal: 4,
  },
  badgeIcon: {
    padding: 2,
  },
  badgeTextContent: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  loadingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  loadingDotDelay: {
    opacity: 0.6,
  },
  loadingDotDelay2: {
    opacity: 0.3,
  },
});

// Add static methods
HapticTab.triggerHaptic = hapticTabService.triggerHaptic;
HapticTab.Variants = hapticTabService.tabVariants;
HapticTab.Sizes = hapticTabService.tabSizes;
HapticTab.HapticTypes = hapticTabService.hapticTypes;
HapticTab.AnimationTypes = hapticTabService.animationTypes;

// Attach pre-configured components
const HapticTabWithVariants = Object.assign(HapticTab, {
  Primary: PrimaryHapticTab,
  Secondary: SecondaryHapticTab,
  Outline: OutlineHapticTab,
  Ghost: GhostHapticTab,
  Floating: FloatingHapticTab,
  Icon: IconHapticTab,
  useHapticTab,
});

export default HapticTabWithVariants;