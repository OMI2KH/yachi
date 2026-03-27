// utils/constants.js
/**
 * Enterprise Constants for Yachi Platform
 * Centralized constants for Ethiopian service marketplace
 * Version: 2.0.0
 */

// ===== PLATFORM CONFIGURATION =====
export const PLATFORM_CONFIG = {
  NAME: 'Yachi',
  DISPLAY_NAME: 'Yachi - Ethiopian Service Marketplace',
  VERSION: '2.0.0',
  BUILD_NUMBER: '2024.1.0',
  SUPPORT_EMAIL: 'support@yachi.et',
  SUPPORT_PHONE: '+251911234567',
  WEBSITE: 'https://yachi.et',
  APP_STORE_LINK: 'https://apps.apple.com/et/app/yachi',
  PLAY_STORE_LINK: 'https://play.google.com/store/apps/details?id=et.yachi.app',
};

// ===== ETHIOPIAN SPECIFIC CONSTANTS =====
export const ETHIOPIAN_CONSTANTS = {
  // Country Information
  COUNTRY: {
    NAME: 'Ethiopia',
    CODE: 'ET',
    PHONE_CODE: '+251',
    CURRENCY: 'ETB',
    CURRENCY_SYMBOL: 'Br',
    TIMEZONE: 'Africa/Addis_Ababa',
    LANGUAGE: {
      PRIMARY: 'am',
      SUPPORTED: ['am', 'en', 'om'],
    },
  },

  // Major Cities
  CITIES: {
    ADDIS_ABABA: {
      id: 'addis_ababa',
      name: 'Addis Ababa',
      coordinates: { latitude: 9.0054, longitude: 38.7636 },
      zones: ['Bole', 'Kirkos', 'Arada', 'Lideta', 'Yeka', 'Nifas Silk', 'Kolfe'],
    },
    DIRE_DAWA: {
      id: 'dire_dawa',
      name: 'Dire Dawa',
      coordinates: { latitude: 9.5892, longitude: 41.8662 },
    },
    MEKELLE: {
      id: 'mekelle',
      name: 'Mekelle',
      coordinates: { latitude: 13.4963, longitude: 39.4752 },
    },
    GONDAR: {
      id: 'gondar',
      name: 'Gondar',
      coordinates: { latitude: 12.6063, longitude: 37.4574 },
    },
    BAHIR_DAR: {
      id: 'bahir_dar',
      name: 'Bahir Dar',
      coordinates: { latitude: 11.5742, longitude: 37.3614 },
    },
    HAWASSA: {
      id: 'hawassa',
      name: 'Hawassa',
      coordinates: { latitude: 7.0476, longitude: 38.4912 },
    },
    JIMMA: {
      id: 'jimma',
      name: 'Jimma',
      coordinates: { latitude: 7.6733, longitude: 36.8344 },
    },
    ADDAMA: {
      id: 'addama',
      name: 'Addama',
      coordinates: { latitude: 8.5431, longitude: 39.2683 },
    },
  },

  // Ethiopian Holidays (for scheduling)
  HOLIDAYS: {
    ENKUTATASH: '09-11', // Ethiopian New Year
    MESKEL: '09-27',     // Finding of the True Cross
    CHRISTMAS: '01-07',  // Ethiopian Christmas
    EPIPHANY: '01-19',   // Timkat
    VICTORY_DAY: '05-05',// Patriots Victory Day
    EASTER: 'variable',  // Computed annually
  },

  // Business Hours (Ethiopian time)
  BUSINESS_HOURS: {
    START: '08:00',
    END: '18:00',
    BREAK_START: '12:00',
    BREAK_END: '13:00',
  },
};

// ===== USER ROLES AND PERMISSIONS =====
export const USER_ROLES = {
  CLIENT: 'client',
  SERVICE_PROVIDER: 'service_provider',
  GOVERNMENT_OFFICIAL: 'government_official',
  CONSTRUCTION_MANAGER: 'construction_manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const USER_PERMISSIONS = {
  [USER_ROLES.CLIENT]: [
    'book_services',
    'view_providers',
    'make_payments',
    'write_reviews',
    'manage_bookings',
    'view_construction_projects',
  ],
  [USER_ROLES.SERVICE_PROVIDER]: [
    'create_services',
    'manage_availability',
    'accept_bookings',
    'manage_portfolio',
    'receive_payments',
    'withdraw_earnings',
  ],
  [USER_ROLES.GOVERNMENT_OFFICIAL]: [
    'create_government_projects',
    'manage_construction_teams',
    'view_analytics',
    'approve_projects',
    'manage_budgets',
  ],
  [USER_ROLES.CONSTRUCTION_MANAGER]: [
    'manage_construction_projects',
    'assign_workers',
    'track_progress',
    'manage_materials',
    'approve_work',
  ],
  [USER_ROLES.ADMIN]: [
    'manage_users',
    'moderate_content',
    'view_analytics',
    'manage_payments',
    'system_configuration',
  ],
  [USER_ROLES.SUPER_ADMIN]: [
    '*', // All permissions
  ],
};

// ===== SERVICE CATEGORIES AND SUBCATEGORIES =====
export const SERVICE_CATEGORIES = {
  CONSTRUCTION: {
    id: 'construction',
    name: 'Construction',
    icon: '🏗️',
    subcategories: {
      NEW_CONSTRUCTION: {
        id: 'new_construction',
        name: 'New Building Construction',
        workerTypes: ['architect', 'engineer', 'mason', 'steel_fixer', 'laborer'],
      },
      RENOVATION: {
        id: 'renovation',
        name: 'Renovation & Remodeling',
        workerTypes: ['carpenter', 'painter', 'tiler', 'electrician', 'plumber'],
      },
      FINISHING: {
        id: 'finishing',
        name: 'Building Finishing',
        workerTypes: ['painter', 'tiler', 'carpenter', 'electrician', 'plumber'],
      },
      GOVERNMENT_PROJECTS: {
        id: 'government_projects',
        name: 'Government Infrastructure',
        workerTypes: ['project_manager', 'engineer', 'architect', 'foreman'],
      },
    },
  },
  HOME_SERVICES: {
    id: 'home_services',
    name: 'Home Services',
    icon: '🏠',
    subcategories: {
      PLUMBING: { id: 'plumbing', name: 'Plumbing', workerTypes: ['plumber'] },
      ELECTRICAL: { id: 'electrical', name: 'Electrical', workerTypes: ['electrician'] },
      CLEANING: { id: 'cleaning', name: 'Cleaning', workerTypes: ['cleaner'] },
      PAINTING: { id: 'painting', name: 'Painting', workerTypes: ['painter'] },
      CARPENTRY: { id: 'carpentry', name: 'Carpentry', workerTypes: ['carpenter'] },
    },
  },
  MAINTENANCE: {
    id: 'maintenance',
    name: 'Maintenance & Repair',
    icon: '🔧',
    subcategories: {
      APPLIANCE_REPAIR: { id: 'appliance_repair', name: 'Appliance Repair', workerTypes: ['technician'] },
      HVAC: { id: 'hvac', name: 'HVAC Services', workerTypes: ['hvac_technician'] },
      FURNITURE_ASSEMBLY: { id: 'furniture_assembly', name: 'Furniture Assembly', workerTypes: ['assembler'] },
    },
  },
};

// ===== WORKER TYPES AND SPECIALIZATIONS =====
export const WORKER_TYPES = {
  ARCHITECT: {
    id: 'architect',
    name: 'Architect',
    category: 'professional',
    dailyRate: { min: 200000, max: 500000 }, // in cents
    skills: ['design', 'planning', 'supervision'],
  },
  ENGINEER: {
    id: 'engineer',
    name: 'Engineer',
    category: 'professional',
    dailyRate: { min: 150000, max: 400000 },
    skills: ['structural', 'electrical', 'mechanical'],
  },
  MASON: {
    id: 'mason',
    name: 'Mason',
    category: 'skilled',
    dailyRate: { min: 80000, max: 150000 },
    skills: ['brick_laying', 'concrete', 'block_work'],
  },
  CARPENTER: {
    id: 'carpenter',
    name: 'Carpenter',
    category: 'skilled',
    dailyRate: { min: 70000, max: 120000 },
    skills: ['woodwork', 'furniture', 'formwork'],
  },
  ELECTRICIAN: {
    id: 'electrician',
    name: 'Electrician',
    category: 'skilled',
    dailyRate: { min: 80000, max: 150000 },
    skills: ['wiring', 'installation', 'maintenance'],
  },
  PLUMBER: {
    id: 'plumber',
    name: 'Plumber',
    category: 'skilled',
    dailyRate: { min: 70000, max: 130000 },
    skills: ['piping', 'installation', 'repair'],
  },
  PAINTER: {
    id: 'painter',
    name: 'Painter',
    category: 'skilled',
    dailyRate: { min: 60000, max: 100000 },
    skills: ['wall_painting', 'spray_painting', 'finishing'],
  },
  STEEL_FIXER: {
    id: 'steel_fixer',
    name: 'Steel Fixer',
    category: 'skilled',
    dailyRate: { min: 70000, max: 120000 },
    skills: ['rebar_bending', 'reinforcement', 'steel_work'],
  },
  TILER: {
    id: 'tiler',
    name: 'Tiler',
    category: 'skilled',
    dailyRate: { min: 70000, max: 120000 },
    skills: ['floor_tiling', 'wall_tiling', 'pattern_work'],
  },
  CLEANER: {
    id: 'cleaner',
    name: 'Cleaner',
    category: 'labor',
    dailyRate: { min: 40000, max: 70000 },
    skills: ['cleaning', 'sanitization', 'organization'],
  },
  LABORER: {
    id: 'laborer',
    name: 'Laborer',
    category: 'labor',
    dailyRate: { min: 30000, max: 60000 },
    skills: ['general_labor', 'material_handling', 'site_cleaning'],
  },
  FOREMAN: {
    id: 'foreman',
    name: 'Foreman',
    category: 'supervisory',
    dailyRate: { min: 100000, max: 200000 },
    skills: ['supervision', 'coordination', 'quality_control'],
  },
  PROJECT_MANAGER: {
    id: 'project_manager',
    name: 'Project Manager',
    category: 'management',
    dailyRate: { min: 200000, max: 500000 },
    skills: ['project_management', 'budgeting', 'team_leadership'],
  },
};

// ===== BOOKING AND APPOINTMENT CONSTANTS =====
export const BOOKING_CONSTANTS = {
  STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no_show',
  },
  
  CANCELLATION_POLICY: {
    FREE_CANCELLATION_HOURS: 24, // Free cancellation within 24 hours
    CANCELLATION_FEE_PERCENTAGE: 20, // 20% fee for late cancellation
    NO_SHOW_FEE_PERCENTAGE: 50, // 50% fee for no-show
  },
  
  DURATION_OPTIONS: [
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: 'Full day (8 hours)' },
  ],
  
  MAX_ADVANCE_BOOKING_DAYS: 90,
  MIN_ADVANCE_BOOKING_HOURS: 2,
};

// ===== PAYMENT AND PRICING CONSTANTS =====
export const PAYMENT_CONSTANTS = {
  // Payment Providers
  PROVIDERS: {
    CHAPA: 'chapa',
    TELEBIRR: 'telebirr',
    CBE_BIRR: 'cbe_birr',
  },
  
  // Transaction Status
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  },
  
  // Fee Structure
  FEES: {
    SERVICE_FEE_PERCENTAGE: 5, // 5% platform fee
    TAX_PERCENTAGE: 15, // 15% VAT
    MIN_SERVICE_FEE: 500, // 5 ETB minimum
    WITHDRAWAL_FEE: 200, // 2 ETB withdrawal fee
  },
  
  // Currency
  CURRENCY: {
    PRIMARY: 'ETB',
    SYMBOL: 'Br',
    DECIMALS: 2,
  },
  
  // Payment Limits
  LIMITS: {
    MIN_PAYMENT_AMOUNT: 100, // 1 ETB
    MAX_PAYMENT_AMOUNT: 10000000, // 100,000 ETB
    MIN_WITHDRAWAL_AMOUNT: 1000, // 10 ETB
    MAX_WITHDRAWAL_AMOUNT: 5000000, // 50,000 ETB
  },
};

// ===== CONSTRUCTION PROJECT CONSTANTS =====
export const CONSTRUCTION_CONSTANTS = {
  PROJECT_TYPES: {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    GOVERNMENT: 'government',
    INFRASTRUCTURE: 'infrastructure',
  },
  
  PROJECT_STATUS: {
    PLANNING: 'planning',
    DESIGN: 'design',
    APPROVAL: 'approval',
    ACTIVE: 'active',
    ON_HOLD: 'on_hold',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  
  // AI Worker Matching Parameters
  AI_MATCHING: {
    SKILL_WEIGHT: 0.4,
    LOCATION_WEIGHT: 0.3,
    RATING_WEIGHT: 0.2,
    AVAILABILITY_WEIGHT: 0.1,
    MIN_MATCH_SCORE: 0.7,
    MAX_WORKERS_PER_CATEGORY: 10,
  },
  
  // Construction Standards (Ethiopian)
  STANDARDS: {
    WORKING_HOURS_PER_DAY: 8,
    OVERTIME_RATE_MULTIPLIER: 1.5,
    MIN_WORKERS_RESIDENTIAL: 3,
    MIN_WORKERS_COMMERCIAL: 5,
    MIN_WORKERS_GOVERNMENT: 10,
  },
};

// ===== PREMIUM FEATURES CONSTANTS =====
export const PREMIUM_CONSTANTS = {
  PLANS: {
    PREMIUM_BADGE: {
      id: 'premium_badge',
      name: 'Premium Badge',
      price: 20000, // 200 ETB in cents
      duration: 30, // 30 days
      features: [
        'Priority in search results',
        'Verified status badge',
        'Enhanced profile visibility',
        'Featured in category pages',
      ],
    },
    FEATURED_LISTING: {
      id: 'featured_listing',
      name: 'Featured Listing',
      price: 39900, // 399 ETB in cents
      duration: 30, // 30 days
      features: [
        'Top placement in search',
        'Highlighted listing',
        'Category featuring',
        '30-day visibility boost',
      ],
    },
  },
  
  BENEFITS: {
    SEARCH_PRIORITY_BOOST: 2.0,
    PROFILE_VISIBILITY_BOOST: 1.5,
    RESPONSE_RATE_BOOST: 1.3,
  },
};

// ===== NOTIFICATION CONSTANTS =====
export const NOTIFICATION_CONSTANTS = {
  TYPES: {
    BOOKING: 'booking',
    PAYMENT: 'payment',
    MESSAGE: 'message',
    SYSTEM: 'system',
    PROMOTIONAL: 'promotional',
    SECURITY: 'security',
  },
  
  CHANNELS: {
    PUSH: 'push',
    EMAIL: 'email',
    SMS: 'sms',
    IN_APP: 'in_app',
  },
  
  PREFERENCES: {
    ALL: 'all',
    IMPORTANT: 'important',
    NONE: 'none',
  },
};

// ===== AI AND MACHINE LEARNING CONSTANTS =====
export const AI_CONSTANTS = {
  // Matching Algorithm Constants
  MATCHING: {
    CONSTRUCTION_PROJECT: {
      SKILL_THRESHOLD: 0.8,
      LOCATION_RADIUS_KM: 50,
      EXPERIENCE_WEIGHT: 0.25,
      RATING_WEIGHT: 0.35,
      AVAILABILITY_WEIGHT: 0.20,
      PRICE_WEIGHT: 0.20,
    },
    SERVICE_PROVIDER: {
      SKILL_THRESHOLD: 0.7,
      LOCATION_RADIUS_KM: 25,
      RATING_WEIGHT: 0.4,
      RESPONSE_RATE_WEIGHT: 0.3,
      PRICE_WEIGHT: 0.3,
    },
  },
  
  // Recommendation Engine
  RECOMMENDATION: {
    SIMILAR_USERS_WEIGHT: 0.4,
    POPULAR_SERVICES_WEIGHT: 0.3,
    LOCATION_PROXIMITY_WEIGHT: 0.2,
    PRICE_AFFINITY_WEIGHT: 0.1,
  },
};

// ===== VALIDATION AND ERROR CONSTANTS =====
export const VALIDATION_CONSTANTS = {
  // User Validation
  USER: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    PHONE_REGEX: /^\+251[1-59]\d{8}$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
  },
  
  // Service Validation
  SERVICE: {
    TITLE_MIN_LENGTH: 5,
    TITLE_MAX_LENGTH: 100,
    DESCRIPTION_MIN_LENGTH: 10,
    DESCRIPTION_MAX_LENGTH: 1000,
    MIN_PRICE: 100, // 1 ETB
    MAX_PRICE: 10000000, // 100,000 ETB
  },
  
  // Booking Validation
  BOOKING: {
    NOTES_MAX_LENGTH: 500,
    MIN_ADVANCE_BOOKING_HOURS: 2,
    MAX_ADVANCE_BOOKING_DAYS: 90,
  },
};

// ===== API AND NETWORK CONSTANTS =====
export const API_CONSTANTS = {
  BASE_URL: {
    PRODUCTION: 'https://api.yachi.et/v1',
    STAGING: 'https://staging-api.yachi.et/v1',
    DEVELOPMENT: 'https://dev-api.yachi.et/v1',
  },
  
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      VERIFY: '/auth/verify',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
    },
    SERVICES: {
      LIST: '/services',
      CREATE: '/services',
      DETAIL: '/services/:id',
      UPDATE: '/services/:id',
      DELETE: '/services/:id',
      SEARCH: '/services/search',
    },
    BOOKINGS: {
      LIST: '/bookings',
      CREATE: '/bookings',
      DETAIL: '/bookings/:id',
      UPDATE: '/bookings/:id',
      CANCEL: '/bookings/:id/cancel',
    },
    PAYMENTS: {
      INITIATE: '/payments/initiate',
      VERIFY: '/payments/verify',
      HISTORY: '/payments/history',
      WITHDRAW: '/payments/withdraw',
    },
    CONSTRUCTION: {
      PROJECTS: '/construction/projects',
      AI_MATCHING: '/ai/construction/match',
      TEAM_ASSIGNMENT: '/construction/teams/assign',
    },
  },
  
  TIMEOUTS: {
    DEFAULT: 30000, // 30 seconds
    UPLOAD: 60000, // 60 seconds
    PAYMENT: 45000, // 45 seconds
  },
  
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
  },
};

// ===== STORAGE AND CACHE CONSTANTS =====
export const STORAGE_CONSTANTS = {
  KEYS: {
    AUTH_TOKEN: 'yachi_auth_token',
    USER_DATA: 'yachi_user_data',
    APP_SETTINGS: 'yachi_app_settings',
    LANGUAGE: 'yachi_language',
    THEME: 'yachi_theme',
    LOCATION: 'yachi_location',
    FAVORITES: 'yachi_favorites',
  },
  
  CACHE: {
    DURATION: {
      SHORT: 5 * 60 * 1000, // 5 minutes
      MEDIUM: 30 * 60 * 1000, // 30 minutes
      LONG: 2 * 60 * 60 * 1000, // 2 hours
      VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
    },
    KEYS: {
      SERVICES: 'cached_services',
      CATEGORIES: 'cached_categories',
      CITIES: 'cached_cities',
      CONSTRUCTION_PROJECTS: 'cached_construction_projects',
    },
  },
};

// ===== UI AND DESIGN CONSTANTS =====
export const UI_CONSTANTS = {
  // Layout
  LAYOUT: {
    HEADER_HEIGHT: 60,
    TAB_BAR_HEIGHT: 80,
    BOTTOM_SAFE_AREA: 34,
    TOP_SAFE_AREA: 44,
    CONTAINER_PADDING: 16,
    SECTION_SPACING: 24,
  },
  
  // Typography
  TYPOGRAPHY: {
    FONT_SIZES: {
      XXXS: 10,
      XXS: 12,
      XS: 14,
      SM: 16,
      MD: 18,
      LG: 20,
      XL: 24,
      XXL: 28,
      XXXL: 32,
    },
    LINE_HEIGHTS: {
      TIGHT: 1.2,
      NORMAL: 1.5,
      RELAXED: 1.75,
    },
  },
  
  // Animation
  ANIMATION: {
    DURATION: {
      SHORT: 200,
      MEDIUM: 300,
      LONG: 500,
    },
    EASING: {
      STANDARD: 'cubic-bezier(0.4, 0, 0.2, 1)',
      DECELERATE: 'cubic-bezier(0, 0, 0.2, 1)',
      ACCELERATE: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
  
  // Component Sizes
  COMPONENTS: {
    BUTTON: {
      HEIGHT: {
        SM: 36,
        MD: 44,
        LG: 52,
      },
      BORDER_RADIUS: 12,
    },
    INPUT: {
      HEIGHT: {
        SM: 40,
        MD: 48,
        LG: 56,
      },
      BORDER_RADIUS: 8,
    },
    CARD: {
      BORDER_RADIUS: 16,
      ELEVATION: 2,
    },
  },
};

// ===== ERROR CODES AND MESSAGES =====
export const ERROR_CONSTANTS = {
  // Network Errors
  NETWORK: {
    NO_INTERNET: 'NO_INTERNET',
    TIMEOUT: 'TIMEOUT',
    SERVER_ERROR: 'SERVER_ERROR',
    MAINTENANCE: 'MAINTENANCE',
  },
  
  // Auth Errors
  AUTH: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  },
  
  // Payment Errors
  PAYMENT: {
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    TRANSACTION_DECLINED: 'TRANSACTION_DECLINED',
    INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  },
  
  // Booking Errors
  BOOKING: {
    PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
    TIME_SLOT_TAKEN: 'TIME_SLOT_TAKEN',
    MIN_ADVANCE_REQUIRED: 'MIN_ADVANCE_REQUIRED',
    MAX_BOOKINGS_EXCEEDED: 'MAX_BOOKINGS_EXCEEDED',
  },
  
  // General Errors
  GENERAL: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    RATE_LIMITED: 'RATE_LIMITED',
  },
};

// ===== FEATURE FLAGS =====
export const FEATURE_FLAGS = {
  AI_CONSTRUCTION_MATCHING: true,
  GOVERNMENT_PORTAL: true,
  PREMIUM_FEATURES: true,
  MULTI_LANGUAGE: true,
  DARK_MODE: true,
  OFFLINE_MODE: false, // Coming soon
  VIDEO_CALL: false, // Coming soon
  AR_SERVICE_PREVIEW: false, // Coming soon
};

// ===== EXPORT ALL CONSTANTS =====
export default {
  PLATFORM_CONFIG,
  ETHIOPIAN_CONSTANTS,
  USER_ROLES,
  USER_PERMISSIONS,
  SERVICE_CATEGORIES,
  WORKER_TYPES,
  BOOKING_CONSTANTS,
  PAYMENT_CONSTANTS,
  CONSTRUCTION_CONSTANTS,
  PREMIUM_CONSTANTS,
  NOTIFICATION_CONSTANTS,
  AI_CONSTANTS,
  VALIDATION_CONSTANTS,
  API_CONSTANTS,
  STORAGE_CONSTANTS,
  UI_CONSTANTS,
  ERROR_CONSTANTS,
  FEATURE_FLAGS,
};

// ===== UTILITY FUNCTIONS =====

/**
 * Get worker type by ID
 * @param {string} workerTypeId 
 * @returns {Object} Worker type object
 */
export const getWorkerTypeById = (workerTypeId) => {
  return WORKER_TYPES[workerTypeId.toUpperCase()] || null;
};

/**
 * Get service category by ID
 * @param {string} categoryId 
 * @returns {Object} Service category object
 */
export const getServiceCategoryById = (categoryId) => {
  for (const category of Object.values(SERVICE_CATEGORIES)) {
    if (category.id === categoryId) {
      return category;
    }
  }
  return null;
};

/**
 * Format currency amount for display
 * @param {number} amount - Amount in cents
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @returns {string} Formatted amount
 */
export const formatCurrency = (amount, showSymbol = true) => {
  const majorUnits = amount / 100;
  const formatted = new Intl.NumberFormat('en-ET', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(majorUnits);
  
  return showSymbol ? `Br ${formatted}` : formatted;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {Object} coord1 - { latitude, longitude }
 * @param {Object} coord2 - { latitude, longitude }
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Generate a unique ID
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
export const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

/**
 * Check if a date is an Ethiopian holiday
 * @param {Date} date 
 * @returns {boolean} True if holiday
 */
export const isEthiopianHoliday = (date) => {
  const monthDay = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  return Object.values(ETHIOPIAN_CONSTANTS.HOLIDAYS).includes(monthDay);
};

/**
 * Get business status based on Ethiopian business hours
 * @returns {Object} { isOpen: boolean, nextOpen: Date }
 */
export const getBusinessStatus = () => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const [start, end] = [ETHIOPIAN_CONSTANTS.BUSINESS_HOURS.START, ETHIOPIAN_CONSTANTS.BUSINESS_HOURS.END];
  
  const isOpen = currentTime >= start && currentTime <= end;
  const isBreak = currentTime >= ETHIOPIAN_CONSTANTS.BUSINESS_HOURS.BREAK_START && 
                  currentTime <= ETHIOPIAN_CONSTANTS.BUSINESS_HOURS.BREAK_END;
  
  let nextOpen = new Date();
  if (!isOpen || isBreak) {
    nextOpen.setHours(parseInt(start.split(':')[0]), parseInt(start.split(':')[1]), 0, 0);
    if (nextOpen <= now) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
  }
  
  return {
    isOpen: isOpen && !isBreak,
    isBreak,
    nextOpen: isOpen && !isBreak ? null : nextOpen,
  };
};