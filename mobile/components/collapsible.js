// components/collapsible.js
// ============================================================
// YACHI ENTERPRISE COLLAPSIBLE COMPONENT
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  I18nManager,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

class YachiCollapsibleService {
  constructor() {
    this.animationTypes = this.getAnimationTypes();
    this.iconPositions = this.getIconPositions();
    this.variants = this.getVariants();
    this.expansionModes = this.getExpansionModes();
  }

  getAnimationTypes() {
    return {
      FADE: 'fade',
      SLIDE: 'slide',
      SCALE: 'scale',
      HEIGHT: 'height',
      NONE: 'none',
      CUSTOM: 'custom',
    };
  }

  getIconPositions() {
    return {
      LEFT: 'left',
      RIGHT: 'right',
    };
  }

  getVariants() {
    return {
      DEFAULT: 'default',
      CARD: 'card',
      BORDERED: 'bordered',
      GHOST: 'ghost',
      ACCORDION: 'accordion',
    };
  }

  getExpansionModes() {
    return {
      SINGLE: 'single',
      MULTIPLE: 'multiple',
    };
  }

  getVariantConfig(variant, colors) {
    const configs = {
      [this.variants.DEFAULT]: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        padding: 0,
        headerPadding: 16,
        contentPadding: 16,
      },
      [this.variants.CARD]: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 0,
        headerPadding: 16,
        contentPadding: 16,
        shadow: true,
      },
      [this.variants.BORDERED]: {
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 0,
        headerPadding: 16,
        contentPadding: 16,
      },
      [this.variants.GHOST]: {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        borderWidth: 0,
        borderRadius: 0,
        padding: 0,
        headerPadding: 12,
        contentPadding: 12,
      },
      [this.variants.ACCORDION]: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 0,
        padding: 0,
        headerPadding: 16,
        contentPadding: 16,
        accordionStyle: true,
      },
    };

    return configs[variant] || configs[this.variants.DEFAULT];
  }

  getAnimationConfig(animationType, duration = 300) {
    const configs = {
      [this.animationTypes.FADE]: {
        duration,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      },
      [this.animationTypes.SLIDE]: {
        duration,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      },
      [this.animationTypes.SCALE]: {
        duration,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.scaleXY,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      },
      [this.animationTypes.HEIGHT]: {
        duration,
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.height,
        },
      },
      [this.animationTypes.NONE]: {
        duration: 0,
      },
    };

    return configs[animationType] || configs[this.animationTypes.FADE];
  }

  configureLayoutAnimation(animationType, duration) {
    const config = this.getAnimationConfig(animationType, duration);
    if (animationType !== this.animationTypes.NONE) {
      LayoutAnimation.configureNext(config);
    }
  }

  getIconName(isExpanded, customIcons) {
    if (customIcons) {
      return isExpanded ? customIcons.expanded : customIcons.collapsed;
    }
    return isExpanded ? 'chevron-up' : 'chevron-down';
  }

  getAccessibilityLabel(title, isExpanded) {
    const state = isExpanded ? 'expanded' : 'collapsed';
    return `${title}, ${state}, double tap to ${isExpanded ? 'collapse' : 'expand'}`;
  }

  shouldAnimate(animationType) {
    return animationType !== this.animationTypes.NONE;
  }
}

// Singleton instance
export const collapsibleService = new YachiCollapsibleService();

/**
 * Enterprise Collapsible Component with Advanced Features
 * Supports multiple variants, animations, and group behavior
 */
export default function Collapsible({
  // Core Props
  children,
  title,
  subtitle,
  initiallyExpanded = false,
  onExpand = () => {},
  onCollapse = () => {},
  
  // Configuration
  variant = collapsibleService.variants.DEFAULT,
  animationType = collapsibleService.animationTypes.FADE,
  animationDuration = 300,
  iconPosition = collapsibleService.iconPositions.RIGHT,
  expanded = undefined, // Controlled mode
  disabled = false,
  
  // Header Customization
  renderHeader,
  showIcon = true,
  customIcon,
  headerStyle,
  titleStyle,
  subtitleStyle,
  iconStyle,
  
  // Content Customization
  contentStyle,
  renderContent,
  
  // Group Behavior
  groupId,
  onGroupChange,
  expansionMode = collapsibleService.expansionModes.MULTIPLE,
  
  // Styling
  containerStyle,
  
  // Technical
  testID = 'yachi-collapsible',
  accessibilityLabel,
  analyticsEvent = 'collapsible_interaction',
  
  // Advanced
  hapticFeedback = true,
  persistState = false,
  lazyRender = false,
  preload = false,
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  
  // Refs
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const contentMeasured = useRef(false);
  const contentHeight = useRef(0);
  
  // State
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isMeasuring, setIsMeasuring] = useState(!preload);
  const [hasRendered, setHasRendered] = useState(preload);
  const [contentLayout, setContentLayout] = useState(null);

  // Memoized values
  const variantConfig = useMemo(() => 
    collapsibleService.getVariantConfig(variant, colors),
    [variant, colors]
  );

  const isControlled = useMemo(() => 
    expanded !== undefined,
    [expanded]
  );

  const actualExpanded = useMemo(() => 
    isControlled ? expanded : isExpanded,
    [isControlled, expanded, isExpanded]
  );

  const shouldRenderContent = useMemo(() => 
    !lazyRender || actualExpanded || hasRendered,
    [lazyRender, actualExpanded, hasRendered]
  );

  const iconName = useMemo(() => 
    collapsibleService.getIconName(actualExpanded, customIcon),
    [actualExpanded, customIcon]
  );

  const resolvedAccessibilityLabel = useMemo(() => 
    accessibilityLabel || collapsibleService.getAccessibilityLabel(title, actualExpanded),
    [accessibilityLabel, title, actualExpanded]
  );

  // Effects
  useEffect(() => {
    if (preload) {
      setHasRendered(true);
    }
  }, [preload]);

  useEffect(() => {
    if (actualExpanded && lazyRender) {
      setHasRendered(true);
    }
  }, [actualExpanded, lazyRender]);

  useEffect(() => {
    animateIcon();
  }, [actualExpanded]);

  // Animation methods
  const animateIcon = useCallback(() => {
    const toValue = actualExpanded ? 1 : 0;
    
    Animated.spring(rotationAnim, {
      toValue,
      tension: 150,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [actualExpanded, rotationAnim]);

  const animateContent = useCallback(() => {
    if (!collapsibleService.shouldAnimate(animationType)) return;

    collapsibleService.configureLayoutAnimation(animationType, animationDuration);

    if (animationType === collapsibleService.animationTypes.FADE) {
      Animated.timing(opacityAnim, {
        toValue: actualExpanded ? 1 : 0,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
    }

    if (animationType === collapsibleService.animationTypes.HEIGHT && contentHeight.current > 0) {
      Animated.timing(heightAnim, {
        toValue: actualExpanded ? contentHeight.current : 0,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    }
  }, [animationType, animationDuration, actualExpanded, opacityAnim, heightAnim]);

  const triggerHapticFeedback = useCallback(() => {
    if (!hapticFeedback || Platform.OS === 'web') return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [hapticFeedback]);

  // Interaction methods
  const handleToggle = useCallback(() => {
    if (disabled) return;

    triggerHapticFeedback();

    const newExpanded = !actualExpanded;

    // Update state
    if (!isControlled) {
      setIsExpanded(newExpanded);
    }

    // Animate content
    animateContent();

    // Track analytics
    analyticsService.trackEvent(analyticsEvent, {
      group_id: groupId,
      expanded: newExpanded,
      title: title,
      variant: variant,
    });

    // Call appropriate callback
    if (newExpanded) {
      onExpand();
    } else {
      onCollapse();
    }

    // Handle group behavior
    if (groupId && onGroupChange) {
      onGroupChange(groupId, newExpanded, expansionMode);
    }
  }, [
    disabled,
    actualExpanded,
    isControlled,
    animateContent,
    triggerHapticFeedback,
    groupId,
    onGroupChange,
    expansionMode,
    onExpand,
    onCollapse,
    title,
    variant,
    analyticsEvent,
  ]);

  const handleContentLayout = useCallback((event) => {
    const layout = event.nativeEvent.layout;
    
    if (!contentMeasured.current && layout.height > 0) {
      contentHeight.current = layout.height;
      contentMeasured.current = true;
      setIsMeasuring(false);
      
      // Set initial height for height animation
      if (animationType === collapsibleService.animationTypes.HEIGHT) {
        heightAnim.setValue(actualExpanded ? layout.height : 0);
      }
      
      // Set initial opacity for fade animation
      if (animationType === collapsibleService.animationTypes.FADE) {
        opacityAnim.setValue(actualExpanded ? 1 : 0);
      }
    }
    
    setContentLayout(layout);
  }, [animationType, actualExpanded, heightAnim, opacityAnim]);

  // Render methods
  const renderHeaderContent = useCallback(() => {
    if (renderHeader) {
      return renderHeader({ isExpanded: actualExpanded, toggle: handleToggle });
    }

    const headerContentStyle = [
      styles.headerContent,
      {
        padding: variantConfig.headerPadding,
        flexDirection: iconPosition === collapsibleService.iconPositions.LEFT ? 'row-reverse' : 'row',
      },
    ];

    const textContainerStyle = [
      styles.textContainer,
      {
        flex: 1,
        marginRight: iconPosition === collapsibleService.iconPositions.LEFT && showIcon ? 12 : 0,
        marginLeft: iconPosition === collapsibleService.iconPositions.RIGHT && showIcon ? 12 : 0,
      },
    ];

    const iconRotation = rotationAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    return (
      <View style={headerContentStyle}>
        <View style={textContainerStyle}>
          {title && (
            <Text 
              style={[
                styles.title,
                { color: colors.foreground },
                titleStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text 
              style={[
                styles.subtitle,
                { color: colors.mutedForeground },
                subtitleStyle,
              ]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {showIcon && (
          <Animated.View 
            style={[
              styles.iconContainer,
              { transform: [{ rotate: iconRotation }] },
              iconStyle,
            ]}
          >
            <Ionicons
              name={iconName}
              size={20}
              color={colors.mutedForeground}
            />
          </Animated.View>
        )}
      </View>
    );
  }, [
    renderHeader,
    actualExpanded,
    handleToggle,
    variantConfig,
    iconPosition,
    showIcon,
    title,
    subtitle,
    colors,
    titleStyle,
    subtitleStyle,
    rotationAnim,
    iconName,
    iconStyle,
  ]);

  const renderContent = useCallback(() => {
    if (!shouldRenderContent) return null;

    const contentContainerStyle = [
      styles.contentContainer,
      {
        padding: variantConfig.contentPadding,
      },
      contentStyle,
    ];

    const animatedStyle = {};
    
    switch (animationType) {
      case collapsibleService.animationTypes.HEIGHT:
        animatedStyle.height = heightAnim;
        animatedStyle.overflow = 'hidden';
        break;
      case collapsibleService.animationTypes.FADE:
        animatedStyle.opacity = opacityAnim;
        break;
      case collapsibleService.animationTypes.SLIDE:
        animatedStyle.opacity = opacityAnim;
        animatedStyle.transform = [
          {
            translateY: opacityAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          },
        ];
        break;
      default:
        break;
    }

    if (renderContent) {
      return (
        <Animated.View style={[contentContainerStyle, animatedStyle]}>
          {renderContent({ isExpanded: actualExpanded })}
        </Animated.View>
      );
    }

    return (
      <Animated.View 
        style={[contentContainerStyle, animatedStyle]}
        onLayout={handleContentLayout}
      >
        {children}
      </Animated.View>
    );
  }, [
    shouldRenderContent,
    variantConfig,
    contentStyle,
    animationType,
    heightAnim,
    opacityAnim,
    renderContent,
    actualExpanded,
    children,
    handleContentLayout,
  ]);

  const containerBaseStyle = [
    styles.container,
    {
      backgroundColor: variantConfig.backgroundColor,
      borderColor: variantConfig.borderColor,
      borderWidth: variantConfig.borderWidth,
      borderRadius: variantConfig.borderRadius,
    },
    variantConfig.shadow && styles.shadow,
    variantConfig.accordionStyle && styles.accordion,
    containerStyle,
  ];

  return (
    <View 
      style={containerBaseStyle}
      testID={testID}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ expanded: actualExpanded }}
    >
      <TouchableOpacity
        onPress={handleToggle}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={resolvedAccessibilityLabel}
        accessibilityRole="button"
      >
        {renderHeaderContent()}
      </TouchableOpacity>

      {renderContent()}

      {/* Loading state for measuring */}
      {isMeasuring && (
        <View style={styles.measuringContainer}>
          <Text style={[styles.measuringText, { color: colors.mutedForeground }]}>
            Loading content...
          </Text>
        </View>
      )}
    </View>
  );
}

// Collapsible Group Component for managing multiple collapsibles
export function CollapsibleGroup({
  children,
  expansionMode = collapsibleService.expansionModes.MULTIPLE,
  onGroupChange = () => {},
  defaultExpanded,
  ...props
}) {
  const [expandedItems, setExpandedItems] = useState(new Set(defaultExpanded ? [defaultExpanded] : []));

  const handleItemChange = useCallback((itemId, isExpanded, mode) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      
      if (mode === collapsibleService.expansionModes.SINGLE) {
        newSet.clear();
        if (isExpanded) {
          newSet.add(itemId);
        }
      } else {
        if (isExpanded) {
          newSet.add(itemId);
        } else {
          newSet.delete(itemId);
        }
      }
      
      return newSet;
    });

    onGroupChange(itemId, isExpanded, mode);
  }, [onGroupChange]);

  const isItemExpanded = useCallback((itemId) => {
    return expandedItems.has(itemId);
  }, [expandedItems]);

  const contextValue = useMemo(() => ({
    expansionMode,
    onItemChange: handleItemChange,
    isItemExpanded,
  }), [expansionMode, handleItemChange, isItemExpanded]);

  return (
    <View {...props}>
      {React.Children.map(children, child => 
        React.isValidElement(child) 
          ? React.cloneElement(child, {
              expansionMode,
              onGroupChange: handleItemChange,
              expanded: child.props.groupId ? isItemExpanded(child.props.groupId) : undefined,
            })
          : child
      )}
    </View>
  );
}

// Pre-configured collapsible variants
export function CardCollapsible(props) {
  return <Collapsible variant={collapsibleService.variants.CARD} {...props} />;
}

export function BorderedCollapsible(props) {
  return <Collapsible variant={collapsibleService.variants.BORDERED} {...props} />;
}

export function GhostCollapsible(props) {
  return <Collapsible variant={collapsibleService.variants.GHOST} {...props} />;
}

export function AccordionCollapsible(props) {
  return <Collapsible variant={collapsibleService.variants.ACCORDION} {...props} />;
}

// Hook for collapsible state management
export const useCollapsible = (initialState = false) => {
  const [isExpanded, setIsExpanded] = useState(initialState);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return {
    isExpanded,
    expand,
    collapse,
    toggle,
    setIsExpanded,
  };
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  accordion: {
    borderRadius: 0,
    borderBottomWidth: 0,
  },
  accordionFirst: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  accordionLast: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  iconContainer: {
    marginLeft: 8,
  },
  contentContainer: {
    overflow: 'hidden',
  },
  measuringContainer: {
    padding: 16,
    alignItems: 'center',
  },
  measuringText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});

export { collapsibleService };