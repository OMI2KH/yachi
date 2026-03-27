// screens/modal/premium.js
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/auth-context';
import { usePremium } from '../../contexts/premium-context';
import { useNotifications } from '../../contexts/notification-context';

// Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import Card from '../../components/ui/card';
import Badge from '../../components/ui/badge';
import Loading from '../../components/ui/loading';
import PremiumBadge from '../../components/premium/premium-badge';
import BenefitsList from '../../components/premium/benefits-list';
import SubscriptionCard from '../../components/premium/subscription-card';

// Services
import { initiatePremiumPayment, activatePremium } from '../../services/premium-service';
import { sendNotification } from '../../services/notification-service';

// Utils
import { formatCurrency } from '../../utils/formatters';
import { validatePayment } from '../../utils/validators';

// Constants
import { PREMIUM_PLANS, PREMIUM_FEATURES } from '../../constants/premium';

const PremiumModal = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium, userTier, activateUserPremium } = usePremium();
  const { showNotification } = useNotifications();

  // State
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('chapa');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  // Premium plans configuration
  const premiumPlans = useMemo(() => [
    {
      id: 'monthly',
      name: 'Premium Monthly',
      price: 200,
      originalPrice: 299,
      period: 'month',
      savings: 33,
      popular: true,
      features: [
        'Premium badge on profile',
        'Priority in search results',
        'Featured listing placement',
        'Advanced analytics',
        'Priority customer support',
        'Unlimited service listings'
      ]
    },
    {
      id: 'quarterly',
      name: 'Premium Quarterly',
      price: 500,
      originalPrice: 897,
      period: '3 months',
      savings: 44,
      features: [
        'All monthly features',
        'Extended visibility boost',
        'Profile highlighting',
        'Early access to new features'
      ]
    },
    {
      id: 'yearly',
      name: 'Premium Yearly',
      price: 1800,
      originalPrice: 3588,
      period: 'year',
      savings: 50,
      bestValue: true,
      features: [
        'All quarterly features',
        'Dedicated account manager',
        'Custom profile customization',
        'Premium support line',
        'Business insights reports'
      ]
    }
  ], []);

  // Payment methods
  const paymentMethods = useMemo(() => [
    {
      id: 'chapa',
      name: 'Chapa',
      logo: '🏦',
      description: 'Secure online payments',
      supported: true
    },
    {
      id: 'telebirr',
      name: 'Telebirr',
      logo: '📱',
      description: 'Mobile money payment',
      supported: true
    },
    {
      id: 'cbebirr',
      name: 'CBE Birr',
      logo: '💳',
      description: 'Bank transfer',
      supported: true
    }
  ], []);

  // Premium features breakdown
  const featureCategories = useMemo(() => [
    {
      title: 'Visibility Boost',
      icon: '👁️',
      features: [
        'Priority placement in search results',
        'Featured listing carousel',
        'Category page highlighting',
        'Extended profile visibility'
      ]
    },
    {
      title: 'Business Tools',
      icon: '🛠️',
      features: [
        'Advanced performance analytics',
        'Customer insights dashboard',
        'Booking management tools',
        'Revenue tracking reports'
      ]
    },
    {
      title: 'Premium Support',
      icon: '🎯',
      features: [
        'Priority customer support',
        'Dedicated help line',
        'Faster response times',
        'Extended support hours'
      ]
    },
    {
      title: 'Exclusive Features',
      icon: '⭐',
      features: [
        'Premium verification badge',
        'Custom profile customization',
        'Early access to new features',
        'Special promotions and offers'
      ]
    }
  ], []);

  // Get selected plan details
  const selectedPlanDetails = useMemo(() => 
    premiumPlans.find(plan => plan.id === selectedPlan) || premiumPlans[0],
    [selectedPlan, premiumPlans]
  );

  // Get selected payment method
  const selectedPaymentDetails = useMemo(() =>
    paymentMethods.find(method => method.id === selectedPaymentMethod) || paymentMethods[0],
    [selectedPaymentMethod, paymentMethods]
  );

  // Handle premium subscription
  const handleSubscribe = useCallback(async () => {
    if (!user) {
      showNotification('error', 'Please login to subscribe to premium');
      router.back();
      return;
    }

    if (isPremium) {
      showNotification('info', 'You are already a premium member!');
      return;
    }

    setShowPaymentMethods(true);
  }, [user, isPremium, router, showNotification]);

  // Process payment
  const handleProcessPayment = useCallback(async () => {
    if (!user || !selectedPlanDetails || !selectedPaymentDetails) {
      showNotification('error', 'Missing required information');
      return;
    }

    if (!selectedPaymentDetails.supported) {
      showNotification('error', 'This payment method is not yet supported');
      return;
    }

    setProcessingPayment(true);
    try {
      // Validate payment data
      const validation = validatePayment({
        amount: selectedPlanDetails.price,
        currency: 'ETB',
        userId: user.id,
        plan: selectedPlan
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Initiate payment
      const paymentResult = await initiatePremiumPayment({
        userId: user.id,
        planId: selectedPlan,
        amount: selectedPlanDetails.price,
        paymentMethod: selectedPaymentMethod,
        userEmail: user.email,
        userPhone: user.phone
      });

      if (paymentResult.success) {
        // Activate premium immediately (in real app, wait for webhook confirmation)
        const activationResult = await activateUserPremium({
          userId: user.id,
          plan: selectedPlan,
          transactionId: paymentResult.transactionId,
          expiresAt: calculateExpiryDate(selectedPlan)
        });

        if (activationResult.success) {
          showNotification('success', '🎉 Welcome to Yachi Premium!');
          
          // Send welcome notification
          await sendNotification({
            type: 'PREMIUM_ACTIVATED',
            title: 'Premium Membership Activated',
            message: `You now have access to all premium features with ${selectedPlanDetails.name}`,
            recipientIds: [user.id],
            data: { plan: selectedPlan, expiry: calculateExpiryDate(selectedPlan) }
          });

          router.push('/premium/success');
        } else {
          throw new Error('Failed to activate premium');
        }
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Premium subscription error:', error);
      showNotification('error', `Subscription failed: ${error.message}`);
    } finally {
      setProcessingPayment(false);
    }
  }, [user, selectedPlan, selectedPlanDetails, selectedPaymentMethod, selectedPaymentDetails, activateUserPremium, showNotification, router]);

  // Calculate expiry date based on plan
  const calculateExpiryDate = useCallback((plan) => {
    const now = new Date();
    switch (plan) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }, []);

  // Handle restore purchases
  const handleRestorePurchase = useCallback(async () => {
    setLoading(true);
    try {
      // In a real app, this would verify receipts with your backend
      showNotification('info', 'Checking for existing subscriptions...');
      // Implementation would go here
    } catch (error) {
      console.error('Restore purchase error:', error);
      showNotification('error', 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Handle terms link
  const handleOpenTerms = useCallback(async () => {
    const termsUrl = 'https://yachi.app/terms/premium';
    try {
      await Linking.openURL(termsUrl);
    } catch (error) {
      console.error('Failed to open terms:', error);
      showNotification('error', 'Cannot open terms link');
    }
  }, [showNotification]);

  // Render plan card
  const renderPlanCard = useCallback((plan) => (
    <SubscriptionCard
      key={plan.id}
      plan={plan}
      selected={selectedPlan === plan.id}
      onSelect={() => setSelectedPlan(plan.id)}
      disabled={processingPayment}
    />
  ), [selectedPlan, processingPayment]);

  // Render payment method
  const renderPaymentMethod = useCallback((method) => (
    <Card 
      key={method.id}
      style={[
        styles.paymentMethodCard,
        selectedPaymentMethod === method.id && styles.paymentMethodSelected,
        !method.supported && styles.paymentMethodDisabled
      ]}
      onPress={() => method.supported && setSelectedPaymentMethod(method.id)}
      disabled={!method.supported || processingPayment}
    >
      <View style={styles.paymentMethodContent}>
        <View style={styles.paymentMethodHeader}>
          <ThemedText style={styles.paymentMethodLogo}>{method.logo}</ThemedText>
          <View style={styles.paymentMethodInfo}>
            <ThemedText style={styles.paymentMethodName}>{method.name}</ThemedText>
            <ThemedText style={styles.paymentMethodDescription}>
              {method.description}
            </ThemedText>
          </View>
          {selectedPaymentMethod === method.id && (
            <Badge variant="success" size="small">Selected</Badge>
          )}
          {!method.supported && (
            <Badge variant="default" size="small">Coming Soon</Badge>
          )}
        </View>
      </View>
    </Card>
  ), [selectedPaymentMethod, processingPayment]);

  // Render feature category
  const renderFeatureCategory = useCallback((category) => (
    <Card key={category.title} style={styles.featureCategoryCard}>
      <View style={styles.featureCategoryHeader}>
        <ThemedText style={styles.featureCategoryIcon}>{category.icon}</ThemedText>
        <ThemedText style={styles.featureCategoryTitle}>{category.title}</ThemedText>
      </View>
      <BenefitsList benefits={category.features} />
    </Card>
  ), []);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Loading message="Loading premium options..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <PremiumBadge size="large" />
            <ThemedText style={styles.title}>Yachi Premium</ThemedText>
            <ThemedText style={styles.subtitle}>
              Boost your visibility and grow your business with premium features
            </ThemedText>
          </View>
          
          {isPremium && (
            <Card style={styles.currentPlanCard}>
              <ThemedText style={styles.currentPlanText}>
                ✅ You are currently on {userTier} plan
              </ThemedText>
              <ThemedText style={styles.currentPlanDescription}>
                Enjoy all premium benefits and features
              </ThemedText>
            </Card>
          )}
        </View>

        {/* Premium Benefits Overview */}
        {!isPremium && (
          <Card style={styles.benefitsCard}>
            <ThemedText style={styles.sectionTitle}>Why Go Premium?</ThemedText>
            <View style={styles.benefitsGrid}>
              {featureCategories.map(renderFeatureCategory)}
            </View>
          </Card>
        )}

        {/* Pricing Plans */}
        {!isPremium && (
          <Card style={styles.plansCard}>
            <View style={styles.plansHeader}>
              <ThemedText style={styles.sectionTitle}>Choose Your Plan</ThemedText>
              <Badge variant="primary">Save up to 50%</Badge>
            </View>
            
            <View style={styles.plansContainer}>
              {premiumPlans.map(renderPlanCard)}
            </View>

            {/* Selected Plan Summary */}
            <Card style={styles.planSummaryCard}>
              <View style={styles.planSummary}>
                <View style={styles.planSummaryInfo}>
                  <ThemedText style={styles.planSummaryName}>
                    {selectedPlanDetails.name}
                  </ThemedText>
                  <ThemedText style={styles.planSummaryPrice}>
                    {formatCurrency(selectedPlanDetails.price, 'ETB')}
                    <ThemedText style={styles.planSummaryPeriod}>
                      /{selectedPlanDetails.period}
                    </ThemedText>
                  </ThemedText>
                </View>
                {selectedPlanDetails.originalPrice && (
                  <View style={styles.savingsBadge}>
                    <ThemedText style={styles.savingsText}>
                      Save {selectedPlanDetails.savings}%
                    </ThemedText>
                  </View>
                )}
              </View>
            </Card>
          </Card>
        )}

        {/* Payment Methods */}
        {!isPremium && showPaymentMethods && (
          <Card style={styles.paymentMethodsCard}>
            <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
            <ThemedText style={styles.paymentMethodsDescription}>
              Secure payment processed through Ethiopian payment gateways
            </ThemedText>
            
            <View style={styles.paymentMethodsList}>
              {paymentMethods.map(renderPaymentMethod)}
            </View>
          </Card>
        )}

        {/* Testimonial Section */}
        <Card style={styles.testimonialCard}>
          <ThemedText style={styles.sectionTitle}>Success Stories</ThemedText>
          <View style={styles.testimonial}>
            <ThemedText style={styles.testimonialQuote}>
              "Since going Premium, my bookings increased by 300% and I'm getting more high-quality clients. Best investment in my business!"
            </ThemedText>
            <View style={styles.testimonialAuthor}>
              <ThemedText style={styles.testimonialName}>Alemayehu T.</ThemedText>
              <ThemedText style={styles.testimonialRole}>Electrician, Addis Ababa</ThemedText>
            </View>
          </View>
        </Card>

        {/* FAQ Section */}
        <Card style={styles.faqCard}>
          <ThemedText style={styles.sectionTitle}>Frequently Asked Questions</ThemedText>
          
          <View style={styles.faqItem}>
            <ThemedText style={styles.faqQuestion}>
              Can I cancel my subscription anytime?
            </ThemedText>
            <ThemedText style={styles.faqAnswer}>
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </ThemedText>
          </View>

          <View style={styles.faqItem}>
            <ThemedText style={styles.faqQuestion}>
              Is there a free trial?
            </ThemedText>
            <ThemedText style={styles.faqAnswer}>
              We offer a 7-day free trial for new users to experience premium features before committing.
            </ThemedText>
          </View>

          <View style={styles.faqItem}>
            <ThemedText style={styles.faqQuestion}>
              What payment methods do you accept?
            </ThemedText>
            <ThemedText style={styles.faqAnswer}>
              We accept Chapa, Telebirr, and CBE Birr for secure Ethiopian payments.
            </ThemedText>
          </View>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {isPremium ? (
          <Button
            variant="primary"
            onPress={() => router.back()}
            style={styles.continueButton}
          >
            Continue Enjoying Premium
          </Button>
        ) : showPaymentMethods ? (
          <>
            <Button
              variant="primary"
              onPress={handleProcessPayment}
              loading={processingPayment}
              disabled={processingPayment}
              style={styles.subscribeButton}
            >
              {processingPayment ? 'Processing...' : `Subscribe for ${formatCurrency(selectedPlanDetails.price, 'ETB')}`}
            </Button>
            <Button
              variant="outline"
              onPress={() => setShowPaymentMethods(false)}
              disabled={processingPayment}
            >
              Back to Plans
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            onPress={handleSubscribe}
            style={styles.subscribeButton}
          >
            Try Premium Free for 7 Days
          </Button>
        )}

        {!isPremium && (
          <View style={styles.legalSection}>
            <ThemedText style={styles.legalText}>
              By subscribing, you agree to our{' '}
              <ThemedText style={styles.legalLink} onPress={handleOpenTerms}>
                Terms of Service
              </ThemedText>
              {' '}and{' '}
              <ThemedText style={styles.legalLink} onPress={handleOpenTerms}>
                Privacy Policy
              </ThemedText>
            </ThemedText>
            
            <Button
              variant="ghost"
              size="small"
              onPress={handleRestorePurchase}
              style={styles.restoreButton}
            >
              Restore Purchases
            </Button>
          </View>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
  currentPlanCard: {
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
  },
  currentPlanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0EA5E9',
    marginBottom: 4,
  },
  currentPlanDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  benefitsCard: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  benefitsGrid: {
    gap: 12,
  },
  featureCategoryCard: {
    padding: 16,
  },
  featureCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCategoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureCategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  plansCard: {
    marginBottom: 16,
    padding: 20,
  },
  plansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 16,
  },
  planSummaryCard: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  planSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planSummaryInfo: {
    flex: 1,
  },
  planSummaryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  planSummaryPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  planSummaryPeriod: {
    fontSize: 14,
    fontWeight: 'normal',
    opacity: 0.7,
  },
  savingsBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentMethodsCard: {
    marginBottom: 16,
    padding: 20,
  },
  paymentMethodsDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  paymentMethodsList: {
    gap: 8,
  },
  paymentMethodCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  paymentMethodDisabled: {
    opacity: 0.5,
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodLogo: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  testimonialCard: {
    marginBottom: 16,
    padding: 20,
  },
  testimonial: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  testimonialQuote: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 12,
  },
  testimonialAuthor: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  testimonialName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  testimonialRole: {
    fontSize: 12,
    opacity: 0.7,
  },
  faqCard: {
    marginBottom: 16,
    padding: 20,
  },
  faqItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  actions: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  subscribeButton: {
    marginBottom: 12,
  },
  continueButton: {
    marginBottom: 12,
  },
  legalSection: {
    alignItems: 'center',
    marginTop: 12,
  },
  legalText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  legalLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  restoreButton: {
    marginTop: 8,
  },
});

export default PremiumModal;