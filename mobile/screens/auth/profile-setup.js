/**
 * 🎯 ENTERPRISE PROFILE SETUP SCREEN v3.0
 * 
 * Enhanced Features:
 * - AI-powered profile optimization with Ethiopian context
 * - Multi-role profile configuration (Client, Provider, Business, Government)
 * - Advanced verification with Ethiopian ID integration
 * - Smart location detection with Ethiopian regions and cities
 * - Portfolio upload with construction-specific categories
 * - Skills matching for service providers
 * - Business registration with Ethiopian compliance
 * - Real-time profile completeness analytics
 * - TypeScript-first with enterprise validation patterns
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLocation } from '../../contexts/location-context';
import { useAI } from '../../contexts/ai-matching-context';
import { 
  analyticsService, 
  uploadService, 
  validationService,
  profileService 
} from '../../services';

// Import Enterprise Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import Avatar from '../../components/ui/avatar';
import LocationPicker from '../../components/ui/location-picker';
import SkillTags from '../../components/profile/skill-tags';
import PortfolioGrid from '../../components/profile/portfolio-grid';
import VerificationBadge from '../../components/profile/verification-badge';
import ProgressIndicator from '../../components/ui/progress-indicator';

// Import Enterprise Constants
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/sizes';
import { USER_ROLES, VERIFICATION_LEVELS } from '../../constants/user';
import { ETHIOPIAN_REGIONS, ETHIOPIAN_CITIES } from '../../constants/location';

// ==================== ENTERPRISE CONSTANTS ====================
const PROFILE_STEPS = Object.freeze({
  BASIC_INFO: 1,
  ROLE_SELECTION: 2,
  LOCATION: 3,
  SKILLS_PORTFOLIO: 4,
  VERIFICATION: 5,
  COMPLETION: 6
});

const USER_ROLE_CONFIG = Object.freeze({
  CLIENT: {
    label: 'ደንበኛ',
    description: 'አገልግሎቶችን ለመጠየቅ',
    icon: 'person',
    features: ['booking_management', 'reviews', 'favorites'],
    requiredFields: ['fullName', 'phone', 'location']
  },
  PROVIDER: {
    label: 'አገልግሎት አቅራቢ',
    description: 'አገልግሎቶችን ለመስጠት',
    icon: 'construct',
    features: ['service_management', 'portfolio', 'earnings'],
    requiredFields: ['fullName', 'phone', 'location', 'skills', 'experience']
  },
  BUSINESS: {
    label: 'ንግድ',
    description: 'ንግድ አገልግሎቶችን ለመስጠት',
    icon: 'business',
    features: ['team_management', 'business_profile', 'analytics'],
    requiredFields: ['fullName', 'phone', 'location', 'businessName', 'businessLicense']
  },
  GOVERNMENT: {
    label: 'መንግሥት',
    description: 'መንግሥታዊ ፕሮጀክቶችን ለማስተዳደር',
    icon: 'shield',
    features: ['project_management', 'workforce_management', 'reports'],
    requiredFields: ['fullName', 'phone', 'location', 'governmentId', 'department']
  }
});

const CONSTRUCTION_SKILLS = Object.freeze({
  MASONRY: 'ጡብ ሠሪ',
  CARPENTRY: 'ብረኛ',
  PLUMBING: 'ፕላምበር',
  ELECTRICAL: 'ኤሌክትሪሻን',
  PAINTING: 'ቀለም ሠሪ',
  TILING: 'ጡብ ማስቀመጫ',
  STEEL_FIXING: 'ማጠንከሪያ ሠሪ',
  EQUIPMENT_OPERATION: 'መሳሪያ ኦፕሬተር'
});

const ProfileSetupScreen = ({ navigation, route }) => {
  // ==================== ENTERPRISE HOOKS ====================
  const { theme, isDark } = useTheme();
  const { 
    user, 
    updateProfile, 
    completeOnboarding,
    setUserRole 
  } = useAuth();
  const { 
    currentLocation, 
    getEthiopianLocation,
    requestLocationPermission 
  } = useLocation();
  const { 
    getProfileRecommendations,
    optimizeProfileForRole 
  } = useAI();

  // ==================== ENTERPRISE STATE MANAGEMENT ====================
  const [currentStep, setCurrentStep] = useState(PROFILE_STEPS.BASIC_INFO);
  const [loading, setLoading] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);
  
  // Profile Data
  const [profileData, setProfileData] = useState({
    // Basic Info
    fullName: '',
    phone: '',
    email: user?.email || '',
    
    // Role Specific
    role: null,
    businessName: '',
    businessLicense: '',
    governmentId: '',
    department: '',
    
    // Location
    location: {
      region: '',
      city: '',
      subcity: '',
      woreda: '',
      specificLocation: ''
    },
    
    // Skills & Portfolio
    skills: [],
    experience: '',
    portfolio: [],
    certifications: [],
    
    // Verification
    idVerified: false,
    phoneVerified: false,
    emailVerified: user?.emailVerified || false
  });

  // UI State
  const [profileImage, setProfileImage] = useState(null);
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [completionProgress, setCompletionProgress] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState([]);

  // Refs
  const scrollViewRef = useRef();

  // ==================== ENTERPRISE EFFECTS ====================
  useEffect(() => {
    initializeProfileSetup();
    trackScreenView('profile_setup');
  }, []);

  useEffect(() => {
    calculateCompletionProgress();
  }, [profileData, currentStep]);

  useEffect(() => {
    if (profileData.role) {
      fetchAIRecommendations();
    }
  }, [profileData.role]);

  // ==================== ENTERPRISE INITIALIZATION ====================
  const initializeProfileSetup = useCallback(async () => {
    try {
      // Pre-fill user data if available
      if (user) {
        setProfileData(prev => ({
          ...prev,
          fullName: user.displayName || '',
          phone: user.phoneNumber || '',
          email: user.email || ''
        }));
      }

      // Auto-detect location
      await autoDetectLocation();

      // Request necessary permissions
      await requestLocationPermission();

    } catch (error) {
      console.error('Profile setup initialization failed:', error);
    }
  }, [user]);

  const autoDetectLocation = useCallback(async () => {
    try {
      const location = await getEthiopianLocation();
      if (location) {
        setProfileData(prev => ({
          ...prev,
          location: {
            region: location.region || '',
            city: location.city || '',
            subcity: location.subcity || '',
            woreda: location.woreda || '',
            specificLocation: location.specificLocation || ''
          }
        }));
      }
    } catch (error) {
      console.warn('Location auto-detection failed:', error);
    }
  }, [getEthiopianLocation]);

  // ==================== ENTERPRISE PROFILE FUNCTIONS ====================
  const calculateCompletionProgress = useCallback(() => {
    const roleConfig = USER_ROLE_CONFIG[profileData.role] || USER_ROLE_CONFIG.CLIENT;
    const requiredFields = roleConfig.requiredFields;
    
    let completedFields = 0;
    
    requiredFields.forEach(field => {
      if (field === 'location') {
        if (profileData.location.region && profileData.location.city) {
          completedFields++;
        }
      } else if (Array.isArray(profileData[field])) {
        if (profileData[field].length > 0) {
          completedFields++;
        }
      } else if (profileData[field]) {
        completedFields++;
      }
    });
    
    const progress = (completedFields / requiredFields.length) * 100;
    setCompletionProgress(Math.min(progress, 100));
  }, [profileData]);

  const fetchAIRecommendations = useCallback(async () => {
    if (!profileData.role) return;
    
    setAiOptimizing(true);
    try {
      const recommendations = await getProfileRecommendations({
        role: profileData.role,
        location: profileData.location,
        existingSkills: profileData.skills
      });
      
      setAiRecommendations(recommendations);
      
      // Auto-apply basic recommendations
      if (recommendations.autoApply) {
        applyAIRecommendations(recommendations);
      }
    } catch (error) {
      console.warn('AI recommendations failed:', error);
    } finally {
      setAiOptimizing(false);
    }
  }, [profileData.role, profileData.location, profileData.skills]);

  const applyAIRecommendations = useCallback((recommendations) => {
    setProfileData(prev => ({
      ...prev,
      skills: [...prev.skills, ...(recommendations.suggestedSkills || [])],
      ...recommendations.profileOptimizations
    }));
  }, []);

  const handleProfileImageUpload = useCallback(async () => {
    try {
      const image = await uploadService.pickImage({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });
      
      if (image) {
        const uploadedUrl = await uploadService.uploadProfileImage(image);
        setProfileImage(uploadedUrl);
        
        await analyticsService.trackEvent('profile_image_uploaded', {
          success: true,
          imageSize: image.fileSize
        });
      }
    } catch (error) {
      console.error('Profile image upload failed:', error);
      Alert.alert('ስህተት', 'የፕሮፋይል ምስል መጫን አልተሳካም።');
    }
  }, []);

  const handlePortfolioUpload = useCallback(async () => {
    try {
      const images = await uploadService.pickMultipleImages({
        allowsEditing: true,
        quality: 0.7,
        maxSelection: 10
      });
      
      if (images && images.length > 0) {
        const uploadedUrls = await Promise.all(
          images.map(image => uploadService.uploadPortfolioImage(image))
        );
        
        setPortfolioImages(prev => [...prev, ...uploadedUrls]);
        setProfileData(prev => ({
          ...prev,
          portfolio: [...prev.portfolio, ...uploadedUrls]
        }));
        
        await analyticsService.trackEvent('portfolio_images_uploaded', {
          count: images.length,
          success: true
        });
      }
    } catch (error) {
      console.error('Portfolio upload failed:', error);
      Alert.alert('ስህተት', 'የፖርትፎሊዮ ምስሎች መጫን አልተሳካም።');
    }
  }, []);

  const handleSkillSelection = useCallback((skill) => {
    setProfileData(prev => {
      const currentSkills = prev.skills;
      const isSelected = currentSkills.includes(skill);
      
      return {
        ...prev,
        skills: isSelected 
          ? currentSkills.filter(s => s !== skill)
          : [...currentSkills, skill]
      };
    });
  }, []);

  const handleLocationSelect = useCallback((locationData) => {
    setProfileData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        ...locationData
      }
    }));
  }, []);

  const validateCurrentStep = useCallback(() => {
    switch (currentStep) {
      case PROFILE_STEPS.BASIC_INFO:
        if (!profileData.fullName.trim()) {
          Alert.alert('ስህተት', 'እባክዎ ሙሉ ስምዎን ያስገቡ');
          return false;
        }
        if (!validationService.validateEthiopianPhone(profileData.phone)) {
          Alert.alert('ስህተት', 'እባክዎ ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ');
          return false;
        }
        return true;

      case PROFILE_STEPS.ROLE_SELECTION:
        if (!profileData.role) {
          Alert.alert('ስህተት', 'እባክዎ ሚናዎን ይምረጡ');
          return false;
        }
        return true;

      case PROFILE_STEPS.LOCATION:
        if (!profileData.location.region || !profileData.location.city) {
          Alert.alert('ስህተት', 'እባክዎ ክልልዎን እና ከተማዎን ይምረጡ');
          return false;
        }
        return true;

      case PROFILE_STEPS.SKILLS_PORTFOLIO:
        const roleConfig = USER_ROLE_CONFIG[profileData.role];
        if (roleConfig.requiredFields.includes('skills') && profileData.skills.length === 0) {
          Alert.alert('ስህተት', 'እባክዎ ቢያንስ አንድ ክህሎት ይምረጡ');
          return false;
        }
        return true;

      default:
        return true;
    }
  }, [currentStep, profileData]);

  const handleNextStep = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    // Special handling for final step
    if (currentStep === PROFILE_STEPS.COMPLETION) {
      await completeProfileSetup();
      return;
    }

    setCurrentStep(prev => prev + 1);
    
    // Scroll to top on step change
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }, [currentStep, validateCurrentStep]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > PROFILE_STEPS.BASIC_INFO) {
      setCurrentStep(prev => prev - 1);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [currentStep]);

  const completeProfileSetup = useCallback(async () => {
    setLoading(true);

    try {
      // AI profile optimization
      const optimizedProfile = await optimizeProfileForRole({
        ...profileData,
        profileImage,
        portfolio: portfolioImages
      }, profileData.role);

      // Update user profile
      const result = await updateProfile(optimizedProfile);
      
      if (result.success) {
        // Set user role
        await setUserRole(profileData.role);
        
        // Complete onboarding
        await completeOnboarding();
        
        // Track completion
        await analyticsService.trackEvent('profile_setup_completed', {
          role: profileData.role,
          completionProgress: 100,
          verificationLevel: profileData.idVerified ? 'verified' : 'basic'
        });

        // Show success and navigate
        Alert.alert(
          'በተሳካ ሁኔታ!',
          'ፕሮፋይልዎ በተሳካ ሁኔታ ተጠናቅቋል። አሁን Yachi ማህበረሰብ አባል ሆነዋል!',
          [{ text: 'በመልካም', onPress: () => navigation.replace('Main') }]
        );
      } else {
        throw new Error(result.message || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile setup completion failed:', error);
      Alert.alert(
        'ስህተት',
        error.message || 'ፕሮፋይል ማጠናቀቅ አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
      );
    } finally {
      setLoading(false);
    }
  }, [profileData, profileImage, portfolioImages, navigation]);

  // ==================== RENDER FUNCTIONS ====================
  const renderStepIndicator = () => (
    <ProgressIndicator
      currentStep={currentStep}
      totalSteps={6}
      steps={[
        'መሠረታዊ መረጃ',
        'ሚና',
        'አድራሻ',
        'ክህሎቶች',
        'ማረጋገጫ',
        'ማጠናቀቅ'
      ]}
      style={styles.stepIndicator}
    />
  );

  const renderBasicInfoStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        መሠረታዊ መረጃ
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.subtitle}>
        ስለእርስዎ መሠረታዊ መረጃ ያስገቡ
      </ThemedText>

      {/* Profile Image Upload */}
      <TouchableOpacity 
        style={styles.profileImageContainer}
        onPress={handleProfileImageUpload}
      >
        <Avatar
          source={profileImage ? { uri: profileImage } : null}
          size={120}
          placeholder={user?.displayName?.[0] || '?'}
          style={styles.profileImage}
        />
        <View style={styles.profileImageOverlay}>
          <ThemedText type="caption" style={styles.profileImageText}>
            ፕሮፋይል ፎቶ ይጫኑ
          </ThemedText>
        </View>
      </TouchableOpacity>

      <Input
        label="ሙሉ ስም"
        placeholder="ሙሉ ስምዎን ያስገቡ"
        value={profileData.fullName}
        onChangeText={(text) => setProfileData(prev => ({ ...prev, fullName: text }))}
        autoComplete="name"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="ስልክ ቁጥር"
        placeholder="09XXXXXXXX"
        value={profileData.phone}
        onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
        keyboardType="phone-pad"
        autoComplete="tel"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="ኢሜይል"
        placeholder="example@email.com"
        value={profileData.email}
        editable={false}
        containerStyle={styles.inputContainer}
      />

      {aiRecommendations.length > 0 && (
        <View style={styles.aiRecommendations}>
          <ThemedText type="caption" style={styles.aiTitle}>
            🤖 AI ምክሮች:
          </ThemedText>
          {aiRecommendations.slice(0, 3).map((rec, index) => (
            <ThemedText key={index} type="caption" style={styles.aiRecommendation}>
              • {rec}
            </ThemedText>
          ))}
        </View>
      )}
    </View>
  );

  const renderRoleSelectionStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        ሚና ምርጫ
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.subtitle}>
        በ Yachi ላይ ለማድረግ የሚፈልጉትን ሚና ይምረጡ
      </ThemedText>

      <View style={styles.roleGrid}>
        {Object.entries(USER_ROLE_CONFIG).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.roleCard,
              profileData.role === key && styles.roleCardSelected
            ]}
            onPress={() => setProfileData(prev => ({ ...prev, role: key }))}
          >
            <View style={styles.roleIcon}>
              <ThemedText type="title">{config.icon}</ThemedText>
            </View>
            
            <ThemedText type="subtitle" style={styles.roleLabel}>
              {config.label}
            </ThemedText>
            
            <ThemedText type="caption" style={styles.roleDescription}>
              {config.description}
            </ThemedText>

            <View style={styles.roleFeatures}>
              {config.features.slice(0, 2).map((feature, index) => (
                <ThemedText key={index} type="caption" style={styles.roleFeature}>
                  ✓ {feature}
                </ThemedText>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {profileData.role && (
        <View style={styles.roleDetails}>
          <ThemedText type="caption" style={styles.roleDetailsTitle}>
            የተመረጠ ሚና: {USER_ROLE_CONFIG[profileData.role].label}
          </ThemedText>
          <ThemedText type="caption">
            ይህ ሚና የሚፈቅደው: {USER_ROLE_CONFIG[profileData.role].features.join(', ')}
          </ThemedText>
        </View>
      )}
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        አድራሻ
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.subtitle}>
        የአገልግሎት አካባቢዎን ይምረጡ
      </ThemedText>

      <LocationPicker
        value={profileData.location}
        onChange={handleLocationSelect}
        regions={ETHIOPIAN_REGIONS}
        cities={ETHIOPIAN_CITIES}
        showCurrentLocation={true}
        containerStyle={styles.locationPicker}
      />

      <Input
        label="የተጨማሪ አድራሻ (ከፈለጉ)"
        placeholder="ተጨማሪ አድራሻ ዝርዝሮች"
        value={profileData.location.specificLocation}
        onChangeText={(text) => setProfileData(prev => ({
          ...prev,
          location: { ...prev.location, specificLocation: text }
        }))}
        containerStyle={styles.inputContainer}
      />

      <View style={styles.locationTips}>
        <ThemedText type="caption" style={styles.tipsTitle}>
          💡 ማስታወሻ:
        </ThemedText>
        <ThemedText type="caption">
          • ትክክለኛ አድራሻ የተሻለ አገልግሎት ማግኛ ያደርገዋል
        </ThemedText>
        <ThemedText type="caption">
          • አገልግሎት አቅራቢዎች በአቅራቢያዎ ያሉ ደንበኞችን ያገኛሉ
        </ThemedText>
      </View>
    </View>
  );

  const renderSkillsPortfolioStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        ክህሎቶች እና ፖርትፎሊዮ
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.subtitle}>
        ክህሎቶችዎን እና የቀድሞ ሥራዎችን ያሳዩ
      </ThemedText>

      {/* Skills Selection */}
      <View style={styles.skillsSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          የግንባታ ክህሎቶች
        </ThemedText>
        
        <SkillTags
          skills={Object.values(CONSTRUCTION_SKILLS)}
          selectedSkills={profileData.skills}
          onSkillPress={handleSkillSelection}
          style={styles.skillsContainer}
        />
      </View>

      {/* Experience */}
      <Input
        label="ልምድ (በዓመት)"
        placeholder="የልምድ ዓመታት"
        value={profileData.experience}
        onChangeText={(text) => setProfileData(prev => ({ ...prev, experience: text }))}
        keyboardType="number-pad"
        containerStyle={styles.inputContainer}
      />

      {/* Portfolio Upload */}
      <View style={styles.portfolioSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          የሥራ ፖርትፎሊዮ
        </ThemedText>
        
        <PortfolioGrid
          images={portfolioImages}
          onAddImage={handlePortfolioUpload}
          onRemoveImage={(index) => {
            const newImages = [...portfolioImages];
            newImages.splice(index, 1);
            setPortfolioImages(newImages);
          }}
          maxImages={10}
          style={styles.portfolioContainer}
        />
        
        <ThemedText type="caption" style={styles.portfolioTip}>
          ከፍተኛ ጥራት ያላቸው የቀድሞ ሥራዎችን ፎቶዎች ይጫኑ
        </ThemedText>
      </View>
    </View>
  );

  const renderVerificationStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        ማረጋገጫ
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.subtitle}>
        መለያዎን ለማረጋገጥ ያህል ይጨምራል
      </ThemedText>

      <View style={styles.verificationCards}>
        {/* Phone Verification */}
        <TouchableOpacity 
          style={[
            styles.verificationCard,
            profileData.phoneVerified && styles.verificationCardCompleted
          ]}
          onPress={() => navigation.navigate('PhoneVerification')}
        >
          <VerificationBadge
            verified={profileData.phoneVerified}
            level={profileData.phoneVerified ? VERIFICATION_LEVELS.VERIFIED : VERIFICATION_LEVELS.BASIC}
          />
          
          <View style={styles.verificationInfo}>
            <ThemedText type="subtitle">ስልክ ማረጋገጫ</ThemedText>
            <ThemedText type="caption">
              {profileData.phoneVerified ? 'ተረጋግጧል' : 'ለማረጋገጥ ይንኩ'}
            </ThemedText>
          </View>
        </TouchableOpacity>

        {/* ID Verification */}
        {profileData.role !== USER_ROLES.CLIENT && (
          <TouchableOpacity 
            style={[
              styles.verificationCard,
              profileData.idVerified && styles.verificationCardCompleted
            ]}
            onPress={() => navigation.navigate('IDVerification')}
          >
            <VerificationBadge
              verified={profileData.idVerified}
              level={profileData.idVerified ? VERIFICATION_LEVELS.VERIFIED : VERIFICATION_LEVELS.BASIC}
            />
            
            <View style={styles.verificationInfo}>
              <ThemedText type="subtitle">መለያ ማረጋገጫ</ThemedText>
              <ThemedText type="caption">
                {profileData.idVerified ? 'ተረጋግጧል' : 'የኢትዮጵያ መለያ ያስገቡ'}
              </ThemedText>
            </View>
          </TouchableOpacity>
        )}

        {/* Business Verification */}
        {profileData.role === USER_ROLES.BUSINESS && (
          <TouchableOpacity 
            style={styles.verificationCard}
            onPress={() => navigation.navigate('BusinessVerification')}
          >
            <VerificationBadge
              verified={false}
              level={VERIFICATION_LEVELS.BASIC}
            />
            
            <View style={styles.verificationInfo}>
              <ThemedText type="subtitle">የንግድ ማረጋገጫ</ThemedText>
              <ThemedText type="caption">የንግድ ፍቃድ ያስገቡ</ThemedText>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.verificationBenefits}>
        <ThemedText type="caption" style={styles.benefitsTitle}>
          የማረጋገጫ ጥቅሞች:
        </ThemedText>
        <ThemedText type="caption">• የበለጠ የደንበኞች ታማኝነት</ThemedText>
        <ThemedText type="caption">• በፍለጋ ውጤቶች ውስጥ ተጨማሪ ትኩረት</ThemedText>
        <ThemedText type="caption">• የላቁ አገልግሎቶች መዳረሻ</ThemedText>
      </View>
    </View>
  );

  const renderCompletionStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="title" style={styles.title}>
        ፕሮፋይልዎ ዝግጁ ነው!
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.subtitle}>
        የፕሮፋይል ማጠናቀቂያዎን ይገምግሙ እና ያጠናቅቁ
      </ThemedText>

      {/* Profile Summary */}
      <View style={styles.profileSummary}>
        <View style={styles.summaryRow}>
          <ThemedText type="caption">ሙሉ ስም:</ThemedText>
          <ThemedText type="caption" style={styles.summaryValue}>
            {profileData.fullName}
          </ThemedText>
        </View>
        
        <View style={styles.summaryRow}>
          <ThemedText type="caption">ሚና:</ThemedText>
          <ThemedText type="caption" style={styles.summaryValue}>
            {USER_ROLE_CONFIG[profileData.role]?.label}
          </ThemedText>
        </View>
        
        <View style={styles.summaryRow}>
          <ThemedText type="caption">አድራሻ:</ThemedText>
          <ThemedText type="caption" style={styles.summaryValue}>
            {profileData.location.city}, {profileData.location.region}
          </ThemedText>
        </View>
        
        {profileData.skills.length > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText type="caption">ክህሎቶች:</ThemedText>
            <ThemedText type="caption" style={styles.summaryValue}>
              {profileData.skills.slice(0, 3).join(', ')}
              {profileData.skills.length > 3 && ' ...'}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Completion Progress */}
      <View style={styles.completionStats}>
        <ThemedText type="subtitle" style={styles.completionTitle}>
          የፕሮፋይል ሙሉነት: {Math.round(completionProgress)}%
        </ThemedText>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${completionProgress}%` }
            ]} 
          />
        </View>
        
        <ThemedText type="caption">
          {completionProgress >= 80 
            ? 'ፕሮፋይልዎ ለመጠቀም ዝግጁ ነው!' 
            : 'ፕሮፋይልዎን ለማጠናቀቅ ጥቂት መረጃዎች ያስፈልጋሉ'
          }
        </ThemedText>
      </View>

      {/* AI Optimization Status */}
      {aiOptimizing && (
        <View style={styles.aiStatus}>
          <ActivityIndicator size="small" color={COLORS.primary.main} />
          <ThemedText type="caption" style={styles.aiStatusText}>
            AI ፕሮፋይል አመቻች በሂደት ላይ...
          </ThemedText>
        </View>
      )}
    </View>
  );

  // ==================== MAIN RENDER ====================
  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Step Indicator */}
        {renderStepIndicator()}

        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Step Content */}
          {currentStep === PROFILE_STEPS.BASIC_INFO && renderBasicInfoStep()}
          {currentStep === PROFILE_STEPS.ROLE_SELECTION && renderRoleSelectionStep()}
          {currentStep === PROFILE_STEPS.LOCATION && renderLocationStep()}
          {currentStep === PROFILE_STEPS.SKILLS_PORTFOLIO && renderSkillsPortfolioStep()}
          {currentStep === PROFILE_STEPS.VERIFICATION && renderVerificationStep()}
          {currentStep === PROFILE_STEPS.COMPLETION && renderCompletionStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          {currentStep > PROFILE_STEPS.BASIC_INFO && (
            <Button
              title="ወደ ኋላ"
              onPress={handlePreviousStep}
              type="outline"
              style={styles.backButton}
            />
          )}
          
          <Button
            title={
              currentStep === PROFILE_STEPS.COMPLETION 
                ? (loading ? "በማጠናቀቅ ላይ..." : "ፕሮፋይል አጠናቅቅ")
                : "ቀጣይ"
            }
            onPress={handleNextStep}
            loading={loading}
            style={styles.nextButton}
            disabled={
              (currentStep === PROFILE_STEPS.COMPLETION && completionProgress < 60) ||
              loading
            }
          />
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

// ==================== ENTERPRISE STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  stepIndicator: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  stepContainer: {
    flex: 1,
    paddingBottom: SPACING.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
  },
  profileImage: {
    borderWidth: 3,
    borderColor: COLORS.primary.main,
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: SPACING.xs,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  profileImageText: {
    color: COLORS.text.inverse,
    textAlign: 'center',
    fontSize: 12,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  aiRecommendations: {
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  aiTitle: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  aiRecommendation: {
    marginLeft: SPACING.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  roleCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light + '20',
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  roleLabel: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  roleDescription: {
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  roleFeatures: {
    width: '100%',
  },
  roleFeature: {
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  roleDetails: {
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: 8,
  },
  roleDetailsTitle: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  locationPicker: {
    marginBottom: SPACING.lg,
  },
  locationTips: {
    backgroundColor: COLORS.semantic.info.light + '20',
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  tipsTitle: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  skillsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  skillsContainer: {
    marginBottom: SPACING.lg,
  },
  portfolioSection: {
    marginBottom: SPACING.xl,
  },
  portfolioContainer: {
    marginBottom: SPACING.md,
  },
  portfolioTip: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  verificationCards: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.primary,
  },
  verificationCardCompleted: {
    borderColor: COLORS.semantic.success.main,
    backgroundColor: COLORS.semantic.success.light + '20',
  },
  verificationInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  verificationBenefits: {
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: 8,
  },
  benefitsTitle: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  profileSummary: {
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryValue: {
    fontWeight: '600',
  },
  completionStats: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  completionTitle: {
    marginBottom: SPACING.md,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.border.primary,
    borderRadius: 4,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 4,
  },
  aiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  aiStatusText: {
    marginLeft: SPACING.sm,
  },
  navigation: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});

export default ProfileSetupScreen;