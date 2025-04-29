import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import {
  ViewDay as DayViewIcon,
  ViewWeek as WeekViewIcon,
  ViewModule as MonthViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MaintenanceService } from '../../services/maintenanceService';
import { Maintenance, MaintenanceStatus } from '../../types/maintenance';

// 상수로 정의하여 값으로 사용
const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled' as MaintenanceStatus,
  IN_PROGRESS: 'in-progress' as MaintenanceStatus,
  COMPLETED: 'completed' as MaintenanceStatus,
  CANCELLED: 'cancelled' as MaintenanceStatus,
  DELAYED: 'delayed' as MaintenanceStatus
};

interface ScheduleViewProps {
  date: Date;
  maintenances: Maintenance[];
  onEditMaintenance: (maintenance: Maintenance) => void;
  onDeleteMaintenance: (maintenanceId: string) => void;
}

const DayView: React.FC<ScheduleViewProps> = ({
  date,
  maintenances,
  onEditMaintenance,
  onDeleteMaintenance,
}) => {
  const dayMaintenances = maintenances.filter(
    (m) => format(new Date(m.startDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {format(date, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
      </Typography>
      <Grid container spacing={2}>
        {dayMaintenances.map((maintenance) => (
          <Grid item xs={12} key={maintenance.id}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1">
                    {format(new Date(maintenance.startDate), 'HH:mm')} - {maintenance.vehicleId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {maintenance.type} - {maintenance.description}
                  </Typography>
                </Box>
                <Box>
                  <Chip
                    label={maintenance.status}
                    color={
                      maintenance.status === MAINTENANCE_STATUS.COMPLETED
                        ? 'success'
                        : maintenance.status === MAINTENANCE_STATUS.IN_PROGRESS
                        ? 'warning'
                        : 'default'
                    }
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <IconButton size="small" onClick={() => onEditMaintenance(maintenance)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDeleteMaintenance(maintenance.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
        {dayMaintenances.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">예정된 정비가 없습니다.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

const WeekView: React.FC<ScheduleViewProps> = ({
  date,
  maintenances,
  onEditMaintenance,
  onDeleteMaintenance,
}) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {format(weekStart, 'yyyy년 M월 d일', { locale: ko })} -{' '}
        {format(weekEnd, 'M월 d일', { locale: ko })}
      </Typography>
      <Grid container spacing={2}>
        {weekDays.map((day) => (
          <Grid item xs={12} key={day.toISOString()}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {format(day, 'M월 d일 (EEEE)', { locale: ko })}
              </Typography>
              {maintenances
                .filter(
                  (m) =>
                    format(new Date(m.startDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                )
                .map((maintenance) => (
                  <Box
                    key={maintenance.id}
                    sx={{
                      p: 1,
                      mb: 1,
                      borderLeft: 3,
                      borderColor: 'primary.main',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2">
                          {format(new Date(maintenance.startDate), 'HH:mm')} - {maintenance.vehicleId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {maintenance.type}
                        </Typography>
                      </Box>
                      <Box>
                        <Chip
                          label={maintenance.status}
                          color={
                            maintenance.status === MAINTENANCE_STATUS.COMPLETED
                              ? 'success'
                              : maintenance.status === MAINTENANCE_STATUS.IN_PROGRESS
                              ? 'warning'
                              : 'default'
                          }
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <IconButton size="small" onClick={() => onEditMaintenance(maintenance)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDeleteMaintenance(maintenance.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const MonthView: React.FC<ScheduleViewProps> = ({
  date,
  maintenances,
  onEditMaintenance,
  onDeleteMaintenance,
}) => {
  // 월간 뷰 구현은 생략 (복잡도가 높아 별도 컴포넌트로 구현 예정)
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        월간 뷰는 준비 중입니다.
      </Typography>
    </Box>
  );
};

const MaintenanceSchedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    maintenance: Maintenance | null;
  }>({
    open: false,
    maintenance: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    maintenanceId: string | null;
  }>({
    open: false,
    maintenanceId: null,
  });

  const maintenanceService = MaintenanceService.getInstance();

  useEffect(() => {
    loadMaintenances();
  }, [selectedDate, viewMode]);

  const loadMaintenances = async () => {
    try {
      setLoading(true);
      setError(null);

      // 선택된 뷰에 따라 날짜 범위 계산
      let startDate, endDate;
      switch (viewMode) {
        case 'day':
          startDate = selectedDate;
          endDate = addDays(selectedDate, 1);
          break;
        case 'week':
          startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
          endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
          break;
        case 'month':
        default:
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth();
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month + 1, 0);
          break;
      }

      // API 호출하여 정비 스케줄 데이터 가져오기
      const data = await maintenanceService.getMaintenances({
        startDateFrom: startDate.toISOString(),
        startDateTo: endDate.toISOString(),
      });
      
      setMaintenances(data.items);
    } catch (error) {
      console.error('정비 스케줄 로딩 오류:', error);
      setError('정비 스케줄을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (_: React.SyntheticEvent, newValue: 'day' | 'week' | 'month') => {
    setViewMode(newValue);
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleEditMaintenance = (maintenance: Maintenance) => {
    setEditDialog({
      open: true,
      maintenance,
    });
  };

  const handleDeleteMaintenance = (maintenanceId: string) => {
    setDeleteDialog({
      open: true,
      maintenanceId,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.maintenanceId) return;

    try {
      setLoading(true);
      await maintenanceService.deleteMaintenance(deleteDialog.maintenanceId);
      
      // 삭제 후 목록 갱신
      setMaintenances(prev => prev.filter(m => m.id !== deleteDialog.maintenanceId));
      
      // 다이얼로그 닫기
      setDeleteDialog({ open: false, maintenanceId: null });
    } catch (error) {
      console.error('정비 삭제 오류:', error);
      setError('정비 일정을 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (maintenance: Maintenance) => {
    if (!editDialog.maintenance) return;

    try {
      setLoading(true);
      const updatedMaintenance = await maintenanceService.updateMaintenance(
        editDialog.maintenance.id,
        maintenance
      );
      
      // 수정된 데이터로 목록 갱신
      setMaintenances(prev => 
        prev.map(m => m.id === updatedMaintenance.id ? updatedMaintenance : m)
      );
      
      // 다이얼로그 닫기
      setEditDialog({ open: false, maintenance: null });
    } catch (error) {
      console.error('정비 업데이트 오류:', error);
      setError('정비 정보를 업데이트하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMaintenance = () => {
    // 새 정비 등록 화면으로 이동하거나 모달 띄움
    // 여기서는 간단한 예시로 빈 정비 객체를 생성
    const newMaintenance: Partial<Maintenance> = {
      vehicleId: '',
      type: 'regular' as MaintenanceType,
      description: '',
      status: MAINTENANCE_STATUS.SCHEDULED,
      priority: 'medium',
      startDate: new Date().toISOString(),
    };
    
    setEditDialog({
      open: true,
      maintenance: newMaintenance as Maintenance,
    });
  };

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'day':
        return (
          <DayView
            date={selectedDate}
            maintenances={maintenances}
            onEditMaintenance={handleEditMaintenance}
            onDeleteMaintenance={handleDeleteMaintenance}
          />
        );
      case 'week':
        return (
          <WeekView
            date={selectedDate}
            maintenances={maintenances}
            onEditMaintenance={handleEditMaintenance}
            onDeleteMaintenance={handleDeleteMaintenance}
          />
        );
      case 'month':
        return (
          <MonthView
            date={selectedDate}
            maintenances={maintenances}
            onEditMaintenance={handleEditMaintenance}
            onDeleteMaintenance={handleDeleteMaintenance}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1">
              정비 스케줄
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleNewMaintenance}
            >
              새 정비 등록
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <DatePicker
              label="날짜 선택"
              value={selectedDate}
              onChange={handleDateChange}
            />
            <Tabs value={viewMode} onChange={handleViewChange} aria-label="view mode">
              <Tab icon={<DayViewIcon />} label="일간" value="day" />
              <Tab icon={<WeekViewIcon />} label="주간" value="week" />
              <Tab icon={<MonthViewIcon />} label="월간" value="month" />
            </Tabs>
          </Box>

          {loading ? (
            <Typography>로딩 중...</Typography>
          ) : (
            renderCurrentView()
          )}
        </CardContent>
      </Card>

      {/* 정비 편집 다이얼로그 */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, maintenance: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editDialog.maintenance?.id ? '정비 정보 수정' : '새 정비 등록'}
        </DialogTitle>
        <DialogContent>
          {editDialog.maintenance && (
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="차량 ID"
                    value={editDialog.maintenance.vehicleId}
                    onChange={(e) => setEditDialog({
                      ...editDialog,
                      maintenance: {
                        ...editDialog.maintenance!,
                        vehicleId: e.target.value,
                      },
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="설명"
                    value={editDialog.maintenance.description}
                    onChange={(e) => setEditDialog({
                      ...editDialog,
                      maintenance: {
                        ...editDialog.maintenance!,
                        description: e.target.value,
                      },
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="날짜"
                    value={new Date(editDialog.maintenance.startDate)}
                    onChange={(date) => setEditDialog({
                      ...editDialog,
                      maintenance: {
                        ...editDialog.maintenance!,
                        startDate: date?.toISOString() || new Date().toISOString(),
                      },
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>상태</InputLabel>
                    <Select
                      value={editDialog.maintenance.status}
                      label="상태"
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        maintenance: {
                          ...editDialog.maintenance!,
                          status: e.target.value as MaintenanceStatus,
                        },
                      })}
                    >
                      <MenuItem value={MAINTENANCE_STATUS.SCHEDULED}>예약됨</MenuItem>
                      <MenuItem value={MAINTENANCE_STATUS.IN_PROGRESS}>진행 중</MenuItem>
                      <MenuItem value={MAINTENANCE_STATUS.COMPLETED}>완료됨</MenuItem>
                      <MenuItem value={MAINTENANCE_STATUS.CANCELLED}>취소됨</MenuItem>
                      <MenuItem value={MAINTENANCE_STATUS.DELAYED}>지연됨</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, maintenance: null })}>
            취소
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => editDialog.maintenance && handleSaveEdit(editDialog.maintenance)}
            disabled={loading}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, maintenanceId: null })}
      >
        <DialogTitle>정비 일정 삭제</DialogTitle>
        <DialogContent>
          <Typography>정말로 이 정비 일정을 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, maintenanceId: null })}>
            취소
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={loading}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceSchedule; 