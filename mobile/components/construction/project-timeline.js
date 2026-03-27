// components/construction/government-portal.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useGovernment } from '../../contexts/government-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Button from '../ui/button';
import Card from '../ui/card';
import Badge from '../ui/badge';
import Loading from '../ui/loading';
import StatsCard from '../admin/stats-card';
import AdminTable from '../admin/admin-table';
import Modal from '../ui/modal';
import Input from '../ui/input';
import SearchBar from '../ui/search-bar';
import ProjectForm from './project-form';

// Services
import { governmentService } from '../../services/government-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { notificationService } from '../../services/notification-service';

// Utils
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { debounce } from '../../utils/helpers';

// Constants
import { 
  GOVERNMENT_ROLES, 
  PROJECT_STATUS, 
  BUDGET_STATUS,
  CONSTRUCTION_TYPES 
} from '../../constants/government';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Government Portal Component
 * Ethiopian Government Infrastructure Project Management
 * AI-Powered Construction Management & Budget Optimization
 */

const GovernmentPortal = ({
  // Configuration
  initialTab = 'dashboard',
  showNavigation = true,
  enableAnalytics = true,
  enableExport = true,
  enableAIRecommendations = true,
  
  // Filters
  initialFilters = {},
  dateRange = {},
  
  // Callbacks
  onProjectSelect,
  onBudgetUpdate,
  onReportGenerate,
  onAnalyticsView,
  
  // Styling
  style,
  testID = 'government-portal',
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    state,
    refreshData,
    createProject,
    updateProject,
    approveBudget,
    generateReport,
    assignWorkers,
    optimizeBudget,
  } = useGovernment();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [aiRecommendations, setAiRecommendations] = useState([]);

  const scrollViewRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const dataRefreshRef = useRef(null);

  // Check user authorization
  const hasGovernmentAccess = useMemo(() => {
    return user?.roles?.includes(GOVERNMENT_ROLES.ADMIN) || 
           user?.roles?.includes(GOVERNMENT_ROLES.MANAGER) ||
           user?.roles?.includes(GOVERNMENT_ROLES.ENGINEER);
  }, [user]);

  // Memoized dashboard statistics
  const dashboardStats = useMemo(() => {
    if (!state.projects) return {};
    
    const totalProjects = state.projects.length;
    const activeProjects = state.projects.filter(p => p.status === PROJECT_STATUS.ACTIVE).length;
    const completedProjects = state.projects.filter(p => p.status === PROJECT_STATUS.COMPLETED).length;
    const totalBudget = state.projects.reduce((sum, p) => sum + (p.budget?.total || 0), 0);
    const spentBudget = state.projects.reduce((sum, p) => sum + (p.budget?.spent || 0), 0);
    const allocatedWorkers = state.projects.reduce((sum, p) => sum + (p.workers?.length || 0), 0);
    
    const recentProjects = state.projects
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const budgetUtilization = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;
    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

    // Calculate AI optimization potential
    const optimizationPotential = state.projects.reduce((sum, project) => {
      return sum + (project.aiOptimizations?.potentialSavings || 0);
    }, 0);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      spentBudget,
      allocatedWorkers,
      recentProjects,
      budgetUtilization,
      completionRate,
      optimizationPotential,
    };
  }, [state.projects]);

  // Filtered projects based on search and filters
  const filteredProjects = useMemo(() => {
    if (!state.projects) return [];
    
    let filtered = state.projects;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(project =>
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.location?.toLowerCase().includes(query) ||
        project.type?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(project => project.type === filters.type);
    }

    // Apply budget filter
    if (filters.budgetRange) {
      filtered = filtered.filter(project => {
        const budget = project.budget?.total || 0;
        return budget >= filters.budgetRange.min && budget <= filters.budgetRange.max;
      });
    }

    // Apply date filter
    if (filters.dateRange) {
      filtered = filtered.filter(project => {
        const projectDate = new Date(project.startDate);
        return projectDate >= new Date(filters.dateRange.start) && 
               projectDate <= new Date(filters.dateRange.end);
      });
    }

    return filtered;
  }, [state.projects, searchQuery, filters]);

  // AI-powered recommendations
  const generateAIRecommendations = useCallback(async () => {
    if (!enableAIRecommendations || !state.projects) return;

    try {
      const recommendations = await governmentService.getAIRecommendations({
        projects: state.projects,
        budget: dashboardStats.totalBudget,
        timeline: dateRange,
      });

      setAiRecommendations(recommendations);
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      errorService.captureError(error, {
        context: 'AIRecommendations',
        component: 'GovernmentPortal',
      });
    }
  }, [state.projects, dashboardStats.totalBudget, dateRange, enableAIRecommendations]);

  // Initialize component
  useEffect(() => {
    initializePortal();

    // Set up periodic data refresh
    dataRefreshRef.current = setInterval(() => {
      refreshData();
    }, 300000); // Refresh every 5 minutes

    return () => {
      if (dataRefreshRef.current) {
        clearInterval(dataRefreshRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Generate AI recommendations when data changes
  useEffect(() => {
    if (state.projects && state.projects.length > 0) {
      generateAIRecommendations();
    }
  }, [state.projects, generateAIRecommendations]);

  const initializePortal = async () => {
    try {
      setLoading(true);

      // Verify government access
      if (!hasGovernmentAccess) {
        throw new Error('Insufficient permissions for government portal access');
      }

      // Load initial data
      await refreshData();

      // Track analytics
      if (enableAnalytics) {
        analyticsService.trackEvent('government_portal_accessed', {
          userId: user.id,
          userRole: user.roles?.[0],
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      console.error('Government portal initialization error:', error);
      
      errorService.captureError(error, {
        context: 'GovernmentPortalInit',
        userId: user?.id,
        userRoles: user?.roles,
      });

      Alert.alert(
        'Access Denied',
        'You do not have permission to access the government portal. Please contact system administrator.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      await refreshData();
      
      // Show success notification
      notificationService.showSuccess('Data refreshed successfully');
    } catch (error) {
      console.error('Refresh failed:', error);
      notificationService.showError('Unable to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    
    if (onProjectSelect) {
      onProjectSelect(project);
    } else {
      // Default navigation
      router.push(`/government/projects/${project.id}`);
    }

    // Analytics
    analyticsService.trackEvent('government_project_selected', {
      projectId: project.id,
      projectType: project.type,
      projectStatus: project.status,
    });
  };

  const handleBudgetOptimization = async (projectId) => {
    try {
      setLoading(true);
      
      const result = await optimizeBudget(projectId);
      
      if (result.success) {
        Alert.alert(
          'Budget Optimized',
          `AI has optimized the budget, saving ${formatCurrency(result.data.savings)}`,
          [{ text: 'OK' }]
        );

        // Refresh data
        await refreshData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Budget optimization failed:', error);
      Alert.alert('Optimization Failed', 'Unable to optimize budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportGeneration = async (type, projectId = null) => {
    try {
      setLoading(true);
      
      const result = await generateReport(type, projectId, dateRange);
      
      if (result.success) {
        // Show success message
        Alert.alert(
          'Report Generated',
          `Your ${type} report has been generated successfully.`,
          [{ text: 'OK' }]
        );

        // Track analytics
        analyticsService.trackEvent('government_report_generated', {
          reportType: type,
          projectId,
          dateRange,
        });

        if (onReportGenerate) {
          onReportGenerate(result.data);
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      Alert.alert('Report Failed', 'Unable to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerAssignment = async (projectId, workers) => {
    try {
      const result = await assignWorkers(projectId, workers);
      
      if (result.success) {
        // Show success notification
        notificationService.showSuccess('Workers assigned successfully');
        
        // Refresh data
        await refreshData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Worker assignment failed:', error);
      notificationService.showError('Failed to assign workers');
    }
  };

  const handleProjectCreate = async (projectData) => {
    try {
      const result = await createProject(projectData);
      
      if (result.success) {
        setShowProjectModal(false);
        notificationService.showSuccess('Project created successfully');
        await refreshData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Project creation failed:', error);
      notificationService.showError('Failed to create project');
    }
  };

  // Render dashboard tab
  const renderDashboard = () => (
    <ScrollView 
      style={styles.dashboard}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Statistics Overview */}
      <View style={styles.statsGrid}>
        <StatsCard
          title="Total Projects"
          value={dashboardStats.totalProjects.toString()}
          change={12}
          changeType="increase"
          icon="📊"
          color="primary"
        />
        <StatsCard
          title="Active Projects"
          value={dashboardStats.activeProjects.toString()}
          change={5}
          changeType="increase"
          icon="🏗️"
          color="success"
        />
        <StatsCard
          title="Budget Utilization"
          value={`${dashboardStats.budgetUtilization.toFixed(1)}%`}
          change={-2.5}
          changeType="decrease"
          icon="💰"
          color="warning"
        />
        <StatsCard
          title="Workers Allocated"
          value={dashboardStats.allocatedWorkers.toString()}
          change={8}
          changeType="increase"
          icon="👷"
          color="info"
        />
      </View>

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <Card style={styles.recommendationsCard}>
          <View style={styles.cardHeader}>
            <ThemedText type="title" weight="semiBold">
              AI Recommendations
            </ThemedText>
            <Badge variant="filled" color="primary">
              Smart
            </Badge>
          </View>
          
          <View style={styles.recommendationsList}>
            {aiRecommendations.slice(0, 3).map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <ThemedText type="body" weight="medium">
                  {recommendation.title}
                </ThemedText>
                <ThemedText type="caption" color="secondary">
                  {recommendation.description}
                </ThemedText>
                {recommendation.impact && (
                  <Badge variant="outline" color="success" size="small">
                    Save {formatCurrency(recommendation.impact.savings)}
                  </Badge>
                )}
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Recent Projects */}
      <Card style={styles.recentProjectsCard}>
        <View style={styles.cardHeader}>
          <ThemedText type="title" weight="semiBold">
            Recent Projects
          </ThemedText>
          <Button
            variant="outline"
            size="small"
            onPress={() => setActiveTab('projects')}
          >
            View All
          </Button>
        </View>
        
        <View style={styles.projectsList}>
          {dashboardStats.recentProjects.map(project => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectItem}
              onPress={() => handleProjectSelect(project)}
            >
              <View style={styles.projectInfo}>
                <ThemedText type="body" weight="semiBold" numberOfLines={1}>
                  {project.title}
                </ThemedText>
                <ThemedText type="caption" color="secondary">
                  {project.location} • {formatCurrency(project.budget?.total)}
                </ThemedText>
              </View>
              
              <View style={styles.projectMeta}>
                <Badge
                  variant="filled"
                  color={getStatusColor(project.status)}
                  size="small"
                >
                  {project.status}
                </Badge>
                <ThemedText type="caption" color="tertiary">
                  {formatDate(project.startDate)}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.quickActionsCard}>
        <ThemedText type="title" weight="semiBold" style={styles.sectionTitle}>
          Quick Actions
        </ThemedText>
        
        <View style={styles.actionsGrid}>
          <Button
            variant="primary"
            icon="➕"
            onPress={() => setShowProjectModal(true)}
            style={styles.actionButton}
          >
            New Project
          </Button>
          
          <Button
            variant="outline"
            icon="📊"
            onPress={() => handleReportGeneration('overview')}
            style={styles.actionButton}
          >
            Generate Report
          </Button>
          
          <Button
            variant="outline"
            icon="🤖"
            onPress={generateAIRecommendations}
            style={styles.actionButton}
          >
            AI Analysis
          </Button>
          
          <Button
            variant="outline"
            icon="📤"
            onPress={() => handleReportGeneration('export')}
            style={styles.actionButton}
          >
            Export Data
          </Button>
        </View>
      </Card>
    </ScrollView>
  );

  // Render projects tab
  const renderProjects = () => (
    <View style={styles.projectsTab}>
      {/* Projects Header with Filters */}
      <Card style={styles.filtersCard}>
        <View style={styles.filtersRow}>
          <SearchBar
            placeholder="Search projects..."
            onSearch={handleSearch}
            style={styles.searchBar}
          />
          
          <View style={styles.filterButtons}>
            <Button
              variant="outline"
              size="small"
              icon="filter"
              onPress={() => {/* Open filter modal */}}
            >
              Filters
            </Button>
            
            <Button
              variant="outline"
              size="small"
              icon="sort"
              onPress={() => {/* Open sort modal */}}
            >
              Sort
            </Button>
          </View>
        </View>
      </Card>

      {/* Projects Table */}
      <AdminTable
        data={filteredProjects}
        columns={[
          {
            key: 'title',
            label: 'Project Name',
            width: '25%',
            render: (value, row) => (
              <TouchableOpacity onPress={() => handleProjectSelect(row)}>
                <ThemedText type="body" weight="medium" numberOfLines={1}>
                  {value}
                </ThemedText>
                <ThemedText type="caption" color="secondary" numberOfLines={1}>
                  {row.location}
                </ThemedText>
              </TouchableOpacity>
            ),
          },
          {
            key: 'type',
            label: 'Type',
            width: '15%',
            render: (value) => (
              <Badge variant="outline" size="small">
                {value}
              </Badge>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            width: '15%',
            render: (value) => (
              <Badge
                variant="filled"
                color={getStatusColor(value)}
                size="small"
              >
                {value}
              </Badge>
            ),
          },
          {
            key: 'budget',
            label: 'Budget',
            width: '15%',
            render: (value) => formatCurrency(value?.total || 0),
          },
          {
            key: 'progress',
            label: 'Progress',
            width: '15%',
            render: (value, row) => (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${value}%`, backgroundColor: getStatusColor(row.status) }
                    ]} 
                  />
                </View>
                <ThemedText type="caption">{value}%</ThemedText>
              </View>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            width: '15%',
            render: (value, row) => (
              <View style={styles.actionButtons}>
                <Button
                  variant="ghost"
                  size="small"
                  icon="visibility"
                  onPress={() => handleProjectSelect(row)}
                />
                <Button
                  variant="ghost"
                  size="small"
                  icon="edit"
                  onPress={() => {/* Edit project */}}
                />
              </View>
            ),
          },
        ]}
        loading={loading}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    </View>
  );

  // Render budgets tab
  const renderBudgets = () => (
    <ScrollView style={styles.budgetsTab}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      <Card>
        <ThemedText type="title" weight="semiBold">
          Budget Management
        </ThemedText>
        <ThemedText type="body" color="secondary">
          Monitor and optimize project budgets with AI-powered recommendations
        </ThemedText>
        
        {/* Budget Statistics */}
        <View style={styles.budgetStats}>
          <View style={styles.budgetStat}>
            <ThemedText type="title" weight="bold" color="primary">
              {formatCurrency(dashboardStats.totalBudget)}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Total Budget
            </ThemedText>
          </View>
          <View style={styles.budgetStat}>
            <ThemedText type="title" weight="bold" color="success">
              {formatCurrency(dashboardStats.spentBudget)}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Spent Budget
            </ThemedText>
          </View>
          <View style={styles.budgetStat}>
            <ThemedText type="title" weight="bold" color="warning">
              {dashboardStats.budgetUtilization.toFixed(1)}%
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Utilization
            </ThemedText>
          </View>
        </View>
      </Card>
    </ScrollView>
  );

  // Render analytics tab
  const renderAnalytics = () => (
    <ScrollView style={styles.analyticsTab}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      <Card>
        <ThemedText type="title" weight="semiBold">
          Analytics & Reports
        </ThemedText>
        <ThemedText type="body" color="secondary">
          Comprehensive analytics and reporting for government infrastructure projects
        </ThemedText>
        
        <View style={styles.analyticsActions}>
          <Button
            variant="outline"
            icon="📈"
            onPress={() => handleReportGeneration('performance')}
            style={styles.analyticsButton}
          >
            Performance Report
          </Button>
          <Button
            variant="outline"
            icon="💰"
            onPress={() => handleReportGeneration('financial')}
            style={styles.analyticsButton}
          >
            Financial Analysis
          </Button>
          <Button
            variant="outline"
            icon="👷"
            onPress={() => handleReportGeneration('workforce')}
            style={styles.analyticsButton}
          >
            Workforce Report
          </Button>
        </View>
      </Card>
    </ScrollView>
  );

  // Get status color for badges
  const getStatusColor = (status) => {
    const colors = {
      [PROJECT_STATUS.PLANNING]: 'warning',
      [PROJECT_STATUS.APPROVED]: 'info',
      [PROJECT_STATUS.ACTIVE]: 'primary',
      [PROJECT_STATUS.ON_HOLD]: 'warning',
      [PROJECT_STATUS.COMPLETED]: 'success',
      [PROJECT_STATUS.CANCELLED]: 'error',
    };
    
    return colors[status] || 'secondary';
  };

  if (!hasGovernmentAccess) {
    return (
      <View style={styles.accessDenied}>
        <ThemedText type="title" weight="bold">
          Access Denied
        </ThemedText>
        <ThemedText type="body" color="secondary" style={styles.accessMessage}>
          You do not have permission to access the government portal.
        </ThemedText>
        <Button onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  if (loading && !refreshing) {
    return <Loading message="Loading Government Portal..." />;
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText type="title" weight="bold">
              Government Portal
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Infrastructure Project Management System
            </ThemedText>
          </View>
          
          <View style={styles.headerActions}>
            <Button
              variant="outline"
              icon="refresh"
              onPress={handleRefresh}
              loading={refreshing}
            >
              Refresh
            </Button>
          </View>
        </View>

        {/* Navigation Tabs */}
        {showNavigation && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
          >
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'projects', label: 'Projects', icon: '🏗️' },
              { id: 'budgets', label: 'Budgets', icon: '💰' },
              { id: 'analytics', label: 'Analytics', icon: '📈' },
              { id: 'workers', label: 'Workers', icon: '👷' },
              { id: 'reports', label: 'Reports', icon: '📋' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <ThemedText 
                  type="body" 
                  weight={activeTab === tab.id ? 'semiBold' : 'regular'}
                  color={activeTab === tab.id ? 'primary' : 'secondary'}
                >
                  {tab.icon} {tab.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'projects' && renderProjects()}
        {activeTab === 'budgets' && renderBudgets()}
        {activeTab === 'analytics' && renderAnalytics()}
        {/* Add other tabs as needed */}
      </View>

      {/* Project Creation Modal */}
      <Modal
        visible={showProjectModal}
        onDismiss={() => setShowProjectModal(false)}
        title="Create New Project"
        size="large"
      >
        <ProjectForm
          mode="create"
          onSubmit={handleProjectCreate}
          onCancel={() => setShowProjectModal(false)}
        />
      </Modal>

      {/* Loading Overlay */}
      {loading && <Loading overlay />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessMessage: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    marginTop: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tabsContainer: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  content: {
    flex: 1,
  },
  dashboard: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  recommendationsCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    gap: 4,
  },
  recentProjectsCard: {
    marginBottom: 16,
  },
  projectsList: {
    gap: 12,
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  quickActionsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  projectsTab: {
    flex: 1,
  },
  filtersCard: {
    margin: 16,
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  budgetsTab: {
    flex: 1,
    padding: 16,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  budgetStat: {
    alignItems: 'center',
  },
  analyticsTab: {
    flex: 1,
    padding: 16,
  },
  analyticsActions: {
    gap: 12,
    marginTop: 16,
  },
  analyticsButton: {
    width: '100%',
  },
});

export default GovernmentPortal;

// Hook for using government portal
export const useGovernmentPortal = (portalId) => {
  const [portalState, setPortalState] = useState({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const refreshPortal = useCallback(async () => {
    setPortalState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await governmentService.getPortalData(portalId);
      
      if (result.success) {
        setPortalState({
          data: result.data,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setPortalState(prev => ({
        ...prev,
        error: error.message,
        loading: false,
      }));
      throw error;
    }
  }, [portalId]);

  return {
    ...portalState,
    refreshPortal,
  };
};