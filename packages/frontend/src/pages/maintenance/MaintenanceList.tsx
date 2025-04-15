import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  FormControl,
  Select,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Sort as SortIcon,
  CalendarMonth as CalendarIcon,
  ViewList as ListIcon,
} from '@mui/icons-material';

// 정비 기록 타입 정의
interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleLicensePlate: string;
  type: string;
  description: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cost: number;
  technician?: string;
  shop?: string;
  notes?: string;
}

// 테스트 데이터
const mockMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: '1',
    vehicleId: '1',
    vehicleName: '현대 소나타',
    vehicleLicensePlate: '서울 가 1234',
    type: '정기 점검',
    description: '엔진 오일 교체 및 기본 점검',
    date: '2023-05-15',
    status: 'completed',
    cost: 150000,
    technician: '김기술',
    shop: '현대 서비스센터',
    notes: '다음 점검은 10,000km 주행 후 권장'
  },
  {
    id: '2',
    vehicleId: '2',
    vehicleName: '기아 K5',
    vehicleLicensePlate: '경기 나 5678',
    type: '브레이크 패드 교체',
    description: '전방 브레이크 패드 마모로 교체',
    date: '2023-05-10',
    status: 'completed',
    cost: 280000,
    technician: '박정비',
    shop: '기아 서비스센터',
  },
  {
    id: '3',
    vehicleId: '3',
    vehicleName: '테슬라 모델 3',
    vehicleLicensePlate: '서울 다 9012',
    type: '타이어 교체',
    description: '4개 타이어 모두 교체',
    date: '2023-05-28',
    status: 'scheduled',
    cost: 560000,
    shop: '타이어뱅크',
  },
  {
    id: '4',
    vehicleId: '2',
    vehicleName: '기아 K5',
    vehicleLicensePlate: '경기 나 5678',
    type: '에어컨 점검',
    description: '에어컨 가스 충전 및 필터 교체',
    date: '2023-05-20',
    status: 'in_progress',
    cost: 120000,
    technician: '이수리',
    shop: '기아 서비스센터',
  },
  {
    id: '5',
    vehicleId: '4',
    vehicleName: '쉐보레 트래버스',
    vehicleLicensePlate: '부산 라 3456',
    type: '엔진 오일 교체',
    description: '정기 엔진 오일 교체',
    date: '2023-04-15',
    status: 'completed',
    cost: 180000,
    technician: '최오일',
    shop: '쉐보레 서비스센터',
  },
];

const MaintenanceList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    element: HTMLElement | null;
    recordId: string | null;
  }>({ element: null, recordId: null });

  useEffect(() => {
    // URL 쿼리 파라미터에서 필터 상태 가져오기
    const params = new URLSearchParams(location.search);
    const statusFilter = params.get('filter');
    if (statusFilter) {
      setFilterStatus(statusFilter);
    }
  }, [location]);

  useEffect(() => {
    // API 호출 시뮬레이션
    const fetchMaintenanceRecords = async () => {
      try {
        // API 호출 대신 목업 데이터 사용
        setTimeout(() => {
          setMaintenanceRecords(mockMaintenanceRecords);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('정비 목록 로딩 실패:', error);
        setLoading(false);
      }
    };

    fetchMaintenanceRecords();
  }, []);

  // 검색 및 필터링
  const filteredRecords = maintenanceRecords.filter(
    (record) => {
      const matchesSearch =
        record.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.shop && record.shop.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = !filterStatus || record.status === filterStatus;

      return matchesSearch && matchesStatus;
    }
  );

  // 정렬
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const aValue = a[sortField as keyof MaintenanceRecord];
    const bValue = b[sortField as keyof MaintenanceRecord];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }
    return 0;
  });

  // 페이지네이션 핸들러
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 정렬 메뉴 핸들러
  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleSortMenuClose = () => {
    setSortMenuAnchor(null);
  };

  const handleSortSelect = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setSortMenuAnchor(null);
  };

  // 액션 메뉴 핸들러
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, recordId: string) => {
    setActionMenuAnchor({ element: event.currentTarget, recordId });
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor({ element: null, recordId: null });
  };

  // 상태 표시 칩 렌더링
  const renderStatusChip = (status: string) => {
    let color: 'success' | 'warning' | 'error' | 'info' | 'default' = 'default';
    let label = '';

    switch (status) {
      case 'scheduled':
        color = 'info';
        label = '예약됨';
        break;
      case 'in_progress':
        color = 'warning';
        label = '진행 중';
        break;
      case 'completed':
        color = 'success';
        label = '완료';
        break;
      case 'cancelled':
        color = 'error';
        label = '취소됨';
        break;
      default:
        label = status;
    }

    return <Chip size="small" color={color} label={label} />;
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  // 금액 포맷 함수
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          정비 관리
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/maintenance/new')}
        >
          새 정비 등록
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="정비 검색 (차량명, 유형, 설명 등)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>상태 필터</InputLabel>
                <Select
                  value={filterStatus || ''}
                  onChange={(e) => setFilterStatus(e.target.value || null)}
                  label="상태 필터"
                >
                  <MenuItem value="">모든 상태</MenuItem>
                  <MenuItem value="scheduled">예약됨</MenuItem>
                  <MenuItem value="in_progress">진행 중</MenuItem>
                  <MenuItem value="completed">완료</MenuItem>
                  <MenuItem value="cancelled">취소됨</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<SortIcon />}
                onClick={handleSortMenuOpen}
              >
                정렬
              </Button>
              <Menu
                anchorEl={sortMenuAnchor}
                open={Boolean(sortMenuAnchor)}
                onClose={handleSortMenuClose}
              >
                <MenuItem onClick={() => handleSortSelect('date')}>
                  날짜 {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </MenuItem>
                <MenuItem onClick={() => handleSortSelect('vehicleName')}>
                  차량 {sortField === 'vehicleName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </MenuItem>
                <MenuItem onClick={() => handleSortSelect('type')}>
                  유형 {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </MenuItem>
                <MenuItem onClick={() => handleSortSelect('cost')}>
                  비용 {sortField === 'cost' && (sortDirection === 'asc' ? '↑' : '↓')}
                </MenuItem>
              </Menu>

              <Box sx={{ display: 'flex', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('list')}
                  size="small"
                  sx={{ borderRadius: '4px 0 0 4px', minWidth: '40px' }}
                >
                  <ListIcon />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('calendar')}
                  size="small"
                  sx={{ borderRadius: '0 4px 4px 0', minWidth: '40px' }}
                >
                  <CalendarIcon />
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <LinearProgress sx={{ mb: 2 }} />
      ) : viewMode === 'list' ? (
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="정비 목록 테이블">
              <TableHead>
                <TableRow>
                  <TableCell>정비 정보</TableCell>
                  <TableCell>차량</TableCell>
                  <TableCell>날짜</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell align="right">비용</TableCell>
                  <TableCell align="right">액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRecords
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((record) => (
                    <TableRow
                      key={record.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/maintenance/${record.id}`)}
                    >
                      <TableCell component="th" scope="row">
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {record.type}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {record.description}
                          </Typography>
                          {record.shop && (
                            <Typography variant="caption" color="text.secondary">
                              {record.shop}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.vehicleName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.vehicleLicensePlate}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{renderStatusChip(record.status)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(record.cost)}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="더 보기"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionMenuOpen(e, record.id);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {filteredRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1">
                        {searchQuery || filterStatus
                          ? '검색 조건에 맞는 정비 기록이 없습니다.'
                          : '등록된 정비 기록이 없습니다.'}
                      </Typography>
                      <Button
                        variant="text"
                        color="primary"
                        sx={{ mt: 1 }}
                        onClick={() => navigate('/maintenance/new')}
                      >
                        새 정비 등록하기
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredRecords.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="페이지당 행 수:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </>
      ) : (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            캘린더 뷰는 구현 예정입니다.
          </Typography>
        </Box>
      )}

      <Menu
        anchorEl={actionMenuAnchor.element}
        open={Boolean(actionMenuAnchor.element)}
        onClose={handleActionMenuClose}
      >
        <MenuItem
          onClick={() => {
            navigate(`/maintenance/${actionMenuAnchor.recordId}`);
            handleActionMenuClose();
          }}
        >
          상세 정보
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/maintenance/${actionMenuAnchor.recordId}/edit`);
            handleActionMenuClose();
          }}
        >
          수정하기
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            // 상태 변경 로직 구현 필요
            alert('정비 상태 변경 기능은 추후 구현할 예정입니다.');
            handleActionMenuClose();
          }}
        >
          상태 변경
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            // 삭제 로직 구현 필요
            alert('정비 기록 삭제 기능은 추후 구현할 예정입니다.');
            handleActionMenuClose();
          }}
        >
          삭제
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MaintenanceList;