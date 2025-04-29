import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/AppContext';
import TranslateIcon from '@mui/icons-material/Translate';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
// 지원 언어 설정
const languages = [
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' }
];
/**
 * 언어 전환 컴포넌트
 * 사용자가 애플리케이션 언어를 변경할 수 있게 합니다.
 */
const LanguageSwitcher = () => {
    const { t, i18n } = useTranslation();
    const { language, setLanguage } = useLanguage();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    // 메뉴 열기 핸들러
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    // 메뉴 닫기 핸들러
    const handleClose = () => {
        setAnchorEl(null);
    };
    // 언어 변경 핸들러
    const handleLanguageChange = (langCode) => {
        i18n.changeLanguage(langCode);
        setLanguage(langCode);
        handleClose();
    };
    // 현재 선택된 언어 정보
    const currentLanguage = languages.find(lang => lang.code === language) || languages[0];
    return (_jsxs(_Fragment, { children: [_jsxs(Button, { color: "inherit", onClick: handleClick, startIcon: _jsx(TranslateIcon, {}), endIcon: _jsx(KeyboardArrowDownIcon, {}), "aria-controls": open ? 'language-menu' : undefined, "aria-haspopup": "true", "aria-expanded": open ? 'true' : undefined, size: "small", children: [currentLanguage.flag, " ", currentLanguage.label] }), _jsx(Menu, { id: "language-menu", anchorEl: anchorEl, open: open, onClose: handleClose, MenuListProps: {
                    'aria-labelledby': 'language-button',
                }, children: languages.map((lang) => (_jsxs(MenuItem, { onClick: () => handleLanguageChange(lang.code), selected: lang.code === language, children: [_jsx(ListItemIcon, { sx: { fontSize: '1.25rem' }, children: lang.flag }), _jsx(ListItemText, { children: lang.label }), lang.code === language && (_jsx(CheckIcon, { fontSize: "small", color: "primary" }))] }, lang.code))) })] }));
};
export default LanguageSwitcher;
