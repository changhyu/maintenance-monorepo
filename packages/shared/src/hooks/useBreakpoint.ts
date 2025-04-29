import { useState, useEffect } from 'react';

// 기본 브레이크포인트 (Tailwind CSS와 동일)
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// 브레이크포인트 크기 정의 (Tailwind CSS와 동일)
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// 현재 브레이크포인트 계산 함수
function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'md'; // SSR 환경에서 기본값

  const width = window.innerWidth;
  
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

// 브레이크포인트 비교 헬퍼 함수
function isGreaterThan(breakpoint: Breakpoint, compareWith: Breakpoint): boolean {
  return breakpoints[breakpoint] >= breakpoints[compareWith];
}

function isLessThan(breakpoint: Breakpoint, compareWith: Breakpoint): boolean {
  return breakpoints[breakpoint] < breakpoints[compareWith];
}

// 커스텀 브레이크포인트 타입
export interface CustomBreakpoints {
  [key: string]: number;
}

/**
 * 브레이크포인트를 감지하는 훅
 * @param _customBreakpoints 커스텀 브레이크포인트 객체 (기본 breakpoints를 덮어씌움)
 * @returns 현재 브레이크포인트와 비교 함수
 */
export function useBreakpoint(_customBreakpoints?: CustomBreakpoints) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>(() => {
    return typeof window !== 'undefined' ? getCurrentBreakpoint() : 'md';
  });
  
  // 브레이크포인트에 따른 파생 상태
  const [state, setState] = useState({
    isMobile: isLessThan(currentBreakpoint, 'md'),
    isTablet: currentBreakpoint === 'md',
    isDesktop: isGreaterThan(currentBreakpoint, 'md'),
    isSmallScreen: isLessThan(currentBreakpoint, 'lg'),
    isLargeScreen: isGreaterThan(currentBreakpoint, 'lg'),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 화면 크기 변경 시 브레이크포인트 업데이트
    const handleResize = () => {
      const newBreakpoint = getCurrentBreakpoint();
      if (newBreakpoint !== currentBreakpoint) {
        setCurrentBreakpoint(newBreakpoint);
        
        // 파생 상태 업데이트
        setState({
          isMobile: isLessThan(newBreakpoint, 'md'),
          isTablet: newBreakpoint === 'md',
          isDesktop: isGreaterThan(newBreakpoint, 'md'),
          isSmallScreen: isLessThan(newBreakpoint, 'lg'),
          isLargeScreen: isGreaterThan(newBreakpoint, 'lg'),
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentBreakpoint]);

  // 유틸리티 비교 함수
  const isUp = (breakpoint: Breakpoint) => isGreaterThan(currentBreakpoint, breakpoint);
  const isDown = (breakpoint: Breakpoint) => isLessThan(currentBreakpoint, breakpoint);
  const is = (breakpoint: Breakpoint) => currentBreakpoint === breakpoint;

  return {
    // 현재 브레이크포인트
    breakpoint: currentBreakpoint,
    
    // 브레이크포인트 비교 함수
    isUp,
    isDown,
    is,
    
    // 파생 상태 (일반적으로 자주 사용되는 값)
    ...state,
  };
} 