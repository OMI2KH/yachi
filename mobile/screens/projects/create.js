import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../../../contexts/theme-context';
import { AuthContext } from '../../../contexts/auth-context';
import { ConstructionContext } from '../../../contexts/construction-context';
import { UserContext } from '../../../contexts/user-context';
import { LocationContext } from '../../../contexts/location-context';
import { 
  PROJECT_TYPES, 
  CONSTRUCTION_CATEGORIES, 
  COMPLEXITY_LEVELS,
  BUDGET_RANGES,
  TIMELINE_OPTIONS 
} from '../../../constants/construction';
import { USER_ROLES } from '../../../constants/user';
import { 
  validateProjectRequirements,
  calculateEstimatedCost,
  validateEthiopianLocation 
} from '../../../utils/validators';
import { 
  formatCurrency,
  formatEthiopianDate 
} from '../../../utils/formatters';
import { 
  createConstructionProject,
  validateProjectFeasibility 
} from '../../../services/construction-service';
import { 
  uploadProjectDocuments,
  generateProjectCode 
} from '../../../services/project-service';
import { 
  triggerProjectCreationNotification 
} from '../../../services/notification-service';

// Components
import ThemedView from '../../../components/themed-view';
import ThemedText from '../../../components/themed-text';
import Button from '../../../components/ui/button';
import Input from '../../../components/ui/input';
import Card from '../../../components/ui/card';
import Loading from '../../../components/ui/loading';
import Modal from '../../../components/ui/modal';
import LocationPicker from '../../../components/ui/location-picker';
import ProjectForm from '../../../components/construction/project-form';
import BudgetCalculator from '../../../components/construction/budget-calculator';
import AICostEstimator from '../../../components/construction/ai-cost-estimator';
import DocumentUpload from '../../../components/forms/document-upload';
import ConfirmationModal from '../../../components/ui/confirmation-modal';

const CreateProjectScreen = () => {
  const router = useRouter();
  
  // Context
  const { theme, colors } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { 
    createProject,
    updateProject,
    projects 
  } = useContext(ConstructionContext);
  const { userProfile } = useContext(UserContext);
  const { currentLocation, getLocationName } = useContext(LocationContext);

  // State
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showAICalculator, setShowAICalculator] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [costEstimate, setCostEstimate] = useState(null);
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    type: '',
    category: '',
    description: '',
    
    // Location Details
    location: {
      address: '',
      city: '',
      subcity: '',
      woreda: '',
      coordinates: null,
    },
    
    // Project Specifications
    squareArea: '',
    floors: '1',
    rooms: '',
    bathrooms: '',
    
    // Budget & Timeline
    budget: '',
    budgetRange: '',
    timeline: '',
    startDate: '',
    deadline: '',
    
    // Technical Details
    complexity: COMPLEXITY_LEVELS.MEDIUM,
    specialRequirements: '',
    materials: [],
    
    // Documents
    blueprint: null,
    landCertificate: null,
    permitDocuments: null,
    additionalDocs: [],
  });
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [feasibilityCheck, setFeasibilityCheck] = useState(null);

  // Project creation steps
  const steps = [
    {
      id: 'basic_info',
      title: 'Basic Information',
      description: 'Tell us about your project',
      required: true,
    },
    {
      id: 'specifications',
      title: 'Project Specifications',
      description: 'Detailed project requirements',
      required: true,
    },
    {
      id: 'budget_timeline',
      title: 'Budget & Timeline',
      description: 'Financial and scheduling details',
      required: true,
    },
    {
      id: 'location',
      title: 'Location Details',
      description: 'Project site information',
      required: true,
    },
    {
      id: 'documents',
      title: 'Documents & Permits',
      description: 'Upload required documents',
      required: user?.role === USER_ROLES.GOVERNMENT,
    },
    {
      id: 'review',
      title: 'Review & Create',
      description: 'Finalize your project',
      required: true,
    },
  ];

  // Load user's current location
  useEffect(() => {
    if (currentLocation && !formData.location.coordinates) {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          coordinates: currentLocation,
        },
      }));
    }
  }, [currentLocation]);

  // Calculate cost estimate when specifications change
  useEffect(() => {
    if (formData.squareArea && formData.type) {
      const estimate = calculateEstimatedCost({
        type: formData.type,
        squareArea: parseFloat(formData.squareArea),
        floors: parseInt(formData.floors),
        complexity: formData.complexity,
        location: formData.location.city,
      });
      setCostEstimate(estimate);
    }
  }, [formData.squareArea, formData.type, formData.floors, formData.complexity]);

  // Validate current step
  const validateStep = (stepId) => {
    const newErrors = {};

    switch (stepId) {
      case 'basic_info':
        if (!formData.name?.trim()) {
          newErrors.name = 'Project name is required';
        }
        if (!formData.type) {
          newErrors.type = 'Project type is required';
        }
        if (!formData.category) {
          newErrors.category = 'Project category is required';
        }
        if (!formData.description?.trim()) {
          newErrors.description = 'Project description is required';
        }
        break;

      case 'specifications':
        if (!formData.squareArea) {
          newErrors.squareArea = 'Square area is required';
        } else if (parseFloat(formData.squareArea) <= 0) {
          newErrors.squareArea = 'Square area must be greater than 0';
        }
        if (!formData.floors) {
          newErrors.floors = 'Number of floors is required';
        } else if (parseInt(formData.floors) <= 0) {
          newErrors.floors = 'Number of floors must be at least 1';
        }
        break;

      case 'budget_timeline':
        if (!formData.budget) {
          newErrors.budget = 'Project budget is required';
        } else if (parseFloat(formData.budget) <= 0) {
          newErrors.budget = 'Budget must be greater than 0';
        }
        if (!formData.timeline) {
          newErrors.timeline = 'Project timeline is required';
        }
        if (!formData.startDate) {
          newErrors.startDate = 'Start date is required';
        }
        break;

      case 'location':
        if (!formData.location.address?.trim()) {
          newErrors.address = 'Address is required';
        }
        if (!formData.location.city?.trim()) {
          newErrors.city = 'City is required';
        }
        if (!formData.location.coordinates) {
          newErrors.coordinates = 'Location coordinates are required';
        }
        break;

      case 'documents':
        if (user?.role === USER_ROLES.GOVERNMENT) {
          if (!formData.landCertificate) {
            newErrors.landCertificate = 'Land certificate is required for government projects';
          }
          if (!formData.permitDocuments) {
            newErrors.permitDocuments = 'Permit documents are required';
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Handle nested object changes
  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  // Handle document upload
  const handleDocumentUpload = async (documentType, file) => {
    try {
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: 0,
      }));

      const uploadedFile = await uploadProjectDocuments(
        user.id,
        documentType,
        file,
        (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [documentType]: progress,
          }));
        }
      );

      setFormData(prev => ({
        ...prev,
        [documentType]: uploadedFile,
      }));

      return uploadedFile;
    } catch (error) {
      Alert.alert('Upload Failed', `Failed to upload ${documentType}: ${error.message}`);
      throw error;
    }
  };

  // Handle location selection
  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      location: {
        address: location.address,
        city: location.city,
        subcity: location.subcity,
        woreda: location.woreda,
        coordinates: location.coordinates,
      },
    }));
    setShowLocationPicker(false);
  };

  // Check project feasibility
  const checkFeasibility = async () => {
    try {
      const feasibility = await validateProjectFeasibility({
        ...formData,
        userId: user.id,
        userRole: user.role,
      });
      setFeasibilityCheck(feasibility);
      return feasibility.isFeasible;
    } catch (error) {
      console.error('Feasibility check failed:', error);
      return true; // Continue anyway
    }
  };

  // Handle step navigation
  const handleNextStep = async () => {
    const currentStep = steps[activeStep];
    
    if (!validateStep(currentStep.id)) {
      return;
    }

    // Special validation for budget step
    if (currentStep.id === 'budget_timeline' && costEstimate) {
      const userBudget = parseFloat(formData.budget);
      const estimatedCost = costEstimate.totalCost;
      
      if (userBudget < estimatedCost * 0.7) {
        Alert.alert(
          'Budget Consideration',
          `Your budget (${formatCurrency(userBudget)}) is significantly lower than the estimated cost (${formatCurrency(estimatedCost)}). This may affect project quality. Do you want to continue?`,
          [
            { text: 'Adjust Budget', style: 'cancel' },
            { text: 'Continue', onPress: () => proceedToNextStep() },
          ]
        );
        return;
      }
    }

    await proceedToNextStep();
  };

  const proceedToNextStep = async () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      setShowConfirmation(true);
    }
  };

  const handlePreviousStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  // Create project
  const handleCreateProject = async () => {
    try {
      setLoading(true);
      setShowConfirmation(false);

      // Generate unique project code
      const projectCode = await generateProjectCode(formData.type);

      // Create project object
      const projectData = {
        ...formData,
        code: projectCode,
        clientId: user.id,
        clientName: userProfile?.displayName || user.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        team: [],
        milestones: [],
        documents: {
          blueprint: formData.blueprint,
          landCertificate: formData.landCertificate,
          permitDocuments: formData.permitDocuments,
          additional: formData.additionalDocs,
        },
        metadata: {
          costEstimate,
          feasibilityCheck,
          createdBy: user.role,
        },
      };

      // Validate project requirements
      const validation = validateProjectRequirements(projectData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Create project
      const newProject = await createProject(projectData);

      // Send notifications
      await triggerProjectCreationNotification({
        projectId: newProject.id,
        projectName: newProject.name,
        clientId: user.id,
      });

      // Navigate to AI assignment or project details
      if (user.role === USER_ROLES.GOVERNMENT || formData.type === PROJECT_TYPES.NEW_CONSTRUCTION) {
        router.push({
          pathname: '/projects/ai-assignment',
          params: { projectId: newProject.id }
        });
      } else {
        router.push({
          pathname: '/projects/detail',
          params: { id: newProject.id }
        });
      }

      Alert.alert('Success', 'Project created successfully!');

    } catch (error) {
      Alert.alert('Creation Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    const currentStep = steps[activeStep];

    switch (currentStep.id) {
      case 'basic_info':
        return (
          <ProjectForm
            formData={formData}
            onChange={handleInputChange}
            errors={errors}
            mode="create"
          />
        );

      case 'specifications':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Project Specifications</ThemedText>
            
            <Input
              label="Total Square Area (m²)"
              value={formData.squareArea}
              onChangeText={(text) => handleInputChange('squareArea', text)}
              placeholder="Enter area in square meters"
              error={errors.squareArea}
              keyboardType="numeric"
            />

            <Input
              label="Number of Floors"
              value={formData.floors}
              onChangeText={(text) => handleInputChange('floors', text)}
              placeholder="Enter number of floors"
              error={errors.floors}
              keyboardType="numeric"
            />

            <Input
              label="Number of Rooms"
              value={formData.rooms}
              onChangeText={(text) => handleInputChange('rooms', text)}
              placeholder="Enter total rooms"
              keyboardType="numeric"
            />

            <Input
              label="Number of Bathrooms"
              value={formData.bathrooms}
              onChangeText={(text) => handleInputChange('bathrooms', text)}
              placeholder="Enter total bathrooms"
              keyboardType="numeric"
            />

            {/* Complexity Selection */}
            <Card>
              <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
                Project Complexity
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {Object.values(COMPLEXITY_LEVELS).map(level => (
                  <Button
                    key={level}
                    title={level.charAt(0).toUpperCase() + level.slice(1)}
                    onPress={() => handleInputChange('complexity', level)}
                    variant={formData.complexity === level ? 'primary' : 'outline'}
                    size="small"
                    style={{ flex: 1 }}
                  />
                ))}
              </View>
            </Card>

            {/* Cost Estimate Preview */}
            {costEstimate && (
              <Card style={{ backgroundColor: colors.info + '20' }}>
                <ThemedText type="defaultSemiBold">AI Cost Estimate</ThemedText>
                <ThemedText type="secondary" style={{ marginTop: 8 }}>
                  Estimated cost: {formatCurrency(costEstimate.totalCost)}
                </ThemedText>
                <ThemedText type="secondary" style={{ fontSize: 12 }}>
                  Based on {formData.squareArea}m², {formData.floors} floors, {formData.complexity} complexity
                </ThemedText>
              </Card>
            )}
          </View>
        );

      case 'budget_timeline':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Budget & Timeline</ThemedText>
            
            <BudgetCalculator
              budget={formData.budget}
              onBudgetChange={(budget) => handleInputChange('budget', budget)}
              costEstimate={costEstimate}
              error={errors.budget}
            />

            <Input
              label="Project Timeline"
              value={formData.timeline}
              onChangeText={(text) => handleInputChange('timeline', text)}
              placeholder="e.g., 6 months, 90 days"
              error={errors.timeline}
            />

            <Input
              label="Preferred Start Date"
              value={formData.startDate}
              onChangeText={(text) => handleInputChange('startDate', text)}
              placeholder="DD/MM/YYYY"
              error={errors.startDate}
            />

            <Input
              label="Project Deadline (Optional)"
              value={formData.deadline}
              onChangeText={(text) => handleInputChange('deadline', text)}
              placeholder="DD/MM/YYYY"
            />

            <Button
              title="Get AI Cost Estimation"
              onPress={() => setShowAICalculator(true)}
              variant="outline"
              icon="calculator"
            />
          </View>
        );

      case 'location':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Project Location</ThemedText>
            
            <Button
              title="Pick Location on Map"
              onPress={() => setShowLocationPicker(true)}
              variant="primary"
              icon="map"
              style={{ marginBottom: 16 }}
            />

            <Input
              label="Address"
              value={formData.location.address}
              onChangeText={(text) => handleNestedChange('location', 'address', text)}
              placeholder="Street address"
              error={errors.address}
            />

            <Input
              label="City"
              value={formData.location.city}
              onChangeText={(text) => handleNestedChange('location', 'city', text)}
              placeholder="e.g., Addis Ababa"
              error={errors.city}
            />

            <Input
              label="Subcity"
              value={formData.location.subcity}
              onChangeText={(text) => handleNestedChange('location', 'subcity', text)}
              placeholder="e.g., Bole, Kirkos"
            />

            <Input
              label="Woreda"
              value={formData.location.woreda}
              onChangeText={(text) => handleNestedChange('location', 'woreda', text)}
              placeholder="Woreda number"
            />

            {formData.location.coordinates && (
              <Card>
                <ThemedText type="defaultSemiBold">Selected Location</ThemedText>
                <ThemedText type="secondary" style={{ marginTop: 4 }}>
                  {formData.location.address}, {formData.location.city}
                </ThemedText>
                <ThemedText type="secondary" style={{ fontSize: 12 }}>
                  Coordinates: {formData.location.coordinates.latitude.toFixed(6)}, {formData.location.coordinates.longitude.toFixed(6)}
                </ThemedText>
              </Card>
            )}
          </View>
        );

      case 'documents':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Project Documents</ThemedText>
            
            <DocumentUpload
              title="Blueprint/Design (Optional)"
              document={formData.blueprint}
              onUpload={(file) => handleDocumentUpload('blueprint', file)}
              progress={uploadProgress.blueprint}
              accept={['image/*', 'application/pdf']}
            />

            <DocumentUpload
              title="Land Certificate"
              document={formData.landCertificate}
              onUpload={(file) => handleDocumentUpload('landCertificate', file)}
              progress={uploadProgress.landCertificate}
              error={errors.landCertificate}
              required={user?.role === USER_ROLES.GOVERNMENT}
              accept={['image/*', 'application/pdf']}
            />

            <DocumentUpload
              title="Permit Documents"
              document={formData.permitDocuments}
              onUpload={(file) => handleDocumentUpload('permitDocuments', file)}
              progress={uploadProgress.permitDocuments}
              error={errors.permitDocuments}
              required={user?.role === USER_ROLES.GOVERNMENT}
              accept={['image/*', 'application/pdf']}
            />

            <ThemedText type="secondary">
              Upload any additional documents that might help contractors understand your project requirements.
            </ThemedText>
          </View>
        );

      case 'review':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Review Project Details</ThemedText>
            
            <ProjectReview
              formData={formData}
              costEstimate={costEstimate}
              feasibilityCheck={feasibilityCheck}
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <Loading message="Creating your project..." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <ThemedText type="title">Create New Project</ThemedText>
          <ThemedText type="secondary">
            Step {activeStep + 1} of {steps.length}: {steps[activeStep].title}
          </ThemedText>
          
          {/* Progress Bar */}
          <View style={{ 
            height: 4, 
            backgroundColor: colors.border, 
            borderRadius: 2, 
            marginTop: 12,
            overflow: 'hidden',
          }}>
            <View style={{
              height: '100%',
              backgroundColor: colors.primary,
              width: `${((activeStep + 1) / steps.length) * 100}%`,
              borderRadius: 2,
            }} />
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer Actions */}
        <View style={{ 
          padding: 16, 
          borderTopWidth: 1, 
          borderTopColor: colors.border,
          gap: 12,
        }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {activeStep > 0 && (
              <Button
                title="Back"
                onPress={handlePreviousStep}
                variant="outline"
                style={{ flex: 1 }}
              />
            )}
            
            <Button
              title={activeStep === steps.length - 1 ? 'Create Project' : 'Continue'}
              onPress={handleNextStep}
              variant="primary"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* AI Calculator Modal */}
      <AICostEstimator
        visible={showAICalculator}
        onClose={() => setShowAICalculator(false)}
        projectData={formData}
        onEstimateUpdate={(estimate) => {
          setCostEstimate(estimate);
          if (estimate?.totalCost && !formData.budget) {
            handleInputChange('budget', estimate.totalCost.toString());
          }
        }}
      />

      {/* Location Picker Modal */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        currentLocation={formData.location.coordinates}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmation}
        title="Create Project?"
        message="Please review all details before creating your project. You'll be able to assign workers and manage the project after creation."
        confirmText="Create Project"
        cancelText="Review Details"
        onConfirm={handleCreateProject}
        onCancel={() => setShowConfirmation(false)}
        type="info"
      />
    </ThemedView>
  );
};

// Helper Component for Project Review
const ProjectReview = ({ formData, costEstimate, feasibilityCheck }) => {
  const { colors } = useContext(ThemeContext);

  return (
    <View style={{ gap: 16 }}>
      {/* Basic Information */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Basic Information</ThemedText>
        <ReviewItem label="Project Name" value={formData.name} />
        <ReviewItem label="Project Type" value={formData.type} />
        <ReviewItem label="Category" value={formData.category} />
        <ReviewItem label="Description" value={formData.description} />
      </Card>

      {/* Specifications */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Specifications</ThemedText>
        <ReviewItem label="Square Area" value={`${formData.squareArea} m²`} />
        <ReviewItem label="Floors" value={formData.floors} />
        <ReviewItem label="Rooms" value={formData.rooms} />
        <ReviewItem label="Bathrooms" value={formData.bathrooms} />
        <ReviewItem label="Complexity" value={formData.complexity} />
      </Card>

      {/* Budget & Timeline */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Budget & Timeline</ThemedText>
        <ReviewItem label="Budget" value={formatCurrency(parseFloat(formData.budget))} />
        <ReviewItem label="Timeline" value={formData.timeline} />
        <ReviewItem label="Start Date" value={formData.startDate} />
        <ReviewItem label="Deadline" value={formData.deadline} />
        
        {costEstimate && (
          <View style={{ 
            marginTop: 8, 
            padding: 8, 
            backgroundColor: colors.info + '20',
            borderRadius: 8,
          }}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 12 }}>
              AI Cost Estimate: {formatCurrency(costEstimate.totalCost)}
            </ThemedText>
          </View>
        )}
      </Card>

      {/* Location */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Location</ThemedText>
        <ReviewItem label="Address" value={formData.location.address} />
        <ReviewItem label="City" value={formData.location.city} />
        <ReviewItem label="Subcity" value={formData.location.subcity} />
        <ReviewItem label="Woreda" value={formData.location.woreda} />
      </Card>

      {/* Feasibility Check */}
      {feasibilityCheck && (
        <Card style={{ 
          borderLeftWidth: 4, 
          borderLeftColor: feasibilityCheck.isFeasible ? colors.success : colors.warning 
        }}>
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            Feasibility Check
          </ThemedText>
          <ThemedText type="secondary">
            {feasibilityCheck.isFeasible ? '✅ Project appears feasible' : '⚠️ Review project requirements'}
          </ThemedText>
          {feasibilityCheck.notes && (
            <ThemedText type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              {feasibilityCheck.notes}
            </ThemedText>
          )}
        </Card>
      )}
    </View>
  );
};

const ReviewItem = ({ label, value }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
    <ThemedText type="secondary" style={{ fontSize: 14 }}>{label}:</ThemedText>
    <ThemedText type="defaultSemiBold" style={{ fontSize: 14, flex: 1, marginLeft: 8, textAlign: 'right' }}>
      {value || 'Not specified'}
    </ThemedText>
  </View>
);

export default CreateProjectScreen;