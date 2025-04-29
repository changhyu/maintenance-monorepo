import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from 'react-router-dom';
/**
 * 인증된 사용자만 접근할 수 있는 보호된 라우트
 * 인증되지 않은 사용자는 로그인 페이지로 리다이렉트합니다.
 */
const ProtectedRoute = ({ isAuthenticated, children, redirectPath = '/login' }) => {
    const location = useLocation();
    if (!isAuthenticated) {
        // 현재 위치를 state로 전달하여 로그인 후 원래 페이지로 돌아올 수 있도록 함
        return (_jsx(Navigate, { to: redirectPath, state: { from: location }, replace: true }));
    }
    return _jsx(_Fragment, { children: children });
};
export default ProtectedRoute;
