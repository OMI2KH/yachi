// components/payment/cbe-birr-payment.js

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
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { analyticsService } from '../../services/analytics-service';

const SCREEN = Dimensions.get('window');

const CBE_BIRR_CONFIG = {
  SUPPORTED_OPERATORS: {
    ETHIO_TELECOM: 'ethio_telecom',
    SAFARICOM: 'safaricom',
    AIRTEL: 'airtel'
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

const CbeBirrPayment = ({
  productType = CBE_BIRR_CONFIG.TRANSACTION_TYPES.PREMIUM_BADGE,
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
  const [selectedOperator, setSelectedOperator] = useState(CBE_BIRR_CONFIG.SUPPORTED_OPERATORS.ETHIO_TELECOM);
  
  const { user } = useStore();
  
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate total amount with fees
  const calculateTotalAmount = useCallback(() => {
    const fee = productAmount * CBE_BIRR_CONFIG.FEE_PERCENTAGE;
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
      setPhoneNumber('');
      setPinCode('');
      animateIn();
      
      // Track payment view
      analyticsService.trackEvent('cbe_birr_payment_viewed', {
        productType,
        productAmount,
        userId: user?.id
      });
    }
  }, [isVisible]);

  const validatePhoneNumber = (number) => {
    const ethioTelecomRegex = /^(09)[0-9]{8}$/;
    const safaricomRegex = /^(07)[0-9]{8}$/;
    const airtelRegex = /^(074)[0-9]{7}$/;
    
    switch (selectedOperator) {
      case CBE_BIRR_CONFIG.SUPPORTED_OPERATORS.ETHIO_TELECOM:
        return ethioTelecomRegex.test(number);
      case CBE_BIRR_CONFIG.SUPPORTED_OPERATORS.SAFARICOM:
        return safaricomRegex.test(number);
      case CBE_BIRR_CONFIG.SUPPORTED_OPERATORS.AIRTEL:
        return airtelRegex.test(number);
      default:
        return false;
    }
  };

  const handlePhoneNumberSubmit = () => {
    if (!validatePhoneNumber(phoneNumber)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Invalid Phone Number',
        `Please enter a valid ${getOperatorLabel(selectedOperator)} phone number.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaymentStep(2);
    
    analyticsService.trackEvent('cbe_birr_phone_entered', {
      phoneNumber: phoneNumber,
      operator: selectedOperator,
      userId: user?.id
    });
  };

  const handlePaymentProcessing = async () => {
    if (pinCode.length !== 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid PIN', 'Please enter your 5-digit CBE Birr PIN.');
      return;
    }

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Simulate API call to CBE Birr payment gateway
      const paymentResult = await processCbeBirrPayment();
      
      if (paymentResult.success) {
        await handleSuccessfulPayment(paymentResult.transactionData);
      } else {
        throw new Error(paymentResult.error || 'Payment processing failed');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Payment Failed', error.message);
      
      analyticsService.trackEvent('cbe_birr_payment_failed', {
        error: error.message,
        phoneNumber,
        productType,
        userId: user?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processCbeBirrPayment = async () => {
    // Simulate API call to CBE Birr
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful payment 90% of the time
        const isSuccess = Math.random() > 0.1;
        
        if (isSuccess) {
          resolve({
            success: true,
            transactionData: {
              id: `CBE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              amount: amountDetails.totalAmount,
              phoneNumber,
              timestamp: new Date().toISOString(),
              operator: selectedOperator
            }
          });
        } else {
          resolve({
            success: false,
            error: 'Insufficient balance or network error'
          });
        }
      }, 3000);
    });
  };

  const handleSuccessfulPayment = async (transactionData) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Track successful payment
    analyticsService.trackEvent('cbe_birr_payment_success', {
      transactionId: transactionData.id,
      amount: transactionData.amount,
      productType,
      userId: user?.id
    });

    // Simulate backend call to activate premium feature
    await activatePremiumFeature(transactionData);

    setPaymentStep(3);
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

  const getOperatorLabel = (operator) => {
    switch (operator) {
      case CBE_BIRR_CONFIG.SUPPORTED_OPERATORS.ETHIO_TELECOM:
        return 'Ethio Telecom';
      case CBE_BIRR_CONFIG.SUPPORTED_OPERATORS.SAFARICOM:
        return 'Safaricom';
      case CBE_BIRR_CONFIG.SUPPORTED_OPERATORS.AIRTEL:
        return 'Airtel';
      default:
        return 'Mobile';
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
      <Text style={styles.stepTitle}>Enter Phone Number</Text>
      <Text style={styles.stepDescription}>
        Enter your {getOperatorLabel(selectedOperator)} phone number registered with CBE Birr
      </Text>

      {/* Operator Selection */}
      <View style={styles.operatorSection}>
        <Text style={styles.sectionLabel}>Mobile Operator</Text>
        <View style={styles.operatorOptions}>
          {Object.values(CBE_BIRR_CONFIG.SUPPORTED_OPERATORS).map((operator) => (
            <TouchableOpacity
              key={operator}
              style={[
                styles.operatorOption,
                selectedOperator === operator && styles.operatorOptionSelected
              ]}
              onPress={() => setSelectedOperator(operator)}
            >
              <Text style={[
                styles.operatorText,
                selectedOperator === operator && styles.operatorTextSelected
              ]}>
                {getOperatorLabel(operator)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Phone Input */}
      <View style={styles.inputContainer}>
        <Ionicons name="call" size={24} color="#6B7280" />
        <TextInput
          style={styles.phoneInput}
          placeholder={`09XXXXXXXX (${getOperatorLabel(selectedOperator)})`}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={10}
          placeholderTextColor="#9CA3AF"
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.continueButton, !phoneNumber && styles.continueButtonDisabled]}
        onPress={handlePhoneNumberSubmit}
        disabled={!phoneNumber}
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
        You will receive a prompt on your phone to complete the payment
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
          <Text style={styles.summaryValue}>{amountDetails.productAmount} ETB</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Transaction Fee</Text>
          <Text style={styles.summaryValue}>{amountDetails.transactionFee.toFixed(2)} ETB</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{amountDetails.totalAmount.toFixed(2)} ETB</Text>
        </View>
      </View>

      {/* PIN Input */}
      <View style={styles.pinSection}>
        <Text style={styles.sectionLabel}>Enter CBE Birr PIN</Text>
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
          Enter your 5-digit CBE Birr PIN to authorize payment
        </Text>
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
          disabled={isProcessing || pinCode.length !== 5}
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
      <View style={styles.successContainer}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.successIcon}
        >
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </LinearGradient>
        
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successDescription}>
          Your {productName} has been activated successfully.
        </Text>

        <View style={styles.successDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>CBE_{Date.now()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Paid</Text>
            <Text style={styles.detailValue}>{amountDetails.totalAmount.toFixed(2)} ETB</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{phoneNumber}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={onPaymentSuccess}
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
            <Ionicons name="business" size={24} color="#10B981" />
            <Text style={styles.headerTitle}>CBE Birr Payment</Text>
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
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.securityText}>Secured by CBE Birr</Text>
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
  operatorSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  operatorOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  operatorOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  operatorOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  operatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  operatorTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  phoneInput: {
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
  pinSection: {
    marginBottom: 24,
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

export default CbeBirrPayment;
export { CBE_BIRR_CONFIG };