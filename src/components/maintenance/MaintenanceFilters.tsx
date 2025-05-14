import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  IconButton,
  Collapse,
  Typography,
  useTheme,
  useMediaQuery,
  Chip,
  Badge,
  Menu,
  Tooltip,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Bookmark as BookmarkIcon,
  Delete as DeleteIcon,
  AddCircleOutline as AddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { MaintenanceStatus, MaintenanceType } from '../../types/maintenance';
import { debounce } from '../../utils/debounce';

export interface MaintenanceFilters {
  status?: MaintenanceStatus;
  type?: MaintenanceType;
  startDate?: Date | null;
  endDate?: Date | null;
  searchQuery?: string;
  vehicleId?: string;
  minCost?: number;
  maxCost?: number;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: MaintenanceFilters;
}

interface MaintenanceFiltersProps {
  filters: MaintenanceFilters;
  onFilterChange: (filters: MaintenanceFilters) => void;
  onReset: () => void;
}

// 브라우저 로컬 스토리지 키
const SAVED_FILTERS_KEY = 'maintenance-saved-filters';

const MaintenanceFilters: React.FC<MaintenanceFiltersProps> = React.memo(({
  filters,
  onFilterChange,
  onReset,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [showFilters, setShowFilters] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [saveFilterName, setSaveFilterName] = useState<string>('');
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState<boolean>(false);
  const [localFilters, setLocalFilters] = useState<MaintenanceFilters>(filters);

  // 필터 동기화
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // 활성화된 필터 개수 계산
  const getActiveFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.type) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.vehicleId) count++;
    if (filters.minCost !== undefined) count++;
    if (filters.maxCost !== undefined) count++;
    return count;
  }, [filters]);

  // 저장된 필터 로드
  useEffect(() => {
    const savedFiltersStr = localStorage.getItem(SAVED_FILTERS_KEY);
    if (savedFiltersStr) {
      try {
        setSavedFilters(JSON.parse(savedFiltersStr));
      } catch (e) {
        console.error('저장된 필터를 로드하는 중 오류 발생:', e);
        localStorage.removeItem(SAVED_FILTERS_KEY);
      }
    }
  }, []);

  // 디바운스된 필터 변경 핸들러
  const debouncedFilterChange = useCallback(
    debounce((newFilters: MaintenanceFilters) => {
      onFilterChange(newFilters);
    }, 300),
    [onFilterChange]
  );

  // 필터 변경 처리
  const handleChange = useCallback((field: keyof MaintenanceFilters, value: any) => {
    const newFilters = {
      ...localFilters,
      [field]: value,
    };
    setLocalFilters(newFilters);
    debouncedFilterChange(newFilters);
  }, [localFilters, debouncedFilterChange]);

  // 필터 저장
  const saveFilter = (name: string) => {
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name,
      filters: { ...filters },
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
    setSaveFilterName('');
    setSaveFilterDialogOpen(false);
  };

  // 저장된 필터 삭제
  const deleteFilter = (id: string) => {
    const updatedFilters = savedFilters.filter(filter => filter.id !== id);
    setSavedFilters(updatedFilters);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
  };

  // 저장된 필터 적용
  const applyFilter = (filter: SavedFilter) => {
    onFilterChange(filter.filters);
    handleFilterMenuClose();
  };

  const handleStartDateChange = useCallback((date: Date | null) => {
    handleChange('startDate', date);
  }, [handleChange]);

  const handleEndDateChange = useCallback((date: Date | null) => {
    handleChange('endDate', date);
  }, [handleChange]);

  const toggleFilters = () => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      setShowFilters(!showFilters);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleSaveFilterClick = () => {
    setSaveFilterDialogOpen(true);
    handleFilterMenuClose();
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
  };

  const renderFilterForm = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>상태</InputLabel>
          <Select
            value={localFilters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            label="상태"
            displayEmpty
          >
            <MenuItem value="">전체</MenuItem>
            <MenuItem value="scheduled">예정</MenuItem>
            <MenuItem value="in_progress">진행 중</MenuItem>
            <MenuItem value="completed">완료</MenuItem>
            <MenuItem value="cancelled">취소</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>유형</InputLabel>
          <Select
            value={localFilters.type || ''}
            onChange={(e) => handleChange('type', e.target.value)}
            label="유형"
            displayEmpty
          >
            <MenuItem value="">전체</MenuItem>
            <MenuItem value="regular">정기 점검</MenuItem>
            <MenuItem value="repair">수리</MenuItem>
            <MenuItem value="inspection">검사</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <DatePicker
          label="시작일"
          value={localFilters.startDate}
          onChange={handleStartDateChange}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
            },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <DatePicker
          label="종료일"
          value={localFilters.endDate}
          onChange={handleEndDateChange}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
            },
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <TextField
            label="최소 비용"
            type="number"
            value={localFilters.minCost || ''}
            onChange={(e) => handleChange('minCost', e.target.value ? Number(e.target.value) : undefined)}
            size="small"
          />
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <TextField
            label="최대 비용"
            type="number"
            value={localFilters.maxCost || ''}
            onChange={(e) => handleChange('maxCost', e.target.value ? Number(e.target.value) : undefined)}
            size="small"
          />
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <TextField
            label="차량 ID"
            value={localFilters.vehicleId || ''}
            onChange={(e) => handleChange('vehicleId', e.target.value)}
            size="small"
          />
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6} md={3} display="flex" justifyContent={isMobile ? "center" : "flex-end"} alignItems="center" flexWrap="wrap" gap={1}>
        <Button
          variant="outlined"
          onClick={handleReset}
          size={isMobile ? "small" : "medium"}
          sx={{ ml: isMobile ? 0 : 1 }}
        >
          초기화
        </Button>
        <Tooltip title="필터 저장/불러오기">
          <IconButton
            onClick={handleFilterMenuOpen}
            color="primary"
            size={isMobile ? "small" : "medium"}
            sx={{ ml: 1 }}
          >
            <BookmarkIcon />
          </IconButton>
        </Tooltip>
      </Grid>
    </Grid>
  );

  // 적용된 필터 태그 표시
  const renderFilterTags = () => {
    const tags = [];
    
    if (filters.status) {
      const statusLabels: Record<MaintenanceStatus, string> = {
        scheduled: '예정',
        in_progress: '진행 중',
        completed: '완료',
        cancelled: '취소',
      };
      tags.push(
        <Chip
          key="status"
          label={`상태: ${statusLabels[filters.status]}`}
          onDelete={() => handleChange('status', undefined)}
          size="small"
          sx={{ m: 0.5 }}
        />
      );
    }
    
    if (filters.type) {
      const typeLabels: Record<MaintenanceType, string> = {
        regular: '정기 점검',
        repair: '수리',
        inspection: '검사',
        other: '기타',
      };
      tags.push(
        <Chip
          key="type"
          label={`유형: ${typeLabels[filters.type]}`}
          onDelete={() => handleChange('type', undefined)}
          size="small"
          sx={{ m: 0.5 }}
        />
      );
    }
    
    if (filters.startDate) {
      tags.push(
        <Chip
          key="startDate"
          label={`시작일: ${new Date(filters.startDate).toLocaleDateString()}`}
          onDelete={() => handleChange('startDate', undefined)}
          size="small"
          sx={{ m: 0.5 }}
        />
      );
    }
    
    if (filters.endDate) {
      tags.push(
        <Chip
          key="endDate"
          label={`종료일: ${new Date(filters.endDate).toLocaleDateString()}`}
          onDelete={() => handleChange('endDate', undefined)}
          size="small"
          sx={{ m: 0.5 }}
        />
      );
    }
    
    if (filters.minCost !== undefined) {
      tags.push(
        <Chip
          key="minCost"
          label={`최소 비용: ${filters.minCost.toLocaleString()}원`}
          onDelete={() => handleChange('minCost', undefined)}
          size="small"
          sx={{ m: 0.5 }}
        />
      );
    }
    
    if (filters.maxCost !== undefined) {
      tags.push(
        <Chip
          key="maxCost"
          label={`최대 비용: ${filters.maxCost.toLocaleString()}원`}
          onDelete={() => handleChange('maxCost', undefined)}
          size="small"
          sx={{ m: 0.5 }}
        />
      );
    }
    
    if (filters.vehicleId) {
      tags.push(
        <Chip
          key="vehicleId"
          label={`차량 ID: ${filters.vehicleId}`}
          onDelete={() => handleChange('vehicleId', undefined)}
          size="small"
          sx={{ m: 0.5 }}
        />
      );
    }
    
    return tags.length > 0 ? (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', px: 1, py: 1 }}>
        {tags}
        {tags.length > 0 && (
          <Chip
            label="모두 지우기"
            onClick={handleReset}
            size="small"
            variant="outlined"
            sx={{ m: 0.5 }}
          />
        )}
      </Box>
    ) : null;
  };

  // 저장된 필터 & 필터 저장 다이얼로그
  const renderSavedFiltersMenu = () => (
    <Menu
      anchorEl={filterMenuAnchor}
      open={Boolean(filterMenuAnchor)}
      onClose={handleFilterMenuClose}
    >
      <MenuItem onClick={handleSaveFilterClick}>
        <ListItemIcon>
          <SaveIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>현재 필터 저장</ListItemText>
      </MenuItem>
      
      {savedFilters.length > 0 && <Divider />}
      
      {savedFilters.map((filter) => (
        <MenuItem key={filter.id}>
          <ListItemIcon>
            <BookmarkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={filter.name} onClick={() => applyFilter(filter)} />
          <IconButton
            size="small"
            edge="end"
            onClick={(e) => {
              e.stopPropagation();
              deleteFilter(filter.id);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </MenuItem>
      ))}
    </Menu>
  );

  // 필터 저장 다이얼로그
  const renderSaveFilterDialog = () => (
    <Dialog open={saveFilterDialogOpen} onClose={() => setSaveFilterDialogOpen(false)}>
      <DialogTitle>필터 저장</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="필터 이름"
          fullWidth
          value={saveFilterName}
          onChange={(e) => setSaveFilterName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSaveFilterDialogOpen(false)}>취소</Button>
        <Button 
          onClick={() => saveFilter(saveFilterName)}
          disabled={!saveFilterName.trim()}
          variant="contained"
        >
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Badge badgeContent={getActiveFilterCount} color="primary">
              <IconButton
                onClick={toggleFilters}
                color={showFilters ? 'primary' : 'default'}
                size="small"
              >
                <FilterIcon />
              </IconButton>
            </Badge>
            <Typography
              variant="subtitle1"
              sx={{ ml: 1, cursor: 'pointer' }}
              onClick={toggleFilters}
            >
              필터
              {showFilters ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </Typography>
          </Box>

          <Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleReset}
              sx={{ mr: 1 }}
            >
              초기화
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<BookmarkIcon />}
              onClick={handleFilterMenuOpen}
            >
              필터 저장
            </Button>
          </Box>
        </Box>

        {renderFilterTags()}

        <Collapse in={showFilters}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
            {renderFilterForm()}
          </Paper>
        </Collapse>

        {renderSavedFiltersMenu()}
        {renderSaveFilterDialog()}

        <Drawer anchor="right" open={drawerOpen} onClose={closeDrawer}>
          <Box sx={{ width: 320, p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">필터 설정</Typography>
              <IconButton onClick={closeDrawer} size="small">
                <ClearIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {renderFilterForm()}
            <Box mt={2}>
              <Button variant="outlined" fullWidth onClick={handleReset} sx={{ mb: 1 }}>
                필터 초기화
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={closeDrawer}
              >
                적용
              </Button>
            </Box>
          </Box>
        </Drawer>
      </Box>
    </LocalizationProvider>
  );
});

export default MaintenanceFilters; 