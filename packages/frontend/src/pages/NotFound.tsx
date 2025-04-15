import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: 2
      }}
    >
      <Typography variant="h2" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom>
        페이지를 찾을 수 없습니다
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={() => navigate('/')}
      >
        메인으로 돌아가기
      </Button>
    </Box>
  );
};

export default NotFound; 