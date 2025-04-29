import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Menu, MenuItem, Badge, Box, Avatar, useTheme } from '@mui/material';
import { Menu as MenuIcon, Notifications as NotificationsIcon, Brightness4 as DarkIcon, Brightness7 as LightIcon } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
export const Header = ({ onMenuClick }) => {
    const theme = useTheme();
    const { user, logout } = useAuth();
    const { mode, toggleTheme } = useThemeMode();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleNotificationMenuOpen = (event) => {
        setNotificationAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleNotificationMenuClose = () => {
        setNotificationAnchorEl(null);
    };
    const handleLogout = () => {
        handleMenuClose();
        logout();
    };
    return (_jsx(AppBar, { position: "fixed", sx: {
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary
        }, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { edge: "start", color: "inherit", "aria-label": "open drawer", onClick: onMenuClick, sx: { mr: 2 }, children: _jsx(MenuIcon, {}) }), _jsx(Typography, { variant: "h6", noWrap: true, component: "div", sx: { flexGrow: 1 }, children: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(IconButton, { color: "inherit", onClick: toggleTheme, children: mode === 'dark' ? _jsx(LightIcon, {}) : _jsx(DarkIcon, {}) }), _jsx(IconButton, { color: "inherit", onClick: handleNotificationMenuOpen, children: _jsx(Badge, { badgeContent: 4, color: "error", children: _jsx(NotificationsIcon, {}) }) }), _jsx(IconButton, { edge: "end", onClick: handleProfileMenuOpen, color: "inherit", children: _jsx(Avatar, { alt: user?.name || 'User', src: user?.avatar, sx: { width: 32, height: 32 } }) })] }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, onClick: handleMenuClose, children: [_jsx(MenuItem, { onClick: handleMenuClose, children: "\uD504\uB85C\uD544" }), _jsx(MenuItem, { onClick: handleMenuClose, children: "\uC124\uC815" }), _jsx(MenuItem, { onClick: handleLogout, children: "\uB85C\uADF8\uC544\uC6C3" })] }), _jsxs(Menu, { anchorEl: notificationAnchorEl, open: Boolean(notificationAnchorEl), onClose: handleNotificationMenuClose, onClick: handleNotificationMenuClose, children: [_jsx(MenuItem, { onClick: handleNotificationMenuClose, children: "\uC0C8\uB85C\uC6B4 \uC54C\uB9BC 1" }), _jsx(MenuItem, { onClick: handleNotificationMenuClose, children: "\uC0C8\uB85C\uC6B4 \uC54C\uB9BC 2" }), _jsx(MenuItem, { onClick: handleNotificationMenuClose, children: "\uBAA8\uB4E0 \uC54C\uB9BC \uBCF4\uAE30" })] })] }) }));
};
export default Header;
