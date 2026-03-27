// contexts/premium-context.js

/**
 * ENTERPRISE-GRADE PREMIUM MANAGEMENT SYSTEM
 * Yachi Mobile App - Complete Premium Features & Monetization
 * 
 * Enterprise Features:
 * - Multi-tier subscription management
 * - Premium badge system (200 ETB/month)
 * - Featured listing system (399 ETB)
 * - AI-powered premium benefits
 * - Ethiopian payment integration
 * - Revenue analytics and tracking
 * - Subscription lifecycle management
 * - Premium feature gating
 * - Bulk government premium plans
 * - Construction industry premium features
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { paymentService } from '../services/payment-service';
import { useUser } from './user-context';

// =============================================================================
// ENTERPRISE CONSTANTS & CONFIGURATION
// =============================================================================

export const PREMIUM_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
  GOVERNMENT: 'government',
};

export const PREMIUM_FEATURES = {
  // Badge System Features
  PREMIUM_BADGE: 'premium_badge',
  VERIFIED_STATUS: 'verified_status',
  PRIORITY_SEARCH: 'priority_search',
  FEATURED_PROFILE: 'featured_profile',
  ENHANCED_VISIBILITY: 'enhanced_visibility',

  // Listing Features
  FEATURED_LISTING: 'featured_listing',
  TOP_PLACEMENT: 'top_placement',
  CATEGORY_FEATURING: 'category_featuring',
  HIGHLIGHTED_LISTINGS: 'highlighted_listings',
  VISIBILITY_BOOST: 'visibility_boost',

  // AI Construction Features
  AI_WORKER_MATCHING: 'ai_worker_matching',
  CONSTRUCTION_ANALYTICS: 'construction_analytics',
  PROJECT_MANAGEMENT: 'project_management',
  TEAM_COLLABORATION: 'team_collaboration',
  GOVERNMENT_PORTAL: 'government_portal',

  // Communication Features
  ADVANCED_CHAT: 'advanced_chat',
  VIDEO_CALLS: 'video_calls',
  FILE_SHARING: 'file_sharing',
  PRIORITY_SUPPORT: 'priority_support',

  // Analytics Features
  PERFORMANCE_ANALYTICS: 'performance_analytics',
  REVENUE_INSIGHTS: 'revenue_insights',
  CUSTOMER_ANALYTICS: 'customer_analytics',
  MARKET_INSIGHTS: 'market_insights',
};

export const SUBSCRIPTION_PLANS = {
  // Monthly Premium Badge
  PREMIUM_BADGE_MONTHLY: {
    id: 'premium_badge_monthly',
    name: 'Premium Badge',
    type: PREMIUM_TIERS.BASIC,
    price: 200, // ETB
    currency: 'ETB',
    interval: 'monthly',
    features: [
      PREMIUM_FEATURES.PREMIUM_BADGE,
      PREMIUM_FEATURES.VERIFIED_STATUS,
      PREMIUM_FEATURES.PRIORITY_SEARCH,
      PREMIUM_FEATURES.ENHANCED_VISIBILITY,
    ],
    description: 'Get verified and stand out with premium badge',
  },

  // Featured Listing
  FEATURED_LISTING_30_DAYS: {
    id: 'featured_listing_30_days',
    name: 'Featured Listing',
    type: PREMIUM_TIERS.PROFESSIONAL,
    price: 399, // ETB
    currency: 'ETB',
    interval: 'one_time',
    duration: 30, // days
    features: [
      PREMIUM_FEATURES.FEATURED_LISTING,
      PREMIUM_FEATURES.TOP_PLACEMENT,
      PREMIUM_FEATURES.CATEGORY_FEATURING,
      PREMIUM_FEATURES.HIGHLIGHTED_LISTINGS,
      PREMIUM_FEATURES.VISIBILITY_BOOST,
    ],
    description: 'Boost your listing visibility for 30 days',
  },

  // Professional Plan
  PROFESSIONAL_MONTHLY: {
    id: 'professional_monthly',
    name: 'Professional',
    type: PREMIUM_TIERS.PROFESSIONAL,
    price: 599, // ETB
    currency: 'ETB',
    interval: 'monthly',
    features: [
      ...PREMIUM_FEATURES.PREMIUM_BADGE,
      PREMIUM_FEATURES.FEATURED_LISTING,
      PREMIUM_FEATURES.ADVANCED_CHAT,
      PREMIUM_FEATURES.FILE_SHARING,
      PREMIUM_FEATURES.PERFORMANCE_ANALYTICS,
    ],
    description: 'Complete professional toolkit for service providers',
  },

  // Business Plan (Construction Focused)
  BUSINESS_MONTHLY: {
    id: 'business_monthly',
    name: 'Business',
    type: PREMIUM_TIERS.BUSINESS,
    price: 1299, // ETB
    currency: 'ETB',
    interval: 'monthly',
    features: [
      ...PREMIUM_FEATURES.PROFESSIONAL_MONTHLY.features,
      PREMIUM_FEATURES.AI_WORKER_MATCHING,
      PREMIUM_FEATURES.CONSTRUCTION_ANALYTICS,
      PREMIUM_FEATURES.PROJECT_MANAGEMENT,
      PREMIUM_FEATURES.TEAM_COLLABORATION,
      PREMIUM_FEATURES.REVENUE_INSIGHTS,
    ],
    description: 'Advanced features for construction businesses',
  },

  // Enterprise Plan
  ENTERPRISE_MONTHLY: {
    id: 'enterprise_monthly',
    name: 'Enterprise',
    type: PREMIUM_TIERS.ENTERPRISE,
    price: 2999, // ETB
    currency: 'ETB',
    interval: 'monthly',
    features: [
      ...PREMIUM_FEATURES.BUSINESS_MONTHLY.features,
      PREMIUM_FEATURES.GOVERNMENT_PORTAL,
      PREMIUM_FEATURES.VIDEO_CALLS,
      PREMIUM_FEATURES.PRIORITY_SUPPORT,
      PREMIUM_FEATURES.MARKET_INSIGHTS,
      PREMIUM_FEATURES.CUSTOMER_ANALYTICS,
    ],
    description: 'Complete enterprise solution for large businesses',
  },

  // Government Plan
  GOVERNMENT_ANNUAL: {
    id: 'government_annual',
    name: 'Government',
    type: PREMIUM_TIERS.GOVERNMENT,
    price: 25000, // ETB
    currency: 'ETB',
    interval: 'annual',
    features: [
      ...PREMIUM_FEATURES.ENTERPRISE_MONTHLY.features,
      'bulk_worker_management',
      'infrastructure_projects',
      'advanced_analytics',
      'custom_integrations',
    ],
    description: 'Comprehensive platform for government projects',
  },
};

export const PAYMENT_PROVIDERS = {
  CHAPA: 'chapa',
  TELEBIRR: 'telebirr',
  CBE_BIRR: 'cbe_birr'
};

// =============================================================================
// ENTERPRISE STATE MANAGEMENT
// =============================================================================

const initialState = {
  // User Premium Status
  currentTier: PREMIUM_TIERS.FREE,
  isPremium: false,
  hasPremiumBadge: false,
  hasFeaturedListing: false,
  
  // Active Subscriptions
  activeSubscriptions: [],
  expiredSubscriptions: [],
  pendingSubscriptions: [],
  
  // Subscription Details
  subscriptionStartDate: null,
  subscriptionEndDate: null,
  subscriptionRenewalDate: null,
  autoRenew: false,
  
  // Payment Information
  paymentMethods: [],
  defaultPaymentMethod: null,
  billingAddress: null,
  
  // Premium Features Access
  enabledFeatures: new Set(),
  featureUsage: {},
  featureLimits: {},
  
  // Transaction History
  transactions: [],
  revenue: 0,
  pendingPayments: 0,
  
  // UI State
  isLoading: false,
  isProcessingPayment: false,
  isUpdatingSubscription: false,
  
  // Error States
  error: null,
  paymentError: null,
  subscriptionError: null,
  
  // Analytics
  premiumUptime: 0,
  featureAdoption: {},
  revenueAnalytics: {},
  
  // Ethiopian Market Specific
  localCurrency: 'ETB',
  exchangeRate: 1,
  taxRate: 0.15, // 15% VAT
};

const PREMIUM_ACTION_TYPES = {
  // Subscription Management
  SET_SUBSCRIPTION_STATUS: 'SET_SUBSCRIPTION_STATUS',
  UPDATE_SUBSCRIPTION: 'UPDATE_SUBSCRIPTION',
  CANCEL_SUBSCRIPTION: 'CANCEL_SUBSCRIPTION',
  RENEW_SUBSCRIPTION: 'RENEW_SUBSCRIPTION',
  
  // Payment Processing
  PROCESS_PAYMENT_START: 'PROCESS_PAYMENT_START',
  PROCESS_PAYMENT_SUCCESS: 'PROCESS_PAYMENT_SUCCESS',
  PROCESS_PAYMENT_FAILURE: 'PROCESS_PAYMENT_FAILURE',
  
  // Feature Management
  ENABLE_FEATURE: 'ENABLE_FEATURE',
  DISABLE_FEATURE: 'DISABLE_FEATURE',
  UPDATE_FEATURE_USAGE: 'UPDATE_FEATURE_USAGE',
  
  // User State
  UPDATE_PREMIUM_STATUS: 'UPDATE_PREMIUM_STATUS',
  UPDATE_PAYMENT_METHODS: 'UPDATE_PAYMENT_METHODS',
  
  // Analytics
  UPDATE_REVENUE_ANALYTICS: 'UPDATE_REVENUE_ANALYTICS',
  TRACK_FEATURE_USAGE: 'TRACK_FEATURE_USAGE',
  
  // UI State
  SET_LOADING: 'SET_LOADING',
  SET_PROCESSING: 'SET_PROCESSING',
  
  // Error Handling
  SET_ERROR: 'SET_ERROR',
  SET_PAYMENT_ERROR: 'SET_PAYMENT_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
};

// =============================================================================
// ENTERPRISE REDUCER
// =============================================================================

const premiumReducer = (state, action) => {
  switch (action.type) {
    case PREMIUM_ACTION_TYPES.SET_SUBSCRIPTION_STATUS:
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        error: null,
      };

    case PREMIUM_ACTION_TYPES.UPDATE_SUBSCRIPTION:
      const updatedSubscriptions = state.activeSubscriptions.map(sub =>
        sub.id === action.payload.id ? { ...sub, ...action.payload.updates } : sub
      );
      
      return {
        ...state,
        activeSubscriptions: updatedSubscriptions,
        isUpdatingSubscription: false,
      };

    case PREMIUM_ACTION_TYPES.PROCESS_PAYMENT_START:
      return {
        ...state,
        isProcessingPayment: true,
        paymentError: null,
      };

    case PREMIUM_ACTION_TYPES.PROCESS_PAYMENT_SUCCESS:
      return {
        ...state,
        isProcessingPayment: false,
        activeSubscriptions: [...state.activeSubscriptions, action.payload.subscription],
        transactions: [...state.transactions, action.payload.transaction],
        revenue: state.revenue + action.payload.amount,
        paymentError: null,
      };

    case PREMIUM_ACTION_TYPES.PROCESS_PAYMENT_FAILURE:
      return {
        ...state,
        isProcessingPayment: false,
        paymentError: action.payload,
      };

    case PREMIUM_ACTION_TYPES.ENABLE_FEATURE:
      const newFeatures = new Set(state.enabledFeatures);
      newFeatures.add(action.payload);
      
      return {
        ...state,
        enabledFeatures: newFeatures,
      };

    case PREMIUM_ACTION_TYPES.UPDATE_FEATURE_USAGE:
      return {
        ...state,
        featureUsage: {
          ...state.featureUsage,
          [action.payload.feature]: action.payload.usage,
        },
      };

    case PREMIUM_ACTION_TYPES.UPDATE_PREMIUM_STATUS:
      return {
        ...state,
        isPremium: action.payload.isPremium,
        currentTier: action.payload.tier,
        hasPremiumBadge: action.payload.hasBadge,
        hasFeaturedListing: action.payload.hasFeatured,
        enabledFeatures: new Set(action.payload.features || []),
      };

    case PREMIUM_ACTION_TYPES.UPDATE_REVENUE_ANALYTICS:
      return {
        ...state,
        revenueAnalytics: {
          ...state.revenueAnalytics,
          ...action.payload,
        },
      };

    case PREMIUM_ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case PREMIUM_ACTION_TYPES.SET_PROCESSING:
      return {
        ...state,
        isProcessingPayment: action.payload,
      };

    case PREMIUM_ACTION_TYPES.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isProcessingPayment: false,
      };

    case PREMIUM_ACTION_TYPES.CLEAR_ERRORS:
      return {
        ...state,
        error: null,
        paymentError: null,
        subscriptionError: null,
      };

    default:
      return state;
  }
};

// =============================================================================
// ENTERPRISE PREMIUM PROVIDER
// =============================================================================

const PremiumContext = createContext();

export const PremiumProvider = ({ children }) => {
  const [state, dispatch] = useReducer(premiumReducer, initialState);
  const { user, isAuthenticated, updateUserProfile } = useUser();
  
  const subscriptionCheckInterval = useRef(null);
  const featureUsageTracker = useRef(new Map());

  // ===========================================================================
  // ENTERPRISE INITIALIZATION
  // ===========================================================================

  const initializePremium = useCallback(async () => {
    try {
      dispatch({ type: PREMIUM_ACTION_TYPES.SET_LOADING, payload: true });

      if (!isAuthenticated) {
        dispatch({ type: PREMIUM_ACTION_TYPES.SET_LOADING, payload: false });
        return;
      }

      // Load premium data from server and local storage
      const [serverData, localData] = await Promise.all([
        fetchUserPremiumData(),
        storage.get('@premium_data'),
      ]);

      const premiumData = serverData || localData || {};

      dispatch({
        type: PREMIUM_ACTION_TYPES.SET_SUBSCRIPTION_STATUS,
        payload: {
          ...premiumData,
          isPremium: premiumData.currentTier !== PREMIUM_TIERS.FREE,
          enabledFeatures: new Set(premiumData.enabledFeatures || []),
        },
      });

      // Start subscription monitoring
      startSubscriptionMonitoring();

      await analyticsService.trackEvent('premium_system_initialized', {
        tier: premiumData.currentTier,
        isPremium: premiumData.currentTier !== PREMIUM_TIERS.FREE,
        activeSubscriptions: premiumData.activeSubscriptions?.length || 0,
      });

    } catch (error) {
      await errorService.captureError(error, { context: 'PremiumSystemInitialization' });
      dispatch({ type: PREMIUM_ACTION_TYPES.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: PREMIUM_ACTION_TYPES.SET_LOADING, payload: false });
    }
  }, [isAuthenticated]);

  const fetchUserPremiumData = async () => {
    try {
      const response = await api.get('/premium/user-status');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch premium data:', error);
      return null;
    }
  };

  // ===========================================================================
  // ENTERPRISE SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  const purchaseSubscription = useCallback(async (planId, paymentMethod, options = {}) => {
    try {
      dispatch({ type: PREMIUM_ACTION_TYPES.PROCESS_PAYMENT_START });

      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        throw new Error('INVALID_SUBSCRIPTION_PLAN');
      }

      // Calculate final amount with Ethiopian tax
      const taxAmount = plan.price * state.taxRate;
      const totalAmount = plan.price + taxAmount;

      // Process payment through Ethiopian providers
      const paymentResult = await processEthiopianPayment({
        amount: totalAmount,
        currency: plan.currency,
        planId: plan.id,
        paymentMethod,
        metadata: {
          userId: user?.id,
          planName: plan.name,
          taxAmount,
        },
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'PAYMENT_PROCESSING_FAILED');
      }

      // Create subscription record
      const subscription = await createSubscriptionRecord(plan, paymentResult, options);

      // Update user premium status
      await updateUserPremiumStatus(subscription);

      // Track successful purchase
      await analyticsService.trackEvent('premium_subscription_purchased', {
        planId,
        planName: plan.name,
        amount: totalAmount,
        currency: plan.currency,
        paymentMethod,
        transactionId: paymentResult.transactionId,
      });

      dispatch({
        type: PREMIUM_ACTION_TYPES.PROCESS_PAYMENT_SUCCESS,
        payload: {
          subscription,
          transaction: paymentResult.transaction,
          amount: totalAmount,
        },
      });

      return {
        success: true,
        subscription,
        transaction: paymentResult.transaction,
      };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'PremiumSubscriptionPurchase',
        planId,
        paymentMethod,
        options,
      });

      dispatch({
        type: PREMIUM_ACTION_TYPES.PROCESS_PAYMENT_FAILURE,
        payload: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }, [user, state.taxRate]);

  const processEthiopianPayment = async (paymentData) => {
    try {
      // Use appropriate payment service based on provider
      let paymentResult;
      
      switch (paymentData.paymentMethod.provider) {
        case PAYMENT_PROVIDERS.CHAPA:
          paymentResult = await paymentService.processChapaPayment(paymentData);
          break;
        case PAYMENT_PROVIDERS.TELEBIRR:
          paymentResult = await paymentService.processTelebirrPayment(paymentData);
          break;
        case PAYMENT_PROVIDERS.CBE_BIRR:
          paymentResult = await paymentService.processCbeBirrPayment(paymentData);
          break;
        default:
          throw new Error('UNSUPPORTED_PAYMENT_PROVIDER');
      }

      return paymentResult;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EthiopianPaymentProcessing',
        paymentData,
      });
      throw error;
    }
  };

  const createSubscriptionRecord = async (plan, paymentResult, options) => {
    const now = new Date();
    const endDate = calculateSubscriptionEndDate(plan, now);
    
    const subscription = {
      id: `sub_${Date.now()}_${plan.id}`,
      planId: plan.id,
      planName: plan.name,
      tier: plan.type,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      renewalDate: plan.interval === 'one_time' ? null : endDate.toISOString(),
      status: 'active',
      paymentMethod: paymentResult.paymentMethod,
      transactionId: paymentResult.transactionId,
      amount: paymentResult.amount,
      currency: plan.currency,
      autoRenew: options.autoRenew !== false,
      features: plan.features,
      metadata: {
        purchasedAt: now.toISOString(),
        ...options.metadata,
      },
    };

    // Save to server
    await api.post('/premium/subscriptions', subscription);
    
    // Save locally
    await storage.set('@user_subscription', subscription);

    return subscription;
  };

  // ===========================================================================
  // PREMIUM BADGE SYSTEM (200 ETB/Month)
  // ===========================================================================

  const purchasePremiumBadge = useCallback(async (paymentMethod, options = {}) => {
    try {
      const result = await purchaseSubscription(
        'PREMIUM_BADGE_MONTHLY',
        paymentMethod,
        {
          ...options,
          metadata: {
            type: 'premium_badge',
            ...options.metadata,
          },
        }
      );

      if (result.success) {
        // Enable premium badge features immediately
        await enablePremiumBadgeFeatures();
        
        await analyticsService.trackEvent('premium_badge_purchased', {
          amount: 200,
          currency: 'ETB',
          paymentMethod: paymentMethod.provider,
        });
      }

      return result;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'PremiumBadgePurchase',
        paymentMethod,
        options,
      });
      throw error;
    }
  }, [purchaseSubscription]);

  const enablePremiumBadgeFeatures = async () => {
    const badgeFeatures = SUBSCRIPTION_PLANS.PREMIUM_BADGE_MONTHLY.features;
    
    badgeFeatures.forEach(feature => {
      dispatch({
        type: PREMIUM_ACTION_TYPES.ENABLE_FEATURE,
        payload: feature,
      });
    });

    // Update user profile with premium badge
    await updateUserProfile({
      hasPremiumBadge: true,
      premiumSince: new Date().toISOString(),
    });

    await storage.set('@premium_badge_active', true);
  };

  // ===========================================================================
  // FEATURED LISTING SYSTEM (399 ETB)
  // ===========================================================================

  const purchaseFeaturedListing = useCallback(async (listingId, paymentMethod, options = {}) => {
    try {
      const result = await purchaseSubscription(
        'FEATURED_LISTING_30_DAYS',
        paymentMethod,
        {
          ...options,
          metadata: {
            type: 'featured_listing',
            listingId,
            duration: 30,
            ...options.metadata,
          },
        }
      );

      if (result.success) {
        // Activate featured listing
        await activateFeaturedListing(listingId, result.subscription);
        
        await analyticsService.trackEvent('featured_listing_purchased', {
          listingId,
          amount: 399,
          currency: 'ETB',
          duration: 30,
          paymentMethod: paymentMethod.provider,
        });
      }

      return result;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'FeaturedListingPurchase',
        listingId,
        paymentMethod,
        options,
      });
      throw error;
    }
  }, [purchaseSubscription]);

  const activateFeaturedListing = async (listingId, subscription) => {
    try {
      // Update listing status on server
      await api.patch(`/listings/${listingId}/feature`, {
        featured: true,
        featuredUntil: subscription.endDate,
        subscriptionId: subscription.id,
      });

      // Update local state
      dispatch({
        type: PREMIUM_ACTION_TYPES.ENABLE_FEATURE,
        payload: PREMIUM_FEATURES.FEATURED_LISTING,
      });

      await storage.set(`@featured_listing_${listingId}`, {
        active: true,
        until: subscription.endDate,
        subscriptionId: subscription.id,
      });

    } catch (error) {
      await errorService.captureError(error, {
        context: 'FeaturedListingActivation',
        listingId,
        subscription,
      });
      throw error;
    }
  };

  // ===========================================================================
  // CONSTRUCTION PREMIUM FEATURES
  // ===========================================================================

  const upgradeToConstructionPlan = useCallback(async (planType, paymentMethod, options = {}) => {
    try {
      const planId = planType === PREMIUM_TIERS.BUSINESS ? 'BUSINESS_MONTHLY' : 'ENTERPRISE_MONTHLY';
      
      const result = await purchaseSubscription(planId, paymentMethod, {
        ...options,
        metadata: {
          industry: 'construction',
          ...options.metadata,
        },
      });

      if (result.success) {
        // Enable construction-specific features
        await enableConstructionPremiumFeatures(result.subscription);
        
        await analyticsService.trackEvent('construction_premium_upgraded', {
          planType,
          amount: result.subscription.amount,
          features: result.subscription.features.length,
        });
      }

      return result;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ConstructionPremiumUpgrade',
        planType,
        paymentMethod,
        options,
      });
      throw error;
    }
  }, [purchaseSubscription]);

  const enableConstructionPremiumFeatures = async (subscription) => {
    const constructionFeatures = subscription.features.filter(feature =>
      feature.includes('ai_') || feature.includes('construction_') || feature.includes('project_')
    );

    constructionFeatures.forEach(feature => {
      dispatch({
        type: PREMIUM_ACTION_TYPES.ENABLE_FEATURE,
        payload: feature,
      });
    });

    // Initialize construction premium services
    await initializeConstructionPremiumServices();

    await storage.set('@construction_premium_active', {
      tier: subscription.tier,
      features: constructionFeatures,
      activatedAt: new Date().toISOString(),
    });
  };

  // ===========================================================================
  // ENTERPRISE FEATURE MANAGEMENT
  // ===========================================================================

  const hasFeatureAccess = useCallback((feature) => {
    return state.enabledFeatures.has(feature) || state.isPremium;
  }, [state.enabledFeatures, state.isPremium]);

  const trackFeatureUsage = useCallback(async (feature, data = {}) => {
    try {
      // Update local usage tracking
      const currentUsage = state.featureUsage[feature] || { count: 0, lastUsed: null };
      
      dispatch({
        type: PREMIUM_ACTION_TYPES.UPDATE_FEATURE_USAGE,
        payload: {
          feature,
          usage: {
            count: currentUsage.count + 1,
            lastUsed: new Date().toISOString(),
            ...data,
          },
        },
      });

      // Send to analytics
      await analyticsService.trackEvent('premium_feature_used', {
        feature,
        usageCount: currentUsage.count + 1,
        ...data,
      });

    } catch (error) {
      console.error('Failed to track feature usage:', error);
    }
  }, [state.featureUsage]);

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  const cancelSubscription = useCallback(async (subscriptionId, reason = 'user_cancelled') => {
    try {
      dispatch({ type: PREMIUM_ACTION_TYPES.SET_LOADING, payload: true });

      // Cancel on server
      await api.delete(`/premium/subscriptions/${subscriptionId}`, {
        data: { reason }
      });

      // Update local state
      const cancelledSub = state.activeSubscriptions.find(sub => sub.id === subscriptionId);
      const remainingSubs = state.activeSubscriptions.filter(sub => sub.id !== subscriptionId);

      dispatch({
        type: PREMIUM_ACTION_TYPES.SET_SUBSCRIPTION_STATUS,
        payload: {
          activeSubscriptions: remainingSubs,
          expiredSubscriptions: [...state.expiredSubscriptions, {
            ...cancelledSub,
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason,
          }],
        },
      });

      // Disable features if no active subscriptions remain
      if (remainingSubs.length === 0) {
        await downgradeToFreeTier();
      }

      await analyticsService.trackEvent('subscription_cancelled', {
        subscriptionId,
        reason,
        tier: cancelledSub?.tier,
      });

      return { success: true };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'SubscriptionCancellation',
        subscriptionId,
        reason,
      });
      
      dispatch({ type: PREMIUM_ACTION_TYPES.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: PREMIUM_ACTION_TYPES.SET_LOADING, payload: false });
    }
  }, [state.activeSubscriptions, state.expiredSubscriptions]);

  const downgradeToFreeTier = async () => {
    dispatch({
      type: PREMIUM_ACTION_TYPES.UPDATE_PREMIUM_STATUS,
      payload: {
        isPremium: false,
        tier: PREMIUM_TIERS.FREE,
        hasPremiumBadge: false,
        hasFeaturedListing: false,
        features: [],
      },
    });

    // Clear premium data from storage
    await storage.remove('@user_subscription');
    await storage.remove('@premium_badge_active');
    await storage.remove('@construction_premium_active');

    // Reset feature flags
    dispatch({
      type: PREMIUM_ACTION_TYPES.SET_SUBSCRIPTION_STATUS,
      payload: {
        enabledFeatures: new Set(),
      },
    });
  };

  // ===========================================================================
  // ENTERPRISE ANALYTICS & REPORTING
  // ===========================================================================

  const getRevenueAnalytics = useCallback(async (period = 'monthly') => {
    try {
      const response = await api.get('/premium/analytics/revenue', {
        params: { period }
      });

      dispatch({
        type: PREMIUM_ACTION_TYPES.UPDATE_REVENUE_ANALYTICS,
        payload: response.data,
      });

      return response.data;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'RevenueAnalyticsFetch',
        period,
      });
      throw error;
    }
  }, []);

  const getFeatureAdoptionReport = useCallback(async () => {
    try {
      const response = await api.get('/premium/analytics/feature-adoption');
      
      await analyticsService.trackEvent('feature_adoption_report_generated', {
        totalFeatures: Object.keys(response.data).length,
        mostUsedFeature: Object.keys(response.data).reduce((a, b) => 
          response.data[a].usageCount > response.data[b].usageCount ? a : b
        ),
      });

      return response.data;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'FeatureAdoptionReport',
      });
      throw error;
    }
  }, []);

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  const calculateSubscriptionEndDate = (plan, startDate) => {
    const endDate = new Date(startDate);
    
    switch (plan.interval) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'annual':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'one_time':
        endDate.setDate(endDate.getDate() + (plan.duration || 30));
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }
    
    return endDate;
  };

  const startSubscriptionMonitoring = () => {
    // Check subscription status every hour
    subscriptionCheckInterval.current = setInterval(async () => {
      await checkSubscriptionStatus();
    }, 60 * 60 * 1000); // 1 hour
  };

  const checkSubscriptionStatus = async () => {
    try {
      const response = await api.get('/premium/subscriptions/status');
      const { activeSubscriptions, expiredSubscriptions } = response.data;

      dispatch({
        type: PREMIUM_ACTION_TYPES.SET_SUBSCRIPTION_STATUS,
        payload: {
          activeSubscriptions,
          expiredSubscriptions,
          isPremium: activeSubscriptions.length > 0,
        },
      });

      // Check for expiring subscriptions
      const expiringSubs = activeSubscriptions.filter(sub => {
        const endDate = new Date(sub.endDate);
        const daysUntilExpiry = (endDate - new Date()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 3; // 3 days until expiry
      });

      if (expiringSubs.length > 0) {
        await handleExpiringSubscriptions(expiringSubs);
      }

    } catch (error) {
      console.error('Subscription status check failed:', error);
    }
  };

  const handleExpiringSubscriptions = async (expiringSubscriptions) => {
    // Send renewal reminders or handle auto-renewal
    for (const subscription of expiringSubscriptions) {
      if (subscription.autoRenew) {
        await processAutoRenewal(subscription);
      } else {
        await sendRenewalReminder(subscription);
      }
    }
  };

  // ===========================================================================
  // ENTERPRISE CONTEXT VALUE
  // ===========================================================================

  const enterpriseContextValue = {
    // State
    ...state,
    
    // Subscription Management
    purchaseSubscription,
    purchasePremiumBadge,
    purchaseFeaturedListing,
    upgradeToConstructionPlan,
    cancelSubscription,
    
    // Feature Management
    hasFeatureAccess,
    trackFeatureUsage,
    
    // Analytics
    getRevenueAnalytics,
    getFeatureAdoptionReport,
    
    // Utility Functions
    getAvailablePlans: useCallback(() => SUBSCRIPTION_PLANS, []),
    getPlanFeatures: useCallback((planId) => SUBSCRIPTION_PLANS[planId]?.features || [], []),
    
    // Ethiopian Market
    localCurrency: state.localCurrency,
    taxRate: state.taxRate,
    
    // Error Handling
    clearErrors: useCallback(() => dispatch({ type: PREMIUM_ACTION_TYPES.CLEAR_ERRORS }), []),
  };

  // ===========================================================================
  // EFFECTS & CLEANUP
  // ===========================================================================

  useEffect(() => {
    initializePremium();
    
    return () => {
      if (subscriptionCheckInterval.current) {
        clearInterval(subscriptionCheckInterval.current);
      }
    };
  }, [initializePremium]);

  return (
    <PremiumContext.Provider value={enterpriseContextValue}>
      {children}
    </PremiumContext.Provider>
  );
};

// =============================================================================
// ENTERPRISE HOOKS
// =============================================================================

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
};

export const usePremiumBadge = () => {
  const { 
    hasPremiumBadge, 
    purchasePremiumBadge, 
    trackFeatureUsage,
    hasFeatureAccess 
  } = usePremium();

  const activatePremiumBadge = useCallback(async (paymentMethod) => {
    const result = await purchasePremiumBadge(paymentMethod);
    
    if (result.success) {
      await trackFeatureUsage(PREMIUM_FEATURES.PREMIUM_BADGE, {
        action: 'activated',
        paymentMethod: paymentMethod.provider,
      });
    }
    
    return result;
  }, [purchasePremiumBadge, trackFeatureUsage]);

  return {
    hasPremiumBadge,
    activatePremiumBadge,
    hasBadgeFeature: (feature) => hasFeatureAccess(feature),
    badgeBenefits: SUBSCRIPTION_PLANS.PREMIUM_BADGE_MONTHLY.features,
  };
};

export const useConstructionPremium = () => {
  const { 
    upgradeToConstructionPlan, 
    hasFeatureAccess, 
    trackFeatureUsage,
    currentTier 
  } = usePremium();

  const hasAIFeature = useCallback((feature) => {
    return hasFeatureAccess(feature) && currentTier >= PREMIUM_TIERS.BUSINESS;
  }, [hasFeatureAccess, currentTier]);

  const upgradeConstructionPlan = useCallback(async (planType, paymentMethod) => {
    const result = await upgradeToConstructionPlan(planType, paymentMethod);
    
    if (result.success) {
      await trackFeatureUsage(PREMIUM_FEATURES.AI_WORKER_MATCHING, {
        action: 'plan_upgraded',
        planType,
      });
    }
    
    return result;
  }, [upgradeToConstructionPlan, trackFeatureUsage]);

  return {
    hasAIFeature,
    upgradeConstructionPlan,
    availableConstructionFeatures: SUBSCRIPTION_PLANS.BUSINESS_MONTHLY.features.filter(
      f => f.includes('ai_') || f.includes('construction_')
    ),
    currentTier,
  };
};

export default PremiumContext;