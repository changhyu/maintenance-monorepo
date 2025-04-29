import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
// 인증 상태를 확인하기 위한 임시 함수 (실제로는 AuthContext에서 제공)
const useAuth = () => {
    // 임시 인증 상태
    return {
        isAuthenticated: true, // 실제 구현에서는 토큰 검증이나 상태 확인을 통해 설정
        user: {
            id: 'user1',
            role: 'technician',
            name: '김정비'
        },
        loading: false
    };
};
/**
 * Todo 컴포넌트 인증 래퍼
 * 사용자 인증 상태와 권한을 확인하여 접근 제어
 */
const TodoAuthWrapper = ({ children, requiredRoles = [] }) => {
    const { isAuthenticated, user, loading } = useAuth();
    // 인증 정보 로딩 중
    if (loading) {
        return _jsx("div", { className: "p-4", children: "\uC778\uC99D \uC815\uBCF4\uB97C \uD655\uC778\uD558\uB294 \uC911..." });
    }
    // 인증되지 않은 경우 로그인 페이지로 리다이렉트
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    // 역할 기반 접근 제어 (RBAC)
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        return (_jsxs("div", { className: "p-4 bg-red-100 text-red-800 rounded", children: [_jsx("h3", { className: "font-bold", children: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { children: "\uC774 \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD558\uB824\uBA74 \uB2E4\uC74C \uC5ED\uD560 \uC911 \uD558\uB098\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4:" }), _jsx("ul", { className: "list-disc list-inside", children: requiredRoles.map(role => (_jsx("li", { children: role }, role))) })] }));
    }
    // 인증 및 권한 확인 완료, 자식 컴포넌트 렌더링
    return _jsx(_Fragment, { children: children });
};
export default TodoAuthWrapper;
