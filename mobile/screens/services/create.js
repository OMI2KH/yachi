import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { useLocation } from '../../../hooks/use-location';
import { useUpload } from '../../../hooks/use-upload';
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
  ServiceForm 
} from '../../../components/forms/service-form';
import { 
  LocationPicker 
} from '../../../components/ui/location-picker';
import { 
  ImageUploader 
} from '../../../components/ui/image-uploader';
import { 
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  serviceService 
} from '../../../services/service-service';
import { 
  uploadService 
} from '../../../services/upload-service';
import { 
  aiAssignmentService 
} from '../../../services/ai-assignment-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Service Creation Screen
 * Features: AI-powered service optimization, multi-category support, dynamic pricing, location intelligence
 */
const ServiceCreateScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  const { currentLocation, getCurrentLocation } = useLocation();
  const { uploadImage, isUploading } = useUpload();
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [serviceData, setServiceData] = useState({
    // Basic Information
    title: '',
    description: '',
    category: '',
    subcategory: '',
    tags: [],
    
    // Service Details
    serviceType: 'one_time', // one_time, recurring, subscription
    duration: 60, // minutes
    minDuration: 30,
    maxDuration: 480,
    
    // Pricing
    pricingModel: 'fixed', // fixed, hourly, square_meter, custom
    basePrice: 0,
    hourlyRate: 0,
    minPrice: 0,
    maxPrice: 0,
    currency: 'ETB',
    
    // Location & Availability
    location: {
      address: '',
      city: '',
      region: '',
      coordinates: null,
      radius: 10, // km
    },
    serviceAreas: [],
    availableLocations: [],
    
    // Availability
    availability: {
      monday: { available: true, start: '08:00', end: '18:00' },
      tuesday: { available: true, start: '08:00', end: '18:00' },
      wednesday: { available: true, start: '08:00', end: '18:00' },
      thursday: { available: true, start: '08:00', end: '18:00' },
      friday: { available: true, start: '08:00', end: '18:00' },
      saturday: { available: false, start: '09:00', end: '17:00' },
      sunday: { available: false, start: '09:00', end: '17:00' },
    },
    emergencyService: false,
    afterHoursService: false,
    
    // Media & Documentation
    images: [],
    videos: [],
    documents: [],
    portfolioItems: [],
    
    // Requirements & Specifications
    requirements: {
      minExperience: 0, // years
      certifications: [],
      toolsRequired: [],
      materialsProvided: false,
      teamSize: 1,
    },
    
    // AI Optimization
    aiOptimized: false,
    targetAudience: [],
    competitiveAnalysis: {},
    pricingStrategy: '',
    
    // Metadata
    featured: false,
    instantBooking: true,
    bookingNotice: 2, // hours
    cancellationPolicy: 'flexible', // flexible, moderate, strict
  });

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ServiceCreate');
    }, [])
  );

  // Service categories with Ethiopian market focus
  const serviceCategories = useMemo(() => [
    {
      id: 'construction',
      name: 'Construction',
      subcategories: [
        'New Building Construction',
        'Building Finishing',
        'Renovation & Remodeling',
        'Structural Work',
        'Foundation Work',
        'Roofing',
        'Flooring',
      ],
      icon: '🏗️'
    },
    {
      id: 'electrical',
      name: 'Electrical',
      subcategories: [
        'Wiring Installation',
        'Electrical Repair',
        'Panel Upgrade',
        'Lighting Installation',
        'Generator Installation',
        'Solar System Installation',
      ],
      icon: '⚡'
    },
    {
      id: 'plumbing',
      name: 'Plumbing',
      subcategories: [
        'Pipe Installation',
        'Leak Repair',
        'Water Heater Installation',
        'Drain Cleaning',
        'Bathroom Plumbing',
        'Kitchen Plumbing',
      ],
      icon: '🔧'
    },
    {
      id: 'cleaning',
      name: 'Cleaning',
      subcategories: [
        'House Cleaning',
        'Office Cleaning',
        'Construction Cleaning',
        'Carpet Cleaning',
        'Window Cleaning',
        'Deep Cleaning',
      ],
      icon: '🧹'
    },
    {
      id: 'carpentry',
      name: 'Carpentry',
      subcategories: [
        'Furniture Making',
        'Cabinet Installation',
        'Door & Window Installation',
        'Wood Flooring',
        'Custom Woodwork',
        'Repair & Maintenance',
      ],
      icon: '🪵'
    },
    {
      id: 'painting',
      name: 'Painting',
      subcategories: [
        'Interior Painting',
        'Exterior Painting',
        'Wall Painting',
        'Furniture Painting',
        'Decorative Painting',
        'Surface Preparation',
      ],
      icon: '🎨'
    }
  ], []);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Get current location for default service area
      const location = await getCurrentLocation();
      if (location) {
        setServiceData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            coordinates: location.coordinates,
            address: location.address,
            city: location.city,
            region: location.region,
          }
        }));
      }
      
      analyticsService.trackEvent('service_create_initialized', {
        userId: user?.id,
        userRole: user?.role,
      });
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, user?.role, getCurrentLocation]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

  // Handle form field updates
  const handleFieldUpdate = useCallback((field, value) => {
    setServiceData(prev => {
      const fieldPath = field.split('.');
      if (fieldPath.length === 1) {
        return { ...prev, [field]: value };
      }
      
      // Handle nested fields
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < fieldPath.length - 1; i++) {
        current = current[fieldPath[i]];
      }
      current[fieldPath[fieldPath.length - 1]] = value;
      return newData;
    });
  }, []);

  // Handle image upload
  const handleImageUpload = async (imageUri) => {
    try {
      const uploadedImage = await uploadImage(imageUri, 'service-images');
      setServiceData(prev => ({
        ...prev,
        images: [...prev.images, uploadedImage]
      }));
      
      showSuccess('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Failed to upload image');
    }
  };

  // Handle image removal
  const handleImageRemove = (imageId) => {
    setServiceData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  };

  // Handle AI optimization
  const handleAIOptimization = async () => {
    try {
      setIsLoading(true);
      
      const suggestions = await aiAssignmentService.optimizeServiceListing(serviceData);
      setAiSuggestions(suggestions);
      setShowAIModal(true);
      
      analyticsService.trackEvent('ai_service_optimization_requested', {
        userId: user?.id,
        serviceCategory: serviceData.category,
        hasImages: serviceData.images.length > 0,
      });
    } catch (error) {
      console.error('Error getting AI optimization:', error);
      showError('Failed to get AI optimization suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle AI suggestion application
  const handleApplyAISuggestion = (suggestion) => {
    setServiceData(prev => ({
      ...prev,
      ...suggestion.changes,
      aiOptimized: true
    }));
    
    analyticsService.trackEvent('ai_suggestion_applied', {
      userId: user?.id,
      suggestionType: suggestion.type,
      impactScore: suggestion.impactScore,
    });
    
    showSuccess('AI suggestion applied successfully');
  };

  // Handle location selection
  const handleLocationSelect = (location) => {
    setServiceData(prev => ({
      ...prev,
      location: {
        address: location.address,
        city: location.city,
        region: location.region,
        coordinates: location.coordinates,
        radius: prev.location.radius,
      }
    }));
  };

  // Handle service area addition
  const handleAddServiceArea = (area) => {
    setServiceData(prev => ({
      ...prev,
      serviceAreas: [...prev.serviceAreas, area]
    }));
  };

  // Handle service area removal
  const handleRemoveServiceArea = (areaId) => {
    setServiceData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter(area => area.id !== areaId)
    }));
  };

  // Validate service data
  const validateServiceData = useCallback(() => {
    const errors = [];

    if (!serviceData.title?.trim()) {
      errors.push('Service title is required');
    }

    if (!serviceData.description?.trim()) {
      errors.push('Service description is required');
    }

    if (!serviceData.category) {
      errors.push('Service category is required');
    }

    if (!serviceData.basePrice || serviceData.basePrice <= 0) {
      errors.push('Valid base price is required');
    }

    if (!serviceData.location?.address) {
      errors.push('Service location is required');
    }

    if (serviceData.images.length === 0) {
      errors.push('At least one service image is required');
    }

    return errors;
  }, [serviceData]);

  // Handle service submission
  const handleSubmitService = async (publish = true) => {
    try {
      const errors = validateServiceData();
      if (errors.length > 0) {
        Alert.alert('Validation Error', errors.join('\n'));
        return;
      }

      setIsLoading(true);

      const submissionData = {
        ...serviceData,
        status: publish ? 'active' : 'draft',
        providerId: user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdService = await serviceService.createService(submissionData);
      
      analyticsService.trackEvent('service_created', {
        userId: user?.id,
        serviceId: createdService.id,
        serviceCategory: serviceData.category,
        pricing: serviceData.basePrice,
        status: publish ? 'published' : 'draft',
        aiOptimized: serviceData.aiOptimized,
      });

      showSuccess(
        publish 
          ? 'Service published successfully!' 
          : 'Service saved as draft'
      );

      // Navigate to service detail or listings
      if (publish) {
        router.push(`/(services)/${createdService.id}`);
      } else {
        router.push('/(tabs)/services');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      showError('Failed to create service');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pricing calculation
  const handlePricingCalculation = useCallback(() => {
    if (!serviceData.category || !serviceData.duration) return;

    // AI-powered pricing suggestion based on market data
    const suggestedPricing = aiAssignmentService.suggestServicePricing(
      serviceData.category,
      serviceData.duration,
      serviceData.requirements.minExperience,
      currentLocation?.region
    );

    setServiceData(prev => ({
      ...prev,
      basePrice: suggestedPricing.basePrice,
      hourlyRate: suggestedPricing.hourlyRate,
      minPrice: suggestedPricing.minPrice,
      maxPrice: suggestedPricing.maxPrice,
    }));
  }, [serviceData.category, serviceData.duration, serviceData.requirements.minExperience, currentLocation?.region]);

  // Render basic information section
  const renderBasicInformation = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Basic Information
      </ThemedText>
      
      <Input
        label="Service Title *"
        placeholder="e.g., Professional House Painting Service"
        value={serviceData.title}
        onChangeText={(value) => handleFieldUpdate('title', value)}
        maxLength={100}
        style={styles.input}
      />
      
      <Input
        label="Description *"
        placeholder="Describe your service in detail..."
        value={serviceData.description}
        onChangeText={(value) => handleFieldUpdate('description', value)}
        multiline
        numberOfLines={4}
        style={styles.input}
      />
      
      <View style={styles.categorySection}>
        <ThemedText style={styles.inputLabel}>Category *</ThemedText>
        <View style={styles.categoryGrid}>
          {serviceCategories.map((category) => (
            <Button
              key={category.id}
              variant={serviceData.category === category.id ? 'primary' : 'outlined'}
              onPress={() => handleFieldUpdate('category', category.id)}
              style={styles.categoryButton}
            >
              <ThemedText style={styles.categoryIcon}>{category.icon}</ThemedText>
              <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
            </Button>
          ))}
        </View>
      </View>
      
      {serviceData.category && (
        <View style={styles.subcategorySection}>
          <ThemedText style={styles.inputLabel}>Subcategory</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {serviceCategories
              .find(cat => cat.id === serviceData.category)
              ?.subcategories.map((subcategory) => (
                <Button
                  key={subcategory}
                  variant={serviceData.subcategory === subcategory ? 'primary' : 'outlined'}
                  onPress={() => handleFieldUpdate('subcategory', subcategory)}
                  size="small"
                  style={styles.subcategoryButton}
                >
                  {subcategory}
                </Button>
              ))}
          </ScrollView>
        </View>
      )}
    </Card>
  );

  // Render pricing section
  const renderPricingSection = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Pricing & Duration
        </ThemedText>
        <Button
          variant="outlined"
          onPress={handlePricingCalculation}
          size="small"
          leftIcon="calculate"
        >
          AI Pricing
        </Button>
      </View>
      
      <View style={styles.pricingGrid}>
        <Input
          label="Base Price (ETB) *"
          placeholder="0"
          value={serviceData.basePrice?.toString()}
          onChangeText={(value) => handleFieldUpdate('basePrice', parseFloat(value) || 0)}
          keyboardType="numeric"
          style={styles.pricingInput}
        />
        
        <Input
          label="Duration (minutes)"
          placeholder="60"
          value={serviceData.duration?.toString()}
          onChangeText={(value) => handleFieldUpdate('duration', parseInt(value) || 0)}
          keyboardType="numeric"
          style={styles.pricingInput}
        />
      </View>
      
      <View style={styles.pricingOptions}>
        <ThemedText style={styles.inputLabel}>Pricing Model</ThemedText>
        <View style={styles.pricingModelGrid}>
          {[
            { key: 'fixed', label: 'Fixed Price', icon: '💰' },
            { key: 'hourly', label: 'Hourly Rate', icon: '⏰' },
            { key: 'square_meter', label: 'Per m²', icon: '📐' },
            { key: 'custom', label: 'Custom Quote', icon: '📝' },
          ].map((model) => (
            <Button
              key={model.key}
              variant={serviceData.pricingModel === model.key ? 'primary' : 'outlined'}
              onPress={() => handleFieldUpdate('pricingModel', model.key)}
              style={styles.pricingModelButton}
            >
              <ThemedText style={styles.modelIcon}>{model.icon}</ThemedText>
              <ThemedText style={styles.modelLabel}>{model.label}</ThemedText>
            </Button>
          ))}
        </View>
      </View>
    </Card>
  );

  // Render location section
  const renderLocationSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Service Location
      </ThemedText>
      
      <LocationPicker
        location={serviceData.location}
        onLocationSelect={handleLocationSelect}
        style={styles.locationPicker}
      />
      
      <Input
        label="Service Radius (km)"
        placeholder="10"
        value={serviceData.location.radius?.toString()}
        onChangeText={(value) => handleFieldUpdate('location.radius', parseInt(value) || 0)}
        keyboardType="numeric"
        style={styles.input}
      />
      
      <View style={styles.serviceAreas}>
        <ThemedText style={styles.inputLabel}>Additional Service Areas</ThemedText>
        {serviceData.serviceAreas.map((area) => (
          <View key={area.id} style={styles.serviceAreaItem}>
            <ThemedText style={styles.areaText}>{area.address}</ThemedText>
            <Button
              variant="ghost"
              onPress={() => handleRemoveServiceArea(area.id)}
              size="small"
            >
              Remove
            </Button>
          </View>
        ))}
        <Button
          variant="outlined"
          onPress={() => {/* Open location picker for new area */}}
          leftIcon="add"
        >
          Add Service Area
        </Button>
      </View>
    </Card>
  );

  // Render media section
  const renderMediaSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Service Media
      </ThemedText>
      
      <ImageUploader
        images={serviceData.images}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
        maxImages={10}
        isUploading={isUploading}
        style={styles.imageUploader}
      />
      
      <ThemedText style={styles.mediaNote}>
        Upload high-quality photos of your previous work. First image will be used as cover.
      </ThemedText>
    </Card>
  );

  // Render requirements section
  const renderRequirementsSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        Service Requirements
      </ThemedText>
      
      <View style={styles.requirementsGrid}>
        <Input
          label="Minimum Experience (years)"
          placeholder="2"
          value={serviceData.requirements.minExperience?.toString()}
          onChangeText={(value) => handleFieldUpdate('requirements.minExperience', parseInt(value) || 0)}
          keyboardType="numeric"
          style={styles.requirementInput}
        />
        
        <Input
          label="Team Size"
          placeholder="1"
          value={serviceData.requirements.teamSize?.toString()}
          onChangeText={(value) => handleFieldUpdate('requirements.teamSize', parseInt(value) || 1)}
          keyboardType="numeric"
          style={styles.requirementInput}
        />
      </View>
      
      <View style={styles.requirementOptions}>
        <Button
          variant={serviceData.requirements.materialsProvided ? 'primary' : 'outlined'}
          onPress={() => handleFieldUpdate('requirements.materialsProvided', !serviceData.requirements.materialsProvided)}
          style={styles.requirementButton}
        >
          {serviceData.requirements.materialsProvided ? '✅' : '❌'} Materials Provided
        </Button>
        
        <Button
          variant={serviceData.emergencyService ? 'primary' : 'outlined'}
          onPress={() => handleFieldUpdate('emergencyService', !serviceData.emergencyService)}
          style={styles.requirementButton}
        >
          {serviceData.emergencyService ? '✅' : '❌'} Emergency Service
        </Button>
        
        <Button
          variant={serviceData.afterHoursService ? 'primary' : 'outlined'}
          onPress={() => handleFieldUpdate('afterHoursService', !serviceData.afterHoursService)}
          style={styles.requirementButton}
        >
          {serviceData.afterHoursService ? '✅' : '❌'} After Hours Service
        </Button>
      </View>
    </Card>
  );

  // Render action buttons
  const renderActionButtons = () => (
    <Card style={styles.actionsCard}>
      <View style={styles.actionButtons}>
        <Button
          variant="outlined"
          onPress={() => handleSubmitService(false)}
          leftIcon="save"
          style={styles.actionButton}
          loading={isLoading}
        >
          Save Draft
        </Button>
        
        <Button
          variant="primary"
          onPress={() => handleSubmitService(true)}
          leftIcon="publish"
          style={styles.actionButton}
          loading={isLoading}
        >
          Publish Service
        </Button>
      </View>
      
      <Button
        variant="ghost"
        onPress={handleAIOptimization}
        leftIcon="ai"
        style={styles.aiButton}
        loading={isLoading}
      >
        Optimize with AI
      </Button>
    </Card>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadInitialData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        {renderBasicInformation()}

        {/* Pricing Section */}
        {renderPricingSection()}

        {/* Location Section */}
        {renderLocationSection()}

        {/* Media Section */}
        {renderMediaSection()}

        {/* Requirements Section */}
        {renderRequirementsSection()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* AI Optimization Modal */}
      <ConfirmationModal
        visible={showAIModal}
        title="AI Service Optimization"
        message="We've analyzed your service listing and found opportunities for improvement:"
        confirmText="Apply All"
        cancelText="Close"
        onConfirm={() => {
          aiSuggestions.forEach(suggestion => handleApplyAISuggestion(suggestion));
          setShowAIModal(false);
        }}
        onCancel={() => setShowAIModal(false)}
      >
        <View style={styles.modalContent}>
          {aiSuggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <View style={styles.suggestionHeader}>
                <ThemedText style={styles.suggestionTitle}>
                  {suggestion.title}
                </ThemedText>
                <Badge variant="success">
                  +{suggestion.impactScore}% impact
                </Badge>
              </View>
              <ThemedText style={styles.suggestionDescription}>
                {suggestion.description}
              </ThemedText>
              <Button
                variant="outlined"
                onPress={() => handleApplyAISuggestion(suggestion)}
                size="small"
                style={styles.applySuggestionButton}
              >
                Apply This Change
              </Button>
            </View>
          ))}
        </View>
      </ConfirmationModal>
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  sectionCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  subcategorySection: {
    marginBottom: 16,
  },
  subcategoryButton: {
    marginRight: 8,
  },
  pricingGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pricingInput: {
    flex: 1,
  },
  pricingOptions: {
    marginBottom: 16,
  },
  pricingModelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pricingModelButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    alignItems: 'center',
  },
  modelIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  modelLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  locationPicker: {
    marginBottom: 16,
  },
  serviceAreas: {
    gap: 8,
  },
  serviceAreaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  areaText: {
    flex: 1,
    fontSize: 14,
  },
  imageUploader: {
    marginBottom: 12,
  },
  mediaNote: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  requirementsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  requirementInput: {
    flex: 1,
  },
  requirementOptions: {
    gap: 8,
  },
  requirementButton: {
    justifyContent: 'flex-start',
  },
  actionsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
  aiButton: {
    width: '100%',
  },
  spacer: {
    height: 20,
  },
  modalContent: {
    gap: 16,
  },
  suggestionItem: {
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  suggestionDescription: {
    fontSize: 12,
    opacity: 0.7,
    lineHeight: 16,
    marginBottom: 8,
  },
  applySuggestionButton: {
    alignSelf: 'flex-start',
  },
};

export default ServiceCreateScreen;