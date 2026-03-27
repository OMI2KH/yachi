import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { Checkbox } from '../../components/ui/checkbox';
import { Slider } from '../../components/ui/slider';
import { DatePicker } from '../../components/ui/date-picker';
import { LocationPicker } from '../../components/ui/location-picker';
import { useTheme } from '../../contexts/theme-context';
import { useLocation } from '../../hooks/use-location';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { serviceConstants } from '../../constants/service';
import { governmentConstants } from '../../constants/government';

/**
 * Advanced Filter Modal Component
 * 
 * Enterprise-grade filtering system with multiple filter types,
 * real-time validation, and smart defaults for service discovery
 * and project management
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility state
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onApply - Apply filters callback
 * @param {Object} props.initialFilters - Initial filter values
 * @param {string} props.filterType - Type of filtering (services, projects, workers, etc.)
 * @param {Object} props.customConfig - Custom filter configuration
 */
export const FilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
  filterType = 'services',
  customConfig = {},
}) => {
  const { theme, colors } = useTheme();
  const { getCurrentLocation } = useLocation();

  const [filters, setFilters] = useState({});
  const [activeSections, setActiveSections] = useState(new Set());
  const [locationLoading, setLocationLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  /**
   * Get filter configuration based on type
   */
  const getFilterConfig = useCallback(() => {
    const baseConfig = {
      services: {
        title: 'Filter Services',
        sections: [
          {
            id: 'category',
            title: 'Service Category',
            type: 'multi-select',
            options: serviceConstants.CATEGORIES.map(cat => ({
              value: cat.id,
              label: cat.name,
              count: cat.count || 0,
            })),
            maxSelections: 3,
          },
          {
            id: 'price',
            title: 'Price Range',
            type: 'range',
            min: 0,
            max: 10000,
            step: 100,
            unit: 'ETB',
            format: 'currency',
          },
          {
            id: 'rating',
            title: 'Minimum Rating',
            type: 'rating',
            min: 1,
            max: 5,
            showLabels: true,
          },
          {
            id: 'location',
            title: 'Location',
            type: 'location',
            radius: true,
            maxRadius: 50, // km
          },
          {
            id: 'availability',
            title: 'Availability',
            type: 'multi-select',
            options: [
              { value: 'immediate', label: 'Immediate', count: 0 },
              { value: 'within_week', label: 'Within Week', count: 0 },
              { value: 'scheduled', label: 'Scheduled', count: 0 },
            ],
          },
          {
            id: 'verification',
            title: 'Verification Status',
            type: 'multi-select',
            options: [
              { value: 'verified', label: 'Verified Only', count: 0 },
              { value: 'premium', label: 'Premium Badge', count: 0 },
              { value: 'government', label: 'Government Certified', count: 0 },
            ],
          },
        ],
      },
      projects: {
        title: 'Filter Projects',
        sections: [
          {
            id: 'status',
            title: 'Project Status',
            type: 'multi-select',
            options: governmentConstants.PROJECT_STATUSES.map(status => ({
              value: status.key,
              label: status.label,
              count: status.count || 0,
            })),
          },
          {
            id: 'type',
            title: 'Project Type',
            type: 'multi-select',
            options: governmentConstants.PROJECT_TYPES.map(type => ({
              value: type.id,
              label: type.name,
              count: type.count || 0,
            })),
          },
          {
            id: 'budget',
            title: 'Budget Range',
            type: 'range',
            min: 0,
            max: 10000000,
            step: 10000,
            unit: 'ETB',
            format: 'currency',
          },
          {
            id: 'timeline',
            title: 'Timeline',
            type: 'date-range',
            showDuration: true,
          },
          {
            id: 'location',
            title: 'Project Location',
            type: 'location',
            regions: true,
          },
          {
            id: 'workers',
            title: 'Workforce Requirements',
            type: 'multi-select',
            options: [
              { value: 'general_labor', label: 'General Labor', count: 0 },
              { value: 'skilled_workers', label: 'Skilled Workers', count: 0 },
              { value: 'supervisors', label: 'Supervisors', count: 0 },
              { value: 'engineers', label: 'Engineers', count: 0 },
            ],
          },
        ],
      },
      workers: {
        title: 'Filter Workers',
        sections: [
          {
            id: 'skills',
            title: 'Skills & Expertise',
            type: 'multi-select',
            options: serviceConstants.SKILLS.map(skill => ({
              value: skill.id,
              label: skill.name,
              count: skill.count || 0,
            })),
            searchable: true,
          },
          {
            id: 'experience',
            title: 'Experience Level',
            type: 'multi-select',
            options: [
              { value: 'entry', label: 'Entry Level (0-2 years)', count: 0 },
              { value: 'mid', label: 'Mid Level (2-5 years)', count: 0 },
              { value: 'senior', label: 'Senior (5+ years)', count: 0 },
              { value: 'expert', label: 'Expert (10+ years)', count: 0 },
            ],
          },
          {
            id: 'rating',
            title: 'Minimum Rating',
            type: 'rating',
            min: 1,
            max: 5,
          },
          {
            id: 'availability',
            title: 'Availability Status',
            type: 'multi-select',
            options: [
              { value: 'available', label: 'Available Now', count: 0 },
              { value: 'busy', label: 'Currently Busy', count: 0 },
              { value: 'soon', label: 'Available Soon', count: 0 },
            ],
          },
          {
            id: 'location',
            title: 'Worker Location',
            type: 'location',
            radius: true,
          },
          {
            id: 'certification',
            title: 'Certifications',
            type: 'multi-select',
            options: [
              { value: 'safety', label: 'Safety Certified', count: 0 },
              { value: 'technical', label: 'Technical Certified', count: 0 },
              { value: 'government', label: 'Government Approved', count: 0 },
            ],
          },
        ],
      },
    };

    return {
      ...baseConfig[filterType],
      ...customConfig,
    };
  }, [filterType, customConfig]);

  const config = getFilterConfig();

  /**
   * Initialize filters
   */
  useEffect(() => {
    if (visible) {
      const defaultFilters = config.sections.reduce((acc, section) => {
        switch (section.type) {
          case 'multi-select':
            acc[section.id] = [];
            break;
          case 'range':
            acc[section.id] = { min: section.min, max: section.max };
            break;
          case 'rating':
            acc[section.id] = section.min;
            break;
          case 'location':
            acc[section.id] = {
              coordinates: null,
              address: '',
              radius: section.radius ? 10 : null, // Default 10km radius
              region: '',
            };
            break;
          case 'date-range':
            acc[section.id] = {
              start: null,
              end: null,
              duration: null,
            };
            break;
          default:
            acc[section.id] = null;
        }
        return acc;
      }, {});

      setFilters({ ...defaultFilters, ...initialFilters });
      setActiveSections(new Set());
      setValidationErrors({});
    }
  }, [visible, initialFilters, config]);

  /**
   * Toggle section expansion
   */
  const toggleSection = (sectionId) => {
    const newActiveSections = new Set(activeSections);
    if (newActiveSections.has(sectionId)) {
      newActiveSections.delete(sectionId);
    } else {
      newActiveSections.add(sectionId);
    }
    setActiveSections(newActiveSections);
  };

  /**
   * Update multi-select filter
   */
  const handleMultiSelectChange = (sectionId, value) => {
    setFilters(prev => {
      const currentValues = prev[sectionId] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];

      // Apply max selections limit
      const sectionConfig = config.sections.find(s => s.id === sectionId);
      if (sectionConfig?.maxSelections && newValues.length > sectionConfig.maxSelections) {
        Alert.alert(
          'Selection Limit',
          `You can only select up to ${sectionConfig.maxSelections} options.`
        );
        return prev;
      }

      return {
        ...prev,
        [sectionId]: newValues,
      };
    });
  };

  /**
   * Update range filter
   */
  const handleRangeChange = (sectionId, range) => {
    setFilters(prev => ({
      ...prev,
      [sectionId]: range,
    }));
  };

  /**
   * Update rating filter
   */
  const handleRatingChange = (sectionId, rating) => {
    setFilters(prev => ({
      ...prev,
      [sectionId]: rating,
    }));
  };

  /**
   * Update location filter
   */
  const handleLocationChange = (sectionId, location) => {
    setFilters(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        ...location,
      },
    }));
  };

  /**
   * Use current location
   */
  const handleUseCurrentLocation = async (sectionId) => {
    try {
      setLocationLoading(true);
      const location = await getCurrentLocation();
      
      if (location) {
        handleLocationChange(sectionId, {
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          address: 'Current Location',
        });
      }
    } catch (error) {
      Alert.alert('Location Error', 'Unable to get current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  /**
   * Update date range filter
   */
  const handleDateRangeChange = (sectionId, dateRange) => {
    setFilters(prev => ({
      ...prev,
      [sectionId]: dateRange,
    }));
  };

  /**
   * Validate filters before applying
   */
  const validateFilters = () => {
    const errors = {};

    config.sections.forEach(section => {
      const value = filters[section.id];

      // Required field validation
      if (section.required && !value) {
        errors[section.id] = 'This field is required';
        return;
      }

      // Range validation
      if (section.type === 'range' && value) {
        if (value.min > value.max) {
          errors[section.id] = 'Minimum cannot be greater than maximum';
        }
        if (value.min < section.min || value.max > section.max) {
          errors[section.id] = `Value must be between ${section.min} and ${section.max}`;
        }
      }

      // Date range validation
      if (section.type === 'date-range' && value) {
        if (value.start && value.end && new Date(value.start) > new Date(value.end)) {
          errors[section.id] = 'Start date cannot be after end date';
        }
      }

      // Location validation
      if (section.type === 'location' && section.required && !value?.coordinates) {
        errors[section.id] = 'Please select a location';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Apply filters
   */
  const handleApply = () => {
    if (!validateFilters()) {
      Alert.alert('Validation Error', 'Please check your filter selections.');
      return;
    }

    // Transform filters for API consumption
    const transformedFilters = transformFiltersForAPI(filters);
    onApply(transformedFilters);
    onClose();
  };

  /**
   * Transform filters for API
   */
  const transformFiltersForAPI = (currentFilters) => {
    const transformed = { ...currentFilters };

    // Transform location to coordinates string
    if (transformed.location?.coordinates) {
      transformed.location = {
        ...transformed.location,
        coordinates: `${transformed.location.coordinates.latitude},${transformed.location.coordinates.longitude}`,
      };
    }

    // Transform date ranges to ISO strings
    if (transformed.timeline) {
      if (transformed.timeline.start) {
        transformed.timeline.start = new Date(transformed.timeline.start).toISOString();
      }
      if (transformed.timeline.end) {
        transformed.timeline.end = new Date(transformed.timeline.end).toISOString();
      }
    }

    return transformed;
  };

  /**
   * Reset all filters
   */
  const handleReset = () => {
    const resetFilters = config.sections.reduce((acc, section) => {
      switch (section.type) {
        case 'multi-select':
          acc[section.id] = [];
          break;
        case 'range':
          acc[section.id] = { min: section.min, max: section.max };
          break;
        case 'rating':
          acc[section.id] = section.min;
          break;
        case 'location':
          acc[section.id] = {
            coordinates: null,
            address: '',
            radius: section.radius ? 10 : null,
            region: '',
          };
          break;
        case 'date-range':
          acc[section.id] = {
            start: null,
            end: null,
            duration: null,
          };
          break;
        default:
          acc[section.id] = null;
      }
      return acc;
    }, {});

    setFilters(resetFilters);
    setValidationErrors({});
  };

  /**
   * Get active filter count
   */
  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) {
        if (value.min !== undefined && value.max !== undefined) {
          return value.min !== initialFilters[value]?.min || value.max !== initialFilters[value]?.max;
        }
        return Object.values(value).some(v => v !== null && v !== '' && v !== false);
      }
      return value !== null && value !== '' && value !== false;
    }).length;
  };

  /**
   * Render filter section based on type
   */
  const renderFilterSection = (section) => {
    const isActive = activeSections.has(section.id);
    const value = filters[section.id];
    const error = validationErrors[section.id];

    const sectionHeader = (
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {section.title}
        </ThemedText>
        <Button
          title={isActive ? '▲' : '▼'}
          onPress={() => toggleSection(section.id)}
          variant="text"
          size="small"
          style={styles.sectionToggle}
        />
      </View>
    );

    if (!isActive) {
      return (
        <Card key={section.id} style={styles.sectionCard}>
          {sectionHeader}
        </Card>
      );
    }

    let sectionContent;

    switch (section.type) {
      case 'multi-select':
        sectionContent = (
          <View style={styles.multiSelectContent}>
            {section.options.map(option => (
              <Checkbox
                key={option.value}
                label={`${option.label} ${option.count ? `(${option.count})` : ''}`}
                checked={value.includes(option.value)}
                onPress={() => handleMultiSelectChange(section.id, option.value)}
                style={styles.checkboxItem}
              />
            ))}
          </View>
        );
        break;

      case 'range':
        sectionContent = (
          <View style={styles.rangeContent}>
            <Slider
              minimumValue={section.min}
              maximumValue={section.max}
              step={section.step}
              value={value}
              onValueChange={(range) => handleRangeChange(section.id, range)}
              format={section.format}
              unit={section.unit}
            />
            <View style={styles.rangeLabels}>
              <ThemedText type="default" style={styles.rangeLabel}>
                {section.format === 'currency' 
                  ? formatters.formatCurrency(value.min, section.unit)
                  : `${value.min} ${section.unit}`
                }
              </ThemedText>
              <ThemedText type="default" style={styles.rangeLabel}>
                {section.format === 'currency'
                  ? formatters.formatCurrency(value.max, section.unit)
                  : `${value.max} ${section.unit}`
                }
              </ThemedText>
            </View>
          </View>
        );
        break;

      case 'rating':
        sectionContent = (
          <View style={styles.ratingContent}>
            {[1, 2, 3, 4, 5].map(rating => (
              <Button
                key={rating}
                title={`${rating}+`}
                onPress={() => handleRatingChange(section.id, rating)}
                variant={value >= rating ? 'primary' : 'outline'}
                size="small"
                style={styles.ratingButton}
              />
            ))}
          </View>
        );
        break;

      case 'location':
        sectionContent = (
          <View style={styles.locationContent}>
            <LocationPicker
              onLocationSelect={(location) => handleLocationChange(section.id, location)}
              onUseCurrentLocation={() => handleUseCurrentLocation(section.id)}
              selectedLocation={value?.coordinates}
              address={value?.address}
              region={value?.region}
              onRegionChange={(region) => handleLocationChange(section.id, { region })}
              loading={locationLoading}
              showRadius={section.radius}
              radius={value?.radius}
              onRadiusChange={(radius) => handleLocationChange(section.id, { radius })}
              maxRadius={section.maxRadius}
            />
          </View>
        );
        break;

      case 'date-range':
        sectionContent = (
          <View style={styles.dateRangeContent}>
            <DatePicker
              startDate={value?.start}
              endDate={value?.end}
              onDateChange={(start, end) => handleDateRangeChange(section.id, { start, end })}
              showDuration={section.showDuration}
              onDurationChange={(duration) => handleDateRangeChange(section.id, { duration })}
            />
          </View>
        );
        break;

      default:
        sectionContent = (
          <ThemedText type="default" style={styles.unsupportedText}>
            Filter type not supported
          </ThemedText>
        );
    }

    return (
      <Card key={section.id} style={styles.sectionCard}>
        {sectionHeader}
        {sectionContent}
        {error && (
          <ThemedText type="default" style={styles.errorText}>
            {error}
          </ThemedText>
        )}
      </Card>
    );
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={config.title}
      size="large"
      showHeader={true}
    >
      <ThemedView style={styles.container}>
        {/* Filter Count Badge */}
        {activeFilterCount > 0 && (
          <View style={styles.filterCountBadge}>
            <Badge
              text={`${activeFilterCount} active filter${activeFilterCount !== 1 ? 's' : ''}`}
              color={colors.primary}
              size="small"
            />
          </View>
        )}

        {/* Filters Scroll View */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {config.sections.map(renderFilterSection)}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <Button
            title="Reset All"
            onPress={handleReset}
            variant="outline"
            size="medium"
            style={styles.resetButton}
          />
          <View style={styles.actionButtons}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="secondary"
              size="medium"
            />
            <Button
              title="Apply Filters"
              onPress={handleApply}
              variant="primary"
              size="medium"
              disabled={Object.keys(validationErrors).length > 0}
            />
          </View>
        </View>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxHeight: '80%',
  },
  filterCountBadge: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  sectionCard: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
  },
  sectionToggle: {
    minWidth: 40,
  },
  multiSelectContent: {
    gap: 8,
  },
  checkboxItem: {
    paddingVertical: 6,
  },
  rangeContent: {
    gap: 16,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  ratingContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingButton: {
    minWidth: 50,
  },
  locationContent: {
    gap: 12,
  },
  dateRangeContent: {
    gap: 12,
  },
  unsupportedText: {
    textAlign: 'center',
    opacity: 0.5,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    gap: 12,
  },
  resetButton: {
    flex: 1,
  },
  actionButtons: {
    flex: 2,
    flexDirection: 'row',
    gap: 12,
  },
});

export default FilterModal;