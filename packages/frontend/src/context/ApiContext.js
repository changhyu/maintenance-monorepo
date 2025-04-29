import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect } from 'react';
import defaultApiClient from '../api-client';
import { useAuth } from './AuthContext';
// API 컨텍스트 생성
const ApiContext = createContext(undefined);
export const ApiProvider = ({ children }) => {
    const auth = useAuth();
    const apiClient = defaultApiClient;
    // 인증 상태가 변경될 때마다 토큰 설정
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            apiClient.setHeaders({
                'Authorization': `Bearer ${token}`
            });
        }
        else {
            apiClient.setHeaders({
                'Authorization': ''
            });
        }
    }, [auth.isAuthenticated]);
    return _jsx(ApiContext.Provider, { value: { apiClient }, children: children });
};
// 훅을 통해 API 클라이언트에 접근
export const useApi = () => {
    const context = useContext(ApiContext);
    if (context === undefined) {
        throw new Error('useApi must be used within an ApiProvider');
    }
    return context;
};
