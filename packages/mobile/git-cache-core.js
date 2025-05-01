/**
 * Git 캐시 코어 모듈
 * 메모리 제한 환경 최적화와 핫 패스 감지 알고리즘이 개선된 버전입니다.
 */

// 캐시 계층 정의
const CacheTier = {
  MEMORY: 'memory',   // 메모리 내 최고속 계층
  STORAGE: 'storage', // AsyncStorage 등 준영구 저장소
  FILE: 'file'        // 파일시스템 기반 저장소
};

// 메모리 제한 정책
const MemoryPolicy = {
  AGGRESSIVE: 'aggressive', // 적극적 메모리 제한 (저용량 기기용)
  BALANCED: 'balanced',     // 균형적 메모리 관리 (일반 기기용)
  PERFORMANCE: 'performance' // 성능 우선 (고성능 기기용)
};

/**
 * 개선된 캐시 관리자 클래스
 * 메모리 제한 환경에서 최적화된 성능 제공
 */
class EnhancedCacheManager {
  constructor(options = {}) {
    this.tiers = {
      [CacheTier.MEMORY]: {},
      [CacheTier.STORAGE]: {},
      [CacheTier.FILE]: {}
    };
    
    this.metadata = {};
    this.stats = {
      hits: { [CacheTier.MEMORY]: 0, [CacheTier.STORAGE]: 0, [CacheTier.FILE]: 0 },
      misses: 0,
      dataSize: 0,
      memoryUsage: 0
    };
    
    // 메모리 정책 설정
    this.memoryPolicy = options.memoryPolicy || MemoryPolicy.BALANCED;
    
    // 메모리 제한 임계값 설정 (정책별)
    this.memoryLimits = {
      [MemoryPolicy.AGGRESSIVE]: 5 * 1024 * 1024,  // 5MB
      [MemoryPolicy.BALANCED]: 20 * 1024 * 1024,   // 20MB
      [MemoryPolicy.PERFORMANCE]: 50 * 1024 * 1024 // 50MB
    };
    
    // 현재 정책의 메모리 제한
    this.memoryLimit = this.memoryLimits[this.memoryPolicy];
    
    // 최적화 트리거 임계값 (메모리 제한의 80%)
    this.optimizationThreshold = this.memoryLimit * 0.8;
    
    // 자동 최적화 주기
    this.autoOptimizationInterval = options.autoOptimizationInterval || 5 * 60 * 1000; // 5분
    
    // 주기적 최적화 시작
    if (options.enableAutoOptimization !== false) {
      this.startAutoOptimization();
    }
  }
  
  /**
   * 자동 최적화 시작
   */
  startAutoOptimization() {
    this.autoOptimizationTimer = setInterval(() => {
      if (this.stats.memoryUsage > this.optimizationThreshold) {
        this.optimizeCache();
      }
    }, this.autoOptimizationInterval);
  }
  
  /**
   * 자동 최적화 중지
   */
  stopAutoOptimization() {
    if (this.autoOptimizationTimer) {
      clearInterval(this.autoOptimizationTimer);
    }
  }

  /**
   * 캐시 아이템 설정
   */
  async setCacheItem(key, value, options = {}) {
    const { tier = CacheTier.MEMORY, priority = 1, ttl = 3600000 } = options;
    
    // 데이터 크기 계산
    const dataSize = this.calculateDataSize(value);
    
    // 메모리 제한 체크
    if (tier === CacheTier.MEMORY && 
        this.stats.memoryUsage + dataSize > this.memoryLimit) {
      // 메모리 최적화 수행
      await this.optimizeCache();
      
      // 그래도 공간 부족하면 스토리지 계층에 저장
      if (this.stats.memoryUsage + dataSize > this.memoryLimit) {
        return this.setCacheItem(key, value, { 
          ...options, 
          tier: CacheTier.STORAGE
        });
      }
    }
    
    // 기존 아이템이 있으면 삭제하여 크기 계산에서 제외
    if (key in this.metadata) {
      const oldTier = this.metadata[key].tier;
      const oldSize = this.metadata[key].size;
      
      delete this.tiers[oldTier][key];
      this.stats.memoryUsage -= oldTier === CacheTier.MEMORY ? oldSize : 0;
      this.stats.dataSize -= oldSize;
    }
    
    // 새 데이터 저장
    this.tiers[tier][key] = value;
    
    // 메타데이터 업데이트
    this.metadata[key] = {
      tier,
      priority,
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl,
      size: dataSize,
      accessCount: 0
    };
    
    // 통계 업데이트
    this.stats.dataSize += dataSize;
    if (tier === CacheTier.MEMORY) {
      this.stats.memoryUsage += dataSize;
    }
    
    return true;
  }

  /**
   * 캐시 아이템 조회
   */
  async getCacheItem(key) {
    // 계층적으로 데이터 조회
    for (const tier of [CacheTier.MEMORY, CacheTier.STORAGE, CacheTier.FILE]) {
      if (key in this.tiers[tier]) {
        // 캐시 적중 통계 업데이트
        this.stats.hits[tier]++;
        
        // 메타데이터 갱신
        if (key in this.metadata) {
          this.metadata[key].lastAccessed = Date.now();
          this.metadata[key].accessCount++;
          
          // 접근 패턴 분석 및 승격 고려
          this.considerPromotionBasedOnAccess(key, tier);
        }
        
        return this.tiers[tier][key];
      }
    }
    
    this.stats.misses++;
    return null;
  }
  
  /**
   * 접근 패턴 기반 승격 고려
   */
  async considerPromotionBasedOnAccess(key, currentTier) {
    if (currentTier !== CacheTier.MEMORY) {
      const meta = this.metadata[key];
      const now = Date.now();
      const timeSinceLastAccess = now - meta.lastAccessed;
      
      // 빈번한 접근이거나 최근 접근된 항목이면 승격 고려
      const shouldPromote = 
        meta.accessCount >= this.getPromotionThreshold() ||  // 접근 빈도 기준
        timeSinceLastAccess < 60000;  // 1분 이내 접근
      
      if (shouldPromote) {
        // 메모리에 여유 공간이 있거나 우선순위가 높은 경우에만 승격
        if (this.stats.memoryUsage + meta.size <= this.optimizationThreshold ||
            meta.priority >= 2) {
          await this.promoteToMemory(key);
        }
      }
    }
  }
  
  /**
   * 데이터를 메모리 계층으로 승격
   */
  async promoteToMemory(key) {
    const meta = this.metadata[key];
    const currentTier = meta.tier;
    
    if (currentTier === CacheTier.MEMORY) return true;
    
    const value = this.tiers[currentTier][key];
    
    // 메모리로 이동
    delete this.tiers[currentTier][key];
    this.tiers[CacheTier.MEMORY][key] = value;
    
    // 메타데이터 업데이트
    meta.tier = CacheTier.MEMORY;
    
    // 통계 업데이트
    this.stats.memoryUsage += meta.size;
    
    return true;
  }
  
  /**
   * 데이터를 스토리지 계층으로 강등
   */
  async demoteToStorage(key) {
    const meta = this.metadata[key];
    
    if (meta.tier !== CacheTier.MEMORY) return true;
    
    const value = this.tiers[CacheTier.MEMORY][key];
    
    // 스토리지로 이동
    delete this.tiers[CacheTier.MEMORY][key];
    this.tiers[CacheTier.STORAGE][key] = value;
    
    // 메타데이터 업데이트
    meta.tier = CacheTier.STORAGE;
    
    // 통계 업데이트
    this.stats.memoryUsage -= meta.size;
    
    return true;
  }

  /**
   * 캐시 아이템 삭제
   */
  async removeCacheItem(key) {
    if (!(key in this.metadata)) return false;
    
    const tier = this.metadata[key].tier;
    const size = this.metadata[key].size;
    
    // 데이터 삭제
    delete this.tiers[tier][key];
    
    // 통계 업데이트
    if (tier === CacheTier.MEMORY) {
      this.stats.memoryUsage -= size;
    }
    this.stats.dataSize -= size;
    
    // 메타데이터 삭제
    delete this.metadata[key];
    
    return true;
  }

  /**
   * 캐시 최적화 수행
   */
  async optimizeCache() {
    console.log(`캐시 최적화 시작 - 현재 메모리 사용량: ${Math.round(this.stats.memoryUsage/1024)}KB`);
    
    const now = Date.now();
    const itemsToRemove = [];
    const itemsToDemote = [];
    
    // 활성 항목 수 (TTL 기준)
    let activeItems = 0;
    
    // 메모리 내 항목 평가
    Object.entries(this.metadata)
      .filter(([key, meta]) => meta.tier === CacheTier.MEMORY)
      .forEach(([key, meta]) => {
        // 만료된 항목은 제거 대상
        if (meta.expiresAt <= now) {
          itemsToRemove.push(key);
          return;
        }
        
        activeItems++;
        
        // 메모리 정책에 따른 강등 전략
        const timeSinceAccess = now - meta.lastAccessed;
        const accessFrequency = meta.accessCount;
        
        // 정책별 강등 기준
        const demotionTimeThreshold = this.getDemotionTimeThreshold();
        const demotionAccessThreshold = this.getDemotionAccessThreshold();
        
        // 접근 빈도가 낮고, 최근에 접근되지 않았으며, 우선순위가 낮은 항목 강등
        if (timeSinceAccess > demotionTimeThreshold && 
            accessFrequency < demotionAccessThreshold &&
            meta.priority < 2) {
          itemsToDemote.push(key);
        }
      });
    
    // 제거 작업 수행
    for (const key of itemsToRemove) {
      await this.removeCacheItem(key);
    }
    
    // 강등 작업 수행 (메모리 사용량이 여전히 임계값 이상인 경우)
    if (this.stats.memoryUsage > this.optimizationThreshold) {
      for (const key of itemsToDemote) {
        await this.demoteToStorage(key);
        
        // 충분히 메모리가 확보되면 중단
        if (this.stats.memoryUsage <= this.optimizationThreshold) {
          break;
        }
      }
    }
    
    // 여전히 메모리가 부족하면 LRU 기반으로 추가 강등
    if (this.stats.memoryUsage > this.optimizationThreshold) {
      const memoryItems = Object.entries(this.metadata)
        .filter(([key, meta]) => meta.tier === CacheTier.MEMORY)
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      // 가장 오래 전에 접근된 항목부터 강등 (Git 항목 제외)
      for (const [key, meta] of memoryItems) {
        // Git 관련 항목이 아닌 경우에만 강등
        if (!key.includes('git/') && !key.includes('git:')) {
          await this.demoteToStorage(key);
        }
        
        // 충분히 메모리가 확보되면 중단
        if (this.stats.memoryUsage <= this.optimizationThreshold) {
          break;
        }
      }
      
      // 그래도 메모리가 부족하면 Git 항목도 강등
      if (this.stats.memoryUsage > this.optimizationThreshold) {
        for (const [key, meta] of memoryItems) {
          await this.demoteToStorage(key);
          
          // 충분히 메모리가 확보되면 중단
          if (this.stats.memoryUsage <= this.optimizationThreshold) {
            break;
          }
        }
      }
    }
    
    console.log(`캐시 최적화 완료 - 메모리 사용량: ${Math.round(this.stats.memoryUsage/1024)}KB (${Math.round(this.stats.memoryUsage/this.memoryLimit*100)}%)`);
    
    return {
      removed: itemsToRemove.length,
      demoted: itemsToDemote.length,
      activeItems,
      memoryUsage: this.stats.memoryUsage,
      memoryLimit: this.memoryLimit
    };
  }
  
  /**
   * 데이터 크기 계산
   */
  calculateDataSize(value) {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16 문자열은 대략 2바이트/문자
    } else {
      try {
        return JSON.stringify(value).length * 2;
      } catch (e) {
        return 1024; // 기본값
      }
    }
  }
  
  /**
   * 메모리 정책에 따른 승격 임계값 반환
   */
  getPromotionThreshold() {
    switch (this.memoryPolicy) {
      case MemoryPolicy.AGGRESSIVE: return 5;  // 5회 이상 접근
      case MemoryPolicy.BALANCED: return 3;    // 3회 이상 접근
      case MemoryPolicy.PERFORMANCE: return 2; // 2회 이상 접근
      default: return 3;
    }
  }
  
  /**
   * 메모리 정책에 따른 시간 기반 강등 임계값 반환
   */
  getDemotionTimeThreshold() {
    switch (this.memoryPolicy) {
      case MemoryPolicy.AGGRESSIVE: return 5 * 60 * 1000;  // 5분
      case MemoryPolicy.BALANCED: return 15 * 60 * 1000;   // 15분
      case MemoryPolicy.PERFORMANCE: return 30 * 60 * 1000; // 30분
      default: return 15 * 60 * 1000;
    }
  }
  
  /**
   * 메모리 정책에 따른 접근 빈도 기반 강등 임계값 반환
   */
  getDemotionAccessThreshold() {
    switch (this.memoryPolicy) {
      case MemoryPolicy.AGGRESSIVE: return 3;  // 3회 미만
      case MemoryPolicy.BALANCED: return 2;    // 2회 미만
      case MemoryPolicy.PERFORMANCE: return 1; // 1회 미만
      default: return 2;
    }
  }

  /**
   * 캐시 통계 조회
   */
  getStats() {
    const totalHits = Object.values(this.stats.hits).reduce((sum, val) => sum + val, 0);
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalHits,
      hitRate: totalHits / (totalHits + this.stats.misses) || 0,
      dataSize: this.stats.dataSize,
      memoryUsage: this.stats.memoryUsage,
      memoryLimit: this.memoryLimit,
      memoryUtilization: this.stats.memoryUsage / this.memoryLimit
    };
  }
  
  /**
   * 메모리 정책 변경
   */
  changeMemoryPolicy(newPolicy) {
    if (!Object.values(MemoryPolicy).includes(newPolicy)) {
      throw new Error(`정책 ${newPolicy}은(는) 유효하지 않습니다.`);
    }
    
    this.memoryPolicy = newPolicy;
    this.memoryLimit = this.memoryLimits[newPolicy];
    this.optimizationThreshold = this.memoryLimit * 0.8;
    
    // 정책 변경 후 최적화 실행
    this.optimizeCache();
    
    return {
      policy: newPolicy,
      memoryLimit: this.memoryLimit
    };
  }
}

/**
 * 개선된 접근 패턴 분석 알고리즘을 포함한 Git 캐시 어댑터
 */
class EnhancedGitCacheAdapter {
  constructor(options = {}) {
    // 기본 캐시 관리자 생성
    this.cacheManager = options.cacheManager || new EnhancedCacheManager(options);
    
    // 압축 통계
    this.compressionStats = {
      original: 0,
      compressed: 0
    };
    
    // 접근 패턴 분석
    this.accessPatterns = {
      pathFrequency: {},     // 경로별 접근 빈도
      pathRelationships: {}, // 경로 간 연관성
      hotPaths: new Set(),   // 핫 패스 목록
      lastAccessedPaths: []  // 최근 접근 경로 목록 (순서대로)
    };
    
    // 최근 접근 경로 목록의 최대 길이
    this.maxRecentPathsLength = options.maxRecentPathsLength || 100;
    
    // 핫 패스 임계값 (전체 접근 중 비율)
    this.hotPathThreshold = options.hotPathThreshold || 0.05; // 5%
    
    // 핫 패스 분석 주기
    this.hotPathAnalysisInterval = options.hotPathAnalysisInterval || 10 * 60 * 1000; // 10분
    
    // 자동 핫 패스 분석 시작
    if (options.enableHotPathAnalysis !== false) {
      this.startHotPathAnalysis();
    }
  }
  
  /**
   * 자동 핫 패스 분석 시작
   */
  startHotPathAnalysis() {
    this.hotPathAnalysisTimer = setInterval(() => {
      this.analyzeHotPaths();
    }, this.hotPathAnalysisInterval);
  }
  
  /**
   * 자동 핫 패스 분석 중지
   */
  stopHotPathAnalysis() {
    if (this.hotPathAnalysisTimer) {
      clearInterval(this.hotPathAnalysisTimer);
    }
  }
  
  /**
   * 핫 패스 분석 실행
   */
  analyzeHotPaths() {
    console.log("핫 패스 분석 시작...");
    
    // 총 접근 수 계산
    const totalAccesses = Object.values(this.accessPatterns.pathFrequency)
      .reduce((sum, count) => sum + count, 0);
    
    if (totalAccesses === 0) return;
    
    // 접근 빈도 기준으로 정렬
    const sortedPaths = Object.entries(this.accessPatterns.pathFrequency)
      .sort((a, b) => b[1] - a[1]);
    
    // 이전 핫 패스 상태 저장
    const oldHotPaths = new Set(this.accessPatterns.hotPaths);
    
    // 핫 패스 초기화
    this.accessPatterns.hotPaths = new Set();
    
    // 경로 프리픽스 트래킹을 위한 맵
    const prefixCounts = {};
    
    // 각 경로에 대해 핫 패스 여부 판단
    sortedPaths.forEach(([path, count]) => {
      // 절대적 기준: 전체 접근의 5% 이상
      const isHot = count / totalAccesses >= this.hotPathThreshold;
      
      if (isHot) {
        this.accessPatterns.hotPaths.add(path);
      }
      
      // 경로 프리픽스 생성 및 카운팅 (패턴 발견용)
      const parts = path.split('/');
      if (parts.length >= 2) {
        const prefix = parts.slice(0, 2).join('/'); // git/refs, git/objects 등
        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + count;
      }
    });
    
    // 프리픽스 기반 핫 패스 추가
    Object.entries(prefixCounts)
      .filter(([prefix, count]) => count / totalAccesses >= this.hotPathThreshold * 2)
      .forEach(([prefix]) => {
        // 프리픽스가 충분히 뜨거우면 해당 프리픽스 패턴 추가
        this.accessPatterns.hotPaths.add(`${prefix}/`);
      });
    
    // Git 관련 경로는 자동으로 핫 패스에 추가
    const gitPrefixes = ['git/', '.git/', 'refs/', 'objects/'];
    gitPrefixes.forEach(prefix => {
      this.accessPatterns.hotPaths.add(prefix);
    });
    
    // 핫 패스 변경 사항 기록
    const addedPaths = [...this.accessPatterns.hotPaths].filter(p => !oldHotPaths.has(p));
    const removedPaths = [...oldHotPaths].filter(p => !this.accessPatterns.hotPaths.has(p));
    
    console.log(`핫 패스 분석 완료 - 총 ${this.accessPatterns.hotPaths.size}개 핫 패스`);
    console.log(`추가된 핫 패스: ${addedPaths.join(', ')}`);
    console.log(`제거된 핫 패스: ${removedPaths.join(', ')}`);
    
    return {
      hotPaths: [...this.accessPatterns.hotPaths],
      totalAccesses,
      added: addedPaths,
      removed: removedPaths
    };
  }
  
  /**
   * 경로가 핫 패스인지 확인
   */
  isHotPath(path) {
    // 직접 일치 확인
    if (this.accessPatterns.hotPaths.has(path)) {
      return true;
    }
    
    // 프리픽스 패턴 확인
    for (const hotPath of this.accessPatterns.hotPaths) {
      // 프리픽스로 끝나는 패턴인 경우
      if (hotPath.endsWith('/') && path.startsWith(hotPath)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 접근 패턴 기록
   */
  recordAccess(path, relatedPaths = []) {
    // 경로별 접근 빈도 업데이트
    this.accessPatterns.pathFrequency[path] = (this.accessPatterns.pathFrequency[path] || 0) + 1;
    
    // 최근 접근 목록 업데이트
    this.accessPatterns.lastAccessedPaths = 
      [path, ...this.accessPatterns.lastAccessedPaths.filter(p => p !== path)]
        .slice(0, this.maxRecentPathsLength);
    
    // 연관 경로 기록
    if (relatedPaths.length > 0) {
      if (!this.accessPatterns.pathRelationships[path]) {
        this.accessPatterns.pathRelationships[path] = {};
      }
      
      relatedPaths.forEach(related => {
        if (related !== path) {
          this.accessPatterns.pathRelationships[path][related] = 
            (this.accessPatterns.pathRelationships[path][related] || 0) + 1;
        }
      });
    }
  }
  
  /**
   * 경로 연관성 기반 프리페치 대상 목록 반환
   */
  getPrefetchCandidates(path, maxCount = 5) {
    const candidates = [];
    
    // 1. 직접 연관 관계 확인
    const directRelationships = this.accessPatterns.pathRelationships[path];
    if (directRelationships) {
      candidates.push(
        ...Object.entries(directRelationships)
          .sort((a, b) => b[1] - a[1])
          .map(([relPath]) => relPath)
      );
    }
    
    // 2. 최근 접근 패턴 기반 후보 추가
    const recentIndex = this.accessPatterns.lastAccessedPaths.indexOf(path);
    if (recentIndex >= 0 && recentIndex < this.accessPatterns.lastAccessedPaths.length - 1) {
      candidates.push(this.accessPatterns.lastAccessedPaths[recentIndex + 1]);
    }
    
    // 3. 같은 프리픽스를 가진 핫 패스들 추가
    const parts = path.split('/');
    if (parts.length >= 2) {
      const prefix = parts.slice(0, 2).join('/');
      
      // 같은 프리픽스를 가진 다른 경로들 중에서 핫 패스인 것 추가
      Object.keys(this.accessPatterns.pathFrequency)
        .filter(p => p !== path && p.startsWith(prefix) && this.isHotPath(p))
        .forEach(p => candidates.push(p));
    }
    
    // 중복 제거 및 최대 개수 제한
    return [...new Set(candidates)].slice(0, maxCount);
  }

  /**
   * Git 파일 데이터 캐싱
   */
  async cacheFileData(repoId, filePath, content, options = {}) {
    const { compress = false, priority = 1, prefetch = true } = options;
    
    // Git 관련 파일 자동 우선순위 상향
    const isGitFile = filePath.includes('git/') || 
                     filePath.includes('.git/') || 
                     filePath.includes('refs/') ||
                     filePath.includes('objects/');
    
    const effectivePriority = isGitFile ? Math.max(priority, 2) : priority;
    
    // 데이터 압축 처리
    let dataToStore = content;
    if (compress && typeof content === 'string' && content.length > 1024) {
      this.compressionStats.original += content.length;
      dataToStore = this.compressData(content);
      this.compressionStats.compressed += dataToStore.length;
    }
    
    // 캐시 키 생성
    const cacheKey = `file:${repoId}:${filePath}`;
    
    // 접근 패턴 기록
    this.recordAccess(filePath);
    
    // 캐시 저장
    const result = await this.cacheManager.setCacheItem(cacheKey, dataToStore, {
      priority: effectivePriority,
      tier: this.isHotPath(filePath) ? CacheTier.MEMORY : undefined
    });
    
    // 관련 파일 프리페치 (옵션 활성화 && Git 파일인 경우)
    if (prefetch && isGitFile) {
      const prefetchCandidates = this.getPrefetchCandidates(filePath);
      
      if (prefetchCandidates.length > 0) {
        console.log(`프리페치 대상 발견: ${prefetchCandidates.join(', ')}`);
        
        // 비동기적으로 프리페치 (결과를 기다리지 않음)
        this.prefetchRelatedFiles(repoId, prefetchCandidates)
          .catch(err => console.error("프리페치 중 오류:", err));
      }
    }
    
    return result;
  }
  
  /**
   * 관련 파일 프리페치
   */
  async prefetchRelatedFiles(repoId, filePaths) {
    // 실제 구현에서는 AsyncStorage나 파일시스템에서 데이터를 가져와 캐시에 저장하는 로직 구현
    console.log(`${filePaths.length}개 파일 프리페치 중...`);
    
    // 이 예제에서는 더미 데이터로 캐싱만 시뮬레이션
    for (const path of filePaths) {
      const cacheKey = `file:${repoId}:${path}`;
      
      // 이미 캐시에 있는지 확인
      const existing = await this.cacheManager.getCacheItem(cacheKey);
      if (existing) continue;
      
      // 더미 데이터 생성 및 캐싱
      const dummyData = `Prefetched content for ${path}`;
      await this.cacheManager.setCacheItem(cacheKey, dummyData, {
        priority: 1,
        tier: this.isHotPath(path) ? CacheTier.MEMORY : CacheTier.STORAGE
      });
    }
    
    return filePaths.length;
  }

  /**
   * Git 파일 데이터 조회
   */
  async getFileData(repoId, filePath) {
    // 캐시 키 생성
    const cacheKey = `file:${repoId}:${filePath}`;
    
    // 데이터 조회
    const data = await this.cacheManager.getCacheItem(cacheKey);
    
    // 접근 패턴 기록
    this.recordAccess(filePath);
    
    if (!data) return null;
    
    // 압축 데이터 처리
    if (this.isCompressedData(data)) {
      return this.decompressData(data);
    }
    
    return data;
  }
  
  /**
   * 데이터 압축
   */
  compressData(data) {
    // 실제 구현에서는 효율적인 압축 알고리즘 사용
    return `compressed:${data.substring(0, 100)}...${data.length}`;
  }
  
  /**
   * 데이터 압축 해제
   */
  decompressData(data) {
    // 실제 구현에서는 압축 해제 알고리즘 사용
    return data.replace('compressed:', '') + '[압축 해제됨]';
  }
  
  /**
   * 압축 데이터 확인
   */
  isCompressedData(data) {
    return typeof data === 'string' && data.startsWith('compressed:');
  }
  
  /**
   * 성능 통계 조회
   */
  getPerformanceStats() {
    const cacheStats = this.cacheManager.getStats();
    
    return {
      cache: cacheStats,
      compression: {
        original: this.compressionStats.original,
        compressed: this.compressionStats.compressed,
        ratio: this.compressionStats.original ? 
          (1 - (this.compressionStats.compressed / this.compressionStats.original)) : 0
      },
      accessPatterns: {
        uniquePaths: Object.keys(this.accessPatterns.pathFrequency).length,
        totalAccesses: Object.values(this.accessPatterns.pathFrequency)
          .reduce((sum, count) => sum + count, 0),
        hotPathsCount: this.accessPatterns.hotPaths.size,
        hotPaths: [...this.accessPatterns.hotPaths]
      }
    };
  }
  
  /**
   * 메모리 정책 변경
   */
  changeMemoryPolicy(newPolicy) {
    return this.cacheManager.changeMemoryPolicy(newPolicy);
  }
}

// 모듈 내보내기
module.exports = {
  CacheTier,
  MemoryPolicy,
  EnhancedCacheManager,
  EnhancedGitCacheAdapter
}; 