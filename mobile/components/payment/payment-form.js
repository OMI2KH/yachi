// components/payment/payment-form.js

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { analyticsService } from '../../services/analytics-service';

const SCREEN = Dimensions.get('window');

const PAYMENT_CONFIG = {
  GATEWAYS: {
    CHAPA: {
      id: 'chapa',
      name: 'Chapa',
      description: 'Secure Ethiopian payments',
      icon: 'card',
      color: '#6366F1',
      supportedMethods: ['mobile_banking', 'bank_transfer', 'card_payment', 'ussd'],
      feePercentage: 0.015
    },
    TELEBIRR: {
      id: 'telebirr',
      name: 'Telebirr',
      description: 'Mobile money payment',
      icon: 'phone-portrait',
      color: '#3B82F6',
      supportedMethods: ['mobile_money'],
      feePercentage: 0.01
    },
    CBE_BIRR: {
      id: 'cbe_birr',
      name: 'CBE Birr',
      description: 'Bank mobile payment',
      icon: 'business',
      color: '#F59E0B',
      supportedMethods: ['mobile_banking'],
      feePercentage: 0.012
    }
  },
  PRODUCT_TYPES: {
    PREMIUM_BADGE: {
      id: 'premium_badge',
      name: 'Premium Badge',
      description: 'Enhanced visibility and verified status',
      basePrice: 200,
      duration: '30 days',
      features: [
        'Priority in search results',
        'Featured profile placement',
        'Verified status badge',
        'Enhanced visibility'
      ]
    },
    PREMIUM_LISTING: {
      id: 'premium_listing',
      name: 'Premium Listing',
      description: 'Top placement for your services',
      basePrice: 399,
      duration: '30 days',
      features: [
        'Top placement in search results',
        'Category page featuring',
        'Highlighted listings',
        '30-day visibility boost'
      ]
    }
  },
  CURRENCY: 'ETB',
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 50000
};

const PaymentForm = ({
  productType = 'premium_badge',
  onPaymentSuccess,
  onPaymentCancel,
  isVisible = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  const { user } = useStore();
  
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Memoized product data
  const productData = useMemo(() => {
    return PAYMENT_CONFIG.PRODUCT_TYPES[productType.toUpperCase()] || 
           PAYMENT_CONFIG.PRODUCT_TYPES.PREMIUM_BADGE;
  }, [productType]);

  // Memoized total amount calculation
  const paymentDetails = useMemo(() => {
    if (!selectedGateway) return null;
    
    const gatewayConfig = PAYMENT_CONFIG.GATEWAYS[selectedGateway];
    const fee = productData.basePrice * gatewayConfig.feePercentage;
    
    return {
      productAmount: productData.basePrice,
      transactionFee: fee,
      totalAmount: productData.basePrice + fee,
      currency: PAYMENT_CONFIG.CURRENCY
    };
  }, [selectedGateway, productData]);

  // Animation handlers
  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN.height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onPaymentCancel?.();
    });
  }, []);

  React.useEffect(() => {
    if (isVisible) {
      setCurrentStep(1);
      setSelectedGateway(null);
      setCustomerInfo({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phoneNumber: user?.phone || ''
      });
      setPaymentError('');
      animateIn();
      
      analyticsService.trackEvent('payment_form_opened', {
        productType,
        userId: user?.id
      });
    }
  }, [isVisible, user]);

  const handleInputChange = (field, value) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep1 = () => {
    const { firstName, lastName, email, phoneNumber } = customerInfo;
    
    if (!firstName.trim() || !lastName.trim()) {
      return 'Please enter your full name';
    }
    
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return 'Please enter a valid email address';
    }
    
    if (!phoneNumber.trim() || !/^(09)[0-9]{8}$/.test(phoneNumber)) {
      return 'Please enter a valid Ethiopian phone number (09XXXXXXXX)';
    }
    
    return null;
  };

  const handleStep1Continue = () => {
    const validationError = validateStep1();
    if (validationError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Information Required', validationError);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(2);
    
    analyticsService.trackEvent('payment_info_completed', {
      productType,
      userId: user?.id
    });
  };

  const handleGatewaySelection = (gatewayId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGateway(gatewayId);
    
    analyticsService.trackEvent('payment_gateway_selected', {
      gateway: gatewayId,
      productType,
      userId: user?.id
    });
  };

  const handleStep2Continue = () => {
    if (!selectedGateway) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Selection Required', 'Please select a payment method');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(3);
  };

  const processPayment = async () => {
    setIsProcessing(true);
    setPaymentError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const paymentResult = await simulatePaymentProcessing();
      
      if (paymentResult.success) {
        await handlePaymentCompletion(paymentResult.transactionData);
      } else {
        throw new Error(paymentResult.error || 'Payment processing failed');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPaymentError(error.message);
      
      analyticsService.trackEvent('payment_processing_failed', {
        gateway: selectedGateway,
        productType,
        error: error.message,
        userId: user?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const simulatePaymentProcessing = async () => {
    // Simulate API call to process payment
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1; // 90% success rate
        
        if (isSuccess) {
          resolve({
            success: true,
            transactionData: {
              id: `${selectedGateway.toUpperCase()}_${Date.now()}`,
              amount: paymentDetails.totalAmount,
              gateway: selectedGateway,
              customerInfo,
              timestamp: new Date().toISOString()
            }
          });
        } else {
          resolve({
            success: false,
            error: 'Payment processing failed. Please try again.'
          });
        }
      }, 3000);
    });
  };

  const handlePaymentCompletion = async (transactionData) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    analyticsService.trackEvent('payment_completed_successfully', {
      transactionId: transactionData.id,
      gateway: selectedGateway,
      amount: transactionData.amount,
      productType,
      userId: user?.id
    });

    // Simulate activating premium feature
    await activatePremiumFeature(transactionData);

    setCurrentStep(4);
  };

  const activatePremiumFeature = async (transactionData) => {
    // This would call your backend API to activate the premium feature
    console.log('Activating premium feature:', {
      transactionData,
      productType,
      userId: user?.id
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleFinalCompletion = () => {
    onPaymentSuccess?.({
      productType,
      transactionId: `${selectedGateway.toUpperCase()}_${Date.now()}`,
      amount: paymentDetails.totalAmount
    });
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            step === currentStep && styles.stepCircleActive,
            step < currentStep && styles.stepCircleCompleted
          ]}>
            {step < currentStep ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.stepNumber,
                step === currentStep && styles.stepNumberActive
              ]}>
                {step}
              </Text>
            )}
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              step < currentStep && styles.stepLineCompleted
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderProductSummary = () => (
    <View style={styles.productSummary}>
      <LinearGradient
        colors={['#F0FDF4', '#ECFDF5']}
        style={styles.summaryGradient}
      >
        <View style={styles.productHeader}>
          <Ionicons name="star" size={24} color="#059669" />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{productData.name}</Text>
            <Text style={styles.productDescription}>{productData.description}</Text>
          </View>
        </View>
        
        <View style={styles.durationBadge}>
          <Ionicons name="calendar" size={14} color="#059669" />
          <Text style={styles.durationText}>{productData.duration}</Text>
        </View>

        <View style={styles.featuresList}>
          {productData.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>{productData.basePrice} ETB</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Information</Text>
      <Text style={styles.stepDescription}>
        Please provide your details to complete the purchase
      </Text>

      <View style={styles.formSection}>
        <View style={styles.nameRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="John"
              value={customerInfo.firstName}
              onChangeText={(value) => handleInputChange('firstName', value)}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Doe"
              value={customerInfo.lastName}
              onChangeText={(value) => handleInputChange('lastName', value)}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="john@example.com"
              value={customerInfo.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="0912345678"
              value={customerInfo.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, isProcessing && styles.continueButtonDisabled]}
        onPress={handleStep1Continue}
        disabled={isProcessing}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.continueButtonGradient}
        >
          <Text style={styles.continueButtonText}>Continue to Payment</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Payment Method</Text>
      <Text style={styles.stepDescription}>
        Choose your preferred payment gateway
      </Text>

      <View style={styles.gatewaysSection}>
        {Object.values(PAYMENT_CONFIG.GATEWAYS).map((gateway) => (
          <TouchableOpacity
            key={gateway.id}
            style={[
              styles.gatewayOption,
              selectedGateway === gateway.id && styles.gatewayOptionSelected
            ]}
            onPress={() => handleGatewaySelection(gateway.id)}
          >
            <View style={styles.gatewayHeader}>
              <View style={[styles.gatewayIcon, { backgroundColor: gateway.color + '20' }]}>
                <Ionicons name={gateway.icon} size={24} color={gateway.color} />
              </View>
              
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radioOuter,
                  selectedGateway === gateway.id && styles.radioOuterSelected
                ]}>
                  {selectedGateway === gateway.id && <View style={styles.radioInner} />}
                </View>
              </View>
            </View>

            <Text style={styles.gatewayName}>{gateway.name}</Text>
            <Text style={styles.gatewayDescription}>{gateway.description}</Text>
            
            <View style={styles.feeBadge}>
              <Text style={styles.feeText}>
                Fee: {(gateway.feePercentage * 100).toFixed(1)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(1)}
          disabled={isProcessing}
        >
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, !selectedGateway && styles.continueButtonDisabled]}
          onPress={handleStep2Continue}
          disabled={!selectedGateway || isProcessing}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>Review Payment</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Pay</Text>
      <Text style={styles.stepDescription}>
        Confirm your payment details before proceeding
      </Text>

      <View style={styles.paymentSummary}>
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Product</Text>
            <Text style={styles.summaryValue}>{productData.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{productData.duration}</Text>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Payment Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gateway</Text>
            <Text style={styles.summaryValue}>
              {PAYMENT_CONFIG.GATEWAYS[selectedGateway]?.name}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Product Amount</Text>
            <Text style={styles.summaryValue}>{paymentDetails.productAmount} ETB</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Transaction Fee</Text>
            <Text style={styles.summaryValue}>{paymentDetails.transactionFee.toFixed(2)} ETB</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{paymentDetails.totalAmount.toFixed(2)} ETB</Text>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Customer Information</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Name</Text>
            <Text style={styles.summaryValue}>{customerInfo.firstName} {customerInfo.lastName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Email</Text>
            <Text style={styles.summaryValue}>{customerInfo.email}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phone</Text>
            <Text style={styles.summaryValue}>{customerInfo.phoneNumber}</Text>
          </View>
        </View>
      </View>

      {paymentError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={20} color="#DC2626" />
          <Text style={styles.errorText}>{paymentError}</Text>
        </View>
      ) : null}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(2)}
          disabled={isProcessing}
        >
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={processPayment}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.payButtonGradient}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.payButtonText}>
              {isProcessing ? 'Processing...' : `Pay ${paymentDetails.totalAmount.toFixed(2)} ETB`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.successContainer}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.successIcon}
        >
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </LinearGradient>
        
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successDescription}>
          Your {productData.name} has been activated successfully.
        </Text>

        <View style={styles.successDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{selectedGateway.toUpperCase()}_{Date.now()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Paid</Text>
            <Text style={styles.detailValue}>{paymentDetails.totalAmount.toFixed(2)} ETB</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>
              {PAYMENT_CONFIG.GATEWAYS[selectedGateway]?.name}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleFinalCompletion}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.doneButtonGradient}
          >
            <Text style={styles.doneButtonText}>Continue to App</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={80} style={StyleSheet.absoluteFill} />
      
      <Animated.View 
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="card" size={24} color="#10B981" />
            <Text style={styles.headerTitle}>Purchase {productData.name}</Text>
          </View>
          {currentStep !== 4 && (
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={animateOut}
              disabled={isProcessing}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {renderStepIndicator()}
        {renderProductSummary()}

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>

        {/* Security Footer */}
        <View style={styles.securityFooter}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.securityText}>Secure Payment • Encrypted • PCI Compliant</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 0,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#10B981',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  productSummary: {
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
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
    marginBottom: 12,
  },
  durationText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
  },
  featuresList: {
    gap: 6,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  gatewaysSection: {
    gap: 12,
    marginBottom: 24,
  },
  gatewayOption: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gatewayOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  gatewayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gatewayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioContainer: {
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
  gatewayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  gatewayDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  feeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  feeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  payButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  paymentSummary: {
    gap: 16,
    marginBottom: 24,
  },
  summarySection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 8,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successDetails: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  doneButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  doneButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  securityText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
});

export default PaymentForm;
export { PAYMENT_CONFIG };