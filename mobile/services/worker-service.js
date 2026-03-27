import { Platform } from 'react-native';
import { 
  WORKER_CONFIG, 
  WORKER_ROLES, 
  WORKER_STATUS,
  SKILL_LEVELS,
  VERIFICATION_LEVELS 
} from '../config/worker';
import { 
  LOCATION_CONFIG,
  SERVICE_AREAS 
} from '../config/location';
import { 
  validateWorkerProfile,
  validateSkills,
  calculateWorkerRating,
  generateWorkerId 
} from '../utils/worker-utils';
import { 
  formatCurrency,
  formatEthiopianDate,
  calculateDistance 
} from '../utils/formatters';
import { 
  calculateEfficiencyScore,
  calculateAvailabilityScore,
  predictJobSuccess 
} from '../utils/worker-analytics';
import api from './api';
import analyticsService from './analytics-service';
import errorService from './error-service';
import notificationService from './notification-service';
import locationService from './location-service';

class WorkerService {
  constructor() {
    this.isInitialized = false;
    this.workerCache = new Map();
    this.workerSearchCache = new Map();
    this.availabilityCache = new Map();
    this.ratingUpdates = new Map();
    this.workerStats = new Map();
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize worker service
   */
  async initialize(config = {}) {
    try {
      if (this.isInitialized) {
        console.warn('Worker service already initialized');
        return true;
      }

      // Load worker configuration
      await this.loadWorkerConfig();

      // Initialize caches
      await this.initializeCaches();

      // Set up periodic cache cleanup
      this.startCacheCleanup();

      this.isInitialized = true;

      await this.trackEvent('service_initialized', {
        service: 'worker_service'
      });

      console.log('Worker service initialized successfully');
      return true;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_service_initialization'
      });
      throw new Error('WORKER_SERVICE_INIT_FAILED');
    }
  }

  // ==================== WORKER PROFILES ====================

  /**
   * Get worker profile by ID
   */
  async getWorkerProfile(workerId, options = {}) {
    try {
      const {
        forceRefresh = false,
        includeAnalytics = false,
        includeAvailability = false
      } = options;

      // Check cache first
      if (!forceRefresh) {
        const cached = this.workerCache.get(workerId);
        if (cached && !this.isCacheExpired(cached)) {
          return cached;
        }
      }

      const params = {
        includeAnalytics,
        includeAvailability
      };

      const response = await api.get(`/workers/${workerId}/profile`, params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch worker profile');
      }

      const profile = response.data.profile;

      // Enhance profile with calculated data
      const enhancedProfile = await this.enhanceWorkerProfile(profile);

      // Cache the profile
      this.cacheWorkerProfile(workerId, enhancedProfile);

      await this.trackEvent('worker_profile_retrieved', {
        workerId,
        includeAnalytics,
        includeAvailability
      });

      return enhancedProfile;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_profile_retrieval',
        workerId,
        options
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Update worker profile
   */
  async updateWorkerProfile(workerId, updates, options = {}) {
    try {
      // Validate updates
      const validation = await this.validateProfileUpdates(workerId, updates);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await api.put(`/workers/${workerId}/profile`, updates);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update worker profile');
      }

      const updatedProfile = response.data.profile;

      // Invalidate cache
      this.workerCache.delete(workerId);
      this.workerSearchCache.clear();

      // Send notification for significant changes
      if (this.isSignificantUpdate(updates)) {
        await this.notifyProfileUpdate(workerId, updates);
      }

      await this.trackEvent('worker_profile_updated', {
        workerId,
        updatedFields: Object.keys(updates),
        verificationLevel: updatedProfile.verificationLevel
      });

      return updatedProfile;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_profile_update',
        workerId,
        updates
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Enhance worker profile with calculated data
   */
  async enhanceWorkerProfile(profile) {
    const enhanced = { ...profile };

    // Calculate overall rating
    enhanced.rating = calculateWorkerRating(profile);

    // Calculate efficiency score
    enhanced.efficiencyScore = calculateEfficiencyScore(profile);

    // Calculate availability score
    enhanced.availabilityScore = await calculateAvailabilityScore(profile);

    // Predict job success rate
    enhanced.successPrediction = predictJobSuccess(profile);

    // Format pricing
    enhanced.formattedPricing = this.formatWorkerPricing(profile);

    // Calculate response time average
    enhanced.avgResponseTime = this.calculateAverageResponseTime(profile);

    return enhanced;
  }

  // ==================== WORKER SEARCH & DISCOVERY ====================

  /**
   * Search workers with advanced filtering
   */
  async searchWorkers(searchCriteria, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'rating',
        sortOrder = 'desc',
        forceRefresh = false
      } = options;

      // Generate cache key
      const cacheKey = this.generateSearchCacheKey(searchCriteria, options);

      // Check cache first
      if (!forceRefresh) {
        const cached = this.workerSearchCache.get(cacheKey);
        if (cached && !this.isCacheExpired(cached)) {
          return cached;
        }
      }

      // Prepare search parameters
      const params = {
        ...searchCriteria,
        page,
        limit,
        sortBy,
        sortOrder,
        includeAnalytics: true
      };

      const response = await api.get('/workers/search', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to search workers');
      }

      const result = {
        workers: await this.enhanceWorkerProfiles(response.data.workers),
        pagination: response.data.pagination,
        filters: response.data.availableFilters,
        searchSummary: response.data.summary
      };

      // Cache the result
      this.workerSearchCache.set(cacheKey, result);

      await this.trackEvent('worker_search_performed', {
        searchCriteria: Object.keys(searchCriteria),
        resultCount: result.workers.length,
        page,
        sortBy
      });

      return result;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_search',
        searchCriteria,
        options
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Find workers near location
   */
  async findNearbyWorkers(location, radius = 10, options = {}) {
    try {
      const {
        serviceType = null,
        skills = [],
        minRating = 0,
        availableNow = false
      } = options;

      const searchCriteria = {
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        serviceType,
        skills: skills.join(','),
        minRating,
        availableNow
      };

      return await this.searchWorkers(searchCriteria, options);

    } catch (error) {
      await errorService.captureError(error, {
        context: 'nearby_workers_search',
        location,
        radius,
        options
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Get recommended workers for a job
   */
  async getRecommendedWorkers(jobRequirements, options = {}) {
    try {
      const {
        maxWorkers = 10,
        considerLocation = true,
        considerAvailability = true
      } = options;

      const recommendationCriteria = {
        ...jobRequirements,
        maxWorkers,
        considerLocation,
        considerAvailability,
        recommendationEngine: 'ai_v1'
      };

      const response = await api.post('/workers/recommendations', recommendationCriteria);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get worker recommendations');
      }

      const recommendations = {
        workers: await this.enhanceWorkerProfiles(response.data.workers),
        matchScores: response.data.matchScores,
        reasoning: response.data.reasoning,
        generatedAt: new Date().toISOString()
      };

      await this.trackEvent('worker_recommendations_generated', {
        jobType: jobRequirements.serviceType,
        workerCount: recommendations.workers.length,
        averageMatchScore: this.calculateAverageMatchScore(recommendations.matchScores)
      });

      return recommendations;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_recommendations',
        jobRequirements,
        options
      });
      throw this.formatWorkerError(error);
    }
  }

  // ==================== SKILLS & CERTIFICATIONS ====================

  /**
   * Update worker skills
   */
  async updateWorkerSkills(workerId, skills, options = {}) {
    try {
      // Validate skills
      const validation = validateSkills(skills);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await api.put(`/workers/${workerId}/skills`, {
        skills,
        updatedBy: options.updatedBy || 'worker'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update worker skills');
      }

      // Invalidate caches
      this.workerCache.delete(workerId);
      this.workerSearchCache.clear();

      await this.trackEvent('worker_skills_updated', {
        workerId,
        skillCount: skills.length,
        skillCategories: this.extractSkillCategories(skills)
      });

      return response.data.skills;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_skills_update',
        workerId,
        skills
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Add worker certification
   */
  async addWorkerCertification(workerId, certification, options = {}) {
    try {
      // Validate certification
      const validation = this.validateCertification(certification);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await api.post(`/workers/${workerId}/certifications`, certification);

      if (!response.success) {
        throw new Error(response.error || 'Failed to add certification');
      }

      // Invalidate cache
      this.workerCache.delete(workerId);

      await this.trackEvent('worker_certification_added', {
        workerId,
        certificationId: response.data.certification.id,
        certificationType: certification.type
      });

      return response.data.certification;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_certification_add',
        workerId,
        certification
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Verify worker certification
   */
  async verifyWorkerCertification(workerId, certificationId, verificationData) {
    try {
      const response = await api.post(
        `/workers/${workerId}/certifications/${certificationId}/verify`,
        verificationData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to verify certification');
      }

      // Invalidate cache
      this.workerCache.delete(workerId);

      await this.trackEvent('worker_certification_verified', {
        workerId,
        certificationId,
        verifiedBy: verificationData.verifiedBy,
        verificationLevel: response.data.verificationLevel
      });

      return response.data.certification;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_certification_verification',
        workerId,
        certificationId
      });
      throw this.formatWorkerError(error);
    }
  }

  // ==================== AVAILABILITY & SCHEDULING ====================

  /**
   * Update worker availability
   */
  async updateWorkerAvailability(workerId, availability, options = {}) {
    try {
      const response = await api.put(`/workers/${workerId}/availability`, {
        availability,
        updatedBy: options.updatedBy || 'worker',
        effectiveFrom: options.effectiveFrom || new Date().toISOString()
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update availability');
      }

      // Update availability cache
      this.availabilityCache.set(workerId, {
        availability: response.data.availability,
        lastUpdated: new Date().toISOString()
      });

      await this.trackEvent('worker_availability_updated', {
        workerId,
        availabilityType: availability.type,
        effectiveFrom: options.effectiveFrom
      });

      return response.data.availability;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_availability_update',
        workerId,
        availability
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Check worker availability for time slot
   */
  async checkWorkerAvailability(workerId, timeSlot, options = {}) {
    try {
      const cacheKey = `availability_${workerId}_${timeSlot.start}_${timeSlot.end}`;

      // Check cache first
      if (this.availabilityCache.has(cacheKey)) {
        return this.availabilityCache.get(cacheKey);
      }

      const response = await api.post(`/workers/${workerId}/availability/check`, {
        timeSlot,
        serviceType: options.serviceType,
        duration: options.duration
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to check availability');
      }

      const availability = response.data.availability;

      // Cache the result
      this.availabilityCache.set(cacheKey, availability);

      return availability;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_availability_check',
        workerId,
        timeSlot,
        options
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Get worker schedule
   */
  async getWorkerSchedule(workerId, dateRange, options = {}) {
    try {
      const response = await api.get(`/workers/${workerId}/schedule`, {
        startDate: dateRange.start,
        endDate: dateRange.end,
        includeBookings: options.includeBookings || true
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch schedule');
      }

      return response.data.schedule;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_schedule_retrieval',
        workerId,
        dateRange
      });
      throw this.formatWorkerError(error);
    }
  }

  // ==================== RATINGS & REVIEWS ====================

  /**
   * Submit worker rating
   */
  async submitWorkerRating(workerId, ratingData, options = {}) {
    try {
      // Validate rating data
      const validation = this.validateRatingData(ratingData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await api.post(`/workers/${workerId}/ratings`, {
        ...ratingData,
        submittedBy: options.submittedBy,
        jobId: options.jobId
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to submit rating');
      }

      // Update local rating cache
      this.updateRatingCache(workerId, response.data.rating);

      // Invalidate worker cache
      this.workerCache.delete(workerId);

      await this.trackEvent('worker_rating_submitted', {
        workerId,
        rating: ratingData.rating,
        jobId: options.jobId
      });

      return response.data.rating;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_rating_submission',
        workerId,
        ratingData
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Get worker reviews
   */
  async getWorkerReviews(workerId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'date',
        sortOrder = 'desc',
        filterByRating = null
      } = options;

      const response = await api.get(`/workers/${workerId}/reviews`, {
        page,
        limit,
        sortBy,
        sortOrder,
        filterByRating
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch reviews');
      }

      return {
        reviews: response.data.reviews,
        pagination: response.data.pagination,
        ratingSummary: response.data.ratingSummary
      };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_reviews_retrieval',
        workerId,
        options
      });
      throw this.formatWorkerError(error);
    }
  }

  // ==================== WORKER ANALYTICS ====================

  /**
   * Get worker performance analytics
   */
  async getWorkerAnalytics(workerId, dateRange, options = {}) {
    try {
      const response = await api.get(`/workers/${workerId}/analytics`, {
        startDate: dateRange.start,
        endDate: dateRange.end,
        metrics: options.metrics || 'all',
        granularity: options.granularity || 'daily'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics');
      }

      const analytics = response.data.analytics;

      // Enhance with insights
      analytics.insights = this.generateWorkerInsights(analytics);

      // Cache analytics
      this.workerStats.set(workerId, analytics);

      return analytics;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_analytics_retrieval',
        workerId,
        dateRange
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Get worker earnings report
   */
  async getWorkerEarnings(workerId, dateRange, options = {}) {
    try {
      const response = await api.get(`/workers/${workerId}/earnings`, {
        startDate: dateRange.start,
        endDate: dateRange.end,
        breakdown: options.breakdown || 'category',
        includeTaxes: options.includeTaxes || false
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch earnings');
      }

      return response.data.earnings;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_earnings_retrieval',
        workerId,
        dateRange
      });
      throw this.formatWorkerError(error);
    }
  }

  // ==================== WORKER VERIFICATION ====================

  /**
   * Submit worker for verification
   */
  async submitWorkerVerification(workerId, verificationData, options = {}) {
    try {
      // Validate verification data
      const validation = this.validateVerificationData(verificationData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await api.post(`/workers/${workerId}/verification`, {
        ...verificationData,
        submittedBy: options.submittedBy || 'worker'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to submit verification');
      }

      await this.trackEvent('worker_verification_submitted', {
        workerId,
        verificationLevel: verificationData.level,
        documentTypes: verificationData.documents?.map(d => d.type) || []
      });

      return response.data.verification;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_verification_submission',
        workerId,
        verificationData
      });
      throw this.formatWorkerError(error);
    }
  }

  /**
   * Check verification status
   */
  async getVerificationStatus(workerId) {
    try {
      const response = await api.get(`/workers/${workerId}/verification/status`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch verification status');
      }

      return response.data.verification;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'verification_status_check',
        workerId
      });
      throw this.formatWorkerError(error);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate profile updates
   */
  async validateProfileUpdates(workerId, updates) {
    const errors = [];

    // Check if worker exists
    try {
      await this.getWorkerProfile(workerId, { forceRefresh: true });
    } catch (error) {
      errors.push('Worker not found');
    }

    // Validate specific fields
    if (updates.hourlyRate && updates.hourlyRate < WORKER_CONFIG.MIN_HOURLY_RATE) {
      errors.push(`Hourly rate must be at least ${formatCurrency(WORKER_CONFIG.MIN_HOURLY_RATE)}`);
    }

    if (updates.skills) {
      const skillsValidation = validateSkills(updates.skills);
      if (!skillsValidation.isValid) {
        errors.push(...skillsValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format worker pricing for display
   */
  formatWorkerPricing(profile) {
    return {
      hourly: profile.hourlyRate ? formatCurrency(profile.hourlyRate) : 'Not set',
      daily: profile.dailyRate ? formatCurrency(profile.dailyRate) : null,
      minJob: profile.minJobPrice ? formatCurrency(profile.minJobPrice) : null
    };
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(profile) {
    if (!profile.responseTimes || profile.responseTimes.length === 0) {
      return 'Not available';
    }

    const avgMs = profile.responseTimes.reduce((sum, time) => sum + time, 0) / profile.responseTimes.length;
    return this.formatResponseTime(avgMs);
  }

  /**
   * Format response time for display
   */
  formatResponseTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }

  /**
   * Generate search cache key
   */
  generateSearchCacheKey(searchCriteria, options) {
    return `search_${JSON.stringify(searchCriteria)}_${JSON.stringify(options)}`;
  }

  /**
   * Check if cache is expired
   */
  isCacheExpired(cachedItem, ttl = WORKER_CONFIG.CACHE_TTL) {
    if (!cachedItem.cachedAt) return true;
    return Date.now() - new Date(cachedItem.cachedAt).getTime() > ttl;
  }

  /**
   * Format worker error for user display
   */
  formatWorkerError(error) {
    const errorMap = {
      'WORKER_NOT_FOUND': 'Worker not found',
      'INVALID_SKILLS': 'Invalid skills provided',
      'VERIFICATION_FAILED': 'Verification process failed',
      'AVAILABILITY_CONFLICT': 'Schedule conflict detected',
      'RATING_VALIDATION_FAILED': 'Invalid rating data'
    };

    const message = errorMap[error.message] || 
                   error.response?.data?.message || 
                   'Worker service operation failed';

    return new Error(message);
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Cache worker profile
   */
  cacheWorkerProfile(workerId, profile) {
    this.workerCache.set(workerId, {
      ...profile,
      cachedAt: new Date().toISOString()
    });
  }

  /**
   * Update rating cache
   */
  updateRatingCache(workerId, newRating) {
    const current = this.ratingUpdates.get(workerId) || [];
    current.push(newRating);
    this.ratingUpdates.set(workerId, current.slice(-WORKER_CONFIG.MAX_RATING_UPDATES));
  }

  /**
   * Start periodic cache cleanup
   */
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCaches();
    }, WORKER_CONFIG.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Cleanup expired caches
   */
  cleanupExpiredCaches() {
    const now = Date.now();

    // Clean worker cache
    for (const [workerId, cached] of this.workerCache.entries()) {
      if (this.isCacheExpired(cached)) {
        this.workerCache.delete(workerId);
      }
    }

    // Clean search cache
    for (const [key, cached] of this.workerSearchCache.entries()) {
      if (this.isCacheExpired(cached)) {
        this.workerSearchCache.delete(key);
      }
    }

    // Clean availability cache
    for (const [key, cached] of this.availabilityCache.entries()) {
      if (this.isCacheExpired(cached, WORKER_CONFIG.AVAILABILITY_CACHE_TTL)) {
        this.availabilityCache.delete(key);
      }
    }
  }

  // ==================== ANALYTICS & TRACKING ====================

  /**
   * Track worker service events
   */
  async trackEvent(eventName, properties = {}) {
    try {
      await analyticsService.trackEvent(`worker_${eventName}`, {
        ...properties,
        service: 'worker_service',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to track worker event:', error);
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Cleanup worker service
   */
  async cleanup() {
    try {
      // Clear all caches
      this.workerCache.clear();
      this.workerSearchCache.clear();
      this.availabilityCache.clear();
      this.ratingUpdates.clear();
      this.workerStats.clear();

      this.isInitialized = false;

      await this.trackEvent('service_cleaned_up');

    } catch (error) {
      await errorService.captureError(error, {
        context: 'worker_service_cleanup'
      });
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      cachedWorkers: this.workerCache.size,
      cachedSearches: this.workerSearchCache.size,
      activeRatingUpdates: this.ratingUpdates.size
    };
  }
}

// Create singleton instance
const workerService = new WorkerService();

export default workerService;