import { CacheStrategyIntegrator } from './CacheStrategyIntegrator';
import { OptimizationStrategy, CacheItemPriority } from './EnhancedCacheOptimizer';

/**
 * Git 데이터 캐싱 최적화 클래스
 * 
 * Git 데이터에 특화된 캐싱 전략을 사용하여 저장소, 브랜치, 커밋 등의 데이터를 효율적으로 캐싱합니다.
 */
export class GitCacheOptimizer {
  private cacheIntegrator: CacheStrategyIntegrator;
  private readonly GIT_CACHE_PREFIX = 'git:';
  private readonly REPO_PREFIX = 'repo:';
  private readonly BRANCH_PREFIX = 'branch:';
  private readonly COMMIT_PREFIX = 'commit:';
  private readonly FILE_PREFIX = 'file:';
  private readonly DIFF_PREFIX = 'diff:';
  private readonly METADATA_PREFIX = 'meta:';
  
  constructor(options: {
    maxSize?: number;
    maxCount?: number;
    strategy?: OptimizationStrategy;
  } = {}) {
    // 기본값 설정
    const defaultOptions = {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxCount: 2000,
      strategy: OptimizationStrategy.SLRU,
      reductionTarget: 0.3,
      protectedRatio: 0.8
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 캐시 통합 관리자 생성
    this.cacheIntegrator = new CacheStrategyIntegrator(mergedOptions);
  }
  
  /**
   * Git 저장소 정보 캐싱
   */
  public async cacheRepository(repoId: string, repoData: any): Promise<boolean> {
    return this.cacheIntegrator.cacheData(
      `${this.GIT_CACHE_PREFIX}${this.REPO_PREFIX}${repoId}`,
      repoData,
      {
        ttl: 30 * 24 * 60 * 60 * 1000, // 30일
        priority: CacheItemPriority.HIGH,
        dataType: 'git_repository'
      }
    );
  }
  
  /**
   * Git 저장소 정보 가져오기
   */
  public async getRepository<T>(repoId: string): Promise<T | null> {
    return this.cacheIntegrator.getData<T>(
      `${this.GIT_CACHE_PREFIX}${this.REPO_PREFIX}${repoId}`
    );
  }
  
  /**
   * Git 브랜치 정보 캐싱
   */
  public async cacheBranch(repoId: string, branchName: string, branchData: any): Promise<boolean> {
    return this.cacheIntegrator.cacheData(
      `${this.GIT_CACHE_PREFIX}${this.BRANCH_PREFIX}${repoId}:${branchName}`,
      branchData,
      {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7일
        priority: CacheItemPriority.MEDIUM,
        dataType: 'git_branch'
      }
    );
  }
  
  /**
   * Git 브랜치 정보 가져오기
   */
  public async getBranch<T>(repoId: string, branchName: string): Promise<T | null> {
    return this.cacheIntegrator.getData<T>(
      `${this.GIT_CACHE_PREFIX}${this.BRANCH_PREFIX}${repoId}:${branchName}`
    );
  }
  
  /**
   * Git 커밋 정보 캐싱
   */
  public async cacheCommit(repoId: string, commitHash: string, commitData: any): Promise<boolean> {
    // 커밋은 불변이므로 TTL을 길게 설정
    return this.cacheIntegrator.cacheData(
      `${this.GIT_CACHE_PREFIX}${this.COMMIT_PREFIX}${repoId}:${commitHash}`,
      commitData,
      {
        ttl: 60 * 24 * 60 * 60 * 1000, // 60일
        priority: CacheItemPriority.MEDIUM,
        dataType: 'git_commit'
      }
    );
  }
  
  /**
   * Git 커밋 정보 가져오기
   */
  public async getCommit<T>(repoId: string, commitHash: string): Promise<T | null> {
    return this.cacheIntegrator.getData<T>(
      `${this.GIT_CACHE_PREFIX}${this.COMMIT_PREFIX}${repoId}:${commitHash}`
    );
  }
  
  /**
   * Git 파일 내용 캐싱
   */
  public async cacheFile(repoId: string, filePath: string, commitHash: string, fileContent: string): Promise<boolean> {
    return this.cacheIntegrator.cacheData(
      `${this.GIT_CACHE_PREFIX}${this.FILE_PREFIX}${repoId}:${commitHash}:${filePath}`,
      fileContent,
      {
        ttl: 14 * 24 * 60 * 60 * 1000, // 14일
        priority: CacheItemPriority.MEDIUM,
        dataType: 'git_file'
      }
    );
  }
  
  /**
   * Git 파일 내용 가져오기
   */
  public async getFile<T>(repoId: string, filePath: string, commitHash: string): Promise<T | null> {
    return this.cacheIntegrator.getData<T>(
      `${this.GIT_CACHE_PREFIX}${this.FILE_PREFIX}${repoId}:${commitHash}:${filePath}`
    );
  }
  
  /**
   * Git 차이점(diff) 캐싱
   */
  public async cacheDiff(repoId: string, fromCommit: string, toCommit: string, diffData: any): Promise<boolean> {
    return this.cacheIntegrator.cacheData(
      `${this.GIT_CACHE_PREFIX}${this.DIFF_PREFIX}${repoId}:${fromCommit}:${toCommit}`,
      diffData,
      {
        ttl: 14 * 24 * 60 * 60 * 1000, // 14일
        priority: CacheItemPriority.LOW,
        dataType: 'git_diff'
      }
    );
  }
  
  /**
   * Git 차이점(diff) 가져오기
   */
  public async getDiff<T>(repoId: string, fromCommit: string, toCommit: string): Promise<T | null> {
    return this.cacheIntegrator.getData<T>(
      `${this.GIT_CACHE_PREFIX}${this.DIFF_PREFIX}${repoId}:${fromCommit}:${toCommit}`
    );
  }
  
  /**
   * Git 메타데이터 캐싱 (예: 라벨, 태그, 권한 등)
   */
  public async cacheMetadata(repoId: string, metaType: string, metaData: any): Promise<boolean> {
    return this.cacheIntegrator.cacheData(
      `${this.GIT_CACHE_PREFIX}${this.METADATA_PREFIX}${repoId}:${metaType}`,
      metaData,
      {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7일
        priority: CacheItemPriority.LOW,
        dataType: 'git_metadata'
      }
    );
  }
  
  /**
   * Git 메타데이터 가져오기
   */
  public async getMetadata<T>(repoId: string, metaType: string): Promise<T | null> {
    return this.cacheIntegrator.getData<T>(
      `${this.GIT_CACHE_PREFIX}${this.METADATA_PREFIX}${repoId}:${metaType}`
    );
  }
  
  /**
   * 특정 저장소 관련 모든 캐시 항목 제거
   */
  public async clearRepositoryCache(repoId: string): Promise<number> {
    return this.cacheIntegrator.clearCache(`${this.GIT_CACHE_PREFIX}${repoId}`);
  }
  
  /**
   * 특정 브랜치 관련 모든 캐시 항목 제거
   */
  public async clearBranchCache(repoId: string, branchName: string): Promise<number> {
    return this.cacheIntegrator.clearCache(`${this.GIT_CACHE_PREFIX}${this.BRANCH_PREFIX}${repoId}:${branchName}`);
  }
  
  /**
   * Git 캐시 최적화 수행
   */
  public async optimizeCache(): Promise<{
    totalItems: number;
    removedCount: number;
    freedSpace: number;
    hitRate: number;
  }> {
    const result = await this.cacheIntegrator.optimizeCache();
    
    return {
      totalItems: result.totalItems,
      removedCount: result.removedCount,
      freedSpace: result.freedSpace,
      hitRate: result.hitRate
    };
  }
  
  /**
   * Git 캐시 통계 얻기
   */
  public getCacheStats() {
    return this.cacheIntegrator.getCacheStats();
  }
  
  /**
   * 전체 Git 캐시 정리
   */
  public async clearAllGitCache(): Promise<number> {
    return this.cacheIntegrator.clearCache(this.GIT_CACHE_PREFIX);
  }
  
  /**
   * 만료된 Git 캐시 항목 정리
   */
  public async cleanExpiredCache(): Promise<number> {
    return this.cacheIntegrator.cleanExpiredCache();
  }
} 