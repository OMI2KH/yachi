// constants/sizes.js

/**
 * ENTERPRISE-LEVEL SIZE CONSTANTS SYSTEM
 * Yachi Mobile App - Complete Design Token System
 * Optimized for Ethiopian market devices and accessibility standards
 */

import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// DEVICE CLASSIFICATION SYSTEM
// =============================================================================

export const DEVICE_SIZES = {
  // Raw dimensions
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_ASPECT_RATIO: SCREEN_WIDTH / SCREEN_HEIGHT,
  
  // Ethiopian market device classification
  IS_EXTRA_SMALL: SCREEN_WIDTH < 360,      // Common small Android devices
  IS_SMALL: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 375, // iPhone SE, small Android
  IS_MEDIUM: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414, // iPhone 6-11, medium Android
  IS_LARGE: SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768,  // iPhone Plus, large Android
  IS_TABLET: SCREEN_WIDTH >= 768,         // iPad, Android tablets
  IS_LARGE_TABLET: SCREEN_WIDTH >= 1024,  // iPad Pro
  
  // Height classifications for scroll optimization
  IS_SHORT: SCREEN_HEIGHT < 667,
  IS_MEDIUM_HEIGHT: SCREEN_HEIGHT >= 667 && SCREEN_HEIGHT < 736,
  IS_TALL: SCREEN_HEIGHT >= 736 && SCREEN_HEIGHT < 812,
  IS_EXTRA_TALL: SCREEN_HEIGHT >= 812,
  
  // Platform classification
  IS_IOS: Platform.OS === 'ios',
  IS_ANDROID: Platform.OS === 'android',
  IS_WEB: Platform.OS === 'web',
  
  // Status bar management
  STATUS_BAR_HEIGHT: Platform.select({
    ios: Platform.select({
      default: 44,
      iPhoneX: 44,
    }),
    android: StatusBar.currentHeight || 28,
    default: 0,
  }),
  
  // Bottom safe area (for iPhone X+ and modern Android)
  BOTTOM_SAFE_AREA: Platform.select({
    ios: Platform.select({
      iPhoneX: 34,
      default: 0,
    }),
    android: 0,
    default: 0,
  }),
};

// =============================================================================
// ENTERPRISE SPACING SYSTEM (8pt Grid)
// =============================================================================

export const SPACING = {
  // Atomic spacing units
  _0: 0,
  _1: 1,
  _2: 2,
  _4: 4,
  _6: 6,
  _8: 8,
  _12: 12,
  _16: 16,
  _20: 20,
  _24: 24,
  _28: 28,
  _32: 32,
  _40: 40,
  _48: 48,
  _56: 56,
  _64: 64,
  _72: 72,
  _80: 80,
  _96: 96,
  _128: 128,
  
  // Semantic spacing tokens
  SCREEN_PADDING: Platform.select({
    ios: DEVICE_SIZES.IS_TABLET ? 32 : 20,
    android: DEVICE_SIZES.IS_TABLET ? 28 : 16,
    default: 20,
  }),
  
  SECTION_VERTICAL: DEVICE_SIZES.IS_TABLET ? 40 : 24,
  SECTION_HORIZONTAL: DEVICE_SIZES.IS_TABLET ? 32 : 20,
  
  CARD_PADDING: Platform.select({
    ios: 20,
    android: 16,
    default: 16,
  }),
  
  BUTTON_PADDING: {
    horizontal: 24,
    vertical: 12,
  },
  
  INPUT_PADDING: Platform.select({
    ios: 16,
    android: 12,
    default: 14,
  }),
  
  GRID_GUTTER: DEVICE_SIZES.IS_TABLET ? 24 : 16,
  
  // Safe area management
  SAFE_AREA: {
    top: DEVICE_SIZES.STATUS_BAR_HEIGHT + 8,
    bottom: DEVICE_SIZES.BOTTOM_SAFE_AREA + 16,
    horizontal: Platform.select({
      ios: 20,
      android: 16,
      default: 20,
    }),
  },
};

// =============================================================================
// BORDER RADIUS SYSTEM
// =============================================================================

export const BORDER_RADIUS = {
  // Scale
  NONE: 0,
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  XXL: 20,
  XXXL: 24,
  PILL: 9999,
  CIRCLE: 9999,
  
  // Semantic tokens
  BUTTON: Platform.select({
    ios: 12,
    android: 8,
    default: 10,
  }),
  
  CARD: Platform.select({
    ios: 16,
    android: 12,
    default: 14,
  }),
  
  INPUT: Platform.select({
    ios: 12,
    android: 8,
    default: 10,
  }),
  
  MODAL: Platform.select({
    ios: 20,
    android: 16,
    default: 18,
  }),
  
  AVATAR: 9999,
  BADGE: 9999,
  CHIP: 9999,
  
  // Ethiopian design patterns
  ETHIOPIAN_CARD: 12,
  ETHIOPIAN_MODAL: 16,
};

// =============================================================================
// TYPOGRAPHY SYSTEM (Accessibility First)
// =============================================================================

export const FONT_SIZES = {
  // Text scale (WCAG compliant)
  DISPLAY_XL: DEVICE_SIZES.IS_TABLET ? 48 : 40,
  DISPLAY_LG: DEVICE_SIZES.IS_TABLET ? 40 : 32,
  DISPLAY_MD: DEVICE_SIZES.IS_TABLET ? 32 : 28,
  DISPLAY_SM: DEVICE_SIZES.IS_TABLET ? 28 : 24,
  
  HEADING_XL: DEVICE_SIZES.IS_TABLET ? 24 : 22,
  HEADING_LG: DEVICE_SIZES.IS_TABLET ? 22 : 20,
  HEADING_MD: DEVICE_SIZES.IS_TABLET ? 20 : 18,
  HEADING_SM: DEVICE_SIZES.IS_TABLET ? 18 : 16,
  HEADING_XS: DEVICE_SIZES.IS_TABLET ? 16 : 14,
  
  BODY_XL: DEVICE_SIZES.IS_TABLET ? 18 : 16,
  BODY_LG: DEVICE_SIZES.IS_TABLET ? 16 : 15,
  BODY_MD: DEVICE_SIZES.IS_TABLET ? 15 : 14,
  BODY_SM: DEVICE_SIZES.IS_TABLET ? 14 : 13,
  BODY_XS: DEVICE_SIZES.IS_TABLET ? 13 : 12,
  BODY_XXS: DEVICE_SIZES.IS_TABLET ? 12 : 11,
  
  // Functional sizes
  BUTTON_LG: DEVICE_SIZES.IS_TABLET ? 18 : 16,
  BUTTON_MD: DEVICE_SIZES.IS_TABLET ? 16 : 14,
  BUTTON_SM: DEVICE_SIZES.IS_TABLET ? 14 : 13,
  
  LABEL_LG: DEVICE_SIZES.IS_TABLET ? 16 : 14,
  LABEL_MD: DEVICE_SIZES.IS_TABLET ? 14 : 13,
  LABEL_SM: DEVICE_SIZES.IS_TABLET ? 13 : 12,
  
  CAPTION: DEVICE_SIZES.IS_TABLET ? 12 : 11,
  MICRO: DEVICE_SIZES.IS_TABLET ? 11 : 10,
  
  // Platform optimization
  PLATFORM: Platform.select({
    ios: {
      body: 17,
      caption: 15,
    },
    android: {
      body: 16,
      caption: 14,
    },
    default: {
      body: 16,
      caption: 14,
    },
  }),
};

export const LINE_HEIGHTS = {
  // Relative line heights
  TIGHT: 1.2,
  NORMAL: 1.4,
  RELAXED: 1.6,
  LOOSE: 1.8,
  
  // Absolute line heights (for precise control)
  DISPLAY_XL: DEVICE_SIZES.IS_TABLET ? 56 : 48,
  DISPLAY_LG: DEVICE_SIZES.IS_TABLET ? 48 : 40,
  DISPLAY_MD: DEVICE_SIZES.IS_TABLET ? 40 : 34,
  DISPLAY_SM: DEVICE_SIZES.IS_TABLET ? 34 : 30,
  
  HEADING_XL: DEVICE_SIZES.IS_TABLET ? 32 : 28,
  HEADING_LG: DEVICE_SIZES.IS_TABLET ? 28 : 26,
  HEADING_MD: DEVICE_SIZES.IS_TABLET ? 26 : 24,
  HEADING_SM: DEVICE_SIZES.IS_TABLET ? 24 : 22,
  HEADING_XS: DEVICE_SIZES.IS_TABLET ? 22 : 20,
  
  BODY_XL: DEVICE_SIZES.IS_TABLET ? 26 : 24,
  BODY_LG: DEVICE_SIZES.IS_TABLET ? 24 : 22,
  BODY_MD: DEVICE_SIZES.IS_TABLET ? 22 : 20,
  BODY_SM: DEVICE_SIZES.IS_TABLET ? 20 : 18,
  BODY_XS: DEVICE_SIZES.IS_TABLET ? 18 : 16,
};

// =============================================================================
// ICON SYSTEM
// =============================================================================

export const ICON_SIZES = {
  // Scale
  XXS: 12,
  XS: 16,
  SM: 20,
  MD: 24,
  LG: 28,
  XL: 32,
  XXL: 40,
  XXXL: 48,
  MASSIVE: 64,
  
  // Semantic tokens
  TAB_BAR: 24,
  NAVIGATION: 20,
  BUTTON_SM: 16,
  BUTTON_MD: 20,
  BUTTON_LG: 24,
  
  AVATAR_XS: 24,
  AVATAR_SM: 32,
  AVATAR_MD: 48,
  AVATAR_LG: 64,
  AVATAR_XL: 80,
  AVATAR_XXL: 96,
  
  PAYMENT: 32,
  SOCIAL: 20,
  RATING: Platform.select({
    ios: 20,
    android: 18,
    default: 20,
  }),
  
  // Ethiopian payment providers
  ETHIOPIAN_PAYMENT: 36,
};

// =============================================================================
// COMPONENT SIZES SYSTEM
// =============================================================================

export const BUTTON_SIZES = {
  XS: {
    height: 32,
    paddingHorizontal: SPACING._12,
    fontSize: FONT_SIZES.BODY_XS,
    iconSize: ICON_SIZES.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  SM: {
    height: 40,
    paddingHorizontal: SPACING._16,
    fontSize: FONT_SIZES.BODY_SM,
    iconSize: ICON_SIZES.SM,
    borderRadius: BORDER_RADIUS.MD,
  },
  MD: {
    height: 48,
    paddingHorizontal: SPACING._20,
    fontSize: FONT_SIZES.BODY_MD,
    iconSize: ICON_SIZES.MD,
    borderRadius: BORDER_RADIUS.BUTTON,
  },
  LG: {
    height: 56,
    paddingHorizontal: SPACING._24,
    fontSize: FONT_SIZES.BODY_LG,
    iconSize: ICON_SIZES.LG,
    borderRadius: BORDER_RADIUS.LG,
  },
  XL: {
    height: 64,
    paddingHorizontal: SPACING._28,
    fontSize: FONT_SIZES.BODY_XL,
    iconSize: ICON_SIZES.XL,
    borderRadius: BORDER_RADIUS.XL,
  },
};

export const INPUT_SIZES = {
  SM: {
    height: 40,
    paddingHorizontal: SPACING._12,
    fontSize: FONT_SIZES.BODY_SM,
    iconSize: ICON_SIZES.SM,
    borderRadius: BORDER_RADIUS.INPUT,
  },
  MD: {
    height: 48,
    paddingHorizontal: SPACING._16,
    fontSize: FONT_SIZES.BODY_MD,
    iconSize: ICON_SIZES.MD,
    borderRadius: BORDER_RADIUS.INPUT,
  },
  LG: {
    height: 56,
    paddingHorizontal: SPACING._20,
    fontSize: FONT_SIZES.BODY_LG,
    iconSize: ICON_SIZES.LG,
    borderRadius: BORDER_RADIUS.INPUT,
  },
};

export const CARD_SIZES = {
  SM: {
    padding: SPACING._12,
    borderRadius: BORDER_RADIUS.MD,
  },
  MD: {
    padding: SPACING._16,
    borderRadius: BORDER_RADIUS.LG,
  },
  LG: {
    padding: SPACING._20,
    borderRadius: BORDER_RADIUS.XL,
  },
  XL: {
    padding: SPACING._24,
    borderRadius: BORDER_RADIUS.XXL,
  },
};

// =============================================================================
// LAYOUT SYSTEM
// =============================================================================

export const LAYOUT = {
  // Navigation
  HEADER_HEIGHT: Platform.select({
    ios: 44,
    android: 56,
    default: 50,
  }),
  
  TAB_BAR_HEIGHT: Platform.select({
    ios: DEVICE_SIZES.IS_TABLET ? 70 : 60,
    android: 60,
    default: 60,
  }),
  
  BOTTOM_SHEET_HANDLE: 4,
  BOTTOM_SHEET_RADIUS: 20,
  
  // Container system
  CONTAINER_SM: 320,
  CONTAINER_MD: 480,
  CONTAINER_LG: 768,
  CONTAINER_XL: 1024,
  CONTAINER_FULL: SCREEN_WIDTH,
  
  // Grid system
  GRID_COLUMNS: DEVICE_SIZES.IS_TABLET ? 4 : 2,
  GRID_GUTTER: SPACING.GRID_GUTTER,
  
  // Modal system
  MODAL_SM: SCREEN_WIDTH * 0.8,
  MODAL_MD: SCREEN_WIDTH * 0.85,
  MODAL_LG: SCREEN_WIDTH * 0.9,
  MODAL_XL: SCREEN_WIDTH * 0.95,
  MODAL_FULL: SCREEN_WIDTH,
  
  // Ethiopian market specific
  ETHIOPIAN_MODAL: SCREEN_WIDTH * 0.88,
};

// =============================================================================
// IMAGE SIZE SYSTEM
// =============================================================================

export const IMAGE_SIZES = {
  // Avatar system
  AVATAR_XXS: 24,
  AVATAR_XS: 32,
  AVATAR_SM: 40,
  AVATAR_MD: 48,
  AVATAR_LG: 64,
  AVATAR_XL: 80,
  AVATAR_XXL: 96,
  AVATAR_HERO: 120,
  
  // Thumbnail system
  THUMBNAIL_SM: 60,
  THUMBNAIL_MD: 80,
  THUMBNAIL_LG: 100,
  THUMBNAIL_XL: 120,
  
  // Service images
  SERVICE_CARD: DEVICE_SIZES.IS_TABLET ? 140 : 120,
  SERVICE_DETAIL: SCREEN_WIDTH - SPACING.SCREEN_PADDING * 2,
  SERVICE_GALLERY: (SCREEN_WIDTH - SPACING.GRID_GUTTER * 3) / 2,
  
  // Portfolio system
  PORTFOLIO_GRID: (SCREEN_WIDTH - SPACING.GRID_GUTTER * 3) / 2,
  PORTFOLIO_DETAIL: SCREEN_WIDTH,
  
  // Cover images
  COVER_SM: 120,
  COVER_MD: 160,
  COVER_LG: 200,
  COVER_PROFILE: 200,
  COVER_HERO: 280,
};

// =============================================================================
// SPECIALIZED COMPONENT SIZES
// =============================================================================

export const COMPONENT_SIZES = {
  // Search system
  SEARCH_BAR: {
    height: 48,
    borderRadius: BORDER_RADIUS.PILL,
    iconSize: ICON_SIZES.MD,
  },
  
  // Rating system
  RATING: {
    XS: 12,
    SM: 16,
    MD: 20,
    LG: 24,
    XL: 28,
  },
  
  // Badge system
  BADGE: {
    XS: { height: 16, paddingHorizontal: SPACING._4, fontSize: FONT_SIZES.MICRO },
    SM: { height: 20, paddingHorizontal: SPACING._6, fontSize: FONT_SIZES.BODY_XXS },
    MD: { height: 24, paddingHorizontal: SPACING._8, fontSize: FONT_SIZES.BODY_XS },
    LG: { height: 28, paddingHorizontal: SPACING._12, fontSize: FONT_SIZES.BODY_SM },
  },
  
  // Chip system
  CHIP: {
    SM: { height: 28, paddingHorizontal: SPACING._8, fontSize: FONT_SIZES.BODY_XS },
    MD: { height: 32, paddingHorizontal: SPACING._12, fontSize: FONT_SIZES.BODY_SM },
    LG: { height: 36, paddingHorizontal: SPACING._16, fontSize: FONT_SIZES.BODY_MD },
  },
  
  // Progress system
  PROGRESS: {
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
  },
  
  // Divider system
  DIVIDER: {
    SM: 1,
    MD: 2,
    LG: 4,
  },
};

// =============================================================================
// ETHIOPIAN MARKET SPECIFIC SIZES
// =============================================================================

export const ETHIOPIAN_SIZES = {
  // Payment provider logos (optimized for Ethiopian UI)
  PAYMENT_LOGOS: {
    CHAPA: { width: 80, height: 32 },
    TELEBIRR: { width: 90, height: 36 },
    CBE_BIRR: { width: 85, height: 34 },
    AMOLE: { width: 75, height: 30 },
  },
  
  // Government document standards
  DOCUMENTS: {
    ID_CARD: { width: 300, height: 190 }, // Ethiopian ID standard
    BUSINESS_LICENSE: { width: 400, height: 280 },
    TIN_CERTIFICATE: { width: 350, height: 250 },
  },
  
  // Construction industry standards
  CONSTRUCTION: {
    BLUEPRINT_THUMBNAIL: { width: 200, height: 150 },
    BLUEPRINT_DETAIL: { width: 400, height: 300 },
    PROGRESS_PHOTO: { width: 300, height: 200 },
    SITE_PHOTO: { width: 320, height: 240 },
  },
  
  // Ethiopian calendar component
  CALENDAR: {
    DAY_SIZE: 40,
    MONTH_HEADER: 48,
  },
};

// =============================================================================
// ANIMATION & LOADING SIZES
// =============================================================================

export const ANIMATION_SIZES = {
  // Loading indicators
  LOADING: {
    XS: 16,
    SM: 24,
    MD: 32,
    LG: 48,
    XL: 64,
    XXL: 80,
  },
  
  // Skeleton loading
  SKELETON: {
    TEXT_XS: 12,
    TEXT_SM: 14,
    TEXT_MD: 16,
    TEXT_LG: 20,
    TEXT_XL: 24,
    AVATAR: IMAGE_SIZES.AVATAR_MD,
    CARD: 120,
    IMAGE: 200,
  },
  
  // Lottie animations
  LOTTIE: {
    XS: 48,
    SM: 80,
    MD: 120,
    LG: 160,
    XL: 200,
    XXL: 280,
    HERO: 320,
  },
  
  // Progress indicators
  PROGRESS_INDICATOR: {
    SM: 40,
    MD: 60,
    LG: 80,
    XL: 100,
  },
};

// =============================================================================
// ENTERPRISE RESPONSIVE UTILITIES
// =============================================================================

export const Responsive = {
  // Scale based on device size and platform
  scale: (size) => {
    let scaledSize = size;
    
    // Device size scaling
    if (DEVICE_SIZES.IS_EXTRA_SMALL) scaledSize *= 0.85;
    else if (DEVICE_SIZES.IS_SMALL) scaledSize *= 0.9;
    else if (DEVICE_SIZES.IS_LARGE) scaledSize *= 1.05;
    else if (DEVICE_SIZES.IS_TABLET) scaledSize *= 1.15;
    else if (DEVICE_SIZES.IS_LARGE_TABLET) scaledSize *= 1.25;
    
    // Platform scaling
    if (DEVICE_SIZES.IS_ANDROID) scaledSize *= 0.95;
    
    return Math.round(scaledSize);
  },
  
  // Font scaling with accessibility consideration
  fontScale: (size) => {
    const baseSize = Responsive.scale(size);
    return Platform.select({
      ios: baseSize,
      android: Math.max(baseSize - 1, 10), // Slightly smaller on Android
      default: baseSize,
    });
  },
  
  // Space scaling for layout
  spaceScale: (space) => {
    if (DEVICE_SIZES.IS_EXTRA_SMALL) return Math.max(space - 2, 2);
    if (DEVICE_SIZES.IS_TABLET) return space + 4;
    return space;
  },
  
  // Responsive container system
  container: (type = 'md') => {
    const containers = {
      sm: Math.min(LAYOUT.CONTAINER_SM, SCREEN_WIDTH - SPACING.SCREEN_PADDING * 2),
      md: Math.min(LAYOUT.CONTAINER_MD, SCREEN_WIDTH - SPACING.SCREEN_PADDING * 2),
      lg: Math.min(LAYOUT.CONTAINER_LG, SCREEN_WIDTH - SPACING.SCREEN_PADDING * 2),
      xl: Math.min(LAYOUT.CONTAINER_XL, SCREEN_WIDTH - SPACING.SCREEN_PADDING * 2),
      full: SCREEN_WIDTH - SPACING.SCREEN_PADDING * 2,
    };
    return containers[type];
  },
  
  // Grid calculation for Ethiopian market layouts
  grid: (columns = LAYOUT.GRID_COLUMNS, gutter = SPACING.GRID_GUTTER) => {
    const totalGutter = gutter * (columns - 1);
    const availableWidth = SCREEN_WIDTH - (SPACING.SCREEN_PADDING * 2);
    return (availableWidth - totalGutter) / columns;
  },
  
  // Safe area management
  safeArea: (type = 'all') => {
    const areas = {
      top: SPACING.SAFE_AREA.top,
      bottom: SPACING.SAFE_AREA.bottom,
      horizontal: SPACING.SAFE_AREA.horizontal,
      all: SPACING.SAFE_AREA,
    };
    return areas[type];
  },
  
  // Orientation detection
  isLandscape: () => SCREEN_WIDTH > SCREEN_HEIGHT,
  isPortrait: () => SCREEN_WIDTH <= SCREEN_HEIGHT,
  
  // Ethiopian market specific scaling
  ethiopianScale: (size, type = 'general') => {
    const baseSize = Responsive.scale(size);
    
    // Ethiopian design patterns might need different scaling
    if (type === 'payment') return baseSize * 1.1; // Payment elements slightly larger
    if (type === 'document') return baseSize * 0.95; // Documents might need compact sizing
    
    return baseSize;
  },
};

// =============================================================================
// ENTERPRISE EXPORT SYSTEM
// =============================================================================

export default {
  // Core systems
  DEVICE_SIZES,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  LINE_HEIGHTS,
  ICON_SIZES,
  
  // Component systems
  BUTTON_SIZES,
  INPUT_SIZES,
  CARD_SIZES,
  LAYOUT,
  IMAGE_SIZES,
  COMPONENT_SIZES,
  
  // Market specific
  ETHIOPIAN_SIZES,
  ANIMATION_SIZES,
  
  // Utilities
  Responsive,
  
  // Feature flags for size management
  FEATURES: {
    CONSTRUCTION_MODE: true,
    GOVERNMENT_PORTAL: true,
    AI_MATCHING: true,
    PREMIUM_FEATURES: true,
    ETHIOPIAN_PAYMENTS: true,
  },
};