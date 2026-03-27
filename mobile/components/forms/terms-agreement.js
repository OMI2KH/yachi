/**
 * 🏢 Yachi Enterprise Terms Agreement Component
 * Ethiopian Market Compliance & Multi-Legal Framework
 * @version 3.0.0
 * @component TermsAgreement
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Linking,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';

// Enterprise Contexts
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useNetwork } from '../../contexts/network-context';
import { useLocalization } from '../../contexts/localization-context';

// Enterprise Components
import { ThemedText } from '../ui/themed-text';
import Checkbox from '../ui/checkbox';
import Modal from '../ui/modal';
import Button from '../ui/button';
import Loading from '../ui/loading';
import ProgressIndicator from '../ui/progress-indicator';
import LegalDocumentViewer from '../legal/legal-document-viewer';

// Enterprise Services
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { notificationService } from '../../services/notification-service';
import { legalDocumentService } from '../../services/legal-document-service';
import { complianceService } from '../../services/compliance-service';

// Enterprise Utils
import { storage, secureStorage } from '../../utils/storage';
import { performanceService } from '../../utils/performance';
import { accessibilityService } from '../../utils/accessibility';

// Enterprise Constants
import { ENTERPRISE_CONFIG } from '../../constants/enterprise-config';
import { ETHIOPIAN_LEGAL_FRAMEWORK } from '../../constants/legal-framework';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enterprise Agreement Types
const ENTERPRISE_AGREEMENT_TYPES = Object.freeze({
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  DATA_PROCESSING: 'data_processing',
  CONSTRUCTION_AGREEMENT: 'construction_agreement',
  GOVERNMENT_COMPLIANCE: 'government_compliance',
  AI_SERVICES: 'ai_services',
  PREMIUM_FEATURES: 'premium_features',
  GAMIFICATION: 'gamification',
  PAYMENT_TERMS: 'payment_terms',
  MARKETING_COMMUNICATIONS: 'marketing_communications',
  ALL: 'all',
});

// Ethiopian Legal Document Categories
const LEGAL_CATEGORIES = Object.freeze({
  GENERAL: 'general',
  CONSTRUCTION: 'construction',
  GOVERNMENT: 'government',
  AI_CONSTRUCTION: 'ai_construction',
  PREMIUM: 'premium',
  PAYMENT: 'payment',
});

/**
 * Enterprise Terms Agreement Component
 * Comprehensive legal compliance for Ethiopian market
 * Multi-document support with intelligent loading
 * Accessibility-first design with performance optimization
 */

const EnterpriseTermsAgreement = ({
  // Enterprise Configuration
  agreementTypes = [ENTERPRISE_AGREEMENT_TYPES.TERMS_OF_SERVICE, ENTERPRISE_AGREEMENT_TYPES.PRIVACY_POLICY],
  required = true,
  ageVerification = false,
  minAge = 18, // Ethiopian legal contract age
  userRole = 'client', // client, provider, government, admin
  
  // State Management
  checked = false,
  onPress,
  onAgreementChange,
  onLegalDocumentView,
  
  // Customization
  checkboxLabel,
  customText,
  compactMode = false,
  showProgress = true,
  
  // Error Handling
  error,
  showError = true,
  validationRules,
  
  // Analytics
  analyticsContext = 'general',
  
  // Testing
  testID = 'enterprise-terms-agreement',
}) => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user, updateLegalCompliance } = useAuth();
  const { isConnected, networkType } = useNetwork();
  const { currentLanguage, t } = useLocalization();

  // Enterprise State Management
  const [modalVisible, setModalVisible] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentsLoading, setDocumentsLoading] = useState(new Map());
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [readTime, setReadTime] = useState(0);
  const [acceptanceProgress, setAcceptanceProgress] = useState(0);
  const [legalDocuments, setLegalDocuments] = useState(new Map());

  // Enterprise Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const readTimerRef = useRef(null);
  const interactionTimerRef = useRef(null);

  // Memoized Computations
  const requiredDocuments = useMemo(() => 
    Array.from(legalDocuments.values()).filter(doc => 
      agreementTypes.includes(doc.type) || agreementTypes.includes(ENTERPRISE_AGREEMENT_TYPES.ALL)
    ),
    [legalDocuments, agreementTypes]
  );

  const progressPercentage = useMemo(() => 
    (acceptanceProgress / requiredDocuments.length) * 100,
    [acceptanceProgress, requiredDocuments.length]
  );

  const isAgreementValid = useMemo(() => {
    if (!required) return true;
    if (ageVerification && !ageConfirmed) return false;
    if (requiredDocuments.length === 0) return true;
    return checked && acceptanceProgress === requiredDocuments.length;
  }, [required, ageVerification, ageConfirmed, checked, acceptanceProgress, requiredDocuments.length]);

  // Enterprise Effects
  useEffect(() => {
    initializeEnterpriseComponent();
    return cleanupEnterpriseComponent;
  }, []);

  useEffect(() => {
    if (legalDocuments.size > 0) {
      startReadTimeTracking();
    }
    return () => {
      if (readTimerRef.current) clearInterval(readTimerRef.current);
    };
  }, [legalDocuments.size]);

  useEffect(() => {
    updateProgressAnimation();
  }, [progressPercentage]);

  // Enterprise Initialization
  const initializeEnterpriseComponent = useCallback(async () => {
    performanceService.startMeasurement('enterprise_terms_initialization');
    
    try {
      // Load legal documents based on user role and agreement types
      await loadEnterpriseLegalDocuments();
      
      // Start entry animations
      await performEnterpriseAnimations();
      
      // Track component initialization
      analyticsService.trackComponentView('enterprise_terms_agreement', {
        agreementTypes,
        userRole,
        language: currentLanguage,
        networkType,
        context: analyticsContext
      });

    } catch (error) {
      handleEnterpriseError(error, 'component_initialization');
    } finally {
      performanceService.endMeasurement('enterprise_terms_initialization');
    }
  }, [agreementTypes, userRole, currentLanguage, networkType, analyticsContext]);

  const cleanupEnterpriseComponent = useCallback(() => {
    if (readTimerRef.current) clearInterval(readTimerRef.current);
    if (interactionTimerRef.current) clearInterval(interactionTimerRef.current);
    
    analyticsService.trackEvent('terms_agreement_session_ended', {
      readTime,
      progress: acceptanceProgress,
      documentsViewed: expandedSections.size
    });
  }, [readTime, acceptanceProgress, expandedSections.size]);

  // Enterprise Legal Document Management
  const loadEnterpriseLegalDocuments = useCallback(async () => {
    try {
      const documents = await legalDocumentService.getLegalDocuments({
        types: agreementTypes,
        userRole,
        language: currentLanguage,
        jurisdiction: 'ethiopia',
        version: ENTERPRISE_CONFIG.LEGAL_VERSION
      });

      const documentsMap = new Map();
      documents.forEach(doc => {
        documentsMap.set(doc.type, {
          ...doc,
          required: agreementTypes.includes(doc.type) || agreementTypes.includes(ENTERPRISE_AGREEMENT_TYPES.ALL),
          category: getDocumentCategory(doc.type),
          lastViewed: null,
          viewCount: 0
        });
      });

      setLegalDocuments(documentsMap);

      analyticsService.trackEvent('legal_documents_loaded', {
        count: documents.length,
        types: agreementTypes,
        userRole
      });

    } catch (error) {
      handleEnterpriseError(error, 'legal_documents_loading');
      // Fallback to offline documents
      await loadOfflineLegalDocuments();
    }
  }, [agreementTypes, userRole, currentLanguage]);

  const loadOfflineLegalDocuments = useCallback(async () => {
    const offlineDocs = await storage.get('offline_legal_documents');
    if (offlineDocs) {
      setLegalDocuments(new Map(offlineDocs));
    }
  }, []);

  // Enterprise Animations
  const performEnterpriseAnimations = useCallback(() => {
    return new Promise((resolve) => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(progressAnim, {
          toValue: progressPercentage,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        })
      ]).start(resolve);
    });
  }, [fadeAnim, progressAnim, progressPercentage]);

  const updateProgressAnimation = useCallback(() => {
    Animated.spring(progressAnim, {
      toValue: progressPercentage,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, progressPercentage]);

  const triggerErrorAnimation = useCallback(() => {
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
  }, [shakeAnim]);

  // Enterprise Event Handlers
  const handleEnterpriseAgreement = useCallback((newValue) => {
    performanceService.startMeasurement('terms_agreement_toggle');
    
    try {
      // Validate age requirement for Ethiopian market
      if (ageVerification && !ageConfirmed && newValue) {
        showAgeVerificationAlert();
        return;
      }

      // Track agreement change
      analyticsService.trackEvent('enterprise_agreement_changed', {
        checked: newValue,
        agreementTypes,
        ageVerified: ageVerification ? ageConfirmed : null,
        userRole,
        progress: acceptanceProgress,
        context: analyticsContext
      });

      // Update parent components
      onPress?.(newValue);
      onAgreementChange?.(newValue, agreementTypes, acceptanceProgress);

      // Update compliance record
      if (newValue && user) {
        updateComplianceRecord();
      }

    } catch (error) {
      handleEnterpriseError(error, 'agreement_toggle');
    } finally {
      performanceService.endMeasurement('terms_agreement_toggle');
    }
  }, [ageVerification, ageConfirmed, agreementTypes, userRole, acceptanceProgress, analyticsContext, onPress, onAgreementChange, user]);

  const handleDocumentView = useCallback(async (documentType) => {
    const document = legalDocuments.get(documentType);
    if (!document) return;

    try {
      // Track document view
      analyticsService.trackEvent('legal_document_viewed', {
        documentType,
        documentTitle: document.title,
        category: document.category,
        userRole,
        source: 'terms_agreement'
      });

      // Update document metrics
      const updatedDocument = {
        ...document,
        lastViewed: new Date().toISOString(),
        viewCount: (document.viewCount || 0) + 1
      };
      
      legalDocuments.set(documentType, updatedDocument);
      setLegalDocuments(new Map(legalDocuments));

      // Open document viewer
      setActiveDocument(documentType);
      setModalVisible(true);

      // Load document content if needed
      if (!document.content && !documentsLoading.get(documentType)) {
        await loadDocumentContent(documentType);
      }

      // Update progress
      if (!expandedSections.has(documentType)) {
        setExpandedSections(prev => new Set(prev).add(documentType));
        setAcceptanceProgress(prev => prev + 1);
      }

      // Notify parent component
      onLegalDocumentView?.(documentType, document);

    } catch (error) {
      handleEnterpriseError(error, 'document_view');
    }
  }, [legalDocuments, documentsLoading, expandedSections, userRole, onLegalDocumentView]);

  const loadDocumentContent = useCallback(async (documentType) => {
    const document = legalDocuments.get(documentType);
    if (!document || documentsLoading.get(documentType)) return;

    try {
      documentsLoading.set(documentType, true);
      setDocumentsLoading(new Map(documentsLoading));

      const content = await legalDocumentService.getDocumentContent({
        type: documentType,
        language: currentLanguage,
        version: document.version
      });

      // Update document with content
      const updatedDocument = { ...document, content };
      legalDocuments.set(documentType, updatedDocument);
      setLegalDocuments(new Map(legalDocuments));

      analyticsService.trackEvent('legal_document_content_loaded', {
        documentType,
        contentLength: content?.length || 0
      });

    } catch (error) {
      handleEnterpriseError(error, 'document_content_loading');
      
      // Show offline message
      notificationService.show({
        type: 'warning',
        title: t('offline_mode'),
        message: t('legal_document_offline'),
        duration: 3000
      });
    } finally {
      documentsLoading.set(documentType, false);
      setDocumentsLoading(new Map(documentsLoading));
    }
  }, [legalDocuments, documentsLoading, currentLanguage, t]);

  // Enterprise Compliance Management
  const updateComplianceRecord = useCallback(async () => {
    try {
      const complianceRecord = {
        userId: user?.id,
        agreementTypes,
        acceptedAt: new Date().toISOString(),
        legalVersion: ENTERPRISE_CONFIG.LEGAL_VERSION,
        userRole,
        ageVerified: ageVerification ? ageConfirmed : null,
        documentsViewed: Array.from(expandedSections),
        readTime,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        },
        ipAddress: 'tracked' // Would be populated from API
      };

      await secureStorage.set('legal_compliance_record', complianceRecord);
      
      // Update server compliance record
      if (isConnected) {
        await updateLegalCompliance(complianceRecord);
      }

      analyticsService.trackEvent('compliance_record_updated', {
        userId: user?.id,
        agreementTypes,
        documentsCount: expandedSections.size
      });

    } catch (error) {
      handleEnterpriseError(error, 'compliance_update');
    }
  }, [user, agreementTypes, userRole, ageVerification, ageConfirmed, expandedSections, readTime, isConnected, updateLegalCompliance]);

  // Enterprise UI Components
  const renderEnterpriseProgress = () => {
    if (!showProgress || compactMode) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <ThemedText type="body" weight="semiBold">
            {t('acceptance_progress')}
          </ThemedText>
          <ThemedText type="caption" color="primary">
            {acceptanceProgress}/{requiredDocuments.length}
          </ThemedText>
        </View>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                })
              }
            ]} 
          />
        </View>
        <ThemedText type="caption" color="secondary" style={styles.progressHint}>
          {t('review_all_sections')}
        </ThemedText>
      </View>
    );
  };

  const renderEnterpriseAgeVerification = () => {
    if (!ageVerification) return null;

    return (
      <View style={[
        styles.ageVerification,
        { backgroundColor: theme.colors.surface }
      ]}>
        <ThemedText type="body" weight="semiBold">
          {t('age_verification')}
        </ThemedText>
        <ThemedText type="caption" color="secondary" style={styles.ageDescription}>
          {t('ethiopian_legal_age', { age: minAge })}
        </ThemedText>
        <View style={styles.ageButtons}>
          <Button
            variant={ageConfirmed ? 'primary' : 'outline'}
            onPress={() => setAgeConfirmed(true)}
            size="small"
            style={styles.ageButton}
            accessibilityLabel={t('confirm_age_yes')}
          >
            {t('yes_age_confirm', { age: minAge })}
          </Button>
          <Button
            variant={!ageConfirmed ? 'primary' : 'outline'}
            onPress={() => setAgeConfirmed(false)}
            size="small"
            style={styles.ageButton}
            accessibilityLabel={t('confirm_age_no')}
          >
            {t('no_age_confirm')}
          </Button>
        </View>
      </View>
    );
  };

  const renderEnterpriseDocumentLinks = () => {
    if (compactMode) return null;

    return (
      <View style={styles.documentsContainer}>
        <ThemedText type="body" weight="semiBold" style={styles.documentsTitle}>
          {t('legal_documents')}
        </ThemedText>
        <View style={styles.documentsGrid}>
          {requiredDocuments.map(document => (
            <TouchableOpacity
              key={document.type}
              onPress={() => handleDocumentView(document.type)}
              style={[
                styles.documentCard,
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: expandedSections.has(document.type) ? 
                    theme.colors.primary : theme.colors.border
                }
              ]}
              accessibilityLabel={`View ${document.title} document`}
              accessibilityRole="button"
            >
              <View style={styles.documentHeader}>
                <ThemedText type="caption" weight="semiBold">
                  {document.title}
                </ThemedText>
                {expandedSections.has(document.type) && (
                  <View style={[
                    styles.viewedBadge,
                    { backgroundColor: theme.colors.primary }
                  ]}>
                    <ThemedText type="caption" color="white" weight="bold">
                      ✓
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="caption" color="secondary" numberOfLines={2}>
                {document.description}
              </ThemedText>
              {document.category === LEGAL_CATEGORIES.CONSTRUCTION && (
                <View style={styles.categoryBadge}>
                  <ThemedText type="caption" color="primary" weight="bold">
                    🏗️ {t('construction')}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderEnterpriseModal = () => {
    const document = legalDocuments.get(activeDocument);
    if (!document) return null;

    return (
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        title={document.title}
        size="xlarge"
        showClose={true}
      >
        <LegalDocumentViewer
          document={document}
          language={currentLanguage}
          onClose={() => setModalVisible(false)}
          onSectionComplete={(sectionId) => {
            // Track section completion
            analyticsService.trackEvent('legal_section_completed', {
              documentType: document.type,
              sectionId,
              readTime
            });
          }}
        />
      </Modal>
    );
  };

  // Enterprise Utility Functions
  const getDocumentCategory = (documentType) => {
    const categoryMap = {
      [ENTERPRISE_AGREEMENT_TYPES.CONSTRUCTION_AGREEMENT]: LEGAL_CATEGORIES.CONSTRUCTION,
      [ENTERPRISE_AGREEMENT_TYPES.GOVERNMENT_COMPLIANCE]: LEGAL_CATEGORIES.GOVERNMENT,
      [ENTERPRISE_AGREEMENT_TYPES.AI_SERVICES]: LEGAL_CATEGORIES.AI_CONSTRUCTION,
      [ENTERPRISE_AGREEMENT_TYPES.PREMIUM_FEATURES]: LEGAL_CATEGORIES.PREMIUM,
      [ENTERPRISE_AGREEMENT_TYPES.PAYMENT_TERMS]: LEGAL_CATEGORIES.PAYMENT,
    };
    return categoryMap[documentType] || LEGAL_CATEGORIES.GENERAL;
  };

  const startReadTimeTracking = useCallback(() => {
    readTimerRef.current = setInterval(() => {
      setReadTime(prev => prev + 1);
    }, 1000);
  }, []);

  const handleEnterpriseError = useCallback((error, context) => {
    errorService.captureError(error, {
      context: `enterprise_terms_agreement_${context}`,
      component: 'EnterpriseTermsAgreement',
      userRole,
      agreementTypes,
      severity: context.includes('compliance') ? 'high' : 'medium'
    });

    // Show user-friendly error message
    notificationService.show({
      type: 'error',
      title: t('error_occurred'),
      message: t('legal_document_error'),
      duration: 5000
    });
  }, [userRole, agreementTypes, t]);

  const showAgeVerificationAlert = useCallback(() => {
    Alert.alert(
      t('age_verification_required'),
      t('age_verification_message', { age: minAge }),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('verify_age'), 
          onPress: () => setAgeConfirmed(true),
          style: 'default'
        }
      ]
    );
  }, [minAge, t]);

  // Main Render
  return (
    <Animated.View
      style={[
        styles.enterpriseContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateX: shakeAnim }],
        },
      ]}
      testID={testID}
      accessibilityLabel="Legal terms and agreements section"
    >
      {/* Progress Indicator */}
      {renderEnterpriseProgress()}

      {/* Age Verification */}
      {renderEnterpriseAgeVerification()}

      {/* Document Links Grid */}
      {renderEnterpriseDocumentLinks()}

      {/* Main Agreement Checkbox */}
      <Checkbox
        checked={checked && (!ageVerification || ageConfirmed)}
        onPress={handleEnterpriseAgreement}
        error={error}
        showError={showError}
        disabled={ageVerification && !ageConfirmed}
        style={styles.enterpriseCheckbox}
        accessibilityLabel="Agree to all terms and conditions"
      >
        <ThemedText type="body">
          {checkboxLabel || t('agree_to_terms')}
        </ThemedText>
      </Checkbox>

      {/* Error Display */}
      {error && showError && (
        <ThemedText type="caption" color="error" style={styles.errorText}>
          {error}
        </ThemedText>
      )}

      {/* Legal Document Modal */}
      {renderEnterpriseModal()}
    </Animated.View>
  );
};

// Enterprise Styles
const styles = StyleSheet.create({
  enterpriseContainer: {
    width: '100%',
    gap: 20,
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#078930',
    borderRadius: 3,
  },
  progressHint: {
    textAlign: 'center',
  },
  ageVerification: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  ageDescription: {
    lineHeight: 18,
  },
  ageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ageButton: {
    flex: 1,
  },
  documentsContainer: {
    gap: 16,
  },
  documentsTitle: {
    marginBottom: 8,
  },
  documentsGrid: {
    gap: 12,
  },
  documentCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
  },
  enterpriseCheckbox: {
    marginTop: 8,
  },
  errorText: {
    marginTop: 4,
  },
});

export default EnterpriseTermsAgreement;

// Enterprise Hook for Legal Compliance
export const useEnterpriseLegalCompliance = (initialState = false) => {
  const [complianceState, setComplianceState] = useState({
    agreed: initialState,
    documentsViewed: new Set(),
    progress: 0,
    lastUpdated: null
  });
  
  const updateCompliance = useCallback((updates) => {
    setComplianceState(prev => {
      const newState = { ...prev, ...updates, lastUpdated: new Date().toISOString() };
      
      // Store compliance state
      secureStorage.set('legal_compliance_state', newState);
      
      // Track compliance changes
      analyticsService.trackEvent('legal_compliance_updated', {
        agreed: newState.agreed,
        documentsCount: newState.documentsViewed.size,
        progress: newState.progress
      });
      
      return newState;
    });
  }, []);
  
  return {
    complianceState,
    updateCompliance,
  };
};