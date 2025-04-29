import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, Paper, Divider } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
/**
 * 접근 권한 거부 페이지 컴포넌트
 * 사용자가 접근 권한이 없는 페이지에 접근했을 때 표시
 */
const AccessDenied = () => {
    const navigate = useNavigate();
    return (_jsx(Container, { maxWidth: "md", children: _jsx(Box, { sx: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '80vh',
                textAlign: 'center'
            }, children: _jsxs(Paper, { elevation: 3, sx: {
                    p: 4,
                    maxWidth: 600,
                    width: '100%',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'error.light'
                }, children: [_jsx(BlockIcon, { color: "error", sx: { fontSize: 80, mb: 2 } }), _jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, color: "error", children: "\uC811\uADFC \uAD8C\uD55C \uC5C6\uC74C" }), _jsx(Typography, { variant: "body1", paragraph: true, children: "\uC774 \uD398\uC774\uC9C0\uC5D0 \uC811\uADFC\uD560 \uC218 \uC788\uB294 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uD544\uC694\uD55C \uAD8C\uD55C\uC774 \uC788\uB2E4\uACE0 \uC0DD\uAC01\uD558\uC2DC\uBA74 \uC2DC\uC2A4\uD15C \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694." }), _jsx(Divider, { sx: { my: 3 } }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(ArrowBackIcon, {}), onClick: () => navigate(-1), children: "\uC774\uC804 \uD398\uC774\uC9C0\uB85C" }), _jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(HomeIcon, {}), onClick: () => navigate('/'), children: "\uBA54\uC778\uC73C\uB85C \uAC00\uAE30" })] })] }) }) }));
};
export default AccessDenied;
