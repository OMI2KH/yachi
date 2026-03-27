/**
 * 🎯 ENTERPRISE GOVERNMENT BUDGET MANAGEMENT SCREEN v3.0
 * 
 * Enhanced Features:
 * - AI-powered budget optimization and forecasting
 * - Ethiopian government fiscal year integration
 * - Multi-level budget allocation (Federal, Regional, City)
 * - Real-time budget tracking and analytics
 * - Construction project budget integration
 * - Compliance and audit trail
 * - Offline budget management
 * - TypeScript-first with enterprise security
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useGovernment } from '../../contexts/government-context';
import { useAI } from '../../contexts/ai-matching-context';
import { 
  analyticsService, 
  budgetService, 
  complianceService,
  reportService 
} from '../../services';

// Import Enterprise Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import BudgetAllocationCard from '../../components/government/budget-allocation-card';
import BudgetProgressChart from '../../components/analytics/budget-progress-chart';
import AIBudgetOptimizer from '../../components/ai/ai-budget-optimizer';
import ComplianceTracker from '../../components/government/compliance-tracker';
import OfflineBudgetManager from '../../components/government/offline-budget-manager';
import EthiopianFiscalCalendar from '../../components/government/ethiopian-fiscal-calendar';

// Import Enterprise Constants
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/sizes';
import { BUDGET_CATEGORIES, FISCAL_YEARS } from '../../constants/government';
import { ETHIOPIAN_REGIONS } from '../../constants/location';

// ==================== ENTERPRISE CONSTANTS ====================
const BUDGET_VIEWS = Object.freeze({
  OVERVIEW: 'overview',
  ALLOCATION: 'allocation',
  TRACKING: 'tracking',
  FORECAST: 'forecast',
  COMPLIANCE: 'compliance'
});

const BUDGET_CATEGORY_CONFIG = Object.freeze({
  INFRASTRUCTURE: {
    label: 'መሠረተ ልማት',
    color: COLORS.primary.main,
    icon: '🏗️',
    subcategories: ['roads', 'bridges', 'buildings', 'utilities']
  },
  EDUCATION: {
    label: 'ትምህርት',
    color: COLORS.semantic.info.main,
    icon: '🎓',
    subcategories: ['schools', 'universities', 'training', 'materials']
  },
  HEALTHCARE: {
    label: 'ጤና',
    color: COLORS.semantic.success.main,
    icon: '🏥',
    subcategories: ['hospitals', 'clinics', 'equipment', 'medicines']
  },
  AGRICULTURE: {
    label: 'ግብርና',
    color: COLORS.semantic.warning.main,
    icon: '🚜',
    subcategories: ['irrigation', 'equipment', 'research', 'subsidies']
  },
  SECURITY: {
    label: 'ደህንነት',
    color: COLORS.semantic.error.main,
    icon: '🛡️',
    subcategories: ['police', 'fire', 'emergency', 'equipment']
  }
});

const FISCAL_MONTHS = Object.freeze([
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
]);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GovernmentBudgetManagementScreen = ({ navigation, route }) => {
  // ==================== ENTERPRISE HOOKS ====================
  const { theme, isDark } = useTheme();
  const { user, hasPermission } = useAuth();
  const { 
    governmentData, 
    budgetData, 
    updateBudget,
    syncGovernmentData 
  } = useGovernment();
  const { optimizeBudget, forecastSpending, analyzeCompliance } = useAI();

  // ==================== ENTERPRISE STATE MANAGEMENT ====================
  const [currentView, setCurrentView] = useState(BUDGET_VIEWS.OVERVIEW);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(FISCAL_YEARS.CURRENT);
  const [selectedRegion, setSelectedRegion] = useState('federal');
  const [budgetAllocations, setBudgetAllocations] = useState({});
  const [aiOptimizations, setAiOptimizations] = useState([]);
  const [complianceStatus, setComplianceStatus] = useState({});
  const [offlineMode, setOfflineMode] = useState(false);

  // Budget editing state
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetChanges, setBudgetChanges] = useState({});

  // Animation states
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // ==================== ENTERPRISE EFFECTS ====================
  useEffect(() => {
    initializeBudgetManagement();
  }, []);

  useEffect(() => {
    if (budgetData) {
      loadBudgetAllocations();
      checkCompliance();
      loadAIOptimizations();
    }
  }, [budgetData, selectedFiscalYear, selectedRegion]);

  useEffect(() => {
    startEntranceAnimation();
  }, [currentView]);

  // ==================== ENTERPRISE INITIALIZATION ====================
  const initializeBudgetManagement = useCallback(async () => {
    try {
      performanceService.startMeasurement('budget_management_initialization');
      
      trackScreenView('government_budget_management');
      
      // Check permissions
      if (!hasPermission('government:budget:manage')) {
        Alert.alert('ፍቃድ የለም', 'የበጀት አስተዳደር ፍቃድ ያስፈልግዎታል');
        navigation.goBack();
        return;
      }

      // Load initial data
      await Promise.all([
        loadBudgetData(),
        checkConnectivity()
      ]);

      performanceService.endMeasurement('budget_management_initialization');

    } catch (error) {
      console.error('Budget management initialization failed:', error);
      Alert.alert('ስህተት', 'የበጀት አስተዳደር መጫን አልተሳካም።');
    }
  }, [hasPermission, navigation]);

  const loadBudgetData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await budgetService.getGovernmentBudget({
        fiscalYear: selectedFiscalYear,
        region: selectedRegion,
        department: user?.department
      });
      
      // Initialize budget allocations
      initializeBudgetAllocations(data);
      
    } catch (error) {
      console.error('Budget data load failed:', error);
      setOfflineMode(true);
    } finally {
      setLoading(false);
    }
  }, [selectedFiscalYear, selectedRegion, user]);

  const initializeBudgetAllocations = useCallback((data) => {
    const allocations = {};
    
    Object.keys(BUDGET_CATEGORY_CONFIG).forEach(category => {
      allocations[category] = {
        allocated: data.allocations?.[category] || 0,
        spent: data.expenditures?.[category] || 0,
        committed: data.commitments?.[category] || 0,
        available: (data.allocations?.[category] || 0) - (data.expenditures?.[category] || 0)
      };
    });

    setBudgetAllocations(allocations);
  }, []);

  // ==================== ENTERPRISE BUDGET FUNCTIONS ====================
  const loadBudgetAllocations = useCallback(() => {
    if (!budgetData) return;
    initializeBudgetAllocations(budgetData);
  }, [budgetData, initializeBudgetAllocations]);

  const handleBudgetUpdate = useCallback(async (category, newAmount) => {
    try {
      const updatedBudget = await budgetService.updateBudgetAllocation({
        category,
        amount: newAmount,
        fiscalYear: selectedFiscalYear,
        region: selectedRegion,
        department: user?.department,
        userId: user?.id
      });

      setBudgetAllocations(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          allocated: newAmount,
          available: newAmount - prev[category].spent
        }
      }));

      // Track budget change
      await analyticsService.trackEvent('budget_allocation_updated', {
        category,
        previousAmount: budgetAllocations[category]?.allocated || 0,
        newAmount,
        fiscalYear: selectedFiscalYear,
        region: selectedRegion
      });

      Alert.alert('ተሳክቷል', `${BUDGET_CATEGORY_CONFIG[category].label} በጀት ተስተካክሏል`);

    } catch (error) {
      console.error('Budget update failed:', error);
      Alert.alert('ስህተት', 'የበጀት ማዘመን አልተሳካም።');
    }
  }, [budgetAllocations, selectedFiscalYear, selectedRegion, user]);

  const handleBulkAllocation = useCallback(async (allocations) => {
    try {
      setLoading(true);
      
      const results = await budgetService.bulkUpdateAllocations({
        allocations,
        fiscalYear: selectedFiscalYear,
        region: selectedRegion,
        department: user?.department
      });

      setBudgetAllocations(prev => ({
        ...prev,
        ...results.updatedAllocations
      }));

      await analyticsService.trackEvent('bulk_budget_allocation', {
        allocationCount: Object.keys(allocations).length,
        totalAmount: Object.values(allocations).reduce((sum, amount) => sum + amount, 0),
        fiscalYear: selectedFiscalYear
      });

      Alert.alert('ተሳክቷል', 'የበጀት ቁጥጥር ተስተካክሏል');

    } catch (error) {
      console.error('Bulk allocation failed:', error);
      Alert.alert('ስህተት', 'የበጀት ቁጥጥር አልተሳካም።');
    } finally {
      setLoading(false);
    }
  }, [selectedFiscalYear, selectedRegion, user]);

  // ==================== ENTERPRISE AI FUNCTIONS ====================
  const loadAIOptimizations = useCallback(async () => {
    try {
      const optimizations = await optimizeBudget({
        currentAllocations: budgetAllocations,
        historicalData: await budgetService.getHistoricalData(selectedFiscalYear - 1),
        priorities: governmentData?.priorities || [],
        constraints: {
          totalBudget: budgetData?.totalBudget || 0,
          mandatorySpending: budgetData?.mandatorySpending || 0
        }
      });

      setAiOptimizations(optimizations);

    } catch (error) {
      console.warn('AI budget optimization failed:', error);
    }
  }, [budgetAllocations, selectedFiscalYear, budgetData, governmentData]);

  const applyAIOptimization = useCallback(async (optimization) => {
    try {
      Alert.alert(
        'AI የበጀት አመቻች',
        optimization.description,
        [
          { text: 'ዝግ', style: 'cancel' },
          { 
            text: 'ተግብር', 
            onPress: async () => {
              await handleBulkAllocation(optimization.recommendedAllocations);
              
              await analyticsService.trackEvent('ai_budget_optimization_applied', {
                optimizationId: optimization.id,
                expectedSavings: optimization.expectedSavings,
                impact: optimization.impact
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('AI optimization application failed:', error);
    }
  }, [handleBulkAllocation]);

  const generateBudgetForecast = useCallback(async () => {
    try {
      const forecast = await forecastSpending({
        currentAllocations: budgetAllocations,
        historicalSpending: await budgetService.getSpendingHistory(3), // Last 3 years
        economicIndicators: await budgetService.getEconomicIndicators(),
        governmentPriorities: governmentData?.priorities || []
      });

      navigation.navigate('BudgetForecast', { forecastData: forecast });

    } catch (error) {
      console.error('Budget forecast generation failed:', error);
      Alert.alert('ስህተት', 'የበጀት ትንበያ ማመንጨት አልተሳካም።');
    }
  }, [budgetAllocations, governmentData, navigation]);

  // ==================== ENTERPRISE COMPLIANCE FUNCTIONS ====================
  const checkCompliance = useCallback(async () => {
    try {
      const compliance = await analyzeCompliance({
        allocations: budgetAllocations,
        regulations: await complianceService.getBudgetRegulations(),
        historicalData: await budgetService.getComplianceHistory(),
        department: user?.department
      });

      setComplianceStatus(compliance);

    } catch (error) {
      console.warn('Compliance check failed:', error);
    }
  }, [budgetAllocations, user]);

  const generateComplianceReport = useCallback(async () => {
    try {
      const report = await reportService.generateComplianceReport({
        budgetData: budgetAllocations,
        complianceStatus,
        fiscalYear: selectedFiscalYear,
        region: selectedRegion
      });

      navigation.navigate('ComplianceReport', { reportData: report });

    } catch (error) {
      console.error('Compliance report generation failed:', error);
      Alert.alert('ስህተት', 'የተገዥነት ሪፖርት ማመንጨት አልተሳካም።');
    }
  }, [budgetAllocations, complianceStatus, selectedFiscalYear, selectedRegion, navigation]);

  // ==================== ENTERPRISE CONNECTIVITY FUNCTIONS ====================
  const checkConnectivity = useCallback(async () => {
    try {
      const isOnline = await budgetService.checkConnectivity();
      setOfflineMode(!isOnline);
    } catch (error) {
      console.warn('Connectivity check failed:', error);
      setOfflineMode(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        syncGovernmentData(),
        loadBudgetData(),
        checkConnectivity()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [syncGovernmentData, loadBudgetData, checkConnectivity]);

  // ==================== ENTERPRISE ANIMATION FUNCTIONS ====================
  const startEntranceAnimation = useCallback(() => {
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
  }, [fadeAnim, slideAnim]);

  // ==================== RENDER FUNCTIONS ====================
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.headerTop}>
        <ThemedText type="title" style={styles.title}>
          የበጀት አስተዳደር
        </ThemedText>
        
        <View style={styles.headerActions}>
          <Button
            title="ሪፖርት"
            onPress={generateComplianceReport}
            type="outline"
            size="small"
            icon="document"
          />
          
          <Button
            title={refreshing ? "በማዘመን ላይ..." : "አዘምን"}
            onPress={handleRefresh}
            type="primary"
            size="small"
            icon="refresh"
            loading={refreshing}
          />
        </View>
      </View>

      {/* Fiscal Year and Region Selector */}
      <View style={styles.selectorRow}>
        <View style={styles.selector}>
          <ThemedText type="caption" style={styles.selectorLabel}>
            የገንዘብ ዓመት
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.values(FISCAL_YEARS).map(year => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.selectorOption,
                  selectedFiscalYear === year && styles.selectorOptionActive
                ]}
                onPress={() => setSelectedFiscalYear(year)}
              >
                <ThemedText 
                  type="caption" 
                  style={[
                    styles.selectorText,
                    selectedFiscalYear === year && styles.selectorTextActive
                  ]}
                >
                  {year}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.selector}>
          <ThemedText type="caption" style={styles.selectorLabel}>
            ክልል
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['federal', ...ETHIOPIAN_REGIONS.map(r => r.value)].map(region => (
              <TouchableOpacity
                key={region}
                style={[
                  styles.selectorOption,
                  selectedRegion === region && styles.selectorOptionActive
                ]}
                onPress={() => setSelectedRegion(region)}
              >
                <ThemedText 
                  type="caption" 
                  style={[
                    styles.selectorText,
                    selectedRegion === region && styles.selectorTextActive
                  ]}
                >
                  {region === 'federal' ? 'ፌዴራል' : region}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* View Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.viewSelector}
      >
        {Object.entries(BUDGET_VIEWS).map(([key, view]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.viewButton,
              currentView === view && styles.viewButtonActive
            ]}
            onPress={() => setCurrentView(view)}
          >
            <ThemedText 
              type="caption" 
              style={[
                styles.viewText,
                currentView === view && styles.viewTextActive
              ]}
            >
              {getViewLabel(view)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const getViewLabel = (view) => {
    const labels = {
      [BUDGET_VIEWS.OVERVIEW]: 'ሁሉንም',
      [BUDGET_VIEWS.ALLOCATION]: 'ቁጥጥር',
      [BUDGET_VIEWS.TRACKING]: 'ቍጥጥር',
      [BUDGET_VIEWS.FORECAST]: 'ትንበያ',
      [BUDGET_VIEWS.COMPLIANCE]: 'ተገዢነት'
    };
    return labels[view] || view;
  };

  const renderOverview = () => (
    <Animated.View 
      style={[
        styles.contentSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {/* Budget Summary */}
      <View style={styles.budgetSummary}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          የበጀት ማጠቃለያ
        </ThemedText>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <ThemedText type="title" style={styles.summaryValue}>
              {formatCurrency(getTotalAllocated())}
            </ThemedText>
            <ThemedText type="caption" style={styles.summaryLabel}>
              የተመደበ
            </ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText type="title" style={styles.summaryValue}>
              {formatCurrency(getTotalSpent())}
            </ThemedText>
            <ThemedText type="caption" style={styles.summaryLabel}>
              የተለገሰ
            </ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText type="title" style={styles.summaryValue}>
              {formatCurrency(getTotalAvailable())}
            </ThemedText>
            <ThemedText type="caption" style={styles.summaryLabel}>
              የቀረ
            </ThemedText>
          </View>
          
          <View style={styles.summaryItem}>
            <ThemedText type="title" style={styles.summaryValue}>
              {getUtilizationRate()}%
            </ThemedText>
            <ThemedText type="caption" style={styles.summaryLabel}>
              ፈጻሚነት
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Budget Progress Chart */}
      <BudgetProgressChart
        allocations={budgetAllocations}
        categoryConfig={BUDGET_CATEGORY_CONFIG}
        style={styles.progressChart}
      />

      {/* AI Optimizations */}
      {aiOptimizations.length > 0 && (
        <AIBudgetOptimizer
          optimizations={aiOptimizations}
          onOptimizationApply={applyAIOptimization}
          style={styles.aiOptimizer}
        />
      )}
    </Animated.View>
  );

  const renderAllocationView = () => (
    <Animated.View 
      style={[
        styles.contentSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        የበጀት ቁጥጥር
      </ThemedText>

      <ScrollView style={styles.allocationList}>
        {Object.entries(BUDGET_CATEGORY_CONFIG).map(([category, config]) => (
          <BudgetAllocationCard
            key={category}
            category={category}
            config={config}
            allocation={budgetAllocations[category]}
            onAllocationUpdate={(amount) => handleBudgetUpdate(category, amount)}
            canEdit={hasPermission('government:budget:edit')}
            style={styles.allocationCard}
          />
        ))}
      </ScrollView>

      {/* Bulk Allocation Action */}
      {hasPermission('government:budget:edit') && (
        <Button
          title="የቡልክ ቁጥጥር"
          onPress={() => navigation.navigate('BulkAllocation')}
          type="outline"
          style={styles.bulkActionButton}
        />
      )}
    </Animated.View>
  );

  const renderTrackingView = () => (
    <Animated.View 
      style={[
        styles.contentSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        የበጀት ቍጥጥር
      </ThemedText>

      <EthiopianFiscalCalendar
        fiscalYear={selectedFiscalYear}
        spendingData={budgetData?.monthlySpending || {}}
        allocations={budgetAllocations}
        style={styles.fiscalCalendar}
      />

      {/* Spending Alerts */}
      {renderSpendingAlerts()}
    </Animated.View>
  );

  const renderSpendingAlerts = () => {
    const alerts = checkSpendingAlerts();
    if (alerts.length === 0) return null;

    return (
      <View style={styles.alertsSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          የሚጠበቁ ማስተዎሪያዎች
        </ThemedText>
        
        {alerts.map((alert, index) => (
          <View key={index} style={styles.alertItem}>
            <ThemedText type="caption" style={styles.alertText}>
              ⚠️ {alert.message}
            </ThemedText>
          </View>
        ))}
      </View>
    );
  };

  const checkSpendingAlerts = () => {
    const alerts = [];
    const currentMonth = new Date().getMonth();

    Object.entries(budgetAllocations).forEach(([category, data]) => {
      const utilization = (data.spent / data.allocated) * 100;
      
      // Check for overspending
      if (utilization > 80 && currentMonth < 8) { // Before May in Ethiopian calendar
        alerts.push({
          type: 'overspending',
          category,
          message: `${BUDGET_CATEGORY_CONFIG[category].label} በጣም በፍጥነት እየተጠቀም ነው`
        });
      }

      // Check for underspending
      if (utilization < 20 && currentMonth > 5) { // After March in Ethiopian calendar
        alerts.push({
          type: 'underspending',
          category,
          message: `${BUDGET_CATEGORY_CONFIG[category].label} በቂ አለመጠቀም`
        });
      }
    });

    return alerts;
  };

  const renderComplianceView = () => (
    <ComplianceTracker
      complianceStatus={complianceStatus}
      onGenerateReport={generateComplianceReport}
      style={styles.complianceTracker}
    />
  );

  // ==================== ENTERPRISE HELPER FUNCTIONS ====================
  const getTotalAllocated = () => {
    return Object.values(budgetAllocations).reduce((sum, allocation) => 
      sum + (allocation.allocated || 0), 0
    );
  };

  const getTotalSpent = () => {
    return Object.values(budgetAllocations).reduce((sum, allocation) => 
      sum + (allocation.spent || 0), 0
    );
  };

  const getTotalAvailable = () => {
    return Object.values(budgetAllocations).reduce((sum, allocation) => 
      sum + (allocation.available || 0), 0
    );
  };

  const getUtilizationRate = () => {
    const totalAllocated = getTotalAllocated();
    const totalSpent = getTotalSpent();
    return totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `ETB ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `ETB ${(amount / 1000).toFixed(1)}K`;
    }
    return `ETB ${amount}`;
  };

  // ==================== MAIN RENDER ====================
  const renderCurrentView = () => {
    switch (currentView) {
      case BUDGET_VIEWS.OVERVIEW:
        return renderOverview();
      case BUDGET_VIEWS.ALLOCATION:
        return renderAllocationView();
      case BUDGET_VIEWS.TRACKING:
        return renderTrackingView();
      case BUDGET_VIEWS.COMPLIANCE:
        return renderComplianceView();
      default:
        return renderOverview();
    }
  };

  return (
    <ThemedView style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentView()}
      </ScrollView>

      {/* Offline Mode Indicator */}
      {offlineMode && (
        <OfflineBudgetManager
          onSync={handleRefresh}
          style={styles.offlineManager}
        />
      )}

      {/* Forecast Action */}
      <View style={styles.footerActions}>
        <Button
          title="የበጀት ትንበያ ይፍጠሩ"
          onPress={generateBudgetForecast}
          type="primary"
          icon="analytics"
        />
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
    padding: SPACING.lg,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  selector: {
    flex: 1,
  },
  selectorLabel: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  selectorOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: theme.colors.background.secondary,
    marginRight: SPACING.sm,
  },
  selectorOptionActive: {
    backgroundColor: COLORS.primary.main,
  },
  selectorText: {
    fontWeight: '500',
  },
  selectorTextActive: {
    color: COLORS.text.inverse,
    fontWeight: '600',
  },
  viewSelector: {
    marginBottom: SPACING.sm,
  },
  viewButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
    marginRight: SPACING.sm,
  },
  viewButtonActive: {
    backgroundColor: COLORS.primary.main,
  },
  viewText: {
    fontWeight: '500',
  },
  viewTextActive: {
    color: COLORS.text.inverse,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentSection: {
    padding: SPACING.lg,
  },
  budgetSummary: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background.secondary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  summaryLabel: {
    opacity: 0.8,
  },
  progressChart: {
    marginBottom: SPACING.xl,
  },
  aiOptimizer: {
    marginBottom: SPACING.lg,
  },
  allocationList: {
    maxHeight: 400,
  },
  allocationCard: {
    marginBottom: SPACING.md,
  },
  bulkActionButton: {
    marginTop: SPACING.md,
  },
  fiscalCalendar: {
    marginBottom: SPACING.xl,
  },
  alertsSection: {
    backgroundColor: theme.colors.semantic.warning.light + '20',
    padding: SPACING.lg,
    borderRadius: 12,
  },
  alertItem: {
    marginBottom: SPACING.sm,
  },
  alertText: {
    color: COLORS.semantic.warning.dark,
  },
  complianceTracker: {
    margin: SPACING.lg,
  },
  offlineManager: {
    position: 'absolute',
    bottom: 80,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  footerActions: {
    padding: SPACING.lg,
  },
});

export default GovernmentBudgetManagementScreen;