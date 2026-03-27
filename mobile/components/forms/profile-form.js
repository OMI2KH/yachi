// components/forms/profile-form.js
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
import Avatar from '../ui/avatar';

// Services
import { userService } from '../../services/user-service';
import { uploadService } from '../../services/upload-service';
import { notificationService } from '../../services/notification-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Utils
import { validators } from '../../utils/validators';
import { storage } from '../../utils/storage';

// Constants
import { COLORS } from '../../constants/colors';
import { USER_ROLES, USER_SKILLS, ETHIOPIAN_LANGUAGES } from '../../constants/user';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Profile Form Component
 * Ethiopian market focused with local skills and languages
 * Multi-role support (Client, Service Provider, Government, Admin)
 */

const ProfileForm = ({
  user,
  onSuccess,
  onCancel,
  mode = 'edit', // 'edit' or 'create'
  testID = 'profile-form',
}) => {
  const router = useRouter();
  const { theme, updateUser } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showLanguagesModal, setShowLanguagesModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    bio: user?.bio || '',
    avatar: user?.avatar || null,
    role: user?.role || USER_ROLES.CLIENT,
    skills: user?.skills || [],
    languages: user?.languages || [ETHIOPIAN_LANGUAGES.ENGLISH],
    experience: user?.experience || '',
    hourlyRate: user?.hourlyRate?.toString() || '',
    company: user?.company || '',
    website: user?.website || '',
    ...user,
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef(null);

  // Experience levels for service providers
  const experienceLevels = [
    { value: 'beginner', label: 'Beginner (0-2 years)' },
    { value: 'intermediate', label: 'Intermediate (2-5 years)' },
    { value: 'advanced', label: 'Advanced (5-10 years)' },
    { value: 'expert', label: 'Expert (10+ years)' },
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
          message: 'Please allow photo access to upload profile pictures',
        });
      }
    }
  };

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    // Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validators.email(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation (Ethiopian format)
    if (formData.phone && !validators.ethiopianPhone(formData.phone)) {
      errors.phone = 'Please enter a valid Ethiopian phone number';
    }

    // Location validation
    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }

    // Bio validation
    if (!formData.bio.trim()) {
      errors.bio = 'Bio is required';
    } else if (formData.bio.length < 20) {
      errors.bio = 'Bio should be at least 20 characters';
    }

    // Service provider specific validations
    if (formData.role === USER_ROLES.PROVIDER) {
      if (!formData.experience) {
        errors.experience = 'Experience level is required';
      }
      if (!formData.hourlyRate) {
        errors.hourlyRate = 'Hourly rate is required';
      } else if (isNaN(formData.hourlyRate) || parseFloat(formData.hourlyRate) <= 0) {
        errors.hourlyRate = 'Please enter a valid hourly rate';
      }
      if (formData.skills.length === 0) {
        errors.skills = 'At least one skill is required';
      }
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
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        
        // Upload to cloud storage
        const uploadResult = await uploadService.uploadImage(
          result.assets[0].uri, 
          `profiles/${user?.id || 'new'}`
        );

        if (uploadResult.success) {
          setFormData(prev => ({ ...prev, avatar: uploadResult.url }));
          notificationService.show({
            type: 'success',
            title: 'Profile Picture Updated',
            message: 'Your profile picture has been updated successfully',
          });
        } else {
          throw new Error(uploadResult.message || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Image upload error:', error);
      notificationService.show({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload profile picture. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle skill selection
  const toggleSkill = useCallback((skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
    setTouched(prev => ({ ...prev, skills: true }));
  }, []);

  // Handle language selection
  const toggleLanguage = useCallback((language) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(lang => lang !== language)
        : [...prev.languages, language]
    }));
    setTouched(prev => ({ ...prev, languages: true }));
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
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim(),
        location: formData.location.trim(),
        bio: formData.bio.trim(),
        company: formData.company?.trim(),
        website: formData.website?.trim(),
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      };

      let result;

      if (mode === 'create') {
        result = await userService.createProfile(submissionData);
      } else {
        result = await userService.updateProfile(user.id, submissionData);
      }

      if (result.success) {
        // Update auth context
        if (mode === 'edit') {
          updateUser(result.user);
        }

        // Track analytics
        analyticsService.track('profile_updated', {
          mode,
          role: formData.role,
          hasAvatar: !!formData.avatar,
          skillCount: formData.skills.length,
          languageCount: formData.languages.length,
        });

        // Show success notification
        notificationService.show({
          type: 'success',
          title: 'Profile Updated! 🎉',
          message: mode === 'create' 
            ? 'Your profile has been created successfully' 
            : 'Your profile has been updated successfully',
        });

        // Call success callback
        onSuccess?.(result.user);

      } else {
        throw new Error(result.message || 'Profile update failed');
      }

    } catch (error) {
      console.error('Profile update error:', error);
      
      errorService.handleError(error, {
        context: 'ProfileForm',
        mode,
        userId: user?.id,
      });

      notificationService.show({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Unable to update profile. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Render avatar section
  const renderAvatarSection = () => (
    <Card style={styles.avatarCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Profile Picture
      </ThemedText>
      <View style={styles.avatarContainer}>
        <TouchableOpacity 
          style={styles.avatarButton}
          onPress={handleImagePick}
          disabled={uploading}
        >
          <Avatar
            source={formData.avatar}
            name={`${formData.firstName} ${formData.lastName}`}
            size={120}
            style={styles.avatar}
          />
          {uploading && (
            <View style={styles.uploadOverlay}>
              <Loading size="small" />
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <ThemedText type="caption" color="white">
              📷
            </ThemedText>
          </View>
        </TouchableOpacity>
        <ThemedText type="caption" color="secondary" style={styles.avatarHint}>
          Tap to {formData.avatar ? 'change' : 'add'} profile picture
        </ThemedText>
      </View>
    </Card>
  );

  // Render basic information section
  const renderBasicInfo = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Basic Information
      </ThemedText>
      
      <View style={styles.nameRow}>
        <Input
          label="First Name"
          value={formData.firstName}
          onChangeText={(value) => handleChange('firstName', value)}
          error={formErrors.firstName}
          touched={touched.firstName}
          placeholder="Enter your first name"
          style={styles.halfInput}
        />
        <Input
          label="Last Name"
          value={formData.lastName}
          onChangeText={(value) => handleChange('lastName', value)}
          error={formErrors.lastName}
          touched={touched.lastName}
          placeholder="Enter your last name"
          style={styles.halfInput}
        />
      </View>

      <Input
        label="Email Address"
        value={formData.email}
        onChangeText={(value) => handleChange('email', value)}
        error={formErrors.email}
        touched={touched.email}
        placeholder="your.email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Bio"
        value={formData.bio}
        onChangeText={(value) => handleChange('bio', value)}
        error={formErrors.bio}
        touched={touched.bio}
        placeholder="Tell us about yourself..."
        multiline
        numberOfLines={4}
        style={styles.bioInput}
      />
    </Card>
  );

  // Render contact information section
  const renderContactInfo = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Contact Information
      </ThemedText>

      <Input
        label="Phone Number"
        value={formData.phone}
        onChangeText={(value) => handleChange('phone', value)}
        error={formErrors.phone}
        touched={touched.phone}
        placeholder="+251 XXX XXX XXX"
        keyboardType="phone-pad"
      />

      <Input
        label="Location"
        value={formData.location}
        onChangeText={(value) => handleChange('location', value)}
        error={formErrors.location}
        touched={touched.location}
        placeholder="City, Country"
      />

      <Input
        label="Company (Optional)"
        value={formData.company}
        onChangeText={(value) => handleChange('company', value)}
        placeholder="Your company name"
      />

      <Input
        label="Website (Optional)"
        value={formData.website}
        onChangeText={(value) => handleChange('website', value)}
        placeholder="https://yourwebsite.com"
        autoCapitalize="none"
      />
    </Card>
  );

  // Render professional information for service providers
  const renderProfessionalInfo = () => {
    if (formData.role !== USER_ROLES.PROVIDER) return null;

    return (
      <Card style={styles.sectionCard}>
        <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
          Professional Information
        </ThemedText>

        <View style={styles.professionalRow}>
          <View style={styles.halfInput}>
            <ThemedText type="caption" weight="medium" style={styles.inputLabel}>
              Experience Level
            </ThemedText>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                // Show experience picker
                // Implementation depends on your picker component
              }}
            >
              <ThemedText type="body">
                {experienceLevels.find(exp => exp.value === formData.experience)?.label || 'Select experience'}
              </ThemedText>
            </TouchableOpacity>
            {formErrors.experience && touched.experience && (
              <ThemedText type="caption" color="error" style={styles.errorText}>
                {formErrors.experience}
              </ThemedText>
            )}
          </View>

          <Input
            label="Hourly Rate (ETB)"
            value={formData.hourlyRate}
            onChangeText={(value) => handleChange('hourlyRate', value)}
            error={formErrors.hourlyRate}
            touched={touched.hourlyRate}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.halfInput}
          />
        </View>

        {/* Skills Selection */}
        <View style={styles.skillsSection}>
          <ThemedText type="caption" weight="medium" style={styles.inputLabel}>
            Skills & Services
          </ThemedText>
          <Button
            variant="outline"
            onPress={() => setShowSkillsModal(true)}
            style={styles.selectButton}
          >
            {formData.skills.length > 0 
              ? `${formData.skills.length} skills selected` 
              : 'Select your skills'
            }
          </Button>
          
          {/* Selected Skills Preview */}
          {formData.skills.length > 0 && (
            <View style={styles.selectedItems}>
              {formData.skills.slice(0, 4).map(skill => (
                <Badge key={skill} variant="filled" color="primary" size="small">
                  {USER_SKILLS[skill]?.name || skill}
                </Badge>
              ))}
              {formData.skills.length > 4 && (
                <Badge variant="outline" color="secondary" size="small">
                  +{formData.skills.length - 4} more
                </Badge>
              )}
            </View>
          )}
          {formErrors.skills && touched.skills && (
            <ThemedText type="caption" color="error" style={styles.errorText}>
              {formErrors.skills}
            </ThemedText>
          )}
        </View>
      </Card>
    );
  };

  // Render languages section
  const renderLanguages = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Languages
      </ThemedText>
      
      <Button
        variant="outline"
        onPress={() => setShowLanguagesModal(true)}
        style={styles.selectButton}
      >
        {formData.languages.length > 0 
          ? `${formData.languages.length} languages selected` 
          : 'Select languages you speak'
        }
      </Button>
      
      {/* Selected Languages Preview */}
      {formData.languages.length > 0 && (
        <View style={styles.selectedItems}>
          {formData.languages.map(language => (
            <Badge key={language} variant="outline" color="info" size="small">
              {ETHIOPIAN_LANGUAGES[language] || language}
            </Badge>
          ))}
        </View>
      )}
    </Card>
  );

  // Render skills modal
  const renderSkillsModal = () => (
    <Modal
      visible={showSkillsModal}
      onDismiss={() => setShowSkillsModal(false)}
      title="Select Your Skills"
      size="large"
    >
      <View style={styles.modalContent}>
        <ScrollView style={styles.modalScroll}>
          {Object.entries(USER_SKILLS).map(([category, skills]) => (
            <View key={category} style={styles.skillCategory}>
              <ThemedText type="body" weight="semiBold" style={styles.categoryTitle}>
                {category}
              </ThemedText>
              <View style={styles.skillsGrid}>
                {skills.map(skill => (
                  <TouchableOpacity
                    key={skill.id}
                    style={[
                      styles.skillItem,
                      formData.skills.includes(skill.id) && [
                        styles.selectedSkillItem,
                        { backgroundColor: theme.colors.primary + '20' }
                      ],
                    ]}
                    onPress={() => toggleSkill(skill.id)}
                  >
                    <ThemedText type="body">
                      {skill.icon} {skill.name}
                    </ThemedText>
                    {formData.skills.includes(skill.id) && (
                      <Badge variant="filled" color="primary" size="small">
                        ✓
                      </Badge>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <Button
          variant="primary"
          onPress={() => setShowSkillsModal(false)}
          style={styles.modalButton}
        >
          Done
        </Button>
      </View>
    </Modal>
  );

  // Render languages modal
  const renderLanguagesModal = () => (
    <Modal
      visible={showLanguagesModal}
      onDismiss={() => setShowLanguagesModal(false)}
      title="Select Languages"
      size="medium"
    >
      <View style={styles.modalContent}>
        <ScrollView style={styles.modalScroll}>
          <View style={styles.languagesGrid}>
            {Object.entries(ETHIOPIAN_LANGUAGES).map(([key, language]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.languageItem,
                  formData.languages.includes(key) && [
                    styles.selectedLanguageItem,
                    { backgroundColor: theme.colors.primary + '20' }
                  ],
                ]}
                onPress={() => toggleLanguage(key)}
              >
                <ThemedText type="body">
                  {language}
                </ThemedText>
                {formData.languages.includes(key) && (
                  <Badge variant="filled" color="primary" size="small">
                    ✓
                  </Badge>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <Button
          variant="primary"
          onPress={() => setShowLanguagesModal(false)}
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
        <Loading message={mode === 'create' ? 'Creating your profile...' : 'Updating your profile...'} />
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
        {renderAvatarSection()}
        {renderBasicInfo()}
        {renderContactInfo()}
        {renderProfessionalInfo()}
        {renderLanguages()}

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
            {mode === 'create' ? 'Create Profile' : 'Update Profile'}
          </Button>
        </View>
      </ScrollView>

      {/* Modals */}
      {renderSkillsModal()}
      {renderLanguagesModal()}
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
  avatarCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 12,
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarHint: {
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  bioInput: {
    minHeight: 100,
  },
  professionalRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
  },
  selectButton: {
    width: '100%',
    justifyContent: 'space-between',
  },
  skillsSection: {
    gap: 8,
  },
  selectedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  modalContent: {
    flex: 1,
    gap: 16,
  },
  modalScroll: {
    flex: 1,
  },
  skillCategory: {
    marginBottom: 24,
  },
  categoryTitle: {
    marginBottom: 12,
  },
  skillsGrid: {
    gap: 8,
  },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedSkillItem: {
    borderColor: COLORS.primary,
  },
  languagesGrid: {
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedLanguageItem: {
    borderColor: COLORS.primary,
  },
  modalButton: {
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  errorText: {
    marginTop: 4,
  },
});

export default ProfileForm;