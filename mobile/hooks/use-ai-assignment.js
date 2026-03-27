// hooks/use-ai-assignment.js
/**
 * ENTERPRISE-LEVEL AI ASSIGNMENT HOOK
 * Advanced AI-powered worker assignment and team composition for construction projects
 * Ethiopian market optimization with real-time matching and smart replacement
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from '../contexts/auth-context';
import { useAIMatching } from '../contexts/ai-matching-context';
import { useNotification } from '../contexts/notification-context';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { aiAssignmentService } from '../services/ai-assignment-service';
import { workerService } from '../services/worker-service';
import { projectService } from '../services/project-service';
import {
  AI_ASSIGNMENT_TYPES,
  WORKER_CATEGORIES,
  CONSTRUCTION_PROJECT_TYPES,
  ASSIGNMENT_STRATEGIES,
  ETHIOPIAN_REGIONS,
  MATCHING_ALGORITHMS
} from '../constants/ai-config';

// Assignment state machine
const ASSIGNMENT_STATES = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  MATCHING: 'matching',
  OPTIMIZING: 'optimizing',
  READY: 'ready',
  DEPLOYING: 'deploying',
  COMPLETED: 'completed',
  ERROR: 'error',
};

// Error types
const ASSIGNMENT_ERRORS = {
  INSUFFICIENT_WORKERS: 'INSUFFICIENT_WORKERS',
  BUDGET_CONSTRAINTS: 'BUDGET_CONSTRAINTS',
  LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  SKILL_GAP: 'SKILL_GAP',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
};

/**
 * Enterprise AI Assignment Hook
 * Manages AI-powered worker assignment for construction projects with Ethiopian optimization
 */
export const useAIAssignment = (options = {}) => {
  const {
    projectId,
    autoStart = false,
    enableRealTimeUpdates = true,
    optimizationStrategy = ASSIGNMENT_STRATEGIES.BALANCED,
    maxWorkersPerRole = 5,
    budgetThreshold = 0.8,
  } = options;

  // Context hooks
  const { user, isAuthenticated } = useAuth();
  const { 
    findOptimalConstructionTeam, 
    findReplacementWorker,
    optimizationScores,
    aiInsights,
    updateMatchingWeights 
  } = useAIMatching();
  const { sendAIMatchingNotification } = useNotification();

  // State management
  const [state, setState] = useState({
    // Assignment state
    currentState: ASSIGNMENT_STATES.IDLE,
    assignmentProgress: 0,
    currentOperation: null,
    
    // Team composition
    assignedTeam: null,
    candidateWorkers: [],
    rejectedWorkers: [],
    backupWorkers: [],
    
    // Project requirements
    projectRequirements: null,
    constraints: {},
    optimizationGoals: {},
    
    // Performance metrics
    assignmentMetrics: {
      startTime: null,
      endTime: null,
      totalDuration: 0,
      workersEvaluated: 0,
      matchesFound: 0,
      replacementCount: 0,
      successRate: 0,
    },
    
    // Real-time data
    realTimeUpdates: [],
    lastUpdate: null,
    
    // Error handling
    error: null,
    errorCode: null,
    retryCount: 0,
    
    // Configuration
    assignmentConfig: {
      algorithm: MATCHING_ALGORITHMS.HYBRID_AI,
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      enableFallback: true,
      useEthiopianOptimization: true,
      considerCulturalFactors: true,
      prioritizeLocalWorkers: true,
    },
  });

  // Refs for real-time operations
  const assignmentTimeoutRef = useRef();
  const realTimeIntervalRef = useRef();
  const retryCountRef = useRef(0);
  const operationStartTimeRef = useRef();

  // ==================== LIFECYCLE MANAGEMENT ====================
  useEffect(() => {
    if (autoStart && projectId) {
      initializeAssignment();
    }

    return () => {
      cleanupAssignment();
    };
  }, [autoStart, projectId]);

  useEffect(() => {
    if (enableRealTimeUpdates && state.currentState === ASSIGNMENT_STATES.READY) {
      startRealTimeMonitoring();
    } else {
      stopRealTimeMonitoring();
    }
  }, [enableRealTimeUpdates, state.currentState]);

  // ==================== CORE ASSIGNMENT OPERATIONS ====================
  /**
   * Initialize AI assignment process
   */
  const initializeAssignment = useCallback(async (requirements = {}) => {
    try {
      setState(prev => ({
        ...prev,
        currentState: ASSIGNMENT_STATES.ANALYZING,
        assignmentProgress: 10,
        currentOperation: 'initializing_assignment',
        error: null,
        errorCode: null,
        assignmentMetrics: {
          ...prev.assignmentMetrics,
          startTime: Date.now(),
        },
      }));

      operationStartTimeRef.current = Date.now();

      // Load project requirements
      const projectRequirements = await loadProjectRequirements(requirements);
      
      // Validate requirements
      const validation = validateProjectRequirements(projectRequirements);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Update state with requirements
      setState(prev => ({
        ...prev,
        projectRequirements,
        constraints: requirements.constraints || {},
        optimizationGoals: requirements.optimizationGoals || {},
        assignmentProgress: 25,
      }));

      // Start AI matching process
      await startAIMatching(projectRequirements);

      analyticsService.trackEvent('ai_assignment_initialized', {
        projectId,
        requirements: projectRequirements.type,
        strategy: optimizationStrategy,
      });

    } catch (error) {
      handleAssignmentError(error, 'AssignmentInitialization');
    }
  }, [projectId, optimizationStrategy]);

  /**
   * Start AI matching process for team composition
   */
  const startAIMatching = useCallback(async (projectRequirements) => {
    try {
      setState(prev => ({
        ...prev,
        currentState: ASSIGNMENT_STATES.MATCHING,
        assignmentProgress: 40,
        currentOperation: 'ai_matching',
      }));

      // Configure matching weights based on strategy
      const matchingWeights = getMatchingWeightsForStrategy(optimizationStrategy);
      updateMatchingWeights(matchingWeights);

      // Find optimal construction team using AI
      const optimalTeam = await findOptimalConstructionTeam(
        projectRequirements,
        state.optimizationGoals
      );

      if (!optimalTeam || !optimalTeam.workers || optimalTeam.workers.length === 0) {
        throw new Error(ASSIGNMENT_ERRORS.INSUFFICIENT_WORKERS);
      }

      // Validate team composition
      const teamValidation = validateTeamComposition(optimalTeam, projectRequirements);
      if (!teamValidation.isValid) {
        await handleTeamCompositionIssues(teamValidation.issues, projectRequirements);
      }

      setState(prev => ({
        ...prev,
        assignedTeam: optimalTeam,
        candidateWorkers: optimalTeam.workers,
        assignmentProgress: 70,
        currentState: ASSIGNMENT_STATES.OPTIMIZING,
        currentOperation: 'team_optimization',
        assignmentMetrics: {
          ...prev.assignmentMetrics,
          workersEvaluated: optimalTeam.workers.length,
          matchesFound: optimalTeam.workers.filter(w => w.matchScore >= 0.7).length,
        },
      }));

      // Run optimization simulations
      await optimizeTeamAssignment(optimalTeam, projectRequirements);

      analyticsService.trackEvent('ai_matching_completed', {
        projectId,
        teamSize: optimalTeam.workers.length,
        averageMatchScore: optimalTeam.averageMatchScore,
        optimizationScore: optimalTeam.optimizationScore,
      });

    } catch (error) {
      handleAssignmentError(error, 'AIMatching');
    }
  }, [findOptimalConstructionTeam, optimizationStrategy, updateMatchingWeights]);

  /**
   * Optimize team assignment with constraints
   */
  const optimizeTeamAssignment = useCallback(async (team, requirements) => {
    try {
      setState(prev => ({
        ...prev,
        currentOperation: 'running_optimization',
      }));

      // Apply budget constraints
      const budgetOptimizedTeam = await applyBudgetConstraints(team, requirements);
      
      // Apply location optimization
      const locationOptimizedTeam = await optimizeLocationDistribution(budgetOptimizedTeam, requirements);
      
      // Apply skill balancing
      const skillBalancedTeam = await balanceSkillDistribution(locationOptimizedTeam, requirements);
      
      // Final validation
      const finalValidation = validateFinalTeam(skillBalancedTeam, requirements);
      if (!finalValidation.isValid) {
        throw new Error(`Team validation failed: ${finalValidation.issues.join(', ')}`);
      }

      setState(prev => ({
        ...prev,
        assignedTeam: skillBalancedTeam,
        assignmentProgress: 90,
        currentState: ASSIGNMENT_STATES.READY,
        currentOperation: 'assignment_ready',
        assignmentMetrics: {
          ...prev.assignmentMetrics,
          endTime: Date.now(),
          totalDuration: Date.now() - prev.assignmentMetrics.startTime,
          successRate: calculateSuccessRate(skillBalancedTeam),
        },
      }));

      // Send notification
      await sendAIMatchingNotification({
        projectId,
        projectType: requirements.type,
        teamSize: skillBalancedTeam.workers.length,
        optimizationScore: skillBalancedTeam.optimizationScore,
      });

      analyticsService.trackEvent('team_optimization_completed', {
        projectId,
        optimizationScore: skillBalancedTeam.optimizationScore,
        budgetEfficiency: skillBalancedTeam.budgetEfficiency,
        locationOptimization: skillBalancedTeam.locationScore,
      });

    } catch (error) {
      handleAssignmentError(error, 'TeamOptimization');
    }
  }, [projectId, sendAIMatchingNotification]);

  // ==================== TEAM MANAGEMENT OPERATIONS ====================
  /**
   * Deploy assigned team to project
   */
  const deployAssignedTeam = useCallback(async () => {
    try {
      if (state.currentState !== ASSIGNMENT_STATES.READY) {
        throw new Error('Team not ready for deployment');
      }

      setState(prev => ({
        ...prev,
        currentState: ASSIGNMENT_STATES.DEPLOYING,
        currentOperation: 'deploying_team',
      }));

      // Validate all workers are still available
      const availabilityCheck = await checkWorkerAvailability(state.assignedTeam.workers);
      if (!availabilityCheck.allAvailable) {
        await handleWorkerUnavailability(availabilityCheck.unavailableWorkers);
      }

      // Assign workers to project
      const assignmentResults = await assignWorkersToProject(
        state.assignedTeam.workers,
        projectId
      );

      // Update project with team assignment
      await updateProjectAssignment(assignmentResults);

      setState(prev => ({
        ...prev,
        currentState: ASSIGNMENT_STATES.COMPLETED,
        currentOperation: 'deployment_complete',
        assignmentProgress: 100,
        assignedTeam: {
          ...prev.assignedTeam,
          deploymentStatus: 'deployed',
          deploymentTime: new Date().toISOString(),
          assignmentResults,
        },
      }));

      analyticsService.trackEvent('team_deployment_success', {
        projectId,
        teamSize: state.assignedTeam.workers.length,
        deploymentTime: Date.now() - state.assignmentMetrics.startTime,
      });

      return assignmentResults;

    } catch (error) {
      handleAssignmentError(error, 'TeamDeployment');
      throw error;
    }
  }, [state.assignedTeam, state.currentState, projectId]);

  /**
   * Find replacement for unavailable worker
   */
  const findWorkerReplacement = useCallback(async (workerToReplace, reason) => {
    try {
      setState(prev => ({
        ...prev,
        currentOperation: 'finding_replacement',
      }));

      const replacement = await findReplacementWorker(
        projectId,
        workerToReplace,
        reason
      );

      if (!replacement) {
        throw new Error('No suitable replacement found');
      }

      // Update team with replacement
      const updatedTeam = {
        ...state.assignedTeam,
        workers: state.assignedTeam.workers.map(worker =>
          worker.id === workerToReplace.id ? replacement : worker
        ),
      };

      setState(prev => ({
        ...prev,
        assignedTeam: updatedTeam,
        assignmentMetrics: {
          ...prev.assignmentMetrics,
          replacementCount: prev.assignmentMetrics.replacementCount + 1,
        },
      }));

      analyticsService.trackEvent('worker_replacement_success', {
        projectId,
        originalWorker: workerToReplace.id,
        replacementWorker: replacement.id,
        reason: reason.type,
      });

      return replacement;

    } catch (error) {
      handleAssignmentError(error, 'WorkerReplacement', {
        workerId: workerToReplace.id,
        reason: reason.type,
      });
      throw error;
    }
  }, [state.assignedTeam, projectId, findReplacementWorker]);

  /**
   * Optimize team based on new constraints
   */
  const optimizeTeamWithNewConstraints = useCallback(async (newConstraints) => {
    try {
      setState(prev => ({
        ...prev,
        currentState: ASSIGNMENT_STATES.OPTIMIZING,
        currentOperation: 'reoptimizing_team',
        constraints: { ...prev.constraints, ...newConstraints },
      }));

      const optimizedTeam = await aiAssignmentService.optimizeWithConstraints(
        state.assignedTeam,
        newConstraints,
        state.projectRequirements
      );

      setState(prev => ({
        ...prev,
        assignedTeam: optimizedTeam,
        currentState: ASSIGNMENT_STATES.READY,
        currentOperation: 'reoptimization_complete',
      }));

      analyticsService.trackEvent('team_reoptimized', {
        projectId,
        constraints: Object.keys(newConstraints),
        optimizationImprovement: optimizedTeam.optimizationScore - state.assignedTeam.optimizationScore,
      });

      return optimizedTeam;

    } catch (error) {
      handleAssignmentError(error, 'TeamReoptimization');
      throw error;
    }
  }, [state.assignedTeam, state.projectRequirements, projectId]);

  // ==================== REAL-TIME OPERATIONS ====================
  const startRealTimeMonitoring = useCallback(() => {
    realTimeIntervalRef.current = setInterval(async () => {
      if (state.assignedTeam) {
        await monitorTeamAvailability();
        await updateTeamPerformanceMetrics();
      }
    }, 30000); // Check every 30 seconds

    analyticsService.trackEvent('real_time_monitoring_started', { projectId });
  }, [state.assignedTeam, projectId]);

  const stopRealTimeMonitoring = useCallback(() => {
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
      realTimeIntervalRef.current = null;
    }

    analyticsService.trackEvent('real_time_monitoring_stopped', { projectId });
  }, [projectId]);

  const monitorTeamAvailability = useCallback(async () => {
    try {
      const availabilityUpdates = await aiAssignmentService.getRealTimeAvailability(
        state.assignedTeam.workers.map(w => w.id)
      );

      const updates = [];
      for (const update of availabilityUpdates) {
        if (update.status === 'unavailable') {
          updates.push({
            type: 'availability_change',
            workerId: update.workerId,
            previousStatus: 'available',
            newStatus: 'unavailable',
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (updates.length > 0) {
        setState(prev => ({
          ...prev,
          realTimeUpdates: [...updates, ...prev.realTimeUpdates.slice(0, 49)],
          lastUpdate: new Date().toISOString(),
        }));

        // Trigger automatic replacement for critical roles
        await handleAutomaticReplacements(updates);
      }

    } catch (error) {
      console.warn('Real-time monitoring failed:', error);
    }
  }, [state.assignedTeam]);

  const updateTeamPerformanceMetrics = useCallback(async () => {
    try {
      const performanceData = await aiAssignmentService.getTeamPerformanceMetrics(
        projectId,
        state.assignedTeam.workers.map(w => w.id)
      );

      setState(prev => ({
        ...prev,
        assignedTeam: {
          ...prev.assignedTeam,
          performanceMetrics: performanceData,
        },
      }));

    } catch (error) {
      console.warn('Performance metrics update failed:', error);
    }
  }, [projectId, state.assignedTeam]);

  // ==================== ETHIOPIAN MARKET OPTIMIZATION ====================
  const applyEthiopianOptimization = useCallback(async (team, requirements) => {
    try {
      const optimizedTeam = await aiAssignmentService.applyEthiopianOptimization(
        team,
        requirements,
        {
          considerCulturalFactors: state.assignmentConfig.considerCulturalFactors,
          prioritizeLocalWorkers: state.assignmentConfig.prioritizeLocalWorkers,
          regionalPreferences: requirements.region ? getRegionalPreferences(requirements.region) : {},
        }
      );

      return optimizedTeam;

    } catch (error) {
      console.warn('Ethiopian optimization failed:', error);
      return team; // Return original team if optimization fails
    }
  }, [state.assignmentConfig]);

  const getRegionalPreferences = useCallback((region) => {
    const regionalConfig = {
      [ETHIOPIAN_REGIONS.ADDIS_ABABA]: {
        preferredLanguages: ['am', 'en'],
        workHours: '08:00-17:00',
        costFactor: 1.2,
      },
      [ETHIOPIAN_REGIONS.OROMIA]: {
        preferredLanguages: ['om', 'am'],
        workHours: '07:00-16:00',
        costFactor: 1.0,
      },
      [ETHIOPIAN_REGIONS.AMHARA]: {
        preferredLanguages: ['am'],
        workHours: '08:00-17:00',
        costFactor: 1.0,
      },
      [ETHIOPIAN_REGIONS.TIGRAY]: {
        preferredLanguages: ['ti', 'am'],
        workHours: '08:00-17:00',
        costFactor: 1.1,
      },
    };

    return regionalConfig[region] || regionalConfig[ETHIOPIAN_REGIONS.ADDIS_ABABA];
  }, []);

  // ==================== UTILITY FUNCTIONS ====================
  const loadProjectRequirements = async (requirements) => {
    try {
      // If projectId is provided, load from server
      if (projectId) {
        const projectData = await projectService.getProjectDetails(projectId);
        return {
          ...projectData,
          ...requirements,
        };
      }

      // Use provided requirements
      return requirements;

    } catch (error) {
      throw new Error(`Failed to load project requirements: ${error.message}`);
    }
  };

  const validateProjectRequirements = (requirements) => {
    const errors = [];

    if (!requirements.type) {
      errors.push('Project type is required');
    }

    if (!requirements.budget) {
      errors.push('Project budget is required');
    }

    if (!requirements.location) {
      errors.push('Project location is required');
    }

    if (!requirements.timeline) {
      errors.push('Project timeline is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const validateTeamComposition = (team, requirements) => {
    const issues = [];

    // Check if all required roles are filled
    const requiredRoles = getRequiredRolesForProject(requirements.type);
    const assignedRoles = team.workers.map(w => w.primaryRole);
    
    const missingRoles = requiredRoles.filter(role => !assignedRoles.includes(role));
    if (missingRoles.length > 0) {
      issues.push(`Missing required roles: ${missingRoles.join(', ')}`);
    }

    // Check budget constraints
    const totalCost = team.workers.reduce((sum, worker) => sum + worker.hourlyRate, 0);
    const budgetLimit = requirements.budget * budgetThreshold;
    
    if (totalCost > budgetLimit) {
      issues.push(`Team cost (${totalCost}) exceeds budget limit (${budgetLimit})`);
    }

    // Check skill coverage
    const skillGaps = analyzeSkillGaps(team, requirements);
    if (skillGaps.length > 0) {
      issues.push(`Skill gaps detected: ${skillGaps.join(', ')}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  };

  const getRequiredRolesForProject = (projectType) => {
    const roleRequirements = {
      [CONSTRUCTION_PROJECT_TYPES.RESIDENTIAL]: [
        WORKER_CATEGORIES.MASON,
        WORKER_CATEGORIES.CARPENTER,
        WORKER_CATEGORIES.ELECTRICIAN,
        WORKER_CATEGORIES.PLUMBER,
        WORKER_CATEGORIES.LABORER,
      ],
      [CONSTRUCTION_PROJECT_TYPES.COMMERCIAL]: [
        WORKER_CATEGORIES.ENGINEER,
        WORKER_CATEGORIES.ARCHITECT,
        WORKER_CATEGORIES.MASON,
        WORKER_CATEGORIES.STEEL_FIXER,
        WORKER_CATEGORIES.ELECTRICIAN,
        WORKER_CATEGORIES.PLUMBER,
      ],
      [CONSTRUCTION_PROJECT_TYPES.INDUSTRIAL]: [
        WORKER_CATEGORIES.ENGINEER,
        WORKER_CATEGORIES.PROJECT_MANAGER,
        WORKER_CATEGORIES.STEEL_FIXER,
        WORKER_CATEGORIES.ELECTRICIAN,
        WORKER_CATEGORIES.PLUMBER,
        WORKER_CATEGORIES.FOREMAN,
      ],
      [CONSTRUCTION_PROJECT_TYPES.GOVERNMENT]: [
        WORKER_CATEGORIES.ENGINEER,
        WORKER_CATEGORIES.ARCHITECT,
        WORKER_CATEGORIES.PROJECT_MANAGER,
        WORKER_CATEGORIES.FOREMAN,
        WORKER_CATEGORIES.STEEL_FIXER,
        WORKER_CATEGORIES.MASON,
      ],
    };

    return roleRequirements[projectType] || roleRequirements[CONSTRUCTION_PROJECT_TYPES.RESIDENTIAL];
  };

  const getMatchingWeightsForStrategy = (strategy) => {
    const weightConfigs = {
      [ASSIGNMENT_STRATEGIES.COST_OPTIMIZED]: {
        skillMatchWeight: 0.20,
        experienceWeight: 0.10,
        proximityWeight: 0.15,
        costEfficiencyWeight: 0.35,
        ratingWeight: 0.10,
        certificationWeight: 0.05,
        completionRateWeight: 0.05,
      },
      [ASSIGNMENT_STRATEGIES.QUALITY_OPTIMIZED]: {
        skillMatchWeight: 0.30,
        experienceWeight: 0.15,
        proximityWeight: 0.10,
        costEfficiencyWeight: 0.10,
        ratingWeight: 0.20,
        certificationWeight: 0.10,
        completionRateWeight: 0.05,
      },
      [ASSIGNMENT_STRATEGIES.BALANCED]: {
        skillMatchWeight: 0.25,
        experienceWeight: 0.15,
        proximityWeight: 0.15,
        costEfficiencyWeight: 0.20,
        ratingWeight: 0.15,
        certificationWeight: 0.05,
        completionRateWeight: 0.05,
      },
      [ASSIGNMENT_STRATEGIES.FAST_DEPLOYMENT]: {
        skillMatchWeight: 0.20,
        experienceWeight: 0.10,
        proximityWeight: 0.25,
        costEfficiencyWeight: 0.15,
        ratingWeight: 0.15,
        certificationWeight: 0.05,
        completionRateWeight: 0.10,
      },
    };

    return weightConfigs[strategy] || weightConfigs[ASSIGNMENT_STRATEGIES.BALANCED];
  };

  const calculateSuccessRate = (team) => {
    if (!team.workers.length) return 0;

    const averageMatchScore = team.workers.reduce((sum, worker) => sum + worker.matchScore, 0) / team.workers.length;
    const availabilityScore = team.workers.filter(w => w.availability === 'available').length / team.workers.length;
    const ratingScore = team.workers.reduce((sum, worker) => sum + worker.rating, 0) / team.workers.length / 5;

    return (averageMatchScore * 0.5 + availabilityScore * 0.3 + ratingScore * 0.2) * 100;
  };

  // ==================== ERROR HANDLING ====================
  const handleAssignmentError = useCallback((error, context, metadata = {}) => {
    console.error(`${context} error:`, error);
    
    const errorCode = getAssignmentErrorCode(error);
    const errorMessage = getAssignmentErrorMessage(error, errorCode);

    setState(prev => ({
      ...prev,
      currentState: ASSIGNMENT_STATES.ERROR,
      error: errorMessage,
      errorCode,
      assignmentMetrics: {
        ...prev.assignmentMetrics,
        endTime: Date.now(),
        totalDuration: Date.now() - prev.assignmentMetrics.startTime,
      },
    }));

    analyticsService.trackEvent('ai_assignment_error', {
      context,
      errorCode,
      projectId,
      retryCount: retryCountRef.current,
      ...metadata,
    });

    errorService.captureError(error, {
      context: `AIAssignment-${context}`,
      projectId,
      errorCode,
      ...metadata,
    });

    // Auto-retry for certain error types
    if (shouldRetryAssignment(errorCode) && retryCountRef.current < state.assignmentConfig.maxRetries) {
      setTimeout(() => {
        retryCountRef.current += 1;
        initializeAssignment();
      }, 2000 * retryCountRef.current); // Exponential backoff
    }
  }, [projectId, initializeAssignment, state.assignmentConfig.maxRetries]);

  const getAssignmentErrorCode = (error) => {
    if (error.message.includes('network') || error.message.includes('Network')) {
      return ASSIGNMENT_ERRORS.NETWORK_ERROR;
    }
    if (error.message.includes('budget') || error.message.includes('cost')) {
      return ASSIGNMENT_ERRORS.BUDGET_CONSTRAINTS;
    }
    if (error.message.includes('location') || error.message.includes('proximity')) {
      return ASSIGNMENT_ERRORS.LOCATION_UNAVAILABLE;
    }
    if (error.message.includes('skill') || error.message.includes('role')) {
      return ASSIGNMENT_ERRORS.SKILL_GAP;
    }
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return ASSIGNMENT_ERRORS.TIMEOUT;
    }
    return ASSIGNMENT_ERRORS.INSUFFICIENT_WORKERS;
  };

  const getAssignmentErrorMessage = (error, errorCode) => {
    const errorMessages = {
      [ASSIGNMENT_ERRORS.INSUFFICIENT_WORKERS]: 'Not enough qualified workers available for this project. Please adjust requirements or try again later.',
      [ASSIGNMENT_ERRORS.BUDGET_CONSTRAINTS]: 'Unable to find workers within the specified budget. Consider increasing budget or adjusting skill requirements.',
      [ASSIGNMENT_ERRORS.LOCATION_UNAVAILABLE]: 'Limited worker availability in the specified location. Consider expanding search radius.',
      [ASSIGNMENT_ERRORS.SKILL_GAP]: 'Required skills not available in current worker pool. Please adjust skill requirements.',
      [ASSIGNMENT_ERRORS.NETWORK_ERROR]: 'Network connection issue. Please check your internet connection and try again.',
      [ASSIGNMENT_ERRORS.TIMEOUT]: 'Assignment process timed out. Please try again.',
    };

    return errorMessages[errorCode] || 'An unexpected error occurred during team assignment. Please try again.';
  };

  const shouldRetryAssignment = (errorCode) => {
    const retryableErrors = [
      ASSIGNMENT_ERRORS.NETWORK_ERROR,
      ASSIGNMENT_ERRORS.TIMEOUT,
    ];
    return retryableErrors.includes(errorCode);
  };

  // ==================== CLEANUP ====================
  const cleanupAssignment = useCallback(() => {
    if (assignmentTimeoutRef.current) {
      clearTimeout(assignmentTimeoutRef.current);
    }
    stopRealTimeMonitoring();
    retryCountRef.current = 0;
  }, [stopRealTimeMonitoring]);

  const resetAssignment = useCallback(() => {
    cleanupAssignment();
    setState({
      ...initialState,
      assignmentConfig: state.assignmentConfig,
    });
    retryCountRef.current = 0;
  }, [state.assignmentConfig, cleanupAssignment]);

  // ==================== HOOK RETURN VALUE ====================
  return {
    // State
    ...state,
    
    // Core Operations
    initializeAssignment,
    deployAssignedTeam,
    findWorkerReplacement,
    optimizeTeamWithNewConstraints,
    
    // Utility Functions
    resetAssignment,
    cleanupAssignment,
    
    // Derived State
    isReady: state.currentState === ASSIGNMENT_STATES.READY,
    isProcessing: [
      ASSIGNMENT_STATES.ANALYZING,
      ASSIGNMENT_STATES.MATCHING,
      ASSIGNMENT_STATES.OPTIMIZING,
      ASSIGNMENT_STATES.DEPLOYING,
    ].includes(state.currentState),
    hasError: state.currentState === ASSIGNMENT_STATES.ERROR,
    isCompleted: state.currentState === ASSIGNMENT_STATES.COMPLETED,
    
    // Team Analysis
    teamAnalysis: state.assignedTeam ? {
      totalWorkers: state.assignedTeam.workers.length,
      roleDistribution: state.assignedTeam.workers.reduce((acc, worker) => {
        acc[worker.primaryRole] = (acc[worker.primaryRole] || 0) + 1;
        return acc;
      }, {}),
      averageMatchScore: state.assignedTeam.workers.reduce((sum, worker) => sum + worker.matchScore, 0) / state.assignedTeam.workers.length,
      totalCost: state.assignedTeam.workers.reduce((sum, worker) => sum + worker.hourlyRate, 0),
      skillCoverage: analyzeSkillCoverage(state.assignedTeam, state.projectRequirements),
    } : null,
  };
};

// Helper functions (would be in separate utility file)
const analyzeSkillGaps = (team, requirements) => {
  // Implementation for skill gap analysis
  return [];
};

const analyzeSkillCoverage = (team, requirements) => {
  // Implementation for skill coverage analysis
  return { coverage: 1.0, missingSkills: [] };
};

const applyBudgetConstraints = async (team, requirements) => {
  // Implementation for budget optimization
  return team;
};

const optimizeLocationDistribution = async (team, requirements) => {
  // Implementation for location optimization
  return team;
};

const balanceSkillDistribution = async (team, requirements) => {
  // Implementation for skill balancing
  return team;
};

const validateFinalTeam = (team, requirements) => {
  // Implementation for final team validation
  return { isValid: true, issues: [] };
};

const checkWorkerAvailability = async (workers) => {
  // Implementation for availability check
  return { allAvailable: true, unavailableWorkers: [] };
};

const handleWorkerUnavailability = async (unavailableWorkers) => {
  // Implementation for handling unavailable workers
};

const assignWorkersToProject = async (workers, projectId) => {
  // Implementation for worker assignment
  return { success: true, assignments: [] };
};

const updateProjectAssignment = async (assignmentResults) => {
  // Implementation for project update
};

const handleTeamCompositionIssues = async (issues, requirements) => {
  // Implementation for handling team composition issues
};

const handleAutomaticReplacements = async (updates) => {
  // Implementation for automatic replacements
};

export default useAIAssignment;