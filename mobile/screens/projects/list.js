import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
  Badge 
} from '../../../components/ui/badge';
import { 
  ProjectCard 
} from '../../../components/project/project-card';
import { 
  ProjectFilter 
} from '../../../components/project/project-filter';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  projectService 
} from '../../../services/project-service';
import { 
  aiAssignmentService 
} from '../../../services/ai-assignment-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Project List Screen
 * Features: AI-powered project discovery, smart filtering, multi-view layouts, bulk operations
 */
const ProjectListScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // grid, list, map
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    type: [],
    budgetRange: { min: 0, max: 1000000 },
    timeline: [],
    location: [],
    skills: [],
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    onHold: 0,
    totalBudget: 0,
  });

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ProjectList');
    }, [])
  );

  // Load projects data
  const loadProjectsData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const [projectsData, statsData] = await Promise.all([
        projectService.getUserProjects(user?.id),
        projectService.getProjectStats(user?.id)
      ]);
      
      setProjects(projectsData);
      setFilteredProjects(projectsData);
      setStats(statsData);
      
      analyticsService.trackEvent('project_list_loaded', {
        userId: user?.id,
        userRole: user?.role,
        projectCount: projectsData.length,
        activeProjects: statsData.active,
        totalBudget: statsData.totalBudget,
      });
    } catch (error) {
      console.error('Error loading projects:', error);
      showError('Failed to load projects');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.role]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadProjectsData();
    }, [loadProjectsData])
  );

  // Filter and sort projects
  const processProjects = useCallback((projectsList, query, filter, sort, filterOptions) => {
    let processed = [...projectsList];

    // Apply search filter
    if (query) {
      processed = processed.filter(project =>
        project.title.toLowerCase().includes(query.toLowerCase()) ||
        project.description.toLowerCase().includes(query.toLowerCase()) ||
        project.location.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      processed = processed.filter(project => project.status === filter);
    }

    // Apply advanced filters
    if (filterOptions.status.length > 0) {
      processed = processed.filter(project => filterOptions.status.includes(project.status));
    }

    if (filterOptions.type.length > 0) {
      processed = processed.filter(project => filterOptions.type.includes(project.type));
    }

    if (filterOptions.budgetRange) {
      processed = processed.filter(project =>
        project.budget >= filterOptions.budgetRange.min &&
        project.budget <= filterOptions.budgetRange.max
      );
    }

    if (filterOptions.location.length > 0) {
      processed = processed.filter(project => filterOptions.location.includes(project.location));
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        processed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        processed.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'budget_high':
        processed.sort((a, b) => b.budget - a.budget);
        break;
      case 'budget_low':
        processed.sort((a, b) => a.budget - b.budget);
        break;
      case 'deadline':
        processed.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        break;
      case 'progress':
        processed.sort((a, b) => b.progress - a.progress);
        break;
      default:
        break;
    }

    return processed;
  }, []);

  // Update filtered projects when filters change
  useMemo(() => {
    const filtered = processProjects(projects, searchQuery, activeFilter, sortBy, filters);
    setFilteredProjects(filtered);
  }, [projects, searchQuery, activeFilter, sortBy, filters, processProjects]);

  // Handle project creation
  const handleCreateProject = () => {
    analyticsService.trackEvent('create_project_initiated', { userId: user?.id });
    router.push('/(construction)/create');
  };

  // Handle project view
  const handleViewProject = (project) => {
    analyticsService.trackEvent('project_viewed', {
      userId: user?.id,
      projectId: project.id,
      projectType: project.type,
      projectStatus: project.status,
    });
    router.push(`/projects/${project.id}`);
  };

  // Handle project edit
  const handleEditProject = (project) => {
    analyticsService.trackEvent('project_edit_initiated', {
      userId: user?.id,
      projectId: project.id,
    });
    router.push(`/projects/${project.id}/edit`);
  };

  // Handle project deletion
  const handleDeleteProject = async (project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectService.deleteProject(project.id);
              
              // Refresh data
              await loadProjectsData();
              
              analyticsService.trackEvent('project_deleted', {
                userId: user?.id,
                projectId: project.id,
                projectType: project.type,
              });
              
              showSuccess('Project deleted successfully');
            } catch (error) {
              console.error('Error deleting project:', error);
              showError('Failed to delete project');
            }
          },
        },
      ]
    );
  };

  // Handle bulk operations
  const handleBulkOperation = async (operation) => {
    if (selectedProjects.length === 0) {
      showError('No projects selected');
      return;
    }

    try {
      switch (operation) {
        case 'archive':
          await projectService.archiveProjects(selectedProjects.map(p => p.id));
          showSuccess(`${selectedProjects.length} projects archived`);
          break;
        case 'export':
          await projectService.exportProjects(selectedProjects.map(p => p.id));
          showSuccess('Projects exported successfully');
          break;
        case 'ai_optimize':
          await aiAssignmentService.optimizeProjects(selectedProjects.map(p => p.id));
          showSuccess('AI optimization applied to selected projects');
          break;
        default:
          break;
      }

      analyticsService.trackEvent('bulk_operation_performed', {
        userId: user?.id,
        operation: operation,
        projectCount: selectedProjects.length,
      });

      setSelectedProjects([]);
      await loadProjectsData();
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      showError('Failed to perform operation');
    }
  };

  // Handle project selection
  const handleProjectSelect = (project) => {
    setSelectedProjects(prev => {
      const isSelected = prev.some(p => p.id === project.id);
      if (isSelected) {
        return prev.filter(p => p.id !== project.id);
      } else {
        return [...prev, project];
      }
    });
  };

  // Handle AI project matching
  const handleAIMatching = async () => {
    try {
      const recommendations = await aiAssignmentService.getProjectRecommendations(user?.id);
      
      analyticsService.trackEvent('ai_matching_initiated', {
        userId: user?.id,
        recommendationCount: recommendations.length,
      });

      if (recommendations.length > 0) {
        router.push('/(services)/ai-matching-service');
      } else {
        showError('No AI recommendations available at this time');
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      showError('Failed to get AI recommendations');
    }
  };

  // Handle filter application
  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
    
    analyticsService.trackEvent('filters_applied', {
      userId: user?.id,
      filterCount: Object.keys(newFilters).filter(key => newFilters[key].length > 0).length,
    });
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setFilters({
      status: [],
      type: [],
      budgetRange: { min: 0, max: 1000000 },
      timeline: [],
      location: [],
      skills: [],
    });
    setSearchQuery('');
    setActiveFilter('all');
    setSortBy('newest');
    
    analyticsService.trackEvent('filters_reset', { userId: user?.id });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'planning': return '#eab308';
      case 'on_hold': return '#f97316';
      case 'completed': return '#0ea5e9';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Render stats overview
  const renderStatsOverview = () => (
    <Card style={styles.statsCard}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{stats.total}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Projects</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{stats.active}</ThemedText>
          <ThemedText style={styles.statLabel}>Active</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{stats.completed}</ThemedText>
          <ThemedText style={styles.statLabel}>Completed</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {stats.totalBudget ? (stats.totalBudget / 1000).toFixed(0) + 'K' : 0}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Total Budget (ETB)</ThemedText>
        </View>
      </View>
    </Card>
  );

  // Render search and filters
  const renderSearchAndFilters = () => (
    <Card style={styles.filtersCard}>
      <View style={styles.searchSection}>
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          style={styles.searchInput}
        />
        
        <Button
          variant="outlined"
          onPress={() => setShowFilters(!showFilters)}
          leftIcon="filter"
        >
          Filters
        </Button>
      </View>

      {showFilters && (
        <ProjectFilter
          filters={filters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          style={styles.filterSection}
        />
      )}

      <View style={styles.quickFilters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'All Projects' },
            { key: 'active', label: 'Active' },
            { key: 'planning', label: 'Planning' },
            { key: 'on_hold', label: 'On Hold' },
            { key: 'completed', label: 'Completed' },
          ].map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? 'primary' : 'outlined'}
              onPress={() => setActiveFilter(filter.key)}
              size="small"
              style={styles.quickFilterButton}
            >
              {filter.label}
            </Button>
          ))}
        </ScrollView>
      </View>

      <View style={styles.viewControls}>
        <View style={styles.sortSection}>
          <ThemedText style={styles.sortLabel}>Sort by:</ThemedText>
          <Button
            variant="ghost"
            onPress={() => {
              const sortOptions = ['newest', 'oldest', 'budget_high', 'budget_low', 'deadline', 'progress'];
              const currentIndex = sortOptions.indexOf(sortBy);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              setSortBy(sortOptions[nextIndex]);
            }}
            size="small"
          >
            {sortBy.replace('_', ' ').toUpperCase()}
          </Button>
        </View>

        <View style={styles.viewModeSection}>
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outlined'}
            onPress={() => setViewMode('grid')}
            size="small"
            leftIcon="grid"
          />
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outlined'}
            onPress={() => setViewMode('list')}
            size="small"
            leftIcon="list"
          />
        </View>
      </View>
    </Card>
  );

  // Render bulk operations
  const renderBulkOperations = () => {
    if (selectedProjects.length === 0) return null;

    return (
      <Card style={styles.bulkOperationsCard}>
        <View style={styles.bulkHeader}>
          <ThemedText style={styles.bulkTitle}>
            {selectedProjects.length} projects selected
          </ThemedText>
          <Button
            variant="ghost"
            onPress={() => setSelectedProjects([])}
            size="small"
          >
            Clear
          </Button>
        </View>

        <View style={styles.bulkActions}>
          <Button
            variant="outlined"
            onPress={() => handleBulkOperation('archive')}
            size="small"
            leftIcon="archive"
          >
            Archive
          </Button>
          <Button
            variant="outlined"
            onPress={() => handleBulkOperation('export')}
            size="small"
            leftIcon="download"
          >
            Export
          </Button>
          <Button
            variant="outlined"
            onPress={() => handleBulkOperation('ai_optimize')}
            size="small"
            leftIcon="ai"
          >
            AI Optimize
          </Button>
        </View>
      </Card>
    );
  };

  // Render projects grid/list
  const renderProjects = () => {
    if (filteredProjects.length === 0) {
      return (
        <Card style={styles.emptyState}>
          <ThemedText style={styles.emptyStateTitle}>
            No Projects Found
          </ThemedText>
          <ThemedText style={styles.emptyStateText}>
            {searchQuery || activeFilter !== 'all' || Object.values(filters).some(f => f.length > 0)
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first project'
            }
          </ThemedText>
          {!searchQuery && activeFilter === 'all' && (
            <Button onPress={handleCreateProject} style={styles.createButton}>
              Create First Project
            </Button>
          )}
        </Card>
      );
    }

    if (viewMode === 'list') {
      return (
        <View style={styles.projectsList}>
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode="list"
              isSelected={selectedProjects.some(p => p.id === project.id)}
              onSelect={() => handleProjectSelect(project)}
              onView={() => handleViewProject(project)}
              onEdit={() => handleEditProject(project)}
              onDelete={() => handleDeleteProject(project)}
              style={styles.projectCard}
            />
          ))}
        </View>
      );
    }

    // Grid view
    return (
      <View style={styles.projectsGrid}>
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            viewMode="grid"
            isSelected={selectedProjects.some(p => p.id === project.id)}
            onSelect={() => handleProjectSelect(project)}
            onView={() => handleViewProject(project)}
            onEdit={() => handleEditProject(project)}
            onDelete={() => handleDeleteProject(project)}
            style={styles.projectCard}
          />
        ))}
      </View>
    );
  };

  // Render action buttons
  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <Button
        variant="primary"
        onPress={handleCreateProject}
        leftIcon="add"
        style={styles.actionButton}
      >
        New Project
      </Button>
      
      <Button
        variant="outlined"
        onPress={handleAIMatching}
        leftIcon="ai"
        style={styles.actionButton}
      >
        AI Matching
      </Button>
    </View>
  );

  if (isLoading) {
    return <Loading message="Loading your projects..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadProjectsData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        {renderStatsOverview()}

        {/* Search and Filters */}
        {renderSearchAndFilters()}

        {/* Bulk Operations */}
        {renderBulkOperations()}

        {/* Projects List/Grid */}
        {renderProjects()}

        {/* Spacer for floating action buttons */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.floatingActions}>
        {renderActionButtons()}
      </View>
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  filtersCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  searchSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
  },
  filterSection: {
    marginBottom: 16,
  },
  quickFilters: {
    marginBottom: 16,
  },
  quickFilterButton: {
    marginRight: 8,
  },
  viewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  viewModeSection: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkOperationsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  projectsList: {
    gap: 12,
    padding: 16,
  },
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  projectCard: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  createButton: {
    minWidth: 200,
  },
  spacer: {
    height: 80,
  },
  floatingActions: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
};

export default ProjectListScreen;