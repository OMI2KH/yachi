import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL;

const PaymentWebview = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const webViewRef = useRef(null);
  
  const {
    amount,
    projectId,
    projectTitle,
    provider = 'chapa', // Default to Chapa
    paymentMethodId,
  } = params;
  
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, success, failed
  const [error, setError] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amount,
    projectId,
    provider,
  });

  // Ethiopian payment providers configuration
  const PROVIDER_CONFIG = {
    chapa: {
      name: 'Chapa',
      color: '#4CAF50',
      icon: 'card',
      description: 'Pay via Chapa (Cards, Mobile Banking, Telebirr)',
    },
    telebirr: {
      name: 'Telebirr',
      color: '#2196F3',
      icon: 'phone-portrait',
      description: 'Pay via Telebirr Mobile Money',
    },
    cbe_birr: {
      name: 'CBE Birr',
      color: '#FF9800',
      icon: 'phone-portrait',
      description: 'Pay via CBE Birr Mobile Banking',
    },
  };

  useEffect(() => {
    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert(
          'Authentication Required',
          'Please login to continue with payment',
          [
            {
              text: 'Login',
              onPress: () => router.replace('/(auth)/login'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/payments/initialize`,
        {
          amount: parseFloat(amount),
          projectId,
          provider,
          paymentMethodId,
          currency: 'ETB',
          metadata: {
            platform: 'mobile',
            projectTitle,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success && response.data.data.checkout_url) {
        setPaymentUrl(response.data.data.checkout_url);
      } else {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }
    } catch (err) {
      console.error('Payment initialization error:', err);
      setError(err.response?.data?.message || err.message || 'Payment initialization failed');
      Alert.alert(
        'Payment Error',
        err.response?.data?.message || err.message || 'Failed to initialize payment',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewNavigation = (navState) => {
    const { url } = navState;
    
    // Check for payment success/failure URLs
    if (url.includes('/payment/success') || url.includes('/payment/verify')) {
      verifyPayment();
    } else if (url.includes('/payment/failed') || url.includes('/payment/cancel')) {
      handlePaymentFailure();
    }
    
    // Check for Chapa specific URLs
    if (url.includes('chapa.co/checkout/')) {
      if (url.includes('success')) {
        verifyPayment();
      } else if (url.includes('failed') || url.includes('cancel')) {
        handlePaymentFailure();
      }
    }
  };

  const verifyPayment = async () => {
    try {
      setPaymentStatus('processing');
      setLoading(true);
      
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `${API_URL}/api/payments/verify/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setPaymentStatus('success');
        
        // Show success message
        Alert.alert(
          'Payment Successful!',
          `Your payment of ETB ${amount} has been processed successfully.`,
          [
            {
              text: 'View Project',
              onPress: () => router.replace(`/project/${projectId}`),
            },
            {
              text: 'Back to Projects',
              onPress: () => router.replace('/(tabs)/projects'),
            },
          ]
        );
      } else {
        throw new Error(response.data.message || 'Payment verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setPaymentStatus('failed');
      Alert.alert(
        'Verification Failed',
        'We received your payment but could not verify it. Please contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFailure = () => {
    setPaymentStatus('failed');
    Alert.alert(
      'Payment Failed',
      'Your payment was not completed. Please try again or use a different payment method.',
      [
        {
          text: 'Try Again',
          onPress: () => {
            setPaymentStatus('pending');
            initializePayment();
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const retryPayment = () => {
    setPaymentStatus('pending');
    setError(null);
    initializePayment();
  };

  const renderHeader = () => {
    const providerConfig = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.chapa;
    
    return (
      <View style={[styles.header, { backgroundColor: providerConfig.color }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (paymentStatus === 'processing') {
              Alert.alert(
                'Payment in Progress',
                'Your payment is being processed. Are you sure you want to leave?',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Leave', onPress: () => router.back() },
                ]
              );
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Ionicons name={providerConfig.icon} size={28} color="#fff" />
          <Text style={styles.headerTitle}>Pay with {providerConfig.name}</Text>
        </View>
        
        <View style={styles.amountBadge}>
          <Text style={styles.amountText}>ETB {parseFloat(amount).toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={PROVIDER_CONFIG[provider]?.color || '#4CAF50'} />
      <Text style={styles.loadingText}>
        {paymentStatus === 'processing' 
          ? 'Verifying your payment...' 
          : 'Loading payment gateway...'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="alert-circle" size={64} color="#FF3B30" />
      <Text style={styles.errorTitle}>Payment Error</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      
      <TouchableOpacity style={styles.retryButton} onPress={retryPayment}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.backButtonOutline}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWebView = () => (
    <WebView
      ref={webViewRef}
      source={{ uri: paymentUrl }}
      style={styles.webview}
      onLoadStart={() => setLoading(true)}
      onLoadEnd={() => setLoading(false)}
      onNavigationStateChange={handleWebViewNavigation}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error:', nativeEvent);
        setError('Failed to load payment page. Please check your internet connection.');
      }}
      onHttpError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView HTTP error:', nativeEvent);
        setError(`Payment gateway error (${nativeEvent.statusCode})`);
      }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      scalesPageToFit={true}
      mixedContentMode="always"
      thirdPartyCookiesEnabled={true}
      userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
      renderLoading={renderLoading}
    />
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {renderHeader()}
        {renderError()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {renderHeader()}
      
      {paymentUrl ? (
        renderWebView()
      ) : (
        <View style={styles.centerContainer}>
          {loading ? (
            renderLoading()
          ) : (
            <View style={styles.paymentInfo}>
              <Ionicons name="lock-closed" size={48} color="#4CAF50" />
              <Text style={styles.securityText}>Secure Payment</Text>
              <Text style={styles.infoText}>
                You'll be redirected to {PROVIDER_CONFIG[provider]?.name}'s secure payment page
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Overlay loader */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      
      {/* Payment Status Banner */}
      {paymentStatus === 'success' && (
        <View style={[styles.statusBanner, styles.successBanner]}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.statusText}>Payment Successful!</Text>
        </View>
      )}
      
      {paymentStatus === 'failed' && (
        <View style={[styles.statusBanner, styles.errorBanner]}>
          <Ionicons name="close-circle" size={24} color="#fff" />
          <Text style={styles.statusText}>Payment Failed</Text>
        </View>
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  amountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonOutline: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    alignItems: 'center',
    padding: 24,
  },
  securityText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  statusBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  successBanner: {
    backgroundColor: '#4CAF50',
  },
  errorBanner: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentWebview;