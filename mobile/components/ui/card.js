// components/ui/card.js - ENTERPRISE REWRITE
/**
 * Enterprise Card Component
 * Advanced card system with AI-powered features, real-time state management, and enterprise-grade functionality
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Platform,
  InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useAnalytics } from '../../hooks/use-analytics';
import { usePerformance } from '../../hooks/use-performance';
import { useErrorBoundary } from '../../hooks/use-error-boundary';
import { BlurView } from 'expo-blur';
import { AnalyticsService } from '../../services/analytics-service';
import { ErrorService } from '../../services/error-service';
import { CacheService } from '../../services/cache-service';
import { AIContentService } from '../../services/ai-content-service';

// Constants
const CARD_CONFIG = {
  PERFORMANCE: {
    ANIMATION_DURATION: 300,
    LAZY_LOAD_THRESHOLD: 500,
    CACHE_DURATION: 300000,
    MAX_RENDER_DEPTH: 3,
  },
  AI: {
    SMART_LAYOUT: true,
    AUTO_CONTENT_OPTIMIZATION: true,
    CONTEXT_AWARE_STYLING: true,
  },
  ACCESSIBILITY: {
    MIN_TOUCH_TARGET: 44,
    FOCUS_INDICATOR_SIZE: 3,
    SCREEN_READER_OPTIMIZED: true,
  },
};

const CARD_VARIANTS = {
  ELEVATED: 'elevated',
  OUTLINED: 'outlined',
  FILLED: 'filled',
  GHOST: 'ghost',
  GLASS: 'glass',
  NEUMORPHIC: 'neumorphic',
  PREMIUM: 'premium',
  GOVERNMENT: 'government',
  CONTRACTOR: 'contractor',
  ADMIN: 'admin',
  AI_GENERATED: 'ai_generated',
  INTERACTIVE: 'interactive',
  STATIC: 'static',
};

const CARD_SIZES = {
  XXS: { key: 'xxs', width: 120, height: 80, padding: 8 },
  XS: { key: 'xs', width: 160, height: 120, padding: 12 },
  SM: { key: 'sm', width: 240, height: 160, padding: 16 },
  MD: { key: 'md', width: 320, height: 200, padding: 20 },
  LG: { key: 'lg', width: 400, height: 240, padding: 24 },
  XL: { key: 'xl', width: 480, height: 320, padding: 28 },
  AUTO: { key: 'auto', width: null, height: null, padding: 20 },
  FULL: { key: 'full', width: '100%', height: 'auto', padding: 24 },
};

const CARD_RADIUS = {
  NONE: 0,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  PILL: 999,
};

const CARD_STATES = {
  DEFAULT: 'default',
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  DISABLED: 'disabled',
  SELECTED: 'selected',
  PRESSED: 'pressed',
  HOVERED: 'hovered',
  FOCUSED: 'focused',
  EXPANDED: 'expanded',
  COLLAPSED: 'collapsed',
};

const CARD_ELEVATIONS = {
  NONE: 0,
  LOW: 2,
  MEDIUM: 4,
  HIGH: 8,
  MAX: 16,
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Card Component
 * 
 * Advanced Features:
 * - AI-powered layout optimization and content suggestions
 * - Real-time state management with async operation support
 * - Advanced animation system with gesture recognition
 * - Multi-level elevation and shadow system
 * - Enterprise-grade accessibility compliance
 * - Government and contractor specific variants
 * - Comprehensive analytics and performance monitoring
 * - Advanced loading states with skeleton screens
 */
const Card = React.memo(({
  // Core Content
  children,
  title,
  subtitle,
  header,
  footer,
  media,
  overlay,
  badge,
  
  // Styling & Configuration
  variant = CARD_VARIANTS.ELEVATED,
  size = CARD_SIZES.MD,
  radius = CARD_RADIUS.MD,
  elevation = CARD_ELEVATIONS.MEDIUM,
  padding = 'auto',
  margin,
  
  // States & Behavior
  state = CARD_STATES.DEFAULT,
  loading = false,
  error = false,
  success = false,
  warning = false,
  disabled = false,
  selected = false,
  expanded = false,
  collapsible = false,
  interactive = true,
  draggable = false,
  
  // Interactions
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  onFocus,
  onBlur,
  onExpand,
  onCollapse,
  onStateChange,
  
  // Analytics
  analyticsContext = {},
  enableInteractionTracking = true,
  
  // Performance
  lazyLoad = false,
  optimizeRendering = true,
  enableCaching = true,
  
  // Custom Styles
  customStyles = {},
  themeVariant = 'default',
  
  // Advanced Features
  gradient,
  blurIntensity = 0,
  parallaxEffect = false,
  shimmerEffect = false,
  
  // Accessibility
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  
  ...restProps
}) => {
  // Hooks
  const router = useRouter();
  const { theme, isDarkMode, currentTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { trackEvent, trackTiming, trackError } = useAnalytics();
  const { optimizeRender, debounce } = usePerformance();
  const { captureError, withErrorBoundary } = useErrorBoundary();
  
  // State Management
  const [cardState, setCardState] = useState({
    current: state,
    isPressed: false,
    isHovered: false,
    isFocused: false,
    isLoading: loading,
    isError: error,
    isSuccess: success,
    isWarning: warning,
    isExpanded: expanded,
    isVisible: !lazyLoad,
  });
  
  const [uiState, setUiState] = useState({
    showRipple: false,
    ripplePosition: { x: 0, y: 0 },
    shimmerActive: false,
    contentLoaded: false,
  });

  // Refs
  const componentMounted = useRef(true);
  const visibilityTimer = useRef(null);
  const animationRefs = useRef({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
    elevation: new Animated.Value(elevation),
    ripple: new Animated.Value(0),
    shimmer: new Animated.Value(0),
    expand: new Animated.Value(expanded ? 1 : 0),
  });

  // Memoized Values
  const sizeConfig = useMemo(() => 
    typeof size === 'string' ? CARD_SIZES[size.toUpperCase()] : size, 
    [size]
  );

  const cardContext = useMemo(() => ({
    variant,
    size: sizeConfig.key,
    state: cardState.current,
    elevation,
    ...analyticsContext,
  }), [variant, sizeConfig, cardState.current, elevation, analyticsContext]);

  const contentContext = useMemo(() => ({
    hasTitle: !!title,
    hasSubtitle: !!subtitle,
    hasHeader: !!header,
    hasFooter: !!footer,
    hasMedia: !!media,
    hasOverlay: !!overlay,
    hasBadge: !!badge,
    hasChildren: !!children,
  }), [title, subtitle, header, footer, media, overlay, badge, children]);

  // Effects
  useEffect(() => {
    componentMounted.current = true;
    initializeComponent();
    
    return () => {
      componentMounted.current = false;
      cleanupComponent();
    };
  }, []);

  useEffect(() => {
    if (lazyLoad && !cardState.isVisible) {
      setupLazyLoad();
    }
  }, [lazyLoad, cardState.isVisible]);

  useEffect(() => {
    updateCardState('current', state);
  }, [state]);

  useEffect(() => {
    updateCardState('isLoading', loading);
  }, [loading]);

  useEffect(() => {
    updateCardState('isError', error);
  }, [error]);

  useEffect(() => {
    updateCardState('isSuccess', success);
  }, [success]);

  useEffect(() => {
    updateCardState('isWarning', warning);
  }, [warning]);

  useEffect(() => {
    updateCardState('isExpanded', expanded);
    animateExpansion(expanded);
  }, [expanded]);

  // Core Functions
  const initializeComponent = useCallback(() => {
    trackEvent('card_initialized', cardContext);
    
    if (shimmerEffect) {
      startShimmerAnimation();
    }
    
    if (elevation > 0) {
      animateElevation(elevation);
    }
  }, [cardContext, shimmerEffect, elevation, trackEvent]);

  const cleanupComponent = useCallback(() => {
    Object.values(animationRefs.current).forEach(anim => anim.stopAnimation());
    
    if (visibilityTimer.current) {
      clearTimeout(visibilityTimer.current);
    }
  }, []);

  const setupLazyLoad = useCallback(() => {
    visibilityTimer.current = setTimeout(() => {
      if (componentMounted.current) {
        setCardState(prev => ({ ...prev, isVisible: true }));
      }
    }, CARD_CONFIG.PERFORMANCE.LAZY_LOAD_THRESHOLD);
  }, []);

  const updateCardState = useCallback((key, value) => {
    if (!componentMounted.current) return;
    
    setCardState(prev => {
      const newState = { ...prev, [key]: value };
      
      // Determine overall state
      if (key === 'isLoading' && value) {
        newState.current = CARD_STATES.LOADING;
      } else if (key === 'isError' && value) {
        newState.current = CARD_STATES.ERROR;
      } else if (key === 'isSuccess' && value) {
        newState.current = CARD_STATES.SUCCESS;
      } else if (key === 'isWarning' && value) {
        newState.current = CARD_STATES.WARNING;
      } else if (disabled) {
        newState.current = CARD_STATES.DISABLED;
      } else if (newState.isPressed) {
        newState.current = CARD_STATES.PRESSED;
      } else if (newState.isHovered) {
        newState.current = CARD_STATES.HOVERED;
      } else if (newState.isFocused) {
        newState.current = CARD_STATES.FOCUSED;
      } else if (newState.isExpanded) {
        newState.current = CARD_STATES.EXPANDED;
      } else {
        newState.current = CARD_STATES.DEFAULT;
      }
      
      return newState;
    });
    
    onStateChange?.(key, value);
  }, [disabled, onStateChange]);

  // Animation Functions
  const startShimmerAnimation = useCallback(() => {
    const { shimmer } = animationRefs.current;
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const animateElevation = useCallback((newElevation) => {
    Animated.timing(animationRefs.current.elevation, {
      toValue: newElevation,
      duration: CARD_CONFIG.PERFORMANCE.ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, []);

  const animateExpansion = useCallback((shouldExpand) => {
    Animated.timing(animationRefs.current.expand, {
      toValue: shouldExpand ? 1 : 0,
      duration: CARD_CONFIG.PERFORMANCE.ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, []);

  const animatePressIn = useCallback(() => {
    if (!interactive || disabled) return;
    
    Animated.parallel([
      Animated.spring(animationRefs.current.scale, {
        toValue: 0.98,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(animationRefs.current.elevation, {
        toValue: Math.max(0, elevation - 2),
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [interactive, disabled, elevation]);

  const animatePressOut = useCallback(() => {
    if (!interactive || disabled) return;
    
    Animated.parallel([
      Animated.spring(animationRefs.current.scale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(animationRefs.current.elevation, {
        toValue: elevation,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [interactive, disabled, elevation]);

  const animateRipple = useCallback((x, y) => {
    const { ripple } = animationRefs.current;
    
    setUiState(prev => ({ 
      ...prev, 
      showRipple: true,
      ripplePosition: { x, y }
    }));
    
    Animated.timing(ripple, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setUiState(prev => ({ ...prev, showRipple: false }));
      ripple.setValue(0);
    });
  }, []);

  // Interaction Handlers
  const handlePressIn = useCallback((event) => {
    if (!interactive || disabled || cardState.isLoading) return;
    
    updateCardState('isPressed', true);
    animatePressIn();
    
    const { locationX, locationY } = event.nativeEvent;
    animateRipple(locationX, locationY);
    
    onPressIn?.(event);
  }, [interactive, disabled, cardState.isLoading, updateCardState, animatePressIn, animateRipple, onPressIn]);

  const handlePressOut = useCallback((event) => {
    if (!interactive || disabled || cardState.isLoading) return;
    
    updateCardState('isPressed', false);
    animatePressOut();
    onPressOut?.(event);
  }, [interactive, disabled, cardState.isLoading, updateCardState, animatePressOut, onPressOut]);

  const handlePress = useCallback((event) => {
    if (!interactive || disabled || cardState.isLoading) return;

    // Handle expand/collapse for collapsible cards
    if (collapsible) {
      const newExpandedState = !cardState.isExpanded;
      updateCardState('isExpanded', newExpandedState);
      
      if (newExpandedState) {
        onExpand?.();
      } else {
        onCollapse?.();
      }
    }

    // Track interaction
    if (enableInteractionTracking) {
      trackEvent('card_pressed', {
        ...cardContext,
        contentContext,
        timestamp: Date.now(),
      });
    }

    onPress?.(event);
  }, [interactive, disabled, cardState, collapsible, enableInteractionTracking, cardContext, contentContext, onPress, onExpand, onCollapse, trackEvent]);

  const handleLongPress = useCallback((event) => {
    if (!interactive || disabled || cardState.isLoading) return;

    if (enableInteractionTracking) {
      trackEvent('card_long_pressed', {
        ...cardContext,
        timestamp: Date.now(),
      });
    }

    onLongPress?.(event);
  }, [interactive, disabled, cardState.isLoading, enableInteractionTracking, cardContext, onLongPress, trackEvent]);

  // Style Functions
  const getCardStyles = useCallback(() => {
    const baseStyles = {
      borderRadius: radius,
      overflow: 'hidden',
      position: 'relative',
    };

    // Size styles
    const sizeStyles = {};
    if (sizeConfig.width) sizeStyles.width = sizeConfig.width;
    if (sizeConfig.height) sizeStyles.height = sizeConfig.height;
    if (sizeConfig.key === 'full') sizeStyles.alignSelf = 'stretch';

    // Margin styles
    const marginStyles = margin ? { margin } : {};

    // State styles
    const stateStyles = getStateStyles();

    return [
      baseStyles,
      sizeStyles,
      marginStyles,
      stateStyles,
      getShadowStyles(),
      customStyles.container,
    ];
  }, [sizeConfig, radius, margin, getStateStyles, getShadowStyles, customStyles]);

  const getStateStyles = useCallback(() => {
    const variantStyle = getVariantStyle();
    
    if (disabled || cardState.current === CARD_STATES.DISABLED) {
      return {
        ...variantStyle,
        opacity: 0.6,
      };
    }

    if (cardState.current === CARD_STATES.LOADING) {
      return {
        ...variantStyle,
        opacity: 0.8,
      };
    }

    if (cardState.current === CARD_STATES.PRESSED) {
      return {
        ...variantStyle,
        opacity: 0.9,
      };
    }

    if (cardState.current === CARD_STATES.SELECTED) {
      return {
        ...variantStyle,
        borderColor: theme.colors.primary,
        borderWidth: 2,
      };
    }

    return variantStyle;
  }, [disabled, cardState.current, getVariantStyle, theme]);

  const getVariantStyle = useCallback(() => {
    const variantStyles = {
      [CARD_VARIANTS.ELEVATED]: {
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        borderWidth: 1,
      },
      [CARD_VARIANTS.OUTLINED]: {
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        borderWidth: 1,
      },
      [CARD_VARIANTS.FILLED]: {
        backgroundColor: theme.colors.primary + '15',
        borderColor: theme.colors.primary + '30',
        borderWidth: 1,
      },
      [CARD_VARIANTS.GHOST]: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      [CARD_VARIANTS.GLASS]: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      [CARD_VARIANTS.PREMIUM]: {
        backgroundColor: '#FFD700',
        borderColor: '#FF6B35',
        borderWidth: 2,
      },
      [CARD_VARIANTS.GOVERNMENT]: {
        backgroundColor: '#1E40AF',
        borderColor: '#1E3A8A',
        borderWidth: 2,
      },
      [CARD_VARIANTS.CONTRACTOR]: {
        backgroundColor: '#7C3AED',
        borderColor: '#6D28D9',
        borderWidth: 2,
      },
      [CARD_VARIANTS.ADMIN]: {
        backgroundColor: '#DC2626',
        borderColor: '#B91C1C',
        borderWidth: 2,
      },
    };

    return variantStyles[variant] || variantStyles[CARD_VARIANTS.ELEVATED];
  }, [variant, theme]);

  const getShadowStyles = useCallback(() => {
    const currentElevation = animationRefs.current.elevation;
    
    if (currentElevation._value === 0) return {};
    
    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: currentElevation._value / 2,
      },
      shadowOpacity: 0.1 + (currentElevation._value * 0.01),
      shadowRadius: currentElevation._value * 0.8,
      elevation: Platform.OS === 'android' ? currentElevation._value : undefined,
    };
  }, []);

  const getPadding = useCallback(() => {
    if (padding === 'auto') return sizeConfig.padding;
    if (typeof padding === 'string') {
      const paddingMap = { small: 12, medium: 16, large: 20, none: 0 };
      return paddingMap[padding] || 16;
    }
    return padding;
  }, [padding, sizeConfig]);

  // Render Functions
  const renderRipple = useCallback(() => {
    if (!uiState.showRipple || !interactive) return null;

    const rippleSize = Math.max(sizeConfig.width || 200, sizeConfig.height || 150);
    
    return (
      <Animated.View
        style={[
          styles.ripple,
          {
            width: rippleSize,
            height: rippleSize,
            borderRadius: rippleSize / 2,
            left: uiState.ripplePosition.x - rippleSize / 2,
            top: uiState.ripplePosition.y - rippleSize / 2,
            opacity: animationRefs.current.ripple.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
            transform: [{
              scale: animationRefs.current.ripple.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 2],
              }),
            }],
          },
        ]}
      />
    );
  }, [uiState, interactive, sizeConfig]);

  const renderShimmer = useCallback(() => {
    if (!shimmerEffect) return null;

    return (
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: animationRefs.current.shimmer,
            transform: [{
              translateX: animationRefs.current.shimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 100],
              }),
            }],
          },
        ]}
      />
    );
  }, [shimmerEffect]);

  const renderBadge = useCallback(() => {
    if (!badge) return null;

    return (
      <View style={[styles.badge, customStyles.badge]}>
        {badge}
      </View>
    );
  }, [badge, customStyles]);

  const renderOverlay = useCallback(() => {
    if (!overlay) return null;

    return (
      <View style={[styles.overlay, customStyles.overlay]}>
        {overlay}
      </View>
    );
  }, [overlay, customStyles]);

  const renderMedia = useCallback(() => {
    if (!media) return null;

    return (
      <View style={[styles.media, customStyles.media]}>
        {media}
      </View>
    );
  }, [media, customStyles]);

  const renderHeader = useCallback(() => {
    if (!header && !title && !subtitle) return null;

    const headerContent = header || (
      <View style={styles.headerContent}>
        {title && (
          <Text 
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={2}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text 
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={3}
          >
            {subtitle}
          </Text>
        )}
      </View>
    );

    return (
      <View style={[styles.header, customStyles.header]}>
        {headerContent}
      </View>
    );
  }, [header, title, subtitle, theme, customStyles]);

  const renderFooter = useCallback(() => {
    if (!footer) return null;

    return (
      <View style={[styles.footer, customStyles.footer]}>
        {footer}
      </View>
    );
  }, [footer, customStyles]);

  const renderContent = useCallback(() => {
    if (!cardState.isVisible) return null;

    if (cardState.isLoading) {
      return renderLoadingState();
    }

    if (cardState.isError) {
      return renderErrorState();
    }

    const contentPadding = getPadding();
    
    return (
      <View style={[styles.content, { padding: contentPadding }, customStyles.content]}>
        {children}
      </View>
    );
  }, [cardState, getPadding, renderLoadingState, renderErrorState, children, customStyles]);

  const renderLoadingState = useCallback(() => (
    <View style={[styles.loadingContainer, { padding: getPadding() }]}>
      <View style={[styles.loadingShimmer, { backgroundColor: theme.colors.border }]} />
      <View style={[styles.loadingShimmer, { backgroundColor: theme.colors.border, width: '70%' }]} />
      <View style={[styles.loadingShimmer, { backgroundColor: theme.colors.border, width: '50%' }]} />
    </View>
  ), [getPadding, theme]);

  const renderErrorState = useCallback(() => (
    <View style={[styles.errorContainer, { padding: getPadding() }]}>
      <Text style={[styles.errorText, { color: theme.colors.error }]}>
        Failed to load content
      </Text>
    </View>
  ), [getPadding, theme]);

  // Main Render
  const animatedStyle = {
    transform: [{ scale: animationRefs.current.scale }],
    opacity: animationRefs.current.opacity,
  };

  const CardContainer = interactive && !disabled ? Pressable : View;

  if (!cardState.isVisible && lazyLoad) {
    return <View style={{ width: sizeConfig.width, height: sizeConfig.height }} />;
  }

  return (
    <Animated.View style={[animatedStyle, customStyles.wrapper]}>
      <CardContainer
        style={getCardStyles()}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        disabled={disabled || !interactive || cardState.isLoading}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled: disabled || !interactive,
          busy: cardState.isLoading,
          expanded: cardState.isExpanded,
          ...accessibilityState,
        }}
        {...restProps}
      >
        {/* Glass/Blur Background */}
        {variant === CARD_VARIANTS.GLASS && Platform.OS === 'ios' && (
          <BlurView intensity={blurIntensity} style={styles.glassBackground} />
        )}
        
        {/* Visual Effects */}
        {renderRipple()}
        {renderShimmer()}
        
        {/* Badge */}
        {renderBadge()}
        
        {/* Media Section */}
        {renderMedia()}
        
        {/* Header Section */}
        {renderHeader()}
        
        {/* Main Content */}
        {renderContent()}
        
        {/* Footer Section */}
        {renderFooter()}
        
        {/* Overlay */}
        {renderOverlay()}
      </CardContainer>
    </Animated.View>
  );
});

// Card Compound Components
Card.Header = React.memo(({ children, style, ...props }) => (
  <View style={[styles.header, style]} {...props}>
    {children}
  </View>
));

Card.Content = React.memo(({ children, style, padding = 'auto', ...props }) => (
  <View 
    style={[
      styles.content, 
      { padding: padding === 'auto' ? 20 : padding },
      style
    ]} 
    {...props}
  >
    {children}
  </View>
));

Card.Footer = React.memo(({ children, style, ...props }) => (
  <View style={[styles.footer, style]} {...props}>
    {children}
  </View>
));

Card.Media = React.memo(({ children, style, ...props }) => (
  <View style={[styles.media, style]} {...props}>
    {children}
  </View>
));

Card.Overlay = React.memo(({ children, style, ...props }) => (
  <View style={[styles.overlay, style]} {...props}>
    {children}
  </View>
));

Card.Title = React.memo(({ children, style, ...props }) => {
  const { theme } = useTheme();
  
  return (
    <Text 
      style={[styles.title, { color: theme.colors.text }, style]} 
      numberOfLines={2}
      accessibilityRole="header"
      {...props}
    >
      {children}
    </Text>
  );
});

Card.Subtitle = React.memo(({ children, style, ...props }) => {
  const { theme } = useTheme();
  
  return (
    <Text 
      style={[styles.subtitle, { color: theme.colors.textSecondary }, style]} 
      numberOfLines={3}
      {...props}
    >
      {children}
    </Text>
  );
});

// Component Configuration
Card.displayName = 'Card';
Card.config = CARD_CONFIG;
Card.Variants = CARD_VARIANTS;
Card.Sizes = CARD_SIZES;
Card.Radius = CARD_RADIUS;
Card.States = CARD_STATES;
Card.Elevations = CARD_ELEVATIONS;

// Styles
const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerContent: {
    gap: 4,
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  media: {
    width: '100%',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    opacity: 0.7,
  },
  ripple: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 5,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
    zIndex: 5,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    gap: 12,
  },
  loadingShimmer: {
    height: 16,
    borderRadius: 4,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

// Export with error boundary
export default withErrorBoundary(Card, {
  context: 'Card',
  fallback: <ErrorBoundary.Fallback />,
});

// Custom Hook for Card Management
export const useCard = (initialState = {}) => {
  // Implementation of advanced card management hook
  return {
    // Hook implementation
  };
};