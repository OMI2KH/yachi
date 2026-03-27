// screens/government/worker-management.js
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGovernmentProjects } from '../../contexts/construction-context';
import { useAuth } from '../../contexts/auth-context';
import { useNotifications } from '../../contexts/notification-context';

// Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Card from '../../components/ui/card';
import Badge from '../../components/ui/badge';
import Loading from '../../components/ui/loading';
import ConfirmationModal from '../../components/ui/confirmation-modal';
import WorkerProfile from '../../components/profile/worker-profile';
import SkillTags from '../../components/profile/skill-tags';
import Rating from '../../components/ui/rating';

// Services
import { 
  getAvailableWorkers, 
  assignWorkerToProject, 
  removeWorkerFromProject,
  updateWorkerStatus 
} from '../../services/construction-service';
import { useWorkerMatching } from '../../hooks/use-worker-matching';
import { sendNotification } from '../../services/notification-service';

// Utils
import { formatDistance, formatDate } from '../../utils/formatters';
import { validateWorkerAssignment } from '../../utils/validators';

const WorkerManagement = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { currentProject, refreshProject } = useGovernmentProjects();
  const { showNotification } = useNotifications();
  const { getAIMatches } = useWorkerMatching();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [aiMatching, setAiMatching] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  // Available skills filter
  const skills = [
    { id: 'all', label: 'All Skills' },
    { id: 'carpenter', label: 'Carpentry' },
    { id: 'mason', label: 'Masonry' },
    { id: 'plumber', label: 'Plumbing' },
    { id: 'electrician', label: 'Electrical' },
    { id: 'painter', label: 'Painting' },
    { id: 'welder', label: 'Welding' },
    { id: 'foreman', label: 'Foreman' },
    { id: 'laborer', label: 'General Labor' },
  ];

  // Status options
  const statusOptions = [
    { id: 'all', label: 'All Status' },
    { id: 'available', label: 'Available' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'unavailable', label: 'Unavailable' },
  ];

  // Load workers data
  const loadWorkers = useCallback(async () => {
    if (!currentProject) return;

    setLoadingWorkers(true);
    try {
      const [availableResult, assignedResult] = await Promise.all([
        getAvailableWorkers(currentProject.location),
        Promise.resolve({ success: true, workers: currentProject.assignedWorkers || [] })
      ]);

      if (availableResult.success) {
        setWorkers(availableResult.workers);
      }
      
      if (assignedResult.success) {
        setAssignedWorkers(assignedResult.workers);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      showNotification('error', 'Failed to load workers data');
    } finally {
      setLoadingWorkers(false);
    }
  }, [currentProject, showNotification]);

  // Get AI worker suggestions
  const getAIWorkerSuggestions = useCallback(async () => {
    if (!currentProject) return;

    setAiMatching(true);
    try {
      const suggestions = await getAIMatches(currentProject);
      setAiSuggestions(suggestions);
      showNotification('success', `AI found ${suggestions.length} optimal worker matches`);
    } catch (error) {
      console.error('AI matching error:', error);
      showNotification('error', 'AI matching failed');
    } finally {
      setAiMatching(false);
    }
  }, [currentProject, getAIMatches, showNotification]);

  // Filter workers based on search and filters
  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      const matchesSearch = 
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSkill = selectedSkill === 'all' || worker.skills.includes(selectedSkill);
      const matchesStatus = statusFilter === 'all' || worker.status === statusFilter;
      
      return matchesSearch && matchesSkill && matchesStatus;
    });
  }, [workers, searchQuery, selectedSkill, statusFilter]);

  // Check if worker is assigned to current project
  const isWorkerAssigned = useCallback((workerId) => {
    return assignedWorkers.some(worker => worker.id === workerId);
  }, [assignedWorkers]);

  // Handle worker assignment
  const handleAssignWorker = useCallback(async (worker) => {
    if (!currentProject) {
      showNotification('error', 'No project selected');
      return;
    }

    // Validate assignment
    const validation = validateWorkerAssignment(worker, currentProject);
    if (!validation.valid) {
      showNotification('error', validation.message);
      return;
    }

    try {
      const result = await assignWorkerToProject(currentProject.id, worker.id, user.id);
      
      if (result.success) {
        showNotification('success', `${worker.name} assigned to project`);
        
        // Refresh data
        await Promise.all([loadWorkers(), refreshProject()]);
        
        // Notify worker
        await sendNotification({
          type: 'PROJECT_ASSIGNMENT',
          title: 'New Project Assignment',
          message: `You have been assigned to project: ${currentProject.name}`,
          recipientIds: [worker.id],
          data: { projectId: currentProject.id, projectName: currentProject.name }
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Worker assignment error:', error);
      showNotification('error', 'Failed to assign worker');
    }
  }, [currentProject, user, loadWorkers, refreshProject, showNotification]);

  // Handle worker removal
  const handleRemoveWorker = useCallback(async (worker) => {
    try {
      const result = await removeWorkerFromProject(currentProject.id, worker.id, user.id);
      
      if (result.success) {
        showNotification('success', `${worker.name} removed from project`);
        
        // Refresh data
        await Promise.all([loadWorkers(), refreshProject()]);
        
        // Notify worker
        await sendNotification({
          type: 'PROJECT_REMOVAL',
          title: 'Project Assignment Removed',
          message: `You have been removed from project: ${currentProject.name}`,
          recipientIds: [worker.id],
          data: { projectId: currentProject.id }
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Worker removal error:', error);
      showNotification('error', 'Failed to remove worker');
    } finally {
      setActionModalVisible(false);
      setSelectedWorker(null);
    }
  }, [currentProject, user, loadWorkers, refreshProject, showNotification]);

  // Handle worker status update
  const handleUpdateStatus = useCallback(async (workerId, newStatus) => {
    try {
      const result = await updateWorkerStatus(workerId, newStatus, user.id);
      
      if (result.success) {
        showNotification('success', 'Worker status updated');
        await loadWorkers();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Status update error:', error);
      showNotification('error', 'Failed to update worker status');
    }
  }, [user, loadWorkers, showNotification]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkers();
    setRefreshing(false);
  }, [loadWorkers]);

  // Load data on mount
  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  // Render worker item
  const renderWorkerItem = useCallback(({ item: worker }) => {
    const assigned = isWorkerAssigned(worker.id);
    
    return (
      <Card style={styles.workerCard}>
        <View style={styles.workerHeader}>
          <View style={styles.workerInfo}>
            <View style={styles.workerNameRow}>
              <ThemedText style={styles.workerName}>{worker.name}</ThemedText>
              <Badge variant={getStatusVariant(worker.status)} size="small">
                {worker.status}
              </Badge>
            </View>
            
            <View style={styles.workerMeta}>
              <Rating value={worker.rating} size={16} />
              <ThemedText style={styles.workerMetaText}>
                {worker.rating} • {worker.completedProjects} projects
              </ThemedText>
            </View>
            
            <ThemedText style={styles.workerLocation}>
              📍 {formatDistance(worker.distance)} away
            </ThemedText>
          </View>
          
          <View style={styles.workerImage}>
            {/* Worker avatar would go here */}
            <View style={styles.avatarPlaceholder} />
          </View>
        </View>

        <SkillTags 
          skills={worker.skills} 
          maxVisible={3}
          style={styles.skillsSection}
        />

        <View style={styles.workerStats}>
          <View style={styles.stat}>
            <ThemedText style={styles.statValue}>{worker.successRate}%</ThemedText>
            <ThemedText style={styles.statLabel}>Success</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText style={styles.statValue}>{worker.responseTime}h</ThemedText>
            <ThemedText style={styles.statLabel}>Response</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText style={styles.statValue}>{worker.yearsExperience}+</ThemedText>
            <ThemedText style={styles.statLabel}>Years</ThemedText>
          </View>
        </View>

        <View style={styles.workerActions}>
          {assigned ? (
            <Button
              variant="destructive"
              size="small"
              onPress={() => {
                setSelectedWorker(worker);
                setActionModalVisible(true);
              }}
            >
              Remove from Project
            </Button>
          ) : (
            <Button
              variant="primary"
              size="small"
              onPress={() => handleAssignWorker(worker)}
              disabled={worker.status !== 'available'}
            >
              {worker.status === 'available' ? 'Assign to Project' : 'Unavailable'}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="small"
            onPress={() => router.push(`/worker-profile/${worker.id}`)}
          >
            View Profile
          </Button>
        </View>
      </Card>
    );
  }, [isWorkerAssigned, handleAssignWorker, router]);

  // Render assigned worker item
  const renderAssignedWorkerItem = useCallback(({ item: worker }) => (
    <Card style={[styles.workerCard, styles.assignedWorkerCard]}>
      <View style={styles.workerHeader}>
        <View style={styles.workerInfo}>
          <ThemedText style={styles.workerName}>{worker.name}</ThemedText>
          <ThemedText style={styles.workerRole}>{worker.role}</ThemedText>
          <ThemedText style={styles.assignedSince}>
            Assigned: {formatDate(worker.assignedSince)}
          </ThemedText>
        </View>
        <Badge variant="success">Active</Badge>
      </View>

      <View style={styles.assignedActions}>
        <Button
          variant="outline"
          size="small"
          onPress={() => router.push(`/worker-profile/${worker.id}`)}
        >
          Progress
        </Button>
        <Button
          variant="destructive"
          size="small"
          onPress={() => {
            setSelectedWorker(worker);
            setActionModalVisible(true);
          }}
        >
          Remove
        </Button>
      </View>
    </Card>
  ), [router]);

  // Helper functions
  const getStatusVariant = (status) => {
    const variants = {
      available: 'success',
      assigned: 'primary',
      unavailable: 'danger',
      busy: 'warning'
    };
    return variants[status] || 'default';
  };

  if (loadingWorkers && !refreshing) {
    return (
      <ThemedView style={styles.container}>
        <Loading message="Loading workers data..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Worker Management</ThemedText>
        <ThemedText style={styles.subtitle}>
          {currentProject ? `Project: ${currentProject.name}` : 'No project selected'}
        </ThemedText>
      </View>

      {/* AI Matching Section */}
      <Card style={styles.aiSection}>
        <View style={styles.aiHeader}>
          <View>
            <ThemedText style={styles.aiTitle}>AI Worker Matching</ThemedText>
            <ThemedText style={styles.aiDescription}>
              Let our AI find the perfect workers for your project requirements
            </ThemedText>
          </View>
          <Button
            variant="primary"
            onPress={getAIWorkerSuggestions}
            loading={aiMatching}
            disabled={!currentProject}
          >
            Find Matches
          </Button>
        </View>

        {aiSuggestions.length > 0 && (
          <View style={styles.aiResults}>
            <ThemedText style={styles.aiResultsTitle}>
              AI Suggestions ({aiSuggestions.length} workers)
            </ThemedText>
            <FlatList
              horizontal
              data={aiSuggestions}
              keyExtractor={(item) => item.worker.id}
              renderItem={({ item }) => (
                <Card style={styles.aiSuggestionCard}>
                  <ThemedText style={styles.aiWorkerName}>
                    {item.worker.name}
                  </ThemedText>
                  <ThemedText style={styles.aiMatchScore}>
                    Match: {item.matchScore}%
                  </ThemedText>
                  <Button
                    variant="primary"
                    size="small"
                    onPress={() => handleAssignWorker(item.worker)}
                  >
                    Assign
                  </Button>
                </Card>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
      </Card>

      {/* Assigned Workers Section */}
      {assignedWorkers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Assigned Workers ({assignedWorkers.length})
            </ThemedText>
          </View>
          <FlatList
            data={assignedWorkers}
            keyExtractor={(item) => item.id}
            renderItem={renderAssignedWorkerItem}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Search and Filters */}
      <Card style={styles.filtersCard}>
        <Input
          placeholder="Search workers by name or skill..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        
        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={skills}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Button
                variant={selectedSkill === item.id ? 'primary' : 'outline'}
                size="small"
                onPress={() => setSelectedSkill(item.id)}
                style={styles.filterButton}
              >
                {item.label}
              </Button>
            )}
            showsHorizontalScrollIndicator={false}
            style={styles.filtersList}
          />
        </View>

        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={statusOptions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Button
                variant={statusFilter === item.id ? 'primary' : 'outline'}
                size="small"
                onPress={() => setStatusFilter(item.id)}
                style={styles.filterButton}
              >
                {item.label}
              </Button>
            )}
            showsHorizontalScrollIndicator={false}
            style={styles.filtersList}
          />
        </View>
      </Card>

      {/* Available Workers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>
            Available Workers ({filteredWorkers.length})
          </ThemedText>
          <Button
            variant="outline"
            size="small"
            onPress={loadWorkers}
          >
            Refresh
          </Button>
        </View>

        {filteredWorkers.length === 0 ? (
          <Card style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>
              {searchQuery || selectedSkill !== 'all' || statusFilter !== 'all'
                ? 'No workers match your filters' 
                : 'No available workers in this area'}
            </ThemedText>
            <Button
              variant="outline"
              onPress={() => {
                setSearchQuery('');
                setSelectedSkill('all');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Card>
        ) : (
          <FlatList
            data={filteredWorkers}
            keyExtractor={(item) => item.id}
            renderItem={renderWorkerItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.workersList}
          />
        )}
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={actionModalVisible}
        title="Remove Worker"
        message={`Are you sure you want to remove ${selectedWorker?.name} from this project?`}
        confirmText="Remove"
        cancelText="Keep"
        onConfirm={() => handleRemoveWorker(selectedWorker)}
        onCancel={() => {
          setActionModalVisible(false);
          setSelectedWorker(null);
        }}
        variant="destructive"
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  aiSection: {
    marginBottom: 24,
    padding: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  aiResults: {
    marginTop: 16,
  },
  aiResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  aiSuggestionCard: {
    padding: 12,
    marginRight: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  aiWorkerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiMatchScore: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  filtersCard: {
    marginBottom: 24,
    padding: 16,
  },
  searchInput: {
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 8,
  },
  filtersList: {
    marginHorizontal: -4,
  },
  filterButton: {
    marginHorizontal: 4,
  },
  workersList: {
    paddingBottom: 16,
  },
  workerCard: {
    marginBottom: 12,
    padding: 16,
  },
  assignedWorkerCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerMetaText: {
    fontSize: 14,
    opacity: 0.7,
    marginLeft: 8,
  },
  workerLocation: {
    fontSize: 14,
    opacity: 0.7,
  },
  workerRole: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  assignedSince: {
    fontSize: 12,
    opacity: 0.6,
  },
  workerImage: {
    marginLeft: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
  },
  skillsSection: {
    marginBottom: 12,
  },
  workerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  workerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assignedActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default WorkerManagement;