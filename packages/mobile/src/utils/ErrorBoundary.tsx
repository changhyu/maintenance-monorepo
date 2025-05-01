import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

/**
 * 에러 바운더리 속성 인터페이스
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

/**
 * 에러 바운더리 상태 인터페이스
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 앱 내에서 발생하는 예외를 캡처하고 처리하는 컴포넌트
 * React 컴포넌트 트리 내에서 자식 컴포넌트에서 발생하는 JavaScript 오류를 포착하고
 * 오류 UI를 표시하여 전체 앱이 중단되는 것을 방지
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

  /**
   * 자식 컴포넌트에서 오류가 발생했을 때 호출되는 정적 메서드
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 다음 렌더링에서 대체 UI가 표시되도록 상태 업데이트
    return { hasError: true, error };
  }

  /**
   * 자식 컴포넌트에서 에러가 발생했을 때 발생한 에러와 스택 정보를 기록
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 정보를 상태에 저장
    this.setState({ errorInfo });
    
    // 에러 로깅 및 props로 전달된 onError 콜백 실행
    console.error('ErrorBoundary에서 에러 캐치:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // 여기에 원격 로깅 서비스 통합 가능
    // 예: 크래시리틱스, 센트리 등 에러 리포팅 서비스 호출
  }

  /**
   * 에러 상태 초기화
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  /**
   * 기본 대체 UI 렌더링
   */
  renderDefaultFallback = (): ReactNode => {
    const { error } = this.state;
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>앱에 문제가 발생했습니다</Text>
          <Text style={styles.message}>예기치 않은 오류가 발생했습니다.</Text>
          
          {__DEV__ && error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>에러 정보:</Text>
              <Text style={styles.errorText}>{error.toString()}</Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  render(): ReactNode {
    const { hasError } = this.state;
    const { children, fallback } = this.props;
    
    if (hasError) {
      // 커스텀 fallback이 제공된 경우 해당 컴포넌트 사용, 아니면 기본 UI 사용
      return fallback || this.renderDefaultFallback();
    }
    
    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#343a40'
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    color: '#495057',
    textAlign: 'center'
  },
  errorContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    marginBottom: 20
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#e03131'
  },
  errorText: {
    fontSize: 12,
    color: '#e03131',
    fontFamily: 'monospace'
  },
  button: {
    backgroundColor: '#228be6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default ErrorBoundary; 