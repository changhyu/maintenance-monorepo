import React, { Suspense, use, useTransition, ReactNode } from 'react';
import { Box, CircularProgress, Typography, Alert, Button, Skeleton, Paper } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * 비동기 데이터 로딩 상태
 */
export type AsyncState<T> = {
  status: 'pending' | 'success' | 'error';
  data?: T;
  error?: any;
  startTime?: number;
  endTime?: number;
};

/**
 * 비동기 데이터 로딩 프로퍼티
 */
interface AsyncDataProps<T> {
  /** 비동기 데이터 Promise */
  promise: Promise<T>;
  /** 로딩 중 표시할 컴포넌트 */
  loadingComponent?: ReactNode;
  /** 오류 발생 시 표시할 컴포넌트 */
  errorComponent?: ReactNode;
  /** 로딩 메시지 */
  loadingMessage?: string;
  /** 최소 표시 시간 (ms) */
  minDisplayTime?: number;
  /** 자동 재시도 여부 */
  autoRetry?: boolean;
  /** 최대 재시도 횟수 */
  maxRetries?: number;
  /** 데이터를 표시할 렌더 함수 */
  children: (data: T) => ReactNode;
  /** 로딩 지연 시간 (ms) */
  delay?: number;
  /** 스켈레톤 UI 사용 여부 */
  useSkeleton?: boolean;
  /** 스켈레톤 행 수 */
  skeletonRows?: number;
  /** 비우기 효과 사용 여부 */
  useFadeIn?: boolean;
}

/**
 * 비동기 데이터 컴포넌트
 * React 19의 use() 훅을 활용한 선언적 데이터 로딩 지원
 */
export function AsyncData<T>({
  promise,
  loadingComponent,
  errorComponent,
  loadingMessage = '데이터를 불러오는 중입니다...',
  minDisplayTime = 500,
  autoRetry = false,
  maxRetries = 3,
  children,
  delay = 300,
  useSkeleton = true,
  skeletonRows = 3,
  useFadeIn = true
}: AsyncDataProps<T>) {
  // 지연된 로딩 상태를 위한 컴포넌트
  const DelayedLoading = () => {
    const [isPending, startTransition] = useTransition();
    const [showLoader, setShowLoader] = React.useState(false);
    
    React.useEffect(() => {
      // 지정된 지연 시간 후에 로딩 표시
      const timer = setTimeout(() => {
        startTransition(() => {
          setShowLoader(true);
        });
      }, delay);
      
      return () => clearTimeout(timer);
    }, []);
    
    if (!showLoader) {
      return null;
    }
    
    if (useSkeleton) {
      return (
        <Box sx={{ width: '100%', mt: 1 }}>
          {Array.from(new Array(skeletonRows)).map((_, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
              <Box sx={{ width: '100%' }}>
                <Skeleton width="80%" height={24} />
                <Skeleton width="60%" height={16} />
              </Box>
            </Box>
          ))}
        </Box>
      );
    }
    
    return loadingComponent || (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3
        }}
      >
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {loadingMessage}
        </Typography>
      </Box>
    );
  };
  
  // 오류 처리 컴포넌트
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => {
    return errorComponent || (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'error.light',
          borderRadius: 1
        }}
      >
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            autoRetry && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={resetErrorBoundary}
              >
                재시도
              </Button>
            )
          }
        >
          데이터를 불러오는 중 오류가 발생했습니다.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
        </Typography>
      </Paper>
    );
  };
  
  // 실제 데이터 로딩 컴포넌트
  const DataComponent = () => {
    // use() 훅으로 비동기 데이터 로딩
    const data = use(promise);
    
    // 최소 표시 시간 적용
    const [ready, setReady] = React.useState(minDisplayTime <= 0);
    
    React.useEffect(() => {
      if (minDisplayTime > 0) {
        const timer = setTimeout(() => {
          setReady(true);
        }, minDisplayTime);
        
        return () => clearTimeout(timer);
      }
    }, []);
    
    if (!ready) {
      return <DelayedLoading />;
    }
    
    // 데이터 표시
    return (
      <Box 
        sx={{ 
          opacity: useFadeIn ? 0 : 1,
          animation: useFadeIn ? 'fadeIn 0.3s ease-in forwards' : 'none',
          '@keyframes fadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 }
          }
        }}
      >
        {children(data)}
      </Box>
    );
  };
  
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // 지정된 최대 재시도 횟수 초과 시 자동 재시도 비활성화
        if (maxRetries <= 0) {
          return;
        }
      }}
      resetKeys={[promise]}
    >
      <Suspense fallback={<DelayedLoading />}>
        <DataComponent />
      </Suspense>
    </ErrorBoundary>
  );
}

export default AsyncData;
