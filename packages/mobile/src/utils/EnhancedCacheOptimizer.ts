/**
 * EnhancedCacheOptimizer.ts
 * 
 * 캐시 히트율 향상과 메모리 사용률 개선을 위한 고급 최적화 기능을 제공합니다.
 */

export enum OptimizationStrategy {
  LRU = 'lru',           // Least Recently Used
  LFU = 'lfu',           // Least Frequently Used
  FIFO = 'fifo',         // First In First Out
  SIZE_BASED = 'size_based', // 크기 기반 (큰 항목 우선 제거)
  PRIORITY = 'priority', // 우선 순위 기반
  ADAPTIVE = 'adaptive', // 적응형 (여러 요소 고려)
  SMART = 'smart',       // 스마트 - 접근 패턴 학습
  ARC = 'arc',           // Adaptive Replacement Cache
  SLRU = 'slru',         // Segmented LRU
  W_TINY_LFU = 'w_tiny_lfu' // Window TinyLFU
}

export enum CacheItemPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface CacheItemMetadata {
  key: string;
  size: number;
  accessCount: number;
  lastAccessed: number;
  created: number;
  ttl: number;
  dataType: string;
  priority: string;
  estimatedHitProbability?: number;
  correlatedKeys?: string[];
}

export interface OptimizationOptions {
  strategy: OptimizationStrategy;
  maxSize: number;
  maxCount: number;
  reductionTarget: number;
  ttlExtensionFactor: number;
  priorityWeight: number;
  ageWeight: number;
  frequencyWeight: number;
  sizeWeight: number;
  learningEnabled: boolean;
  prefetchingEnabled: boolean;
  compressionLevel: number;
  adaptiveRatioAdjustment: boolean; // ARC 알고리즘을 위한 비율 조정 활성화
  slruProtectedRatio: number; // SLRU 보호 영역 비율
  windowSize: number; // W-TinyLFU 윈도우 크기
  predictionThreshold: number; // 예측 기반 캐싱 임계값
  periodicTtlUpdate: boolean; // 주기적인 TTL 업데이트 활성화
}

export interface OptimizationResult {
  removedItems: CacheItemMetadata[];
  remainingItems: CacheItemMetadata[];
  freedSpace: number;
  newUsage: number;
  strategyUsed: string;
  ttlAdjustments: Record<string, number>;
  prefetchRecommendations: string[];
}

export interface AccessPattern {
  sourceKey: string;
  targetKey: string;
  count: number;
  probability: number;
}

/**
 * 고급 캐시 최적화 관리자
 * 히트율 향상과 메모리 사용량 최적화를 위한 다양한 전략을 제공합니다.
 */
export class EnhancedCacheOptimizer {
  private options: OptimizationOptions;
  private itemsMetadata: Map<string, CacheItemMetadata>;
  private accessPatterns: Map<string, Map<string, number>>;
  private priorityValues: Record<string, number>;
  private cacheMissKeys: Set<string>;
  private hitRateHistory: number[];
  private usageHistory: number[];
  private lastOptimizationTime: number;
  
  // ARC 알고리즘을 위한 속성
  private recentlyUsedSet: Set<string>; // T1 - 최근 사용된 페이지
  private frequentlyUsedSet: Set<string>; // T2 - 자주 사용된 페이지
  private ghostRecentlyUsedSet: Set<string>; // B1 - 최근에 제거된 페이지
  private ghostFrequentlyUsedSet: Set<string>; // B2 - 자주 사용되다 제거된 페이지
  private arcP: number; // T1과 T2 사이의 적응 경계
  
  // SLRU 알고리즘을 위한 속성
  private protectedSegment: Map<string, number>; // 보호된 세그먼트
  private probationarySegment: Map<string, number>; // 시험 세그먼트
  
  // W-TinyLFU 알고리즘을 위한 속성
  private window: string[]; // 윈도우 캐시
  private frequency: Map<string, number>; // 빈도 카운터
  private doorkeeper: Set<string>; // 원-히트 원더 필터링
  
  constructor(options?: Partial<OptimizationOptions>) {
    this.options = {
      strategy: OptimizationStrategy.ADAPTIVE,
      maxSize: 10 * 1024 * 1024, // 10MB
      maxCount: 1000,
      reductionTarget: 0.3, // 30% 감소
      ttlExtensionFactor: 1.5, // 자주 사용되는 항목의 TTL 1.5배 연장
      priorityWeight: 0.3,
      ageWeight: 0.2,
      frequencyWeight: 0.3,
      sizeWeight: 0.2,
      learningEnabled: true,
      prefetchingEnabled: true,
      compressionLevel: 0.6, // 60% 압축률
      adaptiveRatioAdjustment: true, // ARC 알고리즘을 위한 비율 조정 활성화
      slruProtectedRatio: 0.8, // SLRU 보호 영역 비율 (80%)
      windowSize: 10, // W-TinyLFU 윈도우 크기
      predictionThreshold: 0.7, // 예측 기반 캐싱 임계값
      periodicTtlUpdate: true, // 주기적인 TTL 업데이트 활성화
      ...options
    };
    
    this.itemsMetadata = new Map();
    this.accessPatterns = new Map();
    this.cacheMissKeys = new Set();
    this.hitRateHistory = [];
    this.usageHistory = [];
    this.lastOptimizationTime = Date.now();
    
    // 우선순위 값 설정
    this.priorityValues = {
      [CacheItemPriority.CRITICAL]: 1.0,
      [CacheItemPriority.HIGH]: 0.7,
      [CacheItemPriority.MEDIUM]: 0.4,
      [CacheItemPriority.LOW]: 0.1
    };
    
    // ARC 알고리즘 초기화
    this.recentlyUsedSet = new Set();
    this.frequentlyUsedSet = new Set();
    this.ghostRecentlyUsedSet = new Set();
    this.ghostFrequentlyUsedSet = new Set();
    this.arcP = 0; // 시작은 T1 선호
    
    // SLRU 알고리즘 초기화
    this.protectedSegment = new Map();
    this.probationarySegment = new Map();
    
    // W-TinyLFU 알고리즘 초기화
    this.window = [];
    this.frequency = new Map();
    this.doorkeeper = new Set();
  }

  /**
   * 새 캐시 항목 생성 기록
   */
  public recordItemCreation(key: string, size: number, dataType: string, priority: string): void {
    const now = Date.now();
    
    this.itemsMetadata.set(key, {
      key,
      size,
      accessCount: 1,
      lastAccessed: now,
      created: now,
      ttl: 7 * 24 * 60 * 60 * 1000, // 기본 일주일
      dataType,
      priority,
      estimatedHitProbability: 0.5, // 초기 확률
      correlatedKeys: []
    });
    
    // 캐시 미스에서 추가된 경우, 미스 목록에서 제거
    if (this.cacheMissKeys.has(key)) {
      this.cacheMissKeys.delete(key);
    }
  }

  /**
   * 캐시 항목 접근 기록
   */
  public recordItemAccess(key: string, previousKey: string | null = null): void {
    const item = this.itemsMetadata.get(key);
    
    if (item) {
      const now = Date.now();
      const updatedItem = {
        ...item,
        accessCount: item.accessCount + 1,
        lastAccessed: now
      };
      
      this.itemsMetadata.set(key, updatedItem);
      
      // 이전 접근 키와의 관계 기록 (접근 패턴 학습)
      if (previousKey && previousKey !== key) {
        this.recordAccessPattern(previousKey, key);
      }
      
      // TTL 자동 조정 (자주 사용되는 항목은 TTL 연장)
      this.adjustItemTTL(key);
    }
  }

  /**
   * 캐시 미스 기록
   */
  public recordCacheMiss(key: string): void {
    this.cacheMissKeys.add(key);
  }

  /**
   * 접근 패턴 기록 (항목 A 다음에 항목 B에 접근하는 패턴)
   */
  private recordAccessPattern(sourceKey: string, targetKey: string): void {
    if (!this.accessPatterns.has(sourceKey)) {
      this.accessPatterns.set(sourceKey, new Map());
    }
    
    const patterns = this.accessPatterns.get(sourceKey)!;
    const count = patterns.get(targetKey) || 0;
    patterns.set(targetKey, count + 1);
    
    // 연관 키 업데이트
    const sourceItem = this.itemsMetadata.get(sourceKey);
    if (sourceItem) {
      const correlatedKeys = sourceItem.correlatedKeys || [];
      if (!correlatedKeys.includes(targetKey)) {
        this.itemsMetadata.set(sourceKey, {
          ...sourceItem,
          correlatedKeys: [...correlatedKeys, targetKey].slice(0, 5) // 최대 5개만 저장
        });
      }
    }
  }

  /**
   * 캐시 히트율 업데이트
   */
  public updateHitRate(hitRate: number): void {
    this.hitRateHistory.push(hitRate);
    if (this.hitRateHistory.length > 10) {
      this.hitRateHistory.shift(); // 최대 10개만 유지
    }
  }

  /**
   * 메모리 사용률 업데이트
   */
  public updateMemoryUsage(usage: number): void {
    this.usageHistory.push(usage);
    if (this.usageHistory.length > 10) {
      this.usageHistory.shift(); // 최대 10개만 유지
    }
  }

  /**
   * 프리페치 대상 항목 선택
   * 현재 접근한 항목과 관련성이 높은 항목들을 반환
   */
  public selectItemsForPrefetch(currentKey: string, limit: number = 3): string[] {
    if (!this.options.prefetchingEnabled || !this.accessPatterns.has(currentKey)) {
      return [];
    }
    
    const patterns = this.accessPatterns.get(currentKey)!;
    const item = this.itemsMetadata.get(currentKey);
    
    if (!item) {
      return [];
    }
    
    // 접근 패턴 기반 확률 계산
    const totalAccesses = item.accessCount;
    const candidates: {key: string, probability: number}[] = [];
    
    patterns.forEach((count, targetKey) => {
      const probability = count / totalAccesses;
      candidates.push({key: targetKey, probability});
    });
    
    // 확률 기반으로 정렬하고 상위 N개 선택
    return candidates
      .sort((a, b) => b.probability - a.probability)
      .slice(0, limit)
      .map(c => c.key);
  }

  /**
   * 자동 TTL 조정
   * 자주 접근하는 항목은 TTL 연장, 드물게 접근하는 항목은 TTL 단축
   */
  private adjustItemTTL(key: string): void {
    const item = this.itemsMetadata.get(key);
    if (!item) return;
    
    const now = Date.now();
    const age = now - item.created;
    const accessRate = item.accessCount / (age / (24 * 60 * 60 * 1000) || 1); // 일일 접근 횟수
    
    let ttlFactor = 1.0;
    
    // 접근 빈도에 따른 TTL 조정
    if (accessRate > 10) { // 일일 10회 이상 접근
      ttlFactor = this.options.ttlExtensionFactor;
    } else if (accessRate < 1) { // 일일 1회 미만 접근
      ttlFactor = 0.8; // TTL 20% 감소
    }
    
    // 우선순위에 따른 추가 조정
    const priorityValue = this.priorityValues[item.priority] || 0.4;
    ttlFactor *= (0.5 + priorityValue);
    
    // TTL 업데이트 (최소 1시간, 최대 30일)
    const newTTL = Math.min(
      Math.max(item.ttl * ttlFactor, 60 * 60 * 1000), // 최소 1시간
      30 * 24 * 60 * 60 * 1000 // 최대 30일
    );
    
    this.itemsMetadata.set(key, {
      ...item,
      ttl: newTTL
    });
  }

  /**
   * 히트 확률 예측 업데이트
   * 개선된 지표와 머신러닝 기법 적용
   */
  private updateHitProbabilities(): void {
    if (!this.options.learningEnabled) return;
    
    this.itemsMetadata.forEach((item, key) => {
      const now = Date.now();
      const age = (now - item.created) / (24 * 60 * 60 * 1000); // 일 단위 나이
      const accessRate = item.accessCount / Math.max(age, 0.1); // 일일 접근 횟수
      const recency = Math.exp(-0.1 * (now - item.lastAccessed) / (60 * 60 * 1000)); // 최근성 (0~1)
      const priority = this.priorityValues[item.priority] || 0.4;
      
      // 상관관계 강도 (연관 항목들이 얼마나 자주 함께 접근되는지)
      let correlationStrength = 0;
      if (item.correlatedKeys && item.correlatedKeys.length > 0) {
        let totalCorrelation = 0;
        let validCorrelations = 0;
        
        for (const correlatedKey of item.correlatedKeys) {
          const pattern = this.accessPatterns.get(key)?.get(correlatedKey);
          if (pattern) {
            totalCorrelation += pattern / item.accessCount;
            validCorrelations++;
          }
        }
        
        correlationStrength = validCorrelations > 0 ? totalCorrelation / validCorrelations : 0;
      }
      
      // 접근 패턴 불규칙성 (값이 낮을수록 더 규칙적)
      const accessTime = item.lastAccessed - item.created;
      const accessInterval = accessTime / (item.accessCount || 1);
      const accessRegularity = Math.min(1, 1 / (1 + Math.abs(accessInterval - (24 * 60 * 60 * 1000 / 7)))); // 주 1회 접근이 기준
      
      // 접근 패턴 가속도 (접근 빈도가 증가하는지 감소하는지)
      let accessAcceleration = 0;
      if (age > 1) {
        const recentPeriod = Math.min(age, 7); // 최근 7일
        const recentAccessCount = item.accessCount * (recentPeriod / age) * 1.5; // 이상적인 최근 접근 수
        accessAcceleration = (recentAccessCount / (item.accessCount * (recentPeriod / age))) - 1;
      }
      
      // 복합 히트 확률 모델
      const hitProbability = 
        0.25 * Math.min(1, accessRate / 10) + // 접근 빈도 (최대 1)
        0.20 * recency + // 최근성
        0.15 * priority + // 우선순위
        0.15 * correlationStrength + // 상관관계 강도
        0.15 * accessRegularity + // 접근 규칙성
        0.10 * Math.max(0, Math.min(1, 0.5 + accessAcceleration)); // 접근 가속도
      
      this.itemsMetadata.set(key, {
        ...item,
        estimatedHitProbability: hitProbability
      });
    });
  }

  /**
   * 최적화 실행
   * 복합 알고리즘 기반 최적화
   */
  public optimize(items: CacheItemMetadata[]): OptimizationResult {
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const needsOptimization = totalSize > this.options.maxSize || items.length > this.options.maxCount;
    
    // 히트 확률 업데이트
    this.updateHitProbabilities();
    
    // 사용 전략 결정 (적응적 방식)
    let strategyToUse = this.options.strategy;
    
    // 적응형 전략이면 상황에 따라 최적의 전략 선택
    if (strategyToUse === OptimizationStrategy.ADAPTIVE || strategyToUse === OptimizationStrategy.SMART) {
      strategyToUse = this.selectOptimalStrategy();
    }
    
    // 결과 초기화
    const result: OptimizationResult = {
      removedItems: [],
      remainingItems: items,
      freedSpace: 0,
      newUsage: totalSize,
      strategyUsed: strategyToUse,
      ttlAdjustments: {},
      prefetchRecommendations: []
    };
    
    if (!needsOptimization) {
      return result;
    }
    
    // 선택한 전략에 따라 최적화 수행
    switch (strategyToUse) {
      case OptimizationStrategy.ARC:
        return this.optimizeWithARC(items);
      case OptimizationStrategy.SLRU:
        return this.optimizeWithSLRU(items);
      case OptimizationStrategy.W_TINY_LFU:
        return this.optimizeWithWTinyLFU(items);
      default:
        // 기존 전략 사용
        return this.optimizeWithDefaultStrategy(items, strategyToUse);
    }
  }

  /**
   * ARC(Adaptive Replacement Cache) 알고리즘을 이용한 최적화
   * T1, T2, B1, B2 네 개의 리스트를 사용하여 적응형 교체
   */
  private optimizeWithARC(items: CacheItemMetadata[]): OptimizationResult {
    const targetSize = this.options.maxSize * (1 - this.options.reductionTarget);
    const targetCount = Math.min(
      this.options.maxCount, 
      Math.floor(this.options.maxCount * (1 - this.options.reductionTarget))
    );
    
    // 모든 항목을 ARC 알고리즘에 맞게 정리
    items.forEach(item => {
      const key = item.key;
      
      // 중요도에 따라 처리 (CRITICAL은 항상 유지)
      if (item.priority === CacheItemPriority.CRITICAL) {
        this.frequentlyUsedSet.add(key);
        this.recentlyUsedSet.delete(key);
        return;
      }
      
      const accessCount = item.accessCount;
      const recency = Date.now() - item.lastAccessed;
      
      // 자주 사용되고 최근에 접근된 항목은 T2로
      if (accessCount > 3 && recency < 24 * 60 * 60 * 1000) {
        this.frequentlyUsedSet.add(key);
        this.recentlyUsedSet.delete(key);
      }
      // 최근에 접근되었지만 자주 사용되지 않는 항목은 T1으로
      else if (recency < 12 * 60 * 60 * 1000) {
        this.recentlyUsedSet.add(key);
      }
      // 자주 사용되었지만 최근에 접근되지 않은 항목은 B2로
      else if (accessCount > 5) {
        this.ghostFrequentlyUsedSet.add(key);
      }
      // 그 외 항목은 B1으로
      else {
        this.ghostRecentlyUsedSet.add(key);
      }
    });
    
    // 제거할 항목 결정
    const itemsToKeep: CacheItemMetadata[] = [];
    const itemsToRemove: CacheItemMetadata[] = [];
    let currentSize = 0;
    
    // T2 (자주 사용된 항목) - 우선 유지
    items.forEach(item => {
      if (this.frequentlyUsedSet.has(item.key)) {
        if (itemsToKeep.length < targetCount && currentSize + item.size <= targetSize) {
          itemsToKeep.push(item);
          currentSize += item.size;
        } else {
          itemsToRemove.push(item);
          // T2에서 제거된 항목은 B2로 이동
          this.frequentlyUsedSet.delete(item.key);
          this.ghostFrequentlyUsedSet.add(item.key);
        }
      }
    });
    
    // T1 (최근 사용된 항목) - 다음으로 유지
    items.forEach(item => {
      if (this.recentlyUsedSet.has(item.key) && !itemsToKeep.find(i => i.key === item.key)) {
        if (itemsToKeep.length < targetCount && currentSize + item.size <= targetSize) {
          itemsToKeep.push(item);
          currentSize += item.size;
        } else {
          itemsToRemove.push(item);
          // T1에서 제거된 항목은 B1으로 이동
          this.recentlyUsedSet.delete(item.key);
          this.ghostRecentlyUsedSet.add(item.key);
        }
      }
    });
    
    // 나머지 항목 처리
    items.forEach(item => {
      if (!itemsToKeep.find(i => i.key === item.key) && !itemsToRemove.find(i => i.key === item.key)) {
        if (itemsToKeep.length < targetCount && currentSize + item.size <= targetSize) {
          itemsToKeep.push(item);
          currentSize += item.size;
        } else {
          itemsToRemove.push(item);
        }
      }
    });
    
    // ARC 알고리즘의 p 값 조정 (T1과 T2 사이의 경계)
    if (this.options.adaptiveRatioAdjustment) {
      const b1Hits = this.ghostRecentlyUsedSet.size;
      const b2Hits = this.ghostFrequentlyUsedSet.size;
      
      if (b1Hits > b2Hits) {
        this.arcP = Math.min(this.arcP + 0.05, 1.0); // T1 크기 증가
      } else if (b2Hits > b1Hits) {
        this.arcP = Math.max(this.arcP - 0.05, 0.0); // T2 크기 증가
      }
    }
    
    // TTL 조정 및 프리페치 추천
    const ttlAdjustments = this.generateTtlAdjustments(itemsToKeep);
    const prefetchRecommendations = this.generatePrefetchRecommendations(itemsToKeep);
    
    // 제거된 공간 계산
    const freedSpace = itemsToRemove.reduce((sum, item) => sum + item.size, 0);
    
    return {
      removedItems: itemsToRemove,
      remainingItems: itemsToKeep,
      freedSpace,
      newUsage: currentSize,
      strategyUsed: OptimizationStrategy.ARC,
      ttlAdjustments,
      prefetchRecommendations
    };
  }

  /**
   * SLRU(Segmented LRU) 알고리즘을 이용한 최적화
   * 보호 세그먼트와 시험 세그먼트로 구분하여 관리
   */
  private optimizeWithSLRU(items: CacheItemMetadata[]): OptimizationResult {
    const targetSize = this.options.maxSize * (1 - this.options.reductionTarget);
    const targetCount = Math.min(
      this.options.maxCount, 
      Math.floor(this.options.maxCount * (1 - this.options.reductionTarget))
    );
    
    // 보호 세그먼트 크기 계산
    const protectedSize = Math.floor(targetCount * this.options.slruProtectedRatio);
    
    // 우선 중요도에 따라 분류
    const criticalItems: CacheItemMetadata[] = [];
    const regularItems: CacheItemMetadata[] = [];
    
    items.forEach(item => {
      if (item.priority === CacheItemPriority.CRITICAL) {
        criticalItems.push(item);
      } else {
        regularItems.push(item);
      }
    });
    
    // 항목 분류 (보호 세그먼트와 시험 세그먼트)
    regularItems.forEach(item => {
      // 누적 접근 횟수와 최근 접근 시간 기준으로 점수 계산
      const accessScore = item.accessCount * 0.7 + (1 / (1 + (Date.now() - item.lastAccessed) / (60 * 60 * 1000))) * 0.3;
      
      if (this.protectedSegment.has(item.key)) {
        // 이미 보호 세그먼트에 있는 항목 점수 업데이트
        this.protectedSegment.set(item.key, accessScore);
      } else if (this.probationarySegment.has(item.key)) {
        // 시험 세그먼트에 있는 항목 점수 업데이트
        this.probationarySegment.set(item.key, accessScore);
        
        // 접근 점수가 충분히 높으면 보호 세그먼트로 승격
        if (accessScore > 0.7) {
          this.probationarySegment.delete(item.key);
          this.protectedSegment.set(item.key, accessScore);
        }
      } else {
        // 새 항목은 우선 시험 세그먼트에 추가
        this.probationarySegment.set(item.key, accessScore);
      }
    });
    
    // 최적화 수행
    const itemsToKeep: CacheItemMetadata[] = [...criticalItems]; // CRITICAL 항목은 항상 유지
    let currentSize = criticalItems.reduce((sum, item) => sum + item.size, 0);
    
    // 1. 보호 세그먼트에서 점수 높은 순으로 유지
    const protectedEntries = Array.from(this.protectedSegment.entries())
      .sort((a, b) => b[1] - a[1]); // 점수 내림차순
    
    for (const [key, _] of protectedEntries) {
      const item = regularItems.find(i => i.key === key);
      if (item && itemsToKeep.length < protectedSize && currentSize + item.size <= targetSize * this.options.slruProtectedRatio) {
        itemsToKeep.push(item);
        currentSize += item.size;
      }
    }
    
    // 2. 시험 세그먼트에서 점수 높은 순으로 유지 (남은 공간만큼)
    const probationaryEntries = Array.from(this.probationarySegment.entries())
      .sort((a, b) => b[1] - a[1]); // 점수 내림차순
    
    for (const [key, _] of probationaryEntries) {
      const item = regularItems.find(i => i.key === key);
      if (item && !itemsToKeep.find(i => i.key === key) && 
          itemsToKeep.length < targetCount && currentSize + item.size <= targetSize) {
        itemsToKeep.push(item);
        currentSize += item.size;
      }
    }
    
    // 제거할 항목 결정
    const itemsToRemove = items.filter(item => 
      !itemsToKeep.find(i => i.key === item.key)
    );
    
    // 제거 항목 세그먼트에서 삭제
    itemsToRemove.forEach(item => {
      this.protectedSegment.delete(item.key);
      this.probationarySegment.delete(item.key);
    });
    
    // TTL 조정 및 프리페치 추천
    const ttlAdjustments = this.generateTtlAdjustments(itemsToKeep);
    const prefetchRecommendations = this.generatePrefetchRecommendations(itemsToKeep);
    
    // 제거된 공간 계산
    const freedSpace = itemsToRemove.reduce((sum, item) => sum + item.size, 0);
    
    return {
      removedItems: itemsToRemove,
      remainingItems: itemsToKeep,
      freedSpace,
      newUsage: currentSize,
      strategyUsed: OptimizationStrategy.SLRU,
      ttlAdjustments,
      prefetchRecommendations
    };
  }

  /**
   * W-TinyLFU 알고리즘을 이용한 최적화
   * 작은 윈도우 캐시와 메인 캐시로 구성, 빈도 기반 교체 정책
   */
  private optimizeWithWTinyLFU(items: CacheItemMetadata[]): OptimizationResult {
    const targetSize = this.options.maxSize * (1 - this.options.reductionTarget);
    const targetCount = Math.min(
      this.options.maxCount, 
      Math.floor(this.options.maxCount * (1 - this.options.reductionTarget))
    );
    
    // 윈도우 캐시 크기
    const windowSize = Math.min(
      Math.floor(targetCount * 0.01), // 전체 대상 크기의 1%
      this.options.windowSize
    );
    
    // 중요도에 따라 분류
    const criticalItems: CacheItemMetadata[] = [];
    const candidateItems: CacheItemMetadata[] = [];
    
    items.forEach(item => {
      if (item.priority === CacheItemPriority.CRITICAL) {
        criticalItems.push(item);
      } else {
        candidateItems.push(item);
        
        // 빈도 카운터 업데이트
        if (!this.frequency.has(item.key)) {
          // Doorkeeper 필터 적용 (첫 접근은 무시)
          if (this.doorkeeper.has(item.key)) {
            this.frequency.set(item.key, item.accessCount);
          } else {
            this.doorkeeper.add(item.key);
          }
        } else {
          this.frequency.set(item.key, item.accessCount);
        }
      }
    });
    
    // 최적화 수행
    const itemsToKeep: CacheItemMetadata[] = [...criticalItems]; // CRITICAL 항목은 항상 유지
    let currentSize = criticalItems.reduce((sum, item) => sum + item.size, 0);
    
    // 1. 윈도우 캐시 채우기 (가장 최근 항목)
    candidateItems
      .sort((a, b) => b.lastAccessed - a.lastAccessed) // 최근 접근 순
      .slice(0, windowSize)
      .forEach(item => {
        if (itemsToKeep.length < targetCount && currentSize + item.size <= targetSize) {
          itemsToKeep.push(item);
          currentSize += item.size;
          this.window.push(item.key);
          // 윈도우 크기 유지
          if (this.window.length > windowSize) {
            this.window.shift();
          }
        }
      });
    
    // 2. 메인 캐시 채우기 (빈도 기준)
    candidateItems
      .filter(item => !itemsToKeep.find(i => i.key === item.key)) // 아직 선택되지 않은 항목
      .sort((a, b) => {
        // TinyLFU 점수 계산 (빈도 + 우선순위 + 크기 효율성)
        const freqA = this.frequency.get(a.key) || 0;
        const freqB = this.frequency.get(b.key) || 0;
        const priorityA = this.priorityValues[a.priority] || 0.4;
        const priorityB = this.priorityValues[b.priority] || 0.4;
        const sizeEfficiencyA = a.accessCount / (a.size || 1); // 접근 횟수 대비 크기
        const sizeEfficiencyB = b.accessCount / (b.size || 1);
        
        // 복합 점수 계산 (높을수록 유지)
        const scoreA = freqA * 0.6 + priorityA * 0.3 + sizeEfficiencyA * 0.1;
        const scoreB = freqB * 0.6 + priorityB * 0.3 + sizeEfficiencyB * 0.1;
        
        return scoreB - scoreA; // 내림차순
      })
      .forEach(item => {
        if (itemsToKeep.length < targetCount && currentSize + item.size <= targetSize) {
          itemsToKeep.push(item);
          currentSize += item.size;
        }
      });
    
    // 제거할 항목 결정
    const itemsToRemove = items.filter(item => 
      !itemsToKeep.find(i => i.key === item.key)
    );
    
    // 주기적으로 빈도 카운터 감소 (노화 처리)
    if (Math.random() < 0.1) { // 10% 확률로 실행
      this.frequency.forEach((value, key) => {
        const newValue = Math.floor(value * 0.95); // 5% 감소
        if (newValue > 0) {
          this.frequency.set(key, newValue);
        } else {
          this.frequency.delete(key);
        }
      });
      
      // Doorkeeper 정리
      if (this.doorkeeper.size > targetCount * 2) {
        this.doorkeeper = new Set(Array.from(this.doorkeeper).slice(-targetCount));
      }
    }
    
    // TTL 조정 및 프리페치 추천
    const ttlAdjustments = this.generateTtlAdjustments(itemsToKeep);
    const prefetchRecommendations = this.generatePrefetchRecommendations(itemsToKeep);
    
    // 제거된 공간 계산
    const freedSpace = itemsToRemove.reduce((sum, item) => sum + item.size, 0);
    
    return {
      removedItems: itemsToRemove,
      remainingItems: itemsToKeep,
      freedSpace,
      newUsage: currentSize,
      strategyUsed: OptimizationStrategy.W_TINY_LFU,
      ttlAdjustments,
      prefetchRecommendations
    };
  }

  /**
   * 기본 전략을 이용한 최적화 (기존 메소드 활용)
   */
  private optimizeWithDefaultStrategy(items: CacheItemMetadata[], strategy: OptimizationStrategy): OptimizationResult {
    const targetSize = this.options.maxSize * (1 - this.options.reductionTarget);
    const targetCount = Math.min(
      this.options.maxCount, 
      Math.floor(this.options.maxCount * (1 - this.options.reductionTarget))
    );
    
    // 전략에 따라 항목 정렬
    const sortedItems = this.sortItemsByStrategy(items, strategy);
    
    // 항목 선택
    const itemsToKeep: CacheItemMetadata[] = [];
    const itemsToRemove: CacheItemMetadata[] = [];
    let currentSize = 0;
    
    for (const item of sortedItems) {
      // CRITICAL 우선순위 항목은 항상 유지
      if (item.priority === CacheItemPriority.CRITICAL) {
        itemsToKeep.push(item);
        currentSize += item.size;
        continue;
      }
      
      if (itemsToKeep.length < targetCount && currentSize + item.size <= targetSize) {
        itemsToKeep.push(item);
        currentSize += item.size;
      } else {
        itemsToRemove.push(item);
      }
    }
    
    // TTL 조정 (남은 항목들의 TTL 최적화)
    const ttlAdjustments = this.generateTtlAdjustments(itemsToKeep);
    
    // 제거된 공간 계산
    const freedSpace = itemsToRemove.reduce((sum, item) => sum + item.size, 0);
    
    // 프리페치 추천
    const prefetchRecommendations = this.generatePrefetchRecommendations(itemsToKeep);
    
    return {
      removedItems: itemsToRemove,
      remainingItems: itemsToKeep,
      freedSpace,
      newUsage: currentSize,
      strategyUsed: strategy,
      ttlAdjustments,
      prefetchRecommendations
    };
  }

  /**
   * TTL 조정 생성
   */
  private generateTtlAdjustments(items: CacheItemMetadata[]): Record<string, number> {
    const ttlAdjustments: Record<string, number> = {};
    
    items.forEach(item => {
      // 히트 확률에 따른 TTL 조정
      const hitProbability = item.estimatedHitProbability || 0.5;
      let ttlFactor = 0.8 + hitProbability * 0.4; // 0.8 ~ 1.2
      
      if (hitProbability > 0.8) {
        ttlFactor = this.options.ttlExtensionFactor; // 높은 히트 확률은 TTL 크게 증가
      }
      
      const newTTL = Math.min(
        Math.max(item.ttl * ttlFactor, 60 * 60 * 1000), // 최소 1시간
        30 * 24 * 60 * 60 * 1000 // 최대 30일
      );
      
      if (Math.abs(newTTL - item.ttl) > 3600000) { // 변화가 1시간 이상일 때만 기록
        ttlAdjustments[item.key] = newTTL;
      }
    });
    
    return ttlAdjustments;
  }

  /**
   * 상황에 최적화된 전략 선택 (개선된 버전)
   */
  private selectOptimalStrategy(): OptimizationStrategy {
    // 히트율 트렌드 분석
    const avgHitRate = this.hitRateHistory.length > 0
      ? this.hitRateHistory.reduce((sum, hr) => sum + hr, 0) / this.hitRateHistory.length
      : 0.5;
    
    // 메모리 사용량 트렌드 분석
    const avgMemoryUsage = this.usageHistory.length > 0
      ? this.usageHistory.reduce((sum, usage) => sum + usage, 0) / this.usageHistory.length
      : 0.5;
    
    // 캐시 항목 평균 크기
    let avgItemSize = 0;
    let totalItems = 0;
    this.itemsMetadata.forEach(item => {
      avgItemSize += item.size;
      totalItems++;
    });
    avgItemSize = totalItems > 0 ? avgItemSize / totalItems : 0;
    
    // 사용 패턴 분석 (접근 패턴 관계 강도)
    let patternStrength = 0;
    let patternCount = 0;
    this.accessPatterns.forEach((targets) => {
      targets.forEach((count) => {
        patternStrength += count;
        patternCount++;
      });
    });
    const avgPatternStrength = patternCount > 0 ? patternStrength / patternCount : 0;
    
    // 결정 로직
    if (avgHitRate < 0.4 && this.cacheMissKeys.size > 50) {
      // 히트율이 낮고 캐시 미스가 많은 경우 W-TinyLFU 사용
      return OptimizationStrategy.W_TINY_LFU;
    } else if (avgHitRate < 0.6 && avgPatternStrength > 3) {
      // 히트율이 중간이고 강한 접근 패턴이 있는 경우 ARC 사용
      return OptimizationStrategy.ARC;
    } else if (avgMemoryUsage > 0.8) {
      // 메모리 사용량이 높은 경우 SIZE_BASED 사용
      return OptimizationStrategy.SIZE_BASED;
    } else if (avgItemSize > 500 * 1024) { // 평균 500KB 이상
      // 항목 크기가 큰 경우 SLRU 사용
      return OptimizationStrategy.SLRU;
    } else if (this.itemsMetadata.size > 100 && avgPatternStrength > 2) {
      // 항목이 많고 접근 패턴이 있는 경우 ARC 사용
      return OptimizationStrategy.ARC;
    } else {
      // 기본은 LRU 사용
      return OptimizationStrategy.LRU;
    }
  }

  /**
   * 전략에 따라 항목 정렬
   */
  private sortItemsByStrategy(items: CacheItemMetadata[], strategy: OptimizationStrategy): CacheItemMetadata[] {
    const now = Date.now();
    let sortedItems = [...items];
    
    switch (strategy) {
      case OptimizationStrategy.LRU:
        // 가장 오래 전에 접근한 항목부터 정렬
        sortedItems.sort((a, b) => a.lastAccessed - b.lastAccessed);
        break;
        
      case OptimizationStrategy.LFU:
        // 가장 적게 접근한 항목부터 정렬
        sortedItems.sort((a, b) => a.accessCount - b.accessCount);
        break;
        
      case OptimizationStrategy.FIFO:
        // 가장 오래된 항목부터 정렬
        sortedItems.sort((a, b) => a.created - b.created);
        break;
        
      case OptimizationStrategy.SIZE_BASED:
        // 큰 항목부터 정렬
        sortedItems.sort((a, b) => b.size - a.size);
        break;
        
      case OptimizationStrategy.PRIORITY:
        // 우선순위가 낮은 항목부터 정렬
        sortedItems.sort((a, b) => (this.priorityValues[a.priority] || 0) - (this.priorityValues[b.priority] || 0));
        break;
        
      case OptimizationStrategy.ADAPTIVE:
      case OptimizationStrategy.SMART:
        // 적응형 점수 계산 (낮은 점수부터 제거)
        sortedItems.sort((a, b) => this.calculateAdaptiveScore(a, now) - this.calculateAdaptiveScore(b, now));
        break;
    }
    
    return sortedItems;
  }

  /**
   * 적응형 점수 계산
   * 높은 점수는 캐시에 유지될 가능성이 높음
   */
  private calculateAdaptiveScore(item: CacheItemMetadata, now: number): number {
    const age = (now - item.created) / (1000 * 60 * 60); // 시간 단위
    const recency = (now - item.lastAccessed) / (1000 * 60 * 60); // 시간 단위
    const accessRate = item.accessCount / Math.max(age, 1);
    const sizeScore = 1 - (item.size / this.options.maxSize); // 작을수록 높은 점수
    const priorityScore = this.priorityValues[item.priority] || 0.4;
    
    // 가중치 적용 점수 계산
    return (
      this.options.frequencyWeight * Math.min(1, accessRate / 5) + // 접근 빈도 (최대 1)
      this.options.ageWeight * (1 - Math.min(1, recency / 24)) + // 최근성 (최대 1)
      this.options.sizeWeight * sizeScore + // 크기 (최대 1)
      this.options.priorityWeight * priorityScore // 우선순위 (최대 1)
    );
  }

  /**
   * 프리페치 추천 생성
   */
  private generatePrefetchRecommendations(items: CacheItemMetadata[]): string[] {
    if (!this.options.prefetchingEnabled) {
      return [];
    }
    
    const recommendations: string[] = [];
    const recentItems = items
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, 5); // 최근 접근한 5개 항목
    
    for (const item of recentItems) {
      const prefetchCandidates = this.selectItemsForPrefetch(item.key, 2);
      for (const candidate of prefetchCandidates) {
        if (!recommendations.includes(candidate)) {
          recommendations.push(candidate);
        }
        
        if (recommendations.length >= 10) { // 최대 10개 추천
          return recommendations;
        }
      }
    }
    
    return recommendations;
  }
} 