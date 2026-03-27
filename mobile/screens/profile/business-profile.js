// screens/profile/business-profile.js
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/auth-context';
import { useNotifications } from '../../contexts/notification-context';

// Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Card from '../../components/ui/card';
import Badge from '../../components/ui/badge';
import Loading from '../../components/ui/loading';
import Avatar from '../../components/ui/avatar';
import Rating from '../../components/ui/rating';
import SkillTags from '../../components/profile/skill-tags';
import VerificationBadge from '../../components/profile/verification-badge';
import PortfolioGrid from '../../components/profile/portfolio-grid';
import ConfirmationModal from '../../components/ui/confirmation-modal';

// Services
import { 
  getBusinessProfile, 
  updateBusinessProfile, 
  uploadBusinessDocument,
  deleteBusinessDocument,
  updateBusinessStats
} from '../../services/user-service';
import { uploadImage } from '../../services/upload-service';
import { sendNotification } from '../../services/notification-service';

// Utils
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { validateBusinessProfile, validateBusinessDocument } from '../../utils/validators';

// Constants
import { BUSINESS_CATEGORIES, VERIFICATION_LEVELS, BUSINESS_TYPES } from '../../constants/user';

const BusinessProfile = () => {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotifications();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Business statistics
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedProjects: 0,
    activeProjects: 0,
    clientSatisfaction: 0,
    responseRate: 0,
    repeatClients: 0
  });

  // Available business categories
  const businessCategories = useMemo(() => [
    { id: 'construction', name: 'Construction', icon: '🏗️' },
    { id: 'plumbing', name: 'Plumbing', icon: '🔧' },
    { id: 'electrical', name: 'Electrical', icon: '⚡' },
    { id: 'cleaning', name: 'Cleaning', icon: '🧹' },
    { id: 'painting', name: 'Painting', icon: '🎨' },
    { id: 'carpentry', name: 'Carpentry', icon: '🪵' },
    { id: 'landscaping', name: 'Landscaping', icon: '🌿' },
    { id: 'moving', name: 'Moving Services', icon: '🚚' },
    { id: 'renovation', name: 'Renovation', icon: '🏠' },
    { id: 'consulting', name: 'Consulting', icon: '💼' }
  ], []);

  // Verification requirements
  const verificationRequirements = useMemo(() => [
    { id: 'email', label: 'Email Verified', completed: user?.emailVerified },
    { id: 'phone', label: 'Phone Verified', completed: user?.phoneVerified },
    { id: 'id', label: 'ID Document', completed: profile?.documents?.id },
    { id: 'license', label: 'Business License', completed: profile?.documents?.license },
    { id: 'portfolio', label: 'Portfolio (5+ items)', completed: profile?.portfolio?.length >= 5 },
    { id: 'reviews', label: 'Positive Reviews', completed: stats.clientSatisfaction >= 4.0 }
  ], [user, profile, stats]);

  // Load business profile
  const loadBusinessProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await getBusinessProfile(user.id);
      if (result.success) {
        setProfile(result.profile);
        setFormData(result.profile);
        setStats(result.stats || stats);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
      showNotification('error', 'Failed to load business profile');
    } finally {
      setLoading(false);
    }
  }, [user, showNotification]);

  // Handle form input change
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [errors]);

  // Handle category selection
  const handleCategoryToggle = useCallback((categoryId) => {
    setFormData(prev => {
      const categories = prev.categories || [];
      const updatedCategories = categories.includes(categoryId)
        ? categories.filter(id => id !== categoryId)
        : [...categories, categoryId];
      
      return { ...prev, categories: updatedCategories };
    });
  }, []);

  // Handle skill addition
  const handleAddSkill = useCallback((skill) => {
    if (!skill.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      skills: [...(prev.skills || []), skill.trim()]
    }));
  }, []);

  // Handle skill removal
  const handleRemoveSkill = useCallback((skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(skill => skill !== skillToRemove)
    }));
  }, []);

  // Validate form data
  const validateForm = useCallback(() => {
    const validation = validateBusinessProfile(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return false;
    }
    setErrors({});
    return true;
  }, [formData]);

  // Save business profile
  const handleSaveProfile = useCallback(async () => {
    if (!validateForm()) {
      showNotification('error', 'Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      const result = await updateBusinessProfile(user.id, formData);
      if (result.success) {
        setProfile(formData);
        setEditing(false);
        showNotification('success', 'Business profile updated successfully');
        
        // Update user context if needed
        if (formData.businessName) {
          updateUser({ businessName: formData.businessName });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving business profile:', error);
      showNotification('error', 'Failed to update business profile');
    } finally {
      setSaving(false);
    }
  }, [formData, user, validateForm, showNotification, updateUser]);

  // Handle image upload
  const handleImageUpload = useCallback(async (imageType, imageUri) => {
    setUploading(true);
    try {
      const uploadResult = await uploadImage(imageUri, `business/${user.id}/${imageType}`);
      if (uploadResult.success) {
        const updatedProfile = {
          ...formData,
          [imageType === 'logo' ? 'logo' : 'coverImage']: uploadResult.url
        };
        
        setFormData(updatedProfile);
        showNotification('success', `${imageType === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully`);
      } else {
        throw new Error(uploadResult.error);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showNotification('error', `Failed to upload ${imageType}`);
    } finally {
      setUploading(false);
    }
  }, [formData, user, showNotification]);

  // Handle document upload
  const handleDocumentUpload = useCallback(async (documentType, file) => {
    const validation = validateBusinessDocument(file);
    if (!validation.valid) {
      showNotification('error', validation.errors.join(', '));
      return;
    }

    setUploading(true);
    try {
      const result = await uploadBusinessDocument(user.id, documentType, file);
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: result.document
          }
        }));
        showNotification('success', `${documentType.toUpperCase()} document uploaded successfully`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      showNotification('error', `Failed to upload ${documentType} document`);
    } finally {
      setUploading(false);
    }
  }, [user, showNotification]);

  // Handle document deletion
  const handleDeleteDocument = useCallback(async (documentType) => {
    try {
      const result = await deleteBusinessDocument(user.id, documentType);
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: null
          }
        }));
        showNotification('success', 'Document deleted successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Document deletion error:', error);
      showNotification('error', 'Failed to delete document');
    } finally {
      setDeleteModalVisible(false);
      setDocumentToDelete(null);
    }
  }, [user, showNotification]);

  // Calculate verification progress
  const verificationProgress = useMemo(() => {
    const completed = verificationRequirements.filter(req => req.completed).length;
    return (completed / verificationRequirements.length) * 100;
  }, [verificationRequirements]);

  // Get verification level
  const verificationLevel = useMemo(() => {
    const completedCount = verificationRequirements.filter(req => req.completed).length;
    
    if (completedCount >= 6) return VERIFICATION_LEVELS.PREMIUM;
    if (completedCount >= 4) return VERIFICATION_LEVELS.VERIFIED;
    if (completedCount >= 2) return VERIFICATION_LEVELS.BASIC;
    return VERIFICATION_LEVELS.PENDING;
  }, [verificationRequirements]);

  // Initialize
  useEffect(() => {
    loadBusinessProfile();
  }, [loadBusinessProfile]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Loading message="Loading business profile..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.businessHeader}>
              <View style={styles.businessInfo}>
                <View style={styles.businessNameRow}>
                  <ThemedText style={styles.businessName}>
                    {profile?.businessName || 'Your Business'}
                  </ThemedText>
                  <VerificationBadge level={verificationLevel} />
                </View>
                <ThemedText style={styles.businessDescription}>
                  {profile?.description || 'Add a business description'}
                </ThemedText>
                <Rating 
                  value={stats.clientSatisfaction} 
                  size={16} 
                  showValue 
                />
              </View>
              
              <Avatar
                source={profile?.logo ? { uri: profile.logo } : null}
                size={80}
                placeholder="🏢"
                editable={editing}
                onEdit={() => {
                  // This would trigger image picker
                  showNotification('info', 'Image picker would open');
                }}
              />
            </View>

            {/* Business Stats */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <ThemedText style={styles.statValue}>
                  {formatCurrency(stats.totalEarnings, 'ETB')}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Total Earnings</ThemedText>
              </Card>
              <Card style={styles.statCard}>
                <ThemedText style={styles.statValue}>
                  {formatNumber(stats.completedProjects)}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Projects</ThemedText>
              </Card>
              <Card style={styles.statCard}>
                <ThemedText style={styles.statValue}>
                  {stats.responseRate}%
                </ThemedText>
                <ThemedText style={styles.statLabel}>Response Rate</ThemedText>
              </Card>
              <Card style={styles.statCard}>
                <ThemedText style={styles.statValue}>
                  {stats.repeatClients}%
                </ThemedText>
                <ThemedText style={styles.statLabel}>Repeat Clients</ThemedText>
              </Card>
            </View>
          </View>
        </View>

        {/* Verification Progress */}
        <Card style={styles.verificationCard}>
          <View style={styles.verificationHeader}>
            <ThemedText style={styles.sectionTitle}>Verification Status</ThemedText>
            <Badge variant={verificationLevel === 'premium' ? 'premium' : 'primary'}>
              {verificationLevel.toUpperCase()}
            </Badge>
          </View>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${verificationProgress}%` }
              ]} 
            />
          </View>
          
          <ThemedText style={styles.progressText}>
            {Math.round(verificationProgress)}% Complete
          </ThemedText>

          <View style={styles.requirementsList}>
            {verificationRequirements.map((requirement) => (
              <View key={requirement.id} style={styles.requirementItem}>
                <View style={[
                  styles.requirementCheck,
                  requirement.completed && styles.requirementCheckCompleted
                ]}>
                  {requirement.completed && (
                    <ThemedText style={styles.checkmark}>✓</ThemedText>
                  )}
                </View>
                <ThemedText style={[
                  styles.requirementLabel,
                  requirement.completed && styles.requirementLabelCompleted
                ]}>
                  {requirement.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>

        {/* Edit/Save Buttons */}
        <View style={styles.actionButtons}>
          {editing ? (
            <View style={styles.editActions}>
              <Button
                variant="outline"
                onPress={() => {
                  setEditing(false);
                  setFormData(profile);
                  setErrors({});
                }}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleSaveProfile}
                loading={saving}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
            </View>
          ) : (
            <Button
              variant="primary"
              onPress={() => setEditing(true)}
              style={styles.editButton}
            >
              Edit Profile
            </Button>
          )}
        </View>

        {/* Business Information */}
        <Card style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Business Information</ThemedText>
          
          {editing ? (
            <View style={styles.formSection}>
              <Input
                label="Business Name"
                value={formData.businessName || ''}
                onChangeText={(value) => handleInputChange('businessName', value)}
                error={errors.businessName}
                placeholder="Enter your business name"
              />
              
              <Input
                label="Business Description"
                value={formData.description || ''}
                onChangeText={(value) => handleInputChange('description', value)}
                error={errors.description}
                placeholder="Describe your business services"
                multiline
                numberOfLines={3}
              />
              
              <Input
                label="Years in Business"
                value={formData.yearsInBusiness?.toString() || ''}
                onChangeText={(value) => handleInputChange('yearsInBusiness', parseInt(value) || 0)}
                error={errors.yearsInBusiness}
                placeholder="0"
                keyboardType="numeric"
              />
              
              <Input
                label="Team Size"
                value={formData.teamSize?.toString() || ''}
                onChangeText={(value) => handleInputChange('teamSize', parseInt(value) || 0)}
                error={errors.teamSize}
                placeholder="1"
                keyboardType="numeric"
              />
            </View>
          ) : (
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>Business Name</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {profile?.businessName || 'Not set'}
                </ThemedText>
              </View>
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>Years Experience</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {profile?.yearsInBusiness || 0} years
                </ThemedText>
              </View>
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>Team Size</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {profile?.teamSize || 1} people
                </ThemedText>
              </View>
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>Business Type</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {profile?.businessType || 'Individual'}
                </ThemedText>
              </View>
            </View>
          )}
        </Card>

        {/* Categories & Skills */}
        <Card style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Services & Skills</ThemedText>
          
          {editing ? (
            <View style={styles.formSection}>
              <ThemedText style={styles.subsectionTitle}>Business Categories</ThemedText>
              <View style={styles.categoriesGrid}>
                {businessCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={formData.categories?.includes(category.id) ? 'primary' : 'outline'}
                    size="small"
                    onPress={() => handleCategoryToggle(category.id)}
                    style={styles.categoryButton}
                  >
                    <ThemedText style={styles.categoryIcon}>{category.icon}</ThemedText>
                    <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
                  </Button>
                ))}
              </View>

              <ThemedText style={styles.subsectionTitle}>Skills & Specializations</ThemedText>
              <SkillTags
                skills={formData.skills || []}
                onAddSkill={handleAddSkill}
                onRemoveSkill={handleRemoveSkill}
                editable={editing}
              />
            </View>
          ) : (
            <View style={styles.skillsSection}>
              <View style={styles.categoriesDisplay}>
                {profile?.categories?.map(categoryId => {
                  const category = businessCategories.find(c => c.id === categoryId);
                  return category ? (
                    <Badge key={category.id} variant="outline" style={styles.categoryBadge}>
                      <ThemedText style={styles.categoryIcon}>{category.icon}</ThemedText>
                      <ThemedText>{category.name}</ThemedText>
                    </Badge>
                  ) : null;
                })}
              </View>
              
              <SkillTags
                skills={profile?.skills || []}
                editable={false}
              />
            </View>
          )}
        </Card>

        {/* Portfolio Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Portfolio</ThemedText>
            <Button
              variant="outline"
              size="small"
              onPress={() => router.push('/portfolio')}
            >
              Manage
            </Button>
          </View>
          
          <PortfolioGrid
            items={profile?.portfolio || []}
            maxVisible={6}
            onAddItem={() => {
              if (editing) {
                // Trigger portfolio upload
                showNotification('info', 'Portfolio upload would open');
              }
            }}
            onItemPress={(item) => setSelectedImage(item.url)}
            editable={editing}
          />
        </Card>

        {/* Contact Information */}
        <Card style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
          
          {editing ? (
            <View style={styles.formSection}>
              <Input
                label="Phone Number"
                value={formData.phone || ''}
                onChangeText={(value) => handleInputChange('phone', value)}
                error={errors.phone}
                placeholder="+251 ..."
                keyboardType="phone-pad"
              />
              
              <Input
                label="Email Address"
                value={formData.email || ''}
                onChangeText={(value) => handleInputChange('email', value)}
                error={errors.email}
                placeholder="business@example.com"
                keyboardType="email-address"
              />
              
              <Input
                label="Website"
                value={formData.website || ''}
                onChangeText={(value) => handleInputChange('website', value)}
                error={errors.website}
                placeholder="https://yourbusiness.com"
                keyboardType="url"
              />
              
              <Input
                label="Address"
                value={formData.address || ''}
                onChangeText={(value) => handleInputChange('address', value)}
                error={errors.address}
                placeholder="Business location address"
              />
            </View>
          ) : (
            <View style={styles.contactGrid}>
              <View style={styles.contactItem}>
                <ThemedText style={styles.contactLabel}>Phone</ThemedText>
                <ThemedText style={styles.contactValue}>
                  {profile?.phone || 'Not provided'}
                </ThemedText>
              </View>
              <View style={styles.contactItem}>
                <ThemedText style={styles.contactLabel}>Email</ThemedText>
                <ThemedText style={styles.contactValue}>
                  {profile?.email || 'Not provided'}
                </ThemedText>
              </View>
              <View style={styles.contactItem}>
                <ThemedText style={styles.contactLabel}>Website</ThemedText>
                <ThemedText style={styles.contactValue}>
                  {profile?.website || 'Not provided'}
                </ThemedText>
              </View>
              <View style={styles.contactItem}>
                <ThemedText style={styles.contactLabel}>Address</ThemedText>
                <ThemedText style={styles.contactValue}>
                  {profile?.address || 'Not provided'}
                </ThemedText>
              </View>
            </View>
          )}
        </Card>

        {/* Business Documents */}
        <Card style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Business Documents</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Upload required documents for verification and trust building
          </ThemedText>
          
          <View style={styles.documentsList}>
            {[
              { type: 'id', label: 'ID Document', description: 'Government issued ID' },
              { type: 'license', label: 'Business License', description: 'Trade license or permit' },
              { type: 'insurance', label: 'Insurance', description: 'Liability insurance document' },
              { type: 'certification', label: 'Certifications', description: 'Professional certifications' }
            ].map((doc) => (
              <Card key={doc.type} style={styles.documentCard}>
                <View style={styles.documentInfo}>
                  <ThemedText style={styles.documentLabel}>{doc.label}</ThemedText>
                  <ThemedText style={styles.documentDescription}>
                    {doc.description}
                  </ThemedText>
                  {formData.documents?.[doc.type] && (
                    <Badge variant="success" size="small">Uploaded</Badge>
                  )}
                </View>
                
                {editing && (
                  <View style={styles.documentActions}>
                    {formData.documents?.[doc.type] ? (
                      <Button
                        variant="destructive"
                        size="small"
                        onPress={() => {
                          setDocumentToDelete(doc.type);
                          setDeleteModalVisible(true);
                        }}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="small"
                        onPress={() => {
                          // Trigger document upload
                          showNotification('info', 'Document upload would open');
                        }}
                      >
                        Upload
                      </Button>
                    )}
                  </View>
                )}
              </Card>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Document"
        message={`Are you sure you want to delete this ${documentToDelete} document?`}
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={() => handleDeleteDocument(documentToDelete)}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDocumentToDelete(null);
        }}
        variant="destructive"
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    gap: 16,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  businessInfo: {
    flex: 1,
    marginRight: 16,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  businessDescription: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 12,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  verificationCard: {
    marginBottom: 16,
    padding: 16,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requirementCheckCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requirementLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  requirementLabelCompleted: {
    opacity: 1,
    fontWeight: '500',
  },
  actionButtons: {
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  editButton: {
    width: '100%',
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  formSection: {
    gap: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 14,
  },
  categoriesDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillsSection: {
    gap: 12,
  },
  contactGrid: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  documentActions: {
    marginLeft: 12,
  },
});

export default BusinessProfile;