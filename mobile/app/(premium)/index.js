import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.yourdomain.com';

const PremiumScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentType, setPaymentType] = useState('mobile_money'); // 'mobile_money' or 'bank_account'
  const [provider, setProvider] = useState('telebirr'); // 'telebirr', 'chapa', 'cbe_birr'
  const [mobileCarrier, setMobileCarrier] = useState('ethio_telecom');

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '49 ETB',
      period: 'per month',
      features: [
        'Unlimited access to all features',
        'Priority customer support',
        'No ads experience',
        'Daily analytics reports',
      ],
      popular: false,
    },
    {
      id: 'quarterly',
      name: 'Quarterly',
      price: '129 ETB',
      period: 'every 3 months',
      originalPrice: '147 ETB',
      discount: 'Save 12%',
      features: [
        'Everything in Monthly',
        'Advanced analytics',
        'Export functionality',
        'Custom themes',
      ],
      popular: true,
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '499 ETB',
      period: 'per year',
      originalPrice: '588 ETB',
      discount: 'Save 15%',
      features: [
        'Everything in Quarterly',
        'Dedicated support',
        'Early access to new features',
        'Backup & restore',
      ],
      popular: false,
    },
  ];

  // Carrier options for Ethiopian mobile money
  const carriers = [
    { id: 'ethio_telecom', name: 'Ethio Telecom', icon: 'mobile-alt' },
    { id: 'safaricom', name: 'Safaricom (M-Pesa)', icon: 'mobile' },
  ];

  // Payment providers
  const providers = [
    {
      id: 'telebirr',
      name: 'Telebirr',
      description: 'Ethio Telecom Mobile Money',
      icon: 'smartphone',
      color: '#1E40AF',
    },
    {
      id: 'chapa',
      name: 'Chapa',
      description: 'Payment Gateway',
      icon: 'credit-card',
      color: '#059669',
    },
    {
      id: 'cbe_birr',
      name: 'CBE Birr',
      description: 'Commercial Bank of Ethiopia',
      icon: 'university',
      color: '#DC2626',
    },
  ];

  useEffect(() => {
    loadUserData();
    fetchPaymentMethods();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsPremium(parsedUser.isPremium || false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/payment/methods`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
        const defaultMethod = data.paymentMethods?.find(method => method.isDefault);
        setDefaultPaymentMethod(defaultMethod);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handlePlanSelect = (plan) => {
    if (isPremium) {
      Alert.alert(
        'Already Premium',
        'You are already a premium user. Manage your subscription in settings.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedPlan(plan);
    
    // Check if user has saved payment methods
    if (paymentMethods.length > 0) {
      setShowPaymentModal(true);
    } else {
      setShowAddPaymentModal(true);
    }
  };

  const initiatePayment = async (useDefaultMethod = true) => {
    if (!selectedPlan) return;

    // Authenticate before payment
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to proceed with payment',
        fallbackLabel: 'Use passcode',
      });

      if (!result.success) {
        Alert.alert('Authentication failed', 'Please authenticate to complete payment.');
        return;
      }
    }

    setPaymentProcessing(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      // Get price amount (remove " ETB" and convert to number)
      const amount = parseInt(selectedPlan.price.split(' ')[0]);

      const paymentPayload = {
        planId: selectedPlan.id,
        amount: amount,
        currency: 'ETB',
        provider: useDefaultMethod ? defaultPaymentMethod?.provider : provider,
        paymentType: useDefaultMethod ? defaultPaymentMethod?.methodType : paymentType,
        phoneNumber: useDefaultMethod ? null : phoneNumber,
        metadata: useDefaultMethod ? null : {
          carrier: mobileCarrier,
          userId: user?.id,
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentPayload),
      });

      const data = await response.json();

      if (response.ok) {
        // Handle different payment providers
        if (data.paymentUrl) {
          // For Chapa or web-based flows
          Alert.alert(
            'Complete Payment',
            'You will be redirected to complete your payment.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => setPaymentProcessing(false),
              },
              {
                text: 'Continue',
                onPress: () => {
                  Linking.openURL(data.paymentUrl).catch(err => {
                    Alert.alert('Error', 'Could not open payment page');
                    setPaymentProcessing(false);
                  });
                },
              },
            ]
          );
        } else if (data.checkoutUrl) {
          // For Telebirr or similar
          router.push({
            pathname: '/payment-webview',
            params: { url: data.checkoutUrl, paymentId: data.paymentId },
          });
        } else if (data.success) {
          // Direct success (for testing or bank transfers)
          await handlePaymentSuccess();
        }
      } else {
        Alert.alert('Payment Failed', data.message || 'Could not initiate payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'An error occurred during payment');
    } finally {
      setPaymentProcessing(false);
      setShowPaymentModal(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Update user premium status
    try {
      const token = await AsyncStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/api/user/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Update local user data
      const updatedUser = { ...user, isPremium: true };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsPremium(true);

      Alert.alert(
        'Success! 🎉',
        'You are now a premium member! Enjoy all premium features.',
        [{ text: 'OK', onPress: () => router.push('/(tabs)/home') }]
      );
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const renderPlanCard = (plan) => (
    <TouchableOpacity
      key={plan.id}
      style={[
        styles.planCard,
        plan.popular && styles.popularPlanCard,
        selectedPlan?.id === plan.id && styles.selectedPlanCard,
      ]}
      onPress={() => handlePlanSelect(plan)}
      disabled={paymentProcessing}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.period}>{plan.period}</Text>
        </View>
        
        {plan.originalPrice && (
          <View style={styles.discountContainer}>
            <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
            <Text style={styles.discountText}>{plan.discount}</Text>
          </View>
        )}
      </View>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.selectButton,
          selectedPlan?.id === plan.id && styles.selectedButton,
        ]}
        onPress={() => handlePlanSelect(plan)}
      >
        <Text style={[
          styles.selectButtonText,
          selectedPlan?.id === plan.id && styles.selectedButtonText,
        ]}>
          {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPaymentMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodCard,
        defaultPaymentMethod?.id === method.id && styles.defaultPaymentMethod,
      ]}
      onPress={() => setDefaultPaymentMethod(method)}
    >
      <View style={styles.paymentMethodIcon}>
        {method.methodType === 'card' && (
          <MaterialIcons name="credit-card" size={24} color="#4F46E5" />
        )}
        {method.methodType === 'mobile_money' && (
          <FontAwesome5 name="mobile-alt" size={24} color="#059669" />
        )}
        {method.methodType === 'bank_account' && (
          <FontAwesome5 name="university" size={24} color="#DC2626" />
        )}
      </View>
      
      <View style={styles.paymentMethodInfo}>
        <Text style={styles.paymentMethodProvider}>
          {method.provider.toUpperCase()}
        </Text>
        <Text style={styles.paymentMethodType}>
          {method.methodType === 'mobile_money' ? 'Mobile Money' : 
           method.methodType === 'bank_account' ? 'Bank Account' : 'Card'}
        </Text>
        {method.lastFour && (
          <Text style={styles.paymentMethodDetail}>**** {method.lastFour}</Text>
        )}
      </View>
      
      {defaultPaymentMethod?.id === method.id && (
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.premiumContainer}>
            <View style={styles.premiumBadge}>
              <Ionicons name="crown" size={60} color="#F59E0B" />
            </View>
            
            <Text style={styles.premiumTitle}>You're Premium! 🎉</Text>
            <Text style={styles.premiumSubtitle}>
              Thank you for subscribing. Enjoy all premium features.
            </Text>

            <View style={styles.premiumFeatures}>
              <View style={styles.featureCard}>
                <Ionicons name="infinite" size={32} color="#4F46E5" />
                <Text style={styles.featureCardTitle}>Unlimited Access</Text>
                <Text style={styles.featureCardText}>
                  Access all features without restrictions
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                <Text style={styles.featureCardTitle}>No Ads</Text>
                <Text style={styles.featureCardText}>
                  Clean, ad-free experience
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Ionicons name="headset" size={32} color="#F59E0B" />
                <Text style={styles.featureCardTitle}>Priority Support</Text>
                <Text style={styles.featureCardText}>
                  24/7 dedicated customer support
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Ionicons name="analytics" size={32} color="#EC4899" />
                <Text style={styles.featureCardTitle}>Advanced Analytics</Text>
                <Text style={styles.featureCardText}>
                  Detailed insights and reports
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push('/(settings)/subscription')}
            >
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Go Premium</Text>
          <Text style={styles.subtitle}>
            Unlock all features with our flexible plans
          </Text>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresPreview}>
          <View style={styles.featurePreviewItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.featurePreviewText}>Ad-free experience</Text>
          </View>
          <View style={styles.featurePreviewItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.featurePreviewText}>Advanced analytics</Text>
          </View>
          <View style={styles.featurePreviewItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.featurePreviewText}>Priority support</Text>
          </View>
          <View style={styles.featurePreviewItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.featurePreviewText}>Export functionality</Text>
          </View>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          {plans.map(renderPlanCard)}
        </View>

        {/* Payment Methods */}
        {paymentMethods.length > 0 && (
          <View style={styles.paymentMethodsContainer}>
            <Text style={styles.sectionTitle}>Your Payment Methods</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {paymentMethods.map(renderPaymentMethod)}
            </ScrollView>
          </View>
        )}

        {/* Ethiopian Payment Providers */}
        <View style={styles.providersContainer}>
          <Text style={styles.sectionTitle}>Available Payment Methods</Text>
          <View style={styles.providersGrid}>
            {providers.map((providerItem) => (
              <View key={providerItem.id} style={styles.providerCard}>
                <View
                  style={[
                    styles.providerIcon,
                    { backgroundColor: `${providerItem.color}20` },
                  ]}
                >
                  <FontAwesome5
                    name={providerItem.icon}
                    size={24}
                    color={providerItem.color}
                  />
                </View>
                <Text style={styles.providerName}>{providerItem.name}</Text>
                <Text style={styles.providerDescription}>
                  {providerItem.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqContainer}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              Can I cancel my subscription anytime?
            </Text>
            <Text style={styles.faqAnswer}>
              Yes, you can cancel your subscription anytime. Your premium features will be available until the end of your billing period.
            </Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              What payment methods do you accept?
            </Text>
            <Text style={styles.faqAnswer}>
              We accept Telebirr, Chapa, and CBE Birr. All transactions are secure and processed in Ethiopian Birr (ETB).
            </Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              Is there a free trial?
            </Text>
            <Text style={styles.faqAnswer}>
              We offer a 7-day free trial for all new users. No credit card required to start.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentSummary}>
              <Text style={styles.summaryTitle}>{selectedPlan?.name} Plan</Text>
              <Text style={styles.summaryPrice}>{selectedPlan?.price}</Text>
              <Text style={styles.summaryPeriod}>{selectedPlan?.period}</Text>
            </View>

            {defaultPaymentMethod ? (
              <View style={styles.selectedPaymentMethod}>
                <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                {renderPaymentMethod(defaultPaymentMethod)}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addPaymentButton}
                onPress={() => {
                  setShowPaymentModal(false);
                  setShowAddPaymentModal(true);
                }}
              >
                <Ionicons name="add-circle" size={24} color="#4F46E5" />
                <Text style={styles.addPaymentText}>Add Payment Method</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
                disabled={paymentProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => initiatePayment(true)}
                disabled={paymentProcessing}
              >
                {paymentProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Pay {selectedPlan?.price}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Payment Method Modal */}
      <Modal
        visible={showAddPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
              <TouchableOpacity onPress={() => setShowAddPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Payment Type Selection */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Payment Type</Text>
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      paymentType === 'mobile_money' && styles.typeButtonActive,
                    ]}
                    onPress={() => setPaymentType('mobile_money')}
                  >
                    <FontAwesome5
                      name="mobile-alt"
                      size={20}
                      color={paymentType === 'mobile_money' ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        paymentType === 'mobile_money' && styles.typeButtonTextActive,
                      ]}
                    >
                      Mobile Money
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      paymentType === 'bank_account' && styles.typeButtonActive,
                    ]}
                    onPress={() => setPaymentType('bank_account')}
                  >
                    <FontAwesome5
                      name="university"
                      size={20}
                      color={paymentType === 'bank_account' ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        paymentType === 'bank_account' && styles.typeButtonTextActive,
                      ]}
                    >
                      Bank Account
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Provider Selection */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Provider</Text>
                <View style={styles.providerButtons}>
                  {providers.map((providerItem) => (
                    <TouchableOpacity
                      key={providerItem.id}
                      style={[
                        styles.providerButton,
                        provider === providerItem.id && styles.providerButtonActive,
                      ]}
                      onPress={() => setProvider(providerItem.id)}
                    >
                      <FontAwesome5
                        name={providerItem.icon}
                        size={20}
                        color={provider === providerItem.id ? '#FFFFFF' : providerItem.color}
                      />
                      <Text
                        style={[
                          styles.providerButtonText,
                          provider === providerItem.id && styles.providerButtonTextActive,
                        ]}
                      >
                        {providerItem.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Phone Number Input for Mobile Money */}
              {paymentType === 'mobile_money' && (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09XX XXX XXX"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    maxLength={10}
                  />
                  
                  <Text style={styles.formLabel}>Mobile Carrier</Text>
                  <View style={styles.carrierButtons}>
                    {carriers.map((carrier) => (
                      <TouchableOpacity
                        key={carrier.id}
                        style={[
                          styles.carrierButton,
                          mobileCarrier === carrier.id && styles.carrierButtonActive,
                        ]}
                        onPress={() => setMobileCarrier(carrier.id)}
                      >
                        <FontAwesome5
                          name={carrier.icon}
                          size={20}
                          color={mobileCarrier === carrier.id ? '#FFFFFF' : '#6B7280'}
                        />
                        <Text
                          style={[
                            styles.carrierButtonText,
                            mobileCarrier === carrier.id && styles.carrierButtonTextActive,
                          ]}
                        >
                          {carrier.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Bank Account Details */}
              {paymentType === 'bank_account' && (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter account number"
                    keyboardType="number-pad"
                    secureTextEntry={true}
                  />
                  <Text style={styles.formLabel}>Bank Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter bank name"
                  />
                </View>
              )}

              {/* Security Notice */}
              <View style={styles.securityNotice}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={styles.securityText}>
                  Your payment information is secure and encrypted. We never store your full card details.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddPaymentModal(false)}
                disabled={paymentProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => initiatePayment(false)}
                disabled={paymentProcessing || (paymentType === 'mobile_money' && !phoneNumber)}
              >
                {paymentProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {selectedPlan ? `Pay ${selectedPlan.price}` : 'Add Payment Method'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  featuresPreview: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  featurePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featurePreviewText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  plansContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  popularPlanCard: {
    borderColor: '#4F46E5',
    position: 'relative',
  },
  selectedPlanCard: {
    borderColor: '#10B981',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  period: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#10B981',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  selectedButtonText: {
    color: '#FFFFFF',
  },
  paymentMethodsContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  defaultPaymentMethod: {
    borderColor: '#10B981',
    backgroundColor: '#F0F9FF',
  },
  paymentMethodIcon: {
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodProvider: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  paymentMethodType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentMethodDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  providersContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  providerCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  providerDescription: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  faqContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 40,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  paymentSummary: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  summaryPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  summaryPeriod: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  selectedPaymentMethod: {
    padding: 20,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    margin: 20,
  },
  addPaymentText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#4F46E5',
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  providerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  providerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  providerButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  providerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  providerButtonTextActive: {
    color: '#FFFFFF',
  },
  carrierButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  carrierButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  carrierButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  carrierButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  carrierButtonTextActive: {
    color: '#FFFFFF',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  premiumContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  premiumBadge: {
    marginBottom: 24,
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  premiumFeatures: {
    width: '100%',
    marginBottom: 40,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  featureCardText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  manageButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PremiumScreen;