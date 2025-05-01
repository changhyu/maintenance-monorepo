import { TieredCacheManager } from './TieredCacheManager';
import { CacheItemPriority, OptimizationStrategy } from './EnhancedCacheOptimizer';

/**
 * Git 데이터에 특화된 계층화된 캐시 관리자
 * 
 * Git 데이터의 특성(관계, 접근 패턴)을 고려하여 최적화된 캐싱을 제공
 */
export class OptimizedGitCacheManager {
  // 내부 계층 캐시 관리자
  private cacheManager: TieredCacheManager;
  
  // 캐시 키 프리픽스
  private readonly GIT_CACHE_PREFIX: string = 'git:';
  private readonly REPO_PREFIX: string = 'repo:';
  private readonly BRANCH_PREFIX: string = 'branch:';
  private readonly COMMIT_PREFIX: string = 'commit:';
  private readonly FILE_PREFIX: string = 'file:';
  private readonly DIFF_PREFIX: string = 'diff:';
  private readonly METADATA_PREFIX: string = 'meta:';
  
  // 관계 캐싱
  private relationshipCache: Map<string, Set<string>> = new Map();
  // 메타데이터 오버헤드 감소를 위한 배치 작업 큐
  private batchQueue: Map<string, Array<{operation: string, data: any, options: any, resolve: Function, reject: Function}>> = new Map();
  private batchProcessorRunning: boolean = false;
  private batchProcessDelay: number = 50; // 밀리초 단위의 배치 처리 지연
  
  constructor(options: {
    maxMemoryCacheSize?: number;
    maxAsyncStorageSize?: number;
    maxFileSystemSize?: number;
    optimizationStrategy?: OptimizationStrategy;
    batchProcessDelay?: number;
  } = {}) {
    // 계층 캐시 관리자 초기화
    this.cacheManager = new TieredCacheManager({
      maxMemoryCacheSize: options.maxMemoryCacheSize || 20 * 1024 * 1024, // 20MB
      maxAsyncStorageSize: options.maxAsyncStorageSize || 100 * 1024 * 1024, // 100MB
      maxFileSystemSize: options.maxFileSystemSize || 500 * 1024 * 1024, // 500MB
      prefix: this.GIT_CACHE_PREFIX,
      optimizationStrategy: options.optimizationStrategy || OptimizationStrategy.SLRU
    });
    
    // 배치 처리 지연 설정
    if (options.batchProcessDelay !== undefined) {
      this.batchProcessDelay = options.batchProcessDelay;
    }
    
    // 주기적인 프리페칭 및 최적화 설정
    this.setupPeriodicOptimization();
  }
  
  /**
   * 배치 처리 함수 - 메타데이터 오버헤드 감소를 위한 최적화
   * @param type 작업 유형 (repo, branch, commit, file, diff)
   * @param data 캐싱할 데이터
   * @param options 캐싱 옵션
   * @returns 배치 처리 결과 Promise
   */
  private batchProcess<T>(type: string, data: any, options: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      // 작업 유형에 따른 큐 관리
      if (!this.batchQueue.has(type)) {
        this.batchQueue.set(type, []);
      }
      
      // 큐에 작업 추가
      this.batchQueue.get(type)!.push({
        operation: options.operation || 'set',
        data,
        options,
        resolve,
        reject
      });
      
      // 배치 프로세서가 실행 중이 아니면 시작
      if (!this.batchProcessorRunning) {
        this.startBatchProcessor();
      }
    });
  }
  
  /**
   * 배치 프로세서 시작 - 일정 시간 후 배치 작업 처리
   */
  private startBatchProcessor(): void {
    this.batchProcessorRunning = true;
    
    setTimeout(async () => {
      try {
        await this.processBatchQueue();
      } catch (error) {
        console.error('배치 처리 중 오류 발생:', error);
      } finally {
        this.batchProcessorRunning = false;
        
        // 큐에 작업이 남아있으면 배치 프로세서 재시작
        if ([...this.batchQueue.values()].some(queue => queue.length > 0)) {
          this.startBatchProcessor();
        }
      }
    }, this.batchProcessDelay);
  }
  
  /**
   * 배치 큐 처리 - 실제 작업 실행
   */
  private async processBatchQueue(): Promise<void> {
    // 모든 유형의 큐 처리
    for (const [type, queue] of this.batchQueue.entries()) {
      if (queue.length === 0) continue;
      
      // 처리할 항목들
      const itemsToProcess = [...queue];
      // 큐 비우기
      this.batchQueue.set(type, []);
      
      try {
        switch (type) {
          case 'repo':
            await this.processBatchRepositories(itemsToProcess);
            break;
          case 'branch':
            await this.processBatchBranches(itemsToProcess);
            break;
          case 'commit':
            await this.processBatchCommits(itemsToProcess);
            break;
          case 'file':
            await this.processBatchFiles(itemsToProcess);
            break;
          case 'diff':
            await this.processBatchDiffs(itemsToProcess);
            break;
          case 'meta':
            await this.processBatchMetadata(itemsToProcess);
            break;
          default:
            // 알 수 없는 유형은 개별 처리
            for (const item of itemsToProcess) {
              try {
                const result = await this.cacheManager.setItem(
                  item.data.key,
                  item.data.value,
                  item.options
                );
                item.resolve(result);
              } catch (err) {
                item.reject(err);
              }
            }
        }
      } catch (error) {
        // 에러 발생 시 모든 작업에 실패 알림
        for (const item of itemsToProcess) {
          item.reject(error);
        }
      }
    }
  }
  
  /**
   * 저장소 배치 처리
   */
  private async processBatchRepositories(items: Array<any>): Promise<void> {
    // 개별 처리 (저장소는 독립적이므로 배치 처리 이점이 적음)
    for (const item of items) {
      try {
        if (item.operation === 'set') {
          const result = await this.cacheRepository(
            item.data.repoId,
            item.data.repoData,
            item.options
          );
          item.resolve(result);
        } else if (item.operation === 'get') {
          const result = await this.getRepository(item.data.repoId);
          item.resolve(result);
        }
      } catch (err) {
        item.reject(err);
      }
    }
  }
  
  /**
   * 브랜치 배치 처리
   */
  private async processBatchBranches(items: Array<any>): Promise<void> {
    // 저장소별로 그룹화
    const repoGroups = new Map<string, Array<any>>();
    
    for (const item of items) {
      const repoId = item.data.repoId;
      if (!repoGroups.has(repoId)) {
        repoGroups.set(repoId, []);
      }
      repoGroups.get(repoId)!.push(item);
    }
    
    // 저장소별로 처리
    for (const [repoId, repoItems] of repoGroups.entries()) {
      // 관계 캐싱 최적화 - 한 번에 여러 브랜치 관계 설정
      const relationshipUpdates = new Map<string, Set<string>>();
      
      for (const item of repoItems) {
        try {
          if (item.operation === 'set') {
            // 관계 정보 수집
            const key = `${this.BRANCH_PREFIX}${repoId}:${item.data.branchName}`;
            const sourceKey = `${this.REPO_PREFIX}${repoId}`;
            
            if (!relationshipUpdates.has(sourceKey)) {
              relationshipUpdates.set(sourceKey, new Set());
            }
            relationshipUpdates.get(sourceKey)!.add(key);
            
            // 실제 캐시 설정
            const result = await this.cacheBranch(
              repoId,
              item.data.branchName,
              item.data.branchData,
              item.options
            );
            item.resolve(result);
          } else if (item.operation === 'get') {
            const result = await this.getBranch(repoId, item.data.branchName);
            item.resolve(result);
          }
        } catch (err) {
          item.reject(err);
        }
      }
      
      // 수집된 관계 정보 일괄 업데이트
      this.batchUpdateRelationships(relationshipUpdates);
    }
  }
  
  /**
   * 관계 정보 일괄 업데이트
   */
  private batchUpdateRelationships(updates: Map<string, Set<string>>): void {
    for (const [sourceKey, targetKeys] of updates.entries()) {
      if (!this.relationshipCache.has(sourceKey)) {
        this.relationshipCache.set(sourceKey, new Set());
      }
      
      const existingRelations = this.relationshipCache.get(sourceKey)!;
      for (const targetKey of targetKeys) {
        existingRelations.add(targetKey);
      }
    }
  }
  
  /**
   * 커밋 배치 처리
   */
  private async processBatchCommits(items: Array<any>): Promise<void> {
    // 저장소별로 그룹화
    const repoGroups = new Map<string, Array<any>>();
    
    for (const item of items) {
      const repoId = item.data.repoId;
      if (!repoGroups.has(repoId)) {
        repoGroups.set(repoId, []);
      }
      repoGroups.get(repoId)!.push(item);
    }
    
    // 저장소별로 처리
    for (const [repoId, repoItems] of repoGroups.entries()) {
      // 관계 캐싱 최적화 - 한 번에 여러 커밋 관계 설정
      const relationshipUpdates = new Map<string, Set<string>>();
      
      for (const item of repoItems) {
        try {
          if (item.operation === 'set') {
            // 관계 정보 수집
            const key = `${this.COMMIT_PREFIX}${repoId}:${item.data.commitHash}`;
            const sourceKey = `${this.REPO_PREFIX}${repoId}`;
            
            if (!relationshipUpdates.has(sourceKey)) {
              relationshipUpdates.set(sourceKey, new Set());
            }
            relationshipUpdates.get(sourceKey)!.add(key);
            
            // 브랜치 관계가 있는 경우
            if (item.options.branchName) {
              const branchKey = `${this.BRANCH_PREFIX}${repoId}:${item.options.branchName}`;
              if (!relationshipUpdates.has(branchKey)) {
                relationshipUpdates.set(branchKey, new Set());
              }
              relationshipUpdates.get(branchKey)!.add(key);
            }
            
            // 실제 캐시 설정
            const result = await this.cacheCommit(
              repoId,
              item.data.commitHash,
              item.data.commitData,
              item.options
            );
            item.resolve(result);
          } else if (item.operation === 'get') {
            const result = await this.getCommit(repoId, item.data.commitHash);
            item.resolve(result);
          }
        } catch (err) {
          item.reject(err);
        }
      }
      
      // 수집된 관계 정보 일괄 업데이트
      this.batchUpdateRelationships(relationshipUpdates);
    }
  }
  
  /**
   * 파일 배치 처리
   */
  private async processBatchFiles(items: Array<any>): Promise<void> {
    // 저장소별로 그룹화
    const repoGroups = new Map<string, Array<any>>();
    
    for (const item of items) {
      const repoId = item.data.repoId;
      if (!repoGroups.has(repoId)) {
        repoGroups.set(repoId, []);
      }
      repoGroups.get(repoId)!.push(item);
    }
    
    // 저장소별로 처리
    for (const [repoId, repoItems] of repoGroups.entries()) {
      // 관계 캐싱 최적화 - 한 번에 여러 파일 관계 설정
      const relationshipUpdates = new Map<string, Set<string>>();
      
      for (const item of repoItems) {
        try {
          if (item.operation === 'set') {
            // 관계 정보 수집
            const key = `${this.FILE_PREFIX}${repoId}:${item.data.filePath}`;
            
            // 커밋 관계가 있는 경우
            if (item.options.commitHash) {
              const commitKey = `${this.COMMIT_PREFIX}${repoId}:${item.options.commitHash}`;
              if (!relationshipUpdates.has(commitKey)) {
                relationshipUpdates.set(commitKey, new Set());
              }
              relationshipUpdates.get(commitKey)!.add(key);
            }
            
            // 브랜치 관계가 있는 경우
            if (item.options.branchName) {
              const branchKey = `${this.BRANCH_PREFIX}${repoId}:${item.options.branchName}`;
              if (!relationshipUpdates.has(branchKey)) {
                relationshipUpdates.set(branchKey, new Set());
              }
              relationshipUpdates.get(branchKey)!.add(key);
            }
            
            // 실제 캐시 설정
            const result = await this.cacheFile(
              repoId,
              item.data.filePath,
              item.data.fileContent,
              item.options
            );
            item.resolve(result);
          } else if (item.operation === 'get') {
            const result = await this.getFile(repoId, item.data.filePath);
            item.resolve(result);
          }
        } catch (err) {
          item.reject(err);
        }
      }
      
      // 수집된 관계 정보 일괄 업데이트
      this.batchUpdateRelationships(relationshipUpdates);
    }
  }
  
  /**
   * Diff 배치 처리
   */
  private async processBatchDiffs(items: Array<any>): Promise<void> {
    // 저장소별로 그룹화
    const repoGroups = new Map<string, Array<any>>();
    
    for (const item of items) {
      const repoId = item.data.repoId;
      if (!repoGroups.has(repoId)) {
        repoGroups.set(repoId, []);
      }
      repoGroups.get(repoId)!.push(item);
    }
    
    // 저장소별로 처리
    for (const [repoId, repoItems] of repoGroups.entries()) {
      // 관계 캐싱 최적화 - 한 번에 여러 Diff 관계 설정
      const relationshipUpdates = new Map<string, Set<string>>();
      
      for (const item of repoItems) {
        try {
          if (item.operation === 'set') {
            // 관계 정보 수집
            const key = `${this.DIFF_PREFIX}${repoId}:${item.data.diffId}`;
            
            // 커밋 관계가 있는 경우
            if (item.options.commitHash) {
              const commitKey = `${this.COMMIT_PREFIX}${repoId}:${item.options.commitHash}`;
              if (!relationshipUpdates.has(commitKey)) {
                relationshipUpdates.set(commitKey, new Set());
              }
              relationshipUpdates.get(commitKey)!.add(key);
            }
            
            // 실제 캐시 설정
            const result = await this.cacheDiff(
              repoId,
              item.data.diffId,
              item.data.diffData,
              item.options
            );
            item.resolve(result);
          } else if (item.operation === 'get') {
            const result = await this.getDiff(repoId, item.data.diffId);
            item.resolve(result);
          }
        } catch (err) {
          item.reject(err);
        }
      }
      
      // 수집된 관계 정보 일괄 업데이트
      this.batchUpdateRelationships(relationshipUpdates);
    }
  }
  
  /**
   * 메타데이터 배치 처리
   */
  private async processBatchMetadata(items: Array<any>): Promise<void> {
    // 저장소별로 그룹화
    const repoGroups = new Map<string, Array<any>>();
    
    for (const item of items) {
      const repoId = item.data.repoId;
      if (!repoGroups.has(repoId)) {
        repoGroups.set(repoId, []);
      }
      repoGroups.get(repoId)!.push(item);
    }
    
    // 저장소별로 처리
    for (const [repoId, repoItems] of repoGroups.entries()) {
      // 관계 캐싱 최적화 - 한 번에 여러 메타데이터 관계 설정
      const relationshipUpdates = new Map<string, Set<string>>();
      
      for (const item of repoItems) {
        try {
          if (item.operation === 'set') {
            // 관계 정보 수집
            const key = `${this.METADATA_PREFIX}${repoId}:${item.data.metaKey}`;
            const sourceKey = `${this.REPO_PREFIX}${repoId}`;
            
            if (!relationshipUpdates.has(sourceKey)) {
              relationshipUpdates.set(sourceKey, new Set());
            }
            relationshipUpdates.get(sourceKey)!.add(key);
            
            // 실제 캐시 설정
            const result = await this.cacheMetadata(
              repoId,
              item.data.metaKey,
              item.data.metaData,
              item.options
            );
            item.resolve(result);
          } else if (item.operation === 'get') {
            const result = await this.getMetadata(repoId, item.data.metaKey);
            item.resolve(result);
          }
        } catch (err) {
          item.reject(err);
        }
      }
      
      // 수집된 관계 정보 일괄 업데이트
      this.batchUpdateRelationships(relationshipUpdates);
    }
  }
  
  /**
   * Git 저장소 정보 캐싱
   */
  public async cacheRepository(repoId: string, repoData: any, options: {
    ttl?: number;
    compress?: boolean;
  } = {}): Promise<boolean> {
    const key = `${this.REPO_PREFIX}${repoId}`;
    const ttl = options.ttl || 7 * 24 * 60 * 60 * 1000; // 기본 7일
    
    return await this.cacheManager.setItem(key, repoData, {
      ttl,
      priority: CacheItemPriority.HIGH,
      compress: options.compress !== false, // 기본 압축 적용
      forceStorage: 'memory' // 저장소는 자주 접근하므로 메모리에 저장
    });
  }
  
  /**
   * Git 저장소 정보 가져오기
   */
  public async getRepository(repoId: string): Promise<any | undefined> {
    const key = `${this.REPO_PREFIX}${repoId}`;
    return await this.cacheManager.getItem(key);
  }
  
  /**
   * Git 브랜치 정보 캐싱
   */
  public async cacheBranch(repoId: string, branchName: string, branchData: any, options: {
    ttl?: number;
    compress?: boolean;
  } = {}): Promise<boolean> {
    const key = `${this.BRANCH_PREFIX}${repoId}:${branchName}`;
    const ttl = options.ttl || 7 * 24 * 60 * 60 * 1000; // 기본 7일
    
    // 저장소와 브랜치 관계 기록
    this.recordRelationship(`${this.REPO_PREFIX}${repoId}`, key);
    
    return await this.cacheManager.setItem(key, branchData, {
      ttl,
      priority: CacheItemPriority.HIGH,
      compress: options.compress !== false
    });
  }
  
  /**
   * Git 브랜치 정보 가져오기
   */
  public async getBranch(repoId: string, branchName: string): Promise<any | undefined> {
    const key = `${this.BRANCH_PREFIX}${repoId}:${branchName}`;
    
    // 저장소 관련 데이터 프리페칭
    setTimeout(() => {
      this.prefetchRelatedData(key);
    }, 0);
    
    return await this.cacheManager.getItem(key);
  }
  
  /**
   * Git 커밋 정보 캐싱
   */
  public async cacheCommit(repoId: string, commitHash: string, commitData: any, options: {
    ttl?: number;
    compress?: boolean;
    branchName?: string;
  } = {}): Promise<boolean> {
    const key = `${this.COMMIT_PREFIX}${repoId}:${commitHash}`;
    const ttl = options.ttl || 30 * 24 * 60 * 60 * 1000; // 기본 30일 (커밋은 오래 보관)
    
    // 브랜치와 커밋 관계 기록 (브랜치 정보가 있는 경우)
    if (options.branchName) {
      const branchKey = `${this.BRANCH_PREFIX}${repoId}:${options.branchName}`;
      this.recordRelationship(branchKey, key);
    }
    
    // 저장소와 커밋 관계 기록
    this.recordRelationship(`${this.REPO_PREFIX}${repoId}`, key);
    
    // 압축 여부 결정 - 커밋 데이터는 일반적으로 작기 때문에 기본적으로 압축하지 않음
    const shouldCompress = options.compress === true;
    
    return await this.cacheManager.setItem(key, commitData, {
      ttl,
      priority: CacheItemPriority.MEDIUM,
      compress: shouldCompress
    });
  }
  
  /**
   * Git 커밋 정보 가져오기
   */
  public async getCommit(repoId: string, commitHash: string): Promise<any | undefined> {
    const key = `${this.COMMIT_PREFIX}${repoId}:${commitHash}`;
    
    // 커밋 관련 파일이나 diff 프리페칭 (비동기)
    setTimeout(() => {
      this.prefetchRelatedData(key);
    }, 0);
    
    return await this.cacheManager.getItem(key);
  }
  
  /**
   * Git 파일 콘텐츠 캐싱
   */
  public async cacheFile(repoId: string, filePath: string, fileContent: string, options: {
    ttl?: number;
    compress?: boolean;
    commitHash?: string;
    branchName?: string;
  } = {}): Promise<boolean> {
    const key = `${this.FILE_PREFIX}${repoId}:${filePath}`;
    const ttl = options.ttl || 14 * 24 * 60 * 60 * 1000; // 기본 14일
    
    // 관계 기록
    if (options.commitHash) {
      const commitKey = `${this.COMMIT_PREFIX}${repoId}:${options.commitHash}`;
      this.recordRelationship(commitKey, key);
    }
    
    if (options.branchName) {
      const branchKey = `${this.BRANCH_PREFIX}${repoId}:${options.branchName}`;
      this.recordRelationship(branchKey, key);
    }
    
    // 파일 크기 확인
    const fileSize = fileContent.length;
    
    // 압축 여부 결정 - 크기가 크면 항상 압축
    const shouldCompress = options.compress !== false || fileSize > 10 * 1024; // 10KB 이상이면 항상 압축
    
    // 저장 위치 결정 - 크기가 크면 파일시스템에 저장, 작으면 AsyncStorage에 저장
    const forceStorage = fileSize > 100 * 1024 ? 'fileSystem' : undefined;
    
    return await this.cacheManager.setItem(key, fileContent, {
      ttl,
      priority: CacheItemPriority.MEDIUM,
      compress: shouldCompress,
      forceStorage
    });
  }
  
  /**
   * Git 파일 콘텐츠 가져오기
   */
  public async getFile(repoId: string, filePath: string): Promise<string | undefined> {
    const key = `${this.FILE_PREFIX}${repoId}:${filePath}`;
    return await this.cacheManager.getItem(key);
  }
  
  /**
   * Git diff 정보 캐싱
   */
  public async cacheDiff(repoId: string, diffId: string, diffData: any, options: {
    ttl?: number;
    compress?: boolean;
    commitHash?: string;
  } = {}): Promise<boolean> {
    const key = `${this.DIFF_PREFIX}${repoId}:${diffId}`;
    const ttl = options.ttl || 14 * 24 * 60 * 60 * 1000; // 기본 14일
    
    // 관계 기록
    if (options.commitHash) {
      const commitKey = `${this.COMMIT_PREFIX}${repoId}:${options.commitHash}`;
      this.recordRelationship(commitKey, key);
    }
    
    // diff 데이터는 일반적으로 큰 편이므로 기본적으로 압축 적용
    const shouldCompress = options.compress !== false;
    
    return await this.cacheManager.setItem(key, diffData, {
      ttl,
      priority: CacheItemPriority.MEDIUM,
      compress: shouldCompress
    });
  }
  
  /**
   * Git diff 정보 가져오기
   */
  public async getDiff(repoId: string, diffId: string): Promise<any | undefined> {
    const key = `${this.DIFF_PREFIX}${repoId}:${diffId}`;
    return await this.cacheManager.getItem(key);
  }
  
  /**
   * Git 메타데이터 캐싱
   */
  public async cacheMetadata(repoId: string, metaKey: string, metaData: any, options: {
    ttl?: number;
    compress?: boolean;
  } = {}): Promise<boolean> {
    const key = `${this.METADATA_PREFIX}${repoId}:${metaKey}`;
    const ttl = options.ttl || 7 * 24 * 60 * 60 * 1000; // 기본 7일
    
    // 메타데이터와 저장소 관계 기록
    this.recordRelationship(`${this.REPO_PREFIX}${repoId}`, key);
    
    return await this.cacheManager.setItem(key, metaData, {
      ttl,
      priority: CacheItemPriority.LOW,
      compress: options.compress !== false
    });
  }
  
  /**
   * Git 메타데이터 가져오기
   */
  public async getMetadata(repoId: string, metaKey: string): Promise<any | undefined> {
    const key = `${this.METADATA_PREFIX}${repoId}:${metaKey}`;
    return await this.cacheManager.getItem(key);
  }
  
  /**
   * 지정된 저장소의 캐시 항목 제거
   */
  public async clearRepositoryCache(repoId: string): Promise<number> {
    try {
      let removedCount = 0;
      
      // 저장소 키
      const repoKey = `${this.REPO_PREFIX}${repoId}`;
      
      // 관련 항목 키 가져오기
      const relatedKeys = this.getRelatedKeys(repoKey);
      
      // 저장소 캐시 제거
      await this.cacheManager.removeItem(repoKey);
      removedCount++;
      
      // 관련 항목 제거
      for (const key of relatedKeys) {
        await this.cacheManager.removeItem(key);
        removedCount++;
        
        // 해당 항목과 관련된 항목도 재귀적으로 제거
        const subRelatedKeys = this.getRelatedKeys(key);
        for (const subKey of subRelatedKeys) {
          await this.cacheManager.removeItem(subKey);
          removedCount++;
        }
      }
      
      return removedCount;
    } catch (error) {
      console.error(`[OptimizedGitCacheManager] 저장소 캐시 제거 오류: ${repoId}`, error);
      return 0;
    }
  }
  
  /**
   * 지정된 브랜치의 캐시 항목 제거
   */
  public async clearBranchCache(repoId: string, branchName: string): Promise<number> {
    try {
      let removedCount = 0;
      
      // 브랜치 키
      const branchKey = `${this.BRANCH_PREFIX}${repoId}:${branchName}`;
      
      // 관련 항목 키 가져오기
      const relatedKeys = this.getRelatedKeys(branchKey);
      
      // 브랜치 캐시 제거
      await this.cacheManager.removeItem(branchKey);
      removedCount++;
      
      // 관련 항목 제거
      for (const key of relatedKeys) {
        await this.cacheManager.removeItem(key);
        removedCount++;
      }
      
      return removedCount;
    } catch (error) {
      console.error(`[OptimizedGitCacheManager] 브랜치 캐시 제거 오류: ${repoId}:${branchName}`, error);
      return 0;
    }
  }
  
  /**
   * 관계 기록
   */
  private recordRelationship(sourceKey: string, targetKey: string): void {
    if (!this.relationshipCache.has(sourceKey)) {
      this.relationshipCache.set(sourceKey, new Set());
    }
    
    this.relationshipCache.get(sourceKey)?.add(targetKey);
  }
  
  /**
   * 관련 키 가져오기
   */
  private getRelatedKeys(sourceKey: string): Set<string> {
    return this.relationshipCache.get(sourceKey) || new Set();
  }
  
  /**
   * 관련 데이터 프리페칭
   */
  private async prefetchRelatedData(sourceKey: string): Promise<void> {
    try {
      const relatedKeys = this.getRelatedKeys(sourceKey);
      
      // 프리페칭 - 동시에 최대 3개만 실행
      const prefetchPromises: Promise<any>[] = [];
      let count = 0;
      
      for (const key of relatedKeys) {
        if (count >= 3) break;
        
        // 커밋 관련 파일이나 diff를 우선 프리페칭
        if (key.startsWith(this.FILE_PREFIX) || key.startsWith(this.DIFF_PREFIX)) {
          prefetchPromises.push(this.cacheManager.getItem(key, { updateAccess: true, prefetch: true }));
          count++;
        }
      }
      
      // 실행
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      console.warn(`[OptimizedGitCacheManager] 프리페칭 오류: ${sourceKey}`, error);
    }
  }
  
  /**
   * 주기적인 최적화 설정
   */
  private setupPeriodicOptimization(): void {
    // 30분마다 캐시 최적화 실행
    setInterval(async () => {
      await this.optimizeCache();
    }, 30 * 60 * 1000);
    
    // 2시간마다 만료된 캐시 정리
    setInterval(async () => {
      await this.cleanExpiredCache();
    }, 2 * 60 * 60 * 1000);
  }
  
  /**
   * 캐시 최적화
   */
  public async optimizeCache(): Promise<{
    memoryItems: number;
    asyncStorageItems: number;
    fileSystemItems: number;
    freedSpace: number;
  }> {
    return await this.cacheManager.optimizeCache();
  }
  
  /**
   * 캐시 통계 가져오기
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
    relationships: number;
  }> {
    // 기본 캐시 통계 가져오기
    const stats = await this.cacheManager.getCacheStats();
    
    // 관계 캐시 통계 추가
    return {
      ...stats,
      relationships: Array.from(this.relationshipCache.values()).reduce(
        (total, set) => total + set.size, 0
      )
    };
  }
  
  /**
   * 모든 Git 캐시 제거
   */
  public async clearAllGitCache(): Promise<void> {
    // 모든 관계 캐시 초기화
    this.relationshipCache.clear();
    
    // 내부 캐시 관리자에게 전체 캐시 정리 요청 (필요한 메서드가 있다고 가정)
    // 이 부분은 구현이 필요할 수 있음
  }
  
  /**
   * 만료된 캐시 정리
   */
  public async cleanExpiredCache(): Promise<number> {
    return await this.cacheManager.cleanExpiredCache();
  }
  
  /**
   * 하나의 커밋에 대한, 관련 파일 및 diff 미리 캐싱
   */
  public async prefetchCommitData(repoId: string, commitHash: string, commitData: any): Promise<boolean> {
    try {
      // 커밋 캐싱
      await this.cacheCommit(repoId, commitHash, commitData);
      
      // 관련 파일 및 diff가 있다면 캐싱
      if (commitData.files && Array.isArray(commitData.files)) {
        // 주요 변경 파일만 프리페칭 (최대 5개)
        const topFiles = commitData.files.slice(0, 5);
        
        for (const file of topFiles) {
          if (file.path && file.content) {
            await this.cacheFile(repoId, file.path, file.content, {
              commitHash,
              compress: true
            });
          }
          
          if (file.diff) {
            const diffId = `${commitHash}:${file.path}`;
            await this.cacheDiff(repoId, diffId, file.diff, {
              commitHash,
              compress: true
            });
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`[OptimizedGitCacheManager] 커밋 데이터 프리페칭 오류: ${repoId}:${commitHash}`, error);
      return false;
    }
  }
  
  /**
   * 저장소에 대한 기본 정보 및 주요 브랜치 미리 캐싱
   */
  public async prefetchRepositoryData(repoId: string, repoData: any): Promise<boolean> {
    try {
      // 저장소 캐싱
      await this.cacheRepository(repoId, repoData);
      
      // 주요 브랜치 캐싱
      if (repoData.branches && Array.isArray(repoData.branches)) {
        const mainBranches = repoData.branches.filter(branch => 
          ['main', 'master', 'develop', 'dev', 'release'].includes(branch.name)
        );
        
        for (const branch of mainBranches) {
          await this.cacheBranch(repoId, branch.name, branch);
          
          // 각 브랜치의 최신 커밋 캐싱 (있는 경우)
          if (branch.latestCommit) {
            await this.cacheCommit(repoId, branch.latestCommit.hash, branch.latestCommit, {
              branchName: branch.name
            });
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`[OptimizedGitCacheManager] 저장소 데이터 프리페칭 오류: ${repoId}`, error);
      return false;
    }
  }
} 