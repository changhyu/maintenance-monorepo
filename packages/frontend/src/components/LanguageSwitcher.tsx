import React, { useState } from 'react';
import { 
  Button, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText 
} from '@mui/material';
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
const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // 메뉴 열기 핸들러
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // 메뉴 닫기 핸들러
  const handleClose = () => {
    setAnchorEl(null);
  };

  // 언어 변경 핸들러
  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setLanguage(langCode);
    handleClose();
  };

  // 현재 선택된 언어 정보
  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  return (
    <>
      <Button
        color="inherit"
        onClick={handleClick}
        startIcon={<TranslateIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        aria-controls={open ? 'language-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        size="small"
      >
        {currentLanguage.flag} {currentLanguage.label}
      </Button>

      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={lang.code === language}
          >
            <ListItemIcon sx={{ fontSize: '1.25rem' }}>
              {lang.flag}
            </ListItemIcon>
            <ListItemText>{lang.label}</ListItemText>
            {lang.code === language && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher; 