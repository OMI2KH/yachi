import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { TabView } from '../../components/ui/tabview';
import { ServiceFilter } from '../../components/service/service-filter';
import { ServiceList } from '../../components/service/service-list';
import { StatsCard } from '../../components/admin/stats-card';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useDebounce } from '../../hooks/use-debounce';
import { governmentService } from '../../services/government-service';
import { analyticsService } from '../../services/analytics-service';
import { formatters } from '../../utils/formatters';
import { governmentConstants } from '../../constants/government';

/**
 * Government Projects Management Screen
 * 
 * Central dashboard for managing all government construction projects
 * with advanced filtering, analytics, and bulk operations
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const GovernmentProjectsScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    status: [],
    region: [],
    projectType: [],
    priority: [],
    budgetRange: { min: 0, max: 100000000 },
    dateRange: { start: null, end: null },
    assignedAgency: [],
  });

  const debouncedSearch = useDebounce(searchQuery, 300);

  /**
   * Fetch projects and statistics
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [projectsData, statsData] = await Promise.all([
        governmentService.getGovernmentProjects(user.agency),
        governmentService.getProjectStatistics(user.agency),
      ]);

      setProjects(projectsData || []);
      setStats(statsData);
      
      // Track dashboard view
      analyticsService.trackDashboardView('government_projects', user.id);
    } catch (error) {
      console.error('Failed to fetch government projects:', error);
      Alert.alert('Error', 'Unable to load projects data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.agency, user.id]);

  /**
   * Refresh data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Filter and search projects
   */
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...projects];

      // Tab filtering
      if (activeTab !== 'all') {
        filtered = filtered.filter(project => project.status === activeTab);
      }

      // Search filtering
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        filtered = filtered.filter(project =>
          project.title.toLowerCase().includes(query) ||
          project.projectCode.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query) ||
          project.location.region.toLowerCase().includes(query)
        );
      }

      // Status filtering
      if (filters.status.length > 0) {
        filtered = filtered.filter(project =>
          filters.status.includes(project.status)
        );
      }

      // Region filtering
      if (filters.region.length > 0) {
        filtered = filtered.filter(project =>
          filters.region.includes(project.location.region)
        );
      }

      // Project type filtering
      if (filters.projectType.length > 0) {
        filtered = filtered.filter(project =>
          filters.projectType.includes(project.projectType)
        );
      }

      // Priority filtering
      if (filters.priority.length > 0) {
        filtered = filtered.filter(project =>
          filters.priority.includes(project.priorityLevel)
        );
      }

      // Budget range filtering
      filtered = filtered.filter(project =>
        project.totalBudget >= filters.budgetRange.min &&
        project.totalBudget <= filters.budgetRange.max
      );

      // Date range filtering
      if (filters.dateRange.start) {
        filtered = filtered.filter(project =>
          new Date(project.startDate) >= new Date(filters.dateRange.start)
        );
      }

      if (filters.dateRange.end) {
        filtered = filtered.filter(project =>
          new Date(project.startDate) <= new Date(filters.dateRange.end)
        );
      }

      // Agency filtering
      if (filters.assignedAgency.length > 0) {
        filtered = filtered.filter(project =>
          filters.assignedAgency.includes(project.assignedAgency)
        );
      }

      setFilteredProjects(filtered);
    };

    applyFilters();
  }, [projects, activeTab, debouncedSearch, filters]);

  /**
   * Get projects for current tab
   */
  const tabProjects = useMemo(() => {
    return filteredProjects;
  }, [filteredProjects]);

  /**
   * Get status count for tabs
   */
  const getStatusCount = (status) => {
    return projects.filter(project => project.status === status).length;
  };

  /**
   * Handle project press
   */
  const handleProjectPress = (project) => {
    navigation.navigate('GovernmentProjectDetail', { 
      projectId: project.id,
      projectTitle: project.title 
    });
    
    // Track project view
    analyticsService.trackProjectSelect(project.id, user.id);
  };

  /**
   * Handle create new project
   */
  const handleCreateProject = () => {
    navigation.navigate('CreateGovernmentProject');
  };

  /**
   * Handle bulk status update
   */
  const handleBulkStatusUpdate = async (newStatus, projectIds) => {
    try {
      setBulkActionLoading(true);
      
      const result = await governmentService.bulkUpdateProjectStatus(
        projectIds,
        newStatus,
        user.id
      );

      if (result.success) {
        // Update local state
        setProjects(prev => prev.map(project =>
          projectIds.includes(project.id)
            ? { ...project, status: newStatus }
            : project
        ));
        
        Alert.alert('Success', `${projectIds.length} projects updated to ${formatters.formatProjectStatus(newStatus)}`);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Bulk status update failed:', error);
      Alert.alert('Update Failed', error.message || 'Unable to update projects.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  /**
   * Handle project export
   */
  const handleExportProjects = async (exportType = 'excel') => {
    try {
      const exportData = await governmentService.exportProjects(
        filteredProjects.map(p => p.id),
        exportType,
        user.id
      );

      if (exportData?.url) {
        Alert.alert(
          'Export Ready',
          `Projects have been exported successfully.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Error', 'Unable to export projects data.');
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    const statusColors = {
      draft: colors.info,
      pending_approval: colors.warning,
      approved: colors.success,
      in_progress: colors.primary,
      paused: colors.warning,
      completed: colors.success,
      cancelled: colors.error,
    };
    
    return statusColors[status] || colors.default;
  };

  /**
   * Render project card
   */
  const renderProjectCard = (project) => (
    <Card 
      key={project.id}
      style={styles.projectCard}
      onPress={() => handleProjectPress(project)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleSection}>
          <ThemedText type="subtitle" style={styles.projectTitle}>
            {project.title}
          </ThemedText>
          <ThemedText type="default" style={styles.projectCode}>
            {project.projectCode}
          </ThemedText>
        </View>
        
        <Badge
          text={formatters.formatProjectStatus(project.status)}
          color={getStatusColor(project.status)}
          size="small"
        />
      </View>

      <ThemedText type="default" style={styles.projectDescription} numberOfLines={2}>
        {project.description}
      </ThemedText>

      <View style={styles.projectMeta}>
        <View style={styles.metaItem}>
          <ThemedText type="defaultSemiBold">Location:</ThemedText>
          <ThemedText type="default" style={styles.metaValue}>
            {project.location.region}
          </ThemedText>
        </View>
        
        <View style={styles.metaItem}>
          <ThemedText type="defaultSemiBold">Budget:</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.metaValue}>
            {formatters.formatCurrency(project.totalBudget, 'ETB')}
          </ThemedText>
        </View>
        
        <View style={styles.metaItem}>
          <ThemedText type="defaultSemiBold">Workers:</ThemedText>
          <ThemedText type="default" style={styles.metaValue}>
            {project.assignedWorkers || 0} / {project.requiredWorkers?.total || 0}
          </ThemedText>
        </View>
      </View>

      <View style={styles.projectFooter}>
        <View style={styles.dateInfo}>
          <ThemedText type="default" style={styles.dateText}>
            Start: {formatters.formatDate(project.startDate)}
          </ThemedText>
          {project.estimatedEndDate && (
            <ThemedText type="default" style={styles.dateText}>
              Est. End: {formatters.formatDate(project.estimatedEndDate)}
            </ThemedText>
          )}
        </View>
        
        <View style={styles.progressContainer}>
          <ThemedText type="default" style={styles.progressText}>
            {project.progress || 0}%
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  /**
   * Tab configuration
   */
  const tabs = [
    {
      key: 'all',
      title: `All Projects (${projects.length})`,
    },
    {
      key: 'in_progress',
      title: `In Progress (${getStatusCount('in_progress')})`,
    },
    {
      key: 'pending_approval',
      title: `Pending Approval (${getStatusCount('pending_approval')})`,
    },
    {
      key: 'approved',
      title: `Approved (${getStatusCount('approved')})`,
    },
    {
      key: 'completed',
      title: `Completed (${getStatusCount('completed')})`,
    },
  ];

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading government projects..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="title" style={styles.title}>
            Government Projects
          </ThemedText>
          
          <Button
            title="New Project"
            onPress={handleCreateProject}
            variant="primary"
            size="small"
            icon="plus"
          />
        </View>
        
        <ThemedText type="default" style={styles.subtitle}>
          Manage construction projects and workforce allocation
        </ThemedText>
      </View>

      {/* Statistics Overview */}
      {stats && (
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContent}
        >
          <StatsCard
            title="Total Projects"
            value={stats.totalProjects}
            change={stats.projectsChange}
            icon="building"
            color={colors.primary}
          />
          
          <StatsCard
            title="Active Workers"
            value={stats.activeWorkers}
            change={stats.workersChange}
            icon="users"
            color={colors.success}
          />
          
          <StatsCard
            title="Total Budget"
            value={formatters.formatCurrency(stats.totalBudget, 'ETB')}
            change={stats.budgetChange}
            icon="dollar-sign"
            color={colors.warning}
          />
          
          <StatsCard
            title="Completion Rate"
            value={`${stats.completionRate}%`}
            change={stats.completionChange}
            icon="trending-up"
            color={colors.info}
          />
        </ScrollView>
      )}

      {/* Search and Filters */}
      <Card style={styles.controlsCard}>
        <View style={styles.controlsRow}>
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            icon="search"
            clearButtonMode="while-editing"
          />
          
          <Button
            title="Filters"
            onPress={() => setShowFilters(true)}
            variant="secondary"
            size="small"
            icon="filter"
          />
          
          <Button
            title="Export"
            onPress={() => handleExportProjects()}
            variant="outline"
            size="small"
            icon="download"
          />
        </View>

        {/* Active filters display */}
        {Object.values(filters).some(filter => 
          Array.isArray(filter) ? filter.length > 0 : 
          typeof filter === 'object' && filter !== null ? 
          Object.values(filter).some(val => val !== null && val !== 0) : 
          false
        ) && (
          <View style={styles.activeFilters}>
            <ThemedText type="defaultSemiBold" style={styles.filtersLabel}>
              Active Filters:
            </ThemedText>
            
            <View style={styles.filterChips}>
              {/* Filter chips would be rendered here */}
              <Button
                title="Clear All"
                onPress={() => setFilters({
                  status: [],
                  region: [],
                  projectType: [],
                  priority: [],
                  budgetRange: { min: 0, max: 100000000 },
                  dateRange: { start: null, end: null },
                  assignedAgency: [],
                })}
                variant="text"
                size="small"
              />
            </View>
          </View>
        )}
      </Card>

      {/* Projects Tabs */}
      <TabView
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabView}
      />

      {/* Projects List */}
      <View style={styles.projectsContainer}>
        {tabProjects.length > 0 ? (
          <ScrollView
            style={styles.projectsScroll}
            contentContainerStyle={styles.projectsContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
              />
            }
          >
            {tabProjects.map(renderProjectCard)}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <ThemedText type="title" style={styles.emptyTitle}>
              No Projects Found
            </ThemedText>
            <ThemedText type="default" style={styles.emptyText}>
              {debouncedSearch || Object.values(filters).some(f => 
                Array.isArray(f) ? f.length > 0 : false
              ) 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first government project'
              }
            </ThemedText>
            
            {!debouncedSearch && Object.values(filters).every(f => 
              Array.isArray(f) ? f.length === 0 : true
            ) && (
              <Button
                title="Create First Project"
                onPress={handleCreateProject}
                variant="primary"
                style={styles.emptyButton}
              />
            )}
          </View>
        )}
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Projects"
        size="medium"
      >
        <ServiceFilter
          filters={filters}
          onFiltersChange={setFilters}
          filterConfig={governmentConstants.PROJECT_FILTERS}
          onApply={() => setShowFilters(false)}
          onReset={() => setFilters({
            status: [],
            region: [],
            projectType: [],
            priority: [],
            budgetRange: { min: 0, max: 100000000 },
            dateRange: { start: null, end: null },
            assignedAgency: [],
          })}
        />
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    flex: 1,
  },
  subtitle: {
    opacity: 0.7,
    lineHeight: 20,
  },
  statsScroll: {
    marginHorizontal: 16,
  },
  statsContent: {
    paddingRight: 16,
    gap: 12,
  },
  controlsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filtersLabel: {
    fontSize: 14,
  },
  filterChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabView: {
    marginHorizontal: 16,
  },
  projectsContainer: {
    flex: 1,
  },
  projectsScroll: {
    flex: 1,
  },
  projectsContent: {
    padding: 16,
    gap: 12,
  },
  projectCard: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleSection: {
    flex: 1,
    gap: 4,
  },
  projectTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  projectCode: {
    fontSize: 14,
    opacity: 0.6,
  },
  projectDescription: {
    lineHeight: 20,
    opacity: 0.8,
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    gap: 2,
    minWidth: '30%',
  },
  metaValue: {
    fontSize: 14,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  dateInfo: {
    gap: 2,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.7,
  },
  progressContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 8,
  },
});

export default GovernmentProjectsScreen;