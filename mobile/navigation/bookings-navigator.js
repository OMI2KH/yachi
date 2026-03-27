/**
 * Enterprise-level Bookings Navigator for Yachi Mobile App
 * Comprehensive booking management with Ethiopian payment integration
 * AI-powered construction project integration
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';
import { useBookings } from '../hooks/use-bookings';
import { Ionicons } from '@expo/vector-icons';

// Import Enterprise Booking Screens
import BookingsListScreen from '../screens/bookings/list';
import BookingDetailScreen from '../screens/bookings/detail';
import CreateBookingScreen from '../screens/bookings/create';
import BookingHistoryScreen from '../screens/bookings/history';
import BookingTrackingScreen from '../screens/bookings/tracking';
import BookingReviewScreen from '../screens/bookings/review';
import RescheduleBookingScreen from '../screens/bookings/reschedule';
import BookingConfirmationScreen from '../screens/bookings/confirmation';
import BookingPaymentScreen from '../screens/bookings/payment';

// Import Construction Booking Screens
import ConstructionProjectCreateScreen from '../screens/projects/create';
import AIAssignmentScreen from '../screens/projects/ai-assignment';
import ProjectProgressScreen from '../screens/projects/progress';
import ProjectTeamScreen from '../screens/projects/team';
import ProjectMilestonesScreen from '../screens/projects/milestones';

// Import Shared Components
import Navbar from '../components/Navbar';
import AccessDeniedScreen from '../components/ui/access-denied';
import BookingCard from '../components/booking/booking-card';
import BookingTimeline from '../components/booking/booking-timeline';

// Import Enterprise Constants
import { ROUTES } from '../constants/navigation';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/sizes';
import { BOOKING_STATUS, BOOKING_TYPES } from '../constants/booking';

const Stack = createNativeStackNavigator();

const BookingsNavigator = () => {
  const { theme, isDark } = useTheme();
  const { user, hasPermission } = useAuth();
  const { refreshBookings } = useBookings();

  // Enterprise booking header configuration
  const enterpriseHeaderOptions = {
    headerStyle: {
      backgroundColor: theme.colors.background.primary,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    headerTintColor: theme.colors.text.primary,
    headerTitleStyle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    headerBackTitle: 'Back',
    headerBackTitleVisible: false,
  };

  // Dynamic status color mapping
  const getStatusConfig = (status) => {
    const statusConfigs = {
      [BOOKING_STATUS.PENDING]: {
        color: theme.colors.semantic.warning.main,
        icon: 'time-outline',
        label: 'Pending Confirmation'
      },
      [BOOKING_STATUS.CONFIRMED]: {
        color: theme.colors.semantic.info.main,
        icon: 'checkmark-circle-outline',
        label: 'Confirmed'
      },
      [BOOKING_STATUS.IN_PROGRESS]: {
        color: theme.colors.primary.main,
        icon: 'build-outline',
        label: 'In Progress'
      },
      [BOOKING_STATUS.COMPLETED]: {
        color: theme.colors.semantic.success.main,
        icon: 'checkmark-done-outline',
        label: 'Completed'
      },
      [BOOKING_STATUS.CANCELLED]: {
        color: theme.colors.semantic.error.main,
        icon: 'close-circle-outline',
        label: 'Cancelled'
      },
      [BOOKING_STATUS.ASSIGNING_TEAM]: {
        color: theme.colors.secondary.main,
        icon: 'people-outline',
        label: 'Assigning Team'
      },
      [BOOKING_STATUS.SCHEDULED]: {
        color: theme.colors.semantic.info.light,
        icon: 'calendar-outline',
        label: 'Scheduled'
      }
    };
    return statusConfigs[status] || statusConfigs[BOOKING_STATUS.PENDING];
  };

  // Check user permissions for booking features
  const canAccessBookingFeature = (feature) => {
    const permissions = {
      create_construction: user?.role === 'client' || user?.role === 'government',
      manage_team: user?.role === 'provider' || user?.role === 'government',
      view_analytics: user?.role === 'government' || user?.role === 'admin',
      bulk_operations: user?.role === 'government'
    };
    return permissions[feature] || false;
  };

  return (
    <Stack.Navigator
      initialRouteName={ROUTES.BOOKINGS.LIST}
      screenOptions={{
        ...enterpriseHeaderOptions,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: theme.colors.background.primary,
        },
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {/* Main Bookings List */}
      <Stack.Screen
        name={ROUTES.BOOKINGS.LIST}
        component={BookingsListScreen}
        options={({ navigation, route }) => ({
          title: 'My Bookings & Projects',
          header: (props) => (
            <Navbar
              {...props}
              title="My Bookings & Projects"
              subtitle={`${user?.bookingStats?.active || 0} active`}
              showProfile={true}
              showNotifications={true}
              customActions={[
                {
                  icon: 'add',
                  onPress: () => navigation.navigate(ROUTES.BOOKINGS.CREATE),
                  badge: null
                },
                {
                  icon: 'filter',
                  onPress: () => navigation.navigate('BookingFilters'),
                  badge: route.params?.filterCount || null
                }
              ]}
              onRefresh={refreshBookings}
            />
          ),
        })}
      />

      {/* Create Booking - Multi-type Support */}
      <Stack.Screen
        name={ROUTES.BOOKINGS.CREATE}
        component={CreateBookingScreen}
        options={({ navigation, route }) => ({
          title: 'New Booking',
          header: (props) => (
            <Navbar
              {...props}
              title="New Booking"
              subtitle={getBookingTypeLabel(route.params?.bookingType)}
              showBackButton={true}
              showProfile={false}
              customActions={[
                {
                  icon: 'construct',
                  onPress: () => showBookingTypeSelector(navigation, route.params),
                  badge: canAccessBookingFeature('create_construction') ? 'NEW' : null
                },
                {
                  icon: 'calendar',
                  onPress: () => navigation.navigate('ServiceAvailability', {
                    serviceId: route.params?.serviceId,
                    providerId: route.params?.providerId,
                  })
                }
              ]}
            />
          ),
          presentation: 'modal',
        })}
      />

      {/* Construction Project Creation */}
      {canAccessBookingFeature('create_construction') && (
        <Stack.Screen
          name={ROUTES.CONSTRUCTION.CREATE}
          component={ConstructionProjectCreateScreen}
          options={({ navigation, route }) => ({
            title: 'New Construction Project',
            header: (props) => (
              <Navbar
                {...props}
                title="New Construction Project"
                subtitle="AI-Powered Team Matching"
                showBackButton={true}
                showProfile={false}
                customActions={[
                  {
                    icon: 'calculator',
                    onPress: () => navigation.navigate('ProjectCalculator', route.params)
                  },
                  {
                    icon: 'help-buoy',
                    onPress: () => navigation.navigate('ConstructionGuide')
                  }
                ]}
              />
            ),
            presentation: 'modal',
          })}
        />
      )}

      {/* AI Team Assignment */}
      {canAccessBookingFeature('create_construction') && (
        <Stack.Screen
          name={ROUTES.CONSTRUCTION.AI_ASSIGNMENT}
          component={AIAssignmentScreen}
          options={({ navigation, route }) => ({
            title: 'AI Team Assignment',
            header: (props) => (
              <Navbar
                {...props}
                title="AI Team Assignment"
                subtitle={`Matching ${route.params?.teamSize || 0} workers`}
                showBackButton={true}
                showProfile={false}
                customActions={[
                  {
                    icon: 'refresh',
                    onPress: () => navigation.setParams({ refresh: Date.now() })
                  },
                  {
                    icon: 'settings',
                    onPress: () => navigation.navigate('MatchingSettings', route.params)
                  }
                ]}
              />
            ),
          })}
        />
      )}

      {/* Booking Details with Dynamic Options */}
      <Stack.Screen
        name={ROUTES.BOOKINGS.DETAIL}
        component={BookingDetailScreen}
        options={({ navigation, route }) => ({
          title: 'Booking Details',
          header: (props) => {
            const statusConfig = getStatusConfig(route.params?.status);
            return (
              <Navbar
                {...props}
                title="Booking Details"
                subtitle={statusConfig.label}
                subtitleColor={statusConfig.color}
                showBackButton={true}
                showProfile={true}
                customActions={getBookingActions(route.params, navigation)}
              />
            );
          },
        })}
      />

      {/* Project Progress Tracking */}
      <Stack.Screen
        name={ROUTES.PROJECTS.PROGRESS}
        component={ProjectProgressScreen}
        options={({ navigation, route }) => ({
          title: 'Project Progress',
          header: (props) => (
            <Navbar
              {...props}
              title="Project Progress"
              subtitle={`${route.params?.progress || 0}% Complete`}
              showBackButton={true}
              showProfile={true}
              customActions={[
                {
                  icon: 'stats-chart',
                  onPress: () => navigation.navigate('ProjectAnalytics', route.params)
                },
                {
                  icon: 'document-text',
                  onPress: () => navigation.navigate('ProjectReports', route.params)
                }
              ]}
            />
          ),
        })}
      />

      {/* Project Team Management */}
      <Stack.Screen
        name={ROUTES.PROJECTS.TEAM}
        component={ProjectTeamScreen}
        options={({ navigation, route }) => ({
          title: 'Project Team',
          header: (props) => (
            <Navbar
              {...props}
              title="Project Team"
              subtitle={`${route.params?.teamCount || 0} members`}
              showBackButton={true}
              showProfile={false}
              customActions={canAccessBookingFeature('manage_team') ? [
                {
                  icon: 'person-add',
                  onPress: () => navigation.navigate('AddTeamMember', route.params)
                },
                {
                  icon: 'swap-horizontal',
                  onPress: () => navigation.navigate('ReplaceWorker', route.params)
                }
              ] : []}
            />
          ),
        })}
      />

      {/* Enterprise Booking Sub-flows */}
      <Stack.Group
        screenOptions={{
          presentation: 'containedModal',
          headerShown: true,
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      >
        {/* Service Availability with Ethiopian Calendar */}
        <Stack.Screen
          name="ServiceAvailability"
          component={ServiceAvailabilityScreen}
          options={{
            title: 'Check Availability',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* Project Calculator */}
        <Stack.Screen
          name="ProjectCalculator"
          component={ProjectCalculatorScreen}
          options={{
            title: 'Project Calculator',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* Booking Filters with Advanced Options */}
        <Stack.Screen
          name="BookingFilters"
          component={BookingFiltersScreen}
          options={{
            title: 'Filter Bookings',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* Project Milestones */}
        <Stack.Screen
          name={ROUTES.PROJECTS.MILESTONES}
          component={ProjectMilestonesScreen}
          options={{
            title: 'Project Milestones',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />
      </Stack.Group>

      {/* Payment & Financial Management */}
      <Stack.Group
        screenOptions={{
          presentation: 'modal',
          headerShown: true,
          animation: 'slide_from_bottom',
        }}
      >
        {/* Ethiopian Payment Methods */}
        <Stack.Screen
          name="PaymentMethods"
          component={PaymentMethodsScreen}
          options={{
            title: 'Payment Methods',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* Payment Confirmation with Receipt */}
        <Stack.Screen
          name="PaymentConfirmation"
          component={PaymentConfirmationScreen}
          options={{
            title: 'Payment Confirmation',
            headerStyle: {
              backgroundColor: theme.colors.background.primary,
            },
          }}
        />

        {/* Bulk Payment for Government Projects */}
        {canAccessBookingFeature('bulk_operations') && (
          <Stack.Screen
            name="BulkPayment"
            component={BulkPaymentScreen}
            options={{
              title: 'Bulk Payment Processing',
              headerStyle: {
                backgroundColor: theme.colors.background.primary,
              },
            }}
          />
        )}
      </Stack.Group>

      {/* Emergency & Error Handling */}
      <Stack.Group
        screenOptions={{
          presentation: 'fullScreenModal',
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen
          name="BookingError"
          component={BookingErrorScreen}
        />

        <Stack.Screen
          name="PaymentFailed"
          component={PaymentFailedScreen}
        />

        <Stack.Screen
          name="TeamAssignmentFailed"
          component={TeamAssignmentFailedScreen}
        />
      </Stack.Group>

      {/* Access Denied Screens */}
      {!hasPermission('premium_features') && (
        <Stack.Screen
          name="PremiumRequired"
          component={PremiumRequiredScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
};

// Enterprise-level utility functions
const getBookingTypeLabel = (bookingType) => {
  const typeLabels = {
    [BOOKING_TYPES.STANDARD]: 'Standard Service',
    [BOOKING_TYPES.CONSTRUCTION]: 'Construction Project',
    [BOOKING_TYPES.GOVERNMENT]: 'Government Project',
    [BOOKING_TYPES.EMERGENCY]: 'Emergency Service',
    [BOOKING_TYPES.PREMIUM]: 'Premium Service'
  };
  return typeLabels[bookingType] || 'Service Booking';
};

const getBookingActions = (bookingParams, navigation) => {
  const { id, status, type, canModify } = bookingParams || {};
  
  const baseActions = [
    {
      icon: 'share-social',
      onPress: () => shareBookingDetails(id),
      label: 'Share'
    },
    {
      icon: 'chatbubble',
      onPress: () => navigation.navigate('BookingChat', { bookingId: id }),
      label: 'Chat'
    }
  ];

  if (canModify) {
    baseActions.unshift({
      icon: 'calendar',
      onPress: () => navigation.navigate('RescheduleBooking', { bookingId: id }),
      label: 'Reschedule'
    });
  }

  if (type === BOOKING_TYPES.CONSTRUCTION) {
    baseActions.push({
      icon: 'people',
      onPress: () => navigation.navigate(ROUTES.PROJECTS.TEAM, { projectId: id }),
      label: 'Team'
    });
  }

  return baseActions;
};

const showBookingTypeSelector = (navigation, currentParams) => {
  const bookingTypes = [
    {
      label: 'Standard Service',
      value: BOOKING_TYPES.STANDARD,
      icon: 'build',
      description: 'Regular home services and repairs'
    },
    {
      label: 'Construction Project',
      value: BOOKING_TYPES.CONSTRUCTION,
      icon: 'business',
      description: 'AI-powered construction projects',
      premium: false
    },
    {
      label: 'Emergency Service',
      value: BOOKING_TYPES.EMERGENCY,
      icon: 'warning',
      description: '24/7 urgent services',
      premium: true
    }
  ];

  // Show enterprise-level type selector
  navigation.navigate('BookingTypeSelector', {
    types: bookingTypes,
    currentType: currentParams?.bookingType,
    onTypeSelect: (type) => {
      navigation.setParams({ bookingType: type });
    }
  });
};

// Enterprise Navigation Service
export const BookingsNavigationService = {
  // Core Booking Navigation
  navigateToServiceBooking: (serviceId, providerId = null, options = {}) => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.BOOKINGS.CREATE, {
      serviceId,
      providerId,
      quickBook: true,
      ...options
    });
  },

  // Construction Project Navigation
  navigateToConstructionProject: (projectType, requirements = {}) => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.CONSTRUCTION.CREATE, {
      projectType,
      ...requirements,
      aiMatching: true,
      ethiopianCalendar: true
    });
  },

  // AI Team Assignment Navigation
  navigateToAIAssignment: (projectId, matchingCriteria) => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.CONSTRUCTION.AI_ASSIGNMENT, {
      projectId,
      matchingCriteria,
      autoStart: true,
      showProgress: true
    });
  },

  // Government Bulk Operations
  navigateToBulkBookings: (projectBatch, strategy = 'optimized') => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate('BulkBookingManagement', {
      projectBatch,
      strategy,
      governmentApproved: true
    });
  },

  // Ethiopian Holiday-Aware Booking
  navigateToBookingWithHolidayCheck: (serviceId, date, region = 'addis_ababa') => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.BOOKINGS.CREATE, {
      serviceId,
      preferredDate: date,
      region,
      checkHolidays: true,
      ethiopianCalendar: true,
      avoidHolidays: true
    });
  },

  // Emergency Service Navigation
  navigateToEmergencyBooking: (serviceType, location, priority = 'high') => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.BOOKINGS.CREATE, {
      serviceType,
      location,
      emergency: true,
      priority,
      bypassAvailability: true
    });
  },

  // Project Progress Navigation
  navigateToProjectProgress: (projectId, autoRefresh = true) => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.PROJECTS.PROGRESS, {
      projectId,
      autoRefresh,
      liveUpdates: true
    });
  },

  // Team Management Navigation
  navigateToTeamManagement: (projectId, canModify = false) => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate(ROUTES.PROJECTS.TEAM, {
      projectId,
      canModify,
      showAIRecommendations: true
    });
  },

  // Payment Navigation with Ethiopian Providers
  navigateToBookingPayment: (bookingId, amount, provider = 'chapa', currency = 'ETB') => {
    const navigationRef = require('./app-navigator').NavigationService;
    navigationRef.navigate('BookingPayment', {
      bookingId,
      amount,
      provider,
      currency,
      ethiopianPayment: true,
      localGateway: true
    });
  }
};

// Placeholder components for enterprise features
const ServiceAvailabilityScreen = () => null;
const ProjectCalculatorScreen = () => null;
const BookingFiltersScreen = () => null;
const PaymentMethodsScreen = () => null;
const PaymentConfirmationScreen = () => null;
const BulkPaymentScreen = () => null;
const BookingErrorScreen = () => null;
const PaymentFailedScreen = () => null;
const TeamAssignmentFailedScreen = () => null;
const PremiumRequiredScreen = () => null;

export default BookingsNavigator;