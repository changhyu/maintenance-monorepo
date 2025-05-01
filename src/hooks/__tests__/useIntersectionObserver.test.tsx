import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useIntersectionObserver, useInView, useInfiniteScroll } from '../useIntersectionObserver';

// 테스트 래퍼 컴포넌트 - 공통 컨텍스트 제공 (필요시 사용)
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// 각 테스트 전에 실행
beforeEach(() => {
  vi.mock('intersection-observer');
  
  // IntersectionObserver 모킹
  global.IntersectionObserver = vi.fn().mockImplementation(function(callback) {
    this.callback = callback;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
    return this;
  });
});

// 각 테스트 후 정리
afterEach(() => {
  vi.clearAllMocks();
});

describe('useIntersectionObserver', () => {
  it('초기 상태는 isIntersecting이 false여야 함', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    
    const [, isIntersecting] = result.current;
    expect(isIntersecting).toBe(false);
  });
  
  it('fallbackInView가 true이면 초기 상태는 isIntersecting이 true여야 함', () => {
    const { result } = renderHook(() => useIntersectionObserver({ fallbackInView: true }));
    
    const [, isIntersecting] = result.current;
    expect(isIntersecting).toBe(true);
  });
  
  it('요소가 화면에 들어오면 isIntersecting이 true로 변경되어야 함', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    
    // 요소의 참조와 초기 상태 가져오기
    const [ref] = result.current;
    
    // Mock DOM 요소 생성
    const mockElement = document.createElement('div');
    
    // useRef의 current에 요소 할당
    // @ts-ignore - mock element
    ref.current = mockElement;
    
    // useEffect 실행 - 인터섹션 시뮬레이션
    act(() => {
      // Mock IntersectionObserver 인스턴스 생성
      const mockObserver = new (global.IntersectionObserver as any)(() => {});
      
      // 인터섹션 이벤트 시뮬레이션
      const entry = {
        isIntersecting: true,
        target: mockElement,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: 1,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now()
      };
      
      // 인터섹션 콜백 트리거
      mockObserver.callback([entry], mockObserver);
    });
    
    // isIntersecting이 true로 변경되었는지 확인
    const [, isIntersecting] = result.current;
    expect(isIntersecting).toBe(true);
  });
});

describe('useInView', () => {
  it('요소가 화면에 들어오면 콜백이 호출되어야 함', () => {
    const mockCallback = vi.fn();
    
    const { result } = renderHook(() => useInView(mockCallback));
    
    // 요소의 참조 가져오기
    const ref = result.current;
    
    // Mock DOM 요소 생성
    const mockElement = document.createElement('div');
    
    // useRef의 current에 요소 할당
    // @ts-ignore - mock element
    ref.current = mockElement;
    
    // useEffect 실행 - 인터섹션 시뮬레이션
    act(() => {
      // Mock IntersectionObserver 인스턴스 생성
      const mockObserver = new (global.IntersectionObserver as any)(() => {});
      
      // 인터섹션 이벤트 시뮬레이션
      const entry = {
        isIntersecting: true,
        target: mockElement,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: 1,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now()
      };
      
      // 인터섹션 콜백 트리거
      mockObserver.callback([entry], mockObserver);
    });
    
    // 콜백이 호출되었는지 확인
    expect(mockCallback).toHaveBeenCalledWith(true, expect.anything());
  });
});

describe('useInfiniteScroll', () => {
  it('요소가 화면에 들어오면 로딩 상태가 true로 변경되고 콜백이 호출되어야 함', async () => {
    // Async 콜백 모킹
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useInfiniteScroll(mockCallback));
    
    // 요소의 참조와 초기 로딩 상태 가져오기
    const [ref, isLoading] = result.current;
    expect(isLoading).toBe(false);
    
    // Mock DOM 요소 생성
    const mockElement = document.createElement('div');
    
    // useRef의 current에 요소 할당
    // @ts-ignore - mock element
    ref.current = mockElement;
    
    // useEffect 실행 - 인터섹션 시뮬레이션
    await act(async () => {
      // Mock IntersectionObserver 인스턴스 생성
      const mockObserver = new (global.IntersectionObserver as any)(() => {});
      
      // 인터섹션 이벤트 시뮬레이션
      const entry = {
        isIntersecting: true,
        target: mockElement,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: 1,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now()
      };
      
      // 인터섹션 콜백 트리거
      mockObserver.callback([entry], mockObserver);
      
      // 비동기 작업 완료를 기다림
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // 콜백이 호출되었는지 확인
    expect(mockCallback).toHaveBeenCalled();
  });
  
  it('enabled가 false면 콜백이 호출되지 않아야 함', async () => {
    const mockCallback = vi.fn();
    
    const { result } = renderHook(() => 
      useInfiniteScroll(mockCallback, { enabled: false })
    );
    
    // 요소의 참조 가져오기
    const [ref] = result.current;
    
    // Mock DOM 요소 생성
    const mockElement = document.createElement('div');
    
    // useRef의 current에 요소 할당
    // @ts-ignore - mock element
    ref.current = mockElement;
    
    // useEffect 실행 - 인터섹션 시뮬레이션
    await act(async () => {
      // Mock IntersectionObserver 인스턴스 생성
      const mockObserver = new (global.IntersectionObserver as any)(() => {});
      
      // 인터섹션 이벤트 시뮬레이션
      const entry = {
        isIntersecting: true,
        target: mockElement,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: 1,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now()
      };
      
      // 인터섹션 콜백 트리거
      mockObserver.callback([entry], mockObserver);
      
      // 비동기 작업 완료를 기다림
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // enabled가 false이므로 콜백이 호출되지 않아야 함
    expect(mockCallback).not.toHaveBeenCalled();
  });
}); 