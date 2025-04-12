import React from 'react';
import { RouteObject } from 'react-router-dom';

// 실제 페이지 컴포넌트 임포트
import Dashboard from '../pages/Dashboard';
import VehicleList from '../pages/VehicleList';
import VehicleDetails from '../pages/VehicleDetails';
import MaintenanceHistory from '../pages/MaintenanceHistory';
import MaintenanceSchedule from '../pages/MaintenanceSchedule';
import ShopList from '../pages/ShopList';
import ShopDetails from '../pages/ShopDetails';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ProfilePage from '../pages/ProfilePage';

/**
 * 애플리케이션 라우트 정의
 */
const routes: RouteObject[] = [
  {
    path: '/',
    element: <Dashboard />,
    id: 'dashboard'
  },
  {
    path: '/vehicles',
    element: <VehicleList />,
    id: 'vehicles-list'
  },
  {
    path: '/vehicles/:id',
    element: <VehicleDetails />,
    id: 'vehicle-details'
  },
  {
    path: '/maintenance',
    element: <MaintenanceHistory />,
    id: 'maintenance-history'
  },
  {
    path: '/maintenance/schedule',
    element: <MaintenanceSchedule />,
    id: 'maintenance-schedule'
  },
  {
    path: '/shops',
    element: <ShopList />,
    id: 'shops-list'
  },
  {
    path: '/shops/:id',
    element: <ShopDetails />,
    id: 'shop-details'
  },
  {
    path: '/login',
    element: <LoginPage />,
    id: 'login'
  },
  {
    path: '/register',
    element: <RegisterPage />,
    id: 'register'
  },
  {
    path: '/profile',
    element: <ProfilePage />,
    id: 'profile'
  },
  {
    path: '/settings',
    element: <Settings />,
    id: 'settings'
  },
  {
    path: '*',
    element: <NotFound />,
    id: 'not-found'
  }
];

export default routes;
