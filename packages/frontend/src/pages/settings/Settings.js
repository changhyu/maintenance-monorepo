import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Tabs, Tab, Box, Switch, FormControlLabel, Button, Divider, Alert, Snackbar } from '@mui/material';
import { useDarkMode, useLanguage } from '../../context/AppContext';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `settings-tabpanel-${index}`, "aria-labelledby": `settings-tab-${index}`, ...other, children: value === index && (_jsx(Box, { sx: { p: 3 }, children: children })) }));
}
const Settings = () => {
    const [tabValue, setTabValue] = useState(0);
    const { darkMode, toggleDarkMode } = useDarkMode();
    const { language, setLanguage } = useLanguage();
    const [settings, setSettings] = useState({
        notifications: true,
        emailAlerts: true,
        autoSync: true,
        dataCache: true,
        offlineMode: false
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    // 설정값 로드
    useEffect(() => {
        // 실제 구현에서는 API 또는 로컬 스토리지에서 로드
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                setSettings({
                    notifications: parsedSettings.notifications ?? true,
                    emailAlerts: parsedSettings.emailAlerts ?? true,
                    autoSync: parsedSettings.autoSync ?? true,
                    dataCache: parsedSettings.dataCache ?? true,
                    offlineMode: parsedSettings.offlineMode ?? false
                });
            }
            catch (e) {
                console.error('설정 로드 중 오류 발생:', e);
            }
        }
    }, []);
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    const handleSettingChange = (setting, value) => {
        setSettings(prev => {
            const newSettings = { ...prev, [setting]: value };
            // 설정 저장
            localStorage.setItem('appSettings', JSON.stringify({
                ...newSettings,
            }));
            return newSettings;
        });
    };
    const handleSaveSettings = () => {
        // 설정 저장 로직
        localStorage.setItem('appSettings', JSON.stringify({
            ...settings,
        }));
        setSnackbar({
            open: true,
            message: '설정이 저장되었습니다.',
            severity: 'success'
        });
    };
    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };
    return (_jsxs(Container, { maxWidth: "md", sx: { mt: 4, mb: 4 }, children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "\uC124\uC815" }), _jsxs(Paper, { sx: { mt: 3 }, children: [_jsxs(Tabs, { value: tabValue, onChange: handleTabChange, indicatorColor: "primary", textColor: "primary", centered: true, children: [_jsx(Tab, { label: "\uC77C\uBC18" }), _jsx(Tab, { label: "\uC54C\uB9BC" }), _jsx(Tab, { label: "\uB370\uC774\uD130" }), _jsx(Tab, { label: "\uACC4\uC815" })] }), _jsxs(TabPanel, { value: tabValue, index: 0, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC77C\uBC18 \uC124\uC815" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: darkMode, onChange: toggleDarkMode, color: "primary" }), label: "\uB2E4\uD06C \uBAA8\uB4DC" }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uC5B8\uC5B4 \uC124\uC815" }), _jsxs(Box, { sx: { mt: 1 }, children: [_jsx(Button, { variant: language === 'ko' ? 'contained' : 'outlined', onClick: () => setLanguage('ko'), sx: { mr: 1 }, children: "\uD55C\uAD6D\uC5B4" }), _jsx(Button, { variant: language === 'en' ? 'contained' : 'outlined', onClick: () => setLanguage('en'), children: "English" })] })] }), _jsxs(TabPanel, { value: tabValue, index: 1, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC54C\uB9BC \uC124\uC815" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.notifications, onChange: (e) => handleSettingChange('notifications', e.target.checked), color: "primary" }), label: "\uC778\uC571 \uC54C\uB9BC" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.emailAlerts, onChange: (e) => handleSettingChange('emailAlerts', e.target.checked), color: "primary" }), label: "\uC774\uBA54\uC77C \uC54C\uB9BC" })] }), _jsxs(TabPanel, { value: tabValue, index: 2, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uB370\uC774\uD130 \uC124\uC815" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.autoSync, onChange: (e) => handleSettingChange('autoSync', e.target.checked), color: "primary" }), label: "\uC790\uB3D9 \uB3D9\uAE30\uD654" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.dataCache, onChange: (e) => handleSettingChange('dataCache', e.target.checked), color: "primary" }), label: "\uB370\uC774\uD130 \uCE90\uC2F1" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.offlineMode, onChange: (e) => handleSettingChange('offlineMode', e.target.checked), color: "primary" }), label: "\uC624\uD504\uB77C\uC778 \uBAA8\uB4DC" }), _jsx(Box, { sx: { mt: 2 }, children: _jsx(Button, { variant: "outlined", color: "error", children: "\uCE90\uC2DC \uB370\uC774\uD130 \uC0AD\uC81C" }) })] }), _jsxs(TabPanel, { value: tabValue, index: 3, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uACC4\uC815 \uC124\uC815" }), _jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "\uACC4\uC815 \uAD00\uB828 \uC124\uC815\uC740 \uC2DC\uC2A4\uD15C \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694." }), _jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Button, { variant: "contained", color: "primary", sx: { mr: 1 }, children: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD" }), _jsx(Button, { variant: "outlined", color: "error", children: "\uB85C\uADF8\uC544\uC6C3" })] })] }), _jsx(Box, { sx: { p: 2, display: 'flex', justifyContent: 'flex-end' }, children: _jsx(Button, { variant: "contained", color: "primary", onClick: handleSaveSettings, children: "\uC124\uC815 \uC800\uC7A5" }) })] }), _jsx(Snackbar, { open: snackbar.open, autoHideDuration: 6000, onClose: handleSnackbarClose, children: _jsx(Alert, { onClose: handleSnackbarClose, severity: snackbar.severity, children: snackbar.message }) })] }));
};
export default Settings;
