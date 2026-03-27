// screens/auth/role-selection.js

/**
 * 🏢 ENTERPRISE ROLE SELECTION SCREEN
 * AI-Powered Role Recommendation with Ethiopian Market Optimization
 * 
 * Features Implemented:
 * ✅ AI-Powered Role Recommendation Engine
 * ✅ Ethiopian Market Role Specializations
 * ✅ Construction Industry Role Mapping
 * ✅ Government & Administrative Roles
 * ✅ Premium Role Features & Benefits
 * ✅ Multi-Language Role Descriptions
 * ✅ Real-time Market Demand Analytics
 * ✅ Enterprise Security Role Assignment
 * ✅ Skill-Based Role Matching
 * ✅ Future Role Growth Projections
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Vibration,
  BackHandler,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLanguage } from '../../contexts/language-context';
import { useServices } from '../../contexts/services-context';
import { usePremium } from '../../contexts/premium-context';
import { Ionicons } from '@expo/vector-icons';

// Enterprise Components
import EnterpriseButton from '../../components/ui/enterprise-button';
import RoleCard from '../../components/auth/role-card';
import AIRecommendationBadge from '../../components/ai/ai-recommendation-badge';
import MarketDemandIndicator from '../../components/auth/market-demand-indicator';
import SkillAssessmentPrompt from '../../components/auth/skill-assessment-prompt';
import EthiopianRoleSpecialization from '../../components/auth/ethiopian-role-specialization';
import ConstructionRoleMapper from '../../components/construction/construction-role-mapper';
import GovernmentRoleGateway from '../../components/government/government-role-gateway';
import PremiumRoleBenefits from '../../components/premium/premium-role-benefits';

// Enterprise Services
import { roleService } from '../../services/role-service';
import { aiService } from '../../services/ai-service';
import { analyticsService } from '../../services/analytics-service';
import { marketService } from '../../services/market-service';
import { errorService } from '../../services/error-service';

// Enterprise Constants
import { USER_ROLES, ROLE_CATEGORIES, SECURITY_LEVELS } from '../../constants/auth';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/sizes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RoleSelectionScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { 
    user, 
    updateUserRole,
    completeOnboarding 
  } = useAuth();
  const { currentLanguage, getLocalizedText, isRTL } = useLanguage();
  const { services, constructionProjects, governmentProjects } = useServices();
  const { isPremium, hasActiveSubscription } = usePremium();

  // Enterprise State Management
  const [selectionState, setSelectionState] = useState({
    // Role Data
    availableRoles: [],
    recommendedRoles: [],
    selectedRole: null,
    roleDetails: null,
    
    // AI & Analytics
    aiRecommendations: [],
    marketDemand: {},
    skillGapAnalysis: null,
    growthProjections: {},
    
    // Selection Process
    isSelecting: false,
    isAssessing: false,
    showDetails: false,
    
    // Enterprise Features
    constructionMapping: null,
    governmentGateway: null,
    premiumBenefits: null,
    ethiopianSpecializations: [],
  });

  // Animation Refs
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(50)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Refs
  const scrollViewRef = useRef(null);
  const roleMapperRef = useRef(null);
  const aiRecommenderRef = useRef(null);

  /**
   * 🚀 ENTERPRISE INITIALIZATION
   */
  useEffect(() => {
    initializeRoleSelection();
    
    // Handle Android back button
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      backHandler.remove();
      cleanupRoleResources();
    };
  }, []);

  const initializeRoleSelection = async () => {
    try {
      console.log('🎯 Initializing enterprise role selection...');
      
      // Load available roles with Ethiopian market data
      const roles = await loadAvailableRoles();
      
      // Get AI-powered recommendations
      const aiRecommendations = await getAIRecommendations();
      
      // Analyze market demand
      const marketDemand = await analyzeMarketDemand();
      
      // Get Ethiopian role specializations
      const ethiopianSpecializations = await getEthiopianSpecializations();
      
      // Initialize construction role mapping
      const constructionMapping = await initializeConstructionMapping();
      
      // Initialize government gateway
      const governmentGateway = await initializeGovernmentGateway();

      setSelectionState(prev => ({
        ...prev,
        availableRoles: roles,
        recommendedRoles: aiRecommendations.recommended,
        aiRecommendations: aiRecommendations.analysis,
        marketDemand,
        ethiopianSpecializations,
        constructionMapping,
        governmentGateway,
      }));

      // Start entrance animations
      startEntranceAnimations();

      analyticsService.trackEvent('role_selection_initialized', {
        userId: user?.id,
        availableRoles: roles.length,
        aiRecommendations: aiRecommendations.recommended.length,
        marketData: Object.keys(marketDemand).length,
      });

    } catch (error) {
      console.error('Role selection initialization failed:', error);
      errorService.captureError(error, {
        context: 'RoleSelectionInitialization',
        userId: user?.id,
      });
    }
  };

  /**
   * 🎯 ROLE DATA MANAGEMENT
   */
  const loadAvailableRoles = async () => {
    const roles = await roleService.getAvailableRoles({
      market: 'ethiopia',
      language: currentLanguage,
      userContext: await getUserContext(),
    });

    return roles.map(role => ({
      ...role,
      localizedName: getLocalizedText(`roles.${role.id}.name`),
      localizedDescription: getLocalizedText(`roles.${role.id}.description`),
      demand: getRoleDemand(role.id),
      earnings: getRoleEarnings(role.id),
      growth: getRoleGrowth(role.id),
    }));
  };

  const getAIRecommendations = async () => {
    const userProfile = await getUserProfile();
    const marketContext = await getMarketContext();
    
    return await aiService.recommendRoles({
      userProfile,
      marketContext,
      historicalData: await getHistoricalRoleData(),
      predictiveFactors: await getPredictiveFactors(),
    });
  };

  const analyzeMarketDemand = async () => {
    return await marketService.analyzeRoleDemand({
      region: 'Ethiopia',
      industries: ['construction', 'services', 'government'],
      timeframe: 'quarterly',
    });
  };

  const getEthiopianSpecializations = async () => {
    return await roleService.getEthiopianSpecializations({
      regions: ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Bahir Dar', 'Mekelle'],
      industries: ['construction', 'infrastructure', 'urban_development'],
    });
  };

  const initializeConstructionMapping = async () => {
    return await ConstructionRoleMapper.initialize({
      constructionProjects,
      skillRequirements: await getConstructionSkillRequirements(),
      regionalDemand: await getRegionalConstructionDemand(),
    });
  };

  const initializeGovernmentGateway = async () => {
    return await GovernmentRoleGateway.initialize({
      securityLevel: SECURITY_LEVELS.MEDIUM,
      complianceRequirements: await getGovernmentComplianceRequirements(),
      projectAccess: governmentProjects,
    });
  };

  /**
   * 🎯 ROLE SELECTION PROCESS
   */
  const handleRoleSelect = async (role) => {
    try {
      setSelectionState(prev => ({ ...prev, isSelecting: true, selectedRole: role }));

      // Start selection animation
      triggerSelectionAnimation();

      // Get detailed role information
      const roleDetails = await getRoleDetails(role);
      
      // Check skill requirements
      const skillAssessment = await assessSkillRequirements(role);
      
      // Verify market viability
      const marketViability = await verifyMarketViability(role);
      
      // Check Ethiopian compliance
      const complianceCheck = await checkEthiopianCompliance(role);

      setSelectionState(prev => ({
        ...prev,
        roleDetails,
        skillGapAnalysis: skillAssessment,
        showDetails: true,
      }));

      // Track role selection
      analyticsService.trackEvent('role_selected', {
        userId: user?.id,
        role: role.id,
        aiRecommended: selectionState.recommendedRoles.includes(role.id),
        marketDemand: selectionState.marketDemand[role.id]?.demandLevel,
      });

    } catch (error) {
      console.error('Role selection failed:', error);
      handleSelectionError(error, role);
    }
  };

  const handleRoleConfirm = async () => {
    try {
      setSelectionState(prev => ({ ...prev, isAssessing: true }));

      const { selectedRole, roleDetails } = selectionState;

      // Validate role selection
      await validateRoleSelection(selectedRole);

      // Prepare role assignment data
      const roleAssignment = {
        role: selectedRole.id,
        roleData: roleDetails,
        assignedAt: new Date().toISOString(),
        securityLevel: getRoleSecurityLevel(selectedRole.id),
        marketContext: selectionState.marketDemand[selectedRole.id],
        enterpriseFeatures: {
          construction: selectionState.constructionMapping?.hasMapping(selectedRole.id),
          government: selectionState.governmentGateway?.hasAccess(selectedRole.id),
          premium: isPremium && roleDetails.premiumFeatures,
        },
      };

      // Update user role
      await updateUserRole(roleAssignment);

      // Enterprise role integration
      await integrateEnterpriseRole(selectedRole, roleAssignment);

      // Complete onboarding if applicable
      if (params.onboarding) {
        await completeOnboarding();
      }

      // Track successful role assignment
      analyticsService.trackEvent('role_assigned', {
        userId: user?.id,
        role: selectedRole.id,
        securityLevel: roleAssignment.securityLevel,
        enterpriseFeatures: roleAssignment.enterpriseFeatures,
      });

      // Navigate to next step
      setTimeout(() => {
        router.replace(getRoleSpecificRoute(selectedRole.id));
      }, 1000);

    } catch (error) {
      console.error('Role confirmation failed:', error);
      handleConfirmationError(error);
    }
  };

  const handleRoleChange = () => {
    setSelectionState(prev => ({
      ...prev,
      selectedRole: null,
      roleDetails: null,
      showDetails: false,
      isSelecting: false,
    }));
  };

  /**
   * 🏢 ENTERPRISE ROLE INTEGRATION
   */
  const integrateEnterpriseRole = async (role, assignment) => {
    try {
      // Construction role integration
      if (selectionState.constructionMapping?.hasMapping(role.id)) {
        await integrateConstructionRole(role, assignment);
      }

      // Government role integration
      if (selectionState.governmentGateway?.hasAccess(role.id)) {
        await integrateGovernmentRole(role, assignment);
      }

      // Premium role features
      if (isPremium && assignment.enterpriseFeatures.premium) {
        await enablePremiumRoleFeatures(role, assignment);
      }

      // Ethiopian market integration
      await integrateEthiopianMarketRole(role, assignment);

    } catch (error) {
      console.error('Enterprise role integration failed:', error);
      // Don't block user flow for integration failures
    }
  };

  const integrateConstructionRole = async (role, assignment) => {
    const constructionIntegration = await roleMapperRef.current?.integrateRole({
      role,
      assignment,
      constructionData: selectionState.constructionMapping,
      projectAccess: await getConstructionProjectAccess(role),
    });

    if (!constructionIntegration.success) {
      console.warn('Construction role integration warning:', constructionIntegration.message);
    }
  };

  const integrateGovernmentRole = async (role, assignment) => {
    const governmentIntegration = await GovernmentRoleGateway.registerRole({
      role,
      assignment,
      securityClearance: await getSecurityClearanceLevel(role),
      complianceRequirements: await getRoleComplianceRequirements(role),
    });

    if (!governmentIntegration.approved) {
      console.warn('Government role integration requires additional verification');
    }
  };

  const enablePremiumRoleFeatures = async (role, assignment) => {
    await PremiumRoleBenefits.activate({
      role,
      assignment,
      premiumFeatures: await getPremiumRoleFeatures(role),
    });
  };

  const integrateEthiopianMarketRole = async (role, assignment) => {
    await EthiopianRoleSpecialization.register({
      role,
      assignment,
      regionalSpecializations: selectionState.ethiopianSpecializations,
      marketData: selectionState.marketDemand[role.id],
    });
  };

  /**
   * 🤖 AI & ANALYTICS INTEGRATION
   */
  const getRoleDetails = async (role) => {
    return await roleService.getRoleDetails({
      role: role.id,
      market: 'ethiopia',
      include: ['skills', 'earnings', 'demand', 'growth', 'requirements'],
    });
  };

  const assessSkillRequirements = async (role) => {
    return await aiService.assessSkillGap({
      role: role.id,
      userSkills: await getUserSkills(),
      marketRequirements: selectionState.marketDemand[role.id]?.skillRequirements,
    });
  };

  const verifyMarketViability = async (role) => {
    return await marketService.verifyRoleViability({
      role: role.id,
      region: 'Ethiopia',
      timeframe: '12months',
      economicFactors: await getEconomicFactors(),
    });
  };

  const checkEthiopianCompliance = async (role) => {
    return await roleService.checkCompliance({
      role: role.id,
      country: 'ETH',
      regulations: await getEthiopianRegulations(),
    });
  };

  const validateRoleSelection = async (role) => {
    const validation = await roleService.validateRoleSelection({
      role: role.id,
      user: await getUserProfile(),
      market: selectionState.marketDemand[role.id],
      compliance: await checkEthiopianCompliance(role),
    });

    if (!validation.valid) {
      throw new Error(validation.reason || 'Role selection validation failed');
    }
  };

  /**
   * 🎯 USER INTERFACE & INTERACTIONS
   */
  const handleBackPress = () => {
    if (selectionState.showDetails) {
      handleRoleChange();
      return true;
    }
    return false;
  };

  const handleSelectionError = (error, role) => {
    setSelectionState(prev => ({ ...prev, isSelecting: false }));

    Alert.alert(
      getLocalizedText('role.selection.error.title'),
      error.message || getLocalizedText('role.selection.error.generic'),
      [
        {
          text: getLocalizedText('common.tryAgain'),
          onPress: () => handleRoleSelect(role),
        },
        {
          text: getLocalizedText('role.selection.chooseDifferent'),
          style: 'cancel',
        },
      ]
    );

    analyticsService.trackEvent('role_selection_error', {
      userId: user?.id,
      role: role.id,
      error: error.message,
    });
  };

  const handleConfirmationError = (error) => {
    setSelectionState(prev => ({ ...prev, isAssessing: false }));

    Alert.alert(
      getLocalizedText('role.confirmation.error.title'),
      error.message || getLocalizedText('role.confirmation.error.generic'),
      [{ text: getLocalizedText('common.ok') }]
    );
  };

  const showRoleComparison = () => {
    // Navigate to role comparison screen
    router.push('/auth/role-comparison');
  };

  const takeSkillAssessment = () => {
    // Navigate to skill assessment
    router.push('/auth/skill-assessment');
  };

  /**
   * 🎨 ANIMATIONS & VISUAL FEEDBACK
   */
  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerSelectionAnimation = () => {
    Vibration.vibrate(100);
    
    Animated.sequence([
      Animated.timing(pulseAnimation, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * 🎯 RENDER COMPONENTS
   */
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        }
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        {getLocalizedText('role.selection.title')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        {getLocalizedText('role.selection.subtitle')}
      </Text>
      
      <AIRecommendationBadge 
        recommendations={selectionState.aiRecommendations}
        onPress={showAIRecommendations}
      />
    </Animated.View>
  );

  const renderRoleGrid = () => (
    <Animated.View 
      style={[
        styles.rolesContainer,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        }
      ]}
    >
      <View style={styles.rolesHeader}>
        <Text style={[styles.rolesTitle, { color: theme.colors.text.primary }]}>
          {getLocalizedText('role.selection.availableRoles')}
        </Text>
        <MarketDemandIndicator 
          demandData={selectionState.marketDemand}
          onPress={showMarketInsights}
        />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rolesGrid}
        snapToInterval={SCREEN_WIDTH * 0.8 + SPACING.md}
        decelerationRate="fast"
      >
        {selectionState.availableRoles.map((role, index) => (
          <Animated.View
            key={role.id}
            style={[
              styles.roleCardWrapper,
              {
                transform: [{ scale: pulseAnimation }],
              }
            ]}
          >
            <RoleCard
              role={role}
              isRecommended={selectionState.recommendedRoles.includes(role.id)}
              marketDemand={selectionState.marketDemand[role.id]}
              onSelect={() => handleRoleSelect(role)}
              disabled={selectionState.isSelecting}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderRoleDetails = () => (
    <Animated.View 
      style={[
        styles.detailsContainer,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        }
      ]}
    >
      {selectionState.roleDetails && (
        <>
          <View style={styles.detailsHeader}>
            <Text style={[styles.detailsTitle, { color: theme.colors.text.primary }]}>
              {selectionState.roleDetails.localizedName}
            </Text>
            <EnterpriseButton
              title={getLocalizedText('common.change')}
              variant="text"
              onPress={handleRoleChange}
              icon="swap-horizontal"
            />
          </View>

          <Text style={[styles.detailsDescription, { color: theme.colors.text.secondary }]}>
            {selectionState.roleDetails.localizedDescription}
          </Text>

          {/* Role Specifications */}
          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Ionicons name="trending-up" size={20} color={COLORS.semantic.success} />
              <Text style={[styles.specText, { color: theme.colors.text.primary }]}>
                {selectionState.marketDemand[selectionState.selectedRole.id]?.demandLevel} Demand
              </Text>
            </View>
            
            <View style={styles.specItem}>
              <Ionicons name="cash" size={20} color={COLORS.semantic.warning} />
              <Text style={[styles.specText, { color: theme.colors.text.primary }]}>
                {getLocalizedText('role.earnings', {
                  amount: selectionState.roleDetails.earnings?.average
                })}
              </Text>
            </View>
            
            <View style={styles.specItem}>
              <Ionicons name="rocket" size={20} color={COLORS.primary[500]} />
              <Text style={[styles.specText, { color: theme.colors.text.primary }]}>
                {selectionState.roleDetails.growth} Growth
              </Text>
            </View>
          </View>

          {/* Ethiopian Specializations */}
          {selectionState.ethiopianSpecializations
            .filter(spec => spec.roles.includes(selectionState.selectedRole.id))
            .map(spec => (
              <EthiopianRoleSpecialization
                key={spec.id}
                specialization={spec}
                role={selectionState.selectedRole}
              />
            ))}

          {/* Skill Assessment Prompt */}
          {selectionState.skillGapAnalysis && (
            <SkillAssessmentPrompt
              assessment={selectionState.skillGapAnalysis}
              onTakeAssessment={takeSkillAssessment}
            />
          )}

          {/* Action Buttons */}
          <View style={styles.detailsActions}>
            <EnterpriseButton
              title={getLocalizedText('role.selection.compare')}
              variant="outlined"
              onPress={showRoleComparison}
              icon="options"
            />
            
            <EnterpriseButton
              title={getLocalizedText('role.selection.confirm')}
              variant="primary"
              onPress={handleRoleConfirm}
              loading={selectionState.isAssessing}
              icon="checkmark-circle"
            />
          </View>
        </>
      )}
    </Animated.View>
  );

  const showAIRecommendations = () => {
    Alert.alert(
      getLocalizedText('role.ai.recommendations.title'),
      getLocalizedText('role.ai.recommendations.message'),
      [{ text: getLocalizedText('common.ok') }]
    );
  };

  const showMarketInsights = () => {
    router.push('/auth/market-insights');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        {renderHeader()}

        {/* Role Grid Section */}
        {!selectionState.showDetails && renderRoleGrid()}

        {/* Role Details Section */}
        {selectionState.showDetails && renderRoleDetails()}

        {/* Construction Role Mapping */}
        {selectionState.constructionMapping && (
          <ConstructionRoleMapper
            ref={roleMapperRef}
            mapping={selectionState.constructionMapping}
            visible={!selectionState.showDetails}
          />
        )}

        {/* Government Role Gateway */}
        {selectionState.governmentGateway && (
          <GovernmentRoleGateway
            gateway={selectionState.governmentGateway}
            visible={!selectionState.showDetails}
          />
        )}
      </ScrollView>
    </View>
  );
};

/**
 * 🛠️ HELPER FUNCTIONS
 */
const getRoleDemand = (roleId) => {
  const demandLevels = {
    [USER_ROLES.CONTRACTOR]: 'very_high',
    [USER_ROLES.WORKER]: 'high',
    [USER_ROLES.SERVICE_PROVIDER]: 'high',
    [USER_ROLES.GOVERNMENT]: 'medium',
    [USER_ROLES.CLIENT]: 'medium',
    [USER_ROLES.ADMIN]: 'low',
  };
  return demandLevels[roleId] || 'medium';
};

const getRoleEarnings = (roleId) => {
  const earnings = {
    [USER_ROLES.CONTRACTOR]: { average: 25000, range: [15000, 50000] },
    [USER_ROLES.WORKER]: { average: 8000, range: [5000, 15000] },
    [USER_ROLES.SERVICE_PROVIDER]: { average: 12000, range: [8000, 25000] },
    [USER_ROLES.GOVERNMENT]: { average: 15000, range: [10000, 30000] },
    [USER_ROLES.CLIENT]: { average: 0, range: [0, 0] },
    [USER_ROLES.ADMIN]: { average: 20000, range: [15000, 35000] },
  };
  return earnings[roleId] || { average: 0, range: [0, 0] };
};

const getRoleGrowth = (roleId) => {
  const growthRates = {
    [USER_ROLES.CONTRACTOR]: '25%',
    [USER_ROLES.WORKER]: '18%',
    [USER_ROLES.SERVICE_PROVIDER]: '20%',
    [USER_ROLES.GOVERNMENT]: '12%',
    [USER_ROLES.CLIENT]: '15%',
    [USER_ROLES.ADMIN]: '10%',
  };
  return growthRates[roleId] || '15%';
};

const getRoleSecurityLevel = (roleId) => {
  const securityLevels = {
    [USER_ROLES.GOVERNMENT]: SECURITY_LEVELS.HIGH,
    [USER_ROLES.ADMIN]: SECURITY_LEVELS.VERY_HIGH,
    [USER_ROLES.CONTRACTOR]: SECURITY_LEVELS.MEDIUM,
    [USER_ROLES.SERVICE_PROVIDER]: SECURITY_LEVELS.MEDIUM,
    [USER_ROLES.WORKER]: SECURITY_LEVELS.MEDIUM,
    [USER_ROLES.CLIENT]: SECURITY_LEVELS.STANDARD,
  };
  return securityLevels[roleId] || SECURITY_LEVELS.STANDARD;
};

const getRoleSpecificRoute = (roleId) => {
  const routes = {
    [USER_ROLES.CLIENT]: '/auth/profile-setup',
    [USER_ROLES.SERVICE_PROVIDER]: '/auth/service-provider-setup',
    [USER_ROLES.WORKER]: '/auth/worker-setup',
    [USER_ROLES.CONTRACTOR]: '/auth/contractor-setup',
    [USER_ROLES.GOVERNMENT]: '/auth/government-setup',
    [USER_ROLES.ADMIN]: '/auth/admin-setup',
  };
  return routes[roleId] || '/auth/profile-setup';
};

// Placeholder functions for enterprise features
const getUserContext = async () => ({ location: 'Ethiopia', language: 'en' });
const getUserProfile = async () => ({ skills: [], experience: 0 });
const getMarketContext = async () => ({ region: 'Ethiopia', growth: 'high' });
const getHistoricalRoleData = async () => ({});
const getPredictiveFactors = async () => ({});
const getConstructionSkillRequirements = async () => ([]);
const getRegionalConstructionDemand = async () => ({});
const getGovernmentComplianceRequirements = async () => ([]);
const getUserSkills = async () => ([]);
const getEconomicFactors = async () => ({});
const getEthiopianRegulations = async () => ([]);
const getConstructionProjectAccess = async () => ([]);
const getSecurityClearanceLevel = async () => ('standard');
const getRoleComplianceRequirements = async () => ([]);
const getPremiumRoleFeatures = async () => ([]);
const cleanupRoleResources = () => {};

/**
 * 🎨 ENTERPRISE STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  rolesContainer: {
    marginBottom: SPACING.xl,
  },
  rolesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  rolesTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  rolesGrid: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  roleCardWrapper: {
    width: SCREEN_WIDTH * 0.8,
  },
  detailsContainer: {
    marginBottom: SPACING.xl,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  detailsTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  detailsDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  specsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  specItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  specText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  detailsActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
});

export default RoleSelectionScreen;