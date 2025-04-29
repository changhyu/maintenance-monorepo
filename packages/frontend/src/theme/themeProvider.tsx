import React, { createContext, useState, useContext, useMemo, ReactNode, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { PaletteMode } from '@mui/material';
import baseTheme from './theme';

// 테마 컨텍스트 타입 정의
interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

// 테마 컨텍스트 생성
const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

// 커스텀 훅 - 테마 컨텍스트 사용
export const useThemeContext = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

// 테마 프로바이더 컴포넌트
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 시스템 테마 감지
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // 로컬 스토리지에서 저장된 테마 가져오기
  const getStoredTheme = (): PaletteMode => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    return prefersDarkMode ? 'dark' : 'light';
  };

  const [mode, setMode] = useState<PaletteMode>(getStoredTheme);

  // 테마 모드 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('theme', mode);
    // 문서 루트에 다크 모드 클래스 추가/제거 (CSS 변수 적용을 위한 옵션)
    if (mode === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [mode]);

  // 테마 모드 토글 함수
  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // 테마 컨텍스트 값
  const themeContextValue = useMemo(
    () => ({
      mode,
      toggleColorMode,
    }),
    [mode]
  );

  // 메모이제이션된 테마 객체
  const theme = useMemo(() => {
    const newTheme = createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        mode,
        // 다크 모드 특정 값 덮어쓰기
        ...(mode === 'dark' && {
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)',
            disabled: 'rgba(255, 255, 255, 0.5)',
          },
        }),
      },
    });
    
    return newTheme;
  }, [mode]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline /> {/* CSS 기본값 정규화 */}
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
