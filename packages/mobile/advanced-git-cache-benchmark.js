/**
 * 고급 Git 캐시 벤치마크
 * 
 * 복잡한 Git 워크로드에서 다양한 캐시 전략의 성능 분석
 * 메모리 제한 환경 최적화 및 핫 패스 감지 알고리즘 벤치마크
 */

// 모듈 가져오기
const { 
  CacheTier, 
  MemoryPolicy,
  EnhancedCacheManager, 
  EnhancedGitCacheAdapter 
} = require('./git-cache-core');

const { 
  createRepositoryStructure, 
  generateWorkload,
  WorkloadType 
} = require('./git-cache-workloads');

// 표준 캐시 (비교 기준)
class StandardCache {
  constructor() {
    this.cache = {};
    this.stats = { hits: 0, misses: 0 };
  }

  async set(key, value) {
    this.cache[key] = value;
    return true;
  }

  async get(key) {
    if (key in this.cache) {
      this.stats.hits++;
      return this.cache[key];
    }
    this.stats.misses++;
    return null;
  }

  async remove(key) {
    delete this.cache[key];
    return true;
  }

  getStats() {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }
}

// 벤치마크 설정
const benchmarkConfig = {
  // 기본 워크로드 설정
  defaultWorkload: {
    type: WorkloadType.MIXED,  // 혼합 워크로드
    duration: 60,              // 60초 워크로드
    intensity: 'medium'        // 중간 강도
  },
  
  // 테스트 데이터 설정
  testData: {
    repoCount: 3,
    branchesPerRepo: 5,
    commitsPerBranch: 30,
    filesPerRepo: 200,
    maxFileSize: 50000,
    gitFilesRatio: 0.3,
    largeFilesRatio: 0.15
  },
  
  // 메모리 정책 테스트 설정
  memoryPolicyTest: {
    policies: [
      MemoryPolicy.AGGRESSIVE,
      MemoryPolicy.BALANCED,
      MemoryPolicy.PERFORMANCE
    ],
    duration: 30,  // 각 정책별 테스트 시간 (초)
    intensity: 'high'
  },
  
  // 워크로드 유형별 테스트 설정
  workloadTypeTest: {
    types: [
      WorkloadType.REPO_BROWSING,
      WorkloadType.BRANCH_SWITCHING,
      WorkloadType.COMMIT_HISTORY,
      WorkloadType.FILE_EDITING,
      WorkloadType.LARGE_FILES,
      WorkloadType.INTENSIVE_GIT
    ],
    duration: 30,  // 각 워크로드 유형별 테스트 시간 (초)
    intensity: 'medium'
  }
};

// 벤치마크 결과 저장 구조
const benchmarkResults = {
  standard: {
    operations: {},
    timing: {},
    memory: {},
    hitRate: {}
  },
  enhanced: {
    operations: {},
    timing: {},
    memory: {},
    hitRate: {},
    hotPaths: {},
    compression: {},
    memoryUsage: {}
  }
};

/**
 * 메모리 사용량 측정 함수
 */
function getMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  return {
    rss: Math.round(memoryUsage.rss / (1024 * 1024)), // MB
    heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)), // MB
    heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)), // MB
    external: Math.round(memoryUsage.external / (1024 * 1024)) // MB
  };
}

/**
 * Git 캐시 벤치마크 실행
 */
async function runBenchmark() {
  console.log("========================================");
  console.log("Git 캐시 고급 벤치마크 시작");
  console.log("========================================\n");
  
  // 테스트 데이터 생성
  console.log("테스트 데이터 생성 중...");
  const testData = createRepositoryStructure(benchmarkConfig.testData);
  console.log(`생성된 데이터: ${testData.repos.length}개 저장소, ${testData.branches.length}개 브랜치, ${testData.commits.length}개 커밋, ${testData.files.length}개 파일\n`);
  
  // 워크로드 유형별 벤치마크
  await runWorkloadTypeBenchmark(testData);
  
  // 메모리 정책별 벤치마크
  await runMemoryPolicyBenchmark(testData);
  
  // 접근 패턴 분석 및 핫 패스 감지 벤치마크
  await runHotPathAnalysisBenchmark(testData);
  
  // 대용량 파일 압축 벤치마크
  await runCompressionBenchmark(testData);
  
  // 최종 벤치마크 결과 출력
  printBenchmarkResults();
  
  console.log("\n========================================");
  console.log("Git 캐시 고급 벤치마크 완료");
  console.log("========================================");
}

/**
 * 워크로드 유형별 벤치마크 실행
 */
async function runWorkloadTypeBenchmark(testData) {
  console.log("\n========================================");
  console.log("워크로드 유형별 벤치마크");
  console.log("========================================");
  
  const { types, duration, intensity } = benchmarkConfig.workloadTypeTest;
  
  for (const workloadType of types) {
    console.log(`\n[${workloadType}] 워크로드 테스트 시작...`);
    
    // 워크로드 생성
    const workload = generateWorkload(testData, {
      type: workloadType,
      duration,
      intensity
    });
    
    console.log(`- 생성된 워크로드: ${workload.operationsCount}개 작업 (${intensity} 강도)`);
    
    // 캐시 인스턴스 생성
    const standardCache = new StandardCache();
    const enhancedAdapter = new EnhancedGitCacheAdapter();
    
    // 벤치마크 실행
    await runWorkloadBenchmark(
      workloadType,
      workload,
      standardCache,
      enhancedAdapter
    );
  }
}

/**
 * 메모리 정책별 벤치마크 실행
 */
async function runMemoryPolicyBenchmark(testData) {
  console.log("\n========================================");
  console.log("메모리 정책별 벤치마크");
  console.log("========================================");
  
  const { policies, duration, intensity } = benchmarkConfig.memoryPolicyTest;
  
  // 집중적인 Git 워크로드 생성 (메모리 사용량이 많은 워크로드)
  const workload = generateWorkload(testData, {
    type: WorkloadType.INTENSIVE_GIT,
    duration,
    intensity
  });
  
  console.log(`- 생성된 워크로드: ${workload.operationsCount}개 작업 (${intensity} 강도)`);
  
  for (const policy of policies) {
    console.log(`\n[${policy}] 메모리 정책 테스트 시작...`);
    
    // 캐시 인스턴스 생성 (정책 설정)
    const enhancedAdapter = new EnhancedGitCacheAdapter({
      memoryPolicy: policy
    });
    
    // 표준 캐시 (비교용)
    const standardCache = new StandardCache();
    
    // 벤치마크 실행
    await runWorkloadBenchmark(
      `memory_policy_${policy}`,
      workload,
      standardCache,
      enhancedAdapter
    );
    
    // 메모리 사용량 기록
    const stats = enhancedAdapter.getPerformanceStats();
    benchmarkResults.enhanced.memoryUsage[policy] = {
      memoryUsage: stats.cache.memoryUsage,
      memoryLimit: stats.cache.memoryLimit,
      utilization: stats.cache.memoryUtilization
    };
  }
}

/**
 * 핫 패스 분석 벤치마크 실행
 */
async function runHotPathAnalysisBenchmark(testData) {
  console.log("\n========================================");
  console.log("핫 패스 분석 및 접근 패턴 벤치마크");
  console.log("========================================");
  
  // 핫 패스 감지를 위한 학습 단계
  console.log("\n[핫 패스 학습 단계]");
  
  // 핫 패스 감지 어댑터 생성
  const enhancedAdapter = new EnhancedGitCacheAdapter({
    hotPathThreshold: 0.03, // 3% 이상 접근 시 핫 패스로 설정
    enableHotPathAnalysis: true,
    hotPathAnalysisInterval: 5000 // 5초마다 분석
  });
  
  // 학습용 워크로드 생성 (패턴 형성)
  const trainingWorkload = generateWorkload(testData, {
    type: WorkloadType.MIXED,
    duration: 30,
    intensity: 'high'
  });
  
  console.log(`- 학습 워크로드: ${trainingWorkload.operationsCount}개 작업`);
  
  // 표준 캐시 (비교용)
  const standardCache = new StandardCache();
  
  // 학습 워크로드 실행
  await executeWorkload(trainingWorkload.operations, standardCache, enhancedAdapter);
  
  // 핫 패스 분석 강제 실행
  const hotPathAnalysisResult = enhancedAdapter.analyzeHotPaths();
  
  // 핫 패스 결과 저장
  benchmarkResults.enhanced.hotPaths['training'] = {
    hotPathsCount: hotPathAnalysisResult.hotPaths.length,
    totalAccesses: hotPathAnalysisResult.totalAccesses,
    hotPaths: hotPathAnalysisResult.hotPaths
  };
  
  console.log(`- 감지된 핫 패스: ${hotPathAnalysisResult.hotPaths.length}개`);
  
  // 학습 후 성능 비교
  console.log("\n[핫 패스 활용 단계]");
  
  // 테스트용 워크로드 생성 (유사한 패턴)
  const testWorkload = generateWorkload(testData, {
    type: WorkloadType.MIXED,
    duration: 20,
    intensity: 'medium'
  });
  
  console.log(`- 테스트 워크로드: ${testWorkload.operationsCount}개 작업`);
  
  // 새 캐시 인스턴스 생성 (핫 패스 없음)
  const standardCacheNew = new StandardCache();
  const enhancedAdapterNoHotPath = new EnhancedGitCacheAdapter({
    enableHotPathAnalysis: false
  });
  
  // 기존 핫 패스 정보 유지 (핫 패스 있음)
  const enhancedAdapterWithHotPath = enhancedAdapter;
  
  // 핫 패스 없는 벤치마크
  console.log("\n- 핫 패스 없이 실행:");
  await runWorkloadBenchmark(
    'no_hot_path',
    testWorkload,
    standardCacheNew,
    enhancedAdapterNoHotPath
  );
  
  // 핫 패스 있는 벤치마크
  console.log("\n- 핫 패스 활용하여 실행:");
  await runWorkloadBenchmark(
    'with_hot_path',
    testWorkload,
    standardCacheNew,
    enhancedAdapterWithHotPath
  );
}

/**
 * 대용량 파일 압축 벤치마크 실행
 */
async function runCompressionBenchmark(testData) {
  console.log("\n========================================");
  console.log("대용량 파일 압축 벤치마크");
  console.log("========================================");
  
  // 대용량 파일 워크로드 생성
  const workload = generateWorkload(testData, {
    type: WorkloadType.LARGE_FILES,
    duration: 30,
    intensity: 'medium'
  });
  
  console.log(`- 생성된 워크로드: ${workload.operationsCount}개 작업`);
  
  // 압축 없는 어댑터
  const noCompressionAdapter = new EnhancedGitCacheAdapter({
    enableCompression: false
  });
  
  // 압축 있는 어댑터
  const withCompressionAdapter = new EnhancedGitCacheAdapter({
    enableCompression: true
  });
  
  // 표준 캐시 (비교용)
  const standardCache = new StandardCache();
  
  // 압축 없는 벤치마크
  console.log("\n- 압축 없이 실행:");
  await runWorkloadBenchmark(
    'no_compression',
    workload,
    standardCache,
    noCompressionAdapter
  );
  
  // 압축 있는 벤치마크
  console.log("\n- 압축 활용하여 실행:");
  await runWorkloadBenchmark(
    'with_compression',
    workload,
    standardCache,
    withCompressionAdapter
  );
  
  // 압축 통계 저장
  const compressionStats = withCompressionAdapter.getPerformanceStats().compression;
  benchmarkResults.enhanced.compression['performance'] = compressionStats;
  
  console.log(`- 압축 성능: ${Math.round(compressionStats.ratio * 100)}% 압축률 (${Math.round(compressionStats.original/1024)}KB → ${Math.round(compressionStats.compressed/1024)}KB)`);
}

/**
 * 워크로드 벤치마크 실행
 */
async function runWorkloadBenchmark(
  scenarioName,
  workload,
  standardCache,
  enhancedAdapter
) {
  // 시작 시간 및 메모리 측정
  const startTime = Date.now();
  const startMemory = getMemoryUsage();
  
  // 워크로드 실행
  await executeWorkload(workload.operations, standardCache, enhancedAdapter);
  
  // 종료 시간 및 메모리 측정
  const endTime = Date.now();
  const endMemory = getMemoryUsage();
  
  // 실행 시간 계산
  const standardDuration = endTime - startTime;
  
  // 캐시 통계 수집
  const standardStats = standardCache.getStats();
  const enhancedStats = enhancedAdapter.getPerformanceStats();
  
  // 메모리 사용량 변화
  const memoryDelta = {
    heapUsed: endMemory.heapUsed - startMemory.heapUsed,
    rss: endMemory.rss - startMemory.rss
  };
  
  // 결과 저장
  benchmarkResults.standard.operations[scenarioName] = workload.operationsCount;
  benchmarkResults.standard.timing[scenarioName] = standardDuration;
  benchmarkResults.standard.memory[scenarioName] = memoryDelta;
  benchmarkResults.standard.hitRate[scenarioName] = standardStats.hitRate;
  
  benchmarkResults.enhanced.operations[scenarioName] = workload.operationsCount;
  benchmarkResults.enhanced.timing[scenarioName] = standardDuration;
  benchmarkResults.enhanced.memory[scenarioName] = memoryDelta;
  benchmarkResults.enhanced.hitRate[scenarioName] = enhancedStats.cache.hitRate;
  
  // 결과 출력
  console.log(`  완료 시간: ${standardDuration}ms`);
  console.log(`  표준 캐시 적중률: ${(standardStats.hitRate * 100).toFixed(2)}%`);
  console.log(`  향상된 캐시 적중률: ${(enhancedStats.cache.hitRate * 100).toFixed(2)}%`);
  console.log(`  메모리 사용량 변화: ${memoryDelta.heapUsed}MB`);
}

/**
 * 워크로드 실행
 */
async function executeWorkload(operations, standardCache, enhancedAdapter) {
  for (const operation of operations) {
    switch (operation.type) {
      case 'get_file':
        // 표준 캐시에서 조회
        await standardCache.get(`file:${operation.repoId}:${operation.path}`);
        
        // 향상된 캐시에서 조회
        await enhancedAdapter.getFileData(operation.repoId, operation.path);
        break;
        
      case 'set_file':
        // 표준 캐시에 저장
        await standardCache.set(`file:${operation.repoId}:${operation.path}`, operation.content);
        
        // 향상된 캐시에 저장
        await enhancedAdapter.cacheFileData(
          operation.repoId, 
          operation.path, 
          operation.content, 
          { 
            compress: operation.compress || false,
            priority: operation.priority || 1
          }
        );
        break;
        
      case 'get_branch':
        // 표준 캐시에서 조회
        await standardCache.get(`branch:${operation.repoId}:${operation.branch}`);
        
        // 향상된 캐시에서 조회
        await enhancedAdapter.getFileData(operation.repoId, `git/refs/heads/${operation.branch}`);
        break;
        
      case 'get_commit':
        // 표준 캐시에서 조회
        await standardCache.get(`commit:${operation.hash}`);
        
        // 향상된 캐시에서 조회
        await enhancedAdapter.getFileData(
          operation.repoId, 
          `git/objects/${operation.hash.substring(0, 2)}/${operation.hash.substring(2)}`
        );
        break;
        
      case 'get_diff':
        // 표준 캐시에서 조회
        await standardCache.get(`diff:${operation.commitHash}`);
        
        // 향상된 캐시에서 조회
        await enhancedAdapter.getFileData(
          operation.repoId, 
          `git/objects/diff/${operation.commitHash}`
        );
        break;
        
      case 'get_repo_info':
        // 표준 캐시에서 조회
        await standardCache.get(`repo:${operation.repoId}`);
        
        // 향상된 캐시에서 조회
        await enhancedAdapter.getFileData(operation.repoId, `git/config`);
        break;
        
      case 'list_directory':
        // 이 작업은 실제로 캐시를 통하지 않음 (메타 작업)
        break;
        
      // Git 작업 시작/종료는 캐시 작업을 하지 않음 (메타 작업)
      case 'git_operation_start':
      case 'git_operation_end':
        break;
        
      default:
        // 알 수 없는 작업 유형
        console.warn(`알 수 없는 작업 유형: ${operation.type}`);
    }
  }
}

/**
 * 벤치마크 결과 출력
 */
function printBenchmarkResults() {
  console.log("\n========================================");
  console.log("벤치마크 결과 요약");
  console.log("========================================");
  
  // 워크로드 유형별 결과
  console.log("\n[워크로드 유형별 캐시 적중률]");
  
  const workloadTypes = benchmarkConfig.workloadTypeTest.types;
  console.log("워크로드 유형".padEnd(20), "표준 캐시".padEnd(15), "향상된 캐시".padEnd(15), "향상도");
  console.log("-".repeat(65));
  
  workloadTypes.forEach(type => {
    const standardHitRate = benchmarkResults.standard.hitRate[type] || 0;
    const enhancedHitRate = benchmarkResults.enhanced.hitRate[type] || 0;
    const improvement = enhancedHitRate / standardHitRate - 1;
    
    console.log(
      type.padEnd(20),
      `${(standardHitRate * 100).toFixed(2)}%`.padEnd(15),
      `${(enhancedHitRate * 100).toFixed(2)}%`.padEnd(15),
      `${(improvement * 100).toFixed(2)}%`
    );
  });
  
  // 메모리 정책별 결과
  console.log("\n[메모리 정책별 성능]");
  
  const memoryPolicies = benchmarkConfig.memoryPolicyTest.policies;
  console.log("메모리 정책".padEnd(15), "메모리 사용량".padEnd(20), "적중률".padEnd(15), "사용률");
  console.log("-".repeat(65));
  
  memoryPolicies.forEach(policy => {
    const memUsageInfo = benchmarkResults.enhanced.memoryUsage[policy] || {};
    const hitRate = benchmarkResults.enhanced.hitRate[`memory_policy_${policy}`] || 0;
    
    console.log(
      policy.padEnd(15),
      `${Math.round(memUsageInfo.memoryUsage / 1024)}KB / ${Math.round(memUsageInfo.memoryLimit / 1024)}KB`.padEnd(20),
      `${(hitRate * 100).toFixed(2)}%`.padEnd(15),
      `${(memUsageInfo.utilization * 100).toFixed(2)}%`
    );
  });
  
  // 핫 패스 분석 결과
  console.log("\n[핫 패스 분석 성능]");
  
  const noHotPathHitRate = benchmarkResults.enhanced.hitRate['no_hot_path'] || 0;
  const withHotPathHitRate = benchmarkResults.enhanced.hitRate['with_hot_path'] || 0;
  const hotPathImprovement = withHotPathHitRate / noHotPathHitRate - 1;
  
  console.log("구분".padEnd(20), "적중률".padEnd(15), "향상도");
  console.log("-".repeat(50));
  console.log(
    "핫 패스 없음".padEnd(20),
    `${(noHotPathHitRate * 100).toFixed(2)}%`.padEnd(15),
    "-"
  );
  console.log(
    "핫 패스 활용".padEnd(20),
    `${(withHotPathHitRate * 100).toFixed(2)}%`.padEnd(15),
    `${(hotPathImprovement * 100).toFixed(2)}%`
  );
  
  // 압축 성능 결과
  console.log("\n[압축 성능]");
  
  const compressionStats = benchmarkResults.enhanced.compression['performance'] || {};
  const noCompHitRate = benchmarkResults.enhanced.hitRate['no_compression'] || 0;
  const withCompHitRate = benchmarkResults.enhanced.hitRate['with_compression'] || 0;
  
  console.log("원본 크기:", `${Math.round(compressionStats.original / 1024)}KB`);
  console.log("압축 크기:", `${Math.round(compressionStats.compressed / 1024)}KB`);
  console.log("압축률:", `${(compressionStats.ratio * 100).toFixed(2)}%`);
  console.log("적중률 차이:", `${((withCompHitRate - noCompHitRate) * 100).toFixed(2)}%`);
}

// 벤치마크 실행
runBenchmark().catch(error => {
  console.error("벤치마크 실행 중 오류 발생:", error);
}); 