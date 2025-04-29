import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Paper, Link, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('이메일과 비밀번호를 모두 입력해주세요.');
            return;
        }
        setIsLoading(true);
        try {
            // 실제 구현에서는 API 호출
            // const response = await authService.login(email, password);
            // 테스트를 위한 지연
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 개발을 위해 하드코딩된 자격 증명
            if (email === 'admin@example.com' && password === 'password') {
                // 로그인 성공 시 토큰 저장
                localStorage.setItem('authToken', 'sample-jwt-token');
                // 로그인 상태 업데이트
                onLogin();
                // 메인 페이지로 리디렉션
                navigate('/');
            }
            else {
                // 로그인 실패
                setError('이메일 또는 비밀번호가 잘못되었습니다.');
            }
        }
        catch (err) {
            // 네트워크 오류 또는 서버 오류
            setError('로그인 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
            console.error('로그인 오류:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx(Container, { maxWidth: "sm", children: _jsxs(Box, { sx: {
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }, children: [_jsxs(Paper, { elevation: 3, sx: {
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                    }, children: [_jsx(Typography, { component: "h1", variant: "h4", gutterBottom: true, children: "\uCC28\uB7C9 \uC815\uBE44 \uAD00\uB9AC \uC2DC\uC2A4\uD15C" }), _jsx(Typography, { component: "h2", variant: "h5", sx: { mb: 3 }, children: "\uB85C\uADF8\uC778" }), error && (_jsx(Alert, { severity: "error", sx: { width: '100%', mb: 2 }, children: error })), _jsxs(Box, { component: "form", onSubmit: handleSubmit, sx: { mt: 1, width: '100%' }, children: [_jsx(TextField, { margin: "normal", required: true, fullWidth: true, id: "email", label: "\uC774\uBA54\uC77C", name: "email", autoComplete: "email", autoFocus: true, value: email, onChange: (e) => setEmail(e.target.value), disabled: isLoading }), _jsx(TextField, { margin: "normal", required: true, fullWidth: true, name: "password", label: "\uBE44\uBC00\uBC88\uD638", type: "password", id: "password", autoComplete: "current-password", value: password, onChange: (e) => setPassword(e.target.value), disabled: isLoading }), _jsx(Button, { type: "submit", fullWidth: true, variant: "contained", sx: { mt: 3, mb: 2, py: 1.5 }, disabled: isLoading, children: isLoading ? _jsx(CircularProgress, { size: 24 }) : '로그인' }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mt: 2 }, children: [_jsx(Link, { href: "#", variant: "body2", children: "\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30" }), _jsx(Link, { href: "#", variant: "body2", children: "\uACC4\uC815 \uB4F1\uB85D \uC694\uCCAD" })] })] })] }), _jsxs(Box, { sx: { mt: 3, textAlign: 'center' }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u00A9 ", new Date().getFullYear(), " \uCC28\uB7C9 \uC815\uBE44 \uAD00\uB9AC \uC2DC\uC2A4\uD15C"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: "\uB3C4\uC6C0\uC774 \uD544\uC694\uD558\uC2DC\uBA74 \uC2DC\uC2A4\uD15C \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694." })] })] }) }));
};
export default Login;
