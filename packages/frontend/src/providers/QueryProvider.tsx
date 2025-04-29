import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// QueryClient 인스턴스 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 창 포커스 시 자동 재조회 비활성화
      retry: 1, // 실패 시 1번 재시도
      staleTime: 5 * 60 * 1000, // 5분 동안 데이터 신선함 유지
      cacheTime: 10 * 60 * 1000, // 10분 동안 캐시 유지
    },
    mutations: {
      retry: 1, // 변경 실패 시 1번 재시도
      onError: (error: unknown) => {
        // 전역 에러 처리 로직
        console.error('API 요청 실패:', error);
      }
    }
  }
});

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider 컴포넌트
 * React Query 기능을 애플리케이션 전체에 제공합니다.
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 React Query Devtools 제공 */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};