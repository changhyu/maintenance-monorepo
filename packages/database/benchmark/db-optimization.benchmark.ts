/**
 * 데이터베이스 최적화 성능 벤치마크
 * 
 * 이 스크립트는 기존 방식과 최적화된 리포지토리 패턴의 성능을 비교합니다.
 */
import { PrismaClient, VehicleStatus } from '../src/generated/client';
import { performance } from 'perf_hooks';

// 데이터베이스 연결 설정
process.env.DATABASE_URL = "postgresql://gongchanghyeon@localhost:5432/maintenance";

// Prisma 클라이언트 직접 초기화 - 쿼리 로그 비활성화
const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal',
});

// 성능 측정 유틸리티 함수
async function measurePerformance<T>(
  fn: () => Promise<T>,
  iterations = 5
): Promise<{ result: T, metrics: { avg: number; min: number; max: number; total: number } }> {
  const times: number[] = [];
  let result: T;
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const total = times.reduce((sum, time) => sum + time, 0);
  
  return {
    result: result!,
    metrics: {
      avg: total / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      total
    }
  };
}

// 결과 저장 함수
function saveResults(testName: string, optimizedMetrics: any, legacyMetrics: any): void {
  const improvement = (legacyMetrics.avg - optimizedMetrics.avg) / legacyMetrics.avg * 100;
  
  console.log(`\n--- ${testName} ---`);
  console.log(`최적화 전: ${legacyMetrics.avg.toFixed(2)}ms (최소: ${legacyMetrics.min.toFixed(2)}ms, 최대: ${legacyMetrics.max.toFixed(2)}ms)`);
  console.log(`최적화 후: ${optimizedMetrics.avg.toFixed(2)}ms (최소: ${optimizedMetrics.min.toFixed(2)}ms, 최대: ${optimizedMetrics.max.toFixed(2)}ms)`);
  console.log(`성능 향상: ${improvement.toFixed(2)}%`);
}

/**
 * N+1 문제 해결 벤치마크: 차량과 관련 데이터 조회
 */
async function benchmarkVehicleRelations(vehicleId: string) {
  console.log('\n=== 차량 및 관련 데이터 조회 성능 테스트 ===');
  
  // 테스트 설정
  const iterations = 10;
  
  // 1. 최적화된 리포지토리 방식 (단일 쿼리로 관계 데이터 로드)
  const optimizedResult = await measurePerformance(async () => {
    return await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        owner: true
      }
    });
  }, iterations);
  
  // 2. 최적화되지 않은 방식 (각 관계를 개별적으로 쿼리)
  const legacyResult = await measurePerformance(async () => {
    // 기본 차량 정보 조회
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    
    if (!vehicle) {
      return null;
    }
    
    // 각 관계를 별도로 쿼리
    const owner = vehicle.ownerID 
      ? await prisma.user.findUnique({ 
          where: { id: vehicle.ownerID }
        }) 
      : null;
    
    // 수동으로 관계 데이터 구성
    return {
      ...vehicle,
      owner
    };
  }, iterations);
  
  // 결과 저장
  saveResults('차량 및 관련 데이터 조회', optimizedResult.metrics, legacyResult.metrics);
}

/**
 * 필터링 및 정렬 최적화 벤치마크
 */
async function benchmarkFilteredSearch() {
  console.log('\n=== 필터링 및 정렬 성능 테스트 ===');
  
  const iterations = 5;
  
  // 테스트 필터
  const filter = {
    make: '현대',
    sortBy: 'createdAt',
    sortDirection: 'desc',
    skip: 0,
    take: 20
  };
  
  // 1. 최적화된 리포지토리 방식 (단일 트랜잭션)
  const optimizedResult = await measurePerformance(async () => {
    // 단일 트랜잭션에서 쿼리 실행
    const [vehicles, total] = await prisma.$transaction([
      prisma.vehicle.findMany({
        where: {
          make: filter.make
        },
        orderBy: {
          [filter.sortBy]: filter.sortDirection
        },
        skip: filter.skip,
        take: filter.take
      }),
      prisma.vehicle.count({
        where: {
          make: filter.make
        }
      })
    ]);
    
    return { data: vehicles, total };
  }, iterations);
  
  // 2. 최적화되지 않은 방식 (별도 쿼리 실행)
  const legacyResult = await measurePerformance(async () => {
    // WHERE 절 구성
    const where = {
      make: filter.make
    };
    
    // 쿼리 및 카운트 별도 실행
    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: {
        [filter.sortBy]: filter.sortDirection
      },
      skip: filter.skip,
      take: filter.take
    });
    
    const total = await prisma.vehicle.count({ where });
    
    return { data: vehicles, total };
  }, iterations);
  
  // 결과 저장
  saveResults('필터링 및 정렬', optimizedResult.metrics, legacyResult.metrics);
}

/**
 * 데이터베이스 연결 및 테스트 차량 ID 확인
 */
async function setupTest(): Promise<string[] | null> {
  console.log('데이터베이스 연결 테스트 중...');
  
  try {
    await prisma.$connect();
    console.log('데이터베이스 연결 성공!');
    
    // 차량 데이터 확인
    const vehicles = await prisma.vehicle.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (vehicles.length === 0) {
      console.log('테스트에 사용할 차량 데이터가 없습니다.');
      return null;
    }
    
    console.log(`총 ${vehicles.length}개의 차량 데이터를 찾았습니다.`);
    vehicles.forEach((v, idx) => {
      console.log(`${idx + 1}. ${v.make} ${v.model} (ID: ${v.id})`);
    });
    
    // 테스트에 사용할 차량 ID 배열 반환
    return vehicles.map(v => v.id);
  } catch (error) {
    console.error('데이터베이스 연결 또는 쿼리 실행 실패:', error);
    return null;
  }
}

/**
 * 벤치마크 실행
 */
async function runBenchmarks() {
  console.log('======================================');
  console.log('데이터베이스 최적화 성능 벤치마크 시작');
  console.log('======================================');
  
  try {
    // 테스트 데이터 준비
    const vehicleIds = await setupTest();
    
    if (!vehicleIds || vehicleIds.length === 0) {
      console.error('테스트 데이터가 없어 벤치마크를 수행할 수 없습니다.');
      return;
    }
    
    // 대표 차량 ID 선택
    const testVehicleId = vehicleIds[0];
    
    // 벤치마크 수행 - 복잡한 타입 이슈가 있는 상태 업데이트 벤치마크는 제외
    await benchmarkVehicleRelations(testVehicleId);
    await benchmarkFilteredSearch();
    
    console.log('\n======================================');
    console.log('벤치마크 완료');
    console.log('======================================');
  } catch (error) {
    console.error('벤치마크 실행 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
    console.log('데이터베이스 연결 종료');
  }
}

// 벤치마크 실행
if (require.main === module) {
  runBenchmarks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('치명적 오류:', error);
      process.exit(1);
    });
}