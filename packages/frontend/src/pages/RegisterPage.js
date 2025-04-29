import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
/**
 * 회원가입 페이지 컴포넌트
 */
const RegisterPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user', // 기본 역할
        company: '',
        agreeTerms: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});
    /**
     * 입력 필드 변경 핸들러
     */
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const checked = e.target.checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // 필드 변경 시 관련 오류 지우기
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };
    /**
     * 폼 유효성 검사
     */
    const validateForm = () => {
        const newErrors = {};
        // 이름 검사
        if (!formData.name.trim()) {
            newErrors.name = '이름을 입력해주세요.';
        }
        // 이메일 검사
        if (!formData.email) {
            newErrors.email = '이메일을 입력해주세요.';
        }
        else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = '유효한 이메일 주소를 입력해주세요.';
        }
        // 비밀번호 검사
        if (!formData.password) {
            newErrors.password = '비밀번호를 입력해주세요.';
        }
        else if (formData.password.length < 8) {
            newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
        }
        // 비밀번호 확인 검사
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
        }
        // 기업용 사용자인 경우 회사명 필수
        if (formData.role === 'enterprise' && !formData.company) {
            newErrors.company = '회사명을 입력해주세요.';
        }
        // 이용약관 동의 검사
        if (!formData.agreeTerms) {
            newErrors.agreeTerms = '이용약관에 동의해주세요.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    /**
     * 회원가입 폼 제출 처리
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // 실제 API 호출은 향후 구현
            console.log('Registration attempt with:', formData);
            // 회원가입 성공 시 (임시 구현)
            await new Promise(resolve => setTimeout(resolve, 1500));
            // 로그인 페이지로 이동
            navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.');
            console.error('Registration failed:', err);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "mt-6 text-3xl font-extrabold text-gray-900", children: "\uD68C\uC6D0\uAC00\uC785" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: "\uCC28\uB7C9 \uC815\uBE44 \uAD00\uB9AC \uC2DC\uC2A4\uD15C\uC5D0 \uAC00\uC785\uD558\uC138\uC694" })] }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [error && (_jsx("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative", children: error })), _jsxs("div", { className: "rounded-md shadow-sm space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-gray-700", children: "\uC774\uB984" }), _jsx("input", { id: "name", name: "name", type: "text", autoComplete: "name", required: true, value: formData.name, onChange: handleChange, className: `mt-1 appearance-none block w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`, placeholder: "\uD64D\uAE38\uB3D9" }), errors.name && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.name })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700", children: "\uC774\uBA54\uC77C \uC8FC\uC18C" }), _jsx("input", { id: "email", name: "email", type: "email", autoComplete: "email", required: true, value: formData.email, onChange: handleChange, className: `mt-1 appearance-none block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`, placeholder: "you@example.com" }), errors.email && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.email })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700", children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { id: "password", name: "password", type: "password", autoComplete: "new-password", required: true, value: formData.password, onChange: handleChange, className: `mt-1 appearance-none block w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`, placeholder: "8\uC790 \uC774\uC0C1 \uC785\uB825" }), errors.password && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.password })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirmPassword", className: "block text-sm font-medium text-gray-700", children: "\uBE44\uBC00\uBC88\uD638 \uD655\uC778" }), _jsx("input", { id: "confirmPassword", name: "confirmPassword", type: "password", autoComplete: "new-password", required: true, value: formData.confirmPassword, onChange: handleChange, className: `mt-1 appearance-none block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`, placeholder: "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC785\uB825" }), errors.confirmPassword && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.confirmPassword }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "role", className: "block text-sm font-medium text-gray-700", children: "\uACC4\uC815 \uC720\uD615" }), _jsxs("select", { id: "role", name: "role", value: formData.role, onChange: handleChange, className: "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", children: [_jsx("option", { value: "user", children: "\uAC1C\uC778 \uC0AC\uC6A9\uC790" }), _jsx("option", { value: "technician", children: "\uC815\uBE44\uC0AC" }), _jsx("option", { value: "enterprise", children: "\uAE30\uC5C5 \uC0AC\uC6A9\uC790" })] })] }), formData.role === 'enterprise' && (_jsxs("div", { children: [_jsx("label", { htmlFor: "company", className: "block text-sm font-medium text-gray-700", children: "\uD68C\uC0AC\uBA85" }), _jsx("input", { id: "company", name: "company", type: "text", value: formData.company, onChange: handleChange, className: `mt-1 appearance-none block w-full px-3 py-2 border ${errors.company ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`, placeholder: "\uD68C\uC0AC\uBA85 \uC785\uB825" }), errors.company && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.company })] })), _jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "flex items-center h-5", children: _jsx("input", { id: "agreeTerms", name: "agreeTerms", type: "checkbox", checked: formData.agreeTerms, onChange: handleChange, className: `focus:ring-blue-500 h-4 w-4 text-blue-600 border ${errors.agreeTerms ? 'border-red-300' : 'border-gray-300'} rounded` }) }), _jsxs("div", { className: "ml-3 text-sm", children: [_jsxs("label", { htmlFor: "agreeTerms", className: "font-medium text-gray-700", children: [_jsx(Link, { to: "/terms", className: "text-blue-600 hover:text-blue-500", children: "\uC774\uC6A9\uC57D\uAD00" }), "\uC5D0 \uB3D9\uC758\uD569\uB2C8\uB2E4"] }), errors.agreeTerms && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.agreeTerms }))] })] })] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: loading, className: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300", children: loading ? '가입 중...' : '회원가입' }) }), _jsx("div", { className: "text-center", children: _jsxs("p", { className: "text-sm text-gray-600", children: ["\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uC73C\uC2E0\uAC00\uC694?", ' ', _jsx(Link, { to: "/login", className: "font-medium text-blue-600 hover:text-blue-500", children: "\uB85C\uADF8\uC778" })] }) })] })] }) }));
};
export default RegisterPage;
