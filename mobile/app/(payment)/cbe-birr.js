import { Stack } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useState, useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';

export default function PaymentLayout() {
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  // Handle Android navigation bar styling
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(
        colorScheme === 'dark' ? '#000' : '#fff'
      );
      NavigationBar.setButtonStyleAsync(
        colorScheme === 'dark' ? 'light' : 'dark'
      );
    }
    setIsReady(true);
  }, [colorScheme]);

  // Custom header component
  const CustomHeader = ({ title, showBack = true }) => (
    <View style={[
      styles.header,
      colorScheme === 'dark' ? styles.headerDark : styles.headerLight
    ]}>
      {showBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      )}
      <Text style={[
        styles.headerTitle,
        colorScheme === 'dark' ? styles.headerTitleDark : styles.headerTitleLight
      ]}>
        {title}
      </Text>
      <View style={styles.headerRight} />
    </View>
  );

  // Payment provider icons mapping
  const getPaymentIcon = (provider) => {
    switch (provider) {
      case 'telebirr':
        return '📱'; // or use a custom icon
      case 'chapa':
        return '💳';
      case 'cbe_birr':
        return '🏦';
      default:
        return '💰';
    }
  };

  if (!isReady) {
    return null; // Or a loading screen
  }

  return (
    <>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={colorScheme === 'dark' ? '#000' : '#fff'}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colorScheme === 'dark' ? '#000' : '#fff'
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            header: () => (
              <CustomHeader title="Payment Methods" showBack={false} />
            ),
          }}
        />
        <Stack.Screen
          name="add-method"
          options={{
            header: () => <CustomHeader title="Add Payment Method" />,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="checkout"
          options={{
            header: () => <CustomHeader title="Checkout" />,
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="success"
          options={{
            header: () => <CustomHeader title="Payment Successful" />,
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="failed"
          options={{
            header: () => <CustomHeader title="Payment Failed" />,
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            header: () => <CustomHeader title="Payment History" />,
          }}
        />
        <Stack.Screen
          name="[id]"
          options={{
            header: () => <CustomHeader title="Payment Details" />,
          }}
        />
        <Stack.Screen
          name="verify"
          options={{
            header: () => <CustomHeader title="Verify Payment" />,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="providers"
          options={{
            header: () => <CustomHeader title="Select Provider" />,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="bank-transfer"
          options={{
            header: () => <CustomHeader title="Bank Transfer" />,
          }}
        />
        <Stack.Screen
          name="mobile-money"
          options={{
            header: () => <CustomHeader title="Mobile Money" />,
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerDark: {
    backgroundColor: '#000',
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLight: {
    backgroundColor: '#fff',
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerTitleDark: {
    color: '#fff',
  },
  headerTitleLight: {
    color: '#000',
  },
  headerRight: {
    width: 40, // Same as back button for balance
  },
});

// Payment Provider Configuration
export const PAYMENT_PROVIDERS = {
  telebirr: {
    id: 'telebirr',
    name: 'Telebirr',
    description: 'Ethio Telecom Mobile Money',
    icon: '📱',
    colors: {
      primary: '#0057B8', // Ethio Telecom blue
      secondary: '#FFD100',
    },
    supportedMethods: ['mobile_money'],
    minAmount: 1,
    maxAmount: 10000,
    feePercentage: 1.5,
    supportedBanks: [], // Not applicable
    requiresPhone: true,
    phoneFormat: '+2519########',
  },
  chapa: {
    id: 'chapa',
    name: 'Chapa',
    description: 'Payment Gateway',
    icon: '💳',
    colors: {
      primary: '#6C63FF',
      secondary: '#FF6584',
    },
    supportedMethods: ['card', 'bank_account', 'mobile_money'],
    minAmount: 10,
    maxAmount: 50000,
    feePercentage: 2.5,
    supportedBanks: [
      'CBE',
      'Awash Bank',
      'Dashen Bank',
      'Abyssinia Bank',
      'Nib Bank',
      'United Bank',
    ],
    requiresPhone: false,
  },
  cbe_birr: {
    id: 'cbe_birr',
    name: 'CBE Birr',
    description: 'Commercial Bank of Ethiopia',
    icon: '🏦',
    colors: {
      primary: '#1E3A8A', // Dark blue
      secondary: '#DC2626', // Red
    },
    supportedMethods: ['mobile_money', 'bank_account'],
    minAmount: 1,
    maxAmount: 25000,
    feePercentage: 1.0,
    supportedBanks: ['CBE'],
    requiresPhone: true,
    phoneFormat: '+2519########',
  },
};

// Helper function to get provider by ID
export const getPaymentProvider = (providerId) => {
  return PAYMENT_PROVIDERS[providerId] || null;
};

// Helper function to validate Ethiopian phone number
export const isValidEthiopianPhone = (phone) => {
  const regex = /^\+2519[0-9]{8}$/;
  return regex.test(phone);
};

// Helper function to format currency (ETB)
export const formatCurrency = (amount) => {
  return `ETB ${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

// Helper function to calculate fees
export const calculateFee = (amount, providerId) => {
  const provider = getPaymentProvider(providerId);
  if (!provider) return 0;
  
  const fee = (amount * provider.feePercentage) / 100;
  return Math.min(fee, 100); // Cap fee at 100 ETB
};

// Helper function to get total amount
export const getTotalAmount = (amount, providerId) => {
  const fee = calculateFee(amount, providerId);
  return amount + fee;
};

// Export constants
export const DEFAULT_CURRENCY = 'ETB';
export const SUPPORTED_PROVIDERS = Object.keys(PAYMENT_PROVIDERS);
export const PAYMENT_METHODS = {
  MOBILE_MONEY: 'mobile_money',
  CARD: 'card',
  BANK_ACCOUNT: 'bank_account',
};

// Type definitions (for TypeScript users)
/**
 * @typedef {Object} PaymentProvider
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 * @property {Object} colors
 * @property {string[]} supportedMethods
 * @property {number} minAmount
 * @property {number} maxAmount
 * @property {number} feePercentage
 * @property {string[]} supportedBanks
 * @property {boolean} requiresPhone
 * @property {string} [phoneFormat]
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {string} id
 * @property {string} userId
 * @property {string} methodType
 * @property {string} provider
 * @property {boolean} isDefault
 * @property {string} [lastFour]
 * @property {string} currency
 * @property {Object} [metadata]
 */