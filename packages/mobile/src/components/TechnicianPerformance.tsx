import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useReservationStats } from '../context/ReservationStatsContext';
import { colors, spacing, typography } from '../theme';

const TechnicianPerformance: React.FC = () => {
  const { stats, loading, error, getTechnicianPerformance } = useReservationStats();
  const [performanceData, setPerformanceData] = useState<{ technicianId: string; performance: number }[]>([]);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    const data = await getTechnicianPerformance();
    setPerformanceData(data);
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
        <Text style={styles.errorText}>{error || '성과 데이터를 불러올 수 없습니다.'}</Text>
      </View>
    );
  }

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
        <Text style={styles.title}>기술자별 성과</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>완료율</Text>
        {performanceData.length > 0 && (
          <BarChart
            data={{
              labels: performanceData.map(item => `기술자 ${item.technicianId}`),
              datasets: [{
                data: performanceData.map(item => item.performance),
              }],
            }}
            width={Dimensions.get('window').width - spacing.l * 2}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            style={styles.chart}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>상세 통계</Text>
        {stats.technicianStats.map(techStat => (
          <View key={techStat.technicianId} style={styles.techStatItem}>
            <Text style={styles.technicianId}>기술자 {techStat.technicianId}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{techStat.completedCount}</Text>
                <Text style={styles.statLabel}>완료 건수</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{techStat.averageDuration.toFixed(0)}분</Text>
                <Text style={styles.statLabel}>평균 소요시간</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {performanceData.find(p => p.technicianId === techStat.technicianId)?.performance.toFixed(1)}%
                </Text>
                <Text style={styles.statLabel}>완료율</Text>
              </View>
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
    textAlign: 'center',
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
  chart: {
    marginVertical: spacing.m,
    borderRadius: spacing.s,
  },
  techStatItem: {
    marginBottom: spacing.l,
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
  },
  technicianId: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.m,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});

export default TechnicianPerformance; 