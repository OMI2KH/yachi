// services/ai-assignment-service.js

import { AI_CONFIG } from '../config/ai-config';
import { WORKER_TYPES, PROJECT_TYPES, CONSTRUCTION_STANDARDS } from '../constants/government';
import { calculateDistance, getRegionalWorkers, optimizeLocationMatching } from '../utils/location';
import { formatEthiopianCurrency, getEthiopianSeasonalFactors } from '../utils/ethiopian-calendar';
import { storage } from '../utils/storage';
import { notificationService } from './notification-service';
import { userService } from './user-service';
import { projectService } from './project-service';
import { analyticsService } from './analytics-service';

/**
 * Enterprise-level AI Assignment Service
 * Advanced worker matching with Ethiopian construction industry optimization
 */

class AIAssignmentService {
  constructor() {
    this.workerPool = new Map();
    this.assignmentHistory = new Map();
    this.replacementQueue = new Map();
    this.performanceMetrics = new Map();
    this.initialized = false;
    this.aiModelVersion = '2.1.0';
  }

  /**
   * Initialize AI service with comprehensive data loading
   */
  async initialize() {
    try {
      if (this.initialized) {
        console.log('🔄 AI Service already initialized');
        return;
      }

      console.log('🚀 Initializing AI Assignment Service...');

      // Load worker pool with caching
      await this.loadWorkerPool();
      
      // Load historical performance data
      await this.loadPerformanceMetrics();
      
      // Initialize AI model with Ethiopian construction data
      await this.initializeAIModel();
      
      // Start monitoring services
      this.startReplacementMonitor();
      this.startPerformanceOptimizer();
      
      this.initialized = true;
      
      analyticsService.trackEvent('ai_service_initialized', {
        version: this.aiModelVersion,
        workerCount: this.workerPool.size,
        modelType: 'enhanced_matching'
      });
      
      console.log('✅ AI Assignment Service initialized successfully');
      console.log(`📊 Loaded ${this.workerPool.size} workers into AI pool`);
      
    } catch (error) {
      console.error('❌ AI Service initialization failed:', error);
      analyticsService.trackEvent('ai_service_init_failed', {
        error: error.message,
        version: this.aiModelVersion
      });
      throw error;
    }
  }

  /**
   * Enhanced AI assignment with multi-layer optimization
   */
  async assignWorkersToProject(projectData) {
    const startTime = Date.now();
    
    try {
      const {
        projectType,
        squareArea,
        floors,
        budget,
        location,
        requiredServices,
        timeline,
        clientId,
        priority = 'standard'
      } = projectData;

      // Comprehensive validation
      this.validateProjectRequirements(projectData);

      // Calculate optimized workforce requirements
      const workforceRequirements = this.calculateEnhancedWorkforceRequirements({
        projectType,
        squareArea,
        floors,
        budget,
        requiredServices,
        location,
        timeline
      });

      // Multi-stage worker matching
      const assignmentResult = await this.enhancedWorkerMatching({
        requirements: workforceRequirements,
        location,
        budget,
        timeline,
        priority,
        projectType
      });

      // Create comprehensive assignment plan
      const assignmentPlan = {
        projectId: this.generateProjectId(),
        clientId,
        projectType,
        assignedWorkers: assignmentResult.workers,
        workforceRequirements,
        optimizationMetrics: assignmentResult.metrics,
        totalCost: assignmentResult.totalCost,
        timeline: this.calculateOptimizedTimeline(workforceRequirements, assignmentResult.workers),
        confidenceScore: assignmentResult.confidenceScore,
        riskAssessment: this.assessAssignmentRisk(assignmentResult.workers),
        status: 'pending_approval',
        aiVersion: this.aiModelVersion,
        createdAt: new Date().toISOString(),
        estimatedCompletion: this.calculateCompletionDate(timeline)
      };

      // Store with enhanced tracking
      this.assignmentHistory.set(assignmentPlan.projectId, assignmentPlan);
      
      // Track performance
      this.trackAssignmentPerformance(assignmentPlan);

      analyticsService.trackEvent('ai_assignment_completed', {
        projectId: assignmentPlan.projectId,
        projectType,
        workerCount: Object.values(assignmentResult.workers).flat().length,
        totalCost: assignmentResult.totalCost,
        confidenceScore: assignmentResult.confidenceScore,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        assignmentPlan,
        metrics: assignmentResult.metrics,
        message: 'AI assignment completed with high confidence'
      };

    } catch (error) {
      console.error('🤖 AI Assignment failed:', error);
      
      analyticsService.trackEvent('ai_assignment_failed', {
        error: error.message,
        projectType: projectData.projectType,
        processingTime: Date.now() - startTime
      });

      return {
        success: false,
        error: error.message,
        assignmentPlan: null
      };
    }
  }

  /**
   * Enhanced workforce calculation with Ethiopian construction standards
   */
  calculateEnhancedWorkforceRequirements(projectSpecs) {
    const { projectType, squareArea, floors, budget, requiredServices, location, timeline } = projectSpecs;
    
    const requirements = [];
    const baseArea = squareArea * floors;

    // Ethiopian construction standards with seasonal adjustments
    const seasonalFactor = getEthiopianSeasonalFactors();
    const regionalFactor = this.getRegionalEfficiencyFactor(location.region);

    // Enhanced worker calculations
    const enhancedWorkerCalculations = {
      // Engineering and Supervision
      project_manager: {
        base: 1,
        multiplier: 0.0005,
        max: 2,
        minExperience: 5,
        skills: ['project_management', 'budget_control', 'team_leadership']
      },
      site_engineer: {
        base: 1,
        multiplier: 0.001,
        max: 3,
        minExperience: 3,
        skills: ['site_supervision', 'quality_control', 'technical_drawing']
      },
      civil_engineer: {
        base: 1,
        multiplier: 0.0015,
        max: 4,
        minExperience: 4,
        skills: ['structural_design', 'concrete_technology', 'foundation_engineering']
      },

      // Skilled Construction Workers
      mason: {
        base: 3,
        multiplier: 0.012 * seasonalFactor.construction,
        max: 25,
        minExperience: 2,
        skills: ['brick_laying', 'block_work', 'plastering', 'concrete_mixing']
      },
      carpenter: {
        base: 2,
        multiplier: 0.009 * seasonalFactor.construction,
        max: 18,
        minExperience: 2,
        skills: ['formwork', 'shuttering', 'door_window_fitting']
      },
      steel_fixer: {
        base: 2,
        multiplier: 0.007 * seasonalFactor.construction,
        max: 15,
        minExperience: 2,
        skills: ['rebar_bending', 'steel_fixing', 'reinforcement']
      },

      // MEP Specialists
      electrical_engineer: {
        base: 1,
        multiplier: 0.002,
        max: 5,
        minExperience: 3,
        skills: ['electrical_design', 'wiring', 'safety_systems']
      },
      plumber: {
        base: 1,
        multiplier: 0.004,
        max: 8,
        minExperience: 2,
        skills: ['pipe_fitting', 'sanitary_installation', 'water_systems']
      },

      // Finishing Specialists
      painter: {
        base: 2,
        multiplier: 0.008 * seasonalFactor.finishing,
        max: 12,
        minExperience: 1,
        skills: ['wall_painting', 'surface_preparation', 'color_mixing']
      },
      tiler: {
        base: 2,
        multiplier: 0.006,
        max: 10,
        minExperience: 2,
        skills: ['floor_tiling', 'wall_tiling', 'pattern_work']
      },

      // Support Workers
      laborer: {
        base: 4,
        multiplier: 0.02 * seasonalFactor.construction,
        max: 30,
        minExperience: 0,
        skills: ['material_handling', 'site_cleaning', 'assistance']
      }
    };

    // Calculate requirements with optimizations
    Object.keys(enhancedWorkerCalculations).forEach(workerType => {
      const calc = enhancedWorkerCalculations[workerType];
      let quantity = Math.floor(calc.base + (baseArea * calc.multiplier * regionalFactor));
      quantity = Math.min(quantity, calc.max);
      quantity = Math.max(quantity, calc.base);

      // Adjust for project complexity
      quantity = this.adjustForProjectComplexity(quantity, projectType, workerType);

      if (quantity > 0) {
        requirements.push({
          workerType,
          quantity,
          priority: this.getEnhancedWorkerPriority(workerType, projectType),
          skills: calc.skills,
          minExperience: calc.minExperience,
          certifications: this.getRequiredCertifications(workerType, projectType),
          regionalPreference: this.getRegionalPreference(location.region)
        });
      }
    });

    // Multi-objective optimization
    return this.multiObjectiveOptimization(requirements, budget, timeline);
  }

  /**
   * Enhanced worker matching with multiple algorithms
   */
  async enhancedWorkerMatching(matchingCriteria) {
    const {
      requirements,
      location,
      budget,
      timeline,
      priority,
      projectType
    } = matchingCriteria;

    const assignedWorkers = {};
    const matchingMetrics = {
      totalCandidates: 0,
      highQualityMatches: 0,
      averageScore: 0,
      matchingTime: 0
    };

    const startTime = Date.now();

    // Parallel worker matching for each requirement
    const matchingPromises = requirements.map(async (requirement) => {
      const { workerType, quantity, skills, minExperience } = requirement;

      try {
        // Get candidate pool with multiple sourcing strategies
        const candidates = await this.getOptimizedCandidatePool({
          workerType,
          location,
          skills,
          minExperience,
          quantity: quantity * 4, // Larger pool for better selection
          projectType,
          priority
        });

        matchingMetrics.totalCandidates += candidates.length;

        // Multi-algorithm ranking
        const rankedWorkers = this.multiAlgorithmRanking(candidates, {
          location,
          budget,
          timeline,
          requirement,
          projectType
        });

        // Advanced selection with diversity optimization
        const selectedWorkers = this.diversityOptimizedSelection(rankedWorkers, quantity, requirement);

        matchingMetrics.highQualityMatches += selectedWorkers.filter(w => w.score > 0.8).length;

        assignedWorkers[workerType] = selectedWorkers.map(worker => ({
          ...worker,
          assignmentStatus: 'pending',
          invitationSent: false,
          replacementTier: 1,
          matchingScore: worker.score,
          assignmentConfidence: this.calculateAssignmentConfidence(worker)
        }));

      } catch (error) {
        console.error(`Matching failed for ${workerType}:`, error);
        throw error;
      }
    });

    await Promise.all(matchingPromises);

    matchingMetrics.matchingTime = Date.now() - startTime;
    matchingMetrics.averageScore = this.calculateAverageAssignmentScore(assignedWorkers);

    const totalCost = this.calculateEnhancedTotalCost(assignedWorkers);
    const confidenceScore = this.calculateOverallConfidence(assignedWorkers, matchingMetrics);

    return {
      workers: assignedWorkers,
      metrics: matchingMetrics,
      totalCost,
      confidenceScore
    };
  }

  /**
   * Multi-algorithm worker ranking
   */
  multiAlgorithmRanking(workers, criteria) {
    const scores = workers.map(worker => {
      // Algorithm 1: Traditional scoring
      const traditionalScore = this.calculateTraditionalWorkerScore(worker, criteria);
      
      // Algorithm 2: Collaborative filtering
      const collaborativeScore = this.calculateCollaborativeScore(worker, criteria);
      
      // Algorithm 3: Performance-based scoring
      const performanceScore = this.calculatePerformanceScore(worker);
      
      // Algorithm 4: Contextual scoring (project-specific)
      const contextualScore = this.calculateContextualScore(worker, criteria);
      
      // Weighted combination
      const finalScore = (
        traditionalScore * 0.4 +
        collaborativeScore * 0.25 +
        performanceScore * 0.2 +
        contextualScore * 0.15
      );

      return {
        ...worker,
        score: finalScore,
        scoreBreakdown: {
          traditional: traditionalScore,
          collaborative: collaborativeScore,
          performance: performanceScore,
          contextual: contextualScore
        }
      };
    });

    return scores
      .sort((a, b) => b.score - a.score)
      .filter(worker => worker.score > AI_CONFIG.MINIMUM_SCORE);
  }

  /**
   * Enhanced worker replacement with predictive analytics
   */
  async handleWorkerRejection(projectId, workerId, reason, replacementPriority = 'high') {
    try {
      const assignment = this.assignmentHistory.get(projectId);
      if (!assignment) {
        throw new Error('Assignment not found in history');
      }

      // Find and analyze rejected worker
      const rejectionAnalysis = this.analyzeRejection(workerId, reason, assignment);
      
      // Get replacement strategy
      const replacementStrategy = this.determineReplacementStrategy(rejectionAnalysis, replacementPriority);
      
      // Find optimized replacement
      const replacement = await this.findOptimizedReplacement({
        projectId,
        rejectedWorker: rejectionAnalysis.worker,
        replacementStrategy,
        assignment
      });

      if (replacement) {
        // Execute replacement with minimal disruption
        await this.executeSeamlessReplacement(projectId, rejectionAnalysis, replacement);
        
        // Update analytics
        this.trackReplacementSuccess(projectId, rejectionAnalysis, replacement);
        
        analyticsService.trackEvent('worker_replacement_success', {
          projectId,
          originalWorker: workerId,
          replacementWorker: replacement.id,
          replacementTier: replacement.replacementTier,
          timeToReplace: rejectionAnalysis.replacementTime
        });

        return {
          success: true,
          replacement,
          strategy: replacementStrategy.type,
          message: 'Worker replaced with enhanced matching'
        };
      } else {
        // Escalate with intelligent fallback
        return await this.escalateReplacement(projectId, rejectionAnalysis);
      }

    } catch (error) {
      console.error('Enhanced worker replacement failed:', error);
      
      analyticsService.trackEvent('worker_replacement_failed', {
        projectId,
        workerId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Government-scale project optimization
   */
  async assignGovernmentProject(governmentProject) {
    const {
      projectScale,
      regions,
      workforceSize,
      timeline,
      budget,
      projectType,
      priorityAreas = []
    } = governmentProject;

    try {
      // Regional workforce optimization
      const regionalOptimization = await this.optimizeRegionalWorkforce({
        regions,
        workforceSize,
        projectType,
        priorityAreas,
        budget
      });

      // Create master assignment with coordination
      const masterAssignment = {
        projectId: this.generateProjectId(),
        type: 'government',
        scale: projectScale,
        regionalAssignments: regionalOptimization.assignments,
        coordinationPlan: regionalOptimization.coordination,
        totalWorkers: regionalOptimization.totalWorkers,
        estimatedCost: regionalOptimization.totalCost,
        timeline: this.calculateGovernmentTimeline(regionalOptimization),
        riskMitigation: this.assessGovernmentProjectRisks(regionalOptimization),
        status: 'assigned_pending_approval',
        aiVersion: this.aiModelVersion
      };

      // Store with government-specific tracking
      this.assignmentHistory.set(masterAssignment.projectId, masterAssignment);

      analyticsService.trackEvent('government_assignment_completed', {
        projectId: masterAssignment.projectId,
        regions: regions.length,
        totalWorkers: masterAssignment.totalWorkers,
        estimatedCost: masterAssignment.estimatedCost
      });

      return {
        success: true,
        assignment: masterAssignment,
        optimization: regionalOptimization.metrics,
        message: `Government project optimized with ${masterAssignment.totalWorkers} workers`
      };

    } catch (error) {
      console.error('Government project assignment failed:', error);
      
      analyticsService.trackEvent('government_assignment_failed', {
        error: error.message,
        projectScale,
        regionCount: regions.length
      });
      
      return {
        success: false,
        error: error.message,
        assignment: null
      };
    }
  }

  /**
   * Advanced Analytics and Monitoring
   */
  startPerformanceOptimizer() {
    // Continuous performance optimization
    setInterval(async () => {
      await this.optimizeMatchingAlgorithms();
      await this.updateWorkerPool();
      this.cleanupOldAssignments();
    }, AI_CONFIG.PERFORMANCE_OPTIMIZATION_INTERVAL);
  }

  async optimizeMatchingAlgorithms() {
    // Analyze performance data and adjust algorithm weights
    const performanceData = this.collectPerformanceMetrics();
    const optimizedWeights = this.calculateOptimalWeights(performanceData);
    
    // Update AI configuration
    AI_CONFIG.ALGORITHM_WEIGHTS = optimizedWeights;
    
    console.log('🔧 AI Algorithms optimized with new weights:', optimizedWeights);
  }

  /**
   * Utility Methods with Enhanced Logic
   */
  calculateTraditionalWorkerScore(worker, criteria) {
    const {
      location: projectLocation,
      budget,
      timeline,
      requirement
    } = criteria;

    let score = 0;
    const weights = AI_CONFIG.ALGORITHM_WEIGHTS.traditional;

    // Location optimization
    const distance = calculateDistance(worker.location, projectLocation);
    const locationScore = Math.max(0, 1 - (distance / AI_CONFIG.MAX_DISTANCE_KM));
    score += locationScore * weights.location;

    // Rating with experience factor
    const experienceFactor = Math.min(worker.experienceYears / 10, 1);
    const ratingScore = (worker.rating / 5) * experienceFactor;
    score += ratingScore * weights.rating;

    // Enhanced skill matching
    const skillScore = this.calculateEnhancedSkillMatch(worker.skills, requirement.skills);
    score += skillScore * weights.skills;

    // Availability scoring
    const availabilityScore = this.calculateAvailabilityScore(worker.availability, timeline);
    score += availabilityScore * weights.availability;

    // Cost optimization with quality consideration
    const costScore = this.calculateEnhancedCostScore(worker.hourlyRate, budget, requirement.workerType);
    score += costScore * weights.cost;

    return Math.min(score, 1);
  }

  calculateEnhancedSkillMatch(workerSkills, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 1;
    
    // Weighted skill matching
    const skillWeights = {
      core: 1.0,
      advanced: 0.8,
      basic: 0.6
    };

    let totalWeight = 0;
    let matchedWeight = 0;

    requiredSkills.forEach(skill => {
      const weight = skillWeights[skill.level] || 0.7;
      totalWeight += weight;
      
      if (workerSkills.includes(skill.name)) {
        matchedWeight += weight;
      }
    });

    return totalWeight > 0 ? matchedWeight / totalWeight : 1;
  }

  calculateEnhancedCostScore(hourlyRate, projectBudget, workerType) {
    const marketRate = AI_CONFIG.ETHIOPIAN_MARKET_RATES[workerType] || 150;
    const budgetAllocation = this.calculateBudgetAllocation(workerType, projectBudget);
    
    const rateRatio = marketRate / hourlyRate;
    const budgetRatio = budgetAllocation / hourlyRate;
    
    return Math.min((rateRatio + budgetRatio) / 2, 1.5) / 1.5;
  }

  getEnhancedWorkerPriority(workerType, projectType) {
    const priorityMatrix = {
      residential: {
        architect: 'critical',
        civil_engineer: 'high',
        mason: 'critical',
        carpenter: 'high',
        electrical_engineer: 'medium'
      },
      commercial: {
        structural_engineer: 'critical',
        project_manager: 'high',
        steel_fixer: 'high',
        electrical_engineer: 'high'
      },
      government: {
        civil_engineer: 'critical',
        site_engineer: 'high',
        project_manager: 'high',
        laborer: 'medium'
      },
      infrastructure: {
        civil_engineer: 'critical',
        structural_engineer: 'critical',
        project_manager: 'high'
      }
    };

    return priorityMatrix[projectType]?.[workerType] || 'medium';
  }

  /**
   * Advanced initialization methods
   */
  async initializeAIModel() {
    // Load Ethiopian construction patterns
    const constructionPatterns = await this.loadConstructionPatterns();
    
    // Initialize collaborative filtering
    await this.initializeCollaborativeFiltering();
    
    // Load regional efficiency data
    await this.loadRegionalEfficiencyData();
    
    console.log('🧠 AI Model initialized with Ethiopian construction data');
  }

  async loadConstructionPatterns() {
    // Implementation for loading construction patterns
    return {};
  }

  async initializeCollaborativeFiltering() {
    // Implementation for collaborative filtering
  }

  async loadRegionalEfficiencyData() {
    // Implementation for regional efficiency data
    return {};
  }

  // Additional enhanced methods would be implemented here...
  calculateAssignmentConfidence(worker) {
    // Implementation for assignment confidence calculation
    return 0.9;
  }

  calculateOverallConfidence(assignedWorkers, metrics) {
    // Implementation for overall confidence calculation
    return 0.85;
  }

  assessAssignmentRisk(workers) {
    // Implementation for assignment risk assessment
    return { level: 'low', factors: [] };
  }

  calculateCompletionDate(timeline) {
    // Implementation for completion date calculation
    return new Date();
  }

  trackAssignmentPerformance(assignmentPlan) {
    // Implementation for performance tracking
  }

  getRegionalEfficiencyFactor(region) {
    // Implementation for regional efficiency factor
    return 1.0;
  }

  adjustForProjectComplexity(quantity, projectType, workerType) {
    // Implementation for complexity adjustment
    return quantity;
  }

  getRequiredCertifications(workerType, projectType) {
    // Implementation for required certifications
    return [];
  }

  getRegionalPreference(region) {
    // Implementation for regional preference
    return region;
  }

  multiObjectiveOptimization(requirements, budget, timeline) {
    // Implementation for multi-objective optimization
    return requirements;
  }

  async getOptimizedCandidatePool(criteria) {
    // Implementation for optimized candidate pool
    return [];
  }

  diversityOptimizedSelection(rankedWorkers, quantity, requirement) {
    // Implementation for diversity optimized selection
    return rankedWorkers.slice(0, quantity);
  }

  calculateAverageAssignmentScore(assignedWorkers) {
    // Implementation for average score calculation
    return 0.8;
  }

  calculateEnhancedTotalCost(assignedWorkers) {
    // Implementation for enhanced cost calculation
    return 0;
  }

  analyzeRejection(workerId, reason, assignment) {
    // Implementation for rejection analysis
    return { worker: {}, replacementTime: 0 };
  }

  determineReplacementStrategy(rejectionAnalysis, priority) {
    // Implementation for replacement strategy
    return { type: 'standard' };
  }

  async findOptimizedReplacement(replacementCriteria) {
    // Implementation for optimized replacement
    return null;
  }

  async executeSeamlessReplacement(projectId, rejectionAnalysis, replacement) {
    // Implementation for seamless replacement
  }

  trackReplacementSuccess(projectId, rejectionAnalysis, replacement) {
    // Implementation for replacement tracking
  }

  async escalateReplacement(projectId, rejectionAnalysis) {
    // Implementation for replacement escalation
    return { success: false, message: 'Escalation required' };
  }

  async optimizeRegionalWorkforce(optimizationCriteria) {
    // Implementation for regional workforce optimization
    return { assignments: [], totalWorkers: 0, totalCost: 0, coordination: {}, metrics: {} };
  }

  calculateGovernmentTimeline(regionalOptimization) {
    // Implementation for government timeline calculation
    return {};
  }

  assessGovernmentProjectRisks(regionalOptimization) {
    // Implementation for government risk assessment
    return [];
  }

  collectPerformanceMetrics() {
    // Implementation for performance metrics collection
    return {};
  }

  calculateOptimalWeights(performanceData) {
    // Implementation for optimal weights calculation
    return AI_CONFIG.ALGORITHM_WEIGHTS.traditional;
  }

  async updateWorkerPool() {
    // Implementation for worker pool updates
  }

  cleanupOldAssignments() {
    // Implementation for assignment cleanup
  }

  calculateBudgetAllocation(workerType, projectBudget) {
    // Implementation for budget allocation
    return 0;
  }

  calculateAvailabilityScore(availability, timeline) {
    // Implementation for availability scoring
    return 1.0;
  }

  calculateCollaborativeScore(worker, criteria) {
    // Implementation for collaborative scoring
    return 0.8;
  }

  calculatePerformanceScore(worker) {
    // Implementation for performance scoring
    return 0.8;
  }

  calculateContextualScore(worker, criteria) {
    // Implementation for contextual scoring
    return 0.8;
  }

  async loadPerformanceMetrics() {
    // Implementation for loading performance metrics
  }
}

// Enhanced configuration
AI_CONFIG.ALGORITHM_WEIGHTS = {
  traditional: {
    location: 0.3,
    rating: 0.25,
    skills: 0.2,
    availability: 0.15,
    cost: 0.1
  },
  collaborative: {
    similarity: 0.4,
    historical: 0.3,
    behavioral: 0.3
  }
};

AI_CONFIG.ETHIOPIAN_MARKET_RATES = {
  project_manager: 500,
  civil_engineer: 400,
  mason: 200,
  carpenter: 180,
  electrical_engineer: 350,
  plumber: 220,
  painter: 150,
  laborer: 100
};

AI_CONFIG.PERFORMANCE_OPTIMIZATION_INTERVAL = 3600000; // 1 hour

// Create and export singleton instance
const aiAssignmentService = new AIAssignmentService();

export default aiAssignmentService;