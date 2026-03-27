import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { Avatar } from '../../components/ui/avatar';
import { TabView } from '../../components/ui/tabview';
import { Checkbox } from '../../components/ui/checkbox';
import { DatePicker } from '../../components/ui/date-picker';
import { LocationPicker } from '../../components/ui/location-picker';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useUpload } from '../../hooks/use-upload';
import { useLocation } from '../../hooks/use-location';
import { userService } from '../../services/user-service';
import { analyticsService } from '../../services/analytics-service';
import { notificationService } from '../../services/notification-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { userConstants } from '../../constants/user';

/**
 * Edit Profile Screen
 * 
 * Comprehensive profile editing interface with multi-section forms,
 * real-time validation, and profile completion tracking
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const EditProfileScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { uploadImage, deleteImage } = useUpload();
  const { getCurrentLocation } = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [profileData, setProfileData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Profile sections configuration
  const profileSections = {
    personal: {
      title: 'Personal Information',
      icon: 'user',
      description: 'Update your basic personal details',
    },
    professional: {
      title: 'Professional Details',
      icon: 'briefcase',
      description: 'Your professional background and skills',
    },
    location: {
      title: 'Location & Service Area',
      icon: 'map-pin',
      description: 'Define your service locations and coverage',
    },
    preferences: {
      title: 'Preferences & Settings',
      icon: 'settings',
      description: 'Customize your app experience',
    },
    verification: {
      title: 'Verification & Security',
      icon: 'shield',
      description: 'Manage account security and verification',
    },
  };

  /**
   * Fetch user profile data
   */
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      const userProfile = await userService.getUserProfile(user.id);
      
      if (userProfile) {
        setProfileData(userProfile);
        setOriginalData(userProfile);
        calculateCompletionPercentage(userProfile);
      } else {
        throw new Error('Unable to load profile data');
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      Alert.alert('Error', 'Unable to load profile information.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  /**
   * Calculate profile completion percentage
   */
  const calculateCompletionPercentage = (profile) => {
    const completionFields = [
      'firstName', 'lastName', 'email', 'phone', 'profilePicture',
      'bio', 'skills', 'serviceCategories', 'location', 'serviceRadius',
    ];

    const completedFields = completionFields.filter(field => {
      const value = profile[field];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return value !== null && Object.keys(value).length > 0;
      return value !== null && value !== undefined && value !== '';
    });

    const percentage = (completedFields.length / completionFields.length) * 100;
    setCompletionPercentage(Math.round(percentage));
  };

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  /**
   * Check for changes
   */
  useEffect(() => {
    const changesDetected = JSON.stringify(profileData) !== JSON.stringify(originalData);
    setHasChanges(changesDetected);
  }, [profileData, originalData]);

  /**
   * Handle field updates
   */
  const handleFieldChange = (section, field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  /**
   * Handle nested field updates
   */
  const handleNestedFieldChange = (parent, field, value) => {
    setProfileData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  /**
   * Handle array field updates
   */
  const handleArrayFieldUpdate = (field, value, operation = 'add') => {
    setProfileData(prev => {
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
          newArray = currentArray.map(item => item.id === value.id ? value : item);
          break;
        default:
          newArray = currentArray;
      }

      return {
        ...prev,
        [field]: newArray,
      };
    });
  };

  /**
   * Upload profile avatar
   */
  const handleAvatarUpload = async (imageUri) => {
    try {
      setUploadingAvatar(true);
      
      const uploadResult = await uploadImage(imageUri, 'profile-avatars', user.id);
      
      if (uploadResult.success) {
        handleFieldChange('personal', 'profilePicture', uploadResult.url);
        Alert.alert('Success', 'Profile picture updated successfully.');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      Alert.alert('Upload Failed', 'Unable to update profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  /**
   * Use current location
   */
  const handleUseCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      
      if (location) {
        handleNestedFieldChange('location', 'coordinates', {
          latitude: location.latitude,
          longitude: location.longitude,
        });
        
        handleNestedFieldChange('location', 'address', 'Current Location');
        
        Alert.alert('Success', 'Current location set successfully.');
      }
    } catch (error) {
      Alert.alert('Location Error', 'Unable to get current location.');
    }
  };

  /**
   * Validate profile data
   */
  const validateProfile = () => {
    const newErrors = {};

    // Personal information validation
    if (!validators.required(profileData.firstName)) {
      newErrors.firstName = 'First name is required';
    }

    if (!validators.required(profileData.lastName)) {
      newErrors.lastName = 'Last name is required';
    }

    if (!validators.email(profileData.email)) {
      newErrors.email = 'Valid email is required';
    }

    if (profileData.phone && !validators.phone(profileData.phone)) {
      newErrors.phone = 'Valid phone number is required';
    }

    // Professional information validation
    if (user.role === 'service_provider' && !profileData.skills?.length) {
      newErrors.skills = 'At least one skill is required';
    }

    if (user.role === 'service_provider' && !profileData.serviceCategories?.length) {
      newErrors.serviceCategories = 'At least one service category is required';
    }

    // Location validation
    if (!profileData.location?.coordinates && !profileData.location?.address) {
      newErrors.location = 'Location information is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Save profile changes
   */
  const handleSave = async () => {
    if (!validateProfile()) {
      Alert.alert('Validation Error', 'Please check the form for errors.');
      return;
    }

    try {
      setSaving(true);

      const updateResult = await userService.updateUserProfile(user.id, profileData);
      
      if (updateResult.success) {
        // Update global user state
        updateUser({
          ...user,
          ...profileData,
        });

        setOriginalData(profileData);
        setHasChanges(false);
        
        // Track profile update
        analyticsService.trackProfileUpdate(user.role, user.id, completionPercentage);
        
        // Send notification
        await notificationService.sendProfileUpdateNotification(user.id);
        
        Alert.alert('Success', 'Profile updated successfully.');
        
        // Navigate back if coming from profile screen
        if (route.params?.fromProfile) {
          navigation.goBack();
        }
      } else {
        throw new Error(updateResult.message);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      Alert.alert('Update Failed', error.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle exit confirmation
   */
  const handleExit = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      navigation.goBack();
    }
  };

  /**
   * Discard changes and exit
   */
  const handleDiscardChanges = () => {
    setProfileData(originalData);
    setShowExitConfirm(false);
    navigation.goBack();
  };

  /**
   * Render personal information tab
   */
  const renderPersonalTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Basic Information
        </ThemedText>
        
        <View style={styles.avatarSection}>
          <Avatar
            source={profileData.profilePicture ? { uri: profileData.profilePicture } : null}
            size="xlarge"
            onEdit={handleAvatarUpload}
            editable={true}
            loading={uploadingAvatar}
          />
          <ThemedText type="default" style={styles.avatarHint}>
            Tap to change profile picture
          </ThemedText>
        </View>

        <View style={styles.formGrid}>
          <Input
            label="First Name *"
            value={profileData.firstName}
            onChangeText={(value) => handleFieldChange('personal', 'firstName', value)}
            placeholder="Enter your first name"
            error={errors.firstName}
            autoCapitalize="words"
          />
          
          <Input
            label="Last Name *"
            value={profileData.lastName}
            onChangeText={(value) => handleFieldChange('personal', 'lastName', value)}
            placeholder="Enter your last name"
            error={errors.lastName}
            autoCapitalize="words"
          />
          
          <Input
            label="Email Address *"
            value={profileData.email}
            onChangeText={(value) => handleFieldChange('personal', 'email', value)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          
          <Input
            label="Phone Number"
            value={profileData.phone}
            onChangeText={(value) => handleFieldChange('personal', 'phone', value)}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            error={errors.phone}
          />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Additional Information
        </ThemedText>
        
        <Input
          label="Bio"
          value={profileData.bio}
          onChangeText={(value) => handleFieldChange('personal', 'bio', value)}
          placeholder="Tell us about yourself..."
          multiline={true}
          numberOfLines={4}
          style={styles.textArea}
        />
        
        <DatePicker
          label="Date of Birth"
          date={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null}
          onDateChange={(date) => handleFieldChange('personal', 'dateOfBirth', date.toISOString())}
          maximumDate={new Date()}
          placeholder="Select your date of birth"
        />
        
        <Input
          label="Gender"
          value={profileData.gender}
          onChangeText={(value) => handleFieldChange('personal', 'gender', value)}
          placeholder="Enter your gender"
        />
      </Card>
    </View>
  );

  /**
   * Render professional details tab
   */
  const renderProfessionalTab = () => (
    <View style={styles.tabContent}>
      {user.role === 'service_provider' && (
        <>
          <Card style={styles.sectionCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Professional Skills
            </ThemedText>
            <ThemedText type="default" style={styles.sectionDescription}>
              Add the skills that best describe your expertise
            </ThemedText>
            
            {/* Skills input component would be implemented here */}
            <ThemedText>Skills selection component</ThemedText>
          </Card>

          <Card style={styles.sectionCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Service Categories
            </ThemedText>
            <ThemedText type="default" style={styles.sectionDescription}>
              Select the categories of services you provide
            </ThemedText>
            
            {/* Service categories component would be implemented here */}
            <ThemedText>Service categories component</ThemedText>
          </Card>
        </>
      )}

      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Professional Background
        </ThemedText>
        
        <Input
          label="Professional Title"
          value={profileData.professionalTitle}
          onChangeText={(value) => handleFieldChange('professional', 'professionalTitle', value)}
          placeholder="e.g., Senior Plumber, Electrician, etc."
        />
        
        <Input
          label="Years of Experience"
          value={profileData.yearsOfExperience?.toString()}
          onChangeText={(value) => handleFieldChange('professional', 'yearsOfExperience', parseInt(value) || 0)}
          placeholder="Enter years of experience"
          keyboardType="numeric"
        />
        
        <Input
          label="Hourly Rate (ETB)"
          value={profileData.hourlyRate?.toString()}
          onChangeText={(value) => handleFieldChange('professional', 'hourlyRate', parseFloat(value) || 0)}
          placeholder="Enter your hourly rate"
          keyboardType="decimal-pad"
        />
      </Card>

      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Availability
        </ThemedText>
        
        <View style={styles.availabilityGrid}>
          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
            <Checkbox
              key={day}
              label={formatters.capitalizeFirst(day)}
              checked={profileData.availability?.[day] || false}
              onPress={() => handleNestedFieldChange('availability', day, !profileData.availability?.[day])}
              style={styles.availabilityCheckbox}
            />
          ))}
        </View>
      </Card>
    </View>
  );

  /**
   * Render location tab
   */
  const renderLocationTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Primary Location
        </ThemedText>
        <ThemedText type="default" style={styles.sectionDescription}>
          Set your primary location for service delivery
        </ThemedText>
        
        <LocationPicker
          onLocationSelect={(location) => handleFieldChange('location', 'location', location)}
          onUseCurrentLocation={handleUseCurrentLocation}
          selectedLocation={profileData.location?.coordinates}
          address={profileData.location?.address}
          region={profileData.location?.region}
          onRegionChange={(region) => handleNestedFieldChange('location', 'region', region)}
          error={errors.location}
        />
      </Card>

      {user.role === 'service_provider' && (
        <Card style={styles.sectionCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Service Area
          </ThemedText>
          <ThemedText type="default" style={styles.sectionDescription}>
            Define the area where you provide services
          </ThemedText>
          
          <Input
            label="Service Radius (km)"
            value={profileData.serviceRadius?.toString()}
            onChangeText={(value) => handleFieldChange('location', 'serviceRadius', parseFloat(value) || 0)}
            placeholder="Enter service radius in kilometers"
            keyboardType="numeric"
          />
          
          <ThemedText type="default" style={styles.radiusHint}>
            Services will be shown to clients within this radius from your location
          </ThemedText>
        </Card>
      )}

      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Additional Locations
        </ThemedText>
        <ThemedText type="default" style={styles.sectionDescription}>
          Add other locations where you provide services
        </ThemedText>
        
        {/* Additional locations component would be implemented here */}
        <ThemedText>Additional locations component</ThemedText>
      </Card>
    </View>
  );

  /**
   * Render preferences tab
   */
  const renderPreferencesTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Notification Preferences
        </ThemedText>
        
        <View style={styles.preferencesList}>
          <Checkbox
            label="Booking Requests"
            checked={profileData.notificationPreferences?.bookingRequests !== false}
            onPress={() => handleNestedFieldChange('notificationPreferences', 'bookingRequests', 
              !profileData.notificationPreferences?.bookingRequests)}
          />
          
          <Checkbox
            label="Messages"
            checked={profileData.notificationPreferences?.messages !== false}
            onPress={() => handleNestedFieldChange('notificationPreferences', 'messages', 
              !profileData.notificationPreferences?.messages)}
          />
          
          <Checkbox
            label="Promotions & Offers"
            checked={profileData.notificationPreferences?.promotions !== false}
            onPress={() => handleNestedFieldChange('notificationPreferences', 'promotions', 
              !profileData.notificationPreferences?.promotions)}
          />
          
          <Checkbox
            label="System Updates"
            checked={profileData.notificationPreferences?.systemUpdates !== false}
            onPress={() => handleNestedFieldChange('notificationPreferences', 'systemUpdates', 
              !profileData.notificationPreferences?.systemUpdates)}
          />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Language & Region
        </ThemedText>
        
        <Input
          label="Preferred Language"
          value={profileData.preferredLanguage}
          onChangeText={(value) => handleFieldChange('preferences', 'preferredLanguage', value)}
          placeholder="Select your preferred language"
        />
        
        <Input
          label="Time Zone"
          value={profileData.timezone}
          onChangeText={(value) => handleFieldChange('preferences', 'timezone', value)}
          placeholder="Select your time zone"
        />
      </Card>

      <Card style={styles.sectionCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Privacy Settings
        </ThemedText>
        
        <View style={styles.preferencesList}>
          <Checkbox
            label="Show profile to other users"
            checked={profileData.privacySettings?.profileVisible !== false}
            onPress={() => handleNestedFieldChange('privacySettings', 'profileVisible', 
              !profileData.privacySettings?.profileVisible)}
          />
          
          <Checkbox
            label="Show online status"
            checked={profileData.privacySettings?.onlineStatus !== false}
            onPress={() => handleNestedFieldChange('privacySettings', 'onlineStatus', 
              !profileData.privacySettings?.onlineStatus)}
          />
          
          <Checkbox
            label="Allow messaging from anyone"
            checked={profileData.privacySettings?.allowMessages !== false}
            onPress={() => handleNestedFieldChange('privacySettings', 'allowMessages', 
              !profileData.privacySettings?.allowMessages)}
          />
        </View>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading profile..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Button
              title="Cancel"
              onPress={handleExit}
              variant="text"
              size="small"
              icon="arrow-left"
            />
            
            <View style={styles.headerCenter}>
              <ThemedText type="title" style={styles.title}>
                Edit Profile
              </ThemedText>
              <ThemedText type="default" style={styles.subtitle}>
                {completionPercentage}% complete
              </ThemedText>
            </View>
            
            <Button
              title="Save"
              onPress={handleSave}
              variant="primary"
              size="small"
              loading={saving}
              disabled={!hasChanges || saving}
            />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${completionPercentage}%`,
                    backgroundColor: completionPercentage >= 80 ? colors.success : 
                                   completionPercentage >= 60 ? colors.warning : colors.primary,
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Navigation Tabs */}
        <TabView
          tabs={Object.entries(profileSections).map(([key, section]) => ({
            key,
            title: section.title,
          }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          style={styles.tabView}
        />

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'personal' && renderPersonalTab()}
          {activeTab === 'professional' && renderProfessionalTab()}
          {activeTab === 'location' && renderLocationTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
          
          {/* Save Button Fixed at Bottom */}
          <View style={styles.saveSection}>
            <Card style={styles.saveCard}>
              <ThemedText type="subtitle" style={styles.saveTitle}>
                Ready to Update?
              </ThemedText>
              <ThemedText type="default" style={styles.saveDescription}>
                {hasChanges ? 
                  'You have unsaved changes. Save to update your profile.' :
                  'All changes have been saved.'
                }
              </ThemedText>
              <Button
                title={hasChanges ? "Save Changes" : "All Changes Saved"}
                onPress={handleSave}
                variant={hasChanges ? "primary" : "success"}
                size="large"
                loading={saving}
                disabled={!hasChanges || saving}
                icon={hasChanges ? "save" : "check"}
                style={styles.saveButton}
              />
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Unsaved Changes"
        size="small"
      >
        <View style={styles.exitModal}>
          <ThemedText type="default" style={styles.exitText}>
            You have unsaved changes. Are you sure you want to discard them?
          </ThemedText>
          <View style={styles.exitActions}>
            <Button
              title="Keep Editing"
              onPress={() => setShowExitConfirm(false)}
              variant="outline"
              size="medium"
            />
            <Button
              title="Discard Changes"
              onPress={handleDiscardChanges}
              variant="danger"
              size="medium"
            />
          </View>
        </View>
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
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e1e1e1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tabView: {
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for save section
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  sectionDescription: {
    opacity: 0.7,
    lineHeight: 18,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatarHint: {
    fontSize: 12,
    opacity: 0.6,
  },
  formGrid: {
    gap: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  availabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  availabilityCheckbox: {
    width: '45%',
  },
  radiusHint: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 4,
  },
  preferencesList: {
    gap: 12,
  },
  saveSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  saveCard: {
    gap: 12,
  },
  saveTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  saveDescription: {
    textAlign: 'center',
    opacity: 0.7,
  },
  saveButton: {
    marginTop: 8,
  },
  exitModal: {
    gap: 16,
    padding: 16,
  },
  exitText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  exitActions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default EditProfileScreen;