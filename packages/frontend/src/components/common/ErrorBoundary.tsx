import React, { Component, ErrorInfo } from 'react';

import { Button, Result } from 'antd';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  onReset?: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 에러 바운더리 컴포넌트
 * 하위 컴포넌트 트리에서 발생하는 JavaScript 오류를 캐치하고 폴백 UI를 표시
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 오류 발생 시 상태 업데이트
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 로깅 또는 오류 보고 서비스에 오류 보고
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo
    });
  }

  handleReset = (): void => {
    // 사용자 지정 리셋 함수가 있으면 호출
    if (this.props.onReset) {
      this.props.onReset();
    }

    // 에러 상태 초기화
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // 폴백 UI 표시
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 오류 화면
      return (
        <Result
          status="error"
          title="컴포넌트 오류 발생"
          subTitle="컴포넌트 렌더링 중 오류가 발생했습니다."
          extra={[
            <Button key="reset" type="primary" onClick={this.handleReset}>
              다시 시도
            </Button>
          ]}
        >
          <div style={{ textAlign: 'left', margin: '20px 0' }}>
            <details style={{ whiteSpace: 'pre-wrap' }}>
              <summary>오류 정보</summary>
              <p>{this.state.error?.toString()}</p>
              <p>{this.state.errorInfo?.componentStack}</p>
            </details>
          </div>
        </Result>
      );
    }

    // 오류가 없으면 자식 컴포넌트 렌더링
    return this.props.children;
  }
}

/**
 * 고차 컴포넌트로 사용하기 위한 withErrorBoundary
 * 컴포넌트를 ErrorBoundary로 감싸서 반환
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
}

export default ErrorBoundary;