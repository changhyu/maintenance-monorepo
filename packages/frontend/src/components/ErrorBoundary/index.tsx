import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@mui/material';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.FC<{ error: Error }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary 컴포넌트
 * React 컴포넌트 트리에서 JavaScript 오류를 포착하고 fallback UI를 표시합니다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 오류 정보를 로깅합니다.
    console.error('ErrorBoundary 오류 발생:', error);
    console.error('컴포넌트 스택:', errorInfo.componentStack);
    
    // 필요하다면 여기에 오류 리포팅 서비스(예: Sentry)로 오류를 전송할 수 있습니다.
    // reportErrorToService(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 폴백 UI를 렌더링합니다.
      const { fallback: FallbackComponent } = this.props;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error as Error} />;
      }
      
      // 기본 폴백 UI
      return (
        <div style={{
          padding: '20px',
          margin: '48px auto',
          maxWidth: '500px',
          textAlign: 'center',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>오류가 발생했습니다</h2>
          <p>애플리케이션에서 오류가 발생했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.</p>
          <p style={{ fontSize: '0.9rem', color: '#555' }}>
            {this.state.error?.message}
          </p>
          <Button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '16px'
            }}
          >
            페이지 새로고침
          </Button>
        </div>
      );
    }

    // 오류가 없으면 자식 컴포넌트를 정상적으로 렌더링합니다.
    return this.props.children;
  }
}