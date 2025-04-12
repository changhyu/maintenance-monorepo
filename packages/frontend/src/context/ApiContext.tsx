import React, { createContext, useContext, ReactNode, useEffect } from 'react';

import defaultApiClient, { ApiClient } from '../api-client';
import { useAuth } from './AuthContext';

// API 클라이언트 컨텍스트 타입
interface ApiContextType {
  apiClient: ApiClient;
}

// API 컨텍스트 생성
const ApiContext = createContext<ApiContextType | undefined>(undefined);

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const auth = useAuth();
  const apiClient = defaultApiClient;

  // 인증 상태가 변경될 때마다 토큰 설정
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      apiClient.setHeaders({
        'Authorization': `Bearer ${token}`
      });
    } else {
      apiClient.setHeaders({
        'Authorization': ''
      });
    }
  }, [auth.isAuthenticated]);

  return <ApiContext.Provider value={{ apiClient }}>{children}</ApiContext.Provider>;
};

// 훅을 통해 API 클라이언트에 접근
export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
