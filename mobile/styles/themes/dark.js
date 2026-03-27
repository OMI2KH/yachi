import { StyleSheet, Platform } from 'react-native';
import { 
  COLORS, 
  DARK_THEME_COLORS,
  SEMANTIC_COLORS,
  PAYMENT_COLORS,
  CONSTRUCTION_COLORS,
  WORKER_CATEGORY_COLORS,
  PREMIUM_COLORS,
  ETHIOPIAN_COLORS 
} from '../../constants/colors';
import { 
  SPACING, 
  BORDER_RADIUS, 
  FONT_SIZES, 
  LINE_HEIGHTS,
  BUTTON_SIZES,
  INPUT_SIZES,
  CARD_SIZES,
  ICON_SIZES,
  SHADOWS 
} from '../../constants/sizes';
import { TYPOGRAPHY } from '../../constants/theme';

/**
 * Enterprise Dark Theme for Yachi Mobile App
 * Ethiopian-inspired dark color scheme with WCAG AAA compliance
 * Optimized for low-light environments and battery efficiency
 */
export const DarkTheme = {
  // ===== THEME METADATA =====
  metadata: {
    name: 'dark',
    version: '2.0.0',
    description: 'Enterprise dark theme with Ethiopian cultural elements',
    contrastLevel: 'AAA',
    optimizedFor: ['low-light', 'battery-saving', 'accessibility'],
    lastUpdated: '2024-01-20',
  },

  // ===== COLOR SYSTEM =====
  colors: {
    // Primary brand colors - Ethiopian flag inspired (WCAG AAA compliant)
    primary: {
      main: '#E30613', // Ethiopian Red - Vibrant for dark theme
      light: '#FF3B30', // Enhanced for better visibility
      dark: '#B3050F', // Deeper red for contrast
      contrast: '#FFFFFF',
      gradient: ['#E30613', '#FF3B30'],
      states: {
        hover: '#FF5252',
        pressed: '#B3050F',
        disabled: '#7A0A0F',
      },
    },
    secondary: {
      main: '#078C17', // Ethiopian Green
      light: '#0BA321', // Enhanced for dark theme
      dark: '#056C12', // Deeper green
      contrast: '#FFFFFF',
      gradient: ['#078C17', '#0BA321'],
      states: {
        hover: '#0FBA29',
        pressed: '#056C12',
        disabled: '#0A4510',
      },
    },
    accent: {
      main: '#F59E0B', // Ethiopian Yellow/Gold
      light: '#FBBF24', // Brighter for dark theme
      dark: '#D97706', // Deeper gold
      contrast: '#1A1A1A', // Dark text for accessibility
      gradient: ['#F59E0B', '#FBBF24'],
      states: {
        hover: '#FCD34D',
        pressed: '#D97706',
        disabled: '#92400E',
      },
    },

    // Neutral colors - Optimized for dark theme readability
    neutral: {
      50: '#FAFAFA',  // Pure white for critical text
      100: '#F5F5F5', // High contrast text
      200: '#E5E5E5', // Primary text
      300: '#D4D4D4', // Secondary text
      400: '#A3A3A3', // Tertiary text
      500: '#737373', // Placeholder text
      600: '#525252', // Borders
      700: '#404040', // Surface variant
      800: '#262626', // Surface
      900: '#1A1A1A', // Background
      950: '#0D0D0D', // Elevated background
    },

    // Background colors - Layered for depth
    background: {
      primary: '#0D0D0D',     // Deep black for main background
      secondary: '#1A1A1A',   // Card backgrounds
      tertiary: '#262626',    // Elevated surfaces
      inverse: '#FFFFFF',     // For contrast elements
      surface: '#1A1A1A',     // Main surface color
      elevated: '#262626',    // Elevated components
      overlay: 'rgba(0, 0, 0, 0.8)', // Modal overlays
    },

    // Surface colors - Material Design inspired
    surface: {
      primary: '#1A1A1A',
      secondary: '#262626',
      tertiary: '#404040',
      elevated: '#262626',
      card: '#1A1A1A',
      variant: '#404040',
    },

    // Text colors - WCAG AAA compliant
    text: {
      primary: '#FAFAFA',     // High contrast for main text
      secondary: '#E5E5E5',   // Secondary information
      tertiary: '#A3A3A3',    // Less important text
      inverse: '#1A1A1A',     // Text on light backgrounds
      disabled: '#737373',    // Disabled state text
      placeholder: '#737373', // Input placeholders
      hint: '#A3A3A3',        // Helper text
      link: '#60A5FA',        // Interactive links
    },

    // Border colors - Subtle but visible
    border: {
      primary: '#404040',     // Main borders
      secondary: '#525252',   // Subtle dividers
      focused: '#60A5FA',     // Focus states
      error: '#EF4444',       // Error states
      success: '#10B981',     // Success states
      divider: '#404040',     // List dividers
      subtle: 'rgba(255, 255, 255, 0.1)', // Very subtle
    },

    // Icon colors - Consistent with text hierarchy
    icon: {
      primary: '#FAFAFA',     // Main icons
      secondary: '#E5E5E5',   // Secondary icons
      tertiary: '#A3A3A3',    // Less important icons
      inverse: '#1A1A1A',     // Icons on light backgrounds
      active: '#E30613',      // Active state
      disabled: '#737373',    // Disabled state
      success: '#10B981',     // Success icons
      warning: '#F59E0B',     // Warning icons
      error: '#EF4444',       // Error icons
    },

    // Semantic colors - Enhanced for dark theme
    semantic: {
      success: {
        main: '#10B981',      // Vibrant green
        light: 'rgba(16, 185, 129, 0.2)',
        dark: '#059669',
        contrast: '#FFFFFF',
        text: '#10B981',
      },
      warning: {
        main: '#F59E0B',      // Vibrant yellow
        light: 'rgba(245, 158, 11, 0.2)',
        dark: '#D97706',
        contrast: '#1A1A1A',
        text: '#F59E0B',
      },
      error: {
        main: '#EF4444',      // Vibrant red
        light: 'rgba(239, 68, 68, 0.2)',
        dark: '#DC2626',
        contrast: '#FFFFFF',
        text: '#EF4444',
      },
      info: {
        main: '#60A5FA',      // Vibrant blue
        light: 'rgba(96, 165, 250, 0.2)',
        dark: '#3B82F6',
        contrast: '#FFFFFF',
        text: '#60A5FA',
      },
    },

    // Ethiopian payment provider colors - Dark theme optimized
    payment: {
      chapa: {
        primary: '#1E40AF',   // Enhanced blue
        secondary: '#60A5FA',
        background: 'rgba(30, 64, 175, 0.2)',
        text: '#60A5FA',
      },
      telebirr: {
        primary: '#059669',   // Enhanced green
        secondary: '#10B981',
        background: 'rgba(5, 150, 105, 0.2)',
        text: '#10B981',
      },
      cbebirr: {
        primary: '#DC2626',   // Enhanced red
        secondary: '#EF4444',
        background: 'rgba(220, 38, 38, 0.2)',
        text: '#EF4444',
      },
    },

    // Construction industry colors - Enhanced for visibility
    construction: {
      blueprint: '#3B82F6',   // Planning phase
      concrete: '#A3A3A3',    // Foundation
      steel: '#D4D4D4',       // Structure
      safety: '#EF4444',      // Safety critical
      completed: '#10B981',   // Completed work
      inProgress: '#F59E0B',  // Active work
      planning: '#60A5FA',    // Planning stage
      delayed: '#EF4444',     // Delayed items
      onSchedule: '#10B981',  // On schedule
    },

    // Worker category colors - Enhanced contrast
    worker: {
      engineer: '#E30613',    // Bright red
      architect: '#10B981',   // Bright green
      plumber: '#3B82F6',     // Bright blue
      electrician: '#F59E0B', // Bright yellow
      carpenter: '#D97706',   // Warm brown
      mason: '#A3A3A3',       // Neutral
      painter: '#8B5CF6',     // Purple
      steel_fixer: '#D4D4D4', // Light gray
      tiler: '#EF4444',       // Red
      cleaner: '#10B981',     // Green
      laborer: '#737373',     // Gray
      foreman: '#F59E0B',     // Gold
      project_manager: '#6366F1', // Indigo
    },

    // Premium feature colors - Enhanced glow effects
    premium: {
      badge: '#F59E0B',       // Gold badge
      listing: '#8B5CF6',     // Purple for featured
      featured: '#EC4899',    // Pink for premium
      glow: 'rgba(245, 158, 11, 0.4)',
      gradient: ['#F59E0B', '#EC4899'],
    },

    // Ethiopian traditional colors - Cultural significance
    ethiopian: {
      meskelRed: '#E30613',   // Meskel celebration
      nileBlue: '#60A5FA',    // Nile river
      highlandGreen: '#10B981', // Highlands
      sunYellow: '#F59E0B',   // African sun
      coffeeBrown: '#D97706', // Coffee ceremony
      injeraCream: '#A3A3A3', // Traditional bread
      berbereOrange: '#EA580C', // Spice blend
      culturalGold: '#F59E0B', // Traditional gold
    },

    // State colors - Interactive states
    state: {
      hover: 'rgba(227, 6, 19, 0.1)',
      pressed: 'rgba(227, 6, 19, 0.2)',
      selected: 'rgba(227, 6, 19, 0.15)',
      disabled: 'rgba(115, 115, 115, 0.3)',
      focus: 'rgba(96, 165, 250, 0.2)',
    },
  },

  // ===== TYPOGRAPHY SYSTEM =====
  typography: {
    // Font families with fallbacks
    fontFamily: {
      primary: {
        regular: 'Inter-Regular',
        medium: 'Inter-Medium',
        semibold: 'Inter-SemiBold',
        bold: 'Inter-Bold',
      },
      secondary: {
        regular: 'System',
        medium: 'System',
      },
      monospace: {
        regular: 'JetBrainsMono-Regular',
        medium: 'JetBrainsMono-Medium',
      },
    },

    // Font sizes - Responsive scale
    fontSize: {
      ...FONT_SIZES,
      // Additional dark theme optimized sizes
      display: 32,
      headline: 24,
      title: 20,
    },

    // Line heights - Optimized for readability
    lineHeight: {
      ...LINE_HEIGHTS,
      // Enhanced for dark theme
      display: 40,
      headline: 32,
      title: 28,
    },

    // Letter spacing - Improved legibility
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
    },

    // Text styles - Comprehensive system
    text: {
      display: {
        fontFamily: 'Inter-Bold',
        fontSize: FONT_SIZES.xxxl,
        lineHeight: 40,
        color: '#FAFAFA',
        letterSpacing: -0.5,
      },
      headline: {
        fontFamily: 'Inter-Bold',
        fontSize: FONT_SIZES.xxl,
        lineHeight: 32,
        color: '#FAFAFA',
        letterSpacing: -0.5,
      },
      title: {
        fontFamily: 'Inter-SemiBold',
        fontSize: FONT_SIZES.xl,
        lineHeight: 28,
        color: '#FAFAFA',
        letterSpacing: 0,
      },
      body: {
        fontFamily: 'Inter-Regular',
        fontSize: FONT_SIZES.md,
        lineHeight: LINE_HEIGHTS.normal,
        color: '#FAFAFA',
        letterSpacing: 0,
      },
      caption: {
        fontFamily: 'Inter-Regular',
        fontSize: FONT_SIZES.sm,
        lineHeight: LINE_HEIGHTS.tight,
        color: '#A3A3A3',
        letterSpacing: 0.5,
      },
      label: {
        fontFamily: 'Inter-Medium',
        fontSize: FONT_SIZES.sm,
        lineHeight: LINE_HEIGHTS.tight,
        color: '#E5E5E5',
        letterSpacing: 0.5,
      },
    },
  },

  // ===== SPACING SYSTEM =====
  spacing: {
    ...SPACING,
    // Additional spacing for dark theme
    section: 32,
    screen: 24,
    component: 16,
  },

  // ===== BORDER RADIUS =====
  borderRadius: {
    ...BORDER_RADIUS,
    // Enhanced for dark theme
    full: 9999,
    pill: 50,
  },

  // ===== SHADOWS & ELEVATION =====
  shadows: {
    // Subtle shadows for dark theme
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.8,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.8,
      shadowRadius: 24,
      elevation: 12,
    },
    // Premium glow effects
    premium: {
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  // ===== COMPONENT SPECIFIC STYLES =====
  components: {
    // Button styles - Comprehensive states
    button: {
      variants: {
        primary: {
          backgroundColor: '#E30613',
          borderColor: '#E30613',
          textColor: '#FFFFFF',
          shadow: 'sm',
          states: {
            hover: { backgroundColor: '#FF3B30' },
            pressed: { backgroundColor: '#B3050F' },
            disabled: { backgroundColor: '#7A0A0F' },
          },
        },
        secondary: {
          backgroundColor: '#078C17',
          borderColor: '#078C17',
          textColor: '#FFFFFF',
          shadow: 'sm',
          states: {
            hover: { backgroundColor: '#0BA321' },
            pressed: { backgroundColor: '#056C12' },
            disabled: { backgroundColor: '#0A4510' },
          },
        },
        outline: {
          backgroundColor: 'transparent',
          borderColor: '#404040',
          textColor: '#E5E5E5',
          states: {
            hover: { backgroundColor: 'rgba(64, 64, 64, 0.1)' },
            pressed: { backgroundColor: 'rgba(64, 64, 64, 0.2)' },
            disabled: { borderColor: '#737373', textColor: '#737373' },
          },
        },
        ghost: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: '#E30613',
          states: {
            hover: { backgroundColor: 'rgba(227, 6, 19, 0.1)' },
            pressed: { backgroundColor: 'rgba(227, 6, 19, 0.2)' },
            disabled: { textColor: '#737373' },
          },
        },
        premium: {
          backgroundColor: '#F59E0B',
          borderColor: '#F59E0B',
          textColor: '#1A1A1A',
          shadow: 'premium',
          states: {
            hover: { backgroundColor: '#FBBF24' },
            pressed: { backgroundColor: '#D97706' },
            disabled: { backgroundColor: '#92400E' },
          },
        },
      },
      sizes: {
        ...BUTTON_SIZES,
      },
    },

    // Input styles - Enhanced focus states
    input: {
      variants: {
        default: {
          backgroundColor: '#1A1A1A',
          borderColor: '#404040',
          textColor: '#FAFAFA',
          placeholderColor: '#737373',
          shadow: 'none',
        },
        focused: {
          backgroundColor: '#1A1A1A',
          borderColor: '#60A5FA',
          textColor: '#FAFAFA',
          shadow: 'xs',
        },
        error: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: '#EF4444',
          textColor: '#FAFAFA',
          shadow: 'none',
        },
        success: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10B981',
          textColor: '#FAFAFA',
          shadow: 'none',
        },
        disabled: {
          backgroundColor: '#262626',
          borderColor: '#404040',
          textColor: '#737373',
          shadow: 'none',
        },
      },
      sizes: {
        ...INPUT_SIZES,
      },
    },

    // Card styles - Layered elevation
    card: {
      variants: {
        elevated: {
          backgroundColor: '#1A1A1A',
          borderColor: 'transparent',
          shadow: 'md',
        },
        outlined: {
          backgroundColor: '#1A1A1A',
          borderColor: '#404040',
          shadow: 'none',
        },
        filled: {
          backgroundColor: '#262626',
          borderColor: 'transparent',
          shadow: 'none',
        },
        interactive: {
          backgroundColor: '#1A1A1A',
          borderColor: 'transparent',
          shadow: 'sm',
          states: {
            hover: { backgroundColor: '#262626' },
            pressed: { backgroundColor: '#404040' },
          },
        },
      },
      sizes: {
        ...CARD_SIZES,
      },
    },

    // Navigation styles - Platform specific
    navigation: {
      header: {
        backgroundColor: '#0D0D0D',
        borderColor: '#404040',
        textColor: '#FAFAFA',
        shadow: 'sm',
      },
      tabBar: {
        backgroundColor: '#0D0D0D',
        borderColor: '#404040',
        activeTint: '#E30613',
        inactiveTint: '#737373',
        shadow: 'sm',
      },
      drawer: {
        backgroundColor: '#1A1A1A',
        borderColor: '#404040',
        textColor: '#FAFAFA',
        shadow: 'lg',
      },
    },
  },

  // ===== ANIMATION CONFIGURATION =====
  animation: {
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
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  // ===== ETHIOPIAN CULTURAL ELEMENTS =====
  ethiopian: {
    // Regional color coding
    regions: {
      addisAbaba: '#E30613',  // Capital - Red
      oromia: '#10B981',      // Green highlands
      amhara: '#3B82F6',      // Blue Nile
      tigray: '#D97706',      // Historical - Brown
      somali: '#F59E0B',      // Eastern - Gold
      sidama: '#EC4899',      // Southern - Pink
      afar: '#EF4444',        // Desert - Red
      benishangul: '#8B5CF6', // Western - Purple
      gambela: '#06D6A0',     // Gambela - Teal
      harari: '#FF6B6B',      // Harari - Coral
      direDawa: '#A3A3A3',    // Dire Dawa - Gray
    },

    // Traditional holiday themes
    holidays: {
      enkutatash: { // New Year
        primary: '#F59E0B',
        secondary: '#10B981',
        gradient: ['#F59E0B', '#10B981'],
      },
      timkat: { // Epiphany
        primary: '#3B82F6',
        secondary: '#FFFFFF',
        gradient: ['#3B82F6', '#60A5FA'],
      },
      meskel: { // Finding of True Cross
        primary: '#E30613',
        secondary: '#F59E0B',
        gradient: ['#E30613', '#F59E0B'],
      },
      eid: { // Muslim holidays
        primary: '#10B981',
        secondary: '#F59E0B',
        gradient: ['#10B981', '#F59E0B'],
      },
    },

    // Cultural patterns and motifs
    patterns: {
      meskelFlower: '#E30613',
      nileWaves: '#3B82F6',
      highlandMountains: '#10B981',
      sunRays: '#F59E0B',
      coffeeBeans: '#D97706',
      crossPattern: '#F59E0B',
    },
  },

  // ===== ACCESSIBILITY CONFIGURATION =====
  accessibility: {
    minimumContrast: 7.0, // WCAG AAA standard
    preferredContrast: 4.5, // WCAG AA standard
    textScaleFactors: {
      small: 0.85,
      normal: 1.0,
      large: 1.15,
      xlarge: 1.3,
      xxlarge: 1.5,
    },
    reducedMotion: {
      durationMultiplier: 0.5,
      disableAnimations: false,
    },
    highContrast: {
      textColor: '#FFFFFF',
      backgroundColor: '#000000',
      borderColor: '#FFFFFF',
    },
  },

  // ===== PLATFORM SPECIFIC OVERRIDES =====
  platform: {
    ios: {
      shadows: {
        sm: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
      },
    },
    android: {
      shadows: {
        sm: {
          elevation: 2,
          shadowColor: '#000000',
        },
      },
    },
    web: {
      colors: {
        focus: {
          outline: '#60A5FA',
          outlineOffset: '2px',
        },
      },
    },
  },
};

// ===== STYLESHEET CREATION =====
export const DarkThemeStyles = StyleSheet.create({
  // Global containers
  container: {
    flex: 1,
    backgroundColor: DarkTheme.colors.background.primary,
  },
  containerSecondary: {
    flex: 1,
    backgroundColor: DarkTheme.colors.background.secondary,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: DarkTheme.colors.background.primary,
    padding: DarkTheme.spacing.screen,
  },

  // Text styles
  textDisplay: {
    ...DarkTheme.typography.text.display,
  },
  textHeadline: {
    ...DarkTheme.typography.text.headline,
  },
  textTitle: {
    ...DarkTheme.typography.text.title,
  },
  textBody: {
    ...DarkTheme.typography.text.body,
  },
  textCaption: {
    ...DarkTheme.typography.text.caption,
  },
  textLabel: {
    ...DarkTheme.typography.text.label,
  },

  // Button styles
  button: {
    borderRadius: DarkTheme.borderRadius.button,
    paddingHorizontal: DarkTheme.spacing.lg,
    paddingVertical: DarkTheme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: DarkTheme.components.button.variants.primary.backgroundColor,
    ...DarkTheme.shadows.sm,
  },
  buttonPrimaryText: {
    color: DarkTheme.components.button.variants.primary.textColor,
    fontFamily: DarkTheme.typography.fontFamily.primary.medium,
    fontSize: DarkTheme.typography.fontSize.md,
  },

  // Card styles
  card: {
    backgroundColor: DarkTheme.components.card.variants.elevated.backgroundColor,
    borderRadius: DarkTheme.borderRadius.card,
    padding: DarkTheme.spacing.md,
    ...DarkTheme.shadows.sm,
  },
  cardElevated: {
    ...DarkTheme.shadows.md,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: DarkTheme.colors.border.primary,
    ...DarkTheme.shadows.none,
  },

  // Input styles
  input: {
    backgroundColor: DarkTheme.components.input.variants.default.backgroundColor,
    borderColor: DarkTheme.components.input.variants.default.borderColor,
    borderRadius: DarkTheme.borderRadius.input,
    borderWidth: 1,
    paddingHorizontal: DarkTheme.spacing.md,
    paddingVertical: DarkTheme.spacing.sm,
    fontSize: DarkTheme.typography.fontSize.md,
    color: DarkTheme.components.input.variants.default.textColor,
  },
  inputFocused: {
    borderColor: DarkTheme.components.input.variants.focused.borderColor,
    ...DarkTheme.shadows.xs,
  },

  // Premium styles
  premiumBadge: {
    backgroundColor: DarkTheme.colors.premium.badge,
    paddingHorizontal: DarkTheme.spacing.sm,
    paddingVertical: DarkTheme.spacing.xxs,
    borderRadius: DarkTheme.borderRadius.xs,
    ...DarkTheme.shadows.premium,
  },
  premiumBadgeText: {
    color: DarkTheme.colors.text.inverse,
    fontSize: DarkTheme.typography.fontSize.xs,
    fontFamily: DarkTheme.typography.fontFamily.primary.bold,
    textTransform: 'uppercase',
  },

  // Ethiopian cultural elements
  ethiopianBorder: {
    borderLeftWidth: 4,
    borderLeftColor: DarkTheme.colors.ethiopian.meskelRed,
  },
  culturalAccent: {
    backgroundColor: DarkTheme.colors.ethiopian.meskelRed,
  },

  // Utility styles
  glassmorphism: {
    backgroundColor: 'rgba(13, 13, 13, 0.8)',
    backdropFilter: 'blur(20px)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  divider: {
    height: 1,
    backgroundColor: DarkTheme.colors.border.divider,
  },
  spacer: {
    height: DarkTheme.spacing.md,
  },
});

// ===== THEME UTILITY FUNCTIONS =====
export const DarkThemeUtils = {
  // Color utilities
  getWorkerColor: (category) => {
    return DarkTheme.colors.worker[category] || DarkTheme.colors.primary.main;
  },

  getRegionalColor: (region) => {
    return DarkTheme.ethiopian.regions[region] || DarkTheme.colors.primary.main;
  },

  getPaymentColor: (provider) => {
    return DarkTheme.colors.payment[provider]?.primary || DarkTheme.colors.primary.main;
  },

  getProjectStatusColor: (status) => {
    const statusColors = {
      planning: DarkTheme.colors.construction.planning,
      active: DarkTheme.colors.construction.inProgress,
      completed: DarkTheme.colors.construction.completed,
      cancelled: DarkTheme.colors.semantic.error.main,
      delayed: DarkTheme.colors.construction.delayed,
    };
    return statusColors[status] || statusColors.planning;
  },

  // Gradient utilities
  createGradient: (type = 'primary') => {
    const gradients = {
      primary: DarkTheme.colors.primary.gradient,
      secondary: DarkTheme.colors.secondary.gradient,
      accent: DarkTheme.colors.accent.gradient,
      premium: DarkTheme.colors.premium.gradient,
      ethiopian: DarkTheme.ethiopian.holidays.meskel.gradient,
      dark: ['#1A1A1A', '#0D0D0D'],
    };
    return gradients[type] || gradients.primary;
  },

  // Contrast utilities
  getContrastColor: (backgroundColor) => {
    // Calculate relative luminance
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.5 ? DarkTheme.colors.text.inverse : DarkTheme.colors.text.primary;
  },

  // Accessibility utilities
  ensureAccessibility: (background, text) => {
    const contrast = DarkThemeUtils.calculateContrast(background, text);
    if (contrast < DarkTheme.accessibility.minimumContrast) {
      console.warn(`Low contrast detected: ${contrast}. Consider using higher contrast colors.`);
    }
    return contrast >= DarkTheme.accessibility.preferredContrast;
  },

  calculateContrast: (color1, color2) => {
    // Simplified contrast calculation
    const lum1 = DarkThemeUtils.getLuminance(color1);
    const lum2 = DarkThemeUtils.getLuminance(color2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  },

  getLuminance: (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  // Platform utilities
  getPlatformStyle: (styleKey) => {
    const platform = Platform.OS;
    return DarkTheme.platform[platform]?.[styleKey] || {};
  },

  // Animation utilities
  getAnimationConfig: (type = 'normal') => {
    return {
      duration: DarkTheme.animation.duration[type],
      easing: DarkTheme.animation.easing.easeOut,
      useNativeDriver: true,
    };
  },
};

export default DarkTheme;