import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Suspense } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
/**
 * 비동기 컴포넌트 로딩을 위한 래퍼 컴포넌트
 * React 19의 Suspense를 활용하여 비동기 로딩 처리
 */
export const AsyncLoader = ({ children, loadingText = '로딩 중...', fallback, minHeight = '200px' }) => {
    // 기본 로딩 컴포넌트
    const DefaultLoading = (_jsxs(Box, { sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight,
            p: 3
        }, children: [_jsx(CircularProgress, { size: 40, thickness: 4 }), _jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mt: 2 }, children: loadingText })] }));
    // 기본 에러 컴포넌트
    const DefaultError = (_jsx(Box, { sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight,
            p: 3
        }, children: _jsx(Alert, { severity: "error", sx: { width: '100%', maxWidth: '500px' }, children: "\uCEF4\uD3EC\uB10C\uD2B8 \uB85C\uB4DC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uD398\uC774\uC9C0\uB97C \uC0C8\uB85C\uACE0\uCE68\uD558\uAC70\uB098 \uB098\uC911\uC5D0 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694." }) }));
    return (_jsx(Suspense, { fallback: DefaultLoading, children: _jsx(ErrorBoundary, { fallback: fallback || DefaultError, children: children }) }));
};
// React 19 ErrorBoundary 컴포넌트
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
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
