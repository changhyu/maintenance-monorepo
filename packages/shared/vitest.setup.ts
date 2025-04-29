import { vi } from 'vitest';
import '@testing-library/react';

// IntersectionObserver 모킹 설정
class MockIntersectionObserver {
  readonly root: Element | Document | null;
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

// 전역 객체 설정
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

// React Testing Library가 필요한 DOM 환경 설정
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// 콘솔 오류 무시 설정
const originalConsoleError = console.error;
console.error = (...args) => {
  // React 내부 오류 필터링
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
    return;
  }
  
  // 특정 React Testing Library 경고 무시
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning: An update to')) {
    return;
  }
  
  originalConsoleError(...args);
};