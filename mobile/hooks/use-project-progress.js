// hooks/use-project-progress.js

/**
 * ENTERPRISE-GRADE PROJECT PROGRESS MANAGEMENT HOOK
 * Yachi Mobile App - Advanced Construction Project Tracking with AI Integration
 * 
 * Enterprise Features:
 * - AI-powered progress prediction and risk assessment
 * - Real-time construction project monitoring
 * - Ethiopian construction industry compliance
 * - Multi-phase project lifecycle management
 * - Automated milestone tracking and reporting
 * - Resource allocation optimization
 * - Budget and timeline forecasting
 * - Safety compliance monitoring
 * - Government project reporting
 * - Offline progress tracking with sync
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useAuth } from './use-auth';
import { useLocation } from './use-location';

// =============================================================================
// ENTERPRISE CONSTANTS & CONFIGURATION
// =============================================================================

export const PROJECT_TYPES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  INFRASTRUCTURE: 'infrastructure',
  GOVERNMENT: 'government',
  RENOVATION: 'renovation',
  NEW_CONSTRUCTION: 'new_construction',
};

export const PROJECT_STATUS = {
  PLANNING: 'planning',
  SITE_PREPARATION: 'site_preparation',
  FOUNDATION: 'foundation',
  STRUCTURE: 'structure',
  ENCLOSURE: 'enclosure',
  MEP: 'mep',
  FINISHING: 'finishing',
  INSPECTION: 'inspection',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  DELAYED: 'delayed',
  CANCELLED: 'cancelled',
};

export const PROGRESS_METRICS = {
  PERCENTAGE: 'percentage',
  PHYSICAL: 'physical',
  FINANCIAL: 'financial',
  TIMELINE: 'timeline',
  QUALITY: 'quality',
  SAFETY: 'safety',
};

export const CONSTRUCTION_PHASES = {
  SITE_SURVEY: {
    name: 'Site Survey',
    duration: 7,
    dependencies: [],
    critical: true,
  },
  EXCAVATION: {
    name: 'Excavation',
    duration: 14,
    dependencies: ['SITE_SURVEY'],
    critical: true,
  },
  FOUNDATION: {
    name: 'Foundation',
    duration: 21,
    dependencies: ['EXCAVATION'],
    critical: true,
  },
  STRUCTURAL_FRAME: {
    name: 'Structural Frame',
    duration: 30,
    dependencies: ['FOUNDATION'],
    critical: true,
  },
  ENCLOSURE: {
    name: 'Building Enclosure',
    duration: 28,
    dependencies: ['STRUCTURAL_FRAME'],
    critical: false,
  },
  MEP_INSTALLATION: {
    name: 'MEP Installation',
    duration: 35,
    dependencies: ['ENCLOSURE'],
    critical: false,
  },
  INTERIOR_FINISHING: {
    name: 'Interior Finishing',
    duration: 42,
    dependencies: ['MEP_INSTALLATION'],
    critical: false,
  },
  EXTERIOR_FINISHING: {
    name: 'Exterior Finishing',
    duration: 21,
    dependencies: ['ENCLOSURE'],
    critical: false,
  },
  LANDSCAPING: {
    name: 'Landscaping',
    duration: 14,
    dependencies: ['EXTERIOR_FINISHING'],
    critical: false,
  },
  FINAL_INSPECTION: {
    name: 'Final Inspection',
    duration: 7,
    dependencies: ['INTERIOR_FINISHING', 'EXTERIOR_FINISHING', 'LANDSCAPING'],
    critical: true,
  },
};

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const STORAGE_KEYS = {
  PROJECTS_CACHE: '@yachi_projects_cache',
  PROJECT_PROGRESS: '@yachi_project_progress',
  MILESTONES: '@yachi_milestones',
  CONSTRUCTION_PHOTOS: '@yachi_construction_photos',
  SAFETY_REPORTS: '@yachi_safety_reports',
  BUDGET_TRACKING: '@yachi_budget_tracking',
};

// =============================================================================
// ENTERPRISE INITIAL STATE
// =============================================================================

const initialState = {
  // Projects Data
  projects: [],
  activeProjects: [],
  completedProjects: [],
  delayedProjects: [],
  
  // Current Project Context
  currentProject: null,
  projectDetails: null,
  projectTeam: [],
  
  // Progress Tracking
  progress: {
    overall: 0,
    physical: 0,
    financial: 0,
    timeline: 0,
    quality: 0,
    safety: 0,
  },
  milestones: [],
  currentPhase: null,
  nextPhase: null,
  
  // Construction Phases
  phases: [],
  phaseProgress: new Map(),
  phaseDependencies: new Map(),
  
  // AI Predictions & Analytics
  predictions: {
    completionDate: null,
    budgetVariance: 0,
    riskLevel: RISK_LEVELS.LOW,
    criticalPath: [],
    recommendations: [],
  },
  
  // Resource Management
  resources: {
    workers: [],
    materials: [],
    equipment: [],
    budget: {
      allocated: 0,
      spent: 0,
      remaining: 0,
      variance: 0,
    },
  },
  
  // Safety & Compliance
  safetyMetrics: {
    incidents: 0,
    inspections: 0,
    compliance: 100,
    lastInspection: null,
  },
  
  // Ethiopian Market Specific
  localRegulations: null,
  weatherImpact: null,
  seasonalFactors: [],
  
  // Media & Documentation
  constructionPhotos: [],
  dailyReports: [],
  inspectionReports: [],
  
  // Status & Operations
  isLoading: false,
  isUpdating: false,
  isSyncing: false,
  isPredicting: false,
  
  // Filters & Search
  filters: {
    status: null,
    type: null,
    location: null,
    timeline: null,
  },
  
  // Error Management
  error: null,
  progressError: null,
  predictionError: null,
  syncError: null,
};

// =============================================================================
// ENTERPRISE PROJECT PROGRESS HOOK
// =============================================================================

export const useProjectProgress = () => {
  const { user, isAuthenticated, hasPermission } = useAuth();
  const { currentLocation } = useLocation();
  
  const [state, setState] = useState(initialState);
  
  const progressIntervalRef = useRef(null);
  const predictionTimeoutRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const photoUploadQueueRef = useRef([]);

  // ===========================================================================
  // ENTERPRISE INITIALIZATION
  // ===========================================================================

  const initializeEnterpriseProgress = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        throw new Error('ENTERPRISE_AUTHENTICATION_REQUIRED');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load enterprise project data
      const [
        projectsCache, 
        progressData, 
        milestones, 
        constructionPhotos,
        safetyReports
      ] = await Promise.all([
        storage.get(STORAGE_KEYS.PROJECTS_CACHE),
        storage.get(STORAGE_KEYS.PROJECT_PROGRESS),
        storage.get(STORAGE_KEYS.MILESTONES),
        storage.get(STORAGE_KEYS.CONSTRUCTION_PHOTOS),
        storage.get(STORAGE_KEYS.SAFETY_REPORTS),
      ]);

      // Fetch fresh enterprise data
      const [projectsResponse, activeProjectsResponse] = await Promise.all([
        fetchEnterpriseProjects(),
        fetchActiveEnterpriseProjects(),
      ]);

      // Initialize AI predictions
      await initializeAIPredictions();

      // Setup real-time progress monitoring
      setupEnterpriseProgressMonitoring();

      setState(prev => ({
        ...prev,
        projects: projectsResponse.projects,
        activeProjects: activeProjectsResponse.projects,
        progress: progressData?.progress || initialState.progress,
        milestones: milestones || [],
        constructionPhotos: constructionPhotos || [],
        safetyMetrics: safetyReports?.metrics || initialState.safetyMetrics,
        isLoading: false,
      }));

      // Cache enterprise data
      await cacheEnterpriseProjects(projectsResponse.projects);

      await analyticsService.trackEvent('enterprise_progress_initialized', {
        totalProjects: projectsResponse.projects.length,
        activeProjects: activeProjectsResponse.projects.length,
        userRole: user?.role,
      });

    } catch (error) {
      await errorService.captureError(error, { context: 'EnterpriseProgressInitialization' });
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
    }
  }, [isAuthenticated, user]);

  // ===========================================================================
  // ENTERPRISE PROJECT MANAGEMENT
  // ===========================================================================

  const createEnterpriseProject = useCallback(async (projectData) => {
    try {
      if (!hasPermission('create_construction_project')) {
        throw new Error('CONSTRUCTION_PROJECT_PERMISSION_REQUIRED');
      }

      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      // Validate project data
      const validationError = validateEnterpriseProjectData(projectData);
      if (validationError) {
        throw new Error(validationError);
      }

      // Generate AI-optimized project plan
      const aiPlan = await generateAIProjectPlan(projectData);

      const enterpriseProject = {
        ...projectData,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        status: PROJECT_STATUS.PLANNING,
        phases: generateConstructionPhases(projectData),
        aiPlan,
        metadata: {
          location: currentLocation,
          localRegulations: await getLocalRegulations(projectData.location),
          seasonalFactors: getSeasonalFactors(projectData),
          ...projectData.metadata,
        },
      };

      const response = await api.post('/projects/enterprise-create', enterpriseProject);
      const newProject = response.data;

      setState(prev => ({
        ...prev,
        projects: [newProject, ...prev.projects],
        activeProjects: [newProject, ...prev.activeProjects],
        currentProject: newProject,
        isUpdating: false,
      }));

      // Initialize progress tracking
      await initializeProjectProgress(newProject.id);

      await analyticsService.trackEvent('enterprise_project_created', {
        projectId: newProject.id,
        projectType: newProject.type,
        budget: newProject.budget,
        timeline: newProject.timeline,
        squareMeters: newProject.squareMeters,
        floors: newProject.floors,
      });

      return { success: true, project: newProject, aiPlan };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseProjectCreation',
        projectData,
      });
      
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [hasPermission, user, currentLocation]);

  const updateProjectProgress = useCallback(async (projectId, progressData) => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, progressError: null }));

      // Validate progress data
      const validationError = validateProgressData(progressData);
      if (validationError) {
        throw new Error(validationError);
      }

      const response = await api.patch(`/projects/${projectId}/progress`, {
        ...progressData,
        updatedBy: user.id,
        updatedAt: new Date().toISOString(),
        location: currentLocation,
      });

      const updatedProgress = response.data;

      // Update state with new progress
      setState(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          ...updatedProgress.overall,
        },
        phaseProgress: new Map([...prev.phaseProgress, ...updatedProgress.phases]),
        isUpdating: false,
      }));

      // Trigger AI prediction update
      await updateAIPredictions(projectId);

      // Check for milestone achievements
      await checkMilestoneAchievements(projectId, updatedProgress);

      await analyticsService.trackEvent('project_progress_updated', {
        projectId,
        progress: updatedProgress.overall,
        phasesUpdated: Object.keys(updatedProgress.phases).length,
        updatedBy: user.id,
      });

      return { success: true, progress: updatedProgress };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ProjectProgressUpdate',
        projectId,
        progressData,
      });
      
      setState(prev => ({
        ...prev,
        isUpdating: false,
        progressError: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [user, currentLocation]);

  // ===========================================================================
  // ENTERPRISE PROGRESS TRACKING
  // ===========================================================================

  const trackPhysicalProgress = useCallback(async (projectId, phase, progress, evidence = []) => {
    try {
      const progressData = {
        type: PROGRESS_METRICS.PHYSICAL,
        phase,
        value: progress,
        evidence,
        timestamp: new Date().toISOString(),
        verifiedBy: user.id,
        location: currentLocation,
      };

      return await updateProjectProgress(projectId, progressData);
    } catch (error) {
      await errorService.captureError(error, {
        context: 'PhysicalProgressTracking',
        projectId,
        phase,
        progress,
      });
      throw error;
    }
  }, [updateProjectProgress, user, currentLocation]);

  const trackFinancialProgress = useCallback(async (projectId, financialData) => {
    try {
      const progressData = {
        type: PROGRESS_METRICS.FINANCIAL,
        ...financialData,
        timestamp: new Date().toISOString(),
        approvedBy: user.id,
      };

      return await updateProjectProgress(projectId, progressData);
    } catch (error) {
      await errorService.captureError(error, {
        context: 'FinancialProgressTracking',
        projectId,
        financialData,
      });
      throw error;
    }
  }, [updateProjectProgress, user]);

  const addConstructionPhoto = useCallback(async (projectId, photoData) => {
    try {
      setState(prev => ({ ...prev, isUpdating: true }));

      // Upload photo with progress context
      const uploadedPhoto = await uploadConstructionPhoto(projectId, photoData);

      setState(prev => ({
        ...prev,
        constructionPhotos: [uploadedPhoto, ...prev.constructionPhotos],
        isUpdating: false,
      }));

      // Auto-detect progress from photo
      await analyzePhotoForProgress(projectId, uploadedPhoto);

      await analyticsService.trackEvent('construction_photo_added', {
        projectId,
        photoId: uploadedPhoto.id,
        phase: photoData.phase,
        progressDetected: uploadedPhoto.progressValue || 0,
      });

      return { success: true, photo: uploadedPhoto };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ConstructionPhotoAddition',
        projectId,
        photoData,
      });
      
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, []);

  // ===========================================================================
  // ENTERPRISE AI PREDICTIONS & ANALYTICS
  // ===========================================================================

  const initializeAIPredictions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isPredicting: true }));

      const predictions = await generateAIPredictions(state.activeProjects);

      setState(prev => ({
        ...prev,
        predictions,
        isPredicting: false,
      }));

    } catch (error) {
      await errorService.captureError(error, { context: 'AIPredictionsInitialization' });
      
      setState(prev => ({
        ...prev,
        isPredicting: false,
        predictionError: error.message,
      }));
    }
  }, [state.activeProjects]);

  const updateAIPredictions = useCallback(async (projectId) => {
    try {
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
      }

      predictionTimeoutRef.current = setTimeout(async () => {
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const updatedPredictions = await generateAIPredictions([project]);

        setState(prev => ({
          ...prev,
          predictions: {
            ...prev.predictions,
            ...updatedPredictions,
          },
        }));

        await analyticsService.trackEvent('ai_predictions_updated', {
          projectId,
          riskLevel: updatedPredictions.riskLevel,
          budgetVariance: updatedPredictions.budgetVariance,
        });

      }, 2000); // Debounce prediction updates

    } catch (error) {
      await errorService.captureError(error, {
        context: 'AIPredictionsUpdate',
        projectId,
      });
    }
  }, [state.projects]);

  const generateAIPredictions = async (projects) => {
    try {
      const response = await api.post('/ai/projects/predict', {
        projects,
        currentDate: new Date().toISOString(),
        weatherData: await getWeatherData(),
        marketConditions: await getMarketConditions(),
      });

      return response.data.predictions;
    } catch (error) {
      console.error('AI prediction generation failed:', error);
      return {
        completionDate: null,
        budgetVariance: 0,
        riskLevel: RISK_LEVELS.MEDIUM,
        criticalPath: [],
        recommendations: [],
      };
    }
  };

  // ===========================================================================
  // ENTERPRISE SAFETY & COMPLIANCE
  // ===========================================================================

  const reportSafetyIncident = useCallback(async (projectId, incidentData) => {
    try {
      setState(prev => ({ ...prev, isUpdating: true }));

      const safetyReport = {
        ...incidentData,
        projectId,
        reportedBy: user.id,
        reportedAt: new Date().toISOString(),
        location: currentLocation,
        severity: calculateIncidentSeverity(incidentData),
      };

      const response = await api.post('/safety/incidents/report', safetyReport);

      setState(prev => ({
        ...prev,
        safetyMetrics: {
          ...prev.safetyMetrics,
          incidents: prev.safetyMetrics.incidents + 1,
          compliance: calculateSafetyCompliance(prev.safetyMetrics.incidents + 1),
        },
        isUpdating: false,
      }));

      // Trigger safety protocol if critical
      if (safetyReport.severity === 'critical') {
        await triggerSafetyProtocol(projectId, safetyReport);
      }

      await analyticsService.trackEvent('safety_incident_reported', {
        projectId,
        incidentType: incidentData.type,
        severity: safetyReport.severity,
        location: currentLocation,
      });

      return { success: true, report: response.data };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'SafetyIncidentReporting',
        projectId,
        incidentData,
      });
      
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [user, currentLocation]);

  const conductSafetyInspection = useCallback(async (projectId, inspectionData) => {
    try {
      const inspection = {
        ...inspectionData,
        projectId,
        conductedBy: user.id,
        conductedAt: new Date().toISOString(),
        location: currentLocation,
        score: calculateInspectionScore(inspectionData),
      };

      const response = await api.post('/safety/inspections/conduct', inspection);

      setState(prev => ({
        ...prev,
        safetyMetrics: {
          ...prev.safetyMetrics,
          inspections: prev.safetyMetrics.inspections + 1,
          lastInspection: new Date().toISOString(),
          compliance: inspection.score,
        },
      }));

      await analyticsService.trackEvent('safety_inspection_conducted', {
        projectId,
        score: inspection.score,
        areasInspected: inspectionData.areas.length,
        conductedBy: user.id,
      });

      return { success: true, inspection: response.data };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'SafetyInspection',
        projectId,
        inspectionData,
      });
      throw error;
    }
  }, [user, currentLocation]);

  // ===========================================================================
  // ENTERPRISE REPORTING & ANALYTICS
  // ===========================================================================

  const generateProgressReport = useCallback(async (projectId, reportType = 'comprehensive') => {
    try {
      const project = state.projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error('PROJECT_NOT_FOUND');
      }

      const reportData = {
        project,
        progress: state.progress,
        phases: Array.from(state.phaseProgress.entries()),
        predictions: state.predictions,
        safetyMetrics: state.safetyMetrics,
        timeline: generateTimelineAnalysis(project),
        financials: generateFinancialAnalysis(project),
        risks: generateRiskAnalysis(project),
      };

      const report = await generateEnterpriseReport(reportData, reportType);

      await analyticsService.trackEvent('progress_report_generated', {
        projectId,
        reportType,
        reportSections: Object.keys(report.sections).length,
      });

      return report;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ProgressReportGeneration',
        projectId,
        reportType,
      });
      throw error;
    }
  }, [state.projects, state.progress, state.phaseProgress, state.predictions, state.safetyMetrics]);

  const getProjectAnalytics = useCallback(async (projectId) => {
    try {
      const analytics = {
        progressTrend: calculateProgressTrend(projectId),
        efficiency: calculateProjectEfficiency(projectId),
        resourceUtilization: calculateResourceUtilization(projectId),
        riskAssessment: calculateRiskAssessment(projectId),
        compliance: calculateComplianceScore(projectId),
      };

      return analytics;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ProjectAnalytics',
        projectId,
      });
      throw error;
    }
  }, []);

  // ===========================================================================
  // ENTERPRISE UTILITY FUNCTIONS
  // ===========================================================================

  const validateEnterpriseProjectData = (projectData) => {
    const requiredFields = ['name', 'type', 'budget', 'timeline', 'location'];
    const missingFields = requiredFields.filter(field => !projectData[field]);
    
    if (missingFields.length > 0) {
      return `MISSING_REQUIRED_FIELDS: ${missingFields.join(', ')}`;
    }

    if (projectData.budget < 10000) { // Minimum 10,000 ETB
      return 'INSUFFICIENT_BUDGET';
    }

    if (projectData.timeline < 30) { // Minimum 30 days
      return 'INSUFFICIENT_TIMELINE';
    }

    return null;
  };

  const validateProgressData = (progressData) => {
    if (progressData.value < 0 || progressData.value > 100) {
      return 'INVALID_PROGRESS_VALUE';
    }

    if (!progressData.type || !Object.values(PROGRESS_METRICS).includes(progressData.type)) {
      return 'INVALID_PROGRESS_TYPE';
    }

    return null;
  };

  const generateConstructionPhases = (projectData) => {
    const phases = [];
    let startDate = new Date(projectData.startDate || new Date());
    
    Object.entries(CONSTRUCTION_PHASES).forEach(([phaseKey, phaseConfig]) => {
      const phase = {
        id: phaseKey,
        name: phaseConfig.name,
        sequence: phases.length + 1,
        duration: calculatePhaseDuration(phaseConfig, projectData),
        startDate: startDate.toISOString(),
        endDate: new Date(startDate.getTime() + phaseConfig.duration * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        dependencies: phaseConfig.dependencies,
        critical: phaseConfig.critical,
        progress: 0,
      };
      
      phases.push(phase);
      startDate = new Date(phase.endDate);
    });
    
    return phases;
  };

  const calculatePhaseDuration = (phaseConfig, projectData) => {
    let duration = phaseConfig.duration;
    
    // Adjust based on project scale
    if (projectData.squareMeters > 1000) {
      duration *= 1.2;
    }
    
    if (projectData.floors > 5) {
      duration *= 1.3;
    }
    
    // Ethiopian seasonal adjustments
    if (isRainySeason(projectData.location)) {
      duration *= 1.15;
    }
    
    return Math.ceil(duration);
  };

  // ===========================================================================
  // ENTERPRISE COMPUTED VALUES & ANALYTICS
  // ===========================================================================

  const enterpriseProgressStats = useMemo(() => {
    const stats = {
      totalProjects: state.projects.length,
      activeProjects: state.activeProjects.length,
      averageProgress: calculateAverageProgress(state.projects),
      totalBudget: state.projects.reduce((sum, project) => sum + project.budget, 0),
      completedValue: calculateCompletedValue(state.projects),
      riskDistribution: calculateRiskDistribution(state.projects),
      efficiency: calculateOverallEfficiency(state.projects),
    };
    
    return stats;
  }, [state.projects, state.activeProjects]);

  const criticalProjects = useMemo(() => {
    return state.activeProjects.filter(project => 
      state.predictions.riskLevel === RISK_LEVELS.HIGH || 
      state.predictions.riskLevel === RISK_LEVELS.CRITICAL
    );
  }, [state.activeProjects, state.predictions]);

  const upcomingMilestones = useMemo(() => {
    return state.milestones
      .filter(milestone => milestone.status === 'upcoming')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [state.milestones]);

  // ===========================================================================
  // ENTERPRISE HOOK API
  // ===========================================================================

  const enterpriseProgressAPI = {
    // State
    ...state,
    enterpriseProgressStats,
    criticalProjects,
    upcomingMilestones,

    // Project Management
    createProject: createEnterpriseProject,
    updateProgress: updateProjectProgress,
    
    // Progress Tracking
    trackPhysicalProgress,
    trackFinancialProgress,
    addConstructionPhoto,
    
    // Safety & Compliance
    reportSafetyIncident,
    conductSafetyInspection,
    
    // Reporting & Analytics
    generateProgressReport,
    getProjectAnalytics,
    
    // AI Predictions
    refreshPredictions: initializeAIPredictions,
    
    // Utility Functions
    getProjectById: useCallback((projectId) => 
      state.projects.find(project => project.id === projectId), [state.projects]),
    
    getPhaseProgress: useCallback((projectId, phaseId) => 
      state.phaseProgress.get(`${projectId}_${phaseId}`) || 0, [state.phaseProgress]),
    
    _clearErrors: useCallback(() => setState(prev => ({
        ...prev,
        error: null,
        progressError: null,
        predictionError: null,
        syncError: null,
    }), [])),
        get clearErrors() {
            return this._clearErrors;
        },
        set clearErrors(value) {
            this._clearErrors = value;
        },
  };

  // ===========================================================================
  // EFFECTS & CLEANUP
  // ===========================================================================

  useEffect(() => {
    if (isAuthenticated) {
      initializeEnterpriseProgress();
    }
  }, [initializeEnterpriseProgress, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (predictionTimeoutRef.current) clearTimeout(predictionTimeoutRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  return enterpriseProgressAPI;
};

// =============================================================================
// ENTERPRISE SPECIALIZED HOOKS
// =============================================================================

export const useConstructionProgress = () => {
  const { 
    projects, 
    trackPhysicalProgress, 
    addConstructionPhoto,
    reportSafetyIncident,
    enterpriseProgressStats 
  } = useProjectProgress();

  const constructionProjects = useMemo(() => {
    return projects.filter(project => 
      project.type === PROJECT_TYPES.NEW_CONSTRUCTION || 
      project.type === PROJECT_TYPES.RENOVATION
    );
  }, [projects]);

  const trackSiteProgress = useCallback(async (projectId, progressData) => {
    return await trackPhysicalProgress(projectId, progressData.phase, progressData.value, {
      photos: progressData.photos,
      notes: progressData.notes,
      workersPresent: progressData.workers,
      materialsUsed: progressData.materials,
    });
  }, [trackPhysicalProgress]);

  const getSiteSafetyStatus = useCallback(async (projectId) => {
    // Implementation for site safety status
    return {
      score: 95,
      issues: [],
      lastInspection: new Date().toISOString(),
      compliance: 'excellent',
    };
  }, []);

  return {
    constructionProjects,
    trackSiteProgress,
    addConstructionPhoto,
    reportSafetyIncident,
    getSiteSafetyStatus,
    constructionStats: enterpriseProgressStats,
  };
};

export const useGovernmentProjectProgress = () => {
  const { 
    projects, 
    generateProgressReport,
    getProjectAnalytics,
    enterpriseProgressStats 
  } = useProjectProgress();

  const governmentProjects = useMemo(() => {
    return projects.filter(project => project.type === PROJECT_TYPES.GOVERNMENT);
  }, [projects]);

  const generateGovernmentReport = useCallback(async (projectId) => {
    return await generateProgressReport(projectId, 'government');
  }, [generateProgressReport]);

  const getComplianceMetrics = useCallback(async (projectId) => {
    const analytics = await getProjectAnalytics(projectId);
    return {
      regulatory: calculateRegulatoryCompliance(analytics),
      financial: calculateFinancialCompliance(analytics),
      timeline: calculateTimelineCompliance(analytics),
      quality: calculateQualityCompliance(analytics),
    };
  }, [getProjectAnalytics]);

  return {
    governmentProjects,
    generateGovernmentReport,
    getComplianceMetrics,
    governmentStats: enterpriseProgressStats,
  };
};

// =============================================================================
// ENTERPRISE UTILITY FUNCTIONS (Mock implementations)
// =============================================================================

const setupEnterpriseProgressMonitoring = () => {
  // Setup real-time progress monitoring
};

const initializeProjectProgress = async (projectId) => {
  // Initialize progress tracking for new project
};

const generateAIProjectPlan = async (projectData) => {
  // Generate AI-optimized project plan
  return {
    optimizedTimeline: projectData.timeline * 0.9, // 10% optimization
    resourceAllocation: {},
    riskAssessment: {},
    criticalPath: [],
  };
};

const checkMilestoneAchievements = async (projectId, progress) => {
  // Check and update milestone achievements
};

const uploadConstructionPhoto = async (projectId, photoData) => {
  // Upload construction photo with progress context
  return {
    id: `photo_${Date.now()}`,
    ...photoData,
    uploadedAt: new Date().toISOString(),
    progressValue: 0, // Would be set by AI analysis
  };
};

const analyzePhotoForProgress = async (projectId, photo) => {
  // AI analysis of construction photo for progress detection
};

const calculateIncidentSeverity = (incidentData) => {
  // Calculate incident severity based on type and impact
  return 'medium';
};

const calculateSafetyCompliance = (incidents) => {
  // Calculate safety compliance score
  return Math.max(0, 100 - (incidents * 5));
};

const calculateInspectionScore = (inspectionData) => {
  // Calculate inspection score based on findings
  return 95;
};

const triggerSafetyProtocol = async (projectId, incidentReport) => {
  // Trigger safety protocols for critical incidents
};

const generateEnterpriseReport = async (reportData, reportType) => {
  // Generate comprehensive enterprise report
  return {
    type: reportType,
    generatedAt: new Date().toISOString(),
    sections: {},
    recommendations: [],
  };
};

// Analytics calculation functions
const calculateAverageProgress = (projects) => {
  if (projects.length === 0) return 0;
  return projects.reduce((sum, project) => sum + (project.progress || 0), 0) / projects.length;
};

const calculateCompletedValue = (projects) => {
  return projects.reduce((sum, project) => 
    sum + (project.budget * (project.progress || 0) / 100), 0
  );
};

const calculateRiskDistribution = (projects) => {
  // Calculate risk distribution across projects
  return {
    low: projects.filter(p => p.riskLevel === RISK_LEVELS.LOW).length,
    medium: projects.filter(p => p.riskLevel === RISK_LEVELS.MEDIUM).length,
    high: projects.filter(p => p.riskLevel === RISK_LEVELS.HIGH).length,
    critical: projects.filter(p => p.riskLevel === RISK_LEVELS.CRITICAL).length,
  };
};

const calculateOverallEfficiency = (projects) => {
  // Calculate overall project efficiency
  return 85; // Example value
};

// Ethiopian market specific functions
const getLocalRegulations = async (location) => {
  // Get local Ethiopian construction regulations
  return {};
};

const getSeasonalFactors = (projectData) => {
  // Get seasonal factors affecting construction in Ethiopia
  return [];
};

const isRainySeason = (location) => {
  // Check if current time is rainy season in location
  const month = new Date().getMonth();
  return month >= 6 && month <= 9; // June to September
};

const getWeatherData = async () => {
  // Get current weather data for predictions
  return {};
};

const getMarketConditions = async () => {
  // Get current Ethiopian construction market conditions
  return {};
};

export default useProjectProgress;