// Continue from the existing construction-context.js...

// ==================== ENTERPRISE ACTION CREATORS (CONTINUED) ====================
const actions = {
    // ... previous actions ...

    // Team Member Management
    assignTeamMember: async (projectId, workerData, isAIAssignment = false) => {
        const operation = 'assign_team_member';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_TEAM_LOADING, payload: true });

            const assignmentData = {
                ...workerData,
                projectId,
                assignedBy: user.id,
                assignedAt: new Date().toISOString(),
                assignmentType: isAIAssignment ? 'ai_automatic' : 'manual',
                ethiopianFactors: {
                    regionalRate: state.ethiopianConstructionData.laborRates.get(workerData.skill)?.get(workerData.region),
                    experienceMultiplier: calculateExperienceMultiplier(workerData.experienceYears),
                },
            };

            const assignedMember = await ConstructionService.assignTeamMember(projectId, assignmentData);
            
            dispatch({ 
                type: CONSTRUCTION_ACTIONS.ADD_TEAM_MEMBER, 
                payload: assignedMember 
            });

            // Send notification to worker
            await NotificationService.sendWorkerAssignment(assignedMember.workerId, {
                projectId,
                projectName: state.currentProject?.name,
                assignmentType: assignmentData.assignmentType,
                expectedStartDate: assignmentData.startDate,
            });

            AnalyticsService.track('team_member_assigned', {
                userId: user.id,
                projectId,
                workerId: assignedMember.workerId,
                isAIAssignment,
                skill: workerData.skill,
            });

            return assignedMember;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to assign team member: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    removeTeamMember: async (projectId, memberId, replacementWorkerId = null) => {
        const operation = 'remove_team_member';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });

            await ConstructionService.removeTeamMember(projectId, memberId);
            
            dispatch({ 
                type: CONSTRUCTION_ACTIONS.REMOVE_TEAM_MEMBER, 
                payload: memberId 
            });

            // If replacement is provided, assign new worker
            if (replacementWorkerId) {
                const replacementData = await ConstructionService.getWorkerProfile(replacementWorkerId);
                await actions.assignTeamMember(projectId, replacementData, true);
            }

            AnalyticsService.track('team_member_removed', {
                userId: user.id,
                projectId,
                memberId,
                hasReplacement: !!replacementWorkerId,
            });

        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to remove team member: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    // Invitation Management
    sendWorkerInvitation: async (projectId, workerIds, invitationType = 'direct') => {
        const operation = 'send_worker_invitation';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_INVITATION_LOADING, payload: true });

            const invitations = await ConstructionService.sendInvitations(projectId, workerIds, {
                invitationType,
                projectData: state.currentProject,
                ethiopianContext: {
                    region: state.currentProject?.region,
                    projectType: state.currentProject?.type,
                    urgency: state.currentProject?.urgency,
                },
            });

            for (const invitation of invitations) {
                dispatch({ 
                    type: CONSTRUCTION_ACTIONS.ADD_INVITATION, 
                    payload: invitation 
                });

                // Send push notification
                await NotificationService.sendInvitationNotification(invitation.workerId, {
                    projectId,
                    projectName: state.currentProject?.name,
                    invitationType,
                    deadline: invitation.responseDeadline,
                });
            }

            AnalyticsService.track('worker_invitations_sent', {
                userId: user.id,
                projectId,
                invitationCount: invitations.length,
                invitationType,
            });

            return invitations;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to send invitations: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    respondToInvitation: async (invitationId, response, notes = '') => {
        const operation = 'respond_to_invitation';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });

            const updatedInvitation = await ConstructionService.respondToInvitation(
                invitationId, 
                response, 
                notes
            );

            dispatch({ 
                type: CONSTRUCTION_ACTIONS.UPDATE_INVITATION, 
                payload: updatedInvitation 
            });

            // If accepted, automatically add to team
            if (response === 'accepted' && updatedInvitation.projectId) {
                const workerProfile = await ConstructionService.getWorkerProfile(updatedInvitation.workerId);
                await actions.assignTeamMember(updatedInvitation.projectId, workerProfile, false);
            }

            AnalyticsService.track('invitation_responded', {
                userId: user.id,
                invitationId,
                response,
                projectId: updatedInvitation.projectId,
            });

            return updatedInvitation;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to respond to invitation: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    // Progress & Milestone Management
    updateProjectProgress: async (projectId, progressData) => {
        const operation = 'update_project_progress';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_PROGRESS_LOADING, payload: true });

            const enhancedProgressData = {
                ...progressData,
                updatedBy: user.id,
                updatedAt: new Date().toISOString(),
                ethiopianFactors: {
                    weatherImpact: calculateWeatherImpact(state.currentProject?.region),
                    holidayImpact: calculateHolidayImpact(state.ethiopianConstructionData.holidayCalendar),
                },
            };

            const updatedProgress = await ConstructionService.updateProgress(projectId, enhancedProgressData);
            
            dispatch({ 
                type: CONSTRUCTION_ACTIONS.UPDATE_PROJECT_PROGRESS, 
                payload: {
                    projectId,
                    progress: updatedProgress,
                }
            });

            // Update project status if progress reaches certain thresholds
            if (progressData.overallProgress >= 100) {
                await actions.updateProject(projectId, { status: 'completed' });
            } else if (progressData.overallProgress > 0 && state.currentProject?.status === 'planning') {
                await actions.updateProject(projectId, { status: 'active' });
            }

            AnalyticsService.track('project_progress_updated', {
                userId: user.id,
                projectId,
                progress: progressData.overallProgress,
                milestonesCompleted: progressData.completedMilestones,
            });

            return updatedProgress;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to update progress: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    createMilestone: async (projectId, milestoneData) => {
        const operation = 'create_milestone';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });

            const enhancedMilestoneData = {
                ...milestoneData,
                projectId,
                createdBy: user.id,
                createdAt: new Date().toISOString(),
                ethiopianConsiderations: {
                    seasonalTiming: getOptimalSeasonalTiming(milestoneData.deadline, state.currentProject?.region),
                    resourceAvailability: checkResourceAvailability(milestoneData.requirements, state.currentProject?.region),
                },
            };

            const newMilestone = await ConstructionService.createMilestone(projectId, enhancedMilestoneData);
            
            dispatch({ 
                type: CONSTRUCTION_ACTIONS.ADD_MILESTONE, 
                payload: {
                    projectId,
                    milestone: newMilestone,
                }
            });

            AnalyticsService.track('milestone_created', {
                userId: user.id,
                projectId,
                milestoneId: newMilestone.id,
                milestoneType: newMilestone.type,
                deadline: newMilestone.deadline,
            });

            return newMilestone;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to create milestone: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    // Budget & Financial Management
    updateProjectBudget: async (projectId, budgetData) => {
        const operation = 'update_project_budget';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_BUDGET_LOADING, payload: true });

            // Apply Ethiopian market adjustments
            const ethiopianAdjustedBudget = applyEthiopianBudgetAdjustments(budgetData, {
                region: state.currentProject?.region,
                projectType: state.currentProject?.type,
                seasonalData: state.ethiopianConstructionData.seasonalAdjustments,
                materialCosts: state.ethiopianConstructionData.materialCosts,
                laborRates: state.ethiopianConstructionData.laborRates,
            });

            const updatedBudget = await ConstructionService.updateBudget(projectId, ethiopianAdjustedBudget);
            
            dispatch({ 
                type: CONSTRUCTION_ACTIONS.UPDATE_PROJECT_BUDGET, 
                payload: {
                    projectId,
                    budget: updatedBudget,
                }
            });

            AnalyticsService.track('project_budget_updated', {
                userId: user.id,
                projectId,
                totalBudget: updatedBudget.total,
                materialCost: updatedBudget.materialCost,
                laborCost: updatedBudget.laborCost,
            });

            return updatedBudget;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to update budget: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    addProjectExpense: async (projectId, expenseData) => {
        const operation = 'add_project_expense';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });

            const enhancedExpenseData = {
                ...expenseData,
                projectId,
                recordedBy: user.id,
                recordedAt: new Date().toISOString(),
                currency: 'ETB',
                ethiopianCategory: categorizeEthiopianExpense(expenseData.category, expenseData.description),
            };

            const newExpense = await ConstructionService.addExpense(projectId, enhancedExpenseData);
            
            dispatch({ 
                type: CONSTRUCTION_ACTIONS.ADD_EXPENSE, 
                payload: {
                    projectId,
                    expense: newExpense,
                }
            });

            AnalyticsService.track('project_expense_added', {
                userId: user.id,
                projectId,
                expenseId: newExpense.id,
                amount: newExpense.amount,
                category: newExpense.category,
            });

            return newExpense;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to add expense: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    // AI-Powered Optimization
    optimizeProjectTimeline: async (projectId, constraints = {}) => {
        const operation = 'optimize_project_timeline';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_AI_LOADING, payload: true });

            const optimization = await AIAssignmentService.optimizeProjectTimeline(projectId, {
                ...constraints,
                ethiopianConstraints: {
                    holidayCalendar: state.ethiopianConstructionData.holidayCalendar,
                    seasonalFactors: state.ethiopianConstructionData.seasonalAdjustments,
                    regionalRestrictions: state.ethiopianConstructionData.regulatoryRequirements.get(state.currentProject?.region),
                    weatherPatterns: getRegionalWeatherPatterns(state.currentProject?.region),
                },
                currentTeam: Array.from(state.teamMembers.values()),
                projectRequirements: state.currentProject?.requirements,
            });

            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_AI_RECOMMENDATIONS,
                payload: { timelinePrediction: optimization },
            });

            AnalyticsService.track('project_timeline_optimized', {
                userId: user.id,
                projectId,
                originalTimeline: constraints.originalTimeline,
                optimizedTimeline: optimization.optimizedTimeline,
                efficiencyGain: optimization.efficiencyGain,
            });

            return optimization;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Timeline optimization failed: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    // Ethiopian Market Specific
    calculateEthiopianProjectCost: (projectData) => {
        const regionalFactors = state.ethiopianConstructionData.regionalFactors.get(projectData.region) || {};
        const seasonalFactor = state.ethiopianConstructionData.seasonalAdjustments.get(new Date().getMonth()) || 1.0;
        
        const baseCost = projectData.estimatedCost || 0;
        const adjustedCost = baseCost * (regionalFactors.costMultiplier || 1.0) * seasonalFactor;
        
        return {
            baseCost,
            regionalAdjustment: regionalFactors.costMultiplier || 1.0,
            seasonalAdjustment: seasonalFactor,
            totalAdjustedCost: adjustedCost,
            breakdown: {
                materials: adjustedCost * 0.4, // 40% materials
                labor: adjustedCost * 0.35,    // 35% labor
                equipment: adjustedCost * 0.15, // 15% equipment
                contingency: adjustedCost * 0.1, // 10% contingency
            },
        };
    },

    // Utility Methods
    loadPendingInvitations: async () => {
        const operation = 'load_pending_invitations';
        try {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: true } });

            const invitations = await ConstructionService.getPendingInvitations(user.id);
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_INVITATIONS, payload: invitations });

            return invitations;
        } catch (error) {
            dispatch({
                type: CONSTRUCTION_ACTIONS.SET_ERROR,
                payload: `Failed to load invitations: ${error.message}`,
                meta: { operation }
            });
            throw error;
        } finally {
            dispatch({ type: CONSTRUCTION_ACTIONS.SET_OPERATION_LOADING, payload: { operation, loading: false } });
        }
    },

    refreshConstructionData: async () => {
        await initializeConstructionData();
    },
};

// ==================== ETHIOPIAN MARKET UTILITY FUNCTIONS ====================
const calculateExperienceMultiplier = (experienceYears) => {
    if (experienceYears >= 10) return 1.5;
    if (experienceYears >= 5) return 1.3;
    if (experienceYears >= 2) return 1.1;
    return 1.0;
};

const calculateWeatherImpact = (region) => {
    const currentMonth = new Date().getMonth();
    const rainyMonths = [5, 6, 7, 8]; // June to September
    return rainyMonths.includes(currentMonth) ? 0.7 : 1.0; // 30% reduction in productivity during rainy season
};

const calculateHolidayImpact = (holidayCalendar) => {
    const today = new Date();
    const isHoliday = holidayCalendar.some(holiday => 
        new Date(holiday.date).toDateString() === today.toDateString()
    );
    return isHoliday ? 0 : 1.0;
};

const getOptimalSeasonalTiming = (deadline, region) => {
    const deadlineMonth = new Date(deadline).getMonth();
    const optimalMonths = {
        'addis_ababa': [0, 1, 2, 3, 9, 10, 11], // Oct-May (dry season)
        'oromia': [0, 1, 2, 3, 9, 10, 11],
        'amhara': [0, 1, 2, 3, 9, 10, 11],
        'southern': [0, 1, 2, 3, 9, 10, 11],
    };
    return optimalMonths[region]?.includes(deadlineMonth) ? 'optimal' : 'suboptimal';
};

const checkResourceAvailability = (requirements, region) => {
    // Simplified resource availability check
    const commonMaterials = ['cement', 'steel', 'sand', 'gravel'];
    const specializedMaterials = ['marble', 'glass', 'aluminum'];
    
    const availableResources = {
        'addis_ababa': [...commonMaterials, ...specializedMaterials],
        'oromia': commonMaterials,
        'amhara': commonMaterials,
        'southern': commonMaterials,
    };

    return requirements.every(req => 
        availableResources[region]?.includes(req.toLowerCase())
    );
};

const applyEthiopianBudgetAdjustments = (budgetData, ethiopianFactors) => {
    const regionalMultiplier = ethiopianFactors.regionalFactors?.costMultiplier || 1.0;
    const seasonalMultiplier = ethiopianFactors.seasonalData?.get(new Date().getMonth()) || 1.0;
    
    return {
        ...budgetData,
        materialCost: (budgetData.materialCost || 0) * regionalMultiplier,
        laborCost: (budgetData.laborCost || 0) * regionalMultiplier * seasonalMultiplier,
        equipmentCost: (budgetData.equipmentCost || 0) * regionalMultiplier,
        total: (budgetData.total || 0) * regionalMultiplier * seasonalMultiplier,
        ethiopianAdjustments: {
            regionalMultiplier,
            seasonalMultiplier,
            appliedAt: new Date().toISOString(),
        },
    };
};

const categorizeEthiopianExpense = (category, description) => {
    const ethiopianCategories = {
        'material': ['cement', 'steel', 'sand', 'gravel', 'blocks'],
        'labor': ['wages', 'salary', 'worker', 'foreman'],
        'equipment': ['rental', 'machine', 'tool', 'vehicle'],
        'permit': ['license', 'permit', 'approval', 'government'],
        'transport': ['fuel', 'transport', 'delivery', 'shipping'],
    };

    for (const [ethCategory, keywords] of Object.entries(ethiopianCategories)) {
        if (keywords.some(keyword => 
            description.toLowerCase().includes(keyword) || 
            category.toLowerCase().includes(keyword)
        )) {
            return ethCategory;
        }
    }
    
    return 'other';
};

const getRegionalWeatherPatterns = (region) => {
    const patterns = {
        'addis_ababa': { rainySeason: [5, 6, 7, 8], optimalMonths: [0, 1, 2, 3, 9, 10, 11] },
        'oromia': { rainySeason: [5, 6, 7, 8], optimalMonths: [0, 1, 2, 3, 9, 10, 11] },
        'amhara': { rainySeason: [5, 6, 7, 8], optimalMonths: [0, 1, 2, 3, 9, 10, 11] },
        'southern': { rainySeason: [3, 4, 5, 6, 9, 10], optimalMonths: [0, 1, 2, 7, 8, 11] },
    };
    return patterns[region] || patterns['addis_ababa'];
};

// Export the completed context
export { ConstructionContext, useConstruction, ConstructionProvider };
export default ConstructionContext;