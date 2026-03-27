// types/payment.js
/**
 * Enterprise Payment Types for Yachi Platform
 * Comprehensive type definitions for Ethiopian payment ecosystem
 * Version: 2.0.0
 */

// ===== PAYMENT CORE TYPES =====

/**
 * @typedef {Object} PaymentAmount
 * @property {number} amount - Amount in ETB cents
 * @property {string} currency - Currency code (ETB)
 * @property {number} exchangeRate - Exchange rate if different currency
 * @property {number} serviceFee - Platform service fee in cents
 * @property {number} taxAmount - Tax amount in cents
 * @property {number} totalAmount - Total amount in cents
 */

/**
 * @typedef {Object} PaymentCustomer
 * @property {string} id - Customer unique identifier
 * @property {string} email - Customer email
 * @property {string} phone - Customer phone number
 * @property {string} firstName - Customer first name
 * @property {string} lastName - Customer last name
 * @property {string} [userId] - Yachi user ID
 */

/**
 * @typedef {Object} PaymentItem
 * @property {string} id - Item unique identifier
 * @property {string} name - Item name
 * @property {string} description - Item description
 * @property {number} quantity - Item quantity
 * @property {number} unitPrice - Unit price in cents
 * @property {number} totalPrice - Total price in cents
 * @property {string} [serviceId] - Related service ID
 * @property {string} [bookingId] - Related booking ID
 * @property {string} [projectId] - Related project ID
 */

// ===== PAYMENT PROVIDER TYPES =====

/**
 * @typedef {'CHAPA' | 'TELEBIRR' | 'CBE_BIRR'} PaymentProvider
 */

/**
 * @typedef {Object} ChapaPaymentDetails
 * @property {string} transactionId - Chapa transaction ID
 * @property {string} reference - Chapa reference number
 * @property {string} checkoutUrl - Chapa checkout URL
 * @property {string} [returnUrl] - Return URL after payment
 * @property {string} [callbackUrl] - Webhook callback URL
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} TelebirrPaymentDetails
 * @property {string} transactionId - Telebirr transaction ID
 * @property {string} ussdCode - USSD code for payment
 * @property {string} merchantCode - Telebirr merchant code
 * @property {string} [appId] - Telebirr app ID
 * @property {string} [shortCode] - Telebirr short code
 * @property {Object} [encryptedData] - Encrypted payment data
 */

/**
 * @typedef {Object} CbeBirrPaymentDetails
 * @property {string} transactionId - CBE Birr transaction ID
 * @property {string} accountNumber - Customer account number
 * @property {string} merchantId - CBE Birr merchant ID
 * @property {string} [bankCode] - Bank code
 * @property {string} [branchCode] - Branch code
 * @property {Object} [bankDetails] - Additional bank details
 */

/**
 * @typedef {Object} PaymentMethodDetails
 * @property {PaymentProvider} provider - Payment provider
 * @property {ChapaPaymentDetails | TelebirrPaymentDetails | CbeBirrPaymentDetails} details - Provider-specific details
 * @property {string} [token] - Payment method token
 * @property {string} [lastFour] - Last four digits (if card)
 * @property {string} [expiryMonth] - Expiry month
 * @property {string} [expiryYear] - Expiry year
 */

// ===== PAYMENT TRANSACTION TYPES =====

/**
 * @typedef {'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'} PaymentStatus
 */

/**
 * @typedef {'SERVICE_BOOKING' | 'CONSTRUCTION_PROJECT' | 'PREMIUM_SUBSCRIPTION' | 'GOVERNMENT_PROJECT' | 'WITHDRAWAL' | 'REFUND'} PaymentType
 */

/**
 * @typedef {Object} PaymentTransaction
 * @property {string} id - Transaction unique identifier
 * @property {string} reference - Public reference number
 * @property {PaymentAmount} amount - Payment amount details
 * @property {PaymentStatus} status - Transaction status
 * @property {PaymentType} type - Transaction type
 * @property {PaymentProvider} provider - Payment provider
 * @property {string} customerId - Customer ID
 * @property {string} [serviceProviderId] - Service provider ID
 * @property {string} [bookingId] - Related booking ID
 * @property {string} [projectId] - Related project ID
 * @property {PaymentItem[]} items - Payment items
 * @property {PaymentMethodDetails} paymentMethod - Payment method details
 * @property {string} [description] - Transaction description
 * @property {Object} [metadata] - Additional metadata
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {Date} [completedAt] - Completion timestamp
 * @property {Date} [failedAt] - Failure timestamp
 * @property {string} [failureReason] - Failure reason
 */

/**
 * @typedef {Object} PaymentInitiationRequest
 * @property {PaymentAmount} amount - Payment amount
 * @property {PaymentCustomer} customer - Customer details
 * @property {PaymentItem[]} items - Payment items
 * @property {PaymentType} type - Payment type
 * @property {PaymentProvider} provider - Preferred payment provider
 * @property {string} [returnUrl] - Return URL
 * @property {string} [callbackUrl] - Callback URL
 * @property {Object} [metadata] - Additional metadata
 * @property {string} [bookingId] - Related booking ID
 * @property {string} [projectId] - Related project ID
 * @property {string} [serviceId] - Related service ID
 */

/**
 * @typedef {Object} PaymentInitiationResponse
 * @property {string} transactionId - Transaction ID
 * @property {string} reference - Public reference
 * @property {PaymentStatus} status - Initial status
 * @property {string} [checkoutUrl] - Checkout URL (if applicable)
 * @property {string} [ussdCode] - USSD code (if applicable)
 * @property {string} [qrCode] - QR code data (if applicable)
 * @property {PaymentMethodDetails} paymentMethod - Payment method details
 * @property {Date} expiresAt - Payment expiration time
 */

// ===== REFUND TYPES =====

/**
 * @typedef {'FULL' | 'PARTIAL'} RefundType
 */

/**
 * @typedef {'CUSTOMER_REQUEST' | 'SERVICE_CANCELLED' | 'PROVIDER_ISSUE' | 'PLATFORM_ERROR' | 'DUPLICATE_PAYMENT'} RefundReason
 */

/**
 * @typedef {Object} RefundRequest
 * @property {string} transactionId - Original transaction ID
 * @property {number} amount - Refund amount in cents
 * @property {RefundType} type - Refund type
 * @property {RefundReason} reason - Refund reason
 * @property {string} description - Refund description
 * @property {string} [initiatedBy] - User ID who initiated refund
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} RefundTransaction
 * @property {string} id - Refund unique identifier
 * @property {string} originalTransactionId - Original transaction ID
 * @property {string} reference - Refund reference number
 * @property {number} amount - Refund amount in cents
 * @property {RefundType} type - Refund type
 * @property {RefundReason} reason - Refund reason
 * @property {PaymentStatus} status - Refund status
 * @property {string} [failureReason] - Failure reason
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} [processedAt] - Processing timestamp
 * @property {Date} [completedAt] - Completion timestamp
 */

// ===== SUBSCRIPTION TYPES =====

/**
 * @typedef {'PREMIUM_BADGE' | 'FEATURED_LISTING' | 'GOVERNMENT_PLAN' | 'ENTERPRISE_PLAN'} SubscriptionPlan
 */

/**
 * @typedef {'MONTHLY' | 'QUARTERLY' | 'YEARLY'} BillingCycle
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id - Subscription unique identifier
 * @property {string} userId - User ID
 * @property {SubscriptionPlan} plan - Subscription plan
 * @property {BillingCycle} billingCycle - Billing cycle
 * @property {PaymentAmount} amount - Subscription amount
 * @property {PaymentStatus} status - Subscription status
 * @property {Date} startDate - Subscription start date
 * @property {Date} endDate - Subscription end date
 * @property {Date} [cancelledAt] - Cancellation date
 * @property {string} [cancellationReason] - Cancellation reason
 * @property {boolean} autoRenew - Auto-renewal status
 * @property {PaymentTransaction[]} payments - Subscription payments
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

// ===== WITHDRAWAL TYPES =====

/**
 * @typedef {'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CBE_BIRR' | 'TELEBIRR'} WithdrawalMethod
 */

/**
 * @typedef {'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'} WithdrawalStatus
 */

/**
 * @typedef {Object} WithdrawalRequest
 * @property {string} id - Withdrawal unique identifier
 * @property {string} serviceProviderId - Service provider ID
 * @property {number} amount - Withdrawal amount in cents
 * @property {WithdrawalMethod} method - Withdrawal method
 * @property {WithdrawalStatus} status - Withdrawal status
 * @property {Object} destination - Destination details
 * @property {string} [bankAccountNumber] - Bank account number
 * @property {string} [bankName] - Bank name
 * @property {string} [mobileNumber] - Mobile money number
 * @property {string} [transactionId] - Provider transaction ID
 * @property {string} [failureReason] - Failure reason
 * @property {Date} requestedAt - Request timestamp
 * @property {Date} [processedAt] - Processing timestamp
 * @property {Date} [completedAt] - Completion timestamp
 */

// ===== PAYMENT WEBHOOK TYPES =====

/**
 * @typedef {Object} PaymentWebhook
 * @property {string} id - Webhook unique identifier
 * @property {PaymentProvider} provider - Payment provider
 * @property {string} eventType - Webhook event type
 * @property {Object} payload - Webhook payload
 * @property {Object} headers - Webhook headers
 * @property {string} signature - Webhook signature
 * @property {boolean} verified - Verification status
 * @property {Date} receivedAt - Receipt timestamp
 * @property {Date} [processedAt] - Processing timestamp
 */

/**
 * @typedef {Object} WebhookEvent
 * @property {string} transactionId - Transaction ID
 * @property {string} reference - Reference number
 * @property {PaymentStatus} status - Updated status
 * @property {number} amount - Transaction amount
 * @property {string} currency - Currency code
 * @property {Date} timestamp - Event timestamp
 * @property {Object} [metadata] - Additional metadata
 */

// ===== PAYMENT ANALYTICS TYPES =====

/**
 * @typedef {Object} PaymentMetrics
 * @property {number} totalRevenue - Total revenue in cents
 * @property {number} totalTransactions - Total transaction count
 * @property {number} successRate - Success rate percentage
 * @property {number} averageTransactionValue - Average transaction value
 * @property {Object} revenueByProvider - Revenue by payment provider
 * @property {Object} revenueByType - Revenue by payment type
 * @property {Object} transactionsByStatus - Transactions by status
 * @property {Date} periodStart - Analytics period start
 * @property {Date} periodEnd - Analytics period end
 */

/**
 * @typedef {Object} ProviderPerformance
 * @property {PaymentProvider} provider - Payment provider
 * @property {number} successRate - Success rate percentage
 * @property {number} averageProcessingTime - Average processing time in ms
 * @property {number} totalVolume - Total volume in cents
 * @property {number} transactionCount - Transaction count
 * @property {number} failureCount - Failure count
 */

// ===== PAYMENT SECURITY TYPES =====

/**
 * @typedef {Object} PaymentSecurity
 * @property {string} publicKey - Public key for encryption
 * @property {string} secretKey - Secret key for signing
 * @property {string} [webhookSecret] - Webhook secret
 * @property {string} [encryptionKey] - Encryption key
 * @property {Date} keyExpiresAt - Key expiration timestamp
 */

/**
 * @typedef {Object} FraudDetection
 * @property {string} id - Detection unique identifier
 * @property {string} transactionId - Related transaction ID
 * @property {'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} riskLevel - Risk level
 * @property {string[]} riskFactors - Identified risk factors
 * @property {string} action - Action taken
 * @property {string} [reviewedBy] - Reviewer user ID
 * @property {Date} [reviewedAt] - Review timestamp
 * @property {Date} detectedAt - Detection timestamp
 */

// ===== PAYMENT CONFIGURATION TYPES =====

/**
 * @typedef {Object} PaymentProviderConfig
 * @property {PaymentProvider} provider - Payment provider
 * @property {boolean} enabled - Provider enabled status
 * @property {Object} credentials - Provider credentials
 * @property {Object} settings - Provider settings
 * @property {number} [priority] - Provider priority
 * @property {string[]} [supportedCurrencies] - Supported currencies
 * @property {number} [minAmount] - Minimum amount in cents
 * @property {number} [maxAmount] - Maximum amount in cents
 */

/**
 * @typedef {Object} PaymentGatewayConfig
 * @property {PaymentProviderConfig[]} providers - Available providers
 * @property {string} defaultCurrency - Default currency
 * @property {number} defaultServiceFee - Default service fee percentage
 * @property {number} defaultTaxRate - Default tax rate percentage
 * @property {Object} webhookConfig - Webhook configuration
 * @property {Object} securityConfig - Security configuration
 * @property {Object} fraudConfig - Fraud detection configuration
 */

// ===== PAYMENT ERROR TYPES =====

/**
 * @typedef {Object} PaymentError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {PaymentProvider} [provider] - Related provider
 * @property {string} [transactionId] - Related transaction ID
 * @property {string} [details] - Error details
 * @property {Date} timestamp - Error timestamp
 */

/**
 * @typedef {'VALIDATION_ERROR' | 'PROVIDER_ERROR' | 'NETWORK_ERROR' | 'SECURITY_ERROR' | 'FRAUD_DETECTED' | 'INSUFFICIENT_FUNDS' | 'TIMEOUT'} PaymentErrorCode
 */

// ===== EXPORT TYPES =====

export {
  // Core Types
  PaymentAmount,
  PaymentCustomer,
  PaymentItem,
  
  // Provider Types
  PaymentProvider,
  ChapaPaymentDetails,
  TelebirrPaymentDetails,
  CbeBirrPaymentDetails,
  PaymentMethodDetails,
  
  // Transaction Types
  PaymentStatus,
  PaymentType,
  PaymentTransaction,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  
  // Refund Types
  RefundType,
  RefundReason,
  RefundRequest,
  RefundTransaction,
  
  // Subscription Types
  SubscriptionPlan,
  BillingCycle,
  Subscription,
  
  // Withdrawal Types
  WithdrawalMethod,
  WithdrawalStatus,
  WithdrawalRequest,
  
  // Webhook Types
  PaymentWebhook,
  WebhookEvent,
  
  // Analytics Types
  PaymentMetrics,
  ProviderPerformance,
  
  // Security Types
  PaymentSecurity,
  FraudDetection,
  
  // Configuration Types
  PaymentProviderConfig,
  PaymentGatewayConfig,
  
  // Error Types
  PaymentError,
  PaymentErrorCode,
};

// ===== TYPE GUARDS =====

/**
 * Type guard for PaymentTransaction
 * @param {any} transaction 
 * @returns {transaction is PaymentTransaction}
 */
export const isPaymentTransaction = (transaction) => {
  return (
    transaction &&
    typeof transaction.id === 'string' &&
    typeof transaction.reference === 'string' &&
    transaction.amount &&
    typeof transaction.amount.amount === 'number' &&
    Array.isArray(transaction.items) &&
    transaction.paymentMethod &&
    transaction.createdAt instanceof Date
  );
};

/**
 * Type guard for PaymentInitiationRequest
 * @param {any} request 
 * @returns {request is PaymentInitiationRequest}
 */
export const isPaymentInitiationRequest = (request) => {
  return (
    request &&
    request.amount &&
    typeof request.amount.amount === 'number' &&
    request.customer &&
    typeof request.customer.email === 'string' &&
    Array.isArray(request.items) &&
    request.provider
  );
};

/**
 * Type guard for RefundRequest
 * @param {any} request 
 * @returns {request is RefundRequest}
 */
export const isRefundRequest = (request) => {
  return (
    request &&
    typeof request.transactionId === 'string' &&
    typeof request.amount === 'number' &&
    request.reason
  );
};

// ===== PAYMENT CONSTANTS =====

export const PAYMENT_CONSTANTS = {
  // Status Constants
  STATUS: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
    PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  },
  
  // Type Constants
  TYPE: {
    SERVICE_BOOKING: 'SERVICE_BOOKING',
    CONSTRUCTION_PROJECT: 'CONSTRUCTION_PROJECT',
    PREMIUM_SUBSCRIPTION: 'PREMIUM_SUBSCRIPTION',
    GOVERNMENT_PROJECT: 'GOVERNMENT_PROJECT',
    WITHDRAWAL: 'WITHDRAWAL',
    REFUND: 'REFUND',
  },
  
  // Provider Constants
  PROVIDER: {
    CHAPA: 'CHAPA',
    TELEBIRR: 'TELEBIRR',
    CBE_BIRR: 'CBE_BIRR'
  },
  
  // Currency Constants
  CURRENCY: {
    ETB: 'ETB',
    USD: 'USD',
    EUR: 'EUR',
  },
  
  // Refund Constants
  REFUND_TYPE: {
    FULL: 'FULL',
    PARTIAL: 'PARTIAL',
  },
  
  REFUND_REASON: {
    CUSTOMER_REQUEST: 'CUSTOMER_REQUEST',
    SERVICE_CANCELLED: 'SERVICE_CANCELLED',
    PROVIDER_ISSUE: 'PROVIDER_ISSUE',
    PLATFORM_ERROR: 'PLATFORM_ERROR',
    DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',
  },
  
  // Withdrawal Constants
  WITHDRAWAL_METHOD: {
    BANK_TRANSFER: 'BANK_TRANSFER',
    MOBILE_MONEY: 'MOBILE_MONEY',
    CBE_BIRR: 'CBE_BIRR',
    TELEBIRR: 'TELEBIRR',
  },
  
  WITHDRAWAL_STATUS: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
  },
  
  // Subscription Constants
  SUBSCRIPTION_PLAN: {
    PREMIUM_BADGE: 'PREMIUM_BADGE',
    FEATURED_LISTING: 'FEATURED_LISTING',
    GOVERNMENT_PLAN: 'GOVERNMENT_PLAN',
    ENTERPRISE_PLAN: 'ENTERPRISE_PLAN',
  },
  
  BILLING_CYCLE: {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YEARLY: 'YEARLY',
  },
  
  // Error Constants
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SECURITY_ERROR: 'SECURITY_ERROR',
    FRAUD_DETECTED: 'FRAUD_DETECTED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    TIMEOUT: 'TIMEOUT',
  },
};

// ===== PAYMENT UTILITIES =====

/**
 * Format amount for display
 * @param {number} amount - Amount in cents
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount
 */
export const formatPaymentAmount = (amount, currency = 'ETB') => {
  const majorUnits = amount / 100;
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(majorUnits);
};

/**
 * Validate payment amount
 * @param {number} amount - Amount in cents
 * @param {PaymentProvider} provider - Payment provider
 * @returns {boolean} Validation result
 */
export const validatePaymentAmount = (amount, provider) => {
  const minAmounts = {
    CHAPA: 100, // 1 ETB
    TELEBIRR: 100, // 1 ETB
    CBE_BIRR: 100 // 1 ETB
  };

  const maxAmounts = {
    CHAPA: 10000000, // 100,000 ETB
    TELEBIRR: 5000000, // 50,000 ETB
    CBE_BIRR: 10000000 // 100,000 ETB
  };
  
  const minAmount = minAmounts[provider] || 100;
  const maxAmount = maxAmounts[provider] || 10000000;
  
  return amount >= minAmount && amount <= maxAmount;
};

/**
 * Generate payment reference
 * @param {PaymentType} type - Payment type
 * @returns {string} Payment reference
 */
export const generatePaymentReference = (type) => {
  const prefix = {
    SERVICE_BOOKING: 'BOOK',
    CONSTRUCTION_PROJECT: 'PROJ',
    PREMIUM_SUBSCRIPTION: 'SUBS',
    GOVERNMENT_PROJECT: 'GOVT',
    WITHDRAWAL: 'WDWL',
    REFUND: 'RFND',
  }[type] || 'PAY';
  
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${prefix}-${timestamp}-${random}`;
};

export default PAYMENT_CONSTANTS;