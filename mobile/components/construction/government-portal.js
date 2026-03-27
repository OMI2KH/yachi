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

// Contexts
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useConstruction } from '../../contexts/construction-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Button from '../ui/button';
import Card from '../ui/card';
import Badge from '../ui/badge';
import Loading from '../ui/loading';
import StatsCard from '../admin/stats-card';
import AdminTable from '../admin/admin-table';
import Modal from '../ui/modal';
import SearchBar from '../ui/search-bar';
import ProjectForm from './project-form';
import WorkerAssignment from './worker-assignment';
import BudgetOptimizer from './budget-optimizer';

// Services
import { constructionService } from '../../services/construction-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { notificationService } from '../../services/notification-service';

// Utils
import { formatCurrency, formatDate } from '../../utils/formatters';
import { debounce } from '../../utils/helpers';

// Constants
import { 
  GOVERNMENT_ROLES, 
  PROJECT_STATUS, 
  CONSTRUCTION_TYPES 
} from '../../constants/government';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Government Portal Component
 * Ethiopian Government Infrastructure Project Management
 * AI-Powered Construction Management & Budget Optimization
 * 🏗️ Supports: New Construction, Finishing, Infrastructure, Renovation
 */

const GovernmentPortal = ({
  initialTab = 'dashboard',
  showNavigation = true,
  enableAnalytics = true,
  enableAIRecommendations = true,
  initialFilters = {},
  dateRange = {},
  onProjectSelect,
  onBudgetUpdate,
  onReportGenerate,
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
    generateReport,
    assignWorkers,
    optimizeBudget,
  } = useConstruction();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);

  const dataRefreshRef = useRef(null);

  // Check user authorization
  const hasGovernmentAccess = useMemo(() => {
    const governmentRoles = [
      GOVERNMENT_ROLES.ADMIN, 
      GOVERNMENT_ROLES.MANAGER, 
      GOVERNMENT_ROLES.ENGINEER
    ];
    return user?.roles?.some(role => governmentRoles.includes(role));
  }, [user]);

  // Memoized dashboard statistics
  const dashboardStats = useMemo(() => {
    if (!state.projects || !Array.isArray(state.projects)) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalBudget: 0,
        spentBudget: 0,
        allocatedWorkers: 0,
        recentProjects: [],
        budgetUtilization: 0,
        completionRate: 0,
        optimizationPotential: 0,
      };
    }
    
    const totalProjects = state.projects.length;
    const activeProjects = state.projects.filter(p => p.status === PROJECT_STATUS.ACTIVE).length;
    const completedProjects = state.projects.filter(p => p.status === PROJECT_STATUS.COMPLETED).length;
    const totalBudget = state.projects.reduce((sum, p) => sum + (p.budget?.total || 0), 0);
    const spentBudget = state.projects.reduce((sum, p) => sum + (p.budget?.spent || 0), 0);
    const allocatedWorkers = state.projects.reduce((sum, p) => sum + (p.assignedWorkers?.length || 0), 0);
    
    const recentProjects = state.projects
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    const budgetUtilization = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;
    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
    const optimizationPotential = state.projects.reduce((sum, project) => {
      return sum + (project.aiOptimization?.potentialSavings || 0);
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

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!state.projects || !Array.isArray(state.projects)) return [];
    
    let filtered = [...state.projects];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(project =>
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.location?.toLowerCase().includes(query) ||
        project.constructionType?.toLowerCase().includes(query)
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    if (filters.constructionType && filters.constructionType !== 'all') {
      filtered = filtered.filter(project => 
        project.constructionType === filters.constructionType
      );
    }

    return filtered;
  }, [state.projects, searchQuery, filters]);

  // AI-powered recommendations
  const generateAIRecommendations = useCallback(async () => {
    if (!enableAIRecommendations || !state.projects || state.projects.length === 0) return;

    try {
      const recommendations = await constructionService.getAIRecommendations({
        projects: state.projects,
        budget: dashboardStats.totalBudget,
        constructionTypes: Object.values(CONSTRUCTION_TYPES),
      });

      setAiRecommendations(recommendations || []);
    } catch (error) {
      errorService.handleError(error, {
        context: 'AIRecommendations',
        component: 'GovernmentPortal',
        userId: user?.id,
      });
    }
  }, [state.projects, dashboardStats.totalBudget, enableAIRecommendations, user]);

  // Initialize component
  useEffect(() => {
    initializePortal();

    dataRefreshRef.current = setInterval(() => {
      refreshData();
    }, 300000);

    return () => {
      if (dataRefreshRef.current) {
        clearInterval(dataRefreshRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (state.projects && state.projects.length > 0) {
      generateAIRecommendations();
    }
  }, [state.projects, generateAIRecommendations]);

  const initializePortal = async () => {
    try {
      setLoading(true);

      if (!hasGovernmentAccess) {
        throw new Error('Insufficient permissions for government portal access');
      }

      await refreshData();

      if (enableAnalytics) {
        analyticsService.track('government_portal_accessed', {
          userId: user?.id,
          userRole: user?.roles?.[0],
          portalType: 'infrastructure',
        });
      }

    } catch (error) {
      errorService.handleError(error, {
        context: 'GovernmentPortalInit',
        userId: user?.id,
        userRoles: user?.roles,
        component: 'GovernmentPortal',
      });

      Alert.alert(
        'Access Denied',
        'You do not have permission to access the government portal.',
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
      await generateAIRecommendations();
      
      notificationService.show({
        type: 'success',
        title: 'Data Refreshed',
        message: 'Government portal data has been updated',
      });
    } catch (error) {
      notificationService.show({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Unable to refresh data',
      });
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
    if (!project?.id) return;
    
    setSelectedProject(project);
    
    if (onProjectSelect) {
      onProjectSelect(project);
    } else {
      router.push(`/(construction)/${project.id}`);
    }

    analyticsService.track('government_project_selected', {
      projectId: project.id,
      constructionType: project.constructionType,
      projectStatus: project.status,
      budget: project.budget?.total,
    });
  };

  const handleBudgetOptimization = async (projectId) => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      const result = await optimizeBudget(projectId);
      
      if (result.success) {
        await refreshData();
        
        notificationService.show({
          type: 'success',
          title: 'Budget Optimized',
          message: `Saved ${formatCurrency(result.savings || 0)} through AI optimization`,
        });
      } else {
        throw new Error(result.message || 'Budget optimization failed');
      }
    } catch (error) {
      notificationService.show({
        type: 'error',
        title: 'Optimization Failed',
        message: 'Unable to optimize budget',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReportGeneration = async (type, projectId = null) => {
    try {
      setLoading(true);
      
      const result = await generateReport(type, projectId, dateRange);
      
      if (result.success) {
        notificationService.show({
          type: 'success',
          title: 'Report Generated',
          message: `Your ${type} report has been generated successfully.`,
        });

        analyticsService.track('government_report_generated', {
          reportType: type,
          projectId,
          userId: user?.id,
        });

        if (onReportGenerate) {
          onReportGenerate(result.data);
        }
      } else {
        throw new Error(result.message || 'Report generation failed');
      }
    } catch (error) {
      notificationService.show({
        type: 'error',
        title: 'Report Failed',
        message: 'Unable to generate report',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerAssignment = async (projectId, workers) => {
    if (!projectId || !workers) return;
    
    try {
      const result = await assignWorkers(projectId, workers);
      
      if (result.success) {
        notificationService.show({
          type: 'success',
          title: 'Workers Assigned',
          message: `${workers.length} workers assigned to project successfully`,
        });
        
        await refreshData();
        
        analyticsService.track('government_workers_assigned', {
          projectId,
          workerCount: workers.length,
          assignmentType: 'ai_automated',
        });
      } else {
        throw new Error(result.message || 'Worker assignment failed');
      }
    } catch (error) {
      notificationService.show({
        type: 'error',
        title: 'Assignment Failed',
        message: 'Failed to assign workers to project',
      });
    }
  };

  const handleProjectCreate = async (projectData) => {
    try {
      const result = await createProject(projectData);
      
      if (result.success) {
        setShowProjectModal(false);
        notificationService.show({
          type: 'success',
          title: 'Project Created',
          message: 'New construction project has been created successfully',
        });
        
        await refreshData();
        
        analyticsService.track('government_project_created', {
          projectId: result.project?.id,
          constructionType: projectData.constructionType,
          budget: projectData.budget,
        });
      } else {
        throw new Error(result.message || 'Project creation failed');
      }
    } catch (error) {
      notificationService.show({
        type: 'error',
        title: 'Creation Failed',
        message: 'Failed to create new project',
      });
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      [PROJECT_STATUS.PLANNING]: 'warning',
      [PROJECT_STATUS.APPROVED]: 'info',
      [PROJECT_STATUS.ACTIVE]: 'primary',
      [PROJECT_STATUS.ON_HOLD]: 'warning',
      [PROJECT_STATUS.COMPLETED]: 'success',
      [PROJECT_STATUS.CANCELLED]: 'error',
    };
    
    return colorMap[status] || 'secondary';
  };

  const getConstructionTypeIcon = (type) => {
    const iconMap = {
      [CONSTRUCTION_TYPES.NEW_BUILDING]: '🏢',
      [CONSTRUCTION_TYPES.FINISHING]: '🎨',
      [CONSTRUCTION_TYPES.INFRASTRUCTURE]: '🏗️',
      [CONSTRUCTION_TYPES.RENOVATION]: '🔨',
    };
    
    return iconMap[type] || '📋';
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
      {/* AI-Powered Statistics Overview */}
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
          title="AI Savings Potential"
          value={formatCurrency(dashboardStats.optimizationPotential)}
          change={15}
          changeType="increase"
          icon="🤖"
          color="info"
        />
      </View>

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <Card style={styles.recommendationsCard}>
          <View style={styles.cardHeader}>
            <ThemedText type="title" weight="semiBold">
              AI Smart Recommendations
            </ThemedText>
            <Badge variant="filled" color="primary">
              AI Powered
            </Badge>
          </View>
          
          <View style={styles.recommendationsList}>
            {aiRecommendations.slice(0, 3).map((recommendation, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recommendationItem}
                onPress={() => {
                  if (recommendation.action === 'optimize_budget') {
                    handleBudgetOptimization(recommendation.projectId);
                  }
                }}
              >
                <View style={styles.recommendationContent}>
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
                <View style={styles.recommendationArrow}>
                  <ThemedText>→</ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}

      {/* Recent Projects with AI Assignment Status */}
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
              <View style={styles.projectIcon}>
                <ThemedText type="title">
                  {getConstructionTypeIcon(project.constructionType)}
                </ThemedText>
              </View>
              
              <View style={styles.projectInfo}>
                <ThemedText type="body" weight="semiBold" numberOfLines={1}>
                  {project.title}
                </ThemedText>
                <ThemedText type="caption" color="secondary">
                  {project.location} • {formatCurrency(project.budget?.total)}
                </ThemedText>
                {project.aiAssignment && (
                  <Badge variant="outline" color="primary" size="small">
                    AI Managed
                  </Badge>
                )}
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

      {/* Quick Actions with AI Features */}
      <Card style={styles.quickActionsCard}>
        <ThemedText type="title" weight="semiBold" style={styles.sectionTitle}>
          AI Quick Actions
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
            icon="🤖"
            onPress={generateAIRecommendations}
            style={styles.actionButton}
          >
            AI Analysis
          </Button>
          
          <Button
            variant="outline"
            icon="📊"
            onPress={() => handleReportGeneration('performance')}
            style={styles.actionButton}
          >
            Performance Report
          </Button>
          
          <Button
            variant="outline"
            icon="👷"
            onPress={() => setActiveTab('workers')}
            style={styles.actionButton}
          >
            Worker Management
          </Button>
        </View>
      </Card>
    </ScrollView>
  );

  // Render projects tab
  const renderProjects = () => (
    <View style={styles.projectsTab}>
      <Card style={styles.filtersCard}>
        <View style={styles.filtersRow}>
          <SearchBar
            placeholder="Search projects..."
            onSearch={handleSearch}
            style={styles.searchBar}
          />
        </View>
      </Card>

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
            key: 'constructionType',
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
                      { width: `${value}%`, backgroundColor: theme.colors.primary }
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
                  icon="👁️"
                  onPress={() => handleProjectSelect(row)}
                />
                <Button
                  variant="ghost"
                  size="small"
                  icon="👷"
                  onPress={() => {
                    setSelectedProject(row);
                    setShowWorkerModal(true);
                  }}
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

  // Render workers tab
  const renderWorkers = () => (
    <ScrollView style={styles.workersTab}
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
          Worker Management
        </ThemedText>
        <ThemedText type="body" color="secondary">
          AI-powered worker assignment and management
        </ThemedText>
        
        <View style={styles.workerStats}>
          <View style={styles.workerStat}>
            <ThemedText type="title" weight="bold" color="primary">
              {dashboardStats.allocatedWorkers}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Total Workers
            </ThemedText>
          </View>
          <View style={styles.workerStat}>
            <ThemedText type="title" weight="bold" color="success">
              {Math.round(dashboardStats.allocatedWorkers * 0.85)}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Active Workers
            </ThemedText>
          </View>
          <View style={styles.workerStat}>
            <ThemedText type="title" weight="bold" color="warning">
              {Math.round(dashboardStats.allocatedWorkers * 0.15)}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Available Workers
            </ThemedText>
          </View>
        </View>

        <Button
          variant="primary"
          icon="🤖"
          onPress={() => setShowWorkerModal(true)}
          style={styles.workerActionButton}
        >
          AI Worker Assignment
        </Button>
      </Card>
    </ScrollView>
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

        <Button
          variant="outline"
          icon="🤖"
          onPress={() => setShowBudgetModal(true)}
          style={styles.budgetActionButton}
        >
          AI Budget Optimization
        </Button>
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
          <Button
            variant="outline"
            icon="🏗️"
            onPress={() => handleReportGeneration('construction')}
            style={styles.analyticsButton}
          >
            Construction Progress
          </Button>
        </View>
      </Card>
    </ScrollView>
  );

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
              icon="🔄"
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
              { id: 'workers', label: 'Workers', icon: '👷' },
              { id: 'budgets', label: 'Budgets', icon: '💰' },
              { id: 'analytics', label: 'Analytics', icon: '📈' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && [styles.activeTab, { backgroundColor: theme.colors.primary + '20' }],
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
        {activeTab === 'workers' && renderWorkers()}
        {activeTab === 'budgets' && renderBudgets()}
        {activeTab === 'analytics' && renderAnalytics()}
      </View>

      {/* Modals */}
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

      <Modal
        visible={showWorkerModal}
        onDismiss={() => setShowWorkerModal(false)}
        title="AI Worker Assignment"
        size="large"
      >
        <WorkerAssignment
          project={selectedProject}
          onAssign={handleWorkerAssignment}
          onCancel={() => setShowWorkerModal(false)}
        />
      </Modal>

      <Modal
        visible={showBudgetModal}
        onDismiss={() => setShowBudgetModal(false)}
        title="AI Budget Optimization"
        size="large"
      >
        <BudgetOptimizer
          project={selectedProject}
          onOptimize={handleBudgetOptimization}
          onCancel={() => setShowBudgetModal(false)}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    gap: 12,
  },
  recommendationContent: {
    flex: 1,
    gap: 4,
  },
  recommendationArrow: {
    padding: 4,
  },
  recentProjectsCard: {
    marginBottom: 16,
  },
  projectsList: {
    gap: 12,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
    gap: 4,
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
  workersTab: {
    flex: 1,
    padding: 16,
  },
  workerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 20,
  },
  workerStat: {
    alignItems: 'center',
  },
  workerActionButton: {
    marginTop: 8,
  },
  budgetsTab: {
    flex: 1,
    padding: 16,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 20,
  },
  budgetStat: {
    alignItems: 'center',
  },
  budgetActionButton: {
    marginTop: 8,
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