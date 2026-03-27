import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
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
  Input 
} from '../../../components/ui/input';
import { 
  Avatar 
} from '../../../components/ui/avatar';
import { 
  Badge 
} from '../../../components/ui/badge';
import { 
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
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
  aiAssignmentService 
} from '../../../services/ai-assignment-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Project Team Management Screen
 * Features: AI-powered team formation, skill matching, role assignment, performance tracking
 */
const ProjectTeamScreen = () => {
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
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [teamStats, setTeamStats] = useState({
    totalMembers: 0,
    assignedRoles: {},
    completionRate: 0,
    averageRating: 0,
    skillCoverage: 0,
  });

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ProjectTeam');
    }, [])
  );

  // Load team data
  const loadTeamData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const [
        projectData,
        teamData,
        workersData,
        recommendationsData,
        statsData
      ] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectTeam(projectId),
        workerService.getAvailableWorkers(projectId),
        aiAssignmentService.getTeamRecommendations(projectId),
        projectService.getTeamStats(projectId)
      ]);
      
      setProject(projectData);
      setTeamMembers(teamData);
      setAvailableWorkers(workersData);
      setAiRecommendations(recommendationsData);
      setTeamStats(statsData);
      
      analyticsService.trackEvent('project_team_loaded', {
        userId: user?.id,
        projectId: projectId,
        projectType: projectData?.type,
        teamSize: teamData.length,
        skillCoverage: statsData.skillCoverage,
      });
    } catch (error) {
      console.error('Error loading team data:', error);
      showError('Failed to load team information');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [projectId, user?.id]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        loadTeamData();
      }
    }, [projectId, loadTeamData])
  );

  // Filter workers based on search and role
  const filteredWorkers = useMemo(() => {
    return availableWorkers.filter(worker => {
      const matchesSearch = 
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = selectedRole === 'all' || worker.primaryRole === selectedRole;
      
      return matchesSearch && matchesRole;
    });
  }, [availableWorkers, searchQuery, selectedRole]);

  // Filter team members by role
  const filteredTeamMembers = useMemo(() => {
    if (selectedRole === 'all') return teamMembers;
    return teamMembers.filter(member => member.role === selectedRole);
  }, [teamMembers, selectedRole]);

  // Handle add team member
  const handleAddTeamMember = async (worker, role = null) => {
    try {
      await projectService.addTeamMember(projectId, worker.id, role || worker.primaryRole);
      
      // Refresh data
      await loadTeamData();
      
      analyticsService.trackEvent('team_member_added', {
        userId: user?.id,
        projectId: projectId,
        workerId: worker.id,
        workerRole: role || worker.primaryRole,
        workerSkills: worker.skills.length,
      });
      
      showSuccess(`${worker.name} added to project team`);
      setShowAddModal(false);
      setSelectedWorker(null);
    } catch (error) {
      console.error('Error adding team member:', error);
      showError('Failed to add team member');
    }
  };

  // Handle remove team member
  const handleRemoveTeamMember = async (workerId) => {
    Alert.alert(
      'Remove Team Member',
      'Are you sure you want to remove this team member from the project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectService.removeTeamMember(projectId, workerId);
              
              // Refresh data
              await loadTeamData();
              
              analyticsService.trackEvent('team_member_removed', {
                userId: user?.id,
                projectId: projectId,
                workerId: workerId,
              });
              
              showSuccess('Team member removed from project');
            } catch (error) {
              console.error('Error removing team member:', error);
              showError('Failed to remove team member');
            }
          },
        },
      ]
    );
  };

  // Handle role update
  const handleUpdateRole = async (workerId, newRole) => {
    try {
      await projectService.updateTeamMemberRole(projectId, workerId, newRole);
      
      // Refresh data
      await loadTeamData();
      
      analyticsService.trackEvent('team_member_role_updated', {
        userId: user?.id,
        projectId: projectId,
        workerId: workerId,
        newRole: newRole,
      });
      
      showSuccess('Team member role updated');
    } catch (error) {
      console.error('Error updating role:', error);
      showError('Failed to update role');
    }
  };

  // Handle AI team formation
  const handleAITeamFormation = async () => {
    try {
      const aiTeam = await aiAssignmentService.formOptimalTeam(projectId);
      
      analyticsService.trackEvent('ai_team_formation_initiated', {
        userId: user?.id,
        projectId: projectId,
        recommendedTeamSize: aiTeam.length,
      });
      
      setShowAIModal(true);
    } catch (error) {
      console.error('Error forming AI team:', error);
      showError('Failed to generate AI team recommendations');
    }
  };

  // Handle apply AI recommendations
  const handleApplyAIRecommendations = async (recommendations) => {
    try {
      await aiAssignmentService.applyTeamRecommendations(projectId, recommendations);
      
      // Refresh data
      await loadTeamData();
      
      analyticsService.trackEvent('ai_recommendations_applied', {
        userId: user?.id,
        projectId: projectId,
        recommendationCount: recommendations.length,
      });
      
      showSuccess('AI team recommendations applied successfully');
      setShowAIModal(false);
    } catch (error) {
      console.error('Error applying AI recommendations:', error);
      showError('Failed to apply AI recommendations');
    }
  };

  // Handle skill gap analysis
  const handleSkillGapAnalysis = async () => {
    try {
      const analysis = await aiAssignmentService.analyzeSkillGaps(projectId);
      
      analyticsService.trackEvent('skill_gap_analysis_performed', {
        userId: user?.id,
        projectId: projectId,
        gapCount: analysis.gaps.length,
        coveragePercentage: analysis.coverage,
      });
      
      Alert.alert(
        'Skill Gap Analysis',
        `Project requires ${analysis.requiredSkills.length} skills. Current coverage: ${analysis.coverage}%.\n\nMissing skills: ${analysis.gaps.join(', ')}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error analyzing skill gaps:', error);
      showError('Failed to analyze skill gaps');
    }
  };

  // Handle send invitation
  const handleSendInvitation = async (workerId) => {
    try {
      await workerService.sendProjectInvitation(projectId, workerId);
      
      analyticsService.trackEvent('project_invitation_sent', {
        userId: user?.id,
        projectId: projectId,
        workerId: workerId,
      });
      
      showSuccess('Project invitation sent');
    } catch (error) {
      console.error('Error sending invitation:', error);
      showError('Failed to send invitation');
    }
  };

  // Get role color
  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'project_manager': return '#0ea5e9';
      case 'site_supervisor': return '#8b5cf6';
      case 'foreman': return '#f59e0b';
      case 'carpenter': return '#ef4444';
      case 'electrician': return '#eab308';
      case 'plumber': return '#06b6d4';
      case 'mason': return '#84cc16';
      case 'laborer': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  // Render team stats
  const renderTeamStats = () => (
    <Card style={styles.statsCard}>
      <ThemedText style={styles.statsTitle}>
        Team Overview
      </ThemedText>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {teamStats.totalMembers}
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            Team Members
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {teamStats.averageRating}/5
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            Avg Rating
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {teamStats.completionRate}%
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            Success Rate
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {teamStats.skillCoverage}%
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            Skill Coverage
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.skillProgress}>
        <View style={styles.progressHeader}>
          <ThemedText style={styles.progressLabel}>
            Project Skill Coverage
          </ThemedText>
          <ThemedText style={styles.progressPercentage}>
            {teamStats.skillCoverage}%
          </ThemedText>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${teamStats.skillCoverage}%`,
                backgroundColor: 
                  teamStats.skillCoverage > 80 ? '#22c55e' :
                  teamStats.skillCoverage > 60 ? '#eab308' : '#ef4444'
              }
            ]} 
          />
        </View>
      </View>
    </Card>
  );

  // Render role distribution
  const renderRoleDistribution = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Role Distribution
      </ThemedText>
      
      <View style={styles.roleFilters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'All Roles' },
            { key: 'project_manager', label: 'Managers' },
            { key: 'site_supervisor', label: 'Supervisors' },
            { key: 'foreman', label: 'Foremen' },
            { key: 'carpenter', label: 'Carpenters' },
            { key: 'electrician', label: 'Electricians' },
            { key: 'plumber', label: 'Plumbers' },
            { key: 'mason', label: Masons },
            { key: 'laborer', label: 'Laborers' },
          ].map((role) => (
            <Button
              key={role.key}
              variant={selectedRole === role.key ? 'primary' : 'outlined'}
              onPress={() => setSelectedRole(role.key)}
              size="small"
              style={styles.roleFilterButton}
            >
              {role.label}
            </Button>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.roleStats}>
        {Object.entries(teamStats.assignedRoles).map(([role, count]) => (
          <View key={role} style={styles.roleStatItem}>
            <View style={styles.roleInfo}>
              <View 
                style={[
                  styles.roleColor,
                  { backgroundColor: getRoleColor(role) }
                ]} 
              />
              <ThemedText style={styles.roleName}>
                {role.replace('_', ' ')}
              </ThemedText>
            </View>
            <ThemedText style={styles.roleCount}>
              {count}
            </ThemedText>
          </View>
        ))}
      </View>
    </Card>
  );

  // Render current team
  const renderCurrentTeam = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Current Team ({filteredTeamMembers.length})
        </ThemedText>
        <Button
          variant="primary"
          onPress={() => setShowAddModal(true)}
          size="small"
          leftIcon="add"
        >
          Add Member
        </Button>
      </View>
      
      {filteredTeamMembers.length === 0 ? (
        <View style={styles.emptyTeam}>
          <ThemedText style={styles.emptyTeamText}>
            No team members {selectedRole !== 'all' ? `with role ${selectedRole}` : 'assigned yet'}
          </ThemedText>
          <Button
            variant="outlined"
            onPress={() => setShowAddModal(true)}
            size="small"
          >
            Add Team Members
          </Button>
        </View>
      ) : (
        <View style={styles.teamList}>
          {filteredTeamMembers.map((member) => (
            <View key={member.id} style={styles.teamMember}>
              <View style={styles.memberInfo}>
                <Avatar 
                  source={{ uri: member.avatar }}
                  name={member.name}
                  size="medium"
                />
                <View style={styles.memberDetails}>
                  <ThemedText style={styles.memberName}>
                    {member.name}
                  </ThemedText>
                  <View style={styles.memberMeta}>
                    <Badge 
                      style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) }]}
                    >
                      {member.role.replace('_', ' ')}
                    </Badge>
                    <ThemedText style={styles.memberRating}>
                      ⭐ {member.rating}
                    </ThemedText>
                  </View>
                  <View style={styles.memberSkills}>
                    {member.skills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="outlined" size="small">
                        {skill}
                      </Badge>
                    ))}
                    {member.skills.length > 3 && (
                      <ThemedText style={styles.moreSkills}>
                        +{member.skills.length - 3} more
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>
              
              <View style={styles.memberActions}>
                <Button
                  variant="ghost"
                  onPress={() => handleUpdateRole(member.id, 
                    member.role === 'project_manager' ? 'site_supervisor' : 'project_manager'
                  )}
                  size="small"
                >
                  Change Role
                </Button>
                <Button
                  variant="destructive"
                  onPress={() => handleRemoveTeamMember(member.id)}
                  size="small"
                >
                  Remove
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );

  // Render AI recommendations
  const renderAIRecommendations = () => {
    if (aiRecommendations.length === 0) return null;

    return (
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>
            🤖 AI Team Recommendations
          </ThemedText>
          <Button
            variant="outlined"
            onPress={handleAITeamFormation}
            size="small"
            leftIcon="ai"
          >
            Optimize Team
          </Button>
        </View>
        
        {aiRecommendations.slice(0, 3).map((recommendation, index) => (
          <View key={index} style={styles.recommendationItem}>
            <View style={styles.recommendationContent}>
              <ThemedText style={styles.recommendationTitle}>
                {recommendation.type === 'addition' ? 'Add Member' : 'Replace Member'}
              </ThemedText>
              <ThemedText style={styles.recommendationDescription}>
                {recommendation.reason}
              </ThemedText>
              <ThemedText style={styles.recommendationImpact}>
                Expected impact: {recommendation.impact}
              </ThemedText>
            </View>
            
            <Button
              variant="outlined"
              onPress={() => {
                if (recommendation.type === 'addition') {
                  handleAddTeamMember(recommendation.worker, recommendation.suggestedRole);
                }
              }}
              size="small"
              style={styles.applyRecommendationButton}
            >
              Apply
            </Button>
          </View>
        ))}
      </Card>
    );
  };

  // Render available workers
  const renderAvailableWorkers = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Available Workers ({filteredWorkers.length})
        </ThemedText>
        <Button
          variant="outlined"
          onPress={handleSkillGapAnalysis}
          size="small"
          leftIcon="analyze"
        >
          Analyze Gaps
        </Button>
      </View>
      
      <Input
        placeholder="Search workers by name or skill..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon="search"
        style={styles.searchInput}
      />
      
      {filteredWorkers.length === 0 ? (
        <View style={styles.emptyWorkers}>
          <ThemedText style={styles.emptyWorkersText}>
            No available workers found
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.workersList} showsVerticalScrollIndicator={false}>
          {filteredWorkers.map((worker) => (
            <View key={worker.id} style={styles.workerItem}>
              <View style={styles.workerInfo}>
                <Avatar 
                  source={{ uri: worker.avatar }}
                  name={worker.name}
                  size="medium"
                />
                <View style={styles.workerDetails}>
                  <ThemedText style={styles.workerName}>
                    {worker.name}
                  </ThemedText>
                  <View style={styles.workerMeta}>
                    <Badge 
                      style={[styles.roleBadge, { backgroundColor: getRoleColor(worker.primaryRole) }]}
                    >
                      {worker.primaryRole.replace('_', ' ')}
                    </Badge>
                    <ThemedText style={styles.workerRating}>
                      ⭐ {worker.rating}
                    </ThemedText>
                    <ThemedText style={styles.workerLocation}>
                      📍 {worker.location}
                    </ThemedText>
                  </View>
                  <View style={styles.workerSkills}>
                    {worker.skills.slice(0, 4).map((skill, index) => (
                      <Badge key={index} variant="outlined" size="small">
                        {skill}
                      </Badge>
                    ))}
                  </View>
                </View>
              </View>
              
              <View style={styles.workerActions}>
                <Button
                  variant="primary"
                  onPress={() => handleAddTeamMember(worker)}
                  size="small"
                >
                  Add to Team
                </Button>
                <Button
                  variant="outlined"
                  onPress={() => handleSendInvitation(worker.id)}
                  size="small"
                >
                  Invite
                </Button>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Card>
  );

  if (isLoading) {
    return <Loading message="Loading project team..." />;
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
            onRefresh={loadTeamData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Team Stats */}
        {renderTeamStats()}

        {/* Role Distribution */}
        {renderRoleDistribution()}

        {/* AI Recommendations */}
        {renderAIRecommendations()}

        {/* Current Team */}
        {renderCurrentTeam()}

        {/* Available Workers */}
        {renderAvailableWorkers()}
      </ScrollView>

      {/* Add Team Member Modal */}
      <ConfirmationModal
        visible={showAddModal}
        title="Add Team Member"
        message="Select a worker to add to your project team"
        confirmText="Add Selected"
        cancelText="Cancel"
        onConfirm={() => selectedWorker && handleAddTeamMember(selectedWorker)}
        onCancel={() => {
          setShowAddModal(false);
          setSelectedWorker(null);
        }}
      >
        <View style={styles.modalContent}>
          <Input
            placeholder="Search workers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon="search"
            style={styles.modalSearch}
          />
          
          <ScrollView style={styles.modalWorkersList} showsVerticalScrollIndicator={false}>
            {filteredWorkers.map((worker) => (
              <Button
                key={worker.id}
                variant={selectedWorker?.id === worker.id ? 'primary' : 'outlined'}
                onPress={() => setSelectedWorker(worker)}
                style={styles.workerOption}
              >
                <View style={styles.workerOptionContent}>
                  <Avatar 
                    source={{ uri: worker.avatar }}
                    name={worker.name}
                    size="small"
                  />
                  <View style={styles.workerOptionInfo}>
                    <ThemedText style={styles.workerOptionName}>
                      {worker.name}
                    </ThemedText>
                    <ThemedText style={styles.workerOptionRole}>
                      {worker.primaryRole} • ⭐ {worker.rating}
                    </ThemedText>
                  </View>
                </View>
              </Button>
            ))}
          </ScrollView>
        </View>
      </ConfirmationModal>

      {/* AI Team Formation Modal */}
      <ConfirmationModal
        visible={showAIModal}
        title="AI Team Optimization"
        message="Apply these AI-generated team recommendations?"
        confirmText="Apply All"
        cancelText="Cancel"
        onConfirm={() => handleApplyAIRecommendations(aiRecommendations)}
        onCancel={() => setShowAIModal(false)}
      >
        <View style={styles.modalContent}>
          {aiRecommendations.map((rec, index) => (
            <View key={index} style={styles.aiRecommendation}>
              <ThemedText style={styles.aiRecTitle}>
                {rec.type === 'addition' ? '➕ Add' : '🔄 Replace'}: {rec.worker?.name}
              </ThemedText>
              <ThemedText style={styles.aiRecReason}>
                {rec.reason}
              </ThemedText>
              <ThemedText style={styles.aiRecImpact}>
                Impact: {rec.impact}
              </ThemedText>
            </View>
          ))}
        </View>
      </ConfirmationModal>
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  skillProgress: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
  roleFilters: {
    marginBottom: 16,
  },
  roleFilterButton: {
    marginRight: 8,
  },
  roleStats: {
    gap: 8,
  },
  roleStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  roleCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamList: {
    gap: 12,
  },
  teamMember: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetails: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  memberRating: {
    fontSize: 12,
    opacity: 0.7,
  },
  memberSkills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  moreSkills: {
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 4,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
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
  recommendationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  recommendationContent: {
    flex: 1,
    marginRight: 12,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    lineHeight: 16,
  },
  recommendationImpact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  applyRecommendationButton: {
    alignSelf: 'flex-start',
  },
  searchInput: {
    marginBottom: 16,
  },
  workersList: {
    maxHeight: 400,
  },
  workerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  workerLocation: {
    fontSize: 12,
    opacity: 0.7,
  },
  workerSkills: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  workerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyWorkers: {
    alignItems: 'center',
    padding: 20,
  },
  emptyWorkersText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  modalContent: {
    gap: 16,
  },
  modalSearch: {
    marginBottom: 8,
  },
  modalWorkersList: {
    maxHeight: 300,
  },
  workerOption: {
    marginBottom: 8,
    padding: 12,
  },
  workerOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workerOptionInfo: {
    flex: 1,
  },
  workerOptionName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  workerOptionRole: {
    fontSize: 12,
    opacity: 0.7,
  },
  aiRecommendation: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  aiRecTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiRecReason: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    lineHeight: 16,
  },
  aiRecImpact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
};

export default ProjectTeamScreen;