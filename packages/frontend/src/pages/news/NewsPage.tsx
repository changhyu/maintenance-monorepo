import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Chip,
  CardActionArea,
  Button,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Paper
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Share as ShareIcon
} from '@mui/icons-material';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  date: string;
  source: string;
  imageUrl: string;
  category: string;
  isBookmarked?: boolean;
}

// 임시 뉴스 데이터
const DUMMY_NEWS: NewsItem[] = [
  {
    id: '1',
    title: '현대자동차, 새로운 전기차 모델 출시',
    content: '현대자동차에서 새로운 전기차 모델을 발표했습니다. 이번 모델은 한 번 충전으로 600km 주행이 가능합니다. 새로운 배터리 기술과 함께 차세대 자율주행 기능도 탑재되어 있습니다.',
    summary: '현대자동차에서 새로운 전기차 모델을 발표했습니다. 이번 모델은 한 번 충전으로 600km 주행이 가능합니다.',
    date: '2023-11-10',
    source: '자동차 뉴스',
    imageUrl: 'https://via.placeholder.com/500x300',
    category: '전기차',
    isBookmarked: false
  },
  {
    id: '2',
    title: '자율주행 기술의 발전, 어디까지 왔나',
    content: '최근 자율주행 기술이 급속도로 발전하고 있습니다. 전문가들은 5년 내에 완전 자율주행이 가능할 것으로 전망합니다. 이에 따라 관련 법규 및 인프라 구축에 대한 논의도 활발히 진행되고 있습니다.',
    summary: '최근 자율주행 기술이 급속도로 발전하고 있습니다. 전문가들은 5년 내에 완전 자율주행이 가능할 것으로 전망합니다.',
    date: '2023-11-05',
    source: '테크 인사이트',
    imageUrl: 'https://via.placeholder.com/500x300',
    category: '자율주행',
    isBookmarked: true
  },
  {
    id: '3',
    title: '자동차 정비 비용, 어떻게 절약할 수 있을까',
    content: '자동차 정비 비용을 절약하는 방법에 대해 알아봅니다. 정기적인 점검만으로도 큰 비용을 절약할 수 있습니다. 특히 엔진 오일, 타이어 공기압 등 기본적인 관리만으로도 연비 개선 및 부품 수명 연장 효과를 볼 수 있습니다.',
    summary: '자동차 정비 비용을 절약하는 방법에 대해 알아봅니다. 정기적인 점검만으로도 큰 비용을 절약할 수 있습니다.',
    date: '2023-10-28',
    source: '자동차 라이프',
    imageUrl: 'https://via.placeholder.com/500x300',
    category: '정비',
    isBookmarked: false
  },
  {
    id: '4',
    title: '친환경 자동차의 미래, 어떻게 변화할까',
    content: '전기차, 수소차 등 친환경 자동차 시장이 급성장하고 있습니다. 글로벌 환경 규제 강화와 함께 자동차 산업의 패러다임이 변화하고 있습니다. 주요 자동차 메이커들의 전략과 미래 전망에 대해 알아봅니다.',
    summary: '전기차, 수소차 등 친환경 자동차 시장이 급성장하고 있습니다. 글로벌 환경 규제 강화와 함께 자동차 산업의 패러다임이 변화하고 있습니다.',
    date: '2023-10-15',
    source: '오토 테크',
    imageUrl: 'https://via.placeholder.com/500x300',
    category: '친환경',
    isBookmarked: false
  }
];

const NewsPage: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // 실제 구현에서는 API 호출을 통해 데이터를 가져옵니다
    setNews(DUMMY_NEWS);
    // 첫 번째 뉴스를 기본으로 선택
    if (DUMMY_NEWS.length > 0) {
      setSelectedNews(DUMMY_NEWS[0]);
    }
  }, []);

  const handleNewsSelect = (newsItem: NewsItem) => {
    setSelectedNews(newsItem);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookmark = (id: string) => {
    setNews(prevNews => 
      prevNews.map(item => 
        item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
      )
    );
    
    if (selectedNews && selectedNews.id === id) {
      setSelectedNews(prev => prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredNews = news.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 카테고리 목록 (중복 제거)
  const categories = [...new Set(news.map(item => item.category))];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>자동차 뉴스</Typography>
      
      {/* 검색 및 필터 */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <TextField
            placeholder="뉴스 검색..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearch}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Box>
            {categories.map(category => (
              <Chip 
                key={category}
                label={category}
                onClick={() => setSearchTerm(category)}
                sx={{ mr: 1 }}
                clickable
              />
            ))}
          </Box>
        </Box>
      </Paper>
      
      {/* 선택된 뉴스 상세 내용 */}
      {selectedNews && (
        <Card sx={{ mb: 4 }}>
          <CardMedia
            component="img"
            height="300"
            image={selectedNews.imageUrl}
            alt={selectedNews.title}
          />
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Chip label={selectedNews.category} color="primary" size="small" />
              <Typography variant="body2" color="text.secondary">
                {selectedNews.date} | {selectedNews.source}
              </Typography>
            </Box>
            
            <Typography variant="h5" component="h2" gutterBottom>
              {selectedNews.title}
            </Typography>
            
            <Typography variant="body1" paragraph>
              {selectedNews.content}
            </Typography>
            
            <Box display="flex" justifyContent="space-between" mt={3}>
              <Box>
                <Chip 
                  icon={selectedNews.isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  label={selectedNews.isBookmarked ? "저장됨" : "저장하기"}
                  onClick={() => handleBookmark(selectedNews.id)}
                  clickable
                  variant={selectedNews.isBookmarked ? "filled" : "outlined"}
                  sx={{ mr: 1 }}
                />
                <Chip 
                  icon={<ShareIcon />}
                  label="공유하기"
                  clickable
                  variant="outlined"
                />
              </Box>
              <Button size="small" color="primary">
                더 읽기
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {/* 뉴스 목록 */}
      <Typography variant="h6" gutterBottom>최신 뉴스</Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {filteredNews.map(item => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardActionArea onClick={() => handleNewsSelect(item)}>
                <CardMedia
                  component="img"
                  height="140"
                  image={item.imageUrl}
                  alt={item.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Chip label={item.category} size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {item.date}
                    </Typography>
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.summary}
                  </Typography>
                </CardContent>
              </CardActionArea>
              <Box display="flex" justifyContent="space-between" p={1}>
                <Typography variant="caption" color="text.secondary">
                  {item.source}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookmark(item.id);
                  }}
                >
                  {item.isBookmarked ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* 페이지네이션 */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination count={3} color="primary" />
      </Box>
    </Box>
  );
};

export default NewsPage; 