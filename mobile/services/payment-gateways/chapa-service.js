import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Chapa API Configuration
const CHAPA_CONFIG = {
  BASE_URL: __DEV__ ? 'https://api.chapa.dev/v1' : 'https://api.chapa.co/v1',
  PUBLIC_KEY: __DEV__ ? process.env.EXPO_PUBLIC_CHAPA_TEST_PUBLIC_KEY : process.env.EXPO_PUBLIC_CHAPA_LIVE_PUBLIC_KEY,
  SECRET_KEY: __DEV__ ? process.env.EXPO_PUBLIC_CHAPA_TEST_SECRET_KEY : process.env.EXPO_PUBLIC_CHAPA_LIVE_SECRET_KEY,
  CURRENCY: 'ETB',
  TIME_ZONE: 'Africa/Addis_Ababa'
};

// Chapa API endpoints
const ENDPOINTS = {
  INITIATE_PAYMENT: '/transaction/initialize',
  VERIFY_PAYMENT: '/transaction/verify',
  CREATE_SUBACCOUNT: '/subaccount',
  BANKS: '/banks',
  MOBILE_CHECKOUT: '/mobile/checkout'
};

class ChapaService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: CHAPA_CONFIG.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = CHAPA_CONFIG.SECRET_KEY;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('Chapa API Error:', error.response?.data || error.message);
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Normalize API errors
   */
  normalizeError(error) {
    const chapaError = error.response?.data;
    
    if (chapaError?.message) {
      return {
        code: chapaError.status || 'API_ERROR',
        message: chapaError.message,
        details: chapaError.errors || null,
        statusCode: error.response?.status
      };
    }

    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network request failed',
      details: null,
      statusCode: null
    };
  }

  /**
   * Get device info for mobile payments
   */
  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      manufacturer: Platform.constants?.Manufacturer || 'unknown',
      model: Platform.constants?.Model || 'unknown',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate unique transaction reference
   */
  generateTxRef() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `chapa-mobile-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Store payment data locally
   */
  async storePaymentData(key, data) {
    try {
      await AsyncStorage.setItem(`@chapa_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to store payment data:', error);
    }
  }

  /**
   * Retrieve payment data
   */
  async getPaymentData(key) {
    try {
      const data = await AsyncStorage.getItem(`@chapa_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to retrieve payment data:', error);
      return null;
    }
  }

  /**
   * Clear payment data
   */
  async clearPaymentData(key) {
    try {
      await AsyncStorage.removeItem(`@chapa_${key}`);
    } catch (error) {
      console.warn('Failed to clear payment data:', error);
    }
  }

  /**
   * Initialize a payment transaction
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} - Payment initialization response
   */
  async initializePayment(paymentData) {
    try {
      const {
        amount,
        email,
        phoneNumber,
        firstName,
        lastName,
        customTitle,
        description,
        returnUrl,
        callbackUrl,
        metadata = {}
      } = paymentData;

      // Validate required fields
      if (!amount || amount <= 0) {
        throw new Error('Amount is required and must be greater than 0');
      }

      if (!email && !phoneNumber) {
        throw new Error('Either email or phone number is required');
      }

      const txRef = this.generateTxRef();
      const deviceInfo = this.getDeviceInfo();

      const payload = {
        amount: amount.toString(),
        currency: CHAPA_CONFIG.CURRENCY,
        email: email || `${phoneNumber}@mobile.et`,
        first_name: firstName || 'Customer',
        last_name: lastName || 'User',
        phone_number: phoneNumber,
        tx_ref: txRef,
        callback_url: callbackUrl || `${CHAPA_CONFIG.BASE_URL}/webhook/${txRef}`,
        return_url: returnUrl || 'myapp://payment-callback',
        customization: {
          title: customTitle || 'Payment',
          description: description || 'Thank you for your purchase',
          logo: metadata.logo || null
        },
        meta: {
          ...metadata,
          device: deviceInfo,
          platform: 'mobile',
          source: 'react-native',
          version: '1.0.0'
        }
      };

      // Remove null/undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });

      const response = await this.axiosInstance.post(
        ENDPOINTS.INITIATE_PAYMENT,
        payload
      );

      // Store payment reference locally
      await this.storePaymentData(txRef, {
        ...payload,
        initiatedAt: new Date().toISOString(),
        status: 'initiated'
      });

      return {
        success: true,
        data: {
          checkoutUrl: response.data.checkout_url,
          transactionRef: txRef,
          paymentUrl: response.data.data?.checkout_url || response.data.checkout_url,
          message: response.message || 'Payment initialized successfully',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Initialize payment error:', error);
      return {
        success: false,
        error: {
          code: error.code || 'INITIALIZATION_FAILED',
          message: error.message || 'Failed to initialize payment',
          details: error.details
        }
      };
    }
  }

  /**
   * Verify a payment transaction
   * @param {string} transactionRef - Transaction reference
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPayment(transactionRef) {
    try {
      if (!transactionRef) {
        throw new Error('Transaction reference is required');
      }

      const response = await this.axiosInstance.get(
        `${ENDPOINTS.VERIFY_PAYMENT}/${transactionRef}`
      );

      const verificationData = {
        transactionRef,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        chargedAmount: response.data.charged_amount,
        fee: response.data.fee,
        customer: response.data.customer,
        paymentMethod: response.data.payment_method,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        rawResponse: response.data
      };

      // Update local storage with verification result
      await this.storePaymentData(transactionRef, {
        ...verificationData,
        verifiedAt: new Date().toISOString(),
        verificationStatus: 'completed'
      });

      return {
        success: true,
        data: verificationData,
        message: response.message || 'Payment verified successfully'
      };

    } catch (error) {
      console.error('Verify payment error:', error);
      return {
        success: false,
        error: {
          code: error.code || 'VERIFICATION_FAILED',
          message: error.message || 'Failed to verify payment',
          details: error.details
        },
        transactionRef
      };
    }
  }

  /**
   * Initialize mobile money payment
   * @param {Object} mobileMoneyData - Mobile money payment data
   * @returns {Promise<Object>} - Mobile money payment response
   */
  async initializeMobileMoney(mobileMoneyData) {
    try {
      const {
        amount,
        phoneNumber,
        provider = 'telebirr', // Default to Telebirr
        firstName,
        lastName,
        description,
        metadata = {}
      } = mobileMoneyData;

      if (!amount || amount <= 0) {
        throw new Error('Valid amount is required');
      }

      if (!phoneNumber) {
        throw new Error('Phone number is required for mobile money payment');
      }

      const txRef = this.generateTxRef();
      const deviceInfo = this.getDeviceInfo();

      const payload = {
        amount: amount.toString(),
        currency: CHAPA_CONFIG.CURRENCY,
        phone_number: phoneNumber,
        tx_ref: txRef,
        provider: provider.toLowerCase(),
        first_name: firstName || 'Customer',
        last_name: lastName || 'User',
        description: description || 'Mobile Money Payment',
        meta: {
          ...metadata,
          device: deviceInfo,
          payment_type: 'mobile_money',
          provider: provider
        }
      };

      const response = await this.axiosInstance.post(
        ENDPOINTS.MOBILE_CHECKOUT,
        payload
      );

      // Store mobile money payment data
      await this.storePaymentData(`mobile_${txRef}`, {
        ...payload,
        initiatedAt: new Date().toISOString(),
        status: 'pending',
        paymentType: 'mobile_money'
      });

      return {
        success: true,
        data: {
          transactionRef: txRef,
          provider: provider,
          phoneNumber: phoneNumber,
          amount: amount,
          status: 'initiated',
          message: response.message || 'Mobile money payment initialized',
          verificationRequired: response.data?.requires_verification || true,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Mobile money initialization error:', error);
      return {
        success: false,
        error: {
          code: error.code || 'MOBILE_MONEY_FAILED',
          message: error.message || 'Failed to initialize mobile money payment',
          details: error.details
        }
      };
    }
  }

  /**
   * Get list of supported banks
   * @returns {Promise<Object>} - List of banks
   */
  async getBanks() {
    try {
      const response = await this.axiosInstance.get(ENDPOINTS.BANKS);

      return {
        success: true,
        data: response.data || [],
        message: 'Banks retrieved successfully'
      };

    } catch (error) {
      console.error('Get banks error:', error);
      return {
        success: false,
        error: {
          code: error.code || 'BANKS_FETCH_FAILED',
          message: error.message || 'Failed to fetch banks',
          details: error.details
        }
      };
    }
  }

  /**
   * Create a subaccount for split payments
   * @param {Object} subaccountData - Subaccount information
   * @returns {Promise<Object>} - Subaccount creation response
   */
  async createSubaccount(subaccountData) {
    try {
      const {
        businessName,
        accountNumber,
        bankCode,
        splitType = 'percentage',
        splitValue
      } = subaccountData;

      if (!businessName || !accountNumber || !bankCode) {
        throw new Error('Business name, account number, and bank code are required');
      }

      const payload = {
        business_name: businessName,
        account_number: accountNumber,
        bank_code: bankCode,
        split_type: splitType,
        split_value: splitValue
      };

      const response = await this.axiosInstance.post(
        ENDPOINTS.CREATE_SUBACCOUNT,
        payload
      );

      return {
        success: true,
        data: response.data,
        message: 'Subaccount created successfully'
      };

    } catch (error) {
      console.error('Create subaccount error:', error);
      return {
        success: false,
        error: {
          code: error.code || 'SUBACCOUNT_CREATION_FAILED',
          message: error.message || 'Failed to create subaccount',
          details: error.details
        }
      };
    }
  }

  /**
   * Poll for payment status (useful for mobile money)
   * @param {string} transactionRef - Transaction reference
   * @param {number} interval - Polling interval in milliseconds
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Polling result
   */
  async pollPaymentStatus(transactionRef, interval = 3000, timeout = 180000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const pollInterval = interval;
      const maxTime = timeout;

      const poll = async () => {
        try {
          const currentTime = Date.now();
          
          if (currentTime - startTime > maxTime) {
            clearInterval(intervalId);
            resolve({
              success: false,
              error: {
                code: 'POLLING_TIMEOUT',
                message: 'Payment status polling timed out',
                transactionRef
              }
            });
            return;
          }

          const result = await this.verifyPayment(transactionRef);
          
          if (result.success) {
            clearInterval(intervalId);
            
            if (result.data.status === 'success') {
              resolve({
                success: true,
                data: result.data,
                message: 'Payment completed successfully'
              });
            } else if (result.data.status === 'failed') {
              resolve({
                success: false,
                error: {
                  code: 'PAYMENT_FAILED',
                  message: 'Payment failed',
                  transactionRef,
                  details: result.data
                }
              });
            } else {
              // Still pending, continue polling
              return;
            }
          } else {
            // Verification failed, continue polling
            return;
          }

        } catch (error) {
          console.error('Polling error:', error);
          // Continue polling on network errors
        }
      };

      const intervalId = setInterval(poll, pollInterval);
      
      // Start first poll immediately
      poll();
    });
  }

  /**
   * Get payment history from local storage
   * @returns {Promise<Array>} - List of payment records
   */
  async getPaymentHistory() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chapaKeys = keys.filter(key => key.startsWith('@chapa_'));
      const items = await AsyncStorage.multiGet(chapaKeys);
      
      return items.map(([key, value]) => {
        try {
          const data = JSON.parse(value);
          return {
            id: key.replace('@chapa_', ''),
            ...data
          };
        } catch (e) {
          return null;
        }
      }).filter(item => item !== null);
    } catch (error) {
      console.error('Get payment history error:', error);
      return [];
    }
  }

  /**
   * Clear all payment history
   */
  async clearPaymentHistory() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chapaKeys = keys.filter(key => key.startsWith('@chapa_'));
      await AsyncStorage.multiRemove(chapaKeys);
      return { success: true, message: 'Payment history cleared' };
    } catch (error) {
      console.error('Clear payment history error:', error);
      return { success: false, error: 'Failed to clear payment history' };
    }
  }

  /**
   * Validate phone number for Ethiopian mobile money
   * @param {string} phoneNumber - Phone number to validate
   * @returns {Object} - Validation result
   */
  validateEthiopianPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      return { isValid: false, message: 'Phone number is required' };
    }

    // Remove any non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // Check if it's a valid Ethiopian mobile number
    // Ethiopian mobile numbers: +251 9xx xxx xxx or 09xx xxx xxx
    const regex = /^(?:\+251|251|0)?(9\d{8})$/;
    const match = cleanNumber.match(regex);

    if (!match) {
      return { 
        isValid: false, 
        message: 'Invalid Ethiopian phone number format' 
      };
    }

    const normalizedNumber = `+251${match[1]}`;
    const providerPrefix = match[1].substring(0, 2);
    
    let provider = 'unknown';
    if (['91', '92', '93'].includes(providerPrefix)) {
      provider = 'ethio telecom';
    } else if (['94', '95'].includes(providerPrefix)) {
      provider = 'safaricom (telebirr)';
    } else if (['96', '97'].includes(providerPrefix)) {
      provider = 'ethio telecom';
    } else if (['98', '99'].includes(providerPrefix)) {
      provider = 'ethio telecom';
    }

    return {
      isValid: true,
      normalizedNumber,
      provider,
      format: `${normalizedNumber.substring(0, 4)} ${normalizedNumber.substring(4, 7)} ${normalizedNumber.substring(7)}`
    };
  }
}

// Create and export singleton instance
const chapaService = new ChapaService();
export default chapaService;

// Export utility functions
export {
  CHAPA_CONFIG,
  ENDPOINTS
};