// components/gamification/leaderboard.js
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { analyticsService } from '../../services/analytics-service';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enhanced leaderboard configuration
const LEADERBOARD_CONFIG = {
  points: {
    label: 'Points',
    icon: 'star',
    color: '#FFD700',
    metric: 'points',
    category: 'general',
  },
  level: {
    label: 'Level',
    icon: 'trending-up',
    color: '#4CAF50',
    metric: 'level',
    category: 'progress',
  },
  achievements: {
    label: 'Achievements',
    icon: 'emoji-events',
    color: '#9C27B0',
    metric: 'achievementsCount',
    category: 'achievements',
  },
  weekly: {
    label: 'Weekly',
    icon: 'calendar-today',
    color: '#2196F3',
    metric: 'weeklyPoints',
    category: 'time',
  },
  monthly: {
    label: 'Monthly',
    icon: 'date-range',
    color: '#FF9800',
    metric: 'monthlyPoints',
    category: 'time',
  },
  service_provider: {
    label: 'Service Providers',
    icon: 'handyman',
    color: '#607D8B',
    metric: 'serviceRating',
    category: 'service',
  },
  construction: {
    label: 'Construction',
    icon: 'construction',
    color: '#795548',
    metric: 'constructionScore',
    category: 'service',
  },
  premium: {
    label: 'Premium',
    icon: 'workspace-premium',
    color: '#9C27B0',
    metric: 'premiumPoints',
    category: 'premium',
  },
  ethiopian: {
    label: 'Local Heroes',
    icon: 'public',
    color: '#078930',
    metric: 'localPoints',
    category: 'local',
  },
};

// Rank tier system
const RANK_TIERS = {
  1: { 
    label: 'Champion', 
    color: '#FFD700', 
    gradient: ['#FFD700', '#FFED4E'], 
    icon: 'crown',
    title: 'Yachi Champion',
  },
  2: { 
    label: 'Elite', 
    color: '#C0C0C0', 
    gradient: ['#C0C0C0', '#E0E0E0'], 
    icon: 'award',
    title: 'Yachi Elite',
  },
  3: { 
    label: 'Pro', 
    color: '#CD7F32', 
    gradient: ['#CD7F32', '#E3964A'], 
    icon: 'medal',
    title: 'Yachi Pro',
  },
  4: { 
    label: 'Expert', 
    color: '#9C27B0', 
    gradient: ['#9C27B0', '#BA68C8'], 
    icon: 'rocket',
    title: 'Yachi Expert',
  },
  5: { 
    label: 'Advanced', 
    color: '#2196F3', 
    gradient: ['#2196F3', '#42A5F5'], 
    icon: 'trending-up',
    title: 'Yachi Advanced',
  },
};

// User role configuration
const USER_ROLES = {
  client: { label: 'Clients', icon: 'person', color: '#2196F3' },
  service_provider: { label: 'Service Providers', icon: 'handyman', color: '#FF9800' },
  government: { label: 'Government', icon: 'account-balance', color: '#4CAF50' },
  premium: { label: 'Premium', icon: 'workspace-premium', color: '#9C27B0' },
};

const Leaderboard = ({
  data = [],
  currentUserId,
  type = 'points',
  timeRange = 'all-time',
  showFilters = true,
  showSearch = true,
  showPrizes = true,
  animated = true,
  onUserPress,
  onRefresh,
  onTimeRangeChange,
  onTypeChange,
  loading = false,
  refreshing = false,
  style,
  testID = 'leaderboard',
  userRole = 'client',
  language = 'en',
  enableHaptics = true,
  showUserRoleFilter = true,
  ...rest
}) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedUserRole, setSelectedUserRole] = useState(null);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Memoized data processing
  const currentUser = useMemo(() => 
    data.find(user => user.id === currentUserId) || null, 
    [data, currentUserId]
  );

  const currentUserRank = useMemo(() => 
    currentUser ? data.findIndex(user => user.id === currentUserId) + 1 : null, 
    [data, currentUserId, currentUser]
  );

  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.businessName?.toLowerCase().includes(query)
      );
    }
    
    // Role filter
    if (selectedUserRole) {
      result = result.filter(user => user.role === selectedUserRole);
    }
    
    // Additional filters
    if (activeFilters.includes('friends') && currentUser?.friends) {
      result = result.filter(user => 
        currentUser.friends.includes(user.id) || user.id === currentUserId
      );
    }
    
    if (activeFilters.includes('nearby')) {
      result = result.filter(user => user.distance && user.distance < 50);
    }

    if (activeFilters.includes('premium')) {
      result = result.filter(user => user.isPremium);
    }
    
    // Sort by metric
    const metric = LEADERBOARD_CONFIG[type]?.metric || 'points';
    result.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    
    return result.slice(0, visibleCount);
  }, [data, searchQuery, activeFilters, type, visibleCount, currentUser, selectedUserRole]);

  const rankedData = useMemo(() => 
    filteredData.map((user, index) => {
      const rank = index + 1;
      const tier = rank <= 3 ? RANK_TIERS[rank] : 
                   rank <= 10 ? RANK_TIERS[4] : 
                   rank <= 100 ? RANK_TIERS[5] : null;
      
      const previousRank = user.previousRank || rank;
      const rankChange = previousRank - rank;
      
      return {
        ...user,
        rank,
        tier,
        rankChange,
        isCurrentUser: user.id === currentUserId,
        userRole: user.role || 'client',
        isVerified: user.isVerified || false,
        isPremium: user.isPremium || false,
        skills: user.skills || [],
        serviceCategories: user.serviceCategories || [],
      };
    }), 
    [filteredData, currentUserId]
  );

  const prizes = useMemo(() => {
    if (!showPrizes) return [];
    
    const basePrizes = [
      { rank: 1, prize: 'Grand Prize', value: '10,000 ETB', color: '#FFD700', icon: 'crown' },
      { rank: 2, prize: 'Runner Up', value: '5,000 ETB', color: '#C0C0C0', icon: 'award' },
      { rank: 3, prize: 'Third Place', value: '2,500 ETB', color: '#CD7F32', icon: 'medal' },
      { rank: '4-10', prize: 'Top 10', value: 'Premium Bundle', color: '#9C27B0', icon: 'workspace-premium' },
      { rank: '11-100', prize: 'Top 100', value: 'Exclusive Badge', color: '#2196F3', icon: 'verified' },
    ];

    return type === 'ethiopian' ? [
      { rank: 1, prize: 'Local Champion', value: '15,000 ETB', color: '#078930', icon: 'flag' },
      { rank: 2, prize: 'Community Hero', value: '7,500 ETB', color: '#FCDD09', icon: 'people' },
      ...basePrizes.slice(2)
    ] : basePrizes;
  }, [showPrizes, type]);

  // Event handlers
  const handleUserPress = useCallback((user) => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    analyticsService.trackEvent('leaderboard_user_viewed', {
      userId: user.id,
      userRole: user.role,
      rank: user.rank,
      leaderboardType: type,
      currentUserId,
    });

    onUserPress ? onUserPress(user) : setSelectedUser(user) || setShowUserModal(true);
  }, [onUserPress, type, currentUserId, enableHaptics]);

  const handleRefresh = useCallback(() => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    analyticsService.trackEvent('leaderboard_refreshed', {
      leaderboardType: type,
      timeRange,
      userId: currentUserId,
    });

    onRefresh?.();
  }, [onRefresh, type, timeRange, currentUserId, enableHaptics]);

  const handleLoadMore = useCallback(() => {
    if (visibleCount < data.length) {
      setVisibleCount(prev => Math.min(prev + 50, data.length));
      if (enableHaptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [visibleCount, data.length, enableHaptics]);

  const toggleFilter = useCallback((filter) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [enableHaptics]);

  const handleUserRoleChange = useCallback((role) => {
    setSelectedUserRole(prev => prev === role ? null : role);
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    analyticsService.trackEvent('leaderboard_filter_changed', {
      filterType: 'userRole',
      value: role,
      leaderboardType: type,
      userId: currentUserId,
    });
  }, [type, currentUserId, enableHaptics]);

  const formatNumber = useCallback((num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  // Component renderers
  const renderRankBadge = useCallback((rank, tier, rankChange, userRole) => {
    const roleConfig = USER_ROLES[userRole] || USER_ROLES.client;
    
    if (rank <= 3 && tier) {
      return (
        <LinearGradient
          colors={tier.gradient}
          style={[styles.rankBadge, styles.topRankBadge]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome5 name={tier.icon} size={16} color="#FFFFFF" />
          <Text style={styles.topRankText}>{rank}</Text>
        </LinearGradient>
      );
    }
    
    return (
      <View style={[styles.rankBadge, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.rankText, { color: theme.colors.text }]}>{rank}</Text>
        <View style={[styles.roleIndicator, { backgroundColor: roleConfig.color }]} />
        {rankChange !== 0 && (
          <View style={[
            styles.rankChange,
            { backgroundColor: rankChange > 0 ? '#4CAF50' : '#F44336' }
          ]}>
            <Ionicons
              name={rankChange > 0 ? 'caret-up' : 'caret-down'}
              size={8}
              color="#FFFFFF"
            />
            <Text style={styles.rankChangeText}>{Math.abs(rankChange)}</Text>
          </View>
        )}
      </View>
    );
  }, [theme]);

  const renderUserRow = useCallback(({ item: user }) => {
    const metricValue = user[LEADERBOARD_CONFIG[type]?.metric] || 0;
    const isCurrentUser = user.id === currentUserId;
    const userRoleConfig = USER_ROLES[user.userRole] || USER_ROLES.client;
    
    return (
      <TouchableOpacity
        style={[
          styles.userRow,
          {
            backgroundColor: isCurrentUser ? theme.colors.primary + '20' : theme.colors.card,
            borderLeftWidth: 4,
            borderLeftColor: userRoleConfig.color,
          },
        ]}
        onPress={() => handleUserPress(user)}
        activeOpacity={0.7}
      >
        {renderRankBadge(user.rank, user.tier, user.rankChange, user.userRole)}
        
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: userRoleConfig.color }]}>
                <Text style={styles.avatarText}>
                  {user.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            {user.isPremium && (
              <View style={[styles.premiumBadge, { backgroundColor: '#FFD700' }]}>
                <MaterialIcons name="workspace-premium" size={8} color="#000000" />
              </View>
            )}
            
            {user.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="checkmark" size={8} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          <View style={styles.userDetails}>
            <View style={styles.nameContainer}>
              <Text 
                style={[
                  styles.userName,
                  { color: theme.colors.text, fontWeight: isCurrentUser ? '600' : '400' }
                ]}
                numberOfLines={1}
              >
                {user.businessName || user.name}
              </Text>
              
              {isCurrentUser && (
                <View style={[styles.currentUserBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.currentUserText}>You</Text>
                </View>
              )}
            </View>
            
            <View style={styles.userMeta}>
              <Text style={[styles.userRole, { color: userRoleConfig.color }]}>
                {userRoleConfig.label}
              </Text>
              <Text style={[styles.userMetric, { color: theme.colors.textSecondary }]}>
                {formatNumber(metricValue)} {LEADERBOARD_CONFIG[type].label}
              </Text>
            </View>

            {user.skills?.length > 0 && (
              <View style={styles.skillsContainer}>
                {user.skills.slice(0, 2).map((skill, skillIndex) => (
                  <View key={skillIndex} style={[styles.skillTag, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.skillText, { color: theme.colors.textSecondary }]}>
                      {skill}
                    </Text>
                  </View>
                ))}
                {user.skills.length > 2 && (
                  <Text style={[styles.moreSkills, { color: theme.colors.textTertiary }]}>
                    +{user.skills.length - 2}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.additionalStats}>
          {user.level && (
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                Lvl {user.level}
              </Text>
            </View>
          )}
          
          {user.achievementsCount > 0 && (
            <View style={styles.stat}>
              <MaterialIcons name="emoji-events" size={12} color="#FFD700" />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {user.achievementsCount}
              </Text>
            </View>
          )}

          {user.serviceRating && (
            <View style={styles.stat}>
              <MaterialIcons name="star" size={12} color="#FFD700" />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {user.serviceRating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [theme, type, currentUserId, handleUserPress, renderRankBadge, formatNumber]);

  const renderHeader = () => {
    if (!currentUser) return null;

    const currentUserRoleConfig = USER_ROLES[currentUser.role] || USER_ROLES.client;

    return (
      <View style={[styles.currentUserCard, { backgroundColor: theme.colors.primary + '20' }]}>
        <View style={styles.currentUserHeader}>
          <View style={styles.currentUserIdentity}>
            <Text style={[styles.currentUserTitle, { color: theme.colors.text }]}>
              Your Position
            </Text>
            <View style={[styles.currentUserRole, { backgroundColor: currentUserRoleConfig.color }]}>
              <Text style={styles.currentUserRoleText}>{currentUserRoleConfig.label}</Text>
            </View>
          </View>
          <Text style={[styles.currentUserRank, { color: theme.colors.primary }]}>
            #{currentUserRank}
          </Text>
        </View>
        
        <View style={styles.currentUserStats}>
          <View style={styles.currentUserStat}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={[styles.currentUserStatValue, { color: theme.colors.text }]}>
              {formatNumber(currentUser.points || 0)}
            </Text>
            <Text style={[styles.currentUserStatLabel, { color: theme.colors.textSecondary }]}>
              Points
            </Text>
          </View>
          
          <View style={styles.currentUserStat}>
            <MaterialIcons name="trending-up" size={16} color="#4CAF50" />
            <Text style={[styles.currentUserStatValue, { color: theme.colors.text }]}>
              {currentUser.level || 1}
            </Text>
            <Text style={[styles.currentUserStatLabel, { color: theme.colors.textSecondary }]}>
              Level
            </Text>
          </View>
          
          <View style={styles.currentUserStat}>
            <MaterialIcons name="emoji-events" size={16} color="#9C27B0" />
            <Text style={[styles.currentUserStatValue, { color: theme.colors.text }]}>
              {currentUser.achievementsCount || 0}
            </Text>
            <Text style={[styles.currentUserStatLabel, { color: theme.colors.textSecondary }]}>
              Achievements
            </Text>
          </View>

          {currentUser.serviceRating && (
            <View style={styles.currentUserStat}>
              <MaterialIcons name="handyman" size={16} color="#FF9800" />
              <Text style={[styles.currentUserStatValue, { color: theme.colors.text }]}>
                {currentUser.serviceRating.toFixed(1)}
              </Text>
              <Text style={[styles.currentUserStatLabel, { color: theme.colors.textSecondary }]}>
                Rating
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    const filterOptions = [
      { key: 'friends', label: 'Friends', icon: 'people' },
      { key: 'nearby', label: 'Nearby', icon: 'location-on' },
      { key: 'premium', label: 'Premium', icon: 'workspace-premium' },
    ];

    const timeRangeOptions = [
      { key: 'weekly', label: 'This Week' },
      { key: 'monthly', label: 'This Month' },
      { key: 'all-time', label: 'All Time' },
    ];

    return (
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeRangeContainer}
        >
          {timeRangeOptions.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.timeRangeButton,
                {
                  backgroundColor: timeRange === option.key 
                    ? theme.colors.primary 
                    : theme.colors.background,
                },
              ]}
              onPress={() => onTimeRangeChange?.(option.key)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  {
                    color: timeRange === option.key ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {showUserRoleFilter && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roleFilterContainer}
          >
            {Object.entries(USER_ROLES).map(([key, role]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.roleFilterButton,
                  {
                    backgroundColor: selectedUserRole === key 
                      ? role.color 
                      : theme.colors.background,
                  },
                ]}
                onPress={() => handleUserRoleChange(key)}
              >
                <MaterialIcons
                  name={role.icon}
                  size={14}
                  color={selectedUserRole === key ? '#FFFFFF' : theme.colors.text}
                />
                <Text
                  style={[
                    styles.roleFilterText,
                    {
                      color: selectedUserRole === key ? '#FFFFFF' : theme.colors.text,
                    },
                  ]}
                >
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContainer}
        >
          {filterOptions.map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilters.includes(filter.key)
                    ? theme.colors.primary
                    : theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => toggleFilter(filter.key)}
            >
              <MaterialIcons
                name={filter.icon}
                size={14}
                color={activeFilters.includes(filter.key) ? '#FFFFFF' : theme.colors.text}
              />
              <Text
                style={[
                  styles.filterText,
                  {
                    color: activeFilters.includes(filter.key) ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSearch = () => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPrizes = () => {
    if (!showPrizes || prizes.length === 0) return null;

    return (
      <View style={styles.prizesContainer}>
        <Text style={[styles.prizesTitle, { color: theme.colors.text }]}>
          🏆 This Week's Prizes
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.prizesList}
        >
          {prizes.map((prize, index) => (
            <View
              key={index}
              style={[styles.prizeCard, { backgroundColor: theme.colors.card }]}
            >
              <View style={[styles.prizeRank, { backgroundColor: prize.color }]}>
                <Text style={styles.prizeRankText}>{prize.rank}</Text>
              </View>
              <Text style={[styles.prizeName, { color: theme.colors.text }]}>
                {prize.prize}
              </Text>
              <Text style={[styles.prizeValue, { color: prize.color }]}>
                {prize.value}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderUserModal = () => (
    <Modal
      visible={showUserModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowUserModal(false)}
    >
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setShowUserModal(false)}
          theme={theme}
          leaderboardType={type}
        />
      )}
    </Modal>
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderHeader()}
      {renderSearch()}
      {renderFilters()}
      {renderPrizes()}
      
      <Animated.FlatList
        data={rankedData}
        renderItem={renderUserRow}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>
              No users found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search' : 'Be the first to join the leaderboard!'}
            </Text>
          </View>
        }
        ListFooterComponent={
          visibleCount < data.length ? (
            <View style={styles.loadMoreContainer}>
              <Text style={[styles.loadMoreText, { color: theme.colors.textSecondary }]}>
                Showing {visibleCount} of {data.length} users
              </Text>
              <TouchableOpacity onPress={handleLoadMore}>
                <Text style={[styles.loadMoreButton, { color: theme.colors.primary }]}>
                  Load More
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {renderUserModal()}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

// User Detail Modal Component
const UserDetailModal = ({ user, onClose, theme, leaderboardType }) => {
  const userRoleConfig = USER_ROLES[user.userRole] || USER_ROLES.client;
  
  return (
    <BlurView intensity={80} style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            User Profile
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalBody}>
          <View style={styles.userProfileHeader}>
            <View style={styles.avatarContainer}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.largeAvatar} />
              ) : (
                <View style={[styles.largeAvatar, { backgroundColor: userRoleConfig.color }]}>
                  <Text style={styles.largeAvatarText}>
                    {user.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.userProfileInfo}>
              <Text style={[styles.userProfileName, { color: theme.colors.text }]}>
                {user.businessName || user.name}
              </Text>
              <View style={[styles.userRoleBadge, { backgroundColor: userRoleConfig.color }]}>
                <Text style={styles.userRoleBadgeText}>{userRoleConfig.label}</Text>
              </View>
              {user.isPremium && (
                <View style={styles.premiumIndicator}>
                  <MaterialIcons name="workspace-premium" size={16} color="#FFD700" />
                  <Text style={[styles.premiumText, { color: theme.colors.text }]}>
                    Premium Member
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  currentUserCard: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currentUserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  currentUserIdentity: {
    flex: 1,
  },
  currentUserTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentUserRole: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  currentUserRoleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  currentUserRank: {
    fontSize: 20,
    fontWeight: '700',
  },
  currentUserStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  currentUserStat: {
    alignItems: 'center',
    gap: 4,
  },
  currentUserStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  currentUserStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timeRangeContainer: {
    gap: 8,
    marginBottom: 12,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleFilterContainer: {
    gap: 8,
    marginBottom: 12,
  },
  roleFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    marginRight: 8,
  },
  roleFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickFiltersContainer: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  prizesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  prizesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  prizesList: {
    gap: 12,
  },
  prizeCard: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prizeRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  prizeRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  prizeName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  prizeValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  topRankBadge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  topRankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rankChange: {
    position: 'absolute',
    top: -2,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
  },
  rankChangeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    marginLeft: 1,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  currentUserBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentUserText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  userMetric: {
    fontSize: 14,
    fontWeight: '500',
  },
  skillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 10,
    fontWeight: '500',
  },
  additionalStats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    fontSize: 14,
    marginBottom: 8,
  },
  loadMoreButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  userProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  largeAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  userProfileInfo: {
    flex: 1,
  },
  userProfileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  userRoleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  premiumIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Leaderboard;
export { LEADERBOARD_CONFIG as LEADERBOARD_TYPES, RANK_TIERS, USER_ROLES };