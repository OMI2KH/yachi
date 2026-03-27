import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemeContext } from '../contexts/theme-context';
import { AuthContext } from '../contexts/auth-context';
import { UserContext } from '../contexts/user-context';
import { ServiceContext } from '../contexts/service-context';
import { BookingContext } from '../contexts/booking-context';
import { PaymentContext } from '../contexts/payment-context';
import { 
  USER_ROLES,
  USER_STATUS,
  VERIFICATION_LEVELS 
} from '../constants/user';
import { 
  SERVICE_STATUS,
  SERVICE_CATEGORIES 
} from '../constants/service';
import { 
  BOOKING_STATUS,
  PAYMENT_STATUS 
} from '../constants/booking';
import { 
  formatCurrency,
  formatEthiopianDate,
  formatNumber 
} from '../utils/formatters';
import { 
  getAdminDashboard,
  getPlatformAnalytics,
  generateFinancialReport,
  exportData,
  moderateContent,
  manageUserAccount,
  updateSystemSettings 
} from '../services/admin-service';
import { 
  triggerAdminAlert,
  sendSystemNotification 
} from '../services/notification-service';
import { 
  calculateGrowthRate,
  calculateConversionRate,
  analyzePlatformHealth 
} from '../utils/analytics-calculations';

// Components
import ThemedView from '../components/themed-view';
import ThemedText from '../components/themed-text';
import Button from '../components/ui/button';
import Card from '../components/ui/card';
import Loading from '../components/ui/loading';
import Badge from '../components/ui/badge';
import StatsCard from '../components/admin/stats-card';
import AdminTable from '../components/admin/admin-table';
import UserManagement from '../components/admin/user-management';
import AnalyticsChart from '../components/ui/analytics-chart';
import QuickActions from '../components/admin/quick-actions';
import SystemHealth from '../components/admin/system-health';
import RecentActivity from '../components/admin/recent-activity';
import Modal from '../components/ui/modal';
import ConfirmationModal from '../components/ui/confirmation-modal';

const AdminScreen = () => {
  const router = useRouter();
  
  // Context
  const { theme, colors } = useContext(ThemeContext);
  const { user, isAuthenticated, hasPermission } = useContext(AuthContext);
  const { users, refreshUsers } = useContext(UserContext);
  const { services, refreshServices } = useContext(ServiceContext);
  const { bookings, refreshBookings } = useContext(BookingContext);
  const { payments, refreshPayments } = useContext(PaymentContext);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '7d',
    userType: 'all',
    status: 'all',
  });

  // Check admin permissions
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const canManageUsers = hasPermission('manage_users');
  const canManageServices = hasPermission('manage_services');
  const canViewAnalytics = hasPermission('view_analytics');
  const canManageSystem = hasPermission('manage_system');

  // Admin tabs based on permissions
  const adminTabs = [
    { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
    ...(canManageUsers ? [{ key: 'users', label: 'Users', icon: 'users' }] : []),
    ...(canManageServices ? [{ key: 'services', label: 'Services', icon: 'briefcase' }] : []),
    ...(canViewAnalytics ? [{ key: 'analytics', label: 'Analytics', icon: 'bar-chart' }] : []),
    ...(canManageSystem ? [{ key: 'system', label: 'System', icon: 'settings' }] : []),
  ];

  // Load admin data
  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        loadAdminData();
      }
    }, [isAdmin, filters])
  );

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      const [dashboard, platformAnalytics] = await Promise.all([
        getAdminDashboard(filters),
        getPlatformAnalytics(filters.dateRange),
      ]);

      setDashboardData(dashboard);
      setAnalytics(platformAnalytics);
      
    } catch (error) {
      Alert.alert('Load Failed', 'Failed to load admin data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
  };

  // Handle user action
  const handleUserAction = async (userId, action, data = {}) => {
    try {
      setLoading(true);

      switch (action) {
        case 'suspend':
          await manageUserAccount(userId, { status: USER_STATUS.SUSPENDED });
          Alert.alert('Success', 'User account suspended');
          break;
          
        case 'activate':
          await manageUserAccount(userId, { status: USER_STATUS.ACTIVE });
          Alert.alert('Success', 'User account activated');
          break;
          
        case 'verify':
          await manageUserAccount(userId, { 
            verificationLevel: VERIFICATION_LEVELS.VERIFIED 
          });
          Alert.alert('Success', 'User verified successfully');
          break;
          
        case 'delete':
          await manageUserAccount(userId, { status: USER_STATUS.DELETED });
          Alert.alert('Success', 'User account deleted');
          break;
          
        case 'view':
          setSelectedUser(userId);
          setShowUserModal(true);
          break;
          
        default:
          throw new Error('Unknown action');
      }

      await refreshUsers();
      await loadAdminData();
      
    } catch (error) {
      Alert.alert('Action Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle service action
  const handleServiceAction = async (serviceId, action, data = {}) => {
    try {
      setLoading(true);

      switch (action) {
        case 'approve':
          await moderateContent('service', serviceId, { status: SERVICE_STATUS.ACTIVE });
          Alert.alert('Success', 'Service approved');
          break;
          
        case 'reject':
          await moderateContent('service', serviceId, { status: SERVICE_STATUS.REJECTED });
          Alert.alert('Success', 'Service rejected');
          break;
          
        case 'suspend':
          await moderateContent('service', serviceId, { status: SERVICE_STATUS.SUSPENDED });
          Alert.alert('Success', 'Service suspended');
          break;
          
        case 'feature':
          await moderateContent('service', serviceId, { isFeatured: true });
          Alert.alert('Success', 'Service featured');
          break;
          
        case 'view':
          setSelectedService(serviceId);
          setShowServiceModal(true);
          break;
          
        default:
          throw new Error('Unknown action');
      }

      await refreshServices();
      await loadAdminData();
      
    } catch (error) {
      Alert.alert('Action Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle report generation
  const handleGenerateReport = async (reportType, format = 'pdf') => {
    try {
      setLoading(true);

      const report = await generateFinancialReport({
        type: reportType,
        format,
        dateRange: filters.dateRange,
        ...filters,
      });

      Alert.alert('Success', `${reportType} report generated successfully`);
      setShowReportModal(false);
      
    } catch (error) {
      Alert.alert('Report Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle system settings update
  const handleSettingsUpdate = async (settings) => {
    try {
      setLoading(true);

      await updateSystemSettings(settings);
      Alert.alert('Success', 'System settings updated');
      setShowSettingsModal(false);
      
    } catch (error) {
      Alert.alert('Update Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle data export
  const handleDataExport = async (dataType, format = 'csv') => {
    try {
      setLoading(true);

      await exportData(dataType, format, filters);
      Alert.alert('Success', `${dataType} data exported successfully`);
      
    } catch (error) {
      Alert.alert('Export Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render dashboard tab
  const renderDashboard = () => {
    if (!dashboardData) return null;

    return (
      <View style={{ gap: 16 }}>
        {/* Key Metrics */}
        <View style={{ gap: 12 }}>
          <ThemedText type="title">Platform Overview</ThemedText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <StatsCard
              title="Total Users"
              value={formatNumber(dashboardData.metrics.totalUsers)}
              change={dashboardData.metrics.userGrowth}
              trend="up"
              icon="users"
              color={colors.primary}
            />
            <StatsCard
              title="Active Services"
              value={formatNumber(dashboardData.metrics.activeServices)}
              change={dashboardData.metrics.serviceGrowth}
              trend="up"
              icon="briefcase"
              color={colors.success}
            />
            <StatsCard
              title="Total Bookings"
              value={formatNumber(dashboardData.metrics.totalBookings)}
              change={dashboardData.metrics.bookingGrowth}
              trend="up"
              icon="calendar"
              color={colors.info}
            />
            <StatsCard
              title="Revenue"
              value={formatCurrency(dashboardData.metrics.totalRevenue)}
              change={dashboardData.metrics.revenueGrowth}
              trend="up"
              icon="dollar-sign"
              color={colors.warning}
            />
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <QuickActions
          onManageUsers={() => setActiveTab('users')}
          onManageServices={() => setActiveTab('services')}
          onViewAnalytics={() => setActiveTab('analytics')}
          onGenerateReport={() => setShowReportModal(true)}
          permissions={{
            canManageUsers,
            canManageServices,
            canViewAnalytics,
          }}
        />

        {/* System Health */}
        <SystemHealth
          metrics={dashboardData.systemHealth}
          onViewDetails={() => setActiveTab('system')}
        />

        {/* Recent Activity */}
        <RecentActivity
          activities={dashboardData.recentActivity}
          onViewAll={() => console.log('View all activities')}
        />

        {/* Charts */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Card style={{ flex: 1, minWidth: Dimensions.get('window').width - 32 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
              User Registration Trend
            </ThemedText>
            <AnalyticsChart
              data={analytics?.userRegistrations || []}
              type="line"
              height={200}
            />
          </Card>
          
          <Card style={{ flex: 1, minWidth: Dimensions.get('window').width - 32 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
              Booking Status Distribution
            </ThemedText>
            <AnalyticsChart
              data={analytics?.bookingStatus || []}
              type="pie"
              height={200}
            />
          </Card>
        </View>
      </View>
    );
  };

  // Render users tab
  const renderUsersTab = () => (
    <View style={{ gap: 16 }}>
      <UserManagement
        users={users}
        filters={filters}
        onFiltersChange={setFilters}
        onUserAction={handleUserAction}
        onExport={() => handleDataExport('users')}
      />
    </View>
  );

  // Render services tab
  const renderServicesTab = () => (
    <View style={{ gap: 16 }}>
      <AdminTable
        title="Service Management"
        data={services}
        columns={[
          { key: 'title', label: 'Service Title', width: '30%' },
          { key: 'provider', label: 'Provider', width: '20%' },
          { key: 'category', label: 'Category', width: '15%' },
          { key: 'price', label: 'Price', width: '15%' },
          { key: 'status', label: 'Status', width: '10%' },
          { key: 'actions', label: 'Actions', width: '10%' },
        ]}
        filters={filters}
        onFiltersChange={setFilters}
        onItemAction={handleServiceAction}
        onExport={() => handleDataExport('services')}
        renderItem={(item) => ({
          title: item.title,
          provider: item.providerName,
          category: item.category,
          price: formatCurrency(item.price),
          status: (
            <Badge 
              variant={
                item.status === SERVICE_STATUS.ACTIVE ? 'success' :
                item.status === SERVICE_STATUS.PENDING ? 'warning' :
                item.status === SERVICE_STATUS.SUSPENDED ? 'error' : 'secondary'
              }
              text={item.status}
            />
          ),
        })}
        actions={[
          { key: 'view', label: 'View', icon: 'eye', variant: 'outline' },
          { key: 'approve', label: 'Approve', icon: 'check', variant: 'success' },
          { key: 'reject', label: 'Reject', icon: 'x', variant: 'error' },
          { key: 'feature', label: 'Feature', icon: 'star', variant: 'warning' },
        ]}
      />
    </View>
  );

  // Render analytics tab
  const renderAnalyticsTab = () => {
    if (!analytics) return null;

    return (
      <View style={{ gap: 16 }}>
        {/* Analytics Overview */}
        <Card>
          <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
            Platform Analytics
          </ThemedText>
          
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="secondary">Conversion Rate</ThemedText>
              <ThemedText type="defaultSemiBold">
                {calculateConversionRate(analytics.bookingMetrics)}%
              </ThemedText>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="secondary">User Retention</ThemedText>
              <ThemedText type="defaultSemiBold">
                {analytics.userRetention}%
              </ThemedText>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="secondary">Avg. Response Time</ThemedText>
              <ThemedText type="defaultSemiBold">
                {analytics.avgResponseTime}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Charts Grid */}
        <View style={{ gap: 16 }}>
          <Card>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
              Revenue Trend
            </ThemedText>
            <AnalyticsChart
              data={analytics.revenueTrend}
              type="line"
              height={250}
            />
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Card style={{ flex: 1, minWidth: 150 }}>
              <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
                User Types
              </ThemedText>
              <AnalyticsChart
                data={analytics.userDistribution}
                type="doughnut"
                height={200}
              />
            </Card>

            <Card style={{ flex: 1, minWidth: 150 }}>
              <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
                Service Categories
              </ThemedText>
              <AnalyticsChart
                data={analytics.serviceDistribution}
                type="bar"
                height={200}
              />
            </Card>
          </View>
        </View>
      </View>
    );
  };

  // Render system tab
  const renderSystemTab = () => (
    <View style={{ gap: 16 }}>
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
          System Configuration
        </ThemedText>
        
        <View style={{ gap: 12 }}>
          <Button
            title="Update System Settings"
            onPress={() => setShowSettingsModal(true)}
            variant="primary"
            icon="settings"
          />
          
          <Button
            title="Clear Cache"
            onPress={() => console.log('Clear cache')}
            variant="outline"
            icon="refresh-cw"
          />
          
          <Button
            title="Backup Database"
            onPress={() => console.log('Backup database')}
            variant="outline"
            icon="database"
          />
          
          <Button
            title="System Logs"
            onPress={() => console.log('View system logs')}
            variant="outline"
            icon="file-text"
          />
        </View>
      </Card>

      {/* System Status */}
      <SystemHealth
        metrics={dashboardData?.systemHealth}
        detailed={true}
      />
    </View>
  );

  // Check if user has admin access
  if (!isAdmin) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ThemedText type="title" style={{ textAlign: 'center', marginBottom: 12 }}>
          Access Denied
        </ThemedText>
        <ThemedText type="secondary" style={{ textAlign: 'center' }}>
          You don't have permission to access the admin dashboard.
        </ThemedText>
        <Button
          title="Go to Home"
          onPress={() => router.push('/(tabs)')}
          variant="primary"
          style={{ marginTop: 20 }}
        />
      </ThemedView>
    );
  }

  if (loading && !refreshing) {
    return <Loading message="Loading admin dashboard..." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <ThemedText type="title">Admin Dashboard</ThemedText>
            <ThemedText type="secondary">
              Platform management and analytics
            </ThemedText>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Refresh"
              onPress={handleRefresh}
              variant="outline"
              size="small"
              icon="refresh-cw"
            />
            <Button
              title="Reports"
              onPress={() => setShowReportModal(true)}
              variant="outline"
              size="small"
              icon="file-text"
            />
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {adminTabs.map(tab => (
            <Button
              key={tab.key}
              title={tab.label}
              onPress={() => setActiveTab(tab.key)}
              variant={activeTab === tab.key ? 'primary' : 'outline'}
              size="small"
              icon={tab.icon}
            />
          ))}
        </View>
      </ScrollView>

      {/* Date Range Filter */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ThemedText type="defaultSemiBold">Date Range:</ThemedText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['1d', '7d', '30d', '90d', '1y'].map(range => (
              <Button
                key={range}
                title={range}
                onPress={() => setFilters(prev => ({ ...prev, dateRange: range }))}
                variant={filters.dateRange === range ? 'primary' : 'outline'}
                size="small"
              />
            ))}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'services' && renderServicesTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'system' && renderSystemTab()}
      </ScrollView>

      {/* User Detail Modal */}
      <Modal
        visible={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="User Details"
        size="large"
      >
        <UserManagement
          userId={selectedUser}
          onClose={() => setShowUserModal(false)}
        />
      </Modal>

      {/* Service Detail Modal */}
      <Modal
        visible={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title="Service Details"
        size="large"
      >
        {/* Service detail component would go here */}
        <ThemedText>Service details for {selectedService}</ThemedText>
      </Modal>

      {/* Report Generation Modal */}
      <ConfirmationModal
        visible={showReportModal}
        title="Generate Report"
        message="Select the type of report you want to generate:"
        confirmText="Generate"
        cancelText="Cancel"
        onConfirm={(reportType) => handleGenerateReport(reportType)}
        onCancel={() => setShowReportModal(false)}
        type="info"
        options={[
          { label: 'Financial Report', value: 'financial' },
          { label: 'User Activity Report', value: 'user_activity' },
          { label: 'Service Performance Report', value: 'service_performance' },
          { label: 'Platform Analytics Report', value: 'platform_analytics' },
        ]}
      />

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="System Settings"
        size="large"
      >
        {/* System settings form would go here */}
        <ThemedText>System settings configuration</ThemedText>
      </Modal>
    </ThemedView>
  );
};

export default AdminScreen;