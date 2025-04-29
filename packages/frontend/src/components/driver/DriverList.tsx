import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  Alert,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useDrivers, useDeleteDriver } from '../../hooks/useDrivers';
import { Driver, DriverStatus, DriverFilters } from '../../types/driver';

interface DriverListProps {
  onDriverSelect?: (driver: Driver) => void;
  showActions?: boolean;
}

const DriverList: React.FC<DriverListProps> = ({
  onDriverSelect,
  showActions = true,
}) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DriverFilters>({
    status: undefined,
    search: '',
    page: 1,
    limit: 10,
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  
  const { data, isLoading, error } = useDrivers(filters);
  const drivers = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const deleteDriverMutation = useDeleteDriver();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, driverId: string) => {
    event.stopPropagation(); // 이벤트 버블링 방지
    setAnchorEl(event.currentTarget);
    setSelectedDriver(driverId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDriver(null);
  };

  const handleDelete = async (driverId: string) => {
    try {
      await deleteDriverMutation.mutateAsync(driverId);
    } catch (error) {
      console.error('드라이버 삭제에 실패했습니다:', error);
    }
    handleMenuClose();
  };

  const getStatusColor = (status: DriverStatus) => {
    const colors = {
      [DriverStatus.ACTIVE]: 'success',
      [DriverStatus.INACTIVE]: 'error',
      [DriverStatus.ON_LEAVE]: 'warning',
      [DriverStatus.SUSPENDED]: 'error',
    };
    return colors[status];
  };

  const getStatusLabel = (status: DriverStatus) => {
    const labels = {
      [DriverStatus.ACTIVE]: '활성',
      [DriverStatus.INACTIVE]: '비활성',
      [DriverStatus.ON_LEAVE]: '휴가 중',
      [DriverStatus.SUSPENDED]: '정지',
    };
    return labels[status];
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        운전자 목록을 불러오는데 실패했습니다.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          운전자 관리
        </Typography>
        {showActions && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={Link}
            to="/drivers/new"
          >
            새 운전자 등록
          </Button>
        )}
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="운전자 검색 (이름, 면허번호, 이메일)"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>상태</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="상태"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as DriverStatus })}
                >
                  <MenuItem value="">전체</MenuItem>
                  {Object.values(DriverStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="운전자 목록 테이블">
              <TableHead>
                <TableRow>
                  <TableCell>운전자 정보</TableCell>
                  <TableCell>면허번호</TableCell>
                  <TableCell>연락처</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>안전 점수</TableCell>
                  <TableCell>면허 만료일</TableCell>
                  {showActions && <TableCell align="right">옵션</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow
                    key={driver.id}
                    hover
                    onClick={() => onDriverSelect ? onDriverSelect(driver) : navigate(`/drivers/${driver.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell component="th" scope="row">
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {`${driver.firstName} ${driver.lastName}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {driver.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{driver.licenseNumber}</TableCell>
                    <TableCell>{driver.phoneNumber}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(driver.status)}
                        color={getStatusColor(driver.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <LinearProgress
                          variant="determinate"
                          value={driver.safetyScore || 0}
                          sx={{ width: 100, mr: 1 }}
                        />
                        <Typography variant="body2">
                          {driver.safetyScore || 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {format(new Date(driver.licenseExpiry), 'yyyy-MM-dd')}
                    </TableCell>
                    {showActions && (
                      <TableCell align="right">
                        <IconButton
                          aria-label="더 보기"
                          onClick={(e) => handleMenuOpen(e, driver.id)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalCount}
            rowsPerPage={filters.limit}
            page={filters.page - 1}
            onPageChange={(_, newPage) => setFilters({ ...filters, page: newPage + 1 })}
            onRowsPerPageChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value, 10), page: 1 })}
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} / 총 ${count}개`
            }
            labelRowsPerPage="페이지당 행 수:"
          />
        </>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedDriver && handleDelete(selectedDriver)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          삭제
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedDriver) {
            navigate(`/drivers/${selectedDriver}/edit`);
          }
          handleMenuClose();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          수정
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedDriver) {
            navigate(`/drivers/${selectedDriver}/analytics`);
          }
          handleMenuClose();
        }}>
          <AssessmentIcon fontSize="small" sx={{ mr: 1 }} />
          통계
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DriverList; 