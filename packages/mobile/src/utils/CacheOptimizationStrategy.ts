/**
 * 향상된 캐시 최적화 전략 매니저
 * 
 * 다양한 캐시 최적화 전략을 정의하고 관리합니다.
 * 메모리 사용량, 성능, 접근 패턴을 고려한 고급 최적화 알고리즘을 제공합니다.
 */

import { AppState } from 'react-native';
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

/**
 * 캐시 최적화 관리 클래스
 */
export class CacheOptimizationManager {
  private options: OptimizationOptions;

  /**
   * 생성자
   * @param options 최적화 옵션
   */
  constructor(options?: Partial<OptimizationOptions>) {
    // 기본 옵션 설정
    this.options = {
      strategy: OptimizationStrategy.ADAPTIVE,
      maxSize: 50 * 1024 * 1024, // 50MB
      maxCount: 1000,
      reductionTarget: 0.2, // 20% 감소 목표
      ttlExtensionFactor: 1.5,
      priorityWeight: 0.3,
      ...options
    };
  }

  /**
   * 최적화 수행
   * @param items 캐시 항목 메타데이터 목록
   * @returns 최적화 결과
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
   * @param items 캐시 항목 메타데이터 목록
   * @param strategy 정렬 전략
   * @returns 정렬된 항목 목록
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
   * @param item 캐시 항목 메타데이터
   * @param now 현재 시간
   * @returns 계산된 점수 (낮을수록 제거 대상)
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
   * 캐시 TTL 조정
   * @param item 캐시 항목 메타데이터
   * @returns 조정된 TTL (밀리초)
   */
  public adjustTTL(item: CacheItemMetadata): number {
    const now = Date.now();
    const age = now - item.created;
    const timeSinceLastAccess = now - item.lastAccessed;
    
    // 기본 TTL
    let newTTL = item.ttl;
    
    // 자주 접근하는 항목은 TTL 증가
    if (item.accessCount > 20) {
      newTTL = Math.min(30 * 24 * 60 * 60 * 1000, item.ttl * 2); // 최대 30일
    }
    // 거의 접근하지 않는 항목은 TTL 감소
    else if (item.accessCount < 3 && timeSinceLastAccess > 7 * 24 * 60 * 60 * 1000) {
      newTTL = Math.max(1 * 60 * 60 * 1000, item.ttl / 2); // 최소 1시간
    }
    
    return newTTL;
  }

  /**
   * 프리페치 항목 선택
   * @param items 캐시 항목 메타데이터 목록
   * @param accessPattern 접근 패턴 맵 (키 -> 다음 접근 가능성이 높은 키 목록)
   * @returns 프리페치할 항목 키 목록
   */
  public selectItemsForPrefetch(
    items: CacheItemMetadata[],
    accessPattern: Map<string, string[]>
  ): string[] {
    // 최근 접근된 항목 찾기 (상위 10개)
    const recentItems = [...items]
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, 10);
    
    // 프리페치할 잠재적 항목 수집
    const prefetchCandidates = new Map<string, number>();
    
    for (const item of recentItems) {
      const nextItems = accessPattern.get(item.key) || [];
      for (const nextItem of nextItems) {
        const score = prefetchCandidates.get(nextItem) || 0;
        prefetchCandidates.set(nextItem, score + 1);
      }
    }
    
    // 점수 기준 정렬 및 상위 항목 선택
    return Array.from(prefetchCandidates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => key);
  }

  /**
   * 옵션 설정
   * @param options 업데이트할 옵션
   */
  public setOptions(options: Partial<OptimizationOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }

  /**
   * 현재 옵션 가져오기
   * @returns 현재 옵션
   */
  public getOptions(): OptimizationOptions {
    return { ...this.options };
  }
} 