import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useReservationStats } from '../context/ReservationStatsContext';
import { colors, spacing, typography } from '../theme';

const ReservationStats: React.FC = () => {
  const { stats, loading, error, calculateStats, getCompletionTrend } = useReservationStats();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [trendData, setTrendData] = useState<{ date: string; rate: number }[]>([]);

  useEffect(() => {
    loadTrendData();
  }, [timeRange]);

  const loadTrendData = async () => {
    const data = await getCompletionTrend(timeRange);
    setTrendData(data);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || '통계를 불러올 수 없습니다.'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => calculateStats()}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusData = [
    {
      name: '대기',
      count: stats.statusCounts.pending,
      color: colors.warning,
    },
    {
      name: '확정',
      count: stats.statusCounts.confirmed,
      color: colors.info,
    },
    {
      name: '진행',
      count: stats.statusCounts.in_progress,
      color: colors.primary,
    },
    {
      name: '완료',
      count: stats.statusCounts.completed,
      color: colors.success,
    },
    {
      name: '취소',
      count: stats.statusCounts.cancelled,
      color: colors.error,
    },
  ].filter(item => item.count > 0);

  const serviceTypeData = [
    {
      name: '정기',
      count: stats.serviceTypeCounts.regular,
      color: colors.primary,
    },
    {
      name: '긴급',
      count: stats.serviceTypeCounts.emergency,
      color: colors.error,
    },
    {
      name: '점검',
      count: stats.serviceTypeCounts.inspection,
      color: colors.warning,
    },
    {
      name: '수리',
      count: stats.serviceTypeCounts.repair,
      color: colors.info,
    },
  ].filter(item => item.count > 0);

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>정비 예약 통계</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>전체 현황</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalCount}</Text>
            <Text style={styles.statLabel}>전체 예약</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completionRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>완료율</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.averageDuration.toFixed(0)}분</Text>
            <Text style={styles.statLabel}>평균 소요시간</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>예약 상태 분포</Text>
        <PieChart
          data={statusData.map(item => ({
            name: item.name,
            population: item.count,
            color: item.color,
            legendFontColor: colors.text,
            legendFontSize: 12,
          }))}
          width={Dimensions.get('window').width - spacing.l * 2}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>서비스 유형 분포</Text>
        <PieChart
          data={serviceTypeData.map(item => ({
            name: item.name,
            population: item.count,
            color: item.color,
            legendFontColor: colors.text,
            legendFontSize: 12,
          }))}
          width={Dimensions.get('window').width - spacing.l * 2}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>완료율 추이</Text>
        <View style={styles.timeRangeButtons}>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'week' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('week')}
          >
            <Text style={[styles.timeRangeButtonText, timeRange === 'week' && styles.timeRangeButtonTextActive]}>
              주간
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'month' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[styles.timeRangeButtonText, timeRange === 'month' && styles.timeRangeButtonTextActive]}>
              월간
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'year' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('year')}
          >
            <Text style={[styles.timeRangeButtonText, timeRange === 'year' && styles.timeRangeButtonTextActive]}>
              연간
            </Text>
          </TouchableOpacity>
        </View>
        {trendData.length > 0 && (
          <LineChart
            data={{
              labels: trendData.map(item => item.date.split('-').slice(-1)[0]),
              datasets: [{
                data: trendData.map(item => item.rate),
              }],
            }}
            width={Dimensions.get('window').width - spacing.l * 2}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>월별 통계</Text>
        {stats.monthlyStats.map(monthStat => (
          <View key={monthStat.month} style={styles.monthlyStatItem}>
            <Text style={styles.monthlyStatDate}>{monthStat.month}</Text>
            <View style={styles.monthlyStatDetails}>
              <Text style={styles.monthlyStatCount}>{monthStat.count}건</Text>
              <Text style={styles.monthlyStatRate}>
                완료율: {monthStat.completionRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.m,
    textAlign: 'center',
  },
  retryButton: {
    padding: spacing.m,
    backgroundColor: colors.primary,
    borderRadius: spacing.s,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.surface,
  },
  header: {
    padding: spacing.l,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h1,
    color: colors.text,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    marginBottom: spacing.m,
  },
  timeRangeButton: {
    flex: 1,
    padding: spacing.m,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeButtonText: {
    ...typography.body,
    color: colors.text,
  },
  timeRangeButtonTextActive: {
    color: colors.surface,
  },
  chart: {
    marginVertical: spacing.m,
    borderRadius: spacing.s,
  },
  monthlyStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthlyStatDate: {
    ...typography.body,
    color: colors.text,
  },
  monthlyStatDetails: {
    alignItems: 'flex-end',
  },
  monthlyStatCount: {
    ...typography.body,
    color: colors.primary,
  },
  monthlyStatRate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default ReservationStats; 