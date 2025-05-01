import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAnalytics } from '../context/AnalyticsContext';
import { colors, spacing, typography } from '../theme';
import {
  AnalyticsFilter,
  AnalyticsConfig,
  AnalyticsResult,
} from '../types/report';
import {
  LineChart,
  BarChart,
  PieChart,
} from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const AnalyticsManager: React.FC = () => {
  const {
    results,
    loading,
    error,
    generateAnalytics,
    getRecentResults,
    getSavedConfigs,
    saveConfig,
    exportAnalytics,
  } = useAnalytics();

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [filter, setFilter] = useState<AnalyticsFilter>({
    dateRange: {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
  });
  const [config, setConfig] = useState<AnalyticsConfig>({
    metrics: {
      totalCount: true,
      totalDuration: true,
      totalCost: true,
      averageDuration: true,
      averageCost: true,
      completionRate: true,
    },
    groupBy: 'none',
    chartType: 'line',
    timeUnit: 'day',
    showTrends: true,
    compareWithPrevious: false,
    exportFormat: 'pdf',
  });
  const [currentResult, setCurrentResult] = useState<AnalyticsResult | null>(null);

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

  const handleGenerateAnalytics = async () => {
    try {
      const result = await generateAnalytics(filter, config);
      setCurrentResult(result);
    } catch (err) {
      Alert.alert('오류', '분석 생성 중 오류가 발생했습니다.');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await saveConfig(config);
      Alert.alert('성공', '분석 설정이 저장되었습니다.');
    } catch (err) {
      Alert.alert('오류', '설정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleExport = async () => {
    if (!currentResult) {
      Alert.alert('오류', '먼저 분석을 생성해주세요.');
      return;
    }

    try {
      const url = await exportAnalytics(currentResult);
      Alert.alert('성공', `분석이 내보내기되었습니다.\n${url}`);
    } catch (err) {
      Alert.alert('오류', '내보내기 중 오류가 발생했습니다.');
    }
  };

  const renderChart = () => {
    if (!currentResult) return null;

    const { metrics } = currentResult;
    const chartData = {
      labels: Object.keys(metrics.trends.volume),
      datasets: [
        {
          data: Object.values(metrics.trends.volume),
        },
      ],
    };

    switch (config.chartType) {
      case 'line':
        return (
          <LineChart
            data={chartData}
            width={screenWidth - spacing.l * 2}
            height={220}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
            }}
            bezier
            style={styles.chart}
          />
        );
      case 'bar':
        return (
          <BarChart
            data={chartData}
            width={screenWidth - spacing.l * 2}
            height={220}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
            }}
            style={styles.chart}
          />
        );
      case 'pie':
        return (
          <PieChart
            data={Object.entries(metrics.statusDistribution).map(([name, count]) => ({
              name,
              count,
              color: colors.primary,
            }))}
            width={screenWidth - spacing.l * 2}
            height={220}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        );
      default:
        return null;
    }
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
        <Text style={styles.title}>통계 분석</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기간 설정</Text>
        <View style={styles.dateRangeContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {filter.dateRange?.startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dateRangeSeparator}>~</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {filter.dateRange?.endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>지표 선택</Text>
        {Object.entries(config.metrics).map(([key, value]) => (
          <View key={key} style={styles.metricItem}>
            <Text style={styles.metricLabel}>
              {key === 'totalCount' ? '총 건수' :
               key === 'totalDuration' ? '총 소요 시간' :
               key === 'totalCost' ? '총 비용' :
               key === 'averageDuration' ? '평균 소요 시간' :
               key === 'averageCost' ? '평균 비용' :
               '완료율'}
            </Text>
            <Switch
              value={value}
              onValueChange={v =>
                setConfig(prev => ({
                  ...prev,
                  metrics: { ...prev.metrics, [key]: v },
                }))
              }
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>그룹화</Text>
        <View style={styles.groupButtons}>
          {[
            { value: 'none', label: '없음' },
            { value: 'status', label: '상태별' },
            { value: 'priority', label: '우선순위별' },
            { value: 'serviceType', label: '서비스 유형별' },
            { value: 'technician', label: '기술자별' },
            { value: 'location', label: '위치별' },
          ].map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.groupButton,
                config.groupBy === value && styles.groupButtonActive,
              ]}
              onPress={() =>
                setConfig(prev => ({ ...prev, groupBy: value as any }))
              }
            >
              <Text
                style={[
                  styles.groupButtonText,
                  config.groupBy === value && styles.groupButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>차트 유형</Text>
        <View style={styles.chartButtons}>
          {[
            { value: 'line', label: '선형' },
            { value: 'bar', label: '막대' },
            { value: 'pie', label: '파이' },
          ].map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chartButton,
                config.chartType === value && styles.chartButtonActive,
              ]}
              onPress={() =>
                setConfig(prev => ({ ...prev, chartType: value as any }))
              }
            >
              <Text
                style={[
                  styles.chartButtonText,
                  config.chartType === value && styles.chartButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추가 설정</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>트렌드 표시</Text>
          <Switch
            value={config.showTrends}
            onValueChange={value =>
              setConfig(prev => ({ ...prev, showTrends: value }))
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>이전 기간과 비교</Text>
          <Switch
            value={config.compareWithPrevious}
            onValueChange={value =>
              setConfig(prev => ({ ...prev, compareWithPrevious: value }))
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateAnalytics}
        >
          <Text style={styles.generateButtonText}>분석 생성</Text>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveConfig}
          >
            <Text style={styles.saveButtonText}>설정 저장</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
          >
            <Text style={styles.exportButtonText}>내보내기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {currentResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>분석 결과</Text>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>총 건수</Text>
            <Text style={styles.resultValue}>
              {currentResult.metrics.totalCount}건
            </Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>총 소요 시간</Text>
            <Text style={styles.resultValue}>
              {Math.round(currentResult.metrics.totalDuration)}시간
            </Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>총 비용</Text>
            <Text style={styles.resultValue}>
              {currentResult.metrics.totalCost.toLocaleString()}원
            </Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>평균 소요 시간</Text>
            <Text style={styles.resultValue}>
              {Math.round(currentResult.metrics.averageDuration)}시간
            </Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>평균 비용</Text>
            <Text style={styles.resultValue}>
              {Math.round(currentResult.metrics.averageCost).toLocaleString()}원
            </Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>완료율</Text>
            <Text style={styles.resultValue}>
              {Math.round(currentResult.metrics.completionRate)}%
            </Text>
          </View>

          {renderChart()}
        </View>
      )}

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
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricLabel: {
    ...typography.body,
    color: colors.text,
  },
  groupButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -spacing.xs,
  },
  groupButton: {
    margin: spacing.xs,
    padding: spacing.s,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  groupButtonText: {
    ...typography.body,
    color: colors.text,
  },
  groupButtonTextActive: {
    color: colors.surface,
  },
  chartButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  chartButton: {
    flex: 1,
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chartButtonText: {
    ...typography.body,
    color: colors.text,
  },
  chartButtonTextActive: {
    color: colors.surface,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
  },
  generateButton: {
    backgroundColor: colors.primary,
    padding: spacing.m,
    borderRadius: spacing.s,
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  generateButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.m,
    borderRadius: spacing.s,
    alignItems: 'center',
    marginRight: spacing.s,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  exportButton: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.m,
    borderRadius: spacing.s,
    alignItems: 'center',
    marginLeft: spacing.s,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  exportButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultLabel: {
    ...typography.body,
    color: colors.text,
  },
  resultValue: {
    ...typography.body,
    color: colors.primary,
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: spacing.l,
    borderRadius: spacing.s,
  },
});

export default AnalyticsManager; 