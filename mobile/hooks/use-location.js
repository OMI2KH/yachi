// hooks/use-location.js

/**
 * ENTERPRISE-GRADE LOCATION SERVICES HOOK
 * Yachi Mobile App - Advanced Location Management with Ethiopian Market Optimization
 * 
 * Enterprise Features:
 * - AI Construction site location tracking and monitoring
 * - Government project geofencing and compliance
 * - Ethiopian regional optimization and timezone support
 * - Advanced battery optimization for field workers
 * - Offline location caching with Ethiopian map data
 * - Multi-accuracy tracking for different use cases
 * - Real-time construction site safety monitoring
 * - Ethiopian address geocoding and validation
 * - Enterprise-grade security and privacy compliance
 * - Advanced analytics for location-based insights
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Platform, AppState } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useAuth } from './use-auth';

// =============================================================================
// ENTERPRISE CONSTANTS & CONFIGURATION
// =============================================================================

export const LOCATION_ACCURACY = {
  LOWEST: 'lowest',
  LOW: 'low',
  BALANCED: 'balanced',
  HIGH: 'high',
  HIGHEST: 'highest',
  BEST_FOR_NAVIGATION: 'bestForNavigation',
  CONSTRUCTION_SITE: 'construction_site',
  GOVERNMENT_PROJECT: 'government_project',
};

export const LOCATION_PERMISSION = {
  WHEN_IN_USE: 'whenInUse',
  ALWAYS: 'always',
  CONSTRUCTION: 'construction',
  GOVERNMENT: 'government',
};

export const GEOFENCING_EVENTS = {
  ENTER: 'enter',
  EXIT: 'exit',
  DWELL: 'dwell',
  SITE_SAFETY_ALERT: 'site_safety_alert',
  MATERIAL_DELIVERY: 'material_delivery',
  WORKER_CHECKIN: 'worker_checkin',
};

export const TRACKING_MODES = {
  DISABLED: 'disabled',
  PASSIVE: 'passive',
  ACTIVE: 'active',
  NAVIGATION: 'navigation',
  CONSTRUCTION: 'construction',
  GOVERNMENT: 'government',
  EMERGENCY: 'emergency',
};

export const ETHIOPIAN_REGIONS = {
  ADDIS_ABABA: 'addis_ababa',
  OROMIA: 'oromia',
  AMHARA: 'amhara',
  TIGRAY: 'tigray',
  SNNPR: 'snnpr',
  AFAR: 'afar',
  SOMALI: 'somali',
  BENISHANGUL_GUMUZ: 'benishangul_gumuz',
  GAMBELLA: 'gambella',
  HARARI: 'harari',
  DIRE_DAWA: 'dire_dawa',
};

// Background task names for enterprise features
const BACKGROUND_TASKS = {
  LOCATION_TRACKING: 'yachi-background-location-tracking',
  GEOFENCING: 'yachi-background-geofencing',
  CONSTRUCTION_MONITORING: 'yachi-construction-monitoring',
  GOVERNMENT_COMPLIANCE: 'yachi-government-compliance',
  LOCATION_SYNC: 'yachi-location-sync',
};

// Storage keys for enterprise data
const STORAGE_KEYS = {
  LOCATION_PERMISSION: '@yachi_location_permission',
  LOCATION_SETTINGS: '@yachi_location_settings',
  LOCATION_HISTORY: '@yachi_location_history',
  GEOFENCES_DATA: '@yachi_geofences_data',
  CONSTRUCTION_SITES: '@yachi_construction_sites',
  GOVERNMENT_PROJECTS: '@yachi_government_projects',
  LAST_KNOWN_LOCATION: '@yachi_last_known_location',
  ETHIOPIAN_MAP_DATA: '@yachi_ethiopian_map_data',
};

// =============================================================================
// ENTERPRISE INITIAL STATE
// =============================================================================

const initialState = {
  // Permission Management
  permissionStatus: null,
  hasLocationPermission: false,
  hasBackgroundPermission: false,
  hasConstructionPermission: false,
  permissionType: null,
  
  // Location Data
  currentLocation: null,
  lastKnownLocation: null,
  heading: null,
  altitude: null,
  speed: null,
  accuracy: null,
  batteryLevel: null,
  
  // Location History & Analytics
  locationHistory: [],
  traveledDistance: 0,
  constructionSiteVisits: [],
  governmentProjectAccess: [],
  
  // Enterprise Tracking Settings
  trackingMode: TRACKING_MODES.DISABLED,
  accuracy: LOCATION_ACCURACY.BALANCED,
  distanceFilter: 10, // meters
  timeInterval: 5000, // milliseconds
  enableHighAccuracy: false,
  batteryOptimization: true,
  
  // Ethiopian Market Features
  currentRegion: null,
  ethiopianTimezone: 'Africa/Addis_Ababa',
  localMapData: null,
  regionalSettings: null,
  
  // Construction & Government Features
  geofences: [],
  activeGeofences: new Set(),
  constructionSites: [],
  governmentProjects: [],
  monitoredRegions: [],
  safetyAlerts: [],
  
  // Services Status
  isLocationServicesEnabled: false,
  isGeocodingAvailable: true,
  isGeofencingAvailable: true,
  isBackgroundLocationAvailable: true,
  isConstructionTrackingEnabled: false,
  isGovernmentMonitoringEnabled: false,
  
  // Operational Status
  isInitialized: false,
  isLoading: false,
  isTracking: false,
  isBackgroundTracking: false,
  isLocating: false,
  isGeocoding: false,
  isMonitoringGeofences: false,
  isConstructionMode: false,
  
  // Performance Metrics
  batteryOptimized: true,
  lastLocationUpdate: null,
  locationUpdatesCount: 0,
  dataUsage: 0,
  
  // Error Management
  error: null,
  permissionError: null,
  locationError: null,
  geofencingError: null,
  constructionError: null,
};

// =============================================================================
// ENTERPRISE BACKGROUND TASK DEFINITIONS
// =============================================================================

TaskManager.defineTask(BACKGROUND_TASKS.LOCATION_TRACKING, ({ data, error }) => {
  if (error) {
    errorService.captureError(error, { 
      context: 'EnterpriseBackgroundLocationTask',
      task: BACKGROUND_TASKS.LOCATION_TRACKING 
    });
    return;
  }
  
  if (data?.locations) {
    handleEnterpriseLocationUpdate(data.locations);
  }
});

TaskManager.defineTask(BACKGROUND_TASKS.CONSTRUCTION_MONITORING, ({ data, error }) => {
  if (error) {
    errorService.captureError(error, {
      context: 'ConstructionMonitoringTask',
      task: BACKGROUND_TASKS.CONSTRUCTION_MONITORING
    });
    return;
  }
  
  if (data?.locations) {
    handleConstructionSiteMonitoring(data.locations);
  }
});

TaskManager.defineTask(BACKGROUND_TASKS.GOVERNMENT_COMPLIANCE, ({ data, error }) => {
  if (error) {
    errorService.captureError(error, {
      context: 'GovernmentComplianceTask',
      task: BACKGROUND_TASKS.GOVERNMENT_COMPLIANCE
    });
    return;
  }
  
  if (data?.locations) {
    handleGovernmentProjectMonitoring(data.locations);
  }
});

// =============================================================================
// ENTERPRISE LOCATION HOOK
// =============================================================================

export const useLocation = () => {
  const { user, isAuthenticated, hasPermission } = useAuth();
  
  const [state, setState] = useState(initialState);
  
  const locationSubscription = useRef(null);
  const headingSubscription = useRef(null);
  const appStateListener = useRef(null);
  const geofencingSubscriptions = useRef(new Map());
  const locationHistoryRef = useRef([]);
  const lastLocationRef = useRef(null);
  const constructionSitesRef = useRef(new Map());

  // ===========================================================================
  // ENTERPRISE INITIALIZATION
  // ===========================================================================

  const initializeEnterpriseLocation = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load enterprise location data
      const [
        permissionStatus, 
        settings, 
        locationHistory, 
        geofences, 
        constructionSites,
        governmentProjects,
        lastKnownLocation,
        ethiopianMapData
      ] = await Promise.all([
        storage.get(STORAGE_KEYS.LOCATION_PERMISSION),
        storage.get(STORAGE_KEYS.LOCATION_SETTINGS),
        storage.get(STORAGE_KEYS.LOCATION_HISTORY),
        storage.get(STORAGE_KEYS.GEOFENCES_DATA),
        storage.get(STORAGE_KEYS.CONSTRUCTION_SITES),
        storage.get(STORAGE_KEYS.GOVERNMENT_PROJECTS),
        storage.get(STORAGE_KEYS.LAST_KNOWN_LOCATION),
        storage.get(STORAGE_KEYS.ETHIOPIAN_MAP_DATA),
      ]);

      // Check enterprise location services
      const [hasServices, foregroundPermission, backgroundPermission] = await Promise.all([
        Location.hasServicesEnabledAsync(),
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
      ]);

      if (!hasServices) {
        throw new Error('ENTERPRISE_LOCATION_SERVICES_DISABLED');
      }

      const hasLocationPermission = foregroundPermission.granted;
      const hasBackgroundPermission = backgroundPermission.granted;
      const hasConstructionPermission = await checkConstructionPermissions();
      const permissionType = hasBackgroundPermission ? LOCATION_PERMISSION.ALWAYS : LOCATION_PERMISSION.WHEN_IN_USE;

      // Detect Ethiopian region
      const currentRegion = await detectEthiopianRegion(lastKnownLocation);

      // Initialize enterprise state
      setState(async prev => ({
        ...prev,
        ...settings,
        permissionStatus: permissionStatus || foregroundPermission.status,
        hasLocationPermission,
        hasBackgroundPermission,
        hasConstructionPermission,
        permissionType,
        locationHistory: locationHistory || [],
        geofences: geofences || [],
        constructionSites: constructionSites || [],
        governmentProjects: governmentProjects || [],
        lastKnownLocation: lastKnownLocation || null,
        currentRegion,
        localMapData: ethiopianMapData,
        isLocationServicesEnabled: hasServices,
        isGeocodingAvailable: await Location.isGeocodingAvailableAsync(),
        isGeofencingAvailable: await Location.isGeofencingAvailableAsync(),
        isBackgroundLocationAvailable: Platform.OS === 'ios' ? 
          await Location.isBackgroundLocationAvailableAsync() : true,
        isConstructionTrackingEnabled: hasConstructionPermission && constructionSites?.length > 0,
        isInitialized: true,
        isLoading: false,
      }));

      // Initialize refs
      locationHistoryRef.current = locationHistory || [];
      lastLocationRef.current = lastKnownLocation;
      constructionSitesRef.current = new Map(constructionSites?.map(site => [site.id, site]));

      // Get last known location if permission granted
      if (hasLocationPermission) {
        await getLastKnownLocation();
      }

      // Setup enterprise monitoring
      setupEnterpriseAppStateListener();
      await setupEnterpriseBackgroundSync();
      await initializeConstructionGeofences();

      await analyticsService.trackEvent('enterprise_location_initialized', {
        hasPermission: hasLocationPermission,
        hasBackgroundPermission,
        hasConstructionPermission,
        constructionSitesCount: constructionSites?.length || 0,
        governmentProjectsCount: governmentProjects?.length || 0,
        currentRegion,
        platform: Platform.OS,
      });

    } catch (error) {
      await errorService.captureError(error, { context: 'EnterpriseLocationInitialization' });
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        error: error.message,
      }));
    }
  }, []);

  // ===========================================================================
  // ENTERPRISE PERMISSION MANAGEMENT
  // ===========================================================================

  const requestEnterprisePermission = useCallback(async (permissionType = LOCATION_PERMISSION.WHEN_IN_USE, context = {}) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, permissionError: null }));

      let permissionResponse;

      // Special handling for construction and government permissions
      if (permissionType === LOCATION_PERMISSION.CONSTRUCTION) {
        permissionResponse = await requestConstructionPermissions(context);
      } else if (permissionType === LOCATION_PERMISSION.GOVERNMENT) {
        permissionResponse = await requestGovernmentPermissions(context);
      } else if (permissionType === LOCATION_PERMISSION.ALWAYS) {
        permissionResponse = await Location.requestBackgroundPermissionsAsync();
      } else {
        permissionResponse = await Location.requestForegroundPermissionsAsync();
      }

      const { granted, status } = permissionResponse;
      const hasBackgroundPermission = permissionType === LOCATION_PERMISSION.ALWAYS ? 
        granted : state.hasBackgroundPermission;
      const hasConstructionPermission = permissionType === LOCATION_PERMISSION.CONSTRUCTION ? 
        granted : state.hasConstructionPermission;

      setState(prev => ({
        ...prev,
        permissionStatus: status,
        hasLocationPermission: granted,
        hasBackgroundPermission,
        hasConstructionPermission,
        permissionType: granted ? permissionType : null,
        isLoading: false,
        permissionError: null,
      }));

      await storage.set(STORAGE_KEYS.LOCATION_PERMISSION, status);

      if (granted) {
        await getCurrentLocation();
        
        await analyticsService.trackEvent('enterprise_location_permission_granted', {
          permissionType,
          status,
          context,
        });
      } else {
        await analyticsService.trackEvent('enterprise_location_permission_denied', {
          permissionType,
          status,
          context,
        });
      }

      return { granted, status, permissionType };

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterprisePermissionRequest', 
        permissionType,
        context 
      });
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        permissionError: error.message,
      }));
      
      return { granted: false, status: 'undetermined', error: error.message };
    }
  }, [state.hasBackgroundPermission, state.hasConstructionPermission]);

  // ===========================================================================
  // ENTERPRISE LOCATION SERVICES
  // ===========================================================================

  const getEnterpriseLocation = useCallback(async (options = {}) => {
    try {
      if (!state.hasLocationPermission) {
        throw new Error('ENTERPRISE_LOCATION_PERMISSION_REQUIRED');
      }

      setState(prev => ({ ...prev, isLocating: true, locationError: null }));

      const locationOptions = {
        accuracy: getEnterpriseAccuracyLevel(options.accuracy || state.accuracy),
        maximumAge: options.maximumAge || 30000,
        timeout: options.timeout || 15000,
        mayShowUserSettingsDialog: true,
      };

      const location = await Location.getCurrentPositionAsync(locationOptions);

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
        batteryLevel: await getBatteryLevel(),
        region: state.currentRegion,
        metadata: {
          capturedVia: 'enterprise_service',
          context: options.context || 'general',
          ...options.metadata,
        },
      };

      // Update enterprise state
      setState(prev => ({
        ...prev,
        currentLocation: locationData,
        lastKnownLocation: locationData,
        lastLocationUpdate: Date.now(),
        locationUpdatesCount: prev.locationUpdatesCount + 1,
        isLocating: false,
        locationError: null,
      }));

      // Update location history with enterprise features
      await updateEnterpriseLocationHistory(locationData);

      // Save to enterprise storage
      await storage.set(STORAGE_KEYS.LAST_KNOWN_LOCATION, locationData);

      // Send to enterprise services
      if (isAuthenticated) {
        await sendLocationToEnterpriseServices(locationData, options.context);
      }

      // Check construction site proximity
      if (state.isConstructionTrackingEnabled) {
        await checkConstructionSiteProximity(locationData);
      }

      await analyticsService.trackEvent('enterprise_location_updated', {
        accuracy: location.coords.accuracy,
        context: options.context,
        hasAltitude: !!location.coords.altitude,
        batteryLevel: locationData.batteryLevel,
        region: state.currentRegion,
      });

      return locationData;

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterpriseLocationAcquisition', 
        options 
      });
      
      setState(prev => ({
        ...prev,
        isLocating: false,
        locationError: error.message,
      }));
      
      return null;
    }
  }, [state.hasLocationPermission, state.accuracy, state.currentRegion, state.isConstructionTrackingEnabled, isAuthenticated]);

  // ===========================================================================
  // ENTERPRISE TRACKING MANAGEMENT
  // ===========================================================================

  const startEnterpriseTracking = useCallback(async (mode = TRACKING_MODES.ACTIVE, options = {}) => {
    try {
      if (!state.hasLocationPermission) {
        throw new Error('ENTERPRISE_TRACKING_PERMISSION_REQUIRED');
      }

      // Stop any existing tracking
      await stopEnterpriseTracking();

      const trackingConfig = getEnterpriseTrackingConfig(mode, options);

      // Start watching position with enterprise configuration
      locationSubscription.current = await Location.watchPositionAsync(
        trackingConfig,
        (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            altitudeAccuracy: location.coords.altitudeAccuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
            batteryLevel: trackingConfig.batteryLevel,
            trackingMode: mode,
            metadata: {
              trackingSession: options.sessionId,
              ...options.metadata,
            },
          };

          setState(prev => ({
            ...prev,
            currentLocation: locationData,
            lastKnownLocation: locationData,
            lastLocationUpdate: Date.now(),
            locationUpdatesCount: prev.locationUpdatesCount + 1,
          }));

          // Enterprise location processing
          updateEnterpriseLocationHistory(locationData);
          calculateEnterpriseTraveledDistance(locationData);
          processEnterpriseLocationData(locationData, mode);

          // Send to enterprise services
          if (isAuthenticated) {
            sendLocationToEnterpriseServices(locationData, `tracking_${mode}`);
          }
        }
      );

      // Start enterprise heading tracking
      if (await Location.hasServicesEnabledAsync()) {
        headingSubscription.current = await Location.watchHeadingAsync((heading) => {
          setState(prev => ({
            ...prev,
            heading: heading,
          }));
        });
      }

      // Start background tracking for enterprise modes
      if ([TRACKING_MODES.CONSTRUCTION, TRACKING_MODES.GOVERNMENT, TRACKING_MODES.EMERGENCY].includes(mode)) {
        await startEnterpriseBackgroundTracking(mode, trackingConfig);
      }

      setState(prev => ({
        ...prev,
        isTracking: true,
        trackingMode: mode,
        isConstructionMode: mode === TRACKING_MODES.CONSTRUCTION,
      }));

      await analyticsService.trackEvent('enterprise_tracking_started', {
        trackingMode: mode,
        accuracy: trackingConfig.accuracy,
        distanceInterval: trackingConfig.distanceInterval,
        timeInterval: trackingConfig.timeInterval,
        sessionId: options.sessionId,
      });

      return true;

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterpriseTrackingStart', 
        mode,
        options 
      });
      
      setState(prev => ({
        ...prev,
        locationError: error.message,
      }));
      
      return false;
    }
  }, [state.hasLocationPermission, isAuthenticated]);

  const startEnterpriseBackgroundTracking = async (mode, config) => {
    try {
      if (!state.hasBackgroundPermission) return;

      const taskName = getEnterpriseBackgroundTask(mode);

      await Location.startLocationUpdatesAsync(taskName, {
        ...config,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: getEnterpriseTrackingNotificationTitle(mode),
          notificationBody: getEnterpriseTrackingNotificationBody(mode),
          notificationColor: '#FF231F7C',
        },
        deferredUpdatesInterval: config.timeInterval,
        deferredUpdatesDistance: config.distanceInterval,
      });

      setState(prev => ({
        ...prev,
        isBackgroundTracking: true,
      }));

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseBackgroundTracking',
        mode,
        config,
      });
    }
  };

  // ===========================================================================
  // CONSTRUCTION ENTERPRISE FEATURES
  // ===========================================================================

  const addConstructionSite = useCallback(async (siteData) => {
    try {
      if (!state.hasConstructionPermission) {
        throw new Error('CONSTRUCTION_PERMISSION_REQUIRED');
      }

      const site = {
        id: siteData.id || `construction-${Date.now()}`,
        name: siteData.name,
        latitude: siteData.latitude,
        longitude: siteData.longitude,
        radius: siteData.radius || 500,
        projectId: siteData.projectId,
        projectType: siteData.projectType,
        workers: siteData.workers || [],
        safetyZones: siteData.safetyZones || [],
        monitoringEnabled: siteData.monitoringEnabled !== false,
        metadata: {
          created: new Date().toISOString(),
          createdBy: user?.id,
          ...siteData.metadata,
        },
      };

      // Add construction geofence
      await addEnterpriseGeofence({
        id: site.id,
        latitude: site.latitude,
        longitude: site.longitude,
        radius: site.radius,
        notifyOnEntry: true,
        notifyOnExit: true,
        notifyOnDwell: true,
        loiteringDelay: 300000, // 5 minutes
        metadata: { 
          type: 'construction_site', 
          projectId: site.projectId,
          safetyZones: site.safetyZones,
        },
      });

      setState(prev => ({
        ...prev,
        constructionSites: [...prev.constructionSites, site],
        isConstructionTrackingEnabled: true,
      }));

      // Update ref
      constructionSitesRef.current.set(site.id, site);

      // Save to enterprise storage
      const currentSites = await storage.get(STORAGE_KEYS.CONSTRUCTION_SITES) || [];
      await storage.set(STORAGE_KEYS.CONSTRUCTION_SITES, [...currentSites, site]);

      await analyticsService.trackEvent('construction_site_added', {
        siteId: site.id,
        projectId: site.projectId,
        projectType: site.projectType,
        radius: site.radius,
        safetyZonesCount: site.safetyZones.length,
      });

      return site.id;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ConstructionSiteAddition',
        siteData,
      });
      throw error;
    }
  }, [state.hasConstructionPermission, user]);

  const checkConstructionSiteProximity = async (locationData) => {
    try {
      const nearbySites = [];
      
      for (const [siteId, site] of constructionSitesRef.current) {
        const distance = calculateEnterpriseDistance(locationData, site);
        
        if (distance <= site.radius) {
          nearbySites.push({
            siteId,
            siteName: site.name,
            distance,
            timestamp: locationData.timestamp,
          });

          // Check safety zones
          await checkSafetyZoneProximity(locationData, site);
        }
      }

      if (nearbySites.length > 0) {
        await analyticsService.trackEvent('construction_site_proximity', {
          location: locationData,
          nearbySites: nearbySites.map(site => ({
            siteId: site.siteId,
            distance: site.distance,
          })),
        });
      }

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ConstructionSiteProximityCheck',
        locationData,
      });
    }
  };

  // ===========================================================================
  // ENTERPRISE GEOCODING SERVICES
  // ===========================================================================

  const geocodeEnterpriseAddress = useCallback(async (address, options = {}) => {
    try {
      if (!state.isGeocodingAvailable) {
        throw new Error('ENTERPRISE_GEOCODING_UNAVAILABLE');
      }

      setState(prev => ({ ...prev, isGeocoding: true }));

      const geocodeOptions = {
        ...options,
        useGoogleMaps: false, // Prefer device geocoding for privacy
      };

      const results = await Location.geocodeAsync(address, geocodeOptions);
      const processedResults = processEnterpriseGeocodingResults(results, address);
      
      setState(prev => ({ ...prev, isGeocoding: false }));

      await analyticsService.trackEvent('enterprise_address_geocoded', {
        address,
        resultsCount: processedResults.length,
        hasEthiopianResults: processedResults.some(r => r.isInEthiopia),
        options,
      });

      return processedResults;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseGeocoding',
        address,
        options,
      });
      
      setState(prev => ({ ...prev, isGeocoding: false }));
      throw error;
    }
  }, [state.isGeocodingAvailable]);

  const reverseGeocodeEnterprise = useCallback(async (location, options = {}) => {
    try {
      if (!state.isGeocodingAvailable) {
        throw new Error('ENTERPRISE_REVERSE_GEOCODING_UNAVAILABLE');
      }

      setState(prev => ({ ...prev, isGeocoding: true }));

      const results = await Location.reverseGeocodeAsync(location, options);
      const processedResults = processEnterpriseReverseGeocodingResults(results, location);

      setState(prev => ({ ...prev, isGeocoding: false }));

      await analyticsService.trackEvent('enterprise_location_reverse_geocoded', {
        latitude: location.latitude,
        longitude: location.longitude,
        resultsCount: processedResults.length,
        region: processedResults[0]?.region || 'unknown',
        options,
      });

      return processedResults;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseReverseGeocoding',
        location,
        options,
      });
      
      setState(prev => ({ ...prev, isGeocoding: false }));
      throw error;
    }
  }, [state.isGeocodingAvailable]);

  // ===========================================================================
  // ENTERPRISE UTILITY FUNCTIONS
  // ===========================================================================

  const calculateEnterpriseDistance = useCallback((coord1, coord2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  const getEnterpriseAccuracyLevel = (accuracy) => {
    const accuracyMap = {
      [LOCATION_ACCURACY.LOWEST]: Location.Accuracy.Lowest,
      [LOCATION_ACCURACY.LOW]: Location.Accuracy.Low,
      [LOCATION_ACCURACY.BALANCED]: Location.Accuracy.Balanced,
      [LOCATION_ACCURACY.HIGH]: Location.Accuracy.High,
      [LOCATION_ACCURACY.HIGHEST]: Location.Accuracy.Highest,
      [LOCATION_ACCURACY.BEST_FOR_NAVIGATION]: Location.Accuracy.BestForNavigation,
      [LOCATION_ACCURACY.CONSTRUCTION_SITE]: Location.Accuracy.High,
      [LOCATION_ACCURACY.GOVERNMENT_PROJECT]: Location.Accuracy.Highest,
    };
    
    return accuracyMap[accuracy] || Location.Accuracy.Balanced;
  };

  const getEnterpriseTrackingConfig = (mode, options) => {
    const baseConfig = {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 10,
      timeInterval: 10000,
      mayShowUserSettingsDialog: true,
      batteryLevel: options.batteryLevel || null,
    };

    const modeConfigs = {
      [TRACKING_MODES.PASSIVE]: {
        accuracy: Location.Accuracy.Low,
        distanceInterval: 50,
        timeInterval: 30000,
      },
      [TRACKING_MODES.ACTIVE]: {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 20,
        timeInterval: 15000,
      },
      [TRACKING_MODES.NAVIGATION]: {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 5000,
      },
      [TRACKING_MODES.CONSTRUCTION]: {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 10000,
      },
      [TRACKING_MODES.GOVERNMENT]: {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 2,
        timeInterval: 5000,
      },
      [TRACKING_MODES.EMERGENCY]: {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 1,
        timeInterval: 2000,
      },
    };

    return { ...baseConfig, ...modeConfigs[mode], ...options };
  };

  // ===========================================================================
  // ENTERPRISE COMPUTED VALUES & ANALYTICS
  // ===========================================================================

  const enterpriseLocationStats = useMemo(() => {
    return {
      totalUpdates: state.locationUpdatesCount,
      traveledDistance: state.traveledDistance,
      averageAccuracy: state.locationHistory.reduce((sum, loc) => sum + loc.accuracy, 0) / state.locationHistory.length || 0,
      lastUpdate: state.lastLocationUpdate,
      constructionSitesCount: state.constructionSites.length,
      governmentProjectsCount: state.governmentProjects.length,
      activeGeofencesCount: state.activeGeofences.size,
      currentRegion: state.currentRegion,
      batteryEfficiency: calculateBatteryEfficiency(),
    };
  }, [state]);

  const isAccurateForEnterprise = useMemo(() => {
    if (!state.currentLocation) return false;
    
    const requiredAccuracy = {
      [LOCATION_ACCURACY.LOWEST]: 1000,
      [LOCATION_ACCURACY.LOW]: 500,
      [LOCATION_ACCURACY.BALANCED]: 100,
      [LOCATION_ACCURACY.HIGH]: 50,
      [LOCATION_ACCURACY.HIGHEST]: 10,
      [LOCATION_ACCURACY.BEST_FOR_NAVIGATION]: 5,
      [LOCATION_ACCURACY.CONSTRUCTION_SITE]: 25,
      [LOCATION_ACCURACY.GOVERNMENT_PROJECT]: 5,
    };
    
    return state.currentLocation.accuracy <= (requiredAccuracy[state.accuracy] || 100);
  }, [state.currentLocation, state.accuracy]);

  // ===========================================================================
  // ENTERPRISE HOOK API
  // ===========================================================================

  const enterpriseLocationAPI = {
    // State
    ...state,
    enterpriseLocationStats,
    isAccurateForEnterprise,

    // Permission Management
    requestPermission: requestEnterprisePermission,
    
    // Location Services
    getCurrentLocation: getEnterpriseLocation,
    getLastKnownLocation: useCallback(() => getLastKnownLocation(), []),
    startTracking: startEnterpriseTracking,
    stopTracking: useCallback(() => stopEnterpriseTracking(), []),
    
    // Construction Features
    addConstructionSite,
    getConstructionSites: useCallback(() => state.constructionSites, [state.constructionSites]),
    
    // Geocoding Services
    geocodeAddress: geocodeEnterpriseAddress,
    reverseGeocode: reverseGeocodeEnterprise,
    
    // Utility Functions
    calculateDistance: calculateEnterpriseDistance,
    isLocationInRadius: useCallback((location, center, radius) => {
      const distance = calculateEnterpriseDistance(location, center);
      return distance <= radius;
    }, [calculateEnterpriseDistance]),
    
    // Ethiopian Market Features
    currentRegion: state.currentRegion,
    ethiopianRegions: ETHIOPIAN_REGIONS,
    
    _clearErrors: useCallback(() => setState(prev => ({
      ...prev,
      error: null,
      permissionError: null,
      locationError: null,
      geofencingError: null,
      constructionError: null,
    }), [])),
      get clearErrors() {
        return this._clearErrors;
      },
      set clearErrors(value) {
        this._clearErrors = value;
      },
  };

  // ===========================================================================
  // EFFECTS & CLEANUP
  // ===========================================================================

  useEffect(() => {
    initializeEnterpriseLocation();
  }, [initializeEnterpriseLocation]);

  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
      if (appStateListener.current) {
        appStateListener.current.remove();
      }
      stopEnterpriseTracking();
    };
  }, []);

  return enterpriseLocationAPI;
};

// =============================================================================
// ENTERPRISE SPECIALIZED HOOKS
// =============================================================================

export const useConstructionLocation = () => {
  const { 
    constructionSites, 
    addConstructionSite, 
    startTracking,
    isConstructionMode,
    enterpriseLocationStats 
  } = useLocation();

  const startConstructionTracking = useCallback(async (siteId, options = {}) => {
    return startTracking(TRACKING_MODES.CONSTRUCTION, {
      ...options,
      sessionId: `construction-${siteId}-${Date.now()}`,
      metadata: {
        siteId,
        trackingType: 'construction',
        ...options.metadata,
      },
    });
  }, [startTracking]);

  const getSiteSafetyAlerts = useCallback(async (siteId) => {
    // Implementation for safety zone alerts
    return [];
  }, []);

  return {
    constructionSites,
    addConstructionSite,
    startConstructionTracking,
    isConstructionMode,
    getSiteSafetyAlerts,
    constructionStats: enterpriseLocationStats,
  };
};

export const useLocationAnalytics = (timeRange = '24h') => {
  const { locationHistory, enterpriseLocationStats } = useLocation();
  
  const analytics = useMemo(() => {
    const now = new Date();
    const rangeStart = new Date(now);
    
    switch (timeRange) {
      case '1h':
        rangeStart.setHours(now.getHours() - 1);
        break;
      case '6h':
        rangeStart.setHours(now.getHours() - 6);
        break;
      case '24h':
        rangeStart.setDate(now.getDate() - 1);
        break;
      case '7d':
        rangeStart.setDate(now.getDate() - 7);
        break;
      default:
        rangeStart.setDate(now.getDate() - 1);
    }

    const filteredHistory = locationHistory.filter(location => 
      new Date(location.timestamp) >= rangeStart
    );

    const activityByHour = filteredHistory.reduce((acc, location) => {
      const hour = new Date(location.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const accuracyTrend = filteredHistory.map(location => ({
      timestamp: location.timestamp,
      accuracy: location.accuracy,
      battery: location.batteryLevel,
    }));

    return {
      ...enterpriseLocationStats,
      activityByHour,
      accuracyTrend,
      timeRange,
      periodStart: rangeStart.toISOString(),
      periodEnd: now.toISOString(),
    };
  }, [locationHistory, enterpriseLocationStats, timeRange]);

  return analytics;
};

// =============================================================================
// ENTERPRISE UTILITY FUNCTIONS (Mock implementations)
// =============================================================================

const checkConstructionPermissions = async () => {
  // Implementation would check specific construction permissions
  return true;
};

const requestConstructionPermissions = async (context) => {
  // Implementation for construction-specific permissions
  return await Location.requestBackgroundPermissionsAsync();
};

const detectEthiopianRegion = async (location) => {
  // Implementation would detect Ethiopian region based on coordinates
  return ETHIOPIAN_REGIONS.ADDIS_ABABA;
};

const updateEnterpriseLocationHistory = async (locationData) => {
  const newHistory = [locationData, ...locationHistoryRef.current].slice(0, 2000);
  locationHistoryRef.current = newHistory;
  
  // Save to storage periodically
  if (newHistory.length % 20 === 0) {
    await storage.set(STORAGE_KEYS.LOCATION_HISTORY, newHistory);
  }
};

const calculateEnterpriseTraveledDistance = (newLocation) => {
  if (!lastLocationRef.current) {
    lastLocationRef.current = newLocation;
    return;
  }

  const distance = calculateEnterpriseDistance(lastLocationRef.current, newLocation);
  
  // Update state through setState
  lastLocationRef.current = newLocation;
};

const processEnterpriseLocationData = (locationData, mode) => {
  // Advanced processing for enterprise location data
  if (mode === TRACKING_MODES.CONSTRUCTION) {
    // Construction-specific processing
  } else if (mode === TRACKING_MODES.GOVERNMENT) {
    // Government-specific processing
  }
};

const sendLocationToEnterpriseServices = async (locationData, context) => {
  // Send to multiple enterprise services
};

const getBatteryLevel = async () => {
  // Implementation would get battery level
  return null;
};

const calculateBatteryEfficiency = () => {
  // Calculate battery efficiency based on usage patterns
  return 'high';
};

const getEnterpriseBackgroundTask = (mode) => {
  const taskMap = {
    [TRACKING_MODES.CONSTRUCTION]: BACKGROUND_TASKS.CONSTRUCTION_MONITORING,
    [TRACKING_MODES.GOVERNMENT]: BACKGROUND_TASKS.GOVERNMENT_COMPLIANCE,
    [TRACKING_MODES.EMERGENCY]: BACKGROUND_TASKS.LOCATION_TRACKING,
  };
  
  return taskMap[mode] || BACKGROUND_TASKS.LOCATION_TRACKING;
};

const getEnterpriseTrackingNotificationTitle = (mode) => {
  const titles = {
    [TRACKING_MODES.CONSTRUCTION]: 'Construction Site Tracking',
    [TRACKING_MODES.GOVERNMENT]: 'Government Project Monitoring',
    [TRACKING_MODES.EMERGENCY]: 'Emergency Location Tracking',
  };
  
  return titles[mode] || 'Location Tracking';
};

const getEnterpriseTrackingNotificationBody = (mode) => {
  const bodies = {
    [TRACKING_MODES.CONSTRUCTION]: 'Your location is being tracked for construction site safety',
    [TRACKING_MODES.GOVERNMENT]: 'Government project location monitoring in progress',
    [TRACKING_MODES.EMERGENCY]: 'Emergency location sharing active',
  };
  
  return bodies[mode] || 'Your location is being tracked in the background';
};

export default useLocation;