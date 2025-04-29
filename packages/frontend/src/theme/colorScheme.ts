import { PaletteOptions } from '@mui/material/styles';

/**
 * 색상 팔레트 타입
 */
export type ColorScheme = {
  primary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  error: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  warning: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  info: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  success: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    hint?: string;
  };
  background: {
    default: string;
    paper: string;
    surface?: string;
  };
  divider: string;
  action: {
    active: string;
    hover: string;
    selected: string;
    disabled: string;
    disabledBackground: string;
    focus: string;
  };
};

/**
 * 라이트 모드 색상 팔레트
 */
export const lightColorScheme: ColorScheme = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#fff',
  },
  secondary: {
    main: '#9c27b0',
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#fff',
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
    contrastText: '#fff',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
    contrastText: '#fff',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
    contrastText: '#fff',
  },
  success: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
    contrastText: '#fff',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#9e9e9e',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
    surface: '#fafafa',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
    focus: 'rgba(0, 0, 0, 0.12)',
  },
};

/**
 * 다크 모드 색상 팔레트
 */
export const darkColorScheme: ColorScheme = {
  primary: {
    main: '#90caf9',
    light: '#e3f2fd',
    dark: '#42a5f5',
    contrastText: '#000',
  },
  secondary: {
    main: '#ce93d8',
    light: '#f3e5f5',
    dark: '#ab47bc',
    contrastText: '#000',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#fff',
  },
  warning: {
    main: '#ffa726',
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#000',
  },
  info: {
    main: '#29b6f6',
    light: '#4fc3f7',
    dark: '#0288d1',
    contrastText: '#000',
  },
  success: {
    main: '#66bb6a',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#000',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b0b0b0',
    disabled: '#6b6b6b',
  },
  background: {
    default: '#121212',
    paper: '#1e1e1e',
    surface: '#252525',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
  action: {
    active: 'rgba(255, 255, 255, 0.54)',
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
    focus: 'rgba(255, 255, 255, 0.12)',
  },
};

/**
 * 시스템 색상 모드 감지 함수
 * @returns 시스템 다크 모드 여부
 */
export function detectSystemColorScheme(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 색상 모드 변경 감지 이벤트 리스너 등록
 * @param callback 색상 모드 변경 시 호출될 콜백 함수
 * @returns 리스너 제거 함수
 */
export function listenToColorSchemeChanges(callback: (isDarkMode: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // 변경 이벤트 리스너 등록
  const listener = (event: MediaQueryListEvent) => {
    callback(event.matches);
  };
  
  // Safari/iOS 지원을 위한 이전 API 호환
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener);
  } else {
    // @ts-ignore - 이전 API 지원
    mediaQuery.addListener(listener);
  }
  
  // 리스너 제거 함수 반환
  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', listener);
    } else {
      // @ts-ignore - 이전 API 지원
      mediaQuery.removeListener(listener);
    }
  };
}

/**
 * 색상 팔레트를 MUI 팔레트 옵션으로 변환
 * @param colorScheme 색상 팔레트
 * @returns MUI 팔레트 옵션
 */
export function createPaletteOptions(colorScheme: ColorScheme, mode: 'light' | 'dark'): PaletteOptions {
  return {
    mode,
    ...colorScheme,
    // 추가 팔레트 옵션 설정
    contrastThreshold: 3,
    tonalOffset: 0.2,
  };
}
