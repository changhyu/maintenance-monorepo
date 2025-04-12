import React from 'react';

import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, userName, userRole, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header userFullName={userName} userRole={userRole} onLogout={onLogout} />
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} 차량 관리 시스템. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
