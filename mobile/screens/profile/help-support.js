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
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { TabView } from '../../components/ui/tabview';
import { Avatar } from '../../components/ui/avatar';
import { Rating } from '../../components/ui/rating';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { supportService } from '../../services/support-service';
import { analyticsService } from '../../services/analytics-service';
import { notificationService } from '../../services/notification-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { appConstants } from '../../constants/app';

/**
 * Help & Support Screen
 * 
 * Comprehensive help center with FAQ, live support, ticket management,
 * and self-service resources for all user types
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const HelpSupportScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('help');
  const [faqData, setFaqData] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportAgents, setSupportAgents] = useState([]);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [ticketForm, setTicketForm] = useState({});
  const [contactForm, setContactForm] = useState({});

  // Support categories configuration
  const supportCategories = {
    general: {
      title: 'General Support',
      icon: 'help-circle',
      description: 'General platform questions and issues',
      responseTime: '2-4 hours',
    },
    technical: {
      title: 'Technical Issues',
      icon: 'settings',
      description: 'App crashes, bugs, and technical problems',
      responseTime: '1-2 hours',
    },
    billing: {
      title: 'Billing & Payments',
      icon: 'credit-card',
      description: 'Payment issues, refunds, and billing questions',
      responseTime: '4-6 hours',
    },
    account: {
      title: 'Account Management',
      icon: 'user',
      description: 'Account access, verification, and profile issues',
      responseTime: '2-4 hours',
    },
    services: {
      title: 'Service Issues',
      icon: 'tool',
      description: 'Service booking, cancellations, and provider issues',
      responseTime: '1-3 hours',
    },
    safety: {
      title: 'Safety & Trust',
      icon: 'shield',
      description: 'Safety concerns, disputes, and trust issues',
      responseTime: 'Immediate',
    },
  };

  /**
   * Fetch help and support data
   */
  const fetchSupportData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [faq, tickets, agents, knowledge] = await Promise.all([
        supportService.getFAQ(),
        supportService.getUserTickets(user.id),
        supportService.getSupportAgents(),
        supportService.getKnowledgeBase(),
      ]);

      setFaqData(faq || []);
      setSupportTickets(tickets || []);
      setSupportAgents(agents || []);
      setKnowledgeBase(knowledge || []);

      // Track support page view
      analyticsService.trackScreenView('help_support', user.id);
    } catch (error) {
      console.error('Failed to fetch support data:', error);
      Alert.alert('Error', 'Unable to load help and support information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  /**
   * Refresh data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSupportData();
  }, [fetchSupportData]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchSupportData();
  }, [fetchSupportData]);

  /**
   * Submit support ticket
   */
  const handleSubmitTicket = async () => {
    try {
      setSubmitting(true);

      const ticketData = {
        ...ticketForm,
        category: selectedCategory,
        userId: user.id,
        userRole: user.role,
        status: 'open',
        priority: getTicketPriority(selectedCategory),
        createdAt: new Date().toISOString(),
      };

      const result = await supportService.createSupportTicket(ticketData);

      if (result.success) {
        setSupportTickets(prev => [result.ticket, ...prev]);
        setShowTicketModal(false);
        setTicketForm({});
        
        Alert.alert('Success', 'Support ticket submitted successfully. We will get back to you soon.');
        
        // Track ticket creation
        analyticsService.trackSupportTicketCreated(selectedCategory, user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ticket submission failed:', error);
      Alert.alert('Submission Failed', error.message || 'Unable to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Submit contact form
   */
  const handleContactSupport = async () => {
    try {
      setSubmitting(true);

      const contactData = {
        ...contactForm,
        userId: user.id,
        userRole: user.role,
        submittedAt: new Date().toISOString(),
      };

      const result = await supportService.submitContactForm(contactData);

      if (result.success) {
        setShowContactModal(false);
        setContactForm({});
        
        Alert.alert('Success', 'Your message has been sent. We will respond within 24 hours.');
        
        // Track contact form submission
        analyticsService.trackContactFormSubmitted(user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Contact form submission failed:', error);
      Alert.alert('Submission Failed', error.message || 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle live chat
   */
  const handleLiveChat = async () => {
    try {
      const chatResult = await supportService.startLiveChat(user.id);

      if (chatResult.success) {
        navigation.navigate('LiveChat', { 
          sessionId: chatResult.sessionId,
          agent: chatResult.agent 
        });
      } else {
        throw new Error(chatResult.message);
      }
    } catch (error) {
      console.error('Live chat failed:', error);
      Alert.alert('Chat Unavailable', 'Live chat is currently unavailable. Please try another support method.');
    }
  };

  /**
   * Handle phone support
   */
  const handlePhoneSupport = () => {
    Linking.openURL(`tel:${appConstants.SUPPORT_PHONE}`).catch(() => {
      Alert.alert('Error', 'Unable to open phone app.');
    });
  };

  /**
   * Handle email support
   */
  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${appConstants.SUPPORT_EMAIL}?subject=Support Request&body=User ID: ${user.id}`).catch(() => {
      Alert.alert('Error', 'Unable to open email app.');
    });
  };

  /**
   * Get ticket priority based on category
   */
  const getTicketPriority = (category) => {
    const priorityMap = {
      safety: 'high',
      technical: 'medium',
      billing: 'medium',
      services: 'medium',
      account: 'low',
      general: 'low',
    };
    
    return priorityMap[category] || 'low';
  };

  /**
   * Get ticket status color
   */
  const getTicketStatusColor = (status) => {
    const statusColors = {
      open: colors.primary,
      'in-progress': colors.warning,
      resolved: colors.success,
      closed: colors.success,
      escalated: colors.error,
    };
    
    return statusColors[status] || colors.default;
  };

  /**
   * Filter FAQ by search query
   */
  const getFilteredFAQ = () => {
    if (!searchQuery) return faqData;

    return faqData.filter(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  /**
   * Render help tab
   */
  const renderHelpTab = () => (
    <View style={styles.tabContent}>
      {/* Quick Support Options */}
      <Card style={styles.quickSupportCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quick Support
        </ThemedText>
        <ThemedText type="default" style={styles.sectionDescription}>
          Get help quickly through these options
        </ThemedText>

        <View style={styles.quickSupportGrid}>
          <Button
            title="Live Chat"
            onPress={handleLiveChat}
            variant="primary"
            size="medium"
            icon="message-circle"
            style={styles.quickSupportButton}
          />
          
          <Button
            title="Call Support"
            onPress={handlePhoneSupport}
            variant="outline"
            size="medium"
            icon="phone"
            style={styles.quickSupportButton}
          />
          
          <Button
            title="Email Us"
            onPress={handleEmailSupport}
            variant="outline"
            size="medium"
            icon="mail"
            style={styles.quickSupportButton}
          />
          
          <Button
            title="Create Ticket"
            onPress={() => setShowTicketModal(true)}
            variant="outline"
            size="medium"
            icon="plus"
            style={styles.quickSupportButton}
          />
        </View>
      </Card>

      {/* FAQ Search */}
      <Card style={styles.searchCard}>
        <Input
          placeholder="Search help articles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon="search"
          clearButtonMode="while-editing"
        />
      </Card>

      {/* FAQ Categories */}
      <Card style={styles.categoriesCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Help Categories
        </ThemedText>
        
        <View style={styles.categoriesGrid}>
          {Object.entries(supportCategories).map(([key, category]) => (
            <Card 
              key={key}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('FAQCategory', { category: key })}
            >
              <View style={styles.categoryIcon}>
                {/* Icon would be rendered here */}
              </View>
              <ThemedText type="defaultSemiBold" style={styles.categoryTitle}>
                {category.title}
              </ThemedText>
              <ThemedText type="default" style={styles.categoryDescription}>
                {category.description}
              </ThemedText>
              <ThemedText type="default" style={styles.responseTime}>
                Avg. response: {category.responseTime}
              </ThemedText>
            </Card>
          ))}
        </View>
      </Card>

      {/* Popular Articles */}
      <Card style={styles.popularCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Popular Help Articles
        </ThemedText>
        
        <View style={styles.articlesList}>
          {knowledgeBase.slice(0, 5).map(article => (
            <Card 
              key={article.id}
              style={styles.articleCard}
              onPress={() => navigation.navigate('Article', { articleId: article.id })}
            >
              <View style={styles.articleHeader}>
                <ThemedText type="defaultSemiBold" style={styles.articleTitle}>
                  {article.title}
                </ThemedText>
                <Badge
                  text={article.category}
                  color={colors.primary}
                  size="small"
                />
              </View>
              <ThemedText type="default" style={styles.articleDescription}>
                {article.description}
              </ThemedText>
              <View style={styles.articleMeta}>
                <ThemedText type="default" style={styles.articleViews}>
                  👁️ {article.views} views
                </ThemedText>
                <ThemedText type="default" style={styles.articleRating}>
                  ⭐ {article.rating}/5
                </ThemedText>
              </View>
            </Card>
          ))}
        </View>
      </Card>
    </View>
  );

  /**
   * Render tickets tab
   */
  const renderTicketsTab = () => (
    <View style={styles.tabContent}>
      {/* Tickets Header */}
      <Card style={styles.ticketsHeaderCard}>
        <View style={styles.ticketsHeader}>
          <View style={styles.ticketsInfo}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              My Support Tickets
            </ThemedText>
            <ThemedText type="default" style={styles.ticketsCount}>
              {supportTickets.length} ticket(s)
            </ThemedText>
          </View>
          <Button
            title="New Ticket"
            onPress={() => setShowTicketModal(true)}
            variant="primary"
            size="small"
            icon="plus"
          />
        </View>
      </Card>

      {/* Tickets List */}
      <View style={styles.ticketsList}>
        {supportTickets.length > 0 ? (
          supportTickets.map(ticket => (
            <Card key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={styles.ticketInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.ticketTitle}>
                    {ticket.subject}
                  </ThemedText>
                  <ThemedText type="default" style={styles.ticketCategory}>
                    {supportCategories[ticket.category]?.title || ticket.category}
                  </ThemedText>
                </View>
                <Badge
                  text={ticket.status}
                  color={getTicketStatusColor(ticket.status)}
                  size="small"
                />
              </View>

              <ThemedText type="default" style={styles.ticketDescription}>
                {ticket.description}
              </ThemedText>

              <View style={styles.ticketMeta}>
                <ThemedText type="default" style={styles.ticketDate}>
                  Created: {formatters.formatDate(ticket.createdAt)}
                </ThemedText>
                <ThemedText type="default" style={styles.ticketId}>
                  #{ticket.id.slice(-8)}
                </ThemedText>
              </View>

              {ticket.assignedAgent && (
                <View style={styles.assignedAgent}>
                  <Avatar
                    source={ticket.assignedAgent.avatar ? { uri: ticket.assignedAgent.avatar } : null}
                    size="small"
                  />
                  <ThemedText type="default" style={styles.agentName}>
                    Assigned to: {ticket.assignedAgent.name}
                  </ThemedText>
                </View>
              )}

              <View style={styles.ticketActions}>
                <Button
                  title="View Details"
                  onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                  variant="outline"
                  size="small"
                />
                {ticket.status === 'open' && (
                  <Button
                    title="Add Update"
                    onPress={() => navigation.navigate('TicketUpdate', { ticketId: ticket.id })}
                    variant="outline"
                    size="small"
                  />
                )}
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyTickets}>
            <ThemedText type="title" style={styles.emptyTitle}>
              No Support Tickets
            </ThemedText>
            <ThemedText type="default" style={styles.emptyText}>
              You haven't created any support tickets yet
            </ThemedText>
            <Button
              title="Create First Ticket"
              onPress={() => setShowTicketModal(true)}
              variant="primary"
              style={styles.emptyButton}
            />
          </Card>
        )}
      </View>
    </View>
  );

  /**
   * Render resources tab
   */
  const renderResourcesTab = () => (
    <View style={styles.tabContent}>
      {/* Video Tutorials */}
      <Card style={styles.resourcesCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Video Tutorials
        </ThemedText>
        
        <View style={styles.videoGrid}>
          {[
            { title: 'Getting Started Guide', duration: '5:30', views: '1.2K' },
            { title: 'Booking Services', duration: '7:15', views: '2.4K' },
            { title: 'Managing Your Profile', duration: '4:20', views: '0.8K' },
            { title: 'Payment Methods', duration: '6:45', views: '1.5K' },
          ].map((video, index) => (
            <Card key={index} style={styles.videoCard}>
              <View style={styles.videoThumbnail}>
                <ThemedText type="default" style={styles.playIcon}>
                  ▶
                </ThemedText>
              </View>
              <View style={styles.videoInfo}>
                <ThemedText type="defaultSemiBold" style={styles.videoTitle}>
                  {video.title}
                </ThemedText>
                <ThemedText type="default" style={styles.videoMeta}>
                  {video.duration} • {video.views} views
                </ThemedText>
              </View>
            </Card>
          ))}
        </View>
      </Card>

      {/* Documentation */}
      <Card style={styles.documentationCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Documentation
        </ThemedText>
        
        <View style={styles.documentationList}>
          {[
            { title: 'User Guide PDF', size: '2.4 MB', pages: 24 },
            { title: 'Service Provider Handbook', size: '3.1 MB', pages: 32 },
            { title: 'API Documentation', size: '1.8 MB', pages: 18 },
            { title: 'Safety Guidelines', size: '1.2 MB', pages: 12 },
          ].map((doc, index) => (
            <Card key={index} style={styles.documentCard}>
              <View style={styles.documentIcon}>
                <ThemedText type="default">📄</ThemedText>
              </View>
              <View style={styles.documentInfo}>
                <ThemedText type="defaultSemiBold" style={styles.documentTitle}>
                  {doc.title}
                </ThemedText>
                <ThemedText type="default" style={styles.documentMeta}>
                  {doc.size} • {doc.pages} pages
                </ThemedText>
              </View>
              <Button
                title="Download"
                onPress={() => {}}
                variant="outline"
                size="small"
              />
            </Card>
          ))}
        </View>
      </Card>

      {/* Community Resources */}
      <Card style={styles.communityCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Community & Social
        </ThemedText>
        
        <View style={styles.communityGrid}>
          <Button
            title="User Forum"
            onPress={() => Linking.openURL('https://community.yachi.com')}
            variant="outline"
            size="medium"
            icon="users"
            style={styles.communityButton}
          />
          
          <Button
            title="Facebook Group"
            onPress={() => Linking.openURL('https://facebook.com/groups/yachi')}
            variant="outline"
            size="medium"
            icon="facebook"
            style={styles.communityButton}
          />
          
          <Button
            title="YouTube Channel"
            onPress={() => Linking.openURL('https://youtube.com/yachi')}
            variant="outline"
            size="medium"
            icon="youtube"
            style={styles.communityButton}
          />
          
          <Button
            title="Telegram Group"
            onPress={() => Linking.openURL('https://t.me/yachi_support')}
            variant="outline"
            size="medium"
            icon="send"
            style={styles.communityButton}
          />
        </View>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading help center..." />
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
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Help & Support
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            We're here to help you succeed
          </ThemedText>
        </View>

        {/* Support Statistics */}
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                24/7
              </ThemedText>
              <ThemedText type="default" style={styles.statLabel}>
                Support Available
              </ThemedText>
            </View>
            
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                {supportAgents.length}+
              </ThemedText>
              <ThemedText type="default" style={styles.statLabel}>
                Support Agents
              </ThemedText>
            </View>
            
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                98%
              </ThemedText>
              <ThemedText type="default" style={styles.statLabel}>
                Satisfaction Rate
              </ThemedText>
            </View>
            
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                {'<2h'}
              </ThemedText>
              <ThemedText type="default" style={styles.statLabel}>
                Avg. Response
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Main Content Tabs */}
        <TabView
          tabs={[
            { key: 'help', title: 'Get Help' },
            { key: 'tickets', title: `My Tickets (${supportTickets.length})` },
            { key: 'resources', title: 'Resources' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          style={styles.tabView}
        />

        {/* Tab Content */}
        <View style={styles.tabContainer}>
          {activeTab === 'help' && renderHelpTab()}
          {activeTab === 'tickets' && renderTicketsTab()}
          {activeTab === 'resources' && renderResourcesTab()}
        </View>
      </ScrollView>

      {/* Support Ticket Modal */}
      <Modal
        visible={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title="Create Support Ticket"
        size="large"
      >
        <View style={styles.ticketModal}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            How can we help you?
          </ThemedText>
          
          {/* Ticket form would be implemented here */}
          <ThemedText>Support ticket form component</ThemedText>
          
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setShowTicketModal(false)}
              variant="secondary"
              size="medium"
            />
            <Button
              title="Submit Ticket"
              onPress={handleSubmitTicket}
              variant="primary"
              size="medium"
              loading={submitting}
              disabled={submitting}
            />
          </View>
        </View>
      </Modal>

      {/* Contact Support Modal */}
      <Modal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Support"
        size="medium"
      >
        <View style={styles.contactModal}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            Send us a message
          </ThemedText>
          
          {/* Contact form would be implemented here */}
          <ThemedText>Contact form component</ThemedText>
          
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setShowContactModal(false)}
              variant="secondary"
              size="medium"
            />
            <Button
              title="Send Message"
              onPress={handleContactSupport}
              variant="primary"
              size="medium"
              loading={submitting}
              disabled={submitting}
            />
          </View>
        </View>
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
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    lineHeight: 20,
  },
  statsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
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
    gap: 4,
  },
  statValue: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  tabView: {
    marginHorizontal: 16,
  },
  tabContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  quickSupportCard: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  sectionDescription: {
    opacity: 0.7,
    lineHeight: 18,
  },
  quickSupportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSupportButton: {
    flex: 1,
    minWidth: '45%',
  },
  searchCard: {
    marginBottom: 8,
  },
  categoriesCard: {
    gap: 16,
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    gap: 8,
    padding: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 16,
  },
  categoryDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 16,
  },
  responseTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  popularCard: {
    gap: 16,
  },
  articlesList: {
    gap: 12,
  },
  articleCard: {
    gap: 8,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  articleTitle: {
    flex: 1,
    fontSize: 16,
  },
  articleDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  articleViews: {
    fontSize: 12,
    opacity: 0.6,
  },
  articleRating: {
    fontSize: 12,
    opacity: 0.6,
  },
  ticketsHeaderCard: {
    marginBottom: 8,
  },
  ticketsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketsInfo: {
    gap: 2,
  },
  ticketsCount: {
    opacity: 0.7,
  },
  ticketsList: {
    gap: 12,
  },
  ticketCard: {
    gap: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketInfo: {
    flex: 1,
    gap: 2,
  },
  ticketTitle: {
    fontSize: 16,
  },
  ticketCategory: {
    fontSize: 14,
    opacity: 0.7,
  },
  ticketDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  ticketId: {
    fontSize: 12,
    opacity: 0.6,
  },
  assignedAgent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agentName: {
    fontSize: 14,
    opacity: 0.7,
  },
  ticketActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyTickets: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyButton: {
    marginTop: 8,
  },
  resourcesCard: {
    gap: 16,
  },
  videoGrid: {
    gap: 12,
  },
  videoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  videoThumbnail: {
    width: 80,
    height: 60,
    backgroundColor: '#e1e1e1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  videoInfo: {
    flex: 1,
    gap: 4,
  },
  videoTitle: {
    fontSize: 16,
  },
  videoMeta: {
    fontSize: 14,
    opacity: 0.7,
  },
  documentationCard: {
    gap: 16,
  },
  documentationList: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    gap: 2,
  },
  documentTitle: {
    fontSize: 16,
  },
  documentMeta: {
    fontSize: 14,
    opacity: 0.7,
  },
  communityCard: {
    gap: 16,
  },
  communityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  communityButton: {
    flex: 1,
    minWidth: '45%',
  },
  ticketModal: {
    gap: 16,
    padding: 16,
  },
  contactModal: {
    gap: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default HelpSupportScreen;