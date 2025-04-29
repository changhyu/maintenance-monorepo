import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useState, useContext, useEffect, useMemo } from 'react';
// 테마 컨텍스트 생성
const ThemeContext = createContext(undefined);
// ThemeProvider 컴포넌트
export const ThemeProvider = ({ children }) => {
    // 로컬 스토리지에서 테마 설정 가져오기 또는 기본값 설정
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    });
    // 테마 토글 함수
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        // HTML 요소에 테마 클래스 추가/제거
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
        else {
            document.documentElement.classList.remove('dark');
        }
    };
    // 초기 로딩 시 HTML 요소에 테마 클래스 적용
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        }
        else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);
    // 컨텍스트 값을 useMemo로 메모이제이션
    const contextValue = useMemo(() => ({
        theme,
        toggleTheme
    }), [theme]);
    return _jsx(ThemeContext.Provider, { value: contextValue, children: children });
};
// 테마 컨텍스트 사용을 위한 훅
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
export default ThemeContext;
