/**
 * 🎯 ENTERPRISE WELCOME SCREEN v3.0
 * 
 * Enhanced Features:
 * - AI-powered personalized onboarding experience
 * - Ethiopian market context and localization
 * - Advanced animation and micro-interactions
 * - Multi-language support with Amharic focus
 * - Smart authentication flow detection
 * - Construction industry specialization
 * - Real-time market insights
 * - Enterprise-grade security indicators
 * - TypeScript-first with intelligent flow routing
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Platform
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useAnalytics } from '../../contexts/analytics-context';
import { useLocation } from '../../contexts/location-context';
import { analyticsService, marketService, securityService } from '../../services';

// Import Enterprise Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import LanguageSelector from '../../components/ui/language-selector';
import SecurityBadge from '../../components/ui/security-badge';
import MarketInsightCard from '../../components/market/market-insight-card';

// Import Enterprise Constants
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/sizes';
import { LANGUAGES } from '../../constants/localization';
import { ETHIOPIAN_REGIONS } from '../../constants/location';

// ==================== ENTERPRISE CONSTANTS ====================
const WELCOME_STEPS = Object.freeze({
  WELCOME: 0,
  FEATURES: 1,
  MARKET_INSIGHTS: 2,
  GET_STARTED: 3
});

const FEATURES = Object.freeze([
  {
    icon: '🏗️',
    title: 'የ AI-የሚያመቻች ግንባታ',
    description: 'የ AI ኃይል በመጠቀም ፍጠን እና ውጤታማ የግንባታ ፕሮጀክቶች',
    color: COLORS.primary.main
  },
  {
    icon: '👷',
    title: 'ሰራተኞችን ያግኙ',
    description: 'በአካባቢዎ ውጤታማ የግንባታ ሰራተኞችን ያግኙ',
    color: COLORS.secondary.main
  },
  {
    icon: '💼',
    title: 'የንግድ እድሎች',
    description: 'የግንባታ ንግድዎን ያሳድጉ እና አዲስ ደንበኞችን ያግኙ',
    color: COLORS.semantic.info.main
  },
  {
    icon: '🏛️',
    title: 'መንግሥታዊ ፕሮጀክቶች',
    description: 'የመንግሥት መሠረተ ልማት ፕሮጀክቶችን ያግኙ',
    color: COLORS.semantic.warning.main
  }
]);

const MARKET_INSIGHTS = Object.freeze({
  CONSTRUCTION_GROWTH: {
    title: 'የግንባታ ኢንዱስትሪ እድገት',
    value: '27%',
    description: 'በኢትዮጵያ ውስጥ ዓመታዊ እድገት',
    trend: 'up',
    region: 'nationally'
  },
  WORKER_DEMAND: {
    title: 'የሰራተኞች ፍላጎት',
    value: '45,000+',
    description: 'ንቁ የግንባታ ሰራተኞች',
    trend: 'up',
    region: 'addis_ababa'
  },
  PROJECTS_ACTIVE: {
    title: 'ንቁ ፕሮጀክቶች',
    value: '12,500+',
    description: 'በሂደት ላይ ያሉ የግንባታ ፕሮጀክቶች',
    trend: 'up',
    region: 'nationally'
  }
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const WelcomeScreen = ({ navigation, route }) => {
  // ==================== ENTERPRISE HOOKS ====================
  const { theme, isDark, toggleTheme } = useTheme();
  const { 
    isAuthenticated, 
    user, 
    hasCompletedOnboarding,
    checkBiometricAvailability 
  } = useAuth();
  const { trackScreenView, trackUserFlow, trackEvent } = useAnalytics();
  const { currentLocation, getEthiopianLocation } = useLocation();

  // ==================== ENTERPRISE STATE MANAGEMENT ====================
  const [currentStep, setCurrentStep] = useState(WELCOME_STEPS.WELCOME);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES.AMHARIC);
  const [marketInsights, setMarketInsights] = useState(MARKET_INSIGHTS);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [userRegion, setUserRegion] = useState('addis_ababa');
  
  // Animation states
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const scrollViewRef = useRef();
  const featureAnimations = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  // ==================== ENTERPRISE EFFECTS ====================
  useEffect(() => {
    initializeWelcomeScreen();
  }, []);

  useEffect(() => {
    animateStepTransition();
  }, [currentStep]);

  // ==================== ENTERPRISE INITIALIZATION ====================
  const initializeWelcomeScreen = useCallback(async () => {
    try {
      // Track screen view
      trackScreenView('welcome');
      
      // Check user authentication status
      if (isAuthenticated && hasCompletedOnboarding) {
        navigation.replace('Main');
        return;
      }

      // Initialize biometric check
      const bioAvailable = await checkBiometricAvailability();
      setBiometricAvailable(bioAvailable);

      // Get user location for personalized experience
      const location = await getEthiopianLocation();
      if (location?.region) {
        setUserRegion(location.region);
        
        // Fetch regional market insights
        const regionalInsights = await fetchRegionalMarketInsights(location.region);
        setMarketInsights(prev => ({ ...prev, ...regionalInsights }));
      }

      // Start initial animations
      startInitialAnimations();

      // Pre-load necessary data
      await preloadAppData();

    } catch (error) {
      console.error('Welcome screen initialization failed:', error);
    }
  }, [isAuthenticated, hasCompletedOnboarding, navigation]);

  const fetchRegionalMarketInsights = useCallback(async (region) => {
    try {
      const insights = await marketService.getRegionalInsights(region);
      
      await analyticsService.trackEvent('regional_insights_loaded', {
        region,
        insightCount: Object.keys(insights).length
      });

      return insights;
    } catch (error) {
      console.warn('Regional insights fetch failed:', error);
      return {};
    }
  }, []);

  const preloadAppData = useCallback(async () => {
    // Pre-load essential app data in background
    Promise.all([
      securityService.initializeSecurity(),
      marketService.preloadMarketData(),
      analyticsService.initializeAnalytics()
    ]).catch(error => {
      console.warn('Preload failed:', error);
    });
  }, []);

  // ==================== ENTERPRISE ANIMATION FUNCTIONS ====================
  const startInitialAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const animateStepTransition = useCallback(() => {
    // Reset animations for new step
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    // Animate features when reaching features step
    if (currentStep === WELCOME_STEPS.FEATURES) {
      animateFeaturesEntrance();
    }
  }, [currentStep, fadeAnim, slideAnim]);

  const animateFeaturesEntrance = useCallback(() => {
    featureAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 200,
        useNativeDriver: true,
      }).start();
    });
  }, [featureAnimations]);

  const getFeatureAnimationStyle = (index) => {
    return {
      opacity: featureAnimations[index],
      transform: [
        {
          translateY: featureAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        },
      ],
    };
  };

  // ==================== ENTERPRISE NAVIGATION FUNCTIONS ====================
  const handleNextStep = useCallback(() => {
    if (currentStep < WELCOME_STEPS.GET_STARTED) {
      setCurrentStep(prev => prev + 1);
      
      // Track step progression
      trackUserFlow('welcome_step_completed', { 
        step: currentStep,
        totalSteps: Object.keys(WELCOME_STEPS).length 
      });
    } else {
      handleGetStarted();
    }
  }, [currentStep]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > WELCOME_STEPS.WELCOME) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkipToEnd = useCallback(() => {
    setCurrentStep(WELCOME_STEPS.GET_STARTED);
    
    trackEvent('welcome_skipped', {
      skippedFromStep: currentStep,
      totalStepsSkipped: WELCOME_STEPS.GET_STARTED - currentStep
    });
  }, [currentStep]);

  const handleGetStarted = useCallback(() => {
    trackUserFlow('welcome_completed', {
      selectedLanguage,
      biometricAvailable,
      userRegion
    });

    // Navigate based on authentication status
    if (isAuthenticated && !hasCompletedOnboarding) {
      navigation.navigate('RoleSelection');
    } else if (isAuthenticated) {
      navigation.replace('Main');
    } else {
      navigation.navigate('Auth', { screen: 'Login' });
    }
  }, [isAuthenticated, hasCompletedOnboarding, selectedLanguage, biometricAvailable, userRegion, navigation]);

  const handleLanguageSelect = useCallback((language) => {
    setSelectedLanguage(language);
    
    trackEvent('language_selected', { 
      language,
      context: 'welcome_screen'
    });
  }, []);

  // ==================== ENTERPRISE RENDER FUNCTIONS ====================
  const renderStepIndicator = () => {
    const totalSteps = Object.keys(WELCOME_STEPS).length;
    
    return (
      <View style={styles.stepIndicator}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.stepDot,
              index === currentStep && styles.stepDotActive,
              index < currentStep && styles.stepDotCompleted
            ]}
          />
        ))}
      </View>
    );
  };

  const renderWelcomeStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      {/* App Logo/Brand */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🏗️</Text>
        <ThemedText type="title" style={styles.appTitle}>
          Yachi
        </ThemedText>
        <ThemedText type="subtitle" style={styles.appSubtitle}>
          የኢትዮጵያ የ AI-የሚያመቻች ግንባታ መተግበሪያ
        </ThemedText>
      </View>

      {/* Security Badge */}
      <SecurityBadge 
        level="enterprise" 
        message="ደህንነታዊ የግንባታ መተግበሪያ"
        style={styles.securityBadge}
      />

      {/* Market Presence */}
      <View style={styles.marketPresence}>
        <ThemedText type="caption" style={styles.marketTitle}>
          በኢትዮጵያ ሙሉ የምንገለግል
        </ThemedText>
        <View style={styles.regionTags}>
          {ETHIOPIAN_REGIONS.slice(0, 4).map(region => (
            <View key={region.value} style={styles.regionTag}>
              <ThemedText type="caption" style={styles.regionText}>
                {region.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            50,000+
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            የተጠቃሚዎች
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            15,000+
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            ሰራተኞች
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            8+
          </ThemedText>
          <ThemedText type="caption" style={styles.statLabel}>
            ክልሎች
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  const renderFeaturesStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <ThemedText type="title" style={styles.sectionTitle}>
        ዋና ዋና ባህሪዎች
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.sectionSubtitle}>
        የ AI-የሚያመቻች ግንባታ እድገት ለኢትዮጵያ
      </ThemedText>

      <View style={styles.featuresGrid}>
        {FEATURES.map((feature, index) => (
          <Animated.View
            key={index}
            style={[
              styles.featureCard,
              getFeatureAnimationStyle(index)
            ]}
          >
            <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
              <Text style={styles.featureEmoji}>{feature.icon}</Text>
            </View>
            
            <ThemedText type="subtitle" style={styles.featureTitle}>
              {feature.title}
            </ThemedText>
            
            <ThemedText type="caption" style={styles.featureDescription}>
              {feature.description}
            </ThemedText>
          </Animated.View>
        ))}
      </View>

      {/* Construction Specialization */}
      <View style={styles.specialization}>
        <ThemedText type="caption" style={styles.specializationTitle}>
          🎯 የግንባታ ልዩ ባህሪዎች:
        </ThemedText>
        <ThemedText type="caption">
          • የ AI-ሰራተኞች ማጣመር • የመንግሥት ፕሮጀክቶች • የበጀት አመቻች • የፊልድ እይታ
        </ThemedText>
      </View>
    </Animated.View>
  );

  const renderMarketInsightsStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <ThemedText type="title" style={styles.sectionTitle}>
        የግንባታ ገበያ እውነታዎች
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.sectionSubtitle}>
        በኢትዮጵያ ውስጥ ያለው የግንባታ ኢንዱስትሪ ሁኔታ
      </ThemedText>

      <View style={styles.insightsContainer}>
        {Object.entries(marketInsights).map(([key, insight]) => (
          <MarketInsightCard
            key={key}
            title={insight.title}
            value={insight.value}
            description={insight.description}
            trend={insight.trend}
            region={insight.region}
            style={styles.insightCard}
          />
        ))}
      </View>

      {/* Regional Focus */}
      <View style={styles.regionalFocus}>
        <ThemedText type="caption" style={styles.regionalTitle}>
          🌍 የአካባቢ ትኩረት: {userRegion}
        </ThemedText>
        <ThemedText type="caption">
          የግንባታ እድገት በ{userRegion} ክልል በከፍተኛ ሁኔታ እየጨመረ ነው
        </ThemedText>
      </View>
    </Animated.View>
  );

  const renderGetStartedStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <ThemedText type="title" style={styles.sectionTitle}>
        እንኳን ደህና መጡ!
      </ThemedText>
      
      <ThemedText type="subtitle" style={styles.sectionSubtitle}>
        የኢትዮጵያ የግንባታ ማህበረሰብ ይቀላቀሉ
      </ThemedText>

      {/* Language Selection */}
      <View style={styles.languageSection}>
        <ThemedText type="subtitle" style={styles.languageTitle}>
          ቋንቋ ይምረጡ
        </ThemedText>
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageSelect={handleLanguageSelect}
          availableLanguages={[LANGUAGES.AMHARIC, LANGUAGES.ENGLISH, LANGUAGES.OROMIFFA]}
          style={styles.languageSelector}
        />
      </View>

      {/* Authentication Options */}
      <View style={styles.authOptions}>
        <Button
          title="መለያ ይፍጠሩ"
          onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
          type="primary"
          size="large"
          style={styles.authButton}
        />
        
        <Button
          title="መግባት"
          onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          type="outline"
          size="large"
          style={styles.authButton}
        />

        {biometricAvailable && (
          <Button
            title="ባዮሜትሪክ መግባት"
            onPress={() => navigation.navigate('Auth', { screen: 'BiometricLogin' })}
            type="text"
            icon="fingerprint"
            style={styles.biometricButton}
          />
        )}
      </View>

      {/* Quick Access for Returning Users */}
      {isAuthenticated && (
        <View style={styles.quickAccess}>
          <ThemedText type="caption" style={styles.quickAccessTitle}>
            ፈጣን መዳረሻ
          </ThemedText>
          <Button
            title="ወደ መተግበሪያው ይሂዱ"
            onPress={() => navigation.replace('Main')}
            type="primary"
            size="small"
          />
        </View>
      )}

      {/* Security Assurance */}
      <View style={styles.securityAssurance}>
        <SecurityBadge 
          level="high" 
          message="100% ደህንነታዊ የግንባታ መረጃ"
          size="small"
        />
        <ThemedText type="caption" style={styles.securityText}>
          ሁሉም የግንባታ መረጃዎች የሚፀድቁ እና ደህንነታዊ ናቸው
        </ThemedText>
      </View>
    </Animated.View>
  );

  // ==================== MAIN RENDER ====================
  const renderCurrentStep = () => {
    switch (currentStep) {
      case WELCOME_STEPS.WELCOME:
        return renderWelcomeStep();
      case WELCOME_STEPS.FEATURES:
        return renderFeaturesStep();
      case WELCOME_STEPS.MARKET_INSIGHTS:
        return renderMarketInsightsStep();
      case WELCOME_STEPS.GET_STARTED:
        return renderGetStartedStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background.primary}
      />
      
      {/* Header with Language & Theme Toggle */}
      <View style={styles.header}>
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageSelect={handleLanguageSelect}
          availableLanguages={[LANGUAGES.AMHARIC, LANGUAGES.ENGLISH]}
          compact={true}
        />
        
        <TouchableOpacity 
          style={styles.themeToggle}
          onPress={toggleTheme}
        >
          <Text style={styles.themeIcon}>
            {isDark ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        {renderStepIndicator()}
        
        <View style={styles.navigation}>
          {currentStep > WELCOME_STEPS.WELCOME && (
            <Button
              title="ወደ ኋላ"
              onPress={handlePreviousStep}
              type="outline"
              style={styles.navButton}
            />
          )}
          
          {currentStep < WELCOME_STEPS.GET_STARTED && (
            <Button
              title="ቀጣይ"
              onPress={handleNextStep}
              style={styles.navButton}
            />
          )}

          {currentStep < WELCOME_STEPS.GET_STARTED - 1 && (
            <Button
              title="ዝለል"
              onPress={handleSkipToEnd}
              type="text"
              style={styles.skipButton}
            />
          )}
        </View>
      </View>
    </ThemedView>
  );
};

// ==================== ENTERPRISE STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.md,
  },
  themeToggle: {
    padding: SPACING.sm,
  },
  themeIcon: {
    fontSize: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT * 0.6,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  appSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  securityBadge: {
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  marketPresence: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  marketTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  regionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  regionTag: {
    backgroundColor: COLORS.primary.light + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  regionText: {
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    opacity: 0.8,
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  featuresGrid: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  featureCard: {
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.lg,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureTitle: {
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  featureDescription: {
    textAlign: 'center',
    lineHeight: 18,
  },
  specialization: {
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: 8,
  },
  specializationTitle: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  insightsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  insightCard: {
    marginBottom: SPACING.md,
  },
  regionalFocus: {
    backgroundColor: COLORS.semantic.info.light + '20',
    padding: SPACING.md,
    borderRadius: 8,
  },
  regionalTitle: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  languageSection: {
    marginBottom: SPACING.xl,
  },
  languageTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  languageSelector: {
    marginBottom: SPACING.lg,
  },
  authOptions: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  authButton: {
    marginBottom: SPACING.sm,
  },
  biometricButton: {
    marginTop: SPACING.sm,
  },
  quickAccess: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  quickAccessTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  securityAssurance: {
    alignItems: 'center',
  },
  securityText: {
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  footer: {
    padding: SPACING.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border.primary,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary.main,
    width: 20,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.semantic.success.main,
  },
  navigation: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  navButton: {
    flex: 1,
  },
  skipButton: {
    flex: 0.5,
  },
});

export default WelcomeScreen;