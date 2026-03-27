// components/profile/profile-header.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  Image,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  Crown,
  Shield,
  Star,
  Edit3,
  Share2,
  MessageCircle,
  Plus,
  MoreHorizontal,
  Camera,
  MapPin,
  Calendar,
  CheckCircle,
  Users,
  Briefcase,
  Award,
  TrendingUp,
  Eye,
  Heart,
  Download,
  Bookmark,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { usePremium } from '../../contexts/premium-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';
import { PremiumBadge } from '../premium/premium-badge';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Profile Header Component
 * Features: Multi-role support, premium integration, advanced animations, Ethiopian market focus
 */

const ProfileHeader = ({
  profile,
  isOwnProfile = false,
  onEditPress,
  onMessagePress,
  onFollowPress,
  onSharePress,
  onReportPress,
  onBlockPress,
  onPhotoEdit,
  onCoverEdit,
  showStats = true,
  showActions = true,
  showStatus = true,
  variant = 'default', // 'default', 'compact', 'minimal', 'premium', 'government'
  style,
  enableSocialFeatures = true,
  enableAnalytics = true,
  testID = 'profile-header',
}) => {
  const { theme, colors } = useTheme();
  const { user: currentUser } = useAuth();
  const { isUserPremium, premiumTier } = usePremium();
  
  const [isFollowing, setIsFollowing] = useState(profile?.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;

  // Enhanced profile data with Ethiopian market focus
  const profileData = useMemo(() => ({
    id: profile?.id || '',
    displayName: profile?.displayName || 'ያልታወቀ ተጠቃሚ',
    username: profile?.username || '@user',
    bio: profile?.bio || '',
    avatar: profile?.avatar,
    coverPhoto: profile?.coverPhoto,
    isVerified: profile?.isVerified || false,
    isProfessional: profile?.isProfessional || false,
    isOnline: profile?.isOnline || false,
    lastSeen: profile?.lastSeen,
    userType: profile?.userType || 'client', // 'client', 'provider', 'government', 'admin'
    premiumTier: profile?.premiumTier || 'none',
    stats: {
      followers: profile?.stats?.followers || 0,
      following: profile?.stats?.following || 0,
      reviews: profile?.stats?.reviews || 0,
      rating: profile?.stats?.rating || 0,
      completedProjects: profile?.stats?.completedProjects || 0,
      responseRate: profile?.stats?.responseRate || 100,
      totalEarnings: profile?.stats?.totalEarnings || 0,
      aiMatches: profile?.stats?.aiMatches || 0,
    },
    badges: profile?.badges || [],
    joinedDate: profile?.joinedDate || new Date().toISOString(),
    location: profile?.location || 'Addis Ababa, Ethiopia',
    skills: profile?.skills || [],
    languages: profile?.languages || ['English', 'Amharic'],
    availability: profile?.availability || 'available',
    verificationLevel: profile?.verificationLevel || 'basic', // 'basic', 'verified', 'premium', 'government'
  }), [profile]);

  // Enhanced header configuration based on variant and user type
  const headerConfig = useMemo(() => {
    const baseConfig = {
      default: { height: 240, avatarSize: 100, showBio: true, showStats: true },
      compact: { height: 180, avatarSize: 80, showBio: false, showStats: false },
      minimal: { height: 120, avatarSize: 60, showBio: false, showStats: false },
      premium: { height: 280, avatarSize: 120, showBio: true, showStats: true },
      government: { height: 260, avatarSize: 100, showBio: true, showStats: true },
    };

    const config = baseConfig[variant] || baseConfig.default;
    
    // Adjust for user type
    if (profileData.userType === 'government') {
      config.height = 280;
      config.avatarSize = 110;
    } else if (profileData.userType === 'provider' && profileData.premiumTier !== 'none') {
      config.height = 260;
    }

    return config;
  }, [variant, profileData.userType, profileData.premiumTier]);

  // Enhanced animations with parallax effects
  const coverImageOpacity = scrollY.interpolate({
    inputRange: [0, headerConfig.height - 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const coverImageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [0, headerConfig.height - 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const avatarTranslateY = scrollY.interpolate({
    inputRange: [0, headerConfig.height - 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const textOpacity = scrollY.interpolate({
    inputRange: [0, headerConfig.height - 150],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Enhanced follow action with analytics
  const handleFollowPress = useCallback(async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Enhanced animation sequence
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();

      const newFollowingState = !isFollowing;
      setIsFollowing(newFollowingState);
      
      if (onFollowPress) {
        await onFollowPress(profileData.id, newFollowingState);
      }

      // Analytics tracking
      if (enableAnalytics) {
        // trackFollowAction(profileData.id, newFollowingState, currentUser.id);
      }
      
      await Haptics.notificationAsync(
        newFollowingState 
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      console.error('Follow action failed:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, isLoading, profileData.id, onFollowPress, scaleAnim, enableAnalytics, currentUser]);

  // Enhanced message action
  const handleMessagePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onMessagePress) {
      onMessagePress(profileData);
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackMessageInitiation(profileData.id, currentUser.id);
    }
  }, [profileData, onMessagePress, enableAnalytics, currentUser]);

  // Enhanced share with Ethiopian market focus
  const handleSharePress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const shareUrl = `https://yachi.et/profile/${profileData.username}`;
      const message = `የ${profileData.displayName} መገለጫ በያቺ ይመልከቱ! ${shareUrl}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: `${profileData.displayName} - Yachi`,
            text: message,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          Alert.alert('ተገልጧል', 'የመገለጫ አገናኝ ተገልጧል');
        }
      } else {
        await Share.share({
          message,
          url: shareUrl,
          title: `${profileData.displayName} - Yachi`,
        });
      }
      
      if (onSharePress) {
        onSharePress(profileData);
      }

      // Analytics tracking
      if (enableAnalytics) {
        // trackProfileShare(profileData.id, currentUser.id);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [profileData, onSharePress, enableAnalytics, currentUser]);

  // Enhanced edit profile
  const handleEditPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (onEditPress) {
      onEditPress(profileData);
    }
  }, [profileData, onEditPress]);

  // Enhanced photo edit with premium features
  const handlePhotoEdit = useCallback(async (type) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Check premium restrictions
      if (type === 'cover' && !isUserPremium && profileData.userType === 'provider') {
        Alert.alert(
          'Premium Feature',
          'Custom cover photos are available for premium members.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('PremiumUpgrade') },
          ]
        );
        return;
      }

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Take Photo', 'Choose from Library', 'Cancel'],
            cancelButtonIndex: 2,
          },
          async (buttonIndex) => {
            if (buttonIndex === 2) return;
            
            let result;
            if (buttonIndex === 0) {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera access is required to take photos.');
                return;
              }
              
              result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: type === 'avatar' ? [1, 1] : [3, 1],
                quality: 0.8,
              });
            } else {
              result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: type === 'avatar' ? [1, 1] : [3, 1],
                quality: 0.8,
              });
            }
            
            if (!result.canceled && onPhotoEdit) {
              onPhotoEdit(type, result.assets[0].uri);
            }
          }
        );
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is required.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: type === 'avatar' ? [1, 1] : [3, 1],
          quality: 0.8,
        });
        
        if (!result.canceled && onPhotoEdit) {
          onPhotoEdit(type, result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Photo edit failed:', error);
      Alert.alert('Error', 'Failed to update photo. Please try again.');
    }
  }, [onPhotoEdit, isUserPremium, profileData.userType]);

  // Enhanced bookmark action
  const handleBookmarkPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);
    
    // Analytics tracking
    if (enableAnalytics) {
      // trackBookmarkAction(profileData.id, newBookmarkState, currentUser.id);
    }
  }, [isBookmarked, profileData.id, enableAnalytics, currentUser]);

  // Enhanced more actions with role-based options
  const handleMoreActions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const baseOptions = isOwnProfile 
      ? ['Edit Profile', 'Share Profile', 'Download Portfolio', 'Settings', 'Cancel']
      : ['Share Profile', 'Bookmark Profile', 'Report User', 'Block User', 'Cancel'];
    
    // Add role-specific options
    if (profileData.userType === 'provider' && !isOwnProfile) {
      baseOptions.splice(2, 0, 'Request Quote', 'View Portfolio');
    } else if (profileData.userType === 'government') {
      baseOptions.splice(1, 0, 'View Projects', 'Contact Department');
    }

    const cancelIndex = baseOptions.length - 1;
    const destructiveIndex = isOwnProfile ? -1 : baseOptions.indexOf('Block User');
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: baseOptions,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex,
        },
        (buttonIndex) => {
          const selectedOption = baseOptions[buttonIndex];
          switch (selectedOption) {
            case 'Edit Profile':
              handleEditPress();
              break;
            case 'Share Profile':
              handleSharePress();
              break;
            case 'Bookmark Profile':
              handleBookmarkPress();
              break;
            case 'Download Portfolio':
              // Handle portfolio download
              break;
            case 'Report User':
              onReportPress?.(profileData);
              break;
            case 'Block User':
              onBlockPress?.(profileData);
              break;
            case 'Request Quote':
              // Navigate to quote request
              break;
            case 'View Portfolio':
              // Navigate to portfolio
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'Profile Actions',
        undefined,
        baseOptions.map((option, index) => ({
          text: option,
          style: index === destructiveIndex ? 'destructive' : 'default',
          onPress: () => {
            const selectedOption = baseOptions[index];
            switch (selectedOption) {
              case 'Edit Profile':
                handleEditPress();
                break;
              case 'Share Profile':
                handleSharePress();
                break;
              case 'Bookmark Profile':
                handleBookmarkPress();
                break;
              case 'Download Portfolio':
                // Handle portfolio download
                break;
              case 'Report User':
                onReportPress?.(profileData);
                break;
              case 'Block User':
                onBlockPress?.(profileData);
                break;
              case 'Request Quote':
                // Navigate to quote request
                break;
              case 'View Portfolio':
                // Navigate to portfolio
                break;
            }
          },
        }))
      );
    }
  }, [
    isOwnProfile,
    profileData,
    handleEditPress,
    handleSharePress,
    handleBookmarkPress,
    onReportPress,
    onBlockPress,
  ]);

  // Enhanced cover photo with premium features
  const renderCoverPhoto = () => (
    <Animated.View
      style={[
        styles.coverContainer,
        {
          height: headerConfig.height,
          opacity: coverImageOpacity,
          transform: [{ scale: coverImageScale }],
        },
      ]}
    >
      {profileData.coverPhoto ? (
        <Image
          source={{ uri: profileData.coverPhoto }}
          style={styles.coverImage}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
      ) : (
        <LinearGradient
          colors={profileData.userType === 'government' 
            ? [colors.primary, colors.primaryDark]
            : profileData.premiumTier !== 'none'
            ? ['#667eea', '#764ba2']
            : [colors.primary, colors.primary + 'DD']
          }
          style={styles.coverImage}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      
      {/* Loading overlay */}
      {imageLoading && (
        <View style={styles.loadingOverlay}>
          <Loading size="small" />
        </View>
      )}
      
      {/* Enhanced gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)']}
        style={styles.coverGradient}
      />
      
      {/* Premium pattern overlay for premium users */}
      {profileData.premiumTier !== 'none' && (
        <View style={styles.premiumPattern} />
      )}
      
      {/* Edit overlay for own profile */}
      {isOwnProfile && (
        <Pressable
          style={styles.coverEditOverlay}
          onPress={() => handlePhotoEdit('cover')}
        >
          <BlurView intensity={80} tint="dark" style={styles.editBlur}>
            <Camera size={16} color="#FFFFFF" />
            <Text style={styles.editText}>Edit Cover</Text>
          </BlurView>
        </Pressable>
      )}
    </Animated.View>
  );

  // Enhanced avatar with multiple badges
  const renderAvatar = () => (
    <Animated.View
      style={[
        styles.avatarContainer,
        {
          transform: [
            { scale: avatarScale },
            { translateY: avatarTranslateY },
          ],
        },
      ]}
    >
      <View style={styles.avatarWrapper}>
        {profileData.avatar ? (
          <Image
            source={{ uri: profileData.avatar }}
            style={[
              styles.avatar,
              { width: headerConfig.avatarSize, height: headerConfig.avatarSize },
            ]}
          />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={[
              styles.avatar,
              { width: headerConfig.avatarSize, height: headerConfig.avatarSize },
            ]}
          >
            <Text style={styles.avatarText}>
              {profileData.displayName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        
        {/* Enhanced badge system */}
        <View style={styles.badgesContainer}>
          {/* Verification badge */}
          {profileData.isVerified && (
            <View style={[styles.badge, styles.verifiedBadge]}>
              <CheckCircle size={14} color="#FFFFFF" />
            </View>
          )}
          
          {/* Premium badge */}
          {profileData.premiumTier !== 'none' && (
            <View style={[styles.badge, styles.premiumBadge]}>
              <Crown size={12} color="#FFFFFF" />
            </View>
          )}
          
          {/* Professional badge */}
          {profileData.userType === 'provider' && (
            <View style={[styles.badge, styles.proBadge]}>
              <Award size={12} color="#FFFFFF" />
            </View>
          )}
          
          {/* Government badge */}
          {profileData.userType === 'government' && (
            <View style={[styles.badge, styles.governmentBadge]}>
              <Shield size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        {/* Online status indicator */}
        {showStatus && profileData.isOnline && (
          <View style={styles.onlineIndicator} />
        )}
        
        {/* Edit overlay for own profile */}
        {isOwnProfile && (
          <Pressable
            style={styles.avatarEditOverlay}
            onPress={() => handlePhotoEdit('avatar')}
          >
            <BlurView intensity={80} tint="dark" style={styles.avatarEditBlur}>
              <Camera size={14} color="#FFFFFF" />
            </BlurView>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );

  // Enhanced stats with role-specific metrics
  const renderStats = () => {
    if (!showStats || !headerConfig.showStats) return null;

    const statItems = [
      { label: 'Followers', value: profileData.stats.followers, icon: Users },
      { label: 'Following', value: profileData.stats.following, icon: Users },
      { label: 'Reviews', value: profileData.stats.reviews, icon: Star },
    ];

    // Role-specific stats
    if (profileData.userType === 'provider') {
      statItems.push(
        { label: 'Projects', value: profileData.stats.completedProjects, icon: Briefcase },
        { label: 'Rating', value: profileData.stats.rating.toFixed(1), icon: Star },
        { label: 'Response', value: `${profileData.stats.responseRate}%`, icon: TrendingUp }
      );
    } else if (profileData.userType === 'government') {
      statItems.push(
        { label: 'Projects', value: profileData.stats.completedProjects, icon: Briefcase },
        { label: 'AI Matches', value: profileData.stats.aiMatches, icon: Zap },
        { label: 'Budget', value: `${(profileData.stats.totalEarnings / 1000000).toFixed(1)}M ETB`, icon: TrendingUp }
      );
    }

    return (
      <View style={styles.statsContainer}>
        {statItems.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
            <Pressable
              key={stat.label}
              style={styles.statItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Navigate to respective detail screens
              }}
            >
              <StatIcon size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stat.value.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // Enhanced action buttons with role-specific actions
  const renderActions = () => {
    if (!showActions) return null;

    if (isOwnProfile) {
      return (
        <View style={styles.actionsContainer}>
          <Button
            title="Edit Profile"
            onPress={handleEditPress}
            variant="outline"
            size="medium"
            icon={Edit3}
            style={styles.editButton}
          />
          
          <Button
            title="Share"
            onPress={handleSharePress}
            variant="ghost"
            size="medium"
            icon={Share2}
            style={styles.shareButton}
          />
          
          <Button
            title=""
            onPress={handleMoreActions}
            variant="ghost"
            size="medium"
            icon={MoreHorizontal}
            style={styles.moreButton}
          />
        </View>
      );
    }

    return (
      <View style={styles.actionsContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Button
            title={isFollowing ? 'Following' : 'Follow'}
            onPress={handleFollowPress}
            variant={isFollowing ? 'outline' : 'primary'}
            size="medium"
            icon={isFollowing ? CheckCircle : Plus}
            loading={isLoading}
            style={styles.followButton}
          />
        </Animated.View>
        
        <Button
          title="Message"
          onPress={handleMessagePress}
          variant="outline"
          size="medium"
          icon={MessageCircle}
          style={styles.messageButton}
        />
        
        <Button
          title=""
          onPress={handleMoreActions}
          variant="ghost"
          size="medium"
          icon={MoreHorizontal}
          style={styles.moreButton}
        />
      </View>
    );
  };

  // Enhanced user type display
  const renderUserType = () => {
    const typeConfig = {
      client: { label: 'Client', color: colors.info, icon: Users },
      provider: { label: 'Service Provider', color: colors.success, icon: Briefcase },
      government: { label: 'Government', color: colors.warning, icon: Shield },
      admin: { label: 'Administrator', color: colors.error, icon: Crown },
    };

    const config = typeConfig[profileData.userType] || typeConfig.client;
    const UserTypeIcon = config.icon;

    return (
      <View style={[styles.userTypeBadge, { backgroundColor: config.color + '20' }]}>
        <UserTypeIcon size={12} color={config.color} />
        <Text style={[styles.userTypeText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderCoverPhoto()}
      
      <View style={styles.content}>
        {renderAvatar()}
        
        <Animated.View 
          style={[
            styles.profileInfo,
            { opacity: textOpacity }
          ]}
        >
          {/* Name and username with user type */}
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>
                {profileData.displayName}
              </Text>
              {renderUserType()}
            </View>
            <Text style={[styles.username, { color: colors.textSecondary }]}>
              {profileData.username}
            </Text>
          </View>
          
          {/* Bio with character limit */}
          {headerConfig.showBio && profileData.bio && (
            <Text style={[styles.bio, { color: colors.text }]}>
              {profileData.bio}
            </Text>
          )}
          
          {/* Enhanced meta information */}
          <View style={styles.metaContainer}>
            {profileData.location && (
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {profileData.location}
                </Text>
              </View>
            )}
            
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Joined {new Date(profileData.joinedDate).getFullYear()}
              </Text>
            </View>

            {profileData.availability && (
              <View style={styles.metaItem}>
                <View 
                  style={[
                    styles.availabilityIndicator,
                    { 
                      backgroundColor: profileData.availability === 'available' 
                        ? colors.success 
                        : colors.textTertiary 
                    }
                  ]} 
                />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {profileData.availability === 'available' ? 'Available' : 'Away'}
                </Text>
              </View>
            )}
          </View>
          
          {/* Skills for providers */}
          {profileData.skills && profileData.skills.length > 0 && (
            <View style={styles.skillsContainer}>
              {profileData.skills.slice(0, 4).map((skill, index) => (
                <View
                  key={skill}
                  style={[styles.skillTag, { backgroundColor: colors.primary + '15' }]}
                >
                  <Text style={[styles.skillText, { color: colors.primary }]}>
                    {skill}
                  </Text>
                </View>
              ))}
              {profileData.skills.length > 4 && (
                <View style={[styles.skillTag, { backgroundColor: colors.border }]}>
                  <Text style={[styles.skillText, { color: colors.textSecondary }]}>
                    +{profileData.skills.length - 4}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {/* Stats */}
          {renderStats()}
          
          {/* Actions */}
          {renderActions()}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  coverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  premiumPattern: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  coverEditOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  editBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    marginTop: 160,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  badgesContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    backgroundColor: '#10B981',
  },
  premiumBadge: {
    backgroundColor: '#F59E0B',
  },
  proBadge: {
    backgroundColor: '#8B5CF6',
  },
  governmentBadge: {
    backgroundColor: '#3B82F6',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  avatarEditBlur: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  username: {
    fontSize: 16,
    fontWeight: '400',
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bio: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 2,
  },
  followButton: {
    flex: 2,
  },
  messageButton: {
    flex: 1,
  },
  shareButton: {
    flex: 1,
  },
  moreButton: {
    flex: 0.5,
  },
});

export default React.memo(ProfileHeader);

// Specialized header variants
export const CompactProfileHeader = (props) => (
  <ProfileHeader {...props} variant="compact" />
);

export const PremiumProfileHeader = (props) => (
  <ProfileHeader {...props} variant="premium" />
);

export const GovernmentProfileHeader = (props) => (
  <ProfileHeader {...props} variant="government" />
);