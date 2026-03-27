// navigation/government-navigator.js
import React, { useMemo, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';
import { useGovernment } from '../contexts/government-context';
import { analyticsService, performanceService, auditService } from '../services';

/**
 * 🎯 ENTERPRISE GOVERNMENT NAVIGATOR v3.0
 * 
 * Enhanced Features:
 * - Ethiopian e-Government portal with full Amharic support
 * - AI-powered national infrastructure management
 * - Multi-level Ethiopian government approval workflows
 * - Real-time federal budget tracking and analytics
 * - Ethiopian construction worker management with AI
 * - National project coordination across 11 regions
 * - Ethiopian compliance and document management
 * - Offline-capable field inspection and reporting
 * - Federal audit trail and transparency features
 * - Performance monitoring with Ethiopian KPIs
 */

// ==================== CONSTANTS & CONFIG ====================
const GOVERNMENT_ROUTES = Object.freeze({
  // Core Dashboard & Navigation
  DASHBOARD: 'GovernmentDashboard',
  NATIONAL_OVERVIEW: 'GovernmentNationalOverview',
  REGIONAL_DASHBOARD: 'GovernmentRegionalDashboard',
  
  // Project Management
  PROJECTS: 'GovernmentProjects',
  CREATE_PROJECT: 'GovernmentCreateProject',
  PROJECT_DETAIL: 'GovernmentProjectDetail',
  PROJECT_APPROVAL: 'GovernmentProjectApproval',
  
  // AI & Workforce Management
  WORKER_MANAGEMENT: 'GovernmentWorkerManagement',
  AI_TEAM_ASSIGNMENT: 'GovernmentAITeamAssignment',
  WORKER_VERIFICATION: 'GovernmentWorkerVerification',
  
  // Financial Management
  BUDGET_MANAGEMENT: 'GovernmentBudgetManagement',
  FEDERAL_BUDGET: 'GovernmentFederalBudget',
  EXPENSE_TRACKING: 'GovernmentExpenseTracking',
  
  // Analytics & Reporting
  ANALYTICS: 'GovernmentAnalytics',
  REPORTS: 'GovernmentReports',
  PERFORMANCE_METRICS: 'GovernmentPerformanceMetrics',
  
  // Regional Coordination
  REGIONAL_OVERVIEW: 'GovernmentRegionalOverview',
  INFRASTRUCTURE_MAP: 'GovernmentInfrastructureMap',
  INTER_REGIONAL_COORDINATION: 'GovernmentInterRegionalCoordination',
  
  // Compliance & Documentation
  DOCUMENT_MANAGEMENT: 'GovernmentDocumentManagement',
  COMPLIANCE_TRACKING: 'GovernmentComplianceTracking',
  AUDIT_LOGS: 'GovernmentAuditLogs',
  
  // Emergency & Crisis Management
  EMERGENCY_RESPONSE: 'GovernmentEmergencyResponse',
  CRISIS_MANAGEMENT: 'GovernmentCrisisManagement'
});

const GOVERNMENT_NAVIGATION_CONFIG = Object.freeze({
  ANIMATIONS: {
    SLIDE_FROM_RIGHT: 'slide_from_right',
    SLIDE_FROM_BOTTOM: 'slide_from_bottom',
    FADE: 'fade',
    SCALE: 'scale'
  },
  PRESENTATION: {
    CARD: 'card',
    MODAL: 'modal',
    FULL_SCREEN: 'fullScreenModal',
    TRANSPARENT: 'transparentModal'
  }
});

// ==================== ETHIOPIAN GOVERNMENT CONFIGURATION ====================
const ETHIOPIAN_GOVERNMENT_CONFIG = Object.freeze({
  // Ethiopian Administrative Structure
  REGIONS: [
    { code: 'AA', name: 'አዲስ አበባ', name_en: 'Addis Ababa', type: 'CITY' },
    { code: 'DD', name: 'ድሬ ዳዋ', name_en: 'Dire Dawa', type: 'CITY' },
    { code: 'AF', name: 'አፋር', name_en: 'Afar', type: 'REGION' },
    { code: 'AM', name: 'አማራ', name_en: 'Amhara', type: 'REGION' },
    { code: 'BG', name: 'ቤኒሻንጉል-ጉምዝ', name_en: 'Benishangul-Gumuz', type: 'REGION' },
    { code: 'GA', name: 'ጋምቤላ', name_en: 'Gambella', type: 'REGION' },
    { code: 'HA', name: 'ሐረሪ', name_en: 'Harari', type: 'REGION' },
    { code: 'OR', name: 'ኦሮሚያ', name_en: 'Oromia', type: 'REGION' },
    { code: 'SI', name: 'ሲዳማ', name_en: 'Sidama', type: 'REGION' },
    { code: 'SO', name: 'ሶማሌ', name_en: 'Somali', type: 'REGION' },
    { code: 'SW', name: 'ደቡብ ምዕራብ', name_en: 'South West', type: 'REGION' },
    { code: 'SN', name: 'ደቡብ ብሔሮች', name_en: 'Southern Nations', type: 'REGION' },
    { code: 'TI', name: 'ትግራይ', name_en: 'Tigray', type: 'REGION' }
  ],

  // Ethiopian Infrastructure Project Types
  PROJECT_TYPES: {
    ROAD_CONSTRUCTION: { 
      name: 'መንገድ ግንባታ', 
      code: 'ROAD',
      ministry: 'Ministry of Transport'
    },
    BRIDGE_CONSTRUCTION: { 
      name: 'ግንብ ግንባታ', 
      code: 'BRIDGE',
      ministry: 'Ministry of Transport'
    },
    SCHOOL_CONSTRUCTION: { 
      name: 'ትምህርት ቤት ግንባታ', 
      code: 'SCHOOL',
      ministry: 'Ministry of Education'
    },
    HEALTH_CENTER: { 
      name: 'ጤና ማእከል ግንባታ', 
      code: 'HEALTH',
      ministry: 'Ministry of Health'
    },
    WATER_SYSTEM: { 
      name: 'የውሃ ስርዓት', 
      code: 'WATER',
      ministry: 'Ministry of Water and Energy'
    },
    ELECTRIFICATION: { 
      name: 'የኤሌክትሪክ ማከፋፈያ', 
      code: 'POWER',
      ministry: 'Ministry of Water and Energy'
    },
    IRRIGATION: { 
      name: 'የፀሐይ ማጠራቀሚያ', 
      code: 'IRRIGATION',
      ministry: 'Ministry of Agriculture'
    }
  },

  // Ethiopian Government Approval Hierarchy
  APPROVAL_LEVELS: {
    WOREDA: { level: 1, name: 'ወረዳ', authority: 'Woreda Administration' },
    ZONAL: { level: 2, name: 'ዞን', authority: 'Zonal Administration' },
    REGIONAL: { level: 3, name: 'ክልል', authority: 'Regional Government' },
    FEDERAL: { level: 4, name: 'ፌዴራል', authority: 'Federal Government' }
  }
});

const Stack = createNativeStackNavigator();

// ==================== ENTERPRISE GOVERNMENT NAVIGATOR ====================
const GovernmentNavigator = () => {
  const { theme, isDark } = useTheme();
  const { user, hasRole, hasPermission } = useAuth();
  const { 
    currentRegion, 
    approvalLevel,
    hasAccess,
    userMinistry,
    isFederalLevel 
  } = useGovernment();

  // ==================== ADVANCED ACCESS CONTROL ====================
  const hasGovernmentAccess = useMemo(() => {
    return hasAccess() && (
      hasRole('government_official') || 
      hasRole('federal_ministry') ||
      hasRole('regional_administration') ||
      hasRole('woreda_administration') ||
      hasRole('infrastructure_director') ||
      hasRole('auditor_general')
    );
  }, [hasAccess, hasRole]);

  const canCreateNationalProjects = useMemo(() => {
    return hasPermission('government:projects:create:national') && 
           (isFederalLevel || approvalLevel >= 3);
  }, [hasPermission, isFederalLevel, approvalLevel]);

  const canManageFederalBudget = useMemo(() => {
    return hasPermission('government:budget:manage:federal') &&
           isFederalLevel;
  }, [hasPermission, isFederalLevel]);

  const canViewNationalAnalytics = useMemo(() => {
    return hasPermission('government:analytics:view:national');
  }, [hasPermission]);

  const canCoordinateRegions = useMemo(() => {
    return hasPermission('government:regions:coordinate') &&
           (isFederalLevel || approvalLevel >= 3);
  }, [hasPermission, isFederalLevel, approvalLevel]);

  // ==================== ENHANCED NAVIGATION OPTIONS ====================
  const governmentHeaderOptions = useMemo(() => ({
    headerStyle: {
      backgroundColor: theme.colors.surface,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border
    },
    headerTintColor: theme.colors.text,
    headerTitleStyle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      fontWeight: '600'
    },
    headerBackTitle: 'ተመለስ',
    animation: GOVERNMENT_NAVIGATION_CONFIG.ANIMATIONS.SLIDE_FROM_RIGHT
  }), [theme]);

  // ==================== INTELLIGENT SCREEN OPTIONS GENERATORS ====================
  const getDashboardOptions = useCallback((navigation) => ({
    title: 'የኢትዮጵያ መንግሥት ፓናል',
    header: (props) => (
      <require('../components/government/government-navbar').default
        {...props}
        title={isFederalLevel ? "ፌዴራል መንግሥት ፓናል" : `${currentRegion?.name} ክልል`}
        region={currentRegion}
        approvalLevel={approvalLevel}
        ministry={userMinistry}
        showNotifications={true}
        showQuickActions={true}
        showEmergencyAlerts={hasPermission('government:emergency:view')}
        onQuickActionPress={(action) => {
          handleQuickAction(navigation, action);
        }}
        onEmergencyAlert={(alert) => {
          handleEmergencyAlert(navigation, alert);
        }}
      />
    )
  }), [currentRegion, approvalLevel, userMinistry, isFederalLevel, hasPermission]);

  const getNationalOverviewOptions = useCallback((navigation) => ({
    title: 'የብሔራዊ መሠረተ ልማት አጠቃላይ እይታ',
    header: (props) => (
      <require('../components/government/government-navbar').default
        {...props}
        title="ብሔራዊ አጠቃላይ እይታ"
        showBackButton={true}
        showNationalMetrics={true}
        showRegionalComparison={true}
        onMetricPress={(metric) => {
          handleNationalMetricPress(navigation, metric);
        }}
      />
    )
  }), []);

  const getProjectManagementOptions = useCallback((navigation) => ({
    title: 'የመሠረተ ልማት ፕሮጀክቶች አስተዳደር',
    header: (props) => (
      <require('../components/government/government-navbar').default
        {...props}
        title="ፕሮጀክቶች አስተዳደር"
        showBackButton={true}
        showFilters={true}
        showCreate={canCreateNationalProjects}
        showExport={true}
        customActionIcon="add"
        customActionLabel="አዲስ ፕሮጀክት"
        onCustomActionPress={() => 
          navigation.navigate(GOVERNMENT_ROUTES.CREATE_PROJECT)
        }
        onFilterPress={() => {
          navigation.navigate('GovernmentAdvancedFilters');
        }}
        onExportPress={() => {
          handleProjectsExport();
        }}
      />
    )
  }), [canCreateNationalProjects]);

  // ==================== ADVANCED ACTION HANDLERS ====================
  const handleQuickAction = useCallback((navigation, action) => {
    performanceService.startMeasurement(`government_quick_action_${action}`);
    
    switch (action) {
      case 'create_national_project':
        navigation.navigate(GOVERNMENT_ROUTES.CREATE_PROJECT, { 
          scope: 'NATIONAL',
          ministry: userMinistry 
        });
        break;
      case 'view_national_map':
        navigation.navigate(GOVERNMENT_ROUTES.INFRASTRUCTURE_MAP, { 
          view: 'NATIONAL',
          showAllRegions: true 
        });
        break;
      case 'generate_federal_report':
        navigation.navigate(GOVERNMENT_ROUTES.REPORTS, { 
          scope: 'FEDERAL',
          autoGenerate: true 
        });
        break;
      case 'ai_workforce_planning':
        navigation.navigate(GOVERNMENT_ROUTES.AI_TEAM_ASSIGNMENT, {
          scope: 'NATIONAL',
          optimizeFor: ['regional_balance', 'skill_matching', 'cost_efficiency']
        });
        break;
      case 'emergency_response':
        navigation.navigate(GOVERNMENT_ROUTES.EMERGENCY_RESPONSE, {
          mode: 'quick_activation'
        });
        break;
      default:
        console.warn('Unknown quick action:', action);
    }

    analyticsService.trackEvent('government_quick_action', { 
      action, 
      userLevel: approvalLevel,
      ministry: userMinistry 
    });
    performanceService.endMeasurement(`government_quick_action_${action}`);
  }, [approvalLevel, userMinistry]);

  const handleEmergencyAlert = useCallback((navigation, alert) => {
    auditService.logEmergencyAlert(alert);
    
    navigation.navigate(GOVERNMENT_ROUTES.EMERGENCY_RESPONSE, {
      alert,
      autoActivate: true,
      timestamp: Date.now()
    });
  }, []);

  const handleNationalMetricPress = useCallback((navigation, metric) => {
    navigation.navigate(GOVERNMENT_ROUTES.ANALYTICS, {
      focusedMetric: metric,
      timeframe: 'QUARTERLY',
      regionalBreakdown: true
    });
  }, []);

  // ==================== ACCESS CONTROL COMPONENT ====================
  const AccessDeniedComponent = useMemo(() => 
    require('../components/government/government-access-denied').default, []);

  // ==================== MAIN NAVIGATOR RENDER ====================
  if (!hasGovernmentAccess) {
    return (
      <AccessDeniedComponent 
        userRole={user?.role} 
        requiredRoles={['government_official', 'federal_ministry', 'regional_administration']}
        contactAuthority="Ministry of Innovation and Technology"
      />
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={GOVERNMENT_ROUTES.DASHBOARD}
      screenOptions={{
        ...governmentHeaderOptions,
        contentStyle: {
          backgroundColor: theme.colors.background
        }
      }}
    >
      {/* ==================== CORE DASHBOARDS ==================== */}
      
      {/* Government Dashboard */}
      <Stack.Screen
        name={GOVERNMENT_ROUTES.DASHBOARD}
        component={require('../screens/government/dashboard').default}
        options={({ navigation }) => getDashboardOptions(navigation)}
      />

      {/* National Overview */}
      {isFederalLevel && (
        <Stack.Screen
          name={GOVERNMENT_ROUTES.NATIONAL_OVERVIEW}
          component={require('../screens/government/national-overview').default}
          options={({ navigation }) => getNationalOverviewOptions(navigation)}
        />
      )}

      {/* Regional Dashboard */}
      <Stack.Screen
        name={GOVERNMENT_ROUTES.REGIONAL_DASHBOARD}
        component={require('../screens/government/regional-dashboard').default}
        options={{
          title: `${currentRegion?.name} ክልል ዳሽቦርድ`,
          header: (props) => (
            <require('../components/government/government-navbar').default
              {...props}
              title={`${currentRegion?.name} ክልል`}
              showBackButton={true}
              showRegionalMetrics={true}
              region={currentRegion}
            />
          )
        }}
      />

      {/* ==================== PROJECT MANAGEMENT ==================== */}
      
      {/* Infrastructure Projects */}
      <Stack.Screen
        name={GOVERNMENT_ROUTES.PROJECTS}
        component={require('../screens/government/projects').default}
        options={({ navigation }) => getProjectManagementOptions(navigation)}
      />

      {/* Create National Project */}
      {canCreateNationalProjects && (
        <Stack.Screen
          name={GOVERNMENT_ROUTES.CREATE_PROJECT}
          component={require('../screens/government/create-project').default}
          options={{
            title: 'አዲስ ብሔራዊ ፕሮጀክት ይፍጠሩ',
            presentation: GOVERNMENT_NAVIGATION_CONFIG.PRESENTATION.MODAL,
            header: (props) => (
              <require('../components/government/government-navbar').default
                {...props}
                title="አዲስ ፕሮጀክት"
                showBackButton={true}
                showAIAssistant={true}
                onAIAssistantPress={() => {
                  handleAIAssistant(props.navigation);
                }}
              />
            )
          }}
        />
      )}

      {/* Project Approval Workflow */}
      <Stack.Screen
        name={GOVERNMENT_ROUTES.PROJECT_APPROVAL}
        component={require('../screens/government/project-approval').default}
        options={{
          title: 'የፕሮጀክት ማረጋገጫ ሂደት',
          presentation: GOVERNMENT_NAVIGATION_CONFIG.PRESENTATION.MODAL
        }}
      />

      {/* ==================== AI & WORKFORCE MANAGEMENT ==================== */}
      
      {/* AI Team Assignment */}
      <Stack.Screen
        name={GOVERNMENT_ROUTES.AI_TEAM_ASSIGNMENT}
        component={require('../screens/government/ai-team-assignment').default}
        options={{
          title: 'የAI ሰራተኞች ምደባ',
          header: (props) => (
            <require('../components/government/government-navbar').default
              {...props}
              title="AI ሰራተኞች ምደባ"
              showBackButton={true}
              showAIOptimization={true}
              onAIOptimization={(optimizationType) => {
                handleAIOptimization(props.navigation, optimizationType);
              }}
            />
          ),
          presentation: GOVERNMENT_NAVIGATION_CONFIG.PRESENTATION.MODAL
        }}
      />

      {/* Worker Verification */}
      <Stack.Screen
        name={GOVERNMENT_ROUTES.WORKER_VERIFICATION}
        component={require('../screens/government/worker-verification').default}
        options={{
          title: 'የሰራተኞች ማረጋገጫ',
          header: (props) => (
            <require('../components/government/government-navbar').default
              {...props}
              title="ሰራተኞች ማረጋገጫ"
              showBackButton={true}
              showBulkVerification={true}
              onBulkVerification={(workers) => {
                handleBulkVerification(workers);
              }}
            />
          )
        }}
      />

      {/* ==================== FINANCIAL MANAGEMENT ==================== */}
      
      {/* Federal Budget Management */}
      {canManageFederalBudget && (
        <Stack.Screen
          name={GOVERNMENT_ROUTES.FEDERAL_BUDGET}
          component={require('../screens/government/federal-budget').default}
          options={{
            title: 'ፌዴራል በጀት አስተዳደር',
            header: (props) => (
              <require('../components/government/government-navbar').default
                {...props}
                title="ፌዴራል በጀት"
                showBackButton={true}
                showBudgetAnalytics={true}
                onBudgetAnalytics={(analysisType) => {
                  handleBudgetAnalysis(props.navigation, analysisType);
                }}
              />
            )
          }}
        />
      )}

      {/* ==================== NATIONAL COORDINATION ==================== */}
      
      {/* Inter-Regional Coordination */}
      {canCoordinateRegions && (
        <Stack.Screen
          name={GOVERNMENT_ROUTES.INTER_REGIONAL_COORDINATION}
          component={require('../screens/government/inter-regional-coordination').default}
          options={{
            title: 'የክልሎች አጋርነት',
            header: (props) => (
              <require('../components/government/government-navbar').default
                {...props}
                title="ክልሎች አጋርነት"
                showBackButton={true}
                showCoordinationTools={true}
                onCoordinationAction={(action) => {
                  handleRegionalCoordination(props.navigation, action);
                }}
              />
            )
          }}
        />
      )}

      {/* National Infrastructure Map */}
      <Stack.Screen
        name={GOVERNMENT_ROUTES.INFRASTRUCTURE_MAP}
        component={require('../screens/government/infrastructure-map').default}
        options={{
          title: 'የብሔራዊ መሠረተ ልማት ካርታ',
          headerTransparent: true,
          headerTintColor: theme.colors.textInverse,
          header: (props) => (
            <require('../components/government/government-navbar').default
              {...props}
              title="ብሔራዊ ካርታ"
              showBackButton={true}
              showMapLayers={true}
              transparent={true}
            />
          )
        }}
      />

      {/* ==================== EMERGENCY MANAGEMENT ==================== */}
      
      {/* Emergency Response */}
      {hasPermission('government:emergency:manage') && (
        <Stack.Screen
          name={GOVERNMENT_ROUTES.EMERGENCY_RESPONSE}
          component={require('../screens/government/emergency-response').default}
          options={{
            title: 'አደጋ ምክንያት',
            presentation: GOVERNMENT_NAVIGATION_CONFIG.PRESENTATION.FULL_SCREEN,
            headerShown: false
          }}
        />
      )}

      {/* ==================== COMPLIANCE & AUDITING ==================== */}
      
      {/* Federal Audit Logs */}
      <Stack.Screen
        name={GOVERNMENT_ROUTES.AUDIT_LOGS}
        component={require('../screens/government/audit-logs').default}
        options={{
          title: 'ፌዴራል ኦዲት መዝገቦች',
          header: (props) => (
            <require('../components/government/government-navbar').default
              {...props}
              title="ፌዴራል ኦዲት"
              showBackButton={true}
              showAuditTools={hasPermission('government:audit:manage')}
              onAuditAction={(action) => {
                handleAuditAction(props.navigation, action);
              }}
            />
          )
        }}
      />

    </Stack.Navigator>
  );
};

// ==================== ADVANCED ACTION HANDLER IMPLEMENTATIONS ====================
const handleAIAssistant = (navigation) => {
  navigation.navigate('GovernmentAIAssistant', { 
    mode: 'project_planning',
    context: 'national_infrastructure' 
  });
};

const handleAIOptimization = (navigation, optimizationType) => {
  navigation.navigate('GovernmentAIOptimization', {
    optimizationType,
    scope: 'national',
    constraints: ['budget', 'timeline', 'workforce_availability']
  });
};

const handleBulkVerification = (workers) => {
  console.log('Bulk verifying workers:', workers.length);
  // Implement bulk worker verification
};

const handleBudgetAnalysis = (navigation, analysisType) => {
  navigation.navigate('GovernmentBudgetAnalysis', {
    analysisType,
    timeframe: 'FISCAL_YEAR',
    breakdown: 'REGIONAL'
  });
};

const handleRegionalCoordination = (navigation, action) => {
  switch (action) {
    case 'resource_sharing':
      navigation.navigate('GovernmentResourceSharing');
      break;
    case 'workforce_mobility':
      navigation.navigate('GovernmentWorkforceMobility');
      break;
    case 'joint_projects':
      navigation.navigate('GovernmentJointProjects');
      break;
    default:
      console.warn('Unknown coordination action:', action);
  }
};

const handleAuditAction = (navigation, action) => {
  switch (action) {
    case 'generate_audit_report':
      navigation.navigate('GovernmentAuditReport');
      break;
    case 'compliance_check':
      navigation.navigate('GovernmentComplianceCheck');
      break;
    case 'transparency_portal':
      navigation.navigate('GovernmentTransparencyPortal');
      break;
    default:
      console.warn('Unknown audit action:', action);
  }
};

const handleProjectsExport = () => {
  console.log('Exporting national projects data...');
  // Implement comprehensive projects export
};

// ==================== ENTERPRISE GOVERNMENT NAVIGATION SERVICE ====================
export const GovernmentNavigationService = (() => {
  let navigationRef;

  const setNavigationRef = (ref) => {
    navigationRef = ref;
  };

  const navigateToNationalProject = (projectData = {}) => {
    navigationRef?.navigate(GOVERNMENT_ROUTES.CREATE_PROJECT, {
      ...projectData,
      scope: 'NATIONAL',
      requiresFederalApproval: true,
      multiRegional: projectData.regions?.length > 1,
      aiRecommendation: true
    });
  };

  const navigateToRegionalCoordination = (regions, coordinationType) => {
    navigationRef?.navigate(GOVERNMENT_ROUTES.INTER_REGIONAL_COORDINATION, {
      regions,
      coordinationType,
      priority: 'HIGH',
      federalOversight: true
    });
  };

  const navigateToFederalBudgetAllocation = (fiscalYear, ministries = []) => {
    navigationRef?.navigate(GOVERNMENT_ROUTES.FEDERAL_BUDGET, {
      fiscalYear,
      ministries,
      allocationMode: true,
      showHistoricalComparison: true
    });
  };

  const navigateToNationalEmergency = (emergencyType, affectedRegions) => {
    navigationRef?.navigate(GOVERNMENT_ROUTES.EMERGENCY_RESPONSE, {
      emergencyType,
      affectedRegions,
      activationLevel: 'NATIONAL',
      timestamp: Date.now(),
      autoNotify: true
    });
  };

  const navigateToInfrastructureAudit = (auditScope, timeframe) => {
    navigationRef?.navigate(GOVERNMENT_ROUTES.AUDIT_LOGS, {
      auditScope,
      timeframe,
      deepAudit: true,
      generateReport: true
    });
  };

  const navigateToAINationalWorkforce = (optimizationGoals = []) => {
    navigationRef?.navigate(GOVERNMENT_ROUTES.AI_TEAM_ASSIGNMENT, {
      scope: 'NATIONAL',
      optimizationGoals,
      consider: [
        'regional_development_goals',
        'skill_gap_analysis', 
        'infrastructure_priorities',
        'budget_constraints'
      ],
      federalOversight: true
    });
  };

  const generateFederalReport = (reportType, parameters = {}) => {
    navigationRef?.navigate(GOVERNMENT_ROUTES.REPORTS, {
      reportType,
      ...parameters,
      scope: 'FEDERAL',
      autoGenerate: true,
      includeAllRegions: true
    });
  };

  const navigateToMinistryDashboard = (ministry, timeframe = 'QUARTERLY') => {
    navigationRef?.navigate(GOVERNMENT_ROUTES.DASHBOARD, {
      ministry,
      timeframe,
      showMinistryMetrics: true
    });
  };

  return {
    setNavigationRef,
    navigateToNationalProject,
    navigateToRegionalCoordination,
    navigateToFederalBudgetAllocation,
    navigateToNationalEmergency,
    navigateToInfrastructureAudit,
    navigateToAINationalWorkforce,
    generateFederalReport,
    navigateToMinistryDashboard,
    ROUTES: GOVERNMENT_ROUTES,
    CONFIG: ETHIOPIAN_GOVERNMENT_CONFIG
  };
})();

export default GovernmentNavigator;