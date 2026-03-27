import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
  Share,
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
  Dropdown,
  DatePicker,
  SearchInput,
  Pagination,
  ExportModal,
  ReportCard,
} from '../../../components/ui';
import { 
  BarChart, 
  LineChart, 
  PieChart,
  StackedBarChart,
} from 'react-native-chart-kit';
import { formatCurrency, formatNumber, formatDate } from '../../../utils/formatters';
import { generateReportData, calculateReportMetrics } from '../../../utils/report-generator';
import { Dimensions } from 'react-native';

/**
 * Enterprise-level Government Reports Screen
 * Comprehensive reporting system for government infrastructure projects
 */
const GovernmentReportsScreen = () => {
  const router = useRouter();
  const { reportType, dateRange, region, project } = useLocalSearchParams();
  const { user } = useAuth();
  const { theme, colors } = useTheme();
  const { 
    getGovernmentReports,
    generateCustomReport,
    exportReport,
    loading: govLoading 
  } = useGovernment();

  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [selectedReportType, setSelectedReportType] = useState(reportType || 'all');
  const [selectedPeriod, setSelectedPeriod] = useState(dateRange || 'last_30_days');
  const [selectedRegion, setSelectedRegion] = useState(region || 'all');
  const [selectedProject, setSelectedProject] = useState(project || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

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
  const itemsPerPage = 10;

  // Report type options
  const reportTypes = [
    { label: 'All Reports', value: 'all' },
    { label: 'Budget Reports', value: 'budget' },
    { label: 'Progress Reports', value: 'progress' },
    { label: 'Workforce Reports', value: 'workforce' },
    { label: 'Risk Assessment', value: 'risk' },
    { label: 'Compliance Reports', value: 'compliance' },
    { label: 'Environmental Impact', value: 'environmental' },
    { label: 'Economic Impact', value: 'economic' },
    { label: 'Monthly Summary', value: 'monthly' },
    { label: 'Quarterly Review', value: 'quarterly' },
    { label: 'Annual Report', value: 'annual' },
  ];

  // Period options
  const periodOptions = [
    { label: 'Last 7 Days', value: 'last_7_days' },
    { label: 'Last 30 Days', value: 'last_30_days' },
    { label: 'Last 90 Days', value: 'last_90_days' },
    { label: 'Year to Date', value: 'year_to_date' },
    { label: 'Last Year', value: 'last_year' },
    { label: 'Custom Range', value: 'custom' },
  ];

  /**
   * Fetch reports with current filters
   */
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters = {
        reportType: selectedReportType !== 'all' ? selectedReportType : undefined,
        period: selectedPeriod,
        region: selectedRegion !== 'all' ? selectedRegion : undefined,
        project: selectedProject !== 'all' ? selectedProject : undefined,
        searchQuery: searchQuery || undefined,
        page: currentPage,
        limit: itemsPerPage,
        governmentId: user.id,
      };

      if (selectedPeriod === 'custom') {
        filters.startDate = customDateRange.startDate.toISOString();
        filters.endDate = customDateRange.endDate.toISOString();
      }

      const reportsData = await getGovernmentReports(filters);
      setReports(reportsData.reports);
      setFilteredReports(reportsData.filteredReports || reportsData.reports);

    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    selectedReportType, 
    selectedPeriod, 
    selectedRegion, 
    selectedProject, 
    searchQuery, 
    currentPage, 
    user.id, 
    customDateRange,
    getGovernmentReports
  ]);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  /**
   * Generate custom report
   */
  const handleGenerateReport = async (reportConfig) => {
    try {
      setGenerating(true);
      
      const reportData = await generateCustomReport({
        ...reportConfig,
        governmentId: user.id,
        generatedBy: user.name,
        includeCharts: true,
        includeRecommendations: true,
      });

      // Add to reports list
      setReports(prev => [reportData, ...prev]);
      
      Alert.alert('Success', 'Custom report generated successfully');
      
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate custom report');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Export report in various formats
   */
  const handleExportReport = async (reportId, format, options = {}) => {
    try {
      setExporting(true);
      
      const exportResult = await exportReport(reportId, format, {
        includeCharts: options.includeCharts !== false,
        includeRawData: options.includeRawData || false,
        passwordProtected: options.passwordProtected || false,
      });

      if (format === 'pdf' && Platform.OS !== 'web') {
        // For mobile, share the file
        await Share.share({
          title: `Government Report - ${exportResult.fileName}`,
          url: exportResult.fileUrl,
          message: `Government infrastructure report: ${exportResult.fileName}`
        });
      } else {
        // For web, trigger download
        window.open(exportResult.fileUrl, '_blank');
      }

      Alert.alert('Success', `Report exported as ${format.toUpperCase()}`);
      
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Error', `Failed to export report as ${format}`);
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  /**
   * Share report via available channels
   */
  const handleShareReport = async (report) => {
    try {
      const shareOptions = {
        title: `Government Report: ${report.title}`,
        message: `Check out this government infrastructure report: ${report.title}\n\nKey Insights:\n${report.summary}\n\nGenerated: ${formatDate(report.generatedAt, 'full')}`,
        url: report.shareUrl,
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report');
    }
  };

  /**
   * View report details
   */
  const handleViewReport = (report) => {
    router.push({
      pathname: '/government/report-detail',
      params: { 
        id: report.id,
        reportType: report.type 
      }
    });
  };

  /**
   * Schedule automated report
   */
  const handleScheduleReport = (reportConfig) => {
    Alert.alert(
      'Schedule Report',
      `Schedule ${reportConfig.frequency} ${reportConfig.type} report?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Schedule',
          onPress: async () => {
            try {
              await scheduleAutomatedReport(reportConfig);
              Alert.alert('Success', 'Report scheduled successfully');
            } catch (error) {
              console.error('Error scheduling report:', error);
              Alert.alert('Error', 'Failed to schedule report');
            }
          },
        },
      ]
    );
  };

  /**
   * Filter reports based on search query
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Calculate pagination
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredReports.slice(startIndex, endIndex);
  }, [filteredReports, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  // Fetch reports when filters change
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading && !refreshing) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Loading size="large" message="Loading government reports..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header Section */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <ThemedText type="title">Government Reports</ThemedText>
          <Button
            variant="primary"
            onPress={() => setShowExportModal(true)}
            loading={generating}
          >
            Generate Report
          </Button>
        </View>

        {/* Search and Filters */}
        <View style={{ gap: 12 }}>
          <SearchInput
            placeholder="Search reports by title, description, or project..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={{ marginBottom: 8 }}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 12 }}>
            <Dropdown
              options={reportTypes}
              selectedValue={selectedReportType}
              onValueChange={setSelectedReportType}
              style={{ minWidth: 150 }}
            />
            
            <Dropdown
              options={periodOptions}
              selectedValue={selectedPeriod}
              onValueChange={setSelectedPeriod}
              style={{ minWidth: 150 }}
            />
            
            <Dropdown
              options={[
                { label: 'All Regions', value: 'all' },
                { label: 'Addis Ababa', value: 'addis_ababa' },
                { label: 'Oromia', value: 'oromia' },
                { label: 'Amhara', value: 'amhara' },
                { label: 'Tigray', value: 'tigray' },
                { label: 'Somali', value: 'somali' },
              ]}
              selectedValue={selectedRegion}
              onValueChange={setSelectedRegion}
              style={{ minWidth: 120 }}
            />
            
            <Dropdown
              options={[
                { label: 'All Projects', value: 'all' },
                { label: 'Road Construction', value: 'road_construction' },
                { label: 'Building Projects', value: 'building_projects' },
                { label: 'Infrastructure', value: 'infrastructure' },
                { label: 'Public Works', value: 'public_works' },
              ]}
              selectedValue={selectedProject}
              onValueChange={setSelectedProject}
              style={{ minWidth: 150 }}
            />
          </ScrollView>
        </View>
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
        {/* Reports Summary */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
            📈 Reports Overview
          </ThemedText>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
            <StatItem 
              label="Total Reports" 
              value={reports.length} 
              icon="📊"
              color={colors.primary}
            />
            <StatItem 
              label="This Month" 
              value={reports.filter(r => 
                new Date(r.generatedAt).getMonth() === new Date().getMonth()
              ).length} 
              icon="📅"
              color={colors.success}
            />
            <StatItem 
              label="Pending Review" 
              value={reports.filter(r => r.status === 'pending_review').length} 
              icon="⏳"
              color={colors.warning}
            />
            <StatItem 
              label="Approved" 
              value={reports.filter(r => r.status === 'approved').length} 
              icon="✅"
              color={colors.success}
            />
          </View>
        </Card>

        {/* Featured Reports */}
        {reports.filter(r => r.featured).length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
              ⭐ Featured Reports
            </ThemedText>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 12 }}>
              {reports.filter(r => r.featured).slice(0, 3).map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onView={() => handleViewReport(report)}
                  onExport={() => {
                    setSelectedReport(report);
                    setShowExportModal(true);
                  }}
                  onShare={() => handleShareReport(report)}
                  style={{ width: 300 }}
                  featured
                />
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Reports Grid */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText type="subtitle">
              All Reports ({filteredReports.length})
            </ThemedText>
            
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                variant="ghost"
                onPress={() => handleGenerateReport({ type: 'quick_summary' })}
                size="small"
                loading={generating}
              >
                Quick Report
              </Button>
            </View>
          </View>

          {paginatedReports.length > 0 ? (
            <View style={{ gap: 12 }}>
              {paginatedReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onView={() => handleViewReport(report)}
                  onExport={() => {
                    setSelectedReport(report);
                    setShowExportModal(true);
                  }}
                  onShare={() => handleShareReport(report)}
                  onSchedule={() => handleScheduleReport(report)}
                />
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <ThemedText type="body" style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>
                No reports found matching your criteria.
              </ThemedText>
              <Button
                variant="outline"
                onPress={() => {
                  setSelectedReportType('all');
                  setSelectedPeriod('last_30_days');
                  setSelectedRegion('all');
                  setSelectedProject('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            </View>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={{ marginTop: 16 }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </View>
          )}
        </Card>

        {/* Report Templates */}
        <Card style={{ marginTop: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
            🎯 Report Templates
          </ThemedText>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
            {[
              { type: 'monthly', title: 'Monthly Summary', icon: '📅', color: colors.primary },
              { type: 'quarterly', title: 'Quarterly Review', icon: '📊', color: colors.success },
              { type: 'annual', title: 'Annual Report', icon: '📈', color: colors.warning },
              { type: 'budget', title: 'Budget Analysis', icon: '💰', color: colors.info },
              { type: 'progress', title: 'Progress Report', icon: '🏗️', color: colors.secondary },
              { type: 'compliance', title: 'Compliance Check', icon: '✅', color: colors.success },
            ].map((template) => (
              <TouchableOpacity
                key={template.type}
                onPress={() => handleGenerateReport({ type: template.type, template: true })}
                style={{
                  flex: 1,
                  minWidth: '48%',
                  padding: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <ThemedText style={{ fontSize: 24, marginBottom: 8 }}>{template.icon}</ThemedText>
                <ThemedText type="caption" style={{ textAlign: 'center', color: colors.textSecondary }}>
                  {template.title}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Export Modal */}
      <ExportModal
        visible={showExportModal}
        report={selectedReport}
        onExport={handleExportReport}
        onClose={() => {
          setShowExportModal(false);
          setSelectedReport(null);
        }}
        loading={exporting}
        formats={['pdf', 'excel', 'csv', 'json']}
        options={{
          includeCharts: true,
          includeRawData: false,
          passwordProtected: true,
        }}
      />
    </ThemedView>
  );
};

/**
 * Stat Item Component
 */
const StatItem = ({ label, value, icon, color }) => {
  const { colors } = useTheme();
  
  return (
    <View style={{ alignItems: 'center', flex: 1, minWidth: 80 }}>
      <ThemedText style={{ fontSize: 24, marginBottom: 4 }}>{icon}</ThemedText>
      <ThemedText type="subtitle" style={{ color, marginBottom: 2 }}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
        {label}
      </ThemedText>
    </View>
  );
};

/**
 * Utility Functions
 */

const scheduleAutomatedReport = async (reportConfig) => {
  // Simulate API call to schedule automated report
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Scheduled automated report:', reportConfig);
      resolve(true);
    }, 1000);
  });
};

// Add missing imports
import { TouchableOpacity } from 'react-native';

export default GovernmentReportsScreen;