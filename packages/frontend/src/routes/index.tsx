import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// 레이아웃
import Layout from '../components/layout/Layout';

// 로딩 Fallback 컴포넌트
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// 지연 로딩으로 페이지 컴포넌트 가져오기
const Dashboard = lazy(() => import('../pages/Dashboard'));
const NotFound = lazy(() => import('../pages/NotFound'));

// 차량 관련 페이지
const VehicleList = lazy(() => import('../pages/vehicle/VehicleList'));
const VehicleDetail = lazy(() => import('../pages/vehicle/VehicleDetail'));
const VehicleForm = lazy(() => import('../pages/vehicle/VehicleForm'));

// 정비 관련 페이지
const MaintenanceList = lazy(() => import('../pages/maintenance/MaintenanceList'));
const MaintenanceDetail = lazy(() => import('../pages/maintenance/MaintenanceDetail'));
const MaintenanceForm = lazy(() => import('../pages/maintenance/MaintenanceForm'));

// 법정검사 관련 페이지
const InspectionListPage = lazy(() => import('../pages/InspectionListPage'));
const InspectionDetailPage = lazy(() => import('../pages/InspectionDetailPage'));
const InspectionCreatePage = lazy(() => import('../pages/InspectionCreatePage'));
const InspectionEditPage = lazy(() => import('../pages/InspectionEditPage'));
const InspectionCompletePage = lazy(() => import('../pages/InspectionCompletePage'));

// 문의 관련 페이지
const InquiryList = lazy(() => import('../pages/inquiry/InquiryList'));

// 보고서 페이지
const Reports = lazy(() => import('../pages/reports/Reports'));

// 설정 페이지
const Settings = lazy(() => import('../pages/settings/Settings'));

// 시스템 모니터링 페이지
const SystemMonitor = lazy(() => import('../pages/SystemMonitor'));

// 내비게이션 앱 페이지
const NavigationApp = lazy(() => import('../pages/NavigationApp'));

// 인증 관련 페이지
const Login = lazy(() => import('../pages/auth/Login'));

// 드라이버 라우트
const DriverRoutes = lazy(() => import('./DriverRoutes'));

// 인증된 라우트 컴포넌트
import ProtectedRoute from './ProtectedRoute';

/**
 * 애플리케이션 라우터 컴포넌트
 * 코드 분할을 위한 지연 로딩을 적용했습니다.
 */
const AppRoutes: React.FC = () => {
  // 사용자 인증 상태 확인
  const isAuthenticated = localStorage.getItem('token') !== null;
  
  // 로그인 처리 함수
  const handleLogin = () => {
    // 로그인 성공 후 처리 로직
    window.location.href = '/';
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* 인증 라우트 */}
        <Route 
          path="/login" 
          element={
            isAuthenticated 
              ? <Navigate to="/" replace /> 
              : <Login onLogin={handleLogin} />
          } 
        />

        {/* 내비게이션 앱 라우트 - 별도의 레이아웃 사용 */}
        <Route 
          path="/navigation" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <NavigationApp />
            </ProtectedRoute>
          } 
        />

        {/* 메인 레이아웃 및 인증된 라우트 */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          
          {/* 차량 관련 라우트 */}
          <Route path="vehicles">
            <Route index element={<VehicleList />} />
            <Route path=":id" element={<VehicleDetail />} />
            <Route path="new" element={<VehicleForm />} />
            <Route path=":id/edit" element={<VehicleForm />} />
          </Route>
          
          {/* 정비 관련 라우트 */}
          <Route path="maintenance">
            <Route index element={<MaintenanceList />} />
            <Route path=":id" element={<MaintenanceDetail />} />
            <Route path="new" element={<MaintenanceForm />} />
            <Route path="new/:vehicleId" element={<MaintenanceForm />} />
            <Route path=":id/edit" element={<MaintenanceForm />} />
          </Route>
          
          {/* 법정검사 관련 라우트 */}
          <Route path="inspections">
            <Route index element={<InspectionListPage />} />
            <Route path=":inspectionId" element={<InspectionDetailPage />} />
            <Route path="create" element={<InspectionCreatePage />} />
            <Route path=":inspectionId/edit" element={<InspectionEditPage />} />
            <Route path=":inspectionId/complete" element={<InspectionCompletePage />} />
          </Route>
          
          {/* 문의 관리 라우트 */}
          <Route path="inquiries" element={<InquiryList />} />
          
          {/* 보고서 라우트 */}
          <Route path="reports" element={<Reports />} />
          
          {/* 설정 라우트 */}
          <Route path="settings" element={<Settings />} />
          
          {/* 시스템 모니터링 라우트 */}
          <Route path="system-monitor" element={<SystemMonitor />} />
          
          {/* 드라이버 라우트 */}
          <Route path="drivers/*" element={<DriverRoutes />} />
          
          {/* 404 페이지 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
