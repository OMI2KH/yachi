// contexts/ai-matching-context.js
/**
 * ENTERPRISE-LEVEL AI MATCHING CONTEXT
 * Advanced AI algorithms for construction worker matching with Ethiopian market optimization
 * Complete integration with all Yachi platform features
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './auth-context';
import { useLocation } from './location-context';
import { useConstruction } from './construction-context';
import { usePayment } from './payment-context';
import { aiMatchingService } from '../services/ai-matching-service';
import { workerService } from '../services/worker-service';
import { projectService } from '../services/project-service';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { notificationService } from '../services/notification-service';
import { 
  AI_MATCHING_TYPES, 
  WORKER_CATEGORIES, 
  ETHIOPIAN_REGIONS,
  CONSTRUCTION_PROJECT_TYPES,
  MATCHING_ALGORITHMS 
} from '../constants/ai-config';

// ==================== ACTION TYPES ====================
export const AI_MATCHING_ACTIONS = {
  // Core Matching Operations
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Worker Matching
  SET_WORKER_MATCHES: 'SET_WORKER_MATCHES',
  UPDATE_WORKER_MATCH: 'UPDATE_WORKER_MATCH',
  REMOVE_WORKER_MATCH: 'REMOVE_WORKER_MATCH',
  
  // Project Matching
  SET_PROJECT_MATCHES: 'SET_PROJECT_MATCHES',
  UPDATE_PROJECT_MATCH: 'UPDATE_PROJECT_MATCH',
  
  // Team Composition
  SET_OPTIMAL_TEAM: 'SET_OPTIMAL_TEAM',
  UPDATE_TEAM_COMPOSITION: 'UPDATE_TEAM_COMPOSITION',
  
  // AI Insights & Analytics
  SET_AI_INSIGHTS: 'SET_AI_INSIGHTS',
  SET_OPTIMIZATION_SCORES: 'SET_OPTIMIZATION_SCORES',
  SET_SIMULATION_RESULTS: 'SET_SIMULATION_RESULTS',
  SET_PERFORMANCE_METRICS: 'SET_PERFORMANCE_METRICS',
  
  // Matching Configuration
  SET_MATCHING_CRITERIA: 'SET_MATCHING_CRITERIA',
  UPDATE_CRITERIA_WEIGHTS: 'UPDATE_CRITERIA_WEIGHTS',
  SET_ALGORITHM_PREFERENCE: 'SET_ALGORITHM_PREFERENCE',
  
  // Ethiopian Market Data
  SET_ETHIOPIAN_MARKET_DATA: 'SET_ETHIOPIAN_MARKET_DATA',
  SET_REGIONAL_FACTORS: 'SET_REGIONAL_FACTORS',
  SET_CULTURAL_CONSIDERATIONS: 'SET_CULTURAL_CONSIDERATIONS',
  
  // Real-time Operations
  ADD_REAL_TIME_UPDATE: 'ADD_REAL_TIME_UPDATE',
  UPDATE_MATCH_SCORES: 'UPDATE_MATCH_SCORES',
  SET_LIVE_MATCHING: 'SET_LIVE_MATCHING',
  
  // Session Management
  RESET_MATCHING_SESSION: 'RESET_MATCHING_SESSION',
  SAVE_MATCHING_SESSION: 'SAVE_MATCHING_SESSION',
  LOAD_MATCHING_SESSION: 'LOAD_MATCHING_SESSION',
};

// ==================== INITIAL STATE ====================
const initialState = {
  // Core Matching State
  workerMatches: [],
  projectMatches: [],
  serviceMatches: [],
  optimalTeam: null,
  
  // AI Insights & Analytics
  aiInsights: {
    optimalTeamComposition: null,
    budgetOptimization: null,
    timelinePrediction: null,
    riskAssessment: null,
    skillGapAnalysis: null,
    marketTrends: null,
    competitorAnalysis: null,
  },
  
  // Optimization & Performance
  optimizationScores: {
    costEfficiency: 0,
    timeOptimization: 0,
    qualityAssurance: 0,
    locationProximity: 0,
    skillMatch: 0,
    culturalCompatibility: 0,
    overallScore: 0,
  },
  
  // Simulation Results
  simulationResults: {
    teamPerformance: null,
    budgetScenarios: [],
    timelineScenarios: [],
    riskScenarios: [],
    contingencyPlans: [],
  },
  
  // Performance Metrics
  performanceMetrics: {
    matchAccuracy: 0,
    responseTime: 0,
    userSatisfaction: 0,
    projectSuccessRate: 0,
    algorithmEffectiveness: 0,
  },
  
  // Matching Configuration
  matchingCriteria: {
    // Skill & Experience (40%)
    skillMatchWeight: 0.25,
    experienceWeight: 0.10,
    certificationWeight: 0.05,
    
    // Location & Logistics (25%)
    proximityWeight: 0.15,
    regionalPreferenceWeight: 0.05,
    travelEfficiencyWeight: 0.05,
    
    // Performance & Quality (20%)
    ratingWeight: 0.10,
    completionRateWeight: 0.05,
    responseTimeWeight: 0.05,
    
    // Cost & Economics (15%)
    costEfficiencyWeight: 0.10,
    budgetAlignmentWeight: 0.05,
  },
  
  algorithmPreferences: {
    primaryAlgorithm: MATCHING_ALGORITHMS.HYBRID_AI,
    fallbackAlgorithm: MATCHING_ALGORITHMS.RULE_BASED,
    enableMachineLearning: true,
    useRealTimeUpdates: true,
  },
  
  // Ethiopian Market Intelligence
  ethiopianMarketData: {
    regionalLaborRates: {},
    materialCosts: {},
    travelTimes: {},
    culturalFactors: {},
    holidayCalendar: [],
    seasonalVariations: {},
    regionalPreferences: {},
  },
  
  // Real-time Operations
  realTimeUpdates: [],
  isLiveMatching: false,
  lastMatchUpdate: null,
  
  // Session Management
  currentSession: null,
  sessionHistory: [],
  
  // Loading & Error States
  loading: {
    matching: false,
    insights: false,
    simulation: false,
    optimization: false,
    teamBuilding: false,
  },
  
  error: null,
  errorCode: null,
};

// ==================== AI MATCHING REDUCER ====================
const aiMatchingReducer = (state, action) => {
  switch (action.type) {
    // Loading & Error States
    case AI_MATCHING_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: { ...state.loading, ...action.payload },
      };

    case AI_MATCHING_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload.message,
        errorCode: action.payload.code,
        loading: {
          matching: false,
          insights: false,
          simulation: false,
          optimization: false,
          teamBuilding: false,
        },
      };

    case AI_MATCHING_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        errorCode: null,
      };

    // Worker Matching
    case AI_MATCHING_ACTIONS.SET_WORKER_MATCHES:
      return {
        ...state,
        workerMatches: action.payload,
        lastMatchUpdate: new Date().toISOString(),
        loading: { ...state.loading, matching: false },
      };

    case AI_MATCHING_ACTIONS.UPDATE_WORKER_MATCH:
      return {
        ...state,
        workerMatches: state.workerMatches.map(worker =>
          worker.id === action.payload.workerId
            ? { ...worker, ...action.payload.updates }
            : worker
        ),
      };

    case AI_MATCHING_ACTIONS.REMOVE_WORKER_MATCH:
      return {
        ...state,
        workerMatches: state.workerMatches.filter(
          worker => worker.id !== action.payload
        ),
      };

    // Project Matching
    case AI_MATCHING_ACTIONS.SET_PROJECT_MATCHES:
      return {
        ...state,
        projectMatches: action.payload,
        loading: { ...state.loading, matching: false },
      };

    case AI_MATCHING_ACTIONS.UPDATE_PROJECT_MATCH:
      return {
        ...state,
        projectMatches: state.projectMatches.map(project =>
          project.id === action.payload.projectId
            ? { ...project, ...action.payload.updates }
            : project
        ),
      };

    // Team Composition
    case AI_MATCHING_ACTIONS.SET_OPTIMAL_TEAM:
      return {
        ...state,
        optimalTeam: action.payload,
        loading: { ...state.loading, teamBuilding: false },
      };

    case AI_MATCHING_ACTIONS.UPDATE_TEAM_COMPOSITION:
      return {
        ...state,
        optimalTeam: {
          ...state.optimalTeam,
          ...action.payload,
        },
      };

    // AI Insights & Analytics
    case AI_MATCHING_ACTIONS.SET_AI_INSIGHTS:
      return {
        ...state,
        aiInsights: { ...state.aiInsights, ...action.payload },
        loading: { ...state.loading, insights: false },
      };

    case AI_MATCHING_ACTIONS.SET_OPTIMIZATION_SCORES:
      return {
        ...state,
        optimizationScores: { ...state.optimizationScores, ...action.payload },
      };

    case AI_MATCHING_ACTIONS.SET_SIMULATION_RESULTS:
      return {
        ...state,
        simulationResults: { ...state.simulationResults, ...action.payload },
        loading: { ...state.loading, simulation: false },
      };

    case AI_MATCHING_ACTIONS.SET_PERFORMANCE_METRICS:
      return {
        ...state,
        performanceMetrics: { ...state.performanceMetrics, ...action.payload },
      };

    // Matching Configuration
    case AI_MATCHING_ACTIONS.SET_MATCHING_CRITERIA:
      return {
        ...state,
        matchingCriteria: { ...state.matchingCriteria, ...action.payload },
      };

    case AI_MATCHING_ACTIONS.UPDATE_CRITERIA_WEIGHTS:
      return {
        ...state,
        matchingCriteria: {
          ...state.matchingCriteria,
          ...action.payload,
        },
      };

    case AI_MATCHING_ACTIONS.SET_ALGORITHM_PREFERENCE:
      return {
        ...state,
        algorithmPreferences: {
          ...state.algorithmPreferences,
          ...action.payload,
        },
      };

    // Ethiopian Market Data
    case AI_MATCHING_ACTIONS.SET_ETHIOPIAN_MARKET_DATA:
      return {
        ...state,
        ethiopianMarketData: { ...state.ethiopianMarketData, ...action.payload },
      };

    case AI_MATCHING_ACTIONS.SET_REGIONAL_FACTORS:
      return {
        ...state,
        ethiopianMarketData: {
          ...state.ethiopianMarketData,
          regionalFactors: action.payload,
        },
      };

    case AI_MATCHING_ACTIONS.SET_CULTURAL_CONSIDERATIONS:
      return {
        ...state,
        ethiopianMarketData: {
          ...state.ethiopianMarketData,
          culturalFactors: action.payload,
        },
      };

    // Real-time Operations
    case AI_MATCHING_ACTIONS.ADD_REAL_TIME_UPDATE:
      return {
        ...state,
        realTimeUpdates: [
          {
            ...action.payload,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
          },
          ...state.realTimeUpdates.slice(0, 49), // Keep last 50 updates
        ],
      };

    case AI_MATCHING_ACTIONS.UPDATE_MATCH_SCORES:
      return {
        ...state,
        workerMatches: state.workerMatches.map(worker => ({
          ...worker,
          matchScore: action.payload[worker.id] || worker.matchScore,
          lastUpdated: new Date().toISOString(),
        })),
      };

    case AI_MATCHING_ACTIONS.SET_LIVE_MATCHING:
      return {
        ...state,
        isLiveMatching: action.payload,
      };

    // Session Management
    case AI_MATCHING_ACTIONS.RESET_MATCHING_SESSION:
      return {
        ...initialState,
        ethiopianMarketData: state.ethiopianMarketData,
        sessionHistory: state.sessionHistory,
      };

    case AI_MATCHING_ACTIONS.SAVE_MATCHING_SESSION:
      return {
        ...state,
        currentSession: action.payload,
        sessionHistory: [
          action.payload,
          ...state.sessionHistory.slice(0, 9), // Keep last 10 sessions
        ],
      };

    case AI_MATCHING_ACTIONS.LOAD_MATCHING_SESSION:
      return {
        ...state,
        ...action.payload,
        currentSession: action.payload.sessionId,
      };

    default:
      return state;
  }
};

// ==================== AI MATCHING CONTEXT ====================
const AIMatchingContext = createContext(null);

/**
 * Enterprise AI Matching Provider
 * Advanced AI algorithms for construction worker matching with Ethiopian optimization
 */
export function AIMatchingProvider({ children }) {
  const [state, dispatch] = useReducer(aiMatchingReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { currentLocation, getDistance } = useLocation();
  const { activeProjects, projectTemplates } = useConstruction();
  const { paymentMethods } = usePayment();
  
  const matchingSession = useRef(null);
  const realTimeInterval = useRef(null);

  // ==================== LIFECYCLE MANAGEMENT ====================
  useEffect(() => {
    initializeAIMatching();
    setupRealTimeUpdates();

    return () => {
      cleanupRealTimeUpdates();
    };
  }, []);

  useEffect(() => {
    if (state.isLiveMatching) {
      startRealTimeMatching();
    } else {
      stopRealTimeMatching();
    }
  }, [state.isLiveMatching]);

  // ==================== INITIALIZATION ====================
  const initializeAIMatching = useCallback(async () => {
    try {
      dispatch({ type: AI_MATCHING_ACTIONS.SET_LOADING, payload: { matching: true } });
      
      await Promise.all([
        loadEthiopianMarketData(),
        loadMatchingPreferences(),
        initializeMatchingSession(),
      ]);

      analyticsService.trackEvent('ai_matching_initialized');
    } catch (error) {
      handleMatchingError(error, 'AIMatchingInitialization');
    } finally {
      dispatch({ type: AI_MATCHING_ACTIONS.SET_LOADING, payload: { matching: false } });
    }
  }, []);

  const initializeMatchingSession = async () => {
    matchingSession.current = {
      id: `session_${Date.now()}`,
      startTime: new Date().toISOString(),
      userId: user?.id,
      location: currentLocation,
      criteria: state.matchingCriteria,
    };
  };

  // ==================== CORE MATCHING OPERATIONS ====================
  /**
   * AI-Powered Worker Matching for Construction Projects
   */
  const findOptimalConstructionTeam = useCallback(async (projectRequirements, optimizationGoals = {}) => {
    try {
      dispatch({ type: AI_MATCHING_ACTIONS.SET_LOADING, payload: { teamBuilding: true } });
      
      const teamComposition = await aiMatchingService.findOptimalConstructionTeam(
        {
          ...projectRequirements,
          location: projectRequirements.location || currentLocation,
          projectType: projectRequirements.type || CONSTRUCTION_PROJECT_TYPES.RESIDENTIAL,
        },
        {
          matchingCriteria: state.matchingCriteria,
          algorithmPreference: state.algorithmPreferences.primaryAlgorithm,
          ethiopianFactors: state.ethiopianMarketData,
          optimizationGoals,
        }
      );

      // Update state with optimal team
      dispatch({
        type: AI_MATCHING_ACTIONS.SET_OPTIMAL_TEAM,
        payload: teamComposition,
      });

      // Generate AI insights
      await generateTeamInsights(teamComposition, projectRequirements);
      
      // Run optimization simulations
      await runTeamOptimizationSimulation(teamComposition, projectRequirements);

      analyticsService.trackEvent('optimal_team_generated', {
        projectType: projectRequirements.type,
        teamSize: teamComposition.workers.length,
        optimizationScore: teamComposition.optimizationScore,
      });

      return teamComposition;
    } catch (error) {
      handleMatchingError(error, 'OptimalTeamMatching', {
        projectType: projectRequirements.type,
      });
      throw error;
    }
  }, [state.matchingCriteria, state.algorithmPreferences, state.ethiopianMarketData, currentLocation]);

  /**
   * Smart Worker Replacement Algorithm
   */
  const findReplacementWorker = useCallback(async (projectId, workerToReplace, replacementReason) => {
    try {
      const project = activeProjects.find(p => p.id === projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const replacement = await aiMatchingService.findReplacementWorker(
        projectId,
        workerToReplace,
        replacementReason,
        {
          projectRequirements: project,
          matchingCriteria: state.matchingCriteria,
          ethiopianFactors: state.ethiopianMarketData,
          urgencyLevel: replacementReason.urgency || 'medium',
        }
      );

      // Add real-time update
      dispatch({
        type: AI_MATCHING_ACTIONS.ADD_REAL_TIME_UPDATE,
        payload: {
          type: 'worker_replacement',
          projectId,
          oldWorker: workerToReplace,
          newWorker: replacement,
          reason: replacementReason,
          algorithmUsed: state.algorithmPreferences.primaryAlgorithm,
        },
      });

      analyticsService.trackEvent('worker_replacement_success', {
        projectId,
        reason: replacementReason.type,
        replacementTime: Date.now(),
      });

      return replacement;
    } catch (error) {
      handleMatchingError(error, 'WorkerReplacement', {
        projectId,
        workerId: workerToReplace.id,
      });
      throw error;
    }
  }, [activeProjects, state.matchingCriteria, state.ethiopianMarketData, state.algorithmPreferences]);

  /**
   * Multi-Role Project Team Formation
   */
  const formMultiRoleProjectTeam = useCallback(async (projectData, roleRequirements) => {
    try {
      dispatch({ type: AI_MATCHING_ACTIONS.SET_LOADING, payload: { teamBuilding: true } });
      
      const projectTeam = await aiMatchingService.formMultiRoleProjectTeam(
        projectData,
        roleRequirements,
        {
          matchingCriteria: state.matchingCriteria,
          ethiopianFactors: state.ethiopianMarketData,
          budgetConstraints: projectData.budget,
          timelineConstraints: projectData.timeline,
        }
      );

      dispatch({
        type: AI_MATCHING_ACTIONS.SET_OPTIMAL_TEAM,
        payload: projectTeam,
      });

      // Generate comprehensive insights
      await generateProjectTeamInsights(projectTeam, projectData);

      analyticsService.trackEvent('multi_role_team_formed', {
        projectId: projectData.id,
        roleCount: Object.keys(roleRequirements).length,
        totalWorkers: projectTeam.workers.length,
      });

      return projectTeam;
    } catch (error) {
      handleMatchingError(error, 'MultiRoleTeamFormation', {
        projectId: projectData.id,
        roleCount: Object.keys(roleRequirements).length,
      });
      throw error;
    }
  }, [state.matchingCriteria, state.ethiopianMarketData]);

  // ==================== AI INSIGHTS & ANALYTICS ====================
  const generateTeamInsights = useCallback(async (teamComposition, projectRequirements) => {
    try {
      dispatch({ type: AI_MATCHING_ACTIONS.SET_LOADING, payload: { insights: true } });
      
      const insights = await aiMatchingService.generateTeamInsights(
        teamComposition,
        projectRequirements,
        {
          ethiopianFactors: state.ethiopianMarketData,
          historicalData: state.sessionHistory,
        }
      );

      dispatch({
        type: AI_MATCHING_ACTIONS.SET_AI_INSIGHTS,
        payload: insights,
      });

      return insights;
    } catch (error) {
      console.warn('Team insights generation failed:', error);
      analyticsService.trackEvent('insights_generation_failed', {
        error: error.message,
      });
    }
  }, [state.ethiopianMarketData, state.sessionHistory]);

  const generateProjectTeamInsights = useCallback(async (projectTeam, projectData) => {
    try {
      const insights = await aiMatchingService.generateProjectTeamInsights(
        projectTeam,
        projectData,
        {
          marketData: state.ethiopianMarketData,
          culturalFactors: state.ethiopianMarketData.culturalFactors,
        }
      );

      dispatch({
        type: AI_MATCHING_ACTIONS.SET_AI_INSIGHTS,
        payload: insights,
      });

      return insights;
    } catch (error) {
      console.warn('Project team insights generation failed:', error);
    }
  }, [state.ethiopianMarketData]);

  const runTeamOptimizationSimulation = useCallback(async (teamComposition, projectRequirements) => {
    try {
      dispatch({ type: AI_MATCHING_ACTIONS.SET_LOADING, payload: { simulation: true } });
      
      const simulation = await aiMatchingService.runTeamOptimizationSimulation(
        teamComposition,
        projectRequirements,
        {
          ethiopianFactors: state.ethiopianMarketData,
          simulationScenarios: ['optimal', 'pessimistic', 'optimistic'],
        }
      );

      dispatch({
        type: AI_MATCHING_ACTIONS.SET_SIMULATION_RESULTS,
        payload: simulation,
      });

      // Update optimization scores
      if (simulation.optimizationScores) {
        dispatch({
          type: AI_MATCHING_ACTIONS.SET_OPTIMIZATION_SCORES,
          payload: simulation.optimizationScores,
        });
      }

      return simulation;
    } catch (error) {
      console.warn('Team optimization simulation failed:', error);
    }
  }, [state.ethiopianMarketData]);

  // ==================== ETHIOPIAN MARKET INTEGRATION ====================
  const loadEthiopianMarketData = async () => {
    try {
      const marketData = await aiMatchingService.getEthiopianMarketData();
      
      dispatch({
        type: AI_MATCHING_ACTIONS.SET_ETHIOPIAN_MARKET_DATA,
        payload: marketData,
      });

      // Load additional regional factors
      const regionalFactors = await aiMatchingService.getRegionalFactors();
      dispatch({
        type: AI_MATCHING_ACTIONS.SET_REGIONAL_FACTORS,
        payload: regionalFactors,
      });

      analyticsService.trackEvent('ethiopian_market_data_loaded');
    } catch (error) {
      console.warn('Ethiopian market data loading failed:', error);
    }
  };

  const loadMatchingPreferences = async () => {
    try {
      // Load user-specific matching preferences
      if (user?.id) {
        const preferences = await aiMatchingService.getUserMatchingPreferences(user.id);
        if (preferences.criteria) {
          dispatch({
            type: AI_MATCHING_ACTIONS.SET_MATCHING_CRITERIA,
            payload: preferences.criteria,
          });
        }
        if (preferences.algorithm) {
          dispatch({
            type: AI_MATCHING_ACTIONS.SET_ALGORITHM_PREFERENCE,
            payload: preferences.algorithm,
          });
        }
      }
    } catch (error) {
      console.warn('Matching preferences loading failed:', error);
    }
  };

  // ==================== REAL-TIME OPERATIONS ====================
  const setupRealTimeUpdates = () => {
    // Setup real-time matching updates
    realTimeInterval.current = setInterval(() => {
      if (state.isLiveMatching && state.workerMatches.length > 0) {
        updateLiveMatchScores();
      }
    }, 30000); // Update every 30 seconds
  };

  const cleanupRealTimeUpdates = () => {
    if (realTimeInterval.current) {
      clearInterval(realTimeInterval.current);
    }
  };

  const startRealTimeMatching = () => {
    dispatch({ type: AI_MATCHING_ACTIONS.SET_LIVE_MATCHING, payload: true });
    analyticsService.trackEvent('live_matching_started');
  };

  const stopRealTimeMatching = () => {
    dispatch({ type: AI_MATCHING_ACTIONS.SET_LIVE_MATCHING, payload: false });
    analyticsService.trackEvent('live_matching_stopped');
  };

  const updateLiveMatchScores = async () => {
    try {
      const scoreUpdates = await aiMatchingService.getLiveMatchUpdates(
        state.workerMatches.map(w => w.id),
        {
          location: currentLocation,
          marketData: state.ethiopianMarketData,
        }
      );

      dispatch({
        type: AI_MATCHING_ACTIONS.UPDATE_MATCH_SCORES,
        payload: scoreUpdates,
      });
    } catch (error) {
      console.warn('Live match score update failed:', error);
    }
  };

  // ==================== UTILITY METHODS ====================
  const handleMatchingError = (error, context, metadata = {}) => {
    console.error(`${context} error:`, error);
    
    const errorMessage = error.response?.data?.message || getMatchingErrorMessage(error);
    const errorCode = error.response?.data?.code || 'AI_MATCHING_ERROR';

    dispatch({
      type: AI_MATCHING_ACTIONS.SET_ERROR,
      payload: { message: errorMessage, code: errorCode },
    });

    analyticsService.trackEvent(`${context.toLowerCase()}_failed`, {
      errorCode,
      ...metadata,
    });

    errorService.captureError(error, {
      context,
      ...metadata,
    });
  };

  const getMatchingErrorMessage = (error) => {
    if (error.message?.includes('network') || error.message?.includes('Network')) {
      return 'Unable to connect to AI matching service. Please check your internet connection.';
    }
    if (error.response?.status === 429) {
      return 'AI matching service is currently busy. Please try again in a moment.';
    }
    if (error.response?.status >= 500) {
      return 'AI matching service is temporarily unavailable. Please try again later.';
    }
    return 'AI matching failed. Please try again with different criteria.';
  };

  const clearError = () => {
    dispatch({ type: AI_MATCHING_ACTIONS.CLEAR_ERROR });
  };

  const resetMatchingSession = () => {
    dispatch({ type: AI_MATCHING_ACTIONS.RESET_MATCHING_SESSION });
    analyticsService.trackEvent('matching_session_reset');
  };

  // ==================== ETHIOPIAN-SPECIFIC UTILITIES ====================
  const getRegionalLaborRate = useCallback((region, skillCategory) => {
    return state.ethiopianMarketData.regionalLaborRates?.[region]?.[skillCategory] || 
           state.ethiopianMarketData.regionalLaborRates?.default?.[skillCategory] || 0;
  }, [state.ethiopianMarketData]);

  const calculateEthiopianTravelTime = useCallback((fromLocation, toLocation) => {
    const baseTime = state.ethiopianMarketData.travelTimes?.[fromLocation]?.[toLocation];
    if (baseTime) return baseTime;

    // Fallback calculation using distance
    const distance = getDistance(fromLocation, toLocation);
    return Math.max(30, Math.ceil(distance / 40 * 60)); // Assume 40km/h average speed
  }, [state.ethiopianMarketData, getDistance]);

  const isEthiopianHoliday = useCallback((date) => {
    const dateStr = new Date(date).toISOString().split('T')[0];
    return state.ethiopianMarketData.holidayCalendar?.includes(dateStr) || false;
  }, [state.ethiopianMarketData]);

  const getCulturalCompatibilityScore = useCallback((worker, project) => {
    let score = 0.5; // Base score
    
    // Language compatibility
    if (worker.languages?.includes(project.preferredLanguage)) {
      score += 0.2;
    }
    
    // Regional preference alignment
    if (worker.preferredRegions?.includes(project.region)) {
      score += 0.15;
    }
    
    // Work culture compatibility
    const culturalFactors = state.ethiopianMarketData.culturalFactors || {};
    if (culturalFactors[project.region] === worker.culturalBackground) {
      score += 0.15;
    }
    
    return Math.min(score, 1.0);
  }, [state.ethiopianMarketData]);

  // ==================== CONTEXT VALUE ====================
  const value = {
    // State
    ...state,
    
    // Core Matching Operations
    findOptimalConstructionTeam,
    findReplacementWorker,
    formMultiRoleProjectTeam,
    
    // Session Management
    resetMatchingSession,
    clearError,
    
    // Real-time Operations
    startRealTimeMatching,
    stopRealTimeMatching,
    
    // Configuration
    updateMatchingWeights: (weights) => 
      dispatch({ type: AI_MATCHING_ACTIONS.UPDATE_CRITERIA_WEIGHTS, payload: weights }),
    
    setAlgorithmPreference: (preferences) =>
      dispatch({ type: AI_MATCHING_ACTIONS.SET_ALGORITHM_PREFERENCE, payload: preferences }),
    
    // Ethiopian Market Utilities
    getRegionalLaborRate,
    calculateEthiopianTravelTime,
    isEthiopianHoliday,
    getCulturalCompatibilityScore,
    
    // Derived State & Analytics
    topWorkerMatches: state.workerMatches
      .filter(worker => worker.matchScore >= 0.8)
      .slice(0, 15),
    
    highQualityMatches: state.workerMatches.filter(worker => 
      worker.matchScore >= 0.85 && worker.rating >= 4.2
    ),
    
    nearbyMatches: state.workerMatches.filter(worker =>
      worker.distance <= 25 // Within 25km
    ),
    
    matchStatistics: {
      totalMatches: state.workerMatches.length,
      highQuality: state.workerMatches.filter(w => w.matchScore >= 0.8).length,
      nearby: state.workerMatches.filter(w => w.distance <= 25).length,
      available: state.workerMatches.filter(w => w.availability === 'available').length,
      verified: state.workerMatches.filter(w => w.isVerified).length,
      premium: state.workerMatches.filter(w => w.isPremium).length,
    },
    
    // Team Composition Analytics
    teamCompositionAnalysis: state.optimalTeam ? {
      totalWorkers: state.optimalTeam.workers.length,
      roleDistribution: state.optimalTeam.workers.reduce((acc, worker) => {
        acc[worker.primaryRole] = (acc[worker.primaryRole] || 0) + 1;
        return acc;
      }, {}),
      averageExperience: state.optimalTeam.workers.reduce((sum, worker) => sum + worker.experienceYears, 0) / state.optimalTeam.workers.length,
      totalCost: state.optimalTeam.workers.reduce((sum, worker) => sum + worker.hourlyRate, 0),
    } : null,
  };

  return (
    <AIMatchingContext.Provider value={value}>
      {children}
    </AIMatchingContext.Provider>
  );
}

/**
 * Custom hook to use AI matching context
 */
export function useAIMatching() {
  const context = useContext(AIMatchingContext);
  if (!context) {
    throw new Error('useAIMatching must be used within an AIMatchingProvider');
  }
  return context;
}

export default AIMatchingContext;