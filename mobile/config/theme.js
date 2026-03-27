// config/theme.js

/**
 * ENTERPRISE THEME SYSTEM
 * Yachi Construction & Services Platform
 * Comprehensive Design System with Ethiopian Market Customization
 * Multi-language, Accessibility-First, Performance-Optimized
 */

import { Dimensions, Platform, StatusBar } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';

// ==================== ENTERPRISE CONSTANTS ====================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DEVICE_CONSTANTS = {
  // Screen dimensions
  SCREEN: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    aspectRatio: SCREEN_WIDTH / SCREEN_HEIGHT,
  },

  // Responsive breakpoints (mobile-first)
  BREAKPOINTS: {
    xs: 320,    // Small phones
    sm: 375,    // Medium phones
    md: 414,    // Large phones
    lg: 768,    // Tablets
    xl: 1024,   // Small laptops
    '2xl': 1280, // Large laptops
    '3xl': 1536, // Desktops
  },

  // Platform detection
  PLATFORM: {
    OS: Platform.OS,
    version: Platform.Version,
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    isWeb: Platform.OS === 'web',
    isMobile: Platform.OS !== 'web',
    isTablet: SCREEN_WIDTH >= 768,
    isSmallDevice: SCREEN_WIDTH < 375,
    isLargeDevice: SCREEN_WIDTH >= 1024,
  },

  // Status bar management
  STATUS_BAR: {
    height: getStatusBarHeight(),
    safeArea: Platform.select({
      ios: 44,
      android: StatusBar.currentHeight || 24,
      default: 0,
    }),
    currentHeight: StatusBar.currentHeight,
  },
};

// ==================== ETHIOPIAN MARKET COLOR SYSTEM ====================
export const ETHIOPIAN_COLORS = {
  // Ethiopian flag colors
  flag: {
    green: '#078930',    // Ethiopian green
    yellow: '#FCDD09',   // Ethiopian yellow
    red: '#DA121A',      // Ethiopian red
  },

  // Traditional Ethiopian colors
  traditional: {
    purple: '#7E22CE',   // Traditional purple
    gold: '#CA8A04',     // Traditional gold
    brown: '#92400E',    // Traditional brown
    blue: '#1D4ED8',     // Traditional blue
  },

  // Market-specific semantic colors
  market: {
    construction: '#F59E0B',    // Construction industry
    government: '#059669',      // Government projects
    premium: '#7C3AED',         // Premium features
    urgent: '#DC2626',          // Urgent/emergency
  },
};

// ==================== ENTERPRISE COLOR PALETTE ====================
export const COLOR_SYSTEM = {
  // Primary brand colors (Ethiopian inspired)
  primary: {
    50: '#f0fdf5',
    100: '#dcfce8',
    200: '#bbf7d1',
    300: '#86efad',
    400: '#4ade81',
    500: '#22c55e',    // Main brand green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Secondary colors (Traditional Ethiopian)
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',    // Traditional purple
    600: '#9333ea',
    700: '#7c2ed6',
    800: '#6a21a6',
    900: '#581c87',
    950: '#3b0764',
  },

  // Neutral scale (Accessibility optimized)
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Success colors
  success: {
    50: '#f0fdf5',
    100: '#dcfce8',
    200: '#bbf7d1',
    300: '#86efad',
    400: '#4ade81',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Info colors
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
};

// ==================== TYPOGRAPHY SYSTEM ====================
export const TYPOGRAPHY = {
  // Font families with Ethiopian language support
  fontFamily: {
    primary: {
      regular: Platform.select({
        ios: 'Inter-Regular',
        android: 'Inter-Regular',
        web: 'Inter, sans-serif',
      }),
      medium: Platform.select({
        ios: 'Inter-Medium',
        android: 'Inter-Medium',
        web: 'Inter, sans-serif',
      }),
      semibold: Platform.select({
        ios: 'Inter-SemiBold',
        android: 'Inter-SemiBold',
        web: 'Inter, sans-serif',
      }),
      bold: Platform.select({
        ios: 'Inter-Bold',
        android: 'Inter-Bold',
        web: 'Inter, sans-serif',
      }),
    },
    
    // Ethiopian script support
    ethiopic: {
      regular: Platform.select({
        ios: 'NotoSansEthiopic-Regular',
        android: 'NotoSansEthiopic-Regular',
        web: 'Noto Sans Ethiopic, sans-serif',
      }),
      bold: Platform.select({
        ios: 'NotoSansEthiopic-Bold',
        android: 'NotoSansEthiopic-Bold',
        web: 'Noto Sans Ethiopic, sans-serif',
      }),
    },
  },

  // Responsive font scale
  fontSize: {
    xs: this.responsiveValue(12, 13, 14),      // [phone, tablet, desktop]
    sm: this.responsiveValue(14, 15, 16),
    base: this.responsiveValue(16, 17, 18),
    lg: this.responsiveValue(18, 19, 20),
    xl: this.responsiveValue(20, 22, 24),
    '2xl': this.responsiveValue(24, 26, 28),
    '3xl': this.responsiveValue(30, 32, 36),
    '4xl': this.responsiveValue(36, 40, 48),
    '5xl': this.responsiveValue(48, 56, 64),
  },

  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2.0,
  },

  // Font weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Text styles
  textStyles: {
    display: {
      fontSize: '4xl',
      fontWeight: 'bold',
      lineHeight: 'tight',
      letterSpacing: -0.02,
    },
    heading: {
      fontSize: '3xl',
      fontWeight: 'bold',
      lineHeight: 'tight',
      letterSpacing: -0.01,
    },
    subheading: {
      fontSize: 'xl',
      fontWeight: 'semibold',
      lineHeight: 'normal',
    },
    title: {
      fontSize: 'lg',
      fontWeight: 'semibold',
      lineHeight: 'normal',
    },
    body: {
      fontSize: 'base',
      fontWeight: 'regular',
      lineHeight: 'normal',
    },
    caption: {
      fontSize: 'sm',
      fontWeight: 'regular',
      lineHeight: 'normal',
    },
    label: {
      fontSize: 'sm',
      fontWeight: 'medium',
      lineHeight: 'normal',
    },
    button: {
      fontSize: 'base',
      fontWeight: 'medium',
      lineHeight: 'normal',
    },
  },
};

// ==================== SPACING & LAYOUT SYSTEM ====================
export const SPACING = {
  // 8px base unit system
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
};

export const LAYOUT = {
  // Border radius
  borderRadius: {
    none: 0,
    sm: 2,
    base: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    full: 9999,
  },

  // Border widths
  borderWidth: {
    0: 0,
    1: 1,
    2: 2,
    4: 4,
    8: 8,
  },

  // Container max widths
  maxWidth: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Z-index scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    toast: 1700,
    tooltip: 1800,
  },
};

// ==================== ENTERPRISE THEME DEFINITIONS ====================
export const LIGHT_THEME = {
  id: 'light',
  name: 'Light',
  scheme: 'light',
  
  colors: {
    // Primary
    primary: COLOR_SYSTEM.primary[600],
    primaryLight: COLOR_SYSTEM.primary[400],
    primaryDark: COLOR_SYSTEM.primary[700],
    primaryBackground: COLOR_SYSTEM.primary[50],

    // Secondary
    secondary: COLOR_SYSTEM.secondary[600],
    secondaryLight: COLOR_SYSTEM.secondary[400],
    secondaryDark: COLOR_SYSTEM.secondary[700],
    secondaryBackground: COLOR_SYSTEM.secondary[50],

    // Background
    background: '#FFFFFF',
    backgroundElevated: '#F8FAFC',
    backgroundOverlay: 'rgba(0, 0, 0, 0.4)',
    backgroundModal: '#FFFFFF',

    // Surface
    surface: '#FFFFFF',
    surfacePrimary: COLOR_SYSTEM.primary[50],
    surfaceSecondary: COLOR_SYSTEM.secondary[50],
    surfaceTertiary: COLOR_SYSTEM.neutral[50],

    // Text
    text: COLOR_SYSTEM.neutral[900],
    textSecondary: COLOR_SYSTEM.neutral[600],
    textTertiary: COLOR_SYSTEM.neutral[400],
    textInverse: '#FFFFFF',
    textPlaceholder: COLOR_SYSTEM.neutral[400],

    // Border
    border: COLOR_SYSTEM.neutral[200],
    borderLight: COLOR_SYSTEM.neutral[100],
    borderDark: COLOR_SYSTEM.neutral[300],
    borderFocus: COLOR_SYSTEM.primary[500],

    // State
    disabled: COLOR_SYSTEM.neutral[300],
    disabledText: COLOR_SYSTEM.neutral[500],
    hover: COLOR_SYSTEM.neutral[100],
    pressed: COLOR_SYSTEM.neutral[200],
    selected: COLOR_SYSTEM.primary[100],

    // Semantic
    success: COLOR_SYSTEM.success[500],
    successLight: COLOR_SYSTEM.success[100],
    successDark: COLOR_SYSTEM.success[600],
    warning: COLOR_SYSTEM.warning[500],
    warningLight: COLOR_SYSTEM.warning[100],
    warningDark: COLOR_SYSTEM.warning[600],
    error: COLOR_SYSTEM.error[500],
    errorLight: COLOR_SYSTEM.error[100],
    errorDark: COLOR_SYSTEM.error[600],
    info: COLOR_SYSTEM.info[500],
    infoLight: COLOR_SYSTEM.info[100],
    infoDark: COLOR_SYSTEM.info[600],

    // Ethiopian market colors
    ...ETHIOPIAN_COLORS,
  },

  shadows: {
    sm: this.createShadow(0, 1, 2, 0.1),
    base: this.createShadow(0, 2, 4, 0.15),
    md: this.createShadow(0, 4, 6, 0.2),
    lg: this.createShadow(0, 8, 12, 0.25),
    xl: this.createShadow(0, 12, 16, 0.3),
  },

  opacity: {
    disabled: 0.5,
    hover: 0.8,
    pressed: 0.6,
    overlay: 0.4,
    subtle: 0.1,
  },
};

export const DARK_THEME = {
  id: 'dark',
  name: 'Dark',
  scheme: 'dark',
  
  colors: {
    // Primary
    primary: COLOR_SYSTEM.primary[400],
    primaryLight: COLOR_SYSTEM.primary[300],
    primaryDark: COLOR_SYSTEM.primary[500],
    primaryBackground: COLOR_SYSTEM.primary[950],

    // Secondary
    secondary: COLOR_SYSTEM.secondary[400],
    secondaryLight: COLOR_SYSTEM.secondary[300],
    secondaryDark: COLOR_SYSTEM.secondary[500],
    secondaryBackground: COLOR_SYSTEM.secondary[950],

    // Background
    background: COLOR_SYSTEM.neutral[950],
    backgroundElevated: COLOR_SYSTEM.neutral[900],
    backgroundOverlay: 'rgba(0, 0, 0, 0.7)',
    backgroundModal: COLOR_SYSTEM.neutral[900],

    // Surface
    surface: COLOR_SYSTEM.neutral[900],
    surfacePrimary: COLOR_SYSTEM.primary[950],
    surfaceSecondary: COLOR_SYSTEM.secondary[950],
    surfaceTertiary: COLOR_SYSTEM.neutral[800],

    // Text
    text: COLOR_SYSTEM.neutral[50],
    textSecondary: COLOR_SYSTEM.neutral[300],
    textTertiary: COLOR_SYSTEM.neutral[400],
    textInverse: COLOR_SYSTEM.neutral[900],
    textPlaceholder: COLOR_SYSTEM.neutral[500],

    // Border
    border: COLOR_SYSTEM.neutral[700],
    borderLight: COLOR_SYSTEM.neutral[600],
    borderDark: COLOR_SYSTEM.neutral[800],
    borderFocus: COLOR_SYSTEM.primary[400],

    // State
    disabled: COLOR_SYSTEM.neutral[700],
    disabledText: COLOR_SYSTEM.neutral[500],
    hover: COLOR_SYSTEM.neutral[700],
    pressed: COLOR_SYSTEM.neutral[600],
    selected: COLOR_SYSTEM.primary[800],

    // Semantic
    success: COLOR_SYSTEM.success[400],
    successLight: COLOR_SYSTEM.success[900],
    successDark: COLOR_SYSTEM.success[300],
    warning: COLOR_SYSTEM.warning[400],
    warningLight: COLOR_SYSTEM.warning[900],
    warningDark: COLOR_SYSTEM.warning[300],
    error: COLOR_SYSTEM.error[400],
    errorLight: COLOR_SYSTEM.error[900],
    errorDark: COLOR_SYSTEM.error[300],
    info: COLOR_SYSTEM.info[400],
    infoLight: COLOR_SYSTEM.info[900],
    infoDark: COLOR_SYSTEM.info[300],

    // Ethiopian market colors
    ...ETHIOPIAN_COLORS,
  },

  shadows: {
    sm: this.createShadow(0, 1, 2, 0.3),
    base: this.createShadow(0, 2, 4, 0.4),
    md: this.createShadow(0, 4, 6, 0.5),
    lg: this.createShadow(0, 8, 12, 0.6),
    xl: this.createShadow(0, 12, 16, 0.7),
  },

  opacity: {
    disabled: 0.4,
    hover: 0.7,
    pressed: 0.5,
    overlay: 0.6,
    subtle: 0.15,
  },
};

// ==================== ENTERPRISE THEME SERVICE ====================
export class ThemeService {
  /**
   * Create responsive value based on device size
   */
  static responsiveValue(phone, tablet, desktop) {
    const { width } = DEVICE_CONSTANTS.SCREEN;
    
    if (width >= DEVICE_CONSTANTS.BREAKPOINTS.xl) {
      return desktop;
    } else if (width >= DEVICE_CONSTANTS.BREAKPOINTS.lg) {
      return tablet;
    } else {
      return phone;
    }
  }

  /**
   * Create shadow object for cross-platform compatibility
   */
  static createShadow(x, y, blur, opacity, color = COLOR_SYSTEM.neutral[900]) {
    return {
      shadowColor: color,
      shadowOffset: {
        width: x,
        height: y,
      },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation: Math.max(x, y),
    };
  }

  /**
   * Get theme based on scheme and device
   */
  static getTheme(scheme = 'light') {
    const baseTheme = scheme === 'dark' ? DARK_THEME : LIGHT_THEME;
    
    return {
      ...baseTheme,
      typography: TYPOGRAPHY,
      spacing: SPACING,
      layout: LAYOUT,
      device: DEVICE_CONSTANTS,
      
      // Responsive values
      responsive: {
        padding: this.responsiveValue(SPACING[4], SPACING[6], SPACING[8]),
        margin: this.responsiveValue(SPACING[4], SPACING[6], SPACING[8]),
        containerMaxWidth: this.responsiveValue('100%', '90%', '80%'),
      },
    };
  }

  /**
   * Get color with opacity
   */
  static alpha(color, opacity) {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      let r, g, b;
      
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return color;
  }

  /**
   * Check if color is light for contrast calculation
   */
  static isLightColor(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  /**
   * Get contrast color for accessibility
   */
  static getContrastColor(backgroundColor) {
    return this.isLightColor(backgroundColor) 
      ? COLOR_SYSTEM.neutral[900] 
      : COLOR_SYSTEM.neutral[50];
  }

  /**
   * Generate gradient colors
   */
  static createGradient(colors, angle = 90) {
    return {
      background: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
      colors,
      angle,
    };
  }

  /**
   * Get font family based on language
   */
  static getFontFamily(language = 'en') {
    if (language === 'am') {
      return TYPOGRAPHY.fontFamily.ethiopic.regular;
    }
    return TYPOGRAPHY.fontFamily.primary.regular;
  }

  /**
   * Get text style with language support
   */
  static getTextStyle(style, language = 'en') {
    const textStyle = TYPOGRAPHY.textStyles[style] || TYPOGRAPHY.textStyles.body;
    return {
      ...textStyle,
      fontFamily: this.getFontFamily(language),
    };
  }
}

// ==================== COMPONENT THEMING ====================
export const COMPONENT_THEMES = {
  // Button variants
  button: {
    variants: {
      primary: {
        backgroundColor: 'colors.primary',
        borderColor: 'colors.primary',
        textColor: 'colors.textInverse',
        pressedColor: 'colors.primaryDark',
      },
      secondary: {
        backgroundColor: 'colors.secondary',
        borderColor: 'colors.secondary',
        textColor: 'colors.textInverse',
        pressedColor: 'colors.secondaryDark',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: 'colors.primary',
        borderWidth: 1,
        textColor: 'colors.primary',
        pressedColor: 'colors.primaryBackground',
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: 'colors.primary',
        pressedColor: 'colors.primaryBackground',
      },
      construction: {
        backgroundColor: ETHIOPIAN_COLORS.market.construction,
        borderColor: ETHIOPIAN_COLORS.market.construction,
        textColor: 'colors.textInverse',
        pressedColor: ThemeService.alpha(ETHIOPIAN_COLORS.market.construction, 0.8),
      },
    },
    
    sizes: {
      sm: {
        paddingVertical: SPACING[1.5],
        paddingHorizontal: SPACING[3],
        fontSize: TYPOGRAPHY.fontSize.sm,
        borderRadius: LAYOUT.borderRadius.md,
      },
      md: {
        paddingVertical: SPACING[2],
        paddingHorizontal: SPACING[4],
        fontSize: TYPOGRAPHY.fontSize.base,
        borderRadius: LAYOUT.borderRadius.lg,
      },
      lg: {
        paddingVertical: SPACING[3],
        paddingHorizontal: SPACING[6],
        fontSize: TYPOGRAPHY.fontSize.lg,
        borderRadius: LAYOUT.borderRadius.xl,
      },
    },
  },

  // Input variants
  input: {
    variants: {
      default: {
        backgroundColor: 'colors.background',
        borderColor: 'colors.border',
        textColor: 'colors.text',
        placeholderColor: 'colors.textPlaceholder',
        focusBorderColor: 'colors.borderFocus',
      },
      filled: {
        backgroundColor: 'colors.surfaceTertiary',
        borderColor: 'transparent',
        textColor: 'colors.text',
        placeholderColor: 'colors.textPlaceholder',
        focusBorderColor: 'colors.borderFocus',
      },
      flushed: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderBottomColor: 'colors.border',
        borderBottomWidth: 1,
        textColor: 'colors.text',
        placeholderColor: 'colors.textPlaceholder',
        focusBorderColor: 'colors.borderFocus',
      },
    },
  },

  // Card variants
  card: {
    variants: {
      elevated: {
        backgroundColor: 'colors.surface',
        borderRadius: LAYOUT.borderRadius.xl,
        shadow: 'shadows.base',
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: 'colors.surface',
        borderColor: 'colors.border',
        borderWidth: 1,
        borderRadius: LAYOUT.borderRadius.xl,
        shadow: 'shadows.none',
      },
      filled: {
        backgroundColor: 'colors.surfaceTertiary',
        borderRadius: LAYOUT.borderRadius.xl,
        borderWidth: 0,
        shadow: 'shadows.none',
      },
    },
  },
};

// ==================== ANIMATION CONFIGURATION ====================
export const ANIMATION = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    deliberate: 700,
  },
  
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  scale: {
    hover: 1.05,
    pressed: 0.95,
    focus: 1.02,
  },
};

// ==================== EXPORT CONFIGURATION ====================
export const THEME_CONFIG = {
  light: ThemeService.getTheme('light'),
  dark: ThemeService.getTheme('dark'),
  service: ThemeService,
  components: COMPONENT_THEMES,
  animation: ANIMATION,
  constants: {
    colors: COLOR_SYSTEM,
    ethiopian: ETHIOPIAN_COLORS,
    typography: TYPOGRAPHY,
    spacing: SPACING,
    layout: LAYOUT,
    device: DEVICE_CONSTANTS,
  },
};

// Default export
export default THEME_CONFIG;