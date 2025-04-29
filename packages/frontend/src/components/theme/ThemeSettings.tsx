import React, { useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  ToggleButtonGroup, 
  ToggleButton, 
  Slider, 
  InputLabel,
  Paper,
  useTheme
} from '@mui/material';
import { LightMode, DarkMode, SettingsBrightness } from '@mui/icons-material';
import { useThemeStore, getEffectiveThemeMode } from '../../store/themeStore';

/**
 * 테마 설정 컴포넌트
 * 
 * 사용자가 테마 설정을 관리할 수 있는 인터페이스 제공
 * Zustand 스토어를 통한 상태 관리 활용
 */
function ThemeSettings() {
  const theme = useTheme();
  const { themeMode, fontScale, accentColor, setThemeMode, setFontScale, setAccentColor } = useThemeStore();
  
  // 미리보기용 유효 테마 모드
  const effectiveMode = getEffectiveThemeMode(themeMode);
  
  // 브라우저의 다크/라이트 모드 변경 감지
  useEffect(() => {
    if (themeMode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // 시스템 설정이 변경되면 컴포넌트 리렌더링 유도
      setThemeMode('system');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, setThemeMode]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          테마 및 디스플레이 설정
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <InputLabel htmlFor="theme-mode-selector" sx={{ mb: 1 }}>
            테마 모드
          </InputLabel>
          <ToggleButtonGroup
            id="theme-mode-selector"
            value={themeMode}
            exclusive
            onChange={(_, value) => value && setThemeMode(value)}
            aria-label="테마 모드 선택"
            size="small"
            fullWidth
          >
            <ToggleButton value="light" aria-label="라이트 모드">
              <LightMode sx={{ mr: 1 }} /> 라이트
            </ToggleButton>
            <ToggleButton value="system" aria-label="시스템 설정">
              <SettingsBrightness sx={{ mr: 1 }} /> 시스템
            </ToggleButton>
            <ToggleButton value="dark" aria-label="다크 모드">
              <DarkMode sx={{ mr: 1 }} /> 다크
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <InputLabel htmlFor="font-size-slider" sx={{ mb: 1 }}>
            글자 크기 조정: {Math.round(fontScale * 100)}%
          </InputLabel>
          <Slider
            id="font-size-slider"
            value={fontScale}
            min={0.8}
            max={1.5}
            step={0.05}
            onChange={(_, value) => setFontScale(value as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            aria-labelledby="font-size-slider"
          />
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <InputLabel htmlFor="accent-color-selector" sx={{ mb: 1 }}>
            강조 색상
          </InputLabel>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {['#1976d2', '#9c27b0', '#2e7d32', '#d32f2f', '#ed6c02', '#0288d1'].map((color) => (
              <Box
                key={color}
                onClick={() => setAccentColor(color)}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  bgcolor: color,
                  cursor: 'pointer',
                  border: accentColor === color ? '3px solid' : '1px solid',
                  borderColor: accentColor === color ? 'primary.main' : 'divider',
                }}
                aria-label={`색상 ${color} 선택`}
                role="button"
                tabIndex={0}
              />
            ))}
          </Box>
        </Box>
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            설정 미리보기
          </Typography>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              backgroundColor: effectiveMode === 'dark' ? '#121212' : '#ffffff',
              color: effectiveMode === 'dark' ? '#ffffff' : '#000000',
            }}
          >
            <Typography 
              variant="body1"
              sx={{ 
                fontSize: `${fontScale}rem`,
                mb: 1 
              }}
            >
              현재 테마 모드: {effectiveMode === 'dark' ? '다크 모드' : '라이트 모드'}
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 4,
                bgcolor: accentColor,
                borderRadius: 1,
                mb: 1
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: `${fontScale * 0.875}rem`,
                color: effectiveMode === 'dark' ? '#aaaaaa' : '#666666'
              }}
            >
              선택한 강조 색상과 글꼴 크기로 설정된 미리보기입니다.
            </Typography>
          </Paper>
        </Box>
      </CardContent>
    </Card>
  );
}

export default ThemeSettings;