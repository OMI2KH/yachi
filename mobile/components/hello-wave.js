// components/hello-wave.js
// ============================================================
// YACHI ENTERPRISE HELLO WAVE COMPONENT
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// Context
import { useTheme } from '../contexts/theme-context';
import { useLanguage } from './ui/language-selector';
import { useAuth } from '../contexts/auth-context';
import { useNotification } from '../contexts/notification-context';

// Services
import { analyticsService } from '../services/analytics-service';

// Constants
import { YachiColors } from '../constants/colors';
import { AppConfig } from '../../config/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

class YachiHelloWaveService {
  constructor() {
    this.greetingTypes = this.getGreetingTypes();
    this.specialOccasions = this.getSpecialOccasions();
    this.componentSizes = this.getComponentSizes();
    this.componentVariants = this.getComponentVariants();
    this.animationTypes = this.getAnimationTypes();
  }

  getGreetingTypes() {
    return {
      MORNING: 'morning',
      AFTERNOON: 'afternoon',
      EVENING: 'evening',
      NIGHT: 'night',
    };
  }

  getSpecialOccasions() {
    return {
      BIRTHDAY: 'birthday',
      ANNIVERSARY: 'anniversary',
      NEW_YEAR: 'new_year',
      HOLIDAY: 'holiday',
      ACHIEVEMENT: 'achievement',
      MILESTONE: 'milestone',
    };
  }

  getComponentSizes() {
    return {
      SMALL: 'small',
      MEDIUM: 'medium',
      LARGE: 'large',
      XLARGE: 'xlarge',
    };
  }

  getComponentVariants() {
    return {
      DEFAULT: 'default',
      COMPACT: 'compact',
      EXPANDED: 'expanded',
      MINIMAL: 'minimal',
      FLOATING: 'floating',
      GRADIENT: 'gradient',
    };
  }

  getAnimationTypes() {
    return {
      WAVE: 'wave',
      BOUNCE: 'bounce',
      PULSE: 'pulse',
      FADE: 'fade',
      NONE: 'none',
    };
  }

  getGreetingConfig(timeOfDay) {
    const configs = {
      [this.greetingTypes.MORNING]: {
        greetings: ['Good morning', 'Rise and shine', 'Hello there', 'Top of the morning'],
        icon: 'sunny',
        emoji: '☀️',
        gradient: ['#FFD700', '#FFED4E'],
        color: YachiColors.warning[500],
      },
      [this.greetingTypes.AFTERNOON]: {
        greetings: ['Good afternoon', 'Hello there', 'Hey there', 'Hi there'],
        icon: 'partly-sunny',
        emoji: '🌤️',
        gradient: ['#4FC3F7', '#29B6F6'],
        color: YachiColors.primary[500],
      },
      [this.greetingTypes.EVENING]: {
        greetings: ['Good evening', 'Hello there', 'Hey there', 'Hi there'],
        icon: 'moon',
        emoji: '🌙',
        gradient: ['#7B1FA2', '#4A148C'],
        color: YachiColors.secondary[500],
      },
      [this.greetingTypes.NIGHT]: {
        greetings: ['Good night', 'Hello there', 'Hey there', 'Hi there'],
        icon: 'bed',
        emoji: '🌌',
        gradient: ['#0D47A1', '#1976D2'],
        color: YachiColors.primary[700],
      },
    };

    return configs[timeOfDay] || configs[this.greetingTypes.MORNING];
  }

  getSpecialOccasionConfig(occasion) {
    const configs = {
      [this.specialOccasions.BIRTHDAY]: {
        message: 'Happy Birthday! 🎂',
        icon: 'cake',
        gradient: ['#E91E63', '#F06292'],
        color: YachiColors.error[500],
        animation: 'confetti',
      },
      [this.specialOccasions.ANNIVERSARY]: {
        message: 'Happy Anniversary! 🎉',
        icon: 'heart',
        gradient: ['#FF5722', '#FF8A65'],
        color: YachiColors.error[400],
        animation: 'hearts',
      },
      [this.specialOccasions.NEW_YEAR]: {
        message: 'Happy New Year! 🎊',
        icon: 'sparkles',
        gradient: ['#4CAF50', '#66BB6A'],
        color: YachiColors.success[500],
        animation: 'confetti',
      },
      [this.specialOccasions.HOLIDAY]: {
        message: 'Season\'s Greetings! 🎄',
        icon: 'snow',
        gradient: ['#D32F2F', '#F44336'],
        color: YachiColors.error[500],
        animation: 'snow',
      },
      [this.specialOccasions.ACHIEVEMENT]: {
        message: 'Congratulations! 🏆',
        icon: 'trophy',
        gradient: ['#FFD700', '#FFED4E'],
        color: YachiColors.warning[500],
        animation: 'sparkles',
      },
      [this.specialOccasions.MILESTONE]: {
        message: 'Amazing Milestone! 🌟',
        icon: 'star',
        gradient: ['#9C27B0', '#E1BEE7'],
        color: YachiColors.secondary[500],
        animation: 'stars',
      },
    };

    return configs[occasion] || null;
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return this.greetingTypes.MORNING;
    if (hour >= 12 && hour < 17) return this.greetingTypes.AFTERNOON;
    if (hour >= 17 && hour < 22) return this.greetingTypes.EVENING;
    return this.greetingTypes.NIGHT;
  }

  getSizeConfig(size) {
    const configs = {
      [this.componentSizes.SMALL]: {
        containerSize: 40,
        iconSize: 16,
        fontSize: 14,
        emojiSize: 20,
        padding: 8,
      },
      [this.componentSizes.MEDIUM]: {
        containerSize: 60,
        iconSize: 24,
        fontSize: 18,
        emojiSize: 28,
        padding: 12,
      },
      [this.componentSizes.LARGE]: {
        containerSize: 80,
        iconSize: 32,
        fontSize: 22,
        emojiSize: 36,
        padding: 16,
      },
      [this.componentSizes.XLARGE]: {
        containerSize: 100,
        iconSize: 40,
        fontSize: 26,
        emojiSize: 44,
        padding: 20,
      },
    };

    return configs[size] || configs[this.componentSizes.MEDIUM];
  }

  getVariantConfig(variant, colors) {
    const configs = {
      [this.componentVariants.DEFAULT]: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        shadow: true,
        showIcon: true,
        showEmoji: true,
        showTime: true,
        showStreak: true,
      },
      [this.componentVariants.COMPACT]: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        shadow: true,
        showIcon: true,
        showEmoji: false,
        showTime: false,
        showStreak: false,
      },
      [this.componentVariants.EXPANDED]: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        shadow: true,
        showIcon: true,
        showEmoji: true,
        showTime: true,
        showStreak: true,
      },
      [this.componentVariants.MINIMAL]: {
        backgroundColor: 'transparent',
        borderRadius: 0,
        padding: 8,
        shadow: false,
        showIcon: false,
        showEmoji: true,
        showTime: false,
        showStreak: false,
      },
      [this.componentVariants.FLOATING]: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        shadow: true,
        showIcon: true,
        showEmoji: true,
        showTime: true,
        showStreak: true,
        floating: true,
      },
      [this.componentVariants.GRADIENT]: {
        backgroundColor: 'transparent',
        borderRadius: 20,
        padding: 16,
        shadow: true,
        showIcon: true,
        showEmoji: true,
        showTime: true,
        showStreak: true,
        gradient: true,
      },
    };

    return configs[variant] || configs[this.componentVariants.DEFAULT];
  }

  getDefaultMessages() {
    return {
      en: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
        night: 'Good night',
        welcome: 'Welcome back',
        newUser: 'Welcome to Yachi',
        streak: 'day streak',
        waveBack: 'Double tap to wave back',
      },
      am: {
        morning: 'እንደምስጋና',
        afternoon: 'እንደምስጋና',
        evening: 'እንደምስጋና',
        night: 'ምሳሌ ሌሊት',
        welcome: 'እንኳን ደህና መጡ',
        newUser: 'ወደ ያቺ እንኳን ደህና መጡ',
        streak: 'ቀን ተከታታይ',
        waveBack: 'ለመንካት ሁለት ጊዜ ይንኩ',
      },
      om: {
        morning: 'Akkam bulte',
        afternoon: 'Akkam oolte',
        evening: 'Akkam oolte',
        night: 'Halkan gaari',
        welcome: 'Baga nagaan dhuftan',
        newUser: 'Yachi seenan baga nagaan dhuftan',
        streak: 'guyyaa hordoftuu',
        waveBack: 'Akka naan utti lama tuqaa',
      },
    };
  }

  getGreetingMessage(greetingConfig, userData, personalization, messages) {
    const greetings = greetingConfig.greetings;
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    if (!personalization) {
      return randomGreeting;
    }

    if (userData.isNewUser) {
      return `${messages.newUser}, ${userData.firstName}!`;
    }

    if (userData.lastActive && this.isReturningUser(userData.lastActive)) {
      return `${messages.welcome}, ${userData.firstName}!`;
    }

    return `${randomGreeting}, ${userData.firstName}`;
  }

  isReturningUser(lastActive) {
    const lastActiveDate = new Date(lastActive);
    const today = new Date();
    const diffTime = Math.abs(today - lastActiveDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 1;
  }

  checkSpecialOccasion(userData) {
    const today = new Date();
    
    // Check birthday
    if (userData.birthday) {
      const birthday = new Date(userData.birthday);
      if (birthday.getMonth() === today.getMonth() && birthday.getDate() === today.getDate()) {
        return this.specialOccasions.BIRTHDAY;
      }
    }

    // Check achievements
    if (userData.recentAchievements && userData.recentAchievements.length > 0) {
      return this.specialOccasions.ACHIEVEMENT;
    }

    // Check milestones
    if (userData.streak && userData.streak % 100 === 0) {
      return this.specialOccasions.MILESTONE;
    }

    // Check holidays (simplified)
    if (today.getMonth() === 0 && today.getDate() === 1) {
      return this.specialOccasions.NEW_YEAR;
    }

    return null;
  }

  triggerHaptic(type = 'light') {
    if (Platform.OS === 'web') return;

    try {
      const hapticMap = {
        light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
        success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        selection: () => Haptics.selectionAsync(),
      };

      hapticMap[type]?.();
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }
}

// Singleton instance
export const helloWaveService = new YachiHelloWaveService();

/**
 * Enterprise Hello Wave Component with Advanced Personalization
 * Supports dynamic greetings, special occasions, and interactive animations
 */
export default function HelloWave({
  // Core Props
  user,
  size = helloWaveService.componentSizes.MEDIUM,
  variant = helloWaveService.componentVariants.DEFAULT,
  animationType = helloWaveService.animationTypes.WAVE,
  
  // Behavior
  animated = true,
  interactive = true,
  personalization = true,
  showWave = true,
  showEmoji = true,
  showTime = true,
  showStreak = true,
  
  // Events
  onPress,
  onWave,
  onSpecialOccasion,
  
  // Styling
  style,
  textStyle,
  iconStyle,
  
  // Technical
  testID = 'yachi-hello-wave',
  accessibilityLabel,
  analyticsEvent = 'hello_wave_interaction',
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  const { user: authUser } = useAuth();
  const { showNotification } = useNotification();
  
  // Refs
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // State
  const [isWaving, setIsWaving] = useState(false);
  const [waveCount, setWaveCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Memoized values
  const userData = useMemo(() => {
    const currentUser = user || authUser;
    return {
      name: currentUser?.name || 'Friend',
      firstName: currentUser?.name?.split(' ')[0] || 'Friend',
      streak: currentUser?.streak || 0,
      lastActive: currentUser?.lastActive,
      birthday: currentUser?.birthday,
      recentAchievements: currentUser?.recentAchievements || [],
      isNewUser: currentUser?.isNewUser || false,
    };
  }, [user, authUser]);

  const messages = useMemo(() => 
    helloWaveService.getDefaultMessages()[currentLanguage.code] || 
    helloWaveService.getDefaultMessages().en,
    [currentLanguage]
  );

  const timeOfDay = useMemo(() => 
    helloWaveService.getTimeOfDay(),
    []
  );

  const greetingConfig = useMemo(() => 
    helloWaveService.getGreetingConfig(timeOfDay),
    [timeOfDay]
  );

  const specialOccasion = useMemo(() => 
    helloWaveService.checkSpecialOccasion(userData),
    [userData]
  );

  const specialOccasionConfig = useMemo(() => 
    helloWaveService.getSpecialOccasionConfig(specialOccasion),
    [specialOccasion]
  );

  const greetingMessage = useMemo(() => {
    if (specialOccasionConfig) {
      return specialOccasionConfig.message;
    }
    
    return helloWaveService.getGreetingMessage(
      greetingConfig, 
      userData, 
      personalization, 
      messages
    );
  }, [specialOccasionConfig, greetingConfig, userData, personalization, messages]);

  const sizeConfig = useMemo(() => 
    helloWaveService.getSizeConfig(size),
    [size]
  );

  const variantConfig = useMemo(() => 
    helloWaveService.getVariantConfig(variant, colors),
    [variant, colors]
  );

  const resolvedAccessibilityLabel = useMemo(() => 
    accessibilityLabel || `${greetingMessage}. ${showWave ? messages.waveBack : ''}`,
    [accessibilityLabel, greetingMessage, showWave, messages]
  );

  // Animation methods
  const startWaveAnimation = useCallback(() => {
    if (!animated) return;

    setIsWaving(true);
    helloWaveService.triggerHaptic('light');

    // Wave animation
    Animated.sequence([
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(waveAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsWaving(false);
    });

    // Bounce animation
    Animated.sequence([
      Animated.spring(bounceAnim, {
        toValue: 1.1,
        tension: 150,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 150,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Track wave count
    const newWaveCount = waveCount + 1;
    setWaveCount(newWaveCount);

    // Celebration every 5 waves
    if (newWaveCount % 5 === 0) {
      setShowCelebration(true);
      helloWaveService.triggerHaptic('success');
      
      showNotification({
        type: 'success',
        title: 'Wave Celebration!',
        message: `You've waved ${newWaveCount} times! 🎉`,
        duration: 3000,
      });

      setTimeout(() => setShowCelebration(false), 2000);
    }

    onWave?.(newWaveCount);
  }, [animated, waveAnim, bounceAnim, waveCount, onWave, showNotification]);

  // Continuous animations
  useEffect(() => {
    if (!animated) return;

    // Subtle pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [animated, pulseAnim]);

  // Special occasion effect
  useEffect(() => {
    if (specialOccasion) {
      onSpecialOccasion?.(specialOccasion, specialOccasionConfig);
      
      showNotification({
        type: 'info',
        title: 'Special Occasion!',
        message: specialOccasionConfig.message,
        duration: 5000,
      });
    }
  }, [specialOccasion, specialOccasionConfig, onSpecialOccasion, showNotification]);

  // Event handlers
  const handlePress = useCallback(() => {
    if (!interactive) return;

    helloWaveService.triggerHaptic('light');

    // Track analytics
    analyticsService.trackEvent(analyticsEvent, {
      user_name: userData.firstName,
      time_of_day: timeOfDay,
      special_occasion: specialOccasion,
      wave_count: waveCount + 1,
      variant: variant,
    });

    if (onPress) {
      onPress();
    } else if (showWave) {
      startWaveAnimation();
    }
  }, [
    interactive,
    userData,
    timeOfDay,
    specialOccasion,
    waveCount,
    variant,
    onPress,
    showWave,
    startWaveAnimation,
    analyticsEvent,
  ]);

  const handlePressIn = useCallback(() => {
    if (!interactive) return;

    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 150,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [interactive, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (!interactive) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [interactive, scaleAnim]);

  // Render methods
  const renderWaveHand = useCallback(() => {
    if (!showWave || !variantConfig.showIcon) return null;

    const rotate = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '20deg'],
    });

    const translateY = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -8],
    });

    const iconColor = specialOccasionConfig?.color || greetingConfig.color;

    return (
      <Animated.View
        style={[
          styles.waveHand,
          {
            transform: [{ rotate }, { translateY }],
          },
        ]}
      >
        <Ionicons
          name="hand-left"
          size={sizeConfig.iconSize}
          color={iconColor}
          style={iconStyle}
        />
      </Animated.View>
    );
  }, [showWave, variantConfig, waveAnim, specialOccasionConfig, greetingConfig, sizeConfig, iconStyle]);

  const renderIcon = useCallback(() => {
    if (!variantConfig.showIcon) return null;

    const iconName = specialOccasionConfig?.icon || greetingConfig.icon;
    const iconColor = specialOccasionConfig?.color || greetingConfig.color;

    return (
      <Ionicons
        name={iconName}
        size={sizeConfig.iconSize}
        color={iconColor}
        style={[styles.icon, iconStyle]}
      />
    );
  }, [variantConfig, specialOccasionConfig, greetingConfig, sizeConfig, iconStyle]);

  const renderEmoji = useCallback(() => {
    if (!variantConfig.showEmoji) return null;

    const emoji = specialOccasionConfig ? '🎉' : greetingConfig.emoji;

    return (
      <Text style={[styles.emoji, { fontSize: sizeConfig.emojiSize }]}>
        {emoji}
      </Text>
    );
  }, [variantConfig, specialOccasionConfig, greetingConfig, sizeConfig]);

  const renderGreeting = useCallback(() => {
    const textColor = variantConfig.gradient ? '#FFFFFF' : colors.foreground;

    return (
      <Text
        style={[
          styles.greeting,
          {
            fontSize: sizeConfig.fontSize,
            color: textColor,
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {greetingMessage}
      </Text>
    );
  }, [greetingMessage, variantConfig, colors, sizeConfig, textStyle]);

  const renderTimeInfo = useCallback(() => {
    if (!variantConfig.showTime) return null;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const textColor = variantConfig.gradient ? '#FFFFFF' : colors.mutedForeground;

    return (
      <Text style={[styles.time, { color: textColor, fontSize: sizeConfig.fontSize - 2 }]}>
        {timeString}
      </Text>
    );
  }, [variantConfig, colors, sizeConfig]);

  const renderStreak = useCallback(() => {
    if (!variantConfig.showStreak || userData.streak === 0) return null;

    const textColor = variantConfig.gradient ? '#FFFFFF' : colors.mutedForeground;

    return (
      <View style={styles.streakContainer}>
        <Ionicons name="flame" size={14} color={YachiColors.warning[500]} />
        <Text style={[styles.streak, { color: textColor }]}>
          {userData.streak} {messages.streak}
        </Text>
      </View>
    );
  }, [variantConfig, userData, colors, messages]);

  const renderCelebration = useCallback(() => {
    if (!showCelebration) return null;

    return (
      <View style={styles.celebration}>
        <Text style={styles.celebrationText}>🎊 {waveCount} Waves! 🎊</Text>
      </View>
    );
  }, [showCelebration, waveCount]);

  // Container styles
  const containerBaseStyle = [
    styles.container,
    {
      backgroundColor: variantConfig.backgroundColor,
      borderRadius: variantConfig.borderRadius,
      padding: variantConfig.padding,
      minHeight: sizeConfig.containerSize,
    },
    variantConfig.shadow && styles.shadow,
    variantConfig.floating && styles.floating,
  ];

  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      { scale: bounceAnim },
      { scale: pulseAnim },
    ],
  };

  const containerStyle = [containerBaseStyle, animatedStyle, style];

  // Gradient background
  const gradientColors = specialOccasionConfig?.gradient || greetingConfig.gradient;

  const renderContent = () => {
    const content = (
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {renderIcon()}
          {renderEmoji()}
          {renderWaveHand()}
        </View>
        
        <View style={styles.centerSection}>
          {renderGreeting()}
          {renderTimeInfo()}
          {renderStreak()}
        </View>
      </View>
    );

    if (variantConfig.gradient) {
      return (
        <LinearGradient
          colors={gradientColors}
          style={containerBaseStyle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={[animatedStyle, styles.gradientContent]}>
            {content}
          </Animated.View>
        </LinearGradient>
      );
    }

    return content;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!interactive}
      activeOpacity={interactive ? 0.8 : 1}
      testID={testID}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: isWaving }}
    >
      <Animated.View style={containerStyle}>
        {renderContent()}
        {renderCelebration()}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Enhanced Hello Wave with Context Integration
export function HelloWaveWithContext(props) {
  const { user } = useAuth();
  return <HelloWave user={user} {...props} />;
}

// Animated Hello Wave with Special Effects
export function AnimatedHelloWave({ 
  celebrationThreshold = 5,
  onCelebration,
  ...props 
}) {
  const [celebration, setCelebration] = useState(null);

  const handleWave = useCallback((waveCount) => {
    if (waveCount % celebrationThreshold === 0) {
      const celebrations = ['confetti', 'sparkles', 'hearts', 'stars'];
      const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
      setCelebration(randomCelebration);
      onCelebration?.(randomCelebration, waveCount);
      
      setTimeout(() => setCelebration(null), 1500);
    }
  }, [celebrationThreshold, onCelebration]);

  return (
    <View style={styles.animatedContainer}>
      <HelloWave {...props} onWave={handleWave} />
      {celebration && (
        <View style={styles.celebrationEffect} pointerEvents="none">
          <Text style={styles.celebrationEmoji}>🎉</Text>
        </View>
      )}
    </View>
  );
}

// Hello Wave Group for Multiple Users
export function HelloWaveGroup({ 
  users = [],
  maxVisible = 3,
  ...props 
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleUsers = expanded ? users : users.slice(0, maxVisible);
  const hiddenCount = users.length - visibleUsers.length;

  if (users.length === 0) {
    return <HelloWave {...props} />;
  }

  return (
    <View style={styles.groupContainer}>
      {visibleUsers.map((user, index) => (
        <View key={user.id || index} style={styles.groupItem}>
          <HelloWave user={user} size="small" variant="compact" {...props} />
        </View>
      ))}
      
      {hiddenCount > 0 && (
        <TouchableOpacity
          style={styles.showMore}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.showMoreText}>
            {expanded ? 'Show Less' : `+${hiddenCount} more`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    overflow: 'hidden',
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
  floating: {
    margin: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradientContent: {
    flex: 1,
  },
  leftSection: {
    marginRight: 12,
    position: 'relative',
  },
  waveHand: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  icon: {
    marginRight: 8,
  },
  emoji: {
    marginRight: 8,
  },
  centerSection: {
    flex: 1,
  },
  greeting: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streak: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    fontSize: 12,
  },
  celebration: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  celebrationText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 12,
    color: YachiColors.warning[500],
  },
  animatedContainer: {
    position: 'relative',
  },
  celebrationEffect: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  celebrationEmoji: {
    fontSize: 48,
  },
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupItem: {
    marginRight: 8,
  },
  showMore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: YachiColors.primary[100],
    borderRadius: 16,
  },
  showMoreText: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    fontSize: 12,
    color: YachiColors.primary[600],
  },
});

export { helloWaveService };