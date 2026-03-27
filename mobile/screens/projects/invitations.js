import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ThemeContext } from '../../../contexts/theme-context';
import { AuthContext } from '../../../contexts/auth-context';
import { ConstructionContext } from '../../../contexts/construction-context';
import { UserContext } from '../../../contexts/user-context';
import { NotificationContext } from '../../../contexts/notification-context';
import { 
  INVITATION_STATUS, 
  INVITATION_TYPE,
  PROJECT_STATUS 
} from '../../../constants/construction';
import { USER_ROLES } from '../../../constants/user';
import { 
  formatEthiopianDate,
  formatCurrency,
  formatDuration 
} from '../../../utils/formatters';
import { 
  getProjectInvitations,
  respondToInvitation,
  withdrawInvitation,
  sendReminder,
  findReplacementWorker 
} from '../../../services/project-service';
import { 
  triggerInvitationResponseNotification,
  sendInvitationReminder 
} from '../../../services/notification-service';
import { 
  calculateEarningsPotential,
  checkScheduleConflict 
} from '../../../utils/project-calculations';

// Components
import ThemedView from '../../../components/themed-view';
import ThemedText from '../../../components/themed-text';
import Button from '../../../components/ui/button';
import Card from '../../../components/ui/card';
import Loading from '../../../components/ui/loading';
import Badge from '../../../components/ui/badge';
import ConfirmationModal from '../../../components/ui/confirmation-modal';
import InvitationCard from '../../../components/construction/invitation-card';
import WorkerCard from '../../../components/construction/worker-card';
import ProjectDetails from '../../../components/construction/project-details';
import EmptyState from '../../../components/ui/empty-state';
import FilterBar from '../../../components/ui/filter-bar';

const InvitationsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Context
  const { theme, colors } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { 
    projects,
    refreshProjects 
  } = useContext(ConstructionContext);
  const { userProfile } = useContext(UserContext);
  const { scheduleNotification } = useContext(NotificationContext);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [filteredInvitations, setFilteredInvitations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [responseAction, setResponseAction] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    expired: 0,
  });
  const [replacementWorkers, setReplacementWorkers] = useState({});

  // Filters based on user role
  const filters = [
    { key: 'all', label: 'All Invitations' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'declined', label: 'Declined' },
    { key: 'expired', label: 'Expired' },
  ];

  // Client-specific filters
  const clientFilters = [
    ...filters,
    { key: 'awaiting_response', label: 'Awaiting Response' },
    { key: 'needs_replacement', label: 'Needs Replacement' },
  ];

  // Load invitations
  useFocusEffect(
    useCallback(() => {
      loadInvitations();
    }, [user?.id])
  );

  const loadInvitations = async () => {
    try {
      setLoading(true);
      
      const invitationData = await getProjectInvitations(user.id, user.role);
      setInvitations(invitationData);
      updateStats(invitationData);
      
      // Apply current filter
      applyFilter(activeFilter, invitationData);
      
    } catch (error) {
      Alert.alert('Load Failed', 'Failed to load invitations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update invitation statistics
  const updateStats = (invitationList) => {
    const stats = {
      total: invitationList.length,
      pending: invitationList.filter(i => i.status === INVITATION_STATUS.PENDING).length,
      accepted: invitationList.filter(i => i.status === INVITATION_STATUS.ACCEPTED).length,
      declined: invitationList.filter(i => i.status === INVITATION_STATUS.DECLINED).length,
      expired: invitationList.filter(i => i.status === INVITATION_STATUS.EXPIRED).length,
      awaiting_response: invitationList.filter(i => 
        i.status === INVITATION_STATUS.PENDING && 
        i.invitedBy === user.id
      ).length,
      needs_replacement: invitationList.filter(i => 
        i.status === INVITATION_STATUS.DECLINED && 
        i.invitedBy === user.id
      ).length,
    };
    
    setStats(stats);
  };

  // Apply filters
  const applyFilter = (filterKey, invitationList = invitations) => {
    let filtered = invitationList;

    switch (filterKey) {
      case 'pending':
        filtered = invitationList.filter(i => i.status === INVITATION_STATUS.PENDING);
        break;
      case 'accepted':
        filtered = invitationList.filter(i => i.status === INVITATION_STATUS.ACCEPTED);
        break;
      case 'declined':
        filtered = invitationList.filter(i => i.status === INVITATION_STATUS.DECLINED);
        break;
      case 'expired':
        filtered = invitationList.filter(i => i.status === INVITATION_STATUS.EXPIRED);
        break;
      case 'awaiting_response':
        filtered = invitationList.filter(i => 
          i.status === INVITATION_STATUS.PENDING && 
          i.invitedBy === user.id
        );
        break;
      case 'needs_replacement':
        filtered = invitationList.filter(i => 
          i.status === INVITATION_STATUS.DECLINED && 
          i.invitedBy === user.id
        );
        break;
      default:
        filtered = invitationList;
    }

    setFilteredInvitations(filtered);
    setActiveFilter(filterKey);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvitations();
    setRefreshing(false);
  };

  // Handle invitation response
  const handleInvitationResponse = async (invitationId, response, reason = '') => {
    try {
      setLoading(true);

      const result = await respondToInvitation({
        invitationId,
        workerId: user.id,
        response,
        reason,
        respondedAt: new Date().toISOString(),
      });

      if (result.success) {
        // Update local state
        const updatedInvitations = invitations.map(inv => 
          inv.id === invitationId 
            ? { ...inv, status: response, responseReason: reason }
            : inv
        );

        setInvitations(updatedInvitations);
        applyFilter(activeFilter, updatedInvitations);
        
        // Send notification
        await triggerInvitationResponseNotification({
          invitationId,
          response,
          workerId: user.id,
          projectId: result.projectId,
        });

        Alert.alert(
          'Success', 
          response === INVITATION_STATUS.ACCEPTED 
            ? 'You have accepted the project invitation!' 
            : 'You have declined the project invitation.'
        );

        // Refresh projects if accepted
        if (response === INVITATION_STATUS.ACCEPTED) {
          await refreshProjects();
        }
      }
    } catch (error) {
      Alert.alert('Response Failed', error.message);
    } finally {
      setLoading(false);
      setShowResponseModal(false);
      setSelectedInvitation(null);
    }
  };

  // Handle invitation withdrawal (for clients)
  const handleWithdrawInvitation = async (invitationId) => {
    try {
      setLoading(true);

      await withdrawInvitation(invitationId);

      // Update local state
      const updatedInvitations = invitations.filter(inv => inv.id !== invitationId);
      setInvitations(updatedInvitations);
      applyFilter(activeFilter, updatedInvitations);

      Alert.alert('Success', 'Invitation withdrawn successfully.');
    } catch (error) {
      Alert.alert('Withdrawal Failed', error.message);
    } finally {
      setLoading(false);
      setShowWithdrawModal(false);
      setSelectedInvitation(null);
    }
  };

  // Handle reminder sending
  const handleSendReminder = async (invitationId) => {
    try {
      await sendReminder(invitationId);

      await sendInvitationReminder({
        invitationId,
        projectId: selectedInvitation?.projectId,
        workerId: selectedInvitation?.workerId,
      });

      Alert.alert('Reminder Sent', 'A reminder has been sent to the worker.');
    } catch (error) {
      Alert.alert('Reminder Failed', error.message);
    }
  };

  // Handle replacement worker finding
  const handleFindReplacement = async (invitationId) => {
    try {
      setLoading(true);

      const replacement = await findReplacementWorker(invitationId);

      if (replacement) {
        setReplacementWorkers(prev => ({
          ...prev,
          [invitationId]: replacement,
        }));

        Alert.alert(
          'Replacement Found', 
          `AI found ${replacement.name} as a suitable replacement.`
        );
      } else {
        Alert.alert('No Replacement', 'No suitable replacement found at this time.');
      }
    } catch (error) {
      Alert.alert('Replacement Search Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if invitation is about to expire
  const isExpiringSoon = (invitation) => {
    if (invitation.status !== INVITATION_STATUS.PENDING) return false;
    
    const expiresAt = new Date(invitation.expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
    
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  };

  // Calculate earnings potential for worker
  const calculatePotentialEarnings = (invitation) => {
    if (user.role !== USER_ROLES.WORKER && user.role !== USER_ROLES.SERVICE_PROVIDER) {
      return null;
    }

    return calculateEarningsPotential({
      projectBudget: invitation.project?.budget,
      workerRole: invitation.assignedRole,
      projectDuration: invitation.project?.timeline,
      workerRate: userProfile?.hourlyRate,
    });
  };

  // Check schedule conflicts
  const checkForConflicts = (invitation) => {
    if (!invitation.project) return false;

    return checkScheduleConflict({
      projectStart: invitation.project.startDate,
      projectEnd: invitation.project.deadline,
      workerId: user.id,
      existingProjects: projects.filter(p => 
        p.status === PROJECT_STATUS.IN_PROGRESS || p.status === PROJECT_STATUS.UPCOMING
      ),
    });
  };

  // Render invitation actions based on user role and status
  const renderInvitationActions = (invitation) => {
    const isClient = user.role === USER_ROLES.CLIENT || user.role === USER_ROLES.GOVERNMENT;
    const isWorker = user.role === USER_ROLES.WORKER || user.role === USER_ROLES.SERVICE_PROVIDER;
    const hasConflict = checkForConflicts(invitation);

    if (isClient && invitation.invitedBy === user.id) {
      return renderClientActions(invitation);
    } else if (isWorker && invitation.workerId === user.id) {
      return renderWorkerActions(invitation, hasConflict);
    }

    return null;
  };

  const renderClientActions = (invitation) => {
    if (invitation.status === INVITATION_STATUS.PENDING) {
      return (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button
            title="Send Reminder"
            onPress={() => handleSendReminder(invitation.id)}
            variant="outline"
            size="small"
            icon="bell"
          />
          <Button
            title="Withdraw"
            onPress={() => {
              setSelectedInvitation(invitation);
              setShowWithdrawModal(true);
            }}
            variant="outline"
            size="small"
            icon="x"
          />
        </View>
      );
    } else if (invitation.status === INVITATION_STATUS.DECLINED) {
      return (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button
            title="Find Replacement"
            onPress={() => handleFindReplacement(invitation.id)}
            variant="primary"
            size="small"
            icon="refresh-cw"
          />
        </View>
      );
    }

    return null;
  };

  const renderWorkerActions = (invitation, hasConflict) => {
    if (invitation.status === INVITATION_STATUS.PENDING) {
      const potentialEarnings = calculatePotentialEarnings(invitation);

      return (
        <View style={{ gap: 8, marginTop: 12 }}>
          {hasConflict && (
            <ThemedText style={{ color: colors.warning, fontSize: 12 }}>
              ⚠️ Schedule conflict detected
            </ThemedText>
          )}
          
          {potentialEarnings && (
            <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
              Potential Earnings: {formatCurrency(potentialEarnings.total)}
            </ThemedText>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Accept"
              onPress={() => {
                setSelectedInvitation(invitation);
                setResponseAction('accept');
                setShowResponseModal(true);
              }}
              variant="primary"
              size="small"
              disabled={hasConflict}
              icon="check"
            />
            <Button
              title="Decline"
              onPress={() => {
                setSelectedInvitation(invitation);
                setResponseAction('decline');
                setShowResponseModal(true);
              }}
              variant="outline"
              size="small"
              icon="x"
            />
            <Button
              title="View Project"
              onPress={() => router.push(`/projects/detail?id=${invitation.projectId}`)}
              variant="outline"
              size="small"
              icon="external-link"
            />
          </View>
        </View>
      );
    }

    return null;
  };

  // Render replacement worker section
  const renderReplacementWorker = (invitation) => {
    const replacement = replacementWorkers[invitation.id];
    
    if (!replacement) return null;

    return (
      <View style={{ marginTop: 12 }}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
          AI Suggested Replacement
        </ThemedText>
        <WorkerCard
          worker={replacement}
          showActions={false}
          onPress={() => router.push(`/worker-profile/${replacement.id}`)}
        />
        <Button
          title="Invite Replacement"
          onPress={() => {
            // Navigate to send new invitation
            router.push({
              pathname: '/projects/invite-worker',
              params: { 
                projectId: invitation.projectId,
                workerId: replacement.id,
                role: invitation.assignedRole 
              }
            });
          }}
          variant="primary"
          size="small"
          style={{ marginTop: 8 }}
        />
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    const message = {
      all: 'No invitations found',
      pending: 'No pending invitations',
      accepted: 'No accepted invitations',
      declined: 'No declined invitations',
      expired: 'No expired invitations',
      awaiting_response: 'No invitations awaiting response',
      needs_replacement: 'No invitations need replacement',
    }[activeFilter] || 'No invitations found';

    return (
      <EmptyState
        title={message}
        description={
          user.role === USER_ROLES.WORKER || user.role === USER_ROLES.SERVICE_PROVIDER
            ? "You'll see project invitations here when clients select you for their projects."
            : "Invitations you send to workers will appear here."
        }
        icon="inbox"
        action={
          user.role === USER_ROLES.CLIENT || user.role === USER_ROLES.GOVERNMENT
            ? {
                label: 'Create Project',
                onPress: () => router.push('/projects/create'),
              }
            : null
        }
      />
    );
  };

  if (loading && !refreshing) {
    return <Loading message="Loading invitations..." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ThemedText type="title">Project Invitations</ThemedText>
        <ThemedText type="secondary">
          Manage your project invitations and responses
        </ThemedText>
      </View>

      {/* Statistics */}
      {stats.total > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ paddingVertical: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12 }}
        >
          <StatCard label="Total" value={stats.total} color={colors.primary} />
          <StatCard label="Pending" value={stats.pending} color={colors.warning} />
          <StatCard label="Accepted" value={stats.accepted} color={colors.success} />
          <StatCard label="Declined" value={stats.declined} color={colors.error} />
          {user.role === USER_ROLES.CLIENT && (
            <>
              <StatCard label="Awaiting Response" value={stats.awaiting_response} color={colors.info} />
              <StatCard label="Needs Replacement" value={stats.needs_replacement} color={colors.warning} />
            </>
          )}
        </ScrollView>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={user.role === USER_ROLES.CLIENT ? clientFilters : filters}
        activeFilter={activeFilter}
        onFilterChange={applyFilter}
        style={{ paddingHorizontal: 16, paddingBottom: 12 }}
      />

      {/* Invitations List */}
      <ScrollView
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
        {filteredInvitations.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={{ gap: 16 }}>
            {filteredInvitations.map(invitation => (
              <Card key={invitation.id} style={{ 
                borderLeftWidth: 4,
                borderLeftColor: 
                  invitation.status === INVITATION_STATUS.ACCEPTED ? colors.success :
                  invitation.status === INVITATION_STATUS.DECLINED ? colors.error :
                  invitation.status === INVITATION_STATUS.EXPIRED ? colors.secondary :
                  isExpiringSoon(invitation) ? colors.warning : colors.primary,
              }}>
                <InvitationCard
                  invitation={invitation}
                  userRole={user.role}
                  showProjectDetails={true}
                />
                
                {renderInvitationActions(invitation)}
                {renderReplacementWorker(invitation)}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Response Modal */}
      <ConfirmationModal
        visible={showResponseModal}
        title={
          responseAction === 'accept' 
            ? 'Accept Project Invitation?' 
            : 'Decline Project Invitation?'
        }
        message={
          responseAction === 'accept'
            ? 'You are about to accept this project invitation. Please ensure you are available for the project timeline.'
            : 'Please provide a reason for declining this invitation (optional):'
        }
        confirmText={responseAction === 'accept' ? 'Accept' : 'Decline'}
        cancelText="Cancel"
        onConfirm={() => handleInvitationResponse(
          selectedInvitation.id,
          responseAction === 'accept' ? INVITATION_STATUS.ACCEPTED : INVITATION_STATUS.DECLINED,
          responseAction === 'decline' ? 'No reason provided' : ''
        )}
        onCancel={() => {
          setShowResponseModal(false);
          setSelectedInvitation(null);
        }}
        type={responseAction === 'accept' ? 'success' : 'warning'}
        showInput={responseAction === 'decline'}
        inputPlaceholder="Reason for declining..."
      />

      {/* Withdraw Modal */}
      <ConfirmationModal
        visible={showWithdrawModal}
        title="Withdraw Invitation?"
        message="Are you sure you want to withdraw this invitation? The worker will no longer be able to accept it."
        confirmText="Withdraw"
        cancelText="Keep Invitation"
        onConfirm={() => handleWithdrawInvitation(selectedInvitation.id)}
        onCancel={() => {
          setShowWithdrawModal(false);
          setSelectedInvitation(null);
        }}
        type="warning"
      />
    </ThemedView>
  );
};

// Helper Components
const StatCard = ({ label, value, color }) => {
  const { colors } = useContext(ThemeContext);
  
  return (
    <View style={{ 
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 100,
    }}>
      <ThemedText type="defaultSemiBold" style={{ fontSize: 20, color }}>
        {value}
      </ThemedText>
      <ThemedText type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
        {label}
      </ThemedText>
    </View>
  );
};

export default InvitationsScreen;