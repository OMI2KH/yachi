import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import paymentService from '../../services/paymentService';

const PaymentConfirmationScreen = () => {
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);
  
  // Extract parameters
  const paymentId = params.paymentId;
  const orderId = params.orderId;
  const amount = parseFloat(params.amount);
  const currency = params.currency || 'ETB';
  const provider = params.provider;
  const phoneNumber = params.phoneNumber;
  const callbackUrl = params.callbackUrl;

  useEffect(() => {
    if (!paymentId || !orderId) {
      setError('Invalid payment information');
      setLoading(false);
      return;
    }
    
    fetchPaymentDetails();
  }, [paymentId, orderId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      // Fetch payment details from your backend
      const response = await paymentService.getPaymentStatus(paymentId);
      
      if (response.success) {
        setPaymentDetails(response.data);
      } else {
        setError(response.message || 'Failed to fetch payment details');
      }
    } catch (err) {
      console.error('Error fetching payment details:', err);
      setError('An error occurred while fetching payment details');
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async () => {
    if (!paymentId) return;
    
    try {
      setVerifying(true);
      
      const response = await paymentService.verifyPayment(paymentId);
      
      if (response.success) {
        const payment = response.data;
        
        if (payment.status === 'success') {
          // Payment successful
          Alert.alert(
            'Payment Successful!',
            `Your payment of ${amount} ${currency} has been confirmed.`,
            [
              {
                text: 'Continue',
                onPress: () => {
                  // Navigate based on the callback URL or order type
                  if (callbackUrl) {
                    router.replace(callbackUrl);
                  } else if (orderId?.startsWith('sub_')) {
                    router.replace('/(tabs)/subscriptions');
                  } else {
                    router.replace('/(tabs)/orders');
                  }
                }
              }
            ]
          );
        } else if (payment.status === 'pending') {
          Alert.alert(
            'Payment Pending',
            'Your payment is still being processed. Please wait a moment and try verifying again.',
            [{ text: 'OK', onPress: () => setVerifying(false) }]
          );
        } else {
          Alert.alert(
            'Payment Failed',
            'The payment could not be verified. Please try again or contact support.',
            [
              { text: 'Try Again', onPress: () => setVerifying(false) },
              { text: 'Contact Support', onPress: () => router.push('/support') }
            ]
          );
        }
      } else {
        Alert.alert('Verification Failed', response.message || 'Could not verify payment');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      Alert.alert('Error', 'An error occurred while verifying payment');
    } finally {
      setVerifying(false);
    }
  };

  const getProviderLogo = () => {
    switch (provider) {
      case 'chapa':
        return require('../../assets/images/chapa-logo.png');
      case 'telebirr':
        return require('../../assets/images/telebirr-logo.png');
      case 'cbe_birr':
        return require('../../assets/images/cbe-birr-logo.png');
      default:
        return require('../../assets/images/payment-default.png');
    }
  };

  const getProviderName = () => {
    switch (provider) {
      case 'chapa':
        return 'Chapa';
      case 'telebirr':
        return 'TeleBirr';
      case 'cbe_birr':
        return 'CBE Birr';
      default:
        return provider || 'Payment Gateway';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return '#10B981'; // green
      case 'pending':
        return '#F59E0B'; // amber
      case 'failed':
      case 'cancelled':
        return '#EF4444'; // red
      default:
        return '#6B7280'; // gray
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'Successful';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing';
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('et-ET', {
      style: 'currency',
      currency: currency || 'ETB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('et-ET', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Error Loading Payment</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Confirmation</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Payment Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Image
              source={getProviderLogo()}
              style={styles.providerLogo}
              resizeMode="contain"
            />
            <Text style={styles.providerName}>{getProviderName()}</Text>
          </View>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount Paid</Text>
            <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(paymentDetails?.status) + '20' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(paymentDetails?.status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(paymentDetails?.status) }
              ]}>
                {getStatusText(paymentDetails?.status)}
              </Text>
            </View>
          </View>
          
          {paymentDetails?.transactionId && (
            <View style={styles.referenceContainer}>
              <Text style={styles.referenceLabel}>Transaction ID</Text>
              <Text style={styles.referenceValue}>{paymentDetails.transactionId}</Text>
            </View>
          )}
        </View>

        {/* Payment Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Payment Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order ID</Text>
            <Text style={styles.detailValue}>{orderId}</Text>
          </View>
          
          {paymentId && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment ID</Text>
              <Text style={styles.detailValue}>{paymentId}</Text>
            </View>
          )}
          
          {phoneNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{phoneNumber}</Text>
            </View>
          )}
          
          {paymentDetails?.paymentMethod && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>
                {paymentDetails.paymentMethod === 'mobile_money' ? 'Mobile Money' : 
                 paymentDetails.paymentMethod === 'card' ? 'Card' : 'Bank Account'}
              </Text>
            </View>
          )}
          
          {paymentDetails?.createdAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>{formatDate(paymentDetails.createdAt)}</Text>
            </View>
          )}
          
          {paymentDetails?.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{paymentDetails.description}</Text>
            </View>
          )}
        </View>

        {/* Instructions based on status */}
        {paymentDetails?.status === 'pending' && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <Text style={styles.infoText}>
              Your payment is being processed. This may take a few moments. 
              Please keep this screen open or verify your payment status later.
            </Text>
          </View>
        )}

        {paymentDetails?.status === 'success' && (
          <View style={[styles.infoCard, { backgroundColor: '#10B98110' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={[styles.infoText, { color: '#10B981' }]}>
              Payment successful! Your order is being processed. 
              You will receive a confirmation shortly.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {paymentDetails?.status === 'pending' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={verifyPayment}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Verify Payment</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              if (callbackUrl) {
                router.replace(callbackUrl);
              } else {
                router.replace('/(tabs)/home');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {paymentDetails?.status === 'success' ? 'Continue Shopping' : 'Go to Home'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textButton}
            onPress={() => router.push('/support')}
          >
            <Text style={styles.textButtonText}>Need Help? Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            Note: A receipt has been sent to your email. 
            Please save your Transaction ID for any inquiries.
          </Text>
        </View>
      </ScrollView>
      
      <StatusBar style="dark" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  providerLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  referenceContainer: {
    alignItems: 'center',
  },
  referenceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  referenceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'monospace',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  infoCard: {
    backgroundColor: '#3B82F610',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 12,
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    padding: 16,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  noteContainer: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PaymentConfirmationScreen;