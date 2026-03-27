import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentMethodCard from '../../components/PaymentMethodCard';
import PaymentGatewayModal from '../../components/PaymentGatewayModal';
import { colors, typography, spacing } from '../../theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function PaymentScreen() {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${API_URL}/payment/methods`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
        setUserBalance(data.balance || 0);
      } else if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const fetchUserBalance = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/user/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
    fetchUserBalance();
  }, [fetchPaymentMethods, fetchUserBalance]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPaymentMethods();
    fetchUserBalance();
  }, [fetchPaymentMethods, fetchUserBalance]);

  const handleAddPaymentMethod = () => {
    setShowGatewayModal(true);
  };

  const handleSetDefault = async (methodId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/payment/methods/${methodId}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state
        const updatedMethods = paymentMethods.map(method => ({
          ...method,
          isDefault: method.id === methodId,
        }));
        setPaymentMethods(updatedMethods);
        Alert.alert('Success', 'Default payment method updated');
      } else {
        throw new Error('Failed to update default method');
      }
    } catch (error) {
      console.error('Error setting default method:', error);
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const handleDeleteMethod = async (methodId) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/payment/methods/${methodId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                // Remove from local state
                setPaymentMethods(paymentMethods.filter(m => m.id !== methodId));
                Alert.alert('Success', 'Payment method deleted');
              } else {
                throw new Error('Failed to delete payment method');
              }
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', 'Failed to delete payment method');
            }
          },
        },
      ]
    );
  };

  const handleGatewaySelect = (gateway) => {
    setShowGatewayModal(false);
    
    // Navigate to appropriate payment method addition screen
    switch (gateway) {
      case 'chapa':
        router.push({
          pathname: '/payment/add-card',
          params: { provider: 'chapa' }
        });
        break;
      case 'telebirr':
        router.push({
          pathname: '/payment/add-mobile',
          params: { provider: 'telebirr' }
        });
        break;
      case 'cbe_birr':
        router.push({
          pathname: '/payment/add-mobile',
          params: { provider: 'cbe_birr' }
        });
        break;
      default:
        Alert.alert('Error', 'Invalid payment gateway selected');
    }
  };

  const handleMakePayment = () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method first');
      return;
    }
    router.push({
      pathname: '/payment/checkout',
      params: { paymentMethodId: selectedMethod.id }
    });
  };

  const handleViewTransactions = () => {
    router.push('/payment/transactions');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('et-ET', {
      style: 'currency',
      currency: 'ETB',
    }).format(amount);
  };

  const getGatewayIcon = (provider) => {
    switch (provider) {
      case 'chapa':
        return 'credit-card';
      case 'telebirr':
        return 'mobile-alt';
      case 'cbe_birr':
        return 'university';
      default:
        return 'credit-card';
    }
  };

  const getGatewayName = (provider) => {
    switch (provider) {
      case 'chapa':
        return 'Chapa';
      case 'telebirr':
        return 'Telebirr';
      case 'cbe_birr':
        return 'CBE Birr';
      default:
        return provider;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Payments</Text>
          <TouchableOpacity onPress={() => router.push('/payment/settings')}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(userBalance)}</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity 
              style={styles.balanceButton}
              onPress={() => router.push('/payment/topup')}
            >
              <Ionicons name="add-circle" size={20} color={colors.white} />
              <Text style={styles.balanceButtonText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.balanceButton, styles.withdrawButton]}
              onPress={() => router.push('/payment/withdraw')}
            >
              <Ionicons name="arrow-up-circle" size={20} color={colors.white} />
              <Text style={styles.balanceButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleMakePayment}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
                <MaterialIcons name="payment" size={24} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>Pay Now</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/payment/request')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success + '20' }]}>
                <MaterialIcons name="request-page" size={24} color={colors.success} />
              </View>
              <Text style={styles.actionText}>Request</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleViewTransactions}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.warning + '20' }]}>
                <MaterialIcons name="history" size={24} color={colors.warning} />
              </View>
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity onPress={handleAddPaymentMethod}>
              <Text style={styles.addButtonText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="credit-card" size={48} color={colors.gray} />
              <Text style={styles.emptyStateText}>No payment methods added</Text>
              <Text style={styles.emptyStateSubtext}>
                Add a payment method to make transactions
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleAddPaymentMethod}
              >
                <Text style={styles.emptyStateButtonText}>Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  isSelected={selectedMethod?.id === method.id}
                  onSelect={() => setSelectedMethod(method)}
                  onSetDefault={() => handleSetDefault(method.id)}
                  onDelete={() => handleDeleteMethod(method.id)}
                  getIcon={getGatewayIcon}
                  getName={getGatewayName}
                />
              ))}

              <TouchableOpacity 
                style={styles.addMethodButton}
                onPress={handleAddPaymentMethod}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addMethodButtonText}>Add another payment method</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Recent Transactions Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={handleViewTransactions}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {/* You can add a TransactionList component here */}
          <View style={styles.transactionsPlaceholder}>
            <Text style={styles.placeholderText}>
              Recent transactions will appear here
            </Text>
          </View>
        </View>

        {/* Payment Gateway Modal */}
        <PaymentGatewayModal
          visible={showGatewayModal}
          onClose={() => setShowGatewayModal(false)}
          onSelect={handleGatewaySelect}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  balanceCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 16,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    ...typography.h1,
    fontSize: 32,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  balanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  withdrawButton: {
    backgroundColor: colors.error + '40',
  },
  balanceButtonText: {
    ...typography.button,
    color: colors.white,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
  },
  addButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  seeAllText: {
    ...typography.caption,
    color: colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  emptyStateText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    ...typography.body,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    ...typography.button,
    color: colors.white,
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  addMethodButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  transactionsPlaceholder: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.gray,
  },
});