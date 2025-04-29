import React, { Suspense, useEffect, useState, ReactNode } from 'react';
import { Box, CircularProgress, Alert, Button, Typography } from '@mui/material';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * 데이터 페칭 결과 타입
 */
export type DataFetcherResult<T> = {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  refresh: () => void;
};

interface AsyncDataFetcherProps<T> {
  /** 데이터를 가져오는 비동기 함수 */
  fetchFn: () => Promise<T>;
  /** 데이터를 표시하는 컴포넌트 렌더 함수 */
  children: (result: T) => ReactNode;
  /** 로딩 중 표시할 컴포넌트 (선택) */
  loadingComponent?: ReactNode;
  /** 에러 발생 시 표시할 컴포넌트 (선택) */
  errorComponent?: (error: Error, retry: () => void) => ReactNode;
  /** 데이터가 자동으로 새로고침되는 간격 (밀리초) */
  refreshInterval?: number;
  /** 첫 로드 시 로딩 지연 표시 시간 (밀리초) */
  loadingDelay?: number;
}

/**
 * 비동기 데이터를 Suspense와 ErrorBoundary를 사용하여 안전하게 처리하는 컴포넌트
 */
function AsyncDataFetcher<T>({
  fetchFn,
  children,
  loadingComponent,
  errorComponent,
  refreshInterval,
  loadingDelay = 300,
}: AsyncDataFetcherProps<T>) {
  // 서스펜스 캐시를 활용한 데이터 읽기
  const resource = createResource<T>(fetchFn);
  
  // 기본 로딩 컴포넌트
  const DefaultLoading = (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        p: 3
      }}
    >
      <CircularProgress size={40} thickness={4} sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        데이터를 불러오는 중입니다...
      </Typography>
    </Box>
  );

  // 기본 에러 컴포넌트
  const DefaultError = (error: Error, retry: () => void) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        minHeight: 200,
      }}
    >
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={retry}>
            재시도
          </Button>
        }
        sx={{ width: '100%', mb: 2 }}
      >
        {error.message || '데이터를 가져오는 중 오류가 발생했습니다.'}
      </Alert>
    </Box>
  );

  // 주기적인 데이터 갱신
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (refreshInterval && refreshInterval > 0) {
      intervalId = setInterval(() => {
        resource.invalidate();
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshInterval]);

  // 서스펜스를 활용한 메인 렌더링
  const DataRenderer = () => {
    const data = resource.read();
    return <>{children(data)}</>;
  };

  // 지연된 로딩 표시
  const DelayedLoadingIndicator = () => {
    const [showLoading, setShowLoading] = useState(false);
    
    useEffect(() => {
      const timer = setTimeout(() => {
        setShowLoading(true);
      }, loadingDelay);
      
      return () => clearTimeout(timer);
    }, []);
    
    return showLoading ? <>{loadingComponent || DefaultLoading}</> : null;
  };

  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => 
        (errorComponent || DefaultError)(error as Error, () => {
          resource.invalidate();
          resetErrorBoundary();
        })
      }
    >
      <Suspense fallback={<DelayedLoadingIndicator />}>
        <DataRenderer />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * 데이터 소스를 관리하는 리소스 객체 생성
 */
function createResource<T>(fetchFn: () => Promise<T>) {
  let promise: Promise<T> | null = null;
  let result: T | undefined = undefined;
  let error: Error | null = null;
  
  return {
    read(): T {
      if (error) throw error;
      if (result !== undefined) return result;
      
      if (promise === null) {
        promise = fetchFn()
          .then(data => {
            result = data;
            return data;
          })
          .catch(e => {
            error = e instanceof Error ? e : new Error(String(e));
            throw error;
          });
      }
      
      throw promise;
    },
    invalidate(): void {
      promise = null;
      result = undefined;
      error = null;
    }
  };
}

export default AsyncDataFetcher;