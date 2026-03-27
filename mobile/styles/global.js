// styles/global.js

import { Dimensions, Platform, StatusBar } from 'react-native';

/**
 * Enterprise-level Global Styles System
 * Comprehensive design system for Yachi with Ethiopian market considerations
 */

// Device and Platform Constants
const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const isTablet = width >= 768;
const isSmallDevice = width < 375;

// Status Bar Height
const STATUS_BAR_HEIGHT = Platform.select({
  ios: isIOS ? 44 : 0,
  android: StatusBar.currentHeight || 24,
  default: 0
});

// Header Height
const HEADER_HEIGHT = Platform.select({
  ios: 44 + STATUS_BAR_HEIGHT,
  android: 56 + STATUS_BAR_HEIGHT,
  default: 64
});

// Bottom Tab Bar Height
const BOTTOM_TAB_BAR_HEIGHT = Platform.select({
  ios: 83, // Includes home indicator
  android: 60,
  default: 60
});

// Ethiopian Market Specific Colors
export const ETHIOPIAN_COLORS = {
  // National Colors
  flagGreen: '#078930',
  flagYellow: '#FCDD09',
  flagRed: '#DA121A',
  
  // Traditional Colors
  traditionalBlue: '#2E5CAC',
  traditionalGold: '#D4AF37',
  traditionalRed: '#8B0000',
  
  // Earth Tones (Ethiopian landscape)
  earthBrown: '#8B4513',
  highlandGreen: '#2E8B57',
  desertOrange: '#FF8C00',
  skyBlue: '#1E90FF'
};

// Primary Color Palette
export const COLORS = {
  // Primary Brand Colors
  primary: {
    50: '#E6F3FF',
    100: '#CCE7FF',
    200: '#99CFFF',
    300: '#66B8FF',
    400: '#339FFF',
    500: '#0088FF', // Main primary
    600: '#006ACC',
    700: '#004D99',
    800: '#003366',
    900: '#001A33'
  },

  // Secondary Colors
  secondary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // Main secondary
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E'
  },

  // Success Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E', // Main success
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D'
  },

  // Warning Colors
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Main warning
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F'
  },

  // Error Colors
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Main error
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D'
  },

  // Neutral Colors
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B'
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    inverse: '#0F172A'
  },

  // Text Colors
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    inverse: '#FFFFFF',
    disabled: '#94A3B8'
  },

  // Border Colors
  border: {
    light: '#E2E8F0',
    default: '#CBD5E1',
    dark: '#94A3B8',
    focus: '#0088FF'
  },

  // Ethiopian Market Integration
  ethiopian: ETHIOPIAN_COLORS,

  // Semantic Colors
  semantic: {
    construction: '#F59E0B',
    government: '#0EA5E9',
    premium: '#D4AF37',
    verified: '#22C55E',
    emergency: '#EF4444',
    featured: '#8B5CF6'
  }
};

// Typography Scale
export const TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    primary: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      semiBold: 'Inter-SemiBold',
      bold: 'Inter-Bold'
    },
    ethiopian: {
      amharic: 'NotoSansEthiopic-Regular',
      oromo: 'NotoSansEthiopic-Regular' // Would need Oromo-specific font
    },
    monospace: 'JetBrainsMono-Regular'
  },

  // Font Sizes (Scalable)
  fontSize: {
    xs: isSmallDevice ? 10 : 12,
    sm: isSmallDevice ? 12 : 14,
    base: isSmallDevice ? 14 : 16,
    lg: isSmallDevice ? 16 : 18,
    xl: isSmallDevice ? 18 : 20,
    '2xl': isSmallDevice ? 20 : 24,
    '3xl': isSmallDevice ? 24 : 30,
    '4xl': isSmallDevice ? 30 : 36,
    '5xl': isSmallDevice ? 36 : 48
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  },

  // Letter Spacing
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1
  },

  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800'
  }
};

// Spacing Scale (8pt grid system)
export const SPACING = {
  // Fixed Spacing
  px: 1,
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
  '36': 144,
  '40': 160,
  '44': 176,
  '48': 192,
  '52': 208,
  '56': 224,
  '60': 240,
  '64': 256,
  '72': 288,
  '80': 320,
  '96': 384,

  // Semantic Spacing
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
  elementGap: 16,
  inputPadding: 12
};

// Border Radius Scale
export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999
};

// Shadow System
export const SHADOWS = {
  // Elevation-based shadows
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  xs: {
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  sm: {
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  default: {
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  md: {
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4
  },
  lg: {
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6
  },
  xl: {
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8
  },
  '2xl': {
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12
  },

  // Specialized shadows
  inner: {
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2
  },
  outline: {
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 2
  }
};

// Layout and Dimensions
export const LAYOUT = {
  // Screen Dimensions
  screen: {
    width,
    height,
    safeWidth: width - (SPACING.screenPadding * 2),
    safeHeight: height - HEADER_HEIGHT - BOTTOM_TAB_BAR_HEIGHT
  },

  // Header
  header: {
    height: HEADER_HEIGHT,
    paddingHorizontal: SPACING.screenPadding
  },

  // Bottom Tab Bar
  bottomTabBar: {
    height: BOTTOM_TAB_BAR_HEIGHT,
    paddingHorizontal: SPACING.screenPadding
  },

  // Card Dimensions
  card: {
    default: {
      padding: SPACING.cardPadding,
      borderRadius: BORDER_RADIUS.default
    },
    elevated: {
      padding: SPACING.cardPadding,
      borderRadius: BORDER_RADIUS.lg
    }
  },

  // Button Dimensions
  button: {
    height: {
      sm: 32,
      default: 44,
      lg: 52
    },
    padding: {
      sm: { horizontal: SPACING[3], vertical: SPACING[1] },
      default: { horizontal: SPACING[4], vertical: SPACING[2] },
      lg: { horizontal: SPACING[5], vertical: SPACING[3] }
    }
  },

  // Input Dimensions
  input: {
    height: {
      sm: 36,
      default: 44,
      lg: 52
    },
    padding: {
      horizontal: SPACING.inputPadding,
      vertical: SPACING[2]
    }
  },

  // Icon Sizes
  icon: {
    xs: 12,
    sm: 16,
    default: 20,
    md: 24,
    lg: 28,
    xl: 32,
    '2xl': 40,
    '3xl': 48
  }
};

// Animation and Transition Values
export const ANIMATION = {
  // Durations
  duration: {
    fastest: 100,
    faster: 150,
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 700,
    slowest: 1000
  },

  // Timing Functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)'
  },

  // Spring Configurations
  spring: {
    default: {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2
    },
    gentle: {
      damping: 15,
      mass: 1,
      stiffness: 80,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2
    },
    quick: {
      damping: 25,
      mass: 1,
      stiffness: 150,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2
    }
  }
};

// Z-Index Scale
export const Z_INDEX = {
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
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800
};

// Breakpoints for Responsive Design
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Ethiopian Market Specific Styles
export const ETHIOPIAN_STYLES = {
  // Traditional Patterns and Borders
  patterns: {
    ethiopianBorder: {
      borderWidth: 2,
      borderColor: COLORS.ethiopian.traditionalGold,
      borderRadius: BORDER_RADIUS.md
    },
    crossPattern: {
      backgroundColor: COLORS.ethiopian.traditionalRed,
      opacity: 0.1
    }
  },

  // Ethiopian Holiday Colors
  holidays: {
    enkutatash: {
      primary: COLORS.ethiopian.flagGreen,
      secondary: COLORS.ethiopian.flagYellow,
      accent: COLORS.ethiopian.traditionalGold
    },
    timkat: {
      primary: COLORS.ethiopian.traditionalBlue,
      secondary: COLORS.ethiopian.flagYellow,
      accent: COLORS.primary[500]
    },
    meskel: {
      primary: COLORS.ethiopian.flagRed,
      secondary: COLORS.ethiopian.flagYellow,
      accent: COLORS.warning[500]
    }
  },

  // Regional Color Variations
  regions: {
    addisAbaba: COLORS.primary[500],
    oromia: COLORS.ethiopian.highlandGreen,
    amhara: COLORS.ethiopian.traditionalRed,
    tigray: COLORS.ethiopian.earthBrown,
    somali: COLORS.ethiopian.skyBlue,
    afar: COLORS.ethiopian.desertOrange
  }
};

// Component-Specific Style Presets
export const PRESETS = {
  // Button Presets
  button: {
    primary: {
      backgroundColor: COLORS.primary[500],
      borderColor: COLORS.primary[500],
      textColor: COLORS.text.inverse
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: COLORS.primary[500],
      textColor: COLORS.primary[500]
    },
    success: {
      backgroundColor: COLORS.success[500],
      borderColor: COLORS.success[500],
      textColor: COLORS.text.inverse
    },
    warning: {
      backgroundColor: COLORS.warning[500],
      borderColor: COLORS.warning[500],
      textColor: COLORS.text.inverse
    },
    error: {
      backgroundColor: COLORS.error[500],
      borderColor: COLORS.error[500],
      textColor: COLORS.text.inverse
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: COLORS.text.primary
    }
  },

  // Card Presets
  card: {
    default: {
      backgroundColor: COLORS.background.primary,
      borderColor: COLORS.border.light,
      borderRadius: BORDER_RADIUS.default,
      padding: SPACING.cardPadding,
      ...SHADOWS.sm
    },
    elevated: {
      backgroundColor: COLORS.background.primary,
      borderColor: COLORS.border.light,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.cardPadding,
      ...SHADOWS.default
    },
    filled: {
      backgroundColor: COLORS.background.secondary,
      borderColor: 'transparent',
      borderRadius: BORDER_RADIUS.default,
      padding: SPACING.cardPadding
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: COLORS.border.default,
      borderRadius: BORDER_RADIUS.default,
      padding: SPACING.cardPadding,
      borderWidth: 1
    }
  },

  // Input Presets
  input: {
    default: {
      backgroundColor: COLORS.background.primary,
      borderColor: COLORS.border.default,
      borderRadius: BORDER_RADIUS.default,
      padding: SPACING.inputPadding,
      borderWidth: 1,
      height: LAYOUT.input.height.default
    },
    focused: {
      backgroundColor: COLORS.background.primary,
      borderColor: COLORS.border.focus,
      borderRadius: BORDER_RADIUS.default,
      padding: SPACING.inputPadding,
      borderWidth: 2,
      height: LAYOUT.input.height.default
    },
    error: {
      backgroundColor: COLORS.background.primary,
      borderColor: COLORS.error[500],
      borderRadius: BORDER_RADIUS.default,
      padding: SPACING.inputPadding,
      borderWidth: 1,
      height: LAYOUT.input.height.default
    },
    disabled: {
      backgroundColor: COLORS.background.secondary,
      borderColor: COLORS.border.light,
      borderRadius: BORDER_RADIUS.default,
      padding: SPACING.inputPadding,
      borderWidth: 1,
      height: LAYOUT.input.height.default
    }
  },

  // Badge Presets
  badge: {
    default: {
      backgroundColor: COLORS.neutral[100],
      textColor: COLORS.neutral[700],
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[2],
      paddingVertical: SPACING[0.5]
    },
    success: {
      backgroundColor: COLORS.success[100],
      textColor: COLORS.success[700],
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[2],
      paddingVertical: SPACING[0.5]
    },
    warning: {
      backgroundColor: COLORS.warning[100],
      textColor: COLORS.warning[700],
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[2],
      paddingVertical: SPACING[0.5]
    },
    error: {
      backgroundColor: COLORS.error[100],
      textColor: COLORS.error[700],
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[2],
      paddingVertical: SPACING[0.5]
    },
    premium: {
      backgroundColor: COLORS.ethiopian.traditionalGold,
      textColor: COLORS.text.inverse,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[2],
      paddingVertical: SPACING[0.5]
    }
  }
};

// Accessibility Settings
export const ACCESSIBILITY = {
  // Minimum touch target size
  minTouchSize: 44,

  // Focus ring styles
  focusRing: {
    borderWidth: 2,
    borderColor: COLORS.primary[500],
    borderRadius: BORDER_RADIUS.sm
  },

  // High contrast mode adjustments
  highContrast: {
    borderWidth: 2,
    borderColor: COLORS.text.primary,
    backgroundColor: COLORS.background.primary
  },

  // Reduced motion preferences
  reducedMotion: {
    animationDuration: 0,
    transitionDuration: 0
  }
};

// Export all constants
export default {
  // Core Systems
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  LAYOUT,
  ANIMATION,
  Z_INDEX,
  BREAKPOINTS,

  // Market Specific
  ETHIOPIAN_COLORS,
  ETHIOPIAN_STYLES,

  // Component Presets
  PRESETS,

  // Accessibility
  ACCESSIBILITY,

  // Device Constants
  isIOS,
  isAndroid,
  isTablet,
  isSmallDevice,
  width,
  height,
  STATUS_BAR_HEIGHT,
  HEADER_HEIGHT,
  BOTTOM_TAB_BAR_HEIGHT
};