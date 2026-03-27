// contexts/payment-context.js

/**
 * ENTERPRISE PAYMENT CONTEXT
 * Yachi Construction & Services Platform
 * Ethiopian Payment Integration with Advanced Financial Management
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { PaymentService } from '../services/payment-service';
import { EthiopianPaymentService } from '../services/payment-gateways/ethiopian-payment-service';
import { NotificationService } from '../services/notification-service';
import { AnalyticsService } from '../services/analytics-service';

// ==================== ENTERPRISE PAYMENT ACTION TYPES ====================
export const PAYMENT_ACTIONS = {
  // Transaction Management
  SET_TRANSACTIONS: 'SET_TRANSACTIONS',
  ADD_TRANSACTION: 'ADD_TRANSACTION',
  UPDATE_TRANSACTION: 'UPDATE_TRANSACTION',
  SET_TRANSACTION_LOADING: 'SET_TRANSACTION_LOADING',

  // Payment Methods & Wallets
  SET_PAYMENT_METHODS: 'SET_PAYMENT_METHODS',
  ADD_PAYMENT_METHOD: 'ADD_PAYMENT_METHOD',
  REMOVE_PAYMENT_METHOD: 'REMOVE_PAYMENT_METHOD',
  SET_DEFAULT_PAYMENT_METHOD: 'SET_DEFAULT_PAYMENT_METHOD',
  SET_METHODS_LOADING: 'SET_METHODS_LOADING',

  // Ethiopian Payment Providers
  SET_AVAILABLE_PROVIDERS: 'SET_AVAILABLE_PROVIDERS',
  SET_PROVIDER_LOADING: 'SET_PROVIDER_LOADING',

  // Payment Processing
  SET_PAYMENT_PROCESSING: 'SET_PAYMENT_PROCESSING',
  SET_PAYMENT_RESULT: 'SET_PAYMENT_RESULT',
  SET_PROCESSING_LOADING: 'SET_PROCESSING_LOADING',

  // Refunds & Disputes
  SET_REFUNDS: 'SET_REFUNDS',
  ADD_REFUND: 'ADD_REFUND',
  UPDATE_REFUND: 'UPDATE_REFUND',
  SET_REFUND_LOADING: 'SET_REFUND_LOADING',

  // Financial Analytics
  SET_FINANCIAL_ANALYTICS: 'SET_FINANCIAL_ANALYTICS',
  SET_ANALYTICS_LOADING: 'SET_ANALYTICS_LOADING',

  // Ethiopian Market Data
  SET_ETHIOPIAN_FINANCIAL_DATA: 'SET_ETHIOPIAN_FINANCIAL_DATA',
  SET_MARKET_RATES: 'SET_MARKET_RATES',

  // Error & Status Management
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_OPERATION_LOADING: 'SET_OPERATION_LOADING',
};

// ==================== ENTERPRISE INITIAL STATE ====================
const initialState = {
  // Transaction History
  transactions: new Map(),
  transactionPagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },

  // Payment Methods
  paymentMethods: [],
  defaultPaymentMethod: null,
  savedWallets: new Map(),

  // Ethiopian Payment Providers
  availableProviders: new Map(),
  providerStatus: new Map(),

  // Payment Processing
  currentPayment: null,
  paymentResult: null,
  processingStatus: 'idle',

  // Refunds & Disputes
  refunds: new Map(),
  disputes: new Map(),

  // Financial Analytics
  financialAnalytics: {
    totalRevenue: 0,
    monthlyRevenue: new Map(),
    paymentMethodDistribution: new Map(),
    providerPerformance: new Map(),
    refundRate: 0,
    averageTransaction: 0,
  },

  // Ethiopian Financial Data
  ethiopianFinancialData: {
    exchangeRates: new Map(),
    taxRates: {
      vat: 0.15,
      withholding: 0.02,
      incomeTax: new Map(),
    },
    regulatoryLimits: {
      maxSingleTransaction: 100000,
      maxDailyTransaction: 500000,
      maxMonthlyTransaction: 2000000,
    },
    bankingHolidays: [],
    marketRates: new Map(),
  },

  // Loading States
  loading: {
    transactions: false,
    methods: false,
    providers: false,
    processing: false,
    refunds: false,
    analytics: false,
    operations: new Set(),
  },

  // Error States
  error: null,
  lastOperation: null,
};

// ==================== ENTERPRISE PAYMENT REDUCER ====================
const paymentReducer = (state, action) => {
  switch (action.type) {
    // Transaction Management
    case PAYMENT_ACTIONS.SET_TRANSACTIONS:
      return {
        ...state,
        transactions: new Map(action.payload.transactions.map(t => [t.id, t])),
        transactionPagination: action.payload.pagination || state.transactionPagination,
        loading: { ...state.loading, transactions: false },
      };

    case PAYMENT_ACTIONS.ADD_TRANSACTION:
      return {
        ...state,
        transactions: new Map([...state.transactions, [action.payload.id, action.payload]]),
        transactionPagination: {
          ...state.transactionPagination,
          total: state.transactionPagination.total + 1,
        },
      };

    case PAYMENT_ACTIONS.UPDATE_TRANSACTION:
      return {
        ...state,
        transactions: new Map(
          [...state.transactions].map(([id, transaction]) =>
            id === action.payload.id ? [id, { ...transaction, ...action.payload }] : [id, transaction]
          )
        ),
      };

    case PAYMENT_ACTIONS.SET_TRANSACTION_LOADING:
      return {
        ...state,
        loading: { ...state.loading, transactions: action.payload },
      };

    // Payment Methods
    case PAYMENT_ACTIONS.SET_PAYMENT_METHODS:
      return {
        ...state,
        paymentMethods: action.payload,
        loading: { ...state.loading, methods: false },
      };

    case PAYMENT_ACTIONS.ADD_PAYMENT_METHOD:
      return {
        ...state,
        paymentMethods: [...state.paymentMethods, action.payload],
      };

    case PAYMENT_ACTIONS.REMOVE_PAYMENT_METHOD:
      return {
        ...state,
        paymentMethods: state.paymentMethods.filter(method => method.id !== action.payload),
        defaultPaymentMethod: state.defaultPaymentMethod === action.payload ? null : state.defaultPaymentMethod,
      };

    case PAYMENT_ACTIONS.SET_DEFAULT_PAYMENT_METHOD:
      return {
        ...state,
        defaultPaymentMethod: action.payload,
      };

    case PAYMENT_ACTIONS.SET_METHODS_LOADING:
      return {
        ...state,
        loading: { ...state.loading, methods: action.payload },
      };

    // Ethiopian Payment Providers
    case PAYMENT_ACTIONS.SET_AVAILABLE_PROVIDERS:
      return {
        ...state,
        availableProviders: new Map(action.payload),
        loading: { ...state.loading, providers: false },
      };

    case PAYMENT_ACTIONS.SET_PROVIDER_LOADING:
      return {
        ...state,
        loading: { ...state.loading, providers: action.payload },
      };

    // Payment Processing
    case PAYMENT_ACTIONS.SET_PAYMENT_PROCESSING:
      return {
        ...state,
        currentPayment: action.payload,
        processingStatus: 'processing',
      };

    case PAYMENT_ACTIONS.SET_PAYMENT_RESULT:
      return {
        ...state,
        paymentResult: action.payload,
        processingStatus: action.payload.status === 'completed' ? 'completed' : 'failed',
        currentPayment: null,
      };

    case PAYMENT_ACTIONS.SET_PROCESSING_LOADING:
      return {
        ...state,
        loading: { ...state.loading, processing: action.payload },
      };

    // Refunds & Disputes
    case PAYMENT_ACTIONS.SET_REFUNDS:
      return {
        ...state,
        refunds: new Map(action.payload.map(refund => [refund.id, refund])),
        loading: { ...state.loading, refunds: false },
      };

    case PAYMENT_ACTIONS.ADD_REFUND:
      return {
        ...state,
        refunds: new Map([...state.refunds, [action.payload.id, action.payload]]),
      };

    case PAYMENT_ACTIONS.UPDATE_REFUND:
      return {
        ...state,
        refunds: new Map(
          [...state.refunds].map(([id, refund]) =>
            id === action.payload.id ? [id, { ...refund, ...action.payload }] : [id, refund]
          )
        ),
      };

    case PAYMENT_ACTIONS.SET_REFUND_LOADING:
      return {
        ...state,
        loading: { ...state.loading, refunds: action.payload },
      };

    // Financial Analytics
    case PAYMENT_ACTIONS.SET_FINANCIAL_ANALYTICS:
      return {
        ...state,
        financialAnalytics: action.payload,
        loading: { ...state.loading, analytics: false },
      };

    case PAYMENT_ACTIONS.SET_ANALYTICS_LOADING:
      return {
        ...state,
        loading: { ...state.loading, analytics: action.payload },
      };

    // Ethiopian Market Data
    case PAYMENT_ACTIONS.SET_ETHIOPIAN_FINANCIAL_DATA:
      return {
        ...state,
        ethiopianFinancialData: {
          ...state.ethiopianFinancialData,
          ...action.payload,
        },
      };

    case PAYMENT_ACTIONS.SET_MARKET_RATES:
      return {
        ...state,
        ethiopianFinancialData: {
          ...state.ethiopianFinancialData,
          marketRates: new Map([...state.ethiopianFinancialData.marketRates, ...action.payload]),
        },
      };

    // Error & Loading Management
    case PAYMENT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        lastOperation: action.meta?.operation || state.lastOperation,
        loading: Object.keys(state.loading).reduce((acc, key) => ({
          ...acc,
          [key]: key === 'operations' ? new Set() : false,
        }), {}),
      };

    case PAYMENT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case PAYMENT_ACTIONS.SET_OPERATION_LOADING:
      const operations = new Set(state.loading.operations);
      if (action.payload.loading) {
        operations.add(action.payload.operation);
      } else {
        operations.delete(action.payload.operation);
      }
      return {
        ...state,
        loading: { ...state.loading, operations },
      };

    default:
      return state;
  }
};

// ==================== ENTERPRISE PAYMENT CONTEXT ====================
const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(paymentReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // ==================== EFFECTS & DATA LOADING ====================
  useEffect(() => {
    if (isAuthenticated && user) {
      initializePaymentData();
    }
  }, [isAuthenticated, user?.id]);

  const initializePaymentData = useCallback(async () => {
    try {
      await Promise.all([
        loadUserTransactions(),
        loadPaymentMethods(),
        loadAvailableProviders(),
        loadEthiopianFinancialData(),
        loadFinancialAnalytics(),
      ]);
    } catch (error) {
      dispatch({
        type: PAYMENT_ACTIONS.SET_ERROR,
        payload: `Payment initialization failed: ${error.message}`,
        meta: { operation: 'initialize' }
      });
    }
  }, [user?.id]);

  // ==================== ENTERPRISE PAYMENT ACTIONS ====================
  const actions = {
    // Transaction Management
    loadUserTransactions: async (page = 1, limit = 20, filters = {}) => {
      const operation = 'load_transactions';
      try {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
        dispatch({ type: PAYMENT_ACTIONS.SET_TRANSACTION_LOADING, payload: true });

        const response = await PaymentService.getUserTransactions(user.id, { page, limit, filters });
        
        dispatch({
          type: PAYMENT_ACTIONS.SET_TRANSACTIONS,
          payload: {
            transactions: response.transactions,
            pagination: response.pagination,
          },
        });

        AnalyticsService.track('transactions_loaded', {
          userId: user.id,
          transactionCount: response.transactions.length,
          page,
          filters,
        });

        return response.transactions;
      } catch (error) {
        dispatch({
          type: PAYMENT_ACTIONS.SET_ERROR,
          payload: `Failed to load transactions: ${error.message}`,
          meta: { operation }
        });
        throw error;
      } finally {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
      }
    },

    // Payment Processing
    initiatePayment: async (paymentData) => {
      const operation = 'initiate_payment';
      try {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
        dispatch({ type: PAYMENT_ACTIONS.SET_PROCESSING_LOADING, payload: true });

        // Validate Ethiopian payment constraints
        const validation = validateEthiopianPayment(paymentData, state.ethiopianFinancialData);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }

        // Enhance payment data with Ethiopian context
        const enhancedPaymentData = {
          ...paymentData,
          userId: user.id,
          currency: 'ETB',
          timestamp: new Date().toISOString(),
          ethiopianContext: {
            taxCalculation: calculateEthiopianTax(paymentData.amount, state.ethiopianFinancialData.taxRates),
            regulatoryCompliance: checkRegulatoryCompliance(paymentData, state.ethiopianFinancialData.regulatoryLimits),
            providerSpecific: getProviderSpecificData(paymentData.provider, paymentData.amount),
          },
        };

        dispatch({
          type: PAYMENT_ACTIONS.SET_PAYMENT_PROCESSING,
          payload: enhancedPaymentData,
        });

        // Process payment through Ethiopian gateway
        const paymentResult = await EthiopianPaymentService.processPayment(
          enhancedPaymentData.provider,
          enhancedPaymentData
        );

        dispatch({
          type: PAYMENT_ACTIONS.SET_PAYMENT_RESULT,
          payload: paymentResult,
        });

        // Add to transactions if successful
        if (paymentResult.status === 'completed') {
          dispatch({
            type: PAYMENT_ACTIONS.ADD_TRANSACTION,
            payload: paymentResult.transaction,
          });
        }

        // Send notification
        await NotificationService.sendPaymentNotification(user.id, {
          transactionId: paymentResult.transaction?.id,
          amount: paymentData.amount,
          status: paymentResult.status,
          provider: paymentData.provider,
        });

        AnalyticsService.track('payment_processed', {
          userId: user.id,
          transactionId: paymentResult.transaction?.id,
          amount: paymentData.amount,
          provider: paymentData.provider,
          status: paymentResult.status,
        });

        return paymentResult;
      } catch (error) {
        dispatch({
          type: PAYMENT_ACTIONS.SET_ERROR,
          payload: `Payment processing failed: ${error.message}`,
          meta: { operation }
        });
        throw error;
      } finally {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
      }
    },

    // Ethiopian Mobile Money Payment
    processMobileMoneyPayment: async (provider, paymentData) => {
      const operation = 'mobile_money_payment';
      try {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });

        const mobilePaymentData = {
          ...paymentData,
          provider,
          paymentType: 'mobile_money',
          ethiopianMobileConfig: {
            phoneNumber: validateEthiopianPhone(paymentData.phoneNumber),
            providerSpecific: getMobileProviderConfig(provider),
          },
        };

        const result = await EthiopianPaymentService.processMobilePayment(provider, mobilePaymentData);

        if (result.status === 'completed') {
          dispatch({
            type: PAYMENT_ACTIONS.ADD_TRANSACTION,
            payload: result.transaction,
          });
        }

        AnalyticsService.track('mobile_money_payment', {
          userId: user.id,
          provider,
          amount: paymentData.amount,
          status: result.status,
        });

        return result;
      } catch (error) {
        dispatch({
          type: PAYMENT_ACTIONS.SET_ERROR,
          payload: `Mobile money payment failed: ${error.message}`,
          meta: { operation }
        });
        throw error;
      } finally {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
      }
    },

    // Payment Methods Management
    loadPaymentMethods: async () => {
      const operation = 'load_payment_methods';
      try {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
        dispatch({ type: PAYMENT_ACTIONS.SET_METHODS_LOADING, payload: true });

        const methods = await PaymentService.getUserPaymentMethods(user.id);
        
        dispatch({
          type: PAYMENT_ACTIONS.SET_PAYMENT_METHODS,
          payload: methods,
        });

        // Set default method if available
        const defaultMethod = methods.find(method => method.isDefault);
        if (defaultMethod) {
          dispatch({
            type: PAYMENT_ACTIONS.SET_DEFAULT_PAYMENT_METHOD,
            payload: defaultMethod.id,
          });
        }

        return methods;
      } catch (error) {
        dispatch({
          type: PAYMENT_ACTIONS.SET_ERROR,
          payload: `Failed to load payment methods: ${error.message}`,
          meta: { operation }
        });
        throw error;
      } finally {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
      }
    },

    addPaymentMethod: async (methodData) => {
      const operation = 'add_payment_method';
      try {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });

        // Validate Ethiopian payment method
        const validation = validateEthiopianPaymentMethod(methodData);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }

        const newMethod = await PaymentService.addPaymentMethod(user.id, {
          ...methodData,
          ethiopianValidation: {
            verified: methodData.type === 'bank_account' ? await verifyBankAccount(methodData) : true,
            compliance: checkPaymentMethodCompliance(methodData),
          },
        });

        dispatch({
          type: PAYMENT_ACTIONS.ADD_PAYMENT_METHOD,
          payload: newMethod,
        });

        AnalyticsService.track('payment_method_added', {
          userId: user.id,
          methodType: newMethod.type,
          provider: newMethod.provider,
        });

        return newMethod;
      } catch (error) {
        dispatch({
          type: PAYMENT_ACTIONS.SET_ERROR,
          payload: `Failed to add payment method: ${error.message}`,
          meta: { operation }
        });
        throw error;
      } finally {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
      }
    },

    // Refund Management
    initiateRefund: async (transactionId, refundData) => {
      const operation = 'initiate_refund';
      try {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
        dispatch({ type: PAYMENT_ACTIONS.SET_REFUND_LOADING, payload: true });

        const refund = await PaymentService.initiateRefund(transactionId, {
          ...refundData,
          initiatedBy: user.id,
          ethiopianRefundContext: {
            taxReversal: calculateTaxReversal(transactionId, refundData.amount),
            regulatoryApproval: await checkRefundApproval(transactionId),
          },
        });

        dispatch({
          type: PAYMENT_ACTIONS.ADD_REFUND,
          payload: refund,
        });

        // Update original transaction
        dispatch({
          type: PAYMENT_ACTIONS.UPDATE_TRANSACTION,
          payload: {
            id: transactionId,
            refundStatus: 'pending',
            refundId: refund.id,
          },
        });

        AnalyticsService.track('refund_initiated', {
          userId: user.id,
          transactionId,
          refundAmount: refundData.amount,
          reason: refundData.reason,
        });

        return refund;
      } catch (error) {
        dispatch({
          type: PAYMENT_ACTIONS.SET_ERROR,
          payload: `Refund initiation failed: ${error.message}`,
          meta: { operation }
        });
        throw error;
      } finally {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
      }
    },

    // Ethiopian Financial Data
    loadEthiopianFinancialData: async () => {
      try {
        const financialData = await EthiopianPaymentService.getFinancialData();
        
        dispatch({
          type: PAYMENT_ACTIONS.SET_ETHIOPIAN_FINANCIAL_DATA,
          payload: {
            exchangeRates: new Map(financialData.exchangeRates),
            taxRates: financialData.taxRates,
            regulatoryLimits: financialData.regulatoryLimits,
            bankingHolidays: financialData.bankingHolidays,
            marketRates: new Map(financialData.marketRates),
          },
        });
      } catch (error) {
        console.warn('Failed to load Ethiopian financial data:', error);
      }
    },

    // Provider Management
    loadAvailableProviders: async () => {
      const operation = 'load_providers';
      try {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
        dispatch({ type: PAYMENT_ACTIONS.SET_PROVIDER_LOADING, payload: true });

        const providers = await EthiopianPaymentService.getAvailableProviders();
        
        dispatch({
          type: PAYMENT_ACTIONS.SET_AVAILABLE_PROVIDERS,
          payload: providers,
        });

        return providers;
      } catch (error) {
        dispatch({
          type: PAYMENT_ACTIONS.SET_ERROR,
          payload: `Failed to load providers: ${error.message}`,
          meta: { operation }
        });
        throw error;
      } finally {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
      }
    },

    // Financial Analytics
    loadFinancialAnalytics: async (period = 'monthly') => {
      const operation = 'load_financial_analytics';
      try {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
        dispatch({ type: PAYMENT_ACTIONS.SET_ANALYTICS_LOADING, payload: true });

        const analytics = await PaymentService.getFinancialAnalytics(user.id, period);
        
        dispatch({
          type: PAYMENT_ACTIONS.SET_FINANCIAL_ANALYTICS,
          payload: analytics,
        });

        return analytics;
      } catch (error) {
        dispatch({
          type: PAYMENT_ACTIONS.SET_ERROR,
          payload: `Failed to load analytics: ${error.message}`,
          meta: { operation }
        });
        throw error;
      } finally {
        dispatch({ type: PAYMENT_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
      }
    },

    // Utility Methods
    clearError: () => {
      dispatch({ type: PAYMENT_ACTIONS.CLEAR_ERROR });
    },

    refreshPaymentData: async () => {
      await initializePaymentData();
    },

    // Ethiopian Payment Utilities
    calculateEthiopianPaymentCost: (amount, provider) => {
      const providerConfig = state.availableProviders.get(provider);
      const baseFee = providerConfig?.commissionRate || 0.015;
      const vat = baseFee * amount * state.ethiopianFinancialData.taxRates.vat;
      const totalCost = amount + (baseFee * amount) + vat;
      
      return {
        amount,
        providerFee: baseFee * amount,
        vat,
        totalCost,
        breakdown: {
          principal: amount,
          processingFee: baseFee * amount,
          tax: vat,
        },
      };
    },

    checkProviderStatus: (provider) => {
      return state.providerStatus.get(provider) || 'unknown';
    },
  };

  // ==================== DERIVED STATE & UTILITIES ====================
  const derivedState = {
    // Transaction Analytics
    transactionAnalytics: {
      totalTransactions: state.transactions.size,
      successfulTransactions: Array.from(state.transactions.values()).filter(t => t.status === 'completed').length,
      totalVolume: Array.from(state.transactions.values()).reduce((sum, t) => sum + (t.amount || 0), 0),
      averageTransaction: Array.from(state.transactions.values()).reduce((sum, t) => sum + (t.amount || 0), 0) / state.transactions.size || 0,
    },

    // Provider Analytics
    providerAnalytics: {
      mostUsedProvider: Array.from(state.transactions.values())
        .reduce((acc, t) => {
          acc[t.provider] = (acc[t.provider] || 0) + 1;
          return acc;
        }, {}),
      successRateByProvider: calculateProviderSuccessRates(state.transactions),
    },

    // Ethiopian Market Insights
    marketInsights: {
      optimalProvider: getOptimalProvider(state.availableProviders, state.transactions),
      costComparison: compareProviderCosts(state.availableProviders, 1000), // Compare for 1000 ETB
      regulatoryAlerts: checkRegulatoryAlerts(state.ethiopianFinancialData),
    },

    // Payment Method Insights
    methodInsights: {
      preferredMethod: state.paymentMethods.find(m => m.isDefault)?.type || 'unknown',
      methodDistribution: state.paymentMethods.reduce((acc, method) => {
        acc[method.type] = (acc[method.type] || 0) + 1;
        return acc;
      }, {}),
    },
  };

  const value = {
    // State
    ...state,
    
    // Actions
    ...actions,
    
    // Derived State
    ...derivedState,

    // Utility Methods
    isOperationLoading: (operation) => state.loading.operations.has(operation),
    getTransaction: (transactionId) => state.transactions.get(transactionId),
    getProvider: (providerId) => state.availableProviders.get(providerId),
    getRefund: (refundId) => state.refunds.get(refundId),
    hasActivePayment: state.processingStatus === 'processing',
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

// ==================== ETHIOPIAN PAYMENT UTILITY FUNCTIONS ====================
const validateEthiopianPayment = (paymentData, financialData) => {
  const errors = [];
  
  // Amount validation
  if (paymentData.amount > financialData.regulatoryLimits.maxSingleTransaction) {
    errors.push(`Amount exceeds single transaction limit of ${financialData.regulatoryLimits.maxSingleTransaction} ETB`);
  }
  
  // Provider validation
  if (!financialData.availableProviders?.has(paymentData.provider)) {
    errors.push('Selected payment provider is not available');
  }
  
  // Currency validation
  if (paymentData.currency !== 'ETB') {
    errors.push('Only Ethiopian Birr (ETB) payments are supported');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const calculateEthiopianTax = (amount, taxRates) => {
  const vat = amount * taxRates.vat;
  const withholding = amount * taxRates.withholding;
  
  return {
    vat,
    withholding,
    totalTax: vat + withholding,
    netAmount: amount - (vat + withholding),
  };
};

const checkRegulatoryCompliance = (paymentData, limits) => {
  const today = new Date();
  const isHoliday = false; // Would check against holiday calendar
  
  return {
    amountWithinLimit: paymentData.amount <= limits.maxSingleTransaction,
    timeAllowed: !isHoliday && today.getHours() >= 6 && today.getHours() <= 22,
    providerApproved: true, // Would check provider status
  };
};

const getProviderSpecificData = (provider, amount) => {
  const providerConfigs = {
    'telebirr': {
      maxAmount: 50000,
      processingTime: 'instant',
      requirements: ['ethio_telecom_sim'],
    },
    'chapa': {
      maxAmount: 100000,
      processingTime: '2-5 minutes',
      requirements: ['bank_account', 'mobile_number'],
    },
    'cbe_birr': {
      maxAmount: 100000,
      processingTime: 'instant',
      requirements: ['cbe_account'],
    },
  };
  
  return providerConfigs[provider] || {};
};

const validateEthiopianPhone = (phoneNumber) => {
  const ethiopianRegex = /^(?:\+251|0)(9[0-9]|7[0-9])([0-9]{6,7})$/;
  if (!ethiopianRegex.test(phoneNumber.replace(/\s/g, ''))) {
    throw new Error('Invalid Ethiopian phone number format');
  }
  return phoneNumber.replace(/\s/g, '').replace('+251', '0');
};

const getMobileProviderConfig = (provider) => {
  const configs = {
    'telebirr': {
      ussdCode: '*127#',
      customerService: '127',
      features: ['instant_transfer', 'bill_payment'],
    },
    'cbe_birr': {
      ussdCode: '*847#',
      customerService: '847',
      features: ['bank_transfer', 'airtime_topup'],
    },
  };
  
  return configs[provider] || {};
};

const validateEthiopianPaymentMethod = (methodData) => {
  const errors = [];
  
  if (methodData.type === 'bank_account') {
    if (!methodData.accountNumber || methodData.accountNumber.length < 10) {
      errors.push('Invalid bank account number');
    }
    if (!methodData.bankName) {
      errors.push('Bank name is required');
    }
  }
  
  if (methodData.type === 'mobile_money') {
    if (!validateEthiopianPhone(methodData.phoneNumber)) {
      errors.push('Invalid Ethiopian phone number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const verifyBankAccount = async (methodData) => {
  // Simulate bank account verification
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.random() > 0.1); // 90% success rate for demo
    }, 1000);
  });
};

const checkPaymentMethodCompliance = (methodData) => {
  // Check Ethiopian financial compliance
  return {
    kycRequired: methodData.type === 'bank_account',
    transactionLimit: methodData.type === 'mobile_money' ? 50000 : 100000,
    dailyLimit: methodData.type === 'mobile_money' ? 100000 : 500000,
  };
};

const calculateTaxReversal = (transactionId, refundAmount) => {
  // Calculate tax amounts to be reversed
  return {
    vatReversal: refundAmount * 0.15,
    withholdingReversal: refundAmount * 0.02,
    totalReversal: refundAmount * 0.17,
  };
};

const checkRefundApproval = async (transactionId) => {
  // Simulate regulatory approval check
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.random() > 0.05); // 95% approval rate for demo
    }, 500);
  });
};

const calculateProviderSuccessRates = (transactions) => {
  const providerStats = {};
  
  Array.from(transactions.values()).forEach(transaction => {
    if (!providerStats[transaction.provider]) {
      providerStats[transaction.provider] = { total: 0, successful: 0 };
    }
    
    providerStats[transaction.provider].total++;
    if (transaction.status === 'completed') {
      providerStats[transaction.provider].successful++;
    }
  });
  
  const successRates = {};
  Object.keys(providerStats).forEach(provider => {
    successRates[provider] = providerStats[provider].successful / providerStats[provider].total;
  });
  
  return successRates;
};

const getOptimalProvider = (availableProviders, transactions) => {
  const providerPerformance = calculateProviderSuccessRates(transactions);
  let optimalProvider = null;
  let highestScore = 0;
  
  availableProviders.forEach((provider, providerId) => {
    const successRate = providerPerformance[providerId] || 0;
    const cost = provider.commissionRate || 0.02;
    const score = successRate * (1 - cost);
    
    if (score > highestScore) {
      highestScore = score;
      optimalProvider = providerId;
    }
  });
  
  return optimalProvider;
};

const compareProviderCosts = (availableProviders, amount) => {
  const comparisons = {};
  
  availableProviders.forEach((provider, providerId) => {
    const baseFee = provider.commissionRate || 0.015;
    const vat = baseFee * amount * 0.15;
    comparisons[providerId] = {
      providerFee: baseFee * amount,
      vat,
      totalCost: amount + (baseFee * amount) + vat,
      netAmount: amount - (baseFee * amount) - vat,
    };
  });
  
  return comparisons;
};

const checkRegulatoryAlerts = (financialData) => {
  const alerts = [];
  
  // Check for upcoming holidays
  const today = new Date();
  const upcomingHolidays = financialData.bankingHolidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate > today && holidayDate < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  });
  
  if (upcomingHolidays.length > 0) {
    alerts.push({
      type: 'holiday_alert',
      message: `Upcoming banking holidays: ${upcomingHolidays.map(h => h.name).join(', ')}`,
      severity: 'warning',
    });
  }
  
  // Check for regulatory changes
  if (financialData.regulatoryLimits.maxSingleTransaction < 100000) {
    alerts.push({
      type: 'limit_alert',
      message: 'Transaction limits may affect large payments',
      severity: 'info',
    });
  }
  
  return alerts;
};

// ==================== CUSTOM HOOK ====================
export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

export default PaymentContext;