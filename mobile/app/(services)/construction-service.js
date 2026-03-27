import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
  Image,
  FlatList,
  Modal,
  TextInput,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Context for user authentication
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';
import PaymentModal from '../../components/PaymentModal';
import Toast from 'react-native-toast-message';

const ConstructionService = () => {
  const router = useRouter();
  const { user, token } = useContext(AuthContext);
  
  // State variables
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingDetails, setBookingDetails] = useState({
    serviceId: '',
    date: '',
    time: '',
    location: '',
    notes: '',
    amount: 0
  });

  // Fetch construction services
  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CONSTRUCTION_SERVICES}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
        
        // Extract unique categories
        const uniqueCategories = ['all', ...new Set(data.services.map(s => s.category))];
        setCategories(uniqueCategories);
      } else {
        throw new Error('Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load services. Please try again.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch user bookings
  const fetchBookings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MY_BOOKINGS}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Initialize data
  useEffect(() => {
    if (token) {
      fetchServices();
      fetchBookings();
    }
  }, [token]);

  // Handle service selection
  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setBookingDetails(prev => ({
      ...prev,
      serviceId: service.id,
      amount: service.price
    }));
    setShowServiceModal(true);
  };

  // Handle booking submission
  const handleBookService = async () => {
    // Validate booking details
    if (!bookingDetails.date || !bookingDetails.time || !bookingDetails.location) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all required fields'
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREATE_BOOKING}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: bookingDetails.serviceId,
          bookingDate: `${bookingDetails.date} ${bookingDetails.time}`,
          location: bookingDetails.location,
          notes: bookingDetails.notes,
          amount: bookingDetails.amount
        })
      });

      const data = await response.json();

      if (response.ok) {
        setShowServiceModal(false);
        setShowPaymentModal(true);
        Toast.show({
          type: 'success',
          text1: 'Booking Created',
          text2: 'Proceed to payment to confirm your booking'
        });
      } else {
        throw new Error(data.message || 'Booking failed');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Booking Error',
        text2: error.message
      });
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentData) => {
    try {
      // Update booking status
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CONFIRM_BOOKING}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: paymentData.bookingId,
          paymentId: paymentData.paymentId,
          paymentMethod: paymentData.paymentMethod
        })
      });

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Success!',
          text2: 'Your booking has been confirmed'
        });
        
        // Refresh bookings
        fetchBookings();
        
        // Reset states
        setShowPaymentModal(false);
        setSelectedService(null);
        setBookingDetails({
          serviceId: '',
          date: '',
          time: '',
          location: '',
          notes: '',
          amount: 0
        });
        
        // Navigate to bookings tab
        setActiveTab('bookings');
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
    }
  };

  // Filter services based on category and search
  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Render service card
  const renderServiceCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.serviceCard}
      onPress={() => handleServiceSelect(item)}
    >
      <View style={styles.serviceImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.serviceImage} />
        ) : (
          <View style={styles.serviceImagePlaceholder}>
            <Ionicons name="construct" size={40} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.serviceMeta}>
          <View style={styles.priceContainer}>
            <Text style={styles.servicePrice}>ETB {item.price}</Text>
            <Text style={styles.serviceUnit}>/{item.unit}</Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
          </View>
        </View>
        
        <View style={styles.serviceFooter}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={() => handleServiceSelect(item)}
          >
            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render booking card
  const renderBookingCard = ({ item }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingService}>{item.serviceName}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: getStatusColor(item.status)
        }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.bookingDetailRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.bookingDetailText}>
            {new Date(item.bookingDate).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.bookingDetailRow}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.bookingDetailText}>
            {new Date(item.bookingDate).toLocaleTimeString()}
          </Text>
        </View>
        
        <View style={styles.bookingDetailRow}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.bookingDetailText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      </View>
      
      <View style={styles.bookingFooter}>
        <Text style={styles.bookingAmount}>ETB {item.amount}</Text>
        
        {item.status === 'pending' && (
          <TouchableOpacity 
            style={styles.payNowButton}
            onPress={() => router.push(`/payment/${item.id}`)}
          >
            <Text style={styles.payNowText}>Pay Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Helper function for status colors
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'cancelled': return '#F44336';
      case 'completed': return '#2196F3';
      default: return '#666';
    }
  };

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'services') {
      fetchServices();
    } else {
      fetchBookings();
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Construction Services</Text>
          <Text style={styles.headerSubtitle}>
            Professional construction services at your fingertips
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => setActiveTab('services')}
        >
          <Ionicons 
            name="construct" 
            size={22} 
            color={activeTab === 'services' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            Services
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
          onPress={() => setActiveTab('bookings')}
        >
          <Ionicons 
            name="calendar" 
            size={22} 
            color={activeTab === 'bookings' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
            My Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Services Tab Content */}
      {activeTab === 'services' && (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
          >
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.selectedCategoryChip
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.selectedCategoryChipText
                  ]}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Services List */}
          {filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyStateTitle}>No Services Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'Try a different search term' : 'No services available at the moment'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredServices}
              renderItem={renderServiceCard}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#007AFF']}
                />
              }
              contentContainerStyle={styles.servicesList}
            />
          )}
        </>
      )}

      {/* Bookings Tab Content */}
      {activeTab === 'bookings' && (
        <>
          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyStateTitle}>No Bookings Yet</Text>
              <Text style={styles.emptyStateText}>
                Book a construction service to get started
              </Text>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => setActiveTab('services')}
              >
                <Text style={styles.primaryButtonText}>Browse Services</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={bookings}
              renderItem={renderBookingCard}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#007AFF']}
                />
              }
              contentContainerStyle={styles.bookingsList}
            />
          )}
        </>
      )}

      {/* Service Details Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Service</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedService && (
                <>
                  <View style={styles.modalServiceInfo}>
                    <Text style={styles.modalServiceName}>{selectedService.name}</Text>
                    <Text style={styles.modalServiceDescription}>
                      {selectedService.description}
                    </Text>
                    <View style={styles.modalPriceContainer}>
                      <Text style={styles.modalPrice}>ETB {selectedService.price}</Text>
                      <Text style={styles.modalUnit}>/{selectedService.unit}</Text>
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Select Date *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="YYYY-MM-DD"
                      value={bookingDetails.date}
                      onChangeText={(text) => setBookingDetails({...bookingDetails, date: text})}
                      placeholderTextColor="#999"
                    />
                    
                    <Text style={styles.formLabel}>Select Time *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="HH:MM"
                      value={bookingDetails.time}
                      onChangeText={(text) => setBookingDetails({...bookingDetails, time: text})}
                      placeholderTextColor="#999"
                    />
                    
                    <Text style={styles.formLabel}>Location *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter your location"
                      value={bookingDetails.location}
                      onChangeText={(text) => setBookingDetails({...bookingDetails, location: text})}
                      placeholderTextColor="#999"
                    />
                    
                    <Text style={styles.formLabel}>Additional Notes</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea]}
                      placeholder="Any special requirements?"
                      value={bookingDetails.notes}
                      onChangeText={(text) => setBookingDetails({...bookingDetails, notes: text})}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor="#999"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => setShowServiceModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleBookService}
              >
                <Text style={styles.primaryButtonText}>Proceed to Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={bookingDetails.amount}
        currency="ETB"
        bookingId={selectedService?.id}
        onPaymentSuccess={handlePaymentSuccess}
        serviceName={selectedService?.name}
      />

      {/* Toast */}
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  servicesList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  serviceImageContainer: {
    height: 150,
    backgroundColor: '#F5F5F5',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  serviceInfo: {
    padding: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  serviceUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  bookingsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingService: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bookingDetails: {
    marginBottom: 12,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  bookingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  payNowButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payNowText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalContent: {
    padding: 20,
  },
  modalServiceInfo: {
    marginBottom: 20,
  },
  modalServiceName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  modalServiceDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  modalUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  formSection: {
    marginTop: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
});

export default ConstructionService;