import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Animated,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');
const BADGE_SIZE = width * 0.4;

export default function BadgeScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [activeTab, setActiveTab] = useState('featured'); // 'featured', 'all', 'owned'
  const scaleAnim = useState(new Animated.Value(1))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Load badges from API
    fetchBadges();
    
    // Animation on mount
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Filter badges based on active tab
    if (activeTab === 'owned') {
      // Filter to show only owned badges
      // In real implementation, you'd filter from API response
    }
  }, [activeTab, badges]);

  const fetchBadges = async () => {
    try {
      // Mock data - replace with actual API call
      const mockBadges = [
        {
          id: 'premium_plus',
          title: 'Premium Plus',
          description: 'Exclusive premium status with all features unlocked',
          price: 299,
          currency: 'ETB',
          icon: 'crown',
          color: ['#FFD700', '#FFA500'],
          gradient: ['#FFD700', '#FFA500', '#FF8C00'],
          features: [
            'All premium features',
            'Priority support',
            'Early access to new features',
            'Custom profile theme'
          ],
          isPopular: true,
          isOwned: user?.subscription?.tier === 'premium_plus',
        },
        {
          id: 'verified_expert',
          title: 'Verified Expert',
          description: 'Showcase your expertise with this verified badge',
          price: 199,
          currency: 'ETB',
          icon: 'check-circle',
          color: ['#4CAF50', '#2E7D32'],
          gradient: ['#4CAF50', '#2E7D32', '#1B5E20'],
          features: [
            'Expert verification badge',
            'Higher search ranking',
            'Trust indicator',
            'Featured in expert directory'
          ],
          isOwned: user?.badges?.includes('verified_expert'),
        },
        {
          id: 'early_supporter',
          title: 'Early Supporter',
          description: 'Special badge for early platform supporters',
          price: 99,
          currency: 'ETB',
          icon: 'rocket',
          color: ['#9C27B0', '#6A1B9A'],
          gradient: ['#9C27B0', '#6A1B9A', '#4A148C'],
          features: [
            'Limited edition badge',
            'Exclusive supporter community',
            'Founder recognition',
            'Special discounts'
          ],
          isLimited: true,
          isOwned: user?.badges?.includes('early_supporter'),
        },
        {
          id: 'top_contributor',
          title: 'Top Contributor',
          description: 'Awarded for outstanding community contributions',
          price: 149,
          currency: 'ETB',
          icon: 'trophy',
          color: ['#FF9800', '#F57C00'],
          gradient: ['#FF9800', '#F57C00', '#E65100'],
          features: [
            'Contribution recognition',
            'Monthly rewards',
            'Community leader status',
            'Exclusive contributor perks'
          ],
          isOwned: user?.badges?.includes('top_contributor'),
        },
      ];
      
      setBadges(mockBadges);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching badges:', error);
      Alert.alert('Error', 'Failed to load badges. Please try again.');
      setLoading(false);
    }
  };

  const handleBadgePress = (badge) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (badge.isOwned) {
      Alert.alert(
        'Already Owned',
        `You already own the "${badge.title}" badge!`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedBadge(badge);
    setShowPurchaseModal(true);
    
    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePurchase = async () => {
    if (!selectedBadge) return;
    
    setPurchasing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      // Mock purchase - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In real implementation:
      // 1. Call your payment API with selected badge
      // 2. Handle Ethiopian payment gateways (Chapa, Telebirr, CBE Birr)
      // 3. Process payment confirmation
      
      Alert.alert(
        'Purchase Successful!',
        `You've successfully purchased the "${selectedBadge.title}" badge!`,
        [
          {
            text: 'View Profile',
            onPress: () => router.push('/profile'),
          },
          {
            text: 'Continue Browsing',
            onPress: () => setShowPurchaseModal(false),
          }
        ]
      );
      
      // Update local state
      setBadges(prev => prev.map(badge =>
        badge.id === selectedBadge.id
          ? { ...badge, isOwned: true }
          : badge
      ));
      
      setShowPurchaseModal(false);
      setSelectedBadge(null);
      
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Failed',
        'Failed to complete purchase. Please try again.'
      );
    } finally {
      setPurchasing(false);
    }
  };

  const renderBadgeIcon = (badge) => {
    const iconSize = BADGE_SIZE * 0.5;
    
    switch (badge.icon) {
      case 'crown':
        return (
          <FontAwesome5
            name="crown"
            size={iconSize}
            color="white"
            style={styles.badgeIcon}
          />
        );
      case 'check-circle':
        return (
          <Ionicons
            name="checkmark-circle"
            size={iconSize}
            color="white"
            style={styles.badgeIcon}
          />
        );
      case 'rocket':
        return (
          <Ionicons
            name="rocket"
            size={iconSize}
            color="white"
            style={styles.badgeIcon}
          />
        );
      case 'trophy':
        return (
          <Ionicons
            name="trophy"
            size={iconSize}
            color="white"
            style={styles.badgeIcon}
          />
        );
      default:
        return (
          <Ionicons
            name="star"
            size={iconSize}
            color="white"
            style={styles.badgeIcon}
          />
        );
    }
  };

  const renderBadgeCard = (badge) => {
    const isOwned = badge.isOwned;
    
    return (
      <TouchableOpacity
        key={badge.id}
        onPress={() => handleBadgePress(badge)}
        activeOpacity={0.8}
        style={styles.badgeCard}
      >
        <LinearGradient
          colors={badge.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.badgeContainer,
            isOwned && styles.ownedBadgeContainer,
          ]}
        >
          {/* Popular badge */}
          {badge.isPopular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>POPULAR</Text>
            </View>
          )}
          
          {/* Limited edition */}
          {badge.isLimited && (
            <View style={styles.limitedBadge}>
              <Ionicons name="time-outline" size={12} color="white" />
              <Text style={styles.limitedText}>LIMITED</Text>
            </View>
          )}
          
          {/* Badge icon */}
          <View style={styles.badgeIconContainer}>
            {renderBadgeIcon(badge)}
          </View>
          
          {/* Owned overlay */}
          {isOwned && (
            <View style={styles.ownedOverlay}>
              <Ionicons name="checkmark-circle" size={48} color="white" />
              <Text style={styles.ownedText}>OWNED</Text>
            </View>
          )}
        </LinearGradient>
        
        <View style={styles.badgeInfo}>
          <Text style={styles.badgeTitle}>{badge.title}</Text>
          <Text style={styles.badgeDescription} numberOfLines={2}>
            {badge.description}
          </Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {badge.price} {badge.currency}
            </Text>
            {isOwned ? (
              <View style={styles.ownedBadge}>
                <Text style={styles.ownedBadgeText}>Owned</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.buyButton}
                onPress={() => handleBadgePress(badge)}
                disabled={isOwned}
              >
                <Text style={styles.buyButtonText}>
                  {isOwned ? 'Owned' : 'Purchase'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading badges...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Premium Badges</Text>
        
        <TouchableOpacity
          onPress={() => router.push('/profile/badges')}
          style={styles.profileButton}
        >
          <Ionicons name="person-circle-outline" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        {['featured', 'all', 'owned'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTabButton,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab);
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <MaterialCommunityIcons
                  name="shield-crown"
                  size={60}
                  color="white"
                />
                <Text style={styles.heroTitle}>Unlock Exclusive Badges</Text>
                <Text style={styles.heroSubtitle}>
                  Showcase your status and unlock special features with premium badges
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Badges Grid */}
          <View style={styles.badgesGrid}>
            {badges.map(renderBadgeCard)}
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Why Get Badges?</Text>
            
            {[
              {
                icon: 'shield-checkmark',
                title: 'Verified Status',
                description: 'Gain trust and credibility in the community',
              },
              {
                icon: 'flash',
                title: 'Exclusive Features',
                description: 'Unlock special features and early access',
              },
              {
                icon: 'people',
                title: 'Community Recognition',
                description: 'Stand out and get recognized by others',
              },
              {
                icon: 'gift',
                title: 'Special Rewards',
                description: 'Receive exclusive perks and rewards',
              },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color="#007AFF"
                  />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBadge && (
              <>
                <LinearGradient
                  colors={selectedBadge.gradient}
                  style={styles.modalBadge}
                >
                  {renderBadgeIcon(selectedBadge)}
                </LinearGradient>
                
                <Text style={styles.modalTitle}>{selectedBadge.title}</Text>
                <Text style={styles.modalDescription}>
                  {selectedBadge.description}
                </Text>
                
                <View style={styles.featuresList}>
                  <Text style={styles.featuresTitle}>Includes:</Text>
                  {selectedBadge.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4CAF50"
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.priceSection}>
                  <Text style={styles.totalText}>Total</Text>
                  <Text style={styles.totalPrice}>
                    {selectedBadge.price} {selectedBadge.currency}
                  </Text>
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowPurchaseModal(false)}
                    disabled={purchasing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.purchaseButton,
                      purchasing && styles.purchaseButtonDisabled,
                    ]}
                    onPress={handlePurchase}
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="lock-open" size={20} color="white" />
                        <Text style={styles.purchaseButtonText}>
                          Purchase Now
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  profileButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTabButton: {
    // No style needed, indicator shows active state
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  activeTabText: {
    color: '#007AFF',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  heroGradient: {
    padding: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  badgesGrid: {
    paddingHorizontal: 16,
  },
  badgeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  badgeContainer: {
    height: BADGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ownedBadgeContainer: {
    opacity: 0.9,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    marginLeft: 2,
  },
  limitedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(156, 39, 176, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitedText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    marginLeft: 4,
  },
  badgeIconContainer: {
    width: BADGE_SIZE * 0.6,
    height: BADGE_SIZE * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  ownedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  badgeInfo: {
    padding: 16,
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  ownedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ownedBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  featuresSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: height * 0.8,
  },
  modalBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  featuresList: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 24,
  },
  totalText: {
    fontSize: 18,
    color: '#666',
  },
  totalPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  purchaseButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});