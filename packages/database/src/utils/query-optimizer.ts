/**
 * 데이터베이스 쿼리 최적화 유틸리티
 * 
 * N+1 문제 해결과 배치 처리를 위한 유틸리티 함수들을 제공합니다.
 */
import { PrismaClient } from '@prisma/client';
import { prisma } from '../index';

export interface BatchOptions {
  /**
   * 배치 크기 (기본값: 100)
   */
  batchSize?: number;
  
  /**
   * 병렬 처리 여부 (기본값: false)
   */
  parallel?: boolean;
  
  /**
   * 최대 동시 실행 배치 수 (병렬 처리 시)
   */
  maxConcurrency?: number;
  
  /**
   * 진행 상황 콜백
   */
  onProgress?: (processed: number, total: number) => void;
}

/**
 * 쿼리 최적화 클래스
 */
export class QueryOptimizer {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}
  
  /**
   * 대규모 데이터 배치 처리
   * 
   * 큰 데이터셋을 작은 배치로 나누어 처리하여 메모리 부하를 줄이고
   * 데이터베이스 쿼리 성능을 최적화합니다.
   * 
   * @param items 처리할 항목 배열
   * @param processor 각 배치를 처리하는 함수
   * @param options 배치 처리 옵션
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    options: BatchOptions = {}
  ): Promise<R[]> {
    const {
      batchSize = 100,
      parallel = false,
      maxConcurrency = 3,
      onProgress
    } = options;
    
    const totalItems = items.length;
    const batches: T[][] = [];
    
    // 배치로 나누기
    for (let i = 0; i < totalItems; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    let processed = 0;
    let results: R[] = [];
    
    if (parallel) {
      // 병렬 처리 (동시성 제한)
      const batchesCount = batches.length;
      for (let i = 0; i < batchesCount; i += maxConcurrency) {
        const batchPromises = batches.slice(i, i + maxConcurrency)
          .map(async (batch) => {
            const batchResults = await processor(batch);
            processed += batch.length;
            onProgress?.(processed, totalItems);
            return batchResults;
          });
        
        const batchResults = await Promise.all(batchPromises);
        results = results.concat(batchResults.flat());
      }
    } else {
      // 순차 처리
      for (const batch of batches) {
        const batchResults = await processor(batch);
        processed += batch.length;
        onProgress?.(processed, totalItems);
        results = results.concat(batchResults);
      }
    }
    
    return results;
  }
  
  /**
   * 관계 데이터 일괄 로드 (N+1 문제 해결)
   * 
   * 여러 항목에 대한 관련 데이터를 한 번의 쿼리로 로드하여
   * N+1 문제를 해결합니다.
   * 
   * @param items 대상 항목들
   * @param idExtractor 각 항목에서 ID를 추출하는 함수
   * @param relationLoader 관련 데이터를 일괄 로드하는 함수
   * @param relationSetter 각 항목에 관련 데이터 설정하는 함수
   */
  async loadRelations<T, ID, R>(
    items: T[],
    idExtractor: (item: T) => ID,
    relationLoader: (ids: ID[]) => Promise<Map<ID, R>>,
    relationSetter: (item: T, relation: R | undefined) => void
  ): Promise<T[]> {
    if (items.length === 0) return items;
    
    // 모든 ID 수집
    const ids = items.map(idExtractor);
    
    // 관계 데이터 일괄 로드
    const relationsMap = await relationLoader(ids);
    
    // 각 항목에 관계 설정
    for (const item of items) {
      const id = idExtractor(item);
      const relation = relationsMap.get(id);
      relationSetter(item, relation);
    }
    
    return items;
  }
  
  /**
   * 중첩 관계 구조 최적화 로딩 (심화 N+1 문제 해결)
   * 
   * 여러 레벨의 중첩된 관계를 최적화된 방식으로 로드합니다.
   * 
   * @param queryCallback 초기 데이터 로드 콜백
   * @param relationLoaders 관계 로더 설정 객체 배열
   */
  async loadNestedRelations<T>(
    queryCallback: () => Promise<T[]>,
    relationLoaders: Array<{
      idExtractor: (item: any) => any;
      relationLoader: (ids: any[]) => Promise<Map<any, any>>;
      relationSetter: (item: any, relation: any) => void;
      childrenExtractor?: (item: any) => any[];
      childRelationLoaders?: Array<any>;
    }>
  ): Promise<T[]> {
    // 기본 데이터 로드
    const items = await queryCallback();
    
    // 각 관계 로더 실행
    for (const loader of relationLoaders) {
      await this.processRelationLoader(items, loader);
    }
    
    return items;
  }
  
  /**
   * 재귀적으로 관계 로더 처리 (내부 메서드)
   */
  private async processRelationLoader(items: any[], loader: any): Promise<void> {
    if (items.length === 0) return;
    
    const {
      idExtractor,
      relationLoader,
      relationSetter,
      childrenExtractor,
      childRelationLoaders
    } = loader;
    
    // 현재 레벨 관계 로드
    await this.loadRelations(
      items,
      idExtractor,
      relationLoader,
      relationSetter
    );
    
    // 하위 관계가 있는 경우 재귀 처리
    if (childrenExtractor && childRelationLoaders?.length) {
      const allChildren = items.flatMap(item => {
        const children = childrenExtractor(item);
        return Array.isArray(children) ? children : [];
      });
      
      // 각 하위 관계 로더 처리
      for (const childLoader of childRelationLoaders) {
        await this.processRelationLoader(allChildren, childLoader);
      }
    }
  }
  
  /**
   * 쿼리 실행을 위한 트랜잭션 최적화
   * 
   * 여러 쿼리를 하나의 트랜잭션으로 묶어 데이터베이스 왕복을 줄입니다.
   * 
   * @param queryCallback 트랜잭션 내에서 실행할 쿼리 콜백
   */
  async transaction<T>(
    queryCallback: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.prismaClient.$transaction(async (tx) => {
      return queryCallback(tx as unknown as PrismaClient);
    });
  }
}

// 싱글톤 인스턴스 생성
export const queryOptimizer = new QueryOptimizer();