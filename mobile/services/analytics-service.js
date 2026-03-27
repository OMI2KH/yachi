/**
 * Yachi Analytics Service
 * Enterprise-level analytics and business intelligence service
 * Tracks user behavior, business metrics, and system performance
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getDeviceId } from 'expo-device';

// Third-party analytics services
import { 
  getApps, 
  initializeApp, 
  getAnalytics, 
  logEvent,
  setUserProperties,
  setUserId,
  setCurrentScreen
} from 'firebase/analytics';
import { 
  getPerformance, 
  trace,
  incrementMetric,
  putAttribute
} from 'firebase/performance';
import Mixpanel from 'mixpanel-react-native';

// Internal services
import { authService } from './auth-service';
import { errorService } from './error-service';
import { storageService } from './storage-service';

// Constants
import { 
  ANALYTICS_EVENTS, 
  USER_PROPERTIES, 
  BUSINESS_METRICS,
  PERFORMANCE_MARKERS,
  ERROR_SEVERITY
} from '../constants/analytics';

/**
 * Enterprise Analytics Service Class
 */
class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.isEnabled = true;
    this.currentSessionId = null;
    this.userId = null;
    this.deviceId = null;
    this.sessionStartTime = null;
    this.queuedEvents = [];
    this.analyticsProviders = {};
    this.performanceMetrics = new Map();
    this.businessIntelligence = new Map();
    
    // Configuration
    this.config = {
      sampleRate: 1.0, // 100% sampling in development
      flushInterval: 30000, // 30 seconds
      maxQueueSize: 100,
      enablePerformanceMonitoring: true,
      enableBusinessMetrics: true,
      enableErrorTracking: true,
      enableUserJourney: true
    };

    this.initialize();
  }

  /**
   * Initialize analytics service with all providers
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Generate session ID
      this.currentSessionId = this.generateSessionId();
      this.sessionStartTime = Date.now();

      // Get device ID
      this.deviceId = await this.getDeviceId();

      // Initialize analytics providers
      await this.initializeFirebaseAnalytics();
      await this.initializeMixpanel();
      await this.initializeCustomAnalytics();

      // Start session tracking
      this.startSession();

      // Start periodic flushing
      this.startFlushInterval();

      // Track app launch
      this.trackAppLaunch();

      this.isInitialized = true;
      
      console.log('🎯 Analytics Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Initialize Firebase Analytics
   */
  async initializeFirebaseAnalytics() {
    try {
      if (!getApps().length) {
        // Firebase app would be initialized elsewhere, just get analytics
        return;
      }

      this.analyticsProviders.firebase = getAnalytics();
      
      // Set user properties if user is logged in
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        this.setFirebaseUserProperties(currentUser);
      }

    } catch (error) {
      console.error('Firebase Analytics initialization failed:', error);
    }
  }

  /**
   * Initialize Mixpanel
   */
  async initializeMixpanel() {
    try {
      const mixpanelToken = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
      
      if (mixpanelToken) {
        this.analyticsProviders.mixpanel = new Mixpanel(mixpanelToken);
        this.analyticsProviders.mixpanel.init();
        
        // Set super properties
        this.analyticsProviders.mixpanel.register({
          platform: Platform.OS,
          app_version: this.getAppVersion(),
          device_id: this.deviceId
        });
      }
    } catch (error) {
      console.error('Mixpanel initialization failed:', error);
    }
  }

  /**
   * Initialize custom analytics backend
   */
  async initializeCustomAnalytics() {
    // Custom analytics implementation for Yachi backend
    this.analyticsProviders.custom = {
      track: this.trackToBackend.bind(this),
      identify: this.identifyToBackend.bind(this),
      screen: this.screenToBackend.bind(this)
    };
  }

  /**
   * Track custom event with comprehensive metadata
   */
  async track(eventName, properties = {}) {
    if (!this.isEnabled || !this.isInitialized) {
      this.queuedEvents.push({ eventName, properties, timestamp: Date.now() });
      return;
    }

    try {
      const eventData = this.enrichEventData(eventName, properties);
      
      // Track to all providers
      await this.trackToAllProviders(eventName, eventData);

      // Update business intelligence
      this.updateBusinessIntelligence(eventName, eventData);

      // Check for conversion events
      this.checkConversionEvents(eventName, eventData);

      console.log(`📊 Tracked: ${eventName}`, eventData);

    } catch (error) {
      console.error('Event tracking failed:', error);
      this.queueEvent(eventName, properties);
    }
  }

  /**
   * Track screen view with session context
   */
  async trackScreenView(screenName, properties = {}) {
    const screenData = {
      ...properties,
      screen_name: screenName,
      session_id: this.currentSessionId,
      session_duration: this.getSessionDuration(),
      previous_screen: this.previousScreen
    };

    await this.track(ANALYTICS_EVENTS.SCREEN_VIEW, screenData);
    
    // Update current screen for providers that support it
    if (this.analyticsProviders.firebase) {
      setCurrentScreen(this.analyticsProviders.firebase, screenName);
    }

    this.previousScreen = screenName;
  }

  /**
   * Track user action with intent analysis
   */
  async trackUserAction(action, properties = {}) {
    const actionData = {
      ...properties,
      action_type: action,
      user_intent: this.analyzeUserIntent(action, properties),
      action_sequence: this.getActionSequence(action),
      time_since_last_action: this.getTimeSinceLastAction()
    };

    await this.track(ANALYTICS_EVENTS.USER_ACTION, actionData);
    this.lastActionTime = Date.now();
    this.actionSequence.push(action);
  }

  /**
   * Track business transaction
   */
  async trackTransaction(transactionData) {
    const enrichedData = {
      ...transactionData,
      transaction_id: this.generateTransactionId(),
      business_unit: this.determineBusinessUnit(transactionData),
      revenue_impact: this.calculateRevenueImpact(transactionData),
      customer_lifetime_value: await this.calculateCLV(transactionData.userId)
    };

    await this.track(ANALYTICS_EVENTS.TRANSACTION, enrichedData);

    // Update revenue metrics
    this.updateRevenueMetrics(enrichedData);
  }

  /**
   * Track performance metric
   */
  async trackPerformance(metricName, value, attributes = {}) {
    if (!this.config.enablePerformanceMonitoring) return;

    const performanceData = {
      metric_name: metricName,
      value: value,
      unit: this.getPerformanceUnit(metricName),
      ...attributes,
      device_performance: await this.getDevicePerformance(),
      network_condition: await this.getNetworkCondition(),
      timestamp: Date.now()
    };

    await this.track(ANALYTICS_EVENTS.PERFORMANCE, performanceData);

    // Update performance metrics map
    this.performanceMetrics.set(metricName, {
      value,
      timestamp: Date.now(),
      ...attributes
    });

    // Alert on performance degradation
    this.checkPerformanceThresholds(metricName, value);
  }

  /**
   * Track error with severity and context
   */
  async trackError(error, context = {}) {
    if (!this.config.enableErrorTracking) return;

    const errorData = {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      severity: this.determineErrorSeverity(error, context),
      ...context,
      app_state: await this.getAppState(),
      user_flow: this.getCurrentUserFlow(),
      device_info: await this.getDeviceInfo()
    };

    await this.track(ANALYTICS_EVENTS.ERROR, errorData);

    // Send to error service for handling
    errorService.captureError(error, {
      ...context,
      analytics_context: errorData
    });
  }

  /**
   * Track user journey and funnel analysis
   */
  async trackUserJourney(step, properties = {}) {
    if (!this.config.enableUserJourney) return;

    const journeyData = {
      journey_step: step,
      step_sequence: this.getJourneySequence(step),
      time_in_journey: this.getTimeInJourney(),
      dropoff_risk: this.calculateDropoffRisk(step),
      ...properties
    };

    await this.track(ANALYTICS_EVENTS.USER_JOURNEY, journeyData);
  }

  /**
   * Identify user for user-centric analytics
   */
  async identify(userId, userProperties = {}) {
    this.userId = userId;

    const enrichedProperties = {
      ...userProperties,
      ...USER_PROPERTIES,
      identified_at: new Date().toISOString(),
      acquisition_channel: await this.getAcquisitionChannel(userId)
    };

    // Identify across all providers
    if (this.analyticsProviders.firebase) {
      setUserId(this.analyticsProviders.firebase, userId);
      setUserProperties(this.analyticsProviders.firebase, enrichedProperties);
    }

    if (this.analyticsProviders.mixpanel) {
      this.analyticsProviders.mixpanel.identify(userId);
      this.analyticsProviders.mixpanel.people.set(enrichedProperties);
    }

    // Track identification
    await this.track(ANALYTICS_EVENTS.USER_IDENTIFIED, enrichedProperties);
  }

  /**
   * Track A/B test variation
   */
  async trackExperiment(experimentName, variation, properties = {}) {
    const experimentData = {
      experiment_name: experimentName,
      variation: variation,
      ...properties,
      cohort: await this.getUserCohort(this.userId),
      significance_level: this.calculateSignificance(experimentName, variation)
    };

    await this.track(ANALYTICS_EVENTS.EXPERIMENT_VIEW, experimentData);
  }

  /**
   * Update business intelligence metrics
   */
  updateBusinessIntelligence(eventName, eventData) {
    const metricUpdates = BUSINESS_METRICS[eventName];
    
    if (metricUpdates) {
      metricUpdates.forEach(metric => {
        const currentValue = this.businessIntelligence.get(metric.name) || 0;
        const newValue = this.calculateMetricValue(metric, eventData, currentValue);
        this.businessIntelligence.set(metric.name, newValue);
      });
    }
  }

  /**
   * Calculate metric value based on event data
   */
  calculateMetricValue(metric, eventData, currentValue) {
    switch (metric.type) {
      case 'counter':
        return currentValue + 1;
      
      case 'sum':
        return currentValue + (eventData[metric.field] || 0);
      
      case 'average':
        const { sum, count } = currentValue || { sum: 0, count: 0 };
        return {
          sum: sum + (eventData[metric.field] || 0),
          count: count + 1
        };
      
      case 'max':
        return Math.max(currentValue, eventData[metric.field] || 0);
      
      case 'min':
        return Math.min(currentValue, eventData[metric.field] || currentValue);
      
      default:
        return currentValue;
    }
  }

  /**
   * Get business intelligence report
   */
  getBusinessReport() {
    const report = {
      timestamp: new Date().toISOString(),
      session_id: this.currentSessionId,
      metrics: {},
      kpis: {},
      insights: this.generateInsights()
    };

    // Convert metrics map to object
    this.businessIntelligence.forEach((value, key) => {
      report.metrics[key] = value;
    });

    // Calculate KPIs
    report.kpis = this.calculateKPIs();

    return report;
  }

  /**
   * Generate business insights from metrics
   */
  generateInsights() {
    const insights = [];

    // Example insights
    const conversionRate = this.calculateConversionRate();
    if (conversionRate < 0.1) {
      insights.push({
        type: 'warning',
        message: 'Low conversion rate detected',
        metric: 'conversion_rate',
        value: conversionRate,
        suggestion: 'Optimize user onboarding flow'
      });
    }

    const sessionDuration = this.getAverageSessionDuration();
    if (sessionDuration < 60000) {
      insights.push({
        type: 'info',
        message: 'Short session duration',
        metric: 'avg_session_duration',
        value: sessionDuration,
        suggestion: 'Improve user engagement features'
      });
    }

    return insights;
  }

  /**
   * Track to all analytics providers
   */
  async trackToAllProviders(eventName, eventData) {
    const providers = Object.values(this.analyticsProviders);
    const promises = providers.map(provider => {
      if (provider && provider.track) {
        return provider.track(eventName, eventData);
      }
      return Promise.resolve();
    });

    await Promise.allSettled(promises);
  }

  /**
   * Enrich event data with contextual information
   */
  enrichEventData(eventName, properties) {
    return {
      ...properties,
      // Technical context
      timestamp: Date.now(),
      session_id: this.currentSessionId,
      device_id: this.deviceId,
      platform: Platform.OS,
      app_version: this.getAppVersion(),
      // User context
      user_id: this.userId,
      user_authenticated: !!this.userId,
      // Session context
      session_duration: this.getSessionDuration(),
      screen_views_this_session: this.getScreenViewCount(),
      // Business context
      local_time: new Date().toLocaleString('en-ET'), // Ethiopian time
      is_weekend: this.isWeekend(),
      hour_of_day: new Date().getHours()
    };
  }

  /**
   * Start new analytics session
   */
  startSession() {
    this.currentSessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.screenViewCount = 0;
    this.actionSequence = [];
    this.lastActionTime = Date.now();

    // Track session start
    this.track(ANALYTICS_EVENTS.SESSION_START, {
      session_id: this.currentSessionId,
      device_id: this.deviceId,
      app_version: this.getAppVersion()
    });
  }

  /**
   * End current session
   */
  async endSession() {
    const sessionDuration = this.getSessionDuration();
    
    await this.track(ANALYTICS_EVENTS.SESSION_END, {
      session_id: this.currentSessionId,
      duration: sessionDuration,
      screen_views: this.screenViewCount,
      actions_taken: this.actionSequence.length,
      average_time_per_action: sessionDuration / Math.max(this.actionSequence.length, 1)
    });

    // Reset session data
    this.currentSessionId = null;
    this.sessionStartTime = null;
  }

  /**
   * Flush queued events
   */
  async flush() {
    if (this.queuedEvents.length === 0) return;

    const eventsToFlush = [...this.queuedEvents];
    this.queuedEvents = [];

    for (const event of eventsToFlush) {
      await this.track(event.eventName, event.properties);
    }

    console.log(`📤 Flushed ${eventsToFlush.length} queued events`);
  }

  /**
   * Start periodic flush interval
   */
  startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Utility Methods
   */

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getDeviceId() {
    try {
      if (Platform.OS === 'web') {
        return await this.getWebDeviceId();
      }
      return await getDeviceId();
    } catch (error) {
      return `device_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  getSessionDuration() {
    return this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
  }

  getAppVersion() {
    // This would come from app.json or similar
    return '1.0.0';
  }

  getScreenViewCount() {
    return this.screenViewCount || 0;
  }

  getActionSequence(action) {
    return [...this.actionSequence, action];
  }

  getTimeSinceLastAction() {
    return this.lastActionTime ? Date.now() - this.lastActionTime : 0;
  }

  /**
   * Advanced Analytics Methods
   */

  analyzeUserIntent(action, properties) {
    // Implement AI-powered intent analysis
    const intentMap = {
      'service_search': 'discovery',
      'service_book': 'conversion',
      'payment_initiated': 'transaction',
      'message_sent': 'communication'
    };

    return intentMap[action] || 'engagement';
  }

  calculateRevenueImpact(transactionData) {
    const baseRevenue = transactionData.amount || 0;
    const potentialUpsell = baseRevenue * 0.2; // 20% upsell potential
    const lifetimeValue = baseRevenue * 3; // 3x LTV multiplier
    
    return {
      immediate: baseRevenue,
      potential_upsell: potentialUpsell,
      estimated_ltv: lifetimeValue,
      total_impact: baseRevenue + potentialUpsell
    };
  }

  async calculateCLV(userId) {
    // Implement customer lifetime value calculation
    // This would query historical data
    return 0;
  }

  determineErrorSeverity(error, context) {
    if (error.message?.includes('network') || error.message?.includes('offline')) {
      return ERROR_SEVERITY.LOW;
    } else if (error.message?.includes('payment') || error.message?.includes('transaction')) {
      return ERROR_SEVERITY.HIGH;
    } else if (context.critical) {
      return ERROR_SEVERITY.CRITICAL;
    }
    return ERROR_SEVERITY.MEDIUM;
  }

  calculateConversionRate() {
    // Implement conversion rate calculation
    return 0.15; // Example
  }

  getAverageSessionDuration() {
    // Implement average session duration calculation
    return 120000; // Example: 2 minutes
  }

  /**
   * Cleanup and destruction
   */
  async destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    await this.endSession();
    await this.flush();

    this.isInitialized = false;
    this.isEnabled = false;
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

// Export service instance and class
export { AnalyticsService, analyticsService };
export default analyticsService;