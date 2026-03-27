import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Context & Hooks
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useProject } from '../../../contexts/construction-context';
import { useProjectProgress } from '../../../hooks/use-project-progress';

// Services
import { projectService } from '../../../services/project-service';
import { analyticsService } from '../../../services/analytics-service';
import { notificationService } from '../../../services/notification-service';

// Components
import { ProgressTimeline } from '../../../components/construction/project-timeline';
import { ProgressChart } from '../../../components/construction/progress-chart';
import { MilestoneCard } from '../../../components/construction/milestone-card';
import { WorkerAssignment } from '../../../components/construction/worker-assignment';
import { BudgetTracker } from '../../../components/construction/budget-tracker';
import { RiskIndicator } from '../../../components/construction/risk-indicator';
import { Loading } from '../../../components/ui/loading';
import { AccessDenied } from '../../../components/ui/access-denied';
import { EmptyState } from '../../../components/ui/empty-state';
import { TabView } from '../../../components/ui/tabview';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

// Constants
import { PROJECT_STATUS, MILESTONE_STATUS, USER_ROLES } from '../../../constants/construction';
import { NAVIGATION_ROUTES } from '../../../constants/navigation';

// Utils
import { calculateProjectHealth, formatEthiopianDate } from '../../../utils/project-calculations';

/**
 * Project Progress Screen - Comprehensive progress tracking for construction projects
 * Real-time monitoring, milestone tracking, budget analysis, and risk assessment
 */
const ProjectProgressScreen = () => {
  const { projectId } = useLocalSearchParams();
  const router = useRouter();
  const { width: screenWidth } = Dimensions.get('window');

  // Context hooks
  const { user, isAuthenticated, hasRole } = useAuth();
  const { theme, isDark } = useTheme();
  const { currentProject, refreshProject } = useProject();

  // Custom hooks
  const {
    progressData,
    milestones,
    timeline,
    budgetStatus,
    risks,
    isLoading: progressLoading,
    refreshProgress,
    updateMilestone,
    addProgressUpdate
  } = useProjectProgress(projectId);

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  // Refs
  const scrollViewRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const analyticsRef = useRef(null);

  const styles = createStyles(theme, screenWidth);
  const canManageProject = hasRole([USER_ROLES.GOVERNMENT, USER_ROLES.ADMIN]) || 
    currentProject?.projectManagerId === user.id;

  /**
   * Load project progress data with comprehensive error handling
   */
  const loadProgressData = useCallback(async (showRefresh = false) => {
    if (!projectId || !isAuthenticated) {
      setError('Authentication or project ID missing');
      return;
    }

    try {
      if (showRefresh) {
        setIsRefreshing(true);
      }
      setError(null);

      // Validate project access
      const hasAccess = await projectService.validateProjectAccess(projectId, user.id);
      if (!hasAccess) {
        setError('access_denied');
        return;
      }

      // Refresh project and progress data in parallel
      await Promise.all([
        refreshProject(),
        refreshProgress()
      ]);

      // Track progress view analytics
      analyticsRef.current = await analyticsService.trackProjectProgressView({
        projectId,
        userId: user.id,
        userRole: user.role,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Failed to load progress data:', err);
      setError(err.message || 'Failed to load project progress');
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId, user?.id, isAuthenticated, refreshProject, refreshProgress]);

  /**
   * Handle milestone status update
   */
  const handleMilestoneUpdate = async (milestoneId, updates) => {
    if (!canManageProject) {
      Alert.alert('Permission Denied', 'You do not have permission to update milestones');
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      const previousStatus = milestones.find(m => m.id === milestoneId)?.status;
      
      // Update milestone via service
      await updateMilestone(milestoneId, updates);

      // Send notifications if status changed significantly
      if (updates.status && updates.status !== previousStatus) {
        await handleMilestoneNotification(milestoneId, updates.status, previousStatus);
      }

      // Track milestone update analytics
      await analyticsService.trackMilestoneUpdate({
        projectId,
        milestoneId,
        userId: user.id,
        previousStatus,
        newStatus: updates.status,
        updates
      });

    } catch (err) {
      console.error('Failed to update milestone:', err);
      setError(err.message || 'Failed to update milestone');
      Alert.alert('Update Failed', 'Please try again');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle milestone status change notifications
   */
  const handleMilestoneNotification = async (milestoneId, newStatus, previousStatus) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    const notificationData = {
      projectId,
      milestoneId,
      milestoneName: milestone.name,
      previousStatus,
      newStatus,
      updatedBy: user.name,
      timestamp: new Date().toISOString()
    };

    try {
      await notificationService.sendMilestoneUpdate(notificationData);
    } catch (err) {
      console.error('Failed to send milestone notification:', err);
    }
  };

  /**
   * Add progress update with photos and comments
   */
  const handleProgressUpdate = async (updateData) => {
    try {
      setIsUpdating(true);

      const progressUpdate = {
        ...updateData,
        projectId,
        reportedBy: user.id,
        timestamp: new Date().toISOString(),
        metadata: {
          deviceInfo: Platform.OS,
          location: updateData.location,
          offline: updateData.offline || false
        }
      };

      await addProgressUpdate(progressUpdate);

      // Track progress update analytics
      await analyticsService.trackProgressUpdate({
        projectId,
        updateId: progressUpdate.id,
        userId: user.id,
        hasPhotos: !!(updateData.photos && updateData.photos.length > 0),
        updateType: updateData.type
      });

      Alert.alert('Success', 'Progress update added successfully');

    } catch (err) {
      console.error('Failed to add progress update:', err);
      setError(err.message || 'Failed to add progress update');
      Alert.alert('Update Failed', 'Please try again');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Calculate project health score
   */
  const calculateHealthScore = useCallback(() => {
    if (!progressData || !milestones || !budgetStatus) return 0;

    return calculateProjectHealth({
      progress: progressData.overallProgress,
      budget: budgetStatus.percentageUsed,
      timeline: progressData.daysBehindSchedule,
      milestones: milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length,
      risks: risks.length
    });
  }, [progressData, milestones, budgetStatus, risks]);

  /**
   * Handle risk item actions
   */
  const handleRiskAction = async (risk, action) => {
    try {
      switch (action) {
        case 'view':
          setSelectedMilestone(risk.relatedMilestone);
          break;
        
        case 'mitigate':
          await handleRiskMitigation(risk);
          break;
        
        case 'dismiss':
          await handleRiskDismissal(risk);
          break;
        
        default:
          console.warn('Unknown risk action:', action);
      }
    } catch (err) {
      console.error('Risk action failed:', err);
      Alert.alert('Action Failed', err.message || 'Please try again');
    }
  };

  /**
   * Handle risk mitigation
   */
  const handleRiskMitigation = async (risk) => {
    Alert.alert(
      'Mitigate Risk',
      `How would you like to mitigate "${risk.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add to Issues', 
          onPress: () => router.push({
            pathname: NAVIGATION_ROUTES.PROJECT_ISSUES,
            params: { projectId, riskId: risk.id }
          })
        },
        { 
          text: 'Adjust Timeline', 
          onPress: () => handleTimelineAdjustment(risk)
        },
        { 
          text: 'Allocate Resources', 
          onPress: () => handleResourceAllocation(risk)
        },
      ]
    );
  };

  /**
   * Handle risk dismissal
   */
  const handleRiskDismissal = async (risk) => {
    Alert.alert(
      'Dismiss Risk',
      `Are you sure you want to dismiss "${risk.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Dismiss', 
          style: 'destructive',
          onPress: async () => {
            // Implement risk dismissal logic
            console.log('Dismissing risk:', risk.id);
          }
        },
      ]
    );
  };

  /**
   * Handle timeline adjustment for risk mitigation
   */
  const handleTimelineAdjustment = (risk) => {
    // Implement timeline adjustment logic
    console.log('Adjusting timeline for risk:', risk.id);
  };

  /**
   * Handle resource allocation for risk mitigation
   */
  const handleResourceAllocation = (risk) => {
    // Implement resource allocation logic
    console.log('Allocating resources for risk:', risk.id);
  };

  /**
   * Export progress report
   */
  const handleExportReport = async () => {
    try {
      const reportData = {
        project: currentProject,
        progress: progressData,
        milestones,
        budget: budgetStatus,
        risks,
        generatedBy: user.name,
        generatedAt: new Date().toISOString(),
        healthScore: calculateHealthScore()
      };

      await projectService.exportProgressReport(projectId, reportData);
      Alert.alert('Success', 'Progress report exported successfully');

    } catch (err) {
      console.error('Export failed:', err);
      Alert.alert('Export Failed', 'Failed to export progress report');
    }
  };

  /**
   * Share progress update
   */
  const handleShareProgress = async () => {
    const shareData = {
      projectName: currentProject?.name,
      progress: progressData?.overallProgress || 0,
      healthScore: calculateHealthScore(),
      nextMilestone: milestones?.find(m => m.status === MILESTONE_STATUS.UPCOMING)?.name
    };

    // Implement sharing logic (email, messaging, etc.)
    Alert.alert('Share Progress', 'Sharing functionality to be implemented');
  };

  // Tab configuration
  const tabs = [
    { key: 'overview', title: 'Overview', icon: 'dashboard' },
    { key: 'timeline', title: 'Timeline', icon: 'timeline' },
    { key: 'milestones', title: 'Milestones', icon: 'flag' },
    { key: 'budget', title: 'Budget', icon: 'attach-money' },
    { key: 'risks', title: 'Risks', icon: 'warning' },
  ];

  // Effects
  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (analyticsRef.current) {
        analyticsService.cleanup(analyticsRef.current);
      }
    };
  }, []);

  // Render loading state
  if (progressLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading project progress..." />
      </SafeAreaView>
    );
  }

  // Render access denied
  if (error === 'access_denied') {
    return (
      <SafeAreaView style={styles.container}>
        <AccessDenied 
          message="You don't have access to this project's progress"
          onBack={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && error !== 'access_denied') {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="error"
          title="Unable to Load Progress"
          message={error}
          action={{
            label: 'Try Again',
            onPress: () => loadProgressData()
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Project Info */}
      <View style={styles.header}>
        <View style={styles.projectInfo}>
          <Badge 
            status={currentProject?.status} 
            style={styles.statusBadge}
          />
          <View style={styles.projectText}>
            <Text style={styles.projectName} numberOfLines={1}>
              {currentProject?.name}
            </Text>
            <Text style={styles.projectLocation}>
              {currentProject?.location}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <FloatingActionButton
            icon="share"
            onPress={handleShareProgress}
            variant="outlined"
            size="small"
          />
          <FloatingActionButton
            icon="download"
            onPress={handleExportReport}
            variant="outlined"
            size="small"
          />
        </View>
      </View>

      {/* Tab Navigation */}
      <TabView
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabView}
      />

      {/* Content based on active tab */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProgressData(true)}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <OverviewTab
            progressData={progressData}
            milestones={milestones}
            budgetStatus={budgetStatus}
            risks={risks}
            healthScore={calculateHealthScore()}
            onMilestonePress={setSelectedMilestone}
            theme={theme}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab
            timeline={timeline}
            progressData={progressData}
            onProgressUpdate={handleProgressUpdate}
            canManageProject={canManageProject}
            theme={theme}
          />
        )}

        {activeTab === 'milestones' && (
          <MilestonesTab
            milestones={milestones}
            onMilestoneUpdate={handleMilestoneUpdate}
            canManageProject={canManageProject}
            selectedMilestone={selectedMilestone}
            onMilestoneSelect={setSelectedMilestone}
            theme={theme}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTab
            budgetStatus={budgetStatus}
            progressData={progressData}
            theme={theme}
          />
        )}

        {activeTab === 'risks' && (
          <RisksTab
            risks={risks}
            onRiskAction={handleRiskAction}
            theme={theme}
          />
        )}
      </ScrollView>

      {/* Worker Assignment Modal */}
      {canManageProject && activeTab === 'timeline' && (
        <WorkerAssignment
          projectId={projectId}
          visible={false} // Controlled by specific user action
          onClose={() => {}}
          onAssignmentComplete={refreshProgress}
        />
      )}
    </SafeAreaView>
  );
};

/**
 * Overview Tab Component
 */
const OverviewTab = ({ 
  progressData, 
  milestones, 
  budgetStatus, 
  risks, 
  healthScore, 
  onMilestonePress,
  theme 
}) => {
  const styles = createOverviewStyles(theme);

  return (
    <View style={styles.container}>
      {/* Health Score & Progress */}
      <Card style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthTitle}>Project Health</Text>
          <Badge 
            text={`${healthScore}%`}
            variant={healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'error'}
          />
        </View>
        <ProgressChart
          progress={progressData?.overallProgress || 0}
          expectedProgress={progressData?.expectedProgress || 0}
          theme={theme}
        />
      </Card>

      {/* Key Metrics */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {milestones?.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length || 0}
          </Text>
          <Text style={styles.metricLabel}>Completed Milestones</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {budgetStatus?.percentageUsed || 0}%
          </Text>
          <Text style={styles.metricLabel}>Budget Used</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {risks?.length || 0}
          </Text>
          <Text style={styles.metricLabel}>Active Risks</Text>
        </Card>
      </View>

      {/* Recent Milestones */}
      <Card style={styles.milestonesCard}>
        <Text style={styles.sectionTitle}>Recent Milestones</Text>
        {milestones?.slice(0, 3).map(milestone => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            onPress={() => onMilestonePress(milestone)}
            compact={true}
            theme={theme}
          />
        ))}
      </Card>
    </View>
  );
};

/**
 * Timeline Tab Component
 */
const TimelineTab = ({ 
  timeline, 
  progressData, 
  onProgressUpdate, 
  canManageProject,
  theme 
}) => {
  const styles = createTimelineStyles(theme);

  return (
    <View style={styles.container}>
      <ProgressTimeline
        timeline={timeline}
        currentProgress={progressData?.overallProgress || 0}
        onProgressUpdate={onProgressUpdate}
        canManageProject={canManageProject}
        theme={theme}
      />
    </View>
  );
};

/**
 * Milestones Tab Component
 */
const MilestonesTab = ({ 
  milestones, 
  onMilestoneUpdate, 
  canManageProject,
  selectedMilestone,
  onMilestoneSelect,
  theme 
}) => {
  const styles = createMilestonesStyles(theme);

  return (
    <View style={styles.container}>
      {milestones?.map(milestone => (
        <MilestoneCard
          key={milestone.id}
          milestone={milestone}
          onUpdate={onMilestoneUpdate}
          onPress={() => onMilestoneSelect(milestone)}
          canManage={canManageProject}
          theme={theme}
        />
      ))}
    </View>
  );
};

/**
 * Budget Tab Component
 */
const BudgetTab = ({ budgetStatus, progressData, theme }) => {
  const styles = createBudgetStyles(theme);

  return (
    <View style={styles.container}>
      <BudgetTracker
        budget={budgetStatus}
        progress={progressData}
        theme={theme}
      />
    </View>
  );
};

/**
 * Risks Tab Component
 */
const RisksTab = ({ risks, onRiskAction, theme }) => {
  const styles = createRisksStyles(theme);

  return (
    <View style={styles.container}>
      {risks?.map(risk => (
        <RiskIndicator
          key={risk.id}
          risk={risk}
          onAction={onRiskAction}
          theme={theme}
        />
      ))}
    </View>
  );
};

/**
 * Create dynamic styles based on theme
 */
const createStyles = (theme, screenWidth) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusBadge: {
    marginRight: 12,
  },
  projectText: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  projectLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tabView: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  content: {
    flex: 1,
  },
});

// Additional style creators for each tab...
const createOverviewStyles = (theme) => StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  healthCard: {
    padding: 16,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  milestonesCard: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
});

const createTimelineStyles = (theme) => StyleSheet.create({
  container: {
    padding: 16,
  },
});

const createMilestonesStyles = (theme) => StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
});

const createBudgetStyles = (theme) => StyleSheet.create({
  container: {
    padding: 16,
  },
});

const createRisksStyles = (theme) => StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
});

export default ProjectProgressScreen;