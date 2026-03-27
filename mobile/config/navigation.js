// config/navigation.js

/**
 * ENTERPRISE-GRADE NAVIGATION CONFIGURATION
 * Yachi Construction & Services Platform
 * Advanced Routing with AI Construction & Ethiopian Market Integration
 */

import { Platform } from 'react-native';

// ==================== ENTERPRISE ROUTE CONFIGURATION ====================
export const NAVIGATION_CONFIG = {
  // ==================== APP ROUTES ARCHITECTURE ====================
  ROUTES: {
    // ===== AUTHENTICATION STACK =====
    AUTH: {
      WELCOME: '/(auth)/welcome',
      LOGIN: '/(auth)/login',
      REGISTER: '/(auth)/register',
      FORGOT_PASSWORD: '/(auth)/forgot-password',
      PHONE_VERIFICATION: '/(auth)/phone-verification',
      EMAIL_VERIFICATION: '/(auth)/email-verification',
      ROLE_SELECTION: '/(auth)/role-selection',
      PROFILE_SETUP: '/(auth)/profile-setup',
      BIOMETRIC_SETUP: '/(auth)/biometric-setup',
      TERMS_AGREEMENT: '/(auth)/terms',
    },
    
    // ===== MAIN TAB NAVIGATION =====
    TABS: {
      HOME: '/(tabs)',
      EXPLORE: '/(tabs)/explore',
      PROJECTS: '/(tabs)/projects', // AI Construction Projects
      BOOKINGS: '/(tabs)/bookings',
      MESSAGES: '/(tabs)/messages',
      PROFILE: '/(tabs)/profile',
    },
    
    // ===== SERVICES MARKETPLACE STACK =====
    SERVICES: {
      LIST: '/(services)',
      DETAILS: '/(services)/[id]',
      CREATE: '/(services)/create',
      SEARCH: '/(services)/search',
      CATEGORY: '/(services)/category/[id]',
      PROVIDER_PROFILE: '/(services)/provider/[id]',
      REVIEWS: '/(services)/[id]/reviews',
      PRICING: '/(services)/[id]/pricing',
      AVAILABILITY: '/(services)/[id]/availability',
    },
    
    // ===== AI CONSTRUCTION PROJECTS STACK =====
    CONSTRUCTION: {
      LIST: '/(construction)',
      CREATE: '/(construction)/create',
      DETAILS: '/(construction)/[id]',
      TEAM: '/(construction)/[id]/team',
      PROGRESS: '/(construction)/[id]/progress',
      BUDGET: '/(construction)/[id]/budget',
      DOCUMENTS: '/(construction)/[id]/documents',
      MILESTONES: '/(construction)/[id]/milestones',
      AI_ASSIGNMENT: '/(construction)/[id]/ai-assignment',
      INVITATIONS: '/(construction)/invitations',
    },
    
    // ===== GOVERNMENT PORTAL STACK =====
    GOVERNMENT: {
      DASHBOARD: '/(government)',
      PROJECTS: '/(government)/projects',
      CREATE_PROJECT: '/(government)/projects/create',
      PROJECT_DETAILS: '/(government)/projects/[id]',
      ANALYTICS: '/(government)/analytics',
      BUDGET_MANAGEMENT: '/(government)/budget',
      WORKER_MANAGEMENT: '/(government)/workers',
      REPORTS: '/(government)/reports',
      INFRASTRUCTURE: '/(government)/infrastructure',
    },
    
    // ===== BOOKINGS & SCHEDULING STACK =====
    BOOKINGS: {
      LIST: '/(bookings)',
      DETAILS: '/(bookings)/[id]',
      CREATE: '/(bookings)/create',
      HISTORY: '/(bookings)/history',
      TRACKING: '/(bookings)/[id]/tracking',
      RESCHEDULE: '/(bookings)/[id]/reschedule',
      REVIEW: '/(bookings)/[id]/review',
      PAYMENT: '/(bookings)/[id]/payment',
      CONFIRMATION: '/(bookings)/[id]/confirmation',
    },
    
    // ===== PROFILE & SETTINGS STACK =====
    PROFILE: {
      MAIN: '/(profile)',
      EDIT: '/(profile)/edit',
      VERIFICATION: '/(profile)/verification',
      PORTFOLIO: '/(profile)/portfolio',
      DOCUMENTS: '/(profile)/documents',
      SKILLS: '/(profile)/skills',
      PREFERENCES: '/(profile)/preferences',
      SECURITY: '/(profile)/security',
      PAYMENT_METHODS: '/(profile)/payment-methods',
      NOTIFICATIONS: '/(profile)/notifications',
      HELP_SUPPORT: '/(profile)/help-support',
      ABOUT: '/(profile)/about',
    },
    
    // ===== MESSAGING & COMMUNICATION STACK =====
    MESSAGES: {
      INBOX: '/(messages)',
      CHAT: '/(messages)/[id]',
      GROUP_CHAT: '/(messages)/group/[id]',
      PROJECT_CHAT: '/(messages)/project/[id]', // Construction project team chat
      GOVERNMENT_CHAT: '/(messages)/government/[id]', // Government project communication
    },
    
    // ===== ETHIOPIAN PAYMENT STACK =====
    PAYMENT: {
      SELECTION: '/(payment)',
      CHAPA: '/(payment)/chapa',
      TELEBIRR: '/(payment)/telebirr',
      CBE_BIRR: '/(payment)/cbe-birr',
      CONFIRMATION: '/(payment)/confirmation',
      HISTORY: '/(payment)/history',
      RECEIPT: '/(payment)/receipt/[id]',
      REFUND: '/(payment)/refund/[id]',
    },
    
    // ===== PREMIUM FEATURES STACK =====
    PREMIUM: {
      UPGRADE: '/(premium)',
      BADGE: '/(premium)/badge',
      LISTING: '/(premium)/listing',
      SUBSCRIPTION: '/(premium)/subscription',
      SUCCESS: '/(premium)/success',
      BENEFITS: '/(premium)/benefits',
      FEATURED: '/(premium)/featured',
    },
    
    // ===== ADMIN & MODERATION STACK =====
    ADMIN: {
      DASHBOARD: '/(admin)',
      USERS: '/(admin)/users',
      SERVICES: '/(admin)/services',
      BOOKINGS: '/(admin)/bookings',
      PROJECTS: '/(admin)/projects',
      CONSTRUCTION: '/(admin)/construction',
      GOVERNMENT: '/(admin)/government',
      ANALYTICS: '/(admin)/analytics',
      VERIFICATIONS: '/(admin)/verifications',
      REPORTS: '/(admin)/reports',
      FINANCIAL: '/(admin)/financial',
      MODERATION: '/(admin)/moderation',
    },
    
    // ===== MODAL ROUTES =====
    MODALS: {
      SERVICE: 'modal',
      FILTER: 'filter-modal',
      LOCATION: 'location-modal',
      PAYMENT_METHOD: 'payment-method-modal',
      PROJECT_SCOPE: 'project-scope-modal',
      AI_MATCHING: 'ai-matching-modal',
      RATING: 'rating-modal',
      CONFIRMATION: 'confirmation-modal',
      IMAGE_VIEWER: 'image-viewer-modal',
      LANGUAGE: 'language-modal',
      THEME: 'theme-modal',
    },
  },

  // ==================== NAVIGATION TRANSITIONS ====================
  TRANSITIONS: {
    DEFAULT: 'default',
    CARD: 'card',
    MODAL: 'modal',
    FADE: 'fade',
    SLIDE: 'slide_from_right',
    SLIDE_UP: 'slide_from_bottom',
    SLIDE_DOWN: 'slide_from_top',
    
    // Ethiopian market specific transitions
    ETHIOPIAN: {
      SLIDE_RTL: 'slide_from_left', // For RTL languages
    },
  },

  // ==================== ENTERPRISE HEADER CONFIGURATIONS ====================
  HEADERS: {
    DEFAULT: {
      headerStyle: {
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      headerTintColor: '#1A1A1A',
      headerTitleStyle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        fontWeight: '600',
      },
      headerBackTitle: 'ተመለስ', // Amharic for "Back"
      headerBackTitleVisible: true,
    },
    
    TRANSPARENT: {
      headerTransparent: true,
      headerTintColor: '#FFFFFF',
      headerTitle: '',
      headerShadowVisible: false,
    },
    
    LARGE: {
      headerLargeTitle: true,
      headerLargeTitleStyle: {
        fontFamily: 'Inter-Bold',
        fontSize: 34,
        color: '#1A1A1A',
      },
      headerLargeTitleShadowVisible: false,
    },
    
    CONSTRUCTION: {
      headerStyle: {
        backgroundColor: '#059669', // Ethiopian Green
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#FFFFFF',
      },
    },
    
    GOVERNMENT: {
      headerStyle: {
        backgroundColor: '#0F4C81', // Ethiopian Blue
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#FFFFFF',
      },
    },
    
    PREMIUM: {
      headerStyle: {
        backgroundColor: '#FCD116', // Ethiopian Yellow
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#1A1A1A',
      headerTitleStyle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#1A1A1A',
      },
    },
  },

  // ==================== ENTERPRISE TAB BAR CONFIGURATION ====================
  TAB_BAR: {
    STYLE: {
      backgroundColor: '#FFFFFF',
      borderTopColor: '#E5E5E5',
      borderTopWidth: 1,
      height: Platform.OS === 'ios' ? 85 : 70,
      paddingBottom: Platform.OS === 'ios' ? 20 : 8,
      paddingTop: 8,
      elevation: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    
    // Enterprise Tab Items with Ethiopian Localization
    ITEMS: {
      HOME: {
        key: 'home',
        label: {
          en: 'Home',
          am: 'መነሻ',
          om: 'Mana'
        },
        icon: {
          active: 'home',
          inactive: 'home-outline'
        },
        badge: false,
      },
      EXPLORE: {
        key: 'explore',
        label: {
          en: 'Explore',
          am: 'ፈልግ',
          om: 'Haaraa'
        },
        icon: {
          active: 'search',
          inactive: 'search-outline'
        },
        badge: false,
      },
      PROJECTS: {
        key: 'projects',
        label: {
          en: 'Projects',
          am: 'ፕሮጀክት',
          om: 'Pirootii'
        },
        icon: {
          active: 'building',
          inactive: 'building-outline'
        },
        badge: 'construction', // Special badge for construction projects
      },
      BOOKINGS: {
        key: 'bookings',
        label: {
          en: 'Bookings',
          am: 'ቦኪንግ',
          om: 'Booxii'
        },
        icon: {
          active: 'calendar',
          inactive: 'calendar-outline'
        },
        badge: true, // Show count badge
      },
      MESSAGES: {
        key: 'messages',
        label: {
          en: 'Messages',
          am: 'መልዕክት',
          om: 'Ergaa'
        },
        icon: {
          active: 'message-circle',
          inactive: 'message-circle-outline'
        },
        badge: true, // Show unread count
      },
      PROFILE: {
        key: 'profile',
        label: {
          en: 'Profile',
          am: 'መለያ',
          om: 'Profile'
        },
        icon: {
          active: 'user',
          inactive: 'user-outline'
        },
        badge: 'premium', // Show premium badge if user has premium
      },
    },
  },

  // ==================== ENTERPRISE DEEP LINK CONFIGURATION ====================
  DEEP_LINKS: {
    // Service Deep Links
    SERVICE: '/services/:id',
    SERVICE_CATEGORY: '/services/category/:category',
    SERVICE_SEARCH: '/services/search/:query',
    
    // Construction Project Deep Links
    CONSTRUCTION_PROJECT: '/construction/projects/:id',
    AI_ASSIGNMENT: '/construction/projects/:id/assignment',
    PROJECT_TEAM: '/construction/projects/:id/team',
    
    // Government Portal Deep Links
    GOVERNMENT_PROJECT: '/government/projects/:id',
    GOVERNMENT_DASHBOARD: '/government/dashboard',
    
    // Booking Deep Links
    BOOKING: '/bookings/:id',
    BOOKING_PAYMENT: '/bookings/:id/payment',
    
    // Profile Deep Links
    PROFILE: '/profile/:id',
    PROFILE_VERIFICATION: '/profile/verification',
    
    // Payment Deep Links
    PAYMENT: '/payment/:id',
    PAYMENT_RECEIPT: '/payment/receipt/:id',
    
    // Chat Deep Links
    CHAT: '/messages/:id',
    GROUP_CHAT: '/messages/group/:id',
    
    // Authentication Deep Links
    VERIFICATION: '/verify/:token',
    PASSWORD_RESET: '/reset-password/:token',
  },

  // ==================== ENTERPRISE ROUTE PROTECTION ====================
  PROTECTED_ROUTES: [
    '/(tabs)',
    '/(services)',
    '/(construction)',
    '/(government)',
    '/(bookings)',
    '/(profile)',
    '/(messages)',
    '/(payment)',
    '/(premium)',
    '/(admin)',
  ],

  PUBLIC_ROUTES: [
    '/(auth)',
    '/welcome',
    '/onboarding',
    '/maintenance',
    '/offline',
  ],

  // ==================== ENTERPRISE ROLE-BASED ACCESS CONTROL ====================
  ROLE_BASED_ROUTES: {
    // Client Role Routes
    CLIENT: [
      '/(construction)/create',
      '/(bookings)/create',
      '/(services)/create',
      '/(payment)',
      '/(premium)',
    ],
    
    // Service Provider Role Routes
    SERVICE_PROVIDER: [
      '/(services)/create',
      '/(profile)/portfolio',
      '/(profile)/documents',
      '/(profile)/skills',
      '/(construction)/invitations',
    ],
    
    // Construction Worker Role Routes
    CONSTRUCTION_WORKER: [
      '/(construction)/invitations',
      '/(profile)/skills',
      '/(profile)/documents',
    ],
    
    // Government Agency Role Routes
    GOVERNMENT_AGENCY: [
      '/(government)',
      '/(government)/projects/create',
      '/(government)/analytics',
      '/(government)/budget',
      '/(government)/reports',
    ],
    
    // Administrator Role Routes
    ADMIN: [
      '/(admin)',
      '/(admin)/users',
      '/(admin)/analytics',
      '/(admin)/financial',
      '/(admin)/moderation',
    ],
  },

  // ==================== ETHIOPIAN REGIONAL ROUTES ====================
  REGIONAL_ROUTES: {
    CITIES: {
      ADDIS_ABABA: '/location/addis-ababa',
      DIRE_DAWA: '/location/dire-dawa',
      BAHIR_DAR: '/location/bahir-dar',
      MEKELLE: '/location/mekelle',
      HAWASSA: '/location/hawassa',
      JIMMA: '/location/jimma',
      GONDAR: '/location/gondar',
      HARAR: '/location/harar',
    },
    
    LANGUAGES: {
      AMHARIC: '/lang/am',
      OROMO: '/lang/om',
      ENGLISH: '/lang/en',
    },
    
    CURRENCIES: {
      ETB: '/currency/etb',
    },
  },

  // ==================== ENTERPRISE PAYMENT GATEWAY CONFIGURATION ====================
  PAYMENT_GATEWAYS: {
    CHAPA: {
      name: 'Chapa',
      code: 'chapa',
      currency: 'ETB',
      language: 'am',
      baseUrl: 'https://api.chapa.co/v1',
      publicKey: process.env.EXPO_PUBLIC_CHAPA_PUBLIC_KEY,
      supportedMethods: ['CARD', 'BANK', 'MOBILE'],
      limits: {
        min: 1,
        max: 100000,
        dailyMax: 500000,
      },
    },
    
    TELEBIRR: {
      name: 'Telebirr',
      code: 'telebirr',
      currency: 'ETB',
      appId: process.env.EXPO_PUBLIC_TELEBIRR_APP_ID,
      baseUrl: 'https://openapi.telebirr.com',
      callbackUrl: 'yachi://payment/telebirr-callback',
      supportedMethods: ['TELEBIRR_WALLET'],
      limits: {
        min: 1,
        max: 50000,
        dailyMax: 200000,
      },
    },
    
    CBE_BIRR: {
      name: 'CBE Birr',
      code: 'cbe_birr',
      currency: 'ETB',
      merchantId: process.env.EXPO_PUBLIC_CBE_MERCHANT_ID,
      baseUrl: 'https://gateway.cbe.com.et',
      appId: process.env.EXPO_PUBLIC_CBE_APP_ID,
      supportedMethods: ['CBE_BIRR_WALLET'],
      limits: {
        min: 1,
        max: 50000,
        dailyMax: 200000,
      },
    },
  },

  // ==================== ENTERPRISE PREMIUM FEATURES CONFIGURATION ====================
  PREMIUM_FEATURES: {
    BADGE: {
      id: 'premium_badge',
      price: 200, // ETB per month
      duration: 'monthly',
      features: [
        'verified_badge',
        'search_priority',
        'profile_featuring',
        'enhanced_visibility',
        'trust_indicator',
        'ai_matching_priority',
      ],
      route: '/(premium)/badge',
    },
    
    LISTING: {
      id: 'premium_listing',
      price: 399, // ETB one-time
      duration: 'one_time',
      features: [
        'top_search_placement',
        'category_featuring',
        'highlighted_listing',
        'booking_conversion_boost',
        'premium_tag',
        'increased_visibility',
      ],
      route: '/(premium)/listing',
    },
    
    SUBSCRIPTION: {
      id: 'premium_subscription',
      price: 500, // ETB per month
      duration: 'monthly',
      features: [
        'all_badge_features',
        'all_listing_features',
        'priority_support',
        'advanced_analytics',
        'government_project_access',
        'ai_construction_priority',
      ],
      route: '/(premium)/subscription',
    },
  },

  // ==================== ENTERPRISE AI CONSTRUCTION CONFIGURATION ====================
  AI_CONSTRUCTION: {
    WORKER_TYPES: [
      {
        id: 'civil_engineer',
        name: { en: 'Civil Engineer', am: 'ሲቪል ምህንድስ', om: 'Injinerii Sivil' },
        category: 'professional',
        priority: 1,
      },
      {
        id: 'architect',
        name: { en: 'Architect', am: 'ሥነ ሕንፃ ባለሙያ', om: 'Arkiiteektii' },
        category: 'professional',
        priority: 2,
      },
      {
        id: 'site_manager',
        name: { en: 'Site Manager', am: 'የግንባታ ሥፍራ አስተዳዳሪ', om: 'Manaajjii Ijaarsaa' },
        category: 'management',
        priority: 3,
      },
      {
        id: 'mason',
        name: { en: 'Mason', am: 'ጡብ ሠሪ', om: 'Hojjettaa Dhoqqee' },
        category: 'skilled_labor',
        priority: 4,
        count: 'multiple',
      },
      // ... additional worker types
    ],
    
    PROJECT_TYPES: {
      RESIDENTIAL: {
        id: 'residential',
        name: { en: 'Residential Building', am: 'የመኖሪያ ሕንፃ', om: 'Mana Mana' },
        complexity: 'medium',
      },
      COMMERCIAL: {
        id: 'commercial',
        name: { en: 'Commercial Building', am: 'የንግድ ሕንፃ', om: 'Mana Daldalaa' },
        complexity: 'high',
      },
      GOVERNMENT: {
        id: 'government',
        name: { en: 'Government Infrastructure', am: 'የመንግስት መሠረተ ልማት', om: 'Qabeenya Mootummaa' },
        complexity: 'very_high',
      },
      RENOVATION: {
        id: 'renovation',
        name: { en: 'Renovation & Remodeling', am: 'ጥገና እና እድሳት', om: 'Hojiinsa fi Fooyya' },
        complexity: 'variable',
      },
    },
    
    BUDGET_RANGES: {
      LOW: { 
        min: 50000, 
        max: 500000,
        label: { en: '50K - 500K ETB', am: '50 ሺህ - 500 ሺህ ብር', om: 'ETB 50K - 500K' }
      },
      MEDIUM: { 
        min: 500000, 
        max: 5000000,
        label: { en: '500K - 5M ETB', am: '500 ሺህ - 5 ሚሊዮን ብር', om: 'ETB 500K - 5M' }
      },
      HIGH: { 
        min: 5000000, 
        max: 50000000,
        label: { en: '5M - 50M ETB', am: '5 ሚሊዮን - 50 ሚሊዮን ብር', om: 'ETB 5M - 50M' }
      },
      MEGA: { 
        min: 50000000, 
        max: null,
        label: { en: '50M+ ETB', am: '50 ሚሊዮን+ ብር', om: 'ETB 50M+' }
      },
    },
  },
};

// ==================== ENTERPRISE NAVIGATION UTILITIES ====================
export const NavigationUtils = {
  /**
   * Build route with parameters
   */
  buildRoute(route, params = {}) {
    let builtRoute = route;
    
    Object.keys(params).forEach(key => {
      const paramValue = params[key];
      if (paramValue !== undefined && paramValue !== null) {
        builtRoute = builtRoute.replace(`[${key}]`, encodeURIComponent(paramValue));
      }
    });
    
    return builtRoute;
  },

  /**
   * Check if route requires authentication
   */
  isProtectedRoute(route) {
    return NAVIGATION_CONFIG.PROTECTED_ROUTES.some(protectedRoute => 
      route.startsWith(protectedRoute)
    );
  },

  /**
   * Check user role access for route
   */
  hasRoleAccess(route, userRole) {
    const roleRoutes = NAVIGATION_CONFIG.ROLE_BASED_ROUTES[userRole] || [];
    return roleRoutes.some(roleRoute => route.startsWith(roleRoute));
  },

  /**
   * Get payment gateway configuration
   */
  getPaymentGateway(gateway) {
    return NAVIGATION_CONFIG.PAYMENT_GATEWAYS[gateway];
  },

  /**
   * Get premium feature configuration
   */
  getPremiumFeature(feature) {
    return NAVIGATION_CONFIG.PREMIUM_FEATURES[feature];
  },

  /**
   * Generate project deep link
   */
  generateProjectLink(projectId, type = 'construction') {
    const basePath = type === 'government' ? 'government/projects' : 'construction/projects';
    return `yachi://${basePath}/${projectId}`;
  },

  /**
   * Generate service deep link
   */
  generateServiceLink(serviceId) {
    return `yachi://services/${serviceId}`;
  },

  /**
   * Generate booking deep link
   */
  generateBookingLink(bookingId) {
    return `yachi://bookings/${bookingId}`;
  },

  /**
   * Generate payment receipt deep link
   */
  generateReceiptLink(receiptId) {
    return `yachi://payment/receipt/${receiptId}`;
  },

  /**
   * Get localized tab label
   */
  getLocalizedTabLabel(tabKey, language = 'en') {
    const tabConfig = NAVIGATION_CONFIG.TAB_BAR.ITEMS[tabKey];
    return tabConfig?.label[language] || tabConfig?.label.en || tabKey;
  },

  /**
   * Get header configuration for route
   */
  getHeaderConfig(route, options = {}) {
    const baseConfig = { ...NAVIGATION_CONFIG.HEADERS.DEFAULT };
    
    // Apply specific header styles based on route
    if (route.includes('/construction')) {
      Object.assign(baseConfig, NAVIGATION_CONFIG.HEADERS.CONSTRUCTION);
    } else if (route.includes('/government')) {
      Object.assign(baseConfig, NAVIGATION_CONFIG.HEADERS.GOVERNMENT);
    } else if (route.includes('/premium')) {
      Object.assign(baseConfig, NAVIGATION_CONFIG.HEADERS.PREMIUM);
    }
    
    // Apply custom options
    if (options.transparent) {
      Object.assign(baseConfig, NAVIGATION_CONFIG.HEADERS.TRANSPARENT);
    }
    
    if (options.largeTitle) {
      Object.assign(baseConfig, NAVIGATION_CONFIG.HEADERS.LARGE);
    }
    
    return baseConfig;
  },
};

// ==================== ETHIOPIAN LOCALIZATION UTILITIES ====================
export const EthiopianLocalization = {
  // Ethiopian months (13 months)
  MONTHS: [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሣሥ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ],

  // Week days
  WEEK_DAYS: [
    'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ', 'እሑድ'
  ],

  // Common navigation phrases
  PHRASES: {
    WELCOME: {
      en: 'Welcome to Yachi',
      am: 'ወደ ያቺ እንኳን በደህና መጡ',
      om: 'Baga Nagaan Yachii Geessan'
    },
    SEARCH: {
      en: 'Search',
      am: 'ፈልግ',
      om: 'Barbaadi'
    },
    BOOK_NOW: {
      en: 'Book Now',
      am: 'አሁን ይቅረቡ',
      om: 'Amma Booxi'
    },
    BACK: {
      en: 'Back',
      am: 'ተመለስ',
      om: 'Duubi'
    },
    NEXT: {
      en: 'Next',
      am: 'ቀጣይ',
      om: 'Itaana'
    },
    DONE: {
      en: 'Done',
      am: 'ተጠናቋል',
      om: 'Xumura'
    },
  },

  /**
   * Format Ethiopian currency
   */
  formatCurrency(amount, language = 'en') {
    const formattedAmount = amount.toLocaleString('en-ET');
    
    const symbols = {
      en: 'ETB',
      am: 'ብር',
      om: 'ETB'
    };
    
    return `${symbols[language]} ${formattedAmount}`;
  },

  /**
   * Get localized route title
   */
  getLocalizedRouteTitle(route, language = 'en') {
    // This would integrate with your localization system
    const routeTitles = {
      '/(tabs)': { en: 'Home', am: 'መነሻ', om: 'Mana' },
      '/(services)': { en: 'Services', am: 'አገልግሎቶች', om: 'Tajaajilawwan' },
      '/(construction)': { en: 'Construction', am: 'ግንባታ', om: 'Ijaarsaa' },
      // ... more route titles
    };
    
    return routeTitles[route]?.[language] || routeTitles[route]?.en || route;
  },
};

export default NAVIGATION_CONFIG;