/**
 * 캐시 성능 모니터링 클래스
 * 
 * 이 클래스는 애플리케이션의 캐시 사용을 모니터링하고 성능 통계를 수집하는 기능을 제공합니다.
 * 캐시 적중률, 접근 패턴, 메모리 사용량 등을 추적하여 최적화 전략에 활용할 수 있습니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 성능 측정 이벤트 타입
export enum CacheEventType {
  HIT = 'hit',
  MISS = 'miss',
  EXPIRED = 'expired',
  STORE = 'store',
  REMOVE = 'remove',
  CLEAR = 'clear',
  OPTIMIZE = 'optimize'
}

// 캐시 아이템 메타데이터 인터페이스
export interface CacheItemMetrics {
  key: string;
  size: number;
  dataType: string;
  ttl: number;
  hitCount: number;
  missCount: number;
  lastAccessed: number;
  created: number;
  accessTimes: number[];
}

// 성능 통계 인터페이스
export interface CachePerformanceStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  avgAccessTime: number;
  p95AccessTime: number;
  memoryUtilization: number;
  dataTypeDistribution: Record<string, number>;
  ttlDistribution: {
    short: number;  // < 1 시간
    medium: number; // 1시간 - 1일
    long: number;   // > 1일
  };
  recentActivity: Array<{
    timestamp: number;
    eventType: CacheEventType;
    key: string;
    size?: number;
  }>;
}

export class CachePerformanceMonitor {
  private static instance: CachePerformanceMonitor;
  private metricsMap: Map<string, CacheItemMetrics> = new Map();
  private events: Array<{
    timestamp: number;
    eventType: CacheEventType;
    key: string;
    size?: number;
    duration?: number;
  }> = [];
  private enabled: boolean = false;
  private storageKey: string = '@cache_performance_metrics';
  private maxEventsHistory: number = 100;
  private startTime: number = Date.now();
  
  // 싱글톤 인스턴스 가져오기
  public static getInstance(): CachePerformanceMonitor {
    if (!CachePerformanceMonitor.instance) {
      CachePerformanceMonitor.instance = new CachePerformanceMonitor();
    }
    return CachePerformanceMonitor.instance;
  }
  
  private constructor() {
    this.loadPerformanceData();
  }
  
  /**
   * 모니터링 활성화/비활성화
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * 캐시 이벤트 기록
   */
  public recordEvent(eventType: CacheEventType, key: string, options?: {
    size?: number;
    dataType?: string;
    ttl?: number;
    duration?: number;
  }): void {
    if (!this.enabled) return;
    
    const timestamp = Date.now();
    const { size, dataType, ttl, duration } = options || {};
    
    // 이벤트 기록
    this.events.push({
      timestamp,
      eventType,
      key,
      size,
      duration
    });
    
    // 최대 이벤트 개수 유지
    if (this.events.length > this.maxEventsHistory) {
      this.events.shift();
    }
    
    // 메트릭 업데이트
    let metrics = this.metricsMap.get(key);
    
    if (!metrics && (eventType === CacheEventType.STORE || eventType === CacheEventType.HIT)) {
      // 새 메트릭 생성
      metrics = {
        key,
        size: size || 0,
        dataType: dataType || 'unknown',
        ttl: ttl || 0,
        hitCount: 0,
        missCount: 0,
        lastAccessed: timestamp,
        created: timestamp,
        accessTimes: []
      };
      this.metricsMap.set(key, metrics);
    }
    
    if (metrics) {
      // 기존 메트릭 업데이트
      switch (eventType) {
        case CacheEventType.HIT:
          metrics.hitCount++;
          metrics.lastAccessed = timestamp;
          if (duration) metrics.accessTimes.push(duration);
          // 최대 20개의 접근 시간만 유지
          if (metrics.accessTimes.length > 20) metrics.accessTimes.shift();
          break;
        case CacheEventType.MISS:
          metrics.missCount++;
          break;
        case CacheEventType.STORE:
          if (size !== undefined) metrics.size = size;
          if (dataType) metrics.dataType = dataType;
          if (ttl !== undefined) metrics.ttl = ttl;
          metrics.created = timestamp;
          break;
        case CacheEventType.REMOVE:
          // 여기서는 삭제하지 않고 통계를 위해 유지
          break;
        case CacheEventType.CLEAR:
          // 전체 캐시 클리어 시에는 별도 처리 없음
          break;
      }
    }
    
    // 주기적으로 성능 데이터 저장
    if (this.events.length % 10 === 0) {
      this.savePerformanceData();
    }
  }
  
  /**
   * 캐시 성능 통계 계산
   */
  public getPerformanceStats(): CachePerformanceStats {
    // 전체 항목 수 및 크기 계산
    let totalSize = 0;
    let totalHits = 0;
    let totalMisses = 0;
    let accessTimes: number[] = [];
    const dataTypeCounts: Record<string, number> = {};
    const ttlDistribution = { short: 0, medium: 0, long: 0 };
    
    this.metricsMap.forEach(metrics => {
      totalSize += metrics.size;
      totalHits += metrics.hitCount;
      totalMisses += metrics.missCount;
      accessTimes = [...accessTimes, ...metrics.accessTimes];
      
      // 데이터 타입 분포 계산
      dataTypeCounts[metrics.dataType] = (dataTypeCounts[metrics.dataType] || 0) + 1;
      
      // TTL 분포 계산
      if (metrics.ttl < 3600000) { // 1시간 미만
        ttlDistribution.short++;
      } else if (metrics.ttl < 86400000) { // 1일 미만
        ttlDistribution.medium++;
      } else { // 1일 이상
        ttlDistribution.long++;
      }
    });
    
    // 접근 시간 통계 계산
    const avgAccessTime = accessTimes.length > 0
      ? accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length
      : 0;
    
    // 95 퍼센타일 접근 시간 계산
    let p95AccessTime = 0;
    if (accessTimes.length > 0) {
      accessTimes.sort((a, b) => a - b);
      const p95Index = Math.min(Math.floor(accessTimes.length * 0.95), accessTimes.length - 1);
      p95AccessTime = accessTimes[p95Index];
    }
    
    // 히트레이트 계산
    const totalAccesses = totalHits + totalMisses;
    const hitRate = totalAccesses > 0 ? totalHits / totalAccesses : 0;
    const missRate = totalAccesses > 0 ? totalMisses / totalAccesses : 0;
    
    // 메모리 사용률 추정 (단순 계산)
    const estimatedMemoryLimit = 50 * 1024 * 1024; // 50MB 가정
    const memoryUtilization = totalSize / estimatedMemoryLimit;
    
    // 최근 활동 추출
    const recentActivity = this.events
      .slice(-10)
      .map(event => ({
        timestamp: event.timestamp,
        eventType: event.eventType,
        key: event.key,
        size: event.size
      }));
    
    return {
      totalItems: this.metricsMap.size,
      totalSize,
      hitRate,
      missRate,
      avgAccessTime,
      p95AccessTime,
      memoryUtilization,
      dataTypeDistribution: dataTypeCounts,
      ttlDistribution,
      recentActivity
    };
  }
  
  /**
   * 특정 기간 동안의 성능 지표 분석
   */
  public analyzePerformanceTrend(timeRange: number = 86400000): {
    hitRateByHour: Record<number, number>;
    accessVolumeByHour: Record<number, number>;
    topAccessedKeys: Array<{ key: string; hitCount: number }>;
  } {
    const now = Date.now();
    const startTime = now - timeRange;
    
    // 시간별 히트레이트 및 접근량 계산을 위한 버킷
    const hitsByHour: Record<number, number> = {};
    const missesByHour: Record<number, number> = {};
    const accessesByHour: Record<number, number> = {};
    
    // 분석 대상 이벤트 필터링
    const relevantEvents = this.events.filter(event => 
      event.timestamp >= startTime && 
      (event.eventType === CacheEventType.HIT || event.eventType === CacheEventType.MISS)
    );
    
    // 시간별 데이터 집계
    relevantEvents.forEach(event => {
      const hourBucket = Math.floor((event.timestamp - startTime) / 3600000);
      
      if (event.eventType === CacheEventType.HIT) {
        hitsByHour[hourBucket] = (hitsByHour[hourBucket] || 0) + 1;
      } else if (event.eventType === CacheEventType.MISS) {
        missesByHour[hourBucket] = (missesByHour[hourBucket] || 0) + 1;
      }
      
      accessesByHour[hourBucket] = (accessesByHour[hourBucket] || 0) + 1;
    });
    
    // 시간별 히트레이트 계산
    const hitRateByHour: Record<number, number> = {};
    Object.keys(accessesByHour).forEach(hourKey => {
      const hour = parseInt(hourKey);
      const totalAccesses = (hitsByHour[hour] || 0) + (missesByHour[hour] || 0);
      hitRateByHour[hour] = totalAccesses > 0 ? (hitsByHour[hour] || 0) / totalAccesses : 0;
    });
    
    // 가장 많이 접근된 키 계산
    const keyAccessCounts: Record<string, number> = {};
    relevantEvents
      .filter(event => event.eventType === CacheEventType.HIT)
      .forEach(event => {
        keyAccessCounts[event.key] = (keyAccessCounts[event.key] || 0) + 1;
      });
    
    const topAccessedKeys = Object.entries(keyAccessCounts)
      .map(([key, hitCount]) => ({ key, hitCount }))
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10);
    
    return {
      hitRateByHour,
      accessVolumeByHour: accessesByHour,
      topAccessedKeys
    };
  }
  
  /**
   * 캐시 최적화 추천 생성
   */
  public generateOptimizationRecommendations(): Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }> {
    const stats = this.getPerformanceStats();
    const recommendations: Array<{
      type: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
    }> = [];
    
    // 히트율 기반 추천
    if (stats.hitRate < 0.5) {
      recommendations.push({
        type: 'hit_rate',
        description: '캐시 히트율이 낮습니다. TTL을 늘리거나 적절한 프리페칭 전략을 고려하세요.',
        impact: 'high'
      });
    }
    
    // 메모리 사용률 기반 추천
    if (stats.memoryUtilization > 0.8) {
      recommendations.push({
        type: 'memory_usage',
        description: '메모리 사용률이 높습니다. LRU 또는 TTL 기반 축출 전략을 적용하세요.',
        impact: 'high'
      });
    }
    
    // 접근 시간 기반 추천
    if (stats.p95AccessTime > 100) {
      recommendations.push({
        type: 'access_time',
        description: '95 퍼센타일 접근 시간이 높습니다. 압축 또는 인덱싱을 고려하세요.',
        impact: 'medium'
      });
    }
    
    // 데이터 타입 분포 기반 추천
    const dataTypes = Object.keys(stats.dataTypeDistribution);
    if (dataTypes.includes('image') && stats.dataTypeDistribution['image'] > 10) {
      recommendations.push({
        type: 'data_type',
        description: '이미지 캐시가 많습니다. 크기 제한 및 압축을 적용하세요.',
        impact: 'medium'
      });
    }
    
    // TTL 분포 기반 추천
    if (stats.ttlDistribution.long > stats.totalItems * 0.7) {
      recommendations.push({
        type: 'ttl',
        description: '대부분의 항목이 긴 TTL을 가집니다. 접근 빈도에 따른 TTL 조정을 고려하세요.',
        impact: 'low'
      });
    }
    
    return recommendations;
  }
  
  /**
   * 성능 데이터 영구 저장
   */
  private async savePerformanceData(): Promise<void> {
    try {
      const serializedMetrics = JSON.stringify(Array.from(this.metricsMap.entries()));
      const serializedEvents = JSON.stringify(this.events.slice(-50)); // 최근 50개 이벤트만 저장
      
      await AsyncStorage.setItem(`${this.storageKey}_metrics`, serializedMetrics);
      await AsyncStorage.setItem(`${this.storageKey}_events`, serializedEvents);
    } catch (error) {
      console.error('캐시 성능 데이터 저장 실패:', error);
    }
  }
  
  /**
   * 성능 데이터 불러오기
   */
  private async loadPerformanceData(): Promise<void> {
    try {
      const serializedMetrics = await AsyncStorage.getItem(`${this.storageKey}_metrics`);
      const serializedEvents = await AsyncStorage.getItem(`${this.storageKey}_events`);
      
      if (serializedMetrics) {
        const entries = JSON.parse(serializedMetrics);
        this.metricsMap = new Map(entries);
      }
      
      if (serializedEvents) {
        this.events = JSON.parse(serializedEvents);
      }
    } catch (error) {
      console.error('캐시 성능 데이터 로딩 실패:', error);
    }
  }
  
  /**
   * 모니터링 데이터 초기화
   */
  public reset(): void {
    this.metricsMap.clear();
    this.events = [];
    this.startTime = Date.now();
    this.savePerformanceData();
  }
  
  /**
   * 현재 메모리 사용량 추정 (React Native 환경)
   */
  public async estimateCurrentMemoryUsage(): Promise<number | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        // AsyncStorage의 모든 키 가져오기
        const keys = await AsyncStorage.getAllKeys();
        
        // 전체 데이터 크기 추정
        let totalSize = 0;
        
        // 샘플링: 최대 30개 항목만 확인
        const sampleKeys = keys.slice(0, 30); 
        const values = await AsyncStorage.multiGet(sampleKeys);
        
        // 샘플 평균 크기 계산
        let sampleSize = 0;
        for (const [_, value] of values) {
          if (value) {
            sampleSize += value.length;
          }
        }
        
        const avgSize = sampleKeys.length > 0 ? sampleSize / sampleKeys.length : 0;
        
        // 전체 추정 크기
        totalSize = avgSize * keys.length;
        
        return totalSize;
      } catch (error) {
        console.error('메모리 사용량 추정 실패:', error);
        return null;
      }
    }
    
    return null;
  }
}

export default CachePerformanceMonitor; 