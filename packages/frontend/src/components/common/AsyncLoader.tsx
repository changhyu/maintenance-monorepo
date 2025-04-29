import React, { Suspense } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

interface AsyncLoaderProps {
  /** 비동기적으로 로드할 컴포넌트 */
  children: React.ReactNode;
  /** 로딩 중 표시할 문구 */
  loadingText?: string;
  /** 에러 발생 시 표시할 컴포넌트 */
  fallback?: React.ReactNode;
  /** 로더의 최소 높이 */
  minHeight?: string | number;
}

/**
 * 비동기 컴포넌트 로딩을 위한 래퍼 컴포넌트
 * React 19의 Suspense를 활용하여 비동기 로딩 처리
 */
export const AsyncLoader: React.FC<AsyncLoaderProps> = ({
  children,
  loadingText = '로딩 중...',
  fallback,
  minHeight = '200px'
}) => {
  // 기본 로딩 컴포넌트
  const DefaultLoading = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        p: 3
      }}
    >
      <CircularProgress size={40} thickness={4} />
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        {loadingText}
      </Typography>
    </Box>
  );

  // 기본 에러 컴포넌트
  const DefaultError = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        p: 3
      }}
    >
      <Alert severity="error" sx={{ width: '100%', maxWidth: '500px' }}>
        컴포넌트 로드 중 오류가 발생했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.
      </Alert>
    </Box>
  );

  return (
    <Suspense fallback={DefaultLoading}>
      <ErrorBoundary fallback={fallback || DefaultError}>
        {children}
      </ErrorBoundary>
    </Suspense>
  );
};

// React 19 ErrorBoundary 컴포넌트
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('컴포넌트 로딩 오류:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default AsyncLoader;