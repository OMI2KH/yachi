import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  RefreshControl,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { api } from '../utils/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';

const { width } = Dimensions.get('window');

// User types for Ethiopian market
const UserType = {
  CLIENT: 'client',
  SERVICE_PROVIDER: 'service_provider',
  GOVERNMENT: 'government',
  ADMIN: 'admin',
};

// Verification types for Ethiopian market
const VerificationType = {
  FAYDA_ID: 'fayda_id',
  SELFIE: 'selfie',
  TRADE_CERTIFICATE: 'trade_certificate',
  BUSINESS_LICENSE: 'business_license',
  GOVERNMENT_ID: 'government_id',
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [aiProjects, setAiProjects] = useState([]);
  const [paymentStats, setPaymentStats] = useState({});
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadAdminData();
    animateEntrance();
    
    // Track admin dashboard view
    analyticsService.trackEvent('admin_dashboard_viewed');
  }, []);

  const animateEntrance = () => {
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
      })
    ]).start();
  };

  const loadAdminData = async () => {
    try {
      const [
        usersResponse, 
        analyticsResponse, 
        activitiesResponse,
        aiProjectsResponse,
        paymentStatsResponse
      ] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/analytics'),
        api.get('/api/admin/activities'),
        api.get('/api/admin/ai-projects'),
        api.get('/api/admin/payment-stats')
      ]);
      
      setUsers(usersResponse.data);
      setAnalytics(analyticsResponse.data);
      setRecentActivities(activitiesResponse.data);
      setAiProjects(aiProjectsResponse.data);
      setPaymentStats(paymentStatsResponse.data);
    } catch (err) {
      console.error('Admin data load error:', err);
      errorService.captureError(err, { context: 'AdminDashboard' });
      Alert.alert('Error', 'Failed to load admin data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
    
    analyticsService.trackEvent('admin_dashboard_refreshed');
  };

  const verifyUser = async (userId, verificationType, verified) => {
    try {
      await api.put(`/api/admin/users/${userId}/verify`, { 
        verificationType, 
        verified 
      });
      
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              verifications: {
                ...user.verifications,
                [verificationType]: verified
              }
            } 
          : user
      ));
      
      const user = users.find(u => u.id === userId);
      const action = verified ? 'verified' : 'unverified';
      
      // Track verification action
      analyticsService.trackEvent('admin_user_verification_updated', {
        user_id: userId,
        user_type: user.role,
        verification_type: verificationType,
        action: action,
      });
      
      Alert.alert('Success', `${user.firstName}'s ${getVerificationLabel(verificationType)} ${action}`);
    } catch (err) {
      console.error('Verification error:', err);
      errorService.captureError(err, { 
        context: 'UserVerification',
        user_id: userId,
        verification_type: verificationType,
      });
      Alert.alert('Error', 'Failed to update verification status');
    }
  };

  const suspendUser = async (user) => {
    Alert.alert(
      user.suspended ? 'Unsuspend User' : 'Suspend User',
      `Are you sure you want to ${user.suspended ? 'unsuspend' : 'suspend'} ${user.firstName} ${user.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: user.suspended ? 'Unsuspend' : 'Suspend', 
          style: user.suspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.put(`/api/admin/users/${user.id}/suspend`, { 
                suspended: !user.suspended 
              });
              
              setUsers(users.map(u => 
                u.id === user.id ? { ...u, suspended: !user.suspended } : u
              ));
              
              // Track suspension action
              analyticsService.trackEvent('admin_user_suspension_updated', {
                user_id: user.id,
                user_type: user.role,
                action: user.suspended ? 'unsuspended' : 'suspended',
              });
              
              Alert.alert('Success', `User ${user.suspended ? 'unsuspended' : 'suspended'}`);
            } catch (err) {
              errorService.captureError(err, { 
                context: 'UserSuspension',
                user_id: user.id,
              });
              Alert.alert('Error', 'Failed to update user status');
            }
          }
        }
      ]
    );
  };

  const upgradeToPremium = async (user) => {
    Alert.alert(
      'Upgrade to Premium',
      `Upgrade ${user.firstName} to premium service provider? (200 ETB/month)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upgrade', 
          style: 'default',
          onPress: async () => {
            try {
              await api.put(`/api/admin/users/${user.id}/premium`, { 
                premium: true 
              });
              
              setUsers(users.map(u => 
                u.id === user.id ? { ...u, isPremium: true } : u
              ));
              
              analyticsService.trackEvent('admin_user_upgraded_premium', {
                user_id: user.id,
                user_type: user.role,
              });
              
              Alert.alert('Success', 'User upgraded to premium');
            } catch (err) {
              errorService.captureError(err, { 
                context: 'UserPremiumUpgrade',
                user_id: user.id,
              });
              Alert.alert('Error', 'Failed to upgrade user');
            }
          }
        }
      ]
    );
  };

  const getVerificationLabel = (type) => {
    const labels = {
      [VerificationType.FAYDA_ID]: 'Fayda ID',
      [VerificationType.SELFIE]: 'Selfie',
      [VerificationType.TRADE_CERTIFICATE]: 'Trade Certificate',
      [VerificationType.BUSINESS_LICENSE]: 'Business License',
      [VerificationType.GOVERNMENT_ID]: 'Government ID',
    };
    return labels[type] || type;
  };

  const getRoleColor = (role) => {
    const colors = {
      [UserType.CLIENT]: '#3B82F6',
      [UserType.SERVICE_PROVIDER]: '#10B981',
      [UserType.GOVERNMENT]: '#8B5CF6',
      [UserType.ADMIN]: '#F59E0B',
    };
    return colors[role] || '#6B7280';
  };

  const getRoleIcon = (role) => {
    const icons = {
      [UserType.CLIENT]: 'person',
      [UserType.SERVICE_PROVIDER]: 'construct',
      [UserType.GOVERNMENT]: 'business',
      [UserType.ADMIN]: 'shield',
    };
    return icons[role] || 'person';
  };

  const StatCard = ({ title, value, change, icon, color, onPress }) => (
    <TouchableOpacity onPress={onPress}>
      <Animated.View 
        style={[
          styles.statCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={[color + '20', color + '10']}
          style={styles.statGradient}
        >
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: color + '30' }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={[
              styles.statChange,
              { color: change > 0 ? '#10B981' : change < 0 ? '#EF4444' : '#6B7280' }
            ]}>
              {change > 0 ? '+' : ''}{change}%
            </Text>
          </View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );

  const UserCard = ({ user, index }) => {
    const roleColor = getRoleColor(user.role);
    const roleIcon = getRoleIcon(user.role);

    return (
      <Animated.View
        style={[
          styles.userCard,
          {
            transform: [{
              translateX: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50 * (index + 1), 0],
              })
            }]
          }
        ]}
      >
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>
                {user.firstName} {user.lastName}
              </Text>
              {user.isPremium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userPhone}>{user.phone}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.userRole, { backgroundColor: roleColor + '20' }]}>
                <Ionicons name={roleIcon} size={12} color={roleColor} />
                <Text style={[styles.userRoleText, { color: roleColor }]}>
                  {user.role.replace('_', ' ')}
                </Text>
              </View>
              <Text style={styles.userCity}>{user.city}</Text>
              {user.suspended && (
                <Text style={styles.suspendedBadge}>Suspended</Text>
              )}
            </View>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Verification Status */}
        <View style={styles.verificationSection}>
          <Text style={styles.sectionLabel}>Verification Status</Text>
          <View style={styles.verificationGrid}>
            {Object.entries(VerificationType).map(([key, type]) => (
              <VerificationItem 
                key={type}
                label={getVerificationLabel(type)}
                verified={user.verifications?.[type] || false}
                onToggle={() => verifyUser(user.id, type, !user.verifications?.[type])}
              />
            ))}
          </View>
        </View>

        {/* Expanded Actions */}
        {selectedUser?.id === user.id && (
          <View style={styles.expandedActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.suspendButton]}
              onPress={() => suspendUser(user)}
            >
              <Ionicons 
                name={user.suspended ? "play-circle" : "pause-circle"} 
                size={20} 
                color={user.suspended ? "#10B981" : "#EF4444"} 
              />
              <Text style={[
                styles.actionText,
                { color: user.suspended ? "#10B981" : "#EF4444" }
              ]}>
                {user.suspended ? 'Unsuspend' : 'Suspend'}
              </Text>
            </TouchableOpacity>
            
            {user.role === UserType.SERVICE_PROVIDER && !user.isPremium && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.premiumButton]}
                onPress={() => upgradeToPremium(user)}
              >
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Text style={[styles.actionText, { color: '#F59E0B' }]}>
                  Make Premium
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#6B7280" />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="eye" size={20} color="#6B7280" />
              <Text style={styles.actionText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  };

  const VerificationItem = ({ label, verified, onToggle }) => (
    <TouchableOpacity 
      style={[styles.verificationItem, verified && styles.verifiedItem]}
      onPress={onToggle}
    >
      <Ionicons 
        name={verified ? "checkmark-circle" : "time-outline"} 
        size={16} 
        color={verified ? "#10B981" : "#6B7280"} 
      />
      <Text style={[
        styles.verificationText,
        verified && styles.verifiedText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ActivityItem = ({ activity, index }) => (
    <Animated.View
      style={[
        styles.activityItem,
        {
          transform: [{
            translateX: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30 * (index + 1), 0],
            })
          }]
        }
      ]}
    >
      <View style={[styles.activityIcon, { backgroundColor: getActivityColor(activity.type) }]}>
        <Ionicons name={getActivityIcon(activity.type)} size={16} color="#FFFFFF" />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>{activity.description}</Text>
        <Text style={styles.activityTime}>{activity.time}</Text>
        {activity.user && (
          <Text style={styles.activityUser}>
            {activity.user.role} • {activity.user.city}
          </Text>
        )}
      </View>
    </Animated.View>
  );

  const getActivityIcon = (type) => {
    const icons = {
      verification: 'shield-checkmark',
      suspension: 'pause-circle',
      registration: 'person-add',
      payment: 'card',
      report: 'flag',
      premium_upgrade: 'star',
      ai_assignment: 'construct',
      government_project: 'business',
      construction: 'hammer',
    };
    return icons[type] || 'notifications';
  };

  const getActivityColor = (type) => {
    const colors = {
      verification: '#10B981',
      suspension: '#EF4444',
      registration: '#3B82F6',
      payment: '#F59E0B',
      report: '#8B5CF6',
      premium_upgrade: '#F59E0B',
      ai_assignment: '#10B981',
      government_project: '#8B5CF6',
      construction: '#F59E0B',
    };
    return colors[type] || '#6B7280';
  };

  const TabButton = ({ title, isActive, onPress, count, icon }) => (
    <TouchableOpacity
      style={[styles.tab, isActive && styles.activeTab]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon} 
        size={16} 
        color={isActive ? '#FFFFFF' : '#9CA3AF'} 
        style={styles.tabIcon}
      />
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {title} {count ? `(${count})` : ''}
      </Text>
    </TouchableOpacity>
  );

  const AiProjectCard = ({ project, index }) => (
    <Animated.View
      style={[
        styles.projectCard,
        {
          transform: [{
            translateX: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30 * (index + 1), 0],
            })
          }]
        }
      ]}
    >
      <View style={styles.projectHeader}>
        <Text style={styles.projectTitle}>{project.name}</Text>
        <View style={[
          styles.projectStatus,
          { backgroundColor: project.status === 'completed' ? '#10B98120' : '#F59E0B20' }
        ]}>
          <Text style={[
            styles.projectStatusText,
            { color: project.status === 'completed' ? '#10B981' : '#F59E0B' }
          ]}>
            {project.status}
          </Text>
        </View>
      </View>
      <Text style={styles.projectType}>{project.type.replace('_', ' ')}</Text>
      <View style={styles.projectDetails}>
        <View style={styles.projectDetail}>
          <Ionicons name="people" size={14} color="#6B7280" />
          <Text style={styles.projectDetailText}>{project.workers} workers</Text>
        </View>
        <View style={styles.projectDetail}>
          <Ionicons name="calendar" size={14} color="#6B7280" />
          <Text style={styles.projectDetailText}>{project.duration} days</Text>
        </View>
        <View style={styles.projectDetail}>
          <Ionicons name="cash" size={14} color="#6B7280" />
          <Text style={styles.projectDetailText}>{project.budget} ETB</Text>
        </View>
      </View>
      <View style={styles.projectProgress}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${project.progress}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{project.progress}% complete</Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard 🇪🇹</Text>
            <Text style={styles.headerSubtitle}>Yachi Platform Management</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push('/admin/settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        {activeTab === 'overview' && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Platform Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Users"
                value={analytics.totalUsers || 0}
                change={analytics.userGrowth || 0}
                icon="people"
                color="#3B82F6"
                onPress={() => setActiveTab('users')}
              />
              <StatCard
                title="AI Projects"
                value={analytics.aiProjects || 0}
                change={analytics.projectGrowth || 0}
                icon="construct"
                color="#10B981"
                onPress={() => setActiveTab('projects')}
              />
              <StatCard
                title="Revenue (ETB)"
                value={`${paymentStats.revenue || 0}`}
                change={paymentStats.revenueGrowth || 0}
                icon="trending-up"
                color="#F59E0B"
              />
              <StatCard
                title="Active Bookings"
                value={analytics.activeBookings || 0}
                change={analytics.bookingGrowth || 0}
                icon="calendar"
                color="#8B5CF6"
              />
            </View>

            {/* AI Projects Section */}
            <View style={styles.projectsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent AI Construction Projects</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.projectsList}>
                  {aiProjects.map((project, index) => (
                    <AiProjectCard key={project.id} project={project} index={index} />
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TabButton
            title="Overview"
            isActive={activeTab === 'overview'}
            onPress={() => setActiveTab('overview')}
            icon="grid"
          />
          <TabButton
            title="Users"
            isActive={activeTab === 'users'}
            onPress={() => setActiveTab('users')}
            count={users.length}
            icon="people"
          />
          <TabButton
            title="Projects"
            isActive={activeTab === 'projects'}
            onPress={() => setActiveTab('projects')}
            count={aiProjects.length}
            icon="construct"
          />
          <TabButton
            title="Activities"
            isActive={activeTab === 'activities'}
            onPress={() => setActiveTab('activities')}
            icon="list"
          />
        </View>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <View style={styles.usersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>User Management</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="filter" size={16} color="#FFFFFF" />
                <Text style={styles.filterText}>Filter</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.usersList}>
              {users.map((user, index) => (
                <UserCard key={user.id} user={user} index={index} />
              ))}
            </View>
          </View>
        )}

        {activeTab === 'projects' && (
          <View style={styles.projectsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AI Construction Projects</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="filter" size={16} color="#FFFFFF" />
                <Text style={styles.filterText}>Filter</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.projectsGrid}>
              {aiProjects.map((project, index) => (
                <AiProjectCard key={project.id} project={project} index={index} />
              ))}
            </View>
          </View>
        )}

        {activeTab === 'activities' && (
          <View style={styles.activitiesSection}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <View style={styles.activitiesList}>
              {recentActivities.map((activity, index) => (
                <ActivityItem key={activity.id} activity={activity} index={index} />
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="download" size={24} color="#10B981" />
              <Text style={styles.quickActionText}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/admin/ai-matching')}
            >
              <Ionicons name="construct" size={24} color="#3B82F6" />
              <Text style={styles.quickActionText}>AI Matching</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/admin/government-projects')}
            >
              <Ionicons name="business" size={24} color="#F59E0B" />
              <Text style={styles.quickActionText}>Gov Projects</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="help-circle" size={24} color="#8B5CF6" />
              <Text style={styles.quickActionText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ethiopian Support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Ethiopian Support</Text>
          <Text style={styles.supportText}>
            Phone: +251 911 234 567 • Email: admin@yachi.com
          </Text>
          <Text style={styles.supportHours}>
            Available 24/7 for platform emergencies
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  viewAllText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  filterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statChange: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#10B981',
  },
  tabIcon: {
    marginRight: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  usersSection: {
    padding: 20,
  },
  usersList: {
    gap: 16,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  userEmail: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userRole: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userRoleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userCity: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suspendedBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userActions: {
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  verificationSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  verificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  verifiedItem: {
    backgroundColor: '#10B98120',
    borderColor: '#10B98140',
  },
  verificationText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  verifiedText: {
    color: '#10B981',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  suspendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  projectsSection: {
    padding: 20,
  },
  projectsList: {
    flexDirection: 'row',
    gap: 12,
  },
  projectsGrid: {
    gap: 12,
  },
  projectCard: {
    width: width - 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  projectStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  projectStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  projectType: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  projectDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  projectDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  projectProgress: {
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  activitiesSection: {
    padding: 20,
  },
  activitiesList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  activityUser: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  quickActionsSection: {
    padding: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (width - 52) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  supportSection: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
  },
  supportHours: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default AdminDashboard;