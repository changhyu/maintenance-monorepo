import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { Button, Result } from 'antd';
/**
 * 에러 바운더리 컴포넌트
 * 하위 컴포넌트 트리에서 발생하는 JavaScript 오류를 캐치하고 폴백 UI를 표시
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.handleReset = () => {
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
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }
    static getDerivedStateFromError(error) {
        // 오류 발생 시 상태 업데이트
        return {
            hasError: true,
            error
        };
    }
    componentDidCatch(error, errorInfo) {
        // 로깅 또는 오류 보고 서비스에 오류 보고
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            errorInfo
        });
    }
    render() {
        if (this.state.hasError) {
            // 폴백 UI 표시
            if (this.props.fallback) {
                return this.props.fallback;
            }
            // 기본 오류 화면
            return (_jsx(Result, { status: "error", title: "\uCEF4\uD3EC\uB10C\uD2B8 \uC624\uB958 \uBC1C\uC0DD", subTitle: "\uCEF4\uD3EC\uB10C\uD2B8 \uB80C\uB354\uB9C1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.", extra: [
                    _jsx(Button, { type: "primary", onClick: this.handleReset, children: "\uB2E4\uC2DC \uC2DC\uB3C4" }, "reset")
                ], children: _jsx("div", { style: { textAlign: 'left', margin: '20px 0' }, children: _jsxs("details", { style: { whiteSpace: 'pre-wrap' }, children: [_jsx("summary", { children: "\uC624\uB958 \uC815\uBCF4" }), _jsx("p", { children: this.state.error?.toString() }), _jsx("p", { children: this.state.errorInfo?.componentStack })] }) }) }));
        }
        // 오류가 없으면 자식 컴포넌트 렌더링
        return this.props.children;
    }
}
/**
 * 고차 컴포넌트로 사용하기 위한 withErrorBoundary
 * 컴포넌트를 ErrorBoundary로 감싸서 반환
 */
export function withErrorBoundary(WrappedComponent, errorBoundaryProps) {
    return (props) => (_jsx(ErrorBoundary, { ...errorBoundaryProps, children: _jsx(WrappedComponent, { ...props }) }));
}
export default ErrorBoundary;
