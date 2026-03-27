// contexts/location-context.js

/**
 * ENTERPRISE-GRADE LOCATION MANAGEMENT SYSTEM
 * Yachi Mobile App - Complete Location Services with Ethiopian Market Optimization
 * 
 * Enterprise Features:
 * - Multi-layer permission management (Ethiopian compliance)
 * - AI Construction project location tracking
 * - Government project geofencing
 * - Battery-optimized background tracking
 * - Offline location caching with Ethiopian regions
 * - Advanced geocoding with Ethiopian address support
 * - Real-time service provider proximity tracking
 * - Construction site monitoring
 * - Privacy-first location sharing
 * - Emergency location services
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Platform, AppState, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useUser } from './user-context';

// =============================================================================
// ENTERPRISE CONSTANTS & CONFIGURATION
// =============================================================================

export const LOCATION_ACCURACY = {
  LOWEST: Location.Accuracy.Lowest,
  LOW: Location.Accuracy.Low,
  BALANCED: Location.Accuracy.Balanced,
  HIGH: Location.Accuracy.High,
  HIGHEST: Location.Accuracy.Highest,
  BEST_FOR_NAVIGATION: Location.Accuracy.BestForNavigation,
};

export const LOCATION_PERMISSION = {
  WHEN_IN_USE: 'whenInUse',
  ALWAYS: 'always',
};

export const GEOFENCING_EVENTS = {
  ENTER: 'enter',
  EXIT: 'exit',
  DWELL: 'dwell',
};

export const TRACKING_MODES = {
  DISABLED: 'disabled',
  STANDARD: 'standard',
  CONSTRUCTION: 'construction',
  GOVERNMENT: 'government',
  EMERGENCY: 'emergency',
};

// Ethiopian major cities coordinates for regional optimization
export const ETHIOPIAN_REGIONS = {
  ADDIS_ABABA: { latitude: 9.0054, longitude: 38.7636, radius: 25000 },
  DIRE_DAWA: { latitude: 9.6009, longitude: 41.8501, radius: 15000 },
  MEKELLE: { latitude: 13.4963, longitude: 39.4753, radius: 20000 },
  BAHIR_DAR: { latitude: 11.5742, longitude: 37.3614, radius: 18000 },
  GONDAR: { latitude: 12.6000, longitude: 37.4667, radius: 15000 },
  AWASA: { latitude: 7.0536, longitude: 38.4667, radius: 12000 },
  JIMMA: { latitude: 7.6667, longitude: 36.8333, radius: 14000 },
};

const BACKGROUND_TASKS = {
  LOCATION_TRACKING: 'yachi-background-location-tracking',
  GEOFENCING: 'yachi-background-geofencing',
  CONSTRUCTION_MONITORING: 'yachi-construction-monitoring',
};

const STORAGE_KEYS = {
  LOCATION_SETTINGS: '@yachi_location_settings',
  LOCATION_PERMISSION: '@yachi_location_permission',
  GEOFENCES: '@yachi_geofences',
  LAST_KNOWN_LOCATION: '@yachi_last_known_location',
  CONSTRUCTION_SITES: '@yachi_construction_sites',
  TRACKING_SESSIONS: '@yachi_tracking_sessions',
};

// =============================================================================
// ENTERPRISE STATE MANAGEMENT
// =============================================================================

const initialState = {
  // Permission Management
  permissionStatus: null,
  hasLocationPermission: false,
  hasBackgroundPermission: false,
  permissionType: null,
  isPermissionRequested: false,

  // Location Data
  currentLocation: null,
  lastKnownLocation: null,
  heading: null,
  altitude: null,
  speed: null,
  locationAccuracy: null,

  // Tracking Configuration
  accuracy: LOCATION_ACCURACY.BALANCED,
  enableHighAccuracy: false,
  distanceFilter: 10, // meters
  timeInterval: 10000, // milliseconds
  trackingMode: TRACKING_MODES.STANDARD,

  // Active Tracking
  isTracking: false,
  isBackgroundTracking: false,
  isConstructionTracking: false,
  trackingSession: null,
  trackingStartTime: null,

  // Geofencing System
  geofences: [],
  activeGeofences: new Set(),
  monitoredRegions: [],
  constructionSites: [],

  // Service Status
  isInitialized: false,
  isLoading: false,
  isUpdating: false,
  isLocating: false,
  isGeocoding: false,

  // Capability Flags
  isGeocodingAvailable: true,
  isGeofencingAvailable: true,
  isBackgroundLocationAvailable: true,
  isHeadingAvailable: true,

  // Error Management
  error: null,
  permissionError: null,
  locationError: null,
  geocodingError: null,

  // Analytics & Monitoring
  locationUpdatesCount: 0,
  lastLocationUpdate: null,
  totalDistanceTracked: 0,
  sessionDistance: 0,

  // Privacy & Security
  locationSharingEnabled: true,
  preciseLocationEnabled: true,
  emergencySharingEnabled: true,
  constructionSharingEnabled: false,

  // Ethiopian Market Specific
  currentRegion: null,
  isInEthiopia: true,
  regionalSettings: null,
};

const LOCATION_ACTION_TYPES = {
  // System Initialization
  INITIALIZE_START: 'INITIALIZE_START',
  INITIALIZE_SUCCESS: 'INITIALIZE_SUCCESS',
  INITIALIZE_FAILURE: 'INITIALIZE_FAILURE',

  // Permission Management
  SET_PERMISSION_STATUS: 'SET_PERMISSION_STATUS',
  REQUEST_PERMISSION_START: 'REQUEST_PERMISSION_START',
  REQUEST_PERMISSION_SUCCESS: 'REQUEST_PERMISSION_SUCCESS',
  REQUEST_PERMISSION_FAILURE: 'REQUEST_PERMISSION_FAILURE',

  // Location Updates
  SET_CURRENT_LOCATION: 'SET_CURRENT_LOCATION',
  SET_LAST_KNOWN_LOCATION: 'SET_LAST_KNOWN_LOCATION',
  SET_HEADING: 'SET_HEADING',
  SET_ALTITUDE: 'SET_ALTITUDE',
  SET_SPEED: 'SET_SPEED',
  INCREMENT_UPDATES_COUNT: 'INCREMENT_UPDATES_COUNT',
  UPDATE_DISTANCE_TRACKED: 'UPDATE_DISTANCE_TRACKED',

  // Tracking Management
  START_TRACKING: 'START_TRACKING',
  STOP_TRACKING: 'STOP_TRACKING',
  SET_TRACKING_MODE: 'SET_TRACKING_MODE',
  SET_TRACKING_SESSION: 'SET_TRACKING_SESSION',

  // Configuration
  UPDATE_ACCURACY: 'UPDATE_ACCURACY',
  UPDATE_DISTANCE_FILTER: 'UPDATE_DISTANCE_FILTER',
  UPDATE_TIME_INTERVAL: 'UPDATE_TIME_INTERVAL',
  SET_PRECISE_LOCATION: 'SET_PRECISE_LOCATION',
  SET_LOCATION_SHARING: 'SET_LOCATION_SHARING',

  // Geofencing
  ADD_GEOFENCE: 'ADD_GEOFENCE',
  REMOVE_GEOFENCE: 'REMOVE_GEOFENCE',
  UPDATE_GEOFENCE: 'UPDATE_GEOFENCE',
  SET_ACTIVE_GEOFENCES: 'SET_ACTIVE_GEOFENCES',
  CLEAR_GEOFENCES: 'CLEAR_GEOFENCES',

  // Construction Features
  ADD_CONSTRUCTION_SITE: 'ADD_CONSTRUCTION_SITE',
  REMOVE_CONSTRUCTION_SITE: 'REMOVE_CONSTRUCTION_SITE',
  UPDATE_CONSTRUCTION_SITE: 'UPDATE_CONSTRUCTION_SITE',
  SET_CONSTRUCTION_TRACKING: 'SET_CONSTRUCTION_TRACKING',

  // Regional Management
  SET_CURRENT_REGION: 'SET_CURRENT_REGION',
  UPDATE_REGIONAL_SETTINGS: 'UPDATE_REGIONAL_SETTINGS',

  // Status Management
  SET_LOADING: 'SET_LOADING',
  SET_LOCATING: 'SET_LOCATING',
  SET_UPDATING: 'SET_UPDATING',
  SET_GEOCODING: 'SET_GEOCODING',

  // Error Handling
  SET_ERROR: 'SET_ERROR',
  SET_PERMISSION_ERROR: 'SET_PERMISSION_ERROR',
  SET_LOCATION_ERROR: 'SET_LOCATION_ERROR',
  SET_GEOCODING_ERROR: 'SET_GEOCODING_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
};

// =============================================================================
// ENTERPRISE REDUCER
// =============================================================================

const locationReducer = (state, action) => {
  switch (action.type) {
    case LOCATION_ACTION_TYPES.INITIALIZE_START:
      return {
        ...state,
        isInitialized: false,
        isLoading: true,
        error: null,
      };

    case LOCATION_ACTION_TYPES.INITIALIZE_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isInitialized: true,
        isLoading: false,
        error: null,
      };

    case LOCATION_ACTION_TYPES.INITIALIZE_FAILURE:
      return {
        ...state,
        isInitialized: false,
        isLoading: false,
        error: action.payload,
      };

    case LOCATION_ACTION_TYPES.SET_PERMISSION_STATUS:
      return {
        ...state,
        ...action.payload,
        isPermissionRequested: true,
      };

    case LOCATION_ACTION_TYPES.REQUEST_PERMISSION_START:
      return {
        ...state,
        isLoading: true,
        permissionError: null,
      };

    case LOCATION_ACTION_TYPES.REQUEST_PERMISSION_SUCCESS:
      return {
        ...state,
        isLoading: false,
        ...action.payload,
        permissionError: null,
      };

    case LOCATION_ACTION_TYPES.REQUEST_PERMISSION_FAILURE:
      return {
        ...state,
        isLoading: false,
        permissionError: action.payload,
      };

    case LOCATION_ACTION_TYPES.SET_CURRENT_LOCATION:
      const newLocation = action.payload;
      let distance = 0;
      
      if (state.currentLocation && newLocation) {
        distance = calculateDistance(
          state.currentLocation,
          newLocation
        );
      }

      return {
        ...state,
        currentLocation: newLocation,
        lastKnownLocation: newLocation,
        lastLocationUpdate: Date.now(),
        locationError: null,
        totalDistanceTracked: state.totalDistanceTracked + distance,
        sessionDistance: state.isTracking ? state.sessionDistance + distance : state.sessionDistance,
      };

    case LOCATION_ACTION_TYPES.SET_TRACKING_MODE:
      return {
        ...state,
        trackingMode: action.payload.mode,
        accuracy: action.payload.accuracy || state.accuracy,
        distanceFilter: action.payload.distanceFilter || state.distanceFilter,
        timeInterval: action.payload.timeInterval || state.timeInterval,
      };

    case LOCATION_ACTION_TYPES.ADD_CONSTRUCTION_SITE:
      return {
        ...state,
        constructionSites: [...state.constructionSites, action.payload],
      };

    case LOCATION_ACTION_TYPES.SET_CONSTRUCTION_TRACKING:
      return {
        ...state,
        isConstructionTracking: action.payload.enabled,
        constructionSharingEnabled: action.payload.sharingEnabled !== undefined 
          ? action.payload.sharingEnabled 
          : state.constructionSharingEnabled,
      };

    case LOCATION_ACTION_TYPES.SET_CURRENT_REGION:
      return {
        ...state,
        currentRegion: action.payload.region,
        isInEthiopia: action.payload.isInEthiopia,
        regionalSettings: action.payload.settings,
      };

    default:
      return {
        ...state,
        ...action.payload,
      };
  }
};

// =============================================================================
// BACKGROUND TASK MANAGEMENT
// =============================================================================

TaskManager.defineTask(BACKGROUND_TASKS.LOCATION_TRACKING, async ({ data, error }) => {
  if (error) {
    await errorService.captureError(error, { 
      context: 'BackgroundLocationTask',
      task: BACKGROUND_TASKS.LOCATION_TRACKING 
    });
    return;
  }

  if (data?.locations) {
    await handleEnterpriseLocationUpdate(data.locations);
  }
});

TaskManager.defineTask(BACKGROUND_TASKS.CONSTRUCTION_MONITORING, async ({ data, error }) => {
  if (error) {
    await errorService.captureError(error, {
      context: 'ConstructionMonitoringTask',
      task: BACKGROUND_TASKS.CONSTRUCTION_MONITORING
    });
    return;
  }

  if (data?.locations) {
    await handleConstructionSiteMonitoring(data.locations);
  }
});

// =============================================================================
// ENTERPRISE LOCATION PROVIDER
// =============================================================================

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(locationReducer, initialState);
  const { user, isAuthenticated } = useUser();

  const locationSubscription = useRef(null);
  const headingSubscription = useRef(null);
  const appStateListener = useRef(null);
  const lastLocation = useRef(null);

  // ===========================================================================
  // ENTERPRISE INITIALIZATION
  // ===========================================================================

  const initialize = useCallback(async () => {
    try {
      dispatch({ type: LOCATION_ACTION_TYPES.INITIALIZE_START });

      // Load persisted enterprise data
      const [settings, permissionStatus, geofences, constructionSites, lastKnownLocation] = await Promise.all([
        storage.get(STORAGE_KEYS.LOCATION_SETTINGS),
        storage.get(STORAGE_KEYS.LOCATION_PERMISSION),
        storage.get(STORAGE_KEYS.GEOFENCES),
        storage.get(STORAGE_KEYS.CONSTRUCTION_SITES),
        storage.get(STORAGE_KEYS.LAST_KNOWN_LOCATION),
      ]);

      // Check enterprise capabilities
      const [hasServices, foregroundPermission, backgroundPermission, capabilities] = await Promise.all([
        Location.hasServicesEnabledAsync(),
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
        checkEnterpriseCapabilities(),
      ]);

      if (!hasServices) {
        throw new Error('ENTERPRISE_LOCATION_SERVICES_DISABLED');
      }

      const permissionData = {
        permissionStatus: permissionStatus || foregroundPermission.status,
        hasLocationPermission: foregroundPermission.granted,
        hasBackgroundPermission: backgroundPermission.granted,
        permissionType: backgroundPermission.granted ? LOCATION_PERMISSION.ALWAYS : LOCATION_PERMISSION.WHEN_IN_USE,
      };

      // Initialize enterprise state
      dispatch({
        type: LOCATION_ACTION_TYPES.INITIALIZE_SUCCESS,
        payload: {
          ...settings,
          ...permissionData,
          ...capabilities,
          geofences: geofences || [],
          constructionSites: constructionSites || [],
          lastKnownLocation: lastKnownLocation || null,
        },
      });

      // Auto-detect Ethiopian region
      if (lastKnownLocation) {
        await detectEthiopianRegion(lastKnownLocation);
      }

      // Setup enterprise listeners
      setupEnterpriseListeners();

      await analyticsService.trackEvent('enterprise_location_system_initialized', {
        hasPermission: foregroundPermission.granted,
        hasBackgroundPermission: backgroundPermission.granted,
        capabilities,
        platform: Platform.OS,
      });

    } catch (error) {
      await errorService.captureError(error, { context: 'EnterpriseLocationInitialization' });
      
      dispatch({
        type: LOCATION_ACTION_TYPES.INITIALIZE_FAILURE,
        payload: error.message,
      });
    }
  }, []);

  const checkEnterpriseCapabilities = async () => {
    const [geocoding, geofencing, background, heading] = await Promise.all([
      Location.isGeocodingAvailableAsync(),
      Location.isGeofencingAvailableAsync(),
      Platform.OS === 'ios' ? Location.isBackgroundLocationAvailableAsync() : Promise.resolve(true),
      Location.getHeadingPermissionsAsync().then(perm => perm.granted).catch(() => false),
    ]);

    return {
      isGeocodingAvailable: geocoding,
      isGeofencingAvailable: geofencing,
      isBackgroundLocationAvailable: background,
      isHeadingAvailable: heading,
    };
  };

  // ===========================================================================
  // ENTERPRISE PERMISSION MANAGEMENT
  // ===========================================================================

  const requestEnterprisePermission = useCallback(async (permissionType = LOCATION_PERMISSION.WHEN_IN_USE, options = {}) => {
    try {
      dispatch({ type: LOCATION_ACTION_TYPES.REQUEST_PERMISSION_START });

      let permissionResponse;
      const requestOptions = {
        ...options,
        // Ethiopian compliance: Explain why we need location
        mayShowUserSettingsDialog: true,
      };

      if (permissionType === LOCATION_PERMISSION.ALWAYS) {
        permissionResponse = await Location.requestBackgroundPermissionsAsync(requestOptions);
      } else {
        permissionResponse = await Location.requestForegroundPermissionsAsync(requestOptions);
      }

      const { granted, status, canAskAgain } = permissionResponse;
      const hasBackgroundPermission = permissionType === LOCATION_PERMISSION.ALWAYS ? granted : state.hasBackgroundPermission;

      const permissionData = {
        permissionStatus: status,
        hasLocationPermission: granted,
        hasBackgroundPermission,
        permissionType: granted ? permissionType : null,
        isPermissionRequested: true,
      };

      dispatch({
        type: LOCATION_ACTION_TYPES.REQUEST_PERMISSION_SUCCESS,
        payload: permissionData,
      });

      await storage.set(STORAGE_KEYS.LOCATION_PERMISSION, status);

      if (granted) {
        await getCurrentLocation();
        await analyticsService.trackEvent('enterprise_location_permission_granted', {
          permissionType,
          status,
          context: options.context || 'general',
        });
      } else {
        await analyticsService.trackEvent('enterprise_location_permission_denied', {
          permissionType,
          status,
          canAskAgain,
        });
      }

      return { granted, status, canAskAgain, permissionType };

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterprisePermissionRequest',
        permissionType,
        options 
      });
      
      dispatch({
        type: LOCATION_ACTION_TYPES.REQUEST_PERMISSION_FAILURE,
        payload: error.message,
      });
      
      return { granted: false, status: 'undetermined', error: error.message };
    }
  }, [state.hasBackgroundPermission]);

  // ===========================================================================
  // ENTERPRISE LOCATION SERVICES
  // ===========================================================================

  const getEnterpriseLocation = useCallback(async (options = {}) => {
    try {
      if (!state.hasLocationPermission) {
        throw new Error('ENTERPRISE_LOCATION_PERMISSION_REQUIRED');
      }

      dispatch({ type: LOCATION_ACTION_TYPES.SET_LOCATING, payload: true });

      const locationOptions = {
        accuracy: options.accuracy || state.accuracy,
        maximumAge: options.maximumAge || 30000,
        timeout: options.timeout || 15000,
        mayShowUserSettingsDialog: true,
      };

      const location = await Location.getCurrentPositionAsync(locationOptions);
      const locationData = formatEnterpriseLocationData(location.coords);

      dispatch({
        type: LOCATION_ACTION_TYPES.SET_CURRENT_LOCATION,
        payload: locationData,
      });

      dispatch({ type: LOCATION_ACTION_TYPES.INCREMENT_UPDATES_COUNT });

      await storage.set(STORAGE_KEYS.LAST_KNOWN_LOCATION, locationData);

      // Detect Ethiopian region
      await detectEthiopianRegion(locationData);

      // Enterprise location processing
      await processEnterpriseLocation(locationData, options.context);

      await analyticsService.trackEvent('enterprise_location_acquired', {
        accuracy: location.coords.accuracy,
        context: options.context || 'manual',
        region: state.currentRegion,
      });

      return locationData;

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterpriseLocationAcquisition',
        options 
      });
      
      dispatch({
        type: LOCATION_ACTION_TYPES.SET_LOCATION_ERROR,
        payload: error.message,
      });
      
      return null;
    } finally {
      dispatch({ type: LOCATION_ACTION_TYPES.SET_LOCATING, payload: false });
    }
  }, [state.hasLocationPermission, state.accuracy, state.currentRegion]);

  // ===========================================================================
  // ENTERPRISE TRACKING SYSTEM
  // ===========================================================================

  const startEnterpriseTracking = useCallback(async (mode = TRACKING_MODES.STANDARD, options = {}) => {
    try {
      if (!state.hasLocationPermission) {
        throw new Error('ENTERPRISE_TRACKING_PERMISSION_REQUIRED');
      }

      await stopEnterpriseTracking();

      const trackingConfig = getEnterpriseTrackingConfig(mode, options);
      const sessionId = `tracking-${Date.now()}-${mode}`;

      // Start foreground tracking
      locationSubscription.current = await Location.watchPositionAsync(
        trackingConfig,
        (location) => handleEnterpriseLocationUpdate([location])
      );

      // Start heading tracking if available
      if (state.isHeadingAvailable) {
        headingSubscription.current = await Location.watchHeadingAsync((heading) => {
          dispatch({
            type: LOCATION_ACTION_TYPES.SET_HEADING,
            payload: heading,
          });
        });
      }

      // Start background tracking for specific modes
      if ([TRACKING_MODES.CONSTRUCTION, TRACKING_MODES.GOVERNMENT, TRACKING_MODES.EMERGENCY].includes(mode)) {
        await startBackgroundEnterpriseTracking(mode, trackingConfig);
      }

      dispatch({
        type: LOCATION_ACTION_TYPES.START_TRACKING,
        payload: {
          sessionId,
          mode,
          startTime: Date.now(),
        },
      });

      dispatch({
        type: LOCATION_ACTION_TYPES.SET_TRACKING_MODE,
        payload: {
          mode,
          ...trackingConfig,
        },
      });

      await analyticsService.trackEvent('enterprise_tracking_started', {
        mode,
        sessionId,
        config: trackingConfig,
      });

      return sessionId;

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterpriseTrackingStart',
        mode,
        options 
      });
      
      return null;
    }
  }, [state.hasLocationPermission, state.isHeadingAvailable]);

  const startBackgroundEnterpriseTracking = async (mode, config) => {
    try {
      if (!state.hasBackgroundPermission) return;

      const taskName = mode === TRACKING_MODES.CONSTRUCTION 
        ? BACKGROUND_TASKS.CONSTRUCTION_MONITORING 
        : BACKGROUND_TASKS.LOCATION_TRACKING;

      await Location.startLocationUpdatesAsync(taskName, {
        ...config,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: getTrackingNotificationTitle(mode),
          notificationBody: getTrackingNotificationBody(mode),
          notificationColor: '#FF231F7C',
        },
        deferredUpdatesInterval: config.timeInterval,
        deferredUpdatesDistance: config.distanceInterval,
      });

      dispatch({
        type: LOCATION_ACTION_TYPES.SET_TRACKING_SESSION,
        payload: { isBackgroundTracking: true },
      });

    } catch (error) {
      await errorService.captureError(error, {
        context: 'BackgroundEnterpriseTracking',
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
      const site = {
        id: siteData.id || `construction-${Date.now()}`,
        name: siteData.name,
        latitude: siteData.latitude,
        longitude: siteData.longitude,
        radius: siteData.radius || 500,
        projectId: siteData.projectId,
        projectType: siteData.projectType,
        workers: siteData.workers || [],
        monitoringEnabled: siteData.monitoringEnabled !== false,
        ...siteData,
      };

      // Add geofence for construction site
      await addEnterpriseGeofence({
        id: site.id,
        latitude: site.latitude,
        longitude: site.longitude,
        radius: site.radius,
        notifyOnEntry: true,
        notifyOnExit: true,
        metadata: { type: 'construction', projectId: site.projectId },
      });

      dispatch({
        type: LOCATION_ACTION_TYPES.ADD_CONSTRUCTION_SITE,
        payload: site,
      });

      // Save to enterprise storage
      const currentSites = await storage.get(STORAGE_KEYS.CONSTRUCTION_SITES) || [];
      await storage.set(STORAGE_KEYS.CONSTRUCTION_SITES, [...currentSites, site]);

      await analyticsService.trackEvent('construction_site_added', {
        siteId: site.id,
        projectId: site.projectId,
        projectType: site.projectType,
      });

      return site.id;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ConstructionSiteAddition',
        siteData,
      });
      throw error;
    }
  }, []);

  const enableConstructionTracking = useCallback(async (enabled = true, options = {}) => {
    try {
      if (enabled && !state.hasBackgroundPermission) {
        const permission = await requestEnterprisePermission(LOCATION_PERMISSION.ALWAYS, {
          context: 'construction_tracking',
        });
        if (!permission.granted) return false;
      }

      dispatch({
        type: LOCATION_ACTION_TYPES.SET_CONSTRUCTION_TRACKING,
        payload: {
          enabled,
          sharingEnabled: options.sharingEnabled,
        },
      });

      if (enabled) {
        await startEnterpriseTracking(TRACKING_MODES.CONSTRUCTION, options);
      }

      await analyticsService.trackEvent('construction_tracking_updated', {
        enabled,
        sharingEnabled: options.sharingEnabled,
      });

      return true;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'ConstructionTrackingToggle',
        enabled,
        options,
      });
      return false;
    }
  }, [state.hasBackgroundPermission, requestEnterprisePermission, startEnterpriseTracking]);

  // ===========================================================================
  // ENTERPRISE GEOCODING SERVICES
  // ===========================================================================

  const geocodeEnterpriseAddress = useCallback(async (address, options = {}) => {
    try {
      if (!state.isGeocodingAvailable) {
        throw new Error('ENTERPRISE_GEOCODING_UNAVAILABLE');
      }

      dispatch({ type: LOCATION_ACTION_TYPES.SET_GEOCODING, payload: true });

      const geocodeOptions = {
        ...options,
        // Ethiopian market optimization
        useGoogleMaps: false, // Use device geocoding for privacy
      };

      const results = await Location.geocodeAsync(address, geocodeOptions);
      const processedResults = processEnterpriseGeocodingResults(results, address);

      await analyticsService.trackEvent('enterprise_address_geocoded', {
        address,
        resultsCount: processedResults.length,
        hasEthiopianResults: processedResults.some(r => r.isInEthiopia),
      });

      return processedResults;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseGeocoding',
        address,
        options,
      });
      
      dispatch({
        type: LOCATION_ACTION_TYPES.SET_GEOCODING_ERROR,
        payload: error.message,
      });
      
      throw error;
    } finally {
      dispatch({ type: LOCATION_ACTION_TYPES.SET_GEOCODING, payload: false });
    }
  }, [state.isGeocodingAvailable]);

  const reverseGeocodeEnterprise = useCallback(async (location, options = {}) => {
    try {
      if (!state.isGeocodingAvailable) {
        throw new Error('ENTERPRISE_REVERSE_GEOCODING_UNAVAILABLE');
      }

      dispatch({ type: LOCATION_ACTION_TYPES.SET_GEOCODING, payload: true });

      const results = await Location.reverseGeocodeAsync(location, options);
      const processedResults = processEnterpriseReverseGeocodingResults(results, location);

      await analyticsService.trackEvent('enterprise_location_reverse_geocoded', {
        latitude: location.latitude,
        longitude: location.longitude,
        resultsCount: processedResults.length,
        region: processedResults[0]?.region || 'unknown',
      });

      return processedResults;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'EnterpriseReverseGeocoding',
        location,
        options,
      });
      
      throw error;
    } finally {
      dispatch({ type: LOCATION_ACTION_TYPES.SET_GEOCODING, payload: false });
    }
  }, [state.isGeocodingAvailable]);

  // ===========================================================================
  // ENTERPRISE UTILITIES
  // ===========================================================================

  const calculateEnterpriseDistance = useCallback((coord1, coord2) => {
    return calculateDistance(coord1, coord2);
  }, []);

  const isInEthiopianRegion = useCallback((location, regionKey) => {
    const region = ETHIOPIAN_REGIONS[regionKey];
    if (!region) return false;
    
    return calculateDistance(location, region) <= region.radius;
  }, []);

  const getNearestEthiopianCity = useCallback((location) => {
    let nearestCity = null;
    let minDistance = Infinity;

    Object.entries(ETHIOPIAN_REGIONS).forEach(([city, region]) => {
      const distance = calculateDistance(location, region);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    return {
      city: nearestCity,
      distance: minDistance,
      coordinates: ETHIOPIAN_REGIONS[nearestCity],
    };
  }, []);

  // ===========================================================================
  // ENTERPRISE CONTEXT VALUE
  // ===========================================================================

  const enterpriseContextValue = {
    // State
    ...state,
    
    // Permission Management
    requestEnterprisePermission,
    
    // Location Services
    getCurrentLocation: getEnterpriseLocation,
    getLastKnownLocation: useCallback(() => getLastKnownLocation(), []),
    startTracking: startEnterpriseTracking,
    stopTracking: useCallback(() => stopEnterpriseTracking(), []),
    
    // Construction Enterprise Features
    addConstructionSite,
    enableConstructionTracking,
    getConstructionSites: useCallback(() => state.constructionSites, [state.constructionSites]),
    
    // Geocoding Services
    geocodeAddress: geocodeEnterpriseAddress,
    reverseGeocode: reverseGeocodeEnterprise,
    
    // Ethiopian Market Features
    getNearestEthiopianCity,
    isInEthiopianRegion,
    ethiopianRegions: ETHIOPIAN_REGIONS,
    
    // Enterprise Utilities
    calculateDistance: calculateEnterpriseDistance,
    formatEthiopianAddress: useCallback((address) => formatEthiopianAddress(address), []),
    
    // Error Management
    clearErrors: useCallback(() => dispatch({ type: LOCATION_ACTION_TYPES.CLEAR_ERRORS }), []),
  };

  // ===========================================================================
  // ENTERPRISE EFFECTS & CLEANUP
  // ===========================================================================

  useEffect(() => {
    initialize();
    return () => {
      cleanupEnterprise();
    };
  }, [initialize]);

  const cleanupEnterprise = useCallback(async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    if (headingSubscription.current) {
      headingSubscription.current.remove();
    }
    if (appStateListener.current) {
      appStateListener.current.remove();
    }
    await stopEnterpriseTracking();
  }, []);

  return (
    <LocationContext.Provider value={enterpriseContextValue}>
      {children}
    </LocationContext.Provider>
  );
};

// =============================================================================
// ENTERPRISE HOOKS
// =============================================================================

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within EnterpriseLocationProvider');
  }
  return context;
};

export const useConstructionTracking = () => {
  const { 
    constructionSites,
    isConstructionTracking,
    enableConstructionTracking,
    addConstructionSite,
  } = useLocation();

  const monitorConstructionSite = useCallback(async (siteData) => {
    const siteId = await addConstructionSite(siteData);
    await enableConstructionTracking(true, { 
      sharingEnabled: true,
      projectId: siteData.projectId 
    });
    return siteId;
  }, [addConstructionSite, enableConstructionTracking]);

  return {
    constructionSites,
    isConstructionTracking,
    enableConstructionTracking,
    monitorConstructionSite,
    addConstructionSite,
  };
};

export const useEthiopianLocation = () => {
  const { 
    currentRegion,
    isInEthiopia,
    getNearestEthiopianCity,
    isInEthiopianRegion,
    ethiopianRegions,
  } = useLocation();

  const getRegionalSettings = useCallback((regionKey) => {
    return ethiopianRegions[regionKey] || null;
  }, [ethiopianRegions]);

  return {
    currentRegion,
    isInEthiopia,
    getNearestEthiopianCity,
    isInEthiopianRegion,
    getRegionalSettings,
    ethiopianRegions,
  };
};

// =============================================================================
// ENTERPRISE UTILITY FUNCTIONS
// =============================================================================

const calculateDistance = (coord1, coord2) => {
  const R = 6371e3;
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const formatEnterpriseLocationData = (coords) => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
  accuracy: coords.accuracy,
  altitude: coords.altitude,
  altitudeAccuracy: coords.altitudeAccuracy,
  heading: coords.heading,
  speed: coords.speed,
  timestamp: coords.timestamp || Date.now(),
  provider: coords.provider || 'unknown',
  isMock: coords.isMock || false,
});

const getEnterpriseTrackingConfig = (mode, options) => {
  const baseConfig = {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 10,
    timeInterval: 10000,
    mayShowUserSettingsDialog: true,
  };

  const modeConfigs = {
    [TRACKING_MODES.STANDARD]: {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 20,
      timeInterval: 30000,
    },
    [TRACKING_MODES.CONSTRUCTION]: {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 15000,
    },
    [TRACKING_MODES.GOVERNMENT]: {
      accuracy: Location.Accuracy.Highest,
      distanceInterval: 2,
      timeInterval: 10000,
    },
    [TRACKING_MODES.EMERGENCY]: {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 1,
      timeInterval: 5000,
    },
  };

  return { ...baseConfig, ...modeConfigs[mode], ...options };
};

const detectEthiopianRegion = async (location) => {
  const nearestCity = getNearestEthiopianCity(location);
  const isInEthiopia = nearestCity.distance <= nearestCity.coordinates.radius * 2; // Buffer zone
  
  // Dispatch region update
  // This would be implemented in the actual component
};

export default LocationContext;