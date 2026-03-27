import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ThemeContext } from '../../../contexts/theme-context';
import { AuthContext } from '../../../contexts/auth-context';
import { UserContext } from '../../../contexts/user-context';
import { ServiceContext } from '../../../contexts/service-context';
import { BookingContext } from '../../../contexts/booking-context';
import { 
  USER_ROLES,
  VERIFICATION_LEVELS,
  USER_STATUS 
} from '../../../constants/user';
import { 
  SERVICE_STATUS,
  SERVICE_CATEGORIES 
} from '../../../constants/service';
import { 
  formatCurrency,
  formatEthiopianDate,
  formatDuration,
  calculateDistance 
} from '../../../utils/formatters';
import { 
  getServiceProviderProfile,
  getProviderServices,
  getProviderReviews,
  followProvider,
  unfollowProvider,
  reportProvider,
  checkProviderAvailability 
} from '../../../services/user-service';
import { 
  createBookingRequest,
  getProviderBookingsStats 
} from '../../../services/booking-service';
import { 
  triggerProviderViewNotification,
  sendProviderInquiry 
} from '../../../services/notification-service';
import { 
  calculateProviderRating,
  calculateResponseRate,
  calculateCompletionRate 
} from '../../../utils/service-calculations';

// Components
import ThemedView from '../../../components/themed-view';
import ThemedText from '../../../components/themed-text';
import Button from '../../../components/ui/button';
import Card from '../../../components/ui/card';
import Loading from '../../../components/ui/loading';
import Badge from '../../../components/ui/badge';
import Rating from '../../../components/ui/rating';
import Avatar from '../../../components/ui/avatar';
import ImageViewer from '../../../components/ui/image-viewer';
import ShareButton from '../../../components/ui/share-button';
import FavoriteButton from '../../../components/ui/favorite-button';
import ServiceCard from '../../../components/service/service-card';
import ReviewList from '../../../components/service/review-list';
import PortfolioGrid from '../../../components/profile/portfolio-grid';
import SkillTags from '../../../components/profile/skill-tags';
import VerificationBadge from '../../../components/profile/verification-badge';
import BookingModal from '../../../components/booking/booking-modal';
import ContactModal from '../../../components/chat/contact-modal';
import ReportModal from '../../../components/ui/report-modal';
import EmptyState from '../../../components/ui/empty-state';
import TabView from '../../../components/ui/tabview';

const ProviderProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Context
  const { theme, colors } = useContext(ThemeContext);
  const { user, isAuthenticated } = useContext(AuthContext);
  const { userProfile } = useContext(UserContext);
  const { services } = useContext(ServiceContext);
  const { createBooking } = useContext(BookingContext);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [provider, setProvider] = useState(null);
  const [providerServices, setProviderServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('services');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [providerStats, setProviderStats] = useState({
    totalServices: 0,
    totalBookings: 0,
    completionRate: 0,
    responseRate: 0,
    averageRating: 0,
    memberSince: '',
    lastActive: '',
  });
  const [availability, setAvailability] = useState(null);

  // Provider ID from params
  const providerId = params.id;

  // Check if viewing own profile
  const isOwnProfile = user?.id === providerId;

  // Load provider profile
  useFocusEffect(
    useCallback(() => {
      if (providerId) {
        loadProviderProfile();
      }
    }, [providerId])
  );

  const loadProviderProfile = async () => {
    try {
      setLoading(true);
      
      const profileData = await getServiceProviderProfile(providerId);
      setProvider(profileData.provider);
      setProviderServices(profileData.services || []);
      setReviews(profileData.reviews || []);
      setIsFollowing(profileData.isFollowing || false);
      setAvailability(profileData.availability);
      
      // Calculate provider statistics
      calculateProviderStats(profileData);
      
      // Send view notification
      if (!isOwnProfile && isAuthenticated) {
        await triggerProviderViewNotification({
          providerId,
          viewerId: user.id,
        });
      }
      
    } catch (error) {
      Alert.alert('Load Failed', 'Failed to load provider profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate provider statistics
  const calculateProviderStats = (profileData) => {
    const stats = {
      totalServices: profileData.services?.length || 0,
      totalBookings: profileData.provider?.bookingCount || 0,
      completionRate: calculateCompletionRate(profileData.provider),
      responseRate: calculateResponseRate(profileData.provider),
      averageRating: calculateProviderRating(profileData.reviews),
      memberSince: profileData.provider?.createdAt || '',
      lastActive: profileData.provider?.lastActive || '',
    };
    
    setProviderStats(stats);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProviderProfile();
    setRefreshing(false);
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    try {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      if (isFollowing) {
        await unfollowProvider(providerId, user.id);
        setIsFollowing(false);
        Alert.alert('Unfollowed', `You unfollowed ${provider?.displayName}`);
      } else {
        await followProvider(providerId, user.id);
        setIsFollowing(true);
        Alert.alert('Following', `You are now following ${provider?.displayName}`);
      }
    } catch (error) {
      Alert.alert('Follow Failed', error.message);
    }
  };

  // Handle booking request
  const handleBookingRequest = async (service, bookingData) => {
    try {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // Check provider availability
      const isAvailable = await checkProviderAvailability(providerId, bookingData.date, bookingData.time);
      if (!isAvailable) {
        throw new Error('Provider is not available at the selected time');
      }

      // Create booking
      const booking = await createBooking({
        serviceId: service.id,
        serviceProviderId: providerId,
        clientId: user.id,
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Booking request sent successfully!');
      setShowBookingModal(false);
      setSelectedService(null);
      
    } catch (error) {
      Alert.alert('Booking Failed', error.message);
    }
  };

  // Handle contact provider
  const handleContactProvider = async (message) => {
    try {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      await sendProviderInquiry({
        providerId,
        clientId: user.id,
        message,
      });

      Alert.alert('Success', 'Message sent to service provider');
      setShowContactModal(false);
    } catch (error) {
      Alert.alert('Message Failed', error.message);
    }
  };

  // Handle report provider
  const handleReportProvider = async (reportData) => {
    try {
      await reportProvider(providerId, user.id, reportData);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
      setShowReportModal(false);
    } catch (error) {
      Alert.alert('Report Failed', error.message);
    }
  };

  // Handle call provider
  const handleCallProvider = async () => {
    if (provider?.phoneNumber) {
      const phoneUrl = `tel:${provider.phoneNumber}`;
      try {
        await Linking.openURL(phoneUrl);
      } catch (error) {
        Alert.alert('Call Failed', 'Cannot make phone call');
      }
    }
  };

  // Handle share profile
  const handleShareProfile = async () => {
    try {
      const shareUrl = `https://yachi.app/providers/${providerId}`;
      await Share.share({
        message: `Check out ${provider?.displayName}'s profile on Yachi: ${shareUrl}`,
        title: `${provider?.displayName} - Yachi Provider`,
      });
    } catch (error) {
      Alert.alert('Share Failed', error.message);
    }
  };

  // Render provider header
  const renderProviderHeader = () => (
    <Card>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <Avatar
          source={provider?.avatar}
          size={80}
          name={provider?.displayName}
          isVerified={provider?.isVerified}
          verificationLevel={provider?.verificationLevel}
        />
        
        {/* Provider Info */}
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ThemedText type="title" style={{ fontSize: 20 }}>
              {provider?.displayName}
            </ThemedText>
            <VerificationBadge level={provider?.verificationLevel} />
            {provider?.premiumMember && (
              <Badge variant="premium" text="Premium" />
            )}
          </View>
          
          <ThemedText type="secondary">
            {provider?.profession || 'Service Provider'}
          </ThemedText>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Rating rating={providerStats.averageRating} size={16} showLabel />
            <ThemedText type="secondary">
              {reviews.length} reviews
            </ThemedText>
            <ThemedText type="secondary">
              {providerStats.totalBookings} bookings
            </ThemedText>
          </View>
          
          {/* Skills */}
          {provider?.skills && provider.skills.length > 0 && (
            <SkillTags skills={provider.skills.slice(0, 5)} />
          )}
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {!isOwnProfile && (
          <>
            <Button
              title={isFollowing ? "Following" : "Follow"}
              onPress={handleFollowToggle}
              variant={isFollowing ? "outline" : "primary"}
              size="small"
              icon={isFollowing ? "check" : "plus"}
              style={{ flex: 1 }}
            />
            <Button
              title="Contact"
              onPress={() => setShowContactModal(true)}
              variant="outline"
              size="small"
              icon="message-circle"
              style={{ flex: 1 }}
            />
            <Button
              title="Call"
              onPress={handleCallProvider}
              variant="outline"
              size="small"
              icon="phone"
              style={{ flex: 1 }}
            />
          </>
        )}
        
        {isOwnProfile && (
          <Button
            title="Edit Profile"
            onPress={() => router.push('/profile/edit')}
            variant="primary"
            size="small"
            icon="edit"
            style={{ flex: 1 }}
          />
        )}
      </View>
    </Card>
  );

  // Render provider statistics
  const renderProviderStats = () => (
    <Card>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
        Performance Statistics
      </ThemedText>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <StatItem 
          label="Completion Rate" 
          value={`${providerStats.completionRate}%`} 
          color={colors.success}
          icon="check-circle"
        />
        <StatItem 
          label="Response Rate" 
          value={`${providerStats.responseRate}%`} 
          color={colors.info}
          icon="message-circle"
        />
        <StatItem 
          label="On Time" 
          value="96%" 
          color={colors.warning}
          icon="clock"
        />
        <StatItem 
          label="Repeat Clients" 
          value="78%" 
          color={colors.primary}
          icon="users"
        />
      </View>
    </Card>
  );

  // Render services tab
  const renderServicesTab = () => (
    <View style={{ gap: 16 }}>
      {providerServices.length === 0 ? (
        <EmptyState
          title="No Services"
          description={isOwnProfile 
            ? "You haven't created any services yet. Start offering your skills to clients."
            : "This provider hasn't created any services yet."
          }
          icon="briefcase"
          action={isOwnProfile ? {
            label: 'Create Service',
            onPress: () => router.push('/services/create'),
          } : null}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {providerServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onPress={() => router.push(`/services/detail?id=${service.id}`)}
              onBook={() => {
                setSelectedService(service);
                setShowBookingModal(true);
              }}
              showBookButton={!isOwnProfile}
            />
          ))}
        </View>
      )}
    </View>
  );

  // Render portfolio tab
  const renderPortfolioTab = () => (
    <View style={{ gap: 16 }}>
      {provider?.portfolio && provider.portfolio.length > 0 ? (
        <PortfolioGrid
          portfolioItems={provider.portfolio}
          onItemPress={setSelectedImage}
          editable={isOwnProfile}
          onAddItem={isOwnProfile ? () => router.push('/profile/portfolio') : null}
        />
      ) : (
        <EmptyState
          title="No Portfolio"
          description={isOwnProfile
            ? "Showcase your work by adding photos to your portfolio."
            : "This provider hasn't added any portfolio items yet."
          }
          icon="image"
          action={isOwnProfile ? {
            label: 'Add Portfolio Items',
            onPress: () => router.push('/profile/portfolio'),
          } : null}
        />
      )}
    </View>
  );

  // Render reviews tab
  const renderReviewsTab = () => (
    <View style={{ gap: 16 }}>
      <ReviewList
        reviews={reviews}
        averageRating={providerStats.averageRating}
        totalReviews={reviews.length}
        onAddReview={!isOwnProfile && isAuthenticated ? () => router.push(`/reviews/create?providerId=${providerId}`) : null}
      />
    </View>
  );

  // Render about tab
  const renderAboutTab = () => (
    <View style={{ gap: 16 }}>
      {/* Bio */}
      {provider?.bio && (
        <Card>
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            About
          </ThemedText>
          <ThemedText type="secondary" style={{ lineHeight: 20 }}>
            {provider.bio}
          </ThemedText>
        </Card>
      )}

      {/* Experience */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
          Experience & Qualifications
        </ThemedText>
        <View style={{ gap: 12 }}>
          {provider?.experience && (
            <InfoItem
              icon="briefcase"
              label="Experience"
              value={`${provider.experience} years`}
            />
          )}
          
          {provider?.education && (
            <InfoItem
              icon="graduation-cap"
              label="Education"
              value={provider.edducation}
            />
          )}
          
          {provider?.certifications && provider.certifications.length > 0 && (
            <InfoItem
              icon="award"
              label="Certifications"
              value={provider.certifications.join(', ')}
            />
          )}
          
          <InfoItem
            icon="calendar"
            label="Member Since"
            value={formatEthiopianDate(providerStats.memberSince)}
          />
          
          <InfoItem
            icon="clock"
            label="Last Active"
            value={formatEthiopianDate(providerStats.lastActive)}
          />
        </View>
      </Card>

      {/* Location */}
      {provider?.location && (
        <Card>
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            Location
          </ThemedText>
          <ThemedText type="secondary">
            {provider.location.city}, {provider.location.subcity}
          </ThemedText>
          <ThemedText type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
            {provider.location.address}
          </ThemedText>
        </Card>
      )}

      {/* Availability */}
      {availability && (
        <Card>
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            Availability
          </ThemedText>
          <ThemedText type="secondary">
            Response Time: {availability.responseTime}
          </ThemedText>
          <ThemedText type="secondary">
            Next Available: {formatEthiopianDate(availability.nextAvailable)}
          </ThemedText>
          {availability.emergencyService && (
            <ThemedText type="secondary" style={{ color: colors.success, marginTop: 4 }}>
              ⚡ Emergency Service Available
            </ThemedText>
          )}
        </Card>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return <Loading message="Loading provider profile..." />;
  }

  if (!provider) {
    return (
      <EmptyState
        title="Provider Not Found"
        description="The provider you're looking for doesn't exist or has been removed."
        icon="user"
        action={{
          label: 'Browse Providers',
          onPress: () => router.push('/services'),
        }}
      />
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ThemedText type="title">Provider Profile</ThemedText>
        <ThemedText type="secondary">
          {isOwnProfile ? 'Your professional profile' : 'Service provider details'}
        </ThemedText>
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
        <View style={{ gap: 16 }}>
          {renderProviderHeader()}
          {renderProviderStats()}
        </View>

        {/* Tab Navigation */}
        <TabView
          tabs={[
            { key: 'services', label: `Services (${providerServices.length})` },
            { key: 'portfolio', label: 'Portfolio' },
            { key: 'reviews', label: `Reviews (${reviews.length})` },
            { key: 'about', label: 'About' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          style={{ marginTop: 16 }}
        />

        {/* Tab Content */}
        <View style={{ marginTop: 16 }}>
          {activeTab === 'services' && renderServicesTab()}
          {activeTab === 'portfolio' && renderPortfolioTab()}
          {activeTab === 'reviews' && renderReviewsTab()}
          {activeTab === 'about' && renderAboutTab()}
        </View>
      </ScrollView>

      {/* Action Footer for Non-Own Profiles */}
      {!isOwnProfile && (
        <View style={{ 
          padding: 16, 
          borderTopWidth: 1, 
          borderTopColor: colors.border,
          gap: 12,
        }}>
          <Button
            title="Book Service"
            onPress={() => {
              if (providerServices.length === 1) {
                setSelectedService(providerServices[0]);
                setShowBookingModal(true);
              } else {
                setActiveTab('services');
              }
            }}
            variant="primary"
            size="large"
            icon="calendar"
            disabled={providerServices.length === 0}
          />
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Contact"
              onPress={() => setShowContactModal(true)}
              variant="outline"
              size="small"
              icon="message-circle"
              style={{ flex: 1 }}
            />
            <Button
              title="Share"
              onPress={handleShareProfile}
              variant="outline"
              size="small"
              icon="share"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedService(null);
        }}
        service={selectedService}
        provider={provider}
        availability={availability}
        onBook={handleBookingRequest}
      />

      {/* Contact Modal */}
      <ContactModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        provider={provider}
        onSendMessage={handleContactProvider}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={handleReportProvider}
        type="provider"
        targetId={providerId}
      />

      {/* Image Viewer */}
      <ImageViewer
        visible={!!selectedImage}
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Report Button */}
      {!isOwnProfile && (
        <Button
          title="Report"
          onPress={() => setShowReportModal(true)}
          variant="outline"
          size="small"
          style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16,
            backgroundColor: colors.card + 'CC',
          }}
          icon="flag"
        />
      )}
    </ThemedView>
  );
};

// Helper Components
const StatItem = ({ label, value, color, icon }) => (
  <View style={{ alignItems: 'center', minWidth: 80 }}>
    <ThemedText style={{ fontSize: 20, marginBottom: 4 }}>{icon}</ThemedText>
    <ThemedText type="defaultSemiBold" style={{ fontSize: 18, color, marginBottom: 4 }}>
      {value}
    </ThemedText>
    <ThemedText type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
      {label}
    </ThemedText>
  </View>
);

const InfoItem = ({ icon, label, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
    <ThemedText style={{ fontSize: 16, width: 20 }}>{icon}</ThemedText>
    <View style={{ flex: 1 }}>
      <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
        {label}
      </ThemedText>
      <ThemedText type="secondary" style={{ fontSize: 14, marginTop: 2 }}>
        {value}
      </ThemedText>
    </View>
  </View>
);

export default ProviderProfileScreen;