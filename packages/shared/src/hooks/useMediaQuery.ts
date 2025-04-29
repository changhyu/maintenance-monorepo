import { useState, useEffect } from 'react';

/**
 * CSS 미디어 쿼리를 사용하여 화면 크기 변화를 감지하는 훅
 * @param query CSS 미디어 쿼리 문자열 (예: '(min-width: 768px)')
 * @returns 미디어 쿼리 일치 여부
 */
export function useMediaQuery(query: string): boolean {
  // SSR 지원을 위한 초기 상태 설정
  const getMatches = (): boolean => {
    // 브라우저 환경이 아닌 경우 기본값 반환
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => {
      setMatches(mediaQuery.matches);
    };

    // 초기 상태 설정
    updateMatches();

    // 변경 이벤트 리스너 등록
    if (mediaQuery.addEventListener) {
      // 최신 브라우저
      mediaQuery.addEventListener('change', updateMatches);
    } else {
      // 구형 브라우저 지원 (Safari < 14)
      mediaQuery.addListener(updateMatches);
    }

    // 정리 함수
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMatches);
      } else {
        mediaQuery.removeListener(updateMatches);
      }
    };
  }, [query]);

  return matches;
}

// 일반적으로 사용되는 미디어 쿼리 프리셋
export const useIsSmallScreen = () => useMediaQuery('(max-width: 640px)');
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsTabletOrMobile = () => useMediaQuery('(max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsLargeDesktop = () => useMediaQuery('(min-width: 1280px)');
export const useIsDarkColorScheme = () => useMediaQuery('(prefers-color-scheme: dark)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)'); 