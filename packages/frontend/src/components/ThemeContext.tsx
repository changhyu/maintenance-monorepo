import React, { createContext, useState, useContext, ReactNode } from 'react';

// 테마 타입 정의
type Theme = 'light' | 'dark';

// 테마 컨텍스트 타입 정의
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// 테마 컨텍스트 생성
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ThemeProvider props 타입 정의
interface ThemeProviderProps {
  children: ReactNode;
}

// ThemeProvider 컴포넌트
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 로컬 스토리지에서 테마 설정 가져오기 또는 기본값 설정
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'light';
  });

  // 테마 토글 함수
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // HTML 요소에 테마 클래스 추가/제거
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 초기 로딩 시 HTML 요소에 테마 클래스 적용
  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // 컨텍스트 값 제공
  const contextValue: ThemeContextType = {
    theme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// 테마 컨텍스트 사용을 위한 훅
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext; 