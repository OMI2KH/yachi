// components/payment/premium-payment-selector.js

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../../store/useStore';
import { useNavigation } from '@react-navigation/native';

const SCREEN = Dimensions.get('window');

const PremiumPaymentSelector = ({ 
  productType, // 'badge' or 'listing'
  productPrice,
  productName,
  productDescription,
  onPaymentSuccess 
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const navigation = useNavigation();
  const { user } = useStore();
  
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(50)).current;

  const PAYMENT_METHODS = {
    CHAPA: {
      id: 'chapa',
      label: 'Chapa',
      description: 'Secure Ethiopian payments',
      icon: 'card',
      color: '#10B981',
      isAvailable: true
    },
    TELEBIRR: {
      id: 'telebirr',
      label: 'Telebirr',
      description: 'Mobile money payment',
      icon: 'phone-portrait',
      color: '#3B82F6',
      isAvailable: true
    },
    CBE_BIRR: {
      id: 'cbe_birr',
      label: 'CBE Birr',
      description: 'Bank mobile payment',
      icon: 'business',
      color: '#F59E0B',
      isAvailable: true
    }
  };

  const PREMIUM_PRODUCTS = {
    BADGE: {
      name: 'Premium Badge',
      description: 'Enhanced visibility and verified status',
      duration: '30 days',
      features: [
        'Priority in search results',
        'Featured profile placement',
        'Verified status badge',
        'Enhanced visibility'
      ]
    },
    LISTING: {
      name: 'Premium Listing',
      description: 'Top placement for your services',
      duration: '30 days',
      features: [
        'Top placement in search results',
        'Category page featuring',
        'Highlighted listings',
        '30-day visibility boost'
      ]
    }
  };

  const initiateEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  };

  const PaymentOptionCard = ({ paymentMethod, isSelected, onSelect }) => (
    <Animated.View
      style={[
        styles.paymentOptionCard,
        isSelected && styles.selectedPaymentOption,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.paymentOptionContent}
        onPress={() => paymentMethod.isAvailable && onSelect(paymentMethod.id)}
        disabled={!paymentMethod.isAvailable}
      >
        <View style={styles.paymentOptionHeader}>
          <View style={[styles.paymentIcon, { backgroundColor: paymentMethod.color + '20' }]}>
            <Ionicons name={paymentMethod.icon} size={24} color={paymentMethod.color} />
          </View>
          
          <View style={styles.selectionIndicator}>
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </View>
        </View>

        <Text style={styles.paymentLabel}>{paymentMethod.label}</Text>
        <Text style={styles.paymentDescription}>{paymentMethod.description}</Text>
        
        {!paymentMethod.isAvailable && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Temporarily Unavailable</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const FeatureListItem = ({ feature }) => (
    <View style={styles.featureItem}>
      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
      <Text style={styles.featureText}>{feature}</Text>
    </View>
  );

  const processPremiumPurchase = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Selection Required', 'Please choose a payment method');
      return;
    }

    if ((selectedPaymentMethod === 'telebirr' || selectedPaymentMethod === 'cbe_birr') && !phoneNumber) {
      Alert.alert('Information Needed', 'Please enter your phone number');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentResult = await handlePaymentProcessing();
      
      if (paymentResult.success) {
        await completePremiumActivation(paymentResult.transactionData);
      } else {
        throw new Error(paymentResult.errorMessage || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Premium purchase error:', error);
      Alert.alert('Purchase Failed', error.message || 'Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentProcessing = async () => {
    try {
      const requestData = {
        productType,
        amount: productPrice,
        currency: 'ETB',
        paymentMethod: selectedPaymentMethod,
        userIdentifier: user?.id,
        userPhone: phoneNumber,
        productDetails: {
          name: productName,
          description: productDescription
        }
      };

      // Simulate API call - replace with actual payment gateway integration
      const response = await simulatePaymentGateway(requestData);
      
      return { 
        success: true, 
        transactionData: {
          id: response.transactionId,
          amount: productPrice,
          method: selectedPaymentMethod
        }
      };
    } catch (error) {
      return { 
        success: false, 
        errorMessage: error.message 
      };
    }
  };

  const simulatePaymentGateway = async (paymentData) => {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate successful payment
    return {
      transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9),
      status: 'completed',
      amount: paymentData.amount,
      currency: paymentData.currency
    };
  };

  const completePremiumActivation = async (transactionData) => {
    try {
      // Simulate API call to activate premium features
      await simulatePremiumActivation(transactionData);

      Alert.alert(
        'Premium Activated! 🎉',
        `Your ${productName} has been successfully activated.`,
        [
          { 
            text: 'View Profile', 
            onPress: () => navigation.navigate('Profile')
          },
          { 
            text: 'Continue', 
            onPress: onPaymentSuccess 
          }
        ]
      );
    } catch (error) {
      console.error('Premium activation error:', error);
      // Even if activation fails, payment was successful
      Alert.alert(
        'Payment Processed',
        'Your payment was successful. Please contact support if premium features are not activated.',
        [{ text: 'OK', onPress: onPaymentSuccess }]
      );
    }
  };

  const simulatePremiumActivation = async (transactionData) => {
    // Simulate API call to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app, this would update user's premium status in backend
    console.log('Premium activation completed for:', transactionData);
  };

  const currentProduct = PREMIUM_PRODUCTS[productType?.toUpperCase()] || PREMIUM_PRODUCTS.BADGE;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }]
        }
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Summary */}
        <View style={styles.productSummary}>
          <LinearGradient
            colors={['#F0FDF4', '#ECFDF5']}
            style={styles.summaryGradient}
          >
            <View style={styles.productHeader}>
              <Ionicons name="star" size={24} color="#059669" />
              <Text style={styles.productName}>{currentProduct.name}</Text>
            </View>
            
            <Text style={styles.productDescription}>{currentProduct.description}</Text>
            
            <View style={styles.durationBadge}>
              <Ionicons name="calendar" size={14} color="#059669" />
              <Text style={styles.durationText}>{currentProduct.duration}</Text>
            </View>

            <View style={styles.featuresList}>
              {currentProduct.features.map((feature, index) => (
                <FeatureListItem key={index} feature={feature} />
              ))}
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Total Amount</Text>
              <Text style={styles.priceValue}>{productPrice} ETB</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Payment Method</Text>
          <View style={styles.paymentOptions}>
            {Object.values(PAYMENT_METHODS).map((method) => (
              <PaymentOptionCard
                key={method.id}
                paymentMethod={method}
                isSelected={selectedPaymentMethod === method.id}
                onSelect={setSelectedPaymentMethod}
              />
            ))}
          </View>
        </View>

        {/* Phone Input for Mobile Payments */}
        {(selectedPaymentMethod === 'telebirr' || selectedPaymentMethod === 'cbe_birr') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Enter {PAYMENT_METHODS[selectedPaymentMethod]?.label} Phone Number
            </Text>
            <View style={styles.phoneInputContainer}>
              <Ionicons name="call" size={20} color="#6B7280" />
              <TextInput
                style={styles.phoneInput}
                placeholder="09XXXXXXXX"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
                maxLength={10}
              />
            </View>
            <Text style={styles.instructionText}>
              You will receive a payment prompt on your phone
            </Text>
          </View>
        )}

        {/* Security Assurance */}
        <View style={styles.securitySection}>
          <View style={styles.securityFeatures}>
            <View style={styles.securityFeature}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.securityText}>Secure Payment</Text>
            </View>
            <View style={styles.securityFeature}>
              <Ionicons name="lock-closed" size={16} color="#10B981" />
              <Text style={styles.securityText}>Encrypted</Text>
            </View>
            <View style={styles.securityFeature}>
              <Ionicons name="refresh" size={16} color="#10B981" />
              <Text style={styles.securityText}>Instant Activation</Text>
            </View>
          </View>
        </View>

        {/* Purchase Button */}
        <TouchableOpacity 
          style={[styles.purchaseButton, isProcessing && styles.purchaseButtonDisabled]}
          onPress={processPremiumPurchase}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.purchaseButtonGradient}
          >
            {isProcessing ? (
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="star" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.purchaseButtonText}>
              {isProcessing ? 'Processing...' : `Purchase for ${productPrice} ETB`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Support Information */}
        <View style={styles.supportSection}>
          <Text style={styles.supportText}>
            Need help? Contact support@yachi.app
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  productSummary: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065F46',
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  durationText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
  },
  featuresList: {
    gap: 8,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginBottom: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  paymentOptions: {
    gap: 12,
  },
  paymentOptionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedPaymentOption: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  paymentOptionContent: {
    padding: 16,
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicator: {
    padding: 4,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#10B981',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  unavailableBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  unavailableText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  instructionText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  securitySection: {
    padding: 20,
  },
  securityFeatures: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  purchaseButton: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  supportSection: {
    padding: 20,
    alignItems: 'center',
  },
  supportText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default PremiumPaymentSelector;