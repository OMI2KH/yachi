// app/(profile)/edit.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useLoading } from '../../../contexts/loading-context';
import { userService } from '../../../services/user-service';
import { uploadService } from '../../../services/upload-service';
import { analyticsService } from '../../../services/analytics-service';
import { errorService } from '../../../services/error-service';
import { storage } from '../../../utils/storage';
import { validators } from '../../../utils/validators';

// Components
import ProfileHeader from '../../../components/profile/edit/profile-header';
import PersonalInfoSection from '../../../components/profile/edit/personal-info-section';
import ProfessionalInfoSection from '../../../components/profile/edit/professional-info-section';
import LocationSection from '../../../components/profile/edit/location-section';
import PreferencesSection from '../../../components/profile/edit/preferences-section';
import SocialLinksSection from '../../../components/profile/edit/social-links-section';
import FormActions from '../../../components/profile/edit/form-actions';
import LoadingScreen from '../../../components/ui/loading';
import ErrorScreen from '../../../components/ui/error-screen';
import RetryButton from '../../../components/ui/retry-button';
import Toast from '../../../components/ui/toast';
import ConfirmationModal from '../../../components/ui/confirmation-modal';

// Constants
import { USER_ROLES, PROFILE_VALIDATION_RULES } from '../../../constants/user';

const { width } = Dimensions.get('window');

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();

  // Form state
  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [activeSection, setActiveSection] = useState('personal');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs
  const scrollViewRef = useRef();
  const sectionRefs = useRef({});
  const mountedRef = useRef(true);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Initialize form data
  useEffect(() => {
    initializeForm();
    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  // Check for unsaved changes
  useEffect(() => {
    if (formData && originalData) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalData]);

  // Handle back navigation with unsaved changes
  useEffect(() => {
    const unsubscribe = router.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges) {
        return;
      }

      e.preventDefault();
      setShowCancelModal(true);
    });

    return unsubscribe;
  }, [router, hasUnsavedChanges]);

  const initializeForm = async () => {
    try {
      setLoading(true);
      
      // Load user data with extended profile
      const userData = await userService.getUserProfile(user.id, {
        include: ['profile', 'preferences', 'social_links', 'professional_info']
      });

      if (!mountedRef.current) return;

      if (userData) {
        const initialFormData = {
          // Personal Info
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          dateOfBirth: userData.profile?.dateOfBirth || '',
          gender: userData.profile?.gender || '',
          bio: userData.profile?.bio || '',
          avatar: userData.profile?.avatar || null,

          // Professional Info (for workers)
          professionalTitle: userData.professionalInfo?.title || '',
          company: userData.professionalInfo?.company || '',
          experience: userData.professionalInfo?.experience || '',
          skills: userData.professionalInfo?.skills || [],
          certifications: userData.professionalInfo?.certifications || [],
          hourlyRate: userData.professionalInfo?.hourlyRate || '',

          // Location
          address: userData.profile?.address || '',
          city: userData.profile?.city || '',
          state: userData.profile?.state || '',
          country: userData.profile?.country || '',
          zipCode: userData.profile?.zipCode || '',
          timezone: userData.profile?.timezone || '',

          // Preferences
          notifications: {
            email: userData.preferences?.notifications?.email ?? true,
            push: userData.preferences?.notifications?.push ?? true,
            sms: userData.preferences?.notifications?.sms ?? false,
          },
          privacy: {
            profileVisible: userData.preferences?.privacy?.profileVisible ?? true,
            showContactInfo: userData.preferences?.privacy?.showContactInfo ?? false,
          },
          language: userData.preferences?.language || 'en',
          currency: userData.preferences?.currency || 'USD',

          // Social Links
          socialLinks: {
            website: userData.socialLinks?.website || '',
            linkedin: userData.socialLinks?.linkedin || '',
            twitter: userData.socialLinks?.twitter || '',
            facebook: userData.socialLinks?.facebook || '',
            instagram: userData.socialLinks?.instagram || '',
          },
        };

        setFormData(initialFormData);
        setOriginalData(JSON.parse(JSON.stringify(initialFormData)));

        // Animate content in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        throw new Error('Failed to load user profile');
      }

    } catch (err) {
      console.error('Error initializing profile form:', err);
      setError(err.message);
      errorService.captureError(err, {
        context: 'ProfileEditInitialization',
        userId: user?.id,
      });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Form field handlers
  const updateField = useCallback((section, field, value) => {
    setFormData(prev => {
      if (section) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [field]: true,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  }, [errors]);

  const updateNestedField = useCallback((path, value) => {
    const pathArray = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < pathArray.length - 1; i++) {
        current[pathArray[i]] = { ...current[pathArray[i]] };
        current = current[pathArray[i]];
      }
      
      current[pathArray[pathArray.length - 1]] = value;
      return newData;
    });

    // Mark field as touched and clear error
    setTouched(prev => ({
      ...prev,
      [path]: true,
    }));

    if (errors[path]) {
      setErrors(prev => ({
        ...prev,
        [path]: null,
      }));
    }
  }, [errors]);

  // Avatar handling
  const handleAvatarChange = async (imageUri) => {
    try {
      showLoading('Uploading profile picture...');

      const uploadResult = await uploadService.uploadImage(imageUri, {
        folder: 'avatars',
        userId: user.id,
        onProgress: (progress) => setUploadProgress(progress),
      });

      if (uploadResult.success) {
        updateField(null, 'avatar', uploadResult.url);
        showToast('Profile picture updated successfully', 'success');
        
        analyticsService.trackEvent('profile_avatar_updated', {
          userId: user.id,
          imageSize: uploadResult.size,
        });
      } else {
        throw new Error(uploadResult.message || 'Failed to upload image');
      }

    } catch (err) {
      console.error('Error uploading avatar:', err);
      showToast('Failed to upload profile picture', 'error');
      
      errorService.captureError(err, {
        context: 'AvatarUpload',
        userId: user.id,
      });
    } finally {
      hideLoading();
      setUploadProgress(0);
    }
  };

  // Skills handling
  const handleSkillAdd = useCallback((skill) => {
    const currentSkills = formData.skills || [];
    if (!currentSkills.includes(skill) && skill.trim()) {
      const newSkills = [...currentSkills, skill.trim()];
      updateField(null, 'skills', newSkills);
    }
  }, [formData, updateField]);

  const handleSkillRemove = useCallback((skillToRemove) => {
    const newSkills = formData.skills.filter(skill => skill !== skillToRemove);
    updateField(null, 'skills', newSkills);
  }, [formData, updateField]);

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Personal info validation
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (!validators.name(formData.firstName)) {
      newErrors.firstName = 'Please enter a valid first name';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (!validators.name(formData.lastName)) {
      newErrors.lastName = 'Please enter a valid last name';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validators.email(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validators.phone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.dateOfBirth && !validators.dateOfBirth(formData.dateOfBirth)) {
      newErrors.dateOfBirth = 'You must be at least 18 years old';
    }

    // Professional info validation (for workers)
    if (user.role === USER_ROLES.WORKER) {
      if (!formData.professionalTitle?.trim()) {
        newErrors.professionalTitle = 'Professional title is required';
      }

      if (!formData.hourlyRate || formData.hourlyRate < 0) {
        newErrors.hourlyRate = 'Please enter a valid hourly rate';
      }
    }

    // Location validation
    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.country?.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, user.role]);

  // Form submission
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate form
    if (!validateForm()) {
      showToast('Please fix the errors before saving', 'error');
      
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      scrollToField(firstErrorField);
      return;
    }

    try {
      setIsSubmitting(true);
      showLoading('Saving profile...');

      // Prepare data for API
      const updateData = {
        // Personal info
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || null,
        
        // Profile
        profile: {
          dateOfBirth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          bio: formData.bio?.trim() || null,
          avatar: formData.avatar,
          address: formData.address?.trim() || null,
          city: formData.city.trim(),
          state: formData.state?.trim() || null,
          country: formData.country.trim(),
          zipCode: formData.zipCode?.trim() || null,
          timezone: formData.timezone || 'UTC',
        },

        // Professional info (for workers)
        ...(user.role === USER_ROLES.WORKER && {
          professionalInfo: {
            title: formData.professionalTitle.trim(),
            company: formData.company?.trim() || null,
            experience: formData.experience || null,
            skills: formData.skills,
            certifications: formData.certifications,
            hourlyRate: parseFloat(formData.hourlyRate),
          },
        }),

        // Preferences
        preferences: {
          notifications: formData.notifications,
          privacy: formData.privacy,
          language: formData.language,
          currency: formData.currency,
        },

        // Social links
        socialLinks: Object.fromEntries(
          Object.entries(formData.socialLinks).filter(([_, value]) => value.trim())
        ),
      };

      // Update profile
      const result = await userService.updateUserProfile(user.id, updateData);

      if (result.success) {
        // Update local auth context
        await updateUser(result.user);

        // Update original data
        setOriginalData(JSON.parse(JSON.stringify(formData)));
        setHasUnsavedChanges(false);

        // Show success
        showToast('Profile updated successfully', 'success');

        // Track event
        analyticsService.trackEvent('profile_updated', {
          userId: user.id,
          fieldsUpdated: Object.keys(updateData),
          userRole: user.role,
        });

        // Navigate back after short delay
        setTimeout(() => {
          router.back();
        }, 1500);

      } else {
        throw new Error(result.message || 'Failed to update profile');
      }

    } catch (err) {
      console.error('Error updating profile:', err);
      showToast(err.message || 'Failed to update profile', 'error');
      
      errorService.captureError(err, {
        context: 'ProfileUpdate',
        userId: user.id,
        updateData: Object.keys(formData).filter(key => formData[key] !== originalData[key]),
      });
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  // Cancel editing
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelModal(true);
    } else {
      router.back();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    router.back();
  };

  // Scroll to field
  const scrollToField = (fieldName) => {
    const section = getSectionForField(fieldName);
    if (section && sectionRefs.current[section]) {
      sectionRefs.current[section].measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - 100, animated: true });
        }
      );
    }
  };

  const getSectionForField = (fieldName) => {
    const fieldSections = {
      // Personal info fields
      firstName: 'personal',
      lastName: 'personal',
      email: 'personal',
      phone: 'personal',
      dateOfBirth: 'personal',
      gender: 'personal',
      bio: 'personal',
      
      // Professional fields
      professionalTitle: 'professional',
      company: 'professional',
      experience: 'professional',
      skills: 'professional',
      hourlyRate: 'professional',
      
      // Location fields
      address: 'location',
      city: 'location',
      state: 'location',
      country: 'location',
      zipCode: 'location',
    };

    return fieldSections[fieldName];
  };

  // Section navigation
  const scrollToSection = (section) => {
    if (sectionRefs.current[section]) {
      sectionRefs.current[section].measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - 80, animated: true });
        }
      );
    }
    setActiveSection(section);
  };

  // Show toast
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  if (loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (error && !formData) {
    return (
      <ErrorScreen
        message={error}
        onRetry={initializeForm}
        retryButton={<RetryButton onPress={initializeForm} />}
      />
    );
  }

  if (!formData) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 16,
          },
        }}
      />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Profile Header with Avatar */}
            <ProfileHeader
              ref={ref => sectionRefs.current.header = ref}
              avatar={formData.avatar}
              firstName={formData.firstName}
              lastName={formData.lastName}
              professionalTitle={formData.professionalTitle}
              onAvatarChange={handleAvatarChange}
              uploadProgress={uploadProgress}
              theme={theme}
            />

            {/* Personal Information */}
            <PersonalInfoSection
              ref={ref => sectionRefs.current.personal = ref}
              formData={formData}
              errors={errors}
              touched={touched}
              onUpdateField={updateField}
              onUpdateNestedField={updateNestedField}
              theme={theme}
            />

            {/* Professional Information (for workers) */}
            {user.role === USER_ROLES.WORKER && (
              <ProfessionalInfoSection
                ref={ref => sectionRefs.current.professional = ref}
                formData={formData}
                errors={errors}
                touched={touched}
                onUpdateField={updateField}
                onSkillAdd={handleSkillAdd}
                onSkillRemove={handleSkillRemove}
                theme={theme}
              />
            )}

            {/* Location Information */}
            <LocationSection
              ref={ref => sectionRefs.current.location = ref}
              formData={formData}
              errors={errors}
              touched={touched}
              onUpdateField={updateField}
              theme={theme}
            />

            {/* Preferences */}
            <PreferencesSection
              ref={ref => sectionRefs.current.preferences = ref}
              formData={formData}
              onUpdateNestedField={updateNestedField}
              theme={theme}
            />

            {/* Social Links */}
            <SocialLinksSection
              ref={ref => sectionRefs.current.social = ref}
              formData={formData}
              onUpdateNestedField={updateNestedField}
              theme={theme}
            />
          </Animated.View>
        </ScrollView>

        {/* Form Actions */}
        <FormActions
          hasChanges={hasUnsavedChanges}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          theme={theme}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          visible={showCancelModal}
          title="Discard Changes?"
          message="You have unsaved changes. Are you sure you want to leave? All changes will be lost."
          confirmText="Discard"
          cancelText="Keep Editing"
          onConfirm={handleConfirmCancel}
          onCancel={() => setShowCancelModal(false)}
          type="warning"
          theme={theme}
        />

        {/* Toast Notification */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(prev => ({ ...prev, visible: false }))}
          theme={theme}
        />

        <StatusBar style={isDark ? 'light' : 'dark'} />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100, // Space for fixed actions
  },
  animatedContainer: {
    flex: 1,
  },
});