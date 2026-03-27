import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const GovernmentScreen = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pendingApplications: 24,
    approvedThisMonth: 156,
    siteInspections: 89,
    violations: 12,
  });

  const [recentActivities, setRecentActivities] = useState([
    {
      id: 1,
      type: 'permit_approval',
      title: 'Building Permit Approved',
      description: 'Commercial complex in Bole area',
      agency: 'Addis Ababa City Administration',
      time: '2 hours ago',
      status: 'approved',
    },
    {
      id: 2,
      type: 'inspection',
      title: 'Site Inspection Scheduled',
      description: 'Residential building in Kirkos',
      agency: 'Construction Regulation Office',
      time: '1 day ago',
      status: 'pending',
    },
    {
      id: 3,
      type: 'violation',
      title: 'Safety Violation Reported',
      description: 'Missing safety equipment at site',
      agency: 'Occupational Safety Authority',
      time: '2 days ago',
      status: 'rejected',
    },
    {
      id: 4,
      type: 'certificate',
      title: 'Completion Certificate Issued',
      description: 'Public school construction',
      agency: 'Ministry of Education',
      time: '1 week ago',
      status: 'approved',
    },
  ]);

  const [quickActions] = useState([
    {
      id: 1,
      title: 'Review Permits',
      icon: 'document-text',
      color: '#4CAF50',
      route: '/government/permits',
    },
    {
      id: 2,
      title: 'Schedule Inspection',
      icon: 'search',
      color: '#2196F3',
      route: '/government/inspections',
    },
    {
      id: 3,
      title: 'Issue Certificates',
      icon: 'award',
      color: '#FF9800',
      route: '/government/certificates',
    },
    {
      id: 4,
      title: 'Violation Reports',
      icon: 'warning',
      color: '#F44336',
      route: '/government/violations',
    },
    {
      id: 5,
      title: 'Analytics',
      icon: 'bar-chart',
      color: '#9C27B0',
      route: '/government/analytics',
    },
    {
      id: 6,
      title: 'Regulations',
      icon: 'book',
      color: '#607D8B',
      route: '/government/regulations',
    },
  ]);

  const [agencies] = useState([
    {
      id: 1,
      name: 'Addis Ababa City Admin',
      logo: '🏛️',
      applications: 245,
    },
    {
      id: 2,
      name: 'Ethiopian Roads Authority',
      logo: '🛣️',
      applications: 189,
    },
    {
      id: 3,
      name: 'Ministry of Urban Development',
      logo: '🏢',
      applications: 156,
    },
    {
      id: 4,
      name: 'Environmental Protection',
      logo: '🌳',
      applications: 98,
    },
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const renderStatCard = (title, value, icon, color) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderActivityItem = (item) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'approved': return '#4CAF50';
        case 'pending': return '#FF9800';
        case 'rejected': return '#F44336';
        default: return '#9E9E9E';
      }
    };

    const getIcon = (type) => {
      switch (type) {
        case 'permit_approval': return 'document-text';
        case 'inspection': return 'search';
        case 'violation': return 'warning';
        case 'certificate': return 'award';
        default: return 'notifications';
      }
    };

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.activityItem}
        onPress={() => router.push(`/government/activity/${item.id}`)}
      >
        <View style={styles.activityIconContainer}>
          <Ionicons name={getIcon(item.type)} size={20} color="#2196F3" />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activityDescription}>{item.description}</Text>
          <View style={styles.activityFooter}>
            <Text style={styles.activityAgency}>{item.agency}</Text>
            <Text style={styles.activityTime}>{item.time}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1a237e', '#283593']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>እንኳን ደህና መጡ</Text>
            <Text style={styles.title}>Government Portal</Text>
            <Text style={styles.subtitle}>Construction Regulation & Compliance</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={40} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.sectionSubtitle}>This Month</Text>
          </View>
          <View style={styles.statsGrid}>
            {renderStatCard('Pending Apps', stats.pendingApplications, 'time', '#FF9800')}
            {renderStatCard('Approved', stats.approvedThisMonth, 'checkmark-circle', '#4CAF50')}
            {renderStatCard('Inspections', stats.siteInspections, 'search', '#2196F3')}
            {renderStatCard('Violations', stats.violations, 'warning', '#F44336')}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => router.push(action.route)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity onPress={() => router.push('/government/activities')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activitiesList}>
            {recentActivities.map(renderActivityItem)}
          </View>
        </View>

        {/* Agencies */}
        <View style={styles.agenciesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Agencies</Text>
            <TouchableOpacity onPress={() => router.push('/government/agencies')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {agencies.map((agency) => (
              <View key={agency.id} style={styles.agencyCard}>
                <Text style={styles.agencyLogo}>{agency.logo}</Text>
                <Text style={styles.agencyName}>{agency.name}</Text>
                <Text style={styles.agencyStats}>{agency.applications} Applications</Text>
                <TouchableOpacity style={styles.viewAgencyButton}>
                  <Text style={styles.viewAgencyText}>View Details</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Emergency Section */}
        <View style={styles.emergencySection}>
          <LinearGradient
            colors={['#d32f2f', '#f44336']}
            style={styles.emergencyCard}
          >
            <View style={styles.emergencyContent}>
              <MaterialIcons name="warning" size={40} color="#fff" />
              <View style={styles.emergencyTextContainer}>
                <Text style={styles.emergencyTitle}>Emergency Report</Text>
                <Text style={styles.emergencySubtitle}>Report urgent safety violations</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => router.push('/government/emergency')}
            >
              <Text style={styles.emergencyButtonText}>REPORT NOW</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'AmharicFont', // You'll need to add Amharic font
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  profileButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  seeAllText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  activitiesSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  activitiesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityAgency: {
    fontSize: 11,
    color: '#888',
  },
  activityTime: {
    fontSize: 11,
    color: '#888',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  agenciesSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  agencyCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agencyLogo: {
    fontSize: 40,
    marginBottom: 10,
  },
  agencyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  agencyStats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  viewAgencyButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAgencyText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
  emergencySection: {
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  emergencyCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emergencyTextContainer: {
    marginLeft: 15,
  },
  emergencyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emergencySubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
  },
});

export default GovernmentScreen;