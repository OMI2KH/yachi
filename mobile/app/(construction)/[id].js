import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

const { width, height } = Dimensions.get('window');

export default function ConstructionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const bottomSheetRef = useRef(null);
  const snapPoints = ['25%', '50%', '90%'];

  const [construction, setConstruction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  // Mock data - replace with actual API call
  useEffect(() => {
    fetchConstructionDetails();
    fetchPaymentMethods();
  }, [id]);

  const fetchConstructionDetails = async () => {
    try {
      // Replace with actual API call
      const mockData = {
        id,
        title: 'Modern Residential Villa',
        description: 'A luxurious 5-bedroom villa with smart home features, swimming pool, and landscaped garden. Located in prime residential area.',
        location: 'Bole, Addis Ababa',
        architect: 'Meles Architecture Studio',
        duration: '18 months',
        totalCost: 12500000, // ETB
        progress: 65,
        images: [
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
          'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w-800',
        ],
        packages: [
          {
            id: 'basic',
            name: 'Basic Package',
            description: 'Standard construction with quality materials',
            price: 8500000,
            features: [
              'Foundation & Structure',
              'Basic Finishes',
              'Standard Electrical',
              'Plumbing Installation',
            ],
          },
          {
            id: 'premium',
            name: 'Premium Package',
            description: 'High-end finishes with smart features',
            price: 10500000,
            features: [
              'Everything in Basic',
              'Premium Finishes',
              'Smart Home System',
              'Landscaping',
              'Swimming Pool',
            ],
            isPopular: true,
          },
          {
            id: 'luxury',
            name: 'Luxury Package',
            description: 'Complete luxury package with custom features',
            price: 12500000,
            features: [
              'Everything in Premium',
              'Custom Interior Design',
              'Home Theater',
              'Wine Cellar',
              'Solar Power System',
            ],
          },
        ],
        milestones: [
          { name: 'Foundation', completed: true, date: '2024-01-15' },
          { name: 'Structure', completed: true, date: '2024-03-20' },
          { name: 'Roofing', completed: true, date: '2024-05-10' },
          { name: 'Electrical', completed: false, date: '2024-07-01' },
          { name: 'Plumbing', completed: false, date: '2024-08-15' },
          { name: 'Finishing', completed: false, date: '2024-11-30' },
        ],
      };
      
      setConstruction(mockData);
      setSelectedPackage(mockData.packages[1]); // Default to premium
      setLoading(false);
    } catch (error) {
      console.error('Error fetching construction details:', error);
      Alert.alert('Error', 'Failed to load construction details');
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      // Replace with actual API call
      const methods = [
        {
          id: '1',
          provider: 'telebirr',
          methodType: 'mobile_money',
          lastFour: '5678',
          phoneNumber: '0912345678',
          isDefault: true,
        },
        {
          id: '2',
          provider: 'chapa',
          methodType: 'bank_account',
          lastFour: '4321',
          bankName: 'Commercial Bank of Ethiopia',
          isDefault: false,
        },
        {
          id: '3',
          provider: 'cbe_birr',
          methodType: 'mobile_money',
          lastFour: '9012',
          phoneNumber: '0923456789',
          isDefault: false,
        },
      ];
      setPaymentMethods(methods);
      setSelectedPaymentMethod(methods.find(m => m.isDefault));
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handlePackageSelect = (pkg) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPackage(pkg);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('et-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePayment = async () => {
    if (!selectedPackage || !selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a package and payment method');
      return;
    }

    setProcessingPayment(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Replace with actual payment API call
      const paymentData = {
        constructionId: id,
        packageId: selectedPackage.id,
        amount: selectedPackage.price,
        paymentMethodId: selectedPaymentMethod.id,
        provider: selectedPaymentMethod.provider,
        currency: 'ETB',
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'Payment Successful',
        `Your payment of ${formatCurrency(selectedPackage.price)} for ${selectedPackage.name} has been processed successfully.`,
        [
          {
            text: 'View Receipt',
            onPress: () => router.push(`/receipt/${Date.now()}`),
          },
          {
            text: 'Done',
            style: 'default',
          },
        ]
      );

      setShowPaymentSheet(false);
      setProcessingPayment(false);
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
      setProcessingPayment(false);
    }
  };

  const renderPaymentMethodIcon = (provider) => {
    switch (provider) {
      case 'telebirr':
        return <Ionicons name="phone-portrait" size={24} color="#007AFF" />;
      case 'chapa':
        return <FontAwesome5 name="hand-holding-usd" size={24} color="#34C759" />;
      case 'cbe_birr':
        return <MaterialIcons name="account-balance" size={24} color="#FF3B30" />;
      default:
        return <Ionicons name="card" size={24} color="#8E8E93" />;
    }
  };

  const getProviderName = (provider) => {
    const names = {
      'telebirr': 'TeleBirr',
      'chapa': 'Chapa',
      'cbe_birr': 'CBE Birr',
    };
    return names[provider] || provider;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading construction details...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Construction Details</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Construction Images */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
          >
            {construction.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.constructionImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Construction Info */}
          <View style={styles.content}>
            <Text style={styles.title}>{construction.title}</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#8E8E93" />
              <Text style={styles.location}>{construction.location}</Text>
            </View>

            <Text style={styles.description}>{construction.description}</Text>

            {/* Progress Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Construction Progress</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${construction.progress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{construction.progress}%</Text>
              </View>
              
              <View style={styles.milestones}>
                {construction.milestones.map((milestone, index) => (
                  <View key={index} style={styles.milestoneItem}>
                    <View style={[
                      styles.milestoneDot,
                      milestone.completed && styles.milestoneCompleted
                    ]}>
                      <Ionicons 
                        name={milestone.completed ? "checkmark" : "ellipse"} 
                        size={12} 
                        color="#FFF" 
                      />
                    </View>
                    <Text style={styles.milestoneName}>{milestone.name}</Text>
                    <Text style={styles.milestoneDate}>{milestone.date}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Packages Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select a Package</Text>
              <Text style={styles.sectionSubtitle}>Choose the package that fits your needs</Text>
              
              {construction.packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    selectedPackage?.id === pkg.id && styles.packageCardSelected,
                    pkg.isPopular && styles.popularPackage,
                  ]}
                  onPress={() => handlePackageSelect(pkg)}
                >
                  {pkg.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>POPULAR</Text>
                    </View>
                  )}
                  
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePrice}>
                      {formatCurrency(pkg.price)}
                    </Text>
                  </View>
                  
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                  
                  <View style={styles.featuresList}>
                    {pkg.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Fixed Payment Button */}
        <BlurView intensity={80} tint="light" style={styles.paymentButtonContainer}>
          <View style={styles.paymentInfo}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {selectedPackage ? formatCurrency(selectedPackage.price) : 'Select Package'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.payButton,
              (!selectedPackage || processingPayment) && styles.payButtonDisabled,
            ]}
            onPress={() => setShowPaymentSheet(true)}
            disabled={!selectedPackage || processingPayment}
          >
            {processingPayment ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.payButtonText}>Proceed to Payment</Text>
            )}
          </TouchableOpacity>
        </BlurView>

        {/* Payment Method Bottom Sheet */}
        {showPaymentSheet && (
          <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose
            onClose={() => setShowPaymentSheet(false)}
            backgroundStyle={styles.bottomSheetBackground}
            handleIndicatorStyle={styles.bottomSheetIndicator}
          >
            <BottomSheetScrollView style={styles.bottomSheetContent}>
              <Text style={styles.bottomSheetTitle}>Select Payment Method</Text>
              
              {/* Selected Package Summary */}
              <View style={styles.packageSummary}>
                <Text style={styles.packageSummaryTitle}>Package Selected</Text>
                <Text style={styles.packageSummaryName}>{selectedPackage?.name}</Text>
                <Text style={styles.packageSummaryPrice}>
                  {formatCurrency(selectedPackage?.price || 0)}
                </Text>
              </View>

              {/* Payment Methods */}
              <Text style={styles.paymentMethodsTitle}>Your Payment Methods</Text>
              
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    selectedPaymentMethod?.id === method.id && styles.paymentMethodCardSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod(method)}
                >
                  <View style={styles.paymentMethodIcon}>
                    {renderPaymentMethodIcon(method.provider)}
                  </View>
                  
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodName}>
                      {getProviderName(method.provider)}
                    </Text>
                    {method.methodType === 'mobile_money' ? (
                      <Text style={styles.paymentMethodDetails}>
                        {method.phoneNumber || `****${method.lastFour}`}
                      </Text>
                    ) : (
                      <Text style={styles.paymentMethodDetails}>
                        Account ending in {method.lastFour}
                      </Text>
                    )}
                  </View>
                  
                  {selectedPaymentMethod?.id === method.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Add New Payment Method */}
              <TouchableOpacity
                style={styles.addPaymentMethod}
                onPress={() => router.push('/payment-methods/add')}
              >
                <View style={styles.addPaymentIcon}>
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                </View>
                <Text style={styles.addPaymentText}>Add New Payment Method</Text>
              </TouchableOpacity>

              {/* Terms and Conditions */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By proceeding, you agree to our Terms of Service and Privacy Policy.
                  Payments are processed securely through Ethiopian payment gateways.
                </Text>
              </View>

              {/* Pay Now Button */}
              <TouchableOpacity
                style={[
                  styles.confirmPayButton,
                  (!selectedPaymentMethod || processingPayment) && styles.confirmPayButtonDisabled,
                ]}
                onPress={handlePayment}
                disabled={!selectedPaymentMethod || processingPayment}
              >
                {processingPayment ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.confirmPayText}>Pay Now</Text>
                    <Text style={styles.confirmPayAmount}>
                      {formatCurrency(selectedPackage?.price || 0)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </BottomSheetScrollView>
          </BottomSheet>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  imageScroll: {
    height: 300,
  },
  constructionImage: {
    width: width,
    height: 300,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  location: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#3C3C43',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 40,
  },
  milestones: {
    marginTop: 8,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  milestoneDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  milestoneCompleted: {
    backgroundColor: '#34C759',
  },
  milestoneName: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  milestoneDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  packageCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  popularPackage: {
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  packageDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#3C3C43',
    marginLeft: 8,
  },
  paymentButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  paymentInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  payButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 160,
  },
  payButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSheetBackground: {
    backgroundColor: '#F2F2F7',
  },
  bottomSheetIndicator: {
    backgroundColor: '#C7C7CC',
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    padding: 16,
  },
  bottomSheetTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 24,
    textAlign: 'center',
  },
  packageSummary: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  packageSummaryTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  packageSummaryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  packageSummaryPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  paymentMethodsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  paymentMethodCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  paymentMethodIcon: {
    marginRight: 16,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  paymentMethodDetails: {
    fontSize: 15,
    color: '#8E8E93',
  },
  addPaymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addPaymentIcon: {
    marginRight: 16,
  },
  addPaymentText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  termsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  termsText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    textAlign: 'center',
  },
  confirmPayButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
  },
  confirmPayButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  confirmPayText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  confirmPayAmount: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
});