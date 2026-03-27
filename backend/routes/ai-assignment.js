/**
 * Yachi AI Assignment Routes
 * Enterprise-grade AI Worker Matching & Construction Management
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();

// Enterprise middleware
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimit } = require('../middleware/rateLimit');
const { cache, flushCache } = require('../middleware/cache');
const { logPerformance } = require('../middleware/performance');

// AI Assignment validators
const {
    projectAssignmentSchema,
    workerMatchingSchema,
    invitationBatchSchema,
    projectOptimizationSchema,
    teamFormationSchema,
    replacementRequestSchema
} = require('../validators/ai-assignment-validators');

// AI Assignment controllers
const {
    createAIConstructionProject,
    matchWorkersForProject,
    sendWorkerInvitations,
    optimizeProjectTeam,
    formConstructionTeam,
    handleWorkerReplacement,
    getAIMatchingAnalytics,
    getWorkerPerformancePredictions,
    batchAssignGovernmentProjects,
    getAIMatchingStatus
} = require('../controllers/aiAssignmentController');

/**
 * @api {post} /ai/construction/projects Create AI Construction Project
 * @apiName CreateAIConstructionProject
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * @apiHeader {String} X-Client-Version Client version
 * 
 * @apiParam {String} projectType Type of construction (new_building, finishing, renovation, government)
 * @apiParam {Number} squareArea Total square area in m²
 * @apiParam {Number} floorCount Number of floors
 * @apiParam {Number} budget Total project budget in ETB
 * @apiParam {String} location Project location coordinates
 * @apiParam {Date} startDate Project start date
 * @apiParam {Date} deadline Project completion deadline
 * @apiParam {String[]} requiredSkills Array of required skills
 * @apiParam {Object} specifications Project specifications
 * 
 * @apiSuccess {String} projectId AI-generated project ID
 * @apiSuccess {Object} teamRecommendation Recommended team composition
 * @apiSuccess {Object} timeline AI-optimized timeline
 * @apiSuccess {Object} costBreakdown Detailed cost analysis
 */
router.post(
    '/construction/projects',
    authenticate,
    authorize(['client', 'government', 'admin']),
    rateLimit({ windowMs: 60000, max: 10 }), // 10 requests per minute
    validate(projectAssignmentSchema),
    logPerformance('ai_project_creation'),
    createAIConstructionProject
);

/**
 * @api {get} /ai/construction/workers/match AI Worker Matching
 * @apiName MatchWorkersForProject
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * 
 * @apiParam {String} projectId Project ID for matching
 * @apiParam {String} matchingStrategy Matching strategy (optimized, balanced, budget_focused)
 * @apiParam {Number} maxWorkers Maximum workers to match
 * @apiParam {String[]} excludeWorkers Workers to exclude from matching
 * @apiParam {Object} preferences Additional matching preferences
 * 
 * @apiSuccess {Object[]} matches Array of matched workers
 * @apiSuccess {Number} matchScore Overall matching score
 * @apiSuccess {Object} analytics Matching analytics and insights
 */
router.get(
    '/construction/workers/match',
    authenticate,
    authorize(['client', 'government', 'admin']),
    rateLimit({ windowMs: 30000, max: 20 }),
    cache(300), // Cache for 5 minutes
    validate(workerMatchingSchema),
    logPerformance('ai_worker_matching'),
    matchWorkersForProject
);

/**
 * @api {post} /ai/construction/invitations Send Worker Invitations
 * @apiName SendWorkerInvitations
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * 
 * @apiParam {String} projectId Project ID
 * @apiParam {String[]} workerIds Array of worker IDs to invite
 * @apiParam {Object} invitationDetails Invitation details and terms
 * @apiParam {Boolean} autoReplace Enable automatic replacement for declines
 * @apiParam {String} replacementStrategy Replacement strategy
 * 
 * @apiSuccess {Object} invitationStatus Invitation status for each worker
 * @apiSuccess {Object} replacementPool Available workers for replacement
 */
router.post(
    '/construction/invitations',
    authenticate,
    authorize(['client', 'government', 'admin']),
    rateLimit({ windowMs: 60000, max: 15 }),
    validate(invitationBatchSchema),
    flushCache, // Clear relevant cache
    logPerformance('ai_invitation_sending'),
    sendWorkerInvitations
);

/**
 * @api {post} /ai/construction/teams/optimize Optimize Project Team
 * @apiName OptimizeProjectTeam
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * 
 * @apiParam {String} projectId Project ID to optimize
 * @apiParam {String} optimizationGoal Optimization goal (cost, time, quality, balanced)
 * @apiParam {Object} constraints Optimization constraints
 * @apiParam {Number} maxIterations Maximum optimization iterations
 * 
 * @apiSuccess {Object} optimizedTeam Optimized team composition
 * @apiSuccess {Object} improvementMetrics Improvement metrics
 * @apiSuccess {Object} recommendations Optimization recommendations
 */
router.post(
    '/construction/teams/optimize',
    authenticate,
    authorize(['client', 'government', 'admin']),
    rateLimit({ windowMs: 60000, max: 10 }),
    validate(projectOptimizationSchema),
    logPerformance('ai_team_optimization'),
    optimizeProjectTeam
);

/**
 * @api {post} /ai/construction/teams/formation Form Construction Team
 * @apiName FormConstructionTeam
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * 
 * @apiParam {String} projectType Type of construction project
 * @apiParam {Number} squareArea Square area in m²
 * @apiParam {Number} floorCount Number of floors
 * @apiParam {Number} budget Available budget in ETB
 * @apiParam {String} location Project location
 * @apiParam {String} complexity Project complexity level
 * @apiParam {Object} specialRequirements Special project requirements
 * 
 * @apiSuccess {Object} teamFormation Complete team formation
 * @apiSuccess {Object} roleDistribution Role distribution analysis
 * @apiSuccess {Object} skillCoverage Skill coverage assessment
 */
router.post(
    '/construction/teams/formation',
    authenticate,
    authorize(['client', 'government', 'admin']),
    rateLimit({ windowMs: 60000, max: 10 }),
    validate(teamFormationSchema),
    logPerformance('ai_team_formation'),
    formConstructionTeam
);

/**
 * @api {post} /ai/construction/workers/replace Handle Worker Replacement
 * @apiName HandleWorkerReplacement
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * 
 * @apiParam {String} projectId Project ID
 * @apiParam {String} workerId Worker ID to replace
 * @apiParam {String} replacementReason Reason for replacement
 * @apiParam {String} urgencyLevel Urgency level (low, medium, high, critical)
 * @apiParam {Object} replacementCriteria Criteria for replacement worker
 * 
 * @apiSuccess {Object} replacementWorker Recommended replacement worker
 * @apiSuccess {Number} matchScore Replacement match score
 * @apiSuccess {Object} impactAnalysis Impact analysis of replacement
 */
router.post(
    '/construction/workers/replace',
    authenticate,
    authorize(['client', 'government', 'admin']),
    rateLimit({ windowMs: 30000, max: 20 }),
    validate(replacementRequestSchema),
    flushCache,
    logPerformance('ai_worker_replacement'),
    handleWorkerReplacement
);

/**
 * @api {get} /ai/construction/analytics/matching Get AI Matching Analytics
 * @apiName GetAIMatchingAnalytics
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * @apiHeader {String} X-API-Key API key for analytics access
 * 
 * @apiParam {String} timeframe Timeframe for analytics (7d, 30d, 90d, 1y)
 * @apiParam {String} projectType Filter by project type
 * @apiParam {String} location Filter by location
 * @apiParam {String} analysisType Type of analysis (performance, efficiency, accuracy)
 * 
 * @apiSuccess {Object} matchingAnalytics Comprehensive matching analytics
 * @apiSuccess {Object} performanceMetrics Performance metrics
 * @apiSuccess {Object} improvementOpportunities Improvement suggestions
 */
router.get(
    '/construction/analytics/matching',
    authenticate,
    authorize(['admin', 'government', 'analyst']),
    rateLimit({ windowMs: 60000, max: 30 }),
    cache(600), // Cache for 10 minutes
    logPerformance('ai_matching_analytics'),
    getAIMatchingAnalytics
);

/**
 * @api {get} /ai/construction/workers/predictions Get Worker Performance Predictions
 * @apiName GetWorkerPerformancePredictions
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * 
 * @apiParam {String[]} workerIds Array of worker IDs to analyze
 * @apiParam {String} projectContext Project context for predictions
 * @apiParam {String} predictionType Type of prediction (performance, reliability, skill_growth)
 * @apiParam {Number} timeframe Prediction timeframe in days
 * 
 * @apiSuccess {Object[]} predictions Array of worker predictions
 * @apiSuccess {Object} confidenceMetrics Prediction confidence levels
 * @apiSuccess {Object} riskAssessment Risk assessment analysis
 */
router.get(
    '/construction/workers/predictions',
    authenticate,
    authorize(['client', 'government', 'admin']),
    rateLimit({ windowMs: 60000, max: 15 }),
    cache(300),
    logPerformance('ai_performance_predictions'),
    getWorkerPerformancePredictions
);

/**
 * @api {post} /ai/government/projects/batch-assign Batch Assign Government Projects
 * @apiName BatchAssignGovernmentProjects
 * @apiGroup AI Government
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization Government admin token
 * @apiHeader {String} X-Government-Key Government API key
 * 
 * @apiParam {Object[]} projects Array of government projects
 * @apiParam {String} assignmentStrategy Assignment strategy
 * @apiParam {Object} resourceConstraints Resource constraints
 * @apiParam {Boolean} optimizeNationally Enable national optimization
 * @apiParam {Object} prioritySettings Priority settings
 * 
 * @apiSuccess {Object} assignmentResults Batch assignment results
 * @apiSuccess {Object} nationalOptimization National optimization insights
 * @apiSuccess {Object} resourceUtilization Resource utilization report
 */
router.post(
    '/government/projects/batch-assign',
    authenticate,
    authorize(['government', 'admin']),
    rateLimit({ windowMs: 120000, max: 5 }), // 5 requests per 2 minutes
    validate(invitationBatchSchema),
    flushCache,
    logPerformance('ai_government_batch_assign'),
    batchAssignGovernmentProjects
);

/**
 * @api {get} /ai/construction/status Get AI Matching Status
 * @apiName GetAIMatchingStatus
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * 
 * @apiParam {String} projectId Project ID to check status
 * @apiParam {Boolean} includeDetails Include detailed status information
 * @apiParam {String[]} statusTypes Types of status to include
 * 
 * @apiSuccess {Object} matchingStatus Current matching status
 * @apiSuccess {Object} progressMetrics Progress metrics
 * @apiSuccess {Object} nextSteps Recommended next steps
 */
router.get(
    '/construction/status',
    authenticate,
    authorize(['client', 'government', 'admin']),
    rateLimit({ windowMs: 30000, max: 30 }),
    cache(60), // Cache for 1 minute
    logPerformance('ai_matching_status'),
    getAIMatchingStatus
);

/**
 * @api {get} /ai/construction/capabilities Get AI Capabilities
 * @apiName GetAICapabilities
 * @apiGroup AI Construction
 * @apiVersion 2.0.0
 * 
 * @apiHeader {String} Authorization User's access token
 * 
 * @apiSuccess {Object} capabilities AI capabilities overview
 * @apiSuccess {Object} supportedProjectTypes Supported project types
 * @apiSuccess {Object} matchingAlgorithms Available matching algorithms
 * @apiSuccess {Object} optimizationFeatures Optimization features
 */
router.get(
    '/construction/capabilities',
    authenticate,
    rateLimit({ windowMs: 60000, max: 30 }),
    cache(3600), // Cache for 1 hour
    (req, res) => {
        res.status(200).json({
            status: 'success',
            data: {
                capabilities: {
                    projectTypes: [
                        'new_building',
                        'finishing_work',
                        'renovation',
                        'government_infrastructure',
                        'commercial_construction',
                        'residential_building'
                    ],
                    matchingAlgorithms: [
                        'skill_based_matching',
                        'location_optimization',
                        'budget_optimization',
                        'timeline_optimization',
                        'multi_objective_optimization'
                    ],
                    optimizationFeatures: [
                        'team_size_optimization',
                        'cost_efficiency_analysis',
                        'timeline_compression',
                        'resource_leveling',
                        'risk_mitigation'
                    ],
                    governmentFeatures: [
                        'bulk_assignment',
                        'national_optimization',
                        'resource_allocation',
                        'progress_tracking',
                        'compliance_monitoring'
                    ],
                    analyticsCapabilities: [
                        'performance_prediction',
                        'efficiency_analysis',
                        'risk_assessment',
                        'skill_gap_analysis',
                        'market_trends'
                    ]
                },
                limits: {
                    maxProjectSize: 100000, // m²
                    maxTeamSize: 500,
                    maxBudget: 100000000, // 100 million ETB
                    supportedLocations: [
                        'addis_ababa',
                        'dire_dawa',
                        'mekelle',
                        'bahir_dar',
                        'hawassa',
                        'gondar',
                        'jimma',
                        'dessie'
                    ]
                },
                version: '2.0.0',
                lastUpdated: new Date().toISOString()
            }
        });
    }
);

/**
 * Health check for AI services
 */
router.get(
    '/health',
    rateLimit({ windowMs: 30000, max: 60 }),
    cache(30),
    async (req, res) => {
        try {
            const aiService = require('../services/aiService');
            const healthStatus = await aiService.getHealthStatus();
            
            res.status(200).json({
                status: 'success',
                data: {
                    service: 'yachi-ai-assignment',
                    version: '2.0.0',
                    status: healthStatus.overallStatus,
                    components: healthStatus.components,
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    environment: process.env.NODE_ENV
                }
            });
        } catch (error) {
            res.status(503).json({
                status: 'error',
                message: 'AI service health check failed',
                error: error.message
            });
        }
    }
);

module.exports = router;