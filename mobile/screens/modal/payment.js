// screens/modal/payment.js
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/auth-context';
import { usePayment } from '../../contexts/payment-context';
import { useNotifications } from '../../contexts/notification-context';

// Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import Card from '../../components/ui/card';
import Badge from '../../components/ui/badge';
import Loading from '../../components/ui/loading';
import Input from '../../components/ui/input';
import ConfirmationModal from '../../components/ui/confirmation-modal';

// Payment Components
import PaymentMethod from '../../components/payment/payment-method';
import PaymentForm from '../../components/payment/payment-form';
import Receipt from '../../components/payment/receipt';

// Services
import { 
  processPayment, 
  verifyPayment, 
  savePaymentMethod,
  getPaymentHistory 
} from '../../services/payment-service';
import { sendNotification } from '../../services/notification-service';

// Utils
import { formatCurrency, formatDate } from '../../utils/formatters';
import { validatePayment, validateCard, validatePhone } from '../../utils/validators';

// Constants
import { PAYMENT_METHODS, PAYMENT_STATUS, CURRENCY } from '../../constants/payment';

const PaymentModal = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    currentPayment, 
    clearCurrentPayment,
    addToPaymentHistory 
  } = usePayment();
  const { showNotification } = useNotifications();

  // State
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('chapa');
  const [paymentStep, setPaymentStep] = useState('method'); // method -> details -> processing -> result
  const [paymentData, setPaymentData] = useState({});
  const [paymentResult, setPaymentResult] = useState(null);
  const [savePayment, setSavePayment] = useState(false);
  const [savedMethods, setSavedMethods] = useState([]);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [error, setError] = useState(null);

  // Payment methods configuration
  const paymentMethods = useMemo(() => [
    {
      id: 'chapa',
      name: 'Chapa',
      logo: '🏦',
      type: 'online',
      description: 'Secure online banking',
      supported: true,
      fees: { percentage: 1.5, fixed: 2 },
      limits: { min: 10, max: 50000 },
      currencies: ['ETB'],
      features: ['Instant processing', 'Bank transfer', 'Secure encryption']
    },
    {
      id: 'telebirr',
      name: 'Telebirr',
      logo: '📱',
      type: 'mobile',
      description: 'Ethio Telecom mobile money',
      supported: true,
      fees: { percentage: 0.5, fixed: 1 },
      limits: { min: 1, max: 10000 },
      currencies: ['ETB'],
      features: ['Mobile money', 'Quick payment', 'USSD support']
    },
    {
      id: 'cbe-birr',
      name: 'CBE Birr',
      logo: '💳',
      type: 'mobile',
      description: 'Commercial Bank of Ethiopia',
      supported: true,
      fees: { percentage: 1, fixed: 1.5 },
      limits: { min: 5, max: 25000 },
      currencies: ['ETB'],
      features: ['Bank integration', 'Secure transfer', 'Instant notification']
    }
  ], []);

  // Calculate payment details
  const paymentDetails = useMemo(() => {
    if (!currentPayment) return null;

    const method = paymentMethods.find(m => m.id === selectedMethod);
    if (!method) return null;

    const fee = (currentPayment.amount * method.fees.percentage / 100) + method.fees.fixed;
    const total = currentPayment.amount + fee;

    return {
      subtotal: currentPayment.amount,
      fee,
      total,
      currency: currentPayment.currency || 'ETB',
      method
    };
  }, [currentPayment, selectedMethod, paymentMethods]);

  // Load saved payment methods
  const loadSavedMethods = useCallback(async () => {
    if (!user) return;

    try {
      const result = await getPaymentHistory(user.id);
      if (result.success) {
        // Extract unique saved methods from history
        const methods = result.payments
          .filter(p => p.savedMethod)
          .reduce((acc, payment) => {
            if (!acc.find(m => m.methodId === payment.method)) {
              acc.push({
                id: payment.id,
                methodId: payment.method,
                lastFour: payment.maskedAccount,
                type: payment.type,
                savedAt: payment.createdAt
              });
            }
            return acc;
          }, []);
        setSavedMethods(methods);
      }
    } catch (error) {
      console.error('Error loading saved methods:', error);
    }
  }, [user]);

  // Handle payment method selection
  const handleMethodSelect = useCallback((methodId) => {
    setSelectedMethod(methodId);
    setError(null);
  }, []);

  // Validate payment details based on method
  const validatePaymentDetails = useCallback((data, method) => {
    switch (method) {
      case 'chapa':
        return validateCard(data);
      case 'telebirr':
      case 'cbe-birr':
        return validatePhone(data.phone);
      default:
        return { valid: false, errors: ['Invalid payment method'] };
    }
  }, []);

  // Process payment
  const handleProcessPayment = useCallback(async () => {
    if (!currentPayment || !paymentDetails) {
      setError('Missing payment information');
      return;
    }

    // Validate payment data
    const validation = validatePayment({
      amount: paymentDetails.total,
      currency: paymentDetails.currency,
      method: selectedMethod,
      ...paymentData
    });

    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    // Method-specific validation
    const methodValidation = validatePaymentDetails(paymentData, selectedMethod);
    if (!methodValidation.valid) {
      setError(methodValidation.errors.join(', '));
      return;
    }

    setProcessing(true);
    setPaymentStep('processing');
    setError(null);

    try {
      // Process payment
      const result = await processPayment({
        userId: user.id,
        amount: paymentDetails.total,
        currency: paymentDetails.currency,
        method: selectedMethod,
        description: currentPayment.description,
        metadata: {
          ...currentPayment.metadata,
          subtotal: paymentDetails.subtotal,
          fees: paymentDetails.fee
        },
        paymentData,
        savePayment
      });

      if (result.success) {
        // Verify payment
        const verification = await verifyPayment(result.transactionId);
        
        if (verification.success) {
          setPaymentResult({
            success: true,
            transactionId: result.transactionId,
            amount: paymentDetails.total,
            currency: paymentDetails.currency,
            method: selectedMethod,
            timestamp: new Date().toISOString(),
            reference: result.reference
          });

          // Add to payment history
          await addToPaymentHistory({
            id: result.transactionId,
            amount: paymentDetails.total,
            currency: paymentDetails.currency,
            method: selectedMethod,
            status: 'completed',
            description: currentPayment.description,
            metadata: currentPayment.metadata,
            createdAt: new Date().toISOString()
          });

          // Send notification
          await sendNotification({
            type: 'PAYMENT_COMPLETED',
            title: 'Payment Successful',
            message: `Your payment of ${formatCurrency(paymentDetails.total, paymentDetails.currency)} was processed successfully`,
            recipientIds: [user.id],
            data: {
              transactionId: result.transactionId,
              amount: paymentDetails.total,
              method: selectedMethod
            }
          });

          setPaymentStep('result');
        } else {
          throw new Error('Payment verification failed');
        }
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      setPaymentStep('result');
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  }, [
    currentPayment, 
    paymentDetails, 
    selectedMethod, 
    paymentData, 
    savePayment, 
    user, 
    validatePaymentDetails,
    addToPaymentHistory,
    showNotification
  ]);

  // Handle retry payment
  const handleRetryPayment = useCallback(() => {
    setPaymentStep('method');
    setPaymentResult(null);
    setError(null);
  }, []);

  // Handle close modal
  const handleClose = useCallback(() => {
    if (processing) {
      Alert.alert(
        'Payment in Progress',
        'Are you sure you want to cancel this payment?',
        [
          { text: 'Continue Payment', style: 'cancel' },
          { 
            text: 'Cancel Payment', 
            style: 'destructive',
            onPress: () => {
              clearCurrentPayment();
              router.back();
            }
          }
        ]
      );
    } else {
      clearCurrentPayment();
      router.back();
    }
  }, [processing, clearCurrentPayment, router]);

  // Handle successful payment close
  const handleSuccessClose = useCallback(() => {
    clearCurrentPayment();
    
    // Navigate based on payment type
    if (currentPayment?.metadata?.type === 'booking') {
      router.push('/bookings/confirmation');
    } else if (currentPayment?.metadata?.type === 'premium') {
      router.push('/premium/success');
    } else {
      router.back();
    }
  }, [clearCurrentPayment, currentPayment, router]);

  // Initialize
  useEffect(() => {
    if (currentPayment) {
      loadSavedMethods();
      setPaymentStep('method');
      setError(null);
      setPaymentResult(null);
    }
  }, [currentPayment, loadSavedMethods]);

  // Render payment method selection
  const renderMethodSelection = useCallback(() => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Select Payment Method</ThemedText>
        <ThemedText style={styles.stepDescription}>
          Choose how you want to pay
        </ThemedText>
      </View>

      {/* Saved Methods */}
      {savedMethods.length > 0 && (
        <Card style={styles.savedMethodsCard}>
          <ThemedText style={styles.sectionTitle}>Saved Methods</ThemedText>
          {savedMethods.map(method => (
            <PaymentMethod
              key={method.id}
              method={paymentMethods.find(m => m.id === method.methodId)}
              selected={selectedMethod === method.methodId}
              onSelect={() => handleMethodSelect(method.methodId)}
              savedDetails={method}
            />
          ))}
        </Card>
      )}

      {/* Available Methods */}
      <Card style={styles.methodsCard}>
        <ThemedText style={styles.sectionTitle}>Payment Methods</ThemedText>
        {paymentMethods.map(method => (
          <PaymentMethod
            key={method.id}
            method={method}
            selected={selectedMethod === method.id}
            onSelect={() => handleMethodSelect(method.id)}
          />
        ))}
      </Card>

      {/* Payment Summary */}
      {paymentDetails && (
        <Card style={styles.summaryCard}>
          <ThemedText style={styles.sectionTitle}>Payment Summary</ThemedText>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Amount:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {formatCurrency(paymentDetails.subtotal, paymentDetails.currency)}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>
              {paymentDetails.method.name} Fee:
            </ThemedText>
            <ThemedText style={styles.summaryValue}>
              {formatCurrency(paymentDetails.fee, paymentDetails.currency)}
            </ThemedText>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText style={styles.totalLabel}>Total:</ThemedText>
            <ThemedText style={styles.totalValue}>
              {formatCurrency(paymentDetails.total, paymentDetails.currency)}
            </ThemedText>
          </View>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          variant="outline"
          onPress={handleClose}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onPress={() => setPaymentStep('details')}
          disabled={!selectedMethod}
          style={styles.continueButton}
        >
          Continue to Payment
        </Button>
      </View>
    </View>
  ), [
    paymentDetails, 
    selectedMethod, 
    savedMethods, 
    paymentMethods, 
    handleMethodSelect, 
    handleClose
  ]);

  // Render payment details form
  const renderPaymentDetails = useCallback(() => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Payment Details</ThemedText>
        <ThemedText style={styles.stepDescription}>
          Enter your {paymentMethods.find(m => m.id === selectedMethod)?.name} details
        </ThemedText>
      </View>

      <PaymentForm
        method={selectedMethod}
        paymentData={paymentData}
        onChange={setPaymentData}
        onSaveMethodChange={setSavePayment}
        savePayment={savePayment}
      />

      {error && (
        <Card style={styles.errorCard}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </Card>
      )}

      {/* Payment Summary */}
      {paymentDetails && (
        <Card style={styles.summaryCard}>
          <ThemedText style={styles.sectionTitle}>Final Amount</ThemedText>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText style={styles.totalLabel}>Total to Pay:</ThemedText>
            <ThemedText style={styles.totalValue}>
              {formatCurrency(paymentDetails.total, paymentDetails.currency)}
            </ThemedText>
          </View>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          variant="outline"
          onPress={() => setPaymentStep('method')}
          style={styles.backButton}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onPress={() => setConfirmationModal(true)}
          disabled={!paymentData || processing}
          style={styles.payButton}
        >
          Pay {paymentDetails && formatCurrency(paymentDetails.total, paymentDetails.currency)}
        </Button>
      </View>
    </View>
  ), [
    selectedMethod, 
    paymentData, 
    savePayment, 
    paymentDetails, 
    error, 
    processing, 
    paymentMethods
  ]);

  // Render processing state
  const renderProcessing = useCallback(() => (
    <View style={styles.stepContainer}>
      <View style={styles.processingContent}>
        <Loading message="Processing your payment..." />
        <ThemedText style={styles.processingText}>
          Please wait while we process your payment. Do not close this window.
        </ThemedText>
      </View>
    </View>
  ), []);

  // Render result state
  const renderResult = useCallback(() => (
    <View style={styles.stepContainer}>
      <Receipt
        payment={paymentResult}
        paymentDetails={paymentDetails}
        originalPayment={currentPayment}
        onRetry={handleRetryPayment}
        onClose={handleSuccessClose}
      />
    </View>
  ), [paymentResult, paymentDetails, currentPayment, handleRetryPayment, handleSuccessClose]);

  if (!currentPayment) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorState}>
          <ThemedText style={styles.errorTitle}>No Payment Found</ThemedText>
          <ThemedText style={styles.errorDescription}>
            Please initiate a payment from the booking or premium section.
          </ThemedText>
          <Button variant="primary" onPress={handleClose}>
            Go Back
          </Button>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Payment</ThemedText>
        <ThemedText style={styles.subtitle}>
          {currentPayment.description || 'Complete your payment'}
        </ThemedText>
      </View>

      {/* Progress Steps */}
      <View style={styles.progressSteps}>
        {['method', 'details', 'processing', 'result'].map((step, index) => (
          <View key={step} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                paymentStep === step && styles.progressDotActive,
                index < ['method', 'details', 'processing', 'result'].indexOf(paymentStep) && 
                  styles.progressDotCompleted
              ]}
            >
              {index < ['method', 'details', 'processing', 'result'].indexOf(paymentStep) && (
                <ThemedText style={styles.progressCheck}>✓</ThemedText>
              )}
            </View>
            <ThemedText
              style={[
                styles.progressLabel,
                paymentStep === step && styles.progressLabelActive
              ]}
            >
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {paymentStep === 'method' && renderMethodSelection()}
        {paymentStep === 'details' && renderPaymentDetails()}
        {paymentStep === 'processing' && renderProcessing()}
        {paymentStep === 'result' && renderResult()}
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmationModal}
        title="Confirm Payment"
        message={`You are about to pay ${formatCurrency(paymentDetails?.total, paymentDetails?.currency)} using ${paymentMethods.find(m => m.id === selectedMethod)?.name}. This action cannot be undone.`}
        confirmText={`Pay ${formatCurrency(paymentDetails?.total, paymentDetails?.currency)}`}
        cancelText="Review Details"
        onConfirm={handleProcessPayment}
        onCancel={() => setConfirmationModal(false)}
        variant="primary"
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: '#3B82F6',
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  progressCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  progressLabelActive: {
    opacity: 1,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    opacity: 0.7,
  },
  savedMethodsCard: {
    marginBottom: 16,
    padding: 16,
  },
  methodsCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  processingContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingText: {
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  errorCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 16,
  },
  cancelButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  backButton: {
    flex: 1,
  },
  payButton: {
    flex: 2,
  },
});

export default PaymentModal;