import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DriverList from '../components/driver/DriverList';
import DriverDetail from '../components/driver/DriverDetail';
import DriverForm from '../components/driver/DriverForm';
import DriverAnalytics from '../components/driver/DriverAnalytics';
import DriverDocuments from '../components/driver/DriverDocuments';

const DriverRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<DriverList />} />
      <Route path="/new" element={
        <DriverForm
          onSubmit={() => window.location.href = '/drivers'}
          onCancel={() => window.history.back()}
        />
      } />
      <Route path="/:id" element={<DriverDetail />} />
      <Route path="/:id/edit" element={
        <DriverForm
          onSubmit={() => window.location.href = '/drivers'}
          onCancel={() => window.history.back()}
        />
      } />
      <Route path="/:id/analytics" element={<DriverAnalytics />} />
      <Route path="/:id/documents" element={<DriverDocuments />} />
      <Route path="*" element={<Navigate to="/drivers" replace />} />
    </Routes>
  );
};

export default DriverRoutes; 