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
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  projectService 
} from '../../../services/project-service';
import { 
  paymentService 
} from '../../../services/payment-service';
import { 
  workerService 
} from '../../../services/worker-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Project Budget Management Screen
 * Features: AI-powered budget allocation, cost tracking, payment scheduling, financial analytics
 */
const ProjectBudgetScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  
  const projectId = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState(null);
  const [budget, setBudget] = useState({
    total: 0,
    allocated: 0,
    spent: 0,
    remaining: 0,
    currency: 'ETB',
  });
  const [costCategories, setCostCategories] = useState([]);
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const [financialMetrics, setFinancialMetrics] = useState({
    costVariance: 0,
    budgetUtilization: 0,
    roi: 0,
    breakEvenPoint: 0,
  });
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [allocationAmount, setAllocationAmount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ProjectBudget');
    }, [])
  );

  // Calculate budget metrics
  const calculateMetrics = useCallback((budgetData, categories) => {
    const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated, 0);
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    const remaining = budgetData.total - totalSpent;
    const utilization = budgetData.total > 0 ? (totalSpent / budgetData.total) * 100 : 0;
    const variance = budgetData.total > 0 ? ((totalSpent - totalAllocated) / totalAllocated) * 100 : 0;

    return {
      total: budgetData.total,
      allocated: totalAllocated,
      spent: totalSpent,
      remaining: remaining,
      currency: budgetData.currency,
      utilization: utilization,
      variance: variance,
    };
  }, []);

  // Load project budget data
  const loadBudgetData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const [
        projectData,
        budgetData,
        categoriesData,
        paymentsData,
        metricsData,
        recommendationsData
      ] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectBudget(projectId),
        projectService.getCostCategories(projectId),
        projectService.getPaymentSchedule(projectId),
        projectService.getFinancialMetrics(projectId),
        projectService.getAIRecommendations(projectId)
      ]);
      
      setProject(projectData);
      setBudget(budgetData);
      setCostCategories(categoriesData);
      setPaymentSchedule(paymentsData);
      setFinancialMetrics(metricsData);
      setAiRecommendations(recommendationsData);
      
      analyticsService.trackEvent('project_budget_loaded', {
        userId: user?.id,
        projectId: projectId,
        projectType: projectData?.type,
        totalBudget: budgetData.total,
        budgetUtilization: metricsData.budgetUtilization,
      });
    } catch (error) {
      console.error('Error loading budget data:', error);
      showError('Failed to load budget information');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [projectId, user?.id]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        loadBudgetData();
      }
    }, [projectId, loadBudgetData])
  );

  // Handle budget allocation
  const handleAllocateBudget = async () => {
    try {
      if (!allocationAmount || !selectedCategory) return;
      
      const amount = parseFloat(allocationAmount);
      if (amount <= 0) {
        showError('Please enter a valid amount');
        return;
      }

      if (amount > budget.remaining) {
        showError('Allocation exceeds remaining budget');
        return;
      }

      await projectService.allocateBudget(projectId, selectedCategory.id, amount);
      
      // Refresh data
      await loadBudgetData();
      
      analyticsService.trackEvent('budget_allocated', {
        userId: user?.id,
        projectId: projectId,
        category: selectedCategory.name,
        amount: amount,
        currency: budget.currency,
      });
      
      showSuccess(`Allocated ${amount} ${budget.currency} to ${selectedCategory.name}`);
      setShowAllocateModal(false);
      setAllocationAmount('');
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error allocating budget:', error);
      showError('Failed to allocate budget');
    }
  };

  // Handle payment processing
  const handleProcessPayment = async () => {
    try {
      if (!paymentAmount) return;
      
      const amount = parseFloat(paymentAmount);
      if (amount <= 0) {
        showError('Please enter a valid amount');
        return;
      }

      if (amount > budget.remaining) {
        showError('Payment exceeds remaining budget');
        return;
      }

      await paymentService.processProjectPayment(projectId, amount, selectedCategory?.id);
      
      // Refresh data
      await loadBudgetData();
      
      analyticsService.trackEvent('project_payment_processed', {
        userId: user?.id,
        projectId: projectId,
        category: selectedCategory?.name,
        amount: amount,
        currency: budget.currency,
      });
      
      showSuccess(`Payment of ${amount} ${budget.currency} processed`);
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      showError('Failed to process payment');
    }
  };

  // Handle AI recommendation application
  const handleApplyRecommendation = async (recommendation) => {
    try {
      await projectService.applyAIRecommendation(projectId, recommendation.id);
      
      // Refresh data
      await loadBudgetData();
      
      analyticsService.trackEvent('ai_recommendation_applied', {
        userId: user?.id,
        projectId: projectId,
        recommendationId: recommendation.id,
        recommendationType: recommendation.type,
        estimatedSavings: recommendation.estimatedSavings,
      });
      
      showSuccess('AI recommendation applied successfully');
    } catch (error) {
      console.error('Error applying AI recommendation:', error);
      showError('Failed to apply recommendation');
    }
  };

  // Handle budget update
  const handleUpdateBudget = async (newTotal) => {
    try {
      await projectService.updateProjectBudget(projectId, newTotal);
      
      // Refresh data
      await loadBudgetData();
      
      analyticsService.trackEvent('project_budget_updated', {
        userId: user?.id,
        projectId: projectId,
        previousTotal: budget.total,
        newTotal: newTotal,
        currency: budget.currency,
      });
      
      showSuccess('Budget updated successfully');
    } catch (error) {
      console.error('Error updating budget:', error);
      showError('Failed to update budget');
    }
  };

  // Generate budget report
  const handleGenerateReport = async () => {
    try {
      const reportUrl = await projectService.generateBudgetReport(projectId);
      
      analyticsService.trackEvent('budget_report_generated', {
        userId: user?.id,
        projectId: projectId,
      });
      
      // In a real app, this would open the report or share it
      Alert.alert(
        'Report Generated',
        'Budget report has been generated successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating report:', error);
      showError('Failed to generate report');
    }
  };

  // Render budget overview
  const renderBudgetOverview = () => (
    <Card style={styles.overviewCard}>
      <ThemedText style={styles.overviewTitle}>
        Budget Overview
      </ThemedText>
      
      <View style={styles.budgetGrid}>
        <View style={styles.budgetItem}>
          <ThemedText style={styles.budgetLabel}>Total Budget</ThemedText>
          <ThemedText style={styles.budgetValue}>
            {budget.total.toLocaleString()} {budget.currency}
          </ThemedText>
        </View>
        
        <View style={styles.budgetItem}>
          <ThemedText style={styles.budgetLabel}>Allocated</ThemedText>
          <ThemedText style={styles.budgetValue}>
            {budget.allocated.toLocaleString()} {budget.currency}
          </ThemedText>
        </View>
        
        <View style={styles.budgetItem}>
          <ThemedText style={styles.budgetLabel}>Spent</ThemedText>
          <ThemedText style={[
            styles.budgetValue,
            { color: budget.spent > budget.allocated ? '#ef4444' : theme.colors.text }
          ]}>
            {budget.spent.toLocaleString()} {budget.currency}
          </ThemedText>
        </View>
        
        <View style={styles.budgetItem}>
          <ThemedText style={styles.budgetLabel}>Remaining</ThemedText>
          <ThemedText style={[
            styles.budgetValue,
            { color: budget.remaining < (budget.total * 0.1) ? '#eab308' : '#22c55e' }
          ]}>
            {budget.remaining.toLocaleString()} {budget.currency}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText style={styles.progressLabel}>
            Budget Utilization: {financialMetrics.budgetUtilization?.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.progressLabel}>
            Cost Variance: {financialMetrics.costVariance?.toFixed(1)}%
          </ThemedText>
        </View>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${Math.min(financialMetrics.budgetUtilization || 0, 100)}%`,
                backgroundColor: 
                  financialMetrics.budgetUtilization > 90 ? '#ef4444' :
                  financialMetrics.budgetUtilization > 75 ? '#eab308' : '#22c55e'
              }
            ]} 
          />
        </View>
      </View>
    </Card>
  );

  // Render cost categories
  const renderCostCategories = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Cost Categories
        </ThemedText>
        <Button
          variant="primary"
          onPress={() => setShowAllocateModal(true)}
          size="small"
          leftIcon="add"
        >
          Allocate
        </Button>
      </View>
      
      {costCategories.map((category) => (
        <View key={category.id} style={styles.categoryItem}>
          <View style={styles.categoryInfo}>
            <ThemedText style={styles.categoryName}>
              {category.name}
            </ThemedText>
            <ThemedText style={styles.categoryDescription}>
              {category.description}
            </ThemedText>
          </View>
          
          <View style={styles.categoryAmounts}>
            <ThemedText style={styles.allocatedAmount}>
              {category.allocated.toLocaleString()} {budget.currency}
            </ThemedText>
            <ThemedText style={styles.spentAmount}>
              Spent: {category.spent.toLocaleString()} {budget.currency}
            </ThemedText>
            <ThemedText style={[
              styles.remainingAmount,
              { color: category.remaining < (category.allocated * 0.1) ? '#eab308' : '#22c55e' }
            ]}>
              Remaining: {category.remaining.toLocaleString()} {budget.currency}
            </ThemedText>
          </View>
          
          <View style={styles.categoryProgress}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${category.allocated > 0 ? (category.spent / category.allocated) * 100 : 0}%`,
                    backgroundColor: 
                      category.spent > category.allocated ? '#ef4444' :
                      (category.spent / category.allocated) > 0.8 ? '#eab308' : '#22c55e'
                  }
                ]} 
              />
            </View>
            <ThemedText style={styles.progressText}>
              {category.allocated > 0 ? ((category.spent / category.allocated) * 100).toFixed(1) : 0}%
            </ThemedText>
          </View>
        </View>
      ))}
    </Card>
  );

  // Render payment schedule
  const renderPaymentSchedule = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Payment Schedule
        </ThemedText>
        <Button
          variant="outlined"
          onPress={() => setShowPaymentModal(true)}
          size="small"
          leftIcon="payment"
        >
          Add Payment
        </Button>
      </View>
      
      {paymentSchedule.map((payment, index) => (
        <View key={payment.id} style={styles.paymentItem}>
          <View style={styles.paymentInfo}>
            <ThemedText style={styles.paymentDescription}>
              {payment.description}
            </ThemedText>
            <ThemedText style={styles.paymentDate}>
              Due: {new Date(payment.dueDate).toLocaleDateString()}
            </ThemedText>
          </View>
          
          <View style={styles.paymentAmounts}>
            <ThemedText style={styles.paymentAmount}>
              {payment.amount.toLocaleString()} {budget.currency}
            </ThemedText>
            <View style={[
              styles.paymentStatus,
              { backgroundColor: 
                  payment.status === 'paid' ? '#22c55e' :
                  payment.status === 'overdue' ? '#ef4444' : '#eab308'
              }
            ]}>
              <ThemedText style={styles.paymentStatusText}>
                {payment.status.toUpperCase()}
              </ThemedText>
            </View>
          </View>
        </View>
      ))}
    </Card>
  );

  // Render AI recommendations
  const renderAIRecommendations = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        AI Budget Recommendations
      </ThemedText>
      
      {aiRecommendations.map((recommendation) => (
        <View key={recommendation.id} style={styles.recommendationItem}>
          <View style={styles.recommendationContent}>
            <ThemedText style={styles.recommendationTitle}>
              {recommendation.title}
            </ThemedText>
            <ThemedText style={styles.recommendationDescription}>
              {recommendation.description}
            </ThemedText>
            <ThemedText style={styles.recommendationSavings}>
              Estimated Savings: {recommendation.estimatedSavings.toLocaleString()} {budget.currency}
            </ThemedText>
            <ThemedText style={styles.recommendationConfidence}>
              Confidence: {recommendation.confidence}%
            </ThemedText>
          </View>
          
          <Button
            variant="outlined"
            onPress={() => handleApplyRecommendation(recommendation)}
            size="small"
            style={styles.applyButton}
          >
            Apply
          </Button>
        </View>
      ))}
    </Card>
  );

  // Render financial metrics
  const renderFinancialMetrics = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Financial Metrics
      </ThemedText>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <ThemedText style={styles.metricValue}>
            {financialMetrics.roi?.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.metricLabel}>
            ROI
          </ThemedText>
        </View>
        
        <View style={styles.metricItem}>
          <ThemedText style={styles.metricValue}>
            {financialMetrics.breakEvenPoint?.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.metricLabel}>
            Break-even
          </ThemedText>
        </View>
        
        <View style={styles.metricItem}>
          <ThemedText style={styles.metricValue}>
            {financialMetrics.costVariance?.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.metricLabel}>
            Variance
          </ThemedText>
        </View>
        
        <View style={styles.metricItem}>
          <ThemedText style={styles.metricValue}>
            {financialMetrics.budgetUtilization?.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.metricLabel}>
            Utilization
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  // Render action buttons
  const renderActionButtons = () => (
    <Card style={styles.actionsCard}>
      <View style={styles.actionButtons}>
        <Button
          variant="outlined"
          onPress={handleGenerateReport}
          leftIcon="report"
          style={styles.actionButton}
        >
          Generate Report
        </Button>
        
        <Button
          variant="outlined"
          onPress={() => router.push(`/projects/${projectId}/analytics`)}
          leftIcon="analytics"
          style={styles.actionButton}
        >
          View Analytics
        </Button>
        
        <Button
          variant="outlined"
          onPress={() => router.push(`/projects/${projectId}/documents`)}
          leftIcon="document"
          style={styles.actionButton}
        >
          Financial Docs
        </Button>
      </View>
    </Card>
  );

  if (isLoading) {
    return <Loading message="Loading project budget..." />;
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
            onRefresh={loadBudgetData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Budget Overview */}
        {renderBudgetOverview()}

        {/* Financial Metrics */}
        {renderFinancialMetrics()}

        {/* Cost Categories */}
        {renderCostCategories()}

        {/* Payment Schedule */}
        {renderPaymentSchedule()}

        {/* AI Recommendations */}
        {aiRecommendations.length > 0 && renderAIRecommendations()}

        {/* Action Buttons */}
        {renderActionButtons()}
      </ScrollView>

      {/* Allocation Modal */}
      <ConfirmationModal
        visible={showAllocateModal}
        title="Allocate Budget"
        message="Select a category and enter the allocation amount"
        confirmText="Allocate"
        cancelText="Cancel"
        onConfirm={handleAllocateBudget}
        onCancel={() => {
          setShowAllocateModal(false);
          setAllocationAmount('');
          setSelectedCategory(null);
        }}
      >
        <View style={styles.modalContent}>
          <Input
            label="Amount"
            placeholder="Enter allocation amount"
            value={allocationAmount}
            onChangeText={setAllocationAmount}
            keyboardType="numeric"
            style={styles.modalInput}
          />
          
          <ThemedText style={styles.modalLabel}>Select Category</ThemedText>
          {costCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory?.id === category.id ? 'primary' : 'outlined'}
              onPress={() => setSelectedCategory(category)}
              style={styles.categoryOption}
            >
              {category.name}
            </Button>
          ))}
        </View>
      </ConfirmationModal>

      {/* Payment Modal */}
      <ConfirmationModal
        visible={showPaymentModal}
        title="Process Payment"
        message="Enter payment details"
        confirmText="Process Payment"
        cancelText="Cancel"
        onConfirm={handleProcessPayment}
        onCancel={() => {
          setShowPaymentModal(false);
          setPaymentAmount('');
          setSelectedCategory(null);
        }}
      >
        <View style={styles.modalContent}>
          <Input
            label="Amount"
            placeholder="Enter payment amount"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
            style={styles.modalInput}
          />
          
          <ThemedText style={styles.modalLabel}>Select Category (Optional)</ThemedText>
          {costCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory?.id === category.id ? 'primary' : 'outlined'}
              onPress={() => setSelectedCategory(category)}
              style={styles.categoryOption}
            >
              {category.name}
            </Button>
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
  overviewCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  budgetItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  budgetLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressSection: {
    marginTop: 16,
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
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
  categoryItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  categoryAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  allocatedAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  spentAmount: {
    fontSize: 12,
    opacity: 0.7,
  },
  remainingAmount: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDescription: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  paymentAmounts: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  recommendationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  recommendationSavings: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  recommendationConfidence: {
    fontSize: 10,
    opacity: 0.7,
  },
  applyButton: {
    alignSelf: 'flex-start',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.7,
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
  modalInput: {
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryOption: {
    marginBottom: 8,
  },
};

export default ProjectBudgetScreen;