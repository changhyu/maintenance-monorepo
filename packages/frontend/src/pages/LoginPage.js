import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
/**
 * 로그인 페이지 컴포넌트
 */
const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);
    /**
     * 로그인 폼 제출 처리
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('이메일과 비밀번호를 모두 입력해주세요.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // 실제 API 호출은 향후 구현
            console.log('Login attempt with:', { email, rememberMe });
            // 로그인 성공 시 대시보드로 이동 (임시 구현)
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 로컬 스토리지에 임시 토큰 저장
            localStorage.setItem('authToken', 'temp-token-123');
            // 홈 페이지로 이동
            navigate('/');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
            console.error('Login failed:', err);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "mt-6 text-3xl font-extrabold text-gray-900", children: "\uCC28\uB7C9 \uC815\uBE44 \uAD00\uB9AC \uC2DC\uC2A4\uD15C" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: "\uACC4\uC815\uC5D0 \uB85C\uADF8\uC778\uD558\uC138\uC694" })] }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [error && (_jsx("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative", children: error })), _jsxs("div", { className: "rounded-md shadow-sm -space-y-px", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email-address", className: "sr-only", children: "\uC774\uBA54\uC77C \uC8FC\uC18C" }), _jsx("input", { id: "email-address", name: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: e => setEmail(e.target.value), className: "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm", placeholder: "\uC774\uBA54\uC77C \uC8FC\uC18C" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { id: "password", name: "password", type: "password", autoComplete: "current-password", required: true, value: password, onChange: e => setPassword(e.target.value), className: "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm", placeholder: "\uBE44\uBC00\uBC88\uD638" })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "remember-me", name: "remember-me", type: "checkbox", checked: rememberMe, onChange: e => setRememberMe(e.target.checked), className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" }), _jsx("label", { htmlFor: "remember-me", className: "ml-2 block text-sm text-gray-900", children: "\uB85C\uADF8\uC778 \uC0C1\uD0DC \uC720\uC9C0" })] }), _jsx("div", { className: "text-sm", children: _jsx(Link, { to: "/forgot-password", className: "font-medium text-blue-600 hover:text-blue-500", children: "\uBE44\uBC00\uBC88\uD638\uB97C \uC78A\uC73C\uC168\uB098\uC694?" }) })] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: loading, className: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300", children: loading ? '로그인 중...' : '로그인' }) }), _jsx("div", { className: "text-center", children: _jsxs("p", { className: "text-sm text-gray-600", children: ["\uACC4\uC815\uC774 \uC5C6\uC73C\uC2E0\uAC00\uC694?", ' ', _jsx(Link, { to: "/register", className: "font-medium text-blue-600 hover:text-blue-500", children: "\uD68C\uC6D0\uAC00\uC785" })] }) })] })] }) }));
};
export default LoginPage;
