import { OptimizedGitCacheManager } from '../OptimizedGitCacheManager';
import { GitCacheDeltaCompressor } from '../Advanced/GitCacheDeltaCompressor';
import { CacheItemPriority, OptimizationStrategy } from '../EnhancedCacheOptimizer';

/**
 * 최적화된 Git 캐시 어댑터
 * 
 * 기존 OptimizedGitCacheManager를 래핑하여 대량 데이터 처리 시
 * 메타데이터 오버헤드를 줄이고 성능을 향상시키는 어댑터
 */
export class OptimizedGitCacheAdapter {
  private manager: OptimizedGitCacheManager;
  private previousVersionCache: Map<string, string[]> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  private prefetchQueue: string[] = [];
  private isBatchProcessing: boolean = false;
  private isDiskOperationInProgress: boolean = false;
  private diskOperationQueue: Array<() => Promise<any>> = [];
  
  // 성능 통계
  private stats = {
    hitCount: 0,
    missCount: 0,
    compressionSavings: 0,
    batchedRequests: 0,
    totalRequests: 0,
    avgProcessingTime: 0,
    totalProcessingTime: 0,
    ioOperations: 0
  };

  constructor(options: {
    maxMemoryCacheSize?: number;
    maxAsyncStorageSize?: number;
    maxFileSystemSize?: number;
    optimizationStrategy?: OptimizationStrategy;
    batchProcessDelay?: number;
    maxConcurrentDiskOps?: number;
  } = {}) {
    this.manager = new OptimizedGitCacheManager(options);
  }

  /**
   * 저장소 데이터 캐싱
   * @param repoId 저장소 ID
   * @param repoData 저장소 데이터
   * @param options 캐시 옵션
   * @returns 캐시 성공 여부
   */
  public async cacheRepository(
    repoId: string,
    repoData: any,
    options: {
      ttl?: number;
      compress?: boolean;
      priority?: string;
    } = {}
  ): Promise<boolean> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    const cacheKey = `repo:${repoId}`;
    
    // 이미 동일한 요청이 진행 중인지 확인
    if (this.requestQueue.has(cacheKey)) {
      this.stats.batchedRequests++;
      return this.requestQueue.get(cacheKey)!;
    }
    
    // Git 데이터는 기본적으로 높은 우선순위 부여
    if (!options.priority) {
      options.priority = CacheItemPriority.HIGH;
    }
    
    const promise = this.manager.cacheRepository(repoId, repoData, options)
      .then(result => {
        // 대기열에서 제거
        this.requestQueue.delete(cacheKey);
        
        // 통계 업데이트
        this.updateStats(startTime);
        
        return result;
      });
    
    // 대기열에 추가
    this.requestQueue.set(cacheKey, promise);
    
    return promise;
  }

  /**
   * 브랜치 데이터 캐싱 - 기존 방식을 최적화
   * @param repoId 저장소 ID
   * @param branchName 브랜치 이름
   * @param branchData 브랜치 데이터
   * @param options 캐시 옵션
   * @returns 캐시 성공 여부
   */
  public async cacheBranch(
    repoId: string,
    branchName: string,
    branchData: any,
    options: {
      ttl?: number;
      compress?: boolean;
      priority?: string;
    } = {}
  ): Promise<boolean> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    const cacheKey = `branch:${repoId}:${branchName}`;
    
    // 이미 동일한 요청이 진행 중인지 확인
    if (this.requestQueue.has(cacheKey)) {
      this.stats.batchedRequests++;
      return this.requestQueue.get(cacheKey)!;
    }
    
    // Git 브랜치는 기본적으로 높은 우선순위 부여
    if (!options.priority) {
      options.priority = CacheItemPriority.HIGH;
    }
    
    const promise = this.manager.cacheBranch(repoId, branchName, branchData, options)
      .then(result => {
        // 대기열에서 제거
        this.requestQueue.delete(cacheKey);
        
        // 통계 업데이트
        this.updateStats(startTime);
        
        return result;
      });
    
    // 대기열에 추가
    this.requestQueue.set(cacheKey, promise);
    
    // 관련 커밋 프리페치 큐에 추가
    if (branchData.headCommit) {
      this.addToPrefetchQueue(`commit:${repoId}:${branchData.headCommit.hash}`);
    }
    
    return promise;
  }

  /**
   * 커밋 데이터 캐싱 - 델타 압축 최적화 적용
   * @param repoId 저장소 ID
   * @param commitHash 커밋 해시
   * @param commitData 커밋 데이터
   * @param options 캐시 옵션
   * @returns 캐시 성공 여부
   */
  public async cacheCommit(
    repoId: string,
    commitHash: string,
    commitData: any,
    options: {
      ttl?: number;
      compress?: boolean;
      branchName?: string;
      previousCommits?: string[]; // 델타 압축을 위한 이전 커밋 목록
      priority?: string;
    } = {}
  ): Promise<boolean> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    const cacheKey = `commit:${repoId}:${commitHash}`;
    
    // 이미 동일한 요청이 진행 중인지 확인
    if (this.requestQueue.has(cacheKey)) {
      this.stats.batchedRequests++;
      return this.requestQueue.get(cacheKey)!;
    }
    
    // 커밋 데이터에 델타 압축 적용 고려
    let dataToCache = commitData;
    let previousVersions: string[] = [];
    
    // 이전 버전 목록이 제공된 경우 델타 압축 적용
    if (options.previousCommits && options.previousCommits.length > 0) {
      previousVersions = await this.getPreviousVersions(repoId, options.previousCommits);
      
      if (previousVersions.length > 0) {
        // 최대 5개 이전 버전만 사용
        previousVersions = previousVersions.slice(0, 5);
        
        // 캐시 키와 연결된 이전 버전 저장
        this.previousVersionCache.set(cacheKey, previousVersions);
        
        // Git 커밋은 중요 데이터이므로 높은 우선순위 부여
        if (!options.priority) {
          options.priority = CacheItemPriority.HIGH;
        }
      }
    }
    
    // 관련 파일 트래킹을 위한 커밋-파일 관계 저장
    if (commitData.files && commitData.files.length > 0) {
      this.storeFileRelationships(repoId, commitHash, commitData.files);
    }
    
    const promise = this.manager.cacheCommit(repoId, commitHash, dataToCache, options)
      .then(result => {
        // 대기열에서 제거
        this.requestQueue.delete(cacheKey);
        
        // 통계 업데이트
        this.updateStats(startTime);
        
        return result;
      });
    
    // 대기열에 추가
    this.requestQueue.set(cacheKey, promise);
    
    return promise;
  }

  /**
   * 파일 데이터 캐싱 - 최적화된 압축 적용
   * @param repoId 저장소 ID
   * @param filePath 파일 경로
   * @param fileContent 파일 내용
   * @param options 캐시 옵션
   * @returns 캐시 성공 여부
   */
  public async cacheFile(
    repoId: string,
    filePath: string,
    fileContent: string,
    options: {
      ttl?: number;
      compress?: boolean;
      commitHash?: string;
      branchName?: string;
      previousVersions?: string[]; // 이전 버전 파일 내용 목록
      priority?: string;
    } = {}
  ): Promise<boolean> {
    this.scheduleDiskOperation(async () => {
      this.stats.totalRequests++;
      this.stats.ioOperations++;
      const startTime = Date.now();
      
      const cacheKey = `file:${repoId}:${filePath}`;
      
      // 파일 크기에 따라 압축 방법 결정
      let contentToCache = fileContent;
      let shouldCompress = options.compress !== false;
      
      // 파일 크기가 크면 델타 압축 고려
      if (shouldCompress && fileContent.length > 10240) { // 10KB 이상
        if (options.previousVersions && options.previousVersions.length > 0) {
          const compressionResult = GitCacheDeltaCompressor.compressGitObject(
            fileContent,
            'blob',
            options.previousVersions
          );
          
          // 압축률이 좋은 경우에만 압축 데이터 적용
          if (compressionResult.compressionRatio > 0.3) {
            this.stats.compressionSavings += (fileContent.length - compressionResult.compressedSize);
            
            // JSON으로 직렬화 가능한 객체로 변환하여 저장
            contentToCache = {
              _compressed: true,
              _method: compressionResult.compressionMethod,
              _baseVersion: compressionResult.baseVersion,
              _data: Array.from(compressionResult.data)
            };
          }
        }
      }
      
      // Git 관련 파일은 중요도에 따라 우선순위 설정
      if (!options.priority) {
        if (filePath.includes('/git/') || filePath.match(/\.(git|idx|pack)$/)) {
          options.priority = CacheItemPriority.HIGHEST; // git 디렉토리 중요 파일 최우선
        } else {
          options.priority = CacheItemPriority.MEDIUM;
        }
      }
      
      return this.manager.cacheFile(repoId, filePath, contentToCache, options)
        .then(result => {
          this.updateStats(startTime);
          return result;
        });
    });
    
    // 비동기 작업 대기 없이 성공으로 반환 (실제 저장은 백그라운드에서 진행)
    return true;
  }

  /**
   * 파일 데이터 로드 - 압축 해제 로직 포함
   * @param repoId 저장소 ID
   * @param filePath 파일 경로
   * @returns 파일 내용
   */
  public async getFile(repoId: string, filePath: string): Promise<string | undefined> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    const result = await this.manager.getFile(repoId, filePath);
    
    if (result) {
      this.stats.hitCount++;
      
      // 압축된 데이터인 경우 해제
      if (typeof result === 'object' && result._compressed) {
        try {
          const compressedData = new Uint8Array(result._data);
          
          // 이전 버전 데이터 가져오기 (필요한 경우)
          let baseData: string | undefined;
          if (result._method === 'delta' && result._baseVersion !== undefined) {
            const cacheKey = `file:${repoId}:${filePath}`;
            const previousVersions = this.previousVersionCache.get(cacheKey);
            if (previousVersions && previousVersions[result._baseVersion]) {
              baseData = previousVersions[result._baseVersion];
            }
          }
          
          // 압축 해제
          const decompressed = GitCacheDeltaCompressor.decompressGitObject(
            compressedData,
            result._method,
            baseData
          );
          
          this.updateStats(startTime);
          return decompressed;
        } catch (error) {
          console.error('파일 압축 해제 오류:', error);
          this.stats.missCount++;
          this.updateStats(startTime);
          return undefined;
        }
      }
      
      this.updateStats(startTime);
      return result;
    }
    
    this.stats.missCount++;
    this.updateStats(startTime);
    return undefined;
  }

  /**
   * 저장소 데이터 로드
   * @param repoId 저장소 ID
   * @returns 저장소 데이터
   */
  public async getRepository(repoId: string): Promise<any | undefined> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    const result = await this.manager.getRepository(repoId);
    
    if (result) {
      this.stats.hitCount++;
    } else {
      this.stats.missCount++;
    }
    
    this.updateStats(startTime);
    return result;
  }

  /**
   * 브랜치 데이터 로드
   * @param repoId 저장소 ID
   * @param branchName 브랜치 이름
   * @returns 브랜치 데이터
   */
  public async getBranch(repoId: string, branchName: string): Promise<any | undefined> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    const result = await this.manager.getBranch(repoId, branchName);
    
    if (result) {
      this.stats.hitCount++;
      
      // 관련 커밋 프리페치
      if (result.headCommit) {
        this.addToPrefetchQueue(`commit:${repoId}:${result.headCommit.hash}`);
      }
    } else {
      this.stats.missCount++;
    }
    
    this.updateStats(startTime);
    return result;
  }

  /**
   * 커밋 데이터 로드
   * @param repoId 저장소 ID
   * @param commitHash 커밋 해시
   * @returns 커밋 데이터
   */
  public async getCommit(repoId: string, commitHash: string): Promise<any | undefined> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    const result = await this.manager.getCommit(repoId, commitHash);
    
    if (result) {
      this.stats.hitCount++;
      
      // 관련 파일 프리페치
      if (result.files && result.files.length > 0) {
        // 최대 5개 파일만 프리페치
        for (let i = 0; i < Math.min(5, result.files.length); i++) {
          this.addToPrefetchQueue(`file:${repoId}:${result.files[i].path}`);
        }
      }
    } else {
      this.stats.missCount++;
    }
    
    this.updateStats(startTime);
    return result;
  }

  /**
   * 캐시 최적화 실행
   * @returns 최적화 결과
   */
  public async optimizeCache(): Promise<{
    memoryItems: number;
    asyncStorageItems: number;
    fileSystemItems: number;
    freedSpace: number;
  }> {
    return this.manager.optimizeCache();
  }

  /**
   * 캐시 통계 조회 - 어댑터 성능 통계 추가
   * @returns 캐시 통계
   */
  public async getCacheStats(): Promise<{
    memoryCacheSize: number;
    memoryCacheItems: number;
    asyncStorageSize: number;
    asyncStorageItems: number;
    fileSystemSize: number;
    fileSystemItems: number;
    hitRate: {
      memory: number;
      asyncStorage: number;
      fileSystem: number;
      overall: number;
    };
    adapterStats: {
      hitRate: number;
      batchEfficiency: number;
      compressionSavings: number;
      avgProcessingTime: number;
      totalRequests: number;
      ioOperations: number;
    };
  }> {
    const baseStats = await this.manager.getCacheStats();
    
    return {
      ...baseStats,
      adapterStats: {
        hitRate: this.stats.totalRequests > 0 
          ? this.stats.hitCount / this.stats.totalRequests 
          : 0,
        batchEfficiency: this.stats.totalRequests > 0 
          ? this.stats.batchedRequests / this.stats.totalRequests 
          : 0,
        compressionSavings: this.stats.compressionSavings,
        avgProcessingTime: this.stats.avgProcessingTime,
        totalRequests: this.stats.totalRequests,
        ioOperations: this.stats.ioOperations
      }
    };
  }

  /**
   * 프리페치 큐에 항목 추가
   * @param key 캐시 키
   */
  private addToPrefetchQueue(key: string): void {
    if (!this.prefetchQueue.includes(key)) {
      this.prefetchQueue.push(key);
      
      // 큐 크기가 20을 초과하면 가장 오래된 항목 제거
      if (this.prefetchQueue.length > 20) {
        this.prefetchQueue.shift();
      }
      
      // 배치 처리가 실행 중이 아니면 시작
      if (!this.isBatchProcessing) {
        this.processPrefetchQueue();
      }
    }
  }

  /**
   * 프리페치 큐 처리
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchQueue.length === 0 || this.isBatchProcessing) {
      return;
    }
    
    this.isBatchProcessing = true;
    
    try {
      // 현재 큐 복사 후 비우기
      const queueItems = [...this.prefetchQueue];
      this.prefetchQueue = [];
      
      // 저장소와 브랜치 캐시 키 패턴
      const repoPattern = /^repo:(.+)$/;
      const branchPattern = /^branch:(.+):(.+)$/;
      const commitPattern = /^commit:(.+):(.+)$/;
      const filePattern = /^file:(.+):(.+)$/;
      
      // 아이템 분류 및 우선순위 부여
      for (const item of queueItems) {
        // 이미 처리 중인 요청 건너뛰기
        if (this.requestQueue.has(item)) {
          continue;
        }
        
        // 패턴에 따라 데이터 프리페치
        if (filePattern.test(item)) {
          const matches = item.match(filePattern);
          if (matches && matches.length >= 3) {
            const [_, repoId, filePath] = matches;
            // 파일은 낮은 우선순위로 프리페치
            this.getFile(repoId, filePath).catch(() => {});
          }
        } else if (commitPattern.test(item)) {
          const matches = item.match(commitPattern);
          if (matches && matches.length >= 3) {
            const [_, repoId, commitHash] = matches;
            // 커밋은 중간 우선순위로 프리페치
            this.getCommit(repoId, commitHash).catch(() => {});
          }
        }
        // 저장소와 브랜치는 이미 높은 우선순위로 로드되었을 것이므로 스킵
      }
    } finally {
      this.isBatchProcessing = false;
      
      // 새로운 항목이 큐에 있으면 계속 처리
      if (this.prefetchQueue.length > 0) {
        setTimeout(() => this.processPrefetchQueue(), 100);
      }
    }
  }

  /**
   * 이전 버전 데이터 가져오기
   * @param repoId 저장소 ID
   * @param commitHashes 커밋 해시 목록
   * @returns 이전 버전 데이터 목록
   */
  private async getPreviousVersions(repoId: string, commitHashes: string[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const hash of commitHashes) {
      try {
        const commit = await this.manager.getCommit(repoId, hash);
        if (commit) {
          results.push(JSON.stringify(commit));
        }
      } catch (error) {
        console.error(`이전 버전 로드 오류: ${hash}`, error);
      }
    }
    
    return results;
  }

  /**
   * 파일-커밋 관계 저장
   * @param repoId 저장소 ID
   * @param commitHash 커밋 해시
   * @param files 파일 목록
   */
  private storeFileRelationships(repoId: string, commitHash: string, files: any[]): void {
    // 최대 10개 파일만 관계 추적
    const maxFiles = Math.min(10, files.length);
    
    for (let i = 0; i < maxFiles; i++) {
      const filePath = files[i].path;
      if (filePath) {
        // 메타데이터 저장 (비동기 오류 무시)
        this.manager.cacheMetadata(
          repoId,
          `rel:${filePath}:${commitHash}`,
          { commitHash, filePath, timestamp: Date.now() }
        ).catch(() => {});
      }
    }
  }

  /**
   * 통계 업데이트
   * @param startTime 작업 시작 시간
   */
  private updateStats(startTime: number): void {
    const processingTime = Date.now() - startTime;
    
    // 평균 처리 시간 계산
    this.stats.totalProcessingTime += processingTime;
    this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.totalRequests;
  }

  /**
   * 디스크 작업 스케줄링
   * @param operation 디스크 작업 함수
   */
  private scheduleDiskOperation<T>(operation: () => Promise<T>): void {
    // 작업 큐에 추가
    this.diskOperationQueue.push(operation);
    
    // 작업 처리가 진행 중이 아니면 시작
    if (!this.isDiskOperationInProgress) {
      this.processDiskOperationQueue();
    }
  }

  /**
   * 디스크 작업 큐 처리
   */
  private async processDiskOperationQueue(): Promise<void> {
    if (this.diskOperationQueue.length === 0 || this.isDiskOperationInProgress) {
      return;
    }
    
    this.isDiskOperationInProgress = true;
    
    try {
      // 큐에서 작업 가져오기
      const operation = this.diskOperationQueue.shift();
      if (operation) {
        // 작업 실행
        await operation();
      }
    } catch (error) {
      console.error('디스크 작업 오류:', error);
    } finally {
      this.isDiskOperationInProgress = false;
      
      // 남은 작업이 있으면 계속 처리
      if (this.diskOperationQueue.length > 0) {
        setTimeout(() => this.processDiskOperationQueue(), 10);
      }
    }
  }
} 