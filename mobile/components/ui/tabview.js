// components/ui/tabview.js
// ============================================================
// YACHI ENTERPRISE TABVIEW COMPONENT
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
  ScrollView,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

class YachiTabViewService {
  constructor() {
    this.tabVariants = this.getTabVariants();
    this.tabPositions = this.getTabPositions();
    this.tabSizes = this.getTabSizes();
    this.animationTypes = this.getAnimationTypes();
    this.badgeTypes = this.getBadgeTypes();
  }

  getTabVariants() {
    return {
      PRIMARY: 'primary',
      SECONDARY: 'secondary',
      SEGMENTED: 'segmented',
      PILL: 'pill',
      UNDERLINE: 'underline',
      FLOATING: 'floating',
      ICON: 'icon',
      COMPACT: 'compact',
    };
  }

  getTabPositions() {
    return {
      TOP: 'top',
      BOTTOM: 'bottom',
      LEFT: 'left',
      RIGHT: 'right',
    };
  }

  getTabSizes() {
    return {
      SMALL: 'small',
      MEDIUM: 'medium',
      LARGE: 'large',
      AUTO: 'auto',
    };
  }

  getAnimationTypes() {
    return {
      SLIDE: 'slide',
      FADE: 'fade',
      SCALE: 'scale',
      NONE: 'none',
      CUSTOM: 'custom',
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
        containerBg: colors.background,
        tabBg: 'transparent',
        activeTabBg: colors.primary,
        textColor: colors.mutedForeground,
        activeTextColor: '#FFFFFF',
        borderColor: colors.border,
        activeBorderColor: colors.primary,
        height: 48,
        paddingHorizontal: 16,
      },
      [this.tabVariants.SECONDARY]: {
        containerBg: colors.card,
        tabBg: 'transparent',
        activeTabBg: colors.secondary,
        textColor: colors.mutedForeground,
        activeTextColor: colors.secondaryForeground,
        borderColor: colors.border,
        activeBorderColor: colors.secondary,
        height: 44,
        paddingHorizontal: 14,
      },
      [this.tabVariants.SEGMENTED]: {
        containerBg: colors.muted,
        tabBg: 'transparent',
        activeTabBg: colors.background,
        textColor: colors.mutedForeground,
        activeTextColor: colors.foreground,
        borderColor: 'transparent',
        activeBorderColor: colors.primary,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 8,
      },
      [this.tabVariants.PILL]: {
        containerBg: 'transparent',
        tabBg: colors.muted,
        activeTabBg: colors.primary,
        textColor: colors.mutedForeground,
        activeTextColor: '#FFFFFF',
        borderColor: 'transparent',
        activeBorderColor: colors.primary,
        height: 36,
        paddingHorizontal: 20,
        borderRadius: 18,
      },
      [this.tabVariants.UNDERLINE]: {
        containerBg: colors.background,
        tabBg: 'transparent',
        activeTabBg: 'transparent',
        textColor: colors.mutedForeground,
        activeTextColor: colors.primary,
        borderColor: colors.border,
        activeBorderColor: colors.primary,
        height: 48,
        paddingHorizontal: 16,
        underlineHeight: 2,
      },
      [this.tabVariants.FLOATING]: {
        containerBg: 'transparent',
        tabBg: colors.card,
        activeTabBg: colors.primary,
        textColor: colors.mutedForeground,
        activeTextColor: '#FFFFFF',
        borderColor: colors.border,
        activeBorderColor: colors.primary,
        height: 44,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadow: true,
      },
      [this.tabVariants.ICON]: {
        containerBg: colors.background,
        tabBg: 'transparent',
        activeTabBg: colors.primary,
        textColor: colors.mutedForeground,
        activeTextColor: '#FFFFFF',
        borderColor: colors.border,
        activeBorderColor: colors.primary,
        height: 56,
        paddingHorizontal: 12,
        iconOnly: true,
      },
      [this.tabVariants.COMPACT]: {
        containerBg: colors.background,
        tabBg: 'transparent',
        activeTabBg: colors.primary,
        textColor: colors.mutedForeground,
        activeTextColor: '#FFFFFF',
        borderColor: colors.border,
        activeBorderColor: colors.primary,
        height: 32,
        paddingHorizontal: 12,
      },
    };

    return configs[variant] || configs[this.tabVariants.PRIMARY];
  }

  getSizeConfig(size) {
    const configs = {
      [this.tabSizes.SMALL]: {
        fontSize: 12,
        iconSize: 16,
        badgeSize: 16,
      },
      [this.tabSizes.MEDIUM]: {
        fontSize: 14,
        iconSize: 18,
        badgeSize: 18,
      },
      [this.tabSizes.LARGE]: {
        fontSize: 16,
        iconSize: 20,
        badgeSize: 20,
      },
      [this.tabSizes.AUTO]: {
        fontSize: 14,
        iconSize: 18,
        badgeSize: 18,
      },
    };

    return configs[size] || configs[this.tabSizes.MEDIUM];
  }

  getAnimationConfig(animationType, tabCount, direction = 'horizontal') {
    const baseConfigs = {
      [this.animationTypes.SLIDE]: {
        duration: 300,
        useNativeDriver: true,
        interpolate: (index, currentIndex) => ({
          translateX: direction === 'horizontal' 
            ? (index - currentIndex) * SCREEN_WIDTH 
            : 0,
          translateY: direction === 'vertical' 
            ? (index - currentIndex) * SCREEN_HEIGHT 
            : 0,
        }),
      },
      [this.animationTypes.FADE]: {
        duration: 250,
        useNativeDriver: true,
        interpolate: (index, currentIndex) => ({
          opacity: index === currentIndex ? 1 : 0,
        }),
      },
      [this.animationTypes.SCALE]: {
        duration: 300,
        useNativeDriver: true,
        interpolate: (index, currentIndex) => ({
          scale: index === currentIndex ? 1 : 0.9,
          opacity: index === currentIndex ? 1 : 0,
        }),
      },
      [this.animationTypes.NONE]: {
        duration: 0,
        useNativeDriver: false,
        interpolate: () => ({}),
      },
    };

    return baseConfigs[animationType] || baseConfigs[this.animationTypes.SLIDE];
  }

  shouldShowBadge(badge) {
    if (!badge) return false;
    
    if (badge.type === this.badgeTypes.NUMBER) {
      return badge.value > 0;
    }
    
    if (badge.type === this.badgeTypes.DOT) {
      return badge.visible !== false;
    }
    
    if (badge.type === this.badgeTypes.TEXT) {
      return !!badge.value;
    }
    
    if (badge.type === this.badgeTypes.ICON) {
      return !!badge.icon;
    }
    
    return false;
  }

  formatBadgeValue(badge) {
    if (!badge) return '';
    
    switch (badge.type) {
      case this.badgeTypes.NUMBER:
        return badge.value > 99 ? '99+' : badge.value.toString();
      case this.badgeTypes.TEXT:
        return badge.value;
      case this.badgeTypes.ICON:
        return badge.icon;
      default:
        return '';
    }
  }

  getAccessibilityLabel(tab, isActive) {
    const baseLabel = tab.accessibilityLabel || tab.title;
    const badgeLabel = tab.badge ? `, ${this.formatBadgeValue(tab.badge)} notifications` : '';
    const stateLabel = isActive ? ', selected' : '';
    
    return `${baseLabel}${badgeLabel}${stateLabel}`;
  }
}

// Singleton instance
export const tabViewService = new YachiTabViewService();

/**
 * Enterprise TabView with Advanced Features
 * Supports multiple variants, animations, badges, and responsive layouts
 */
export default function TabView({
  // Core Props
  tabs = [],
  initialTab = 0,
  onTabChange = () => {},
  onTabPress = () => {},
  
  // Configuration
  variant = tabViewService.tabVariants.PRIMARY,
  position = tabViewService.tabPositions.TOP,
  size = tabViewService.tabSizes.MEDIUM,
  animationType = tabViewService.animationTypes.SLIDE,
  swipeEnabled = true,
  lazy = true,
  lazyPreload = 1,
  
  // Display Options
  showIcons = false,
  showBadges = true,
  scrollable = false,
  equalWidth = false,
  centerTabs = false,
  
  // Styling
  containerStyle,
  tabStyle,
  activeTabStyle,
  textStyle,
  activeTextStyle,
  indicatorStyle,
  
  // Technical
  testID = 'yachi-tabview',
  accessibilityLabel = 'Tab navigation',
  renderTabBar = true,
  renderScene,
  
  // Advanced
  hapticFeedback = true,
  analyticsEvent = 'tab_change',
  preloadAdjacent = true,
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  
  // Refs
  const scrollViewRef = useRef(null);
  const flatListRef = useRef(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const tabAnimations = useRef({}).current;
  const loadedTabs = useRef(new Set([initialTab])).current;
  
  // State
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tabLayouts, setTabLayouts] = useState({});
  const [containerLayout, setContainerLayout] = useState(null);

  // Memoized values
  const variantConfig = useMemo(() => 
    tabViewService.getVariantConfig(variant, colors),
    [variant, colors]
  );

  const sizeConfig = useMemo(() => 
    tabViewService.getSizeConfig(size),
    [size]
  );

  const animationConfig = useMemo(() => 
    tabViewService.getAnimationConfig(animationType, tabs.length, 'horizontal'),
    [animationType, tabs.length]
  );

  const isHorizontal = useMemo(() => 
    position === tabViewService.tabPositions.TOP || 
    position === tabViewService.tabPositions.BOTTOM,
    [position]
  );

  const shouldScroll = useMemo(() => 
    scrollable && tabs.length > (isHorizontal ? 4 : 3),
    [scrollable, tabs.length, isHorizontal]
  );

  const tabDirection = useMemo(() => 
    isHorizontal ? 'row' : 'column',
    [isHorizontal]
  );

  const containerFlexDirection = useMemo(() => {
    if (position === tabViewService.tabPositions.LEFT) return 'row';
    if (position === tabViewService.tabPositions.RIGHT) return 'row-reverse';
    return 'column';
  }, [position]);

  // Effects
  useEffect(() => {
    // Preload adjacent tabs if enabled
    if (preloadAdjacent && lazy) {
      const adjacentTabs = [
        activeTab - 1,
        activeTab,
        activeTab + 1,
      ].filter(index => index >= 0 && index < tabs.length);
      
      adjacentTabs.forEach(index => {
        loadedTabs.add(index);
      });
    }
  }, [activeTab, tabs.length, lazy, preloadAdjacent]);

  useEffect(() => {
    // Animate indicator when tab changes
    animateIndicator();
    
    // Track analytics
    analyticsService.trackEvent(analyticsEvent, {
      tab_index: activeTab,
      tab_title: tabs[activeTab]?.title,
      tab_count: tabs.length,
      variant: variant,
    });
  }, [activeTab]);

  // Animation methods
  const animateIndicator = useCallback(() => {
    if (!tabLayouts[activeTab] || !containerLayout) return;

    const tabLayout = tabLayouts[activeTab];
    const containerWidth = containerLayout.width;
    
    let toValue;
    
    if (isHorizontal) {
      if (variant === tabViewService.tabVariants.UNDERLINE) {
        toValue = tabLayout.x;
      } else if (equalWidth) {
        toValue = (activeTab * containerWidth) / tabs.length;
      } else {
        toValue = tabLayout.x;
      }
    } else {
      toValue = tabLayout.y;
    }

    Animated.spring(indicatorAnim, {
      toValue,
      tension: 150,
      friction: 20,
      useNativeDriver: false,
    }).start();
  }, [activeTab, tabLayouts, containerLayout, isHorizontal, variant, equalWidth, tabs.length]);

  const animateTabPress = useCallback((index) => {
    if (!hapticFeedback || Platform.OS === 'web') return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (tabAnimations[index]) {
      Animated.sequence([
        Animated.timing(tabAnimations[index], {
          toValue: 0.95,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(tabAnimations[index], {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hapticFeedback, tabAnimations]);

  // Tab interaction methods
  const handleTabPress = useCallback((index, tab) => {
    if (index === activeTab) return;

    animateTabPress(index);
    
    setActiveTab(index);
    onTabChange(index, tab);
    onTabPress(index, tab);
    
    // Scroll to tab if scrollable
    if (shouldScroll && tabLayouts[index]) {
      const tabLayout = tabLayouts[index];
      const scrollView = scrollViewRef.current;
      
      if (scrollView && isHorizontal) {
        scrollView.scrollTo({
          x: tabLayout.x - (containerLayout?.width || SCREEN_WIDTH) / 2 + tabLayout.width / 2,
          animated: true,
        });
      }
    }
  }, [
    activeTab, 
    onTabChange, 
    onTabPress, 
    shouldScroll, 
    tabLayouts, 
    containerLayout, 
    isHorizontal,
    animateTabPress,
  ]);

  const handleTabLayout = useCallback((index, event) => {
    const layout = event.nativeEvent.layout;
    setTabLayouts(prev => ({
      ...prev,
      [index]: layout,
    }));
    
    // Initialize animation for tab
    if (!tabAnimations[index]) {
      tabAnimations[index] = new Animated.Value(1);
    }
  }, [tabAnimations]);

  const handleContainerLayout = useCallback((event) => {
    const layout = event.nativeEvent.layout;
    setContainerLayout(layout);
  }, []);

  // Render methods
  const renderBadge = useCallback((badge) => {
    if (!tabViewService.shouldShowBadge(badge)) return null;

    const badgeValue = tabViewService.formatBadgeValue(badge);
    const isDot = badge.type === tabViewService.badgeTypes.DOT;
    const isNumber = badge.type === tabViewService.badgeTypes.NUMBER;
    const isText = badge.type === tabViewService.badgeTypes.TEXT;
    const isIcon = badge.type === tabViewService.badgeTypes.ICON;

    const badgeStyle = [
      styles.badge,
      {
        backgroundColor: badge.color || colors.error,
      },
      isDot && styles.badgeDot,
      isNumber && styles.badgeNumber,
      isText && styles.badgeText,
      isIcon && styles.badgeIcon,
    ];

    return (
      <View style={badgeStyle}>
        {isIcon ? (
          <Ionicons 
            name={badgeValue} 
            size={sizeConfig.badgeSize - 8} 
            color="#FFFFFF" 
          />
        ) : (
          <Text style={styles.badgeTextContent}>
            {badgeValue}
          </Text>
        )}
      </View>
    );
  }, [colors, sizeConfig]);

  const renderTab = useCallback((tab, index) => {
    const isActive = index === activeTab;
    const hasBadge = showBadges && tab.badge;
    const shouldRenderIcon = showIcons && tab.icon;
    
    // Initialize animation if not exists
    if (!tabAnimations[index]) {
      tabAnimations[index] = new Animated.Value(1);
    }

    const tabContentStyle = [
      styles.tabContent,
      {
        paddingHorizontal: variantConfig.paddingHorizontal,
        height: variantConfig.height,
        flexDirection: isHorizontal ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: centerTabs ? 'center' : 'flex-start',
      },
      equalWidth && styles.equalWidth,
    ];

    const tabContainerStyle = [
      styles.tabContainer,
      {
        backgroundColor: isActive ? variantConfig.activeTabBg : variantConfig.tabBg,
        borderColor: isActive ? variantConfig.activeBorderColor : variantConfig.borderColor,
        borderRadius: variantConfig.borderRadius,
      },
      variantConfig.shadow && styles.shadowTab,
      tabStyle,
      isActive && activeTabStyle,
      {
        transform: [{ scale: tabAnimations[index] }],
      },
    ];

    const textElement = (
      <Text
        style={[
          styles.tabText,
          {
            fontSize: sizeConfig.fontSize,
            color: isActive ? variantConfig.activeTextColor : variantConfig.textColor,
          },
          textStyle,
          isActive && activeTextStyle,
        ]}
        numberOfLines={1}
      >
        {tab.title}
      </Text>
    );

    const iconElement = shouldRenderIcon && (
      <Ionicons
        name={tab.icon}
        size={sizeConfig.iconSize}
        color={isActive ? variantConfig.activeTextColor : variantConfig.textColor}
        style={styles.tabIcon}
      />
    );

    const badgeElement = hasBadge && renderBadge(tab.badge);

    const accessibilityLabel = tabViewService.getAccessibilityLabel(tab, isActive);

    return (
      <TouchableOpacity
        key={tab.key || index}
        style={tabContainerStyle}
        onPress={() => handleTabPress(index, tab)}
        onLayout={(event) => handleTabLayout(index, event)}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <Animated.View style={tabContentStyle}>
          {iconElement && !variantConfig.iconOnly && iconElement}
          {!variantConfig.iconOnly && textElement}
          {variantConfig.iconOnly && iconElement}
          {badgeElement}
        </Animated.View>
      </TouchableOpacity>
    );
  }, [
    activeTab,
    showBadges,
    showIcons,
    variantConfig,
    sizeConfig,
    isHorizontal,
    centerTabs,
    equalWidth,
    tabStyle,
    activeTabStyle,
    textStyle,
    activeTextStyle,
    handleTabPress,
    handleTabLayout,
    renderBadge,
    tabAnimations,
  ]);

  const renderTabBar = useCallback(() => {
    if (!renderTabBar) return null;

    const tabBarStyle = [
      styles.tabBar,
      {
        backgroundColor: variantConfig.containerBg,
        flexDirection: tabDirection,
        borderColor: variantConfig.borderColor,
      },
      position === tabViewService.tabPositions.TOP && styles.tabBarTop,
      position === tabViewService.tabPositions.BOTTOM && styles.tabBarBottom,
      position === tabViewService.tabPositions.LEFT && styles.tabBarLeft,
      position === tabViewService.tabPositions.RIGHT && styles.tabBarRight,
    ];

    const contentContainerStyle = [
      styles.tabBarContent,
      {
        flexDirection: tabDirection,
      },
      shouldScroll && styles.scrollableContent,
    ];

    const TabBarContent = shouldScroll ? ScrollView : View;

    return (
      <View style={tabBarStyle} onLayout={handleContainerLayout}>
        <TabBarContent
          ref={scrollViewRef}
          horizontal={isHorizontal}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentContainerStyle}
        >
          {tabs.map((tab, index) => renderTab(tab, index))}
        </TabBarContent>
        
        {/* Indicator */}
        {variant === tabViewService.tabVariants.UNDERLINE && (
          <Animated.View
            style={[
              styles.indicator,
              {
                backgroundColor: variantConfig.activeBorderColor,
                height: variantConfig.underlineHeight,
                width: equalWidth 
                  ? (containerLayout?.width || SCREEN_WIDTH) / tabs.length 
                  : (tabLayouts[activeTab]?.width || 0),
                transform: [
                  {
                    translateX: indicatorAnim,
                  },
                ],
              },
              indicatorStyle,
            ]}
          />
        )}
      </View>
    );
  }, [
    renderTabBar,
    variantConfig,
    tabDirection,
    position,
    shouldScroll,
    isHorizontal,
    tabs,
    renderTab,
    handleContainerLayout,
    variant,
    equalWidth,
    containerLayout,
    tabLayouts,
    activeTab,
    indicatorAnim,
    indicatorStyle,
  ]);

  const renderSceneContent = useCallback((tab, index) => {
    const isActive = index === activeTab;
    const shouldRender = lazy ? loadedTabs.has(index) : true;
    const isVisible = isActive || (lazyPreload && Math.abs(index - activeTab) <= lazyPreload);

    if (!shouldRender || !isVisible) {
      return <View key={tab.key || index} style={styles.hiddenScene} />;
    }

    const sceneStyle = [
      styles.scene,
      animationConfig.interpolate(index, activeTab),
    ];

    if (renderScene) {
      return (
        <Animated.View key={tab.key || index} style={sceneStyle}>
          {renderScene({ route: tab, index, isActive })}
        </Animated.View>
      );
    }

    return (
      <Animated.View key={tab.key || index} style={sceneStyle}>
        {tab.component ? React.createElement(tab.component, { isActive }) : null}
      </Animated.View>
    );
  }, [activeTab, lazy, loadedTabs, lazyPreload, animationConfig, renderScene]);

  const scenesContainerStyle = [
    styles.scenesContainer,
    {
      flex: 1,
      flexDirection: isHorizontal ? 'row' : 'column',
    },
  ];

  return (
    <View 
      style={[styles.container, { flexDirection: containerFlexDirection }, containerStyle]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
    >
      {renderTabBar()}
      
      <View style={scenesContainerStyle}>
        {tabs.map((tab, index) => renderSceneContent(tab, index))}
      </View>
    </View>
  );
}

// Pre-configured tabview variants
export function SegmentedTabView(props) {
  return <TabView variant={tabViewService.tabVariants.SEGMENTED} {...props} />;
}

export function PillTabView(props) {
  return <TabView variant={tabViewService.tabVariants.PILL} {...props} />;
}

export function UnderlineTabView(props) {
  return <TabView variant={tabViewService.tabVariants.UNDERLINE} {...props} />;
}

export function FloatingTabView(props) {
  return <TabView variant={tabViewService.tabVariants.FLOATING} {...props} />;
}

export function IconTabView(props) {
  return (
    <TabView 
      variant={tabViewService.tabVariants.ICON} 
      showIcons={true}
      {...props} 
    />
  );
}

export function BottomTabView(props) {
  return (
    <TabView 
      position={tabViewService.tabPositions.BOTTOM}
      variant={tabViewService.tabVariants.PRIMARY}
      {...props} 
    />
  );
}

// Hook for tabview state management
export const useTabView = (initialTab = 0) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tabs, setTabs] = useState([]);

  const addTab = useCallback((tab) => {
    setTabs(prev => [...prev, tab]);
  }, []);

  const removeTab = useCallback((index) => {
    setTabs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateTab = useCallback((index, updates) => {
    setTabs(prev => prev.map((tab, i) => 
      i === index ? { ...tab, ...updates } : tab
    ));
  }, []);

  const goToTab = useCallback((index) => {
    setActiveTab(index);
  }, []);

  const goToNextTab = useCallback(() => {
    setActiveTab(prev => Math.min(prev + 1, tabs.length - 1));
  }, [tabs.length]);

  const goToPreviousTab = useCallback(() => {
    setActiveTab(prev => Math.max(prev - 1, 0));
  }, []);

  return {
    activeTab,
    tabs,
    setActiveTab,
    setTabs,
    addTab,
    removeTab,
    updateTab,
    goToTab,
    goToNextTab,
    goToPreviousTab,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    borderBottomWidth: 1,
    zIndex: 10,
  },
  tabBarTop: {
    borderBottomWidth: 1,
  },
  tabBarBottom: {
    borderTopWidth: 1,
    borderBottomWidth: 0,
  },
  tabBarLeft: {
    borderRightWidth: 1,
    width: 120,
  },
  tabBarRight: {
    borderLeftWidth: 1,
    width: 120,
  },
  tabBarContent: {
    alignItems: 'center',
  },
  scrollableContent: {
    paddingHorizontal: 8,
  },
  tabContainer: {
    borderWidth: 1,
    margin: 4,
    overflow: 'hidden',
  },
  shadowTab: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabContent: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  equalWidth: {
    flex: 1,
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  tabIcon: {
    marginRight: 4,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 16,
    height: 16,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    minWidth: 8,
  },
  badgeNumber: {
    paddingHorizontal: 4,
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
  scenesContainer: {
    flex: 1,
    position: 'relative',
  },
  scene: {
    ...StyleSheet.absoluteFillObject,
  },
  hiddenScene: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});

export { tabViewService };