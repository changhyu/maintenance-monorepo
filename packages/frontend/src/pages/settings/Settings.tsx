import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Box, 
  Switch, 
  FormControlLabel, 
  Button, 
  Divider,
  Alert,
  Snackbar 
} from '@mui/material';
import { useDarkMode, useLanguage } from '../../context/AppContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings: React.FC = () => {
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
    severity: 'success' as 'success' | 'error'
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
      } catch (e) {
        console.error('설정 로드 중 오류 발생:', e);
      }
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSettingChange = (setting: string, value: boolean) => {
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

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        설정
      </Typography>
      
      <Paper sx={{ mt: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="일반" />
          <Tab label="알림" />
          <Tab label="데이터" />
          <Tab label="계정" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>일반 설정</Typography>
          <FormControlLabel
            control={
              <Switch 
                checked={darkMode}
                onChange={toggleDarkMode}
                color="primary"
              />
            }
            label="다크 모드"
          />
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>언어 설정</Typography>
          <Box sx={{ mt: 1 }}>
            <Button 
              variant={language === 'ko' ? 'contained' : 'outlined'}
              onClick={() => setLanguage('ko')}
              sx={{ mr: 1 }}
            >
              한국어
            </Button>
            <Button 
              variant={language === 'en' ? 'contained' : 'outlined'}
              onClick={() => setLanguage('en')}
            >
              English
            </Button>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>알림 설정</Typography>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                color="primary"
              />
            }
            label="인앱 알림"
          />
          <FormControlLabel
            control={
              <Switch 
                checked={settings.emailAlerts}
                onChange={(e) => handleSettingChange('emailAlerts', e.target.checked)}
                color="primary"
              />
            }
            label="이메일 알림"
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>데이터 설정</Typography>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.autoSync}
                onChange={(e) => handleSettingChange('autoSync', e.target.checked)}
                color="primary"
              />
            }
            label="자동 동기화"
          />
          <FormControlLabel
            control={
              <Switch 
                checked={settings.dataCache}
                onChange={(e) => handleSettingChange('dataCache', e.target.checked)}
                color="primary"
              />
            }
            label="데이터 캐싱"
          />
          <FormControlLabel
            control={
              <Switch 
                checked={settings.offlineMode}
                onChange={(e) => handleSettingChange('offlineMode', e.target.checked)}
                color="primary"
              />
            }
            label="오프라인 모드"
          />
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="error">
              캐시 데이터 삭제
            </Button>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>계정 설정</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            계정 관련 설정은 시스템 관리자에게 문의하세요.
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" sx={{ mr: 1 }}>
              비밀번호 변경
            </Button>
            <Button variant="outlined" color="error">
              로그아웃
            </Button>
          </Box>
        </TabPanel>
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="primary" onClick={handleSaveSettings}>
            설정 저장
          </Button>
        </Box>
      </Paper>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings; 