// constants/api.js

/**
 * ENTERPRISE API CONFIGURATION
 * Yachi Construction & Services Platform
 * Ethiopian Market Optimized with Advanced Security & Monitoring
 */

import { Platform } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { version } from '../../package.json';

// ==================== ENTERPRISE ENVIRONMENT CONFIG ====================
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging', 
  PRODUCTION: 'production',
  TESTING: 'testing',
  
  CURRENT: __DEV__ ? 'development' : 'production',
  IS_DEV: __DEV__,
  IS_PROD: !__DEV__,
  IS_STAGING: process.env.STAGING === 'true',
};

// ==================== ENTERPRISE API ENDPOINTS ====================
export const API_ENDPOINTS = {
  // Authentication & Authorization
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    VERIFY_PHONE: '/auth/verify-phone',
    SOCIAL_LOGIN: '/auth/social',
    BIOMETRIC_SETUP: '/auth/biometric',
    TWO_FACTOR_SETUP: '/auth/2fa',
  },

  // User Management
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    UPLOAD_AVATAR: '/users/avatar',
    VERIFICATION: '/users/verification',
    PREFERENCES: '/users/preferences',
    STATISTICS: '/users/statistics',
    DELETE_ACCOUNT: '/users/account',
    SECURITY_SETTINGS: '/users/security',
    NOTIFICATION_SETTINGS: '/users/notifications',
  },

  // Service Marketplace
  SERVICES: {
    LIST: '/services',
    CREATE: '/services',
    DETAIL: '/services/{id}',
    UPDATE: '/services/{id}',
    DELETE: '/services/{id}',
    SEARCH: '/services/search',
    CATEGORIES: '/services/categories',
    BY_CATEGORY: '/services/category/{category}',
    FAVORITES: '/services/favorites',
    RECOMMENDED: '/services/recommended',
    NEARBY: '/services/nearby',
    AVAILABILITY: '/services/{id}/availability',
    REVIEWS: '/services/{id}/reviews',
    ANALYTICS: '/services/{id}/analytics',
  },

  // Booking System
  BOOKINGS: {
    LIST: '/bookings',
    CREATE: '/bookings',
    DETAIL: '/bookings/{id}',
    UPDATE: '/bookings/{id}',
    CANCEL: '/bookings/{id}/cancel',
    CONFIRM: '/bookings/{id}/confirm',
    COMPLETE: '/bookings/{id}/complete',
    CLIENT_BOOKINGS: '/bookings/client',
    PROVIDER_BOOKINGS: '/bookings/provider',
    STATUS: '/bookings/{id}/status',
    RESCHEDULE: '/bookings/{id}/reschedule',
    PAYMENT: '/bookings/{id}/payment',
    REVIEW: '/bookings/{id}/review',
  },

  // AI Construction Projects
  CONSTRUCTION: {
    PROJECTS: {
      LIST: '/construction/projects',
      CREATE: '/construction/projects',
      DETAIL: '/construction/projects/{id}',
      UPDATE: '/construction/projects/{id}',
      DELETE: '/construction/projects/{id}',
      TEAM: '/construction/projects/{id}/team',
      PROGRESS: '/construction/projects/{id}/progress',
      BUDGET: '/construction/projects/{id}/budget',
      MILESTONES: '/construction/projects/{id}/milestones',
      DOCUMENTS: '/construction/projects/{id}/documents',
    },
    
    AI_MATCHING: {
      FIND_WORKERS: '/construction/ai/matching/find-workers',
      ASSIGN_TEAM: '/construction/ai/matching/assign-team',
      REPLACE_WORKER: '/construction/ai/matching/replace-worker',
      OPTIMIZE_SCHEDULE: '/construction/ai/matching/optimize-schedule',
      PREDICT_TIMELINE: '/construction/ai/matching/predict-timeline',
    },
    
    INVITATIONS: {
      LIST: '/construction/invitations',
      SEND: '/construction/invitations',
      ACCEPT: '/construction/invitations/{id}/accept',
      DECLINE: '/construction/invitations/{id}/decline',
      STATUS: '/construction/invitations/{id}/status',
    },
  },

  // Government Portal
  GOVERNMENT: {
    DASHBOARD: '/government/dashboard',
    PROJECTS: {
      LIST: '/government/projects',
      CREATE: '/government/projects',
      DETAIL: '/government/projects/{id}',
      UPDATE: '/government/projects/{id}',
      APPROVE: '/government/projects/{id}/approve',
      REJECT: '/government/projects/{id}/reject',
    },
    WORKERS: {
      LIST: '/government/workers',
      VERIFY: '/government/workers/{id}/verify',
      SUSPEND: '/government/workers/{id}/suspend',
    },
    ANALYTICS: {
      OVERVIEW: '/government/analytics/overview',
      REGIONAL: '/government/analytics/regional',
      FINANCIAL: '/government/analytics/financial',
    },
    REPORTS: {
      GENERATE: '/government/reports/generate',
      DOWNLOAD: '/government/reports/{id}/download',
    },
  },

  // Ethiopian Payment Integration
  PAYMENTS: {
    INITIATE: '/payments/initiate',
    CONFIRM: '/payments/confirm',
    VERIFY: '/payments/verify',
    HISTORY: '/payments/history',
    REFUND: '/payments/refund',
    METHODS: '/payments/methods',
    
    // Ethiopian Payment Providers
    CHAPA: {
      INITIATE: '/payments/chapa/initiate',
      VERIFY: '/payments/chapa/verify',
      WEBHOOK: '/payments/chapa/webhook',
    },
    TELEBIRR: {
      INITIATE: '/payments/telebirr/initiate',
      VERIFY: '/payments/telebirr/verify',
      WEBHOOK: '/payments/telebirr/webhook',
    },
    CBE_BIRR: {
      INITIATE: '/payments/cbe-birr/initiate',
      VERIFY: '/payments/cbe-birr/verify',
      WEBHOOK: '/payments/cbe-birr/webhook',
    },
  },

  // Real-time Communication
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: '/chat/conversations/{id}/messages',
    SEND_MESSAGE: '/chat/conversations/{id}/messages',
    MARK_READ: '/chat/conversations/{id}/read',
    CREATE_CONVERSATION: '/chat/conversations',
    UPLOAD_FILE: '/chat/upload',
    TYPING: '/chat/conversations/{id}/typing',
    ONLINE_STATUS: '/chat/online-status',
  },

  // Reviews & Ratings
  REVIEWS: {
    CREATE: '/reviews',
    UPDATE: '/reviews/{id}',
    DELETE: '/reviews/{id}',
    USER_REVIEWS: '/reviews/user',
    SERVICE_REVIEWS: '/reviews/service/{serviceId}',
    RESPOND: '/reviews/{id}/respond',
    REPORT: '/reviews/{id}/report',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/{id}/read',
    MARK_ALL_READ: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences',
    UNREAD_COUNT: '/notifications/unread-count',
    PUSH_TOKEN: '/notifications/push-token',
  },

  // File Upload & Management
  UPLOADS: {
    IMAGE: '/uploads/image',
    DOCUMENT: '/uploads/document',
    PORTFOLIO: '/uploads/portfolio',
    AVATAR: '/uploads/avatar',
    DELETE: '/uploads/{id}',
    BULK_UPLOAD: '/uploads/bulk',
  },

  // Location Services
  LOCATIONS: {
    CITIES: '/locations/cities',
    REGIONS: '/locations/regions',
    NEARBY: '/locations/nearby',
    SEARCH: '/locations/search',
    COORDINATES: '/locations/coordinates',
    ETHIOPIAN_CITIES: '/locations/ethiopian-cities',
  },

  // Premium Features
  PREMIUM: {
    BADGE: '/premium/badge',
    LISTING: '/premium/listing',
    SUBSCRIPTIONS: '/premium/subscriptions',
    CANCEL: '/premium/subscriptions/{id}/cancel',
    FEATURES: '/premium/features',
    UPGRADE: '/premium/upgrade',
    BENEFITS: '/premium/benefits',
  },

  // Analytics & Monitoring
  ANALYTICS: {
    TRACK: '/analytics/track',
    USER_BEHAVIOR: '/analytics/user-behavior',
    SERVICE_METRICS: '/analytics/service-metrics',
    REVENUE: '/analytics/revenue',
    GEOGRAPHIC: '/analytics/geographic',
    PERFORMANCE: '/analytics/performance',
    ERROR_TRACKING: '/analytics/errors',
  },

  // Admin Management
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    SERVICES: '/admin/services',
    BOOKINGS: '/admin/bookings',
    PAYMENTS: '/admin/payments',
    REPORTS: '/admin/reports',
    MODERATION: '/admin/moderation',
    SETTINGS: '/admin/settings',
    SYSTEM_HEALTH: '/admin/system-health',
  },
};

// ==================== ENTERPRISE API CONFIGURATION ====================
export const API_CONFIG = {
  // Base URLs with environment switching
  BASE_URLS: {
    development: {
      main: 'https://api-dev.yachi.et/v1',
      payments: 'https://payments-dev.yachi.et/v1',
      ai: 'https://ai-dev.yachi.et/v1',
      government: 'https://gov-dev.yachi.et/v1',
      uploads: 'https://uploads-dev.yachi.et/v1',
      chat: 'https://chat-dev.yachi.et/v1',
    },
    staging: {
      main: 'https://api-staging.yachi.et/v1',
      payments: 'https://payments-staging.yachi.et/v1',
      ai: 'https://ai-staging.yachi.et/v1',
      government: 'https://gov-staging.yachi.et/v1',
      uploads: 'https://uploads-staging.yachi.et/v1',
      chat: 'https://chat-staging.yachi.et/v1',
    },
    production: {
      main: 'https://api.yachi.et/v1',
      payments: 'https://payments.yachi.et/v1',
      ai: 'https://ai.yachi.et/v1',
      government: 'https://gov.yachi.et/v1',
      uploads: 'https://uploads.yachi.et/v1',
      chat: 'https://chat.yachi.et/v1',
    },
  },

  // Current environment configuration
  get CURRENT_BASE_URLS() {
    return this.BASE_URLS[ENVIRONMENT.CURRENT] || this.BASE_URLS.development;
  },

  // Headers configuration
  HEADERS: {
    COMMON: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Platform': Platform.OS,
      'X-Platform-Version': String(Platform.Version),
      'X-App-Version': version,
      'X-Device-ID': getUniqueId(),
      'X-Client': 'yachi-mobile',
      'X-Client-Language': 'en', // Will be set dynamically
    },
    
    AUTH: {
      'Authorization': 'Bearer {token}',
    },
    
    UPLOAD: {
      'Content-Type': 'multipart/form-data',
    },
    
    CACHE: {
      'Cache-Control': 'no-cache',
    },
  },

  // Timeout configurations
  TIMEOUTS: {
    DEFAULT: 30000,        // 30 seconds
    UPLOAD: 60000,         // 60 seconds
    PAYMENT: 45000,        // 45 seconds
    AI_PROCESSING: 120000, // 2 minutes
    CHAT: 15000,           // 15 seconds
  },

  // Retry configuration
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    RETRY_CONDITION: (error) => {
      // Retry on network errors or 5xx status codes
      return !error.response || (error.response.status >= 500 && error.response.status < 600);
    },
  },

  // Cache configuration
  CACHE: {
    DURATION: {
      SHORT: 5 * 60 * 1000,    // 5 minutes
      MEDIUM: 30 * 60 * 1000,  // 30 minutes
      LONG: 2 * 60 * 60 * 1000, // 2 hours
      VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
    },
    KEYS: {
      USER_PROFILE: 'user_profile',
      SERVICE_CATEGORIES: 'service_categories',
      LOCATION_DATA: 'location_data',
      APP_CONFIG: 'app_config',
      ETHIOPIAN_CITIES: 'ethiopian_cities',
    },
  },
};

// ==================== ETHIOPIAN PAYMENT CONFIGURATION ====================
export const ETHIOPIAN_PAYMENT_CONFIG = {
  CHAPA: {
    PUBLIC_KEY: process.env.CHAPA_PUBLIC_KEY,
    BASE_URL: 'https://api.chapa.co/v1',
    CURRENCY: 'ETB',
    SUCCESS_URL: 'yachi://payment/success',
    FAILURE_URL: 'yachi://payment/failure',
    WEBHOOK_URL: `${API_CONFIG.CURRENT_BASE_URLS.payments}${API_ENDPOINTS.PAYMENTS.CHAPA.WEBHOOK}`,
    TIMEOUT: 45000,
  },

  TELEBIRR: {
    APP_ID: process.env.TELEBIRR_APP_ID,
    SHORT_CODE: process.env.TELEBIRR_SHORT_CODE,
    BASE_URL: 'https://api.telebirr.et/v1',
    CURRENCY: 'ETB',
    CALLBACK_URL: 'yachi://payment/telebirr/callback',
    NOTIFY_URL: `${API_CONFIG.CURRENT_BASE_URLS.payments}${API_ENDPOINTS.PAYMENTS.TELEBIRR.WEBHOOK}`,
    TIMEOUT: 45000,
  },

  CBE_BIRR: {
    MERCHANT_ID: process.env.CBE_BIRR_MERCHANT_ID,
    API_KEY: process.env.CBE_BIRR_API_KEY,
    BASE_URL: 'https://api.cbebirr.et/v1',
    CURRENCY: 'ETB',
    RETURN_URL: 'yachi://payment/cbe-birr/return',
    NOTIFY_URL: `${API_CONFIG.CURRENT_BASE_URLS.payments}${API_ENDPOINTS.PAYMENTS.CBE_BIRR.WEBHOOK}`,
    TIMEOUT: 45000,
  },

  // Common payment settings
  COMMON: {
    MIN_AMOUNT: 1,        // 1 ETB
    MAX_AMOUNT: 1000000,  // 1,000,000 ETB
    DEFAULT_CURRENCY: 'ETB',
    SUPPORTED_CURRENCIES: ['ETB'],
  },
};

// ==================== AI CONSTRUCTION CONFIGURATION ====================
export const AI_CONSTRUCTION_CONFIG = {
  // Worker matching parameters
  WORKER_MATCHING: {
    MAX_DISTANCE_KM: 50,
    MIN_RATING: 3.5,
    RESPONSE_TIMEOUT_HOURS: 24,
    REPLACEMENT_RETRIES: 3,
    SKILL_MATCH_THRESHOLD: 0.7,
    AVAILABILITY_MATCH_THRESHOLD: 0.8,
  },

  // Project types
  PROJECT_TYPES: {
    NEW_CONSTRUCTION: 'new_construction',
    FINISHING: 'finishing', 
    RENOVATION: 'renovation',
    GOVERNMENT_INFRASTRUCTURE: 'government_infrastructure',
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
  },

  // Team composition formulas
  TEAM_COMPOSITION: {
    ENGINEER_PER_FLOOR: 0.1,      // 1 engineer per 10 floors
    WORKER_PER_SQM: 0.02,         // 1 worker per 50 sqm
    SUPERVISOR_RATIO: 0.1,        // 1 supervisor per 10 workers
    SPECIALIST_RATIO: 0.05,       // 1 specialist per 20 workers
  },

  // Budget estimation
  BUDGET_ESTIMATION: {
    COST_PER_SQM: {
      new_construction: 15000,
      finishing: 8000,
      renovation: 12000,
      government_infrastructure: 20000,
    },
    LABOR_COST_RATIO: 0.4,
    MATERIAL_COST_RATIO: 0.5,
    CONTINGENCY_RATIO: 0.1,
  },

  // Timeline prediction
  TIMELINE_PREDICTION: {
    BASE_DAYS_PER_SQM: 0.1,
    FLOOR_MULTIPLIER: 1.2,
    COMPLEXITY_FACTORS: {
      simple: 1.0,
      moderate: 1.3,
      complex: 1.7,
      very_complex: 2.2,
    },
  },
};

// ==================== ENTERPRISE ERROR HANDLING ====================
export const API_ERROR_CODES = {
  // Success
  SUCCESS: 1000,

  // Client errors
  VALIDATION_ERROR: 1001,
  AUTHENTICATION_ERROR: 1002,
  AUTHORIZATION_ERROR: 1003,
  NOT_FOUND: 1004,
  RATE_LIMITED: 1005,
  PAYMENT_REQUIRED: 1006,

  // Server errors
  INTERNAL_ERROR: 2001,
  SERVICE_UNAVAILABLE: 2002,
  DATABASE_ERROR: 2003,
  EXTERNAL_SERVICE_ERROR: 2004,

  // Business logic errors
  INSUFFICIENT_FUNDS: 3001,
  SERVICE_UNAVAILABLE: 3002,
  BOOKING_CONFLICT: 3003,
  WORKER_UNAVAILABLE: 3004,
  PROJECT_LIMIT_REACHED: 3005,
};

export const ERROR_MESSAGES = {
  NETWORK: {
    NO_INTERNET: {
      en: 'No internet connection. Please check your network settings.',
      am: 'ኢንተርኔት ግንኙነት የለም። እባክዎ የኔትዎርክ ቅንብሮችዎን ያረጋግጡ።',
      om: 'Walitti qunnamtii interneetii hin jiru. Mijeera nettoworkii keessan mirkaneessaa.',
    },
    TIMEOUT: {
      en: 'Request timeout. Please try again.',
      am: 'የጥያቄ ጊዜ አልቋል። እባክዎ እንደገና ይሞክሩ።',
      om: 'Yeroo gaafatamaa dhumee jira. Irra deebi\'ii yaalaa.',
    },
    SERVER_ERROR: {
      en: 'Server error. Please try again later.',
      am: 'የሰርቨር ስህተት። እባክዎ ቆይተው እንደገና ይሞክሩ።',
      om: 'Dogoggora seerveraa. Booda deebi\'ii yaalaa.',
    },
  },

  AUTH: {
    INVALID_CREDENTIALS: {
      en: 'Invalid email or password.',
      am: 'ልክ ያልሆነ ኢሜይል ወይም የይለፍ ቃል።',
      om: 'Email ykn password sirrii miti.',
    },
    UNAUTHORIZED: {
      en: 'Please log in to continue.',
      am: 'ለመቀጠል እባክዎ ይግቡ።',
      om: 'Itti fufuuf seenaa galchaa.',
    },
    SESSION_EXPIRED: {
      en: 'Your session has expired. Please log in again.',
      am: 'የእርስዎ ክፍለ ጊዜ አልቋል። እባክዎ እንደገና ይግቡ።',
      om: 'Yeroo keessan dhumtee jira. Irra deebi\'ii seenaa galchaa.',
    },
  },

  PAYMENT: {
    FAILED: {
      en: 'Payment failed. Please try again.',
      am: 'ክፍያ አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
      om: 'Kaffaltii hin milkoofne. Irra deebi\'ii yaalaa.',
    },
    INSUFFICIENT_FUNDS: {
      en: 'Insufficient funds. Please check your balance.',
      am: 'በቂ ገንዘብ የለም። እባክዎ ሚዛንዎን ያረጋግጡ።',
      om: 'Qabeenya ga\'aa hin argamne. Balansii keessan mirkaneessaa.',
    },
    DECLINED: {
      en: 'Payment was declined by your bank.',
      am: 'ክፍያው በባንክዎ ተቀባይነት አላገኘም።',
      om: 'Kaffaltiin baankii keessan irratti dhiifame.',
    },
  },

  VALIDATION: {
    REQUIRED: {
      en: 'This field is required.',
      am: 'ይህ መስክ ያስፈልጋል።',
      om: 'Dirree kana barbaachisaa dha.',
    },
    INVALID_EMAIL: {
      en: 'Please enter a valid email address.',
      am: 'እባክዎ ትክክለኛ ኢሜይል አድራሻ ያስገቡ።',
      om: 'Lakkoofsa email sirrii galchaa.',
    },
    INVALID_PHONE: {
      en: 'Please enter a valid phone number.',
      am: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።',
      om: 'Lakkoofsa bilbila sirrii galchaa.',
    },
  },
};

// ==================== ENTERPRISE SECURITY CONFIG ====================
export const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMITING: {
    AUTH: {
      LOGIN: { attempts: 5, windowMs: 15 * 60 * 1000 },
      REGISTER: { attempts: 3, windowMs: 60 * 60 * 1000 },
      PASSWORD_RESET: { attempts: 3, windowMs: 60 * 60 * 1000 },
    },
    API: {
      GENERAL: { requests: 100, windowMs: 15 * 60 * 1000 },
      UPLOADS: { requests: 20, windowMs: 60 * 60 * 1000 },
      PAYMENTS: { requests: 10, windowMs: 5 * 60 * 1000 },
      CHAT: { requests: 50, windowMs: 5 * 60 * 1000 },
    },
  },

  // File upload security
  UPLOAD_SECURITY: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    MAX_IMAGES_PER_UPLOAD: 10,
    SCAN_FOR_MALWARE: true,
  },

  // Token configuration
  TOKEN_CONFIG: {
    ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
    REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  },
};

// ==================== ENTERPRISE API SERVICE ====================
export class APIService {
  /**
   * Build URL with parameters
   */
  static buildUrl(endpoint, params = {}) {
    let url = endpoint;
    Object.keys(params).forEach(key => {
      url = url.replace(`{${key}}`, encodeURIComponent(params[key]));
    });
    return url;
  }

  /**
   * Get full API URL for specific service
   */
  static getFullUrl(service, endpoint, params = {}) {
    const baseUrl = API_CONFIG.CURRENT_BASE_URLS[service] || API_CONFIG.CURRENT_BASE_URLS.main;
    const builtEndpoint = this.buildUrl(endpoint, params);
    return `${baseUrl}${builtEndpoint}`;
  }

  /**
   * Get headers for request
   */
  static getHeaders(type = 'common', token = null, language = 'en') {
    const headers = { ...API_CONFIG.HEADERS.COMMON };
    headers['X-Client-Language'] = language;

    if (type === 'auth' && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (type === 'upload') {
      headers['Content-Type'] = 'multipart/form-data';
    }

    return headers;
  }

  /**
   * Check if response is successful
   */
  static isSuccess(status) {
    return status >= 200 && status < 300;
  }

  /**
   * Handle API errors with localization
   */
  static handleError(error, endpoint, language = 'en') {
    console.error(`API Error at ${endpoint}:`, error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Handle specific error codes
      if (data?.code) {
        const errorKey = Object.keys(API_ERROR_CODES).find(
          key => API_ERROR_CODES[key] === data.code
        );
        
        if (errorKey) {
          return {
            code: data.code,
            message: data.message || this.getLocalizedError(errorKey, language),
            data: data.data,
          };
        }
      }

      // Handle HTTP status codes
      return {
        code: status,
        message: this.getHttpStatusMessage(status, language),
        data: data,
      };
    }

    if (error.request) {
      return {
        code: 0,
        message: ERROR_MESSAGES.NETWORK.SERVER_ERROR[language],
      };
    }

    return {
      code: -1,
      message: ERROR_MESSAGES.NETWORK.SERVER_ERROR[language],
    };
  }

  /**
   * Get localized error message
   */
  static getLocalizedError(errorKey, language = 'en') {
    const errorCategory = Object.keys(ERROR_MESSAGES).find(category =>
      ERROR_MESSAGES[category][errorKey]
    );
    
    if (errorCategory && ERROR_MESSAGES[errorCategory][errorKey]) {
      return ERROR_MESSAGES[errorCategory][errorKey][language] || 
             ERROR_MESSAGES[errorCategory][errorKey].en;
    }
    
    return ERROR_MESSAGES.NETWORK.SERVER_ERROR[language];
  }

  /**
   * Get HTTP status message
   */
  static getHttpStatusMessage(status, language = 'en') {
    const messages = {
      400: ERROR_MESSAGES.VALIDATION.REQUIRED[language],
      401: ERROR_MESSAGES.AUTH.UNAUTHORIZED[language],
      403: ERROR_MESSAGES.AUTH.UNAUTHORIZED[language],
      404: 'Resource not found',
      429: 'Too many requests',
      500: ERROR_MESSAGES.NETWORK.SERVER_ERROR[language],
      503: ERROR_MESSAGES.NETWORK.SERVER_ERROR[language],
    };

    return messages[status] || ERROR_MESSAGES.NETWORK.SERVER_ERROR[language];
  }

  /**
   * Format Ethiopian currency
   */
  static formatEthiopianCurrency(amount) {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Validate Ethiopian phone number
   */
  static validateEthiopianPhone(phone) {
    const ethiopianPhoneRegex = /^(\+251|0)(9[0-9]|7[0-9]|1[0-9])([0-9]{6,7})$/;
    return ethiopianPhoneRegex.test(phone.replace(/\s/g, ''));
  }
}

// ==================== EXPORT CONFIGURATION ====================
export const API_CONSTANTS = {
  environment: ENVIRONMENT,
  endpoints: API_ENDPOINTS,
  config: API_CONFIG,
  payments: ETHIOPIAN_PAYMENT_CONFIG,
  aiConstruction: AI_CONSTRUCTION_CONFIG,
  errors: {
    codes: API_ERROR_CODES,
    messages: ERROR_MESSAGES,
  },
  security: SECURITY_CONFIG,
  service: APIService,
};

export default API_CONSTANTS;