import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PROJECT_STATUS_OPTIONS = [
  { label: 'All Projects', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'On Hold', value: 'on_hold' },
];

const PROJECT_TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Construction', value: 'construction' },
  { label: 'Renovation', value: 'renovation' },
  { label: 'Design', value: 'design' },
  { label: 'Maintenance', value: 'maintenance' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Name A-Z', value: 'name_asc' },
  { label: 'Name Z-A', value: 'name_desc' },
  { label: 'Budget High to Low', value: 'budget_desc' },
  { label: 'Budget Low to High', value: 'budget_asc' },
];

const Filters = ({ 
  initialFilters = {}, 
  onApplyFilters,
  onClose,
  visible 
}) => {
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    sortBy: 'newest',
    minBudget: '',
    maxBudget: '',
    dateRange: {
      start: '',
      end: '',
    },
    tags: [],
    ...initialFilters,
  });

  const [activeSection, setActiveSection] = useState(null);
  const [customBudget, setCustomBudget] = useState({
    min: filters.minBudget || '',
    max: filters.maxBudget || '',
  });

  const BUDGET_RANGES = [
    { label: 'Any Budget', value: '' },
    { label: 'Under 10,000 ETB', value: '0-10000' },
    { label: '10,000 - 50,000 ETB', value: '10000-50000' },
    { label: '50,000 - 200,000 ETB', value: '50000-200000' },
    { label: 'Over 200,000 ETB', value: '200000-' },
  ];

  const handleSelectStatus = (status) => {
    setFilters({ ...filters, status });
  };

  const handleSelectType = (type) => {
    setFilters({ ...filters, type });
  };

  const handleSelectSort = (sortBy) => {
    setFilters({ ...filters, sortBy });
  };

  const handleBudgetRangeSelect = (range) => {
    if (range === '') {
      setFilters({ 
        ...filters, 
        minBudget: '', 
        maxBudget: '' 
      });
      setCustomBudget({ min: '', max: '' });
      return;
    }

    const [min, max] = range.split('-');
    setFilters({ 
      ...filters, 
      minBudget: min || '', 
      maxBudget: max || '' 
    });
    setCustomBudget({ 
      min: min || '', 
      max: max || '' 
    });
  };

  const handleCustomBudgetChange = (field, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setCustomBudget({ ...customBudget, [field]: numericValue });
  };

  const handleApplyCustomBudget = () => {
    setFilters({
      ...filters,
      minBudget: customBudget.min,
      maxBudget: customBudget.max,
    });
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      status: 'all',
      type: 'all',
      sortBy: 'newest',
      minBudget: '',
      maxBudget: '',
      dateRange: { start: '', end: '' },
      tags: [],
    };
    setFilters(clearedFilters);
    setCustomBudget({ min: '', max: '' });
    onApplyFilters?.(clearedFilters);
  };

  const handleApplyFilters = () => {
    // Apply custom budget if it's different from current filters
    const finalFilters = {
      ...filters,
      minBudget: customBudget.min,
      maxBudget: customBudget.max,
    };
    onApplyFilters?.(finalFilters);
    onClose?.();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.type !== 'all') count++;
    if (filters.sortBy !== 'newest') count++;
    if (filters.minBudget || filters.maxBudget) count++;
    if (filters.tags.length > 0) count++;
    return count;
  };

  const renderStatusFilters = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Status</Text>
      <View style={styles.optionsContainer}>
        {PROJECT_STATUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              filters.status === option.value && styles.optionButtonActive,
            ]}
            onPress={() => handleSelectStatus(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                filters.status === option.value && styles.optionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTypeFilters = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Project Type</Text>
      <View style={styles.optionsContainer}>
        {PROJECT_TYPE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              filters.type === option.value && styles.optionButtonActive,
            ]}
            onPress={() => handleSelectType(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                filters.type === option.value && styles.optionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSortOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sort By</Text>
      <View style={styles.optionsContainer}>
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              filters.sortBy === option.value && styles.optionButtonActive,
            ]}
            onPress={() => handleSelectSort(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                filters.sortBy === option.value && styles.optionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBudgetFilters = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Budget Range (ETB)</Text>
      
      {/* Quick Budget Ranges */}
      <View style={styles.optionsContainer}>
        {BUDGET_RANGES.map((range) => {
          const isSelected = 
            filters.minBudget === (range.value.split('-')[0] || '') &&
            filters.maxBudget === (range.value.split('-')[1] || '');
          
          return (
            <TouchableOpacity
              key={range.label}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonActive,
              ]}
              onPress={() => handleBudgetRangeSelect(range.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom Budget Input */}
      <View style={styles.customBudgetContainer}>
        <Text style={styles.customBudgetTitle}>Custom Range</Text>
        <View style={styles.budgetInputRow}>
          <View style={styles.budgetInputContainer}>
            <Text style={styles.budgetInputLabel}>Min</Text>
            <View style={styles.budgetInputWrapper}>
              <Text style={styles.budgetCurrency}>ETB</Text>
              <TextInput
                style={styles.budgetInput}
                value={customBudget.min}
                onChangeText={(value) => handleCustomBudgetChange('min', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
          
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>to</Text>
            <View style={styles.separatorLine} />
          </View>
          
          <View style={styles.budgetInputContainer}>
            <Text style={styles.budgetInputLabel}>Max</Text>
            <View style={styles.budgetInputWrapper}>
              <Text style={styles.budgetCurrency}>ETB</Text>
              <TextInput
                style={styles.budgetInput}
                value={customBudget.max}
                onChangeText={(value) => handleCustomBudgetChange('max', value)}
                keyboardType="numeric"
                placeholder="Any"
              />
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.applyCustomBudgetButton}
          onPress={handleApplyCustomBudget}
        >
          <Text style={styles.applyCustomBudgetButtonText}>Apply Custom Range</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
      >
        <Ionicons name="close" size={24} color="#666" />
      </TouchableOpacity>
      
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Filters</Text>
        {getActiveFiltersCount() > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getActiveFiltersCount()}</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.clearButton}
        onPress={handleClearFilters}
        disabled={getActiveFiltersCount() === 0}
      >
        <Text style={[
          styles.clearButtonText,
          getActiveFiltersCount() === 0 && styles.clearButtonTextDisabled
        ]}>
          Clear All
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.applyButton}
        onPress={handleApplyFilters}
      >
        <Text style={styles.applyButtonText}>
          Apply Filters
        </Text>
        {getActiveFiltersCount() > 0 && (
          <View style={styles.applyButtonBadge}>
            <Text style={styles.applyButtonBadgeText}>
              {getActiveFiltersCount()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {renderHeader()}
        
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {renderStatusFilters()}
          {renderTypeFilters()}
          {renderBudgetFilters()}
          {renderSortOptions()}
        </ScrollView>
        
        {renderFooter()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  badge: {
    backgroundColor: '#4361ee',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#4361ee',
    fontWeight: '500',
  },
  clearButtonTextDisabled: {
    color: '#adb5bd',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  optionButtonActive: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  optionText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
  },
  customBudgetContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  customBudgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetInputContainer: {
    flex: 1,
  },
  budgetInputLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  budgetInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  budgetCurrency: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
    backgroundColor: '#e9ecef',
    height: 44,
    textAlignVertical: 'center',
  },
  budgetInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212529',
    height: 44,
  },
  separatorContainer: {
    alignItems: 'center',
    gap: 4,
  },
  separatorLine: {
    width: 20,
    height: 1,
    backgroundColor: '#dee2e6',
  },
  separatorText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  applyCustomBudgetButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyCustomBudgetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  applyButton: {
    backgroundColor: '#4361ee',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButtonBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  applyButtonBadgeText: {
    color: '#4361ee',
    fontSize: 12,
    fontWeight: '600',
  },
});

// Import TextInput at the top
import { TextInput } from 'react-native';

export default Filters;