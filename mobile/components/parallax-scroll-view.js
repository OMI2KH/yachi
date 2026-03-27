// components/parallax-scroll-view.js

/**
 * ENTERPRISE-GRADE PARALLAX SCROLL VIEW
 * Yachi Construction & Services Platform
 * Advanced Parallax Effects with AI Construction Integration
 * Ethiopian Market Optimized Performance
 */

import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  I18nManager,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
  findNodeHandle,
  Text,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/theme-context';
import { usePremium } from '../contexts/premium-context';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/sizes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_RTL = I18nManager.isRTL;

// Performance constants
const SCROLL_THROTTLE = 16;
const MEMOIZATION_OPTIONS = { 
  equalityFn: (prevProps, nextProps) => 
    prevProps.headerHeight === nextProps.headerHeight && 
    prevProps.parallaxFactor === nextProps.parallaxFactor &&
    prevProps.refreshing === nextProps.refreshing &&
    prevProps.loading === nextProps.loading &&
    prevProps.scrollEnabled === nextProps.scrollEnabled
};

const ParallaxScrollView = React.memo(({
  // Core Props
  children,
  backgroundColor,
  backgroundImage,
  overlayImage,
  
  // Header Configuration
  headerHeight = 280,
  minHeaderHeight = 90,
  maxHeaderHeight = 400,
  parallaxFactor = 0.7,
  stickyHeaderHeight = 60,
  fadeOutHeader = true,
  scaleBackground = true,
  
  // Header Renderers
  renderHeader,
  renderFixedHeader,
  renderStickyHeader,
  renderBackground,
  renderForeground,
  
  // Interaction Handlers
  onScroll,
  onScrollBeginDrag,
  onScrollEndDrag,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onRefresh,
  refreshing = false,
  
  // UI Configuration
  scrollEnabled = true,
  showsVerticalScrollIndicator = true,
  bounces = true,
  bouncesZoom = true,
  alwaysBounceVertical = true,
  refreshColor,
  loading = false,
  LoadingComponent,
  overlayColor = 'rgba(0,0,0,0.15)',
  blurIntensity = 90,
  blurTint = 'default',
  
  // Advanced Features
  enablePerformanceOptimizations = true,
  snapToHeader = false,
  snapThreshold = 50,
  parallaxEnabled = true,
  stickyHeaderEnabled = true,
  
  // Style Props
  style,
  contentContainerStyle,
  headerContainerStyle,
  backgroundContainerStyle,
  
  // Testing & Accessibility
  testID = 'parallax-scroll-view',
  accessibilityLabel = 'Scrollable content with parallax header',
  accessibilityRole = 'scrollview',
  
  // Scroll View Props
  ...scrollViewProps
}) => {
  const { theme, isDark } = useTheme();
  const { isPremium } = usePremium();
  
  // Refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const lastScrollY = useRef(0);
  const isScrolling = useRef(false);
  
  // State
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(refreshing);
  const [headerVisible, setHeaderVisible] = useState(true);

  // Sync refreshing state
  useEffect(() => {
    setIsRefreshing(refreshing);
  }, [refreshing]);

  // Memoized animation values for optimal performance
  const {
    headerTranslate,
    headerScale,
    headerOpacity,
    backgroundTranslate,
    backgroundScale,
    foregroundOpacity,
    stickyHeaderTranslate,
    fixedHeaderOpacity,
    fixedHeaderTranslate,
    scrollProgress,
    headerHeightProgress,
  } = useMemo(() => {
    
    // Header parallax translation
    const headerTranslate = parallaxEnabled ? scrollY.interpolate({
      inputRange: [-headerHeight, 0, headerHeight],
      outputRange: [
        -headerHeight * parallaxFactor * 0.3,
        0,
        headerHeight * parallaxFactor * 0.5,
      ],
      extrapolateRight: 'clamp',
    }) : new Animated.Value(0);

    // Header scale effect
    const headerScale = scaleBackground ? scrollY.interpolate({
      inputRange: [-headerHeight, 0, headerHeight * 2],
      outputRange: [1.15, 1, 0.98],
      extrapolate: 'clamp',
    }) : new Animated.Value(1);

    // Header fade out
    const headerOpacity = fadeOutHeader ? scrollY.interpolate({
      inputRange: [0, headerHeight - minHeaderHeight - 50, headerHeight - minHeaderHeight],
      outputRange: [1, 0.3, 0],
      extrapolate: 'clamp',
    }) : new Animated.Value(1);

    // Background parallax (slower movement)
    const backgroundTranslate = scrollY.interpolate({
      inputRange: [-headerHeight, 0, headerHeight],
      outputRange: [
        -headerHeight * parallaxFactor * 0.1,
        0,
        headerHeight * parallaxFactor * 0.3,
      ],
    });

    // Background scale
    const backgroundScale = scrollY.interpolate({
      inputRange: [-headerHeight, 0, headerHeight],
      outputRange: [1.1, 1, 1],
      extrapolate: 'clamp',
    });

    // Foreground content opacity
    const foregroundOpacity = scrollY.interpolate({
      inputRange: [0, headerHeight * 0.5, headerHeight],
      outputRange: [1, 0.5, 0],
      extrapolate: 'clamp',
    });

    // Sticky header translation
    const stickyHeaderTranslate = stickyHeaderEnabled ? scrollY.interpolate({
      inputRange: [0, headerHeight - stickyHeaderHeight, headerHeight],
      outputRange: [headerHeight, stickyHeaderHeight, 0],
      extrapolate: 'clamp',
    }) : new Animated.Value(0);

    // Fixed header opacity
    const fixedHeaderOpacity = scrollY.interpolate({
      inputRange: [0, headerHeight - minHeaderHeight, headerHeight],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp',
    });

    // Fixed header translation
    const fixedHeaderTranslate = scrollY.interpolate({
      inputRange: [0, headerHeight],
      outputRange: [0, -headerHeight + minHeaderHeight],
      extrapolate: 'clamp',
    });

    // Scroll progress (0 to 1)
    const scrollProgress = scrollY.interpolate({
      inputRange: [0, headerHeight],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    // Header height progress
    const headerHeightProgress = scrollY.interpolate({
      inputRange: [0, headerHeight - minHeaderHeight],
      outputRange: [headerHeight, minHeaderHeight],
      extrapolate: 'clamp',
    });

    return {
      headerTranslate,
      headerScale,
      headerOpacity,
      backgroundTranslate,
      backgroundScale,
      foregroundOpacity,
      stickyHeaderTranslate,
      fixedHeaderOpacity,
      fixedHeaderTranslate,
      scrollProgress,
      headerHeightProgress,
    };
  }, [
    headerHeight,
    minHeaderHeight,
    parallaxFactor,
    parallaxEnabled,
    scaleBackground,
    fadeOutHeader,
    stickyHeaderEnabled,
    stickyHeaderHeight,
  ]);

  // Optimized scroll handler
  const handleScroll = useCallback(
    Animated.event(
      [
        {
          nativeEvent: {
            contentOffset: { y: scrollY },
          },
        },
      ],
      {
        useNativeDriver: true,
        listener: (event) => {
          const { y } = event.nativeEvent.contentOffset;
          lastScrollY.current = y;
          
          // Update header visibility
          setHeaderVisible(y < headerHeight - minHeaderHeight);
          
          // Call external scroll handler
          onScroll?.(event);
        },
      }
    ),
    [onScroll, headerHeight, minHeaderHeight]
  );

  // Scroll event handlers with performance optimization
  const handleScrollBeginDrag = useCallback((event) => {
    isScrolling.current = true;
    onScrollBeginDrag?.(event);
  }, [onScrollBeginDrag]);

  const handleScrollEndDrag = useCallback((event) => {
    isScrolling.current = false;
    onScrollEndDrag?.(event);
  }, [onScrollEndDrag]);

  const handleMomentumScrollBegin = useCallback((event) => {
    onMomentumScrollBegin?.(event);
  }, [onMomentumScrollBegin]);

  const handleMomentumScrollEnd = useCallback((event) => {
    // Snap to header if enabled
    if (snapToHeader && lastScrollY.current < headerHeight) {
      const snapPoint = lastScrollY.current < snapThreshold ? 0 : headerHeight;
      scrollViewRef.current?.scrollTo({ y: snapPoint, animated: true });
    }
    onMomentumScrollEnd?.(event);
  }, [snapToHeader, snapThreshold, headerHeight, onMomentumScrollEnd]);

  // Refresh control handler
  const handleRefresh = useCallback(() => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh().finally(() => setIsRefreshing(false));
    }
  }, [onRefresh, isRefreshing]);

  // Programmatic scroll methods
  const scrollToTop = useCallback((animated = true) => {
    scrollViewRef.current?.scrollTo({ y: 0, animated });
  }, []);

  const scrollTo = useCallback((params) => {
    scrollViewRef.current?.scrollTo(params);
  }, []);

  const scrollToEnd = useCallback((animated = true) => {
    scrollViewRef.current?.scrollToEnd({ animated });
  }, []);

  // Content size tracking
  const handleContentSizeChange = useCallback((width, height) => {
    setContentHeight(height);
  }, []);

  const handleLayout = useCallback((event) => {
    const { height } = event.nativeEvent.layout;
    setContainerHeight(height);
  }, []);

  // Determine scroll availability
  const canScroll = contentHeight > containerHeight;

  // Theme-based default values
  const defaultBackgroundColor = backgroundColor || theme.colors.background.elevated;
  const refreshControlColor = refreshColor || theme.colors.primary[500];
  const defaultOverlayColor = isDark ? 'rgba(0,0,0,0.4)' : overlayColor;

  // Render default header component
  const renderDefaultHeader = useCallback(() => (
    <View style={[styles.defaultHeader, { backgroundColor: theme.colors.primary[500] }]}>
      <View style={styles.defaultHeaderGradient}>
        <View style={styles.defaultHeaderContent}>
          <View style={styles.defaultHeaderIcon} />
        </View>
      </View>
    </View>
  ), [theme]);

  // Render default background
  const renderDefaultBackground = useCallback(() => (
    <Animated.View
      style={[
        styles.background,
        backgroundContainerStyle,
        {
          backgroundColor: defaultBackgroundColor,
          transform: [
            { translateY: backgroundTranslate },
            { scale: backgroundScale },
          ],
        },
      ]}
    >
      {backgroundImage && (
        <Animated.Image
          source={backgroundImage}
          style={[
            styles.backgroundImage,
            {
              transform: [
                { translateY: backgroundTranslate },
                { scale: backgroundScale },
              ],
            },
          ]}
          resizeMode="cover"
        />
      )}
      {/* Premium overlay effect */}
      {isPremium && (
        <View style={styles.premiumOverlay} />
      )}
    </Animated.View>
  ), [defaultBackgroundColor, backgroundImage, backgroundTranslate, backgroundScale, backgroundContainerStyle, isPremium]);

  // Render blur overlay
  const renderBlurOverlay = useCallback(() => {
    if (Platform.OS === 'ios' && blurIntensity > 0) {
      return (
        <BlurView
          intensity={blurIntensity}
          tint={blurTint}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    
    return (
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: defaultOverlayColor,
            opacity: headerOpacity,
          },
        ]}
      />
    );
  }, [blurIntensity, blurTint, defaultOverlayColor, headerOpacity]);

  // Expose methods via ref
  React.useImperativeHandle(scrollViewRef, () => ({
    scrollTo,
    scrollToTop,
    scrollToEnd,
    getScrollResponder: () => scrollViewRef.current,
    getScrollableNode: () => findNodeHandle(scrollViewRef.current),
  }));

  return (
    <View 
      style={[styles.container, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Background Layer */}
      {renderBackground ? renderBackground({
        scrollY,
        headerHeight,
        backgroundTranslate,
        backgroundScale,
      }) : renderDefaultBackground()}

      {/* Main Scroll View */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { 
            paddingTop: headerHeight,
            minHeight: containerHeight + headerHeight,
          },
          contentContainerStyle,
        ]}
        scrollEventThrottle={SCROLL_THROTTLE}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEnabled={scrollEnabled && !loading}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        bounces={bounces}
        bouncesZoom={bouncesZoom}
        alwaysBounceVertical={alwaysBounceVertical}
        overScrollMode="always"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={refreshControlColor}
              colors={[refreshControlColor]}
              progressBackgroundColor={theme.colors.background.primary}
              progressViewOffset={headerHeight}
            />
          ) : undefined
        }
        accessibilityRole={accessibilityRole}
        removeClippedSubviews={enablePerformanceOptimizations}
        {...scrollViewProps}
      >
        {/* Content with loading state */}
        <View style={styles.content}>
          {loading && LoadingComponent ? (
            <LoadingComponent />
          ) : (
            <>
              {/* Foreground content (fades out) */}
              {renderForeground && (
                <Animated.View 
                  style={{ opacity: foregroundOpacity }}
                  pointerEvents="none"
                >
                  {renderForeground()}
                </Animated.View>
              )}
              
              {/* Main content */}
              {children}
            </>
          )}
        </View>
      </Animated.ScrollView>

      {/* Parallax Header */}
      <Animated.View
        style={[
          styles.header,
          {
            height: headerHeight,
            transform: [
              { translateY: headerTranslate },
              { scale: headerScale },
            ],
            opacity: headerOpacity,
          },
          headerContainerStyle,
        ]}
        pointerEvents="box-none"
      >
        {renderHeader ? renderHeader({
          scrollY,
          headerHeight,
          scrollProgress,
          headerVisible,
        }) : renderDefaultHeader()}
        
        {/* Overlay effects */}
        {renderBlurOverlay()}
      </Animated.View>

      {/* Fixed Header (e.g., Navigation) */}
      {renderFixedHeader && (
        <Animated.View
          style={[
            styles.fixedHeader,
            {
              opacity: fixedHeaderOpacity,
              transform: [{ translateY: fixedHeaderTranslate }],
            },
          ]}
          pointerEvents="box-none"
        >
          {renderFixedHeader({
            scrollY,
            scrollProgress,
            headerVisible,
          })}
        </Animated.View>
      )}

      {/* Sticky Header (e.g., Tab Bar) */}
      {renderStickyHeader && stickyHeaderEnabled && (
        <Animated.View
          style={[
            styles.stickyHeader,
            {
              height: stickyHeaderHeight,
              transform: [{ translateY: stickyHeaderTranslate }],
            },
          ]}
          pointerEvents="box-none"
        >
          {renderStickyHeader({
            scrollY,
            scrollProgress,
            headerVisible,
          })}
        </Animated.View>
      )}

      {/* Debug overlay (development only) */}
      {__DEV__ && enablePerformanceOptimizations && (
        <View style={styles.debugOverlay} pointerEvents="none">
          <Text style={styles.debugText}>
            ScrollY: {Math.round(lastScrollY.current)} | 
            Progress: {Math.round(scrollProgress.__getValue() * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
}, MEMOIZATION_OPTIONS.equalityFn);

// Static methods for external control
ParallaxScrollView.createAnimationConfig = (config = {}) => ({
  duration: 300,
  useNativeDriver: true,
  ...config,
});

ParallaxScrollView.scrollToTop = (ref, animated = true) => {
  ref.current?.scrollToTop(animated);
};

ParallaxScrollView.scrollTo = (ref, params) => {
  ref.current?.scrollTo(params);
};

ParallaxScrollView.scrollToEnd = (ref, animated = true) => {
  ref.current?.scrollToEnd(animated);
};

// Default props for consistency
ParallaxScrollView.defaultProps = {
  headerHeight: 280,
  minHeaderHeight: 90,
  parallaxFactor: 0.7,
  stickyHeaderHeight: 60,
  blurIntensity: 90,
  snapThreshold: 50,
  enablePerformanceOptimizations: true,
};

// Enterprise-grade Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,215,0,0.03)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    overflow: 'hidden',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  defaultHeader: {
    flex: 1,
    overflow: 'hidden',
  },
  defaultHeaderGradient: {
    flex: 1,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultHeaderContent: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  debugOverlay: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: BORDER_RADIUS.sm,
    zIndex: 1000,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
});

// Performance optimization export
export default ParallaxScrollView;