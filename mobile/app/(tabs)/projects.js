import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/constants';

const ProjectsScreen = () => {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  const [projectFilters, setProjectFilters] = useState({
    status: 'all',
    sortBy: 'newest',
    searchQuery: '',
  });

  // Ethiopian payment providers with icons and colors
  const ETHIOPIAN_PAYMENT_PROVIDERS = [
    {
      id: 'chapa',
      name: 'Chapa',
      icon: 'card',
      color: '#0066CC',
      description: 'Pay with Chapa (Cards & Mobile Money)',
      minAmount: 1,
      maxAmount: 100000,
    },
    {
      id: 'telebirr',
      name: 'Telebirr',
      icon: 'phone-portrait',
      color: '#00A859',
      description: 'Pay with Telebirr Mobile Money',
      minAmount: 1,
      maxAmount: 50000,
    },
    {
      id: 'cbe_birr',
      name: 'CBE Birr',
      icon: 'bank',
      color: '#FF6B00',
      description: 'Pay with CBE Birr',
      minAmount: 1,
      maxAmount: 100000,
    },
  ];

  const fetchProjects = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch projects');

      const data = await response.json();
      setProjects(data);
      applyFilters(data, projectFilters);
    } catch (error) {
      console.error('Error fetching projects:', error);
      Alert.alert('Error', 'Could not load projects. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const applyFilters = useCallback((projectList, filters) => {
    let filtered = [...projectList];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        project =>
          project.title.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query)
      );
    }

    // Sort projects
    switch (filters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'amount_asc':
        filtered.sort((a, b) => a.targetAmount - b.targetAmount);
        break;
      case 'amount_desc':
        filtered.sort((a, b) => b.targetAmount - a.targetAmount);
        break;
    }

    setFilteredProjects(filtered);
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    applyFilters(projects, projectFilters);
  }, [projectFilters, projects, applyFilters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects(false);
    fetchPaymentMethods();
  }, []);

  const handleProjectPress = (project) => {
    router.push(`/project-details/${project.id}`);
  };

  const handleDonatePress = (project) => {
    setSelectedProject(project);
    setPaymentModalVisible(true);
    setAmount('');
    setSelectedPaymentMethod(null);
  };

  const initiatePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid donation amount.');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method.');
      return;
    }

    const donationAmount = parseFloat(amount);
    const provider = ETHIOPIAN_PAYMENT_PROVIDERS.find(p => p.id === selectedPaymentMethod);

    if (donationAmount < provider.minAmount) {
      Alert.alert('Minimum Amount', `Minimum donation is ${provider.minAmount} ETB`);
      return;
    }

    if (donationAmount > provider.maxAmount) {
      Alert.alert('Maximum Amount', `Maximum donation is ${provider.maxAmount} ETB`);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Create donation intent
      const response = await fetch(`${API_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          amount: donationAmount,
          currency: 'ETB',
          provider: selectedPaymentMethod,
          paymentMethodId: null, // Will use selected provider
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Handle payment based on provider
        switch (selectedPaymentMethod) {
          case 'chapa':
            router.push({
              pathname: '/payment-webview',
              params: {
                url: data.paymentUrl,
                title: 'Chapa Payment',
              },
            });
            break;
          case 'telebirr':
            // For Telebirr, you might use deep linking or USSD
            Alert.alert(
              'Telebirr Payment',
              `Please complete payment of ${donationAmount} ETB via Telebirr.\n\nTransaction ID: ${data.transactionId}`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I have Paid',
                  onPress: () => verifyPayment(data.transactionId),
                },
              ]
            );
            break;
          case 'cbe_birr':
            router.push({
              pathname: '/payment-webview',
              params: {
                url: data.paymentUrl,
                title: 'CBE Birr Payment',
              },
            });
            break;
        }
        setPaymentModalVisible(false);
      } else {
        Alert.alert('Payment Failed', data.message || 'Could not initiate payment.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Payment processing failed. Please try again.');
    }
  };

  const verifyPayment = async (transactionId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/payments/verify/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Payment verified successfully!');
        fetchProjects(false); // Refresh projects
      } else {
        Alert.alert('Verification Failed', data.message || 'Payment verification failed.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Could not verify payment.');
    }
  };

  const renderProjectCard = ({ item }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() => handleProjectPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.projectHeader}>
        <Text style={styles.projectTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.projectDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, (item.amountRaised / item.targetAmount) * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((item.amountRaised / item.targetAmount) * 100)}% funded
        </Text>
      </View>

      <View style={styles.projectFooter}>
        <View>
          <Text style={styles.amountText}>₦{item.amountRaised.toLocaleString()}</Text>
          <Text style={styles.targetText}>raised of ₦{item.targetAmount.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.donateButton}
          onPress={() => handleDonatePress(item)}
        >
          <Text style={styles.donateButtonText}>Donate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.projectMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.metaText}>
            {new Date(item.deadline).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.metaText}>{item.location || 'Ethiopia'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-open-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Projects Found</Text>
      <Text style={styles.emptyStateText}>
        {projectFilters.searchQuery
          ? 'No projects match your search criteria'
          : 'No projects available at the moment'}
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#00A859';
      case 'completed':
        return '#0066CC';
      case 'pending':
        return '#FF6B00';
      case 'cancelled':
        return '#CC0000';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fundraising Projects</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => router.push('/projects/filters')}
        >
          <Ionicons name="filter-outline" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          value={projectFilters.searchQuery}
          onChangeText={(text) =>
            setProjectFilters({ ...projectFilters, searchQuery: text })
          }
        />
        {projectFilters.searchQuery ? (
          <TouchableOpacity
            onPress={() => setProjectFilters({ ...projectFilters, searchQuery: '' })}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickFilters}
        contentContainerStyle={styles.quickFiltersContent}
      >
        {['all', 'active', 'completed', 'pending'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.quickFilter,
              projectFilters.status === status && styles.quickFilterActive,
            ]}
            onPress={() => setProjectFilters({ ...projectFilters, status })}
          >
            <Text
              style={[
                styles.quickFilterText,
                projectFilters.status === status && styles.quickFilterTextActive,
              ]}
            >
              {status === 'all' ? 'All Projects' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredProjects}
        renderItem={renderProjectCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0066CC" />
        }
      />

      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Donate to {selectedProject?.title}</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount (ETB)</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₦</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>
                <Text style={styles.inputHint}>
                  Enter amount between 1 and 100,000 ETB
                </Text>
              </View>

              {/* Ethiopian Payment Providers */}
              <Text style={styles.sectionTitle}>Choose Payment Method</Text>
              {ETHIOPIAN_PAYMENT_PROVIDERS.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerCard,
                    selectedPaymentMethod === provider.id && styles.providerCardSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod(provider.id)}
                >
                  <View style={styles.providerInfo}>
                    <View
                      style={[styles.providerIcon, { backgroundColor: provider.color }]}
                    >
                      <Ionicons name={provider.icon} size={20} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.providerName}>{provider.name}</Text>
                      <Text style={styles.providerDescription}>{provider.description}</Text>
                    </View>
                  </View>
                  {selectedPaymentMethod === provider.id && (
                    <Ionicons name="checkmark-circle" size={24} color={provider.color} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Saved Payment Methods */}
              {paymentMethods.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={styles.savedMethodCard}
                      onPress={() => setSelectedPaymentMethod(method.provider)}
                    >
                      <View style={styles.savedMethodInfo}>
                        <Ionicons
                          name={
                            method.methodType === 'card'
                              ? 'card-outline'
                              : method.methodType === 'mobile_money'
                              ? 'phone-portrait-outline'
                              : 'bank-outline'
                          }
                          size={20}
                          color="#0066CC"
                        />
                        <View style={styles.savedMethodDetails}>
                          <Text style={styles.savedMethodName}>
                            {method.getMaskedInfo ? method.getMaskedInfo() : method.provider}
                          </Text>
                          {method.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {selectedPaymentMethod === method.provider && (
                        <Ionicons name="checkmark-circle" size={24} color="#0066CC" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <TouchableOpacity
                style={styles.addPaymentMethodButton}
                onPress={() => {
                  setPaymentModalVisible(false);
                  router.push('/add-payment-method');
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#0066CC" />
                <Text style={styles.addPaymentMethodText}>Add New Payment Method</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPaymentModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.donateModalButton,
                  (!amount || !selectedPaymentMethod) && styles.donateModalButtonDisabled,
                ]}
                onPress={initiatePayment}
                disabled={!amount || !selectedPaymentMethod}
              >
                <Text style={styles.donateModalButtonText}>
                  Donate ₦{parseFloat(amount || 0).toLocaleString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  quickFilters: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  quickFiltersContent: {
    paddingRight: 16,
  },
  quickFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quickFilterActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  quickFilterText: {
    color: '#666',
    fontSize: 14,
  },
  quickFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  projectDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00A859',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  targetText: {
    fontSize: 12,
    color: '#666',
  },
  donateButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  donateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  refreshButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  providerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerCardSelected: {
    borderColor: '#0066CC',
    backgroundColor: '#e6f2ff',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  providerDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  savedMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  savedMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  savedMethodDetails: {
    marginLeft: 12,
  },
  savedMethodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  defaultBadge: {
    backgroundColor: '#00A859',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  addPaymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addPaymentMethodText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  donateModalButton: {
    flex: 2,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  donateModalButtonDisabled: {
    backgroundColor: '#ccc',
  },
  donateModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ProjectsScreen;