import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
const NotFound = () => {
    const navigate = useNavigate();
    return (_jsxs(Box, { sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            textAlign: 'center',
            padding: 2
        }, children: [_jsx(Typography, { variant: "h2", component: "h1", gutterBottom: true, children: "404" }), _jsx(Typography, { variant: "h5", component: "h2", gutterBottom: true, children: "\uD398\uC774\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mb: 4 }, children: "\uC694\uCCAD\uD558\uC2E0 \uD398\uC774\uC9C0\uAC00 \uC874\uC7AC\uD558\uC9C0 \uC54A\uAC70\uB098 \uC774\uB3D9\uB418\uC5C8\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), _jsx(Button, { variant: "contained", color: "primary", onClick: () => navigate('/'), children: "\uBA54\uC778\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30" })] }));
};
export default NotFound;
