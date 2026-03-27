// components/payment/chapa-payment.js

import React, { useState, useRef, useCallback } from 'react';
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
  Linking,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { analyticsService } from '../../services/analytics-service';

const SCREEN = Dimensions.get('window');

const CHAPA_CONFIG = {
  SUPPORTED_METHODS: {
    MOBILE_BANKING: 'mobile_banking',
    BANK_TRANSFER: 'bank_transfer',
    CARD_PAYMENT: 'card_payment',
    USSD: 'ussd'
  },
  SUPPORTED_BANKS: {
    CBE: 'Commercial Bank of Ethiopia',
    DASHEN: 'Dashen Bank',
    AWASH: 'Awash Bank',
    ABYSSINIA: 'Abyssinia Bank',
    BOA: 'Bank of Abyssinia',
    NIB: 'Nib International Bank'
  },
  TRANSACTION_TYPES: {
    PREMIUM_BADGE: 'premium_badge',
    PREMIUM_LISTING: 'premium_listing',
    SUBSCRIPTION: 'subscription'
  },
  CURRENCY: 'ETB',
  FEE_PERCENTAGE: 0.015, // 1.5% transaction fee
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 50000
};

const ChapaPayment = ({
  productType = CHAPA_CONFIG.TRANSACTION_TYPES.PREMIUM_BADGE,
  productAmount = 200,
  productName = 'Premium Badge',
  productDescription = '30-day premium visibility boost',
  onPaymentSuccess,
  onPaymentCancel,
  isVisible = false
}) => {
  const [paymentStep, setPaymentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(CHAPA_CONFIG.SUPPORTED_METHODS.MOBILE_BANKING);
  const [selectedBank, setSelectedBank] = useState(CHAPA_CONFIG.SUPPORTED_BANKS.CBE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  
  const { user } = useStore();
  
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate total amount with fees
  const calculateTotalAmount = useCallback(() => {
    const fee = productAmount * CHAPA_CONFIG.FEE_PERCENTAGE;
    return {
      productAmount,
      transactionFee: fee,
      totalAmount: productAmount + fee
    };
  }, [productAmount]);

  const amountDetails = calculateTotalAmount();

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
      setPaymentStep(1);
      setSelectedMethod(CHAPA_CONFIG.SUPPORTED_METHODS.MOBILE_BANKING);
      setSelectedBank(CHAPA_CONFIG.SUPPORTED_BANKS.CBE);
      setPhoneNumber('');
      setEmail('');
      setFirstName('');
      setLastName('');
      animateIn();
      
      // Pre-fill user data if available
      if (user) {
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setEmail(user.email || '');
        setPhoneNumber(user.phone || '');
      }
      
      analyticsService.trackEvent('chapa_payment_viewed', {
        productType,
        productAmount,
        userId: user?.id
      });
    }
  }, [isVisible, user]);

  const validateForm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      return 'Please enter your first and last name';
    }
    
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return 'Please enter a valid email address';
    }
    
    if (!phoneNumber.trim() || !/^(09)[0-9]{8}$/.test(phoneNumber)) {
      return 'Please enter a valid Ethiopian phone number';
    }
    
    return null;
  };

  const handleMethodSelection = (method) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMethod(method);
    
    analyticsService.trackEvent('chapa_payment_method_selected', {
      method,
      productType,
      userId: user?.id
    });
  };

  const handleContinueToPayment = () => {
    const validationError = validateForm();
    if (validationError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Information Required', validationError);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaymentStep(2);
  };

  const handlePaymentProcessing = async () => {
    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const paymentResult = await initiateChapaPayment();
      
      if (paymentResult.success && paymentResult.paymentUrl) {
        setPaymentUrl(paymentResult.paymentUrl);
        setPaymentStep(3);
        
        // Automatically open the payment URL
        setTimeout(() => {
          openPaymentUrl(paymentResult.paymentUrl);
        }, 1000);
      } else {
        throw new Error(paymentResult.error || 'Payment initiation failed');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Payment Failed', error.message);
      
      analyticsService.trackEvent('chapa_payment_failed', {
        error: error.message,
        productType,
        userId: user?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const initiateChapaPayment = async () => {
    // Simulate API call to your backend that integrates with Chapa
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful payment initiation
        const isSuccess = Math.random() > 0.1;
        
        if (isSuccess) {
          resolve({
            success: true,
            paymentUrl: `https://checkout.chapa.co/pay/${Math.random().toString(36).substr(2, 9)}`,
            transactionId: `CHAPA_${Date.now()}`,
            amount: amountDetails.totalAmount
          });
        } else {
          resolve({
            success: false,
            error: 'Unable to initiate payment. Please try again.'
          });
        }
      }, 2000);
    });
  };

  const openPaymentUrl = async (url) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        
        analyticsService.trackEvent('chapa_payment_redirected', {
          paymentUrl: url,
          productType,
          userId: user?.id
        });
      } else {
        Alert.alert(
          'Cannot Open Payment',
          'Please manually visit the payment link or try another payment method.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening payment URL:', error);
      Alert.alert('Error', 'Could not open payment page. Please try again.');
    }
  };

  const handlePaymentSuccess = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    analyticsService.trackEvent('chapa_payment_completed', {
      productType,
      amount: amountDetails.totalAmount,
      userId: user?.id
    });

    // Simulate activating premium feature
    activatePremiumFeature();
  };

  const activatePremiumFeature = async () => {
    // This would call your backend API to activate the premium feature
    console.log('Activating premium feature via Chapa:', {
      productType,
      amount: amountDetails.totalAmount,
      userId: user?.id
    });
    
    onPaymentSuccess?.();
  };

  const getMethodDescription = (method) => {
    switch (method) {
      case CHAPA_CONFIG.SUPPORTED_METHODS.MOBILE_BANKING:
        return 'Pay using your mobile banking app';
      case CHAPA_CONFIG.SUPPORTED_METHODS.BANK_TRANSFER:
        return 'Transfer from any Ethiopian bank';
      case CHAPA_CONFIG.SUPPORTED_METHODS.CARD_PAYMENT:
        return 'Pay with Visa or Mastercard';
      case CHAPA_CONFIG.SUPPORTED_METHODS.USSD:
        return 'Pay using USSD code';
      default:
        return '';
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case CHAPA_CONFIG.SUPPORTED_METHODS.MOBILE_BANKING:
        return 'phone-portrait';
      case CHAPA_CONFIG.SUPPORTED_METHODS.BANK_TRANSFER:
        return 'business';
      case CHAPA_CONFIG.SUPPORTED_METHODS.CARD_PAYMENT:
        return 'card';
      case CHAPA_CONFIG.SUPPORTED_METHODS.USSD:
        return 'keypad';
      default:
        return 'card';
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            step === paymentStep && styles.stepCircleActive,
            step < paymentStep && styles.stepCircleCompleted
          ]}>
            {step < paymentStep ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.stepNumber,
                step === paymentStep && styles.stepNumberActive
              ]}>
                {step}
              </Text>
            )}
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              step < paymentStep && styles.stepLineCompleted
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment Information</Text>
      <Text style={styles.stepDescription}>
        Enter your details to proceed with Chapa payment
      </Text>

      {/* Personal Information */}
      <View style={styles.formSection}>
        <View style={styles.nameRow}>
          <View style={styles.nameInput}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.nameInput}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
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
              value={email}
              onChangeText={setEmail}
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
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
      </View>

      {/* Payment Method Selection */}
      <View style={styles.methodSection}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <View style={styles.methodOptions}>
          {Object.values(CHAPA_CONFIG.SUPPORTED_METHODS).map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.methodOption,
                selectedMethod === method && styles.methodOptionSelected
              ]}
              onPress={() => handleMethodSelection(method)}
            >
              <View style={styles.methodHeader}>
                <View style={styles.methodIconContainer}>
                  <Ionicons 
                    name={getMethodIcon(method)} 
                    size={20} 
                    color={selectedMethod === method ? '#10B981' : '#6B7280'} 
                  />
                </View>
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radioOuter,
                    selectedMethod === method && styles.radioOuterSelected
                  ]}>
                    {selectedMethod === method && <View style={styles.radioInner} />}
                  </View>
                </View>
              </View>
              
              <Text style={[
                styles.methodLabel,
                selectedMethod === method && styles.methodLabelSelected
              ]}>
                {method.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={styles.methodDescription}>
                {getMethodDescription(method)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, isProcessing && styles.continueButtonDisabled]}
        onPress={handleContinueToPayment}
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
      <Text style={styles.stepTitle}>Confirm Payment</Text>
      <Text style={styles.stepDescription}>
        Review your payment details before proceeding
      </Text>

      {/* Payment Summary */}
      <View style={styles.paymentSummary}>
        <View style={styles.summaryHeader}>
          <Ionicons name="cube" size={24} color="#10B981" />
          <Text style={styles.summaryTitle}>{productName}</Text>
        </View>
        
        <View style={styles.summaryDetails}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Customer</Text>
            <Text style={styles.summaryValue}>{firstName} {lastName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Email</Text>
            <Text style={styles.summaryValue}>{email}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phone</Text>
            <Text style={styles.summaryValue}>{phoneNumber}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Method</Text>
            <Text style={styles.summaryValue}>
              {selectedMethod.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>{amountDetails.productAmount} ETB</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Transaction Fee</Text>
            <Text style={styles.summaryValue}>{amountDetails.transactionFee.toFixed(2)} ETB</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{amountDetails.totalAmount.toFixed(2)} ETB</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setPaymentStep(1)}
          disabled={isProcessing}
        >
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handlePaymentProcessing}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.payButtonGradient}
          >
            {isProcessing ? (
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.payButtonText}>
              {isProcessing ? 'Processing...' : `Pay ${amountDetails.totalAmount.toFixed(2)} ETB`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.redirectContainer}>
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.redirectIcon}
        >
          <Ionicons name="globe" size={48} color="#FFFFFF" />
        </LinearGradient>
        
        <Text style={styles.redirectTitle}>Redirecting to Chapa</Text>
        <Text style={styles.redirectDescription}>
          You are being redirected to Chapa's secure payment page to complete your transaction.
        </Text>

        <View style={styles.redirectDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.detailText}>Secure SSL Encrypted</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="card" size={20} color="#10B981" />
            <Text style={styles.detailText}>Multiple Payment Options</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time" size={20} color="#10B981" />
            <Text style={styles.detailText}>Instant Processing</Text>
          </View>
        </View>

        <View style={styles.redirectActions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => openPaymentUrl(paymentUrl)}
          >
            <Ionicons name="open" size={20} color="#6366F1" />
            <Text style={styles.retryButtonText}>Open Payment Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.successButton}
            onPress={handlePaymentSuccess}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.successButtonGradient}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.successButtonText}>I've Completed Payment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.redirectHelp}>
          If you are not redirected automatically, click "Open Payment Page" above.
        </Text>
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
            <Ionicons name="card" size={24} color="#6366F1" />
            <Text style={styles.headerTitle}>Chapa Payment</Text>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={animateOut}
            disabled={isProcessing}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {renderStepIndicator()}

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {paymentStep === 1 && renderStep1()}
          {paymentStep === 2 && renderStep2()}
          {paymentStep === 3 && renderStep3()}
        </ScrollView>

        {/* Security Footer */}
        <View style={styles.securityFooter}>
          <Ionicons name="shield-checkmark" size={16} color="#6366F1" />
          <Text style={styles.securityText}>Secured by Chapa</Text>
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
    backgroundColor: '#6366F1',
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
    width: 60,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
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
  nameInput: {
    flex: 1,
  },
  inputGroup: {
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
  methodSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  methodOptions: {
    gap: 12,
  },
  methodOption: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
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
  methodLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  methodLabelSelected: {
    color: '#10B981',
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
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
  paymentSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
  },
  summaryDetails: {
    padding: 16,
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
  redirectContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  redirectIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  redirectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3730A3',
    marginBottom: 8,
    textAlign: 'center',
  },
  redirectDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  redirectDetails: {
    gap: 12,
    marginBottom: 32,
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  redirectActions: {
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  successButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  redirectHelp: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
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
    color: '#6366F1',
    fontWeight: '500',
  },
});

export default ChapaPayment;
export { CHAPA_CONFIG };