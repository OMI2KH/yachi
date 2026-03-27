/**
 * Enterprise-level component styles for Yachi Mobile App
 * Ethiopian market optimized with comprehensive component design system
 * Advanced styling system with responsive design, dark mode, and accessibility
 */

import { StyleSheet, Platform, Dimensions } from 'react-native';
import GlobalStyles from './global';
import { 
  SPACING, 
  BORDER_RADIUS, 
  FONT_SIZES, 
  LINE_HEIGHTS,
  BUTTON_SIZES,
  INPUT_SIZES,
  CARD_SIZES,
  ICON_SIZES,
  IMAGE_SIZES,
  COMPONENT_SIZES 
} from '../constants/sizes';
import { 
  COLORS, 
  UI_COLORS, 
  SEMANTIC_COLORS,
  PAYMENT_COLORS,
  CONSTRUCTION_COLORS,
  WORKER_CATEGORY_COLORS,
  PREMIUM_COLORS 
} from '../constants/colors';
import { TYPOGRAPHY } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;
const IS_LARGE_DEVICE = SCREEN_WIDTH > 414;

/**
 * Enterprise Component Styles System
 */
export const ComponentStyles = StyleSheet.create({
  // ===== LAYOUT & CONTAINER COMPONENTS =====
  container: {
    screen: {
      flex: 1,
      backgroundColor: UI_COLORS.background.primary,
    },
    scrollView: {
      flexGrow: 1,
      backgroundColor: UI_COLORS.background.primary,
    },
    section: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.xl,
    },
    subsection: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowAround: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    column: {
      flexDirection: 'column',
    },
    flex: {
      flex: 1,
    },
    wrap: {
      flexWrap: 'wrap',
    },
  },

  // ===== NAVBAR COMPONENT =====
  navbar: {
    container: {
      ...GlobalStyles.container,
      paddingTop: Platform.OS === 'ios' ? 50 : 30,
      paddingBottom: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: UI_COLORS.border.primary,
      backgroundColor: UI_COLORS.background.primary,
      ...GlobalStyles.shadowSm,
      zIndex: 1000,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 44,
      minHeight: 44,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: SPACING.md,
    },
    title: {
      fontSize: FONT_SIZES.lg,
      fontFamily: TYPOGRAPHY.fontFamily.primary.semibold,
      fontWeight: '600',
      color: UI_COLORS.text.primary,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: FONT_SIZES.xs,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.tertiary,
      textAlign: 'center',
      marginTop: 2,
    },
    button: {
      padding: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
      color: COLORS.primary[500],
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: PREMIUM_COLORS.gradient.start,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xxs,
      borderRadius: BORDER_RADIUS.xs,
      marginLeft: SPACING.xs,
      ...GlobalStyles.shadowXs,
    },
    premiumText: {
      fontSize: 10,
      fontFamily: TYPOGRAPHY.fontFamily.primary.bold,
      color: PREMIUM_COLORS.text.primary,
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    searchContainer: {
      flex: 1,
      marginHorizontal: SPACING.md,
    },
  },

  // ===== BUTTON COMPONENTS =====
  button: {
    // Base button container
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BORDER_RADIUS.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    
    // Size variants
    sizeSm: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      minHeight: BUTTON_SIZES.sm.height,
    },
    sizeMd: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      minHeight: BUTTON_SIZES.md.height,
    },
    sizeLg: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      minHeight: BUTTON_SIZES.lg.height,
    },
    sizeXl: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.lg,
      minHeight: BUTTON_SIZES.xl.height,
    },

    // Variant styles
    primary: {
      backgroundColor: COLORS.primary[500],
      borderColor: COLORS.primary[500],
    },
    secondary: {
      backgroundColor: COLORS.secondary[500],
      borderColor: COLORS.secondary[500],
    },
    accent: {
      backgroundColor: COLORS.accent[500],
      borderColor: COLORS.accent[500],
    },
    success: {
      backgroundColor: SEMANTIC_COLORS.success[500],
      borderColor: SEMANTIC_COLORS.success[500],
    },
    warning: {
      backgroundColor: SEMANTIC_COLORS.warning[500],
      borderColor: SEMANTIC_COLORS.warning[500],
    },
    error: {
      backgroundColor: SEMANTIC_COLORS.error[500],
      borderColor: SEMANTIC_COLORS.error[500],
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: UI_COLORS.border.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    disabled: {
      backgroundColor: UI_COLORS.state.disabled,
      borderColor: UI_COLORS.state.disabled,
      opacity: 0.6,
    },

    // Text styles
    text: {
      fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
      fontWeight: '500',
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    textSm: {
      fontSize: FONT_SIZES.sm,
    },
    textMd: {
      fontSize: FONT_SIZES.md,
    },
    textLg: {
      fontSize: FONT_SIZES.lg,
    },
    textXl: {
      fontSize: FONT_SIZES.xl,
    },
    textPrimary: {
      color: UI_COLORS.text.inverse,
    },
    textSecondary: {
      color: UI_COLORS.text.inverse,
    },
    textAccent: {
      color: UI_COLORS.text.inverse,
    },
    textOutline: {
      color: UI_COLORS.text.primary,
    },
    textGhost: {
      color: COLORS.primary[500],
    },
    textDisabled: {
      color: UI_COLORS.text.disabled,
    },

    // Icon styles
    icon: {
      marginRight: SPACING.xs,
    },
    iconRight: {
      marginLeft: SPACING.xs,
      marginRight: 0,
    },
    loading: {
      marginRight: SPACING.xs,
    },

    // Special buttons
    floating: {
      position: 'absolute',
      bottom: SPACING.xl,
      right: SPACING.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primary[500],
      ...GlobalStyles.shadowLg,
      elevation: 8,
      zIndex: 100,
    },
    social: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: UI_COLORS.surface.primary,
      borderColor: UI_COLORS.border.primary,
      borderWidth: 1,
    },
  },

  // ===== INPUT COMPONENTS =====
  input: {
    container: {
      marginBottom: SPACING.md,
    },
    label: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
      color: UI_COLORS.text.secondary,
      marginBottom: SPACING.xs,
      fontWeight: '500',
    },
    required: {
      color: SEMANTIC_COLORS.error[500],
    },
    fieldContainer: {
      position: 'relative',
    },
    field: {
      borderWidth: 1,
      borderColor: UI_COLORS.border.primary,
      backgroundColor: UI_COLORS.background.primary,
      borderRadius: BORDER_RADIUS.input,
      paddingHorizontal: SPACING.md,
      fontSize: FONT_SIZES.md,
      color: UI_COLORS.text.primary,
      minHeight: INPUT_SIZES.md.height,
      textAlignVertical: 'center',
    },
    fieldSm: {
      minHeight: INPUT_SIZES.sm.height,
      paddingVertical: SPACING.xs,
    },
    fieldMd: {
      minHeight: INPUT_SIZES.md.height,
      paddingVertical: SPACING.sm,
    },
    fieldLg: {
      minHeight: INPUT_SIZES.lg.height,
      paddingVertical: SPACING.md,
    },
    fieldFocused: {
      borderColor: UI_COLORS.border.focused,
      backgroundColor: UI_COLORS.background.primary,
      shadowColor: UI_COLORS.border.focused,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    fieldError: {
      borderColor: SEMANTIC_COLORS.error[500],
      backgroundColor: SEMANTIC_COLORS.error[50],
    },
    fieldSuccess: {
      borderColor: SEMANTIC_COLORS.success[500],
      backgroundColor: SEMANTIC_COLORS.success[50],
    },
    fieldDisabled: {
      borderColor: UI_COLORS.border.primary,
      backgroundColor: UI_COLORS.background.secondary,
      opacity: 0.6,
    },
    errorText: {
      fontSize: FONT_SIZES.xs,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: SEMANTIC_COLORS.error[500],
      marginTop: SPACING.xxs,
      marginLeft: SPACING.xs,
    },
    helperText: {
      fontSize: FONT_SIZES.xs,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.tertiary,
      marginTop: SPACING.xxs,
      marginLeft: SPACING.xs,
    },
    prefix: {
      position: 'absolute',
      left: SPACING.md,
      top: '50%',
      transform: [{ translateY: -8 }],
      zIndex: 1,
      color: UI_COLORS.text.tertiary,
    },
    suffix: {
      position: 'absolute',
      right: SPACING.md,
      top: '50%',
      transform: [{ translateY: -8 }],
      zIndex: 1,
      color: UI_COLORS.text.tertiary,
    },
    withPrefix: {
      paddingLeft: SPACING.xl + SPACING.md,
    },
    withSuffix: {
      paddingRight: SPACING.xl + SPACING.md,
    },
    search: {
      backgroundColor: UI_COLORS.background.secondary,
      borderColor: UI_COLORS.border.secondary,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm,
    },
  },

  // ===== CARD COMPONENTS =====
  card: {
    // Base card container
    container: {
      backgroundColor: UI_COLORS.surface.primary,
      borderRadius: BORDER_RADIUS.card,
      overflow: 'hidden',
    },
    
    // Size variants
    sizeSm: {
      padding: CARD_SIZES.sm.padding,
    },
    sizeMd: {
      padding: CARD_SIZES.md.padding,
    },
    sizeLg: {
      padding: CARD_SIZES.lg.padding,
    },
    sizeXl: {
      padding: CARD_SIZES.xl.padding,
    },

    // Variant styles
    elevated: {
      backgroundColor: UI_COLORS.surface.primary,
      ...GlobalStyles.shadowMd,
    },
    outline: {
      backgroundColor: UI_COLORS.surface.primary,
      borderWidth: 1,
      borderColor: UI_COLORS.border.primary,
    },
    filled: {
      backgroundColor: UI_COLORS.background.secondary,
    },
    interactive: {
      backgroundColor: UI_COLORS.surface.primary,
      ...GlobalStyles.shadowSm,
    },

    // Card sections
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    title: {
      fontSize: FONT_SIZES.lg,
      fontFamily: TYPOGRAPHY.fontFamily.primary.semibold,
      color: UI_COLORS.text.primary,
      marginBottom: SPACING.xs,
      fontWeight: '600',
    },
    subtitle: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.secondary,
      marginBottom: SPACING.md,
      lineHeight: LINE_HEIGHTS.normal,
    },
    content: {
      marginBottom: SPACING.md,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: UI_COLORS.border.secondary,
    },
    media: {
      width: '100%',
      height: 200,
      marginBottom: SPACING.md,
    },
  },

  // ===== SERVICE CARD COMPONENT =====
  serviceCard: {
    container: {
      backgroundColor: UI_COLORS.surface.primary,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      ...GlobalStyles.shadowSm,
      borderWidth: 1,
      borderColor: UI_COLORS.border.secondary,
    },
    featured: {
      borderColor: PREMIUM_COLORS.border.primary,
      borderWidth: 2,
      ...GlobalStyles.shadowMd,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    imageContainer: {
      position: 'relative',
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: BORDER_RADIUS.md,
      marginRight: SPACING.md,
    },
    premiumBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: PREMIUM_COLORS.badge.primary,
      borderRadius: BORDER_RADIUS.xs,
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
    },
    premiumBadgeText: {
      fontSize: 8,
      fontFamily: TYPOGRAPHY.fontFamily.primary.bold,
      color: PREMIUM_COLORS.text.primary,
      letterSpacing: 0.5,
    },
    info: {
      flex: 1,
    },
    title: {
      fontSize: FONT_SIZES.lg,
      fontFamily: TYPOGRAPHY.fontFamily.primary.semibold,
      color: UI_COLORS.text.primary,
      marginBottom: SPACING.xxs,
      fontWeight: '600',
    },
    provider: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
      color: UI_COLORS.text.secondary,
      marginBottom: SPACING.xs,
    },
    rating: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    ratingText: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
      color: UI_COLORS.text.secondary,
      marginLeft: SPACING.xxs,
    },
    category: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    categoryText: {
      fontSize: FONT_SIZES.xs,
      fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
      color: UI_COLORS.text.tertiary,
      backgroundColor: UI_COLORS.background.secondary,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xxs,
      borderRadius: BORDER_RADIUS.pill,
    },
    description: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.tertiary,
      lineHeight: LINE_HEIGHTS.normal,
      marginBottom: SPACING.md,
    },
    features: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: SPACING.md,
      gap: SPACING.xs,
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: UI_COLORS.background.secondary,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xxs,
      borderRadius: BORDER_RADIUS.sm,
    },
    featureText: {
      fontSize: FONT_SIZES.xs,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.secondary,
      marginLeft: SPACING.xxs,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    price: {
      fontSize: FONT_SIZES.xl,
      fontFamily: TYPOGRAPHY.fontFamily.primary.bold,
      color: COLORS.primary[500],
      fontWeight: '700',
    },
    priceUnit: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.tertiary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    favoriteButton: {
      padding: SPACING.sm,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: UI_COLORS.background.secondary,
    },
    favoriteButtonActive: {
      backgroundColor: SEMANTIC_COLORS.error[50],
    },
  },

  // ===== AI CONSTRUCTION PROJECT CARD =====
  projectCard: {
    container: {
      backgroundColor: UI_COLORS.surface.primary,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      ...GlobalStyles.shadowMd,
      borderLeftWidth: 4,
      borderLeftColor: CONSTRUCTION_COLORS.blueprint,
    },
    government: {
      borderLeftColor: CONSTRUCTION_COLORS.government,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    title: {
      fontSize: FONT_SIZES.lg,
      fontFamily: TYPOGRAPHY.fontFamily.primary.bold,
      color: UI_COLORS.text.primary,
      flex: 1,
      marginRight: SPACING.md,
      fontWeight: '700',
    },
    status: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.pill,
      alignSelf: 'flex-start',
    },
    statusPlanning: {
      backgroundColor: CONSTRUCTION_COLORS.concrete,
    },
    statusActive: {
      backgroundColor: CONSTRUCTION_COLORS.inProgress,
    },
    statusCompleted: {
      backgroundColor: CONSTRUCTION_COLORS.completed,
    },
    statusOnHold: {
      backgroundColor: SEMANTIC_COLORS.warning[500],
    },
    statusText: {
      fontSize: FONT_SIZES.xs,
      fontFamily: TYPOGRAPHY.fontFamily.primary.bold,
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    details: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: SPACING.md,
      gap: SPACING.lg,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailIcon: {
      marginRight: SPACING.xs,
      color: UI_COLORS.text.tertiary,
    },
    detailText: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.secondary,
    },
    budget: {
      fontSize: FONT_SIZES.xl,
      fontFamily: TYPOGRAPHY.fontFamily.primary.bold,
      color: COLORS.primary[500],
      marginBottom: SPACING.md,
      fontWeight: '700',
    },
    progress: {
      marginBottom: SPACING.md,
    },
    progressBar: {
      height: 8,
      backgroundColor: UI_COLORS.background.secondary,
      borderRadius: BORDER_RADIUS.pill,
      overflow: 'hidden',
      marginBottom: SPACING.xs,
    },
    progressFill: {
      height: '100%',
      backgroundColor: CONSTRUCTION_COLORS.inProgress,
      borderRadius: BORDER_RADIUS.pill,
    },
    progressText: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
      color: UI_COLORS.text.secondary,
      textAlign: 'right',
    },
    team: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    teamAvatars: {
      flexDirection: 'row',
      marginRight: SPACING.md,
    },
    teamAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: UI_COLORS.background.primary,
      marginLeft: -8,
    },
    teamCount: {
      fontSize: FONT_SIZES.sm,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.tertiary,
    },
    aiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CONSTRUCTION_COLORS.ai,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xxs,
      borderRadius: BORDER_RADIUS.xs,
      alignSelf: 'flex-start',
      marginBottom: SPACING.sm,
    },
    aiBadgeText: {
      fontSize: FONT_SIZES.xs,
      fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
      color: '#FFFFFF',
      marginLeft: SPACING.xxs,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
  },

  // ===== LOADING & EMPTY STATES =====
  loading: {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    spinner: {
      width: 60,
      height: 60,
    },
    text: {
      fontSize: FONT_SIZES.md,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.secondary,
      marginTop: SPACING.md,
      textAlign: 'center',
    },
    skeleton: {
      backgroundColor: UI_COLORS.background.secondary,
      borderRadius: BORDER_RADIUS.md,
    },
    skeletonText: {
      backgroundColor: UI_COLORS.background.secondary,
      borderRadius: BORDER_RADIUS.xs,
      height: FONT_SIZES.md,
      marginBottom: SPACING.xs,
    },
  },

  emptyState: {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    icon: {
      width: 120,
      height: 120,
      marginBottom: SPACING.lg,
      opacity: 0.5,
    },
    title: {
      fontSize: FONT_SIZES.xl,
      fontFamily: TYPOGRAPHY.fontFamily.primary.semibold,
      color: UI_COLORS.text.secondary,
      marginBottom: SPACING.sm,
      textAlign: 'center',
      fontWeight: '600',
    },
    description: {
      fontSize: FONT_SIZES.md,
      fontFamily: TYPOGRAPHY.fontFamily.primary.regular,
      color: UI_COLORS.text.tertiary,
      textAlign: 'center',
      lineHeight: LINE_HEIGHTS.relaxed,
      marginBottom: SPACING.lg,
      maxWidth: 300,
    },
    action: {
      marginTop: SPACING.md,
    },
  },

  // ===== ACCESSIBILITY & UTILITY STYLES =====
  accessibility: {
    screenReaderOnly: {
      position: 'absolute',
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    },
    focusRing: {
      borderWidth: 2,
      borderColor: UI_COLORS.border.focused,
      borderRadius: BORDER_RADIUS.sm,
    },
    highContrast: {
      borderWidth: 2,
      borderColor: UI_COLORS.text.primary,
    },
  },

  // ===== RESPONSIVE UTILITIES =====
  responsive: {
    small: {
      padding: SPACING.sm,
      fontSize: FONT_SIZES.sm,
    },
    medium: {
      padding: SPACING.md,
      fontSize: FONT_SIZES.md,
    },
    large: {
      padding: SPACING.lg,
      fontSize: FONT_SIZES.lg,
    },
    hiddenOnSmall: {
      display: IS_SMALL_DEVICE ? 'none' : 'flex',
    },
    visibleOnSmall: {
      display: IS_SMALL_DEVICE ? 'flex' : 'none',
    },
  },
});

/**
 * Advanced Component Style Utilities
 */
export const ComponentStyleUtils = {
  // Create responsive style based on device size
  createResponsiveStyle: (small, medium, large) => {
    if (IS_SMALL_DEVICE) return small;
    if (IS_LARGE_DEVICE) return large;
    return medium;
  },

  // Generate dynamic shadow based on elevation
  generateShadow: (elevation) => {
    const height = elevation * 0.5;
    const opacity = 0.1 + (elevation * 0.01);
    
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height },
      shadowOpacity: Math.min(opacity, 0.3),
      shadowRadius: elevation * 0.8,
      elevation,
    };
  },

  // Create gradient background style
  createGradient: (colors, direction = 'to right') => {
    return {
      backgroundImage: `linear-gradient(${direction}, ${colors.join(', ')})`,
    };
  },

  // Get worker category style with proper contrast
  getWorkerCategoryStyle: (category) => {
    const backgroundColor = WORKER_CATEGORY_COLORS[category]?.background || COLORS.neutral[500];
    const textColor = WORKER_CATEGORY_COLORS[category]?.text || '#FFFFFF';
    
    return {
      container: {
        backgroundColor,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.pill,
        alignSelf: 'flex-start',
        marginRight: SPACING.xs,
        marginBottom: SPACING.xs,
        ...GlobalStyles.shadowXs,
      },
      text: {
        fontSize: FONT_SIZES.xs,
        fontFamily: TYPOGRAPHY.fontFamily.primary.medium,
        color: textColor,
        textTransform: 'capitalize',
        fontWeight: '500',
      },
    };
  },

  // Get project status style
  getProjectStatusStyle: (status) => {
    const statusStyles = {
      planning: {
        backgroundColor: CONSTRUCTION_COLORS.concrete,
        color: '#FFFFFF',
      },
      active: {
        backgroundColor: CONSTRUCTION_COLORS.inProgress,
        color: '#FFFFFF',
      },
      onHold: {
        backgroundColor: SEMANTIC_COLORS.warning[500],
        color: '#FFFFFF',
      },
      completed: {
        backgroundColor: CONSTRUCTION_COLORS.completed,
        color: '#FFFFFF',
      },
      cancelled: {
        backgroundColor: SEMANTIC_COLORS.error[500],
        color: '#FFFFFF',
      },
    };

    return statusStyles[status] || statusStyles.planning;
  },

  // Compose multiple styles with proper merging
  composeStyles: (...styles) => {
    return StyleSheet.flatten(styles.filter(style => style != null));
  },

  // Create animation-ready styles
  createAnimatedStyle: (baseStyle, animatedValues) => {
    return {
      ...baseStyle,
      transform: animatedValues.transform || [],
      opacity: animatedValues.opacity || 1,
    };
  },

  // Generate responsive font size
  responsiveFontSize: (baseSize) => {
    const multiplier = IS_SMALL_DEVICE ? 0.9 : IS_LARGE_DEVICE ? 1.1 : 1;
    return baseSize * multiplier;
  },

  // Create pressable state styles
  createPressableStyle: (baseStyle, pressedStyle) => {
    return {
      ...baseStyle,
      pressed: pressedStyle,
    };
  },
};

/**
 * Dark Theme Component Styles
 */
export const DarkThemeComponentStyles = StyleSheet.create({
  // Override component styles for dark theme
  navbar: {
    container: {
      ...ComponentStyles.navbar.container,
      backgroundColor: UI_COLORS.dark.background.primary,
      borderBottomColor: UI_COLORS.dark.border.primary,
    },
    title: {
      ...ComponentStyles.navbar.title,
      color: UI_COLORS.dark.text.primary,
    },
  },
  
  card: {
    container: {
      ...ComponentStyles.card.container,
      backgroundColor: UI_COLORS.dark.surface.primary,
    },
    elevated: {
      ...ComponentStyles.card.elevated,
      backgroundColor: UI_COLORS.dark.surface.primary,
    },
    outline: {
      ...ComponentStyles.card.outline,
      backgroundColor: UI_COLORS.dark.surface.primary,
      borderColor: UI_COLORS.dark.border.primary,
    },
  },

  input: {
    field: {
      ...ComponentStyles.input.field,
      backgroundColor: UI_COLORS.dark.background.primary,
      borderColor: UI_COLORS.dark.border.primary,
      color: UI_COLORS.dark.text.primary,
    },
    label: {
      ...ComponentStyles.input.label,
      color: UI_COLORS.dark.text.secondary,
    },
  },

  // Add more dark theme overrides as needed
});

export default ComponentStyles;