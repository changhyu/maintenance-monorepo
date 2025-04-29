import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Divider,
  useMediaQuery,
  Theme
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import VehicleCard from '../../components/vehicle/VehicleCard';
import vehicleService from '../../services/VehicleService';
import { Vehicle, VehicleStatus } from '../../types/vehicle';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * 차량 목록 페이지 컴포넌트
 */
const VehicleListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  // 상태 관리
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 페이지네이션
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [limit, setLimit] = useState<number>(12);

  // 검색 및 필터링
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [fuelFilter, setFuelFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 디바운스된 검색 쿼리
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // 차량 목록 조회
  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters = {
        page,
        limit,
        search: debouncedSearchQuery,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        fuelType: fuelFilter || undefined,
        sortBy,
        sortOrder
      };
      
      const response = await vehicleService.getVehicleList(filters);
      setVehicles(response.items);
      setTotalPages(Math.ceil(response.total / limit));
    } catch (err) {
      console.error('차량 목록 조회 중 오류 발생:', err);
      setError('차량 목록을 불러오는 중에 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // 검색 쿼리, 필터, 정렬, 페이지 등이 변경될 때마다 차량 목록 다시 조회
  useEffect(() => {
    fetchVehicles();
  }, [debouncedSearchQuery, statusFilter, typeFilter, fuelFilter, sortBy, sortOrder, page, limit]);

  // 차량 상태 옵션
  const statusOptions = useMemo(() => [
    { value: 'active', label: '운행 중' },
    { value: 'maintenance', label: '정비 중' },
    { value: 'retired', label: '폐차/은퇴' },
    { value: 'rented', label: '임대 중' },
    { value: 'unavailable', label: '이용 불가' }
  ], []);

  // 차량 유형 옵션
  const typeOptions = useMemo(() => [
    { value: 'sedan', label: '승용차' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: '밴' },
    { value: 'truck', label: '트럭' },
    { value: 'bus', label: '버스' },
    { value: 'special', label: '특수 차량' }
  ], []);

  // 연료 유형 옵션
  const fuelOptions = useMemo(() => [
    { value: 'gasoline', label: '휘발유' },
    { value: 'diesel', label: '디젤' },
    { value: 'lpg', label: 'LPG' },
    { value: 'hybrid', label: '하이브리드' },
    { value: 'electric', label: '전기' },
    { value: 'hydrogen', label: '수소' }
  ], []);

  // 정렬 옵션
  const sortOptions = useMemo(() => [
    { value: 'name', label: '이름순' },
    { value: 'year', label: '연식순' },
    { value: 'manufacturer', label: '제조사순' },
    { value: 'createdAt', label: '등록일순' }
  ], []);

  // 정비 요청 핸들러
  const handleMaintenanceRequest = (vehicle: Vehicle) => {
    navigate('/maintenance/new', { state: { vehicleId: vehicle.id } });
  };

  // 차량 수정 핸들러
  const handleEdit = (vehicle: Vehicle) => {
    navigate(`/vehicles/edit/${vehicle.id}`);
  };

  // 차량 삭제 핸들러
  const handleDelete = async (vehicle: Vehicle) => {
    if (window.confirm(`'${vehicle.name}' 차량을 정말로 삭제하시겠습니까?`)) {
      try {
        await vehicleService.deleteVehicle(vehicle.id);
        fetchVehicles(); // 삭제 후 목록 새로고침
      } catch (err) {
        console.error('차량 삭제 중 오류 발생:', err);
        alert('차량 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          차량 관리
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/vehicles/new')}
        >
          차량 등록
        </Button>
      </Box>

      {/* 검색 및 필터링 영역 */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          {/* 검색창 */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="차량명, 모델, 번호판 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* 차량 상태 필터 */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | '')}
                label="상태"
                displayEmpty
              >
                <MenuItem value="">전체 상태</MenuItem>
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 차량 유형 필터 */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>차량 유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="차량 유형"
                displayEmpty
              >
                <MenuItem value="">전체 유형</MenuItem>
                {typeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 연료 유형 필터 */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>연료 유형</InputLabel>
              <Select
                value={fuelFilter}
                onChange={(e) => setFuelFilter(e.target.value)}
                label="연료 유형"
                displayEmpty
              >
                <MenuItem value="">전체 연료</MenuItem>
                {fuelOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 정렬 옵션 */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>정렬</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="정렬"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      sx={{ mr: 0.5 }}
                    >
                      <SortIcon sx={{ transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
                    </IconButton>
                  </InputAdornment>
                }
              >
                {sortOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* 선택된 필터 표시 영역 */}
        {(statusFilter || typeFilter || fuelFilter) && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {statusFilter && (
              <Chip
                label={`상태: ${statusOptions.find(o => o.value === statusFilter)?.label}`}
                onDelete={() => setStatusFilter('')}
                size="small"
              />
            )}
            {typeFilter && (
              <Chip
                label={`유형: ${typeOptions.find(o => o.value === typeFilter)?.label}`}
                onDelete={() => setTypeFilter('')}
                size="small"
              />
            )}
            {fuelFilter && (
              <Chip
                label={`연료: ${fuelOptions.find(o => o.value === fuelFilter)?.label}`}
                onDelete={() => setFuelFilter('')}
                size="small"
              />
            )}
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* 오류 표시 영역 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 로딩 표시 영역 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 차량 목록 표시 영역 */}
          {vehicles.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              등록된 차량이 없거나 검색 조건에 맞는 차량이 없습니다.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {vehicles.map((vehicle) => (
                <Grid item key={vehicle.id} xs={12} sm={6} md={4} lg={3}>
                  <VehicleCard
                    vehicle={vehicle}
                    onMaintenanceRequest={handleMaintenanceRequest}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* 페이지네이션 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 4,
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
              showFirstButton
              showLastButton
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default VehicleListPage;