import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  TextInput,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const AdminTable = ({ 
  data, 
  onVerify, 
  onSuspend, 
  onViewDetails, 
  onUpgradePremium,
  onAssignProject 
}) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [filterVerification, setFilterVerification] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Ethiopian cities for filtering
  const ethiopianCities = [
    'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Adama', 'Awassa', 
    'Bahir Dar', 'Gondar', 'Jimma', 'Jijiga', 'Harar'
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Filter and sort data for Ethiopian market
  const filteredData = data
    .filter(user => {
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesVerification = filterVerification === 'all' || 
        (filterVerification === 'verified' && user.isFullyVerified) ||
        (filterVerification === 'pending' && !user.isFullyVerified);
      const matchesCity = filterCity === 'all' || user.city === filterCity;
      const matchesSearch = 
        user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery);
      
      return matchesRole && matchesVerification && matchesCity && matchesSearch;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt' || sortBy === 'lastLogin') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortBy === 'name') {
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === filteredData.length
        ? []
        : filteredData.map(user => user.id)
    );
  };

  const handleBulkVerify = () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No Selection', 'Please select users to verify');
      return;
    }

    Alert.alert(
      'Bulk Verify',
      `Verify ${selectedUsers.length} selected users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Verify', 
          onPress: () => {
            selectedUsers.forEach(userId => onVerify(userId));
            
            // Track bulk action
            analyticsService.trackEvent('admin_bulk_verify', {
              count: selectedUsers.length,
              user_types: selectedUsers.map(id => 
                data.find(u => u.id === id)?.role
              ),
            });
            
            setSelectedUsers([]);
            Alert.alert('Success', `${selectedUsers.length} users verified`);
          }
        }
      ]
    );
  };

  const handleBulkSuspend = () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No Selection', 'Please select users to suspend');
      return;
    }

    Alert.alert(
      'Bulk Suspend',
      `Suspend ${selectedUsers.length} selected users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Suspend', 
          style: 'destructive',
          onPress: () => {
            selectedUsers.forEach(userId => onSuspend(userId));
            
            analyticsService.trackEvent('admin_bulk_suspend', {
              count: selectedUsers.length,
              user_types: selectedUsers.map(id => 
                data.find(u => u.id === id)?.role
              ),
            });
            
            setSelectedUsers([]);
            Alert.alert('Suspended', `${selectedUsers.length} users suspended`);
          }
        }
      ]
    );
  };

  const handleBulkUpgradePremium = () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No Selection', 'Please select service providers to upgrade');
      return;
    }

    const serviceProviders = selectedUsers.filter(id => 
      data.find(u => u.id === id)?.role === UserType.SERVICE_PROVIDER
    );

    if (serviceProviders.length === 0) {
      Alert.alert('Invalid Selection', 'Please select service providers only');
      return;
    }

    Alert.alert(
      'Bulk Premium Upgrade',
      `Upgrade ${serviceProviders.length} service providers to premium? (200 ETB/month)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upgrade', 
          onPress: () => {
            serviceProviders.forEach(userId => onUpgradePremium(userId));
            
            analyticsService.trackEvent('admin_bulk_premium_upgrade', {
              count: serviceProviders.length,
            });
            
            setSelectedUsers([]);
            Alert.alert('Success', `${serviceProviders.length} providers upgraded to premium`);
          }
        }
      ]
    );
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

  const VerificationBadge = ({ user }) => {
    const isFullyVerified = user.isFullyVerified;
    const verifiedCount = Object.values(user.verifications || {}).filter(Boolean).length;
    const totalVerifications = Object.keys(VerificationType).length;

    return (
      <TouchableOpacity 
        style={[
          styles.verificationBadge,
          isFullyVerified ? styles.verified : styles.pending
        ]}
        onPress={() => onViewDetails(user)}
      >
        <Ionicons 
          name={isFullyVerified ? "shield-checkmark" : "shield-half"} 
          size={12} 
          color="#FFFFFF" 
        />
        <Text style={styles.verificationText}>
          {isFullyVerified ? 'Verified' : `${verifiedCount}/${totalVerifications}`}
        </Text>
      </TouchableOpacity>
    );
  };

  const DocumentStatus = ({ user }) => {
    const hasDocuments = Object.values(user.documents || {}).some(Boolean);
    
    return (
      <View style={styles.documentStatus}>
        {hasDocuments ? (
          <TouchableOpacity 
            style={styles.documentLink}
            onPress={() => onViewDetails(user)}
          >
            <Ionicons name="document-text" size={16} color="#3B82F6" />
            <Text style={styles.documentText}>View Docs</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noDocument}>No Docs</Text>
        )}
      </View>
    );
  };

  const UserRow = ({ user, index }) => {
    const roleColor = getRoleColor(user.role);
    const roleIcon = getRoleIcon(user.role);

    return (
      <Animated.View
        style={[
          styles.userRow,
          {
            opacity: fadeAnim,
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30 * (index + 1), 0],
              })
            }]
          }
        ]}
      >
        {/* Selection Checkbox */}
        <TouchableOpacity 
          style={styles.checkbox}
          onPress={() => toggleUserSelection(user.id)}
        >
          <Ionicons 
            name={selectedUsers.includes(user.id) ? "checkbox" : "square-outline"} 
            size={20} 
            color={selectedUsers.includes(user.id) ? "#10B981" : "#6B7280"} 
          />
        </TouchableOpacity>

        {/* User Avatar and Basic Info */}
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => onViewDetails(user)}
        >
          <View style={styles.avatar}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: roleColor + '20' }]}>
                <Ionicons name={roleIcon} size={16} color={roleColor} />
              </View>
            )}
          </View>
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.firstName} {user.lastName}
              </Text>
              {user.isPremium && (
                <Ionicons name="star" size={12} color="#F59E0B" />
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
            <Text style={styles.userPhone}>{user.phone}</Text>
          </View>
        </TouchableOpacity>

        {/* Role Badge */}
        <View style={styles.roleCell}>
          <View style={[
            styles.roleBadge,
            { backgroundColor: roleColor + '20' }
          ]}>
            <Ionicons name={roleIcon} size={12} color={roleColor} />
            <Text style={[styles.roleText, { color: roleColor }]}>
              {user.role.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* City */}
        <View style={styles.cityCell}>
          <Text style={styles.cityText} numberOfLines={1}>
            {user.city || 'Not set'}
          </Text>
        </View>

        {/* Verification Status */}
        <View style={styles.verificationCell}>
          <VerificationBadge user={user} />
        </View>

        {/* Document Status */}
        <View style={styles.documentCell}>
          <DocumentStatus user={user} />
        </View>

        {/* Last Active */}
        <View style={styles.activeCell}>
          <Text style={styles.activeText}>
            {user.lastLogin ? formatLastActive(user.lastLogin) : 'Never'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsCell}>
          {user.role === UserType.SERVICE_PROVIDER && !user.isFullyVerified && (
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={() => onVerify(user.id)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {user.role === UserType.SERVICE_PROVIDER && !user.isPremium && (
            <TouchableOpacity 
              style={styles.premiumButton}
              onPress={() => onUpgradePremium(user.id)}
            >
              <Ionicons name="star" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {user.role === UserType.SERVICE_PROVIDER && user.isFullyVerified && (
            <TouchableOpacity 
              style={styles.projectButton}
              onPress={() => onAssignProject(user.id)}
            >
              <Ionicons name="construct" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => onViewDetails(user)}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const formatLastActive = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return `${Math.floor(diffHours / 168)}w ago`;
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <TouchableOpacity style={styles.headerCheckbox} onPress={toggleSelectAll}>
        <Ionicons 
          name={selectedUsers.length === filteredData.length ? "checkbox" : "square-outline"} 
          size={20} 
          color="#6B7280" 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.headerCell}
        onPress={() => {
          setSortBy('name');
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }}
      >
        <Text style={styles.headerText}>User</Text>
        <Ionicons 
          name={sortOrder === 'asc' ? "chevron-up" : "chevron-down"} 
          size={16} 
          color="#6B7280" 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.headerCell}
        onPress={() => {
          setSortBy('role');
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }}
      >
        <Text style={styles.headerText}>Role</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.headerCell}
        onPress={() => {
          setSortBy('city');
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }}
      >
        <Text style={styles.headerText}>City</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.headerCell}
        onPress={() => {
          setSortBy('isFullyVerified');
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }}
      >
        <Text style={styles.headerText}>Verification</Text>
      </TouchableOpacity>

      <View style={styles.headerCell}>
        <Text style={styles.headerText}>Documents</Text>
      </View>

      <TouchableOpacity 
        style={styles.headerCell}
        onPress={() => {
          setSortBy('lastLogin');
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }}
      >
        <Text style={styles.headerText}>Last Active</Text>
      </TouchableOpacity>

      <View style={styles.headerCell}>
        <Text style={styles.headerText}>Actions</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Filters and Search */}
      <View style={styles.controlsSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filters}>
              <TouchableOpacity
                style={[styles.filterButton, filterRole === 'all' && styles.activeFilter]}
                onPress={() => setFilterRole('all')}
              >
                <Text style={[styles.filterText, filterRole === 'all' && styles.activeFilterText]}>
                  All Roles
                </Text>
              </TouchableOpacity>
              
              {Object.entries(UserType).map(([key, role]) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.filterButton, filterRole === role && styles.activeFilter]}
                  onPress={() => setFilterRole(role)}
                >
                  <Text style={[styles.filterText, filterRole === role && styles.activeFilterText]}>
                    {role.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.filterButton, filterVerification === 'pending' && styles.activeFilter]}
                onPress={() => setFilterVerification('pending')}
              >
                <Text style={[styles.filterText, filterVerification === 'pending' && styles.activeFilterText]}>
                  Pending Verification
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterButton, filterVerification === 'verified' && styles.activeFilter]}
                onPress={() => setFilterVerification('verified')}
              >
                <Text style={[styles.filterText, filterVerification === 'verified' && styles.activeFilterText]}>
                  Verified
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterButton, filterCity === 'all' && styles.activeFilter]}
                onPress={() => setFilterCity('all')}
              >
                <Text style={[styles.filterText, filterCity === 'all' && styles.activeFilterText]}>
                  All Cities
                </Text>
              </TouchableOpacity>

              {ethiopianCities.slice(0, 3).map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.filterButton, filterCity === city && styles.activeFilter]}
                  onPress={() => setFilterCity(city)}
                >
                  <Text style={[styles.filterText, filterCity === city && styles.activeFilterText]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <View style={styles.bulkActions}>
            <Text style={styles.bulkActionText}>
              {selectedUsers.length} users selected
            </Text>
            <View style={styles.bulkButtons}>
              <TouchableOpacity 
                style={[styles.bulkButton, styles.verifyBulk]}
                onPress={handleBulkVerify}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.bulkButtonText}>Verify</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.bulkButton, styles.premiumBulk]}
                onPress={handleBulkUpgradePremium}
              >
                <Ionicons name="star" size={16} color="#FFFFFF" />
                <Text style={styles.bulkButtonText}>Upgrade Premium</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.bulkButton, styles.suspendBulk]}
                onPress={handleBulkSuspend}
              >
                <Ionicons name="pause-circle" size={16} color="#FFFFFF" />
                <Text style={styles.bulkButtonText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Table */}
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tableContainer}
      >
        <View>
          <TableHeader />
          <ScrollView 
            style={styles.tableBody}
            showsVerticalScrollIndicator={false}
          >
            {filteredData.map((user, index) => (
              <UserRow key={user.id} user={user} index={index} />
            ))}
            
            {filteredData.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search criteria or filters
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Table Summary */}
      <View style={styles.tableSummary}>
        <Text style={styles.summaryText}>
          Showing {filteredData.length} of {data.length} users
        </Text>
        <View style={styles.summaryStats}>
          {selectedUsers.length > 0 && (
            <Text style={styles.selectionText}>
              {selectedUsers.length} selected
            </Text>
          )}
          <Text style={styles.statsText}>
            • {data.filter(u => u.role === UserType.SERVICE_PROVIDER).length} providers
          </Text>
          <Text style={styles.statsText}>
            • {data.filter(u => u.isPremium).length} premium
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  controlsSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  filterRow: {
    marginBottom: 8,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilter: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  bulkActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyBulk: {
    backgroundColor: '#10B981',
  },
  premiumBulk: {
    backgroundColor: '#F59E0B',
  },
  suspendBulk: {
    backgroundColor: '#EF4444',
  },
  bulkButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minWidth: 1000,
  },
  headerCheckbox: {
    width: 40,
    alignItems: 'center',
  },
  headerCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    minWidth: 120,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    minWidth: 1000,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    width: 40,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    minWidth: 200,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  roleCell: {
    flex: 1,
    paddingHorizontal: 8,
    minWidth: 120,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cityCell: {
    flex: 1,
    paddingHorizontal: 8,
    minWidth: 100,
  },
  cityText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  verificationCell: {
    flex: 1,
    paddingHorizontal: 8,
    minWidth: 100,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verified: {
    backgroundColor: '#10B981',
  },
  pending: {
    backgroundColor: '#F59E0B',
  },
  verificationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  documentCell: {
    flex: 1,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  documentStatus: {
    alignSelf: 'flex-start',
  },
  documentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  documentText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  noDocument: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  activeCell: {
    flex: 1,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  activeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionsCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    minWidth: 120,
  },
  verifyButton: {
    backgroundColor: '#10B981',
    padding: 6,
    borderRadius: 6,
  },
  premiumButton: {
    backgroundColor: '#F59E0B',
    padding: 6,
    borderRadius: 6,
  },
  projectButton: {
    backgroundColor: '#8B5CF6',
    padding: 6,
    borderRadius: 6,
  },
  moreButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    minWidth: 1000,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  tableSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  statsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default AdminTable;