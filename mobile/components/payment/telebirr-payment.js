// components/payment/telebirr-payment.js

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

const TELEBIRR_CONFIG = {
  OPERATORS: {
    ETHIO_TELECOM: {
      id: 'ethio_telecom',
      name: 'Ethio Telecom',
      code: '09',
      pattern: /^(09)[0-9]{8}$/,
      ussd: '*806*',
      color: '#078930' // Ethiopian green
    }
  },
  TRANSACTION_TYPES: {
    PREMIUM_BADGE: 'premium_badge',
    PREMIUM_LISTING: 'premium_listing',
    SUBSCRIPTION: 'subscription'
  },
  CURRENCY: 'ETB',
  FEE_PERCENTAGE: 0.01, // 1% transaction fee
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 50000,
  USSD_CODE: '*806*',
  CUSTOMER_SERVICE: '700'
};

const TelebirrPayment = ({
  productType = TELEBIRR_CONFIG.TRANSACTION_TYPES.PREMIUM_BADGE,
  productAmount = 200,
  productName = 'Premium Badge',
  productDescription = '30-day premium visibility boost',
  onPaymentSuccess,
  onPaymentCancel,
  isVisible = false
}) => {
  const [paymentStep, setPaymentStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const { user } = useStore();
  
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calculate total amount with fees
  const paymentDetails = useMemo(() => {
    const fee = productAmount * TELEBIRR_CONFIG.FEE_PERCENTAGE;
    return {
      productAmount,
      transactionFee: fee,
      totalAmount: productAmount + fee
    };
  }, [productAmount]);

  // Animation handlers
  const animateIn = useCallback(() => {
    setPaymentStep(1);
    setPhoneNumber(user?.phone || '');
    setPinCode('');
    setTransactionId('');
    setCountdown(0);
    
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

    analyticsService.trackEvent('telebirr_payment_viewed', {
      productType,
      productAmount,
      userId: user?.id
    });
  }, [productType, productAmount, user]);

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

  // Countdown timer for payment processing
  React.useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handlePaymentTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const validatePhoneNumber = (number) => {
    return TELEBIRR_CONFIG.OPERATORS.ETHIO_TELECOM.pattern.test(number);
  };

  const handlePhoneNumberSubmit = () => {
    if (!validatePhoneNumber(phoneNumber)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid Ethio Telecom phone number (09XXXXXXXX).',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaymentStep(2);
    
    analyticsService.trackEvent('telebirr_phone_entered', {
      phoneNumber: phoneNumber,
      productType,
      userId: user?.id
    });
  };

  const handlePaymentProcessing = async () => {
    if (pinCode.length !== 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid PIN', 'Please enter your 5-digit Telebirr PIN.');
      return;
    }

    setIsProcessing(true);
    setCountdown(120); // 2 minutes countdown
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const paymentResult = await processTelebirrPayment();
      
      if (paymentResult.success) {
        await handleSuccessfulPayment(paymentResult.transactionData);
      } else {
        throw new Error(paymentResult.error || 'Payment processing failed');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Payment Failed', error.message);
      setCountdown(0);
      
      analyticsService.trackEvent('telebirr_payment_failed', {
        error: error.message,
        phoneNumber,
        productType,
        userId: user?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processTelebirrPayment = async () => {
    // Simulate API call to Telebirr payment gateway
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful payment 85% of the time
        const isSuccess = Math.random() > 0.15;
        
        if (isSuccess) {
          resolve({
            success: true,
            transactionData: {
              id: `TELEBIRR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              amount: paymentDetails.totalAmount,
              phoneNumber,
              timestamp: new Date().toISOString(),
              ussdCode: `${TELEBIRR_CONFIG.USSD_CODE}${paymentDetails.totalAmount}*${phoneNumber.substring(2)}#`,
              status: 'completed'
            }
          });
        } else {
          resolve({
            success: false,
            error: 'Insufficient balance or network error. Please try again.'
          });
        }
      }, 3000);
    });
  };

  const handleSuccessfulPayment = async (transactionData) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTransactionId(transactionData.id);
    setCountdown(0);
    
    analyticsService.trackEvent('telebirr_payment_success', {
      transactionId: transactionData.id,
      amount: transactionData.amount,
      productType,
      userId: user?.id
    });

    // Simulate backend call to activate premium feature
    await activatePremiumFeature(transactionData);

    setPaymentStep(3);
  };

  const handlePaymentTimeout = () => {
    if (paymentStep === 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Payment Timeout',
        'The payment process has timed out. Please try again.',
        [{ text: 'OK' }]
      );
      setPaymentStep(1);
    }
  };

  const activatePremiumFeature = async (transactionData) => {
    // This would call your backend API to activate the premium feature
    console.log('Activating premium feature via Telebirr:', {
      transactionData,
      productType,
      userId: user?.id
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateUSSDCode = () => {
    const amount = paymentDetails.totalAmount;
    const phone = phoneNumber.substring(2); // Remove 09 prefix
    return `${TELEBIRR_CONFIG.USSD_CODE}${amount}*${phone}#`;
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
      <Text style={styles.stepTitle}>Enter Phone Number</Text>
      <Text style={styles.stepDescription}>
        Enter your Ethio Telecom phone number registered with Telebirr
      </Text>

      {/* Operator Information */}
      <View style={styles.operatorInfo}>
        <View style={[styles.operatorBadge, { backgroundColor: TELEBIRR_CONFIG.OPERATORS.ETHIO_TELECOM.color }]}>
          <Ionicons name="cellular" size={20} color="#FFFFFF" />
          <Text style={styles.operatorText}>{TELEBIRR_CONFIG.OPERATORS.ETHIO_TELECOM.name}</Text>
        </View>
        <Text style={styles.operatorDescription}>
          Make sure your phone has active Telebirr service
        </Text>
      </View>

      {/* Phone Input */}
      <View style={styles.inputContainer}>
        <View style={styles.phonePrefix}>
          <Text style={styles.prefixText}>+251</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder="9XXXXXXXX"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={10}
          placeholderTextColor="#9CA3AF"
          autoFocus
        />
      </View>

      <Text style={styles.helpText}>
        You will receive a payment prompt on your phone
      </Text>

      <TouchableOpacity
        style={[styles.continueButton, !phoneNumber && styles.continueButtonDisabled]}
        onPress={handlePhoneNumberSubmit}
        disabled={!phoneNumber}
      >
        <LinearGradient
          colors={['#078930', '#065F46']}
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
        You will receive a USSD prompt to complete the payment
      </Text>

      {/* Payment Summary */}
      <View style={styles.paymentSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Product</Text>
          <Text style={styles.summaryValue}>{productName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phone Number</Text>
          <Text style={styles.summaryValue}>{phoneNumber}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount</Text>
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

      {/* USSD Code Display */}
      <View style={styles.ussdSection}>
        <Text style={styles.ussdTitle}>USSD Code</Text>
        <View style={styles.ussdCodeContainer}>
          <Text style={styles.ussdCode}>{generateUSSDCode()}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => {
              // In a real app, you would copy to clipboard
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Copied', 'USSD code copied to clipboard');
            }}
          >
            <Ionicons name="copy" size={16} color="#078930" />
          </TouchableOpacity>
        </View>
        <Text style={styles.ussdHelp}>
          Dial this code or wait for automatic prompt
        </Text>
      </View>

      {/* PIN Input */}
      <View style={styles.pinSection}>
        <Text style={styles.sectionLabel}>Enter Telebirr PIN</Text>
        <TextInput
          style={styles.pinInput}
          placeholder="•••••"
          value={pinCode}
          onChangeText={setPinCode}
          keyboardType="number-pad"
          maxLength={5}
          secureTextEntry
          placeholderTextColor="#9CA3AF"
          autoFocus
        />
        <Text style={styles.pinHelpText}>
          Enter your 6-digit Telebirr PIN to authorize payment
        </Text>
      </View>

      {/* Countdown Timer */}
      {countdown > 0 && (
        <View style={styles.countdownSection}>
          <Ionicons name="time" size={16} color="#F59E0B" />
          <Text style={styles.countdownText}>
            Time remaining: {formatCountdown(countdown)}
          </Text>
        </View>
      )}

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
          style={[styles.payButton, (isProcessing || pinCode.length !== 5) && styles.payButtonDisabled]}
          onPress={handlePaymentProcessing}
          disabled={isProcessing || pinCode.length !== 5}
        >
          <LinearGradient
            colors={['#078930', '#065F46']}
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

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.successContainer}>
        <LinearGradient
          colors={['#078930', '#065F46']}
          style={styles.successIcon}
        >
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </LinearGradient>
        
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successDescription}>
          Your {productName} has been activated successfully via Telebirr.
        </Text>

        <View style={styles.successDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{transactionId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Paid</Text>
            <Text style={styles.detailValue}>{paymentDetails.totalAmount.toFixed(2)} ETB</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{phoneNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>Telebirr</Text>
          </View>
        </View>

        <View style={styles.successFeatures}>
          <Text style={styles.featuresTitle}>You now have access to:</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#078930" />
              <Text style={styles.featureText}>{productName}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#078930" />
              <Text style={styles.featureText}>Instant activation</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#078930" />
              <Text style={styles.featureText}>30-day duration</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={onPaymentSuccess}
        >
          <LinearGradient
            colors={['#078930', '#065F46']}
            style={styles.doneButtonGradient}
          >
            <Text style={styles.doneButtonText}>Continue to App</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Support Information */}
        <View style={styles.supportSection}>
          <Text style={styles.supportText}>
            Need help with Telebirr? Call {TELEBIRR_CONFIG.CUSTOMER_SERVICE}
          </Text>
        </View>
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
            <Ionicons name="phone-portrait" size={24} color="#078930" />
            <Text style={styles.headerTitle}>Telebirr Payment</Text>
          </View>
          {paymentStep !== 3 && (
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
          <Ionicons name="shield-checkmark" size={16} color="#078930" />
          <Text style={styles.securityText}>Secured by Telebirr • Encrypted • PCI Compliant</Text>
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
    backgroundColor: '#078930',
  },
  stepCircleCompleted: {
    backgroundColor: '#078930',
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
    backgroundColor: '#078930',
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
  operatorInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  operatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  operatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  operatorDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F1F5F9',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  prefixText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#078930',
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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
  ussdSection: {
    marginBottom: 24,
  },
  ussdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  ussdCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#078930',
    marginBottom: 8,
  },
  ussdCode: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    textAlign: 'center',
  },
  copyButton: {
    padding: 4,
  },
  ussdHelp: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  pinSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pinInput: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#1F2937',
    marginBottom: 8,
  },
  pinHelpText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  countdownSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 14,
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
    shadowColor: '#078930',
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
    shadowColor: '#078930',
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
    marginBottom: 24,
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
  successFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
  },
  doneButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#078930',
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
  supportSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  supportText: {
    fontSize: 12,
    color: '#0369A1',
    textAlign: 'center',
    fontWeight: '500',
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
    color: '#078930',
    fontWeight: '500',
  },
});

export default TelebirrPayment;
export { TELEBIRR_CONFIG };