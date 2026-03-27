import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { TabView } from '../../components/ui/tabview';
import { Avatar } from '../../components/ui/avatar';
import { Rating } from '../../components/ui/rating';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { appService } from '../../services/app-service';
import { analyticsService } from '../../services/analytics-service';
import { formatters } from '../../utils/formatters';
import { appConstants } from '../../constants/app';

/**
 * About Screen - Company Profile & Information
 * 
 * Comprehensive about page showcasing company mission, team,
 * achievements, and contact information with interactive elements
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const AboutScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aboutData, setAboutData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('company');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);

  /**
   * Fetch about page data
   */
  const fetchAboutData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [companyData, teamData, achievementsData, statsData] = await Promise.all([
        appService.getCompanyInfo(),
        appService.getTeamMembers(),
        appService.getAchievements(),
        appService.getPlatformStatistics(),
      ]);

      setAboutData(companyData);
      setTeamMembers(teamData || []);
      setAchievements(achievementsData || []);
      setStatistics(statsData);

      // Track about page view
      analyticsService.trackScreenView('about', user?.id);
    } catch (error) {
      console.error('Failed to fetch about data:', error);
      Alert.alert('Error', 'Unable to load company information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  /**
   * Refresh data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAboutData();
  }, [fetchAboutData]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchAboutData();
  }, [fetchAboutData]);

  /**
   * Handle social media links
   */
  const handleSocialLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open this link.');
      }
    } catch (error) {
      console.error('Social link error:', error);
      Alert.alert('Error', 'Unable to open social media link.');
    }
  };

  /**
   * Handle contact actions
   */
  const handleContact = (type, value) => {
    switch (type) {
      case 'phone':
        Linking.openURL(`tel:${value}`).catch(() => {
          Alert.alert('Error', 'Unable to open phone app.');
        });
        break;
      case 'email':
        Linking.openURL(`mailto:${value}`).catch(() => {
          Alert.alert('Error', 'Unable to open email app.');
        });
        break;
      case 'location':
        // Open maps with company location
        const mapsUrl = Platform.select({
          ios: `maps:0,0?q=${encodeURIComponent(value)}`,
          android: `geo:0,0?q=${encodeURIComponent(value)}`,
        });
        Linking.openURL(mapsUrl).catch(() => {
          Alert.alert('Error', 'Unable to open maps.');
        });
        break;
      default:
        break;
    }
  };

  /**
   * Handle team member selection
   */
  const handleTeamMemberSelect = (member) => {
    setSelectedMember(member);
    setShowTeamModal(true);
  };

  /**
   * Render company tab
   */
  const renderCompanyTab = () => (
    <View style={styles.tabContent}>
      {/* Mission & Vision */}
      <Card style={styles.missionCard}>
        <ThemedText type="title" style={styles.sectionTitle}>
          Our Mission
        </ThemedText>
        <ThemedText type="default" style={styles.missionText}>
          {aboutData?.mission || 'Transforming service accessibility in Ethiopia through technology and innovation.'}
        </ThemedText>
        
        <View style={styles.divider} />
        
        <ThemedText type="title" style={styles.sectionTitle}>
          Our Vision
        </ThemedText>
        <ThemedText type="default" style={styles.visionText}>
          {aboutData?.vision || 'To become Ethiopia\'s leading platform connecting skilled professionals with clients, driving economic growth and digital transformation.'}
        </ThemedText>
      </Card>

      {/* Company Story */}
      <Card style={styles.storyCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Our Story
        </ThemedText>
        <ThemedText type="default" style={styles.storyText}>
          {aboutData?.story || `Founded in 2023, Yachi emerged from a simple observation: while Ethiopia is rich with skilled professionals and eager clients, connecting them efficiently remained a challenge. 

We built Yachi to bridge this gap, leveraging cutting-edge technology to create a seamless platform that empowers service providers and simplifies life for clients.

Today, we're proud to serve thousands of users across major Ethiopian cities, continuously innovating to improve our platform and expand our impact.`}
        </ThemedText>
      </Card>

      {/* Core Values */}
      <Card style={styles.valuesCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Core Values
        </ThemedText>
        <View style={styles.valuesList}>
          {aboutData?.values?.map((value, index) => (
            <View key={index} style={styles.valueItem}>
              <View style={styles.valueIcon}>
                <ThemedText type="defaultSemiBold" style={styles.valueEmoji}>
                  {value.emoji || '🌟'}
                </ThemedText>
              </View>
              <View style={styles.valueContent}>
                <ThemedText type="defaultSemiBold" style={styles.valueTitle}>
                  {value.title}
                </ThemedText>
                <ThemedText type="default" style={styles.valueDescription}>
                  {value.description}
                </ThemedText>
              </View>
            </View>
          )) || [
            { emoji: '🤝', title: 'Trust & Reliability', description: 'Building lasting relationships through transparent and dependable service' },
            { emoji: '🚀', title: 'Innovation', description: 'Continuously improving our platform with cutting-edge technology' },
            { emoji: '🌍', title: 'Local Impact', description: 'Empowering Ethiopian communities through economic opportunities' },
            { emoji: '⭐', title: 'Excellence', description: 'Setting the highest standards in service quality and user experience' },
          ].map((value, index) => (
            <View key={index} style={styles.valueItem}>
              <View style={styles.valueIcon}>
                <ThemedText type="defaultSemiBold" style={styles.valueEmoji}>
                  {value.emoji}
                </ThemedText>
              </View>
              <View style={styles.valueContent}>
                <ThemedText type="defaultSemiBold" style={styles.valueTitle}>
                  {value.title}
                </ThemedText>
                <ThemedText type="default" style={styles.valueDescription}>
                  {value.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );

  /**
   * Render team tab
   */
  const renderTeamTab = () => (
    <View style={styles.tabContent}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Meet Our Team
      </ThemedText>
      <ThemedText type="default" style={styles.teamDescription}>
        Passionate professionals dedicated to transforming service accessibility in Ethiopia
      </ThemedText>

      <View style={styles.teamGrid}>
        {teamMembers.map(member => (
          <Card 
            key={member.id}
            style={styles.teamCard}
            onPress={() => handleTeamMemberSelect(member)}
          >
            <Avatar
              source={member.avatar ? { uri: member.avatar } : null}
              size="large"
              style={styles.teamAvatar}
            />
            <View style={styles.teamInfo}>
              <ThemedText type="defaultSemiBold" style={styles.teamName}>
                {member.name}
              </ThemedText>
              <ThemedText type="default" style={styles.teamRole}>
                {member.role}
              </ThemedText>
              <ThemedText type="default" style={styles.teamBio} numberOfLines={2}>
                {member.bio}
              </ThemedText>
            </View>
          </Card>
        ))}
      </View>

      {/* Hiring Banner */}
      <Card style={styles.hiringCard}>
        <View style={styles.hiringContent}>
          <View style={styles.hiringText}>
            <ThemedText type="subtitle" style={styles.hiringTitle}>
              Join Our Team
            </ThemedText>
            <ThemedText type="default" style={styles.hiringDescription}>
              We're always looking for talented individuals to help us grow and innovate
            </ThemedText>
          </View>
          <Button
            title="View Openings"
            onPress={() => handleSocialLink(aboutData?.careersUrl || 'https://yachi.com/careers')}
            variant="primary"
            size="small"
          />
        </View>
      </Card>
    </View>
  );

  /**
   * Render achievements tab
   */
  const renderAchievementsTab = () => (
    <View style={styles.tabContent}>
      {/* Platform Statistics */}
      {statistics && (
        <Card style={styles.statsCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            By The Numbers
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                {formatters.formatNumber(statistics.totalUsers)}
              </ThemedText>
              <ThemedText type="default" style={styles.statLabel}>
                Happy Users
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                {formatters.formatNumber(statistics.completedBookings)}
              </ThemedText>
              <ThemedText type="default" style={styles.statLabel}>
                Services Booked
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                {formatters.formatNumber(statistics.serviceProviders)}
              </ThemedText>
              <ThemedText type="default" style={styles.statLabel}>
                Service Providers
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                {statistics.citiesCovered}+
              </ThemedText>
              <ThemedText type="default" style={styles.statLabel}>
                Cities Covered
              </ThemedText>
            </View>
          </View>
        </Card>
      )}

      {/* Achievements Timeline */}
      <Card style={styles.achievementsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Our Journey
        </ThemedText>
        <View style={styles.achievementsList}>
          {achievements.map((achievement, index) => (
            <View key={achievement.id} style={styles.achievementItem}>
              <View style={styles.achievementTimeline}>
                <View style={styles.achievementDot} />
                {index < achievements.length - 1 && (
                  <View style={styles.achievementLine} />
                )}
              </View>
              <View style={styles.achievementContent}>
                <ThemedText type="defaultSemiBold" style={styles.achievementTitle}>
                  {achievement.title}
                </ThemedText>
                <ThemedText type="default" style={styles.achievementDate}>
                  {formatters.formatDate(achievement.date)}
                </ThemedText>
                <ThemedText type="default" style={styles.achievementDescription}>
                  {achievement.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Awards & Recognition */}
      <Card style={styles.awardsCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Awards & Recognition
        </ThemedText>
        <View style={styles.awardsList}>
          {aboutData?.awards?.map((award, index) => (
            <View key={index} style={styles.awardItem}>
              <Badge
                text={award.year}
                color={colors.primary}
                size="small"
              />
              <View style={styles.awardContent}>
                <ThemedText type="defaultSemiBold" style={styles.awardTitle}>
                  {award.title}
                </ThemedText>
                <ThemedText type="default" style={styles.awardOrganization}>
                  {award.organization}
                </ThemedText>
              </View>
            </View>
          )) || (
            <ThemedText type="default" style={styles.emptyText}>
              Awards and recognition will be displayed here as we achieve them
            </ThemedText>
          )}
        </View>
      </Card>
    </View>
  );

  /**
   * Render contact tab
   */
  const renderContactTab = () => (
    <View style={styles.tabContent}>
      {/* Contact Information */}
      <Card style={styles.contactCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Get In Touch
        </ThemedText>
        
        <View style={styles.contactMethods}>
          <Button
            title={`Call: ${aboutData?.phone || '+251 11 123 4567'}`}
            onPress={() => handleContact('phone', aboutData?.phone || '+251111234567')}
            variant="outline"
            size="medium"
            icon="phone"
            style={styles.contactButton}
          />
          
          <Button
            title={`Email: ${aboutData?.email || 'hello@yachi.com'}`}
            onPress={() => handleContact('email', aboutData?.email || 'hello@yachi.com')}
            variant="outline"
            size="medium"
            icon="mail"
            style={styles.contactButton}
          />
          
          <Button
            title={`Visit: ${aboutData?.address || 'Addis Ababa, Ethiopia'}`}
            onPress={() => handleContact('location', aboutData?.address || 'Addis Ababa, Ethiopia')}
            variant="outline"
            size="medium"
            icon="map-pin"
            style={styles.contactButton}
          />
        </View>
      </Card>

      {/* Social Media */}
      <Card style={styles.socialCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Follow Us
        </ThemedText>
        
        <View style={styles.socialGrid}>
          <Button
            title="Facebook"
            onPress={() => handleSocialLink(aboutData?.facebookUrl || 'https://facebook.com/yachi')}
            variant="outline"
            size="small"
            icon="facebook"
            style={styles.socialButton}
          />
          
          <Button
            title="Telegram"
            onPress={() => handleSocialLink(aboutData?.telegramUrl || 'https://t.me/yachi')}
            variant="outline"
            size="small"
            icon="send"
            style={styles.socialButton}
          />
          
          <Button
            title="LinkedIn"
            onPress={() => handleSocialLink(aboutData?.linkedinUrl || 'https://linkedin.com/company/yachi')}
            variant="outline"
            size="small"
            icon="linkedin"
            style={styles.socialButton}
          />
          
          <Button
            title="Twitter"
            onPress={() => handleSocialLink(aboutData?.twitterUrl || 'https://twitter.com/yachi')}
            variant="outline"
            size="small"
            icon="twitter"
            style={styles.socialButton}
          />
        </View>
      </Card>

      {/* Business Hours */}
      <Card style={styles.hoursCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Business Hours
        </ThemedText>
        
        <View style={styles.hoursList}>
          <View style={styles.hourItem}>
            <ThemedText type="default">Monday - Friday</ThemedText>
            <ThemedText type="defaultSemiBold">8:30 AM - 6:30 PM</ThemedText>
          </View>
          <View style={styles.hourItem}>
            <ThemedText type="default">Saturday</ThemedText>
            <ThemedText type="defaultSemiBold">9:00 AM - 5:00 PM</ThemedText>
          </View>
          <View style={styles.hourItem}>
            <ThemedText type="default">Sunday</ThemedText>
            <ThemedText type="defaultSemiBold">Closed</ThemedText>
          </View>
        </View>
      </Card>

      {/* Newsletter Signup */}
      <Card style={styles.newsletterCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Stay Updated
        </ThemedText>
        <ThemedText type="default" style={styles.newsletterText}>
          Subscribe to our newsletter for updates and feature announcements
        </ThemedText>
        <Button
          title="Subscribe to Newsletter"
          onPress={() => navigation.navigate('NewsletterSignup')}
          variant="primary"
          size="medium"
          style={styles.newsletterButton}
        />
      </Card>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading company information..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            About Yachi
          </ThemedText>
          <ThemedText type="default" style={styles.headerSubtitle}>
            Transforming service accessibility in Ethiopia
          </ThemedText>
        </View>

        {/* Main Content Tabs */}
        <TabView
          tabs={[
            { key: 'company', title: 'Company' },
            { key: 'team', title: 'Team' },
            { key: 'achievements', title: 'Achievements' },
            { key: 'contact', title: 'Contact' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          style={styles.tabView}
        />

        {/* Tab Content */}
        <View style={styles.tabContainer}>
          {activeTab === 'company' && renderCompanyTab()}
          {activeTab === 'team' && renderTeamTab()}
          {activeTab === 'achievements' && renderAchievementsTab()}
          {activeTab === 'contact' && renderContactTab()}
        </View>
      </ScrollView>

      {/* Team Member Modal */}
      <Modal
        visible={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title="Team Member"
        size="medium"
      >
        {selectedMember && (
          <View style={styles.teamModalContent}>
            <Avatar
              source={selectedMember.avatar ? { uri: selectedMember.avatar } : null}
              size="xlarge"
              style={styles.modalAvatar}
            />
            <ThemedText type="title" style={styles.modalName}>
              {selectedMember.name}
            </ThemedText>
            <ThemedText type="default" style={styles.modalRole}>
              {selectedMember.role}
            </ThemedText>
            <ThemedText type="default" style={styles.modalBio}>
              {selectedMember.bio}
            </ThemedText>
            
            {selectedMember.socialLinks && (
              <View style={styles.modalSocial}>
                {selectedMember.socialLinks.map((link, index) => (
                  <Button
                    key={index}
                    title={link.platform}
                    onPress={() => handleSocialLink(link.url)}
                    variant="outline"
                    size="small"
                    style={styles.socialLinkButton}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
  },
  tabView: {
    marginHorizontal: 16,
  },
  tabContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 20,
  },
  missionCard: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  missionText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 8,
  },
  visionText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  storyCard: {
    gap: 12,
  },
  storyText: {
    lineHeight: 22,
    opacity: 0.8,
  },
  valuesCard: {
    gap: 16,
  },
  valuesList: {
    gap: 16,
  },
  valueItem: {
    flexDirection: 'row',
    gap: 12,
  },
  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueEmoji: {
    fontSize: 16,
  },
  valueContent: {
    flex: 1,
    gap: 4,
  },
  valueTitle: {
    fontSize: 16,
  },
  valueDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  teamDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
  },
  teamGrid: {
    gap: 12,
  },
  teamCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  teamAvatar: {
    alignSelf: 'flex-start',
  },
  teamInfo: {
    flex: 1,
    gap: 4,
  },
  teamName: {
    fontSize: 16,
  },
  teamRole: {
    fontSize: 14,
    opacity: 0.7,
  },
  teamBio: {
    fontSize: 12,
    opacity: 0.6,
    lineHeight: 16,
  },
  hiringCard: {
    backgroundColor: '#f0f9ff',
  },
  hiringContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hiringText: {
    flex: 1,
    gap: 4,
  },
  hiringTitle: {
    fontSize: 16,
  },
  hiringDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  statsCard: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.7,
  },
  achievementsCard: {
    gap: 16,
  },
  achievementsList: {
    gap: 0,
  },
  achievementItem: {
    flexDirection: 'row',
    gap: 16,
  },
  achievementTimeline: {
    alignItems: 'center',
    width: 24,
  },
  achievementDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  achievementLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 4,
  },
  achievementContent: {
    flex: 1,
    paddingBottom: 20,
    gap: 4,
  },
  achievementTitle: {
    fontSize: 16,
  },
  achievementDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  achievementDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
  },
  awardsCard: {
    gap: 16,
  },
  awardsList: {
    gap: 12,
  },
  awardItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  awardContent: {
    flex: 1,
    gap: 2,
  },
  awardTitle: {
    fontSize: 14,
  },
  awardOrganization: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    fontStyle: 'italic',
  },
  contactCard: {
    gap: 16,
  },
  contactMethods: {
    gap: 8,
  },
  contactButton: {
    justifyContent: 'flex-start',
  },
  socialCard: {
    gap: 16,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialButton: {
    flex: 1,
    minWidth: '45%',
  },
  hoursCard: {
    gap: 16,
  },
  hoursList: {
    gap: 8,
  },
  hourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  newsletterCard: {
    gap: 12,
    alignItems: 'center',
    textAlign: 'center',
  },
  newsletterText: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  newsletterButton: {
    marginTop: 8,
  },
  teamModalContent: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  modalAvatar: {
    marginBottom: 8,
  },
  modalName: {
    fontSize: 20,
    textAlign: 'center',
  },
  modalRole: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  modalBio: {
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  modalSocial: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  socialLinkButton: {
    flex: 1,
  },
});

export default AboutScreen;