import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link, 
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // 실제 구현에서는 API 호출
      // const response = await authService.login(email, password);
      
      // 테스트를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 개발을 위해 하드코딩된 자격 증명
      if (email === 'admin@example.com' && password === 'password') {
        // 로그인 성공 시 토큰 저장
        localStorage.setItem('authToken', 'sample-jwt-token');
        
        // 로그인 상태 업데이트
        onLogin();
        
        // 메인 페이지로 리디렉션
        navigate('/');
      } else {
        // 로그인 실패
        setError('이메일 또는 비밀번호가 잘못되었습니다.');
      }
    } catch (err) {
      // 네트워크 오류 또는 서버 오류
      setError('로그인 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
      console.error('로그인 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            차량 정비 관리 시스템
          </Typography>
          
          <Typography component="h2" variant="h5" sx={{ mb: 3 }}>
            로그인
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="이메일"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="비밀번호"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : '로그인'}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Link href="#" variant="body2">
                비밀번호 찾기
              </Link>
              <Link href="#" variant="body2">
                계정 등록 요청
              </Link>
            </Box>
          </Box>
        </Paper>
        
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} 차량 정비 관리 시스템
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            도움이 필요하시면 시스템 관리자에게 문의하세요.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login; 