import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { Modal } from '../../components/ui/modal';
import { TabView } from '../../components/ui/tabview';
import { Input } from '../../components/ui/input';
import { VerificationBadge } from '../../components/profile/verification-badge';
import { StatsCard } from '../../components/admin/stats-card';
import { ProjectTimeline } from '../../components/construction/project-timeline';
import { ConfirmationModal } from '../../components/ui/confirmation-modal';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useUpload } from '../../hooks/use-upload';
import { governmentService } from '../../services/government-service';
import { userService } from '../../services/user-service';
import { analyticsService } from '../../services/analytics-service';
import { notificationService } from '../../services/notification-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { governmentConstants } from '../../constants/government';

/**
 * Government Profile Screen
 * 
 * Comprehensive government agency profile management with
 * project oversight, workforce management, and compliance tracking
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const GovernmentProfileScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { uploadImage, deleteImage } = useUpload();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [agencyStats, setAgencyStats] = useState(null);
  const [activeProjects, setActiveProjects] = useState([]);
  const [workforceData, setWorkforceData] = useState(null);
  const [complianceData, setComplianceData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  /**
   * Fetch government profile data
   */
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [profile, stats, projects, workforce, compliance] = await Promise.all([
        governmentService.getAgencyProfile(user.agencyId),
        governmentService.getAgencyStatistics(user.agencyId),
        governmentService.getActiveProjects(user.agencyId),
        governmentService.getWorkforceAnalytics(user.agencyId),
        governmentService.getComplianceStatus(user.agencyId),
      ]);

      setProfileData(profile);
      setAgencyStats(stats);
      setActiveProjects(projects || []);
      setWorkforceData(workforce);
      setComplianceData(compliance);

      // Track profile view
      analyticsService.trackProfileView('government', user.id);
    } catch (error) {
      console.error('Failed to fetch government profile:', error);
      Alert.alert('Error', 'Unable to load agency profile data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.agencyId, user.id]);

  /**
   * Refresh data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileData();
  }, [fetchProfileData]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  /**
   * Update agency profile
   */
  const handleUpdateProfile = async (updates) => {
    try {
      setUpdating(true);
      
      const result = await governmentService.updateAgencyProfile(user.agencyId, updates);
      
      if (result.success) {
        setProfileData(prev => ({ ...prev, ...updates }));
        setShowEditModal(false);
        
        Alert.alert('Success', 'Agency profile updated successfully.');
        
        // Track profile update
        analyticsService.trackProfileUpdate('government', user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      Alert.alert('Update Failed', error.message || 'Unable to update agency profile.');
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Upload agency logo
   */
  const handleLogoUpdate = async (imageUri) => {
    try {
      const uploadResult = await uploadImage(imageUri, 'agency-logos', user.agencyId);
      
      if (uploadResult.success) {
        await handleUpdateProfile({ logo: uploadResult.url });
        
        Alert.alert('Success', 'Agency logo updated successfully.');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Logo update failed:', error);
      Alert.alert('Upload Failed', 'Unable to update agency logo.');
    }
  };

  /**
   * Submit verification documents
   */
  const handleVerificationSubmit = async (documents) => {
    try {
      const result = await governmentService.submitVerificationDocuments(
        user.agencyId,
        documents,
        user.id
      );

      if (result.success) {
        setProfileData(prev => ({
          ...prev,
          verificationStatus: 'pending_review',
          submittedDocuments: documents,
        }));
        setShowVerificationModal(false);
        
        Alert.alert('Success', 'Verification documents submitted for review.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Verification submission failed:', error);
      Alert.alert('Submission Failed', error.message || 'Unable to submit verification documents.');
    }
  };

  /**
   * Generate compliance report
   */
  const handleGenerateComplianceReport = async () => {
    try {
      const report = await governmentService.generateComplianceReport(user.agencyId);
      
      if (report?.url) {
        Alert.alert(
          'Report Generated',
          'Compliance report has been generated successfully.',
          [
            {
              text: 'View Report',
              onPress: () => navigation.navigate('ReportViewer', { reportUrl: report.url }),
            },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      Alert.alert('Report Error', 'Unable to generate compliance report.');
    }
  };

  /**
   * Get verification status color
   */
  const getVerificationColor = (status) => {
    const statusColors = {
      verified: colors.success,
      pending_review: colors.warning,
      unverified: colors.error,
      expired: colors.error,
      under_review: colors.warning,
    };
    
    return statusColors[status] || colors.default;
  };

  /**
   * Get compliance status
   */
  const getComplianceStatus = () => {
    if (!complianceData) return { status: 'unknown', color: colors.default };
    
    const complianceRate = complianceData.complianceRate || 0;
    
    if (complianceRate >= 90) return { status: 'excellent', color: colors.success };
    if (complianceRate >= 75) return { status: 'good', color: colors.info };
    if (complianceRate >= 60) return { status: 'fair', color: colors.warning };
    return { status: 'poor', color: colors.error };
  };

  const complianceStatus = getComplianceStatus();

  /**
   * Render overview tab
   */
  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Agency Statistics */}
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}
      >
        <StatsCard
          title="Active Projects"
          value={agencyStats?.activeProjects || 0}
          change={agencyStats?.projectsChange}
          icon="building"
          color={colors.primary}
        />
        
        <StatsCard
          title="Total Budget"
          value={formatters.formatCurrency(agencyStats?.totalBudget || 0, 'ETB')}
          change={agencyStats?.budgetChange}
          icon="dollar-sign"
          color={colors.success}
        />
        
        <StatsCard
          title="Workforce"
          value={agencyStats?.totalWorkers || 0}
          change={agencyStats?.workforceChange}
          icon="users"
          color={colors.info}
        />
        
        <StatsCard
          title="Completion Rate"
          value={`${agencyStats?.completionRate || 0}%`}
          change={agencyStats?.completionChange}
          icon="trending-up"
          color={colors.warning}
        />
      </ScrollView>

      {/* Verification Status */}
      <Card style={styles.verificationCard}>
        <View style={styles.verificationHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Agency Verification
          </ThemedText>
          <Badge
            text={formatters.formatVerificationStatus(profileData?.verificationStatus)}
            color={getVerificationColor(profileData?.verificationStatus)}
            size="small"
          />
        </View>
        
        {profileData?.verificationStatus !== 'verified' && (
          <View style={styles.verificationActions}>
            <ThemedText type="default" style={styles.verificationText}>
              {getVerificationMessage(profileData?.verificationStatus)}
            </ThemedText>
            <Button
              title="Submit Documents"
              onPress={() => setShowVerificationModal(true)}
              variant="primary"
              size="small"
              icon="file-text"
            />
          </View>
        )}

        {profileData?.verificationStatus === 'verified' && (
          <View style={styles.verifiedInfo}>
            <ThemedText type="default" style={styles.verifiedText}>
              ✓ Verified until {formatters.formatDate(profileData.verificationExpiry)}
            </ThemedText>
          </View>
        )}
      </Card>

      {/* Compliance Status */}
      <Card style={styles.complianceCard}>
        <View style={styles.complianceHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Compliance Status
          </ThemedText>
          <Badge
            text={complianceStatus.status.toUpperCase()}
            color={complianceStatus.color}
            size="small"
          />
        </View>
        
        <View style={styles.complianceProgress}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${complianceData?.complianceRate || 0}%`,
                  backgroundColor: complianceStatus.color,
                }
              ]} 
            />
          </View>
          <ThemedText type="default" style={styles.complianceRate}>
            {complianceData?.complianceRate || 0}% Compliance Rate
          </ThemedText>
        </View>
        
        <Button
          title="Generate Compliance Report"
          onPress={handleGenerateComplianceReport}
          variant="outline"
          size="small"
          icon="file-text"
        />
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quick Actions
        </ThemedText>
        
        <View style={styles.actionGrid}>
          <Button
            title="New Project"
            onPress={() => navigation.navigate('CreateGovernmentProject')}
            variant="primary"
            size="small"
            icon="plus"
            style={styles.actionButton}
          />
          
          <Button
            title="Manage Workforce"
            onPress={() => navigation.navigate('WorkforceManagement')}
            variant="outline"
            size="small"
            icon="users"
            style={styles.actionButton}
          />
          
          <Button
            title="View Reports"
            onPress={() => navigation.navigate('GovernmentReports')}
            variant="outline"
            size="small"
            icon="bar-chart"
            style={styles.actionButton}
          />
          
          <Button
            title="Compliance"
            onPress={() => navigation.navigate('ComplianceDashboard')}
            variant="outline"
            size="small"
            icon="shield"
            style={styles.actionButton}
          />
        </View>
      </Card>
    </View>
  );

  /**
   * Render projects tab
   */
  const renderProjectsTab = () => (
    <View style={styles.tabContent}>
      {/* Active Projects */}
      <Card style={styles.projectsCard}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Active Projects ({activeProjects.length})
          </ThemedText>
          <Button
            title="Create New"
            onPress={() => navigation.navigate('CreateGovernmentProject')}
            variant="primary"
            size="small"
            icon="plus"
          />
        </View>

        <View style={styles.projectsList}>
          {activeProjects.length > 0 ? (
            activeProjects.map(project => (
              <Card key={project.id} style={styles.projectItem}>
                <View style={styles.projectHeader}>
                  <View style={styles.projectInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.projectTitle}>
                      {project.title}
                    </ThemedText>
                    <ThemedText type="default" style={styles.projectCode}>
                      {project.projectCode}
                    </ThemedText>
                  </View>
                  <Badge
                    text={formatters.formatProjectStatus(project.status)}
                    color={getVerificationColor(project.status)}
                    size="small"
                  />
                </View>
                
                <View style={styles.projectMeta}>
                  <ThemedText type="default" style={styles.projectMetaItem}>
                    📍 {project.location.region}
                  </ThemedText>
                  <ThemedText type="default" style={styles.projectMetaItem}>
                    💰 {formatters.formatCurrency(project.totalBudget, 'ETB')}
                  </ThemedText>
                  <ThemedText type="default" style={styles.projectMetaItem}>
                    👷 {project.assignedWorkers} workers
                  </ThemedText>
                </View>
                
                <ProjectTimeline
                  progress={project.progress || 0}
                  startDate={project.startDate}
                  estimatedEndDate={project.estimatedEndDate}
                  status={project.status}
                  compact={true}
                />
                
                <View style={styles.projectActions}>
                  <Button
                    title="View Details"
                    onPress={() => navigation.navigate('GovernmentProjectDetail', { 
                      projectId: project.id 
                    })}
                    variant="outline"
                    size="small"
                  />
                </View>
              </Card>
            ))
          ) : (
            <View style={styles.emptyProjects}>
              <ThemedText type="title" style={styles.emptyTitle}>
                No Active Projects
              </ThemedText>
              <ThemedText type="default" style={styles.emptyText}>
                Start by creating your first government project
              </ThemedText>
              <Button
                title="Create First Project"
                onPress={() => navigation.navigate('CreateGovernmentProject')}
                variant="primary"
                style={styles.emptyButton}
              />
            </View>
          )}
        </View>
      </Card>
    </View>
  );

  /**
   * Render workforce tab
   */
  const renderWorkforceTab = () => (
    <View style={styles.tabContent}>
      {/* Workforce Overview */}
      <Card style={styles.workforceCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Workforce Analytics
        </ThemedText>
        
        <View style={styles.workforceStats}>
          <View style={styles.workforceStat}>
            <ThemedText type="title" style={styles.workforceValue}>
              {workforceData?.totalWorkers || 0}
            </ThemedText>
            <ThemedText type="default" style={styles.workforceLabel}>
              Total Workers
            </ThemedText>
          </View>
          
          <View style={styles.workforceStat}>
            <ThemedText type="title" style={styles.workforceValue}>
              {workforceData?.activeWorkers || 0}
            </ThemedText>
            <ThemedText type="default" style={styles.workforceLabel}>
              Active Now
            </ThemedText>
          </View>
          
          <View style={styles.workforceStat}>
            <ThemedText type="title" style={styles.workforceValue}>
              {workforceData?.utilizationRate || 0}%
            </ThemedText>
            <ThemedText type="default" style={styles.workforceLabel}>
              Utilization
            </ThemedText>
          </View>
        </View>
      </Card>

      {/* Skill Distribution */}
      <Card style={styles.skillsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Skill Distribution
        </ThemedText>
        
        <View style={styles.skillsList}>
          {workforceData?.skillDistribution?.map(skill => (
            <View key={skill.name} style={styles.skillItem}>
              <View style={styles.skillInfo}>
                <ThemedText type="defaultSemiBold" style={styles.skillName}>
                  {skill.name}
                </ThemedText>
                <ThemedText type="default" style={styles.skillCount}>
                  {skill.count} workers
                </ThemedText>
              </View>
              <View style={styles.skillBar}>
                <View 
                  style={[
                    styles.skillBarFill,
                    { width: `${(skill.count / workforceData.totalWorkers) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )) || (
            <ThemedText type="default" style={styles.emptyText}>
              No workforce data available
            </ThemedText>
          )}
        </View>
      </Card>

      {/* Workforce Management */}
      <Card style={styles.managementCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Workforce Management
        </ThemedText>
        
        <View style={styles.managementActions}>
          <Button
            title="Assign Workers"
            onPress={() => navigation.navigate('WorkerAssignment')}
            variant="primary"
            size="medium"
            icon="user-plus"
            style={styles.managementButton}
          />
          
          <Button
            title="Performance Review"
            onPress={() => navigation.navigate('PerformanceReview')}
            variant="outline"
            size="medium"
            icon="trending-up"
            style={styles.managementButton}
          />
          
          <Button
            title="Training Programs"
            onPress={() => navigation.navigate('TrainingPrograms')}
            variant="outline"
            size="medium"
            icon="book-open"
            style={styles.managementButton}
          />
        </View>
      </Card>
    </View>
  );

  /**
   * Render settings tab
   */
  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      {/* Agency Settings */}
      <Card style={styles.settingsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Agency Settings
        </ThemedText>
        
        <View style={styles.settingsList}>
          <Button
            title="Edit Agency Profile"
            onPress={() => setShowEditModal(true)}
            variant="outline"
            size="medium"
            icon="edit"
            style={styles.settingButton}
          />
          
          <Button
            title="Manage Users"
            onPress={() => navigation.navigate('AgencyUserManagement')}
            variant="outline"
            size="medium"
            icon="users"
            style={styles.settingButton}
          />
          
          <Button
            title="Document Management"
            onPress={() => navigation.navigate('DocumentManagement')}
            variant="outline"
            size="medium"
            icon="folder"
            style={styles.settingButton}
          />
          
          <Button
            title="API Integration"
            onPress={() => navigation.navigate('APIIntegration')}
            variant="outline"
            size="medium"
            icon="code"
            style={styles.settingButton}
          />
        </View>
      </Card>

      {/* Compliance & Legal */}
      <Card style={styles.legalCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Compliance & Legal
        </ThemedText>
        
        <View style={styles.legalActions}>
          <Button
            title="Compliance Dashboard"
            onPress={() => navigation.navigate('ComplianceDashboard')}
            variant="outline"
            size="medium"
            icon="shield"
            style={styles.legalButton}
          />
          
          <Button
            title="Audit Logs"
            onPress={() => navigation.navigate('AuditLogs')}
            variant="outline"
            size="medium"
            icon="file-text"
            style={styles.legalButton}
          />
          
          <Button
            title="Legal Documents"
            onPress={() => navigation.navigate('LegalDocuments')}
            variant="outline"
            size="medium"
            icon="folder"
            style={styles.legalButton}
          />
        </View>
      </Card>

      {/* Support */}
      <Card style={styles.supportCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Government Support
        </ThemedText>
        
        <View style={styles.supportOptions}>
          <Button
            title="Contact Ministry"
            onPress={() => Linking.openURL('tel:+251111234567')}
            variant="outline"
            size="medium"
            icon="phone"
            style={styles.supportButton}
          />
          
          <Button
            title="Technical Support"
            onPress={() => navigation.navigate('TechnicalSupport')}
            variant="outline"
            size="medium"
            icon="help-circle"
            style={styles.supportButton}
          />
          
          <Button
            title="System Status"
            onPress={() => navigation.navigate('SystemStatus')}
            variant="outline"
            size="medium"
            icon="activity"
            style={styles.supportButton}
          />
        </View>
      </Card>
    </View>
  );

  /**
   * Get verification message
   */
  const getVerificationMessage = (status) => {
    const messages = {
      unverified: 'Your agency requires verification to access government features.',
      pending_review: 'Your verification documents are under review.',
      under_review: 'Additional information required for verification.',
      expired: 'Your agency verification has expired.',
    };
    
    return messages[status] || 'Verification status unknown.';
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading government profile..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Agency Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.logoSection}>
              <Avatar
                source={profileData?.logo ? { uri: profileData.logo } : null}
                size="xlarge"
                onEdit={handleLogoUpdate}
                editable={true}
                style={styles.agencyLogo}
              />
            </View>
            
            <View style={styles.agencyInfo}>
              <ThemedText type="title" style={styles.agencyName}>
                {profileData?.name || user.agency}
              </ThemedText>
              
              <ThemedText type="default" style={styles.agencyType}>
                {profileData?.agencyType || 'Government Agency'}
              </ThemedText>
              
              <View style={styles.agencyMeta}>
                <ThemedText type="default" style={styles.agencyMetaItem}>
                  🏛️ {profileData?.ministry || 'Not specified'}
                </ThemedText>
                <ThemedText type="default" style={styles.agencyMetaItem}>
                  📍 {profileData?.region || 'National'}
                </ThemedText>
                <ThemedText type="default" style={styles.agencyMetaItem}>
                  📞 {profileData?.contactPhone || 'Not provided'}
                </ThemedText>
              </View>
              
              <View style={styles.agencyBadges}>
                <VerificationBadge
                  status={profileData?.verificationStatus}
                  size="small"
                />
                {profileData?.isActive && (
                  <Badge
                    text="Active"
                    color={colors.success}
                    size="small"
                  />
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <Button
              title="Edit Profile"
              onPress={() => setShowEditModal(true)}
              variant="primary"
              size="medium"
              icon="edit"
            />
            <Button
              title="Agency Portal"
              onPress={() => navigation.navigate('AgencyPortal')}
              variant="outline"
              size="medium"
              icon="external-link"
            />
          </View>
        </Card>

        {/* Main Content Tabs */}
        <TabView
          tabs={[
            { key: 'overview', title: 'Overview' },
            { key: 'projects', title: `Projects (${activeProjects.length})` },
            { key: 'workforce', title: 'Workforce' },
            { key: 'settings', title: 'Settings' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          style={styles.tabView}
        />

        {/* Tab Content */}
        <View style={styles.tabContainer}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'projects' && renderProjectsTab()}
          {activeTab === 'workforce' && renderWorkforceTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Agency Profile"
        size="large"
      >
        {/* Agency profile form would be implemented here */}
        <ThemedText>Edit Agency Profile Form</ThemedText>
      </Modal>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        title="Submit Verification Documents"
        size="large"
      >
        {/* Verification document upload form would be implemented here */}
        <ThemedText>Verification Document Upload Form</ThemedText>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    gap: 16,
  },
  headerContent: {
    flexDirection: 'row',
    gap: 16,
  },
  logoSection: {
    alignItems: 'center',
  },
  agencyLogo: {
    borderWidth: 2,
    borderColor: '#e1e1e1',
  },
  agencyInfo: {
    flex: 1,
    gap: 8,
  },
  agencyName: {
    fontSize: 24,
  },
  agencyType: {
    fontSize: 16,
    opacity: 0.7,
  },
  agencyMeta: {
    gap: 4,
  },
  agencyMetaItem: {
    fontSize: 14,
  },
  agencyBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  tabView: {
    marginHorizontal: 16,
  },
  tabContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  statsScroll: {
    marginHorizontal: -16,
  },
  statsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  verificationCard: {
    gap: 12,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
  },
  verificationActions: {
    gap: 8,
  },
  verificationText: {
    opacity: 0.7,
    lineHeight: 20,
  },
  verifiedInfo: {
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  verifiedText: {
    color: '#059669',
    textAlign: 'center',
  },
  complianceCard: {
    gap: 12,
  },
  complianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  complianceProgress: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e1e1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  complianceRate: {
    textAlign: 'center',
    opacity: 0.7,
  },
  actionsCard: {
    gap: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  projectsCard: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectsList: {
    gap: 12,
  },
  projectItem: {
    gap: 12,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectInfo: {
    flex: 1,
    gap: 4,
  },
  projectTitle: {
    fontSize: 16,
  },
  projectCode: {
    fontSize: 12,
    opacity: 0.6,
  },
  projectMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  projectMetaItem: {
    fontSize: 12,
    opacity: 0.7,
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyProjects: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyButton: {
    marginTop: 8,
  },
  workforceCard: {
    gap: 16,
  },
  workforceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  workforceStat: {
    alignItems: 'center',
    gap: 4,
  },
  workforceValue: {
    fontSize: 24,
  },
  workforceLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  skillsCard: {
    gap: 16,
  },
  skillsList: {
    gap: 12,
  },
  skillItem: {
    gap: 8,
  },
  skillInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontSize: 14,
  },
  skillCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  skillBar: {
    height: 4,
    backgroundColor: '#e1e1e1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  managementCard: {
    gap: 16,
  },
  managementActions: {
    gap: 8,
  },
  managementButton: {
    justifyContent: 'flex-start',
  },
  settingsCard: {
    gap: 16,
  },
  settingsList: {
    gap: 8,
  },
  settingButton: {
    justifyContent: 'flex-start',
  },
  legalCard: {
    gap: 16,
  },
  legalActions: {
    gap: 8,
  },
  legalButton: {
    justifyContent: 'flex-start',
  },
  supportCard: {
    gap: 16,
  },
  supportOptions: {
    gap: 8,
  },
  supportButton: {
    justifyContent: 'flex-start',
  },
});

export default GovernmentProfileScreen;