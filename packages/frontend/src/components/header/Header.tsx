import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../components/ThemeContext';
import { useAuth } from '../../context/AuthContext';

// 내비게이션 항목 타입
interface NavItem {
  path: string;
  label: string;
  requiresAuth: boolean;
}

// 내비게이션 메뉴 항목 정의
const navItems: NavItem[] = [
  { path: '/', label: '대시보드', requiresAuth: false },
  { path: '/vehicles', label: '차량 관리', requiresAuth: true },
  { path: '/maintenance', label: '정비 기록', requiresAuth: true },
  { path: '/settings', label: '설정', requiresAuth: true },
];

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* 로고 */}
        <div className="flex items-center">
          <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
            차량정비관리
          </Link>
        </div>

        {/* 내비게이션 */}
        <nav className="hidden md:flex space-x-6">
          {navItems.map((item) => (
            (!item.requiresAuth || isAuthenticated) && (
              <Link
                key={item.path}
                to={item.path}
                className={`text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 ${
                  location.pathname === item.path ? 'font-semibold text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                {item.label}
              </Link>
            )
          ))}
        </nav>

        {/* 사용자 섹션 */}
        <div className="flex items-center space-x-4">
          {/* 테마 토글 버튼 */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* 인증 관련 버튼 */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <span className="text-gray-700 dark:text-gray-300">
                {user?.name || '사용자'}
              </span>
              <button
                onClick={logout}
                className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Link
                to="/login"
                className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                로그인
              </Link>
              <Link
                to="/register"
                className="py-1 px-3 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 