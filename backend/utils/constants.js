// 🎯 APPLICATION CONSTANTS
const APP = {
  NAME: 'Yachi',
  VERSION: '1.0.0',
  DESCRIPTION: 'Ethiopia\'s Premier Service Marketplace Platform',
  SUPPORT_EMAIL: 'support@yachi.com',
  CONTACT_PHONE: '+251-911-123-456',
  COMPANY_NAME: 'Yachi Technologies PLC',
  COMPANY_ADDRESS: 'Addis Ababa, Ethiopia',
  
  // Environment
  ENVIRONMENTS: {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    TEST: 'test'
  },
  
  // Default settings
  DEFAULT_LANGUAGE: 'am',
  DEFAULT_CURRENCY: 'ETB',
  DEFAULT_TIMEZONE: 'Africa/Addis_Ababa',
  DEFAULT_COUNTRY: 'ET',
  
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_BULK_UPLOAD: 50,
  
  // API
  API_PREFIX: '/api/v1',
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Security
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_TOKEN_EXPIRY: '7d',
  ACCESS_TOKEN_EXPIRY: '15m',
  
  // Cache
  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400 // 24 hours
  }
};

// 🎯 USER ROLES AND PERMISSIONS
const ROLES = {
  CLIENT: 'client',
  PROVIDER: 'provider',
  GRADUATE: 'graduate',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  MODERATOR: 'moderator'
};

const PERMISSIONS = {
  // User permissions
  PROFILE_VIEW: 'profile:view',
  PROFILE_EDIT: 'profile:edit',
  PROFILE_DELETE: 'profile:delete',
  
  // Service permissions
  SERVICE_CREATE: 'service:create',
  SERVICE_EDIT: 'service:edit',
  SERVICE_DELETE: 'service:delete',
  SERVICE_VIEW: 'service:view',
  
  // Booking permissions
  BOOKING_CREATE: 'booking:create',
  BOOKING_EDIT: 'booking:edit',
  BOOKING_CANCEL: 'booking:cancel',
  BOOKING_VIEW: 'booking:view',
  
  // Payment permissions
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_REFUND: 'payment:refund',
  
  // Admin permissions
  USER_MANAGE: 'user:manage',
  SERVICE_MANAGE: 'service:manage',
  BOOKING_MANAGE: 'booking:manage',
  PAYMENT_MANAGE: 'payment:manage',
  SYSTEM_MANAGE: 'system:manage'
};

const ROLE_PERMISSIONS = {
  [ROLES.CLIENT]: [
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
    PERMISSIONS.SERVICE_VIEW,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_EDIT,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.BOOKING_VIEW,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_VIEW
  ],
  
  [ROLES.PROVIDER]: [
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
    PERMISSIONS.SERVICE_CREATE,
    PERMISSIONS.SERVICE_EDIT,
    PERMISSIONS.SERVICE_DELETE,
    PERMISSIONS.SERVICE_VIEW,
    PERMISSIONS.BOOKING_VIEW,
    PERMISSIONS.PAYMENT_VIEW
  ],
  
  [ROLES.GRADUATE]: [
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
    PERMISSIONS.SERVICE_CREATE,
    PERMISSIONS.SERVICE_EDIT,
    PERMISSIONS.SERVICE_VIEW,
    PERMISSIONS.BOOKING_VIEW,
    PERMISSIONS.PAYMENT_VIEW
  ],
  
  [ROLES.ADMIN]: [
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.SERVICE_MANAGE,
    PERMISSIONS.BOOKING_MANAGE,
    PERMISSIONS.PAYMENT_MANAGE,
    ...Object.values(PERMISSIONS)
  ],
  
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.SYSTEM_MANAGE,
    ...Object.values(PERMISSIONS)
  ]
};

// 🎯 SERVICE CATEGORIES AND SUBCATEGORIES
const SERVICE_CATEGORIES = {
  CONSTRUCTION: {
    code: 'construction',
    name: 'Construction & Renovation',
    subcategories: [
      'general_contractor',
      'plumbing',
      'electrical',
      'carpentry',
      'painting',
      'masonry',
      'roofing',
      'flooring'
    ]
  },
  
  HOME_SERVICES: {
    code: 'home_services',
    name: 'Home Services',
    subcategories: [
      'cleaning',
      'moving',
      'gardening',
      'pest_control',
      'appliance_repair',
      'furniture_assembly'
    ]
  },
  
  AUTOMOTIVE: {
    code: 'automotive',
    name: 'Automotive',
    subcategories: [
      'mechanic',
      'car_wash',
      'detailing',
      'tire_service',
      'auto_electrician'
    ]
  },
  
  TECHNOLOGY: {
    code: 'technology',
    name: 'Technology',
    subcategories: [
      'computer_repair',
      'software_development',
      'network_setup',
      'website_design',
      'mobile_app_development'
    ]
  },
  
  EDUCATION: {
    code: 'education',
    name: 'Education & Tutoring',
    subcategories: [
      'academic_tutoring',
      'language_lessons',
      'music_lessons',
      'test_preparation',
      'computer_training'
    ]
  },
  
  HEALTH: {
    code: 'health',
    name: 'Health & Wellness',
    subcategories: [
      'personal_training',
      'yoga_instruction',
      'massage_therapy',
      'nutrition_consulting'
    ]
  },
  
  EVENTS: {
    code: 'events',
    name: 'Events & Photography',
    subcategories: [
      'photography',
      'videography',
      'event_planning',
      'catering',
      'entertainment'
    ]
  },
  
  BEAUTY: {
    code: 'beauty',
    name: 'Beauty & Personal Care',
    subcategories: [
      'hair_styling',
      'makeup_artistry',
      'barber_services',
      'spa_treatments',
      'nail_services'
    ]
  }
};

// 🎯 BOOKING STATUSES
const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  DISPUTED: 'disputed'
};

const BOOKING_STATUS_FLOW = {
  [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED],
  [BOOKING_STATUS.CONFIRMED]: [BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.IN_PROGRESS]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.DISPUTED],
  [BOOKING_STATUS.COMPLETED]: [],
  [BOOKING_STATUS.CANCELLED]: [],
  [BOOKING_STATUS.EXPIRED]: [],
  [BOOKING_STATUS.DISPUTED]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED]
};

// 🎯 PAYMENT CONSTANTS
const PAYMENT_METHODS = {
  MOBILE_MONEY: 'mobile_money',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  CASH: 'cash'
};

const PAYMENT_PROVIDERS = {
  TELEBIRR: 'telebirr',
  CBE_BIRR: 'cbebirr',
  HELLO_CASH: 'hello_cash',
  AWASH_BANK: 'awash_bank',
  DAShen_BANK: 'dashen_bank',
  CHAPA: 'chapa'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

const CURRENCIES = {
  ETB: 'ETB',
  USD: 'USD'
};

// 🎯 VERIFICATION CONSTANTS
const VERIFICATION_TYPES = {
  FAYDA_ID: 'fayda_id',
  PASSPORT: 'passport',
  DRIVING_LICENSE: 'driving_license',
  DEGREE_CERTIFICATE: 'degree_certificate',
  PROFESSIONAL_CERTIFICATE: 'professional_certificate',
  BUSINESS_LICENSE: 'business_license',
  SELFIE: 'selfie'
};

const VERIFICATION_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

const DOCUMENT_STATUS = {
  NOT_UPLOADED: 'not_uploaded',
  PENDING_VERIFICATION: 'pending_verification',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

// 🎯 REVIEW AND RATING CONSTANTS
const RATING_VALUES = {
  MIN: 1,
  MAX: 5,
  DEFAULT: 5
};

const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FLAGGED: 'flagged'
};

// 🎯 NOTIFICATION CONSTANTS
const NOTIFICATION_TYPES = {
  SYSTEM: 'system',
  BOOKING: 'booking',
  PAYMENT: 'payment',
  REVIEW: 'review',
  VERIFICATION: 'verification',
  PROMOTIONAL: 'promotional',
  SECURITY: 'security'
};

const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app'
};

const NOTIFICATION_PREFERENCES = {
  ALL: 'all',
  IMPORTANT: 'important',
  NONE: 'none'
};

// 🎯 GAMIFICATION CONSTANTS
const GAMIFICATION = {
  // Points categories
  POINTS_CATEGORIES: {
    ENGAGEMENT: 'engagement',
    COMPLETION: 'completion',
    QUALITY: 'quality',
    SOCIAL: 'social',
    VERIFICATION: 'verification'
  },

  // Points values for different actions
  POINTS_VALUES: {
    PROFILE_COMPLETION: 50,
    SERVICE_CREATION: 25,
    FIRST_BOOKING: 100,
    BOOKING_COMPLETION: 30,
    POSITIVE_REVIEW: 20,
    REFERRAL: 50,
    VERIFICATION: 75,
    DAILY_LOGIN: 5,
    STREAK_BONUS: 10
  },

  // Levels and experience
  LEVELS: {
    1: { name: 'Beginner', pointsRequired: 0 },
    2: { name: 'Active', pointsRequired: 100 },
    3: { name: 'Regular', pointsRequired: 300 },
    4: { name: 'Expert', pointsRequired: 600 },
    5: { name: 'Master', pointsRequired: 1000 },
    6: { name: 'Elite', pointsRequired: 1500 },
    7: { name: 'Legend', pointsRequired: 2500 }
  },

  // Badges
  BADGES: {
    EARLY_ADOPTER: 'early_adopter',
    VERIFIED_PRO: 'verified_pro',
    FIVE_STAR: 'five_star',
    SUPER_HOST: 'super_host',
    POWER_USER: 'power_user',
    COMMUNITY_BUILDER: 'community_builder'
  }
};

// 🎯 LOCATION CONSTANTS
const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'Somali',
  'Southern Nations, Nationalities, and Peoples\' Region',
  'Tigray'
];

const ETHIOPIAN_CITIES = {
  'Addis Ababa': ['Addis Ababa'],
  'Amhara': ['Bahir Dar', 'Gondar', 'Dessie', 'Debre Markos', 'Debre Birhan'],
  'Oromia': ['Adama', 'Jimma', 'Bishoftu', 'Ambo', 'Nekemte', 'Shashamane'],
  'Tigray': ['Mekele', 'Adigrat', 'Axum', 'Shire', 'Humera'],
  'SNNPR': ['Hawassa', 'Arba Minch', 'Dilla', 'Sodo', 'Wolaita Sodo'],
  'Dire Dawa': ['Dire Dawa'],
  'Harari': ['Harar']
};

// 🎯 TIME AND SCHEDULING CONSTANTS
const BUSINESS_HOURS = {
  OPEN: '08:00',
  CLOSE: '18:00',
  BREAK_START: '12:00',
  BREAK_END: '13:00'
};

const WORKING_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TIME_SLOTS = {
  MORNING: '08:00-12:00',
  AFTERNOON: '13:00-17:00',
  EVENING: '17:00-20:00'
};

// 🎯 ERROR CODES AND MESSAGES
const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  
  // System errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Business logic errors
  BOOKING_UNAVAILABLE: 'BOOKING_UNAVAILABLE',
  SERVICE_INACTIVE: 'SERVICE_INACTIVE',
  USER_SUSPENDED: 'USER_SUSPENDED',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED'
};

const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 'Invalid authentication token',
  [ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: 'Your account has been temporarily locked for security reasons',
  
  [ERROR_CODES.VALIDATION_ERROR]: 'The provided data is invalid',
  [ERROR_CODES.REQUIRED_FIELD]: 'This field is required',
  [ERROR_CODES.INVALID_EMAIL]: 'Please provide a valid email address',
  [ERROR_CODES.INVALID_PHONE]: 'Please provide a valid phone number',
  [ERROR_CODES.INVALID_PASSWORD]: 'Password must be at least 8 characters with uppercase, lowercase, number and symbol',
  
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The requested resource was not found',
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 'A resource with these details already exists',
  [ERROR_CODES.RESOURCE_CONFLICT]: 'This action conflicts with existing resources',
  
  [ERROR_CODES.PAYMENT_FAILED]: 'Payment processing failed. Please try again.',
  [ERROR_CODES.PAYMENT_DECLINED]: 'Your payment was declined. Please check your payment details.',
  [ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds to complete this transaction',
  
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An internal server error occurred. Please try again later.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
  [ERROR_CODES.DATABASE_ERROR]: 'A database error occurred. Please try again.',
  [ERROR_CODES.NETWORK_ERROR]: 'A network error occurred. Please check your connection.',
  
  [ERROR_CODES.BOOKING_UNAVAILABLE]: 'The selected time slot is no longer available',
  [ERROR_CODES.SERVICE_INACTIVE]: 'This service is currently inactive',
  [ERROR_CODES.USER_SUSPENDED]: 'This account has been suspended',
  [ERROR_CODES.LIMIT_EXCEEDED]: 'You have reached the maximum limit for this action'
};

// 🎯 SUCCESS MESSAGES
const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'Account created successfully. Welcome to Yachi!',
  USER_LOGGED_IN: 'Logged in successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  SERVICE_CREATED: 'Service created successfully',
  SERVICE_UPDATED: 'Service updated successfully',
  BOOKING_CREATED: 'Booking created successfully',
  BOOKING_CONFIRMED: 'Booking confirmed successfully',
  BOOKING_COMPLETED: 'Booking completed successfully',
  PAYMENT_SUCCESSFUL: 'Payment processed successfully',
  REVIEW_SUBMITTED: 'Review submitted successfully',
  VERIFICATION_SUBMITTED: 'Verification documents submitted for review'
};

// 🎯 STATUS CODES
const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// 🎯 FILE UPLOAD CONSTANTS
const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALL: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

const UPLOAD_PATHS = {
  PROFILE_IMAGES: 'uploads/profiles',
  PORTFOLIO_ITEMS: 'uploads/portfolios',
  DOCUMENTS: 'uploads/documents',
  SERVICE_IMAGES: 'uploads/services',
  TEMP: 'uploads/temp'
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  USER: (userId) => `user:${userId}`,
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  SERVICE: (serviceId) => `service:${serviceId}`,
  SERVICES_BY_CATEGORY: (category) => `services:category:${category}`,
  BOOKING: (bookingId) => `booking:${bookingId}`,
  USER_BOOKINGS: (userId) => `bookings:user:${userId}`,
  PROVIDER_BOOKINGS: (providerId) => `bookings:provider:${providerId}`,
  REVIEWS: (entityType, entityId) => `reviews:${entityType}:${entityId}`,
  LEADERBOARD: (type) => `leaderboard:${type}`,
  GAMIFICATION_PROFILE: (userId) => `gamification:profile:${userId}`
};

// 🎯 CONFIGURATION DEFAULTS
const DEFAULTS = {
  // User defaults
  USER: {
    AVATAR: '/images/default-avatar.png',
    COVER_IMAGE: '/images/default-cover.jpg',
    LANGUAGE: 'am',
    CURRENCY: 'ETB',
    TIMEZONE: 'Africa/Addis_Ababa',
    NOTIFICATION_PREFERENCES: NOTIFICATION_PREFERENCES.IMPORTANT
  },
  
  // Service defaults
  SERVICE: {
    DURATION: 60, // minutes
    PRICE: 100, // ETB
    CURRENCY: 'ETB',
    MAX_IMAGES: 5,
    STATUS: 'active'
  },
  
  // Booking defaults
  BOOKING: {
    STATUS: BOOKING_STATUS.PENDING,
    PAYMENT_STATUS: PAYMENT_STATUS.PENDING,
    CANCELLATION_WINDOW: 24 // hours
  },
  
  // Pagination defaults
  PAGINATION: {
    PAGE: 1,
    LIMIT: 20,
    SORT_BY: 'createdAt',
    SORT_ORDER: 'DESC'
  },
  
  // Search defaults
  SEARCH: {
    RADIUS: 50, // km
    MIN_RATING: 1,
    MAX_PRICE: 10000,
    SORT: 'relevance'
  }
};

// 🎯 EXPORT ALL CONSTANTS
module.exports = {
  APP,
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  SERVICE_CATEGORIES,
  BOOKING_STATUS,
  BOOKING_STATUS_FLOW,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUS,
  CURRENCIES,
  VERIFICATION_TYPES,
  VERIFICATION_STATUS,
  DOCUMENT_STATUS,
  RATING_VALUES,
  REVIEW_STATUS,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PREFERENCES,
  GAMIFICATION,
  ETHIOPIAN_REGIONS,
  ETHIOPIAN_CITIES,
  BUSINESS_HOURS,
  WORKING_DAYS,
  TIME_SLOTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  FILE_TYPES,
  UPLOAD_PATHS,
  CACHE_KEYS,
  DEFAULTS
};