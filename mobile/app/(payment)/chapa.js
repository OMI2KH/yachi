import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/constants';

const ChapaPaymentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get payment details from params
  const amount = parseFloat(params.amount) || 0;
  const orderId = params.orderId || '';
  const description = params.description || 'Payment';
  const currency = params.currency || 'ETB';
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingMethod, setIsSavingMethod] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [userData, setUserData] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userStr = await AsyncStorage.getItem('userData');
      
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserData(user);
        setEmail(user.email || '');
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setPhoneNumber(user.phoneNumber || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^09[0-9]{8}$/.test(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Ethiopian phone number (09XXXXXXXX)';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const initiateChapaPayment = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before proceeding.');
      return;
    }

    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const paymentData = {
        amount,
        currency,
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        tx_ref: orderId || `chapa-${Date.now()}`,
        description,
        callback_url: `${API_URL}/api/payments/chapa/callback`,
        return_url: 'yourapp://payment/callback',
        metadata: {
          orderId,
          userId: userData?.id,
          savePaymentMethod,
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch(`${API_URL}/api/payments/chapa/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Payment initialization failed');
      }

      if (result.success && result.data?.checkout_url) {
        // Redirect to Chapa checkout
        router.push({
          pathname: '/payment/webview',
          params: {
            url: result.data.checkout_url,
            title: 'Chapa Payment',
            callbackUrl: 'yourapp://payment/callback',
            paymentMethod: 'chapa'
          }
        });
        
        // If saving payment method, store details locally
        if (savePaymentMethod) {
          await savePaymentMethodToProfile(result.data);
        }
      } else {
        Alert.alert('Payment Failed', result.message || 'Unable to initialize payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const savePaymentMethodToProfile = async (paymentData) => {
    try {
      setIsSavingMethod(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const paymentMethodData = {
        methodType: 'mobile_money',
        provider: 'chapa',
        token: paymentData.reference || paymentData.tx_ref,
        phoneNumber: phoneNumber,
        isDefault: false,
        metadata: {
          provider: 'chapa',
          phoneNumber,
          email,
          firstName,
          lastName,
          lastUsed: new Date().toISOString()
        }
      };

      await fetch(`${API_URL}/api/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentMethodData)
      });
      
      // Update local storage with saved payment methods
      await updateLocalPaymentMethods(paymentMethodData);
    } catch (error) {
      console.error('Error saving payment method:', error);
      // Don't show error to user - payment still succeeded
    } finally {
      setIsSavingMethod(false);
    }
  };

  const updateLocalPaymentMethods = async (newMethod) => {
    try {
      const existingMethods = await AsyncStorage.getItem('userPaymentMethods');
      let methods = [];
      
      if (existingMethods) {
        methods = JSON.parse(existingMethods);
      }
      
      methods.push(newMethod);
      await AsyncStorage.setItem('userPaymentMethods', JSON.stringify(methods));
    } catch (error) {
      console.error('Error updating local payment methods:', error);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chapa Payment</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Payment Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>{formatAmount(amount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Description:</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>{description}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method:</Text>
              <View style={styles.providerBadge}>
                <Ionicons name="phone-portrait" size={16} color="#fff" />
                <Text style={styles.providerText}>Chapa</Text>
              </View>
            </View>
          </View>

          {/* Payment Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Payment Details</Text>
            
            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                placeholder="09XXXXXXXX"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
              {errors.phoneNumber && (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              )}
              <Text style={styles.inputHelp}>
                Ethiopian mobile number for payment confirmation
              </Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* First Name & Last Name */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1, styles.marginRight]}>
                <Text style={styles.inputLabel}>
                  First Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                {errors.firstName && (
                  <Text style={styles.errorText}>{errors.firstName}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>
                  Last Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                />
                {errors.lastName && (
                  <Text style={styles.errorText}>{errors.lastName}</Text>
                )}
              </View>
            </View>

            {/* Save Payment Method */}
            <View style={styles.saveMethodContainer}>
              <View style={styles.saveMethodRow}>
                <Switch
                  value={savePaymentMethod}
                  onValueChange={setSavePaymentMethod}
                  trackColor={{ false: '#767577', true: '#4CAF50' }}
                  thumbColor={savePaymentMethod ? '#f4f3f4' : '#f4f3f4'}
                />
                <View style={styles.saveMethodTextContainer}>
                  <Text style={styles.saveMethodTitle}>Save this payment method</Text>
                  <Text style={styles.saveMethodDescription}>
                    Save your Chapa details for faster checkout next time
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#2196F3" />
              <Text style={styles.infoText}>
                You will be redirected to Chapa's secure payment page to complete your transaction
              </Text>
            </View>
          </View>

          {/* Payment Methods Info */}
          <View style={styles.methodsInfo}>
            <Text style={styles.methodsTitle}>Accepted Payment Methods via Chapa:</Text>
            <View style={styles.methodsGrid}>
              <View style={styles.methodItem}>
                <Ionicons name="card" size={24} color="#666" />
                <Text style={styles.methodText}>Credit/Debit Cards</Text>
              </View>
              <View style={styles.methodItem}>
                <Ionicons name="phone-portrait" size={24} color="#666" />
                <Text style={styles.methodText}>Mobile Money</Text>
              </View>
              <View style={styles.methodItem}>
                <Ionicons name="business" size={24} color="#666" />
                <Text style={styles.methodText}>Bank Transfer</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer with Pay Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, isLoading && styles.payButtonDisabled]}
            onPress={initiateChapaPayment}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.payButtonText}>Pay {formatAmount(amount)}</Text>
                <Ionicons name="lock-closed" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
          
          <Text style={styles.securityText}>
            <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
            {' '}Secure payment encrypted with SSL
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  providerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  inputHelp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  flex1: {
    flex: 1,
  },
  marginRight: {
    marginRight: 8,
  },
  saveMethodContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  saveMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveMethodTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  saveMethodTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  saveMethodDescription: {
    fontSize: 12,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    marginLeft: 8,
    lineHeight: 18,
  },
  methodsInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodItem: {
    alignItems: 'center',
    flex: 1,
  },
  methodText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  payButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  payButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default ChapaPaymentScreen;