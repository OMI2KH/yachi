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
import { PaymentContext } from '../../../contexts/payment-context';
import { 
  MILESTONE_STATUS, 
  PAYMENT_STATUS,
  PROJECT_STATUS 
} from '../../../constants/construction';
import { USER_ROLES } from '../../../constants/user';
import { 
  formatEthiopianDate,
  formatCurrency,
  calculateProgress 
} from '../../../utils/formatters';
import { 
  getProjectMilestones,
  updateMilestoneStatus,
  requestMilestoneApproval,
  releaseMilestonePayment,
  addMilestoneComment,
  uploadMilestoneEvidence 
} from '../../../services/project-service';
import { 
  processMilestonePayment,
  createPaymentRequest 
} from '../../../services/payment-service';
import { 
  triggerMilestoneNotification,
  sendPaymentNotification 
} from '../../../services/notification-service';
import { 
  validateMilestoneCompletion,
  calculateTimelineAdjustment 
} from '../../../utils/project-calculations';

// Components
import ThemedView from '../../../components/themed-view';
import ThemedText from '../../../components/themed-text';
import Button from '../../../components/ui/button';
import Card from '../../../components/ui/card';
import Loading from '../../../components/ui/loading';
import Badge from '../../../components/ui/badge';
import ProgressBar from '../../../components/ui/progress-bar';
import ConfirmationModal from '../../../components/ui/confirmation-modal';
import PaymentModal from '../../../components/payment/payment-modal';
import MilestoneTimeline from '../../../components/construction/project-timeline';
import DocumentUpload from '../../../components/forms/document-upload';
import CommentSection from '../../../components/chat/message-bubble';
import EmptyState from '../../../components/ui/empty-state';

const MilestonesScreen = () => {
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
  const { userProfile } = useContext(UserContext);
  const { processPayment } = useContext(PaymentContext);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [milestones, setMilestones] = useState([]);
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [newComment, setNewComment] = useState('');
  const [projectProgress, setProjectProgress] = useState(0);
  const [financialSummary, setFinancialSummary] = useState({
    totalBudget: 0,
    releasedAmount: 0,
    pendingAmount: 0,
    completedMilestones: 0,
    totalMilestones: 0,
  });

  // Check user permissions
  const isClient = user?.role === USER_ROLES.CLIENT || user?.role === USER_ROLES.GOVERNMENT;
  const isWorker = user?.role === USER_ROLES.WORKER || user?.role === USER_ROLES.SERVICE_PROVIDER;
  const canApprove = isClient || user?.role === USER_ROLES.ADMIN;
  const canComplete = isWorker;

  // Load milestones data
  useFocusEffect(
    useCallback(() => {
      if (currentProject?.id) {
        loadMilestonesData();
      }
    }, [currentProject?.id])
  );

  const loadMilestonesData = async () => {
    try {
      setLoading(true);
      
      const milestonesData = await getProjectMilestones(currentProject.id);
      setMilestones(milestonesData);
      
      // Calculate project progress
      const progress = calculateProgress(milestonesData);
      setProjectProgress(progress.percentage);
      
      // Calculate financial summary
      calculateFinancialSummary(milestonesData);
      
      // Update project progress if needed
      if (progress.percentage !== currentProject.progress) {
        await updateProject(currentProject.id, {
          progress: progress.percentage,
          updatedAt: new Date().toISOString(),
        });
      }
      
    } catch (error) {
      Alert.alert('Load Failed', 'Failed to load milestones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate financial summary
  const calculateFinancialSummary = (milestonesList) => {
    const totalBudget = currentProject?.budget || 0;
    let releasedAmount = 0;
    let pendingAmount = 0;
    let completedMilestones = 0;

    milestonesList.forEach(milestone => {
      if (milestone.paymentStatus === PAYMENT_STATUS.RELEASED) {
        releasedAmount += milestone.amount;
      } else if (milestone.status === MILESTONE_STATUS.COMPLETED) {
        pendingAmount += milestone.amount;
      }
      
      if (milestone.status === MILESTONE_STATUS.COMPLETED) {
        completedMilestones++;
      }
    });

    setFinancialSummary({
      totalBudget,
      releasedAmount,
      pendingAmount,
      completedMilestones,
      totalMilestones: milestonesList.length,
    });
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMilestonesData();
    setRefreshing(false);
  };

  // Mark milestone as completed (Worker action)
  const handleCompleteMilestone = async (milestoneId, evidence = []) => {
    try {
      setLoading(true);

      const validation = validateMilestoneCompletion(
        milestones.find(m => m.id === milestoneId),
        evidence
      );

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      await updateMilestoneStatus(milestoneId, {
        status: MILESTONE_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        completedBy: user.id,
        evidence: evidence,
      });

      // Request approval from client
      await requestMilestoneApproval(milestoneId, {
        requestedBy: user.id,
        requestedAt: new Date().toISOString(),
      });

      // Update local state
      const updatedMilestones = milestones.map(milestone =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              status: MILESTONE_STATUS.PENDING_APPROVAL,
              completedAt: new Date().toISOString(),
              completedBy: user.id,
              evidence: evidence,
            }
          : milestone
      );

      setMilestones(updatedMilestones);
      calculateFinancialSummary(updatedMilestones);

      // Send notification
      await triggerMilestoneNotification({
        projectId: currentProject.id,
        milestoneId,
        action: 'completed',
        performedBy: user.id,
      });

      Alert.alert('Success', 'Milestone marked as completed and sent for approval.');
    } catch (error) {
      Alert.alert('Completion Failed', error.message);
    } finally {
      setLoading(false);
      setShowEvidenceModal(false);
      setSelectedMilestone(null);
    }
  };

  // Approve milestone (Client action)
  const handleApproveMilestone = async (milestoneId) => {
    try {
      setLoading(true);

      await updateMilestoneStatus(milestoneId, {
        status: MILESTONE_STATUS.APPROVED,
        approvedAt: new Date().toISOString(),
        approvedBy: user.id,
      });

      // Update local state
      const updatedMilestones = milestones.map(milestone =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              status: MILESTONE_STATUS.APPROVED,
              approvedAt: new Date().toISOString(),
              approvedBy: user.id,
            }
          : milestone
      );

      setMilestones(updatedMilestones);
      calculateFinancialSummary(updatedMilestones);

      // Send notification
      await triggerMilestoneNotification({
        projectId: currentProject.id,
        milestoneId,
        action: 'approved',
        performedBy: user.id,
      });

      Alert.alert('Success', 'Milestone approved successfully.');
    } catch (error) {
      Alert.alert('Approval Failed', error.message);
    } finally {
      setLoading(false);
      setSelectedMilestone(null);
    }
  };

  // Release payment for milestone
  const handleReleasePayment = async (milestoneId, paymentMethod) => {
    try {
      setLoading(true);

      const milestone = milestones.find(m => m.id === milestoneId);
      
      // Process payment
      const paymentResult = await processMilestonePayment({
        milestoneId,
        amount: milestone.amount,
        paymentMethod,
        projectId: currentProject.id,
        recipientId: milestone.completedBy || currentProject.team?.[0]?.id,
      });

      if (paymentResult.success) {
        // Update milestone payment status
        await releaseMilestonePayment(milestoneId, {
          paymentId: paymentResult.paymentId,
          releasedAt: new Date().toISOString(),
          releasedBy: user.id,
          paymentMethod: paymentMethod,
        });

        // Update local state
        const updatedMilestones = milestones.map(m =>
          m.id === milestoneId
            ? {
                ...m,
                paymentStatus: PAYMENT_STATUS.RELEASED,
                releasedAt: new Date().toISOString(),
                releasedBy: user.id,
                paymentMethod: paymentMethod,
              }
            : m
        );

        setMilestones(updatedMilestones);
        calculateFinancialSummary(updatedMilestones);

        // Send payment notification
        await sendPaymentNotification({
          milestoneId,
          amount: milestone.amount,
          recipientId: milestone.completedBy,
          projectId: currentProject.id,
        });

        Alert.alert('Success', 'Payment released successfully.');
      }
    } catch (error) {
      Alert.alert('Payment Failed', error.message);
    } finally {
      setLoading(false);
      setShowPaymentModal(false);
      setSelectedMilestone(null);
    }
  };

  // Add comment to milestone
  const handleAddComment = async (milestoneId, comment) => {
    try {
      if (!comment.trim()) return;

      await addMilestoneComment(milestoneId, {
        userId: user.id,
        userName: userProfile?.displayName || user.email,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
      });

      // Update local state
      const updatedMilestones = milestones.map(milestone =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              comments: [
                ...(milestone.comments || []),
                {
                  userId: user.id,
                  userName: userProfile?.displayName || user.email,
                  comment: comment.trim(),
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : milestone
      );

      setMilestones(updatedMilestones);
      setNewComment('');

      Alert.alert('Success', 'Comment added successfully.');
    } catch (error) {
      Alert.alert('Comment Failed', error.message);
    }
  };

  // Upload evidence for milestone
  const handleUploadEvidence = async (milestoneId, files) => {
    try {
      setUploadProgress(prev => ({ ...prev, [milestoneId]: 0 }));

      const uploadedFiles = await uploadMilestoneEvidence(
        milestoneId,
        files,
        (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [milestoneId]: progress,
          }));
        }
      );

      return uploadedFiles;
    } catch (error) {
      Alert.alert('Upload Failed', error.message);
      throw error;
    }
  };

  // Calculate milestone status badge
  const getMilestoneStatusBadge = (milestone) => {
    const statusConfig = {
      [MILESTONE_STATUS.PENDING]: { variant: 'secondary', text: 'Pending' },
      [MILESTONE_STATUS.IN_PROGRESS]: { variant: 'warning', text: 'In Progress' },
      [MILESTONE_STATUS.COMPLETED]: { variant: 'info', text: 'Completed' },
      [MILESTONE_STATUS.PENDING_APPROVAL]: { variant: 'warning', text: 'Pending Approval' },
      [MILESTONE_STATUS.APPROVED]: { variant: 'success', text: 'Approved' },
      [MILESTONE_STATUS.DELAYED]: { variant: 'error', text: 'Delayed' },
    };

    return statusConfig[milestone.status] || { variant: 'secondary', text: 'Unknown' };
  };

  // Render milestone actions based on user role and status
  const renderMilestoneActions = (milestone) => {
    const status = milestone.status;
    const paymentStatus = milestone.paymentStatus;

    if (canComplete) {
      // Worker actions
      if (status === MILESTONE_STATUS.IN_PROGRESS) {
        return (
          <Button
            title="Mark Complete"
            onPress={() => {
              setSelectedMilestone(milestone);
              setShowEvidenceModal(true);
            }}
            variant="primary"
            size="small"
            icon="check-circle"
          />
        );
      } else if (status === MILESTONE_STATUS.PENDING_APPROVAL) {
        return (
          <Badge variant="warning" text="Awaiting Client Approval" />
        );
      }
    }

    if (canApprove) {
      // Client actions
      if (status === MILESTONE_STATUS.PENDING_APPROVAL) {
        return (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Approve"
              onPress={() => handleApproveMilestone(milestone.id)}
              variant="success"
              size="small"
              icon="thumbs-up"
            />
            <Button
              title="Request Changes"
              onPress={() => {
                // Navigate to request changes screen
                router.push({
                  pathname: '/projects/milestone-feedback',
                  params: { milestoneId: milestone.id }
                });
              }}
              variant="outline"
              size="small"
              icon="edit"
            />
          </View>
        );
      } else if (status === MILESTONE_STATUS.APPROVED && paymentStatus !== PAYMENT_STATUS.RELEASED) {
        return (
          <Button
            title="Release Payment"
            onPress={() => {
              setSelectedMilestone(milestone);
              setShowPaymentModal(true);
            }}
            variant="primary"
            size="small"
            icon="dollar-sign"
          />
        );
      }
    }

    return null;
  };

  // Render financial summary
  const renderFinancialSummary = () => (
    <Card>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
        Financial Summary
      </ThemedText>
      
      <View style={{ gap: 12 }}>
        <FinancialItem
          label="Total Project Budget"
          value={formatCurrency(financialSummary.totalBudget)}
          color={colors.primary}
        />
        
        <FinancialItem
          label="Released Payments"
          value={formatCurrency(financialSummary.releasedAmount)}
          color={colors.success}
        />
        
        <FinancialItem
          label="Pending Payments"
          value={formatCurrency(financialSummary.pendingAmount)}
          color={colors.warning}
        />
        
        <FinancialItem
          label="Remaining Budget"
          value={formatCurrency(
            financialSummary.totalBudget - 
            financialSummary.releasedAmount - 
            financialSummary.pendingAmount
          )}
          color={colors.info}
        />
        
        <View style={{ 
          height: 4, 
          backgroundColor: colors.border, 
          borderRadius: 2,
          overflow: 'hidden',
          marginTop: 8,
        }}>
          <View style={{
            height: '100%',
            backgroundColor: colors.primary,
            width: `${(financialSummary.releasedAmount / financialSummary.totalBudget) * 100}%`,
            borderRadius: 2,
          }} />
          <View style={{
            height: '100%',
            backgroundColor: colors.warning,
            width: `${(financialSummary.pendingAmount / financialSummary.totalBudget) * 100}%`,
            borderRadius: 2,
            position: 'absolute',
            left: `${(financialSummary.releasedAmount / financialSummary.totalBudget) * 100}%`,
          }} />
        </View>
      </View>
    </Card>
  );

  // Render milestone details
  const renderMilestoneDetails = (milestone) => {
    const statusBadge = getMilestoneStatusBadge(milestone);
    const isOverdue = milestone.deadline && new Date(milestone.deadline) < new Date();

    return (
      <Card key={milestone.id} style={{ 
        borderLeftWidth: 4,
        borderLeftColor: 
          milestone.status === MILESTONE_STATUS.APPROVED ? colors.success :
          milestone.status === MILESTONE_STATUS.COMPLETED ? colors.info :
          milestone.status === MILESTONE_STATUS.DELAYED ? colors.error :
          isOverdue ? colors.warning : colors.primary,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
              {milestone.title}
            </ThemedText>
            <ThemedText type="secondary" style={{ marginTop: 4 }}>
              {formatCurrency(milestone.amount)} • {formatEthiopianDate(milestone.deadline)}
            </ThemedText>
            {milestone.description && (
              <ThemedText type="secondary" style={{ marginTop: 8, fontSize: 14 }}>
                {milestone.description}
              </ThemedText>
            )}
          </View>
          
          <Badge variant={statusBadge.variant} text={statusBadge.text} />
        </View>

        {/* Progress and Evidence */}
        {milestone.evidence && milestone.evidence.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 14, marginBottom: 8 }}>
              Completion Evidence ({milestone.evidence.length} files)
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {milestone.evidence.map((file, index) => (
                  <EvidenceThumbnail key={index} file={file} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Actions */}
        <View style={{ marginTop: 16 }}>
          {renderMilestoneActions(milestone)}
        </View>

        {/* Comments Section */}
        {milestone.comments && milestone.comments.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 14, marginBottom: 8 }}>
              Comments ({milestone.comments.length})
            </ThemedText>
            <View style={{ gap: 8 }}>
              {milestone.comments.slice(0, 3).map((comment, index) => (
                <CommentSection
                  key={index}
                  message={comment}
                  isUser={comment.userId === user.id}
                />
              ))}
            </View>
          </View>
        )}
      </Card>
    );
  };

  if (loading && !refreshing) {
    return <Loading message="Loading milestones..." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ThemedText type="title">Project Milestones</ThemedText>
        <ThemedText type="secondary">
          {currentProject?.name || 'Construction Project'}
        </ThemedText>
        
        {/* Overall Progress */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <ThemedText type="defaultSemiBold">Overall Progress</ThemedText>
            <ThemedText type="defaultSemiBold">{projectProgress}%</ThemedText>
          </View>
          <ProgressBar progress={projectProgress} height={8} />
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={{ 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border 
      }}>
        {['timeline', 'list', 'financial'].map(tab => (
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
        {activeTab === 'timeline' && (
          <MilestoneTimeline
            milestones={milestones}
            onMilestonePress={setSelectedMilestone}
            currentProject={currentProject}
          />
        )}

        {activeTab === 'list' && (
          <View style={{ gap: 16 }}>
            {milestones.length === 0 ? (
              <EmptyState
                title="No Milestones"
                description="Project milestones will appear here once they are created."
                icon="flag"
              />
            ) : (
              milestones.map(renderMilestoneDetails)
            )}
          </View>
        )}

        {activeTab === 'financial' && (
          <View style={{ gap: 16 }}>
            {renderFinancialSummary()}
            
            <Card>
              <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
                Payment History
              </ThemedText>
              {milestones
                .filter(m => m.paymentStatus === PAYMENT_STATUS.RELEASED)
                .map(milestone => (
                  <PaymentHistoryItem key={milestone.id} milestone={milestone} />
                ))}
              
              {milestones.filter(m => m.paymentStatus === PAYMENT_STATUS.RELEASED).length === 0 && (
                <ThemedText type="secondary" style={{ textAlign: 'center', padding: 20 }}>
                  No payments released yet
                </ThemedText>
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Evidence Upload Modal */}
      <ConfirmationModal
        visible={showEvidenceModal}
        title="Complete Milestone"
        message="Please upload evidence of completion (photos, documents, etc.)"
        confirmText="Submit Evidence"
        cancelText="Cancel"
        onConfirm={(evidence) => handleCompleteMilestone(selectedMilestone?.id, evidence)}
        onCancel={() => {
          setShowEvidenceModal(false);
          setSelectedMilestone(null);
        }}
        type="info"
        showEvidenceUpload={true}
        onEvidenceUpload={handleUploadEvidence}
        uploadProgress={uploadProgress[selectedMilestone?.id]}
      />

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedMilestone(null);
        }}
        onPayment={handleReleasePayment}
        amount={selectedMilestone?.amount}
        description={`Payment for milestone: ${selectedMilestone?.title}`}
        paymentMethods={['chapa', 'telebirr', 'cbe-birr']}
        recipient={selectedMilestone?.completedBy}
      />
    </ThemedView>
  );
};

// Helper Components
const FinancialItem = ({ label, value, color }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
    <ThemedText type="secondary" style={{ fontSize: 14 }}>{label}</ThemedText>
    <ThemedText type="defaultSemiBold" style={{ fontSize: 16, color }}>
      {value}
    </ThemedText>
  </View>
);

const EvidenceThumbnail = ({ file }) => {
  const { colors } = useContext(ThemeContext);
  
  return (
    <View style={{
      width: 80,
      height: 80,
      backgroundColor: colors.border,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <ThemedText type="secondary" style={{ fontSize: 12 }}>
        {file.type?.startsWith('image/') ? '📷' : '📄'}
      </ThemedText>
      <ThemedText type="secondary" style={{ fontSize: 10, marginTop: 4 }}>
        {file.name?.substring(0, 10)}...
      </ThemedText>
    </View>
  );
};

const PaymentHistoryItem = ({ milestone }) => (
  <View style={{ 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  }}>
    <View style={{ flex: 1 }}>
      <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
        {milestone.title}
      </ThemedText>
      <ThemedText type="secondary" style={{ fontSize: 12 }}>
        {formatEthiopianDate(milestone.releasedAt)} • {milestone.paymentMethod}
      </ThemedText>
    </View>
    <ThemedText type="defaultSemiBold" style={{ fontSize: 16, color: '#22c55e' }}>
      {formatCurrency(milestone.amount)}
    </ThemedText>
  </View>
);

export default MilestonesScreen;