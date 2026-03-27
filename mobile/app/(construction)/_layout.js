import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ConstructionLayout({ children }) {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Determine if we're showing a full-screen construction page
  const isConstructionPage = params?.construction === 'true' || 
                           children?.props?.construction === true;

  // Construction banner component
  const ConstructionBanner = () => (
    <View style={styles.constructionBanner}>
      <View style={styles.bannerContent}>
        <Ionicons name="construct" size={20} color="#fff" />
        <Text style={styles.bannerText}>Under Construction</Text>
        <Ionicons name="construct" size={20} color="#fff" />
      </View>
    </View>
  );

  // Full construction screen
  const ConstructionScreen = () => (
    <SafeAreaView style={styles.fullScreenContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.constructionContainer}>
          {/* Logo or App Icon */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="build" size={64} color="#ff9900" />
            </View>
          </View>
          
          {/* Construction Title */}
          <Text style={styles.constructionTitle}>
            Feature Coming Soon!
          </Text>
          
          {/* Construction Description */}
          <Text style={styles.constructionDescription}>
            We're working hard to bring you this feature. Our team is currently building an amazing experience for you.
          </Text>
          
          {/* Progress Indicators */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '65%' }]} />
            </View>
            <Text style={styles.progressText}>Development in progress (65%)</Text>
          </View>
          
          {/* Feature List */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What to expect:</Text>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Secure Ethiopian payment integration</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Chapa, Telebirr, and CBE Birr support</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Real-time transaction tracking</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Instant payment confirmations</Text>
            </View>
          </View>
          
          {/* Estimated Timeline */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineHeader}>
              <Ionicons name="calendar" size={20} color="#2196F3" />
              <Text style={styles.timelineTitle}>Estimated Timeline</Text>
            </View>
            <Text style={styles.timelineText}>Target Release: Q1 2026</Text>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#333" />
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.notifyButton}
              onPress={() => {/* Handle notify me */}}
            >
              <Ionicons name="notifications" size={20} color="#fff" />
              <Text style={styles.notifyButtonText}>Notify Me</Text>
            </TouchableOpacity>
          </View>
          
          {/* Contact Support */}
          <TouchableOpacity style={styles.supportLink}>
            <Text style={styles.supportText}>
              Have questions? <Text style={styles.supportHighlight}>Contact Support</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // If it's a full construction page, show the full screen
  if (isConstructionPage) {
    return <ConstructionScreen />;
  }

  // Otherwise, wrap children with construction banner
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Construction Banner */}
      <ConstructionBanner />
      
      {/* Main Content */}
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  constructionBanner: {
    backgroundColor: '#ff9900',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  // Full Construction Screen Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  constructionContainer: {
    padding: 24,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 30,
    marginTop: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  constructionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  constructionDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  timelineContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timelineText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#ff9900',
    borderRadius: 12,
    gap: 8,
  },
  notifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  supportLink: {
    paddingVertical: 12,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  supportHighlight: {
    color: '#ff9900',
    fontWeight: '600',
  },
});