// screens/modal/location.js
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocation } from '../../contexts/location-context';
import { useAuth } from '../../contexts/auth-context';

// Components
import ThemedView from '../../components/themed-view';
import ThemedText from '../../components/themed-text';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Card from '../../components/ui/card';
import Badge from '../../components/ui/badge';
import Loading from '../../components/ui/loading';
import LocationPicker from '../../components/ui/location-picker';

// Services
import { getCurrentLocation, searchLocations, getAddressFromCoords } from '../../services/location-service';
import { saveUserLocation } from '../../services/user-service';

// Utils
import { debounce } from '../../utils/helpers';
import { validateCoordinates } from '../../utils/validators';

// Constants
import { ETHIOPIAN_CITIES, LOCATION_TYPES } from '../../constants/location';

const LocationModal = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    currentLocation, 
    setCurrentLocation, 
    savedLocations, 
    addSavedLocation 
  } = useLocation();

  // State
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [locationType, setLocationType] = useState('current');
  const [customAddress, setCustomAddress] = useState('');
  const [useGPS, setUseGPS] = useState(true);

  // Ethiopian cities and regions
  const popularCities = useMemo(() => [
    { id: 'addis-ababa', name: 'Addis Ababa', region: 'Capital', emoji: '🏙️' },
    { id: 'dire-dawa', name: 'Dire Dawa', region: 'Dire Dawa', emoji: '🏢' },
    { id: 'mekelle', name: 'Mekelle', region: 'Tigray', emoji: '⛰️' },
    { id: 'bahir-dar', name: 'Bahir Dar', region: 'Amhara', emoji: '🌊' },
    { id: 'hawassa', name: 'Hawassa', region: 'Sidama', emoji: '🏞️' },
    { id: 'jimma', name: 'Jimma', region: 'Oromia', emoji: '🌿' },
    { id: 'gondar', name: 'Gondar', region: 'Amhara', emoji: '🏰' },
    { id: 'addama', name: 'Addama', region: 'Oromia', emoji: '🌋' },
  ], []);

  // Location types for different use cases
  const locationTypes = useMemo(() => [
    { id: 'home', label: 'Home', emoji: '🏠', description: 'Your primary residence' },
    { id: 'work', label: 'Work', emoji: '💼', description: 'Your workplace or office' },
    { id: 'site', label: 'Project Site', emoji: '🏗️', description: 'Construction or work site' },
    { id: 'other', label: 'Other', emoji: '📍', description: 'Other locations' },
  ], []);

  // Request location permissions
  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Yachi needs access to your location to find nearby services',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Location permission error:', err);
        return false;
      }
    }
    return true;
  }, []);

  // Get current location using GPS
  const handleGetCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions in your device settings to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await getCurrentLocation();
      if (location) {
        const address = await getAddressFromCoords(location.latitude, location.longitude);
        const locationWithAddress = {
          ...location,
          address: address || 'Current Location',
          type: 'current',
          timestamp: new Date().toISOString()
        };
        
        setSelectedLocation(locationWithAddress);
        setMapRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setUseGPS(true);
      }
    } catch (error) {
      console.error('Current location error:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your GPS settings or try searching manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [requestLocationPermission]);

  // Search locations with debouncing
  const handleSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const results = await searchLocations(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Location search error:', error);
        setSearchResults([]);
      }
    }, 500),
    []
  );

  // Handle search query change
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    handleSearch(text);
  }, [handleSearch]);

  // Select a location from search results or popular cities
  const handleSelectLocation = useCallback((location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name || location.address);
    setSearchResults([]);
    
    if (location.latitude && location.longitude) {
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
    setUseGPS(false);
  }, []);

  // Handle manual address input
  const handleManualAddress = useCallback(async () => {
    if (!customAddress.trim()) return;

    setLoading(true);
    try {
      const results = await searchLocations(customAddress);
      if (results.length > 0) {
        handleSelectLocation(results[0]);
      } else {
        Alert.alert(
          'Location Not Found',
          'We couldn\'t find that address. Please try a more specific location or use the map.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Manual address error:', error);
      Alert.alert('Error', 'Failed to search for the address. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customAddress, handleSelectLocation]);

  // Handle map region change
  const handleMapRegionChange = useCallback(async (region) => {
    setMapRegion(region);
    
    if (useGPS) return;

    try {
      const address = await getAddressFromCoords(region.latitude, region.longitude);
      setSelectedLocation({
        latitude: region.latitude,
        longitude: region.longitude,
        address: address || 'Selected Location',
        type: 'custom'
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }, [useGPS]);

  // Save selected location
  const handleSaveLocation = useCallback(async () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please select a location first.');
      return;
    }

    setLoading(true);
    try {
      const locationToSave = {
        ...selectedLocation,
        type: locationType,
        customName: locationType === 'other' ? customAddress : undefined,
        userId: user.id,
        isDefault: savedLocations.length === 0
      };

      // Save to context and backend
      addSavedLocation(locationToSave);
      await saveUserLocation(user.id, locationToSave);
      
      // If this is the current location, update context
      if (locationType === 'current') {
        setCurrentLocation(locationToSave);
      }

      router.back();
      
    } catch (error) {
      console.error('Save location error:', error);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, locationType, customAddress, user, savedLocations, addSavedLocation, setCurrentLocation, router]);

  // Initialize with current location
  useEffect(() => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [currentLocation]);

  // Render popular city item
  const renderCityItem = useCallback(({ item }) => (
    <Button
      variant="outline"
      size="small"
      onPress={() => handleSelectLocation({
        name: item.name,
        address: `${item.name}, ${item.region}`,
        type: 'city',
        emoji: item.emoji
      })}
      style={styles.cityButton}
    >
      <View style={styles.cityContent}>
        <ThemedText style={styles.cityEmoji}>{item.emoji}</ThemedText>
        <View style={styles.cityText}>
          <ThemedText style={styles.cityName}>{item.name}</ThemedText>
          <ThemedText style={styles.cityRegion}>{item.region}</ThemedText>
        </View>
      </View>
    </Button>
  ), [handleSelectLocation]);

  // Render search result item
  const renderSearchResult = useCallback(({ item }) => (
    <Card style={styles.searchResultCard} onPress={() => handleSelectLocation(item)}>
      <View style={styles.searchResultContent}>
        <ThemedText style={styles.searchResultName}>{item.name}</ThemedText>
        <ThemedText style={styles.searchResultAddress}>{item.address}</ThemedText>
        {item.distance && (
          <ThemedText style={styles.searchResultDistance}>
            {item.distance} km away
          </ThemedText>
        )}
      </View>
    </Card>
  ), [handleSelectLocation]);

  // Render location type option
  const renderLocationType = useCallback(({ item }) => (
    <Button
      variant={locationType === item.id ? 'primary' : 'outline'}
      onPress={() => setLocationType(item.id)}
      style={styles.locationTypeButton}
    >
      <View style={styles.locationTypeContent}>
        <ThemedText style={styles.locationTypeEmoji}>{item.emoji}</ThemedText>
        <View style={styles.locationTypeText}>
          <ThemedText style={styles.locationTypeLabel}>{item.label}</ThemedText>
          <ThemedText style={styles.locationTypeDescription}>
            {item.description}
          </ThemedText>
        </View>
      </View>
    </Button>
  ), [locationType]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Select Location</ThemedText>
        <ThemedText style={styles.subtitle}>
          Choose your location to find nearby services
        </ThemedText>
      </View>

      {/* Current Location Button */}
      <Card style={styles.currentLocationCard}>
        <View style={styles.currentLocationHeader}>
          <View>
            <ThemedText style={styles.currentLocationTitle}>
              Use Current Location
            </ThemedText>
            <ThemedText style={styles.currentLocationDescription}>
              Get services near your exact position
            </ThemedText>
          </View>
          <Button
            variant={useGPS ? 'primary' : 'outline'}
            onPress={handleGetCurrentLocation}
            loading={loading}
            style={styles.gpsButton}
          >
            {useGPS ? 'Using GPS' : 'Get Location'}
          </Button>
        </View>
        
        {selectedLocation && useGPS && (
          <View style={styles.selectedLocation}>
            <ThemedText style={styles.selectedLocationText}>
              📍 {selectedLocation.address}
            </ThemedText>
          </View>
        )}
      </Card>

      {/* Search Section */}
      <Card style={styles.searchCard}>
        <ThemedText style={styles.sectionTitle}>Search Location</ThemedText>
        <Input
          placeholder="Search for area, landmark, or address..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          style={styles.searchInput}
        />

        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id || `${item.latitude}-${item.longitude}`}
              renderItem={renderSearchResult}
              scrollEnabled={false}
            />
          </View>
        )}
      </Card>

      {/* Manual Address Input */}
      <Card style={styles.manualCard}>
        <ThemedText style={styles.sectionTitle}>Or Enter Address</ThemedText>
        <View style={styles.manualInputRow}>
          <Input
            placeholder="Enter full address..."
            value={customAddress}
            onChangeText={setCustomAddress}
            style={styles.manualInput}
          />
          <Button
            variant="outline"
            onPress={handleManualAddress}
            loading={loading}
            disabled={!customAddress.trim()}
          >
            Search
          </Button>
        </View>
      </Card>

      {/* Popular Cities */}
      <Card style={styles.citiesCard}>
        <ThemedText style={styles.sectionTitle}>Popular Cities</ThemedText>
        <FlatList
          data={popularCities}
          keyExtractor={(item) => item.id}
          renderItem={renderCityItem}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.citiesGrid}
        />
      </Card>

      {/* Interactive Map */}
      <Card style={styles.mapCard}>
        <ThemedText style={styles.sectionTitle}>Select on Map</ThemedText>
        <View style={styles.mapContainer}>
          <LocationPicker
            region={mapRegion}
            onRegionChange={handleMapRegionChange}
            style={styles.map}
            showsUserLocation={useGPS}
            showsMyLocationButton={false}
          />
        </View>
        {selectedLocation && (
          <View style={styles.mapLocationInfo}>
            <ThemedText style={styles.mapLocationText}>
              📍 {selectedLocation.address}
            </ThemedText>
          </View>
        )}
      </Card>

      {/* Location Type Selection */}
      <Card style={styles.typeCard}>
        <ThemedText style={styles.sectionTitle}>Location Type</ThemedText>
        <FlatList
          data={locationTypes}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationType}
          scrollEnabled={false}
        />
      </Card>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          variant="outline"
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onPress={handleSaveLocation}
          loading={loading}
          disabled={!selectedLocation}
          style={styles.saveButton}
        >
          Save Location
        </Button>
      </View>

      {/* Selected Location Preview */}
      {selectedLocation && (
        <Card style={styles.previewCard}>
          <ThemedText style={styles.previewTitle}>Selected Location</ThemedText>
          <ThemedText style={styles.previewAddress}>
            {selectedLocation.address}
          </ThemedText>
          {selectedLocation.latitude && selectedLocation.longitude && (
            <ThemedText style={styles.previewCoords}>
              {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
            </ThemedText>
          )}
        </Card>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  currentLocationCard: {
    marginBottom: 16,
    padding: 16,
  },
  currentLocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  currentLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentLocationDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  gpsButton: {
    minWidth: 120,
  },
  selectedLocation: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectedLocationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchInput: {
    marginBottom: 8,
  },
  searchResults: {
    marginTop: 8,
  },
  searchResultCard: {
    padding: 12,
    marginBottom: 8,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  searchResultDistance: {
    fontSize: 12,
    opacity: 0.6,
  },
  manualCard: {
    marginBottom: 16,
    padding: 16,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
  },
  citiesCard: {
    marginBottom: 16,
    padding: 16,
  },
  citiesGrid: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cityButton: {
    width: '48%',
    marginBottom: 8,
  },
  cityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  cityEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  cityText: {
    flex: 1,
  },
  cityName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cityRegion: {
    fontSize: 12,
    opacity: 0.7,
  },
  mapCard: {
    marginBottom: 16,
    padding: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  mapLocationInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  mapLocationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeCard: {
    marginBottom: 16,
    padding: 16,
  },
  locationTypeButton: {
    marginBottom: 8,
    padding: 16,
  },
  locationTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTypeEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  locationTypeText: {
    flex: 1,
  },
  locationTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationTypeDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  previewCard: {
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0EA5E9',
  },
  previewAddress: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewCoords: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'monospace',
  },
});

export default LocationModal;