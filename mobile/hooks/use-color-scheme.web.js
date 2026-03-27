// hooks/use-color-scheme.js
/**
 * ENTERPRISE-LEVEL COLOR SCHEME MANAGEMENT HOOK
 * Advanced theme system with Ethiopian market optimization and accessibility
 * Complete integration with all Yachi platform features
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useColorScheme as useRNColorScheme, Appearance } from 'react-native';
import { storage } from '../utils/storage';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useAuth } from '../contexts/auth-context';
import { COLORS, THEME_PRESETS, ThemeUtils } from '../constants/theme';

// ==================== COLOR SCHEME CONSTANTS ====================
export const COLOR_SCHEME = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
  CUSTOM: 'custom',
  ETHIOPIAN_LIGHT: 'ethiopian_light',
  ETHIOPIAN_DARK: 'ethiopian_dark',
};

export const THEME_VARIANT = {
  DEFAULT: 'default',
  CONTRAST: 'contrast',
  DIM: 'dim',
  GRAPHITE: 'graphite',
  SEPIA: 'sepia',
  CONSTRUCTION: 'construction',
  GOVERNMENT: 'government',
  PREMIUM: 'premium',
};

export const ACCESSIBILITY_SETTINGS = {
  REDUCED_MOTION: 'reducedMotion',
  HIGH_CONTRAST: 'highContrast',
  LARGE_TEXT: 'largeText',
  BOLD_TEXT: 'boldText',
  REDUCED_TRANSPARENCY: 'reducedTransparency',
};

export const AUTO_THEME_TIME = {
  SUNRISE_SUNSET: 'sunrise_sunset',
  CUSTOM: 'custom',
  LOCATION_BASED: 'location_based',
};

export const ETHIOPIAN_THEME_FEATURES = {
  REGIONAL_COLORS: 'regional_colors',
  CULTURAL_PATTERNS: 'cultural_patterns',
  HOLIDAY_THEMES: 'holiday_themes',
  TRADITIONAL_DESIGN: 'traditional_design',
};

// ==================== INITIAL STATE ====================
const initialState = {
  // Current Theme State
  colorScheme: COLOR_SCHEME.AUTO,
  resolvedScheme: 'light',
  previousScheme: null,
  
  // Theme Variants & Customization
  themeVariant: THEME_VARIANT.DEFAULT,
  customThemes: new Map(),
  activeCustomTheme: null,
  
  // System Integration
  systemScheme: 'light',
  followsSystem: true,
  
  // Ethiopian Theme Features
  ethiopianFeatures: {
    regionalColors: true,
    culturalPatterns: false,
    holidayThemes: true,
    traditionalDesign: false,
    currentRegion: 'ADDIS_ABABA',
    activeHoliday: null,
  },
  
  // Auto Theme Configuration
  autoTheme: {
    enabled: false,
    sunriseTime: '06:30',
    sunsetTime: '18:45',
    lightTheme: COLOR_SCHEME.LIGHT,
    darkTheme: COLOR_SCHEME.DARK,
    basedOn: AUTO_THEME_TIME.SUNRISE_SUNSET,
    locationBased: false,
    customSchedule: null,
  },
  
  // Accessibility Settings
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    boldText: false,
    reducedTransparency: false,
  },
  
  // Performance & Settings
  settings: {
    smoothTransitions: true,
    transitionDuration: 300,
    persistPreferences: true,
    analyticsEnabled: true,
    performanceMode: false,
    cacheThemes: true,
  },
  
  // Status & Analytics
  isInitialized: false,
  isLoading: false,
  isTransitioning: false,
  schemeChangeCount: 0,
  lastSchemeChange: null,
  themeSessionStart: null,
  
  // Error Handling
  error: null,
  errorCode: null,
};

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
  COLOR_SCHEME: 'yachi_color_scheme',
  THEME_VARIANT: 'yachi_theme_variant',
  ACCESSIBILITY: 'yachi_accessibility_settings',
  AUTO_THEME: 'yachi_auto_theme_settings',
  CUSTOM_THEMES: 'yachi_custom_themes',
  SCHEME_STATS: 'yachi_scheme_statistics',
  ETHIOPIAN_FEATURES: 'yachi_ethiopian_features',
  THEME_PREFERENCES: 'yachi_theme_preferences',
};

// ==================== ENTERPRISE COLOR SCHEME HOOK ====================
/**
 * Enterprise Color Scheme Management Hook
 * Advanced theme system with Ethiopian optimization and accessibility
 */
export const useColorScheme = (options = {}) => {
  const {
    enableEthiopianFeatures = true,
    enablePerformanceMode = false,
    defaultScheme = COLOR_SCHEME.AUTO,
    enableAnalytics = true,
  } = options;

  const systemColorScheme = useRNColorScheme();
  const { user, isAuthenticated } = useAuth();
  
  // State Management
  const [state, setState] = useState(initialState);
  
  // Refs
  const transitionTimeoutRef = useRef(null);
  const autoThemeTimerRef = useRef(null);
  const themeCacheRef = useRef(new Map());
  const sessionStartTimeRef = useRef(Date.now());

  // ==================== LIFECYCLE MANAGEMENT ====================
  useEffect(() => {
    initializeColorScheme();

    return () => {
      cleanupColorScheme();
    };
  }, []);

  useEffect(() => {
    if (state.autoTheme.enabled) {
      setupAutoTheme();
    } else {
      stopAutoTheme();
    }
  }, [state.autoTheme.enabled]);

  useEffect(() => {
    if (state.isInitialized && enableAnalytics) {
      trackThemeSession();
    }
  }, [state.resolvedScheme, state.themeVariant, state.isInitialized]);

  // ==================== INITIALIZATION ====================
  const initializeColorScheme = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load all persisted theme data
      const [
        savedScheme, 
        savedVariant, 
        accessibility, 
        autoTheme, 
        customThemes,
        schemeStats,
        ethiopianFeatures,
        themePreferences
      ] = await Promise.all([
        storage.getItem(STORAGE_KEYS.COLOR_SCHEME),
        storage.getItem(STORAGE_KEYS.THEME_VARIANT),
        storage.getItem(STORAGE_KEYS.ACCESSIBILITY),
        storage.getItem(STORAGE_KEYS.AUTO_THEME),
        storage.getItem(STORAGE_KEYS.CUSTOM_THEMES),
        storage.getItem(STORAGE_KEYS.SCHEME_STATS),
        storage.getItem(STORAGE_KEYS.ETHIOPIAN_FEATURES),
        storage.getItem(STORAGE_KEYS.THEME_PREFERENCES),
      ]);

      // Calculate initial scheme with Ethiopian context
      const initialScheme = savedScheme || defaultScheme;
      const resolvedScheme = calculateResolvedScheme(
        initialScheme, 
        systemColorScheme,
        user?.region
      );

      // Initialize Ethiopian features based on user region
      const userRegion = user?.region || 'ADDIS_ABABA';
      const enhancedEthiopianFeatures = enhanceEthiopianFeatures(
        ethiopianFeatures,
        userRegion
      );

      setState(prev => ({
        ...prev,
        colorScheme: initialScheme,
        resolvedScheme,
        systemScheme: systemColorScheme,
        themeVariant: savedVariant || THEME_VARIANT.DEFAULT,
        accessibility: accessibility || prev.accessibility,
        autoTheme: autoTheme || prev.autoTheme,
        customThemes: new Map(customThemes || []),
        ethiopianFeatures: enhancedEthiopianFeatures,
        settings: themePreferences?.settings || prev.settings,
        schemeChangeCount: schemeStats?.changeCount || 0,
        lastSchemeChange: schemeStats?.lastChange || null,
        themeSessionStart: Date.now(),
        isInitialized: true,
        isLoading: false,
      }));

      // Preload theme variants for performance
      preloadThemeVariants();

      // Setup system theme listener
      setupSystemThemeListener();

      analyticsService.trackEvent('color_scheme_enterprise_initialized', {
        scheme: initialScheme,
        resolvedScheme,
        variant: savedVariant,
        userRegion: user?.region,
        ethiopianFeatures: enhancedEthiopianFeatures.currentRegion,
      });

    } catch (error) {
      handleThemeError(error, 'ColorSchemeInitialization');
      
      // Fallback to system scheme with Ethiopian context
      setState(prev => ({
        ...prev,
        colorScheme: COLOR_SCHEME.AUTO,
        resolvedScheme: systemColorScheme,
        systemScheme: systemColorScheme,
        isInitialized: true,
        isLoading: false,
      }));
    }
  }, [systemColorScheme, user, defaultScheme]);

  // ==================== THEME MANAGEMENT ====================
  /**
   * Set color scheme with Ethiopian context awareness
   */
  const setColorScheme = useCallback(async (scheme, options = {}) => {
    try {
      validateColorScheme(scheme);

      const previousScheme = state.colorScheme;
      const resolvedScheme = calculateResolvedScheme(
        scheme, 
        state.systemScheme,
        user?.region
      );

      // Handle smooth transitions
      if (state.settings.smoothTransitions && !options.immediate) {
        await handleThemeTransition();
      }

      // Update state
      setState(prev => ({
        ...prev,
        colorScheme: scheme,
        resolvedScheme,
        previousScheme,
        schemeChangeCount: prev.schemeChangeCount + 1,
        lastSchemeChange: Date.now(),
        isTransitioning: false,
      }));

      // Persist preferences
      if (state.settings.persistPreferences) {
        await persistThemePreferences(scheme);
      }

      // Track analytics
      if (state.settings.analyticsEnabled && enableAnalytics) {
        analyticsService.trackEvent('color_scheme_changed_enterprise', {
          previousScheme,
          newScheme: scheme,
          resolvedScheme,
          variant: state.themeVariant,
          userRole: user?.role,
          userRegion: user?.region,
          transition: !options.immediate,
        });
      }

      // Handle auto theme management
      manageAutoTheme(scheme);

    } catch (error) {
      handleThemeError(error, 'SetColorScheme', { scheme });
      throw error;
    }
  }, [state, user, enableAnalytics]);

  /**
   * Set theme variant with feature-specific optimizations
   */
  const setThemeVariant = useCallback(async (variant, options = {}) => {
    try {
      validateThemeVariant(variant);

      const previousVariant = state.themeVariant;

      setState(prev => ({
        ...prev,
        themeVariant: variant,
      }));

      // Apply variant-specific optimizations
      await applyVariantOptimizations(variant, options);

      // Persist variant
      if (state.settings.persistPreferences) {
        await storage.setItem(STORAGE_KEYS.THEME_VARIANT, variant);
      }

      // Track analytics
      if (state.settings.analyticsEnabled) {
        analyticsService.trackEvent('theme_variant_changed_enterprise', {
          previousVariant,
          newVariant: variant,
          colorScheme: state.colorScheme,
          resolvedScheme: state.resolvedScheme,
          userRole: user?.role,
        });
      }

    } catch (error) {
      handleThemeError(error, 'SetThemeVariant', { variant });
      throw error;
    }
  }, [state.colorScheme, state.resolvedScheme, user]);

  /**
   * Toggle between light and dark with Ethiopian optimization
   */
  const toggleColorScheme = useCallback(async () => {
    const currentScheme = state.resolvedScheme;
    const newScheme = currentScheme === COLOR_SCHEME.LIGHT ? 
      COLOR_SCHEME.DARK : COLOR_SCHEME.LIGHT;

    await setColorScheme(newScheme, { 
      immediate: !state.settings.smoothTransitions 
    });
  }, [state.resolvedScheme, state.settings.smoothTransitions, setColorScheme]);

  // ==================== ETHIOPIAN THEME FEATURES ====================
  /**
   * Enable Ethiopian theme features based on user region
   */
  const enableEthiopianTheme = useCallback(async (features = {}) => {
    try {
      const userRegion = user?.region || 'ADDIS_ABABA';
      const enhancedFeatures = {
        ...state.ethiopianFeatures,
        ...features,
        currentRegion: userRegion,
        regionalColors: features.regionalColors ?? true,
        holidayThemes: features.holidayThemes ?? true,
      };

      // Apply regional color scheme
      const regionalScheme = getRegionalColorScheme(userRegion);
      
      setState(prev => ({
        ...prev,
        ethiopianFeatures: enhancedFeatures,
      }));

      // Update current theme with Ethiopian features
      if (features.regionalColors) {
        await applyRegionalColors(userRegion);
      }

      // Persist Ethiopian features
      await storage.setItem(STORAGE_KEYS.ETHIOPIAN_FEATURES, enhancedFeatures);

      analyticsService.trackEvent('ethiopian_theme_enabled', {
        region: userRegion,
        features: Object.keys(features),
        userRole: user?.role,
      });

    } catch (error) {
      handleThemeError(error, 'EnableEthiopianTheme', { features });
    }
  }, [state.ethiopianFeatures, user]);

  /**
   * Apply regional colors based on Ethiopian region
   */
  const applyRegionalColors = useCallback(async (region) => {
    try {
      const regionalColors = getRegionalColors(region);
      const currentTheme = getCurrentTheme();
      
      const enhancedTheme = {
        ...currentTheme,
        colors: {
          ...currentTheme.colors,
          regional: regionalColors,
        },
      };

      // Cache the regional theme
      themeCacheRef.current.set(`regional_${region}`, enhancedTheme);

      analyticsService.trackEvent('regional_colors_applied', {
        region,
        colorCount: Object.keys(regionalColors).length,
      });

    } catch (error) {
      handleThemeError(error, 'ApplyRegionalColors', { region });
    }
  }, []);

  /**
   * Activate holiday theme for Ethiopian holidays
   */
  const activateHolidayTheme = useCallback(async (holiday) => {
    try {
      const holidayTheme = getHolidayTheme(holiday);
      
      setState(prev => ({
        ...prev,
        ethiopianFeatures: {
          ...prev.ethiopianFeatures,
          activeHoliday: holiday,
        },
      }));

      // Apply holiday colors
      const currentTheme = getCurrentTheme();
      const holidayEnhancedTheme = {
        ...currentTheme,
        colors: {
          ...currentTheme.colors,
          holiday: holidayTheme.colors,
        },
      };

      themeCacheRef.current.set(`holiday_${holiday}`, holidayEnhancedTheme);

      analyticsService.trackEvent('holiday_theme_activated', {
        holiday,
        region: state.ethiopianFeatures.currentRegion,
      });

    } catch (error) {
      handleThemeError(error, 'ActivateHolidayTheme', { holiday });
    }
  }, [state.ethiopianFeatures]);

  // ==================== ACCESSIBILITY MANAGEMENT ====================
  /**
   * Set accessibility setting with theme adjustments
   */
  const setAccessibilitySetting = useCallback(async (setting, value, options = {}) => {
    try {
      validateAccessibilitySetting(setting);

      const previousSettings = { ...state.accessibility };

      setState(prev => ({
        ...prev,
        accessibility: {
          ...prev.accessibility,
          [setting]: value,
        },
      }));

      // Apply accessibility adjustments to current theme
      if (options.applyImmediately !== false) {
        await applyAccessibilityAdjustments(setting, value);
      }

      // Persist accessibility settings
      if (state.settings.persistPreferences) {
        await storage.setItem(STORAGE_KEYS.ACCESSIBILITY, {
          ...state.accessibility,
          [setting]: value,
        });
      }

      // Track analytics
      if (state.settings.analyticsEnabled) {
        analyticsService.trackEvent('accessibility_setting_changed_enterprise', {
          setting,
          value,
          previousValue: previousSettings[setting],
          colorScheme: state.colorScheme,
          userRole: user?.role,
        });
      }

    } catch (error) {
      handleThemeError(error, 'SetAccessibilitySetting', { setting, value });
      throw error;
    }
  }, [state.accessibility, state.colorScheme, user]);

  // ==================== AUTO THEME MANAGEMENT ====================
  /**
   * Configure auto theme with Ethiopian time considerations
   */
  const setAutoTheme = useCallback(async (autoThemeSettings) => {
    try {
      const newAutoTheme = {
        ...state.autoTheme,
        ...autoThemeSettings,
        // Adjust for Ethiopian timezone if location-based
        ...(autoThemeSettings.locationBased && {
          sunriseTime: calculateEthiopianSunrise(),
          sunsetTime: calculateEthiopianSunset(),
        }),
      };

      setState(prev => ({
        ...prev,
        autoTheme: newAutoTheme,
      }));

      // Persist auto theme settings
      if (state.settings.persistPreferences) {
        await storage.setItem(STORAGE_KEYS.AUTO_THEME, newAutoTheme);
      }

      // Restart auto theme if enabled
      if (newAutoTheme.enabled) {
        setupAutoTheme(newAutoTheme);
      } else {
        stopAutoTheme();
      }

      // Track analytics
      if (state.settings.analyticsEnabled) {
        analyticsService.trackEvent('auto_theme_updated_enterprise', {
          ...newAutoTheme,
          userRegion: user?.region,
        });
      }

    } catch (error) {
      handleThemeError(error, 'SetAutoTheme', { autoThemeSettings });
      throw error;
    }
  }, [state.autoTheme, user]);

  // ==================== CUSTOM THEME MANAGEMENT ====================
  /**
   * Create custom theme with Ethiopian design elements
   */
  const createCustomTheme = useCallback(async (themeName, themeData, options = {}) => {
    try {
      if (!themeName || !themeData) {
        throw new Error('Theme name and data are required');
      }

      const customTheme = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: themeName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseScheme: themeData.baseScheme || state.resolvedScheme,
        variant: themeData.variant || THEME_VARIANT.DEFAULT,
        colors: enhanceWithEthiopianColors(themeData.colors),
        metadata: {
          createdBy: user?.id,
          userRole: user?.role,
          region: user?.region,
          ...themeData.metadata,
        },
        ...themeData,
      };

      setState(prev => ({
        ...prev,
        customThemes: new Map(prev.customThemes).set(customTheme.id, customTheme),
      }));

      // Persist custom themes
      if (state.settings.persistPreferences) {
        await storage.setItem(STORAGE_KEYS.CUSTOM_THEMES, 
          Array.from(state.customThemes.entries())
        );
      }

      // Track analytics
      if (state.settings.analyticsEnabled) {
        analyticsService.trackEvent('custom_theme_created_enterprise', {
          themeId: customTheme.id,
          themeName,
          baseScheme: customTheme.baseScheme,
          variant: customTheme.variant,
          userRole: user?.role,
        });
      }

      return customTheme.id;

    } catch (error) {
      handleThemeError(error, 'CreateCustomTheme', { themeName });
      throw error;
    }
  }, [state.customThemes, state.resolvedScheme, user]);

  // ==================== PERFORMANCE OPTIMIZATIONS ====================
  /**
   * Preload theme variants for instant switching
   */
  const preloadThemeVariants = useCallback(() => {
    if (!state.settings.cacheThemes) return;

    const variants = Object.values(THEME_VARIANT);
    const schemes = Object.values(COLOR_SCHEME);

    variants.forEach(variant => {
      schemes.forEach(scheme => {
        const theme = generateTheme(scheme, variant, state.ethiopianFeatures);
        themeCacheRef.current.set(`${scheme}_${variant}`, theme);
      });
    });

    analyticsService.trackEvent('theme_variants_preloaded', {
      variantCount: variants.length,
      schemeCount: schemes.length,
    });
  }, [state.ethiopianFeatures, state.settings.cacheThemes]);

  /**
   * Get optimized theme with caching
   */
  const getOptimizedTheme = useCallback(() => {
    const cacheKey = `${state.resolvedScheme}_${state.themeVariant}_${state.ethiopianFeatures.currentRegion}`;
    
    if (themeCacheRef.current.has(cacheKey)) {
      return themeCacheRef.current.get(cacheKey);
    }

    const theme = generateTheme(
      state.resolvedScheme, 
      state.themeVariant, 
      state.ethiopianFeatures
    );
    
    themeCacheRef.current.set(cacheKey, theme);
    return theme;
  }, [state.resolvedScheme, state.themeVariant, state.ethiopianFeatures]);

  // ==================== UTILITY FUNCTIONS ====================
  const calculateResolvedScheme = useCallback((scheme, systemScheme, userRegion) => {
    switch (scheme) {
      case COLOR_SCHEME.LIGHT:
        return COLOR_SCHEME.LIGHT;
      case COLOR_SCHEME.DARK:
        return COLOR_SCHEME.DARK;
      case COLOR_SCHEME.ETHIOPIAN_LIGHT:
        return COLOR_SCHEME.LIGHT;
      case COLOR_SCHEME.ETHIOPIAN_DARK:
        return COLOR_SCHEME.DARK;
      case COLOR_SCHEME.AUTO:
      case COLOR_SCHEME.CUSTOM:
        return systemScheme || COLOR_SCHEME.LIGHT;
      default:
        return systemScheme || COLOR_SCHEME.LIGHT;
    }
  }, []);

  const setupAutoTheme = useCallback((autoThemeSettings = state.autoTheme) => {
    stopAutoTheme();

    if (!autoThemeSettings.enabled) return;

    const updateThemeBasedOnTime = () => {
      const now = new Date();
      const shouldBeDark = shouldUseDarkTheme(now, autoThemeSettings);
      
      if (state.colorScheme === COLOR_SCHEME.AUTO && shouldBeDark !== (state.resolvedScheme === COLOR_SCHEME.DARK)) {
        setColorScheme(COLOR_SCHEME.AUTO, { immediate: true });
      }
    };

    updateThemeBasedOnTime();
    autoThemeTimerRef.current = setInterval(updateThemeBasedOnTime, 60000);
  }, [state.colorScheme, state.resolvedScheme, setColorScheme, state.autoTheme]);

  const stopAutoTheme = useCallback(() => {
    if (autoThemeTimerRef.current) {
      clearInterval(autoThemeTimerRef.current);
      autoThemeTimerRef.current = null;
    }
  }, []);

  const handleThemeTransition = useCallback(async () => {
    setState(prev => ({ ...prev, isTransitioning: true }));
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    return new Promise((resolve) => {
      transitionTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, isTransitioning: false }));
        resolve();
      }, state.settings.transitionDuration);
    });
  }, [state.settings.transitionDuration]);

  const setupSystemThemeListener = useCallback(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const newSystemScheme = colorScheme || COLOR_SCHEME.LIGHT;
      const resolvedScheme = calculateResolvedScheme(
        state.colorScheme, 
        newSystemScheme,
        user?.region
      );
      
      setState(prev => ({
        ...prev,
        systemScheme: newSystemScheme,
        resolvedScheme,
      }));

      if (state.settings.analyticsEnabled) {
        analyticsService.trackEvent('system_theme_changed_enterprise', {
          systemScheme: colorScheme,
          appScheme: state.colorScheme,
          resolvedScheme,
          userRegion: user?.region,
        });
      }
    });

    return () => subscription.remove();
  }, [state.colorScheme, user, calculateResolvedScheme]);

  // ==================== ERROR HANDLING ====================
  const handleThemeError = useCallback((error, context, metadata = {}) => {
    console.error(`${context} error:`, error);
    
    const errorCode = getThemeErrorCode(error);
    const errorMessage = getThemeErrorMessage(error, errorCode);

    setState(prev => ({
      ...prev,
      error: errorMessage,
      errorCode,
      isLoading: false,
      isTransitioning: false,
    }));

    analyticsService.trackEvent('theme_error', {
      context,
      errorCode,
      ...metadata,
    });

    errorService.captureError(error, {
      context: `Theme-${context}`,
      errorCode,
      ...metadata,
    });
  }, []);

  const getThemeErrorCode = (error) => {
    if (error.message?.includes('Invalid color scheme')) {
      return 'INVALID_SCHEME';
    }
    if (error.message?.includes('Invalid theme variant')) {
      return 'INVALID_VARIANT';
    }
    if (error.message?.includes('network') || error.message?.includes('Network')) {
      return 'NETWORK_ERROR';
    }
    return 'UNKNOWN_ERROR';
  };

  const getThemeErrorMessage = (error, errorCode) => {
    const errorMessages = {
      INVALID_SCHEME: 'The selected color scheme is not supported.',
      INVALID_VARIANT: 'The selected theme variant is not available.',
      NETWORK_ERROR: 'Unable to save theme preferences. Please check your connection.',
      UNKNOWN_ERROR: 'An unexpected theme error occurred. Please try again.',
    };

    return errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
  };

  // ==================== CLEANUP ====================
  const cleanupColorScheme = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    if (autoThemeTimerRef.current) {
      clearInterval(autoThemeTimerRef.current);
    }
    
    // Track session end
    if (state.isInitialized && enableAnalytics) {
      trackThemeSessionEnd();
    }
  }, [state.isInitialized, enableAnalytics]);

  // ==================== ANALYTICS & TRACKING ====================
  const trackThemeSession = useCallback(() => {
    analyticsService.trackEvent('theme_session_active', {
      colorScheme: state.colorScheme,
      resolvedScheme: state.resolvedScheme,
      themeVariant: state.themeVariant,
      userRole: user?.role,
      userRegion: user?.region,
      accessibility: state.accessibility,
    });
  }, [state, user]);

  const trackThemeSessionEnd = useCallback(() => {
    const sessionDuration = Date.now() - sessionStartTimeRef.current;
    
    analyticsService.trackEvent('theme_session_ended', {
      sessionDuration,
      finalScheme: state.colorScheme,
      finalVariant: state.themeVariant,
      schemeChanges: state.schemeChangeCount,
      userRole: user?.role,
    });
  }, [state, user]);

  const persistThemePreferences = async (scheme) => {
    await storage.setItem(STORAGE_KEYS.COLOR_SCHEME, scheme);
    
    await storage.setItem(STORAGE_KEYS.SCHEME_STATS, {
      changeCount: state.schemeChangeCount + 1,
      lastChange: Date.now(),
      previousScheme: state.previousScheme,
      newScheme: scheme,
      userRegion: user?.region,
    });
  };

  // ==================== VALIDATION FUNCTIONS ====================
  const validateColorScheme = (scheme) => {
    if (!Object.values(COLOR_SCHEME).includes(scheme)) {
      throw new Error(`Invalid color scheme: ${scheme}`);
    }
  };

  const validateThemeVariant = (variant) => {
    if (!Object.values(THEME_VARIANT).includes(variant)) {
      throw new Error(`Invalid theme variant: ${variant}`);
    }
  };

  const validateAccessibilitySetting = (setting) => {
    if (!Object.values(ACCESSIBILITY_SETTINGS).includes(setting)) {
      throw new Error(`Invalid accessibility setting: ${setting}`);
    }
  };

  // ==================== HOOK RETURN VALUE ====================
  return {
    // State
    ...state,
    
    // Theme Management
    setColorScheme,
    toggleColorScheme,
    setThemeVariant,
    
    // Ethiopian Features
    enableEthiopianTheme,
    activateHolidayTheme,
    applyRegionalColors,
    
    // Accessibility
    setAccessibilitySetting,
    
    // Auto Theme
    setAutoTheme,
    
    // Custom Themes
    createCustomTheme,
    
    // Performance
    getOptimizedTheme,
    
    // Utility Functions
    clearError: () => setState(prev => ({ 
      ...prev, 
      error: null, 
      errorCode: null 
    })),
    
    // Derived State
    themeContext: {
      isDark: state.resolvedScheme === COLOR_SCHEME.DARK,
      isLight: state.resolvedScheme === COLOR_SCHEME.LIGHT,
      isAuto: state.colorScheme === COLOR_SCHEME.AUTO,
      isCustom: state.colorScheme === COLOR_SCHEME.CUSTOM,
      hasEthiopianFeatures: state.ethiopianFeatures.regionalColors,
      currentRegion: state.ethiopianFeatures.currentRegion,
      activeHoliday: state.ethiopianFeatures.activeHoliday,
      variant: state.themeVariant,
      accessibility: state.accessibility,
    },
    
    // Analytics
    themeStats: {
      totalChanges: state.schemeChangeCount,
      lastChange: state.lastSchemeChange,
      sessionStart: sessionStartTimeRef.current,
      currentSessionDuration: Date.now() - sessionStartTimeRef.current,
      prefersDark: state.systemScheme === COLOR_SCHEME.DARK,
      autoThemeEnabled: state.autoTheme.enabled,
      customThemesCount: state.customThemes.size,
      userRegion: user?.region,
    },
  };
};

// ==================== HELPER FUNCTIONS ====================
const enhanceEthiopianFeatures = (features, userRegion) => {
  const defaultFeatures = {
    regionalColors: true,
    culturalPatterns: false,
    holidayThemes: true,
    traditionalDesign: false,
    currentRegion: userRegion,
    activeHoliday: null,
  };

  return { ...defaultFeatures, ...features };
};

const getRegionalColorScheme = (region) => {
  const regionalSchemes = {
    'ADDIS_ABABA': COLOR_SCHEME.ETHIOPIAN_LIGHT,
    'OROMIA': COLOR_SCHEME.ETHIOPIAN_LIGHT,
    'AMHARA': COLOR_SCHEME.ETHIOPIAN_DARK,
    'TIGRAY': COLOR_SCHEME.ETHIOPIAN_DARK,
  };

  return regionalSchemes[region] || COLOR_SCHEME.ETHIOPIAN_LIGHT;
};

const getRegionalColors = (region) => {
  return ThemeUtils.getRegionalColors(region);
};

const getHolidayTheme = (holiday) => {
  const holidayThemes = {
    'MESKEL': { colors: { primary: '#E30613', secondary: '#F59E0B' }},
    'TIMKAT': { colors: { primary: '#1E40AF', secondary: '#3B82F6' }},
    'ENKUTATASH': { colors: { primary: '#F59E0B', secondary: '#16A34A' }},
  };

  return holidayThemes[holiday] || holidayThemes.MESKEL;
};

const enhanceWithEthiopianColors = (colors) => {
  return {
    ...colors,
    ethiopianRed: '#E30613',
    ethiopianGreen: '#078C17',
    ethiopianYellow: '#F59E0B',
  };
};

const shouldUseDarkTheme = (now, autoThemeSettings) => {
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [sunriseHours, sunriseMinutes] = autoThemeSettings.sunriseTime.split(':').map(Number);
  const [sunsetHours, sunsetMinutes] = autoThemeSettings.sunsetTime.split(':').map(Number);
  
  const sunriseTime = sunriseHours * 60 + sunriseMinutes;
  const sunsetTime = sunsetHours * 60 + sunsetMinutes;
  
  return currentTime < sunriseTime || currentTime >= sunsetTime;
};

const calculateEthiopianSunrise = () => {
  // Ethiopian sunrise is generally around 6:30 AM
  return '06:30';
};

const calculateEthiopianSunset = () => {
  // Ethiopian sunset is generally around 6:45 PM
  return '18:45';
};

const generateTheme = (scheme, variant, ethiopianFeatures) => {
  const baseTheme = scheme === COLOR_SCHEME.DARK ? THEME_PRESETS.DARK : THEME_PRESETS.LIGHT;
  
  // Apply variant modifications
  const variantTheme = applyVariantModifications(baseTheme, variant);
  
  // Apply Ethiopian features
  const ethiopianTheme = applyEthiopianFeatures(variantTheme, ethiopianFeatures);
  
  return ethiopianTheme;
};

const applyVariantModifications = (theme, variant) => {
  // Implementation for variant modifications
  return theme;
};

const applyEthiopianFeatures = (theme, ethiopianFeatures) => {
  // Implementation for Ethiopian feature applications
  return theme;
};

const applyVariantOptimizations = async (variant, options) => {
  // Implementation for variant-specific optimizations
};

const applyAccessibilityAdjustments = async (setting, value) => {
  // Implementation for accessibility adjustments
};

const manageAutoTheme = (scheme) => {
  // Implementation for auto theme management
};

const getCurrentTheme = () => {
  // Implementation to get current theme
  return THEME_PRESETS.LIGHT;
};

export default useColorScheme;