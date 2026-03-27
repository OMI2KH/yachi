import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../context/AuthContext';

export default function SuccessScreen() {
  const { transactionId, amount, plan, provider } = useLocalSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    // Refresh user data to get updated premium status
    refreshUser();
    
    // Set a timeout to navigate back to premium page after 5 seconds
    const timer = setTimeout(() => {
      router.replace('/(premium)');
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const formatAmount = (amount) => {
    return `ETB ${parseFloat(amount || 0).toLocaleString('en-ET', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'chapa':
        return 'credit-card';
      case 'telebirr':
        return 'smartphone';
      case 'cbe_birr':
        return 'bank';
      default:
        return 'checkmark-circle';
    }
  };

  const getProviderName = (provider) => {
    switch (provider) {
      case 'chapa':
        return 'Chapa';
      case 'telebirr':
        return 'Telebirr';
      case 'cbe_birr':
        return 'CBE Birr';
      default:
        return 'Payment Gateway';
    }
  };

  const getPlanName = (planType) => {
    switch (planType) {
      case 'monthly':
        return 'Monthly Premium';
      case 'yearly':
        return 'Yearly Premium';
      case 'lifetime':
        return 'Lifetime Premium';
      default:
        return 'Premium Plan';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Success Animation */}
          <View style={styles.animationContainer}>
            <LottieView
              source={require('../../assets/animations/success.json')}
              autoPlay
              loop={false}
              style={styles.animation}
            />
          </View>

          {/* Success Title */}
          <Text style={styles.title}>Payment Successful! 🎉</Text>
          <Text style={styles.subtitle}>
            Your premium subscription has been activated successfully
          </Text>

          {/* Transaction Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <MaterialIcons name="confirmation-number" size={20} color="#4F46E5" />
                <Text style={styles.detailLabel}>Transaction ID</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                {transactionId || 'N/A'}
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <FontAwesome5 name="crown" size={18} color="#4F46E5" />
                <Text style={styles.detailLabel}>Plan</Text>
              </View>
              <Text style={styles.detailValue}>
                {getPlanName(plan)}
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="cash-outline" size={20} color="#4F46E5" />
                <Text style={styles.detailLabel}>Amount Paid</Text>
              </View>
              <Text style={[styles.detailValue, styles.amount]}>
                {formatAmount(amount)}
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <MaterialIcons name={getProviderIcon(provider)} size={20} color="#4F46E5" />
                <Text style={styles.detailLabel}>Payment Method</Text>
              </View>
              <Text style={styles.detailValue}>
                {getProviderName(provider)}
              </Text>
            </View>
          </View>

          {/* Premium Benefits */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>Your Premium Benefits</Text>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Ad-free experience</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Unlimited AI conversations</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Priority support</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Advanced AI models</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Extended chat history</Text>
            </View>
          </View>

          {/* Receipt Note */}
          <View style={styles.receiptNote}>
            <Ionicons name="receipt-outline" size={16} color="#6B7280" />
            <Text style={styles.receiptText}>
              A receipt has been sent to your email. Keep this transaction ID for reference.
            </Text>
          </View>

          {/* Auto-navigate Notice */}
          <View style={styles.navigateNotice}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.navigateText}>
              Redirecting to premium page in 5 seconds...
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/(premium)')}
        >
          <Ionicons name="rocket" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Start Using Premium</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/history')}
        >
          <Ionicons name="list-outline" size={20} color="#4F46E5" />
          <Text style={styles.secondaryButtonText}>View Payment History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  animationContainer: {
    width: 150,
    height: 150,
    marginVertical: 20,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    maxWidth: '50%',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  receiptNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  receiptText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
    lineHeight: 16,
  },
  navigateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  navigateText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
});