// components/forms/verification-form.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ScrollView,
  Keyboard,
  Dimensions,
  Platform,
  AppState,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useLoading } from '../../hooks/use-loading';
import { useAuth } from '../../contexts/auth-context';
import { verificationService } from '../../services/verification-service';
import { uploadService } from '../../services/upload-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { validators } from '../../utils/validators';
import { storage } from '../../utils/storage';

// Components
import Input from '../ui/input';
import Button from '../ui/button';
import DocumentUpload from './document-upload';
import VerificationCodeInput from './verification-code-input';
import ProgressIndicator from '../ui/progress-indicator';
import Modal from '../ui/modal';
import Loading from '../ui/loading';
import Toast from '../ui/toast';
import SkillTags from '../profile/skill-tags';
import PortfolioGrid from '../profile/portfolio-grid';

// Constants
const VERIFICATION_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  IDENTITY: 'identity',
  ADDRESS: 'address',
  BACKGROUND: 'background',
  SKILLS: 'skills',
  BUSINESS: 'business',
  GOVERNMENT: 'government',
  COMPREHENSIVE: 'comprehensive',
};

const VERIFICATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

const DOCUMENT_TYPES = {
  ID_CARD: 'id_card',
  PASSPORT: 'passport',
  DRIVERS_LICENSE: 'drivers_license',
  PROOF_OF_ADDRESS: 'proof_of_address',
  UTILITY_BILL: 'utility_bill',
  BANK_STATEMENT: 'bank_statement',
  BUSINESS_LICENSE: 'business_license',
  TAX_CERTIFICATE: 'tax_certificate',
  SELFIE: 'selfie',
  PORTFOLIO: 'portfolio',
  OTHER: 'other',
};

const USER_ROLES = {
  CLIENT: 'client',
  SERVICE_PROVIDER: 'service_provider',
  GOVERNMENT: 'government',
  ADMIN: 'admin',
};

const VERIFICATION_LEVELS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  GOVERNMENT: 'government',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VerificationForm = ({
  verificationType = VERIFICATION_TYPES.EMAIL,
  userRole = USER_ROLES.CLIENT,
  verificationLevel = VERIFICATION_LEVELS.BASIC,
  userId,
  required = true,
  autoStart = true,
  maxAttempts = 3,
  codeExpiry = 300,
  initialData = {},
  onVerificationComplete,
  onVerificationFailed,
  onStepChange,
  enableDocumentUpload = true,
  enableResend = true,
  enableManualEntry = true,
  enableProgressTracking = true,
  enableBiometric = false,
  submitButtonText,
  resendButtonText = 'Resend Code',
  verificationTitle,
  verificationSubtitle,
  analyticsEvent,
  analyticsData,
  enableRateLimiting = true,
  enableFraudDetection = true,
  style,
  formStyle,
  documentStyle,
  codeInputStyle,
  testID = 'verification-form',
  accessibilityLabel = 'Verification Form',
  ...rest
}) => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();
  const { user, updateUser } = useAuth();
  
  // State management
  const [formData, setFormData] = useState({
    code: '',
    documentType: getDefaultDocumentType(),
    documentFront: null,
    documentBack: null,
    selfie: null,
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    dateOfBirth: initialData.dateOfBirth || '',
    address: initialData.address || '',
    city: initialData.city || '',
    region: initialData.region || '',
    businessName: initialData.businessName || '',
    businessLicense: initialData.businessLicense || '',
    taxId: initialData.taxId || '',
    skills: initialData.skills || [],
    portfolio: initialData.portfolio || [],
    experienceYears: initialData.experienceYears || '',
    ...initialData,
  });
  
  const [verificationState, setVerificationState] = useState({
    status: VERIFICATION_STATUS.PENDING,
    currentStep: 0,
    totalSteps: getTotalSteps(),
    attempts: 0,
    lastAttempt: null,
    expiryTime: null,
    verificationId: null,
    level: verificationLevel,
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [retryDelay, setRetryDelay] = useState(0);
  
  // Refs
  const scrollViewRef = useRef(null);
  const codeInputRef = useRef(null);
  const timerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Initialize verification
  useEffect(() => {
    initializeVerification();
    setupAppStateListener();
    
    return () => {
      cleanupTimers();
      cleanupAppStateListener();
    };
  }, [verificationType, userRole]);

  // Auto-start verification
  useEffect(() => {
    if (autoStart && verificationState.status === VERIFICATION_STATUS.PENDING) {
      startVerification();
    }
  }, [autoStart, verificationState.status]);

  // Handle retry delay countdown
  useEffect(() => {
    if (retryDelay > 0) {
      const timer = setInterval(() => {
        setRetryDelay(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      timerRef.current = timer;
      return () => clearInterval(timer);
    }
  }, [retryDelay]);

  // Helper Methods
  const getDefaultDocumentType = () => {
    if (userRole === USER_ROLES.SERVICE_PROVIDER && verificationType === VERIFICATION_TYPES.BUSINESS) {
      return DOCUMENT_TYPES.BUSINESS_LICENSE;
    }
    if (verificationType === VERIFICATION_TYPES.IDENTITY) {
      return DOCUMENT_TYPES.ID_CARD;
    }
    return DOCUMENT_TYPES.ID_CARD;
  };

  const getTotalSteps = useCallback(() => {
    const baseSteps = {
      [VERIFICATION_TYPES.EMAIL]: 1,
      [VERIFICATION_TYPES.PHONE]: 1,
      [VERIFICATION_TYPES.IDENTITY]: userRole === USER_ROLES.SERVICE_PROVIDER ? 4 : 3,
      [VERIFICATION_TYPES.ADDRESS]: 2,
      [VERIFICATION_TYPES.BACKGROUND]: 2,
      [VERIFICATION_TYPES.SKILLS]: 3,
      [VERIFICATION_TYPES.BUSINESS]: 4,
      [VERIFICATION_TYPES.GOVERNMENT]: 3,
      [VERIFICATION_TYPES.COMPREHENSIVE]: 6,
    };
    
    return baseSteps[verificationType] || 1;
  }, [verificationType, userRole]);

  const initializeVerification = async () => {
    try {
      const savedState = await storage.getItem(`verification_${verificationType}_${user?.id}`);
      if (savedState) {
        setVerificationState(savedState);
      }

      const totalSteps = getTotalSteps();
      setVerificationState(prev => ({
        ...prev,
        totalSteps,
      }));

      animateFormIn();

      analyticsService.trackEvent('verification_initialized', {
        verificationType,
        userRole,
        verificationLevel,
        totalSteps,
        userId: user?.id,
      });

    } catch (error) {
      console.error('Error initializing verification:', error);
      handleError(error, 'VerificationInitialization');
    }
  };

  const animateFormIn = () => {
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

  const shakeForm = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const setupAppStateListener = () => {
    AppState.addEventListener('change', handleAppStateChange);
  };

  const cleanupAppStateListener = () => {
    AppState.removeEventListener('change', handleAppStateChange);
  };

  const handleAppStateChange = (nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      checkVerificationExpiry();
    }
    appStateRef.current = nextAppState;
  };

  const cleanupTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const startVerification = async () => {
    try {
      setVerificationState(prev => ({
        ...prev,
        status: VERIFICATION_STATUS.IN_PROGRESS,
      }));

      let result;

      switch (verificationType) {
        case VERIFICATION_TYPES.EMAIL:
          result = await verificationService.sendEmailVerification(user.email, userRole);
          break;
        case VERIFICATION_TYPES.PHONE:
          result = await verificationService.sendPhoneVerification(user.phone, userRole);
          break;
        case VERIFICATION_TYPES.IDENTITY:
          result = await verificationService.initiateIdentityVerification(user.id, userRole, verificationLevel);
          break;
        case VERIFICATION_TYPES.BUSINESS:
          result = await verificationService.initiateBusinessVerification(user.id, formData);
          break;
        case VERIFICATION_TYPES.SKILLS:
          result = await verificationService.initiateSkillsVerification(user.id, formData.skills);
          break;
        default:
          result = await verificationService.initiateGenericVerification(verificationType, user.id, userRole);
      }

      if (result.success) {
        setVerificationState(prev => ({
          ...prev,
          verificationId: result.verificationId,
          expiryTime: Date.now() + (codeExpiry * 1000),
        }));

        await storage.setItem(`verification_${verificationType}_${user.id}`, {
          ...verificationState,
          verificationId: result.verificationId,
          expiryTime: Date.now() + (codeExpiry * 1000),
        });

        showSuccessToast(`Verification code sent to your ${verificationType}`);

        analyticsService.trackEvent('verification_started', {
          verificationType,
          userRole,
          verificationLevel,
          verificationId: result.verificationId,
          userId: user.id,
        });

      } else {
        throw new Error(result.message || 'Failed to start verification');
      }

    } catch (error) {
      console.error('Error starting verification:', error);
      handleVerificationError(error);
    }
  };

  const checkVerificationExpiry = () => {
    if (verificationState.expiryTime && Date.now() > verificationState.expiryTime) {
      setVerificationState(prev => ({
        ...prev,
        status: VERIFICATION_STATUS.EXPIRED,
      }));
      showErrorToast('Verification code has expired');
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }

    if (!touched[field]) {
      setTouched(prev => ({
        ...prev,
        [field]: true,
      }));
    }
  };

  const handleDocumentUpload = async (documentType, fileUri, metadata = {}) => {
    try {
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: 0,
      }));

      const uploadResult = await uploadService.uploadDocument(fileUri, {
        documentType,
        userId: user.id,
        verificationType,
        userRole,
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
        onProgress: (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [documentType]: progress,
          }));
        },
      });

      if (uploadResult.success) {
        updateField(documentType, uploadResult.url);
        showSuccessToast(`${getDocumentTypeName(documentType)} uploaded successfully`);

        analyticsService.trackEvent('verification_document_uploaded', {
          documentType,
          verificationType,
          userRole,
          fileSize: uploadResult.metadata?.fileSize,
          userId: user.id,
        });

      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }

    } catch (error) {
      console.error('Error uploading document:', error);
      showErrorToast(`Failed to upload ${getDocumentTypeName(documentType)}`);
      handleError(error, 'VerificationDocumentUpload');
    } finally {
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: undefined,
      }));
    }
  };

  const getDocumentTypeName = (documentType) => {
    const names = {
      [DOCUMENT_TYPES.ID_CARD]: 'ID Card',
      [DOCUMENT_TYPES.PASSPORT]: 'Passport',
      [DOCUMENT_TYPES.DRIVERS_LICENSE]: "Driver's License",
      [DOCUMENT_TYPES.PROOF_OF_ADDRESS]: 'Proof of Address',
      [DOCUMENT_TYPES.UTILITY_BILL]: 'Utility Bill',
      [DOCUMENT_TYPES.BANK_STATEMENT]: 'Bank Statement',
      [DOCUMENT_TYPES.BUSINESS_LICENSE]: 'Business License',
      [DOCUMENT_TYPES.TAX_CERTIFICATE]: 'Tax Certificate',
      [DOCUMENT_TYPES.SELFIE]: 'Selfie',
      [DOCUMENT_TYPES.PORTFOLIO]: 'Portfolio',
      [DOCUMENT_TYPES.OTHER]: 'Document',
    };
    
    return names[documentType] || 'Document';
  };

  const validateForm = () => {
    const newErrors = {};

    // Code validation
    if (verificationState.currentStep === 0 && 
        (verificationType === VERIFICATION_TYPES.EMAIL || verificationType === VERIFICATION_TYPES.PHONE)) {
      if (!formData.code.trim()) {
        newErrors.code = 'Verification code is required';
      } else if (formData.code.length !== 6) {
        newErrors.code = 'Code must be 6 characters';
      }
    }

    // Role-specific validations
    if (userRole === USER_ROLES.SERVICE_PROVIDER) {
      if (verificationType === VERIFICATION_TYPES.BUSINESS && verificationState.currentStep === 0) {
        if (!formData.businessName.trim()) {
          newErrors.businessName = 'Business name is required';
        }
        if (!formData.taxId.trim()) {
          newErrors.taxId = 'Tax ID is required';
        }
      }
      
      if (verificationType === VERIFICATION_TYPES.SKILLS && verificationState.currentStep === 1) {
        if (!formData.skills.length) {
          newErrors.skills = 'At least one skill is required';
        }
      }
    }

    // Identity verification
    if (verificationType === VERIFICATION_TYPES.IDENTITY && verificationState.currentStep === 0) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      } else if (!validators.isValidEthiopianAge(formData.dateOfBirth)) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }

    // Document validations
    if (requiresDocumentUpload() && verificationState.currentStep === getDocumentStepIndex()) {
      if (!formData.documentFront) {
        newErrors.documentFront = `${getDocumentTypeName(formData.documentType)} front is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkRateLimit = () => {
    if (!enableRateLimiting) return true;

    const now = Date.now();
    const timeSinceLastAttempt = now - (verificationState.lastAttempt || 0);
    const backoffTime = Math.min(1000 * Math.pow(2, verificationState.attempts), 30000);
    
    if (timeSinceLastAttempt < backoffTime) {
      setErrors({ 
        general: `Please wait ${Math.ceil((backoffTime - timeSinceLastAttempt) / 1000)} seconds before trying again` 
      });
      return false;
    }

    if (verificationState.attempts >= maxAttempts) {
      setErrors({ 
        general: 'Maximum verification attempts reached. Please contact support.' 
      });
      setRetryDelay(300);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!validateForm()) {
      shakeForm();
      return;
    }

    if (!checkRateLimit()) {
      return;
    }

    try {
      setIsSubmitting(true);
      showLoading('Verifying...');

      const submissionData = {
        verificationType,
        userRole,
        verificationLevel,
        userId: user.id,
        verificationId: verificationState.verificationId,
        code: formData.code,
        documents: {
          front: formData.documentFront,
          back: formData.documentBack,
          selfie: formData.selfie,
          businessLicense: formData.businessLicense,
        },
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
        },
        businessInfo: {
          name: formData.businessName,
          license: formData.businessLicense,
          taxId: formData.taxId,
        },
        skills: formData.skills,
        portfolio: formData.portfolio,
        address: formData.address,
        deviceInfo: {
          platform: Platform.OS,
          userAgent: navigator.userAgent,
        },
        metadata: {
          isPremium: verificationLevel === VERIFICATION_LEVELS.PREMIUM,
          userRole,
          timestamp: new Date().toISOString(),
        },
      };

      const result = await verificationService.submitVerification(submissionData);

      if (result.success) {
        await handleVerificationSuccess(result);
      } else {
        throw new Error(result.message || 'Verification failed');
      }

    } catch (error) {
      console.error('Verification error:', error);
      await handleVerificationError(error);
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  const handleVerificationSuccess = async (result) => {
    setVerificationState(prev => ({
      ...prev,
      status: VERIFICATION_STATUS.VERIFIED,
      attempts: 0,
    }));

    // Update user verification status
    await updateUser({
      verificationStatus: {
        ...user.verificationStatus,
        [verificationType]: {
          verified: true,
          level: verificationLevel,
          verifiedAt: new Date().toISOString(),
          verificationId: verificationState.verificationId,
        },
      },
    });

    await storage.removeItem(`verification_${verificationType}_${user.id}`);

    analyticsService.trackEvent('verification_completed', {
      verificationType,
      userRole,
      verificationLevel,
      verificationId: verificationState.verificationId,
      userId: user.id,
      attempts: verificationState.attempts + 1,
      isPremium: verificationLevel === VERIFICATION_LEVELS.PREMIUM,
    });

    if (verificationLevel === VERIFICATION_LEVELS.PREMIUM) {
      analyticsService.trackEvent('premium_verification_completed', {
        userId: user.id,
        verificationType,
        pointsAwarded: 50,
      });
    }

    onVerificationComplete?.({
      verificationType,
      verificationLevel,
      verificationId: verificationState.verificationId,
      result: result.data,
      timestamp: new Date().toISOString(),
      userRole,
    });

    setShowSuccessModal(true);
    showSuccessToast('Verification completed successfully');
  };

  const handleVerificationError = async (error) => {
    const newAttemptCount = verificationState.attempts + 1;
    
    setVerificationState(prev => ({
      ...prev,
      attempts: newAttemptCount,
      lastAttempt: Date.now(),
    }));

    await storage.setItem(`verification_${verificationType}_${user.id}`, {
      ...verificationState,
      attempts: newAttemptCount,
      lastAttempt: Date.now(),
    });

    let errorMessage = 'Verification failed';
    if (error.message.includes('invalid_code')) {
      errorMessage = 'Invalid verification code';
    } else if (error.message.includes('expired')) {
      errorMessage = 'Verification code has expired';
    } else if (error.message.includes('rate_limit')) {
      errorMessage = 'Too many attempts. Please try again later.';
    }

    setErrors({ general: errorMessage });
    onVerificationFailed?.(error, newAttemptCount);

    if (newAttemptCount < maxAttempts) {
      const delay = Math.min(30 * newAttemptCount, 300);
      setRetryDelay(delay);
    }

    analyticsService.trackEvent('verification_failed', {
      verificationType,
      error: error.message,
      attemptCount: newAttemptCount,
      userId: user.id,
    });

    handleError(error, 'VerificationSubmission');
  };

  const handleError = (error, context) => {
    errorService.captureError(error, {
      context,
      verificationType,
      userRole,
      userId: user?.id,
    });
  };

  const handleResendCode = async () => {
    if (retryDelay > 0) return;

    try {
      showLoading('Sending new code...');

      const result = await verificationService.resendVerificationCode(
        verificationState.verificationId
      );

      if (result.success) {
        setVerificationState(prev => ({
          ...prev,
          expiryTime: Date.now() + (codeExpiry * 1000),
        }));

        showSuccessToast('New verification code sent');
        
        analyticsService.trackEvent('verification_code_resent', {
          verificationType,
          verificationId: verificationState.verificationId,
          userId: user.id,
        });

      } else {
        throw new Error(result.message || 'Failed to resend code');
      }

    } catch (error) {
      console.error('Error resending code:', error);
      showErrorToast('Failed to resend verification code');
    } finally {
      hideLoading();
    }
  };

  const handleStepChange = (newStep) => {
    if (newStep >= 0 && newStep < verificationState.totalSteps) {
      setVerificationState(prev => ({
        ...prev,
        currentStep: newStep,
      }));
      
      onStepChange?.(newStep, verificationState.totalSteps);
    }
  };

  const handleCodeComplete = (code) => {
    updateField('code', code);
    
    if (verificationType === VERIFICATION_TYPES.EMAIL || verificationType === VERIFICATION_TYPES.PHONE) {
      setTimeout(() => {
        handleSubmit();
      }, 500);
    }
  };

  // Render Methods
  const renderCodeInput = () => (
    <View style={styles.codeSection}>
      <VerificationCodeInput
        ref={codeInputRef}
        length={6}
        onCodeChange={(code) => updateField('code', code)}
        onCodeComplete={handleCodeComplete}
        autoFocus={true}
        error={errors.code}
        style={codeInputStyle}
        theme={theme}
      />
      
      {enableResend && (
        <View style={styles.resendSection}>
          <Button
            title={retryDelay > 0 ? `Resend in ${retryDelay}s` : resendButtonText}
            onPress={handleResendCode}
            type="link"
            disabled={retryDelay > 0}
            theme={theme}
          />
        </View>
      )}
    </View>
  );

  const renderDocumentUpload = () => (
    <DocumentUpload
      documentType={formData.documentType}
      onDocumentTypeChange={(type) => updateField('documentType', type)}
      onDocumentUpload={handleDocumentUpload}
      uploadProgress={uploadProgress}
      allowedDocumentTypes={getAllowedDocumentTypes()}
      maxFileSize={10 * 1024 * 1024}
      style={documentStyle}
      theme={theme}
    />
  );

  const getAllowedDocumentTypes = () => {
    const typeMap = {
      [VERIFICATION_TYPES.IDENTITY]: [
        DOCUMENT_TYPES.ID_CARD,
        DOCUMENT_TYPES.PASSPORT,
        DOCUMENT_TYPES.DRIVERS_LICENSE,
      ],
      [VERIFICATION_TYPES.ADDRESS]: [
        DOCUMENT_TYPES.UTILITY_BILL,
        DOCUMENT_TYPES.BANK_STATEMENT,
        DOCUMENT_TYPES.PROOF_OF_ADDRESS,
      ],
      [VERIFICATION_TYPES.BUSINESS]: [
        DOCUMENT_TYPES.BUSINESS_LICENSE,
        DOCUMENT_TYPES.TAX_CERTIFICATE,
        DOCUMENT_TYPES.OTHER,
      ],
      [VERIFICATION_TYPES.GOVERNMENT]: [
        DOCUMENT_TYPES.ID_CARD,
        DOCUMENT_TYPES.PASSPORT,
        DOCUMENT_TYPES.OTHER,
      ],
    };
    
    return typeMap[verificationType] || Object.values(DOCUMENT_TYPES);
  };

  const renderPersonalInfo = () => (
    <View style={styles.personalInfoSection}>
      <Input
        label="First Name"
        placeholder="Enter your first name"
        value={formData.firstName}
        onChangeText={(value) => updateField('firstName', value)}
        error={errors.firstName}
        touched={touched.firstName}
        autoComplete="name-given"
        theme={theme}
      />
      
      <Input
        label="Last Name"
        placeholder="Enter your last name"
        value={formData.lastName}
        onChangeText={(value) => updateField('lastName', value)}
        error={errors.lastName}
        touched={touched.lastName}
        autoComplete="name-family"
        theme={theme}
      />
      
      <Input
        label="Date of Birth"
        placeholder="YYYY-MM-DD"
        value={formData.dateOfBirth}
        onChangeText={(value) => updateField('dateOfBirth', value)}
        error={errors.dateOfBirth}
        touched={touched.dateOfBirth}
        keyboardType="numbers-and-punctuation"
        theme={theme}
      />
    </View>
  );

  const renderSkillsSelection = () => (
    <View style={styles.skillsSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Select Your Skills
      </Text>
      <SkillTags
        selectedSkills={formData.skills}
        onSkillsChange={(skills) => updateField('skills', skills)}
        maxSkills={10}
        theme={theme}
      />
      {errors.skills && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {errors.skills}
        </Text>
      )}
    </View>
  );

  const renderPortfolioUpload = () => (
    <View style={styles.portfolioSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Upload Your Portfolio
      </Text>
      <PortfolioGrid
        portfolioItems={formData.portfolio}
        onPortfolioChange={(portfolio) => updateField('portfolio', portfolio)}
        maxItems={20}
        theme={theme}
      />
    </View>
  );

  const renderExperienceInfo = () => (
    <View style={styles.experienceSection}>
      <Input
        label="Years of Experience"
        placeholder="Enter years of experience"
        value={formData.experienceYears}
        onChangeText={(value) => updateField('experienceYears', value)}
        keyboardType="numeric"
        theme={theme}
      />
      <Input
        label="Specialization"
        placeholder="Your main specialization"
        value={formData.specialization}
        onChangeText={(value) => updateField('specialization', value)}
        theme={theme}
      />
    </View>
  );

  const renderBusinessAddress = () => (
    <View style={styles.addressSection}>
      <Input
        label="Business Address"
        placeholder="Enter business address"
        value={formData.address}
        onChangeText={(value) => updateField('address', value)}
        multiline
        numberOfLines={3}
        theme={theme}
      />
      <Input
        label="City"
        placeholder="Enter city"
        value={formData.city}
        onChangeText={(value) => updateField('city', value)}
        theme={theme}
      />
      <Input
        label="Region"
        placeholder="Enter region"
        value={formData.region}
        onChangeText={(value) => updateField('region', value)}
        theme={theme}
      />
    </View>
  );

  const renderAdditionalBusinessDocs = () => (
    <View style={styles.additionalDocsSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Additional Business Documents
      </Text>
      <DocumentUpload
        documentType={DOCUMENT_TYPES.TAX_CERTIFICATE}
        onDocumentUpload={(type, uri) => handleDocumentUpload(DOCUMENT_TYPES.TAX_CERTIFICATE, uri)}
        uploadProgress={uploadProgress}
        allowedDocumentTypes={[DOCUMENT_TYPES.TAX_CERTIFICATE]}
        title="Tax Certificate"
        subtitle="Upload your tax registration certificate"
        theme={theme}
      />
    </View>
  );

  const renderStepContent = () => {
    switch (verificationType) {
      case VERIFICATION_TYPES.EMAIL:
      case VERIFICATION_TYPES.PHONE:
        return renderCodeInput();
      case VERIFICATION_TYPES.IDENTITY:
        return renderIdentityVerificationSteps();
      case VERIFICATION_TYPES.BUSINESS:
        return renderBusinessVerificationSteps();
      case VERIFICATION_TYPES.SKILLS:
        return renderSkillsVerificationSteps();
      case VERIFICATION_TYPES.ADDRESS:
        return renderAddressVerificationSteps();
      default:
        return renderGenericVerificationSteps();
    }
  };

  const renderIdentityVerificationSteps = () => {
    switch (verificationState.currentStep) {
      case 0: return renderPersonalInfo();
      case 1: return renderDocumentUpload();
      case 2: return (
        <DocumentUpload
          documentType={DOCUMENT_TYPES.SELFIE}
          onDocumentUpload={(type, uri) => handleDocumentUpload(DOCUMENT_TYPES.SELFIE, uri)}
          uploadProgress={uploadProgress}
          allowedDocumentTypes={[DOCUMENT_TYPES.SELFIE]}
          title="Take a Selfie"
          subtitle="Please take a clear selfie for identity verification"
          theme={theme}
        />
      );
      case 3: return userRole === USER_ROLES.SERVICE_PROVIDER ? renderPortfolioUpload() : null;
      default: return null;
    }
  };

  const renderBusinessVerificationSteps = () => {
    switch (verificationState.currentStep) {
      case 0: return (
        <View style={styles.businessInfoSection}>
          <Input
            label="Business Name"
            placeholder="Enter your business name"
            value={formData.businessName}
            onChangeText={(value) => updateField('businessName', value)}
            error={errors.businessName}
            touched={touched.businessName}
            theme={theme}
          />
          <Input
            label="Tax Identification Number"
            placeholder="Enter TIN"
            value={formData.taxId}
            onChangeText={(value) => updateField('taxId', value)}
            error={errors.taxId}
            touched={touched.taxId}
            theme={theme}
          />
        </View>
      );
      case 1: return renderDocumentUpload();
      case 2: return renderBusinessAddress();
      case 3: return renderAdditionalBusinessDocs();
      default: return null;
    }
  };

  const renderSkillsVerificationSteps = () => {
    switch (verificationState.currentStep) {
      case 0: return renderSkillsSelection();
      case 1: return renderPortfolioUpload();
      case 2: return renderExperienceInfo();
      default: return null;
    }
  };

  const renderAddressVerificationSteps = () => {
    switch (verificationState.currentStep) {
      case 0: return renderBusinessAddress();
      case 1: return renderDocumentUpload();
      default: return null;
    }
  };

  const renderGenericVerificationSteps = () => renderCodeInput();

  const renderNavigationButtons = () => {
    const isFirstStep = verificationState.currentStep === 0;
    const isLastStep = verificationState.currentStep === verificationState.totalSteps - 1;

    return (
      <View style={styles.navigationButtons}>
        {!isFirstStep && (
          <Button
            title="Back"
            onPress={() => handleStepChange(verificationState.currentStep - 1)}
            type="outline"
            style={styles.backButton}
            theme={theme}
          />
        )}
        
        <Button
          title={isLastStep ? (submitButtonText || 'Complete Verification') : 'Continue'}
          onPress={isLastStep ? handleSubmit : () => handleStepChange(verificationState.currentStep + 1)}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.continueButton}
          theme={theme}
        />
      </View>
    );
  };

  const renderSuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      onDismiss={() => setShowSuccessModal(false)}
      type="center"
      showCloseButton={false}
    >
      <View style={styles.successModal}>
        <Text style={[styles.successIcon, { color: theme.colors.success }]}>
          ✅
        </Text>
        <Text style={[styles.successTitle, { color: theme.colors.text }]}>
          Verification Complete!
        </Text>
        <Text style={[styles.successMessage, { color: theme.colors.textSecondary }]}>
          Your {getVerificationTitle().toLowerCase()} has been successfully verified.
        </Text>
        <Button
          title="Continue"
          onPress={() => setShowSuccessModal(false)}
          style={styles.successButton}
          theme={theme}
        />
      </View>
    </Modal>
  );

  const requiresDocumentUpload = () => {
    return [
      VERIFICATION_TYPES.IDENTITY,
      VERIFICATION_TYPES.BUSINESS,
      VERIFICATION_TYPES.ADDRESS,
      VERIFICATION_TYPES.GOVERNMENT,
    ].includes(verificationType);
  };

  const getDocumentStepIndex = () => {
    const stepMap = {
      [VERIFICATION_TYPES.IDENTITY]: 1,
      [VERIFICATION_TYPES.BUSINESS]: 1,
      [VERIFICATION_TYPES.ADDRESS]: 1,
      [VERIFICATION_TYPES.GOVERNMENT]: 1,
    };
    return stepMap[verificationType] || 1;
  };

  const getProgressSteps = () => {
    const stepMap = {
      [VERIFICATION_TYPES.IDENTITY]: 
        userRole === USER_ROLES.SERVICE_PROVIDER 
          ? ['Personal Info', 'ID Document', 'Selfie', 'Portfolio']
          : ['Personal Info', 'ID Document', 'Selfie'],
      [VERIFICATION_TYPES.BUSINESS]: ['Business Info', 'Documents', 'Address', 'Additional Docs'],
      [VERIFICATION_TYPES.SKILLS]: ['Skills', 'Portfolio', 'Experience'],
      [VERIFICATION_TYPES.ADDRESS]: ['Address Info', 'Proof Document'],
      [VERIFICATION_TYPES.COMPREHENSIVE]: ['Personal Info', 'ID Verification', 'Address', 'Background', 'Skills', 'Final'],
    };
    
    return stepMap[verificationType] || ['Verification'];
  };

  const getVerificationTitle = () => {
    if (verificationTitle) return verificationTitle;
    
    const titles = {
      [VERIFICATION_TYPES.EMAIL]: 'Email Verification',
      [VERIFICATION_TYPES.PHONE]: 'Phone Verification',
      [VERIFICATION_TYPES.IDENTITY]: 'Identity Verification',
      [VERIFICATION_TYPES.ADDRESS]: 'Address Verification',
      [VERIFICATION_TYPES.BACKGROUND]: 'Background Check',
      [VERIFICATION_TYPES.SKILLS]: 'Skills Verification',
      [VERIFICATION_TYPES.BUSINESS]: 'Business Verification',
      [VERIFICATION_TYPES.GOVERNMENT]: 'Government Verification',
      [VERIFICATION_TYPES.COMPREHENSIVE]: 'Comprehensive Verification',
    };
    
    return titles[verificationType] || 'Verification';
  };

  const getVerificationSubtitle = () => {
    if (verificationSubtitle) return verificationSubtitle;
    
    const subtitles = {
      [VERIFICATION_TYPES.EMAIL]: 'Enter the 6-digit code sent to your email address',
      [VERIFICATION_TYPES.PHONE]: 'Enter the 6-digit code sent to your phone',
      [VERIFICATION_TYPES.IDENTITY]: 'Verify your identity with government-issued ID',
      [VERIFICATION_TYPES.BUSINESS]: 'Verify your business registration and documents',
      [VERIFICATION_TYPES.SKILLS]: 'Verify your professional skills and experience',
      [VERIFICATION_TYPES.GOVERNMENT]: 'Government official verification process',
    };
    
    return subtitles[verificationType] || 'Complete the verification process';
  };

  const showSuccessToast = (message) => {
    // Implementation depends on your Toast component
    console.log('Success:', message);
  };

  const showErrorToast = (message) => {
    // Implementation depends on your Toast component
    console.error('Error:', message);
  };

  if (isSubmitting) {
    return <Loading message="Processing verification..." />;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { translateX: shakeAnim },
          ],
        },
        style,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {enableProgressTracking && verificationState.totalSteps > 1 && (
          <ProgressIndicator
            currentStep={verificationState.currentStep + 1}
            totalSteps={verificationState.totalSteps}
            steps={getProgressSteps()}
            theme={theme}
          />
        )}

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {getVerificationTitle()}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {getVerificationSubtitle()}
          </Text>
          {verificationLevel === VERIFICATION_LEVELS.PREMIUM && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Premium Verification</Text>
            </View>
          )}
        </View>

        <View style={[styles.form, formStyle]}>
          {renderStepContent()}
          
          {errors.general && (
            <Text style={[styles.generalError, { color: theme.colors.error }]}>
              {errors.general}
            </Text>
          )}

          {renderNavigationButtons()}
        </View>
      </ScrollView>

      {renderSuccessModal()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  codeSection: {
    gap: 16,
  },
  resendSection: {
    alignItems: 'center',
  },
  personalInfoSection: {
    gap: 16,
  },
  businessInfoSection: {
    gap: 16,
  },
  skillsSection: {
    gap: 16,
  },
  portfolioSection: {
    gap: 16,
  },
  experienceSection: {
    gap: 16,
  },
  addressSection: {
    gap: 16,
  },
  additionalDocsSection: {
    gap: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  generalError: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  successModal: {
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successButton: {
    width: '100%',
  },
});

// Export constants and hooks
VerificationForm.Types = VERIFICATION_TYPES;
VerificationForm.Status = VERIFICATION_STATUS;
VerificationForm.Documents = DOCUMENT_TYPES;
VerificationForm.UserRoles = USER_ROLES;
VerificationForm.Levels = VERIFICATION_LEVELS;

export const useVerification = (verificationType, options = {}) => {
  const [state, setState] = useState({
    status: VERIFICATION_STATUS.PENDING,
    attempts: 0,
    verificationId: null,
    error: null,
  });

  const startVerification = useCallback(async (contactInfo) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const result = await verificationService.startVerification(
        verificationType,
        contactInfo
      );
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          status: VERIFICATION_STATUS.IN_PROGRESS,
          verificationId: result.verificationId,
        }));
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  }, [verificationType]);

  const submitVerification = useCallback(async (code, additionalData = {}) => {
    try {
      const result = await verificationService.submitVerificationCode(
        state.verificationId,
        code,
        additionalData
      );
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          status: VERIFICATION_STATUS.VERIFIED,
        }));
        
        return result;
      } else {
        setState(prev => ({
          ...prev,
          attempts: prev.attempts + 1,
          error: result.message,
        }));
        throw new Error(result.message);
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  }, [state.verificationId]);

  return {
    ...state,
    startVerification,
    submitVerification,
  };
};

export default VerificationForm;