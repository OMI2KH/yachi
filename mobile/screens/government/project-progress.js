import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGovernmentProjects } from '../../contexts/construction-context';
import { useAuth } from '../../contexts/auth-context';
import { useNotifications } from '../../contexts/notification-context';
import {
  ThemedView,
  ThemedText,
} from '../../components/themed-view';
import {
  Card,
  Button,
  Loading,
  Badge,
  ProgressBar,
  Modal,
} from '../../components/ui';
import { ProjectTimeline } from '../../components/construction/project-timeline';
import { ProgressChart } from '../../components/construction/progress-chart';
import { WorkerAssignment } from '../../components/construction/worker-assignment';
import { MilestoneTracker } from '../../components/construction/milestone-tracker';
import { BudgetTracker } from '../../components/construction/budget-tracker';
import { RiskIndicator } from '../../components/construction/risk-indicator';
import {
  PROJECT_STATUS,
  PROJECT_PRIORITY,
  MILESTONE_STATUS,
  GOVERNMENT_ROLES,
} from '../../constants/government';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { calculateProjectHealth } from '../../utils/project-calculations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Government Project Progress Tracking Screen
 * Real-time monitoring and management of construction project progress
 */
const GovernmentProjectProgress = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const projectId = params.projectId;
  
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  
  const {
    project,
    loading,
    updating,
    progressData,
    milestones,
    workers,
    risks,
    budget,
    updateProgress,
    updateMilestone,
    assignWorkers,
    updateBudget,
    addRisk,
    resolveRisk,
    refreshProject,
    generateProgressReport,
  } = useGovernmentProjects(projectId);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // User permissions for project management
  const userPermissions = useMemo(() => {
    const role = user?.role;
    return {
      canUpdateProgress: [GOVERNMENT_ROLES.PROJECT_MANAGER, GOVERNMENT_ROLES.ADMIN].includes(role),
      canManageBudget: [GOVERNMENT_ROLES.PROJECT_MANAGER, GOVERNMENT_ROLES.FINANCE, GOVERNMENT_ROLES.ADMIN].includes(role),
      canAssignWorkers: [GOVERNMENT_ROLES.PROJECT_MANAGER, GOVERNMENT_ROLES.HR, GOVERNMENT_ROLES.ADMIN].includes(role),
      canManageRisks: [GOVERNMENT_ROLES.PROJECT_MANAGER, GOVERNMENT_ROLES.ADMIN].includes(role),
      canGenerateReports: [GOVERNMENT_ROLES.PROJECT_MANAGER, GOVERNMENT_ROLES.ADMIN, GOVERNMENT_ROLES.AUDITOR].includes(role),
    };
  }, [user?.role]);

  // Project health and analytics
  const projectHealth = useMemo(() => {
    if (!project || !progressData) return null;
    
    return calculateProjectHealth({
      progress: progressData.overallProgress,
      budgetUtilization: budget?.utilizationRate || 0,
      timelineAdherence: progressData.timelineAdherence,
      riskLevel: risks.filter(r => !r.resolved).length,
      milestoneCompletion: milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length / milestones.length,
    });
  }, [project, progressData, budget, risks, milestones]);

  // Progress statistics
  const progressStats = useMemo(() => {
    const completedMilestones = milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
    const delayedMilestones = milestones.filter(m => 
      m.status !== MILESTONE_STATUS.COMPLETED && new Date(m.dueDate) < new Date()
    ).length;
    const activeWorkers = workers.filter(w => w.status === 'active').length;
    const criticalRisks = risks.filter(r => r.severity === 'high' && !r.resolved).length;

    return {
      completedMilestones,
      delayedMilestones,
      activeWorkers,
      criticalRisks,
      totalMilestones: milestones.length,
      totalWorkers: workers.length,
      totalRisks: risks.length,
    };
  }, [milestones, workers, risks]);

  // Budget analysis
  const budgetAnalysis = useMemo(() => {
    if (!budget) return null;
    
    const spent = budget.totalAllocated - budget.remaining;
    const utilizationRate = (spent / budget.totalAllocated) * 100;
    const dailyBurnRate = spent / Math.max(1, Math.ceil((new Date() - new Date(project?.startDate)) / (1000 * 60 * 60 * 24)));
    const projectedOverspend = utilizationRate > 100 ? spent - budget.totalAllocated : 0;

    return {
      spent,
      utilizationRate,
      dailyBurnRate,
      projectedOverspend,
      remainingDays: Math.ceil((new Date(project?.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
    };
  }, [budget, project]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProject();
    setRefreshing(false);
    
    // Animate refresh completion
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [refreshProject, fadeAnim]);

  const handleProgressUpdate = useCallback(async (updates) => {
    try {
      await updateProgress(updates);
      showNotification('success', 'Progress Updated', 'Project progress has been updated successfully');
    } catch (error) {
      showNotification('error', 'Update Failed', error.message);
    }
  }, [updateProgress, showNotification]);

  const handleMilestoneUpdate = useCallback(async (milestoneId, updates) => {
    try {
      await updateMilestone(milestoneId, updates);
      showNotification('success', 'Milestone Updated', 'Milestone status has been updated');
    } catch (error) {
      showNotification('error', 'Update Failed', error.message);
    }
  }, [updateMilestone, showNotification]);

  const handleWorkerAssignment = useCallback(async (assignments) => {
    try {
      await assignWorkers(assignments);
      setShowWorkerModal(false);
      showNotification('success', 'Workers Assigned', 'Workers have been assigned successfully');
    } catch (error) {
      showNotification('error', 'Assignment Failed', error.message);
    }
  }, [assignWorkers, showNotification]);

  const handleRiskAdd = useCallback(async (riskData) => {
    try {
      await addRisk({
        ...riskData,
        projectId,
        reportedBy: user.id,
        reportedAt: new Date().toISOString(),
      });
      setShowRiskModal(false);
      showNotification('success', 'Risk Added', 'New risk has been added to the project');
    } catch (error) {
      showNotification('error', 'Risk Addition Failed', error.message);
    }
  }, [addRisk, projectId, user, showNotification]);

  const handleRiskResolve = useCallback(async (riskId, resolution) => {
    try {
      await resolveRisk(riskId, resolution);
      showNotification('success', 'Risk Resolved', 'Risk has been marked as resolved');
    } catch (error) {
      showNotification('error', 'Resolution Failed', error.message);
    }
  }, [resolveRisk, showNotification]);

  const handleReportGenerate = useCallback(async (reportType) => {
    try {
      const report = await generateProgressReport(reportType);
      setShowReportModal(false);
      showNotification('success', 'Report Generated', `${reportType} report has been generated`);
      // In a real app, this would open the report or share it
    } catch (error) {
      showNotification('error', 'Report Generation Failed', error.message);
    }
  }, [generateProgressReport, showNotification]);

  const toggleSection = useCallback((section) => {
    setExpandedSection(expandedSection === section ? null : section);
  }, [expandedSection]);

  const renderOverviewSection = useCallback(() => (
    <Animated.View style={{ opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }}>
      {/* Project Health Score */}
      <Card variant="elevated" style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <ThemedText type="title">Project Health</ThemedText>
          <Badge 
            variant={projectHealth?.status || 'default'} 
            text={projectHealth?.status.toUpperCase()}
          />
        </View>
        
        <ProgressBar 
          progress={projectHealth?.score / 100} 
          color={projectHealth?.color}
          height={12}
        />
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <ThemedText type="default">Score: {projectHealth?.score}%</ThemedText>
          <ThemedText type="default">Last Updated: {formatDate(progressData?.lastUpdated)}</ThemedText>
        </View>
      </Card>

      {/* Quick Stats */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
        <Card variant="filled" style={{ width: (SCREEN_WIDTH - 48) / 2, margin: 4 }}>
          <ThemedText type="subtitle">Progress</ThemedText>
          <ThemedText type="title">{progressData?.overallProgress || 0}%</ThemedText>
        </Card>
        
        <Card variant="filled" style={{ width: (SCREEN_WIDTH - 48) / 2, margin: 4 }}>
          <ThemedText type="subtitle">Budget Used</ThemedText>
          <ThemedText type="title">{budgetAnalysis?.utilizationRate?.toFixed(1) || 0}%</ThemedText>
        </Card>
        
        <Card variant="filled" style={{ width: (SCREEN_WIDTH - 48) / 2, margin: 4 }}>
          <ThemedText type="subtitle">Milestones</ThemedText>
          <ThemedText type="title">
            {progressStats.completedMilestones}/{progressStats.totalMilestones}
          </ThemedText>
        </Card>
        
        <Card variant="filled" style={{ width: (SCREEN_WIDTH - 48) / 2, margin: 4 }}>
          <ThemedText type="subtitle">Active Workers</ThemedText>
          <ThemedText type="title">{progressStats.activeWorkers}</ThemedText>
        </Card>
      </View>

      {/* Progress Chart */}
      <Card variant="elevated" style={{ marginBottom: 16 }}>
        <ThemedText type="title" style={{ marginBottom: 16 }}>Progress Trend</ThemedText>
        <ProgressChart 
          data={progressData?.historicalProgress || []}
          height={200}
        />
      </Card>
    </Animated.View>
  ), [projectHealth, progressData, budgetAnalysis, progressStats, fadeAnim]);

  const renderTimelineSection = useCallback(() => (
    <Card variant="elevated">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText type="title">Project Timeline</ThemedText>
        <Badge 
          variant={progressData?.timelineAdherence >= 80 ? 'success' : progressData?.timelineAdherence >= 60 ? 'warning' : 'error'}
          text={`${progressData?.timelineAdherence || 0}% On Time`}
        />
      </View>
      
      <ProjectTimeline
        milestones={milestones}
        onMilestoneUpdate={userPermissions.canUpdateProgress ? handleMilestoneUpdate : undefined}
        startDate={project?.startDate}
        endDate={project?.endDate}
      />
    </Card>
  ), [milestones, progressData, project, userPermissions, handleMilestoneUpdate]);

  const renderBudgetSection = useCallback(() => (
    <Card variant="elevated">
      <ThemedText type="title" style={{ marginBottom: 16 }}>Budget Tracking</ThemedText>
      
      <BudgetTracker
        budget={budget}
        analysis={budgetAnalysis}
        onBudgetUpdate={userPermissions.canManageBudget ? updateBudget : undefined}
        currency="ETB"
      />
      
      {budgetAnalysis?.projectedOverspend > 0 && (
        <View style={{ 
          backgroundColor: '#FFECEC', 
          padding: 12, 
          borderRadius: 8, 
          marginTop: 16,
          borderLeftWidth: 4,
          borderLeftColor: '#FF3B30',
        }}>
          <ThemedText type="default" style={{ color: '#FF3B30', fontWeight: '600' }}>
            Budget Alert: Projected overspend of {formatCurrency(budgetAnalysis.projectedOverspend)}
          </ThemedText>
        </View>
      )}
    </Card>
  ), [budget, budgetAnalysis, userPermissions, updateBudget]);

  const renderWorkersSection = useCallback(() => (
    <Card variant="elevated">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText type="title">Team Management</ThemedText>
        {userPermissions.canAssignWorkers && (
          <Button
            title="Assign Workers"
            icon="person-add"
            onPress={() => setShowWorkerModal(true)}
            variant="outline"
            size="small"
          />
        )}
      </View>
      
      <WorkerAssignment
        workers={workers}
        onWorkerAssign={userPermissions.canAssignWorkers ? handleWorkerAssignment : undefined}
        projectRequirements={project?.requirements}
      />
    </Card>
  ), [workers, project, userPermissions, handleWorkerAssignment]);

  const renderRisksSection = useCallback(() => (
    <Card variant="elevated">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText type="title">Risk Management</ThemedText>
        {userPermissions.canManageRisks && (
          <Button
            title="Add Risk"
            icon="warning"
            onPress={() => setShowRiskModal(true)}
            variant="outline"
            size="small"
          />
        )}
      </View>
      
      <RiskIndicator
        risks={risks}
        onRiskResolve={userPermissions.canManageRisks ? handleRiskResolve : undefined}
        showResolved={expandedSection === 'risks'}
      />
    </Card>
  ), [risks, userPermissions, handleRiskResolve, expandedSection]);

  if (loading && !project) {
    return <Loading message="Loading project progress..." />;
  }

  if (!project) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText type="title">Project Not Found</ThemedText>
        <Button
          title="Back to Projects"
          onPress={() => router.back()}
          variant="primary"
          style={{ marginTop: 16 }}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Project Header */}
        <Card variant="elevated" style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{project.name}</ThemedText>
              <ThemedText type="default" style={{ marginTop: 4, opacity: 0.7 }}>
                {project.description}
              </ThemedText>
            </View>
            
            {userPermissions.canGenerateReports && (
              <Button
                title="Report"
                icon="document"
                onPress={() => setShowReportModal(true)}
                variant="outline"
                size="small"
              />
            )}
          </View>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
            <Badge variant="info" text={project.status} style={{ marginRight: 8, marginBottom: 8 }} />
            <Badge variant="outline" text={project.priority} style={{ marginRight: 8, marginBottom: 8 }} />
            <Badge variant="outline" text={project.type} style={{ marginRight: 8, marginBottom: 8 }} />
          </View>
        </Card>

        {/* Navigation Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          {['overview', 'timeline', 'budget', 'workers', 'risks'].map(tab => (
            <Button
              key={tab}
              title={tab.charAt(0).toUpperCase() + tab.slice(1)}
              onPress={() => setSelectedTab(tab)}
              variant={selectedTab === tab ? 'primary' : 'outline'}
              style={{ marginRight: 8 }}
              size="small"
            />
          ))}
        </ScrollView>

        {/* Selected Tab Content */}
        {selectedTab === 'overview' && renderOverviewSection()}
        {selectedTab === 'timeline' && renderTimelineSection()}
        {selectedTab === 'budget' && renderBudgetSection()}
        {selectedTab === 'workers' && renderWorkersSection()}
        {selectedTab === 'risks' && renderRisksSection()}

        {/* Action Buttons */}
        {userPermissions.canUpdateProgress && (
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <Button
              title="Update Progress"
              icon="refresh"
              onPress={() => handleProgressUpdate({ 
                progress: progressData.overallProgress + 5,
                updatedAt: new Date().toISOString()
              })}
              variant="primary"
              style={{ flex: 1, marginRight: 8 }}
            />
          </View>
        )}
      </ScrollView>

      {/* Worker Assignment Modal */}
      <Modal
        visible={showWorkerModal}
        onClose={() => setShowWorkerModal(false)}
        title="Assign Workers"
        size="large"
      >
        <WorkerAssignment
          workers={workers}
          onWorkerAssign={handleWorkerAssignment}
          projectRequirements={project.requirements}
          mode="assignment"
        />
      </Modal>

      {/* Risk Management Modal */}
      <Modal
        visible={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        title="Add Project Risk"
      >
        {/* Risk form would be implemented here */}
        <ThemedText>Risk management form component</ThemedText>
      </Modal>

      {/* Report Generation Modal */}
      <Modal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Generate Progress Report"
      >
        <View style={{ gap: 12 }}>
          {['Weekly', 'Monthly', 'Quarterly', 'Comprehensive'].map(reportType => (
            <Button
              key={reportType}
              title={`${reportType} Report`}
              onPress={() => handleReportGenerate(reportType.toLowerCase())}
              variant="outline"
            />
          ))}
        </View>
      </Modal>
    </ThemedView>
  );
};

export default GovernmentProjectProgress;