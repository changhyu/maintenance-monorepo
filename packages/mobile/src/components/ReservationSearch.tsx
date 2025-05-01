import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useReservationFilter } from '../context/ReservationFilterContext';
import { colors, spacing, typography } from '../theme';

const ReservationSearch: React.FC = () => {
  const {
    searchQuery,
    filterOptions,
    sortOptions,
    setSearchQuery,
    updateFilterOptions,
    updateSortOptions,
    resetFilters,
    clearDateRange,
  } = useReservationFilter();

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      updateFilterOptions({
        dateRange: {
          ...filterOptions.dateRange,
          startDate: selectedDate,
        },
      });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      updateFilterOptions({
        dateRange: {
          ...filterOptions.dateRange,
          endDate: selectedDate,
        },
      });
    }
  };

  const toggleStatus = (status: string) => {
    const currentStatuses = filterOptions.status;
    const newStatuses = currentStatuses.includes(status as any)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status as any];
    updateFilterOptions({ status: newStatuses });
  };

  const toggleServiceType = (type: string) => {
    const currentTypes = filterOptions.serviceType;
    const newTypes = currentTypes.includes(type as any)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type as any];
    updateFilterOptions({ serviceType: newTypes });
  };

  const togglePriority = (priority: string) => {
    const currentPriorities = filterOptions.priority;
    const newPriorities = currentPriorities.includes(priority as any)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority as any];
    updateFilterOptions({ priority: newPriorities });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="차량 ID, 고객 ID, 기술자 ID로 검색"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>상태 필터</Text>
        <View style={styles.filterButtons}>
          {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filterOptions.status.includes(status as any) && styles.filterButtonActive,
              ]}
              onPress={() => toggleStatus(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterOptions.status.includes(status as any) && styles.filterButtonTextActive,
                ]}
              >
                {status === 'pending' ? '대기' :
                 status === 'confirmed' ? '확정' :
                 status === 'in_progress' ? '진행' :
                 status === 'completed' ? '완료' : '취소'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>서비스 유형</Text>
        <View style={styles.filterButtons}>
          {['regular', 'emergency', 'inspection', 'repair'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                filterOptions.serviceType.includes(type as any) && styles.filterButtonActive,
              ]}
              onPress={() => toggleServiceType(type)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterOptions.serviceType.includes(type as any) && styles.filterButtonTextActive,
                ]}
              >
                {type === 'regular' ? '정기' :
                 type === 'emergency' ? '긴급' :
                 type === 'inspection' ? '점검' : '수리'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>우선순위</Text>
        <View style={styles.filterButtons}>
          {['high', 'medium', 'low'].map(priority => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterButton,
                filterOptions.priority.includes(priority as any) && styles.filterButtonActive,
              ]}
              onPress={() => togglePriority(priority)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterOptions.priority.includes(priority as any) && styles.filterButtonTextActive,
                ]}
              >
                {priority === 'high' ? '높음' :
                 priority === 'medium' ? '중간' : '낮음'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>날짜 범위</Text>
        <View style={styles.dateRangeContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {filterOptions.dateRange.startDate
                ? filterOptions.dateRange.startDate.toLocaleDateString()
                : '시작일'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dateRangeSeparator}>~</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {filterOptions.dateRange.endDate
                ? filterOptions.dateRange.endDate.toLocaleDateString()
                : '종료일'}
            </Text>
          </TouchableOpacity>
          {(filterOptions.dateRange.startDate || filterOptions.dateRange.endDate) && (
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={clearDateRange}
            >
              <Text style={styles.clearDateButtonText}>초기화</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정렬</Text>
        <View style={styles.sortContainer}>
          <View style={styles.sortButtons}>
            {[
              { field: 'scheduledDate', label: '날짜' },
              { field: 'priority', label: '우선순위' },
              { field: 'status', label: '상태' },
              { field: 'serviceType', label: '서비스 유형' },
            ].map(({ field, label }) => (
              <TouchableOpacity
                key={field}
                style={[
                  styles.sortButton,
                  sortOptions.field === field && styles.sortButtonActive,
                ]}
                onPress={() => updateSortOptions({ field: field as any })}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortOptions.field === field && styles.sortButtonTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.orderButton}
            onPress={() =>
              updateSortOptions({ order: sortOptions.order === 'asc' ? 'desc' : 'asc' })
            }
          >
            <Text style={styles.orderButtonText}>
              {sortOptions.order === 'asc' ? '오름차순' : '내림차순'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetFilters}
      >
        <Text style={styles.resetButtonText}>필터 초기화</Text>
      </TouchableOpacity>

      {showStartDatePicker && (
        <DateTimePicker
          value={filterOptions.dateRange.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={filterOptions.dateRange.endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchSection: {
    padding: spacing.m,
    backgroundColor: colors.surface,
  },
  searchInput: {
    ...typography.body,
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    color: colors.text,
  },
  section: {
    padding: spacing.m,
    backgroundColor: colors.surface,
    marginTop: spacing.s,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.m,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -spacing.xs,
  },
  filterButton: {
    margin: spacing.xs,
    padding: spacing.s,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    ...typography.body,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.surface,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  dateRangeSeparator: {
    ...typography.body,
    color: colors.text,
    marginHorizontal: spacing.m,
  },
  clearDateButton: {
    marginLeft: spacing.m,
    padding: spacing.s,
    backgroundColor: colors.error,
    borderRadius: spacing.xs,
  },
  clearDateButtonText: {
    ...typography.caption,
    color: colors.surface,
  },
  sortContainer: {
    marginBottom: spacing.m,
  },
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -spacing.xs,
    marginBottom: spacing.m,
  },
  sortButton: {
    margin: spacing.xs,
    padding: spacing.s,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortButtonText: {
    ...typography.body,
    color: colors.text,
  },
  sortButtonTextActive: {
    color: colors.surface,
  },
  orderButton: {
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  orderButtonText: {
    ...typography.body,
    color: colors.text,
  },
  resetButton: {
    margin: spacing.m,
    padding: spacing.m,
    backgroundColor: colors.error,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  resetButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
});

export default ReservationSearch; 