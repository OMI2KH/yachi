// constants/payment.js

/**
 * ENTERPRISE PAYMENT CONSTANTS
 * Yachi Construction & Services Platform
 * Ethiopian Market Payment Integration with Advanced Financial Features
 */

import { Platform } from 'react-native';

// ==================== ENTERPRISE PAYMENT PROVIDERS ====================
export const PAYMENT_PROVIDERS = {
  CHAPA: {
    id: 'chapa',
    name: { 
      en: 'Chapa', 
      am: 'ቻፓ', 
      om: 'Chapa' 
    },
    type: 'online',
    category: 'payment_gateway',
    status: 'active',
    commission_rate: 0.015, // 1.5%
    settlement_days: 2,
    min_amount: 1,
    max_amount: 100000,
    currency: 'ETB',
    supported_currencies: ['ETB'],
    icon: '💳',
    color: '#2563EB',
    
    // API Configuration
    api_config: {
      base_url: 'https://api.chapa.co/v1',
      endpoints: {
        initiate: '/transaction/initialize',
        verify: '/transaction/verify/',
        webhook: '/webhook/chapa',
      },
      headers: {
        'Authorization': 'Bearer {api_key}',
        'Content-Type': 'application/json',
      },
    },

    // Ethiopian Market Features
    ethiopian_features: {
      supports_mobile_banking: true,
      supports_bank_transfer: true,
      supports_tele_birr: true,
      local_currency_only: true,
      amharic_support: true,
    },

    // Security
    security: {
      ssl_required: true,
      two_factor_auth: false,
      tokenization: true,
      pci_compliant: true,
    },
  },

  TELEBIRR: {
    id: 'telebirr',
    name: { 
      en: 'Telebirr', 
      am: 'ቴሌብር', 
      om: 'Telebirr' 
    },
    type: 'mobile_money',
    category: 'telecom',
    status: 'active',
    commission_rate: 0.01, // 1%
    settlement_days: 1,
    min_amount: 1,
    max_amount: 50000,
    currency: 'ETB',
    supported_currencies: ['ETB'],
    icon: '📱',
    color: '#DC2626',
    
    // API Configuration
    api_config: {
      base_url: 'https://api.telebirr.et/v1',
      endpoints: {
        initiate: '/payment/request',
        verify: '/payment/verify',
        webhook: '/webhook/telebirr',
      },
      headers: {
        'appId': '{app_id}',
        'Content-Type': 'application/json',
      },
    },

    // Ethiopian Market Features
    ethiopian_features: {
      supports_mobile_banking: false,
      supports_bank_transfer: false,
      supports_tele_birr: true,
      local_currency_only: true,
      amharic_support: true,
      ethio_telecom_exclusive: true,
    },

    // Security
    security: {
      ssl_required: true,
      two_factor_auth: true,
      tokenization: false,
      pci_compliant: true,
    },
  },

  CBE_BIRR: {
    id: 'cbe_birr',
    name: { 
      en: 'CBE Birr', 
      am: 'ሲቢኢ ብር', 
      om: 'CBE Birr' 
    },
    type: 'mobile_banking',
    category: 'banking',
    status: 'active',
    commission_rate: 0.008, // 0.8%
    settlement_days: 1,
    min_amount: 1,
    max_amount: 100000,
    currency: 'ETB',
    supported_currencies: ['ETB'],
    icon: '🏦',
    color: '#059669',
    
    // API Configuration
    api_config: {
      base_url: 'https://api.cbebirr.et/v1',
      endpoints: {
        initiate: '/transfer/initiate',
        verify: '/transfer/verify',
        webhook: '/webhook/cbebirr',
      },
      headers: {
        'merchantId': '{merchant_id}',
        'apiKey': '{api_key}',
        'Content-Type': 'application/json',
      },
    },

    // Ethiopian Market Features
    ethiopian_features: {
      supports_mobile_banking: true,
      supports_bank_transfer: true,
      supports_tele_birr: false,
      local_currency_only: true,
      amharic_support: true,
      cbe_exclusive: true,
    },

    // Security
    security: {
      ssl_required: true,
      two_factor_auth: true,
      tokenization: true,
      pci_compliant: true,
    },
  },

  BANK_TRANSFER: {
    id: 'bank_transfer',
    name: { 
      en: 'Bank Transfer', 
      am: 'የባንክ ማስተላለፊያ', 
      om: 'Jijjiirrama Baankii' 
    },
    type: 'bank_transfer',
    category: 'banking',
    status: 'active',
    commission_rate: 0.0,
    settlement_days: 3,
    min_amount: 100,
    max_amount: 1000000,
    currency: 'ETB',
    supported_currencies: ['ETB'],
    icon: '💸',
    color: '#7C3AED',
  },

  CASH: {
    id: 'cash',
    name: { 
      en: 'Cash', 
      am: 'ካሽ', 
      om: 'Qarshii' 
    },
    type: 'cash',
    category: 'offline',
    status: 'active',
    commission_rate: 0.0,
    settlement_days: 0,
    min_amount: 1,
    max_amount: 50000,
    currency: 'ETB',
    supported_currencies: ['ETB'],
    icon: '💰',
    color: '#F59E0B',
  },
};

// ==================== PAYMENT STATUS & WORKFLOW ====================
export const PAYMENT_STATUS = {
  PENDING: {
    id: 'pending',
    name: { 
      en: 'Pending', 
      am: 'በጥበቃ', 
      om: 'Eegama' 
    },
    color: '#F59E0B',
    can_refund: false,
    can_capture: true,
    is_final: false,
    description: 'Payment has been initiated but not completed',
  },

  PROCESSING: {
    id: 'processing',
    name: { 
      en: 'Processing', 
      am: 'በሂደት', 
      om: 'Hojii Irra' 
    },
    color: '#3B82F6',
    can_refund: false,
    can_capture: false,
    is_final: false,
    description: 'Payment is being processed by the payment provider',
  },

  COMPLETED: {
    id: 'completed',
    name: { 
      en: 'Completed', 
      am: 'ተጠናቋል', 
      om: 'Xumurama' 
    },
    color: '#10B981',
    can_refund: true,
    can_capture: false,
    is_final: true,
    description: 'Payment has been successfully completed',
  },

  FAILED: {
    id: 'failed',
    name: { 
      en: 'Failed', 
      am: 'አልተሳካም', 
      om: 'Hin Milkoofne' 
    },
    color: '#EF4444',
    can_refund: false,
    can_capture: false,
    is_final: true,
    description: 'Payment has failed',
  },

  CANCELLED: {
    id: 'cancelled',
    name: { 
      en: 'Cancelled', 
      am: 'ተሰርዟል', 
      om: 'Dhiifama' 
    },
    color: '#6B7280',
    can_refund: false,
    can_capture: false,
    is_final: true,
    description: 'Payment was cancelled by the user',
  },

  REFUNDED: {
    id: 'refunded',
    name: { 
      en: 'Refunded', 
      am: 'ተመላሽ ተደርጓል', 
      om: 'Deebisan' 
    },
    color: '#8B5CF6',
    can_refund: false,
    can_capture: false,
    is_final: true,
    description: 'Payment has been refunded to the customer',
  },

  PARTIALLY_REFUNDED: {
    id: 'partially_refunded',
    name: { 
      en: 'Partially Refunded', 
      am: 'ከፊል ተመላሽ ተደርጓል', 
      om: 'Garii Deebisan' 
    },
    color: '#A855F7',
    can_refund: true,
    can_capture: false,
    is_final: false,
    description: 'Partial amount has been refunded',
  },
};

// ==================== PAYMENT TYPES & CATEGORIES ====================
export const PAYMENT_TYPES = {
  SERVICE_BOOKING: {
    id: 'service_booking',
    name: { 
      en: 'Service Booking', 
      am: 'የአገልግሎት ቦኪንግ', 
      om: 'Booking Tajaajilaa' 
    },
    category: 'service',
    requires_approval: false,
    auto_capture: true,
    refund_policy: 'standard',
  },

  CONSTRUCTION_PROJECT: {
    id: 'construction_project',
    name: { 
      en: 'Construction Project', 
      am: 'የግንባታ ፕሮጀክት', 
      om: 'Pirootii Ijaarsaa' 
    },
    category: 'construction',
    requires_approval: true,
    auto_capture: false,
    refund_policy: 'milestone_based',
  },

  PREMIUM_SUBSCRIPTION: {
    id: 'premium_subscription',
    name: { 
      en: 'Premium Subscription', 
      am: 'ፕሪሚየም ምዝገባ', 
      om: 'Galmeessuu Premium' 
    },
    category: 'subscription',
    requires_approval: false,
    auto_capture: true,
    refund_policy: 'no_refund',
  },

  FEATURED_LISTING: {
    id: 'featured_listing',
    name: { 
      en: 'Featured Listing', 
      am: 'የተለየ ዝርዝር', 
      om: 'Galmeessuu Addaa' 
    },
    category: 'advertising',
    requires_approval: false,
    auto_capture: true,
    refund_policy: 'no_refund',
  },

  SECURITY_DEPOSIT: {
    id: 'security_deposit',
    name: { 
      en: 'Security Deposit', 
      am: 'የደህንነት ተጋርቶ', 
      om: 'Kaffaltii Nageenyaa' 
    },
    category: 'deposit',
    requires_approval: false,
    auto_capture: false,
    refund_policy: 'condition_based',
  },

  MILESTONE_PAYMENT: {
    id: 'milestone_payment',
    name: { 
      en: 'Milestone Payment', 
      am: 'የደረጃ ክፍያ', 
      om: 'Kaffaltii Sadarkaa' 
    },
    category: 'construction',
    requires_approval: true,
    auto_capture: false,
    refund_policy: 'milestone_based',
  },
};

// ==================== ETHIOPIAN FINANCIAL CONFIGURATION ====================
export const ETHIOPIAN_FINANCIAL_CONFIG = {
  CURRENCY: {
    code: 'ETB',
    symbol: 'Br',
    name: { 
      en: 'Ethiopian Birr', 
      am: 'ኢትዮጵያ ብር', 
      om: 'Birrii Itoophiyaa' 
    },
    decimal_places: 2,
    format: {
      en: 'Br {amount}',
      am: '{amount} ብር',
      om: 'Birrii {amount}',
    },
  },

  TAX_CONFIG: {
    vat_rate: 0.15, // 15% VAT
    withholding_tax: 0.02, // 2% withholding tax
    income_tax_threshold: 600, // Monthly income tax threshold
    tax_identification_required: true,
  },

  COMMISSION_STRUCTURE: {
    service_booking: 0.00, // 0% commission for regular services
    construction_project: 0.00, // 0% commission for construction
    premium_features: 0.00, // 0% commission for premium features
    payment_processing: 'provider_rates', // Use provider commission rates
  },

  // Ethiopian banking regulations
  REGULATORY_LIMITS: {
    max_single_transaction: 100000, // ETB
    max_daily_transaction: 500000, // ETB
    max_monthly_transaction: 2000000, // ETB
    min_transaction_amount: 1, // ETB
    transaction_reporting_threshold: 10000, // ETB
  },

  // Ethiopian holiday schedule affecting payments
  BANKING_HOLIDAYS: [
    '01-07', // Ethiopian Christmas
    '01-19', // Ethiopian Epiphany
    '03-02', // Victory of Adwa
    '04-06', // Ethiopian Good Friday
    '04-08', // Ethiopian Easter
    '05-01', // International Workers Day
    '05-28', // Downfall of Derg
    '09-11', // Ethiopian New Year
    '09-27', // Finding of True Cross
  ],
};

// ==================== REFUND & DISPUTE CONFIGURATION ====================
export const REFUND_CONFIG = {
  POLICIES: {
    STANDARD: {
      id: 'standard',
      name: { 
        en: 'Standard Refund', 
        am: 'መደበኛ ተመላሽ', 
        om: 'Deebisaa Sadarkaa' 
      },
      timeframe: 7, // days
      percentage: 100,
      conditions: ['service_not_provided', 'quality_issue'],
    },

    MILESTONE_BASED: {
      id: 'milestone_based',
      name: { 
        en: 'Milestone Based', 
        am: 'በደረጃ መሠረት', 
        om: 'Sadarkaan Hundaa\'e' 
      },
      timeframe: 14,
      percentage: 'variable',
      conditions: ['milestone_not_met', 'project_cancellation'],
    },

    CONDITION_BASED: {
      id: 'condition_based',
      name: { 
        en: 'Condition Based', 
        am: 'በሁኔታ መሠረት', 
        om: 'Haalaan Hundaa\'e' 
      },
      timeframe: 30,
      percentage: 'variable',
      conditions: ['damage_occurred', 'terms_violation'],
    },

    NO_REFUND: {
      id: 'no_refund',
      name: { 
        en: 'No Refund', 
        am: 'ተመላሽ የለም', 
        om: 'Deebisaa Hin Jiru' 
      },
      timeframe: 0,
      percentage: 0,
      conditions: [],
    },
  },

  DISPUTE_RESOLUTION: {
    TIME_LIMIT: 30, // days to raise dispute
    ESCALATION_LEVELS: ['customer_service', 'mediation', 'arbitration'],
    DOCUMENTATION_REQUIRED: ['receipts', 'communication_logs', 'evidence_photos'],
  },
};

// ==================== SECURITY & COMPLIANCE ====================
export const PAYMENT_SECURITY = {
  ENCRYPTION: {
    algorithm: 'AES-256-GCM',
    key_rotation_days: 90,
    tokenization_required: true,
  },

  COMPLIANCE: {
    pci_dss: true,
    gdpr: true,
    local_data_sovereignty: true,
    audit_trail_required: true,
  },

  FRAUD_PREVENTION: {
    velocity_checks: true,
    amount_threshold_monitoring: true,
    ip_geolocation_verification: true,
    device_fingerprinting: true,
    behavioral_analysis: true,
  },

  RISK_MANAGEMENT: {
    max_chargeback_rate: 0.01, // 1%
    reserve_requirement: 0.05, // 5%
    insurance_coverage: true,
  },
};

// ==================== ENTERPRISE PAYMENT SERVICE ====================
export class PaymentConstantsService {
  /**
   * Get payment provider by ID
   */
  static getPaymentProvider(providerId) {
    return PAYMENT_PROVIDERS[providerId?.toUpperCase()] || null;
  }

  /**
   * Get payment status by ID
   */
  static getPaymentStatus(statusId) {
    return PAYMENT_STATUS[statusId?.toUpperCase()] || PAYMENT_STATUS.PENDING;
  }

  /**
   * Get payment type by ID
   */
  static getPaymentType(typeId) {
    return PAYMENT_TYPES[typeId?.toUpperCase()] || PAYMENT_TYPES.SERVICE_BOOKING;
  }

  /**
   * Calculate total amount with fees
   */
  static calculateTotalAmount(baseAmount, paymentType, providerId) {
    const provider = this.getPaymentProvider(providerId);
    const paymentTypeConfig = this.getPaymentType(paymentType);
    
    if (!provider) return baseAmount;

    const commission = baseAmount * provider.commission_rate;
    const vat = commission * ETHIOPIAN_FINANCIAL_CONFIG.TAX_CONFIG.vat_rate;
    
    return {
      base_amount: baseAmount,
      commission: commission,
      vat: vat,
      total_amount: baseAmount + commission + vat,
      breakdown: {
        service_amount: baseAmount,
        processing_fee: commission,
        vat: vat,
      },
    };
  }

  /**
   * Format Ethiopian currency
   */
  static formatEthiopianCurrency(amount, language = 'en') {
    const format = ETHIOPIAN_FINANCIAL_CONFIG.CURRENCY.format[language] || 
                   ETHIOPIAN_FINANCIAL_CONFIG.CURRENCY.format.en;
    
    return format.replace('{amount}', this.formatNumber(amount));
  }

  /**
   * Format number with Ethiopian formatting
   */
  static formatNumber(number) {
    return new Intl.NumberFormat('en-ET', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  }

  /**
   * Validate payment amount for provider
   */
  static validatePaymentAmount(amount, providerId) {
    const provider = this.getPaymentProvider(providerId);
    if (!provider) return { valid: false, reason: 'INVALID_PROVIDER' };

    if (amount < provider.min_amount) {
      return { 
        valid: false, 
        reason: 'BELOW_MINIMUM',
        min_amount: provider.min_amount,
      };
    }

    if (amount > provider.max_amount) {
      return { 
        valid: false, 
        reason: 'ABOVE_MAXIMUM',
        max_amount: provider.max_amount,
      };
    }

    return { valid: true };
  }

  /**
   * Get available payment providers for amount and type
   */
  static getAvailableProviders(amount, paymentType, userLocation) {
    return Object.values(PAYMENT_PROVIDERS).filter(provider => {
      // Check amount limits
      if (amount < provider.min_amount || amount > provider.max_amount) {
        return false;
      }

      // Check status
      if (provider.status !== 'active') {
        return false;
      }

      // Check Ethiopian-specific requirements
      if (provider.ethiopian_features?.local_currency_only && 
          !ETHIOPIAN_FINANCIAL_CONFIG.CURRENCY.supported_currencies.includes('ETB')) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if date is Ethiopian banking holiday
   */
  static isBankingHoliday(date = new Date()) {
    const monthDay = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return ETHIOPIAN_FINANCIAL_CONFIG.BANKING_HOLIDAYS.includes(monthDay);
  }

  /**
   * Get refund policy for payment type
   */
  static getRefundPolicy(paymentTypeId) {
    const paymentType = this.getPaymentType(paymentTypeId);
    return REFUND_CONFIG.POLICIES[paymentType.refund_policy?.toUpperCase()] || 
           REFUND_CONFIG.POLICIES.STANDARD;
  }

  /**
   * Calculate settlement date
   */
  static calculateSettlementDate(providerId, paymentDate = new Date()) {
    const provider = this.getPaymentProvider(providerId);
    if (!provider) return paymentDate;

    let settlementDate = new Date(paymentDate);
    let daysToAdd = provider.settlement_days;

    while (daysToAdd > 0) {
      settlementDate.setDate(settlementDate.getDate() + 1);
      
      // Skip weekends and banking holidays
      if (settlementDate.getDay() !== 0 && settlementDate.getDay() !== 6 && 
          !this.isBankingHoliday(settlementDate)) {
        daysToAdd--;
      }
    }

    return settlementDate;
  }

  /**
   * Get localized provider name
   */
  static getLocalizedProviderName(providerId, language = 'en') {
    const provider = this.getPaymentProvider(providerId);
    return provider?.name[language] || provider?.name.en || providerId;
  }
}

// ==================== PAYMENT ERROR CODES ====================
export const PAYMENT_ERROR_CODES = {
  // Provider errors
  PROVIDER_UNAVAILABLE: 'PAYMENT_001',
  INVALID_PROVIDER_CONFIG: 'PAYMENT_002',
  PROVIDER_TIMEOUT: 'PAYMENT_003',

  // Amount errors
  INVALID_AMOUNT: 'PAYMENT_004',
  BELOW_MINIMUM_AMOUNT: 'PAYMENT_005',
  ABOVE_MAXIMUM_AMOUNT: 'PAYMENT_006',

  // Security errors
  SECURITY_VIOLATION: 'PAYMENT_007',
  FRAUD_DETECTED: 'PAYMENT_008',
  SUSPICIOUS_ACTIVITY: 'PAYMENT_009',

  // Transaction errors
  TRANSACTION_FAILED: 'PAYMENT_010',
  DUPLICATE_TRANSACTION: 'PAYMENT_011',
  EXPIRED_TRANSACTION: 'PAYMENT_012',

  // Network errors
  NETWORK_ERROR: 'PAYMENT_013',
  CONNECTION_TIMEOUT: 'PAYMENT_014',
};

// ==================== EXPORT CONFIGURATION ====================
export const PAYMENT_CONSTANTS = {
  providers: PAYMENT_PROVIDERS,
  status: PAYMENT_STATUS,
  types: PAYMENT_TYPES,
  ethiopianConfig: ETHIOPIAN_FINANCIAL_CONFIG,
  refundConfig: REFUND_CONFIG,
  security: PAYMENT_SECURITY,
  errors: PAYMENT_ERROR_CODES,
  service: PaymentConstantsService,
};

export default PAYMENT_CONSTANTS;