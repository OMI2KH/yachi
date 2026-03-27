/**
 * Yachi Enterprise Type Definitions
 * Centralized type system for the entire Yachi platform
 * Comprehensive type safety across all modules and features
 */

// Re-export all type modules for easy access
export * from './user';
export * from './service';
export * from './booking';
export * from './payment';
export * from './chat';
export * from './project';
export * from './notification';
export * from './analytics';

/**
 * Core Platform Types
 * Fundamental types used across the entire Yachi ecosystem
 */

/**
 * @typedef {Object} BaseEntity
 * @property {string} id - Unique identifier
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {string} [createdBy] - Creator user ID
 * @property {string} [updatedBy] - Last updater user ID
 * @property {EntityStatus} status - Entity status
 */

/**
 * @typedef {('active' | 'inactive' | 'pending' | 'suspended' | 'deleted' | 'archived')} EntityStatus
 */

/**
 * @typedef {Object} TimestampRange
 * @property {Date} start - Start timestamp
 * @property {Date} end - End timestamp
 */

/**
 * @typedef {Object} GeoLocation
 * @property {number} latitude - Latitude coordinate
 * @property {number} longitude - Longitude coordinate
 * @property {string} [address] - Human-readable address
 * @property {string} [city] - City name
 * @property {string} [region] - Region/state
 * @property {string} [country] - Country code
 * @property {string} [postalCode] - Postal code
 */

/**
 * @typedef {Object} Address
 * @property {string} street - Street address
 * @property {string} city - City
 * @property {string} region - Region/state
 * @property {string} country - Country
 * @property {string} postalCode - Postal code
 * @property {GeoLocation} [coordinates] - Geographic coordinates
 */

/**
 * @typedef {Object} FileAttachment
 * @property {string} id - Unique file identifier
 * @property {string} name - Original file name
 * @property {string} url - File access URL
 * @property {string} mimeType - MIME type
 * @property {number} size - File size in bytes
 * @property {string} [thumbnailUrl] - Thumbnail URL for images/videos
 * @property {Object} [metadata] - Additional file metadata
 * @property {Date} uploadedAt - Upload timestamp
 * @property {string} uploadedBy - Uploader user ID
 */

/**
 * @typedef {Object} PaginationParams
 * @property {number} page - Page number (1-based)
 * @property {number} limit - Items per page
 * @property {string} [cursor] - Cursor for cursor-based pagination
 * @property {string} [sortBy] - Field to sort by
 * @property {'asc' | 'desc'} [sortOrder] - Sort direction
 * @property {string} [search] - Search query
 */

/**
 * @typedef {Object} PaginationInfo
 * @property {number} page - Current page
 * @property {number} limit - Items per page
 * @property {number} total - Total items
 * @property {number} totalPages - Total pages
 * @property {boolean} hasNext - Whether there are more pages
 * @property {boolean} hasPrev - Whether there are previous pages
 * @property {string} [nextCursor] - Next cursor for pagination
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {any} [data] - Response data
 * @property {string} [message] - Response message
 * @property {ApiError} [error] - Error details
 * @property {PaginationInfo} [pagination] - Pagination info (for list responses)
 */

/**
 * @typedef {Object} ApiError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {string} [details] - Detailed error information
 * @property {Object} [context] - Additional error context
 * @property {Date} timestamp - Error timestamp
 */

/**
 * @typedef {Object} AuditLog
 * @property {string} id - Log entry ID
 * @property {string} action - Action performed
 * @property {string} entityType - Type of entity affected
 * @property {string} entityId - ID of entity affected
 * @property {string} userId - User who performed the action
 * @property {Object} [previousState] - Previous entity state
 * @property {Object} [newState] - New entity state
 * @property {Object} [metadata] - Additional metadata
 * @property {Date} timestamp - Action timestamp
 * @property {string} [ipAddress] - User IP address
 * @property {string} [userAgent] - User agent string
 */

/**
 * Platform Configuration Types
 */

/**
 * @typedef {Object} AppConfig
 * @property {string} environment - Deployment environment
 * @property {string} version - App version
 * @property {Object} api - API configuration
 * @property {Object} features - Feature flags
 * @property {Object} limits - System limits
 * @property {Object} integrations - Third-party integrations
 */

/**
 * @typedef {Object} FeatureFlags
 * @property {boolean} aiMatching - AI worker matching feature
 * @property {boolean} governmentPortal - Government features
 * @property {boolean} premiumFeatures - Premium subscription features
 * @property {boolean} offlineMode - Offline functionality
 * @property {boolean} biometricAuth - Biometric authentication
 * @property {boolean} realTimeTracking - Real-time location tracking
 */

/**
 * @typedef {Object} SystemLimits
 * @property {number} maxFileSize - Maximum file upload size
 * @property {number} maxImagesPerService - Maximum images per service
 * @property {number} maxServicesPerProvider - Maximum services per provider
 * @property {number} maxBookingsPerDay - Maximum bookings per day
 * @property {number} maxMessagesPerMinute - Maximum messages per minute
 */

/**
 * Ethiopian Market Specific Types
 */

/**
 * @typedef {Object} EthiopianAddress
 * @property {string} kebele - Kebele (smallest administrative unit)
 * @property {string} woreda - Woreda (district)
 * @property {string} zone - Zone
 * @property {string} region - Region (e.g., Addis Ababa, Oromia)
 * @property {string} [houseNumber] - House number
 * @property {string} [phone] - Ethiopian phone number
 */

/**
 * @typedef {Object} EthiopianBusinessInfo
 * @property {string} [businessLicense] - Business license number
 * @property {string} [tinNumber] - Tax Identification Number
 * @property {string} [vatNumber] - VAT registration number
 * @property {string} [businessType] - Type of business
 * @property {EthiopianAddress} businessAddress - Registered business address
 */

/**
 * @typedef {Object} EthiopianHoliday
 * @property {string} name - Holiday name (English)
 * @property {string} nameAmharic - Holiday name in Amharic
 * @property {Date} date - Holiday date
 * @property {string} type - Holiday type (public, religious, national)
 */

/**
 * @typedef {('ETB')} EthiopianCurrency
 */

/**
 * Analytics and Reporting Types
 */

/**
 * @typedef {Object} AnalyticsEvent
 * @property {string} name - Event name
 * @property {string} category - Event category
 * @property {Object} properties - Event properties
 * @property {Object} [user] - User information
 * @property {Object} [device] - Device information
 * @property {Object} [session] - Session information
 * @property {Date} timestamp - Event timestamp
 */

/**
 * @typedef {Object} BusinessMetrics
 * @property {number} totalRevenue - Total platform revenue
 * @property {number} activeUsers - Number of active users
 * @property {number} completedBookings - Number of completed bookings
 * @property {number} serviceProviders - Number of active service providers
 * @property {number} customerSatisfaction - Average customer satisfaction score
 * @property {Object} growth - Growth metrics
 * @property {Object} geographic - Geographic distribution
 */

/**
 * @typedef {Object} TimeSeriesData
 * @property {Date} timestamp - Data point timestamp
 * @property {number} value - Metric value
 * @property {Object} [breakdown] - Value breakdown by category
 */

/**
 * Security and Authentication Types
 */

/**
 * @typedef {Object} AuthToken
 * @property {string} accessToken - Access token
 * @property {string} refreshToken - Refresh token
 * @property {number} expiresIn - Token expiration in seconds
 * @property {string} tokenType - Token type (Bearer)
 */

/**
 * @typedef {Object} SecurityContext
 * @property {string} userId - Authenticated user ID
 * @property {string[]} roles - User roles
 * @property {string[]} permissions - User permissions
 * @property {string} [sessionId] - Session ID
 * @property {string} [deviceId] - Device ID
 * @property {boolean} isAuthenticated - Authentication status
 */

/**
 * @typedef {Object} Permission
 * @property {string} resource - Resource being accessed
 * @property {string} action - Action being performed
 * @property {Object} [conditions] - Access conditions
 */

/**
 * Real-time Communication Types
 */

/**
 * @typedef {Object} RealTimeEvent
 * @property {string} type - Event type
 * @property {string} [channel] - Event channel
 * @property {any} data - Event data
 * @property {string} [userId] - Source user ID
 * @property {Date} timestamp - Event timestamp
 * @property {string} [id] - Event ID
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id - Subscription ID
 * @property {string} channel - Subscription channel
 * @property {string} userId - Subscriber user ID
 * @property {Object} [filters] - Subscription filters
 * @property {Date} createdAt - Subscription timestamp
 * @property {Date} [expiresAt] - Subscription expiration
 */

/**
 * Multi-language Support Types
 */

/**
 * @typedef {('en' | 'am' | 'om')} LanguageCode
 */

/**
 * @typedef {Object} LocalizedString
 * @property {string} en - English text
 * @property {string} am - Amharic text
 * @property {string} om - Oromo text
 */

/**
 * @typedef {Object} InternationalizationConfig
 * @property {LanguageCode} defaultLanguage - Default language
 * @property {LanguageCode[]} supportedLanguages - Supported languages
 * @property {Object} translations - Translation strings
 * @property {boolean} rtlSupport - Right-to-left text support
 */

/**
 * AI and Machine Learning Types
 */

/**
 * @typedef {Object} AIMatchingRequest
 * @property {string} projectId - Project ID
 * @property {string} projectType - Type of project
 * @property {Object} requirements - Project requirements
 * @property {Object} [constraints] - Matching constraints
 * @property {Object} [preferences] - User preferences
 */

/**
 * @typedef {Object} AIMatchingResult
 * @property {string} requestId - Matching request ID
 * @property {Object[]} matches - Array of worker matches
 * @property {number} confidence - Matching confidence score
 * @property {Object} [explanation] - Matching explanation
 * @property {Object} [alternatives] - Alternative matches
 */

/**
 * @typedef {Object} AIRecommendation
 * @property {string} type - Recommendation type
 * @property {any} data - Recommendation data
 * @property {number} score - Recommendation score
 * @property {Object} [metadata] - Recommendation metadata
 */

/**
 * Payment and Financial Types
 */

/**
 * @typedef {Object} FinancialTransaction
 * @property {string} id - Transaction ID
 * @property {string} type - Transaction type
 * @property {number} amount - Transaction amount
 * @property {string} currency - Currency code
 * @property {string} status - Transaction status
 * @property {string} [paymentMethod] - Payment method used
 * @property {string} [gateway] - Payment gateway
 * @property {Object} [metadata] - Transaction metadata
 * @property {Date} createdAt - Transaction timestamp
 */

/**
 * @typedef {Object} TaxCalculation
 * @property {number} subtotal - Amount before tax
 * @property {number} taxAmount - Tax amount
 * @property {number} total - Total amount after tax
 * @property {Object} breakdown - Tax breakdown by type
 * @property {string} currency - Currency code
 */

/**
 * Utility and Helper Types
 */

/**
 * @template T
 * @typedef {Object} Result
 * @property {boolean} success - Operation success status
 * @property {T} [data] - Success data
 * @property {ApiError} [error] - Error information
 */

/**
 * @template T
 * @typedef {Object} AsyncResult
 * @property {boolean} loading - Loading state
 * @property {T} [data] - Success data
 * @property {ApiError} [error] - Error information
 * @property {boolean} hasError - Whether there's an error
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Validation result
 * @property {string[]} errors - Validation errors
 * @property {Object} [warnings] - Validation warnings
 */

/**
 * @typedef {Object} FilterCondition
 * @property {string} field - Field to filter
 * @property {string} operator - Filter operator
 * @property {any} value - Filter value
 */

/**
 * @typedef {Object} SortCondition
 * @property {string} field - Field to sort
 * @property {'asc' | 'desc'} direction - Sort direction
 */

/**
 * Platform-specific Enum Types
 */

/**
 * @typedef {('client' | 'service_provider' | 'government' | 'admin' | 'system')} UserRole
 */

/**
 * @typedef {('pending' | 'verified' | 'rejected' | 'suspended')} VerificationStatus
 */

/**
 * @typedef {('pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed')} BookingStatus
 */

/**
 * @typedef {('pending' | 'processing' | 'completed' | 'failed' | 'refunded')} PaymentStatus
 */

/**
 * @typedef {('low' | 'medium' | 'high' | 'urgent')} PriorityLevel
 */

/**
 * @typedef {('draft' | 'published' | 'archived' | 'deleted')} ContentStatus
 */

/**
 * Type Guards and Validation Utilities
 */

/**
 * @param {any} value
 * @returns {value is BaseEntity}
 */
export const isBaseEntity = (value) => {
  return value &&
    typeof value.id === 'string' &&
    value.createdAt instanceof Date &&
    value.updatedAt instanceof Date &&
    typeof value.status === 'string';
};

/**
 * @param {any} value
 * @returns {value is GeoLocation}
 */
export const isGeoLocation = (value) => {
  return value &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number' &&
    value.latitude >= -90 && value.latitude <= 90 &&
    value.longitude >= -180 && value.longitude <= 180;
};

/**
 * @param {any} value
 * @returns {value is ApiResponse}
 */
export const isApiResponse = (value) => {
  return value && typeof value.success === 'boolean';
};

/**
 * @param {any} value
 * @returns {value is PaginationParams}
 */
export const isPaginationParams = (value) => {
  return value &&
    typeof value.page === 'number' &&
    typeof value.limit === 'number' &&
    value.page > 0 && value.limit > 0;
};

/**
 * Platform Constants
 */

export const PLATFORM_CONSTANTS = {
  // System limits
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  MAX_IMAGE_DIMENSIONS: { width: 4096, height: 4096 },
  MAX_STRING_LENGTH: 5000,
  MAX_ARRAY_LENGTH: 1000,

  // Ethiopian market constants
  ETHIOPIAN_CURRENCY: 'ETB',
  SUPPORTED_LANGUAGES: ['en', 'am', 'om'],
  ETHIOPIAN_TIMEZONE: 'Africa/Addis_Ababa',
  BUSINESS_HOURS: { start: 8, end: 18 }, // 8 AM to 6 PM

  // Platform configuration
  DEFAULT_PAGINATION_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes

  // Feature flags
  ENABLED_FEATURES: {
    AI_MATCHING: true,
    GOVERNMENT_PORTAL: true,
    PREMIUM_FEATURES: true,
    OFFLINE_MODE: true,
    REAL_TIME_TRACKING: true
  }
};

/**
 * Type Composition and Utility Types
 */

/**
 * @template T
 * @typedef {T & BaseEntity} Entity
 */

/**
 * @template T
 * @typedef {T & { userId: string }} UserOwned
 */

/**
 * @template T
 * @typedef {T & { location: GeoLocation }} Located
 */

/**
 * @template T
 * @typedef {T & { timestamps: TimestampRange }} TimeBounded
 */

/**
 * @typedef {Object} SearchFilters
 * @property {string} [query] - Search query
 * @property {FilterCondition[]} [filters] - Filter conditions
 * @property {SortCondition[]} [sort] - Sort conditions
 * @property {PaginationParams} [pagination] - Pagination parameters
 */

/**
 * Export all types for easy importing
 */
export default {
  // Core types
  BaseEntity,
  EntityStatus,
  GeoLocation,
  Address,
  PaginationParams,
  PaginationInfo,
  ApiResponse,
  ApiError,

  // Platform types
  AppConfig,
  FeatureFlags,
  SystemLimits,

  // Ethiopian market types
  EthiopianAddress,
  EthiopianBusinessInfo,
  EthiopianCurrency,

  // Analytics types
  AnalyticsEvent,
  BusinessMetrics,
  TimeSeriesData,

  // Security types
  AuthToken,
  SecurityContext,
  Permission,

  // Real-time types
  RealTimeEvent,
  Subscription,

  // Multi-language types
  LocalizedString,
  InternationalizationConfig,

  // AI types
  AIMatchingRequest,
  AIMatchingResult,
  AIRecommendation,

  // Financial types
  FinancialTransaction,
  TaxCalculation,

  // Utility types
  Result,
  AsyncResult,
  ValidationResult,

  // Enum types
  UserRole,
  VerificationStatus,
  BookingStatus,
  PaymentStatus,
  PriorityLevel,
  ContentStatus,

  // Composition types
  Entity,
  UserOwned,
  Located,
  TimeBounded,
  SearchFilters,

  // Constants
  PLATFORM_CONSTANTS,

  // Type guards
  isBaseEntity,
  isGeoLocation,
  isApiResponse,
  isPaginationParams
};