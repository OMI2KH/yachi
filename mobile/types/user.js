/**
 * Yachi User Type Definitions
 * Enterprise-level user management types for multi-role platform
 * Comprehensive type safety for user profiles, authentication, and role management
 */

/**
 * @typedef {Object} User
 * @property {string} id - Unique user identifier
 * @property {string} email - User's email address (unique)
 * @property {string} [phone] - User's phone number (Ethiopian format)
 * @property {UserProfile} profile - User profile information
 * @property {UserRole} role - User's primary role
 * @property {UserStatus} status - Account status
 * @property {UserVerification} verification - Verification status and level
 * @property {UserPreferences} preferences - User preferences and settings
 * @property {UserSubscription} subscription - Subscription information
 * @property {UserSecurity} security - Security settings and history
 * @property {UserAnalytics} analytics - User behavior analytics
 * @property {UserMetadata} metadata - Additional metadata
 * @property {Date} createdAt - Account creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {Date} [lastLoginAt] - Last login timestamp
 * @property {Date} [emailVerifiedAt] - Email verification timestamp
 * @property {Date} [phoneVerifiedAt] - Phone verification timestamp
 */

/**
 * @typedef {('client' | 'service_provider' | 'government' | 'admin' | 'system')} UserRole
 */

/**
 * @typedef {('pending' | 'active' | 'suspended' | 'deactivated' | 'banned')} UserStatus
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} [displayName] - User's display name
 * @property {string} [avatar] - Profile picture URL
 * @property {string} [bio] - User biography/description
 * @property {Date} [dateOfBirth] - User's date of birth
 * @property {UserGender} [gender] - User's gender
 * @property {UserAddress} [address] - Primary address
 * @property {UserLanguage} language - Language preferences
 * @property {string[]} skills - User skills (for service providers)
 * @property {string[]} certifications - Professional certifications
 * @property {UserEducation[]} [education] - Educational background
 * @property {UserExperience[]} [experience] - Work experience
 * @property {SocialLinks} [socialLinks] - Social media profiles
 * @property {UserProfileMetadata} metadata - Profile metadata
 */

/**
 * @typedef {('male' | 'female' | 'other' | 'prefer_not_to_say')} UserGender
 */

/**
 * @typedef {Object} UserAddress
 * @property {string} street - Street address
 * @property {string} city - City
 * @property {string} region - Region/state
 * @property {string} country - Country (default: Ethiopia)
 * @property {string} postalCode - Postal code
 * @property {GeoLocation} coordinates - Geographic coordinates
 * @property {string} [label] - Address label (Home, Work, etc.)
 * @property {boolean} isPrimary - Whether this is the primary address
 */

/**
 * @typedef {Object} UserLanguage
 * @property {string} primary - Primary language code (en, am, om)
 * @property {string[]} secondary - Secondary languages
 * @property {boolean} rtlSupport - Right-to-left text support
 */

/**
 * @typedef {Object} UserEducation
 * @property {string} institution - Educational institution
 * @property {string} degree - Degree/certificate obtained
 * @property {string} field - Field of study
 * @property {Date} startDate - Start date
 * @property {Date} [endDate] - End date (null for current)
 * @property {boolean} isCurrent - Whether currently enrolled
 * @property {string} [description] - Additional description
 */

/**
 * @typedef {Object} UserExperience
 * @property {string} company - Company/organization name
 * @property {string} position - Job position
 * @property {string} [industry] - Industry sector
 * @property {Date} startDate - Start date
 * @property {Date} [endDate] - End date (null for current)
 * @property {boolean} isCurrent - Whether currently employed
 * @property {string[]} responsibilities - Job responsibilities
 * @property {string} [description] - Additional description
 */

/**
 * @typedef {Object} SocialLinks
 * @property {string} [facebook] - Facebook profile URL
 * @property {string} [twitter] - Twitter profile URL
 * @property {string} [linkedin] - LinkedIn profile URL
 * @property {string} [instagram] - Instagram profile URL
 * @property {string} [website] - Personal website
 */

/**
 * @typedef {Object} UserProfileMetadata
 * @property {number} completeness - Profile completeness percentage
 * @property {string[]} completedSections - Completed profile sections
 * @property {string[]} pendingSections - Pending profile sections
 * @property {Date} lastUpdated - Last profile update timestamp
 * @property {boolean} isPublic - Whether profile is publicly visible
 */

/**
 * @typedef {Object} UserVerification
 * @property {VerificationLevel} level - Current verification level
 * @property {VerificationStatus} status - Verification status
 * @property {VerifiedField[]} verifiedFields - Verified profile fields
 * @property {VerificationDocument[]} documents - Submitted documents
 * @property {Date} [verifiedAt] - Verification timestamp
 * @property {string} [verifiedBy] - Admin who verified the account
 * @property {string} [verificationNotes] - Verification notes
 */

/**
 * @typedef {('basic' | 'verified' | 'premium' | 'enterprise')} VerificationLevel
 */

/**
 * @typedef {('pending' | 'verified' | 'rejected' | 'expired')} VerificationStatus
 */

/**
 * @typedef {Object} VerifiedField
 * @property {string} field - Field name that was verified
 * @property {VerificationMethod} method - Verification method used
 * @property {Date} verifiedAt - Verification timestamp
 * @property {Date} [expiresAt] - Verification expiration
 */

/**
 * @typedef {('email' | 'phone' | 'document' | 'biometric' | 'manual')} VerificationMethod
 */

/**
 * @typedef {Object} VerificationDocument
 * @property {string} id - Document identifier
 * @property {DocumentType} type - Type of document
 * @property {string} name - Document name
 * @property {string} url - Document file URL
 * @property {string} [thumbnailUrl] - Document thumbnail URL
 * @property {DocumentStatus} status - Document verification status
 * @property {Date} uploadedAt - Upload timestamp
 * @property {Date} [verifiedAt] - Verification timestamp
 * @property {string} [verifiedBy] - Admin who verified the document
 * @property {string} [rejectionReason] - Reason for rejection (if applicable)
 */

/**
 * @typedef {('id_card' | 'passport' | 'drivers_license' | 'business_license' | 'tax_certificate' | 'proof_of_address' | 'professional_certificate' | 'other')} DocumentType
 */

/**
 * @typedef {('pending' | 'verified' | 'rejected' | 'expired')} DocumentStatus
 */

/**
 * @typedef {Object} UserPreferences
 * @property {NotificationPreferences} notifications - Notification settings
 * @property {PrivacyPreferences} privacy - Privacy settings
 * @property {CommunicationPreferences} communication - Communication preferences
 * @property {AppearancePreferences} appearance - UI/Appearance preferences
 * @property {ServiceProviderPreferences} [serviceProvider] - Service provider specific preferences
 * @property {ClientPreferences} [client] - Client specific preferences
 */

/**
 * @typedef {Object} NotificationPreferences
 * @property {boolean} emailNotifications - Email notifications enabled
 * @property {boolean} pushNotifications - Push notifications enabled
 * @property {boolean} smsNotifications - SMS notifications enabled
 * @property {NotificationCategoryPreferences} categories - Category-specific settings
 * @property {QuietHours} quietHours - Quiet hours settings
 */

/**
 * @typedef {Object} NotificationCategoryPreferences
 * @property {boolean} bookings - Booking-related notifications
 * @property {boolean} messages - Message notifications
 * @property {boolean} payments - Payment notifications
 * @property {boolean} promotions - Promotional notifications
 * @property {boolean} security - Security notifications
 * @property {boolean} system - System notifications
 */

/**
 * @typedef {Object} QuietHours
 * @property {boolean} enabled - Whether quiet hours are enabled
 * @property {string} startTime - Start time (HH:MM format)
 * @property {string} endTime - End time (HH:MM format)
 * @property {string[]} days - Days when quiet hours apply
 */

/**
 * @typedef {Object} PrivacyPreferences
 * @property {boolean} profileVisible - Whether profile is publicly visible
 * @property {boolean} showOnlineStatus - Whether online status is visible
 * @property {boolean} showLastSeen - Whether last seen is visible
 * @property {boolean} allowMessagesFrom - Who can send messages
 * @property {boolean} showLocation - Whether location is visible
 * @property {boolean} dataSharing - Whether data sharing is allowed for analytics
 */

/**
 * @typedef {Object} CommunicationPreferences
 * @property {string} preferredLanguage - Preferred language for communication
 * @property {boolean} marketingEmails - Whether marketing emails are allowed
 * @property {boolean} partnerOffers - Whether partner offers are allowed
 * @property {string} communicationStyle - Preferred communication style
 */

/**
 * @typedef {Object} AppearancePreferences
 * @property {string} theme - UI theme (light, dark, auto)
 * @property {string} fontSize - Font size preference
 * @property {boolean} reducedMotion - Reduced motion preference
 * @property {boolean} highContrast - High contrast mode
 */

/**
 * @typedef {Object} ServiceProviderPreferences
 * @property {boolean} autoAcceptBookings - Auto-accept bookings
 * @property {number} advanceNotice - Minimum advance notice in hours
 * @property {string[]} preferredLocations - Preferred service locations
 * @property {string[]} blackoutDates - Dates when not available
 * @property {PricingPreferences} pricing - Pricing preferences
 */

/**
 * @typedef {Object} PricingPreferences
 * @property {string} currency - Preferred currency (ETB)
 * @property {boolean} showTaxInclusive - Whether to show tax-inclusive prices
 * @property {boolean} dynamicPricing - Whether dynamic pricing is enabled
 * @property {number} cancellationFee - Default cancellation fee percentage
 */

/**
 * @typedef {Object} ClientPreferences
 * @property {string[]} preferredCategories - Preferred service categories
 * @property {string[]} savedLocations - Saved service locations
 * @property {boolean} instantBooking - Whether instant booking is preferred
 * @property {string} budgetRange - Preferred budget range
 * @property {string[]} blacklistedProviders - Providers to avoid
 */

/**
 * @typedef {Object} UserSubscription
 * @property {SubscriptionTier} tier - Current subscription tier
 * @property {SubscriptionStatus} status - Subscription status
 * @property {Date} [startDate] - Subscription start date
 * @property {Date} [endDate] - Subscription end date
 * @property {Date} [renewalDate] - Next renewal date
 * @property {string} [paymentMethodId] - Default payment method
 * @property {SubscriptionFeature[]} features - Available features
 * @property {SubscriptionHistory[]} history - Subscription history
 */

/**
 * @typedef {('free' | 'premium' | 'professional' | 'enterprise')} SubscriptionTier
 */

/**
 * @typedef {('active' | 'canceled' | 'expired' | 'pending' | 'past_due')} SubscriptionStatus
 */

/**
 * @typedef {Object} SubscriptionFeature
 * @property {string} name - Feature name
 * @property {string} description - Feature description
 * @property {boolean} enabled - Whether feature is enabled
 * @property {any} [limit] - Feature usage limit
 * @property {any} [usage] - Current usage
 */

/**
 * @typedef {Object} SubscriptionHistory
 * @property {string} id - History entry ID
 * @property {SubscriptionTier} tier - Subscription tier at the time
 * @property {SubscriptionStatus} status - Status at the time
 * @property {Date} startDate - Period start date
 * @property {Date} endDate - Period end date
 * @property {number} amount - Amount paid
 * @property {string} currency - Payment currency
 */

/**
 * @typedef {Object} UserSecurity
 * @property {boolean} twoFactorEnabled - Whether 2FA is enabled
 * @property {TwoFactorMethod} [twoFactorMethod] - 2FA method
 * @property {Date} lastPasswordChange - Last password change date
 * @property {number} failedLoginAttempts - Current failed login attempts
 * @property {Date} [accountLockedUntil] - Account lock expiration
 * @property {TrustedDevice[]} trustedDevices - Trusted devices
 * @property {LoginHistory[]} loginHistory - Login history
 * @property {SecurityEvent[]} securityEvents - Security events
 */

/**
 * @typedef {('sms' | 'email' | 'authenticator' | 'biometric')} TwoFactorMethod
 */

/**
 * @typedef {Object} TrustedDevice
 * @property {string} id - Device identifier
 * @property {string} name - Device name
 * @property {string} type - Device type (mobile, tablet, desktop)
 * @property {string} platform - Platform (ios, android, web)
 * @property {string} [ipAddress] - Last known IP address
 * @property {Date} firstUsed - First use timestamp
 * @property {Date} lastUsed - Last use timestamp
 * @property {boolean} isCurrent - Whether this is the current device
 */

/**
 * @typedef {Object} LoginHistory
 * @property {string} id - Login session ID
 * @property {string} deviceId - Device identifier
 * @property {string} ipAddress - IP address
 * @property {string} location - Geographic location
 * @property {string} userAgent - User agent string
 * @property {Date} loginAt - Login timestamp
 * @property {Date} [logoutAt] - Logout timestamp
 * @property {string} [logoutReason] - Logout reason
 */

/**
 * @typedef {Object} SecurityEvent
 * @property {string} id - Event identifier
 * @property {SecurityEventType} type - Event type
 * @property {string} description - Event description
 * @property {string} [ipAddress] - Associated IP address
 * @property {string} [deviceId] - Associated device
 * @property {SecurityEventSeverity} severity - Event severity
 * @property {Date} occurredAt - Event timestamp
 * @property {boolean} resolved - Whether event was resolved
 * @property {string} [resolvedBy] - Who resolved the event
 * @property {Date} [resolvedAt] - Resolution timestamp
 */

/**
 * @typedef {('password_change' | 'device_added' | 'device_removed' | 'suspicious_login' | 'account_lockout' | 'verification_change' | 'profile_update' | 'security_settings_change')} SecurityEventType
 */

/**
 * @typedef {('low' | 'medium' | 'high' | 'critical')} SecurityEventSeverity
 */

/**
 * @typedef {Object} UserAnalytics
 * @property {number} totalLogins - Total login count
 * @property {Date} lastLogin - Last login timestamp
 * @property {number} sessionDuration - Average session duration
 * @property {PlatformUsage} platformUsage - Usage by platform
 * @property {UserEngagement} engagement - Engagement metrics
 * @property {ServiceProviderAnalytics} [serviceProvider] - Service provider analytics
 * @property {ClientAnalytics} [client] - Client analytics
 */

/**
 * @typedef {Object} PlatformUsage
 * @property {number} mobileApp - Usage on mobile app
 * @property {number} web - Usage on web platform
 * @property {number} tablet - Usage on tablet devices
 */

/**
 * @typedef {Object} UserEngagement
 * @property {number} loginFrequency - Logins per week
 * @property {number} featureUsage - Features used count
 * @property {number} retentionRate - User retention rate
 * @property {Date} firstSeen - First seen timestamp
 * @property {Date} lastSeen - Last seen timestamp
 */

/**
 * @typedef {Object} ServiceProviderAnalytics
 * @property {number} totalServices - Total services offered
 * @property {number} completedBookings - Completed bookings count
 * @property {number} cancellationRate - Booking cancellation rate
 * @property {number} averageRating - Average service rating
 * @property {number} responseRate - Response rate to inquiries
 * @property {number} earnings - Total earnings
 * @property {ServiceCategoryPerformance[]} categoryPerformance - Performance by category
 */

/**
 * @typedef {Object} ServiceCategoryPerformance
 * @property {string} category - Service category
 * @property {number} bookings - Bookings count
 * @property {number} rating - Average rating
 * @property {number} earnings - Earnings from category
 */

/**
 * @typedef {Object} ClientAnalytics
 * @property {number} totalBookings - Total bookings made
 * @property {number} completedBookings - Completed bookings count
 * @property {number} cancellationRate - Booking cancellation rate
 * @property {number} repeatBookingRate - Repeat booking rate
 * @property {string[]} preferredCategories - Most used categories
 * @property {number} totalSpent - Total amount spent
 */

/**
 * @typedef {Object} UserMetadata
 * @property {string} [timezone] - User's timezone
 * @property {string} [locale] - User's locale
 * @property {string} [appVersion] - App version when last used
 * @property {string} [referralCode] - User's referral code
 * @property {string} [referredBy] - Who referred this user
 * @property {string[]} [tags] - User tags for segmentation
 * @property {Object} [customFields] - Custom fields for extended data
 */

/**
 * User-related API Types
 */

/**
 * @typedef {Object} CreateUserRequest
 * @property {string} email - User email
 * @property {string} password - User password
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {UserRole} role - User role
 * @property {string} [phone] - Phone number
 * @property {Partial<UserPreferences>} [preferences] - Initial preferences
 * @property {string} [referralCode] - Referral code
 */

/**
 * @typedef {Object} UpdateUserRequest
 * @property {string} [email] - New email
 * @property {string} [phone] - New phone
 * @property {Partial<UserProfile>} [profile] - Profile updates
 * @property {Partial<UserPreferences>} [preferences] - Preference updates
 * @property {UserStatus} [status] - Status update
 */

/**
 * @typedef {Object} UserSearchFilters
 * @property {string} [query] - Search query
 * @property {UserRole[]} [roles] - Filter by roles
 * @property {UserStatus[]} [statuses] - Filter by status
 * @property {VerificationLevel[]} [verificationLevels] - Filter by verification
 * @property {string} [city] - Filter by city
 * @property {Date} [createdAfter] - Created after date
 * @property {Date} [createdBefore] - Created before date
 * @property {boolean} [hasCompletedProfile] - Profile completion filter
 */

/**
 * @typedef {Object} UserListResponse
 * @property {User[]} users - List of users
 * @property {PaginationInfo} pagination - Pagination information
 * @property {UserStats} stats - User statistics
 */

/**
 * @typedef {Object} UserStats
 * @property {number} total - Total users
 * @property {number} active - Active users
 * @property {number} pending - Pending verification
 * @property {Record<UserRole, number>} byRole - Count by role
 * @property {Record<VerificationLevel, number>} byVerification - Count by verification
 */

/**
 * Type Guards and Validation
 */

/**
 * @param {any} user
 * @returns {user is User}
 */
export const isUser = (user) => {
  return user &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    typeof user.status === 'string' &&
    user.createdAt instanceof Date &&
    user.updatedAt instanceof Date;
};

/**
 * @param {any} profile
 * @returns {profile is UserProfile}
 */
export const isUserProfile = (profile) => {
  return profile &&
    typeof profile.firstName === 'string' &&
    typeof profile.lastName === 'string' &&
    typeof profile.language === 'object';
};

/**
 * @param {any} role
 * @returns {role is UserRole}
 */
export const isUserRole = (role) => {
  const validRoles = ['client', 'service_provider', 'government', 'admin', 'system'];
  return typeof role === 'string' && validRoles.includes(role);
};

/**
 * @param {any} status
 * @returns {status is UserStatus}
 */
export const isUserStatus = (status) => {
  const validStatuses = ['pending', 'active', 'suspended', 'deactivated', 'banned'];
  return typeof status === 'string' && validStatuses.includes(status);
};

/**
 * User Constants
 */

export const USER_CONSTANTS = {
  // Validation limits
  MIN_PASSWORD_LENGTH: 8,
  MAX_PROFILE_BIO_LENGTH: 500,
  MAX_SKILLS_COUNT: 20,
  MAX_CERTIFICATIONS_COUNT: 10,

  // Ethiopian market specific
  ETHIOPIAN_PHONE_PREFIX: '+251',
  SUPPORTED_LANGUAGES: ['en', 'am', 'om'],
  DEFAULT_CURRENCY: 'ETB',

  // Security settings
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  PASSWORD_CHANGE_INTERVAL: 90 * 24 * 60 * 60 * 1000, // 90 days

  // Profile settings
  MIN_AGE: 18,
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_AVATAR_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  // Subscription settings
  SUBSCRIPTION_TIERS: {
    FREE: {
      maxServices: 3,
      maxBookings: 10,
      features: ['basic_analytics', 'standard_support']
    },
    PREMIUM: {
      maxServices: 20,
      maxBookings: 100,
      features: ['advanced_analytics', 'priority_support', 'featured_listing']
    },
    PROFESSIONAL: {
      maxServices: 100,
      maxBookings: 500,
      features: ['premium_analytics', 'dedicated_support', 'custom_domain', 'api_access']
    }
  }
};

/**
 * Utility Types for Common Patterns
 */

/**
 * @typedef {Object} UserSession
 * @property {string} id - Session ID
 * @property {string} userId - User ID
 * @property {string} deviceId - Device ID
 * @property {string} ipAddress - IP address
 * @property {Date} createdAt - Session creation time
 * @property {Date} expiresAt - Session expiration time
 * @property {Date} [lastActivityAt] - Last activity time
 * @property {boolean} isValid - Whether session is valid
 */

/**
 * @typedef {Object} UserPermission
 * @property {string} resource - Resource being accessed
 * @property {string} action - Action being performed
 * @property {Object} [conditions] - Access conditions
 */

/**
 * @typedef {Object} UserRoleDefinition
 * @property {UserRole} name - Role name
 * @property {string} description - Role description
 * @property {UserPermission[]} permissions - Role permissions
 * @property {string[]} inheritedRoles - Inherited roles
 */

/**
 * Export all user types
 */
export default {
  // Core user types
  User,
  UserRole,
  UserStatus,
  UserProfile,

  // Profile sub-types
  UserGender,
  UserAddress,
  UserLanguage,
  UserEducation,
  UserExperience,
  SocialLinks,

  // Verification types
  UserVerification,
  VerificationLevel,
  VerificationStatus,
  VerificationDocument,
  DocumentType,
  DocumentStatus,

  // Preference types
  UserPreferences,
  NotificationPreferences,
  PrivacyPreferences,
  CommunicationPreferences,
  AppearancePreferences,
  ServiceProviderPreferences,
  ClientPreferences,

  // Subscription types
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionFeature,

  // Security types
  UserSecurity,
  TwoFactorMethod,
  TrustedDevice,
  LoginHistory,
  SecurityEvent,
  SecurityEventType,

  // Analytics types
  UserAnalytics,
  ServiceProviderAnalytics,
  ClientAnalytics,

  // API types
  CreateUserRequest,
  UpdateUserRequest,
  UserSearchFilters,
  UserListResponse,
  UserStats,

  // Utility types
  UserSession,
  UserPermission,
  UserRoleDefinition,

  // Constants
  USER_CONSTANTS,

  // Type guards
  isUser,
  isUserProfile,
  isUserRole,
  isUserStatus
};