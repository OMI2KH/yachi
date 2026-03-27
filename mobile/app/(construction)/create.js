import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as yup from 'yup';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Validation schemas for different payment methods
const cardSchema = yup.object().shape({
  cardNumber: yup.string()
    .required('Card number is required')
    .matches(/^\d{16}$/, 'Card number must be 16 digits'),
  expiryMonth: yup.string()
    .required('Expiry month is required')
    .matches(/^(0[1-9]|1[0-2])$/, 'Month must be 01-12'),
  expiryYear: yup.string()
    .required('Expiry year is required')
    .matches(/^\d{4}$/, 'Year must be 4 digits')
    .test('is-future', 'Card has expired', function(value) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const year = parseInt(value);
      const month = parseInt(this.parent.expiryMonth);
      
      if (year > currentYear) return true;
      if (year === currentYear && month >= currentMonth) return true;
      return false;
    }),
  cvv: yup.string()
    .required('CVV is required')
    .matches(/^\d{3,4}$/, 'CVV must be 3-4 digits'),
  cardholderName: yup.string()
    .required('Cardholder name is required')
    .min(3, 'Name is too short'),
  phoneNumber: yup.string()
    .required('Phone number is required')
    .matches(/^09\d{8}$/, 'Phone must be 09xxxxxxxx')
});

const mobileMoneySchema = yup.object().shape({
  phoneNumber: yup.string()
    .required('Phone number is required')
    .matches(/^09\d{8}$/, 'Phone must be 09xxxxxxxx')
});

const bankSchema = yup.object().shape({
  accountNumber: yup.string()
    .required('Account number is required')
    .min(5, 'Account number too short'),
  accountName: yup.string()
    .required('Account name is required'),
  bankName: yup.string()
    .required('Bank name is required')
});

export default function CreatePaymentMethod() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnUrl = params.returnUrl || '/(tabs)/profile';
  
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('mobile_money');
  const [selectedProvider, setSelectedProvider] = useState('telebirr');
  const [isDefault, setIsDefault] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    // Card details
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    
    // Mobile money
    phoneNumber: '',
    
    // Bank account
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  
  const [errors, setErrors] = useState({});

  // Ethiopian payment providers based on method type
  const providers = {
    mobile_money: [
      { id: 'telebirr', name: 'Telebirr', icon: 'phone-portrait' },
      { id: 'cbe_birr', name: 'CBE Birr', icon: 'wallet' },
    ],
    card: [
      { id: 'chapa', name: 'Chapa', icon: 'card' },
    ],
    bank_account: [
      { id: 'chapa', name: 'Chapa (Bank Transfer)', icon: 'business' },
    ]
  };

  // Initialize with Ethiopian phone prefix
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      phoneNumber: '09'
    }));
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = async () => {
    try {
      let schema;
      
      switch (selectedMethod) {
        case 'card':
          schema = cardSchema;
          break;
        case 'mobile_money':
          schema = mobileMoneySchema;
          break;
        case 'bank_account':
          schema = bankSchema;
          break;
        default:
          throw new Error('Invalid payment method');
      }
      
      await schema.validate(formData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (validationError) {
      const newErrors = {};
      if (validationError.inner) {
        validationError.inner.forEach(error => {
          newErrors[error.path] = error.message;
        });
      }
      setErrors(newErrors);
      return false;
    }
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      Alert.alert('Validation Error', 'Please check the form for errors');
      return;
    }

    setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Prepare payload based on method type
      let payload = {
        methodType: selectedMethod,
        provider: selectedProvider,
        isDefault: isDefault,
        currency: 'ETB',
      };
      
      // Add method-specific data
      switch (selectedMethod) {
        case 'card':
          payload.metadata = {
            lastFour: formData.cardNumber.slice(-4),
            expiryMonth: parseInt(formData.expiryMonth),
            expiryYear: parseInt(formData.expiryYear),
            cardholderName: formData.cardholderName,
            phoneNumber: formData.phoneNumber
          };
          // In production, you would tokenize the card via your backend
          payload.token = `card_token_${Date.now()}`;
          break;
          
        case 'mobile_money':
          payload.metadata = {
            phoneNumber: formData.phoneNumber
          };
          payload.token = `mobile_${selectedProvider}_${formData.phoneNumber}`;
          break;
          
        case 'bank_account':
          payload.metadata = {
            accountNumber: formData.accountNumber,
            accountName: formData.accountName,
            bankName: formData.bankName
          };
          payload.token = `bank_${selectedProvider}_${formData.accountNumber}`;
          break;
      }
      
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/api/payment-methods`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        Alert.alert(
          'Success',
          'Payment method added successfully',
          [
            {
              text: 'OK',
              onPress: () => router.replace(returnUrl)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to add payment method. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (text) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Format as XXXX XXXX XXXX XXXX
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    
    // Limit to 16 digits
    return formatted.substring(0, 19);
  };

  const renderMethodSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Method Type</Text>
      <View style={styles.methodContainer}>
        {[
          { id: 'mobile_money', label: 'Mobile Money', icon: 'phone-portrait' },
          { id: 'card', label: 'Card', icon: 'card' },
          { id: 'bank_account', label: 'Bank Account', icon: 'business' },
        ].map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodButton,
              selectedMethod === method.id && styles.methodButtonSelected
            ]}
            onPress={() => {
              setSelectedMethod(method.id);
              setSelectedProvider(providers[method.id][0]?.id || 'telebirr');
            }}
          >
            <Ionicons
              name={method.icon}
              size={24}
              color={selectedMethod === method.id ? '#007AFF' : '#666'}
            />
            <Text style={[
              styles.methodText,
              selectedMethod === method.id && styles.methodTextSelected
            ]}>
              {method.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderProviderSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Provider</Text>
      <View style={styles.providerContainer}>
        {providers[selectedMethod]?.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerButton,
              selectedProvider === provider.id && styles.providerButtonSelected
            ]}
            onPress={() => setSelectedProvider(provider.id)}
          >
            <Ionicons
              name={provider.icon}
              size={20}
              color={selectedProvider === provider.id ? '#fff' : '#666'}
            />
            <Text style={[
              styles.providerText,
              selectedProvider === provider.id && styles.providerTextSelected
            ]}>
              {provider.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCardForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Card Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={[styles.input, errors.cardNumber && styles.inputError]}
          placeholder="1234 5678 9012 3456"
          value={formatCardNumber(formData.cardNumber)}
          onChangeText={(text) => handleInputChange('cardNumber', text.replace(/\D/g, ''))}
          keyboardType="numeric"
          maxLength={19}
        />
        {errors.cardNumber && (
          <Text style={styles.errorText}>{errors.cardNumber}</Text>
        )}
      </View>
      
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 2 }]}>
          <Text style={styles.label}>Expiry Date</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.smallInput, errors.expiryMonth && styles.inputError]}
              placeholder="MM"
              value={formData.expiryMonth}
              onChangeText={(text) => handleInputChange('expiryMonth', text)}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={styles.separator}>/</Text>
            <TextInput
              style={[styles.input, styles.smallInput, errors.expiryYear && styles.inputError]}
              placeholder="YYYY"
              value={formData.expiryYear}
              onChangeText={(text) => handleInputChange('expiryYear', text)}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          {(errors.expiryMonth || errors.expiryYear) && (
            <Text style={styles.errorText}>{errors.expiryMonth || errors.expiryYear}</Text>
          )}
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            style={[styles.input, errors.cvv && styles.inputError]}
            placeholder="123"
            value={formData.cvv}
            onChangeText={(text) => handleInputChange('cvv', text)}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
          {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cardholder Name</Text>
        <TextInput
          style={[styles.input, errors.cardholderName && styles.inputError]}
          placeholder="John Doe"
          value={formData.cardholderName}
          onChangeText={(text) => handleInputChange('cardholderName', text)}
          autoCapitalize="words"
        />
        {errors.cardholderName && (
          <Text style={styles.errorText}>{errors.cardholderName}</Text>
        )}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number (for verification)</Text>
        <TextInput
          style={[styles.input, errors.phoneNumber && styles.inputError]}
          placeholder="0912345678"
          value={formData.phoneNumber}
          onChangeText={(text) => handleInputChange('phoneNumber', text)}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {errors.phoneNumber && (
          <Text style={styles.errorText}>{errors.phoneNumber}</Text>
        )}
        <Text style={styles.hint}>Ethiopian phone number (09xxxxxxxx)</Text>
      </View>
    </View>
  );

  const renderMobileMoneyForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Mobile Money Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[styles.input, errors.phoneNumber && styles.inputError]}
          placeholder="0912345678"
          value={formData.phoneNumber}
          onChangeText={(text) => handleInputChange('phoneNumber', text)}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {errors.phoneNumber && (
          <Text style={styles.errorText}>{errors.phoneNumber}</Text>
        )}
        <Text style={styles.hint}>
          {selectedProvider === 'telebirr' 
            ? 'Your Telebirr registered phone number'
            : 'Your CBE Birr registered phone number'}
        </Text>
      </View>
      
      {selectedProvider === 'telebirr' && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Telebirr will send a confirmation SMS to verify your number
          </Text>
        </View>
      )}
    </View>
  );

  const renderBankForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Bank Account Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bank Name</Text>
        <TextInput
          style={[styles.input, errors.bankName && styles.inputError]}
          placeholder="Commercial Bank of Ethiopia"
          value={formData.bankName}
          onChangeText={(text) => handleInputChange('bankName', text)}
        />
        {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={[styles.input, errors.accountNumber && styles.inputError]}
          placeholder="Enter account number"
          value={formData.accountNumber}
          onChangeText={(text) => handleInputChange('accountNumber', text)}
          keyboardType="numeric"
        />
        {errors.accountNumber && (
          <Text style={styles.errorText}>{errors.accountNumber}</Text>
        )}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Holder Name</Text>
        <TextInput
          style={[styles.input, errors.accountName && styles.inputError]}
          placeholder="As it appears on bank account"
          value={formData.accountName}
          onChangeText={(text) => handleInputChange('accountName', text)}
          autoCapitalize="words"
        />
        {errors.accountName && (
          <Text style={styles.errorText}>{errors.accountName}</Text>
        )}
      </View>
    </View>
  );

  const renderForm = () => {
    switch (selectedMethod) {
      case 'card':
        return renderCardForm();
      case 'mobile_money':
        return renderMobileMoneyForm();
      case 'bank_account':
        return renderBankForm();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Payment Method</Text>
            <View style={styles.headerRight} />
          </View>
          
          <View style={styles.content}>
            {renderMethodSelection()}
            {renderProviderSelection()}
            {renderForm()}
            
            <View style={styles.defaultContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setIsDefault(!isDefault)}
              >
                <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                  {isDefault && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Set as default payment method</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
              <Text style={styles.securityText}>
                Your payment details are secured with encryption. We never store your full card details.
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Add Payment Method</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
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
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  methodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  methodButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  methodText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  methodTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  providerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  providerButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  providerText: {
    fontSize: 14,
    color: '#666',
  },
  providerTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallInput: {
    flex: 1,
    textAlign: 'center',
  },
  separator: {
    fontSize: 20,
    color: '#333',
    marginHorizontal: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565c0',
  },
  defaultContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#4CAF50',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});