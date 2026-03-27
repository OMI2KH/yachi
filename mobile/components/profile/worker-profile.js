// components/profile/worker-profile.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Dimensions,
  Image,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  Crown,
  Shield,
  Star,
  MapPin,
  Clock,
  Calendar,
  Award,
  TrendingUp,
  Users,
  Wallet,
  CheckCircle,
  XCircle,
  Zap,
  Edit3,
  Share2,
  MessageCircle,
  Phone,
  Bookmark,
  Heart,
  Eye,
  Download,
  MoreHorizontal,
  Briefcase,
  Tool,
  Wrench,
  Hammer,
  PaintBucket,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { usePremium } from '../../contexts/premium-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';
import { PremiumBadge } from '../premium/premium-badge';
import { VerificationBadge, VerificationBadgeGroup } from './verification-badge';
import { SkillTags } from './skill-tags';
import { PortfolioGrid } from './portfolio-grid';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Worker Profile Component
 * Features: Multi-service support, AI matching, Ethiopian market focus, premium features
 */

// Worker specializations for Ethiopian market
const WORKER_SPECIALIZATIONS = {
  construction: {
    label: 'Construction Worker',
    icon: Hammer,
    color: '#F59E0B',
    description: 'Building and construction expertise'
  },
  plumbing: {
    label: 'Plumber',
    icon: Wrench,
    color: '#3B82F6',
    description: 'Plumbing and pipe fitting'
  },
  electrical: {
    label: 'Electrician',
    icon: Zap,
    color: '#F59E0B',
    description: 'Electrical installations and repairs'
  },
  painting: {
    label: 'Painter',
    icon: PaintBucket,
    color: '#8B5CF6',
    description: 'Painting and finishing work'
  },
  carpentry: {
    label: 'Carpenter',
    icon: Tool,
    color: '#10B981',
    description: 'Woodwork and furniture'
  },
  general: {
    label: 'General Worker',
    icon: Briefcase,
    color: '#6366F1',
    description: 'Various labor services'
  },
};

const WorkerProfile = ({
  workerId,
  worker,
  isOwnProfile = false,
  onEditPress,
  onMessagePress,
  onBookPress,
  onSharePress,
  onReportPress,
  onCallPress,
  onPortfolioView,
  onSkillEdit,
  onAvailabilityChange,
  enableAIRecommendations = true,
  enableSocialFeatures = true,
  enableAnalytics = true,
  style,
  testID = 'worker-profile',
}) => {
  const { theme, colors } = useTheme();
  const { user: currentUser } = useAuth();
  const { isUserPremium, premiumTier } = usePremium();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(worker?.availability?.status === 'available');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const statsAnim = useRef({
    completedProjects: new Animated.Value(0),
    rating: new Animated.Value(0),
    totalEarnings: new Animated.Value(0),
    responseRate: new Animated.Value(0),
  }).current;

  // Enhanced worker data with Ethiopian market focus
  const workerData = useMemo(() => ({
    id: worker?.id || workerId,
    displayName: worker?.displayName || 'ያልታወቀ ሠራተኛ',
    username: worker?.username || '@worker',
    bio: worker?.bio || '',
    avatar: worker?.avatar,
    coverPhoto: worker?.coverPhoto,
    specialization: worker?.specialization || 'general',
    level: worker?.level || 1,
    experience: worker?.experience || '2-5 years',
    location: worker?.location || 'Addis Ababa, Ethiopia',
    languages: worker?.languages || ['Amharic', 'English'],
    availability: worker?.availability || {
      status: 'available',
      nextAvailable: null,
      schedule: 'Mon-Sun: 8:00 AM - 6:00 PM'
    },
    stats: {
      completedProjects: worker?.stats?.completedProjects || 0,
      rating: worker?.stats?.rating || 0,
      totalEarnings: worker?.stats?.totalEarnings || 0,
      responseRate: worker?.stats?.responseRate || 100,
      repeatClients: worker?.stats?.repeatClients || 0,
      aiMatches: worker?.stats?.aiMatches || 0,
    },
    skills: worker?.skills || [],
    portfolio: worker?.portfolio || [],
    verifications: worker?.verifications || {},
    reviews: worker?.reviews || [],
    badges: worker?.badges || [],
    joinedDate: worker?.joinedDate || new Date().toISOString(),
    premiumTier: worker?.premiumTier || 'none',
    contact: worker?.contact || {
      phone: worker?.phoneNumber,
      email: worker?.email,
      preferredContact: 'message'
    },
  }), [worker, workerId]);

  // Enhanced animations
  React.useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Stats counting animation
    Animated.parallel([
      Animated.timing(statsAnim.completedProjects, {
        toValue: workerData.stats.completedProjects,
        duration: 2000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }),
      Animated.timing(statsAnim.rating, {
        toValue: workerData.stats.rating,
        duration: 2000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }),
      Animated.timing(statsAnim.totalEarnings, {
        toValue: workerData.stats.totalEarnings,
        duration: 2000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }),
      Animated.timing(statsAnim.responseRate, {
        toValue: workerData.stats.responseRate,
        duration: 2000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }),
    ]).start();
  }, [workerData]);

  // Enhanced specialization configuration
  const specializationConfig = useMemo(() => {
    return WORKER_SPECIALIZATIONS[workerData.specialization] || WORKER_SPECIALIZATIONS.general;
  }, [workerData.specialization]);

  // Enhanced availability handler
  const handleAvailabilityChange = useCallback(async () => {
    if (!isOwnProfile) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const newAvailability = !isAvailable;
    setIsAvailable(newAvailability);
    
    if (onAvailabilityChange) {
      await onAvailabilityChange(workerData.id, newAvailability);
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackAvailabilityChange(workerData.id, newAvailability, currentUser.id);
    }
  }, [isOwnProfile, isAvailable, workerData.id, onAvailabilityChange, enableAnalytics, currentUser]);

  // Enhanced contact handler
  const handleContactPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (workerData.contact.preferredContact === 'message') {
      onMessagePress?.(workerData);
    } else if (workerData.contact.preferredContact === 'call') {
      onCallPress?.(workerData);
    } else {
      setShowContactOptions(true);
    }
  }, [workerData, onMessagePress, onCallPress]);

  // Enhanced booking handler
  const handleBookPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (onBookPress) {
      onBookPress(workerData);
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackBookingInitiation(workerData.id, currentUser.id);
    }
  }, [workerData, onBookPress, enableAnalytics, currentUser]);

  // Enhanced share handler
  const handleSharePress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const shareUrl = `https://yachi.et/workers/${workerData.username}`;
      const message = `ሠራተኛ ${workerData.displayName}ን በያቺ ይመልከቱ! ${shareUrl}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: `${workerData.displayName} - Yachi Worker`,
            text: message,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          Alert.alert('ተገልጧል', 'የሠራተኛ አገናኝ ተገልጧል');
        }
      } else {
        await Share.share({
          message,
          url: shareUrl,
          title: `${workerData.displayName} - Yachi Worker`,
        });
      }
      
      if (onSharePress) {
        onSharePress(workerData);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [workerData, onSharePress]);

  // Enhanced bookmark handler
  const handleBookmarkPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);
    
    // Analytics tracking
    if (enableAnalytics) {
      // trackBookmarkAction(workerData.id, newBookmarkState, currentUser.id);
    }
  }, [isBookmarked, workerData.id, enableAnalytics, currentUser]);

  // Render enhanced header
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
      {/* Cover Photo */}
      <View style={styles.coverContainer}>
        {workerData.coverPhoto ? (
          <Image
            source={{ uri: workerData.coverPhoto }}
            style={styles.coverImage}
          />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.coverImage}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.coverGradient}
        />
        
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
              style={styles.actionButton}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          
          <View style={styles.rightActions}>
            <Pressable style={styles.actionButton} onPress={handleBookmarkPress}>
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
                style={styles.actionButton}
              >
                <Bookmark 
                  size={20} 
                  color={isBookmarked ? '#F59E0B' : '#FFFFFF'} 
                  fill={isBookmarked ? '#F59E0B' : 'transparent'}
                />
              </LinearGradient>
            </Pressable>
            
            <Pressable style={styles.actionButton} onPress={handleSharePress}>
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
                style={styles.actionButton}
              >
                <Share2 size={20} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            {workerData.avatar ? (
              <Image source={{ uri: workerData.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.avatar}
              >
                <Users size={32} color="#FFFFFF" />
              </LinearGradient>
            )}
            
            {/* Availability Badge */}
            <Pressable
              style={[
                styles.availabilityBadge,
                { 
                  backgroundColor: isAvailable ? colors.success : colors.error,
                  shadowColor: isAvailable ? colors.success : colors.error,
                }
              ]}
              onPress={isOwnProfile ? handleAvailabilityChange : undefined}
            >
              <View style={styles.availabilityContent}>
                <View style={[styles.availabilityDot, { 
                  backgroundColor: isAvailable ? '#FFFFFF' : 'rgba(255,255,255,0.8)' 
                }]} />
                <Text style={styles.availabilityText}>
                  {isAvailable ? 'ተገልጋሚ' : 'አልተገኝም'}
                </Text>
              </View>
            </Pressable>

            {/* Premium Badge */}
            {workerData.premiumTier !== 'none' && (
              <View style={styles.premiumBadge}>
                <PremiumBadge userId={workerData.id} size="small" />
              </View>
            )}
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.basicInfo}>
          <View style={styles.nameContainer}>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {workerData.displayName}
            </Text>
            {workerData.premiumTier !== 'none' && (
              <Crown size={20} color={colors.warning} />
            )}
          </View>
          
          <View style={styles.specializationContainer}>
            <specializationConfig.icon size={16} color={specializationConfig.color} />
            <Text style={[styles.specialization, { color: specializationConfig.color }]}>
              {specializationConfig.label}
            </Text>
          </View>
          
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {workerData.location}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {workerData.experience} experience
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Joined {new Date(workerData.joinedDate).getFullYear()}
              </Text>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Star size={18} color={colors.warning} fill={colors.warning} />
            <Text style={[styles.rating, { color: colors.text }]}>
              {workerData.stats.rating.toFixed(1)}
            </Text>
            <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
              ({workerData.reviews.length} reviews)
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  // Render enhanced stats
  const renderStats = () => (
    <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Briefcase size={20} color={colors.primary} />
          </View>
          <Animated.Text style={[styles.statValue, { color: colors.text }]}>
            {statsAnim.completedProjects.interpolate({
              inputRange: [0, workerData.stats.completedProjects],
              outputRange: ['0', Math.floor(workerData.stats.completedProjects).toString()]
            })}
          </Animated.Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Projects
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
            <CheckCircle size={20} color={colors.success} />
          </View>
          <Animated.Text style={[styles.statValue, { color: colors.text }]}>
            {statsAnim.responseRate.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', Math.floor(workerData.stats.responseRate) + '%']
            })}
          </Animated.Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Response
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
            <Star size={20} color={colors.warning} />
          </View>
          <Animated.Text style={[styles.statValue, { color: colors.text }]}>
            {statsAnim.rating.interpolate({
              inputRange: [0, 5],
              outputRange: ['0.0', workerData.stats.rating.toFixed(1)]
            })}
          </Animated.Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Rating
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.info + '20' }]}>
            <Wallet size={20} color={colors.info} />
          </View>
          <Animated.Text style={[styles.statValue, { color: colors.text }]}>
            {statsAnim.totalEarnings.interpolate({
              inputRange: [0, workerData.stats.totalEarnings],
              outputRange: ['0', Math.floor(workerData.stats.totalEarnings).toString()]
            })}
          </Animated.Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            ETB Earned
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  // Render action buttons
  const renderActions = () => (
    <View style={styles.actionsContainer}>
      {isOwnProfile ? (
        <Button
          title="Edit Profile"
          onPress={() => onEditPress?.(workerData)}
          variant="outline"
          size="large"
          icon={Edit3}
          style={styles.editButton}
        />
      ) : (
        <>
          <Button
            title="Book Service"
            onPress={handleBookPress}
            variant="primary"
            size="large"
            icon={Calendar}
            style={styles.bookButton}
          />
          
          <Button
            title="Message"
            onPress={handleContactPress}
            variant="outline"
            size="large"
            icon={MessageCircle}
            style={styles.messageButton}
          />
          
          <Button
            title="Call"
            onPress={() => onCallPress?.(workerData)}
            variant="ghost"
            size="large"
            icon={Phone}
            style={styles.callButton}
          />
        </>
      )}
    </View>
  );

  // Render verification badges
  const renderVerifications = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Verifications & Trust
      </Text>
      <VerificationBadgeGroup
        verifications={workerData.verifications}
        layout="compact"
        maxVisible={6}
      />
    </View>
  );

  // Render skills
  const renderSkills = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Skills & Expertise
        </Text>
        {isOwnProfile && (
          <Button
            title="Edit"
            onPress={() => onSkillEdit?.(workerData)}
            variant="ghost"
            size="small"
            icon={Edit3}
          />
        )}
      </View>
      <SkillTags
        skills={workerData.skills}
        editable={isOwnProfile}
        showProficiency={true}
        showEndorsements={true}
        variant="compact"
        onSkillsChange={onSkillEdit}
      />
    </View>
  );

  // Render portfolio preview
  const renderPortfolio = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Portfolio ({workerData.portfolio.length})
        </Text>
        {workerData.portfolio.length > 0 && (
          <Button
            title="View All"
            onPress={() => onPortfolioView?.(workerData)}
            variant="ghost"
            size="small"
            icon={Eye}
          />
        )}
      </View>
      
      {workerData.portfolio.length > 0 ? (
        <PortfolioGrid
          portfolioItems={workerData.portfolio.slice(0, 6)}
          viewMode="grid"
          columns={3}
          editable={isOwnProfile}
          showStats={false}
        />
      ) : (
        <View style={styles.emptyPortfolio}>
          <Award size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {isOwnProfile ? 'Add your work to showcase your skills' : 'No portfolio items yet'}
          </Text>
          {isOwnProfile && (
            <Button
              title="Add Your First Project"
              onPress={() => onPortfolioView?.(workerData)}
              variant="outline"
              size="medium"
              icon={Plus}
            />
          )}
        </View>
      )}
    </View>
  );

  // Render reviews
  const renderReviews = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Client Reviews ({workerData.reviews.length})
      </Text>
      
      {workerData.reviews.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.reviewsContainer}>
            {workerData.reviews.slice(0, 3).map((review, index) => (
              <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.card }]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Text style={[styles.reviewerName, { color: colors.text }]}>
                      {review.clientName}
                    </Text>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          color={colors.warning}
                          fill={star <= review.rating ? colors.warning : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
                    {new Date(review.createdAt).toLocaleDateString('en-ET')}
                  </Text>
                </View>
                
                <Text style={[styles.reviewComment, { color: colors.text }]}>
                  {review.comment}
                </Text>
                
                {review.project && (
                  <View style={styles.reviewProject}>
                    <Briefcase size={12} color={colors.textTertiary} />
                    <Text style={[styles.projectName, { color: colors.textSecondary }]}>
                      {review.project}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyReviews}>
          <Star size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No reviews yet
          </Text>
        </View>
      )}
    </View>
  );

  // Render contact options modal
  const renderContactOptions = () => (
    <Modal
      visible={showContactOptions}
      transparent
      animationType="fade"
      onRequestClose={() => setShowContactOptions(false)}
    >
      <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Contact {workerData.displayName}
          </Text>
          
          <View style={styles.contactOptions}>
            <Pressable
              style={[styles.contactOption, { backgroundColor: colors.background }]}
              onPress={() => {
                setShowContactOptions(false);
                onMessagePress?.(workerData);
              }}
            >
              <MessageCircle size={24} color={colors.primary} />
              <Text style={[styles.contactOptionText, { color: colors.text }]}>
                Send Message
              </Text>
            </Pressable>
            
            {workerData.contact.phone && (
              <Pressable
                style={[styles.contactOption, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowContactOptions(false);
                  onCallPress?.(workerData);
                }}
              >
                <Phone size={24} color={colors.success} />
                <Text style={[styles.contactOptionText, { color: colors.text }]}>
                  Call {workerData.contact.phone}
                </Text>
              </Pressable>
            )}
          </View>
          
          <Button
            title="Cancel"
            onPress={() => setShowContactOptions(false)}
            variant="ghost"
            style={styles.cancelButton}
          />
        </View>
      </BlurView>
    </Modal>
  );

  if (isLoading) {
    return <Loading message="Loading worker profile..." />;
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderStats()}
        {renderActions()}
        {renderVerifications()}
        {renderSkills()}
        {renderPortfolio()}
        {renderReviews()}
      </ScrollView>
      
      {renderContactOptions()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 8,
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerActions: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    // Styling for back button
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  profileInfo: {
    paddingHorizontal: 20,
    marginTop: -40,
  },
  avatarContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  availabilityBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  availabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  basicInfo: {
    marginTop: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
  },
  specializationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  specialization: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rating: {
    fontSize: 16,
    fontWeight: '700',
  },
  ratingCount: {
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  editButton: {
    flex: 1,
  },
  bookButton: {
    flex: 2,
  },
  messageButton: {
    flex: 1,
  },
  callButton: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyPortfolio: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  reviewsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewCard: {
    width: 280,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewProject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectName: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  contactOptions: {
    gap: 12,
    marginBottom: 20,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  contactOptionText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default React.memo(WorkerProfile);
export { WORKER_SPECIALIZATIONS };