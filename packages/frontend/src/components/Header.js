import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Avatar, Menu, MenuItem, Badge, useTheme, Box, } from '@mui/material';
import { Menu as MenuIcon, Notifications as NotificationsIcon, Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon, } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../hooks/useThemeMode';
export const Header = ({ onMenuClick }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [notificationAnchor, setNotificationAnchor] = React.useState(null);
    const { user, logout } = useAuth();
    const { mode, toggleTheme } = useThemeMode();
    const theme = useTheme();
    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };
    const handleNotificationClick = (event) => {
        setNotificationAnchor(event.currentTarget);
    };
    const handleNotificationClose = () => {
        setNotificationAnchor(null);
    };
    const handleLogout = () => {
        handleProfileMenuClose();
        logout();
    };
    return (_jsx(AppBar, { position: "fixed", sx: {
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
        }, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: onMenuClick, sx: { mr: 2 }, children: _jsx(MenuIcon, {}) }), _jsx(Typography, { variant: "h6", noWrap: true, component: "div", sx: { flexGrow: 1 }, children: "\uCC28\uB7C9 \uC815\uBE44 \uAD00\uB9AC \uC2DC\uC2A4\uD15C" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(IconButton, { color: "inherit", onClick: toggleTheme, children: mode === 'dark' ? _jsx(LightModeIcon, {}) : _jsx(DarkModeIcon, {}) }), _jsx(IconButton, { color: "inherit", onClick: handleNotificationClick, children: _jsx(Badge, { badgeContent: 4, color: "error", children: _jsx(NotificationsIcon, {}) }) }), _jsx(IconButton, { edge: "end", "aria-label": "account of current user", "aria-haspopup": "true", onClick: handleProfileMenuOpen, color: "inherit", sx: { ml: 1 }, children: _jsx(Avatar, { sx: {
                                    width: 32,
                                    height: 32,
                                    bgcolor: theme.palette.secondary.main
                                }, children: user?.name?.[0] || 'U' }) })] }), _jsxs(Menu, { anchorEl: notificationAnchor, open: Boolean(notificationAnchor), onClose: handleNotificationClose, PaperProps: {
                        sx: { width: 320, maxHeight: 400 }
                    }, children: [_jsx(MenuItem, { onClick: handleNotificationClose, children: "\uC0C8\uB85C\uC6B4 \uC815\uBE44 \uC694\uCCAD\uC774 \uC788\uC2B5\uB2C8\uB2E4" }), _jsx(MenuItem, { onClick: handleNotificationClose, children: "\uCC28\uB7C9 \uC810\uAC80 \uC77C\uC815\uC774 \uB2E4\uAC00\uC635\uB2C8\uB2E4" })] }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleProfileMenuClose, children: [_jsx(MenuItem, { onClick: handleProfileMenuClose, children: "\uD504\uB85C\uD544" }), _jsx(MenuItem, { onClick: handleProfileMenuClose, children: "\uC124\uC815" }), _jsx(MenuItem, { onClick: handleLogout, children: "\uB85C\uADF8\uC544\uC6C3" })] })] }) }));
};
export default Header;
