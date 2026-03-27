// components/profile/client-profile.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Shield,
  Star,
  MessageCircle,
  Calendar,
  ArrowLeft,
  Briefcase,
  Wallet,
  CheckCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  Award,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/auth-context';
import { useTheme } from '../../contexts/theme-context';
import { usePremium } from '../../contexts/premium-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';
import { PremiumBadge } from '../premium/premium-badge';
import { api } from '../../services/api';
import { userService } from '../../services/user-service';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Enterprise Client Profile Component
 * Features: Multi-role support, premium integration, advanced animations, Ethiopian market focus
 */

const ClientProfile = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const { theme, colors } = useTheme();
  const { isUserPremium, premiumTier } = usePremium();
  
  const { userId } = route.params || {};
  const [client, setClient] = useState(null);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadClientData();
    startEntranceAnimation();
  }, [userId]);

  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadClientData = async () => {
    try {
      setIsLoading(true);
      const [clientData, clientStats] = await Promise.all([
        userService.getClientProfile(userId),
        userService.getClientStats(userId),
      ]);

      setClient(clientData);
      setStats(clientStats);
    } catch (error) {
      console.error('Client profile load error:', error);
      Alert.alert('Error', 'Failed to load client profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClientData();
    setRefreshing(false);
  };

  const handleContact = () => {
    navigation.navigate('Chat', {
      receiverId: client.id,
      receiverName: client.displayName,
      receiverType: 'client',
      avatar: client.avatar,
    });
  };

  const handleBookService = () => {
    navigation.navigate('Services', { 
      presetClient: client,
      mode: 'booking' 
    });
  };

  const handleViewPortfolio = () => {
    navigation.navigate('Portfolio', { userId: client.id });
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, delay = 0 }) => (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 20 + delay],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[`${color}15`, `${color}08`]}
        style={styles.statGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statHeader}>
          <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
            <Icon size={20} color={color} />
          </View>
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </Text>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const ProjectCard = ({ project, index }) => (
    <Animated.View
      style={[
        styles.projectCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateX: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30 * (index + 1), 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.projectHeader}>
        <Text style={[styles.projectTitle, { color: colors.text }]}>{project.title}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(project.status)}20` },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
            {formatStatus(project.status)}
          </Text>
        </View>
      </View>

      <Text style={[styles.projectDescription, { color: colors.textSecondary }]}>
        {project.description}
      </Text>

      <View style={styles.projectMeta}>
        <View style={styles.metaItem}>
          <Wallet size={16} color={colors.success} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {project.budget} ETB
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Calendar size={16} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {new Date(project.createdAt).toLocaleDateString('en-ET')}
          </Text>
        </View>
        {project.category && (
          <View style={styles.metaItem}>
            <Award size={16} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {project.category}
            </Text>
          </View>
        )}
      </View>

      {project.serviceProvider && (
        <View style={styles.providerInfo}>
          <Text style={[styles.providerLabel, { color: colors.textSecondary }]}>
            Service Provider:
          </Text>
          <Pressable style={styles.providerButton}>
            <Image
              source={{ uri: project.serviceProvider.avatar }}
              style={styles.providerAvatar}
            />
            <Text style={[styles.providerName, { color: colors.primary }]}>
              {project.serviceProvider.displayName}
            </Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );

  const ReviewCard = ({ review, index }) => (
    <Animated.View
      style={[
        styles.reviewCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateX: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30 * (index + 1), 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
              color={colors.warning}
              fill={star <= review.rating ? colors.warning : 'transparent'}
            />
          ))}
        </View>
        <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
          {new Date(review.createdAt).toLocaleDateString('en-ET')}
        </Text>
      </View>

      <Text style={[styles.reviewComment, { color: colors.text }]}>{review.comment}</Text>

      {review.service && (
        <View style={styles.reviewedService}>
          <Briefcase size={14} color={colors.textTertiary} />
          <Text style={[styles.serviceName, { color: colors.textSecondary }]}>
            {review.service.name}
          </Text>
        </View>
      )}
    </Animated.View>
  );

  const getStatusColor = (status) => {
    const statusColors = {
      completed: colors.success,
      in_progress: colors.warning,
      pending: colors.textTertiary,
      cancelled: colors.error,
      active: colors.success,
      draft: colors.textTertiary,
    };
    return statusColors[status] || colors.textTertiary;
  };

  const formatStatus = (status) => {
    const statusMap = {
      completed: 'Completed',
      in_progress: 'In Progress',
      pending: 'Pending',
      cancelled: 'Cancelled',
      active: 'Active',
      draft: 'Draft',
    };
    return statusMap[status] || status;
  };

  const TabButton = ({ title, isActive, onPress, count }) => (
    <Pressable
      style={[styles.tab, isActive && styles.activeTab]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.tabText,
          { color: colors.textSecondary },
          isActive && styles.activeTabText,
        ]}
      >
        {title} {count ? `(${count})` : ''}
      </Text>
      {isActive && (
        <View style={[styles.activeTabIndicator, { backgroundColor: colors.primary }]} />
      )}
    </Pressable>
  );

  const ProfileHeader = () => (
    <Animated.View
      style={[
        styles.headerSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Back Button and Actions */}
        <View style={styles.headerTop}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.white} />
          </Pressable>
          
          {currentUser?.id !== client.id && (
            <View style={styles.headerActions}>
              <Pressable style={styles.actionButton} onPress={handleContact}>
                <MessageCircle size={20} color={colors.white} />
              </Pressable>
              {currentUser?.role === 'provider' && (
                <Pressable style={styles.actionButton} onPress={handleBookService}>
                  <Calendar size={20} color={colors.white} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Client Avatar and Info */}
        <View style={styles.clientInfo}>
          <View style={styles.avatarContainer}>
            {client.avatar ? (
              <Image source={{ uri: client.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.white }]}>
                <Users size={32} color={colors.primary} />
              </View>
            )}
            {client.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.success }]}>
                <Shield size={14} color={colors.white} />
              </View>
            )}
            {client.premiumTier && (
              <View style={styles.premiumBadgeContainer}>
                <PremiumBadge
                  userId={client.id}
                  size="small"
                  type="provider"
                />
              </View>
            )}
          </View>

          <View style={styles.clientDetails}>
            <View style={styles.nameContainer}>
              <Text style={styles.clientName}>{client.displayName}</Text>
              {client.premiumTier && (
                <Crown size={20} color={colors.warning} style={styles.crownIcon} />
              )}
            </View>
            
            <Text style={styles.clientMemberSince}>
              Member since {new Date(client.createdAt).getFullYear()}
            </Text>

            <View style={styles.ratingOverview}>
              <View style={styles.ratingDisplay}>
                <Star size={18} color={colors.warning} fill={colors.warning} />
                <Text style={styles.ratingValue}>
                  {stats.averageRating?.toFixed(1) || '5.0'}
                </Text>
                <Text style={styles.ratingCount}>
                  ({stats.totalReviews || 0} reviews)
                </Text>
              </View>
            </View>

            {client.location && (
              <View style={styles.locationInfo}>
                <MapPin size={14} color={colors.white} opacity={0.8} />
                <Text style={styles.locationText}>{client.location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsOverview}>
          <StatCard
            title="Projects Completed"
            value={stats.completedProjects || 0}
            icon={CheckCircle}
            color={colors.success}
            delay={0}
          />
          <StatCard
            title="Total Spent"
            value={`${stats.totalSpent || 0} ETB`}
            icon={Wallet}
            color={colors.warning}
            delay={10}
          />
          <StatCard
            title="Active Projects"
            value={stats.activeProjects || 0}
            icon={Briefcase}
            color={colors.info}
            delay={20}
          />
          <StatCard
            title="Response Rate"
            value={`${stats.responseRate || 100}%`}
            icon={TrendingUp}
            color={colors.primary}
            delay={30}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderOverviewTab = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.overviewSection}>
        {/* Contact Information */}
        <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Contact Information
          </Text>
          <View style={styles.contactList}>
            <View style={styles.contactItem}>
              <Mail size={20} color={colors.textTertiary} />
              <Text style={[styles.contactText, { color: colors.text }]}>
                {client.email}
              </Text>
            </View>
            {client.phoneNumber && (
              <View style={styles.contactItem}>
                <Phone size={20} color={colors.textTertiary} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {client.phoneNumber}
                </Text>
              </View>
            )}
            {client.location && (
              <View style={styles.contactItem}>
                <MapPin size={20} color={colors.textTertiary} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {client.location}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Preferred Services */}
        {client.preferredServices?.length > 0 && (
          <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Preferred Services
            </Text>
            <View style={styles.servicesGrid}>
              {client.preferredServices.map((service, index) => (
                <View
                  key={service}
                  style={[
                    styles.serviceTag,
                    { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
                  ]}
                >
                  <Award size={14} color={colors.primary} />
                  <Text style={[styles.serviceText, { color: colors.primary }]}>
                    {service}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* About Client */}
        {client.bio && (
          <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>
              {client.bio}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {currentUser?.id !== client.id && (
          <View style={styles.actionSection}>
            {currentUser?.role === 'provider' && (
              <Button
                title="Book Service"
                onPress={handleBookService}
                variant="primary"
                size="large"
                style={styles.actionButton}
                icon={Calendar}
              />
            )}
            <Button
              title="Send Message"
              onPress={handleContact}
              variant="outline"
              size="large"
              style={styles.actionButton}
              icon={MessageCircle}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderProjectsTab = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.projectsSection}>
        {client.projects?.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.projectsList}>
              {client.projects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Briefcase size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Projects Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              This client hasn't started any projects yet
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderReviewsTab = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.reviewsSection}>
        {client.reviews?.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.reviewsList}>
              {client.reviews.map((review, index) => (
                <ReviewCard key={review.id} review={review} index={index} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Star size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Reviews Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              This client hasn't received any reviews yet
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Loading message="Loading client profile..." />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Users size={64} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Client not found
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="primary"
          style={styles.errorButton}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: parallaxAnim } } }],
          { useNativeDriver: false }
        )}
      >
        <ProfileHeader />

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
          <TabButton
            title="Overview"
            isActive={activeTab === 'overview'}
            onPress={() => setActiveTab('overview')}
          />
          <TabButton
            title="Projects"
            isActive={activeTab === 'projects'}
            onPress={() => setActiveTab('projects')}
            count={client.projects?.length}
          />
          <TabButton
            title="Reviews"
            isActive={activeTab === 'reviews'}
            onPress={() => setActiveTab('reviews')}
            count={client.reviews?.length}
          />
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'projects' && renderProjectsTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
      </ScrollView>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    minWidth: 120,
  },
  headerSection: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    marginBottom: 24,
  },
  headerGradient: {
    padding: 24,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: 12,
    padding: 4,
  },
  premiumBadgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  clientDetails: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  crownIcon: {
    marginLeft: 4,
  },
  clientMemberSince: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  ratingOverview: {
    marginBottom: 8,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ratingCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  statHeader: {
    marginBottom: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2,
  },
  overviewSection: {
    paddingHorizontal: 20,
    gap: 20,
  },
  infoSection: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contactList: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  serviceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionSection: {
    gap: 12,
    paddingHorizontal: 20,
  },
  projectsSection: {
    paddingHorizontal: 20,
    minHeight: 400,
  },
  projectsList: {
    gap: 16,
  },
  projectCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  projectMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  providerLabel: {
    fontSize: 14,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewsSection: {
    paddingHorizontal: 20,
    minHeight: 400,
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  reviewedService: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceName: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
};

export default React.memo(ClientProfile);

// Specialized client profile components
export const CompactClientProfile = ({ userId, style }) => {
  return <ClientProfile userId={userId} style={style} />;
};

export const ClientProfileModal = ({ userId, onClose }) => {
  return (
    <View style={{ flex: 1 }}>
      <ClientProfile userId={userId} />
    </View>
  );
};