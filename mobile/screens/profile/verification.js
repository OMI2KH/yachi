import React, { useState, useContext, useRef } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemeContext } from '../../../contexts/theme-context';
import { AuthContext } from '../../../contexts/auth-context';
import { UserContext } from '../../../contexts/user-context';
import { PaymentContext } from '../../../contexts/payment-context';
import { 
  VERIFICATION_LEVELS, 
  USER_ROLES, 
  VERIFICATION_STATUS 
} from '../../../constants/user';
import { 
  validateEthiopianPhone, 
  validateEthiopianID,
  validateBusinessLicense 
} from '../../../utils/validators';
import { 
  formatEthiopianDate,
  formatCurrency 
} from '../../../utils/formatters';
import { 
  uploadVerificationDocument,
  verifyUserIdentity 
} from '../../../services/user-service';
import { 
  processPremiumVerification 
} from '../../../services/payment-service';
import { 
  triggerVerificationNotification 
} from '../../../services/notification-service';

// Components
import ThemedView from '../../../components/themed-view';
import ThemedText from '../../../components/themed-text';
import Button from '../../../components/ui/button';
import Input from '../../../components/ui/input';
import Card from '../../../components/ui/card';
import Loading from '../../../components/ui/loading';
import VerificationBadge from '../../../components/profile/verification-badge';
import ConfirmationModal from '../../../components/ui/confirmation-modal';
import PaymentModal from '../../../components/payment/payment-modal';

const VerificationScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Context
  const { theme, colors } = useContext(ThemeContext);
  const { user: authUser, updateUserProfile } = useContext(AuthContext);
  const { 
    user, 
    verification, 
    updateVerification,
    refreshUserData 
  } = useContext(UserContext);
  const { processPayment } = useContext(PaymentContext);

  // State
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [documents, setDocuments] = useState({
    idFront: null,
    idBack: null,
    selfie: null,
    businessLicense: null,
    portfolio: null,
  });
  const [formData, setFormData] = useState({
    phoneNumber: user?.phoneNumber || '',
    idNumber: '',
    businessLicenseNumber: '',
    taxPayerTin: '',
    yearsOfExperience: '',
    specialization: '',
    companyName: '',
    companySize: '',
  });
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [verificationType, setVerificationType] = useState('basic');

  // Refs
  const scrollViewRef = useRef();

  // Verification steps based on user role
  const getVerificationSteps = () => {
    const baseSteps = [
      {
        id: 'personal_info',
        title: 'Personal Information',
        description: 'Verify your identity with government ID',
        required: true,
        level: VERIFICATION_LEVELS.BASIC,
      },
      {
        id: 'phone_verification',
        title: 'Phone Verification',
        description: 'Confirm your Ethiopian phone number',
        required: true,
        level: VERIFICATION_LEVELS.BASIC,
      },
    ];

    if (user?.role === USER_ROLES.SERVICE_PROVIDER || user?.role === USER_ROLES.WORKER) {
      baseSteps.push(
        {
          id: 'professional_info',
          title: 'Professional Details',
          description: 'Add your work experience and skills',
          required: true,
          level: VERIFICATION_LEVELS.PROFESSIONAL,
        },
        {
          id: 'portfolio',
          title: 'Portfolio Upload',
          description: 'Showcase your previous work',
          required: false,
          level: VERIFICATION_LEVELS.PROFESSIONAL,
        }
      );
    }

    if (user?.role === USER_ROLES.BUSINESS) {
      baseSteps.push(
        {
          id: 'business_info',
          title: 'Business Registration',
          description: 'Upload business license and documents',
          required: true,
          level: VERIFICATION_LEVELS.BUSINESS,
        },
        {
          id: 'tax_info',
          title: 'Tax Information',
          description: 'Add TIN and tax payer information',
          required: true,
          level: VERIFICATION_LEVELS.BUSINESS,
        }
      );
    }

    if (user?.role === USER_ROLES.GOVERNMENT) {
      baseSteps.push(
        {
          id: 'government_id',
          title: 'Government ID',
          description: 'Upload government employee identification',
          required: true,
          level: VERIFICATION_LEVELS.GOVERNMENT,
        },
        {
          id: 'department_info',
          title: 'Department Information',
          description: 'Specify your government department and role',
          required: true,
          level: VERIFICATION_LEVELS.GOVERNMENT,
        }
      );
    }

    // Premium verification option
    baseSteps.push({
      id: 'premium_verification',
      title: 'Premium Verification',
      description: 'Get verified badge and priority status',
      required: false,
      level: VERIFICATION_LEVELS.PREMIUM,
      premium: true,
    });

    return baseSteps;
  };

  const steps = getVerificationSteps();

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

  // Handle document upload
  const handleDocumentUpload = async (documentType, file) => {
    try {
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: 0,
      }));

      const uploadedFile = await uploadVerificationDocument(
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

      setDocuments(prev => ({
        ...prev,
        [documentType]: uploadedFile,
      }));

      return uploadedFile;
    } catch (error) {
      Alert.alert('Upload Failed', `Failed to upload ${documentType}: ${error.message}`);
      throw error;
    }
  };

  // Validate current step
  const validateStep = (stepId) => {
    const newErrors = {};

    switch (stepId) {
      case 'personal_info':
        if (!formData.idNumber) {
          newErrors.idNumber = 'ID number is required';
        } else if (!validateEthiopianID(formData.idNumber)) {
          newErrors.idNumber = 'Please enter a valid Ethiopian ID number';
        }
        if (!documents.idFront) {
          newErrors.idFront = 'ID front photo is required';
        }
        if (!documents.idBack) {
          newErrors.idBack = 'ID back photo is required';
        }
        if (!documents.selfie) {
          newErrors.selfie = 'Selfie with ID is required';
        }
        break;

      case 'phone_verification':
        if (!formData.phoneNumber) {
          newErrors.phoneNumber = 'Phone number is required';
        } else if (!validateEthiopianPhone(formData.phoneNumber)) {
          newErrors.phoneNumber = 'Please enter a valid Ethiopian phone number';
        }
        break;

      case 'professional_info':
        if (!formData.yearsOfExperience) {
          newErrors.yearsOfExperience = 'Years of experience is required';
        }
        if (!formData.specialization) {
          newErrors.specialization = 'Specialization is required';
        }
        break;

      case 'business_info':
        if (!formData.businessLicenseNumber) {
          newErrors.businessLicenseNumber = 'Business license number is required';
        } else if (!validateBusinessLicense(formData.businessLicenseNumber)) {
          newErrors.businessLicenseNumber = 'Please enter a valid business license number';
        }
        if (!formData.companyName) {
          newErrors.companyName = 'Company name is required';
        }
        if (!documents.businessLicense) {
          newErrors.businessLicense = 'Business license document is required';
        }
        break;

      case 'tax_info':
        if (!formData.taxPayerTin) {
          newErrors.taxPayerTin = 'TIN number is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle step submission
  const handleStepSubmit = async () => {
    const currentStep = steps[activeStep];
    
    if (!validateStep(currentStep.id)) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setLoading(true);

    try {
      // Update verification progress
      const updatedVerification = {
        ...verification,
        completedSteps: [...(verification.completedSteps || []), currentStep.id],
        currentLevel: currentStep.level,
        lastUpdated: new Date().toISOString(),
      };

      await updateVerification(updatedVerification);

      // Process specific step actions
      switch (currentStep.id) {
        case 'phone_verification':
          await verifyUserIdentity(user.id, {
            phoneNumber: formData.phoneNumber,
          });
          break;

        case 'premium_verification':
          setVerificationType('premium');
          setShowPaymentModal(true);
          setLoading(false);
          return;
      }

      // Move to next step or complete
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        await completeVerification();
      }
    } catch (error) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Process premium verification payment
  const handlePremiumVerification = async (paymentMethod) => {
    try {
      setLoading(true);
      
      const paymentResult = await processPremiumVerification({
        userId: user.id,
        paymentMethod,
        amount: 200, // 200 ETB for premium badge
        type: 'premium_verification',
      });

      if (paymentResult.success) {
        await processPayment('premium_verification', {
          userId: user.id,
          amount: 200,
          paymentMethod,
          transactionId: paymentResult.transactionId,
        });

        setShowPaymentModal(false);
        await completeVerification(true);
      }
    } catch (error) {
      Alert.alert('Payment Failed', error.message);
      setLoading(false);
    }
  };

  // Complete verification process
  const completeVerification = async (isPremium = false) => {
    try {
      const finalVerification = {
        ...verification,
        status: VERIFICATION_STATUS.VERIFIED,
        verifiedAt: new Date().toISOString(),
        level: isPremium ? VERIFICATION_LEVELS.PREMIUM : verification.currentLevel,
        isPremium: isPremium,
      };

      await updateVerification(finalVerification);
      
      // Update user profile with verification data
      await updateUserProfile({
        ...formData,
        isVerified: true,
        verificationLevel: finalVerification.level,
      });

      // Refresh user data
      await refreshUserData();

      // Send notification
      await triggerVerificationNotification(user.id, isPremium);

      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Completion Failed', error.message);
    }
  };

  // Render step content based on current step
  const renderStepContent = () => {
    const currentStep = steps[activeStep];

    switch (currentStep.id) {
      case 'personal_info':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Government ID Verification</ThemedText>
            
            <Input
              label="Ethiopian ID Number"
              value={formData.idNumber}
              onChangeText={(text) => handleInputChange('idNumber', text)}
              placeholder="Enter your ID number"
              error={errors.idNumber}
              keyboardType="numeric"
            />

            <Card>
              <ThemedText type="defaultSemiBold">Required Documents</ThemedText>
              <ThemedText type="secondary" style={{ marginTop: 8 }}>
                Please upload clear photos of the following:
              </ThemedText>
              
              <View style={{ marginTop: 16, gap: 12 }}>
                <DocumentUpload
                  title="ID Front Side"
                  document={documents.idFront}
                  onUpload={(file) => handleDocumentUpload('idFront', file)}
                  progress={uploadProgress.idFront}
                  error={errors.idFront}
                />
                
                <DocumentUpload
                  title="ID Back Side"
                  document={documents.idBack}
                  onUpload={(file) => handleDocumentUpload('idBack', file)}
                  progress={uploadProgress.idBack}
                  error={errors.idBack}
                />
                
                <DocumentUpload
                  title="Selfie with ID"
                  document={documents.selfie}
                  onUpload={(file) => handleDocumentUpload('selfie', file)}
                  progress={uploadProgress.selfie}
                  error={errors.selfie}
                  description="Take a selfie holding your ID next to your face"
                />
              </View>
            </Card>
          </View>
        );

      case 'phone_verification':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Phone Number Verification</ThemedText>
            
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              placeholder="+251 XXX XXX XXX"
              error={errors.phoneNumber}
              keyboardType="phone-pad"
            />

            <Card>
              <ThemedText type="defaultSemiBold">Verification Process</ThemedText>
              <ThemedText type="secondary" style={{ marginTop: 8 }}>
                We will send a verification code to your phone number to confirm it belongs to you.
              </ThemedText>
            </Card>
          </View>
        );

      case 'professional_info':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Professional Information</ThemedText>
            
            <Input
              label="Years of Experience"
              value={formData.yearsOfExperience}
              onChangeText={(text) => handleInputChange('yearsOfExperience', text)}
              placeholder="Enter years of experience"
              error={errors.yearsOfExperience}
              keyboardType="numeric"
            />

            <Input
              label="Specialization"
              value={formData.specialization}
              onChangeText={(text) => handleInputChange('specialization', text)}
              placeholder="Your main service category"
              error={errors.specialization}
            />

            <Input
              label="Skills & Expertise"
              value={formData.skills}
              onChangeText={(text) => handleInputChange('skills', text)}
              placeholder="List your key skills separated by commas"
              multiline
              numberOfLines={3}
            />
          </View>
        );

      case 'premium_verification':
        return (
          <View style={{ gap: 16 }}>
            <ThemedText type="subtitle">Premium Verification</ThemedText>
            
            <Card style={{ backgroundColor: colors.premium, borderColor: colors.premium }}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.white }}>
                Get Verified Badge - 200 ETB/month
              </ThemedText>
              
              <View style={{ marginTop: 12, gap: 8 }}>
                <VerificationBenefit 
                  text="Priority in search results" 
                  color={colors.white}
                />
                <VerificationBenefit 
                  text="Featured profile placement" 
                  color={colors.white}
                />
                <VerificationBenefit 
                  text="Verified status badge" 
                  color={colors.white}
                />
                <VerificationBenefit 
                  text="Enhanced visibility and trust" 
                  color={colors.white}
                />
                <VerificationBenefit 
                  text="Higher booking conversion" 
                  color={colors.white}
                />
              </View>
            </Card>

            <ThemedText type="secondary">
              Premium verification helps you stand out and get more clients. 
              The badge shows that you are a trusted professional on Yachi.
            </ThemedText>
          </View>
        );

      default:
        return (
          <View>
            <ThemedText>Step content for {currentStep.id}</ThemedText>
          </View>
        );
    }
  };

  // Progress calculation
  const progress = ((activeStep + 1) / steps.length) * 100;
  const currentStep = steps[activeStep];

  if (loading) {
    return <Loading message="Processing verification..." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ThemedText type="title">Account Verification</ThemedText>
        <ThemedText type="secondary">
          Step {activeStep + 1} of {steps.length}: {currentStep.title}
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
            width: `${progress}%`,
            borderRadius: 2,
          }} />
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
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
        <Button
          title={currentStep.premium ? "Get Premium Verification" : "Continue"}
          onPress={handleStepSubmit}
          variant={currentStep.premium ? "premium" : "primary"}
          size="large"
        />
        
        {activeStep > 0 && (
          <Button
            title="Back"
            onPress={() => setActiveStep(activeStep - 1)}
            variant="outline"
          />
        )}
      </View>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPayment={handlePremiumVerification}
        amount={200}
        description="Premium Verification Badge"
        paymentMethods={['chapa', 'telebirr', 'cbe-birr']}
      />

      {/* Success Modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        title="Verification Complete!"
        message="Your account has been successfully verified. You now have access to all platform features."
        confirmText="Continue to Dashboard"
        onConfirm={() => router.replace('/(tabs)/profile')}
        type="success"
      />
    </ThemedView>
  );
};

// Helper Components
const DocumentUpload = ({ 
  title, 
  document, 
  onUpload, 
  progress, 
  error, 
  description 
}) => {
  const { colors } = useContext(ThemeContext);
  
  const handleFileSelect = async () => {
    // Implementation for file selection
    // This would integrate with expo-image-picker or similar
  };

  return (
    <View style={{ gap: 8 }}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      
      {description && (
        <ThemedText type="secondary" style={{ fontSize: 12 }}>
          {description}
        </ThemedText>
      )}
      
      <Button
        title={document ? "Change Document" : "Upload Document"}
        onPress={handleFileSelect}
        variant={document ? "outline" : "primary"}
        size="small"
      />
      
      {progress !== undefined && progress < 100 && (
        <View style={{ 
          height: 4, 
          backgroundColor: colors.border, 
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <View style={{
            height: '100%',
            backgroundColor: colors.primary,
            width: `${progress}%`,
            borderRadius: 2,
          }} />
        </View>
      )}
      
      {error && (
        <ThemedText style={{ color: colors.error, fontSize: 12 }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
};

const VerificationBenefit = ({ text, color }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ThemedText style={{ color, fontSize: 14 }}>✓</ThemedText>
      <ThemedText style={{ color, fontSize: 14 }}>{text}</ThemedText>
    </View>
  );
};

export default VerificationScreen;