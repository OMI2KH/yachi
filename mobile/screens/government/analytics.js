import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useGovernment } from '../../../hooks/use-government';
import {
  ThemedView,
  ThemedText,
} from '../../../components/themed-view';
import {
  Card,
  Button,
  Loading,
  DatePicker,
  Dropdown,
  Chart,
  StatCard,
} from '../../../components/ui';
import { 
  LineChart, 
  BarChart, 
  PieChart,
  ProgressChart,
} from 'react-native-chart-kit';
import { formatCurrency, formatNumber, formatDate } from '../../../utils/formatters';
import { 
  generateAnalyticsData, 
  calculateKPIs,
  generateForecast 
} from '../../../utils/analytics-calculations';

/**
 * Enterprise-level Government Analytics Dashboard
 * Comprehensive analytics for government infrastructure projects
 */
const GovernmentAnalyticsScreen = () => {
  const router = useRouter();
  const { projectId, region } = useLocalSearchParams();
  const { user } = useAuth();
  const { theme, colors } = useTheme();
  const { 
    getGovernmentProjects,
    getProjectAnalytics,
    getRegionalData,
    loading: govLoading 
  } = useGovernment();

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('last_30_days');
  const [selectedRegion, setSelectedRegion] = useState(region || 'all');
  const [selectedProject, setSelectedProject] = useState(projectId || 'all');
  const [chartData, setChartData] = useState({});
  const [kpis, setKpis] = useState({});
  const [projects, setProjects] = useState([]);
  const [regions, setRegions] = useState([]);

  // Date range options
  const dateRanges = [
    { label: 'Last 7 Days', value: 'last_7_days' },
    { label: 'Last 30 Days', value: 'last_30_days' },
    { label: 'Last 90 Days', value: 'last_90_days' },
    { label: 'Year to Date', value: 'year_to_date' },
    { label: 'Last Year', value: 'last_year' },
    { label: 'Custom Range', value: 'custom' },
  ];

  // Chart configuration
  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  const screenWidth = Dimensions.get('window').width - 32;

  /**
   * Fetch analytics data with filters
   */
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters = {
        dateRange,
        region: selectedRegion !== 'all' ? selectedRegion : undefined,
        projectId: selectedProject !== 'all' ? selectedProject : undefined,
        governmentId: user.id,
      };

      const [analytics, projectsList, regionsList] = await Promise.all([
        getProjectAnalytics(filters),
        getGovernmentProjects(filters),
        getRegionalData(),
      ]);

      setAnalyticsData(analytics);
      setProjects(projectsList);
      setRegions(regionsList);

      // Generate chart data and KPIs
      const generatedChartData = generateAnalyticsData(analytics, filters);
      const calculatedKPIs = calculateKPIs(analytics);
      
      setChartData(generatedChartData);
      setKpis(calculatedKPIs);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedRegion, selectedProject, user.id, getProjectAnalytics, getGovernmentProjects, getRegionalData]);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'dateRange':
        setDateRange(value);
        break;
      case 'region':
        setSelectedRegion(value);
        break;
      case 'project':
        setSelectedProject(value);
        break;
    }
  };

  /**
   * Export analytics data
   */
  const handleExportData = async (format = 'pdf') => {
    try {
      Alert.alert(
        'Export Analytics',
        `Export analytics data as ${format.toUpperCase()}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Export',
            onPress: async () => {
              // In real implementation, this would generate and download the file
              await generateExportFile(analyticsData, format, {
                dateRange,
                region: selectedRegion,
                project: selectedProject,
              });
              Alert.alert('Success', `Analytics data exported as ${format.toUpperCase()}`);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export analytics data');
    }
  };

  /**
   * Navigate to detailed report
   */
  const navigateToDetailedReport = (reportType) => {
    router.push({
      pathname: '/government/reports',
      params: {
        reportType,
        dateRange,
        region: selectedRegion,
        project: selectedProject,
      },
    });
  };

  // Fetch data on component mount and filter changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  if (loading && !refreshing) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Loading size="large" message="Loading government analytics..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header with Filters */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <ThemedText type="title">Government Analytics</ThemedText>
          <Button
            variant="outline"
            onPress={() => handleExportData('pdf')}
            size="small"
          >
            Export Report
          </Button>
        </View>

        {/* Filter Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 12 }}>
          <Dropdown
            options={dateRanges}
            selectedValue={dateRange}
            onValueChange={(value) => handleFilterChange('dateRange', value)}
            style={{ minWidth: 150 }}
          />
          
          <Dropdown
            options={[
              { label: 'All Regions', value: 'all' },
              ...regions.map(region => ({ label: region.name, value: region.id }))
            ]}
            selectedValue={selectedRegion}
            onValueChange={(value) => handleFilterChange('region', value)}
            style={{ minWidth: 150 }}
          />
          
          <Dropdown
            options={[
              { label: 'All Projects', value: 'all' },
              ...projects.map(project => ({ 
                label: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name, 
                value: project.id 
              }))
            ]}
            selectedValue={selectedProject}
            onValueChange={(value) => handleFilterChange('project', value)}
            style={{ minWidth: 180 }}
          />
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Summary Cards */}
        <View style={{ marginBottom: 24 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
            📊 Performance Overview
          </ThemedText>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 12 }}>
            <StatCard
              title="Total Projects"
              value={kpis.totalProjects}
              change={kpis.projectsChange}
              changeType={kpis.projectsChange >= 0 ? 'positive' : 'negative'}
              icon="🏗️"
              onPress={() => navigateToDetailedReport('projects')}
            />
            
            <StatCard
              title="Budget Utilization"
              value={`${kpis.budgetUtilization}%`}
              change={kpis.budgetChange}
              changeType={kpis.budgetChange >= 0 ? 'positive' : 'negative'}
              icon="💰"
              format="percentage"
            />
            
            <StatCard
              title="Workers Employed"
              value={formatNumber(kpis.totalWorkers)}
              change={kpis.workersChange}
              changeType={kpis.workersChange >= 0 ? 'positive' : 'negative'}
              icon="👷"
            />
            
            <StatCard
              title="Completion Rate"
              value={`${kpis.completionRate}%`}
              change={kpis.completionChange}
              changeType={kpis.completionChange >= 0 ? 'positive' : 'negative'}
              icon="✅"
              format="percentage"
            />
            
            <StatCard
              title="Avg. Timeline"
              value={`${kpis.avgTimeline}d`}
              change={kpis.timelineChange}
              changeType={kpis.timelineChange <= 0 ? 'positive' : 'negative'}
              icon="⏱️"
              subtitle="Days"
            />
          </ScrollView>
        </View>

        {/* Budget Analysis Section */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText type="subtitle">💰 Budget Analysis</ThemedText>
            <Button
              variant="ghost"
              onPress={() => navigateToDetailedReport('budget')}
              size="small"
            >
              View Details
            </Button>
          </View>

          <View style={{ gap: 16 }}>
            {/* Budget Progress Chart */}
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Budget Utilization by Project
              </ThemedText>
              <ProgressChart
                data={chartData.budgetProgress}
                width={screenWidth}
                height={160}
                strokeWidth={12}
                radius={32}
                chartConfig={chartConfig}
                hideLegend={false}
                style={{ alignSelf: 'center' }}
              />
            </View>

            {/* Budget vs Actual Spending */}
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Budget vs Actual Spending (ETB)
              </ThemedText>
              <BarChart
                data={chartData.budgetVsActual}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                verticalLabelRotation={30}
                showValuesOnTopOfBars
                style={{ alignSelf: 'center' }}
              />
            </View>
          </View>
        </Card>

        {/* Project Progress Section */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText type="subtitle">📈 Project Progress</ThemedText>
            <Button
              variant="ghost"
              onPress={() => navigateToDetailedReport('progress')}
              size="small"
            >
              View Details
            </Button>
          </View>

          <View style={{ gap: 16 }}>
            {/* Timeline Performance */}
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Project Timeline Adherence
              </ThemedText>
              <LineChart
                data={chartData.timelinePerformance}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={{ alignSelf: 'center' }}
              />
            </View>

            {/* Project Status Distribution */}
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Project Status Distribution
              </ThemedText>
              <PieChart
                data={chartData.projectStatus}
                width={screenWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                style={{ alignSelf: 'center' }}
              />
            </View>
          </View>
        </Card>

        {/* Workforce Analytics Section */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText type="subtitle">👷 Workforce Analytics</ThemedText>
            <Button
              variant="ghost"
              onPress={() => navigateToDetailedReport('workforce')}
              size="small"
            >
              View Details
            </Button>
          </View>

          <View style={{ gap: 16 }}>
            {/* Worker Distribution by Skill */}
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Worker Distribution by Skill
              </ThemedText>
              <BarChart
                data={chartData.workerSkills}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                verticalLabelRotation={30}
                style={{ alignSelf: 'center' }}
              />
            </View>

            {/* Regional Employment */}
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Employment by Region
              </ThemedText>
              <PieChart
                data={chartData.regionalEmployment}
                width={screenWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="workers"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                style={{ alignSelf: 'center' }}
              />
            </View>
          </View>
        </Card>

        {/* Risk Assessment Section */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText type="subtitle">⚠️ Risk Assessment</ThemedText>
            <Button
              variant="ghost"
              onPress={() => navigateToDetailedReport('risks')}
              size="small"
            >
              View Details
            </Button>
          </View>

          <View style={{ gap: 12 }}>
            {chartData.riskFactors?.map((risk, index) => (
              <View key={index} style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                backgroundColor: colors.surface,
                borderRadius: 8,
                borderLeftWidth: 4,
                borderLeftColor: getRiskColor(risk.level, colors),
              }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ marginBottom: 4 }}>{risk.name}</ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {risk.description}
                  </ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText type="subtitle" style={{ color: getRiskColor(risk.level, colors) }}>
                    {risk.level.toUpperCase()}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {risk.probability}% probability
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Forecast & Predictions */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText type="subtitle">🔮 Forecast & Predictions</ThemedText>
            <Button
              variant="ghost"
              onPress={() => navigateToDetailedReport('forecast')}
              size="small"
            >
              View Details
            </Button>
          </View>

          <View style={{ gap: 16 }}>
            {/* Completion Forecast */}
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Project Completion Forecast (Next 6 Months)
              </ThemedText>
              <LineChart
                data={chartData.completionForecast}
                width={screenWidth}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={{ alignSelf: 'center' }}
              />
            </View>

            {/* Budget Forecast */}
            <View>
              <ThemedText type="caption" style={{ marginBottom: 8, color: colors.textSecondary }}>
                Budget Requirements Forecast (ETB Millions)
              </ThemedText>
              <BarChart
                data={chartData.budgetForecast}
                width={screenWidth}
                height={200}
                chartConfig={chartConfig}
                style={{ alignSelf: 'center' }}
              />
            </View>
          </View>
        </Card>
      </ScrollView>
    </ThemedView>
  );
};

/**
 * Utility Functions
 */

const getRiskColor = (level, colors) => {
  const colorMap = {
    low: colors.success,
    medium: colors.warning,
    high: colors.error,
    critical: colors.error,
  };
  return colorMap[level] || colors.textSecondary;
};

const generateExportFile = async (data, format, filters) => {
  // Simulate export file generation
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Exporting ${format} file with filters:`, filters);
      resolve(true);
    }, 2000);
  });
};

// Add missing imports and components
const Dropdown = ({ options, selectedValue, onValueChange, style }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[{ minHeight: 40 }, style]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={{
          color: colors.text,
          backgroundColor: colors.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
        }}
      >
        {options.map((option) => (
          <Picker.Item 
            key={option.value} 
            label={option.label} 
            value={option.value} 
          />
        ))}
      </Picker>
    </View>
  );
};

import { Picker } from '@react-native-picker/picker';
import { TouchableOpacity } from 'react-native';

export default GovernmentAnalyticsScreen;