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
  FormControl,
  InputLabel,
  Select,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Sort as SortIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as CarIcon,
  Build as MaintenanceIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Vehicle, VehicleType, VehicleStatus } from '../../types/vehicle';
import { VehicleService } from '../../services/vehicleService';

const VehicleList: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: '',
    page: 0,
    limit: 10,
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
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

  const vehicleService = VehicleService.getInstance();

  useEffect(() => {
    loadVehicles();
  }, [filters]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getAllVehicles({
        type: filters.type as VehicleType,
        status: filters.status as VehicleStatus,
        search: filters.search,
        page: filters.page + 1,
        limit: filters.limit,
      });
      setVehicles(data);
    } catch (error) {
      console.error('차량 목록을 불러오는데 실패했습니다:', error);
      setError('차량 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, vehicleId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedVehicle(vehicleId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVehicle(null);
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;

    try {
      await vehicleService.deleteVehicle(selectedVehicle);
      await loadVehicles();
    } catch (error) {
      console.error('차량 삭제에 실패했습니다:', error);
      setError('차량 삭제에 실패했습니다.');
    }
    handleMenuClose();
  };

  const getStatusColor = (status: VehicleStatus) => {
    const colors = {
      [VehicleStatus.ACTIVE]: 'success',
      [VehicleStatus.MAINTENANCE]: 'warning',
      [VehicleStatus.INACTIVE]: 'error',
      [VehicleStatus.RESERVED]: 'info',
    };
    return colors[status];
  };

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

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

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
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>차량 유형</InputLabel>
                <Select
                  value={filters.type}
                  label="차량 유형"
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  {Object.values(VehicleType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={filters.status}
                  label="상태"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  {Object.values(VehicleStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedVehicle) {
              navigate(`/vehicles/${selectedVehicle}/edit`);
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
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedVehicle) {
              navigate(`/maintenance/new/${selectedVehicle}`);
            }
          }}
        >
          <MaintenanceIcon fontSize="small" sx={{ mr: 1 }} />
          정비 등록
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default VehicleList;