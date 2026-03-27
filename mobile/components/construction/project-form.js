// components/construction/project-form.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useGovernment } from '../../contexts/government-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Button from '../ui/button';
import Input from '../ui/input';
import Card from '../ui/card';
import Badge from '../ui/badge';
import Loading from '../ui/loading';
import Modal from '../ui/modal';
import DatePicker from '../ui/date-picker';
import LocationPicker from '../ui/location-picker';
import FileUpload from '../ui/file-upload';
import ProgressBar from '../ui/progress-bar';

// Services
import { constructionService } from '../../services/construction-service';
import { aiAssignmentService } from '../../services/ai-assignment-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { uploadService } from '../../services/upload-service';

// Utils
import { formatCurrency, formatDate, validateEmail, validatePhone } from '../../utils/formatters';
import { debounce } from '../../utils/helpers';

// Constants
import { 
  PROJECT_TYPES, 
  PROJECT_STATUS, 
  CONSTRUCTION_PHASES,
  BUDGET_CATEGORIES,
  WORKER_SKILLS 
} from '../../constants/construction';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Project Form Component
 * AI-Powered Construction Project Creation & Management
 * Ethiopian Infrastructure Project Form with Budget Optimization
 */

const ProjectForm = ({
  // Form modes
  mode = 'create', // 'create', 'edit', 'clone', 'view'
  projectId = null,
  initialData = {},
  
  // Configuration
  enableAIRecommendations = true,
  enableBudgetOptimization = true,
  enableWorkerAssignment = true,
  showAdvancedOptions = false,
  allowFileUploads = true,
  
  // Callbacks
  onSubmit,
  onCancel,
  onSuccess,
  onError,
  onProgressUpdate,
  
  // Styling
  style,
  testID = 'project-form',
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { createProject, updateProject, getProject } = useGovernment();

  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    description: '',
    type: '',
    category: '',
    priority: 'medium',
    
    // Location & Timeline
    location: '',
    coordinates: null,
    startDate: null,
    endDate: null,
    estimatedDuration: 0,
    
    // Budget Information
    budget: {
      total: 0,
      allocated: 0,
      categories: {},
      contingency: 10, // Percentage
    },
    
    // Project Specifications
    area: 0, // Square meters
    floors: 1,
    units: 1,
    specifications: {},
    
    // Team & Resources
    projectManager: '',
    engineeringTeam: [],
    assignedWorkers: [],
    requiredSkills: [],
    
    // Documentation
    documents: [],
    images: [],
    approvals: [],
    
    // Advanced Settings
    riskLevel: 'medium',
    complianceRequirements: [],
    environmentalImpact: '',
    communityConsiderations: '',
    
    // AI Recommendations
    aiSuggestions: [],
    optimizedBudget: null,
    recommendedTeam: [],
  });

  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState(new Set());
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);

  const scrollViewRef = useRef(null);
  const formRef = useRef(null);
  const aiTimeoutRef = useRef(null);

  // Total steps in form
  const TOTAL_STEPS = 5;

  // Form steps configuration
  const FORM_STEPS = useMemo(() => [
    {
      id: 1,
      title: 'Basic Information',
      description: 'Project overview and basic details',
      fields: ['title', 'description', 'type', 'category', 'priority'],
    },
    {
      id: 2,
      title: 'Location & Timeline',
      description: 'Project location and schedule',
      fields: ['location', 'coordinates', 'startDate', 'endDate', 'estimatedDuration'],
    },
    {
      id: 3,
      title: 'Budget & Resources',
      description: 'Financial planning and resource allocation',
      fields: ['budget', 'area', 'floors', 'units', 'requiredSkills'],
    },
    {
      id: 4,
      title: 'Team & Management',
      description: 'Project team and management structure',
      fields: ['projectManager', 'engineeringTeam', 'assignedWorkers'],
    },
    {
      id: 5,
      title: 'Review & Submit',
      description: 'Final review and project submission',
      fields: ['documents', 'specifications', 'complianceRequirements'],
    },
  ], []);

  // Load project data for edit mode
  useEffect(() => {
    if (mode === 'edit' && projectId) {
      loadProjectData();
    } else if (mode === 'clone' && initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        title: `${initialData.title} (Copy)`,
        id: null,
      }));
    } else if (mode === 'view' && projectId) {
      loadProjectData();
    }
  }, [mode, projectId, initialData]);

  // Generate AI recommendations when form data changes
  useEffect(() => {
    if (enableAIRecommendations && shouldTriggerAI()) {
      generateAIRecommendations();
    }
  }, [formData, enableAIRecommendations]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      const result = await getProject(projectId);
      
      if (result.success) {
        setFormData(result.data);
        
        // Track analytics
        analyticsService.trackEvent('project_form_loaded', {
          mode,
          projectId,
          projectType: result.data.type,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
      
      errorService.captureError(error, {
        context: 'ProjectFormLoad',
        mode,
        projectId,
      });

      Alert.alert(
        'Load Failed',
        'Unable to load project data. Please try again.',
        [{ text: 'OK', onPress: onCancel }]
      );
    } finally {
      setLoading(false);
    }
  };

  const shouldTriggerAI = () => {
    // Only trigger AI when basic project info is filled
    const hasBasicInfo = formData.title && formData.type && formData.area > 0;
    const hasBudgetInfo = formData.budget.total > 0;
    
    return hasBasicInfo && hasBudgetInfo && !aiLoading;
  };

  const generateAIRecommendations = useCallback(
    debounce(async () => {
      if (!enableAIRecommendations) return;

      try {
        setAiLoading(true);
        
        const aiData = {
          projectType: formData.type,
          area: formData.area,
          floors: formData.floors,
          budget: formData.budget.total,
          location: formData.location,
          timeline: {
            start: formData.startDate,
            end: formData.endDate,
            duration: formData.estimatedDuration,
          },
        };

        const recommendations = await aiAssignmentService.getProjectRecommendations(aiData);
        
        setAiRecommendations(recommendations);
        
        // Update form with AI suggestions
        if (recommendations.optimizedBudget && enableBudgetOptimization) {
          setFormData(prev => ({
            ...prev,
            budget: {
              ...prev.budget,
              categories: recommendations.optimizedBudget.categories,
              contingency: recommendations.optimizedBudget.contingency,
            },
            aiSuggestions: recommendations.suggestions || [],
          }));
        }

        if (recommendations.recommendedTeam && enableWorkerAssignment) {
          setFormData(prev => ({
            ...prev,
            recommendedTeam: recommendations.recommendedTeam,
            requiredSkills: recommendations.requiredSkills || [],
          }));
        }

      } catch (error) {
        console.error('AI recommendation failed:', error);
        // Silent fail - AI recommendations are optional
      } finally {
        setAiLoading(false);
      }
    }, 1000),
    [enableAIRecommendations, enableBudgetOptimization, enableWorkerAssignment]
  );

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      
      // Handle nested fields (e.g., budget.total)
      if (field.includes('.')) {
        const fields = field.split('.');
        let current = newData;
        
        for (let i = 0; i < fields.length - 1; i++) {
          current = current[fields[i]];
        }
        
        current[fields[fields.length - 1]] = value;
      } else {
        newData[field] = value;
      }
      
      return newData;
    });

    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(field));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Trigger progress update
    onProgressUpdate?.(calculateFormProgress());
  };

  const handleArrayFieldChange = (field, value, operation = 'add') => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      let newArray;
      
      switch (operation) {
        case 'add':
          newArray = [...currentArray, value];
          break;
        case 'remove':
          newArray = currentArray.filter(item => item !== value);
          break;
        case 'update':
          newArray = value;
          break;
        default:
          newArray = currentArray;
      }
      
      return { ...prev, [field]: newArray };
    });
  };

  const validateField = (field, value) => {
    const errors = {};
    
    switch (field) {
      case 'title':
        if (!value || value.trim().length < 5) {
          errors.title = 'Project title must be at least 5 characters';
        }
        break;
        
      case 'description':
        if (!value || value.trim().length < 20) {
          errors.description = 'Project description must be at least 20 characters';
        }
        break;
        
      case 'type':
        if (!value) {
          errors.type = 'Project type is required';
        }
        break;
        
      case 'location':
        if (!value) {
          errors.location = 'Project location is required';
        }
        break;
        
      case 'startDate':
        if (!value) {
          errors.startDate = 'Start date is required';
        } else if (formData.endDate && new Date(value) > new Date(formData.endDate)) {
          errors.startDate = 'Start date cannot be after end date';
        }
        break;
        
      case 'endDate':
        if (!value) {
          errors.endDate = 'End date is required';
        } else if (formData.startDate && new Date(value) < new Date(formData.startDate)) {
          errors.endDate = 'End date cannot be before start date';
        }
        break;
        
      case 'budget.total':
        if (!value || value <= 0) {
          errors.budget = 'Budget must be greater than 0';
        } else if (value < 1000) {
          errors.budget = 'Budget seems too low for construction project';
        }
        break;
        
      case 'area':
        if (!value || value <= 0) {
          errors.area = 'Area must be greater than 0';
        }
        break;
        
      case 'floors':
        if (!value || value <= 0) {
          errors.floors = 'Number of floors must be greater than 0';
        }
        break;
        
      default:
        break;
    }
    
    return errors;
  };

  const validateForm = (step = null) => {
    const errors = {};
    const fieldsToValidate = step ? FORM_STEPS[step - 1].fields : Object.keys(formData);
    
    fieldsToValidate.forEach(field => {
      const value = getNestedValue(formData, field);
      const fieldErrors = validateField(field, value);
      Object.assign(errors, fieldErrors);
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const calculateFormProgress = () => {
    const totalFields = FORM_STEPS.flatMap(step => step.fields).length;
    const filledFields = FORM_STEPS.flatMap(step => step.fields).filter(field => {
      const value = getNestedValue(formData, field);
      return value !== null && value !== undefined && value !== '' && 
             (!Array.isArray(value) || value.length > 0) &&
             (typeof value !== 'object' || Object.keys(value).length > 0);
    }).length;
    
    return (filledFields / totalFields) * 100;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Final validation
      if (!validateForm()) {
        Alert.alert('Validation Error', 'Please fix all errors before submitting.');
        scrollToFirstError();
        return;
      }
      
      // Prepare submission data
      const submissionData = {
        ...formData,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        status: mode === 'create' ? PROJECT_STATUS.PLANNING : formData.status,
        // Add AI recommendations if available
        ...(aiRecommendations && {
          aiOptimizations: aiRecommendations,
          lastAIAnalysis: new Date().toISOString(),
        }),
      };
      
      let result;
      
      if (mode === 'create') {
        result = await createProject(submissionData);
      } else if (mode === 'edit') {
        result = await updateProject(projectId, submissionData);
      }
      
      if (result.success) {
        // Track success analytics
        analyticsService.trackEvent('project_form_submitted', {
          mode,
          projectId: result.data.id,
          projectType: formData.type,
          budget: formData.budget.total,
          area: formData.area,
          hasAIRecommendations: !!aiRecommendations,
        });
        
        // Show success message
        Alert.alert(
          'Success',
          `Project ${mode === 'create' ? 'created' : 'updated'} successfully!`,
          [{ text: 'OK', onPress: handleSuccess }]
        );
        
        onSuccess?.(result.data);
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Project submission failed:', error);
      
      errorService.captureError(error, {
        context: 'ProjectFormSubmit',
        mode,
        projectId,
        formData: {
          type: formData.type,
          budget: formData.budget.total,
          area: formData.area,
        },
      });
      
      const errorMessage = error.message || 'Failed to submit project. Please try again.';
      Alert.alert('Submission Failed', errorMessage);
      
      onError?.(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccess = () => {
    if (mode === 'create') {
      router.push(`/government/projects/${formData.id}`);
    } else {
      onCancel?.();
    }
  };

  const scrollToFirstError = () => {
    // Implementation to scroll to first error field
    const firstErrorField = Object.keys(formErrors)[0];
    if (firstErrorField) {
      // Scroll logic would be implemented here
      console.log('Scroll to error:', firstErrorField);
    }
  };

  const nextStep = () => {
    if (validateForm(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <ProgressBar
        progress={(currentStep / TOTAL_STEPS) * 100}
        color="primary"
        height={4}
        style={styles.progressBar}
      />
      
      <View style={styles.stepsContainer}>
        {FORM_STEPS.map(step => (
          <View key={step.id} style={styles.step}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: currentStep >= step.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <ThemedText 
                type="caption" 
                color={currentStep >= step.id ? 'white' : 'secondary'}
                weight="semiBold"
              >
                {step.id}
              </ThemedText>
            </View>
            <View style={styles.stepInfo}>
              <ThemedText 
                type="caption" 
                weight="medium"
                color={currentStep >= step.id ? 'primary' : 'secondary'}
              >
                {step.title}
              </ThemedText>
              <ThemedText type="caption" color="tertiary" numberOfLines={1}>
                {step.description}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderBasicInformationStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" weight="semiBold" style={styles.stepTitle}>
        Basic Information
      </ThemedText>
      
      <Input
        label="Project Title *"
        value={formData.title}
        onChangeText={(value) => handleInputChange('title', value)}
        placeholder="Enter project title (e.g., Addis Ababa Residential Complex)"
        error={formErrors.title}
        required
      />
      
      <Input
        label="Project Description *"
        value={formData.description}
        onChangeText={(value) => handleInputChange('description', value)}
        placeholder="Describe the project scope, objectives, and key features..."
        multiline
        numberOfLines={4}
        error={formErrors.description}
        required
      />
      
      <View style={styles.row}>
        <View style={styles.column}>
          <Input
            label="Project Type *"
            value={formData.type}
            onChangeText={(value) => handleInputChange('type', value)}
            placeholder="Select project type"
            options={Object.values(PROJECT_TYPES)}
            type="select"
            error={formErrors.type}
            required
          />
        </View>
        
        <View style={styles.column}>
          <Input
            label="Priority Level"
            value={formData.priority}
            onChangeText={(value) => handleInputChange('priority', value)}
            options={['low', 'medium', 'high', 'urgent']}
            type="select"
          />
        </View>
      </View>
      
      {/* AI Suggestions Badge */}
      {aiRecommendations && (
        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <ThemedText type="body" weight="semiBold">
              🤖 AI Insights
            </ThemedText>
            <Badge variant="filled" color="primary" size="small">
              Recommended
            </Badge>
          </View>
          <ThemedText type="caption" color="secondary">
            {aiRecommendations.suggestions?.[0] || 'AI has analyzed your project requirements.'}
          </ThemedText>
        </Card>
      )}
    </View>
  );

  const renderLocationTimelineStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" weight="semiBold" style={styles.stepTitle}>
        Location & Timeline
      </ThemedText>
      
      <LocationPicker
        label="Project Location *"
        value={formData.location}
        onLocationSelect={(location, coordinates) => {
          handleInputChange('location', location);
          handleInputChange('coordinates', coordinates);
        }}
        error={formErrors.location}
        required
      />
      
      <View style={styles.row}>
        <View style={styles.column}>
          <DatePicker
            label="Start Date *"
            value={formData.startDate}
            onDateChange={(date) => handleInputChange('startDate', date)}
            error={formErrors.startDate}
            required
          />
        </View>
        
        <View style={styles.column}>
          <DatePicker
            label="End Date *"
            value={formData.endDate}
            onDateChange={(date) => handleInputChange('endDate', date)}
            error={formErrors.endDate}
            required
          />
        </View>
      </View>
      
      <Input
        label="Estimated Duration (Days)"
        value={formData.estimatedDuration.toString()}
        onChangeText={(value) => handleInputChange('estimatedDuration', parseInt(value) || 0)}
        placeholder="Estimated project duration in days"
        keyboardType="numeric"
      />
    </View>
  );

  const renderBudgetResourcesStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" weight="semiBold" style={styles.stepTitle}>
        Budget & Resources
      </ThemedText>
      
      <Input
        label="Total Budget (ETB) *"
        value={formData.budget.total.toString()}
        onChangeText={(value) => handleInputChange('budget.total', parseFloat(value) || 0)}
        placeholder="Enter total project budget"
        keyboardType="numeric"
        format="currency"
        error={formErrors.budget}
        required
      />
      
      <View style={styles.row}>
        <View style={styles.column}>
          <Input
            label="Area (sqm) *"
            value={formData.area.toString()}
            onChangeText={(value) => handleInputChange('area', parseFloat(value) || 0)}
            placeholder="Total area"
            keyboardType="numeric"
            error={formErrors.area}
            required
          />
        </View>
        
        <View style={styles.column}>
          <Input
            label="Number of Floors *"
            value={formData.floors.toString()}
            onChangeText={(value) => handleInputChange('floors', parseInt(value) || 1)}
            placeholder="Floors"
            keyboardType="numeric"
            error={formErrors.floors}
            required
          />
        </View>
      </View>
      
      {/* Budget Optimization Suggestion */}
      {enableBudgetOptimization && aiRecommendations?.optimizedBudget && (
        <Card style={styles.optimizationCard}>
          <View style={styles.optimizationHeader}>
            <ThemedText type="body" weight="semiBold">
              💰 Budget Optimization
            </ThemedText>
            <Button
              variant="outline"
              size="small"
              onPress={() => setShowAIModal(true)}
            >
              Apply AI
            </Button>
          </View>
          <ThemedText type="caption" color="secondary">
            AI suggests optimized budget allocation that could save ~
            {formatCurrency(aiRecommendations.optimizedBudget.estimatedSavings)}
          </ThemedText>
        </Card>
      )}
    </View>
  );

  const renderTeamManagementStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" weight="semiBold" style={styles.stepTitle}>
        Team & Management
      </ThemedText>
      
      {/* AI Team Recommendations */}
      {enableWorkerAssignment && aiRecommendations?.recommendedTeam && (
        <Card style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <ThemedText type="body" weight="semiBold">
              👷 AI Team Suggestions
            </ThemedText>
            <Badge variant="filled" color="success" size="small">
              {aiRecommendations.recommendedTeam.length} workers
            </Badge>
          </View>
          <ThemedText type="caption" color="secondary">
            Recommended team based on project requirements and available resources
          </ThemedText>
        </Card>
      )}
      
      {/* Team management form fields would continue here */}
    </View>
  );

  const renderReviewSubmitStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" weight="semiBold" style={styles.stepTitle}>
        Review & Submit
      </ThemedText>
      
      <Card style={styles.reviewCard}>
        <ThemedText type="body" weight="semiBold">
          Project Summary
        </ThemedText>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <ThemedText type="caption" color="secondary">Title</ThemedText>
            <ThemedText type="body">{formData.title}</ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText type="caption" color="secondary">Type</ThemedText>
            <ThemedText type="body">{formData.type}</ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText type="caption" color="secondary">Location</ThemedText>
            <ThemedText type="body">{formData.location}</ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText type="caption" color="secondary">Budget</ThemedText>
            <ThemedText type="body">{formatCurrency(formData.budget.total)} ETB</ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText type="caption" color="secondary">Area</ThemedText>
            <ThemedText type="body">{formData.area} sqm</ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText type="caption" color="secondary">Duration</ThemedText>
            <ThemedText type="body">{formData.estimatedDuration} days</ThemedText>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInformationStep();
      case 2:
        return renderLocationTimelineStep();
      case 3:
        return renderBudgetResourcesStep();
      case 4:
        return renderTeamManagementStep();
      case 5:
        return renderReviewSubmitStep();
      default:
        return renderBasicInformationStep();
    }
  };

  if (loading) {
    return <Loading message="Loading project data..." />;
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText type="title" weight="bold">
              {mode === 'create' ? 'Create New Project' : 
               mode === 'edit' ? 'Edit Project' : 
               mode === 'view' ? 'Project Details' : 'Clone Project'}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              {FORM_STEPS[currentStep - 1]?.description}
            </ThemedText>
          </View>
          
          <View style={styles.headerActions}>
            <Button
              variant="outline"
              onPress={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          </View>
        </View>
        
        {renderStepIndicator()}
      </View>

      {/* Form Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {renderStepContent()}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
        <View style={styles.footerActions}>
          {currentStep > 1 && (
            <Button
              variant="outline"
              onPress={prevStep}
              disabled={submitting}
            >
              Previous
            </Button>
          )}
          
          <View style={styles.spacer} />
          
          {currentStep < TOTAL_STEPS ? (
            <Button
              onPress={nextStep}
              disabled={submitting}
            >
              Next
            </Button>
          ) : (
            <Button
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
            >
              {mode === 'create' ? 'Create Project' : 'Update Project'}
            </Button>
          )}
        </View>
      </View>

      {/* AI Recommendations Modal */}
      <Modal
        visible={showAIModal}
        onDismiss={() => setShowAIModal(false)}
        title="AI Budget Optimization"
        size="large"
      >
        <View style={styles.aiModalContent}>
          {aiRecommendations?.optimizedBudget && (
            <>
              <ThemedText type="body">
                AI has analyzed your project and suggests the following budget optimization:
              </ThemedText>
              
              <Card style={styles.budgetCard}>
                <ThemedText type="body" weight="semiBold">
                  Recommended Allocation
                </ThemedText>
                {/* Budget breakdown would be displayed here */}
              </Card>
              
              <Button
                onPress={() => {
                  // Apply AI recommendations
                  setShowAIModal(false);
                }}
              >
                Apply AI Recommendations
              </Button>
            </>
          )}
        </View>
      </Modal>

      {/* Loading Overlay */}
      {(loading || submitting) && <Loading overlay />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  stepIndicator: {
    paddingHorizontal: 16,
  },
  progressBar: {
    marginBottom: 16,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepInfo: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  stepContent: {
    gap: 16,
  },
  stepTitle: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  aiCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optimizationCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  optimizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewCard: {
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  summaryItem: {
    width: '48%',
    gap: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  aiModalContent: {
    gap: 16,
  },
  budgetCard: {
    padding: 16,
  },
});

export default ProjectForm;

// Hook for using project form
export const useProjectForm = (projectId = null) => {
  const [formState, setFormState] = useState({
    data: null,
    loading: true,
    errors: {},
    touched: new Set(),
  });

  const updateField = useCallback((field, value) => {
    setFormState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value,
      },
      touched: new Set(prev.touched).add(field),
    }));
  }, []);

  const validateForm = useCallback(() => {
    // Implementation of form validation logic
    const errors = {};
    // Validation logic here
    setFormState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, []);

  const loadProject = useCallback(async (id) => {
    setFormState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await constructionService.getProject(id);
      
      if (result.success) {
        setFormState(prev => ({
          ...prev,
          data: result.data,
          loading: false,
          errors: {},
        }));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        loading: false,
        errors: { general: error.message },
      }));
      throw error;
    }
  }, []);

  return {
    ...formState,
    updateField,
    validateForm,
    loadProject,
  };
};