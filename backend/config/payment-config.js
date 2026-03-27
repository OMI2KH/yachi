/**
 * Yachi - Enterprise Payment Configuration
 * Ethiopian Payment Gateway Integration with Multi-Currency Support
 * @version 1.0.0
 */

const config = {
  // Payment System Configuration
  system: {
    enabled: process.env.PAYMENT_SYSTEM_ENABLED === 'true',
    version: '2.3.0',
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    defaultCurrency: 'ETB',
    supportedCurrencies: ['ETB', 'USD'],
    
    // Security Settings
    encryption: {
      algorithm: 'aes-256-gcm',
      key: process.env.PAYMENT_ENCRYPTION_KEY,
      ivLength: 16
    },
    
    // Performance Settings
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000,
    maxConcurrentRequests: 50,
    
    // Compliance
    pciCompliant: true,
    dataRetentionDays: 365,
    auditLogging: true
  },

  // Ethiopian Payment Gateways Configuration
  gateways: {
    // Chapa Payment Gateway
    chapa: {
      enabled: process.env.CHAPA_ENABLED === 'true',
      name: 'Chapa',
      baseUrl: process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1',
      publicKey: process.env.CHAPA_PUBLIC_KEY,
      secretKey: process.env.CHAPA_SECRET_KEY,
      
      endpoints: {
        initialize: '/transaction/initialize',
        verify: '/transaction/verify/{transaction_ref}',
        transfer: '/transfer',
        banks: '/banks'
      },
      
      // Transaction Limits (ETB)
      limits: {
        minAmount: 1,
        maxAmount: 100000,
        dailyLimit: 500000,
        monthlyLimit: 5000000
      },
      
      // Fees & Commission
      fees: {
        percentage: 0.015, // 1.5%
        fixedFee: 0,
        chargeCustomer: true
      },
      
      // Webhook Configuration
      webhook: {
        enabled: true,
        secret: process.env.CHAPA_WEBHOOK_SECRET,
        events: ['charge.success', 'charge.failure', 'transfer.success']
      },
      
      // Supported Payment Methods
      supportedMethods: ['card', 'mobile_money', 'bank_transfer'],
      
      // Mobile Money Providers
      mobileMoney: {
        ethio_telecom: {
          name: 'TeleBirr',
          supported: true,
          minAmount: 1,
          maxAmount: 50000
        },
        m_pesa: {
          name: 'M-Pesa',
          supported: false
        }
      }
    },

    // TeleBirr Payment Gateway
    telebirr: {
      enabled: process.env.TELEBIRR_ENABLED === 'true',
      name: 'TeleBirr',
      baseUrl: process.env.TELEBIRR_BASE_URL || 'https://api.telebirr.et/v1',
      appId: process.env.TELEBIRR_APP_ID,
      appKey: process.env.TELEBIRR_APP_KEY,
      publicKey: process.env.TELEBIRR_PUBLIC_KEY,
      
      endpoints: {
        payment: '/payment',
        query: '/payment/query',
        refund: '/payment/refund'
      },
      
      // Transaction Limits (ETB)
      limits: {
        minAmount: 1,
        maxAmount: 50000,
        dailyLimit: 100000,
        monthlyLimit: 1000000
      },
      
      // Fees & Commission
      fees: {
        percentage: 0.01, // 1%
        fixedFee: 0,
        chargeCustomer: false // Fee absorbed by merchant
      },
      
      // USSD Configuration
      ussd: {
        enabled: true,
        code: '*809*',
        steps: 3
      },
      
      // Security
      security: {
        encryptionType: 'RSA',
        keyLength: 2048,
        signatureRequired: true
      }
    },

    // CBE Birr Payment Gateway
    cbeBirr: {
      enabled: process.env.CBE_BIRR_ENABLED === 'true',
      name: 'CBE Birr',
      baseUrl: process.env.CBE_BIRR_BASE_URL || 'https://api.cbe-birr.et/v1',
      merchantId: process.env.CBE_BIRR_MERCHANT_ID,
      apiKey: process.env.CBE_BIRR_API_KEY,
      secretKey: process.env.CBE_BIRR_SECRET_KEY,
      
      endpoints: {
        payment: '/merchant/payment',
        status: '/merchant/payment/status',
        refund: '/merchant/refund',
        balance: '/merchant/balance'
      },
      
      // Transaction Limits (ETB)
      limits: {
        minAmount: 1,
        maxAmount: 100000,
        dailyLimit: 1000000,
        monthlyLimit: 10000000
      },
      
      // Fees & Commission
      fees: {
        percentage: 0.012, // 1.2%
        fixedFee: 0,
        chargeCustomer: true
      },
      
      // Bank Integration
      bankIntegration: {
        supported: true,
        instantTransfer: true,
        accountLinking: true
      },
      
      // Business Features
      business: {
        bulkPayments: true,
        scheduledPayments: true,
        invoiceManagement: true
      }
    }
  },

  // Payment Methods Configuration
  paymentMethods: {
    'mobile_money': {
      name: 'Mobile Money',
      enabled: true,
      priority: 1,
      gateways: ['chapa', 'telebirr'],
      countries: ['ET'],
      currencies: ['ETB'],
      processingTime: 'instant',
      userFriendly: true
    },
    
    'bank_transfer': {
      name: 'Bank Transfer',
      enabled: true,
      priority: 2,
      gateways: ['chapa', 'cbeBirr'],
      countries: ['ET'],
      currencies: ['ETB', 'USD'],
      processingTime: '1-2 business days',
      userFriendly: false
    },
    
    'card': {
      name: 'Credit/Debit Card',
      enabled: true,
      priority: 3,
      gateways: ['chapa'],
      countries: ['ET', 'US', 'EU'],
      currencies: ['ETB', 'USD', 'EUR'],
      processingTime: 'instant',
      userFriendly: true
    },
    
    'wallet': {
      name: 'Yachi Wallet',
      enabled: process.env.WALLET_ENABLED === 'true',
      priority: 4,
      gateways: [],
      countries: ['ET'],
      currencies: ['ETB'],
      processingTime: 'instant',
      userFriendly: true
    }
  },

  // Transaction Configuration
  transactions: {
    // Status Flow
    statusFlow: {
      'pending': ['processing', 'cancelled', 'failed'],
      'processing': ['completed', 'failed', 'cancelled'],
      'completed': ['refunded'],
      'failed': ['pending'], // Can retry
      'cancelled': [], // Final state
      'refunded': [] // Final state
    },

    // Timeout Settings
    timeouts: {
      pending: 3600000, // 1 hour
      processing: 900000, // 15 minutes
      autoCancel: 86400000 // 24 hours
    },

    // Retry Configuration
    retry: {
      enabled: true,
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 5000
    },

    // Security Settings
    security: {
      maxAmountPerTransaction: 100000, // ETB
      maxTransactionsPerDay: 10,
      maxAmountPerDay: 500000, // ETB
      suspiciousAmount: 50000, // ETB
      requireVerification: true
    }
  },

  // Fee Structure & Commission
  fees: {
    // Platform Commission
    commission: {
      serviceProvider: 0.00, // 0% - Yachi's zero commission model
      client: 0.00,
      platform: 0.00
    },

    // Payment Gateway Fees
    gatewayFees: {
      chapa: {
        percentage: 0.015,
        fixed: 0,
        absorbedBy: 'client' // client, provider, platform
      },
      telebirr: {
        percentage: 0.01,
        fixed: 0,
        absorbedBy: 'platform'
      },
      cbeBirr: {
        percentage: 0.012,
        fixed: 0,
        absorbedBy: 'client'
      }
    },

    // Additional Fees
    additional: {
      instantTransfer: 0.005, // 0.5% for instant transfers
      international: 0.02, // 2% for international transactions
      currencyConversion: 0.015 // 1.5% for currency conversion
    }
  },

  // Refund & Dispute Configuration
  refunds: {
    enabled: true,
    
    // Refund Policies
    policies: {
      serviceProvider: {
        autoApprove: true,
        timeLimit: 7, // days
        feeRefund: 0.00 // percentage
      },
      platform: {
        adminApproval: true,
        timeLimit: 30, // days
        investigationRequired: true
      }
    },

    // Dispute Resolution
    disputes: {
      enabled: true,
      resolutionTime: 14, // days
      escalationLevels: ['customer_service', 'supervisor', 'management'],
      evidenceRequired: true
    }
  },

  // Payout Configuration
  payouts: {
    enabled: true,
    
    // Payout Methods
    methods: {
      'bank_transfer': {
        enabled: true,
        processingTime: '2-3 business days',
        minAmount: 100, // ETB
        maxAmount: 100000, // ETB
        fee: 0.00
      },
      'mobile_money': {
        enabled: true,
        processingTime: 'instant',
        minAmount: 1, // ETB
        maxAmount: 50000, // ETB
        fee: 0.00
      },
      'yachi_wallet': {
        enabled: process.env.WALLET_ENABLED === 'true',
        processingTime: 'instant',
        minAmount: 1, // ETB
        maxAmount: 100000, // ETB
        fee: 0.00
      }
    },

    // Payout Schedule
    schedule: {
      automatic: true,
      frequency: 'daily', // daily, weekly, monthly
      time: '18:00', // Local time (Ethiopia)
      minBalance: 100 // ETB
    },

    // Tax Configuration (Ethiopia)
    tax: {
      enabled: true,
      percentage: 0.00, // 0% for small businesses (adjust based on regulations)
      threshold: 1000000, // ETB annual threshold
      automaticDeduction: true
    }
  },

  // Security & Compliance
  security: {
    // PCI DSS Compliance
    pci: {
      enabled: true,
      level: 'SAQ A',
      scanning: true,
      encryption: true
    },

    // Fraud Detection
    fraud: {
      enabled: true,
      rules: {
        velocityCheck: true,
        amountMonitoring: true,
        ipMonitoring: true,
        deviceFingerprinting: true
      },
      thresholds: {
        maxTransactionsPerHour: 5,
        maxAmountPerHour: 50000,
        suspiciousCountries: [] // Empty for Ethiopia-only
      }
    },

    // Data Protection
    dataProtection: {
      encryption: true,
      tokenization: true,
      dataRetention: 365, // days
      rightToErasure: true
    }
  },

  // Webhook Configuration
  webhooks: {
    enabled: true,
    
    // Events to trigger webhooks
    events: [
      'payment.completed',
      'payment.failed',
      'payment.refunded',
      'payout.processed',
      'dispute.created',
      'chargeback.initiated'
    ],

    // Retry Configuration
    retry: {
      enabled: true,
      maxAttempts: 5,
      backoffStrategy: 'exponential',
      initialDelay: 1000
    },

    // Security
    security: {
      signatureVerification: true,
      ipWhitelisting: true,
      secretValidation: true
    }
  },

  // Analytics & Reporting
  analytics: {
    enabled: true,
    
    // Metrics to Track
    metrics: [
      'transaction_volume',
      'success_rate',
      'average_transaction_value',
      'gateway_performance',
      'refund_rate',
      'customer_satisfaction'
    ],

    // Reporting
    reporting: {
      daily: true,
      weekly: true,
      monthly: true,
      realTime: true
    }
  },

  // Ethiopian Market Specific Configuration
  ethiopia: {
    // Regional Settings
    regions: {
      'addis-ababa': {
        paymentMethods: ['mobile_money', 'bank_transfer', 'card'],
        preferredGateway: 'telebirr',
        successRate: 0.95
      },
      'oromia': {
        paymentMethods: ['mobile_money', 'bank_transfer'],
        preferredGateway: 'telebirr',
        successRate: 0.92
      },
      'amhara': {
        paymentMethods: ['mobile_money', 'bank_transfer'],
        preferredGateway: 'cbeBirr',
        successRate: 0.90
      },
      'other': {
        paymentMethods: ['mobile_money'],
        preferredGateway: 'telebirr',
        successRate: 0.85
      }
    },

    // Local Regulations
    regulations: {
      centralBank: 'National Bank of Ethiopia',
      licensing: 'Payment System Operator License',
      compliance: 'NBE Directives 2023',
      taxRequirements: true
    },

    // Market Considerations
    market: {
      mobilePenetration: 0.75,
      bankingPenetration: 0.35,
      digitalPaymentAdoption: 0.25,
      preferredCurrency: 'ETB'
    }
  }
};

// Payment Utility Functions
const paymentUtils = {
  // Calculate total amount with fees
  calculateTotalAmount: (baseAmount, paymentMethod, gateway, currency = 'ETB') => {
    const methodConfig = config.paymentMethods[paymentMethod];
    const gatewayConfig = config.gateways[gateway];
    
    if (!methodConfig || !gatewayConfig) {
      throw new Error('Invalid payment method or gateway');
    }

    const gatewayFee = baseAmount * gatewayConfig.fees.percentage + gatewayConfig.fees.fixedFee;
    
    let totalAmount = baseAmount;
    
    // Apply fees based on who absorbs them
    if (gatewayConfig.fees.absorbedBy === 'client') {
      totalAmount += gatewayFee;
    }
    
    // Add currency conversion fee if applicable
    if (currency !== 'ETB') {
      const conversionFee = baseAmount * config.fees.additional.currencyConversion;
      totalAmount += conversionFee;
    }

    return {
      baseAmount,
      gatewayFee,
      totalAmount: Math.ceil(totalAmount),
      currency,
      feeBreakdown: {
        gateway: gatewayFee,
        currencyConversion: currency !== 'ETB' ? baseAmount * config.fees.additional.currencyConversion : 0
      }
    };
  },

  // Validate transaction amount
  validateTransactionAmount: (amount, paymentMethod, gateway, currency = 'ETB') => {
    const gatewayConfig = config.gateways[gateway];
    const methodConfig = config.paymentMethods[paymentMethod];
    
    if (!gatewayConfig || !methodConfig) {
      return { valid: false, error: 'Invalid gateway or payment method' };
    }

    const limits = gatewayConfig.limits;
    
    if (amount < limits.minAmount) {
      return { valid: false, error: `Amount below minimum: ${limits.minAmount} ${currency}` };
    }

    if (amount > limits.maxAmount) {
      return { valid: false, error: `Amount above maximum: ${limits.maxAmount} ${currency}` };
    }

    return { valid: true };
  },

  // Get optimal payment gateway for user
  getOptimalGateway: (amount, paymentMethod, userRegion = 'addis-ababa', currency = 'ETB') => {
    const regionConfig = config.ethiopia.regions[userRegion] || config.ethiopia.regions.other;
    const availableGateways = regionConfig.paymentMethods.includes(paymentMethod) 
      ? config.paymentMethods[paymentMethod].gateways 
      : [];

    const enabledGateways = availableGateways.filter(gateway => 
      config.gateways[gateway]?.enabled
    );

    if (enabledGateways.length === 0) {
      throw new Error(`No enabled gateways for ${paymentMethod} in ${userRegion}`);
    }

    // Sort by success rate and fees
    const scoredGateways = enabledGateways.map(gateway => {
      const gatewayConfig = config.gateways[gateway];
      const regionSuccessRate = config.ethiopia.regions[userRegion]?.successRate || 0.85;
      const fee = amount * gatewayConfig.fees.percentage;
      
      return {
        gateway,
        score: regionSuccessRate * 0.7 - (fee / amount) * 0.3,
        fee,
        successRate: regionSuccessRate
      };
    });

    return scoredGateways.sort((a, b) => b.score - a.score)[0].gateway;
  },

  // Generate transaction reference
  generateTransactionRef: (prefix = 'YACHI') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  },

  // Validate webhook signature
  validateWebhookSignature: (payload, signature, gateway) => {
    const gatewayConfig = config.gateways[gateway];
    if (!gatewayConfig?.webhook?.secret) {
      throw new Error(`Webhook secret not configured for ${gateway}`);
    }

    // Implementation would use HMAC validation
    // This is a placeholder for actual signature validation
    const expectedSignature = `expected_signature_based_on_${gatewayConfig.webhook.secret}`;
    return signature === expectedSignature;
  }
};

// Export configuration and utilities
module.exports = {
  ...config,
  ...paymentUtils,
  
  // Configuration validation
  validateConfig: () => {
    const errors = [];

    if (!process.env.PAYMENT_SYSTEM_ENABLED) {
      errors.push('PAYMENT_SYSTEM_ENABLED environment variable is required');
    }

    // Validate gateway configurations
    Object.entries(config.gateways).forEach(([gateway, gatewayConfig]) => {
      if (gatewayConfig.enabled) {
        if (!gatewayConfig.secretKey && !gatewayConfig.appKey) {
          errors.push(`${gateway} secret key or app key is required`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
};