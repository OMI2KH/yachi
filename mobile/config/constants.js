// constants/app.js

/**
 * ENTERPRISE-GRADE APPLICATION CONSTANTS
 * Yachi Construction & Services Platform
 * Complete Ethiopian Market Localization
 * AI-Powered Construction & Premium Features
 */

import { Dimensions, Platform, StatusBar } from 'react-native';
import { getVersion, getBuildNumber, getSystemVersion } from 'react-native-device-info';

// Device and Platform Constants
const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const isWeb = Platform.OS === 'web';

// ==================== APP METADATA & INFORMATION ====================
export const APP_INFO = {
  NAME: 'Yachi',
  DISPLAY_NAME: 'Yachi - ያቺ',
  DESCRIPTION: {
    en: 'Ethiopia\'s Premier Home Services & Construction Platform',
    am: 'የኢትዮጵያ ዋና የቤት አገልግሎት እና የግንባታ መተግበሪያ',
    om: 'Platforma Gulaaltii Manaa fi Ijaarsaa Itoophiyaa'
  },
  VERSION: getVersion(),
  BUILD_NUMBER: getBuildNumber(),
  BUNDLE_ID: {
    ios: 'com.yachi.enterprise.ios',
    android: 'com.yachi.enterprise.android',
    web: 'com.yachi.enterprise.web',
  },
  
  // Enterprise Support Information
  SUPPORT: {
    EMAIL: 'support@yachi.et',
    PHONE: '+251 911 123 456',
    WHATSAPP: '+251 911 123 456',
    WEBSITE: 'https://yachi.et',
    PRIVACY_POLICY: 'https://yachi.et/privacy',
    TERMS_OF_SERVICE: 'https://yachi.et/terms',
  },
};

// ==================== ETHIOPIAN MARKET CONSTANTS ====================
export const ETHIOPIA = {
  // Country Information
  COUNTRY: {
    NAME: 'Ethiopia',
    NAME_AMHARIC: 'ኢትዮጵያ',
    NAME_OROMO: 'Itoophiyaa',
    COUNTRY_CODE: 'ET',
    PHONE_CODE: '+251',
    CURRENCY: 'ETB',
    CURRENCY_SYMBOL: 'ብር',
    TIMEZONE: 'Africa/Addis_Ababa',
    DATE_FORMAT: 'DD/MM/YYYY',
  },

  // Ethiopian Languages Configuration
  LANGUAGES: {
    ENGLISH: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      rtl: false,
      enabled: true,
    },
    AMHARIC: {
      code: 'am',
      name: 'Amharic',
      nativeName: 'አማርኛ',
      rtl: false,
      enabled: true,
    },
    OROMO: {
      code: 'om',
      name: 'Oromo',
      nativeName: 'Oromoo',
      rtl: false,
      enabled: true,
    },
  },

  // Ethiopian Cities with Geographic Data
  CITIES: [
    {
      id: 'addis_ababa',
      name: 'Addis Ababa',
      amharic: 'አዲስ አበባ',
      oromo: 'Finfinnee',
      latitude: 9.03,
      longitude: 38.74,
      region: 'Addis Ababa',
      population: 5000000,
      serviceRadius: 50, // km
    },
    {
      id: 'dire_dawa',
      name: 'Dire Dawa',
      amharic: 'ድሬ ዳዋ',
      oromo: 'Dirree Dhawaa',
      latitude: 9.6,
      longitude: 41.87,
      region: 'Dire Dawa',
      population: 500000,
      serviceRadius: 100,
    },
    {
      id: 'mekelle',
      name: 'Mekelle',
      amharic: 'መቀሌ',
      oromo: 'Meqele',
      latitude: 13.5,
      longitude: 39.47,
      region: 'Tigray',
      population: 500000,
      serviceRadius: 100,
    },
    {
      id: 'gondar',
      name: 'Gondar',
      amharic: 'ጎንደር',
      oromo: 'Gondar',
      latitude: 12.6,
      longitude: 37.47,
      region: 'Amhara',
      population: 400000,
      serviceRadius: 80,
    },
    {
      id: 'hawassa',
      name: 'Hawassa',
      amharic: 'አዋሣ',
      oromo: 'Hawaasaa',
      latitude: 7.05,
      longitude: 38.47,
      region: 'Sidama',
      population: 400000,
      serviceRadius: 80,
    },
    {
      id: 'bahir_dar',
      name: 'Bahir Dar',
      amharic: 'ባሕር ዳር',
      oromo: 'Baahir Daar',
      latitude: 11.59,
      longitude: 37.39,
      region: 'Amhara',
      population: 300000,
      serviceRadius: 70,
    },
    {
      id: 'jimma',
      name: 'Jimma',
      amharic: 'ጅማ',
      oromo: 'Jimmaa',
      latitude: 7.67,
      longitude: 36.83,
      region: 'Oromia',
      population: 200000,
      serviceRadius: 60,
    },
    {
      id: 'addis_ababa_surrounding',
      name: 'Addis Ababa Surrounding',
      amharic: 'የአዲስ አበባ ክንዋኔ',
      oromo: 'Finfinnee naannoo',
      latitude: 9.03,
      longitude: 38.74,
      region: 'Oromia',
      population: 2000000,
      serviceRadius: 30,
    },
  ],

  // Ethiopian National Holidays (Affects Booking Availability)
  HOLIDAYS: [
    { date: '01-07', name: { en: 'Ethiopian Christmas', am: 'ገና', om: 'Ayyaana Ganna' } },
    { date: '01-19', name: { en: 'Timket', am: 'ጥምቀት', om: 'Ayyaana Timqat' } },
    { date: '03-02', name: { en: 'Adwa Victory Day', am: 'የዓድዋ ድል', om: 'Guyyaa Adwaa' } },
    { date: '04-06', name: { en: 'Ethiopian Good Friday', am: 'ስቅለት', om: 'Ayyaana Siqlet' } },
    { date: '04-08', name: { en: 'Ethiopian Easter', am: 'ፋሲካ', om: 'Ayyaana Faasikaa' } },
    { date: '05-01', name: { en: 'International Workers Day', am: 'ዓለም አቀፍ የሠራተኞች ቀን', om: 'Guyyaa Hojjettoota' } },
    { date: '05-05', name: { en: 'Ethiopian Patriots Victory Day', am: 'የአርበኞች ቀን', om: 'Guyyaa Arbanootaa' } },
    { date: '05-28', name: { en: 'Downfall of Derg', am: 'ደርግ የወደቀበት ቀን', om: 'Guyyaa Dergii' } },
    { date: '09-11', name: { en: 'Ethiopian New Year', am: 'እንቁጣጣሽ', om: 'Ayyaana Iriqu' } },
    { date: '09-27', name: { en: 'Finding of True Cross', am: 'መስቀል', om: 'Ayyaana Masqal' } },
  ],

  // Ethiopian Business Hours
  BUSINESS_HOURS: {
    START: '08:00',
    END: '18:00',
    PRAYER_BREAKS: {
      FRIDAY: '12:00-13:00',
    },
  },
};

// ==================== ENTERPRISE BUSINESS MODEL ====================
export const BUSINESS_MODEL = {
  // Commission Structure (Zero Commission as per features)
  COMMISSIONS: {
    SERVICE_PROVIDER: 0.00, // 0% commission
    CLIENT: 0.00, // 0% commission
    GOVERNMENT_PROJECTS: 0.05, // 5% for large government projects
  },

  // Premium Monetization Features
  PREMIUM: {
    BADGE: {
      ENABLED: true,
      PRICE: 200, // ETB per month
      DURATION: 30, // days
      FEATURES: [
        'verified_badge',
        'search_priority',
        'profile_featuring',
        'enhanced_visibility',
        'ai_matching_priority',
      ],
    },
    LISTING: {
      ENABLED: true,
      PRICE: 399, // ETB
      DURATION: 30, // days
      FEATURES: [
        'top_search_placement',
        'category_featuring',
        'highlighted_listing',
        'booking_conversion_boost',
        'premium_tag',
      ],
    },
  },

  // Advertisement System
  ADS: {
    ENABLED: true,
    TYPES: {
      BANNER: 'banner',
      INTERSTITIAL: 'interstitial',
      REWARDED: 'rewarded',
      NATIVE: 'native',
    },
    PLACEMENTS: {
      HOME_FEED: 'home_feed',
      SEARCH_RESULTS: 'search_results',
      SERVICE_DETAIL: 'service_detail',
      BOOKING_CONFIRMATION: 'booking_confirmation',
      PROFILE_PAGE: 'profile_page',
    },
    REVENUE_SHARE: 0.6, // 60% to service providers
  },

  // Ethiopian Payment Providers
  PAYMENT_PROVIDERS: {
    CHAPA: {
      NAME: 'Chapa',
      CODE: 'chapa',
      ENABLED: true,
      FEES: {
        PERCENTAGE: 1.5,
        FIXED: 0,
      },
      LIMITS: {
        MIN: 1,
        MAX: 100000,
        DAILY_MAX: 500000,
      },
      SUPPORTED_CURRENCIES: ['ETB'],
    },
    TELEBIRR: {
      NAME: 'Telebirr',
      CODE: 'telebirr',
      ENABLED: true,
      FEES: {
        PERCENTAGE: 0.5,
        FIXED: 0,
      },
      LIMITS: {
        MIN: 1,
        MAX: 50000,
        DAILY_MAX: 200000,
      },
      SUPPORTED_CURRENCIES: ['ETB'],
    },
    CBE_BIRR: {
      NAME: 'CBE Birr',
      CODE: 'cbe_birr',
      ENABLED: true,
      FEES: {
        PERCENTAGE: 0.5,
        FIXED: 0,
      },
      LIMITS: {
        MIN: 1,
        MAX: 50000,
        DAILY_MAX: 200000,
      },
      SUPPORTED_CURRENCIES: ['ETB'],
    },
  },
};

// ==================== SERVICE CATEGORIES (50+ ENTERPRISE CATEGORIES) ====================
export const SERVICE_CATEGORIES = {
  // Construction & Building (AI-Powered)
  CONSTRUCTION: {
    id: 'construction',
    name: { en: 'Construction', am: 'ግንባታ', om: 'Ijaarsaa' },
    icon: '🏗️',
    color: '#059669',
    aiEnabled: true,
    subcategories: [
      { id: 'new_building', name: { en: 'New Building', am: 'አዲስ ሕንፃ', om: 'Mana Haaraa' } },
      { id: 'building_finishing', name: { en: 'Building Finishing', am: 'ሕንፃ መጨረሻ', om: 'Xumura Manaa' } },
      { id: 'renovation', name: { en: 'Renovation', am: 'ጥገና', om: 'Hojiinsa' } },
      { id: 'government_infrastructure', name: { en: 'Government Infrastructure', am: 'የመንግስት መሠረተ ልማት', om: 'Qabeenya Mootummaa' } },
    ],
  },

  // Home Services
  PLUMBING: {
    id: 'plumbing',
    name: { en: 'Plumbing', am: 'መንገዶች', om: 'Meeshalee' },
    icon: '🔧',
    color: '#3B82F6',
  },
  ELECTRICAL: {
    id: 'electrical',
    name: { en: 'Electrical', am: 'ኤሌክትሪክ', om: 'Eleektirikii' },
    icon: '⚡',
    color: '#F59E0B',
  },
  CLEANING: {
    id: 'cleaning',
    name: { en: 'Cleaning', am: 'ንፅፅር', om: 'Qulqullina' },
    icon: '🧹',
    color: '#10B981',
  },

  // Professional Services
  PAINTING: {
    id: 'painting',
    name: { en: 'Painting', am: 'ቀለም', om: 'Halluu' },
    icon: '🎨',
    color: '#EF4444',
  },
  CARPENTRY: {
    id: 'carpentry',
    name: { en: 'Carpentry', am: 'ጨርቃ ጨርቅ', om: 'Mishaa' },
    icon: '🪵',
    color: '#92400E',
  },
  MASONRY: {
    id: 'masonry',
    name: { en: 'Masonry', am: 'ጡብ ሥራ', om: 'Hojii Dhoqqee' },
    icon: '🧱',
    color: '#78716C',
  },

  // Additional Categories (50+ total)
  // ... [All 50+ categories from your feature list]
};

// ==================== AI CONSTRUCTION ENTERPRISE FEATURES ====================
export const AI_CONSTRUCTION = {
  // Project Types with Ethiopian Context
  PROJECT_TYPES: {
    NEW_BUILDING: {
      id: 'new_building',
      name: { en: 'New Building Construction', am: 'አዲስ ሕንፃ ግንባታ', om: 'Mana Haaraa Ijaarsaa' },
      description: {
        en: 'Complete building construction from foundation to finishing',
        am: 'ከመሠረት እስከ መጨረሻ የሚደርስ ሙሉ የሕንፃ ግንባታ',
        om: 'Ijaarsa Manaa Guutuu Irraa Kaasee Xumuraatti'
      },
      complexity: 'high',
      teamSize: { min: 5, max: 50 },
      duration: { min: 90, max: 365 }, // days
    },
    BUILDING_FINISHING: {
      id: 'building_finishing',
      name: { en: 'Building Finishing Work', am: 'ሕንፃ መጨረሻ ስራ', om: 'Hojii Xumura Manaa' },
      description: {
        en: 'Interior and exterior finishing work including painting, flooring, and fixtures',
        am: 'ውስጣዊ እና ውጫዊ መጨረሻ ስራ ለምሳሌ ቀለም መቀባት፣ ወለል ማስተካከል፣ መገጣጠሚያዎች',
        om: 'Hojii Xumura Keessaa fi Alaa Halluu, Daaqinsa, fi Meeshalee'
      },
      complexity: 'medium',
      teamSize: { min: 3, max: 15 },
      duration: { min: 30, max: 90 },
    },
    GOVERNMENT_INFRASTRUCTURE: {
      id: 'government_infrastructure',
      name: { en: 'Government Infrastructure', am: 'የመንግስት መሠረተ ልማት', om: 'Qabeenya Mootummaa' },
      description: {
        en: 'Large-scale government infrastructure projects including roads, bridges, and public facilities',
        am: 'ትላልቅ የመንግስት መሠረተ ልማት ፕሮጀክቶች ለምሳሌ መንገዶች፣ ድልድዮች፣ የህዝብ ተቋማት',
        om: 'Pirootii Qabeenya Mootummaa Gurguddoo Karaa, Rifeensa, fi Qophii Ummataa'
      },
      complexity: 'very_high',
      teamSize: { min: 20, max: 200 },
      duration: { min: 180, max: 730 },
    },
    RENOVATION_REMODELING: {
      id: 'renovation_remodeling',
      name: { en: 'Renovation & Remodeling', am: 'ጥገና እና እድሳት', om: 'Hojiinsa fi Fooyya' },
      description: {
        en: 'Building renovation, remodeling, and improvement projects',
        am: 'የሕንፃ ጥገና፣ እድሳት እና ማሻሻያ ፕሮጀክቶች',
        om: 'Pirootii Hojiinsa, Fooyyaa, fi Fooyya Manaa'
      },
      complexity: 'variable',
      teamSize: { min: 2, max: 10 },
      duration: { min: 14, max: 90 },
    },
  },

  // AI Worker Roles for Ethiopian Construction
  WORKER_ROLES: [
    {
      id: 'civil_engineer',
      name: { en: 'Civil Engineer', am: 'ሲቪል ምህንድስ', om: 'Injinerii Sivil' },
      category: 'professional',
      priority: 1,
      required: true,
      skills: ['structural_design', 'project_management', 'quality_control'],
      dailyRate: { min: 1500, max: 3000 }, // ETB
    },
    {
      id: 'site_manager',
      name: { en: 'Site Manager', am: 'የግንባታ ሥፍራ አስተዳዳሪ', om: 'Manaajjii Ijaarsaa' },
      category: 'management',
      priority: 2,
      required: true,
      skills: ['team_management', 'scheduling', 'safety_management'],
      dailyRate: { min: 1000, max: 2000 },
    },
    {
      id: 'mason',
      name: { en: 'Mason', am: 'ጡብ ሠሪ', om: 'Hojjettaa Dhoqqee' },
      category: 'skilled_labor',
      priority: 3,
      required: true,
      count: 'multiple',
      skills: ['brick_laying', 'concrete_work', 'block_work'],
      dailyRate: { min: 400, max: 800 },
    },
    // ... additional roles
  ],

  // AI Matching Algorithm Configuration
  MATCHING_CONFIG: {
    LOCATION_RADIUS: 50, // km
    MINIMUM_RATING: 4.0,
    MINIMUM_EXPERIENCE: 1, // years
    SKILL_MATCH_THRESHOLD: 80, // percentage
    AVAILABILITY_WINDOW: 30, // days
    
    // Scoring Weights
    WEIGHTS: {
      SKILLS: 0.35,
      LOCATION: 0.25,
      EXPERIENCE: 0.20,
      RATINGS: 0.15,
      AVAILABILITY: 0.05,
    },
  },

  // Project Parameters for AI Calculation
  PROJECT_PARAMETERS: {
    AREA_RANGES: {
      SMALL: { min: 50, max: 200, label: 'Small (50-200m²)', teamMultiplier: 1.0 },
      MEDIUM: { min: 200, max: 500, label: 'Medium (200-500m²)', teamMultiplier: 1.5 },
      LARGE: { min: 500, max: 2000, label: 'Large (500-2000m²)', teamMultiplier: 2.0 },
      XL: { min: 2000, max: 10000, label: 'Extra Large (2000-10000m²)', teamMultiplier: 3.0 },
    },
    FLOOR_RANGES: {
      GROUND: { min: 1, max: 1, label: 'Ground Floor', complexityMultiplier: 1.0 },
      MEDIUM: { min: 2, max: 5, label: '2-5 Floors', complexityMultiplier: 1.3 },
      HIGH: { min: 6, max: 20, label: '6-20 Floors', complexityMultiplier: 1.7 },
      SKYSCRAPER: { min: 21, max: 100, label: '21+ Floors', complexityMultiplier: 2.5 },
    },
    BUDGET_RANGES: {
      LOW: { min: 50000, max: 500000, label: '50K - 500K ETB' },
      MEDIUM: { min: 500000, max: 2000000, label: '500K - 2M ETB' },
      HIGH: { min: 2000000, max: 10000000, label: '2M - 10M ETB' },
      PREMIUM: { min: 10000000, max: 100000000, label: '10M+ ETB' },
    },
  },
};

// ==================== ENTERPRISE USER ROLES & PERMISSIONS ====================
export const USER_ROLES = {
  CLIENT: {
    id: 'client',
    name: { en: 'Client', am: 'ደንበኛ', om: 'Maamilaa' },
    permissions: [
      'book_services',
      'create_construction_projects',
      'rate_providers',
      'message_providers',
      'view_government_projects',
    ],
  },
  SERVICE_PROVIDER: {
    id: 'service_provider',
    name: { en: 'Service Provider', am: 'አገልግሎት አቅራቢ', om: 'Kennataa Tajaajilaa' },
    permissions: [
      'create_service_listings',
      'manage_availability',
      'accept_bookings',
      'receive_ai_invitations',
      'access_premium_features',
    ],
  },
  CONSTRUCTION_WORKER: {
    id: 'construction_worker',
    name: { en: 'Construction Worker', am: 'የግንባታ ሠራተኛ', om: 'Hojjettaa Ijaarsaa' },
    permissions: [
      'receive_project_invitations',
      'update_work_status',
      'access_construction_tools',
      'view_project_details',
    ],
  },
  GOVERNMENT_AGENCY: {
    id: 'government_agency',
    name: { en: 'Government Agency', am: 'የመንግስት አገልግሎት', om: 'Qondaala Mootummaa' },
    permissions: [
      'create_government_projects',
      'access_analytics_dashboard',
      'manage_infrastructure_projects',
      'view_reports',
      'access_budget_management',
    ],
  },
  ADMIN: {
    id: 'admin',
    name: { en: 'Administrator', am: 'አስተዳዳሪ', om: 'Administraatoraa' },
    permissions: [
      'manage_users',
      'moderate_content',
      'access_analytics',
      'manage_system_settings',
      'view_financial_reports',
    ],
  },
};

// ==================== ENTERPRISE VERIFICATION SYSTEM ====================
export const VERIFICATION_LEVELS = {
  UNVERIFIED: {
    level: 0,
    name: { en: 'Unverified', am: 'ያልተረጋገጠ', om: 'Kan Mirkaneessaa Hin Taane' },
    requirements: [],
    benefits: ['basic_listing'],
  },
  BASIC: {
    level: 1,
    name: { en: 'Basic Verified', am: 'መሠረታዊ ማረጋገጫ', om: 'Mirkaneessaa Bu\'uuraa' },
    requirements: ['phone_verification', 'email_verification'],
    benefits: ['enhanced_listing', 'basic_messaging'],
  },
  INTERMEDIATE: {
    level: 2,
    name: { en: 'Verified Professional', am: 'ተረጋግሶ ያለ ባለሙያ', om: 'Mirkaneessaa Ogummaa' },
    requirements: ['id_verification', 'trade_certificate'],
    benefits: ['trust_badge', 'priority_search', 'ai_matching'],
  },
  ADVANCED: {
    level: 3,
    name: { en: 'Premium Verified', am: 'ፕሪሚየም ማረጋገጫ', om: 'Mirkaneessaa Premium' },
    requirements: ['background_check', 'portfolio_review', 'insurance_verification'],
    benefits: ['premium_badge', 'featured_listing', 'government_project_access'],
  },
};

// ==================== ENTERPRISE NOTIFICATION SYSTEM ====================
export const NOTIFICATION_TYPES = {
  // Booking Notifications
  BOOKING: {
    REQUEST: 'booking_request',
    CONFIRMED: 'booking_confirmed',
    CANCELLED: 'booking_cancelled',
    REMINDER: 'booking_reminder',
    COMPLETED: 'booking_completed',
  },
  
  // AI Construction Notifications
  AI_CONSTRUCTION: {
    PROJECT_ASSIGNMENT: 'ai_project_assignment',
    WORKER_INVITATION: 'worker_invitation',
    INVITATION_ACCEPTED: 'invitation_accepted',
    INVITATION_DECLINED: 'invitation_declined',
    PROJECT_UPDATE: 'project_update',
    MILESTONE_REACHED: 'milestone_reached',
  },
  
  // Government Portal Notifications
  GOVERNMENT: {
    PROJECT_APPROVAL: 'government_project_approval',
    BUDGET_UPDATE: 'government_budget_update',
    REPORT_READY: 'government_report_ready',
    WORKER_ASSIGNMENT: 'government_worker_assignment',
  },
  
  // Payment Notifications
  PAYMENT: {
    CONFIRMED: 'payment_confirmed',
    FAILED: 'payment_failed',
    REFUNDED: 'payment_refunded',
    RECEIPT_READY: 'payment_receipt_ready',
  },
  
  // System Notifications
  SYSTEM: {
    MAINTENANCE: 'system_maintenance',
    UPDATE: 'system_update',
    SECURITY: 'security_alert',
    NEW_FEATURE: 'new_feature',
  },
};

// ==================== ENTERPRISE API CONFIGURATION ====================
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? process.env.EXPO_PUBLIC_API_URL || 'https://api.dev.yachi.et/v2'
    : process.env.EXPO_PUBLIC_API_URL || 'https://api.yachi.et/v2',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // Rate Limiting
  RATE_LIMITING: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000,
  },
  
  // Endpoint Categories
  ENDPOINTS: {
    AUTH: '/auth',
    USERS: '/users',
    SERVICES: '/services',
    BOOKINGS: '/bookings',
    PAYMENTS: '/payments',
    AI_CONSTRUCTION: '/ai/construction',
    GOVERNMENT: '/government',
    PREMIUM: '/premium',
    ANALYTICS: '/analytics',
  },
};

// ==================== ENTERPRISE STORAGE CONFIGURATION ====================
export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  SESSION_DATA: 'session_data',
  
  // App Settings
  LANGUAGE: 'app_language',
  THEME: 'app_theme',
  LOCATION: 'user_location',
  NOTIFICATION_SETTINGS: 'notification_settings',
  
  // Cached Data
  SERVICE_CATEGORIES: 'cached_categories',
  CONSTRUCTION_PROJECTS: 'cached_projects',
  USER_PREFERENCES: 'user_preferences',
  
  // Offline Data
  PENDING_BOOKINGS: 'pending_bookings',
  OFFLINE_MESSAGES: 'offline_messages',
  SYNC_QUEUE: 'sync_queue',
};

// ==================== ENTERPRISE FEATURE FLAGS ====================
export const FEATURE_FLAGS = {
  // Core Platform
  MULTI_ROLE_AUTH: true,
  SERVICE_MARKETPLACE: true,
  REAL_TIME_BOOKINGS: true,
  ADVANCED_SEARCH: true,
  
  // AI Construction
  AI_CONSTRUCTION_MATCHING: true,
  GOVERNMENT_PORTAL: true,
  CONSTRUCTION_PROJECTS: true,
  WORKER_REPLACEMENT_AI: true,
  BUDGET_OPTIMIZATION_AI: true,
  
  // Ethiopian Payments
  CHAPA_PAYMENTS: true,
  TELEBIRR_PAYMENTS: true,
  CBE_BIRR_PAYMENTS: true,
  
  // Premium Features
  PREMIUM_BADGE: true,
  PREMIUM_LISTING: true,
  ADVERTISEMENT_SYSTEM: true,
  
  // Localization
  MULTI_LANGUAGE: true,
  RTL_SUPPORT: true,
  
  // Technical Features
  OFFLINE_MODE: true,
  PUSH_NOTIFICATIONS: true,
  BACKGROUND_SYNC: true,
  
  // Development
  DEBUG_MODE: __DEV__,
  REDUX_DEVTOOLS: __DEV__,
};

// ==================== ENTERPRISE LOCALIZATION STRINGS ====================
export const LOCALIZED_STRINGS = {
  COMMON: {
    WELCOME: {
      en: 'Welcome to Yachi',
      am: 'ወደ ያቺ እንኳን በደህና መጡ',
      om: 'Baga Nagaan Yachii Geessan',
    },
    LOADING: {
      en: 'Loading...',
      am: 'በመጫን ላይ...',
      om: 'Osoo Kaafamu...',
    },
    SUCCESS: {
      en: 'Success!',
      am: 'ተሳክቷል!',
      om: 'Milkaa\'ina!',
    },
    ERROR: {
      en: 'Something went wrong',
      am: 'ስህተት ተከስቷል',
      om: 'Dogoggorri Uumame',
    },
  },
  
  AI_CONSTRUCTION: {
    PROJECT_CREATED: {
      en: 'Construction project created successfully',
      am: 'የግንባታ ፕሮጀክት በተሳካ ሁኔታ ተፈጥሯል',
      om: 'Pirootii Ijaarsaa Milkaa\'inaan Uumame',
    },
    WORKER_ASSIGNED: {
      en: 'Workers assigned to your project',
      am: 'ሠራተኞች ለፕሮጀክትዎ ተመድበዋል',
      om: 'Hojjettoonni Pirootii Keessan Irratti Qoodaman',
    },
  },
  
  PAYMENTS: {
    SUCCESS: {
      en: 'Payment completed successfully',
      am: 'ክፍያ በተሳካ ሁኔታ ተጠናቋል',
      om: 'Kaffaltiin Milkaa\'inaan Xumurame',
    },
    FAILED: {
      en: 'Payment failed. Please try again',
      am: 'ክፍያ አልተሳካም። እባክዎ እንደገና ይሞክሩ',
      om: 'Kaffaltiin Hin Xumuran. Maaloo Irra Deebi\'ii Irraa Kaasi',
    },
  },
};

// ==================== ENTERPRISE EXPORT ====================
export default {
  APP_INFO,
  ETHIOPIA,
  BUSINESS_MODEL,
  SERVICE_CATEGORIES,
  AI_CONSTRUCTION,
  USER_ROLES,
  VERIFICATION_LEVELS,
  NOTIFICATION_TYPES,
  API_CONFIG,
  STORAGE_KEYS,
  FEATURE_FLAGS,
  LOCALIZED_STRINGS,
  
  // Device Constants
  DEVICE: {
    SCREEN_WIDTH: width,
    SCREEN_HEIGHT: height,
    IS_IOS: isIOS,
    IS_ANDROID: isAndroid,
    IS_WEB: isWeb,
    PLATFORM_VERSION: getSystemVersion(),
    STATUS_BAR_HEIGHT: StatusBar.currentHeight || 0,
  },
};