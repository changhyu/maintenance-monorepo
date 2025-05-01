/**
 * 동시성 제어 유틸리티
 * 
 * 이 모듈은 캐시 작업과 네트워크 요청의 동시성을 관리하기 위한
 * 유틸리티 함수들을 제공합니다.
 */

interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

/**
 * Promise와 resolve, reject 함수를 포함하는 Deferred 객체 생성
 * @returns Deferred 객체
 */
export function createDeferred<T>(): DeferredPromise<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
}

/**
 * 작업 큐 인터페이스
 */
export interface TaskQueue<T> {
  enqueue: (task: () => Promise<T>, priority?: number) => Promise<T>;
  size: () => number;
  clear: () => void;
}

/**
 * 우선순위 기반 작업 큐 생성
 * @param concurrency 동시 실행 가능한 작업 수
 * @returns 작업 큐 객체
 */
export function createPriorityTaskQueue<T>(concurrency = 1): TaskQueue<T> {
  type QueueItem = {
    task: () => Promise<T>;
    priority: number;
    deferred: DeferredPromise<T>;
  };
  
  const queue: QueueItem[] = [];
  let activeCount = 0;
  
  // 큐에서 다음 작업 실행
  const runNextTask = () => {
    if (activeCount >= concurrency || queue.length === 0) {
      return;
    }
    
    // 우선순위 기준으로 정렬
    queue.sort((a, b) => b.priority - a.priority);
    
    const item = queue.shift();
    if (!item) return;
    
    activeCount++;
    
    item.task()
      .then(result => {
        item.deferred.resolve(result);
      })
      .catch(error => {
        item.deferred.reject(error);
      })
      .finally(() => {
        activeCount--;
        runNextTask();
      });
  };
  
  return {
    enqueue: (task, priority = 0) => {
      const deferred = createDeferred<T>();
      
      queue.push({
        task,
        priority,
        deferred
      });
      
      runNextTask();
      
      return deferred.promise;
    },
    size: () => queue.length,
    clear: () => {
      const error = new Error('작업이 취소되었습니다');
      queue.forEach(item => item.deferred.reject(error));
      queue.length = 0;
    }
  };
}

/**
 * 작업 실행을 제한하는 스로틀 함수
 * @param fn 스로틀할 함수
 * @param limit 최대 동시 실행 수
 * @returns 스로틀된 함수
 */
export function throttleConcurrency<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  limit: number
): (...args: Args) => Promise<T> {
  const queue = createPriorityTaskQueue<T>(limit);
  
  return (...args: Args) => {
    return queue.enqueue(() => fn(...args));
  };
}

/**
 * 상호 배타적 잠금 관리자
 */
export class MutexManager {
  private locks: Map<string, Promise<void>> = new Map();
  
  /**
   * 잠금 획득 및 작업 실행
   * @param key 잠금 식별자
   * @param fn 잠금을 획득한 상태에서 실행할 함수
   * @returns 함수 실행 결과
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let release: (() => void) | undefined;
    
    // 새 잠금 생성 또는 기존 잠금 대기
    const newLock = new Promise<void>(resolve => {
      release = resolve;
    });
    
    const prevLock = this.locks.get(key) || Promise.resolve();
    this.locks.set(key, newLock);
    
    // 이전 잠금이 해제될 때까지 대기
    await prevLock;
    
    try {
      // 잠금을 획득한 상태에서 함수 실행
      return await fn();
    } finally {
      // 반드시 잠금 해제
      if (release) release();
    }
  }
  
  /**
   * 모든 잠금 해제
   */
  clearAllLocks(): void {
    this.locks.clear();
  }
}

/**
 * 지정된 시간 동안 실행을 지연시키는 함수
 * @param ms 지연 시간(밀리초)
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 작업 실행을 일정 시간 간격으로 제한하는 함수
 * @param fn 제한할 함수
 * @param ms 최소 실행 간격(밀리초)
 * @returns 제한된 함수
 */
export function debounce<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T> | T,
  ms: number
): (...args: Args) => Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return async (...args: Args): Promise<T> => {
    const deferred = createDeferred<T>();
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(async () => {
      try {
        const result = await fn(...args);
        deferred.resolve(result);
      } catch (error) {
        deferred.reject(error);
      }
      timeoutId = null;
    }, ms);
    
    return deferred.promise;
  };
} 