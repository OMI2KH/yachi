// components/ui/loading.js
// ============================================================
// YACHI ENTERPRISE LOADING COMPONENT
// ============================================================

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
  I18nManager,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// Context
import { useTheme } from '../../contexts/theme-context';
import { useLanguage } from './language-selector';

// Constants
import { YachiColors } from '../../constants/colors';
import { AppConfig } from '../../config/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

class YachiLoadingService {
  constructor() {
    this.types = this.getLoadingTypes();
    this.sizes = this.getLoadingSizes();
    this.messages = this.getDefaultMessages();
  }

  getLoadingTypes() {
    return {
      FULL_SCREEN: 'full_screen',
      OVERLAY: 'overlay',
      INLINE: 'inline',
      SPINNER: 'spinner',
      SKELETON: 'skeleton',
      PROGRESS: 'progress',
      PULSE: 'pulse',
      WAVE: 'wave',
    };
  }

  getLoadingSizes() {
    return {
      SMALL: 'small',
      MEDIUM: 'medium',
      LARGE: 'large',
      XLARGE: 'xlarge',
    };
  }

  getDefaultMessages() {
    return {
      en: {
        loading: 'Loading...',
        processing: 'Processing...',
        saving: 'Saving changes...',
        uploading: 'Uploading...',
        matching: 'Finding best workers...',
        payment: 'Processing payment...',
        ai: 'AI is working...',
      },
      am: {
        loading: 'በመጫን ላይ...',
        processing: 'በማቀናበር ላይ...',
        saving: 'ለውጦች በማስቀመጥ ላይ...',
        uploading: 'በመጫን ላይ...',
        matching: 'ምርጥ ሠራተኞች በማግኘት ላይ...',
        payment: 'ክፍያ በማቀናበር ላይ...',
        ai: 'AI እየሰራ ነው...',
      },
      om: {
        loading: 'Ku loadsaa...',
        processing: 'Ku processaa...',
        saving: 'Jijjiirraan ku savegodhaa...',
        uploading: 'Ku uploadaa...',
        matching: 'Hojjettoota bareedaa barbaachisa...',
        payment: 'Kaffaltii ku processaa...',
        ai: 'AI hojjachaa jira...',
      },
    };
  }

  getMessage(key, language = 'en') {
    return this.messages[language]?.[key] || this.messages.en[key] || 'Loading...';
  }

  getSpinnerConfig(size) {
    const config = {
      small: { size: 'small', scale: 0.8 },
      medium: { size: Platform.OS === 'ios' ? 'large' : 'large', scale: 1 },
      large: { size: Platform.OS === 'ios' ? 'large' : 36, scale: 1.2 },
      xlarge: { size: Platform.OS === 'ios' ? 'large' : 48, scale: 1.5 },
    };
    return config[size] || config.medium;
  }

  shouldUseHaptics(type) {
    return [this.types.FULL_SCREEN, this.types.PROGRESS].includes(type);
  }
}

// Singleton instance
export const loadingService = new YachiLoadingService();

/**
 * Enterprise Loading Component with Advanced Features
 * Supports multiple types, sizes, animations, and internationalization
 */
export default function Loading({
  type = loadingService.types.SPINNER,
  size = loadingService.sizes.MEDIUM,
  message,
  messageKey,
  progress,
  showLogo = false,
  overlay = false,
  transparent = false,
  blurIntensity = 80,
  duration = 0,
  onLoadingComplete,
  testID = 'yachi-loading',
  accessibilityLabel,
  showProgressText = true,
  customColor,
  children,
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Resolved message with internationalization
  const resolvedMessage = useMemo(() => {
    if (message) return message;
    if (messageKey) return loadingService.getMessage(messageKey, currentLanguage.code);
    return loadingService.getMessage('loading', currentLanguage.code);
  }, [message, messageKey, currentLanguage]);

  // Start animations on mount
  useEffect(() => {
    startEntranceAnimation();

    // Haptic feedback for important loaders
    if (loadingService.shouldUseHaptics(type)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Haptics not available
      });
    }

    // Auto-dismiss functionality
    if (duration > 0 && type !== loadingService.types.PROGRESS) {
      const timer = setTimeout(() => {
        onLoadingComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [type, duration, onLoadingComplete]);

  // Progress animation
  useEffect(() => {
    if (type === loadingService.types.PROGRESS && progress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: Math.min(Math.max(progress, 0), 100),
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [progress, type]);

  const startEntranceAnimation = useCallback(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Type-specific animations
    switch (type) {
      case loadingService.types.SPINNER:
      case loadingService.types.FULL_SCREEN:
        startPulseAnimation();
        startRotationAnimation();
        break;
      case loadingService.types.PULSE:
        startPulseAnimation();
        break;
      case loadingService.types.WAVE:
        startWaveAnimation();
        break;
      case loadingService.types.INLINE:
        startRotationAnimation();
        break;
    }
  }, [type]);

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const startRotationAnimation = useCallback(() => {
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const startWaveAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spinnerConfig = loadingService.getSpinnerConfig(size);
  const spinnerColor = customColor || colors.primary;

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  // Render methods for each loading type
  const renderLoadingContent = () => {
    const renderers = {
      [loadingService.types.FULL_SCREEN]: renderFullScreenLoader,
      [loadingService.types.OVERLAY]: renderOverlayLoader,
      [loadingService.types.INLINE]: renderInlineLoader,
      [loadingService.types.SPINNER]: renderSpinnerLoader,
      [loadingService.types.SKELETON]: renderSkeletonLoader,
      [loadingService.types.PROGRESS]: renderProgressLoader,
      [loadingService.types.PULSE]: renderPulseLoader,
      [loadingService.types.WAVE]: renderWaveLoader,
    };

    const renderer = renderers[type] || renderSpinnerLoader;
    return renderer();
  };

  const renderFullScreenLoader = () => (
    <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
      <Animated.View style={[
        styles.fullScreenContent,
        { 
          opacity: fadeAnim,
          transform: [{ scale: pulseAnim }]
        }
      ]}>
        {showLogo && renderYachiLogo()}
        
        <ActivityIndicator
          size={spinnerConfig.size}
          color={spinnerColor}
          style={styles.fullScreenSpinner}
        />
        
        <Text style={[
          styles.message,
          styles.fullScreenMessage,
          getMessageStyle(),
          { color: colors.foreground }
        ]}>
          {resolvedMessage}
        </Text>

        {children}
      </Animated.View>
    </View>
  );

  const renderOverlayLoader = () => (
    <View style={[
      styles.overlayContainer,
      transparent && styles.transparentOverlay
    ]}>
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? 'dark' : 'light'}
        style={styles.blurView}
      >
        <Animated.View style={[
          styles.overlayContent,
          { opacity: fadeAnim }
        ]}>
          <ActivityIndicator
            size={spinnerConfig.size}
            color={spinnerColor}
          />
          {resolvedMessage && (
            <Text style={[
              styles.message,
              styles.overlayMessage,
              getMessageStyle(),
              { color: colors.foreground }
            ]}>
              {resolvedMessage}
            </Text>
          )}
          {children}
        </Animated.View>
      </BlurView>
    </View>
  );

  const renderInlineLoader = () => (
    <Animated.View style={[
      styles.inlineContainer,
      { 
        opacity: fadeAnim,
        transform: [{ rotate: rotation }]
      }
    ]}>
      <ActivityIndicator
        size={spinnerConfig.size}
        color={spinnerColor}
      />
      {resolvedMessage && (
        <Text style={[
          styles.message,
          styles.inlineMessage,
          getMessageStyle(),
          { color: colors.foreground }
        ]}>
          {resolvedMessage}
        </Text>
      )}
    </Animated.View>
  );

  const renderSpinnerLoader = () => (
    <View style={styles.spinnerContainer}>
      <ActivityIndicator
        size={spinnerConfig.size}
        color={spinnerColor}
      />
      {resolvedMessage && (
        <Text style={[
          styles.message,
          getMessageStyle(),
          { color: colors.foreground }
        ]}>
          {resolvedMessage}
        </Text>
      )}
    </View>
  );

  const renderSkeletonLoader = () => (
    <Animated.View style={[styles.skeletonContainer, { opacity: fadeAnim }]}>
      <View style={styles.skeletonRow}>
        <View style={[
          styles.skeletonCircle,
          { backgroundColor: colors.muted }
        ]} />
        <View style={styles.skeletonTextContainer}>
          <View style={[
            styles.skeletonLine,
            styles.skeletonLineShort,
            { backgroundColor: colors.muted }
          ]} />
          <View style={[
            styles.skeletonLine,
            styles.skeletonLineLong,
            { backgroundColor: colors.muted }
          ]} />
        </View>
      </View>
      {resolvedMessage && (
        <Text style={[
          styles.message,
          getMessageStyle(),
          { color: colors.foreground }
        ]}>
          {resolvedMessage}
        </Text>
      )}
    </Animated.View>
  );

  const renderProgressLoader = () => (
    <Animated.View style={[styles.progressContainer, { opacity: fadeAnim }]}>
      <View style={[styles.progressBarBackground, { backgroundColor: colors.muted }]}>
        <Animated.View 
          style={[
            styles.progressBarFill,
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: spinnerColor
            }
          ]} 
        />
      </View>
      {resolvedMessage && (
        <Text style={[
          styles.message,
          styles.progressMessage,
          getMessageStyle(),
          { color: colors.foreground }
        ]}>
          {resolvedMessage} {showProgressText && progress !== undefined && `(${Math.round(progress)}%)`}
        </Text>
      )}
    </Animated.View>
  );

  const renderPulseLoader = () => (
    <Animated.View style={[
      styles.pulseContainer,
      { 
        opacity: fadeAnim,
        transform: [{ scale: pulseAnim }]
      }
    ]}>
      <View style={[styles.pulseDot, { backgroundColor: spinnerColor }]} />
      {resolvedMessage && (
        <Text style={[
          styles.message,
          getMessageStyle(),
          { color: colors.foreground }
        ]}>
          {resolvedMessage}
        </Text>
      )}
    </Animated.View>
  );

  const renderWaveLoader = () => (
    <View style={styles.waveContainer}>
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              backgroundColor: spinnerColor,
              opacity: waveAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 1, 0.3],
              }),
              transform: [
                {
                  scaleY: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.5],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      {resolvedMessage && (
        <Text style={[
          styles.message,
          getMessageStyle(),
          { color: colors.foreground }
        ]}>
          {resolvedMessage}
        </Text>
      )}
    </View>
  );

  const renderYachiLogo = () => (
    <View style={styles.logoContainer}>
      <View style={[
        styles.logo,
        { backgroundColor: spinnerColor }
      ]} />
      <Text style={[
        styles.logoText,
        { color: colors.foreground }
      ]}>
        Yachi
      </Text>
    </View>
  );

  const getMessageStyle = () => {
    const sizeStyles = {
      [loadingService.sizes.SMALL]: styles.messageSmall,
      [loadingService.sizes.MEDIUM]: styles.messageMedium,
      [loadingService.sizes.LARGE]: styles.messageLarge,
      [loadingService.sizes.XLARGE]: styles.messageXLarge,
    };
    return sizeStyles[size] || styles.messageMedium;
  };

  const resolvedAccessibilityLabel = accessibilityLabel || resolvedMessage || 'Loading content';

  return (
    <Animated.View 
      style={[
        styles.container,
        overlay && styles.overlay,
        type === loadingService.types.INLINE && styles.inline,
      ]} 
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      {renderLoadingContent()}
    </Animated.View>
  );
}

// Pre-configured loading components for common use cases
export function LoadingScreen({ messageKey = 'loading', showLogo = true, ...props }) {
  return (
    <Loading
      type={loadingService.types.FULL_SCREEN}
      size={loadingService.sizes.LARGE}
      messageKey={messageKey}
      showLogo={showLogo}
      {...props}
    />
  );
}

export function LoadingOverlay({ messageKey, transparent = false, ...props }) {
  return (
    <Loading
      type={loadingService.types.OVERLAY}
      messageKey={messageKey}
      transparent={transparent}
      {...props}
    />
  );
}

export function LoadingInline({ messageKey, ...props }) {
  return (
    <Loading
      type={loadingService.types.INLINE}
      messageKey={messageKey}
      {...props}
    />
  );
}

export function LoadingSkeleton({ messageKey, ...props }) {
  return (
    <Loading
      type={loadingService.types.SKELETON}
      messageKey={messageKey}
      {...props}
    />
  );
}

export function LoadingProgress({ progress, messageKey, ...props }) {
  return (
    <Loading
      type={loadingService.types.PROGRESS}
      progress={progress}
      messageKey={messageKey}
      {...props}
    />
  );
}

export function LoadingAI({ messageKey = 'ai', ...props }) {
  return (
    <Loading
      type={loadingService.types.PULSE}
      size={loadingService.sizes.MEDIUM}
      messageKey={messageKey}
      customColor={YachiColors.special.ethiopianGreen}
      {...props}
    />
  );
}

export function LoadingPayment({ messageKey = 'payment', ...props }) {
  return (
    <Loading
      type={loadingService.types.PROGRESS}
      messageKey={messageKey}
      customColor={YachiColors.success[500]}
      {...props}
    />
  );
}

// Hook for controlling loading states
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const show = useCallback(() => setIsLoading(true), []);
  const hide = useCallback(() => setIsLoading(false), []);
  const toggle = useCallback(() => setIsLoading(prev => !prev), []);

  return {
    isLoading,
    show,
    hide,
    toggle,
    setIsLoading,
  };
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  inline: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },

  // Full Screen
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullScreenContent: {
    alignItems: 'center',
    padding: 40,
  },
  fullScreenSpinner: {
    marginVertical: 30,
  },
  fullScreenMessage: {
    marginTop: 20,
  },

  // Overlay
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transparentOverlay: {
    backgroundColor: 'transparent',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayMessage: {
    marginTop: 15,
  },

  // Inline
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  inlineMessage: {
    marginLeft: 8,
  },

  // Spinner
  spinnerContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Skeleton
  skeletonContainer: {
    padding: 16,
    width: '100%',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '60%',
  },
  skeletonLineLong: {
    width: '90%',
  },

  // Progress
  progressContainer: {
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMessage: {
    marginTop: 12,
  },

  // Pulse
  pulseContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
  },

  // Wave
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  waveBar: {
    width: 8,
    height: 30,
    borderRadius: 4,
    marginHorizontal: 3,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Message
  message: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  messageSmall: {
    fontSize: 12,
  },
  messageMedium: {
    fontSize: 14,
  },
  messageLarge: {
    fontSize: 16,
  },
  messageXLarge: {
    fontSize: 18,
  },
});

export { loadingService };