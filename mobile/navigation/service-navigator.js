// navigation/service-navigator.js

/**
 * 🏢 ENTERPRISE SERVICE NAVIGATOR
 * AI-Powered Service Marketplace with Construction & Government Integration
 * 
 * Features Implemented:
 * ✅ AI-Powered Service Matching & Recommendations
 * ✅ Construction Service Management & Team Formation
 * ✅ Government Service Integration & Compliance
 * ✅ Ethiopian Market Optimization & Localization
 * ✅ Premium Service Features & Monetization
 * ✅ Real-time Service Discovery & Booking
 * ✅ Multi-language Service Listings
 * ✅ Advanced Search with Voice & Image
 * ✅ Service Provider Verification & Rating
 * ✅ Enterprise Security & Compliance
 */

import React, { useEffect, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';
import { useServices } from '../contexts/services-context';
import { usePremium } from '../contexts/premium-context';
import { useLanguage } from '../contexts/language-context';
import { useLocation } from '../contexts/location-context';

// Enterprise Service Screens
import ServicesListScreen from '../screens/services/list';
import ServiceDetailScreen from '../screens/services/detail';
import CreateServiceScreen from '../screens/services/create';
import ServiceSearchScreen from '../screens/services/search';
import CategoryServicesScreen from '../screens/services/category';
import ProviderProfileScreen from '../screens/services/provider-profile';
import ServiceBookingScreen from '../screens/services/booking';
import ServiceReviewsScreen from '../screens/services/reviews';
import ServiceAvailabilityScreen from '../screens/services/availability';
import ServicePricingScreen from '../screens/services/pricing';
import ConstructionServiceScreen from '../screens/services/construction-service';
import GovernmentServiceScreen from '../screens/services/government-service';
import AIServiceMatchingScreen from '../screens/services/ai-matching-service';
import PremiumServiceListingScreen from '../screens/services/premium-listing';

// Enterprise Components
import EnterpriseNavbar from '../components/enterprise/enterprise-navbar';
import ServiceSearchHeader from '../components/service/service-search-header';
import AIRecommendationBadge from '../components/service/ai-recommendation-badge';
import PremiumServiceBadge from '../components/premium/premium-service-badge';
import ConstructionServiceTag from '../components/service/construction-service-tag';
import GovernmentComplianceBadge from '../components/service/government-compliance-badge';

// Enterprise Constants
import { 
  NAVIGATION_ROUTES, 
  USER_ROLES,
  SERVICE_CATEGORIES,
  SERVICE_TYPES 
} from '../constants/navigation';
import { COLORS } from '../constants/colors';
import { SERVICE_FEATURES, AI_MATCHING_LEVELS } from '../constants/service';

const Stack = createNativeStackNavigator();

const ServicesNavigator = () => {
  const { theme, isDark } = useTheme();
  const { 
    user, 
    userRole, 
    isAuthenticated,
    hasGovernmentAccess 
  } = useAuth();
  const { 
    services, 
    featuredServices, 
    aiRecommendedServices,
    constructionServices,
    governmentServices 
  } = useServices();
  const { isPremium, hasActiveSubscription } = usePremium();
  const { currentLanguage, isRTL } = useLanguage();
  const { currentLocation, currentRegion } = useLocation();
  
  const navigationRef = useRef();
  const [serviceContext, setServiceContext] = useState({
    currentCategory: null,
    searchFilters: {},
    aiRecommendations: [],
    constructionMode: false,
    governmentMode: false,
  });

  // Enterprise Service Header Configuration
  const enterpriseHeaderOptions = {
    headerStyle: {
      backgroundColor: theme.colors.background.primary,
      elevation: 2,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    headerTintColor: theme.colors.text.primary,
    headerTitleStyle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      fontWeight: '600',
    },
    headerBackTitleVisible: false,
    headerBackButtonMenuEnabled: true,
  };

  // Initialize enterprise service features
  useEffect(() => {
    initializeEnterpriseServices();
  }, []);

  const initializeEnterpriseServices = async () => {
    try {
      console.log('🚀 Initializing enterprise service marketplace...');
      
      // Load AI service recommendations
      await loadAIRecommendations();
      
      // Initialize construction services if applicable
      if (userRole === USER_ROLES.CONTRACTOR || userRole === USER_ROLES.WORKER) {
        await initializeConstructionServices();
      }
      
      // Initialize government services if applicable
      if (hasGovernmentAccess) {
        await initializeGovernmentServices();
      }
      
      // Set up real-time service updates
      await initializeRealTimeServiceUpdates();

    } catch (error) {
      console.error('Enterprise service initialization failed:', error);
      errorService.captureEnterpriseError(error, {
        context: 'ServiceInitialization',
        userId: user?.id,
      });
    }
  };

  return (
    <Stack.Navigator
      initialRouteName={NAVIGATION_ROUTES.SERVICES.LIST}
      screenOptions={{
        ...enterpriseHeaderOptions,
        animation: isRTL ? 'slide_from_left' : 'slide_from_right',
        animationDuration: 300,
        contentStyle: {
          backgroundColor: theme.colors.background.secondary,
        },
        gestureEnabled: true,
        gestureDirection: isRTL ? 'horizontal-inverted' : 'horizontal',
      }}
      ref={navigationRef}
    >
      {/* 🏠 SERVICE MARKETPLACE HUB */}
      <Stack.Screen
        name={NAVIGATION_ROUTES.SERVICES.LIST}
        component={ServicesListScreen}
        options={({ navigation }) => ({
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              title="Service Marketplace"
              subtitle={`${currentRegion?.name || 'Ethiopia'} • ${services.length} services`}
              showBackButton={false}
              showNotifications={true}
              customActions={[
                {
                  icon: 'search',
                  onPress: () => navigation.navigate(NAVIGATION_ROUTES.SERVICES.SEARCH),
                  badge: serviceContext.aiRecommendations.length,
                },
                {
                  icon: userRole === 'service_provider' ? 'add-circle' : 'filter',
                  onPress: () => userRole === 'service_provider' 
                    ? navigation.navigate(NAVIGATION_ROUTES.SERVICES.CREATE)
                    : navigation.navigate('AdvancedServiceFilter'),
                  accessibilityLabel: userRole === 'service_provider' ? 'Create service' : 'Filter services',
                },
                {
                  icon: 'rocket',
                  onPress: () => navigation.navigate('AIServiceMatching'),
                  badgeColor: COLORS.primary[500],
                },
              ]}
            />
          ),
        })}
      />

      {/* 🔍 ADVANCED SERVICE DISCOVERY */}
      <Stack.Group
        screenOptions={({ navigation }) => ({
          header: (props) => (
            <ServiceSearchHeader
              {...props}
              onVoiceSearch={() => navigation.navigate('VoiceServiceSearch')}
              onImageSearch={() => navigation.navigate('ImageServiceSearch')}
              onAIFilter={() => navigation.navigate('AIServiceFilter')}
              customActions={[
                {
                  icon: 'scan',
                  onPress: () => navigation.navigate('QRServiceScan'),
                },
              ]}
            />
          ),
        })}
      >
        {/* Intelligent Service Search */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.SERVICES.SEARCH}
          component={ServiceSearchScreen}
          options={{
            title: 'Discover Services',
            headerRight: () => (
              <AIRecommendationBadge 
                count={serviceContext.aiRecommendations.length}
              />
            ),
          }}
        />

        {/* Category-Based Services */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.SERVICES.CATEGORY}
          component={CategoryServicesScreen}
          options={({ route }) => ({
            title: getCategoryTitle(route.params?.category),
            headerRight: () => (
              <ConstructionServiceTag 
                category={route.params?.category}
                showIcon={isConstructionCategory(route.params?.category)}
              />
            ),
          })}
        />

        {/* AI-Powered Service Matching */}
        <Stack.Screen
          name="AIServiceMatching"
          component={AIServiceMatchingScreen}
          options={{
            title: 'AI Service Match',
            headerRight: () => (
              <AIRecommendationBadge level={AI_MATCHING_LEVELS.HIGH} />
            ),
          }}
        />
      </Stack.Group>

      {/* 🏗️ CONSTRUCTION SERVICES */}
      <Stack.Group
        screenOptions={({ navigation, route }) => ({
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              showBackButton={true}
              customActions={[
                {
                  icon: 'people',
                  onPress: () => navigation.navigate('ConstructionTeamFormation', {
                    projectId: route.params?.projectId,
                  }),
                },
                {
                  icon: 'analytics',
                  onPress: () => navigation.navigate('ConstructionAnalytics', {
                    projectId: route.params?.projectId,
                  }),
                },
              ]}
            />
          ),
        })}
      >
        {/* Construction Service Details */}
        <Stack.Screen
          name="ConstructionService"
          component={ConstructionServiceScreen}
          options={({ route }) => ({
            title: 'Construction Service',
            headerRight: () => (
              <ConstructionServiceTag 
                type={route.params?.constructionType}
                size="large"
              />
            ),
          })}
        />

        {/* AI Construction Team Matching */}
        <Stack.Screen
          name="ConstructionTeamFormation"
          component={ConstructionTeamFormationScreen}
          options={{
            title: 'AI Team Formation',
            headerRight: () => (
              <AIRecommendationBadge level={AI_MATCHING_LEVELS.VERY_HIGH} />
            ),
          }}
        />

        {/* Construction Project Analytics */}
        <Stack.Screen
          name="ConstructionAnalytics"
          component={ConstructionAnalyticsScreen}
          options={{
            title: 'Project Analytics',
          }}
        />
      </Stack.Group>

      {/* 🏛️ GOVERNMENT SERVICES */}
      {hasGovernmentAccess && (
        <Stack.Group
          screenOptions={({ navigation, route }) => ({
            header: (props) => (
              <EnterpriseNavbar
                {...props}
                showBackButton={true}
                customActions={[
                  {
                    icon: 'shield-checkmark',
                    onPress: () => navigation.navigate('GovernmentCompliance', {
                      projectId: route.params?.projectId,
                    }),
                  },
                  {
                    icon: 'document',
                    onPress: () => navigation.navigate('GovernmentDocuments', {
                      projectId: route.params?.projectId,
                    }),
                  },
                ]}
              />
            ),
          })}
        >
          {/* Government Service Management */}
          <Stack.Screen
            name="GovernmentService"
            component={GovernmentServiceScreen}
            options={({ route }) => ({
              title: 'Government Service',
              headerRight: () => (
                <GovernmentComplianceBadge 
                  level={route.params?.complianceLevel}
                />
              ),
            })}
          />

          {/* Government Compliance */}
          <Stack.Screen
            name="GovernmentCompliance"
            component={GovernmentComplianceScreen}
            options={{
              title: 'Compliance Check',
            }}
          />

          {/* Government Document Management */}
          <Stack.Screen
            name="GovernmentDocuments"
            component={GovernmentDocumentsScreen}
            options={{
              title: 'Project Documents',
            }}
          />
        </Stack.Group>
      )}

      {/* 👤 SERVICE PROVIDER MANAGEMENT */}
      <Stack.Group
        screenOptions={({ navigation, route }) => ({
          header: (props) => (
            <EnterpriseNavbar
              {...props}
              showBackButton={true}
              customActions={[
                {
                  icon: 'chatbubble',
                  onPress: () => navigation.navigate('ProviderChat', {
                    providerId: route.params?.id,
                  }),
                },
                {
                  icon: 'star',
                  onPress: () => navigation.navigate('ProviderReviews', {
                    providerId: route.params?.id,
                  }),
                },
              ]}
            />
          ),
        })}
      >
        {/* Provider Profile */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.SERVICES.PROVIDER_PROFILE}
          component={ProviderProfileScreen}
          options={({ route }) => ({
            title: 'Service Provider',
            headerRight: () => (
              <PremiumServiceBadge 
                isPremium={route.params?.isPremium}
                showText={false}
              />
            ),
          })}
        />

        {/* Service Creation & Management */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.SERVICES.CREATE}
          component={CreateServiceScreen}
          options={({ navigation, route }) => ({
            title: 'Create Service',
            headerRight: () => (
              <AIRecommendationBadge 
                level={AI_MATCHING_LEVELS.MEDIUM}
                onPress={() => navigation.navigate('AIServiceOptimization')}
              />
            ),
          })}
        />

        {/* Service Pricing & Packages */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.SERVICES.PRICING}
          component={ServicePricingScreen}
          options={{
            title: 'Service Pricing',
            headerRight: () => (
              <PremiumServiceBadge feature="dynamic_pricing" />
            ),
          }}
        />
      </Stack.Group>

      {/* 📅 SERVICE BOOKING & SCHEDULING */}
      <Stack.Group
        screenOptions={{
          presentation: 'containedModal',
          animation: 'slide_from_bottom',
        }}
      >
        {/* Service Booking Flow */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.SERVICES.BOOKING}
          component={ServiceBookingScreen}
          options={({ route }) => ({
            title: 'Book Service',
            headerRight: () => (
              <ServiceAvailabilityIndicator 
                serviceId={route.params?.serviceId}
              />
            ),
          })}
        />

        {/* Service Availability */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.SERVICES.AVAILABILITY}
          component={ServiceAvailabilityScreen}
          options={{
            title: 'Check Availability',
          }}
        />

        {/* Service Reviews & Ratings */}
        <Stack.Screen
          name={NAVIGATION_ROUTES.SERVICES.REVIEWS}
          component={ServiceReviewsScreen}
          options={({ route }) => ({
            title: 'Service Reviews',
            headerRight: () => (
              <RatingSummary 
                rating={route.params?.averageRating}
                count={route.params?.reviewCount}
              />
            ),
          })}
        />
      </Stack.Group>

      {/* 💎 PREMIUM SERVICE FEATURES */}
      {isPremium && (
        <Stack.Group
          screenOptions={{
            presentation: 'containedModal',
          }}
        >
          {/* Premium Service Listing */}
          <Stack.Screen
            name="PremiumServiceListing"
            component={PremiumServiceListingScreen}
            options={{
              title: 'Premium Listing',
              headerRight: () => (
                <PremiumServiceBadge feature="featured_listing" />
              ),
            }}
          />

          {/* Service Analytics Dashboard */}
          <Stack.Screen
            name="ServiceAnalytics"
            component={ServiceAnalyticsScreen}
            options={{
              title: 'Service Analytics',
            }}
          />

          {/* AI Service Optimization */}
          <Stack.Screen
            name="AIServiceOptimization"
            component={AIServiceOptimizationScreen}
            options={{
              title: 'AI Optimization',
            }}
          />
        </Stack.Group>
      )}

      {/* 🔧 SERVICE MANAGEMENT TOOLS */}
      <Stack.Group
        screenOptions={{
          presentation: 'containedModal',
        }}
      >
        {/* Service Filter Management */}
        <Stack.Screen
          name="AdvancedServiceFilter"
          component={AdvancedServiceFilterScreen}
          options={{
            title: 'Advanced Filters',
          headerRight: () => (
              <AIRecommendationBadge 
                onPress={() => navigationRef.current?.navigate('AIServiceFilter')}
              />
            ),
          }}
        />

        {/* Service Comparison */}
        <Stack.Screen
          name="ServiceComparison"
          component={ServiceComparisonScreen}
          options={{
            title: 'Compare Services',
          headerRight: () => (
              <AIRecommendationBadge level={AI_MATCHING_LEVELS.HIGH} />
            ),
          }}
        />

        {/* Service Favorites */}
        <Stack.Screen
          name="ServiceFavorites"
          component={ServiceFavoritesScreen}
          options={{
            title: 'Favorite Services',
          }}
        />
      </Stack.Group>

      {/* 🆘 SERVICE SUPPORT & EMERGENCY */}
      <Stack.Group
        screenOptions={{
          presentation: 'fullScreenModal',
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        {/* Emergency Services */}
        <Stack.Screen
          name="EmergencyServices"
          component={EmergencyServicesScreen}
        />

        {/* Service Unavailable */}
        <Stack.Screen
          name="ServiceUnavailable"
          component={ServiceUnavailableScreen}
        />

        {/* Service Support */}
        <Stack.Screen
          name="ServiceSupport"
          component={ServiceSupportScreen}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};

// 🎯 ENTERPRISE SERVICE NAVIGATION SERVICE
export const EnterpriseServiceNavigation = {
  // Smart service navigation with AI context
  navigateToService: (serviceConfig, options = {}) => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    const {
      id,
      type = SERVICE_TYPES.STANDARD,
      category,
      aiEnhanced = false,
      constructionFeatures = false,
      governmentFeatures = false,
    } = serviceConfig;

    const routeConfig = {
      [SERVICE_TYPES.STANDARD]: NAVIGATION_ROUTES.SERVICES.DETAIL,
      [SERVICE_TYPES.CONSTRUCTION]: 'ConstructionService',
      [SERVICE_TYPES.GOVERNMENT]: 'GovernmentService',
      [SERVICE_TYPES.PREMIUM]: 'PremiumServiceListing',
    };

    const routeName = routeConfig[type] || NAVIGATION_ROUTES.SERVICES.DETAIL;
    
    navigation.navigate(routeName, {
      ...serviceConfig,
      aiEnhanced,
      constructionFeatures,
      governmentFeatures,
      market: 'ethiopia',
      currency: 'ETB',
      location: options.location,
      timestamp: Date.now(),
    });
  },

  // AI-powered service matching navigation
  navigateToAIServiceMatching: (userRequirements, context = {}) => {
    const navigation = navigationRef.current;
    
    navigation.navigate('AIServiceMatching', {
      requirements: userRequirements,
      context: {
        location: context.location,
        budget: context.budget,
        timeline: context.timeline,
        preferences: context.preferences,
        market: 'ethiopia',
      },
      aiFeatures: {
        smartMatching: true,
        alternativeSuggestions: true,
        priceOptimization: true,
        availabilityPrediction: true,
      },
    });
  },

  // Construction service navigation
  navigateToConstructionService: (projectConfig, teamRequirements) => {
    const navigation = navigationRef.current;
    
    navigation.navigate('ConstructionService', {
      ...projectConfig,
      teamRequirements,
      constructionFeatures: {
        teamFormation: true,
        progressTracking: true,
        materialManagement: true,
        safetyCompliance: true,
        aiWorkerMatching: true,
      },
      governmentCompliance: projectConfig.requiresGovernmentApproval,
      regionalFactors: getEthiopianRegionalFactors(projectConfig.region),
    });
  },

  // Government service navigation
  navigateToGovernmentService: (projectConfig, complianceRequirements) => {
    const navigation = navigationRef.current;
    
    navigation.navigate('GovernmentService', {
      ...projectConfig,
      complianceRequirements,
      governmentFeatures: {
        documentApproval: true,
        budgetTracking: true,
        progressReporting: true,
        complianceMonitoring: true,
        emergencyProtocols: true,
      },
      securityLevel: complianceRequirements.securityLevel || 'high',
      regionalJurisdiction: projectConfig.region,
    });
  },

  // Ethiopian market optimized service navigation
  navigateToEthiopianService: (serviceConfig, regionalContext) => {
    const navigation = navigationRef.current;
    
    const ethiopianConfig = {
      ...serviceConfig,
      marketOptimizations: {
        localPricing: true,
        regionalAvailability: true,
        languageSupport: ['am', 'en', 'om'],
        currency: 'ETB',
        measurementUnits: 'metric',
        holidayAware: true,
      },
      localFeatures: {
        ethiopianCertifications: true,
        regionalLicenses: true,
        localPaymentMethods: true,
        culturalConsiderations: true,
      },
    };

    this.navigateToService(ethiopianConfig, {
      location: regionalContext.location,
      region: regionalContext.region,
    });
  },

  // Service provider navigation
  navigateToServiceProvider: (providerConfig, serviceContext) => {
    const navigation = navigationRef.current;
    
    navigation.navigate(NAVIGATION_ROUTES.SERVICES.PROVIDER_PROFILE, {
      ...providerConfig,
      serviceContext,
      providerFeatures: {
        verificationStatus: providerConfig.verificationLevel,
        premiumBadge: providerConfig.isPremium,
        aiRecommendation: providerConfig.aiScore > 0.7,
        constructionCertified: providerConfig.constructionCertifications?.length > 0,
        governmentApproved: providerConfig.governmentClearance,
      },
      market: 'ethiopia',
    });
  },

  // Service booking with Ethiopian context
  navigateToServiceBooking: (bookingConfig, serviceDetails) => {
    const navigation = navigationRef.current;
    
    navigation.navigate(NAVIGATION_ROUTES.SERVICES.BOOKING, {
      ...bookingConfig,
      serviceDetails,
      ethiopianContext: {
        currency: 'ETB',
        localBusinessHours: true,
        holidayConsideration: true,
        regionalPricing: true,
        paymentMethods: ['telebirr', 'cbe-birr', 'chapa'],
      },
      aiFeatures: {
        scheduleOptimization: true,
        priceNegotiation: true,
        alternativeSuggestions: true,
      },
    });
  },

  // Service search with advanced features
  navigateToServiceSearch: (searchConfig, filterOptions) => {
    const navigation = navigationRef.current;
    
    navigation.navigate(NAVIGATION_ROUTES.SERVICES.SEARCH, {
      ...searchConfig,
      filterOptions,
      advancedFeatures: {
        voiceSearch: true,
        imageSearch: true,
        aiRecommendations: true,
        locationBased: true,
        realTimeAvailability: true,
      },
      market: 'ethiopia',
    });
  },
};

// 🏗️ CONSTRUCTION SERVICE UTILS
const ConstructionServiceUtils = {
  // AI-powered team formation
  generateConstructionTeam: (projectRequirements, availableWorkers) => {
    const teamConfig = {
      projectType: projectRequirements.type,
      squareArea: projectRequirements.area,
      floorCount: projectRequirements.floors,
      budget: projectRequirements.budget,
      timeline: projectRequirements.timeline,
    };

    return aiService.formConstructionTeam(teamConfig, availableWorkers);
  },

  // Calculate construction service pricing
  calculateConstructionPrice: (projectConfig, regionalFactors) => {
    const baseCalculations = {
      materialCost: calculateMaterialCost(projectConfig.materials),
      laborCost: calculateLaborCost(projectConfig.workerRequirements),
      equipmentCost: calculateEquipmentCost(projectConfig.equipment),
      overhead: calculateOverhead(projectConfig.duration),
    };

    const regionalAdjustments = getEthiopianRegionalAdjustments(regionalFactors);
    
    return {
      total: Object.values(baseCalculations).reduce((sum, cost) => sum + cost, 0) * regionalAdjustments.multiplier,
      breakdown: baseCalculations,
      regionalAdjustments,
      currency: 'ETB',
    };
  },

  // Validate construction service compliance
  validateConstructionCompliance: (serviceConfig, regionalRegulations) => {
    const complianceChecks = {
      buildingCodes: checkBuildingCodeCompliance(serviceConfig),
      safetyRegulations: checkSafetyCompliance(serviceConfig),
      environmental: checkEnvironmentalCompliance(serviceConfig),
      workerCertifications: checkWorkerCertifications(serviceConfig.workers),
      governmentApproval: checkGovernmentApproval(serviceConfig),
    };

    return {
      isCompliant: Object.values(complianceChecks).every(check => check.isValid),
      score: calculateComplianceScore(complianceChecks),
      details: complianceChecks,
      regionalSpecific: regionalRegulations.requirements,
    };
  },
};

// 🇪🇹 ETHIOPIAN SERVICE MARKET UTILS
export const EthiopianServiceUtils = {
  // Get Ethiopian service categories with construction focus
  getEthiopianServiceCategories: () => [
    {
      id: 'construction',
      name: 'Construction',
      icon: '🏗️',
      subcategories: [
        'building_construction',
        'house_finishing', 
        'renovation',
        'government_infrastructure',
        'road_construction'
      ],
      popular: true,
      requiresLicense: true,
      governmentRegulated: true,
    },
    {
      id: 'plumbing',
      name: 'Plumbing',
      icon: '🔧',
      subcategories: ['residential', 'commercial', 'emergency'],
      popular: true,
      requiresLicense: true,
    },
    {
      id: 'electrical',
      name: 'Electrical',
      icon: '⚡',
      subcategories: ['installation', 'repair', 'maintenance'],
      popular: true,
      requiresLicense: true,
    },
    {
      id: 'cleaning',
      name: 'Cleaning',
      icon: '🧹',
      subcategories: ['residential', 'commercial', 'industrial'],
      popular: true,
      requiresLicense: false,
    },
    // ... more categories
  ],

  // Calculate Ethiopian service pricing with regional factors
  calculateEthiopianServicePrice: (basePrice, serviceConfig, regionalContext) => {
    const regionalMultipliers = {
      'Addis Ababa': 1.2,
      'Dire Dawa': 1.1,
      'Hawassa': 1.0,
      'Bahir Dar': 1.0,
      'Mekelle': 1.1,
      'Gondar': 1.0,
      'Jimma': 0.9,
    };

    const serviceTypeMultipliers = {
      'construction': 1.3,
      'plumbing': 1.1,
      'electrical': 1.2,
      'cleaning': 1.0,
      'emergency': 1.5,
    };

    const regionalMultiplier = regionalMultipliers[regionalContext.region] || 1.0;
    const serviceMultiplier = serviceTypeMultipliers[serviceConfig.type] || 1.0;
    const urgencyMultiplier = serviceConfig.urgency === 'emergency' ? 1.8 : 1.0;

    return Math.round(basePrice * regionalMultiplier * serviceMultiplier * urgencyMultiplier);
  },

  // Validate Ethiopian service provider
  validateEthiopianProvider: (provider, serviceType) => {
    const validations = {
      businessLicense: !!provider.businessLicense,
      taxCertificate: !!provider.tinCertificate,
      bankAccount: !!provider.bankAccount,
      experience: provider.experienceYears >= (serviceType === 'construction' ? 2 : 1),
      certifications: checkRequiredCertifications(provider, serviceType),
      insurance: serviceType === 'construction' ? !!provider.insurance : true,
    };

    return {
      isValid: Object.values(validations).filter(Boolean).length >= 4,
      trustScore: calculateTrustScore(validations),
      details: validations,
      recommendations: generateImprovementRecommendations(validations),
    };
  },

  // Get Ethiopian regional service availability
  getRegionalServiceAvailability: (region, serviceType) => {
    const availabilityData = {
      'Addis Ababa': {
        construction: { availability: 'high', responseTime: '1-2 days' },
        plumbing: { availability: 'high', responseTime: '1 day' },
        electrical: { availability: 'high', responseTime: '1 day' },
        emergency: { availability: 'medium', responseTime: '2-4 hours' },
      },
      'Dire Dawa': {
        construction: { availability: 'medium', responseTime: '3-5 days' },
        plumbing: { availability: 'medium', responseTime: '2-3 days' },
        electrical: { availability: 'medium', responseTime: '2-3 days' },
        emergency: { availability: 'low', responseTime: '4-6 hours' },
      },
      // ... more regions
    };

    return availabilityData[region]?.[serviceType] || { availability: 'low', responseTime: '5+ days' };
  },
};

// 🎯 HELPER FUNCTIONS
const getCategoryTitle = (category) => {
  const titles = {
    construction: 'Construction Services',
    plumbing: 'Plumbing Services', 
    electrical: 'Electrical Services',
    cleaning: 'Cleaning Services',
    painting: 'Painting Services',
    carpentry: 'Carpentry Services',
    masonry: 'Masonry Services',
  };
  return titles[category] || 'Services';
};

const isConstructionCategory = (category) => {
  return category === 'construction' || category?.includes('construction');
};

// Placeholder initialization functions
const loadAIRecommendations = async () => {
  console.log('🤖 Loading AI service recommendations...');
};

const initializeConstructionServices = async () => {
  console.log('🏗️ Initializing construction services...');
};

const initializeGovernmentServices = async () => {
  console.log('🏛️ Initializing government services...');
};

const initializeRealTimeServiceUpdates = async () => {
  console.log('🔄 Initializing real-time service updates...');
};

// Placeholder components for new screens
const ConstructionTeamFormationScreen = () => null;
const ConstructionAnalyticsScreen = () => null;
const GovernmentComplianceScreen = () => null;
const GovernmentDocumentsScreen = () => null;
const VoiceServiceSearchScreen = () => null;
const ImageServiceSearchScreen = () => null;
const AIServiceFilterScreen = () => null;
const QRServiceScanScreen = () => null;
const ProviderChatScreen = () => null;
const ProviderReviewsScreen = () => null;
const ServiceAvailabilityIndicator = () => null;
const RatingSummary = () => null;
const ServiceAnalyticsScreen = () => null;
const AIServiceOptimizationScreen = () => null;
const AdvancedServiceFilterScreen = () => null;
const ServiceComparisonScreen = () => null;
const ServiceFavoritesScreen = () => null;
const EmergencyServicesScreen = () => null;
const ServiceUnavailableScreen = () => null;
const ServiceSupportScreen = () => null;

// Placeholder service functions
const aiService = { formConstructionTeam: () => ({}) };
const errorService = { captureEnterpriseError: () => {} };

export default ServicesNavigator;