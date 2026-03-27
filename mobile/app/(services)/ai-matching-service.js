// mobile/app/(services)/ai-matching-service.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

// Payment service import (assumed you have this)
import { initPayment } from './payment-service';

// Service status
const SERVICE_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
  PAYMENT_REQUIRED: 'payment_required'
};

// Ethiopian payment providers
const PAYMENT_PROVIDERS = {
  CHAPA: 'chapa',
  TELEBIRR: 'telebirr',
  CBE_BIRR: 'cbe_birr'
};

// Matching types
const MATCHING_TYPES = {
  JOB_MATCH: 'job_match',
  SKILL_MATCH: 'skill_match',
  PROJECT_MATCH: 'project_match',
  PARTNER_MATCH: 'partner_match'
};

// AI Model configurations
const AI_MODELS = {
  LOCAL: {
    name: 'Local Ethiopian Model',
    endpoint: '/api/ai/local-match',
    requiresPayment: false,
    supports: [MATCHING_TYPES.JOB_MATCH, MATCHING_TYPES.SKILL_MATCH]
  },
  ADVANCED: {
    name: 'Advanced AI Matching',
    endpoint: '/api/ai/advanced-match',
    requiresPayment: true,
    cost: 5.00, // ETB
    supports: Object.values(MATCHING_TYPES)
  },
  ETHIOPIAN_SPECIALIZED: {
    name: 'Ethiopian Market Specialized',
    endpoint: '/api/ai/ethio-specialized',
    requiresPayment: true,
    cost: 3.50, // ETB
    supports: [MATCHING_TYPES.JOB_MATCH, MATCHING_TYPES.PROJECT_MATCH]
  }
};

class AIMatchingService {
  constructor() {
    this.baseURL = Constants.expoConfig?.extra?.apiUrl || 'https://api.your-app.com';
    this.status = SERVICE_STATUS.IDLE;
    this.userCredits = 0;
    this.paymentMethods = [];
    this.defaultPaymentMethod = null;
    this.initializeService();
  }

  /**
   * Initialize the service
   */
  async initializeService() {
    try {
      // Load user credits and payment methods
      await this.loadUserData();
      
      // Setup axios instance
      this.api = axios.create({
        baseURL: this.baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': `EthioMatchApp/${Platform.OS}/${Constants.expoConfig?.version || '1.0.0'}`
        }
      });

      // Add request interceptor for authentication
      this.api.interceptors.request.use(
        async (config) => {
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // Add response interceptor for error handling
      this.api.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response?.status === 401) {
            // Handle unauthorized - redirect to login
            await this.handleUnauthorized();
          } else if (error.response?.status === 402) {
            // Payment required
            this.status = SERVICE_STATUS.PAYMENT_REQUIRED;
            throw new Error('Payment required for this service');
          }
          return Promise.reject(error);
        }
      );

      console.log('AI Matching Service initialized');
    } catch (error) {
      console.error('Failed to initialize AI Matching Service:', error);
      throw error;
    }
  }

  /**
   * Load user data from storage
   */
  async loadUserData() {
    try {
      const credits = await AsyncStorage.getItem('aiCredits');
      const paymentMethodsStr = await AsyncStorage.getItem('paymentMethods');
      const defaultMethod = await AsyncStorage.getItem('defaultPaymentMethod');

      this.userCredits = credits ? parseFloat(credits) : 0;
      this.paymentMethods = paymentMethodsStr ? JSON.parse(paymentMethodsStr) : [];
      this.defaultPaymentMethod = defaultMethod || null;

      // Sync with server if online
      await this.syncUserData();
    } catch (error) {
      console.warn('Failed to load user data:', error);
    }
  }

  /**
   * Sync user data with server
   */
  async syncUserData() {
    try {
      const response = await this.api.get('/user/profile');
      if (response.data) {
        const { aiCredits, paymentMethods, defaultPaymentMethod } = response.data;
        
        this.userCredits = aiCredits || 0;
        this.paymentMethods = paymentMethods || [];
        this.defaultPaymentMethod = defaultPaymentMethod || null;

        // Update local storage
        await AsyncStorage.setItem('aiCredits', this.userCredits.toString());
        await AsyncStorage.setItem('paymentMethods', JSON.stringify(this.paymentMethods));
        if (this.defaultPaymentMethod) {
          await AsyncStorage.setItem('defaultPaymentMethod', this.defaultPaymentMethod);
        }
      }
    } catch (error) {
      console.warn('Failed to sync user data:', error);
    }
  }

  /**
   * Get available AI models based on matching type
   */
  getAvailableModels(matchingType) {
    return Object.values(AI_MODELS).filter(model => 
      model.supples.includes(matchingType)
    );
  }

  /**
   * Perform AI matching with Ethiopian context
   */
  async performMatching(params, options = {}) {
    const {
      type = MATCHING_TYPES.JOB_MATCH,
      model = 'ADVANCED',
      useCredits = true,
      autoRetry = true,
      maxRetries = 2
    } = options;

    try {
      this.status = SERVICE_STATUS.PROCESSING;

      // Validate parameters
      this.validateMatchingParams(params, type);

      // Get selected model
      const selectedModel = AI_MODELS[model] || AI_MODELS.ADVANCED;

      // Check payment/credit requirements
      if (selectedModel.requiresPayment) {
        const canProceed = await this.checkPaymentRequirements(selectedModel, useCredits);
        if (!canProceed) {
          throw new Error('Insufficient credits or payment method required');
        }
      }

      // Prepare request data with Ethiopian context
      const requestData = {
        ...params,
        type,
        model: selectedModel.name,
        locale: 'am-ET', // Ethiopian locale
        currency: 'ETB',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
          version: Constants.expoConfig?.version
        }
      };

      // Add Ethiopian market specific parameters
      if (type === MATCHING_TYPES.JOB_MATCH) {
        requestData.ethioContext = {
          region: params.region || 'Addis Ababa',
          languagePreferences: params.languages || ['am', 'en'],
          workPermitRequired: params.workPermit || false,
          salaryExpectationCurrency: 'ETB'
        };
      }

      // Execute matching request
      const response = await this.executeMatchingRequest(
        selectedModel.endpoint,
        requestData,
        { autoRetry, maxRetries }
      );

      // Process and format results for Ethiopian market
      const processedResults = this.processResultsForEthiopia(response.data, type);

      // Deduct credits if used
      if (useCredits && selectedModel.requiresPayment) {
        await this.deductCredits(selectedModel.cost);
      }

      this.status = SERVICE_STATUS.SUCCESS;
      return {
        success: true,
        data: processedResults,
        model: selectedModel.name,
        cost: selectedModel.requiresPayment ? selectedModel.cost : 0,
        creditsRemaining: this.userCredits
      };

    } catch (error) {
      this.status = SERVICE_STATUS.ERROR;
      console.error('AI Matching failed:', error);
      
      // Ethiopian specific error messages
      const ethioError = this.getEthiopianLocalizedError(error);
      
      return {
        success: false,
        error: ethioError.message,
        code: error.code,
        type: 'ai_matching_error'
      };
    }
  }

  /**
   * Validate matching parameters
   */
  validateMatchingParams(params, type) {
    const validators = {
      [MATCHING_TYPES.JOB_MATCH]: () => {
        if (!params.skills || !Array.isArray(params.skills) || params.skills.length === 0) {
          throw new Error('Skills are required for job matching');
        }
        if (!params.experienceLevel) {
          throw new Error('Experience level is required');
        }
      },
      [MATCHING_TYPES.SKILL_MATCH]: () => {
        if (!params.currentSkills || !Array.isArray(params.currentSkills)) {
          throw new Error('Current skills are required');
        }
        if (!params.targetRole) {
          throw new Error('Target role is required');
        }
      }
      // Add more validators as needed
    };

    const validator = validators[type];
    if (validator) {
      validator();
    }
  }

  /**
   * Check payment requirements for Ethiopian gateways
   */
  async checkPaymentRequirements(model, useCredits) {
    if (!model.requiresPayment) return true;

    // Check if user has enough credits
    if (useCredits && this.userCredits >= model.cost) {
      return true;
    }

    // Check for valid payment methods
    const hasValidPaymentMethod = this.paymentMethods.some(method => 
      method.isActive && method.currency === 'ETB'
    );

    if (!hasValidPaymentMethod) {
      // Show Ethiopian payment method setup prompt
      const shouldSetup = await this.promptPaymentSetup();
      return shouldSetup;
    }

    // Check if user wants to pay directly
    const shouldPay = await this.promptDirectPayment(model.cost);
    if (shouldPay) {
      const paymentSuccess = await this.processPayment(model.cost);
      return paymentSuccess;
    }

    return false;
  }

  /**
   * Prompt user to setup Ethiopian payment method
   */
  async promptPaymentSetup() {
    return new Promise((resolve) => {
      Alert.alert(
        'ገንዘብ የመክፈል ዘዴ ያስፈልጋል',
        'የ AI ማገጃ አገልግሎት ለመጠቀም ከሚከተሉት የገንዘብ ክፍያ ዘዴዎች አንዱን ማዘጋጀት ያስፈልግዎታል፡ ቻፓ፣ ቴሌቢር፣ የንግድ ባንክ ቢር',
        [
          {
            text: 'አሁን አዘጋጅ',
            onPress: () => {
              // Navigate to payment setup screen
              // You'll need to implement this navigation
              resolve(true);
            }
          },
          {
            text: 'ውድቅ',
            onPress: () => resolve(false),
            style: 'cancel'
          }
        ]
      );
    });
  }

  /**
   * Prompt for direct payment
   */
  async promptDirectPayment(amount) {
    return new Promise((resolve) => {
      Alert.alert(
        'የክፍያ ማረጋገጫ',
        `ይህ አገልግሎት ${amount} ETB ይፈጅሃል። መቀጠል ይፈልጋሉ?`,
        [
          {
            text: 'አዎ፣ ክፈል',
            onPress: () => resolve(true)
          },
          {
            text: 'ውድቅ',
            onPress: () => resolve(false),
            style: 'cancel'
          }
        ]
      );
    });
  }

  /**
   * Process payment via Ethiopian gateway
   */
  async processPayment(amount, provider = PAYMENT_PROVIDERS.CHAPA) {
    try {
      const paymentData = {
        amount,
        currency: 'ETB',
        provider,
        description: 'AI Matching Service Payment',
        metadata: {
          service: 'ai_matching',
          timestamp: new Date().toISOString()
        }
      };

      // Initialize payment through your payment service
      const paymentResult = await initPayment(paymentData);

      if (paymentResult.success) {
        // Add credits to user account
        await this.addCredits(amount);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Payment processing failed:', error);
      return false;
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(amount) {
    this.userCredits += amount;
    await AsyncStorage.setItem('aiCredits', this.userCredits.toString());
    
    // Sync with server
    try {
      await this.api.post('/user/add-credits', { amount });
    } catch (error) {
      console.warn('Failed to sync credits with server:', error);
    }
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(amount) {
    if (this.userCredits >= amount) {
      this.userCredits -= amount;
      await AsyncStorage.setItem('aiCredits', this.userCredits.toString());
      
      // Sync with server
      try {
        await this.api.post('/user/deduct-credits', { amount });
      } catch (error) {
        console.warn('Failed to sync credit deduction with server:', error);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Execute matching request with retry logic
   */
  async executeMatchingRequest(endpoint, data, options) {
    const { autoRetry = true, maxRetries = 2 } = options;
    let lastError;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const response = await this.api.post(endpoint, data, {
          timeout: 45000 // 45 seconds for AI processing
        });

        return response;
      } catch (error) {
        lastError = error;
        retryCount++;

        if (!autoRetry || retryCount > maxRetries) {
          throw error;
        }

        // Ethiopian internet connection issues are common, wait before retry
        await this.delay(2000 * retryCount); // Exponential backoff
      }
    }

    throw lastError;
  }

  /**
   * Process results for Ethiopian market context
   */
  processResultsForEthiopia(results, type) {
    // Add Ethiopian specific processing
    switch (type) {
      case MATCHING_TYPES.JOB_MATCH:
        return results.map(job => ({
          ...job,
          // Format salary for Ethiopian context
          salary: job.salary ? `${job.salary} ETB` : 'Negotiable',
          // Add Ethiopian specific metadata
          metadata: {
            ...job.metadata,
            isEthiopianCompany: job.metadata?.isEthiopianCompany || false,
            requiresAmharic: job.metadata?.requiresAmharic || false,
            locationFormatted: this.formatEthiopianLocation(job.location)
          }
        }));

      case MATCHING_TYPES.SKILL_MATCH:
        return {
          ...results,
          // Add local training recommendations
          localTrainingOpportunities: this.getEthiopianTrainingOpportunities(results.skillGaps),
          // Format for Ethiopian market
          formattedResults: results.recommendations.map(rec => ({
            ...rec,
            availabilityInEthiopia: rec.availabilityInEthiopia || 'Available',
            localProviders: rec.localProviders || []
          }))
        };

      default:
        return results;
    }
  }

  /**
   * Get Ethiopian localized error messages
   */
  getEthiopianLocalizedError(error) {
    const errorMap = {
      'NETWORK_ERROR': {
        message: 'የበይነመረብ ግንኙነት ችግር አጋጥሞዎታል። እባክዎ እንደገና ይሞክሩ።',
        code: 'NETWORK_ISSUE'
      },
      'PAYMENT_REQUIRED': {
        message: 'ይህን አገልግሎት ለመጠቀም ክፍያ ያስፈልግዎታል።',
        code: 'INSUFFICIENT_CREDITS'
      },
      'TIMEOUT': {
        message: 'ጥያቄው በጣም ረዘመ። እባክዎ ቆጣቢ ከመሆንዎ በኋላ እንደገና ይሞክሩ።',
        code: 'REQUEST_TIMEOUT'
      }
    };

    const errorCode = error.code || error.message;
    return errorMap[errorCode] || {
      message: 'አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
      code: 'UNKNOWN_ERROR'
    };
  }

  /**
   * Format Ethiopian location
   */
  formatEthiopianLocation(location) {
    if (!location) return 'Location not specified';
    
    // Ethiopian regions and cities mapping
    const ethioLocations = {
      'addis ababa': 'አዲስ አበባ',
      'bahir dar': 'ባሕር ዳር',
      'dire dawa': 'ድሬ ዳዋ',
      'hawassa': 'ሀዋሳ',
      'mekelle': 'መቀሌ',
      'jimma': 'ጅማ'
    };

    const lowerLocation = location.toLowerCase();
    return ethioLocations[lowerLocation] || location;
  }

  /**
   * Get Ethiopian training opportunities
   */
  getEthiopianTrainingOpportunities(skillGaps) {
    // This would typically come from your backend
    // For now, return mock data
    return skillGaps.map(skill => ({
      skill,
      localProviders: [
        'Ethiopian Digital Academy',
        'Gebeya Training',
        'Addis Ababa University',
        'Blue Moon Training Center'
      ],
      onlineOptions: [
        'Coursera (with Ethiopian subtitles)',
        'Udemy (local pricing available)',
        'Ethiopian E-Learning Portal'
      ],
      estimatedCost: '500-5000 ETB'
    }));
  }

  /**
   * Utility function for delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle unauthorized access
   */
  async handleUnauthorized() {
    // Clear local storage
    await AsyncStorage.multiRemove(['userToken', 'aiCredits', 'paymentMethods']);
    
    // Navigate to login screen
    // You'll need to implement navigation based on your setup
    console.log('User logged out, redirecting to login...');
  }

  /**
   * Get service status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Get user credits
   */
  getCredits() {
    return this.userCredits;
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods() {
    return this.paymentMethods.filter(method => method.isActive);
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.status !== SERVICE_STATUS.ERROR && this.api;
  }

  /**
   * Reset service status
   */
  resetStatus() {
    this.status = SERVICE_STATUS.IDLE;
  }

  /**
   * Batch matching for multiple users (admin/enterprise feature)
   */
  async batchMatching(usersData, options = {}) {
    try {
      this.status = SERVICE_STATUS.PROCESSING;

      const response = await this.api.post('/ai/batch-match', {
        users: usersData,
        options: {
          ...options,
          currency: 'ETB',
          market: 'ethiopia'
        }
      });

      this.status = SERVICE_STATUS.SUCCESS;
      return {
        success: true,
        data: response.data,
        totalProcessed: usersData.length
      };
    } catch (error) {
      this.status = SERVICE_STATUS.ERROR;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get matching history
   */
  async getMatchingHistory(limit = 20, offset = 0) {
    try {
      const response = await this.api.get('/ai/matching-history', {
        params: { limit, offset }
      });

      return {
        success: true,
        data: response.data,
        hasMore: response.data.length === limit
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export matching results
   */
  async exportResults(matchingId, format = 'json') {
    try {
      const response = await this.api.get(`/ai/export/${matchingId}`, {
        params: { format },
        responseType: 'blob'
      });

      // Save file locally
      const fileUri = `${FileSystem.documentDirectory}matching_${matchingId}.${format}`;
      await FileSystem.writeAsStringAsync(fileUri, response.data);

      return {
        success: true,
        fileUri,
        format
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const aiMatchingService = new AIMatchingService();

// Export the service instance and constants
export {
  aiMatchingService as default,
  SERVICE_STATUS,
  MATCHING_TYPES,
  PAYMENT_PROVIDERS,
  AI_MODELS
};