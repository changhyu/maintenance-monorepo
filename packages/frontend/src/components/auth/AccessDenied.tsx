import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Divider
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/**
 * 접근 권한 거부 페이지 컴포넌트
 * 사용자가 접근 권한이 없는 페이지에 접근했을 때 표시
 */
const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          textAlign: 'center'
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            maxWidth: 600, 
            width: '100%',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'error.light'
          }}
        >
          <BlockIcon 
            color="error" 
            sx={{ fontSize: 80, mb: 2 }} 
          />
          
          <Typography variant="h4" component="h1" gutterBottom color="error">
            접근 권한 없음
          </Typography>
          
          <Typography variant="body1" paragraph>
            이 페이지에 접근할 수 있는 권한이 없습니다.
            필요한 권한이 있다고 생각하시면 시스템 관리자에게 문의하세요.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
            >
              이전 페이지로
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
            >
              메인으로 가기
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default AccessDenied;