import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';

const TelebirrPaymentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // State variables
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState(params.amount || '');
  const [description, setDescription] = useState(params.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, success, failed
  const [transactionId, setTransactionId] = useState('');
  const [savedPhoneNumbers, setSavedPhoneNumbers] = useState([]);
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  
  const phoneInputRef = useRef();

  // Sample Telebirr charges (these should come from your backend)
  const telebirrCharges = {
    feePercentage: 1.5, // 1.5% transaction fee
    minFee: 2, // Minimum 2 ETB
    maxFee: 25, // Maximum 25 ETB
  };

  // Calculate charges
  const calculateCharges = () => {
    const amountNum = parseFloat(amount) || 0;
    const fee = Math.min(
      Math.max((amountNum * telebirrCharges.feePercentage) / 100, telebirrCharges.minFee),
      telebirrCharges.maxFee
    );
    const total = amountNum + fee;
    
    return {
      amount: amountNum,
      fee,
      total,
    };
  };

  // Load saved payment methods
  useEffect(() => {
    loadSavedData();
    checkBiometricSupport();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedPhones = await AsyncStorage.getItem('telebirr_saved_phones');
      if (savedPhones) {
        setSavedPhoneNumbers(JSON.parse(savedPhones));
      }
      
      const savedPhone = await AsyncStorage.getItem('telebirr_default_phone');
      if (savedPhone) {
        setPhoneNumber(savedPhone);
      }
    } catch (error) {
      console.log('Error loading saved data:', error);
    }
  };

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(compatible && enrolled);
    } catch (error) {
      console.log('Biometric check error:', error);
    }
  };

  // Handle phone number selection from saved numbers
  const handleSelectSavedPhone = (phone) => {
    setPhoneNumber(phone);
    phoneInputRef.current?.blur();
  };

  // Save phone number for future use
  const savePhoneNumber = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    try {
      const updatedPhones = [...new Set([...savedPhoneNumbers, phoneNumber])];
      await AsyncStorage.setItem('telebirr_saved_phones', JSON.stringify(updatedPhones));
      await AsyncStorage.setItem('telebirr_default_phone', phoneNumber);
      setSavedPhoneNumbers(updatedPhones);
      
      Alert.alert('Saved', 'Phone number saved for future payments');
    } catch (error) {
      console.log('Error saving phone:', error);
    }
  };

  // Validate Ethiopian phone number
  const validatePhoneNumber = (number) => {
    const ethiopianRegex = /^(09\d{8}|9\d{8})$/;
    return ethiopianRegex.test(number.replace(/\s/g, ''));
  };

  // Format phone number display
  const formatPhoneNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  // Authenticate with biometrics
  const authenticateWithBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to confirm payment',
        fallbackLabel: 'Use passcode',
      });
      
      return result.success;
    } catch (error) {
      console.log('Biometric authentication error:', error);
      return false;
    }
  };

  // Process Telebirr payment
  const processTelebirrPayment = async () => {
    // Validation
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid Ethiopian phone number (09XXXXXXXX)');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    // Biometric authentication if enabled
    if (useBiometrics && biometricSupported) {
      const authenticated = await authenticateWithBiometrics();
      if (!authenticated) {
        Alert.alert('Authentication Failed', 'Please authenticate to proceed with payment');
        return;
      }
    }

    setIsLoading(true);
    setPaymentStatus('processing');

    try {
      // Generate a unique transaction ID
      const txId = `TBR${Date.now()}${Math.floor(Math.random() * 1000)}`;
      setTransactionId(txId);

      // Calculate charges
      const charges = calculateCharges();

      // Prepare payment data
      const paymentData = {
        phoneNumber: phoneNumber.replace(/\s/g, ''),
        amount: charges.amount,
        transactionId: txId,
        description: description || 'Payment via Telebirr',
        timestamp: new Date().toISOString(),
        charges: {
          fee: charges.fee,
          total: charges.total,
        },
      };

      // In a real app, you would call your backend API here
      // const response = await fetch(`${Constants.expoConfig.extra.apiUrl}/payments/telebirr`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`,
      //   },
      //   body: JSON.stringify(paymentData),
      // });

      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate successful payment
      // const result = await response.json();
      const simulatedResult = {
        success: true,
        data: {
          transactionId: txId,
          status: 'completed',
          message: 'Payment successful',
          reference: `TBR-REF-${Date.now()}`,
          paymentData,
        },
      };

      if (simulatedResult.success) {
        setPaymentStatus('success');
        
        // Save successful transaction
        await saveTransaction(simulatedResult.data);
        
        // Navigate to success screen after delay
        setTimeout(() => {
          router.replace({
            pathname: '/payment-success',
            params: {
              transactionId: txId,
              amount: charges.total,
              phoneNumber: phoneNumber,
              method: 'Telebirr',
              reference: simulatedResult.data.reference,
            },
          });
        }, 2000);
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.log('Payment error:', error);
      setPaymentStatus('failed');
      
      Alert.alert(
        'Payment Failed',
        'Unable to process payment. Please try again.',
        [
          { text: 'Try Again', onPress: () => setPaymentStatus('pending') },
          { text: 'Cancel', onPress: () => router.back() },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Save transaction to local storage
  const saveTransaction = async (transactionData) => {
    try {
      const existingTransactions = await AsyncStorage.getItem('payment_transactions');
      const transactions = existingTransactions ? JSON.parse(existingTransactions) : [];
      
      transactions.unshift({
        ...transactionData,
        id: transactionData.transactionId,
        date: new Date().toISOString(),
        method: 'Telebirr',
      });
      
      await AsyncStorage.setItem('payment_transactions', JSON.stringify(transactions.slice(0, 50))); // Keep last 50 transactions
    } catch (error) {
      console.log('Error saving transaction:', error);
    }
  };

  // Render payment status
  const renderPaymentStatus = () => {
    switch (paymentStatus) {
      case 'processing':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.statusText}>Processing payment...</Text>
            <Text style={styles.statusSubText}>Please wait while we process your payment</Text>
          </View>
        );
      case 'success':
        return (
          <View style={[styles.statusContainer, styles.successContainer]}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            <Text style={styles.statusText}>Payment Successful!</Text>
            <Text style={styles.statusSubText}>Transaction ID: {transactionId}</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.statusContainer, styles.errorContainer]}>
            <Ionicons name="close-circle" size={80} color="#F44336" />
            <Text style={styles.statusText}>Payment Failed</Text>
            <Text style={styles.statusSubText}>Please try again</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // Calculate charges display
  const charges = calculateCharges();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Telebirr Payment</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Payment Status Overlay */}
          {paymentStatus !== 'pending' && (
            <View style={styles.overlay}>
              {renderPaymentStatus()}
            </View>
          )}

          {/* Payment Form */}
          <View style={styles.formContainer}>
            {/* Telebirr Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="phone-portrait" size={50} color="#4CAF50" />
                <Text style={styles.logoText}>Telebirr</Text>
              </View>
            </View>

            {/* Amount Display */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>{charges.total.toFixed(2)} ETB</Text>
              <Text style={styles.amountBreakdown}>
                Amount: {charges.amount.toFixed(2)} ETB + Fee: {charges.fee.toFixed(2)} ETB
              </Text>
            </View>

            {/* Phone Number Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.countryCode}>+251</Text>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.phoneInput}
                  placeholder="9XX XXX XXX"
                  value={formatPhoneNumber(phoneNumber)}
                  onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={12} // 9 digits + spaces
                  editable={!isLoading}
                />
                {phoneNumber && (
                  <TouchableOpacity
                    onPress={() => setPhoneNumber('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Phone Number Validation */}
              {phoneNumber && (
                <View style={styles.validationContainer}>
                  <Ionicons
                    name={validatePhoneNumber(phoneNumber) ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color={validatePhoneNumber(phoneNumber) ? "#4CAF50" : "#F44336"}
                  />
                  <Text style={[
                    styles.validationText,
                    { color: validatePhoneNumber(phoneNumber) ? "#4CAF50" : "#F44336" }
                  ]}>
                    {validatePhoneNumber(phoneNumber) ? "Valid Ethiopian number" : "Invalid phone number format"}
                  </Text>
                </View>
              )}
            </View>

            {/* Saved Phone Numbers */}
            {savedPhoneNumbers.length > 0 && (
              <View style={styles.savedContainer}>
                <Text style={styles.savedTitle}>Saved Numbers</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {savedPhoneNumbers.map((phone, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.savedPhoneButton}
                      onPress={() => handleSelectSavedPhone(phone)}
                      disabled={isLoading}
                    >
                      <Ionicons name="phone-portrait" size={16} color="#4CAF50" />
                      <Text style={styles.savedPhoneText}>{formatPhoneNumber(phone)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Description Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Add payment description"
                value={description}
                onChangeText={setDescription}
                editable={!isLoading}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Biometric Authentication Toggle */}
            {biometricSupported && (
              <View style={styles.biometricContainer}>
                <TouchableOpacity
                  style={styles.biometricToggle}
                  onPress={() => setUseBiometrics(!useBiometrics)}
                  disabled={isLoading}
                >
                  <View style={styles.toggleContainer}>
                    <Ionicons
                      name={useBiometrics ? "finger-print" : "finger-print-outline"}
                      size={24}
                      color={useBiometrics ? "#4CAF50" : "#666"}
                    />
                    <View style={styles.toggleTextContainer}>
                      <Text style={styles.biometricTitle}>Biometric Authentication</Text>
                      <Text style={styles.biometricSubtitle}>
                        {useBiometrics ? "Enabled - Requires fingerprint/face ID" : "Enable for extra security"}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.toggleSwitch,
                    useBiometrics && styles.toggleSwitchActive
                  ]}>
                    <View style={styles.toggleKnob} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Payment Terms */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By proceeding, you agree to Telebirr's terms of service. A transaction fee of {telebirrCharges.feePercentage}% (min {telebirrCharges.minFee} ETB, max {telebirrCharges.maxFee} ETB) applies.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[
                  styles.payButton,
                  (!validatePhoneNumber(phoneNumber) || !amount || isLoading) && styles.payButtonDisabled
                ]}
                onPress={processTelebirrPayment}
                disabled={!validatePhoneNumber(phoneNumber) || !amount || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={20} color="#FFF" />
                    <Text style={styles.payButtonText}>Pay {charges.total.toFixed(2)} ETB</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={savePhoneNumber}
                disabled={!validatePhoneNumber(phoneNumber) || isLoading}
              >
                <Ionicons name="save-outline" size={20} color="#4CAF50" />
                <Text style={styles.saveButtonText}>Save Phone Number</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel Payment</Text>
              </TouchableOpacity>
            </View>

            {/* Telebirr Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>How to pay with Telebirr:</Text>
              <View style={styles.instructionStep}>
                <Text style={styles.instructionNumber}>1</Text>
                <Text style={styles.instructionText}>Enter your Telebirr registered phone number</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.instructionNumber}>2</Text>
                <Text style={styles.instructionText}>Check the amount and transaction fee</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.instructionNumber}>3</Text>
                <Text style={styles.instructionText}>Tap "Pay" and authorize payment on your phone</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.instructionNumber}>4</Text>
                <Text style={styles.instructionText}>You'll receive a confirmation SMS</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 34,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 30,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 15,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 15,
  },
  statusText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  statusSubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  amountContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  amountBreakdown: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    height: 56,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  clearButton: {
    padding: 5,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  validationText: {
    fontSize: 14,
    marginLeft: 6,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  savedContainer: {
    marginBottom: 20,
  },
  savedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  savedPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  savedPhoneText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 6,
  },
  biometricContainer: {
    marginBottom: 20,
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleTextContainer: {
    marginLeft: 12,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  biometricSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#4CAF50',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  termsContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  actionContainer: {
    marginBottom: 30,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
  },
  payButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 10,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 10,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 15,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  instructionsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});

export default TelebirrPaymentScreen;