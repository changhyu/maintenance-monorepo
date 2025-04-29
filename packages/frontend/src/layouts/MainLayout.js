import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Box, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Avatar, Menu, MenuItem, Container, } from '@mui/material';
import { Menu as MenuIcon, Home as HomeIcon, DirectionsCar as CarIcon, Build as MaintenanceIcon, Store as ShopIcon, Settings as SettingsIcon, Notifications as NotificationsIcon, ChevronLeft as ChevronLeftIcon, } from '@mui/icons-material';
import OfflineNotice from '../components/OfflineNotice';
const drawerWidth = 240;
const MainLayout = ({ children }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const menuItems = [
        { text: '대시보드', path: '/', icon: _jsx(HomeIcon, {}) },
        { text: '차량 관리', path: '/vehicles', icon: _jsx(CarIcon, {}) },
        { text: '정비 관리', path: '/maintenance', icon: _jsx(MaintenanceIcon, {}) },
        { text: '정비소', path: '/shops', icon: _jsx(ShopIcon, {}) },
    ];
    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };
    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };
    const handleMenuClick = (path) => {
        navigate(path);
        setDrawerOpen(false);
    };
    const isActive = (path) => {
        if (path === '/' && location.pathname !== '/')
            return false;
        return location.pathname.startsWith(path);
    };
    return (_jsxs(Box, { sx: { display: 'flex' }, children: [_jsx(AppBar, { position: "fixed", sx: {
                    width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
                    ml: { md: `${drawerOpen ? drawerWidth : 0}px` },
                    transition: theme => theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: handleDrawerToggle, sx: { mr: 2 }, children: _jsx(MenuIcon, {}) }), _jsx(Typography, { variant: "h6", noWrap: true, component: "div", sx: { flexGrow: 1 }, children: "\uCC28\uB7C9 \uC815\uBE44 \uAD00\uB9AC \uC2DC\uC2A4\uD15C" }), _jsx(IconButton, { color: "inherit", sx: { mr: 1 }, children: _jsx(NotificationsIcon, {}) }), _jsx(IconButton, { edge: "end", "aria-label": "account of current user", "aria-haspopup": "true", onClick: handleProfileMenuOpen, color: "inherit", children: _jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: 'secondary.main' }, children: "A" }) }), _jsxs(Menu, { anchorEl: anchorEl, anchorOrigin: {
                                vertical: 'bottom',
                                horizontal: 'right',
                            }, keepMounted: true, transformOrigin: {
                                vertical: 'top',
                                horizontal: 'right',
                            }, open: Boolean(anchorEl), onClose: handleProfileMenuClose, children: [_jsx(MenuItem, { onClick: handleProfileMenuClose, children: "\uD504\uB85C\uD544" }), _jsx(MenuItem, { onClick: handleProfileMenuClose, children: "\uC124\uC815" }), _jsx(MenuItem, { onClick: handleProfileMenuClose, children: "\uB85C\uADF8\uC544\uC6C3" })] })] }) }), _jsxs(Drawer, { sx: {
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }, variant: "persistent", anchor: "left", open: drawerOpen, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', px: 1, py: 2 }, children: [_jsx(Typography, { variant: "h6", sx: { flexGrow: 1, pl: 1 }, children: "\uBA54\uB274" }), _jsx(IconButton, { onClick: handleDrawerToggle, children: _jsx(ChevronLeftIcon, {}) })] }), _jsx(Divider, {}), _jsx(List, { children: menuItems.map((item) => (_jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { selected: isActive(item.path), onClick: () => handleMenuClick(item.path), children: [_jsx(ListItemIcon, { sx: {
                                            color: isActive(item.path) ? 'primary.main' : 'inherit',
                                        }, children: item.icon }), _jsx(ListItemText, { primary: item.text })] }) }, item.text))) }), _jsx(Divider, {}), _jsx(List, { children: _jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { onClick: () => handleMenuClick('/settings'), children: [_jsx(ListItemIcon, { children: _jsx(SettingsIcon, {}) }), _jsx(ListItemText, { primary: "\uC124\uC815" })] }) }) })] }), _jsxs(Box, { component: "main", sx: {
                    flexGrow: 1,
                    p: 3,
                    ml: { md: `${drawerOpen ? drawerWidth : 0}px` },
                    width: { xs: '100%', md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
                    transition: theme => theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }, children: [_jsx(Toolbar, {}), " ", _jsx(OfflineNotice, {}), _jsx(Container, { maxWidth: "xl", sx: { mt: 2 }, children: children })] })] }));
};
export default MainLayout;
