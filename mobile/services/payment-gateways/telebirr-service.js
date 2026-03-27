// mobile/services/telebirr-service.js
import { Alert, Linking, Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';
import storage from '../utils/storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * TeleBirr Payment Service for React Native
 * Handles mobile money payments via TeleBirr app integration
 */
class TelebirrService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/payments/telebirr`;
    this.telebirrPackage = 'com.ethiotelecom.tele.birr';
    this.telebirrUniversalLink = 'https://telebirr.et/pay';
    this.telebirrPlayStore = 'market://details?id=com.ethiotelecom.tele.birr';
    this.telebirrAppStore = 'itms-apps://itunes.apple.com/us/app/telebirr/id1584285909';
  }

  /**
   * Check if TeleBirr app is installed
   */
  async isTelebirrInstalled() {
    try {
      // For Android
      if (Platform.OS === 'android') {
        return Linking.canOpenURL(`package:${this.telebirrPackage}`)
          .then((supported) => supported)
          .catch(() => false);
      }
      // For iOS - try to open TeleBirr universal link
      return Linking.canOpenURL(this.telebirrUniversalLink)
        .then((supported) => supported)
        .catch(() => false);
    } catch (error) {
      console.error('Error checking TeleBirr installation:', error);
      return false;
    }
  }

  /**
   * Redirect to app store to install TeleBirr
   */
  async redirectToInstallTelebirr() {
    try {
      const url = Platform.OS === 'ios' 
        ? this.telebirrAppStore 
        : this.telebirrPlayStore;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web store
        const webUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/us/app/telebirr/id1584285909'
          : 'https://play.google.com/store/apps/details?id=com.ethiotelecom.tele.birr';
        
        await Linking.openURL(webUrl);
      }
      return true;
    } catch (error) {
      console.error('Error redirecting to app store:', error);
      Alert.alert(
        'Install TeleBirr',
        'Please install TeleBirr from your app store to continue.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Initialize a TeleBirr payment
   * @param {Object} paymentData - Payment details
   * @param {number} paymentData.amount - Amount in ETB
   * @param {string} paymentData.phoneNumber - Customer phone number
   * @param {string} paymentData.reference - Payment reference
   * @param {string} paymentData.description - Payment description
   * @param {Object} metadata - Additional metadata
   */
  async initializePayment(paymentData, metadata = {}) {
    try {
      // Check internet connection
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No internet connection');
      }

      const token = await storage.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const payload = {
        ...paymentData,
        metadata: {
          ...metadata,
          platform: Platform.OS,
          appVersion: '1.0.0', // You can get this from app config
          timestamp: new Date().toISOString(),
        }
      };

      const response = await fetch(`${this.baseUrl}/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Platform': Platform.OS,
          'X-App-Version': '1.0.0',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Payment initialized successfully',
      };
    } catch (error) {
      console.error('Error initializing TeleBirr payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize payment',
        data: null,
      };
    }
  }

  /**
   * Process payment via TeleBirr deep link
   * @param {Object} telebirrResponse - Response from initialization
   */
  async processPayment(telebirrResponse) {
    try {
      const { transactionId, checkoutUrl, deepLink } = telebirrResponse;

      // Try deep link first (for app)
      if (deepLink) {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
          
          // Start polling for payment status
          return this.pollPaymentStatus(transactionId);
        }
      }

      // Fallback to checkout URL (web)
      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
        
        // Start polling for payment status
        return this.pollPaymentStatus(transactionId);
      }

      throw new Error('No payment URL available');
    } catch (error) {
      console.error('Error processing TeleBirr payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to process payment',
      };
    }
  }

  /**
   * Poll payment status
   * @param {string} transactionId - Transaction ID
   * @param {number} interval - Polling interval in ms
   * @param {number} maxAttempts - Maximum polling attempts
   */
  async pollPaymentStatus(transactionId, interval = 3000, maxAttempts = 20) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const poll = async () => {
        try {
          attempts++;
          
          const status = await this.checkPaymentStatus(transactionId);
          
          if (status.success) {
            const { transaction } = status.data;
            
            if (transaction.status === 'completed') {
              resolve({
                success: true,
                data: transaction,
                message: 'Payment completed successfully',
              });
              return;
            }
            
            if (transaction.status === 'failed' || transaction.status === 'cancelled') {
              resolve({
                success: false,
                error: transaction.message || 'Payment failed',
                data: transaction,
              });
              return;
            }
          }
          
          // Continue polling if not final status
          if (attempts < maxAttempts) {
            setTimeout(poll, interval);
          } else {
            resolve({
              success: false,
              error: 'Payment timeout. Please check your TeleBirr app.',
              data: null,
            });
          }
        } catch (error) {
          if (attempts < maxAttempts) {
            setTimeout(poll, interval);
          } else {
            resolve({
              success: false,
              error: error.message || 'Failed to check payment status',
              data: null,
            });
          }
        }
      };

      // Start polling
      setTimeout(poll, interval);
    });
  }

  /**
   * Check payment status from backend
   * @param {string} transactionId - Transaction ID
   */
  async checkPaymentStatus(transactionId) {
    try {
      const token = await storage.getToken();
      
      const response = await fetch(`${this.baseUrl}/status/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Platform': Platform.OS,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check payment status');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Status checked successfully',
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return {
        success: false,
        error: error.message || 'Failed to check payment status',
        data: null,
      };
    }
  }

  /**
   * Verify TeleBirr payment
   * @param {string} transactionId - Transaction ID
   */
  async verifyPayment(transactionId) {
    try {
      const token = await storage.getToken();
      
      const response = await fetch(`${this.baseUrl}/verify/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Platform': Platform.OS,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify payment');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Payment verified successfully',
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify payment',
        data: null,
      };
    }
  }

  /**
   * Get user's saved TeleBirr payment methods
   */
  async getSavedPaymentMethods() {
    try {
      const token = await storage.getToken();
      
      const response = await fetch(`${API_BASE_URL}/payment-methods?provider=telebirr`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payment methods');
      }

      return {
        success: true,
        data: data.data || [],
        message: 'Payment methods fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment methods',
        data: [],
      };
    }
  }

  /**
   * Save TeleBirr payment method
   * @param {Object} paymentMethod - Payment method details
   */
  async savePaymentMethod(paymentMethod) {
    try {
      const token = await storage.getToken();
      
      const payload = {
        methodType: 'mobile_money',
        provider: 'telebirr',
        ...paymentMethod,
      };

      const response = await fetch(`${API_BASE_URL}/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save payment method');
      }

      return {
        success: true,
        data: data.data,
        message: 'Payment method saved successfully',
      };
    } catch (error) {
      console.error('Error saving payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to save payment method',
        data: null,
      };
    }
  }

  /**
   * Complete payment flow with TeleBirr
   * @param {Object} options - Payment options
   */
  async pay(options) {
    try {
      const {
        amount,
        phoneNumber,
        description,
        reference,
        savePaymentMethod = false,
        metadata = {},
      } = options;

      // 1. Check if TeleBirr is installed
      const isInstalled = await this.isTelebirrInstalled();
      
      if (!isInstalled) {
        const userChoice = await new Promise((resolve) => {
          Alert.alert(
            'TeleBirr Required',
            'TeleBirr app is required for payments. Would you like to install it?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Install', onPress: () => resolve(true) },
            ]
          );
        });

        if (userChoice) {
          await this.redirectToInstallTelebirr();
        }
        return {
          success: false,
          error: 'TeleBirr app not installed',
          requiresInstall: true,
        };
      }

      // 2. Initialize payment
      const initResult = await this.initializePayment({
        amount,
        phoneNumber,
        description,
        reference,
      }, metadata);

      if (!initResult.success) {
        return initResult;
      }

      // 3. Process payment
      const paymentResult = await this.processPayment(initResult.data);

      // 4. Save payment method if requested
      if (paymentResult.success && savePaymentMethod) {
        await this.savePaymentMethod({
          token: initResult.data.paymentToken,
          phoneNumber: phoneNumber,
          metadata: {
            ...metadata,
            transactionId: initResult.data.transactionId,
          },
        });
      }

      return paymentResult;
    } catch (error) {
      console.error('Error in TeleBirr payment flow:', error);
      return {
        success: false,
        error: error.message || 'Payment failed',
        data: null,
      };
    }
  }

  /**
   * Handle deep link callback from TeleBirr
   * @param {string} url - Deep link URL
   */
  handleDeepLink(url) {
    try {
      // Parse URL parameters
      const urlObj = new URL(url);
      const params = Object.fromEntries(urlObj.searchParams);
      
      // Extract transaction ID or payment status
      const transactionId = params.transactionId || params.trx_id || params.payment_id;
      const status = params.status || params.payment_status;
      
      return {
        success: status === 'success' || status === 'completed',
        transactionId,
        status,
        params,
      };
    } catch (error) {
      console.error('Error handling deep link:', error);
      return {
        success: false,
        error: 'Invalid deep link',
      };
    }
  }

  /**
   * Get TeleBirr transaction history
   * @param {Object} filters - Filter options
   */
  async getTransactionHistory(filters = {}) {
    try {
      const token = await storage.getToken();
      
      const queryParams = new URLSearchParams({
        provider: 'telebirr',
        ...filters,
      }).toString();

      const response = await fetch(`${API_BASE_URL}/transactions?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch transactions');
      }

      return {
        success: true,
        data: data.data || [],
        pagination: data.pagination,
        message: 'Transactions fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch transactions',
        data: [],
      };
    }
  }
}

// Create singleton instance
const telebirrService = new TelebirrService();

export default telebirrService;