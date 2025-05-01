/**
 * 향상된 캐시 최적화 전략 매니저
 * 
 * 다양한 캐시 최적화 전략을 정의하고 관리합니다.
 * 메모리 사용량, 성능, 접근 패턴을 고려한 고급 최적화 알고리즘을 제공합니다.
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 캐시 아이템 메타데이터 인터페이스
export interface CacheItemMetadata {
  key: string;
  size: number;
  accessCount: number;
  lastAccessed: number;
  created: number;
  ttl: number;
  dataType: string;
  priority: 'high' | 'medium' | 'low';
}

// 최적화 전략 열거형
export enum OptimizationStrategy {
  LRU = 'lru',              // 최근 사용 빈도가 적은 항목 제거
  LFU = 'lfu',              // 사용 빈도가 적은 항목 제거
  FIFO = 'fifo',            // 먼저 들어온 항목 제거
  SIZE_BASED = 'size_based', // 크기가 큰 항목 제거
  PRIORITY = 'priority',     // 우선순위가 낮은 항목 제거
  ADAPTIVE = 'adaptive'      // 사용 패턴에 따라 적응형 전략 적용
}

// 최적화 옵션 인터페이스
export interface OptimizationOptions {
  strategy: OptimizationStrategy;
  maxSize: number;           // 최대 캐시 크기 (바이트)
  maxCount: number;          // 최대 캐시 항목 수
  reductionTarget: number;   // 감소 목표 비율 (0.0-1.0)
  ttlExtensionFactor: number; // TTL 연장 계수
  priorityWeight: number;    // 우선순위 가중치
  autoOptimizeInterval: number; // 자동 최적화 간격 (밀리초)
  optimizeOnBackground: boolean; // 백그라운드로 갈 때 최적화 여부
  optimizeOnLowMemory: boolean; // 메모리 부족 시 최적화 여부
}

// 최적화 결과 인터페이스
export interface OptimizationResult {
  removedItems: CacheItemMetadata[];  // 제거된 항목
  remainingItems: CacheItemMetadata[]; // 남은 항목
  freedSpace: number;        // 확보된 공간 (바이트)
  newUsage: number;          // 새로운 사용량 (바이트)
  strategyUsed: OptimizationStrategy; // 사용된 전략
  ttlAdjustments: {[key: string]: number}; // TTL 조정 사항
}

// 미리 정의된 최적화 프로필
export const OPTIMIZATION_PROFILES = {
  PERFORMANCE: {
    strategy: OptimizationStrategy.ADAPTIVE,
    maxSize: 100 * 1024 * 1024, // 100MB
    maxCount: 2000,
    reductionTarget: 0.1, // 10% 감소
    ttlExtensionFactor: 2.0,
    priorityWeight: 0.4,
    autoOptimizeInterval: 3600000, // 1시간
    optimizeOnBackground: false,
    optimizeOnLowMemory: true
  },
  BALANCED: {
    strategy: OptimizationStrategy.ADAPTIVE,
    maxSize: 50 * 1024 * 1024, // 50MB
    maxCount: 1000,
    reductionTarget: 0.2, // 20% 감소
    ttlExtensionFactor: 1.5,
    priorityWeight: 0.3,
    autoOptimizeInterval: 1800000, // 30분
    optimizeOnBackground: true,
    optimizeOnLowMemory: true
  },
  MEMORY_SAVING: {
    strategy: OptimizationStrategy.SIZE_BASED,
    maxSize: 20 * 1024 * 1024, // 20MB
    maxCount: 500,
    reductionTarget: 0.3, // 30% 감소
    ttlExtensionFactor: 1.2,
    priorityWeight: 0.2,
    autoOptimizeInterval: 900000, // 15분
    optimizeOnBackground: true,
    optimizeOnLowMemory: true
  },
  BATTERY_SAVING: {
    strategy: OptimizationStrategy.LRU,
    maxSize: 30 * 1024 * 1024, // 30MB
    maxCount: 800,
    reductionTarget: 0.25, // 25% 감소
    ttlExtensionFactor: 1.3,
    priorityWeight: 0.25,
    autoOptimizeInterval: 7200000, // 2시간
    optimizeOnBackground: true,
    optimizeOnLowMemory: false
  }
};

/**
 * 캐시 최적화 관리 클래스 (싱글톤)
 */
export class EnhancedCacheOptimizationStrategy {
  private static instance: EnhancedCacheOptimizationStrategy;
  private options: OptimizationOptions;
  private autoOptimizeTimer: NodeJS.Timeout | null = null;
  private accessPatterns: Map<string, string[]> = new Map();
  private itemsMetadata: Map<string, CacheItemMetadata> = new Map();
  private prefetchQueue: string[] = [];
  private isOptimizing: boolean = false;
  private totalCacheSize: number = 0;
  private totalCacheCount: number = 0;
  private lastOptimizationTime: number = 0;
  private networkState: NetInfoState | null = null;
  private appState: AppStateStatus = 'active';
  
  /**
   * 생성자 (비공개)
   */
  private constructor(options?: Partial<OptimizationOptions>) {
    // 기본 옵션 설정 (균형 잡힌 프로필 사용)
    this.options = {
      ...OPTIMIZATION_PROFILES.BALANCED,
      ...options
    };
    
    // 네트워크 상태 리스너 등록
    NetInfo.addEventListener(state => {
      this.networkState = state;
    });
    
    // 앱 상태 리스너 등록
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // 자동 최적화 타이머 시작
    this.startAutoOptimizeTimer();
  }
  
  /**
   * 싱글톤 인스턴스 얻기
   */
  public static getInstance(options?: Partial<OptimizationOptions>): EnhancedCacheOptimizationStrategy {
    if (!EnhancedCacheOptimizationStrategy.instance) {
      EnhancedCacheOptimizationStrategy.instance = new EnhancedCacheOptimizationStrategy(options);
    }
    return EnhancedCacheOptimizationStrategy.instance;
  }
  
  /**
   * 앱 상태 변경 처리
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    // 앱이 백그라운드로 이동할 때 최적화 실행
    if (this.appState === 'active' && nextAppState.match(/inactive|background/) && this.options.optimizeOnBackground) {
      this.startOptimization();
    }
    
    this.appState = nextAppState;
  }
  
  /**
   * 자동 최적화 타이머 시작
   */
  private startAutoOptimizeTimer(): void {
    // 기존 타이머가 있으면 제거
    if (this.autoOptimizeTimer) {
      clearInterval(this.autoOptimizeTimer);
    }
    
    // 새 타이머 설정
    this.autoOptimizeTimer = setInterval(() => {
      this.startOptimization();
    }, this.options.autoOptimizeInterval);
  }
  
  /**
   * 최적화 시작
   */
  public async startOptimization(): Promise<OptimizationResult | null> {
    // 이미 최적화 중이면 중단
    if (this.isOptimizing) {
      return null;
    }
    
    this.isOptimizing = true;
    
    try {
      // 모든 캐시 키 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('cache:'));
      
      // 메타데이터 업데이트
      await this.updateMetadata(cacheKeys);
      
      // 최적화 실행
      const items = Array.from(this.itemsMetadata.values());
      const result = this.optimize(items);
      
      // 제거된 항목 처리
      if (result.removedItems.length > 0) {
        const keysToRemove = result.removedItems.map(item => item.key);
        await AsyncStorage.multiRemove(keysToRemove);
        
        // 메타데이터에서도 제거
        for (const key of keysToRemove) {
          this.itemsMetadata.delete(key);
        }
      }
      
      // TTL 조정 적용
      for (const [key, newTTL] of Object.entries(result.ttlAdjustments)) {
        const item = this.itemsMetadata.get(key);
        if (item) {
          item.ttl = newTTL;
          this.itemsMetadata.set(key, item);
          
          // 캐시 항목의 TTL 업데이트
          try {
            const cachedData = await AsyncStorage.getItem(key);
            if (cachedData) {
              const data = JSON.parse(cachedData);
              data.ttl = newTTL;
              await AsyncStorage.setItem(key, JSON.stringify(data));
            }
          } catch (error) {
            console.error('TTL 업데이트 실패:', key, error);
          }
        }
      }
      
      this.lastOptimizationTime = Date.now();
      
      // 통계 업데이트
      this.totalCacheSize = result.newUsage;
      this.totalCacheCount = result.remainingItems.length;
      
      return result;
    } catch (error) {
      console.error('캐시 최적화 오류:', error);
      return null;
    } finally {
      this.isOptimizing = false;
    }
  }
  
  /**
   * 메타데이터 업데이트
   */
  private async updateMetadata(cacheKeys: string[]): Promise<void> {
    for (const key of cacheKeys) {
      try {
        const cachedData = await AsyncStorage.getItem(key);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          const metadata: CacheItemMetadata = {
            key,
            size: cachedData.length,
            accessCount: data.accessCount || 0,
            lastAccessed: data.lastAccessed || Date.now(),
            created: data.created || Date.now(),
            ttl: data.ttl || (7 * 24 * 60 * 60 * 1000), // 기본 일주일
            dataType: data.dataType || 'unknown',
            priority: data.priority || 'medium'
          };
          
          this.itemsMetadata.set(key, metadata);
        }
      } catch (error) {
        console.error('메타데이터 업데이트 실패:', key, error);
      }
    }
  }
  
  /**
   * 최적화 수행
   */
  public optimize(items: CacheItemMetadata[]): OptimizationResult {
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const totalCount = items.length;
    
    // 최적화가 필요한지 확인
    const needsOptimization = totalSize > this.options.maxSize || totalCount > this.options.maxCount;
    
    if (!needsOptimization) {
      return {
        removedItems: [],
        remainingItems: items,
        freedSpace: 0,
        newUsage: totalSize,
        strategyUsed: this.options.strategy,
        ttlAdjustments: {}
      };
    }
    
    // 전략에 따라 항목 정렬
    const sortedItems = this.sortItemsByStrategy(items, this.options.strategy);
    
    // 제거할 항목 수 및 목표 크기 계산
    const targetSize = this.options.maxSize * (1 - this.options.reductionTarget);
    const targetCount = Math.min(this.options.maxCount, Math.floor(this.options.maxCount * (1 - this.options.reductionTarget)));
    
    // 제거할 항목 선택
    const itemsToKeep: CacheItemMetadata[] = [];
    const itemsToRemove: CacheItemMetadata[] = [];
    let currentSize = 0;
    
    for (const item of sortedItems) {
      // 이미 충분한 항목을 제거한 경우 나머지 항목 유지
      if (itemsToKeep.length < targetCount && currentSize + item.size <= targetSize) {
        itemsToKeep.push(item);
        currentSize += item.size;
      } else {
        itemsToRemove.push(item);
      }
    }
    
    // TTL 조정 - 자주 접근하는 항목은 TTL 연장
    const ttlAdjustments: {[key: string]: number} = {};
    
    if (this.options.strategy === OptimizationStrategy.ADAPTIVE) {
      for (const item of itemsToKeep) {
        // 상위 20% 항목에 대한 TTL 연장
        if (item.accessCount > 10) {
          const newTTL = Math.min(
            30 * 24 * 60 * 60 * 1000, // 최대 30일
            item.ttl * this.options.ttlExtensionFactor
          );
          ttlAdjustments[item.key] = newTTL;
        }
      }
    }
    
    // 확보된 공간 계산
    const freedSpace = itemsToRemove.reduce((sum, item) => sum + item.size, 0);
    
    return {
      removedItems: itemsToRemove,
      remainingItems: itemsToKeep,
      freedSpace,
      newUsage: currentSize,
      strategyUsed: this.options.strategy,
      ttlAdjustments
    };
  }

  /**
   * 전략에 따라 항목 정렬
   */
  private sortItemsByStrategy(items: CacheItemMetadata[], strategy: OptimizationStrategy): CacheItemMetadata[] {
    const now = Date.now();
    
    switch (strategy) {
      case OptimizationStrategy.LRU:
        // 최근 접근 시간으로 정렬 (오래된 것 먼저)
        return [...items].sort((a, b) => a.lastAccessed - b.lastAccessed);
        
      case OptimizationStrategy.LFU:
        // 접근 빈도로 정렬 (낮은 것 먼저)
        return [...items].sort((a, b) => a.accessCount - b.accessCount);
        
      case OptimizationStrategy.FIFO:
        // 생성 시간으로 정렬 (오래된 것 먼저)
        return [...items].sort((a, b) => a.created - b.created);
        
      case OptimizationStrategy.SIZE_BASED:
        // 크기로 정렬 (큰 것 먼저)
        return [...items].sort((a, b) => b.size - a.size);
        
      case OptimizationStrategy.PRIORITY:
        // 우선순위로 정렬 (낮은 것 먼저)
        const priorityMap = { 'low': 0, 'medium': 1, 'high': 2 };
        return [...items].sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
        
      case OptimizationStrategy.ADAPTIVE:
        // 접근 빈도, 최근성, 크기, 우선순위를 고려한 점수 계산
        return [...items].sort((a, b) => {
          const scoreA = this.calculateAdaptiveScore(a, now);
          const scoreB = this.calculateAdaptiveScore(b, now);
          return scoreA - scoreB;
        });
        
      default:
        // 기본적으로 LRU 적용
        return [...items].sort((a, b) => a.lastAccessed - b.lastAccessed);
    }
  }

  /**
   * 적응형 점수 계산
   */
  private calculateAdaptiveScore(item: CacheItemMetadata, now: number): number {
    const recencyScore = 1 - Math.min(1, (now - item.lastAccessed) / (7 * 24 * 60 * 60 * 1000)); // 일주일 기준
    const frequencyScore = Math.min(1, item.accessCount / 100); // 100회 접근을 최대로 가정
    const sizeScore = 1 - Math.min(1, item.size / (1024 * 1024)); // 1MB 이상이면 최소 점수
    
    // 우선순위 가중치
    const priorityScore = { 'low': 0, 'medium': 0.5, 'high': 1 }[item.priority];
    
    // 최종 점수 계산 (가중치 적용)
    const score = (
      recencyScore * 0.4 +
      frequencyScore * 0.3 +
      sizeScore * 0.2 +
      priorityScore * this.options.priorityWeight
    );
    
    return score;
  }

  /**
   * 접근 패턴 기록
   */
  public recordAccessPattern(currentKey: string, nextKey: string): void {
    let pattern = this.accessPatterns.get(currentKey) || [];
    
    // 이미 패턴에 있는지 확인
    const existingIndex = pattern.indexOf(nextKey);
    
    if (existingIndex !== -1) {
      // 이미 있으면 제거
      pattern.splice(existingIndex, 1);
    }
    
    // 항상 가장 앞에 추가 (가장 최근 접근)
    pattern.unshift(nextKey);
    
    // 최대 10개 패턴만 유지
    if (pattern.length > 10) {
      pattern = pattern.slice(0, 10);
    }
    
    this.accessPatterns.set(currentKey, pattern);
  }

  /**
   * 프리페치 항목 선택
   */
  public selectItemsForPrefetch(currentKey: string): string[] {
    const result: string[] = [];
    
    // 현재 키의 접근 패턴 가져오기
    const pattern = this.accessPatterns.get(currentKey);
    if (pattern && pattern.length > 0) {
      // 상위 3개 항목 선택
      result.push(...pattern.slice(0, 3));
    }
    
    return result;
  }
  
  /**
   * 프리페치 항목 추가
   */
  public addToPrefetchQueue(keys: string[]): void {
    for (const key of keys) {
      if (!this.prefetchQueue.includes(key)) {
        this.prefetchQueue.push(key);
      }
    }
  }
  
  /**
   * 다음 프리페치 항목 가져오기
   */
  public getNextPrefetchItem(): string | null {
    if (this.prefetchQueue.length === 0) {
      return null;
    }
    
    return this.prefetchQueue.shift() || null;
  }
  
  /**
   * 캐시 아이템 메타데이터 업데이트
   */
  public updateItemMetadata(key: string, updates: Partial<CacheItemMetadata>): void {
    const item = this.itemsMetadata.get(key);
    
    if (item) {
      this.itemsMetadata.set(key, {
        ...item,
        ...updates
      });
    }
  }
  
  /**
   * 캐시 아이템 접근 기록
   */
  public recordItemAccess(key: string): void {
    const item = this.itemsMetadata.get(key);
    
    if (item) {
      this.updateItemMetadata(key, {
        accessCount: item.accessCount + 1,
        lastAccessed: Date.now()
      });
    }
  }
  
  /**
   * 캐시 아이템 생성 기록
   */
  public recordItemCreation(key: string, size: number, dataType: string, priority: 'high' | 'medium' | 'low'): void {
    const now = Date.now();
    
    this.itemsMetadata.set(key, {
      key,
      size,
      accessCount: 1,
      lastAccessed: now,
      created: now,
      ttl: 7 * 24 * 60 * 60 * 1000, // 기본 일주일
      dataType,
      priority
    });
  }
  
  /**
   * 최적화 프로필 적용
   */
  public applyProfile(profile: keyof typeof OPTIMIZATION_PROFILES): void {
    this.options = {
      ...this.options,
      ...OPTIMIZATION_PROFILES[profile]
    };
    
    // 자동 최적화 타이머 재시작
    this.startAutoOptimizeTimer();
  }
  
  /**
   * 옵션 설정
   */
  public setOptions(options: Partial<OptimizationOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
    
    // 자동 최적화 간격이 변경되었으면 타이머 재시작
    if (options.autoOptimizeInterval) {
      this.startAutoOptimizeTimer();
    }
  }
  
  /**
   * 현재 옵션 가져오기
   */
  public getOptions(): OptimizationOptions {
    return { ...this.options };
  }
  
  /**
   * 캐시 통계 가져오기
   */
  public getCacheStats(): {
    totalSize: number;
    totalCount: number;
    lastOptimizationTime: number;
    isOptimizing: boolean;
  } {
    return {
      totalSize: this.totalCacheSize,
      totalCount: this.totalCacheCount,
      lastOptimizationTime: this.lastOptimizationTime,
      isOptimizing: this.isOptimizing
    };
  }
  
  /**
   * 자원 해제
   */
  public dispose(): void {
    // 타이머 제거
    if (this.autoOptimizeTimer) {
      clearInterval(this.autoOptimizeTimer);
      this.autoOptimizeTimer = null;
    }
    
    // 이벤트 리스너 제거
    AppState.removeEventListener('change', this.handleAppStateChange);
  }
} 