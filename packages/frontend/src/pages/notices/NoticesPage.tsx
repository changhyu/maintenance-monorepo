import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Box, 
  Card, 
  CardContent, 
  Chip,
  IconButton
} from '@mui/material';
import { 
  Search as SearchIcon,
  FilterList as FilterIcon 
} from '@mui/icons-material';

interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  isImportant: boolean;
}

// 임시 데이터
const DUMMY_NOTICES: Notice[] = [
  {
    id: '1',
    title: '시스템 업데이트 안내',
    content: '새로운 기능이 추가되었습니다. 앱을 최신 버전으로 업데이트해 주세요.',
    date: '2023-11-01',
    isImportant: true
  },
  {
    id: '2',
    title: '정비 예약 서비스 오픈',
    content: '이제 앱에서 정비 예약을 할 수 있습니다. 더 편리한 서비스를 이용해보세요.',
    date: '2023-10-15',
    isImportant: false
  },
  {
    id: '3',
    title: '연말 정비 할인 이벤트',
    content: '연말을 맞아 정비 서비스 10% 할인 이벤트를 진행합니다.',
    date: '2023-12-01',
    isImportant: true
  }
];

const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  useEffect(() => {
    // 실제 구현에서는 API 호출을 통해 데이터를 가져옵니다
    setNotices(DUMMY_NOTICES);
  }, []);

  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        공지사항
      </Typography>
      
      <Box display="flex" gap={3} mt={3}>
        {/* 공지사항 목록 */}
        <Paper elevation={2} sx={{ flex: 1, maxWidth: '350px' }}>
          <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">알림 목록</Typography>
            <Box>
              <IconButton size="small">
                <SearchIcon />
              </IconButton>
              <IconButton size="small">
                <FilterIcon />
              </IconButton>
            </Box>
          </Box>
          <Divider />
          <List sx={{ maxHeight: '500px', overflow: 'auto' }}>
            {notices.map((notice) => (
              <React.Fragment key={notice.id}>
                <ListItem 
                  button 
                  onClick={() => handleNoticeClick(notice)}
                  selected={selectedNotice?.id === notice.id}
                  sx={{ 
                    backgroundColor: selectedNotice?.id === notice.id ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                  }}
                >
                  <ListItemText 
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {notice.title}
                        {notice.isImportant && (
                          <Chip 
                            label="중요" 
                            size="small" 
                            color="error" 
                            sx={{ height: 20 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={notice.date}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {/* 공지사항 상세 내용 */}
        <Paper elevation={2} sx={{ flex: 2 }}>
          {selectedNotice ? (
            <Box p={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="h5">{selectedNotice.title}</Typography>
                {selectedNotice.isImportant && (
                  <Chip 
                    label="중요" 
                    size="small" 
                    color="error" 
                  />
                )}
              </Box>
              <Typography variant="subtitle1" color="text.secondary" mb={3}>
                {selectedNotice.date}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="body1" paragraph>
                {selectedNotice.content}
              </Typography>
            </Box>
          ) : (
            <Box p={3} display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography variant="subtitle1" color="text.secondary">
                공지사항을 선택해주세요
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default NoticesPage; 