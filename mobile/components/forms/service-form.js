// components/forms/service-form.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

// Contexts
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Button from '../ui/button';
import Input from '../ui/input';
import Card from '../ui/card';
import Badge from '../ui/badge';
import Loading from '../ui/loading';
import Modal from '../ui/modal';
import Switch from '../ui/switch';

// Services
import { serviceService } from '../../services/service-service';
import { uploadService } from '../../services/upload-service';
import { paymentService } from '../../services/payment-service';
import { notificationService } from '../../services/notification-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Utils
import { formatCurrency } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { storage } from '../../utils/storage';

// Constants
import { COLORS } from '../../constants/colors';
import { SERVICE_CATEGORIES, DELIVERY_OPTIONS, AVAILABILITY_OPTIONS } from '../../constants/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Service Form Component
 * Ethiopian market focused with local pricing and categories
 * Multi-service type support for construction, home services, etc.
 */

const ServiceForm = ({
  service,
  onSuccess,
  onCancel,
  mode = 'create', // 'create' or 'edit'
  testID = 'service-form',
}) => {
  const router = useRouter();
  const { theme, user } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [currentRequirement, setCurrentRequirement] = useState('');
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price?.toString() || '',
    originalPrice: service?.originalPrice?.toString() || '',
    category: service?.category || '',
    subcategory: service?.subcategory || '',
    tags: service?.tags || [],
    deliveryTime: service?.deliveryTime || DELIVERY_OPTIONS[2].value,
    availability: service?.availability || AVAILABILITY_OPTIONS[4].value,
    requirements: service?.requirements || [],
    images: service?.images || [],
    isFeatured: service?.isFeatured || false,
    location: service?.location || user?.location || '',
    serviceArea: service?.serviceArea || 'citywide',
    ...service,
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef(null);

  // Service areas for Ethiopian cities
  const serviceAreas = [
    { value: 'citywide', label: 'Citywide' },
    { value: 'specific_area', label: 'Specific Area' },
    { value: 'multiple_cities', label: 'Multiple Cities' },
    { value: 'nationwide', label: 'Nationwide' },
  ];

  // Initialize component
  useEffect(() => {
    animateEntrance();
    requestPermissions();
  }, []);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        notificationService.show({
          type: 'warning',
          title: 'Permission Required',
          message: 'Please allow photo access to upload service images',
        });
      }
    }
  };

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Service name is required';
    } else if (formData.name.length < 5) {
      errors.name = 'Service name should be at least 5 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      errors.description = 'Service description is required';
    } else if (formData.description.length < 20) {
      errors.description = 'Description should be at least 20 characters';
    }

    // Price validation
    if (!formData.price) {
      errors.price = 'Price is required';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      errors.price = 'Please enter a valid price';
    }

    // Category validation
    if (!formData.category) {
      errors.category = 'Category is required';
    }

    // Location validation
    if (!formData.location.trim()) {
      errors.location = 'Service location is required';
    }

    // Images validation
    if (formData.images.length === 0) {
      errors.images = 'At least one service image is required';
    } else if (formData.images.length > 10) {
      errors.images = 'Maximum 10 images allowed';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle form field changes
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when field is updated
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Mark field as touched
    if (!touched[field]) {
      setTouched(prev => ({ ...prev, [field]: true }));
    }
  }, [formErrors, touched]);

  // Handle image upload
  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 10 - formData.images.length,
      });

      if (!result.canceled && result.assets) {
        setUploading(true);

        // Upload each image to cloud storage
        const uploadPromises = result.assets.map(asset =>
          uploadService.uploadImage(asset.uri, `services/${user?.id || 'general'}`)
        );

        const uploadResults = await Promise.all(uploadPromises);
        
        const newImages = uploadResults
          .filter(result => result.success)
          .map(result => ({
            id: Date.now() + Math.random(),
            url: result.url,
            thumbnail: result.thumbnail,
          }));

        setFormData(prev => ({ 
          ...prev, 
          images: [...prev.images, ...newImages] 
        }));
        
        notificationService.show({
          type: 'success',
          title: 'Images Added',
          message: `${newImages.length} image(s) uploaded successfully`,
        });

      }
    } catch (error) {
      console.error('Image upload error:', error);
      notificationService.show({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload images. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Remove image from selection
  const removeImage = useCallback((imageId) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  }, []);

  // Handle requirements management
  const addRequirement = useCallback(() => {
    if (currentRequirement.trim() && !formData.requirements.includes(currentRequirement.trim())) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, currentRequirement.trim()]
      }));
      setCurrentRequirement('');
    }
  }, [currentRequirement, formData.requirements]);

  const removeRequirement = useCallback((requirement) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter(req => req !== requirement)
    }));
  }, []);

  // Calculate listing fee (0 ETB for Ethiopian market as per your business model)
  const calculateListingFee = useCallback(() => {
    return 0; // Free listing for Ethiopian market
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      notificationService.show({
        type: 'error',
        title: 'Form Validation Error',
        message: 'Please check all required fields',
      });
      return;
    }

    try {
      setLoading(true);

      // Prepare submission data
      const submissionData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        images: formData.images.map(img => img.url),
        providerId: user.id,
        providerName: `${user.firstName} ${user.lastName}`,
        providerAvatar: user.avatar,
        status: 'active',
        verificationStatus: 'pending',
      };

      let result;

      if (mode === 'create') {
        result = await serviceService.createService(submissionData);
      } else {
        result = await serviceService.updateService(service.id, submissionData);
      }

      if (result.success) {
        // Track analytics
        analyticsService.track('service_' + (mode === 'create' ? 'created' : 'updated'), {
          serviceId: result.service?.id,
          category: formData.category,
          price: formData.price,
          isFeatured: formData.isFeatured,
          imageCount: formData.images.length,
        });

        // Show success notification
        notificationService.show({
          type: 'success',
          title: 'Success! 🎉',
          message: mode === 'create' 
            ? 'Your service has been listed successfully!' 
            : 'Service updated successfully!',
        });

        // Call success callback
        onSuccess?.(result.service);

      } else {
        throw new Error(result.message || `Service ${mode} failed`);
      }

    } catch (error) {
      console.error('Service submission error:', error);
      
      errorService.handleError(error, {
        context: 'ServiceForm',
        mode,
        userId: user?.id,
      });

      notificationService.show({
        type: 'error',
        title: 'Submission Failed',
        message: error.message || `Unable to ${mode} service. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Render basic information section
  const renderBasicInfo = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Basic Information
      </ThemedText>
      
      <Input
        label="Service Title"
        value={formData.name}
        onChangeText={(value) => handleChange('name', value)}
        error={formErrors.name}
        touched={touched.name}
        placeholder="What service do you offer?"
        maxLength={100}
      />

      <Input
        label="Description"
        value={formData.description}
        onChangeText={(value) => handleChange('description', value)}
        error={formErrors.description}
        touched={touched.description}
        placeholder="Describe your service in detail. What makes it special?"
        multiline
        numberOfLines={4}
        style={styles.descriptionInput}
        maxLength={1000}
      />
    </Card>
  );

  // Render category selection section
  const renderCategorySelection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Category & Location
      </ThemedText>

      <Button
        variant="outline"
        onPress={() => setShowCategoryModal(true)}
        style={styles.selectButton}
      >
        {formData.category || 'Select Service Category'}
      </Button>
      {formErrors.category && touched.category && (
        <ThemedText type="caption" color="error" style={styles.errorText}>
          {formErrors.category}
        </ThemedText>
      )}

      <Input
        label="Service Location"
        value={formData.location}
        onChangeText={(value) => handleChange('location', value)}
        error={formErrors.location}
        touched={touched.location}
        placeholder="City, Region"
      />

      <View style={styles.serviceArea}>
        <ThemedText type="caption" weight="medium" style={styles.inputLabel}>
          Service Coverage Area
        </ThemedText>
        <View style={styles.serviceAreaOptions}>
          {serviceAreas.map(area => (
            <TouchableOpacity
              key={area.value}
              style={[
                styles.areaOption,
                formData.serviceArea === area.value && [
                  styles.selectedAreaOption,
                  { borderColor: theme.colors.primary }
                ],
              ]}
              onPress={() => handleChange('serviceArea', area.value)}
            >
              <ThemedText 
                type="caption" 
                weight="medium"
                color={formData.serviceArea === area.value ? 'primary' : 'secondary'}
              >
                {area.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Card>
  );

  // Render image upload section
  const renderImageUpload = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Service Images ({formData.images.length}/10)
      </ThemedText>
      <ThemedText type="caption" color="secondary" style={styles.sectionSubtitle}>
        Add high-quality photos that showcase your work
      </ThemedText>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.imagesScroll}
      >
        <TouchableOpacity 
          style={styles.addImageButton}
          onPress={handleImagePick}
          disabled={uploading || formData.images.length >= 10}
        >
          {uploading ? (
            <Loading size="small" />
          ) : (
            <>
              <ThemedText type="title">📷</ThemedText>
              <ThemedText type="caption" color="secondary" style={styles.addImageText}>
                Add Images
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        {formData.images.map((image, index) => (
          <View key={image.id} style={styles.imageItem}>
            <Image 
              source={{ uri: image.thumbnail || image.url }} 
              style={styles.serviceImage} 
            />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => removeImage(image.id)}
            >
              <ThemedText type="caption" color="error">✕</ThemedText>
            </TouchableOpacity>
            {index === 0 && (
              <Badge variant="filled" color="primary" size="small" style={styles.primaryBadge}>
                Primary
              </Badge>
            )}
          </View>
        ))}
      </ScrollView>
      {formErrors.images && touched.images && (
        <ThemedText type="caption" color="error" style={styles.errorText}>
          {formErrors.images}
        </ThemedText>
      )}
    </Card>
  );

  // Render pricing section
  const renderPricing = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Pricing
      </ThemedText>
      
      <View style={styles.pricingRow}>
        <Input
          label="Service Price (ETB)"
          value={formData.price}
          onChangeText={(value) => handleChange('price', value)}
          error={formErrors.price}
          touched={touched.price}
          placeholder="0.00"
          keyboardType="decimal-pad"
          style={styles.priceInput}
        />
        
        <Input
          label="Original Price (Optional)"
          value={formData.originalPrice}
          onChangeText={(value) => handleChange('originalPrice', value)}
          placeholder="0.00"
          keyboardType="decimal-pad"
          style={styles.priceInput}
        />
      </View>
    </Card>
  );

  // Render service details section
  const renderServiceDetails = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Service Details
      </ThemedText>

      <View style={styles.detailRow}>
        <View style={styles.detailInput}>
          <ThemedText type="caption" weight="medium" style={styles.inputLabel}>
            Delivery Time
          </ThemedText>
          <Button
            variant="outline"
            onPress={() => {
              // Show delivery options picker
            }}
            style={styles.selectButton}
          >
            {DELIVERY_OPTIONS.find(opt => opt.value === formData.deliveryTime)?.label || 'Select time'}
          </Button>
        </View>

        <View style={styles.detailInput}>
          <ThemedText type="caption" weight="medium" style={styles.inputLabel}>
            Availability
          </ThemedText>
          <Button
            variant="outline"
            onPress={() => {
              // Show availability options picker
            }}
            style={styles.selectButton}
          >
            {AVAILABILITY_OPTIONS.find(opt => opt.value === formData.availability)?.label || 'Select availability'}
          </Button>
        </View>
      </View>

      <Button
        variant="outline"
        onPress={() => setShowRequirementsModal(true)}
        style={styles.requirementsButton}
      >
        Client Requirements ({formData.requirements.length})
      </Button>
    </Card>
  );

  // Render featured listing section
  const renderFeaturedListing = () => (
    <Card style={styles.featuredCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Featured Listing
      </ThemedText>
      
      <View style={styles.featuredToggle}>
        <View style={styles.toggleInfo}>
          <ThemedText type="body" weight="semiBold">
            Feature this listing
          </ThemedText>
          <ThemedText type="caption" color="secondary">
            Get 5x more visibility and priority placement in search results
          </ThemedText>
        </View>
        <Switch
          value={formData.isFeatured}
          onValueChange={(value) => handleChange('isFeatured', value)}
        />
      </View>

      {formData.isFeatured && (
        <View style={styles.featuredBenefits}>
          <ThemedText type="caption" weight="medium" style={styles.benefitsTitle}>
            Featured Listing Benefits:
          </ThemedText>
          <View style={styles.benefitsList}>
            <ThemedText type="caption">• Priority placement in search results</ThemedText>
            <ThemedText type="caption">• 5x more visibility to potential clients</ThemedText>
            <ThemedText type="caption">• Featured badge on your service card</ThemedText>
            <ThemedText type="caption">• Higher booking conversion rates</ThemedText>
          </View>
        </View>
      )}
    </Card>
  );

  // Render category selection modal
  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      onDismiss={() => setShowCategoryModal(false)}
      title="Select Service Category"
      size="large"
    >
      <View style={styles.modalContent}>
        <ScrollView style={styles.modalScroll}>
          {Object.entries(SERVICE_CATEGORIES).map(([category, data]) => (
            <View key={category} style={styles.categorySection}>
              <ThemedText type="body" weight="semiBold" style={styles.categoryTitle}>
                {data.icon} {category}
              </ThemedText>
              <View style={styles.subcategoriesGrid}>
                {data.subcategories.map(subcategory => (
                  <TouchableOpacity
                    key={subcategory}
                    style={[
                      styles.subcategoryButton,
                      formData.category === subcategory && [
                        styles.selectedSubcategoryButton,
                        { backgroundColor: theme.colors.primary + '20' }
                      ],
                    ]}
                    onPress={() => {
                      handleChange('category', subcategory);
                      setShowCategoryModal(false);
                    }}
                  >
                    <ThemedText 
                      type="caption" 
                      weight="medium"
                      color={formData.category === subcategory ? 'primary' : 'secondary'}
                    >
                      {subcategory}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  // Render requirements modal
  const renderRequirementsModal = () => (
    <Modal
      visible={showRequirementsModal}
      onDismiss={() => setShowRequirementsModal(false)}
      title="Client Requirements"
      size="medium"
    >
      <View style={styles.modalContent}>
        <ThemedText type="caption" color="secondary" style={styles.modalSubtitle}>
          List what clients need to provide or prepare
        </ThemedText>
        
        <View style={styles.addRequirementContainer}>
          <Input
            placeholder="Add a requirement (e.g., 'Provide materials', 'Clear workspace')"
            value={currentRequirement}
            onChangeText={setCurrentRequirement}
            style={styles.requirementInput}
          />
          <Button
            variant="primary"
            onPress={addRequirement}
            style={styles.addRequirementButton}
          >
            Add
          </Button>
        </View>

        <View style={styles.requirementsList}>
          {formData.requirements.map((requirement, index) => (
            <View key={index} style={styles.requirementItem}>
              <ThemedText type="caption">✓</ThemedText>
              <ThemedText type="caption" style={styles.requirementText}>
                {requirement}
              </ThemedText>
              <TouchableOpacity 
                style={styles.removeRequirementButton}
                onPress={() => removeRequirement(requirement)}
              >
                <ThemedText type="caption" color="error">✕</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Button
          variant="primary"
          onPress={() => setShowRequirementsModal(false)}
          style={styles.modalButton}
        >
          Done
        </Button>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading message={mode === 'create' ? 'Creating your service...' : 'Updating service...'} />
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      testID={testID}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderBasicInfo()}
        {renderCategorySelection()}
        {renderImageUpload()}
        {renderPricing()}
        {renderServiceDetails()}
        {renderFeaturedListing()}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onCancel && (
            <Button
              variant="outline"
              onPress={onCancel}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          >
            {mode === 'create' ? 'List Service' : 'Update Service'}
          </Button>
        </View>

        {/* Free Listing Notice */}
        <View style={styles.freeListingNotice}>
          <ThemedText type="caption" color="secondary" style={styles.freeListingText}>
            🎉 Free service listing - No fees for Ethiopian service providers
          </ThemedText>
        </View>
      </ScrollView>

      {/* Modals */}
      {renderCategoryModal()}
      {renderRequirementsModal()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    paddingBottom: 32,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    marginBottom: 12,
  },
  descriptionInput: {
    minHeight: 100,
  },
  selectButton: {
    width: '100%',
    justifyContent: 'space-between',
  },
  serviceArea: {
    marginTop: 16,
  },
  inputLabel: {
    marginBottom: 8,
  },
  serviceAreaOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedAreaOption: {
    borderWidth: 2,
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginRight: 12,
  },
  addImageText: {
    marginTop: 4,
    textAlign: 'center',
  },
  imageItem: {
    position: 'relative',
    marginRight: 12,
  },
  serviceImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailInput: {
    flex: 1,
  },
  requirementsButton: {
    width: '100%',
    justifyContent: 'space-between',
  },
  featuredCard: {
    marginBottom: 16,
  },
  featuredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleInfo: {
    flex: 1,
    gap: 4,
  },
  featuredBenefits: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  benefitsTitle: {
    marginBottom: 8,
  },
  benefitsList: {
    gap: 4,
  },
  modalContent: {
    flex: 1,
    gap: 16,
  },
  modalScroll: {
    flex: 1,
  },
  modalSubtitle: {
    marginBottom: 8,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    marginBottom: 12,
  },
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subcategoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedSubcategoryButton: {
    borderColor: 'transparent',
  },
  addRequirementContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  requirementInput: {
    flex: 1,
  },
  addRequirementButton: {
    minWidth: 60,
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  requirementText: {
    flex: 1,
  },
  removeRequirementButton: {
    padding: 4,
  },
  modalButton: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  freeListingNotice: {
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
  },
  freeListingText: {
    textAlign: 'center',
  },
  errorText: {
    marginTop: 4,
  },
});

export default ServiceForm;