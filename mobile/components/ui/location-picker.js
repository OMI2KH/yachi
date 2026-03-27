// components/ui/location-picker.js
// ============================================================
// YACHI ENTERPRISE LOCATION PICKER
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  I18nManager,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// Context
import { useTheme } from '../../contexts/theme-context';
import { useLanguage } from './language-selector';
import { useNotification } from '../../contexts/notification-context';

// Services
import { locationService } from '../../services/location-service';

// Constants
import { YachiColors } from '../../constants/colors';
import { AppConfig } from '../../config/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

class YachiLocationService {
  constructor() {
    this.ethiopianCities = this.getEthiopianCities();
    this.locationTypes = this.getLocationTypes();
    this.permissionStatus = null;
  }

  getEthiopianCities() {
    return [
      {
        id: 'addis-ababa',
        name: 'Addis Ababa',
        amharic: 'አዲስ አበባ',
        oromo: 'Finfinne',
        latitude: 9.0054,
        longitude: 38.7636,
        region: 'Addis Ababa',
        isCapital: true
      },
      {
        id: 'dire-dawa',
        name: 'Dire Dawa',
        amharic: 'ድሬ ዳዋ',
        oromo: 'Dirre Dhawaa',
        latitude: 9.6002,
        longitude: 41.8501,
        region: 'Dire Dawa',
        isCapital: false
      },
      {
        id: 'mekelle',
        name: 'Mekelle',
        amharic: 'መቀሌ',
        oromo: 'Mekele',
        latitude: 13.4963,
        longitude: 39.4753,
        region: 'Tigray',
        isCapital: false
      },
      {
        id: 'bahir-dar',
        name: 'Bahir Dar',
        amharic: 'ባሕር ዳር',
        oromo: 'Baahar Daar',
        latitude: 11.5742,
        longitude: 37.3614,
        region: 'Amhara',
        isCapital: false
      },
      {
        id: 'hawassa',
        name: 'Hawassa',
        amharic: 'አዋሳ',
        oromo: 'Hawaasaa',
        latitude: 7.0476,
        longitude: 38.4912,
        region: 'Sidama',
        isCapital: false
      },
      {
        id: 'jimma',
        name: 'Jimma',
        amharic: 'ጅማ',
        oromo: 'Jimmaa',
        latitude: 7.6737,
        longitude: 36.8344,
        region: 'Oromia',
        isCapital: false
      },
      {
        id: 'gondar',
        name: 'Gondar',
        amharic: 'ጎንደር',
        oromo: 'Gondar',
        latitude: 12.6063,
        longitude: 37.4585,
        region: 'Amhara',
        isCapital: false
      },
      {
        id: 'dessie',
        name: 'Dessie',
        amharic: 'ደሴ',
        oromo: 'Dessie',
        latitude: 11.1270,
        longitude: 39.6363,
        region: 'Amhara',
        isCapital: false
      }
    ];
  }

  getLocationTypes() {
    return {
      HOME: 'home',
      WORK: 'work',
      CURRENT: 'current',
      CUSTOM: 'custom',
      SERVICE: 'service'
    };
  }

  async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.permissionStatus = status;
      
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('Location permission error:', error);
      throw error;
    }
  }

  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission required');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp
      };
    } catch (error) {
      console.error('Get current location error:', error);
      throw error;
    }
  }

  async getAddressFromCoords(latitude, longitude) {
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (address.length > 0) {
        const firstAddress = address[0];
        return this.formatAddress(firstAddress);
      }
      
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  formatAddress(address) {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.region) parts.push(address.region);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  getCityByName(cityName) {
    return this.ethiopianCities.find(city => 
      city.name.toLowerCase() === cityName.toLowerCase() ||
      city.amharic === cityName ||
      city.oromo === cityName
    );
  }

  validateCoordinates(latitude, longitude) {
    // Ethiopia coordinates bounds
    const minLat = 3.402;
    const maxLat = 14.894;
    const minLon = 32.997;
    const maxLon = 47.958;

    return (
      latitude >= minLat && latitude <= maxLat &&
      longitude >= minLon && longitude <= maxLon
    );
  }
}

// Singleton instance
export const yachiLocationService = new YachiLocationService();

/**
 * Enterprise Location Picker with Map Integration
 * Supports current location, city selection, and manual pin placement
 */
export default function LocationPicker({
  visible = false,
  onClose = () => {},
  onLocationSelect = () => {},
  initialLocation = null,
  mode = 'full', // 'full', 'compact', 'map-only'
  title = 'Select Location',
  showCurrentLocation = true,
  showCityList = true,
  required = false,
  testID = 'yachi-location-picker',
  accessibilityLabel = 'Location picker',
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const { showNotification } = useNotification();
  
  // Refs
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // State
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [savedLocations, setSavedLocations] = useState([]);

  // Default region (Addis Ababa)
  const defaultRegion = useMemo(() => ({
    latitude: 9.0054,
    longitude: 38.7636,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }), []);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      return yachiLocationService.ethiopianCities;
    }

    const query = searchQuery.toLowerCase();
    return yachiLocationService.ethiopianCities.filter(city =>
      city.name.toLowerCase().includes(query) ||
      city.amharic.includes(query) ||
      city.oromo.toLowerCase().includes(query) ||
      city.region.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Initialize component
  useEffect(() => {
    if (visible) {
      startEntranceAnimation();
      loadSavedLocations();
      initializeMap();
    }
  }, [visible]);

  const startEntranceAnimation = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadSavedLocations = useCallback(async () => {
    try {
      // In a real app, this would load from AsyncStorage or API
      const saved = []; // await storageService.get('saved_locations');
      setSavedLocations(saved);
    } catch (error) {
      console.error('Error loading saved locations:', error);
    }
  }, []);

  const initializeMap = useCallback(async () => {
    if (initialLocation) {
      setMapRegion({
        ...initialLocation,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } else {
      setMapRegion(defaultRegion);
    }
  }, [initialLocation, defaultRegion]);

  const handleGetCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const location = await yachiLocationService.getCurrentLocation();
      const address = await yachiLocationService.getAddressFromCoords(
        location.latitude,
        location.longitude
      );

      const newLocation = {
        type: yachiLocationService.locationTypes.CURRENT,
        latitude: location.latitude,
        longitude: location.longitude,
        address: address,
        name: 'Current Location',
        timestamp: Date.now()
      };

      setSelectedLocation(newLocation);
      setCurrentPosition(newLocation);
      
      // Center map on current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }

      showNotification({
        type: 'success',
        title: 'Location Found',
        message: 'Your current location has been detected',
        duration: 3000,
      });

    } catch (error) {
      console.error('Error getting current location:', error);
      
      let errorMessage = 'Unable to get your current location';
      if (error.message.includes('permission')) {
        errorMessage = 'Location permission is required to detect your current location';
      }

      showNotification({
        type: 'error',
        title: 'Location Error',
        message: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLocating(false);
    }
  }, [showNotification]);

  const handleCitySelect = useCallback((city) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const location = {
      type: yachiLocationService.locationTypes.CUSTOM,
      latitude: city.latitude,
      longitude: city.longitude,
      address: `${city.name}, ${city.region}`,
      name: city.name,
      city: city,
      timestamp: Date.now()
    };

    setSelectedLocation(location);
    setSearchQuery('');

    // Center map on selected city
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: city.latitude,
        longitude: city.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, []);

  const handleMapPress = useCallback((event) => {
    const { coordinate } = event.nativeEvent;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const location = {
      type: yachiLocationService.locationTypes.CUSTOM,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      address: 'Selected Location',
      name: 'Custom Location',
      timestamp: Date.now()
    };

    setSelectedLocation(location);
  }, []);

  const handleConfirmLocation = useCallback(async () => {
    if (!selectedLocation && required) {
      showNotification({
        type: 'warning',
        title: 'Location Required',
        message: 'Please select a location to continue',
        duration: 3000,
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Success);
    
    // Get address for custom map selections
    if (selectedLocation && !selectedLocation.address) {
      setIsLoading(true);
      try {
        const address = await yachiLocationService.getAddressFromCoords(
          selectedLocation.latitude,
          selectedLocation.longitude
        );
        
        selectedLocation.address = address || 'Selected Location';
      } catch (error) {
        console.error('Error getting address:', error);
      } finally {
        setIsLoading(false);
      }
    }

    onLocationSelect(selectedLocation);
    onClose();
  }, [selectedLocation, required, onLocationSelect, onClose, showNotification]);

  const handleSaveLocation = useCallback(() => {
    if (!selectedLocation) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // In a real app, this would save to AsyncStorage or API
    const newSavedLocation = {
      ...selectedLocation,
      id: `saved_${Date.now()}`,
      savedAt: Date.now()
    };

    setSavedLocations(prev => [newSavedLocation, ...prev.slice(0, 4)]);
    
    showNotification({
      type: 'success',
      title: 'Location Saved',
      message: 'Location has been saved to your favorites',
      duration: 3000,
    });
  }, [selectedLocation, showNotification]);

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close location picker"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search cities..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          accessibilityLabel="Search for cities"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCurrentLocationButton = () => (
    <TouchableOpacity
      style={[styles.currentLocationButton, { backgroundColor: colors.primary }]}
      onPress={handleGetCurrentLocation}
      disabled={isLocating}
      accessibilityLabel="Get current location"
      accessibilityRole="button"
    >
      {isLocating ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Ionicons name="locate" size={20} color="#FFFFFF" />
      )}
      <Text style={styles.currentLocationText}>
        {isLocating ? 'Locating...' : 'Current Location'}
      </Text>
    </TouchableOpacity>
  );

  const renderCityItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[styles.cityItem, { backgroundColor: colors.card }]}
      onPress={() => handleCitySelect(item)}
      accessibilityLabel={`Select ${item.name}`}
      accessibilityRole="button"
    >
      <View style={styles.cityIcon}>
        <Ionicons 
          name="location" 
          size={20} 
          color={colors.primary} 
        />
      </View>
      <View style={styles.cityInfo}>
        <Text style={[styles.cityName, { color: colors.foreground }]}>
          {item.name}
        </Text>
        <Text style={[styles.cityRegion, { color: colors.mutedForeground }]}>
          {item.region}
        </Text>
      </View>
      {item.isCapital && (
        <View style={[styles.capitalBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.capitalText}>Capital</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [colors, handleCitySelect]);

  const renderCityList = () => (
    <View style={[styles.cityListContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Major Ethiopian Cities
      </Text>
      <FlatList
        data={filteredCities}
        renderItem={renderCityItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.cityListContent}
      />
    </View>
  );

  const renderMap = () => (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={mapRegion || defaultRegion}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        toolbarEnabled={false}
      >
        {selectedLocation && (
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
            }}
            title={selectedLocation.name}
            description={selectedLocation.address}
          >
            <View style={[styles.marker, { backgroundColor: colors.primary }]}>
              <Ionicons name="location" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>
      
      {/* Map Controls */}
      <View style={styles.mapControls}>
        {renderCurrentLocationButton()}
      </View>
    </View>
  );

  const renderSelectedLocation = () => {
    if (!selectedLocation) return null;

    return (
      <View style={[styles.selectedLocation, { backgroundColor: colors.card }]}>
        <View style={styles.selectedLocationHeader}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          <Text style={[styles.selectedLocationTitle, { color: colors.foreground }]}>
            Selected Location
          </Text>
        </View>
        <Text style={[styles.selectedLocationText, { color: colors.foreground }]}>
          {selectedLocation.address || selectedLocation.name}
        </Text>
        {selectedLocation.city && (
          <Text style={[styles.selectedLocationSubtext, { color: colors.mutedForeground }]}>
            {selectedLocation.city.region} Region
          </Text>
        )}
      </View>
    );
  };

  const renderFooter = () => (
    <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={styles.footerActions}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={handleSaveLocation}
          disabled={!selectedLocation}
          accessibilityLabel="Save location to favorites"
        >
          <Ionicons name="bookmark-outline" size={20} color={colors.foreground} />
          <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
            Save
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { 
              backgroundColor: selectedLocation ? colors.primary : colors.muted,
              opacity: selectedLocation || !required ? 1 : 0.6
            }
          ]}
          onPress={handleConfirmLocation}
          disabled={isLoading || (required && !selectedLocation)}
          accessibilityLabel="Confirm selected location"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                Confirm Location
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (mode === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: colors.card }]}
        onPress={onClose} // In compact mode, onClose should open the full picker
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <Ionicons name="location" size={20} color={colors.primary} />
        <Text style={[styles.compactText, { color: colors.foreground }]}>
          {selectedLocation ? selectedLocation.address : 'Select Location'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <Animated.View 
        style={[
          styles.container,
          { backgroundColor: colors.background, opacity: fadeAnim }
        ]}
        testID={testID}
      >
        {renderHeader()}
        
        <View style={styles.content}>
          {showCityList && !searchQuery && (
            <View style={styles.splitContainer}>
              <View style={styles.splitLeft}>
                {renderCityList()}
              </View>
              <View style={styles.splitRight}>
                {renderMap()}
              </View>
            </View>
          )}
          
          {(mode === 'map-only' || searchQuery) && renderMap()}
          
          {searchQuery && (
            <View style={styles.searchResults}>
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
                Search Results
              </Text>
              <FlatList
                data={filteredCities}
                renderItem={renderCityItem}
                keyExtractor={(item) => item.id}
                style={styles.searchResultsList}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}
        </View>

        {renderSelectedLocation()}
        {renderFooter()}
      </Animated.View>
    </Modal>
  );
}

// Pre-configured location picker variants
export function CompactLocationPicker({ onPress, selectedLocation, ...props }) {
  return (
    <LocationPicker
      mode="compact"
      onClose={onPress}
      selectedLocation={selectedLocation}
      {...props}
    />
  );
}

export function MapOnlyLocationPicker(props) {
  return <LocationPicker mode="map-only" showCityList={false} {...props} />;
}

export function ServiceLocationPicker({ serviceType, ...props }) {
  const getTitle = () => {
    const titles = {
      construction: 'Select Construction Site',
      cleaning: 'Select Cleaning Location',
      plumbing: 'Select Service Address',
      default: 'Select Service Location'
    };
    return titles[serviceType] || titles.default;
  };

  return (
    <LocationPicker
      title={getTitle()}
      showCurrentLocation={true}
      required={true}
      {...props}
    />
  );
}

// Hook for location management
export const useLocationPicker = (initialLocation = null) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  const handleLocationSelect = useCallback((location) => {
    setSelectedLocation(location);
    hide();
  }, [hide]);

  return {
    isVisible,
    show,
    hide,
    toggle,
    selectedLocation,
    setSelectedLocation,
    handleLocationSelect,
    LocationPicker: useCallback((props) => (
      <LocationPicker
        visible={isVisible}
        onClose={hide}
        onLocationSelect={handleLocationSelect}
        selectedLocation={selectedLocation}
        {...props}
      />
    ), [isVisible, hide, handleLocationSelect, selectedLocation]),
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  content: {
    flex: 1,
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  splitLeft: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  splitRight: {
    flex: 1,
  },
  cityListContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cityListContent: {
    paddingHorizontal: 16,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cityIcon: {
    marginRight: 12,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    marginBottom: 2,
  },
  cityRegion: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  capitalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capitalText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currentLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    marginLeft: 8,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedLocation: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  selectedLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedLocationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginLeft: 8,
  },
  selectedLocationText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedLocationSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    flex: 0.5,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    marginLeft: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  compactText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  searchResults: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    padding: 20,
  },
  searchResultsList: {
    flex: 1,
  },
});

export { yachiLocationService };