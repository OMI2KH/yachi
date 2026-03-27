import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { ImageViewer } from '../../components/ui/image-viewer';
import { ProjectTimeline } from '../../components/construction/project-timeline';
import { WorkerAssignment } from '../../components/construction/worker-assignment';
import { ConfirmationModal } from '../../components/ui/confirmation-modal';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useAIAssignment } from '../../hooks/use-ai-assignment';
import { governmentService } from '../../services/government-service';
import { constructionService } from '../../services/construction-service';
import { notificationService } from '../../services/notification-service';
import { analyticsService } from '../../services/analytics-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { governmentConstants } from '../../constants/government';

/**
 * Government Project Detail Screen
 * 
 * Comprehensive view of government construction project with
 * real-time progress tracking, workforce management, and analytics
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters containing projectId
 */
export const GovernmentProjectDetailScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user } = useAuth();
  const { matchWorkersToProject } = useAIAssignment();

  const { projectId } = route.params;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal states
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Data states
  const [projectWorkers, setProjectWorkers] = useState([]);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [projectProgress, setProjectProgress] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  const [projectDocuments, setProjectDocuments] = useState([]);

  /**
   * Fetch complete project data
   */
  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        projectData,
        workersData,
        progressData,
        financialData,
        documentsData
      ] = await Promise.all([
        governmentService.getProjectById(projectId),
        governmentService.getProjectWorkers(projectId),
        constructionService.getProjectProgress(projectId),
        governmentService.getProjectFinancials(projectId),
        governmentService.getProjectDocuments(projectId),
      ]);

      if (projectData) {
        setProject(projectData);
        setProjectWorkers(workersData || []);
        setProjectProgress(progressData || []);
        setFinancialData(financialData);
        setProjectDocuments(documentsData || []);
        
        // Track project view for analytics
        analyticsService.trackProjectView(projectId, user.id);
      } else {
        throw new Error('Project not found');
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
      Alert.alert('Error', 'Unable to load project details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, user.id]);

  /**
   * Refresh project data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjectData();
  }, [fetchProjectData]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  /**
   * Handle project status updates
   */
  const handleStatusUpdate = async (newStatus, reason = '') => {
    try {
      setIsUpdating(true);
      
      const result = await governmentService.updateProjectStatus(
        projectId,
        newStatus,
        user.id,
        reason
      );

      if (result.success) {
        setProject(prev => ({ ...prev, status: newStatus }));
        
        // Send notifications based on status change
        await handleStatusChangeNotifications(newStatus, reason);
        
        Alert.alert('Success', `Project status updated to ${formatters.formatProjectStatus(newStatus)}`);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Status update failed:', error);
      Alert.alert('Update Failed', error.message || 'Unable to update project status.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Send notifications for status changes
   */
  const handleStatusChangeNotifications = async (newStatus, reason) => {
    const notificationConfig = {
      approved: {
        title: 'Project Approved',
        message: `Your project "${project.title}" has been approved and is ready to start.`,
        type: 'success'
      },
      in_progress: {
        title: 'Project Started',
        message: `Work has begun on project "${project.title}".`,
        type: 'info'
      },
      paused: {
        title: 'Project Paused',
        message: `Project "${project.title}" has been paused: ${reason}`,
        type: 'warning'
      },
      completed: {
        title: 'Project Completed',
        message: `Congratulations! Project "${project.title}" has been completed successfully.`,
        type: 'success'
      },
      cancelled: {
        title: 'Project Cancelled',
        message: `Project "${project.title}" has been cancelled: ${reason}`,
        type: 'error'
      }
    };

    const config = notificationConfig[newStatus];
    if (config) {
      await notificationService.sendBulkNotification(
        projectWorkers.map(worker => worker.userId),
        config.title,
        config.message,
        { projectId, type: 'project_status_update' }
      );
    }
  };

  /**
   * Find replacement workers using AI
   */
  const handleFindReplacements = async (workerType, count = 1) => {
    try {
      const replacements = await matchWorkersToProject({
        projectType: project.projectType,
        location: project.location,
        requirements: { [workerType]: count },
        budget: financialData?.remainingBudget,
        skillLevel: project.skillMatchingLevel,
        excludeWorkers: projectWorkers.map(w => w.userId),
      });

      setAvailableWorkers(replacements);
      setShowWorkerModal(true);
      
      return replacements;
    } catch (error) {
      console.error('Replacement search failed:', error);
      Alert.alert('Search Error', 'Unable to find replacement workers.');
      return [];
    }
  };

  /**
   * Assign workers to project
   */
  const handleAssignWorkers = async (workers) => {
    try {
      setIsUpdating(true);
      
      const result = await governmentService.assignWorkersToProject(
        projectId,
        workers,
        true // auto-replacement enabled
      );

      if (result.success) {
        setProjectWorkers(prev => [...prev, ...workers]);
        setShowWorkerModal(false);
        
        // Send assignment notifications
        await notificationService.sendProjectAssignments(
          workers,
          projectId,
          project.title
        );
        
        Alert.alert('Success', `${workers.length} workers assigned to project.`);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Worker assignment failed:', error);
      Alert.alert('Assignment Failed', error.message || 'Unable to assign workers.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Remove worker from project
   */
  const handleRemoveWorker = async (workerId, reason) => {
    try {
      const result = await governmentService.removeWorkerFromProject(
        projectId,
        workerId,
        user.id,
        reason
      );

      if (result.success) {
        setProjectWorkers(prev => prev.filter(w => w.userId !== workerId));
        
        // Find replacement if auto-replacement is enabled
        if (project.autoReplacement) {
          const worker = projectWorkers.find(w => w.userId === workerId);
          await handleFindReplacements(worker.role, 1);
        }
        
        Alert.alert('Success', 'Worker removed from project.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Worker removal failed:', error);
      Alert.alert('Removal Failed', error.message || 'Unable to remove worker.');
    }
  };

  /**
   * Update project budget
   */
  const handleBudgetUpdate = async (updates) => {
    try {
      const result = await governmentService.updateProjectBudget(
        projectId,
        updates,
        user.id
      );

      if (result.success) {
        setFinancialData(prev => ({ ...prev, ...updates }));
        setShowBudgetModal(false);
        Alert.alert('Success', 'Budget updated successfully.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Budget update failed:', error);
      Alert.alert('Update Failed', error.message || 'Unable to update budget.');
    }
  };

  /**
   * Generate project report
   */
  const handleGenerateReport = async (reportType) => {
    try {
      const report = await governmentService.generateProjectReport(
        projectId,
        reportType,
        user.id
      );

      if (report?.url) {
        // Open report in browser or download
        await Linking.openURL(report.url);
      } else {
        Alert.alert('Report Generated', `${reportType} report has been generated.`);
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      Alert.alert('Report Error', 'Unable to generate report.');
    }
  };

  /**
   * Get status color for badges
   */
  const getStatusColor = (status) => {
    const statusColors = {
      draft: colors.info,
      pending_approval: colors.warning,
      approved: colors.success,
      in_progress: colors.primary,
      paused: colors.warning,
      completed: colors.success,
      cancelled: colors.error,
    };
    
    return statusColors[status] || colors.default;
  };

  /**
   * Check if user has permission for actions
   */
  const hasPermission = (action) => {
    const permissions = governmentConstants.USER_PERMISSIONS[user.role] || [];
    return permissions.includes(action);
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading project details..." />
      </ThemedView>
    );
  }

  if (!project) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="title">Project Not Found</ThemedText>
        <ThemedText type="default" style={styles.errorText}>
          The requested project could not be loaded.
        </ThemedText>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="primary"
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Project Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.titleSection}>
              <ThemedText type="title" style={styles.projectTitle}>
                {project.title}
              </ThemedText>
              <Badge
                text={formatters.formatProjectStatus(project.status)}
                color={getStatusColor(project.status)}
                size="medium"
              />
            </View>
            
            <ThemedText type="default" style={styles.projectCode}>
              {project.projectCode}
            </ThemedText>
          </View>

          <ThemedText type="default" style={styles.projectDescription}>
            {project.description}
          </ThemedText>

          <View style={styles.projectMeta}>
            <View style={styles.metaItem}>
              <ThemedText type="defaultSemiBold">Type:</ThemedText>
              <ThemedText type="default">{project.projectType}</ThemedText>
            </View>
            <View style={styles.metaItem}>
              <ThemedText type="defaultSemiBold">Location:</ThemedText>
              <ThemedText type="default">{project.location?.region}</ThemedText>
            </View>
            <View style={styles.metaItem}>
              <ThemedText type="defaultSemiBold">Area:</ThemedText>
              <ThemedText type="default">
                {formatters.formatArea(project.totalArea)}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        {hasPermission('manage_project') && (
          <Card style={styles.actionsCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Quick Actions
            </ThemedText>
            
            <View style={styles.actionButtons}>
              <Button
                title="Manage Team"
                onPress={() => setShowWorkerModal(true)}
                variant="secondary"
                size="small"
                icon="users"
              />
              <Button
                title="Update Budget"
                onPress={() => setShowBudgetModal(true)}
                variant="secondary"
                size="small"
                icon="dollar-sign"
              />
              <Button
                title="Generate Report"
                onPress={() => handleGenerateReport('comprehensive')}
                variant="secondary"
                size="small"
                icon="file-text"
              />
            </View>
          </Card>
        )}

        {/* Project Timeline */}
        <Card style={styles.timelineCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Project Timeline
          </ThemedText>
          
          <ProjectTimeline
            progress={projectProgress}
            startDate={project.startDate}
            estimatedEndDate={project.estimatedEndDate}
            status={project.status}
            onMilestoneUpdate={(milestoneId, status) => {
              // Handle milestone updates
            }}
          />
        </Card>

        {/* Workforce Management */}
        <Card style={styles.workforceCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Workforce ({projectWorkers.length})
            </ThemedText>
            
            {hasPermission('manage_workers') && (
              <Button
                title="Add Workers"
                onPress={() => handleFindReplacements('general', 5)}
                variant="primary"
                size="small"
                icon="user-plus"
              />
            )}
          </View>

          <View style={styles.workerStats}>
            {Object.entries(project.requiredWorkers || {}).map(([role, count]) => (
              <View key={role} style={styles.workerStat}>
                <ThemedText type="defaultSemiBold" style={styles.workerRole}>
                  {formatters.capitalizeFirst(role)}
                </ThemedText>
                <ThemedText type="default">
                  {projectWorkers.filter(w => w.role === role).length} / {count}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Worker list would go here */}
        </Card>

        {/* Financial Overview */}
        {financialData && (
          <Card style={styles.financeCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Financial Overview
            </ThemedText>
            
            <View style={styles.financeGrid}>
              <View style={styles.financeItem}>
                <ThemedText type="default">Total Budget:</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {formatters.formatCurrency(financialData.totalBudget, 'ETB')}
                </ThemedText>
              </View>
              <View style={styles.financeItem}>
                <ThemedText type="default">Spent:</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {formatters.formatCurrency(financialData.amountSpent, 'ETB')}
                </ThemedText>
              </View>
              <View style={styles.financeItem}>
                <ThemedText type="default">Remaining:</ThemedText>
                <ThemedText type="defaultSemiBold" style={{
                  color: financialData.remainingBudget > 0 ? colors.success : colors.error
                }}>
                  {formatters.formatCurrency(financialData.remainingBudget, 'ETB')}
                </ThemedText>
              </View>
              <View style={styles.financeItem}>
                <ThemedText type="default">Utilization:</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {((financialData.amountSpent / financialData.totalBudget) * 100).toFixed(1)}%
                </ThemedText>
              </View>
            </View>
          </Card>
        )}

        {/* Status Management */}
        {hasPermission('change_project_status') && (
          <Card style={styles.statusCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Project Status Management
            </ThemedText>
            
            <View style={styles.statusButtons}>
              {governmentConstants.PROJECT_STATUS_FLOW[project.status]?.map(status => (
                <Button
                  key={status}
                  title={formatters.formatProjectStatus(status)}
                  onPress={() => {
                    setPendingAction(() => () => handleStatusUpdate(status));
                    setShowConfirmModal(true);
                  }}
                  variant="outline"
                  size="small"
                  disabled={isUpdating}
                />
              ))}
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Worker Assignment Modal */}
      <Modal
        visible={showWorkerModal}
        onClose={() => setShowWorkerModal(false)}
        title="Manage Project Team"
        size="large"
      >
        <WorkerAssignment
          workers={availableWorkers}
          currentWorkers={projectWorkers}
          project={project}
          onAssign={handleAssignWorkers}
          onRemove={handleRemoveWorker}
          onFindReplacements={handleFindReplacements}
        />
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        onConfirm={() => {
          pendingAction?.();
          setShowConfirmModal(false);
        }}
        onCancel={() => setShowConfirmModal(false)}
        title="Confirm Action"
        message="Are you sure you want to perform this action?"
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    gap: 8,
  },
  projectTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  projectCode: {
    opacity: 0.6,
    fontSize: 14,
  },
  projectDescription: {
    lineHeight: 20,
    opacity: 0.8,
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    gap: 4,
  },
  actionsCard: {
    margin: 16,
    marginVertical: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  timelineCard: {
    margin: 16,
    marginVertical: 8,
    gap: 12,
  },
  workforceCard: {
    margin: 16,
    marginVertical: 8,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  workerStat: {
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  workerRole: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  financeCard: {
    margin: 16,
    marginVertical: 8,
    gap: 12,
  },
  financeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  financeItem: {
    flex: 1,
    minWidth: '45%',
    gap: 4,
  },
  statusCard: {
    margin: 16,
    marginVertical: 8,
    gap: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
});

export default GovernmentProjectDetailScreen;