// app/(profile)/verification.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useLoading } from '../../../contexts/loading-context';
import { verificationService } from '../../../services/verification-service';
import { uploadService } from '../../../services/upload-service';
import { analyticsService } from '../../../services/analytics-service';
import { errorService } from '../../../services/error-service';
import { storage } from '../../../utils/storage';

// Components
import VerificationStatus from '../../../components/profile/verification/verification-status';
import DocumentUpload from '../../../components/profile/verification/document-upload';
import IdentityVerification from '../../../components/profile/verification/identity-verification';
import BackgroundCheck from '../../../components/profile/verification/background-check';
import SkillVerification from '../../../components/profile/verification/skill-verification';
import VerificationProgress from '../../../components/profile/verification/verification-progress';
import RequirementsList from '../../../components/profile/verification/requirements-list';
import HelpCard from '../../../components/profile/verification/help-card';
import LoadingScreen from '../../../components/ui/loading';
import ErrorScreen from '../../../components/ui/error-screen';
import RetryButton from '../../../components/ui/retry-button';
import Toast from '../../../components/ui/toast';
import ConfirmationModal from '../../../components/ui/confirmation-modal';

// Constants
import {
  VERIFICATION_STATUS,
  VERIFICATION_TYPES,
  DOCUMENT_TYPES,
  VERIFICATION_REQUIREMENTS
} from '../../../constants/verification';

const { width } = Dimensions.get('window');

export default function VerificationScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);

  // Refs
  const scrollViewRef = useRef();
  const mountedRef = useRef(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Initialize verification data
  useEffect(() => {
    mountedRef.current = true;
    loadVerificationData();
    
    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  // Track screen view
  useEffect(() => {
    analyticsService.trackScreenView('verification', {
      userId: user?.id,
      userRole: user?.role,
      currentStatus: verificationData?.overallStatus,
    });
  }, [verificationData]);

  const loadVerificationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await verificationService.getVerificationStatus(user.id);
      
      if (!mountedRef.current) return;

      if (data) {
        setVerificationData(data);
        
        // Determine active step based on completion status
        const nextIncompleteStep = getNextIncompleteStep(data);
        setActiveStep(nextIncompleteStep);

        // Animate content in
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

      } else {
        throw new Error('Failed to load verification data');
      }

    } catch (err) {
      console.error('Error loading verification data:', err);
      setError(err.message);
      
      errorService.captureError(err, {
        context: 'VerificationDataLoad',
        userId: user?.id,
      });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const getNextIncompleteStep = (data) => {
    const steps = [
      { key: 'identity', condition: !data.identity?.verified },
      { key: 'documents', condition: !data.documents?.verified },
      { key: 'background', condition: !data.backgroundCheck?.verified },
      { key: 'skills', condition: !data.skills?.verified },
    ];

    return steps.findIndex(step => step.condition);
  };

  // Document upload handling
  const handleDocumentUpload = async (documentType, fileUri, metadata = {}) => {
    try {
      showLoading(`Uploading ${getDocumentTypeName(documentType)}...`);

      // Update upload progress
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: 0,
      }));

      const uploadResult = await uploadService.uploadDocument(fileUri, {
        documentType,
        userId: user.id,
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          fileSize: metadata.fileSize || 0,
          mimeType: metadata.mimeType || 'image/jpeg',
        },
        onProgress: (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [documentType]: progress,
          }));
        },
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || 'Upload failed');
      }

      // Submit document for verification
      const verificationResult = await verificationService.submitDocument({
        documentType,
        fileUrl: uploadResult.url,
        fileId: uploadResult.fileId,
        userId: user.id,
        metadata: uploadResult.metadata,
      });

      if (verificationResult.success) {
        // Update local state
        setVerificationData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: {
              status: VERIFICATION_STATUS.PENDING,
              submittedAt: new Date().toISOString(),
              documentUrl: uploadResult.url,
              ...verificationResult.document,
            },
          },
        }));

        showToast(`${getDocumentTypeName(documentType)} uploaded successfully`, 'success');

        // Track event
        analyticsService.trackEvent('verification_document_uploaded', {
          documentType,
          fileSize: uploadResult.metadata?.fileSize,
          userId: user.id,
        });

        // Check if all required documents are uploaded
        checkDocumentsCompletion();

      } else {
        throw new Error(verificationResult.message || 'Verification submission failed');
      }

    } catch (err) {
      console.error('Error uploading document:', err);
      showToast(`Failed to upload ${getDocumentTypeName(documentType)}`, 'error');
      
      errorService.captureError(err, {
        context: 'DocumentUpload',
        documentType,
        userId: user.id,
        metadata,
      });
    } finally {
      hideLoading();
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: undefined,
      }));
    }
  };

  const getDocumentTypeName = (documentType) => {
    const names = {
      [DOCUMENT_TYPES.ID_CARD]: 'ID Card',
      [DOCUMENT_TYPES.DRIVERS_LICENSE]: "Driver's License",
      [DOCUMENT_TYPES.PASSPORT]: 'Passport',
      [DOCUMENT_TYPES.PROOF_OF_ADDRESS]: 'Proof of Address',
      [DOCUMENT_TYPES.BUSINESS_LICENSE]: 'Business License',
      [DOCUMENT_TYPES.INSURANCE_CERTIFICATE]: 'Insurance Certificate',
    };
    return names[documentType] || 'Document';
  };

  const checkDocumentsCompletion = () => {
    const requiredDocs = VERIFICATION_REQUIREMENTS[user.role]?.documents || [];
    const uploadedDocs = Object.keys(verificationData?.documents || {});
    
    const allUploaded = requiredDocs.every(doc => uploadedDocs.includes(doc));
    
    if (allUploaded) {
      // Auto-submit for review if all documents are uploaded
      handleSubmitForReview();
    }
  };

  // Identity verification
  const handleIdentityVerification = async (identityData) => {
    try {
      setSubmitting(true);
      showLoading('Verifying your identity...');

      const result = await verificationService.verifyIdentity({
        ...identityData,
        userId: user.id,
      });

      if (result.success) {
        setVerificationData(prev => ({
          ...prev,
          identity: {
            ...prev.identity,
            status: VERIFICATION_STATUS.PENDING,
            submittedAt: new Date().toISOString(),
            ...result.verification,
          },
        }));

        showToast('Identity verification submitted successfully', 'success');
        
        analyticsService.trackEvent('identity_verification_submitted', {
          userId: user.id,
          method: identityData.method,
        });

        // Move to next step
        setActiveStep(prev => prev + 1);

      } else {
        throw new Error(result.message || 'Identity verification failed');
      }

    } catch (err) {
      console.error('Error verifying identity:', err);
      showToast('Identity verification failed', 'error');
      
      errorService.captureError(err, {
        context: 'IdentityVerification',
        userId: user.id,
        method: identityData.method,
      });
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  // Background check
  const handleBackgroundCheck = async (consentData) => {
    try {
      setSubmitting(true);
      showLoading('Initiating background check...');

      const result = await verificationService.initiateBackgroundCheck({
        userId: user.id,
        ...consentData,
      });

      if (result.success) {
        setVerificationData(prev => ({
          ...prev,
          backgroundCheck: {
            ...prev.backgroundCheck,
            status: VERIFICATION_STATUS.PENDING,
            initiatedAt: new Date().toISOString(),
            consentGiven: true,
            ...result.check,
          },
        }));

        showToast('Background check initiated successfully', 'success');
        
        analyticsService.trackEvent('background_check_initiated', {
          userId: user.id,
          checkType: consentData.checkType,
        });

        // Move to next step
        setActiveStep(prev => prev + 1);

      } else {
        throw new Error(result.message || 'Background check initiation failed');
      }

    } catch (err) {
      console.error('Error initiating background check:', err);
      showToast('Failed to initiate background check', 'error');
      
      errorService.captureError(err, {
        context: 'BackgroundCheck',
        userId: user.id,
        consentData,
      });
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  // Skill verification
  const handleSkillVerification = async (skillsData) => {
    try {
      setSubmitting(true);
      showLoading('Submitting skills for verification...');

      const result = await verificationService.verifySkills({
        userId: user.id,
        skills: skillsData.skills,
        certifications: skillsData.certifications,
        portfolioItems: skillsData.portfolioItems,
      });

      if (result.success) {
        setVerificationData(prev => ({
          ...prev,
          skills: {
            ...prev.skills,
            status: VERIFICATION_STATUS.PENDING,
            submittedAt: new Date().toISOString(),
            verifiedSkills: result.verifiedSkills || [],
            ...result.verification,
          },
        }));

        showToast('Skills submitted for verification', 'success');
        
        analyticsService.trackEvent('skills_verification_submitted', {
          userId: user.id,
          skillCount: skillsData.skills?.length || 0,
          certificationCount: skillsData.certifications?.length || 0,
        });

      } else {
        throw new Error(result.message || 'Skills verification failed');
      }

    } catch (err) {
      console.error('Error verifying skills:', err);
      showToast('Failed to submit skills for verification', 'error');
      
      errorService.captureError(err, {
        context: 'SkillsVerification',
        userId: user.id,
        skillsData,
      });
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  // Submit all for final review
  const handleSubmitForReview = async () => {
    try {
      setSubmitting(true);
      showLoading('Submitting for final review...');

      const result = await verificationService.submitForFinalReview(user.id);

      if (result.success) {
        setVerificationData(prev => ({
          ...prev,
          overallStatus: VERIFICATION_STATUS.UNDER_REVIEW,
          submittedForReviewAt: new Date().toISOString(),
          ...result.verification,
        }));

        // Update user context
        await updateUser({
          ...user,
          verificationStatus: VERIFICATION_STATUS.UNDER_REVIEW,
        });

        showToast('Verification submitted for final review', 'success');
        
        analyticsService.trackEvent('verification_submitted_for_review', {
          userId: user.id,
          currentStatus: VERIFICATION_STATUS.UNDER_REVIEW,
        });

      } else {
        throw new Error(result.message || 'Submission for review failed');
      }

    } catch (err) {
      console.error('Error submitting for review:', err);
      showToast('Failed to submit for review', 'error');
      
      errorService.captureError(err, {
        context: 'VerificationReviewSubmission',
        userId: user.id,
      });
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  // Check verification status
  const handleCheckStatus = async () => {
    try {
      showLoading('Checking verification status...');
      await loadVerificationData();
      showToast('Status updated', 'success');
    } catch (err) {
      console.error('Error checking status:', err);
      showToast('Failed to check status', 'error');
    } finally {
      hideLoading();
    }
  };

  // Handle support contact
  const handleContactSupport = () => {
    const supportEmail = 'verification@yachi.com';
    const subject = `Verification Support - User ${user.id}`;
    const body = `Hello Yachi Verification Team,\n\nI need assistance with my verification process.\n\nUser ID: ${user.id}\nCurrent Status: ${verificationData?.overallStatus}\nIssue: `;

    Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
      .catch(() => {
        showToast('Could not open email app', 'error');
      });
  };

  // Handle step navigation
  const handleStepChange = (step) => {
    setActiveStep(step);
    
    // Scroll to top when changing steps
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Get verification requirements for user role
  const getRequirements = () => {
    return VERIFICATION_REQUIREMENTS[user.role] || VERIFICATION_REQUIREMENTS.default;
  };

  if (loading) {
    return <LoadingScreen message="Loading verification status..." />;
  }

  if (error && !verificationData) {
    return (
      <ErrorScreen
        message={error}
        onRetry={loadVerificationData}
        retryButton={<RetryButton onPress={loadVerificationData} />}
      />
    );
  }

  const requirements = getRequirements();
  const overallStatus = verificationData?.overallStatus || VERIFICATION_STATUS.NOT_STARTED;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Identity Verification',
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

      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
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
            {/* Verification Status Banner */}
            <VerificationStatus
              status={overallStatus}
              lastUpdated={verificationData?.lastUpdated}
              onCheckStatus={handleCheckStatus}
              theme={theme}
            />

            {/* Progress Tracker */}
            <VerificationProgress
              currentStep={activeStep}
              verificationData={verificationData}
              onStepPress={handleStepChange}
              userRole={user.role}
              theme={theme}
            />

            {/* Requirements List */}
            <RequirementsList
              requirements={requirements}
              verificationData={verificationData}
              theme={theme}
            />

            {/* Dynamic Step Content */}
            <View style={styles.stepContent}>
              {activeStep === 0 && (
                <IdentityVerification
                  verificationData={verificationData?.identity}
                  onSubmit={handleIdentityVerification}
                  loading={submitting}
                  theme={theme}
                />
              )}

              {activeStep === 1 && (
                <DocumentUpload
                  verificationData={verificationData?.documents}
                  requiredDocuments={requirements.documents}
                  onDocumentUpload={handleDocumentUpload}
                  uploadProgress={uploadProgress}
                  loading={submitting}
                  userRole={user.role}
                  theme={theme}
                />
              )}

              {activeStep === 2 && (
                <BackgroundCheck
                  verificationData={verificationData?.backgroundCheck}
                  onSubmit={handleBackgroundCheck}
                  loading={submitting}
                  theme={theme}
                />
              )}

              {activeStep === 3 && user.role === 'worker' && (
                <SkillVerification
                  verificationData={verificationData?.skills}
                  onSubmit={handleSkillVerification}
                  loading={submitting}
                  theme={theme}
                />
              )}
            </View>

            {/* Help and Support */}
            <HelpCard
              onContactSupport={handleContactSupport}
              theme={theme}
            />

            {/* Security Notice */}
            <View style={[styles.securityNotice, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.securityTitle, { color: theme.colors.text }]}>
                🔒 Your Security is Our Priority
              </Text>
              <Text style={[styles.securityText, { color: theme.colors.textSecondary }]}>
                • All documents are encrypted and securely stored{'\n'}
                • We comply with GDPR and data protection regulations{'\n'}
                • Your information is never shared with third parties without consent{'\n'}
                • Verification typically takes 24-48 hours to complete
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Action Buttons */}
        {overallStatus === VERIFICATION_STATUS.NOT_STARTED && (
          <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
            <Button
              title="Start Verification"
              onPress={() => setActiveStep(0)}
              type="primary"
              style={styles.primaryButton}
              theme={theme}
            />
          </View>
        )}

        {overallStatus === VERIFICATION_STATUS.IN_PROGRESS && (
          <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
            <Button
              title="Continue Verification"
              onPress={() => setActiveStep(activeStep)}
              type="primary"
              style={styles.primaryButton}
              theme={theme}
            />
            <Button
              title="Save & Continue Later"
              onPress={() => router.back()}
              type="outline"
              style={styles.secondaryButton}
              theme={theme}
            />
          </View>
        )}

        {/* Toast Notification */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(prev => ({ ...prev, visible: false }))}
          theme={theme}
        />

        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
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
    paddingBottom: 100,
  },
  animatedContainer: {
    flex: 1,
  },
  stepContent: {
    marginTop: 24,
  },
  securityNotice: {
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
});

// Mock Button component
const Button = ({ title, onPress, type, style, theme, disabled }) => {
  return (
    <View style={[buttonStyles.container, style]}>
      <Text style={[
        buttonStyles.text,
        type === 'primary' && { color: theme.colors.background },
        type === 'outline' && { color: theme.colors.primary },
      ]}>
        {title}
      </Text>
    </View>
  );
};

const buttonStyles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});