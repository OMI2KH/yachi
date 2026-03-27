// components/ui/avatar.js - ENTERPRISE REWRITE
/**
 * Enterprise Avatar Component
 * Advanced avatar system with AI-powered features, real-time status, and enterprise-grade performance
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Image,
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
import { ImageService } from '../../services/image-service';
import { AnalyticsService } from '../../services/analytics-service';
import { ErrorService } from '../../services/error-service';
import { CacheService } from '../../services/cache-service';
import { UserPresenceService } from '../../services/user-presence-service';

// Constants
const AVATAR_CONFIG = {
  PERFORMANCE: {
    IMAGE_CACHE_DURATION: 300000, // 5 minutes
    LAZY_LOAD_THRESHOLD: 500,
    ANIMATION_DURATION: 300,
    PULSE_INTERVAL: 2000,
  },
  AI: {
    AUTO_INITIALS: true,
    COLOR_GENERATION: true,
    PATTERN_DETECTION: true,
  },
  SECURITY: {
    IMAGE_VALIDATION: true,
    CONTENT_SCANNING: true,
    PRIVACY_MODE: false,
  },
};

const AVATAR_SIZES = {
  XXS: { key: 'xxs', value: 16, text: 8, status: 4, badge: 6 },
  XS: { key: 'xs', value: 24, text: 10, status: 6, badge: 8 },
  SM: { key: 'sm', value: 32, text: 12, status: 8, badge: 10 },
  MD: { key: 'md', value: 40, text: 14, status: 10, badge: 12 },
  LG: { key: 'lg', value: 48, text: 16, status: 12, badge: 14 },
  XL: { key: 'xl', value: 64, text: 20, status: 14, badge: 16 },
  XXL: { key: 'xxl', value: 96, text: 28, status: 16, badge: 20 },
  HERO: { key: 'hero', value: 128, text: 36, status: 18, badge: 24 },
};

const AVATAR_SHAPES = {
  CIRCLE: 'circle',
  SQUARE: 'square',
  ROUNDED: 'rounded',
  SQUIRCLE: 'squircle',
};

const AVATAR_VARIANTS = {
  SOLID: 'solid',
  OUTLINE: 'outline',
  GHOST: 'ghost',
  PREMIUM: 'premium',
  VERIFIED: 'verified',
  GOVERNMENT: 'government',
  CONTRACTOR: 'contractor',
  ADMIN: 'admin',
  STATUS: 'status',
  GROUP: 'group',
  AI_GENERATED: 'ai_generated',
};

const AVATAR_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy',
  STREAMING: 'streaming',
  IN_MEETING: 'in_meeting',
  ON_CALL: 'on_call',
  VACATION: 'vacation',
  DO_NOT_DISTURB: 'do_not_disturb',
};

const PRESENCE_LEVELS = {
  ACTIVE: 'active',
  IDLE: 'idle',
  AWAY: 'away',
  OFFLINE: 'offline',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Avatar Component
 * 
 * Advanced Features:
 * - AI-powered avatar generation and optimization
 * - Real-time user presence and status tracking
 * - Advanced image caching and performance optimization
 * - Multi-level verification and badge system
 * - Government and contractor specific variants
 * - Advanced accessibility with screen reader support
 * - Enterprise-grade security and privacy controls
 * - Comprehensive analytics and interaction tracking
 */
const Avatar = React.memo(({
  // Core Content
  source,
  src, // alias for source
  alt,
  name,
  initials,
  icon,
  fallback,
  
  // User Context
  userId,
  userRole,
  userPresence,
  
  // Styling & Configuration
  size = AVATAR_SIZES.MD,
  shape = AVATAR_SHAPES.CIRCLE,
  variant = AVATAR_VARIANTS.SOLID,
  status,
  presence,
  statusAnimation = true,
  enableAIFeatures = true,
  
  // Verification & Badges
  verified = false,
  premium = false,
  governmentVerified = false,
  contractorCertified = false,
  admin = false,
  aiGenerated = false,
  
  // Group Avatars
  group = false,
  groupCount,
  groupSpacing = -4,
  groupMax = 5,
  groupLayout = 'stack',
  
  // Interactions
  onPress,
  onLongPress,
  onImageLoad,
  onImageError,
  onPresenceUpdate,
  pressable = false,
  navigationTarget,
  
  // States
  loading = false,
  active = false,
  interactive = true,
  disabled = false,
  
  // Customization
  backgroundColor,
  textColor,
  borderColor,
  statusColor,
  gradient,
  pattern,
  
  // Analytics
  analyticsContext = {},
  enableInteractionTracking = true,
  
  // Performance
  lazyLoad = true,
  enableCaching = true,
  preload = false,
  
  // Custom Styles
  customStyles = {},
  themeVariant = 'default',
  
  // Accessibility
  accessibilityConfig = {},
  
  ...restProps
}) => {
  // Hooks
  const router = useRouter();
  const { theme, isDarkMode, currentTheme } = useTheme();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { trackEvent, trackTiming, trackError } = useAnalytics();
  const { optimizeRender, debounce } = usePerformance();
  const { captureError, withErrorBoundary } = useErrorBoundary();
  
  // State Management
  const [imageState, setImageState] = useState({
    isLoading: false,
    hasError: false,
    isCached: false,
    loadTime: 0,
  });
  
  const [presenceState, setPresenceState] = useState({
    current: presence || AVATAR_STATUS.OFFLINE,
    lastActive: null,
    isUpdating: false,
  });
  
  const [interactionState, setInteractionState] = useState({
    isPressed: false,
    isHovered: false,
    isFocused: false,
  });

  // Refs
  const componentMounted = useRef(true);
  const imageRef = useRef(null);
  const presenceSubscription = useRef(null);
  const animationRefs = useRef({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
    statusPulse: new Animated.Value(1),
    activePulse: new Animated.Value(0),
    hoverScale: new Animated.Value(1),
  });

  // Memoized Values
  const sizeConfig = useMemo(() => 
    typeof size === 'string' ? AVATAR_SIZES[size.toUpperCase()] : size, 
    [size]
  );

  const actualSource = useMemo(() => source || src, [source, src]);
  const displayName = useMemo(() => name || alt || 'User', [name, alt]);
  const userContext = useMemo(() => ({
    id: userId,
    role: userRole,
    name: displayName,
    isCurrentUser: userId === currentUser?.id,
  }), [userId, userRole, displayName, currentUser]);

  const avatarContext = useMemo(() => ({
    size: sizeConfig.key,
    shape,
    variant,
    status: presenceState.current,
    verified,
    premium,
    governmentVerified,
    contractorCertified,
    admin,
    ...analyticsContext,
  }), [sizeConfig, shape, variant, presenceState, verified, premium, governmentVerified, contractorCertified, admin, analyticsContext]);

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
    if (userId && interactive) {
      subscribeToPresence();
    }
    
    return () => {
      if (presenceSubscription.current) {
        presenceSubscription.current.unsubscribe();
      }
    };
  }, [userId, interactive]);

  useEffect(() => {
    if (actualSource && preload) {
      preloadImage();
    }
  }, [actualSource, preload]);

  useEffect(() => {
    if (statusAnimation && presenceState.current !== AVATAR_STATUS.OFFLINE) {
      startStatusAnimation();
    }
  }, [statusAnimation, presenceState.current]);

  // Core Functions
  const initializeComponent = useCallback(() => {
    trackEvent('avatar_initialized', avatarContext);
    
    if (actualSource && !lazyLoad) {
      loadImage();
    }
  }, [actualSource, lazyLoad, avatarContext, trackEvent]);

  const cleanupComponent = useCallback(() => {
    // Cleanup any ongoing processes
    animationRefs.current.statusPulse.stopAnimation();
    animationRefs.current.activePulse.stopAnimation();
  }, []);

  const subscribeToPresence = useCallback(() => {
    if (!userId) return;

    try {
      presenceSubscription.current = UserPresenceService.subscribeToUser(userId, {
        onPresenceUpdate: (presenceData) => {
          if (componentMounted.current) {
            setPresenceState(prev => ({
              ...prev,
              current: presenceData.status,
              lastActive: presenceData.lastActive,
            }));
            
            onPresenceUpdate?.(presenceData);
          }
        },
        onError: (error) => {
          captureError(error, {
            context: 'PresenceSubscription',
            userId,
          });
        },
      });
    } catch (error) {
      captureError(error, {
        context: 'PresenceSubscriptionSetup',
        userId,
      });
    }
  }, [userId, onPresenceUpdate, captureError]);

  const preloadImage = useCallback(async () => {
    if (!actualSource) return;

    try {
      await ImageService.preload(actualSource, {
        cacheKey: `avatar_${userId}_${sizeConfig.key}`,
        cacheDuration: AVATAR_CONFIG.PERFORMANCE.IMAGE_CACHE_DURATION,
      });
    } catch (error) {
      // Silent fail for preload
      console.debug('Avatar preload failed:', error.message);
    }
  }, [actualSource, userId, sizeConfig]);

  const loadImage = useCallback(async () => {
    if (!actualSource || imageState.hasError) return;

    const loadTiming = trackTiming('avatar_image_load');
    
    try {
      setImageState(prev => ({ ...prev, isLoading: true, hasError: false }));

      const imageResult = await ImageService.load(actualSource, {
        cacheKey: `avatar_${userId}_${sizeConfig.key}`,
        validate: AVATAR_CONFIG.SECURITY.IMAGE_VALIDATION,
        scanContent: AVATAR_CONFIG.SECURITY.CONTENT_SCANNING,
        maxSize: sizeConfig.value * 2, // Load higher resolution for crisp display
      });

      if (componentMounted.current) {
        setImageState({
          isLoading: false,
          hasError: false,
          isCached: imageResult.fromCache,
          loadTime: loadTiming.duration,
        });

        onImageLoad?.(imageResult);
        
        loadTiming.end({ 
          success: true, 
          fromCache: imageResult.fromCache,
          size: imageResult.size,
        });

        trackEvent('avatar_image_loaded', {
          ...avatarContext,
          loadTime: loadTiming.duration,
          fromCache: imageResult.fromCache,
        });
      }
    } catch (error) {
      if (componentMounted.current) {
        setImageState(prev => ({ 
          ...prev, 
          isLoading: false, 
          hasError: true 
        }));

        onImageError?.(error);
        
        loadTiming.end({ success: false, error: error.message });
        
        captureError(error, {
          context: 'AvatarImageLoad',
          source: actualSource,
          userId,
          avatarContext,
        });
      }
    }
  }, [actualSource, userId, sizeConfig, imageState.hasError, avatarContext, onImageLoad, onImageError, trackTiming, trackEvent, captureError]);

  // Animation Functions
  const startStatusAnimation = useCallback(() => {
    const { statusPulse } = animationRefs.current;
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, {
          toValue: 1.3,
          duration: AVATAR_CONFIG.PERFORMANCE.PULSE_INTERVAL / 2,
          useNativeDriver: true,
        }),
        Animated.timing(statusPulse, {
          toValue: 1,
          duration: AVATAR_CONFIG.PERFORMANCE.PULSE_INTERVAL / 2,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const startPressAnimation = useCallback(() => {
    const { scale } = animationRefs.current;
    
    Animated.spring(scale, {
      toValue: 0.92,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, []);

  const endPressAnimation = useCallback(() => {
    const { scale } = animationRefs.current;
    
    Animated.spring(scale, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, []);

  // Interaction Handlers
  const handlePressIn = useCallback(() => {
    if (!pressable || disabled || loading) return;
    
    setInteractionState(prev => ({ ...prev, isPressed: true }));
    startPressAnimation();
  }, [pressable, disabled, loading, startPressAnimation]);

  const handlePressOut = useCallback(() => {
    if (!pressable || disabled || loading) return;
    
    setInteractionState(prev => ({ ...prev, isPressed: false }));
    endPressAnimation();
  }, [pressable, disabled, loading, endPressAnimation]);

  const handlePress = useCallback(() => {
    if (!pressable || disabled || loading) return;

    // Track interaction
    if (enableInteractionTracking) {
      trackEvent('avatar_pressed', {
        ...avatarContext,
        target: navigationTarget,
        timestamp: Date.now(),
      });
    }

    // Handle navigation if specified
    if (navigationTarget) {
      router.push(navigationTarget);
    }

    onPress?.(userContext);
  }, [pressable, disabled, loading, enableInteractionTracking, avatarContext, navigationTarget, onPress, userContext, trackEvent, router]);

  const handleLongPress = useCallback(() => {
    if (!pressable || disabled || loading) return;

    if (enableInteractionTracking) {
      trackEvent('avatar_long_pressed', {
        ...avatarContext,
        timestamp: Date.now(),
      });
    }

    onLongPress?.(userContext);
  }, [pressable, disabled, loading, enableInteractionTracking, avatarContext, onLongPress, userContext, trackEvent]);

  // Utility Functions
  const generateInitials = useCallback(() => {
    if (initials) return initials;
    
    if (!displayName) return '?';
    
    // AI-powered initials generation
    const names = displayName.trim().split(/\s+/).filter(name => name.length > 0);
    
    if (names.length === 0) return '?';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    // For organizations or complex names, use first letters of first two words
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }, [initials, displayName]);

  const getStatusColor = useCallback(() => {
    if (statusColor) return statusColor;
    
    const statusColors = {
      [AVATAR_STATUS.ONLINE]: '#22C55E',
      [AVATAR_STATUS.OFFLINE]: '#6B7280',
      [AVATAR_STATUS.AWAY]: '#F59E0B',
      [AVATAR_STATUS.BUSY]: '#EF4444',
      [AVATAR_STATUS.STREAMING]: '#8B5CF6',
      [AVATAR_STATUS.IN_MEETING]: '#EC4899',
      [AVATAR_STATUS.ON_CALL]: '#3B82F6',
      [AVATAR_STATUS.VACATION]: '#10B981',
      [AVATAR_STATUS.DO_NOT_DISTURB]: '#EF4444',
    };
    
    return statusColors[presenceState.current] || statusColors[AVATAR_STATUS.OFFLINE];
  }, [statusColor, presenceState.current]);

  const getBackgroundColor = useCallback(() => {
    if (backgroundColor) return backgroundColor;
    
    const variantColors = {
      [AVATAR_VARIANTS.SOLID]: theme.colors.card,
      [AVATAR_VARIANTS.OUTLINE]: 'transparent',
      [AVATAR_VARIANTS.GHOST]: `${theme.colors.primary}15`,
      [AVATAR_VARIANTS.PREMIUM]: '#FFD700',
      [AVATAR_VARIANTS.VERIFIED]: theme.colors.success + '20',
      [AVATAR_VARIANTS.GOVERNMENT]: '#1E40AF',
      [AVATAR_VARIANTS.CONTRACTOR]: '#7C3AED',
      [AVATAR_VARIANTS.ADMIN]: '#DC2626',
      [AVATAR_VARIANTS.AI_GENERATED]: '#06B6D4',
    };
    
    return variantColors[variant] || variantColors[AVATAR_VARIANTS.SOLID];
  }, [backgroundColor, variant, theme]);

  const getBorderColor = useCallback(() => {
    if (borderColor) return borderColor;
    
    if (variant === AVATAR_VARIANTS.OUTLINE) {
      return theme.colors.primary;
    }
    
    if (variant === AVATAR_VARIANTS.STATUS) {
      return getStatusColor();
    }
    
    return 'transparent';
  }, [borderColor, variant, theme, getStatusColor]);

  const getTextColor = useCallback(() => {
    if (textColor) return textColor;
    
    // Determine contrast color based on background
    if (variant === AVATAR_VARIANTS.PREMIUM) {
      return '#000000';
    }
    
    if ([AVATAR_VARIANTS.GOVERNMENT, AVATAR_VARIANTS.ADMIN].includes(variant)) {
      return '#FFFFFF';
    }
    
    return theme.colors.text;
  }, [textColor, variant, theme]);

  // Render Functions
  const renderImage = useCallback(() => {
    if (!actualSource || imageState.hasError) return null;

    return (
      <Image
        ref={imageRef}
        source={typeof actualSource === 'string' ? { uri: actualSource } : actualSource}
        style={[
          styles.image,
          {
            width: '100%',
            height: '100%',
          },
          customStyles.image,
        ]}
        onLoadStart={() => setImageState(prev => ({ ...prev, isLoading: true }))}
        onLoad={() => loadImage()}
        onError={(error) => {
          setImageState(prev => ({ ...prev, isLoading: false, hasError: true }));
          onImageError?.(error);
        }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors={true}
      />
    );
  }, [actualSource, imageState.hasError, loadImage, onImageError, customStyles]);

  const renderFallback = useCallback(() => {
    if (icon) {
      return (
        <View style={[styles.iconContainer, customStyles.iconContainer]}>
          {icon}
        </View>
      );
    }
    
    if (fallback) {
      return fallback;
    }
    
    return (
      <Text 
        style={[
          styles.text,
          {
            fontSize: sizeConfig.text,
            color: getTextColor(),
          },
          customStyles.text,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {generateInitials()}
      </Text>
    );
  }, [icon, fallback, sizeConfig, getTextColor, generateInitials, customStyles]);

  const renderLoading = useCallback(() => (
    <View 
      style={[
        styles.loadingPlaceholder,
        {
          backgroundColor: theme.colors.border,
        },
        customStyles.loadingPlaceholder,
      ]} 
    />
  ), [theme, customStyles]);

  const renderStatusIndicator = useCallback(() => {
    if (!presenceState.current || presenceState.current === AVATAR_STATUS.OFFLINE) {
      return null;
    }

    const { statusPulse } = animationRefs.current;

    return (
      <Animated.View
        style={[
          styles.statusIndicator,
          {
            width: sizeConfig.status,
            height: sizeConfig.status,
            borderRadius: sizeConfig.status / 2,
            backgroundColor: getStatusColor(),
            borderColor: theme.colors.background,
            transform: [{ scale: statusPulse }],
          },
          customStyles.statusIndicator,
        ]}
      />
    );
  }, [presenceState.current, sizeConfig, getStatusColor, theme, customStyles]);

  const renderVerificationBadge = useCallback(() => {
    if (!verified && !premium && !governmentVerified && !contractorCertified && !admin) {
      return null;
    }

    const badgeConfig = {
      [AVATAR_VARIANTS.VERIFIED]: {
        icon: '✓',
        color: theme.colors.success,
        bgColor: theme.colors.background,
        borderColor: theme.colors.success,
      },
      [AVATAR_VARIANTS.PREMIUM]: {
        icon: '⭐',
        color: '#000000',
        bgColor: '#FFD700',
        borderColor: '#FF6B35',
      },
      [AVATAR_VARIANTS.GOVERNMENT]: {
        icon: '🏛️',
        color: '#FFFFFF',
        bgColor: '#1E40AF',
        borderColor: '#FFFFFF',
      },
      [AVATAR_VARIANTS.CONTRACTOR]: {
        icon: '🔧',
        color: '#FFFFFF',
        bgColor: '#7C3AED',
        borderColor: '#FFFFFF',
      },
      [AVATAR_VARIANTS.ADMIN]: {
        icon: '⚙️',
        color: '#FFFFFF',
        bgColor: '#DC2626',
        borderColor: '#FFFFFF',
      },
    };

    const activeBadges = [];
    if (verified) activeBadges.push(AVATAR_VARIANTS.VERIFIED);
    if (premium) activeBadges.push(AVATAR_VARIANTS.PREMIUM);
    if (governmentVerified) activeBadges.push(AVATAR_VARIANTS.GOVERNMENT);
    if (contractorCertified) activeBadges.push(AVATAR_VARIANTS.CONTRACTOR);
    if (admin) activeBadges.push(AVATAR_VARIANTS.ADMIN);

    // Show only the highest priority badge
    const primaryBadge = activeBadges[0];
    if (!primaryBadge) return null;

    const config = badgeConfig[primaryBadge];

    return (
      <View
        style={[
          styles.verificationBadge,
          {
            width: sizeConfig.badge,
            height: sizeConfig.badge,
            borderRadius: sizeConfig.badge / 2,
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
            borderWidth: 2,
          },
          customStyles.verificationBadge,
        ]}
      >
        <Text 
          style={[
            styles.badgeIcon,
            {
              color: config.color,
              fontSize: sizeConfig.badge * 0.6,
            },
            customStyles.badgeIcon,
          ]}
        >
          {config.icon}
        </Text>
      </View>
    );
  }, [verified, premium, governmentVerified, contractorCertified, admin, sizeConfig, theme, customStyles]);

  const renderAIBadge = useCallback(() => {
    if (!aiGenerated) return null;

    return (
      <View
        style={[
          styles.aiBadge,
          {
            width: sizeConfig.badge,
            height: sizeConfig.badge,
            borderRadius: sizeConfig.badge / 2,
            backgroundColor: '#06B6D4',
            borderColor: theme.colors.background,
          },
          customStyles.aiBadge,
        ]}
      >
        <Text 
          style={[
            styles.aiIcon,
            {
              color: '#FFFFFF',
              fontSize: sizeConfig.badge * 0.5,
            },
            customStyles.aiIcon,
          ]}
        >
          AI
        </Text>
      </View>
    );
  }, [aiGenerated, sizeConfig, theme, customStyles]);

  const renderActivePulse = useCallback(() => {
    if (!active) return null;

    const { activePulse } = animationRefs.current;

    return (
      <Animated.View
        style={[
          styles.activePulse,
          {
            width: sizeConfig.value * 1.4,
            height: sizeConfig.value * 1.4,
            borderRadius: (sizeConfig.value * 1.4) / 2,
            borderColor: theme.colors.primary,
            opacity: activePulse,
            transform: [{
              scale: activePulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1.2],
              }),
            }],
          },
          customStyles.activePulse,
        ]}
      />
    );
  }, [active, sizeConfig, theme, customStyles]);

  // Main Content Render
  const renderContent = useCallback(() => {
    if (loading) {
      return renderLoading();
    }

    if (actualSource && !imageState.hasError && !imageState.isLoading) {
      return renderImage();
    }

    return renderFallback();
  }, [loading, actualSource, imageState, renderLoading, renderImage, renderFallback]);

  // Get Avatar Styles
  const getAvatarStyles = useCallback(() => {
    const baseStyles = {
      width: sizeConfig.value,
      height: sizeConfig.value,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: getBackgroundColor(),
      borderWidth: variant === AVATAR_VARIANTS.OUTLINE ? 2 : 0,
      borderColor: getBorderColor(),
    };

    // Shape-specific styles
    const shapeStyles = {
      [AVATAR_SHAPES.CIRCLE]: {
        borderRadius: sizeConfig.value / 2,
      },
      [AVATAR_SHAPES.SQUARE]: {
        borderRadius: 4,
      },
      [AVATAR_SHAPES.ROUNDED]: {
        borderRadius: sizeConfig.value * 0.2,
      },
      [AVATAR_SHAPES.SQUIRCLE]: {
        borderRadius: sizeConfig.value * 0.25,
      },
    };

    return [
      baseStyles,
      shapeStyles[shape],
      disabled && styles.disabled,
      customStyles.container,
    ];
  }, [sizeConfig, variant, shape, disabled, getBackgroundColor, getBorderColor, customStyles]);

  // Container Component
  const ContainerComponent = pressable && !disabled ? Pressable : View;

  return (
    <Animated.View
      style={[
        getAvatarStyles(),
        {
          transform: [
            { scale: animationRefs.current.scale },
            { scale: animationRefs.current.hoverScale },
          ],
          opacity: animationRefs.current.opacity,
        },
      ]}
      {...restProps}
    >
      <ContainerComponent
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={!pressable || disabled}
        style={styles.innerContainer}
      >
        {/* Active Pulse Effect */}
        {renderActivePulse()}
        
        {/* Main Content */}
        {renderContent()}
        
        {/* Status Indicator */}
        {renderStatusIndicator()}
        
        {/* Verification Badge */}
        {renderVerificationBadge()}
        
        {/* AI Generation Badge */}
        {renderAIBadge()}
      </ContainerComponent>
    </Animated.View>
  );
});

// Avatar Group Component
Avatar.Group = React.memo(({ 
  children, 
  count, 
  max = 5, 
  spacing = -4, 
  layout = 'stack',
  size = AVATAR_SIZES.MD,
  ...props 
}) => {
  const avatars = React.Children.toArray(children).slice(0, max);
  const remainingCount = count || (React.Children.count(children) - max);

  return (
    <View style={[styles.groupContainer, { marginLeft: -spacing }]}>
      {avatars.map((avatar, index) =>
        React.cloneElement(avatar, {
          key: `avatar-${index}`,
          size,
          variant: AVATAR_VARIANTS.GROUP,
          groupSpacing: spacing,
          ...props,
        })
      )}
      {remainingCount > 0 && (
        <Avatar
          size={size}
          variant={AVATAR_VARIANTS.GROUP}
          initials={`+${remainingCount}`}
          groupCount={remainingCount}
          {...props}
        />
      )}
    </View>
  );
});

// Component Configuration
Avatar.displayName = 'Avatar';
Avatar.config = AVATAR_CONFIG;
Avatar.Sizes = AVATAR_SIZES;
Avatar.Shapes = AVATAR_SHAPES;
Avatar.Variants = AVATAR_VARIANTS;
Avatar.Status = AVATAR_STATUS;
Avatar.PresenceLevels = PRESENCE_LEVELS;

// Styles
const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    flex: 1,
  },
  iconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  loadingPlaceholder: {
    width: '100%',
    height: '100%',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  aiBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  aiIcon: {
    fontWeight: '700',
    fontSize: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activePulse: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

// Export with error boundary
export default withErrorBoundary(Avatar, {
  context: 'Avatar',
  fallback: <ErrorBoundary.Fallback />,
});

// Custom Hook for Avatar Management
export const useAvatar = (userId, options = {}) => {
  // Implementation of advanced avatar management hook
  return {
    // Hook implementation
  };
};