import { Routes, Route, Navigate } from 'react-router-dom';

// 레이아웃
import MainLayout from '../components/layout/MainLayout';

// 페이지
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
// 차량 관련 페이지
import VehicleList from '../pages/vehicle/VehicleList';
import VehicleDetail from '../pages/vehicle/VehicleDetail';
import VehicleForm from '../pages/vehicle/VehicleForm';
// 정비 관련 페이지
import MaintenanceList from '../pages/maintenance/MaintenanceList';
import MaintenanceDetail from '../pages/maintenance/MaintenanceDetail';
import MaintenanceForm from '../pages/maintenance/MaintenanceForm';
// 보고서 페이지
import Reports from '../pages/reports/Reports';
// 설정 페이지
import Settings from '../pages/settings/Settings';
// 인증 관련 페이지
import Login from '../pages/auth/Login';
// 인증된 라우트 컴포넌트
import ProtectedRoute from './ProtectedRoute';

/**
 * 애플리케이션 라우터 컴포넌트
 * 모든 라우트 경로와 컴포넌트를 정의합니다.
 */
const AppRoutes = ({ isAuthenticated, onLogin }) => {
  return (
    <Routes>
      {/* 로그인 페이지 */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login onLogin={onLogin} />
          )
        }
      />

      {/* 메인 레이아웃을 감싸는 보호된 경로 */}
      <Route
        path="/"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* 대시보드 */}
        <Route index element={<Dashboard />} />

        {/* 차량 관련 페이지 */}
        <Route path="vehicles">
          <Route index element={<VehicleList />} />
          <Route path=":id" element={<VehicleDetail />} />
          <Route path="new" element={<VehicleForm />} />
          <Route path=":id/edit" element={<VehicleForm />} />
        </Route>

        {/* 정비 관련 페이지 */}
        <Route path="maintenance">
          <Route index element={<MaintenanceList />} />
          <Route path=":id" element={<MaintenanceDetail />} />
          <Route path="new" element={<MaintenanceForm />} />
          <Route path="new/:vehicleId" element={<MaintenanceForm />} />
          <Route path=":id/edit" element={<MaintenanceForm />} />
        </Route>

        {/* 보고서 */}
        <Route path="reports" element={<Reports />} />

        {/* 설정 */}
        <Route path="settings" element={<Settings />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;