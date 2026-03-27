/**
 * @file Theme Configuration and Utilities
 * @description Enterprise-level theming system with Ethiopian market design tokens
 * @version 1.0.0
 * @module styles/theme
 */

import { useColorScheme, Dimensions, Platform } from 'react-native';

/**
 * @typedef {Object} ColorPalette
 * @property {string} primary - Primary brand color
 * @property {string} primaryDark - Darker primary variant
 * @property {string} primaryLight - Lighter primary variant
 * @property {string} secondary - Secondary brand color
 * @property {string} secondaryDark - Darker secondary variant
 * @property {string} secondaryLight - Lighter secondary variant
 * @property {string} accent - Accent color for highlights
 * @property {string} background - Main background color
 * @property {string} surface - Surface color for cards/modals
 * @property {string} card - Card background color
 * @property {string} text - Primary text color
 * @property {string} textSecondary - Secondary text color
 * @property {string} textTertiary - Tertiary text color
 * @property {string} border - Border and divider color
 * @property {string} notification - Notification and badge color
 * @property {string} success - Success state color
 * @property {string} warning - Warning state color
 * @property {string} error - Error state color
 * @property {string} info - Informational state color
 * @property {string} disabled - Disabled state color
 * @property {string} overlay - Overlay and backdrop color
 */

/**
 * @typedef {Object} SpacingScale
 * @property {number} xs - Extra small spacing (4px)
 * @property {number} sm - Small spacing (8px)
 * @property {number} md - Medium spacing (16px)
 * @property {number} lg - Large spacing (24px)
 * @property {number} xl - Extra large spacing (32px)
 * @property {number} xxl - Double extra large spacing (48px)
 * @property {number} xxxl - Triple extra large spacing (64px)
 */

/**
 * @typedef {Object} BorderRadius
 * @property {number} none - No border radius
 * @property {number} sm - Small border radius (4px)
 * @property {number} md - Medium border radius (8px)
 * @property {number} lg - Large border radius (12px)
 * @property {number} xl - Extra large border radius (16px)
 * @property {number} xxl - Double extra large border radius (24px)
 * @property {number} round - Circular border radius (9999px)
 */

/**
 * @typedef {Object} TypographyScale
 * @property {Object} h1 - Heading 1 style
 * @property {Object} h2 - Heading 2 style
 * @property {Object} h3 - Heading 3 style
 * @property {Object} h4 - Heading 4 style
 * @property {Object} title - Title style
 * @property {Object} subtitle - Subtitle style
 * @property {Object} body - Body text style
 * @property {Object} bodyBold - Bold body text style
 * @property {Object} caption - Caption text style
 * @property {Object} captionBold - Bold caption text style
 * @property {Object} small - Small text style
 * @property {Object} smallBold - Bold small text style
 * @property {Object} button - Button text style
 * @property {Object} link - Link text style
 */

/**
 * @typedef {Object} Elevation
 * @property {Object} none - No elevation
 * @property {Object} sm - Small elevation
 * @property {Object} md - Medium elevation
 * @property {Object} lg - Large elevation
 * @property {Object} xl - Extra large elevation
 */

/**
 * @typedef {Object} Theme
 * @property {ColorPalette} colors - Color palette
 * @property {SpacingScale} spacing - Spacing scale
 * @property {BorderRadius} borderRadius - Border radius scale
 * @property {TypographyScale} typography - Typography scale
 * @property {Elevation} elevation - Elevation styles
 * @property {Object} shadows - Shadow styles
 * @property {Object} animation - Animation timing
 * @property {Object} layout - Layout constants
 */

// Design Tokens - Ethiopian Market Optimized
const DESIGN_TOKENS = {
  // Ethiopian-inspired color palette
  colors: {
    // Primary - Ethiopian Green (inspired by Ethiopian flag)
    ethiopianGreen: '#078930',
    ethiopianYellow: '#FCDD09',
    ethiopianRed: '#DA121A',
    
    // Extended palette
    blueNile: '#1A5276',
    simienMountains: '#2C3E50',
    addisSunrise: '#E67E22',
    danakilDesert: '#D35400',
    
    // Neutrals
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },

  // Typography
  fontFamilies: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    amharic: 'NotoSansEthiopic-Regular', // Fallback for Amharic text
  },

  // Breakpoints for responsive design
  breakpoints: {
    phone: 0,
    tablet: 768,
    desktop: 1024,
  },

  // Animation timings
  animation: {
    quick: 150,
    standard: 300,
    complex: 500,
    slow: 700,
  },
};

// Ethiopian Market Light Theme
export const lightTheme = {
  colors: {
    // Primary Colors - Ethiopian Green as primary
    primary: DESIGN_TOKENS.colors.ethiopianGreen,
    primaryDark: '#056B26',
    primaryLight: '#4CAF50',
    primaryGradient: ['#078930', '#4CAF50'],
    
    // Secondary Colors - Blue Nile inspired
    secondary: DESIGN_TOKENS.colors.blueNile,
    secondaryDark: '#154360',
    secondaryLight: '#3498DB',
    secondaryGradient: ['#1A5276', '#3498DB'],
    
    // Accent Colors
    accent: DESIGN_TOKENS.colors.ethiopianYellow,
    accentDark: '#D4AC0D',
    accentLight: '#F7DC6F',
    
    // Status Colors
    success: '#27AE60',
    successLight: '#D5F4E2',
    successDark: '#229954',
    
    warning: DESIGN_TOKENS.colors.addisSunrise,
    warningLight: '#FBEEE6',
    warningDark: '#CA6F1E',
    
    error: DESIGN_TOKENS.colors.ethiopianRed,
    errorLight: '#FADBD8',
    errorDark: '#C0392B',
    
    info: '#2980B9',
    infoLight: '#D6EAF8',
    infoDark: '#2471A3',
    
    // Neutral Colors
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    modal: '#FFFFFF',
    
    // Text Colors
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    textDisabled: '#D1D5DB',
    
    // UI Colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderDark: '#D1D5DB',
    divider: '#F3F4F6',
    
    // State Colors
    disabled: '#9CA3AF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(0, 0, 0, 0.3)',
    
    // Notification
    notification: DESIGN_TOKENS.colors.ethiopianRed,
    
    // Ethiopian Market Specific
    government: '#2C3E50',
    construction: '#E67E22',
    premium: '#F39C12',
    verified: '#27AE60',
  },

  spacing: {
    // Base spacing unit: 4px
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    
    // Screen margins
    screenHorizontal: 16,
    screenVertical: 16,
    
    // Component specific
    buttonPadding: 12,
    inputPadding: 12,
    cardPadding: 16,
    sectionPadding: 24,
  },

  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    round: 9999,
    
    // Component specific
    button: 8,
    input: 8,
    card: 12,
    modal: 16,
    avatar: 9999,
  },

  typography: {
    h1: {
      fontSize: 32,
      lineHeight: 40,
      fontFamily: DESIGN_TOKENS.fontFamilies.bold,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      lineHeight: 36,
      fontFamily: DESIGN_TOKENS.fontFamilies.bold,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 24,
      lineHeight: 32,
      fontFamily: DESIGN_TOKENS.fontFamilies.semiBold,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    h4: {
      fontSize: 20,
      lineHeight: 28,
      fontFamily: DESIGN_TOKENS.fontFamilies.semiBold,
      fontWeight: '600',
      letterSpacing: -0.1,
    },
    title: {
      fontSize: 18,
      lineHeight: 24,
      fontFamily: DESIGN_TOKENS.fontFamilies.semiBold,
      fontWeight: '600',
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      fontFamily: DESIGN_TOKENS.fontFamilies.medium,
      fontWeight: '500',
      color: '#6B7280', // textSecondary
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontFamily: DESIGN_TOKENS.fontFamilies.regular,
      fontWeight: '400',
    },
    bodyBold: {
      fontSize: 16,
      lineHeight: 24,
      fontFamily: DESIGN_TOKENS.fontFamilies.semiBold,
      fontWeight: '600',
    },
    caption: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: DESIGN_TOKENS.fontFamilies.regular,
      fontWeight: '400',
    },
    captionBold: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: DESIGN_TOKENS.fontFamilies.medium,
      fontWeight: '500',
    },
    small: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: DESIGN_TOKENS.fontFamilies.regular,
      fontWeight: '400',
    },
    smallBold: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: DESIGN_TOKENS.fontFamilies.medium,
      fontWeight: '500',
    },
    button: {
      fontSize: 16,
      lineHeight: 20,
      fontFamily: DESIGN_TOKENS.fontFamilies.medium,
      fontWeight: '500',
      textTransform: 'none',
    },
    buttonSmall: {
      fontSize: 14,
      lineHeight: 18,
      fontFamily: DESIGN_TOKENS.fontFamilies.medium,
      fontWeight: '500',
      textTransform: 'none',
    },
    link: {
      fontSize: 16,
      lineHeight: 20,
      fontFamily: DESIGN_TOKENS.fontFamilies.medium,
      fontWeight: '500',
      color: DESIGN_TOKENS.colors.blueNile,
      textDecorationLine: 'underline',
    },
  },

  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  shadows: {
    card: {
      ...lightTheme.elevation.sm,
      backgroundColor: lightTheme.colors.card,
    },
    modal: {
      ...lightTheme.elevation.lg,
      backgroundColor: lightTheme.colors.modal,
    },
    floating: {
      ...lightTheme.elevation.md,
      backgroundColor: lightTheme.colors.surface,
    },
  },

  animation: {
    duration: {
      quick: DESIGN_TOKENS.animation.quick,
      standard: DESIGN_TOKENS.animation.standard,
      complex: DESIGN_TOKENS.animation.complex,
      slow: DESIGN_TOKENS.animation.slow,
    },
    easing: {
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      deceleration: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      acceleration: 'cubic-bezier(0.4, 0.0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
    },
  },

  layout: {
    maxWidth: 1200,
    headerHeight: 56,
    tabBarHeight: 56,
    bottomSheetHandleHeight: 24,
    keyboardVerticalOffset: 60,
  },
};

// Ethiopian Market Dark Theme
export const darkTheme = {
  ...lightTheme,
  
  colors: {
    ...lightTheme.colors,
    
    // Primary Colors (same as light theme for brand consistency)
    primary: DESIGN_TOKENS.colors.ethiopianGreen,
    primaryDark: '#056B26',
    primaryLight: '#4CAF50',
    
    // Secondary Colors
    secondary: DESIGN_TOKENS.colors.blueNile,
    secondaryDark: '#154360',
    secondaryLight: '#3498DB',
    
    // Background & Surface Colors
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2D2D2D',
    modal: '#2D2D2D',
    
    // Text Colors
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textTertiary: '#666666',
    textInverse: '#1F2937',
    textDisabled: '#555555',
    
    // UI Colors
    border: '#333333',
    borderLight: '#2A2A2A',
    borderDark: '#404040',
    divider: '#2A2A2A',
    
    // State Colors
    disabled: '#555555',
    overlay: 'rgba(255, 255, 255, 0.1)',
    backdrop: 'rgba(0, 0, 0, 0.7)',
    
    // Status Colors (adjusted for dark theme)
    successLight: '#1B3B28',
    warningLight: '#3A2A1A',
    errorLight: '#3A1A1A',
    infoLight: '#1A2B3A',
  },

  elevation: {
    ...lightTheme.elevation,
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  shadows: {
    card: {
      ...darkTheme.elevation.sm,
      backgroundColor: darkTheme.colors.card,
    },
    modal: {
      ...darkTheme.elevation.lg,
      backgroundColor: darkTheme.colors.modal,
    },
    floating: {
      ...darkTheme.elevation.md,
      backgroundColor: darkTheme.colors.surface,
    },
  },
};

// Premium Theme Variations
export const premiumTheme = {
  light: {
    ...lightTheme,
    colors: {
      ...lightTheme.colors,
      primary: '#F39C12', // Gold for premium
      primaryDark: '#D68910',
      primaryLight: '#F8C471',
    },
  },
  dark: {
    ...darkTheme,
    colors: {
      ...darkTheme.colors,
      primary: '#F39C12', // Gold for premium
      primaryDark: '#D68910',
      primaryLight: '#F8C471',
    },
  },
};

// Government Theme Variations
export const governmentTheme = {
  light: {
    ...lightTheme,
    colors: {
      ...lightTheme.colors,
      primary: '#2C3E50', // Dark blue for government
      primaryDark: '#1C2833',
      primaryLight: '#566573',
    },
  },
  dark: {
    ...darkTheme,
    colors: {
      ...darkTheme.colors,
      primary: '#2C3E50', // Dark blue for government
      primaryDark: '#1C2833',
      primaryLight: '#566573',
    },
  },
};

/**
 * Custom hook to use theme with additional context
 * @param {string} [themeVariant] - Optional theme variant (premium, government)
 * @returns {Theme} Current theme object
 */
export const useTheme = (themeVariant) => {
  const colorScheme = useColorScheme();
  const dimensions = Dimensions.get('window');
  
  let baseTheme = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  // Apply theme variant if provided
  if (themeVariant) {
    const variantThemes = {
      premium: premiumTheme,
      government: governmentTheme,
    };
    
    if (variantThemes[themeVariant]) {
      baseTheme = colorScheme === 'dark' 
        ? variantThemes[themeVariant].dark
        : variantThemes[themeVariant].light;
    }
  }
  
  // Add responsive properties
  const responsiveTheme = {
    ...baseTheme,
    isDark: colorScheme === 'dark',
    isLight: colorScheme === 'light',
    colorScheme,
    dimensions,
    isPhone: dimensions.width < DESIGN_TOKENS.breakpoints.tablet,
    isTablet: dimensions.width >= DESIGN_TOKENS.breakpoints.tablet && 
              dimensions.width < DESIGN_TOKENS.breakpoints.desktop,
    isDesktop: dimensions.width >= DESIGN_TOKENS.breakpoints.desktop,
    isPortrait: dimensions.height >= dimensions.width,
    isLandscape: dimensions.width > dimensions.height,
  };
  
  return responsiveTheme;
};

/**
 * Higher-order component for themed components
 * @param {Function} styles - Style function that receives theme
 * @returns {Function} Themed style function
 */
export const themed = (styles) => {
  return (props) => {
    const theme = useTheme();
    return styles(theme, props);
  };
};

/**
 * Create responsive style based on screen size
 * @param {Object} styleMap - Style map for different breakpoints
 * @returns {Function} Responsive style function
 */
export const responsive = (styleMap) => {
  return (theme) => {
    const { isPhone, isTablet, isDesktop } = theme;
    
    if (isDesktop && styleMap.desktop) {
      return { ...styleMap.base, ...styleMap.desktop };
    } else if (isTablet && styleMap.tablet) {
      return { ...styleMap.base, ...styleMap.tablet };
    } else if (isPhone && styleMap.phone) {
      return { ...styleMap.base, ...styleMap.phone };
    }
    
    return styleMap.base || {};
  };
};

/**
 * Create animated style with theme support
 * @param {Object} styleMap - Style map for different states
 * @returns {Function} Animated style function
 */
export const animated = (styleMap) => {
  return (theme, animatedValues) => {
    const baseStyle = styleMap.base ? styleMap.base(theme) : {};
    const animatedStyle = {};
    
    // Apply animated values
    Object.keys(animatedValues).forEach(key => {
      if (styleMap[key]) {
        Object.assign(animatedStyle, styleMap[key](theme, animatedValues[key]));
      }
    });
    
    return { ...baseStyle, ...animatedStyle };
  };
};

/**
 * Utility to create consistent component styles
 * @param {Function} styleCreator - Style creator function
 * @returns {Function} Memoized style function
 */
export const createStyles = (styleCreator) => {
  let cachedStyles = null;
  let lastTheme = null;
  
  return (theme, props = {}) => {
    // Cache styles per theme to avoid recalculations
    if (!cachedStyles || lastTheme !== theme) {
      cachedStyles = styleCreator(theme);
      lastTheme = theme;
    }
    
    // Apply props if provided
    if (props && Object.keys(props).length > 0) {
      return Object.keys(cachedStyles).reduce((result, key) => {
        if (typeof cachedStyles[key] === 'function') {
          result[key] = cachedStyles[key](props);
        } else {
          result[key] = cachedStyles[key];
        }
        return result;
      }, {});
    }
    
    return cachedStyles;
  };
};

/**
 * Color utility functions
 */
export const ColorUtils = {
  /**
   * Adjust color opacity
   * @param {string} color - Hex color
   * @param {number} opacity - Opacity (0-1)
   * @returns {string} RGBA color
   */
  withOpacity: (color, opacity) => {
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },

  /**
   * Lighten a color
   * @param {string} color - Hex color
   * @param {number} percent - Percentage to lighten (0-100)
   * @returns {string} Lightened hex color
   */
  lighten: (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (
      0x1000000 +
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
  },

  /**
   * Darken a color
   * @param {string} color - Hex color
   * @param {number} percent - Percentage to darken (0-100)
   * @returns {string} Darkened hex color
   */
  darken: (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    
    return '#' + (
      0x1000000 +
      (R > 0 ? R > 255 ? 255 : R : 0) * 0x10000 +
      (G > 0 ? G > 255 ? 255 : G : 0) * 0x100 +
      (B > 0 ? B > 255 ? 255 : B : 0)
    ).toString(16).slice(1);
  },

  /**
   * Check if color is light
   * @param {string} color - Hex color
   * @returns {boolean} True if color is light
   */
  isLight: (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  },

  /**
   * Get contrasting text color
   * @param {string} backgroundColor - Background color
   * @returns {string} Contrasting text color
   */
  getContrastText: (backgroundColor) => {
    return ColorUtils.isLight(backgroundColor) ? '#000000' : '#FFFFFF';
  },
};

// Export theme constants for direct usage
export const ThemeConstants = {
  DESIGN_TOKENS,
  lightTheme,
  darkTheme,
  premiumTheme,
  governmentTheme,
};

// Default export
export default {
  useTheme,
  themed,
  responsive,
  animated,
  createStyles,
  ColorUtils,
  ...ThemeConstants,
};