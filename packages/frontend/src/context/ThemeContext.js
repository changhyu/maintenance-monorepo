import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
// 테마 컨텍스트 생성
const ThemeContext = createContext(undefined);
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');
    // 초기 로드 시 저장된 테마 설정 불러오기
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        // 사용자 저장 테마 또는 시스템 기본 설정 적용
        if (savedTheme) {
            setTheme(savedTheme);
        }
        else {
            // 시스템 기본 설정이 다크 모드인지 확인
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDarkMode ? 'dark' : 'light');
        }
    }, []);
    // 테마 변경 시 document에 클래스 적용 및 로컬 스토리지 저장
    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    // 테마 토글 함수
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    // 직접 테마 설정 함수
    const setThemeMode = (newTheme) => {
        setTheme(newTheme);
    };
    // 컨텍스트 값 정의
    const contextValue = {
        theme,
        toggleTheme,
        setTheme: setThemeMode
    };
    return _jsx(ThemeContext.Provider, { value: contextValue, children: children });
};
// 테마 컨텍스트를 사용하기 위한 커스텀 훅
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
