import React, { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * 코드 분할을 위한 지연 로딩 컴포넌트
 * 
 * Suspense와 ErrorBoundary를 통합하여 비동기 로딩 관리
 */

// 대시보드 관련 페이지
export const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
export const AnalyticsPage = lazy(() => import('../pages/Dashboard/AnalyticsPage'));
export const ReportsPage = lazy(() => import('../pages/Dashboard/ReportsPage'));

// 사용자 관련 페이지
export const UserProfile = lazy(() => import('../pages/User/UserProfile'));
export const UserSettings = lazy(() => import('../pages/User/UserSettings'));
export const UserList = lazy(() => import('../pages/User/UserList'));

// 인증 관련 페이지
export const LoginPage = lazy(() => import('../pages/Auth/LoginPage'));
export const RegisterPage = lazy(() => import('../pages/Auth/RegisterPage'));
export const ForgotPasswordPage = lazy(() => import('../pages/Auth/ForgotPasswordPage'));

// 그 외 페이지
export const NotFoundPage = lazy(() => import('../pages/Error/NotFoundPage'));
export const AccessDeniedPage = lazy(() => import('../pages/Error/AccessDeniedPage'));

/**
 * 코드 분할된 컴포넌트를 안전하게 로딩하기 위한 래퍼 함수
 * 
 * @param Component 지연 로딩할 컴포넌트
 * @returns 에러 경계와 로딩 상태가 처리된 컴포넌트
 */
export function withLazyLoading(Component: React.LazyExoticComponent<any>) {
  return function LazyLoadedComponent(props: any) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <Component {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}