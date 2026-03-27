/**
 * @file Location Utilities
 * @description Enterprise-level location services with Ethiopian market optimization
 * @version 1.0.0
 * @module utils/location
 */

import { Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { API_CONFIG, LOCATION_CONFIG } from '../constants/api';
import { storage } from './storage';
import { security } from './security';

/**
 * @typedef {Object} Coordinates
 * @property {number} latitude - Latitude coordinate
 * @property {number} longitude - Longitude coordinate
 * @property {number} [accuracy] - Location accuracy in meters
 * @property {number} [altitude] - Altitude in meters
 * @property {number} [heading] - Direction in degrees
 * @property {number} [speed] - Speed in meters per second
 * @property {Date} [timestamp] - When location was captured
 */

/**
 * @typedef {Object} EthiopianAddress
 * @property {string} formattedAddress - Full formatted address
 * @property {string} street - Street name
 * @property {string} [houseNumber] - House or building number
 * @property {string} [subcity] - Subcity name (e.g., Kirkos, Bole)
 * @property {string} city - City name (e.g., Addis Ababa, Dire Dawa)
 * @property {string} region - Region name (e.g., Addis Ababa, Oromia)
 * @property {string} [woreda] - Woreda (district) name
 * @property {string} [kebele] - Kebele (neighborhood) name
 * @property {string} [landmark] - Nearby landmark
 * @property {string} [postalCode] - Postal code if available
 * @property {Coordinates} coordinates - GPS coordinates
 */

/**
 * @typedef {Object} ServiceCoverage
 * @property {string} serviceId - Service identifier
 * @property {string} providerId - Service provider ID
 * @property {string[]} cities - Cities where service is available
 * @property {string[]} regions - Regions where service is available
 * @property {number} travelRadius - Maximum travel radius in km
 * @property {Coordinates} [centerPoint] - Central service location
 * @property {Object} pricing - Distance-based pricing
 * @property {number} pricing.baseTravelFee - Base travel fee in ETB
 * @property {number} pricing.perKmFee - Additional fee per km in ETB
 * @property {number} pricing.maxTravelFee - Maximum travel fee in ETB
 * @property {boolean} providesRemoteService - Whether remote service is available
 */

/**
 * @typedef {Object} DistanceMatrix
 * @property {Coordinates} origin - Starting coordinates
 * @property {Coordinates} destination - Destination coordinates
 * @property {number} distance - Distance in meters
 * @property {number} duration - Travel time in seconds
 * @property {string} [polyline] - Route polyline if available
 * @property {Object} breakdown - Detailed breakdown
 * @property {number} breakdown.distance - Distance in meters
 * @property {number} breakdown.duration - Duration in seconds
 * @property {string} breakdown.distanceText - Human-readable distance
 * @property {string} breakdown.durationText - Human-readable duration
 */

/**
 * @typedef {Object} LocationPermission
 * @property {boolean} granted - Whether permission is granted
 * @property {string} status - Permission status
 * @property {boolean} canAskAgain - Whether can request permission again
 * @property {Object} [settings] - Device location settings
 */

/**
 * @typedef {Object} EthiopianCity
 * @property {string} id - City identifier
 * @property {string} name - City name in English
 * @property {string} nameAmharic - City name in Amharic
 * @property {string} region - Region name
 * @property {Coordinates} coordinates - City center coordinates
 * @property {number} population - Population count
 * @property {string} timezone - Timezone (Africa/Addis_Ababa)
 * @property {string} [areaCode] - Telephone area code
 * @property {Object} bounds - City boundaries
 * @property {Coordinates} bounds.northeast - Northeast boundary
 * @property {Coordinates} bounds.southwest - Southwest boundary
 */

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
    this.locationSubscribers = new Set();
    this.cachedLocations = new Map();
    this.geocodingCache = new Map();
    
    this.ETHIOPIAN_CITIES = this.initializeEthiopianCities();
    this.SERVICE_COVERAGE_RADIUS = LOCATION_CONFIG.DEFAULT_COVERAGE_RADIUS;
    this.GEOCODING_TIMEOUT = LOCATION_CONFIG.GEOCODING_TIMEOUT;
    
    this.init();
  }

  /**
   * Initialize location service
   */
  init() {
    this.setupGeolocationDefaults();
    this.loadCachedLocation();
  }

  /**
   * Setup geolocation default configuration
   */
  setupGeolocationDefaults() {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: 'whenInUse',
      locationProvider: 'auto',
    });
  }

  /**
   * Initialize Ethiopian cities database
   * @returns {EthiopianCity[]}
   */
  initializeEthiopianCities() {
    return [
      {
        id: 'addis_ababa',
        name: 'Addis Ababa',
        nameAmharic: 'አዲስ አበባ',
        region: 'Addis Ababa',
        coordinates: { latitude: 9.0054, longitude: 38.7636 },
        population: 5200000,
        timezone: 'Africa/Addis_Ababa',
        areaCode: '011',
        bounds: {
          northeast: { latitude: 9.1734, longitude: 38.8895 },
          southwest: { latitude: 8.8271, longitude: 38.6372 }
        }
      },
      {
        id: 'dire_dawa',
        name: 'Dire Dawa',
        nameAmharic: 'ድሬ ዳዋ',
        region: 'Dire Dawa',
        coordinates: { latitude: 9.5892, longitude: 41.8662 },
        population: 506000,
        timezone: 'Africa/Addis_Ababa',
        areaCode: '025',
        bounds: {
          northeast: { latitude: 9.6492, longitude: 41.9262 },
          southwest: { latitude: 9.5292, longitude: 41.8062 }
        }
      },
      {
        id: 'mekelle',
        name: 'Mekelle',
        nameAmharic: 'መቀሌ',
        region: 'Tigray',
        coordinates: { latitude: 13.4963, longitude: 39.4753 },
        population: 480000,
        timezone: 'Africa/Addis_Ababa',
        areaCode: '034',
        bounds: {
          northeast: { latitude: 13.5563, longitude: 39.5353 },
          southwest: { latitude: 13.4363, longitude: 39.4153 }
        }
      },
      {
        id: 'bahir_dar',
        name: 'Bahir Dar',
        nameAmharic: 'ባሕር ዳር',
        region: 'Amhara',
        coordinates: { latitude: 11.5742, longitude: 37.3614 },
        population: 348000,
        timezone: 'Africa/Addis_Ababa',
        areaCode: '058',
        bounds: {
          northeast: { latitude: 11.6342, longitude: 37.4214 },
          southwest: { latitude: 11.5142, longitude: 37.3014 }
        }
      },
      {
        id: 'hawassa',
        name: 'Hawassa',
        nameAmharic: 'አዋሳ',
        region: 'Sidama',
        coordinates: { latitude: 7.0470, longitude: 38.4660 },
        population: 398000,
        timezone: 'Africa/Addis_Ababa',
        areaCode: '046',
        bounds: {
          northeast: { latitude: 7.1070, longitude: 38.5260 },
          southwest: { latitude: 6.9870, longitude: 38.4060 }
        }
      },
      {
        id: 'jimma',
        name: 'Jimma',
        nameAmharic: 'ጅማ',
        region: 'Oromia',
        coordinates: { latitude: 7.6667, longitude: 36.8333 },
        population: 207000,
        timezone: 'Africa/Addis_Ababa',
        areaCode: '047',
        bounds: {
          northeast: { latitude: 7.7267, longitude: 36.8933 },
          southwest: { latitude: 7.6067, longitude: 36.7733 }
        }
      },
      {
        id: 'gondar',
        name: 'Gondar',
        nameAmharic: 'ጎንደር',
        region: 'Amhara',
        coordinates: { latitude: 12.6000, longitude: 37.4667 },
        population: 443000,
        timezone: 'Africa/Addis_Ababa',
        areaCode: '058',
        bounds: {
          northeast: { latitude: 12.6600, longitude: 37.5267 },
          southwest: { latitude: 12.5400, longitude: 37.4067 }
        }
      },
      {
        id: 'addis_ababa_subcities',
        name: 'Addis Ababa Subcities',
        nameAmharic: 'አዲስ አበባ ክፍለ ከተማዎች',
        region: 'Addis Ababa',
        coordinates: { latitude: 9.0054, longitude: 38.7636 },
        population: 5200000,
        timezone: 'Africa/Addis_Ababa',
        subcities: [
          { id: 'bole', name: 'Bole', nameAmharic: 'ቦሌ', coordinates: { latitude: 8.9844, longitude: 38.7990 } },
          { id: 'kirkos', name: 'Kirkos', nameAmharic: 'ቂርቆስ', coordinates: { latitude: 9.0157, longitude: 38.7578 } },
          { id: 'yeka', name: 'Yeka', nameAmharic: 'የካ', coordinates: { latitude: 9.0436, longitude: 38.7956 } },
          { id: 'akaki_kaliti', name: 'Akaki Kaliti', nameAmharic: 'አቃቂ ቃሊቲ', coordinates: { latitude: 8.8583, longitude: 38.7667 } },
          { id: 'lideta', name: 'Lideta', nameAmharic: 'ልደታ', coordinates: { latitude: 9.0167, longitude: 38.7333 } },
          { id: 'addis_ketema', name: 'Addis Ketema', nameAmharic: 'አዲስ ከተማ', coordinates: { latitude: 9.0333, longitude: 38.7500 } },
          { id: 'nifas_silk', name: 'Nifas Silk', nameAmharic: 'ንፋስ ስልክ', coordinates: { latitude: 9.0333, longitude: 38.7667 } },
          { id: 'gulele', name: 'Gulele', nameAmharic: 'ጉለሌ', coordinates: { latitude: 9.0667, longitude: 38.7333 } },
          { id: 'kolfe_keranio', name: 'Kolfe Keranio', nameAmharic: 'ኮልፌ ቀራኒዮ', coordinates: { latitude: 9.0500, longitude: 38.7167 } },
          { id: 'arada', name: 'Arada', nameAmharic: 'አራዳ', coordinates: { latitude: 9.0333, longitude: 38.7500 } }
        ]
      }
    ];
  }

  /**
   * Get current device location
   * @param {Object} options - Location options
   * @returns {Promise<Coordinates>}
   */
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000, // 5 minutes
      ...options
    };

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp)
          };

          this.currentLocation = location;
          this.cacheLocation(location);
          this.notifySubscribers(location);
          
          resolve(location);
        },
        (error) => {
          const locationError = this.handleLocationError(error);
          reject(locationError);
        },
        defaultOptions
      );
    });
  }

  /**
   * Start watching location changes
   * @param {Function} callback - Callback for location updates
   * @param {Object} options - Watch options
   * @returns {number} Watch ID
   */
  watchLocation(callback, options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      distanceFilter: 10, // meters
      interval: 10000, // 10 seconds
      ...options
    };

    this.locationSubscribers.add(callback);

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date(position.timestamp)
        };

        this.currentLocation = location;
        this.cacheLocation(location);
        this.notifySubscribers(location);
        
        callback(location);
      },
      (error) => {
        const locationError = this.handleLocationError(error);
        callback(null, locationError);
      },
      defaultOptions
    );

    return this.watchId;
  }

  /**
   * Stop watching location
   * @param {number} watchId - Watch ID to stop
   */
  stopWatchingLocation(watchId = null) {
    const idToStop = watchId || this.watchId;
    if (idToStop) {
      Geolocation.clearWatch(idToStop);
      this.watchId = null;
    }
  }

  /**
   * Subscribe to location updates
   * @param {Function} callback - Callback function
   */
  subscribeToLocation(callback) {
    this.locationSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.locationSubscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of location update
   * @param {Coordinates} location - New location
   */
  notifySubscribers(location) {
    this.locationSubscribers.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location subscriber:', error);
      }
    });
  }

  /**
   * Reverse geocode coordinates to Ethiopian address
   * @param {Coordinates} coordinates - Coordinates to geocode
   * @param {string} [language='en'] - Language for response
   * @returns {Promise<EthiopianAddress>}
   */
  async reverseGeocode(coordinates, language = 'en') {
    const cacheKey = `${coordinates.latitude},${coordinates.longitude},${language}`;
    
    // Check cache first
    if (this.geocodingCache.has(cacheKey)) {
      return this.geocodingCache.get(cacheKey);
    }

    try {
      let address;
      
      if (Platform.OS === 'web') {
        address = await this.reverseGeocodeWeb(coordinates, language);
      } else {
        address = await this.reverseGeocodeNative(coordinates, language);
      }

      // Cache the result
      this.geocodingCache.set(cacheKey, address);
      
      // Set cache expiration
      setTimeout(() => {
        this.geocodingCache.delete(cacheKey);
      }, LOCATION_CONFIG.GEOCODING_CACHE_TTL);

      return address;
    } catch (error) {
      throw this.handleGeocodingError(error);
    }
  }

  /**
   * Reverse geocode for web platform
   * @param {Coordinates} coordinates 
   * @param {string} language 
   * @returns {Promise<EthiopianAddress>}
   */
  async reverseGeocodeWeb(coordinates, language) {
    // Use Google Maps Geocoding API or similar service
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&language=${language}`
    );

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    return this.parseGeocodingResult(data.results[0], coordinates, language);
  }

  /**
   * Reverse geocode for native platforms
   * @param {Coordinates} coordinates 
   * @param {string} language 
   * @returns {Promise<EthiopianAddress>}
   */
  async reverseGeocodeNative(coordinates, language) {
    // Use device's native geocoding capabilities
    // This is a simplified implementation - in practice, use react-native-geocoding
    const city = this.findNearestCity(coordinates);
    
    return {
      formattedAddress: `${city.nameAmharic}, ${city.region}`,
      street: '',
      city: city.name,
      region: city.region,
      coordinates: coordinates,
      landmark: this.findNearestLandmark(coordinates)
    };
  }

  /**
   * Parse geocoding result to Ethiopian address format
   * @param {Object} result - Geocoding API result
   * @param {Coordinates} coordinates - Original coordinates
   * @param {string} language - Response language
   * @returns {EthiopianAddress}
   */
  parseGeocodingResult(result, coordinates, language) {
    const addressComponents = result.address_components;
    const formattedAddress = result.formatted_address;

    // Extract address components
    const street = this.extractAddressComponent(addressComponents, 'route');
    const houseNumber = this.extractAddressComponent(addressComponents, 'street_number');
    const subcity = this.extractAddressComponent(addressComponents, 'sublocality');
    const city = this.extractAddressComponent(addressComponents, 'locality') || 
                 this.extractAddressComponent(addressComponents, 'administrative_area_level_2');
    const region = this.extractAddressComponent(addressComponents, 'administrative_area_level_1');
    const postalCode = this.extractAddressComponent(addressComponents, 'postal_code');

    return {
      formattedAddress: language === 'am' ? this.translateToAmharic(formattedAddress) : formattedAddress,
      street: language === 'am' ? this.translateToAmharic(street) : street,
      houseNumber,
      subcity: language === 'am' ? this.translateToAmharic(subcity) : subcity,
      city: language === 'am' ? this.translateToAmharic(city) : city,
      region: language === 'am' ? this.translateToAmharic(region) : region,
      postalCode,
      coordinates,
      landmark: this.findNearestLandmark(coordinates)
    };
  }

  /**
   * Extract specific component from address components
   * @param {Array} components - Address components
   * @param {string} type - Component type
   * @returns {string}
   */
  extractAddressComponent(components, type) {
    const component = components.find(comp => comp.types.includes(type));
    return component ? component.long_name : '';
  }

  /**
   * Find nearest Ethiopian city to coordinates
   * @param {Coordinates} coordinates 
   * @returns {EthiopianCity}
   */
  findNearestCity(coordinates) {
    let nearestCity = this.ETHIOPIAN_CITIES[0];
    let shortestDistance = Number.MAX_SAFE_INTEGER;

    for (const city of this.ETHIOPIAN_CITIES) {
      const distance = this.calculateDistance(coordinates, city.coordinates);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestCity = city;
      }
    }

    return nearestCity;
  }

  /**
   * Find nearest landmark (simplified implementation)
   * @param {Coordinates} coordinates 
   * @returns {string}
   */
  findNearestLandmark(coordinates) {
    // In production, this would query a landmarks database
    const landmarks = [
      { name: 'Meskel Square', coordinates: { latitude: 9.0189, longitude: 38.7570 } },
      { name: 'Bole International Airport', coordinates: { latitude: 8.9771, longitude: 38.7993 } },
      { name: 'Addis Ababa University', coordinates: { latitude: 9.0440, longitude: 38.7630 } }
    ];

    let nearestLandmark = '';
    let shortestDistance = Number.MAX_SAFE_INTEGER;

    for (const landmark of landmarks) {
      const distance = this.calculateDistance(coordinates, landmark.coordinates);
      if (distance < shortestDistance && distance < 5000) { // Within 5km
        shortestDistance = distance;
        nearestLandmark = landmark.name;
      }
    }

    return nearestLandmark;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {Coordinates} coord1 - First coordinates
   * @param {Coordinates} coord2 - Second coordinates
   * @returns {number} Distance in meters
   */
  calculateDistance(coord1, coord2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.degreesToRadians(coord2.latitude - coord1.latitude);
    const dLon = this.degreesToRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degreesToRadians(coord1.latitude)) * 
              Math.cos(this.degreesToRadians(coord2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees 
   * @returns {number}
   */
  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate travel distance and time between two points
   * @param {Coordinates} origin 
   * @param {Coordinates} destination 
   * @param {string} [mode='driving'] - Travel mode
   * @returns {Promise<DistanceMatrix>}
   */
  async calculateRoute(origin, destination, mode = 'driving') {
    try {
      // Use Google Maps Distance Matrix API or similar
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&mode=${mode}&key=${API_CONFIG.GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Route calculation failed: ${data.status}`);
      }

      const element = data.rows[0].elements[0];
      
      if (element.status !== 'OK') {
        throw new Error(`Route element failed: ${element.status}`);
      }

      return {
        origin,
        destination,
        distance: element.distance.value,
        duration: element.duration.value,
        breakdown: {
          distance: element.distance.value,
          duration: element.duration.value,
          distanceText: element.distance.text,
          durationText: element.duration.text
        }
      };
    } catch (error) {
      // Fallback to direct distance calculation
      const distance = this.calculateDistance(origin, destination);
      const duration = this.estimateTravelTime(distance, mode);
      
      return {
        origin,
        destination,
        distance,
        duration,
        breakdown: {
          distance,
          duration,
          distanceText: this.formatDistance(distance),
          durationText: this.formatDuration(duration)
        }
      };
    }
  }

  /**
   * Estimate travel time based on distance and mode
   * @param {number} distance - Distance in meters
   * @param {string} mode - Travel mode
   * @returns {number} Duration in seconds
   */
  estimateTravelTime(distance, mode) {
    const averageSpeeds = {
      driving: 30, // km/h in Ethiopian city traffic
      walking: 5,  // km/h
      bicycling: 15 // km/h
    };

    const speed = averageSpeeds[mode] || 30; // km/h
    const speedMps = speed * 1000 / 3600; // Convert to m/s
    return distance / speedMps;
  }

  /**
   * Format distance for display
   * @param {number} distance - Distance in meters
   * @returns {string}
   */
  formatDistance(distance) {
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    } else {
      return `${(distance / 1000).toFixed(1)} km`;
    }
  }

  /**
   * Format duration for display
   * @param {number} duration - Duration in seconds
   * @returns {string}
   */
  formatDuration(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} min`;
    }
  }

  /**
   * Check if location is within service coverage
   * @param {Coordinates} location - Location to check
   * @param {ServiceCoverage} coverage - Service coverage area
   * @returns {boolean}
   */
  isWithinCoverage(location, coverage) {
    // Check specific cities
    if (coverage.cities && coverage.cities.length > 0) {
      const city = this.findNearestCity(location);
      if (!coverage.cities.includes(city.id)) {
        return false;
      }
    }

    // Check travel radius
    if (coverage.travelRadius > 0 && coverage.centerPoint) {
      const distance = this.calculateDistance(location, coverage.centerPoint);
      return distance <= (coverage.travelRadius * 1000); // Convert km to meters
    }

    return true;
  }

  /**
   * Calculate travel fee based on distance
   * @param {number} distance - Distance in meters
   * @param {ServiceCoverage} coverage - Service coverage pricing
   * @returns {number} Travel fee in ETB
   */
  calculateTravelFee(distance, coverage) {
    if (!coverage.pricing) {
      return 0;
    }

    const distanceKm = distance / 1000;
    let fee = coverage.pricing.baseTravelFee || 0;
    
    if (distanceKm > 0 && coverage.pricing.perKmFee) {
      fee += distanceKm * coverage.pricing.perKmFee;
    }

    if (coverage.pricing.maxTravelFee && fee > coverage.pricing.maxTravelFee) {
      fee = coverage.pricing.maxTravelFee;
    }

    return Math.round(fee);
  }

  /**
   * Get all Ethiopian cities
   * @returns {EthiopianCity[]}
   */
  getEthiopianCities() {
    return this.ETHIOPIAN_CITIES;
  }

  /**
   * Get city by ID
   * @param {string} cityId - City identifier
   * @returns {EthiopianCity|null}
   */
  getCityById(cityId) {
    return this.ETHIOPIAN_CITIES.find(city => city.id === cityId) || null;
  }

  /**
   * Check location permissions
   * @returns {Promise<LocationPermission>}
   */
  async checkPermissions() {
    return new Promise((resolve) => {
      Geolocation.requestAuthorization(
        () => {
          resolve({
            granted: true,
            status: 'granted',
            canAskAgain: false
          });
        },
        (error) => {
          resolve({
            granted: false,
            status: error.code === 1 ? 'denied' : 'restricted',
            canAskAgain: error.code !== 1
          });
        }
      );
    });
  }

  /**
   * Request location permissions
   * @returns {Promise<LocationPermission>}
   */
  async requestPermissions() {
    return this.checkPermissions(); // React Native handles this through requestAuthorization
  }

  /**
   * Cache location for offline use
   * @param {Coordinates} location - Location to cache
   */
  async cacheLocation(location) {
    const cacheKey = `last_known_location`;
    const cacheData = {
      location,
      timestamp: Date.now()
    };
    
    await storage.set(cacheKey, cacheData);
    this.cachedLocations.set(cacheKey, cacheData);
  }

  /**
   * Load cached location
   */
  async loadCachedLocation() {
    try {
      const cached = await storage.get('last_known_location');
      if (cached && cached.location) {
        this.currentLocation = cached.location;
        this.cachedLocations.set('last_known_location', cached);
      }
    } catch (error) {
      console.warn('Failed to load cached location:', error);
    }
  }

  /**
   * Get last known location
   * @returns {Coordinates|null}
   */
  getLastKnownLocation() {
    return this.currentLocation;
  }

  /**
   * Handle location errors
   * @param {Object} error - Location error
   * @returns {Error}
   */
  handleLocationError(error) {
    const errorMessages = {
      1: 'Location permission denied',
      2: 'Location unavailable',
      3: 'Location request timeout',
      4: 'Location services not supported'
    };

    return new Error(errorMessages[error.code] || 'Unknown location error');
  }

  /**
   * Handle geocoding errors
   * @param {Error} error - Geocoding error
   * @returns {Error}
   */
  handleGeocodingError(error) {
    return new Error(`Geocoding failed: ${error.message}`);
  }

  /**
   * Translate address to Amharic (simplified)
   * @param {string} text - English text
   * @returns {string}
   */
  translateToAmharic(text) {
    // Simplified translation - in production, use proper translation service
    const translations = {
      'Addis Ababa': 'አዲስ አበባ',
      'Dire Dawa': 'ድሬ ዳዋ',
      'Mekelle': 'መቀሌ',
      'Bahir Dar': 'ባሕር ዳር',
      'Hawassa': 'አዋሳ',
      'Jimma': 'ጅማ',
      'Gondar': 'ጎንደር',
      'Street': 'ጎዳና',
      'Avenue': 'አቀኛ መንገድ',
      'Road': 'መንገድ'
    };

    return translations[text] || text;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopWatchingLocation();
    this.locationSubscribers.clear();
    this.cachedLocations.clear();
    this.geocodingCache.clear();
  }
}

// Create and export singleton instance
const locationService = new LocationService();
export default locationService;

// Export individual utility functions
export const LocationUtils = {
  // Core location services
  getCurrentLocation: (options) => locationService.getCurrentLocation(options),
  watchLocation: (callback, options) => locationService.watchLocation(callback, options),
  stopWatching: (watchId) => locationService.stopWatchingLocation(watchId),
  subscribe: (callback) => locationService.subscribeToLocation(callback),
  
  // Geocoding services
  reverseGeocode: (coordinates, language) => locationService.reverseGeocode(coordinates, language),
  findNearestCity: (coordinates) => locationService.findNearestCity(coordinates),
  
  // Distance and routing
  calculateDistance: (coord1, coord2) => locationService.calculateDistance(coord1, coord2),
  calculateRoute: (origin, destination, mode) => locationService.calculateRoute(origin, destination, mode),
  calculateTravelFee: (distance, coverage) => locationService.calculateTravelFee(distance, coverage),
  
  // Coverage and validation
  isWithinCoverage: (location, coverage) => locationService.isWithinCoverage(location, coverage),
  
  // City data
  getCities: () => locationService.getEthiopianCities(),
  getCity: (cityId) => locationService.getCityById(cityId),
  
  // Permissions
  checkPermissions: () => locationService.checkPermissions(),
  requestPermissions: () => locationService.requestPermissions(),
  
  // Utilities
  getLastKnownLocation: () => locationService.getLastKnownLocation(),
  formatDistance: (distance) => locationService.formatDistance(distance),
  formatDuration: (duration) => locationService.formatDuration(duration),
  
  // Cleanup
  destroy: () => locationService.destroy()
};

// React Hook for Location Services
export const useLocation = () => {
  const [currentLocation, setCurrentLocation] = React.useState(locationService.getLastKnownLocation());
  const [permission, setPermission] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Subscribe to location updates
    const unsubscribe = locationService.subscribeToLocation((location) => {
      setCurrentLocation(location);
      setError(null);
    });

    // Check permissions on mount
    locationService.checkPermissions().then(setPermission);

    return () => {
      unsubscribe();
    };
  }, []);

  const requestLocation = async (options) => {
    try {
      setError(null);
      const location = await locationService.getCurrentLocation(options);
      setCurrentLocation(location);
      return location;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  return {
    currentLocation,
    permission,
    error,
    requestLocation,
    refreshPermission: () => locationService.checkPermissions().then(setPermission)
  };
};