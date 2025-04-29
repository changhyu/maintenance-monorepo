import { useState, useEffect, useRef, RefObject, useCallback } from 'react';

/**
 * 브라우저 환경 확인 함수
 */
const isBrowser = typeof window !== 'undefined' && 
                  typeof window.document !== 'undefined' &&
                  typeof window.IntersectionObserver !== 'undefined';

/**
 * IntersectionObserver 옵션 인터페이스
 */
export interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
  /**
   * IntersectionObserver가 지원되지 않을 때의 기본값
   * @default false
   */
  fallbackInView?: boolean;
}

/**
 * IntersectionObserver API를 사용하여 요소의 가시성을 감지하는 훅
 * @param options IntersectionObserver 옵션
 * @returns [ref, isIntersecting, entry] - 요소 참조, 교차 여부, IntersectionObserverEntry
 */
export function useIntersectionObserver<T extends Element = Element>({
  root = null,
  rootMargin = '0px',
  threshold = 0,
  once = false,
  fallbackInView = false,
}: IntersectionObserverOptions = {}) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState<boolean>(fallbackInView);
  const elementRef = useRef<T | null>(null);
  const hasBeenVisible = useRef<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Memoized entry 변경 처리 함수 
  const handleIntersection = useCallback(([newEntry]: IntersectionObserverEntry[]) => {
    // once 옵션이 true이고 이미 한 번 보였다면 더 이상 상태 업데이트 불필요
    if (once && hasBeenVisible.current && !newEntry.isIntersecting) {
      return;
    }

    setEntry(newEntry);
    setIsIntersecting(newEntry.isIntersecting);

    // 요소가 보이게 되면 hasBeenVisible 플래그를 true로 설정
    if (newEntry.isIntersecting) {
      hasBeenVisible.current = true;
      
      // once 옵션이 활성화되어 있고 요소가 보이게 되면 관찰 중지
      if (once && elementRef.current && observerRef.current) {
        observerRef.current.unobserve(elementRef.current);
      }
    }
  }, [once]);

  // observer 인스턴스 생성 및 구독 설정
  const initObserver = useCallback(() => {
    if (!isBrowser) return;
    
    const element = elementRef.current;
    if (!element) return;
    
    // 기존 observer가 있으면 정리
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    try {
      observerRef.current = new IntersectionObserver(
        handleIntersection,
        { root, rootMargin, threshold }
      );
      
      observerRef.current.observe(element);
    } catch (error) {
      console.error('Error creating IntersectionObserver:', error);
      // 오류 발생 시 폴백으로 항상 보이는 것으로 처리
      setIsIntersecting(fallbackInView);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [root, rootMargin, threshold, handleIntersection, fallbackInView]);

  useEffect(() => {
    // IntersectionObserver 지원 여부 확인
    if (!isBrowser) {
      setIsIntersecting(fallbackInView);
      return;
    }
    
    return initObserver();
  }, [initObserver, fallbackInView]);

  return [elementRef, isIntersecting, entry] as const;
}

/**
 * 지정된 요소가 화면에 보일 때 콜백 함수를 실행하는 훅
 * @param callback 교차시 실행할 콜백 함수
 * @param options IntersectionObserver 옵션
 * @returns ref - 관찰할 요소에 연결할 참조
 */
export function useInView<T extends Element = Element>(
  callback: (isIntersecting: boolean, entry: IntersectionObserverEntry | null) => void,
  options: IntersectionObserverOptions = {}
): RefObject<T> {
  const [ref, isIntersecting, entry] = useIntersectionObserver<T>(options);
  
  // 콜백 메모이제이션
  const memoizedCallback = useCallback(
    (isInView: boolean, callbackEntry: IntersectionObserverEntry | null) => {
      callback(isInView, callbackEntry);
    },
    [callback]
  );

  useEffect(() => {
    memoizedCallback(isIntersecting, entry);
  }, [isIntersecting, entry, memoizedCallback]);

  return ref;
}

/**
 * 무한 스크롤 구현을 위한 훅
 * @param callback 다음 페이지를 로드할 때 호출될 함수
 * @param options IntersectionObserver 옵션 및 추가 설정
 * @returns [ref, isLoading] - 관찰할 요소에 연결할 참조, 로딩 상태
 */
export function useInfiniteScroll<T extends Element = Element>(
  callback: () => Promise<void> | void,
  {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    enabled = true,
    fallbackInView = false,
  }: IntersectionObserverOptions & { enabled?: boolean } = {}
) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const callbackRef = useRef(callback);
  
  // 콜백 업데이트
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // 무한 스크롤 콜백 메모이제이션
  const handleInfiniteScroll = useCallback(async (isIntersecting: boolean) => {
    if (isIntersecting && enabled && !isLoading) {
      try {
        setIsLoading(true);
        await callbackRef.current();
      } catch (error) {
        console.error('Error in infinite scroll callback:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [enabled, isLoading]);

  const observer = useInView<T>(
    handleInfiniteScroll,
    { root, rootMargin, threshold, fallbackInView }
  );

  return [observer, isLoading] as const;
}

/**
 * IntersectionObserver 폴리필 로드 함수
 * 필요한 경우 이 함수를 사용하여 폴리필을 수동으로 로드할 수 있습니다.
 */
export const loadIntersectionObserverPolyfill = async (): Promise<void> => {
  if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
    try {
      await import('intersection-observer');
      console.log('IntersectionObserver polyfill loaded');
    } catch (error) {
      console.error('Failed to load IntersectionObserver polyfill:', error);
    }
  }
};

// 자동으로 폴리필 로드를 시도할 수 있는 즉시 실행 함수
// 참고: 이 코드는 클라이언트 사이드에서만 실행됩니다
if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
  if (!('IntersectionObserver' in window)) {
    console.warn('IntersectionObserver is not supported in this browser. Loading polyfill...');
    import('intersection-observer').catch(err => {
      console.error('Failed to load IntersectionObserver polyfill:', err);
    });
  }
} 