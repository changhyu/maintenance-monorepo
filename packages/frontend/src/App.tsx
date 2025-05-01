import React, { Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import { theme } from './theme';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import AppRoutes from './routes';
import AnalyticsTracker from './utils/analytics/AnalyticsTracker';

// 로딩 중 표시할 컴포넌트
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}
  >
    <CircularProgress size={60} />
    <Typography variant="h6" sx={{ mt: 2 }}>
      로딩 중...
    </Typography>
  </Box>
);

// 에러 발생 시 표시할 컴포넌트
export const ErrorFallback = ({ error }: { error: Error }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      p: 3,
      textAlign: 'center'
    }}
  >
    <Typography variant="h4" color="error" gutterBottom>
      오류가 발생했습니다.
    </Typography>
    <Typography variant="body1">
      {error.message || '알 수 없는 오류가 발생했습니다.'}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      페이지를 새로고침하거나 나중에 다시 시도해주세요.
    </Typography>
    <Button 
      variant="contained" 
      onClick={() => window.location.reload()} 
      sx={{ mt: 3 }}
    >
      새로고침
    </Button>
  </Box>
);

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
        <CssBaseline />
        <AnalyticsTracker />
        <Suspense fallback={<LoadingFallback />}>
          <AppRoutes />
        </Suspense>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;
