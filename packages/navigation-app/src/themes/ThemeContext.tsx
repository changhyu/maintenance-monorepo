import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';

// 테마 타입 정의 추가
export type ThemeType = 'light' | 'dark' | 'system';

// 테마 색상 정의
export const lightTheme = {
  primary: '#007AFF',
  accent: '#0066CC',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  secondaryText: '#666666',
  border: '#E0E0E0',
  notification: '#FF3B30',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',
  gray: '#8E8E93',
  mode: 'light' as const,
};

export const darkTheme = {
  primary: '#0A84FF',
  accent: '#2C9CFF',
  background: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  secondaryText: '#AEAEB2',
  border: '#38383A',
  notification: '#FF453A',
  success: '#30D158',
  error: '#FF453A',
  warning: '#FF9F0A',
  info: '#64D2FF',
  gray: '#8E8E93',
  mode: 'dark' as const,
};

// Theme 타입 정의 - 두 테마를 모두 포함하도록
export type Theme = typeof lightTheme | typeof darkTheme;

// 테마 컨텍스트 타입
interface ThemeContextType {
  isDark: boolean;
  colors: Theme; // 수정: lightTheme만이 아닌 Theme 타입으로 변경
  toggleTheme: () => void;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

// 테마 컨텍스트 생성
const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightTheme,
  toggleTheme: () => {},
  theme: 'light',
  setTheme: () => {},
});

// 테마 제공자 컴포넌트
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');
  // useState를 올바르게 구조 분해
  const [theme, setTheme] = useState<ThemeType>('system');
  
  // 시스템 테마 변경 감지
  useEffect(() => {
    if (theme === 'system') {
      setIsDark(colorScheme === 'dark');
    }
  }, [colorScheme, theme]);

  // 테마 토글 함수
  const toggleTheme = () => {
    setIsDark(prev => !prev);
    setTheme(isDark ? 'light' : 'dark');
  };

  // 테마 설정 함수 수정 - setTheme 이름 변경이 필요 없음
  const updateTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
    if (newTheme === 'light') {
      setIsDark(false);
    } else if (newTheme === 'dark') {
      setIsDark(true);
    } else {
      // system
      setIsDark(colorScheme === 'dark');
    }
  };

  const colors = isDark ? darkTheme : lightTheme;
  
  // useMemo를 사용하여 컨텍스트 값 메모이제이션 - setTheme 함수 이름 변경
  const contextValue = useMemo(() => ({
    isDark,
    colors,
    toggleTheme,
    theme,
    setTheme: updateTheme
  }), [isDark, colors, theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// 테마 컨텍스트 사용을 위한 훅
export const useTheme = () => useContext(ThemeContext);