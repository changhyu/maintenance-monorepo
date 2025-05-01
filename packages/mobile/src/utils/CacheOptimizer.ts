/**
 * 적응형 캐시 최적화 모듈
 * 
 * 이 모듈은 캐시된 항목의 접근 패턴, 빈도 및 시간을 분석하여
 * 스마트 캐시 최적화 전략을 제공합니다.
 */

// 캐시 아이템 우선순위 정의
export type CachePriority = 'high' | 'medium' | 'low';

// 캐시 최적화 설정 인터페이스
export interface CacheOptimizerConfig {
  baselineTTL: number;       // 기본 TTL (ms)
  minTTL: number;            // 최소 TTL (ms)
  maxTTL: number;            // 최대 TTL (ms)
  prefetchThreshold: number; // 프리페치 임계값
  adaptiveTTLEnabled: boolean; // 적응형 TTL 활성화 여부
  patternRecognitionEnabled: boolean; // 패턴 인식 활성화 여부
  smartPrioritizationEnabled: boolean; // 스마트 우선순위 활성화 여부
  memoryCacheRatio: number;  // 메모리 캐시 비율 (총 항목의 %)
}

// 캐시 최적화 통계 인터페이스
export interface CacheOptimizerStats {
  optimizationRuns: number;  // 최적화 실행 횟수
  itemsOptimized: number;    // 최적화된 항목 수
  ttlAdjustments: number;    // TTL 조정 횟수
  prefetchHits: number;      // 프리페치 히트 수
  prefetchMisses: number;    // 프리페치 미스 수
  memorySavings: number;     // 메모리 절약량 (바이트)
}

// 캐시 최적화 결과 인터페이스
export interface CacheOptimizationResult {
  removedCount: number;       // 제거된 항목 수
  recoveredSize: number;      // 회수된 크기 (바이트)
  memoryCacheItems: string[]; // 메모리 캐시에 유지할 항목
  prefetchItems: string[];    // 프리페치할 항목
}

/**
 * 적응형 캐시 최적화 클래스
 */
export class CacheOptimizer {
  // 접근 패턴 데이터
  private accessPatterns: Map<string, Map<string, number>> = new Map();
  private itemFrequencies: Map<string, number> = new Map();
  private itemRecency: Map<string, number> = new Map();
  private prefetchQueue: string[] = [];
  private adaptiveTTLMap: Map<string, number> = new Map();
  private _lastAccessedKey: string | null = null;
  
  // 설정
  private config: CacheOptimizerConfig;
  
  // 통계
  private stats: CacheOptimizerStats = {
    optimizationRuns: 0,
    itemsOptimized: 0,
    ttlAdjustments: 0,
    prefetchHits: 0,
    prefetchMisses: 0,
    memorySavings: 0
  };
  
  /**
   * 생성자
   * @param config 캐시 최적화 설정
   */
  constructor(config?: Partial<CacheOptimizerConfig>) {
    // 기본 설정
    this.config = {
      baselineTTL: 24 * 60 * 60 * 1000, // 기본 TTL: 24시간
      minTTL: 30 * 60 * 1000, // 최소 TTL: 30분
      maxTTL: 30 * 24 * 60 * 60 * 1000, // 최대 TTL: 30일
      prefetchThreshold: 0.7, // 프리페치 임계값
      adaptiveTTLEnabled: true, // 적응형 TTL 활성화
      patternRecognitionEnabled: true, // 패턴 인식 활성화
      smartPrioritizationEnabled: true, // 스마트 우선순위 활성화
      memoryCacheRatio: 0.2, // 메모리 캐시 비율 (총 항목의 20%)
      ...config
    };
  }
  
  /**
   * 항목 접근 기록
   * @param key 접근한 항목 키
   * @param timestamp 접근 시간 (기본: 현재 시간)
   */
  public recordAccess(key: string, timestamp: number = Date.now()): void {
    // 빈도 업데이트
    const currentFreq = this.itemFrequencies.get(key) || 0;
    this.itemFrequencies.set(key, currentFreq + 1);
    
    // 최근 접근 시간 업데이트
    this.itemRecency.set(key, timestamp);
    
    // 패턴 인식이 활성화된 경우 접근 패턴 기록
    if (this.config.patternRecognitionEnabled) {
      this._updateAccessPattern(key);
    }
    
    // 적응형 TTL이 활성화된 경우 TTL 업데이트
    if (this.config.adaptiveTTLEnabled) {
      this._updateAdaptiveTTL(key);
    }
    
    // 프리페치 히트 확인
    if (this.prefetchQueue.includes(key)) {
      this.stats.prefetchHits++;
      // 히트된 항목은 큐에서 제거
      this.prefetchQueue = this.prefetchQueue.filter(item => item !== key);
    }
  }
  
  /**
   * 최적의 TTL 계산
   * @param key 항목 키
   * @param defaultTTL 기본 TTL (미설정 시 기본 설정 사용)
   * @returns 최적의 TTL (밀리초)
   */
  public getOptimalTTL(key: string, defaultTTL?: number): number {
    if (!this.config.adaptiveTTLEnabled) {
      return defaultTTL || this.config.baselineTTL;
    }
    
    const adaptiveTTL = this.adaptiveTTLMap.get(key);
    if (adaptiveTTL) {
      return adaptiveTTL;
    }
    
    return defaultTTL || this.config.baselineTTL;
  }
  
  /**
   * 다음 접근 예측
   * @param currentKey 현재 접근 중인 키
   * @returns 다음에 접근할 가능성이 높은 키 또는 null
   */
  public predictNextAccess(currentKey: string): string | null {
    if (!this.config.patternRecognitionEnabled) {
      return null;
    }
    
    const patterns = this.accessPatterns.get(currentKey);
    if (!patterns || patterns.size === 0) {
      return null;
    }
    
    // 가장 많이 연결된 항목 찾기
    let bestNext: string | null = null;
    let bestCount = 0;
    
    for (const [nextKey, count] of patterns.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestNext = nextKey;
      }
    }
    
    // 임계값을 초과하는 경우에만 예측 반환
    if (bestCount >= 3) {
      return bestNext;
    }
    
    return null;
  }
  
  /**
   * 항목의 우선순위 계산
   * @param key 항목 키
   * @returns 계산된 우선순위
   */
  public calculatePriority(key: string): CachePriority {
    if (!this.config.smartPrioritizationEnabled) {
      return 'medium'; // 기본값
    }
    
    const frequency = this.itemFrequencies.get(key) || 0;
    const recency = this.itemRecency.get(key) || 0;
    const age = Date.now() - recency;
    
    // 빈도, 최근성, 시간에 기반한 점수 계산
    const frequencyScore = Math.min(frequency / 10, 1); // 최대 1
    const recencyScore = Math.max(0, 1 - (age / (7 * 24 * 60 * 60 * 1000))); // 7일 기준
    
    const totalScore = (frequencyScore * 0.7) + (recencyScore * 0.3); // 빈도에 더 높은 가중치
    
    // 점수에 따른 우선순위 할당
    if (totalScore > 0.8) return 'high';
    if (totalScore > 0.4) return 'medium';
    return 'low';
  }
  
  /**
   * 프리페치할 항목 계산
   * @param currentItems 현재 캐시된 항목 목록
   * @returns 프리페치할 항목 목록
   */
  public calculatePrefetchItems(currentItems: string[]): string[] {
    if (!this.config.patternRecognitionEnabled) {
      return [];
    }
    
    const prefetchCandidates: Array<{key: string, score: number}> = [];
    
    // 최근 접근된 항목에 대해 다음 접근 예측
    for (const key of currentItems) {
      const nextItem = this.predictNextAccess(key);
      if (nextItem && !currentItems.includes(nextItem)) {
        prefetchCandidates.push({
          key: nextItem,
          score: this.itemFrequencies.get(nextItem) || 0
        });
      }
    }
    
    // 중복 제거 및 스코어 기준 정렬
    const uniqueCandidates = prefetchCandidates.reduce((acc, current) => {
      const existing = acc.find(item => item.key === current.key);
      if (!existing) {
        acc.push(current);
      } else if (current.score > existing.score) {
        existing.score = current.score;
      }
      return acc;
    }, [] as Array<{key: string, score: number}>);
    
    // 스코어 기준 정렬 및 상위 항목 선택
    const prefetchItems = uniqueCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // 최대 5개 항목 프리페치
      .map(item => item.key);
    
    // 프리페치 큐 업데이트 및 미스 카운트 업데이트
    this.prefetchQueue.forEach(item => {
      if (!prefetchItems.includes(item)) {
        this.stats.prefetchMisses++;
      }
    });
    
    this.prefetchQueue = prefetchItems;
    return prefetchItems;
  }
  
  /**
   * 캐시 최적화 실행
   * @param allItems 모든 캐시 항목 목록
   * @param currentSize 현재 캐시 크기 (바이트)
   * @param maxSize 최대 캐시 크기 (바이트)
   * @param itemSizeMap 항목별 크기 맵
   * @returns 최적화 결과
   */
  public async optimizeCache(
    allItems: string[],
    currentSize: number,
    maxSize: number,
    itemSizeMap?: Map<string, number>
  ): Promise<CacheOptimizationResult> {
    console.log('고급 캐시 최적화 실행 중...');
    this.stats.optimizationRuns++;
    
    // 1. 우선순위 재계산
    const prioritizedItems = allItems.map(key => ({
      key,
      priority: this.calculatePriority(key),
      frequency: this.itemFrequencies.get(key) || 0,
      recency: this.itemRecency.get(key) || 0
    }));
    
    // 2. 메모리 캐시에 유지할 항목 계산
    const memoryCacheCount = Math.floor(allItems.length * this.config.memoryCacheRatio);
    const memoryCacheItems = prioritizedItems
      .sort((a, b) => {
        // 우선순위 점수가 같으면 빈도와 최근성 고려
        if (a.priority === b.priority) {
          const freqA = a.frequency;
          const freqB = b.frequency;
          const recencyA = a.recency;
          const recencyB = b.recency;
          
          // 빈도와 최근성의 가중 합산으로 정렬
          return (freqB * 0.7 + recencyB * 0.3) - (freqA * 0.7 + recencyA * 0.3);
        }
        
        // 우선순위 기준 정렬
        const priorityScore = { high: 3, medium: 2, low: 1 };
        return priorityScore[b.priority] - priorityScore[a.priority];
      })
      .slice(0, memoryCacheCount)
      .map(item => item.key);
    
    console.log(`메모리 캐시에 ${memoryCacheItems.length}개 항목 유지`);
    
    // 3. 프리페치할 항목 계산
    const prefetchItems = this.calculatePrefetchItems(allItems);
    console.log(`프리페치 대상 항목: ${prefetchItems.length}개`);
    
    // 4. 캐시 크기 초과 시 항목 제거 (LRU, 우선순위, 적응형 TTL 고려)
    let removedCount = 0;
    let recoveredSize = 0;
    
    if (currentSize > maxSize * 0.9) { // 90% 이상 사용 중인 경우
      // 제거 대상 정렬 (낮은 우선순위, 오래된 접근, 낮은 빈도 순)
      const removalCandidates = prioritizedItems
        .sort((a, b) => {
          // 우선순위가 다르면 우선순위 기준
          if (a.priority !== b.priority) {
            const priorityScore = { high: 3, medium: 2, low: 1 };
            return priorityScore[a.priority] - priorityScore[b.priority];
          }
          
          // 최근성과 빈도 고려
          const recencyA = a.recency || 0;
          const recencyB = b.recency || 0;
          const freqA = a.frequency || 0;
          const freqB = b.frequency || 0;
          
          // 오래된 항목, 낮은 빈도 항목 먼저 제거
          return (recencyA + freqA * 5000) - (recencyB + freqB * 5000);
        });
      
      // 목표 크기에 도달할 때까지 제거
      const targetSize = maxSize * 0.7; // 70%까지 감소
      let currentRemovalSize = currentSize;
      
      // 예시로 모든 항목이 동일한 크기라고 가정
      const avgItemSize = currentSize / allItems.length;
      
      for (const item of removalCandidates) {
        // 고우선순위 항목은 보존
        if (item.priority === 'high' && currentRemovalSize < maxSize * 0.9) {
          break;
        }
        
        // 항목 크기 (실제 구현에서는 실제 크기를 사용해야 함)
        const itemSize = (itemSizeMap && itemSizeMap.get(item.key)) || avgItemSize;
        
        // 항목 제거 로직
        console.log(`제거 대상: ${item.key} (우선순위: ${item.priority})`);
        
        currentRemovalSize -= itemSize;
        recoveredSize += itemSize;
        removedCount++;
        
        // 목표 크기에 도달하면 중단
        if (currentRemovalSize <= targetSize) {
          break;
        }
      }
    }
    
    console.log(`캐시 최적화 완료: ${removedCount}개 항목 제거, ${recoveredSize} 바이트 회수`);
    this.stats.itemsOptimized += removedCount;
    this.stats.memorySavings += recoveredSize;
    
    return {
      removedCount,
      recoveredSize,
      memoryCacheItems,
      prefetchItems
    };
  }
  
  /**
   * 캐시 최적화 통계 가져오기
   * @returns 현재 캐시 최적화 통계
   */
  public getOptimizationStats(): CacheOptimizerStats {
    return { ...this.stats };
  }
  
  /**
   * 접근 패턴 업데이트 (내부 메소드)
   * @param key 현재 접근 중인 키
   * @param previousKey 이전에 접근한 키
   * @private
   */
  private _updateAccessPattern(key: string, previousKey: string | null = this._lastAccessedKey): void {
    if (previousKey && previousKey !== key) {
      if (!this.accessPatterns.has(previousKey)) {
        this.accessPatterns.set(previousKey, new Map());
      }
      
      const patterns = this.accessPatterns.get(previousKey)!;
      const count = patterns.get(key) || 0;
      patterns.set(key, count + 1);
    }
    
    this._lastAccessedKey = key;
  }
  
  /**
   * 적응형 TTL 업데이트 (내부 메소드)
   * @param key 항목 키
   * @private
   */
  private _updateAdaptiveTTL(key: string): void {
    const frequency = this.itemFrequencies.get(key) || 0;
    const currentTTL = this.adaptiveTTLMap.get(key) || this.config.baselineTTL;
    
    // 접근 빈도에 따른 TTL 조정
    let newTTL = currentTTL;
    
    if (frequency > 10) {
      // 자주 접근되는 항목은 TTL 연장
      newTTL = Math.min(currentTTL * 1.5, this.config.maxTTL);
    } else if (frequency < 3) {
      // 드물게 접근되는 항목은 TTL 단축
      newTTL = Math.max(currentTTL * 0.8, this.config.minTTL);
    }
    
    // TTL이 변경된 경우에만 업데이트
    if (newTTL !== currentTTL) {
      this.adaptiveTTLMap.set(key, newTTL);
      this.stats.ttlAdjustments++;
    }
  }
} 