import React from 'react';
import {
  Box,
  Typography,
  Switch,
  Slider,
  FormControlLabel,
  Paper,
  Divider,
  Button,
  useTheme
} from '@mui/material';
import { useAtom } from 'jotai';
import {
  accessibilitySettingsAtom,
  updateAccessibilitySettingAtom,
  systemPreferencesAtom
} from '../../store/accessibilityAtoms';

/**
 * 접근성 설정 컴포넌트 속성
 */
interface AccessibilitySettingsProps {
  onClose?: () => void;
}

/**
 * 접근성 설정 컴포넌트
 * 사용자가 접근성 관련 설정을 변경할 수 있는 패널
 */
const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ onClose }) => {
  const theme = useTheme();
  // 접근성 설정 상태
  const [settings, setSettings] = useAtom(accessibilitySettingsAtom);
  // 시스템 접근성 선호도 상태
  const [systemPrefs] = useAtom(systemPreferencesAtom);
  // 개별 설정 업데이트 액션
  const [, updateSetting] = useAtom(updateAccessibilitySettingAtom);

  // 텍스트 크기 변경 핸들러
  const handleTextSizeChange = (_: Event, newValue: number | number[]) => {
    updateSetting({ textSizeRatio: newValue as number });
  };

  // 설정 초기화 핸들러
  const handleResetSettings = () => {
    setSettings({
      highContrast: false,
      textSizeRatio: 1,
      reduceMotion: false,
      screenReaderMode: false,
      enhancedKeyboardNav: false,
    });
  };

  // 시스템 설정과 동기화 핸들러
  const handleSyncWithSystem = () => {
    updateSetting({
      reduceMotion: systemPrefs.prefersReducedMotion,
    });
  };

  return (
    <Paper 
      elevation={3} 
      sx={{
        p: 3,
        maxWidth: 500,
        margin: '0 auto',
        ...(settings.highContrast && {
          backgroundColor: '#000',
          color: '#fff',
          border: '2px solid #fff',
        }),
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom>
        접근성 설정
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.highContrast}
              onChange={(e) => updateSetting({ highContrast: e.target.checked })}
              name="highContrast"
            />
          }
          label="고대비 모드"
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
          텍스트와 배경 간의 대비를 높여 가독성을 향상시킵니다.
        </Typography>
      </Box>
      
      <Box sx={{ mt: 3 }}>
        <Typography id="text-size-slider" gutterBottom>
          텍스트 크기: {Math.round(settings.textSizeRatio * 100)}%
        </Typography>
        <Slider
          value={settings.textSizeRatio}
          onChange={handleTextSizeChange}
          aria-labelledby="text-size-slider"
          step={0.1}
          marks
          min={0.8}
          max={1.5}
          sx={{
            color: settings.highContrast ? '#fff' : theme.palette.primary.main,
          }}
        />
      </Box>
      
      <Box sx={{ mt: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.reduceMotion}
              onChange={(e) => updateSetting({ reduceMotion: e.target.checked })}
              name="reduceMotion"
            />
          }
          label="모션 감소"
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
          애니메이션과 전환 효과를 줄이거나 제거합니다.
          {systemPrefs.prefersReducedMotion && (
            <Box component="span" sx={{ fontWeight: 'bold', ml: 1 }}>
              (시스템에서 모션 감소 선호)
            </Box>
          )}
        </Typography>
      </Box>
      
      <Box sx={{ mt: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.screenReaderMode}
              onChange={(e) => updateSetting({ screenReaderMode: e.target.checked })}
              name="screenReaderMode"
            />
          }
          label="화면 낭독기 모드"
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
          화면 낭독기와의 호환성을 향상시킵니다.
        </Typography>
      </Box>
      
      <Box sx={{ mt: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.enhancedKeyboardNav}
              onChange={(e) => updateSetting({ enhancedKeyboardNav: e.target.checked })}
              name="enhancedKeyboardNav"
            />
          }
          label="향상된 키보드 탐색"
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
          키보드 포커스를 시각적으로 강조하고 키보드 단축키를 활성화합니다.
        </Typography>
      </Box>
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          onClick={handleResetSettings}
          sx={{
            borderColor: settings.highContrast ? '#fff' : undefined,
            color: settings.highContrast ? '#fff' : undefined,
          }}
        >
          기본값으로 초기화
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={handleSyncWithSystem}
          sx={{
            borderColor: settings.highContrast ? '#fff' : undefined,
            color: settings.highContrast ? '#fff' : undefined,
          }}
        >
          시스템 설정과 동기화
        </Button>
        
        {onClose && (
          <Button 
            variant="contained" 
            onClick={onClose}
            sx={{
              bgcolor: settings.highContrast ? '#fff' : theme.palette.primary.main,
              color: settings.highContrast ? '#000' : theme.palette.primary.contrastText,
            }}
          >
            저장 및 닫기
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default AccessibilitySettings;