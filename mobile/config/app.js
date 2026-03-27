// config/app.js

/**
 * ENTERPRISE-GRADE APPLICATION CONFIGURATION
 * Yachi Construction & Services Platform
 * Complete Ethiopian Market Integration
 * AI-Powered Construction & Premium Features
 */

import { Platform } from 'react-native';
import { getVersion, getBuildNumber, getUniqueId } from 'react-native-device-info';

// Environment Detection with Enhanced Security
const getEnvironment = () => {
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_APP_ENV || 'development';
  }
  
  // Production environment detection with validation
  const env = process.env.EXPO_PUBLIC_APP_ENV || 'production';
  
  // Validate environment string
  const validEnvironments = ['development', 'staging', 'production'];
  if (!validEnvironments.includes(env)) {
    console.warn(`Invalid environment detected: ${env}, defaulting to production`);
    return 'production';
  }
  
  return env;
};

const ENV = getEnvironment();

// Enterprise Base Configuration
const BASE_CONFIG = {
  // ==================== APP METADATA ====================
  app: {
    name: 'Yachi',
    displayName: 'Yachi - Ethiopian Home Services & Construction',
    version: getVersion(),
    buildNumber: getBuildNumber(),
    bundleId: Platform.select({
      ios: 'com.yachi.enterprise',
      android: 'com.yachi.enterprise',
      web: 'com.yachi.web',
    }),
    uniqueId: getUniqueId(),
    
    // Ethiopian Market Specialization
    supportedLanguages: ['en', 'am', 'om'],
    defaultLanguage: 'en',
    rtlLanguages: ['am'],
    currency: 'ETB',
    currencySymbol: 'ብር',
    timezone: 'Africa/Addis_Ababa',
    
    // Ethiopian Cities Coverage (8+ major cities)
    ethiopianCities: [
      'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Adama', 'Hawassa', 
      'Bahir Dar', 'Gondar', 'Jimma', 'Jijiga', 'Harar',
      'Dessie', 'Arba Minch', 'Debre Markos', 'Nekemte', 'Shashamane'
    ],
    
    // Complete Service Categories (50+ as specified)
    serviceCategories: [
      // Construction & Building
      'New Building Construction', 'Building Finishing', 'Renovation', 'Remodeling',
      'Masonry', 'Carpentry', 'Steel Fixing', 'Concrete Work', 'Roofing',
      
      // Home Services
      'Plumbing', 'Electrical', 'HVAC', 'Painting', 'Flooring', 'Tiling',
      'Cleaning', 'Pest Control', 'Security Installation', 'Gardening',
      
      // Professional Services
      'Architecture', 'Interior Design', 'Structural Engineering', 'Surveying',
      
      // Personal Services
      'Moving', 'Delivery', 'Driving', 'Car Repair', 'Car Wash',
      
      // Domestic Services
      'Cooking', 'Housekeeping', 'Laundry', 'Baby Sitting', 'Elder Care',
      'Pet Care', 'Shopping Assistance',
      
      // Professional & Technical
      'IT Support', 'Web Development', 'Graphic Design', 'Photography',
      'Videography', 'Accounting', 'Legal Services', 'Translation',
      
      // Event & Entertainment
      'Event Planning', 'Catering', 'DJ Services', 'Entertainment',
      'Beauty Services', 'Barber', 'Massage Therapy',
      
      // Education & Training
      'Tutoring', 'Fitness Training', 'Yoga Instruction', 'Music Lessons',
      
      // Agriculture & Environment
      'Agriculture', 'Irrigation', 'Solar Installation', 'Water Treatment'
    ],
  },

  // ==================== ENVIRONMENT ====================
  environment: ENV,
  isDevelopment: ENV === 'development',
  isStaging: ENV === 'staging',
  isProduction: ENV === 'production',

  // ==================== PLATFORM CONFIG ====================
  platform: {
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    isWeb: Platform.OS === 'web',
    OS: Platform.OS,
    version: Platform.Version,
    hasNotch: Platform.OS === 'ios' && (Platform.Version >= 11),
  },

  // ==================== ENTERPRISE FEATURE FLAGS ====================
  features: {
    // 🎯 CORE PLATFORM FEATURES
    userManagement: {
      multiRoleSystem: true,
      socialLogin: true,
      biometricAuth: true,
      emailVerification: true,
      phoneVerification: true,
      profileVerification: true,
    },
    
    serviceMarketplace: {
      advancedSearch: true,
      realTimeAvailability: true,
      favoritesSystem: true,
      serviceRecommendations: true,
      categoryFiltering: true,
    },
    
    bookingSystem: {
      realTimeBooking: true,
      calendarIntegration: true,
      statusTracking: true,
      automaticReminders: true,
      cancellationPolicies: true,
    },

    // 💰 ETHIOPIAN PAYMENT SYSTEMS
    payments: {
      chapaIntegration: true,
      telebirrIntegration: true,
      cbeBirrIntegration: true,
      multiCurrency: true,
      secureProcessing: true,
      refundManagement: true,
    },

    // 💬 COMMUNICATION SYSTEM
    messaging: {
      realTimeChat: true,
      fileSharing: true,
      imageSharing: true,
      pushNotifications: true,
      typingIndicators: true,
      onlineStatus: true,
    },

    // ⭐ REVIEWS & RATINGS
    reviews: {
      fiveStarSystem: true,
      photoReviews: true,
      ratingAggregation: true,
      reviewModeration: true,
      providerResponses: true,
    },

    // 🏗️ AI-POWERED CONSTRUCTION MANAGEMENT
    aiConstruction: {
      enabled: true,
      workerMatching: true,
      projectScoping: true,
      budgetOptimization: true,
      progressPrediction: true,
      safetyAnalysis: true,
      
      projectTypes: {
        newBuilding: true,
        buildingFinishing: true,
        governmentInfrastructure: true,
        renovationRemodeling: true,
      },
      
      governmentPortal: {
        dashboard: true,
        projectManagement: true,
        analytics: true,
        budgetManagement: true,
        workerManagement: true,
      },
    },

    // 💎 PREMIUM FEATURES & MONETIZATION
    premium: {
      badgeSystem: true,
      featuredListing: true,
      advertisementSystem: true,
      zeroCommission: true,
      
      pricing: {
        badgeMonthly: 200, // ETB
        listingBoost: 399, // ETB
        featuredDuration: 30, // days
      },
    },

    // 🌍 MULTI-LANGUAGE & LOCALIZATION
    localization: {
      english: true,
      amharic: true,
      oromo: true,
      rtlSupport: true,
      dynamicSwitching: true,
    },

    // 🎨 THEME & PERSONALIZATION
    themes: {
      lightDark: true,
      ethiopianColors: true,
      customizableUI: true,
      accessibility: true,
    },

    // 🎮 GAMIFICATION & ENGAGEMENT
    gamification: {
      achievementSystem: true,
      pointsRewards: true,
      leaderboards: true,
      milestoneCelebrations: true,
      referralProgram: true,
    },

    // ⚡ PERFORMANCE & RELIABILITY
    performance: {
      offlineMode: true,
      imageOptimization: true,
      fastLoading: true,
      backgroundSync: true,
      errorRecovery: true,
    },

    // 🔒 SECURITY & PRIVACY
    security: {
      endToEndEncryption: true,
      securePayments: true,
      dataProtection: true,
      secureUploads: true,
    },

    // 🏛️ ADMIN & MANAGEMENT
    admin: {
      dashboard: true,
      userManagement: true,
      serviceModeration: true,
      analytics: true,
      financialTracking: true,
    },

    // 📊 ANALYTICS & INSIGHTS
    analytics: {
      userBehavior: true,
      servicePerformance: true,
      revenueReporting: true,
      geographicDemand: true,
      customerSatisfaction: true,
    },

    // 🔮 FUTURE ROADMAP
    roadmap: {
      videoCalls: false,
      arPreviews: false,
      aiRecommendations: false,
      blockchainVerification: false,
      iotIntegration: false,
    },

    // 🛠️ DEVELOPMENT
    development: {
      debugMenu: __DEV__,
      reduxDevTools: __DEV__,
      performanceMonitoring: true,
      errorTracking: true,
    },
  },

  // ==================== API CONFIGURATION ====================
  api: {
    baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.yachi.et/v2',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    
    // Enterprise Endpoints
    endpoints: {
      // AI Construction Endpoints
      aiConstruction: {
        createProject: '/ai/construction/projects',
        matchWorkers: '/ai/construction/workers/match',
        sendInvitations: '/ai/construction/invitations',
        projectProgress: '/ai/construction/projects/:id/progress',
        budgetOptimization: '/ai/construction/budget-optimization',
        timelineOptimization: '/ai/construction/timeline-optimization',
      },
      
      // Government Portal
      government: {
        projects: '/government/projects',
        analytics: '/government/analytics',
        budget: '/government/budget',
        workers: '/government/workers',
        reports: '/government/reports',
        infrastructure: '/government/infrastructure',
      },
      
      // Premium Features
      premium: {
        upgrade: '/premium/upgrade',
        badge: '/premium/badge',
        listing: '/premium/listing',
        benefits: '/premium/benefits',
        subscription: '/premium/subscription',
      },
      
      // Ethiopian Payments
      payments: {
        chapa: '/payments/chapa',
        telebirr: '/payments/telebirr',
        cbeBirr: '/payments/cbe-birr',
        history: '/payments/history',
        refund: '/payments/refund',
        receipt: '/payments/receipt',
      },
      
      // Core Services
      auth: {
        login: '/auth/login',
        register: '/auth/register',
        verify: '/auth/verify',
        logout: '/auth/logout',
        refresh: '/auth/refresh',
      },
      
      bookings: {
        create: '/bookings',
        list: '/bookings',
        detail: '/bookings/:id',
        update: '/bookings/:id',
        cancel: '/bookings/:id/cancel',
        confirm: '/bookings/:id/confirm',
      },
      
      services: {
        list: '/services',
        create: '/services',
        search: '/services/search',
        categories: '/services/categories',
        nearby: '/services/nearby',
        popular: '/services/popular',
      },
    },
  },

  // ==================== PERFORMANCE CONFIG ====================
  performance: {
    // Image Handling
    imageQuality: 0.8,
    maxImageSize: 2048,
    compressionEnabled: true,
    
    // Caching Strategy
    cacheDuration: {
      short: 5 * 60 * 1000,    // 5 minutes
      medium: 30 * 60 * 1000,  // 30 minutes
      long: 24 * 60 * 60 * 1000, // 24 hours
      permanent: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    
    // Debounce Configuration
    debounceTimes: {
      search: 300,
      formValidation: 500,
      aiMatching: 1000,
      locationSearch: 800,
    },
    
    // Animation Performance
    animationDuration: {
      short: 200,
      medium: 300,
      long: 500,
    },
    
    // Real-time Updates
    refreshIntervals: {
      bookings: 30000,        // 30 seconds
      messages: 10000,        // 10 seconds
      constructionProgress: 60000, // 1 minute
      userStatus: 15000,      // 15 seconds
    },
    
    // Memory Management
    maxCachedImages: 100,
    maxCachedRequests: 50,
  },

  // ==================== UI/UX CONFIGURATION ====================
  ui: {
    // Layout System
    maxContentWidth: 1200,
    sidePadding: 16,
    gridGutter: 16,
    
    // Typography Scale
    fontSizes: {
      xs: 12, sm: 14, base: 16, lg: 18, 
      xl: 20, '2xl': 24, '3xl': 30, '4xl': 36,
    },
    
    // Border Radius System
    borderRadius: {
      sm: 4, base: 8, lg: 12, xl: 16, '2xl': 24, full: 9999,
    },
    
    // Spacing Scale
    spacing: {
      xs: 4, sm: 8, base: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64,
    },
    
    // Ethiopian Color Palette
    colors: {
      primary: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e', // Ethiopian Green
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
      },
      secondary: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15', // Ethiopian Yellow
        500: '#eab308',
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
      },
      accent: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444', // Ethiopian Red
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      neutral: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b', // Ethiopian Blue
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
      },
    },
    
    // Elevation System
    shadows: {
      sm: { 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
      base: { 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
      },
      lg: { 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      },
    },
  },

  // ==================== BUSINESS RULES ====================
  business: {
    // Pricing & Payments
    pricing: {
      currency: 'ETB',
      currencySymbol: 'ብር',
      minimumAmount: 1,
      maximumAmount: 1000000,
    },
    
    // Premium Features
    premium: {
      badgePrice: 200, // ETB per month
      listingBoostPrice: 399, // ETB
      featuredDuration: 30, // days
      subscriptionTiers: ['basic', 'premium', 'enterprise'],
    },
    
    // Booking Rules
    booking: {
      maxAdvanceDays: 90,
      minAdvanceHours: 2,
      autoConfirm: false,
      
      cancellation: {
        freeCancellationHours: 24,
        partialRefundHours: 12,
        noRefundHours: 2,
        penaltyPercentage: 10,
      },
    },
    
    // AI Construction Parameters
    construction: {
      maxWorkersPerProject: 50,
      minSquareArea: 10, // m²
      maxSquareArea: 10000, // m²
      maxFloors: 50,
      
      workerSkills: [
        'masonry', 'carpentry', 'electrical', 'plumbing', 
        'painting', 'steel-fixing', 'welding', 'tiling'
      ],
      
      projectComplexity: {
        low: { teamSize: { min: 2, max: 5 }, durationMultiplier: 1.0 },
        medium: { teamSize: { min: 5, max: 15 }, durationMultiplier: 1.5 },
        high: { teamSize: { min: 15, max: 50 }, durationMultiplier: 2.0 },
      },
    },
    
    // Verification System
    verification: {
      levels: [
        { 
          id: 'basic', 
          name: 'Basic Verification', 
          requirements: ['id_verification'],
          benefits: ['basic_listing']
        },
        { 
          id: 'verified', 
          name: 'Verified Professional', 
          requirements: ['id_verification', 'trade_certificate', 'portfolio'],
          benefits: ['enhanced_listing', 'trust_badge']
        },
        { 
          id: 'premium', 
          name: 'Premium Verified', 
          requirements: ['id_verification', 'trade_certificate', 'portfolio', 'insurance'],
          benefits: ['premium_listing', 'priority_support', 'ai_matching']
        }
      ],
    },
    
    // Commission Structure
    commissions: {
      serviceProvider: 0, // Zero commission as per features
      client: 0,
      governmentProjects: 0.05, // 5% for large government projects
      premiumFeatures: 0.15, // 15% for premium features
    },
  },

  // ==================== SECURITY CONFIG ====================
  security: {
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    
    encryption: {
      enabled: true,
      algorithm: 'AES-GCM',
      keyRotation: 24 * 60 * 60 * 1000, // 24 hours
    },
    
    // Data Retention (Ethiopian Compliance)
    dataRetention: {
      userData: 365, // days
      paymentData: 1825, // 5 years
      chatMessages: 90,
      analytics: 730, // 2 years
      constructionProjects: 2555, // 7 years
    },
  },

  // ==================== ANALYTICS & MONITORING ====================
  analytics: {
    enabled: ENV === 'production',
    samplingRate: ENV === 'production' ? 1.0 : 0.1,
    sessionTimeout: 30 * 60 * 1000,
    
    // Ethiopian-specific Tracking
    trackRegionalMetrics: true,
    trackPaymentMethods: true,
    trackServiceDemand: true,
    trackConstructionProjects: true,
    trackUserBehavior: true,
    
    // Performance Monitoring
    trackAPIMetrics: true,
    trackAppPerformance: true,
    trackErrorRates: true,
    trackUserSatisfaction: true,
  },

  // ==================== ERROR HANDLING ====================
  errorHandling: {
    maxErrorReportsPerHour: 10,
    captureUnhandledExceptions: true,
    captureConsoleErrors: __DEV__,
    
    // Ethiopian Context Errors
    trackNetworkIssues: true,
    trackPaymentFailures: true,
    trackLocationServices: true,
    trackAIMatchingErrors: true,
    trackGovernmentPortalIssues: true,
  },

  // ==================== UPLOAD CONFIGURATION ====================
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxImageSize: 2048, // pixels
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'text/plain'],
    maxImagesPerUpload: 10,
    compressionQuality: 0.8,
  },
};

// ==================== ENVIRONMENT-SPECIFIC OVERRIDES ====================
const ENV_CONFIGS = {
  development: {
    api: {
      baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/v2',
      timeout: 60000,
    },
    features: {
      development: {
        debugMenu: true,
        reduxDevTools: true,
        performanceMonitoring: true,
      },
    },
    analytics: {
      enabled: true,
      samplingRate: 1.0,
    },
  },

  staging: {
    api: {
      baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.staging.yachi.et/v2',
    },
    features: {
      development: {
        debugMenu: true,
        reduxDevTools: false,
      },
    },
    analytics: {
      enabled: true,
      samplingRate: 0.5,
    },
  },

  production: {
    api: {
      baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.yachi.et/v2',
    },
    features: {
      development: {
        debugMenu: false,
        reduxDevTools: false,
      },
    },
    analytics: {
      enabled: true,
      samplingRate: 1.0,
    },
  },
};

// ==================== CONFIG MERGE & ENHANCEMENT ====================
const config = {
  ...BASE_CONFIG,
  ...(ENV_CONFIGS[ENV] || {}),
  
  // ==================== ENTERPRISE HELPER METHODS ====================
  // Feature Flag System
  isFeatureEnabled: (featurePath) => {
    const path = featurePath.split('.');
    let value = config.features;
    
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return false;
      }
    }
    
    return Boolean(value);
  },

  // User Role & Permission System
  hasRoleAccess: (userRole, requiredRole) => {
    const roleHierarchy = ['client', 'service_provider', 'government', 'admin'];
    const userLevel = roleHierarchy.indexOf(userRole);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);
    return userLevel >= requiredLevel;
  },

  // Ethiopian Market Validators
  isEthiopianCity: (city) => config.app.ethiopianCities.includes(city),
  isSupportedLanguage: (lang) => config.app.supportedLanguages.includes(lang),
  isRTLLanguage: (lang) => config.app.rtlLanguages.includes(lang),
  
  // Payment System Validators
  isPaymentMethodEnabled: (method) => {
    const paymentMethods = {
      'chapa': config.features.payments.chapaIntegration,
      'telebirr': config.features.payments.telebirrIntegration,
      'cbe-birr': config.features.payments.cbeBirrIntegration,
    };
    return paymentMethods[method] || false;
  },

  // Construction System Validators
  isConstructionTypeEnabled: (type) => {
    return config.features.aiConstruction.projectTypes[type] || false;
  },

  // Environment & Platform Checks
  isEnvironment: (env) => config.environment === env,
  isPlatform: (platform) => config.platform.OS === platform,

  // Service Category Management
  isValidServiceCategory: (category) => {
    return config.app.serviceCategories.includes(category);
  },

  // API Endpoint Builder
  getEndpoint: (endpointKey, params = {}) => {
    let endpoint = endpointKey;
    
    // Navigate to endpoint in config
    const path = endpointKey.split('.');
    let current = config.api.endpoints;
    
    for (const key of path) {
      if (current && current[key]) {
        current = current[key];
      } else {
        throw new Error(`Endpoint not found: ${endpointKey}`);
      }
    }
    
    if (typeof current !== 'string') {
      throw new Error(`Invalid endpoint: ${endpointKey}`);
    }
    
    endpoint = current;
    
    // Replace parameters
    Object.keys(params).forEach(key => {
      endpoint = endpoint.replace(`:${key}`, encodeURIComponent(params[key]));
    });
    
    return `${config.api.baseURL}${endpoint}`;
  },

  // Premium Feature Calculator
  calculatePremiumCost: (feature, duration = 1) => {
    const pricing = {
      'badge': config.business.premium.badgePrice,
      'listing_boost': config.business.premium.listingBoostPrice,
    };
    
    const basePrice = pricing[feature];
    if (!basePrice) throw new Error(`Unknown premium feature: ${feature}`);
    
    return basePrice * duration;
  },

  // Construction Project Calculator
  estimateProjectTeam: (squareArea, floors, complexity = 'medium') => {
    const complexityConfig = config.business.construction.projectComplexity[complexity];
    if (!complexityConfig) throw new Error(`Unknown complexity level: ${complexity}`);
    
    const baseTeamSize = complexityConfig.teamSize;
    const areaMultiplier = Math.sqrt(squareArea / 100); // Scale with area
    const floorMultiplier = 1 + (floors * 0.1); // 10% increase per floor
    
    const minTeam = Math.ceil(baseTeamSize.min * areaMultiplier * floorMultiplier);
    const maxTeam = Math.ceil(baseTeamSize.max * areaMultiplier * floorMultiplier);
    
    return {
      min: Math.max(2, minTeam),
      max: Math.min(config.business.construction.maxWorkersPerProject, maxTeam),
      recommended: Math.ceil((minTeam + maxTeam) / 2),
    };
  },
};

// ==================== SECURITY & VALIDATION ====================
// Freeze configuration in production
if (config.isProduction) {
  Object.freeze(config);
  Object.freeze(config.features);
  Object.freeze(config.api);
  Object.freeze(config.ui);
}

// Configuration validation
const validateConfig = () => {
  const errors = [];
  
  // Validate required environment variables
  if (config.isProduction && !process.env.EXPO_PUBLIC_API_URL) {
    errors.push('EXPO_PUBLIC_API_URL is required in production');
  }
  
  // Validate feature dependencies
  if (config.features.aiConstruction.enabled && !config.features.payments.secureProcessing) {
    errors.push('AI Construction requires secure payment processing');
  }
  
  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    if (config.isProduction) {
      throw new Error('Invalid configuration: ' + errors.join(', '));
    }
  }
};

// Run validation
validateConfig();

export default config;