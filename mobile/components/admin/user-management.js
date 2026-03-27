// components/admin/user-management.js

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { format, parseISO, differenceInDays } from 'date-fns';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

/**
 * Enhanced User Management Component for Ethiopian Market
 * 
 * Features:
 * - Ethiopian user roles (Client, Service Provider, Government, Admin)
 * - AI construction worker management
 * - Premium feature tracking (200 ETB/month)
 * - Ethiopian payment method verification
 * - City-based user filtering
 * - Construction project assignment
 * - Ethiopian document verification (Fayda ID, Trade Certificate, etc.)
 */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Ethiopian user roles and permissions
const USER_ROLES = {
  admin: {
    label: 'Administrator',
    color: '#F59E0B', // Ethiopian yellow
    icon: 'shield',
    level: 100,
    permissions: ['all'],
  },
  government: {
    label: 'Government',
    color: '#8B5CF6', // Purple
    icon: 'business',
    level: 90,
    permissions: ['manage_projects', 'view_analytics', 'manage_workers'],
  },
  service_provider: {
    label: 'Service Provider',
    color: '#10B981', // Ethiopian green
    icon: 'construct',
    level: 70,
    permissions: ['create_services', 'manage_bookings', 'withdraw_earnings', 'manage_portfolio'],
  },
  client: {
    label: 'Client',
    color: '#3B82F6', // Blue
    icon: 'person',
    level: 50,
    permissions: ['book_services', 'write_reviews', 'message_providers'],
  },
  suspended: {
    label: 'Suspended',
    color: '#6B7280',
    icon: 'block',
    level: 0,
    permissions: [],
  },
};

// Ethiopian user status types
const USER_STATUS = {
  active: {
    label: 'Active',
    color: '#10B981', // Ethiopian green
    icon: 'check-circle',
  },
  inactive: {
    label: 'Inactive',
    color: '#F59E0B', // Ethiopian yellow
    icon: 'schedule',
  },
  banned: {
    label: 'Banned',
    color: '#EF4444',
    icon: 'cancel',
  },
  pending_verification: {
    label: 'Pending Verification',
    color: '#8B5CF6',
    icon: 'hourglass',
  },
  awaiting_documents: {
    label: 'Awaiting Documents',
    color: '#F59E0B',
    icon: 'document-attach',
  },
};

// Ethiopian cities for filtering
const ETHIOPIAN_CITIES = [
  'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Adama', 'Awassa', 
  'Bahir Dar', 'Gondar', 'Jimma', 'Jijiga', 'Harar'
];

// Verification types for Ethiopian market
const VERIFICATION_TYPES = {
  fayda_id: { label: 'Fayda ID', color: '#10B981' },
  trade_certificate: { label: 'Trade Certificate', color: '#3B82F6' },
  business_license: { label: 'Business License', color: '#8B5CF6' },
  selfie_verification: { label: 'Selfie Verification', color: '#F59E0B' },
  government_id: { label: 'Government ID', color: '#EF4444' },
};

const UserManagement = ({
  users = [],
  onUserAction,
  onBulkAction,
  onRefresh,
  onSearch,
  onExport,
  currentUser,
  loading = false,
  refreshing = false,
  showFilters = true,
  showStats = true,
  enableBulkActions = true,
  style,
  testID = 'user-management',
}) => {
  const { theme, isDark } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [activeCityFilter, setActiveCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('joined');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Filter and sort users for Ethiopian market
  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.city?.toLowerCase().includes(query)
      );
    }
    
    // Apply role filters
    const roleFilters = activeFilters.filter(f => Object.keys(USER_ROLES).includes(f));
    if (roleFilters.length > 0) {
      result = result.filter(user => roleFilters.includes(user.role));
    }
    
    // Apply status filters
    const statusFilters = activeFilters.filter(f => Object.keys(USER_STATUS).includes(f));
    if (statusFilters.length > 0) {
      result = result.filter(user => statusFilters.includes(user.status));
    }
    
    // Apply city filter
    if (activeCityFilter !== 'all') {
      result = result.filter(user => user.city === activeCityFilter);
    }
    
    // Apply verification filter
    if (activeFilters.includes('verified')) {
      result = result.filter(user => user.isFullyVerified);
    }
    
    // Apply premium filter
    if (activeFilters.includes('premium')) {
      result = result.filter(user => user.isPremium);
    }
    
    // Apply construction workers filter
    if (activeFilters.includes('construction_workers')) {
      result = result.filter(user => 
        user.role === 'service_provider' && 
        user.skills?.includes('construction')
      );
    }
    
    // Sort users
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'joined':
          aValue = new Date(a.joinedDate);
          bValue = new Date(b.joinedDate);
          break;
        case 'lastActive':
          aValue = new Date(a.lastActive);
          bValue = new Date(b.lastActive);
          break;
        case 'projects':
          aValue = a.stats?.completedProjects || 0;
          bValue = b.stats?.completedProjects || 0;
          break;
        case 'revenue':
          aValue = a.stats?.totalRevenue || 0;
          bValue = b.stats?.totalRevenue || 0;
          break;
        case 'rating':
          aValue = a.stats?.averageRating || 0;
          bValue = b.stats?.averageRating || 0;
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return result;
  }, [users, searchQuery, activeFilters, activeCityFilter, sortBy, sortOrder]);

  // Ethiopian market user statistics
  const userStats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const serviceProviders = users.filter(u => u.role === 'service_provider').length;
    const government = users.filter(u => u.role === 'government').length;
    const verified = users.filter(u => u.isFullyVerified).length;
    const premium = users.filter(u => u.isPremium).length;
    const constructionWorkers = users.filter(u => 
      u.role === 'service_provider' && 
      u.skills?.includes('construction')
    ).length;

    return {
      total,
      active,
      serviceProviders,
      government,
      verified,
      premium,
      constructionWorkers,
      inactive: total - active,
    };
  }, [users]);

  // Handle user selection with analytics
  const handleUserSelect = useCallback((userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      newSelected.add(userId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedUsers(newSelected);
    
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedUsers]);

  // Handle bulk selection
  const handleBulkSelect = useCallback((selectAll = true) => {
    if (selectAll) {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      setSelectedUsers(new Set());
      setIsSelectionMode(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [filteredUsers]);

  // Handle user action with Ethiopian market analytics
  const handleUserAction = useCallback(async (action, user) => {
    setActionLoading(true);
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Track user actions for Ethiopian market
      analyticsService.trackEvent('admin_user_action', {
        action: action,
        user_id: user.id,
        user_role: user.role,
        user_city: user.city,
        user_premium: user.isPremium,
      });
      
      if (onUserAction) {
        await onUserAction(action, user);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('User action failed:', error);
      errorService.captureError(error, {
        context: 'UserManagement',
        action: action,
        user_id: user.id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Action Failed', 'There was an issue processing your request.');
    } finally {
      setActionLoading(false);
    }
  }, [onUserAction]);

  // Handle bulk action with Ethiopian market analytics
  const handleBulkAction = useCallback(async (action) => {
    if (selectedUsers.size === 0) return;
    
    setActionLoading(true);
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const userIds = Array.from(selectedUsers);
      
      // Track bulk actions for Ethiopian market
      analyticsService.trackEvent('admin_bulk_action', {
        action: action,
        user_count: selectedUsers.size,
        user_roles: userIds.map(id => 
          users.find(u => u.id === id)?.role
        ),
      });
      
      if (onBulkAction) {
        await onBulkAction(action, userIds);
      }
      
      // Clear selection after action
      setSelectedUsers(new Set());
      setIsSelectionMode(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Bulk action failed:', error);
      errorService.captureError(error, {
        context: 'UserManagement',
        action: action,
        user_count: selectedUsers.size,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActionLoading(false);
    }
  }, [selectedUsers, onBulkAction, users]);

  // Show user actions sheet for Ethiopian market
  const showUserActions = useCallback((user) => {
    const userRole = USER_ROLES[user.role];
    
    const options = [
      'View Profile',
      'Send Message',
      'Edit User',
      'Change Role',
      'Verification Status',
      user.status === 'active' ? 'Suspend User' : 'Activate User',
      user.isPremium ? 'Remove Premium' : 'Make Premium',
      'Assign to Project',
      'Delete User',
      'Cancel',
    ];
    
    const cancelIndex = 9;
    const destructiveIndex = 8;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              setSelectedUser(user);
              setShowUserModal(true);
              break;
            case 1:
              handleUserAction('message', user);
              break;
            case 2:
              handleUserAction('edit', user);
              break;
            case 3:
              showRoleChangeDialog(user);
              break;
            case 4:
              showVerificationDialog(user);
              break;
            case 5:
              handleUserAction(
                user.status === 'active' ? 'suspend' : 'activate',
                user
              );
              break;
            case 6:
              handleUserAction(
                user.isPremium ? 'remove_premium' : 'make_premium',
                user
              );
              break;
            case 7:
              handleUserAction('assign_project', user);
              break;
            case 8:
              showDeleteConfirmation(user);
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'User Actions',
        `What would you like to do with ${user.firstName} ${user.lastName}?`,
        [
          { text: 'View Profile', onPress: () => {
            setSelectedUser(user);
            setShowUserModal(true);
          }},
          { text: 'Send Message', onPress: () => handleUserAction('message', user) },
          { text: 'Edit User', onPress: () => handleUserAction('edit', user) },
          { text: 'Change Role', onPress: () => showRoleChangeDialog(user) },
          { text: 'Verification Status', onPress: () => showVerificationDialog(user) },
          { 
            text: user.status === 'active' ? 'Suspend User' : 'Activate User',
            onPress: () => handleUserAction(
              user.status === 'active' ? 'suspend' : 'activate',
              user
            ),
          },
          { 
            text: user.isPremium ? 'Remove Premium' : 'Make Premium',
            onPress: () => handleUserAction(
              user.isPremium ? 'remove_premium' : 'make_premium',
              user
            ),
          },
          { 
            text: 'Assign to Project',
            onPress: () => handleUserAction('assign_project', user),
          },
          { 
            text: 'Delete User', 
            style: 'destructive',
            onPress: () => showDeleteConfirmation(user),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [handleUserAction]);

  // Show role change dialog for Ethiopian market
  const showRoleChangeDialog = useCallback((user) => {
    const roles = Object.entries(USER_ROLES)
      .filter(([key]) => key !== 'suspended')
      .map(([key, role]) => ({
        text: role.label,
        onPress: () => handleUserAction('change_role', { ...user, newRole: key }),
      }));

    Alert.alert(
      'Change User Role',
      `Select new role for ${user.firstName} ${user.lastName}:`,
      [...roles, { text: 'Cancel', style: 'cancel' }]
    );
  }, [handleUserAction]);

  // Show verification dialog for Ethiopian market
  const showVerificationDialog = useCallback((user) => {
    const verificationItems = Object.entries(VERIFICATION_TYPES).map(([key, verification]) => {
      const isVerified = user.verifications?.[key];
      return {
        text: `${verification.label} - ${isVerified ? 'Verified' : 'Pending'}`,
        onPress: () => handleUserAction(
          isVerified ? 'unverify_document' : 'verify_document',
          { ...user, documentType: key }
        ),
        style: isVerified ? 'default' : 'cancel',
      };
    });

    Alert.alert(
      'Verification Status',
      `Manage verification for ${user.firstName} ${user.lastName}:`,
      [...verificationItems, { text: 'Cancel', style: 'cancel' }]
    );
  }, [handleUserAction]);

  // Show delete confirmation
  const showDeleteConfirmation = useCallback((user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone and will permanently remove all user data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleUserAction('delete', user),
        },
      ]
    );
  }, [handleUserAction]);

  // Toggle filter
  const toggleFilter = useCallback((filter) => {
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Render Ethiopian market user stats
  const renderStats = () => {
    if (!showStats) return null;

    const statItems = [
      { label: 'Total', value: userStats.total, color: '#3B82F6' },
      { label: 'Active', value: userStats.active, color: '#10B981' },
      { label: 'Service Providers', value: userStats.serviceProviders, color: '#10B981' },
      { label: 'Gov Officials', value: userStats.government, color: '#8B5CF6' },
      { label: 'Verified', value: userStats.verified, color: '#10B981' },
      { label: 'Premium', value: userStats.premium, color: '#F59E0B' },
      { label: 'Construction', value: userStats.constructionWorkers, color: '#059669' },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        {statItems.map((stat, index) => (
          <TouchableOpacity
            key={stat.label}
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            onPress={() => {
              // Auto-filter when stat is pressed
              const filterMap = {
                'Service Providers': 'service_provider',
                'Gov Officials': 'government',
                'Verified': 'verified',
                'Premium': 'premium',
                'Construction': 'construction_workers',
              };
              
              if (filterMap[stat.label]) {
                toggleFilter(filterMap[stat.label]);
              }
            }}
          >
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {stat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Render Ethiopian market filters
  const renderFilters = () => {
    if (!showFilters) return null;

    const filterOptions = [
      ...Object.keys(USER_ROLES).map(role => ({
        key: role,
        label: USER_ROLES[role].label,
        color: USER_ROLES[role].color,
      })),
      ...Object.keys(USER_STATUS).map(status => ({
        key: status,
        label: USER_STATUS[status].label,
        color: USER_STATUS[status].color,
      })),
      { key: 'verified', label: 'Verified', color: '#10B981' },
      { key: 'premium', label: 'Premium', color: '#F59E0B' },
      { key: 'construction_workers', label: 'Construction', color: '#059669' },
    ];

    return (
      <View style={styles.filtersSection}>
        {/* Role and Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filterOptions.map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilters.includes(filter.key)
                    ? filter.color
                    : theme.colors.background,
                  borderColor: filter.color,
                },
              ]}
              onPress={() => toggleFilter(filter.key)}
            >
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

        {/* City Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityFiltersContainer}
        >
          <TouchableOpacity
            style={[
              styles.cityFilterChip,
              {
                backgroundColor: activeCityFilter === 'all' 
                  ? '#10B981' 
                  : theme.colors.background,
                borderColor: '#10B981',
              },
            ]}
            onPress={() => setActiveCityFilter('all')}
          >
            <Text
              style={[
                styles.cityFilterText,
                {
                  color: activeCityFilter === 'all' ? '#FFFFFF' : theme.colors.text,
                },
              ]}
            >
              All Cities
            </Text>
          </TouchableOpacity>
          
          {ETHIOPIAN_CITIES.map(city => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityFilterChip,
                {
                  backgroundColor: activeCityFilter === city 
                    ? '#3B82F6' 
                    : theme.colors.background,
                  borderColor: '#3B82F6',
                },
              ]}
              onPress={() => setActiveCityFilter(city)}
            >
              <Text
                style={[
                  styles.cityFilterText,
                  {
                    color: activeCityFilter === city ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render user item for Ethiopian market
  const renderUserItem = useCallback((user) => {
    const isSelected = selectedUsers.has(user.id);
    const userRole = USER_ROLES[user.role] || USER_ROLES.client;
    const userStatus = USER_STATUS[user.status] || USER_STATUS.active;
    const daysSinceJoin = differenceInDays(new Date(), parseISO(user.joinedDate));

    // Calculate verification progress
    const verificationCount = Object.values(user.verifications || {}).filter(Boolean).length;
    const totalVerifications = Object.keys(VERIFICATION_TYPES).length;
    const verificationProgress = (verificationCount / totalVerifications) * 100;

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          {
            backgroundColor: isSelected
              ? theme.colors.primary + '20'
              : theme.colors.card,
            borderLeftWidth: 4,
            borderLeftColor: userRole.color,
          },
        ]}
        onPress={() => {
          if (isSelectionMode) {
            handleUserSelect(user.id);
          } else {
            setSelectedUser(user);
            setShowUserModal(true);
          }
        }}
        onLongPress={() => {
          if (enableBulkActions) {
            setIsSelectionMode(true);
            handleUserSelect(user.id);
          }
        }}
        delayLongPress={500}
        activeOpacity={0.7}
        accessibilityLabel={`User: ${user.firstName} ${user.lastName}. Role: ${userRole.label}. City: ${user.city}. ${user.isPremium ? 'Premium user.' : ''}`}
      >
        {/* Selection checkbox */}
        {isSelectionMode && (
          <View style={styles.selectionIndicator}>
            <View
              style={[
                styles.selectionCircle,
                {
                  borderColor: theme.colors.primary,
                  backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
          </View>
        )}

        {/* Avatar with Ethiopian styling */}
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatar}
            />
          ) : (
            <LinearGradient
              colors={[userRole.color, userRole.color + 'CC']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </Text>
            </LinearGradient>
          )}
          
          {/* Status indicator */}
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: userStatus.color },
            ]}
          />

          {/* Premium badge */}
          {user.isPremium && (
            <View style={styles.premiumIndicator}>
              <Ionicons name="star" size={8} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* User info */}
        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            {user.isFullyVerified && (
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            )}
            {user.isPremium && (
              <Ionicons name="star" size={16} color="#F59E0B" />
            )}
          </View>
          
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
            {user.email}
          </Text>
          
          <View style={styles.userMeta}>
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: userRole.color + '20' },
                ]}
              >
                <MaterialIcons
                  name={userRole.icon}
                  size={12}
                  color={userRole.color}
                />
                <Text
                  style={[styles.roleText, { color: userRole.color }]}
                  numberOfLines={1}
                >
                  {userRole.label}
                </Text>
              </View>

              {user.city && (
                <View style={styles.cityBadge}>
                  <Ionicons name="location" size={10} color="#6B7280" />
                  <Text style={[styles.cityText, { color: theme.colors.textTertiary }]}>
                    {user.city}
                  </Text>
                </View>
              )}
            </View>

            {/* Verification progress */}
            {user.role === 'service_provider' && (
              <View style={styles.verificationProgress}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${verificationProgress}%`,
                        backgroundColor: verificationProgress === 100 ? '#10B981' : '#F59E0B',
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.colors.textTertiary }]}>
                  {verificationCount}/{totalVerifications}
                </Text>
              </View>
            )}

            <Text style={[styles.joinDate, { color: theme.colors.textTertiary }]}>
              Joined {daysSinceJoin}d ago
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.userStats}>
          {user.stats && (
            <>
              {user.role === 'service_provider' ? (
                <>
                  <View style={styles.stat}>
                    <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                      {user.stats.completedProjects || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Projects
                    </Text>
                  </View>
                  
                  <View style={styles.stat}>
                    <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                      {user.stats.averageRating?.toFixed(1) || '0.0'}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Rating
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.stat}>
                  <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                    {user.stats.completedBookings || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    Bookings
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Actions */}
        {!isSelectionMode && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => showUserActions(user)}
            disabled={actionLoading}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }, [
    theme,
    selectedUsers,
    isSelectionMode,
    actionLoading,
    handleUserSelect,
    showUserActions,
  ]);

  // Render selection header
  const renderSelectionHeader = () => {
    if (!isSelectionMode) return null;

    return (
      <BlurView intensity={80} style={styles.selectionHeader}>
        <View style={styles.selectionHeaderContent}>
          <TouchableOpacity
            style={styles.selectionHeaderButton}
            onPress={() => handleBulkSelect(false)}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.selectionHeaderText, { color: theme.colors.text }]}>
            {selectedUsers.size} users selected
          </Text>
          
          <TouchableOpacity
            style={styles.selectionHeaderButton}
            onPress={() => {
              const options = [
                'Send Message',
                'Change Role',
                'Verify Documents',
                'Make Premium',
                'Activate Users',
                'Suspend Users',
                'Assign to Projects',
                'Export Data',
                'Delete Users',
                'Cancel',
              ];
              
              if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                  { options, cancelButtonIndex: 9, destructiveButtonIndex: 8 },
                  (buttonIndex) => {
                    const actions = [
                      'message', 'change_role', 'verify_documents', 'make_premium', 
                      'activate', 'suspend', 'assign_projects', 'export', 'delete'
                    ];
                    if (buttonIndex < 9) {
                      handleBulkAction(actions[buttonIndex]);
                    }
                  }
                );
              } else {
                Alert.alert(
                  'Bulk Actions',
                  `Perform action on ${selectedUsers.size} users?`,
                  [
                    { text: 'Send Message', onPress: () => handleBulkAction('message') },
                    { text: 'Change Role', onPress: () => handleBulkAction('change_role') },
                    { text: 'Verify Documents', onPress: () => handleBulkAction('verify_documents') },
                    { text: 'Make Premium', onPress: () => handleBulkAction('make_premium') },
                    { text: 'Activate Users', onPress: () => handleBulkAction('activate') },
                    { text: 'Suspend Users', onPress: () => handleBulkAction('suspend') },
                    { text: 'Assign to Projects', onPress: () => handleBulkAction('assign_projects') },
                    { text: 'Export Data', onPress: () => handleBulkAction('export') },
                    { 
                      text: 'Delete Users', 
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert(
                          'Confirm Deletion',
                          `Permanently delete ${selectedUsers.size} users? This action cannot be undone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => handleBulkAction('delete'),
                            },
                          ]
                        );
                      },
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </BlurView>
    );
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderSelectionHeader()}
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search users by name, email, phone, or city..."
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

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilters()}

      {/* Users List */}
      <ScrollView
        style={styles.usersList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {filteredUsers.map(renderUserItem)}
        
        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>
              No users found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              {searchQuery || activeFilters.length > 0 || activeCityFilter !== 'all' 
                ? 'Try adjusting your search terms or filters' 
                : 'No users in the system yet'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bulk Select Button */}
      {enableBulkActions && !isSelectionMode && filteredUsers.length > 0 && (
        <TouchableOpacity
          style={[styles.bulkSelectButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setIsSelectionMode(true)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.bulkSelectText}>Select Multiple</Text>
        </TouchableOpacity>
      )}

      {/* Loading Overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Processing...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectionHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  selectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  selectionHeaderButton: {
    padding: 4,
  },
  selectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
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
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  filtersSection: {
    gap: 12,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cityFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  cityFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cityFilterText: {
    fontSize: 11,
    fontWeight: '500',
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  selectionIndicator: {
    marginRight: 12,
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  premiumIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
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
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 6,
  },
  userMeta: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    fontSize: 11,
  },
  verificationProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '500',
  },
  joinDate: {
    fontSize: 12,
  },
  userStats: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  stat: {
    alignItems: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
  },
  actionButton: {
    padding: 4,
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
  bulkSelectButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bulkSelectText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserManagement;
export { USER_ROLES, USER_STATUS, VERIFICATION_TYPES, ETHIOPIAN_CITIES };