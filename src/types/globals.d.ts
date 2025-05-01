// 전역 함수 타입 선언
interface Window {
  ResizeObserver: any;
  MutationObserver: any;
}

// Vitest에서 모킹한 IntersectionObserver를 위한 타입 확장
interface IntersectionObserverMock {
  elements: Set<Element>;
  callback: IntersectionObserverCallback;
  observe: (element: Element) => void;
  unobserve: (element: Element) => void;
  disconnect: () => void;
}

declare global {
  // createMockEntry 헬퍼 함수에 대한 타입 선언
  function createMockEntry(
    isIntersecting: boolean, 
    target: Element
  ): IntersectionObserverEntry;
  
  // Vitest에서 모킹한 IntersectionObserver 생성자의 타입 재정의
  var IntersectionObserver: {
    new (
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit
    ): IntersectionObserverMock;
    prototype: IntersectionObserverMock;
  };
} 