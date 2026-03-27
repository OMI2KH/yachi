// config/payment-config.js

/**
 * ENTERPRISE-GRADE PAYMENT CONFIGURATION
 * Yachi Construction & Services Platform
 * Complete Ethiopian Payment Gateway Integration
 * AI Construction & Premium Feature Payment Support
 */

import { Platform } from 'react-native';

// ==================== ENTERPRISE PAYMENT CONFIGURATION ====================
export const PAYMENT_CONFIG = {
  // ==================== PAYMENT GATEWAY CONFIGURATION ====================
  GATEWAYS: {
    // Chapa - Ethiopian Payment Gateway
    CHAPA: {
      id: 'chapa',
      name: 'Chapa',
      nameAmharic: 'ቻፓ',
      nameOromo: 'Chapa',
      enabled: true,
      environment: process.env.EXPO_PUBLIC_CHAPA_ENV || 'production',
      
      // API Configuration
      api: {
        baseUrl: process.env.EXPO_PUBLIC_CHAPA_BASE_URL || 'https://api.chapa.co/v1',
        publicKey: process.env.EXPO_PUBLIC_CHAPA_PUBLIC_KEY,
        secretKey: process.env.EXPO_PUBLIC_CHAPA_SECRET_KEY,
        timeout: 30000,
        version: 'v1',
      },
      
      // Payment Methods Supported
      supportedMethods: [
        {
          id: 'card',
          name: 'Credit/Debit Card',
          nameAmharic: 'ክሬዲት/ዲቢት ካርድ',
          nameOromo: 'Kaardii Liqii/Deebii',
          enabled: true,
          fees: { percentage: 1.5, fixed: 0 },
        },
        {
          id: 'bank',
          name: 'Bank Transfer',
          nameAmharic: 'ባንክ ማስተላለፍ',
          nameOromo: 'Daandii Baankii',
          enabled: true,
          fees: { percentage: 0.5, fixed: 0 },
        },
        {
          id: 'mobile',
          name: 'Mobile Money',
          nameAmharic: 'ሞባይል ገንዘብ',
          nameOromo: 'Maallaqa Mobilaa',
          enabled: true,
          fees: { percentage: 0.5, fixed: 0 },
        },
      ],
      
      // Transaction Limits (ETB)
      limits: {
        minAmount: 1,
        maxAmount: 100000,
        dailyMax: 500000,
        monthlyMax: 5000000,
        perTransactionMax: 100000,
      },
      
      // Security Configuration
      security: {
        encryption: true,
        webhookVerification: true,
        ipWhitelist: true,
        require3DS: true,
      },
      
      // Webhook Configuration
      webhooks: {
        success: 'https://api.yachi.et/webhooks/chapa/success',
        failure: 'https://api.yachi.et/webhooks/chapa/failure',
        verification: 'https://api.yachi.et/webhooks/chapa/verification',
      },
    },

    // Telebirr - Ethiopian Telecommunication Payment
    TELEBIRR: {
      id: 'telebirr',
      name: 'Telebirr',
      nameAmharic: 'ቴሊብር',
      nameOromo: 'Telebirr',
      enabled: true,
      environment: process.env.EXPO_PUBLIC_TELEBIRR_ENV || 'production',
      
      // API Configuration
      api: {
        baseUrl: process.env.EXPO_PUBLIC_TELEBIRR_BASE_URL || 'https://openapi.telebirr.com',
        appId: process.env.EXPO_PUBLIC_TELEBIRR_APP_ID,
        appKey: process.env.EXPO_PUBLIC_TELEBIRR_APP_KEY,
        publicKey: process.env.EXPO_PUBLIC_TELEBIRR_PUBLIC_KEY,
        timeout: 25000,
        version: 'v1',
      },
      
      // Payment Methods
      supportedMethods: [
        {
          id: 'telebirr_wallet',
          name: 'Telebirr Wallet',
          nameAmharic: 'ቴሊብር ዋሌት',
          nameOromo: 'Waalletii Telebirr',
          enabled: true,
          fees: { percentage: 0.5, fixed: 0 },
        },
      ],
      
      // Transaction Limits (ETB)
      limits: {
        minAmount: 1,
        maxAmount: 50000,
        dailyMax: 200000,
        monthlyMax: 1000000,
        perTransactionMax: 50000,
      },
      
      // Security
      security: {
        encryption: true,
        signatureVerification: true,
        timestampValidation: true,
      },
      
      // USSD Integration
      ussd: {
        enabled: true,
        code: '*809*',
        steps: 3,
      },
    },

    // CBE Birr - Commercial Bank of Ethiopia Mobile Payment
    CBE_BIRR: {
      id: 'cbe_birr',
      name: 'CBE Birr',
      nameAmharic: 'ሲቢኢ ብር',
      nameOromo: 'CBE Birr',
      enabled: true,
      environment: process.env.EXPO_PUBLIC_CBE_BIRR_ENV || 'production',
      
      // API Configuration
      api: {
        baseUrl: process.env.EXPO_PUBLIC_CBE_BIRR_BASE_URL || 'https://gateway.cbe.com.et',
        merchantId: process.env.EXPO_PUBLIC_CBE_MERCHANT_ID,
        appId: process.env.EXPO_PUBLIC_CBE_APP_ID,
        appKey: process.env.EXPO_PUBLIC_CBE_APP_KEY,
        timeout: 30000,
        version: 'v1',
      },
      
      // Payment Methods
      supportedMethods: [
        {
          id: 'cbe_birr_wallet',
          name: 'CBE Birr Wallet',
          nameAmharic: 'ሲቢኢ ብር ዋሌት',
          nameOromo: 'Waalletii CBE Birr',
          enabled: true,
          fees: { percentage: 0.5, fixed: 0 },
        },
        {
          id: 'cbe_account',
          name: 'CBE Bank Account',
          nameAmharic: 'ሲቢኢ ባንክ አካውንት',
          nameOromo: 'Akaawuntii Baankii CBE',
          enabled: true,
          fees: { percentage: 0.3, fixed: 0 },
        },
      ],
      
      // Transaction Limits (ETB)
      limits: {
        minAmount: 1,
        maxAmount: 50000,
        dailyMax: 200000,
        monthlyMax: 1000000,
        perTransactionMax: 50000,
      },
      
      // Security
      security: {
        encryption: true,
        twoFactorAuth: true,
        biometricAuth: true,
      },
    },
  },

  // ==================== ENTERPRISE PAYMENT SETTINGS ====================
  SETTINGS: {
    // Currency Configuration
    currency: {
      primary: 'ETB',
      symbol: 'ብር',
      decimalPlaces: 2,
      format: {
        en: 'ETB {amount}',
        am: '{amount} ብር',
        om: 'ETB {amount}',
      },
    },

    // Transaction Configuration
    transaction: {
      timeout: 300000, // 5 minutes
      maxRetries: 3,
      retryDelay: 5000,
      autoCapture: true,
      allowPartialRefunds: true,
      refundTimeLimit: 30 * 24 * 60 * 60 * 1000, // 30 days
    },

    // Security Settings
    security: {
      requireCVV: true,
      require3DS: true,
      tokenization: true,
      encryption: true,
      fraudDetection: true,
      maxFailedAttempts: 5,
      lockoutDuration: 900000, // 15 minutes
    },

    // Compliance & Regulations
    compliance: {
      kycRequired: true,
      amlEnabled: true,
      taxInclusive: true,
      receiptRequired: true,
      dataRetention: 1825, // 5 years in days
    },
  },

  // ==================== PAYMENT FLOW CONFIGURATION ====================
  FLOWS: {
    // Service Booking Payment Flow
    SERVICE_BOOKING: {
      id: 'service_booking',
      name: 'Service Booking Payment',
      steps: [
        'amount_calculation',
        'payment_method_selection',
        'authentication',
        'processing',
        'confirmation',
        'receipt_generation',
      ],
      allowedMethods: ['chapa', 'telebirr', 'cbe_birr'],
      requiresConfirmation: true,
      autoRefundOnCancel: true,
    },

    // AI Construction Project Payment Flow
    CONSTRUCTION_PROJECT: {
      id: 'construction_project',
      name: 'Construction Project Payment',
      steps: [
        'budget_approval',
        'milestone_setup',
        'escrow_funding',
        'milestone_release',
        'final_settlement',
      ],
      allowedMethods: ['chapa', 'cbe_birr'],
      requiresEscrow: true,
      milestonePayments: true,
      holdPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    },

    // Government Project Payment Flow
    GOVERNMENT_PROJECT: {
      id: 'government_project',
      name: 'Government Project Payment',
      steps: [
        'budget_approval',
        'contract_signing',
        'escrow_funding',
        'progress_verification',
        'milestone_release',
        'audit_trail',
      ],
      allowedMethods: ['chapa', 'cbe_birr'],
      requiresApproval: true,
      multiLevelAuth: true,
      auditRequired: true,
    },

    // Premium Feature Payment Flow
    PREMIUM_FEATURE: {
      id: 'premium_feature',
      name: 'Premium Feature Payment',
      steps: [
        'feature_selection',
        'payment_processing',
        'activation',
        'confirmation',
      ],
      allowedMethods: ['chapa', 'telebirr', 'cbe_birr'],
      subscriptionSupported: true,
      autoRenewal: true,
    },

    // Worker Payout Flow
    WORKER_PAYOUT: {
      id: 'worker_payout',
      name: 'Worker Payment Payout',
      steps: [
        'earning_calculation',
        'payout_method_selection',
        'processing',
        'confirmation',
      ],
      allowedMethods: ['telebirr', 'cbe_birr'],
      batchProcessing: true,
      minimumPayout: 100, // ETB
    },
  },

  // ==================== PREMIUM FEATURE PRICING ====================
  PREMIUM_PRICING: {
    // Premium Badge (200 ETB/month)
    BADGE: {
      id: 'premium_badge',
      name: 'Premium Badge',
      nameAmharic: 'ፕሪሚየም ምልክት',
      nameOromo: 'Mallattoo Premium',
      price: 200,
      currency: 'ETB',
      duration: 'monthly',
      features: [
        'verified_badge_display',
        'search_priority_boost',
        'profile_enhancement',
        'trust_indicator',
        'ai_matching_priority',
      ],
      paymentFlow: 'PREMIUM_FEATURE',
      allowedGateways: ['chapa', 'telebirr', 'cbe_birr'],
    },

    // Premium Listing (399 ETB)
    LISTING: {
      id: 'premium_listing',
      name: 'Premium Listing',
      nameAmharic: 'ፕሪሚየም ዝርዝር',
      nameOromo: 'Galmeessuu Premium',
      price: 399,
      currency: 'ETB',
      duration: 'one_time',
      validity: 30, // days
      features: [
        'top_search_placement',
        'category_featuring',
        'highlighted_listing',
        'increased_visibility',
        'premium_tag_display',
      ],
      paymentFlow: 'PREMIUM_FEATURE',
      allowedGateways: ['chapa', 'telebirr', 'cbe_birr'],
    },

    // Featured Listing Boost
    FEATURED_BOOST: {
      id: 'featured_boost',
      name: 'Featured Listing Boost',
      nameAmharic: 'የተለየ ዝርዝር ማሳደጊያ',
      nameOromo: 'Daddabbarsuu Galmeessuu',
      price: 199,
      currency: 'ETB',
      duration: 'one_time',
      validity: 7, // days
      features: [
        'homepage_featuring',
        'push_notification',
        'category_highlight',
        'increased_bookings',
      ],
      paymentFlow: 'PREMIUM_FEATURE',
      allowedGateways: ['chapa', 'telebirr', 'cbe_birr'],
    },
  },

  // ==================== CONSTRUCTION PROJECT PAYMENT STRUCTURE ====================
  CONSTRUCTION_PAYMENTS: {
    // Payment Milestones for Construction Projects
    MILESTONES: {
      INITIAL_DEPOSIT: {
        id: 'initial_deposit',
        name: 'Initial Deposit',
        nameAmharic: 'መጀመሪያ ተከፋይ',
        nameOromo: 'Galii Jalqabaa',
        percentage: 20,
        trigger: 'project_start',
        requirements: ['contract_signed', 'materials_verified'],
      },
      FOUNDATION_COMPLETE: {
        id: 'foundation_complete',
        name: 'Foundation Complete',
        nameAmharic: 'መሠረት ተጠናቋል',
        nameOromo: 'Bu\'uura Xumuramte',
        percentage: 15,
        trigger: 'foundation_inspection_passed',
        requirements: ['inspection_report', 'photos_verified'],
      },
      STRUCTURE_COMPLETE: {
        id: 'structure_complete',
        name: 'Structure Complete',
        nameAmharic: 'አወቃቀር ተጠናቋል',
        nameOromo: 'Qaama Xumuramte',
        percentage: 25,
        trigger: 'structure_inspection_passed',
        requirements: ['structural_certificate', 'engineer_approval'],
      },
      FINISHING_COMPLETE: {
        id: 'finishing_complete',
        name: 'Finishing Complete',
        nameAmharic: 'መጨረሻ ስራ ተጠናቋል',
        nameOromo: 'Xumura Xumuramte',
        percentage: 30,
        trigger: 'finishing_inspection_passed',
        requirements: ['quality_check', 'client_walkthrough'],
      },
      FINAL_PAYMENT: {
        id: 'final_payment',
        name: 'Final Payment',
        nameAmharic: 'የመጨረሻ ክፍያ',
        nameOromo: 'Kaffaltii Xumuraa',
        percentage: 10,
        trigger: 'project_completion',
        requirements: ['final_inspection', 'client_acceptance', 'documents_submitted'],
      },
    },

    // Escrow Configuration
    ESCROW: {
      enabled: true,
      holdPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoRelease: false,
      disputePeriod: 14 * 24 * 60 * 60 * 1000, // 14 days
      feePercentage: 1.0,
      minAmount: 1000, // ETB
    },
  },

  // ==================== ERROR HANDLING & RETRY CONFIGURATION ====================
  ERROR_HANDLING: {
    // Gateway Specific Error Codes
    ERROR_CODES: {
      CHAPA: {
        INSUFFICIENT_FUNDS: 'CH001',
        TRANSACTION_DECLINED: 'CH002',
        NETWORK_ERROR: 'CH003',
        TIMEOUT: 'CH004',
        INVALID_CARD: 'CH005',
      },
      TELEBIRR: {
        WALLET_LIMIT_EXCEEDED: 'TB001',
        USER_NOT_FOUND: 'TB002',
        TRANSACTION_FAILED: 'TB003',
        SYSTEM_ERROR: 'TB004',
      },
      CBE_BIRR: {
        ACCOUNT_LOCKED: 'CB001',
        DAILY_LIMIT_EXCEEDED: 'CB002',
        INVALID_CREDENTIALS: 'CB003',
        MAINTENANCE: 'CB004',
      },
    },

    // Retry Configuration
    RETRY_CONFIG: {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SYSTEM_ERROR'],
    },

    // Fallback Strategy
    FALLBACK_STRATEGY: {
      enabled: true,
      primaryGateway: 'chapa',
      fallbackOrder: ['telebirr', 'cbe_birr'],
      autoSwitch: true,
    },
  },

  // ==================== ANALYTICS & REPORTING ====================
  ANALYTICS: {
    enabled: true,
    trackSuccessRate: true,
    trackFailureReasons: true,
    trackProcessingTime: true,
    trackUserPreferences: true,
    
    // Ethiopian Market Analytics
    trackRegionalUsage: true,
    trackGatewayPerformance: true,
    trackCurrencyPreferences: true,
    trackMobileMoneyAdoption: true,
  },

  // ==================== ETHIOPIAN MARKET SPECIFIC CONFIGURATION ====================
  ETHIOPIAN_MARKET: {
    // Tax Configuration
    tax: {
      vatEnabled: true,
      vatPercentage: 15,
      withholdingTax: true,
      withholdingPercentage: 2,
      taxInclusive: true,
    },

    // Regional Pricing
    regionalPricing: {
      addis_ababa: { multiplier: 1.0 },
      dire_dawa: { multiplier: 0.95 },
      mekelle: { multiplier: 0.92 },
      hawassa: { multiplier: 0.90 },
      bahir_dar: { multiplier: 0.88 },
      other: { multiplier: 0.85 },
    },

    // Local Business Rules
    businessRules: {
      workingHours: {
        start: '08:00',
        end: '18:00',
        timezone: 'Africa/Addis_Ababa',
      },
      holidays: [
        '01-07', // Ethiopian Christmas
        '01-19', // Timket
        '03-02', // Adwa Victory Day
        '05-01', // International Workers Day
        '05-28', // Downfall of Derg
        '09-11', // Ethiopian New Year
        '09-27', // Finding of True Cross
      ],
    },
  },
};

// ==================== PAYMENT UTILITY FUNCTIONS ====================
export const PaymentUtils = {
  /**
   * Calculate payment amount with fees
   */
  calculateTotalAmount(amount, gateway, method, includeTax = true) {
    const gatewayConfig = PAYMENT_CONFIG.GATEWAYS[gateway];
    const methodConfig = gatewayConfig?.supportedMethods?.find(m => m.id === method);
    
    if (!methodConfig) return amount;

    let total = amount;
    
    // Add gateway fees
    const fees = methodConfig.fees;
    total += (amount * fees.percentage) / 100;
    total += fees.fixed;
    
    // Add tax if applicable
    if (includeTax && PAYMENT_CONFIG.ETHIOPIAN_MARKET.tax.vatEnabled) {
      total += (total * PAYMENT_CONFIG.ETHIOPIAN_MARKET.tax.vatPercentage) / 100;
    }
    
    return Math.ceil(total);
  },

  /**
   * Validate payment amount against gateway limits
   */
  validateAmount(amount, gateway) {
    const gatewayConfig = PAYMENT_CONFIG.GATEWAYS[gateway];
    const limits = gatewayConfig?.limits;
    
    if (!limits) return { valid: false, reason: 'GATEWAY_NOT_FOUND' };
    
    if (amount < limits.minAmount) {
      return { 
        valid: false, 
        reason: 'BELOW_MINIMUM', 
        minAmount: limits.minAmount 
      };
    }
    
    if (amount > limits.maxAmount) {
      return { 
        valid: false, 
        reason: 'ABOVE_MAXIMUM', 
        maxAmount: limits.maxAmount 
      };
    }
    
    return { valid: true };
  },

  /**
   * Get available payment methods for a specific flow
   */
  getAvailableMethods(flow, userPreferences = {}) {
    const flowConfig = PAYMENT_CONFIG.FLOWS[flow];
    if (!flowConfig) return [];
    
    const availableMethods = [];
    
    flowConfig.allowedMethods.forEach(gatewayId => {
      const gateway = PAYMENT_CONFIG.GATEWAYS[gatewayId];
      if (gateway?.enabled) {
        gateway.supportedMethods.forEach(method => {
          if (method.enabled) {
            availableMethods.push({
              gateway: gatewayId,
              method: method.id,
              name: method.name,
              nameAmharic: method.nameAmharic,
              nameOromo: method.nameOromo,
              fees: method.fees,
              limits: gateway.limits,
            });
          }
        });
      }
    });
    
    // Sort by user preferences
    if (userPreferences.preferredGateway) {
      availableMethods.sort((a, b) => {
        if (a.gateway === userPreferences.preferredGateway) return -1;
        if (b.gateway === userPreferences.preferredGateway) return 1;
        return 0;
      });
    }
    
    return availableMethods;
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount, language = 'en') {
    const format = PAYMENT_CONFIG.SETTINGS.currency.format[language];
    const formattedAmount = amount.toLocaleString('en-ET', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return format.replace('{amount}', formattedAmount);
  },

  /**
   * Get gateway configuration
   */
  getGatewayConfig(gateway) {
    return PAYMENT_CONFIG.GATEWAYS[gateway];
  },

  /**
   * Check if gateway is available
   */
  isGatewayAvailable(gateway) {
    const config = PAYMENT_CONFIG.GATEWAYS[gateway];
    return config?.enabled === true;
  },

  /**
   * Calculate construction milestone payment
   */
  calculateMilestonePayment(totalBudget, milestoneId) {
    const milestone = PAYMENT_CONFIG.CONSTRUCTION_PAYMENTS.MILESTONES[milestoneId];
    if (!milestone) return 0;
    
    return (totalBudget * milestone.percentage) / 100;
  },

  /**
   * Get premium feature pricing
   */
  getPremiumPricing(featureId) {
    return PAYMENT_CONFIG.PREMIUM_PRICING[featureId];
  },
};

// ==================== PAYMENT SECURITY UTILITIES ====================
export const PaymentSecurity = {
  /**
   * Validate payment credentials
   */
  validateCredentials(gateway, credentials) {
    const gatewayConfig = PAYMENT_CONFIG.GATEWAYS[gateway];
    const securityConfig = gatewayConfig?.security;
    
    if (!securityConfig) return { valid: false, reason: 'INVALID_GATEWAY' };
    
    // Implement gateway-specific credential validation
    switch (gateway) {
      case 'chapa':
        return this.validateChapaCredentials(credentials);
      case 'telebirr':
        return this.validateTelebirrCredentials(credentials);
      case 'cbe_birr':
        return this.validateCbeBirrCredentials(credentials);
      default:
        return { valid: false, reason: 'UNSUPPORTED_GATEWAY' };
    }
  },

  /**
   * Encrypt sensitive payment data
   */
  encryptPaymentData(data, gateway) {
    // Implementation would use gateway-specific encryption
    // This is a placeholder for actual encryption logic
    return {
      encrypted: true,
      data: JSON.stringify(data),
      timestamp: Date.now(),
      gateway: gateway,
    };
  },

  /**
   * Generate transaction ID
   */
  generateTransactionId(gateway) {
    const prefix = gateway.toUpperCase();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  },
};

export default PAYMENT_CONFIG;