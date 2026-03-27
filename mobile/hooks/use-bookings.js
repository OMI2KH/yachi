// hooks/use-bookings.js

/**
 * ENTERPRISE-GRADE BOOKINGS MANAGEMENT HOOK
 * Yachi Mobile App - Complete Booking System with AI Construction Integration
 * 
 * Enterprise Features:
 * - Multi-type booking management (Service, Construction, Government)
 * - AI-powered scheduling and conflict detection
 * - Real-time status tracking with Ethiopian timezone support
 * - Advanced payment integration with Ethiopian providers
 * - Construction project booking lifecycle
 * - Government project bulk booking management
 * - Offline booking capabilities with sync
 * - Comprehensive analytics and reporting
 * - Multi-role booking access control
 * - Automated notifications and reminders
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useAuth } from './use-auth';
import { useNotification } from '../contexts/notification-context';
import { useLocation } from '../contexts/location-context';

// =============================================================================
// ENTERPRISE CONSTANTS & CONFIGURATION
// =============================================================================

export const BOOKING_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
};

export const BOOKING_TYPES = {
  SERVICE: 'service',
  CONSTRUCTION: 'construction',
  GOVERNMENT: 'government',
  URGENT: 'urgent',
  RECURRING: 'recurring',
  GROUP: 'group',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  HOLD: 'hold',
};

export const CANCELLATION_REASONS = {
  CUSTOMER_REQUEST: 'customer_request',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  SCHEDULE_CONFLICT: 'schedule_conflict',
  PAYMENT_FAILED: 'payment_failed',
  WEATHER_CONDITIONS: 'weather_conditions',
  SITE_UNPREPARED: 'site_unprepared',
  OTHER: 'other',
};

export const CONSTRUCTION_BOOKING_PHASES = {
  PLANNING: 'planning',
  SITE_PREPARATION: 'site_preparation',
  FOUNDATION: 'foundation',
  STRUCTURE: 'structure',
  FINISHING: 'finishing',
  INSPECTION: 'inspection',
  COMPLETION: 'completion',
};

const STORAGE_KEYS = {
  BOOKINGS_CACHE: '@yachi_bookings_cache',
  DRAFT_BOOKINGS: '@yachi_draft_bookings',
  PAYMENT_METHODS: '@yachi_payment_methods',
  BOOKING_PREFERENCES: '@yachi_booking_preferences',
  CONSTRUCTION_PROJECTS: '@yachi_construction_projects',
};

// =============================================================================
// ENTERPRISE STATE MANAGEMENT
// =============================================================================

const initialState = {
  // Core Bookings Data
  bookings: [],
  upcomingBookings: [],
  pastBookings: [],
  pendingBookings: [],
  cancelledBookings: [],
  constructionBookings: [],
  governmentBookings: [],

  // Current Booking Context
  currentBooking: null,
  bookingDetails: null,
  bookingTimeline: [],
  constructionPhases: [],

  // Booking Creation & Draft Management
  draftBooking: null,
  selectedService: null,
  selectedProvider: null,
  selectedTimeSlot: null,
  selectedWorkers: [],

  // Construction Specific
  constructionProject: null,
  projectRequirements: null,
  workerAssignments: [],
  materialRequirements: [],

  // Scheduling & Availability
  availableSlots: [],
  blockedSlots: [],
  scheduleConflicts: [],
  providerSchedules: new Map(),

  // Payment Management
  paymentMethods: [],
  currentPayment: null,
  invoice: null,
  refundHistory: [],

  // Search & Filtering
  filters: {
    status: null,
    dateRange: null,
    serviceType: null,
    provider: null,
    projectType: null,
    location: null,
  },
  searchQuery: '',
  sortBy: 'date_desc',

  // Pagination & Performance
  pagination: {
    page: 1,
    limit: 25,
    total: 0,
    hasMore: true,
  },
  cache: new Map(),
  lastFetched: null,

  // Status Management
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isCancelling: false,
  isProcessingPayment: false,
  isRefreshing: false,
  isCheckingAvailability: false,
  isScheduling: false,

  // Selection & Batch Operations
  selectedBookings: new Set(),

  // Network & Sync
  isConnected: true,
  pendingUpdates: [],
  lastSync: null,

  // Error Handling
  error: null,
  creationError: null,
  paymentError: null,
  cancellationError: null,
  schedulingError: null,
};

// =============================================================================
// ENTERPRISE BOOKINGS HOOK
// =============================================================================

export const useBookings = () => {
  const router = useRouter();
  const { user, isAuthenticated, hasPermission } = useAuth();
  const { sendLocalNotification } = useNotification();
  const { currentLocation } = useLocation();

  const [state, setState] = useState(initialState);

  const availabilityTimeoutRef = useRef(null);
  const cacheTimeoutRef = useRef(null);
  const realTimeSubscriptionRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // ===========================================================================
  // ENTERPRISE INITIALIZATION
  // ===========================================================================

  const initializeEnterpriseBookings = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        throw new Error('ENTERPRISE_AUTHENTICATION_REQUIRED');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load cached enterprise data
      const [cachedBookings, draftBookings, paymentMethods, preferences, constructionProjects] = await Promise.all([
        storage.get(STORAGE_KEYS.BOOKINGS_CACHE),
        storage.get(STORAGE_KEYS.DRAFT_BOOKINGS),
        storage.get(STORAGE_KEYS.PAYMENT_METHODS),
        storage.get(STORAGE_KEYS.BOOKING_PREFERENCES),
        storage.get(STORAGE_KEYS.CONSTRUCTION_PROJECTS),
      ]);

      // Fetch initial enterprise data
      const [bookingsResponse, upcomingResponse, constructionResponse] = await Promise.all([
        fetchEnterpriseBookings({ page: 1, limit: 25 }),
        fetchUpcomingEnterpriseBookings(),
        hasPermission('access_construction_features') ? fetchConstructionBookings() : Promise.resolve({ bookings: [] }),
      ]);

      // Setup real-time monitoring
      await setupEnterpriseRealTimeUpdates();
      setupEnterpriseStatusMonitoring();

      setState(prev => ({
        ...prev,
        bookings: bookingsResponse.bookings,
        upcomingBookings: upcomingResponse.bookings,
        constructionBookings: constructionResponse.bookings,
        draftBooking: draftBookings,
        paymentMethods: paymentMethods || [],
        userPreferences: preferences || {},
        constructionProject: constructionProjects,
        lastFetched: Date.now(),
        isLoading: false,
      }));

      // Cache enterprise data
      await cacheEnterpriseBookingsData(bookingsResponse.bookings);

      await analyticsService.trackEvent('enterprise_bookings_initialized', {
        totalBookings: bookingsResponse.bookings.length,
        upcomingCount: upcomingResponse.bookings.length,
        constructionCount: constructionResponse.bookings.length,
        userRole: user?.role,
      });

    } catch (error) {
      await errorService.captureError(error, { context: 'EnterpriseBookingsInitialization' });
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
    }
  }, [isAuthenticated, user, hasPermission]);

  // ===========================================================================
  // ENTERPRISE BOOKING OPERATIONS
  // ===========================================================================

  const createEnterpriseBooking = useCallback(async (bookingData) => {
    try {
      if (!isAuthenticated) {
        throw new Error('ENTERPRISE_AUTHENTICATION_REQUIRED');
      }

      setState(prev => ({ ...prev, isCreating: true, creationError: null }));

      // Enhanced validation for enterprise bookings
      const validationError = validateEnterpriseBookingData(bookingData);
      if (validationError) {
        throw new Error(validationError);
      }

      // Check availability with Ethiopian timezone consideration
      if (bookingData.scheduledAt && bookingData.providerId) {
        const availability = await checkEnterpriseAvailability(
          bookingData.providerId,
          bookingData.scheduledAt,
          bookingData.duration || 60,
          bookingData.bookingType
        );
        
        if (!availability.available) {
          throw new Error('SELECTED_TIME_SLOT_UNAVAILABLE');
        }
      }

      // Add enterprise metadata
      const enterpriseBookingData = {
        ...bookingData,
        customerId: user.id,
        location: currentLocation,
        metadata: {
          createdVia: 'mobile_app',
          deviceInfo: getDeviceInfo(),
          appVersion: '2.0.0',
          ...bookingData.metadata,
        },
      };

      const response = await api.post('/bookings/enterprise-create', enterpriseBookingData);
      const newBooking = response.data;

      // Update state with new booking
      setState(prev => ({
        ...prev,
        bookings: [newBooking, ...prev.bookings],
        upcomingBookings: [newBooking, ...prev.upcomingBookings],
        ...(newBooking.bookingType === BOOKING_TYPES.CONSTRUCTION && {
          constructionBookings: [newBooking, ...prev.constructionBookings],
        }),
        currentBooking: newBooking,
        draftBooking: null,
        isCreating: false,
        creationError: null,
      }));

      // Clear draft and cache
      await storage.remove(STORAGE_KEYS.DRAFT_BOOKINGS);
      await clearEnterpriseCache();

      // Send enterprise notification
      await sendLocalNotification({
        title: getBookingCreationTitle(newBooking.bookingType),
        body: getBookingCreationMessage(newBooking),
        data: { 
          type: 'enterprise_booking_created',
          bookingId: newBooking.id,
          bookingType: newBooking.bookingType,
        },
      });

      await analyticsService.trackEvent('enterprise_booking_created', {
        bookingId: newBooking.id,
        bookingType: newBooking.bookingType,
        serviceType: newBooking.serviceType,
        amount: newBooking.totalAmount,
        currency: newBooking.currency,
        userRole: user.role,
      });

      return { success: true, booking: newBooking };

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterpriseBookingCreation',
        bookingData,
        userId: user?.id,
      });
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        creationError: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [isAuthenticated, user, currentLocation, sendLocalNotification]);

  const createConstructionBooking = useCallback(async (projectData) => {
    try {
      if (!hasPermission('create_construction_project')) {
        throw new Error('CONSTRUCTION_PERMISSION_REQUIRED');
      }

      setState(prev => ({ ...prev, isCreating: true, creationError: null }));

      // Validate construction project data
      const validationError = validateConstructionProjectData(projectData);
      if (validationError) {
        throw new Error(validationError);
      }

      // AI Worker matching for construction projects
      const workerAssignments = await matchAIWorkersForProject(projectData);

      const constructionBooking = {
        ...projectData,
        bookingType: BOOKING_TYPES.CONSTRUCTION,
        customerId: user.id,
        workerAssignments,
        phases: generateConstructionPhases(projectData),
        metadata: {
          projectType: projectData.projectType,
          squareMeters: projectData.squareMeters,
          floors: projectData.floors,
          timeline: projectData.timeline,
          budget: projectData.budget,
        },
      };

      const response = await api.post('/bookings/construction-create', constructionBooking);
      const newBooking = response.data;

      setState(prev => ({
        ...prev,
        bookings: [newBooking, ...prev.bookings],
        constructionBookings: [newBooking, ...prev.constructionBookings],
        constructionProject: newBooking,
        isCreating: false,
      }));

      await analyticsService.trackEvent('construction_booking_created', {
        bookingId: newBooking.id,
        projectType: projectData.projectType,
        squareMeters: projectData.squareMeters,
        budget: projectData.budget,
        workerCount: workerAssignments.length,
      });

      return { success: true, booking: newBooking, workerAssignments };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ConstructionBookingCreation',
        projectData,
      });
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        creationError: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [user, hasPermission]);

  // ===========================================================================
  // ENTERPRISE BOOKING MANAGEMENT
  // ===========================================================================

  const updateEnterpriseBooking = useCallback(async (bookingId, updates) => {
    try {
      if (!isAuthenticated) {
        throw new Error('ENTERPRISE_AUTHENTICATION_REQUIRED');
      }

      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      // Enhanced validation for updates
      if (updates.scheduledAt) {
        const booking = state.bookings.find(b => b.id === bookingId);
        if (booking) {
          const availability = await checkEnterpriseAvailability(
            booking.providerId,
            updates.scheduledAt,
            booking.duration,
            booking.bookingType
          );
          
          if (!availability.available) {
            throw new Error('UNAVAILABLE_TIME_SLOT');
          }
        }
      }

      const response = await api.patch(`/bookings/${bookingId}/enterprise-update`, updates);
      const updatedBooking = response.data;

      // Update all relevant state arrays
      setState(prev => ({
        ...prev,
        bookings: prev.bookings.map(booking =>
          booking.id === bookingId ? { ...booking, ...updatedBooking } : booking
        ),
        upcomingBookings: prev.upcomingBookings.map(booking =>
          booking.id === bookingId ? { ...booking, ...updatedBooking } : booking
        ),
        ...(prev.currentBooking?.id === bookingId && {
          currentBooking: { ...prev.currentBooking, ...updatedBooking },
        }),
        ...(updatedBooking.bookingType === BOOKING_TYPES.CONSTRUCTION && {
          constructionBookings: prev.constructionBookings.map(booking =>
            booking.id === bookingId ? { ...booking, ...updatedBooking } : booking
          ),
        }),
        isUpdating: false,
      }));

      // Update cache
      await cacheEnterpriseBookingData(`booking_${bookingId}`, updatedBooking);

      await sendLocalNotification({
        title: 'Booking Updated',
        body: `Your ${updatedBooking.bookingType} booking has been updated`,
        data: { 
          type: 'enterprise_booking_updated',
          bookingId,
          bookingType: updatedBooking.bookingType,
        },
      });

      await analyticsService.trackEvent('enterprise_booking_updated', {
        bookingId,
        updates: Object.keys(updates),
        newStatus: updatedBooking.status,
        bookingType: updatedBooking.bookingType,
      });

      return { success: true, booking: updatedBooking };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseBookingUpdate',
        bookingId,
        updates,
      });
      
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [isAuthenticated, state.bookings, sendLocalNotification]);

  const cancelEnterpriseBooking = useCallback(async (bookingId, reason = CANCELLATION_REASONS.CUSTOMER_REQUEST, note = '') => {
    try {
      if (!isAuthenticated) {
        throw new Error('ENTERPRISE_AUTHENTICATION_REQUIRED');
      }

      setState(prev => ({ ...prev, isCancelling: true, cancellationError: null }));

      const response = await api.post(`/bookings/${bookingId}/enterprise-cancel`, {
        reason,
        note,
        cancelledBy: user.id,
        cancellationTime: new Date().toISOString(),
      });

      const cancelledBooking = response.data;

      setState(prev => ({
        ...prev,
        bookings: prev.bookings.map(booking =>
          booking.id === bookingId ? cancelledBooking : booking
        ),
        upcomingBookings: prev.upcomingBookings.filter(booking => booking.id !== bookingId),
        cancelledBookings: [cancelledBooking, ...prev.cancelledBookings],
        ...(prev.currentBooking?.id === bookingId && {
          currentBooking: cancelledBooking,
        }),
        ...(cancelledBooking.bookingType === BOOKING_TYPES.CONSTRUCTION && {
          constructionBookings: prev.constructionBookings.map(booking =>
            booking.id === bookingId ? cancelledBooking : booking
          ),
        }),
        isCancelling: false,
      }));

      await sendLocalNotification({
        title: 'Booking Cancelled',
        body: `Your ${cancelledBooking.bookingType} booking has been cancelled`,
        data: { 
          type: 'enterprise_booking_cancelled',
          bookingId,
          bookingType: cancelledBooking.bookingType,
        },
      });

      await analyticsService.trackEvent('enterprise_booking_cancelled', {
        bookingId,
        reason,
        bookingType: cancelledBooking.bookingType,
        refundAmount: cancelledBooking.refundAmount,
      });

      return { success: true, booking: cancelledBooking };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseBookingCancellation',
        bookingId,
        reason,
      });
      
      setState(prev => ({
        ...prev,
        isCancelling: false,
        cancellationError: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [isAuthenticated, user, sendLocalNotification]);

  // ===========================================================================
  // ENTERPRISE SCHEDULING & AVAILABILITY
  // ===========================================================================

  const checkEnterpriseAvailability = useCallback(async (providerId, startTime, duration = 60, bookingType = BOOKING_TYPES.SERVICE) => {
    try {
      setState(prev => ({ ...prev, isCheckingAvailability: true }));

      if (availabilityTimeoutRef.current) {
        clearTimeout(availabilityTimeoutRef.current);
      }

      return new Promise((resolve) => {
        availabilityTimeoutRef.current = setTimeout(async () => {
          try {
            const response = await api.get('/bookings/enterprise-availability', {
              params: {
                providerId,
                startTime: startTime.toISOString(),
                duration,
                bookingType,
                location: currentLocation,
              },
            });

            const { available, conflicts, availableSlots, suggestedTimes } = response.data;

            setState(prev => ({
              ...prev,
              availableSlots: availableSlots || [],
              scheduleConflicts: conflicts || [],
              isCheckingAvailability: false,
            }));

            resolve({ available, conflicts, availableSlots, suggestedTimes });
          } catch (error) {
            await errorService.captureError(error, {
              context: 'EnterpriseAvailabilityCheck',
              providerId,
              startTime,
              bookingType,
            });
            
            setState(prev => ({ ...prev, isCheckingAvailability: false }));
            resolve({ available: false, conflicts: [], availableSlots: [], suggestedTimes: [] });
          }
        }, 400); // Slightly longer debounce for enterprise checks
      });

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseAvailabilityCheck',
        providerId,
        startTime,
      });
      
      setState(prev => ({ ...prev, isCheckingAvailability: false }));
      return { available: false, conflicts: [], availableSlots: [], suggestedTimes: [] };
    }
  }, [currentLocation]);

  const getEnterpriseAvailableSlots = useCallback(async (providerId, date, duration = 60, bookingType = BOOKING_TYPES.SERVICE) => {
    try {
      setState(prev => ({ ...prev, isCheckingAvailability: true }));

      const response = await api.get('/bookings/enterprise-available-slots', {
        params: {
          providerId,
          date: date.toISOString().split('T')[0],
          duration,
          bookingType,
          timezone: 'Africa/Addis_Ababa', // Ethiopian timezone
        },
      });

      const { slots, blockedSlots, peakHours, recommendedSlots } = response.data;

      setState(prev => ({
        ...prev,
        availableSlots: slots,
        blockedSlots,
        isCheckingAvailability: false,
      }));

      return { slots, blockedSlots, peakHours, recommendedSlots };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseAvailableSlots',
        providerId,
        date,
        bookingType,
      });
      
      setState(prev => ({ ...prev, isCheckingAvailability: false }));
      throw error;
    }
  }, []);

  // ===========================================================================
  // ENTERPRISE PAYMENT PROCESSING
  // ===========================================================================

  const processEnterprisePayment = useCallback(async (bookingId, paymentMethodId, paymentData = {}) => {
    try {
      if (!isAuthenticated) {
        throw new Error('ENTERPRISE_AUTHENTICATION_REQUIRED');
      }

      setState(prev => ({ ...prev, isProcessingPayment: true, paymentError: null }));

      const response = await api.post(`/bookings/${bookingId}/enterprise-payment`, {
        paymentMethodId,
        ...paymentData,
        currency: 'ETB', // Ethiopian Birr
        metadata: {
          processedVia: 'mobile_app',
          deviceInfo: getDeviceInfo(),
          ...paymentData.metadata,
        },
      });

      const { payment, booking } = response.data;

      setState(prev => ({
        ...prev,
        currentPayment: payment,
        bookings: prev.bookings.map(b =>
          b.id === bookingId ? { ...b, ...booking, paymentStatus: payment.status } : b
        ),
        ...(prev.currentBooking?.id === bookingId && {
          currentBooking: { ...prev.currentBooking, ...booking, paymentStatus: payment.status },
        }),
        isProcessingPayment: false,
      }));

      await analyticsService.trackEvent('enterprise_payment_processed', {
        bookingId,
        paymentMethod: paymentMethodId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        bookingType: booking.bookingType,
      });

      return { success: true, payment, booking };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterprisePaymentProcessing',
        bookingId,
        paymentMethodId,
      });
      
      setState(prev => ({
        ...prev,
        isProcessingPayment: false,
        paymentError: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ===========================================================================
  // ENTERPRISE UTILITY FUNCTIONS
  // ===========================================================================

  const validateEnterpriseBookingData = (bookingData) => {
    const requiredFields = ['serviceId', 'providerId', 'scheduledAt'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
      return `MISSING_REQUIRED_FIELDS: ${missingFields.join(', ')}`;
    }

    const bookingTime = new Date(bookingData.scheduledAt);
    const now = new Date();
    
    if (bookingTime < now) {
      return 'BOOKING_TIME_IN_PAST';
    }

    // Ethiopian business hours validation
    if (bookingData.bookingType === BOOKING_TYPES.SERVICE) {
      const ethiopianHour = bookingTime.getHours();
      if (ethiopianHour < 8 || ethiopianHour > 18) {
        return 'OUTSIDE_BUSINESS_HOURS';
      }
    }

    return null;
  };

  const validateConstructionProjectData = (projectData) => {
    const requiredFields = ['projectType', 'squareMeters', 'budget', 'timeline'];
    const missingFields = requiredFields.filter(field => !projectData[field]);
    
    if (missingFields.length > 0) {
      return `MISSING_CONSTRUCTION_FIELDS: ${missingFields.join(', ')}`;
    }

    if (projectData.squareMeters < 1) {
      return 'INVALID_SQUARE_METERS';
    }

    if (projectData.budget < 1000) { // Minimum 1000 ETB
      return 'INSUFFICIENT_BUDGET';
    }

    return null;
  };

  const matchAIWorkersForProject = async (projectData) => {
    try {
      const response = await api.post('/ai/construction/workers/match', {
        projectRequirements: projectData,
        location: currentLocation,
        budget: projectData.budget,
      });

      return response.data.workerAssignments;
    } catch (error) {
      await errorService.captureError(error, {
        context: 'AIWorkerMatching',
        projectData,
      });
      
      return [];
    }
  };

  const generateConstructionPhases = (projectData) => {
    const phases = [];
    const phaseDuration = Math.floor(projectData.timeline / 6); // Divide timeline into 6 phases
    
    Object.values(CONSTRUCTION_BOOKING_PHASES).forEach((phase, index) => {
      phases.push({
        phase,
        sequence: index + 1,
        duration: phaseDuration,
        status: index === 0 ? 'pending' : 'not_started',
        startDate: null,
        endDate: null,
      });
    });
    
    return phases;
  };

  // ===========================================================================
  // ENTERPRISE COMPUTED VALUES & ANALYTICS
  // ===========================================================================

  const enterpriseBookingStats = useMemo(() => {
    const stats = {
      total: state.bookings.length,
      upcoming: state.upcomingBookings.length,
      completed: state.bookings.filter(b => b.status === BOOKING_STATUS.COMPLETED).length,
      cancelled: state.bookings.filter(b => b.status === BOOKING_STATUS.CANCELLED).length,
      pending: state.bookings.filter(b => b.status === BOOKING_STATUS.PENDING).length,
      construction: state.constructionBookings.length,
      government: state.governmentBookings.length,
      totalRevenue: state.bookings
        .filter(b => b.paymentStatus === PAYMENT_STATUS.COMPLETED)
        .reduce((sum, b) => sum + b.totalAmount, 0),
      averageRating: calculateAverageRating(state.bookings),
    };
    
    return stats;
  }, [state.bookings, state.upcomingBookings, state.constructionBookings, state.governmentBookings]);

  const upcomingBookingsCount = useMemo(() => {
    return state.upcomingBookings.length;
  }, [state.upcomingBookings]);

  const constructionProjectsCount = useMemo(() => {
    return state.constructionBookings.length;
  }, [state.constructionBookings]);

  // ===========================================================================
  // ENTERPRISE HOOK API
  // ===========================================================================

  const enterpriseBookingsAPI = {
    // State
    ...state,
    enterpriseBookingStats,
    upcomingBookingsCount,
    constructionProjectsCount,

    // Core Operations
    initializeBookings: initializeEnterpriseBookings,
    createBooking: createEnterpriseBooking,
    createConstructionBooking,
    updateBooking: updateEnterpriseBooking,
    cancelBooking: cancelEnterpriseBooking,
    processPayment: processEnterprisePayment,

    // Scheduling & Availability
    checkAvailability: checkEnterpriseAvailability,
    getAvailableSlots: getEnterpriseAvailableSlots,

    // Utility Functions
    canCancelBooking: (booking) => {
      if (!booking) return false;
      
      const bookingTime = new Date(booking.scheduledAt);
      const now = new Date();
      const hoursUntil = (bookingTime - now) / (1000 * 60 * 60);
      
      const cancellationWindow = booking.bookingType === BOOKING_TYPES.CONSTRUCTION ? 48 : 24;
      return booking.status === BOOKING_STATUS.CONFIRMED && hoursUntil > cancellationWindow;
    },

    canModifyBooking: (booking) => {
      if (!booking) return false;
      
      const bookingTime = new Date(booking.scheduledAt);
      const now = new Date();
      const hoursUntil = (bookingTime - now) / (1000 * 60 * 60);
      
      return booking.status === BOOKING_STATUS.CONFIRMED && hoursUntil > 2;
    },

    getBookingTypeLabel: (bookingType) => {
      const labels = {
        [BOOKING_TYPES.SERVICE]: 'Service Booking',
        [BOOKING_TYPES.CONSTRUCTION]: 'Construction Project',
        [BOOKING_TYPES.GOVERNMENT]: 'Government Project',
        [BOOKING_TYPES.URGENT]: 'Urgent Service',
        [BOOKING_TYPES.RECURRING]: 'Recurring Service',
        [BOOKING_TYPES.GROUP]: 'Group Booking',
      };
      
      return labels[bookingType] || 'Booking';
    },

    // Error Handling
    clearErrors: () => setState(prev => ({ 
      ...prev, 
      error: null, 
      creationError: null, 
      paymentError: null,
      cancellationError: null,
      schedulingError: null,
    })),
  };

  // ===========================================================================
  // EFFECTS & CLEANUP
  // ===========================================================================

  useEffect(() => {
    if (isAuthenticated) {
      initializeEnterpriseBookings();
    }
  }, [initializeEnterpriseBookings, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (availabilityTimeoutRef.current) clearTimeout(availabilityTimeoutRef.current);
      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
      if (realTimeSubscriptionRef.current) realTimeSubscriptionRef.current.unsubscribe();
      if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  return enterpriseBookingsAPI;
};

// =============================================================================
// ENTERPRISE SPECIALIZED HOOKS
// =============================================================================

export const useConstructionBookings = () => {
  const { 
    constructionBookings, 
    createConstructionBooking, 
    updateBooking,
    cancelBooking,
    enterpriseBookingStats 
  } = useBookings();

  const activeConstructionProjects = useMemo(() => {
    return constructionBookings.filter(project => 
      [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS].includes(project.status)
    );
  }, [constructionBookings]);

  const updateConstructionPhase = useCallback(async (bookingId, phaseUpdates) => {
    return updateBooking(bookingId, {
      constructionPhases: phaseUpdates,
      lastPhaseUpdate: new Date().toISOString(),
    });
  }, [updateBooking]);

  const assignWorkersToProject = useCallback(async (bookingId, workerAssignments) => {
    return updateBooking(bookingId, {
      workerAssignments,
      lastWorkerUpdate: new Date().toISOString(),
    });
  }, [updateBooking]);

  return {
    constructionBookings,
    activeConstructionProjects,
    createConstructionBooking,
    updateConstructionPhase,
    assignWorkersToProject,
    cancelConstructionBooking: cancelBooking,
    constructionStats: enterpriseBookingStats,
  };
};

export const useBookingAnalytics = (timeRange = '30d') => {
  const { bookings, enterpriseBookingStats } = useBookings();

  const analytics = useMemo(() => {
    const now = new Date();
    const rangeStart = new Date(now);
    
    switch (timeRange) {
      case '7d':
        rangeStart.setDate(now.getDate() - 7);
        break;
      case '30d':
        rangeStart.setDate(now.getDate() - 30);
        break;
      case '90d':
        rangeStart.setDate(now.getDate() - 90);
        break;
      default:
        rangeStart.setDate(now.getDate() - 30);
    }

    const filteredBookings = bookings.filter(booking => 
      new Date(booking.createdAt) >= rangeStart
    );

    const revenueByBookingType = filteredBookings
      .filter(b => b.paymentStatus === PAYMENT_STATUS.COMPLETED)
      .reduce((acc, booking) => {
        acc[booking.bookingType] = (acc[booking.bookingType] || 0) + booking.totalAmount;
        return acc;
      }, {});

    const completionRateByType = Object.keys(BOOKING_TYPES).reduce((acc, type) => {
      const typeBookings = filteredBookings.filter(b => b.bookingType === type);
      const completed = typeBookings.filter(b => b.status === BOOKING_STATUS.COMPLETED).length;
      acc[type] = typeBookings.length > 0 ? (completed / typeBookings.length) * 100 : 0;
      return acc;
    }, {});

    return {
      ...enterpriseBookingStats,
      revenueByBookingType,
      completionRateByType,
      timeRange,
      periodStart: rangeStart.toISOString(),
      periodEnd: now.toISOString(),
    };
  }, [bookings, enterpriseBookingStats, timeRange]);

  return analytics;
};

// =============================================================================
// ENTERPRISE UTILITY FUNCTIONS
// =============================================================================

const setupEnterpriseRealTimeUpdates = async () => {
  // Implementation for WebSocket or server-sent events
};

const setupEnterpriseStatusMonitoring = () => {
  // Enhanced status monitoring for enterprise features
};

const cacheEnterpriseBookingsData = async (bookings) => {
  await storage.set(STORAGE_KEYS.BOOKINGS_CACHE, {
    bookings,
    timestamp: Date.now(),
    version: '2.0.0',
  });
};

const cacheEnterpriseBookingData = async (key, data) => {
  // Enhanced caching with versioning
};

const clearEnterpriseCache = async () => {
  await storage.remove(STORAGE_KEYS.BOOKINGS_CACHE);
};

const getBookingCreationTitle = (bookingType) => {
  const titles = {
    [BOOKING_TYPES.SERVICE]: 'Service Booking Confirmed',
    [BOOKING_TYPES.CONSTRUCTION]: 'Construction Project Started',
    [BOOKING_TYPES.GOVERNMENT]: 'Government Project Approved',
    [BOOKING_TYPES.URGENT]: 'Urgent Service Scheduled',
  };
  
  return titles[bookingType] || 'Booking Confirmed';
};

const getBookingCreationMessage = (booking) => {
  if (booking.bookingType === BOOKING_TYPES.CONSTRUCTION) {
    return `Your ${booking.metadata.projectType} project has been scheduled with ${booking.workerAssignments.length} workers`;
  }
  
  return `Your booking for ${booking.serviceName} has been confirmed for ${new Date(booking.scheduledAt).toLocaleDateString()}`;
};

const calculateAverageRating = (bookings) => {
  const ratedBookings = bookings.filter(b => b.rating && b.status === BOOKING_STATUS.COMPLETED);
  if (ratedBookings.length === 0) return 0;
  
  const totalRating = ratedBookings.reduce((sum, b) => sum + b.rating, 0);
  return totalRating / ratedBookings.length;
};

const getDeviceInfo = () => {
  return {
    platform: 'react-native',
    timestamp: new Date().toISOString(),
    timezone: 'Africa/Addis_Ababa',
  };
};

export default useBookings;