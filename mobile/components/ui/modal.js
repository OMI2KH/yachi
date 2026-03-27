// components/ui/modal.js
// ============================================================
// YACHI ENTERPRISE MODAL COMPONENT
// ============================================================

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Platform,
  BackHandler,
  Keyboard,
  StatusBar,
  I18nManager,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Context
import { useTheme } from '../../contexts/theme-context';
import { useLanguage } from './language-selector';

// Services
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Constants
import { YachiColors } from '../../constants/colors';
import { AppConfig } from '../../config/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

class YachiModalService {
  constructor() {
    this.types = this.getModalTypes();
    this.sizes = this.getModalSizes();
    this.animations = this.getAnimationConfigs();
    this.backdropBehaviors = this.getBackdropBehaviors();
  }

  getModalTypes() {
    return {
      CENTER: 'center',
      BOTTOM: 'bottom',
      FULLSCREEN: 'fullscreen',
      SIDE: 'side',
      TOP: 'top',
      FLOATING: 'floating',
    };
  }

  getModalSizes() {
    return {
      SMALL: 'small',
      MEDIUM: 'medium',
      LARGE: 'large',
      XLARGE: 'xlarge',
      AUTO: 'auto',
      FULL: 'full',
    };
  }

  getAnimationConfigs() {
    return {
      FADE: 'fade',
      SLIDE: 'slide',
      SCALE: 'scale',
      BOUNCE: 'bounce',
      NONE: 'none',
    };
  }

  getBackdropBehaviors() {
    return {
      CLOSE: 'close',
      NONE: 'none',
      STATIC: 'static',
    };
  }

  getSizeDimensions(size, type) {
    const baseDimensions = {
      [this.sizes.SMALL]: { width: '80%', height: '30%' },
      [this.sizes.MEDIUM]: { width: '85%', height: '50%' },
      [this.sizes.LARGE]: { width: '90%', height: '70%' },
      [this.sizes.XLARGE]: { width: '95%', height: '85%' },
      [this.sizes.AUTO]: { width: '90%', height: undefined },
      [this.sizes.FULL]: { width: '100%', height: '100%' },
    };

    const dimensions = baseDimensions[size] || baseDimensions[this.sizes.MEDIUM];

    // Adjust for modal type
    if (type === this.types.BOTTOM) {
      return { ...dimensions, width: '100%', height: dimensions.height };
    }

    if (type === this.types.SIDE) {
      return { width: '85%', height: '100%' };
    }

    if (type === this.types.FULLSCREEN) {
      return { width: '100%', height: '100%' };
    }

    return dimensions;
  }

  getAnimationConfig(type, animation) {
    const configs = {
      [this.types.CENTER]: {
        [this.animations.FADE]: {
          backdrop: { from: 0, to: 1 },
          content: { from: 0, to: 1, scale: true }
        },
        [this.animations.SCALE]: {
          backdrop: { from: 0, to: 1 },
          content: { from: 0.8, to: 1, scale: true }
        },
        [this.animations.BOUNCE]: {
          backdrop: { from: 0, to: 1 },
          content: { from: 0.3, to: 1, scale: true, bounce: true }
        }
      },
      [this.types.BOTTOM]: {
        [this.animations.SLIDE]: {
          backdrop: { from: 0, to: 1 },
          content: { from: SCREEN_HEIGHT, to: 0, translateY: true }
        }
      },
      [this.types.SIDE]: {
        [this.animations.SLIDE]: {
          backdrop: { from: 0, to: 1 },
          content: { from: -SCREEN_WIDTH, to: 0, translateX: true }
        }
      },
      [this.types.TOP]: {
        [this.animations.SLIDE]: {
          backdrop: { from: 0, to: 1 },
          content: { from: -SCREEN_HEIGHT, to: 0, translateY: true }
        }
      }
    };

    return configs[type]?.[animation] || configs[this.types.CENTER][this.animations.FADE];
  }

  shouldUseBlur(type) {
    return Platform.OS === 'ios' && type !== this.types.FULLSCREEN;
  }

  getStatusBarStyle(isDark) {
    return isDark ? 'light-content' : 'dark-content';
  }
}

// Singleton instance
export const modalService = new YachiModalService();

/**
 * Enterprise Modal Component with Advanced Features
 * Supports multiple types, animations, and enterprise-grade functionality
 */
export default function Modal({
  // Core Props
  visible = false,
  onClose = () => {},
  onShow = () => {},
  onDismiss = () => {},
  
  // Content Props
  children,
  title,
  subtitle,
  showHeader = true,
  showCloseButton = true,
  closeButtonPosition = 'right',
  
  // Configuration Props
  type = modalService.types.CENTER,
  size = modalService.sizes.AUTO,
  animation = 'fade',
  backdropBehavior = modalService.backdropBehaviors.CLOSE,
  dismissible = true,
  avoidKeyboard = true,
  statusBarStyle = 'auto',
  
  // Style Props
  backgroundColor,
  overlayColor,
  borderRadius,
  padding,
  customStyle,
  
  // Technical Props
  testID = 'yachi-modal',
  accessibilityLabel = 'Modal',
  preventBackdropPress = false,
  hardwareBackButton = true,
  analyticsEvent = 'modal_interaction',
  
  // Advanced Props
  beforeClose,
  onBackdropPress,
  onSwipeComplete,
  swipeDirection,
  swipeThreshold = 50,
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  
  // Refs
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  
  // State
  const [isVisible, setIsVisible] = useState(visible);
  const [contentHeight, setContentHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Memoized values
  const modalConfig = useMemo(() => 
    modalService.getAnimationConfig(type, animation), 
    [type, animation]
  );

  const sizeDimensions = useMemo(() => 
    modalService.getSizeDimensions(size, type), 
    [size, type]
  );

  const shouldUseBlur = useMemo(() => 
    modalService.shouldUseBlur(type), 
    [type]
  );

  const resolvedStatusBarStyle = useMemo(() => {
    if (statusBarStyle !== 'auto') return statusBarStyle;
    return modalService.getStatusBarStyle(isDark);
  }, [statusBarStyle, isDark]);

  // Animation setup
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      animateEntrance();
      trackAnalytics('modal_shown');
    } else {
      animateExit();
    }
  }, [visible]);

  // Back handler for hardware back button
  useEffect(() => {
    if (!hardwareBackButton || !visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => backHandler.remove();
  }, [hardwareBackButton, visible, onClose]);

  // Keyboard avoidance
  useEffect(() => {
    if (!avoidKeyboard) return;

    const showSubscription = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [avoidKeyboard]);

  const animateEntrance = useCallback(() => {
    const { backdrop, content } = modalConfig;

    // Reset animations
    backdropAnim.setValue(backdrop.from);
    contentAnim.setValue(content.from);

    // Backdrop animation
    Animated.timing(backdropAnim, {
      toValue: backdrop.to,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Content animation
    let contentAnimation;
    if (content.scale) {
      contentAnimation = Animated.spring(contentAnim, {
        toValue: content.to,
        tension: content.bounce ? 120 : 60,
        friction: 8,
        useNativeDriver: true,
      });
    } else if (content.translateY) {
      contentAnimation = Animated.spring(contentAnim, {
        toValue: content.to,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      });
    } else if (content.translateX) {
      contentAnimation = Animated.spring(contentAnim, {
        toValue: content.to,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      });
    } else {
      contentAnimation = Animated.timing(contentAnim, {
        toValue: content.to,
        duration: 300,
        useNativeDriver: true,
      });
    }

    contentAnimation.start(() => {
      onShow();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  }, [modalConfig, onShow]);

  const animateExit = useCallback(() => {
    const { backdrop, content } = modalConfig;

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: backdrop.from,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: content.from,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss();
    });
  }, [modalConfig, onDismiss]);

  const handleClose = useCallback(async () => {
    try {
      // Run beforeClose hook if provided
      if (beforeClose) {
        const shouldClose = await beforeClose();
        if (shouldClose === false) return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      trackAnalytics('modal_closed');
      onClose();
    } catch (error) {
      errorService.handleError(error, 'Modal Close Error');
    }
  }, [beforeClose, onClose]);

  const handleHardwareBack = useCallback(() => {
    if (dismissible) {
      handleClose();
      return true;
    }
    return false;
  }, [dismissible, handleClose]);

  const handleBackdropPress = useCallback(() => {
    if (preventBackdropPress) return;

    const behavior = onBackdropPress || backdropBehavior;
    
    if (behavior === modalService.backdropBehaviors.CLOSE && dismissible) {
      handleClose();
    }
  }, [preventBackdropPress, onBackdropPress, backdropBehavior, dismissible, handleClose]);

  const handleKeyboardShow = useCallback((event) => {
    setKeyboardVisible(true);
    Animated.timing(keyboardHeight, {
      toValue: event.endCoordinates.height,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleKeyboardHide = useCallback(() => {
    setKeyboardVisible(false);
    Animated.timing(keyboardHeight, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, []);

  const trackAnalytics = useCallback((action) => {
    analyticsService.trackEvent(analyticsEvent, {
      action,
      modal_type: type,
      modal_size: size,
      has_title: !!title,
    });
  }, [analyticsEvent, type, size, title]);

  const getContentTransform = useCallback(() => {
    const { content } = modalConfig;
    const transform = [];

    if (content.scale) {
      const scale = contentAnim.interpolate({
        inputRange: [content.from, content.to],
        outputRange: [content.from, content.to],
      });
      transform.push({ scale });
    }

    if (content.translateY) {
      const translateY = contentAnim.interpolate({
        inputRange: [content.from, content.to],
        outputRange: [content.from, content.to],
      });
      transform.push({ translateY });
    }

    if (content.translateX) {
      const translateX = contentAnim.interpolate({
        inputRange: [content.from, content.to],
        outputRange: [isRTL ? -content.from : content.from, content.to],
      });
      transform.push({ translateX });
    }

    return transform;
  }, [modalConfig, isRTL]);

  const renderBackdrop = () => {
    const backdropStyle = [
      styles.backdrop,
      { backgroundColor: overlayColor || 'rgba(0, 0, 0, 0.6)' },
    ];

    if (shouldUseBlur) {
      return (
        <BlurView
          intensity={20}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleBackdropPress}
            accessibilityLabel="Close modal"
            accessibilityRole="button"
          />
        </BlurView>
      );
    }

    return (
      <Animated.View style={[backdropStyle, { opacity: backdropAnim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
        />
      </Animated.View>
    );
  };

  const renderHeader = () => {
    if (!showHeader && !title) return null;

    return (
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            {title && (
              <Text style={[styles.title, { color: colors.foreground }]}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {subtitle}
              </Text>
            )}
          </View>
          
          {showCloseButton && closeButtonPosition === 'right' && (
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityLabel="Close modal"
              accessibilityRole="button"
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    const contentBackground = backgroundColor || colors.card;
    const contentBorderRadius = borderRadius || 
      (type === modalService.types.BOTTOM ? { borderTopLeftRadius: 16, borderTopRightRadius: 16 } : 12);

    const contentStyle = [
      styles.content,
      sizeDimensions,
      {
        backgroundColor: contentBackground,
        ...contentBorderRadius,
        padding: padding || 20,
      },
      customStyle,
      {
        opacity: modalConfig.content.scale ? 1 : contentAnim,
        transform: getContentTransform(),
      },
    ];

    return (
      <Animated.View style={contentStyle}>
        {showCloseButton && closeButtonPosition === 'left' && (
          <Pressable
            style={[styles.closeButton, styles.closeButtonLeft]}
            onPress={handleClose}
            accessibilityLabel="Close modal"
          >
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        )}
        
        {renderHeader()}
        
        <View 
          style={styles.childrenContainer}
          onLayout={(event) => {
            setContentHeight(event.nativeEvent.layout.height);
          }}
        >
          {children}
        </View>
      </Animated.View>
    );
  };

  if (!isVisible) return null;

  return (
    <View 
      style={StyleSheet.absoluteFill}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="dialog"
    >
      <StatusBar 
        barStyle={resolvedStatusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      
      {renderBackdrop()}
      
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.contentWrapper,
            {
              marginBottom: keyboardHeight,
            },
          ]}
        >
          {renderContent()}
        </Animated.View>
      </View>
    </View>
  );
}

// Pre-configured modal variants
export function BottomModal(props) {
  return (
    <Modal
      type={modalService.types.BOTTOM}
      animation="slide"
      {...props}
    />
  );
}

export function CenterModal(props) {
  return (
    <Modal
      type={modalService.types.CENTER}
      animation="fade"
      {...props}
    />
  );
}

export function FullScreenModal(props) {
  return (
    <Modal
      type={modalService.types.FULLSCREEN}
      size={modalService.sizes.FULL}
      showHeader={false}
      {...props}
    />
  );
}

export function SideModal(props) {
  return (
    <Modal
      type={modalService.types.SIDE}
      animation="slide"
      {...props}
    />
  );
}

export function AlertModal({ 
  title, 
  message, 
  buttons = [],
  variant = 'default',
  ...props 
}) {
  const { colors } = useTheme();

  const getIconConfig = () => {
    const configs = {
      success: { icon: 'checkmark-circle', color: colors.success },
      error: { icon: 'close-circle', color: colors.error },
      warning: { icon: 'warning', color: colors.warning },
      info: { icon: 'information-circle', color: colors.primary },
    };
    return configs[variant] || configs.info;
  };

  const { icon, color } = getIconConfig();

  return (
    <CenterModal
      title={title}
      size={modalService.sizes.SMALL}
      showCloseButton={false}
      {...props}
    >
      <View style={styles.alertContainer}>
        <Ionicons name={icon} size={48} color={color} style={styles.alertIcon} />
        {message && (
          <Text style={[styles.alertMessage, { color: colors.foreground }]}>
            {message}
          </Text>
        )}
        <View style={styles.alertButtons}>
          {buttons.map((button, index) => (
            <Pressable
              key={index}
              style={[
                styles.alertButton,
                button.primary && { backgroundColor: colors.primary },
              ]}
              onPress={button.onPress}
            >
              <Text style={[
                styles.alertButtonText,
                button.primary && styles.alertButtonTextPrimary,
              ]}>
                {button.text}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </CenterModal>
  );
}

// Hook for modal management
export const useModal = (initialVisible = false) => {
  const [isVisible, setIsVisible] = useState(initialVisible);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  return {
    isVisible,
    show,
    hide,
    toggle,
    setIsVisible,
    modalProps: {
      visible: isVisible,
      onClose: hide,
    },
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
  },
  headerText: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  childrenContainer: {
    flex: 1,
  },
  alertContainer: {
    alignItems: 'center',
    padding: 8,
  },
  alertIcon: {
    marginBottom: 16,
  },
  alertMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: YachiColors.gray[300],
    alignItems: 'center',
  },
  alertButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: YachiColors.gray[700],
  },
  alertButtonTextPrimary: {
    color: '#FFFFFF',
  },
});

export { modalService };