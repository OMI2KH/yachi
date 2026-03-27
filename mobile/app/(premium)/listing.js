import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

const PROPERTY_TYPES = [
  'Apartment',
  'House',
  'Villa',
  'Commercial',
  'Land',
  'Studio',
  'Shared Room',
  'Hotel',
];

const FURNISHING_OPTIONS = ['Furnished', 'Semi-Furnished', 'Unfurnished'];
const AMENITIES_LIST = [
  'WiFi',
  'Parking',
  'Swimming Pool',
  'Gym',
  'Security',
  'Garden',
  'Balcony',
  'Elevator',
  'AC',
  'Heating',
  'Pet Friendly',
];

export default function PremiumListingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [location, setLocation] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    propertyType: 'Apartment',
    price: '',
    currency: 'ETB',
    
    // Details
    bedrooms: '',
    bathrooms: '',
    area: '',
    areaUnit: 'sqm',
    furnishing: 'Furnished',
    yearBuilt: '',
    
    // Location
    address: '',
    city: '',
    region: '',
    latitude: null,
    longitude: null,
    
    // Features
    amenities: [],
    features: '',
    
    // Contact
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    
    // Listing Package
    packageType: 'premium',
    listingDuration: 30,
    featured: true,
    
    // Payment
    paymentMethod: null,
    paymentToken: null,
  });

  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([
    { id: 'chapa', name: 'Chapa', icon: 'credit-card', type: 'card' },
    { id: 'telebirr', name: 'Telebirr', icon: 'mobile', type: 'mobile_money' },
    { id: 'cbe_birr', name: 'CBE Birr', icon: 'bank', type: 'mobile_money' },
  ]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required for better listing visibility.');
      return;
    }
    
    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);
    setFormData(prev => ({
      ...prev,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }));
  };

  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.uri.split('/').pop(),
        type: 'image/jpeg',
      }));
      setImages([...images, ...newImages].slice(0, 20)); // Limit to 20 images
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const newImage = {
        uri: result.assets[0].uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      };
      setImages([...images, newImage].slice(0, 20));
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (images.length === 0) return [];

    setUploading(true);
    const uploadedUrls = [];
    
    try {
      for (const image of images) {
        const formData = new FormData();
        formData.append('image', image);

        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        const data = await response.json();
        if (data.url) {
          uploadedUrls.push(data.url);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const validateStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        if (!formData.title.trim()) {
          Alert.alert('Error', 'Please enter a property title');
          return false;
        }
        if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
          Alert.alert('Error', 'Please enter a valid price');
          return false;
        }
        if (images.length === 0) {
          Alert.alert('Error', 'Please add at least one photo');
          return false;
        }
        return true;
      
      case 2:
        if (!formData.bedrooms || parseInt(formData.bedrooms) < 0) {
          Alert.alert('Error', 'Please enter number of bedrooms');
          return false;
        }
        if (!formData.bathrooms || parseInt(formData.bathrooms) < 0) {
          Alert.alert('Error', 'Please enter number of bathrooms');
          return false;
        }
        if (!formData.area || isNaN(formData.area) || parseFloat(formData.area) <= 0) {
          Alert.alert('Error', 'Please enter a valid area');
          return false;
        }
        return true;
      
      case 3:
        if (!formData.address.trim()) {
          Alert.alert('Error', 'Please enter the address');
          return false;
        }
        if (!formData.city.trim()) {
          Alert.alert('Error', 'Please enter the city');
          return false;
        }
        if (!formData.contactPhone.trim() || formData.contactPhone.length < 10) {
          Alert.alert('Error', 'Please enter a valid phone number');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!validateStep(step)) return;
    if (step < 4) {
      setStep(step + 1);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handlePaymentSelection = (method) => {
    setSelectedPaymentMethod(method);
  };

  const processPayment = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setLoading(true);
    try {
      // First upload images
      const imageUrls = await uploadImages();
      
      // Prepare listing data
      const listingData = {
        ...formData,
        images: imageUrls,
        paymentMethod: selectedPaymentMethod.id,
        totalAmount: calculateTotal(),
      };

      // Create payment intent
      const paymentResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: calculateTotal(),
          currency: 'ETB',
          provider: selectedPaymentMethod.id,
          metadata: {
            listingType: 'premium',
            listingData: listingData,
          }
        }),
      });

      const paymentData = await paymentResponse.json();
      
      if (paymentData.checkoutUrl) {
        // For Ethiopian gateways, open webview or redirect
        router.push({
          pathname: '/payment-webview',
          params: {
            url: paymentData.checkoutUrl,
            listingData: JSON.stringify(listingData),
          }
        });
      } else if (paymentData.status === 'pending') {
        // Handle mobile money USSD or other flows
        Alert.alert(
          'Payment Initiated',
          `Please complete payment using ${selectedPaymentMethod.name}. Check your phone for USSD prompt.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowPaymentModal(false);
                router.push('/listings?status=pending');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const basePrice = 199; // ETB for premium listing
    const imageFee = images.length > 5 ? (images.length - 5) * 10 : 0;
    return basePrice + imageFee;
  };

  const renderImageGrid = () => (
    <View style={styles.imageGrid}>
      <TouchableOpacity style={styles.imageUploadBox} onPress={pickImages}>
        <Ionicons name="images-outline" size={40} color="#666" />
        <Text style={styles.imageUploadText}>Add Photos</Text>
        <Text style={styles.imageCount}>{images.length}/20</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cameraUploadBox} onPress={takePhoto}>
        <Ionicons name="camera-outline" size={30} color="#666" />
      </TouchableOpacity>

      {images.map((image, index) => (
        <View key={index} style={styles.imageItem}>
          <Image source={{ uri: image.uri }} style={styles.thumbnail} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => removeImage(index)}
          >
            <Ionicons name="close-circle" size={24} color="#ff4444" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((stepNum) => (
        <View key={stepNum} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              stepNum === step && styles.stepCircleActive,
              stepNum < step && styles.stepCircleCompleted,
            ]}
          >
            {stepNum < step ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={styles.stepText}>{stepNum}</Text>
            )}
          </View>
          <Text style={styles.stepLabel}>
            {stepNum === 1 ? 'Basic' : stepNum === 2 ? 'Details' : stepNum === 3 ? 'Location' : 'Review'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <Text style={styles.label}>Property Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Luxury 3-bedroom apartment in Bole"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              maxLength={100}
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your property..."
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
            
            <Text style={styles.label}>Property Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.propertyType}
                onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
                style={styles.picker}
              >
                {PROPERTY_TYPES.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
            
            <Text style={styles.label}>Price (ETB) *</Text>
            <View style={styles.priceContainer}>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="0.00"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                keyboardType="numeric"
              />
              <Text style={styles.currencyText}>ETB</Text>
            </View>
            
            <Text style={styles.label}>Photos *</Text>
            <Text style={styles.helperText}>Add clear photos of your property (max 20)</Text>
            {renderImageGrid()}
            {uploading && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.uploadingText}>Uploading images...</Text>
              </View>
            )}
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Bedrooms</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  value={formData.bedrooms}
                  onChangeText={(text) => setFormData({ ...formData, bedrooms: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Bathrooms</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  value={formData.bathrooms}
                  onChangeText={(text) => setFormData({ ...formData, bathrooms: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Area</Text>
                <TextInput
                  style={styles.input}
                  placeholder="120"
                  value={formData.area}
                  onChangeText={(text) => setFormData({ ...formData, area: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.unitContainer}>
                <Text style={styles.label}>Unit</Text>
                <Picker
                  selectedValue={formData.areaUnit}
                  onValueChange={(value) => setFormData({ ...formData, areaUnit: value })}
                  style={styles.unitPicker}
                >
                  <Picker.Item label="sqm" value="sqm" />
                  <Picker.Item label="sqft" value="sqft" />
                </Picker>
              </View>
            </View>
            
            <Text style={styles.label}>Furnishing</Text>
            <View style={styles.furnishingContainer}>
              {FURNISHING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.furnishingOption,
                    formData.furnishing === option && styles.furnishingOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, furnishing: option })}
                >
                  <Text style={[
                    styles.furnishingText,
                    formData.furnishing === option && styles.furnishingTextSelected,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Year Built</Text>
            <TextInput
              style={styles.input}
              placeholder="2020"
              value={formData.yearBuilt}
              onChangeText={(text) => setFormData({ ...formData, yearBuilt: text })}
              keyboardType="numeric"
              maxLength={4}
            />
            
            <Text style={styles.label}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {AMENITIES_LIST.map((amenity) => (
                <TouchableOpacity
                  key={amenity}
                  style={[
                    styles.amenityItem,
                    formData.amenities.includes(amenity) && styles.amenityItemSelected,
                  ]}
                  onPress={() => handleAmenityToggle(amenity)}
                >
                  <Text style={[
                    styles.amenityText,
                    formData.amenities.includes(amenity) && styles.amenityTextSelected,
                  ]}>
                    {amenity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Additional Features</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional features..."
              value={formData.features}
              onChangeText={(text) => setFormData({ ...formData, features: text })}
              multiline
              numberOfLines={3}
            />
          </View>
        );
      
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Location & Contact</Text>
            
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full address"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
            />
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Addis Ababa"
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Region</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Bole"
                  value={formData.region}
                  onChangeText={(text) => setFormData({ ...formData, region: text })}
                />
              </View>
            </View>
            
            {location && (
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={16} color="#007AFF" />
                <Text style={styles.locationText}>
                  Location detected: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
                </Text>
              </View>
            )}
            
            <Text style={styles.sectionSubtitle}>Contact Information</Text>
            
            <Text style={styles.label}>Contact Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              value={formData.contactName}
              onChangeText={(text) => setFormData({ ...formData, contactName: text })}
            />
            
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="0912345678"
              value={formData.contactPhone}
              onChangeText={(text) => setFormData({ ...formData, contactPhone: text })}
              keyboardType="phone-pad"
              maxLength={10}
            />
            
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              value={formData.contactEmail}
              onChangeText={(text) => setFormData({ ...formData, contactEmail: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        );
      
      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Review & Submit</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Package</Text>
                <Text style={styles.summaryValue}>Premium Listing</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>30 days</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Featured</Text>
                <Text style={styles.summaryValue}>Yes (Top of search results)</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Property</Text>
                <Text style={styles.summaryValue}>{formData.title}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type</Text>
                <Text style={styles.summaryValue}>{formData.propertyType}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={styles.summaryValue}>{formData.price} ETB</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Location</Text>
                <Text style={styles.summaryValue}>{formData.address}, {formData.city}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Photos</Text>
                <Text style={styles.summaryValue}>{images.length} images</Text>
              </View>
            </View>
            
            <View style={styles.pricingCard}>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Premium listing fee</Text>
                <Text style={styles.pricingValue}>199 ETB</Text>
              </View>
              
              {images.length > 5 && (
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Extra photos ({images.length - 5} × 10 ETB)</Text>
                  <Text style={styles.pricingValue}>{(images.length - 5) * 10} ETB</Text>
                </View>
              )}
              
              <View style={[styles.pricingRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{calculateTotal()} ETB</Text>
              </View>
            </View>
            
            <Text style={styles.termsText}>
              By submitting, you agree to our Terms of Service and confirm that this listing complies with our guidelines.
            </Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium Listing</Text>
          <View style={styles.headerRight} />
        </View>
        
        {renderStepIndicator()}
        
        <ScrollView style={styles.scrollView}>
          {renderStepContent()}
        </ScrollView>
        
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.prevButton} onPress={handlePrevStep}>
              <Text style={styles.prevButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextStep}
            disabled={loading || uploading}
          >
            {loading || uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === 4 ? 'Proceed to Payment' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.totalAmount}>Total: {calculateTotal()} ETB</Text>
            
            <FlatList
              data={availablePaymentMethods}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.paymentMethodItem,
                    selectedPaymentMethod?.id === item.id && styles.paymentMethodSelected,
                  ]}
                  onPress={() => handlePaymentSelection(item)}
                >
                  <View style={styles.paymentMethodInfo}>
                    <View style={[
                      styles.paymentIcon,
                      { backgroundColor: item.id === 'chapa' ? '#4CAF50' : item.id === 'telebirr' ? '#FF6B00' : '#1E88E5' }
                    ]}>
                      <MaterialIcons name={item.icon} size={24} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.paymentMethodName}>{item.name}</Text>
                      <Text style={styles.paymentMethodType}>
                        {item.type === 'mobile_money' ? 'Mobile Money' : 'Card Payment'}
                      </Text>
                    </View>
                  </View>
                  {selectedPaymentMethod?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              ListFooterComponent={() => (
                <View style={styles.securityNote}>
                  <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                  <Text style={styles.securityText}>
                    All payments are secured and encrypted
                  </Text>
                </View>
              )}
            />
            
            <TouchableOpacity
              style={[
                styles.payButton,
                !selectedPaymentMethod && styles.payButtonDisabled,
              ]}
              onPress={processPayment}
              disabled={!selectedPaymentMethod || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payButtonText}>
                  Pay {calculateTotal()} ETB
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#000',
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
    color: '#000',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageUploadBox: {
    width: 100,
    height: 100,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraUploadBox: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  imageCount: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  unitContainer: {
    width: 100,
  },
  unitPicker: {
    height: 50,
  },
  furnishingContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  furnishingOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  furnishingOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  furnishingText: {
    fontSize: 14,
    color: '#666',
  },
  furnishingTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  amenityItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  amenityItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  amenityText: {
    fontSize: 14,
    color: '#666',
  },
  amenityTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    marginLeft: 8,
    color: '#1565C0',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#666',
  },
  pricingValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  prevButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    alignItems: 'center',
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
    marginVertical: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentMethodSelected: {
    backgroundColor: '#f0f7ff',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  paymentMethodType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  payButton: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});