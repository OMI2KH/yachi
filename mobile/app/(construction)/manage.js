import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';

// Mock data - replace with actual API calls
const MOCK_PAYMENT_METHODS = [
  {
    id: 1,
    provider: 'telebirr',
    methodType: 'mobile_money',
    lastFour: '5678',
    phoneNumber: '+251911234567',
    isDefault: true,
    metadata: { phoneNumber: '+251911234567' },
  },
  {
    id: 2,
    provider: 'chapa',
    methodType: 'mobile_money',
    lastFour: '4321',
    phoneNumber: '+251922345678',
    isDefault: false,
    metadata: { phoneNumber: '+251922345678' },
  },
  {
    id: 3,
    provider: 'cbe_birr',
    methodType: 'mobile_money',
    lastFour: '8765',
    phoneNumber: '+251933456789',
    isDefault: false,
    metadata: { phoneNumber: '+251933456789' },
  },
];

const PROVIDER_CONFIG = {
  telebirr: {
    name: 'Telebirr',
    icon: 'phone-portrait',
    color: '#FF6B35',
    description: 'Ethio Telecom Mobile Money',
  },
  chapa: {
    name: 'Chapa',
    icon: 'card',
    color: '#4361EE',
    description: 'Digital Payment Platform',
  },
  cbe_birr: {
    name: 'CBE Birr',
    icon: 'bank',
    color: '#2A9D8F',
    description: 'Commercial Bank of Ethiopia',
  },
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE}/api/payment-methods`, {
      //   headers: { Authorization: `Bearer ${user?.token}` }
      // });
      // const data = await response.json();
      
      // For now, use mock data
      setTimeout(() => {
        setPaymentMethods(MOCK_PAYMENT_METHODS);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPaymentMethods();
    setRefreshing(false);
  };

  const handleSetDefault = async (methodId) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`${API_BASE}/api/payment-methods/${methodId}/default`, {
      //   method: 'PUT',
      //   headers: { Authorization: `Bearer ${user?.token}` }
      // });
      
      // Update local state
      setPaymentMethods(methods =>
        methods.map(method => ({
          ...method,
          isDefault: method.id === methodId,
        }))
      );
      
      Alert.alert('Success', 'Default payment method updated');
    } catch (error) {
      console.error('Error setting default method:', error);
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const handleDeleteMethod = (methodId) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Replace with actual API call
              // await fetch(`${API_BASE}/api/payment-methods/${methodId}`, {
              //   method: 'DELETE',
              //   headers: { Authorization: `Bearer ${user?.token}` }
              // });
              
              // Update local state
              setPaymentMethods(methods =>
                methods.filter(method => method.id !== methodId)
              );
              
              Alert.alert('Success', 'Payment method removed');
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', 'Failed to remove payment method');
            }
          },
        },
      ]
    );
  };

  const handleAddMethod = () => {
    Alert.alert(
      'Add Payment Method',
      'Choose your payment provider:',
      [
        {
          text: 'Telebirr',
          onPress: () => router.push('/payments/add?provider=telebirr'),
        },
        {
          text: 'Chapa',
          onPress: () => router.push('/payments/add?provider=chapa'),
        },
        {
          text: 'CBE Birr',
          onPress: () => router.push('/payments/add?provider=cbe_birr'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderPaymentMethod = ({ item }) => {
    const config = PROVIDER_CONFIG[item.provider];
    
    return (
      <TouchableOpacity
        style={[
          styles.methodCard,
          item.isDefault && styles.defaultCard,
          selectedMethod === item.id && styles.selectedCard,
        ]}
        onPress={() => setSelectedMethod(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.methodHeader}>
          <View style={[styles.providerIcon, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.providerName}>{config.name}</Text>
            <Text style={styles.methodType}>
              {item.methodType === 'mobile_money' ? 'Mobile Money' : 
               item.methodType === 'card' ? 'Card' : 'Bank Account'}
            </Text>
            <Text style={styles.phoneNumber}>
              {item.metadata?.phoneNumber || item.phoneNumber}
            </Text>
          </View>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.methodActions}>
          {!item.isDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(item.id)}
            >
              <Ionicons name="star-outline" size={20} color="#666" />
              <Text style={styles.actionText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteMethod(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361EE" />
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4361EE']}
          />
        }
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#4361EE" />
          <Text style={styles.infoText}>
            Add your preferred Ethiopian payment methods for seamless transactions on construction materials and services.
          </Text>
        </View>

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyDescription}>
              Add a payment method to make purchases for construction materials and services.
            </Text>
          </View>
        ) : (
          <FlatList
            data={paymentMethods}
            renderItem={renderPaymentMethod}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.methodsList}
          />
        )}

        <View style={styles.providersSection}>
          <Text style={styles.sectionTitle}>Available Providers</Text>
          <View style={styles.providersGrid}>
            {Object.entries(PROVIDER_CONFIG).map(([key, config]) => (
              <View key={key} style={styles.providerCard}>
                <View style={[styles.providerIconLarge, { backgroundColor: config.color + '20' }]}>
                  <Ionicons name={config.icon} size={32} color={config.color} />
                </View>
                <Text style={styles.providerCardName}>{config.name}</Text>
                <Text style={styles.providerCardDesc}>{config.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddMethod}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={24} color="#FFF" />
        <Text style={styles.addButtonText}>Add Payment Method</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E7F3FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4361EE',
    lineHeight: 20,
  },
  methodsList: {
    paddingHorizontal: 16,
  },
  methodCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  defaultCard: {
    borderColor: '#4361EE',
    borderWidth: 2,
  },
  selectedCard: {
    backgroundColor: '#F8F9FF',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  methodType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    fontWeight: '500',
  },
  defaultBadge: {
    backgroundColor: '#4361EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  methodActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  providersSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  providerIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  providerCardDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#4361EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});