// components/payment/payment-method.js

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
  Dimensions,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { analyticsService } from '../../services/analytics-service';

const SCREEN = Dimensions.get('window');

const PAYMENT_METHOD_CONFIG = {
  GATEWAYS: {
    CHAPA: {
      id: 'chapa',
      name: 'Chapa',
      description: 'Secure Ethiopian payments',
      icon: 'card',
      color: '#6366F1',
      supportedMethods: ['mobile_banking', 'bank_transfer', 'card_payment', 'ussd'],
      feePercentage: 0.015,
      isEnabled: true,
      priority: 1,
      features: [
        'Multiple payment options',
        'Instant processing',
        'Secure encryption',
        '24/7 support'
      ]
    },
    TELEBIRR: {
      id: 'telebirr',
      name: 'Telebirr',
      description: 'Mobile money payment',
      icon: 'phone-portrait',
      color: '#3B82F6',
      supportedMethods: ['mobile_money'],
      feePercentage: 0.01,
      isEnabled: true,
      priority: 2,
      features: [
        'Direct mobile money',
        'Quick transactions',
        'Widely available',
        'Low fees'
      ]
    },
    CBE_BIRR: {
      id: 'cbe_birr',
      name: 'CBE Birr',
      description: 'Bank mobile payment',
      icon: 'business',
      color: '#F59E0B',
      supportedMethods: ['mobile_banking'],
      feePercentage: 0.012,
      isEnabled: true,
      priority: 3,
      features: [
        'Bank integration',
        'Secure transactions',
        'Easy to use',
        'Reliable service'
      ]
    }
  },
  SETTINGS: {
    AUTO_SELECT_FASTEST: 'auto_select_fastest',
    SAVE_PAYMENT_METHODS: 'save_payment_methods',
    RECEIPT_NOTIFICATIONS: 'receipt_notifications',
    LOW_FEE_PRIORITY: 'low_fee_priority'
  }
};

const PaymentMethod = ({
  selectedMethod = null,
  onMethodSelect,
  onSettingsUpdate,
  showSettings = false,
  isCompact = false,
  isVisible = false,
  onClose,
  title = 'Select Payment Method',
  subtitle = 'Choose how you want to pay'
}) => {
  const [expandedGateway, setExpandedGateway] = useState(null);
  const [userSettings, setUserSettings] = useState({
    auto_select_fastest: true,
    save_payment_methods: true,
    receipt_notifications: true,
    low_fee_priority: false
  });
  
  const { user } = useStore();
  
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Memoized enabled gateways sorted by priority
  const enabledGateways = useMemo(() => {
    return Object.values(PAYMENT_METHOD_CONFIG.GATEWAYS)
      .filter(gateway => gateway.isEnabled)
      .sort((a, b) => a.priority - b.priority);
  }, []);

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
      })
    ]).start();
  }, []);

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
      onClose?.();
    });
  }, []);

  React.useEffect(() => {
    if (isVisible) {
      animateIn();
      
      analyticsService.trackEvent('payment_method_selector_opened', {
        context: showSettings ? 'settings' : 'selection',
        userId: user?.id
      });
    }
  }, [isVisible]);

  const handleMethodSelection = (gatewayId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const gateway = PAYMENT_METHOD_CONFIG.GATEWAYS[gatewayId];
    onMethodSelect?.(gateway);
    
    analyticsService.trackEvent('payment_method_selected', {
      gateway: gatewayId,
      context: showSettings ? 'settings' : 'selection',
      userId: user?.id
    });

    if (!showSettings) {
      animateOut();
    }
  };

  const handleGatewayExpand = (gatewayId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedGateway(expandedGateway === gatewayId ? null : gatewayId);
  };

  const handleSettingToggle = (settingKey, value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newSettings = {
      ...userSettings,
      [settingKey]: value
    };
    
    setUserSettings(newSettings);
    onSettingsUpdate?.(newSettings);
    
    analyticsService.trackEvent('payment_setting_updated', {
      setting: settingKey,
      value: value,
      userId: user?.id
    });
  };

  const getMethodStatus = (gateway) => {
    if (!gateway.isEnabled) {
      return { status: 'unavailable', text: 'Temporarily unavailable', color: '#6B7280' };
    }
    
    if (selectedMethod?.id === gateway.id) {
      return { status: 'selected', text: 'Currently selected', color: '#10B981' };
    }
    
    return { status: 'available', text: 'Available', color: '#059669' };
  };

  const renderGatewayCard = (gateway) => {
    const status = getMethodStatus(gateway);
    const isExpanded = expandedGateway === gateway.id;
    const isSelected = selectedMethod?.id === gateway.id;

    return (
      <View key={gateway.id} style={styles.gatewayCard}>
        <TouchableOpacity
          style={[
            styles.gatewayHeader,
            isSelected && styles.gatewayHeaderSelected,
            isExpanded && styles.gatewayHeaderExpanded
          ]}
          onPress={() => handleGatewayExpand(gateway.id)}
          disabled={!gateway.isEnabled}
        >
          <View style={styles.gatewayInfo}>
            <View style={[styles.gatewayIcon, { backgroundColor: gateway.color + '20' }]}>
              <Ionicons name={gateway.icon} size={24} color={gateway.color} />
            </View>
            
            <View style={styles.gatewayDetails}>
              <Text style={styles.gatewayName}>{gateway.name}</Text>
              <Text style={styles.gatewayDescription}>{gateway.description}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.text}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.gatewayActions}>
            {gateway.isEnabled ? (
              <>
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#6B7280" 
                />
                {!showSettings && (
                  <TouchableOpacity
                    style={[
                      styles.selectButton,
                      isSelected && styles.selectButtonSelected
                    ]}
                    onPress={() => handleMethodSelection(gateway.id)}
                  >
                    <Text style={[
                      styles.selectButtonText,
                      isSelected && styles.selectButtonTextSelected
                    ]}>
                      {isSelected ? 'Selected' : 'Select'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableText}>Unavailable</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && gateway.isEnabled && (
          <Animated.View style={styles.expandedContent}>
            {/* Features List */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>Key Features</Text>
              <View style={styles.featuresList}>
                {gateway.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Supported Methods */}
            <View style={styles.methodsSection}>
              <Text style={styles.methodsTitle}>Supported Payment Types</Text>
              <View style={styles.methodsList}>
                {gateway.supportedMethods.map((method, index) => (
                  <View key={index} style={styles.methodItem}>
                    <Ionicons name="checkmark" size={14} color="#059669" />
                    <Text style={styles.methodText}>
                      {method.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Fee Information */}
            <View style={styles.feeSection}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Transaction Fee</Text>
                <Text style={styles.feeValue}>
                  {(gateway.feePercentage * 100).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.feeDescription}>
                Applied to all transactions processed through {gateway.name}
              </Text>
            </View>

            {/* Action Buttons */}
            {showSettings && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    // Handle gateway-specific settings
                    Alert.alert(
                      `${gateway.name} Settings`,
                      'Gateway-specific settings would be configured here.',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Settings</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isSelected && styles.primaryButtonSelected
                  ]}
                  onPress={() => handleMethodSelection(gateway.id)}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSelected ? 'Currently Selected' : 'Set as Default'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    );
  };

  const renderSettingsSection = () => (
    <View style={styles.settingsSection}>
      <Text style={styles.settingsTitle}>Payment Preferences</Text>
      
      <View style={styles.settingsList}>
        {/* Auto-select fastest method */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="flash" size={20} color="#F59E0B" />
            <View style={styles.settingDetails}>
              <Text style={styles.settingLabel}>Auto-Select Fastest Method</Text>
              <Text style={styles.settingDescription}>
                Automatically choose the payment method with fastest processing time
              </Text>
            </View>
          </View>
          <Switch
            value={userSettings.auto_select_fastest}
            onValueChange={(value) => handleSettingToggle('auto_select_fastest', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Save payment methods */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="save" size={20} color="#6366F1" />
            <View style={styles.settingDetails}>
              <Text style={styles.settingLabel}>Save Payment Methods</Text>
              <Text style={styles.settingDescription}>
                Securely store your payment preferences for faster checkout
              </Text>
            </View>
          </View>
          <Switch
            value={userSettings.save_payment_methods}
            onValueChange={(value) => handleSettingToggle('save_payment_methods', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Receipt notifications */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={20} color="#3B82F6" />
            <View style={styles.settingDetails}>
              <Text style={styles.settingLabel}>Payment Receipts</Text>
              <Text style={styles.settingDescription}>
                Receive notifications for payment confirmations and receipts
              </Text>
            </View>
          </View>
          <Switch
            value={userSettings.receipt_notifications}
            onValueChange={(value) => handleSettingToggle('receipt_notifications', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Low fee priority */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="trending-down" size={20} color="#10B981" />
            <View style={styles.settingDetails}>
              <Text style={styles.settingLabel}>Prioritize Low Fees</Text>
              <Text style={styles.settingDescription}>
                Prefer payment methods with lower transaction fees when available
              </Text>
            </View>
          </View>
          <Switch
            value={userSettings.low_fee_priority}
            onValueChange={(value) => handleSettingToggle('low_fee_priority', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsSection}>
        <Text style={styles.statsTitle}>Payment Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Methods Available</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1.2%</Text>
            <Text style={styles.statLabel}>Avg. Fee</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Instant</Text>
            <Text style={styles.statLabel}>Processing</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>99.9%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCompactView = () => (
    <View style={styles.compactContainer}>
      <Text style={styles.compactTitle}>Payment Method</Text>
      <View style={styles.compactMethods}>
        {enabledGateways.slice(0, 3).map((gateway) => (
          <TouchableOpacity
            key={gateway.id}
            style={[
              styles.compactMethod,
              selectedMethod?.id === gateway.id && styles.compactMethodSelected
            ]}
            onPress={() => handleMethodSelection(gateway.id)}
          >
            <View style={[styles.compactIcon, { backgroundColor: gateway.color + '20' }]}>
              <Ionicons name={gateway.icon} size={16} color={gateway.color} />
            </View>
            <Text style={styles.compactMethodText}>{gateway.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isCompact) {
    return renderCompactView();
  }

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={80} style={StyleSheet.absoluteFill} />
      
      <Animated.View 
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="card" size={24} color="#6366F1" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
          </View>
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
          {/* Payment Gateways */}
          <View style={styles.gatewaysSection}>
            <Text style={styles.sectionTitle}>
              {showSettings ? 'Available Payment Methods' : 'Choose Payment Method'}
            </Text>
            <View style={styles.gatewaysList}>
              {enabledGateways.map(renderGatewayCard)}
            </View>
          </View>

          {/* Settings Section */}
          {showSettings && renderSettingsSection()}

          {/* Security Assurance */}
          <View style={styles.securitySection}>
            <View style={styles.securityHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.securityTitle}>Secure Payment Guarantee</Text>
            </View>
            <View style={styles.securityFeatures}>
              <View style={styles.securityFeature}>
                <Ionicons name="lock-closed" size={16} color="#10B981" />
                <Text style={styles.securityText}>256-bit SSL Encryption</Text>
              </View>
              <View style={styles.securityFeature}>
                <Ionicons name="card" size={16} color="#10B981" />
                <Text style={styles.securityText}>PCI DSS Compliant</Text>
              </View>
              <View style={styles.securityFeature}>
                <Ionicons name="eye-off" size={16} color="#10B981" />
                <Text style={styles.securityText}>Data Never Stored</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        {!showSettings && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => {
                // Handle help or support
                Alert.alert(
                  'Payment Help',
                  'Contact support@yachi.app for payment assistance.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Ionicons name="help-circle" size={20} color="#6B7280" />
              <Text style={styles.footerButtonText}>Need Help?</Text>
            </TouchableOpacity>
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  gatewaysSection: {
    padding: 20,
  },
  gatewaysList: {
    gap: 12,
  },
  gatewayCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gatewayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  gatewayHeaderSelected: {
    backgroundColor: '#F0FDF4',
  },
  gatewayHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  gatewayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gatewayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gatewayDetails: {
    flex: 1,
  },
  gatewayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  gatewayDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gatewayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  selectButtonSelected: {
    backgroundColor: '#059669',
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectButtonTextSelected: {
    color: '#FFFFFF',
  },
  unavailableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  unavailableText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  expandedContent: {
    padding: 16,
    gap: 16,
  },
  featuresSection: {
    gap: 8,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
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
    color: '#6B7280',
    flex: 1,
  },
  methodsSection: {
    gap: 8,
  },
  methodsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  methodsList: {
    gap: 4,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodText: {
    fontSize: 13,
    color: '#6B7280',
  },
  feeSection: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feeLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  feeDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonSelected: {
    backgroundColor: '#059669',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingsList: {
    gap: 16,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  settingDetails: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  statsSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  securitySection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  securityFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  footerButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  compactMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  compactMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  compactMethodSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});

export default PaymentMethod;
export { PAYMENT_METHOD_CONFIG };