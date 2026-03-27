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
import { Rating } from '../../components/ui/rating';
import { ImageViewer } from '../../components/ui/image-viewer';
import { ClientProfile } from '../../components/profile/client-profile';
import { PortfolioGrid } from '../../components/profile/portfolio-grid';
import { ReviewCard } from '../../components/service/review-card';
import { ConfirmationModal } from '../../components/ui/confirmation-modal';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useUpload } from '../../hooks/use-upload';
import { userService } from '../../services/user-service';
import { bookingService } from '../../services/booking-service';
import { analyticsService } from '../../services/analytics-service';
import { notificationService } from '../../services/notification-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { userConstants } from '../../constants/user';

/**
 * Client Profile Screen
 * 
 * Comprehensive client profile management with booking history,
 * reviews, preferences, and account management features
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const ClientProfileScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { uploadImage, deleteImage } = useUpload();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /**
   * Fetch client profile data
   */
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [profile, clientStats, bookings, clientReviews, clientPortfolio] = await Promise.all([
        userService.getClientProfile(user.id),
        userService.getClientStats(user.id),
        bookingService.getClientBookings(user.id, { limit: 5 }),
        userService.getClientReviews(user.id),
        userService.getClientPortfolio(user.id),
      ]);

      setProfileData(profile);
      setStats(clientStats);
      setRecentBookings(bookings || []);
      setReviews(clientReviews || []);
      setPortfolio(clientPortfolio || []);

      // Track profile view
      analyticsService.trackProfileView('client', user.id);
    } catch (error) {
      console.error('Failed to fetch client profile:', error);
      Alert.alert('Error', 'Unable to load profile data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

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
   * Update profile information
   */
  const handleUpdateProfile = async (updates) => {
    try {
      setUpdating(true);
      
      const result = await userService.updateClientProfile(user.id, updates);
      
      if (result.success) {
        setProfileData(prev => ({ ...prev, ...updates }));
        updateUser({ ...user, ...updates });
        setShowEditModal(false);
        
        Alert.alert('Success', 'Profile updated successfully.');
        
        // Track profile update
        analyticsService.trackProfileUpdate('client', user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      Alert.alert('Update Failed', error.message || 'Unable to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Upload profile picture
   */
  const handleProfilePictureUpdate = async (imageUri) => {
    try {
      const uploadResult = await uploadImage(imageUri, 'profile-pictures', user.id);
      
      if (uploadResult.success) {
        await handleUpdateProfile({ profilePicture: uploadResult.url });
        
        Alert.alert('Success', 'Profile picture updated successfully.');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Profile picture update failed:', error);
      Alert.alert('Upload Failed', 'Unable to update profile picture.');
    }
  };

  /**
   * Add portfolio item
   */
  const handleAddPortfolioItem = async (item) => {
    try {
      const result = await userService.addPortfolioItem(user.id, item);
      
      if (result.success) {
        setPortfolio(prev => [result.item, ...prev]);
        Alert.alert('Success', 'Portfolio item added successfully.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Portfolio addition failed:', error);
      Alert.alert('Addition Failed', 'Unable to add portfolio item.');
    }
  };

  /**
   * Delete portfolio item
   */
  const handleDeletePortfolioItem = async (itemId) => {
    try {
      const result = await userService.deletePortfolioItem(user.id, itemId);
      
      if (result.success) {
        setPortfolio(prev => prev.filter(item => item.id !== itemId));
        setShowDeleteConfirm(false);
        Alert.alert('Success', 'Portfolio item deleted successfully.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Portfolio deletion failed:', error);
      Alert.alert('Deletion Failed', 'Unable to delete portfolio item.');
    }
  };

  /**
   * Update notification preferences
   */
  const handleNotificationPreferenceUpdate = async (preferences) => {
    try {
      const result = await userService.updateNotificationPreferences(user.id, preferences);
      
      if (result.success) {
        setProfileData(prev => ({
          ...prev,
          notificationPreferences: preferences,
        }));
        Alert.alert('Success', 'Notification preferences updated.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Preferences update failed:', error);
      Alert.alert('Update Failed', 'Unable to update preferences.');
    }
  };

  /**
   * Handle contact support
   */
  const handleContactSupport = () => {
    Linking.openURL(`tel:${userConstants.SUPPORT_PHONE}`).catch(() => {
      Alert.alert('Error', 'Unable to open phone app.');
    });
  };

  /**
   * Get membership badge info
   */
  const getMembershipInfo = () => {
    if (profileData?.premiumMember) {
      return {
        type: 'premium',
        label: 'Premium Member',
        color: colors.warning,
        since: profileData.premiumSince,
      };
    }
    
    const joinDate = new Date(profileData?.joinDate || user.createdAt);
    const monthsSinceJoin = (new Date() - joinDate) / (30 * 24 * 60 * 60 * 1000);
    
    if (monthsSinceJoin >= 12) {
      return {
        type: 'loyal',
        label: 'Loyal Member',
        color: colors.success,
        since: joinDate,
      };
    }
    
    return {
      type: 'standard',
      label: 'Standard Member',
      color: colors.info,
      since: joinDate,
    };
  };

  const membershipInfo = getMembershipInfo();

  /**
   * Render overview tab
   */
  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Stats Cards */}
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}
      >
        <Card style={styles.statCard}>
          <ThemedText type="title" style={styles.statValue}>
            {stats?.totalBookings || 0}
          </ThemedText>
          <ThemedText type="default" style={styles.statLabel}>
            Total Bookings
          </ThemedText>
        </Card>
        
        <Card style={styles.statCard}>
          <ThemedText type="title" style={styles.statValue}>
            {stats?.completedBookings || 0}
          </ThemedText>
          <ThemedText type="default" style={styles.statLabel}>
            Completed
          </ThemedText>
        </Card>
        
        <Card style={styles.statCard}>
          <ThemedText type="title" style={styles.statValue}>
            {stats?.totalSpent ? formatters.formatCurrency(stats.totalSpent, 'ETB') : '0 ETB'}
          </ThemedText>
          <ThemedText type="default" style={styles.statLabel}>
            Total Spent
          </ThemedText>
        </Card>
        
        <Card style={styles.statCard}>
          <ThemedText type="title" style={styles.statValue}>
            {stats?.averageRating || 0}
          </ThemedText>
          <ThemedText type="default" style={styles.statLabel}>
            Avg. Rating
          </ThemedText>
        </Card>
      </ScrollView>

      {/* Recent Activity */}
      <Card style={styles.activityCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Recent Activity
        </ThemedText>
        
        <View style={styles.activityList}>
          {recentBookings.length > 0 ? (
            recentBookings.map(booking => (
              <View key={booking.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  {/* Booking icon */}
                </View>
                <View style={styles.activityContent}>
                  <ThemedText type="defaultSemiBold">
                    {booking.serviceName}
                  </ThemedText>
                  <ThemedText type="default" style={styles.activityMeta}>
                    {formatters.formatDate(booking.date)} • {formatters.formatCurrency(booking.amount, 'ETB')}
                  </ThemedText>
                </View>
                <Badge
                  text={booking.status}
                  color={getBookingStatusColor(booking.status)}
                  size="small"
                />
              </View>
            ))
          ) : (
            <ThemedText type="default" style={styles.emptyText}>
              No recent activity
            </ThemedText>
          )}
        </View>
        
        {recentBookings.length > 0 && (
          <Button
            title="View All Bookings"
            onPress={() => navigation.navigate('Bookings')}
            variant="outline"
            size="small"
            style={styles.viewAllButton}
          />
        )}
      </Card>

      {/* Preferred Services */}
      <Card style={styles.preferencesCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Preferred Services
        </ThemedText>
        
        <View style={styles.preferencesList}>
          {profileData?.preferredServices?.length > 0 ? (
            profileData.preferredServices.map(service => (
              <Badge
                key={service}
                text={service}
                color={colors.primary}
                size="small"
                style={styles.serviceBadge}
              />
            ))
          ) : (
            <ThemedText type="default" style={styles.emptyText}>
              No preferred services set
            </ThemedText>
          )}
        </View>
        
        <Button
          title="Update Preferences"
          onPress={() => setShowEditModal(true)}
          variant="outline"
          size="small"
        />
      </Card>
    </View>
  );

  /**
   * Render portfolio tab
   */
  const renderPortfolioTab = () => (
    <View style={styles.tabContent}>
      <PortfolioGrid
        items={portfolio}
        onItemPress={(item) => {
          setSelectedImage(item);
          setShowImageModal(true);
        }}
        onAddItem={() => navigation.navigate('AddPortfolioItem')}
        onDeleteItem={(item) => {
          setSelectedImage(item);
          setShowDeleteConfirm(true);
        }}
        editable={true}
      />
      
      {portfolio.length === 0 && (
        <Card style={styles.emptyPortfolio}>
          <ThemedText type="title" style={styles.emptyTitle}>
            No Portfolio Items
          </ThemedText>
          <ThemedText type="default" style={styles.emptyText}>
            Showcase your completed projects and services
          </ThemedText>
          <Button
            title="Add First Item"
            onPress={() => navigation.navigate('AddPortfolioItem')}
            variant="primary"
            style={styles.emptyButton}
          />
        </Card>
      )}
    </View>
  );

  /**
   * Render reviews tab
   */
  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {/* Rating Summary */}
      <Card style={styles.ratingSummaryCard}>
        <View style={styles.ratingOverview}>
          <ThemedText type="title" style={styles.ratingAverage}>
            {stats?.averageRating || 0}
          </ThemedText>
          <View style={styles.ratingDetails}>
            <Rating rating={stats?.averageRating || 0} size={20} />
            <ThemedText type="default" style={styles.ratingCount}>
              {stats?.totalReviews || 0} reviews
            </ThemedText>
          </View>
        </View>
        
        {/* Rating distribution would go here */}
      </Card>

      {/* Reviews List */}
      <View style={styles.reviewsList}>
        {reviews.length > 0 ? (
          reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onHelpful={() => {
                // Handle helpful action
              }}
              onReport={() => {
                // Handle report action
              }}
            />
          ))
        ) : (
          <Card style={styles.emptyReviews}>
            <ThemedText type="title" style={styles.emptyTitle}>
              No Reviews Yet
            </ThemedText>
            <ThemedText type="default" style={styles.emptyText}>
              Reviews from your bookings will appear here
            </ThemedText>
          </Card>
        )}
      </View>
    </View>
  );

  /**
   * Render settings tab
   */
  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      {/* Account Settings */}
      <Card style={styles.settingsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Account Settings
        </ThemedText>
        
        <View style={styles.settingsList}>
          <Button
            title="Edit Profile"
            onPress={() => setShowEditModal(true)}
            variant="outline"
            size="medium"
            icon="edit"
            style={styles.settingButton}
          />
          
          <Button
            title="Notification Preferences"
            onPress={() => navigation.navigate('NotificationSettings')}
            variant="outline"
            size="medium"
            icon="bell"
            style={styles.settingButton}
          />
          
          <Button
            title="Payment Methods"
            onPress={() => navigation.navigate('PaymentMethods')}
            variant="outline"
            size="medium"
            icon="credit-card"
            style={styles.settingButton}
          />
          
          <Button
            title="Security Settings"
            onPress={() => navigation.navigate('SecuritySettings')}
            variant="outline"
            size="medium"
            icon="shield"
            style={styles.settingButton}
          />
        </View>
      </Card>

      {/* Membership */}
      <Card style={styles.membershipCard}>
        <View style={styles.membershipHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Membership
          </ThemedText>
          <Badge
            text={membershipInfo.label}
            color={membershipInfo.color}
            size="small"
          />
        </View>
        
        <ThemedText type="default" style={styles.membershipText}>
          Member since {formatters.formatDate(membershipInfo.since)}
        </ThemedText>
        
        {membershipInfo.type === 'standard' && (
          <Button
            title="Upgrade to Premium"
            onPress={() => navigation.navigate('PremiumUpgrade')}
            variant="primary"
            size="medium"
            style={styles.upgradeButton}
          />
        )}
      </Card>

      {/* Support */}
      <Card style={styles.supportCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Help & Support
        </ThemedText>
        
        <View style={styles.supportOptions}>
          <Button
            title="Contact Support"
            onPress={handleContactSupport}
            variant="outline"
            size="medium"
            icon="phone"
            style={styles.supportButton}
          />
          
          <Button
            title="FAQ & Help Center"
            onPress={() => navigation.navigate('HelpCenter')}
            variant="outline"
            size="medium"
            icon="help-circle"
            style={styles.supportButton}
          />
          
          <Button
            title="Terms of Service"
            onPress={() => navigation.navigate('TermsOfService')}
            variant="outline"
            size="medium"
            icon="file-text"
            style={styles.supportButton}
          />
        </View>
      </Card>
    </View>
  );

  /**
   * Get booking status color
   */
  const getBookingStatusColor = (status) => {
    const statusColors = {
      pending: colors.warning,
      confirmed: colors.info,
      in_progress: colors.primary,
      completed: colors.success,
      cancelled: colors.error,
    };
    
    return statusColors[status] || colors.default;
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading client profile..." />
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
        {/* Profile Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.avatarSection}>
              <Avatar
                source={profileData?.profilePicture ? { uri: profileData.profilePicture } : null}
                size="xlarge"
                onEdit={handleProfilePictureUpdate}
                editable={true}
              />
            </View>
            
            <View style={styles.profileInfo}>
              <ThemedText type="title" style={styles.profileName}>
                {profileData?.name || user.name}
              </ThemedText>
              
              <ThemedText type="default" style={styles.profileEmail}>
                {user.email}
              </ThemedText>
              
              <View style={styles.profileMeta}>
                <ThemedText type="default" style={styles.profileMetaItem}>
                  📍 {profileData?.location || 'Not specified'}
                </ThemedText>
                <ThemedText type="default" style={styles.profileMetaItem}>
                  📱 {profileData?.phone || user.phone || 'Not provided'}
                </ThemedText>
              </View>
              
              <View style={styles.profileBadges}>
                <Badge
                  text={membershipInfo.label}
                  color={membershipInfo.color}
                  size="small"
                />
                {profileData?.verified && (
                  <Badge
                    text="Verified"
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
              title="Share Profile"
              onPress={() => {/* Share functionality */}}
              variant="outline"
              size="medium"
              icon="share"
            />
          </View>
        </Card>

        {/* Main Content Tabs */}
        <TabView
          tabs={[
            { key: 'overview', title: 'Overview' },
            { key: 'portfolio', title: `Portfolio (${portfolio.length})` },
            { key: 'reviews', title: `Reviews (${reviews.length})` },
            { key: 'settings', title: 'Settings' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          style={styles.tabView}
        />

        {/* Tab Content */}
        <View style={styles.tabContainer}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'portfolio' && renderPortfolioTab()}
          {activeTab === 'reviews' && renderReviewsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        size="large"
      >
        <ClientProfile
          profile={profileData}
          onSave={handleUpdateProfile}
          onCancel={() => setShowEditModal(false)}
          loading={updating}
        />
      </Modal>

      {/* Image Viewer Modal */}
      <ImageViewer
        visible={showImageModal}
        onClose={() => setShowImageModal(false)}
        image={selectedImage}
        title="Portfolio Item"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        onConfirm={() => handleDeletePortfolioItem(selectedImage?.id)}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedImage(null);
        }}
        title="Delete Portfolio Item"
        message="Are you sure you want to delete this portfolio item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
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
  avatarSection: {
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 8,
  },
  profileName: {
    fontSize: 24,
  },
  profileEmail: {
    opacity: 0.7,
  },
  profileMeta: {
    gap: 4,
  },
  profileMetaItem: {
    fontSize: 14,
  },
  profileBadges: {
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
  statCard: {
    width: 140,
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  activityCard: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  activityContent: {
    flex: 1,
    gap: 2,
  },
  activityMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    fontStyle: 'italic',
  },
  viewAllButton: {
    alignSelf: 'center',
  },
  preferencesCard: {
    gap: 12,
  },
  preferencesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceBadge: {
    marginBottom: 4,
  },
  emptyPortfolio: {
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyButton: {
    marginTop: 8,
  },
  ratingSummaryCard: {
    gap: 16,
  },
  ratingOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingAverage: {
    fontSize: 32,
  },
  ratingDetails: {
    gap: 4,
  },
  ratingCount: {
    opacity: 0.7,
  },
  reviewsList: {
    gap: 12,
  },
  emptyReviews: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  settingsCard: {
    gap: 12,
  },
  settingsList: {
    gap: 8,
  },
  settingButton: {
    justifyContent: 'flex-start',
  },
  membershipCard: {
    gap: 12,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membershipText: {
    opacity: 0.7,
  },
  upgradeButton: {
    marginTop: 8,
  },
  supportCard: {
    gap: 12,
  },
  supportOptions: {
    gap: 8,
  },
  supportButton: {
    justifyContent: 'flex-start',
  },
});

export default ClientProfileScreen;