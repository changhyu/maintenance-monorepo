import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useTodo } from '../context/TodoContext';
import { colors, spacing, typography } from '../theme';
import { formatDate } from '../utils/dateUtils';

const screenWidth = Dimensions.get('window').width;

const ScrDataDashboard: React.FC = () => {
  const { tasks, loading } = useTodo();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [chartData, setChartData] = useState({
    completion: {
      labels: [] as string[],
      datasets: [{ data: [] as number[] }],
    },
    status: {
      labels: [] as string[],
      data: [] as number[],
    },
  });

  useEffect(() => {
    if (tasks) {
      updateChartData();
    }
  }, [tasks, timeRange]);

  const updateChartData = () => {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredTasks = tasks.filter(task => 
      new Date(task.createdAt) >= startDate
    );

    // 완료율 차트 데이터
    const completionData = {
      labels: [] as string[],
      datasets: [{ data: [] as number[] }],
    };

    // 상태 분포 차트 데이터
    const statusData = {
      labels: ['대기 중', '진행 중', '완료', '취소'],
      data: [
        filteredTasks.filter(t => t.status === 'pending').length,
        filteredTasks.filter(t => t.status === 'in_progress').length,
        filteredTasks.filter(t => t.status === 'completed').length,
        filteredTasks.filter(t => t.status === 'cancelled').length,
      ],
    };

    setChartData({
      completion: completionData,
      status: statusData,
    });
  };

  const TimeRangeButton: React.FC<{
    label: string;
    value: 'week' | 'month' | 'year';
  }> = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.timeRangeButton,
        timeRange === value && styles.timeRangeButtonActive,
      ]}
      onPress={() => setTimeRange(value)}
    >
      <Text
        style={[
          styles.timeRangeButtonText,
          timeRange === value && styles.timeRangeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>정비 데이터 분석</Text>
        <View style={styles.timeRangeContainer}>
          <TimeRangeButton label="1주" value="week" />
          <TimeRangeButton label="1개월" value="month" />
          <TimeRangeButton label="1년" value="year" />
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>작업 완료율 추이</Text>
        <LineChart
          data={chartData.completion}
          width={screenWidth - spacing.l * 2}
          height={220}
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => colors.primary,
            labelColor: (opacity = 1) => colors.text,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: colors.primary,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>작업 상태 분포</Text>
        <PieChart
          data={chartData.status.data.map((value, index) => ({
            name: chartData.status.labels[index],
            population: value,
            color: [
              colors.warning,
              colors.info,
              colors.success,
              colors.error,
            ][index],
            legendFontColor: colors.text,
            legendFontSize: 12,
          }))}
          width={screenWidth - spacing.l * 2}
          height={220}
          chartConfig={{
            color: (opacity = 1) => colors.text,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={styles.chart}
        />
      </View>
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
  header: {
    padding: spacing.l,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    marginTop: spacing.m,
  },
  timeRangeButton: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    marginRight: spacing.s,
    borderRadius: spacing.s,
    backgroundColor: colors.background,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeButtonText: {
    ...typography.caption,
    color: colors.text,
  },
  timeRangeButtonTextActive: {
    color: colors.surface,
  },
  chartContainer: {
    margin: spacing.l,
    padding: spacing.m,
    backgroundColor: colors.surface,
    borderRadius: spacing.s,
  },
  chartTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.m,
  },
  chart: {
    marginVertical: spacing.s,
    borderRadius: spacing.s,
  },
});

export default ScrDataDashboard; 