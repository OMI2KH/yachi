import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const PaymentHistoryScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalTransactions: 0,
    successfulTransactions: 0
  });

  // Filters for transaction status
  const FILTERS = [
    { id: 'all', label: 'All', color: '#6366f1' },
    { id: 'success', label: 'Successful', color: '#10b981' },
    { id: 'pending', label: 'Pending', color: '#f59e0b' },
    { id: 'failed', label: 'Failed', color: '#ef4444' }
  ];

  // Payment method icons mapping
  const PAYMENT_METHOD_ICONS = {
    chapa: require('../../assets/icons/chapa.png'),
    telebirr: require('../../assets/icons/telebirr.png'),
    cbe_birr: require('../../assets/icons/cbe_birr.png'),
    card: require('../../assets/icons/credit-card.png'),
    mobile_money: require('../../assets/icons/mobile-money.png'),
    bank_account: require('../../assets/icons/bank.png')
  };

  // Status colors
  const STATUS_COLORS = {
    success: '#10b981',
    pending: '#f59e0b',
    failed: '#ef4444',
    refunded: '#8b5cf6'
  };

  // Status icons
  const STATUS_ICONS = {
    success: 'checkmark-circle',
    pending: 'time-outline',
    failed: 'close-circle',
    refunded: 'refresh-circle'
  };

  // Fetch user data from storage
  const fetchUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('userData');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserData(user);
        return user;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return null;
  };

  // Fetch transaction history
  const fetchTransactions = async () => {
    try {
      const user = await fetchUserData();
      if (!user?.token) {
        Alert.alert('Error', 'Please login to view payment history');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_URL}/transactions/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
        setFilteredTransactions(data.transactions || []);
        
        // Calculate stats
        const totalSpent = data.transactions
          .filter(t => t.status === 'success')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const successfulTransactions = data.transactions.filter(t => t.status === 'success').length;
        
        setStats({
          totalSpent,
          totalTransactions: data.transactions.length,
          successfulTransactions
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Transaction fetch error:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter transactions
  const filterTransactions = (filterId) => {
    setActiveFilter(filterId);
    
    if (filterId === 'all') {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(transaction => 
        transaction.status === filterId
      );
      setFilteredTransactions(filtered);
    }
  };

  // Format currency (ETB)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ET', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Refresh on pull
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, []);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  // Render transaction item
  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.transactionCard}
      onPress={() => navigation.navigate('TransactionDetails', { transactionId: item.id })}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <View style={styles.methodIconContainer}>
            {PAYMENT_METHOD_ICONS[item.paymentMethod?.provider] ? (
              <Image 
                source={PAYMENT_METHOD_ICONS[item.paymentMethod?.provider]} 
                style={styles.methodIcon}
              />
            ) : (
              <Ionicons name="card-outline" size={24} color="#6366f1" />
            )}
          </View>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionDescription}>
              {item.description || 'Payment'}
            </Text>
            <Text style={styles.transactionDate}>
              {formatDate(item.createdAt)}
            </Text>
            <View style={styles.transactionMeta}>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}15` }]}>
                <Ionicons 
                  name={STATUS_ICONS[item.status] || 'help-circle'} 
                  size={14} 
                  color={STATUS_COLORS[item.status]} 
                />
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.transactionId}>
                ID: {item.transactionId?.substring(0, 8)}...
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[
            styles.amountText,
            { color: item.status === 'success' ? '#10b981' : '#6b7280' }
          ]}>
            {formatCurrency(item.amount)}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render filter buttons
  const renderFilterButton = ({ id, label, color }) => (
    <TouchableOpacity
      key={id}
      style={[
        styles.filterButton,
        activeFilter === id && { backgroundColor: color, borderColor: color }
      ]}
      onPress={() => filterTransactions(id)}
    >
      <Text style={[
        styles.filterButtonText,
        activeFilter === id && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={80} color="#d1d5db" />
      <Text style={styles.emptyStateTitle}>No transactions yet</Text>
      <Text style={styles.emptyStateText}>
        Your payment history will appear here once you make a transaction
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.browseButtonText}>Browse Services</Text>
      </TouchableOpacity>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Payment History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => Alert.alert('Export', 'Export feature coming soon!')}
        >
          <Ionicons name="download-outline" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalTransactions}</Text>
          <Text style={styles.statLabel}>Total Transactions</Text>
          <Ionicons name="receipt" size={20} color="#6366f1" style={styles.statIcon} />
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>
            {formatCurrency(stats.totalSpent)}
          </Text>
          <Text style={styles.statLabel}>Total Spent</Text>
          <Ionicons name="wallet" size={20} color="#10b981" style={styles.statIcon} />
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {stats.successfulTransactions}
          </Text>
          <Text style={styles.statLabel}>Successful</Text>
          <Ionicons name="checkmark-circle" size={20} color="#f59e0b" style={styles.statIcon} />
        </View>
      </ScrollView>

      {/* Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map(renderFilterButton)}
      </ScrollView>

      {/* Transaction List */}
      <View style={styles.transactionList}>
        <View style={styles.transactionListHeader}>
          <Text style={styles.transactionListTitle}>
            Recent Transactions ({filteredTransactions.length})
          </Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={() => navigation.navigate('Support')}
        >
          <Ionicons name="help-circle-outline" size={20} color="#6366f1" />
          <Text style={styles.supportButtonText}>Need Help?</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.receiptsButton}
          onPress={() => navigation.navigate('Receipts')}
        >
          <Ionicons name="document-text-outline" size={20} color="#ffffff" />
          <Text style={styles.receiptsButtonText}>View Receipts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  exportButton: {
    padding: 8,
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    minWidth: 140,
    position: 'relative',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  transactionList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transactionListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  transactionListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  listContent: {
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  supportButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  receiptsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  receiptsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PaymentHistoryScreen;