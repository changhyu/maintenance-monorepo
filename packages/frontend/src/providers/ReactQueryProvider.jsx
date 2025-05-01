/**
 * React Query 설정 및 Provider
 * 
 * 이 모듈은 React Query를 애플리케이션에 통합하기 위한 설정과 Provider를 제공합니다.
 * 캐싱, 데이터 동기화, 오프라인 지원 등의 기능을 활성화합니다.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 기본 QueryClient 설정
const defaultOptions = {
  queries: {
    refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 리페치 비활성화
    retry: 2, // 실패 시 최대 2번 재시도
    staleTime: 5 * 60 * 1000, // 5분 동안 데이터를 신선한 상태로 유지
    cacheTime: 30 * 60 * 1000, // 30분 동안 캐시 유지
    onError: (error) => {
      console.error('React Query 오류:', error);
    }
  },
  mutations: {
    retry: 1, // 실패 시 최대 1번 재시도
    onError: (error) => {
      console.error('Mutation 오류:', error);
    }
  }
};

// 네트워크 상태에 따른 설정 변경을 위한 핸들러
const setupNetworkDetection = (client) => {
  // 오프라인 상태로 변경될 경우 자동 리페치 비활성화
  window.addEventListener('offline', () => {
    console.log('오프라인 모드 감지: 자동 리페치 비활성화');
    client.setDefaultOptions({
      queries: {
        ...client.getDefaultOptions().queries,
        retry: false, // 오프라인에서는 재시도 하지 않음
        refetchOnReconnect: true, // 재연결 시 리페치
      }
    });
  });

  // 온라인 상태로 변경될 경우 재연결 시 리페치 활성화
  window.addEventListener('online', () => {
    console.log('온라인 모드 감지: 자동 리페치 활성화');
    client.setDefaultOptions({
      queries: {
        ...client.getDefaultOptions().queries,
        retry: defaultOptions.queries.retry,
        refetchOnReconnect: true, // 재연결 시 리페치
      }
    });

    // 모든 쿼리 무효화하여 최신 데이터 가져오기
    client.invalidateQueries();
  });
};

// QueryClient 생성
export const createQueryClient = () => {
  const client = new QueryClient({
    defaultOptions
  });
  
  // 네트워크 상태 감지 설정
  if (typeof window !== 'undefined') {
    setupNetworkDetection(client);
  }
  
  return client;
};

// 기본 QueryClient 인스턴스
export const queryClient = createQueryClient();

/**
 * React Query Provider 컴포넌트
 * 애플리케이션에 React Query 설정을 제공합니다.
 */
export const ReactQueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
};

export default ReactQueryProvider;