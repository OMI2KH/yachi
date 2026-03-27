import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Platform,
  Share,
  Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchProjectDetails();
    fetchUserData();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      // Simulate API call - replace with your actual API endpoint
      setTimeout(async () => {
        // Mock project data
        const mockProject = {
          id: parseInt(id),
          title: "Community Water Well Project",
          description: "A clean water initiative to provide safe drinking water for 500 families in the rural village of Woliso, Ethiopia. This project will build a deep water well with solar-powered pumping system, storage tanks, and 10 water distribution points.",
          category: "Health & Sanitation",
          location: "Woliso, Oromia",
          targetAmount: 250000,
          currentAmount: 187500,
          deadline: "2024-06-30",
          backers: 324,
          images: [
            "https://images.unsplash.com/photo-1540324155971-3d4b2d0b62fa?w=800",
            "https://images.unsplash.com/photo-1577896851231-70ef18881754?w-800"
          ],
          creator: {
            name: "EthioHope Foundation",
            verified: true,
            avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200"
          },
          updates: [
            {
              id: 1,
              date: "2024-03-15",
              title: "Site Survey Completed",
              content: "Our engineering team has completed the initial site survey. Water testing shows excellent quality at 150m depth."
            },
            {
              id: 2,
              date: "2024-02-28",
              title: "Permits Approved",
              content: "Received all necessary government approvals and permits for construction."
            }
          ],
          rewards: [
            {
              id: 1,
              amount: 500,
              title: "Supporter",
              description: "Thank you mention on our website + Digital certificate",
              estimatedDelivery: "2024-07-01",
              backers: 150
            },
            {
              id: 2,
              amount: 2000,
              title: "Builder",
              description: "All previous rewards + Name engraved on dedication plaque + Project progress reports",
              estimatedDelivery: "2024-07-01",
              backers: 89
            }
          ],
          faqs: [
            {
              question: "How will the funds be used?",
              answer: "70% for construction, 20% for equipment, 10% for community training and maintenance."
            },
            {
              question: "What happens if the project doesn't reach its goal?",
              answer: "All contributions will be refunded in full if we don't reach our target."
            }
          ],
          status: "active",
          createdAt: "2024-01-15"
        };
        
        setProject(mockProject);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching project:', error);
      Alert.alert('Error', 'Failed to load project details');
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      // Fetch user's payment methods and balance
      const token = await AsyncStorage.getItem('userToken');
      // Simulate API calls
      const mockPaymentMethods = [
        { id: 1, type: 'mobile_money', provider: 'telebirr', phone: '+251912345678', isDefault: true },
        { id: 2, type: 'mobile_money', provider: 'cbe_birr', phone: '+251987654321', isDefault: false },
        { id: 3, type: 'bank_account', provider: 'cbe_birr', bankName: 'Commercial Bank of Ethiopia', isDefault: false }
      ];
      
      setPaymentMethods(mockPaymentMethods);
      setSelectedPaymentMethod(mockPaymentMethods[0]);
      setUserBalance(1500); // Mock balance in ETB
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid contribution amount');
      return;
    }

    const amount = parseFloat(contributionAmount);
    
    if (amount < 10) {
      Alert.alert('Minimum Amount', 'Minimum contribution is 10 ETB');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContributing(true);

    try {
      // Here you would call your payment API
      // For now, simulate payment processing
      setTimeout(() => {
        setContributing(false);
        showSuccessModal();
      }, 2000);
    } catch (error) {
      setContributing(false);
      Alert.alert('Payment Failed', error.message || 'Please try again');
    }
  };

  const showSuccessModal = () => {
    Alert.alert(
      'Thank You! 🎉',
      `Your contribution of ${contributionAmount} ETB has been successfully processed.`,
      [
        {
          text: 'View Receipt',
          onPress: () => router.push(`/receipt/${Date.now()}`)
        },
        {
          text: 'Done',
          style: 'cancel'
        }
      ]
    );
    
    // Reset form
    setContributionAmount('');
    setShowPaymentOptions(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing project: ${project.title}\n\nHelp us reach our goal of ${project.targetAmount.toLocaleString()} ETB!`,
        url: `https://ethiohope.com/projects/${id}`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSaveProject = async () => {
    try {
      const savedProjects = JSON.parse(await AsyncStorage.getItem('savedProjects') || '[]');
      if (!savedProjects.includes(id)) {
        savedProjects.push(id);
        await AsyncStorage.setItem('savedProjects', JSON.stringify(savedProjects));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved!', 'Project saved to your favorites');
      } else {
        Alert.alert('Already Saved', 'This project is already in your favorites');
      }
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const calculateProgress = () => {
    if (!project) return 0;
    return (project.currentAmount / project.targetAmount) * 100;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const renderPaymentMethodIcon = (method) => {
    switch (method.provider) {
      case 'telebirr':
        return <Ionicons name="phone-portrait" size={24} color="#4CAF50" />;
      case 'cbe_birr':
        return <FontAwesome name="bank" size={24} color="#2196F3" />;
      case 'chapa':
        return <MaterialIcons name="payment" size={24} color="#FF9800" />;
      default:
        return <Ionicons name="card" size={24} color="#666" />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading project details...</Text>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>Project not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: project.images[0] }}
            style={styles.projectImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageGradient}
          />
          
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.rightButtons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleSaveProject}
              >
                <Ionicons name="bookmark-outline" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.imageOverlay}>
            <Text style={styles.categoryBadge}>{project.category}</Text>
            <Text style={styles.projectTitle}>{project.title}</Text>
            <Text style={styles.projectLocation}>
              <Ionicons name="location" size={16} color="#FFF" /> {project.location}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(project.currentAmount)}</Text>
              <Text style={styles.statLabel}>Raised</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(project.targetAmount)}</Text>
              <Text style={styles.statLabel}>Goal</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{project.backers}</Text>
              <Text style={styles.statLabel}>Backers</Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(calculateProgress(), 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round(calculateProgress())}% funded
            </Text>
          </View>
          
          <View style={styles.deadlineContainer}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.deadlineText}>
              {Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days left
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
              Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'updates' && styles.activeTab]}
            onPress={() => setActiveTab('updates')}
          >
            <Text style={[styles.tabText, activeTab === 'updates' && styles.activeTabText]}>
              Updates
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rewards' && styles.activeTab]}
            onPress={() => setActiveTab('rewards')}
          >
            <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>
              Rewards
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'details' && (
            <>
              <Text style={styles.sectionTitle}>About this project</Text>
              <Text style={styles.description}>{project.description}</Text>
              
              <View style={styles.creatorCard}>
                <Image
                  source={{ uri: project.creator.avatar }}
                  style={styles.creatorAvatar}
                />
                <View style={styles.creatorInfo}>
                  <View style={styles.creatorHeader}>
                    <Text style={styles.creatorName}>{project.creator.name}</Text>
                    {project.creator.verified && (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    )}
                  </View>
                  <Text style={styles.creatorProjects}>5 projects created</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>FAQs</Text>
              {project.faqs.map((faq, index) => (
                <View key={index} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
            </>
          )}

          {activeTab === 'updates' && (
            <>
              <Text style={styles.sectionTitle}>Project Updates</Text>
              {project.updates.map((update) => (
                <View key={update.id} style={styles.updateCard}>
                  <Text style={styles.updateDate}>{update.date}</Text>
                  <Text style={styles.updateTitle}>{update.title}</Text>
                  <Text style={styles.updateContent}>{update.content}</Text>
                </View>
              ))}
            </>
          )}

          {activeTab === 'rewards' && (
            <>
              <Text style={styles.sectionTitle}>Backer Rewards</Text>
              {project.rewards.map((reward) => (
                <TouchableOpacity key={reward.id} style={styles.rewardCard}>
                  <View style={styles.rewardHeader}>
                    <Text style={styles.rewardAmount}>{formatCurrency(reward.amount)} ETB+</Text>
                    <Text style={styles.rewardBackers}>{reward.backers} backers</Text>
                  </View>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                  <View style={styles.rewardFooter}>
                    <Text style={styles.estimatedDelivery}>
                      Estimated delivery: {reward.estimatedDelivery}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Contribution Bottom Sheet */}
      <View style={styles.contributionContainer}>
        {!showPaymentOptions ? (
          <View style={styles.quickContribute}>
            <Text style={styles.contributeTitle}>Ready to make a difference?</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>ETB</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={contributionAmount}
                onChangeText={setContributionAmount}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={[
                  styles.contributeButton,
                  (!contributionAmount || parseFloat(contributionAmount) <= 0) && styles.contributeButtonDisabled
                ]}
                onPress={() => setShowPaymentOptions(true)}
                disabled={!contributionAmount || parseFloat(contributionAmount) <= 0}
              >
                <Text style={styles.contributeButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickAmounts}>
              {[100, 500, 1000, 5000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => {
                    setContributionAmount(amount.toString());
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.quickAmountText}>{amount} ETB</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.paymentOptions}>
            <View style={styles.paymentHeader}>
              <TouchableOpacity
                onPress={() => setShowPaymentOptions(false)}
                style={styles.backPaymentButton}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.paymentTitle}>Select Payment Method</Text>
            </View>

            <Text style={styles.paymentAmount}>
              Amount: {formatCurrency(parseFloat(contributionAmount))}
            </Text>

            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodOption,
                  selectedPaymentMethod?.id === method.id && styles.selectedPaymentMethod
                ]}
                onPress={() => setSelectedPaymentMethod(method)}
              >
                <View style={styles.paymentMethodLeft}>
                  {renderPaymentMethodIcon(method)}
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodName}>
                      {method.provider === 'telebirr' ? 'Telebirr' :
                       method.provider === 'cbe_birr' ? method.type === 'mobile_money' ? 'CBE Birr' : 'CBE Bank' :
                       'Chapa'}
                    </Text>
                    <Text style={styles.paymentMethodDetail}>
                      {method.type === 'mobile_money' ? method.phone : method.bankName}
                    </Text>
                  </View>
                </View>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addPaymentMethod}
              onPress={() => router.push('/payment-methods/add')}
            >
              <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.addPaymentMethodText}>Add New Payment Method</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payNowButton,
                contributing && styles.payNowButtonDisabled
              ]}
              onPress={handleContribute}
              disabled={contributing}
            >
              {contributing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.payNowButtonText}>Pay Now</Text>
                  <Ionicons name="lock-closed" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
              {' '}Your payment is secure and encrypted
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
  },
  imageContainer: {
    height: width * 0.7,
    position: 'relative',
  },
  projectImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  headerButtons: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  categoryBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  projectLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  progressSection: {
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deadlineText: {
    fontSize: 14,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  tabContent: {
    padding: 20,
    backgroundColor: '#FFF',
    minHeight: 400,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginBottom: 24,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  creatorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  creatorProjects: {
    fontSize: 14,
    color: '#666',
  },
  faqItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  updateCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  updateDate: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 8,
    fontWeight: '500',
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  updateContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  rewardCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  rewardBackers: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  rewardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  estimatedDelivery: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  contributionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  quickContribute: {
    gap: 16,
  },
  contributeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 16,
  },
  contributeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contributeButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  contributeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  paymentOptions: {
    gap: 16,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backPaymentButton: {
    padding: 4,
  },
  paymentTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedPaymentMethod: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodInfo: {
    gap: 4,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentMethodDetail: {
    fontSize: 14,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addPaymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addPaymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  payNowButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 12,
    marginTop: 8,
  },
  payNowButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  payNowButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});