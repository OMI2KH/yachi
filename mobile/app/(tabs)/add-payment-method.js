import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CardField, useConfirmPayment } from '@stripe/stripe-react-native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  AntDesign
} from '@expo/vector-icons';

// Custom Components
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PaymentMethodCard from '../../components/payment/PaymentMethodCard';

const AddPaymentMethod = () => {
  const router = useRouter();
  const { confirmPayment } = useConfirmPayment();
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Form state
  const [selectedMethod, setSelectedMethod] = useState('mobile_money');
  const [selectedProvider, setSelectedProvider] = useState('telebirr');
  const [isDefault, setIsDefault] = useState(false);
  
  // Form fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [cardDetails, setCardDetails] = useState(null);
  const [bankAccount, setBankAccount] = useState('');
  const [pin, setPin] = useState('');
  
  // UI state
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: Select method, 2: Enter details

  // Ethiopian payment providers configuration
  const PAYMENT_PROVIDERS = {
    telebirr: {
      name: 'Telebirr',
      icon: 'cellphone',
      color: '#2D5BFF',
      description: 'Ethio Telecom Mobile Money',
      supportedMethods: ['mobile_money']
    },
    cbe_birr: {
      name: 'CBE Birr',
      icon: 'bank',
      color: '#006400',
      description: 'Commercial Bank of Ethiopia',
      supportedMethods: ['mobile_money', 'bank_account']
    },
    chapa: {
      name: 'Chapa',
      icon: 'credit-card',
      color: '#FF6B35',
      description: 'Payment Gateway',
      supportedMethods: ['card', 'bank_account']
    }
  };

  useEffect(() => {
    loadUserData();
    loadExistingPaymentMethods();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadExistingPaymentMethods = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data);
        
        // Check if user already has a default payment method
        const hasDefault = data.some(method => method.isDefault);
        setIsDefault(!hasDefault); // Set as default if no existing default
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (selectedMethod === 'mobile_money') {
      if (!phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!/^09\d{8}$/.test(phoneNumber)) {
        newErrors.phoneNumber = 'Please enter a valid Ethiopian phone number (09XXXXXXXX)';
      }
      
      if (selectedProvider === 'telebirr' && !pin) {
        newErrors.pin = 'PIN is required for Telebirr';
      }
    }

    if (selectedMethod === 'card' && !cardDetails?.complete) {
      newErrors.card = 'Please enter valid card details';
    }

    if (selectedMethod === 'bank_account') {
      if (!accountName.trim()) {
        newErrors.accountName = 'Account name is required';
      }
      if (!bankAccount.trim()) {
        newErrors.bankAccount = 'Account number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPaymentMethod = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Prepare payment method data based on selected type
      let paymentData = {
        methodType: selectedMethod,
        provider: selectedProvider,
        isDefault,
        currency: 'ETB'
      };

      // Add type-specific data
      switch (selectedMethod) {
        case 'mobile_money':
          paymentData.metadata = {
            phoneNumber: phoneNumber,
            provider: selectedProvider
          };
          if (selectedProvider === 'telebirr') {
            paymentData.metadata.pin = pin; // Note: In production, this should be encrypted
          }
          break;
          
        case 'card':
          paymentData.metadata = {
            cardLastFour: cardDetails?.last4,
            cardBrand: cardDetails?.brand,
            expiryMonth: cardDetails?.expiryMonth,
            expiryYear: cardDetails?.expiryYear
          };
          paymentData.lastFour = cardDetails?.last4;
          paymentData.expiryMonth = cardDetails?.expiryMonth;
          paymentData.expiryYear = cardDetails?.expiryYear;
          break;
          
        case 'bank_account':
          paymentData.metadata = {
            accountName,
            accountNumber: bankAccount,
            bankName: selectedProvider === 'cbe_birr' ? 'Commercial Bank of Ethiopia' : 'Other Bank'
          };
          break;
      }

      const response = await fetch(`${API_URL}/payment-methods`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Payment method added successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.back();
                router.replace('/(tabs)/payment-methods');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to add payment method');
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <Animatable.View 
      animation="fadeIn" 
      duration={500}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>Select Payment Method</Text>
      <Text style={styles.stepDescription}>
        Choose how you want to pay for Ethiopian services
      </Text>

      <View style={styles.methodGrid}>
        {/* Mobile Money Option */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedMethod === 'mobile_money' && styles.methodCardSelected
          ]}
          onPress={() => setSelectedMethod('mobile_money')}
        >
          <View style={styles.methodIconContainer}>
            <Ionicons 
              name="phone-portrait" 
              size={32} 
              color={selectedMethod === 'mobile_money' ? '#2D5BFF' : '#666'} 
            />
          </View>
          <Text style={styles.methodTitle}>Mobile Money</Text>
          <Text style={styles.methodDescription}>
            Pay with Telebirr or CBE Birr
          </Text>
          {selectedMethod === 'mobile_money' && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={24} color="#2D5BFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Card Option */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedMethod === 'card' && styles.methodCardSelected
          ]}
          onPress={() => setSelectedMethod('card')}
        >
          <View style={styles.methodIconContainer}>
            <FontAwesome 
              name="credit-card" 
              size={32} 
              color={selectedMethod === 'card' ? '#2D5BFF' : '#666'} 
            />
          </View>
          <Text style={styles.methodTitle}>Card</Text>
          <Text style={styles.methodDescription}>
            Credit/Debit Card via Chapa
          </Text>
          {selectedMethod === 'card' && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={24} color="#2D5BFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Bank Account Option */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedMethod === 'bank_account' && styles.methodCardSelected
          ]}
          onPress={() => setSelectedMethod('bank_account')}
        >
          <View style={styles.methodIconContainer}>
            <MaterialIcons 
              name="account-balance" 
              size={32} 
              color={selectedMethod === 'bank_account' ? '#2D5BFF' : '#666'} 
            />
          </View>
          <Text style={styles.methodTitle}>Bank Account</Text>
          <Text style={styles.methodDescription}>
            Direct bank transfer
          </Text>
          {selectedMethod === 'bank_account' && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={24} color="#2D5BFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Provider Selection for Mobile Money */}
      {selectedMethod === 'mobile_money' && (
        <View style={styles.providerSection}>
          <Text style={styles.sectionTitle}>Select Provider</Text>
          <View style={styles.providerGrid}>
            {Object.entries(PAYMENT_PROVIDERS)
              .filter(([key, provider]) => provider.supportedMethods.includes('mobile_money'))
              .map(([key, provider]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.providerCard,
                    selectedProvider === key && styles.providerCardSelected
                  ]}
                  onPress={() => setSelectedProvider(key)}
                >
                  <View style={[styles.providerIcon, { backgroundColor: provider.color }]}>
                    <MaterialIcons name={provider.icon} size={24} color="#FFF" />
                  </View>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  {selectedProvider === key && (
                    <View style={styles.providerCheck}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}

      <View style={styles.nextButtonContainer}>
        <Button
          title="Next"
          onPress={() => setStep(2)}
          icon="arrow-forward"
          gradient
          style={styles.nextButton}
        />
      </View>
    </Animatable.View>
  );

  const renderDetailsForm = () => {
    const selectedProviderConfig = PAYMENT_PROVIDERS[selectedProvider];

    return (
      <Animatable.View 
        animation="slideInRight" 
        duration={500}
        style={styles.stepContainer}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(1)}
        >
          <Ionicons name="arrow-back" size={24} color="#2D5BFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.methodHeader}>
          <View style={[styles.headerIcon, { backgroundColor: selectedProviderConfig.color }]}>
            <MaterialIcons 
              name={selectedProviderConfig.icon} 
              size={32} 
              color="#FFF" 
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Add {selectedProviderConfig.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {selectedProviderConfig.description}
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Mobile Money Form */}
          {selectedMethod === 'mobile_money' && (
            <View style={styles.formSection}>
              <Input
                label="Phone Number"
                placeholder="09XXXXXXXX"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                error={errors.phoneNumber}
                icon="phone"
                required
                maxLength={10}
              />
              
              {selectedProvider === 'telebirr' && (
                <Input
                  label="PIN"
                  placeholder="Enter your Telebirr PIN"
                  value={pin}
                  onChangeText={setPin}
                  secureTextEntry={!showPin}
                  error={errors.pin}
                  icon="lock"
                  required
                  maxLength={4}
                  keyboardType="number-pad"
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPin(!showPin)}>
                      <Ionicons
                        name={showPin ? 'eye-off' : 'eye'}
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  }
                />
              )}

              {selectedProvider === 'cbe_birr' && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#2D5BFF" />
                  <Text style={styles.infoText}>
                    Make sure your phone number is registered with CBE Birr
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Card Form */}
          {selectedMethod === 'card' && (
            <View style={styles.formSection}>
              <View style={styles.cardInputContainer}>
                <Text style={styles.inputLabel}>Card Details *</Text>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{
                    number: '4242 4242 4242 4242',
                    expiration: 'MM/YY',
                    cvc: 'CVC'
                  }}
                  cardStyle={styles.cardField}
                  style={styles.cardFieldContainer}
                  onCardChange={(cardDetails) => {
                    setCardDetails(cardDetails);
                  }}
                />
                {errors.card && (
                  <Text style={styles.errorText}>{errors.card}</Text>
                )}
              </View>

              <View style={styles.infoBox}>
                <FontAwesome name="lock" size={16} color="#2D5BFF" />
                <Text style={styles.infoText}>
                  Card details are securely processed via Chapa. We never store your full card information.
                </Text>
              </View>
            </View>
          )}

          {/* Bank Account Form */}
          {selectedMethod === 'bank_account' && (
            <View style={styles.formSection}>
              <Input
                label="Account Holder Name"
                placeholder="John Doe"
                value={accountName}
                onChangeText={setAccountName}
                error={errors.accountName}
                icon="person"
                required
              />
              
              <Input
                label="Account Number"
                placeholder="Enter account number"
                value={bankAccount}
                onChangeText={setBankAccount}
                keyboardType="number-pad"
                error={errors.bankAccount}
                icon="account-balance"
                required
              />
              
              {selectedProvider === 'cbe_birr' && (
                <View style={styles.infoBox}>
                  <MaterialIcons name="verified" size={20} color="#006400" />
                  <Text style={styles.infoText}>
                    Commercial Bank of Ethiopia - Direct Integration
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Default Payment Method Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setIsDefault(!isDefault)}
              activeOpacity={0.7}
            >
              <View style={styles.toggleLeft}>
                <Ionicons 
                  name={isDefault ? 'star' : 'star-outline'} 
                  size={24} 
                  color="#FFD700" 
                />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Set as default</Text>
                  <Text style={styles.toggleDescription}>
                    Use this as your primary payment method
                  </Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, isDefault && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, isDefault && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Existing Payment Methods */}
          {paymentMethods.length > 0 && (
            <View style={styles.existingMethods}>
              <Text style={styles.sectionTitle}>Your Payment Methods</Text>
              {paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  isDefault={method.isDefault}
                  onPress={() => {}}
                  showMore={false}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.actionButtons}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title={loading ? "Adding..." : "Add Payment Method"}
            onPress={handleAddPaymentMethod}
            icon="check-circle"
            gradient
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </View>
      </Animatable.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#F8F9FF', '#FFFFFF']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Payment Method</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View style={styles.progressSteps}>
              <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
                <Text style={[styles.progressText, step >= 1 && styles.progressTextActive]}>
                  1
                </Text>
              </View>
              <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
              <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
                <Text style={[styles.progressText, step >= 2 && styles.progressTextActive]}>
                  2
                </Text>
              </View>
            </View>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabel, step >= 1 && styles.progressLabelActive]}>
                Select Method
              </Text>
              <Text style={[styles.progressLabel, step >= 2 && styles.progressLabelActive]}>
                Enter Details
              </Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {step === 1 ? renderMethodSelection() : renderDetailsForm()}
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2D5BFF',
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 36,
  },
  progressContainer: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: {
    backgroundColor: '#2D5BFF',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressTextActive: {
    color: '#FFF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
  },
  progressLineActive: {
    backgroundColor: '#2D5BFF',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  progressLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  progressLabelActive: {
    color: '#2D5BFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  methodCard: {
    width: '30%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    marginBottom: 15,
  },
  methodCardSelected: {
    borderColor: '#2D5BFF',
    backgroundColor: '#F5F8FF',
  },
  methodIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  methodDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  providerSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  providerGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
  },
  providerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    minWidth: 100,
    position: 'relative',
  },
  providerCardSelected: {
    borderColor: '#2D5BFF',
    backgroundColor: '#F5F8FF',
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  providerCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#2D5BFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  nextButtonContainer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  nextButton: {
    borderRadius: 12,
    height: 56,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5BFF',
    marginLeft: 8,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  formSection: {
    marginBottom: 30,
  },
  cardInputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardField: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    placeholderColor: '#999',
  },
  cardFieldContainer: {
    height: 50,
    marginVertical: 10,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#2D5BFF',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  toggleContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#666',
  },
  toggleSwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#2D5BFF',
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  existingMethods: {
    marginBottom: 30,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    height: 56,
  },
  submitButton: {
    flex: 2,
    borderRadius: 12,
    height: 56,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default AddPaymentMethod;