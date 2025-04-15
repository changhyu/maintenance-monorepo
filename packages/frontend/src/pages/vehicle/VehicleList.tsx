import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Sort as SortIcon,
} from '@mui/icons-material';

// 차량 타입 정의
interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  color?: string;
  type: string;
  status: 'active' | 'maintenance' | 'inactive' | 'recalled';
  mileage: number;
  lastMaintenance?: string;
  owner?: string;
}

// 테스트 데이터
const mockVehicles: Vehicle[] = [
  {
    id: '1',
    vin: 'JH4DA9370MS016526',
    make: '현대',
    model: '소나타',
    year: 2021,
    licensePlate: '서울 가 1234',
    color: '흰색',
    type: 'sedan',
    status: 'active',
    mileage: 15000,
    lastMaintenance: '2023-03-15',
    owner: '홍길동',
  },
  {
    id: '2',
    vin: 'WBADT53452GD13836',
    make: '기아',
    model: 'K5',
    year: 2020,
    licensePlate: '경기 나 5678',
    color: '검정',
    type: 'sedan',
    status: 'maintenance',
    mileage: 28000,
    lastMaintenance: '2023-05-10',
    owner: '김철수',
  },
  {
    id: '3',
    vin: '5YJSA1E64MF410149',
    make: '테슬라',
    model: '모델 3',
    year: 2022,
    licensePlate: '서울 다 9012',
    color: '빨강',
    type: 'electric',
    status: 'active',
    mileage: 8000,
    lastMaintenance: '2023-04-20',
    owner: '이영희',
  },
  {
    id: '4',
    vin: '5GAKRAKDXFJ123456',
    make: '쉐보레',
    model: '트래버스',
    year: 2019,
    licensePlate: '부산 라 3456',
    color: '파랑',
    type: 'suv',
    status: 'inactive',
    mileage: 42000,
    lastMaintenance: '2022-12-05',
    owner: '박민수',
  },
  {
    id: '5',
    vin: 'WAUAH74F77N903876',
    make: '기아',
    model: '쏘렌토',
    year: 2021,
    licensePlate: '인천 마 7890',
    color: '회색',
    type: 'suv',
    status: 'active',
    mileage: 18000,
    lastMaintenance: '2023-02-18',
    owner: '최정아',
  },
];

const VehicleList: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [sortField, setSortField] = useState<string>('make');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    element: HTMLElement | null;
    vehicleId: string | null;
  }>({ element: null, vehicleId: null });

  useEffect(() => {
    // API 호출 시뮬레이션
    const fetchVehicles = async () => {
      try {
        // API 호출 대신 목업 데이터 사용
        setTimeout(() => {
          setVehicles(mockVehicles);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('차량 목록 로딩 실패:', error);
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  // 검색 필터링
  const filteredVehicles = vehicles.filter(
    (vehicle) => {
      const matchesSearch =
        vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vehicle.owner && vehicle.owner.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = !filterStatus || vehicle.status === filterStatus;

      return matchesSearch && matchesStatus;
    }
  );

  // 정렬
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    const aValue = a[sortField as keyof Vehicle];
    const bValue = b[sortField as keyof Vehicle];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
  });

  // 페이지네이션
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 필터 메뉴
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleFilterSelect = (status: string | null) => {
    setFilterStatus(status);
    setFilterMenuAnchor(null);
  };

  // 정렬 메뉴
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

  // 차량 액션 메뉴
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, vehicleId: string) => {
    setActionMenuAnchor({ element: event.currentTarget, vehicleId });
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor({ element: null, vehicleId: null });
  };

  // 상태 표시 칩 렌더링
  const renderStatusChip = (status: string) => {
    let color: 'success' | 'warning' | 'error' | 'default' = 'default';
    let label = '';

    switch (status) {
      case 'active':
        color = 'success';
        label = '활성';
        break;
      case 'maintenance':
        color = 'warning';
        label = '정비 중';
        break;
      case 'inactive':
        color = 'error';
        label = '비활성';
        break;
      case 'recalled':
        color = 'error';
        label = '리콜';
        break;
      default:
        label = status;
    }

    return <Chip size="small" color={color} label={label} />;
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          차량 관리
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/vehicles/new')}
        >
          새 차량 등록
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="차량 검색 (제조사, 모델, 번호판, VIN 등)"
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
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={handleFilterMenuOpen}
                color={filterStatus ? 'primary' : 'inherit'}
              >
                {filterStatus ? `상태: ${filterStatus}` : '필터'}
              </Button>
              <Menu
                anchorEl={filterMenuAnchor}
                open={Boolean(filterMenuAnchor)}
                onClose={handleFilterMenuClose}
              >
                <MenuItem onClick={() => handleFilterSelect(null)}>
                  모든 상태
                </MenuItem>
                <MenuItem onClick={() => handleFilterSelect('active')}>
                  활성
                </MenuItem>
                <MenuItem onClick={() => handleFilterSelect('maintenance')}>
                  정비 중
                </MenuItem>
                <MenuItem onClick={() => handleFilterSelect('inactive')}>
                  비활성
                </MenuItem>
                <MenuItem onClick={() => handleFilterSelect('recalled')}>
                  리콜
                </MenuItem>
              </Menu>

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
                <MenuItem onClick={() => handleSortSelect('make')}>
                  제조사 {sortField === 'make' && (sortDirection === 'asc' ? '↓' : '↑')}
                </MenuItem>
                <MenuItem onClick={() => handleSortSelect('model')}>
                  모델 {sortField === 'model' && (sortDirection === 'asc' ? '↓' : '↑')}
                </MenuItem>
                <MenuItem onClick={() => handleSortSelect('year')}>
                  연식 {sortField === 'year' && (sortDirection === 'asc' ? '↓' : '↑')}
                </MenuItem>
                <MenuItem onClick={() => handleSortSelect('mileage')}>
                  주행거리 {sortField === 'mileage' && (sortDirection === 'asc' ? '↓' : '↑')}
                </MenuItem>
              </Menu>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <LinearProgress sx={{ mb: 2 }} />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="차량 목록 테이블">
              <TableHead>
                <TableRow>
                  <TableCell>차량 정보</TableCell>
                  <TableCell>번호판</TableCell>
                  <TableCell>VIN</TableCell>
                  <TableCell align="right">주행거리</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell align="right">액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedVehicles
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((vehicle) => (
                    <TableRow
                      key={vehicle.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    >
                      <TableCell component="th" scope="row">
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {vehicle.make} {vehicle.model}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {vehicle.year}년형 {vehicle.color}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{vehicle.licensePlate}</TableCell>
                      <TableCell>{vehicle.vin}</TableCell>
                      <TableCell align="right">
                        {vehicle.mileage.toLocaleString()} km
                      </TableCell>
                      <TableCell>{renderStatusChip(vehicle.status)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="더 보기"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionMenuOpen(e, vehicle.id);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {sortedVehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1">
                        {searchQuery || filterStatus
                          ? '검색 조건에 맞는 차량이 없습니다.'
                          : '등록된 차량이 없습니다.'}
                      </Typography>
                      <Button
                        variant="text"
                        color="primary"
                        sx={{ mt: 1 }}
                        onClick={() => navigate('/vehicles/new')}
                      >
                        새 차량 등록하기
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
            count={sortedVehicles.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="페이지당 행 수:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </>
      )}

      <Menu
        anchorEl={actionMenuAnchor.element}
        open={Boolean(actionMenuAnchor.element)}
        onClose={handleActionMenuClose}
      >
        <MenuItem
          onClick={() => {
            navigate(`/vehicles/${actionMenuAnchor.vehicleId}`);
            handleActionMenuClose();
          }}
        >
          상세 정보
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/vehicles/${actionMenuAnchor.vehicleId}/edit`);
            handleActionMenuClose();
          }}
        >
          수정하기
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/vehicles/${actionMenuAnchor.vehicleId}/maintenance/new`);
            handleActionMenuClose();
          }}
        >
          정비 등록
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleActionMenuClose();
            // 상태 변경 로직 구현 필요
            alert('차량 상태 변경 기능은 추후 구현할 예정입니다.');
          }}
        >
          상태 변경
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default VehicleList;