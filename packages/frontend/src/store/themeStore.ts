import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 테마 설정을 위한 인터페이스
 */
export interface ThemeState {
  /**
   * 현재 테마 모드
   * 'light': 라이트 모드
   * 'dark': 다크 모드
   * 'system': 시스템 설정 따름
   */
  themeMode: 'light' | 'dark' | 'system';
  
  /**
   * 색상 강조(accent color) 
   */
  accentColor: string;
  
  /**
   * 폰트 크기 스케일
   */
  fontScale: number;
  
  /**
   * 테마 모드 변경 함수
   */
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  
  /**
   * 색상 강조 변경 함수
   */
  setAccentColor: (color: string) => void;
  
  /**
   * 폰트 스케일 변경 함수
   */
  setFontScale: (scale: number) => void;
}

/**
 * Zustand 스토어: 테마 관리
 * localStorage를 통해 사용자 선택 유지
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      accentColor: '#1976d2', // 기본 MUI 블루
      fontScale: 1,
      
      setThemeMode: (mode) => set({ themeMode: mode }),
      setAccentColor: (color) => set({ accentColor: color }),
      setFontScale: (scale) => set({ fontScale: scale }),
    }),
    {
      name: 'theme-settings',
    }
  )
);

/**
 * 현재 시스템 테마 모드(다크/라이트) 반환하는 유틸리티 함수
 */
export function getSystemThemeMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 테마 모드와 시스템 설정을 고려하여 실제 적용할 테마 모드 결정
 */
export function getEffectiveThemeMode(themeMode: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  return themeMode === 'system' ? getSystemThemeMode() : themeMode;
}