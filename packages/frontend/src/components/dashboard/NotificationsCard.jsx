import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardHeader, 
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Chip,
  IconButton,
  Button,
  Divider,
  Tabs,
  Tab,
  Typography
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
  WarningAmber as WarningIcon,
  MoreVert as MoreVertIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// 알림 타입별 아이콘 지정
const getIconByType = (type) => {
  switch (type) {
    case 'reminder':
      return <CalendarIcon color="primary" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'alert':
      return <ErrorIcon color="error" />;
    case 'success':
      return <CheckIcon color="success" />;
    default:
      return <NotificationsIcon color="info" />;
  }
};

// 알림 항목 컴포넌트
const NotificationItem = ({ notification, onMarkRead }) => {
  const navigate = useNavigate();
  const { id, type, title, message, time, read, link } = notification;
  
  const handleClick = () => {
    onMarkRead(id);
    if (link) {
      navigate(link);
    }
  };
  
  return (
    <>
      <ListItem 
        alignItems="flex-start"
        button 
        onClick={handleClick}
        sx={{
          backgroundColor: read ? 'inherit' : 'action.hover',
          py: 1
        }}
      >
        <ListItemIcon sx={{ mt: 0.5 }}>
          {getIconByType(type)}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">{title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {time}
              </Typography>
            </Box>
          }
          secondary={
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {message}
            </Typography>
          }
        />
      </ListItem>
      <Divider component="li" />
    </>
  );
};

// 알림 및 리마인더 카드
const NotificationsCard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  
  // 탭 변경 핸들러
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // 샘플 알림 데이터
  const notifications = [
    {
      id: 1,
      type: 'reminder',
      title: '정기 오일 교체 예정',
      message: '현대 투싼(12가 3456)의 정기 오일 교체가 3일 후로 예정되어 있습니다.',
      time: '2시간 전',
      read: false,
      link: '/maintenance/new/1'
    },
    {
      id: 2,
      type: 'warning',
      title: '타이어 마모 상태 확인',
      message: '기아 K5(34가 5678)의 타이어 마모도가 임계치에 도달했습니다. 점검이 필요합니다.',
      time: '어제',
      read: true,
      link: '/vehicles/2'
    },
    {
      id: 3,
      type: 'alert',
      title: '배터리 교체 필요',
      message: '쌍용 티볼리(56가 7890)의 배터리 상태가 좋지 않습니다. 곧 교체가 필요합니다.',
      time: '2일 전',
      read: false,
      link: '/maintenance/new/3'
    },
    {
      id: 4,
      type: 'success',
      title: '정비 완료',
      message: '현대 아반떼(78가 9012)의 정기 점검이 성공적으로 완료되었습니다.',
      time: '3일 전',
      read: true,
      link: '/maintenance/4'
    }
  ];
  
  // 리마인더 데이터
  const reminders = [
    {
      id: 5,
      type: 'reminder',
      title: '브레이크 패드 교체',
      message: '기아 K7(90가 1234)의 브레이크 패드 교체가 1주일 후로 예정되어 있습니다.',
      time: '1일 전',
      read: false,
      link: '/maintenance/new/5'
    },
    {
      id: 6,
      type: 'reminder',
      title: '연간 차량 검사',
      message: 'BMW 520d(12나 3456)의 연간 정기 검사가 2주 후로 예정되어 있습니다.',
      time: '3일 전',
      read: false,
      link: '/vehicles/6'
    }
  ];
  
  // 알림을 읽음 처리하는 함수
  const handleMarkAsRead = (id) => {
    console.log('알림 읽음 처리:', id);
    // 실제 구현에서는 API 호출이 필요
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <Card>
      <CardHeader 
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ mr: 1 }}>알림 및 리마인더</Typography>
            {unreadCount > 0 && (
              <Chip 
                label={unreadCount} 
                color="primary" 
                size="small" 
              />
            )}
          </Box>
        }
        action={
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        }
      />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="notification tabs">
          <Tab label="알림" id="tab-0" />
          <Tab label="리마인더" id="tab-1" />
        </Tabs>
      </Box>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {activeTab === 0 ? (
          <List sx={{ px: 0 }}>
            {notifications.map(notification => (
              <NotificationItem 
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkAsRead}
              />
            ))}
          </List>
        ) : (
          <List sx={{ px: 0 }}>
            {reminders.map(reminder => (
              <NotificationItem 
                key={reminder.id}
                notification={reminder}
                onMarkRead={handleMarkAsRead}
              />
            ))}
          </List>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Button 
            variant="text" 
            onClick={() => navigate('/notifications')}
          >
            모든 알림 보기
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default NotificationsCard;