import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useGovernment } from '../../../hooks/use-government';
import { useNotifications } from '../../../hooks/use-notifications';
import {
  ThemedView,
  ThemedText,
} from '../../../components/themed-view';
import {
  Card,
  Button,
  Loading,
  Avatar,
  Badge,
  QuickAction,
  StatCard,
  AlertBanner,
} from '../../../components/ui';
import {
  ProjectTimeline,
  WorkerAssignment,
} from '../../../components/construction';
import { formatCurrency, formatNumber, formatDate } from '../../../utils/formatters';
import { calculateGovernmentKPIs } from '../../../utils/government-calculations';

/**
 * Enterprise-level Government Dashboard
 * Central hub for government infrastructure project management
 */
const GovernmentDashboardScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, colors } = useTheme();
  const { 
    getGovernmentDashboard,
    getActiveProjects,
    getPendingApprovals,
    getBudgetOverview,
    loading: govLoading 
  } = useGovernment();
  
  const { scheduleNotification } = useNotifications();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [alerts, setAlerts] = useState([]);
  const [quickActions, setQuickActions] = useState([]);

  /**
   * Fetch comprehensive dashboard data
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        dashboard,
        activeProjects,
        pendingApprovals,
        budgetOverview
      ] = await Promise.all([
        getGovernmentDashboard(user.id),
        getActiveProjects({ governmentId: user.id }),
        getPendingApprovals(user.id),
        getBudgetOverview(user.id)
      ]);

      const consolidatedData = {
        ...dashboard,
        activeProjects,
        pendingApprovals,
        budgetOverview,
        lastUpdated: new Date().toISOString()
      };

      setDashboardData(consolidatedData);
      
      // Generate alerts and quick actions based on data
      const generatedAlerts = generateAlerts(consolidatedData);
      const generatedActions = generateQuickActions(consolidatedData, user.role);
      
      setAlerts(generatedAlerts);
      setQuickActions(generatedActions);

      // Notify for critical alerts
      const criticalAlerts = generatedAlerts.filter(alert => alert.severity === 'critical');
      if (criticalAlerts.length > 0) {
        await scheduleCriticalAlerts(criticalAlerts);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id, getGovernmentDashboard, getActiveProjects, getPendingApprovals, getBudgetOverview, scheduleNotification]);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Calculate KPIs from dashboard data
   */
  const kpis = useMemo(() => {
    if (!dashboardData) return {};
    return calculateGovernmentKPIs(dashboardData);
  }, [dashboardData]);

  /**
   * Handle quick action execution
   */
  const handleQuickAction = async (action) => {
    try {
      switch (action.id) {
        case 'create_project':
          router.push('/government/create-project');
          break;
        case 'approve_requests':
          router.push('/government/approvals');
          break;
        case 'view_reports':
          router.push('/government/analytics');
          break;
        case 'assign_workers':
          router.push('/government/worker-management');
          break;
        case 'manage_budget':
          router.push('/government/budget-management');
          break;
        case 'emergency_alert':
          await handleEmergencyAlert();
          break;
        default:
          console.warn('Unknown action:', action.id);
      }
    } catch (error) {
      console.error('Error executing quick action:', error);
      Alert.alert('Error', `Failed to execute ${action.title}`);
    }
  };

  /**
   * Handle emergency alert
   */
  const handleEmergencyAlert = async () => {
    Alert.alert(
      'Emergency Alert',
      'Send emergency alert to all project teams?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Alert',
          style: 'destructive',
          onPress: async () => {
            await scheduleNotification({
              userId: 'all_government_workers',
              title: '🚨 Emergency Alert',
              message: 'Emergency situation declared. Follow established protocols.',
              type: 'emergency_alert',
              data: { alertType: 'emergency', issuer: user.name }
            });
            Alert.alert('Success', 'Emergency alert sent to all teams');
          },
        },
      ]
    );
  };

  /**
   * Navigate to project details
   */
  const navigateToProject = (projectId) => {
    router.push({
      pathname: '/government/project-detail',
      params: { id: projectId }
    });
  };

  /**
   * Schedule critical alerts as notifications
   */
  const scheduleCriticalAlerts = async (criticalAlerts) => {
    for (const alert of criticalAlerts) {
      await scheduleNotification({
        userId: user.id,
        title: `🚨 ${alert.title}`,
        message: alert.message,
        type: 'government_alert',
        data: { alertId: alert.id, severity: alert.severity }
      });
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading && !refreshing) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Loading size="large" message="Loading government dashboard..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header Section */}
      <View style={{ 
        padding: 16, 
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={{ color: colors.white, marginBottom: 4 }}>
              Government Portal
            </ThemedText>
            <ThemedText style={{ color: colors.white + 'CC' }}>
              Welcome back, {user.name}
            </ThemedText>
          </View>
          <Avatar 
            source={user.avatar} 
            size={50}
            badge="government"
          />
        </View>

        {/* Quick Stats Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 12 }}>
          <StatCard
            title="Active Projects"
            value={kpis.activeProjects}
            subtitle="Infrastructure"
            icon="🏗️"
            variant="light"
          />
          <StatCard
            title="Budget Used"
            value={formatCurrency(kpis.budgetUsed, 'ETB')}
            subtitle={`of ${formatCurrency(kpis.totalBudget, 'ETB')}`}
            icon="💰"
            variant="light"
          />
          <StatCard
            title="Workers"
            value={formatNumber(kpis.activeWorkers)}
            subtitle="Employed"
            icon="👷"
            variant="light"
          />
          <StatCard
            title="Completion"
            value={`${kpis.overallProgress}%`}
            subtitle="Overall Progress"
            icon="📈"
            variant="light"
          />
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Alert Banner */}
        {alerts.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <AlertBanner
              alerts={alerts}
              onDismiss={(alertId) => setAlerts(prev => prev.filter(alert => alert.id !== alertId))}
            />
          </View>
        )}

        {/* Quick Actions Grid */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
            ⚡ Quick Actions
          </ThemedText>
          
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            gap: 12,
            justifyContent: 'space-between'
          }}>
            {quickActions.map((action, index) => (
              <QuickAction
                key={action.id}
                icon={action.icon}
                title={action.title}
                subtitle={action.subtitle}
                onPress={() => handleQuickAction(action)}
                style={{ width: '48%' }}
                variant={action.variant}
              />
            ))}
          </View>
        </Card>

        {/* Active Projects Section */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText type="subtitle">🏗️ Active Projects</ThemedText>
            <Button
              variant="ghost"
              onPress={() => router.push('/government/projects')}
              size="small"
            >
              View All
            </Button>
          </View>

          <View style={{ gap: 12 }}>
            {dashboardData?.activeProjects?.slice(0, 3).map((project) => (
              <TouchableOpacity
                key={project.id}
                onPress={() => navigateToProject(project.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: getProjectStatusColor(project.status, colors),
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <ThemedText style={{ marginBottom: 4 }} numberOfLines={1}>
                    {project.name}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {project.type} • {project.location}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ 
                      flex: 1, 
                      height: 4, 
                      backgroundColor: colors.border, 
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                      <View style={{
                        height: '100%',
                        width: `${project.progress}%`,
                        backgroundColor: getProjectStatusColor(project.status, colors),
                        borderRadius: 2,
                      }} />
                    </View>
                    <ThemedText type="caption" style={{ marginLeft: 8, color: colors.textSecondary }}>
                      {project.progress}%
                    </ThemedText>
                  </View>
                </View>
                
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {formatCurrency(project.budget, 'ETB')}
                  </ThemedText>
                  <Badge variant={getProjectStatusVariant(project.status)}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </View>
              </TouchableOpacity>
            ))}

            {(!dashboardData?.activeProjects || dashboardData.activeProjects.length === 0) && (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ThemedText type="body" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  No active projects. Create your first infrastructure project to get started.
                </ThemedText>
              </View>
            )}
          </View>
        </Card>

        {/* Pending Approvals Section */}
        {dashboardData?.pendingApprovals && dashboardData.pendingApprovals.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <ThemedText type="subtitle">📋 Pending Approvals</ThemedText>
              <Button
                variant="ghost"
                onPress={() => router.push('/government/approvals')}
                size="small"
              >
                Review All
              </Button>
            </View>

            <View style={{ gap: 8 }}>
              {dashboardData.pendingApprovals.slice(0, 5).map((approval) => (
                <View
                  key={approval.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ marginBottom: 2 }} numberOfLines={1}>
                      {approval.type.replace('_', ' ')}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                      {approval.projectName} • {formatDate(approval.submittedAt, 'relative')}
                    </ThemedText>
                  </View>
                  
                  <Button
                    variant="primary"
                    onPress={() => router.push(`/government/approval-detail/${approval.id}`)}
                    size="small"
                  >
                    Review
                  </Button>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Recent Activity Timeline */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
            📅 Recent Activity
          </ThemedText>

          <ProjectTimeline
            events={dashboardData?.recentActivity || []}
            maxItems={5}
            onItemPress={(event) => {
              if (event.projectId) {
                navigateToProject(event.projectId);
              }
            }}
          />
        </Card>

        {/* Budget Overview Section */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText type="subtitle">💰 Budget Overview</ThemedText>
            <Button
              variant="ghost"
              onPress={() => router.push('/government/budget-management')}
              size="small"
            >
              Manage
            </Button>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Total Budget
              </ThemedText>
              <ThemedText type="subtitle">
                {formatCurrency(kpis.totalBudget, 'ETB')}
              </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Utilized
              </ThemedText>
              <ThemedText type="subtitle" style={{ color: colors.primary }}>
                {formatCurrency(kpis.budgetUsed, 'ETB')}
              </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Remaining
              </ThemedText>
              <ThemedText type="subtitle" style={{ color: colors.success }}>
                {formatCurrency(kpis.budgetRemaining, 'ETB')}
              </ThemedText>
            </View>

            {/* Budget Progress Bar */}
            <View style={{ marginTop: 8 }}>
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between',
                marginBottom: 4 
              }}>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                  Utilization Rate
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                  {kpis.budgetUtilization}%
                </ThemedText>
              </View>
              <View style={{
                height: 6,
                backgroundColor: colors.border,
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <View style={{
                  height: '100%',
                  width: `${kpis.budgetUtilization}%`,
                  backgroundColor: kpis.budgetUtilization > 80 ? colors.warning : colors.primary,
                  borderRadius: 3,
                }} />
              </View>
            </View>

            {/* Budget by Category */}
            <View style={{ marginTop: 12 }}>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Allocation by Category
              </ThemedText>
              <View style={{ gap: 6 }}>
                {dashboardData?.budgetOverview?.categories?.map((category, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: 6, 
                      backgroundColor: getCategoryColor(index, colors) 
                    }} />
                    <ThemedText type="caption" style={{ flex: 1, color: colors.textSecondary }}>
                      {category.name}
                    </ThemedText>
                    <ThemedText type="caption">
                      {formatCurrency(category.amount, 'ETB')}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary, minWidth: 40 }}>
                      ({category.percentage}%)
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Card>
      </ScrollView>
    </ThemedView>
  );
};

/**
 * Utility Functions
 */

const generateAlerts = (dashboardData) => {
  const alerts = [];

  // Budget alerts
  if (dashboardData.budgetOverview?.utilizationRate > 85) {
    alerts.push({
      id: 'budget_high_utilization',
      title: 'High Budget Utilization',
      message: `Budget utilization is at ${dashboardData.budgetOverview.utilizationRate}%. Consider reviewing allocations.`,
      severity: 'warning',
      type: 'budget'
    });
  }

  // Project alerts
  dashboardData.activeProjects?.forEach(project => {
    if (project.progress < 20 && new Date(project.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      alerts.push({
        id: `project_delayed_${project.id}`,
        title: 'Project Behind Schedule',
        message: `${project.name} is behind schedule and approaching deadline.`,
        severity: 'critical',
        type: 'project',
        projectId: project.id
      });
    }

    if (project.riskLevel === 'high') {
      alerts.push({
        id: `project_high_risk_${project.id}`,
        title: 'High Risk Project',
        message: `${project.name} has been flagged as high risk.`,
        severity: 'warning',
        type: 'project',
        projectId: project.id
      });
    }
  });

  // Worker alerts
  if (dashboardData.workerShortage && dashboardData.workerShortage > 0) {
    alerts.push({
      id: 'worker_shortage',
      title: 'Worker Shortage',
      message: `${dashboardData.workerShortage} projects are experiencing worker shortages.`,
      severity: 'warning',
      type: 'workforce'
    });
  }

  return alerts.slice(0, 5); // Limit to 5 most important alerts
};

const generateQuickActions = (dashboardData, userRole) => {
  const baseActions = [
    {
      id: 'create_project',
      icon: '🏗️',
      title: 'New Project',
      subtitle: 'Create infrastructure project',
      variant: 'primary'
    },
    {
      id: 'view_reports',
      icon: '📊',
      title: 'Analytics',
      subtitle: 'View detailed reports',
      variant: 'default'
    },
    {
      id: 'assign_workers',
      icon: '👷',
      title: 'Workforce',
      subtitle: 'Manage workers',
      variant: 'default'
    },
    {
      id: 'manage_budget',
      icon: '💰',
      title: 'Budget',
      subtitle: 'Financial management',
      variant: 'default'
    }
  ];

  // Add role-specific actions
  if (userRole === 'government_admin') {
    baseActions.push(
      {
        id: 'approve_requests',
        icon: '✅',
        title: 'Approvals',
        subtitle: 'Review pending requests',
        variant: 'default'
      },
      {
        id: 'emergency_alert',
        icon: '🚨',
        title: 'Emergency',
        subtitle: 'Send alert to teams',
        variant: 'error'
      }
    );
  }

  return baseActions;
};

const getProjectStatusColor = (status, colors) => {
  const colorMap = {
    planning: colors.warning,
    in_progress: colors.primary,
    on_hold: colors.error,
    completed: colors.success,
    cancelled: colors.textSecondary,
  };
  return colorMap[status] || colors.textSecondary;
};

const getProjectStatusVariant = (status) => {
  const variantMap = {
    planning: 'warning',
    in_progress: 'primary',
    on_hold: 'error',
    completed: 'success',
    cancelled: 'default',
  };
  return variantMap[status] || 'default';
};

const getCategoryColor = (index, colors) => {
  const colorsList = [
    colors.primary,
    colors.success,
    colors.warning,
    colors.error,
    colors.info,
    colors.secondary
  ];
  return colorsList[index % colorsList.length];
};

export default GovernmentDashboardScreen;