import { useCallback, useSyncExternalStore } from 'react';
/**
 * 테마 모드를 관리하는 커스텀 훅 (React 19 최적화)
 * 로컬 스토리지와 시스템 기본 설정을 사용하여 테마 모드를 관리합니다.
 */
export const useThemeMode = () => {
    // 로컬 스토리지에서 테마 모드 읽기
    const getThemeMode = useCallback(() => {
        // 로컬 스토리지에서 테마 모드 불러오기
        const savedMode = localStorage.getItem('themeMode');
        // 시스템 다크 모드 확인
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return savedMode || (prefersDark ? 'dark' : 'light');
    }, []);
    // 로컬 스토리지 변경 감지 구독
    const subscribe = useCallback((callback) => {
        // 로컬 스토리지 변경 이벤트 리스너
        const handleStorageChange = (e) => {
            if (e.key === 'themeMode') {
                callback();
            }
        };
        // 시스템 다크 모드 변경 감지 미디어 쿼리
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => callback();
        // 이벤트 리스너 등록
        window.addEventListener('storage', handleStorageChange);
        darkModeMediaQuery.addEventListener('change', handleMediaChange);
        window.addEventListener('theme-change', callback);
        // 정리 함수
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            darkModeMediaQuery.removeEventListener('change', handleMediaChange);
            window.removeEventListener('theme-change', callback);
        };
    }, []);
    // useSyncExternalStore로 외부 저장소와 동기화
    const mode = useSyncExternalStore(subscribe, getThemeMode);
    // 테마 모드 변경 함수
    const toggleTheme = useCallback(() => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', newMode);
        // body 태그에 테마 클래스 업데이트
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(`${newMode}-mode`);
        // 테마 변경 이벤트 발생
        window.dispatchEvent(new Event('theme-change'));
    }, [mode]);
    return { mode, toggleTheme };
};
export default useThemeMode;
