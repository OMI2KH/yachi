import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  InteractionManager,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Context & Hooks
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useServices } from '../../../hooks/use-services';

// Services
import { serviceService } from '../../../services/service-service';
import { analyticsService } from '../../../services/analytics-service';
import { pricingService } from '../../../services/pricing-service';

// Components
import { PricingCard } from '../../../components/service/pricing-card';
import { PriceCalculator } from '../../../components/service/price-calculator';
import { ComparisonTable } from '../../../components/service/comparison-table';
import { PremiumPricing } from '../../../components/premium/premium-pricing';
import { Loading } from '../../../components/ui/loading';
import { AccessDenied } from '../../../components/ui/access-denied';
import { EmptyState } from '../../../components/ui/empty-state';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { TabView } from '../../../components/ui/tabview';

// Constants
import { PRICING_TYPES, CURRENCY, SERVICE_CATEGORIES } from '../../../constants/service';
import { USER_ROLES } from '../../../constants/user';
import { NAVIGATION_ROUTES } from '../../../constants/navigation';

// Utils
import { formatPrice, calculateTax, applyDiscount } from '../../../utils/formatters';
import { validatePricing } from '../../../utils/validators';

/**
 * Service Pricing Screen - Advanced pricing management and comparison
 * Supports dynamic pricing, package deals, premium features, and market analysis
 */
const ServicePricingScreen = () => {
  const { serviceId, providerId, categoryId } = useLocalSearchParams();
  const router = useRouter();
  const { width: screenWidth } = Dimensions.get('window');

  // Context hooks
  const { user, isAuthenticated, hasRole } = useAuth();
  const { theme, isDark } = useTheme();
  const { currentService, updateServicePricing } = useServices();

  // State management
  const [pricingData, setPricingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('packages');

  // Pricing states
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customQuote, setCustomQuote] = useState(null);
  const [calculatorInputs, setCalculatorInputs] = useState({});
  const [comparisonData, setComparisonData] = useState([]);

  // UI states
  const [showCalculator, setShowCalculator] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Refs
  const analyticsRef = useRef(null);
  const calculationTimeoutRef = useRef(null);
  const formRef = useRef(null);

  const styles = createStyles(theme, screenWidth);
  const isProvider = hasRole([USER_ROLES.SERVICE_PROVIDER]);
  const canEditPricing = isProvider && user?.id === providerId;

  /**
   * Load pricing data with comprehensive error handling
   */
  const loadPricingData = useCallback(async () => {
    if (!serviceId) {
      setError('Service ID is required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load service pricing data
      const [servicePricing, marketComparison, premiumOptions] = await Promise.all([
        serviceService.getServicePricing(serviceId),
        pricingService.getMarketComparison(serviceId, categoryId),
        pricingService.getPremiumPricingOptions(serviceId)
      ]);

      setPricingData({
        ...servicePricing,
        marketComparison,
        premiumOptions
      });

      // Set initial selected package
      if (servicePricing.packages?.length > 0) {
        setSelectedPackage(servicePricing.packages[0]);
      }

      // Track pricing view analytics
      analyticsRef.current = await analyticsService.trackPricingView({
        serviceId,
        providerId,
        userId: user?.id,
        categoryId,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Failed to load pricing data:', err);
      setError(err.message || 'Failed to load pricing information');
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, providerId, categoryId, user]);

  /**
   * Handle package selection with validation
   */
  const handlePackageSelect = useCallback(async (pkg) => {
    try {
      setSelectedPackage(pkg);

      // Track package selection
      await analyticsService.trackPackageSelection({
        serviceId,
        packageId: pkg.id,
        packageName: pkg.name,
        price: pkg.price,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });

      // Auto-calculate custom quote if calculator is active
      if (showCalculator && Object.keys(calculatorInputs).length > 0) {
        calculateCustomQuote(calculatorInputs, pkg);
      }

    } catch (err) {
      console.error('Failed to track package selection:', err);
    }
  }, [serviceId, user, showCalculator, calculatorInputs]);

  /**
   * Calculate custom quote based on inputs
   */
  const calculateCustomQuote = useCallback(async (inputs, basePackage = selectedPackage) => {
    if (!basePackage) return;

    try {
      // Clear previous timeout
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }

      // Debounce calculation for performance
      calculationTimeoutRef.current = setTimeout(async () => {
        const quote = await pricingService.calculateCustomQuote({
          serviceId,
          basePackage: basePackage.id,
          inputs,
          location: user?.location,
          providerId
        });

        setCustomQuote(quote);

        // Track quote calculation
        await analyticsService.trackQuoteCalculation({
          serviceId,
          packageId: basePackage.id,
          inputs,
          calculatedPrice: quote.totalPrice,
          userId: user?.id,
          timestamp: new Date().toISOString()
        });

      }, 300);

    } catch (err) {
      console.error('Failed to calculate custom quote:', err);
      Alert.alert('Calculation Error', 'Failed to calculate quote. Please try again.');
    }
  }, [serviceId, selectedPackage, providerId, user]);

  /**
   * Handle pricing update for providers
   */
  const handlePricingUpdate = async (updatedPricing) => {
    if (!canEditPricing) {
      Alert.alert('Permission Denied', 'You do not have permission to update pricing');
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      // Validate pricing data
      const validation = validatePricing(updatedPricing);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Update pricing via service
      const result = await updateServicePricing(serviceId, updatedPricing);
      setPricingData(result);

      // Track pricing update
      await analyticsService.trackPricingUpdate({
        serviceId,
        providerId: user.id,
        updates: updatedPricing,
        timestamp: new Date().toISOString()
      });

      Alert.alert('Success', 'Pricing updated successfully');

    } catch (err) {
      console.error('Failed to update pricing:', err);
      setError(err.message || 'Failed to update pricing');
      Alert.alert('Update Failed', 'Please check your inputs and try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle booking with selected package or custom quote
   */
  const handleBookService = async (bookingData) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to book this service',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => router.push(NAVIGATION_ROUTES.LOGIN)
          }
        ]
      );
      return;
    }

    try {
      const finalPrice = bookingData.customQuote?.totalPrice || selectedPackage?.price;

      // Navigate to booking screen with pricing data
      router.push({
        pathname: NAVIGATION_ROUTES.BOOKING_CREATE,
        params: {
          serviceId,
          providerId,
          packageId: selectedPackage?.id,
          customQuote: bookingData.customQuote ? JSON.stringify(bookingData.customQuote) : undefined,
          finalPrice,
          currency: CURRENCY.ETB
        }
      });

    } catch (err) {
      console.error('Failed to initiate booking:', err);
      Alert.alert('Booking Error', 'Failed to start booking process');
    }
  };

  /**
   * Handle premium feature purchase
   */
  const handlePremiumPurchase = async (premiumOption) => {
    if (!isAuthenticated) {
      router.push(NAVIGATION_ROUTES.LOGIN);
      return;
    }

    try {
      // Navigate to premium purchase flow
      router.push({
        pathname: NAVIGATION_ROUTES.PREMIUM_PURCHASE,
        params: {
          serviceId,
          premiumOptionId: premiumOption.id,
          price: premiumOption.price,
          feature: 'pricing_highlight'
        }
      });

    } catch (err) {
      console.error('Failed to initiate premium purchase:', err);
      Alert.alert('Purchase Error', 'Failed to start premium purchase');
    }
  };

  /**
   * Generate pricing comparison data
   */
  const generateComparisonData = useCallback(() => {
    if (!pricingData?.marketComparison) return [];

    const comparisons = pricingData.marketComparison.map(competitor => ({
      ...competitor,
      valueScore: calculateValueScore(competitor, pricingData),
      difference: competitor.averagePrice - (pricingData.basePrice || 0)
    }));

    setComparisonData(comparisons);
  }, [pricingData]);

  /**
   * Calculate value score for comparison
   */
  const calculateValueScore = (competitor, currentPricing) => {
    const priceRatio = (competitor.averagePrice / (currentPricing.basePrice || 1)) * 100;
    const ratingRatio = (competitor.averageRating / 5) * 100;
    
    // Weighted score (60% price, 40% rating)
    return (priceRatio * 0.6) + (ratingRatio * 0.4);
  };

  /**
   * Render pricing packages section
   */
  const renderPackagesTab = () => (
    <View style={styles.tabContent}>
      {/* Package Selection */}
      <Card style={styles.packagesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Service Packages</Text>
          <Badge 
            text={`${pricingData?.packages?.length || 0} options`}
            variant="info"
          />
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.packagesScroll}
        >
          {pricingData?.packages?.map((pkg) => (
            <PricingCard
              key={pkg.id}
              package={pkg}
              isSelected={selectedPackage?.id === pkg.id}
              onSelect={() => handlePackageSelect(pkg)}
              currency={CURRENCY.ETB}
              theme={theme}
              style={styles.pricingCard}
            />
          ))}
        </ScrollView>
      </Card>

      {/* Selected Package Details */}
      {selectedPackage && (
        <Card style={styles.selectedPackageSection}>
          <View style={styles.packageHeader}>
            <View>
              <Text style={styles.packageName}>{selectedPackage.name}</Text>
              <Text style={styles.packageDescription}>
                {selectedPackage.description}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {formatPrice(selectedPackage.price, CURRENCY.ETB)}
              </Text>
              {selectedPackage.originalPrice && (
                <Text style={styles.originalPrice}>
                  {formatPrice(selectedPackage.originalPrice, CURRENCY.ETB)}
                </Text>
              )}
            </View>
          </View>

          {/* Package Features */}
          <View style={styles.featuresList}>
            {selectedPackage.features?.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureText}>✓ {feature}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Book This Package"
              onPress={() => handleBookService({ package: selectedPackage })}
              variant="primary"
              style={styles.bookButton}
              loading={isUpdating}
            />
            <Button
              title="Get Custom Quote"
              onPress={() => setShowCalculator(true)}
              variant="outlined"
              style={styles.quoteButton}
            />
          </View>
        </Card>
      )}
    </View>
  );

  /**
   * Render custom quote calculator
   */
  const renderCalculatorTab = () => (
    <View style={styles.tabContent}>
      <PriceCalculator
        serviceId={serviceId}
        basePackage={selectedPackage}
        onInputChange={(inputs) => {
          setCalculatorInputs(inputs);
          calculateCustomQuote(inputs);
        }}
        onQuoteCalculate={calculateCustomQuote}
        theme={theme}
        style={styles.calculator}
      />

      {/* Custom Quote Result */}
      {customQuote && (
        <Card style={styles.quoteResult}>
          <View style={styles.quoteHeader}>
            <Text style={styles.quoteTitle}>Your Custom Quote</Text>
            <Badge 
              text="Calculated"
              variant="success"
            />
          </View>

          <View style={styles.quoteDetails}>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Base Price:</Text>
              <Text style={styles.quoteValue}>
                {formatPrice(customQuote.basePrice, CURRENCY.ETB)}
              </Text>
            </View>

            {customQuote.adjustments?.map((adjustment, index) => (
              <View key={index} style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>{adjustment.description}:</Text>
                <Text style={[
                  styles.quoteValue,
                  adjustment.amount > 0 ? styles.positiveAdjustment : styles.negativeAdjustment
                ]}>
                  {adjustment.amount > 0 ? '+' : ''}{formatPrice(adjustment.amount, CURRENCY.ETB)}
                </Text>
              </View>
            ))}

            <View style={[styles.quoteRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                {formatPrice(customQuote.totalPrice, CURRENCY.ETB)}
              </Text>
            </View>
          </View>

          <Button
            title="Book with Custom Quote"
            onPress={() => handleBookService({ customQuote })}
            variant="primary"
            style={styles.bookButton}
          />
        </Card>
      )}
    </View>
  );

  /**
   * Render market comparison
   */
  const renderComparisonTab = () => (
    <View style={styles.tabContent}>
      <ComparisonTable
        data={comparisonData}
        currentService={pricingData}
        onServiceSelect={(service) => {
          router.push({
            pathname: NAVIGATION_ROUTES.SERVICE_DETAIL,
            params: { serviceId: service.id }
          });
        }}
        theme={theme}
        style={styles.comparisonTable}
      />

      {/* Market Insights */}
      <Card style={styles.insightsCard}>
        <Text style={styles.insightsTitle}>Market Insights</Text>
        <View style={styles.insightsList}>
          <View style={styles.insightItem}>
            <Text style={styles.insightText}>
              • Your price is {pricingData?.basePrice && comparisonData[0]?.difference > 0 ? 'lower' : 'higher'} than market average
            </Text>
          </View>
          <View style={styles.insightItem}>
            <Text style={styles.insightText}>
              • {pricingData?.premiumOptions?.length || 0} premium features available
            </Text>
          </View>
          <View style={styles.insightItem}>
            <Text style={styles.insightText}>
              • Consider seasonal pricing adjustments
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );

  /**
   * Render provider pricing management
   */
  const renderProviderTab = () => (
    <View style={styles.tabContent}>
      {canEditPricing ? (
        <PricingManagement
          pricingData={pricingData}
          onPricingUpdate={handlePricingUpdate}
          isUpdating={isUpdating}
          theme={theme}
        />
      ) : (
        <EmptyState
          icon="lock"
          title="Provider Access Required"
          message="Only service providers can manage pricing"
          action={isAuthenticated ? null : {
            label: 'Sign In',
            onPress: () => router.push(NAVIGATION_ROUTES.LOGIN)
          }}
        />
      )}
    </View>
  );

  // Tab configuration
  const clientTabs = [
    { key: 'packages', title: 'Packages', icon: 'package' },
    { key: 'calculator', title: 'Get Quote', icon: 'calculator' },
    { key: 'comparison', title: 'Compare', icon: 'compare' },
  ];

  const providerTabs = [
    ...clientTabs,
    { key: 'manage', title: 'Manage', icon: 'settings' },
  ];

  const tabs = canEditPricing ? providerTabs : clientTabs;

  // Effects
  useEffect(() => {
    loadPricingData();
  }, [loadPricingData]);

  useEffect(() => {
    if (pricingData) {
      generateComparisonData();
    }
  }, [pricingData, generateComparisonData]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      if (analyticsRef.current) {
        analyticsService.cleanup(analyticsRef.current);
      }
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading pricing information..." />
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="error"
          title="Unable to Load Pricing"
          message={error}
          action={{
            label: 'Try Again',
            onPress: loadPricingData
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Service Pricing</Text>
        <View style={styles.headerBadges}>
          <Badge text={CURRENCY.ETB} variant="outline" />
          {pricingData?.isPremium && (
            <Badge text="Premium" variant="premium" />
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <TabView
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabView}
      />

      {/* Tab Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'packages' && renderPackagesTab()}
        {activeTab === 'calculator' && renderCalculatorTab()}
        {activeTab === 'comparison' && renderComparisonTab()}
        {activeTab === 'manage' && renderProviderTab()}
      </ScrollView>

      {/* Premium Features Modal */}
      <PremiumPricing
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        options={pricingData?.premiumOptions}
        onPurchase={handlePremiumPurchase}
        theme={theme}
      />
    </SafeAreaView>
  );
};

/**
 * Pricing Management Component for Providers
 */
const PricingManagement = ({ pricingData, onPricingUpdate, isUpdating, theme }) => {
  const [editablePricing, setEditablePricing] = useState(pricingData);
  const [validationErrors, setValidationErrors] = useState({});

  const handleFieldUpdate = (field, value) => {
    setEditablePricing(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation errors for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleSave = () => {
    const validation = validatePricing(editablePricing);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    onPricingUpdate(editablePricing);
  };

  return (
    <View style={styles.managementContainer}>
      <Card style={styles.managementCard}>
        <Text style={styles.managementTitle}>Pricing Management</Text>
        
        {/* Base Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Base Price (ETB)</Text>
          <Input
            value={editablePricing.basePrice?.toString()}
            onChangeText={(value) => handleFieldUpdate('basePrice', parseFloat(value))}
            keyboardType="numeric"
            error={validationErrors.basePrice}
          />
        </View>

        {/* Package Management */}
        <Text style={styles.sectionTitle}>Service Packages</Text>
        {/* Implement package management interface */}

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={isUpdating}
          variant="primary"
          style={styles.saveButton}
        />
      </Card>
    </View>
  );
};

/**
 * Create dynamic styles based on theme and screen dimensions
 */
const createStyles = (theme, screenWidth) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  tabView: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  packagesSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  packagesScroll: {
    paddingRight: 16,
  },
  pricingCard: {
    width: screenWidth * 0.7,
    marginRight: 12,
  },
  selectedPackageSection: {
    padding: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  originalPrice: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    paddingVertical: 6,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bookButton: {
    flex: 2,
  },
  quoteButton: {
    flex: 1,
  },
  calculator: {
    marginBottom: 16,
  },
  quoteResult: {
    padding: 16,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  quoteDetails: {
    gap: 8,
    marginBottom: 20,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quoteValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  positiveAdjustment: {
    color: theme.colors.error,
  },
  negativeAdjustment: {
    color: theme.colors.success,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  comparisonTable: {
    marginBottom: 16,
  },
  insightsCard: {
    padding: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  insightsList: {
    gap: 8,
  },
  insightItem: {
    paddingLeft: 8,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  managementContainer: {
    gap: 16,
  },
  managementCard: {
    padding: 16,
  },
  managementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 20,
  },
});

export default ServicePricingScreen;