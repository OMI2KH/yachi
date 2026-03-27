// components/payment/payment-modal.js

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

const PAYMENT_MODAL_CONFIG = {
  PRODUCT_TYPES: {
    PREMIUM_BADGE: {
      id: 'premium_badge',
      name: 'Premium Badge',
      description: 'Enhanced visibility and verified status',
      basePrice: 200,
      duration: '30 days',
      icon: 'verified',
      color: '#F59E0B',
      features: [
        'Priority in search results',
        'Featured profile placement',
        'Verified status badge',
        'Enhanced visibility',
        'Trust indicator for clients'
      ]
    },
    PREMIUM_LISTING: {
      id: 'premium_listing',
      name: 'Premium Listing',
      description: 'Top placement for your services',
      basePrice: 399,
      duration: '30 days',
      icon: 'trending-up',
      color: '#10B981',
      features: [
        'Top placement in search results',
        'Category page featuring',
        'Highlighted listings',
        '30-day visibility boost',
        'Increased client inquiries'
      ]
    }
  },
  PAYMENT_STEPS: {
    PRODUCT_SELECTION: 1,
    PAYMENT_METHOD: 2,
    PAYMENT_PROCESSING: 3,
    SUCCESS_CONFIRMATION: 4
  }
};

const PaymentModal = ({
  initialProductType = 'premium_badge',
  onPaymentSuccess,
  onPaymentCancel,
  isVisible = false,
  showProductSelection = true
}) => {
  const [currentStep, setCurrentStep] = useState(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PRODUCT_SELECTION);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionData, setTransactionData] = useState(null);
  
  const { user } = useStore();
  
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Initialize selected product
  React.useEffect(() => {
    const product = PAYMENT_MODAL_CONFIG.PRODUCT_TYPES[initialProductType.toUpperCase()] || 
                   PAYMENT_MODAL_CONFIG.PRODUCT_TYPES.PREMIUM_BADGE;
    setSelectedProduct(product);
    
    // Pre-fill user data
    if (user) {
      setCustomerInfo({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phone || ''
      });
    }
  }, [initialProductType, user]);

  // Progress animation based on current step
  React.useEffect(() => {
    const progressValue = (currentStep - 1) / (Object.keys(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS).length - 1);
    Animated.timing(progressAnim, {
      toValue: progressValue,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Animation handlers
  const animateIn = useCallback(() => {
    setCurrentStep(showProductSelection ? 
      PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PRODUCT_SELECTION : 
      PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_METHOD
    );
    
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
    
    analyticsService.trackEvent('payment_modal_opened', {
      productType: initialProductType,
      userId: user?.id
    });
  }, [showProductSelection, initialProductType, user]);

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
      animateIn();
    }
  }, [isVisible]);

  const handleProductSelect = (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProduct(product);
    
    analyticsService.trackEvent('payment_product_selected', {
      productId: product.id,
      productName: product.name,
      userId: user?.id
    });
  };

  const handleContinueToPayment = () => {
    if (!selectedProduct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Selection Required', 'Please select a product to continue.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_METHOD);
  };

  const handleGatewaySelect = (gateway) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGateway(gateway);
  };

  const handlePaymentProcess = async () => {
    if (!selectedGateway) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Selection Required', 'Please select a payment method.');
      return;
    }

    // Validate customer info
    const validationError = validateCustomerInfo();
    if (validationError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Information Required', validationError);
      return;
    }

    setIsProcessing(true);
    setCurrentStep(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_PROCESSING);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await processPayment();
      
      if (result.success) {
        setTransactionData(result.transactionData);
        setCurrentStep(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.SUCCESS_CONFIRMATION);
        
        analyticsService.trackEvent('payment_completed_successfully', {
          productId: selectedProduct.id,
          gateway: selectedGateway.id,
          amount: selectedProduct.basePrice,
          userId: user?.id
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Payment Failed', error.message);
      setCurrentStep(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_METHOD);
    } finally {
      setIsProcessing(false);
    }
  };

  const validateCustomerInfo = () => {
    const { firstName, lastName, email, phoneNumber } = customerInfo;
    
    if (!firstName.trim() || !lastName.trim()) {
      return 'Please enter your full name.';
    }
    
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return 'Please enter a valid email address.';
    }
    
    if (!phoneNumber.trim() || !/^(09)[0-9]{8}$/.test(phoneNumber)) {
      return 'Please enter a valid Ethiopian phone number (09XXXXXXXX).';
    }
    
    return null;
  };

  const processPayment = async () => {
    // Simulate payment processing
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1; // 90% success rate
        
        if (isSuccess) {
          resolve({
            success: true,
            transactionData: {
              id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              product: selectedProduct,
              gateway: selectedGateway,
              customer: customerInfo,
              amount: selectedProduct.basePrice,
              currency: 'ETB',
              timestamp: new Date().toISOString(),
              status: 'completed'
            }
          });
        } else {
          resolve({
            success: false,
            error: 'Payment processing failed. Please try again or use a different payment method.'
          });
        }
      }, 3000);
    });
  };

  const handleSuccessContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPaymentSuccess?.(transactionData);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep === PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_METHOD && showProductSelection) {
      setCurrentStep(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PRODUCT_SELECTION);
    } else if (currentStep === PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_PROCESSING) {
      setCurrentStep(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_METHOD);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressSection}>
      <View style={styles.progressBar}>
        <Animated.View 
          style={[
            styles.progressFill,
            { width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })}
          ]} 
        />
      </View>
      <View style={styles.stepIndicators}>
        {Object.values(PAYMENT_MODAL_CONFIG.PAYMENT_STEPS).map((step) => (
          <View key={step} style={styles.stepIndicator}>
            <View style={[
              styles.stepDot,
              step <= currentStep && styles.stepDotActive
            ]}>
              {step < currentStep && (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              step <= currentStep && styles.stepLabelActive
            ]}>
              {getStepLabel(step)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const getStepLabel = (step) => {
    switch (step) {
      case PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PRODUCT_SELECTION:
        return 'Product';
      case PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_METHOD:
        return 'Payment';
      case PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_PROCESSING:
        return 'Processing';
      case PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.SUCCESS_CONFIRMATION:
        return 'Complete';
      default:
        return '';
    }
  };

  const renderProductSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose Premium Feature</Text>
      <Text style={styles.stepDescription}>
        Select the premium feature you want to activate
      </Text>

      <View style={styles.productsGrid}>
        {Object.values(PAYMENT_MODAL_CONFIG.PRODUCT_TYPES).map((product) => (
          <TouchableOpacity
            key={product.id}
            style={[
              styles.productCard,
              selectedProduct?.id === product.id && styles.productCardSelected
            ]}
            onPress={() => handleProductSelect(product)}
          >
            <LinearGradient
              colors={[product.color + '20', product.color + '10']}
              style={styles.productHeader}
            >
              <View style={[styles.productIcon, { backgroundColor: product.color }]}>
                <MaterialIcons name={product.icon} size={24} color="#FFFFFF" />
              </View>
              
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDescription}>{product.description}</Text>
              </View>

              <View style={styles.productPrice}>
                <Text style={styles.priceValue}>{product.basePrice}</Text>
                <Text style={styles.priceCurrency}>ETB</Text>
              </View>
            </LinearGradient>

            <View style={styles.productFeatures}>
              {product.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={styles.productFooter}>
              <Text style={styles.durationText}>{product.duration}</Text>
              {selectedProduct?.id === product.id && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.continueButton, !selectedProduct && styles.continueButtonDisabled]}
        onPress={handleContinueToPayment}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.continueButtonGradient}
        >
          <Text style={styles.continueButtonText}>
            Continue to Payment
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentMethod = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment Details</Text>
      <Text style={styles.stepDescription}>
        Choose your preferred payment method and enter your information
      </Text>

      {/* Customer Information Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Your Information</Text>
        
        <View style={styles.nameRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="John"
              value={customerInfo.firstName}
              onChangeText={(value) => setCustomerInfo(prev => ({ ...prev, firstName: value }))}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Doe"
              value={customerInfo.lastName}
              onChangeText={(value) => setCustomerInfo(prev => ({ ...prev, lastName: value }))}
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
              onChangeText={(value) => setCustomerInfo(prev => ({ ...prev, email: value }))}
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
              onChangeText={(value) => setCustomerInfo(prev => ({ ...prev, phoneNumber: value }))}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
      </View>

      {/* Payment Method Selection */}
      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentMethods}>
          {/* Chapa */}
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedGateway?.id === 'chapa' && styles.paymentMethodSelected
            ]}
            onPress={() => handleGatewaySelect({
              id: 'chapa',
              name: 'Chapa',
              description: 'Secure Ethiopian payments',
              icon: 'card',
              color: '#6366F1'
            })}
          >
            <View style={styles.methodHeader}>
              <View style={[styles.methodIcon, { backgroundColor: '#6366F120' }]}>
                <Ionicons name="card" size={24} color="#6366F1" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Chapa</Text>
                <Text style={styles.methodDescription}>Multiple payment options</Text>
              </View>
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radioOuter,
                  selectedGateway?.id === 'chapa' && styles.radioOuterSelected
                ]}>
                  {selectedGateway?.id === 'chapa' && <View style={styles.radioInner} />}
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Telebirr */}
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedGateway?.id === 'telebirr' && styles.paymentMethodSelected
            ]}
            onPress={() => handleGatewaySelect({
              id: 'telebirr',
              name: 'Telebirr',
              description: 'Mobile money payment',
              icon: 'phone-portrait',
              color: '#3B82F6'
            })}
          >
            <View style={styles.methodHeader}>
              <View style={[styles.methodIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="phone-portrait" size={24} color="#3B82F6" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Telebirr</Text>
                <Text style={styles.methodDescription}>Direct mobile money</Text>
              </View>
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radioOuter,
                  selectedGateway?.id === 'telebirr' && styles.radioOuterSelected
                ]}>
                  {selectedGateway?.id === 'telebirr' && <View style={styles.radioInner} />}
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* CBE Birr */}
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedGateway?.id === 'cbe_birr' && styles.paymentMethodSelected
            ]}
            onPress={() => handleGatewaySelect({
              id: 'cbe_birr',
              name: 'CBE Birr',
              description: 'Bank mobile payment',
              icon: 'business',
              color: '#F59E0B'
            })}
          >
            <View style={styles.methodHeader}>
              <View style={[styles.methodIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="business" size={24} color="#F59E0B" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>CBE Birr</Text>
                <Text style={styles.methodDescription}>Bank integration</Text>
              </View>
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radioOuter,
                  selectedGateway?.id === 'cbe_birr' && styles.radioOuterSelected
                ]}>
                  {selectedGateway?.id === 'cbe_birr' && <View style={styles.radioInner} />}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionButtons}>
        {showProductSelection && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.payButton, (!selectedGateway || isProcessing) && styles.payButtonDisabled]}
          onPress={handlePaymentProcess}
          disabled={!selectedGateway || isProcessing}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.payButtonGradient}
          >
            <Text style={styles.payButtonText}>
              Pay {selectedProduct?.basePrice} ETB
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPaymentProcessing = () => (
    <View style={styles.stepContent}>
      <View style={styles.processingContainer}>
        <ActivityIndicator size={64} color="#10B981" />
        
        <Text style={styles.processingTitle}>Processing Payment</Text>
        <Text style={styles.processingDescription}>
          Please wait while we process your payment. This may take a few moments.
        </Text>

        <View style={styles.processingDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Product</Text>
            <Text style={styles.detailValue}>{selectedProduct?.name}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{selectedProduct?.basePrice} ETB</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Method</Text>
            <Text style={styles.detailValue}>{selectedGateway?.name}</Text>
          </View>
        </View>

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.securityText}>
            Your payment is secure and encrypted
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSuccessConfirmation = () => (
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
          Your {selectedProduct?.name} has been activated successfully.
        </Text>

        <View style={styles.successDetails}>
          <View style={styles.successDetailItem}>
            <Ionicons name="cube" size={20} color="#10B981" />
            <View style={styles.successDetailText}>
              <Text style={styles.successDetailLabel}>Product</Text>
              <Text style={styles.successDetailValue}>{selectedProduct?.name}</Text>
            </View>
          </View>
          
          <View style={styles.successDetailItem}>
            <Ionicons name="card" size={20} color="#10B981" />
            <View style={styles.successDetailText}>
              <Text style={styles.successDetailLabel}>Amount Paid</Text>
              <Text style={styles.successDetailValue}>{selectedProduct?.basePrice} ETB</Text>
            </View>
          </View>
          
          <View style={styles.successDetailItem}>
            <Ionicons name="time" size={20} color="#10B981" />
            <View style={styles.successDetailText}>
              <Text style={styles.successDetailLabel}>Activated Until</Text>
              <Text style={styles.successDetailValue}>
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleSuccessContinue}
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.headerTitle}>Upgrade to Premium</Text>
          </View>
          {currentStep !== PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.SUCCESS_CONFIRMATION && (
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={animateOut}
              disabled={isProcessing}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PRODUCT_SELECTION && renderProductSelection()}
          {currentStep === PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_METHOD && renderPaymentMethod()}
          {currentStep === PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.PAYMENT_PROCESSING && renderPaymentProcessing()}
          {currentStep === PAYMENT_MODAL_CONFIG.PAYMENT_STEPS.SUCCESS_CONFIRMATION && renderSuccessConfirmation()}
        </ScrollView>

        {/* Security Footer */}
        <View style={styles.securityFooter}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.securityText}>
            Secure Payment • Encrypted • Trusted by Thousands
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Add TextInput import and component
import { TextInput } from 'react-native';

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
  progressSection: {
    padding: 20,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: '#10B981',
  },
  stepLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#10B981',
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
  productsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  productCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065F46',
  },
  priceCurrency: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  productFeatures: {
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
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
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
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
  paymentSection: {
    marginBottom: 24,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
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
    padding: 16,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 8,
  },
  processingDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  processingDetails: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
  },
  detailItem: {
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
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
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
  successDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  successDetailText: {
    flex: 1,
  },
  successDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  successDetailValue: {
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

export default PaymentModal;
export { PAYMENT_MODAL_CONFIG };