// config/api.js

/**
 * ENTERPRISE-GRADE API CONFIGURATION
 * Yachi Construction & Services Platform
 * Advanced API Management with AI Construction Integration
 * Ethiopian Market Optimized Performance
 */

import { Platform } from 'react-native';
import { getVersion, getUniqueId, getSystemVersion } from 'react-native-device-info';
import Config from './app';
import { storage } from '../utils/storage';
import { errorService } from '../services/error-service';
import { analyticsService } from '../services/analytics-service';
import { security } from '../utils/security';

// Enterprise API Environment Configuration
const API_ENVIRONMENTS = {
  development: {
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.dev.yachi.et',
    version: 'v2',
    timeout: 45000,
    debug: true,
    logging: true,
    enableMock: true,
    encryption: true,
    compression: true,
  },
  staging: {
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.staging.yachi.et',
    version: 'v2',
    timeout: 35000,
    debug: true,
    logging: true,
    enableMock: false,
    encryption: true,
    compression: true,
  },
  production: {
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.yachi.et',
    version: 'v2',
    timeout: 25000,
    debug: false,
    logging: false,
    enableMock: false,
    encryption: true,
    compression: true,
  },
};

// Enterprise API Endpoints Configuration
const ENDPOINTS = {
  // Authentication & Security
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
    PORTFOLIO: '/users/portfolio',
    PREFERENCES: '/users/preferences',
    SECURITY_SETTINGS: '/users/security',
    DELETE_ACCOUNT: '/users/account',
    ONLINE_STATUS: '/users/online',
  },

  // Services Marketplace
  SERVICES: {
    LIST: '/services',
    SEARCH: '/services/search',
    CREATE: '/services',
    DETAIL: '/services/:id',
    UPDATE: '/services/:id',
    DELETE: '/services/:id',
    CATEGORIES: '/services/categories',
    NEARBY: '/services/nearby',
    POPULAR: '/services/popular',
    RECOMMENDED: '/services/recommended',
    FAVORITE: '/services/:id/favorite',
    FAVORITES: '/services/favorites',
    REVIEWS: '/services/:id/reviews',
    AVAILABILITY: '/services/:id/availability',
    PRICING: '/services/:id/pricing',
  },

  // AI Construction Management
  CONSTRUCTION: {
    CREATE_PROJECT: '/construction/projects',
    PROJECTS_LIST: '/construction/projects',
    PROJECT_DETAIL: '/construction/projects/:id',
    UPDATE_PROJECT: '/construction/projects/:id',
    AI_WORKER_MATCHING: '/construction/ai/matching',
    WORKER_INVITATIONS: '/construction/invitations',
    ACCEPT_INVITATION: '/construction/invitations/:id/accept',
    DECLINE_INVITATION: '/construction/invitations/:id/decline',
    PROJECT_PROGRESS: '/construction/projects/:id/progress',
    MILESTONES: '/construction/projects/:id/milestones',
    BUDGET_MANAGEMENT: '/construction/projects/:id/budget',
    DOCUMENTS: '/construction/projects/:id/documents',
  },

  // Government Portal
  GOVERNMENT: {
    DASHBOARD: '/government/dashboard',
    PROJECTS: '/government/projects',
    CREATE_PROJECT: '/government/projects',
    PROJECT_DETAIL: '/government/projects/:id',
    ANALYTICS: '/government/analytics',
    REPORTS: '/government/reports',
    WORKER_MANAGEMENT: '/government/workers',
    BUDGET_MANAGEMENT: '/government/budget',
    INFRASTRUCTURE: '/government/infrastructure',
  },

  // Bookings & Scheduling
  BOOKINGS: {
    LIST: '/bookings',
    CREATE: '/bookings',
    DETAIL: '/bookings/:id',
    UPDATE: '/bookings/:id',
    CANCEL: '/bookings/:id/cancel',
    CONFIRM: '/bookings/:id/confirm',
    COMPLETE: '/bookings/:id/complete',
    RESCHEDULE: '/bookings/:id/reschedule',
    HISTORY: '/bookings/history',
    UPCOMING: '/bookings/upcoming',
    AVAILABILITY: '/bookings/availability',
    TRACKING: '/bookings/:id/tracking',
  },

  // Ethiopian Payment Integration
  PAYMENTS: {
    CREATE_INTENT: '/payments/intent',
    CONFIRM_CHAPA: '/payments/chapa/confirm',
    CONFIRM_TELEBIRR: '/payments/telebirr/confirm',
    CONFIRM_CBE_BIRR: '/payments/cbe-birr/confirm',
    METHODS: '/payments/methods',
    DEFAULT_METHOD: '/payments/default-method',
    TRANSACTIONS: '/payments/transactions',
    REFUND: '/payments/:id/refund',
    RECEIPT: '/payments/:id/receipt',
  },

  // Real-time Chat & Communication
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: '/chat/conversations/:id/messages',
    SEND_MESSAGE: '/chat/conversations/:id/messages',
    MARK_READ: '/chat/conversations/:id/read',
    TYPING_INDICATOR: '/chat/conversations/:id/typing',
    UPLOAD_ATTACHMENT: '/chat/upload',
    BLOCK_USER: '/chat/block',
    REPORT_CONVERSATION: '/chat/report',
  },

  // Premium Features
  PREMIUM: {
    SUBSCRIPTION_PLANS: '/premium/plans',
    SUBSCRIBE: '/premium/subscribe',
    CANCEL_SUBSCRIPTION: '/premium/cancel',
    UPGRADE: '/premium/upgrade',
    FEATURED_LISTING: '/premium/featured',
    BADGE_STATUS: '/premium/badge',
    BENEFITS: '/premium/benefits',
  },

  // Notifications & Alerts
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences',
    TOKEN: '/notifications/token',
    PUSH_SETTINGS: '/notifications/push-settings',
  },

  // File Uploads & Media
  UPLOADS: {
    REQUEST_URL: '/uploads/request-url',
    CONFIRM: '/uploads/confirm',
    DELETE: '/uploads/:id',
    PORTFOLIO_IMAGES: '/uploads/portfolio',
    DOCUMENTS: '/uploads/documents',
    COMPRESS_IMAGE: '/uploads/compress',
  },

  // Analytics & Insights
  ANALYTICS: {
    TRACK: '/analytics/track',
    PAGE_VIEW: '/analytics/pageview',
    EVENT: '/analytics/event',
    USER_BEHAVIOR: '/analytics/behavior',
    PERFORMANCE: '/analytics/performance',
    BUSINESS_INSIGHTS: '/analytics/business',
  },

  // Admin & Moderation
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    SERVICES: '/admin/services',
    BOOKINGS: '/admin/bookings',
    CONSTRUCTION_PROJECTS: '/admin/construction',
    GOVERNMENT_PROJECTS: '/admin/government',
    REPORTS: '/admin/reports',
    MODERATION: '/admin/moderation',
    FINANCIAL_REPORTS: '/admin/financial',
  },

  // System Health & Monitoring
  SYSTEM: {
    HEALTH: '/system/health',
    STATUS: '/system/status',
    METRICS: '/system/metrics',
    LOGS: '/system/logs',
    MAINTENANCE: '/system/maintenance',
  },
};

// Enterprise HTTP Status Codes
const HTTP_STATUS = {
  // Success (2xx)
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  PARTIAL_CONTENT: 206,

  // Redirection (3xx)
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Errors (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  BLOCKED_BY_SECURITY: 451,

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
};

// Enterprise Error Codes with Ethiopian Context
const ERROR_CODES = {
  // Authentication & Security (AUTH_xxx)
  INVALID_CREDENTIALS: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  TOKEN_INVALID: 'AUTH_003',
  ACCESS_DENIED: 'AUTH_004',
  ACCOUNT_LOCKED: 'AUTH_005',
  EMAIL_NOT_VERIFIED: 'AUTH_006',
  PHONE_NOT_VERIFIED: 'AUTH_007',
  BIOMETRIC_NOT_SETUP: 'AUTH_008',
  TWO_FACTOR_REQUIRED: 'AUTH_009',

  // Validation Errors (VAL_xxx)
  VALIDATION_FAILED: 'VAL_001',
  REQUIRED_FIELD: 'VAL_002',
  INVALID_EMAIL: 'VAL_003',
  INVALID_ETHIOPIAN_PHONE: 'VAL_004',
  INVALID_FORMAT: 'VAL_005',
  INVALID_LOCATION: 'VAL_006',
  INVALID_AMOUNT: 'VAL_007',

  // Resource Errors (RES_xxx)
  RESOURCE_NOT_FOUND: 'RES_001',
  RESOURCE_CONFLICT: 'RES_002',
  RESOURCE_LIMIT_REACHED: 'RES_003',
  SERVICE_UNAVAILABLE: 'RES_004',
  CONSTRUCTION_PROJECT_FULL: 'RES_005',

  // Payment & Financial (PAY_xxx)
  PAYMENT_FAILED: 'PAY_001',
  INSUFFICIENT_FUNDS: 'PAY_002',
  CARD_DECLINED: 'PAY_003',
  CHAPA_ERROR: 'PAY_004',
  TELEBIRR_ERROR: 'PAY_005',
  CBE_BIRR_ERROR: 'PAY_006',
  PAYMENT_GATEWAY_UNAVAILABLE: 'PAY_007',

  // AI & Construction (AI_xxx)
  AI_MATCHING_FAILED: 'AI_001',
  WORKER_UNAVAILABLE: 'AI_002',
  PROJECT_COMPLEXITY_ERROR: 'AI_003',
  BUDGET_CALCULATION_ERROR: 'AI_004',
  TIMELINE_OPTIMIZATION_FAILED: 'AI_005',

  // System & Technical (SYS_xxx)
  DATABASE_ERROR: 'SYS_001',
  EXTERNAL_SERVICE_ERROR: 'SYS_002',
  NETWORK_ERROR: 'SYS_003',
  STORAGE_ERROR: 'SYS_004',
  ENCRYPTION_ERROR: 'SYS_005',
};

// Enterprise Retry Configuration
const RETRY_CONFIG = {
  maxRetries: 4,
  baseDelay: 1000,
  maxDelay: 15000,
  backoffMultiplier: 2,
  retryableStatuses: [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ],
  retryableMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  excludedEndpoints: [
    '/payments/confirm',
    '/payments/refund',
    '/bookings/create',
    '/construction/projects/create',
  ],
};

// Advanced Cache Configuration
const CACHE_CONFIG = {
  enabled: true,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  maxSize: 200, // Maximum cached responses
  offlineSupport: true,
  excludedEndpoints: [
    '/auth/login',
    '/auth/register',
    '/payments',
    '/bookings/create',
    '/construction/projects/create',
    '/chat/messages',
    '/notifications',
  ],
  priorityLevels: {
    HIGH: 3600000, // 1 hour
    MEDIUM: 600000, // 10 minutes
    LOW: 300000, // 5 minutes
  },
};

// Enterprise Rate Limiting
const RATE_LIMIT_CONFIG = {
  enabled: true,
  maxRequests: 150, // Requests per window
  windowMs: 15 * 60 * 1000, // 15 minutes
  trustProxy: true,
  excludedEndpoints: [
    '/auth/login',
    '/auth/refresh',
    '/system/health',
  ],
  tierLimits: {
    FREE: 100,
    PREMIUM: 500,
    ENTERPRISE: 1000,
  },
};

// Security Configuration
const SECURITY_CONFIG = {
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM',
    keyRotation: 24 * 60 * 60 * 1000, // 24 hours
  },
  headers: {
    hsts: true,
    xss: true,
    noSniff: true,
    frameGuard: true,
  },
  cors: {
    allowedOrigins: [
      'https://yachi.et',
      'https://app.yachi.et',
      'https://admin.yachi.et',
    ],
    credentials: true,
  },
};

class EnterpriseAPIConfig {
  constructor() {
    this.environment = Config.environment || 'development';
    this.config = API_ENVIRONMENTS[this.environment] || API_ENVIRONMENTS.development;
    this.endpoints = ENDPOINTS;
    this.cache = new Map();
    this.rateLimitCount = 0;
    this.rateLimitReset = Date.now();
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.securityNonce = this.generateNonce();
    
    this.initialize();
  }

  /**
   * Initialize Enterprise API Configuration
   */
  initialize = async () => {
    await this.setupDefaultHeaders();
    this.setupInterceptors();
    await this.loadCacheFromStorage();
    await this.initializeSecurity();

    if (this.config.logging) {
      console.log(`🚀 Enterprise API Config initialized for ${this.environment} environment`);
      console.log(`📡 Base URL: ${this.config.baseURL}`);
    }
  };

  /**
   * Setup Enterprise Default Headers
   */
  setupDefaultHeaders = async () => {
    const deviceId = await getUniqueId();
    const appVersion = await getVersion();
    const systemVersion = await getSystemVersion();

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en-ET,am-ET,om-ET',
      'X-Platform': Platform.OS,
      'X-Platform-Version': systemVersion,
      'X-App-Version': appVersion,
      'X-App-Build': Config.app.buildNumber,
      'X-Device-ID': deviceId,
      'X-Client-Type': 'mobile',
      'X-Client-Version': appVersion,
      'X-Security-Nonce': this.securityNonce,
      'X-Request-Source': 'yachi-mobile',
      'User-Agent': `YachiMobile/${appVersion} (${Platform.OS} ${systemVersion})`,
      
      // Security Headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    };

    // Add compression header if enabled
    if (this.config.compression) {
      this.defaultHeaders['Accept-Encoding'] = 'gzip, deflate, br';
    }
  };

  /**
   * Setup Enterprise Interceptors
   */
  setupInterceptors = () => {
    // Request interceptor for security and analytics
    this.addRequestInterceptor(async (config) => {
      try {
        // Add authentication token
        const token = await storage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add security headers
        config.headers['X-Request-ID'] = this.generateRequestId();
        config.headers['X-Timestamp'] = Date.now().toString();
        config.headers['X-Session-ID'] = await this.getSessionId();

        // Encrypt sensitive data if enabled
        if (this.config.encryption && config.data) {
          config.data = await this.encryptSensitiveData(config.data);
        }

        // Track request for analytics
        analyticsService.trackAPIRequest(config);

        return config;
      } catch (error) {
        console.error('🔒 Request interceptor error:', error);
        return config;
      }
    });

    // Response interceptor for error handling and decryption
    this.addResponseInterceptor(
      async (response) => {
        await this.trackAPIMetrics(response);
        
        // Decrypt response if encrypted
        if (this.config.encryption && response.data) {
          response.data = await this.decryptResponseData(response.data);
        }
        
        return response;
      },
      async (error) => {
        await this.handleEnterpriseAPIError(error);
        return Promise.reject(error);
      }
    );
  };

  /**
   * Initialize Security Features
   */
  initializeSecurity = async () => {
    try {
      // Generate session ID
      await this.initializeSession();
      
      // Setup encryption keys
      await security.initializeEncryption();
      
      // Validate security configuration
      await this.validateSecurityConfig();
      
    } catch (error) {
      console.error('🔐 Security initialization failed:', error);
      throw error;
    }
  };

  /**
   * Get Full URL for Endpoint with Ethiopian Context
   */
  getURL = (endpoint, params = {}, queryParams = {}) => {
    let url = `${this.config.baseURL}/${this.config.version}${endpoint}`;
    
    // Replace path parameters
    Object.keys(params).forEach(key => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, encodeURIComponent(params[key]));
      }
    });

    // Add query parameters for Ethiopian context
    const query = new URLSearchParams();
    
    // Add locale and currency
    query.append('locale', 'et_ET');
    query.append('currency', 'ETB');
    query.append('timezone', 'Africa/Addis_Ababa');
    
    // Add custom query params
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] !== undefined && queryParams[key] !== null) {
        query.append(key, queryParams[key]);
      }
    });

    const queryString = query.toString();
    return queryString ? `${url}?${queryString}` : url;
  };

  /**
   * Get Enterprise Endpoint Configuration
   */
  getEndpoint = (category, action, params = {}, queryParams = {}) => {
    const endpoint = this.endpoints[category]?.[action];
    if (!endpoint) {
      throw new Error(`🚫 Endpoint not found: ${category}.${action}`);
    }

    const url = this.getURL(endpoint, params, queryParams);
    const method = this.getMethod(action);
    const requiresAuth = this.requiresAuth(category, action);
    const isRetryable = this.isRetryable(action);
    const shouldCache = this.shouldCache(endpoint);
    const timeout = this.getTimeout(category);
    const priority = this.getPriority(category, action);

    return {
      url,
      method,
      requiresAuth,
      isRetryable,
      shouldCache,
      timeout,
      priority,
      category,
      action,
      cacheKey: this.getCacheKey({ url, method, params: queryParams }),
    };
  };

  /**
   * Determine HTTP Method with Enterprise Logic
   */
  getMethod = (action) => {
    const methodMap = {
      'GET': [
        'list', 'detail', 'history', 'upcoming', 'availability', 
        'categories', 'nearby', 'popular', 'recommended', 'favorites',
        'profile', 'analytics', 'dashboard', 'reports', 'health'
      ],
      'POST': [
        'create', 'register', 'login', 'logout', 'forgot-password', 
        'reset-password', 'verify-email', 'verify-phone', 'social',
        'send', 'confirm', 'complete', 'favorite', 'mark_read', 
        'mark_all_read', 'upload', 'track', 'refund', 'subscribe',
        'matching', 'invitations', 'accept', 'decline'
      ],
      'PUT': [
        'update', 'update_profile', 'preferences', 'progress',
        'milestones', 'budget', 'reschedule', 'upgrade'
      ],
      'DELETE': [
        'delete', 'cancel', 'delete_account', 'block', 'unsubscribe'
      ],
    };

    for (const [method, actions] of Object.entries(methodMap)) {
      if (actions.includes(action.toLowerCase())) {
        return method;
      }
    }

    return 'GET';
  };

  /**
   * Enhanced Authentication Requirement Check
   */
  requiresAuth = (category, action) => {
    const publicEndpoints = [
      'AUTH.LOGIN',
      'AUTH.REGISTER',
      'AUTH.FORGOT_PASSWORD',
      'AUTH.RESET_PASSWORD',
      'AUTH.VERIFY_EMAIL',
      'AUTH.VERIFY_PHONE',
      'AUTH.SOCIAL_LOGIN',
      'SERVICES.LIST',
      'SERVICES.SEARCH',
      'SERVICES.DETAIL',
      'SERVICES.CATEGORIES',
      'SERVICES.NEARBY',
      'SERVICES.POPULAR',
      'SERVICES.RECOMMENDED',
      'SYSTEM.HEALTH',
      'SYSTEM.STATUS',
    ];

    return !publicEndpoints.includes(`${category}.${action}`);
  };

  /**
   * Enterprise Error Handler
   */
  handleEnterpriseAPIError = async (error) => {
    const errorContext = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    // Track error analytics
    analyticsService.trackEvent('api_error', errorContext);

    // Handle specific error cases with Ethiopian context
    switch (error.response?.status) {
      case HTTP_STATUS.UNAUTHORIZED:
        await this.handleUnauthorizedError();
        break;
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        await this.handleRateLimitError();
        break;
      case HTTP_STATUS.FORBIDDEN:
        await this.handleForbiddenError(error);
        break;
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        await this.handleServiceUnavailable();
        break;
      default:
        await this.handleGenericError(error);
    }

    // Capture error for enterprise monitoring
    errorService.captureError(error, {
      context: 'EnterpriseAPI',
      ...errorContext,
    });
  };

  /**
   * Enhanced Security Methods
   */
  generateNonce = () => {
    return `nonce_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  };

  generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  initializeSession = async () => {
    let sessionId = await storage.getItem('session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      await storage.setItem('session_id', sessionId);
    }
    return sessionId;
  };

  getSessionId = async () => {
    return await storage.getItem('session_id') || 'unknown';
  };

  encryptSensitiveData = async (data) => {
    if (!this.config.encryption) return data;
    
    try {
      return await security.encryptData(JSON.stringify(data));
    } catch (error) {
      console.warn('🔒 Encryption failed, sending plain data:', error);
      return data;
    }
  };

  decryptResponseData = async (encryptedData) => {
    if (!this.config.encryption) return encryptedData;
    
    try {
      return JSON.parse(await security.decryptData(encryptedData));
    } catch (error) {
      console.warn('🔒 Decryption failed, returning raw data:', error);
      return encryptedData;
    }
  };

  /**
   * Enterprise Cache Management
   */
  getCacheKey = (config) => {
    const baseKey = `${config.method}:${config.url}`;
    const paramsHash = security.generateHash(JSON.stringify(config.params || {}));
    return `${baseKey}:${paramsHash}`;
  };

  getCachedResponse = (cacheKey) => {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    // Check cache validity
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update last accessed time
    cached.lastAccessed = Date.now();
    return cached.data;
  };

  setCachedResponse = (cacheKey, data, priority = 'MEDIUM') => {
    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      this.evictOldestCacheEntry();
    }

    const ttl = CACHE_CONFIG.priorityLevels[priority] || CACHE_CONFIG.defaultTTL;
    
    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      priority,
    });

    // Persist cache periodically
    if (this.cache.size % 5 === 0) {
      this.saveCacheToStorage();
    }
  };

  evictOldestCacheEntry = () => {
    let oldestKey = null;
    let oldestAccess = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccessed < oldestAccess) {
        oldestAccess = value.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  };

  /**
   * Enterprise Configuration Getters
   */
  getConfig = () => ({
    ...this.config,
    endpoints: this.endpoints,
    environment: this.environment,
    isDevelopment: this.environment === 'development',
    isStaging: this.environment === 'staging',
    isProduction: this.environment === 'production',
    security: {
      encryption: this.config.encryption,
      nonce: this.securityNonce,
    },
  });

  // ... (other methods remain similar but enhanced for enterprise)

  /**
   * Validate Security Configuration
   */
  validateSecurityConfig = async () => {
    const validations = [
      this.validateEncryptionKeys(),
      this.validateAPIVersion(),
      this.validateEndpoints(),
    ];

    const results = await Promise.allSettled(validations);
    
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.warn('⚠️ Security validation warnings:', failures);
    }
  };

  validateEncryptionKeys = async () => {
    if (this.config.encryption) {
      const keysValid = await security.validateEncryptionKeys();
      if (!keysValid) {
        throw new Error('🔑 Encryption keys validation failed');
      }
    }
  };

  validateAPIVersion = async () => {
    if (!this.config.version || !this.config.version.startsWith('v')) {
      throw new Error('🚫 Invalid API version format');
    }
  };

  validateEndpoints = async () => {
    for (const [category, endpoints] of Object.entries(this.endpoints)) {
      for (const [action, endpoint] of Object.entries(endpoints)) {
        if (!endpoint.startsWith('/')) {
          throw new Error(`🚫 Invalid endpoint format: ${category}.${action}`);
        }
      }
    }
  };
}

// Create and export singleton instance
export const apiConfig = new EnterpriseAPIConfig();

// Export constants and utilities
export {
  API_ENVIRONMENTS,
  ENDPOINTS,
  HTTP_STATUS,
  ERROR_CODES,
  RETRY_CONFIG,
  CACHE_CONFIG,
  RATE_LIMIT_CONFIG,
  SECURITY_CONFIG,
};

export default apiConfig;