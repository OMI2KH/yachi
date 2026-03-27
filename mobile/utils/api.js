/**
 * @file API Utility Functions
 * @description Enterprise-level API client with Ethiopian market optimizations
 * @version 1.0.0
 * @module utils/api
 */

import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { API_CONFIG, ERROR_MESSAGES, HTTP_STATUS } from '../constants/api';
import { storage } from './storage';
import { security } from './security';

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {*} data - Response data
 * @property {string} [message] - Optional message from server
 * @property {string} [errorCode] - Error code for client handling
 * @property {Object} [metadata] - Additional metadata
 * @property {string} requestId - Unique request identifier
 * @property {number} timestamp - Response timestamp
 */

/**
 * @typedef {Object} ApiRequestOptions
 * @property {string} [method] - HTTP method (GET, POST, PUT, DELETE)
 * @property {Object} [headers] - Additional headers
 * @property {*} [body] - Request body
 * @property {number} [timeout] - Request timeout in milliseconds
 * @property {boolean} [requiresAuth] - Whether authentication is required
 * @property {boolean} [retryOnFailure] - Whether to retry on failure
 * @property {number} [maxRetries] - Maximum number of retry attempts
 * @property {boolean} [cacheResponse] - Whether to cache response
 * @property {number} [cacheTTL] - Cache time-to-live in seconds
 * @property {string} [apiVersion] - API version to use
 * @property {string} [paymentGateway] - Specific payment gateway for payment requests
 */

/**
 * @typedef {Object} ApiError
 * @property {string} code - Error code
 * @property {string} message - Human-readable error message
 * @property {number} [status] - HTTP status code
 * @property {string} [requestId] - Request identifier
 * @property {*} [details] - Additional error details
 * @property {boolean} isNetworkError - Whether error is network-related
 * @property {boolean} isServerError - Whether error is server-side
 * @property {boolean} isAuthError - Whether error is authentication-related
 */

/**
 * API Client Class - Enterprise-grade API client with Ethiopian optimizations
 */
class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.DEFAULT_TIMEOUT;
    this.retryConfig = API_CONFIG.RETRY_CONFIG;
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.requestInterceptor = null;
    this.responseInterceptor = null;
    
    this.init();
  }

  /**
   * Initialize API client
   */
  init() {
    this.setupInterceptors();
    this.setupNetworkMonitoring();
  }

  /**
   * Setup request/response interceptors
   */
  setupInterceptors() {
    // Request interceptor
    this.requestInterceptor = async (config) => {
      const timestamp = Date.now();
      const requestId = this.generateRequestId();
      
      // Add authentication token if available
      if (config.requiresAuth !== false) {
        const token = await storage.get('authToken');
        if (token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`,
          };
        }
      }

      // Add common headers
      config.headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-ID': requestId,
        'X-Client-Platform': Platform.OS,
        'X-Client-Version': API_CONFIG.CLIENT_VERSION,
        'X-Client-Language': await this.getCurrentLanguage(),
        'X-Timestamp': timestamp.toString(),
        ...config.headers,
      };

      // Add signature for sensitive requests
      if (this.isSensitiveRequest(config)) {
        const signature = await this.generateRequestSignature(config);
        config.headers['X-Signature'] = signature;
      }

      config.requestId = requestId;
      config.timestamp = timestamp;

      return config;
    };

    // Response interceptor
    this.responseInterceptor = async (response, config) => {
      // Cache response if configured
      if (config.cacheResponse && response.success) {
        await this.cacheResponse(config, response);
      }

      // Log successful request
      this.logRequest('SUCCESS', config, response);

      return response;
    };
  }

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      this.connectionType = state.type;
      
      if (!state.isConnected) {
        this.emitNetworkStatusChange(false);
      }
    });
  }

  /**
   * Main request method
   * @param {string} endpoint - API endpoint
   * @param {ApiRequestOptions} options - Request options
   * @returns {Promise<ApiResponse>}
   */
  async request(endpoint, options = {}) {
    const config = await this.prepareRequestConfig(endpoint, options);
    
    // Check for cached response
    if (config.method === 'GET' && config.cacheResponse) {
      const cached = await this.getCachedResponse(config);
      if (cached) {
        return cached;
      }
    }

    // Check if request is already pending (deduplication)
    const requestKey = this.getRequestKey(config);
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    try {
      // Execute request with retry logic
      const requestPromise = this.executeRequestWithRetry(config);
      this.pendingRequests.set(requestKey, requestPromise);

      const response = await requestPromise;
      return response;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Prepare request configuration
   * @param {string} endpoint 
   * @param {ApiRequestOptions} options 
   * @returns {Promise<Object>}
   */
  async prepareRequestConfig(endpoint, options) {
    const defaultConfig = {
      method: 'GET',
      headers: {},
      timeout: this.timeout,
      requiresAuth: true,
      retryOnFailure: true,
      maxRetries: this.retryConfig.MAX_RETRIES,
      cacheResponse: false,
      cacheTTL: this.retryConfig.CACHE_TTL,
      apiVersion: 'v1',
    };

    const config = { ...defaultConfig, ...options, endpoint };
    
    // Apply request interceptor
    if (this.requestInterceptor) {
      return await this.requestInterceptor(config);
    }

    return config;
  }

  /**
   * Execute request with retry logic
   * @param {Object} config 
   * @returns {Promise<ApiResponse>}
   */
  async executeRequestWithRetry(config) {
    let lastError;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await this.executeSingleRequest(config);
        return response;
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain error types
        if (!this.shouldRetry(error, attempt, config)) {
          break;
        }

        // Calculate retry delay with exponential backoff
        const delay = this.calculateRetryDelay(attempt);
        
        // Wait before retry
        if (attempt < config.maxRetries) {
          await this.delay(delay);
        }
      }
    }

    throw this.normalizeError(lastError, config);
  }

  /**
   * Execute single HTTP request
   * @param {Object} config 
   * @returns {Promise<ApiResponse>}
   */
  async executeSingleRequest(config) {
    const { method, body, headers, timeout, endpoint } = config;
    const url = this.buildUrl(endpoint, config);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions = {
        method,
        headers,
        signal: controller.signal,
        ...(body && method !== 'GET' && { body: JSON.stringify(body) }),
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      return await this.handleResponse(response, config);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Handle API response
   * @param {Response} response 
   * @param {Object} config 
   * @returns {Promise<ApiResponse>}
   */
  async handleResponse(response, config) {
    const contentType = response.headers.get('content-type');
    let data;

    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (parseError) {
      throw this.createError(
        'PARSE_ERROR',
        'Failed to parse response',
        response.status,
        config.requestId
      );
    }

    if (!response.ok) {
      throw this.createError(
        data?.code || `HTTP_${response.status}`,
        data?.message || `Request failed with status ${response.status}`,
        response.status,
        config.requestId,
        data?.details
      );
    }

    const apiResponse = {
      success: true,
      data: data?.data || data,
      message: data?.message,
      errorCode: data?.errorCode,
      metadata: data?.metadata,
      requestId: config.requestId,
      timestamp: Date.now(),
    };

    // Apply response interceptor
    if (this.responseInterceptor) {
      return await this.responseInterceptor(apiResponse, config);
    }

    return apiResponse;
  }

  /**
   * Build complete URL for request
   * @param {string} endpoint 
   * @param {Object} config 
   * @returns {string}
   */
  buildUrl(endpoint, config) {
    const version = config.apiVersion || 'v1';
    const base = config.paymentGateway 
      ? this.getPaymentGatewayUrl(config.paymentGateway)
      : this.baseURL;
    
    return `${base}/${version}${endpoint}`;
  }

  /**
   * Get payment gateway specific URL
   * @param {string} gateway 
   * @returns {string}
   */
  getPaymentGatewayUrl(gateway) {
    const gateways = {
      chapa: API_CONFIG.PAYMENT_GATEWAYS.CHAPA_BASE_URL,
      telebirr: API_CONFIG.PAYMENT_GATEWAYS.TELEBIRR_BASE_URL,
      cbe_birr: API_CONFIG.PAYMENT_GATEWAYS.CBE_BIRR_BASE_URL,
    };

    return gateways[gateway] || this.baseURL;
  }

  /**
   * Generate unique request ID
   * @returns {string}
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get request cache key
   * @param {Object} config 
   * @returns {string}
   */
  getRequestKey(config) {
    return `${config.method}:${config.endpoint}:${JSON.stringify(config.body || {})}`;
  }

  /**
   * Cache response data
   * @param {Object} config 
   * @param {ApiResponse} response 
   */
  async cacheResponse(config, response) {
    const key = this.getRequestKey(config);
    const cacheData = {
      data: response,
      timestamp: Date.now(),
      ttl: config.cacheTTL,
    };

    this.cache.set(key, cacheData);

    // Schedule cache cleanup
    setTimeout(() => {
      this.cache.delete(key);
    }, config.cacheTTL * 1000);
  }

  /**
   * Get cached response
   * @param {Object} config 
   * @returns {ApiResponse|null}
   */
  async getCachedResponse(config) {
    const key = this.getRequestKey(config);
    const cached = this.cache.get(key);

    if (cached && (Date.now() - cached.timestamp) < (cached.ttl * 1000)) {
      this.logRequest('CACHE_HIT', config, cached.data);
      return cached.data;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Check if request should be retried
   * @param {ApiError} error 
   * @param {number} attempt 
   * @param {Object} config 
   * @returns {boolean}
   */
  shouldRetry(error, attempt, config) {
    if (!config.retryOnFailure) return false;
    if (attempt >= config.maxRetries) return false;
    if (error.isAuthError) return false;
    if (error.code === 'NETWORK_ERROR') return true;
    if (error.status >= 500) return true;
    if (error.status === 429) return true; // Rate limiting
    
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt 
   * @returns {number}
   */
  calculateRetryDelay(attempt) {
    const baseDelay = this.retryConfig.BASE_DELAY;
    const maxDelay = this.retryConfig.MAX_DELAY;
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Add jitter to prevent thundering herd
    return delay * (0.5 + Math.random() * 0.5);
  }

  /**
   * Create standardized error object
   * @param {string} code 
   * @param {string} message 
   * @param {number} status 
   * @param {string} requestId 
   * @param {*} details 
   * @returns {ApiError}
   */
  createError(code, message, status, requestId, details = null) {
    return {
      code,
      message,
      status,
      requestId,
      details,
      isNetworkError: code === 'NETWORK_ERROR',
      isServerError: status >= 500,
      isAuthError: status === 401 || status === 403,
    };
  }

  /**
   * Normalize error for consistent handling
   * @param {Error} error 
   * @param {Object} config 
   * @returns {ApiError}
   */
  normalizeError(error, config) {
    if (error.name === 'AbortError') {
      return this.createError(
        'TIMEOUT_ERROR',
        'Request timeout exceeded',
        408,
        config.requestId
      );
    }

    if (error.code === 'NETWORK_ERROR' || !this.isOnline) {
      return this.createError(
        'NETWORK_ERROR',
        'Network connection unavailable',
        0,
        config.requestId
      );
    }

    // Already an ApiError
    if (error.code && error.message) {
      return error;
    }

    // Unknown error
    return this.createError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      0,
      config.requestId,
      { originalError: error.message }
    );
  }

  /**
   * Check if request contains sensitive data
   * @param {Object} config 
   * @returns {boolean}
   */
  isSensitiveRequest(config) {
    const sensitiveEndpoints = [
      '/auth/login',
      '/auth/register',
      '/payment',
      '/user/password',
    ];

    return sensitiveEndpoints.some(endpoint => 
      config.endpoint.includes(endpoint)
    );
  }

  /**
   * Generate request signature for security
   * @param {Object} config 
   * @returns {Promise<string>}
   */
  async generateRequestSignature(config) {
    const timestamp = config.timestamp;
    const method = config.method;
    const endpoint = config.endpoint;
    const bodyString = config.body ? JSON.stringify(config.body) : '';
    
    const signData = `${timestamp}${method}${endpoint}${bodyString}`;
    return await security.generateSignature(signData);
  }

  /**
   * Get current app language
   * @returns {Promise<string>}
   */
  async getCurrentLanguage() {
    try {
      return await storage.get('appLanguage') || 'en';
    } catch {
      return 'en';
    }
  }

  /**
   * Utility delay function
   * @param {number} ms 
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log request for monitoring
   * @param {string} type 
   * @param {Object} config 
   * @param {*} response 
   */
  logRequest(type, config, response) {
    if (!API_CONFIG.LOGGING_ENABLED) return;

    const logEntry = {
      type,
      requestId: config.requestId,
      endpoint: config.endpoint,
      method: config.method,
      timestamp: config.timestamp,
      duration: Date.now() - config.timestamp,
      success: response?.success,
      ...(type === 'ERROR' && { error: response }),
    };

    console.log(`[API ${type}]`, logEntry);
  }

  /**
   * Emit network status change event
   * @param {boolean} isOnline 
   */
  emitNetworkStatusChange(isOnline) {
    // Could be integrated with event bus or context
    if (typeof this.onNetworkChange === 'function') {
      this.onNetworkChange(isOnline);
    }
  }

  // Convenience methods for common HTTP verbs
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  async put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Specialized API methods for Yachi features
  async uploadFile(file, endpoint = '/upload', options = {}) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options.headers,
      },
    });
  }

  async paymentRequest(gateway, paymentData, options = {}) {
    return this.request('/payment/process', {
      ...options,
      method: 'POST',
      body: paymentData,
      paymentGateway: gateway,
      requiresAuth: true,
    });
  }

  async aiConstructionMatch(projectData, options = {}) {
    return this.post('/ai/construction/match', projectData, {
      ...options,
      timeout: 30000, // Longer timeout for AI processing
    });
  }

  async governmentProjectBulk(projectData, options = {}) {
    return this.post('/government/projects/bulk', projectData, {
      ...options,
      requiresAuth: true,
    });
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();
export default apiClient;

// Export individual functions for specific use cases
export const api = {
  // Core methods
  request: (endpoint, options) => apiClient.request(endpoint, options),
  get: (endpoint, options) => apiClient.get(endpoint, options),
  post: (endpoint, body, options) => apiClient.post(endpoint, body, options),
  put: (endpoint, body, options) => apiClient.put(endpoint, body, options),
  patch: (endpoint, body, options) => apiClient.patch(endpoint, body, options),
  delete: (endpoint, options) => apiClient.delete(endpoint, options),

  // Specialized methods
  uploadFile: (file, endpoint, options) => apiClient.uploadFile(file, endpoint, options),
  payment: (gateway, paymentData, options) => apiClient.paymentRequest(gateway, paymentData, options),
  aiMatch: (projectData, options) => apiClient.aiConstructionMatch(projectData, options),
  governmentBulk: (projectData, options) => apiClient.governmentProjectBulk(projectData, options),

  // Utility methods
  setAuthToken: (token) => storage.set('authToken', token),
  clearAuthToken: () => storage.remove('authToken'),
  setBaseURL: (url) => { apiClient.baseURL = url; },
  setRequestInterceptor: (interceptor) => { apiClient.requestInterceptor = interceptor; },
  setResponseInterceptor: (interceptor) => { apiClient.responseInterceptor = interceptor; },
  clearCache: () => { apiClient.cache.clear(); },
  getPendingRequests: () => apiClient.pendingRequests.size,
};

// Error handling utilities
export const ApiErrorHandler = {
  /**
   * Handle API errors in a user-friendly way
   * @param {ApiError} error 
   * @param {string} context 
   * @returns {string} User-friendly error message
   */
  getUserMessage: (error, context = 'operation') => {
    if (error.isNetworkError) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    if (error.isAuthError) {
      return ERROR_MESSAGES.AUTH_ERROR;
    }

    if (error.isServerError) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }

    // Context-specific error messages
    const contextMessages = {
      payment: ERROR_MESSAGES.PAYMENT_ERROR,
      upload: ERROR_MESSAGES.UPLOAD_ERROR,
      booking: ERROR_MESSAGES.BOOKING_ERROR,
      construction: ERROR_MESSAGES.CONSTRUCTION_ERROR,
    };

    return contextMessages[context] || error.message || ERROR_MESSAGES.DEFAULT_ERROR;
  },

  /**
   * Check if error is recoverable
   * @param {ApiError} error 
   * @returns {boolean}
   */
  isRecoverable: (error) => {
    return error.isNetworkError || error.isServerError || error.code === 'TIMEOUT_ERROR';
  },

  /**
   * Log error for analytics
   * @param {ApiError} error 
   * @param {string} context 
   */
  logError: (error, context) => {
    const errorLog = {
      context,
      errorCode: error.code,
      message: error.message,
      status: error.status,
      requestId: error.requestId,
      timestamp: Date.now(),
      isNetworkError: error.isNetworkError,
      isServerError: error.isServerError,
    };

    console.error('[API Error]', errorLog);
    // TODO: Send to analytics service
  },
};