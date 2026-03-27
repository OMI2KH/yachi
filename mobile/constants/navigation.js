// constants/navigation.js

/**
 * ENTERPRISE NAVIGATION CONSTANTS
 * Yachi Construction & Services Platform
 * Advanced Navigation with Ethiopian Market Optimization & AI Construction Flows
 */

import { Platform } from 'react-native';

// ==================== ENTERPRISE ROUTE ARCHITECTURE ====================
export const ROUTE_ARCHITECTURE = {
  // Authentication Stack
  AUTH: {
    WELCOME: '/(auth)/welcome',
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
    FORGOT_PASSWORD: '/(auth)/forgot-password',
    RESET_PASSWORD: '/(auth)/reset-password',
    VERIFICATION: '/(auth)/verification',
    PHONE_VERIFICATION: '/(auth)/phone-verification',
    ROLE_SELECTION: '/(auth)/role-selection',
    PROFILE_SETUP: '/(auth)/profile-setup',
    TERMS_AGREEMENT: '/(auth)/terms',
  },

  // Main Application Tabs
  TABS: {
    HOME: '/(tabs)',
    EXPLORE: '/(tabs)/explore',
    PROJECTS: '/(tabs)/projects',
    BOOKINGS: '/(tabs)/bookings',
    MESSAGES: '/(tabs)/messages',
    PROFILE: '/(tabs)/profile',
  },

  // Service Marketplace Stack
  SERVICES: {
    LIST: '/(services)',
    DETAIL: '/(services)/[id]',
    CREATE: '/(services)/create',
    SEARCH: '/(services)/search',
    CATEGORY: '/(services)/category/[categoryId]',
    PROVIDER_PROFILE: '/(services)/provider/[providerId]',
    REVIEWS: '/(services)/[id]/reviews',
    BOOKING: '/(services)/[id]/booking',
  },

  // AI Construction Projects Stack
  CONSTRUCTION: {
    PROJECTS: {
      LIST: '/(construction)',
      CREATE: '/(construction)/create',
      DETAIL: '/(construction)/[projectId]',
      UPDATE: '/(construction)/[projectId]/edit',
      TEAM: '/(construction)/[projectId]/team',
      PROGRESS: '/(construction)/[projectId]/progress',
      BUDGET: '/(construction)/[projectId]/budget',
      MILESTONES: '/(construction)/[projectId]/milestones',
      DOCUMENTS: '/(construction)/[projectId]/documents',
      CHAT: '/(construction)/[projectId]/chat',
    },
    
    AI_MATCHING: {
      WORKER_SEARCH: '/(construction)/[projectId]/worker-search',
      TEAM_ASSIGNMENT: '/(construction)/[projectId]/team-assignment',
      INVITATION_MANAGEMENT: '/(construction)/[projectId]/invitations',
    },
    
    INVITATIONS: {
      LIST: '/(construction)/invitations',
      DETAIL: '/(construction)/invitations/[invitationId]',
      RESPONSE: '/(construction)/invitations/[invitationId]/response',
    },
  },

  // Government Portal Stack
  GOVERNMENT: {
    DASHBOARD: '/(government)',
    PROJECTS: {
      LIST: '/(government)/projects',
      CREATE: '/(government)/projects/create',
      DETAIL: '/(government)/projects/[projectId]',
      EDIT: '/(government)/projects/[projectId]/edit',
      APPROVAL: '/(government)/projects/[projectId]/approval',
    },
    WORKERS: {
      MANAGEMENT: '/(government)/workers',
      VERIFICATION: '/(government)/workers/verification',
      CERTIFICATION: '/(government)/workers/certification',
    },
    ANALYTICS: {
      OVERVIEW: '/(government)/analytics',
      REGIONAL: '/(government)/analytics/regional',
      FINANCIAL: '/(government)/analytics/financial',
    },
    REPORTS: {
      GENERATE: '/(government)/reports',
      DOWNLOAD: '/(government)/reports/[reportId]',
    },
  },

  // Booking Management Stack
  BOOKINGS: {
    LIST: '/(bookings)',
    DETAIL: '/(bookings)/[bookingId]',
    CREATE: '/(bookings)/create',
    HISTORY: '/(bookings)/history',
    TRACKING: '/(bookings)/[bookingId]/tracking',
    REVIEW: '/(bookings)/[bookingId]/review',
    PAYMENT: '/(bookings)/[bookingId]/payment',
    RESCHEDULE: '/(bookings)/[bookingId]/reschedule',
  },

  // User Profile & Settings Stack
  PROFILE: {
    MAIN: '/(profile)',
    EDIT: '/(profile)/edit',
    VERIFICATION: '/(profile)/verification',
    PORTFOLIO: '/(profile)/portfolio',
    DOCUMENTS: '/(profile)/documents',
    SUBSCRIPTION: '/(profile)/subscription',
    PAYMENT_METHODS: '/(profile)/payment-methods',
    SETTINGS: '/(profile)/settings',
    NOTIFICATIONS: '/(profile)/notifications',
    SECURITY: '/(profile)/security',
    HELP_SUPPORT: '/(profile)/help-support',
  },

  // Real-time Communication Stack
  MESSAGES: {
    LIST: '/(messages)',
    CHAT: '/(messages)/[conversationId]',
    GROUP_CHAT: '/(messages)/group/[groupId]',
    NEW_CHAT: '/(messages)/new',
    SEARCH: '/(messages)/search',
  },

  // Modal Screens (Overlay Content)
  MODALS: {
    SERVICE_FILTER: 'modal/service-filter',
    LOCATION_PICKER: 'modal/location-picker',
    PAYMENT: 'modal/payment',
    RATING: 'modal/rating',
    EMERGENCY: 'modal/emergency',
    PREMIUM_UPGRADE: 'modal/premium',
    CONFIRMATION: 'modal/confirmation',
    IMAGE_VIEWER: 'modal/image-viewer',
    SHARE: 'modal/share',
    NOTIFICATION: 'modal/notification',
  },

  // Emergency & System Screens
  EMERGENCY: {
    OFFLINE: 'emergency/offline',
    ERROR: 'emergency/error',
    MAINTENANCE: 'emergency/maintenance',
    UPDATE_REQUIRED: 'emergency/update-required',
    ACCESS_DENIED: 'emergency/access-denied',
  },

  // Admin Management Stack
  ADMIN: {
    DASHBOARD: '/(admin)',
    USER_MANAGEMENT: '/(admin)/users',
    SERVICE_MODERATION: '/(admin)/services',
    PAYMENT_MANAGEMENT: '/(admin)/payments',
    SYSTEM_ANALYTICS: '/(admin)/analytics',
    CONTENT_MANAGEMENT: '/(admin)/content',
    SYSTEM_SETTINGS: '/(admin)/settings',
  },
};

// ==================== ENTERPRISE NAVIGATION PARAMETERS ====================
export const NAVIGATION_PARAMS = {
  // Service-related parameters
  SERVICE: {
    ID: 'id',
    CATEGORY_ID: 'categoryId',
    PROVIDER_ID: 'providerId',
    SERVICE_TYPE: 'serviceType',
    LOCATION: 'location',
    PRICE_RANGE: 'priceRange',
    RATING: 'rating',
  },

  // AI Construction Project parameters
  PROJECT: {
    ID: 'projectId',
    TYPE: 'type', // 'new_construction', 'finishing', 'renovation', 'government_infrastructure'
    SQUARE_METER: 'squareMeter',
    FLOORS: 'floors',
    BUDGET: 'budget',
    TIMELINE: 'timeline',
    LOCATION: 'location',
    WORKER_COUNT: 'workerCount',
    SKILL_REQUIREMENTS: 'skillRequirements',
    URGENCY: 'urgency', // 'low', 'medium', 'high', 'urgent'
  },

  // Worker & Team parameters
  WORKER: {
    ID: 'workerId',
    SKILLS: 'skills',
    LEVEL: 'level', // 'trainee', 'skilled', 'expert', 'supervisor'
    EXPERIENCE: 'experience',
    RATING: 'rating',
    LOCATION: 'location',
    AVAILABILITY: 'availability',
  },

  // Booking & Appointment parameters
  BOOKING: {
    ID: 'bookingId',
    SERVICE_ID: 'serviceId',
    PROJECT_ID: 'projectId',
    WORKER_ID: 'workerId',
    STATUS: 'status',
    DATE: 'date',
    TIME: 'time',
    DURATION: 'duration',
    TOTAL_AMOUNT: 'totalAmount',
  },

  // Payment & Transaction parameters
  PAYMENT: {
    AMOUNT: 'amount',
    CURRENCY: 'currency',
    PROVIDER: 'provider', // 'chapa', 'telebirr', 'cbe_birr'
    TRANSACTION_ID: 'transactionId',
    RETURN_URL: 'returnUrl',
    STATUS: 'status', // 'pending', 'success', 'failed', 'cancelled'
  },

  // User & Profile parameters
  USER: {
    ID: 'userId',
    ROLE: 'role', // 'client', 'provider', 'government', 'admin', 'construction_worker'
    VERIFICATION_STATUS: 'verificationStatus',
    PREMIUM_STATUS: 'premiumStatus',
  },

  // Location & Geographic parameters
  LOCATION: {
    LATITUDE: 'lat',
    LONGITUDE: 'lng',
    ADDRESS: 'address',
    CITY: 'city',
    REGION: 'region',
    COUNTRY: 'country',
  },

  // Chat & Communication parameters
  CHAT: {
    CONVERSATION_ID: 'conversationId',
    RECIPIENT_ID: 'recipientId',
    RECIPIENT_NAME: 'recipientName',
    RECIPIENT_AVATAR: 'recipientAvatar',
    IS_GROUP: 'isGroup',
    GROUP_NAME: 'groupName',
    PROJECT_CONTEXT: 'projectContext',
  },
};

// ==================== ENTERPRISE SCREEN CONFIGURATION ====================
export const SCREEN_CONFIG = {
  // Header configuration
  HEADER: {
    STYLES: {
      DEFAULT: {
        backgroundColor: '#FFFFFF',
        shadowColor: 'transparent',
        elevation: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
      },
      TRANSPARENT: {
        backgroundColor: 'transparent',
        shadowColor: 'transparent',
        elevation: 0,
      },
      PREMIUM: {
        backgroundColor: '#7C3AED',
        shadowColor: '#7C3AED',
        elevation: 4,
      },
    },
    
    TITLE_STYLES: {
      DEFAULT: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
      },
      LIGHT: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
      },
    },
    
    BACK_BUTTON: {
      DEFAULT: {
        tintColor: '#1A1A1A',
        marginLeft: Platform.OS === 'ios' ? 0 : -8,
      },
      LIGHT: {
        tintColor: '#FFFFFF',
      },
    },
  },

  // Animation configurations
  ANIMATIONS: {
    DEFAULT: {
      animation: 'slide_from_right',
      animationDuration: 300,
    },
    FADE: {
      animation: 'fade',
      animationDuration: 250,
    },
    BOTTOM_SHEET: {
      animation: 'slide_from_bottom',
      animationDuration: 350,
    },
    MODAL: {
      presentation: 'modal',
      animation: 'slide_from_bottom',
      animationDuration: 400,
    },
    NONE: {
      animation: 'none',
    },
    ETHIOPIAN: {
      animation: 'fade_from_bottom',
      animationDuration: 500,
    },
  },

  // Tab bar configuration
  TAB_BAR: {
    HEIGHT: Platform.select({
      ios: 85,
      android: 70,
      default: 70,
    }),
    ICON_SIZE: 24,
    LABEL_SIZE: 12,
    ACTIVE_TINT_COLOR: '#078930', // Ethiopian Green
    INACTIVE_TINT_COLOR: '#666666',
    BACKGROUND_COLOR: '#FFFFFF',
    BORDER_COLOR: '#F0F0F0',
    BORDER_WIDTH: 1,
    
    // Ethiopian-inspired styling
    ETHIOPIAN_STYLE: {
      ACTIVE_TINT_COLOR: '#078930', // Green
      INACTIVE_TINT_COLOR: '#666666',
      BACKGROUND_COLOR: '#FFFFFF',
      BORDER_COLOR: '#F0F0F0',
    },
  },

  // Modal configurations
  MODAL: {
    BACKDROP_OPACITY: 0.5,
    BACKGROUND_COLOR: '#FFFFFF',
    BORDER_RADIUS: 20,
    MARGIN: 20,
    MAX_WIDTH: 500,
    
    // Ethiopian modal styling
    ETHIOPIAN_STYLE: {
      BORDER_RADIUS: 16,
      BACKGROUND_COLOR: '#FFFFFF',
      SHADOW_COLOR: '#000000',
      SHADOW_OPACITY: 0.1,
    },
  },
};

// ==================== ETHIOPIAN MARKET NAVIGATION OPTIMIZATION ====================
export const ETHIOPIAN_NAVIGATION_CONFIG = {
  // Regional navigation preferences
  REGIONS: {
    ADDIS_ABABA: {
      id: 'addis_ababa',
      name: { en: 'Addis Ababa', am: 'አዲስ አበባ', om: 'Finfinnee' },
      defaultLocation: { lat: 9.03, lng: 38.74 },
      cities: ['Addis Ababa', 'Bishoftu', 'Sebeta', 'Holeta'],
      navigationStyle: 'urban',
    },
    OROMIA: {
      id: 'oromia', 
      name: { en: 'Oromia', am: 'ኦሮሚያ', om: 'Oromiyaa' },
      defaultLocation: { lat: 8.98, lng: 39.12 },
      cities: ['Adama', 'Jimma', 'Ambo', 'Nekemte', 'Shashamane'],
      navigationStyle: 'mixed',
    },
    AMHARA: {
      id: 'amhara',
      name: { en: 'Amhara', am: 'አማራ', om: 'Amahara' },
      defaultLocation: { lat: 11.59, lng: 37.39 },
      cities: ['Bahir Dar', 'Gondar', 'Dessie', 'Debre Markos'],
      navigationStyle: 'urban',
    },
    TIGRAY: {
      id: 'tigray',
      name: { en: 'Tigray', am: 'ትግራይ', om: 'Tigray' },
      defaultLocation: { lat: 13.49, lng: 39.47 },
      cities: ['Mekelle', 'Adigrat', 'Axum', 'Shire'],
      navigationStyle: 'mixed',
    },
    SOUTHERN: {
      id: 'southern',
      name: { en: 'Southern Nations', am: 'ደቡብ ብሔሮች', om: 'Aanaanota Kibbaa' },
      defaultLocation: { lat: 6.54, lng: 38.45 },
      cities: ['Hawassa', 'Arba Minch', 'Dilla', 'Wolaita Sodo'],
      navigationStyle: 'mixed',
    },
  },

  // Major Ethiopian cities for quick navigation
  MAJOR_CITIES: [
    { 
      id: 'addis_ababa', 
      name: 'Addis Ababa', 
      lat: 9.03, 
      lng: 38.74,
      region: 'addis_ababa',
      population: 5000000,
    },
    { 
      id: 'dire_dawa', 
      name: 'Dire Dawa', 
      lat: 9.6, 
      lng: 41.87,
      region: 'oromia',
      population: 500000,
    },
    { 
      id: 'mekelle', 
      name: 'Mekelle', 
      lat: 13.49, 
      lng: 39.47,
      region: 'tigray', 
      population: 400000,
    },
    { 
      id: 'hawassa', 
      name: 'Hawassa', 
      lat: 7.05, 
      lng: 38.47,
      region: 'southern',
      population: 300000,
    },
    { 
      id: 'bahir_dar', 
      name: 'Bahir Dar', 
      lat: 11.59, 
      lng: 37.39,
      region: 'amhara',
      population: 250000,
    },
  ],

  // Ethiopian payment provider integration
  PAYMENT_PROVIDERS: {
    CHAPA: {
      id: 'chapa',
      name: { en: 'Chapa', am: 'ቻፓ', om: 'Chapa' },
      scheme: 'chapa://',
      deepLink: 'chapa://pay/',
      callbackRoute: ROUTE_ARCHITECTURE.BOOKINGS.PAYMENT,
      supportedAmounts: { min: 1, max: 100000 },
    },
    TELEBIRR: {
      id: 'telebirr',
      name: { en: 'Telebirr', am: 'ቴሌብር', om: 'Telebirr' },
      scheme: 'telebirr://',
      deepLink: 'telebirr://payment/',
      callbackRoute: ROUTE_ARCHITECTURE.BOOKINGS.PAYMENT,
      supportedAmounts: { min: 1, max: 50000 },
    },
    CBE_BIRR: {
      id: 'cbe_birr',
      name: { en: 'CBE Birr', am: 'ሲቢኢ ብር', om: 'CBE Birr' },
      scheme: 'cbebirr://',
      deepLink: 'cbebirr://transfer/',
      callbackRoute: ROUTE_ARCHITECTURE.BOOKINGS.PAYMENT,
      supportedAmounts: { min: 1, max: 100000 },
    },
  },

  // Ethiopian service categories with local preferences
  SERVICE_CATEGORIES: [
    {
      id: 'construction',
      name: { en: 'Construction', am: 'ግንባታ', om: 'Ijaarsaa' },
      icon: '🏗️',
      popularity: 95,
      subcategories: ['new_construction', 'renovation', 'finishing'],
    },
    {
      id: 'plumbing',
      name: { en: 'Plumbing', am: 'ፕላምቢንግ', om: 'Piipii' },
      icon: '🔧',
      popularity: 85,
      subcategories: ['installation', 'repair', 'maintenance'],
    },
    {
      id: 'electrical',
      name: { en: 'Electrical', am: 'ኤሌክትሪክ', om: 'Elektirikii' },
      icon: '⚡',
      popularity: 80,
      subcategories: ['installation', 'repair', 'maintenance'],
    },
    {
      id: 'cleaning',
      name: { en: 'Cleaning', am: 'ንፅፅር', om: 'Qulqullina' },
      icon: '🧹',
      popularity: 75,
      subcategories: ['home_cleaning', 'office_cleaning', 'construction_cleaning'],
    },
  ],

  // Construction worker specializations
  WORKER_SPECIALIZATIONS: [
    {
      id: 'civil_engineer',
      name: { en: 'Civil Engineer', am: 'ሲቪል ኢንጂነር', om: 'Injinerii Sivil' },
      category: 'engineering',
      demand: 'high',
    },
    {
      id: 'mason',
      name: { en: 'Mason', am: 'ጡብ ሠራተኛ', om: 'Hojjetaa Saree' },
      category: 'construction',
      demand: 'very_high',
    },
    {
      id: 'carpenter',
      name: { en: 'Carpenter', am: 'እንጨት ሠራተኛ', om: 'Hojjetaa Mukaa' },
      category: 'construction', 
      demand: 'high',
    },
    {
      id: 'steel_fixer',
      name: { en: 'Steel Fixer', am: 'ብረት ማጠንከሪያ', om: 'Hojjetaa Sibiilaa' },
      category: 'construction',
      demand: 'medium',
    },
  ],
};

// ==================== ENTERPRISE DEEP LINKING SYSTEM ====================
export const DEEP_LINKING_CONFIG = {
  // Supported URL schemes
  SCHEMES: {
    APP: 'yachi://',
    HTTPS: 'https://yachi.et',
    SECURE_HTTPS: 'https://*.yachi.et',
    PAYMENT_PROVIDERS: ['chapa://', 'telebirr://', 'cbebirr://'],
  },

  // URL prefixes for link handling
  PREFIXES: [
    'yachi://',
    'https://yachi.et',
    'https://*.yachi.et',
    'https://yachi.page.link',
  ],

  // Path to screen mapping configuration
  PATH_CONFIG: {
    initialRouteName: 'TABS',
    screens: {
      TABS: {
        path: '',
        screens: {
          HOME: 'home',
          EXPLORE: 'explore',
          PROJECTS: 'projects',
          BOOKINGS: 'bookings',
          MESSAGES: 'messages',
          PROFILE: 'profile',
        },
      },
      SERVICES: {
        path: 'services',
        screens: {
          LIST: '',
          DETAIL: ':id',
          SEARCH: 'search',
          CATEGORY: 'category/:categoryId',
        },
      },
      CONSTRUCTION: {
        path: 'projects',
        screens: {
          LIST: '',
          DETAIL: ':projectId',
          CREATE: 'create',
          TEAM: ':projectId/team',
        },
      },
      AUTH: {
        path: 'auth',
        screens: {
          LOGIN: 'login',
          REGISTER: 'register',
          VERIFICATION: 'verify/:token',
        },
      },
      MODAL: {
        path: 'modal',
        screens: {
          PAYMENT: 'payment',
          RATING: 'rating',
          PREMIUM: 'premium',
        },
      },
    },
  },

  // Dynamic link domains
  DYNAMIC_LINKS: {
    DOMAIN: 'yachi.page.link',
    PREFIX: 'https://yachi.page.link',
  },
};

// ==================== ENTERPRISE NAVIGATION SECURITY ====================
export const NAVIGATION_SECURITY = {
  // Routes that require authentication
  PROTECTED_ROUTES: [
    ROUTE_ARCHITECTURE.TABS.HOME,
    ROUTE_ARCHITECTURE.TABS.EXPLORE,
    ROUTE_ARCHITECTURE.TABS.PROJECTS,
    ROUTE_ARCHITECTURE.TABS.BOOKINGS,
    ROUTE_ARCHITECTURE.TABS.MESSAGES,
    ROUTE_ARCHITECTURE.TABS.PROFILE,
    ROUTE_ARCHITECTURE.SERVICES.CREATE,
    ROUTE_ARCHITECTURE.CONSTRUCTION.PROJECTS.CREATE,
    ROUTE_ARCHITECTURE.BOOKINGS.CREATE,
    ROUTE_ARCHITECTURE.PROFILE.EDIT,
  ],

  // Role-based route restrictions
  ROLE_RESTRICTIONS: {
    CLIENT: [
      ROUTE_ARCHITECTURE.SERVICES.CREATE,
      ROUTE_ARCHITECTURE.CONSTRUCTION.PROJECTS.CREATE,
    ],
    PROVIDER: [
      ROUTE_ARCHITECTURE.GOVERNMENT.DASHBOARD,
    ],
    GOVERNMENT: [
      // Government has access to all government routes
    ],
    ADMIN: [
      ROUTE_ARCHITECTURE.ADMIN.DASHBOARD,
    ],
  },

  // Routes that should clear navigation history
  RESET_ROUTES: [
    ROUTE_ARCHITECTURE.AUTH.LOGIN,
    ROUTE_ARCHITECTURE.AUTH.REGISTER,
    ROUTE_ARCHITECTURE.EMERGENCY.OFFLINE,
    ROUTE_ARCHITECTURE.EMERGENCY.MAINTENANCE,
  ],

  // Maximum navigation stack depth
  STACK_DEPTH_LIMITS: {
    DEFAULT: 10,
    DEEP_NAVIGATION: 20,
    MODAL_STACK: 5,
  },
};

// ==================== ENTERPRISE NAVIGATION SERVICE ====================
export class NavigationService {
  /**
   * Build route with parameters
   */
  static buildRoute(route, params = {}) {
    let builtRoute = route;
    
    Object.keys(params).forEach(key => {
      const paramValue = params[key];
      const paramPattern = `\\[${key}\\]`;
      const regex = new RegExp(paramPattern, 'g');
      
      if (regex.test(builtRoute)) {
        builtRoute = builtRoute.replace(regex, encodeURIComponent(paramValue));
      }
    });
    
    return builtRoute;
  }

  /**
   * Parse route parameters from URL
   */
  static parseRouteParams(route, url) {
    const params = {};
    const routeParts = route.split('/');
    const urlParts = url.split('/');
    
    routeParts.forEach((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const paramName = part.slice(1, -1);
        if (urlParts[index]) {
          params[paramName] = decodeURIComponent(urlParts[index]);
        }
      }
    });
    
    return params;
  }

  /**
   * Get tab bar configuration
   */
  static getTabConfig(route) {
    const tabConfig = {
      [ROUTE_ARCHITECTURE.TABS.HOME]: {
        icon: '🏠',
        label: { en: 'Home', am: 'መነሻ', om: 'Mana' },
        badge: null,
      },
      [ROUTE_ARCHITECTURE.TABS.EXPLORE]: {
        icon: '🔍',
        label: { en: 'Explore', am: 'መሻር', om: 'Qo\'annoo' },
        badge: null,
      },
      [ROUTE_ARCHITECTURE.TABS.PROJECTS]: {
        icon: '🏗️',
        label: { en: 'Projects', am: 'ፕሮጀክቶች', om: 'Pirootii' },
        badge: 'projects',
      },
      [ROUTE_ARCHITECTURE.TABS.BOOKINGS]: {
        icon: '📅',
        label: { en: 'Bookings', am: 'ቦኪንጎች', om: 'Booking' },
        badge: 'bookings',
      },
      [ROUTE_ARCHITECTURE.TABS.MESSAGES]: {
        icon: '💬',
        label: { en: 'Messages', am: 'መልዕክቶች', om: 'Ergamee' },
        badge: 'messages',
      },
      [ROUTE_ARCHITECTURE.TABS.PROFILE]: {
        icon: '👤',
        label: { en: 'Profile', am: 'መለያ', om: 'Profile' },
        badge: null,
      },
    };
    
    return tabConfig[route] || { icon: '❓', label: { en: 'Unknown', am: 'የማይታወቅ', om: 'Kan Hin Beekamne' } };
  }

  /**
   * Check if user can access route
   */
  static canAccessRoute(route, userRole, isAuthenticated) {
    // Check authentication
    if (NAVIGATION_SECURITY.PROTECTED_ROUTES.some(protectedRoute => 
      route.startsWith(protectedRoute)) && !isAuthenticated) {
      return false;
    }
    
    // Check role restrictions
    const roleRestrictions = NAVIGATION_SECURITY.ROLE_RESTRICTIONS[userRole] || [];
    if (roleRestrictions.some(restrictedRoute => route.startsWith(restrictedRoute))) {
      return false;
    }
    
    return true;
  }

  /**
   * Get Ethiopian city navigation data
   */
  static getEthiopianCity(cityId) {
    return ETHIOPIAN_NAVIGATION_CONFIG.MAJOR_CITIES.find(city => city.id === cityId) || 
           ETHIOPIAN_NAVIGATION_CONFIG.MAJOR_CITIES[0];
  }

  /**
   * Generate project creation navigation
   */
  static getProjectCreationNavigation(projectData) {
    const { type, squareMeter, floors, budget, location } = projectData;
    
    const params = {
      type,
      squareMeter: squareMeter?.toString(),
      floors: floors?.toString(),
      budget: budget?.toString(),
      location: location || 'addis_ababa',
    };
    
    return {
      route: ROUTE_ARCHITECTURE.CONSTRUCTION.PROJECTS.CREATE,
      params,
    };
  }

  /**
   * Get payment navigation configuration
   */
  static getPaymentNavigation(paymentData) {
    const { provider, amount, transactionId, bookingId } = paymentData;
    const paymentProvider = ETHIOPIAN_NAVIGATION_CONFIG.PAYMENT_PROVIDERS[provider];
    
    if (!paymentProvider) return null;
    
    const deepLink = `${paymentProvider.deepLink}${amount}?transaction=${transactionId}&return=${encodeURIComponent(
      this.buildRoute(ROUTE_ARCHITECTURE.BOOKINGS.PAYMENT, { bookingId })
    )}`;
    
    return {
      deepLink,
      fallbackRoute: ROUTE_ARCHITECTURE.BOOKINGS.PAYMENT,
      fallbackParams: { bookingId },
    };
  }

  /**
   * Parse and validate deep link
   */
  static parseDeepLink(url) {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;
      const params = Object.fromEntries(parsedUrl.searchParams.entries());
      
      // Validate domain for web links
      if (parsedUrl.protocol === 'https:') {
        const allowedDomains = ['yachi.et', 'www.yachi.et', 'yachi.page.link'];
        if (!allowedDomains.includes(parsedUrl.hostname)) {
          return null;
        }
      }
      
      return { path, params, source: parsedUrl.href };
    } catch (error) {
      console.error('Deep link parsing error:', error);
      return null;
    }
  }

  /**
   * Get navigation analytics event
   */
  static getNavigationEvent(fromRoute, toRoute, userRole) {
    return {
      event: 'navigation',
      from_route: fromRoute,
      to_route: toRoute,
      user_role: userRole,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
    };
  }
}

// ==================== EXPORT CONFIGURATION ====================
export const NAVIGATION_CONSTANTS = {
  routes: ROUTE_ARCHITECTURE,
  params: NAVIGATION_PARAMS,
  screenConfig: SCREEN_CONFIG,
  ethiopianConfig: ETHIOPIAN_NAVIGATION_CONFIG,
  deepLinking: DEEP_LINKING_CONFIG,
  security: NAVIGATION_SECURITY,
  service: NavigationService,
};

export default NAVIGATION_CONSTANTS;