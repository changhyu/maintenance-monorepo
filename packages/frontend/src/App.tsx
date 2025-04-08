import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import VehicleReportPage from './pages/VehicleReportPage';
import BookingPage from './pages/BookingPage';
import BookingHistoryPage from './pages/BookingHistoryPage';
import './App.css';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/vehicles" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="vehicles" element={<VehicleReportPage />} />
          <Route path="vehicles/:vehicleId" element={<VehicleDetailPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="booking/history" element={<BookingHistoryPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App; 