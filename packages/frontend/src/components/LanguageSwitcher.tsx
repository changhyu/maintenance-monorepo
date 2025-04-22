import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, changeLanguage } from '../i18n';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  Typography,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'text' | 'full';
  size?: 'small' | 'medium' | 'large';
}

/**
 * 언어 전환 컴포넌트
 * 사용자가 애플리케이션 언어를 변경할 수 있는 드롭다운 메뉴 제공
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'icon',
  size = 'medium'
}) => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLanguageChange = (langCode: string) => {
    changeLanguage(langCode);
    handleClose();
  };
  
  // 현재 선택된 언어 정보
  const currentLanguage = supportedLanguages.find(
    lang => lang.code === i18n.language
  ) || supportedLanguages[0];
  
  return (
    <>
      {variant === 'icon' && (
        <Tooltip title="언어 선택">
          <IconButton
            onClick={handleClick}
            size={size}
            aria-controls={open ? 'language-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            aria-label="언어 선택"
          >
            <LanguageIcon />
          </IconButton>
        </Tooltip>
      )}
      
      {variant === 'text' && (
        <Typography
          component="button"
          onClick={handleClick}
          sx={{ 
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          {currentLanguage.flag} {currentLanguage.code.toUpperCase()}
        </Typography>
      )}
      
      {variant === 'full' && (
        <Typography
          component="button"
          onClick={handleClick}
          sx={{ 
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <LanguageIcon sx={{ mr: 1 }} />
          {currentLanguage.flag} {currentLanguage.name}
        </Typography>
      )}

      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 180,
            maxHeight: '300px',
            overflow: 'auto'
          }
        }}
      >
        {supportedLanguages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={i18n.language === language.code}
            dense
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {language.flag}
            </ListItemIcon>
            <ListItemText>{language.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;