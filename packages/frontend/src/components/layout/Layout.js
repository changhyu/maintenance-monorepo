import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Header } from './Header';
export const Layout = ({ children, userName, userRole, onLogout }) => {
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Header, { userFullName: userName, userRole: userRole, onLogout: onLogout }), _jsx("main", { className: "py-6", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: children }) }), _jsx("footer", { className: "bg-white border-t border-gray-200", children: _jsx("div", { className: "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8", children: _jsxs("p", { className: "text-center text-sm text-gray-500", children: ["\u00A9 ", new Date().getFullYear(), " \uCC28\uB7C9 \uAD00\uB9AC \uC2DC\uC2A4\uD15C. All rights reserved."] }) }) })] }));
};
