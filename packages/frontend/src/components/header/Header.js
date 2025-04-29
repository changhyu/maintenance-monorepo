import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../components/ThemeContext';
import { useAuth } from '../../context/AuthContext';
// 내비게이션 메뉴 항목 정의
const navItems = [
    { path: '/', label: '대시보드', requiresAuth: false },
    { path: '/vehicles', label: '차량 관리', requiresAuth: true },
    { path: '/maintenance', label: '정비 기록', requiresAuth: true },
    { path: '/notices', label: '공지사항', requiresAuth: false },
    { path: '/news', label: '자동차 뉴스', requiresAuth: false },
    { path: '/navigation', label: '내비게이션', requiresAuth: false },
    { path: '/settings', label: '설정', requiresAuth: true }
];
const Header = () => {
    const { theme, toggleTheme } = useTheme();
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();
    return (_jsx("header", { className: "bg-white dark:bg-gray-800 shadow-md", children: _jsxs("div", { className: "container mx-auto px-4 py-3 flex justify-between items-center", children: [_jsx("div", { className: "flex items-center", children: _jsx(Link, { to: "/", className: "text-xl font-bold text-blue-600 dark:text-blue-400", children: "\uCC28\uB7C9\uC815\uBE44\uAD00\uB9AC" }) }), _jsx("nav", { className: "hidden md:flex space-x-6", children: navItems.map(item => (!item.requiresAuth || isAuthenticated) && (_jsx(Link, { to: item.path, className: `text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 ${location.pathname === item.path
                            ? 'font-semibold text-blue-600 dark:text-blue-400'
                            : ''}`, children: item.label }, item.path))) }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("button", { onClick: toggleTheme, className: "p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700", "aria-label": theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환', children: theme === 'dark' ? '☀️' : '🌙' }), isAuthenticated ? (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-gray-700 dark:text-gray-300", children: user?.name || '사용자' }), _jsx("button", { onClick: logout, className: "py-1 px-3 bg-red-600 hover:bg-red-700 text-white rounded", children: "\uB85C\uADF8\uC544\uC6C3" })] })) : (_jsxs("div", { className: "flex space-x-2", children: [_jsx(Link, { to: "/login", className: "py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded", children: "\uB85C\uADF8\uC778" }), _jsx(Link, { to: "/register", className: "py-1 px-3 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded", children: "\uD68C\uC6D0\uAC00\uC785" })] }))] })] }) }));
};
export default Header;
