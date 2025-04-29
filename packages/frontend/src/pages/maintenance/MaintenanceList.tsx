import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Sort as SortIcon,
  CalendarMonth as CalendarIcon,
  ViewList as ListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Maintenance, MaintenanceType, MaintenanceStatus } from '../../types/maintenance';
import { MaintenanceService } from '../../services/maintenanceService';

// React Query 추가
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 정비 기록 타입 정의
export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  vehicleLicensePlate?: string;
  type: string;
  description: string;
  date: string; // 백엔드에서는 scheduled_date로 사용하지만 변환 함수에서 처리
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
  cost: number;
  technician?: string; // 백엔드에서는 assigned_technician 또는 performed_by로 사용
  shop?: string; // 백엔드에서는 provider로 사용
  notes?: string;
  completionDate?: string;
  mileage?: number;
  parts?: {
    id: string;
    name: string;
    partNumber?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
  documents?: {
    id: string;
    name: string;
    fileUrl: string;
    uploadedAt: string;
    size: number;
    type: string;
  }[];
}

const MaintenanceList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient(); // QueryClient 인스턴스 가져오기
  
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: '',
    page: 0,
    limit: 10,
  });

  const maintenanceService = MaintenanceService.getInstance();

  // React Query를 사용한 API 호출 최적화
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['maintenanceRecords', filters],
    queryFn: () => maintenanceService.getAllMaintenance({
      type: filters.type as MaintenanceType,
      status: filters.status as MaintenanceStatus,
      page: filters.page + 1,
      limit: filters.limit,
      search: filters.search
    }),
    keepPreviousData: true, // 페이지 전환 시 이전 데이터 유지
  });

  // 삭제 뮤테이션 설정
  const deleteMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.deleteMaintenance(id),
    onSuccess: () => {
      // 삭제 성공 시 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
    },
  });

  // API에서 반환된 데이터와 총 레코드 수
  const maintenanceRecords = data || [];
  const totalRecords = maintenanceRecords.length < filters.limit 
    ? (filters.page * filters.limit) + maintenanceRecords.length 
    : 100;

  useEffect(() => {
    // URL 쿼리 파라미터에서 필터 상태 가져오기
    const params = new URLSearchParams(location.search);
    const statusFilter = params.get('filter');
    if (statusFilter) {
      setFilterStatus(statusFilter);
      setFilters(prev => ({ ...prev, status: statusFilter }));
    }
  }, [location]);

  // 검색 및 필터링은 이미 서버에서 처리되지만, 클라이언트 측에서 추가 필터링이 필요한 경우 사용
  const filteredRecords = maintenanceRecords.filter(
    (record) => {
      const matchesSearch =
        !searchQuery || // searchQuery가 없으면 모두 포함
        record.vehicleName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.shop && record.shop.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = !filterStatus || record.status === filterStatus;

      return matchesSearch && matchesStatus;
    }
  );

  // 정렬
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const aValue = a[sortField as keyof Maintenance];
    const bValue = b[sortField as keyof Maintenance];

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
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setFilters(prev => ({ ...prev, limit: newRowsPerPage, page: 0 }));
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

  // 검색 처리
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery, page: 0 }));
    setPage(0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 상태 필터 변경
  const handleStatusFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const status = event.target.value as string;
    setFilterStatus(status || null);
    setFilters(prev => ({ ...prev, status: status, page: 0 }));
    setPage(0);
    
    // URL 업데이트
    const searchParams = new URLSearchParams(location.search);
    if (status) {
      searchParams.set('filter', status);
    } else {
      searchParams.delete('filter');
    }
    navigate({ search: searchParams.toString() });
  };

  // 필터 초기화
  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus(null);
    setFilters({
      type: '',
      status: '',
      search: '',
      page: 0,
      limit: 10,
    });
    setPage(0);
    
    // URL 업데이트
    navigate({ search: '' });
  };

  // 상태 표시 칩 렌더링
  const renderStatusChip = (status: string) => {
    let color: 'success' | 'warning' | 'error' | 'info' | 'default' = 'default';
    let label = '';

    switch (status) {
      case 'scheduled':
      case 'pending':
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
      case 'canceled':
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, maintenanceId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedMaintenance(maintenanceId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMaintenance(null);
  };

  const handleDelete = async () => {
    if (!selectedMaintenance) return;

    try {
      // React Query 뮤테이션 사용
      await deleteMutation.mutateAsync(selectedMaintenance);
    } catch (error) {
      console.error('정비 기록 삭제에 실패했습니다:', error);
    }
    handleMenuClose();
  };

  // 혹시 에러가 발생했을 경우 에러 표시
  if (isError) {
    return (
      <Box sx={{ m: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          정비 기록을 불러오는데 실패했습니다. 서버 연결을 확인하세요.
        </Alert>
        <Button variant="contained" onClick={() => refetch()}>
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          정비 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/maintenance/new')}
          >
            새 정비 등록
          </Button>
        </Box>
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
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button variant="text" onClick={handleSearch}>
                        검색
                      </Button>
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
                  onChange={handleStatusFilterChange as any}
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
                onClick={resetFilters}
              >
                초기화
              </Button>
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

      {/* 로딩 인디케이터는 테이블 위에 선형으로 표시 - 사용자 경험 개선 */}
      {isLoading && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {viewMode === 'list' ? (
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
                          {record.vehicleName ?? '차량 정보 없음'}
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
                {sortedRecords.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1">
                        {(searchQuery || filterStatus)
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
            count={totalRecords} // API에서 총 개수 정보를 제공해야 함
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="페이지당 행 수:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : '더 많은'}`}
          />
        </>
      ) : (
        <Card sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">정비 일정</Typography>
            <Box>
              <Button size="small" onClick={() => alert('이전 달 보기 기능은 준비 중입니다.')}>이전 달</Button>
              <Button variant="contained" size="small" disabled>
                {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
              </Button>
              <Button size="small" onClick={() => alert('다음 달 보기 기능은 준비 중입니다.')}>다음 달</Button>
            </Box>
          </Box>
          
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              캘린더 보기는 현재 개발 중입니다.
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => setViewMode('list')}
              startIcon={<ListIcon />}
            >
              리스트 보기로 돌아가기
            </Button>
          </Box>
        </Card>
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
            // TODO: 상태 변경 API 구현 후 연결
            alert('정비 상태 변경 기능은 현재 개발 중입니다.');
            handleActionMenuClose();
          }}
        >
          상태 변경
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionMenuAnchor.recordId) {
              setSelectedMaintenance(actionMenuAnchor.recordId);
              handleDelete();
            }
            handleActionMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          삭제
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedMaintenance) {
              navigate(`/maintenance/${selectedMaintenance}/edit`);
            }
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          수정
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          삭제
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MaintenanceList;