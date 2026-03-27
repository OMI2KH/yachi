import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemeContext } from '../../../contexts/theme-context';
import { AuthContext } from '../../../contexts/auth-context';
import { ConstructionContext } from '../../../contexts/construction-context';
import { UserContext } from '../../../contexts/user-context';
import { NotificationContext } from '../../../contexts/notification-context';
import { 
  PROJECT_TYPES, 
  WORKER_ROLES, 
  ASSIGNMENT_STATUS,
  SKILL_LEVELS 
} from '../../../constants/construction';
import { 
  calculateTeamRequirements,
  optimizeBudgetAllocation,
  estimateProjectTimeline 
} from '../../../utils/project-calculations';
import { 
  findMatchingWorkers,
  createOptimalTeam,
  sendWorkerInvitations,
  handleAssignmentDecline 
} from '../../../services/ai-assignment-service';
import { 
  triggerAIAssignmentNotification,
  sendProjectInvitation 
} from '../../../services/notification-service';
import { 
  formatEthiopianDate,
  formatCurrency,
  formatDuration 
} from '../../../utils/formatters';

// Components
import ThemedView from '../../../components/themed-view';
import ThemedText from '../../../components/themed-text';
import Button from '../../../components/ui/button';
import Card from '../../../components/ui/card';
import Loading from '../../../components/ui/loading';
import Badge from '../../../components/ui/badge';
import ConfirmationModal from '../../../components/ui/confirmation-modal';
import WorkerCard from '../../../components/construction/worker-card';
import ProjectTimeline from '../../../components/construction/project-timeline';
import BudgetAllocation from '../../../components/construction/budget-allocation';
import SkillDistribution from '../../../components/profile/skill-tags';

const AIAssignmentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Context
  const { theme, colors } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { 
    currentProject,
    updateProject,
    refreshProjectData 
  } = useContext(ConstructionContext);
  const { users } = useContext(UserContext);
  const { scheduleNotification } = useContext(NotificationContext);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchingWorkers, setMatchingWorkers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [assignmentStatus, setAssignmentStatus] = useState(ASSIGNMENT_STATUS.PENDING);
  const [optimizationData, setOptimizationData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [replacementWorkers, setReplacementWorkers] = useState([]);

  // Refs
  const scrollViewRef = useRef();
  const assignmentTimeoutRef = useRef();

  // Load AI assignment data
  useEffect(() => {
    loadAIAssignmentData();
    
    // Cleanup timeout on unmount
    return () => {
      if (assignmentTimeoutRef.current) {
        clearTimeout(assignmentTimeoutRef.current);
      }
    };
  }, [currentProject?.id]);

  const loadAIAssignmentData = async () => {
    try {
      setLoading(true);
      
      if (!currentProject) {
        throw new Error('No project data available');
      }

      // Calculate project requirements
      const requirements = calculateTeamRequirements({
        type: currentProject.type,
        squareArea: currentProject.squareArea,
        floors: currentProject.floors,
        budget: currentProject.budget,
        timeline: currentProject.timeline,
        complexity: currentProject.complexity,
      });

      // Find matching workers using AI algorithm
      const workers = await findMatchingWorkers({
        projectId: currentProject.id,
        requirements,
        location: currentProject.location,
        budget: currentProject.budget,
        timeline: currentProject.timeline,
      });

      // Create optimal team composition
      const optimalTeam = await createOptimalTeam({
        workers,
        requirements,
        budget: currentProject.budget,
        optimization: 'balanced', // balanced, cost, speed, quality
      });

      // Calculate optimization metrics
      const optimization = optimizeBudgetAllocation({
        team: optimalTeam,
        totalBudget: currentProject.budget,
        projectDuration: requirements.estimatedDuration,
      });

      setMatchingWorkers(workers);
      setSelectedTeam(optimalTeam);
      setOptimizationData(optimization);
      setAssignmentStatus(ASSIGNMENT_STATUS.READY);

    } catch (error) {
      Alert.alert('AI Assignment Error', error.message);
      setAssignmentStatus(ASSIGNMENT_STATUS.FAILED);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAIAssignmentData();
    setRefreshing(false);
  };

  // Calculate team metrics
  const calculateTeamMetrics = (team) => {
    const totalWorkers = team.length;
    const averageRating = team.reduce((sum, worker) => sum + (worker.rating || 0), 0) / totalWorkers;
    const totalCost = team.reduce((sum, worker) => sum + (worker.hourlyRate || 0), 0);
    const skillDistribution = team.reduce((dist, worker) => {
      worker.skills?.forEach(skill => {
        dist[skill] = (dist[skill] || 0) + 1;
      });
      return dist;
    }, {});

    return {
      totalWorkers,
      averageRating: Math.round(averageRating * 10) / 10,
      totalCost,
      skillDistribution,
      efficiency: calculateTeamEfficiency(team),
    };
  };

  // Calculate team efficiency score
  const calculateTeamEfficiency = (team) => {
    const skillScore = team.reduce((score, worker) => {
      return score + (worker.skillLevel === SKILL_LEVELS.EXPERT ? 1.2 : 
                    worker.skillLevel === SKILL_LEVELS.ADVANCED ? 1.0 : 0.8);
    }, 0);
    
    const ratingScore = team.reduce((score, worker) => score + (worker.rating || 0), 0) / team.length;
    const completionScore = team.reduce((score, worker) => score + (worker.completionRate || 0), 0) / team.length;
    
    return Math.min(100, ((skillScore + ratingScore + completionScore) / 3) * 20);
  };

  // Handle worker replacement
  const handleWorkerReplacement = async (workerId, reason) => {
    try {
      setLoading(true);
      
      // Find replacement worker
      const replacement = await handleAssignmentDecline({
        projectId: currentProject.id,
        workerId,
        reason,
        currentTeam: selectedTeam,
        requirements: calculateTeamRequirements(currentProject),
      });

      if (replacement) {
        // Update team
        const updatedTeam = selectedTeam.map(worker => 
          worker.id === workerId ? replacement : worker
        );
        
        setSelectedTeam(updatedTeam);
        setReplacementWorkers(prev => [...prev, { original: workerId, replacement }]);
        
        Alert.alert('Worker Replaced', 'AI has found a suitable replacement for the team.');
      } else {
        Alert.alert('Replacement Needed', 'Please manually select a replacement worker.');
      }
    } catch (error) {
      Alert.alert('Replacement Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Send team invitations
  const handleSendInvitations = async () => {
    try {
      setLoading(true);
      setAssignmentStatus(ASSIGNMENT_STATUS.SENDING);

      // Send invitations to all selected workers
      const invitationResults = await sendWorkerInvitations({
        projectId: currentProject.id,
        workers: selectedTeam,
        projectDetails: currentProject,
        invitationMessage: generateInvitationMessage(),
      });

      // Track responses
      const accepted = invitationResults.filter(result => result.status === 'accepted');
      const pending = invitationResults.filter(result => result.status === 'pending');
      const declined = invitationResults.filter(result => result.status === 'declined');

      // Update project with assigned team
      await updateProject(currentProject.id, {
        assignedTeam: accepted.map(result => result.worker),
        assignmentStatus: 'in_progress',
        invitationsSent: true,
        invitationResults: {
          accepted: accepted.length,
          pending: pending.length,
          declined: declined.length,
        },
      });

      // Send notifications
      await triggerAIAssignmentNotification({
        projectId: currentProject.id,
        workers: selectedTeam,
        projectName: currentProject.name,
      });

      setAssignmentStatus(ASSIGNMENT_STATUS.SENT);
      setShowConfirmation(true);

      // Schedule follow-up for pending invitations
      if (pending.length > 0) {
        assignmentTimeoutRef.current = setTimeout(() => {
          handleFollowUpInvitations(pending);
        }, 24 * 60 * 60 * 1000); // 24 hours
      }

    } catch (error) {
      Alert.alert('Invitation Failed', error.message);
      setAssignmentStatus(ASSIGNMENT_STATUS.FAILED);
    } finally {
      setLoading(false);
    }
  };

  // Handle follow-up for pending invitations
  const handleFollowUpInvitations = async (pendingInvitations) => {
    try {
      const stillPending = pendingInvitations.filter(inv => 
        Date.now() - new Date(inv.sentAt).getTime() > 24 * 60 * 60 * 1000
      );

      if (stillPending.length > 0) {
        // Find replacements for workers who haven't responded
        for (const invitation of stillPending) {
          await handleWorkerReplacement(invitation.workerId, 'no_response');
        }
        
        Alert.alert('Team Updated', 'AI has replaced workers who did not respond to invitations.');
      }
    } catch (error) {
      console.error('Follow-up error:', error);
    }
  };

  // Generate personalized invitation message
  const generateInvitationMessage = () => {
    return `You have been selected by Yachi AI for a ${currentProject.type} project: "${
      currentProject.name
    }". Project budget: ${formatCurrency(currentProject.budget)}. Estimated duration: ${
      formatDuration(optimizationData?.estimatedDuration)
    }. Please respond within 24 hours.`;
  };

  // Render team overview
  const renderTeamOverview = () => {
    const metrics = calculateTeamMetrics(selectedTeam);

    return (
      <View style={{ gap: 16 }}>
        {/* Team Summary */}
        <Card>
          <ThemedText type="title" style={{ marginBottom: 16 }}>
            AI-Optimized Team
          </ThemedText>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <MetricItem 
              label="Team Size" 
              value={metrics.totalWorkers} 
              icon="👥"
            />
            <MetricItem 
              label="Avg Rating" 
              value={metrics.averageRating} 
              icon="⭐"
            />
            <MetricItem 
              label="Efficiency" 
              value={`${Math.round(metrics.efficiency)}%`} 
              icon="⚡"
            />
            <MetricItem 
              label="Total Cost" 
              value={formatCurrency(metrics.totalCost)} 
              icon="💰"
            />
          </View>
        </Card>

        {/* Budget Allocation */}
        {optimizationData && (
          <BudgetAllocation
            allocation={optimizationData.budgetAllocation}
            totalBudget={currentProject.budget}
            onAllocationChange={(newAllocation) => {
              // Handle manual budget adjustment
              setOptimizationData(prev => ({
                ...prev,
                budgetAllocation: newAllocation,
              }));
            }}
          />
        )}

        {/* Project Timeline */}
        {optimizationData && (
          <ProjectTimeline
            timeline={optimizationData.timeline}
            estimatedDuration={optimizationData.estimatedDuration}
            milestones={optimizationData.milestones}
          />
        )}

        {/* Skill Distribution */}
        <Card>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            Skill Distribution
          </ThemedText>
          <SkillDistribution
            skills={metrics.skillDistribution}
            showCount={true}
          />
        </Card>
      </View>
    );
  };

  // Render worker list
  const renderWorkerList = () => {
    return (
      <View style={{ gap: 12 }}>
        <ThemedText type="subtitle">Selected Team Members</ThemedText>
        
        {selectedTeam.map((worker, index) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            role={worker.assignedRole}
            status={worker.invitationStatus || 'pending'}
            onReplace={(reason) => handleWorkerReplacement(worker.id, reason)}
            showActions={assignmentStatus === ASSIGNMENT_STATUS.READY}
            isReplacement={replacementWorkers.some(r => r.replacement.id === worker.id)}
          />
        ))}
      </View>
    );
  };

  // Render matching workers pool
  const renderWorkerPool = () => {
    const availableWorkers = matchingWorkers.filter(worker => 
      !selectedTeam.some(selected => selected.id === worker.id)
    );

    return (
      <View style={{ gap: 12 }}>
        <ThemedText type="subtitle">Available Workers ({availableWorkers.length})</ThemedText>
        
        {availableWorkers.slice(0, 10).map(worker => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            showActions={false}
            onPress={() => {
              // Show worker details
              router.push(`/worker-profile/${worker.id}`);
            }}
          />
        ))}
      </View>
    );
  };

  // Render optimization suggestions
  const renderOptimizationSuggestions = () => {
    if (!optimizationData?.suggestions) return null;

    return (
      <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.info }}>
        <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
          AI Optimization Suggestions
        </ThemedText>
        
        {optimizationData.suggestions.map((suggestion, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
            <ThemedText style={{ color: colors.info, marginRight: 8 }}>💡</ThemedText>
            <ThemedText type="secondary" style={{ flex: 1 }}>
              {suggestion}
            </ThemedText>
          </View>
        ))}
      </Card>
    );
  };

  if (loading && !refreshing) {
    return <Loading message="AI is assembling your optimal team..." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ThemedText type="title">AI Team Assignment</ThemedText>
        <ThemedText type="secondary">
          {currentProject?.name || 'Construction Project'}
        </ThemedText>
        
        {/* Assignment Status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Badge 
            variant={
              assignmentStatus === ASSIGNMENT_STATUS.READY ? 'success' :
              assignmentStatus === ASSIGNMENT_STATUS.SENDING ? 'warning' :
              assignmentStatus === ASSIGNMENT_STATUS.SENT ? 'success' : 'error'
            }
            text={assignmentStatus}
          />
          <ThemedText type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            Powered by Yachi AI
          </ThemedText>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={{ 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border 
      }}>
        {['overview', 'team', 'workers'].map(tab => (
          <Button
            key={tab}
            title={tab.charAt(0).toUpperCase() + tab.slice(1)}
            onPress={() => setActiveTab(tab)}
            variant={activeTab === tab ? 'primary' : 'outline'}
            size="small"
            style={{ flex: 1, borderRadius: 0 }}
          />
        ))}
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <View style={{ gap: 16 }}>
            {renderTeamOverview()}
            {renderOptimizationSuggestions()}
          </View>
        )}

        {activeTab === 'team' && renderWorkerList()}

        {activeTab === 'workers' && renderWorkerPool()}
      </ScrollView>

      {/* Footer Actions */}
      {assignmentStatus === ASSIGNMENT_STATUS.READY && (
        <View style={{ 
          padding: 16, 
          borderTopWidth: 1, 
          borderTopColor: colors.border,
          gap: 12,
        }}>
          <Button
            title={`Send Invitations to ${selectedTeam.length} Workers`}
            onPress={() => setShowConfirmation(true)}
            variant="primary"
            size="large"
            icon="send"
          />
          
          <Button
            title="Optimize Team"
            onPress={loadAIAssignmentData}
            variant="outline"
            size="small"
          />
        </View>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmation}
        title="Send Team Invitations?"
        message={`This will send project invitations to ${selectedTeam.length} selected workers. They have 24 hours to respond.`}
        confirmText="Send Invitations"
        cancelText="Review Team"
        onConfirm={handleSendInvitations}
        onCancel={() => setShowConfirmation(false)}
        type="info"
      />
    </ThemedView>
  );
};

// Helper Components
const MetricItem = ({ label, value, icon }) => {
  const { colors } = useContext(ThemeContext);
  
  return (
    <View style={{ alignItems: 'center', minWidth: 80 }}>
      <ThemedText type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
        {label}
      </ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <ThemedText style={{ fontSize: 12 }}>{icon}</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
};

export default AIAssignmentScreen;