import React from 'react';
import { RouteObject } from 'react-router-dom';

// 임시 페이지 컴포넌트 (나중에 실제 페이지로 대체)
const DashboardPage = () => <div>대시보드 페이지</div>;
const VehiclesPage = () => <div>차량 관리 페이지</div>;
const MaintenancePage = () => <div>정비 기록 페이지</div>;
const SettingsPage = () => <div>설정 페이지</div>;
const NotFoundPage = () => <div>페이지를 찾을 수 없습니다.</div>;

/**
 * 애플리케이션 라우트 정의
 */
const routes: RouteObject[] = [
  {
    path: "/",
    element: <DashboardPage />,
    id: "dashboard"
  },
  {
    path: "/vehicles",
    element: <VehiclesPage />,
    id: "vehicles"
  },
  {
    path: "/maintenance",
    element: <MaintenancePage />,
    id: "maintenance"
  },
  {
    path: "/settings",
    element: <SettingsPage />,
    id: "settings"
  },
  {
    path: "*",
    element: <NotFoundPage />,
    id: "not-found"
  }
];

export default routes; 