// components/payment/receipt.js

import React, { useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Share,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { analyticsService } from '../../services/analytics-service';

const SCREEN = Dimensions.get('window');

const RECEIPT_CONFIG = {
  STATUS: {
    COMPLETED: 'completed',
    PENDING: 'pending',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },
  TYPE: {
    PREMIUM_BADGE: 'premium_badge',
    PREMIUM_LISTING: 'premium_listing',
    SUBSCRIPTION: 'subscription'
  },
  CURRENCY: 'ETB'
};

const Receipt = ({
  transaction = null,
  isVisible = false,
  onClose = () => {},
  onAction = null,
  showShareButton = true,
  showPrintButton = false,
  autoShow = true
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const { user } = useStore();

  // Default transaction data
  const defaultTransaction = useMemo(() => ({
    id: `TXN_${Date.now()}`,
    type: RECEIPT_CONFIG.TYPE.PREMIUM_BADGE,
    status: RECEIPT_CONFIG.STATUS.COMPLETED,
    amount: 200,
    currency: RECEIPT_CONFIG.CURRENCY,
    productName: 'Premium Badge',
    productDescription: '30-day premium visibility boost',
    customer: {
      name: user?.name || 'Customer',
      email: user?.email || 'customer@example.com',
      phone: user?.phone || 'N/A'
    },
    gateway: {
      name: 'Chapa',
      id: 'chapa_payment'
    },
    timestamp: new Date().toISOString(),
    fee: 3.00,
    tax: 0.00,
    duration: '30 days',
    features: [
      'Priority in search results',
      'Featured profile placement',
      'Verified status badge',
      'Enhanced visibility'
    ]
  }), [user]);

  const transactionData = useMemo(() => ({
    ...defaultTransaction,
    ...transaction
  }), [transaction, defaultTransaction]);

  // Animation handlers
  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();

    analyticsService.trackEvent('receipt_viewed', {
      transactionId: transactionData.id,
      transactionType: transactionData.type,
      amount: transactionData.amount,
      userId: user?.id
    });
  }, [transactionData, user]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN.height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
    });
  }, []);

  React.useEffect(() => {
    if (isVisible) {
      animateIn();
    }
  }, [isVisible]);

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const shareMessage = `Payment Receipt - ${transactionData.productName}
Amount: ${transactionData.amount} ${transactionData.currency}
Transaction ID: ${transactionData.id}
Date: ${formatDate(transactionData.timestamp)}

Thank you for your purchase!`;

      await Share.share({
        message: shareMessage,
        title: 'Payment Receipt'
      });

      analyticsService.trackEvent('receipt_shared', {
        transactionId: transactionData.id,
        userId: user?.id
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  const handlePrint = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Print Receipt',
      'This would open print options on your device.',
      [{ text: 'OK' }]
    );

    analyticsService.trackEvent('receipt_print_attempted', {
      transactionId: transactionData.id,
      userId: user?.id
    });
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Save Receipt',
      'Receipt has been saved to your device.',
      [{ text: 'OK' }]
    );

    analyticsService.trackEvent('receipt_saved', {
      transactionId: transactionData.id,
      userId: user?.id
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: transactionData.currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case RECEIPT_CONFIG.STATUS.COMPLETED:
        return '#10B981';
      case RECEIPT_CONFIG.STATUS.PENDING:
        return '#F59E0B';
      case RECEIPT_CONFIG.STATUS.FAILED:
        return '#EF4444';
      case RECEIPT_CONFIG.STATUS.REFUNDED:
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case RECEIPT_CONFIG.STATUS.COMPLETED:
        return 'checkmark-circle';
      case RECEIPT_CONFIG.STATUS.PENDING:
        return 'time';
      case RECEIPT_CONFIG.STATUS.FAILED:
        return 'close-circle';
      case RECEIPT_CONFIG.STATUS.REFUNDED:
        return 'refresh-circle';
      default:
        return 'help-circle';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#F0FDF4', '#ECFDF5']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.statusSection}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(transactionData.status) }]}>
              <Ionicons 
                name={getStatusIcon(transactionData.status)} 
                size={32} 
                color="#FFFFFF" 
              />
            </View>
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                {transactionData.status.charAt(0).toUpperCase() + transactionData.status.slice(1)}
              </Text>
              <Text style={styles.statusDescription}>
                {transactionData.status === RECEIPT_CONFIG.STATUS.COMPLETED 
                  ? 'Payment completed successfully' 
                  : `Payment ${transactionData.status}`
                }
              </Text>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Total Paid</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(transactionData.amount)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderProductInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Product Information</Text>
      
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <MaterialIcons 
            name="verified" 
            size={24} 
            color="#10B981" 
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{transactionData.productName}</Text>
            <Text style={styles.productDescription}>{transactionData.productDescription}</Text>
          </View>
        </View>

        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{transactionData.duration}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Activation Date</Text>
            <Text style={styles.detailValue}>{formatDate(transactionData.timestamp)}</Text>
          </View>
        </View>

        {transactionData.features && transactionData.features.length > 0 && (
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Features Included</Text>
            <View style={styles.featuresList}>
              {transactionData.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderTransactionDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction Details</Text>
      
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transaction ID</Text>
          <Text style={styles.detailValue}>{transactionData.id}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date & Time</Text>
          <Text style={styles.detailValue}>{formatDate(transactionData.timestamp)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method</Text>
          <Text style={styles.detailValue}>{transactionData.gateway?.name || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Gateway Reference</Text>
          <Text style={styles.detailValue}>{transactionData.gateway?.id || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );

  const renderPaymentBreakdown = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Breakdown</Text>
      
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Product Price</Text>
          <Text style={styles.breakdownValue}>
            {formatCurrency(transactionData.amount - (transactionData.fee || 0) - (transactionData.tax || 0))}
          </Text>
        </View>
        
        {transactionData.fee > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Transaction Fee</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(transactionData.fee)}
            </Text>
          </View>
        )}
        
        {transactionData.tax > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Tax</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(transactionData.tax)}
            </Text>
          </View>
        )}
        
        <View style={[styles.breakdownRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(transactionData.amount)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCustomerInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Customer Information</Text>
      
      <View style={styles.customerCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Name</Text>
          <Text style={styles.detailValue}>{transactionData.customer?.name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{transactionData.customer?.email}</Text>
        </View>
        
        {transactionData.customer?.phone && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{transactionData.customer.phone}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionsSection}>
      <View style={styles.actionButtons}>
        {showShareButton && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Ionicons name="share-social" size={20} color="#6366F1" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        )}
        
        {showPrintButton && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePrint}
          >
            <Ionicons name="print" size={20} color="#6B7280" />
            <Text style={styles.actionButtonText}>Print</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSave}
        >
          <Ionicons name="download" size={20} color="#10B981" />
          <Text style={styles.actionButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {onAction && (
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={onAction}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.primaryActionGradient}
          >
            <Text style={styles.primaryActionText}>
              {transactionData.type === RECEIPT_CONFIG.TYPE.PREMIUM_BADGE ? 'View Profile' : 
               transactionData.type === RECEIPT_CONFIG.TYPE.PREMIUM_LISTING ? 'View Listings' : 
               'Manage Subscription'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSupportInfo = () => (
    <View style={styles.supportSection}>
      <View style={styles.supportCard}>
        <Ionicons name="help-buoy" size={24} color="#6366F1" />
        <View style={styles.supportInfo}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportDescription}>
            Contact our support team for any questions about your purchase.
          </Text>
          <Text style={styles.supportContact}>support@yachi.app</Text>
        </View>
      </View>
    </View>
  );

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={80} style={StyleSheet.absoluteFill} />
      
      <Animated.View 
        style={[
          styles.container,
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
            opacity: fadeAnim
          }
        ]}
      >
        {/* Header with Close Button */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Payment Receipt</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={animateOut}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          {renderProductInfo()}
          {renderTransactionDetails()}
          {renderPaymentBreakdown()}
          {renderCustomerInfo()}
          {renderSupportInfo()}
        </ScrollView>

        {renderActionButtons()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  headerGradient: {
    borderRadius: 16,
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 14,
    color: '#059669',
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
  },
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  productDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  featuresSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  featuresList: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  detailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  breakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
  },
  customerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  primaryAction: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionGradient: {
    padding: 16,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  supportSection: {
    padding: 20,
    paddingBottom: 0,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  supportInfo: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0369A1',
    marginBottom: 4,
  },
  supportDescription: {
    fontSize: 13,
    color: '#0C4A6E',
    marginBottom: 6,
    lineHeight: 18,
  },
  supportContact: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0369A1',
  },
});

export default Receipt;
export { RECEIPT_CONFIG };