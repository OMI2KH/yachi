import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useUser } from '../../../contexts/user-context';
import { usePayment } from '../../../contexts/payment-context';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { 
  ThemedView, 
  ThemedText 
} from '../../../components/themed-view';
import { 
  Button 
} from '../../../components/ui/button';
import { 
  Card 
} from '../../../components/ui/card';
import { 
  Loading 
} from '../../../components/ui/loading';
import { 
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
import { 
  PaymentMethod 
} from '../../../components/payment/payment-method';
import { 
  PaymentSelector 
} from '../../../components/payment/payment-selector';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  paymentService 
} from '../../../services/payment-service';
import { 
  userService 
} from '../../../services/user-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Payment Methods Management Screen
 * Features: Multi-provider support, security, default payment methods, Ethiopian payment integration
 */
const PaymentMethodsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshUser } = useUser();
  const { 
    paymentMethods, 
    defaultPaymentMethod, 
    refreshPaymentMethods,
    setDefaultPaymentMethod,
    removePaymentMethod 
  } = usePayment();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);
  const [autoTopUp, setAutoTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(500);

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('PaymentMethods');
    }, [])
  );

  // Load payment methods
  const loadPaymentMethods = useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshPaymentMethods();
      
      // Load user preferences
      const userPrefs = await userService.getUserPreferences(user?.id);
      setAutoTopUp(userPrefs?.autoTopUp || false);
      setTopUpAmount(userPrefs?.topUpAmount || 500);
      
      analyticsService.trackEvent('payment_methods_loaded', {
        userId: user?.id,
        methodCount: paymentMethods.length,
        hasDefault: !!defaultPaymentMethod,
      });
    } catch (error) {
      console.error('Error loading payment methods:', error);
      showError('Failed to load payment methods');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refreshPaymentMethods, paymentMethods.length, defaultPaymentMethod]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadPaymentMethods();
    }, [loadPaymentMethods])
  );

  // Handle set default payment method
  const handleSetDefault = async (methodId) => {
    try {
      setIsLoading(true);
      
      await setDefaultPaymentMethod(methodId);
      await refreshPaymentMethods();
      
      analyticsService.trackEvent('default_payment_method_changed', {
        userId: user?.id,
        methodId,
        methodType: paymentMethods.find(m => m.id === methodId)?.type,
      });
      
      showSuccess('Default payment method updated');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      showError('Failed to update default payment method');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete payment method
  const handleDeleteMethod = async (methodId) => {
    try {
      setIsLoading(true);
      
      const method = paymentMethods.find(m => m.id === methodId);
      
      // Prevent deletion if it's the only method
      if (paymentMethods.length <= 1) {
        showError('You must have at least one payment method');
        return;
      }
      
      // Prevent deletion of default method without setting a new one first
      if (methodId === defaultPaymentMethod?.id) {
        showError('Please set another method as default before deleting');
        return;
      }
      
      await removePaymentMethod(methodId);
      await refreshPaymentMethods();
      
      analyticsService.trackEvent('payment_method_deleted', {
        userId: user?.id,
        methodId,
        methodType: method?.type,
      });
      
      showSuccess('Payment method removed');
      setShowDeleteModal(false);
      setMethodToDelete(null);
    } catch (error) {
      console.error('Error deleting payment method:', error);
      showError('Failed to remove payment method');
    } finally {
      setIsLoading(false);
    }
  };

  // Show delete confirmation
  const confirmDelete = (method) => {
    setMethodToDelete(method);
    setShowDeleteModal(true);
    
    analyticsService.trackEvent('payment_method_delete_confirmation', {
      userId: user?.id,
      methodId: method.id,
      methodType: method.type,
    });
  };

  // Handle add new payment method
  const handleAddMethod = () => {
    analyticsService.trackEvent('add_payment_method_click', { userId: user?.id });
    router.push('/(payment)/index');
  };

  // Handle auto top-up toggle
  const handleAutoTopUpToggle = async (value) => {
    try {
      setAutoTopUp(value);
      
      await userService.updateUserPreferences(user?.id, {
        autoTopUp: value,
        topUpAmount: value ? topUpAmount : 0,
      });
      
      analyticsService.trackEvent('auto_top_up_toggled', {
        userId: user?.id,
        enabled: value,
        amount: topUpAmount,
      });
      
      if (value) {
        showSuccess(`Auto top-up enabled for ${topUpAmount} ETB`);
      }
    } catch (error) {
      console.error('Error updating auto top-up:', error);
      setAutoTopUp(!value);
      showError('Failed to update auto top-up settings');
    }
  };

  // Handle top-up amount change
  const handleTopUpAmountChange = async (amount) => {
    try {
      setTopUpAmount(amount);
      
      if (autoTopUp) {
        await userService.updateUserPreferences(user?.id, {
          topUpAmount: amount,
        });
        
        analyticsService.trackEvent('top_up_amount_changed', {
          userId: user?.id,
          amount,
        });
      }
    } catch (error) {
      console.error('Error updating top-up amount:', error);
      showError('Failed to update top-up amount');
    }
  };

  // Handle payment method details view
  const handleViewDetails = (method) => {
    analyticsService.trackEvent('payment_method_details_view', {
      userId: user?.id,
      methodId: method.id,
      methodType: method.type,
    });
    
    // Navigate to method-specific details screen
    switch (method.type) {
      case 'telebirr':
        router.push('/(payment)/telebirr');
        break;
      case 'cbe_birr':
        router.push('/(payment)/cbe-birr');
        break;
      case 'chapa':
        router.push('/(payment)/chapa');
        break;
      default:
        // Show basic details modal
        Alert.alert(
          'Payment Method Details',
          `Type: ${method.type}\nLast 4 digits: ${method.lastFour}\nExpiry: ${method.expiryDate || 'N/A'}`,
          [{ text: 'OK' }]
        );
    }
  };

  // Render payment methods list
  const renderPaymentMethods = () => {
    if (paymentMethods.length === 0) {
      return (
        <Card style={styles.emptyState}>
          <ThemedText style={styles.emptyStateTitle}>
            No Payment Methods
          </ThemedText>
          <ThemedText style={styles.emptyStateText}>
            Add a payment method to make bookings and payments faster
          </ThemedText>
          <Button onPress={handleAddMethod} style={styles.addButton}>
            Add Payment Method
          </Button>
        </Card>
      );
    }

    return paymentMethods.map((method) => (
      <PaymentMethod
        key={method.id}
        method={method}
        isDefault={method.id === defaultPaymentMethod?.id}
        onSetDefault={() => handleSetDefault(method.id)}
        onDelete={() => confirmDelete(method)}
        onViewDetails={() => handleViewDetails(method)}
        isDeletable={paymentMethods.length > 1 && method.id !== defaultPaymentMethod?.id}
        style={styles.paymentMethodCard}
      />
    ));
  };

  // Render auto top-up section
  const renderAutoTopUpSection = () => (
    <Card style={styles.autoTopUpSection}>
      <View style={styles.autoTopUpHeader}>
        <ThemedText style={styles.sectionTitle}>
          Auto Top-Up
        </ThemedText>
        <Switch
          value={autoTopUp}
          onValueChange={handleAutoTopUpToggle}
          trackColor={{ 
            false: theme.colors.border, 
            true: theme.colors.primary 
          }}
          thumbColor={theme.colors.background}
        />
      </View>
      
      <ThemedText style={styles.autoTopUpDescription}>
        Automatically top up your Yachi wallet when balance falls below minimum
      </ThemedText>
      
      {autoTopUp && (
        <View style={styles.topUpAmountSection}>
          <ThemedText style={styles.topUpAmountLabel}>
            Top-up Amount:
          </ThemedText>
          <View style={styles.topUpAmountOptions}>
            {[200, 500, 1000, 2000].map((amount) => (
              <Button
                key={amount}
                variant={topUpAmount === amount ? 'primary' : 'outlined'}
                size="small"
                onPress={() => handleTopUpAmountChange(amount)}
                style={styles.topUpAmountButton}
              >
                {amount} ETB
              </Button>
            ))}
          </View>
        </View>
      )}
    </Card>
  );

  // Render security section
  const renderSecuritySection = () => (
    <Card style={styles.securitySection}>
      <ThemedText style={styles.sectionTitle}>
        Security Features
      </ThemedText>
      
      <View style={styles.securityFeature}>
        <ThemedText style={styles.securityText}>
          🔒 End-to-End Encryption
        </ThemedText>
        <ThemedText style={styles.securityDescription}>
          All payment data is securely encrypted
        </ThemedText>
      </View>
      
      <View style={styles.securityFeature}>
        <ThemedText style={styles.securityText}>
          🛡️ PCI DSS Compliant
        </ThemedText>
        <ThemedText style={styles.securityDescription}>
          Meets international payment security standards
        </ThemedText>
      </View>
      
      <View style={styles.securityFeature}>
        <ThemedText style={styles.securityText}>
          🇪🇹 Local Compliance
        </ThemedText>
        <ThemedText style={styles.securityDescription}>
          Fully compliant with Ethiopian banking regulations
        </ThemedText>
      </View>
    </Card>
  );

  if (isLoading && paymentMethods.length === 0) {
    return <Loading message="Loading payment methods..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            Payment Methods
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Manage your payment methods and preferences
          </ThemedText>
        </View>

        {/* Auto Top-Up Section */}
        {renderAutoTopUpSection()}

        {/* Payment Methods List */}
        <View style={styles.methodsSection}>
          <ThemedText style={styles.sectionTitle}>
            Your Payment Methods
          </ThemedText>
          {renderPaymentMethods()}
        </View>

        {/* Add New Method Button */}
        <Button 
          onPress={handleAddMethod}
          leftIcon="add"
          style={styles.addMethodButton}
        >
          Add New Payment Method
        </Button>

        {/* Security Section */}
        {renderSecuritySection()}

        {/* Payment History Link */}
        <Button
          variant="ghost"
          onPress={() => router.push('/(payment)/history')}
          leftIcon="history"
          style={styles.historyButton}
        >
          View Payment History
        </Button>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Remove Payment Method"
        message={`Are you sure you want to remove this ${methodToDelete?.type} payment method?`}
        confirmText="Remove"
        cancelText="Keep"
        onConfirm={() => handleDeleteMethod(methodToDelete?.id)}
        onCancel={() => {
          setShowDeleteModal(false);
          setMethodToDelete(null);
        }}
        type="danger"
      />
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  autoTopUpSection: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  autoTopUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoTopUpDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  topUpAmountSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  topUpAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  topUpAmountOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topUpAmountButton: {
    flex: 1,
    minWidth: '22%',
  },
  methodsSection: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paymentMethodCard: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    margin: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addButton: {
    minWidth: 200,
  },
  addMethodButton: {
    margin: 16,
    marginTop: 8,
  },
  securitySection: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  securityFeature: {
    marginBottom: 16,
  },
  securityText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  historyButton: {
    margin: 16,
    marginTop: 8,
  },
};

export default PaymentMethodsScreen;