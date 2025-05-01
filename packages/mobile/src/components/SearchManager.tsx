import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSearch } from '../context/SearchContext';
import { colors, spacing, typography } from '../theme';
import { SearchFilter } from '../types/report';

const SearchManager: React.FC = () => {
  const {
    results,
    savedSearches,
    loading,
    error,
    search,
    saveSearch,
    deleteSavedSearch,
    setDefaultSearch,
  } = useSearch();

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>({
    keyword: '',
    page: 1,
    limit: 20,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFilter(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange!,
          startDate: selectedDate,
        },
      }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setFilter(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange!,
          endDate: selectedDate,
        },
      }));
    }
  };

  const handleSearch = async () => {
    try {
      await search(filter);
    } catch (err) {
      Alert.alert('오류', '검색 중 오류가 발생했습니다.');
    }
  };

  const handleSaveSearch = async () => {
    if (!saveName) {
      Alert.alert('오류', '검색 이름을 입력해주세요.');
      return;
    }

    try {
      await saveSearch(saveName, filter, saveDescription);
      Alert.alert('성공', '검색이 저장되었습니다.');
      setSaveName('');
      setSaveDescription('');
    } catch (err) {
      Alert.alert('오류', '검색 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSavedSearch = (id: string) => {
    Alert.alert(
      '저장된 검색 삭제',
      '이 검색을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavedSearch(id);
              Alert.alert('성공', '검색이 삭제되었습니다.');
            } catch (err) {
              Alert.alert('오류', '검색 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleLoadSavedSearch = (savedFilter: SearchFilter) => {
    setFilter(savedFilter);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>보고서 검색</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <TextInput
          style={styles.searchInput}
          placeholder="검색어 입력"
          value={filter.keyword}
          onChangeText={text => setFilter(prev => ({ ...prev, keyword: text }))}
        />

        <TouchableOpacity
          style={styles.advancedButton}
          onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Text style={styles.advancedButtonText}>
            {showAdvancedFilters ? '기본 검색' : '상세 검색'}
          </Text>
        </TouchableOpacity>

        {showAdvancedFilters && (
          <>
            <Text style={styles.label}>기간 설정</Text>
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {filter.dateRange?.startDate
                    ? filter.dateRange.startDate.toLocaleDateString()
                    : '시작일'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>~</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {filter.dateRange?.endDate
                    ? filter.dateRange.endDate.toLocaleDateString()
                    : '종료일'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>정렬</Text>
            <View style={styles.sortButtons}>
              {[
                { value: 'date', label: '날짜' },
                { value: 'status', label: '상태' },
                { value: 'priority', label: '우선순위' },
                { value: 'cost', label: '비용' },
                { value: 'duration', label: '소요시간' },
              ].map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.sortButton,
                    filter.sortBy === value && styles.sortButtonActive,
                  ]}
                  onPress={() =>
                    setFilter(prev => ({
                      ...prev,
                      sortBy: value as any,
                      sortOrder:
                        prev.sortBy === value && prev.sortOrder === 'asc'
                          ? 'desc'
                          : 'asc',
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      filter.sortBy === value && styles.sortButtonTextActive,
                    ]}
                  >
                    {label}
                    {filter.sortBy === value &&
                      (filter.sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {results && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>검색 결과</Text>
          <Text style={styles.resultCount}>
            총 {results.total}건 중 {results.items.length}건
          </Text>

          {results.items.map((item, index) => (
            <View key={index} style={styles.resultItem}>
              {/* 결과 아이템 렌더링 */}
            </View>
          ))}

          {results.totalPages > 1 && (
            <View style={styles.pagination}>
              {Array.from({ length: results.totalPages }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.pageButton,
                    results.page === i + 1 && styles.pageButtonActive,
                  ]}
                  onPress={() =>
                    setFilter(prev => ({ ...prev, page: i + 1 }))
                  }
                >
                  <Text
                    style={[
                      styles.pageButtonText,
                      results.page === i + 1 && styles.pageButtonTextActive,
                    ]}
                  >
                    {i + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>검색 저장</Text>
        <TextInput
          style={styles.input}
          placeholder="검색 이름"
          value={saveName}
          onChangeText={setSaveName}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="설명 (선택사항)"
          value={saveDescription}
          onChangeText={setSaveDescription}
          multiline
        />
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveSearch}
        >
          <Text style={styles.saveButtonText}>저장</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>저장된 검색</Text>
        {savedSearches.map(savedSearch => (
          <View key={savedSearch.id} style={styles.savedSearchItem}>
            <View style={styles.savedSearchHeader}>
              <Text style={styles.savedSearchName}>{savedSearch.name}</Text>
              {savedSearch.isDefault && (
                <Text style={styles.defaultBadge}>기본</Text>
              )}
            </View>
            {savedSearch.description && (
              <Text style={styles.savedSearchDescription}>
                {savedSearch.description}
              </Text>
            )}
            <Text style={styles.savedSearchDate}>
              생성일: {new Date(savedSearch.createdAt).toLocaleDateString()}
            </Text>
            <View style={styles.savedSearchActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLoadSavedSearch(savedSearch.filter)}
              >
                <Text style={styles.actionButtonText}>불러오기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setDefaultSearch(savedSearch.id)}
              >
                <Text style={styles.actionButtonText}>기본으로 설정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteSavedSearch(savedSearch.id)}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {showStartDatePicker && (
        <DateTimePicker
          value={filter.dateRange?.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          maximumDate={filter.dateRange?.endDate}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={filter.dateRange?.endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={filter.dateRange?.startDate}
          maximumDate={new Date()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.m,
  },
  header: {
    padding: spacing.l,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  errorContainer: {
    padding: spacing.m,
    backgroundColor: colors.error,
    marginBottom: spacing.m,
  },
  errorText: {
    ...typography.body,
    color: colors.surface,
  },
  section: {
    padding: spacing.l,
    backgroundColor: colors.surface,
    marginTop: spacing.s,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.m,
  },
  searchInput: {
    ...typography.body,
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  advancedButton: {
    alignSelf: 'flex-end',
    padding: spacing.s,
  },
  advancedButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  label: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  dateButton: {
    flex: 1,
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
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
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -spacing.xs,
    marginBottom: spacing.m,
  },
  sortButton: {
    margin: spacing.xs,
    padding: spacing.s,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
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
  searchButton: {
    backgroundColor: colors.primary,
    padding: spacing.m,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  searchButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
  resultCount: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.m,
  },
  resultItem: {
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.m,
  },
  pageButton: {
    padding: spacing.s,
    marginHorizontal: spacing.xs,
    minWidth: 30,
    alignItems: 'center',
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pageButtonText: {
    ...typography.body,
    color: colors.text,
  },
  pageButtonTextActive: {
    color: colors.surface,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.m,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
  savedSearchItem: {
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  savedSearchName: {
    ...typography.h4,
    color: colors.text,
  },
  defaultBadge: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  savedSearchDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  savedSearchDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.m,
  },
  savedSearchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: spacing.s,
    marginLeft: spacing.s,
    borderRadius: spacing.xs,
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.surface,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.surface,
  },
});

export default SearchManager; 