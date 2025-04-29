import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useReducer } from 'react';
// 초기 상태
const initialState = {
    darkMode: localStorage.getItem('darkMode') === 'true',
    language: localStorage.getItem('language') || 'ko',
    notifications: []
};
// 리듀서 함수
function appReducer(state, action) {
    switch (action.type) {
        case 'TOGGLE_DARK_MODE':
            const newDarkMode = !state.darkMode;
            localStorage.setItem('darkMode', String(newDarkMode));
            return { ...state, darkMode: newDarkMode };
        case 'SET_LANGUAGE':
            localStorage.setItem('language', action.payload);
            return { ...state, language: action.payload };
        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [...state.notifications, action.payload]
            };
        case 'CLEAR_NOTIFICATION':
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.payload)
            };
        default:
            return state;
    }
}
// Context 생성
const AppContext = createContext({
    state: initialState,
    dispatch: () => null
});
// Provider 컴포넌트
export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);
    // 다크 모드 적용
    React.useEffect(() => {
        if (state.darkMode) {
            document.documentElement.classList.add('dark-mode');
        }
        else {
            document.documentElement.classList.remove('dark-mode');
        }
    }, [state.darkMode]);
    return (_jsx(AppContext.Provider, { value: { state, dispatch }, children: children }));
}
// 커스텀 훅
export function useAppContext() {
    return useContext(AppContext);
}
// 유틸리티 함수
export function useNotifications() {
    const { state, dispatch } = useAppContext();
    const addNotification = (message, type = 'info') => {
        const id = Date.now().toString();
        dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
                id,
                type,
                message,
                timestamp: Date.now()
            }
        });
        // 5초 후 자동 제거
        setTimeout(() => {
            dispatch({
                type: 'CLEAR_NOTIFICATION',
                payload: id
            });
        }, 5000);
        return id;
    };
    const clearNotification = (id) => {
        dispatch({
            type: 'CLEAR_NOTIFICATION',
            payload: id
        });
    };
    return {
        notifications: state.notifications,
        addNotification,
        clearNotification
    };
}
// 다크 모드 커스텀 훅
export function useDarkMode() {
    const { state, dispatch } = useAppContext();
    const toggleDarkMode = () => {
        dispatch({ type: 'TOGGLE_DARK_MODE' });
    };
    return {
        darkMode: state.darkMode,
        toggleDarkMode
    };
}
// 언어 설정 커스텀 훅
export function useLanguage() {
    const { state, dispatch } = useAppContext();
    const setLanguage = (lang) => {
        dispatch({ type: 'SET_LANGUAGE', payload: lang });
    };
    return {
        language: state.language,
        setLanguage
    };
}
