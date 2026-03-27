/**
 * 🎯 ENTERPRISE PROJECTS NAVIGATOR v3.0
 * 
 * Enhanced Features:
 * - AI-powered construction project management with Ethiopian optimization
 * - Multi-role project collaboration with real-time synchronization
 * - Advanced construction project lifecycle management
 * - Intelligent worker assignment with AI replacement system
 * - Budget optimization with Ethiopian market pricing
 * - Offline-capable field operations with automatic sync
 * - Comprehensive analytics and performance monitoring
 * - TypeScript-first with full enterprise patterns
 */

import React, { useMemo, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';
import { useProjects } from '../contexts/projects-context';
import { useAI } from '../contexts/ai-matching-context';
import { analyticsService, performanceService, errorService } from '../services';

// ==================== ENTERPRISE CONSTANTS & CONFIG ====================
const PROJECT_ROUTES = Object.freeze({
  // Core Project Management
  LIST: 'ProjectsList',
  CREATE: 'ProjectCreate',
  DETAIL: 'ProjectDetail',
  TEAM: 'ProjectTeam',
  PROGRESS: 'ProjectProgress',
  BUDGET: 'ProjectBudget',
  MILESTONES: 'ProjectMilestones',
  DOCUMENTS: 'ProjectDocuments',
  INVITATIONS: 'ProjectInvitations',
  
  // AI-Powered Features
  AI_ASSIGNMENT: 'ProjectAIAssignment',
  AI_OPTIMIZATION: 'ProjectAIOptimization',
  WORKER_REPLACEMENT: 'ProjectWorkerReplacement',
  BUDGET_OPTIMIZATION: 'ProjectBudgetOptimization',
  
  // Field Operations
  FIELD_INSPECTION: 'ProjectFieldInspection',
  QUALITY_CONTROL: 'ProjectQualityControl',
  SAFETY_MANAGEMENT: 'ProjectSafetyManagement',
  
  // Communication & Analytics
  CHAT: 'ProjectChat',
  ANALYTICS: 'ProjectAnalytics',
  REPORTS: 'ProjectReports',
  SETTINGS: 'ProjectSettings',
  
  // Ethiopian Specific
  ETHIOPIAN_COMPLIANCE: 'ProjectEthiopianCompliance',
  LOCAL_SUPPLIERS: 'ProjectLocalSuppliers',
  WEATHER_ADAPTATION: 'ProjectWeatherAdaptation'
});

const PROJECT_NAVIGATION_CONFIG = Object.freeze({
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

// ==================== ETHIOPIAN CONSTRUCTION ENTERPRISE CONFIG ====================
const ETHIOPIAN_CONSTRUCTION_CONFIG = Object.freeze({
  PROJECT_TYPES: {
    RESIDENTIAL_HOUSE: 'residential_house',
    APARTMENT_BUILDING: 'apartment_building', 
    COMMERCIAL_BUILDING: 'commercial_building',
    ROAD_CONSTRUCTION: 'road_construction',
    BRIDGE_CONSTRUCTION: 'bridge_construction',
    WATER_SYSTEM: 'water_system',
    RENOVATION: 'renovation',
    INTERIOR_FINISHING: 'interior_finishing',
    GOVERNMENT_INFRASTRUCTURE: 'government_infrastructure'
  },
  
  WORKER_TYPES: {
    ENGINEER: 'engineer',
    ARCHITECT: 'architect',
    MASON: 'mason',
    CARPENTER: 'carpenter',
    ELECTRICIAN: 'electrician', 
    PLUMBER: 'plumber',
    STEEL_FIXER: 'steel_fixer',
    PAINTER: 'painter',
    TILER: 'tiler',
    LABORER: 'laborer',
    HEAVY_EQUIPMENT_OPERATOR: 'heavy_equipment_operator'
  },
  
  CONSTRUCTION_STANDARDS: {
    ETHIOPIAN_BUILDING_CODE: 'EBCS',
    ETHIOPIAN_ROADS_AUTHORITY: 'ERA',
    MINISTRY_OF_WATER: 'MOW',
    ENVIRONMENTAL_PROTECTION: 'EPA'
  },
  
  REGIONS: {
    ADDIS_ABABA: 'addis_ababa',
    OROMIA: 'oromia', 
    AMHARA: 'amhara',
    TIGRAY: 'tigray',
    SNNPR: 'snnpr',
    SOMALI: 'somali',
    AFAR: 'afar',
    BENISHANGUL: 'benishangul',
    GAMBELLA: 'gambella',
    HARARI: 'harari',
    SIDAMA: 'sidama',
    DIRE_DAWA: 'dire_dawa'
  }
});

const Stack = createNativeStackNavigator();

// ==================== ENTERPRISE PROJECTS NAVIGATOR ====================
const ProjectsNavigator = () => {
  const { theme, isDark } = useTheme();
  const { user, hasRole, hasPermission, isVerified } = useAuth();
  const { 
    activeProjects, 
    pendingInvitations,
    canCreateProjects,
    projectStats 
  } = useProjects();
  const { isAIEnabled, aiFeatures } = useAI();

  // ==================== ENTERPRISE ACCESS CONTROL ====================
  const hasProjectAccess = useMemo(() => {
    const allowedRoles = [
      'client', 
      'service_provider', 
      'construction_worker',
      'construction_manager', 
      'government_official',
      'project_owner',
      'contractor'
    ];
    return allowedRoles.some(role => hasRole(role));
  }, [hasRole]);

  const canManageProjects = useMemo(() => {
    return hasPermission('projects:manage') || 
           hasRole('construction_manager') ||
           hasRole('government_official') ||
           hasRole('project_owner');
  }, [hasPermission, hasRole]);

  const canUseAI = useMemo(() => {
    return isAIEnabled && 
           hasPermission('projects:ai:use') && 
           user?.subscription?.features?.includes('ai_construction');
  }, [isAIEnabled, hasPermission, user]);

  const canAccessGovernmentProjects = useMemo(() => {
    return hasRole('government_official') && 
           isVerified &&
           hasPermission('projects:government:access');
  }, [hasRole, isVerified, hasPermission]);

  // ==================== ENTERPRISE NAVIGATION OPTIONS ====================
  const enterpriseHeaderOptions = useMemo(() => ({
    headerStyle: {
      backgroundColor: theme.colors.background.primary,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    headerTintColor: theme.colors.text.primary,
    headerTitleStyle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    headerBackTitle: 'ተመለስ',
    headerBackTitleVisible: true,
    animation: PROJECT_NAVIGATION_CONFIG.ANIMATIONS.SLIDE_FROM_RIGHT
  }), [theme]);

  // ==================== ENTERPRISE SCREEN OPTIONS GENERATORS ====================
  const getProjectsListOptions = useCallback((navigation) => ({
    title: 'የግንባታ ፕሮጀክቶቼ',
    header: (props) => (
      <require('../components/projects/projects-navbar').default
        {...props}
        title="ፕሮጀክቶቼ"
        subtitle={`${projectStats.active} ንቁ • ${projectStats.completed} ተጠናቅቀዋል`}
        projectCount={activeProjects.length}
        pendingInvitations={pendingInvitations}
        showCreate={canCreateProjects}
        showFilters={true}
        showGovernmentAccess={canAccessGovernmentProjects}
        onCreatePress={() => navigation.navigate(PROJECT_ROUTES.CREATE)}
        onFilterPress={() => navigation.navigate('ProjectFilters')}
        onGovernmentPress={() => navigation.navigate('GovernmentProjects')}
        customActions={[
          {
            icon: 'analytics',
            onPress: () => navigation.navigate(PROJECT_ROUTES.ANALYTICS),
            badge: projectStats.requiresAttention > 0 ? projectStats.requiresAttention : null
          },
          {
            icon: 'download',
            onPress: () => navigation.navigate('ProjectExport'),
            disabled: activeProjects.length === 0
          }
        ]}
      />
    )
  }), [activeProjects.length, pendingInvitations, canCreateProjects, projectStats, canAccessGovernmentProjects]);

  const getProjectDetailOptions = useCallback((navigation, route) => ({
    title: 'የፕሮጀክት ዝርዝሮች',
    header: (props) => (
      <require('../components/projects/projects-navbar').default
        {...props}
        title="ፕሮጀክት ዝርዝሮች"
        subtitle={getProjectSubtitle(route.params?.project)}
        showBackButton={true}
        showProjectActions={true}
        projectId={route.params?.id}
        canManage={canManageProjects}
        isAIEnabled={canUseAI}
        onActionPress={(action) => handleProjectAction(navigation, route.params?.id, action)}
        customActions={getProjectDetailActions(route.params?.project, canUseAI)}
      />
    )
  }), [canManageProjects, canUseAI]);

  const getAIAssignmentOptions = useCallback((navigation, route) => ({
    title: 'የAI ሰራተኞች ምደባ',
    header: (props) => (
      <require('../components/projects/projects-navbar').default
        {...props}
        title="AI ሰራተኞች ምደባ"
        subtitle="ማህበረሰብ-ማቀናበሪያ በሂደት ላይ"
        showBackButton={true}
        showAIOptions={canUseAI}
        projectId={route.params?.projectId}
        matchingProgress={route.params?.matchingProgress}
        onAIOptionPress={(option) => handleAIOption(navigation, route.params?.projectId, option)}
        customActions={[
          {
            icon: 'refresh',
            onPress: () => navigation.setParams({ refreshAI: Date.now() }),
            loading: route.params?.isMatching
          },
          {
            icon: 'settings',
            onPress: () => navigation.navigate('AIMatchingSettings', route.params)
          }
        ]}
      />
    ),
    presentation: PROJECT_NAVIGATION_CONFIG.PRESENTATION.MODAL
  }), [canUseAI]);

  // ==================== ENTERPRISE ACTION HANDLERS ====================
  const handleProjectAction = useCallback((navigation, projectId, action) => {
    performanceService.startMeasurement(`project_action_${action}`);
    
    const actionHandlers = {
      share_project: () => navigation.navigate('ProjectShare', { projectId }),
      duplicate_project: () => navigation.navigate(PROJECT_ROUTES.CREATE, { duplicateFrom: projectId }),
      export_data: () => navigation.navigate('ProjectExport', { projectId }),
      project_settings: () => navigation.navigate(PROJECT_ROUTES.SETTINGS, { projectId }),
      ai_optimize: () => navigation.navigate(PROJECT_ROUTES.AI_OPTIMIZATION, { projectId }),
      emergency_stop: () => navigation.navigate('ProjectEmergencyStop', { projectId }),
      generate_report: () => navigation.navigate(PROJECT_ROUTES.REPORTS, { projectId })
    };

    const handler = actionHandlers[action];
    if (handler) {
      handler();
      analyticsService.trackEvent('project_action', { action, projectId, userRole: user?.role });
    } else {
      errorService.logWarning('Unknown project action', { action, projectId });
    }

    performanceService.endMeasurement(`project_action_${action}`);
  }, [user]);

  const handleAIOption = useCallback((navigation, projectId, option) => {
    const aiOptionHandlers = {
      optimize_team: () => navigation.navigate(PROJECT_ROUTES.AI_ASSIGNMENT, { projectId, mode: 'optimization' }),
      smart_scheduling: () => navigation.navigate('ProjectSmartScheduling', { projectId }),
      risk_analysis: () => navigation.navigate('ProjectRiskAnalysis', { projectId }),
      cost_prediction: () => navigation.navigate(PROJECT_ROUTES.BUDGET_OPTIMIZATION, { projectId, mode: 'prediction' }),
      quality_optimization: () => navigation.navigate(PROJECT_ROUTES.AI_OPTIMIZATION, { projectId, aspect: 'quality' }),
      resource_allocation: () => navigation.navigate('ProjectResourceAllocation', { projectId })
    };

    const handler = aiOptionHandlers[option];
    if (handler) {
      handler();
      analyticsService.trackEvent('ai_project_option', { option, projectId });
    }
  }, []);

  // ==================== ACCESS CONTROL COMPONENT ====================
  const AccessDeniedComponent = useMemo(() => 
    require('../components/projects/projects-access-denied').default, []);

  // ==================== MAIN NAVIGATOR RENDER ====================
  if (!hasProjectAccess) {
    return (
      <AccessDeniedComponent 
        userRole={user?.role}
        requiredRoles={['client', 'service_provider', 'construction_worker', 'construction_manager']}
        suggestion="Contact your administrator for project access or browse available construction services"
        showUpgradeOption={!user?.subscription?.includes('projects')}
      />
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={PROJECT_ROUTES.LIST}
      screenOptions={{
        ...enterpriseHeaderOptions,
        contentStyle: {
          backgroundColor: theme.colors.background.primary,
        },
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {/* ==================== CORE PROJECT MANAGEMENT ==================== */}
      
      <Stack.Screen
        name={PROJECT_ROUTES.LIST}
        component={require('../screens/projects/list').default}
        options={({ navigation }) => getProjectsListOptions(navigation)}
      />

      {canCreateProjects && (
        <Stack.Screen
          name={PROJECT_ROUTES.CREATE}
          component={require('../screens/projects/create').default}
          options={{
            title: 'አዲስ ፕሮጀክት ይፍጠሩ',
            header: (props) => (
              <require('../components/projects/projects-navbar').default
                {...props}
                title="አዲስ ፕሮጀክት"
                subtitle="AI-ማመቻቸት የተደረገ"
                showBackButton={true}
                showAIAssistant={canUseAI}
                showTemplates={true}
                onAIAssistantPress={() => handleAIAssistant(props.navigation)}
                onTemplatePress={() => props.navigation.navigate('ProjectTemplates')}
                customActions={[
                  {
                    icon: 'rocket',
                    onPress: () => props.navigation.navigate('QuickProjectSetup'),
                    badge: 'ፈጣን'
                  }
                ]}
              />
            )
          }}
        />
      )}

      <Stack.Screen
        name={PROJECT_ROUTES.DETAIL}
        component={require('../screens/projects/detail').default}
        options={({ navigation, route }) => getProjectDetailOptions(navigation, route)}
      />

      {/* ==================== AI-POWERED CONSTRUCTION FEATURES ==================== */}
      
      {canUseAI && (
        <>
          <Stack.Screen
            name={PROJECT_ROUTES.AI_ASSIGNMENT}
            component={require('../screens/projects/ai-assignment').default}
            options={({ navigation, route }) => getAIAssignmentOptions(navigation, route)}
          />

          <Stack.Screen
            name={PROJECT_ROUTES.AI_OPTIMIZATION}
            component={require('../screens/projects/ai-optimization').default}
            options={{
              title: 'የAI ፕሮጀክት ማመቻቸት',
              header: (props) => (
                <require('../components/projects/projects-navbar').default
                  {...props}
                  title="AI ፕሮጀክት ማመቻቸት"
                  subtitle="ብቃት እና ውጤታማነት ማሻሻያ"
                  showBackButton={true}
                  showOptimizationMetrics={true}
                />
              ),
              presentation: PROJECT_NAVIGATION_CONFIG.PRESENTATION.MODAL
            }}
          />
        </>
      )}

      {/* ==================== TEAM & WORKFORCE MANAGEMENT ==================== */}
      
      <Stack.Screen
        name={PROJECT_ROUTES.TEAM}
        component={require('../screens/projects/team').default}
        options={{
          title: 'የፕሮጀክት ቡድን',
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="ፕሮጀክት ቡድን"
              subtitle={`${props.route.params?.teamSize || 0} ሰራተኞች`}
              showBackButton={true}
              showTeamActions={true}
              isAIEnabled={canUseAI}
              onTeamAction={(action) => handleTeamAction(props.navigation, props.route.params?.id, action)}
              customActions={[
                {
                  icon: 'person-add',
                  onPress: () => props.navigation.navigate(PROJECT_ROUTES.INVITATIONS, props.route.params),
                  badge: props.route.params?.pendingInvites || null
                }
              ]}
            />
          )
        }}
      />

      <Stack.Screen
        name={PROJECT_ROUTES.WORKER_REPLACEMENT}
        component={require('../screens/projects/worker-replacement').default}
        options={{
          title: 'ሰራተኛ መተካት',
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="ሰራተኛ መተካት"
              subtitle="AI-የሚመከረ ምትክ"
              showBackButton={true}
              showReplacementOptions={true}
              useAIRecommendations={canUseAI}
            />
          ),
          presentation: PROJECT_NAVIGATION_CONFIG.PRESENTATION.MODAL
        }}
      />

      {/* ==================== FIELD OPERATIONS & QUALITY CONTROL ==================== */}
      
      <Stack.Screen
        name={PROJECT_ROUTES.FIELD_INSPECTION}
        component={require('../screens/projects/field-inspection').default}
        options={{
          title: 'ፊልድ ምርመራ',
          headerTransparent: true,
          headerTintColor: theme.colors.text.inverse,
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="ፊልድ ምርመራ"
              subtitle="ከመስክ ውስጥ ምርመራ"
              showBackButton={true}
              showFieldActions={true}
              isOfflineCapable={true}
              onFieldAction={(action) => handleFieldAction(props.navigation, props.route.params?.projectId, action)}
            />
          )
        }}
      />

      <Stack.Screen
        name={PROJECT_ROUTES.QUALITY_CONTROL}
        component={require('../screens/projects/quality-control').default}
        options={{
          title: 'ጥራት መቆጣጠሪያ',
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="ጥራት መቆጣጠሪያ"
              subtitle="የኢትዮጵያ ህንፃ ደረጃዎች"
              showBackButton={true}
              showQualityMetrics={true}
              complianceStandard={ETHIOPIAN_CONSTRUCTION_CONFIG.CONSTRUCTION_STANDARDS.ETHIOPIAN_BUILDING_CODE}
            />
          )
        }}
      />

      <Stack.Screen
        name={PROJECT_ROUTES.SAFETY_MANAGEMENT}
        component={require('../screens/projects/safety-management').default}
        options={{
          title: 'ደህንነት አስተዳደር',
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="ደህንነት አስተዳደር"
              subtitle="የግንባታ ጣቢያ ደህንነት"
              showBackButton={true}
              showSafetyAlerts={true}
            />
          )
        }}
      />

      {/* ==================== FINANCIAL MANAGEMENT & BUDGETING ==================== */}
      
      <Stack.Screen
        name={PROJECT_ROUTES.BUDGET}
        component={require('../screens/projects/budget').default}
        options={{
          title: 'የፕሮጀክት በጀት',
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="ፕሮጀክት በጀት"
              subtitle="የኢትዮጵያ ግንባታ ዋጋ"
              showBackButton={true}
              showBudgetActions={true}
              isAIEnabled={canUseAI}
              currency="ETB"
              onBudgetAction={(action) => handleBudgetAction(props.navigation, props.route.params?.id, action)}
            />
          )
        }}
      />

      {canUseAI && (
        <Stack.Screen
          name={PROJECT_ROUTES.BUDGET_OPTIMIZATION}
          component={require('../screens/projects/budget-optimization').default}
          options={{
            title: 'የAI በጀት ማመቻቸት',
            header: (props) => (
              <require('../components/projects/projects-navbar').default
                {...props}
                title="AI በጀት ማመቻቸት"
                subtitle="የዋጋ ቅነሳ እና ማመቻቸት"
                showBackButton={true}
                showCostPredictions={true}
              />
            ),
            presentation: PROJECT_NAVIGATION_CONFIG.PRESENTATION.MODAL
          }}
        />
      )}

      {/* ==================== ETHIOPIAN MARKET SPECIFIC FEATURES ==================== */}
      
      <Stack.Screen
        name={PROJECT_ROUTES.ETHIOPIAN_COMPLIANCE}
        component={require('../screens/projects/ethiopian-compliance').default}
        options={{
          title: 'የኢትዮጵያ ተገዢነት',
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="የኢትዮጵያ ተገዢነት"
              subtitle="የህግ እና ደረጃ ተገዢነት"
              showBackButton={true}
              showComplianceChecklist={true}
              complianceStandards={Object.values(ETHIOPIAN_CONSTRUCTION_CONFIG.CONSTRUCTION_STANDARDS)}
            />
          )
        }}
      />

      <Stack.Screen
        name={PROJECT_ROUTES.LOCAL_SUPPLIERS}
        component={require('../screens/projects/local-suppliers').default}
        options={{
          title: 'አገር አቀፍ አቅራቢዎች',
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="አገር አቀፍ አቅራቢዎች"
              subtitle="የኢትዮጵያ ግንባታ እቃዎች"
              showBackButton={true}
              showSupplierFilters={true}
              regions={Object.values(ETHIOPIAN_CONSTRUCTION_CONFIG.REGIONS)}
            />
          )
        }}
      />

      {/* ==================== ANALYTICS & REPORTING ==================== */}
      
      <Stack.Screen
        name={PROJECT_ROUTES.ANALYTICS}
        component={require('../screens/projects/analytics').default}
        options={{
          title: 'የፕሮጀክት ትንተና',
          header: (props) => (
            <require('../components/projects/projects-navbar').default
              {...props}
              title="ፕሮጀክት ትንተና"
              subtitle="በትክክለኛ-ጊዜ መረጃ"
              showBackButton={true}
              showAnalyticsControls={true}
              onAnalyticsControl={(control, value) => handleAnalyticsControl(props.route.params?.id, control, value)}
              customActions={[
                {
                  icon: 'download',
                  onPress: () => props.navigation.navigate('AnalyticsExport', props.route.params)
                },
                {
                  icon: 'share',
                  onPress: () => props.navigation.navigate('AnalyticsShare', props.route.params)
                }
              ]}
            />
          )
        }}
      />

      {/* ==================== EMERGENCY & ADMINISTRATION ==================== */}
      
      <Stack.Group
        screenOptions={{
          presentation: PROJECT_NAVIGATION_CONFIG.PRESENTATION.FULL_SCREEN,
          headerShown: false,
          gestureEnabled: false
        }}
      >
        <Stack.Screen
          name="ProjectEmergency"
          component={require('../screens/projects/emergency').default}
        />
        
        <Stack.Screen
          name="ProjectSecurityBreach"
          component={require('../screens/projects/security-breach').default}
        />
      </Stack.Group>

      {/* ==================== GOVERNMENT PROJECTS ACCESS ==================== */}
      
      {canAccessGovernmentProjects && (
        <Stack.Screen
          name="GovernmentProjects"
          component={require('../screens/projects/government-projects').default}
          options={{
            title: 'የመንግሥት ፕሮጀክቶች',
            header: (props) => (
              <require('../components/projects/projects-navbar').default
                {...props}
                title="የመንግሥት ፕሮጀክቶች"
                subtitle="የመንግሥት መሠረተ ልማት ፕሮጀክቶች"
                showBackButton={true}
                showGovernmentFeatures={true}
                securityLevel="high"
              />
            )
          }}
        />
      )}
    </Stack.Navigator>
  );
};

// ==================== ENTERPRISE UTILITY FUNCTIONS ====================
const getProjectSubtitle = (project) => {
  if (!project) return 'ፕሮጀክት ዝርዝሮች';
  
  const statusMap = {
    'planning': 'በዕቅድ ላይ',
    'active': 'ንቁ',
    'on_hold': 'በጊዜ ማቆም ላይ', 
    'completed': 'ተጠናቅቋል',
    'cancelled': 'ተሰርዟል'
  };
  
  return `${statusMap[project.status] || 'ያልታወቀ'} • ${project.progress || 0}% ተጠናቅቋል`;
};

const getProjectDetailActions = (project, canUseAI) => {
  const baseActions = [
    { icon: 'share', label: 'አጋራ', action: 'share_project' },
    { icon: 'document', label: 'ሪፖርት', action: 'generate_report' }
  ];

  if (canUseAI) {
    baseActions.unshift({ icon: 'rocket', label: 'AI አመቻች', action: 'ai_optimize' });
  }

  if (project?.status === 'active') {
    baseActions.push({ icon: 'warning', label: 'አደጋ', action: 'emergency_stop' });
  }

  return baseActions;
};

// ==================== ENTERPRISE ACTION HANDLER IMPLEMENTATIONS ====================
const handleAIAssistant = (navigation) => {
  navigation.navigate('ProjectAIAssistant', { 
    mode: 'project_creation',
    features: ['cost_optimization', 'team_matching', 'timeline_prediction', 'risk_assessment']
  });
};

const handleTeamAction = (navigation, projectId, action) => {
  const teamActionHandlers = {
    invite_members: () => navigation.navigate(PROJECT_ROUTES.INVITATIONS, { projectId }),
    ai_assign: () => navigation.navigate(PROJECT_ROUTES.AI_ASSIGNMENT, { projectId }),
    replace_worker: () => navigation.navigate(PROJECT_ROUTES.WORKER_REPLACEMENT, { projectId }),
    team_analytics: () => navigation.navigate('TeamAnalytics', { projectId }),
    skill_gaps: () => navigation.navigate('TeamSkillGaps', { projectId })
  };

  const handler = teamActionHandlers[action];
  if (handler) handler();
};

const handleFieldAction = (navigation, projectId, action) => {
  const fieldActionHandlers = {
    take_photos: () => navigation.navigate('FieldPhotos', { projectId }),
    record_issues: () => navigation.navigate('FieldIssues', { projectId }),
    safety_check: () => navigation.navigate(PROJECT_ROUTES.SAFETY_MANAGEMENT, { projectId }),
    sync_data: () => navigation.navigate('FieldSync', { projectId })
  };

  const handler = fieldActionHandlers[action];
  if (handler) handler();
};

const handleBudgetAction = (navigation, projectId, action) => {
  const budgetActionHandlers = {
    ai_optimize: () => navigation.navigate(PROJECT_ROUTES.BUDGET_OPTIMIZATION, { projectId }),
    export_budget: () => navigation.navigate('BudgetExport', { projectId }),
    cost_analysis: () => navigation.navigate(PROJECT_ROUTES.ANALYTICS, { projectId, view: 'cost_analysis' }),
    supplier_compare: () => navigation.navigate(PROJECT_ROUTES.LOCAL_SUPPLIERS, { projectId })
  };

  const handler = budgetActionHandlers[action];
  if (handler) handler();
};

const handleAnalyticsControl = (projectId, control, value) => {
  analyticsService.trackEvent('project_analytics_control', { projectId, control, value });
};

// ==================== ENTERPRISE PROJECTS NAVIGATION SERVICE ====================
export const ProjectsNavigationService = (() => {
  let navigationRef;

  const setNavigationRef = (ref) => {
    navigationRef = ref;
  };

  const navigateToAICreation = (projectType, quickData = {}) => {
    navigationRef?.navigate(PROJECT_ROUTES.CREATE, {
      projectType,
      ...quickData,
      useAI: true,
      autoConfigure: true,
      optimizeFor: ['cost', 'time', 'quality', 'sustainability'],
      ethiopianCompliance: true
    });
  };

  const navigateToQuickProject = (template, parameters = {}) => {
    const templates = {
      'residential_house': {
        type: ETHIOPIAN_CONSTRUCTION_CONFIG.PROJECT_TYPES.RESIDENTIAL_HOUSE,
        workerTypes: [
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.ENGINEER,
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.ARCHITECT,
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.MASON,
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.CARPENTER
        ],
        estimatedDuration: '6 ወራት',
        budgetRange: '500,000 - 2,000,000 ETB'
      },
      'apartment_building': {
        type: ETHIOPIAN_CONSTRUCTION_CONFIG.PROJECT_TYPES.APARTMENT_BUILDING,
        workerTypes: [
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.ENGINEER,
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.STEEL_FIXER,
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.MASON,
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.HEAVY_EQUIPMENT_OPERATOR
        ],
        estimatedDuration: '12-24 ወራት',
        budgetRange: '5,000,000 - 50,000,000 ETB'
      },
      'government_infrastructure': {
        type: ETHIOPIAN_CONSTRUCTION_CONFIG.PROJECT_TYPES.GOVERNMENT_INFRASTRUCTURE,
        workerTypes: [
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.ENGINEER,
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.ARCHITECT,
          ETHIOPIAN_CONSTRUCTION_CONFIG.WORKER_TYPES.HEAVY_EQUIPMENT_OPERATOR
        ],
        estimatedDuration: '24+ ወራት',
        budgetRange: '50,000,000+ ETB',
        requiresApproval: true
      }
    };

    const templateConfig = templates[template] || templates.residential_house;
    
    navigationRef?.navigate(PROJECT_ROUTES.CREATE, {
      ...templateConfig,
      ...parameters,
      quickSetup: true,
      useAITemplate: true,
      ethiopianStandards: true
    });
  };

  const navigateToAIAssignment = (projectId, optimizationGoals = []) => {
    navigationRef?.navigate(PROJECT_ROUTES.AI_ASSIGNMENT, {
      projectId,
      optimizationGoals,
      consider: ['location', 'availability', 'ratings', 'cost', 'experience', 'certifications'],
      ethiopianWorkforce: true,
      regionalPreferences: true
    });
  };

  const navigateToWorkerReplacement = (projectId, workerId, replacementReason) => {
    navigationRef?.navigate(PROJECT_ROUTES.WORKER_REPLACEMENT, {
      projectId,
      workerId,
      replacementReason,
      useAIRecommendation: true,
      priority: 'urgent',
      maintainTeamDynamics: true
    });
  };

  const navigateToFieldInspection = (projectId, inspectionType = 'routine') => {
    navigationRef?.navigate(PROJECT_ROUTES.FIELD_INSPECTION, {
      projectId,
      inspectionType,
      offlineCapable: true,
      autoSync: true,
      gpsTracking: true,
      photoDocumentation: true
    });
  };

  const navigateToBudgetOptimization = (projectId, constraints = {}) => {
    navigationRef?.navigate(PROJECT_ROUTES.BUDGET_OPTIMIZATION, {
      projectId,
      constraints,
      optimizationMode: 'smart',
      considerAlternatives: true,
      ethiopianMarketPrices: true,
      localSupplierOptions: true
    });
  };

  const navigateToProjectAnalytics = (projectId, metrics = [], timeframe = 'all') => {
    navigationRef?.navigate(PROJECT_ROUTES.ANALYTICS, {
      projectId,
      metrics,
      timeframe,
      comparativeAnalysis: true,
      predictiveInsights: true,
      benchmarkAgainst: 'ethiopian_industry'
    });
  };

  const navigateToEmergency = (projectId, emergencyType, context = {}) => {
    navigationRef?.navigate('ProjectEmergency', {
      projectId,
      emergencyType,
      context,
      timestamp: Date.now(),
      emergencyProtocol: 'construction_site_emergency'
    });
  };

  const navigateToGovernmentPortal = (department, accessLevel = 'standard') => {
    navigationRef?.navigate('GovernmentProjectPortal', {
      department,
      accessLevel,
      securityClearance: 'verified',
      ethiopianGovernment: true
    });
  };

  return {
    setNavigationRef,
    navigateToAICreation,
    navigateToQuickProject,
    navigateToAIAssignment,
    navigateToWorkerReplacement,
    navigateToFieldInspection,
    navigateToBudgetOptimization,
    navigateToProjectAnalytics,
    navigateToEmergency,
    navigateToGovernmentPortal,
    ROUTES: PROJECT_ROUTES,
    CONFIG: ETHIOPIAN_CONSTRUCTION_CONFIG,
    CONSTANTS: PROJECT_NAVIGATION_CONFIG
  };
})();

export default ProjectsNavigator;