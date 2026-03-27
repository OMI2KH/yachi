// styles/themes/light.js
/**
 * Enterprise-level Light Theme for Yachi Mobile App
 * Ethiopian-inspired light color scheme with professional design system
 * Version: 2.0.0
 */

import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ===== ENTERPRISE COLOR SYSTEM =====
export const ENTERPRISE_COLORS = {
  // Ethiopian National Colors
  ETHIOPIAN_RED: '#DA121A',
  ETHIOPIAN_YELLOW: '#FCDD09',
  ETHIOPIAN_GREEN: '#078930',
  ETHIOPIAN_BLUE: '#0F47AF',
  
  // Primary Brand Palette
  PRIMARY_MAIN: '#DA121A',
  PRIMARY_LIGHT: '#FF5252',
  PRIMARY_DARK: '#B71C1C',
  PRIMARY_CONTRAST: '#FFFFFF',
  
  SECONDARY_MAIN: '#078930',
  SECONDARY_LIGHT: '#4CAF50',
  SECONDARY_DARK: '#1B5E20',
  SECONDARY_CONTRAST: '#FFFFFF',
  
  ACCENT_MAIN: '#F59E0B',
  ACCENT_LIGHT: '#FBBF24',
  ACCENT_DARK: '#D97706',
  ACCENT_CONTRAST: '#FFFFFF',
  
  // Neutral Colors
  NEUTRAL_50: '#FAFAFA',
  NEUTRAL_100: '#F5F5F5',
  NEUTRAL_200: '#EEEEEE',
  NEUTRAL_300: '#E0E0E0',
  NEUTRAL_400: '#BDBDBD',
  NEUTRAL_500: '#9E9E9E',
  NEUTRAL_600: '#757575',
  NEUTRAL_700: '#616161',
  NEUTRAL_800: '#424242',
  NEUTRAL_900: '#212121',
  
  // Semantic Colors
  SUCCESS_50: '#E8F5E8',
  SUCCESS_500: '#4CAF50',
  SUCCESS_700: '#2E7D32',
  
  WARNING_50: '#FFF8E1',
  WARNING_500: '#FFC107',
  WARNING_700: '#FF8F00',
  
  ERROR_50: '#FFEBEE',
  ERROR_500: '#F44336',
  ERROR_700: '#D32F2F',
  
  INFO_50: '#E3F2FD',
  INFO_500: '#2196F3',
  INFO_700: '#1976D2',
  
  // Payment Provider Colors
  CHAPA_PRIMARY: '#1A237E',
  TELEBIRR_PRIMARY: '#FF6D00',
  CBE_BIRR_PRIMARY: '#00695C',
  
  // Construction Industry Colors
  CONSTRUCTION_BLUEPRINT: '#1565C0',
  CONSTRUCTION_CONCRETE: '#78909C',
  CONSTRUCTION_STEEL: '#455A64',
  CONSTRUCTION_SAFETY: '#FF6D00',
  CONSTRUCTION_COMPLETED: '#4CAF50',
  CONSTRUCTION_IN_PROGRESS: '#FFC107',
  CONSTRUCTION_PLANNING: '#9C27B0',
  
  // Worker Category Colors
  WORKER_ENGINEER: '#3F51B5',
  WORKER_ARCHITECT: '#009688',
  WORKER_PLUMBER: '#2196F3',
  WORKER_ELECTRICIAN: '#FF9800',
  WORKER_CARPENTER: '#795548',
  WORKER_MASON: '#607D8B',
  WORKER_PAINTER: '#E91E63',
  WORKER_STEEL_FIXER: '#455A64',
  WORKER_TILER: '#FF5722',
  WORKER_CLEANER: '#9C27B0',
  WORKER_LABORER: '#757575',
  WORKER_FOREMAN: '#FFC107',
  WORKER_PROJECT_MANAGER: '#4CAF50',
  
  // Premium Features
  PREMIUM_BADGE: '#FFD700',
  PREMIUM_LISTING: '#FF6B35',
  PREMIUM_FEATURED: '#E91E63',
  PREMIUM_GLOW: 'rgba(255, 215, 0, 0.3)',
  
  // Ethiopian Traditional Colors
  MESKEL_RED: '#C62828',
  NILE_BLUE: '#0D47A1',
  HIGHLAND_GREEN: '#2E7D32',
  SUN_YELLOW: '#FFD600',
  COFFEE_BROWN: '#5D4037',
  INJERA_CREAM: '#FFF8E1',
  BERBERE_ORANGE: '#FF5722',
};

// ===== ENTERPRISE SPACING SYSTEM =====
export const ENTERPRISE_SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// ===== ENTERPRISE BORDER RADIUS =====
export const ENTERPRISE_BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  round: 9999,
  
  // Component specific
  button: 12,
  input: 8,
  card: 16,
  modal: 20,
  badge: 6,
};

// ===== ENTERPRISE TYPOGRAPHY =====
export const ENTERPRISE_TYPOGRAPHY = {
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
      bold: 'System',
    },
    monospace: 'Courier New',
  },
  
  fontSize: {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// ===== ENTERPRISE SHADOWS =====
export const ENTERPRISE_SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: ENTERPRISE_COLORS.NEUTRAL_900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: ENTERPRISE_COLORS.NEUTRAL_900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: ENTERPRISE_COLORS.NEUTRAL_900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: ENTERPRISE_COLORS.NEUTRAL_900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: ENTERPRISE_COLORS.NEUTRAL_900,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
};

// ===== ENTERPRISE COMPONENT SIZES =====
export const ENTERPRISE_COMPONENT_SIZES = {
  button: {
    sm: {
      height: 36,
      paddingHorizontal: ENTERPRISE_SPACING.md,
      fontSize: ENTERPRISE_TYPOGRAPHY.fontSize.sm,
    },
    md: {
      height: 44,
      paddingHorizontal: ENTERPRISE_SPACING.lg,
      fontSize: ENTERPRISE_TYPOGRAPHY.fontSize.md,
    },
    lg: {
      height: 52,
      paddingHorizontal: ENTERPRISE_SPACING.xl,
      fontSize: ENTERPRISE_TYPOGRAPHY.fontSize.lg,
    },
  },
  input: {
    sm: {
      height: 40,
      paddingHorizontal: ENTERPRISE_SPACING.md,
      fontSize: ENTERPRISE_TYPOGRAPHY.fontSize.sm,
    },
    md: {
      height: 48,
      paddingHorizontal: ENTERPRISE_SPACING.lg,
      fontSize: ENTERPRISE_TYPOGRAPHY.fontSize.md,
    },
    lg: {
      height: 56,
      paddingHorizontal: ENTERPRISE_SPACING.xl,
      fontSize: ENTERPRISE_TYPOGRAPHY.fontSize.lg,
    },
  },
  card: {
    sm: {
      padding: ENTERPRISE_SPACING.sm,
    },
    md: {
      padding: ENTERPRISE_SPACING.md,
    },
    lg: {
      padding: ENTERPRISE_SPACING.lg,
    },
  },
};

// ===== ENTERPRISE LIGHT THEME =====
export const EnterpriseLightTheme = {
  // ===== COLOR SYSTEM =====
  colors: {
    // Primary brand colors - Ethiopian inspired
    primary: {
      main: ENTERPRISE_COLORS.PRIMARY_MAIN,
      light: ENTERPRISE_COLORS.PRIMARY_LIGHT,
      dark: ENTERPRISE_COLORS.PRIMARY_DARK,
      contrast: ENTERPRISE_COLORS.PRIMARY_CONTRAST,
    },
    secondary: {
      main: ENTERPRISE_COLORS.SECONDARY_MAIN,
      light: ENTERPRISE_COLORS.SECONDARY_LIGHT,
      dark: ENTERPRISE_COLORS.SECONDARY_DARK,
      contrast: ENTERPRISE_COLORS.SECONDARY_CONTRAST,
    },
    accent: {
      main: ENTERPRISE_COLORS.ACCENT_MAIN,
      light: ENTERPRISE_COLORS.ACCENT_LIGHT,
      dark: ENTERPRISE_COLORS.ACCENT_DARK,
      contrast: ENTERPRISE_COLORS.ACCENT_CONTRAST,
    },

    // Background colors
    background: {
      primary: '#FFFFFF',
      secondary: ENTERPRISE_COLORS.NEUTRAL_50,
      tertiary: ENTERPRISE_COLORS.NEUTRAL_100,
      inverse: ENTERPRISE_COLORS.NEUTRAL_900,
      surface: '#FFFFFF',
    },

    // Surface colors
    surface: {
      primary: '#FFFFFF',
      secondary: ENTERPRISE_COLORS.NEUTRAL_50,
      tertiary: ENTERPRISE_COLORS.NEUTRAL_100,
      elevated: '#FFFFFF',
      card: '#FFFFFF',
    },

    // Text colors
    text: {
      primary: ENTERPRISE_COLORS.NEUTRAL_900,
      secondary: ENTERPRISE_COLORS.NEUTRAL_700,
      tertiary: ENTERPRISE_COLORS.NEUTRAL_500,
      inverse: '#FFFFFF',
      disabled: ENTERPRISE_COLORS.NEUTRAL_400,
      placeholder: ENTERPRISE_COLORS.NEUTRAL_400,
      hint: ENTERPRISE_COLORS.NEUTRAL_500,
    },

    // Border colors
    border: {
      primary: ENTERPRISE_COLORS.NEUTRAL_300,
      secondary: ENTERPRISE_COLORS.NEUTRAL_200,
      focused: ENTERPRISE_COLORS.PRIMARY_MAIN,
      error: ENTERPRISE_COLORS.ERROR_500,
      success: ENTERPRISE_COLORS.SUCCESS_500,
      divider: ENTERPRISE_COLORS.NEUTRAL_200,
    },

    // Icon colors
    icon: {
      primary: ENTERPRISE_COLORS.NEUTRAL_700,
      secondary: ENTERPRISE_COLORS.NEUTRAL_500,
      tertiary: ENTERPRISE_COLORS.NEUTRAL_400,
      inverse: '#FFFFFF',
      active: ENTERPRISE_COLORS.PRIMARY_MAIN,
      disabled: ENTERPRISE_COLORS.NEUTRAL_400,
    },

    // Semantic colors
    semantic: {
      success: {
        main: ENTERPRISE_COLORS.SUCCESS_500,
        light: ENTERPRISE_COLORS.SUCCESS_50,
        dark: ENTERPRISE_COLORS.SUCCESS_700,
        contrast: '#FFFFFF',
      },
      warning: {
        main: ENTERPRISE_COLORS.WARNING_500,
        light: ENTERPRISE_COLORS.WARNING_50,
        dark: ENTERPRISE_COLORS.WARNING_700,
        contrast: ENTERPRISE_COLORS.NEUTRAL_900,
      },
      error: {
        main: ENTERPRISE_COLORS.ERROR_500,
        light: ENTERPRISE_COLORS.ERROR_50,
        dark: ENTERPRISE_COLORS.ERROR_700,
        contrast: '#FFFFFF',
      },
      info: {
        main: ENTERPRISE_COLORS.INFO_500,
        light: ENTERPRISE_COLORS.INFO_50,
        dark: ENTERPRISE_COLORS.INFO_700,
        contrast: '#FFFFFF',
      },
    },

    // Payment provider colors
    payment: {
      chapa: {
        primary: ENTERPRISE_COLORS.CHAPA_PRIMARY,
        secondary: ENTERPRISE_COLORS.CHAPA_PRIMARY,
        background: ENTERPRISE_COLORS.INFO_50,
      },
      telebirr: {
        primary: ENTERPRISE_COLORS.TELEBIRR_PRIMARY,
        secondary: ENTERPRISE_COLORS.TELEBIRR_PRIMARY,
        background: ENTERPRISE_COLORS.WARNING_50,
      },
      cbebirr: {
        primary: ENTERPRISE_COLORS.CBE_BIRR_PRIMARY,
        secondary: ENTERPRISE_COLORS.CBE_BIRR_PRIMARY,
        background: ENTERPRISE_COLORS.SUCCESS_50,
      },
    },

    // Construction industry colors
    construction: {
      blueprint: ENTERPRISE_COLORS.CONSTRUCTION_BLUEPRINT,
      concrete: ENTERPRISE_COLORS.CONSTRUCTION_CONCRETE,
      steel: ENTERPRISE_COLORS.CONSTRUCTION_STEEL,
      safety: ENTERPRISE_COLORS.CONSTRUCTION_SAFETY,
      completed: ENTERPRISE_COLORS.CONSTRUCTION_COMPLETED,
      inProgress: ENTERPRISE_COLORS.CONSTRUCTION_IN_PROGRESS,
      planning: ENTERPRISE_COLORS.CONSTRUCTION_PLANNING,
    },

    // Worker category colors
    worker: {
      engineer: ENTERPRISE_COLORS.WORKER_ENGINEER,
      architect: ENTERPRISE_COLORS.WORKER_ARCHITECT,
      plumber: ENTERPRISE_COLORS.WORKER_PLUMBER,
      electrician: ENTERPRISE_COLORS.WORKER_ELECTRICIAN,
      carpenter: ENTERPRISE_COLORS.WORKER_CARPENTER,
      mason: ENTERPRISE_COLORS.WORKER_MASON,
      painter: ENTERPRISE_COLORS.WORKER_PAINTER,
      steel_fixer: ENTERPRISE_COLORS.WORKER_STEEL_FIXER,
      tiler: ENTERPRISE_COLORS.WORKER_TILER,
      cleaner: ENTERPRISE_COLORS.WORKER_CLEANER,
      laborer: ENTERPRISE_COLORS.WORKER_LABORER,
      foreman: ENTERPRISE_COLORS.WORKER_FOREMAN,
      project_manager: ENTERPRISE_COLORS.WORKER_PROJECT_MANAGER,
    },

    // Premium feature colors
    premium: {
      badge: ENTERPRISE_COLORS.PREMIUM_BADGE,
      listing: ENTERPRISE_COLORS.PREMIUM_LISTING,
      featured: ENTERPRISE_COLORS.PREMIUM_FEATURED,
      glow: ENTERPRISE_COLORS.PREMIUM_GLOW,
    },

    // Ethiopian traditional colors
    ethiopian: {
      meskelRed: ENTERPRISE_COLORS.MESKEL_RED,
      nileBlue: ENTERPRISE_COLORS.NILE_BLUE,
      highlandGreen: ENTERPRISE_COLORS.HIGHLAND_GREEN,
      sunYellow: ENTERPRISE_COLORS.SUN_YELLOW,
      coffeeBrown: ENTERPRISE_COLORS.COFFEE_BROWN,
      injeraCream: ENTERPRISE_COLORS.INJERA_CREAM,
      berbereOrange: ENTERPRISE_COLORS.BERBERE_ORANGE,
    },

    // State colors
    state: {
      hover: ENTERPRISE_COLORS.PRIMARY_LIGHT + '20',
      pressed: ENTERPRISE_COLORS.PRIMARY_LIGHT + '40',
      selected: ENTERPRISE_COLORS.PRIMARY_LIGHT + '20',
      disabled: ENTERPRISE_COLORS.NEUTRAL_100,
    },
  },

  // ===== TYPOGRAPHY SYSTEM =====
  typography: ENTERPRISE_TYPOGRAPHY,

  // ===== SPACING SYSTEM =====
  spacing: ENTERPRISE_SPACING,

  // ===== BORDER RADIUS =====
  borderRadius: ENTERPRISE_BORDER_RADIUS,

  // ===== SHADOWS & ELEVATION =====
  shadows: ENTERPRISE_SHADOWS,

  // ===== COMPONENT SIZES =====
  componentSizes: ENTERPRISE_COMPONENT_SIZES,

  // ===== LAYOUT CONFIGURATION =====
  layout: {
    screen: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    },
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1280,
    },
    maxWidth: {
      mobile: 480,
      tablet: 768,
      desktop: 1200,
    },
  },

  // ===== ANIMATION CONFIGURATION =====
  animation: {
    duration: {
      instant: 100,
      short: 200,
      medium: 300,
      long: 500,
      extended: 1000,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    scale: {
      pressed: 0.95,
      hover: 1.05,
    },
  },

  // ===== Z-INDEX SYSTEM =====
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
    toast: 1700,
    loading: 1800,
  },
};

// ===== ENTERPRISE STYLESHEET =====
export const EnterpriseLightStyles = StyleSheet.create({
  // ===== GLOBAL CONTAINERS =====
  container: {
    flex: 1,
    backgroundColor: EnterpriseLightTheme.colors.background.primary,
  },
  containerSecondary: {
    flex: 1,
    backgroundColor: EnterpriseLightTheme.colors.background.secondary,
  },
  containerTertiary: {
    flex: 1,
    backgroundColor: EnterpriseLightTheme.colors.background.tertiary,
  },

  // ===== TEXT STYLES =====
  textDefault: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.regular,
    fontSize: EnterpriseLightTheme.typography.fontSize.md,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.normal,
    color: EnterpriseLightTheme.colors.text.primary,
  },
  textSecondary: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.regular,
    fontSize: EnterpriseLightTheme.typography.fontSize.sm,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.secondary,
  },
  textTertiary: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.regular,
    fontSize: EnterpriseLightTheme.typography.fontSize.sm,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.tertiary,
  },
  textCaption: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.regular,
    fontSize: EnterpriseLightTheme.typography.fontSize.xs,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.tertiary,
  },

  // ===== HEADING STYLES =====
  h1: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.bold,
    fontSize: EnterpriseLightTheme.typography.fontSize.xxxl,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.primary,
    marginBottom: EnterpriseLightTheme.spacing.md,
  },
  h2: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.bold,
    fontSize: EnterpriseLightTheme.typography.fontSize.xxl,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.primary,
    marginBottom: EnterpriseLightTheme.spacing.sm,
  },
  h3: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.semibold,
    fontSize: EnterpriseLightTheme.typography.fontSize.xl,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.primary,
    marginBottom: EnterpriseLightTheme.spacing.sm,
  },
  h4: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.semibold,
    fontSize: EnterpriseLightTheme.typography.fontSize.lg,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.primary,
    marginBottom: EnterpriseLightTheme.spacing.xs,
  },
  h5: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.semibold,
    fontSize: EnterpriseLightTheme.typography.fontSize.md,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.primary,
    marginBottom: EnterpriseLightTheme.spacing.xs,
  },
  h6: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.semibold,
    fontSize: EnterpriseLightTheme.typography.fontSize.sm,
    lineHeight: EnterpriseLightTheme.typography.lineHeight.tight,
    color: EnterpriseLightTheme.colors.text.secondary,
    marginBottom: EnterpriseLightTheme.spacing.xs,
  },

  // ===== BUTTON STYLES =====
  button: {
    borderRadius: EnterpriseLightTheme.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: EnterpriseLightTheme.colors.primary.main,
    borderWidth: 0,
  },
  buttonSecondary: {
    backgroundColor: EnterpriseLightTheme.colors.secondary.main,
    borderWidth: 0,
  },
  buttonAccent: {
    backgroundColor: EnterpriseLightTheme.colors.accent.main,
    borderWidth: 0,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: EnterpriseLightTheme.colors.primary.main,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  buttonDisabled: {
    backgroundColor: EnterpriseLightTheme.colors.state.disabled,
    borderWidth: 0,
  },

  buttonText: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.medium,
    textAlign: 'center',
  },
  buttonTextPrimary: {
    color: EnterpriseLightTheme.colors.primary.contrast,
  },
  buttonTextSecondary: {
    color: EnterpriseLightTheme.colors.secondary.contrast,
  },
  buttonTextAccent: {
    color: EnterpriseLightTheme.colors.accent.contrast,
  },
  buttonTextOutline: {
    color: EnterpriseLightTheme.colors.primary.main,
  },
  buttonTextGhost: {
    color: EnterpriseLightTheme.colors.primary.main,
  },
  buttonTextDisabled: {
    color: EnterpriseLightTheme.colors.text.disabled,
  },

  // ===== INPUT STYLES =====
  input: {
    backgroundColor: EnterpriseLightTheme.colors.background.primary,
    borderWidth: 1,
    borderColor: EnterpriseLightTheme.colors.border.primary,
    borderRadius: EnterpriseLightTheme.borderRadius.input,
    paddingHorizontal: EnterpriseLightTheme.spacing.md,
    fontSize: EnterpriseLightTheme.typography.fontSize.md,
    color: EnterpriseLightTheme.colors.text.primary,
  },
  inputFocused: {
    borderColor: EnterpriseLightTheme.colors.border.focused,
    ...EnterpriseLightTheme.shadows.xs,
  },
  inputError: {
    borderColor: EnterpriseLightTheme.colors.border.error,
    backgroundColor: EnterpriseLightTheme.colors.semantic.error.light,
  },
  inputDisabled: {
    backgroundColor: EnterpriseLightTheme.colors.state.disabled,
    borderColor: EnterpriseLightTheme.colors.border.primary,
    color: EnterpriseLightTheme.colors.text.disabled,
  },

  // ===== CARD STYLES =====
  card: {
    backgroundColor: EnterpriseLightTheme.colors.surface.card,
    borderRadius: EnterpriseLightTheme.borderRadius.card,
    padding: EnterpriseLightTheme.spacing.md,
    ...EnterpriseLightTheme.shadows.sm,
  },
  cardElevated: {
    backgroundColor: EnterpriseLightTheme.colors.surface.card,
    borderRadius: EnterpriseLightTheme.borderRadius.card,
    padding: EnterpriseLightTheme.spacing.lg,
    ...EnterpriseLightTheme.shadows.md,
  },
  cardOutlined: {
    backgroundColor: EnterpriseLightTheme.colors.surface.card,
    borderRadius: EnterpriseLightTheme.borderRadius.card,
    padding: EnterpriseLightTheme.spacing.md,
    borderWidth: 1,
    borderColor: EnterpriseLightTheme.colors.border.primary,
  },

  // ===== BADGE STYLES =====
  badge: {
    paddingHorizontal: EnterpriseLightTheme.spacing.sm,
    paddingVertical: EnterpriseLightTheme.spacing.xxs,
    borderRadius: EnterpriseLightTheme.borderRadius.badge,
    alignSelf: 'flex-start',
  },
  badgePrimary: {
    backgroundColor: EnterpriseLightTheme.colors.primary.main,
  },
  badgeSecondary: {
    backgroundColor: EnterpriseLightTheme.colors.secondary.main,
  },
  badgeAccent: {
    backgroundColor: EnterpriseLightTheme.colors.accent.main,
  },
  badgeSuccess: {
    backgroundColor: EnterpriseLightTheme.colors.semantic.success.main,
  },
  badgeWarning: {
    backgroundColor: EnterpriseLightTheme.colors.semantic.warning.main,
  },
  badgeError: {
    backgroundColor: EnterpriseLightTheme.colors.semantic.error.main,
  },
  badgeInfo: {
    backgroundColor: EnterpriseLightTheme.colors.semantic.info.main,
  },

  badgeText: {
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.medium,
    fontSize: EnterpriseLightTheme.typography.fontSize.xs,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // ===== PREMIUM BADGE STYLES =====
  premiumBadge: {
    backgroundColor: EnterpriseLightTheme.colors.premium.badge,
    paddingHorizontal: EnterpriseLightTheme.spacing.sm,
    paddingVertical: EnterpriseLightTheme.spacing.xxs,
    borderRadius: EnterpriseLightTheme.borderRadius.xs,
    ...EnterpriseLightTheme.shadows.sm,
  },
  premiumBadgeText: {
    color: EnterpriseLightTheme.colors.neutral_900,
    fontSize: EnterpriseLightTheme.typography.fontSize.xs,
    fontFamily: EnterpriseLightTheme.typography.fontFamily.primary.bold,
    textTransform: 'uppercase',
  },

  // ===== NAVIGATION STYLES =====
  header: {
    backgroundColor: EnterpriseLightTheme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: EnterpriseLightTheme.colors.border.divider,
  },
  tabBar: {
    backgroundColor: EnterpriseLightTheme.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: EnterpriseLightTheme.colors.border.divider,
  },

  // ===== MODAL STYLES =====
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: EnterpriseLightTheme.colors.background.primary,
    borderRadius: EnterpriseLightTheme.borderRadius.modal,
    margin: EnterpriseLightTheme.spacing.xl,
    padding: EnterpriseLightTheme.spacing.lg,
    ...EnterpriseLightTheme.shadows.lg,
  },

  // ===== LOADING STYLES =====
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EnterpriseLightTheme.colors.background.primary,
  },
  loadingText: {
    marginTop: EnterpriseLightTheme.spacing.md,
    color: EnterpriseLightTheme.colors.text.secondary,
  },

  // ===== ERROR STYLES =====
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: EnterpriseLightTheme.spacing.xl,
    backgroundColor: EnterpriseLightTheme.colors.background.primary,
  },
  errorText: {
    textAlign: 'center',
    color: EnterpriseLightTheme.colors.text.secondary,
    marginTop: EnterpriseLightTheme.spacing.md,
  },

  // ===== SUCCESS STYLES =====
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: EnterpriseLightTheme.spacing.xl,
    backgroundColor: EnterpriseLightTheme.colors.background.primary,
  },
  successText: {
    textAlign: 'center',
    color: EnterpriseLightTheme.colors.text.secondary,
    marginTop: EnterpriseLightTheme.spacing.md,
  },
});

// ===== ENTERPRISE THEME UTILITIES =====
export const EnterpriseThemeUtils = {
  // Get worker category color
  getWorkerColor: (category) => {
    return EnterpriseLightTheme.colors.worker[category] || EnterpriseLightTheme.colors.primary.main;
  },

  // Get payment provider color
  getPaymentColor: (provider) => {
    return EnterpriseLightTheme.colors.payment[provider]?.primary || EnterpriseLightTheme.colors.primary.main;
  },

  // Get project status color
  getProjectStatusColor: (status) => {
    const statusColors = {
      planning: EnterpriseLightTheme.colors.construction.planning,
      active: EnterpriseLightTheme.colors.construction.inProgress,
      completed: EnterpriseLightTheme.colors.construction.completed,
      cancelled: EnterpriseLightTheme.colors.semantic.error.main,
      pending: EnterpriseLightTheme.colors.semantic.warning.main,
    };
    return statusColors[status] || statusColors.pending;
  },

  // Get booking status color
  getBookingStatusColor: (status) => {
    const statusColors = {
      pending: EnterpriseLightTheme.colors.semantic.warning.main,
      confirmed: EnterpriseLightTheme.colors.semantic.info.main,
      in_progress: EnterpriseLightTheme.colors.construction.inProgress,
      completed: EnterpriseLightTheme.colors.semantic.success.main,
      cancelled: EnterpriseLightTheme.colors.semantic.error.main,
    };
    return statusColors[status] || statusColors.pending;
  },

  // Create gradient colors
  createGradient: (type = 'primary') => {
    const gradients = {
      primary: [EnterpriseLightTheme.colors.primary.main, EnterpriseLightTheme.colors.primary.dark],
      secondary: [EnterpriseLightTheme.colors.secondary.main, EnterpriseLightTheme.colors.secondary.dark],
      accent: [EnterpriseLightTheme.colors.accent.main, EnterpriseLightTheme.colors.accent.dark],
      ethiopian: [
        EnterpriseLightTheme.colors.ethiopian.meskelRed,
        EnterpriseLightTheme.colors.ethiopian.sunYellow,
        EnterpriseLightTheme.colors.ethiopian.highlandGreen,
      ],
      premium: [
        EnterpriseLightTheme.colors.premium.badge,
        EnterpriseLightTheme.colors.premium.listing,
      ],
    };
    return gradients[type] || gradients.primary;
  },

  // Check if color is light
  isLightColor: (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128;
  },

  // Get contrast color
  getContrastColor: (color) => {
    return EnterpriseThemeUtils.isLightColor(color) 
      ? EnterpriseLightTheme.colors.text.primary 
      : EnterpriseLightTheme.colors.text.inverse;
  },

  // Generate shadow styles
  generateShadow: (level = 'sm') => {
    return EnterpriseLightTheme.shadows[level] || EnterpriseLightTheme.shadows.sm;
  },

  // Get responsive value
  getResponsiveValue: (mobile, tablet, desktop) => {
    const { width } = EnterpriseLightTheme.layout.screen;
    if (width >= EnterpriseLightTheme.layout.breakpoints.desktop) {
      return desktop;
    } else if (width >= EnterpriseLightTheme.layout.breakpoints.tablet) {
      return tablet;
    } else {
      return mobile;
    }
  },
};

export default EnterpriseLightTheme;