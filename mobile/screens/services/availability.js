import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { ThemeContext } from '../../../contexts/theme-context';
import { AuthContext } from '../../../contexts/auth-context';
import { UserContext } from '../../../contexts/user-context';
import { ServiceContext } from '../../../contexts/service-context';
import { 
  AVAILABILITY_STATUS,
  WORKING_HOURS,
  DAYS_OF_WEEK,
  SERVICE_TYPES 
} from '../../../constants/service';
import { USER_ROLES } from '../../../constants/user';
import { 
  formatEthiopianDate,
  formatTime,
  formatDuration 
} from '../../../utils/formatters';
import { 
  getServiceAvailability,
  updateAvailability,
  setRecurringSchedule,
  createTimeBlock,
  removeTimeBlock,
  updateWorkingHours 
} from '../../../services/service-service';
import { 
  triggerAvailabilityUpdateNotification,
  sendBookingConfirmation 
} from '../../../services/notification-service';
import { 
  validateTimeSlot,
  checkSlotConflicts,
  calculateAvailableSlots 
} from '../../../utils/service-calculations';

// Components
import ThemedView from '../../../components/themed-view';
import ThemedText from '../../../components/themed-text';
import Button from '../../../components/ui/button';
import Card from '../../../components/ui/card';
import Loading from '../../../components/ui/loading';
import Badge from '../../../components/ui/badge';
import Modal from '../../../components/ui/modal';
import TimeSlotPicker from '../../../components/service/time-slot-picker';
import WorkingHoursEditor from '../../../components/service/working-hours-editor';
import RecurringSchedule from '../../../components/service/recurring-schedule';
import AvailabilityOverview from '../../../components/service/availability-overview';
import EmptyState from '../../../components/ui/empty-state';
import ConfirmationModal from '../../../components/ui/confirmation-modal';

const AvailabilityScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Context
  const { theme, colors } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { userProfile, updateUserProfile } = useContext(UserContext);
  const { services, refreshServices } = useContext(ServiceContext);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availability, setAvailability] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('calendar');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showWorkingHours, setShowWorkingHours] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [workingHours, setWorkingHours] = useState({});
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [stats, setStats] = useState({
    availableDays: 0,
    bookedSlots: 0,
    availableSlots: 0,
    upcomingBookings: 0,
  });

  // Check if user is service provider
  const isServiceProvider = user?.role === USER_ROLES.SERVICE_PROVIDER || 
                           user?.role === USER_ROLES.WORKER;

  // Load availability data
  useFocusEffect(
    useCallback(() => {
      if (isServiceProvider) {
        loadAvailabilityData();
      }
    }, [user?.id])
  );

  const loadAvailabilityData = async () => {
    try {
      setLoading(true);
      
      const availabilityData = await getServiceAvailability(user.id);
      setAvailability(availabilityData.availability || {});
      setTimeBlocks(availabilityData.timeBlocks || []);
      setWorkingHours(availabilityData.workingHours || getDefaultWorkingHours());
      setRecurringSchedules(availabilityData.recurringSchedules || []);
      
      // Calculate statistics
      calculateStatistics(availabilityData);
      
    } catch (error) {
      Alert.alert('Load Failed', 'Failed to load availability: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get default working hours for Ethiopia
  const getDefaultWorkingHours = () => {
    return {
      [DAYS_OF_WEEK.MONDAY]: { start: '08:00', end: '17:00', available: true },
      [DAYS_OF_WEEK.TUESDAY]: { start: '08:00', end: '17:00', available: true },
      [DAYS_OF_WEEK.WEDNESDAY]: { start: '08:00', end: '17:00', available: true },
      [DAYS_OF_WEEK.THURSDAY]: { start: '08:00', end: '17:00', available: true },
      [DAYS_OF_WEEK.FRIDAY]: { start: '08:00', end: '17:00', available: true },
      [DAYS_OF_WEEK.SATURDAY]: { start: '09:00', end: '14:00', available: true },
      [DAYS_OF_WEEK.SUNDAY]: { start: '09:00', end: '12:00', available: false },
    };
  };

  // Calculate availability statistics
  const calculateStatistics = (availabilityData) => {
    const availableDays = Object.values(workingHours).filter(day => day.available).length;
    const bookedSlots = timeBlocks.filter(block => block.status === 'booked').length;
    const availableSlots = timeBlocks.filter(block => block.status === 'available').length;
    
    // Calculate upcoming bookings (this would come from booking service)
    const upcomingBookings = 0; // Placeholder

    setStats({
      availableDays,
      bookedSlots,
      availableSlots,
      upcomingBookings,
    });
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailabilityData();
    setRefreshing(false);
  };

  // Add time slot
  const handleAddTimeSlot = async (date, startTime, endTime, type = 'available') => {
    try {
      const slot = {
        date,
        startTime,
        endTime,
        type,
        serviceProviderId: user.id,
        createdAt: new Date().toISOString(),
      };

      // Validate time slot
      const validation = validateTimeSlot(slot, timeBlocks);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check for conflicts
      const conflicts = checkSlotConflicts(slot, timeBlocks);
      if (conflicts.length > 0) {
        Alert.alert(
          'Time Slot Conflict',
          `This time slot conflicts with existing ${conflicts.length} booking(s). Do you want to proceed?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Proceed', 
              onPress: () => createTimeSlot(slot) 
            },
          ]
        );
        return;
      }

      await createTimeSlot(slot);
    } catch (error) {
      Alert.alert('Add Failed', error.message);
    }
  };

  // Create time slot
  const createTimeSlot = async (slot) => {
    const newBlock = await createTimeBlock(slot);
    
    setTimeBlocks(prev => [...prev, newBlock]);
    
    // Update availability for the date
    const dateAvailability = calculateAvailableSlots([...timeBlocks, newBlock], selectedDate);
    setAvailability(prev => ({
      ...prev,
      [selectedDate]: dateAvailability,
    }));

    Alert.alert('Success', 'Time slot added successfully.');
    setShowTimePicker(false);
  };

  // Remove time slot
  const handleRemoveTimeSlot = async (timeBlockId) => {
    try {
      await removeTimeBlock(timeBlockId);
      
      setTimeBlocks(prev => prev.filter(block => block.id !== timeBlockId));
      
      // Update availability
      const dateAvailability = calculateAvailableSlots(
        timeBlocks.filter(block => block.id !== timeBlockId), 
        selectedDate
      );
      setAvailability(prev => ({
        ...prev,
        [selectedDate]: dateAvailability,
      }));

      Alert.alert('Success', 'Time slot removed successfully.');
    } catch (error) {
      Alert.alert('Remove Failed', error.message);
    }
  };

  // Update working hours
  const handleUpdateWorkingHours = async (updatedHours) => {
    try {
      setLoading(true);

      await updateWorkingHours(user.id, updatedHours);
      setWorkingHours(updatedHours);

      // Recalculate availability for all dates
      await recalculateAllAvailability();

      Alert.alert('Success', 'Working hours updated successfully.');
      setShowWorkingHours(false);
    } catch (error) {
      Alert.alert('Update Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Set recurring schedule
  const handleSetRecurringSchedule = async (schedule) => {
    try {
      const newSchedule = await setRecurringSchedule(user.id, schedule);
      
      setRecurringSchedules(prev => [...prev, newSchedule]);
      
      // Apply recurring schedule to future dates
      await applyRecurringSchedule(newSchedule);

      Alert.alert('Success', 'Recurring schedule set successfully.');
      setShowRecurringModal(false);
    } catch (error) {
      Alert.alert('Schedule Failed', error.message);
    }
  };

  // Apply recurring schedule to future dates
  const applyRecurringSchedule = async (schedule) => {
    // Implementation for applying recurring schedule
    // This would generate time blocks for future dates based on the schedule
    console.log('Applying recurring schedule:', schedule);
  };

  // Recalculate all availability
  const recalculateAllAvailability = async () => {
    const newAvailability = {};
    const allTimeBlocks = [...timeBlocks];
    
    // Calculate availability for next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      newAvailability[dateString] = calculateAvailableSlots(allTimeBlocks, dateString);
    }
    
    setAvailability(newAvailability);
  };

  // Mark date as unavailable
  const handleMarkUnavailable = async (date) => {
    try {
      const dateString = typeof date === 'string' ? date : date.dateString;
      
      await updateAvailability(user.id, {
        [dateString]: AVAILABILITY_STATUS.UNAVAILABLE,
      });

      setAvailability(prev => ({
        ...prev,
        [dateString]: AVAILABILITY_STATUS.UNAVAILABLE,
      }));

      // Remove any time blocks for this date
      const blocksToRemove = timeBlocks.filter(block => block.date === dateString);
      for (const block of blocksToRemove) {
        await removeTimeBlock(block.id);
      }
      
      setTimeBlocks(prev => prev.filter(block => block.date !== dateString));

      Alert.alert('Success', `Marked ${formatEthiopianDate(dateString)} as unavailable.`);
    } catch (error) {
      Alert.alert('Update Failed', error.message);
    }
  };

  // Mark date as available
  const handleMarkAvailable = async (date) => {
    try {
      const dateString = typeof date === 'string' ? date : date.dateString;
      
      await updateAvailability(user.id, {
        [dateString]: AVAILABILITY_STATUS.AVAILABLE,
      });

      setAvailability(prev => ({
        ...prev,
        [dateString]: AVAILABILITY_STATUS.AVAILABLE,
      }));

      Alert.alert('Success', `Marked ${formatEthiopianDate(dateString)} as available.`);
    } catch (error) {
      Alert.alert('Update Failed', error.message);
    }
  };

  // Get marked dates for calendar
  const getMarkedDates = () => {
    const marked = {};
    
    Object.keys(availability).forEach(date => {
      marked[date] = {
        selected: date === selectedDate,
        selectedColor: colors.primary,
        disabled: availability[date] === AVAILABILITY_STATUS.UNAVAILABLE,
        disabledColor: colors.error,
        dotColor: availability[date] === AVAILABILITY_STATUS.AVAILABLE ? colors.success : colors.error,
      };
    });

    // Mark today
    const today = new Date().toISOString().split('T')[0];
    marked[today] = {
      ...marked[today],
      selected: today === selectedDate,
      selectedColor: colors.primary,
      marked: true,
      dotColor: colors.info,
    };

    return marked;
  };

  // Get time slots for selected date
  const getTimeSlotsForDate = (date) => {
    return timeBlocks
      .filter(block => block.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Render calendar view
  const renderCalendarView = () => (
    <View style={{ gap: 16 }}>
      <Card>
        <Calendar
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={getMarkedDates()}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.card,
            textSectionTitleColor: colors.text,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.white,
            todayTextColor: colors.primary,
            dayTextColor: colors.text,
            textDisabledColor: colors.border,
            dotColor: colors.primary,
            selectedDotColor: colors.white,
            arrowColor: colors.primary,
            monthTextColor: colors.text,
            indicatorColor: colors.primary,
            textDayFontFamily: 'Inter-Regular',
            textMonthFontFamily: 'Inter-SemiBold',
            textDayHeaderFontFamily: 'Inter-Medium',
          }}
        />
      </Card>

      {/* Date Actions */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button
          title="Mark Unavailable"
          onPress={() => handleMarkUnavailable(selectedDate)}
          variant="outline"
          size="small"
          icon="x-circle"
          style={{ flex: 1 }}
        />
        <Button
          title="Mark Available"
          onPress={() => handleMarkAvailable(selectedDate)}
          variant="outline"
          size="small"
          icon="check-circle"
          style={{ flex: 1 }}
        />
        <Button
          title="Add Time Slot"
          onPress={() => setShowTimePicker(true)}
          variant="primary"
          size="small"
          icon="plus"
          style={{ flex: 1 }}
        />
      </View>

      {/* Time Slots for Selected Date */}
      <Card>
        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
          Time Slots for {formatEthiopianDate(selectedDate)}
        </ThemedText>
        
        {getTimeSlotsForDate(selectedDate).length === 0 ? (
          <EmptyState
            title="No Time Slots"
            description="Add time slots to make yourself available for bookings."
            icon="clock"
            size="small"
          />
        ) : (
          <View style={{ gap: 8 }}>
            {getTimeSlotsForDate(selectedDate).map(slot => (
              <TimeSlotItem
                key={slot.id}
                slot={slot}
                onRemove={() => handleRemoveTimeSlot(slot.id)}
              />
            ))}
          </View>
        )}
      </Card>
    </View>
  );

  // Render schedule view
  const renderScheduleView = () => (
    <View style={{ gap: 16 }}>
      <WorkingHoursEditor
        workingHours={workingHours}
        onUpdate={handleUpdateWorkingHours}
        style={{ marginBottom: 16 }}
      />

      <RecurringSchedule
        schedules={recurringSchedules}
        onAddSchedule={() => setShowRecurringModal(true)}
        onRemoveSchedule={(scheduleId) => {
          setRecurringSchedules(prev => prev.filter(s => s.id !== scheduleId));
        }}
      />
    </View>
  );

  // Render overview view
  const renderOverviewView = () => (
    <AvailabilityOverview
      stats={stats}
      availability={availability}
      timeBlocks={timeBlocks}
      workingHours={workingHours}
      onDateSelect={setSelectedDate}
    />
  );

  if (!isServiceProvider) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ThemedText type="title" style={{ textAlign: 'center', marginBottom: 12 }}>
          Availability Management
        </ThemedText>
        <ThemedText type="secondary" style={{ textAlign: 'center' }}>
          This feature is only available for service providers and workers.
        </ThemedText>
      </ThemedView>
    );
  }

  if (loading && !refreshing) {
    return <Loading message="Loading availability..." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ThemedText type="title">Availability Management</ThemedText>
        <ThemedText type="secondary">
          Manage your schedule and working hours
        </ThemedText>
      </View>

      {/* Statistics */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ paddingVertical: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12 }}
      >
        <StatCard label="Available Days" value={stats.availableDays} color={colors.success} />
        <StatCard label="Available Slots" value={stats.availableSlots} color={colors.info} />
        <StatCard label="Booked Slots" value={stats.bookedSlots} color={colors.primary} />
        <StatCard label="Upcoming Bookings" value={stats.upcomingBookings} color={colors.warning} />
      </ScrollView>

      {/* Tab Navigation */}
      <View style={{ 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border 
      }}>
        {['calendar', 'schedule', 'overview'].map(tab => (
          <Button
            key={tab}
            title={tab.charAt(0).toUpperCase() + tab.slice(1)}
            onPress={() => setActiveTab(tab)}
            variant={activeTab === tab ? 'primary' : 'outline'}
            size="small"
            style={{ flex: 1, borderRadius: 0 }}
          />
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'calendar' && renderCalendarView()}
        {activeTab === 'schedule' && renderScheduleView()}
        {activeTab === 'overview' && renderOverviewView()}
      </ScrollView>

      {/* Global Actions */}
      <View style={{ 
        padding: 16, 
        borderTopWidth: 1, 
        borderTopColor: colors.border,
        gap: 12,
      }}>
        <Button
          title="Set Working Hours"
          onPress={() => setShowWorkingHours(true)}
          variant="outline"
          icon="settings"
        />
        <Button
          title="Set Recurring Schedule"
          onPress={() => setShowRecurringModal(true)}
          variant="outline"
          icon="repeat"
        />
      </View>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        title="Add Time Slot"
      >
        <TimeSlotPicker
          date={selectedDate}
          workingHours={workingHours}
          existingSlots={getTimeSlotsForDate(selectedDate)}
          onSlotAdd={handleAddTimeSlot}
          onClose={() => setShowTimePicker(false)}
        />
      </Modal>

      {/* Working Hours Modal */}
      <Modal
        visible={showWorkingHours}
        onClose={() => setShowWorkingHours(false)}
        title="Set Working Hours"
        size="large"
      >
        <WorkingHoursEditor
          workingHours={workingHours}
          onUpdate={handleUpdateWorkingHours}
          onClose={() => setShowWorkingHours(false)}
        />
      </Modal>

      {/* Recurring Schedule Modal */}
      <Modal
        visible={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        title="Set Recurring Schedule"
        size="large"
      >
        <RecurringSchedule
          onSave={handleSetRecurringSchedule}
          onClose={() => setShowRecurringModal(false)}
        />
      </Modal>
    </ThemedView>
  );
};

// Helper Components
const StatCard = ({ label, value, color }) => {
  const { colors } = useContext(ThemeContext);
  
  return (
    <View style={{ 
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 100,
    }}>
      <ThemedText type="defaultSemiBold" style={{ fontSize: 20, color }}>
        {value}
      </ThemedText>
      <ThemedText type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
        {label}
      </ThemedText>
    </View>
  );
};

const TimeSlotItem = ({ slot, onRemove }) => {
  const { colors } = useContext(ThemeContext);
  
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.border + '20',
      borderRadius: 8,
    }}>
      <View>
        <ThemedText type="defaultSemiBold">
          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
        </ThemedText>
        <ThemedText type="secondary" style={{ fontSize: 12, marginTop: 2 }}>
          {slot.type === 'available' ? 'Available for booking' : 'Booked'}
        </ThemedText>
      </View>
      
      {slot.type === 'available' && (
        <Button
          title="Remove"
          onPress={onRemove}
          variant="outline"
          size="small"
          icon="trash-2"
        />
      )}
    </View>
  );
};

export default AvailabilityScreen;