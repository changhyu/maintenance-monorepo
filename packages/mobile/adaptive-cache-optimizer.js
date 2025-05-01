// 적응형 캐시 최적화 모듈
// 메모리 기반 스토리지 모의 구현
const memoryStorage = new Map();
const mockStorage = {
  setItem: (key, value) => {
    memoryStorage.set(key, value);
    return Promise.resolve();
  },
  getItem: (key) => {
    return Promise.resolve(memoryStorage.get(key) || null);
  },
  getAllKeys: () => {
    return Promise.resolve(Array.from(memoryStorage.keys()));
  },
  multiRemove: (keys) => {
    keys.forEach(key => memoryStorage.delete(key));
    return Promise.resolve();
  },
  removeItem: (key) => {
    memoryStorage.delete(key);
    return Promise.resolve();
  }
};

// 캐시 최적화 클래스
class AdaptiveCacheOptimizer {
  constructor() {
    this.accessPatterns = new Map(); // 접근 패턴 기록
    this.itemFrequencies = new Map(); // 항목별 접근 빈도
    this.itemRecency = new Map(); // 항목별 최근 접근 시간
    this.prefetchQueue = []; // 프리페치 대상 항목 큐
    this.adaptiveTTLMap = new Map(); // 적응형 TTL 값
    this.storage = mockStorage; // 스토리지 인스턴스
    
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
    };
    
    // 통계 및 지표
    this.stats = {
      optimizationRuns: 0,
      itemsOptimized: 0,
      ttlAdjustments: 0,
      prefetchHits: 0,
      prefetchMisses: 0,
      memorySavings: 0
    };
  }
  
  // 항목 접근 기록
  recordAccess(key, timestamp = Date.now()) {
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
  }
  
  // 최적의 TTL 계산
  getOptimalTTL(key, defaultTTL = this.config.baselineTTL) {
    if (!this.config.adaptiveTTLEnabled) {
      return defaultTTL;
    }
    
    const adaptiveTTL = this.adaptiveTTLMap.get(key);
    if (adaptiveTTL) {
      return adaptiveTTL;
    }
    
    return defaultTTL;
  }
  
  // 다음 접근 예측
  predictNextAccess(currentKey) {
    if (!this.config.patternRecognitionEnabled) {
      return null;
    }
    
    const patterns = this.accessPatterns.get(currentKey);
    if (!patterns || patterns.size === 0) {
      return null;
    }
    
    // 가장 많이 연결된 항목 찾기
    let bestNext = null;
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
  
  // 항목의 우선순위 계산
  calculatePriority(key) {
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
  
  // 프리페치할 항목 계산
  calculatePrefetchItems(currentItems) {
    if (!this.config.patternRecognitionEnabled) {
      return [];
    }
    
    const prefetchCandidates = [];
    
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
    
    // 스코어 기준 정렬 및 상위 항목 선택
    return prefetchCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // 최대 5개 항목 프리페치
      .map(item => item.key);
  }
  
  // 캐시 최적화 실행
  async optimizeCache(allItems, currentSize, maxSize) {
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
    this.prefetchQueue = prefetchItems;
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
      const itemSizeMap = new Map(); // 실제로는 항목별 크기 정보가 필요함
      
      // 예시로 모든 항목이 동일한 크기라고 가정
      const avgItemSize = currentSize / allItems.length;
      
      for (const item of removalCandidates) {
        // 고우선순위 항목은 보존
        if (item.priority === 'high' && currentRemovalSize < maxSize * 0.9) {
          break;
        }
        
        // 항목 크기 (실제 구현에서는 실제 크기를 사용해야 함)
        const itemSize = itemSizeMap.get(item.key) || avgItemSize;
        
        // 항목 제거 로직 - 실제 구현에서는 실제로 제거하고 메모리를 해제해야 함
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
  
  // 접근 패턴 업데이트 (내부 메소드)
  _updateAccessPattern(key, previousKey = this._lastAccessedKey) {
    if (previousKey && previousKey !== key) {
      if (!this.accessPatterns.has(previousKey)) {
        this.accessPatterns.set(previousKey, new Map());
      }
      
      const patterns = this.accessPatterns.get(previousKey);
      const count = patterns.get(key) || 0;
      patterns.set(key, count + 1);
    }
    
    this._lastAccessedKey = key;
  }
  
  // 적응형 TTL 업데이트 (내부 메소드)
  _updateAdaptiveTTL(key) {
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
  
  // 최적화 통계 가져오기
  getOptimizationStats() {
    return { ...this.stats };
  }
}

// 테스트 시작
async function runAdaptiveOptimizationTest() {
  console.log('적응형 캐시 최적화 테스트 시작...');
  
  // 캐시 최적화 인스턴스 생성
  const optimizer = new AdaptiveCacheOptimizer();
  
  // 테스트 데이터 생성
  const testItems = [];
  for (let i = 0; i < 100; i++) {
    testItems.push(`item_${i}`);
  }
  
  // 접근 패턴 시뮬레이션
  console.log('접근 패턴 시뮬레이션 중...');
  
  // 1. 순차적 접근
  for (const item of testItems) {
    optimizer.recordAccess(item);
  }
  
  // 2. 특정 항목에 대한 집중 접근
  const hotItems = testItems.slice(0, 10);
  for (let i = 0; i < 50; i++) {
    const hotItem = hotItems[Math.floor(Math.random() * hotItems.length)];
    optimizer.recordAccess(hotItem);
  }
  
  // 3. 패턴이 있는 접근
  const patterns = [
    ['item_20', 'item_21', 'item_22'],
    ['item_30', 'item_31', 'item_32'],
    ['item_40', 'item_41', 'item_42']
  ];
  
  for (let i = 0; i < 10; i++) {
    for (const pattern of patterns) {
      for (const item of pattern) {
        optimizer.recordAccess(item);
      }
    }
  }
  
  // 최적화 실행
  console.log('캐시 최적화 실행 중...');
  const optimizationResult = await optimizer.optimizeCache(
    testItems,
    100 * 1024 * 1024, // 현재 크기 (100MB 가정)
    120 * 1024 * 1024  // 최대 크기 (120MB 가정)
  );
  
  // 최적화 통계 출력
  console.log('\n=== 캐시 최적화 결과 ===');
  console.log(`메모리 캐시 항목 수: ${optimizationResult.memoryCacheItems.length}`);
  console.log(`프리페치 항목 수: ${optimizationResult.prefetchItems.length}`);
  console.log(`제거된 항목 수: ${optimizationResult.removedCount}`);
  console.log(`회수된 크기: ${(optimizationResult.recoveredSize / 1024 / 1024).toFixed(2)}MB`);
  
  // 우선순위 및 TTL 분석
  console.log('\n=== 항목 우선순위 및 TTL 분석 ===');
  
  // 샘플 항목 선택
  const sampleItems = [
    ...hotItems.slice(0, 3),
    'item_21',
    'item_31',
    'item_41',
    'item_50',
    'item_60',
    'item_70'
  ];
  
  for (const item of sampleItems) {
    const priority = optimizer.calculatePriority(item);
    const ttl = optimizer.getOptimalTTL(item);
    const frequency = optimizer.itemFrequencies.get(item) || 0;
    console.log(`${item}: 우선순위=${priority}, TTL=${(ttl/3600000).toFixed(1)}시간, 접근횟수=${frequency}`);
  }
  
  // 패턴 예측 테스트
  console.log('\n=== 패턴 예측 테스트 ===');
  for (const pattern of patterns) {
    const prediction = optimizer.predictNextAccess(pattern[0]);
    console.log(`${pattern[0]} 접근 후 예상 접근: ${prediction || '예측 없음'}`);
  }
  
  console.log('\n=== 최적화 통계 ===');
  const stats = optimizer.getOptimizationStats();
  console.log(`최적화 실행 횟수: ${stats.optimizationRuns}`);
  console.log(`최적화된 항목 수: ${stats.itemsOptimized}`);
  console.log(`TTL 조정 횟수: ${stats.ttlAdjustments}`);
  console.log(`총 회수된 메모리: ${(stats.memorySavings / 1024 / 1024).toFixed(2)}MB`);
  
  console.log('\n적응형 캐시 최적화 테스트 완료!');
}

// 테스트 실행
console.log('테스트 스크립트를 실행합니다...');
runAdaptiveOptimizationTest()
  .then(() => console.log('테스트가 성공적으로 완료되었습니다.'))
  .catch(error => console.error('캐시 최적화 테스트 중 오류 발생:', error)); 