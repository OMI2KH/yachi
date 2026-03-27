// components/construction/worker-assignment.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';

// Contexts
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Button from '../ui/button';
import Card from '../ui/card';
import Badge from '../ui/badge';
import Loading from '../ui/loading';
import Input from '../ui/input';
import Modal from '../ui/modal';
import Avatar from '../ui/avatar';

// Services
import { constructionService } from '../../services/construction-service';
import { workerService } from '../../services/worker-service';
import { notificationService } from '../../services/notification-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Utils
import { formatCurrency, formatDistance } from '../../utils/formatters';
import { calculateWorkerMatchScore } from '../../utils/ai-matching-algorithm';

// Constants
import { 
  CONSTRUCTION_TYPES,
  WORKER_SKILLS,
  WORKER_LEVELS,
  ASSIGNMENT_STATUS 
} from '../../constants/government';
import { COLORS } from '../../constants/colors';

/**
 * AI-Powered Worker Assignment Component
 * 🤖 Smart worker matching based on skills, location, ratings, and project requirements
 * 🎯 Ethiopian construction worker database integration
 */

const WorkerAssignment = ({
  project,
  onAssign,
  onCancel,
  enableAIRecommendations = true,
  maxWorkers = 50, // Government scale projects
  testID = 'worker-assignment',
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    skills: [],
    location: '',
    minRating: 0,
    availability: 'available',
  });
  const [showWorkerDetails, setShowWorkerDetails] = useState(null);
  const [assignmentNote, setAssignmentNote] = useState('');

  // Project requirements based on construction type
  const projectRequirements = useMemo(() => {
    if (!project) return { requiredSkills: [], teamSize: 0 };
    
    const requirements = {
      [CONSTRUCTION_TYPES.NEW_BUILDING]: {
        requiredSkills: [
          WORKER_SKILLS.MASONRY,
          WORKER_SKILLS.CARPENTRY,
          WORKER_SKILLS.PLUMBING,
          WORKER_SKILLS.ELECTRICAL,
          WORKER_SKILLS.REINFORCEMENT
        ],
        teamSize: Math.ceil((project.squareArea || 100) / 50), // 1 worker per 50m²
      },
      [CONSTRUCTION_TYPES.FINISHING]: {
        requiredSkills: [
          WORKER_SKILLS.PAINTING,
          WORKER_SKILLS.TILING,
          WORKER_SKILLS.PLUMBING_FIXTURES,
          WORKER_SKILLS.ELECTRICAL_FIXTURES
        ],
        teamSize: Math.ceil((project.squareArea || 100) / 30), // 1 worker per 30m²
      },
      [CONSTRUCTION_TYPES.INFRASTRUCTURE]: {
        requiredSkills: [
          WORKER_SKILLS.HEAVY_EQUIPMENT,
          WORKER_SKILLS.ROAD_WORKS,
          WORKER_SKILLS.BRIDGE_WORKS,
          WORKER_SKILLS.REINFORCEMENT
        ],
        teamSize: project.teamSize || 20, // Large teams for infrastructure
      },
      [CONSTRUCTION_TYPES.RENOVATION]: {
        requiredSkills: [
          WORKER_SKILLS.DEMOLITION,
          WORKER_SKILLS.MASONRY,
          WORKER_SKILLS.CARPENTRY,
          WORKER_SKILLS.PAINTING
        ],
        teamSize: Math.ceil((project.squareArea || 100) / 40), // 1 worker per 40m²
      },
    };

    return requirements[project.constructionType] || requirements[CONSTRUCTION_TYPES.NEW_BUILDING];
  }, [project]);

  // Load available workers
  useEffect(() => {
    loadWorkers();
  }, [project]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      
      const result = await workerService.getAvailableWorkers({
        location: project?.location,
        requiredSkills: projectRequirements.requiredSkills,
        constructionType: project?.constructionType,
      });

      if (result.success) {
        setWorkers(result.data.workers || []);
        
        // Generate AI recommendations
        if (enableAIRecommendations && result.data.workers.length > 0) {
          generateAIRecommendations(result.data.workers);
        }
      } else {
        throw new Error(result.message || 'Failed to load workers');
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
      errorService.handleError(error, {
        context: 'WorkerAssignment',
        component: 'WorkerAssignment',
        projectId: project?.id,
      });
      
      notificationService.show({
        type: 'error',
        title: 'Load Failed',
        message: 'Unable to load available workers',
      });
    } finally {
      setLoading(false);
    }
  };

  // AI-powered worker recommendations
  const generateAIRecommendations = useCallback(async (workerList) => {
    if (!project || !workerList.length) return;

    try {
      const recommendations = await constructionService.getAIWorkerRecommendations({
        project: {
          id: project.id,
          type: project.constructionType,
          location: project.location,
          budget: project.budget,
          requirements: projectRequirements,
        },
        workers: workerList,
        teamSize: projectRequirements.teamSize,
      });

      setAiRecommendations(recommendations || []);
      
      // Auto-select AI recommended workers
      if (recommendations?.topMatches) {
        const recommendedIds = new Set(recommendations.topMatches.map(w => w.id));
        setSelectedWorkers(recommendedIds);
      }
    } catch (error) {
      console.error('AI recommendation failed:', error);
      // Continue without AI recommendations
    }
  }, [project, projectRequirements]);

  // Filter workers based on search and filters
  const filteredWorkers = useMemo(() => {
    let filtered = workers;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(worker =>
        worker.name?.toLowerCase().includes(query) ||
        worker.skills?.some(skill => skill.toLowerCase().includes(query)) ||
        worker.location?.toLowerCase().includes(query)
      );
    }

    // Apply skills filter
    if (filters.skills.length > 0) {
      filtered = filtered.filter(worker =>
        filters.skills.every(skill => worker.skills?.includes(skill))
      );
    }

    // Apply rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(worker => worker.rating >= filters.minRating);
    }

    // Apply availability filter
    if (filters.availability !== 'all') {
      filtered = filtered.filter(worker => worker.status === filters.availability);
    }

    // Sort by AI match score if available
    if (aiRecommendations.length > 0) {
      filtered.sort((a, b) => {
        const aScore = aiRecommendations.find(r => r.id === a.id)?.matchScore || 0;
        const bScore = aiRecommendations.find(r => r.id === b.id)?.matchScore || 0;
        return bScore - aScore;
      });
    } else {
      // Default sort by rating and experience
      filtered.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.experience - a.experience;
      });
    }

    return filtered;
  }, [workers, searchQuery, filters, aiRecommendations]);

  // Calculate worker match score
  const getWorkerMatchScore = (worker) => {
    if (!aiRecommendations.length) return 0;
    
    const recommendation = aiRecommendations.find(r => r.id === worker.id);
    return recommendation?.matchScore || calculateWorkerMatchScore(worker, project, projectRequirements);
  };

  // Handle worker selection
  const handleWorkerSelect = (workerId) => {
    const newSelected = new Set(selectedWorkers);
    
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId);
    } else {
      if (newSelected.size >= maxWorkers) {
        Alert.alert(
          'Maximum Workers Reached',
          `You can only select up to ${maxWorkers} workers for this project.`,
          [{ text: 'OK' }]
        );
        return;
      }
      newSelected.add(workerId);
    }
    
    setSelectedWorkers(newSelected);
  };

  // Handle bulk AI selection
  const handleAISelect = () => {
    if (!aiRecommendations.length) return;
    
    const topWorkers = aiRecommendations
      .slice(0, projectRequirements.teamSize)
      .map(rec => rec.id);
    
    setSelectedWorkers(new Set(topWorkers));
    
    notificationService.show({
      type: 'success',
      title: 'AI Selection Complete',
      message: `AI has selected ${topWorkers.length} optimal workers for your project`,
    });
  };

  // Handle worker assignment
  const handleAssignment = async () => {
    if (selectedWorkers.size === 0) {
      Alert.alert('No Workers Selected', 'Please select at least one worker to assign.');
      return;
    }

    try {
      setLoading(true);

      const assignmentData = {
        projectId: project.id,
        workerIds: Array.from(selectedWorkers),
        assignedBy: user.id,
        note: assignmentNote,
        assignmentType: 'ai_recommended',
      };

      const result = await constructionService.assignWorkers(assignmentData);

      if (result.success) {
        notificationService.show({
          type: 'success',
          title: 'Workers Assigned',
          message: `${selectedWorkers.size} workers assigned to project successfully`,
        });

        analyticsService.track('workers_assigned', {
          projectId: project.id,
          workerCount: selectedWorkers.size,
          assignmentType: 'government_portal',
          constructionType: project.constructionType,
        });

        if (onAssign) {
          onAssign(project.id, Array.from(selectedWorkers));
        }
      } else {
        throw new Error(result.message || 'Assignment failed');
      }
    } catch (error) {
      console.error('Worker assignment failed:', error);
      notificationService.show({
        type: 'error',
        title: 'Assignment Failed',
        message: 'Unable to assign workers to project',
      });
    } finally {
      setLoading(false);
    }
  };

  // Render worker card
  const renderWorkerCard = (worker) => {
    const isSelected = selectedWorkers.has(worker.id);
    const matchScore = getWorkerMatchScore(worker);
    const distance = worker.distance ? formatDistance(worker.distance) : 'Unknown';

    return (
      <TouchableOpacity
        key={worker.id}
        style={[
          styles.workerCard,
          isSelected && [styles.selectedWorkerCard, { borderColor: theme.colors.primary }],
        ]}
        onPress={() => handleWorkerSelect(worker.id)}
        onLongPress={() => setShowWorkerDetails(worker)}
      >
        <View style={styles.workerHeader}>
          <View style={styles.workerInfo}>
            <Avatar
              source={worker.avatar}
              name={worker.name}
              size={50}
            />
            <View style={styles.workerDetails}>
              <ThemedText type="body" weight="semiBold" numberOfLines={1}>
                {worker.name}
              </ThemedText>
              <ThemedText type="caption" color="secondary" numberOfLines={1}>
                {worker.specialization}
              </ThemedText>
              <View style={styles.workerMeta}>
                <Badge variant="outline" size="small" color="primary">
                  {WORKER_LEVELS[worker.level] || 'Skilled'}
                </Badge>
                <ThemedText type="caption" color="tertiary">
                  {worker.experience}y exp
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.workerStats}>
            <View style={styles.rating}>
              <ThemedText type="body" weight="semiBold" color="primary">
                {worker.rating?.toFixed(1) || '5.0'}
              </ThemedText>
              <ThemedText type="caption" color="secondary">
                ⭐
              </ThemedText>
            </View>
            {matchScore > 0 && (
              <Badge 
                variant="filled" 
                color={matchScore > 80 ? 'success' : matchScore > 60 ? 'warning' : 'secondary'}
                size="small"
              >
                {matchScore}% match
              </Badge>
            )}
          </View>
        </View>

        <View style={styles.workerSkills}>
          {worker.skills?.slice(0, 3).map((skill, index) => (
            <Badge key={index} variant="outline" size="small" style={styles.skillTag}>
              {skill}
            </Badge>
          ))}
          {worker.skills?.length > 3 && (
            <ThemedText type="caption" color="secondary">
              +{worker.skills.length - 3} more
            </ThemedText>
          )}
        </View>

        <View style={styles.workerFooter}>
          <ThemedText type="caption" color="secondary">
            📍 {worker.location} • {distance} away
          </ThemedText>
          <ThemedText type="caption" color={worker.status === 'available' ? 'success' : 'warning'}>
            {worker.status === 'available' ? '✅ Available' : '⏳ Busy'}
          </ThemedText>
        </View>

        {isSelected && (
          <View style={[styles.selectionIndicator, { backgroundColor: theme.colors.primary }]}>
            <ThemedText type="caption" color="white" weight="semiBold">
              SELECTED
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render AI recommendations panel
  const renderAIRecommendations = () => {
    if (!aiRecommendations.length) return null;

    const recommendedCount = aiRecommendations.filter(rec => 
      selectedWorkers.has(rec.id)
    ).length;

    return (
      <Card style={styles.aiPanel}>
        <View style={styles.aiHeader}>
          <View style={styles.aiTitle}>
            <ThemedText type="title" weight="semiBold">
              🤖 AI Recommendations
            </ThemedText>
            <Badge variant="filled" color="primary">
              Smart Match
            </Badge>
          </View>
          <ThemedText type="caption" color="secondary">
            AI has analyzed {workers.length} workers and found optimal matches
          </ThemedText>
        </View>

        <View style={styles.aiStats}>
          <View style={styles.aiStat}>
            <ThemedText type="title" weight="bold" color="primary">
              {aiRecommendations.length}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Suitable Workers
            </ThemedText>
          </View>
          <View style={styles.aiStat}>
            <ThemedText type="title" weight="bold" color="success">
              {recommendedCount}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Selected
            </ThemedText>
          </View>
          <View style={styles.aiStat}>
            <ThemedText type="title" weight="bold" color="warning">
              {projectRequirements.teamSize}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              Team Size
            </ThemedText>
          </View>
        </View>

        <Button
          variant="outline"
          icon="🤖"
          onPress={handleAISelect}
          style={styles.aiButton}
        >
          Auto-Select AI Recommendations
        </Button>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Loading message="Loading available workers..." />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" weight="bold">
          Assign Workers
        </ThemedText>
        <ThemedText type="body" color="secondary">
          {project?.title} • {project?.constructionType}
        </ThemedText>
        
        <View style={styles.selectionInfo}>
          <ThemedText type="body" weight="semiBold">
            {selectedWorkers.size} of {maxWorkers} workers selected
          </ThemedText>
          <ThemedText type="caption" color="secondary">
            Required: {projectRequirements.teamSize} workers
          </ThemedText>
        </View>
      </View>

      {/* AI Recommendations */}
      {renderAIRecommendations()}

      {/* Search and Filters */}
      <Card style={styles.filtersCard}>
        <Input
          placeholder="Search workers by name, skill, or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon="search"
          style={styles.searchInput}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filtersRow}>
            <Button
              variant={filters.availability === 'available' ? 'primary' : 'outline'}
              size="small"
              onPress={() => setFilters(prev => ({ ...prev, availability: 'available' }))}
            >
              Available
            </Button>
            <Button
              variant={filters.minRating === 4 ? 'primary' : 'outline'}
              size="small"
              onPress={() => setFilters(prev => ({ ...prev, minRating: prev.minRating === 4 ? 0 : 4 }))}
            >
              4⭐ & Above
            </Button>
            {projectRequirements.requiredSkills.slice(0, 3).map(skill => (
              <Button
                key={skill}
                variant={filters.skills.includes(skill) ? 'primary' : 'outline'}
                size="small"
                onPress={() => {
                  setFilters(prev => ({
                    ...prev,
                    skills: prev.skills.includes(skill)
                      ? prev.skills.filter(s => s !== skill)
                      : [...prev.skills, skill]
                  }));
                }}
              >
                {skill}
              </Button>
            ))}
          </View>
        </ScrollView>
      </Card>

      {/* Workers List */}
      <ScrollView style={styles.workersList}>
        {filteredWorkers.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText type="title" weight="semiBold" style={styles.emptyText}>
              No Workers Found
            </ThemedText>
            <ThemedText type="body" color="secondary" style={styles.emptyText}>
              Try adjusting your search criteria or filters
            </ThemedText>
          </View>
        ) : (
          filteredWorkers.map(renderWorkerCard)
        )}
      </ScrollView>

      {/* Assignment Notes and Actions */}
      <Card style={styles.actionsCard}>
        <Input
          placeholder="Add assignment notes (optional)..."
          value={assignmentNote}
          onChangeText={setAssignmentNote}
          multiline
          style={styles.notesInput}
        />
        
        <View style={styles.actionButtons}>
          <Button
            variant="outline"
            onPress={onCancel}
            style={styles.actionButton}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleAssignment}
            loading={loading}
            disabled={selectedWorkers.size === 0}
            style={styles.actionButton}
          >
            Assign {selectedWorkers.size} Workers
          </Button>
        </View>
      </Card>

      {/* Worker Details Modal */}
      <Modal
        visible={!!showWorkerDetails}
        onDismiss={() => setShowWorkerDetails(null)}
        title="Worker Details"
        size="medium"
      >
        {showWorkerDetails && (
          <View style={styles.workerModal}>
            <View style={styles.modalHeader}>
              <Avatar
                source={showWorkerDetails.avatar}
                name={showWorkerDetails.name}
                size={80}
              />
              <View style={styles.modalInfo}>
                <ThemedText type="title" weight="bold">
                  {showWorkerDetails.name}
                </ThemedText>
                <ThemedText type="body" color="secondary">
                  {showWorkerDetails.specialization}
                </ThemedText>
                <View style={styles.modalStats}>
                  <ThemedText type="body" weight="semiBold" color="primary">
                    ⭐ {showWorkerDetails.rating?.toFixed(1) || '5.0'}
                  </ThemedText>
                  <ThemedText type="body" color="secondary">
                    {showWorkerDetails.experience} years experience
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.modalSkills}>
              <ThemedText type="body" weight="semiBold">
                Skills & Specializations
              </ThemedText>
              <View style={styles.skillsGrid}>
                {showWorkerDetails.skills?.map((skill, index) => (
                  <Badge key={index} variant="filled" color="primary" size="small">
                    {skill}
                  </Badge>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                variant={selectedWorkers.has(showWorkerDetails.id) ? 'outline' : 'primary'}
                onPress={() => {
                  handleWorkerSelect(showWorkerDetails.id);
                  setShowWorkerDetails(null);
                }}
              >
                {selectedWorkers.has(showWorkerDetails.id) ? 'Deselect' : 'Select'} Worker
              </Button>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectionInfo: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiPanel: {
    margin: 16,
    marginBottom: 8,
  },
  aiHeader: {
    marginBottom: 12,
  },
  aiTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  aiStat: {
    alignItems: 'center',
  },
  aiButton: {
    width: '100%',
  },
  filtersCard: {
    margin: 16,
    marginBottom: 8,
  },
  searchInput: {
    marginBottom: 12,
  },
  filtersScroll: {
    marginHorizontal: -4,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  workersList: {
    flex: 1,
    padding: 16,
  },
  workerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedWorkerCard: {
    borderWidth: 2,
  },
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  workerStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rating: {
    alignItems: 'center',
  },
  workerSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  skillTag: {
    marginRight: 4,
  },
  workerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  actionsCard: {
    margin: 16,
    marginTop: 8,
  },
  notesInput: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  workerModal: {
    padding: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInfo: {
    flex: 1,
    marginLeft: 16,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalSkills: {
    marginBottom: 20,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  modalActions: {
    marginTop: 8,
  },
});

export default WorkerAssignment;