import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { TabView } from '../../components/ui/tabview';
import { Avatar } from '../../components/ui/avatar';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { usePayment } from '../../hooks/use-payment';
import { subscriptionService } from '../../services/subscription-service';
import { userService } from '../../services/user-service';
import { analyticsService } from '../../services/analytics-service';
import { notificationService } from '../../services/notification-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { subscriptionConstants } from '../../constants/subscription';

/**
 * Subscription Management Screen
 * 
 * Comprehensive subscription management with plan comparison,
 * billing history, premium features, and upgrade/downgrade functionality
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const SubscriptionScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { processPayment } = usePayment();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [featureUsage, setFeatureUsage] = useState({});

  // Subscription plans configuration
  const subscriptionPlans = {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'ETB',
      period: 'month',
      description: 'Basic features for getting started',
      features: [
        'Basic profile listing',
        'Up to 5 service categories',
        'Standard search visibility',
        'Basic messaging',
        'Limited portfolio items (10)',
        'Community support',
      ],
      limitations: [
        'No premium badge',
        'Limited visibility in search',
        'No featured listings',
        'Standard customer support',
      ],
      color: colors.default,
      popular: false,
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      price: 199,
      currency: 'ETB',
      period: 'month',
      description: 'Enhanced visibility and features',
      features: [
        'Premium profile badge',
        'Unlimited service categories',
        'Priority search ranking',
        'Featured listing placement',
        'Unlimited portfolio items',
        'Advanced analytics',
        'Priority customer support',
        'Custom booking link',
      ],
      benefits: [
        'Up to 3x more client views',
        'Featured in category pages',
        'Early access to new features',
      ],
      color: colors.warning,
      popular: true,
    },
    professional: {
      id: 'professional',
      name: 'Professional',
      price: 399,
      currency: 'ETB',
      period: 'month',
      description: 'Maximum visibility and business tools',
      features: [
        'All Premium features',
        'Top search placement',
        'Verified professional badge',
        'Advanced business analytics',
        'Bulk service management',
        'Team member accounts (3)',
        'Custom service packages',
        'Dedicated account manager',
        'API access',
      ],
      benefits: [
        'Up to 5x more client views',
        'Featured on homepage',
        'Dedicated support line',
      ],
      color: colors.primary,
      popular: false,
    },
  };

  /**
   * Fetch subscription data
   */
  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [subscription, billing, plans, usage] = await Promise.all([
        subscriptionService.getUserSubscription(user.id),
        subscriptionService.getBillingHistory(user.id),
        subscriptionService.getAvailablePlans(),
        subscriptionService.getFeatureUsage(user.id),
      ]);

      setSubscriptionData(subscription);
      setBillingHistory(billing || []);
      setAvailablePlans(plans || Object.values(subscriptionPlans));
      setFeatureUsage(usage || {});

      // Track subscription page view
      analyticsService.trackScreenView('subscription', user.id);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
      Alert.alert('Error', 'Unable to load subscription information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  /**
   * Refresh data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  /**
   * Handle subscription upgrade
   */
  const handleUpgrade = async (planId) => {
    try {
      setProcessing(true);
      
      const plan = availablePlans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Selected plan not found');
      }

      // Process payment for the plan
      const paymentResult = await processPayment({
        amount: plan.price,
        currency: plan.currency,
        description: `Upgrade to ${plan.name} plan`,
        metadata: {
          type: 'subscription_upgrade',
          planId: plan.id,
          userId: user.id,
        },
      });

      if (paymentResult.success) {
        // Create subscription
        const subscriptionResult = await subscriptionService.createSubscription({
          userId: user.id,
          planId: plan.id,
          price: plan.price,
          currency: plan.currency,
          paymentMethod: paymentResult.paymentMethod,
          transactionId: paymentResult.transactionId,
        });

        if (subscriptionResult.success) {
          setSubscriptionData(subscriptionResult.subscription);
          updateUser({ 
            ...user, 
            subscription: subscriptionResult.subscription 
          });
          setShowUpgradeModal(false);
          
          Alert.alert('Success', `Successfully upgraded to ${plan.name} plan!`);
          
          // Track subscription upgrade
          analyticsService.trackSubscriptionUpgrade(plan.id, plan.price, user.id);
          
          // Send confirmation notification
          await notificationService.sendSubscriptionConfirmation(
            user.id,
            plan.name,
            plan.price
          );
        } else {
          throw new Error(subscriptionResult.message);
        }
      } else {
        throw new Error(paymentResult.message);
      }
    } catch (error) {
      console.error('Subscription upgrade failed:', error);
      Alert.alert('Upgrade Failed', error.message || 'Unable to process subscription upgrade.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle subscription cancellation
   */
  const handleCancelSubscription = async () => {
    try {
      setProcessing(true);

      const result = await subscriptionService.cancelSubscription(
        subscriptionData.id,
        user.id
      );

      if (result.success) {
        setSubscriptionData(result.updatedSubscription);
        updateUser({ 
          ...user, 
          subscription: result.updatedSubscription 
        });
        setShowCancelModal(false);
        
        Alert.alert(
          'Subscription Cancelled',
          'Your subscription has been cancelled. You will continue to have access until the end of your billing period.',
          [{ text: 'OK' }]
        );

        // Track subscription cancellation
        analyticsService.trackSubscriptionCancelled(user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      Alert.alert('Cancellation Failed', error.message || 'Unable to cancel subscription.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle subscription renewal
   */
  const handleRenewSubscription = async () => {
    try {
      setProcessing(true);

      const result = await subscriptionService.renewSubscription(
        subscriptionData.id,
        user.id
      );

      if (result.success) {
        setSubscriptionData(result.updatedSubscription);
        
        Alert.alert('Success', 'Subscription renewed successfully!');
        
        // Track subscription renewal
        analyticsService.trackSubscriptionRenewed(user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Subscription renewal failed:', error);
      Alert.alert('Renewal Failed', error.message || 'Unable to renew subscription.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle plan change
   */
  const handleChangePlan = async (newPlanId) => {
    try {
      setProcessing(true);

      const result = await subscriptionService.changePlan(
        subscriptionData.id,
        newPlanId,
        user.id
      );

      if (result.success) {
        setSubscriptionData(result.updatedSubscription);
        setShowUpgradeModal(false);
        
        Alert.alert('Success', 'Subscription plan changed successfully!');
        
        // Track plan change
        analyticsService.trackPlanChange(newPlanId, user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Plan change failed:', error);
      Alert.alert('Change Failed', error.message || 'Unable to change subscription plan.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Get subscription status color
   */
  const getStatusColor = (status) => {
    const statusColors = {
      active: colors.success,
      cancelled: colors.warning,
      expired: colors.error,
      pending: colors.info,
      suspended: colors.error,
    };
    
    return statusColors[status] || colors.default;
  };

  /**
   * Get current plan
   */
  const getCurrentPlan = () => {
    if (!subscriptionData) return subscriptionPlans.free;
    return subscriptionPlans[subscriptionData.planId] || subscriptionPlans.free;
  };

  /**
   * Calculate savings percentage
   */
  const calculateSavings = (plan) => {
    if (plan.id === 'free') return 0;
    
    const freePlan = subscriptionPlans.free;
    const premiumFeatures = plan.features.length - freePlan.features.length;
    const valuePerFeature = 50; // Estimated value per premium feature in ETB
    
    const estimatedValue = premiumFeatures * valuePerFeature;
    const savings = ((estimatedValue - plan.price) / estimatedValue) * 100;
    
    return Math.max(0, Math.min(100, Math.round(savings)));
  };

  /**
   * Check if feature is available
   */
  const isFeatureAvailable = (feature) => {
    const currentPlan = getCurrentPlan();
    return currentPlan.features.includes(feature);
  };

  /**
   * Render current plan tab
   */
  const renderCurrentPlanTab = () => {
    const currentPlan = getCurrentPlan();
    const isActive = subscriptionData?.status === 'active';

    return (
      <View style={styles.tabContent}>
        {/* Current Plan Card */}
        <Card style={styles.currentPlanCard}>
          <View style={styles.planHeader}>
            <View style={styles.planInfo}>
              <ThemedText type="title" style={styles.planName}>
                {currentPlan.name} Plan
              </ThemedText>
              <ThemedText type="default" style={styles.planDescription}>
                {currentPlan.description}
              </ThemedText>
            </View>
            <Badge
              text={subscriptionData?.status || 'inactive'}
              color={getStatusColor(subscriptionData?.status)}
              size="medium"
            />
          </View>

          {/* Plan Price */}
          <View style={styles.planPrice}>
            <ThemedText type="title" style={styles.price}>
              {currentPlan.price === 0 ? 'Free' : `${formatters.formatCurrency(currentPlan.price, currentPlan.currency)}`}
            </ThemedText>
            {currentPlan.price > 0 && (
              <ThemedText type="default" style={styles.billingPeriod}>
                per {currentPlan.period}
              </ThemedText>
            )}
          </View>

          {/* Subscription Details */}
          {subscriptionData && (
            <View style={styles.subscriptionDetails}>
              <View style={styles.detailItem}>
                <ThemedText type="defaultSemiBold">Billing Cycle:</ThemedText>
                <ThemedText type="default">
                  {formatters.capitalizeFirst(subscriptionData.billingCycle)}
                </ThemedText>
              </View>
              
              <View style={styles.detailItem}>
                <ThemedText type="defaultSemiBold">Next Billing Date:</ThemedText>
                <ThemedText type="default">
                  {formatters.formatDate(subscriptionData.nextBillingDate)}
                </ThemedText>
              </View>
              
              <View style={styles.detailItem}>
                <ThemedText type="defaultSemiBold">Payment Method:</ThemedText>
                <ThemedText type="default">
                  {subscriptionData.paymentMethod || 'Not set'}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.planActions}>
            {!isActive ? (
              <Button
                title="Upgrade Plan"
                onPress={() => setShowUpgradeModal(true)}
                variant="primary"
                size="large"
                icon="arrow-up"
                style={styles.upgradeButton}
              />
            ) : (
              <View style={styles.activePlanActions}>
                <Button
                  title="Change Plan"
                  onPress={() => setShowUpgradeModal(true)}
                  variant="outline"
                  size="medium"
                  icon="refresh-cw"
                />
                <Button
                  title="Cancel Subscription"
                  onPress={() => setShowCancelModal(true)}
                  variant="danger"
                  size="medium"
                  icon="x"
                />
              </View>
            )}
          </View>
        </Card>

        {/* Feature Usage */}
        <Card style={styles.usageCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Feature Usage
          </ThemedText>
          
          <View style={styles.usageGrid}>
            <View style={styles.usageItem}>
              <ThemedText type="default">Profile Views</ThemedText>
              <ThemedText type="defaultSemiBold">
                {featureUsage.profileViews || 0} this month
              </ThemedText>
            </View>
            
            <View style={styles.usageItem}>
              <ThemedText type="default">Booking Requests</ThemedText>
              <ThemedText type="defaultSemiBold">
                {featureUsage.bookingRequests || 0} this month
              </ThemedText>
            </View>
            
            <View style={styles.usageItem}>
              <ThemedText type="default">Portfolio Items</ThemedText>
              <ThemedText type="defaultSemiBold">
                {featureUsage.portfolioItems || 0} / {currentPlan.id === 'free' ? 10 : 'Unlimited'}
              </ThemedText>
            </View>
            
            <View style={styles.usageItem}>
              <ThemedText type="default">Service Categories</ThemedText>
              <ThemedText type="defaultSemiBold">
                {featureUsage.serviceCategories || 0} / {currentPlan.id === 'free' ? 5 : 'Unlimited'}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Plan Benefits */}
        <Card style={styles.benefitsCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Plan Benefits
          </ThemedText>
          
          <View style={styles.benefitsList}>
            {currentPlan.features.map((feature, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <ThemedText type="default">✓</ThemedText>
                </View>
                <ThemedText type="default" style={styles.benefitText}>
                  {feature}
                </ThemedText>
              </View>
            ))}
          </View>

          {currentPlan.limitations && currentPlan.limitations.length > 0 && (
            <>
              <ThemedText type="subtitle" style={[styles.sectionTitle, styles.limitationsTitle]}>
                Limitations
              </ThemedText>
              <View style={styles.limitationsList}>
                {currentPlan.limitations.map((limitation, index) => (
                  <View key={index} style={styles.limitationItem}>
                    <View style={styles.limitationIcon}>
                      <ThemedText type="default">ⓘ</ThemedText>
                    </View>
                    <ThemedText type="default" style={styles.limitationText}>
                      {limitation}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>
      </View>
    );
  };

  /**
   * Render plans tab
   */
  const renderPlansTab = () => (
    <View style={styles.tabContent}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Choose Your Plan
      </ThemedText>
      <ThemedText type="default" style={styles.sectionDescription}>
        Select the plan that best fits your business needs
      </ThemedText>

      <View style={styles.plansGrid}>
        {availablePlans.map(plan => (
          <Card 
            key={plan.id}
            style={[
              styles.planCard,
              plan.popular && styles.popularPlanCard,
            ]}
          >
            {plan.popular && (
              <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                <ThemedText type="defaultSemiBold" style={styles.popularBadgeText}>
                  MOST POPULAR
                </ThemedText>
              </View>
            )}

            <View style={styles.planCardHeader}>
              <ThemedText type="title" style={styles.planCardName}>
                {plan.name}
              </ThemedText>
              <ThemedText type="default" style={styles.planCardDescription}>
                {plan.description}
              </ThemedText>
            </View>

            <View style={styles.planCardPrice}>
              <ThemedText type="title" style={styles.planCardPriceAmount}>
                {plan.price === 0 ? 'Free' : `${formatters.formatCurrency(plan.price, plan.currency)}`}
              </ThemedText>
              {plan.price > 0 && (
                <ThemedText type="default" style={styles.planCardPricePeriod}>
                  per {plan.period}
                </ThemedText>
              )}
            </View>

            {plan.price > 0 && calculateSavings(plan) > 0 && (
              <View style={styles.savingsBadge}>
                <ThemedText type="defaultSemiBold" style={styles.savingsText}>
                  Save {calculateSavings(plan)}%
                </ThemedText>
              </View>
            )}

            <View style={styles.planCardFeatures}>
              {plan.features.slice(0, 4).map((feature, index) => (
                <View key={index} style={styles.planFeatureItem}>
                  <View style={styles.planFeatureIcon}>
                    <ThemedText type="default">✓</ThemedText>
                  </View>
                  <ThemedText type="default" style={styles.planFeatureText}>
                    {feature}
                  </ThemedText>
                </View>
              ))}
              {plan.features.length > 4 && (
                <ThemedText type="default" style={styles.moreFeaturesText}>
                  +{plan.features.length - 4} more features
                </ThemedText>
              )}
            </View>

            <Button
              title={
                subscriptionData?.planId === plan.id ? 
                'Current Plan' : 
                plan.price === 0 ? 'Get Started' : 'Upgrade Now'
              }
              onPress={() => {
                if (subscriptionData?.planId !== plan.id) {
                  setSelectedPlan(plan);
                  setShowUpgradeModal(true);
                }
              }}
              variant={
                subscriptionData?.planId === plan.id ? 'success' :
                plan.popular ? 'primary' : 'outline'
              }
              size="large"
              disabled={subscriptionData?.planId === plan.id}
              style={styles.planCardButton}
            />
          </Card>
        ))}
      </View>

      {/* Feature Comparison */}
      <Card style={styles.comparisonCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Feature Comparison
        </ThemedText>
        
        <View style={styles.comparisonTable}>
          <View style={styles.comparisonHeader}>
            <ThemedText type="defaultSemiBold" style={styles.comparisonFeature}>
              Feature
            </ThemedText>
            {availablePlans.map(plan => (
              <ThemedText 
                key={plan.id} 
                type="defaultSemiBold" 
                style={styles.comparisonPlan}
              >
                {plan.name}
              </ThemedText>
            ))}
          </View>
          
          {Object.entries(subscriptionConstants.FEATURES).map(([feature, description]) => (
            <View key={feature} style={styles.comparisonRow}>
              <ThemedText type="default" style={styles.comparisonFeature}>
                {description}
              </ThemedText>
              {availablePlans.map(plan => (
                <View key={plan.id} style={styles.comparisonCell}>
                  <ThemedText type="default">
                    {plan.features.some(f => f.includes(description)) ? '✓' : '✗'}
                  </ThemedText>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Card>
    </View>
  );

  /**
   * Render billing tab
   */
  const renderBillingTab = () => (
    <View style={styles.tabContent}>
      {/* Billing Summary */}
      <Card style={styles.billingSummaryCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Billing Summary
        </ThemedText>
        
        <View style={styles.billingStats}>
          <View style={styles.billingStat}>
            <ThemedText type="title" style={styles.billingStatValue}>
              {formatters.formatCurrency(
                billingHistory.reduce((sum, invoice) => sum + invoice.amount, 0),
                'ETB'
              )}
            </ThemedText>
            <ThemedText type="default" style={styles.billingStatLabel}>
              Total Spent
            </ThemedText>
          </View>
          
          <View style={styles.billingStat}>
            <ThemedText type="title" style={styles.billingStatValue}>
              {billingHistory.length}
            </ThemedText>
            <ThemedText type="default" style={styles.billingStatLabel}>
              Total Invoices
            </ThemedText>
          </View>
          
          <View style={styles.billingStat}>
            <ThemedText type="title" style={styles.billingStatValue}>
              {billingHistory.filter(invoice => invoice.status === 'paid').length}
            </ThemedText>
            <ThemedText type="default" style={styles.billingStatLabel}>
              Paid Invoices
            </ThemedText>
          </View>
        </View>
      </Card>

      {/* Billing History */}
      <Card style={styles.billingHistoryCard}>
        <View style={styles.billingHistoryHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Billing History
          </ThemedText>
          <Button
            title="Export All"
            onPress={() => navigation.navigate('ExportInvoices')}
            variant="outline"
            size="small"
            icon="download"
          />
        </View>

        <View style={styles.invoiceList}>
          {billingHistory.length > 0 ? (
            billingHistory.map(invoice => (
              <Card key={invoice.id} style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.invoiceId}>
                      Invoice #{invoice.invoiceNumber}
                    </ThemedText>
                    <ThemedText type="default" style={styles.invoiceDate}>
                      {formatters.formatDate(invoice.date)}
                    </ThemedText>
                  </View>
                  <View style={styles.invoiceAmount}>
                    <ThemedText type="defaultSemiBold">
                      {formatters.formatCurrency(invoice.amount, invoice.currency)}
                    </ThemedText>
                    <Badge
                      text={invoice.status}
                      color={getStatusColor(invoice.status)}
                      size="small"
                    />
                  </View>
                </View>
                
                <View style={styles.invoiceActions}>
                  <Button
                    title="View Invoice"
                    onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
                    variant="outline"
                    size="small"
                    icon="file-text"
                  />
                  <Button
                    title="Download PDF"
                    onPress={() => {}}
                    variant="outline"
                    size="small"
                    icon="download"
                  />
                </View>
              </Card>
            ))
          ) : (
            <View style={styles.emptyInvoices}>
              <ThemedText type="title" style={styles.emptyTitle}>
                No Billing History
              </ThemedText>
              <ThemedText type="default" style={styles.emptyText}>
                Your billing history will appear here once you make payments
              </ThemedText>
            </View>
          )}
        </View>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading subscription..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Subscription
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Manage your subscription and billing
          </ThemedText>
        </View>

        {/* Main Content Tabs */}
        <TabView
          tabs={[
            { key: 'current', title: 'Current Plan' },
            { key: 'plans', title: 'Plans & Pricing' },
            { key: 'billing', title: `Billing (${billingHistory.length})` },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          style={styles.tabView}
        />

        {/* Tab Content */}
        <View style={styles.tabContainer}>
          {activeTab === 'current' && renderCurrentPlanTab()}
          {activeTab === 'plans' && renderPlansTab()}
          {activeTab === 'billing' && renderBillingTab()}
        </View>
      </ScrollView>

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={`Upgrade to ${selectedPlan?.name} Plan`}
        size="medium"
      >
        <View style={styles.upgradeModal}>
          {selectedPlan && (
            <>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {selectedPlan.name} Plan - {formatters.formatCurrency(selectedPlan.price, selectedPlan.currency)}/{selectedPlan.period}
              </ThemedText>
              
              <ThemedText type="default" style={styles.modalDescription}>
                You're about to upgrade to the {selectedPlan.name} plan. This will give you access to:
              </ThemedText>
              
              <View style={styles.modalFeatures}>
                {selectedPlan.features.slice(0, 5).map((feature, index) => (
                  <View key={index} style={styles.modalFeature}>
                    <ThemedText type="default">✓ {feature}</ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowUpgradeModal(false)}
                  variant="secondary"
                  size="medium"
                />
                <Button
                  title={`Upgrade for ${formatters.formatCurrency(selectedPlan.price, selectedPlan.currency)}`}
                  onPress={() => handleUpgrade(selectedPlan.id)}
                  variant="primary"
                  size="medium"
                  loading={processing}
                  disabled={processing}
                />
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        size="small"
      >
        <View style={styles.cancelModal}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            Are you sure?
          </ThemedText>
          
          <ThemedText type="default" style={styles.modalDescription}>
            Your subscription will remain active until {subscriptionData && formatters.formatDate(subscriptionData.nextBillingDate)}. 
            After this date, you will lose access to premium features.
          </ThemedText>

          <View style={styles.modalActions}>
            <Button
              title="Keep Subscription"
              onPress={() => setShowCancelModal(false)}
              variant="secondary"
              size="medium"
            />
            <Button
              title="Cancel Subscription"
              onPress={handleCancelSubscription}
              variant="danger"
              size="medium"
              loading={processing}
              disabled={processing}
            />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    lineHeight: 20,
  },
  tabView: {
    marginHorizontal: 16,
  },
  tabContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  currentPlanCard: {
    gap: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planInfo: {
    flex: 1,
    gap: 4,
  },
  planName: {
    fontSize: 20,
  },
  planDescription: {
    opacity: 0.7,
  },
  planPrice: {
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: 32,
  },
  billingPeriod: {
    opacity: 0.7,
  },
  subscriptionDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planActions: {
    gap: 12,
  },
  upgradeButton: {
    marginTop: 8,
  },
  activePlanActions: {
    flexDirection: 'row',
    gap: 12,
  },
  usageCard: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  sectionDescription: {
    opacity: 0.7,
    lineHeight: 18,
    marginBottom: 16,
  },
  usageGrid: {
    gap: 12,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  benefitsCard: {
    gap: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  limitationsTitle: {
    marginTop: 16,
  },
  limitationsList: {
    gap: 12,
  },
  limitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitationIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitationText: {
    flex: 1,
    opacity: 0.7,
  },
  plansGrid: {
    gap: 16,
  },
  planCard: {
    gap: 16,
    position: 'relative',
  },
  popularPlanCard: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    color: 'white',
  },
  planCardHeader: {
    gap: 4,
  },
  planCardName: {
    fontSize: 20,
  },
  planCardDescription: {
    opacity: 0.7,
  },
  planCardPrice: {
    alignItems: 'center',
    gap: 4,
  },
  planCardPriceAmount: {
    fontSize: 28,
  },
  planCardPricePeriod: {
    opacity: 0.7,
  },
  savingsBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.success,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 12,
    color: 'white',
  },
  planCardFeatures: {
    gap: 8,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planFeatureText: {
    fontSize: 14,
  },
  moreFeaturesText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  planCardButton: {
    marginTop: 8,
  },
  comparisonCard: {
    gap: 16,
  },
  comparisonTable: {
    gap: 0,
  },
  comparisonHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    paddingVertical: 12,
  },
  comparisonFeature: {
    flex: 2,
    fontWeight: '600',
  },
  comparisonPlan: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  comparisonRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  comparisonCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billingSummaryCard: {
    gap: 16,
  },
  billingStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  billingStat: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  billingStatValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  billingStatLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  billingHistoryCard: {
    gap: 16,
  },
  billingHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceList: {
    gap: 12,
  },
  invoiceCard: {
    gap: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceInfo: {
    flex: 1,
    gap: 2,
  },
  invoiceId: {
    fontSize: 16,
  },
  invoiceDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyInvoices: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  upgradeModal: {
    gap: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  modalDescription: {
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
  },
  modalFeatures: {
    gap: 8,
  },
  modalFeature: {
    paddingLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModal: {
    gap: 16,
    padding: 16,
  },
});

export default SubscriptionScreen;