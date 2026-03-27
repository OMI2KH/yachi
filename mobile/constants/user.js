// constants/user.js

/**
 * ENTERPRISE USER CONSTANTS
 * Yachi Construction & Services Platform
 * Multi-role User Management with Ethiopian Market Specialization
 */

// ==================== ENTERPRISE USER ROLES & PERMISSIONS ====================
export const USER_ROLES = {
  CLIENT: {
    id: 'client',
    name: { 
      en: 'Client', 
      am: 'ደንበኛ', 
      om: 'Maamilcha' 
    },
    level: 1,
    permissions: {
      basic: [
        'view_services',
        'book_services',
        'view_providers',
        'write_reviews',
        'access_chat',
        'make_payments',
        'manage_bookings',
        'view_construction_projects',
        'apply_to_projects',
      ],
      premium: [
        'priority_support',
        'advanced_search',
        'featured_placement',
      ],
    },
    verification_required: false,
    can_earn: false,
    can_hire: true,
    monthly_limits: {
      bookings: 20,
      messages: 100,
      project_applications: 10,
    },
  },

  SERVICE_PROVIDER: {
    id: 'service_provider',
    name: { 
      en: 'Service Provider', 
      am: 'አገልግሎት አቅራቢ', 
      om: 'Kennataa Tajaajilaa' 
    },
    level: 2,
    permissions: {
      basic: [
        'create_services',
        'manage_services',
        'accept_bookings',
        'manage_schedule',
        'access_provider_chat',
        'receive_payments',
        'view_earnings',
        'create_portfolio',
        'apply_verification',
      ],
      premium: [
        'featured_listing',
        'premium_badge',
        'advanced_analytics',
        'priority_matching',
      ],
    },
    verification_required: true,
    can_earn: true,
    can_hire: false,
    monthly_limits: {
      service_listings: 10,
      active_bookings: 15,
      portfolio_items: 20,
    },
  },

  CONSTRUCTION_WORKER: {
    id: 'construction_worker',
    name: { 
      en: 'Construction Worker', 
      am: 'የግንባታ ሠራተኛ', 
      om: 'Hojjetaa Ijaarsaa' 
    },
    level: 2,
    permissions: {
      basic: [
        'view_construction_projects',
        'apply_to_projects',
        'accept_project_invitations',
        'update_work_status',
        'access_worker_chat',
        'view_earnings',
        'create_worker_profile',
        'upload_certifications',
      ],
      premium: [
        'ai_matching_priority',
        'government_project_access',
        'skill_verification',
      ],
    },
    verification_required: true,
    can_earn: true,
    can_hire: false,
    monthly_limits: {
      project_applications: 15,
      skill_certifications: 5,
      work_invitations: 20,
    },
  },

  CONTRACTOR: {
    id: 'contractor',
    name: { 
      en: 'Contractor', 
      am: 'ኮንትራተር', 
      om: 'Kontiraaktarii' 
    },
    level: 3,
    permissions: {
      basic: [
        'create_construction_projects',
        'manage_project_teams',
        'invite_workers',
        'manage_project_budget',
        'track_project_progress',
        'access_contractor_tools',
        'view_ai_recommendations',
        'manage_project_documents',
      ],
      premium: [
        'large_project_management',
        'team_analytics',
        'budget_tracking',
        'premium_support',
      ],
    },
    verification_required: true,
    can_earn: true,
    can_hire: true,
    monthly_limits: {
      active_projects: 5,
      team_members: 50,
      project_invitations: 30,
    },
  },

  GOVERNMENT_OFFICIAL: {
    id: 'government_official',
    name: { 
      en: 'Government Official', 
      am: 'የመንግስት ባለሙያ', 
      om: 'Hojjetaa Mootummaa' 
    },
    level: 4,
    permissions: {
      basic: [
        'access_government_portal',
        'create_government_projects',
        'manage_infrastructure_projects',
        'view_system_analytics',
        'approve_worker_verifications',
        'generate_reports',
        'access_government_chat',
        'manage_public_funds',
      ],
      premium: [
        'national_projects',
        'advanced_analytics',
        'priority_verification',
        'system_administration',
      ],
    },
    verification_required: true,
    can_earn: false,
    can_hire: true,
    monthly_limits: {
      project_approvals: 100,
      worker_verifications: 200,
      report_generations: 50,
    },
  },

  ADMIN: {
    id: 'admin',
    name: { 
      en: 'Administrator', 
      am: 'አስተዳዳሪ', 
      om: 'Administraatorii' 
    },
    level: 5,
    permissions: {
      basic: [
        'access_admin_dashboard',
        'manage_all_users',
        'moderate_content',
        'view_system_analytics',
        'manage_payments',
        'configure_system_settings',
        'access_all_chats',
        'manage_verification_requests',
      ],
      premium: [
        'system_configuration',
        'database_management',
        'api_management',
        'security_settings',
      ],
    },
    verification_required: true,
    can_earn: false,
    can_hire: false,
    monthly_limits: {
      user_management: 1000,
      content_moderation: 500,
      system_changes: 100,
    },
  },
};

// ==================== ENTERPRISE VERIFICATION LEVELS ====================
export const VERIFICATION_LEVELS = {
  UNVERIFIED: {
    level: 0,
    name: { 
      en: 'Unverified', 
      am: 'ያልተረጋገጠ', 
      om: 'Mirkaneessaa Hin Taane' 
    },
    badge: null,
    color: '#6B7280',
    requirements: [],
    permissions: ['basic_access'],
    trust_score: 0,
  },

  BASIC_VERIFIED: {
    level: 1,
    name: { 
      en: 'Basic Verified', 
      am: 'መሰረታዊ ተረጋግጧል', 
      om: 'Mirkaneessaa Bu\'uuraa' 
    },
    badge: 'basic',
    color: '#3B82F6',
    requirements: ['email_verified', 'phone_verified', 'profile_completed'],
    permissions: ['book_services', 'create_listings', 'basic_chat'],
    trust_score: 30,
  },

  ID_VERIFIED: {
    level: 2,
    name: { 
      en: 'ID Verified', 
      am: 'መታወቂያ ተረጋግጧል', 
      om: 'Mirkaneessaa ID' 
    },
    badge: 'verified',
    color: '#10B981',
    requirements: ['government_id', 'photo_verification', 'address_verified'],
    permissions: ['premium_features', 'higher_limits', 'priority_support'],
    trust_score: 60,
  },

  PREMIUM_VERIFIED: {
    level: 3,
    name: { 
      en: 'Premium Verified', 
      am: 'ፕሪሚየም ተረጋግጧል', 
      om: 'Mirkaneessaa Premium' 
    },
    badge: 'premium',
    color: '#F59E0B',
    requirements: ['background_check', 'portfolio_review', 'skill_certification'],
    permissions: ['government_projects', 'ai_matching', 'advanced_analytics'],
    trust_score: 80,
  },

  GOVERNMENT_VERIFIED: {
    level: 4,
    name: { 
      en: 'Government Verified', 
      am: 'በመንግስት ተረጋግጧል', 
      om: 'Mirkaneessaa Mootummaa' 
    },
    badge: 'government',
    color: '#DC2626',
    requirements: ['government_clearance', 'professional_certification', 'security_check'],
    permissions: ['all_features', 'enterprise_access', 'national_projects'],
    trust_score: 95,
  },
};

// ==================== USER STATUS & ACTIVITY ====================
export const USER_STATUS = {
  ACTIVE: {
    id: 'active',
    name: { 
      en: 'Active', 
      am: 'ንቁ', 
      om: 'Hojii Irra' 
    },
    color: '#10B981',
    can_operate: true,
    can_earn: true,
    can_receive_bookings: true,
  },

  INACTIVE: {
    id: 'inactive',
    name: { 
      en: 'Inactive', 
      am: 'ንቃት የለውም', 
      om: 'Hojii Hin Qabne' 
    },
    color: '#6B7280',
    can_operate: false,
    can_earn: false,
    can_receive_bookings: false,
  },

  SUSPENDED: {
    id: 'suspended',
    name: { 
      en: 'Suspended', 
      am: 'ተቆልፏል', 
      om: 'Dhaabamama' 
    },
    color: '#EF4444',
    can_operate: false,
    can_earn: false,
    can_receive_bookings: false,
    reason_required: true,
  },

  UNDER_REVIEW: {
    id: 'under_review',
    name: { 
      en: 'Under Review', 
      am: 'በግምገማ ላይ', 
      om: 'Qorannoo Irra' 
    },
    color: '#F59E0B',
    can_operate: false,
    can_earn: false,
    can_receive_bookings: false,
  },

  ON_HOLD: {
    id: 'on_hold',
    name: { 
      en: 'On Hold', 
      am: 'በጥበቃ', 
      om: 'Eegama' 
    },
    color: '#8B5CF6',
    can_operate: false,
    can_earn: false,
    can_receive_bookings: false,
  },
};

// ==================== ETHIOPIAN USER CONFIGURATION ====================
export const ETHIOPIAN_USER_CONFIG = {
  ID_TYPES: {
    KEBELE_ID: {
      id: 'kebele_id',
      name: { 
        en: 'Kebele ID', 
        am: 'ቀበሌ መታወቂያ', 
        om: 'ID Ganda' 
      },
      validity: 'permanent',
      verification_level: 2,
    },
    PASSPORT: {
      id: 'passport',
      name: { 
        en: 'Passport', 
        am: 'ፓስፖርት', 
        om: 'Paaspoortii' 
      },
      validity: 'temporary',
      verification_level: 3,
    },
    DRIVING_LICENSE: {
      id: 'driving_license',
      name: { 
        en: 'Driving License', 
        am: 'የምሽት ፍቃድ', 
        om: 'Hayyama Diraayivii' 
      },
      validity: 'temporary',
      verification_level: 2,
    },
    GOVERNMENT_ID: {
      id: 'government_id',
      name: { 
        en: 'Government ID', 
        am: 'የመንግስት መታወቂያ', 
        om: 'ID Mootummaa' 
      },
      validity: 'permanent',
      verification_level: 4,
    },
  },

  REGIONAL_PREFERENCES: {
    ADDIS_ABABA: {
      language_preference: ['am', 'en'],
      working_hours: '08:00-17:00',
      payment_preference: ['telebirr', 'chapa', 'cbe_birr'],
    },
    OROMIA: {
      language_preference: ['om', 'am', 'en'],
      working_hours: '07:00-16:00',
      payment_preference: ['telebirr', 'cash', 'bank_transfer'],
    },
    AMHARA: {
      language_preference: ['am', 'en'],
      working_hours: '08:00-17:00',
      payment_preference: ['cbe_birr', 'telebirr', 'chapa'],
    },
    TIGRAY: {
      language_preference: ['am', 'en', 'ti'],
      working_hours: '08:00-17:00',
      payment_preference: ['bank_transfer', 'cash'],
    },
  },

  CULTURAL_CONSIDERATIONS: {
    name_format: {
      given_name_first: true,
      family_name_last: true,
      father_name_required: true,
    },
    contact_preferences: {
      phone_primary: true,
      whatsapp_popular: true,
      telegram_usage: true,
    },
    communication_style: {
      formal_greetings: true,
      respect_elders: true,
      indirect_communication: false,
    },
  },
};

// ==================== USER PREFERENCES & SETTINGS ====================
export const USER_PREFERENCES = {
  NOTIFICATIONS: {
    BOOKING_UPDATES: {
      id: 'booking_updates',
      name: { 
        en: 'Booking Updates', 
        am: 'የቦኪንግ ማሻሻያዎች', 
        om: 'Garii Booking' 
      },
      default: true,
      channels: ['push', 'email', 'sms'],
    },
    MESSAGES: {
      id: 'messages',
      name: { 
        en: 'Messages', 
        am: 'መልዕክቶች', 
        om: 'Ergamee' 
      },
      default: true,
      channels: ['push', 'email'],
    },
    PAYMENT_CONFIRMATIONS: {
      id: 'payment_confirmations',
      name: { 
        en: 'Payment Confirmations', 
        am: 'የክፍያ ማረጋገጫዎች', 
        om: 'Mirkaneessaa Kaffaltii' 
      },
      default: true,
      channels: ['push', 'email', 'sms'],
    },
    PROMOTIONAL: {
      id: 'promotional',
      name: { 
        en: 'Promotional Offers', 
        am: 'የማስተዋወቂያ ቅናሾች', 
        om: 'Karrayyuu Baaftuu' 
      },
      default: false,
      channels: ['push', 'email'],
    },
  },

  PRIVACY: {
    PROFILE_VISIBILITY: {
      id: 'profile_visibility',
      name: { 
        en: 'Profile Visibility', 
        am: 'የመለያ ታይነት', 
        om: 'Agarsiisa Profile' 
      },
      options: ['public', 'registered_users', 'contacts_only', 'private'],
      default: 'registered_users',
    },
    CONTACT_VISIBILITY: {
      id: 'contact_visibility',
      name: { 
        en: 'Contact Information', 
        am: 'የመገናኛ መረጃ', 
        om: 'Odeeffannoo Walqunnamtii' 
      },
      options: ['public', 'registered_users', 'contacts_only', 'private'],
      default: 'contacts_only',
    },
    LOCATION_SHARING: {
      id: 'location_sharing',
      name: { 
        en: 'Location Sharing', 
        am: 'አካባቢ መጋራት', 
        om: 'Qoodumsa Bakka' 
      },
      options: ['always', 'booking_only', 'never'],
      default: 'booking_only',
    },
  },

  LANGUAGE: {
    ENGLISH: {
      id: 'en',
      name: { 
        en: 'English', 
        am: 'እንግሊዝኛ', 
        om: 'Ingliffa' 
      },
      native_name: 'English',
    },
    AMHARIC: {
      id: 'am',
      name: { 
        en: 'Amharic', 
        am: 'አማርኛ', 
        om: 'Amhariffa' 
      },
      native_name: 'አማርኛ',
    },
    OROMO: {
      id: 'om',
      name: { 
        en: 'Oromo', 
        am: 'ኦሮምኛ', 
        om: 'Oromoo' 
      },
      native_name: 'Oromoo',
    },
  },
};

// ==================== USER ACHIEVEMENTS & GAMIFICATION ====================
export const USER_ACHIEVEMENTS = {
  COMPLETED_BOOKINGS: {
    BRONZE: { threshold: 10, badge: '🎖️', points: 100 },
    SILVER: { threshold: 50, badge: '🥈', points: 500 },
    GOLD: { threshold: 100, badge: '🥇', points: 1000 },
    PLATINUM: { threshold: 500, badge: '💎', points: 5000 },
  },

  POSITIVE_REVIEWS: {
    BRONZE: { threshold: 5, badge: '⭐', points: 50 },
    SILVER: { threshold: 25, badge: '🌟🌟', points: 250 },
    GOLD: { threshold: 50, badge: '🌟🌟🌟', points: 500 },
    PLATINUM: { threshold: 100, badge: '🌟🌟🌟🌟', points: 1000 },
  },

  VERIFICATION_LEVEL: {
    BASIC: { level: 1, badge: '🔹', points: 100 },
    VERIFIED: { level: 2, badge: '🔸', points: 300 },
    PREMIUM: { level: 3, badge: '🔶', points: 700 },
    GOVERNMENT: { level: 4, badge: '🔴', points: 1500 },
  },

  SKILL_CERTIFICATIONS: {
    BRONZE: { threshold: 3, badge: '🛠️', points: 150 },
    SILVER: { threshold: 7, badge: '🛠️🛠️', points: 350 },
    GOLD: { threshold: 12, badge: '🛠️🛠️🛠️', points: 750 },
  },
};

// ==================== ENTERPRISE USER SERVICE ====================
export class UserConstantsService {
  /**
   * Get user role by ID
   */
  static getUserRole(roleId) {
    return USER_ROLES[roleId?.toUpperCase()] || USER_ROLES.CLIENT;
  }

  /**
   * Get verification level by ID
   */
  static getVerificationLevel(levelId) {
    return VERIFICATION_LEVELS[levelId?.toUpperCase()] || VERIFICATION_LEVELS.UNVERIFIED;
  }

  /**
   * Get user status by ID
   */
  static getUserStatus(statusId) {
    return USER_STATUS[statusId?.toUpperCase()] || USER_STATUS.ACTIVE;
  }

  /**
   * Check if user has permission
   */
  static hasPermission(roleId, permission, isPremium = false) {
    const role = this.getUserRole(roleId);
    const permissionList = isPremium ? 
      [...role.permissions.basic, ...role.permissions.premium] : 
      role.permissions.basic;
    
    return permissionList.includes(permission) || permissionList.includes('all_permissions');
  }

  /**
   * Get user limits for role
   */
  static getUserLimits(roleId, verificationLevel = 0) {
    const role = this.getUserRole(roleId);
    const baseLimits = { ...role.monthly_limits };
    
    // Increase limits based on verification level
    const limitMultiplier = 1 + (verificationLevel * 0.2);
    
    Object.keys(baseLimits).forEach(key => {
      baseLimits[key] = Math.floor(baseLimits[key] * limitMultiplier);
    });
    
    return baseLimits;
  }

  /**
   * Calculate user trust score
   */
  static calculateTrustScore(userData) {
    let score = 0;
    
    // Verification level base score
    const verificationLevel = this.getVerificationLevel(userData.verification_level);
    score += verificationLevel.trust_score;
    
    // Positive reviews impact
    if (userData.rating && userData.rating >= 4.0) {
      score += 10;
    }
    
    // Completed bookings impact
    if (userData.completed_bookings > 10) {
      score += Math.min(userData.completed_bookings * 0.5, 20);
    }
    
    // Account age impact
    const accountAgeMonths = userData.account_age_months || 0;
    score += Math.min(accountAgeMonths * 2, 30);
    
    return Math.min(score, 100);
  }

  /**
   * Get recommended verification steps
   */
  static getRecommendedVerificationSteps(currentLevel, targetLevel) {
    const current = this.getVerificationLevel(currentLevel);
    const target = this.getVerificationLevel(targetLevel);
    
    if (current.level >= target.level) return [];
    
    const steps = [];
    for (let level = current.level + 1; level <= target.level; level++) {
      const levelConfig = Object.values(VERIFICATION_LEVELS).find(v => v.level === level);
      if (levelConfig) {
        steps.push({
          level: levelConfig.level,
          name: levelConfig.name,
          requirements: levelConfig.requirements,
        });
      }
    }
    
    return steps;
  }

  /**
   * Validate user data for registration
   */
  static validateUserData(userData, roleId) {
    const errors = [];
    const role = this.getUserRole(roleId);
    
    // Basic validation
    if (!userData.email) errors.push('EMAIL_REQUIRED');
    if (!userData.phone) errors.push('PHONE_REQUIRED');
    if (!userData.first_name) errors.push('FIRST_NAME_REQUIRED');
    if (!userData.last_name) errors.push('LAST_NAME_REQUIRED');
    
    // Role-specific validation
    if (role.verification_required && !userData.government_id) {
      errors.push('GOVERNMENT_ID_REQUIRED');
    }
    
    // Ethiopian phone validation
    if (userData.phone && !this.validateEthiopianPhone(userData.phone)) {
      errors.push('INVALID_ETHIOPIAN_PHONE');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Ethiopian phone number
   */
  static validateEthiopianPhone(phone) {
    const cleaned = phone.replace(/\s/g, '').replace('+251', '0');
    const ethiopianRegex = /^(0)(9[0-9]|7[0-9])([0-9]{6,7})$/;
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
   * Get localized role name
   */
  static getLocalizedRoleName(roleId, language = 'en') {
    const role = this.getUserRole(roleId);
    return role?.name[language] || role?.name.en || roleId;
  }

  /**
   * Get achievement level for metric
   */
  static getAchievementLevel(metric, value) {
    const achievementConfig = USER_ACHIEVEMENTS[metric];
    if (!achievementConfig) return null;
    
    const levels = Object.entries(achievementConfig)
      .sort(([,a], [,b]) => b.threshold - a.threshold);
    
    for (const [level, config] of levels) {
      if (value >= config.threshold) {
        return { level, ...config };
      }
    }
    
    return null;
  }
}

// ==================== EXPORT CONFIGURATION ====================
export const USER_CONSTANTS = {
  roles: USER_ROLES,
  verificationLevels: VERIFICATION_LEVELS,
  status: USER_STATUS,
  ethiopianConfig: ETHIOPIAN_USER_CONFIG,
  preferences: USER_PREFERENCES,
  achievements: USER_ACHIEVEMENTS,
  service: UserConstantsService,
};

export default USER_CONSTANTS;