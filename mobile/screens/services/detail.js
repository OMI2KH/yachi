import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ThemeContext } from '../../../contexts/theme-context';
import { AuthContext } from '../../../contexts/auth-context';
import { UserContext } from '../../../contexts/user-context';
import { ServiceContext } from '../../../contexts/service-context';
import { BookingContext } from '../../../contexts/booking-context';
import { PaymentContext } from '../../../contexts/payment-context';
import { 
  SERVICE_CATEGORIES,
  SERVICE_STATUS,
  PRICING_MODELS,
  BOOKING_TYPES 
} from '../../../constants/service';
import { USER_ROLES } from '../../../constants/user';
import { 
  formatCurrency,
  formatEthiopianDate,
  formatDuration,
  calculateDistance 
} from '../../../utils/formatters';
import { 
  getServiceDetails,
  getSimilarServices,
  addToFavorites,
  removeFromFavorites,
  reportService,
  contactServiceProvider 
} from '../../../services/service-service';
import { 
  createBookingRequest,
  checkServiceAvailability 
} from '../../../services/booking-service';
import { 
  triggerServiceViewNotification,
  sendServiceInquiry 
} from '../../../services/notification-service';
import { 
  validateServiceBooking,
  calculateServiceCost,
  estimateServiceDuration 
} from '../../../utils/service-calculations';

// Components
import ThemedView from '../../../components/themed-view';
import ThemedText from '../../../components/themed-text';
import Button from '../../../components/ui/button';
import Card from '../../../components/ui/card';
import Loading from '../../../components/ui/loading';
import Badge from '../../../components/ui/badge';
import Rating from '../../../components/ui/rating';
import ImageViewer from '../../../components/ui/image-viewer';
import ShareButton from '../../../components/ui/share-button';
import FavoriteButton from '../../../components/ui/favorite-button';
import ServiceCard from '../../../components/service/service-card';
import ProviderProfile from '../../../components/profile/service-provider-profile';
import ReviewList from '../../../components/service/review-list';
import BookingModal from '../../../components/booking/booking-modal';
import ContactModal from '../../../components/chat/contact-modal';
import ReportModal from '../../../components/ui/report-modal';
import EmptyState from '../../../components/ui/empty-state';

const ServiceDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Context
  const { theme, colors } = useContext(ThemeContext);
  const { user, isAuthenticated } = useContext(AuthContext);
  const { userProfile } = useContext(UserContext);
  const { services, refreshServices } = useContext(ServiceContext);
  const { createBooking } = useContext(BookingContext);
  const { processPayment } = useContext(PaymentContext);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [similarServices, setSimilarServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [serviceStats, setServiceStats] = useState({
    totalBookings: 0,
    completionRate: 0,
    responseRate: 0,
    averageRating: 0,
  });

  // Service ID from params
  const serviceId = params.id;

  // Load service details
  useFocusEffect(
    useCallback(() => {
      if (serviceId) {
        loadServiceDetails();
      }
    }, [serviceId])
  );

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      
      const serviceData = await getServiceDetails(serviceId);
      setService(serviceData.service);
      setProvider(serviceData.provider);
      setReviews(serviceData.reviews || []);
      setIsFavorite(serviceData.isFavorite || false);
      setAvailability(serviceData.availability);
      
      // Calculate service statistics
      calculateServiceStats(serviceData);
      
      // Load similar services
      const similar = await getSimilarServices(serviceId, serviceData.service.category);
      setSimilarServices(similar);
      
    } catch (error) {
      Alert.alert('Load Failed', 'Failed to load service details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate service statistics
  const calculateServiceStats = (serviceData) => {
    const stats = {
      totalBookings: serviceData.service.bookingCount || 0,
      completionRate: serviceData.service.completionRate || 0,
      responseRate: serviceData.provider?.responseRate || 0,
      averageRating: serviceData.service.averageRating || 0,
    };
    
    setServiceStats(stats);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadServiceDetails();
    setRefreshing(false);
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    try {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      if (isFavorite) {
        await removeFromFavorites(serviceId, user.id);
        setIsFavorite(false);
        Alert.alert('Removed', 'Service removed from favorites');
      } else {
        await addToFavorites(serviceId, user.id);
        setIsFavorite(true);
        Alert.alert('Added', 'Service added to favorites');
      }
    } catch (error) {
      Alert.alert('Favorite Failed', error.message);
    }
  };

  // Handle booking
  const handleBooking = async (bookingData) => {
    try {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // Validate booking data
      const validation = validateServiceBooking(bookingData, service);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check service availability
      const isAvailable = await checkServiceAvailability(serviceId, bookingData.date, bookingData.time);
      if (!isAvailable) {
        throw new Error('Service is not available at the selected time');
      }

      // Create booking
      const booking = await createBooking({
        serviceId: serviceId,
        serviceProviderId: service.providerId,
        clientId: user.id,
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      // Send notification
      await triggerServiceViewNotification({
        serviceId,
        serviceName: service.title,
        clientId: user.id,
        action: 'booking_created',
      });

      Alert.alert('Success', 'Booking request sent successfully!');
      setShowBookingModal(false);
      
      // Navigate to bookings
      router.push('/bookings');

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

      await contactServiceProvider(service.providerId, user.id, message);
      
      await sendServiceInquiry({
        serviceId,
        serviceName: service.title,
        clientId: user.id,
        providerId: service.providerId,
        message,
      });

      Alert.alert('Success', 'Message sent to service provider');
      setShowContactModal(false);
    } catch (error) {
      Alert.alert('Message Failed', error.message);
    }
  };

  // Handle report service
  const handleReportService = async (reportData) => {
    try {
      await reportService(serviceId, user.id, reportData);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
      setShowReportModal(false);
    } catch (error) {
      Alert.alert('Report Failed', error.message);
    }
  };

  // Handle share service
  const handleShareService = async () => {
    try {
      const shareUrl = `https://yachi.app/services/${serviceId}`;
      await Share.share({
        message: `Check out this service on Yachi: ${service.title} - ${shareUrl}`,
        title: service.title,
      });
    } catch (error) {
      Alert.alert('Share Failed', error.message);
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

  // Calculate service cost
  const calculateCost = (basePrice, extras = []) => {
    return calculateServiceCost(basePrice, extras, service.pricingModel);
  };

  // Render service overview
  const renderServiceOverview = () => (
    <View style={{ gap: 16 }}>
      {/* Service Images */}
      {service.images && service.images.length > 0 && (
        <Card>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {service.images.map((image, index) => (
              <ServiceImage
                key={index}
                image={image}
                onPress={() => setSelectedImage(image)}
              />
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Service Description */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
          Service Description
        </ThemedText>
        <ThemedText type="secondary" style={{ lineHeight: 20 }}>
          {service.description}
        </ThemedText>
      </Card>

      {/* Service Features */}
      {service.features && service.features.length > 0 && (
        <Card>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            What's Included
          </ThemedText>
          <View style={{ gap: 8 }}>
            {service.features.map((feature, index) => (
              <ServiceFeature key={index} feature={feature} />
            ))}
          </View>
        </Card>
      )}

      {/* Service Requirements */}
      {service.requirements && service.requirements.length > 0 && (
        <Card>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            Requirements
          </ThemedText>
          <View style={{ gap: 8 }}>
            {service.requirements.map((requirement, index) => (
              <ServiceRequirement key={index} requirement={requirement} />
            ))}
          </View>
        </Card>
      )}
    </View>
  );

  // Render pricing information
  const renderPricingInfo = () => (
    <View style={{ gap: 16 }}>
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
          Pricing
        </ThemedText>
        
        <View style={{ gap: 8 }}>
          <PricingItem
            label="Base Price"
            value={formatCurrency(service.price)}
            description={service.pricingModel === PRICING_MODELS.HOURLY ? 'Per hour' : 'Fixed price'}
          />
          
          {service.additionalCharges && service.additionalCharges.map((charge, index) => (
            <PricingItem
              key={index}
              label={charge.name}
              value={formatCurrency(charge.amount)}
              description={charge.description}
            />
          ))}
          
          {service.discount && (
            <PricingItem
              label="Discount"
              value={`-${formatCurrency(service.discount.amount)}`}
              description={service.discount.description}
              color={colors.success}
            />
          )}
        </View>
      </Card>

      {/* Availability Information */}
      {availability && (
        <Card>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            Availability
          </ThemedText>
          <AvailabilityInfo availability={availability} />
        </Card>
      )}
    </View>
  );

  // Render provider information
  const renderProviderInfo = () => (
    <View style={{ gap: 16 }}>
      <ProviderProfile
        provider={provider}
        onContact={() => setShowContactModal(true)}
        onCall={handleCallProvider}
        stats={serviceStats}
      />
    </View>
  );

  // Render reviews
  const renderReviews = () => (
    <View style={{ gap: 16 }}>
      <ReviewList
        reviews={reviews}
        averageRating={serviceStats.averageRating}
        totalReviews={reviews.length}
        onAddReview={isAuthenticated ? () => router.push(`/services/review/${serviceId}`) : null}
      />
    </View>
  );

  if (loading && !refreshing) {
    return <Loading message="Loading service details..." />;
  }

  if (!service) {
    return (
      <EmptyState
        title="Service Not Found"
        description="The service you're looking for doesn't exist or has been removed."
        icon="search"
        action={{
          label: 'Browse Services',
          onPress: () => router.push('/services'),
        }}
      />
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header with Service Title */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={{ marginBottom: 4 }}>
              {service.title}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Rating rating={serviceStats.averageRating} size={16} />
              <ThemedText type="secondary">
                ({reviews.length} reviews)
              </ThemedText>
              <Badge 
                variant={
                  service.status === SERVICE_STATUS.ACTIVE ? 'success' :
                  service.status === SERVICE_STATUS.UNAVAILABLE ? 'warning' : 'error'
                }
                text={service.status}
              />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={handleFavoriteToggle}
              size="medium"
            />
            <ShareButton onShare={handleShareService} size="medium" />
          </View>
        </View>
      </View>

      {/* Service Statistics */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ paddingVertical: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12 }}
      >
        <StatCard label="Total Bookings" value={serviceStats.totalBookings} color={colors.primary} />
        <StatCard label="Completion Rate" value={`${serviceStats.completionRate}%`} color={colors.success} />
        <StatCard label="Response Rate" value={`${serviceStats.responseRate}%`} color={colors.info} />
        <StatCard label="Rating" value={serviceStats.averageRating.toFixed(1)} color={colors.warning} />
      </ScrollView>

      {/* Tab Navigation */}
      <View style={{ 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border 
      }}>
        {['overview', 'pricing', 'provider', 'reviews'].map(tab => (
          <Button
            key={tab}
            title={tab.charAt(0).toUpperCase() + tab.slice(1)}
            onPress={() => setActiveTab(tab)}
            variant={activeTab === tab ? 'primary' : 'outline'}
            size="small"
            style={{ flex: 1, borderRadius: 0 }}
          />
        ))}
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
        {activeTab === 'overview' && renderServiceOverview()}
        {activeTab === 'pricing' && renderPricingInfo()}
        {activeTab === 'provider' && renderProviderInfo()}
        {activeTab === 'reviews' && renderReviews()}
      </ScrollView>

      {/* Action Footer */}
      <View style={{ 
        padding: 16, 
        borderTopWidth: 1, 
        borderTopColor: colors.border,
        gap: 12,
      }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            title="Book Now"
            onPress={() => setShowBookingModal(true)}
            variant="primary"
            style={{ flex: 1 }}
            icon="calendar"
          />
          <Button
            title="Contact"
            onPress={() => setShowContactModal(true)}
            variant="outline"
            style={{ flex: 1 }}
            icon="message-circle"
          />
        </View>
        
        {/* Similar Services */}
        {similarServices.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
              Similar Services
            </ThemedText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {similarServices.slice(0, 3).map(similarService => (
                <ServiceCard
                  key={similarService.id}
                  service={similarService}
                  onPress={() => router.push(`/services/detail?id=${similarService.id}`)}
                  style={{ width: 280 }}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        service={service}
        provider={provider}
        availability={availability}
        onBook={handleBooking}
      />

      {/* Contact Modal */}
      <ContactModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        provider={provider}
        service={service}
        onSendMessage={handleContactProvider}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={handleReportService}
        type="service"
        targetId={serviceId}
      />

      {/* Image Viewer */}
      <ImageViewer
        visible={!!selectedImage}
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Report Button */}
      <Button
        title="Report Service"
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
    </ThemedView>
  );
};

// Helper Components
const StatCard = ({ label, value, color }) => {
  const { colors } = useContext(ThemeContext);
  
  return (
    <View style={{ 
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 100,
    }}>
      <ThemedText type="defaultSemiBold" style={{ fontSize: 20, color }}>
        {value}
      </ThemedText>
      <ThemedText type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
        {label}
      </ThemedText>
    </View>
  );
};

const ServiceImage = ({ image, onPress }) => (
  <View style={{
    width: 200,
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  }}>
    <Button
      title=""
      onPress={onPress}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
      }}
    >
      <ThemedText style={{ textAlign: 'center' }}>📷</ThemedText>
    </Button>
  </View>
);

const ServiceFeature = ({ feature }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <ThemedText style={{ color: '#22c55e' }}>✓</ThemedText>
    <ThemedText type="secondary" style={{ flex: 1 }}>
      {feature}
    </ThemedText>
  </View>
);

const ServiceRequirement = ({ requirement }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <ThemedText style={{ color: '#3b82f6' }}>ℹ️</ThemedText>
    <ThemedText type="secondary" style={{ flex: 1 }}>
      {requirement}
    </ThemedText>
  </View>
);

const PricingItem = ({ label, value, description, color }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
    <View style={{ flex: 1 }}>
      <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
        {label}
      </ThemedText>
      {description && (
        <ThemedText type="secondary" style={{ fontSize: 12, marginTop: 2 }}>
          {description}
        </ThemedText>
      )}
    </View>
    <ThemedText type="defaultSemiBold" style={{ fontSize: 16, color }}>
      {value}
    </ThemedText>
  </View>
);

const AvailabilityInfo = ({ availability }) => (
  <View style={{ gap: 8 }}>
    <ThemedText type="secondary">
      Response Time: {availability.responseTime}
    </ThemedText>
    <ThemedText type="secondary">
      Next Available: {formatEthiopianDate(availability.nextAvailable)}
    </ThemedText>
    {availability.emergencyService && (
      <ThemedText type="secondary" style={{ color: '#ef4444' }}>
        ⚡ Emergency Service Available
      </ThemedText>
    )}
  </View>
);

export default ServiceDetailScreen;