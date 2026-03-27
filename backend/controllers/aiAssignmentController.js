/**
 * Yachi - Enterprise AI Assignment Controller
 * AI-Powered Construction Worker Matching & Project Assignment System
 * @version 1.0.0
 */

const { performance } = require('perf_hooks');
const { YachiLogger } = require('../utils/logger');
const { validationResult } = require('express-validator');
const { redisManager } = require('../config/redis');
const { securityManager } = require('../utils/security');

// Import Services
const { aiService } = require('../services/aiService');
const { workerMatchingService } = require('../services/workerMatchingService');
const { notificationService } = require('../services/yachiNotifications');
const { constructionService } = require('../services/constructionService');

/**
 * Enterprise AI Assignment Controller
 * Handles AI-powered worker matching, project assignment, and team formation
 */
class AIAssignmentController {
  constructor() {
    this.matchingAlgorithms = new Map();
    this.assignmentCache = new Map();
    this.performanceMetrics = new Map();
    
    // Initialize matching algorithms
    this.initializeMatchingAlgorithms();
  }

  /**
   * Initialize AI matching algorithms
   */
  initializeMatchingAlgorithms() {
    // Skill-based matching
    this.matchingAlgorithms.set('skill-based', {
      name: 'Skill-Based Matching',
      weight: 0.35,
      description: 'Matches workers based on required skills and expertise',
      function: this.skillBasedMatching.bind(this)
    });

    // Location-based matching
    this.matchingAlgorithms.set('location-based', {
      name: 'Location-Based Matching',
      weight: 0.25,
      description: 'Prioritizes workers within optimal distance range',
      function: this.locationBasedMatching.bind(this)
    });

    // Rating-based matching
    this.matchingAlgorithms.set('rating-based', {
      name: 'Rating-Based Matching',
      weight: 0.20,
      description: 'Considers worker ratings and reviews',
      function: this.ratingBasedMatching.bind(this)
    });

    // Availability-based matching
    this.matchingAlgorithms.set('availability-based', {
      name: 'Availability-Based Matching',
      weight: 0.10,
      description: 'Matches based on worker availability and schedule',
      function: this.availabilityBasedMatching.bind(this)
    });

    // Cost-based matching
    this.matchingAlgorithms.set('cost-based', {
      name: 'Cost-Based Matching',
      weight: 0.10,
      description: 'Optimizes for budget constraints and cost efficiency',
      function: this.costBasedMatching.bind(this)
    });

    YachiLogger.info('✅ AI Matching algorithms initialized', {
      algorithms: Array.from(this.matchingAlgorithms.keys())
    });
  }

  /**
   * 🏗️ AI Construction Project Assignment
   * Creates AI-powered construction projects with automatic worker matching
   */
  async createAIConstructionProject(req, res) {
    const startTime = performance.now();
    
    try {
      YachiLogger.info('🚀 Creating AI Construction Project', {
        projectType: req.body.projectType,
        userId: req.user.id
      });

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid request data', errors.array());
      }

      // Authenticate and authorize user
      await this.authenticateUser(req.user);
      await this.authorizeProjectCreation(req.user, req.body.projectType);

      const projectData = {
        ...req.body,
        clientId: req.user.id,
        createdBy: req.user.id,
        aiAssigned: true,
        status: 'ai_matching'
      };

      // Step 1: Validate project feasibility
      const feasibility = await this.validateProjectFeasibility(projectData);
      if (!feasibility.feasible) {
        return this.sendErrorResponse(res, 400, 'PROJECT_INFEASIBLE', 'Project not feasible', feasibility.issues);
      }

      // Step 2: Perform AI worker matching
      const matchingResult = await this.performAIWorkerMatching(projectData);
      
      // Step 3: Create project with AI assignments
      const project = await this.createProjectWithAssignments(projectData, matchingResult);

      // Step 4: Send worker invitations
      await this.sendWorkerInvitations(project, matchingResult.assignments);

      // Step 5: Update project status
      await this.updateProjectStatus(project.id, 'worker_invited');

      const processingTime = performance.now() - startTime;

      // Log success
      YachiLogger.info('✅ AI Construction Project Created', {
        projectId: project.id,
        workersMatched: matchingResult.assignments.length,
        processingTime: `${processingTime.toFixed(2)}ms`,
        matchingScore: matchingResult.overallScore
      });

      // Track performance metrics
      this.trackPerformanceMetrics('create_project', processingTime, true);

      return this.sendSuccessResponse(res, 201, {
        message: 'AI construction project created successfully',
        project: this.sanitizeProjectResponse(project),
        assignments: this.sanitizeAssignmentsResponse(matchingResult.assignments),
        matching_metrics: {
          overall_score: matchingResult.overallScore,
          workers_matched: matchingResult.assignments.length,
          processing_time: processingTime
        }
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ AI Construction Project Creation Failed', {
        error: error.message,
        processingTime: `${processingTime.toFixed(2)}ms`,
        userId: req.user.id
      });

      this.trackPerformanceMetrics('create_project', processingTime, false);

      return this.sendErrorResponse(
        res, 
        error.statusCode || 500, 
        error.code || 'AI_ASSIGNMENT_ERROR', 
        error.message || 'Failed to create AI construction project'
      );
    }
  }

  /**
   * 🤖 AI Worker Matching Endpoint
   * Matches workers to construction projects using advanced AI algorithms
   */
  async performAIWorkerMatching(req, res) {
    const startTime = performance.now();

    try {
      YachiLogger.info('🤖 Performing AI Worker Matching', {
        projectId: req.params.projectId,
        userId: req.user.id
      });

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid request data', errors.array());
      }

      // Get project details
      const project = await constructionService.getProjectById(req.params.projectId);
      if (!project) {
        return this.sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', 'Construction project not found');
      }

      // Check permissions
      await this.authorizeProjectAccess(req.user, project);

      // Check cache for existing matching results
      const cacheKey = `ai_matching:${project.id}`;
      const cachedResult = await this.getCachedMatchingResult(cacheKey);
      
      if (cachedResult && !req.query.forceRefresh) {
        YachiLogger.debug('🎯 Using cached AI matching results', { projectId: project.id });
        return this.sendSuccessResponse(res, 200, {
          message: 'AI worker matching results retrieved from cache',
          ...cachedResult
        });
      }

      // Perform AI matching
      const matchingResult = await this.performAdvancedWorkerMatching(project);

      // Cache the results
      await this.cacheMatchingResult(cacheKey, matchingResult);

      const processingTime = performance.now() - startTime;

      YachiLogger.info('✅ AI Worker Matching Completed', {
        projectId: project.id,
        workersMatched: matchingResult.assignments.length,
        processingTime: `${processingTime.toFixed(2)}ms`,
        matchingScore: matchingResult.overallScore
      });

      this.trackPerformanceMetrics('worker_matching', processingTime, true);

      return this.sendSuccessResponse(res, 200, {
        message: 'AI worker matching completed successfully',
        ...matchingResult,
        processing_metrics: {
          processing_time: processingTime,
          algorithms_used: matchingResult.algorithmBreakdown,
          cache_used: !!cachedResult
        }
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ AI Worker Matching Failed', {
        error: error.message,
        projectId: req.params.projectId,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      this.trackPerformanceMetrics('worker_matching', processingTime, false);

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'AI_MATCHING_ERROR',
        error.message || 'Failed to perform AI worker matching'
      );
    }
  }

  /**
   * 🔄 Worker Replacement Endpoint
   * AI-powered worker replacement for declined invitations or emergencies
   */
  async replaceWorkerAI(req, res) {
    const startTime = performance.now();

    try {
      YachiLogger.info('🔄 Performing AI Worker Replacement', {
        projectId: req.params.projectId,
        workerId: req.params.workerId,
        reason: req.body.reason
      });

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid request data', errors.array());
      }

      const { projectId, workerId } = req.params;
      const { reason, urgency = 'normal' } = req.body;

      // Get project and worker details
      const project = await constructionService.getProjectById(projectId);
      const originalWorker = await this.getWorkerDetails(workerId);

      if (!project || !originalWorker) {
        return this.sendErrorResponse(res, 404, 'RESOURCE_NOT_FOUND', 'Project or worker not found');
      }

      // Check permissions
      await this.authorizeWorkerReplacement(req.user, project);

      // Perform AI replacement matching
      const replacementResult = await this.performWorkerReplacement(
        project, 
        originalWorker, 
        reason, 
        urgency
      );

      // Update project assignments
      await this.updateProjectAssignments(projectId, originalWorker.id, replacementResult.replacementWorker.id);

      // Send notification to new worker
      await this.sendReplacementInvitation(project, replacementResult.replacementWorker, reason);

      const processingTime = performance.now() - startTime;

      YachiLogger.info('✅ AI Worker Replacement Completed', {
        projectId,
        originalWorker: originalWorker.id,
        replacementWorker: replacementResult.replacementWorker.id,
        replacementScore: replacementResult.replacementScore,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      this.trackPerformanceMetrics('worker_replacement', processingTime, true);

      return this.sendSuccessResponse(res, 200, {
        message: 'Worker replacement completed successfully',
        replacement_worker: this.sanitizeWorkerResponse(replacementResult.replacementWorker),
        replacement_metrics: {
          score: replacementResult.replacementScore,
          reason: reason,
          urgency: urgency,
          processing_time: processingTime
        }
      });

    } catch (error) {
      const processingTime = performance.now() - startTime;
      YachiLogger.error('❌ AI Worker Replacement Failed', {
        error: error.message,
        projectId: req.params.projectId,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      this.trackPerformanceMetrics('worker_replacement', processingTime, false);

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'REPLACEMENT_ERROR',
        error.message || 'Failed to perform worker replacement'
      );
    }
  }

  /**
   * 📊 AI Matching Analytics Endpoint
   * Provides insights and analytics for AI matching performance
   */
  async getAIMatchingAnalytics(req, res) {
    try {
      YachiLogger.info('📊 Retrieving AI Matching Analytics', {
        userId: req.user.id
      });

      // Check admin permissions
      await this.authorizeAnalyticsAccess(req.user);

      const { timeframe = '30d', projectType, region } = req.query;

      // Get analytics data
      const analytics = await this.generateAIAnalytics(timeframe, projectType, region);

      return this.sendSuccessResponse(res, 200, {
        message: 'AI matching analytics retrieved successfully',
        analytics: analytics,
        timeframe: timeframe,
        filters: {
          project_type: projectType,
          region: region
        }
      });

    } catch (error) {
      YachiLogger.error('❌ AI Matching Analytics Retrieval Failed', {
        error: error.message,
        userId: req.user.id
      });

      return this.sendErrorResponse(
        res,
        error.statusCode || 500,
        error.code || 'ANALYTICS_ERROR',
        error.message || 'Failed to retrieve AI matching analytics'
      );
    }
  }

  /**
   * 🔧 Advanced AI Worker Matching Algorithm
   */
  async performAdvancedWorkerMatching(project) {
    const matchingStartTime = performance.now();

    try {
      YachiLogger.debug('🎯 Starting advanced AI worker matching', {
        projectId: project.id,
        projectType: project.type,
        requiredWorkers: project.teamRequirements?.totalWorkers
      });

      // Get available workers based on project requirements
      const availableWorkers = await this.getAvailableWorkers(project);

      if (availableWorkers.length === 0) {
        throw new Error('No available workers found for project requirements');
      }

      const algorithmResults = new Map();
      let totalWeightedScore = 0;

      // Execute all matching algorithms
      for (const [algorithmId, algorithm] of this.matchingAlgorithms) {
        const algorithmStartTime = performance.now();
        
        const result = await algorithm.function(availableWorkers, project);
        algorithmResults.set(algorithmId, result);

        const algorithmTime = performance.now() - algorithmStartTime;
        
        YachiLogger.debug(`Algorithm ${algorithmId} completed`, {
          duration: `${algorithmTime.toFixed(2)}ms`,
          workersProcessed: availableWorkers.length,
          matchesFound: result.matches.length
        });
      }

      // Combine results using weighted scoring
      const finalAssignments = await this.combineAlgorithmResults(algorithmResults, project);
      
      const overallScore = this.calculateOverallMatchingScore(finalAssignments);
      const processingTime = performance.now() - matchingStartTime;

      const result = {
        assignments: finalAssignments,
        overallScore: overallScore,
        algorithmBreakdown: this.getAlgorithmBreakdown(algorithmResults),
        matchingMetrics: {
          totalWorkersConsidered: availableWorkers.length,
          totalAssignments: finalAssignments.length,
          processingTime: processingTime,
          averageConfidence: this.calculateAverageConfidence(finalAssignments)
        },
        recommendations: this.generateMatchingRecommendations(finalAssignments, project)
      };

      YachiLogger.debug('✅ Advanced AI worker matching completed', {
        projectId: project.id,
        processingTime: `${processingTime.toFixed(2)}ms`,
        overallScore: overallScore,
        assignments: finalAssignments.length
      });

      return result;

    } catch (error) {
      YachiLogger.error('❌ Advanced AI worker matching failed', {
        error: error.message,
        projectId: project.id
      });
      throw error;
    }
  }

  /**
   * 🎯 Skill-Based Matching Algorithm
   */
  async skillBasedMatching(workers, project) {
    const requiredSkills = project.requiredSkills || [];
    const skillWeights = project.skillWeights || {};
    
    const matches = workers.map(worker => {
      let skillScore = 0;
      let matchedSkills = 0;

      requiredSkills.forEach(skill => {
        if (worker.skills.includes(skill)) {
          const weight = skillWeights[skill] || 1;
          skillScore += weight;
          matchedSkills++;
        }
      });

      const skillMatchRatio = requiredSkills.length > 0 ? matchedSkills / requiredSkills.length : 0;
      const confidence = skillMatchRatio * 100;

      return {
        worker,
        score: skillScore,
        confidence: confidence,
        matchedSkills: matchedSkills,
        requiredSkills: requiredSkills.length,
        algorithm: 'skill-based'
      };
    });

    return {
      matches: matches.sort((a, b) => b.score - a.score),
      algorithm: 'skill-based',
      weight: this.matchingAlgorithms.get('skill-based').weight
    };
  }

  /**
   * 📍 Location-Based Matching Algorithm
   */
  async locationBasedMatching(workers, project) {
    const projectLocation = project.location;
    const maxDistance = project.maxDistance || 50; // kilometers
    
    const matches = workers.map(worker => {
      const distance = this.calculateDistance(projectLocation, worker.location);
      const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
      const confidence = distanceScore;

      return {
        worker,
        score: distanceScore,
        confidence: confidence,
        distance: distance,
        maxDistance: maxDistance,
        algorithm: 'location-based'
      };
    });

    return {
      matches: matches.sort((a, b) => b.score - a.score),
      algorithm: 'location-based',
      weight: this.matchingAlgorithms.get('location-based').weight
    };
  }

  /**
   * ⭐ Rating-Based Matching Algorithm
   */
  async ratingBasedMatching(workers, project) {
    const minRating = project.minRating || 3.0;
    
    const matches = workers.map(worker => {
      const rating = worker.rating || 0;
      const reviewCount = worker.reviewCount || 0;
      
      // Bayesian average to handle low review counts
      const bayesianRating = (rating * reviewCount + minRating * 10) / (reviewCount + 10);
      const ratingScore = Math.min(100, bayesianRating * 20); // Convert 5-star to 100 scale
      const confidence = ratingScore;

      return {
        worker,
        score: ratingScore,
        confidence: confidence,
        rating: rating,
        reviewCount: reviewCount,
        algorithm: 'rating-based'
      };
    });

    return {
      matches: matches.sort((a, b) => b.score - a.score),
      algorithm: 'rating-based',
      weight: this.matchingAlgorithms.get('rating-based').weight
    };
  }

  /**
   * 📅 Availability-Based Matching Algorithm
   */
  async availabilityBasedMatching(workers, project) {
    const projectDuration = project.duration || 30; // days
    const startDate = new Date(project.startDate);
    
    const matches = workers.map(worker => {
      const availability = worker.availability || {};
      const availabilityScore = this.calculateAvailabilityScore(availability, startDate, projectDuration);
      const confidence = availabilityScore;

      return {
        worker,
        score: availabilityScore,
        confidence: confidence,
        availability: availability,
        algorithm: 'availability-based'
      };
    });

    return {
      matches: matches.sort((a, b) => b.score - a.score),
      algorithm: 'availability-based',
      weight: this.matchingAlgorithms.get('availability-based').weight
    };
  }

  /**
   * 💰 Cost-Based Matching Algorithm
   */
  async costBasedMatching(workers, project) {
    const projectBudget = project.budget || 0;
    const budgetPerWorker = projectBudget / (project.teamRequirements?.totalWorkers || 1);
    
    const matches = workers.map(worker => {
      const workerRate = worker.dailyRate || 0;
      const costScore = workerRate > 0 ? Math.max(0, 100 - (workerRate / budgetPerWorker) * 100) : 50;
      const confidence = costScore;

      return {
        worker,
        score: costScore,
        confidence: confidence,
        dailyRate: workerRate,
        budgetPerWorker: budgetPerWorker,
        algorithm: 'cost-based'
      };
    });

    return {
      matches: matches.sort((a, b) => b.score - a.score),
      algorithm: 'cost-based',
      weight: this.matchingAlgorithms.get('cost-based').weight
    };
  }

  /**
   * 🔄 Worker Replacement Algorithm
   */
  async performWorkerReplacement(project, originalWorker, reason, urgency) {
    const replacementStartTime = performance.now();

    try {
      YachiLogger.debug('🔄 Performing worker replacement', {
        projectId: project.id,
        originalWorker: originalWorker.id,
        reason: reason,
        urgency: urgency
      });

      // Get available workers excluding the original worker
      const availableWorkers = await this.getAvailableWorkers(project, [originalWorker.id]);

      if (availableWorkers.length === 0) {
        throw new Error('No suitable replacement workers available');
      }

      // Calculate replacement priorities based on reason and urgency
      const replacementWeights = this.calculateReplacementWeights(reason, urgency);

      // Score potential replacements
      const replacementScores = availableWorkers.map(worker => {
        const scores = {
          skill: this.calculateSkillSimilarity(worker, originalWorker),
          location: this.calculateLocationProximity(worker, originalWorker, project),
          cost: this.calculateCostCompatibility(worker, originalWorker, project),
          availability: this.calculateAvailabilityMatch(worker, project)
        };

        const totalScore = Object.keys(scores).reduce((total, key) => {
          return total + (scores[key] * replacementWeights[key]);
        }, 0);

        return {
          worker,
          score: totalScore,
          breakdown: scores
        };
      });

      // Select best replacement
      const bestReplacement = replacementScores.sort((a, b) => b.score - a.score)[0];

      const processingTime = performance.now() - replacementStartTime;

      YachiLogger.debug('✅ Worker replacement completed', {
        projectId: project.id,
        replacementWorker: bestReplacement.worker.id,
        replacementScore: bestReplacement.score,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return {
        replacementWorker: bestReplacement.worker,
        replacementScore: bestReplacement.score,
        scoreBreakdown: bestReplacement.breakdown,
        processingTime: processingTime
      };

    } catch (error) {
      YachiLogger.error('❌ Worker replacement failed', {
        error: error.message,
        projectId: project.id
      });
      throw error;
    }
  }

  /**
   * 🛡️ Authentication & Authorization Methods
   */
  async authenticateUser(user) {
    if (!user || !user.id) {
      throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'User authentication required' };
    }
  }

  async authorizeProjectCreation(user, projectType) {
    // Check if user can create this type of project
    const allowedTypes = user.roles?.includes('government') 
      ? ['new-building', 'building-finishing', 'government-infrastructure', 'renovation-remodeling']
      : ['new-building', 'building-finishing', 'renovation-remodeling'];

    if (!allowedTypes.includes(projectType)) {
      throw { 
        statusCode: 403, 
        code: 'PROJECT_TYPE_NOT_ALLOWED', 
        message: `User not authorized to create ${projectType} projects` 
      };
    }
  }

  async authorizeProjectAccess(user, project) {
    if (project.clientId !== user.id && !user.roles?.includes('admin')) {
      throw { 
        statusCode: 403, 
        code: 'ACCESS_DENIED', 
        message: 'User not authorized to access this project' 
      };
    }
  }

  async authorizeWorkerReplacement(user, project) {
    if (project.clientId !== user.id && !user.roles?.includes('admin') && !user.roles?.includes('project_manager')) {
      throw { 
        statusCode: 403, 
        code: 'REPLACEMENT_NOT_ALLOWED', 
        message: 'User not authorized to replace workers on this project' 
      };
    }
  }

  async authorizeAnalyticsAccess(user) {
    if (!user.roles?.includes('admin') && !user.roles?.includes('analyst')) {
      throw { 
        statusCode: 403, 
        code: 'ANALYTICS_ACCESS_DENIED', 
        message: 'User not authorized to access AI analytics' 
      };
    }
  }

  /**
   * 📊 Utility Methods
   */
  calculateDistance(location1, location2) {
    // Haversine formula implementation
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(location2.lat - location1.lat);
    const dLon = this.deg2rad(location2.lng - location1.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(location1.lat)) * Math.cos(this.deg2rad(location2.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  calculateAvailabilityScore(availability, startDate, duration) {
    // Simplified availability calculation
    return 85; // Placeholder implementation
  }

  calculateReplacementWeights(reason, urgency) {
    const weights = {
      skill: 0.4,
      location: 0.3,
      cost: 0.2,
      availability: 0.1
    };

    // Adjust weights based on replacement reason and urgency
    switch (reason) {
      case 'emergency':
        weights.availability = 0.4;
        weights.skill = 0.3;
        break;
      case 'skill_mismatch':
        weights.skill = 0.6;
        break;
      case 'cost_overrun':
        weights.cost = 0.5;
        break;
    }

    // Normalize weights to sum to 1
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    Object.keys(weights).forEach(key => {
      weights[key] = weights[key] / total;
    });

    return weights;
  }

  /**
   * 📈 Response Handling Methods
   */
  sendSuccessResponse(res, statusCode, data) {
    return res.status(statusCode).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  sendErrorResponse(res, statusCode, code, message, details = null) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  sanitizeProjectResponse(project) {
    const { internalData, securityTokens, ...sanitized } = project;
    return sanitized;
  }

  sanitizeAssignmentsResponse(assignments) {
    return assignments.map(assignment => ({
      workerId: assignment.worker.id,
      confidence: assignment.confidence,
      role: assignment.role,
      estimatedDuration: assignment.estimatedDuration,
      dailyRate: assignment.dailyRate
    }));
  }

  sanitizeWorkerResponse(worker) {
    const { password, securityTokens, privateData, ...sanitized } = worker;
    return sanitized;
  }

  /**
   * 🎯 Performance Tracking
   */
  trackPerformanceMetrics(operation, duration, success) {
    const metric = {
      operation,
      duration,
      success,
      timestamp: new Date().toISOString()
    };

    this.performanceMetrics.set(`${operation}_${Date.now()}`, metric);

    // Keep only last 1000 metrics
    if (this.performanceMetrics.size > 1000) {
      const firstKey = this.performanceMetrics.keys().next().value;
      this.performanceMetrics.delete(firstKey);
    }
  }

  /**
   * Placeholder methods for external service integrations
   */
  async validateProjectFeasibility(projectData) {
    // Implementation would integrate with construction service
    return { feasible: true, issues: [] };
  }

  async createProjectWithAssignments(projectData, matchingResult) {
    // Implementation would integrate with construction service
    return { id: 'project_' + Date.now(), ...projectData };
  }

  async sendWorkerInvitations(project, assignments) {
    // Implementation would integrate with notification service
    YachiLogger.info(`📨 Sent ${assignments.length} worker invitations`, {
      projectId: project.id
    });
  }

  async updateProjectStatus(projectId, status) {
    // Implementation would integrate with construction service
    YachiLogger.debug(`Updated project ${projectId} status to ${status}`);
  }

  async getAvailableWorkers(project, excludeIds = []) {
    // Implementation would integrate with worker service
    return []; // Return array of worker objects
  }

  async getWorkerDetails(workerId) {
    // Implementation would integrate with worker service
    return { id: workerId, skills: [], location: {}, rating: 4.5 };
  }

  async updateProjectAssignments(projectId, oldWorkerId, newWorkerId) {
    // Implementation would integrate with construction service
    YachiLogger.debug(`Updated project assignments for ${projectId}`);
  }

  async sendReplacementInvitation(project, worker, reason) {
    // Implementation would integrate with notification service
    YachiLogger.info(`📨 Sent replacement invitation to worker ${worker.id}`);
  }

  async generateAIAnalytics(timeframe, projectType, region) {
    // Implementation would generate comprehensive analytics
    return {
      timeframe,
      totalProjects: 150,
      averageMatchingScore: 87.5,
      successRate: 94.2,
      algorithmPerformance: {
        'skill-based': { successRate: 96.1, averageScore: 89.2 },
        'location-based': { successRate: 92.3, averageScore: 85.7 }
      }
    };
  }

  async getCachedMatchingResult(cacheKey) {
    // Implementation would use Redis cache
    return null;
  }

  async cacheMatchingResult(cacheKey, result) {
    // Implementation would use Redis cache
    YachiLogger.debug(`Cached matching results for key: ${cacheKey}`);
  }

  combineAlgorithmResults(algorithmResults, project) {
    // Implementation would combine results from all algorithms
    return [];
  }

  calculateOverallMatchingScore(assignments) {
    return assignments.length > 0 
      ? assignments.reduce((sum, assignment) => sum + assignment.confidence, 0) / assignments.length
      : 0;
  }

  getAlgorithmBreakdown(algorithmResults) {
    const breakdown = {};
    algorithmResults.forEach((result, algorithmId) => {
      breakdown[algorithmId] = {
        weight: result.weight,
        matches: result.matches.length,
        topScore: result.matches[0]?.score || 0
      };
    });
    return breakdown;
  }

  calculateAverageConfidence(assignments) {
    return assignments.length > 0
      ? assignments.reduce((sum, assignment) => sum + assignment.confidence, 0) / assignments.length
      : 0;
  }

  generateMatchingRecommendations(assignments, project) {
    return {
      teamBalance: 'optimal',
      costEfficiency: 'high',
      timelineFeasibility: 'achievable'
    };
  }

  calculateSkillSimilarity(worker1, worker2) {
    // Implementation would calculate skill similarity
    return 0.85;
  }

  calculateLocationProximity(worker, originalWorker, project) {
    // Implementation would calculate location proximity
    return 0.90;
  }

  calculateCostCompatibility(worker, originalWorker, project) {
    // Implementation would calculate cost compatibility
    return 0.75;
  }

  calculateAvailabilityMatch(worker, project) {
    // Implementation would calculate availability match
    return 0.80;
  }
}

// Create singleton instance
const aiAssignmentController = new AIAssignmentController();

// Export controller and individual methods
module.exports = {
  aiAssignmentController,
  
  // Individual endpoint handlers
  createAIConstructionProject: (req, res) => aiAssignmentController.createAIConstructionProject(req, res),
  performAIWorkerMatching: (req, res) => aiAssignmentController.performAIWorkerMatching(req, res),
  replaceWorkerAI: (req, res) => aiAssignmentController.replaceWorkerAI(req, res),
  getAIMatchingAnalytics: (req, res) => aiAssignmentController.getAIMatchingAnalytics(req, res),
  
  // Utility exports for testing
  AIAssignmentController
};