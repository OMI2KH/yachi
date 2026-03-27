// constants/theme.js
/**
 * ENTERPRISE-LEVEL THEME SYSTEM FOR YACHI MOBILE APP
 * Ethiopian-inspired design system with comprehensive feature support
 * Complete consistency across all platform features
 */

import { Dimensions, Platform, StatusBar } from 'react-native';

// ==================== DEVICE CONSTANTS ====================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 0;

export const DEVICE = {
  // Screen dimensions
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  STATUS_BAR_HEIGHT,
  SAFE_AREA_INSETS: { top: 44, bottom: 34, left: 0, right: 0 },
  
  // Device size classification
  IS_SMALL_DEVICE: SCREEN_WIDTH < 375,
  IS_MEDIUM_DEVICE: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
  IS_LARGE_DEVICE: SCREEN_WIDTH >= 414,
  IS_EXTRA_LARGE_DEVICE: SCREEN_WIDTH >= 768,
  
  // Platform detection
  IS_IOS: Platform.OS === 'ios',
  IS_ANDROID: Platform.OS === 'android',
  IS_WEB: Platform.OS === 'web',
  
  // Platform-specific constants
  PLATFORM: {
    ios: {
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    web: {
      shadowOpacity: 0.1,
      shadowRadius: 6,
    }
  }
};

// ==================== DESIGN SYSTEM ====================
export const SPACING = {
  // Base 8pt grid system
  micro: 2,
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 40,
  xxxlarge: 48,
  massive: 64,
  giant: 80,
  
  // Component-specific spacing
  COMPONENT: {
    BUTTON: {
      TINY: 12,
      SMALL: 16,
      MEDIUM: 20,
      LARGE: 24,
    },
    INPUT: {
      VERTICAL: 12,
      HORIZONTAL: 16,
    },
    CARD: {
      PADDING: 16,
      MARGIN: 8,
    }
  }
};

export const BORDER_RADIUS = {
  none: 0,
  micro: 2,
  small: 4,
  medium: 8,
  large: 12,
  xlarge: 16,
  xxlarge: 20,
  pill: 24,
  circular: 9999,
  
  // Component-specific radii
  COMPONENT: {
    BUTTON: 8,
    INPUT: 8,
    CARD: 12,
    MODAL: 16,
    AVATAR: 8,
    BADGE: 4,
  }
};

// ==================== ETHIOPIAN COLOR SYSTEM ====================
export const COLORS = {
  // Primary Brand Colors - Ethiopian Flag Inspired
  PRIMARY: {
    50: '#FFF5F5',
    100: '#FED7D7',
    200: '#FEB2B2',
    300: '#FC8181',
    400: '#F56565',
    500: '#E30613', // Ethiopian Red - Main Brand
    600: '#C53030',
    700: '#9B2C2C',
    800: '#822727',
    900: '#63171B',
  },

  // Secondary Colors - Ethiopian Green
  SECONDARY: {
    50: '#F0FFF4',
    100: '#C6F6D5',
    200: '#9AE6B4',
    300: '#68D391',
    400: '#48BB78',
    500: '#078C17', // Ethiopian Green
    600: '#2F855A',
    700: '#276749',
    800: '#22543D',
    900: '#1C4532',
  },

  // Accent Colors - Ethiopian Yellow
  ACCENT: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Ethiopian Yellow
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Neutral Colors - Modern Gray Scale
  NEUTRAL: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    1000: '#000000',
  },

  // Semantic Colors - System States
  SEMANTIC: {
    SUCCESS: {
      light: '#DCFCE7',
      main: '#16A34A',
      dark: '#15803D',
      text: '#052E16',
    },
    WARNING: {
      light: '#FEF3C7',
      main: '#D97706',
      dark: '#92400E',
      text: '#451A03',
    },
    ERROR: {
      light: '#FEE2E2',
      main: '#DC2626',
      dark: '#B91C1C',
      text: '#450A0A',
    },
    INFO: {
      light: '#DBEAFE',
      main: '#2563EB',
      dark: '#1D4ED8',
      text: '#172554',
    },
  },

  // Feature-Specific Color Systems
  FEATURES: {
    // Payment Providers
    PAYMENT: {
      CHAPA: {
        primary: '#1E40AF',
        secondary: '#3B82F6',
        accent: '#60A5FA',
      },
      TELEBIRR: {
        primary: '#078C17',
        secondary: '#22C55E',
        accent: '#4ADE80',
      },
      CBE_BIRR: {
        primary: '#DC2626',
        secondary: '#EF4444',
        accent: '#F87171',
      },
    },

    // Construction Industry
    CONSTRUCTION: {
      PLANNING: '#3B82F6',
      ACTIVE: '#F59E0B',
      ON_HOLD: '#6B7280',
      COMPLETED: '#16A34A',
      CANCELLED: '#DC2626',
      MATERIALS: {
        concrete: '#A8A29E',
        steel: '#475569',
        wood: '#7C2D12',
        electrical: '#F59E0B',
        plumbing: '#0EA5E9',
      }
    },

    // User Roles & Verification
    USER: {
      CLIENT: '#3B82F6',
      PROVIDER: '#078C17',
      GOVERNMENT: '#DC2626',
      ADMIN: '#7C3AED',
      VERIFIED: '#16A34A',
      PREMIUM: '#F59E0B',
    },

    // AI & Technology
    AI: {
      PRIMARY: '#7C3AED',
      SECONDARY: '#8B5CF6',
      ACCENT: '#A78BFA',
      NEURAL: '#C084FC',
    },

    // Gamification & Engagement
    GAMIFICATION: {
      BRONZE: '#92400E',
      SILVER: '#6B7280',
      GOLD: '#F59E0B',
      PLATINUM: '#10B981',
      DIAMOND: '#3B82F6',
    },
  },

  // Ethiopian Regional Colors
  REGIONAL: {
    ADDIS_ABABA: '#E30613', // Red
    OROMIA: '#078C17', // Green
    AMHARA: '#1E40AF', // Blue
    TIGRAY: '#7C2D12', // Brown
    SOMALI: '#F59E0B', // Yellow
    AFAR: '#DC2626', // Dark Red
    SIDAMA: '#16A34A', // Light Green
    SOUTHERN: '#059669', // Teal
    GAMBELLA: '#D97706', // Orange
    BENISHANGUL: '#7C3AED', // Purple
    HARARI: '#6B7280', // Gray
    DIRE_DAWA: '#0EA5E9', // Sky Blue
  },
};

// ==================== TYPOGRAPHY SYSTEM ====================
export const TYPOGRAPHY = {
  // Font Families
  FONT_FAMILY: {
    PRIMARY: {
      LIGHT: 'Inter-Light',
      REGULAR: 'Inter-Regular',
      MEDIUM: 'Inter-Medium',
      SEMIBOLD: 'Inter-SemiBold',
      BOLD: 'Inter-Bold',
    },
    ETHIOPIC: {
      REGULAR: 'Ethiopia-Jiret',
      BOLD: 'Ethiopia-Jiret-Bold',
    },
    MONOSPACE: 'JetBrainsMono-Regular',
  },

  // Font Sizes - Scalable System
  FONT_SIZE: {
    MICRO: 10,
    TINY: 12,
    SMALL: 14,
    BASE: 16,
    MEDIUM: 18,
    LARGE: 20,
    XLARGE: 24,
    XXLARGE: 28,
    XXXLARGE: 32,
    DISPLAY: 36,
    HERO: 48,
  },

  // Line Heights
  LINE_HEIGHT: {
    TIGHT: 1.2,
    SNUG: 1.3,
    NORMAL: 1.5,
    RELAXED: 1.75,
    LOOSE: 2,
  },

  // Font Weights
  FONT_WEIGHT: {
    LIGHT: '300',
    REGULAR: '400',
    MEDIUM: '500',
    SEMIBOLD: '600',
    BOLD: '700',
    EXTRABOLD: '800',
  },

  // Text Styles - Component Ready
  STYLES: {
    DISPLAY: {
      fontSize: 36,
      lineHeight: 40,
      fontWeight: '700',
    },
    HEADING: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600',
    },
    SUBHEADING: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
    },
    TITLE: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '500',
    },
    BODY: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
    },
    CAPTION: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
    },
    LABEL: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
    },
    MICRO: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '400',
    },
  },
};

// ==================== SHADOW SYSTEM ====================
export const SHADOWS = {
  NONE: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  SMALL: {
    shadowColor: COLORS.NEUTRAL[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  MEDIUM: {
    shadowColor: COLORS.NEUTRAL[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  LARGE: {
    shadowColor: COLORS.NEUTRAL[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  XLARGE: {
    shadowColor: COLORS.NEUTRAL[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  PREMIUM: {
    shadowColor: COLORS.ACCENT[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

// ==================== ANIMATION SYSTEM ====================
export const ANIMATION = {
  DURATION: {
    INSTANT: 100,
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
    DELIBERATE: 700,
  },
  EASING: {
    LINEAR: [0, 0, 1, 1],
    EASE: [0.25, 0.1, 0.25, 1],
    EASE_IN: [0.42, 0, 1, 1],
    EASE_OUT: [0, 0, 0.58, 1],
    EASE_IN_OUT: [0.42, 0, 0.58, 1],
    SPRING: [0.5, 1, 0.89, 1],
  },
  CONFIG: {
    QUICK_SPRING: {
      damping: 20,
      mass: 1,
      stiffness: 300,
      overshootClamping: false,
    },
    SMOOTH_SPRING: {
      damping: 30,
      mass: 1,
      stiffness: 200,
      overshootClamping: false,
    },
  },
};

// ==================== Z-INDEX SYSTEM ====================
export const Z_INDEX = {
  HIDDEN: -1,
  BASE: 0,
  ELEVATED: 10,
  OVERLAY: 100,
  MODAL: 1000,
  TOAST: 2000,
  TOOLTIP: 3000,
  MAX: 9999,
};

// ==================== COMPONENT THEMES ====================
export const COMPONENT_THEMES = {
  // Button Theme System
  BUTTON: {
    VARIANTS: {
      PRIMARY: {
        backgroundColor: COLORS.PRIMARY[500],
        borderColor: COLORS.PRIMARY[500],
        textColor: COLORS.NEUTRAL[0],
        pressedBackground: COLORS.PRIMARY[600],
        disabledBackground: COLORS.NEUTRAL[300],
        disabledText: COLORS.NEUTRAL[500],
      },
      SECONDARY: {
        backgroundColor: COLORS.SECONDARY[500],
        borderColor: COLORS.SECONDARY[500],
        textColor: COLORS.NEUTRAL[0],
        pressedBackground: COLORS.SECONDARY[600],
        disabledBackground: COLORS.NEUTRAL[300],
        disabledText: COLORS.NEUTRAL[500],
      },
      OUTLINE: {
        backgroundColor: 'transparent',
        borderColor: COLORS.NEUTRAL[300],
        textColor: COLORS.NEUTRAL[700],
        pressedBackground: COLORS.NEUTRAL[100],
        disabledBackground: 'transparent',
        disabledText: COLORS.NEUTRAL[400],
      },
      GHOST: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: COLORS.PRIMARY[500],
        pressedBackground: COLORS.PRIMARY[50],
        disabledBackground: 'transparent',
        disabledText: COLORS.NEUTRAL[400],
      },
      PREMIUM: {
        backgroundColor: COLORS.ACCENT[500],
        borderColor: COLORS.ACCENT[500],
        textColor: COLORS.NEUTRAL[0],
        pressedBackground: COLORS.ACCENT[600],
        disabledBackground: COLORS.NEUTRAL[300],
        disabledText: COLORS.NEUTRAL[500],
      },
    },
    SIZES: {
      SMALL: {
        height: 36,
        paddingHorizontal: SPACING.medium,
        fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
      },
      MEDIUM: {
        height: 44,
        paddingHorizontal: SPACING.large,
        fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      },
      LARGE: {
        height: 52,
        paddingHorizontal: SPACING.xlarge,
        fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
      },
    },
  },

  // Input Theme System
  INPUT: {
    VARIANTS: {
      DEFAULT: {
        backgroundColor: COLORS.NEUTRAL[0],
        borderColor: COLORS.NEUTRAL[300],
        textColor: COLORS.NEUTRAL[800],
        placeholderColor: COLORS.NEUTRAL[500],
        focusedBorderColor: COLORS.PRIMARY[500],
        errorBorderColor: COLORS.SEMANTIC.ERROR.main,
      },
      FILLED: {
        backgroundColor: COLORS.NEUTRAL[100],
        borderColor: 'transparent',
        textColor: COLORS.NEUTRAL[800],
        placeholderColor: COLORS.NEUTRAL[500],
        focusedBorderColor: COLORS.PRIMARY[500],
        errorBorderColor: COLORS.SEMANTIC.ERROR.main,
      },
    },
    SIZES: {
      SMALL: {
        height: 40,
        paddingHorizontal: SPACING.medium,
        fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
      },
      MEDIUM: {
        height: 48,
        paddingHorizontal: SPACING.large,
        fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      },
      LARGE: {
        height: 56,
        paddingHorizontal: SPACING.xlarge,
        fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
      },
    },
  },

  // Card Theme System
  CARD: {
    VARIANTS: {
      ELEVATED: {
        backgroundColor: COLORS.NEUTRAL[0],
        borderColor: 'transparent',
        shadow: SHADOWS.MEDIUM,
      },
      OUTLINE: {
        backgroundColor: COLORS.NEUTRAL[0],
        borderColor: COLORS.NEUTRAL[200],
        shadow: SHADOWS.NONE,
      },
      FILLED: {
        backgroundColor: COLORS.NEUTRAL[50],
        borderColor: 'transparent',
        shadow: SHADOWS.NONE,
      },
      PREMIUM: {
        backgroundColor: COLORS.NEUTRAL[0],
        borderColor: COLORS.ACCENT[300],
        shadow: SHADOWS.PREMIUM,
      },
    },
  },
};

// ==================== FEATURE-SPECIFIC THEMES ====================
export const FEATURE_THEMES = {
  // AI Construction Management
  CONSTRUCTION: {
    STATUS: {
      PLANNING: {
        color: COLORS.FEATURES.CONSTRUCTION.PLANNING,
        backgroundColor: '#DBEAFE',
        textColor: '#1E40AF',
      },
      ACTIVE: {
        color: COLORS.FEATURES.CONSTRUCTION.ACTIVE,
        backgroundColor: '#FEF3C7',
        textColor: '#92400E',
      },
      ON_HOLD: {
        color: COLORS.FEATURES.CONSTRUCTION.ON_HOLD,
        backgroundColor: '#F3F4F6',
        textColor: '#374151',
      },
      COMPLETED: {
        color: COLORS.FEATURES.CONSTRUCTION.COMPLETED,
        backgroundColor: '#DCFCE7',
        textColor: '#166534',
      },
      CANCELLED: {
        color: COLORS.FEATURES.CONSTRUCTION.CANCELLED,
        backgroundColor: '#FEE2E2',
        textColor: '#991B1B',
      },
    },
    WORKER_TYPES: {
      ENGINEER: { color: COLORS.REGIONAL.AMHARA, backgroundColor: '#DBEAFE' },
      ARCHITECT: { color: COLORS.REGIONAL.OROMIA, backgroundColor: '#DCFCE7' },
      PLUMBER: { color: COLORS.FEATURES.CONSTRUCTION.MATERIALS.plumbing, backgroundColor: '#E0F2FE' },
      ELECTRICIAN: { color: COLORS.FEATURES.CONSTRUCTION.MATERIALS.electrical, backgroundColor: '#FEF3C7' },
      CARPENTER: { color: COLORS.FEATURES.CONSTRUCTION.MATERIALS.wood, backgroundColor: '#FEF7CD' },
      MASON: { color: COLORS.NEUTRAL[600], backgroundColor: '#F3F4F6' },
      PAINTER: { color: '#8B5CF6', backgroundColor: '#F3E8FF' },
      STEEL_FIXER: { color: COLORS.FEATURES.CONSTRUCTION.MATERIALS.steel, backgroundColor: '#F1F5F9' },
      TILER: { color: COLORS.PRIMARY[500], backgroundColor: '#FEE2E2' },
      LABORER: { color: COLORS.NEUTRAL[500], backgroundColor: '#F9FAFB' },
      FOREMAN: { color: '#B45309', backgroundColor: '#FEF7CD' },
      PROJECT_MANAGER: { color: '#1E40AF', backgroundColor: '#DBEAFE' },
    },
  },

  // Premium Features
  PREMIUM: {
    BADGE: {
      color: COLORS.ACCENT[500],
      backgroundColor: '#FFFBEB',
      borderColor: COLORS.ACCENT[300],
      glow: SHADOWS.PREMIUM,
    },
    LISTING: {
      backgroundColor: '#FFFBEB',
      borderColor: COLORS.ACCENT[300],
      accentColor: COLORS.ACCENT[500],
    },
    SUBSCRIPTION: {
      TIER_1: { color: COLORS.ACCENT[500], name: 'Basic' },
      TIER_2: { color: COLORS.SECONDARY[500], name: 'Professional' },
      TIER_3: { color: COLORS.PRIMARY[500], name: 'Enterprise' },
    },
  },

  // Payment System
  PAYMENT: {
    PROVIDERS: {
      CHAPA: {
        primary: COLORS.FEATURES.PAYMENT.CHAPA.primary,
        secondary: COLORS.FEATURES.PAYMENT.CHAPA.secondary,
        accent: COLORS.FEATURES.PAYMENT.CHAPA.accent,
      },
      TELEBIRR: {
        primary: COLORS.FEATURES.PAYMENT.TELEBIRR.primary,
        secondary: COLORS.FEATURES.PAYMENT.TELEBIRR.secondary,
        accent: COLORS.FEATURES.PAYMENT.TELEBIRR.accent,
      },
      CBE_BIRR: {
        primary: COLORS.FEATURES.PAYMENT.CBE_BIRR.primary,
        secondary: COLORS.FEATURES.PAYMENT.CBE_BIRR.secondary,
        accent: COLORS.FEATURES.PAYMENT.CBE_BIRR.accent,
      },
    },
  },

  // User Management
  USER: {
    ROLES: {
      CLIENT: {
        color: COLORS.FEATURES.USER.CLIENT,
        backgroundColor: '#DBEAFE',
      },
      PROVIDER: {
        color: COLORS.FEATURES.USER.PROVIDER,
        backgroundColor: '#DCFCE7',
      },
      GOVERNMENT: {
        color: COLORS.FEATURES.USER.GOVERNMENT,
        backgroundColor: '#FEE2E2',
      },
      ADMIN: {
        color: COLORS.FEATURES.USER.ADMIN,
        backgroundColor: '#F3E8FF',
      },
    },
    VERIFICATION: {
      PENDING: { color: COLORS.SEMANTIC.WARNING.main, backgroundColor: '#FEF3C7' },
      VERIFIED: { color: COLORS.FEATURES.USER.VERIFIED, backgroundColor: '#DCFCE7' },
      REJECTED: { color: COLORS.SEMANTIC.ERROR.main, backgroundColor: '#FEE2E2' },
    },
  },

  // Gamification System
  GAMIFICATION: {
    LEVELS: {
      BRONZE: { color: COLORS.FEATURES.GAMIFICATION.BRONZE, name: 'Bronze' },
      SILVER: { color: COLORS.FEATURES.GAMIFICATION.SILVER, name: 'Silver' },
      GOLD: { color: COLORS.FEATURES.GAMIFICATION.GOLD, name: 'Gold' },
      PLATINUM: { color: COLORS.FEATURES.GAMIFICATION.PLATINUM, name: 'Platinum' },
      DIAMOND: { color: COLORS.FEATURES.GAMIFICATION.DIAMOND, name: 'Diamond' },
    },
    ACHIEVEMENTS: {
      COMPLETED_PROJECTS: COLORS.SECONDARY[500],
      POSITIVE_REVIEWS: COLORS.ACCENT[500],
      PREMIUM_MEMBER: COLORS.PRIMARY[500],
      FAST_RESPONSE: COLORS.FEATURES.AI.PRIMARY,
    },
  },
};

// ==================== THEME PRESETS ====================
export const THEME_PRESETS = {
  LIGHT: {
    colors: {
      // Background
      background: {
        primary: COLORS.NEUTRAL[0],
        secondary: COLORS.NEUTRAL[50],
        tertiary: COLORS.NEUTRAL[100],
      },
      // Surface
      surface: {
        primary: COLORS.NEUTRAL[0],
        secondary: COLORS.NEUTRAL[50],
        tertiary: COLORS.NEUTRAL[100],
      },
      // Text
      text: {
        primary: COLORS.NEUTRAL[900],
        secondary: COLORS.NEUTRAL[700],
        tertiary: COLORS.NEUTRAL[500],
        inverse: COLORS.NEUTRAL[0],
        disabled: COLORS.NEUTRAL[400],
      },
      // Border
      border: {
        primary: COLORS.NEUTRAL[200],
        secondary: COLORS.NEUTRAL[300],
        focused: COLORS.PRIMARY[500],
        error: COLORS.SEMANTIC.ERROR.main,
      },
      // Status
      status: COLORS.SEMANTIC,
      // Overlay
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    shadows: SHADOWS,
    components: COMPONENT_THEMES,
  },

  DARK: {
    colors: {
      // Background
      background: {
        primary: COLORS.NEUTRAL[900],
        secondary: COLORS.NEUTRAL[800],
        tertiary: COLORS.NEUTRAL[700],
      },
      // Surface
      surface: {
        primary: COLORS.NEUTRAL[800],
        secondary: COLORS.NEUTRAL[700],
        tertiary: COLORS.NEUTRAL[600],
      },
      // Text
      text: {
        primary: COLORS.NEUTRAL[50],
        secondary: COLORS.NEUTRAL[200],
        tertiary: COLORS.NEUTRAL[400],
        inverse: COLORS.NEUTRAL[900],
        disabled: COLORS.NEUTRAL[500],
      },
      // Border
      border: {
        primary: COLORS.NEUTRAL[600],
        secondary: COLORS.NEUTRAL[700],
        focused: COLORS.PRIMARY[400],
        error: COLORS.SEMANTIC.ERROR.light,
      },
      // Status
      status: {
        SUCCESS: { ...COLORS.SEMANTIC.SUCCESS, main: COLORS.SEMANTIC.SUCCESS.light },
        WARNING: { ...COLORS.SEMANTIC.WARNING, main: COLORS.SEMANTIC.WARNING.light },
        ERROR: { ...COLORS.SEMANTIC.ERROR, main: COLORS.SEMANTIC.ERROR.light },
        INFO: { ...COLORS.SEMANTIC.INFO, main: COLORS.SEMANTIC.INFO.light },
      },
      // Overlay
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    shadows: {
      ...SHADOWS,
      SMALL: { ...SHADOWS.SMALL, shadowColor: COLORS.NEUTRAL[1000] },
      MEDIUM: { ...SHADOWS.MEDIUM, shadowColor: COLORS.NEUTRAL[1000] },
      LARGE: { ...SHADOWS.LARGE, shadowColor: COLORS.NEUTRAL[1000] },
      XLARGE: { ...SHADOWS.XLARGE, shadowColor: COLORS.NEUTRAL[1000] },
    },
    components: COMPONENT_THEMES,
  },
};

// ==================== UTILITY FUNCTIONS ====================
export const ThemeUtils = {
  // Color manipulation
  hexToRgba: (hex, alpha = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // Feature-specific color getters
  getFeatureColor: (feature, type, variant = 'primary') => {
    const featureMap = {
      construction: FEATURE_THEMES.CONSTRUCTION,
      premium: FEATURE_THEMES.PREMIUM,
      payment: FEATURE_THEMES.PAYMENT,
      user: FEATURE_THEMES.USER,
      gamification: FEATURE_THEMES.GAMIFICATION,
    };

    return featureMap[feature]?.[type]?.[variant]?.color || COLORS.PRIMARY[500];
  },

  getWorkerTypeColor: (workerType) => 
    FEATURE_THEMES.CONSTRUCTION.WORKER_TYPES[workerType]?.color || COLORS.NEUTRAL[500],

  getProjectStatusColor: (status) => 
    FEATURE_THEMES.CONSTRUCTION.STATUS[status]?.color || COLORS.NEUTRAL[500],

  getPaymentProviderColor: (provider) => 
    FEATURE_THEMES.PAYMENT.PROVIDERS[provider]?.primary || COLORS.PRIMARY[500],

  getUserRoleColor: (role) => 
    FEATURE_THEMES.USER.ROLES[role]?.color || COLORS.NEUTRAL[500],

  // Responsive helpers
  responsiveValue: (values) => {
    if (DEVICE.IS_SMALL_DEVICE) return values.small || values.medium || values.large;
    if (DEVICE.IS_MEDIUM_DEVICE) return values.medium || values.large || values.small;
    if (DEVICE.IS_LARGE_DEVICE) return values.large || values.medium || values.small;
    return values.large || values.medium || values.small;
  },

  // Platform-specific styling
  platformStyle: (styles) => ({
    ...styles.base,
    ...(DEVICE.IS_IOS && styles.ios),
    ...(DEVICE.IS_ANDROID && styles.android),
    ...(DEVICE.IS_WEB && styles.web),
  }),
};

// ==================== DEFAULT EXPORTS ====================
export const DEFAULT_THEME = THEME_PRESETS.LIGHT;
export const CURRENT_THEME = DEFAULT_THEME;

export default {
  // Core Systems
  DEVICE,
  SPACING,
  BORDER_RADIUS,
  COLORS,
  TYPOGRAPHY,
  SHADOWS,
  ANIMATION,
  Z_INDEX,

  // Component Systems
  COMPONENT_THEMES,

  // Feature Systems
  FEATURE_THEMES,

  // Theme Presets
  THEME_PRESETS,
  DEFAULT_THEME,
  CURRENT_THEME,

  // Utilities
  ThemeUtils,
};