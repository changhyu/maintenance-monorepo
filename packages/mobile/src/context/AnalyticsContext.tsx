import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReportMetrics,
  AnalyticsFilter,
  AnalyticsConfig,
  AnalyticsResult,
} from '../types/report';
import { useAuth } from './AuthContext';
import { format, subDays, subMonths, differenceInHours, differenceInDays } from 'date-fns';

interface AnalyticsContextType {
  results: AnalyticsResult[];
  loading: boolean;
  error: string | null;
  generateAnalytics: (filter: AnalyticsFilter, config: AnalyticsConfig) => Promise<AnalyticsResult>;
  getRecentResults: (limit?: number) => AnalyticsResult[];
  getSavedConfigs: () => AnalyticsConfig[];
  saveConfig: (config: AnalyticsConfig) => Promise<void>;
  deleteConfig: (index: number) => Promise<void>;
  exportAnalytics: (result: AnalyticsResult) => Promise<string>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [results, setResults] = useState<AnalyticsResult[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<AnalyticsConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedResults, storedConfigs] = await Promise.all([
        AsyncStorage.getItem('analytics_results'),
        AsyncStorage.getItem('analytics_configs'),
      ]);

      setResults(storedResults ? JSON.parse(storedResults) : []);
      setSavedConfigs(storedConfigs ? JSON.parse(storedConfigs) : []);
    } catch (err) {
      setError('분석 데이터 로드 중 오류가 발생했습니다.');
      console.error('분석 데이터 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveResults = async (newResults: AnalyticsResult[]) => {
    try {
      await AsyncStorage.setItem('analytics_results', JSON.stringify(newResults));
      setResults(newResults);
    } catch (err) {
      setError('분석 결과 저장 중 오류가 발생했습니다.');
      console.error('분석 결과 저장 오류:', err);
    }
  };

  const saveConfigs = async (newConfigs: AnalyticsConfig[]) => {
    try {
      await AsyncStorage.setItem('analytics_configs', JSON.stringify(newConfigs));
      setSavedConfigs(newConfigs);
    } catch (err) {
      setError('분석 설정 저장 중 오류가 발생했습니다.');
      console.error('분석 설정 저장 오류:', err);
    }
  };

  const calculateMetrics = (data: any[], filter: AnalyticsFilter): ReportMetrics => {
    const filteredData = data.filter(item => {
      if (filter.dateRange) {
        const itemDate = new Date(item.date);
        if (itemDate < filter.dateRange.startDate || itemDate > filter.dateRange.endDate) {
          return false;
        }
      }
      if (filter.status && !filter.status.includes(item.status)) return false;
      if (filter.priority && !filter.priority.includes(item.priority)) return false;
      if (filter.serviceType && !filter.serviceType.includes(item.serviceType)) return false;
      if (filter.technician && !filter.technician.includes(item.technicianId)) return false;
      if (filter.location && !filter.location.includes(item.location)) return false;
      if (filter.costRange) {
        if (item.cost < filter.costRange.min || item.cost > filter.costRange.max) return false;
      }
      if (filter.durationRange) {
        if (item.duration < filter.durationRange.min || item.duration > filter.durationRange.max) return false;
      }
      return true;
    });

    const metrics: ReportMetrics = {
      totalCount: filteredData.length,
      totalDuration: filteredData.reduce((sum, item) => sum + item.duration, 0),
      totalCost: filteredData.reduce((sum, item) => sum + item.cost, 0),
      averageDuration: 0,
      averageCost: 0,
      completionRate: 0,
      statusDistribution: {},
      priorityDistribution: {},
      serviceTypeDistribution: {},
      technicianPerformance: {},
      timeDistribution: {
        hourly: {},
        daily: {},
        monthly: {},
      },
      locationHeatmap: {},
      trends: {
        duration: {},
        cost: {},
        volume: {},
      },
    };

    // 평균 계산
    metrics.averageDuration = metrics.totalDuration / metrics.totalCount || 0;
    metrics.averageCost = metrics.totalCost / metrics.totalCount || 0;

    // 완료율 계산
    const completedTasks = filteredData.filter(item => item.status === 'completed').length;
    metrics.completionRate = (completedTasks / metrics.totalCount) * 100 || 0;

    // 분포 계산
    filteredData.forEach(item => {
      // 상태 분포
      metrics.statusDistribution[item.status] = (metrics.statusDistribution[item.status] || 0) + 1;

      // 우선순위 분포
      metrics.priorityDistribution[item.priority] = (metrics.priorityDistribution[item.priority] || 0) + 1;

      // 서비스 유형 분포
      metrics.serviceTypeDistribution[item.serviceType] = (metrics.serviceTypeDistribution[item.serviceType] || 0) + 1;

      // 기술자 성과
      if (!metrics.technicianPerformance[item.technicianId]) {
        metrics.technicianPerformance[item.technicianId] = {
          totalTasks: 0,
          completedTasks: 0,
          averageDuration: 0,
          averageCost: 0,
          rating: 0,
        };
      }
      const tech = metrics.technicianPerformance[item.technicianId];
      tech.totalTasks++;
      if (item.status === 'completed') tech.completedTasks++;
      tech.averageDuration = (tech.averageDuration * (tech.totalTasks - 1) + item.duration) / tech.totalTasks;
      tech.averageCost = (tech.averageCost * (tech.totalTasks - 1) + item.cost) / tech.totalTasks;
      tech.rating = (tech.rating * (tech.totalTasks - 1) + item.rating) / tech.totalTasks;

      // 시간 분포
      const date = new Date(item.date);
      const hour = format(date, 'HH:00');
      const day = format(date, 'yyyy-MM-dd');
      const month = format(date, 'yyyy-MM');

      metrics.timeDistribution.hourly[hour] = (metrics.timeDistribution.hourly[hour] || 0) + 1;
      metrics.timeDistribution.daily[day] = (metrics.timeDistribution.daily[day] || 0) + 1;
      metrics.timeDistribution.monthly[month] = (metrics.timeDistribution.monthly[month] || 0) + 1;

      // 위치 히트맵
      metrics.locationHeatmap[item.location] = (metrics.locationHeatmap[item.location] || 0) + 1;

      // 트렌드
      metrics.trends.duration[day] = (metrics.trends.duration[day] || 0) + item.duration;
      metrics.trends.cost[day] = (metrics.trends.cost[day] || 0) + item.cost;
      metrics.trends.volume[day] = (metrics.trends.volume[day] || 0) + 1;
    });

    return metrics;
  };

  const generateAnalytics = async (
    filter: AnalyticsFilter,
    config: AnalyticsConfig
  ): Promise<AnalyticsResult> => {
    try {
      setLoading(true);

      // 여기에서 실제 데이터를 가져오는 API 호출이 필요합니다.
      // 예시 데이터를 사용합니다.
      const data = [
        // ... 실제 데이터
      ];

      const metrics = calculateMetrics(data, filter);
      const result: AnalyticsResult = {
        metrics,
        filter,
        config,
        generatedAt: new Date(),
      };

      const newResults = [result, ...results].slice(0, 10); // 최근 10개만 유지
      await saveResults(newResults);

      return result;
    } catch (err) {
      setError('분석 생성 중 오류가 발생했습니다.');
      console.error('분석 생성 오류:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getRecentResults = (limit = 5) => {
    return results.slice(0, limit);
  };

  const getSavedConfigs = () => {
    return savedConfigs;
  };

  const saveConfig = async (config: AnalyticsConfig) => {
    try {
      const newConfigs = [...savedConfigs, config];
      await saveConfigs(newConfigs);
    } catch (err) {
      setError('설정 저장 중 오류가 발생했습니다.');
      console.error('설정 저장 오류:', err);
    }
  };

  const deleteConfig = async (index: number) => {
    try {
      const newConfigs = savedConfigs.filter((_, i) => i !== index);
      await saveConfigs(newConfigs);
    } catch (err) {
      setError('설정 삭제 중 오류가 발생했습니다.');
      console.error('설정 삭제 오류:', err);
    }
  };

  const exportAnalytics = async (result: AnalyticsResult): Promise<string> => {
    try {
      // 여기에서 실제 내보내기 로직 구현
      // 예: PDF 생성, Excel 파일 생성 등
      const exportUrl = 'https://example.com/exports/123';
      return exportUrl;
    } catch (err) {
      setError('분석 내보내기 중 오류가 발생했습니다.');
      console.error('분석 내보내기 오류:', err);
      throw err;
    }
  };

  return (
    <AnalyticsContext.Provider
      value={{
        results,
        loading,
        error,
        generateAnalytics,
        getRecentResults,
        getSavedConfigs,
        saveConfig,
        deleteConfig,
        exportAnalytics,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}; 