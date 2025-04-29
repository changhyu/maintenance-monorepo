import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Grid, 
  Typography,
  IconButton,
  Box,
  ButtonBase  
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Build as BuildIcon,
  Assessment as ReportIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

// 빠른 액션 아이템 컴포넌트
const ActionItem = ({ icon, title, description, path, color }) => {
  const navigate = useNavigate();
  
  return (
    <Grid item xs={6} sm={4} md={2}>
      <ButtonBase 
        onClick={() => navigate(path)}
        sx={{ 
          width: '100%', 
          textAlign: 'center',
          borderRadius: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 2,
            transition: 'all 0.3s',
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'action.hover',
              transform: 'translateY(-4px)'
            }
          }}
        >
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              color: `${color}.main`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1.5,
              mb: 1.5,
              width: 56,
              height: 56
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            {title}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
        </Box>
      </ButtonBase>
    </Grid>
  );
};

// 빠른 액션 카드
const QuickActionCard = () => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader 
        title="빠른 액션" 
        action={
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          <ActionItem
            icon={<CarIcon fontSize="large" />}
            title="차량 추가"
            description="새 차량 등록"
            path="/vehicles/new"
            color="primary"
          />
          <ActionItem
            icon={<BuildIcon fontSize="large" />}
            title="정비 예약"
            description="정비 일정 등록"
            path="/maintenance/new"
            color="secondary"
          />
          <ActionItem
            icon={<ReportIcon fontSize="large" />}
            title="보고서"
            description="정비 분석"
            path="/reports"
            color="success"
          />
          <ActionItem
            icon={<NotificationsIcon fontSize="large" />}
            title="알림"
            description="정비 리마인더"
            path="/notifications"
            color="warning"
          />
          <ActionItem
            icon={<SettingsIcon fontSize="large" />}
            title="설정"
            description="환경설정"
            path="/settings"
            color="info"
          />
          <ActionItem
            icon={<CarIcon fontSize="large" />}
            title="차량 목록"
            description="전체 차량 보기"
            path="/vehicles"
            color="error"
          />
        </Grid>
      </CardContent>
    </Card>
  );
};

export default QuickActionCard;