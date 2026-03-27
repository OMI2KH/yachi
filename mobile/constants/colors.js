// constants/auth.js

/**
 * ENTERPRISE AUTHENTICATION CONSTANTS
 * Yachi Construction & Services Platform
 * Multi-factor, Biometric, and Ethiopian Market Security Features
 */

import { Platform } from 'react-native';

// ==================== AUTHENTICATION MODES & STATES ====================
export const AUTH_MODES = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot_password',
  RESET_PASSWORD: 'reset_password',
  VERIFY_EMAIL: 'verify_email',
  PHONE_VERIFICATION: 'phone_verification',
  TWO_FACTOR_SETUP: 'two_factor_setup',
  BIOMETRIC_SETUP: 'biometric_setup',
  PROFILE_SETUP: 'profile_setup',
  ROLE_SELECTION: 'role_selection',
  SOCIAL_LINKING: 'social_linking',
  ACCOUNT_RECOVERY: 'account_recovery',
};

export const AUTH_STATES = {
  INITIAL: 'initial',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  VERIFICATION_REQUIRED: 'verification_required',
  TWO_FACTOR_REQUIRED: 'two_factor_required',
  BIOMETRIC_PROMPT: 'biometric_prompt',
  PASSWORD_RESET_SENT: 'password_reset_sent',
  ACCOUNT_CREATED: 'account_created',
  SESSION_EXPIRED: 'session_expired',
};

// ==================== ENTERPRISE USER ROLES & PERMISSIONS ====================
export const USER_ROLES = {
  CLIENT: {
    id: 'client',
    name: { en: 'Client', am: 'ደንበኛ', om: 'Maamilcha' },
    level: 1,
    permissions: [
      'book_services',
      'view_providers',
      'write_reviews',
      'manage_bookings',
      'access_chat',
      'make_payments',
      'view_construction_projects',
      'apply_to_projects',
    ],
  },

  PROVIDER: {
    id: 'provider',
    name: { en: 'Service Provider', am: 'አገልግሎት አቅራቢ', om: 'Kennataa Tajaajilaa' },
    level: 2,
    permissions: [
      'create_services',
      'manage_services',
      'accept_bookings',
      'manage_schedule',
      'access_provider_chat',
      'receive_payments',
      'view_earnings',
      'create_portfolio',
      'apply_verification',
      'access_ai_matching',
    ],
  },

  CONSTRUCTION_WORKER: {
    id: 'construction_worker',
    name: { en: 'Construction Worker', am: 'የግንባታ ሠራተኛ', om: 'Hojjetaa Ijaarsaa' },
    level: 2,
    permissions: [
      'view_construction_projects',
      'apply_to_projects',
      'accept_project_invitations',
      'update_work_status',
      'access_worker_chat',
      'view_earnings',
      'create_worker_profile',
      'upload_certifications',
    ],
  },

  CONTRACTOR: {
    id: 'contractor',
    name: { en: 'Contractor', am: 'ኮንትራተር', om: 'Kontiraaktarii' },
    level: 3,
    permissions: [
      'create_construction_projects',
      'manage_project_teams',
      'invite_workers',
      'manage_project_budget',
      'track_project_progress',
      'access_contractor_tools',
      'view_ai_recommendations',
      'manage_project_documents',
    ],
  },

  GOVERNMENT: {
    id: 'government',
    name: { en: 'Government Official', am: 'የመንግስት ባለሙያ', om: 'Hojjetaa Mootummaa' },
    level: 4,
    permissions: [
      'access_government_portal',
      'create_government_projects',
      'manage_infrastructure_projects',
      'view_system_analytics',
      'approve_worker_verifications',
      'generate_reports',
      'access_government_chat',
      'manage_public_funds',
    ],
  },

  ADMIN: {
    id: 'admin',
    name: { en: 'Administrator', am: 'አስተዳዳሪ', om: 'Administraatorii' },
    level: 5,
    permissions: [
      'access_admin_dashboard',
      'manage_all_users',
      'moderate_content',
      'view_system_analytics',
      'manage_payments',
      'configure_system_settings',
      'access_all_chats',
      'manage_verification_requests',
    ],
  },

  SUPER_ADMIN: {
    id: 'super_admin',
    name: { en: 'Super Administrator', am: 'ከፍተኛ አስተዳዳሪ', om: 'Administraatorii Guddaa' },
    level: 6,
    permissions: [
      'all_permissions',
      'system_configuration',
      'database_management',
      'api_management',
      'security_settings',
    ],
  },
};

// ==================== ENTERPRISE PASSWORD SECURITY ====================
export const PASSWORD_STRENGTH = {
  WEAK: {
    level: 0,
    name: { en: 'Weak', am: 'ደካማ', om: 'Dadhabaa' },
    color: '#EF4444',
    minScore: 0,
    maxScore: 25,
    requirements: ['min_length_6'],
  },

  MEDIUM: {
    level: 1,
    name: { en: 'Medium', am: 'መካከለኛ', om: 'Giddu galeessaa' },
    color: '#F59E0B',
    minScore: 26,
    maxScore: 50,
    requirements: ['min_length_8', 'has_lowercase', 'has_uppercase'],
  },

  STRONG: {
    level: 2,
    name: { en: 'Strong', am: 'ጠንካራ', om: 'Cimaa' },
    color: '#10B981',
    minScore: 51,
    maxScore: 75,
    requirements: ['min_length_8', 'has_lowercase', 'has_uppercase', 'has_numbers'],
  },

  VERY_STRONG: {
    level: 3,
    name: { en: 'Very Strong', am: 'በጣም ጠንካራ', om: 'Cimaa Sana' },
    color: '#059669',
    minScore: 76,
    maxScore: 100,
    requirements: ['min_length_10', 'has_lowercase', 'has_uppercase', 'has_numbers', 'has_symbols'],
  },
};

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SYMBOLS: false,
  ALLOW_COMMON_PASSWORDS: false,
  PASSWORD_HISTORY: 5, // Remember last 5 passwords
};

// ==================== MULTI-FACTOR AUTHENTICATION ====================
export const MFA_TYPES = {
  SMS: 'sms',
  EMAIL: 'email',
  AUTHENTICATOR: 'authenticator',
  BIOMETRIC: 'biometric',
  BACKUP_CODES: 'backup_codes',
};

export const MFA_CONFIG = {
  CODE_LENGTH: 6,
  CODE_EXPIRY: 10 * 60 * 1000, // 10 minutes
  MAX_ATTEMPTS: 3,
  BACKUP_CODE_COUNT: 10,
  REQUIRED_FOR: ['admin', 'government', 'contractor'],
};

// ==================== BIOMETRIC AUTHENTICATION ====================
export const BIOMETRIC_TYPES = {
  FACE_ID: 'face_id',
  TOUCH_ID: 'touch_id',
  FINGERPRINT: 'fingerprint',
  IRIS: 'iris',
};

export const BIOMETRIC_CONFIG = {
  SUPPORTED_TYPES: Platform.select({
    ios: [BIOMETRIC_TYPES.FACE_ID, BIOMETRIC_TYPES.TOUCH_ID],
    android: [BIOMETRIC_TYPES.FINGERPRINT, BIOMETRIC_TYPES.IRIS],
    default: [],
  }),
  MAX_ATTEMPTS: 3,
  FALLBACK_TO_PIN: true,
  AUTOMATIC_PROMPT: true,
};

// ==================== VERIFICATION & TRUST LEVELS ====================
export const VERIFICATION_LEVELS = {
  UNVERIFIED: {
    level: 0,
    name: { en: 'Unverified', am: 'ያልተረጋገጠ', om: 'Mirkaneessaa Hin Taane' },
    badge: null,
    requirements: [],
    permissions: ['basic_access'],
  },

  BASIC_VERIFIED: {
    level: 1,
    name: { en: 'Basic Verified', am: 'መሰረታዊ ተረጋግጧል', om: 'Mirkaneessaa Bu\'uuraa' },
    badge: 'basic',
    requirements: ['email_verified', 'phone_verified'],
    permissions: ['book_services', 'create_listings'],
  },

  ID_VERIFIED: {
    level: 2,
    name: { en: 'ID Verified', am: 'መታወቂያ ተረጋግጧል', ot: 'Mirkaneessaa ID' },
    badge: 'verified',
    requirements: ['government_id', 'photo_verification'],
    permissions: ['premium_features', 'higher_limits'],
  },

  PREMIUM_VERIFIED: {
    level: 3,
    name: { en: 'Premium Verified', am: 'ፕሪሚየም ተረጋግጧል', om: 'Mirkaneessaa Premium' },
    badge: 'premium',
    requirements: ['background_check', 'portfolio_review'],
    permissions: ['government_projects', 'priority_support'],
  },

  GOVERNMENT_VERIFIED: {
    level: 4,
    name: { en: 'Government Verified', am: 'በመንግስት ተረጋግጧል', om: 'Mirkaneessaa Mootummaa' },
    badge: 'government',
    requirements: ['government_clearance', 'professional_certification'],
    permissions: ['all_features', 'enterprise_access'],
  },
};

// ==================== SESSION & TOKEN MANAGEMENT ====================
export const SESSION_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  MAX_CONCURRENT_SESSIONS: 3,
  AUTO_LOGOUT_DELAY: 30 * 60 * 1000, // 30 minutes of inactivity
};

export const TOKEN_TYPES = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  VERIFICATION: 'verification_token',
  PASSWORD_RESET: 'password_reset_token',
  API_KEY: 'api_key',
};

// ==================== SECURITY & COMPLIANCE ====================
export const SECURITY_CONFIG = {
  PASSWORD_POLICY: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false,
    blockCommonPasswords: true,
    passwordHistory: 5,
  },

  SESSION_SECURITY: {
    invalidateOnPasswordChange: true,
    notifyOnNewLogin: true,
    allowConcurrentSessions: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },

  DATA_PRIVACY: {
    gdprCompliant: true,
    dataEncryption: true,
    autoDeleteInactiveAccounts: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    rightToBeForgotten: true,
  },
};

// ==================== ETHIOPIAN MARKET SPECIFIC ====================
export const ETHIOPIAN_AUTH_CONFIG = {
  PHONE_VERIFICATION: {
    COUNTRY_CODE: '+251',
    PHONE_LENGTH: 9,
    ALLOWED_PREFIXES: ['9', '7'], // Mobile prefixes in Ethiopia
    VERIFICATION_METHODS: ['sms', 'voice'],
  },

  ID_TYPES: {
    KEBELE_ID: 'kebele_id',
    PASSPORT: 'passport',
    DRIVING_LICENSE: 'driving_license',
    GOVERNMENT_ID: 'government_id',
  },

  REGIONAL_SETTINGS: {
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'am', 'om'],
    TIMEZONE: 'Africa/Addis_Ababa',
    DATE_FORMAT: 'DD/MM/YYYY',
  },
};

// ==================== ERROR CODES & MESSAGES ====================
export const AUTH_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'AUTH_001',
  ACCOUNT_LOCKED: 'AUTH_002',
  SESSION_EXPIRED: 'AUTH_003',
  INVALID_TOKEN: 'AUTH_004',
  TOKEN_EXPIRED: 'AUTH_005',

  // Registration errors
  EMAIL_EXISTS: 'REG_001',
  PHONE_EXISTS: 'REG_002',
  INVALID_EMAIL: 'REG_003',
  INVALID_PHONE: 'REG_004',
  WEAK_PASSWORD: 'REG_005',

  // Verification errors
  INVALID_VERIFICATION_CODE: 'VER_001',
  VERIFICATION_EXPIRED: 'VER_002',
  MAX_ATTEMPTS_EXCEEDED: 'VER_003',

  // Security errors
  SUSPICIOUS_ACTIVITY: 'SEC_001',
  RATE_LIMITED: 'SEC_002',
  DEVICE_NOT_TRUSTED: 'SEC_003',
};

export const AUTH_ERROR_MESSAGES = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: {
    en: 'Invalid email or password',
    am: 'ልክ ያልሆነ ኢሜይል ወይም የይለፍ ቃል',
    om: 'Email ykn password sirrii miti',
  },
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: {
    en: 'Account temporarily locked. Try again later.',
    am: 'መለያዎ ጊዜያዊ ተቆልፏል። ቆይተው እንደገና ይሞክሩ።',
    om: 'Akkaawuntii yeroo sadii cufame. Booda deebi\'ii yaalaa.',
  },
  [AUTH_ERROR_CODES.EMAIL_EXISTS]: {
    en: 'An account with this email already exists',
    am: 'በዚህ ኢሜይል የተመዘገበ መለያ አለ።',
    om: 'Akkaawuntii email kana qabu durii jira',
  },
  [AUTH_ERROR_CODES.PHONE_EXISTS]: {
    en: 'An account with this phone number already exists',
    am: 'በዚህ ስልክ ቁጥር የተመዘገበ መለያ አለ።',
    om: 'Akkaawuntii lakkoofsa bilbila kana qabu durii jira',
  },
};

// ==================== SOCIAL AUTHENTICATION ====================
export const SOCIAL_PROVIDERS = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
};

export const SOCIAL_AUTH_CONFIG = {
  [SOCIAL_PROVIDERS.GOOGLE]: {
    name: 'Google',
    scopes: ['profile', 'email'],
    color: '#4285F4',
  },
  [SOCIAL_PROVIDERS.FACEBOOK]: {
    name: 'Facebook',
    scopes: ['public_profile', 'email'],
    color: '#1877F2',
  },
  [SOCIAL_PROVIDERS.APPLE]: {
    name: 'Apple',
    scopes: ['name', 'email'],
    color: '#000000',
  },
};

// ==================== ENTERPRISE AUTH SERVICE ====================
export class AuthConstantsService {
  /**
   * Get user role by ID
   */
  static getUserRole(roleId) {
    return USER_ROLES[roleId] || USER_ROLES.CLIENT;
  }

  /**
   * Check if user has permission
   */
  static hasPermission(roleId, permission) {
    const role = this.getUserRole(roleId);
    return role.permissions.includes(permission) || role.permissions.includes('all_permissions');
  }

  /**
   * Calculate password strength score
   */
  static calculatePasswordStrength(password) {
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    
    // Bonus for no common patterns
    if (!this.isCommonPassword(password)) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Get password strength level
   */
  static getPasswordStrength(password) {
    const score = this.calculatePasswordStrength(password);
    
    if (score >= 76) return PASSWORD_STRENGTH.VERY_STRONG;
    if (score >= 51) return PASSWORD_STRENGTH.STRONG;
    if (score >= 26) return PASSWORD_STRENGTH.MEDIUM;
    return PASSWORD_STRENGTH.WEAK;
  }

  /**
   * Check if password meets requirements
   */
  static validatePassword(password) {
    const requirements = [];
    
    if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
      requirements.push('min_length');
    }
    
    if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      requirements.push('uppercase');
    }
    
    if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      requirements.push('lowercase');
    }
    
    if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBERS && !/[0-9]/.test(password)) {
      requirements.push('numbers');
    }
    
    if (PASSWORD_REQUIREMENTS.REQUIRE_SYMBOLS && !/[^a-zA-Z0-9]/.test(password)) {
      requirements.push('symbols');
    }
    
    if (PASSWORD_REQUIREMENTS.ALLOW_COMMON_PASSWORDS && this.isCommonPassword(password)) {
      requirements.push('common_password');
    }
    
    return {
      isValid: requirements.length === 0,
      requirements,
      strength: this.getPasswordStrength(password),
    };
  }

  /**
   * Check if password is common
   */
  static isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', 'password1', '12345678'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Validate Ethiopian phone number
   */
  static validateEthiopianPhone(phone) {
    const cleaned = phone.replace(/\s/g, '');
    const ethiopianRegex = /^(\+251|0)(9[0-9]|7[0-9])([0-9]{6,7})$/;
    return ethiopianRegex.test(cleaned);
  }

  /**
   * Format Ethiopian phone number
   */
  static formatEthiopianPhone(phone) {
    const cleaned = phone.replace(/\s/g, '').replace('+251', '0');
    if (cleaned.length === 10) {
      return `+251 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
  }

  /**
   * Get localized error message
   */
  static getErrorMessage(errorCode, language = 'en') {
    return AUTH_ERROR_MESSAGES[errorCode]?.[language] || 
           AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INVALID_CREDENTIALS][language];
  }

  /**
   * Check if MFA is required for role
   */
  static isMFARequired(roleId) {
    return MFA_CONFIG.REQUIRED_FOR.includes(roleId);
  }

  /**
   * Get verification requirements for level
   */
  static getVerificationRequirements(level) {
    const verificationLevel = Object.values(VERIFICATION_LEVELS).find(vl => vl.level === level);
    return verificationLevel?.requirements || [];
  }
}

// ==================== EXPORT CONFIGURATION ====================
export const AUTH_CONSTANTS = {
  modes: AUTH_MODES,
  states: AUTH_STATES,
  roles: USER_ROLES,
  password: {
    strength: PASSWORD_STRENGTH,
    requirements: PASSWORD_REQUIREMENTS,
  },
  mfa: {
    types: MFA_TYPES,
    config: MFA_CONFIG,
  },
  biometric: {
    types: BIOMETRIC_TYPES,
    config: BIOMETRIC_CONFIG,
  },
  verification: VERIFICATION_LEVELS,
  session: SESSION_CONFIG,
  security: SECURITY_CONFIG,
  ethiopian: ETHIOPIAN_AUTH_CONFIG,
  errors: {
    codes: AUTH_ERROR_CODES,
    messages: AUTH_ERROR_MESSAGES,
  },
  social: {
    providers: SOCIAL_PROVIDERS,
    config: SOCIAL_AUTH_CONFIG,
  },
  service: AuthConstantsService,
};

export default AUTH_CONSTANTS;