import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Suspense, use, useTransition } from 'react';
import { Box, CircularProgress, Typography, Alert, Button, Skeleton, Paper } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
/**
 * 비동기 데이터 컴포넌트
 * React 19의 use() 훅을 활용한 선언적 데이터 로딩 지원
 */
export function AsyncData({ promise, loadingComponent, errorComponent, loadingMessage = '데이터를 불러오는 중입니다...', minDisplayTime = 500, autoRetry = false, maxRetries = 3, children, delay = 300, useSkeleton = true, skeletonRows = 3, useFadeIn = true }) {
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
            return (_jsx(Box, { sx: { width: '100%', mt: 1 }, children: Array.from(new Array(skeletonRows)).map((_, index) => (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 1 }, children: [_jsx(Skeleton, { variant: "circular", width: 40, height: 40, sx: { mr: 2 } }), _jsxs(Box, { sx: { width: '100%' }, children: [_jsx(Skeleton, { width: "80%", height: 24 }), _jsx(Skeleton, { width: "60%", height: 16 })] })] }, index))) }));
        }
        return loadingComponent || (_jsxs(Box, { sx: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3
            }, children: [_jsx(CircularProgress, { size: 40, thickness: 4 }), _jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mt: 2 }, children: loadingMessage })] }));
    };
    // 오류 처리 컴포넌트
    const ErrorFallback = ({ error, resetErrorBoundary }) => {
        return errorComponent || (_jsxs(Paper, { elevation: 0, sx: {
                p: 3,
                border: '1px solid',
                borderColor: 'error.light',
                borderRadius: 1
            }, children: [_jsx(Alert, { severity: "error", sx: { mb: 2 }, action: autoRetry && (_jsx(Button, { color: "inherit", size: "small", onClick: resetErrorBoundary, children: "\uC7AC\uC2DC\uB3C4" })), children: "\uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' })] }));
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
            return _jsx(DelayedLoading, {});
        }
        // 데이터 표시
        return (_jsx(Box, { sx: {
                opacity: useFadeIn ? 0 : 1,
                animation: useFadeIn ? 'fadeIn 0.3s ease-in forwards' : 'none',
                '@keyframes fadeIn': {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 }
                }
            }, children: children(data) }));
    };
    return (_jsx(ErrorBoundary, { FallbackComponent: ErrorFallback, onReset: () => {
            // 지정된 최대 재시도 횟수 초과 시 자동 재시도 비활성화
            if (maxRetries <= 0) {
                return;
            }
        }, resetKeys: [promise], children: _jsx(Suspense, { fallback: _jsx(DelayedLoading, {}), children: _jsx(DataComponent, {}) }) }));
}
export default AsyncData;
