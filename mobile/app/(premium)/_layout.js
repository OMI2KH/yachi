import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  StatusBar,
  BackHandler,
  Alert
} from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';

// Context & Hooks
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { usePayment } from '@/hooks/usePayment';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Components
import PremiumHeader from '@/components/premium/PremiumHeader';
import NetworkStatusBar from '@/components/common/NetworkStatusBar';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PaymentStatusModal from '@/components/payment/PaymentStatusModal';
import ConnectionErrorModal from '@/components/common/ConnectionErrorModal';

// Constants
import { ETHIOPIAN_PAYMENT_PROVIDERS, PREMIUM_PLANS } from '@/constants/payment';
import { COLORS, SIZES, FONTS } from '@/constants/theme';

export default function PremiumLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  // Context & State
  const { user, isAuthenticated } = useAuth();
  const { 
    isPremium, 
    isLoading: premiumLoading, 
    refreshPremiumStatus,
    currentPlan 
  } = usePremium();
  
  const {
    initializePayment,
    paymentStatus,
    isProcessing,
    resetPayment,
    selectedProvider,
    setSelectedProvider
  } = usePayment();
  
  const { isConnected, isInternetReachable } = useNetworkStatus();
  
  // Local state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Handle back button press
  useEffect(() => {
    const onBackPress = () => {
      const currentSegment = segments[segments.length - 1];
      
      if (currentSegment === 'index') {
        // If on main premium page, navigate to home
        router.replace('/(tabs)/home');
        return true;
      }
      
      // Allow default back behavior for other screens
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, [segments, router]);

  // Handle payment status changes
  useEffect(() => {
    if (paymentStatus) {
      setShowPaymentModal(true);
      
      // If payment was successful, refresh premium status after delay
      if (paymentStatus === 'success') {
        setTimeout(() => {
          refreshPremiumStatus();
        }, 2000);
      }
    }
  }, [paymentStatus]);

  // Check internet connection for payment flows
  useEffect(() => {
    if (!isConnected || !isInternetReachable) {
      setShowConnectionModal(true);
    }
  }, [isConnected, isInternetReachable]);

  // Handle plan selection and payment initiation
  const handlePlanSelect = async (plan) => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }

    if (!isConnected || !isInternetReachable) {
      setShowConnectionModal(true);
      return;
    }

    setSelectedPlan(plan);
    
    // For premium users trying to upgrade/downgrade
    if (isPremium) {
      Alert.alert(
        'Change Subscription',
        `You are currently on the ${currentPlan?.name || 'Premium'} plan. Do you want to switch to ${plan.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Switch Plan', 
            style: 'default',
            onPress: () => initiatePayment(plan)
          }
        ]
      );
    } else {
      initiatePayment(plan);
    }
  };

  const initiatePayment = async (plan) => {
    try {
      // Show provider selection or use default
      const provider = ETHIOPIAN_PAYMENT_PROVIDERS[0]; // Default to first provider
      setSelectedProvider(provider);
      
      await initializePayment({
        planId: plan.id,
        amount: plan.price,
        currency: 'ETB',
        userId: user.id,
        provider: provider.id,
        metadata: {
          planName: plan.name,
          features: plan.features.join(', ')
        }
      });
      
      // Navigate to payment screen
      router.push({
        pathname: '/(premium)/payment',
        params: { 
          planId: plan.id,
          provider: provider.id
        }
      });
    } catch (error) {
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to initialize payment. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle payment modal close
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    resetPayment();
    
    if (paymentStatus === 'success') {
      // Navigate to premium success screen or back to premium home
      router.replace('/(premium)/success');
    } else if (paymentStatus === 'failed') {
      // Stay on current screen for retry
      router.replace('/(premium)/');
    }
  };

  // Handle retry connection
  const handleRetryConnection = () => {
    setShowConnectionModal(false);
    refreshPremiumStatus();
  };

  // Render screen-specific header configuration
  const getHeaderConfig = () => {
    const currentScreen = segments[segments.length - 1];
    
    switch (currentScreen) {
      case 'index':
        return {
          title: 'Go Premium',
          headerRight: () => (
            <Ionicons 
              name="help-circle-outline" 
              size={24} 
              color={colors.text}
              onPress={() => router.push('/(premium)/faq')}
              style={{ marginRight: 15 }}
            />
          )
        };
      
      case 'payment':
        return {
          title: 'Complete Payment',
          headerLeft: () => (
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={colors.text}
              onPress={() => {
                if (isProcessing) {
                  Alert.alert(
                    'Payment in Progress',
                    'Are you sure you want to cancel this payment?',
                    [
                      { text: 'Continue Payment', style: 'cancel' },
                      { 
                        text: 'Cancel Payment', 
                        style: 'destructive',
                        onPress: () => {
                          resetPayment();
                          router.back();
                        }
                      }
                    ]
                  );
                } else {
                  router.back();
                }
              }}
              style={{ marginLeft: 15 }}
            />
          )
        };
      
      case 'success':
        return {
          title: 'Welcome to Premium!',
          headerLeft: null, // Disable back button
          headerRight: () => (
            <Ionicons 
              name="close" 
              size={24} 
              color={colors.text}
              onPress={() => router.replace('/(tabs)/home')}
              style={{ marginRight: 15 }}
            />
          )
        };
      
      case 'faq':
        return {
          title: 'Premium FAQ'
        };
      
      default:
        return {
          title: 'Premium'
        };
    }
  };

  const headerConfig = getHeaderConfig();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.primary}
        translucent
      />
      
      <NetworkStatusBar />
      
      <Stack
        screenOptions={{
          headerShown: true,
          header: (props) => (
            <PremiumHeader
              {...props}
              isPremium={isPremium}
              title={headerConfig.title}
              headerRight={headerConfig.headerRight}
              headerLeft={headerConfig.headerLeft}
            />
          ),
          contentStyle: {
            backgroundColor: colors.background
          },
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: true,
            header: (props) => (
              <PremiumHeader
                {...props}
                isPremium={isPremium}
                title="Go Premium"
                headerRight={headerConfig.headerRight}
                showPlanBadge={true}
              />
            )
          }}
        />
        
        <Stack.Screen
          name="payment"
          options={{
            headerShown: true,
            gestureEnabled: !isProcessing
          }}
        />
        
        <Stack.Screen
          name="success"
          options={{
            headerShown: true,
            gestureEnabled: false
          }}
        />
        
        <Stack.Screen
          name="faq"
          options={{
            headerShown: true,
            presentation: 'modal'
          }}
        />
        
        <Stack.Screen
          name="webhook-handler"
          options={{
            headerShown: false,
            presentation: 'transparentModal'
          }}
        />
      </Stack>
      
      {/* Loading Overlay */}
      {(premiumLoading || isProcessing || isVerifying) && (
        <LoadingOverlay 
          message={
            isProcessing ? 'Processing payment...' :
            isVerifying ? 'Verifying subscription...' :
            'Loading...'
          }
        />
      )}
      
      {/* Payment Status Modal */}
      <PaymentStatusModal
        visible={showPaymentModal}
        status={paymentStatus}
        onClose={handlePaymentModalClose}
        planName={selectedPlan?.name}
        provider={selectedProvider?.name}
      />
      
      {/* Connection Error Modal */}
      <ConnectionErrorModal
        visible={showConnectionModal}
        onRetry={handleRetryConnection}
        onClose={() => setShowConnectionModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.white,
    fontWeight: '600'
  }
});