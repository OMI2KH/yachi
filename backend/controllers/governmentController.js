/**
 * Yachi Enterprise Government Controller
 * Advanced government project management with AI-powered features
 * Ethiopian government integration with compliance and reporting
 * @version 2.0.0
 * @class GovernmentController
 */

const { Sequelize, Op } = require('sequelize');
const moment = require('moment-timezone');

// Enterprise Services
const { 
    GovernmentProject, 
    ConstructionProject, 
    User, 
    WorkerAssignment,
    ProjectMilestone,
    ComplianceDocument,
    AuditLog,
    BudgetAllocation
} = require('../models');

const { 
    YachiLogger, 
    AuditLogger, 
    PerformanceLogger 
} = require('../utils/logger');

const { 
    RedisManager, 
    CacheService, 
    DistributedLock 
} = require('../services/cache');

const { 
    GovernmentAIService,
    ComplianceAIService,
    WorkerMatchingService
} = require('../services/ai');

const { 
    AnalyticsEngine, 
    BusinessIntelligenceService 
} = require('../services/analytics');

const { 
    NotificationOrchestrator,
    GovernmentNotificationService
} = require('../services/communication');

const { 
    DocumentProcessingService,
    DigitalSignatureService
} = require('../services/media');

const { 
    ComplianceService,
    AuditService,
    SecurityService
} = require('../services/security');

const { 
    EthiopianGovernmentService,
    LocalizationService
} = require('../services/localization');

class GovernmentController {
    constructor() {
        this.govConfig = {
            projectScales: {
                SMALL: 'small',        // < 10M ETB
                MEDIUM: 'medium',      // 10M - 100M ETB
                LARGE: 'large',        // 100M - 1B ETB
                MEGA: 'mega'           // > 1B ETB
            },
            approvalWorkflows: {
                MINISTRY: 'ministry',
                REGIONAL: 'regional',
                MUNICIPAL: 'municipal',
                FEDERAL: 'federal'
            },
            complianceRequirements: {
                ENVIRONMENTAL: 'environmental',
                SAFETY: 'safety',
                LABOR: 'labor',
                QUALITY: 'quality',
                FINANCIAL: 'financial'
            }
        };

        this.setupGovernmentIntervals();
        this.initializeGovernmentWorkflows();
    }

    /**
     * 🏛️ Setup government-grade intervals and background jobs
     */
    setupGovernmentIntervals() {
        // Compliance monitoring
        setInterval(() => this.monitorCompliance(), 30 * 60 * 1000); // Every 30 minutes
        
        // Budget utilization tracking
        setInterval(() => this.trackBudgetUtilization(), 60 * 60 * 1000); // Every hour
        
        // Government report generation
        setInterval(() => this.generateGovernmentReports(), 24 * 60 * 60 * 1000); // Daily
        
        // Worker allocation optimization
        setInterval(() => this.optimizeWorkerAllocation(), 2 * 60 * 60 * 1000); // Every 2 hours
    }

    /**
     * 🔄 Initialize government workflows and state machines
     */
    initializeGovernmentWorkflows() {
        this.govWorkflows = {
            INFRASTRUCTURE: this.infrastructureWorkflow.bind(this),
            PUBLIC_WORKS: this.publicWorksWorkflow.bind(this),
            URBAN_DEVELOPMENT: this.urbanDevelopmentWorkflow.bind(this),
            RURAL_DEVELOPMENT: this.ruralDevelopmentWorkflow.bind(this),
            EMERGENCY: this.emergencyWorkflow.bind(this)
        };

        this.projectStates = {
            DRAFT: 'draft',
            APPROVAL_PENDING: 'approval_pending',
            BUDGET_ALLOCATED: 'budget_allocated',
            WORKER_MATCHING: 'worker_matching',
            IN_PROGRESS: 'in_progress',
            SUSPENDED: 'suspended',
            COMPLETED: 'completed',
            AUDITED: 'audited'
        };
    }

    /**
     * 🏢 ENTERPRISE GOVERNMENT PROJECT CREATION
     */
    createGovernmentProject = async (req, res) => {
        const transaction = await this.startTransaction();
        const governmentUserId = req.user.userId;
        const lockKey = `gov:project:create:${governmentUserId}`;

        try {
            const lock = await DistributedLock.acquire(lockKey, 20000);
            if (!lock) {
                return this.sendErrorResponse(res, 429, {
                    code: 'CONCURRENT_PROJECT_CREATION',
                    message: 'Please complete your current government project creation'
                });
            }

            const projectData = req.body;
            const govInfo = this.extractGovernmentInfo(req);

            // 🛡️ Government Authorization Validation
            const authValidation = await this.validateGovernmentAuthorization(governmentUserId, projectData);
            if (!authValidation.authorized) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'GOVERNMENT_UNAUTHORIZED',
                    message: 'Insufficient government clearance for this project',
                    requiredLevel: authValidation.requiredLevel,
                    currentLevel: authValidation.currentLevel
                });
            }

            // 🏛️ Enterprise Government Validation
            const validationResult = await this.validateGovernmentProject(projectData, governmentUserId, govInfo);
            if (!validationResult.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'GOVERNMENT_PROJECT_VALIDATION_FAILED',
                    message: 'Government project validation failed',
                    details: validationResult.errors,
                    complianceIssues: validationResult.complianceIssues
                });
            }

            // 📊 AI-Powered Project Feasibility Analysis
            const feasibilityAnalysis = await GovernmentAIService.analyzeProjectFeasibility(projectData, govInfo);
            if (!feasibilityAnalysis.feasible) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'PROJECT_NOT_FEASIBLE',
                    message: 'Project feasibility analysis failed',
                    reasons: feasibilityAnalysis.reasons,
                    recommendations: feasibilityAnalysis.recommendations
                });
            }

            // 💰 Government Budget Allocation
            const budgetAllocation = await this.allocateGovernmentBudget(projectData, feasibilityAnalysis, transaction);

            // 📋 Compliance Pre-Approval
            const compliancePreApproval = await this.processCompliancePreApproval(projectData, transaction);

            // 🎯 Large-Scale Workforce Planning
            const workforcePlanning = await this.planGovernmentWorkforce(projectData, budgetAllocation);

            // 📝 Enterprise Government Project Creation
            const governmentProject = await this.createEnterpriseGovernmentProject({
                governmentUserId,
                projectData,
                feasibilityAnalysis,
                budgetAllocation,
                compliancePreApproval,
                workforcePlanning,
                govInfo
            }, transaction);

            // 🔐 Security Clearance & Access Control
            await this.setupProjectSecurity(governmentProject, governmentUserId, transaction);

            // 📊 Government Analytics
            await AnalyticsEngine.trackGovernmentProjectCreation(governmentProject, govInfo);
            await BusinessIntelligenceService.recordGovernmentEvent('PROJECT_CREATED', governmentProject);

            // 🔔 Multi-Agency Notifications
            await GovernmentNotificationService.sendProjectCreationNotifications(governmentProject, req.user);

            await transaction.commit();

            // 🚀 Success Response
            return this.sendSuccessResponse(res, 201, {
                message: 'Government project created successfully',
                data: {
                    project: this.sanitizeGovernmentProject(governmentProject),
                    feasibility: {
                        score: feasibilityAnalysis.score,
                        risks: feasibilityAnalysis.identifiedRisks,
                        recommendations: feasibilityAnalysis.recommendations
                    },
                    budget: {
                        allocated: budgetAllocation.totalAmount,
                        breakdown: budgetAllocation.breakdown,
                        fiscalYear: budgetAllocation.fiscalYear
                    },
                    compliance: {
                        status: compliancePreApproval.status,
                        requirements: compliancePreApproval.requirements,
                        timeline: compliancePreApproval.timeline
                    },
                    workforce: {
                        estimatedWorkers: workforcePlanning.totalWorkers,
                        regionalDistribution: workforcePlanning.regionalDistribution,
                        timeline: workforcePlanning.recruitmentTimeline
                    }
                },
                nextSteps: [
                    'Awaiting ministry approval',
                    'Compliance review in progress',
                    'Budget allocation finalized'
                ],
                metadata: {
                    projectScale: governmentProject.scale,
                    estimatedDuration: governmentProject.estimatedDuration,
                    priority: governmentProject.priority
                }
            });

        } catch (error) {
            await transaction.rollback();
            await this.handleGovernmentProjectCreationError(error, req);
            
            return this.sendErrorResponse(res, 500, {
                code: 'GOVERNMENT_PROJECT_CREATION_FAILED',
                message: 'Government project creation process failed',
                internalCode: error.code,
                supportReference: this.generateSupportReference()
            });
        } finally {
            await DistributedLock.release(lockKey, lock);
        }
    };

    /**
     * 📊 GOVERNMENT PROJECT APPROVAL WORKFLOW
     */
    approveGovernmentProject = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { projectId } = req.params;
            const approverId = req.user.userId;
            const { approvalLevel, comments, conditions } = req.body;

            // 🛡️ Approver Authorization Check
            const authCheck = await this.validateApproverAuthorization(approverId, approvalLevel);
            if (!authCheck.authorized) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'APPROVAL_UNAUTHORIZED',
                    message: 'Not authorized to approve at this level',
                    requiredRole: authCheck.requiredRole,
                    currentRole: authCheck.currentRole
                });
            }

            // 🔍 Project Validation
            const project = await this.getGovernmentProject(projectId, transaction);
            if (!project) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 404, {
                    code: 'PROJECT_NOT_FOUND',
                    message: 'Government project not found'
                });
            }

            // 📋 Approval Workflow Validation
            const workflowValidation = await this.validateApprovalWorkflow(project, approvalLevel);
            if (!workflowValidation.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'INVALID_APPROVAL_WORKFLOW',
                    message: 'Invalid approval workflow sequence',
                    expectedLevel: workflowValidation.expectedLevel,
                    currentLevel: workflowValidation.currentLevel
                });
            }

            // 🤖 AI-Powered Approval Recommendation
            const aiRecommendation = await GovernmentAIService.generateApprovalRecommendation(project, approverId);

            // ✅ Approval Processing
            const approvalResult = await this.processGovernmentApproval(
                project, 
                approverId, 
                approvalLevel, 
                comments, 
                conditions, 
                transaction
            );

            // 📝 Digital Signature & Documentation
            const digitalSignature = await DigitalSignatureService.signApprovalDocument(approvalResult.document, approverId);

            // 🔔 Approval Notifications
            await GovernmentNotificationService.sendApprovalNotifications(project, approvalResult, req.user);

            // 📊 Approval Analytics
            await AnalyticsEngine.trackGovernmentApproval(project, approvalResult, aiRecommendation);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Government project approved successfully',
                data: {
                    project: this.sanitizeGovernmentProject(project),
                    approval: {
                        level: approvalLevel,
                        status: 'APPROVED',
                        approver: req.user.name,
                        timestamp: new Date().toISOString(),
                        conditions: conditions || []
                    },
                    aiRecommendation: {
                        confidence: aiRecommendation.confidence,
                        factors: aiRecommendation.factors,
                        riskAssessment: aiRecommendation.riskAssessment
                    },
                    digitalSignature: {
                        signed: true,
                        timestamp: digitalSignature.timestamp,
                        documentId: digitalSignature.documentId
                    },
                    nextSteps: this.getNextApprovalSteps(project, approvalLevel)
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Government project approval error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'APPROVAL_PROCESS_FAILED',
                message: 'Government project approval process failed'
            });
        }
    };

    /**
     * 👷 MASS WORKER ALLOCATION FOR GOVERNMENT PROJECTS
     */
    allocateWorkers = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { projectId } = req.params;
            const allocatorId = req.user.userId;
            const allocationData = req.body;

            // 🛡️ Allocation Authorization
            const authCheck = await this.validateAllocationAuthorization(allocatorId, projectId);
            if (!authCheck.authorized) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'ALLOCATION_UNAUTHORIZED',
                    message: 'Not authorized to allocate workers for this project'
                });
            }

            const project = await this.getGovernmentProject(projectId, transaction);
            if (!project) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 404, {
                    code: 'PROJECT_NOT_FOUND',
                    message: 'Government project not found'
                });
            }

            // 🤖 AI-Powered Worker Allocation
            const allocationResult = await GovernmentAIService.optimizeWorkerAllocation(project, allocationData);

            // 📍 Regional Distribution Planning
            const regionalDistribution = await this.planRegionalWorkerDistribution(allocationResult, project);

            // 👥 Mass Worker Assignment
            const assignmentResults = await this.executeMassWorkerAssignment(
                project, 
                allocationResult, 
                regionalDistribution, 
                transaction
            );

            // 💰 Budget Allocation for Workers
            const workerBudget = await this.allocateWorkerBudget(project, assignmentResults, transaction);

            // 📋 Compliance Documentation
            const complianceDocs = await this.generateWorkerComplianceDocuments(project, assignmentResults, transaction);

            // 🔔 Worker Allocation Notifications
            await GovernmentNotificationService.sendWorkerAllocationNotifications(project, assignmentResults);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Mass worker allocation completed successfully',
                data: {
                    project: this.sanitizeGovernmentProject(project),
                    allocation: {
                        totalWorkers: assignmentResults.totalWorkers,
                        allocatedWorkers: assignmentResults.allocatedWorkers,
                        regionalBreakdown: regionalDistribution.breakdown,
                        skillDistribution: allocationResult.skillDistribution
                    },
                    financials: {
                        totalLaborCost: workerBudget.totalCost,
                        perDiemRates: workerBudget.rates,
                        paymentSchedule: workerBudget.paymentSchedule
                    },
                    compliance: {
                        documents: complianceDocs.generated,
                        requirements: complianceDocs.requirements,
                        status: 'COMPLIANT'
                    },
                    timeline: {
                        allocationDate: new Date().toISOString(),
                        expectedStart: assignmentResults.expectedStart,
                        projectDuration: project.estimatedDuration
                    }
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Worker allocation error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'WORKER_ALLOCATION_FAILED',
                message: 'Mass worker allocation process failed'
            });
        }
    };

    /**
     * 📈 GOVERNMENT PROJECT ANALYTICS DASHBOARD
     */
    getGovernmentDashboard = async (req, res) => {
        try {
            const governmentUserId = req.user.userId;
            const { 
                timeframe = 'current_fiscal_year',
                region = 'all',
                ministry = 'all',
                metrics = 'comprehensive'
            } = req.query;

            // 🛡️ Dashboard Access Authorization
            const dashboardAuth = await this.validateDashboardAccess(governmentUserId, region, ministry);
            if (!dashboardAuth.authorized) {
                return this.sendErrorResponse(res, 403, {
                    code: 'DASHBOARD_ACCESS_DENIED',
                    message: 'Not authorized to access this dashboard view'
                });
            }

            const cacheKey = `gov:dashboard:${governmentUserId}:${timeframe}:${region}:${ministry}:${metrics}`;

            const dashboardData = await CacheService.getWithFallback(cacheKey, async () => {
                return await this.generateGovernmentDashboardData(
                    governmentUserId, 
                    timeframe, 
                    region, 
                    ministry, 
                    metrics
                );
            }, { ttl: 300 }); // 5 minute cache

            // 🤖 AI-Powered Insights
            const aiInsights = await GovernmentAIService.generateDashboardInsights(dashboardData, timeframe);

            return this.sendSuccessResponse(res, 200, {
                message: 'Government dashboard data retrieved successfully',
                data: {
                    dashboard: dashboardData,
                    insights: aiInsights,
                    timeframe,
                    generatedAt: new Date().toISOString(),
                    accessScope: dashboardAuth.accessScope
                }
            });

        } catch (error) {
            YachiLogger.error('Government dashboard error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'DASHBOARD_RETRIEVAL_FAILED',
                message: 'Failed to retrieve government dashboard data'
            });
        }
    };

    /**
     * 📊 BUDGET UTILIZATION TRACKING
     */
    getBudgetUtilization = async (req, res) => {
        try {
            const { projectId } = req.params;
            const governmentUserId = req.user.userId;
            const { granularity = 'monthly' } = req.query;

            // 🛡️ Budget Access Authorization
            const budgetAuth = await this.validateBudgetAccess(governmentUserId, projectId);
            if (!budgetAuth.authorized) {
                return this.sendErrorResponse(res, 403, {
                    code: 'BUDGET_ACCESS_DENIED',
                    message: 'Not authorized to access budget information for this project'
                });
            }

            const cacheKey = `gov:budget:${projectId}:${granularity}:${governmentUserId}`;

            const budgetData = await CacheService.getWithFallback(cacheKey, async () => {
                return await this.generateBudgetUtilizationReport(projectId, granularity);
            }, { ttl: 600 }); // 10 minute cache

            return this.sendSuccessResponse(res, 200, {
                message: 'Budget utilization report generated successfully',
                data: {
                    budget: budgetData.utilization,
                    projections: budgetData.projections,
                    alerts: budgetData.alerts,
                    recommendations: budgetData.recommendations,
                    granularity,
                    reportPeriod: budgetData.reportPeriod
                }
            });

        } catch (error) {
            YachiLogger.error('Budget utilization error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'BUDGET_REPORT_FAILED',
                message: 'Failed to generate budget utilization report'
            });
        }
    };

    /**
     * 🏛️ COMPLIANCE MONITORING AND REPORTING
     */
    getComplianceReport = async (req, res) => {
        try {
            const { projectId } = req.params;
            const governmentUserId = req.user.userId;
            const { complianceType = 'all', timeframe = 'current' } = req.query;

            // 🛡️ Compliance Report Authorization
            const complianceAuth = await this.validateComplianceAccess(governmentUserId, projectId);
            if (!complianceAuth.authorized) {
                return this.sendErrorResponse(res, 403, {
                    code: 'COMPLIANCE_ACCESS_DENIED',
                    message: 'Not authorized to access compliance reports for this project'
                });
            }

            const cacheKey = `gov:compliance:${projectId}:${complianceType}:${timeframe}:${governmentUserId}`;

            const complianceReport = await CacheService.getWithFallback(cacheKey, async () => {
                return await this.generateComplianceReport(projectId, complianceType, timeframe);
            }, { ttl: 900 }); // 15 minute cache

            return this.sendSuccessResponse(res, 200, {
                message: 'Compliance report generated successfully',
                data: {
                    compliance: complianceReport.status,
                    violations: complianceReport.violations,
                    recommendations: complianceReport.recommendations,
                    auditTrail: complianceReport.auditTrail,
                    type: complianceType,
                    timeframe,
                    generatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            YachiLogger.error('Compliance report error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'COMPLIANCE_REPORT_FAILED',
                message: 'Failed to generate compliance report'
            });
        }
    };

    /**
     * 📋 GOVERNMENT AUDIT MANAGEMENT
     */
    conductGovernmentAudit = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { projectId } = req.params;
            const auditorId = req.user.userId;
            const auditData = req.body;

            // 🛡️ Auditor Authorization
            const auditorAuth = await this.validateAuditorAuthorization(auditorId, projectId);
            if (!auditorAuth.authorized) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'AUDIT_UNAUTHORIZED',
                    message: 'Not authorized to conduct audits for this project'
                });
            }

            const project = await this.getGovernmentProject(projectId, transaction);
            if (!project) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 404, {
                    code: 'PROJECT_NOT_FOUND',
                    message: 'Government project not found'
                });
            }

            // 📊 AI-Powered Audit Planning
            const auditPlan = await AuditService.generateAuditPlan(project, auditData.scope);

            // 🔍 Comprehensive Audit Execution
            const auditResults = await this.executeGovernmentAudit(project, auditPlan, auditorId, transaction);

            // 📝 Audit Report Generation
            const auditReport = await this.generateAuditReport(project, auditResults, transaction);

            // 🚨 Compliance Enforcement
            const enforcementActions = await this.enforceAuditFindings(project, auditResults, transaction);

            // 🔔 Audit Notification
            await GovernmentNotificationService.sendAuditNotifications(project, auditReport, req.user);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Government audit completed successfully',
                data: {
                    project: this.sanitizeGovernmentProject(project),
                    audit: {
                        id: auditReport.id,
                        scope: auditData.scope,
                        findings: auditResults.findings,
                        recommendations: auditResults.recommendations,
                        complianceScore: auditResults.complianceScore
                    },
                    enforcement: {
                        actions: enforcementActions.actions,
                        timeline: enforcementActions.timeline,
                        responsibleParties: enforcementActions.responsibleParties
                    },
                    nextSteps: [
                        'Review audit findings',
                        'Implement recommendations',
                        'Schedule follow-up audit'
                    ]
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Government audit error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'AUDIT_PROCESS_FAILED',
                message: 'Government audit process failed'
            });
        }
    };

    /**
     * 🛠️ ENTERPRISE UTILITY METHODS
     */

    /**
     * Validate government authorization
     */
    async validateGovernmentAuthorization(userId, projectData) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'role', 'governmentClearance', 'assignedMinistry']
        });

        if (!user || user.role !== 'government_official') {
            return {
                authorized: false,
                requiredLevel: 'government_official',
                currentLevel: user?.role || 'none'
            };
        }

        // 🏛️ Ministry-specific authorization
        const ministryAuthorization = await this.validateMinistryAuthorization(user, projectData);
        if (!ministryAuthorization.authorized) {
            return ministryAuthorization;
        }

        // 💰 Budget-level authorization
        const budgetAuthorization = await this.validateBudgetAuthorization(user, projectData.budget);
        if (!budgetAuthorization.authorized) {
            return budgetAuthorization;
        }

        return {
            authorized: true,
            clearanceLevel: user.governmentClearance,
            ministry: user.assignedMinistry,
            budgetLimit: budgetAuthorization.budgetLimit
        };
    }

    /**
     * Validate ministry-specific authorization
     */
    async validateMinistryAuthorization(user, projectData) {
        const requiredMinistry = projectData.oversightMinistry;
        
        if (user.assignedMinistry !== requiredMinistry && user.assignedMinistry !== 'PRIME_MINISTRY') {
            return {
                authorized: false,
                requiredMinistry: requiredMinistry,
                currentMinistry: user.assignedMinistry,
                message: 'Project requires authorization from different ministry'
            };
        }

        return { authorized: true };
    }

    /**
     * Validate government project with comprehensive checks
     */
    async validateGovernmentProject(projectData, governmentUserId, govInfo) {
        const errors = [];
        const complianceIssues = [];

        // 🏢 Project Scale Validation
        if (!projectData.scale || !this.govConfig.projectScales[projectData.scale.toUpperCase()]) {
            errors.push('INVALID_PROJECT_SCALE');
        }

        // 📍 Location Validation (Ethiopian Regions)
        const locationValidation = await this.validateEthiopianGovernmentLocation(projectData.location);
        if (!locationValidation.valid) {
            errors.push(...locationValidation.errors);
        }

        // 💰 Budget Validation
        if (!projectData.budget || projectData.budget <= 0) {
            errors.push('INVALID_BUDGET');
        }

        // 🏛️ Ministry Oversight Validation
        if (!projectData.oversightMinistry) {
            errors.push('OVERSIGHT_MINISTRY_REQUIRED');
        }

        // 📋 Compliance Pre-Check
        const compliancePreCheck = await ComplianceService.preValidateGovernmentProject(projectData);
        if (!compliancePreCheck.valid) {
            complianceIssues.push(...compliancePreCheck.issues);
        }

        // 📅 Timeline Validation
        if (projectData.timeline) {
            const timelineValidation = this.validateGovernmentTimeline(projectData);
            if (!timelineValidation.valid) {
                errors.push(...timelineValidation.errors);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            complianceIssues,
            suggestions: compliancePreCheck.suggestions
        };
    }

    /**
     * Validate Ethiopian government project location
     */
    async validateEthiopianGovernmentLocation(location) {
        const errors = [];
        const ethiopianRegions = [
            'addis ababa', 'afar', 'amhara', 'benishangul-gumuz', 'dire dawa',
            'gambela', 'harari', 'oromia', 'sidama', 'somalia', 
            'south west ethiopia peoples', 'southern nations nationalities and peoples', 
            'tigray'
        ];

        if (!location || !location.region) {
            errors.push('REGION_REQUIRED');
            return { valid: false, errors };
        }

        if (!ethiopianRegions.includes(location.region.toLowerCase())) {
            errors.push('INVALID_ETHIOPIAN_REGION');
        }

        if (!location.district) {
            errors.push('DISTRICT_REQUIRED');
        }

        // 🏗️ Government-specific location checks
        if (location.landOwnership && !['government', 'communal', 'private'].includes(location.landOwnership)) {
            errors.push('INVALID_LAND_OWNERSHIP');
        }

        if (location.environmentalImpact && !['low', 'medium', 'high'].includes(location.environmentalImpact)) {
            errors.push('INVALID_ENVIRONMENTAL_IMPACT');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Allocate government budget with AI optimization
     */
    async allocateGovernmentBudget(projectData, feasibilityAnalysis, transaction) {
        const baseBudget = projectData.budget;
        
        // 🤖 AI-Powered Budget Optimization
        const optimizedBudget = await GovernmentAIService.optimizeBudgetAllocation(
            projectData, 
            baseBudget, 
            feasibilityAnalysis
        );

        // 📊 Contingency Planning
        const contingency = this.calculateGovernmentContingency(projectData, optimizedBudget);

        // 💰 Fiscal Year Allocation
        const fiscalAllocation = await this.allocateToFiscalYear(optimizedBudget, projectData.timeline);

        // 📝 Budget Record Creation
        const budgetRecord = await BudgetAllocation.create({
            projectId: null, // Will be updated after project creation
            totalAmount: optimizedBudget.total,
            allocatedAmount: optimizedBudget.allocated,
            contingencyAmount: contingency,
            fiscalYear: fiscalAllocation.fiscalYear,
            breakdown: optimizedBudget.breakdown,
            metadata: {
                optimization: optimizedBudget.optimizationFactors,
                constraints: fiscalAllocation.constraints,
                approvalWorkflow: projectData.approvalWorkflow
            }
        }, { transaction });

        return {
            totalAmount: budgetRecord.totalAmount,
            allocatedAmount: budgetRecord.allocatedAmount,
            contingency: budgetRecord.contingencyAmount,
            fiscalYear: budgetRecord.fiscalYear,
            breakdown: budgetRecord.breakdown,
            recordId: budgetRecord.id
        };
    }

    /**
     * Process compliance pre-approval
     */
    async processCompliancePreApproval(projectData, transaction) {
        const complianceRequirements = this.identifyComplianceRequirements(projectData);
        
        const complianceResults = await Promise.all(
            complianceRequirements.map(async (requirement) => {
                return await ComplianceService.validateRequirement(projectData, requirement);
            })
        );

        const compliantRequirements = complianceResults.filter(result => result.compliant);
        const nonCompliantRequirements = complianceResults.filter(result => !result.compliant);

        // 📋 Generate Compliance Documents
        const complianceDocuments = await this.generateComplianceDocuments(projectData, compliantRequirements, transaction);

        return {
            status: nonCompliantRequirements.length === 0 ? 'PRE_APPROVED' : 'CONDITIONAL',
            requirements: complianceRequirements,
            compliant: compliantRequirements.map(req => req.requirement),
            nonCompliant: nonCompliantRequirements.map(req => ({
                requirement: req.requirement,
                issues: req.issues,
                recommendations: req.recommendations
            })),
            documents: complianceDocuments
        };
    }

    /**
     * Plan government workforce at scale
     */
    async planGovernmentWorkforce(projectData, budgetAllocation) {
        const baseWorkforce = this.calculateBaseWorkforce(projectData);
        
        // 🤖 AI-Powered Workforce Optimization
        const optimizedWorkforce = await GovernmentAIService.optimizeGovernmentWorkforce(
            projectData, 
            baseWorkforce, 
            budgetAllocation
        );

        // 📍 Regional Distribution
        const regionalDistribution = await this.calculateRegionalDistribution(projectData, optimizedWorkforce);

        // ⏰ Recruitment Timeline
        const recruitmentTimeline = this.planRecruitmentTimeline(projectData, optimizedWorkforce);

        return {
            baseWorkforce,
            optimizedWorkforce,
            regionalDistribution,
            recruitmentTimeline,
            skillRequirements: optimizedWorkforce.skillRequirements,
            trainingNeeds: optimizedWorkforce.trainingNeeds
        };
    }

    /**
     * Create enterprise government project
     */
    async createEnterpriseGovernmentProject(projectParams, transaction) {
        const {
            governmentUserId,
            projectData,
            feasibilityAnalysis,
            budgetAllocation,
            compliancePreApproval,
            workforcePlanning,
            govInfo
        } = projectParams;

        return await GovernmentProject.create({
            governmentUserId,
            title: projectData.title,
            description: projectData.description,
            type: projectData.type,
            scale: projectData.scale,
            location: projectData.location,
            budget: budgetAllocation.totalAmount,
            estimatedDuration: projectData.timeline,
            priority: projectData.priority || 'medium',
            oversightMinistry: projectData.oversightMinistry,
            status: this.projectStates.APPROVAL_PENDING,
            metadata: {
                creation: govInfo,
                feasibilityAnalysis,
                budgetAllocation,
                compliancePreApproval,
                workforcePlanning,
                approvalWorkflow: projectData.approvalWorkflow || this.govConfig.approvalWorkflows.FEDERAL,
                security: {
                    classification: projectData.classification || 'RESTRICTED',
                    accessLevel: projectData.accessLevel || 'MINISTRY'
                },
                version: '2.0.0'
            }
        }, { transaction });
    }

    /**
     * Setup project security and access control
     */
    async setupProjectSecurity(project, governmentUserId, transaction) {
        const securityConfig = {
            projectId: project.id,
            ownerId: governmentUserId,
            accessLevel: project.metadata.security.accessLevel,
            classification: project.metadata.security.classification,
            allowedMinistries: [project.oversightMinistry],
            auditTrail: true
        };

        await SecurityService.configureProjectSecurity(securityConfig, transaction);

        // 📝 Log security configuration
        await AuditLog.create({
            action: 'PROJECT_SECURITY_CONFIGURED',
            userId: governmentUserId,
            entityType: 'GovernmentProject',
            entityId: project.id,
            metadata: {
                securityConfig,
                timestamp: new Date().toISOString()
            }
        }, { transaction });
    }

    /**
     * Standardized success response
     */
    sendSuccessResponse(res, statusCode, data) {
        return res.status(statusCode).json({
            success: true,
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Standardized error response
     */
    sendErrorResponse(res, statusCode, error) {
        return res.status(statusCode).json({
            success: false,
            timestamp: new Date().toISOString(),
            error: {
                ...error,
                referenceId: this.generateSupportReference()
            }
        });
    }

    /**
     * Generate unique support reference
     */
    generateSupportReference() {
        return `YCH-GOV-${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    /**
     * Start database transaction with retry logic
     */
    async startTransaction() {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await sequelize.transaction();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
        }
    }

    /**
     * Extract comprehensive government information
     */
    extractGovernmentInfo(req) {
        return {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            fingerprint: req.headers['x-government-fingerprint'] || this.generateGovernmentFingerprint(req),
            ministry: req.headers['x-ministry'],
            clearanceLevel: req.headers['x-clearance-level'],
            region: req.headers['x-government-region'],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Monitor compliance across all government projects
     */
    async monitorCompliance() {
        try {
            const activeProjects = await GovernmentProject.findAll({
                where: {
                    status: {
                        [Op.in]: [this.projectStates.IN_PROGRESS, this.projectStates.BUDGET_ALLOCATED]
                    }
                }
            });

            for (const project of activeProjects) {
                await this.checkProjectCompliance(project);
            }

            YachiLogger.info(`Monitored compliance for ${activeProjects.length} government projects`);
        } catch (error) {
            YachiLogger.error('Compliance monitoring failed:', error);
        }
    }
}

// 🚀 Export enterprise controller
module.exports = GovernmentController;