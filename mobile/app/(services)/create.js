import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLoading } from '../../contexts/loading-context';
import { 
  Button, 
  ButtonVariant,
  PrimaryButton,
  OutlineButton,
  IconButton 
} from '../../components/ui/button';
import Input, { TextArea } from '../../components/ui/input';
import Loading from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Collapsible } from '../../components/collapsible';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { serviceService } from '../../services/service-service';
import { uploadService } from '../../services/upload-service';
import * as ImagePicker from 'expo-image-picker';

// Service categories
const SERVICE_CATEGORIES = [
  { id: 'cleaning', name: 'Cleaning', icon: '🧹', subcategories: [
    'deep_cleaning', 'regular_cleaning', 'office_cleaning', 'move_in_out'
  ]},
  { id: 'repair', name: 'Repairs', icon: '🔧', subcategories: [
    'plumbing', 'electrical', 'appliance', 'general_repair'
  ]},
  { id: 'installation', name: 'Installation', icon: '⚡', subcategories: [
    'furniture', 'appliance', 'electronics', 'lighting'
  ]},
  { id: 'moving', name: 'Moving', icon: '📦', subcategories: [
    'local_moving', 'long_distance', 'packing', 'loading'
  ]},
  { id: 'beauty', name: 'Beauty', icon: '💅', subcategories: [
    'hair', 'nails', 'makeup', 'skincare'
  ]},
  { id: 'fitness', name: 'Fitness', icon: '💪', subcategories: [
    'personal_training', 'yoga', 'nutrition', 'rehabilitation'
  ]},
  { id: 'tutoring', name: 'Tutoring', icon: '📚', subcategories: [
    'academic', 'music', 'language', 'test_prep'
  ]},
  { id: 'events', name: 'Events', icon: '🎉', subcategories: [
    'planning', 'catering', 'photography', 'entertainment'
  ]},
  { id: 'other', name: 'Other', icon: '🔍', subcategories: ['custom'] },
];

// Duration options
const DURATION_OPTIONS = [
  { value: 0.5, label: '30 minutes' },
  { value: 1, label: '1 hour' },
  { value: 1.5, label: '1.5 hours' },
  { value: 2, label: '2 hours' },
  { value: 3, label: '3 hours' },
  { value: 4, label: '4 hours' },
  { value: 6, label: '6 hours' },
  { value: 8, label: '8 hours' },
];

// Availability options
const AVAILABILITY_OPTIONS = [
  { id: 'flexible', label: 'Flexible', description: 'Available based on schedule' },
  { id: 'fixed', label: 'Fixed Hours', description: 'Specific hours each day' },
  { id: 'appointment', label: 'By Appointment', description: 'Scheduled appointments only' },
];

export default function CreateServiceScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // Form state
  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    category: '',
    subcategory: '',
    description: '',
    longDescription: '',
    
    // Pricing & Duration
    price: '',
    originalPrice: '',
    duration: 1,
    pricingType: 'fixed', // 'fixed', 'hourly', 'custom'
    
    // Availability
    availability: 'flexible',
    availableDays: [],
    availableHours: { start: '09:00', end: '17:00' },
    sameDayService: false,
    emergencyService: false,
    
    // Service Details
    tags: [],
    requirements: [],
    includes: [],
    location: {
      address: '',
      city: '',
      zipCode: '',
      servesArea: 10, // miles
    },
    
    // Media
    images: [],
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'You need to be signed in as a provider to create services.',
        [
          { text: 'Cancel', onPress: () => router.back() },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
        ]
      );
    }
  }, [isAuthenticated]);

  // Initial animations
  useEffect(() => {
    startAnimations();
  }, []);

  // Progress animation
  useEffect(() => {
    const progress = currentStep / 5; // 5 steps total
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Form handlers
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleNestedFieldChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const handleFieldBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Validation
  const validateField = (field, value) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'title':
        if (!value?.trim()) {
          newErrors.title = 'Service title is required';
        } else if (value.length < 5) {
          newErrors.title = 'Title must be at least 5 characters';
        } else if (value.length > 100) {
          newErrors.title = 'Title must be less than 100 characters';
        } else {
          delete newErrors.title;
        }
        break;

      case 'category':
        if (!value) {
          newErrors.category = 'Please select a category';
        } else {
          delete newErrors.category;
        }
        break;

      case 'description':
        if (!value?.trim()) {
          newErrors.description = 'Service description is required';
        } else if (value.length < 20) {
          newErrors.description = 'Description must be at least 20 characters';
        } else if (value.length > 500) {
          newErrors.description = 'Description must be less than 500 characters';
        } else {
          delete newErrors.description;
        }
        break;

      case 'price':
        if (!value) {
          newErrors.price = 'Price is required';
        } else if (isNaN(value) || parseFloat(value) <= 0) {
          newErrors.price = 'Please enter a valid price';
        } else {
          delete newErrors.price;
        }
        break;

      case 'location.address':
        if (!value?.trim()) {
          newErrors['location.address'] = 'Service address is required';
        } else {
          delete newErrors['location.address'];
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Basic Information
        if (!formData.title?.trim()) newErrors.title = 'Service title is required';
        if (!formData.category) newErrors.category = 'Please select a category';
        if (!formData.description?.trim()) newErrors.description = 'Service description is required';
        break;

      case 2: // Pricing
        if (!formData.price) newErrors.price = 'Price is required';
        if (!formData.duration) newErrors.duration = 'Duration is required';
        break;

      case 3: // Availability
        if (!formData.availability) newErrors.availability = 'Please select availability type';
        if (formData.availableDays.length === 0) newErrors.availableDays = 'Please select available days';
        break;

      case 4: // Location
        if (!formData.location.address?.trim()) newErrors['location.address'] = 'Service address is required';
        if (!formData.location.city?.trim()) newErrors['location.city'] = 'City is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step navigation
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      // Mark all fields in current step as touched
      const stepFields = getStepFields(currentStep);
      const newTouched = { ...touched };
      stepFields.forEach(field => {
        newTouched[field] = true;
      });
      setTouched(newTouched);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      handleCancel();
    }
  };

  const getStepFields = (step) => {
    switch (step) {
      case 1: return ['title', 'category', 'description'];
      case 2: return ['price', 'duration'];
      case 3: return ['availability', 'availableDays'];
      case 4: return ['location.address', 'location.city'];
      default: return [];
    }
  };

  // Image handling
  const handleAddImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 10 - formData.images.length,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          type: 'image/jpeg',
        }));

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages],
        }));

        analyticsService.trackEvent('service_images_added', {
          count: newImages.length,
          total_count: formData.images.length + newImages.length,
        });
      }
    } catch (error) {
      console.error('Error picking images:', error);
      errorService.captureError(error, { context: 'ImagePicker' });
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const uploadImages = async (images) => {
    const uploadPromises = images.map(async (image, index) => {
      const uploadResult = await uploadService.uploadImage(image.uri, {
        fileName: image.fileName,
        onProgress: (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [index]: progress,
          }));
        },
      });
      return uploadResult.url;
    });

    return Promise.all(uploadPromises);
  };

  // Form submission
  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    showLoading('Creating your service...');

    try {
      // Upload images first
      let imageUrls = [];
      if (formData.images.length > 0) {
        imageUrls = await uploadImages(formData.images);
      }

      // Prepare service data
      const serviceData = {
        ...formData,
        images: imageUrls,
        providerId: user.id,
        status: 'active',
        isAvailable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create service
      const result = await serviceService.createService(serviceData);

      if (result.success) {
        analyticsService.trackEvent('service_created', {
          service_id: result.service.id,
          category: formData.category,
          price: formData.price,
          has_images: imageUrls.length > 0,
        });

        Alert.alert(
          'Service Created!',
          'Your service has been successfully listed and is now visible to customers.',
          [
            {
              text: 'View Service',
              onPress: () => router.push(`/(services)/${result.service.id}`),
            },
            {
              text: 'Create Another',
              onPress: () => {
                resetForm();
                setCurrentStep(1);
              },
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to create service');
      }

    } catch (error) {
      console.error('Error creating service:', error);
      errorService.captureError(error, { context: 'ServiceCreation' });
      
      Alert.alert(
        'Creation Failed',
        'Unable to create service. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  const handleCancel = () => {
    if (isFormDirty()) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to leave? Your changes will not be saved.',
        [
          { text: 'Continue Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive', 
            onPress: () => router.back() 
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const isFormDirty = () => {
    return Object.values(formData).some(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(subValue => 
          Array.isArray(subValue) ? subValue.length > 0 : !!subValue
        );
      }
      return !!value;
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      subcategory: '',
      description: '',
      longDescription: '',
      price: '',
      originalPrice: '',
      duration: 1,
      pricingType: 'fixed',
      availability: 'flexible',
      availableDays: [],
      availableHours: { start: '09:00', end: '17:00' },
      sameDayService: false,
      emergencyService: false,
      tags: [],
      requirements: [],
      includes: [],
      location: {
        address: '',
        city: '',
        zipCode: '',
        servesArea: 10,
      },
      images: [],
    });
    setErrors({});
    setTouched({});
  };

  // Array field handlers
  const handleAddTag = () => {
    const newTag = prompt('Enter a tag:');
    if (newTag && newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
    }
  };

  const handleRemoveTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const handleAddRequirement = () => {
    const newRequirement = prompt('Enter a requirement:');
    if (newRequirement && newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()],
      }));
    }
  };

  const handleRemoveRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const handleAddInclude = () => {
    const newInclude = prompt('Enter what\'s included:');
    if (newInclude && newInclude.trim()) {
      setFormData(prev => ({
        ...prev,
        includes: [...prev.includes, newInclude.trim()],
      }));
    }
  };

  const handleRemoveInclude = (index) => {
    setFormData(prev => ({
      ...prev,
      includes: prev.includes.filter((_, i) => i !== index),
    }));
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfoStep();
      case 2:
        return renderPricingStep();
      case 3:
        return renderAvailabilityStep();
      case 4:
        return renderLocationStep();
      case 5:
        return renderMediaStep();
      default:
        return null;
    }
  };

  const renderBasicInfoStep = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ThemedText type="title" style={styles.stepTitle}>
        Service Details
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        Tell us about your service
      </ThemedText>

      <Input
        label="Service Title"
        value={formData.title}
        onChangeText={(value) => handleFieldChange('title', value)}
        onBlur={() => handleFieldBlur('title')}
        error={errors.title}
        touched={touched.title}
        placeholder="e.g., Professional Home Cleaning"
        maxLength={100}
        helperText="Clear, descriptive titles perform better"
      />

      <View style={styles.categorySection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Category
        </ThemedText>
        <View style={styles.categoryGrid}>
          {SERVICE_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                formData.category === category.id && [
                  styles.categoryButtonActive,
                  { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                ],
              ]}
              onPress={() => handleFieldChange('category', category.id)}
            >
              <ThemedText style={[styles.categoryIcon, { fontSize: 24 }]}>
                {category.icon}
              </ThemedText>
              <ThemedText type="caption" style={styles.categoryName}>
                {category.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        {errors.category && touched.category && (
          <ThemedText type="danger" style={styles.errorText}>
            {errors.category}
          </ThemedText>
        )}
      </View>

      <TextArea
        label="Service Description"
        value={formData.description}
        onChangeText={(value) => handleFieldChange('description', value)}
        onBlur={() => handleFieldBlur('description')}
        error={errors.description}
        touched={touched.description}
        placeholder="Describe what your service includes, your expertise, and what customers can expect..."
        numberOfLines={4}
        maxLength={500}
        helperText={`${formData.description.length}/500 characters`}
      />

      <TextArea
        label="Detailed Description (Optional)"
        value={formData.longDescription}
        onChangeText={(value) => handleFieldChange('longDescription', value)}
        placeholder="Provide more detailed information about your service, process, and any special requirements..."
        numberOfLines={6}
        helperText="This will be shown on your service detail page"
      />
    </Animated.View>
  );

  const renderPricingStep = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ThemedText type="title" style={styles.stepTitle}>
        Pricing & Duration
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        Set your pricing and service duration
      </ThemedText>

      <View style={styles.priceRow}>
        <Input
          label="Price ($)"
          value={formData.price}
          onChangeText={(value) => handleFieldChange('price', value.replace(/[^0-9.]/g, ''))}
          onBlur={() => handleFieldBlur('price')}
          error={errors.price}
          touched={touched.price}
          placeholder="0.00"
          keyboardType="decimal-pad"
          style={styles.halfInput}
        />
        <Input
          label="Original Price (Optional)"
          value={formData.originalPrice}
          onChangeText={(value) => handleFieldChange('originalPrice', value.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          keyboardType="decimal-pad"
          style={styles.halfInput}
          helperText="Show a discount"
        />
      </View>

      <View style={styles.durationSection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Estimated Duration
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.durationOptions}
        >
          {DURATION_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.durationButton,
                formData.duration === option.value && [
                  styles.durationButtonActive,
                  { backgroundColor: theme.colors.primary },
                ],
              ]}
              onPress={() => handleFieldChange('duration', option.value)}
            >
              <ThemedText
                style={[
                  styles.durationText,
                  formData.duration === option.value && styles.durationTextActive,
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.pricingTypeSection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Pricing Type
        </ThemedText>
        <View style={styles.pricingTypeOptions}>
          {['fixed', 'hourly', 'custom'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.pricingTypeButton,
                formData.pricingType === type && [
                  styles.pricingTypeButtonActive,
                  { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                ],
              ]}
              onPress={() => handleFieldChange('pricingType', type)}
            >
              <ThemedText type="default" style={styles.pricingTypeText}>
                {type === 'fixed' && 'Fixed Price'}
                {type === 'hourly' && 'Hourly Rate'}
                {type === 'custom' && 'Custom Quote'}
              </ThemedText>
              <ThemedText type="caption" style={styles.pricingTypeDescription}>
                {type === 'fixed' && 'Single price for the service'}
                {type === 'hourly' && 'Price per hour of work'}
                {type === 'custom' && 'Provide quote after discussion'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderAvailabilityStep = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ThemedText type="title" style={styles.stepTitle}>
        Availability
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        When are you available?
      </ThemedText>

      <View style={styles.availabilitySection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Availability Type
        </ThemedText>
        <View style={styles.availabilityOptions}>
          {AVAILABILITY_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.availabilityButton,
                formData.availability === option.id && [
                  styles.availabilityButtonActive,
                  { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                ],
              ]}
              onPress={() => handleFieldChange('availability', option.id)}
            >
              <ThemedText type="default" style={styles.availabilityTitle}>
                {option.label}
              </ThemedText>
              <ThemedText type="caption" style={styles.availabilityDescription}>
                {option.description}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.featuresSection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Service Features
        </ThemedText>
        <View style={styles.featureOptions}>
          <TouchableOpacity
            style={styles.featureToggle}
            onPress={() => handleFieldChange('sameDayService', !formData.sameDayService)}
          >
            <View style={styles.featureInfo}>
              <ThemedText type="default" style={styles.featureTitle}>
                Same Day Service
              </ThemedText>
              <ThemedText type="caption" style={styles.featureDescription}>
                Available for booking today
              </ThemedText>
            </View>
            <View style={[
              styles.toggle,
              formData.sameDayService && [styles.toggleActive, { backgroundColor: theme.colors.primary }],
            ]}>
              <View style={[
                styles.toggleThumb,
                formData.sameDayService && styles.toggleThumbActive,
              ]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureToggle}
            onPress={() => handleFieldChange('emergencyService', !formData.emergencyService)}
          >
            <View style={styles.featureInfo}>
              <ThemedText type="default" style={styles.featureTitle}>
                Emergency Service
              </ThemedText>
              <ThemedText type="caption" style={styles.featureDescription}>
                24/7 emergency availability
              </ThemedText>
            </View>
            <View style={[
              styles.toggle,
              formData.emergencyService && [styles.toggleActive, { backgroundColor: theme.colors.primary }],
            ]}>
              <View style={[
                styles.toggleThumb,
                formData.emergencyService && styles.toggleThumbActive,
              ]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderLocationStep = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ThemedText type="title" style={styles.stepTitle}>
        Service Location
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        Where do you provide this service?
      </ThemedText>

      <Input
        label="Service Address"
        value={formData.location.address}
        onChangeText={(value) => handleNestedFieldChange('location', 'address', value)}
        onBlur={() => handleFieldBlur('location.address')}
        error={errors['location.address']}
        touched={touched['location.address']}
        placeholder="Enter your service address"
        helperText="This address will be shown to customers"
      />

      <View style={styles.locationRow}>
        <Input
          label="City"
          value={formData.location.city}
          onChangeText={(value) => handleNestedFieldChange('location', 'city', value)}
          onBlur={() => handleFieldBlur('location.city')}
          error={errors['location.city']}
          touched={touched['location.city']}
          placeholder="City"
          style={styles.halfInput}
        />
        <Input
          label="ZIP Code"
          value={formData.location.zipCode}
          onChangeText={(value) => handleNestedFieldChange('location', 'zipCode', value)}
          placeholder="ZIP Code"
          keyboardType="number-pad"
          style={styles.halfInput}
        />
      </View>

      <View style={styles.serviceAreaSection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Service Area Radius
        </ThemedText>
        <ThemedText type="caption" style={styles.serviceAreaDescription}>
          How far are you willing to travel for this service?
        </ThemedText>
        <View style={styles.serviceAreaSlider}>
          <ThemedText type="default" style={styles.serviceAreaValue}>
            {formData.location.servesArea} miles
          </ThemedText>
          {/* In a real app, you'd use a Slider component here */}
        </View>
      </View>
    </Animated.View>
  );

  const renderMediaStep = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ThemedText type="title" style={styles.stepTitle}>
        Photos & Details
      </ThemedText>
      <ThemedText type="default" style={styles.stepSubtitle}>
        Add photos and additional details
      </ThemedText>

      {/* Image Upload */}
      <View style={styles.mediaSection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Service Photos
        </ThemedText>
        <ThemedText type="caption" style={styles.mediaDescription}>
          Add up to 10 photos showing your work (required)
        </ThemedText>

        <View style={styles.imageGrid}>
          {formData.images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.uploadedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => handleRemoveImage(index)}
              >
                <ThemedText style={styles.removeImageIcon}>✕</ThemedText>
              </TouchableOpacity>
              {uploadProgress[index] !== undefined && (
                <View style={styles.uploadProgress}>
                  <View 
                    style={[
                      styles.uploadProgressBar,
                      { width: `${uploadProgress[index]}%`, backgroundColor: theme.colors.primary }
                    ]} 
                  />
                </View>
              )}
            </View>
          ))}

          {formData.images.length < 10 && (
            <TouchableOpacity style={styles.addImageButton} onPress={handleAddImages}>
              <ThemedText style={styles.addImageIcon}>+</ThemedText>
              <ThemedText type="caption" style={styles.addImageText}>
                Add Photo
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {formData.images.length === 0 && (
          <ThemedText type="danger" style={styles.errorText}>
            At least one photo is required
          </ThemedText>
        )}
      </View>

      {/* Tags */}
      <View style={styles.tagsSection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Tags
        </ThemedText>
        <ThemedText type="caption" style={styles.tagsDescription}>
          Add relevant tags to help customers find your service
        </ThemedText>

        <View style={styles.tagsContainer}>
          {formData.tags.map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: theme.colors.primary + '20' }]}>
              <ThemedText type="caption" style={styles.tagText}>
                {tag}
              </ThemedText>
              <TouchableOpacity onPress={() => handleRemoveTag(index)}>
                <ThemedText style={styles.removeTag}>✕</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
          {formData.tags.length < 5 && (
            <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
              <ThemedText style={styles.addTagIcon}>+</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* What's Included */}
      <View style={styles.includesSection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          What's Included
        </ThemedText>
        <ThemedText type="caption" style={styles.includesDescription}>
          List what customers get with this service
        </ThemedText>

        {formData.includes.map((item, index) => (
          <View key={index} style={styles.includeItem}>
            <ThemedText style={styles.includeIcon}>✅</ThemedText>
            <ThemedText type="default" style={styles.includeText}>
              {item}
            </ThemedText>
            <TouchableOpacity onPress={() => handleRemoveInclude(index)}>
              <ThemedText style={styles.removeInclude}>✕</ThemedText>
            </TouchableOpacity>
          </View>
        ))}

        <OutlineButton
          title="Add Included Item"
          onPress={handleAddInclude}
          icon="+"
          style={styles.addIncludeButton}
        />
      </View>

      {/* Requirements */}
      <View style={styles.requirementsSection}>
        <ThemedText type="default" style={styles.sectionLabel}>
          Customer Requirements
        </ThemedText>
        <ThemedText type="caption" style={styles.requirementsDescription}>
          What do customers need to provide or prepare?
        </ThemedText>

        {formData.requirements.map((item, index) => (
          <View key={index} style={styles.requirementItem}>
            <ThemedText style={styles.requirementIcon}>📋</ThemedText>
            <ThemedText type="default" style={styles.requirementText}>
              {item}
            </ThemedText>
            <TouchableOpacity onPress={() => handleRemoveRequirement(index)}>
              <ThemedText style={styles.removeRequirement}>✕</ThemedText>
            </TouchableOpacity>
          </View>
        ))}

        <OutlineButton
          title="Add Requirement"
          onPress={handleAddRequirement}
          icon="+"
          style={styles.addRequirementButton}
        />
      </View>
    </Animated.View>
  );

  if (!isAuthenticated) {
    return (
      <Loading 
        type="full_screen" 
        message="Checking authentication..." 
        showLogo 
      />
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Create Service',
          headerShown: true,
          headerLeft: () => (
            <IconButton
              icon="✕"
              onPress={handleCancel}
              accessibilityLabel="Close"
            />
          ),
        }} 
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: progressWidth }
                ]} 
              />
            </View>
            <ThemedText type="subtitle" style={styles.progressText}>
              Step {currentStep} of 5
            </ThemedText>
          </View>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <OutlineButton
              title={currentStep === 1 ? 'Cancel' : 'Back'}
              onPress={handlePreviousStep}
              style={styles.navButton}
            />
            
            <PrimaryButton
              title={currentStep === 5 ? 'Create Service' : 'Continue'}
              onPress={handleNextStep}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.navButton}
            />
          </View>

          {/* Footer Spacing */}
          <View style={styles.footer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
  },
  stepContent: {
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    opacity: 0.7,
    marginBottom: 24,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 8,
  },
  categoryButtonActive: {
    borderWidth: 2,
  },
  categoryIcon: {
    marginBottom: 4,
  },
  categoryName: {
    textAlign: 'center',
    fontWeight: '500',
  },
  durationOptions: {
    paddingRight: 20,
    gap: 8,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  durationButtonActive: {
    backgroundColor: '#3B82F6',
  },
  durationText: {
    fontWeight: '500',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  pricingTypeOptions: {
    gap: 12,
  },
  pricingTypeButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  pricingTypeButtonActive: {
    borderWidth: 2,
  },
  pricingTypeText: {
    fontWeight: '600',
    marginBottom: 4,
  },
  pricingTypeDescription: {
    opacity: 0.7,
  },
  availabilityOptions: {
    gap: 12,
  },
  availabilityButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  availabilityButtonActive: {
    borderWidth: 2,
  },
  availabilityTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  availabilityDescription: {
    opacity: 0.7,
  },
  featureOptions: {
    gap: 16,
  },
  featureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    opacity: 0.7,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#E5E7EB',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#3B82F6',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageContainer: {
    width: (Dimensions.get('window').width - 56) / 3,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  uploadProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  uploadProgressBar: {
    height: '100%',
  },
  addImageButton: {
    width: (Dimensions.get('window').width - 56) / 3,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  addImageText: {
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  tagText: {
    fontWeight: '500',
  },
  removeTag: {
    fontSize: 12,
    opacity: 0.7,
  },
  addTagButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagIcon: {
    fontSize: 16,
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  includeIcon: {
    fontSize: 16,
  },
  includeText: {
    flex: 1,
  },
  removeInclude: {
    fontSize: 16,
    opacity: 0.5,
  },
  addIncludeButton: {
    marginTop: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  requirementIcon: {
    fontSize: 16,
  },
  requirementText: {
    flex: 1,
  },
  removeRequirement: {
    fontSize: 16,
    opacity: 0.5,
  },
  addRequirementButton: {
    marginTop: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  navButton: {
    flex: 1,
  },
  footer: {
    height: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
};