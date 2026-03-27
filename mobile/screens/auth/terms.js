/**
 * 🏢 Yachi Enterprise Terms & Conditions Screen
 * Ethiopian Legal Compliance & Multi-Language Support
 * @version 4.0.0
 * @screen TermsScreen
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Linking,
  StatusBar,
  BackHandler,
  InteractionManager
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/theme-context';
import { useAuth } from '../../../hooks/use-auth';
import { useNetwork } from '../../../hooks/use-network';
import { analyticsService, errorService, performanceService } from '../../../services';
import { storage, secureStorage } from '../../../utils/storage';
import { LegalDocumentService } from '../../../services/legalDocumentService';
import { AccessibilityService } from '../../../services/accessibilityService';

// ==================== ENTERPRISE CONSTANTS & CONFIG ====================
const ENTERPRISE_CONFIG = Object.freeze({
  TERMS_VERSION: '4.0.0',
  EFFECTIVE_DATE: '2024-01-01',
  MIN_READ_TIME: 30, // seconds
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  SCROLL_THRESHOLD: 0.95, // 95% scroll required
  MAX_SESSION_TIME: 1800, // 30 minutes
});

const LEGAL_DOCUMENT_SECTIONS = Object.freeze({
  INTRODUCTION: 'introduction',
  USER_RIGHTS: 'user_rights',
  RESPONSIBILITIES: 'responsibilities',
  PAYMENT_TERMS: 'payment_terms',
  DATA_PRIVACY: 'data_privacy',
  AI_CONSTRUCTION: 'ai_construction',
  GOVERNMENT_PROJECTS: 'government_projects',
  PREMIUM_FEATURES: 'premium_features',
  GAMIFICATION: 'gamification',
  DISPUTE_RESOLUTION: 'dispute_resolution',
  ETHIOPIAN_LAW: 'ethiopian_law',
  TERMINATION: 'termination'
});

const ETHIOPIAN_LEGAL_FRAMEWORK = Object.freeze({
  DATA_PROTECTION: {
    law: 'Ethiopian Data Protection Proclamation No. 1205/2020',
    reference: 'Article 15-25',
    url: 'https://www.law.et/dataprotection'
  },
  CONSUMER_PROTECTION: {
    law: 'Trade Practice and Consumer Protection Proclamation No. 685/2010',
    reference: 'Article 6-12',
    url: 'https://www.law.et/consumerprotection'
  },
  E_COMMERCE: {
    law: 'Electronic Signature Proclamation No. 1072/2018',
    reference: 'Article 3-8',
    url: 'https://www.law.et/esignature'
  },
  LABOR_REGULATION: {
    law: 'Labour Proclamation No. 1156/2019',
    reference: 'Article 45-62',
    url: 'https://www.law.et/labor'
  },
  TAX_REGULATION: {
    law: 'Value Added Tax Proclamation No. 285/2002',
    reference: 'Article 10-15',
    url: 'https://www.law.et/vat'
  }
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ==================== ENTERPRISE TERMS SCREEN COMPONENT ====================
const EnterpriseTermsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark, colorScheme } = useTheme();
  const { updateUserAgreement, user } = useAuth();
  const { isConnected, networkType } = useNetwork();

  // ==================== ENTERPRISE STATE MANAGEMENT ====================
  const [acceptedSections, setAcceptedSections] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('am');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [readTime, setReadTime] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [documentData, setDocumentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // ==================== ENTERPRISE ANIMATION REFERENCES ====================
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const readTimerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const scrollViewRef = useRef(null);

  // ==================== MEMOIZED VALUES ====================
  const progressPercentage = useMemo(() => 
    (acceptedSections.size / Object.values(LEGAL_DOCUMENT_SECTIONS).length) * 100,
    [acceptedSections.size]
  );

  const canSubmit = useMemo(() =>
    acceptedSections.size === Object.values(LEGAL_DOCUMENT_SECTIONS).length &&
    hasScrolledToBottom &&
    readTime >= ENTERPRISE_CONFIG.MIN_READ_TIME,
    [acceptedSections.size, hasScrolledToBottom, readTime]
  );

  // ==================== ENTERPRISE EFFECTS ====================
  useEffect(() => {
    initializeEnterpriseScreen();
    return () => cleanupEnterpriseScreen();
  }, []);

  useEffect(() => {
    if (documentData) {
      startAutoSave();
    }
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [documentData, acceptedSections, readTime]);

  useEffect(() => {
    setupAccessibility();
  }, []);

  // ==================== ENTERPRISE INITIALIZATION ====================
  const initializeEnterpriseScreen = useCallback(async () => {
    performanceService.startMeasurement('terms_screen_initialization');
    
    try {
      // Load legal document from service
      const legalDoc = await LegalDocumentService.getTermsDocument({
        version: ENTERPRISE_CONFIG.TERMS_VERSION,
        language: currentLanguage,
        userType: user?.role
      });
      
      setDocumentData(legalDoc);
      
      // Restore previous session if exists
      const savedSession = await storage.get('terms_session');
      if (savedSession) {
        restoreSession(savedSession);
      }

      // Start animations
      await performEntryAnimations();
      
      // Start tracking
      startReadTimeTracking();
      startSessionTimer();
      
      // Analytics
      analyticsService.trackScreenView('enterprise_terms', {
        version: ENTERPRISE_CONFIG.TERMS_VERSION,
        language: currentLanguage,
        userRole: user?.role,
        networkType
      });

    } catch (error) {
      errorService.captureError(error, {
        context: 'terms_screen_initialization',
        severity: 'high'
      });
      handleInitializationError(error);
    } finally {
      setIsLoading(false);
      performanceService.endMeasurement('terms_screen_initialization');
    }
  }, [currentLanguage, user?.role]);

  const cleanupEnterpriseScreen = useCallback(() => {
    if (readTimerRef.current) clearInterval(readTimerRef.current);
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    
    analyticsService.trackEvent('terms_session_ended', {
      sessionDuration: Math.floor((Date.now() - sessionStartTime) / 1000),
      readTime,
      acceptedSections: acceptedSections.size,
      progress: progressPercentage
    });
  }, [readTime, acceptedSections.size, progressPercentage, sessionStartTime]);

  // ==================== ENTERPRISE ANIMATIONS ====================
  const performEntryAnimations = useCallback(() => {
    return new Promise((resolve) => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(progressAnim, {
          toValue: progressPercentage,
          duration: 1000,
          useNativeDriver: false,
        })
      ]).start(resolve);
    });
  }, [fadeAnim, slideAnim, progressAnim, progressPercentage]);

  // ==================== ENTERPRISE TRACKING ====================
  const startReadTimeTracking = useCallback(() => {
    readTimerRef.current = setInterval(() => {
      setReadTime(prev => prev + 1);
    }, 1000);
  }, []);

  const startSessionTimer = useCallback(() => {
    sessionTimerRef.current = setInterval(() => {
      const sessionDuration = (Date.now() - sessionStartTime) / 1000;
      if (sessionDuration >= ENTERPRISE_CONFIG.MAX_SESSION_TIME) {
        Alert.alert(
          'Session Timeout',
          'For security reasons, your terms review session has timed out. Please start again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    }, 1000);
  }, [sessionStartTime, router]);

  const startAutoSave = useCallback(() => {
    autoSaveRef.current = setInterval(async () => {
      const sessionData = {
        acceptedSections: Array.from(acceptedSections),
        readTime,
        currentLanguage,
        scrollPosition: scrollY._value,
        lastUpdated: new Date().toISOString()
      };
      
      await storage.set('terms_session', sessionData);
      setLastSaved(new Date());
      
      analyticsService.trackEvent('terms_auto_save', {
        sections: acceptedSections.size,
        readTime
      });
    }, ENTERPRISE_CONFIG.AUTO_SAVE_INTERVAL);
  }, [acceptedSections, readTime, currentLanguage, scrollY]);

  // ==================== ENTERPRISE ACCESSIBILITY ====================
  const setupAccessibility = useCallback(async () => {
    const accessibilitySettings = await AccessibilityService.getSettings();
    setAccessibilityMode(accessibilitySettings.highContrast || accessibilitySettings.screenReader);
    
    if (accessibilitySettings.screenReader) {
      AccessibilityService.announce('Terms and Conditions screen loaded. Please review all sections carefully.');
    }
  }, []);

  // ==================== ENTERPRISE SCROLL HANDLERS ====================
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const handleScrollEnd = useCallback((event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const scrollPosition = (layoutMeasurement.height + contentOffset.y) / contentSize.height;
    
    if (scrollPosition >= ENTERPRISE_CONFIG.SCROLL_THRESHOLD && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      analyticsService.trackEvent('terms_fully_scrolled', {
        readTime,
        scrollPosition,
        version: ENTERPRISE_CONFIG.TERMS_VERSION
      });
      
      if (accessibilityMode) {
        AccessibilityService.announce('All terms and conditions have been displayed. Please review each section.');
      }
    }
  }, [hasScrolledToBottom, readTime, accessibilityMode]);

  // ==================== ENTERPRISE ACCEPTANCE HANDLERS ====================
  const toggleSectionAcceptance = useCallback((sectionId) => {
    setAcceptedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        analyticsService.trackEvent('terms_section_unchecked', { section: sectionId });
      } else {
        newSet.add(sectionId);
        analyticsService.trackEvent('terms_section_accepted', { 
          section: sectionId,
          readTimeAtAcceptance: readTime
        });
        
        if (accessibilityMode) {
          AccessibilityService.announce(`Section ${getSectionTitle(sectionId, currentLanguage)} accepted`);
        }
      }
      return newSet;
    });

    // Update progress animation
    Animated.spring(progressAnim, {
      toValue: progressPercentage,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [readTime, accessibilityMode, currentLanguage, progressPercentage, progressAnim]);

  const acceptAllSections = useCallback(() => {
    const allSections = Object.values(LEGAL_DOCUMENT_SECTIONS);
    setAcceptedSections(new Set(allSections));
    
    analyticsService.trackEvent('terms_all_accepted', {
      sections: allSections.length,
      readTime,
      autoAccepted: false
    });

    if (accessibilityMode) {
      AccessibilityService.announce('All sections have been accepted. Please review before submitting.');
    }
  }, [readTime, accessibilityMode]);

  // ==================== ENTERPRISE AGREEMENT HANDLER ====================
  const handleEnterpriseAgreement = useCallback(async () => {
    if (!canSubmit) {
      showValidationAlert();
      return;
    }

    performanceService.startMeasurement('enterprise_terms_acceptance');
    setIsSubmitting(true);

    try {
      const acceptanceData = {
        version: ENTERPRISE_CONFIG.TERMS_VERSION,
        acceptedAt: new Date().toISOString(),
        acceptedSections: Array.from(acceptedSections),
        readTime: readTime,
        language: currentLanguage,
        sessionDuration: Math.floor((Date.now() - sessionStartTime) / 1000),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          model: Platform.constants?.Model
        },
        networkType: networkType,
        userConsent: {
          marketing: true,
          dataProcessing: true,
          thirdPartySharing: false,
          governmentCompliance: true
        },
        legalJurisdiction: 'Ethiopia'
      };

      // Secure storage of legal acceptance
      await secureStorage.set('legal_acceptance', acceptanceData);
      
      // API call to update user agreement
      const result = await updateUserAgreement(acceptanceData);

      if (result.success) {
        await handleSuccessfulAcceptance(acceptanceData);
      } else {
        throw new Error('Failed to update user agreement');
      }

    } catch (error) {
      await handleAcceptanceError(error);
    } finally {
      setIsSubmitting(false);
      performanceService.endMeasurement('enterprise_terms_acceptance');
    }
  }, [canSubmit, acceptedSections, readTime, currentLanguage, sessionStartTime, networkType, updateUserAgreement]);

  const handleSuccessfulAcceptance = useCallback(async (acceptanceData) => {
    // Clear session data
    await storage.remove('terms_session');
    
    // Track successful acceptance
    analyticsService.trackEvent('enterprise_terms_accepted', {
      version: ENTERPRISE_CONFIG.TERMS_VERSION,
      readTime,
      sessionDuration: acceptanceData.sessionDuration,
      userRole: user?.role
    });

    // Show success message
    Alert.alert(
      '🎉 Welcome to Yachi Enterprise!',
      'You have successfully accepted our terms and conditions. Your enterprise account is now fully activated.',
      [{ text: 'Continue', onPress: () => navigateAfterAcceptance() }]
    );

    // Award gamification points
    if (user?.id) {
      await analyticsService.trackAchievement('terms_accepted', user.id);
    }
  }, [readTime, user]);

  const handleAcceptanceError = useCallback(async (error) => {
    errorService.captureError(error, {
      context: 'enterprise_terms_acceptance',
      severity: 'high',
      userImpact: true
    });

    Alert.alert(
      'Acceptance Failed',
      'We encountered an issue processing your acceptance. Please try again or contact support if the problem persists.',
      [
        { text: 'Try Again', onPress: () => {} },
        { text: 'Contact Support', onPress: () => Linking.openURL('mailto:support@yachi.et') }
      ]
    );
  }, []);

  // ==================== ENTERPRISE NAVIGATION ====================
  const navigateAfterAcceptance = useCallback(() => {
    const returnUrl = params.returnUrl || (user?.role === 'provider' ? '/provider/dashboard' : '/client/dashboard');
    
    InteractionManager.runAfterInteractions(() => {
      if (params.returnUrl) {
        router.replace(params.returnUrl);
      } else {
        router.replace({
          pathname: '/onboarding/completed',
          params: { 
            termsAccepted: 'true',
            version: ENTERPRISE_CONFIG.TERMS_VERSION 
          }
        });
      }
    });
  }, [params.returnUrl, user?.role, router]);

  // ==================== ENTERPRISE UI COMPONENTS ====================
  const renderEnterpriseHeader = () => (
    <Animated.View 
      style={[
        styles.enterpriseHeader,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: theme.colors.surface
        }
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={[styles.enterpriseTitle, { color: theme.colors.primary }]}>
          📜 Enterprise Terms & Conditions
        </Text>
        <Text style={[styles.enterpriseSubtitle, { color: theme.colors.secondary }]}>
          Yachi Platform Agreement - Ethiopian Legal Framework
        </Text>
        
        {renderLanguageSelector()}
        {renderVersionInfo()}
        {renderProgressIndicator()}
      </View>
    </Animated.View>
  );

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressLabels}>
        <Text style={[styles.progressText, { color: theme.colors.text }]}>
          Acceptance Progress
        </Text>
        <Text style={[styles.progressPercentage, { color: theme.colors.primary }]}>
          {Math.round(progressPercentage)}%
        </Text>
      </View>
      <View style={styles.progressBarBackground}>
        <Animated.View 
          style={[
            styles.progressBarFill,
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%']
              }),
              backgroundColor: theme.colors.primary
            }
          ]} 
        />
      </View>
    </View>
  );

  const renderEnterpriseSections = () => (
    <View style={styles.sectionsGrid}>
      {Object.entries(LEGAL_DOCUMENT_SECTIONS).map(([key, sectionId]) => (
        <LegalSectionCard
          key={sectionId}
          sectionId={sectionId}
          title={getSectionTitle(sectionId, currentLanguage)}
          content={getSectionContent(sectionId, currentLanguage)}
          isAccepted={acceptedSections.has(sectionId)}
          onToggle={toggleSectionAcceptance}
          isSubmitting={isSubmitting}
          language={currentLanguage}
          theme={theme}
          accessibilityMode={accessibilityMode}
        />
      ))}
    </View>
  );

  const renderEnterpriseFooter = () => (
    <View style={[styles.enterpriseFooter, { backgroundColor: theme.colors.surface }]}>
      {renderLegalReferences()}
      {renderAcceptanceButton()}
      {renderSessionInfo()}
    </View>
  );

  // ==================== MAIN RENDER ====================
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading Enterprise Terms...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.enterpriseContainer, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      
      {renderEnterpriseHeader()}

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.enterpriseScrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        {renderEnterpriseSections()}
      </Animated.ScrollView>

      {renderEnterpriseFooter()}
    </View>
  );
};

// ==================== LEGAL SECTION CARD COMPONENT ====================
const LegalSectionCard = React.memo(({
  sectionId,
  title,
  content,
  isAccepted,
  onToggle,
  isSubmitting,
  language,
  theme,
  accessibilityMode
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    onToggle(sectionId);
  }, [sectionId, onToggle]);

  const handleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <View style={[styles.legalCard, { 
      backgroundColor: theme.colors.surface,
      borderColor: isAccepted ? theme.colors.primary : theme.colors.border 
    }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={handleToggle}
        onLongPress={handleExpand}
        disabled={isSubmitting}
        accessibilityLabel={`${title} section. ${isAccepted ? 'Accepted' : 'Not accepted'}. Double tap to toggle acceptance.`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isAccepted }}
      >
        <View style={styles.checkboxContainer}>
          <View style={[
            styles.enterpriseCheckbox,
            isAccepted && [styles.enterpriseCheckboxChecked, { backgroundColor: theme.colors.primary }]
          ]}>
            {isAccepted && (
              <Text style={styles.checkboxIcon}>✓</Text>
            )}
          </View>
        </View>
        
        <View style={styles.cardTitleContainer}>
          <Text style={[styles.legalCardTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          {sectionId === LEGAL_DOCUMENT_SECTIONS.AI_CONSTRUCTION && (
            <Text style={[styles.featureBadge, { backgroundColor: theme.colors.primary }]}>
              🤖 AI Feature
            </Text>
          )}
          {sectionId === LEGAL_DOCUMENT_SECTIONS.PREMIUM_FEATURES && (
            <Text style={[styles.featureBadge, { backgroundColor: '#F59E0B' }]}>
              💎 Premium
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {(isExpanded || accessibilityMode) && (
        <View style={styles.cardContent}>
          {content.map((paragraph, index) => (
            <Text key={index} style={[styles.legalParagraph, { color: theme.colors.text }]}>
              {paragraph}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
});

// ==================== STYLES ====================
const styles = {
  enterpriseContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  enterpriseHeader: {
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    gap: 16,
  },
  enterpriseTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  enterpriseSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: {
    gap: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  enterpriseScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 16,
  },
  sectionsGrid: {
    gap: 16,
  },
  legalCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxContainer: {
    paddingTop: 2,
  },
  enterpriseCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enterpriseCheckboxChecked: {
    borderColor: 'transparent',
  },
  checkboxIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  legalCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  featureBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContent: {
    marginTop: 12,
    marginLeft: 36,
    gap: 8,
  },
  legalParagraph: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  enterpriseFooter: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  // ... Additional styles for other components
};

export default EnterpriseTermsScreen;