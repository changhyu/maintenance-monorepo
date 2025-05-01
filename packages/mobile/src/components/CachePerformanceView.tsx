import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { EnhancedOfflineDataManager } from '../utils/EnhancedOfflineDataManager';

// 캐시 성능 분석 결과 인터페이스
interface CachePerformanceResult {
  basicStats: {
    hits: number;
    misses: number;
    totalItems: number;
    estimatedSize: number;
    oldestItemAge: number;
    hitRate?: string;
    avgAccessTime?: number;
    cacheThroughput?: number;
    itemTypeDistribution?: Record<string, number>;
    sizeByCategory?: Record<string, number>;
    dataSizeDistribution?: { small: number, medium: number, large: number };
    timeToLiveDistribution?: { short: number, medium: number, long: number };
    memoryUtilization?: number;
  };
  detailedAnalysis: {
    accessTimePercentiles: { p50: number, p90: number, p99: number };
    topAccessedItems: Array<{ key: string, count: number }>;
    storageEfficiency: number;
    recommendations: string[];
  };
}

// 향상된 캐시 성능 메트릭 인터페이스
interface EnhancedCacheMetrics {
  prefetchHitRate: number;
  adaptiveTTLAdjustments: number;
  predictionAccuracy: number;
  optimizationFrequency: number;
}

// 향상된 캐시 성능 분석 결과 인터페이스
interface EnhancedCachePerformanceResult {
  basicAnalysis: CachePerformanceResult;
  enhancedMetrics: EnhancedCacheMetrics;
}

// 캐시 성능 분석 컴포넌트
const CachePerformanceView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhancedCachePerformanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 향상된 캐시 관리자 인스턴스
  const enhancedManager = EnhancedOfflineDataManager.getInstance();
  
  // 캐시 성능 분석 실행
  const analyzeCache = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 향상된 캐시 성능 분석 실행
      const performanceResult = await enhancedManager.analyzeEnhancedCachePerformance();
      setResult(performanceResult);
    } catch (err) {
      setError('캐시 성능 분석 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // 캐시 최적화 실행
  const optimizeCache = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 향상된 캐시 최적화 실행
      await enhancedManager.enhancedOptimizeCache();
      
      // 최적화 후 성능 분석 다시 실행
      const performanceResult = await enhancedManager.analyzeEnhancedCachePerformance();
      setResult(performanceResult);
    } catch (err) {
      setError('캐시 최적화 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // 컴포넌트 마운트 시 성능 분석 실행
  useEffect(() => {
    analyzeCache();
  }, []);
  
  // 로딩 중 표시
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>캐시 성능 분석 중...</Text>
      </View>
    );
  }
  
  // 오류 표시
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={analyzeCache}>
          <Text style={styles.buttonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // 결과가 없을 때
  if (!result) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>캐시 성능 분석</Text>
        <Text style={styles.noResultText}>성능 분석 결과가 없습니다.</Text>
        <TouchableOpacity style={styles.button} onPress={analyzeCache}>
          <Text style={styles.buttonText}>분석 시작</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // 기본 통계 데이터 가져오기
  const { basicAnalysis, enhancedMetrics } = result;
  const { basicStats, detailedAnalysis } = basicAnalysis;
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>향상된 캐시 성능 분석</Text>
      
      {/* 기본 통계 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기본 통계</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>총 항목 수:</Text>
          <Text style={styles.statValue}>{basicStats.totalItems}개</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>추정 크기:</Text>
          <Text style={styles.statValue}>{(basicStats.estimatedSize / 1024 / 1024).toFixed(2)} MB</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>히트율:</Text>
          <Text style={styles.statValue}>{basicStats.hitRate}</Text>
        </View>
        {basicStats.avgAccessTime !== undefined && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>평균 접근 시간:</Text>
            <Text style={styles.statValue}>{basicStats.avgAccessTime.toFixed(2)} ms</Text>
          </View>
        )}
        {basicStats.cacheThroughput !== undefined && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>캐시 스루풋:</Text>
            <Text style={styles.statValue}>{basicStats.cacheThroughput.toFixed(2)} 요청/초</Text>
          </View>
        )}
        {basicStats.memoryUtilization !== undefined && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>메모리 사용률:</Text>
            <Text style={styles.statValue}>{basicStats.memoryUtilization.toFixed(2)}%</Text>
          </View>
        )}
      </View>
      
      {/* 향상된 지표 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>향상된 지표</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>프리페치 히트율:</Text>
          <Text style={styles.statValue}>{(enhancedMetrics.prefetchHitRate * 100).toFixed(2)}%</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>적응형 TTL 조정:</Text>
          <Text style={styles.statValue}>{enhancedMetrics.adaptiveTTLAdjustments}회</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>예측 정확도:</Text>
          <Text style={styles.statValue}>{(enhancedMetrics.predictionAccuracy * 100).toFixed(2)}%</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>최적화 주기:</Text>
          <Text style={styles.statValue}>{enhancedMetrics.optimizationFrequency.toFixed(2)} 회/일</Text>
        </View>
      </View>
      
      {/* 데이터 분포 섹션 */}
      {basicStats.dataSizeDistribution && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 크기 분포</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>작은 크기 (&lt; 10KB):</Text>
            <Text style={styles.statValue}>{basicStats.dataSizeDistribution.small}개</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>중간 크기 (10KB-100KB):</Text>
            <Text style={styles.statValue}>{basicStats.dataSizeDistribution.medium}개</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>큰 크기 (&gt; 100KB):</Text>
            <Text style={styles.statValue}>{basicStats.dataSizeDistribution.large}개</Text>
          </View>
        </View>
      )}
      
      {/* TTL 분포 섹션 */}
      {basicStats.timeToLiveDistribution && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TTL 분포</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>짧은 TTL (&lt; 1일):</Text>
            <Text style={styles.statValue}>{basicStats.timeToLiveDistribution.short}개</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>중간 TTL (1-7일):</Text>
            <Text style={styles.statValue}>{basicStats.timeToLiveDistribution.medium}개</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>긴 TTL (&gt; 7일):</Text>
            <Text style={styles.statValue}>{basicStats.timeToLiveDistribution.long}개</Text>
          </View>
        </View>
      )}
      
      {/* 접근 시간 통계 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>접근 시간 백분위수</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>50% 접근 시간:</Text>
          <Text style={styles.statValue}>{detailedAnalysis.accessTimePercentiles.p50.toFixed(2)} ms</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>90% 접근 시간:</Text>
          <Text style={styles.statValue}>{detailedAnalysis.accessTimePercentiles.p90.toFixed(2)} ms</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>99% 접근 시간:</Text>
          <Text style={styles.statValue}>{detailedAnalysis.accessTimePercentiles.p99.toFixed(2)} ms</Text>
        </View>
      </View>
      
      {/* 가장 많이 접근된 항목 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>가장 많이 접근된 항목 (상위 10개)</Text>
        {detailedAnalysis.topAccessedItems.map((item, index) => (
          <View key={index} style={styles.statRow}>
            <Text style={styles.statLabel}>{index + 1}. {item.key}:</Text>
            <Text style={styles.statValue}>{item.count}회 접근</Text>
          </View>
        ))}
      </View>
      
      {/* 저장소 효율성 점수 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>저장소 효율성 점수</Text>
        <Text style={styles.scoreText}>{(detailedAnalysis.storageEfficiency * 100).toFixed(2)}%</Text>
      </View>
      
      {/* 개선 권장사항 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>개선 권장사항</Text>
        {detailedAnalysis.recommendations.length > 0 ? (
          detailedAnalysis.recommendations.map((rec, index) => (
            <Text key={index} style={styles.recommendationText}>
              {index + 1}. {rec}
            </Text>
          ))
        ) : (
          <Text style={styles.recommendationText}>현재 캐시가 효율적으로 작동하고 있습니다.</Text>
        )}
      </View>
      
      {/* 버튼 섹션 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={analyzeCache}>
          <Text style={styles.buttonText}>다시 분석</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={optimizeCache}>
          <Text style={styles.buttonText}>캐시 최적화</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  noResultText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#555',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginVertical: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CachePerformanceView; 