import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
  DirectionsCar as DirectionsCarIcon,
  DirectionsWalk as DirectionsWalkIcon,
  DirectionsBike as DirectionsBikeIcon,
  DirectionsTransit as DirectionsTransitIcon,
  TwoWheeler as TwoWheelerIcon,
  NavigateNext as NavigateNextIcon,
  History as HistoryIcon,
  Search as SearchOutlinedIcon,
  Place as PlaceIcon,
  Star as StarIcon,
  Clear as ClearIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';

// 컴포넌트 정의
const MapNavigationPage: React.FC = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [transportMode, setTransportMode] = useState('DRIVING');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [routeInstructions, setRouteInstructions] = useState<any[]>([]);
  const [totalDistance, setTotalDistance] = useState('');
  const [totalDuration, setTotalDuration] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = () => {
    // 검색 로직
  };

  const handleRoute = () => {
    // 경로 검색 로직
  };

  const handleGetCurrentLocation = () => {
    // 현재 위치 가져오기 로직
  };

  const handleSelectRecentSearch = (item: string) => {
    // 최근 검색 선택 로직
  };

  const addToFavorites = (item: string) => {
    // 즐겨찾기 추가 로직
  };

  const removeFromFavorites = (item: string) => {
    // 즐겨찾기 제거 로직
  };

  const handleSelectSearchResult = (result: any) => {
    // 검색 결과 선택 로직
  };

  return (
    <Container maxWidth="xl" sx={{ pt: 2, pb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        지도 & 경로 안내
      </Typography>

      <Grid container spacing={3}>
        {/* 왼쪽 사이드바 - 검색 및 경로 설정 */}
        <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 4', lg: 'span 3' } }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                장소 검색
              </Typography>
              <Stack spacing={2}>
                <TextField
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="장소, 주소 검색"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchQuery('')}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SearchOutlinedIcon />}
                  onClick={handleSearch}
                  fullWidth
                >
                  검색
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                경로 안내
              </Typography>
              <Stack spacing={2}>
                <TextField
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="출발지"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PlaceIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={handleGetCurrentLocation}
                          title="현재 위치 사용"
                        >
                          <MyLocationIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="도착지"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PlaceIcon color="error" />
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControl fullWidth variant="outlined">
                  <InputLabel id="transportation-mode-label">이동 수단</InputLabel>
                  <Select
                    labelId="transportation-mode-label"
                    id="transportation-mode"
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value as string)}
                    label="이동 수단"
                  >
                    <MenuItem value="DRIVING">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DirectionsCarIcon sx={{ mr: 1 }} />
                        자동차
                      </Box>
                    </MenuItem>
                    <MenuItem value="WALKING">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DirectionsWalkIcon sx={{ mr: 1 }} />
                        도보
                      </Box>
                    </MenuItem>
                    <MenuItem value="BICYCLING">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DirectionsBikeIcon sx={{ mr: 1 }} />
                        자전거
                      </Box>
                    </MenuItem>
                    <MenuItem value="TRANSIT">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DirectionsTransitIcon sx={{ mr: 1 }} />
                        대중교통
                      </Box>
                    </MenuItem>
                    <MenuItem value="TWO_WHEELER">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TwoWheelerIcon sx={{ mr: 1 }} />
                        이륜차
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleRoute}
                  disabled={!origin || !destination}
                  fullWidth
                >
                  경로 검색
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* 최근 검색 및 즐겨찾기 */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HistoryIcon sx={{ mr: 1 }} />
                <Typography variant="h6">최근 검색</Typography>
              </Box>
              
              {recentSearches.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {recentSearches.map((item, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <Divider />}
                      <Box
                        component="li"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          py: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                        onClick={() => handleSelectRecentSearch(item)}
                      >
                        <SearchIcon sx={{ mx: 1, color: 'text.secondary' }} />
                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                          <Typography variant="body2" noWrap>
                            {item}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToFavorites(item);
                          }}
                        >
                          <StarIcon
                            fontSize="small"
                            color={favorites.includes(item) ? 'warning' : 'disabled'}
                          />
                        </IconButton>
                      </Box>
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center">
                  최근 검색 기록이 없습니다.
                </Typography>
              )}

              {favorites.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 3, mb: 2 }}>
                    <BookmarkIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">즐겨찾기</Typography>
                  </Box>
                  <List sx={{ p: 0 }}>
                    {favorites.map((item, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <Divider />}
                        <Box
                          component="li"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            py: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                          onClick={() => handleSelectRecentSearch(item)}
                        >
                          <StarIcon sx={{ mx: 1 }} color="warning" />
                          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                            <Typography variant="body2" noWrap>
                              {item}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromFavorites(item);
                            }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </React.Fragment>
                    ))}
                  </List>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 오른쪽 - 지도 */}
        <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 8', lg: 'span 9' } }}>
          {/* 지도 컨테이너 */}
          <Card sx={{ height: '70vh', mb: { xs: 3, md: 0 } }}>
            <CardContent sx={{ p: 0, height: '100%', position: 'relative' }}>
              {isLoading ? (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : null}

              {/* 지도 렌더링 영역 */}
              <Box
                id="map"
                sx={{ width: '100%', height: '100%', bgcolor: 'action.disabled' }}
              />

              {/* 경로 안내 패널 */}
              {routeInstructions.length > 0 && (
                <Paper
                  elevation={3}
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: '300px',
                    maxHeight: 'calc(70vh - 32px)',
                    overflowY: 'auto',
                    p: 2,
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    경로 안내
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    총 거리: {totalDistance}, 예상 소요 시간: {totalDuration}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <List sx={{ p: 0 }}>
                    {routeInstructions.map((instruction, index) => (
                      <Box
                        component="li"
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          py: 1.5,
                          borderBottom:
                            index < routeInstructions.length - 1
                              ? '1px solid'
                              : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            mr: 2,
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2">
                            {instruction.text}
                          </Typography>
                          {instruction.distance && (
                            <Typography variant="caption" color="text.secondary">
                              {instruction.distance}
                              {instruction.duration &&
                                ` (${instruction.duration})`}
                            </Typography>
                          )}
                        </Box>
                        <NavigateNextIcon
                          sx={{ color: 'text.secondary', flexShrink: 0, ml: 1 }}
                        />
                      </Box>
                    ))}
                  </List>
                </Paper>
              )}
            </CardContent>
          </Card>

          {/* 검색 결과 카드 */}
          {searchResults.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  검색 결과
                </Typography>
                <List sx={{ p: 0 }}>
                  {searchResults.map((result, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <Divider />}
                      <Box
                        component="li"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          py: 1.5,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                        onClick={() => handleSelectSearchResult(result)}
                      >
                        <PlaceIcon sx={{ mx: 1 }} color="primary" />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1">{result.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {result.address}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            startIcon={<PlaceIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrigin(result.name);
                            }}
                          >
                            출발
                          </Button>
                          <Button
                            size="small"
                            startIcon={<PlaceIcon />}
                            color="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDestination(result.name);
                            }}
                          >
                            도착
                          </Button>
                        </Stack>
                      </Box>
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default MapNavigationPage;