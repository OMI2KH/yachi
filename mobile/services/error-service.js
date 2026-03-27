/**
 * Yachi Error Service
 * Enterprise-level error handling, monitoring, and recovery service
 * Comprehensive error tracking, analysis, and automated resolution
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { getDeviceId } from 'expo-device';
import NetInfo from '@react-native-community/netinfo';

// Third-party services
import * as Sentry from 'sentry-expo';

// Internal services
import { analyticsService } from './analytics-service';
import { notificationService } from './notification-service';
import { storageService } from './storage-service';

// Constants
import { 
  ERROR_SEVERITY, 
  ERROR_CATEGORIES, 
  ERROR_CODES,
  RECOVERY_STRATEGIES
} from '../constants/errors';
import { APP_ENV } from '../constants/app';

/**
 * Enterprise Error Service Class
 */
class ErrorService {
  constructor() {
    this.isInitialized = false;
    this.errorBuffer = [];
    this.maxBufferSize = 100;
    this.reportingEnabled = true;
    this.autoRecoveryEnabled = true;
    
    // Error patterns for intelligent handling
    this.errorPatterns = new Map();
    this.recoveryStrategies = new Map();
    
    // Performance monitoring
    this.performanceThresholds = new Map();
    this.errorRates = new Map();
    
    this.initialize();
  }

  /**
   * Initialize error service with all providers
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize error reporting services
      await this.initializeSentry();
      
      // Load error patterns and recovery strategies
      await this.loadErrorPatterns();
      await this.loadRecoveryStrategies();
      
      // Set up global error handlers
      this.setupGlobalHandlers();
      
      // Set up performance monitoring
      this.setupPerformanceMonitoring();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();

      this.isInitialized = true;
      
      console.log('🐛 Error Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize error service:', error);
      // Continue without error reporting rather than failing completely
    }
  }

  /**
   * Initialize Sentry for error reporting
   */
  async initializeSentry() {
    if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
      console.warn('Sentry DSN not configured, error reporting disabled');
      this.reportingEnabled = false;
      return;
    }

    try {
      Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        environment: APP_ENV,
        enableInExpoDevelopment: true,
        debug: __DEV__,
        integrations: [
          new Sentry.Native.ReactNativeTracing({
            tracingOrigins: ['localhost', process.env.EXPO_PUBLIC_API_URL],
          }),
        ],
        tracesSampleRate: __DEV__ ? 1.0 : 0.1,
        beforeSend: (event) => this.beforeSentrySend(event),
      });

      // Configure scope with app context
      Sentry.Native.configureScope((scope) => {
        scope.setTag('platform', Platform.OS);
        scope.setTag('app_version', this.getAppVersion());
        scope.setContext('device', this.getDeviceContext());
      });

    } catch (error) {
      console.error('Sentry initialization failed:', error);
      this.reportingEnabled = false;
    }
  }

  /**
   * Capture and handle error with comprehensive context
   */
  async captureError(error, context = {}) {
    try {
      // Enrich error with context
      const enrichedError = this.enrichError(error, context);
      
      // Categorize error
      const category = this.categorizeError(enrichedError);
      
      // Determine severity
      const severity = this.determineSeverity(enrichedError, category);
      
      // Create error record
      const errorRecord = this.createErrorRecord(enrichedError, category, severity, context);
      
      // Buffer error for batch processing
      this.bufferError(errorRecord);
      
      // Attempt automatic recovery
      if (this.autoRecoveryEnabled) {
        await this.attemptAutoRecovery(errorRecord);
      }
      
      // Report to monitoring services
      await this.reportError(errorRecord);
      
      // Update error rates and analytics
      this.updateErrorMetrics(errorRecord);
      
      // Show user-friendly error if applicable
      if (this.shouldShowUserError(errorRecord)) {
        await this.showUserError(errorRecord);
      }
      
      // Log for development
      if (__DEV__) {
        this.logErrorForDevelopment(errorRecord);
      }
      
      return errorRecord;

    } catch (handlingError) {
      // If error handling itself fails, log minimally
      console.error('Error handling failed:', handlingError);
      console.error('Original error:', error);
    }
  }

  /**
   * Capture network error with request context
   */
  async captureNetworkError(error, requestContext = {}) {
    const networkContext = {
      ...requestContext,
      category: ERROR_CATEGORIES.NETWORK,
      networkState: await this.getNetworkState(),
      timestamp: Date.now()
    };

    return this.captureError(error, networkContext);
  }

  /**
   * Capture API error with response context
   */
  async captureApiError(error, apiContext = {}) {
    const enrichedContext = {
      ...apiContext,
      category: ERROR_CATEGORIES.API,
      endpoint: apiContext.url,
      method: apiContext.method,
      statusCode: apiContext.status,
      responseBody: apiContext.response,
      timestamp: Date.now()
    };

    return this.captureError(error, enrichedContext);
  }

  /**
   * Capture payment error with transaction context
   */
  async capturePaymentError(error, paymentContext = {}) {
    const enrichedContext = {
      ...paymentContext,
      category: ERROR_CATEGORIES.PAYMENT,
      gateway: paymentContext.gateway,
      transactionId: paymentContext.transactionId,
      amount: paymentContext.amount,
      currency: paymentContext.currency,
      timestamp: Date.now()
    };

    return this.captureError(error, enrichedContext);
  }

  /**
   * Capture performance issue with metrics
   */
  async capturePerformanceIssue(metricName, value, threshold, context = {}) {
    const error = new Error(`Performance threshold exceeded: ${metricName}`);
    
    const performanceContext = {
      ...context,
      category: ERROR_CATEGORIES.PERFORMANCE,
      metricName,
      value,
      threshold,
      severity: ERROR_SEVERITY.LOW,
      isPerformanceIssue: true,
      timestamp: Date.now()
    };

    return this.captureError(error, performanceContext);
  }

  /**
   * Enrich error with contextual information
   */
  enrichError(error, context) {
    const enriched = {
      ...error,
      name: error.name || 'UnknownError',
      message: error.message || 'Unknown error occurred',
      stack: error.stack,
      // Technical context
      timestamp: Date.now(),
      deviceId: this.deviceId,
      platform: Platform.OS,
      appVersion: this.getAppVersion(),
      // Session context
      sessionId: context.sessionId,
      userId: context.userId,
      // App state context
      appState: context.appState || 'unknown',
      screen: context.screen,
      userAction: context.userAction,
      // Network context
      isConnected: context.isConnected,
      connectionType: context.connectionType,
      // Custom context
      ...context
    };

    // Add Ethiopian market context
    enriched.localTime = new Date().toLocaleString('en-ET');
    enriched.timezone = 'Africa/Addis_Ababa';

    return enriched;
  }

  /**
   * Categorize error for intelligent handling
   */
  categorizeError(error) {
    // Network-related errors
    if (error.message?.includes('network') || 
        error.message?.includes('offline') ||
        error.message?.includes('connect')) {
      return ERROR_CATEGORIES.NETWORK;
    }

    // API-related errors
    if (error.message?.includes('API') || 
        error.message?.includes('HTTP') ||
        error.statusCode) {
      return ERROR_CATEGORIES.API;
    }

    // Authentication errors
    if (error.message?.includes('auth') || 
        error.message?.includes('login') ||
        error.message?.includes('token')) {
      return ERROR_CATEGORIES.AUTHENTICATION;
    }

    // Payment errors
    if (error.message?.includes('payment') || 
        error.message?.includes('transaction') ||
        error.gateway) {
      return ERROR_CATEGORIES.PAYMENT;
    }

    // Database errors
    if (error.message?.includes('database') || 
        error.message?.includes('query') ||
        error.message?.includes('storage')) {
      return ERROR_CATEGORIES.DATABASE;
    }

    // Validation errors
    if (error.message?.includes('validation') || 
        error.message?.includes('invalid') ||
        error.message?.includes('required')) {
      return ERROR_CATEGORIES.VALIDATION;
    }

    // Performance issues
    if (error.isPerformanceIssue) {
      return ERROR_CATEGORIES.PERFORMANCE;
    }

    return ERROR_CATEGORIES.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, category) {
    // Critical errors that break core functionality
    if (category === ERROR_CATEGORIES.AUTHENTICATION && 
        error.message?.includes('token expired')) {
      return ERROR_SEVERITY.CRITICAL;
    }

    if (category === ERROR_CATEGORIES.PAYMENT && 
        error.message?.includes('failed')) {
      return ERROR_SEVERITY.HIGH;
    }

    if (error.message?.includes('out of memory') ||
        error.message?.includes('crash')) {
      return ERROR_SEVERITY.CRITICAL;
    }

    // High severity for business-critical errors
    if (category === ERROR_CATEGORIES.API && 
        error.statusCode >= 500) {
      return ERROR_SEVERITY.HIGH;
    }

    // Medium severity for recoverable errors
    if (category === ERROR_CATEGORIES.NETWORK ||
        category === ERROR_CATEGORIES.VALIDATION) {
      return ERROR_SEVERITY.MEDIUM;
    }

    // Low severity for non-critical issues
    if (category === ERROR_CATEGORIES.PERFORMANCE) {
      return ERROR_SEVERITY.LOW;
    }

    return ERROR_SEVERITY.MEDIUM;
  }

  /**
   * Create comprehensive error record
   */
  createErrorRecord(error, category, severity, context) {
    return {
      id: this.generateErrorId(),
      category,
      severity,
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: error.timestamp,
      // Contextual data
      device: {
        platform: Platform.OS,
        version: Platform.Version,
        deviceId: this.deviceId,
        appVersion: this.getAppVersion()
      },
      user: {
        id: context.userId,
        authenticated: !!context.userId
      },
      session: {
        id: context.sessionId,
        screen: context.screen,
        userAction: context.userAction
      },
      network: {
        isConnected: context.isConnected,
        connectionType: context.connectionType
      },
      app: {
        state: context.appState,
        environment: APP_ENV,
        localTime: error.localTime
      },
      // Additional context
      context: {
        ...context,
        // Remove sensitive data
        password: undefined,
        token: undefined,
        creditCard: undefined
      },
      // Error resolution tracking
      resolved: false,
      recoveryAttempted: false,
      recoveryStrategy: null,
      userNotified: false
    };
  }

  /**
   * Attempt automatic error recovery
   */
  async attemptAutoRecovery(errorRecord) {
    try {
      const recoveryStrategy = this.getRecoveryStrategy(errorRecord);
      
      if (!recoveryStrategy) {
        return { attempted: false, success: false, reason: 'No strategy available' };
      }

      errorRecord.recoveryAttempted = true;
      errorRecord.recoveryStrategy = recoveryStrategy.name;

      switch (recoveryStrategy.type) {
        case RECOVERY_STRATEGIES.RETRY:
          return await this.executeRetryStrategy(errorRecord, recoveryStrategy);
        
        case RECOVERY_STRATEGIES.FALLBACK:
          return await this.executeFallbackStrategy(errorRecord, recoveryStrategy);
        
        case RECOVERY_STRATEGIES.CACHE:
          return await this.executeCacheStrategy(errorRecord, recoveryStrategy);
        
        case RECOVERY_STRATEGIES.AUTH_REFRESH:
          return await this.executeAuthRefreshStrategy(errorRecord, recoveryStrategy);
        
        default:
          return { attempted: true, success: false, reason: 'Unknown strategy type' };
      }

    } catch (recoveryError) {
      console.error('Auto-recovery failed:', recoveryError);
      return { attempted: true, success: false, reason: recoveryError.message };
    }
  }

  /**
   * Execute retry strategy for transient errors
   */
  async executeRetryStrategy(errorRecord, strategy) {
    const maxRetries = strategy.maxRetries || 3;
    const retryDelay = strategy.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait before retry (except first attempt)
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }

        // Re-execute the failed operation
        const result = await this.retryOperation(errorRecord);
        
        if (result.success) {
          errorRecord.resolved = true;
          await this.trackRecoverySuccess(errorRecord, attempt);
          return { attempted: true, success: true, attempts: attempt };
        }

      } catch (retryError) {
        console.warn(`Retry attempt ${attempt} failed:`, retryError);
        
        // If this was the last attempt, report the failure
        if (attempt === maxRetries) {
          await this.trackRecoveryFailure(errorRecord, attempt, retryError);
        }
      }
    }

    return { attempted: true, success: false, attempts: maxRetries };
  }

  /**
   * Execute fallback strategy
   */
  async executeFallbackStrategy(errorRecord, strategy) {
    try {
      // Execute fallback operation
      const fallbackResult = await this.executeFallbackOperation(errorRecord, strategy);
      
      if (fallbackResult.success) {
        errorRecord.resolved = true;
        await this.trackRecoverySuccess(errorRecord, 1);
        return { attempted: true, success: true, usedFallback: true };
      }

      return { attempted: true, success: false, reason: 'Fallback operation failed' };

    } catch (fallbackError) {
      console.error('Fallback strategy failed:', fallbackError);
      return { attempted: true, success: false, reason: fallbackError.message };
    }
  }

  /**
   * Get appropriate recovery strategy for error
   */
  getRecoveryStrategy(errorRecord) {
    // Network errors - retry with exponential backoff
    if (errorRecord.category === ERROR_CATEGORIES.NETWORK) {
      return {
        type: RECOVERY_STRATEGIES.RETRY,
        name: 'network_retry',
        maxRetries: 3,
        retryDelay: 1000
      };
    }

    // Authentication errors - refresh token
    if (errorRecord.category === ERROR_CATEGORIES.AUTHENTICATION &&
        errorRecord.message?.includes('token')) {
      return {
        type: RECOVERY_STRATEGIES.AUTH_REFRESH,
        name: 'token_refresh',
        maxAttempts: 1
      };
    }

    // API errors with 5xx status - retry
    if (errorRecord.category === ERROR_CATEGORIES.API &&
        errorRecord.context?.statusCode >= 500) {
      return {
        type: RECOVERY_STRATEGIES.RETRY,
        name: 'api_retry',
        maxRetries: 2,
        retryDelay: 2000
      };
    }

    // Data fetch errors - use cached data
    if (errorRecord.category === ERROR_CATEGORIES.API &&
        errorRecord.context?.operation === 'data_fetch') {
      return {
        type: RECOVERY_STRATEGIES.CACHE,
        name: 'cache_fallback',
        cacheKey: errorRecord.context.cacheKey
      };
    }

    return null;
  }

  /**
   * Report error to monitoring services
   */
  async reportError(errorRecord) {
    if (!this.reportingEnabled) return;

    try {
      // Report to Sentry
      if (Sentry.Native.captureException) {
        Sentry.Native.withScope((scope) => {
          // Set error context
          scope.setTag('category', errorRecord.category);
          scope.setTag('severity', errorRecord.severity);
          scope.setTag('platform', Platform.OS);
          
          // Set extra context
          scope.setExtra('device', errorRecord.device);
          scope.setExtra('user', errorRecord.user);
          scope.setExtra('session', errorRecord.session);
          scope.setExtra('network', errorRecord.network);
          
          // Capture exception
          const sentryError = new Error(errorRecord.message);
          sentryError.name = errorRecord.name;
          sentryError.stack = errorRecord.stack;
          
          Sentry.Native.captureException(sentryError);
        });
      }

      // Report to analytics
      await analyticsService.track('error_occurred', {
        error_id: errorRecord.id,
        category: errorRecord.category,
        severity: errorRecord.severity,
        message: errorRecord.message,
        screen: errorRecord.session.screen,
        user_action: errorRecord.session.userAction
      });

      // Report to backend for aggregation (in production)
      if (APP_ENV === 'production') {
        await this.reportToBackend(errorRecord);
      }

    } catch (reportingError) {
      console.error('Error reporting failed:', reportingError);
    }
  }

  /**
   * Show user-friendly error message
   */
  async showUserError(errorRecord) {
    // Don't show errors in development
    if (__DEV__) return;

    // Only show certain errors to users
    if (errorRecord.severity === ERROR_SEVERITY.LOW) return;

    let userMessage = 'Something went wrong. Please try again.';
    let actions = ['OK'];

    switch (errorRecord.category) {
      case ERROR_CATEGORIES.NETWORK:
        userMessage = 'Network connection lost. Please check your internet and try again.';
        actions = ['Retry', 'OK'];
        break;

      case ERROR_CATEGORIES.AUTHENTICATION:
        userMessage = 'Your session has expired. Please sign in again.';
        actions = ['Sign In', 'Cancel'];
        break;

      case ERROR_CATEGORIES.PAYMENT:
        userMessage = 'Payment processing failed. Please check your payment details and try again.';
        actions = ['Retry', 'Cancel'];
        break;

      case ERROR_CATEGORIES.API:
        if (errorRecord.context?.statusCode === 500) {
          userMessage = 'Service temporarily unavailable. Please try again in a few moments.';
        }
        break;
    }

    // Show alert or in-app error message
    await notificationService.showErrorAlert({
      title: 'Error',
      message: userMessage,
      actions: actions,
      errorId: errorRecord.id
    });
  }

  /**
   * Update error metrics and analytics
   */
  updateErrorMetrics(errorRecord) {
    const now = Date.now();
    const minuteKey = Math.floor(now / (60 * 1000)); // Minute bucket
    
    // Update error rates
    const categoryKey = `${errorRecord.category}_${minuteKey}`;
    const currentCount = this.errorRates.get(categoryKey) || 0;
    this.errorRates.set(categoryKey, currentCount + 1);
    
    // Check for error spikes
    this.checkErrorSpikes(errorRecord.category, minuteKey);
    
    // Update performance thresholds if applicable
    if (errorRecord.category === ERROR_CATEGORIES.PERFORMANCE) {
      this.updatePerformanceThresholds(errorRecord);
    }
  }

  /**
   * Check for error rate spikes
   */
  checkErrorSpikes(category, minuteKey) {
    // Get error count for this minute
    const currentCount = this.errorRates.get(`${category}_${minuteKey}`) || 0;
    
    // Get error count for previous minute
    const previousMinuteKey = minuteKey - 1;
    const previousCount = this.errorRates.get(`${category}_${previousMinuteKey}`) || 0;
    
    // Check for spike (more than 5x increase)
    if (previousCount > 0 && currentCount > previousCount * 5) {
      console.warn(`Error spike detected for ${category}: ${currentCount} errors in current minute`);
      
      // Report spike to monitoring
      analyticsService.track('error_spike_detected', {
        category,
        current_count: currentCount,
        previous_count: previousCount,
        increase_ratio: currentCount / previousCount
      });
    }
  }

  /**
   * Set up global error handlers
   */
  setupGlobalHandlers() {
    // Global promise rejection handler
    if (Platform.OS === 'web') {
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(event.reason, {
          category: ERROR_CATEGORIES.UNHANDLED_PROMISE,
          context: 'global_promise_rejection'
        });
      });
    }

    // React Native error handler
    if (Platform.OS !== 'web') {
      const defaultHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.captureError(error, {
          category: isFatal ? ERROR_CATEGORIES.FATAL : ERROR_CATEGORIES.JAVASCRIPT,
          isFatal,
          context: 'global_error_handler'
        });
        
        // Call original handler
        if (defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
    }
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor key performance metrics
    this.performanceThresholds.set('api_response_time', 5000); // 5 seconds
    this.performanceThresholds.set('navigation_time', 1000); // 1 second
    this.performanceThresholds.set('image_load_time', 3000); // 3 seconds
    
    // Set up periodic performance checks
    this.performanceInterval = setInterval(() => {
      this.checkPerformanceMetrics();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Set up network monitoring
   */
  setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.networkState = state;
    });
  }

  /**
   * Utility Methods
   */

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAppVersion() {
    return Application.nativeApplicationVersion || '1.0.0';
  }

  getDeviceContext() {
    return {
      deviceId: this.deviceId,
      platform: Platform.OS,
      version: Platform.Version,
      appVersion: this.getAppVersion()
    };
  }

  async getNetworkState() {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state.details
    };
  }

  bufferError(errorRecord) {
    this.errorBuffer.push(errorRecord);
    
    // Maintain buffer size
    if (this.errorBuffer.length > this.maxBufferSize) {
      this.errorBuffer.shift(); // Remove oldest error
    }
    
    // Flush buffer periodically or when full
    if (this.errorBuffer.length >= this.maxBufferSize * 0.8) {
      this.flushErrorBuffer();
    }
  }

  async flushErrorBuffer() {
    if (this.errorBuffer.length === 0) return;
    
    // In a real implementation, this would batch send errors to backend
    console.log(`Flushing ${this.errorBuffer.length} errors from buffer`);
    
    // Clear buffer after flushing
    this.errorBuffer = [];
  }

  beforeSentrySend(event) {
    // Filter out sensitive data
    if (event.request) {
      if (event.request.headers) {
        event.request.headers.Authorization = '[Filtered]';
      }
      if (event.request.data) {
        event.request.data = this.filterSensitiveData(event.request.data);
      }
    }
    
    // Add custom context
    event.tags = {
      ...event.tags,
      platform: Platform.OS,
      app_version: this.getAppVersion()
    };
    
    return event;
  }

  filterSensitiveData(data) {
    if (typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'creditCard', 'cvv', 'ssn'];
    const filtered = { ...data };
    
    sensitiveFields.forEach(field => {
      if (filtered[field]) {
        filtered[field] = '[Filtered]';
      }
    });
    
    return filtered;
  }

  logErrorForDevelopment(errorRecord) {
    console.group(`🚨 Error: ${errorRecord.name}`);
    console.log('Message:', errorRecord.message);
    console.log('Category:', errorRecord.category);
    console.log('Severity:', errorRecord.severity);
    console.log('Context:', errorRecord.context);
    console.log('Stack:', errorRecord.stack);
    console.groupEnd();
  }

  /**
   * Load error patterns for intelligent handling
   */
  async loadErrorPatterns() {
    // Common error patterns and their handling strategies
    this.errorPatterns.set('network_timeout', {
      pattern: /(timeout|network request failed)/i,
      category: ERROR_CATEGORIES.NETWORK,
      severity: ERROR_SEVERITY.MEDIUM,
      recovery: 'retry'
    });
    
    this.errorPatterns.set('token_expired', {
      pattern: /(token expired|invalid token|unauthorized)/i,
      category: ERROR_CATEGORIES.AUTHENTICATION,
      severity: ERROR_SEVERITY.HIGH,
      recovery: 'auth_refresh'
    });
    
    this.errorPatterns.set('validation_error', {
      pattern: /(validation|invalid|required)/i,
      category: ERROR_CATEGORIES.VALIDATION,
      severity: ERROR_SEVERITY.LOW,
      recovery: 'user_fix'
    });
  }

  /**
   * Load recovery strategies
   */
  async loadRecoveryStrategies() {
    // Implementation would load from configuration
  }

  /**
   * Cleanup and destruction
   */
  async destroy() {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    await this.flushErrorBuffer();
    
    this.isInitialized = false;
  }
}

// Create singleton instance
const errorService = new ErrorService();

// Export service instance and class
export { ErrorService, errorService };
export default errorService;