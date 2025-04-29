import { vi } from 'vitest';
import '@testing-library/react';

// DOM 환경 설정 - jsdom 사용 시에도 동작하도록 설정
// @ts-ignore - window.document가 존재하지 않을 경우를 대비
if (typeof window === 'undefined') {
  // JSDOM이 시작되기 전에 실행되는 경우
  global.window = {} as any;
  global.document = {} as any;
}

// IntersectionObserver 모킹 설정
class MockIntersectionObserver {
  readonly root: Element | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  
  callback: IntersectionObserverCallback;
  elements: Set<Element>;
  
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';
    this.thresholds = Array.isArray(options?.threshold) 
      ? options.threshold 
      : [options?.threshold ?? 0];
    
    this.elements = new Set();
  }
  
  observe(element: Element): void {
    this.elements.add(element);
  }
  
  unobserve(element: Element): void {
    this.elements.delete(element);
  }
  
  disconnect(): void {
    this.elements.clear();
  }
}

// IntersectionObserver 모킹
// @ts-ignore - DOM 타입 문제 방지
global.IntersectionObserver = MockIntersectionObserver;

// createMockEntry 헬퍼 함수 전역으로 등록
// @ts-ignore - global에 함수 추가
global.createMockEntry = (isIntersecting: boolean, target: Element) => ({
  isIntersecting,
  target,
  boundingClientRect: {} as DOMRectReadOnly,
  intersectionRatio: isIntersecting ? 1 : 0,
  intersectionRect: {} as DOMRectReadOnly,
  rootBounds: null,
  time: Date.now()
});

// 다른 DOM API 모킹
if (typeof window !== 'undefined') {
  // @ts-ignore - window.ResizeObserver 설정
  window.ResizeObserver = window.ResizeObserver || 
    vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

  // MutationObserver 모킹
  // @ts-ignore - window.MutationObserver 설정
  window.MutationObserver = window.MutationObserver || 
    vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
    }));
}

// 콘솔 오류 무시 설정
const originalConsoleError = console.error;
console.error = (...args) => {
  // 테스트 환경에서 발생하는 일반적인 경고 무시
  const ignoredWarnings = [
    'Warning: ReactDOM.render',
    'Warning: An update to',
    'Warning: Can\'t perform a React state update',
    'Warning: Maximum update depth exceeded',
    'Error: Not implemented: navigation',
    'Error: Not implemented: window.scrollTo',
    'document is not defined',
    'window is not defined'
  ];
  
  if (args[0] && typeof args[0] === 'string') {
    for (const warning of ignoredWarnings) {
      if (args[0].includes(warning)) {
        return;
      }
    }
  }
  
  originalConsoleError(...args);
}; 