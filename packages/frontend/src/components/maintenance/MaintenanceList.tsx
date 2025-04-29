import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper, 
  Button, 
  IconButton,
  Typography,
  Box,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Pagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon, 
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { MaintenanceService } from '../../services/maintenanceService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Maintenance, MaintenanceStatus, MaintenanceType } from '../../types/maintenance';
import config from '../../config';
import MaintenanceStatusChip from './MaintenanceStatusChip';
import MaintenanceTypeChip from './MaintenanceTypeChip';
import { useNavigate } from 'react-router-dom';

/**
 * MaintenanceList 컴포넌트 속성
 */
interface MaintenanceListProps {
  vehicleId?: string; // 특정 차량의 정비만 보여줄 경우 차량 ID
  onMaintenanceSelect?: (maintenance: Maintenance) => void; // 정비 기록 선택 핸들러
}

/**
 * 정비 기록 목록 컴포넌트
 * 
 * 모든 정비 기록을 조회하고, 필터링하고, 제어할 수 있는 테이블 컴포넌트입니다.
 */
const MaintenanceList: React.FC<MaintenanceListProps> = ({ vehicleId, onMaintenanceSelect }) => {
  // 네비게이션 훅
  const navigate = useNavigate();
  
  // 정비 기록 상태
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 페이지네이션 상태
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize] = useState<number>(config.defaultPageSize);
  
  // 필터링 상태
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    fromDate: '',
    toDate: '',
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // 삭제 대화상자 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<Maintenance | null>(null);
  
  // 서비스 인스턴스
  const maintenanceService = MaintenanceService.getInstance();
  
  /**
   * 컴포넌트 마운트시 정비 기록 로딩
   */
  useEffect(() => {
    loadMaintenances();
  }, [vehicleId, page, pageSize, filters]);
  
  /**
   * 정비 기록 로딩 함수
   */
  const loadMaintenances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { search, type, status, fromDate, toDate } = filters;
      
      const data = await maintenanceService.getAllMaintenance({
        vehicleId,
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: page - 1,
        limit: pageSize
      });
      
      setMaintenances(data);
      
      // 실제 API에서는 총 페이지 수를 반환할 수 있음
      // 여기서는 예시로 설정
      setTotalPages(Math.ceil(data.length / pageSize) || 1);
      
    } catch (err) {
      setError('정비 기록을 불러오는 중 오류가 발생했습니다.');
      console.error('정비 기록 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 페이지 변경 핸들러
   */
  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  /**
   * 검색어 변경 핸들러
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value });
    setPage(1); // 검색 시 첫 페이지로 이동
  };
  
  /**
   * 필터 변경 핸들러
   */
  const handleFilterChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setPage(1); // 필터 변경 시 첫 페이지로 이동
  };
  
  /**
   * 날짜 필터 변경 핸들러
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setPage(1); // 필터 변경 시 첫 페이지로 이동
  };
  
  /**
   * 필터 초기화 핸들러
   */
  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: '',
      status: '',
      fromDate: '',
      toDate: '',
    });
    setPage(1);
  };
  
  /**
   * 정비 기록 삭제 핸들러
   */
  const handleDelete = (maintenance: Maintenance) => {
    setMaintenanceToDelete(maintenance);
    setDeleteDialogOpen(true);
  };
  
  /**
   * 삭제 확인 핸들러
   */
  const confirmDelete = async () => {
    if (!maintenanceToDelete) return;
    
    try {
      await maintenanceService.deleteMaintenance(maintenanceToDelete.id);
      loadMaintenances(); // 목록 새로고침
      setDeleteDialogOpen(false);
      setMaintenanceToDelete(null);
    } catch (err) {
      console.error('정비 기록 삭제 오류:', err);
      setError('정비 기록을 삭제하는 중 오류가 발생했습니다.');
    }
  };
  
  /**
   * 정비 기록 편집 페이지로 이동
   */
  const handleEdit = (maintenance: Maintenance) => {
    navigate(`/maintenance/edit/${maintenance.id}`);
  };
  
  /**
   * 정비 기록 생성 페이지로 이동
   */
  const handleCreate = () => {
    navigate('/maintenance/create');
  };
  
  /**
   * 정비 기록 선택 핸들러
   */
  const handleSelect = (maintenance: Maintenance) => {
    if (onMaintenanceSelect) {
      onMaintenanceSelect(maintenance);
    } else {
      navigate(`/maintenance/${maintenance.id}`);
    }
  };
  
  // 로딩 상태 표시
  if (loading && maintenances.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>정비 기록을 불러오는 중...</Typography>
      </Box>
    );
  }
  
  // 오류 상태 표시
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
        <Typography>{error}</Typography>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }} 
          onClick={loadMaintenances}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          {vehicleId ? '차량 정비 기록' : '모든 정비 기록'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            필터
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            color="primary"
            onClick={handleCreate}
          >
            정비 기록 추가
          </Button>
        </Box>
      </Box>
      
      {/* 필터 섹션 */}
      {showFilters && (
        <Box sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              name="search"
              label="검색어"
              variant="outlined"
              size="small"
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                endAdornment: filters.search ? (
                  <IconButton size="small" onClick={() => setFilters({ ...filters, search: '' })}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <SearchIcon fontSize="small" color="action" />
                ),
              }}
            />
            
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="type-filter-label">유형</InputLabel>
              <Select
                labelId="type-filter-label"
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                label="유형"
              >
                <MenuItem value="">전체</MenuItem>
                {config.maintenanceTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="status-filter-label">상태</InputLabel>
              <Select
                labelId="status-filter-label"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                label="상태"
              >
                <MenuItem value="">전체</MenuItem>
                {config.maintenanceStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              name="fromDate"
              label="시작일"
              type="date"
              variant="outlined"
              size="small"
              value={filters.fromDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              name="toDate"
              label="종료일"
              type="date"
              variant="outlined"
              size="small"
              value={filters.toDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
            />
            
            <Button 
              variant="text" 
              color="inherit" 
              onClick={handleClearFilters}
              startIcon={<ClearIcon />}
            >
              필터 초기화
            </Button>
          </Box>
        </Box>
      )}
      
      {/* 정비 기록 테이블 */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="정비 기록 테이블">
          <TableHead>
            <TableRow>
              <TableCell>차량</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>일자</TableCell>
              <TableCell>상태</TableCell>
              <TableCell align="right">비용</TableCell>
              <TableCell>작업소</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {maintenances.length > 0 ? (
              maintenances.map((maintenance) => (
                <TableRow
                  key={maintenance.id}
                  sx={{ 
                    '&:hover': { backgroundColor: 'action.hover', cursor: 'pointer' },
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                  onClick={() => handleSelect(maintenance)}
                >
                  <TableCell>
                    {maintenance.vehicleName}<br />
                    <Typography variant="caption" color="text.secondary">
                      {maintenance.vehicleLicensePlate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <MaintenanceTypeChip type={maintenance.type as MaintenanceType} />
                  </TableCell>
                  <TableCell>{maintenance.description}</TableCell>
                  <TableCell>{formatDate(maintenance.date)}</TableCell>
                  <TableCell>
                    <MaintenanceStatusChip status={maintenance.status as MaintenanceStatus} />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(maintenance.cost)}</TableCell>
                  <TableCell>{maintenance.shop}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton
                        color="primary"
                        aria-label="편집"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(maintenance);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        aria-label="삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(maintenance);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    정비 기록이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* 페이지네이션 컴포넌트 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>
      
      {/* 삭제 확인 대화상자 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          정비 기록 삭제
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {maintenanceToDelete?.description} 정비 기록을 정말 삭제하시겠습니까?
            이 작업은 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            취소
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceList;