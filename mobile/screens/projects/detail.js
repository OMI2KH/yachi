import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { 
  ThemedView, 
  ThemedText 
} from '../../../components/themed-view';
import { 
  Button 
} from '../../../components/ui/button';
import { 
  Card 
} from '../../../components/ui/card';
import { 
  Loading 
} from '../../../components/ui/loading';
import { 
  Badge 
} from '../../../components/ui/badge';
import { 
  Avatar 
} from '../../../components/ui/avatar';
import { 
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
import { 
  ProjectTimeline 
} from '../../../components/construction/project-timeline';
import { 
  WorkerAssignment 
} from '../../../components/construction/worker-assignment';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  projectService 
} from '../../../services/project-service';
import { 
  workerService 
} from '../../../services/worker-service';
import { 
  chatService 
} from '../../../services/chat-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Project Detail Screen
 * Features: AI team management, real-time progress tracking, document management, collaboration tools
 */
const ProjectDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  
  const projectId = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [projectStats, setProjectStats] = useState({
    progress: 0,
    budgetUtilization: 0,
    timelineAdherence: 0,
    qualityScore: 0,
  });
  const [aiInsights, setAiInsights] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ProjectDetail');
    }, [])
  );

  // Load project data
  const loadProjectData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const [
        projectData,
        teamData,
        milestonesData,
        documentsData,
        statsData,
        insightsData
      ] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectTeam(projectId),
        projectService.getProjectMilestones(projectId),
        projectService.getProjectDocuments(projectId),
        projectService.getProjectStats(projectId),
        projectService.getAIInsights(projectId)
      ]);
      
      setProject(projectData);
      setTeamMembers(teamData);
      setMilestones(milestonesData);
      setDocuments(documentsData);
      setProjectStats(statsData);
      setAiInsights(insightsData);
      
      analyticsService.trackEvent('project_detail_loaded', {
        userId: user?.id,
        projectId: projectId,
        projectType: projectData?.type,
        projectStatus: projectData?.status,
        teamSize: teamData.length,
        progress: statsData.progress,
      });
    } catch (error) {
      console.error('Error loading project data:', error);
      showError('Failed to load project information');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [projectId, user?.id]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        loadProjectData();
      }
    }, [projectId, loadProjectData])
  );

  // Handle project status update
  const handleStatusUpdate = async (newStatus) => {
    try {
      await projectService.updateProjectStatus(projectId, newStatus);
      
      // Refresh data
      await loadProjectData();
      
      analyticsService.trackEvent('project_status_updated', {
        userId: user?.id,
        projectId: projectId,
        previousStatus: project?.status,
        newStatus: newStatus,
      });
      
      showSuccess(`Project status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating project status:', error);
      showError('Failed to update project status');
    }
  };

  // Handle team management
  const handleTeamManagement = async (action, workerId = null) => {
    try {
      if (action === 'add') {
        router.push(`/projects/${projectId}/team/add`);
        return;
      }
      
      if (action === 'remove' && workerId) {
        await projectService.removeTeamMember(projectId, workerId);
        
        // Refresh data
        await loadProjectData();
        
        analyticsService.trackEvent('team_member_removed', {
          userId: user?.id,
          projectId: projectId,
          workerId: workerId,
        });
        
        showSuccess('Team member removed');
      }
      
      if (action === 'replace' && workerId) {
        // AI-powered worker replacement
        const replacement = await workerService.findReplacementWorker(projectId, workerId);
        
        if (replacement) {
          await projectService.replaceTeamMember(projectId, workerId, replacement.id);
          
          // Refresh data
          await loadProjectData();
          
          analyticsService.trackEvent('team_member_replaced', {
            userId: user?.id,
            projectId: projectId,
            originalWorkerId: workerId,
            replacementWorkerId: replacement.id,
          });
          
          showSuccess('Team member replaced using AI matching');
        } else {
          showError('No suitable replacement found');
        }
      }
    } catch (error) {
      console.error('Error managing team:', error);
      showError('Failed to manage team');
    }
  };

  // Handle milestone completion
  const handleMilestoneComplete = async (milestoneId) => {
    try {
      await projectService.completeMilestone(projectId, milestoneId);
      
      // Refresh data
      await loadProjectData();
      
      analyticsService.trackEvent('milestone_completed', {
        userId: user?.id,
        projectId: projectId,
        milestoneId: milestoneId,
      });
      
      showSuccess('Milestone marked as completed');
    } catch (error) {
      console.error('Error completing milestone:', error);
      showError('Failed to complete milestone');
    }
  };

  // Handle document action
  const handleDocumentAction = async (action, documentId) => {
    try {
      if (action === 'view') {
        const document = documents.find(doc => doc.id === documentId);
        if (document?.url) {
          await Linking.openURL(document.url);
        }
      } else if (action === 'download') {
        await projectService.downloadDocument(projectId, documentId);
        showSuccess('Document download started');
      } else if (action === 'share') {
        await projectService.shareDocument(projectId, documentId);
        showSuccess('Document shared successfully');
      }
      
      analyticsService.trackEvent('document_action', {
        userId: user?.id,
        projectId: projectId,
        documentId: documentId,
        action: action,
      });
    } catch (error) {
      console.error('Error handling document action:', error);
      showError('Failed to process document');
    }
  };

  // Handle project chat
  const handleStartChat = async () => {
    try {
      const chatId = await chatService.createProjectChat(projectId, teamMembers.map(member => member.id));
      
      analyticsService.trackEvent('project_chat_started', {
        userId: user?.id,
        projectId: projectId,
        chatId: chatId,
        participantCount: teamMembers.length + 1,
      });
      
      router.push(`/messages/${chatId}`);
    } catch (error) {
      console.error('Error starting project chat:', error);
      showError('Failed to start project chat');
    }
  };

  // Handle AI insight application
  const handleApplyInsight = async (insight) => {
    try {
      await projectService.applyAIInsight(projectId, insight.id);
      
      // Refresh data
      await loadProjectData();
      
      analyticsService.trackEvent('ai_insight_applied', {
        userId: user?.id,
        projectId: projectId,
        insightId: insight.id,
        insightType: insight.type,
        estimatedImpact: insight.estimatedImpact,
      });
      
      showSuccess('AI insight applied successfully');
    } catch (error) {
      console.error('Error applying AI insight:', error);
      showError('Failed to apply insight');
    }
  };

  // Handle project deletion
  const handleDeleteProject = async () => {
    try {
      await projectService.deleteProject(projectId);
      
      analyticsService.trackEvent('project_deleted', {
        userId: user?.id,
        projectId: projectId,
        projectType: project?.type,
        projectStatus: project?.status,
      });
      
      showSuccess('Project deleted successfully');
      router.back();
    } catch (error) {
      console.error('Error deleting project:', error);
      showError('Failed to delete project');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'planning': return '#eab308';
      case 'in_progress': return '#0ea5e9';
      case 'on_hold': return '#f97316';
      case 'completed': return '#22c55e';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Get project type icon
  const getProjectTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'new_construction': return '🏗️';
      case 'renovation': return '🔨';
      case 'government': return '🏛️';
      case 'infrastructure': return '🌉';
      case 'finishing': return '🎨';
      default: return '📋';
    }
  };

  // Render project header
  const renderProjectHeader = () => (
    <Card style={styles.headerCard}>
      <View style={styles.headerTop}>
        <View style={styles.projectType}>
          <ThemedText style={styles.typeIcon}>
            {getProjectTypeIcon(project?.type)}
          </ThemedText>
          <ThemedText style={styles.projectTypeText}>
            {project?.type?.replace('_', ' ')}
          </ThemedText>
        </View>
        
        <Badge 
          variant="filled"
          style={[styles.statusBadge, { backgroundColor: getStatusColor(project?.status) }]}
        >
          {project?.status?.replace('_', ' ')}
        </Badge>
      </View>
      
      <ThemedText style={styles.projectTitle}>
        {project?.title}
      </ThemedText>
      
      <ThemedText style={styles.projectDescription}>
        {project?.description}
      </ThemedText>
      
      <View style={styles.projectMeta}>
        <View style={styles.metaItem}>
          <ThemedText style={styles.metaLabel}>Location</ThemedText>
          <ThemedText style={styles.metaValue}>{project?.location}</ThemedText>
        </View>
        
        <View style={styles.metaItem}>
          <ThemedText style={styles.metaLabel}>Duration</ThemedText>
          <ThemedText style={styles.metaValue}>{project?.duration} days</ThemedText>
        </View>
        
        <View style={styles.metaItem}>
          <ThemedText style={styles.metaLabel}>Budget</ThemedText>
          <ThemedText style={styles.metaValue}>
            {project?.budget?.toLocaleString()} ETB
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  // Render progress overview
  const renderProgressOverview = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Progress Overview
      </ThemedText>
      
      <View style={styles.progressGrid}>
        <View style={styles.progressItem}>
          <ThemedText style={styles.progressValue}>
            {projectStats.progress}%
          </ThemedText>
          <ThemedText style={styles.progressLabel}>
            Overall Progress
          </ThemedText>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${projectStats.progress}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.progressItem}>
          <ThemedText style={styles.progressValue}>
            {projectStats.timelineAdherence}%
          </ThemedText>
          <ThemedText style={styles.progressLabel}>
            Timeline Adherence
          </ThemedText>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${projectStats.timelineAdherence}%`,
                  backgroundColor: 
                    projectStats.timelineAdherence > 90 ? '#22c55e' :
                    projectStats.timelineAdherence > 70 ? '#eab308' : '#ef4444'
                }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.progressItem}>
          <ThemedText style={styles.progressValue}>
            {projectStats.budgetUtilization}%
          </ThemedText>
          <ThemedText style={styles.progressLabel}>
            Budget Used
          </ThemedText>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${projectStats.budgetUtilization}%`,
                  backgroundColor: 
                    projectStats.budgetUtilization > ninetyPercent ? '#ef4444' :
                    projectStats.budgetUtilization > seventyPercent ? '#eab308' : '#22c55e'
                }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.progressItem}>
          <ThemedText style={styles.progressValue}>
            {projectStats.qualityScore}/10
          </ThemedText>
          <ThemedText style={styles.progressLabel}>
            Quality Score
          </ThemedText>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${projectStats.qualityScore * 10}%`,
                  backgroundColor: 
                    projectStats.qualityScore > 8 ? '#22c55e' :
                    projectStats.qualityScore > 6 ? '#eab308' : '#ef4444'
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </Card>
  );

  // Render team section
  const renderTeamSection = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Project Team ({teamMembers.length})
        </ThemedText>
        <Button
          variant="primary"
          onPress={() => setShowTeamModal(true)}
          size="small"
          leftIcon="add"
        >
          Manage Team
        </Button>
      </View>
      
      <WorkerAssignment
        workers={teamMembers}
        onWorkerAction={handleTeamManagement}
        projectId={projectId}
        style={styles.teamGrid}
      />
      
      {teamMembers.length === 0 && (
        <View style={styles.emptyTeam}>
          <ThemedText style={styles.emptyTeamText}>
            No team members assigned yet
          </ThemedText>
          <Button
            variant="outlined"
            onPress={() => handleTeamManagement('add')}
            size="small"
          >
            Build AI Team
          </Button>
        </View>
      )}
    </Card>
  );

  // Render timeline section
  const renderTimelineSection = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Project Timeline
        </ThemedText>
        <Button
          variant="outlined"
          onPress={() => router.push(`/projects/${projectId}/milestones`)}
          size="small"
        >
          View All
        </Button>
      </View>
      
      <ProjectTimeline
        milestones={milestones.slice(0, 5)}
        onMilestoneComplete={handleMilestoneComplete}
        style={styles.timeline}
      />
      
      {milestones.length === 0 && (
        <View style={styles.emptyTimeline}>
          <ThemedText style={styles.emptyTimelineText}>
            No milestones defined yet
          </ThemedText>
        </View>
      )}
    </Card>
  );

  // Render AI insights
  const renderAIInsights = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        AI Project Insights
      </ThemedText>
      
      {aiInsights.map((insight, index) => (
        <View key={insight.id} style={styles.insightItem}>
          <View style={styles.insightIcon}>
            <ThemedText>🤖</ThemedText>
          </View>
          
          <View style={styles.insightContent}>
            <ThemedText style={styles.insightTitle}>
              {insight.title}
            </ThemedText>
            <ThemedText style={styles.insightDescription}>
              {insight.description}
            </ThemedText>
            <ThemedText style={styles.insightImpact}>
              Impact: {insight.estimatedImpact}
            </ThemedText>
            <ThemedText style={styles.insightConfidence}>
              Confidence: {insight.confidence}%
            </ThemedText>
          </View>
          
          <Button
            variant="outlined"
            onPress={() => handleApplyInsight(insight)}
            size="small"
            style={styles.applyInsightButton}
          >
            Apply
          </Button>
        </View>
      ))}
      
      {aiInsights.length === 0 && (
        <View style={styles.emptyInsights}>
          <ThemedText style={styles.emptyInsightsText}>
            No AI insights available yet
          </ThemedText>
        </View>
      )}
    </Card>
  );

  // Render documents section
  const renderDocumentsSection = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Project Documents ({documents.length})
        </ThemedText>
        <Button
          variant="outlined"
          onPress={() => router.push(`/projects/${projectId}/documents`)}
          size="small"
          leftIcon="add"
        >
          Upload
        </Button>
      </View>
      
      {documents.slice(0, 5).map((document) => (
        <View key={document.id} style={styles.documentItem}>
          <View style={styles.documentInfo}>
            <ThemedText style={styles.documentName}>
              {document.name}
            </ThemedText>
            <ThemedText style={styles.documentMeta}>
              {document.type} • {new Date(document.uploadedAt).toLocaleDateString()}
            </ThemedText>
          </View>
          
          <View style={styles.documentActions}>
            <Button
              variant="ghost"
              onPress={() => handleDocumentAction('view', document.id)}
              size="small"
            >
              View
            </Button>
            <Button
              variant="ghost"
              onPress={() => handleDocumentAction('download', document.id)}
              size="small"
            >
              Download
            </Button>
          </View>
        </View>
      ))}
      
      {documents.length === 0 && (
        <View style={styles.emptyDocuments}>
          <ThemedText style={styles.emptyDocumentsText}>
            No documents uploaded yet
          </ThemedText>
        </View>
      )}
    </Card>
  );

  // Render action buttons
  const renderActionButtons = () => (
    <Card style={styles.actionsCard}>
      <View style={styles.actionButtons}>
        <Button
          variant="primary"
          onPress={handleStartChat}
          leftIcon="chat"
          style={styles.actionButton}
        >
          Project Chat
        </Button>
        
        <Button
          variant="outlined"
          onPress={() => router.push(`/projects/${projectId}/budget`)}
          leftIcon="budget"
          style={styles.actionButton}
        >
          View Budget
        </Button>
        
        <Button
          variant="outlined"
          onPress={() => router.push(`/projects/${projectId}/analytics`)}
          leftIcon="analytics"
          style={styles.actionButton}
        >
          Analytics
        </Button>
        
        {user?.role === 'admin' || user?.id === project?.ownerId ? (
          <Button
            variant="destructive"
            onPress={() => setShowDeleteModal(true)}
            leftIcon="delete"
            style={styles.actionButton}
          >
            Delete Project
          </Button>
        ) : null}
      </View>
    </Card>
  );

  if (isLoading) {
    return <Loading message="Loading project details..." />;
  }

  if (!project) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Project not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadProjectData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Project Header */}
        {renderProjectHeader()}

        {/* Progress Overview */}
        {renderProgressOverview()}

        {/* Team Section */}
        {renderTeamSection()}

        {/* Timeline Section */}
        {renderTimelineSection()}

        {/* AI Insights */}
        {aiInsights.length > 0 && renderAIInsights()}

        {/* Documents Section */}
        {renderDocumentsSection()}

        {/* Action Buttons */}
        {renderActionButtons()}
      </ScrollView>

      {/* Team Management Modal */}
      <ConfirmationModal
        visible={showTeamModal}
        title="Manage Project Team"
        message="Add, remove, or replace team members"
        confirmText="Done"
        cancelText="Close"
        onConfirm={() => setShowTeamModal(false)}
        onCancel={() => setShowTeamModal(false)}
      >
        <View style={styles.modalContent}>
          <Button
            variant="primary"
            onPress={() => handleTeamManagement('add')}
            leftIcon="add"
            style={styles.modalButton}
          >
            Add Team Members
          </Button>
          
          <ThemedText style={styles.modalSectionTitle}>
            Current Team ({teamMembers.length})
          </ThemedText>
          
          {teamMembers.map((member) => (
            <View key={member.id} style={styles.teamMemberModal}>
              <Avatar 
                source={{ uri: member.avatar }}
                name={member.name}
                size="small"
              />
              <View style={styles.memberInfo}>
                <ThemedText style={styles.memberName}>{member.name}</ThemedText>
                <ThemedText style={styles.memberRole}>{member.role}</ThemedText>
              </View>
              <View style={styles.memberActions}>
                <Button
                  variant="ghost"
                  onPress={() => handleTeamManagement('remove', member.id)}
                  size="small"
                >
                  Remove
                </Button>
                <Button
                  variant="outlined"
                  onPress={() => handleTeamManagement('replace', member.id)}
                  size="small"
                >
                  Replace
                </Button>
              </View>
            </View>
          ))}
        </View>
      </ConfirmationModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteModal(false)}
        type="danger"
      />
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    fontSize: 20,
  },
  projectTypeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  projectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 16,
    opacity: 0.7,
    lineHeight: 22,
    marginBottom: 16,
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressGrid: {
    gap: 16,
  },
  progressItem: {
    gap: 8,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: 3,
  },
  teamGrid: {
    gap: 12,
  },
  emptyTeam: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTeamText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
    textAlign: 'center',
  },
  timeline: {
    marginTop: 8,
  },
  emptyTimeline: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTimelineText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  insightIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  insightContent: {
    flex: 1,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    lineHeight: 16,
  },
  insightImpact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  insightConfidence: {
    fontSize: 10,
    opacity: 0.7,
  },
  applyInsightButton: {
    alignSelf: 'flex-start',
  },
  emptyInsights: {
    alignItems: 'center',
    padding: 20,
  },
  emptyInsightsText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyDocuments: {
    alignItems: 'center',
    padding: 20,
  },
  emptyDocumentsText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  actionsCard: {
    margin: 16,
    marginBottom: 32,
    padding: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
  modalContent: {
    gap: 16,
  },
  modalButton: {
    width: '100%',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
  },
  teamMemberModal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    opacity: 0.7,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
};

export default ProjectDetailScreen;