import React, { useState, useReducer, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Modal } from '../../components/ui/modal';
import { LocationPicker } from '../../components/ui/location-picker';
import { ProjectForm } from '../../components/construction/project-form';
import { WorkerAssignment } from '../../components/construction/worker-assignment';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from '../../hooks/use-location';
import { useAIAssignment } from '../../hooks/use-ai-assignment';
import { governmentService } from '../../services/government-service';
import { constructionService } from '../../services/construction-service';
import { notificationService } from '../../services/notification-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { governmentConstants } from '../../constants/government';

/**
 * Government Project Creation Screen
 * 
 * Handles creation of large-scale government construction projects
 * with AI-powered worker assignment and budget management
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const CreateGovernmentProjectScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user } = useAuth();
  const { getCurrentLocation } = useLocation();
  const { matchWorkersToProject } = useAIAssignment();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWorkerAssignment, setShowWorkerAssignment] = useState(false);
  const [matchedWorkers, setMatchedWorkers] = useState([]);
  const [projectBudget, setProjectBudget] = useState(null);

  // Project form state reducer
  const projectReducer = (state, action) => {
    switch (action.type) {
      case 'UPDATE_FIELD':
        return {
          ...state,
          [action.field]: action.value,
          errors: {
            ...state.errors,
            [action.field]: null,
          },
        };
      
      case 'SET_ERRORS':
        return {
          ...state,
          errors: action.errors,
        };
      
      case 'RESET':
        return getInitialProjectState();
      
      case 'SET_BUDGET_DETAILS':
        return {
          ...state,
          budget: action.budget,
          estimatedDuration: action.duration,
          workerRequirements: action.requirements,
        };
      
      default:
        return state;
    }
  };

  const getInitialProjectState = () => ({
    // Basic Project Information
    title: '',
    description: '',
    projectType: '',
    category: '',
    
    // Location Details
    region: '',
    zone: '',
    woreda: '',
    specificLocation: '',
    coordinates: null,
    
    // Project Specifications
    totalArea: '',
    numberOfFloors: '',
    buildingType: '',
    constructionType: '',
    
    // Timeline
    startDate: null,
    estimatedEndDate: null,
    priorityLevel: 'medium',
    
    // Budget & Resources
    totalBudget: '',
    budgetBreakdown: {
      materials: 0,
      labor: 0,
      equipment: 0,
      contingency: 0,
    },
    fundingSource: '',
    
    // Workforce Requirements
    requiredWorkers: {
      generalLabor: 0,
      skilledWorkers: 0,
      supervisors: 0,
      engineers: 0,
    },
    
    // Documentation
    requiredDocuments: [],
    complianceRequirements: [],
    
    // AI Configuration
    useAIAssignment: true,
    autoReplacement: true,
    skillMatchingLevel: 'high',
    
    errors: {},
  });

  const [project, dispatch] = useReducer(projectReducer, getInitialProjectState());

  /**
   * Calculate project budget and requirements based on specifications
   */
  const calculateProjectRequirements = useCallback(() => {
    try {
      const area = parseFloat(project.totalArea) || 0;
      const floors = parseInt(project.numberOfFloors) || 1;
      const projectType = project.projectType;
      
      if (!area || !projectType) return null;

      const calculations = constructionService.calculateProjectRequirements(
        area,
        floors,
        projectType,
        project.constructionType
      );

      if (calculations) {
        dispatch({
          type: 'SET_BUDGET_DETAILS',
          budget: calculations.budget,
          duration: calculations.duration,
          requirements: calculations.workerRequirements,
        });
        
        setProjectBudget(calculations.budget);
        return calculations;
      }
    } catch (error) {
      console.error('Budget calculation error:', error);
      return null;
    }
  }, [project.totalArea, project.numberOfFloors, project.projectType, project.constructionType]);

  /**
   * Validate project form data
   */
  const validateProject = () => {
    const errors = {};
    
    // Required fields validation
    if (!validators.required(project.title)) {
      errors.title = 'Project title is required';
    }
    
    if (!validators.required(project.projectType)) {
      errors.projectType = 'Project type is required';
    }
    
    if (!validators.required(project.region)) {
      errors.region = 'Region is required';
    }
    
    if (!validators.positiveNumber(project.totalArea)) {
      errors.totalArea = 'Valid total area is required';
    }
    
    if (!validators.positiveNumber(project.totalBudget) || parseFloat(project.totalBudget) < 10000) {
      errors.totalBudget = 'Valid budget amount is required (minimum 10,000 ETB)';
    }
    
    // Date validation
    if (!project.startDate) {
      errors.startDate = 'Start date is required';
    }
    
    // Location validation
    if (!project.coordinates && !project.specificLocation) {
      errors.specificLocation = 'Project location details are required';
    }
    
    return errors;
  };

  /**
   * Find and match workers using AI algorithm
   */
  const findMatchingWorkers = async () => {
    try {
      const workers = await matchWorkersToProject({
        projectType: project.projectType,
        location: {
          region: project.region,
          coordinates: project.coordinates,
        },
        requirements: project.requiredWorkers,
        budget: project.budgetBreakdown.labor,
        skillLevel: project.skillMatchingLevel,
      });
      
      setMatchedWorkers(workers);
      setShowWorkerAssignment(true);
      
      return workers;
    } catch (error) {
      console.error('Worker matching failed:', error);
      Alert.alert('Matching Error', 'Unable to find suitable workers at this time.');
      return [];
    }
  };

  /**
   * Handle project submission
   */
  const handleSubmit = async () => {
    try {
      // Validate form
      const errors = validateProject();
      if (Object.keys(errors).length > 0) {
        dispatch({ type: 'SET_ERRORS', errors });
        Alert.alert('Validation Error', 'Please check the form for errors.');
        return;
      }

      setIsSubmitting(true);

      // Prepare project data
      const projectData = {
        ...project,
        createdBy: user.id,
        governmentAgency: user.agency,
        status: 'pending_approval',
        projectCode: governmentService.generateProjectCode(project.region, project.projectType),
        
        // Metadata
        createdAt: new Date().toISOString(),
        version: 1,
        approvals: [],
        auditTrail: [],
      };

      // Create project
      const result = await governmentService.createProject(projectData);
      
      if (result.success) {
        // Handle AI worker assignment if enabled
        if (project.useAIAssignment) {
          const assignedWorkers = await handleWorkerAssignment(result.projectId);
          
          // Send notifications to assigned workers
          await notificationService.sendProjectAssignments(
            assignedWorkers,
            result.projectId,
            project.title
          );
        }

        // Log project creation
        await governmentService.logProjectCreation(projectData, user.id);
        
        // Show success message
        Alert.alert(
          'Project Created',
          `Project "${project.title}" has been successfully created and is pending approval.`,
          [
            {
              text: 'View Project',
              onPress: () => navigation.navigate('GovernmentProjectDetail', { 
                projectId: result.projectId 
              }),
            },
            {
              text: 'Create Another',
              onPress: () => dispatch({ type: 'RESET' }),
            },
          ]
        );
      } else {
        throw new Error(result.message || 'Failed to create project');
      }
    } catch (error) {
      console.error('Project creation error:', error);
      Alert.alert(
        'Creation Failed',
        error.message || 'Unable to create project. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle AI worker assignment process
   */
  const handleWorkerAssignment = async (projectId) => {
    try {
      const workers = await findMatchingWorkers();
      
      if (workers.length > 0) {
        const assignmentResult = await governmentService.assignWorkersToProject(
          projectId,
          workers,
          project.autoReplacement
        );
        
        return assignmentResult.assignedWorkers || [];
      }
      
      return [];
    } catch (error) {
      console.error('Worker assignment failed:', error);
      return [];
    }
  };

  /**
   * Handle location selection
   */
  const handleLocationSelect = (location) => {
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'coordinates',
      value: location.coordinates,
    });
    
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'specificLocation',
      value: location.address,
    });
  };

  /**
   * Use current device location
   */
  const handleUseCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        handleLocationSelect({
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          address: 'Current Location',
        });
      }
    } catch (error) {
      Alert.alert('Location Error', 'Unable to get current location.');
    }
  };

  /**
   * Update budget breakdown when total budget changes
   */
  const handleBudgetChange = (value) => {
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'totalBudget',
      value,
    });

    // Auto-calculate budget breakdown
    if (value && !isNaN(parseFloat(value))) {
      const total = parseFloat(value);
      const breakdown = constructionService.calculateBudgetBreakdown(total, project.projectType);
      
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'budgetBreakdown',
        value: breakdown,
      });
    }
  };

  if (isSubmitting) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Creating government project..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Create Government Project
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Set up a new construction project with AI-powered workforce management
          </ThemedText>
        </View>

        <Card style={styles.formCard}>
          <ProjectForm
            project={project}
            dispatch={dispatch}
            onCalculateRequirements={calculateProjectRequirements}
            projectBudget={projectBudget}
          />
        </Card>

        <Card style={styles.locationCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Project Location
          </ThemedText>
          
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            onUseCurrentLocation={handleUseCurrentLocation}
            selectedLocation={project.coordinates}
            address={project.specificLocation}
            region={project.region}
            onRegionChange={(region) => dispatch({
              type: 'UPDATE_FIELD',
              field: 'region',
              value: region,
            })}
            error={errors.coordinates || errors.specificLocation}
          />
        </Card>

        <Card style={styles.budgetCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Budget & Funding
          </ThemedText>
          
          <Input
            label="Total Project Budget (ETB)"
            value={project.totalBudget}
            onChangeText={handleBudgetChange}
            placeholder="Enter total budget amount"
            keyboardType="numeric"
            error={errors.totalBudget}
            format="currency"
            currency="ETB"
          />
          
          {project.budgetBreakdown && (
            <View style={styles.budgetBreakdown}>
              <ThemedText type="defaultSemiBold" style={styles.breakdownTitle}>
                Budget Breakdown:
              </ThemedText>
              
              {Object.entries(project.budgetBreakdown).map(([category, amount]) => (
                <View key={category} style={styles.breakdownRow}>
                  <ThemedText type="default" style={styles.breakdownCategory}>
                    {formatters.capitalizeFirst(category)}:
                  </ThemedText>
                  <ThemedText type="defaultSemiBold">
                    {formatters.formatCurrency(amount, 'ETB')}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.aiCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            AI Workforce Management
          </ThemedText>
          
          <View style={styles.aiOptions}>
            <Button
              title="Find Matching Workers"
              onPress={findMatchingWorkers}
              variant="secondary"
              size="medium"
              disabled={!project.projectType || !project.region}
              icon="users"
            />
            
            <ThemedText type="default" style={styles.aiDescription}>
              Our AI will automatically find the best-suited workers based on project requirements, location, and budget.
            </ThemedText>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Create Government Project"
          onPress={handleSubmit}
          variant="primary"
          size="large"
          disabled={isSubmitting}
          loading={isSubmitting}
          icon="building"
          style={styles.submitButton}
        />
        
        <Button
          title="Save as Draft"
          onPress={() => {/* Save draft implementation */}}
          variant="secondary"
          size="medium"
          icon="save"
        />
      </View>

      {/* Worker Assignment Modal */}
      <Modal
        visible={showWorkerAssignment}
        onClose={() => setShowWorkerAssignment(false)}
        title="AI Worker Assignment"
        size="large"
      >
        <WorkerAssignment
          workers={matchedWorkers}
          project={project}
          onAssign={(selectedWorkers) => {
            // Handle manual worker assignment
            setShowWorkerAssignment(false);
          }}
          onAutoAssign={() => {
            // Handle auto assignment
            setShowWorkerAssignment(false);
          }}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  formCard: {
    padding: 0,
    overflow: 'hidden',
  },
  locationCard: {
    gap: 12,
  },
  budgetCard: {
    gap: 12,
  },
  aiCard: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  budgetBreakdown: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  breakdownTitle: {
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownCategory: {
    textTransform: 'capitalize',
  },
  aiOptions: {
    gap: 12,
  },
  aiDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    gap: 12,
  },
  submitButton: {
    marginBottom: 8,
  },
});

export default CreateGovernmentProjectScreen;